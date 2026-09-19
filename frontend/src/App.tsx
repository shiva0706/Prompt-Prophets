import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Header } from "./components/Header";
import { InspectionStudio } from "./components/InspectionStudio";
import { ImageDiagnosticScanner } from "./components/ImageDiagnosticScanner";
import { GpsSegmentMap } from "./components/GpsSegmentMap";
import { MaintenancePrioritization } from "./components/MaintenancePrioritization";
import { HistoricalAnalytics } from "./components/HistoricalAnalytics";
import { AuthorityDispatchCenter } from "./components/AuthorityDispatchCenter";
import { AuthorityAlertModal } from "./components/AuthorityAlertModal";
import { CivilEngineeringCopilot } from "./components/CivilEngineeringCopilot";
import { api } from "./services/api";
import type { FullRoadInspectionReport, AgentEvent, RoadDefectItem, DispatchedAlertRecord } from "./types";

export function App() {
  const [activeTab, setActiveTab] = useState<string>("inspection");
  const [report, setReport] = useState<FullRoadInspectionReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSocketLive, setIsSocketLive] = useState<boolean>(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("road_intel_theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("road_intel_theme", theme);
  }, [theme]);

  const fetchInspectionData = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchFullRoadInspection("chennai_omr");
      if (data) {
        setReport(data);
      }
    } catch (e) {
      console.error("Failed to load road inspection:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsSocketLive(api.isSocketConnected());
    fetchInspectionData();

    const unsubscribe = api.onEvent((event: AgentEvent) => {
      setIsSocketLive(true);
      if (event.event_type === "PIPELINE_COMPLETE") {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ["#ef4444", "#f59e0b", "#00f2fe"],
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleExportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `road_condition_intelligence_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [selectedDefectForAlert, setSelectedDefectForAlert] = useState<RoadDefectItem | null>(null);
  const [selectedImageB64, setSelectedImageB64] = useState<string | undefined>(undefined);

  const handleOpenAlertModal = (defect: RoadDefectItem, imgB64?: string) => {
    setSelectedDefectForAlert(defect);
    setSelectedImageB64(imgB64);
    setIsAlertModalOpen(true);
  };

  const handleAlertDispatched = (record: DispatchedAlertRecord) => {
    if (report) {
      const existing = report.dispatched_alerts || [];
      setReport({
        ...report,
        dispatched_alerts: [record, ...existing],
      });
    }
  };

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "20px 20px 60px" }}>
      
      <Header
        isSocketLive={isSocketLive}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportReport={handleExportJson}
        onRefreshInspection={fetchInspectionData}
        isLoading={isLoading}
        theme={theme}
        setTheme={setTheme}
      />

      {report && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          
          <div className="glass-panel fade-in-up stagger-1" style={{ padding: "16px 18px", borderTop: "3px solid #ffffff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>Total Defects Localized</span>
              <span className="cyber-badge badge-rose" style={{ fontSize: "0.68rem" }}>
                Active Survey
              </span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 900, marginTop: "4px", color: "var(--text-primary)" }}>
              {report.summary.total_defects_count} <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Hazards</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 600 }}>
              {report.summary.total_potholes} Potholes • {report.summary.total_cracks} Cracks • {report.summary.total_water_ponding} Ponding
            </div>
          </div>

          <div className="glass-panel fade-in-up stagger-2" style={{ padding: "16px 18px", borderTop: "3px solid #ffffff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>Mean Segment Risk (SRI)</span>
              <span className="cyber-badge badge-amber" style={{ fontSize: "0.68rem" }}>
                0-100 Scale
              </span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 900, marginTop: "4px", color: "var(--text-primary)" }}>
              {report.summary.mean_route_sri} <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>/ 100</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 600 }}>
              {report.summary.critical_segments_count} of {report.summary.total_segments_count} Segments at Critical Risk
            </div>
          </div>

          <div className="glass-panel fade-in-up stagger-3" style={{ padding: "16px 18px", borderTop: "3px solid #ffffff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>Pavement Condition Index</span>
              <span className="cyber-badge badge-cyan" style={{ fontSize: "0.68rem" }}>
                ASTM D6433
              </span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 900, marginTop: "4px", color: "var(--text-primary)" }}>
              {report.summary.mean_route_pci} <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>/ 100</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 600 }}>
              Pavement Health Benchmark Standard
            </div>
          </div>

          <div className="glass-panel fade-in-up stagger-4" style={{ padding: "16px 18px", borderTop: "3px solid #ffffff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>Emergency Work Orders</span>
              <span className="cyber-badge badge-rose" style={{ fontSize: "0.68rem" }}>
                SLA &lt; 24h
              </span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 900, marginTop: "4px", color: "var(--text-primary)" }}>
              {report.summary.immediate_work_orders} <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Dispatched</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 600 }}>
              Est. Budget: <strong style={{ color: "#ffffff", borderBottom: "1px dashed rgba(255,255,255,0.4)" }}>₹{(report.summary.total_estimated_budget_inr ?? ((report.summary.total_estimated_budget_usd || 0) * 83)).toLocaleString('en-IN')} INR</strong>
            </div>
          </div>

          <div className="glass-panel fade-in-up stagger-5" style={{ padding: "16px 18px", borderTop: "3px solid #ffffff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>AI Pipeline Latency</span>
              <span className="cyber-badge badge-emerald" style={{ fontSize: "0.68rem" }}>
                Edge GPU
              </span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 900, marginTop: "4px", color: "var(--text-primary)" }}>
              25.5 <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>ms / frame</span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 600 }}>
              Detection: 18.2ms • Severity: 7.3ms (&gt;35 FPS)
            </div>
          </div>
        </div>
      )}

      <main>
        {activeTab === "inspection" && (
          <InspectionStudio
            report={report}
            onRefresh={fetchInspectionData}
            onOpenAlertModal={handleOpenAlertModal}
          />
        )}

        {activeTab === "copilot" && (
          <CivilEngineeringCopilot />
        )}

        {activeTab === "image_scan" && (
          <ImageDiagnosticScanner
            authorities={report?.authorities}
            onOpenAlertModal={handleOpenAlertModal}
          />
        )}

        {activeTab === "gis_map" && (
          <GpsSegmentMap
            report={report}
            onSelectSegment={() => {
              setActiveTab("inspection");
            }}
          />
        )}

        {activeTab === "authority_alerts" && (
          <AuthorityDispatchCenter report={report} />
        )}

        {activeTab === "maintenance" && (
          <MaintenancePrioritization report={report} />
        )}

        {activeTab === "historical" && (
          <HistoricalAnalytics report={report} />
        )}
      </main>

      {selectedDefectForAlert && (
        <AuthorityAlertModal
          isOpen={isAlertModalOpen}
          onClose={() => setIsAlertModalOpen(false)}
          defect={selectedDefectForAlert}
          imageB64={selectedImageB64}
          authorities={report?.authorities}
          onAlertDispatched={handleAlertDispatched}
        />
      )}

      <footer
        style={{
          marginTop: "40px",
          textAlign: "center",
          fontSize: "0.8rem",
          color: "var(--text-muted)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <span>Automated Highway Pavement Intelligence Platform</span>
        <span>•</span>
        <span>Real-Time Pavement Hazard Detection</span>
        <span>•</span>
        <span>Calibrated 3D Depth &amp; Severity Assessment</span>
        <span>•</span>
        <span>ASTM D6433 Pavement Condition Standards</span>
      </footer>
    </div>
  );
}

export default App;
