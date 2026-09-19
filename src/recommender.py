"""
Maintenance Action Recommendation Engine.
Translates road defect analytics into actionable civil engineering maintenance work orders,
material estimations, cost calculations, and scheduling priorities.
"""

from typing import Dict ,Any ,List ,Tuple 
from dataclasses import dataclass ,asdict 

@dataclass 
class MaintenanceAction :
    """Detailed engineering action recommendation for a defect or road segment."""
    action_name :str 
    urgency :str 
    estimated_cost_usd :float 
    required_equipment :List [str ]
    required_materials :List [str ]
    methodology_notes :str 

    def to_dict (self )->Dict [str ,Any ]:
        return asdict (self )

ACTION_CATALOG ={

("Pothole","Critical"):{
"action_name":"Emergency Full-Depth Hot Asphalt Patching & Base Compaction",
"urgency":"Immediate (24-48h)",
"unit_cost":280.0 ,
"equipment":["Asphalt Saw-Cutter","Plate Compactor","Tack Coat Sprayer"],
"materials":["HMA (Hot Mix Asphalt) PG 64-22","Bituminous Tack Coat"],
"notes":"Square-cut edges 100mm into sound pavement, clean debris, tack, compact in 50mm lifts."
},
("Pothole","High"):{
"action_name":"Semi-Permanent Hot Asphalt Patching",
"urgency":"High Priority (7-14d)",
"unit_cost":190.0 ,
"equipment":["Pavement Breaker","Hand Tamper / Vibratory Roller"],
"materials":["High-Performance Hot/Cold Patch Mix","Emulsion Seal"],
"notes":"Remove loose material, apply tack emulsion, fill flush with road profile."
},
("Pothole","Medium"):{
"action_name":"Injection Patching / Cold Mix Infill",
"urgency":"High Priority (7-14d)",
"unit_cost":110.0 ,
"equipment":["Spray Injection Patching Truck"],
"materials":["Polymer-Modified Cationic Emulsion","Crushed Aggregate #8"],
"notes":"Blow cavity dry with high-pressure air, spray coat aggregate simultaneously."
},
("Pothole","Low"):{
"action_name":"Preventive Surface Leveling & Monitoring",
"urgency":"Routine (30-90d)",
"unit_cost":45.0 ,
"equipment":["Hand Tools"],
"materials":["Cold Pour Asphalt Mastic"],
"notes":"Monitor during quarterly road maintenance cycle."
},

("Alligator_Crack","Critical"):{
"action_name":"Deep Structural Base Reconstruction & Full-Depth Overlay",
"urgency":"Immediate (24-48h)",
"unit_cost":650.0 ,
"equipment":["Cold Milling Machine","Heavy Asphalt Roller","Dump Truck"],
"materials":["Dense-Graded Base Course Aggregate","Superpave Asphalt Mix"],
"notes":"Excavate failed subbase layer, stabilize with geo-grid, install dense asphalt binder course."
},
("Alligator_Crack","High"):{
"action_name":"Mill & Inlay Asphalt Resurfacing",
"urgency":"High Priority (7-14d)",
"unit_cost":380.0 ,
"equipment":["Pavement Planer / Profiler","Vibratory Roller"],
"materials":["Fiber-Reinforced Asphalt Concrete (FRAC)"],
"notes":"Mill top 50mm distressed surface course, apply tack, pave polymer asphalt overlay."
},
("Alligator_Crack","Medium"):{
"action_name":"Heavy Polymer Micro-Surfacing & Geotextile Membrane",
"urgency":"High Priority (7-14d)",
"unit_cost":220.0 ,
"equipment":["Continuous Micro-Surfacing Paver"],
"materials":["Paving Fabric / Interlayer","Polymer Slurry Seal"],
"notes":"Apply stress-absorbing membrane interlayer to retard reflective cracking."
},
("Alligator_Crack","Low"):{
"action_name":"Slurry Seal & Rejuvenating Fog Seal",
"urgency":"Routine (30-90d)",
"unit_cost":85.0 ,
"equipment":["Slurry Paver Box"],
"materials":["Type II Slurry Aggregate & Emulsion"],
"notes":"Seal micro-fissures before moisture ingress destabilizes subgrade."
},

("Transverse_Crack","Critical"):{
"action_name":"Crack Routing, Deep Backer Rod & Hot Rubberized Sealant",
"urgency":"High Priority (7-14d)",
"unit_cost":160.0 ,
"equipment":["Crack Router","Hot-Air Lance","Oil-Jacketed Melter"],
"materials":["ASTM D6690 Type II Hot-Pour Joint Sealant","Heat-Resistant Foam Rod"],
"notes":"Route 20x20mm reservoir, thermal lance dry at 1500°C, inject sealant flush."
},
("Transverse_Crack","High"):{
"action_name":"Hot-Pour Elastic Crack Sealing",
"urgency":"High Priority (7-14d)",
"unit_cost":95.0 ,
"equipment":["Air Compressor","Sealant Applicator Wand"],
"materials":["Rubberized Bitumen Sealant"],
"notes":"Clean crack cavity of all sand/moisture, inject sealant with band-aid overband."
},
("Transverse_Crack","Medium"):{
"action_name":"Pressure Crack Infilling",
"urgency":"Routine (30-90d)",
"unit_cost":60.0 ,
"equipment":["Pressure Injection Wand"],
"materials":["Modified Asphalt Emulsion"],
"notes":"Fill fissure to prevent moisture damage during winter freeze-thaw cycles."
},
("Transverse_Crack","Low"):{
"action_name":"Routine Monitoring & Preventative Fog Seal",
"urgency":"Routine (30-90d)",
"unit_cost":30.0 ,
"equipment":["Distributor Truck"],
"materials":["Cationic Rejuvenator Emulsion"],
"notes":"Inspect during bi-annual pavement survey."
},

("Longitudinal_Crack","Critical"):{
"action_name":"Pavement Joint Reconstruction & Reinforcement",
"urgency":"High Priority (7-14d)",
"unit_cost":175.0 ,
"equipment":["Cold Planer","Joint Heater","Roller"],
"materials":["Hot Mix Asphalt","Longitudinal Joint Adhesive"],
"notes":"Mill 300mm on either side of joint, apply high-tack joint tape, pave hot inlay."
},
("Longitudinal_Crack","High"):{
"action_name":"Hot Rubberized Joint Sealing",
"urgency":"High Priority (7-14d)",
"unit_cost":90.0 ,
"equipment":["Crack Melter Applicator"],
"materials":["Elastomeric Joint Sealant"],
"notes":"Seal longitudinal wheel-path crack to avoid lane edge slippage."
},
("Longitudinal_Crack","Medium"):{
"action_name":"Crack Filling & Sand Blotting",
"urgency":"Routine (30-90d)",
"unit_cost":50.0 ,
"equipment":["Pour Pot / Wand"],
"materials":["Rubberized Emulsion & Blotter Sand"],
"notes":"Fill crack and spread silica sand to prevent tire pickup."
},
("Longitudinal_Crack","Low"):{
"action_name":"Routine Monitoring",
"urgency":"Routine (30-90d)",
"unit_cost":25.0 ,
"equipment":["Inspection Drone / Vehicle"],
"materials":[],
"notes":"Track widening rate over next 6 months."
},

("Water_Accumulation","Critical"):{
"action_name":"Drainage Culvert Clearing & Shoulder Cross-Slope Regrading",
"urgency":"Immediate (24-48h)",
"unit_cost":420.0 ,
"equipment":["Vactor Jet-Rodder Truck","Motor Grader","Excavator"],
"materials":["Precast Drainage Inlets","Crushed Rip-Rap Rock #4"],
"notes":"Clear clogged storm catchbasins, cut unpaved shoulder drop-off, restore 2% roadway crown."
},
("Water_Accumulation","High"):{
"action_name":"Surface Ditch Trenching & Permeable Friction Course Overlay",
"urgency":"High Priority (7-14d)",
"unit_cost":260.0 ,
"equipment":["Trenching Attachment","Paver"],
"materials":["Open-Graded Friction Course (OGFC) Asphalt"],
"notes":"Pave permeable friction layer to rapidly siphon surface runoff into side drainage."
},
("Water_Accumulation","Medium"):{
"action_name":"Shoulder De-berming & Runoff Channeling",
"urgency":"Routine (30-90d)",
"unit_cost":120.0 ,
"equipment":["Skid Steer with Sweeper","Grader"],
"materials":[],
"notes":"Grade roadway shoulder buildup preventing sheet flow runoff."
},
("Water_Accumulation","Low"):{
"action_name":"Drainage Clearing & Monitoring",
"urgency":"Routine (30-90d)",
"unit_cost":40.0 ,
"equipment":["Manual Shovel & Pressure Hose"],
"materials":[],
"notes":"Flush drainage grate of accumulated silt and leaves."
}
}

class MaintenanceRecommender :
    """
    Expert rule engine providing concrete maintenance specifications,
    cost estimates, and prioritized work orders.
    """

    def recommend_for_defect (self ,defect_type :str ,severity_level :str )->MaintenanceAction :
        """Get maintenance recommendation for a single defect."""
        key =(defect_type ,severity_level )
        rule =ACTION_CATALOG .get (key )

        if not rule :

            rule ={
            "action_name":f"Pavement Repair ({defect_type})",
            "urgency":"Routine (30-90d)",
            "unit_cost":75.0 ,
            "equipment":["General Maintenance Tools"],
            "materials":["Asphalt Patch / Sealant"],
            "notes":"Repair according to standard DOT municipal guidelines."
            }

        return MaintenanceAction (
        action_name =rule ["action_name"],
        urgency =rule ["urgency"],
        estimated_cost_usd =rule ["unit_cost"],
        required_equipment =rule ["equipment"],
        required_materials =rule ["materials"],
        methodology_notes =rule ["notes"]
        )

    def recommend_for_segment (
    self ,
    segment_id :str ,
    sri :float ,
    condition_band :str ,
    defects :List [Dict [str ,Any ]]
    )->Dict [str ,Any ]:
        """
        Synthesize segment-level work order aggregating all defect requirements.
        """
        if not defects or sri <15.0 :
            return {
            "recommended_action":"Routine Inspection & Preventive Sweep",
            "urgency":"Routine (30-90d)",
            "estimated_repair_cost":0.0 ,
            "primary_strategy":"Pavement in Good Condition. Keep in bi-annual inspection cycle.",
            "work_order_items":[]
            }

        total_cost =0.0 
        urgencies =[]
        action_names =[]
        work_items =[]

        for d in defects :
            action =self .recommend_for_defect (d ["defect_type"],d ["severity_level"])
            total_cost +=action .estimated_cost_usd 
            urgencies .append (action .urgency )
            action_names .append (action .action_name )

            work_items .append ({
            "defect_id":d .get ("defect_id"),
            "defect_type":d .get ("defect_type"),
            "severity_level":d .get ("severity_level"),
            "action":action .action_name ,
            "urgency":action .urgency ,
            "cost_usd":action .estimated_cost_usd 
            })

        if "Immediate (24-48h)"in urgencies or sri >=70.0 :
            dominant_urgency ="Immediate (24-48h)"
        elif "High Priority (7-14d)"in urgencies or sri >=35.0 :
            dominant_urgency ="High Priority (7-14d)"
        else :
            dominant_urgency ="Routine (30-90d)"

        if condition_band =="Critical":
            summary_action =f"URGENT: {action_names[0]}"if action_names else "Full Segment Resurfacing & Deep Repair"
        elif condition_band =="Moderate":
            summary_action =f"PRIORITY: {action_names[0]}"if action_names else "Preventative Slurry & Crack Infill"
        else :
            summary_action =f"ROUTINE: {action_names[0]}"if action_names else "Routine Surface Maintenance"

        return {
        "recommended_action":summary_action ,
        "urgency":dominant_urgency ,
        "estimated_repair_cost":round (total_cost ,2 ),
        "primary_strategy":f"Deploy {dominant_urgency} repair crew. Estimated budget: ${total_cost:,.2f}.",
        "work_order_items":work_items 
        }
