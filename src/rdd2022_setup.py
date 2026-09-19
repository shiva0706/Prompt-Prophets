"""
RDD2022 (Road Damage Dataset) Automated Setup, Parser & Converter Tools.
Features:
- Scaffolds standardized YOLO training directory hierarchy
- Converts Pascal VOC XML annotations (D00, D10, D20, D40) to normalized YOLO txt format
- Generates Ultralytics-compatible dataset configuration (rdd2022.yaml)
- Generates calibrated sample test datasets for offline verification
- Exports dataset statistics and class distribution reports
"""

import os 
import xml .etree .ElementTree as ET 
from pathlib import Path 
from typing import Dict ,List ,Tuple ,Optional ,Any 
import shutil 
import logging 
import json 

logging .basicConfig (level =logging .INFO )
logger =logging .getLogger ("RDD2022Setup")

RDD2022_CLASSES =[
"D00",
"D10",
"D20",
"D40"
]

CLASS_NAME_MAP ={
"D00":"Longitudinal_Crack",
"D10":"Transverse_Crack",
"D20":"Alligator_Crack",
"D40":"Pothole",
"d00":"Longitudinal_Crack",
"d10":"Transverse_Crack",
"d20":"Alligator_Crack",
"d40":"Pothole"
}

CLASS_TO_ID ={cls :idx for idx ,cls in enumerate (RDD2022_CLASSES )}

class RDD2022DatasetManager :
    """
    Manages RDD2022 directory layout, Pascal VOC XML conversion to YOLO format,
    and dataset verification.
    """

    def __init__ (self ,base_dir :str ="dataset/rdd2022"):
        self .base_dir =Path (base_dir ).resolve ()
        self .images_dir =self .base_dir /"images"
        self .labels_dir =self .base_dir /"labels"
        self .yaml_path =self .base_dir /"rdd2022.yaml"

    def setup_directories (self )->Dict [str ,str ]:
        """Create standard YOLO directory structure."""
        dirs =[
        self .images_dir /"train",
        self .images_dir /"val",
        self .labels_dir /"train",
        self .labels_dir /"val"
        ]
        for d in dirs :
            d .mkdir (parents =True ,exist_ok =True )

        logger .info (f"Initialized RDD2022 dataset directories at: {self.base_dir}")
        return {
        "base":str (self .base_dir ),
        "images_train":str (self .images_dir /"train"),
        "images_val":str (self .images_dir /"val"),
        "labels_train":str (self .labels_dir /"train"),
        "labels_val":str (self .labels_dir /"val")
        }

    def convert_voc_xml_to_yolo (
    self ,
    xml_path :str ,
    image_width :Optional [int ]=None ,
    image_height :Optional [int ]=None 
    )->List [str ]:
        """
        Parse a single Pascal VOC XML annotation file and convert bounding boxes
        to normalized YOLO format: <class_id> <x_center> <y_center> <width> <height>
        """
        tree =ET .parse (xml_path )
        root =tree .getroot ()

        if image_width is None or image_height is None :
            size_elem =root .find ("size")
            if size_elem is not None :
                image_width =int (size_elem .find ("width").text )
                image_height =int (size_elem .find ("height").text )
            else :
                image_width =1280 
                image_height =720 

        yolo_lines =[]
        for obj in root .findall ("object"):
            name =obj .find ("name").text .strip ().upper ()
            if name not in CLASS_TO_ID :
                continue 

            class_id =CLASS_TO_ID [name ]
            bndbox =obj .find ("bndbox")
            xmin =float (bndbox .find ("xmin").text )
            ymin =float (bndbox .find ("ymin").text )
            xmax =float (bndbox .find ("xmax").text )
            ymax =float (bndbox .find ("ymax").text )

            x_center =((xmin +xmax )/2.0 )/image_width 
            y_center =((ymin +ymax )/2.0 )/image_height 
            w =(xmax -xmin )/image_width 
            h =(ymax -ymin )/image_height 

            x_center =max (0.0 ,min (1.0 ,x_center ))
            y_center =max (0.0 ,min (1.0 ,y_center ))
            w =max (0.0 ,min (1.0 ,w ))
            h =max (0.0 ,min (1.0 ,h ))

            yolo_lines .append (f"{class_id} {x_center:.6f} {y_center:.6f} {w:.6f} {h:.6f}")

        return yolo_lines 

    def generate_yaml (self )->str :
        """Create standard rdd2022.yaml for Ultralytics YOLO training."""
        self .base_dir .mkdir (parents =True ,exist_ok =True )
        yaml_content =f"""# Ultralytics YOLOv8 Dataset Configuration for RDD2022 (Road Damage Dataset)
path: {self.base_dir.as_posix()} # dataset root dir
train: images/train # train images (relative to 'path')
val: images/val # val images (relative to 'path')

# Classes
names:
  0: Longitudinal_Crack  # D00
  1: Transverse_Crack    # D10
  2: Alligator_Crack     # D20
  3: Pothole             # D40
"""
        with open (self .yaml_path ,"w",encoding ="utf-8")as f :
            f .write (yaml_content )

        logger .info (f"Generated RDD2022 YAML configuration at: {self.yaml_path}")
        return str (self .yaml_path )

    def generate_sample_dataset (self ,num_samples :int =10 )->Dict [str ,Any ]:
        """
        Generate synthetic sample images and annotations in RDD2022 directory
        for immediate offline testing and pipeline verification.
        """
        import numpy as np 
        import cv2 

        self .setup_directories ()
        self .generate_yaml ()

        stats ={"train_samples":0 ,"val_samples":0 ,"classes":{c :0 for c in RDD2022_CLASSES }}

        for i in range (num_samples ):
            split ="train"if i <int (num_samples *0.8 )else "val"
            img_filename =f"India_{i:04d}.jpg"
            txt_filename =f"India_{i:04d}.txt"

            img_path =self .images_dir /split /img_filename 
            txt_path =self .labels_dir /split /txt_filename 

            img =np .full ((720 ,1280 ,3 ),(70 ,70 ,70 ),dtype =np .uint8 )

            noise =np .random .randint (-15 ,15 ,(720 ,1280 ,3 ),dtype =np .int16 )
            img =np .clip (img .astype (np .int16 )+noise ,0 ,255 ).astype (np .uint8 )

            cls_idx =i %4 
            cls_name =RDD2022_CLASSES [cls_idx ]
            stats ["classes"][cls_name ]+=1 

            cx =0.3 +(i %5 )*0.1 
            cy =0.5 +(i %3 )*0.1 
            bw ,bh =0.15 ,0.12 

            px =int (cx *1280 )
            py =int (cy *720 )
            pbw =int (bw *1280 )
            pbh =int (bh *720 )

            if cls_name =="D40":
                cv2 .ellipse (img ,(px ,py ),(pbw //2 ,pbh //2 ),0 ,0 ,360 ,(25 ,25 ,25 ),-1 )
            elif cls_name =="D00":
                cv2 .line (img ,(px ,py -pbh //2 ),(px +10 ,py +pbh //2 ),(20 ,20 ,20 ),4 )
            elif cls_name =="D10":
                cv2 .line (img ,(px -pbw //2 ,py ),(px +pbw //2 ,py +5 ),(20 ,20 ,20 ),4 )
            else :
                for offset in range (-pbw //2 ,pbw //2 ,20 ):
                    cv2 .line (img ,(px +offset ,py -pbh //2 ),(px +offset +15 ,py +pbh //2 ),(25 ,25 ,25 ),2 )
                    cv2 .line (img ,(px -pbw //2 ,py +offset ),(px +pbw //2 ,py +offset +15 ),(25 ,25 ,25 ),2 )

            cv2 .imwrite (str (img_path ),img )

            with open (txt_path ,"w")as f :
                f .write (f"{cls_idx} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}\n")

            if split =="train":
                stats ["train_samples"]+=1 
            else :
                stats ["val_samples"]+=1 

        logger .info (f"Generated sample RDD2022 dataset: {stats}")
        return stats 

    def inspect_dataset (self )->Dict [str ,Any ]:
        """Compute dataset summary and class balance report."""
        train_imgs =list ((self .images_dir /"train").glob ("*.jpg"))+list ((self .images_dir /"train").glob ("*.png"))
        val_imgs =list ((self .images_dir /"val").glob ("*.jpg"))+list ((self .images_dir /"val").glob ("*.png"))

        train_labels =list ((self .labels_dir /"train").glob ("*.txt"))
        val_labels =list ((self .labels_dir /"val").glob ("*.txt"))

        class_counts ={c :0 for c in RDD2022_CLASSES }

        for lbl_file in train_labels +val_labels :
            with open (lbl_file ,"r")as f :
                for line in f :
                    parts =line .strip ().split ()
                    if parts :
                        cid =int (parts [0 ])
                        if 0 <=cid <len (RDD2022_CLASSES ):
                            class_counts [RDD2022_CLASSES [cid ]]+=1 

        return {
        "total_images":len (train_imgs )+len (val_imgs ),
        "train_images":len (train_imgs ),
        "val_images":len (val_imgs ),
        "train_labels":len (train_labels ),
        "val_labels":len (val_labels ),
        "yaml_exists":self .yaml_path .exists (),
        "class_distribution":class_counts 
        }

if __name__ =="__main__":
    manager =RDD2022DatasetManager ()
    manager .generate_sample_dataset (num_samples =12 )
    report =manager .inspect_dataset ()
    print (json .dumps (report ,indent =2 ))
