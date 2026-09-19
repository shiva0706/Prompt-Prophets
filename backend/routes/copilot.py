"""
FastAPI Route for Civil Engineering AI Copilot & Autonomous Work-Order Agent.
"""

from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

try:
    from backend.agents.copilot_agent import (
        copilot_agent,
        CivilEngineeringTools,
        AgentResponse,
        QueryRequest,
        BillOfMaterials,
        WorkOrderDetails
    )
    from backend.data.mock_road_network import (
        get_all_segments,
        get_segments_by_road
    )
    from backend.agents.llama_engine import llama_engine
except ImportError:
    from agents.copilot_agent import (
        copilot_agent,
        CivilEngineeringTools,
        AgentResponse,
        QueryRequest,
        BillOfMaterials,
        WorkOrderDetails
    )
    from data.mock_road_network import (
        get_all_segments,
        get_segments_by_road
    )
    from agents.llama_engine import llama_engine

router = APIRouter(prefix="/api/copilot", tags=["Civil Engineering Copilot"])


class CalculateBomRequest(BaseModel):
    segment_ids: Optional[List[str]] = Field(default=None, description="List of segment IDs to calculate BOM for")
    road_name: Optional[str] = Field(default=None, description="Corridor name to aggregate segments")
    repair_strategy: Optional[str] = Field(default=None, description="Optional custom engineering strategy")


class DraftWorkOrderRequest(BaseModel):
    road_name: str = Field(..., description="Target highway / road name")
    segment_ids: List[str] = Field(..., description="List of 50m road segment IDs")
    urgency: Optional[str] = Field(default=None, description="Urgency classification (Emergency, High, Routine)")
    action: Optional[str] = Field(default=None, description="Action directive or project title")
    authority: Optional[str] = Field(default=None, description="Designated jurisdiction authority (NHAI, PWD, GCC)")
    notes: Optional[str] = Field(default=None, description="Special engineering notes or instructions")


class ProviderConfigRequest(BaseModel):
    provider: Optional[str] = Field(default="auto", description="auto, groq, ollama, fallback")
    groq_api_key: Optional[str] = Field(default=None, description="Groq API key")
    ollama_host: Optional[str] = Field(default=None, description="Ollama host URL")
    llama_model: Optional[str] = Field(default=None, description="LLaMA model identifier")


@router.get("/provider-status")
async def get_llama_provider_status():
    """Retrieve status of active LLaMA model, Groq connectivity, and local Ollama."""
    return llama_engine.get_provider_status()


@router.post("/provider-config")
async def configure_llama_provider(config: ProviderConfigRequest):
    """Dynamically update LLaMA model provider, Groq key, or local Ollama host."""
    if config.provider:
        llama_engine.preferred_provider = config.provider
    if config.groq_api_key:
        llama_engine.groq_api_key = config.groq_api_key
    if config.ollama_host:
        llama_engine.ollama_host = config.ollama_host
    if config.llama_model:
        llama_engine.default_model = config.llama_model
    return {"status": "configured", "provider_status": llama_engine.get_provider_status()}


@router.post("/chat", response_model=AgentResponse)
async def copilot_chat(request: QueryRequest):
    """
    Process a natural language civil engineering prompt, execute relevant tools,
    and return an executive brief, itemized BOM, and drafted municipal work order.
    """
    try:
        if not request.query or not request.query.strip():
            raise HTTPException(status_code=400, detail="Query prompt cannot be empty.")
        
        response = await copilot_agent.process_query_async(
            query=request.query,
            context=request.context
        )
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Copilot agent error: {str(e)}")


@router.get("/segments")
async def get_road_segments(
    road_name: Optional[str] = Query(None, description="Filter by corridor name (e.g. NH-44, SH-72)"),
    max_pci: Optional[float] = Query(None, description="Upper bound on Pavement Condition Index"),
    min_sri: Optional[float] = Query(None, description="Lower bound on Segment Risk Index"),
    defect_type: Optional[str] = Query(None, description="Filter by defect type (Pothole, Alligator_Crack, etc.)"),
    severity: Optional[str] = Query(None, description="Filter by severity level (Critical, High, Medium, Low)"),
    limit: int = Query(50, ge=1, le=200, description="Max segments to return")
):
    """
    Retrieve spatial road segments matching specific engineering criteria.
    """
    try:
        segments = CivilEngineeringTools.query_road_segments(
            road_name=road_name,
            max_pci=max_pci,
            min_sri=min_sri,
            defect_type=defect_type,
            severity=severity,
            limit=limit
        )
        return {
            "total_matched": len(segments),
            "segments": segments
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calculate-bom", response_model=BillOfMaterials)
async def calculate_bill_of_materials(request: CalculateBomRequest):
    """
    Calculate an itemized MoRTH / IRC compliant Bill of Materials for specified segment IDs or corridor.
    """
    try:
        segments = []
        if request.segment_ids:
            segments = [s for s in get_all_segments() if s["segment_id"] in request.segment_ids]
        elif request.road_name:
            segments = get_segments_by_road(request.road_name)
        else:
            segments = CivilEngineeringTools.query_road_segments(max_pci=35.0)

        if not segments:
            raise HTTPException(status_code=404, detail="No matching road segments found to calculate BOM.")

        bom = CivilEngineeringTools.calculate_bill_of_materials(
            segments=segments,
            repair_strategy=request.repair_strategy
        )
        return bom
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/work-order", response_model=WorkOrderDetails)
async def draft_work_order(request: DraftWorkOrderRequest):
    """
    Generate an official municipal maintenance work order ticket.
    """
    try:
        work_order = CivilEngineeringTools.draft_municipal_work_order(
            road_name=request.road_name,
            segment_ids=request.segment_ids,
            urgency=request.urgency,
            action=request.action,
            authority=request.authority,
            notes=request.notes
        )
        return work_order
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/roads")
async def list_available_roads():
    """
    List all active highway corridors and their health metrics.
    """
    try:
        all_segs = get_all_segments()
        roads_map: Dict[str, Dict[str, Any]] = {}

        for s in all_segs:
            rname = s["road_name"]
            if rname not in roads_map:
                roads_map[rname] = {
                    "road_name": rname,
                    "corridor_description": s.get("corridor_description", rname),
                    "total_segments": 0,
                    "critical_segments": 0,
                    "pci_sum": 0.0,
                    "authority": s.get("jurisdiction_authority", "State Highway Department"),
                    "district": s.get("district", "Tamil Nadu")
                }
            roads_map[rname]["total_segments"] += 1
            if s.get("pci", 100.0) < 30.0:
                roads_map[rname]["critical_segments"] += 1
            roads_map[rname]["pci_sum"] += s.get("pci", 100.0)

        results = []
        for rname, data in roads_map.items():
            avg_pci = data["pci_sum"] / max(1, data["total_segments"])
            results.append({
                "road_name": rname,
                "corridor_description": data["corridor_description"],
                "total_segments": data["total_segments"],
                "total_length_km": (data["total_segments"] * 50.0) / 1000.0,
                "critical_segments": data["critical_segments"],
                "average_pci": round(avg_pci, 1),
                "authority": data["authority"],
                "district": data["district"]
            })

        return {"corridors": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class LangGraphQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language civil engineering prompt")
    road_name: Optional[str] = Field(default=None, description="Optional corridor name")
    min_sri: Optional[float] = Field(default=None, description="Optional minimum Segment Risk Index")
    max_pci: Optional[float] = Field(default=None, description="Optional maximum Pavement Condition Index")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Optional extra context")


# =====================================================================
# LangGraph Workflow Endpoints
# =====================================================================

@router.post("/langgraph-chat")
async def langgraph_agent_chat(request: LangGraphQueryRequest):
    """
    Executes the multi-agent LangGraph StateGraph pipeline for autonomous civil engineering reasoning.
    """
    try:
        from backend.agents.langgraph_workflow import run_langgraph_civil_engineering_agent
        result = await run_langgraph_civil_engineering_agent(
            user_query=request.query,
            road_name=request.road_name,
            min_sri=request.min_sri,
            max_pci=request.max_pci
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LangGraph execution error: {str(e)}")


@router.get("/langgraph-info")
async def langgraph_workflow_info():
    """
    Returns the LangGraph StateGraph topology, nodes, edges, and state specification.
    """
    return {
        "framework": "LangGraph & LangChain Core",
        "state_graph_version": "1.2.11",
        "nodes": [
            {
                "id": "scout_filter",
                "name": "Spatial Segment Scout",
                "description": "Scouts road segments and filters hazard inventory by corridor & risk criteria."
            },
            {
                "id": "engineering_bom",
                "name": "Civil Engineering & BOM Engine",
                "description": "Calculates MoRTH Section 500 & IRC:82-2015 material quantities and Indian market rates."
            },
            {
                "id": "work_order_dispatch",
                "name": "Municipal Work Order Dispatcher",
                "description": "Generates formal municipal work orders and emergency SLA directives."
            },
            {
                "id": "executive_synthesis",
                "name": "LLaMA Synthesis & Verdict Node",
                "description": "Synthesizes structured authoritative engineering verdict and action steps."
            }
        ],
        "edges": [
            {"from": "START", "to": "scout_filter"},
            {"from": "scout_filter", "to": "engineering_bom"},
            {"from": "engineering_bom", "to": "work_order_dispatch"},
            {"from": "work_order_dispatch", "to": "executive_synthesis"},
            {"from": "executive_synthesis", "to": "END"}
        ],
        "state_schema": [
            "user_query", "road_name", "matched_segments", "total_defects_count",
            "bill_of_materials", "work_order", "engineering_verdict", "execution_steps", "messages"
        ],
        "status": "ONLINE"
    }

