import React, { useState } from "react";
import {
  Building2,
  MapPin,
  Compass,
  Printer,
  ExternalLink,
  Search,
  Radio,
} from "lucide-react";
import type { FullRoadInspectionReport, DispatchedAlertRecord, AuthorityItem } from "../types";

interface AuthorityDispatchCenterProps {
  report: FullRoadInspectionReport | null;
  onOpenAlertModal?: (defectId: string) => void;
}

export const AuthorityDispatchCenter: React.FC<AuthorityDispatchCenterProps> = ({
  report,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const dispatches: DispatchedAlertRecord[] = report?.dispatched_alerts || [];
  const authorities: AuthorityItem[] = report?.authorities || [];

  const filteredDispatches = dispatches.filter((d) => {
    if (filterStatus !== "ALL" && d.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.docket_id.toLowerCase().includes(q) ||
        d.road_name.toLowerCase().includes(q) ||
        d.nearby_landmark.toLowerCase().includes(q) ||
        d.defect_type.toLowerCase().includes(q) ||
        d.recipient_authority.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalDispatches = dispatches.length;
  const acknowledgedCount = dispatches.filter((d) => d.status === "ACKNOWLEDGED" || d.status === "CREW_DEPLOYED").length;
  const crewDeployedCount = dispatches.filter((d) => d.status === "CREW_DEPLOYED").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      
      <div
        className="glass-panel glass-panel-glow-rose fade-in-up"
        style={{
          padding: "22px 28px",
          borderLeft: "6px solid var(--accent-rose)",
          background: "linear-gradient(135deg, rgba(255, 42, 95, 0.12) 0%, rgba(13, 20, 38, 0.95) 100%)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(255, 42, 95, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Building2 size={26} color="var(--accent-rose)" className="beacon-critical" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 className="text-vivid-rose" style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>
                🏛️ Government Authority & Highway Maintenance Dispatch Center
              </h2>
              <span className="cyber-badge badge-rose beacon-critical" style={{ fontSize: "0.72rem" }}>
                LIVE DISPATCH ACTIVE
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
              Direct automated incident reports (FIR) with GPS coordinates transmitted to NHAI, State Highways Department (TN-SHD), and Municipal Works.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => window.print()}
            className="btn-cyber-secondary"
            style={{ padding: "8px 16px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Printer size={14} />
            <span>Export Incident Log</span>
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        <div className="glass-panel glass-panel-glow-rose" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              📡 Dispatched Authority Notices
            </span>
            <span className="cyber-badge badge-rose" style={{ fontSize: "0.68rem" }}>
              Active Dockets
            </span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-rose)" }}>
            {totalDispatches} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>FIR Notices</span>
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Automated alerts sent with GPS coordinates & image proof
          </div>
        </div>

        <div className="glass-panel glass-panel-glow-emerald" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              ✅ Acknowledged by Agency
            </span>
            <span className="cyber-badge badge-emerald" style={{ fontSize: "0.68rem" }}>
              Verified
            </span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-emerald)" }}>
            {acknowledgedCount} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Signed Receipts</span>
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Confirmed by Nodal Highway Engineers
          </div>
        </div>

        <div className="glass-panel glass-panel-glow-amber" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              🚜 On-Site Rapid Response Crews
            </span>
            <span className="cyber-badge badge-amber" style={{ fontSize: "0.68rem" }}>
              Mobilized
            </span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-amber)" }}>
            {crewDeployedCount} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Crews Deployed</span>
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Compactor & hot-asphalt repair squads active
          </div>
        </div>

        <div className="glass-panel glass-panel-glow-cyan" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              ⏱️ Target Resolution SLA
            </span>
            <span className="cyber-badge badge-cyan" style={{ fontSize: "0.68rem" }}>
              Standard
            </span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-cyan)" }}>
            &lt; 24h <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Emergency Fix</span>
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Mandatory resolution window for Critical Potholes
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Building2 size={18} color="var(--accent-cyan)" />
          <span>Connected Government & Road Maintenance Authorities:</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
          {authorities.map((auth) => (
            <div
              key={auth.id}
              className="glass-panel"
              style={{
                padding: "16px 18px",
                borderLeft: "4px solid var(--accent-burgundy)",
                background: "var(--bg-surface)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    {auth.name}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--accent-cyan)", fontWeight: 600 }}>
                    {auth.department}
                  </div>
                </div>
                <span className="cyber-badge badge-cyan" style={{ fontSize: "0.68rem" }}>
                  {auth.short_name}
                </span>
              </div>

              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div><strong>Jurisdiction:</strong> {auth.jurisdiction}</div>
                <div><strong>Nodal Officer:</strong> {auth.nodal_officer}</div>
                <div><strong>Emergency Hotline:</strong> <strong style={{ color: "var(--accent-amber)" }}>{auth.hotline}</strong></div>
                <div><strong>SLA Emergency Fix:</strong> <strong style={{ color: "var(--accent-rose)" }}>&lt; {auth.sla_emergency_hours} Hours</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "22px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Radio size={20} color="var(--accent-rose)" className="beacon-critical" />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              Live Government Incident Alerts & Action Tracking ({filteredDispatches.length})
            </h3>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--bg-surface)",
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-glass)",
              }}
            >
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Docket, Road, Landmark..."
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  width: "180px",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "6px", background: "var(--bg-surface)", padding: "4px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
              {[
                { id: "ALL", label: "All Alerts" },
                { id: "DISPATCHED", label: "Sent" },
                { id: "ACKNOWLEDGED", label: "Acknowledged" },
                { id: "CREW_DEPLOYED", label: "Crew Deployed" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.74rem",
                    fontWeight: filterStatus === f.id ? 700 : 500,
                    border: "none",
                    cursor: "pointer",
                    background: filterStatus === f.id ? "rgba(255, 255, 255, 0.12)" : "transparent",
                    color: filterStatus === f.id ? "#ffffff" : "var(--text-muted)",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filteredDispatches.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.86rem" }}>
              No dispatched alerts matching current filter. Select a defect in Inspection Studio or Pothole & Crack Detector to transmit a new official notice.
            </div>
          ) : (
            filteredDispatches.map((disp, idx) => (
              <div
                key={disp.docket_id || idx}
                style={{
                  background: "var(--bg-surface)",
                  border: disp.severity_level === "Critical" ? "1px solid rgba(255, 42, 95, 0.35)" : "1px solid var(--border-glass)",
                  borderLeft: `5px solid ${disp.severity_level === "Critical" ? "var(--accent-rose)" : "var(--accent-amber)"}`,
                  borderRadius: "12px",
                  padding: "18px 22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className="code-font" style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--accent-cyan)" }}>
                        DOCKET #{disp.docket_id}
                      </span>
                      <span className={`cyber-badge ${disp.severity_level === "Critical" ? "badge-rose badge-critical-blink" : "badge-amber badge-warning-blink"}`} style={{ fontSize: "0.68rem" }}>
                        <span className={disp.severity_level === "Critical" ? "dot-critical-fast" : "dot-warning-slow"} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "currentColor" }} />
                        {disp.severity_level.toUpperCase()} HAZARD
                      </span>
                      <span
                        className="cyber-badge"
                        style={{
                          background: disp.status === "CREW_DEPLOYED" ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)",
                          color: disp.status === "CREW_DEPLOYED" ? "#fbbf24" : "#34d399",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                        }}
                      >
                        {disp.status === "CREW_DEPLOYED" ? "🚜 CREW MOBILIZED" : "✅ ACKNOWLEDGED"}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
                      {disp.defect_type.toLowerCase().includes("pothole") ? "🕳️" : "⚡"} {disp.defect_type.replace(/_/g, " ")} • Risk Rating: <span style={{ color: "var(--accent-rose)" }}>{disp.risk_rating}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", fontSize: "0.74rem", color: "var(--text-muted)" }}>
                    <div>Transmitted: <strong>{disp.timestamp}</strong></div>
                    <div style={{ marginTop: "2px" }}>Channel: <strong>{disp.channel}</strong></div>
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(10, 15, 30, 0.8)",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    border: "1px solid var(--border-glass)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    fontSize: "0.78rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-primary)" }}>
                      <MapPin size={15} color="var(--accent-rose)" />
                      <span><strong>Road Name:</strong> {disp.road_name} ({disp.segment_id} • Km {disp.chainage_km})</span>
                    </div>

                    <a
                      href={`https://www.google.com/maps?q=${disp.lat},${disp.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-cyber-primary"
                      style={{
                        padding: "4px 10px",
                        fontSize: "0.72rem",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Compass size={12} />
                      <span>Google Maps Link</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-amber)" }}>
                    <span>📍 <strong>Nearby Location / Landmark:</strong> {disp.nearby_landmark}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                    <span>GPS Latitude: <strong style={{ color: "#ffffff" }}>{disp.lat.toFixed(6)}° N</strong></span>
                    <span>GPS Longitude: <strong style={{ color: "#ffffff" }}>{disp.lon.toFixed(6)}° E</strong></span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.76rem", color: "var(--text-secondary)", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    🏛️ <strong>Recipient Authority:</strong> <strong style={{ color: "var(--text-primary)" }}>{disp.recipient_authority.name}</strong> ({disp.recipient_authority.department})
                  </div>
                  <div>
                    👷 <strong>Assigned Crew:</strong> <strong style={{ color: "var(--accent-cyan)" }}>{disp.assigned_crew}</strong>
                  </div>
                  <div>
                    ⏱️ <strong>SLA Fix Window:</strong> <strong style={{ color: "var(--accent-rose)" }}>{disp.sla_resolution_target}</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
