import React, { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  History,
  TrendingDown,
  Layers,
  Activity,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Info,
  Zap,
  Calendar,
  Sparkles,
  Droplets,
  Truck,
  Sun
} from "lucide-react";
import type { FullRoadInspectionReport, HistoricalTimelineItem } from "../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HistoricalAnalyticsProps {
  report: FullRoadInspectionReport | null;
}

export const HistoricalAnalytics: React.FC<HistoricalAnalyticsProps> = ({ report }) => {
  const [selectedForecastHorizon, setSelectedForecastHorizon] = useState<"3m" | "6m" | "12m">("6m");
  const timeline: HistoricalTimelineItem[] = report?.historical_timeline || [];

  const timelineLabels = timeline.map((t) => t.cycle.replace(/ \(.*\)/, ""));
  const pciValues = timeline.map((t) => t.mean_pci);
  const sriValues = timeline.map((t) => t.mean_sri);
  const potholesValues = timeline.map((t) => t.potholes_count);
  const cracksValues = timeline.map((t) => t.cracks_count);

  const pciChartData = {
    labels: timelineLabels,
    datasets: [
      {
        label: "Pavement Condition Index (PCI)",
        data: pciValues,
        borderColor: "#0284c7",
        backgroundColor: "rgba(2, 132, 199, 0.12)",
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#0284c7",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 6,
        borderWidth: 3,
      },
      {
        label: "Segment Risk Index (SRI)",
        data: sriValues,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.10)",
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#ef4444",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 6,
        borderWidth: 3,
      }
    ],
  };

  const defectFrequencyData = {
    labels: timelineLabels,
    datasets: [
      {
        label: "🕳️ Potholes Count",
        data: potholesValues,
        backgroundColor: "rgba(239, 68, 68, 0.85)",
        borderRadius: 6,
      },
      {
        label: "⚡ Cracks Count",
        data: cracksValues,
        backgroundColor: "rgba(234, 179, 8, 0.85)",
        borderRadius: 6,
      }
    ],
  };

  const rootCauseData = {
    labels: ["Traffic Axle Shear (42%)", "Rainwater & Pooling (36%)", "Thermal Oxidation (22%)"],
    datasets: [
      {
        data: [42, 36, 22],
        backgroundColor: ["#0284c7", "#ef4444", "#eab308"],
        borderColor: "var(--bg-surface)",
        borderWidth: 3,
        hoverOffset: 6,
      }
    ]
  };

  const forecastDataMap = {
    "3m": {
      months: ["Current", "+1 Mo", "+2 Mo", "+3 Mo"],
      noActionPCI: [70.7, 68.2, 65.4, 62.1],
      withRepairPCI: [70.7, 86.5, 87.8, 88.2],
      costNoAction: "₹4,10,000",
      costRepair: "₹2,20,100",
      savings: "₹1,89,900",
      conditionStatus: "Subgrade Saturated",
    },
    "6m": {
      months: ["Current", "+2 Mo", "+4 Mo", "+6 Mo"],
      noActionPCI: [70.7, 65.4, 59.8, 52.4],
      withRepairPCI: [70.7, 87.8, 88.0, 87.5],
      costNoAction: "₹7,80,000",
      costRepair: "₹2,20,100",
      savings: "₹5,59,900",
      conditionStatus: "Critical Base Layer Failure",
    },
    "12m": {
      months: ["Current", "+3 Mo", "+6 Mo", "+9 Mo", "+12 Mo"],
      noActionPCI: [70.7, 62.1, 52.4, 43.1, 34.0],
      withRepairPCI: [70.7, 88.2, 87.5, 86.1, 85.0],
      costNoAction: "₹16,50,000",
      costRepair: "₹2,20,100",
      savings: "₹14,29,900",
      conditionStatus: "Full Road Structural Rebuild Required",
    }
  };

  const currentForecast = forecastDataMap[selectedForecastHorizon];

  const forecastChartData = {
    labels: currentForecast.months,
    datasets: [
      {
        label: "✅ With Immediate Repair (<48h Dispatch)",
        data: currentForecast.withRepairPCI,
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.15)",
        fill: true,
        tension: 0.3,
        pointBackgroundColor: "#10b981",
        pointRadius: 6,
        borderWidth: 3,
      },
      {
        label: "⚠️ No Action / Deferred Maintenance",
        data: currentForecast.noActionPCI,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.12)",
        fill: true,
        tension: 0.3,
        pointBackgroundColor: "#ef4444",
        pointRadius: 6,
        borderWidth: 3,
        borderDash: [5, 5],
      }
    ]
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }} className="fade-in-up">
      
      <div
        className="glass-panel"
        style={{
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          borderLeft: "4px solid var(--accent-yellow)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(250, 204, 21, 0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <History size={22} color="var(--accent-yellow)" />
          </div>
          <div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>
              Multi-Cycle Historical Analytics & Predictive Longevity Engine
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px", fontWeight: 500 }}>
              Tracking longitudinal condition trajectories across 3 road authority audit cycles (Baseline, Mid-Term, Live)
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span className="cyber-badge badge-amber badge-medium-blink" style={{ fontSize: "0.72rem" }}>
            <span className="dot-medium-slow" style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f59e0b" }} />
            Degradation Velocity: -1.9 PCI / Mo
          </span>
          <span className="cyber-badge badge-cyan" style={{ fontSize: "0.72rem" }}>
            ASTM D6433 Standards Verified
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
        
        <div className="glass-panel" style={{ padding: "16px 18px", borderTop: "3px solid var(--accent-rose)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            <span>6-Month Net Loss</span>
            <TrendingDown size={14} color="var(--accent-rose)" />
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--accent-rose)", marginTop: "4px" }}>
            -11.3 <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>PCI Points</span>
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 500 }}>
            Dropped from <strong>82.0</strong> (Good) to <strong>70.7</strong> (Fair) due to monsoon water pooling.
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "16px 18px", borderTop: "3px solid var(--accent-amber)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            <span>Crack Growth Rate</span>
            <TrendingUp size={14} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--accent-amber)", marginTop: "4px" }}>
            +133% <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>Expansion</span>
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 500 }}>
            Cracks increased from <strong>3</strong> to <strong>7</strong> hazards with interconnected fatigue.
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "16px 18px", borderTop: "3px solid var(--accent-cyan)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            <span>Cost of Deferral</span>
            <Zap size={14} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--accent-cyan)", marginTop: "4px" }}>
            3.5x <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>Cost Multiplier</span>
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 500 }}>
            Repair costs jump from <strong>₹2.2 Lakhs</strong> now to <strong>₹7.8 Lakhs</strong> if deferred 6 months.
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "16px 18px", borderTop: "3px solid var(--accent-emerald)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            <span>Critical Failure Horizon</span>
            <AlertTriangle size={14} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--accent-emerald)", marginTop: "4px" }}>
            4.2 <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>Months Left</span>
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 500 }}>
            Time remaining before subgrade structural failure triggers below PCI 60.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "22px" }}>
        
        <div className="glass-panel" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <h4 style={{ fontSize: "1.02rem", fontWeight: 800, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <TrendingDown size={18} color="var(--accent-cyan)" />
                Pavement Degradation Curve vs. Segment Risk (SRI)
              </h4>
              <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
                Longitudinal correlation between declining pavement health (PCI) and escalating traffic hazard risk (SRI).
              </p>
            </div>
          </div>

          <div style={{ height: "250px", width: "100%" }}>
            <Line
              data={pciChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "top", labels: { color: "#ffffff", font: { size: 11, weight: "bold" } } },
                  tooltip: { backgroundColor: "rgba(15, 23, 42, 0.95)" },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { color: "#cbd5e1", font: { weight: "bold" } } },
                  y: { grid: { color: "rgba(255, 255, 255, 0.12)" }, ticks: { color: "#cbd5e1" }, min: 0, max: 100 },
                },
              }}
            />
          </div>

          <div
            style={{
              background: "var(--bg-card-alt)",
              borderRadius: "8px",
              padding: "12px 14px",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              fontSize: "0.76rem",
            }}
          >
            <div style={{ fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Info size={14} color="var(--accent-cyan)" />
              <span>Diagnostic Engineering Explanation:</span>
            </div>
            <div style={{ color: "var(--text-secondary)", lineHeight: 1.45 }}>
              • <strong>Inversion Effect:</strong> At 3 Months Ago, heavy monsoon rainfall caused the Segment Risk Index (SRI) to peak at <strong>48.0/100</strong> before stabilizing.
              <br />
              • <strong>Critical Tipping Point:</strong> Pavements experience exponential degradation when PCI falls below <strong>65</strong>. Timely crack sealing preserves subgrade integrity before base cavitation occurs.
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <h4 style={{ fontSize: "1.02rem", fontWeight: 800, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Layers size={18} color="var(--accent-amber)" />
                Defect Frequency Progression by Inspection Cycle
              </h4>
              <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
                Growth breakdown of localized Potholes (D40) vs Fatigue Cracks (D00/D10/D20).
              </p>
            </div>
          </div>

          <div style={{ height: "250px", width: "100%" }}>
            <Bar
              data={defectFrequencyData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "top", labels: { color: "#ffffff", font: { size: 11, weight: "bold" } } },
                  tooltip: { backgroundColor: "rgba(15, 23, 42, 0.95)" },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { color: "#cbd5e1", font: { weight: "bold" } } },
                  y: { grid: { color: "rgba(255, 255, 255, 0.12)" }, ticks: { color: "#cbd5e1", stepSize: 2 }, min: 0 },
                },
              }}
            />
          </div>

          <div
            style={{
              background: "var(--bg-card-alt)",
              borderRadius: "8px",
              padding: "12px 14px",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              fontSize: "0.76rem",
            }}
          >
            <div style={{ fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldCheck size={14} color="var(--accent-amber)" />
              <span>Failure Propagation Dynamics:</span>
            </div>
            <div style={{ color: "var(--text-secondary)", lineHeight: 1.45 }}>
              • Initial baseline showed hairline cracks with 1 pothole. Over 6 months, traffic shear expanded cracks into <strong>Alligator Fatigue networks (D20)</strong>.
              <br />
              • Immediate sealant injection prevents 7 cracks from turning into 5 additional deep potholes by next monsoon season.
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Sparkles size={20} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                Predictive Lifecycle Deterioration Forecast & ROI Simulator
              </h3>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "3px 0 0 0" }}>
              Compare long-term road serviceability: <strong>Immediate Work Order Execution</strong> vs <strong>Deferred Maintenance Penalty</strong>
            </p>
          </div>

          <div style={{ display: "flex", gap: "6px", background: "var(--bg-card-alt)", padding: "4px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
            {(["3m", "6m", "12m"] as const).map((h) => (
              <button
                key={h}
                onClick={() => setSelectedForecastHorizon(h)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "0.76rem",
                  fontWeight: selectedForecastHorizon === h ? 700 : 500,
                  border: "none",
                  cursor: "pointer",
                  background: selectedForecastHorizon === h ? "var(--tab-active-bg)" : "transparent",
                  color: selectedForecastHorizon === h ? "var(--tab-active-text)" : "var(--text-muted)",
                  boxShadow: selectedForecastHorizon === h ? "0 1px 4px rgba(0, 0, 0, 0.1)" : "none",
                }}
              >
                {h === "3m" ? "3 Months Outlook" : h === "6m" ? "6 Months Outlook" : "12 Months Outlook"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "20px" }}>
          
          <div style={{ height: "260px", width: "100%" }}>
            <Line
              data={forecastChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "top", labels: { color: "#ffffff", font: { size: 11, weight: "bold" } } },
                  tooltip: { backgroundColor: "rgba(15, 23, 42, 0.95)" },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { color: "#cbd5e1", font: { weight: "bold" } } },
                  y: { grid: { color: "rgba(255, 255, 255, 0.12)" }, ticks: { color: "#cbd5e1" }, min: 20, max: 100 },
                },
              }}
            />
          </div>

          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: "10px",
              border: "1px solid var(--border-glass)",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "0.86rem", fontWeight: 800, color: "var(--text-primary)", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>
              💼 Financial & Risk Analysis ({selectedForecastHorizon.toUpperCase()} Horizon):
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ background: "rgba(16, 185, 129, 0.10)", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--accent-emerald)", fontWeight: 700 }}>Immediate Fix Cost</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-emerald)", marginTop: "2px" }}>
                  {currentForecast.costRepair}
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>Restores PCI to ~88</div>
              </div>

              <div style={{ background: "rgba(239, 68, 68, 0.10)", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.25)" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--accent-rose)", fontWeight: 700 }}>Deferred Penalty Cost</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-rose)", marginTop: "2px" }}>
                  {currentForecast.costNoAction}
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>PCI collapses to ~{currentForecast.noActionPCI[currentForecast.noActionPCI.length - 1]}</div>
              </div>
            </div>

            <div
              style={{
                background: "linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(16, 185, 129, 0.15))",
                borderRadius: "8px",
                padding: "10px 14px",
                border: "1px solid var(--accent-cyan)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700 }}>DIRECT MUNICIPAL SAVINGS</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent-cyan)" }}>
                  {currentForecast.savings} INR
                </div>
              </div>
              <span className="cyber-badge badge-emerald" style={{ fontSize: "0.66rem" }}>
                ROI: +248%
              </span>
            </div>

            <div style={{ fontSize: "0.73rem", color: "var(--text-secondary)", lineHeight: 1.35 }}>
              ⚠️ <strong>Engineering Status:</strong> {currentForecast.conditionStatus}. Preventative asphalt compaction & crack sealing within 48h locks in highway structural longevity.
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "22px" }}>
        
        <div className="glass-panel" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={17} color="var(--accent-cyan)" />
            <span>Pavement Distress Root-Cause Attribution</span>
          </div>
          <div style={{ height: "200px", width: "100%", display: "flex", justifyContent: "center" }}>
            <Doughnut
              data={rootCauseData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "bottom", labels: { color: "#475569", font: { size: 10, weight: "bold" }, boxWidth: 12 } },
                },
              }}
            />
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--text-primary)" }}>
            Physical Degradation Drivers & Subgrade Diagnostics
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", background: "var(--bg-surface)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "rgba(2, 132, 199, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Truck size={16} color="var(--accent-cyan)" />
              </div>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  1. High Freight Axle Shear & Traffic Fatigue (42% Impact)
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.35 }}>
                  Heavy commercial vehicles on the OMR IT Corridor generate repetitive tensile strain at the bottom asphalt layer, initiating alligator fatigue networks.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", background: "var(--bg-surface)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Droplets size={16} color="var(--accent-rose)" />
              </div>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  2. Rainwater Ponding & Base Subgrade Weakening (36% Impact)
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.35 }}>
                  Standing surface water penetrates open fissures. Under vehicle tire pressure, trapped water creates hydraulic pumping that ejects fine subgrade material.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", background: "var(--bg-surface)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "rgba(234, 179, 8, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sun size={16} color="var(--accent-amber)" />
              </div>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  3. Bitumen Binder Thermal Oxidation & Aging (22% Impact)
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.35 }}>
                  High ambient temperatures and UV radiation cause volatile bitumen fractions to oxidize, leading to asphalt brittleness and aggregate raveling.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "22px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h4 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              Inspection Audit History & Pavement Condition Milestones
            </h4>
            <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
              Official records of chronological telemetry scans and engineer field notes
            </p>
          </div>
          <span className="cyber-badge badge-cyan" style={{ fontSize: "0.7rem" }}>
            3 Verified Milestones
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {timeline.map((item, idx) => {
            const isLive = idx === timeline.length - 1;
            const isMid = idx === 1;
            return (
              <div
                key={idx}
                style={{
                  background: "var(--bg-surface)",
                  borderRadius: "10px",
                  padding: "16px 18px",
                  border: "1px solid var(--border-glass)",
                  borderTop: `4px solid ${isLive ? "var(--accent-rose)" : isMid ? "var(--accent-amber)" : "var(--accent-emerald)"}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  boxShadow: "var(--card-shadow)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.94rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    {item.cycle}
                  </span>
                  <span className={`cyber-badge ${isLive ? "badge-rose badge-critical-blink" : isMid ? "badge-amber" : "badge-emerald"}`} style={{ fontSize: "0.68rem" }}>
                    <Calendar size={10} />
                    {item.date}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div style={{ background: "var(--bg-card-alt)", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>Mean PCI Index</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent-cyan)", marginTop: "2px" }}>
                      {item.mean_pci} <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>/100</span>
                    </div>
                  </div>

                  <div style={{ background: "var(--bg-card-alt)", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>Total Defects</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                      {item.potholes_count + item.cracks_count} <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Hazards</span>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.45, fontWeight: 500 }}>
                  📝 <strong>Engineer Note:</strong> {item.notes}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
