"""
Unit and Integration Tests for AI Road Condition Intelligence & Maintenance Prioritization System.
"""

import os 
import shutil 
import pytest 
import numpy as np 
import pandas as pd 
import cv2 

from src .detector import RoadDefectDetector ,Detection 
from src .severity import DefectSeverityGrader ,SeverityAssessment 
from src .risk_engine import RiskEngine 
from src .geo_mapper import GeoMapper ,haversine_distance 
from src .recommender import MaintenanceRecommender 
from src .sample_data import (
generate_asphalt_texture ,
draw_synthetic_pothole ,
draw_synthetic_transverse_crack ,
generate_sample_dataset 
)
from src .pipeline import RoadConditionPipeline 

@pytest .fixture (scope ="session")
def sample_test_data (tmp_path_factory ):
    """Generate temporary test dataset for testing."""
    temp_dir =str (tmp_path_factory .mktemp ("road_test_data"))
    frames_dir ,gps_csv =generate_sample_dataset (output_dir =temp_dir ,num_frames =5 )
    return {"temp_dir":temp_dir ,"frames_dir":frames_dir ,"gps_csv":gps_csv }

class TestModel1Detector :
    def test_detector_initialization (self ):
        detector =RoadDefectDetector (conf_threshold =0.20 )
        assert detector .conf_threshold ==0.20 

    def test_synthetic_pothole_detection (self ):
        detector =RoadDefectDetector (conf_threshold =0.20 )
        img =generate_asphalt_texture (640 ,480 )
        draw_synthetic_pothole (img ,(320 ,240 ),50 ,40 )

        detections =detector .detect (img )
        assert len (detections )>=1 

        det =detections [0 ]
        assert det .defect_type in ["Pothole","Transverse_Crack","Alligator_Crack","Longitudinal_Crack","Water_Accumulation"]
        assert 0.0 <=det .confidence <=1.0 
        assert len (det .bbox )==4 
        x1 ,y1 ,x2 ,y2 =det .bbox 
        assert 0 <=x1 <x2 <=640 
        assert 0 <=y1 <y2 <=480 

    def test_draw_detections_overlay (self ):
        img =generate_asphalt_texture (640 ,480 )
        det =Detection (
        defect_type ="Pothole",
        confidence =0.92 ,
        bbox =(100 ,100 ,200 ,200 ),
        bbox_norm =(0.156 ,0.208 ,0.312 ,0.416 )
        )
        annotated =RoadDefectDetector .draw_detections (img ,[det ])
        assert annotated .shape ==img .shape 

        assert not np .array_equal (annotated ,img )

class TestModel2SeverityGrader :
    def test_patch_cropping_with_padding (self ):
        grader =DefectSeverityGrader (padding_px =10 )
        img =np .zeros ((480 ,640 ,3 ),dtype =np .uint8 )

        patch ,(px1 ,py1 ,px2 ,py2 )=grader .crop_patch (img ,(100 ,100 ,200 ,200 ))
        assert px1 ==90 
        assert py1 ==90 
        assert px2 ==210 
        assert py2 ==210 
        assert patch .shape ==(120 ,120 ,3 )

        patch_corner ,(cx1 ,cy1 ,cx2 ,cy2 )=grader .crop_patch (img ,(5 ,5 ,50 ,50 ))
        assert cx1 ==0 
        assert cy1 ==0 
        assert cx2 ==60 
        assert cy2 ==60 

    def test_severity_assessment_metrics (self ):
        grader =DefectSeverityGrader (gsd_cm_per_px =0.12 )
        img =generate_asphalt_texture (640 ,480 )
        draw_synthetic_pothole (img ,(300 ,250 ),60 ,45 )

        assessment =grader .assess_severity (
        frame_bgr =img ,
        bbox =(240 ,200 ,360 ,300 ),
        defect_type ="Pothole",
        confidence =0.85 
        )
        assert assessment .severity_level in ["Low","Medium","High","Critical"]
        assert 0.0 <=assessment .severity_score <=1.0 
        assert assessment .estimated_area_cm2 >0.0 
        assert assessment .max_dimension_cm >0.0 
        assert 0.0 <=assessment .depth_roughness_proxy <=100.0 
        assert assessment .patch_bgr is not None 

class TestRiskEngine :
    def test_drs_calculation (self ):
        engine =RiskEngine ()
        drs_low =engine .compute_drs ("Longitudinal_Crack","Low",0.2 ,50.0 ,0.8 )
        drs_crit =engine .compute_drs ("Pothole","Critical",0.95 ,1200.0 ,0.95 )

        assert drs_crit >drs_low 
        assert drs_low >=0.5 
        assert drs_crit <=45.0 

    def test_sri_calculation_and_bounds (self ):
        engine =RiskEngine ()

        assert engine .compute_sri ([])==0.0 

        sri_mod =engine .compute_sri ([3.5 ,4.2 ],traffic_factor =1.0 )
        assert 10.0 <=sri_mod <=60.0 

        sri_crit =engine .compute_sri ([25.0 ,30.0 ,18.0 ],traffic_factor =2.5 )
        assert sri_crit ==100.0 

    def test_condition_band_mapping (self ):
        engine =RiskEngine ()
        assert engine .evaluate_condition_band (15.0 )=="Good"
        assert engine .evaluate_condition_band (55.0 )=="Moderate"
        assert engine .evaluate_condition_band (85.0 )=="Critical"

        assert engine .compute_pci_equivalent (0.0 )==100.0 
        assert engine .compute_pci_equivalent (100.0 )<=10.0 

class TestGeoMapper :
    def test_haversine_distance (self ):

        d =haversine_distance (37.7749 ,-122.4194 ,37.8044 ,-122.2711 )
        assert 12000 <d <15000 

    def test_partition_into_50m_segments (self ):
        mapper =GeoMapper (segment_length_m =50.0 )

        telemetry_df =pd .DataFrame ({
        "frame_idx":range (6 ),
        "latitude":[37.7749 +(i *0.0003 )for i in range (6 )],
        "longitude":[-122.4194 for _ in range (6 )],
        "cum_dist_m":[0.0 ,30.0 ,60.0 ,90.0 ,120.0 ,150.0 ]
        })

        segments =mapper .partition_into_segments (telemetry_df )
        assert len (segments )>=3 
        assert segments [0 ]["segment_id"]=="SEG-001"
        assert segments [0 ]["start_distance_m"]==0.0 
        assert segments [0 ]["end_distance_m"]==50.0 

    def test_geojson_feature_generation (self ):
        mapper =GeoMapper ()
        segments_data =[{
        "segment_id":"SEG-001",
        "start_distance_m":0.0 ,
        "end_distance_m":50.0 ,
        "coordinates_path":[[-122.4194 ,37.7749 ],[-122.4193 ,37.7753 ]],
        "sri":45.0 ,
        "condition_band":"Moderate",
        "defect_count":1 ,
        "dominant_defect":"Pothole",
        "recommended_action":"Patching",
        "estimated_repair_cost":150.0 
        }]
        defects_data =[{
        "defect_id":"DEF-0001",
        "defect_type":"Pothole",
        "severity_level":"Medium",
        "confidence":0.88 ,
        "area_cm2":450.0 ,
        "max_span_cm":28.0 ,
        "drs":8.5 ,
        "lat":37.7750 ,
        "lon":-122.4194 ,
        "segment_id":"SEG-001",
        "explanation":"Moderate cavity"
        }]

        geojson =mapper .build_geojson (segments_data ,defects_data )
        assert geojson ["type"]=="FeatureCollection"
        assert len (geojson ["features"])==2 

class TestMaintenanceRecommender :
    def test_recommender_catalog_rules (self ):
        rec =MaintenanceRecommender ()

        action_crit_pothole =rec .recommend_for_defect ("Pothole","Critical")
        assert "Emergency"in action_crit_pothole .action_name or "Hot Asphalt"in action_crit_pothole .action_name 
        assert action_crit_pothole .urgency =="Immediate (24-48h)"
        assert action_crit_pothole .estimated_cost_usd >=200.0 

        action_low_crack =rec .recommend_for_defect ("Longitudinal_Crack","Low")
        assert action_low_crack .urgency =="Routine (30-90d)"

    def test_segment_level_aggregation (self ):
        rec =MaintenanceRecommender ()
        defects =[
        {"defect_id":"DEF-0001","defect_type":"Pothole","severity_level":"Critical"},
        {"defect_id":"DEF-0002","defect_type":"Transverse_Crack","severity_level":"Medium"}
        ]

        seg_rec =rec .recommend_for_segment ("SEG-001",sri =78.0 ,condition_band ="Critical",defects =defects )
        assert seg_rec ["urgency"]=="Immediate (24-48h)"
        assert seg_rec ["estimated_repair_cost"]>300.0 
        assert len (seg_rec ["work_order_items"])==2 

class TestEndToEndPipeline :
    def test_full_pipeline_run (self ,sample_test_data ):
        frames_dir =sample_test_data ["frames_dir"]
        gps_csv =sample_test_data ["gps_csv"]

        pipeline =RoadConditionPipeline (
        conf_threshold =0.20 ,
        segment_length_m =50.0 ,
        traffic_factor =1.5 
        )

        results =pipeline .process_inspection (frames_source =frames_dir ,gps_source =gps_csv )

        assert "defects_df"in results 
        assert "segments_df"in results 
        assert "geojson"in results 
        assert "kpis"in results 

        defects_df =results ["defects_df"]
        segments_df =results ["segments_df"]
        kpis =results ["kpis"]

        assert len (segments_df )>=4 
        assert kpis ["total_segments"]==len (segments_df )
        assert kpis ["total_defects"]==len (defects_df )
        assert 0.0 <=kpis ["average_sri"]<=100.0 
        assert kpis ["total_distance_km"]>0.0 
