import React from "react";

interface HeaderProps {
  isSocketLive?: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onExportReport?: () => void;
  onRefreshInspection?: () => void;
  isLoading?: boolean;
  theme?: "dark" | "light";
  setTheme?: (theme: "dark" | "light") => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSocketLive = true,
  activeTab,
  setActiveTab,
  onExportReport,
  onRefreshInspection,
  isLoading = false,
  theme,
  setTheme,
}) => {
  const navTabs = [
    {
      id: "inspection",
      icon: "▧",
      line1: "Detect",
      line2: "Location",
    },
    {
      id: "copilot",
      icon: "♙",
      line1: "AI Engineering",
      line2: "Copilot",
    },
    {
      id: "gis_map",
      icon: "⌖",
      line1: "GIS Route &",
      line2: "Telemetry",
    },
    {
      id: "authority_alerts",
      icon: "♜",
      line1: "Authority",
      line2: "Dispatch",
    },
    {
      id: "maintenance",
      icon: "⚒",
      line1: "Maintenance Work",
      line2: "Orders",
    },
    {
      id: "historical",
      icon: "▥",
      line1: "Temporal",
      line2: "Analytics",
    },
  ];

  return (
    <header className="topbar">
      {/* Brand Logo & Title */}
      <div className="brand" onClick={() => setActiveTab("copilot")}>
        <span className="logo">♢</span>
        <span>
          RoadVision<br />AI
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="nav">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`nav-link ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}&nbsp; {tab.line1}</span>
              <br />
              <span>{tab.line2}</span>
            </button>
          );
        })}
      </nav>

      {/* Toolbar */}
      <div className="toolbar">
        {onExportReport && (
          <button
            className="toolbar-btn"
            onClick={onExportReport}
            title="Export Inspection Report"
          >
            ⇩
          </button>
        )}
        {onRefreshInspection && (
          <button
            className="toolbar-btn"
            onClick={onRefreshInspection}
            title="Refresh Inspection Data"
          >
            <span className={isLoading ? "animate-spin" : ""}>⟳</span>
          </button>
        )}
        {setTheme && (
          <button
            className="toolbar-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {theme === "dark" ? "☼" : "☾"}
          </button>
        )}
      </div>

      {/* Live System Status */}
      <div className="status">
        <i className={isSocketLive ? "online" : ""}>●</i>
        <span>{isSocketLive ? "System Online" : "Connecting..."}</span>
      </div>

      {/* User Profile */}
      <div className="user">
        <span className="avatar">RS</span>
        <span>
          Ravi<br />Shankar
        </span>
      </div>
    </header>
  );
};
