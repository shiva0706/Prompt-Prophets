"""
Spatial Alignment & GeoJSON Engine.
Synchronizes GPS telemetry with video frames, bins continuous routes into 50m segments,
and generates rich GeoJSON layers for GIS visualization and map exports.
"""

from typing import List ,Dict ,Any ,Tuple ,Optional 
import math 
import json 
import pandas as pd 
import numpy as np 

def haversine_distance (lat1 :float ,lon1 :float ,lat2 :float ,lon2 :float )->float :
    """
    Calculate the great circle distance between two points on the Earth (in meters).
    """
    R =6371000.0 
    phi1 =math .radians (lat1 )
    phi2 =math .radians (lat2 )
    delta_phi =math .radians (lat2 -lat1 )
    delta_lambda =math .radians (lon2 -lon1 )

    a =(math .sin (delta_phi /2.0 )**2 +
    math .cos (phi1 )*math .cos (phi2 )*math .sin (delta_lambda /2.0 )**2 )
    c =2.0 *math .atan2 (math .sqrt (a ),math .sqrt (1.0 -a ))
    return R *c 

class GeoMapper :
    """
    Handles GPS track interpolation, spatial binning into 50m road segments,
    and GeoJSON generation.
    """

    def __init__ (self ,segment_length_m :float =50.0 ):
        """
        Args:
            segment_length_m: Target length for road segments in meters (default: 50m).
        """
        self .segment_length_m =segment_length_m 

    def interpolate_gps_telemetry (
    self ,
    gps_df :pd .DataFrame ,
    total_frames :int ,
    fps :float =30.0 
    )->pd .DataFrame :
        """
        Interpolate sparse GPS logs to match high-frequency camera frame indices.
        
        Args:
            gps_df: DataFrame with columns: ['timestamp' or 'frame_idx', 'latitude', 'longitude']
            total_frames: Number of video frames.
            fps: Video frames per second.
            
        Returns:
            DataFrame indexed by frame_idx (0 to total_frames - 1) with ['latitude', 'longitude', 'cum_dist_m'].
        """
        df =gps_df .copy ()

        if "frame_idx"not in df .columns :
            if "timestamp"in df .columns :
                min_t =df ["timestamp"].min ()
                df ["frame_idx"]=((df ["timestamp"]-min_t )*fps ).astype (int )
            else :
                df ["frame_idx"]=np .linspace (0 ,total_frames -1 ,len (df )).astype (int )

        target_frames =np .arange (total_frames )
        interp_lat =np .interp (target_frames ,df ["frame_idx"],df ["latitude"])
        interp_lon =np .interp (target_frames ,df ["frame_idx"],df ["longitude"])

        cum_dist =[0.0 ]
        for i in range (1 ,len (target_frames )):
            d =haversine_distance (interp_lat [i -1 ],interp_lon [i -1 ],interp_lat [i ],interp_lon [i ])
            cum_dist .append (cum_dist [-1 ]+d )

        frame_telemetry =pd .DataFrame ({
        "frame_idx":target_frames ,
        "latitude":interp_lat ,
        "longitude":interp_lon ,
        "cum_dist_m":cum_dist 
        })
        return frame_telemetry 

    def partition_into_segments (
    self ,
    telemetry_df :pd .DataFrame 
    )->List [Dict [str ,Any ]]:
        """
        Bin continuous trajectory points into 50-meter contiguous segments.
        
        Returns:
            List of segment metadata dicts with geometry and start/end coordinates.
        """
        if telemetry_df .empty :
            return []

        segments =[]
        total_dist =telemetry_df ["cum_dist_m"].max ()
        num_segments =max (1 ,math .ceil (total_dist /self .segment_length_m ))

        for seg_idx in range (num_segments ):
            start_m =seg_idx *self .segment_length_m 
            end_m =min (total_dist ,(seg_idx +1 )*self .segment_length_m )

            mask =(telemetry_df ["cum_dist_m"]>=start_m )&(telemetry_df ["cum_dist_m"]<=end_m )
            seg_pts =telemetry_df [mask ]

            if seg_pts .empty :

                closest_idx =(telemetry_df ["cum_dist_m"]-start_m ).abs ().idxmin ()
                seg_pts =telemetry_df .iloc [[closest_idx ]]

            start_coord =(float (seg_pts .iloc [0 ]["latitude"]),float (seg_pts .iloc [0 ]["longitude"]))
            end_coord =(float (seg_pts .iloc [-1 ]["latitude"]),float (seg_pts .iloc [-1 ]["longitude"]))

            coords_path =[[float (lon ),float (lat )]for lat ,lon in zip (seg_pts ["latitude"],seg_pts ["longitude"])]

            if len (coords_path )<2 :
                coords_path .append ([end_coord [1 ],end_coord [0 ]])

            segment_id =f"SEG-{seg_idx + 1:03d}"
            segments .append ({
            "segment_id":segment_id ,
            "segment_index":seg_idx ,
            "start_distance_m":round (start_m ,1 ),
            "end_distance_m":round (end_m ,1 ),
            "start_coords":start_coord ,
            "end_coords":end_coord ,
            "coordinates_path":coords_path ,
            "frame_indices":seg_pts ["frame_idx"].tolist ()
            })

        return segments 

    def assign_defect_to_segment (
    self ,
    defect_lat :float ,
    defect_lon :float ,
    segments :List [Dict [str ,Any ]]
    )->str :
        """Find the closest segment for a specific defect coordinate."""
        best_seg_id =segments [0 ]["segment_id"]if segments else "SEG-001"
        min_dist =float ("inf")

        for seg in segments :

            d_start =haversine_distance (defect_lat ,defect_lon ,seg ["start_coords"][0 ],seg ["start_coords"][1 ])
            d_end =haversine_distance (defect_lat ,defect_lon ,seg ["end_coords"][0 ],seg ["end_coords"][1 ])
            d =min (d_start ,d_end )
            if d <min_dist :
                min_dist =d 
                best_seg_id =seg ["segment_id"]

        return best_seg_id 

    def build_geojson (
    self ,
    segments_data :List [Dict [str ,Any ]],
    defects_data :List [Dict [str ,Any ]]
    )->Dict [str ,Any ]:
        """
        Generate a complete GeoJSON FeatureCollection containing:
        1. LineString features for 50m road segments with SRI coloring.
        2. Point features for all detected road hazards.
        """
        features =[]

        band_colors ={
        "Good":"#10B981",
        "Moderate":"#F59E0B",
        "Critical":"#EF4444"
        }

        for seg in segments_data :
            color =band_colors .get (seg .get ("condition_band","Good"),"#10B981")
            feat ={
            "type":"Feature",
            "geometry":{
            "type":"LineString",
            "coordinates":seg .get ("coordinates_path",[])
            },
            "properties":{
            "feature_type":"road_segment",
            "segment_id":seg .get ("segment_id"),
            "start_m":seg .get ("start_distance_m"),
            "end_m":seg .get ("end_distance_m"),
            "sri":seg .get ("sri",0.0 ),
            "pci":seg .get ("pci_equivalent",100.0 ),
            "condition_band":seg .get ("condition_band","Good"),
            "defect_count":seg .get ("defect_count",0 ),
            "dominant_defect":seg .get ("dominant_defect","None"),
            "recommended_action":seg .get ("recommended_action","Routine Inspection"),
            "estimated_repair_cost":seg .get ("estimated_repair_cost",0.0 ),
            "stroke":color ,
            "stroke-width":6 ,
            "stroke-opacity":0.85 
            }
            }
            features .append (feat )

        for d in defects_data :
            if d .get ("lat")is not None and d .get ("lon")is not None :
                feat ={
                "type":"Feature",
                "geometry":{
                "type":"Point",
                "coordinates":[float (d ["lon"]),float (d ["lat"])]
                },
                "properties":{
                "feature_type":"defect_point",
                "defect_id":d .get ("defect_id"),
                "defect_type":d .get ("defect_type"),
                "severity_level":d .get ("severity_level"),
                "confidence":d .get ("confidence"),
                "area_cm2":d .get ("area_cm2"),
                "max_span_cm":d .get ("max_span_cm"),
                "drs":d .get ("drs"),
                "segment_id":d .get ("segment_id"),
                "explanation":d .get ("explanation")
                }
                }
                features .append (feat )

        return {
        "type":"FeatureCollection",
        "metadata":{
        "system":"AI-Powered Road Condition Intelligence System",
        "total_segments":len (segments_data ),
        "total_defects":len (defects_data )
        },
        "features":features 
        }
