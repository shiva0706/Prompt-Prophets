import React, { useState } from "react";
import {
  MapPin,
  Navigation,
  AlertTriangle,
  ExternalLink,
  Compass,
} from "lucide-react";
import type { FullRoadInspectionReport, RoadSegmentItem } from "../types";

interface GpsSegmentMapProps {
  report: FullRoadInspectionReport | null;
  onSelectSegment?: (segmentId: string) => void;
}

export const GpsSegmentMap: React.FC<GpsSegmentMapProps> = ({ report, onSelectSegment }) => {
  const [selectedSegId, setSelectedSegId] = useState<string>("SEG-001");
  const [filterBand, setFilterBand] = useState<string>("ALL");

  const segments: RoadSegmentItem[] = report?.segments || [];
  const corridor = report?.corridor;

  const filteredSegments = segments.filter((s) => {
    if (filterBand === "ALL") return true;
    return s.condition_band.toUpperCase() === filterBand.toUpperCase();
  });

  const selectedSegment: RoadSegmentItem | undefined =
    segments.find((s) => s.segment_id === selectedSegId) || segments[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      
      <div
        className="glass-panel"
        style={{
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          borderLeft: "4px solid var(--accent-emerald)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Navigation size={22} color="var(--accent-emerald)" />
          </div>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
              GIS Spatial Route Mapping & 50m Road-Segment Telemetry
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Corridor: <strong style={{ color: "var(--text-primary)" }}>{corridor?.name}</strong> • GPS Origin: {corridor?.start_lat.toFixed(4)}°N, {corridor?.start_lon.toFixed(4)}°E
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", background: "var(--bg-surface)", padding: "4px", borderRadius: "10px", border: "1px solid var(--border-glass)" }}>
          {[
            { id: "ALL", label: `All (${segments.length})` },
            { id: "CRITICAL", label: `🔴 Critical (${segments.filter(s => s.condition_band === "Critical").length})` },
            { id: "MODERATE", label: `🟡 Moderate (${segments.filter(s => s.condition_band === "Moderate").length})` },
            { id: "GOOD", label: `🟢 Good (${segments.filter(s => s.condition_band === "Good").length})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterBand(f.id)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.76rem",
                fontWeight: filterBand === f.id ? 700 : 500,
                border: "none",
                cursor: "pointer",
                background: filterBand === f.id ? "var(--tab-active-bg)" : "transparent",
                color: filterBand === f.id ? "var(--tab-active-text)" : "var(--text-muted)",
                transition: "all 0.18s ease"
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {segments.some((s) => s.condition_band === "Critical") && (
        <div
          className="glass-panel glass-panel-glow-rose fade-in-up"
          style={{
            padding: "16px 20px",
            borderLeft: "5px solid var(--accent-rose)",
            background: "linear-gradient(135deg, rgba(255, 42, 95, 0.12) 0%, var(--bg-card-alt) 100%)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle size={20} color="var(--accent-rose)" className="beacon-critical" />
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--accent-rose)" }}>
                🚨 Immediate Fix Required: {segments.filter((s) => s.condition_band === "Critical").length} Critical Road Segments Detected
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>
                Severe potholes and fatigue cracking require urgent asphalt repair &lt; 48 hours.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {segments
              .filter((s) => s.condition_band === "Critical")
              .map((cs) => (
                <button
                  key={cs.segment_id}
                  onClick={() => setSelectedSegId(cs.segment_id)}
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

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "22px" }}>
        
        <div className="glass-panel" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <MapPin size={18} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
                High-Resolution Route Trajectory & Segment Heatmap
              </h3>
            </div>
            <span className="cyber-badge badge-emerald" style={{ fontSize: "0.72rem" }}>
              50-Meter Spatial Bins
            </span>
          </div>

          <div
            style={{
              position: "relative",
              width: "100%",
              height: "440px",
              borderRadius: "12px",
              overflow: "hidden",
              background: "radial-gradient(ellipse at center, #0a1128 0%, #030712 100%)",
              border: "1px solid var(--border-glow)",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.8)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            
            <div style={{ display: "flex", justifyContent: "space-between", zIndex: 2, flexWrap: "wrap", gap: "8px" }}>
              <div style={{ background: "rgba(10, 15, 30, 0.88)", padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.18)", fontSize: "0.75rem", color: "#ffffff" }}>
                <span style={{ color: "#cbd5e1", fontWeight: 700 }}>Route Start:</span> <strong style={{ color: "#ffffff" }}>{corridor?.start_lat.toFixed(4)}°N, {corridor?.start_lon.toFixed(4)}°E</strong>
              </div>
              <div style={{ background: "rgba(10, 15, 30, 0.88)", padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.18)", fontSize: "0.75rem", color: "#ffffff" }}>
                <span style={{ color: "#cbd5e1", fontWeight: 700 }}>Traffic:</span> <strong style={{ color: "#ffffff" }}>{corridor?.traffic_density}</strong>
              </div>
            </div>

            <div style={{ position: "relative", width: "100%", height: "260px", margin: "auto 0", display: "flex", alignItems: "center" }}>
              
              <div
                style={{
                  position: "absolute",
                  left: "2%",
                  right: "2%",
                  height: "48px",
                  background: "#1f2937",
                  borderRadius: "24px",
                  border: "2px solid #374151",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
                  display: "flex",
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                
                <div
                  style={{
                    width: "100%",
                    height: "3px",
                    backgroundImage: "linear-gradient(to right, #eab308 60%, transparent 40%)",
                    backgroundSize: "24px 3px",
                  }}
                />
              </div>

              <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "space-between", zIndex: 3, padding: "0 4%" }}>
                {segments.map((seg, idx) => {
                  const isSelected = seg.segment_id === selectedSegId;
                  const isCritical = seg.condition_band === "Critical";
                  const isMod = seg.condition_band === "Moderate";

                  return (
                    <div
                      key={seg.segment_id}
                      onClick={() => {
                        setSelectedSegId(seg.segment_id);
                        if (onSelectSegment) onSelectSegment(seg.segment_id);
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        cursor: "pointer",
                        transform: isSelected ? "scale(1.15)" : "scale(1.0)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      
                      <div
                        style={{
                          width: isSelected ? "38px" : "30px",
                          height: isSelected ? "38px" : "30px",
                          borderRadius: "50%",
                          background: seg.band_color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: isSelected
                            ? `0 0 20px ${seg.band_color}`
                            : `0 0 10px ${seg.band_color}88`,
                          border: isSelected ? "3px solid #ffffff" : "2px solid rgba(0,0,0,0.5)",
                          color: "#ffffff",
                          fontSize: "0.72rem",
                          fontWeight: 800,
                        }}
                      >
                        #{idx + 1}
                      </div>

                      <div
                        style={{
                          marginTop: "8px",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: isSelected ? "var(--accent-cyan)" : "#cbd5e1",
                          background: "rgba(10,15,30,0.85)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {seg.start_distance_m}m
                      </div>

                      {seg.defect_count > 0 && (
                        <div
                          style={{
                            fontSize: "0.62rem",
                            color: isCritical ? "#f87171" : isMod ? "#fbbf24" : "#34d399",
                            fontWeight: 700,
                            marginTop: "2px",
                          }}
                        >
                          {seg.pothole_count > 0 ? `🕳️ ${seg.pothole_count}` : `⚡ ${seg.crack_count}`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                background: "rgba(10, 15, 30, 0.9)",
                backdropFilter: "blur(8px)",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.75rem",
                flexWrap: "wrap",
                gap: "10px",
                zIndex: 2,
              }}
            >
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10B981" }} />
                  <span style={{ color: "#a7f3d0" }}>Good (SRI &lt; 30, PCI &gt; 75)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#F59E0B" }} />
                  <span style={{ color: "#fde68a" }}>Moderate (SRI 30-65, PCI 50-75)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#EF4444" }} />
                  <span style={{ color: "#fca5a5" }}>Critical (SRI &gt; 65, PCI &lt; 50)</span>
                </div>
              </div>
              <div style={{ color: "#cbd5e1", fontWeight: 600 }}>
                Click any node to inspect segment details
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px" }}>
            {filteredSegments.map((s) => {
              const isSelected = s.segment_id === selectedSegId;
              return (
                <div
                  key={s.segment_id}
                  onClick={() => setSelectedSegId(s.segment_id)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: isSelected ? "var(--tab-active-bg)" : "var(--bg-card-alt)",
                    border: isSelected ? "1.5px solid var(--accent-burgundy)" : "1px solid var(--border-glass)",
                    borderLeft: `4px solid ${s.band_color}`,
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: isSelected ? "var(--tab-active-text)" : "var(--text-primary)" }}>
                      {s.segment_id}
                    </span>
                    <span
                      className={`cyber-badge ${s.condition_band === "Critical" ? "badge-critical-blink" : s.condition_band === "Moderate" ? "badge-medium-blink" : ""}`}
                      style={{ fontSize: "0.68rem", fontWeight: 700, color: s.band_color, padding: "1px 6px", display: "inline-flex", alignItems: "center", gap: "3px" }}
                    >
                      <span className={s.condition_band === "Critical" ? "dot-critical-fast" : s.condition_band === "Moderate" ? "dot-medium-slow" : ""} style={{ width: "4px", height: "4px", borderRadius: "50%", background: "currentColor" }} />
                      {s.condition_band}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    SRI: <strong style={{ color: "var(--text-primary)" }}>{s.sri_score}</strong> • PCI: <strong style={{ color: "var(--text-primary)" }}>{s.pci_score}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
                    Distance: {selectedSegment.start_distance_m}m - {selectedSegment.end_distance_m}m
                  </div>
                </div>

                <span
                  className={`cyber-badge ${selectedSegment.condition_band === "Critical" ? "badge-rose badge-critical-blink" : selectedSegment.condition_band === "Moderate" ? "badge-amber badge-medium-blink" : ""}`}
                  style={{
                    background: `${selectedSegment.band_color}25`,
                    color: selectedSegment.band_color,
                    border: `1px solid ${selectedSegment.band_color}60`,
                    fontWeight: 800,
                    fontSize: "0.76rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span className={selectedSegment.condition_band === "Critical" ? "dot-critical-fast" : selectedSegment.condition_band === "Moderate" ? "dot-medium-slow" : ""} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "currentColor" }} />
                  {selectedSegment.condition_band.toUpperCase()}
                </span>
              </div>

              <div style={{ background: "var(--bg-card-alt)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-glass)", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>
                    📍 Exact GPS Coordinates:
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${selectedSegment.start_lat},${selectedSegment.start_lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-cyber-primary"
                    style={{
                      padding: "4px 8px",
                      fontSize: "0.68rem",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Compass size={11} />
                    <span>Open in Maps</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", fontFamily: "JetBrains Mono" }}>
                  Start: {selectedSegment.start_lat.toFixed(5)}°N, {selectedSegment.start_lon.toFixed(5)}°E
                </div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)", fontFamily: "JetBrains Mono" }}>
                  End: {selectedSegment.end_lat.toFixed(5)}°N, {selectedSegment.end_lon.toFixed(5)}°E
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "var(--bg-card-alt)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Segment Risk Index (SRI)</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: selectedSegment.band_color, marginTop: "2px" }}>
                    {selectedSegment.sri_score} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/ 100</span>
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Calculated from defect severity & traffic density
                  </div>
                </div>

                <div style={{ background: "var(--bg-card-alt)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Pavement Condition (PCI)</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--accent-cyan)", marginTop: "2px" }}>
                    {selectedSegment.pci_score} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/ 100</span>
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    ASTM D6433 Pavement Standard
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                  Defects within Segment ({selectedSegment.defects.length}):
                </div>

                {selectedSegment.defects.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", background: "rgba(16, 185, 129, 0.08)", borderRadius: "8px", color: "var(--accent-emerald)", fontSize: "0.82rem", fontWeight: 600 }}>
                    ✅ Clear Segment • No defects detected
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto" }}>
                    {selectedSegment.defects.map((d, dIdx) => (
                      <div
                        key={dIdx}
                        style={{
                          background: d.severity_level === "Critical" ? "rgba(255, 42, 95, 0.12)" : "var(--bg-card-alt)",
                          padding: "10px 12px",
                          borderRadius: "6px",
                          border: d.severity_level === "Critical" ? "1px solid rgba(255, 42, 95, 0.4)" : "1px solid var(--border-glass)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: d.color_hex, display: "flex", alignItems: "center", gap: "4px" }}>
                            {d.defect_type.toLowerCase().includes("pothole") ? "🕳️" : "⚡"} {d.rdd_code}: {d.defect_type.replace(/_/g, " ")}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            Area: {d.estimated_area_cm2} cm² • Depth: {d.estimated_depth_cm} cm
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            className="cyber-badge"
                            style={{
                              background: `${d.color_hex}18`,
                              color: d.color_hex,
                              border: `1px solid ${d.color_hex}40`,
                              fontSize: "0.68rem",
                            }}
                          >
                            {d.severity_level}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${selectedSegment.start_lat},${selectedSegment.start_lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--accent-cyan)", display: "inline-flex" }}
                            title="Open in Google Maps"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
