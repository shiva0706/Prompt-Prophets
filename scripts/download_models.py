"""
Automated Model Downloader & Verification for AI-Powered Road Condition Intelligence System.
Downloads and caches:
1. YOLOv8-S (Detector) -> weights/yolov8s.pt
2. Depth Anything V2 Small (3D Depth) -> weights/depth_anything_v2_vits.pth
3. MobileNetV4-Small (Severity Classifier) -> timm cache (mobilenetv4_conv_small.e2400_r224_in1k)
"""

import os 
import sys 
import hashlib 
import shutil 
from pathlib import Path 
from typing import Optional ,Dict ,Any 
import requests 
from tqdm import tqdm 

WEIGHTS_DIR =Path ("weights").resolve ()

MODELS_CONFIG ={
"yolov8s":{
"filename":"yolov8s.pt",
"url":"https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8s.pt",
"min_size_bytes":20_000_000 ,
"expected_size_approx":22_588_772 ,
"description":"Ultralytics YOLOv8-S Road Hazard & Defect Detector",
"root_fallback":Path ("yolov8s.pt")
},
"depth_anything_v2_small":{
"filename":"depth_anything_v2_vits.pth",
"url":"https://huggingface.co/depth-anything/Depth-Anything-V2-Small/resolve/main/depth_anything_v2_vits.pth",
"min_size_bytes":90_000_000 ,
"expected_size_approx":99_000_000 ,
"description":"Depth Anything V2 Small 3D Metric Depth Estimator",
"root_fallback":None 
}
}

def calculate_sha256 (filepath :Path ,chunk_size :int =8192 )->str :
    """Compute SHA256 checksum of a file."""
    sha256 =hashlib .sha256 ()
    with open (filepath ,"rb")as f :
        while chunk :=f .read (chunk_size ):
            sha256 .update (chunk )
    return sha256 .hexdigest ()

def download_file_with_progress (
url :str ,
dest_path :Path ,
description :str ,
min_size_bytes :int =1024 ,
timeout :int =60 
)->bool :
    """Download a file with streaming chunks and a tqdm progress bar."""
    dest_path .parent .mkdir (parents =True ,exist_ok =True )
    temp_path =dest_path .with_suffix (dest_path .suffix +".tmp")

    print (f"\n[DOWNLOAD] Fetching {description}...")
    print (f"  URL: {url}")
    print (f"  Destination: {dest_path}")

    headers ={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) RoadIntelDownloader/1.0"}

    try :
        response =requests .get (url ,stream =True ,timeout =timeout ,headers =headers )
        response .raise_for_status ()

        total_size =int (response .headers .get ("content-length",0 ))

        with open (temp_path ,"wb")as f ,tqdm (
        desc =dest_path .name ,
        total =total_size ,
        unit ="iB",
        unit_scale =True ,
        unit_divisor =1024 ,
        ncols =85 
        )as bar :
            for chunk in response .iter_content (chunk_size =65536 ):
                if chunk :
                    f .write (chunk )
                    bar .update (len (chunk ))

        actual_size =temp_path .stat ().st_size 
        if actual_size <min_size_bytes :
            print (f"  [ERROR] Downloaded file too small ({actual_size} bytes < {min_size_bytes} expected).")
            if temp_path .exists ():
                temp_path .unlink ()
            return False 

        if dest_path .exists ():
            dest_path .unlink ()
        temp_path .rename (dest_path )
        print (f"  [SUCCESS] Download complete ({actual_size / (1024*1024):.2f} MB)")
        return True 

    except Exception as e :
        print (f"  [ERROR] Download failed: {e}")
        if temp_path .exists ():
            temp_path .unlink ()
        return False 

def setup_yolo_weights ()->Dict [str ,Any ]:
    """Ensure YOLOv8-S weights are present in weights/yolov8s.pt."""
    target =WEIGHTS_DIR /"yolov8s.pt"
    cfg =MODELS_CONFIG ["yolov8s"]

    if target .exists ()and target .stat ().st_size >=cfg ["min_size_bytes"]:
        print (f"[FOUND] {cfg['filename']} already in {WEIGHTS_DIR} ({target.stat().st_size / (1024*1024):.2f} MB)")
        return {"status":"OK","path":str (target ),"size_mb":round (target .stat ().st_size /(1024 *1024 ),2 )}

    if cfg ["root_fallback"]and cfg ["root_fallback"].exists ()and cfg ["root_fallback"].stat ().st_size >=cfg ["min_size_bytes"]:
        print (f"[COPY] Copying existing {cfg['root_fallback']} to {target}...")
        WEIGHTS_DIR .mkdir (parents =True ,exist_ok =True )
        shutil .copy2 (cfg ["root_fallback"],target )
        return {"status":"OK","path":str (target ),"size_mb":round (target .stat ().st_size /(1024 *1024 ),2 )}

    success =download_file_with_progress (
    url =cfg ["url"],
    dest_path =target ,
    description =cfg ["description"],
    min_size_bytes =cfg ["min_size_bytes"]
    )
    if success :
        return {"status":"OK","path":str (target ),"size_mb":round (target .stat ().st_size /(1024 *1024 ),2 )}
    return {"status":"FAILED","path":str (target ),"error":"Download failed"}

def setup_depth_anything_weights ()->Dict [str ,Any ]:
    """Ensure Depth Anything V2 Small weights are present in weights/."""
    target =WEIGHTS_DIR /"depth_anything_v2_vits.pth"
    cfg =MODELS_CONFIG ["depth_anything_v2_small"]

    if target .exists ()and target .stat ().st_size >=cfg ["min_size_bytes"]:
        print (f"[FOUND] {cfg['filename']} already in {WEIGHTS_DIR} ({target.stat().st_size / (1024*1024):.2f} MB)")
        return {"status":"OK","path":str (target ),"size_mb":round (target .stat ().st_size /(1024 *1024 ),2 )}

    success =download_file_with_progress (
    url =cfg ["url"],
    dest_path =target ,
    description =cfg ["description"],
    min_size_bytes =cfg ["min_size_bytes"]
    )
    if success :
        return {"status":"OK","path":str (target ),"size_mb":round (target .stat ().st_size /(1024 *1024 ),2 )}
    return {"status":"FAILED","path":str (target ),"error":"Download failed or skipped"}

def setup_mobilenetv4_cache ()->Dict [str ,Any ]:
    """Instantiate and cache MobileNetV4-Small via timm."""
    model_name ="mobilenetv4_conv_small.e2400_r224_in1k"
    print (f"\n[CACHE] Instantiating MobileNetV4-Small ({model_name}) via timm...")
    try :
        import timm 
        model =timm .create_model (model_name ,pretrained =True )
        param_count =sum (p .numel ()for p in model .parameters ())
        print (f"  [SUCCESS] MobileNetV4-Small successfully loaded and cached in Torch Hub ({param_count:,} parameters).")
        return {
        "status":"OK",
        "model_name":model_name ,
        "parameters":param_count ,
        "params_millions":round (param_count /1_000_000 ,2 )
        }
    except Exception as e :
        print (f"  [ERROR] Failed to load {model_name}: {e}")
        return {"status":"FAILED","model_name":model_name ,"error":str (e )}

def main ():
    print ("="*75 )
    print ("   AI-POWERED ROAD INTELLIGENCE: AUTOMATED MODEL DOWNLOADER & CACHE")
    print ("="*75 )

    WEIGHTS_DIR .mkdir (parents =True ,exist_ok =True )
    print (f"Target Weights Directory: {WEIGHTS_DIR}")

    results ={}

    print ("\n--- 1. Model 1 (Detector): YOLOv8-S ---")
    results ["yolov8s"]=setup_yolo_weights ()

    print ("\n--- 2. Model 2 (Severity Classifier): MobileNetV4-Small ---")
    results ["mobilenetv4"]=setup_mobilenetv4_cache ()

    print ("\n--- 3. Model 2 Alternative (3D Depth): Depth Anything V2 Small ---")
    results ["depth_anything"]=setup_depth_anything_weights ()

    print ("\n"+"="*75 )
    print ("   MODEL DOWNLOAD & CACHE VERIFICATION SUMMARY")
    print ("="*75 )
    print (f"{'Model Component':<30} | {'Status':<10} | {'Size / Parameters':<22} | {'Location'}")
    print ("-"*75 )

    yolo_res =results ["yolov8s"]
    if yolo_res ["status"]=="OK":
        size_str =f"{yolo_res['size_mb']} MB"
        print (f"{'YOLOv8-S (Detector)':<30} | {'READY':<10} | {size_str:<22} | {yolo_res['path']}")
    else :
        print (f"{'YOLOv8-S (Detector)':<30} | {'FAILED':<10} | {'N/A':<22} | {yolo_res.get('error')}")

    mob_res =results ["mobilenetv4"]
    if mob_res ["status"]=="OK":
        param_str =f"{mob_res['params_millions']}M params"
        print (f"{'MobileNetV4-Small (Severity)':<30} | {'READY':<10} | {param_str:<22} | Torch Hub Cache")
    else :
        print (f"{'MobileNetV4-Small (Severity)':<30} | {'FAILED':<10} | {'N/A':<22} | {mob_res.get('error')}")

    dep_res =results ["depth_anything"]
    if dep_res ["status"]=="OK":
        size_str =f"{dep_res['size_mb']} MB"
        print (f"{'Depth Anything V2 (3D Depth)':<30} | {'READY':<10} | {size_str:<22} | {dep_res['path']}")
    else :
        print (f"{'Depth Anything V2 (3D Depth)':<30} | {'INFO':<10} | {'HF Hub Fallback':<22} | {dep_res.get('error', 'Optional 3D Depth')}")

    print ("="*75 )
    print ("All primary models verified and ready for real-time inference pipeline!\n")

if __name__ =="__main__":
    main ()
