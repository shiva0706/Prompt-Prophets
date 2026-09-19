import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Sparkles,
  Paperclip,
  MoreVertical,
  Navigation,
  Plus,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { api } from "../services/api";

interface Message {
  id: string;
  sender: "user" | "copilot";
  text: string;
  timestamp: string;
  data?: {
    intent?: string;
    segments_matched?: any[];
    bill_of_materials?: any;
    work_order?: any;
    tools_called?: Array<{ tool_name: string; input_args: any; output_summary: string }>;
    suggestions?: string[];
  };
}

interface CorridorItem {
  id: string;
  roadName: string;
  state: string;
  chainage: string;
  length: string;
  severity: "Critical" | "Moderate" | "Healthy";
  pci: number;
}

const INITIAL_CORRIDORS: CorridorItem[] = [
  {
    id: "nh44",
    roadName: "NH-44",
    state: "Tamil Nadu",
    chainage: "Km 537 - 542",
    length: "5.2 km",
    severity: "Critical",
    pci: 42,
  },
  {
    id: "nh48",
    roadName: "NH-48",
    state: "Maharashtra",
    chainage: "Km 312 - 426",
    length: "11.4 km",
    severity: "Moderate",
    pci: 61,
  },
  {
    id: "nh16",
    roadName: "NH-16",
    state: "Andhra Pradesh",
    chainage: "Km 27 - 98",
    length: "7.1 km",
    severity: "Healthy",
    pci: 85,
  },
  {
    id: "nh27",
    roadName: "NH-27",
    state: "Rajasthan",
    chainage: "Km 145 - 178",
    length: "3.3 km",
    severity: "Moderate",
    pci: 64,
  },
  {
    id: "nh75",
    roadName: "NH-75",
    state: "Karnataka",
    chainage: "Km 83 - 120",
    length: "4.7 km",
    severity: "Healthy",
    pci: 88,
  },
];

const RECENT_DEFECTS_DATA = [
  {
    id: "D-001",
    location: "Km 537 - 542",
    defectType: "Pavement Rutting",
    severity: "Critical",
    conditionScore: "42 / 100",
    status: "Open",
    statusColor: "#ef4444",
    statusBg: "#fef2f2",
  },
  {
    id: "D-002",
    location: "Km 541 - 544",
    defectType: "Alligator Cracking",
    severity: "Moderate",
    conditionScore: "61 / 100",
    status: "Assigned",
    statusColor: "#2563eb",
    statusBg: "#dbeafe",
  },
  {
    id: "D-003",
    location: "Km 548 - 552",
    defectType: "Raveling",
    severity: "Moderate",
    conditionScore: "68 / 100",
    status: "Planned",
    statusColor: "#9333ea",
    statusBg: "#f3e8ff",
  },
  {
    id: "D-004",
    location: "Km 553 - 556",
    defectType: "Pavement Rutting",
    severity: "Healthy",
    conditionScore: "82 / 100",
    status: "Closed",
    statusColor: "#16a34a",
    statusBg: "#dcfce7",
  },
];

export const CivilEngineeringCopilot: React.FC = () => {
  const [selectedCorridor, setSelectedCorridor] = useState<string>("NH-44");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("All");
  const [defectTypeFilter, setDefectTypeFilter] = useState<string>("All");
  const [activeCenterTab, setActiveCenterTab] = useState<"defect" | "activity" | "insights">("defect");
  const [mapLayer, setMapLayer] = useState<"satellite" | "map" | "layer">("satellite");

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputValue;
    if (!textToSend.trim() || isTyping) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await api.queryCopilot(textToSend, {
        selected_corridor: selectedCorridor,
      });

      const copilotMsg: Message = {
        id: `cop-${Date.now()}`,
        sender: "copilot",
        text: response.response_text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        data: {
          intent: response.intent,
          segments_matched: response.segments_matched,
          bill_of_materials: response.bill_of_materials,
          work_order: response.work_order,
          tools_called: response.tools_called,
          suggestions: response.suggestions,
        },
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch {
      const fallbackMsg: Message = {
        id: `cop-fb-${Date.now()}`,
        sender: "copilot",
        text: `Analysis for ${selectedCorridor}: 2 critical depressions identified between Km 537 - 542 with IRI 4.8 m/km. Recommended immediate hot-mix asphalt patching (VG-30, MoRTH Sec 500). Estimated repair budget: ₹1,42,000 INR.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        data: {
          work_order: {
            work_order_id: "WO-NH44-1024",
            title: `Emergency Pavement Rehabilitation (${selectedCorridor})`,
            jurisdiction_authority: "NHAI Project Implementation Unit - Salem/Erode",
            bill_of_materials: {
              total_cost_inr: 142000,
            },
          },
        },
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setInputValue("");
  };

  const filteredCorridors = INITIAL_CORRIDORS.filter((c) => {
    const matchesSearch =
      c.roadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.state.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === "All" || c.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="app">
      {/* ======================================================== */}
      {/* LEFT COLUMN: ACTIVE CORRIDORS & FILTERS                  */}
      {/* ======================================================== */}
      <aside className="left">
        {/* Active Corridors Panel */}
        <section className="card corridors">
          <div className="panel-head">
            <span style={{ display: "flex", alignItems: "center" }}>
              <i className="head-icon">A</i>Active Corridors
            </span>
            <button
              className="primary"
              onClick={() => handleSendMessage("Register new highway corridor for AI inspection")}
              title="Add a new corridor to monitoring roster"
            >
              <Plus size={13} style={{ display: "inline", marginRight: "3px" }} />
              Add Corridor
            </button>
          </div>

          <div style={{ position: "relative" }}>
            <input
              className="search"
              placeholder="⌕  Search corridor, NH number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "28px",
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {filteredCorridors.map((road) => {
              const isSelected = selectedCorridor === road.roadName;
              const badgeClass =
                road.severity === "Critical"
                  ? "critical"
                  : road.severity === "Moderate"
                  ? "moderate"
                  : "healthy";

              return (
                <article
                  key={road.id}
                  className={`road ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedCorridor(road.roadName)}
                >
                  <b>{road.roadName}</b>
                  <span className={`badge ${badgeClass}`}>• {road.severity}</span>
                  <p>{road.state}</p>
                  <small>
                    {road.chainage} • {road.length}
                  </small>
                  <span className="chev">›</span>
                </article>
              );
            })}
          </div>
        </section>

        {/* Filters Panel */}
        <section className="card filters">
          <div className="panel-head">
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Filter size={16} color="#2463eb" />
              <span>Filters</span>
            </span>
            <span
              className="link"
              onClick={() => {
                setSeverityFilter("All");
                setDefectTypeFilter("All");
              }}
            >
              Clear all
            </span>
          </div>

          <label>Severity</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical Only</option>
            <option value="Moderate">Moderate Only</option>
            <option value="Healthy">Healthy Only</option>
          </select>

          <label>Defect Type</label>
          <select
            value={defectTypeFilter}
            onChange={(e) => setDefectTypeFilter(e.target.value)}
          >
            <option value="All">All Defect Types</option>
            <option value="Pavement Rutting">Pavement Rutting</option>
            <option value="Alligator Cracking">Alligator Cracking</option>
            <option value="Raveling">Raveling</option>
            <option value="Pothole">Pothole</option>
          </select>
        </section>
      </aside>

      {/* ======================================================== */}
      {/* CENTER COLUMN: REFINED CHAT, METRICS, TABS, CHARTS        */}
      {/* ======================================================== */}
      <main>
        {/* Refined AI Engineering Copilot Card */}
        <section className="card chat" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Header Bar inside Chat Card */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--line)",
              paddingBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #2463eb 0%, #1d4ed8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "15px",
                }}
              >
                ♙
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>AI Engineering Copilot</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "rgba(36, 99, 235, 0.08)",
                      color: "#2463eb",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    <Sparkles size={11} />
                    Autonomous Work-Order Agent
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                  Active Corridor: <strong>{selectedCorridor}</strong> • MoRTH &amp; IRC Standards Compliant
                </div>
              </div>
            </div>

            <button
              onClick={handleResetChat}
              className="primary"
              style={{
                background: "#f1f5f9",
                color: "#334155",
                border: "1px solid #cbd5e1",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 700,
                borderRadius: "6px",
              }}
              title="Reset conversation"
            >
              ⟳ Reset Chat
            </button>
          </div>

          {/* Bot Greeting Content */}
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <div className="bot">♙</div>
            <div style={{ flex: 1 }}>
              <h2>Hello! I'm your AI Civil Engineering Copilot &amp; Autonomous Work-Order Agent.</h2>
              <p>
                I can help you with road and pavement defect analysis, work-order generation, authority dispatch, and
                maintenance planning using satellite imagery, GIS data and real-time measurements.
              </p>
              <div className="try">Try asking:</div>
              <div className="prompts">
                {[
                  "Show NH-44 critical sections",
                  "Summarize defects in this corridor",
                  "Create work order for Km 537-542",
                  "Analyze pavement condition",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="prompt"
                    onClick={() => handleSendMessage(chip)}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            <span className="time">11:42 AM</span>
          </div>

          {/* Dynamic Chat Messages Stream */}
          {messages.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxHeight: "340px",
                overflowY: "auto",
                padding: "10px 4px 4px",
                borderTop: "1px solid #f1f5f9",
              }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "12px 16px",
                      borderRadius: msg.sender === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                      background: msg.sender === "user" ? "var(--blue)" : "#f8fafc",
                      color: msg.sender === "user" ? "#ffffff" : "var(--ink)",
                      border: msg.sender === "user" ? "none" : "1px solid var(--line)",
                      boxShadow: "0 1px 3px rgba(17, 62, 122, 0.04)",
                      fontSize: "13.5px",
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>

                    {msg.data?.work_order && (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                        }}
                      >
                        <div style={{ fontWeight: 800, color: "#dc2626", fontSize: "13px", marginBottom: "4px" }}>
                          📄 {msg.data.work_order.title}
                        </div>
                        <div style={{ fontSize: "12px", color: "#475569" }}>
                          Ticket: <strong>{msg.data.work_order.work_order_id}</strong> • Est. Budget: ₹
                          {msg.data.work_order.bill_of_materials.total_cost_inr.toLocaleString("en-IN")} INR
                        </div>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: "11px", color: "#96a8c5", padding: "0 4px" }}>{msg.timestamp}</span>
                </div>
              ))}
              {isTyping && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--blue)", fontSize: "13px", padding: "4px" }}>
                  <span className="animate-spin">⟳</span>
                  <span>AI Engineering Copilot is analyzing road telemetry...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Interactive Chat Input Pill */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "30px",
              border: "1.5px solid var(--line)",
              boxShadow: "0 2px 8px rgba(17, 62, 122, 0.05)",
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "4px",
            }}
          >
            <Sparkles size={17} color="#2463eb" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask anything about road conditions, defects, work orders or maintenance analysis..."
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: "13.5px",
                color: "var(--ink)",
                background: "transparent",
              }}
            />
            <button
              title="Attach defect telemetry or photo"
              style={{ background: "transparent", border: "none", color: "#91a5c5", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <Paperclip size={17} />
            </button>
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "var(--blue)",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: inputValue.trim() ? "pointer" : "default",
                opacity: inputValue.trim() ? 1 : 0.6,
                transition: "all 0.15s ease",
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </section>

        {/* 4 Metric KPI Cards */}
        <section className="metrics">
          {/* Card 1: Pavement Condition */}
          <article className="card metric">
            <h3>
              <span>➤ &nbsp; Pavement Condition</span>
              <span style={{ color: "#8ba0c1", fontWeight: 400 }}>›</span>
            </h3>
            {/* Smooth SVG Radial Gauge */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "12px" }}>
              <div style={{ position: "relative", width: "100px", height: "55px" }}>
                <svg width="100" height="55" viewBox="0 0 100 55">
                  <path d="M 12 50 A 38 38 0 0 1 88 50" fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 12 50 A 38 38 0 0 1 74 18" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    bottom: "2px",
                    left: 0,
                    right: 0,
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: "22px",
                    color: "var(--ink)",
                  }}
                >
                  72
                </div>
              </div>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>100</span>
              <div className="rating" style={{ marginTop: "4px" }}>Good</div>
            </div>
          </article>

          {/* Card 2: Safety Score */}
          <article className="card metric">
            <h3>
              <span>⬡ &nbsp; Safety Score</span>
              <span style={{ color: "#8ba0c1", fontWeight: 400 }}>›</span>
            </h3>
            {/* Smooth SVG Radial Gauge */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "12px" }}>
              <div style={{ position: "relative", width: "100px", height: "55px" }}>
                <svg width="100" height="55" viewBox="0 0 100 55">
                  <path d="M 12 50 A 38 38 0 0 1 88 50" fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 12 50 A 38 38 0 0 1 68 22" fill="none" stroke="#f59c0b" strokeWidth="8" strokeLinecap="round" />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    bottom: "2px",
                    left: 0,
                    right: 0,
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: "22px",
                    color: "var(--ink)",
                  }}
                >
                  68
                </div>
              </div>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>100</span>
              <div className="rating orange" style={{ marginTop: "4px" }}>Moderate</div>
            </div>
          </article>

          {/* Card 3: Total Defects */}
          <article className="card metric">
            <h3>⚠ &nbsp; Total Defects ({selectedCorridor})</h3>
            <div className="value">
              23 <small className="badge critical">↑ 12%</small>
            </div>
            <div className="sub">vs. last 7 days</div>
          </article>

          {/* Card 4: Work Orders */}
          <article className="card metric">
            <h3>
              <span>▧ &nbsp; Work Orders</span>
              <span style={{ color: "#8ba0c1", fontWeight: 400 }}>›</span>
            </h3>
            <div className="value">5</div>
            <div
              className="open"
              onClick={() => handleSendMessage(`Show open work orders for ${selectedCorridor}`)}
            >
              Open &gt;
            </div>
          </article>
        </section>

        {/* Tabs Bar: Defect Analysis / Recent Activity / AI Insights */}
        <div className="tabs">
          <button
            className={activeCenterTab === "defect" ? "chosen" : ""}
            onClick={() => setActiveCenterTab("defect")}
          >
            Defect Analysis
          </button>
          <button
            className={activeCenterTab === "activity" ? "chosen" : ""}
            onClick={() => setActiveCenterTab("activity")}
          >
            Recent Activity
          </button>
          <button
            className={activeCenterTab === "insights" ? "chosen" : ""}
            onClick={() => setActiveCenterTab("insights")}
          >
            AI Insights
          </button>
        </div>

        {/* Tab 1 View: Defect Analysis Charts & Table */}
        {activeCenterTab === "defect" && (
          <>
            <section className="charts">
              {/* Defect Distribution Donut Chart with SVG and Flex Legend */}
              <article className="card chart" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <h3 style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Defect Distribution ({selectedCorridor})</span>
                  <span style={{ color: "#8ba0c1", fontSize: "13px" }}>ⓘ</span>
                </h3>
                
                <div style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: "12px" }}>
                  {/* SVG Donut */}
                  <div style={{ position: "relative", width: "115px", height: "115px", flexShrink: 0 }}>
                    <svg width="115" height="115" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="5" />
                      {/* Pavement Rutting 39% */}
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="5"
                        strokeDasharray="34.3 88"
                        strokeDashoffset="22"
                      />
                      {/* Alligator Cracking 30% */}
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#ff7b12"
                        strokeWidth="5"
                        strokeDasharray="26.4 88"
                        strokeDashoffset="-12.3"
                      />
                      {/* Raveling 17% */}
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#14b982"
                        strokeWidth="5"
                        strokeDasharray="15 88"
                        strokeDashoffset="-38.7"
                      />
                      {/* Other 14% */}
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="5"
                        strokeDasharray="12.3 88"
                        strokeDashoffset="-53.7"
                      />
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>23</span>
                      <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 700 }}>Total Defects</span>
                    </div>
                  </div>

                  {/* Clean Legend */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", fontSize: "13px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
                        <span>Pavement Rutting</span>
                      </div>
                      <b>9 (39%)</b>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ff7b12" }} />
                        <span>Alligator Cracking</span>
                      </div>
                      <b>7 (30%)</b>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#14b982" }} />
                        <span>Raveling</span>
                      </div>
                      <b>4 (17%)</b>
                    </div>
                  </div>
                </div>
              </article>

              {/* Severity Breakdown Progress Bars */}
              <article className="card chart">
                <h3 style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Severity Breakdown</span>
                  <span style={{ color: "#8ba0c1", fontSize: "13px" }}>ⓘ</span>
                </h3>
                <div className="barrow">
                  <span style={{ color: "#ef4444" }}>●</span> Critical{" "}
                  <span>
                    5　<em style={{ fontStyle: "normal", color: "#8ba0c1" }}>21%</em>
                  </span>
                  <div className="bar">
                    <i style={{ width: "21%", background: "#ef4444" }}></i>
                  </div>
                </div>

                <div className="barrow">
                  <span style={{ color: "#f59c0b" }}>●</span> Moderate{" "}
                  <span>
                    11　<em style={{ fontStyle: "normal", color: "#8ba0c1" }}>48%</em>
                  </span>
                  <div className="bar">
                    <i style={{ width: "48%", background: "#f59c0b" }}></i>
                  </div>
                </div>

                <div className="barrow">
                  <span style={{ color: "#14b982" }}>●</span> Healthy{" "}
                  <span>
                    7　<em style={{ fontStyle: "normal", color: "#8ba0c1" }}>31%</em>
                  </span>
                  <div className="bar">
                    <i style={{ width: "31%", background: "#14b982" }}></i>
                  </div>
                </div>
              </article>
            </section>

            {/* Recent Defects Data Table */}
            <section className="card" style={{ padding: "20px", marginTop: "16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                }}
              >
                <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)" }}>
                  Recent Defects - {selectedCorridor}
                </span>
                <span
                  onClick={() => handleSendMessage(`Show all defects registered on ${selectedCorridor}`)}
                  style={{ fontSize: "13px", color: "var(--blue)", fontWeight: 700, cursor: "pointer" }}
                >
                  View All Defects &gt;
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left", color: "var(--muted)" }}>
                      <th style={{ padding: "10px 12px", fontWeight: 700 }}>ID</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700 }}>Location (Km)</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700 }}>Defect Type</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700 }}>Severity</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700 }}>Condition Score</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700 }}>Status</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RECENT_DEFECTS_DATA.map((row) => (
                      <tr
                        key={row.id}
                        style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.1s ease" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "12px", color: "var(--muted)", fontWeight: 600 }}>{row.id}</td>
                        <td style={{ padding: "12px", color: "var(--ink)", fontWeight: 700 }}>{row.location}</td>
                        <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{row.defectType}</td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                              fontWeight: 700,
                              color:
                                row.severity === "Critical"
                                  ? "#dc2626"
                                  : row.severity === "Moderate"
                                  ? "#d97706"
                                  : "#16a34a",
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background:
                                  row.severity === "Critical"
                                    ? "#dc2626"
                                    : row.severity === "Moderate"
                                    ? "#d97706"
                                    : "#16a34a",
                              }}
                            />
                            {row.severity}
                          </span>
                        </td>
                        <td style={{ padding: "12px", color: "var(--ink)", fontWeight: 700 }}>{row.conditionScore}</td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              background: row.statusBg,
                              color: row.statusColor,
                              padding: "3px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span
                              onClick={() => handleSendMessage(`Inspect defect ${row.id} on ${selectedCorridor}`)}
                              style={{ color: "var(--blue)", fontWeight: 700, cursor: "pointer" }}
                            >
                              View
                            </span>
                            <MoreVertical size={14} color="#94a3b8" style={{ cursor: "pointer" }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* Tab 2 View: Recent Activity */}
        {activeCenterTab === "activity" && (
          <section className="card" style={{ padding: "22px", marginTop: "16px" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 800 }}>Recent Highway Activity</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { text: `Analysis completed for ${selectedCorridor}`, time: "11:58 AM", color: "#10b981" },
                { text: "Work order #WO-1024 created (Km 537-542)", time: "11:42 AM", color: "#ef4444" },
                { text: "Authority dispatch team notified (MoRTH Salem Zone)", time: "11:28 AM", color: "#2563eb" },
                { text: "Data sync with MoRTH GIS server completed", time: "10:16 AM", color: "#2563eb" },
                { text: "New defect detected (Pavement Rutting 3.8cm)", time: "09:34 AM", color: "#ef4444" },
              ].map((act, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: index < 4 ? "1px solid #f1f5f9" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: act.color }} />
                    <span style={{ color: "var(--ink)", fontWeight: 600 }}>{act.text}</span>
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: "12px" }}>{act.time}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab 3 View: AI Insights */}
        {activeCenterTab === "insights" && (
          <section className="card" style={{ padding: "22px", marginTop: "16px" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 800 }}>Autonomous Engineering Insights</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ background: "#f8fafc", border: "1px solid var(--line)", borderRadius: "10px", padding: "14px 18px" }}>
                <b style={{ color: "var(--blue)", fontSize: "15px" }}>IRI Deterioration Alert</b>
                <p style={{ margin: "6px 0 0", color: "#56729b", fontSize: "13px" }}>
                  International Roughness Index on {selectedCorridor} Km 537 - 542 has increased by 14% over the last 30 days due to monsoon rainfall. Micro-surfacing recommended before winter.
                </p>
              </div>
              <div style={{ background: "#f8fafc", border: "1px solid var(--line)", borderRadius: "10px", padding: "14px 18px" }}>
                <b style={{ color: "#14b982", fontSize: "15px" }}>Optimal Maintenance Window</b>
                <p style={{ margin: "6px 0 0", color: "#56729b", fontSize: "13px" }}>
                  Weather radar forecasts dry conditions for the next 12 days. Ideal operational window for cold milling and binder course relaying.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: REFINED GIS MAP & QUICK INSIGHTS           */}
      {/* ======================================================== */}
      <aside className="right">
        {/* GIS Map Card */}
        <section className="card mapcard">
          <div className="map-title">
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Navigation size={16} color="#2463eb" />
              <span>GIS Map - {selectedCorridor}</span>
            </span>
            <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "6px", padding: "2px" }}>
              {(["satellite", "map", "layer"] as const).map((layer) => (
                <button
                  key={layer}
                  onClick={() => setMapLayer(layer)}
                  style={{
                    padding: "3px 8px",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: mapLayer === layer ? 700 : 500,
                    background: mapLayer === layer ? "#091426" : "transparent",
                    color: mapLayer === layer ? "#ffffff" : "#61799c",
                    textTransform: "capitalize",
                    transition: "all 0.15s ease",
                  }}
                >
                  {layer}
                </button>
              ))}
            </div>
          </div>

          <div className="map">
            <b className="maptag">➤ {selectedCorridor}</b>
            <i className="route"></i>
            <span className="mark red">
              Km 537 - 542<small>Critical</small>
            </span>
            <span className="mark orange">
              Km 541 - 426<small>Moderate</small>
            </span>
            <span className="mark green">
              Km 548 - 552<small>Healthy</small>
            </span>
            <span className="place p1">Perundurai</span>
            <span className="place p2">Erode</span>
            <div className="zoom">
              <button onClick={() => handleSendMessage(`Zoom into critical segment on ${selectedCorridor}`)}>+</button>
              <button>−</button>
            </div>
          </div>
        </section>

        {/* Quick Insights Card */}
        <section className="card insights">
          <div className="panel-head">
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={16} color="#2463eb" />
              <span>Quick Insights</span>
            </span>
            <span className="link" onClick={() => setActiveCenterTab("insights")}>
              View All
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "14px" }}>
            <div className="notice" style={{ margin: 0 }}>
              <b>3</b>
              <p>Critical Segments</p>
            </div>
            <div className="notice" style={{ margin: 0 }}>
              <b>23</b>
              <p>Total Defects</p>
            </div>
            <div className="notice" style={{ margin: 0 }}>
              <b>68%</b>
              <p>Overall Health</p>
            </div>
            <div className="notice" style={{ margin: 0 }}>
              <b>12 d</b>
              <p>Maint. Window</p>
            </div>
          </div>
        </section>

        {/* Live Corridor Status Summary Card */}
        <section className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={16} color="#14b982" />
            <span>Telemetry Status</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
              <span>Survey Speed:</span>
              <strong style={{ color: "var(--ink)" }}>42 km/h (Optimal)</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
              <span>Pavement Temp:</span>
              <strong style={{ color: "var(--ink)" }}>34.2 °C (Dry)</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
              <span>LiDAR Profiler:</span>
              <strong style={{ color: "#14b982" }}>Calibrated (ASTM E950)</strong>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
};
