import React from "react";
import {
  ShieldAlert,
  Download,
  Camera,
  Navigation,
  Wrench,
  History,
  RefreshCw,
  Building2,
  UploadCloud,
  LayoutDashboard,
} from "lucide-react";

interface HeaderProps {
  isSocketLive: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onExportReport: () => void;
  onRefreshInspection: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isSocketLive,
  activeTab,
  setActiveTab,
  onExportReport,
  onRefreshInspection,
  isLoading,
}) => {
  const tabs = [
    { id: "home", label: "Executive Overview", icon: LayoutDashboard },
    { id: "inspection", label: "Defect Localization", icon: Camera },
    { id: "image_scan", label: "Video Analysis", icon: UploadCloud },
    { id: "gis_map", label: "GIS Route & Telemetry", icon: Navigation },
    { id: "authority_alerts", label: "Authority Dispatch Center", icon: Building2 },
    { id: "maintenance", label: "Maintenance Work Orders", icon: Wrench },
    { id: "historical", label: "Temporal Analytics", icon: History },
  ];

  return (
    <header
      className="glass-panel"
      style={{
        padding: "16px 22px",
        marginBottom: "20px",
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
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            border: "1px solid rgba(255, 255, 255, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 10px rgba(2, 132, 199, 0.3)",
          }}
        >
          <ShieldAlert size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h1
              style={{
                fontSize: "1.28rem",
                fontWeight: 800,
                letterSpacing: "-0.4px",
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              RoadVision AI <span style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: "1.05rem" }}>Platform</span>
            </h1>
            <span className="cyber-badge badge-cyan" style={{ fontSize: "0.68rem" }}>
              Automated Highway Vision
            </span>
          </div>
          <p
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              marginTop: "2px",
              marginBottom: 0,
              fontWeight: 500,
            }}
          >
            Pavement Condition Intelligence • 4-Tier Severity • GPS Risk Segments • DOT Authority Dispatch
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          background: "var(--bg-surface)",
          padding: "4px",
          borderRadius: "10px",
          border: "1px solid var(--border-glass)",
          gap: "3px",
          flexWrap: "wrap",
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 13px",
                borderRadius: "7px",
                border: isActive ? "1px solid var(--tab-active-border)" : "1px solid transparent",
                fontSize: "0.8rem",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--tab-active-text)" : "var(--text-muted)",
                background: isActive ? "var(--tab-active-bg)" : "transparent",
                boxShadow: isActive ? "0 1px 4px rgba(0, 0, 0, 0.15)" : "none",
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
            >
              <Icon size={14} color={isActive ? "var(--accent-cyan)" : "currentColor"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <div
          className="cyber-badge badge-emerald"
          style={{
            fontSize: "0.72rem",
            padding: "5px 10px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: isSocketLive ? "var(--accent-emerald)" : "var(--accent-amber)",
              display: "inline-block",
            }}
          />
          {isSocketLive ? "INSPECTION ACTIVE" : "LOCAL READY"}
        </div>

        <button
          onClick={onRefreshInspection}
          className="btn-cyber-secondary"
          disabled={isLoading}
          title="Refresh Road Inspection Data"
          style={{ padding: "7px 12px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "5px" }}
        >
          <RefreshCw className={isLoading ? "animate-spin" : ""} size={13} />
          <span>Refresh</span>
        </button>

        <button
          onClick={onExportReport}
          className="btn-cyber-primary"
          title="Export Full Inspection Dossier (JSON)"
          style={{ padding: "7px 14px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <Download size={13} />
          <span>Export Dossier</span>
        </button>
      </div>
    </header>
  );
};
