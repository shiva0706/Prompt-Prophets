"""
Synthetic Sample Data Generator calibrated for Tamil Nadu, India Road Corridors.
Generates realistic road inspection frames featuring diverse asphalt distresses
(Potholes, Transverse/Longitudinal/Alligator Cracks, Water Ponding) and synchronized GPS trajectory logs.
Calibrated strictly along actual street centerlines.
"""

import os 
import math 
import random 
import numpy as np 
import cv2 
import pandas as pd 
from typing import List ,Tuple ,Dict ,Optional 

TAMIL_NADU_CORRIDORS ={
"Chennai - OMR (Rajiv Gandhi Salai Expressway)":{
"start_lat":12.988600 ,
"start_lon":80.247950 ,
"heading_deg":182.5 ,
"district":"Chennai / Kanchipuram",
"highway":"SH-49A / OMR 6-Lane Expressway"
},
"Chennai - Taramani Road (Ascendas IT Park Corridor)":{
"start_lat":12.986850 ,
"start_lon":80.246350 ,
"heading_deg":180.0 ,
"district":"Chennai",
"highway":"Taramani Link Road"
},
"Chennai - GST Road (Grand Southern Trunk / NH-32)":{
"start_lat":12.984500 ,
"start_lon":80.171200 ,
"heading_deg":218.0 ,
"district":"Chennai / Chengalpattu",
"highway":"NH-32 (GST Road)"
},
"Chennai - East Coast Road (ECR Coastal Highway)":{
"start_lat":12.915000 ,
"start_lon":80.258200 ,
"heading_deg":180.5 ,
"district":"Chennai",
"highway":"SH-49 (ECR)"
},
"Coimbatore - Avinashi Road (Airport Corridor)":{
"start_lat":11.034500 ,
"start_lon":77.026000 ,
"heading_deg":248.0 ,
"district":"Coimbatore",
"highway":"NH-544 / Avinashi Road"
},
"Madurai - Ring Road / Bypass Expressway":{
"start_lat":9.932000 ,
"start_lon":78.145000 ,
"heading_deg":175.0 ,
"district":"Madurai",
"highway":"Madurai Ring Road"
}
}

def generate_asphalt_texture (width :int =640 ,height :int =480 )->np .ndarray :
    """Generate a realistic asphalt road surface with gravel flecks and lane markings."""
    base_color =np .random .randint (65 ,80 )
    asphalt =np .ones ((height ,width ,3 ),dtype =np .uint8 )*base_color 

    noise =np .random .normal (0 ,14 ,(height ,width ,3 )).astype (np .int16 )
    asphalt =np .clip (asphalt .astype (np .int16 )+noise ,0 ,255 ).astype (np .uint8 )

    specks =np .random .rand (height ,width )
    asphalt [specks >0.985 ]=np .random .randint (140 ,190 ,size =3 )
    asphalt [specks <0.015 ]=np .random .randint (20 ,45 ,size =3 )

    lane_x =int (width *0.12 )
    cv2 .line (asphalt ,(lane_x ,0 ),(lane_x ,height ),(255 ,255 ,255 ),4 ,lineType =cv2 .LINE_AA )

    r_lane_x =int (width *0.88 )
    cv2 .line (asphalt ,(r_lane_x ,0 ),(r_lane_x ,height ),(0 ,220 ,255 ),4 ,lineType =cv2 .LINE_AA )

    return asphalt 

def draw_synthetic_pothole (
img :np .ndarray ,
center :Tuple [int ,int ],
radius_x :int ,
radius_y :int ,
severity :str ="High"
)->Tuple [int ,int ,int ,int ]:
    """Draw an irregular dark cavity with shadow depth and fractured edges."""
    cx ,cy =center 
    num_pts =24 
    pts =[]

    for i in range (num_pts ):
        angle =(2 *math .pi /num_pts )*i 
        r_jitter =random .uniform (0.75 ,1.25 )
        px =int (cx +(radius_x *r_jitter )*math .cos (angle ))
        py =int (cy +(radius_y *r_jitter )*math .sin (angle ))
        pts .append ([px ,py ])

    pts =np .array ([pts ],dtype =np .int32 )
    cv2 .fillPoly (img ,pts ,(30 ,28 ,26 ))

    inner_pts =[]
    for i in range (num_pts ):
        angle =(2 *math .pi /num_pts )*i 
        r_jitter =random .uniform (0.4 ,0.7 )
        px =int (cx +(radius_x *r_jitter )*math .cos (angle ))
        py =int (cy +(radius_y *r_jitter )*math .sin (angle ))
        inner_pts .append ([px ,py ])
    inner_pts =np .array ([inner_pts ],dtype =np .int32 )
    cv2 .fillPoly (img ,inner_pts ,(12 ,10 ,10 ))

    for _ in range (25 ):
        gx =int (cx +random .uniform (-radius_x *1.3 ,radius_x *1.3 ))
        gy =int (cy +random .uniform (-radius_y *1.3 ,radius_y *1.3 ))
        if 0 <=gx <img .shape [1 ]and 0 <=gy <img .shape [0 ]:
            cv2 .circle (img ,(gx ,gy ),random .randint (1 ,3 ),(170 ,165 ,160 ),-1 )

    x ,y ,w ,h =cv2 .boundingRect (pts )
    return (x ,y ,x +w ,y +h )

def draw_synthetic_transverse_crack (
img :np .ndarray ,
start_pt :Tuple [int ,int ],
length :int ,
thickness :int =3 
)->Tuple [int ,int ,int ,int ]:
    """Draw a horizontal jagged fracture across road lanes."""
    sx ,sy =start_pt 
    curr_x ,curr_y =sx ,sy 
    pts =[(curr_x ,curr_y )]

    segments =length //15 
    for _ in range (segments ):
        curr_x +=random .randint (10 ,20 )
        curr_y +=random .randint (-4 ,4 )
        pts .append ((curr_x ,curr_y ))

    for i in range (len (pts )-1 ):
        cv2 .line (img ,pts [i ],pts [i +1 ],(18 ,16 ,15 ),thickness ,lineType =cv2 .LINE_AA )
        if random .random ()<0.35 :
            branch_end =(pts [i ][0 ]+random .randint (-5 ,5 ),pts [i ][1 ]+random .randint (12 ,25 ))
            cv2 .line (img ,pts [i ],branch_end ,(22 ,20 ,18 ),max (1 ,thickness -1 ),lineType =cv2 .LINE_AA )

    pts_arr =np .array (pts )
    min_x ,min_y =np .min (pts_arr ,axis =0 )
    max_x ,max_y =np .max (pts_arr ,axis =0 )
    return (int (min_x ),int (min_y -5 ),int (max_x ),int (max_y +5 ))

def draw_synthetic_longitudinal_crack (
img :np .ndarray ,
start_pt :Tuple [int ,int ],
length :int ,
thickness :int =3 
)->Tuple [int ,int ,int ,int ]:
    """Draw a vertical linear crack running parallel to traffic flow."""
    sx ,sy =start_pt 
    curr_x ,curr_y =sx ,sy 
    pts =[(curr_x ,curr_y )]

    segments =length //15 
    for _ in range (segments ):
        curr_x +=random .randint (-3 ,3 )
        curr_y +=random .randint (12 ,20 )
        pts .append ((curr_x ,curr_y ))

    for i in range (len (pts )-1 ):
        cv2 .line (img ,pts [i ],pts [i +1 ],(18 ,16 ,15 ),thickness ,lineType =cv2 .LINE_AA )
        if random .random ()<0.30 :
            branch_end =(pts [i ][0 ]+random .randint (10 ,20 ),pts [i ][1 ]+random .randint (-3 ,3 ))
            cv2 .line (img ,pts [i ],branch_end ,(22 ,20 ,18 ),max (1 ,thickness -1 ),lineType =cv2 .LINE_AA )

    pts_arr =np .array (pts )
    min_x ,min_y =np .min (pts_arr ,axis =0 )
    max_x ,max_y =np .max (pts_arr ,axis =0 )
    return (int (min_x -5 ),int (min_y ),int (max_x +5 ),int (max_y ))

def draw_synthetic_alligator_crack (
img :np .ndarray ,
top_left :Tuple [int ,int ],
width :int ,
height :int 
)->Tuple [int ,int ,int ,int ]:
    """Draw interconnected polygonal fatigue cracks resembling crocodile/alligator skin."""
    x0 ,y0 =top_left 
    num_cells_x =width //30 
    num_cells_y =height //30 

    grid ={}
    for i in range (num_cells_x +1 ):
        for j in range (num_cells_y +1 ):
            jx =x0 +i *30 +random .randint (-7 ,7 )
            jy =y0 +j *30 +random .randint (-7 ,7 )
            grid [(i ,j )]=(jx ,jy )

    for i in range (num_cells_x ):
        for j in range (num_cells_y ):
            p1 =grid [(i ,j )]
            p2 =grid [(i +1 ,j )]
            p3 =grid [(i +1 ,j +1 )]
            p4 =grid [(i ,j +1 )]

            cv2 .line (img ,p1 ,p2 ,(20 ,18 ,16 ),2 ,lineType =cv2 .LINE_AA )
            cv2 .line (img ,p2 ,p3 ,(20 ,18 ,16 ),2 ,lineType =cv2 .LINE_AA )
            cv2 .line (img ,p3 ,p4 ,(20 ,18 ,16 ),2 ,lineType =cv2 .LINE_AA )
            cv2 .line (img ,p4 ,p1 ,(20 ,18 ,16 ),2 ,lineType =cv2 .LINE_AA )

            if random .random ()<0.5 :
                cv2 .line (img ,p1 ,p3 ,(22 ,20 ,18 ),1 ,lineType =cv2 .LINE_AA )

    return (x0 -5 ,y0 -5 ,x0 +width +5 ,y0 +height +5 )

def draw_synthetic_water_puddle (
img :np .ndarray ,
center :Tuple [int ,int ],
radius_x :int ,
radius_y :int 
)->Tuple [int ,int ,int ,int ]:
    """Draw a smooth water puddle with sky reflection and dark wet border."""
    cx ,cy =center 
    overlay =img .copy ()

    cv2 .ellipse (overlay ,(cx ,cy ),(radius_x +8 ,radius_y +6 ),15 ,0 ,360 ,(25 ,25 ,25 ),-1 )
    cv2 .addWeighted (overlay ,0.4 ,img ,0.6 ,0 ,img )

    img_float =img .astype (np .float32 )
    mask =np .zeros ((img .shape [0 ],img .shape [1 ]),dtype =np .uint8 )
    cv2 .ellipse (mask ,(cx ,cy ),(radius_x ,radius_y ),15 ,0 ,360 ,255 ,-1 )

    puddle_pixels =mask >0 
    img_float [puddle_pixels ,0 ]=img_float [puddle_pixels ,0 ]*0.7 +70 
    img_float [puddle_pixels ,1 ]=img_float [puddle_pixels ,1 ]*0.7 +55 
    img_float [puddle_pixels ,2 ]=img_float [puddle_pixels ,2 ]*0.7 +45 

    shine_x =int (cx -radius_x *0.3 )
    shine_y =int (cy -radius_y *0.2 )
    cv2 .ellipse (img_float ,(shine_x ,shine_y ),(int (radius_x *0.4 ),int (radius_y *0.15 )),25 ,0 ,360 ,(220 ,230 ,240 ),-1 )

    np .copyto (img ,np .clip (img_float ,0 ,255 ).astype (np .uint8 ))

    return (max (0 ,cx -radius_x -5 ),max (0 ,cy -radius_y -5 ),
    min (img .shape [1 ],cx +radius_x +5 ),min (img .shape [0 ],cy +radius_y +5 ))

def generate_sample_dataset (
output_dir :str ="sample_data",
num_frames :int =10 ,
corridor_key :Optional [str ]=None 
)->Tuple [str ,str ]:
    """
    Generate realistic road dataset positioned straight along the selected street centerline in Tamil Nadu.
    """
    frames_dir =os .path .join (output_dir ,"frames")
    os .makedirs (frames_dir ,exist_ok =True )

    if not corridor_key or corridor_key not in TAMIL_NADU_CORRIDORS :
        corridor_key ="Chennai - OMR (Rajiv Gandhi Salai Expressway)"

    corridor =TAMIL_NADU_CORRIDORS [corridor_key ]
    start_lat =corridor ["start_lat"]
    start_lon =corridor ["start_lon"]
    heading_deg =corridor ["heading_deg"]
    heading_rad =math .radians (heading_deg )

    start_time =1718000000.0 
    gps_rows =[]

    frame_plans =[
    {"name":"frame_000.jpg","defects":[]},
    {"name":"frame_001.jpg","defects":[("pothole",(310 ,290 ),55 ,42 ,"Critical"),("transverse",(180 ,410 ),160 ,2 )]},
    {"name":"frame_002.jpg","defects":[("longitudinal",(240 ,160 ),220 ,3 )]},
    {"name":"frame_003.jpg","defects":[("water",(360 ,300 ),80 ,50 ),("pothole",(190 ,250 ),30 ,25 ,"Medium")]},
    {"name":"frame_004.jpg","defects":[("alligator",(200 ,210 ),160 ,130 )]},
    {"name":"frame_005.jpg","defects":[]},
    {"name":"frame_006.jpg","defects":[("transverse",(140 ,270 ),290 ,4 )]},
    {"name":"frame_007.jpg","defects":[("pothole",(260 ,240 ),45 ,38 ,"High"),("pothole",(410 ,320 ),40 ,32 ,"High")]},
    {"name":"frame_008.jpg","defects":[("alligator",(260 ,220 ),140 ,110 ),("water",(420 ,330 ),65 ,45 )]},
    {"name":"frame_009.jpg","defects":[("pothole",(330 ,280 ),42 ,35 ,"Medium"),("longitudinal",(170 ,190 ),190 ,3 )]}
    ]

    for idx ,plan in enumerate (frame_plans [:num_frames ]):
        frame_img =generate_asphalt_texture (640 ,480 )

        for defect in plan ["defects"]:
            dtype =defect [0 ]
            if dtype =="pothole":
                draw_synthetic_pothole (frame_img ,defect [1 ],defect [2 ],defect [3 ],defect [4 ])
            elif dtype =="transverse":
                draw_synthetic_transverse_crack (frame_img ,defect [1 ],defect [2 ],defect [3 ])
            elif dtype =="longitudinal":
                draw_synthetic_longitudinal_crack (frame_img ,defect [1 ],defect [2 ],defect [3 ])
            elif dtype =="alligator":
                draw_synthetic_alligator_crack (frame_img ,defect [1 ],defect [2 ],defect [3 ])
            elif dtype =="water":
                draw_synthetic_water_puddle (frame_img ,defect [1 ],defect [2 ],defect [3 ])

        frame_path =os .path .join (frames_dir ,plan ["name"])
        cv2 .imwrite (frame_path ,frame_img )

        progress_m =idx *50.0 
        d_lat =(progress_m *math .cos (heading_rad ))/111000.0 
        d_lon =(progress_m *math .sin (heading_rad ))/(111000.0 *math .cos (math .radians (start_lat )))
        lat =start_lat +d_lat 
        lon =start_lon +d_lon 

        timestamp =start_time +(idx *3.6 )
        speed_kmh =45.0 +random .uniform (-2.0 ,2.0 )
        altitude_m =12.0 +(idx *0.1 )

        gps_rows .append ({
        "frame_idx":idx ,
        "frame_file":plan ["name"],
        "timestamp":timestamp ,
        "latitude":round (lat ,6 ),
        "longitude":round (lon ,6 ),
        "altitude":round (altitude_m ,1 ),
        "speed_kmh":round (speed_kmh ,1 ),
        "cum_dist_m":progress_m ,
        "state":"Tamil Nadu",
        "corridor":corridor_key 
        })

    gps_csv_path =os .path .join (output_dir ,"gps_route.csv")
    pd .DataFrame (gps_rows ).to_csv (gps_csv_path ,index =False )

    return frames_dir ,gps_csv_path 
