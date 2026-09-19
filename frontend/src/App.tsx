import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Header } from "./components/Header";
import { HomePage } from "./components/HomePage";
import { InspectionStudio } from "./components/InspectionStudio";
import { ImageDiagnosticScanner } from "./components/ImageDiagnosticScanner";
import { GpsSegmentMap } from "./components/GpsSegmentMap";
import { MaintenancePrioritization } from "./components/MaintenancePrioritization";
import { HistoricalAnalytics } from "./components/HistoricalAnalytics";
import { AuthorityDispatchCenter } from "./components/AuthorityDispatchCenter";
import { AuthorityAlertModal } from "./components/AuthorityAlertModal";
import { CarCameraDepartmentAlertBar } from "./components/CarCameraDepartmentAlertBar";
import { api } from "./services/api";
import type { FullRoadInspectionReport, AgentEvent, RoadDefectItem, DispatchedAlertRecord } from "./types";

export function App() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [report, setReport] = useState<FullRoadInspectionReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSocketLive, setIsSocketLive] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.removeItem("road_intel_theme");
  }, []);

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
      />

      <CarCameraDepartmentAlertBar
        report={report}
        onOpenAlertModal={handleOpenAlertModal}
        onAlertDispatched={handleAlertDispatched}
      />

      {report && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          {/* Gauge 1: Total Defects */}
          <div className="glass-panel fade-in-up stagger-1" style={{ padding: "14px 16px", borderTop: "3px solid #dc2626", borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              <span>Total Defects</span>
              <span className="cyber-badge badge-rose" style={{ fontSize: "0.64rem", padding: "1px 6px" }}>Survey</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
              <div>
                <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                  {report.summary.total_defects_count} <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>Hazards</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  {report.summary.total_potholes} Potholes • {report.summary.total_cracks} Cracks
                </div>
              </div>
              <svg width="56" height="46" viewBox="0 0 56 46" style={{ overflow: "visible" }}>
                <circle cx="28" cy="28" r="21" fill="none" stroke="rgba(220, 38, 38, 0.12)" strokeWidth="5.5" strokeDasharray="80.6 999" strokeLinecap="round" transform="rotate(160 28 28)" />
                <circle cx="28" cy="28" r="21" fill="none" stroke="#dc2626" strokeWidth="5.5" strokeDasharray="80.6 999" strokeDashoffset={80.6 * (1 - Math.min(1, Math.max(0, report.summary.total_defects_count / 20)))} strokeLinecap="round" transform="rotate(160 28 28)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
              </svg>
            </div>
          </div>

          {/* Gauge 2: Mean SRI Risk */}
          <div className="glass-panel fade-in-up stagger-2" style={{ padding: "14px 16px", borderTop: "3px solid #d97706", borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              <span>Risk Index (SRI)</span>
              <span className="cyber-badge badge-amber" style={{ fontSize: "0.64rem", padding: "1px 6px" }}>0-100</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
              <div>
                <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                  {report.summary.mean_route_sri} <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>/ 100</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  {report.summary.critical_segments_count} of {report.summary.total_segments_count} Segments Critical
                </div>
              </div>
              <svg width="56" height="46" viewBox="0 0 56 46" style={{ overflow: "visible" }}>
                <circle cx="28" cy="28" r="21" fill="none" stroke="rgba(217, 119, 6, 0.12)" strokeWidth="5.5" strokeDasharray="80.6 999" strokeLinecap="round" transform="rotate(160 28 28)" />
                <circle cx="28" cy="28" r="21" fill="none" stroke="#d97706" strokeWidth="5.5" strokeDasharray="80.6 999" strokeDashoffset={80.6 * (1 - Math.min(1, Math.max(0, report.summary.mean_route_sri / 100)))} strokeLinecap="round" transform="rotate(160 28 28)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
              </svg>
            </div>
          </div>

          {/* Gauge 3: PCI Condition Index */}
          <div className="glass-panel fade-in-up stagger-3" style={{ padding: "14px 16px", borderTop: "3px solid #0284c7", borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              <span>Pavement PCI</span>
              <span className="cyber-badge badge-cyan" style={{ fontSize: "0.64rem", padding: "1px 6px" }}>ASTM D6433</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
              <div>
                <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                  {report.summary.mean_route_pci} <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>/ 100</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Pavement Health Benchmark
                </div>
              </div>
              <svg width="56" height="46" viewBox="0 0 56 46" style={{ overflow: "visible" }}>
                <circle cx="28" cy="28" r="21" fill="none" stroke="rgba(2, 132, 199, 0.12)" strokeWidth="5.5" strokeDasharray="80.6 999" strokeLinecap="round" transform="rotate(160 28 28)" />
                <circle cx="28" cy="28" r="21" fill="none" stroke="#0284c7" strokeWidth="5.5" strokeDasharray="80.6 999" strokeDashoffset={80.6 * (1 - Math.min(1, Math.max(0, report.summary.mean_route_pci / 100)))} strokeLinecap="round" transform="rotate(160 28 28)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
              </svg>
            </div>
          </div>

          {/* Gauge 4: Work Orders */}
          <div className="glass-panel fade-in-up stagger-4" style={{ padding: "14px 16px", borderTop: "3px solid #7c3aed", borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              <span>Work Orders</span>
              <span className="cyber-badge badge-rose" style={{ fontSize: "0.64rem", padding: "1px 6px" }}>SLA &lt; 24h</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
              <div>
                <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                  {report.summary.immediate_work_orders} <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>Active</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  MoRTH Section 500 / IRC:82
                </div>
              </div>
              <svg width="56" height="46" viewBox="0 0 56 46" style={{ overflow: "visible" }}>
                <circle cx="28" cy="28" r="21" fill="none" stroke="rgba(124, 58, 237, 0.12)" strokeWidth="5.5" strokeDasharray="80.6 999" strokeLinecap="round" transform="rotate(160 28 28)" />
                <circle cx="28" cy="28" r="21" fill="none" stroke="#7c3aed" strokeWidth="5.5" strokeDasharray="80.6 999" strokeDashoffset={80.6 * (1 - Math.min(1, Math.max(0, report.summary.immediate_work_orders / 8)))} strokeLinecap="round" transform="rotate(160 28 28)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
              </svg>
            </div>
          </div>

          {/* Gauge 5: AI Pipeline Latency */}
          <div className="glass-panel fade-in-up stagger-5" style={{ padding: "14px 16px", borderTop: "3px solid #059669", borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              <span>Inference Speed</span>
              <span className="cyber-badge badge-emerald" style={{ fontSize: "0.64rem", padding: "1px 6px" }}>GPU &gt;35 FPS</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
              <div>
                <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                  25.5 <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>ms</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Detect: 18.2ms • Depth: 7.3ms
                </div>
              </div>
              <svg width="56" height="46" viewBox="0 0 56 46" style={{ overflow: "visible" }}>
                <circle cx="28" cy="28" r="21" fill="none" stroke="rgba(5, 150, 105, 0.12)" strokeWidth="5.5" strokeDasharray="80.6 999" strokeLinecap="round" transform="rotate(160 28 28)" />
                <circle cx="28" cy="28" r="21" fill="none" stroke="#059669" strokeWidth="5.5" strokeDasharray="80.6 999" strokeDashoffset={80.6 * (1 - Math.min(1, Math.max(0, 25.5 / 50)))} strokeLinecap="round" transform="rotate(160 28 28)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
              </svg>
            </div>
          </div>
        </div>
      )}

      <main>
        {activeTab === "home" && (
          <HomePage
            report={report}
            onNavigate={(tabId: string) => setActiveTab(tabId)}
            onOpenAlertModal={handleOpenAlertModal}
          />
        )}

        {activeTab === "inspection" && (
          <InspectionStudio
            report={report}
            onRefresh={fetchInspectionData}
            onOpenAlertModal={handleOpenAlertModal}
          />
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
            onOpenAlertModal={handleOpenAlertModal}
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
