"""
Test Suite for Civil Engineering AI Copilot & Autonomous Work-Order Agent.
Validates spatial segment filtering, MoRTH/IRC compliant BOM estimation,
and FastAPI endpoint execution.
"""

import pytest
from fastapi.testclient import TestClient

try:
    from backend.agents.copilot_agent import (
        CivilEngineeringCopilot,
        CivilEngineeringTools,
        copilot_agent
    )
    from backend.data.mock_road_network import (
        get_all_segments,
        get_segments_by_road,
        get_segment_by_id
    )
    from backend.main import app
except ImportError:
    from agents.copilot_agent import (
        CivilEngineeringCopilot,
        CivilEngineeringTools,
        copilot_agent
    )
    from data.mock_road_network import (
        get_all_segments,
        get_segments_by_road,
        get_segment_by_id
    )
    from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_query_critical_segments_nh44():
    """
    Test 1: Query for critical segments on NH-44 (PCI < 30)
    and verify correct segment retrieval.
    """
    segments = CivilEngineeringTools.query_road_segments(
        road_name="NH-44",
        max_pci=30.0
    )

    assert len(segments) > 0, "Should retrieve at least one critical segment on NH-44."
    for seg in segments:
        assert seg["road_name"] == "NH-44"
        assert seg["pci"] <= 30.0, f"Segment {seg['segment_id']} has PCI {seg['pci']} > 30.0"
        assert "defects" in seg
        assert len(seg["defects"]) > 0


def test_calculate_bill_of_materials():
    """
    Test 2: Verify Bill of Materials calculation and ensure
    non-zero material and cost outputs compliant with MoRTH / IRC benchmarks.
    """
    nh44_critical = CivilEngineeringTools.query_road_segments(
        road_name="NH-44",
        max_pci=30.0
    )
    assert len(nh44_critical) > 0

    bom = CivilEngineeringTools.calculate_bill_of_materials(segments=nh44_critical)

    assert bom is not None
    assert bom.total_area_sqm > 0.0
    assert bom.total_cost_inr > 0.0
    assert bom.total_cost_usd > 0.0
    assert len(bom.materials) >= 4, "Must contain at least 4 MoRTH material items."
    assert len(bom.machinery) >= 3, "Must contain at least 3 plant/machinery items."
    assert len(bom.labor) >= 3, "Must contain at least 3 labor crew categories."

    # Check that individual material items have positive quantities and costs
    for mat in bom.materials:
        assert mat.quantity > 0.0, f"Material {mat.item} has 0 quantity"
        assert mat.total_cost_inr > 0.0, f"Material {mat.item} has 0 cost"
        assert mat.specification_standard != ""

    # Check contingency and subtotal math
    expected_subtotal = bom.subtotal_materials_inr + bom.subtotal_machinery_inr + bom.subtotal_labor_inr
    assert abs(expected_subtotal + bom.contingency_overhead_inr - bom.total_cost_inr) < 1.0


def test_fastapi_copilot_chat_endpoint(client):
    """
    Test 3: Verify the FastAPI endpoint /api/copilot/chat returns HTTP 200
    with structured work order and BOM response schema.
    """
    payload = {
        "query": "Show all critical segments on NH-44 needing urgent patching before monsoon"
    }
    response = client.post("/api/copilot/chat", json=payload)

    assert response.status_code == 200, f"Expected HTTP 200, got {response.status_code}: {response.text}"
    data = response.json()

    assert "response_text" in data
    assert "segments_matched" in data
    assert len(data["segments_matched"]) > 0
    assert "bill_of_materials" in data
    assert data["bill_of_materials"] is not None
    assert data["bill_of_materials"]["total_cost_inr"] > 0
    assert "work_order" in data
    assert data["work_order"] is not None
    assert "work_order_id" in data["work_order"]
    assert "jurisdiction_authority" in data["work_order"]
    assert "NHAI" in data["work_order"]["jurisdiction_authority"] or "Highway" in data["work_order"]["jurisdiction_authority"]
    assert len(data["tools_called"]) >= 2


def test_draft_municipal_work_order():
    """
    Test 4: Verify draft work order generation directly via tool.
    """
    work_order = CivilEngineeringTools.draft_municipal_work_order(
        road_name="SH-72",
        segment_ids=["SH72-SEG-201"],
        urgency="EMERGENCY_24_HOURS",
        authority="Tamil Nadu State PWD (Highways)"
    )

    assert work_order.work_order_id.startswith("WO-SH72")
    assert work_order.jurisdiction_authority == "Tamil Nadu State PWD (Highways)"
    assert work_order.urgency == "EMERGENCY_24_HOURS"
    assert len(work_order.segments_covered) == 1
    assert work_order.bill_of_materials.total_cost_inr > 0


def test_fastapi_auxiliary_endpoints(client):
    """
    Test 5: Verify /api/copilot/segments, /api/copilot/calculate-bom, and /api/copilot/roads.
    """
    # 1. Segments list
    resp_seg = client.get("/api/copilot/segments?road_name=Madurai+Ring+Road")
    assert resp_seg.status_code == 200
    assert resp_seg.json()["total_matched"] >= 1

    # 2. Roads overview
    resp_roads = client.get("/api/copilot/roads")
    assert resp_roads.status_code == 200
    assert "corridors" in resp_roads.json()
    assert len(resp_roads.json()["corridors"]) >= 3

    # 3. Calculate BOM endpoint
    resp_bom = client.post("/api/copilot/calculate-bom", json={"road_name": "NH-44"})
    assert resp_bom.status_code == 200
    assert resp_bom.json()["total_cost_inr"] > 0
