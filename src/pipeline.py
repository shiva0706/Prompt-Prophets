"""
Master Pipeline: AI-Powered Road Condition Intelligence & Maintenance Prioritization.
Orchestrates:
1. Ingestion: Road Video / Frames & GPS Telemetry (.csv)
2. Model 1 Detector: YOLOv8-S / YOLOv8-N (Real-time defect bounding box localization)
3. Model 2 Severity: MobileNetV4-Small (timm) & Physical Extent Calibration
4. Model 2 Alternative (3D Depth): Depth Anything V2 Small (Pothole Cavity Profiler)
5. Risk Engine: Defect Risk Scores (DRS) & 50m Segment Risk Index (SRI)
6. Geo-Mapper: 50m road segment spatial partitioning & GeoJSON generation
7. Recommender: Civil engineering work orders, treatment strategies & cost estimation
"""

import os 
import glob 
from typing import List ,Dict ,Any ,Optional ,Tuple ,Callable ,Union 
import numpy as np 
import pandas as pd 
import cv2 
from PIL import Image 
import logging 

from .detector import RoadDefectDetector ,Detection 
from .severity import DefectSeverityGrader ,SeverityAssessment 
from .depth_estimator import DepthAnythingV2Estimator ,DepthProfile 
from .risk_engine import RiskEngine ,DefectRiskRecord ,SegmentRiskRecord 
from .geo_mapper import GeoMapper 
from .recommender import MaintenanceRecommender 

logger =logging .getLogger ("RoadConditionPipeline")

class RoadConditionPipeline :
    """
    End-to-end processing pipeline implementing the two-model cascade deep learning architecture.
    """

    def __init__ (
    self ,
    weights_path :str ="yolov8s.pt",
    conf_threshold :float =0.25 ,
    segment_length_m :float =50.0 ,
    gsd_cm_per_px :float =0.12 ,
    traffic_factor :float =1.5 ,
    enable_depth_estimation :bool =True ,
    device :str ="cpu"
    ):
        """
        Initialize the master pipeline with all analytical models and engines.
        """
        self .device =device 
        self .detector =RoadDefectDetector (
        weights_path =weights_path ,
        conf_threshold =conf_threshold ,
        device =device 
        )
        self .severity_grader =DefectSeverityGrader (
        padding_px =10 ,
        gsd_cm_per_px =gsd_cm_per_px ,
        device =device 
        )
        self .enable_depth_estimation =enable_depth_estimation 
        self .depth_estimator =DepthAnythingV2Estimator (device =device )if enable_depth_estimation else None 

        self .risk_engine =RiskEngine ()
        self .geo_mapper =GeoMapper (segment_length_m =segment_length_m )
        self .recommender =MaintenanceRecommender ()
        self .traffic_factor =traffic_factor 
        self .gsd_cm_per_px =gsd_cm_per_px 

    def process_inspection (
    self ,
    frames_source :Union [str ,List [np .ndarray ]],
    gps_source :Union [str ,pd .DataFrame ],
    progress_callback :Optional [Callable [[float ,str ],None ]]=None 
    )->Dict [str ,Any ]:
        """
        Execute full end-to-end inspection analysis.
        """
        if progress_callback :
            progress_callback (0.05 ,"Ingesting frames and GPS telemetry...")

        frames_list ,frame_names =self ._load_frames (frames_source )
        total_frames =len (frames_list )
        if total_frames ==0 :
            raise ValueError ("No valid image frames found to process.")

        gps_df =self ._load_gps (gps_source ,total_frames )
        telemetry_df =self .geo_mapper .interpolate_gps_telemetry (gps_df ,total_frames =total_frames )

        if progress_callback :
            progress_callback (0.20 ,f"Partitioning {telemetry_df['cum_dist_m'].max():.0f}m route into 50m road segments...")

        raw_segments =self .geo_mapper .partition_into_segments (telemetry_df )

        all_detections :List [Dict [str ,Any ]]=[]
        annotated_frames :Dict [int ,np .ndarray ]={}
        defect_patches :Dict [str ,Dict [str ,Any ]]={}
        defect_counter =0 

        for idx ,frame_bgr in enumerate (frames_list ):
            if progress_callback :
                pct =0.25 +(idx /total_frames )*0.45 
                progress_callback (pct ,f"Analyzing frame {idx + 1}/{total_frames} with Model 1 & Model 2...")

            frame_row =telemetry_df .iloc [idx ]
            lat ,lon =float (frame_row ["latitude"]),float (frame_row ["longitude"])

            detections =self .detector .detect (frame_bgr ,frame_idx =idx ,timestamp =frame_row .get ("timestamp"))

            for det in detections :
                defect_counter +=1 
                defect_id =f"DEF-{defect_counter:04d}"

                assessment :SeverityAssessment =self .severity_grader .assess_severity (
                frame_bgr =frame_bgr ,
                bbox =det .bbox ,
                defect_type =det .defect_type ,
                confidence =det .confidence 
                )

                depth_profile :Optional [DepthProfile ]=None 
                max_depth_cm =assessment .depth_roughness_proxy *0.15 
                cavity_volume_cm3 =max (1.0 ,assessment .estimated_area_cm2 *max_depth_cm *0.5 )

                if self .depth_estimator and assessment .patch_bgr is not None and assessment .patch_bgr .size >0 :
                    depth_profile =self .depth_estimator .analyze_pothole_depth (
                    patch_bgr =assessment .patch_bgr ,
                    area_cm2 =assessment .estimated_area_cm2 ,
                    gsd_cm_per_px =self .gsd_cm_per_px 
                    )
                    max_depth_cm =depth_profile .max_depth_cm 
                    cavity_volume_cm3 =depth_profile .estimated_volume_cm3 

                drs =self .risk_engine .compute_drs (
                defect_type =det .defect_type ,
                severity_level =assessment .severity_level ,
                severity_score =assessment .severity_score ,
                area_cm2 =assessment .estimated_area_cm2 ,
                confidence =det .confidence 
                )

                assigned_seg_id =self .geo_mapper .assign_defect_to_segment (lat ,lon ,raw_segments )

                action_rec =self .recommender .recommend_for_defect (det .defect_type ,assessment .severity_level )

                record ={
                "defect_id":defect_id ,
                "frame_idx":idx ,
                "frame_file":frame_names [idx ]if idx <len (frame_names )else f"frame_{idx:03d}.jpg",
                "defect_type":det .defect_type ,
                "severity_level":assessment .severity_level ,
                "severity_score":assessment .severity_score ,
                "confidence":round (det .confidence ,3 ),
                "bbox":det .bbox ,
                "area_cm2":assessment .estimated_area_cm2 ,
                "max_span_cm":assessment .max_dimension_cm ,
                "depth_proxy":assessment .depth_roughness_proxy ,
                "max_depth_cm":round (max_depth_cm ,2 ),
                "cavity_volume_cm3":round (cavity_volume_cm3 ,1 ),
                "aspect_ratio":assessment .aspect_ratio ,
                "pixel_variance":assessment .pixel_variance ,
                "drs":drs ,
                "latitude":lat ,
                "longitude":lon ,
                "segment_id":assigned_seg_id ,
                "explanation":assessment .explanation ,
                "recommended_action":action_rec .action_name ,
                "urgency":action_rec .urgency ,
                "estimated_cost_usd":action_rec .estimated_cost_usd 
                }

                all_detections .append (record )

                defect_patches [defect_id ]={
                "patch_bgr":assessment .patch_bgr ,
                "mask_bgr":assessment .mask_bgr ,
                "depth_colormap_bgr":depth_profile .depth_colormap_bgr if depth_profile else None ,
                "depth_profile":depth_profile ,
                "metadata":record 
                }

            annotated_frames [idx ]=RoadDefectDetector .draw_detections (frame_bgr ,detections )

        if progress_callback :
            progress_callback (0.80 ,"Aggregating Segment Risk Indices (SRI) and generating work orders...")

        defects_df =pd .DataFrame (all_detections )
        segments_data =[]

        for seg in raw_segments :
            seg_id =seg ["segment_id"]
            if not defects_df .empty and "segment_id"in defects_df .columns :
                seg_defects =defects_df [defects_df ["segment_id"]==seg_id ].to_dict ("records")
            else :
                seg_defects =[]

            drs_list =[d ["drs"]for d in seg_defects ]
            sri =self .risk_engine .compute_sri (drs_list ,traffic_factor =self .traffic_factor )
            pci =self .risk_engine .compute_pci_equivalent (sri )
            band =self .risk_engine .evaluate_condition_band (sri )

            if seg_defects :
                defect_types =[d ["defect_type"]for d in seg_defects ]
                dominant_defect =max (set (defect_types ),key =defect_types .count )
                max_drs =max (drs_list )
            else :
                dominant_defect ="None"
                max_drs =0.0 

            seg_recs =self .recommender .recommend_for_segment (seg_id ,sri ,band ,seg_defects )

            seg_record ={
            "segment_id":seg_id ,
            "segment_index":seg ["segment_index"],
            "start_distance_m":seg ["start_distance_m"],
            "end_distance_m":seg ["end_distance_m"],
            "start_coords":seg ["start_coords"],
            "end_coords":seg ["end_coords"],
            "start_lat":seg ["start_coords"][0 ],
            "start_lon":seg ["start_coords"][1 ],
            "end_lat":seg ["end_coords"][0 ],
            "end_lon":seg ["end_coords"][1 ],
            "defect_count":len (seg_defects ),
            "sri":sri ,
            "pci_equivalent":pci ,
            "condition_band":band ,
            "dominant_defect":dominant_defect ,
            "max_drs":max_drs ,
            "sum_drs":sum (drs_list ),
            "recommended_action":seg_recs ["recommended_action"],
            "urgency":seg_recs ["urgency"],
            "estimated_repair_cost":seg_recs ["estimated_repair_cost"],
            "primary_strategy":seg_recs ["primary_strategy"],
            "coordinates_path":seg ["coordinates_path"],
            "defects":seg_defects 
            }
            segments_data .append (seg_record )

        segments_df =pd .DataFrame (segments_data )

        geojson =self .geo_mapper .build_geojson (
        segments_data =segments_data ,
        defects_data =defects_df .to_dict ("records")if not defects_df .empty else []
        )

        total_distance_m =telemetry_df ["cum_dist_m"].max ()
        total_defects =len (defects_df )
        avg_sri =round (segments_df ["sri"].mean (),1 )if not segments_df .empty else 0.0 
        critical_count =int ((segments_df ["condition_band"]=="Critical").sum ())if not segments_df .empty else 0 
        moderate_count =int ((segments_df ["condition_band"]=="Moderate").sum ())if not segments_df .empty else 0 
        good_count =int ((segments_df ["condition_band"]=="Good").sum ())if not segments_df .empty else 0 
        total_cost =round (float (segments_df ["estimated_repair_cost"].sum ()),2 )if not segments_df .empty else 0.0 

        kpis ={
        "total_distance_km":round (total_distance_m /1000.0 ,3 ),
        "total_segments":len (segments_df ),
        "total_defects":total_defects ,
        "average_sri":avg_sri ,
        "critical_segments":critical_count ,
        "moderate_segments":moderate_count ,
        "good_segments":good_count ,
        "total_estimated_cost_usd":total_cost ,
        "pavement_health_status":"Critical Attention"if critical_count >0 else ("Moderate Maintenance"if moderate_count >0 else "Good Condition")
        }

        if progress_callback :
            progress_callback (1.0 ,"Analysis complete! Results compiled.")

        return {
        "defects_df":defects_df ,
        "segments_df":segments_df ,
        "telemetry_df":telemetry_df ,
        "geojson":geojson ,
        "annotated_frames":annotated_frames ,
        "defect_patches":defect_patches ,
        "kpis":kpis 
        }

    def _load_frames (self ,frames_source :Union [str ,List [np .ndarray ]])->Tuple [List [np .ndarray ],List [str ]]:
        """Load image frames from folder, video, or array list."""
        if isinstance (frames_source ,list ):
            names =[f"frame_{i:03d}.jpg"for i in range (len (frames_source ))]
            return frames_source ,names 

        if os .path .isdir (frames_source ):
            img_files =sorted (glob .glob (os .path .join (frames_source ,"*.*")))
            valid_exts =[".jpg",".jpeg",".png",".bmp"]
            img_files =[f for f in img_files if os .path .splitext (f )[1 ].lower ()in valid_exts ]

            frames =[]
            names =[]
            for f in img_files :
                img =cv2 .imread (f )
                if img is not None :
                    frames .append (img )
                    names .append (os .path .basename (f ))
            return frames ,names 

        elif os .path .isfile (frames_source ):
            ext =os .path .splitext (frames_source )[1 ].lower ()
            if ext in [".mp4",".avi",".mov",".mkv"]:
                cap =cv2 .VideoCapture (frames_source )
                frames =[]
                names =[]
                idx =0 
                while cap .isOpened ():
                    ret ,frame =cap .read ()
                    if not ret :
                        break 
                    if idx %10 ==0 :
                        frames .append (frame )
                        names .append (f"frame_{idx:05d}.jpg")
                    idx +=1 
                cap .release ()
                return frames ,names 
            else :
                img =cv2 .imread (frames_source )
                if img is not None :
                    return [img ],[os .path .basename (frames_source )]

        return [],[]

    def _load_gps (self ,gps_source :Union [str ,pd .DataFrame ],total_frames :int )->pd .DataFrame :
        """Load or mock GPS telemetry dataframe."""
        if isinstance (gps_source ,pd .DataFrame ):
            return gps_source 

        if isinstance (gps_source ,str )and os .path .exists (gps_source ):
            return pd .read_csv (gps_source )

        start_lat ,start_lon =12.986500 ,80.243500 
        rows =[]
        for i in range (total_frames ):
            progress_m =i *50.0 
            lat =start_lat -(progress_m /111000.0 )
            lon =start_lon +(progress_m *0.15 /111000.0 )
            rows .append ({
            "frame_idx":i ,
            "latitude":round (lat ,6 ),
            "longitude":round (lon ,6 ),
            "speed_kmh":45.0 ,
            "cum_dist_m":progress_m ,
            "state":"Tamil Nadu"
            })
        return pd .DataFrame (rows )
