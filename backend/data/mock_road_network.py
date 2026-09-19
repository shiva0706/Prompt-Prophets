"""
Mock Road Network Spatial Dataset.
Contains 50-meter segmented corridors (NH-44, SH-72, Madurai Ring Road, Chennai OMR, NH-48, ECR, GST Road, NH-83)
with detailed pavement condition indices (PCI), segment risk indices (SRI),
localized defects, and GPS telemetry coordinates.
"""

from typing import List, Dict, Any, Optional

MOCK_ROAD_NETWORK: List[Dict[str, Any]] = [
    # -------------------------------------------------------------
    # Corridor 1: NH-44 (Kanyakumari - Bengaluru Corridor, Salem-Dharmapuri Stretch)
    # High Freight Traffic corridor with monsoon-vulnerable segments
    # -------------------------------------------------------------
    {
        "segment_id": "NH44-SEG-101",
        "road_name": "NH-44",
        "corridor_description": "NH-44 Salem-Bengaluru Expressway (Km 184.200 - 184.250)",
        "chainage_start_km": 184.200,
        "chainage_end_km": 184.250,
        "length_meters": 50.0,
        "width_meters": 7.5,
        "pci": 22.4,  # Critical Condition (0-30)
        "sri": 88.5,  # High Risk
        "traffic_factor": 2.8,
        "jurisdiction_authority": "National Highways Authority of India (NHAI) - RO Chennai",
        "district": "Salem / Dharmapuri",
        "coordinates": [[78.1460, 11.6643], [78.1464, 11.6647]],
        "defects": [
            {
                "defect_id": "DEF-NH44-101A",
                "defect_type": "Pothole",
                "severity_level": "Critical",
                "area_cm2": 3200.0,
                "depth_cm": 8.5,
                "span_cm": 65.0,
                "confidence": 0.94,
                "lat": 11.6644,
                "lon": 78.1461
            },
            {
                "defect_id": "DEF-NH44-101B",
                "defect_type": "Alligator_Crack",
                "severity_level": "Critical",
                "area_cm2": 9500.0,
                "depth_cm": 3.2,
                "span_cm": 140.0,
                "confidence": 0.91,
                "lat": 11.6646,
                "lon": 78.1463
            }
        ]
    },
    {
        "segment_id": "NH44-SEG-102",
        "road_name": "NH-44",
        "corridor_description": "NH-44 Salem-Bengaluru Expressway (Km 184.250 - 184.300)",
        "chainage_start_km": 184.250,
        "chainage_end_km": 184.300,
        "length_meters": 50.0,
        "width_meters": 7.5,
        "pci": 28.0,  # Critical Condition
        "sri": 81.2,
        "traffic_factor": 2.8,
        "jurisdiction_authority": "National Highways Authority of India (NHAI) - RO Chennai",
        "district": "Salem / Dharmapuri",
        "coordinates": [[78.1464, 11.6647], [78.1468, 11.6651]],
        "defects": [
            {
                "defect_id": "DEF-NH44-102A",
                "defect_type": "Alligator_Crack",
                "severity_level": "High",
                "area_cm2": 6800.0,
                "depth_cm": 2.8,
                "span_cm": 110.0,
                "confidence": 0.89,
                "lat": 11.6648,
                "lon": 78.1465
            },
            {
                "defect_id": "DEF-NH44-102B",
                "defect_type": "Pothole",
                "severity_level": "High",
                "area_cm2": 1900.0,
                "depth_cm": 6.2,
                "span_cm": 48.0,
                "confidence": 0.92,
                "lat": 11.6650,
                "lon": 78.1467
            }
        ]
    },
    {
        "segment_id": "NH44-SEG-103",
        "road_name": "NH-44",
        "corridor_description": "NH-44 Salem-Bengaluru Expressway (Km 184.300 - 184.350)",
        "chainage_start_km": 184.300,
        "chainage_end_km": 184.350,
        "length_meters": 50.0,
        "width_meters": 7.5,
        "pci": 54.0,  # Moderate Condition (30-70)
        "sri": 49.5,
        "traffic_factor": 2.8,
        "jurisdiction_authority": "National Highways Authority of India (NHAI) - RO Chennai",
        "district": "Salem / Dharmapuri",
        "coordinates": [[78.1468, 11.6651], [78.1472, 11.6655]],
        "defects": [
            {
                "defect_id": "DEF-NH44-103A",
                "defect_type": "Longitudinal_Crack",
                "severity_level": "Medium",
                "area_cm2": 1200.0,
                "depth_cm": 1.5,
                "span_cm": 280.0,
                "confidence": 0.88,
                "lat": 11.6653,
                "lon": 78.1470
            }
        ]
    },
    {
        "segment_id": "NH44-SEG-104",
        "road_name": "NH-44",
        "corridor_description": "NH-44 Salem-Bengaluru Expressway (Km 184.350 - 184.400)",
        "chainage_start_km": 184.350,
        "chainage_end_km": 184.400,
        "length_meters": 50.0,
        "width_meters": 7.5,
        "pci": 86.0,  # Good Condition (70-100)
        "sri": 14.2,
        "traffic_factor": 2.8,
        "jurisdiction_authority": "National Highways Authority of India (NHAI) - RO Chennai",
        "district": "Salem / Dharmapuri",
        "coordinates": [[78.1472, 11.6655], [78.1476, 11.6659]],
        "defects": []
    },

    # -------------------------------------------------------------
    # Corridor 2: SH-72 (Madurai - Sivagangai State Highway)
    # State PWD jurisdiction with severe edge fatigue & drainage blockage
    # -------------------------------------------------------------
    {
        "segment_id": "SH72-SEG-201",
        "road_name": "SH-72",
        "corridor_description": "SH-72 Madurai-Sivagangai Highway (Km 12.100 - 12.150)",
        "chainage_start_km": 12.100,
        "chainage_end_km": 12.150,
        "length_meters": 50.0,
        "width_meters": 7.0,
        "pci": 19.5,  # Critical Condition
        "sri": 92.4,
        "traffic_factor": 1.9,
        "jurisdiction_authority": "Tamil Nadu State PWD (Highways) - Madurai Division",
        "district": "Madurai",
        "coordinates": [[78.1820, 9.9250], [78.1824, 9.9254]],
        "defects": [
            {
                "defect_id": "DEF-SH72-201A",
                "defect_type": "Pothole",
                "severity_level": "Critical",
                "area_cm2": 4100.0,
                "depth_cm": 9.2,
                "span_cm": 75.0,
                "confidence": 0.96,
                "lat": 9.9251,
                "lon": 78.1821
            },
            {
                "defect_id": "DEF-SH72-201B",
                "defect_type": "Water_Accumulation",
                "severity_level": "Critical",
                "area_cm2": 14500.0,
                "depth_cm": 5.0,
                "span_cm": 320.0,
                "confidence": 0.93,
                "lat": 9.9253,
                "lon": 78.1823
            }
        ]
    },
    {
        "segment_id": "SH72-SEG-202",
        "road_name": "SH-72",
        "corridor_description": "SH-72 Madurai-Sivagangai Highway (Km 12.150 - 12.200)",
        "chainage_start_km": 12.150,
        "chainage_end_km": 12.200,
        "length_meters": 50.0,
        "width_meters": 7.0,
        "pci": 42.0,  # Moderate Condition
        "sri": 61.8,
        "traffic_factor": 1.9,
        "jurisdiction_authority": "Tamil Nadu State PWD (Highways) - Madurai Division",
        "district": "Madurai",
        "coordinates": [[78.1824, 9.9254], [78.1828, 9.9258]],
        "defects": [
            {
                "defect_id": "DEF-SH72-202A",
                "defect_type": "Transverse_Crack",
                "severity_level": "High",
                "area_cm2": 1800.0,
                "depth_cm": 2.2,
                "span_cm": 420.0,
                "confidence": 0.87,
                "lat": 9.9256,
                "lon": 78.1826
            }
        ]
    },

    # -------------------------------------------------------------
    # Corridor 3: Madurai Ring Road (Bypass / Municipal Beltway)
    # Heavy container movement connecting to Tuticorin Port
    # -------------------------------------------------------------
    {
        "segment_id": "MRR-SEG-301",
        "road_name": "Madurai Ring Road",
        "corridor_description": "Madurai Ring Road Beltway (Chinthamani Jn - Samayanallur, Km 4.400)",
        "chainage_start_km": 4.400,
        "chainage_end_km": 4.450,
        "length_meters": 50.0,
        "width_meters": 7.5,
        "pci": 26.5,  # Critical Condition
        "sri": 84.0,
        "traffic_factor": 2.5,
        "jurisdiction_authority": "Madurai Municipal Corporation & TNRIDC",
        "district": "Madurai",
        "coordinates": [[78.1210, 9.9010], [78.1215, 9.9014]],
        "defects": [
            {
                "defect_id": "DEF-MRR-301A",
                "defect_type": "Pothole",
                "severity_level": "Critical",
                "area_cm2": 3800.0,
                "depth_cm": 7.8,
                "span_cm": 70.0,
                "confidence": 0.95,
                "lat": 9.9011,
                "lon": 78.1211
            },
            {
                "defect_id": "DEF-MRR-301B",
                "defect_type": "Alligator_Crack",
                "severity_level": "High",
                "area_cm2": 8200.0,
                "depth_cm": 3.0,
                "span_cm": 125.0,
                "confidence": 0.90,
                "lat": 9.9013,
                "lon": 78.1213
            }
        ]
    },
    {
        "segment_id": "MRR-SEG-302",
        "road_name": "Madurai Ring Road",
        "corridor_description": "Madurai Ring Road Beltway (Km 4.450 - 4.500)",
        "chainage_start_km": 4.450,
        "chainage_end_km": 4.500,
        "length_meters": 50.0,
        "width_meters": 7.5,
        "pci": 48.0,  # Moderate Condition
        "sri": 55.3,
        "traffic_factor": 2.5,
        "jurisdiction_authority": "Madurai Municipal Corporation & TNRIDC",
        "district": "Madurai",
        "coordinates": [[78.1215, 9.9014], [78.1220, 9.9018]],
        "defects": [
            {
                "defect_id": "DEF-MRR-302A",
                "defect_type": "Longitudinal_Crack",
                "severity_level": "Medium",
                "area_cm2": 1500.0,
                "depth_cm": 1.8,
                "span_cm": 310.0,
                "confidence": 0.86,
                "lat": 9.9016,
                "lon": 78.1217
            }
        ]
    },

    # -------------------------------------------------------------
    # Corridor 4: Chennai OMR (Rajiv Gandhi Salai / IT Expressway)
    # High-tech arterial corridor managed by TNRDC / GCC
    # -------------------------------------------------------------
    {
        "segment_id": "OMR-SEG-401",
        "road_name": "Chennai OMR",
        "corridor_description": "Rajiv Gandhi IT Corridor (Thoraipakkam - Sholinganallur, Km 14.800)",
        "chainage_start_km": 14.800,
        "chainage_end_km": 14.850,
        "length_meters": 50.0,
        "width_meters": 10.5,
        "pci": 29.5,  # Critical Condition
        "sri": 79.8,
        "traffic_factor": 3.0,
        "jurisdiction_authority": "Tamil Nadu Road Development Company (TNRDC) / GCC",
        "district": "Chennai",
        "coordinates": [[80.2280, 12.9120], [80.2285, 12.9124]],
        "defects": [
            {
                "defect_id": "DEF-OMR-401A",
                "defect_type": "Pothole",
                "severity_level": "Critical",
                "area_cm2": 2900.0,
                "depth_cm": 7.0,
                "span_cm": 58.0,
                "confidence": 0.93,
                "lat": 12.9121,
                "lon": 80.2281
            },
            {
                "defect_id": "DEF-OMR-401B",
                "defect_type": "Water_Accumulation",
                "severity_level": "High",
                "area_cm2": 11000.0,
                "depth_cm": 4.5,
                "span_cm": 240.0,
                "confidence": 0.91,
                "lat": 12.9123,
                "lon": 80.2283
            }
        ]
    },
    {
        "segment_id": "OMR-SEG-402",
        "road_name": "Chennai OMR",
        "corridor_description": "Rajiv Gandhi IT Corridor (Km 14.850 - 14.900)",
        "chainage_start_km": 14.850,
        "chainage_end_km": 14.900,
        "length_meters": 50.0,
        "width_meters": 10.5,
        "pci": 74.0,  # Good Condition
        "sri": 24.5,
        "traffic_factor": 3.0,
        "jurisdiction_authority": "Tamil Nadu Road Development Company (TNRDC) / GCC",
        "district": "Chennai",
        "coordinates": [[80.2285, 12.9124], [80.2290, 12.9128]],
        "defects": [
            {
                "defect_id": "DEF-OMR-402A",
                "defect_type": "Transverse_Crack",
                "severity_level": "Low",
                "area_cm2": 600.0,
                "depth_cm": 0.8,
                "span_cm": 150.0,
                "confidence": 0.82,
                "lat": 12.9126,
                "lon": 80.2287
            }
        ]
    },

    # -------------------------------------------------------------
    # Corridor 5: NH-48 (Chennai - Bengaluru Industrial Highway)
    # Heavy Freight & Automotive Logistics Corridor
    # -------------------------------------------------------------
    {
        "segment_id": "NH48-SEG-501",
        "road_name": "NH-48",
        "corridor_description": "NH-48 Sriperumbudur - Walajapet Industrial Section (Km 42.100)",
        "chainage_start_km": 42.100,
        "chainage_end_km": 42.150,
        "length_meters": 50.0,
        "width_meters": 10.5,
        "pci": 24.0,  # Critical Condition
        "sri": 86.2,
        "traffic_factor": 3.0,
        "jurisdiction_authority": "National Highways Authority of India (NHAI) - PIU Kanchipuram",
        "district": "Kanchipuram / Ranipet",
        "coordinates": [[79.9400, 12.9600], [79.9405, 12.9604]],
        "defects": [
            {
                "defect_id": "DEF-NH48-501A",
                "defect_type": "Pothole",
                "severity_level": "Critical",
                "area_cm2": 3500.0,
                "depth_cm": 8.0,
                "span_cm": 62.0,
                "confidence": 0.95,
                "lat": 12.9601,
                "lon": 79.9401
            },
            {
                "defect_id": "DEF-NH48-501B",
                "defect_type": "Alligator_Crack",
                "severity_level": "High",
                "area_cm2": 7200.0,
                "depth_cm": 3.0,
                "span_cm": 115.0,
                "confidence": 0.90,
                "lat": 12.9603,
                "lon": 79.9403
            }
        ]
    },

    # -------------------------------------------------------------
    # Corridor 6: ECR (East Coast Road / SH-49)
    # Coastal Marine Pavement with Salt Spray & Subgrade Moisture
    # -------------------------------------------------------------
    {
        "segment_id": "ECR-SEG-601",
        "road_name": "ECR Coastal Highway",
        "corridor_description": "East Coast Scenic Highway (Akkarai - Mahabalipuram, Km 28.400)",
        "chainage_start_km": 28.400,
        "chainage_end_km": 28.450,
        "length_meters": 50.0,
        "width_meters": 8.0,
        "pci": 31.0,  # High Moderate Risk
        "sri": 72.5,
        "traffic_factor": 2.2,
        "jurisdiction_authority": "Tamil Nadu Road Infrastructure Development Corp (TNRIDC)",
        "district": "Chengalpattu",
        "coordinates": [[80.2450, 12.7800], [80.2455, 12.7804]],
        "defects": [
            {
                "defect_id": "DEF-ECR-601A",
                "defect_type": "Water_Accumulation",
                "severity_level": "Critical",
                "area_cm2": 16000.0,
                "depth_cm": 6.0,
                "span_cm": 380.0,
                "confidence": 0.94,
                "lat": 12.7801,
                "lon": 80.2451
            },
            {
                "defect_id": "DEF-ECR-601B",
                "defect_type": "Transverse_Crack",
                "severity_level": "High",
                "area_cm2": 1400.0,
                "depth_cm": 2.0,
                "span_cm": 350.0,
                "confidence": 0.88,
                "lat": 12.7803,
                "lon": 80.2453
            }
        ]
    }
]


def get_all_segments() -> List[Dict[str, Any]]:
    """Return all mock road segments."""
    return MOCK_ROAD_NETWORK


def get_segments_by_road(road_name: str) -> List[Dict[str, Any]]:
    """Case-insensitive filter by road name / corridor."""
    norm = road_name.strip().lower().replace("-", "").replace(" ", "").replace("_", "")
    results = []
    for seg in MOCK_ROAD_NETWORK:
        seg_norm = seg["road_name"].lower().replace("-", "").replace(" ", "").replace("_", "")
        desc_norm = seg.get("corridor_description", "").lower().replace("-", "").replace(" ", "").replace("_", "")
        if norm in seg_norm or seg_norm in norm or norm in desc_norm:
            results.append(seg)
    return results


def get_segment_by_id(segment_id: str) -> Optional[Dict[str, Any]]:
    """Find segment by exact or case-insensitive segment_id."""
    for seg in MOCK_ROAD_NETWORK:
        if seg["segment_id"].upper() == segment_id.strip().upper():
            return seg
    return None
