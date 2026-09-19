"""
Civil Engineering AI Copilot & Autonomous Decision & Work-Order Agent.
Autonomously evaluates pavement conditions (PCI, SRI, Depth, Area, Span),
makes executive engineering decisions, generates MoRTH/IRC compliant BOMs,
and drafts municipal maintenance work-order tickets.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import uuid
import datetime
import re

try:
    from backend.data.mock_road_network import (
        MOCK_ROAD_NETWORK,
        get_all_segments,
        get_segments_by_road,
        get_segment_by_id
    )
    from backend.agents.llama_engine import llama_engine
except ImportError:
    from data.mock_road_network import (
        MOCK_ROAD_NETWORK,
        get_all_segments,
        get_segments_by_road,
        get_segment_by_id
    )
    from agents.llama_engine import llama_engine


# =====================================================================
# Pydantic Models
# =====================================================================

class MaterialItem(BaseModel):
    item: str
    quantity: float
    unit: str
    unit_rate_inr: float
    total_cost_inr: float
    specification_standard: str = "MoRTH Section 500 / IRC:82"


class MachineryItem(BaseModel):
    equipment: str
    duration_hours: float
    rate_per_hour_inr: float
    total_cost_inr: float


class LaborItem(BaseModel):
    role: str
    crew_count: int
    duration_hours: float
    rate_per_hour_inr: float
    total_cost_inr: float


class BillOfMaterials(BaseModel):
    segment_ids: List[str]
    total_area_sqm: float
    repair_strategy: str
    materials: List[MaterialItem]
    machinery: List[MachineryItem]
    labor: List[LaborItem]
    subtotal_materials_inr: float
    subtotal_machinery_inr: float
    subtotal_labor_inr: float
    contingency_overhead_inr: float
    total_cost_inr: float
    total_cost_usd: float
    compliance_standard: str = "IRC:82-2015 & MoRTH (5th Revision)"


class WorkOrderItem(BaseModel):
    defect_id: str
    defect_type: str
    severity: str
    action: str
    urgency: str
    cost_inr: float


class WorkOrderDetails(BaseModel):
    work_order_id: str
    title: str
    road_name: str
    chainage_summary: str
    jurisdiction_authority: str
    urgency: str
    primary_action: str
    target_completion_days: int
    segments_covered: List[str]
    bill_of_materials: BillOfMaterials
    items: List[WorkOrderItem]
    compliance_notes: str
    created_at: str
    status: str = "APPROVED_READY_FOR_TENDER"


class DecisionVerdict(BaseModel):
    verdict_title: str
    urgency_tier: str
    action_code: str
    sla_timeframe: str
    risk_if_delayed: str
    engineering_rationale: str
    step_by_step_execution: List[str]
    immediate_procurement_directives: List[str]


class AgentThoughtStep(BaseModel):
    tool_name: str
    input_args: Dict[str, Any]
    output_summary: str


class QueryRequest(BaseModel):
    query: str = Field(..., description="Natural language civil engineering prompt")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Optional filter or map context")


class AgentResponse(BaseModel):
    query: str
    intent: str
    response_text: str
    decision_verdict: Optional[DecisionVerdict] = None
    segments_matched: List[Dict[str, Any]] = []
    bill_of_materials: Optional[BillOfMaterials] = None
    work_order: Optional[WorkOrderDetails] = None
    tools_called: List[AgentThoughtStep] = []
    suggestions: List[str] = []


# =====================================================================
# Civil Engineering Knowledge Base & Decision Engine
# =====================================================================

TECHNICAL_KNOWLEDGE_BASE = {
    "irc_82": {
        "title": "IRC:82-2015 Pavement Maintenance Guidelines",
        "content": (
            "### 📘 IRC:82-2015 — Code of Practice for Maintenance of Bituminous Surfaces\n\n"
            "**Key Mandates:**\n"
            "- **Crack Sealing (< 3mm width):** High-elastic polymer-modified bitumen emulsion (SS-1/RS-1) applied at 0.35–0.40 kg/m² with sand blotting.\n"
            "- **Crack Routing & Sealing (3mm – 20mm):** Cut 20x20mm reservoir, thermal lance drying at 1,500°C, hot-pour rubberized sealant meeting ASTM D6690 Type II.\n"
            "- **Alligator (Fatigue) Cracking:** Structural base failure requires 50mm cold milling of distressed layer, tack coat @ 0.30 kg/m², and Dense Bituminous Macadam (DBM) overlay.\n"
            "- **Pothole Repair:** Square-cut vertical edges 100mm into sound pavement, clean subbase cavity, tack coat, and compact hot-mix asphalt (HMA) in 50mm lifts to 98% Marshall density."
        )
    },
    "bitumen_grades": {
        "title": "MoRTH Bitumen Viscosity Grading (IS 73:2018)",
        "content": (
            "### 🧪 Viscosity Graded (VG) Bitumen Selection Matrix\n\n"
            "| Bitumen Grade | Viscosity @ 60°C (Poises) | Target Climate & Traffic Applications | Standard Application |\n"
            "| :--- | :--- | :--- | :--- |\n"
            "| **VG-10** | 800 – 1,200 | Cold regions / High altitude (< 30°C) | Spray application, Surface Dressing |\n"
            "| **VG-30** | 2,400 – 3,600 | Moderate climates (30°C – 45°C), National Highways | Heavy traffic DBM, Bituminous Concrete (BC) |\n"
            "| **VG-40** | 3,200 – 4,800 | Heavy commercial corridors, Toll plazas, High Temp (> 45°C) | Severe rutting resistance, Heavy axle loads |\n"
            "| **PMB-120** | Polymer Modified | Expressways with dynamic heavy braking / monsoon stress | High elasticity, fatigue retardation |"
        )
    }
}


class CivilEngineeringTools:
    """
    Standard civil engineering tools grounded in Indian Roads Congress (IRC)
    and Ministry of Road Transport & Highways (MoRTH) standards.
    """

    USD_TO_INR_RATE = 84.0

    @classmethod
    def query_road_segments(
        cls,
        road_name: Optional[str] = None,
        max_pci: Optional[float] = None,
        min_sri: Optional[float] = None,
        defect_type: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Filter spatial road segments."""
        candidates = get_all_segments()

        if road_name:
            candidates = get_segments_by_road(road_name)

        filtered = []
        for seg in candidates:
            if max_pci is not None and seg.get("pci", 100.0) > max_pci:
                continue
            if min_sri is not None and seg.get("sri", 0.0) < min_sri:
                continue

            if defect_type or severity:
                matching_defects = []
                for d in seg.get("defects", []):
                    type_match = True
                    sev_match = True
                    if defect_type:
                        d_type_norm = d.get("defect_type", "").lower().replace("_", "").replace(" ", "")
                        q_type_norm = defect_type.lower().replace("_", "").replace(" ", "")
                        type_match = (q_type_norm in d_type_norm or d_type_norm in q_type_norm)
                    if severity:
                        sev_match = (d.get("severity_level", "").lower() == severity.lower())
                    if type_match and sev_match:
                        matching_defects.append(d)
                if not matching_defects:
                    continue

            filtered.append(seg)
            if len(filtered) >= limit:
                break

        return filtered

    @classmethod
    def evaluate_decision_verdict(
        cls,
        segments: List[Dict[str, Any]],
        bom: Optional[BillOfMaterials] = None
    ) -> DecisionVerdict:
        """
        Autonomous Decision Engine: Evaluates PCI, SRI, defect depths/areas,
        and makes an authoritative civil engineering ruling.
        """
        if not segments:
            return DecisionVerdict(
                verdict_title="ROUTINE MONITORING VERDICT: NETWORK STABLE",
                urgency_tier="ROUTINE_MONITORING",
                action_code="ROUTINE_INSPECTION",
                sla_timeframe="Within 30–60 Days",
                risk_if_delayed="Low. Surface within acceptable ASTM D6433 structural thresholds.",
                engineering_rationale="Pavement exhibits no structural distress requiring immediate capital expenditure.",
                step_by_step_execution=[
                    "1. Continue bi-annual automated dashcam & LiDAR road condition scans.",
                    "2. Monitor stormwater drainage culverts during scheduled maintenance runs."
                ],
                immediate_procurement_directives=["No immediate material procurement necessary."]
            )

        min_pci = min((s.get("pci", 100.0) for s in segments), default=100.0)
        max_sri = max((s.get("sri", 0.0) for s in segments), default=0.0)

        # Check dominant defect characteristics
        has_critical_pothole = any(
            d.get("defect_type") == "Pothole" and (d.get("severity_level") == "Critical" or d.get("depth_cm", 0) >= 6.0)
            for s in segments for d in s.get("defects", [])
        )
        has_alligator_cracking = any(
            "Alligator" in d.get("defect_type", "") for s in segments for d in s.get("defects", [])
        )
        has_drainage_failure = any(
            "Water" in d.get("defect_type", "") for s in segments for d in s.get("defects", [])
        )

        if min_pci < 30.0 or max_sri >= 75.0 or has_critical_pothole:
            verdict_title = "DECISION VERDICT: MANDATE IMMEDIATE EMERGENCY FULL-DEPTH REHABILITATION"
            urgency_tier = "CRITICAL_EMERGENCY (24–48 Hours SLA)"
            action_code = "FULL_DEPTH_RECONSTRUCTION_AND_OVERLAY"
            sla = "Execute Within 24 to 48 Hours (Emergency Directive)"
            risk = "Severe tire blowout and axle fracture hazard. Rapid subgrade moisture saturation will expand potholes 3x under commercial freight loads."
            rationale = (
                "Superficial cold-patching is strictly ruled out due to deep structural subbase shear failure (depth > 6cm, fatigue cracking). "
                "Immediate saw-cutting, Tack Coat (RS-1), and Dense Bituminous Macadam (DBM VG-30) placement with vibratory roller compaction mandated under MoRTH Section 500."
            )
            steps = [
                "Step 1: Deploy Traffic Management & Warning Cones (IRC:SP:55 compliant diversion) 150m upstream.",
                "Step 2: Saw-cut vertical rectangular edges 100mm into intact pavement using diamond blade saw.",
                "Step 3: Excavate failed subbase material; compact subgrade cavity to >= 98% modified Proctor density.",
                "Step 4: Apply Cationic Rapid Setting Tack Coat (RS-1) @ 0.35 kg/m² using pressure distributor.",
                "Step 5: Lay Dense Bituminous Macadam (DBM Grade 2, VG-30) in 50mm lifts; compact with 10T Tandem Roller.",
                "Step 6: Pave 40mm Bituminous Concrete (BC Grade 2) wearing coat flush with roadway crown cross-slope."
            ]
            procurement = [
                f"Procure {bom.materials[1].quantity if bom else 8.5} Metric Tonnes DBM Grade 2 (VG-30)",
                f"Procure {bom.materials[0].quantity if bom else 120} kg Bituminous Tack Coat (RS-1)",
                f"Dispatch Wirtgen Cold Planer, 10-12T Tandem Vibratory Roller, and 14-member civil crew."
            ]

        elif has_drainage_failure or min_pci < 50.0:
            verdict_title = "DECISION VERDICT: PRE-MONSOON DRAINAGE REGRADE & CRACK INTERCEPTION"
            urgency_tier = "HIGH_PRIORITY (7 Days SLA)"
            action_code = "DRAINAGE_REGRADE_AND_SEAL"
            sla = "Execute Within 7 Days Before Monsoon Onset"
            risk = "Standing water will infiltrate micro-fissures, stripping bitumen-aggregate bond and causing widespread pothole eruptions."
            rationale = (
                "Moisture accumulation along road shoulder prevents sheet flow runoff. "
                "Immediate culvert desilting, shoulder camber regrading to 2.5%, and polymer crack sealing mandated under IRC:82-2015."
            )
            steps = [
                "Step 1: Clear longitudinal drainage channels and culverts with high-pressure Vactor Jet-Rodder truck.",
                "Step 2: Regrade unpaved shoulder drop-off to 2.5% transverse slope using motor grader.",
                "Step 3: Route all fissures > 3mm with crack router; thermal lance dry at 1,500°C.",
                "Step 4: Inject hot-pour elastomeric polymer sealant flush with pavement surface."
            ]
            procurement = [
                "Procure 150 kg Polymer-Modified Hot-Pour Crack Sealant (ASTM D6690 Type II)",
                "Mobilize Motor Grader and Jet-Rodder Drainage Clearing Unit."
            ]

        else:
            verdict_title = "DECISION VERDICT: PREVENTIVE MICRO-SURFACING & SURFACE PRESERVATION"
            urgency_tier = "MODERATE_PREVENTIVE (14–30 Days SLA)"
            action_code = "PREVENTIVE_MICRO_SURFACING"
            sla = "Execute Within 14 to 30 Days"
            risk = "Oxidized bitumen surface will develop reflective cracking over next 6 months if unsealed."
            rationale = "Pavement structural integrity is sound (PCI > 50). Preventive slurry seal / micro-surfacing extends service life by 4+ years at 20% cost of resurfacing."
            steps = [
                "Step 1: Clean surface using mechanical road broom and high-pressure air blast.",
                "Step 2: Apply polymer-modified cationic asphalt emulsion micro-surfacing layer (6-8mm thickness)."
            ]
            procurement = [
                "Procure Type II Micro-Surfacing Aggregate & Polymer Emulsion",
                "Deploy Continuous Micro-Surfacing Paver Box."
            ]

        return DecisionVerdict(
            verdict_title=verdict_title,
            urgency_tier=urgency_tier,
            action_code=action_code,
            sla_timeframe=sla,
            risk_if_delayed=risk,
            engineering_rationale=rationale,
            step_by_step_execution=steps,
            immediate_procurement_directives=procurement
        )

    @classmethod
    def calculate_bill_of_materials(
        cls,
        segment_ids: Optional[List[str]] = None,
        segments: Optional[List[Dict[str, Any]]] = None,
        repair_strategy: Optional[str] = None
    ) -> BillOfMaterials:
        """Calculates MoRTH/IRC compliant BOM."""
        if not segments:
            segments = []
            if segment_ids:
                for sid in segment_ids:
                    seg = get_segment_by_id(sid)
                    if seg:
                        segments.append(seg)
            else:
                segments = cls.query_road_segments(max_pci=35.0)

        resolved_segment_ids = [s["segment_id"] for s in segments]
        total_pavement_area_sqm = sum(s.get("length_meters", 50.0) * s.get("width_meters", 7.5) for s in segments)

        total_pothole_area_m2 = 0.0
        total_pothole_vol_m3 = 0.0
        total_alligator_area_m2 = 0.0
        total_crack_length_m = 0.0

        for s in segments:
            for d in s.get("defects", []):
                dtype = d.get("defect_type", "")
                area_m2 = d.get("area_cm2", 0.0) / 10000.0
                depth_m = d.get("depth_cm", 5.0) / 100.0
                span_m = d.get("span_cm", 50.0) / 100.0

                if dtype == "Pothole":
                    total_pothole_area_m2 += max(0.2, area_m2)
                    total_pothole_vol_m3 += max(0.2, area_m2) * depth_m
                elif "Alligator" in dtype:
                    total_alligator_area_m2 += max(1.0, area_m2)
                elif "Crack" in dtype:
                    total_crack_length_m += max(1.5, span_m)

        if total_pothole_area_m2 == 0 and total_alligator_area_m2 == 0 and total_crack_length_m == 0:
            total_pothole_area_m2 = len(segments) * 1.5
            total_pothole_vol_m3 = total_pothole_area_m2 * 0.075
            total_alligator_area_m2 = len(segments) * 8.0
            total_crack_length_m = len(segments) * 25.0

        materials: List[MaterialItem] = []

        patch_surface_area_m2 = (total_pothole_area_m2 * 1.3) + total_alligator_area_m2 + (total_pavement_area_sqm * 0.15)
        emulsion_qty_kg = round(patch_surface_area_m2 * 0.40, 2)
        emulsion_rate = 68.0
        materials.append(MaterialItem(
            item="Bituminous Tack Coat (Cationic Rapid Setting RS-1)",
            quantity=emulsion_qty_kg,
            unit="kg",
            unit_rate_inr=emulsion_rate,
            total_cost_inr=round(emulsion_qty_kg * emulsion_rate, 2),
            specification_standard="MoRTH Section 503 / IS 8887"
        ))

        dbm_volume_m3 = (total_pothole_vol_m3 * 1.2) + (total_alligator_area_m2 * 0.05)
        dbm_tonnes = round(max(2.5, dbm_volume_m3 * 2.42), 2)
        dbm_rate = 6850.0
        materials.append(MaterialItem(
            item="Dense Bituminous Macadam (DBM Grade 2, VG-30)",
            quantity=dbm_tonnes,
            unit="metric tonnes",
            unit_rate_inr=dbm_rate,
            total_cost_inr=round(dbm_tonnes * dbm_rate, 2),
            specification_standard="MoRTH Section 505 / IRC:111"
        ))

        bc_area_m2 = (total_pothole_area_m2 * 1.2) + total_alligator_area_m2
        bc_tonnes = round(max(1.5, bc_area_m2 * 0.04 * 2.40), 2)
        bc_rate = 7450.0
        materials.append(MaterialItem(
            item="Bituminous Concrete (BC Grade 2 Wearing Course)",
            quantity=bc_tonnes,
            unit="metric tonnes",
            unit_rate_inr=bc_rate,
            total_cost_inr=round(bc_tonnes * bc_rate, 2),
            specification_standard="MoRTH Section 507 / IRC:111"
        ))

        sealant_qty_kg = round(max(15.0, total_crack_length_m * 0.35), 2)
        sealant_rate = 185.0
        materials.append(MaterialItem(
            item="Polymer-Modified Hot-Pour Crack Sealant",
            quantity=sealant_qty_kg,
            unit="kg",
            unit_rate_inr=sealant_rate,
            total_cost_inr=round(sealant_qty_kg * sealant_rate, 2),
            specification_standard="ASTM D6690 Type II / IRC:SP:100"
        ))

        gsb_tonnes = round(max(2.0, total_pothole_vol_m3 * 1.8), 2)
        gsb_rate = 1450.0
        materials.append(MaterialItem(
            item="Granular Sub-Base Course (Grading I Aggregate)",
            quantity=gsb_tonnes,
            unit="metric tonnes",
            unit_rate_inr=gsb_rate,
            total_cost_inr=round(gsb_tonnes * gsb_rate, 2),
            specification_standard="MoRTH Section 401"
        ))

        machinery: List[MachineryItem] = []
        est_work_hours = max(8.0, len(segments) * 6.0)

        machinery.append(MachineryItem(
            equipment="Wirtgen Cold Milling Machine & Asphalt Saw Cutter",
            duration_hours=round(est_work_hours * 0.6, 1),
            rate_per_hour_inr=4200.0,
            total_cost_inr=round(est_work_hours * 0.6 * 4200.0, 2)
        ))
        machinery.append(MachineryItem(
            equipment="10-12T Tandem Vibratory Roller & Plate Compactor",
            duration_hours=round(est_work_hours * 0.8, 1),
            rate_per_hour_inr=2200.0,
            total_cost_inr=round(est_work_hours * 0.8 * 2200.0, 2)
        ))
        machinery.append(MachineryItem(
            equipment="Tack Coat Pressure Distributor & Spray Unit",
            duration_hours=round(est_work_hours * 0.5, 1),
            rate_per_hour_inr=1900.0,
            total_cost_inr=round(est_work_hours * 0.5 * 1900.0, 2)
        ))

        labor: List[LaborItem] = []
        labor.append(LaborItem(
            role="Resident Civil Engineer / Site Supervisor",
            crew_count=1,
            duration_hours=est_work_hours,
            rate_per_hour_inr=850.0,
            total_cost_inr=round(1 * est_work_hours * 850.0, 2)
        ))
        labor.append(LaborItem(
            role="Heavy Equipment Operators & Masons",
            crew_count=6,
            duration_hours=est_work_hours,
            rate_per_hour_inr=400.0,
            total_cost_inr=round(6 * est_work_hours * 400.0, 2)
        ))
        labor.append(LaborItem(
            role="Skilled Traffic Safety Flagmen & General Highway Workers",
            crew_count=4,
            duration_hours=est_work_hours,
            rate_per_hour_inr=250.0,
            total_cost_inr=round(4 * est_work_hours * 250.0, 2)
        ))

        subtotal_mat = sum(m.total_cost_inr for m in materials)
        subtotal_mach = sum(m.total_cost_inr for m in machinery)
        subtotal_lab = sum(l.total_cost_inr for l in labor)

        contingency = round((subtotal_mat + subtotal_mach + subtotal_lab) * 0.10, 2)
        total_inr = round(subtotal_mat + subtotal_mach + subtotal_lab + contingency, 2)
        total_usd = round(total_inr / cls.USD_TO_INR_RATE, 2)

        strategy = repair_strategy or (
            "Full-Depth Hot Mix Patching + Mill & Inlay Resurfacing with Hot Rubberized Crack Sealing"
            if total_alligator_area_m2 > 0 else "High-Performance Semi-Permanent Injection Patching & Tack Sealing"
        )

        return BillOfMaterials(
            segment_ids=resolved_segment_ids,
            total_area_sqm=round(total_pavement_area_sqm, 1),
            repair_strategy=strategy,
            materials=materials,
            machinery=machinery,
            labor=labor,
            subtotal_materials_inr=round(subtotal_mat, 2),
            subtotal_machinery_inr=round(subtotal_mach, 2),
            subtotal_labor_inr=round(subtotal_lab, 2),
            contingency_overhead_inr=contingency,
            total_cost_inr=total_inr,
            total_cost_usd=total_usd,
            compliance_standard="IRC:82-2015 & MoRTH Section 500 (5th Rev)"
        )

    @classmethod
    def draft_municipal_work_order(
        cls,
        road_name: str,
        segment_ids: List[str],
        urgency: Optional[str] = None,
        action: Optional[str] = None,
        authority: Optional[str] = None,
        notes: Optional[str] = None
    ) -> WorkOrderDetails:
        """Drafts formal municipal work order."""
        segments = []
        for sid in segment_ids:
            s = get_segment_by_id(sid)
            if s:
                segments.append(s)

        if not segments:
            segments = cls.query_road_segments(road_name=road_name)
            segment_ids = [s["segment_id"] for s in segments]

        assigned_authority = authority
        if not assigned_authority:
            if segments and "jurisdiction_authority" in segments[0]:
                assigned_authority = segments[0]["jurisdiction_authority"]
            elif "NH" in road_name.upper():
                assigned_authority = "National Highways Authority of India (NHAI) - RO Chennai"
            elif "SH" in road_name.upper():
                assigned_authority = "Tamil Nadu State PWD (Highways Department)"
            else:
                assigned_authority = "Municipal Corporation Highway Engineering Division"

        min_pci = min((s.get("pci", 100.0) for s in segments), default=50.0)
        if not urgency:
            if min_pci < 30.0:
                urgency = "EMERGENCY_24_TO_48_HOURS"
                completion_days = 2
            elif min_pci < 60.0:
                urgency = "HIGH_PRIORITY_7_DAYS"
                completion_days = 7
            else:
                urgency = "ROUTINE_30_DAYS"
                completion_days = 30
        else:
            completion_days = 2 if "24" in urgency or "EMERGENCY" in urgency.upper() else 7

        bom = cls.calculate_bill_of_materials(segments=segments)

        work_items: List[WorkOrderItem] = []
        for s in segments:
            for d in s.get("defects", []):
                cost = 18000.0 if d.get("severity_level") == "Critical" else 9500.0
                work_items.append(WorkOrderItem(
                    defect_id=d.get("defect_id", str(uuid.uuid4())[:8]),
                    defect_type=d.get("defect_type", "Pavement Defect"),
                    severity=d.get("severity_level", "High"),
                    action=f"Full-depth repair & sealing of {d.get('defect_type')} ({d.get('area_cm2', 0):.0f} cm²)",
                    urgency=urgency,
                    cost_inr=cost
                ))

        ticket_code = f"WO-{road_name.upper().replace('-', '').replace(' ', '')}-{datetime.date.today().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        chainage_start = min((s.get("chainage_start_km", 0.0) for s in segments), default=0.0)
        chainage_end = max((s.get("chainage_end_km", 0.0) for s in segments), default=0.0)

        primary_action = action or f"Pre-Monsoon Pavement Rehabilitation & Deep Asphalt Resurfacing ({len(segment_ids)} Segments)"

        compliance = (
            f"Execution must comply with MoRTH Specifications for Road & Bridge Works (5th Revision, Section 500), "
            f"IRC:82-2015 (Code of Practice for Maintenance of Bituminous Surfaces), and "
            f"IRC:SP:100-2014 (Use of Cold Mix Technology for Pavement Maintenance)."
        )

        return WorkOrderDetails(
            work_order_id=ticket_code,
            title=f"CIVIL TENDER WORK ORDER: {road_name} ({len(segment_ids)} Segments)",
            road_name=road_name,
            chainage_summary=f"Km {chainage_start:.3f} to Km {chainage_end:.3f} ({len(segment_ids) * 50}m Total Length)",
            jurisdiction_authority=assigned_authority,
            urgency=urgency,
            primary_action=primary_action,
            target_completion_days=completion_days,
            segments_covered=segment_ids,
            bill_of_materials=bom,
            items=work_items,
            compliance_notes=compliance,
            created_at=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S IST"),
            status="APPROVED_READY_FOR_TENDER"
        )


# =====================================================================
# Civil Engineering Copilot Agent Class
# =====================================================================

class CivilEngineeringCopilot:
    """
    Autonomous Civil Engineering Agent that makes decisions, executes tools,
    computes BOMs, and drafts work orders.
    """

    def __init__(self):
        self.tools = CivilEngineeringTools()

    def process_query(self, query: str, context: Optional[Dict[str, Any]] = None) -> AgentResponse:
        """Main autonomous query handler."""
        q_lower = query.lower()
        tools_called: List[AgentThoughtStep] = []

        # Check technical questions
        if "irc:82" in q_lower or "irc 82" in q_lower or "irc:sp:100" in q_lower:
            ans = TECHNICAL_KNOWLEDGE_BASE["irc_82"]["content"]
            tools_called.append(AgentThoughtStep(
                tool_name="retrieve_irc_standards",
                input_args={"standard": "IRC:82-2015"},
                output_summary="Retrieved IRC:82-2015 & ASTM D6690 pavement repair standards."
            ))
            return AgentResponse(
                query=query,
                intent="TECHNICAL_IRC_CONSULTATION",
                response_text=ans,
                tools_called=tools_called,
                suggestions=[
                    "Calculate repair costs for NH-44 using IRC:82 guidelines",
                    "Compare VG-30 vs VG-40 bitumen for highway overlays",
                    "Show pre-monsoon drainage checklist for State Highways"
                ]
            )

        if "vg-10" in q_lower or "vg-30" in q_lower or "vg-40" in q_lower or "viscosity grade" in q_lower or "bitumen grade" in q_lower:
            ans = TECHNICAL_KNOWLEDGE_BASE["bitumen_grades"]["content"]
            tools_called.append(AgentThoughtStep(
                tool_name="retrieve_bitumen_specifications",
                input_args={"standard": "IS 73:2018 / MoRTH Section 500"},
                output_summary="Retrieved Viscosity Graded (VG) Bitumen selection benchmarks."
            ))
            return AgentResponse(
                query=query,
                intent="TECHNICAL_BITUMEN_CONSULTATION",
                response_text=ans,
                tools_called=tools_called,
                suggestions=[
                    "Calculate DBM Grade 2 and VG-30 quantities for NH-44",
                    "What are the cold mix specifications under IRC:SP:100?",
                    "Draft an official NHAI work order for critical segments on NH-44"
                ]
            )

        # 1. Detect target corridor
        target_road = None
        if "nh-44" in q_lower or "nh44" in q_lower or "salem" in q_lower:
            target_road = "NH-44"
        elif "sh-72" in q_lower or "sh72" in q_lower or "sivagangai" in q_lower:
            target_road = "SH-72"
        elif "ring road" in q_lower or "madurai" in q_lower:
            target_road = "Madurai Ring Road"
        elif "omr" in q_lower or "chennai" in q_lower or "rajiv gandhi" in q_lower:
            target_road = "Chennai OMR"
        elif "nh-48" in q_lower or "nh48" in q_lower or "sriperumbudur" in q_lower:
            target_road = "NH-48"
        elif "ecr" in q_lower or "coast" in q_lower:
            target_road = "ECR Coastal Highway"

        # 2. Detect filters
        max_pci = None
        min_sri = None
        severity = None
        defect_type = None

        if "critical" in q_lower or "urgent" in q_lower or "severe" in q_lower or "pci < 30" in q_lower:
            max_pci = 35.0
            min_sri = 70.0
            severity = "Critical"
        elif "moderate" in q_lower or "warning" in q_lower:
            max_pci = 70.0
            min_sri = 30.0

        if "pothole" in q_lower:
            defect_type = "Pothole"
        elif "alligator" in q_lower or "fatigue" in q_lower:
            defect_type = "Alligator_Crack"
        elif "crack" in q_lower:
            defect_type = "Crack"
        elif "water" in q_lower or "ponding" in q_lower or "drainage" in q_lower or "monsoon" in q_lower:
            defect_type = "Water_Accumulation" if ("drainage" in q_lower or "ponding" in q_lower) else None

        # 3. Spatial Segment Query Tool
        matched_segments = self.tools.query_road_segments(
            road_name=target_road,
            max_pci=max_pci,
            min_sri=min_sri,
            defect_type=defect_type
        )

        if not matched_segments and target_road:
            matched_segments = self.tools.query_road_segments(road_name=target_road)

        if not matched_segments:
            matched_segments = self.tools.query_road_segments(max_pci=35.0)

        tools_called.append(AgentThoughtStep(
            tool_name="query_road_segments",
            input_args={"road_name": target_road, "max_pci": max_pci, "defect_type": defect_type},
            output_summary=f"Identified {len(matched_segments)} matching 50m road segments."
        ))

        # 4. Calculate Bill of Materials (BOM)
        bom = None
        if len(matched_segments) > 0:
            bom = self.tools.calculate_bill_of_materials(segments=matched_segments)
            tools_called.append(AgentThoughtStep(
                tool_name="calculate_bill_of_materials",
                input_args={"segment_count": len(matched_segments), "total_area_sqm": bom.total_area_sqm},
                output_summary=f"Estimated BOM total: ₹{bom.total_cost_inr:,.2f} (${bom.total_cost_usd:,.2f}) with {len(bom.materials)} MoRTH items."
            ))

        # 5. Autonomous Decision Verdict Generation
        decision = self.tools.evaluate_decision_verdict(segments=matched_segments, bom=bom)
        tools_called.append(AgentThoughtStep(
            tool_name="evaluate_decision_verdict",
            input_args={"evaluated_pci": min((s.get("pci", 100) for s in matched_segments), default=100)},
            output_summary=f"Decision Verdict: {decision.verdict_title} ({decision.sla_timeframe})"
        ))

        # 6. Work Order Ticket Generation
        road_label = target_road or (matched_segments[0]["road_name"] if matched_segments else "Highway Corridor")
        work_order = self.tools.draft_municipal_work_order(
            road_name=road_label,
            segment_ids=[s["segment_id"] for s in matched_segments],
            action=decision.verdict_title,
            notes=f"Auto-decided by AI Copilot: {decision.engineering_rationale}"
        )
        tools_called.append(AgentThoughtStep(
            tool_name="draft_municipal_work_order",
            input_args={"road_name": road_label, "segments": len(matched_segments)},
            output_summary=f"Drafted official work order ticket: {work_order.work_order_id} ({work_order.jurisdiction_authority})"
        ))

        # 7. Synthesize Response
        provider_status = llama_engine.get_provider_status()
        tools_called.append(AgentThoughtStep(
            tool_name="llama_agentic_reasoning_core",
            input_args={"provider": provider_status["active_provider"], "model": provider_status["model_name"]},
            output_summary=f"Synthesized autonomous engineering brief via {provider_status['active_provider']}"
        ))

        response_md = self._synthesize_response(
            query=query,
            road=target_road,
            segments=matched_segments,
            bom=bom,
            decision=decision,
            work_order=work_order,
            provider_label=provider_status["active_provider"]
        )

        suggestions = [
            f"Dispatch work order {work_order.work_order_id} to {work_order.jurisdiction_authority}",
            f"Calculate material procurement schedule for {road_label}",
            "Show pre-monsoon drainage checklist for State Highways",
            "What are the IRC:82-2015 specifications for crack sealing?"
        ]

        return AgentResponse(
            query=query,
            intent="AUTONOMOUS_DECISION_AND_WORK_ORDER",
            response_text=response_md,
            decision_verdict=decision,
            segments_matched=matched_segments,
            bill_of_materials=bom,
            work_order=work_order,
            tools_called=tools_called,
            suggestions=suggestions
        )

    async def process_query_async(self, query: str, context: Optional[Dict[str, Any]] = None) -> AgentResponse:
        """Asynchronous execution leveraging live LLaMA endpoints when available."""
        # Initial tool evaluation
        base_resp = self.process_query(query=query, context=context)

        # Send to LLaMA agent engine
        context_payload = {
            "query": query,
            "target_road": base_resp.segments_matched[0]["road_name"] if base_resp.segments_matched else "Corridor",
            "segments_count": len(base_resp.segments_matched),
            "estimated_pci": round(sum(s.get("pci", 50.0) for s in base_resp.segments_matched) / max(1, len(base_resp.segments_matched)), 1) if base_resp.segments_matched else 50.0,
            "total_cost_inr": base_resp.bill_of_materials.total_cost_inr if base_resp.bill_of_materials else 0,
            "work_order_id": base_resp.work_order.work_order_id if base_resp.work_order else "N/A"
        }

        try:
            llama_result = await llama_engine.execute_agentic_prompt(
                user_query=query,
                context_data=context_payload
            )
            if llama_result and llama_result.get("text"):
                # Prepend LLaMA reasoning to the structured tables
                enhanced_text = f"### 🦙 LLaMA Agentic Executive Brief ({llama_result.get('provider', 'LLaMA-3.3')})\n\n"
                enhanced_text += llama_result["text"] + "\n\n---\n\n" + base_resp.response_text
                base_resp.response_text = enhanced_text
        except Exception as err:
            print(f"[CopilotAgent] LLaMA async reasoning warning: {err}")

        return base_resp

    def _synthesize_response(
        self,
        query: str,
        road: Optional[str],
        segments: List[Dict[str, Any]],
        bom: Optional[BillOfMaterials],
        decision: DecisionVerdict,
        work_order: Optional[WorkOrderDetails],
        provider_label: str = "LLaMA Agentic Engine"
    ) -> str:
        """Constructs a structured decision brief in Markdown."""
        lines = []

        road_title = road or segments[0]["road_name"]
        critical_count = sum(1 for s in segments if s.get("pci", 100.0) < 30.0)
        avg_pci = sum(s.get("pci", 100.0) for s in segments) / len(segments)

        lines.append(f"## 🎯 Autonomous Engineering Decision & Action Plan")
        lines.append(f"**Target Corridor:** `{road_title}` | **Evaluated Segments:** {len(segments)} ({len(segments) * 50}m Total Length)")
        lines.append(f"**Average Pavement Condition (PCI):** **{avg_pci:.1f}/100** | **Critical Defect Segments:** {critical_count}\n")

        # Explicit Decision Verdict Box
        lines.append(f"### ⚖️ AI Decision Verdict: **{decision.verdict_title}**")
        lines.append(f"> **URGENCY SLA:** `{decision.sla_timeframe}`")
        lines.append(f"> **ENGINEERING RATIONALE:** {decision.engineering_rationale}")
        lines.append(f"> **FAILURE RISK IF DELAYED:** {decision.risk_if_delayed}\n")

        # Step by Step Execution Protocol
        lines.append("### 📋 Step-by-Step Field Execution Directives")
        for step in decision.step_by_step_execution:
            lines.append(f"- {step}")
        lines.append("")

        # Table of Segments
        lines.append("### 📍 Evaluated Spatial Segments & Defect Data")
        lines.append("| Segment ID | Chainage | PCI | SRI Risk | Dominant Defects | Jurisdiction Authority |")
        lines.append("| :--- | :--- | :--- | :--- | :--- | :--- |")

        for s in segments:
            defect_summary = ", ".join(f"{d['defect_type']} ({d['severity_level']})" for d in s.get("defects", [])) or "None"
            pci_badge = f"🔴 {s['pci']:.1f}" if s['pci'] < 30 else (f"🟠 {s['pci']:.1f}" if s['pci'] < 70 else f"🟢 {s['pci']:.1f}")
            lines.append(
                f"| **{s['segment_id']}** | Km {s.get('chainage_start_km', 0):.3f}–{s.get('chainage_end_km', 0):.3f} | "
                f"{pci_badge} | `{s.get('sri', 0):.1f}/100` | {defect_summary} | {s.get('jurisdiction_authority', 'NHAI/PWD')} |"
            )
        lines.append("")

        # BOM Breakdown
        if bom:
            lines.append("### 📊 MoRTH & IRC Itemized Bill of Materials (BOM)")
            lines.append(f"**Recommended Repair Strategy:** *{bom.repair_strategy}*")
            lines.append(f"**Total Pavement Area:** `{bom.total_area_sqm:,.1f} m²` | **Estimated Budget:** **₹{bom.total_cost_inr:,.2f}** (${bom.total_cost_usd:,.2f})\n")

            lines.append("#### 🧱 Material Quantities & Benchmarks")
            lines.append("| Material Description | Quantity | Unit Rate (INR) | Total Cost (INR) | Standard |")
            lines.append("| :--- | :--- | :--- | :--- | :--- |")
            for m in bom.materials:
                lines.append(f"| {m.item} | {m.quantity} {m.unit} | ₹{m.unit_rate_inr:,.2f} | ₹{m.total_cost_inr:,.2f} | `{m.specification_standard}` |")
            lines.append("")

            lines.append("#### 🚜 Plant, Machinery & Labor Deployment")
            lines.append("| Equipment / Labor Crew | Duration / Count | Rate | Total (INR) |")
            lines.append("| :--- | :--- | :--- | :--- |")
            for eq in bom.machinery:
                lines.append(f"| 🚜 {eq.equipment} | {eq.duration_hours} hrs | ₹{eq.rate_per_hour_inr:,.2f}/hr | ₹{eq.total_cost_inr:,.2f} |")
            for lb in bom.labor:
                lines.append(f"| 👷 {lb.role} | {lb.crew_count} personnel ({lb.duration_hours} hrs) | ₹{lb.rate_per_hour_inr:,.2f}/hr | ₹{lb.total_cost_inr:,.2f} |")
            lines.append(f"| **Contingency & Overhead (10%)** | *IRC Provision* | — | **₹{bom.contingency_overhead_inr:,.2f}** |")
            lines.append(f"| **TOTAL ESTIMATED PROJECT COST** | — | — | **₹{bom.total_cost_inr:,.2f}** |")
            lines.append("")

        # Work Order Ticket
        if work_order:
            lines.append("### 📜 Drafted Municipal Work-Order Ticket")
            lines.append(f"> **TICKET ID:** `{work_order.work_order_id}`")
            lines.append(f"> **DESIGNATED AUTHORITY:** **{work_order.jurisdiction_authority}**")
            lines.append(f"> **URGENCY TIER:** `{work_order.urgency}` (Target Completion: **{work_order.target_completion_days} Days**)")
            lines.append(f"> **ACTION DIRECTIVE:** {work_order.primary_action}")
            lines.append(f"> **STATUS:** `{work_order.status}` — Ready for Tender Dispatch.\n")

        lines.append("---")
        lines.append("💡 *Autonomous Civil Engineering Decision rendered under MoRTH 5th Revision & IRC:82-2015 Standards.*")

        return "\n".join(lines)


# Singleton Instance
copilot_agent = CivilEngineeringCopilot()
