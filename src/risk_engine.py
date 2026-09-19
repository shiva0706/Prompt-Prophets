"""
Risk Calculation Engine: Defect Risk Score (DRS) & Segment Risk Index (SRI).
Computes risk indices for discrete 50-meter road segments and identifies critical failure hazards.
"""

from dataclasses import dataclass ,field ,asdict 
from typing import List ,Dict ,Any ,Optional 
import numpy as np 

DEFECT_TYPE_WEIGHTS ={
"Pothole":1.40 ,
"Alligator_Crack":1.25 ,
"Water_Accumulation":1.15 ,
"Transverse_Crack":1.00 ,
"Longitudinal_Crack":0.95 
}

SEVERITY_LEVEL_MULTIPLIERS ={
"Low":1.0 ,
"Medium":2.2 ,
"High":3.8 ,
"Critical":5.5 
}

@dataclass 
class DefectRiskRecord :
    """Record storing computed risk for an individual detected defect."""
    defect_id :str 
    defect_type :str 
    severity_level :str 
    severity_score :float 
    confidence :float 
    area_cm2 :float 
    max_span_cm :float 
    drs :float 
    frame_idx :Optional [int ]=None 
    lat :Optional [float ]=None 
    lon :Optional [float ]=None 
    segment_id :Optional [str ]=None 
    explanation :str =""

    def to_dict (self )->Dict [str ,Any ]:
        return asdict (self )

@dataclass 
class SegmentRiskRecord :
    """Aggregated risk profile for a 50-meter road segment."""
    segment_id :str 
    segment_index :int 
    start_distance_m :float 
    end_distance_m :float 
    start_coords :tuple 
    end_coords :tuple 
    defect_count :int 
    sri :float 
    pci_equivalent :float 
    condition_band :str 
    dominant_defect :str 
    max_drs :float 
    sum_drs :float 
    traffic_factor :float 
    defects :List [DefectRiskRecord ]=field (default_factory =list )
    recommended_action :str =""
    estimated_repair_cost :float =0.0 

    def to_dict (self )->Dict [str ,Any ]:
        d =asdict (self )
        d ["defects"]=[df .to_dict ()for df in self .defects ]
        return d 

class RiskEngine :
    """
    Computes Defect Risk Score (DRS) and aggregates into Segment Risk Index (SRI).
    """

    def __init__ (
    self ,
    alpha :float =3.5 ,
    beta :float =6.0 ,
    gamma :float =2.5 ,
    area_delta :float =0.35 
    ):
        """
        Initialize Risk Engine with calibrated weighting constants.
        
        Args:
            alpha: Weight for total cumulative defect burden in segment.
            beta: Weight for worst single defect in segment.
            gamma: Weight for traffic multiplier.
            area_delta: Elasticity factor for defect physical area.
        """
        self .alpha =alpha 
        self .beta =beta 
        self .gamma =gamma 
        self .area_delta =area_delta 

    def compute_drs (
    self ,
    defect_type :str ,
    severity_level :str ,
    severity_score :float ,
    area_cm2 :float ,
    confidence :float =1.0 
    )->float :
        """
        Calculate Defect Risk Score (DRS):
        DRS = w_type * S_severity * (1 + delta * min(1.0, area_cm2 / 1000)) * (0.8 + 0.2 * conf)
        
        Returns:
            Float DRS (typically between 1.0 and 35.0).
        """
        w_type =DEFECT_TYPE_WEIGHTS .get (defect_type ,1.0 )
        s_sev =SEVERITY_LEVEL_MULTIPLIERS .get (severity_level ,severity_score *5.0 )

        area_factor =1.0 +self .area_delta *min (1.5 ,area_cm2 /1000.0 )
        conf_factor =0.85 +0.15 *max (0.0 ,min (1.0 ,confidence ))

        drs =w_type *s_sev *area_factor *conf_factor 
        return round (float (drs ),2 )

    def compute_sri (
    self ,
    drs_list :List [float ],
    traffic_factor :float =1.5 
    )->float :
        """
        Calculate Segment Risk Index (SRI, 0 - 100):
        SRI = min(100.0, alpha * sum(DRS) + beta * max(DRS) + gamma * traffic_factor)
        
        If no defects are present, SRI is 0.0 (pristine condition).
        """
        if not drs_list :
            return 0.0 

        sum_drs =float (np .sum (drs_list ))
        max_drs =float (np .max (drs_list ))

        raw_sri =(self .alpha *sum_drs )+(self .beta *max_drs )+(self .gamma *(traffic_factor -1.0 )*10.0 )
        sri =float (np .clip (raw_sri ,0.0 ,100.0 ))
        return round (sri ,1 )

    def evaluate_condition_band (self ,sri :float )->str :
        """Categorize SRI into standard condition bands."""
        if sri >=70.0 :
            return "Critical"
        elif sri >=30.0 :
            return "Moderate"
        else :
            return "Good"

    def compute_pci_equivalent (self ,sri :float )->float :
        """Compute standard Pavement Condition Index equivalent (100 = Brand New, 0 = Failed)."""
        pci =max (0.0 ,min (100.0 ,100.0 -(sri *0.95 )))
        return round (pci ,1 )
