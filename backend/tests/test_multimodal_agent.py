"""
Integration tests for Autonomous Multi-Modal Decision Agent with Past & Live Image and Video inputs.
"""

import os
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"


def test_sample_media():
    response = client.get("/api/sample-media")
    assert response.status_code == 200
    data = response.json()
    assert "benchmark_images" in data
    assert "has_sample_video" in data


def test_detect_road_image_upload():
    sample_img_path = os.path.join("sample_data", "frames", "India_000101.jpg")
    if not os.path.exists(sample_img_path):
        sample_img_path = os.path.join("sample_data", "frames", "frame_000.jpg")
    
    with open(sample_img_path, "rb") as f:
        response = client.post(
            "/api/detect-road-image",
            files={"file": ("India_000101.jpg", f, "image/jpeg")}
        )
    assert response.status_code == 200
    data = response.json()
    assert "detections" in data
    assert "fix_protocol" in data
    assert "overall_severity" in data
    assert "total_estimated_cost_inr" in data


def test_detect_live_frame():
    # Load sample image as base64
    sample_img_path = os.path.join("sample_data", "frames", "Czech_000340.jpg")
    if not os.path.exists(sample_img_path):
        sample_img_path = os.path.join("sample_data", "frames", "frame_000.jpg")
    
    import base64
    with open(sample_img_path, "rb") as f:
        b64_str = base64.b64encode(f.read()).decode("utf-8")

    response = client.post(
        "/api/detect-live-frame",
        json={"image_b64": b64_str, "frame_idx": 1, "timestamp_sec": 0.5}
    )
    assert response.status_code == 200
    data = response.json()
    assert "detections" in data
    assert "annotated_image_b64" in data
    assert "depth_heatmap_b64" in data


def test_detect_road_video():
    video_path = os.path.join("sample_data", "sample_survey_video.mp4")
    assert os.path.exists(video_path), "sample_survey_video.mp4 must exist for test"

    with open(video_path, "rb") as f:
        response = client.post(
            "/api/detect-road-video",
            files={"file": ("sample_survey_video.mp4", f, "video/mp4")}
        )
    assert response.status_code == 200
    data = response.json()
    assert "decision_verdict" in data
    assert "bill_of_materials" in data
    assert "work_order" in data
    assert "keyframes" in data
    assert len(data["keyframes"]) > 0
    assert data["work_order"]["status"] == "APPROVED_READY_FOR_TENDER"


def test_decide_multimodal_comparative():
    payload = {
        "mode": "comparative",
        "primary_input": {
            "pothole_count": 3,
            "crack_count": 2,
            "estimated_depth_cm": 6.8,
            "has_water_filled_pothole": True,
            "total_estimated_cost_inr": 5400
        },
        "baseline_input": {
            "pothole_count": 1,
            "crack_count": 1,
            "estimated_depth_cm": 3.2,
            "has_water_filled_pothole": False,
            "total_estimated_cost_inr": 2100
        }
    }
    response = client.post("/api/agent/decide-multimodal", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_comparative"] is True
    assert data["is_accelerating"] is True
    assert data["delta_depth_cm"] > 0
    assert "CRITICAL" in data["decision_verdict"]["urgency_tier"]
    assert "tts_speech_text" in data["decision_verdict"]
