import React, { useState } from "react";
import {
  X,
  Send,
  MapPin,
  Compass,
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  ExternalLink,
  ShieldAlert,
  Printer,
} from "lucide-react";
import type { RoadDefectItem, AuthorityItem, DispatchedAlertRecord } from "../types";
import { api } from "../services/api";

interface AuthorityAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  defect: RoadDefectItem | null;
  imageB64?: string;
  authorities?: AuthorityItem[];
  onAlertDispatched?: (record: DispatchedAlertRecord) => void;
}

const DEFAULT_AUTHORITIES: AuthorityItem[] = [
  {
    id: "tn_shd",
    name: "Tamil Nadu State Highways & Minor Ports Department",
    short_name: "TN State Highways (TN-SHD)",
    department: "Quality Control, Planning & Maintenance Wing",
    jurisdiction: "State Highways (SH-49A OMR, SH-49 ECR, Inner Ring Roads)",
    nodal_officer: "Chief Engineer (Highways), Chennai Metropolitan Circle",
    email: "ce-maintenance.highways@tn.gov.in",
    hotline: "1800-425-4949 / (044) 2225-3000",
    portal_url: "https://tnhighways.tn.gov.in/e-maintenance",
    sms_gateway: "+91-94440-HIGHWAY",
    sla_emergency_hours: 24,
    sla_high_hours: 48,
  },
  {
    id: "nhai",
    name: "National Highways Authority of India (NHAI)",
    short_name: "NHAI Project Unit",
    department: "Project Implementation Unit (PIU - Chennai Region)",
    jurisdiction: "National Highways (NH-48, NH-32, Golden Quadrilateral)",
    nodal_officer: "Project Director / Chief General Manager (Tech)",
    email: "piuchennai@nhai.org",
    hotline: "1033 (National Highway Emergency Helpline)",
    portal_url: "https://nhai.gov.in/rajmargyatra/incident",
    sms_gateway: "+91-1033-NHAI",
    sla_emergency_hours: 12,
    sla_high_hours: 24,
  },
  {
    id: "gcc_roads",
    name: "Greater Chennai Corporation (GCC)",
    short_name: "GCC Works & Bridges",
    department: "Department of Works & Pavement Engineering",
    jurisdiction: "Municipal Major & Arterial Roads (Zones 13 & 14)",
    nodal_officer: "Superintending Engineer (Works), Ripon Building",
    email: "seworks@chennaicorporation.gov.in",
    hotline: "1913 (GCC Public Grievance Helpline)",
    portal_url: "https://chennaicorporation.gov.in/gcc/grievance",
    sms_gateway: "+91-1913-GCC",
    sla_emergency_hours: 24,
    sla_high_hours: 48,
  },
  {
    id: "municipal_pwd",
    name: "Public Works Department (PWD - Roads Wing)",
    short_name: "State PWD Infrastructure",
    department: "Infrastructure Asset Management & Emergency Response",
    jurisdiction: "District Urban Corridors & Connecting Arterials",
    nodal_officer: "Executive Engineer (Civil Infrastructure)",
    email: "pwd-roads.response@gov.in",
    hotline: "044-2567-4321",
    portal_url: "https://pwd.gov.in/road-maintenance",
    sms_gateway: "+91-98400-PWD",
    sla_emergency_hours: 36,
    sla_high_hours: 72,
  },
];

export const AuthorityAlertModal: React.FC<AuthorityAlertModalProps> = ({
  isOpen,
  onClose,
  defect,
  imageB64,
  authorities = DEFAULT_AUTHORITIES,
  onAlertDispatched,
}) => {
  if (!isOpen || !defect) return null;

  const authList = authorities && authorities.length > 0 ? authorities : DEFAULT_AUTHORITIES;
  const initialAuthId =
    typeof defect.responsible_authority === "object" && defect.responsible_authority !== null
      ? defect.responsible_authority.id
      : typeof defect.responsible_authority === "string"
      ? authList.find(
          (a) =>
            a.name.toLowerCase().includes((defect.responsible_authority as string).toLowerCase()) ||
            a.short_name.toLowerCase().includes((defect.responsible_authority as string).toLowerCase())
        )?.id || authList[0].id
      : authList[0].id;

  const [selectedAuthorityId, setSelectedAuthorityId] = useState<string>(initialAuthId);
  const [channel, setChannel] = useState<string>("API & Emergency Webhook");
  const [inspectorNotes, setInspectorNotes] = useState<string>(
    "Automated AI vision sensor verified. Road cavity depth poses immediate tire burst and motorcycle destabilization hazard."
  );
  const [isSending, setIsSending] = useState<boolean>(false);
  const [dispatchReceipt, setDispatchReceipt] = useState<DispatchedAlertRecord | null>(null);

  const selectedAuthority = authList.find((a) => a.id === selectedAuthorityId) || authList[0];
  const isCritical = defect.severity_level === "Critical";

  const roadName = defect.road_name || "Rajiv Gandhi Salai / State Highway 49A (OMR IT Expressway)";
  const nearbyLandmark = defect.nearby_landmark || "Near SRP Tools Junction / Apollo Hospital, Perungudi, Chennai";
  const chainage = `Km ${(defect.distance_m / 1000.0).toFixed(2)} (${defect.distance_m}m from origin)`;

  const handleDispatch = async () => {
    setIsSending(true);
    try {
      const response = await api.dispatchAuthorityAlert({
        defect_id: defect.defect_id,
        authority_id: selectedAuthority.id,
        channel,
        notes: inspectorNotes,
        defect_data: {
          defect_id: defect.defect_id,
          defect_type: defect.defect_type,
          severity_level: defect.severity_level,
          severity_score: defect.severity_score,
          estimated_area_cm2: defect.estimated_area_cm2,
          estimated_depth_cm: defect.estimated_depth_cm,
          lat: defect.lat,
          lon: defect.lon,
          distance_m: defect.distance_m,
          segment_id: defect.segment_id,
          road_name: roadName,
          nearby_landmark: nearbyLandmark,
        },
      });

      if (response && response.record) {
        setDispatchReceipt(response.record);
        if (onAlertDispatched) {
          onAlertDispatched(response.record);
        }
      }
    } catch (err) {
      console.error("Alert dispatch failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(14px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="glass-panel fade-in-up"
        style={{
          width: "100%",
          maxWidth: "960px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "rgba(255, 255, 255, 0.94)",
          border: isCritical
            ? "2px solid #ef4444"
            : "2px solid #f59e0b",
          borderRadius: "18px",
          boxShadow: isCritical
            ? "0 20px 60px rgba(239, 68, 68, 0.25)"
            : "0 20px 60px rgba(245, 158, 11, 0.2)",
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "1px solid var(--border-glass)",
            paddingBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: isCritical ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Building2 size={22} color={isCritical ? "#ef4444" : "#f59e0b"} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "1.18rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                  Official Road Defect Initiative &amp; Authority Notice Generator
                </h2>
                <span className={`cyber-badge ${isCritical ? "badge-rose" : "badge-amber"}`} style={{ fontSize: "0.68rem", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isCritical ? "#ef4444" : "#f59e0b" }} />
                  {isCritical ? "🚨 CRITICAL PRIORITY (< 24H SLA)" : "⚠️ HIGH PRIORITY (< 48H SLA)"}
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "3px 0 0 0" }}>
                Automated Incident Report (FIR) dispatch to concerned Government Road Authority for rapid inspection and repair.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(0, 0, 0, 0.04)",
              border: "1px solid var(--border-glass)",
              borderRadius: "8px",
              padding: "6px",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {dispatchReceipt ? (
          <div
            className="glass-panel fade-in-up"
            style={{
              padding: "24px",
              background: "linear-gradient(135deg, rgba(240, 253, 244, 0.95), rgba(220, 252, 231, 0.75))",
              border: "1.5px solid #10b981",
              borderRadius: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={24} color="#10b981" />
              </div>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#065f46", margin: 0 }}>
                  Official Incident Alert Successfully Dispatched &amp; Signed!
                </h3>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Delivered to <strong>{dispatchReceipt.recipient_authority.name}</strong> • Reference Docket: <strong className="code-font" style={{ color: "#0284c7" }}>{dispatchReceipt.docket_id}</strong>
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                padding: "16px 18px",
                borderRadius: "10px",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
                fontSize: "0.8rem",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)" }}>Confirmation Auth Code:</span>
                <div className="code-font" style={{ fontWeight: 700, color: "#0284c7", marginTop: "2px" }}>
                  {dispatchReceipt.confirmation_code}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Assigned Inspection Crew:</span>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                  {dispatchReceipt.assigned_crew}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Mandated Repair SLA:</span>
                <div style={{ fontWeight: 700, color: "#ef4444", marginTop: "2px" }}>
                  {dispatchReceipt.sla_resolution_target}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Transmission Timestamp:</span>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                  {dispatchReceipt.timestamp}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "6px" }}>
              <button
                onClick={() => window.print()}
                className="btn-cyber-secondary"
                style={{ padding: "8px 16px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Printer size={14} />
                <span>Print Official Receipt</span>
              </button>
              <button
                onClick={onClose}
                className="btn-cyber-primary"
                style={{ padding: "8px 20px", fontSize: "0.8rem" }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
            
            {/* Left Column: Evidence & Telemetry */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              
              <div
                style={{
                  position: "relative",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid var(--border-glass)",
                  background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
                  height: "190px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {imageB64 ? (
                  <img
                    src={imageB64}
                    alt="Defect Proof"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                    <ShieldAlert size={36} color={defect.color_hex || "#ef4444"} style={{ margin: "0 auto 8px" }} />
                    <div style={{ fontWeight: 700 }}>{defect.defect_type.replace(/_/g, " ")} Evidence</div>
                  </div>
                )}

                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px",
                    background: "rgba(255, 255, 255, 0.95)",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(0, 0, 0, 0.1)",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: defect.color_hex || "#ef4444",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  {defect.rdd_code || "D40"}: {defect.defect_type.replace(/_/g, " ")}
                </div>

                <div
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    right: "10px",
                    background: "rgba(255, 255, 255, 0.95)",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(0, 0, 0, 0.1)",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#0284c7",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  Confidence: {Math.round((defect.confidence || 0.92) * 100)}%
                </div>
              </div>

              <div
                style={{
                  background: "var(--bg-surface)",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  border: "1px solid var(--border-glass)",
                  borderLeft: "4px solid #0284c7",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#0284c7", fontWeight: 800, fontSize: "0.86rem" }}>
                  <MapPin size={16} />
                  <span>Exact GPS Geolocation &amp; Highway Telemetry</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Official Road Name:</span>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: "1px" }}>
                      🛣️ {roadName}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Nearby Landmark / Location:</span>
                    <div style={{ fontWeight: 700, color: "#d97706", marginTop: "1px" }}>
                      📍 {nearbyLandmark}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
                    <div style={{ background: "rgba(2, 132, 199, 0.08)", padding: "7px 10px", borderRadius: "6px", border: "1px solid rgba(2, 132, 199, 0.2)" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" }}>Latitude</span>
                      <div className="code-font" style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.84rem" }}>
                        {defect.lat ? defect.lat.toFixed(6) : "12.971600"}° N
                      </div>
                    </div>
                    <div style={{ background: "rgba(2, 132, 199, 0.08)", padding: "7px 10px", borderRadius: "6px", border: "1px solid rgba(2, 132, 199, 0.2)" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" }}>Longitude</span>
                      <div className="code-font" style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.84rem" }}>
                        {defect.lon ? defect.lon.toFixed(6) : "80.252800"}° E
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Chainage &amp; Segment:</span>
                    <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {defect.segment_id || "SEG-001"} • {chainage}
                    </span>
                  </div>
                </div>

                <a
                  href={`https://www.google.com/maps?q=${defect.lat || 12.9716},${defect.lon || 80.2528}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-cyber-primary"
                  style={{
                    padding: "7px 14px",
                    fontSize: "0.76rem",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    justifyContent: "center",
                    marginTop: "4px",
                  }}
                >
                  <Compass size={13} />
                  <span>Verify Pin on Google Maps</span>
                  <ExternalLink size={11} />
                </a>
              </div>

              <div
                style={{
                  background: "var(--bg-surface)",
                  borderRadius: "12px",
                  padding: "14px 18px",
                  border: "1px solid var(--border-glass)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "8px",
                  textAlign: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700 }}>Risk Score</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, color: defect.color_hex || "#ef4444" }}>
                    {Math.round((defect.severity_score || 0.85) * 100)}/100
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700 }}>Cavity Depth</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0284c7" }}>
                    {defect.estimated_depth_cm || 5.8} cm
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700 }}>Defect Area</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#d97706" }}>
                    {defect.estimated_area_cm2 || 420} cm²
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Government Authority, Channel, & Notes */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "6px" }}>
                  🏛️ Concerned Government / Maintenance Authority:
                </label>
                <select
                  value={selectedAuthorityId}
                  onChange={(e) => setSelectedAuthorityId(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#ffffff",
                    color: "#0f172a",
                    border: "1.5px solid rgba(2, 132, 199, 0.35)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    outline: "none",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  {authList.map((a) => (
                    <option key={a.id} value={a.id} style={{ background: "#ffffff", color: "#0f172a" }}>
                      {a.name} ({a.short_name}) — {a.jurisdiction}
                    </option>
                  ))}
                </select>
              </div>

              {/* Authority Nodal Officer & SLA info card */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(240, 249, 255, 0.95), rgba(224, 242, 254, 0.75))",
                  padding: "14px 18px",
                  borderRadius: "10px",
                  border: "1px solid rgba(2, 132, 199, 0.25)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "7px",
                  fontSize: "0.78rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Responsible Nodal Officer:</span>
                  <span style={{ fontWeight: 800, color: "#0f172a" }}>{selectedAuthority.nodal_officer}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Official Helpline / Portal:</span>
                  <span style={{ fontWeight: 800, color: "#0284c7" }}>{selectedAuthority.hotline}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Mandated Repair SLA:</span>
                  <span style={{ fontWeight: 800, color: "#ef4444" }}>
                    &lt; {isCritical ? selectedAuthority.sla_emergency_hours : selectedAuthority.sla_high_hours} Hours Target
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "6px" }}>
                  📡 Transmission Channel:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {[
                    { id: "API & Emergency Webhook", icon: <Send size={13} />, label: "Gov Webhook" },
                    { id: "Official Email (PDF Notice)", icon: <Mail size={13} />, label: "Email Notice" },
                    { id: "SMS / Police Control SOS", icon: <Phone size={13} />, label: "Emergency SMS" },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setChannel(ch.id)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        fontSize: "0.76rem",
                        fontWeight: channel === ch.id ? 800 : 600,
                        border: channel === ch.id ? "2px solid #0284c7" : "1px solid var(--border-glass)",
                        background: channel === ch.id ? "rgba(2, 132, 199, 0.12)" : "#ffffff",
                        color: channel === ch.id ? "#0284c7" : "var(--text-secondary)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {ch.icon}
                      <span>{ch.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "6px" }}>
                  ✍️ Inspection Notes &amp; Repair Directive:
                </label>
                <textarea
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    background: "#ffffff",
                    color: "#0f172a",
                    border: "1.5px solid var(--border-glass)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "0.8rem",
                    outline: "none",
                    resize: "none",
                    lineHeight: 1.4,
                    fontWeight: 500,
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-cyber-secondary"
                  style={{ padding: "10px 18px", fontSize: "0.82rem" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDispatch}
                  disabled={isSending}
                  style={{
                    padding: "10px 24px",
                    fontSize: "0.84rem",
                    fontWeight: 800,
                    borderRadius: "8px",
                    cursor: "pointer",
                    border: "none",
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(239, 68, 68, 0.35)",
                  }}
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin" style={{ width: "16px", height: "16px", border: "2px solid #ffffff", borderTopColor: "transparent", borderRadius: "50%" }} />
                      <span>Transmitting Notice...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Transmit Official Alert to Authority</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
