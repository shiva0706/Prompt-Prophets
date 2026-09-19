import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "lucide-react";

interface LiveGisMapProps {
  selectedCorridor: string;
}

const TILE_LAYERS = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri World Imagery",
    maxZoom: 18,
  },
  map: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
  layer: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; CARTO Dark Matter",
    maxZoom: 19,
  },
};

const CORRIDOR_MAP_DATA: Record<
  string,
  {
    center: [number, number];
    zoom: number;
    town1: { name: string; pos: [number, number] };
    town2: { name: string; pos: [number, number] };
    segments: Array<{
      coords: [number, number][];
      color: string;
      label: string;
      severity: "Critical" | "Moderate" | "Healthy";
      desc: string;
    }>;
  }
> = {
  "NH-44": {
    center: [11.275, 77.5828],
    zoom: 12,
    town1: { name: "Perundurai", pos: [11.277, 77.585] },
    town2: { name: "Erode", pos: [11.341, 77.717] },
    segments: [
      {
        coords: [
          [11.23, 77.52],
          [11.25, 77.55],
          [11.275, 77.5828],
        ],
        color: "#ef4444",
        label: "Km 537 - 542",
        severity: "Critical",
        desc: "Pavement Rutting (3.8 cm) • Critical Repair SLA < 24h",
      },
      {
        coords: [
          [11.275, 77.5828],
          [11.3, 77.62],
        ],
        color: "#f59c0b",
        label: "Km 541 - 426",
        severity: "Moderate",
        desc: "Alligator Cracking • Scheduled Patching",
      },
      {
        coords: [
          [11.3, 77.62],
          [11.34, 77.68],
        ],
        color: "#10b981",
        label: "Km 548 - 552",
        severity: "Healthy",
        desc: "Pavement in Good Condition • IRI 1.8 m/km",
      },
    ],
  },
  "NH-48": {
    center: [18.5204, 73.8567],
    zoom: 12,
    town1: { name: "Pune", pos: [18.5204, 73.8567] },
    town2: { name: "Satara", pos: [18.6000, 73.9300] },
    segments: [
      {
        coords: [
          [18.45, 73.8],
          [18.52, 73.8567],
        ],
        color: "#f59c0b",
        label: "Km 312 - 426",
        severity: "Moderate",
        desc: "Moderate Transverse Cracks • Maintenance Alert",
      },
      {
        coords: [
          [18.52, 73.8567],
          [18.6, 73.93],
        ],
        color: "#10b981",
        label: "Km 426 - 510",
        severity: "Healthy",
        desc: "Healthy Pavement Surface",
      },
    ],
  },
  "NH-16": {
    center: [16.5062, 80.648],
    zoom: 12,
    town1: { name: "Vijayawada", pos: [16.5062, 80.648] },
    town2: { name: "Guntur", pos: [16.45, 80.59] },
    segments: [
      {
        coords: [
          [16.45, 80.59],
          [16.5062, 80.648],
          [16.54, 80.68],
        ],
        color: "#10b981",
        label: "Km 27 - 98",
        severity: "Healthy",
        desc: "Smooth Highway Deck • ASTM Compliant",
      },
    ],
  },
  "NH-27": {
    center: [24.5854, 73.7125],
    zoom: 12,
    town1: { name: "Udaipur", pos: [24.5854, 73.7125] },
    town2: { name: "Chittorgarh", pos: [24.61, 73.74] },
    segments: [
      {
        coords: [
          [24.54, 73.66],
          [24.5854, 73.7125],
        ],
        color: "#f59c0b",
        label: "Km 145 - 178",
        severity: "Moderate",
        desc: "Surface Raveling Detected",
      },
    ],
  },
  "NH-75": {
    center: [12.9716, 77.5946],
    zoom: 12,
    town1: { name: "Bengaluru", pos: [12.9716, 77.5946] },
    town2: { name: "Hassan", pos: [13.01, 77.63] },
    segments: [
      {
        coords: [
          [12.93, 77.54],
          [12.9716, 77.5946],
          [13.01, 77.63],
        ],
        color: "#10b981",
        label: "Km 83 - 120",
        severity: "Healthy",
        desc: "Resurfaced Express Lane",
      },
    ],
  },
};

export const LiveGisMap: React.FC<LiveGisMapProps> = ({ selectedCorridor }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<"satellite" | "map" | "layer">("satellite");

  const corridorData = CORRIDOR_MAP_DATA[selectedCorridor] || CORRIDOR_MAP_DATA["NH-44"];

  // Initialize Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: corridorData.center,
      zoom: corridorData.zoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Add initial tile layer (Satellite by default)
    const currentTile = TILE_LAYERS.satellite;
    const tileLayer = L.tileLayer(currentTile.url, {
      maxZoom: currentTile.maxZoom,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);

    tileLayerRef.current = tileLayer;
    layersGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle active layer changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const map = mapInstanceRef.current;
    map.removeLayer(tileLayerRef.current);

    const newTileConfig = TILE_LAYERS[activeLayer];
    const newTileLayer = L.tileLayer(newTileConfig.url, {
      maxZoom: newTileConfig.maxZoom,
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [activeLayer]);

  // Handle corridor selection & update geometry
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // Fly to new corridor center smoothly
    map.flyTo(corridorData.center, corridorData.zoom, { duration: 1.2 });

    // Render road segments as colored polylines
    corridorData.segments.forEach((seg) => {
      // Glow outer line
      L.polyline(seg.coords, {
        color: seg.color,
        weight: 8,
        opacity: 0.35,
        lineCap: "round",
      }).addTo(group);

      // Core route line
      const line = L.polyline(seg.coords, {
        color: seg.color,
        weight: 4,
        opacity: 0.95,
        lineCap: "round",
      }).addTo(group);

      // Popup on line click
      line.bindPopup(`
        <div style="font-family: Inter, sans-serif; padding: 4px;">
          <div style="font-weight: 800; color: ${seg.color}; font-size: 13px;">${seg.label} (${seg.severity})</div>
          <div style="font-size: 12px; color: #334155; margin-top: 4px;">${seg.desc}</div>
        </div>
      `);

      // Place waypoint markers at the start of each segment
      const startPoint = seg.coords[0];
      const customIcon = L.divIcon({
        className: "custom-map-pin",
        html: `
          <div style="
            background: ${seg.color};
            color: #ffffff;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 0 8px ${seg.color};
            cursor: pointer;
          "></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker(startPoint, { icon: customIcon }).addTo(group);
      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; padding: 4px;">
          <div style="font-weight: 800; color: ${seg.color}; font-size: 13px;">${seg.label}</div>
          <div style="font-size: 12px; color: #475569; margin-top: 3px;"><strong>Status:</strong> ${seg.severity}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${seg.desc}</div>
        </div>
      `);
    });

    // Town label markers
    const createTownMarker = (name: string, pos: [number, number]) => {
      const townIcon = L.divIcon({
        className: "town-label",
        html: `
          <div style="
            background: rgba(9, 20, 38, 0.85);
            backdrop-filter: blur(4px);
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.25);
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          ">
            📍 ${name}
          </div>
        `,
        iconSize: [80, 22],
        iconAnchor: [40, 11],
      });
      L.marker(pos, { icon: townIcon }).addTo(group);
    };

    if (corridorData.town1) createTownMarker(corridorData.town1.name, corridorData.town1.pos);
    if (corridorData.town2) createTownMarker(corridorData.town2.name, corridorData.town2.pos);
  }, [selectedCorridor]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  return (
    <section className="card mapcard" style={{ padding: "16px", overflow: "hidden" }}>
      {/* Map Header with Layer Switcher */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Navigation size={16} color="#2463eb" />
          <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)" }}>
            GIS Map - {selectedCorridor}
          </span>
        </div>

        {/* Live Tile Switcher (Satellite / Map / Dark Layer) */}
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "6px", padding: "2px" }}>
          {(["satellite", "map", "layer"] as const).map((layerKey) => {
            const isActive = activeLayer === layerKey;
            return (
              <button
                key={layerKey}
                onClick={() => setActiveLayer(layerKey)}
                style={{
                  padding: "3px 9px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? "#091426" : "transparent",
                  color: isActive ? "#ffffff" : "#61799c",
                  textTransform: "capitalize",
                  transition: "all 0.15s ease",
                }}
              >
                {layerKey}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Map Canvas Container */}
      <div
        style={{
          height: "280px",
          width: "100%",
          borderRadius: "10px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)",
        }}
      >
        {/* Leaflet DOM Anchor */}
        <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />

        {/* Floating Highway HUD Pill */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            background: "rgba(9, 20, 38, 0.88)",
            backdropFilter: "blur(6px)",
            color: "#ffffff",
            fontSize: "11px",
            fontWeight: 800,
            padding: "4px 10px",
            borderRadius: "6px",
            border: "1px solid rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            zIndex: 1000,
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          <span style={{ color: "#38bdf8" }}>➤</span>
          <span>{selectedCorridor} GIS Telemetry</span>
        </div>

        {/* Live GPS Zoom Controls */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            right: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            zIndex: 1000,
          }}
        >
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "5px",
              background: "rgba(9, 20, 38, 0.9)",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: 700,
            }}
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "5px",
              background: "rgba(9, 20, 38, 0.9)",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: 700,
            }}
          >
            −
          </button>
        </div>
      </div>
    </section>
  );
};
