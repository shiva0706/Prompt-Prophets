"""
AI-Powered Road Condition Intelligence & Maintenance Prioritization System.
Interactive Streamlit Dashboard with:
- Selected Best-Efficiency Model Stack:
  1. Model 1 (Detector): YOLOv8-S (yolov8s.pt)
  2. Model 2 (Severity Classifier): MobileNetV4-Small (mobilenetv4_conv_small.e2400_r224_in1k) via timm
  3. Model 2 Alternative (3D Depth): Depth Anything V2 Small for Pothole Cavity Profiling
- RDD2022 (Road Damage Dataset) Automated Tools, Pascal VOC XML Converter, and Scaffolding
- Interactive Folium GIS Map, Defect Gallery with 3D Depth Visualizer, and Work Order Generator
"""

import os 
import json 
import base64 
import numpy as np 
import pandas as pd 
import streamlit as st 
import folium 
from folium .plugins import MarkerCluster 
from streamlit_folium import st_folium 
import plotly .express as px 
import plotly .graph_objects as go 
import cv2 
from PIL import Image 

from src .pipeline import RoadConditionPipeline 
from src .sample_data import generate_sample_dataset 
from src .detector import DEFECT_COLORS 
from src .severity import SEVERITY_COLORS 
from src .rdd2022_setup import RDD2022DatasetManager ,RDD2022_CLASSES 

st .set_page_config (
page_title ="Road Condition Intelligence & Maintenance System",
page_icon ="🛣️",
layout ="wide",
initial_sidebar_state ="expanded"
)

st .markdown ("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    .main-header {
        background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 24px 32px;
        margin-bottom: 24px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    
    .main-title {
        color: #F8FAFC;
        font-size: 2.1rem;
        font-weight: 700;
        margin: 0;
        letter-spacing: -0.02em;
    }
    
    .main-subtitle {
        color: #94A3B8;
        font-size: 1.02rem;
        margin-top: 6px;
        margin-bottom: 0;
    }
    
    .kpi-card {
        background: #1E293B;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 18px 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s ease;
    }
    .kpi-card:hover {
        transform: translateY(-2px);
    }
    .kpi-label {
        color: #94A3B8;
        font-size: 0.82rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .kpi-value {
        color: #F8FAFC;
        font-size: 1.85rem;
        font-weight: 700;
        margin: 4px 0;
    }
    .kpi-sub {
        color: #64748B;
        font-size: 0.78rem;
    }
    
    .badge-critical {
        background-color: #7F1D1D;
        color: #FECACA;
        padding: 3px 9px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.75rem;
    }
    .badge-high {
        background-color: #7C2D12;
        color: #FFEDD5;
        padding: 3px 9px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.75rem;
    }
    .badge-medium {
        background-color: #78350F;
        color: #FEF3C7;
        padding: 3px 9px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.75rem;
    }
    .badge-low {
        background-color: #064E3B;
        color: #D1FAE5;
        padding: 3px 9px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.75rem;
    }
    
    .defect-card {
        background: #1E293B;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
    }
</style>
""",unsafe_allow_html =True )

def bgr_to_base64 (img_bgr :np .ndarray )->str :
    """Helper to convert OpenCV BGR image to base64 string for HTML embeds."""
    if img_bgr is None or img_bgr .size ==0 :
        return ""
    _ ,buffer =cv2 .imencode ('.jpg',img_bgr )
    return base64 .b64encode (buffer ).decode ('utf-8')

from src .sample_data import generate_sample_dataset ,TAMIL_NADU_CORRIDORS 

USD_TO_INR =83.5 

st .markdown ("""
<div class="main-header">
    <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
            <h1 class="main-title">AI Road Condition Intelligence & Maintenance Prioritization</h1>
            <p class="main-subtitle">Tamil Nadu Highway Inspection System · YOLOv8-S + MobileNetV4 + Depth Anything V2 (IRC:82-2015 Standards)</p>
        </div>
        <div style="text-align: right;">
            <span style="background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 0.85rem;">
                ● Tamil Nadu Network Live
            </span>
        </div>
    </div>
</div>
""",unsafe_allow_html =True )

st .sidebar .markdown ("### 📍 Tamil Nadu Road Corridor")
selected_corridor =st .sidebar .selectbox (
"Select Inspection Corridor",
list (TAMIL_NADU_CORRIDORS .keys ()),
index =0 
)
corridor_meta =TAMIL_NADU_CORRIDORS [selected_corridor ]
st .sidebar .caption (f"🏛️ **Jurisdiction:** {corridor_meta['district']} · **Route:** {corridor_meta['highway']}")

st .sidebar .markdown ("---")
st .sidebar .markdown ("### 🤖 Deep Learning Model Stack")
model1_choice =st .sidebar .selectbox (
"Model 1: Hazard Detector",
["YOLOv8-S (yolov8s.pt - Recommended)","YOLOv8-N (yolov8n.pt - Ultra-light)"],
index =0 
)
weights_file ="yolov8s.pt"if "yolov8s"in model1_choice else "yolov8n.pt"

model2_classifier_label ="MobileNetV4-Small (timm mobilenetv4_conv_small)"
st .sidebar .text_input ("Model 2: Severity Classifier",model2_classifier_label ,disabled =True )

enable_depth =st .sidebar .checkbox (
"Enable Model 2 Alt: Depth Anything V2 (3D Cavity Profiler)",
value =True ,
help ="Generates 3D monocular depth maps, cavity depth (cm) and volume (cm³) for potholes."
)

st .sidebar .markdown ("---")
st .sidebar .markdown ("### 🎛️ Pipeline Parameters")

conf_thresh =st .sidebar .slider ("Detection Confidence Threshold",0.10 ,0.90 ,0.25 ,0.05 )
traffic_factor =st .sidebar .slider ("Traffic Volume Factor (γ Multiplier)",1.0 ,3.0 ,1.6 ,0.1 ,help ="1.0 = Rural/Panchayat, 1.6 = State Highway/OMR, 2.5 = Express Freight NH")
segment_length =st .sidebar .number_input ("Road Segment Length (meters)",min_value =25.0 ,max_value =200.0 ,value =50.0 ,step =25.0 )
gsd_factor =st .sidebar .number_input ("GSD Scale Calibration (cm/pixel)",min_value =0.02 ,max_value =0.50 ,value =0.12 ,step =0.01 )

run_button =st .sidebar .button ("▶ Run Full Tamil Nadu Inspection",type ="primary",use_container_width =True )

@st .cache_resource 
def load_pipeline (weights :str ,conf :float ,seg_len :float ,gsd :float ,traffic :float ,depth :bool )->RoadConditionPipeline :
    return RoadConditionPipeline (
    weights_path =weights ,
    conf_threshold =conf ,
    segment_length_m =seg_len ,
    gsd_cm_per_px =gsd ,
    traffic_factor =traffic ,
    enable_depth_estimation =depth 
    )

if "current_corridor"not in st .session_state :
    st .session_state ["current_corridor"]=selected_corridor 

corridor_changed =st .session_state ["current_corridor"]!=selected_corridor 
if corridor_changed :
    st .session_state ["current_corridor"]=selected_corridor 
    st .session_state ["pipeline_results"]=None 

if "pipeline_results"not in st .session_state :
    st .session_state ["pipeline_results"]=None 

if run_button or st .session_state ["pipeline_results"]is None :
    with st .spinner (f"Executing Multi-Model Deep Learning Inspection on {selected_corridor}..."):
        sample_dir =os .path .join (os .path .dirname (__file__ ),"sample_data")
        frames_dir ,gps_csv =generate_sample_dataset (output_dir =sample_dir ,num_frames =10 ,corridor_key =selected_corridor )

        pipeline =load_pipeline (
        weights =weights_file ,
        conf =conf_thresh ,
        seg_len =segment_length ,
        gsd =gsd_factor ,
        traffic =traffic_factor ,
        depth =enable_depth 
        )

        results =pipeline .process_inspection (
        frames_source =frames_dir ,
        gps_source =gps_csv 
        )
        st .session_state ["pipeline_results"]=results 

results =st .session_state ["pipeline_results"]
defects_df =results ["defects_df"]
segments_df =results ["segments_df"]
geojson_data =results ["geojson"]
annotated_frames =results ["annotated_frames"]
defect_patches =results ["defect_patches"]
kpis =results ["kpis"]

total_cost_inr =kpis ['total_estimated_cost_usd']*USD_TO_INR 

col1 ,col2 ,col3 ,col4 ,col5 =st .columns (5 )

with col1 :
    st .markdown (f"""
    <div class="kpi-card">
        <div class="kpi-label">Corridor Inspected</div>
        <div class="kpi-value">{kpis['total_distance_km']:.2f} <span style="font-size: 1rem; color: #94A3B8;">km</span></div>
        <div class="kpi-sub">{selected_corridor.split('-')[0].strip()} · {kpis['total_segments']} segments</div>
    </div>
    """,unsafe_allow_html =True )

with col2 :
    potholes_count =len (defects_df [defects_df ['defect_type']=='Pothole'])if not defects_df .empty else 0 
    st .markdown (f"""
    <div class="kpi-card">
        <div class="kpi-label">Defects Detected</div>
        <div class="kpi-value">{kpis['total_defects']} <span style="font-size: 1rem; color: #94A3B8;">hazards</span></div>
        <div class="kpi-sub">{potholes_count} potholes ({weights_file})</div>
    </div>
    """,unsafe_allow_html =True )

with col3 :
    sri_color ="#10B981"if kpis ['average_sri']<30 else ("#F59E0B"if kpis ['average_sri']<70 else "#EF4444")
    st .markdown (f"""
    <div class="kpi-card">
        <div class="kpi-label">Average Route SRI</div>
        <div class="kpi-value" style="color: {sri_color};">{kpis['average_sri']} <span style="font-size: 1rem; color: #94A3B8;">/100</span></div>
        <div class="kpi-sub">IRC:82 Rating: {kpis['pavement_health_status']}</div>
    </div>
    """,unsafe_allow_html =True )

with col4 :
    crit_color ="#EF4444"if kpis ['critical_segments']>0 else "#10B981"
    st .markdown (f"""
    <div class="kpi-card">
        <div class="kpi-label">Critical Segments</div>
        <div class="kpi-value" style="color: {crit_color};">{kpis['critical_segments']} <span style="font-size: 1rem; color: #94A3B8;">zones</span></div>
        <div class="kpi-sub">{kpis['moderate_segments']} Moderate · {kpis['good_segments']} Good</div>
    </div>
    """,unsafe_allow_html =True )

with col5 :
    st .markdown (f"""
    <div class="kpi-card">
        <div class="kpi-label">Est. TN PWD Budget</div>
        <div class="kpi-value" style="color: #38BDF8;">₹{total_cost_inr:,.0f}</div>
        <div class="kpi-sub">(${kpis['total_estimated_cost_usd']:,.0f} USD equivalent)</div>
    </div>
    """,unsafe_allow_html =True )

st .markdown ("<br>",unsafe_allow_html =True )

tab1 ,tab2 ,tab3 ,tab4 ,tab5 =st .tabs ([
"🗺️ Interactive GIS Risk Map",
"🔍 Defect Gallery & 3D Depth Inspector",
"📊 Risk & Condition Analytics",
"📋 Maintenance Work Orders & Export",
"📁 Dataset & RDD2022 Tools"
])

with tab1 :
    st .markdown ("### 🗺️ Road Segment Risk Map & Spatial Telemetry")
    st .caption ("50-meter road segments color-coded by Segment Risk Index (SRI): 🟢 Good (0–30) | 🟠 Moderate (30–70) | 🔴 Critical (70–100)")

    map_col ,inspect_col =st .columns ([7 ,3 ])

    with map_col :
        if not segments_df .empty :
            center_lat =segments_df ["start_lat"].mean ()
            center_lon =segments_df ["start_lon"].mean ()
        else :
            center_lat ,center_lon =37.7749 ,-122.4194 

        m =folium .Map (
        location =[center_lat ,center_lon ],
        zoom_start =17 ,
        tiles =None 
        )

        folium .TileLayer (
        tiles ="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attr ="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>",
        name ="Dark Canvas (Modern GIS)",
        subdomains ="abcd",
        max_zoom =20 
        ).add_to (m )

        folium .TileLayer (
        tiles ="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attr ="Esri World Imagery",
        name ="High-Res Satellite View",
        max_zoom =19 
        ).add_to (m )

        folium .TileLayer (
        tiles ="OpenStreetMap",
        name ="Street Map (OSM)"
        ).add_to (m )

        folium .LayerControl (position ="topright").add_to (m )

        for _ ,seg in segments_df .iterrows ():
            band =seg ["condition_band"]
            color ="#10B981"if band =="Good"else ("#F59E0B"if band =="Moderate"else "#EF4444")
            coords =[[pt [1 ],pt [0 ]]for pt in seg ["coordinates_path"]]

            popup_html =f"""
            <div style="font-family: sans-serif; min-width: 180px;">
                <h4 style="margin: 0; color: {color};">{seg['segment_id']} ({band})</h4>
                <p style="margin: 4px 0; font-size: 13px;"><b>Chainage:</b> {seg['start_distance_m']}m - {seg['end_distance_m']}m</p>
                <p style="margin: 4px 0; font-size: 13px;"><b>Segment Risk Index (SRI):</b> {seg['sri']:.1f}/100</p>
                <p style="margin: 4px 0; font-size: 13px;"><b>PCI Equivalent:</b> {seg['pci_equivalent']:.1f}/100</p>
                <p style="margin: 4px 0; font-size: 13px;"><b>Defect Count:</b> {seg['defect_count']}</p>
                <p style="margin: 4px 0; font-size: 13px;"><b>Dominant Defect:</b> {seg['dominant_defect'].replace('_', ' ')}</p>
                <p style="margin: 4px 0; font-size: 13px;"><b>Action:</b> {seg['recommended_action']}</p>
                <p style="margin: 4px 0; font-size: 13px;"><b>Est. Cost:</b> ${seg['estimated_repair_cost']:,.2f}</p>
            </div>
            """

            folium .PolyLine (
            locations =coords ,
            color =color ,
            weight =7 ,
            opacity =0.9 ,
            popup =folium .Popup (popup_html ,max_width =300 ),
            tooltip =f"{seg['segment_id']} | SRI: {seg['sri']:.1f} ({band})"
            ).add_to (m )

        marker_colors ={
        "Pothole":"red",
        "Alligator_Crack":"orange",
        "Transverse_Crack":"lightred",
        "Longitudinal_Crack":"blue",
        "Water_Accumulation":"cadetblue"
        }

        for _ ,d in defects_df .iterrows ():
            d_type =d ["defect_type"]
            m_color =marker_colors .get (d_type ,"gray")

            patch_data =defect_patches .get (d ["defect_id"],{})
            patch_bgr =patch_data .get ("patch_bgr")
            patch_b64 =bgr_to_base64 (patch_bgr )

            img_html =f'<img src="data:image/jpeg;base64,{patch_b64}" style="width: 100%; border-radius: 6px; margin-top: 6px;" />'if patch_b64 else ""

            d_popup =f"""
            <div style="font-family: sans-serif; min-width: 170px;">
                <h4 style="margin: 0; color: #DC2626;">{d['defect_type'].replace('_', ' ')}</h4>
                <p style="margin: 2px 0; font-size: 12px;"><b>Severity:</b> {d['severity_level']} (DRS: {d['drs']:.1f})</p>
                <p style="margin: 2px 0; font-size: 12px;"><b>Est. Area:</b> {d['area_cm2']:.0f} cm²</p>
                <p style="margin: 2px 0; font-size: 12px;"><b>Segment:</b> {d['segment_id']}</p>
                <p style="margin: 2px 0; font-size: 12px;"><b>Action:</b> {d['recommended_action']}</p>
                {img_html}
            </div>
            """

            folium .Marker (
            location =[d ["latitude"],d ["longitude"]],
            popup =folium .Popup (d_popup ,max_width =250 ),
            icon =folium .Icon (color =m_color ,icon ="exclamation-triangle",prefix ="fa"),
            tooltip =f"{d['defect_id']} · {d['defect_type']}"
            ).add_to (m )

        st_folium (m ,use_container_width =True ,height =520 )

    with inspect_col :
        st .markdown ("#### 🔍 Segment Quick Inspector")
        seg_options =segments_df ["segment_id"].tolist ()if not segments_df .empty else []
        selected_seg_id =st .selectbox ("Select Road Segment",seg_options ,index =0 if seg_options else None )

        if selected_seg_id :
            seg_info =segments_df [segments_df ["segment_id"]==selected_seg_id ].iloc [0 ]
            band_class ="badge-critical"if seg_info ["condition_band"]=="Critical"else ("badge-medium"if seg_info ["condition_band"]=="Moderate"else "badge-low")

            st .markdown (f"""
            <div class="defect-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.15rem; font-weight: 700; color: #F8FAFC;">{seg_info['segment_id']}</span>
                    <span class="{band_class}">{seg_info['condition_band']}</span>
                </div>
                <hr style="margin: 10px 0; border-color: rgba(255,255,255,0.1);">
                <p style="margin: 4px 0; font-size: 0.9rem;"><b>Chainage:</b> {seg_info['start_distance_m']}m – {seg_info['end_distance_m']}m</p>
                <p style="margin: 4px 0; font-size: 0.9rem;"><b>Segment Risk Index:</b> <span style="font-size: 1.1rem; font-weight: 700;">{seg_info['sri']:.1f} / 100</span></p>
                <p style="margin: 4px 0; font-size: 0.9rem;"><b>PCI Score:</b> {seg_info['pci_equivalent']:.1f} / 100</p>
                <p style="margin: 4px 0; font-size: 0.9rem;"><b>Total Defects:</b> {seg_info['defect_count']}</p>
                <p style="margin: 4px 0; font-size: 0.9rem;"><b>Dominant Hazard:</b> {seg_info['dominant_defect'].replace('_', ' ')}</p>
                <p style="margin: 4px 0; font-size: 0.9rem;"><b>Est. Repair Cost:</b> <span style="color: #38BDF8; font-weight: 600;">${seg_info['estimated_repair_cost']:,.2f}</span></p>
                <p style="margin: 8px 0 0 0; font-size: 0.85rem; color: #94A3B8;"><b>Strategy:</b> {seg_info['primary_strategy']}</p>
            </div>
            """,unsafe_allow_html =True )

            seg_defects =seg_info ["defects"]
            if seg_defects :
                st .markdown ("##### Defects in this Segment:")
                for sd in seg_defects :
                    st .markdown (f"- **{sd['defect_type'].replace('_', ' ')}** ({sd['severity_level']}) | DRS: `{sd['drs']:.1f}` | Area: `{sd['area_cm2']:.0f} cm²`")
            else :
                st .info ("Pristine road surface. No defects in this segment.")

with tab2 :
    st .markdown ("### 🔍 Defect Card Gallery & Multi-Model Cascade Visualizer")
    st .caption ("Model 1 (YOLOv8-S) $\\to$ Model 2 (MobileNetV4-Small Severity) $\\to$ Model 2 Alt (Depth Anything V2 3D Cavity Profiler)")

    fcol1 ,fcol2 ,fcol3 =st .columns ([3 ,3 ,4 ])
    with fcol1 :
        type_filter =st .selectbox (
        "Filter by Hazard Type",
        ["All Types","Pothole","Transverse_Crack","Longitudinal_Crack","Alligator_Crack","Water_Accumulation"]
        )
    with fcol2 :
        sev_filter =st .selectbox ("Filter by Severity Level",["All Levels","Critical","High","Medium","Low"])
    with fcol3 :
        sort_by =st .selectbox ("Sort Gallery By",["Highest Defect Risk Score (DRS)","Largest Area (cm²)","Deepest Cavity (cm)","Highest Confidence"])

    filtered_df =defects_df .copy ()
    if type_filter !="All Types":
        filtered_df =filtered_df [filtered_df ["defect_type"]==type_filter ]
    if sev_filter !="All Levels":
        filtered_df =filtered_df [filtered_df ["severity_level"]==sev_filter ]

    if sort_by =="Highest Defect Risk Score (DRS)":
        filtered_df =filtered_df .sort_values (by ="drs",ascending =False )
    elif sort_by =="Largest Area (cm²)":
        filtered_df =filtered_df .sort_values (by ="area_cm2",ascending =False )
    elif sort_by =="Deepest Cavity (cm)":
        filtered_df =filtered_df .sort_values (by ="max_depth_cm",ascending =False )
    else :
        filtered_df =filtered_df .sort_values (by ="confidence",ascending =False )

    st .markdown (f"**Showing {len(filtered_df)} of {len(defects_df)} detected hazards:**")

    cols =st .columns (3 )
    for idx ,(_ ,d )in enumerate (filtered_df .iterrows ()):
        col =cols [idx %3 ]
        with col :
            patch_data =defect_patches .get (d ["defect_id"],{})
            patch_bgr =patch_data .get ("patch_bgr")
            mask_bgr =patch_data .get ("mask_bgr")
            depth_bgr =patch_data .get ("depth_colormap_bgr")
            depth_profile =patch_data .get ("depth_profile")

            sev =d ["severity_level"]
            badge_class ="badge-critical"if sev =="Critical"else ("badge-high"if sev =="High"else ("badge-medium"if sev =="Medium"else "badge-low"))

            with st .container ():
                st .markdown (f"""
                <div class="defect-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 700; color: #F8FAFC; font-size: 1rem;">{d['defect_id']} · {d['defect_type'].replace('_', ' ')}</span>
                        <span class="{badge_class}">{sev}</span>
                    </div>
                """,unsafe_allow_html =True )

                if depth_bgr is not None :
                    img_c1 ,img_c2 ,img_c3 =st .columns (3 )
                    with img_c1 :
                        if patch_bgr is not None and patch_bgr .size >0 :
                            st .image (cv2 .cvtColor (patch_bgr ,cv2 .COLOR_BGR2RGB ),caption ="Padded Patch",use_container_width =True )
                    with img_c2 :
                        if mask_bgr is not None and mask_bgr .size >0 :
                            st .image (cv2 .cvtColor (mask_bgr ,cv2 .COLOR_BGR2RGB ),caption ="MobileNet Mask",use_container_width =True )
                    with img_c3 :
                        st .image (cv2 .cvtColor (depth_bgr ,cv2 .COLOR_BGR2RGB ),caption ="3D Depth Map",use_container_width =True )
                else :
                    img_c1 ,img_c2 =st .columns (2 )
                    with img_c1 :
                        if patch_bgr is not None and patch_bgr .size >0 :
                            st .image (cv2 .cvtColor (patch_bgr ,cv2 .COLOR_BGR2RGB ),caption ="10px Padded Crop",use_container_width =True )
                    with img_c2 :
                        if mask_bgr is not None and mask_bgr .size >0 :
                            st .image (cv2 .cvtColor (mask_bgr ,cv2 .COLOR_BGR2RGB ),caption ="Severity Mask",use_container_width =True )

                st .markdown (f"""
                    <div style="font-size: 0.85rem; color: #CBD5E1; margin-top: 6px;">
                        <div><b>Defect Risk Score (DRS):</b> <span style="color: #F59E0B; font-weight: 700;">{d['drs']:.1f}</span></div>
                        <div><b>Est. Area:</b> {d['area_cm2']:.0f} cm² (Span: {d['max_span_cm']:.0f} cm)</div>
                        <div><b>3D Cavity Depth:</b> <span style="color: #38BDF8; font-weight: 600;">{d['max_depth_cm']:.1f} cm</span> (Vol: ~{d['cavity_volume_cm3']:.0f} cm³)</div>
                        <div><b>Confidence:</b> {int(d['confidence']*100)}% ({weights_file})</div>
                        <div><b>Location:</b> Frame #{d['frame_idx']} · {d['segment_id']}</div>
                        <div style="margin-top: 6px; padding: 6px; background: rgba(0,0,0,0.25); border-radius: 6px; border-left: 3px solid #38BDF8;">
                            <span style="color: #38BDF8; font-weight: 600;">Action:</span> {d['recommended_action']}<br>
                            <span style="color: #94A3B8; font-size: 0.78rem;">Est. Unit Cost: ${d['estimated_cost_usd']:.2f}</span>
                        </div>
                    </div>
                </div>
                """,unsafe_allow_html =True )

    st .markdown ("---")
    st .markdown ("#### 🖼️ Full Inspection Frame Inspector (Model 1 YOLOv8-S Bounding Boxes)")
    selected_frame_idx =st .slider ("Select Frame Sequence Number",0 ,len (annotated_frames )-1 ,1 )

    f_img =annotated_frames .get (selected_frame_idx )
    if f_img is not None :
        st .image (cv2 .cvtColor (f_img ,cv2 .COLOR_BGR2RGB ),caption =f"Inspection Frame #{selected_frame_idx} with YOLOv8-S Defect Localization",use_container_width =True )

with tab3 :
    st .markdown ("### 📊 Pavement Health & Risk Progression Analytics")

    st .markdown ("#### 📈 Segment Risk Index (SRI) Along Chainage (0 - 500m)")

    fig_sri =go .Figure ()
    fig_sri .add_hrect (y0 =0 ,y1 =30 ,fillcolor ="rgba(16, 185, 129, 0.12)",line_width =0 ,annotation_text ="Good (0-30)",annotation_position ="top left")
    fig_sri .add_hrect (y0 =30 ,y1 =70 ,fillcolor ="rgba(245, 158, 11, 0.12)",line_width =0 ,annotation_text ="Moderate (30-70)",annotation_position ="top left")
    fig_sri .add_hrect (y0 =70 ,y1 =100 ,fillcolor ="rgba(239, 68, 68, 0.15)",line_width =0 ,annotation_text ="Critical (70-100)",annotation_position ="top left")

    fig_sri .add_trace (go .Scatter (
    x =segments_df ["start_distance_m"],
    y =segments_df ["sri"],
    mode ="lines+markers",
    name ="Segment Risk Index (SRI)",
    line =dict (color ="#38BDF8",width =3.5 ),
    marker =dict (size =10 ,color =segments_df ["sri"],colorscale =[[0 ,"#10B981"],[0.5 ,"#F59E0B"],[1 ,"#EF4444"]],showscale =True ),
    hovertemplate ="<b>%{text}</b><br>Chainage: %{x}m<br>SRI: %{y:.1f}/100<extra></extra>",
    text =segments_df ["segment_id"]
    ))

    fig_sri .update_layout (
    template ="plotly_dark",
    height =380 ,
    margin =dict (l =40 ,r =20 ,t =20 ,b =40 ),
    xaxis_title ="Road Chainage (Meters)",
    yaxis_title ="Segment Risk Index (0–100)",
    yaxis =dict (range =[0 ,105 ])
    )
    st .plotly_chart (fig_sri ,use_container_width =True )

    c1 ,c2 ,c3 =st .columns (3 )

    with c1 :
        st .markdown ("#### 🎯 Defect Type Distribution")
        if not defects_df .empty :
            type_counts =defects_df ["defect_type"].value_counts ().reset_index ()
            type_counts .columns =["Defect Type","Count"]
            type_counts ["Defect Type"]=type_counts ["Defect Type"].str .replace ("_"," ")
            fig_pie =px .pie (
            type_counts ,
            values ="Count",
            names ="Defect Type",
            hole =0.45 ,
            template ="plotly_dark",
            color_discrete_sequence =["#EF4444","#F59E0B","#38BDF8","#EAB308","#06B6D4"]
            )
            fig_pie .update_layout (height =300 ,margin =dict (l =10 ,r =10 ,t =20 ,b =20 ))
            st .plotly_chart (fig_pie ,use_container_width =True )

    with c2 :
        st .markdown ("#### ⚡ Severity Level Breakdown")
        if not defects_df .empty :
            sev_counts =defects_df ["severity_level"].value_counts ().reset_index ()
            sev_counts .columns =["Severity Level","Count"]
            fig_sev =px .bar (
            sev_counts ,
            x ="Severity Level",
            y ="Count",
            color ="Severity Level",
            template ="plotly_dark",
            color_discrete_map ={"Critical":"#7F1D1D","High":"#EF4444","Medium":"#F59E0B","Low":"#10B981"}
            )
            fig_sev .update_layout (height =300 ,margin =dict (l =10 ,r =10 ,t =20 ,b =20 ),showlegend =False )
            st .plotly_chart (fig_sev ,use_container_width =True )

    with c3 :
        st .markdown ("#### 💰 Repair Budget by Hazard Class")
        if not defects_df .empty :
            cost_by_type =defects_df .groupby ("defect_type")["estimated_cost_usd"].sum ().reset_index ()
            cost_by_type .columns =["Hazard","Cost ($)"]
            cost_by_type ["Hazard"]=cost_by_type ["Hazard"].str .replace ("_"," ")
            fig_cost =px .bar (
            cost_by_type ,
            x ="Cost ($)",
            y ="Hazard",
            orientation ="h",
            template ="plotly_dark",
            color ="Cost ($)",
            color_continuous_scale ="Tealgrn"
            )
            fig_cost .update_layout (height =300 ,margin =dict (l =10 ,r =10 ,t =20 ,b =20 ))
            st .plotly_chart (fig_cost ,use_container_width =True )

with tab4 :
    st .markdown ("### 📋 Prioritized Maintenance Work Orders & GIS Exports")
    st .caption ("Auto-generated municipal work orders prioritized by defect risk, condition urgency, and budgetary requirements.")

    exp_col1 ,exp_col2 ,exp_col3 =st .columns (3 )

    with exp_col1 :
        csv_work_orders =segments_df [[
        "segment_id","start_distance_m","end_distance_m","sri","condition_band",
        "defect_count","dominant_defect","recommended_action","urgency","estimated_repair_cost"
        ]].to_csv (index =False ).encode ('utf-8')

        st .download_button (
        label ="📥 Export Work Orders (CSV)",
        data =csv_work_orders ,
        file_name ="maintenance_work_orders.csv",
        mime ="text/csv",
        use_container_width =True 
        )

    with exp_col2 :
        geojson_str =json .dumps (geojson_data ,indent =2 ).encode ('utf-8')
        st .download_button (
        label ="🗺️ Export GIS Layers (GeoJSON)",
        data =geojson_str ,
        file_name ="road_segments_and_defects.geojson",
        mime ="application/json",
        use_container_width =True 
        )

    with exp_col3 :
        csv_defects =defects_df .to_csv (index =False ).encode ('utf-8')
        st .download_button (
        label ="📊 Export Full Defect Log (CSV)",
        data =csv_defects ,
        file_name ="defect_inventory_log.csv",
        mime ="text/csv",
        use_container_width =True 
        )

    st .markdown ("<br>",unsafe_allow_html =True )

    display_segments =segments_df [[
    "segment_id","start_distance_m","end_distance_m","sri","pci_equivalent",
    "condition_band","defect_count","dominant_defect","recommended_action",
    "urgency","estimated_repair_cost"
    ]].copy ()
    display_segments ["estimated_cost_inr"]=display_segments ["estimated_repair_cost"]*USD_TO_INR 

    display_segments .columns =[
    "Segment ID","Start (m)","End (m)","SRI","PCI","Condition Band",
    "Defects","Dominant Defect","Recommended Action","Urgency","Cost ($ USD)","Cost (₹ INR)"
    ]

    st .dataframe (
    display_segments .style .format ({
    "SRI":"{:.1f}",
    "PCI":"{:.1f}",
    "Cost ($ USD)":"${:,.2f}",
    "Cost (₹ INR)":"₹{:,.0f}"
    }),
    use_container_width =True ,
    height =380 
    )

with tab5 :
    st .markdown ("### 📁 RDD2022 (Road Damage Dataset) Tools & Setup")
    st .caption ("Standardized tools for managing, converting Pascal VOC XML annotations, and configuring YOLO training sets for RDD2022.")

    rdd_manager =RDD2022DatasetManager ()

    dcol1 ,dcol2 =st .columns ([1 ,1 ])

    with dcol1 :
        st .markdown ("#### 🛠️ Dataset Operations")
        if st .button ("🏗️ Initialize Directory Structure & rdd2022.yaml"):
            dirs =rdd_manager .setup_directories ()
            yaml_path =rdd_manager .generate_yaml ()
            st .success (f"Initialized directories and created {yaml_path}")

        if st .button ("⚡ Generate Synthetic Sample RDD2022 Benchmark Dataset (12 Samples)"):
            stats =rdd_manager .generate_sample_dataset (num_samples =12 )
            st .success (f"Generated {stats['train_samples']} train and {stats['val_samples']} val images with normalized YOLO bounding boxes!")

        st .markdown ("##### Standard Class Hierarchy:")
        st .code ("""
0: D00 - Longitudinal Crack (Linear crack along travel direction)
1: D10 - Transverse Crack (Linear crack across travel direction)
2: D20 - Alligator Crack (Fatigue / mesh cracking)
3: D40 - Pothole (Cavity / depression)
        """,language ="yaml")

    with dcol2 :
        st .markdown ("#### 📊 Current RDD2022 Dataset Status")
        report =rdd_manager .inspect_dataset ()

        st .json (report )

        if report ["total_images"]>0 :
            dist_df =pd .DataFrame (list (report ["class_distribution"].items ()),columns =["Class","Count"])
            fig_rdd =px .bar (
            dist_df ,
            x ="Class",
            y ="Count",
            title ="RDD2022 Class Distribution",
            template ="plotly_dark",
            color ="Class",
            color_discrete_sequence =["#38BDF8","#F59E0B","#10B981","#EF4444"]
            )
            fig_rdd .update_layout (height =280 ,margin =dict (l =10 ,r =10 ,t =30 ,b =20 ),showlegend =False )
            st .plotly_chart (fig_rdd ,use_container_width =True )

st .sidebar .markdown ("---")
st .sidebar .caption ("AI Road Condition Intelligence System · YOLOv8-S + MobileNetV4 + Depth Anything V2")
