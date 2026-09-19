import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  Compass,
  History,
  MapPin,
  Navigation,
  Send,
  UploadCloud,
  Wrench,
} from "lucide-react";
import type { FullRoadInspectionReport, RoadDefectItem, InspectionFrameItem } from "../types";

interface HomePageProps {
  report: FullRoadInspectionReport | null;
  onNavigate: (tabId: string) => void;
  onOpenAlertModal?: (defect: RoadDefectItem) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  report,
  onNavigate,
  onOpenAlertModal,
}) => {
  const summary = report?.summary || {
    total_defects_count: 8,
    total_potholes: 3,
    total_cracks: 4,
    total_water_ponding: 1,
    mean_route_sri: 52.4,
    mean_route_pci: 48.6,
    critical_segments_count: 1,
    total_segments_count: 8,
    immediate_work_orders: 2,
    total_estimated_budget_inr: 450000,
  };

  const corridor = report?.corridor || {
    name: "Rajiv Gandhi Salai / State Highway 49A (OMR IT Expressway)",
    road_name: "SH-49A OMR Expressway",
    traffic_density: "Heavy Commuter (38k PCU/day)",
    speed_limit_kmh: 60,
  };

  const criticalSegments = (report?.segments || []).filter(
    (s) => s.condition_band === "Critical"
  );
  const allDefects: RoadDefectItem[] = (report?.frames || []).flatMap(
    (f: InspectionFrameItem) => f.detections || []
  );
  const dispatchedAlerts = report?.dispatched_alerts || [];

  const modules = [
    {
      id: "inspection",
      title: "Defect Localization Studio",
      icon: Camera,
      badge: `${report?.frames.length || 8} Frames`,
      badgeColor: "badge-cyan",
      description: "Dual-panel view comparing camera frames with AI defect bounding boxes & 3D Depth heatmaps.",
    },
    {
      id: "image_scan",
      title: "Video Analysis & Ingestion",
      icon: UploadCloud,
      badge: "Fast Ingest",
      badgeColor: "badge-violet",
      description: "Ingest dashcam footage or video links for instant defect detection and depth profiling.",
    },
    {
      id: "gis_map",
      title: "GIS Route & Telemetry Map",
      icon: Navigation,
      badge: "SH-49A GPS",
      badgeColor: "badge-amber",
      description: "50m spatial hazard binning along State Highway 49A with live government dispatch pins.",
    },
    {
      id: "authority_alerts",
      title: "Authority Dispatch Center",
      icon: Building2,
      badge: `${dispatchedAlerts.length} Dispatched`,
      badgeColor: "badge-emerald",
      description: "Automated notice generation and webhook dispatch to TN-SHD, NHAI, and GCC with SLAs.",
    },
    {
      id: "maintenance",
      title: "Maintenance & Work Orders",
      icon: Wrench,
      badge: `${summary.immediate_work_orders || 2} Orders`,
      badgeColor: "badge-rose",
      description: "MoRTH Section 500 & IRC:82-2015 repair prioritization matrix and contractor dockets.",
    },
    {
      id: "historical",
      title: "Temporal Degradation Analytics",
      icon: History,
      badge: "3 Cycles",
      badgeColor: "badge-cyan",
      description: "Compare baseline, intermediate, and current surveys with predictive degradation curves.",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      
      {/* Minimal Header Hero */}
      <div
        className="glass-panel fade-in-up"
        style={{
          padding: "18px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          borderLeft: "4px solid #0284c7",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span className="cyber-badge badge-emerald" style={{ fontSize: "0.68rem" }}>🟢 Live Inspection</span>
            <span className="cyber-badge badge-cyan" style={{ fontSize: "0.68rem" }}>SH-49A OMR</span>
            <span className="cyber-badge badge-mono" style={{ fontSize: "0.68rem" }}>MoRTH &amp; IRC:82</span>
          </div>
          <h2 style={{ fontSize: "1.28rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            {corridor.name}
          </h2>
          <p style={{ fontSize: "0.80rem", color: "var(--text-secondary)", margin: "3px 0 0 0" }}>
            Real-time pavement condition indexing, 50m spatial hazard mapping, and municipal government dispatch.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => onNavigate("gis_map")}
            className="btn-cyber-primary"
            style={{ padding: "8px 14px", fontSize: "0.80rem" }}
          >
            <Compass size={14} />
            <span>Open GIS Map</span>
            <ArrowRight size={13} />
          </button>
          <button
            onClick={() => onNavigate("authority_alerts")}
            className="btn-cyber-secondary"
            style={{ padding: "8px 14px", fontSize: "0.80rem" }}
          >
            <Building2 size={14} />
            <span>Govt Notices ({dispatchedAlerts.length})</span>
          </button>
        </div>
      </div>

      {/* Critical Hazard Quick Alert */}
      {criticalSegments.length > 0 && (
        <div
          className="glass-panel fade-in-up"
          style={{
            padding: "12px 18px",
            background: "rgba(239, 68, 68, 0.04)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderLeft: "4px solid #ef4444",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle size={18} color="#ef4444" />
            <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#dc2626" }}>
              Action Required: Critical Pothole D40 on {criticalSegments[0].nearby_landmark || criticalSegments[0].segment_id} (PCI: {criticalSegments[0].pci_score}/100)
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => onNavigate("gis_map")}
              className="btn-cyber-danger"
              style={{ padding: "5px 10px", fontSize: "0.74rem" }}
            >
              <MapPin size={11} />
              <span>Locate on Map</span>
            </button>
            <button
              onClick={() => onNavigate("maintenance")}
              className="btn-cyber-secondary"
              style={{ padding: "5px 10px", fontSize: "0.74rem" }}
            >
              <Wrench size={11} />
              <span>Repair Protocol</span>
            </button>
          </div>
        </div>
      )}

      {/* Minimal 6-Module Quick Launch Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "12px",
        }}
      >
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              onClick={() => onNavigate(m.id)}
              className="glass-panel"
              style={{
                padding: "15px 18px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer",
                borderRadius: "10px",
                transition: "all 0.15s ease",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(2, 132, 199, 0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={16} color="#0284c7" />
                    </div>
                    <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)" }}>
                      {m.title}
                    </span>
                  </div>
                  <span className={`cyber-badge ${m.badgeColor}`} style={{ fontSize: "0.66rem" }}>
                    {m.badge}
                  </span>
                </div>
                <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.4, margin: "0 0 10px 0" }}>
                  {m.description}
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", color: "#0284c7", fontSize: "0.74rem", fontWeight: 700, gap: "4px" }}>
                <span>Launch</span>
                <ArrowRight size={12} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact Active Hazards Summary Table */}
      <div className="glass-panel" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
            Active Hazard Inventory ({allDefects.length} Localized Road Defects)
          </div>
          <button
            onClick={() => onNavigate("inspection")}
            className="btn-cyber-secondary"
            style={{ padding: "4px 10px", fontSize: "0.72rem" }}
          >
            <span>Full Studio</span>
            <ArrowRight size={11} />
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="cyber-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Classification</th>
                <th>Severity</th>
                <th>Location / Segment</th>
                <th>Dimensions</th>
                <th>Authority</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {allDefects.slice(0, 4).map((d: RoadDefectItem, idx: number) => {
                const isCrit = d.severity_level === "Critical";
                const isDispatched = dispatchedAlerts.some((a) => a.defect_id === d.defect_id);
                const authName = typeof d.responsible_authority === "object" && d.responsible_authority !== null
                  ? (d.responsible_authority.short_name || d.responsible_authority.name || "TN-SHD")
                  : (d.responsible_authority || "TN-SHD");

                return (
                  <tr key={d.defect_id || idx}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0284c7" }}>
                      {d.defect_id}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {d.defect_type.replace(/_/g, " ")}
                    </td>
                    <td>
                      <span className={`cyber-badge ${isCrit ? "badge-rose" : "badge-amber"}`} style={{ fontSize: "0.66rem" }}>
                        {d.severity_level}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.76rem" }}>
                      {d.nearby_landmark || d.segment_id}
                    </td>
                    <td style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                      {d.estimated_depth_cm || 5.8}cm depth • {d.estimated_area_cm2 || 380}cm²
                    </td>
                    <td style={{ fontSize: "0.74rem", fontWeight: 700, color: "#047857" }}>
                      {authName}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "5px" }}>
                        <button
                          onClick={() => onNavigate("gis_map")}
                          className="btn-cyber-secondary"
                          style={{ padding: "3px 7px", fontSize: "0.70rem" }}
                          title="View on Map"
                        >
                          <MapPin size={10} />
                          <span>Map</span>
                        </button>
                        {isDispatched ? (
                          <span className="cyber-badge badge-emerald" style={{ fontSize: "0.64rem" }}>
                            <CheckCircle2 size={10} /> Dispatched
                          </span>
                        ) : (
                          onOpenAlertModal && (
                            <button
                              onClick={() => onOpenAlertModal(d)}
                              className="btn-cyber-primary"
                              style={{ padding: "3px 7px", fontSize: "0.70rem" }}
                              title="Dispatch to Govt"
                            >
                              <Send size={10} />
                              <span>Dispatch</span>
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Minimal Authorities Strip */}
      <div
        className="glass-panel"
        style={{
          padding: "10px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          fontSize: "0.76rem",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Building2 size={14} color="#0284c7" />
          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Designated Authorities:</span>
        </div>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <span>🏛️ <strong>TN State Highways:</strong> 1800-425-4949 (SLA &lt; 24h)</span>
          <span>🛣️ <strong>NHAI:</strong> 1033 (SLA &lt; 12h)</span>
          <span>🏙️ <strong>GCC:</strong> 1913 (SLA &lt; 24h)</span>
        </div>
        <button
          onClick={() => onNavigate("authority_alerts")}
          style={{ background: "none", border: "none", color: "#0284c7", fontWeight: 700, cursor: "pointer", fontSize: "0.74rem" }}
        >
          View Dispatch Center →
        </button>
      </div>

    </div>
  );
};
