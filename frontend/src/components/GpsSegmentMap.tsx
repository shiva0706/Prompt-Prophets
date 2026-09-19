import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import {
  MapPin,
  Navigation,
  AlertTriangle,
  ExternalLink,
  Compass,
  ZoomIn,
  ZoomOut,
  Send,
  Building2,
  CheckCircle2,
} from "lucide-react";
import type { FullRoadInspectionReport, RoadSegmentItem, RoadDefectItem, DispatchedAlertRecord } from "../types";

interface GpsSegmentMapProps {
  report: FullRoadInspectionReport | null;
  onSelectSegment?: (segmentId: string) => void;
  onOpenAlertModal?: (defect: RoadDefectItem) => void;
}

export const GpsSegmentMap: React.FC<GpsSegmentMapProps> = ({
  report,
  onSelectSegment,
  onOpenAlertModal,
}) => {
  const [selectedSegId, setSelectedSegId] = useState<string>("SEG-001");
  const [filterBand, setFilterBand] = useState<string>("ALL");
  const [mapLayerType, setMapLayerType] = useState<"osm" | "esri_street" | "satellite">("osm");
  const [selectedGovtDocket, setSelectedGovtDocket] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const segments: RoadSegmentItem[] = report?.segments || [];
  const dispatchedAlerts: DispatchedAlertRecord[] = report?.dispatched_alerts || [];

  const corridor = report?.corridor || {
    name: "Rajiv Gandhi Salai / SH-49A (OMR IT Expressway)",
    start_lat: 12.98800,
    start_lon: 80.25360,
    end_lat: 12.92800,
    end_lon: 80.23400,
    traffic_density: "Heavy Commercial & Commuter (38,000 PCU/day)",
  };

  const filteredSegments = segments.filter((s) => {
    if (filterBand === "ALL") return true;
    return s.condition_band.toUpperCase() === filterBand.toUpperCase();
  });

  const selectedSegment: RoadSegmentItem | undefined =
    segments.find((s) => s.segment_id === selectedSegId) || segments[0];

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [corridor.start_lat, corridor.start_lon],
        zoom: 15,
        zoomControl: false,
      });

      // Layer Group for dynamic polylines and markers
      const lg = L.layerGroup().addTo(map);
      layerGroupRef.current = lg;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer with Free, Keyless, Unwatermarked Maps
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    if (mapLayerType === "esri_street") {
      url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
      attribution = "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom";
    } else if (mapLayerType === "satellite") {
      url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      attribution = "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";
    }

    const newTile = L.tileLayer(url, {
      attribution,
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = newTile;
  }, [mapLayerType]);

  // Update Markers, Polylines, and Government Dispatched Beacons
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    const lg = layerGroupRef.current;
    lg.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    // 1. Draw segment polylines and nodes along the true road geometry
    segments.forEach((seg) => {
      const isSelected = seg.segment_id === selectedSegId;
      const isCritical = seg.condition_band === "Critical";
      const isModerate = seg.condition_band === "Moderate";
      const color = isCritical ? "#ef4444" : isModerate ? "#f59e0b" : "#10b981";

      const startPt: [number, number] = [seg.start_lat, seg.start_lon];
      const endPt: [number, number] = [seg.end_lat, seg.end_lon];

      bounds.push(startPt);
      bounds.push(endPt);

      // Highway route polyline
      const polyline = L.polyline([startPt, endPt], {
        color: isSelected ? "#0284c7" : color,
        weight: isSelected ? 8 : 5,
        opacity: isSelected ? 1.0 : 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(lg);

      polyline.on("click", () => {
        setSelectedSegId(seg.segment_id);
        if (onSelectSegment) onSelectSegment(seg.segment_id);
      });

      // Segment Start Node Marker
      const nodeHtml = `
        <div style="
          width: ${isSelected ? "26px" : "20px"};
          height: ${isSelected ? "26px" : "20px"};
          border-radius: 50%;
          background: ${color};
          border: 3px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 10px;
          color: #ffffff;
          cursor: pointer;
        ">
          ${seg.segment_id.replace("SEG-00", "").replace("SEG-0", "").replace("SEG-", "")}
        </div>
      `;

      const nodeIcon = L.divIcon({
        html: nodeHtml,
        className: "custom-segment-pin",
        iconSize: [isSelected ? 26 : 20, isSelected ? 26 : 20],
        iconAnchor: [isSelected ? 13 : 10, isSelected ? 13 : 10],
      });

      const nodeMarker = L.marker(startPt, { icon: nodeIcon }).addTo(lg);
      nodeMarker.on("click", () => {
        setSelectedSegId(seg.segment_id);
        if (onSelectSegment) onSelectSegment(seg.segment_id);
      });

      // Defect pins placed accurately along the road segment line
      if (seg.defects && seg.defects.length > 0) {
        seg.defects.forEach((defect: RoadDefectItem, dIdx: number) => {
          const frac = (dIdx + 1) / (seg.defects.length + 1);
          const dLat = defect.lat || (seg.start_lat + (seg.end_lat - seg.start_lat) * frac);
          const dLon = defect.lon || (seg.start_lon + (seg.end_lon - seg.start_lon) * frac);
          const isCritDefect = defect.severity_level === "Critical";

          const hazardIconHtml = `
            <div style="
              width: 30px;
              height: 30px;
              border-radius: 50%;
              background: ${isCritDefect ? "#ef4444" : "#f59e0b"};
              border: 2px solid #ffffff;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-size: 14px;
              cursor: pointer;
            ">
              ${defect.defect_type.toLowerCase().includes("pothole") ? "🕳️" : "⚡"}
            </div>
          `;

          const defectIcon = L.divIcon({
            html: hazardIconHtml,
            className: "custom-hazard-pin",
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          const defectMarker = L.marker([dLat, dLon], { icon: defectIcon }).addTo(lg);

          defectMarker.bindPopup(`
            <div style="font-family: inherit; padding: 4px; min-width: 200px;">
              <div style="font-weight: 800; font-size: 0.88rem; color: #0f172a; margin-bottom: 4px;">
                ${defect.rdd_code || "D40"}: ${defect.defect_type.replace(/_/g, " ")}
              </div>
              <div style="font-size: 0.76rem; color: #475569; margin-bottom: 4px;">
                <strong>Segment:</strong> ${seg.segment_id} • Km ${(seg.start_distance_m / 1000).toFixed(2)}
              </div>
              <div style="font-size: 0.76rem; color: #475569; margin-bottom: 6px;">
                <strong>Depth:</strong> ${defect.estimated_depth_cm || 5.8}cm • <strong>Area:</strong> ${defect.estimated_area_cm2 || 420} cm²
              </div>
              <div style="font-weight: 800; font-size: 0.74rem; color: ${isCritDefect ? "#dc2626" : "#d97706"};">
                ${defect.severity_level.toUpperCase()} SEVERITY
              </div>
            </div>
          `);

          defectMarker.on("click", () => {
            setSelectedSegId(seg.segment_id);
          });
        });
      }
    });

    // 2. Render Official Government Dispatched Hazard Pins
    dispatchedAlerts.forEach((alert) => {
      const aLat = alert.lat || corridor.start_lat;
      const aLon = alert.lon || corridor.start_lon;

      bounds.push([aLat, aLon]);

      const govtPinHtml = `
        <div style="
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #047857;
          border: 3px solid #ffffff;
          box-shadow: 0 0 0 4px rgba(4, 120, 87, 0.35), 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 16px;
          cursor: pointer;
        ">
          🏛️
          <div style="
            position: absolute;
            top: -6px;
            right: -6px;
            background: #ef4444;
            color: white;
            font-size: 8px;
            font-weight: 900;
            padding: 1px 4px;
            border-radius: 6px;
            border: 1px solid white;
          ">
            GOVT
          </div>
        </div>
      `;

      const govtIcon = L.divIcon({
        html: govtPinHtml,
        className: "custom-govt-pin",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const govtMarker = L.marker([aLat, aLon], { icon: govtIcon, zIndexOffset: 1200 }).addTo(lg);

      govtMarker.bindPopup(`
        <div style="font-family: inherit; padding: 6px; min-width: 240px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="background: #047857; color: white; font-weight: 800; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px;">
              🏛️ OFFICIAL GOVT DISPATCH
            </span>
            <span style="font-weight: 700; font-size: 0.72rem; color: #047857;">
              ${alert.status || "DISPATCHED"}
            </span>
          </div>
          <div style="font-weight: 800; font-size: 0.90rem; color: #0f172a; margin-bottom: 4px;">
            Docket: ${alert.docket_id}
          </div>
          <div style="font-size: 0.76rem; color: #334155; margin-bottom: 3px;">
            <strong>Target Authority:</strong> ${alert.recipient_authority?.name || "TN State Highways (TN-SHD)"}
          </div>
          <div style="font-size: 0.76rem; color: #334155; margin-bottom: 3px;">
            <strong>Defect:</strong> ${alert.defect_type} (${alert.severity_level})
          </div>
          <div style="font-size: 0.74rem; color: #64748b; margin-bottom: 6px;">
            <strong>Location:</strong> ${alert.nearby_landmark || alert.road_name}
          </div>
          <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; font-size: 0.72rem; color: #0f172a; font-family: monospace;">
            Confirmation: ${alert.confirmation_code}
          </div>
        </div>
      `);

      govtMarker.on("click", () => {
        setSelectedGovtDocket(alert.docket_id);
        if (alert.segment_id) {
          setSelectedSegId(alert.segment_id);
        }
      });
    });

    // 3. Vehicle live position beacon on the road
    if (bounds.length > 0) {
      const carPos: [number, number] = [corridor.start_lat, corridor.start_lon];
      const carIconHtml = `
        <div style="
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #0284c7;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 16px;
        ">
          🚗
        </div>
      `;
      const carIcon = L.divIcon({
        html: carIconHtml,
        className: "custom-car-pin",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      L.marker(carPos, { icon: carIcon }).addTo(lg).bindPopup("<strong>Live Vehicle Dashcam Stream (4K HDR)</strong><br>Speed: 52 km/h • OMR Expressway Track Active");
    }

    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds as any, { padding: [40, 40] });
    }
  }, [segments, selectedSegId, dispatchedAlerts]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* Top Banner with Filter Tabs & Live Telemetry Summary */}
      <div
        className="glass-panel"
        style={{
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          borderLeft: "4px solid #0284c7",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(2, 132, 199, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Navigation size={22} color="#0284c7" />
          </div>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
              Real GIS Highway Trajectory &amp; 50m Segment Telemetry Map
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
              {corridor.name} • {segments.length} Spatial Segments • {dispatchedAlerts.length} Govt Dispatches Mapped
            </div>
          </div>
        </div>

        {/* Condition Filter Pills */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["ALL", "CRITICAL", "MODERATE", "GOOD"].map((band) => (
            <button
              key={band}
              onClick={() => setFilterBand(band)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "0.76rem",
                fontWeight: filterBand === band ? 800 : 600,
                border: "none",
                cursor: "pointer",
                background:
                  filterBand === band
                    ? band === "CRITICAL"
                      ? "#ef4444"
                      : band === "MODERATE"
                      ? "#f59e0b"
                      : band === "GOOD"
                      ? "#10b981"
                      : "#0284c7"
                    : "var(--bg-surface)",
                color: filterBand === band ? "#ffffff" : "var(--text-secondary)",
                boxShadow: filterBand === band ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
              }}
            >
              {band}
            </button>
          ))}
        </div>
      </div>

      {/* Government Dispatched Locations Banner */}
      {dispatchedAlerts.length > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: "14px 20px",
            background: "rgba(4, 120, 87, 0.06)",
            border: "1px solid rgba(4, 120, 87, 0.3)",
            borderLeft: "4px solid #047857",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(4, 120, 87, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={18} color="#047857" />
            </div>
            <div>
              <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#047857" }}>
                🏛️ {dispatchedAlerts.length} Official Government Notices Placed on GIS Map
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>
                Click any docket below to instantly pan the map to the reported government maintenance site.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {dispatchedAlerts.map((alt) => (
              <button
                key={alt.docket_id}
                onClick={() => {
                  setSelectedGovtDocket(alt.docket_id);
                  if (mapInstanceRef.current && alt.lat && alt.lon) {
                    mapInstanceRef.current.setView([alt.lat, alt.lon], 17, { animate: true });
                  }
                  if (alt.segment_id) {
                    setSelectedSegId(alt.segment_id);
                  }
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: selectedGovtDocket === alt.docket_id ? "#047857" : "#ffffff",
                  color: selectedGovtDocket === alt.docket_id ? "#ffffff" : "#047857",
                  border: "1.5px solid #047857",
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 6px rgba(4, 120, 87, 0.15)",
                }}
              >
                <span>🏛️</span>
                <span>{alt.docket_id}</span>
                <span style={{ fontSize: "0.68rem", opacity: 0.85 }}>({alt.defect_type})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Critical Segments Quick Links */}
      {segments.some((s) => s.condition_band === "Critical") && (
        <div
          className="glass-panel"
          style={{
            padding: "14px 20px",
            background: "rgba(239, 68, 68, 0.05)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderLeft: "4px solid #ef4444",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle size={20} color="#ef4444" />
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ef4444" }}>
                🚨 Immediate Fix Required: {segments.filter((s) => s.condition_band === "Critical").length} Critical Road Segments Detected
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>
                Severe potholes and fatigue cracking require urgent asphalt repair &lt; 24 hours.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {segments
              .filter((s) => s.condition_band === "Critical")
              .map((cs) => (
                <button
                  key={cs.segment_id}
                  onClick={() => {
                    setSelectedSegId(cs.segment_id);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.setView([cs.start_lat, cs.start_lon], 16, { animate: true });
                    }
                  }}
                  className="btn-cyber-danger"
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.74rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <MapPin size={12} />
                  <span>{cs.segment_id} (Km {(cs.start_distance_m / 1000.0).toFixed(2)})</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Main Map & Detail Panel Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "22px" }}>
        
        {/* Left: Real Leaflet Interactive GIS Map */}
        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Compass size={18} color="#0284c7" />
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                Live Interactive Satellite &amp; GIS Map View
              </h3>
            </div>

            {/* Map Layer Switcher & Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ display: "flex", background: "var(--bg-surface)", padding: "3px", borderRadius: "6px", border: "1px solid var(--border-glass)" }}>
                <button
                  onClick={() => setMapLayerType("osm")}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    fontWeight: mapLayerType === "osm" ? 800 : 500,
                    border: "none",
                    cursor: "pointer",
                    background: mapLayerType === "osm" ? "#0f172a" : "transparent",
                    color: mapLayerType === "osm" ? "#ffffff" : "var(--text-muted)",
                  }}
                >
                  Street Map (OSM)
                </button>
                <button
                  onClick={() => setMapLayerType("esri_street")}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    fontWeight: mapLayerType === "esri_street" ? 800 : 500,
                    border: "none",
                    cursor: "pointer",
                    background: mapLayerType === "esri_street" ? "#0f172a" : "transparent",
                    color: mapLayerType === "esri_street" ? "#ffffff" : "var(--text-muted)",
                  }}
                >
                  Clean GIS
                </button>
                <button
                  onClick={() => setMapLayerType("satellite")}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    fontWeight: mapLayerType === "satellite" ? 800 : 500,
                    border: "none",
                    cursor: "pointer",
                    background: mapLayerType === "satellite" ? "#0f172a" : "transparent",
                    color: mapLayerType === "satellite" ? "#ffffff" : "var(--text-muted)",
                  }}
                >
                  Satellite
                </button>
              </div>

              <button
                onClick={handleZoomIn}
                className="btn-cyber-secondary"
                style={{ padding: "5px 8px" }}
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={handleZoomOut}
                className="btn-cyber-secondary"
                style={{ padding: "5px 8px" }}
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
            </div>
          </div>

          {/* Leaflet Map Canvas */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "460px",
              borderRadius: "10px",
              overflow: "hidden",
              border: "1px solid var(--border-glass)",
            }}
          >
            <div
              ref={mapContainerRef}
              style={{
                width: "100%",
                height: "100%",
              }}
            />

            {/* Map Legend Overlay */}
            <div
              style={{
                position: "absolute",
                bottom: "12px",
                left: "12px",
                zIndex: 1000,
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-glass)",
                fontSize: "0.72rem",
                display: "flex",
                gap: "12px",
                alignItems: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                flexWrap: "wrap",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 700, color: "#ef4444" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} /> Critical (PCI &lt; 50)
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 700, color: "#f59e0b" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} /> Moderate (PCI 50-75)
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 700, color: "#10b981" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} /> Good (PCI &gt; 75)
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 800, color: "#047857" }}>
                <span>🏛️</span> Reported to Govt ({dispatchedAlerts.length})
              </span>
            </div>
          </div>
        </div>

        {/* Right: Selected Segment Detail Report */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {selectedSegment && (
            <div className="glass-panel" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                      {selectedSegment.segment_id} Detail Report
                    </h3>
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "3px" }}>
                    {selectedSegment.nearby_landmark || selectedSegment.road_name}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                    Chainage: {selectedSegment.start_distance_m}m - {selectedSegment.end_distance_m}m (50m bin)
                  </div>
                </div>

                <span
                  className="cyber-badge"
                  style={{
                    background: `${selectedSegment.band_color}18`,
                    color: selectedSegment.band_color,
                    border: `1.5px solid ${selectedSegment.band_color}60`,
                    fontWeight: 800,
                    fontSize: "0.76rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: selectedSegment.band_color }} />
                  {selectedSegment.condition_band.toUpperCase()}
                </span>
              </div>

              {/* Exact GPS Box */}
              <div style={{ background: "rgba(2, 132, 199, 0.06)", padding: "12px 14px", borderRadius: "8px", border: "1px solid rgba(2, 132, 199, 0.2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#0284c7" }}>
                    📍 Highway Coordinates (Centerline):
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${selectedSegment.start_lat},${selectedSegment.start_lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "0.72rem",
                      color: "#0284c7",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    <span>Open in Maps</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  Start: {selectedSegment.start_lat.toFixed(5)}°N, {selectedSegment.start_lon.toFixed(5)}°E<br />
                  End: &nbsp;{selectedSegment.end_lat.toFixed(5)}°N, {selectedSegment.end_lon.toFixed(5)}°E
                </div>
              </div>

              {/* PCI & SRI Index Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ background: "var(--bg-surface)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                    Segment Risk Index (SRI)
                  </div>
                  <div style={{ fontSize: "1.45rem", fontWeight: 900, color: selectedSegment.sri_score > 65 ? "#ef4444" : "#f59e0b", marginTop: "2px" }}>
                    {selectedSegment.sri_score} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>/ 100</span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                    Hazard Risk Factor
                  </div>
                </div>

                <div style={{ background: "var(--bg-surface)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                    Pavement Condition (PCI)
                  </div>
                  <div style={{ fontSize: "1.45rem", fontWeight: 900, color: selectedSegment.pci_score < 50 ? "#ef4444" : "#0284c7", marginTop: "2px" }}>
                    {selectedSegment.pci_score} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>/ 100</span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                    ASTM D6433 Standard
                  </div>
                </div>
              </div>

              {/* Defects within Segment with Direct Government Reporting Action */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                    Defects within Segment ({selectedSegment.defects?.length || 0}):
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                  {selectedSegment.defects && selectedSegment.defects.length > 0 ? (
                    selectedSegment.defects.map((d, dIdx) => {
                      const matchedGovtAlert = dispatchedAlerts.find(
                        (a) => a.defect_id === d.defect_id || a.segment_id === selectedSegment.segment_id
                      );

                      return (
                        <div
                          key={d.defect_id || dIdx}
                          style={{
                            background: d.severity_level === "Critical" ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            border: `1px solid ${d.severity_level === "Critical" ? "rgba(239, 68, 68, 0.25)" : "rgba(245, 158, 11, 0.25)"}`,
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                {d.defect_type.toLowerCase().includes("pothole") ? "🕳️" : "⚡"} {d.rdd_code || "D40"}: {d.defect_type.replace(/_/g, " ")}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                Area: {d.estimated_area_cm2 || 370} cm² • Depth: {d.estimated_depth_cm || 6.4} cm
                              </div>
                            </div>
                            <span
                              className={`cyber-badge ${d.severity_level === "Critical" ? "badge-rose" : "badge-amber"}`}
                              style={{ fontSize: "0.65rem", padding: "2px 6px" }}
                            >
                              {d.severity_level}
                            </span>
                          </div>

                          {/* Government Status or Dispatch Button */}
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2px" }}>
                            {matchedGovtAlert ? (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "#047857", fontWeight: 800 }}>
                                <CheckCircle2 size={13} />
                                <span>Reported: {matchedGovtAlert.docket_id}</span>
                              </div>
                            ) : (
                              onOpenAlertModal && (
                                <button
                                  onClick={() => onOpenAlertModal(d)}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: "4px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    border: "none",
                                    background: "#047857",
                                    color: "#ffffff",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                  }}
                                >
                                  <Send size={11} />
                                  <span>Report to Government</span>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      No major distress isolated in this 50m bin.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Segment Cards Carousel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: "10px",
        }}
      >
        {filteredSegments.map((s) => {
          const isSelected = s.segment_id === selectedSegId;
          const isCritical = s.condition_band === "Critical";
          const isModerate = s.condition_band === "Moderate";
          const color = isCritical ? "#ef4444" : isModerate ? "#f59e0b" : "#10b981";

          return (
            <div
              key={s.segment_id}
              onClick={() => {
                setSelectedSegId(s.segment_id);
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([s.start_lat, s.start_lon], 16, { animate: true });
                }
              }}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                background: isSelected ? "rgba(2, 132, 199, 0.12)" : "var(--bg-card)",
                border: isSelected ? "2px solid #0284c7" : "1px solid var(--border-glass)",
                borderLeft: `4px solid ${color}`,
                cursor: "pointer",
                transition: "all 0.18s ease",
                boxShadow: isSelected ? "0 4px 14px rgba(2, 132, 199, 0.2)" : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {s.segment_id}
                </span>
                <span
                  className="cyber-badge"
                  style={{
                    fontSize: "0.62rem",
                    padding: "1px 5px",
                    color,
                    background: `${color}18`,
                    border: `1px solid ${color}50`,
                    fontWeight: 800,
                  }}
                >
                  {s.condition_band}
                </span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                SRI: <strong style={{ color: "#0f172a" }}>{s.sri_score}</strong> • PCI: <strong style={{ color: "#0f172a" }}>{s.pci_score}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
