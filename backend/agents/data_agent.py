"""
Agent 1: Data Scout (Data Ingestion & Sourcing Agent)
Responsible for fetching, generating, validating, and profiling raw multidimensional datasets & video frames.
"""

from typing import Dict ,Any ,List ,Optional 
import numpy as np 
import pandas as pd 
import datetime 
import os 
import glob 
import base64 
from .base_agent import BaseAgent 

class DataIngestionAgent (BaseAgent ):
    """Specialized Agent for Data Sourcing, Ingestion, and Initial Profiling."""

    def __init__ (self ):
        super ().__init__ (
        agent_id ="agent_1_data_scout",
        name ="Data Scout",
        role ="Data Ingestion & Sourcing Specialist",
        description ="Extracts, streams, and profiles raw multi-domain datasets and image frames with integrity checks.",
        avatar_icon ="database"
        )

    def _load_sample_frames (self )->List [Dict [str ,Any ]]:
        """Loads available sample road inspection frames for YOLO detection."""
        frames_dir =os .path .join (os .path .dirname (__file__ ),"..","..","sample_data","frames")
        frames_dir =os .path .abspath (frames_dir )

        frame_items =[]
        if os .path .exists (frames_dir ):
            jpg_files =sorted (glob .glob (os .path .join (frames_dir ,"*.jpg")))[:8 ]
            for idx ,file_path in enumerate (jpg_files ):
                try :
                    with open (file_path ,"rb")as f :
                        b64_data =base64 .b64encode (f .read ()).decode ("utf-8")
                        frame_items .append ({
                        "frame_id":f"frame_{idx:03d}",
                        "filename":os .path .basename (file_path ),
                        "file_path":file_path ,
                        "image_b64":f"data:image/jpeg;base64,{b64_data}",
                        "timestamp_s":idx *2.0 
                        })
                except Exception :
                    pass 
        return frame_items 

    def _generate_energy_dataset (self ,n_samples :int ,noise_level :float ,missing_ratio :float )->pd .DataFrame :
        """Generates realistic Smart Power Grid & Renewable Energy Telemetry."""
        base_time =datetime .datetime .now ()-datetime .timedelta (hours =n_samples )
        timestamps =[base_time +datetime .timedelta (hours =i )for i in range (n_samples )]

        hours =np .array ([t .hour for t in timestamps ])
        solar_pattern =np .maximum (0 ,np .sin ((hours -6 )/12 *np .pi ))*850 
        temperature =18 +12 *np .sin ((hours -8 )/24 *2 *np .pi )+np .random .normal (0 ,1.5 *(1 +noise_level ),n_samples )

        base_load =450 +200 *np .sin ((hours -6 )/24 *2 *np .pi )
        industrial_load =np .random .gamma (shape =5.0 ,scale =30.0 ,size =n_samples )
        cooling_penalty =np .maximum (0 ,temperature -24 )*18.5 

        grid_load =base_load +industrial_load +cooling_penalty +np .random .normal (0 ,15 *(1 +noise_level *2 ),n_samples )
        grid_frequency =50.0 +np .random .normal (0 ,0.05 *(1 +noise_level ),n_samples )
        renewable_share =np .clip ((solar_pattern *0.4 +np .random .uniform (50 ,200 ,n_samples ))/(grid_load +1 )*100 ,5 ,95 )

        df =pd .DataFrame ({
        "timestamp":[t .strftime ("%Y-%m-%d %H:%M:%S")for t in timestamps ],
        "temperature_celsius":np .round (temperature ,2 ),
        "solar_radiation_wm2":np .round (solar_pattern +np .random .normal (0 ,25 *noise_level ,n_samples ),1 ),
        "grid_frequency_hz":np .round (grid_frequency ,3 ),
        "renewable_share_pct":np .round (renewable_share ,2 ),
        "industrial_demand_mw":np .round (industrial_load ,2 ),
        "target_grid_load_mw":np .round (grid_load ,2 )
        })

        if missing_ratio >0 :
            for col in ["temperature_celsius","solar_radiation_wm2","renewable_share_pct"]:
                mask =np .random .rand (n_samples )<missing_ratio 
                df .loc [mask ,col ]=np .nan 

        return df 

    def _generate_road_telemetry_dataset (self ,n_samples :int ,noise_level :float ,missing_ratio :float )->pd .DataFrame :
        """Generates Road Pavement Telemetry, DRS, and Defect Sensors."""
        base_time =datetime .datetime .now ()-datetime .timedelta (minutes =n_samples *2 )
        timestamps =[base_time +datetime .timedelta (minutes =i *2 )for i in range (n_samples )]

        base_lat ,base_lon =37.7749 ,-122.4194 
        distances_m =np .arange (0 ,n_samples *50 ,50 )
        lats =base_lat +(distances_m *0.000009 )+np .random .normal (0 ,0.00001 ,n_samples )
        lons =base_lon +(distances_m *0.000011 )+np .random .normal (0 ,0.00001 ,n_samples )

        vibration_z =np .abs (np .random .normal (0.8 ,0.3 *(1 +noise_level ),n_samples ))
        hazard_spikes =(np .random .rand (n_samples )>0.85 ).astype (float )*np .random .uniform (2.5 ,6.0 ,n_samples )
        vibration_z +=hazard_spikes 

        vehicle_speed =np .clip (65 -(hazard_spikes *4 )+np .random .normal (0 ,5 ,n_samples ),20 ,110 )
        surface_roughness_iri =1.8 +(vibration_z *0.9 )+np .random .normal (0 ,0.2 ,n_samples )
        defect_count =np .random .poisson (lam =np .clip (hazard_spikes *1.5 ,0.2 ,5.0 ),size =n_samples )

        target_risk =np .clip ((surface_roughness_iri *15 )+(defect_count *8.5 )+(vibration_z *10 ),5 ,98 )

        df =pd .DataFrame ({
        "timestamp":[t .strftime ("%Y-%m-%d %H:%M:%S")for t in timestamps ],
        "latitude":np .round (lats ,6 ),
        "longitude":np .round (lons ,6 ),
        "distance_along_route_m":distances_m ,
        "vehicle_speed_kmh":np .round (vehicle_speed ,1 ),
        "vibration_z_axis_g":np .round (vibration_z ,3 ),
        "surface_roughness_iri":np .round (surface_roughness_iri ,2 ),
        "detected_defects_count":defect_count ,
        "target_segment_risk_index":np .round (target_risk ,2 )
        })

        if missing_ratio >0 :
            for col in ["vibration_z_axis_g","surface_roughness_iri","vehicle_speed_kmh"]:
                mask =np .random .rand (n_samples )<missing_ratio 
                df .loc [mask ,col ]=np .nan 

        return df 

    def _generate_financial_dataset (self ,n_samples :int ,noise_level :float ,missing_ratio :float )->pd .DataFrame :
        """Generates High-Frequency Market & Financial Telemetry."""
        base_time =datetime .datetime .now ()-datetime .timedelta (hours =n_samples )
        timestamps =[base_time +datetime .timedelta (hours =i )for i in range (n_samples )]

        returns =np .random .normal (0.0005 ,0.015 *(1 +noise_level ),n_samples )
        price =150.0 *np .exp (np .cumsum (returns ))
        volume =np .random .lognormal (mean =12.5 ,sigma =0.6 ,size =n_samples )
        volatility =np .abs (returns )*100 *(1 +noise_level )
        sentiment_score =np .clip (np .sin (np .linspace (0 ,10 ,n_samples ))+np .random .normal (0 ,0.4 ,n_samples ),-1.0 ,1.0 )
        rsi_proxy =np .clip (50 +30 *np .sin (np .linspace (0 ,15 ,n_samples ))+np .random .normal (0 ,5 ,n_samples ),10 ,90 )

        target_next_price =price *(1 +np .random .normal (0.001 ,0.01 ,n_samples ))

        df =pd .DataFrame ({
        "timestamp":[t .strftime ("%Y-%m-%d %H:%M:%S")for t in timestamps ],
        "price_usd":np .round (price ,2 ),
        "trading_volume":np .round (volume ,0 ).astype (int ),
        "volatility_index":np .round (volatility ,3 ),
        "sentiment_score":np .round (sentiment_score ,3 ),
        "relative_strength_rsi":np .round (rsi_proxy ,1 ),
        "target_future_price_usd":np .round (target_next_price ,2 )
        })

        if missing_ratio >0 :
            for col in ["sentiment_score","volatility_index","relative_strength_rsi"]:
                mask =np .random .rand (n_samples )<missing_ratio 
                df .loc [mask ,col ]=np .nan 

        return df 

    def _generate_iot_dataset (self ,n_samples :int ,noise_level :float ,missing_ratio :float )->pd .DataFrame :
        """Generates Industrial IoT & Predictive Maintenance Telemetry."""
        base_time =datetime .datetime .now ()-datetime .timedelta (minutes =n_samples *5 )
        timestamps =[base_time +datetime .timedelta (minutes =i *5 )for i in range (n_samples )]

        rpm =3600 +np .random .normal (0 ,45 *(1 +noise_level ),n_samples )
        temp_c =68.0 +(rpm -3600 )*0.03 +np .random .normal (0 ,2.0 ,n_samples )
        pressure_bar =5.2 +np .random .normal (0 ,0.25 *(1 +noise_level ),n_samples )
        acoustic_db =72.0 +(temp_c -68 )*0.4 +np .random .normal (0 ,1.8 ,n_samples )
        operating_hours =np .linspace (1200 ,1200 +n_samples *0.083 ,n_samples )

        failure_risk =np .clip (
        ((temp_c -65 )*1.8 )+((acoustic_db -70 )*2.2 )+((operating_hours -1200 )*0.5 ),
        2.0 ,99.0 
        )

        df =pd .DataFrame ({
        "timestamp":[t .strftime ("%Y-%m-%d %H:%M:%S")for t in timestamps ],
        "motor_rpm":np .round (rpm ,1 ),
        "temperature_c":np .round (temp_c ,2 ),
        "pressure_bar":np .round (pressure_bar ,2 ),
        "acoustic_emission_db":np .round (acoustic_db ,2 ),
        "operating_hours":np .round (operating_hours ,1 ),
        "target_failure_risk_pct":np .round (failure_risk ,2 )
        })

        if missing_ratio >0 :
            for col in ["temperature_c","pressure_bar","acoustic_emission_db"]:
                mask =np .random .rand (n_samples )<missing_ratio 
                df .loc [mask ,col ]=np .nan 

        return df 

    async def process (self ,input_data :Dict [str ,Any ])->Dict [str ,Any ]:
        """Main execution logic for Data Scout."""
        domain =input_data .get ("domain","energy_grid")
        n_samples =int (input_data .get ("n_samples",120 ))
        noise_level =float (input_data .get ("noise_level",0.1 ))
        missing_ratio =float (input_data .get ("missing_ratio",0.08 ))
        custom_csv_data =input_data .get ("custom_csv_data",None )

        await self .log_thought (
        f"Analyzing data ingestion request for domain '{domain}'. Requested {n_samples} telemetry records."
        )

        await self .log_action (
        "connect_data_source",
        {"domain":domain ,"samples":n_samples ,"noise":noise_level ,"missingness":missing_ratio }
        )

        frames =[]
        if custom_csv_data :
            import io 
            df =pd .read_csv (io .StringIO (custom_csv_data ))
            domain_name ="Custom Ingested Stream"
        elif domain =="road_telemetry":
            df =self ._generate_road_telemetry_dataset (n_samples ,noise_level ,missing_ratio )
            domain_name ="Highway Condition & Hazard Telemetry"
            frames =self ._load_sample_frames ()
        elif domain =="financial_market":
            df =self ._generate_financial_dataset (n_samples ,noise_level ,missing_ratio )
            domain_name ="High-Frequency Financial & Crypto Market"
        elif domain =="iot_sensors":
            df =self ._generate_iot_dataset (n_samples ,noise_level ,missing_ratio )
            domain_name ="Industrial IoT & Machine Telemetry"
        else :
            df =self ._generate_energy_dataset (n_samples ,noise_level ,missing_ratio )
            domain_name ="Smart Power Grid & Renewable Energy"

        if not frames :
            frames =self ._load_sample_frames ()

        total_cells =df .size 
        missing_cells =int (df .isna ().sum ().sum ())
        missing_pct =round ((missing_cells /total_cells )*100 ,2 )if total_cells >0 else 0.0 

        target_col =[c for c in df .columns if c .startswith ("target_")]
        target_col =target_col [0 ]if target_col else df .columns [-1 ]

        output_payload ={
        "domain":domain ,
        "domain_title":domain_name ,
        "raw_dataframe":df .to_dict (orient ="records"),
        "target_column":target_col ,
        "row_count":len (df ),
        "column_count":len (df .columns ),
        "columns":list (df .columns ),
        "missing_cells_total":missing_cells ,
        "missing_pct_total":missing_pct ,
        "raw_frames":frames ,
        "ingestion_timestamp":datetime .datetime .now ().isoformat (),
        "status":"INGESTED_READY_FOR_PREPROCESSING"
        }

        return output_payload 
