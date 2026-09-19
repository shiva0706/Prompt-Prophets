import React, { useState } from "react";
import {
  Download,
  HardHat,
  MapPin,
  ExternalLink,
} from "lucide-react";
import type { FullRoadInspectionReport, RoadWorkOrderItem } from "../types";

interface MaintenancePrioritizationProps {
  report: FullRoadInspectionReport | null;
}

export const MaintenancePrioritization: React.FC<MaintenancePrioritizationProps> = ({ report }) => {
  const [filterUrgency, setFilterUrgency] = useState<string>("ALL");
  const [completedOrders, setCompletedOrders] = useState<Record<string, boolean>>({});

  const workOrders: RoadWorkOrderItem[] = report?.work_orders || [];

  const filteredOrders = workOrders.filter((wo) => {
    if (filterUrgency === "ALL") return true;
    if (filterUrgency === "IMMEDIATE") return wo.urgency.includes("Immediate");
    if (filterUrgency === "HIGH") return wo.urgency.includes("High");
    if (filterUrgency === "SCHEDULED") return wo.urgency.includes("Scheduled");
    return true;
  });

  const totalCost = workOrders.reduce((acc, wo) => acc + (wo.estimated_cost_inr ?? (wo.estimated_cost_usd ? wo.estimated_cost_usd * 83 : 0)), 0);
  const immediateCount = workOrders.filter((wo) => wo.urgency.includes("Immediate")).length;
  const highCount = workOrders.filter((wo) => wo.urgency.includes("High")).length;

  const handleToggleComplete = (woId: string) => {
    setCompletedOrders((prev: Record<string, boolean>) => ({
      ...prev,
      [woId]: !prev[woId],
    }));
  };

  const handleExportCsv = () => {
    if (workOrders.length === 0) return;
    const headers = ["Work_Order_ID", "Segment_ID", "Location", "Defect_Type", "Severity_Level", "Urgency", "Priority_Rank", "Treatment", "Materials", "Equipment", "Estimated_Cost_INR", "Crew_Size"];
    const rows = workOrders.map((wo) => [
      wo.work_order_id,
      wo.segment_id,
      `"${wo.location}"`,
      wo.defect_type,
      wo.severity_level,
      `"${wo.urgency}"`,
      wo.priority_rank,
      `"${wo.treatment}"`,
      `"${wo.materials.join("; ")}"`,
      `"${wo.equipment.join("; ")}"`,
      wo.estimated_cost_inr ?? (wo.estimated_cost_usd ? wo.estimated_cost_usd * 83 : 0),
      wo.crew_size
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `road_maintenance_prioritization_work_orders_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        <div className="glass-panel glass-panel-glow-rose" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              🚨 Emergency Action Orders
            </span>
            <span className="cyber-badge badge-rose" style={{ fontSize: "0.68rem" }}>
              &lt; 48 Hours
            </span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f87171" }}>
            {immediateCount} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Critical Work Orders</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Severe potholes and structural alligator fractures
          </div>
        </div>

        <div className="glass-panel glass-panel-glow-amber" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              ⚠️ High Priority Maintenance
            </span>
            <span className="cyber-badge badge-amber" style={{ fontSize: "0.68rem" }}>
              7 - 14 Days
            </span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fbbf24" }}>
            {highCount} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Work Orders</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Polymer micro-surfacing & drainage clearing
          </div>
        </div>

        <div className="glass-panel glass-panel-glow-cyan" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              💰 Total Estimated Repair Budget
            </span>
            <span className="cyber-badge badge-cyan" style={{ fontSize: "0.68rem" }}>
              Civil Works
            </span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-cyan)" }}>
            ₹{totalCost.toLocaleString('en-IN')} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>INR</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Includes Hot Mix Asphalt, materials, and equipment
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              👷 Dispatched Repair Crews
            </span>
            <span className="cyber-badge badge-emerald" style={{ fontSize: "0.68rem" }}>
              Active
            </span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
            4 Crews <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>(15 Personnel)</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Compactors, asphalt cutters & melters assigned
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "22px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <HardHat size={20} color="var(--accent-amber)" />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              Prioritized Maintenance Work Order Queue ({filteredOrders.length})
            </h3>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            
            <div style={{ display: "flex", gap: "6px", background: "var(--bg-surface)", padding: "4px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
              {[
                { id: "ALL", label: `All (${workOrders.length})` },
                { id: "IMMEDIATE", label: `🚨 Immediate (${immediateCount})` },
                { id: "HIGH", label: `⚠️ High (${highCount})` },
                { id: "SCHEDULED", label: `📋 Scheduled (${workOrders.length - immediateCount - highCount})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterUrgency(f.id)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    fontSize: "0.74rem",
                    fontWeight: filterUrgency === f.id ? 700 : 500,
                    border: "none",
                    cursor: "pointer",
                    background: filterUrgency === f.id ? "var(--bg-card-hover)" : "transparent",
                    color: filterUrgency === f.id ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCsv}
              className="btn-cyber-primary"
              style={{ padding: "8px 14px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Download size={14} />
              Export Work Orders (CSV)
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filteredOrders.map((wo) => {
            const isDone = !!completedOrders[wo.work_order_id];
            const isImmediate = wo.urgency.includes("Immediate");
            const isHigh = wo.urgency.includes("High");

            return (
              <div
                key={wo.work_order_id}
                style={{
                  background: isDone
                    ? "rgba(16, 185, 129, 0.08)"
                    : isImmediate
                    ? "rgba(239, 68, 68, 0.08)"
                    : isHigh
                    ? "rgba(245, 158, 11, 0.08)"
                    : "var(--bg-card)",
                  border: isDone
                    ? "1px solid rgba(16, 185, 129, 0.3)"
                    : isImmediate
                    ? "1px solid rgba(239, 68, 68, 0.35)"
                    : isHigh
                    ? "1px solid rgba(245, 158, 11, 0.35)"
                    : "1px solid var(--border-glass)",
                  borderLeft: `5px solid ${isDone ? "#10B981" : isImmediate ? "#EF4444" : isHigh ? "#F59E0B" : "var(--accent-burgundy)"}`,
                  borderRadius: "10px",
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: isImmediate ? "#EF4444" : isHigh ? "#F59E0B" : "var(--accent-cyan)",
                        color: "#060913",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: "0.78rem",
                      }}
                    >
                      P{wo.priority_rank}
                    </span>
                    <div>
                      <div style={{ fontSize: "1.02rem", fontWeight: 800, color: isDone ? "var(--text-muted)" : "var(--text-primary)", textDecoration: isDone ? "line-through" : "none" }}>
                        {wo.title}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "3px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span>ID: <strong className="code-font" style={{ color: "var(--accent-cyan)" }}>{wo.work_order_id}</strong></span>
                        <span>•</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={12} color="var(--accent-rose)" />
                          <strong>{wo.location}</strong> ({wo.segment_id})
                        </span>
                        {(() => {
                          const match = wo.location.match(/\(([\d.]+)\s*N,\s*([\d.]+)\s*E\)/);
                          if (match) {
                            return (
                              <a
                                href={`https://www.google.com/maps?q=${match[1]},${match[2]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "var(--accent-cyan)",
                                  fontSize: "0.72rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  textDecoration: "underline",
                                  marginLeft: "4px",
                                }}
                              >
                                <span>[Open Maps]</span>
                                <ExternalLink size={10} />
                              </a>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      className={`cyber-badge ${isImmediate ? "badge-rose badge-critical-blink" : isHigh ? "badge-amber badge-warning-blink" : "badge-cyan"}`}
                      style={{
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <span className={isImmediate ? "dot-critical-fast" : isHigh ? "dot-warning-slow" : ""} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "currentColor" }} />
                      {wo.urgency}
                    </span>

                    <button
                      onClick={() => handleToggleComplete(wo.work_order_id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1px solid var(--border-glass)",
                        background: isDone ? "rgba(16, 185, 129, 0.2)" : "var(--bg-surface)",
                        color: isDone ? "var(--accent-emerald)" : "var(--text-primary)",
                      }}
                    >
                      {isDone ? "✓ Completed" : "Mark Dispatched"}
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: "0.8rem", color: "var(--text-primary)", background: "var(--bg-surface)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
                  🛠️ <strong>Treatment Protocol:</strong> {wo.treatment}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                    <span>📦 <strong>Materials:</strong> {wo.materials.join(", ")}</span>
                    <span>🚜 <strong>Equipment:</strong> {wo.equipment.join(", ")}</span>
                    <span>👷 <strong>Crew:</strong> {wo.crew_size} Personnel</span>
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--accent-cyan)" }}>
                    Est. Cost: ₹{(wo.estimated_cost_inr ?? (wo.estimated_cost_usd ? wo.estimated_cost_usd * 83 : 0)).toLocaleString('en-IN')} INR
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
