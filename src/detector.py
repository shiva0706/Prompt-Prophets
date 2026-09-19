"""
Model 1: Road Defect Detector using YOLOv8 Architecture (YOLOv8-S / YOLOv8-N).
Detects: Potholes, Transverse Cracks, Longitudinal Cracks, Alligator Cracks, and Water Accumulations.
Fully supports standard RDD2022 (Road Damage Dataset) class conventions:
- D00: Longitudinal Crack
- D10: Transverse Crack
- D20: Alligator Crack
- D40: Pothole
"""

from dataclasses import dataclass ,asdict 
from typing import List ,Optional ,Tuple ,Union ,Dict ,Any 
import numpy as np 
import cv2 
from PIL import Image 
import os 
import logging 

logging .basicConfig (level =logging .INFO )
logger =logging .getLogger ("RoadDefectDetector")

ROAD_DEFECT_CLASSES =[
"Pothole",
"Transverse_Crack",
"Longitudinal_Crack",
"Alligator_Crack",
"Water_Accumulation"
]

RDD2022_MAPPING ={
"d00":"Longitudinal_Crack",
"d10":"Transverse_Crack",
"d20":"Alligator_Crack",
"d40":"Pothole",
"longitudinal":"Longitudinal_Crack",
"transverse":"Transverse_Crack",
"alligator":"Alligator_Crack",
"pothole":"Pothole",
"puddle":"Water_Accumulation",
"water":"Water_Accumulation"
}

DEFECT_COLORS ={
"Pothole":(0 ,0 ,230 ),
"Alligator_Crack":(0 ,100 ,255 ),
"Transverse_Crack":(0 ,215 ,255 ),
"Longitudinal_Crack":(255 ,170 ,0 ),
"Water_Accumulation":(230 ,120 ,0 )
}

@dataclass 
class Detection :
    """Structure representing a detected road hazard."""
    defect_type :str 
    confidence :float 
    bbox :Tuple [int ,int ,int ,int ]
    bbox_norm :Tuple [float ,float ,float ,float ]
    frame_idx :Optional [int ]=None 
    timestamp :Optional [float ]=None 

    def to_dict (self )->Dict [str ,Any ]:
        return asdict (self )

class RoadDefectDetector :
    """
    Model 1: Wraps Ultralytics YOLOv8-S / YOLOv8-N with custom RDD2022 defect class filtering
    and intelligent CV heuristic fallback.
    """

    def __init__ (
    self ,
    weights_path :str ="yolov8s.pt",
    conf_threshold :float =0.25 ,
    iou_threshold :float =0.45 ,
    device :str ="cpu",
    use_fallback_if_coco :bool =True 
    ):
        """
        Initialize the YOLO defect detector.
        
        Args:
            weights_path: Path to YOLO weights or model name (default: 'yolov8s.pt').
            conf_threshold: Minimum detection confidence threshold.
            iou_threshold: Intersection-Over-Union threshold for NMS.
            device: 'cpu', 'cuda', or 'mps'.
            use_fallback_if_coco: If standard COCO weights are loaded without road defect classes,
                                  enable intelligent CV heuristic to identify synthetic/real road defects.
        """
        self .weights_path =weights_path 
        self .conf_threshold =conf_threshold 
        self .iou_threshold =iou_threshold 
        self .device =device 
        self .use_fallback_if_coco =use_fallback_if_coco 
        self .model =None 
        self .is_custom_defect_model =False 

        self ._load_model ()

    def _load_model (self ):
        """Load YOLO model via Ultralytics if available."""
        try :
            from ultralytics import YOLO 
            logger .info (f"Loading YOLO model from {self.weights_path} on {self.device}...")
            self .model =YOLO (self .weights_path )

            names =getattr (self .model ,"names",{})
            if isinstance (names ,dict ):
                model_classes =list (names .values ())
            else :
                model_classes =list (names )

            has_defect_classes =any (
            any (c .lower ()in str (cls_name ).lower ()for c in ["pothole","crack","water","defect","d00","d10","d20","d40"])
            for cls_name in model_classes 
            )
            self .is_custom_defect_model =has_defect_classes 
            logger .info (f"YOLO model initialized: {self.weights_path} (Custom Defect Classes: {self.is_custom_defect_model})")
        except Exception as e :
            logger .warning (f"Could not load Ultralytics YOLO model from {self.weights_path} ({e}). Falling back to Computer Vision Feature Detector.")
            self .model =None 

    def detect (
    self ,
    image_input :Union [str ,np .ndarray ,Image .Image ],
    frame_idx :Optional [int ]=None ,
    timestamp :Optional [float ]=None 
    )->List [Detection ]:
        """
        Execute defect detection on a single image frame.
        
        Args:
            image_input: Filepath string, OpenCV BGR numpy array, or PIL Image.
            frame_idx: Optional frame index for sequential video telemetry.
            timestamp: Optional recording timestamp in seconds.
            
        Returns:
            List of Detection objects.
        """

        img_bgr =self ._standardize_image (image_input )
        if img_bgr is None :
            return []

        h ,w =img_bgr .shape [:2 ]
        detections :List [Detection ]=[]

        if self .model is not None and self .is_custom_defect_model :
            try :
                results =self .model .predict (
                source =img_bgr ,
                conf =self .conf_threshold ,
                iou =self .iou_threshold ,
                device =self .device ,
                verbose =False 
                )
                for r in results :
                    boxes =r .boxes 
                    for box in boxes :
                        cls_id =int (box .cls [0 ].item ())
                        cls_name =r .names [cls_id ]
                        conf =float (box .conf [0 ].item ())

                        mapped_type =self ._map_to_canonical_class (cls_name )
                        if mapped_type :
                            x1 ,y1 ,x2 ,y2 =[int (v )for v in box .xyxy [0 ].tolist ()]

                            x1 ,y1 =max (0 ,x1 ),max (0 ,y1 )
                            x2 ,y2 =min (w ,x2 ),min (h ,y2 )

                            if (x2 -x1 )>8 and (y2 -y1 )>8 :
                                bbox_norm =(x1 /w ,y1 /h ,x2 /w ,y2 /h )
                                detections .append (Detection (
                                defect_type =mapped_type ,
                                confidence =conf ,
                                bbox =(x1 ,y1 ,x2 ,y2 ),
                                bbox_norm =bbox_norm ,
                                frame_idx =frame_idx ,
                                timestamp =timestamp 
                                ))
            except Exception as e :
                logger .error (f"YOLO inference error: {e}")

        if not detections and self .use_fallback_if_coco :
            detections =self ._heuristic_road_defect_detector (img_bgr ,frame_idx ,timestamp )

        return detections 

    def _standardize_image (self ,img_input :Union [str ,np .ndarray ,Image .Image ])->Optional [np .ndarray ]:
        """Convert any input format to standard BGR numpy array."""
        if isinstance (img_input ,str ):
            if not os .path .exists (img_input ):
                logger .error (f"Image path not found: {img_input}")
                return None 
            return cv2 .imread (img_input )
        elif isinstance (img_input ,Image .Image ):
            rgb =np .array (img_input )
            return cv2 .cvtColor (rgb ,cv2 .COLOR_RGB2BGR )
        elif isinstance (img_input ,np .ndarray ):
            if len (img_input .shape )==2 :
                return cv2 .cvtColor (img_input ,cv2 .COLOR_GRAY2BGR )
            return img_input 
        return None 

    def _map_to_canonical_class (self ,raw_name :str )->Optional [str ]:
        """Match diverse model class names and RDD2022 labels to standard ROAD_DEFECT_CLASSES."""
        name_lower =raw_name .lower ().strip ().replace ("-","_").replace (" ","_")

        for key ,val in RDD2022_MAPPING .items ():
            if key ==name_lower or name_lower .startswith (key ):
                return val 

        for canon in ROAD_DEFECT_CLASSES :
            if canon .lower ()in name_lower :
                return canon 
        if "pothole"in name_lower or "hole"in name_lower :
            return "Pothole"
        if "alligator"in name_lower or "fatigue"in name_lower :
            return "Alligator_Crack"
        if "transverse"in name_lower :
            return "Transverse_Crack"
        if "longitudinal"in name_lower or "linear"in name_lower :
            return "Longitudinal_Crack"
        if "water"in name_lower or "puddle"in name_lower or "pond"in name_lower :
            return "Water_Accumulation"
        if "crack"in name_lower :
            return "Transverse_Crack"
        return None 

    def _heuristic_road_defect_detector (
    self ,
    img_bgr :np .ndarray ,
    frame_idx :Optional [int ],
    timestamp :Optional [float ]
    )->List [Detection ]:
        """
        Advanced Computer Vision fallback detector:
        Analyzes road surface anomalies via morphology, adaptive thresholding,
        edge gradients, contour geometry, and dark/water reflection signatures.
        """
        h ,w =img_bgr .shape [:2 ]
        gray =cv2 .cvtColor (img_bgr ,cv2 .COLOR_BGR2GRAY )

        road_mask =np .zeros_like (gray )
        road_mask [int (h *0.20 ):,:]=255 

        blurred =cv2 .GaussianBlur (gray ,(7 ,7 ),0 )
        mean_intensity =np .mean (blurred [int (h *0.20 ):,:])

        thresh_dark =cv2 .adaptiveThreshold (
        blurred ,255 ,cv2 .ADAPTIVE_THRESH_GAUSSIAN_C ,
        cv2 .THRESH_BINARY_INV ,25 ,7 
        )
        thresh_dark =cv2 .bitwise_and (thresh_dark ,road_mask )

        hsv =cv2 .cvtColor (img_bgr ,cv2 .COLOR_BGR2HSV )
        sat =hsv [:,:,1 ]
        val =hsv [:,:,2 ]

        water_mask =cv2 .inRange (hsv ,np .array ([80 ,20 ,70 ]),np .array ([130 ,255 ,255 ]))
        water_mask =cv2 .bitwise_and (water_mask ,road_mask )

        detections :List [Detection ]=[]

        kernel_pothole =cv2 .getStructuringElement (cv2 .MORPH_ELLIPSE ,(5 ,5 ))
        closed_pothole =cv2 .morphologyEx (thresh_dark ,cv2 .MORPH_CLOSE ,kernel_pothole )

        contours ,_ =cv2 .findContours (closed_pothole ,cv2 .RETR_EXTERNAL ,cv2 .CHAIN_APPROX_SIMPLE )

        for cnt in contours :
            area =cv2 .contourArea (cnt )

            if area <350 or area >(w *h *0.45 ):
                continue 

            x ,y ,bw ,bh =cv2 .boundingRect (cnt )

            if bw <12 or bh <12 :
                continue 

            aspect_ratio =float (bw )/max (1 ,bh )
            patch =gray [y :y +bh ,x :x +bw ]
            patch_mean =np .mean (patch )
            patch_std =np .std (patch )

            if aspect_ratio >3.2 :
                defect_type ="Transverse_Crack"
                conf =min (0.95 ,0.65 +(area /8000.0 )*0.25 )
            elif aspect_ratio <0.35 :
                defect_type ="Longitudinal_Crack"
                conf =min (0.95 ,0.65 +(area /8000.0 )*0.25 )
            elif area >1800 and patch_mean <(mean_intensity -12 ):
                defect_type ="Pothole"
                conf =min (0.98 ,0.72 +(area /12000.0 )*0.24 )
            elif patch_std >28 and area >1200 :
                defect_type ="Alligator_Crack"
                conf =min (0.94 ,0.68 +(area /10000.0 )*0.22 )
            elif patch_mean <mean_intensity -5 :
                defect_type ="Pothole"
                conf =0.75 
            else :
                defect_type ="Transverse_Crack"
                conf =0.70 

            x1 ,y1 =max (0 ,x ),max (0 ,y )
            x2 ,y2 =min (w ,x +bw ),min (h ,y +bh )

            bbox_norm =(x1 /w ,y1 /h ,x2 /w ,y2 /h )
            detections .append (Detection (
            defect_type =defect_type ,
            confidence =round (conf ,3 ),
            bbox =(x1 ,y1 ,x2 ,y2 ),
            bbox_norm =bbox_norm ,
            frame_idx =frame_idx ,
            timestamp =timestamp 
            ))

        contours_w ,_ =cv2 .findContours (water_mask ,cv2 .RETR_EXTERNAL ,cv2 .CHAIN_APPROX_SIMPLE )
        for cnt in contours_w :
            area =cv2 .contourArea (cnt )
            if area >1200 :
                x ,y ,bw ,bh =cv2 .boundingRect (cnt )
                x1 ,y1 =max (0 ,x ),max (0 ,y )
                x2 ,y2 =min (w ,x +bw ),min (h ,y +bh )
                bbox_norm =(x1 /w ,y1 /h ,x2 /w ,y2 /h )
                detections .append (Detection (
                defect_type ="Water_Accumulation",
                confidence =0.88 ,
                bbox =(x1 ,y1 ,x2 ,y2 ),
                bbox_norm =bbox_norm ,
                frame_idx =frame_idx ,
                timestamp =timestamp 
                ))

        return self ._apply_nms (detections )

    def _apply_nms (self ,detections :List [Detection ])->List [Detection ]:
        """Eliminate overlapping redundant bounding boxes."""
        if not detections :
            return []

        boxes =np .array ([d .bbox for d in detections ],dtype =float )
        scores =np .array ([d .confidence for d in detections ],dtype =float )

        x1 =boxes [:,0 ]
        y1 =boxes [:,1 ]
        x2 =boxes [:,2 ]
        y2 =boxes [:,3 ]

        areas =(x2 -x1 )*(y2 -y1 )
        order =scores .argsort ()[::-1 ]

        keep =[]
        while order .size >0 :
            i =order [0 ]
            keep .append (i )

            xx1 =np .maximum (x1 [i ],x1 [order [1 :]])
            yy1 =np .maximum (y1 [i ],y1 [order [1 :]])
            xx2 =np .minimum (x2 [i ],x2 [order [1 :]])
            yy2 =np .minimum (y2 [i ],y2 [order [1 :]])

            w_inter =np .maximum (0.0 ,xx2 -xx1 )
            h_inter =np .maximum (0.0 ,yy2 -yy1 )
            inter =w_inter *h_inter 

            ovr =inter /(areas [i ]+areas [order [1 :]]-inter )
            inds =np .where (ovr <=self .iou_threshold )[0 ]
            order =order [inds +1 ]

        return [detections [k ]for k in keep ]

    @staticmethod 
    def draw_detections (
    image :np .ndarray ,
    detections :List [Detection ],
    show_conf :bool =True 
    )->np .ndarray :
        """
        Draw rich color-coded bounding boxes and label badges onto the image.
        
        Args:
            image: OpenCV BGR image array.
            detections: List of Detection objects.
            show_conf: If True, prints confidence score next to class name.
            
        Returns:
            Annotated OpenCV BGR image.
        """
        annotated =image .copy ()

        for det in detections :
            x1 ,y1 ,x2 ,y2 =det .bbox 
            color =DEFECT_COLORS .get (det .defect_type ,(0 ,255 ,0 ))

            cv2 .rectangle (annotated ,(x1 ,y1 ),(x2 ,y2 ),color ,3 ,lineType =cv2 .LINE_AA )

            label =det .defect_type .replace ("_"," ")
            if show_conf :
                label +=f" {int(det.confidence * 100)}%"

            (t_w ,t_h ),baseline =cv2 .getTextSize (label ,cv2 .FONT_HERSHEY_SIMPLEX ,0.55 ,2 )
            badge_y1 =max (0 ,y1 -t_h -10 )
            badge_y2 =y1 
            badge_x2 =min (annotated .shape [1 ],x1 +t_w +12 )

            cv2 .rectangle (annotated ,(x1 ,badge_y1 ),(badge_x2 ,badge_y2 ),color ,-1 )
            cv2 .putText (
            annotated ,
            label ,
            (x1 +6 ,badge_y2 -6 ),
            cv2 .FONT_HERSHEY_SIMPLEX ,
            0.55 ,
            (255 ,255 ,255 ),
            2 ,
            lineType =cv2 .LINE_AA 
            )

        return annotated 
