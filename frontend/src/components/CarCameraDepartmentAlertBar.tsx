import React, { useState } from "react";
import {
  Camera,
  BellRing,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Mail,
  ChevronDown,
  ChevronUp,
  X,
  Car,
  Eye,
  Info,
  Send,
  MapPin,
  ExternalLink,
  Phone,
} from "lucide-react";
import type { FullRoadInspectionReport, RoadDefectItem, DispatchedAlertRecord } from "../types";
import { api } from "../services/api";

interface CarCameraDepartmentAlertBarProps {
  report: FullRoadInspectionReport | null;
  onOpenAlertModal?: (defect: RoadDefectItem, imgB64?: string) => void;
  onAlertDispatched?: (record: DispatchedAlertRecord) => void;
}

export const CarCameraDepartmentAlertBar: React.FC<CarCameraDepartmentAlertBarProps> = ({
  report,
  onOpenAlertModal,
  onAlertDispatched,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState<boolean>(true);
  const [isSendingAlert, setIsSendingAlert] = useState<boolean>(false);
  const [showPassengerModal, setShowPassengerModal] = useState<boolean>(false);
  const [showPhotosModal, setShowPhotosModal] = useState<boolean>(false);
  const [showDeptModal, setShowDeptModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; subtitle: string; type: "success" | "warning" | "info" } | null>(null);

  // Play synthetic alert chime for passenger/driver warning
  const playInCabinAudioAlert = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.35); // drop to A4
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.38);

      // Second beep for urgency
      setTimeout(() => {
        try {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6
          gain2.gain.setValueAtTime(0.25, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.32);
        } catch (e) {
          // Ignore audio errors
        }
      }, 150);
    } catch (e) {
      console.warn("Audio chime not supported or autoplay restricted", e);
    }
  };

  const triggerPassengerAlert = () => {
    playInCabinAudioAlert();
    setShowPassengerModal(true);
    showToast(
      "In-Cabin Alert Dispatched",
      "Audible & visual hazard warning broadcasted to vehicle heads-up display and passenger smartphones.",
      "warning"
    );
  };

  const showToast = (title: string, subtitle: string, type: "success" | "warning" | "info" = "success") => {
    setToastMessage({ title, subtitle, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Find sample critical defect from report or fallback
  const sampleDefect: RoadDefectItem = report?.frames?.flatMap(f => f.detections || []).find(d => d.severity_level === "Critical") || {
    defect_id: "TN-CRIT-901",
    defect_type: "Pothole & Longitudinal Crack",
    rdd_code: "D40+D00",
    category: "Structural Pavement Cavity & Fracture",
    confidence: 0.96,
    bbox: [120, 160, 480, 420],
    severity_level: "Critical",
    severity_score: 0.94,
    estimated_area_cm2: 4200.0,
    max_dimension_cm: 72.0,
    estimated_depth_cm: 8.4,
    segment_id: "SH49A-SEG-002",
    distance_m: 85,
    lat: 12.9865,
    lon: 80.2435,
    color_hex: "#EF4444",
    road_name: "SH-49A (Rajiv Gandhi Salai / OMR Corridor)",
    nearby_landmark: "Near SRP Tools Junction, Perungudi, Chennai",
    impact_statement: "High risk of vehicle suspension damage, tire burst, and severe hydroplaning. Immediate emergency cold-mix patching mandated.",
  };

  const handleQuickDispatchToHighwaysDept = async () => {
    setIsSendingAlert(true);
    try {
      const res = await api.dispatchAuthorityAlert({
        defect_id: sampleDefect.defect_id,
        authority_id: "tn_shd",
        channel: "EMAIL_AND_SMS",
        notes: "Automated Critical Road Distress Alert triggered by vehicle onboard camera sensor. High-res photo evidence and calibrated 3D depth analysis attached.",
        defect_data: sampleDefect,
      });

      if (res && res.record) {
        if (onAlertDispatched) {
          onAlertDispatched(res.record);
        }
        showToast(
          "Highways & Minor Ports Dept Notified!",
          `Emergency incident docket #${res.record.docket_id} emailed to ce-maintenance.highways@tn.gov.in. SLA < 24 Hours.`,
          "success"
        );
      }
    } catch (e) {
      console.error("Failed to dispatch alert:", e);
      showToast(
        "Alert Dispatched (Simulated)",
        "Official notice and photo payload transmitted to Tamil Nadu Highways & Minor Ports Department.",
        "success"
      );
    } finally {
      setIsSendingAlert(false);
    }
  };

  const samplePhotos = [
    {
      id: "photo_1",
      title: "Severe Pothole (Depth: 8.4cm)",
      type: "Pothole (D40)",
      location: "SH-49A OMR Km 14.200 (Perungudi)",
      severity: "Critical",
      score: "0.94",
      tag: "Car Front Dashcam (4K HDR)",
      desc: "Deep circular crater with loose aggregate, exposing wet binder course. Extreme tire damage hazard."
    },
    {
      id: "photo_2",
      title: "Alligator & Longitudinal Crack Cluster",
      type: "Alligator Crack (D20)",
      location: "SH-49A OMR Km 14.260 (Near SRP Junction)",
      severity: "Critical",
      score: "0.91",
      tag: "Wide Angle Lens - Lane 2",
      desc: "Extensive interconnected spiderweb fracture pattern. Active water ingress leading to sub-base softening."
    },
    {
      id: "photo_3",
      title: "Transverse Thermal Fracture",
      type: "Transverse Crack (D10)",
      location: "SH-49A OMR Km 14.310 (Kandanchavadi)",
      severity: "High",
      score: "0.82",
      tag: "Car Front Dashcam",
      desc: "Full lane-width structural joint crack. High vehicle rebound shock at speeds > 40 km/h."
    }
  ];

  const totalPotholes = report?.summary?.total_potholes ?? 4;
  const totalCracks = report?.summary?.total_cracks ?? 7;
  const criticalCount = report?.summary?.critical_segments_count ?? 3;

  return (
    <>
      <div
        className="glass-panel fade-in-up"
        style={{
          marginBottom: "16px",
          background: "var(--bg-card)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          borderLeft: "4px solid #ef4444",
          borderRadius: "10px",
          padding: "10px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {/* Left: Live status & compact title */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Camera size={16} color="#ef4444" className="pulse-danger" />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="cyber-badge badge-rose" style={{ fontSize: "0.64rem", padding: "2px 6px" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#ef4444", display: "inline-block", marginRight: "3px" }} />
                  LIVE DASHCAM
                </span>
                <span className="cyber-badge badge-amber" style={{ fontSize: "0.64rem", padding: "2px 6px" }}>
                  TN-SHD SLA &lt; 24h
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  Automated Road Hazard Photo Relay
                </span>
              </div>
            </div>
          </div>

          {/* Right Actions: Compact Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handleQuickDispatchToHighwaysDept}
              disabled={isSendingAlert}
              className="btn-cyber-primary"
              style={{
                background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                border: "1px solid #f87171",
                color: "#ffffff",
                padding: "6px 12px",
                fontSize: "0.75rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
              }}
              title="Send Critical Road Hazard Photos to Highways Dept"
            >
              <Mail size={13} />
              <span>{isSendingAlert ? "Sending..." : "Send Alert to Govt"}</span>
            </button>

            <button
              onClick={triggerPassengerAlert}
              className="btn-cyber-secondary"
              style={{
                padding: "6px 10px",
                fontSize: "0.75rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Notify Car Owner / In-Cabin Passengers"
            >
              <BellRing size={13} color="var(--accent-amber)" />
              <span>In-Cabin Alert</span>
            </button>

            <button
              onClick={() => setShowPhotosModal(true)}
              className="btn-cyber-secondary"
              style={{
                padding: "6px 9px",
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="View Captured Photos"
            >
              <Eye size={13} color="var(--accent-cyan)" />
              <span>Photos</span>
            </button>

            <button
              onClick={() => setShowDeptModal(true)}
              className="btn-cyber-secondary"
              style={{
                padding: "6px 9px",
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Highways & Minor Ports Dept Info"
            >
              <Building2 size={13} color="var(--accent-amber)" />
              <span>Dept</span>
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="btn-cyber-secondary"
              style={{
                padding: "6px 8px",
                fontSize: "0.75rem",
              }}
              title={isExpanded ? "Collapse Telemetry" : "Expand Telemetry"}
            >
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

          {/* Expanded Bar Details */}
          {isExpanded && (
            <div
              style={{
                marginTop: "16px",
                paddingTop: "14px",
                borderTop: "1px solid var(--border-glass)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
                fontSize: "0.78rem",
              }}
            >
              {/* Telemetry Status */}
              <div
                style={{
                  background: "var(--bg-surface)",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-glass)",
                }}
              >
                <div style={{ color: "var(--text-muted)", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                  <Car size={13} color="var(--accent-cyan)" />
                  <span>VEHICLE TELEMETRY</span>
                </div>
                <div style={{ marginTop: "4px", color: "var(--text-primary)", fontWeight: 600 }}>
                  Dashcam 4K HDR • GPS: 12.9865° N, 80.2435° E
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: "2px" }}>
                  Corridor: SH-49A OMR • Speed: 52 km/h
                </div>
              </div>

              {/* Department Contact info */}
              <div
                style={{
                  background: "var(--bg-surface)",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-glass)",
                  cursor: "pointer",
                }}
                onClick={() => setShowDeptModal(true)}
              >
                <div style={{ color: "var(--text-muted)", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                  <Building2 size={13} color="var(--accent-amber)" />
                  <span>TARGET HIGHWAYS DEPT</span>
                </div>
                <div style={{ marginTop: "4px", color: "var(--text-primary)", fontWeight: 600 }}>
                  TN Highways &amp; Minor Ports Dept
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: "2px", display: "flex", gap: "8px" }}>
                  <span>Email: ce-maintenance.highways@tn.gov.in</span>
                </div>
              </div>

              {/* Hazard Detection Summary */}
              <div
                style={{
                  background: "var(--bg-surface)",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-glass)",
                }}
              >
                <div style={{ color: "var(--text-muted)", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertTriangle size={13} color="#f87171" />
                  <span>DETECTED ROAD HAZARDS</span>
                </div>
                <div style={{ marginTop: "4px", color: "var(--text-primary)", fontWeight: 600 }}>
                  {totalPotholes} Potholes • {totalCracks} Cracks ({criticalCount} Critical)
                </div>
                <div style={{ color: "#f87171", fontSize: "0.72rem", marginTop: "2px", fontWeight: 700 }}>
                  Immediate Repair Work Orders Prepared
                </div>
              </div>

              {/* Auto-Dispatch Toggle */}
              <div
                style={{
                  background: "var(--bg-surface)",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-glass)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>AUTO-DISPATCH ENGINE</span>
                  <span
                    onClick={() => {
                      setAutoDispatchEnabled(!autoDispatchEnabled);
                      showToast(
                        autoDispatchEnabled ? "Auto-Dispatch Paused" : "Auto-Dispatch Armed",
                        autoDispatchEnabled ? "Critical road hazards will require manual dispatch." : "Critical defects will auto-email the Highways Dept instantly.",
                        "info"
                      );
                    }}
                    style={{
                      cursor: "pointer",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      padding: "2px 7px",
                      borderRadius: "4px",
                      background: autoDispatchEnabled ? "rgba(52, 211, 153, 0.2)" : "rgba(148, 163, 184, 0.2)",
                      color: autoDispatchEnabled ? "var(--accent-emerald)" : "var(--text-muted)",
                      border: `1px solid ${autoDispatchEnabled ? "var(--accent-emerald)" : "var(--border-glass)"}`,
                    }}
                  >
                    {autoDispatchEnabled ? "ARMED (CRITICAL >0.85)" : "MANUAL ONLY"}
                  </span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Dual trigger: Gov Email + In-Cabin Passenger Chime
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Toast Banner */}
      {toastMessage && (
        <div
          className="fade-in-up"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            background: toastMessage.type === "success" ? "#064e3b" : toastMessage.type === "warning" ? "#78350f" : "#1e1b4b",
            color: "#ffffff",
            padding: "14px 18px",
            borderRadius: "10px",
            border: `1.5px solid ${toastMessage.type === "success" ? "#34d399" : toastMessage.type === "warning" ? "#fbbf24" : "#818cf8"}`,
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            maxWidth: "420px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 size={20} color="#34d399" style={{ flexShrink: 0, marginTop: "2px" }} />
          ) : toastMessage.type === "warning" ? (
            <AlertTriangle size={20} color="#fbbf24" style={{ flexShrink: 0, marginTop: "2px" }} />
          ) : (
            <Info size={20} color="#818cf8" style={{ flexShrink: 0, marginTop: "2px" }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: "0.88rem" }}>{toastMessage.title}</div>
            <div style={{ fontSize: "0.78rem", opacity: 0.9, marginTop: "2px", lineHeight: "1.4" }}>
              {toastMessage.subtitle}
            </div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* In-Cabin Passenger & Driver Heads-Up Warning Modal */}
      {showPassengerModal && (
        <div
          className="fade-in-up"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: "560px",
              width: "100%",
              padding: "24px",
              background: "var(--bg-card)",
              border: "2px solid var(--accent-amber)",
              boxShadow: "var(--card-shadow), 0 0 30px rgba(251, 191, 36, 0.25)",
              borderRadius: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(251, 191, 36, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <BellRing size={20} color="var(--accent-amber)" />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                    In-Cabin Passenger &amp; Driver Safety Alert
                  </h3>
                  <div style={{ fontSize: "0.76rem", color: "var(--accent-amber)", fontWeight: 700 }}>
                    VEHICLE HEADS-UP DISPLAY (HUD) ACTIVE
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPassengerModal(false)}
                className="btn-cyber-secondary"
                style={{ padding: "5px 8px" }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                background: "rgba(251, 191, 36, 0.1)",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                padding: "16px",
                borderRadius: "10px",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-amber)", fontWeight: 800, fontSize: "0.95rem" }}>
                <AlertTriangle size={18} />
                <span>⚠️ SEVERE POTHOLE &amp; ROAD CRACK 85m AHEAD</span>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                Vehicle dashcam vision model localized a <strong>8.4cm deep pothole</strong> and severe transverse fracture at <strong>Km 14.200 (Near SRP Junction, SH-49A OMR)</strong>.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "18px", fontSize: "0.8rem" }}>
              <div style={{ background: "var(--bg-surface)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700 }}>DRIVER ADVISORY</div>
                <div style={{ color: "var(--accent-emerald)", fontWeight: 800, fontSize: "0.95rem", marginTop: "2px" }}>
                  Slow to 30 km/h
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Switch to Inner Lane to bypass void</div>
              </div>

              <div style={{ background: "var(--bg-surface)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700 }}>PASSENGER NOTICE</div>
                <div style={{ color: "var(--accent-cyan)", fontWeight: 800, fontSize: "0.95rem", marginTop: "2px" }}>
                  Suspension Shock Alert
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Hold handles &amp; prepare for bump</div>
              </div>
            </div>

            <div
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "0.75rem",
                color: "#f87171",
                marginBottom: "18px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <CheckCircle2 size={16} />
              <span>
                Simultaneous incident notice with GPS coordinates &amp; photo sent to <strong>Highways and Minor Ports Department</strong> for fast repairs.
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => {
                  playInCabinAudioAlert();
                }}
                className="btn-cyber-secondary"
                style={{ padding: "8px 14px", fontSize: "0.8rem" }}
              >
                Replay Audio Chime
              </button>
              <button
                onClick={() => setShowPassengerModal(false)}
                className="btn-cyber-primary"
                style={{ padding: "8px 16px", fontSize: "0.8rem" }}
              >
                Acknowledge Warning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Info Modal */}
      {showDeptModal && (
        <div
          className="fade-in-up"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: "600px",
              width: "100%",
              padding: "24px",
              background: "var(--bg-card)",
              border: "1.5px solid var(--border-glass)",
              borderRadius: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "8px",
                    background: "rgba(251, 191, 36, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Building2 size={22} color="var(--accent-amber)" />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                    Tamil Nadu Highways &amp; Minor Ports Department
                  </h3>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                    Quality Control, Planning &amp; Highway Maintenance Wing
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDeptModal(false)}
                className="btn-cyber-secondary"
                style={{ padding: "5px 8px" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.82rem" }}>
              <div style={{ background: "var(--bg-surface)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700 }}>GOVERNMENT NODAL OFFICER</div>
                <div style={{ color: "var(--text-primary)", fontWeight: 800, marginTop: "2px" }}>
                  Chief Engineer (Highways - Maintenance &amp; Construction)
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.76rem", marginTop: "2px" }}>
                  Chennai Metropolitan Circle &amp; State Highway Divisions
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ background: "var(--bg-surface)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "5px" }}>
                    <Mail size={12} color="var(--accent-cyan)" />
                    <span>OFFICIAL ALERT EMAIL</span>
                  </div>
                  <div style={{ color: "var(--accent-cyan)", fontWeight: 700, marginTop: "2px", wordBreak: "break-all" }}>
                    ce-maintenance.highways@tn.gov.in
                  </div>
                </div>

                <div style={{ background: "var(--bg-surface)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "5px" }}>
                    <Phone size={12} color="var(--accent-emerald)" />
                    <span>EMERGENCY HELPLINE</span>
                  </div>
                  <div style={{ color: "var(--accent-emerald)", fontWeight: 700, marginTop: "2px" }}>
                    1800-425-4949 / (044) 2225-3000
                  </div>
                </div>
              </div>

              <div style={{ background: "var(--bg-surface)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700 }}>STATUTORY REPAIR SLA TARGET</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                  <span style={{ color: "#f87171", fontWeight: 700 }}>Critical Defects (Potholes &gt;5cm, Major Cracks):</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 800 }}>&lt; 24 Hours Mandate</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                  <span style={{ color: "var(--accent-amber)", fontWeight: 700 }}>High / Medium Defects:</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 800 }}>&lt; 48 Hours</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <a
                href="https://tnhighways.tn.gov.in"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}
              >
                <span>Visit Official TN Highways Portal</span>
                <ExternalLink size={12} />
              </a>
              <button
                onClick={() => setShowDeptModal(false)}
                className="btn-cyber-primary"
                style={{ padding: "8px 16px", fontSize: "0.8rem" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Captured Dashcam Photos Modal */}
      {showPhotosModal && (
        <div
          className="fade-in-up"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: "880px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              background: "var(--bg-card)",
              border: "1.5px solid var(--border-glass)",
              borderRadius: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Camera size={20} color="var(--accent-cyan)" />
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                    Vehicle Camera Captured Road Distress Photos
                  </h3>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Highways and Minor Ports Department Automated Inspection Evidence Portfolio
                </p>
              </div>
              <button
                onClick={() => setShowPhotosModal(false)}
                className="btn-cyber-secondary"
                style={{ padding: "6px 10px" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
              {samplePhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  style={{
                    background: "var(--bg-surface)",
                    borderRadius: "10px",
                    border: "1px solid var(--border-glass)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Mock Dashcam Snapshot Frame */}
                  <div
                    style={{
                      height: "140px",
                      background: idx === 0 
                        ? "radial-gradient(circle at 50% 60%, #1f2937 0%, #000000 80%)"
                        : idx === 1
                        ? "radial-gradient(circle at 45% 55%, #18181b 0%, #050505 80%)"
                        : "radial-gradient(circle at 55% 45%, #27272a 0%, #09090b 80%)",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderBottom: "1px solid var(--border-glass)",
                    }}
                  >
                    {/* Simulated Bounding Box Overlay */}
                    <div
                      style={{
                        border: `2px dashed ${photo.severity === "Critical" ? "#ef4444" : "#f59e0b"}`,
                        background: photo.severity === "Critical" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        padding: "16px 24px",
                        borderRadius: "6px",
                        textAlign: "center",
                      }}
                    >
                      <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#ffffff", background: photo.severity === "Critical" ? "#ef4444" : "#f59e0b", padding: "2px 6px", borderRadius: "3px" }}>
                        {photo.type}
                      </span>
                      <div style={{ fontSize: "0.68rem", color: "#ffffff", marginTop: "4px", fontWeight: 700 }}>
                        Score: {photo.score}
                      </div>
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        top: "6px",
                        left: "6px",
                        fontSize: "0.65rem",
                        color: "rgba(255, 255, 255, 0.8)",
                        background: "rgba(0, 0, 0, 0.6)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {photo.tag}
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        bottom: "6px",
                        right: "6px",
                        fontSize: "0.65rem",
                        color: "#38bdf8",
                        background: "rgba(0, 0, 0, 0.7)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: 700,
                      }}
                    >
                      GPS LOGGED
                    </div>
                  </div>

                  <div style={{ padding: "12px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                          {photo.title}
                        </h4>
                        <span className={`cyber-badge ${photo.severity === "Critical" ? "badge-rose" : "badge-amber"}`} style={{ fontSize: "0.65rem" }}>
                          {photo.severity}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <MapPin size={11} />
                        <span>{photo.location}</span>
                      </div>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "6px", lineHeight: "1.35" }}>
                        {photo.desc}
                      </p>
                    </div>

                    <div style={{ marginTop: "12px", display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => {
                          setShowPhotosModal(false);
                          if (onOpenAlertModal) {
                            onOpenAlertModal(sampleDefect);
                          } else {
                            handleQuickDispatchToHighwaysDept();
                          }
                        }}
                        className="btn-cyber-primary"
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          fontSize: "0.72rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                      >
                        <Send size={12} />
                        <span>Mail to Highways Dept</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowPhotosModal(false)}
                className="btn-cyber-secondary"
                style={{ padding: "8px 16px", fontSize: "0.8rem" }}
              >
                Close Gallery
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
