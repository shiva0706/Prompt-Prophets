"""
Unit & Integration Tests for Selected Model Stack and RDD2022 Dataset Tools:
1. YOLOv8-S Detector & RDD2022 class mapping
2. MobileNetV4-Small Severity Classifier via timm
3. Depth Anything V2 Monocular 3D Depth Estimator
4. RDD2022 Dataset Manager (XML parser, YOLO converter, rdd2022.yaml generator)
"""

import os 
import pytest 
import numpy as np 
import cv2 
from pathlib import Path 

from src .detector import RoadDefectDetector ,Detection 
from src .severity import DefectSeverityGrader ,MobileNetV4SeverityClassifier ,SeverityAssessment 
from src .depth_estimator import DepthAnythingV2Estimator ,DepthProfile 
from src .rdd2022_setup import RDD2022DatasetManager ,RDD2022_CLASSES ,CLASS_NAME_MAP 
from src .sample_data import generate_asphalt_texture ,draw_synthetic_pothole 
from src .pipeline import RoadConditionPipeline 

class TestYOLOv8SDetector :
    def test_detector_initialization_yolov8s (self ):
        detector =RoadDefectDetector (weights_path ="yolov8s.pt",conf_threshold =0.25 )
        assert detector .weights_path =="yolov8s.pt"
        assert detector .conf_threshold ==0.25 

    def test_rdd2022_class_mapping (self ):
        detector =RoadDefectDetector (weights_path ="yolov8s.pt")
        assert detector ._map_to_canonical_class ("D00")=="Longitudinal_Crack"
        assert detector ._map_to_canonical_class ("D10")=="Transverse_Crack"
        assert detector ._map_to_canonical_class ("D20")=="Alligator_Crack"
        assert detector ._map_to_canonical_class ("D40")=="Pothole"
        assert detector ._map_to_canonical_class ("pothole")=="Pothole"

class TestMobileNetV4SeverityClassifier :
    def test_mobilenetv4_initialization (self ):
        classifier =MobileNetV4SeverityClassifier (
        model_name ="mobilenetv4_conv_small.e2400_r224_in1k",
        num_classes =4 ,
        pretrained =False 
        )
        assert classifier .model_name =="mobilenetv4_conv_small.e2400_r224_in1k"

    def test_mobilenetv4_patch_inference (self ):
        classifier =MobileNetV4SeverityClassifier (pretrained =False )
        test_patch =np .random .randint (0 ,255 ,(224 ,224 ,3 ),dtype =np .uint8 )
        probs =classifier .predict_probs (test_patch )
        assert len (probs )==4 
        assert np .isclose (np .sum (probs ),1.0 ,atol =1e-2 )

    def test_severity_grader_integration (self ):
        grader =DefectSeverityGrader (gsd_cm_per_px =0.12 ,use_deep_backbone =True )
        img =generate_asphalt_texture (640 ,480 )
        draw_synthetic_pothole (img ,(320 ,240 ),60 ,45 )

        assessment =grader .assess_severity (
        frame_bgr =img ,
        bbox =(260 ,195 ,380 ,285 ),
        defect_type ="Pothole",
        confidence =0.88 
        )
        assert assessment .severity_level in ["Low","Medium","High","Critical"]
        assert 0.0 <=assessment .severity_score <=1.0 
        assert assessment .estimated_area_cm2 >0 
        assert assessment .max_dimension_cm >0 

class TestDepthAnythingV2Estimator :
    def test_depth_estimator_initialization (self ):
        estimator =DepthAnythingV2Estimator (depth_scale_cm =12.0 )
        assert estimator .depth_scale_cm ==12.0 

    def test_estimate_depth_map (self ):
        estimator =DepthAnythingV2Estimator ()
        patch =generate_asphalt_texture (120 ,120 )
        draw_synthetic_pothole (patch ,(60 ,60 ),30 ,25 )

        depth_map =estimator .estimate_depth (patch )
        assert depth_map .shape ==(120 ,120 )
        assert 0.0 <=depth_map .min ()
        assert depth_map .max ()<=1.0 

    def test_analyze_pothole_cavity_profile (self ):
        estimator =DepthAnythingV2Estimator (depth_scale_cm =10.0 )
        patch =generate_asphalt_texture (100 ,100 )
        draw_synthetic_pothole (patch ,(50 ,50 ),30 ,25 )

        profile :DepthProfile =estimator .analyze_pothole_depth (patch ,area_cm2 =250.0 )
        assert profile .max_depth_cm >0 
        assert profile .mean_depth_cm >=0 
        assert profile .estimated_volume_cm3 >0 
        assert len (profile .cross_section_x )==100 
        assert len (profile .cross_section_y )==100 
        assert profile .depth_colormap_bgr .shape ==(100 ,100 ,3 )

class TestRDD2022DatasetTools :
    def test_dataset_scaffolding_and_sample_generation (self ,tmp_path ):
        manager =RDD2022DatasetManager (base_dir =str (tmp_path /"rdd2022"))
        dirs =manager .setup_directories ()
        assert Path (dirs ["images_train"]).exists ()
        assert Path (dirs ["labels_train"]).exists ()

        stats =manager .generate_sample_dataset (num_samples =6 )
        assert stats ["train_samples"]+stats ["val_samples"]==6 
        assert manager .yaml_path .exists ()

        report =manager .inspect_dataset ()
        assert report ["total_images"]==6 
        assert report ["yaml_exists"]is True 

    def test_xml_to_yolo_conversion (self ,tmp_path ):
        xml_content ="""<annotation>
    <folder>India</folder>
    <filename>India_0001.jpg</filename>
    <size>
        <width>1280</width>
        <height>720</height>
        <depth>3</depth>
    </size>
    <object>
        <name>D40</name>
        <bndbox>
            <xmin>400</xmin>
            <ymin>300</ymin>
            <xmax>600</xmax>
            <ymax>450</ymax>
        </bndbox>
    </object>
    <object>
        <name>D00</name>
        <bndbox>
            <xmin>100</xmin>
            <ymin>200</ymin>
            <xmax>150</xmax>
            <ymax>600</ymax>
        </bndbox>
    </object>
</annotation>"""
        xml_file =tmp_path /"test_annotation.xml"
        xml_file .write_text (xml_content ,encoding ="utf-8")

        manager =RDD2022DatasetManager (base_dir =str (tmp_path /"rdd2022"))
        yolo_lines =manager .convert_voc_xml_to_yolo (str (xml_file ))
        assert len (yolo_lines )==2 

        assert yolo_lines [0 ].startswith ("3 ")

        assert yolo_lines [1 ].startswith ("0 ")

class TestPipelineWithNewModels :
    def test_pipeline_with_yolov8s_and_depth (self ,tmp_path ):
        from src .sample_data import generate_sample_dataset 

        sample_dir =str (tmp_path /"test_data")
        frames_dir ,gps_csv =generate_sample_dataset (output_dir =sample_dir ,num_frames =3 )

        pipeline =RoadConditionPipeline (
        weights_path ="yolov8s.pt",
        enable_depth_estimation =True ,
        segment_length_m =50.0 
        )

        results =pipeline .process_inspection (frames_source =frames_dir ,gps_source =gps_csv )
        assert "defects_df"in results 
        assert "segments_df"in results 
        assert "kpis"in results 
        assert results ["kpis"]["total_segments"]>=1 
