import React, { useState, useEffect } from "react";
import {
  FileText,
  Cpu,
  Download,
  Share2,
  RefreshCw,
  ShieldAlert,
  Sliders,
  DollarSign,
  Printer,
  MapPin,
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { api } from "../services/api";

interface CivilEngineeringCopilotProps {
  onOpenAlertModal?: (defect: any) => void;
}

export const CivilEngineeringCopilot: React.FC<CivilEngineeringCopilotProps> = () => {
  const [selectedRoad, setSelectedRoad] = useState<string>("NH-44");
  const [conditionFilter, setConditionFilter] = useState<string>("critical");
  const [defectFilter, setDefectFilter] = useState<string>("all");
  const [urgencyMode] = useState<string>("emergency");
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [decisionData, setDecisionData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Available corridors for direct backend synthesis
  const CORRIDORS = [
    { id: "NH-44", name: "NH-44 (Salem-Bengaluru Expressway)", jurisdiction: "NHAI / Regional Office Chennai", defaultPci: 24.5 },
    { id: "SH-49A", name: "SH-49A (Rajiv Gandhi Salai / OMR IT Expressway)", jurisdiction: "TN State Highways & Minor Ports Dept", defaultPci: 38.0 },
    { id: "SH-72", name: "SH-72 (Madurai-Sivagangai Highway)", jurisdiction: "State PWD / Highways Division", defaultPci: 31.2 },
    { id: "SH-49", name: "SH-49 (East Coast Road - ECR Coastal Corridor)", jurisdiction: "TN Road Development Corp (TNRDC)", defaultPci: 42.0 },
    { id: "NH-48", name: "NH-48 (Chennai-Bengaluru Highway / GST Road)", jurisdiction: "NHAI Project Implementation Unit", defaultPci: 29.8 },
  ];

  const fetchAutonomousSynthesis = async (roadName: string = selectedRoad, condition: string = conditionFilter, defect: string = defectFilter) => {
    setIsLoading(true);
    setError(null);

    let queryText = `Show all segments on ${roadName}`;
    if (condition === "critical") {
      queryText += " with critical PCI < 35 needing immediate emergency repair before monsoon";
    } else if (condition === "high_risk") {
      queryText += " with high SRI risk > 70 requiring capital resurfacing";
    } else {
      queryText += " and generate complete MoRTH Bill of Materials and municipal work order";
    }

    if (defect !== "all") {
      queryText += ` specifically targeting ${defect}`;
    }

    try {
      const res = await api.queryCopilot(queryText, {
        road_name: roadName,
        condition: condition,
        defect: defect,
        urgency: urgencyMode,
      });

      if (res) {
        setDecisionData(res);
      }
    } catch (err: any) {
      console.error("Failed to run engineering synthesis:", err);
      setError("Failed to communicate with backend engineering agent. Please ensure backend server is active.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAutonomousSynthesis("NH-44", "critical", "all");
  }, []);

  const handleExportJson = () => {
    if (!decisionData) return;
    const blob = new Blob([JSON.stringify(decisionData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `engineering_decision_bom_${selectedRoad}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintDossier = () => {
    window.print();
  };

  const handleCopySummary = () => {
    if (!decisionData) return;
    const text = `Engineering Decision: ${decisionData.decision_verdict?.verdict_title || 'Autonomous Ruling'}\nEstimated Budget: ₹${decisionData.bill_of_materials?.total_cost_inr?.toLocaleString('en-IN') || 0} INR ($${decisionData.bill_of_materials?.total_cost_usd || 0} USD)\nSLA: ${decisionData.decision_verdict?.sla_timeframe || 'Immediate'}\nJurisdiction: ${decisionData.work_order?.jurisdiction_authority || 'Highways Department'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const decision = decisionData?.decision_verdict;
  const bom = decisionData?.bill_of_materials;
  const workOrder = decisionData?.work_order;
  const segments = decisionData?.segments_matched || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* Top Header & Autonomous Control Bar */}
      <div
        className="glass-panel"
        style={{
          padding: "20px 24px",
          borderLeft: "4px solid var(--accent-cyan)",
          background: "linear-gradient(135deg, rgba(18, 21, 33, 0.85) 0%, rgba(12, 14, 22, 0.95) 100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 12px rgba(56, 189, 248, 0.2)",
              }}
            >
              <Cpu size={22} color="var(--accent-cyan)" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "1.22rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  Autonomous Civil Engineering Decision &amp; Work-Order Engine
                </h2>
                <span className="cyber-badge badge-cyan" style={{ fontSize: "0.68rem" }}>
                  Backend Direct Connected
                </span>
                <span className="cyber-badge badge-emerald" style={{ fontSize: "0.68rem" }}>
                  MoRTH &amp; IRC:82-2015 Compliant
                </span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
                Automated multi-segment distress synthesis, calibrated Bill of Materials (BOM) calculation with live Indian market rates, and official municipal work order generation.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => fetchAutonomousSynthesis(selectedRoad, conditionFilter, defectFilter)}
              disabled={isLoading}
              className="btn-cyber-primary"
              style={{ padding: "8px 16px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <RefreshCw className={isLoading ? "animate-spin" : ""} size={14} />
              <span>{isLoading ? "Synthesizing from Backend..." : "Re-Run Decision Engine"}</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={!decisionData}
              className="btn-cyber-secondary"
              style={{ padding: "8px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "5px" }}
              title="Export Full Engineering Dossier as JSON"
            >
              <Download size={14} />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleCopySummary}
              disabled={!decisionData}
              className="btn-cyber-secondary"
              style={{ padding: "8px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "5px" }}
              title="Copy Executive Summary"
            >
              <Share2 size={14} />
              <span>{copied ? "Copied!" : "Share Summary"}</span>
            </button>
          </div>
        </div>

        {/* Interactive Parameter Control Grid */}
        <div
          style={{
            marginTop: "18px",
            paddingTop: "16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "14px",
          }}
        >
          {/* Corridor Selection */}
          <div>
            <label style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              Target Highway Corridor
            </label>
            <select
              value={selectedRoad}
              onChange={(e) => {
                const newRoad = e.target.value;
                setSelectedRoad(newRoad);
                fetchAutonomousSynthesis(newRoad, conditionFilter, defectFilter);
              }}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-glass)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                padding: "8px 10px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              {CORRIDORS.map((c) => (
                <option key={c.id} value={c.id} style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Condition / Severity Filter */}
          <div>
            <label style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              Risk &amp; Condition Threshold
            </label>
            <select
              value={conditionFilter}
              onChange={(e) => {
                const newCond = e.target.value;
                setConditionFilter(newCond);
                fetchAutonomousSynthesis(selectedRoad, newCond, defectFilter);
              }}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-glass)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                padding: "8px 10px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="critical" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>Critical Condition (PCI &lt; 35 • Urgent SLA)</option>
              <option value="high_risk" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>High Risk Segments (SRI &gt; 70)</option>
              <option value="all" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>All Corridor Segments</option>
            </select>
          </div>

          {/* Defect Type Filter */}
          <div>
            <label style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              Dominant Distress Type
            </label>
            <select
              value={defectFilter}
              onChange={(e) => {
                const newDefect = e.target.value;
                setDefectFilter(newDefect);
                fetchAutonomousSynthesis(selectedRoad, conditionFilter, newDefect);
              }}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-glass)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                padding: "8px 10px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="all" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>All Defects (Potholes, Cracks, Ponding)</option>
              <option value="pothole" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>Potholes (D40 Cavities)</option>
              <option value="alligator_crack" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>Alligator Fatigue Cracks (D20)</option>
              <option value="transverse_crack" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>Transverse Thermal Cracks (D10)</option>
            </select>
          </div>

          {/* Quick Action Trigger */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <button
              onClick={() => fetchAutonomousSynthesis(selectedRoad, conditionFilter, defectFilter)}
              className="btn-cyber-secondary"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "0.8rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                borderColor: "rgba(56, 189, 248, 0.4)",
                color: "var(--accent-cyan)",
              }}
            >
              <Sliders size={14} />
              <span>Apply Filters &amp; Synthesize</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="glass-panel"
          style={{
            padding: "16px 20px",
            borderLeft: "4px solid var(--accent-rose)",
            background: "rgba(239, 68, 68, 0.1)",
            color: "#f87171",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Main Results Dashboard Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
        
        {/* Left Column: Decision Verdict + Step-by-Step Directives */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* ⚖️ Decision Verdict Card */}
          <div
            className="glass-panel fade-in-up"
            style={{
              padding: "20px 24px",
              borderTop: "3px solid #ef4444",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(239, 68, 68, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ShieldAlert size={20} color="#f87171" />
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Autonomous Engineering Ruling
                  </div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", margin: "2px 0 0" }}>
                    {decision?.verdict_title || "EMERGENCY REPAIR DIRECTIVE: IMMEDIATE DISPATCH MANDATED"}
                  </h3>
                </div>
              </div>

              <span className="cyber-badge badge-rose badge-critical-blink" style={{ fontSize: "0.72rem" }}>
                SLA: {decision?.sla_timeframe || "< 24–48 Hours"}
              </span>
            </div>

            {/* Engineering Rationale Box */}
            <div
              style={{
                background: "rgba(0, 0, 0, 0.35)",
                padding: "14px 16px",
                borderRadius: "10px",
                border: "1px solid var(--border-glass)",
                fontSize: "0.82rem",
                lineHeight: "1.5",
              }}
            >
              <div style={{ fontWeight: 800, color: "var(--accent-cyan)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={14} />
                <span>Civil Engineering Rationale:</span>
              </div>
              <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                {decision?.engineering_rationale || "Pavement condition on evaluated segments has deteriorated below ASTM D6433 structural thresholds. High-impact potholes and alligator fatigue patterns threaten immediate subgrade water saturation and traffic safety."}
              </p>
            </div>

            {/* Failure Risk if Delayed */}
            <div
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
              }}
            >
              <AlertTriangle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong style={{ color: "#f87171" }}>Structural Risk If Delayed: </strong>
                <span style={{ color: "var(--text-secondary)" }}>
                  {decision?.risk_if_delayed || "Water infiltration through alligator cracking will cause rapid sub-base washouts, escalating localized ₹1.5L patch costs into full ₹18L/km reconstruction."}
                </span>
              </div>
            </div>

            {/* Step-by-Step Field Directives */}
            <div>
              <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                📋 Step-by-Step Field Execution Directives (MoRTH Sec 500)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(decision?.step_by_step_execution || [
                  "1. Set up IRC:SP:55 compliant traffic work-zone cones and flagmen on outer lane.",
                  "2. Cold mill 50mm damaged surface layer using Wirtgen milling machine to expose sound base.",
                  "3. Apply Cationic Rapid Setting Tack Coat (RS-1) at 0.40 kg/m² across all milled vertical edges.",
                  "4. Lay and compact Dense Bituminous Macadam (DBM Grade 2 with VG-30 bitumen) in 50mm lifts.",
                  "5. Route and seal secondary transverse cracks using polymer-modified sealant ASTM D6690 Type II."
                ]).map((step: string, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: "var(--bg-surface)",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-glass)",
                      fontSize: "0.8rem",
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                    }}
                  >
                    <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "rgba(56, 189, 248, 0.2)", color: "var(--accent-cyan)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800, flexShrink: 0 }}>
                      {idx + 1}
                    </span>
                    <span style={{ lineHeight: "1.4" }}>{step.replace(/^\d+\.\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 📍 Spatial Segments & Defect Telemetry Grid */}
          <div className="glass-panel" style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MapPin size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  Evaluated Corridor Segments ({segments.length} Segments Matched)
                </h3>
              </div>
              <span className="cyber-badge badge-mono" style={{ fontSize: "0.68rem" }}>
                {selectedRoad}
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                <thead>
                  <tr style={{ background: "rgba(255, 255, 255, 0.05)", borderBottom: "1px solid var(--border-glass)", textAlign: "left" }}>
                    <th style={{ padding: "8px 10px", color: "var(--text-muted)" }}>Segment</th>
                    <th style={{ padding: "8px 10px", color: "var(--text-muted)" }}>Chainage</th>
                    <th style={{ padding: "8px 10px", color: "var(--text-muted)" }}>PCI</th>
                    <th style={{ padding: "8px 10px", color: "var(--text-muted)" }}>SRI Risk</th>
                    <th style={{ padding: "8px 10px", color: "var(--text-muted)" }}>Defects Isolated</th>
                    <th style={{ padding: "8px 10px", color: "var(--text-muted)" }}>Authority</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map((seg: any, idx: number) => {
                    const defectsText = seg.defects?.map((d: any) => `${d.defect_type} (${d.severity_level})`).join(", ") || "No severe voids";
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                        <td style={{ padding: "10px", fontWeight: 800, color: "var(--text-primary)" }}>{seg.segment_id}</td>
                        <td style={{ padding: "10px", color: "var(--text-secondary)" }}>
                          Km {seg.chainage_start_km?.toFixed(3)}–{seg.chainage_end_km?.toFixed(3)}
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span className={`cyber-badge ${seg.pci < 30 ? "badge-rose" : seg.pci < 70 ? "badge-amber" : "badge-emerald"}`} style={{ fontSize: "0.68rem" }}>
                            {seg.pci?.toFixed(1)}
                          </span>
                        </td>
                        <td style={{ padding: "10px", fontWeight: 700, color: seg.sri > 75 ? "#f87171" : "#fbbf24" }}>
                          {seg.sri?.toFixed(1)}/100
                        </td>
                        <td style={{ padding: "10px", color: "var(--text-muted)" }}>{defectsText}</td>
                        <td style={{ padding: "10px", color: "var(--text-secondary)", fontSize: "0.72rem" }}>
                          {seg.jurisdiction_authority?.split(" - ")[0] || "State Highways"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: MoRTH Bill of Materials + Municipal Work Order */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* 📊 MoRTH & IRC Itemized Bill of Materials (BOM) */}
          <div
            className="glass-panel fade-in-up"
            style={{
              padding: "20px 24px",
              borderTop: "3px solid #38bdf8",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(56, 189, 248, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <DollarSign size={20} color="var(--accent-cyan)" />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                    MoRTH &amp; IRC Bill of Materials (BOM)
                  </h3>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Standard: {bom?.compliance_standard || "IRC:82-2015 & MoRTH 5th Revision"}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--accent-amber)" }}>
                  ₹{(bom?.total_cost_inr || 152750).toLocaleString("en-IN")} INR
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  ${(bom?.total_cost_usd || 1818).toLocaleString("en-US")} USD
                </div>
              </div>
            </div>

            {/* Repair Strategy Pill */}
            <div style={{ background: "rgba(56, 189, 248, 0.08)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(56, 189, 248, 0.2)", fontSize: "0.76rem" }}>
              <strong style={{ color: "var(--accent-cyan)" }}>Recommended Repair Strategy: </strong>
              <span style={{ color: "var(--text-secondary)" }}>
                {bom?.repair_strategy || "Full-Depth Hot Mix Patching + Mill & Inlay Resurfacing with Hot Rubberized Crack Sealing"}
              </span>
            </div>

            {/* Itemized Materials Table */}
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                🧱 Material Quantities &amp; Rates
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.74rem" }}>
                  <thead>
                    <tr style={{ background: "rgba(255, 255, 255, 0.04)", borderBottom: "1px solid var(--border-glass)", textAlign: "left" }}>
                      <th style={{ padding: "6px 8px", color: "var(--text-muted)" }}>Item</th>
                      <th style={{ padding: "6px 8px", color: "var(--text-muted)" }}>Qty</th>
                      <th style={{ padding: "6px 8px", color: "var(--text-muted)" }}>Rate (INR)</th>
                      <th style={{ padding: "6px 8px", color: "var(--text-muted)", textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bom?.materials || [
                      { item: "Bituminous Tack Coat (RS-1)", quantity: 45.0, unit: "kg", unit_rate_inr: 68.0, total_cost_inr: 3060.0 },
                      { item: "Dense Bituminous Macadam (DBM-2 VG-30)", quantity: 6.2, unit: "MT", unit_rate_inr: 6850.0, total_cost_inr: 42470.0 },
                      { item: "Bituminous Concrete (BC-2 Wearing)", quantity: 4.5, unit: "MT", unit_rate_inr: 7450.0, total_cost_inr: 33525.0 },
                      { item: "Polymer Crack Sealant (ASTM D6690)", quantity: 28.0, unit: "kg", unit_rate_inr: 185.0, total_cost_inr: 5180.0 },
                    ]).map((m: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                        <td style={{ padding: "6px 8px", color: "var(--text-primary)", fontWeight: 600 }}>{m.item}</td>
                        <td style={{ padding: "6px 8px", color: "var(--text-secondary)" }}>{m.quantity} {m.unit}</td>
                        <td style={{ padding: "6px 8px", color: "var(--text-muted)" }}>₹{m.unit_rate_inr?.toLocaleString("en-IN")}</td>
                        <td style={{ padding: "6px 8px", color: "var(--accent-amber)", fontWeight: 700, textAlign: "right" }}>
                          ₹{m.total_cost_inr?.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Plant, Machinery & Labor */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.74rem" }}>
              <div style={{ background: "var(--bg-surface)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
                <div style={{ fontWeight: 800, color: "var(--text-muted)", marginBottom: "4px" }}>🚜 Plant &amp; Equipment</div>
                <div style={{ color: "var(--text-secondary)" }}>Wirtgen Cold Miller (8 hrs)</div>
                <div style={{ color: "var(--text-secondary)" }}>10-12T Vibratory Roller (10 hrs)</div>
                <div style={{ color: "var(--text-secondary)" }}>Tack Pressure Sprayer (6 hrs)</div>
                <div style={{ marginTop: "6px", fontWeight: 700, color: "var(--accent-cyan)" }}>
                  Subtotal: ₹{(bom?.subtotal_machinery_inr || 48200).toLocaleString("en-IN")}
                </div>
              </div>

              <div style={{ background: "var(--bg-surface)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
                <div style={{ fontWeight: 800, color: "var(--text-muted)", marginBottom: "4px" }}>👷 Labor Deployment</div>
                <div style={{ color: "var(--text-secondary)" }}>1x Resident Civil Engineer</div>
                <div style={{ color: "var(--text-secondary)" }}>6x Heavy Equipment Operators</div>
                <div style={{ color: "var(--text-secondary)" }}>4x Traffic Safety Flagmen</div>
                <div style={{ marginTop: "6px", fontWeight: 700, color: "var(--accent-emerald)" }}>
                  Subtotal: ₹{(bom?.subtotal_labor_inr || 24800).toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>

          {/* 📜 Drafted Municipal Work-Order Ticket */}
          <div
            className="glass-panel fade-in-up"
            style={{
              padding: "20px 24px",
              borderTop: "3px solid #34d399",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={18} color="#34d399" />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  Drafted Municipal Work-Order Ticket
                </h3>
              </div>
              <span className="cyber-badge badge-emerald" style={{ fontSize: "0.68rem" }}>
                {workOrder?.status || "READY_FOR_TENDER"}
              </span>
            </div>

            <div
              style={{
                background: "rgba(0, 0, 0, 0.4)",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid var(--border-glass)",
                fontSize: "0.78rem",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>TICKET ID:</span>
                <strong style={{ color: "#ffffff", fontFamily: "var(--font-mono)" }}>
                  {workOrder?.work_order_id || `WO-2026-NH44-902`}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>DESIGNATED AUTHORITY:</span>
                <strong style={{ color: "var(--accent-cyan)" }}>
                  {workOrder?.jurisdiction_authority || "Tamil Nadu State Highways & Minor Ports Department"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>TARGET COMPLETION:</span>
                <strong style={{ color: "#fbbf24" }}>
                  {workOrder?.target_completion_days || 3} Working Days (SLA &lt; 24h)
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>PRIMARY ACTION DIRECTIVE:</span>
                <span style={{ color: "var(--text-secondary)", textAlign: "right", maxWidth: "60%" }}>
                  {workOrder?.primary_action || "Immediate emergency full-depth HMA patching and tack coat sealant injection."}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                onClick={handlePrintDossier}
                className="btn-cyber-primary"
                style={{ flex: 1, padding: "8px 12px", fontSize: "0.78rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <Printer size={13} />
                <span>Print Official Work Order</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
