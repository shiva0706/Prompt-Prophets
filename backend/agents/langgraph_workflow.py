"""
LangGraph Multi-Agent Workflow for RoadVision AI & Civil Engineering Decision Copilot.
Integrates LangGraph StateGraph, LangChain Core messages, and autonomous MoRTH & IRC:82-2015 tools.
"""

from typing import Dict, Any, List, Optional, TypedDict, Annotated
import operator
import datetime
import uuid

from langgraph.graph import StateGraph, START, END
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage

try:
    from backend.data.mock_road_network import (
        MOCK_ROAD_NETWORK,
        get_all_segments,
        get_segments_by_road,
        get_segment_by_id,
    )
    from backend.agents.llama_engine import llama_engine
    from backend.agents.copilot_agent import CivilEngineeringTools
except ImportError:
    from data.mock_road_network import (
        MOCK_ROAD_NETWORK,
        get_all_segments,
        get_segments_by_road,
        get_segment_by_id,
    )
    from agents.llama_engine import llama_engine
    from agents.copilot_agent import CivilEngineeringTools


# =====================================================================
# LangGraph State Schema
# =====================================================================

class HighwayAgentState(TypedDict):
    """LangGraph state representation for autonomous road evaluation."""
    user_query: str
    road_name: Optional[str]
    min_sri: Optional[float]
    max_pci: Optional[float]
    urgency_level: str
    matched_segments: List[Dict[str, Any]]
    total_defects_count: int
    defects_breakdown: Dict[str, int]
    bill_of_materials: Optional[Dict[str, Any]]
    work_order: Optional[Dict[str, Any]]
    engineering_verdict: Optional[str]
    execution_steps: Annotated[List[str], operator.add]
    messages: Annotated[List[BaseMessage], operator.add]
    status: str


# =====================================================================
# Node 1: Scout & Spatial Segment Query Node
# =====================================================================

def node_scout_and_filter(state: HighwayAgentState) -> Dict[str, Any]:
    """Node 1: Scouts spatial segments matching user highway corridor and risk criteria."""
    query = state.get("user_query", "").lower()
    road_name = state.get("road_name")
    
    # Auto-detect road name from query if not explicitly passed
    if not road_name:
        if "nh-44" in query or "nh44" in query:
            road_name = "NH-44 Corridor"
        elif "omr" in query or "rajiv gandhi" in query or "sh-49a" in query:
            road_name = "Rajiv Gandhi Salai / SH-49A (OMR IT Expressway)"
        elif "gst" in query or "nh-32" in query:
            road_name = "Grand Southern Trunk (GST) Road"
        elif "madurai" in query:
            road_name = "Madurai Ring Road"
        elif "outer ring" in query or "orr" in query:
            road_name = "Chennai Outer Ring Road (CORR)"
        elif "east coast" in query or "ecr" in query or "sh-49" in query:
            road_name = "East Coast Road (SH-49)"

    min_sri = state.get("min_sri")
    max_pci = state.get("max_pci")

    if "critical" in query or "urgent" in query or "severe" in query or "emergency" in query:
        max_pci = max_pci or 40.0
        min_sri = min_sri or 55.0

    segments = CivilEngineeringTools.query_road_segments(
        road_name=road_name,
        min_sri=min_sri,
        max_pci=max_pci,
        limit=20
    )

    all_defects = []
    defects_count: Dict[str, int] = {}
    for s in segments:
        for d in s.get("defects", []):
            all_defects.append(d)
            dtype = d.get("defect_type", "Unknown")
            defects_count[dtype] = defects_count.get(dtype, 0) + 1

    log_entry = f"Scout Node: Located {len(segments)} segments on '{road_name or 'All Corridors'}' with {len(all_defects)} localized defects."
    
    return {
        "road_name": road_name,
        "matched_segments": segments,
        "total_defects_count": len(all_defects),
        "defects_breakdown": defects_count,
        "execution_steps": [log_entry],
        "status": "SEGMENTS_SCOUTED"
    }


# =====================================================================
# Node 2: Civil Engineering Assessment & BOM Node
# =====================================================================

def node_engineering_bom(state: HighwayAgentState) -> Dict[str, Any]:
    """Node 2: Evaluates MoRTH Section 500 standards and computes calibrated Bill of Materials."""
    segments = state.get("matched_segments", [])
    query = state.get("user_query", "").lower()

    if not segments:
        return {
            "bill_of_materials": None,
            "execution_steps": ["BOM Node: No matching segments found to calculate materials."],
            "status": "NO_SEGMENTS"
        }

    bom_obj = CivilEngineeringTools.calculate_bill_of_materials(
        segments=segments
    )
    bom = bom_obj.model_dump() if hasattr(bom_obj, "model_dump") else bom_obj.dict()

    total_cost_inr = bom.get("total_cost_inr", 0.0)
    log_entry = f"BOM Node: Calibrated MoRTH Section 500 BOM. Total Estimated Cost: ₹{total_cost_inr:,.2f} INR across {len(segments)} segments."

    return {
        "bill_of_materials": bom,
        "execution_steps": [log_entry],
        "status": "BOM_CALCULATED"
    }


# =====================================================================
# Node 3: Municipal Work Order & Government Notice Node
# =====================================================================

def node_work_order_dispatch(state: HighwayAgentState) -> Dict[str, Any]:
    """Node 3: Formats official Municipal & Highway Authority Work Order Ticket."""
    segments = state.get("matched_segments", [])
    bom = state.get("bill_of_materials")
    query = state.get("user_query", "")

    if not segments:
        return {
            "work_order": None,
            "execution_steps": ["Work Order Node: Skipped (no segments)."],
            "status": "SKIPPED"
        }

    # Determine highest priority segment
    sorted_segs = sorted(segments, key=lambda s: s.get("sri_score", 0), reverse=True)
    lead_segment = sorted_segs[0]

    urgency = "EMERGENCY (< 24 Hours)" if lead_segment.get("condition_band") == "Critical" else "HIGH (< 48 Hours)"
    road_title = state.get("road_name") or lead_segment.get("road_name", "Highway Corridor")
    segment_ids = [s.get("segment_id") for s in segments if s.get("segment_id")]

    wo_obj = CivilEngineeringTools.draft_municipal_work_order(
        road_name=road_title,
        segment_ids=segment_ids,
        urgency=urgency,
        action=f"LangGraph Multi-Agent Autonomous Dispatch: {query[:60]}"
    )
    wo = wo_obj.model_dump() if hasattr(wo_obj, "model_dump") else wo_obj.dict()

    log_entry = f"Work Order Node: Generated Official Work Order #{wo.get('work_order_id')} (Urgency: {urgency})."

    return {
        "work_order": wo,
        "urgency_level": urgency,
        "execution_steps": [log_entry],
        "status": "WORK_ORDER_GENERATED"
    }


# =====================================================================
# Node 4: Autonomous LLaMA Synthesis Node
# =====================================================================

def node_executive_synthesis(state: HighwayAgentState) -> Dict[str, Any]:
    """Node 4: Synthesizes final authoritative engineering report with LLaMA reasoning."""
    user_query = state.get("user_query", "")
    segments = state.get("matched_segments", [])
    bom = state.get("bill_of_materials")
    wo = state.get("work_order")
    road_name = state.get("road_name", "Highway Network")

    # Construct context for LLaMA synthesis
    context_data = {
        "road_name": road_name,
        "total_segments_matched": len(segments),
        "total_defects": state.get("total_defects_count", 0),
        "defects_breakdown": state.get("defects_breakdown", {}),
        "estimated_budget_inr": bom.get("total_cost_inr") if bom else None,
        "work_order_id": wo.get("work_order_id") if wo else None,
        "urgency": state.get("urgency_level", "NORMAL")
    }

    prompt = f"""
[LangGraph Agent Context]
Corridor: {road_name}
Matched Segments: {len(segments)}
Defect Summary: {json_compact(context_data['defects_breakdown'])}
Estimated Cost: ₹{context_data['estimated_budget_inr'] or 0:,.2f} INR
Work Order ID: {context_data['work_order_id']}
Urgency: {context_data['urgency']}

User Inquiry: "{user_query}"

Generate an authoritative, concise Civil Engineering Verdict adhering strictly to MoRTH Section 500 and IRC:82-2015. Include clear action directives, material quantities, and cost breakdown.
"""

    response_text = llama_engine.generate_response(
        prompt=prompt,
        system_instruction="You are a Senior Highway Engineer & Pavement Management Copilot operating inside a LangGraph multi-agent execution pipeline."
    )

    ai_msg = AIMessage(content=response_text)
    log_entry = f"Synthesis Node: Generated executive civil engineering verdict ({len(response_text)} chars)."

    return {
        "engineering_verdict": response_text,
        "messages": [ai_msg],
        "execution_steps": [log_entry],
        "status": "COMPLETED"
    }


def json_compact(obj: Any) -> str:
    import json
    return json.dumps(obj)


# =====================================================================
# Build and Compile LangGraph StateGraph
# =====================================================================

def create_highway_intelligence_graph():
    """Builds and compiles the official LangGraph highway intelligence workflow."""
    workflow = StateGraph(HighwayAgentState)

    # Add Nodes
    workflow.add_node("scout_filter", node_scout_and_filter)
    workflow.add_node("engineering_bom", node_engineering_bom)
    workflow.add_node("work_order_dispatch", node_work_order_dispatch)
    workflow.add_node("executive_synthesis", node_executive_synthesis)

    # Define Graph Flow Edges
    workflow.add_edge(START, "scout_filter")
    workflow.add_edge("scout_filter", "engineering_bom")
    workflow.add_edge("engineering_bom", "work_order_dispatch")
    workflow.add_edge("work_order_dispatch", "executive_synthesis")
    workflow.add_edge("executive_synthesis", END)

    # Compile the graph
    app = workflow.compile()
    return app


# Singleton compiled graph instance
highway_langgraph_app = create_highway_intelligence_graph()


# =====================================================================
# Execution Helper Function
# =====================================================================

async def run_langgraph_civil_engineering_agent(
    user_query: str,
    road_name: Optional[str] = None,
    min_sri: Optional[float] = None,
    max_pci: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Executes the LangGraph Civil Engineering agent pipeline end-to-end.
    Returns complete state including matched segments, BOM, work order, and LLM verdict.
    """
    initial_state: HighwayAgentState = {
        "user_query": user_query,
        "road_name": road_name,
        "min_sri": min_sri,
        "max_pci": max_pci,
        "urgency_level": "NORMAL",
        "matched_segments": [],
        "total_defects_count": 0,
        "defects_breakdown": {},
        "bill_of_materials": None,
        "work_order": None,
        "engineering_verdict": None,
        "execution_steps": ["LangGraph Pipeline Initialized."],
        "messages": [HumanMessage(content=user_query)],
        "status": "INITIALIZED"
    }

    # Execute graph synchronously / asynchronously
    result = highway_langgraph_app.invoke(initial_state)

    return {
        "success": True,
        "engine": "LangGraph (StateGraph Multi-Agent Architecture)",
        "framework": "LangChain Core + LangGraph v1.2",
        "user_query": user_query,
        "road_name": result.get("road_name"),
        "urgency_level": result.get("urgency_level"),
        "total_segments_matched": len(result.get("matched_segments", [])),
        "segments_matched": result.get("matched_segments", []),
        "total_defects_count": result.get("total_defects_count", 0),
        "defects_breakdown": result.get("defects_breakdown", {}),
        "bill_of_materials": result.get("bill_of_materials"),
        "work_order": result.get("work_order"),
        "engineering_verdict": result.get("engineering_verdict"),
        "execution_steps": result.get("execution_steps", []),
        "status": result.get("status", "COMPLETED"),
    }
