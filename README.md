# 🛣️ AI-Powered Road Condition Intelligence & Maintenance Prioritization System

An enterprise-grade, end-to-end intelligent road pavement inspection and maintenance management platform. Built on a **Two-Model Cascade Deep Learning Architecture**, it continuously detects roadway hazards, assesses defect severity and physical metrics, aggregates Defect Risk Scores (DRS) and 50-meter Segment Risk Indices (SRI), and automatically generates prioritized civil engineering work orders with interactive GIS mapping.

---

## 🏛️ System Architecture

```
                                    ┌────────────────────────┐
                                    │ Road Video / Frames   │
                                    │ + GPS Telemetry (.csv) │
                                    └───────────┬────────────┘
                                                │
                                                ▼
                                ┌───────────────────────────────┐
                                │   MODEL 1: YOLOv8 / YOLOv11   │
                                │   Object Defect Detector      │
                                └───────────────┬───────────────┘
                                                │ Bounding Boxes [x1, y1, x2, y2]
                                                │ + Defect Classes & Confidence
                                                ▼
                                ┌───────────────────────────────┐
                                │   10px Padded Patch Cropping  │
                                └───────────────┬───────────────┘
                                                │ Cropped Defect Patches
                                                ▼
                                ┌───────────────────────────────┐
                                │   MODEL 2: Severity Grader    │
                                │   & Physical Extent Estimator │
                                └───────────────┬───────────────┘
                                                │ Severity: Low/Medium/High/Critical
                                                │ Area (cm²), Depth Index, Span (cm)
                                                ▼
                                ┌───────────────────────────────┐
                                │         RISK ENGINE           │
                                │  • Defect Risk Score (DRS)    │
                                │  • 50m Segment Risk (SRI)     │
                                └───────────────┬───────────────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
        ┌─────────────────────────┐                           ┌─────────────────────────┐
        │  GEO-MAPPER & GIS LAYER │                           │  MAINTENANCE ENGINE     │
        │  • 50m Spatial Binning  │                           │  • Action Taxonomy      │
        │  • GeoJSON Generation   │                           │  • Budget Costing       │
        │  • GPS Synchronization  │                           │  • Work Order Priority  │
        └────────────┬────────────┘                           └────────────┬────────────┘
                     │                                                     │
                     └──────────────────────────┬──────────────────────────┘
                                                ▼
                                ┌───────────────────────────────┐
                                │ INTERACTIVE STREAMLIT DASHBOARD│
                                │ • Folium GIS Map Visualization│
                                │ • Segment Risk Profiles       │
                                │ • Defect Gallery & Inspection │
                                │ • CSV & GeoJSON Export Orders │
                                └───────────────────────────────┘
```

---

## 📐 Mathematical Formulation

### 1. Defect Risk Score ($\text{DRS}$)
For an individual defect detected on the pavement:
$$\text{DRS} = w_{\text{type}} \times S_{\text{severity}} \times \left(1 + \delta \cdot \min\left(1.5, \frac{\text{Area}_{\text{cm}^2}}{1000}\right)\right) \times (0.85 + 0.15 \cdot \text{Conf})$$

Where:
- $w_{\text{type}}$: Hazard hazard weighting multiplier (`Pothole: 1.40`, `Alligator_Crack: 1.25`, `Water_Accumulation: 1.15`, `Transverse_Crack: 1.00`, `Longitudinal_Crack: 0.95`).
- $S_{\text{severity}}$: Discrete severity level base score (`Low: 1.0`, `Medium: 2.2`, `High: 3.8`, `Critical: 5.5`).
- $\delta = 0.35$: Physical surface area elasticity factor.

### 2. Segment Risk Index ($\text{SRI}$, 0–100)
For a contiguous 50-meter road segment with $N$ detected hazards:
$$\text{SRI} = \min\left(100.0, \; \alpha \sum_{i=1}^N \text{DRS}_i + \beta \max_{i}(\text{DRS}_i) + \gamma (\text{TrafficFactor} - 1.0) \times 10\right)$$

- $\alpha = 3.5$: Cumulative defect density weight.
- $\beta = 6.0$: Peak severity hazard weight.
- $\gamma = 2.5$: Traffic volume impact factor ($\text{TrafficFactor} \in [1.0, 3.0]$).

### 3. Pavement Condition Index ($\text{PCI}$) Equivalent
$$\text{PCI} = \max(0.0, \min(100.0, 100.0 - (\text{SRI} \times 0.95)))$$

| Condition Band | Segment Risk Index (SRI) | PCI Range | Color Code | Urgency Classification |
| :--- | :--- | :--- | :--- | :--- |
| 🟢 **Good** | $0.0 \le \text{SRI} < 30.0$ | $70 - 100$ | `#10B981` | Routine Inspection (30–90 days) |
| 🟠 **Moderate** | $30.0 \le \text{SRI} < 70.0$ | $30 - 70$ | `#F59E0B` | Priority Maintenance (7–14 days) |
| 🔴 **Critical** | $70.0 \le \text{SRI} \le 100.0$ | $0 - 30$ | `#EF4444` | Immediate Intervention (24–48 hours) |

---

## 🛠️ Civil Engineering Maintenance Taxonomy

| Hazard Type | Severity | Engineering Action | Estimated Unit Cost | Required Equipment & Materials |
| :--- | :--- | :--- | :--- | :--- |
| **Pothole** | `Critical` | Emergency Full-Depth Hot Asphalt Patching & Base Compaction | $280 | Asphalt Saw-Cutter, Plate Compactor, HMA PG 64-22 |
| **Pothole** | `High` | Semi-Permanent Hot Asphalt Patching | $190 | Pavement Breaker, Vibratory Roller, Tack Emulsion |
| **Pothole** | `Medium` | Injection Patching / Cold Mix Infill | $110 | Spray Injection Truck, Polymer Cationic Emulsion |
| **Pothole** | `Low` | Preventive Surface Leveling & Monitoring | $45 | Cold Pour Asphalt Mastic, Hand Tamper |
| **Alligator Crack** | `Critical` | Deep Structural Base Reconstruction & Full-Depth Overlay | $650 | Cold Milling Machine, Dense Base Course Aggregate |
| **Alligator Crack** | `High` | Mill & Inlay Asphalt Resurfacing | $380 | Pavement Planer, Fiber-Reinforced Asphalt |
| **Alligator Crack** | `Medium` | Heavy Polymer Micro-Surfacing & Geotextile Membrane | $220 | Micro-Surfacing Paver, Stress-Absorbing Fabric |
| **Transverse Crack** | `Critical` | Crack Routing, Deep Backer Rod & Hot Rubberized Sealant | $160 | Crack Router, Hot-Air Lance, ASTM D6690 Sealant |
| **Longitudinal Crack** | `High` | Hot Rubberized Joint Sealing | $90 | Crack Melter Applicator, Elastomeric Sealant |
| **Water Ponding** | `Critical` | Drainage Culvert Clearing & Shoulder Cross-Slope Regrading | $420 | Vactor Jet-Rodder, Motor Grader, Rip-Rap Rock |

---

## 🚀 Quickstart Guide

### 1. Prerequisites & Environment Setup
```bash
# Clone and enter project directory
cd road_condition_intelligence

# Create virtual environment with Python 3.11
py -3.11 -m venv .venv

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install all dependencies
pip install -r requirements.txt
```

### 2. Run Automated Test Suite
```bash
pytest -v tests/test_pipeline.py
```

### 3. Launch Interactive Streamlit Dashboard
```bash
streamlit run app.py
```
Open your browser at `http://localhost:8501`.

---

## 📁 Repository Structure

```
road_condition_intelligence/
├── requirements.txt         # Pinned production dependencies
├── README.md                # System documentation & technical specifications
├── app.py                   # Interactive Streamlit dashboard with Folium GIS map
├── src/
│   ├── __init__.py          # Package initialization
│   ├── detector.py          # Model 1: YOLO defect detection and bounding box extraction
│   ├── severity.py          # Model 2: 10px padded patch cropping, severity grading & GSD area
│   ├── risk_engine.py       # Defect Risk Score (DRS) & Segment Risk Index (SRI) calculations
│   ├── geo_mapper.py        # GPS alignment, 50m spatial binning, GeoJSON generation
│   ├── recommender.py       # Civil engineering maintenance action & work order rules
│   ├── sample_data.py       # Synthetic road inspection frame and GPS route generator
│   └── pipeline.py          # Master orchestrator chaining all modules end-to-end
├── tests/
│   └── test_pipeline.py     # Unit and integration test suite
└── sample_data/             # Generated synthetic inspection frames & synchronized GPS logs
```

---

## 📊 Export Formats
1. **Work Orders (`.csv`)**: Municipal maintenance task schedules sorted by SRI and urgency.
2. **GIS Layers (`.geojson`)**: LineStrings for 50m road segments and Points for detected defects with styling metadata for ArcGIS, QGIS, and Mapbox.
3. **Defect Inventory (`.csv`)**: Frame-by-frame log containing bounding boxes, estimated physical area ($cm^2$), and DRS.
