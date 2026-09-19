import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  FileText,
  CheckCircle2,
  Cpu,
  Download,
  Share2,
  RefreshCw,
  Building,
  Check,
  ShieldCheck,
  Sparkles,
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

const PRESET_PROMPTS = [
  "Identify critical segments on NH-44 needing urgent resurfacing before monsoon",
  "Calculate MoRTH repair costs and material quantities for Madurai Ring Road",
  "Draft an official NHAI tender work order for critical potholes on NH-44",
  "Show high-risk drainage and water ponding hazards on SH-72 Sivagangai highway",
  "What are the IRC:82-2015 specifications for polymer-modified crack sealing?",
  "Compare VG-30 vs VG-40 bitumen for heavy freight highway overlays",
];

// Rich Markdown / Text Block Renderer
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const flushTable = (key: number) => {
    if (tableBuffer.length < 2) {
      tableBuffer = [];
      inTable = false;
      return null;
    }
    const headers = tableBuffer[0]
      .split("|")
      .map((h) => h.trim())
      .filter((h) => h !== "");
    const rows = tableBuffer
      .slice(2)
      .map((r) =>
        r
          .split("|")
          .map((c) => c.trim())
          .filter((c) => c !== "")
      )
      .filter((r) => r.length > 0);

    const tableNode = (
      <div
        key={`tbl-${key}`}
        style={{
          margin: "12px 0",
          overflowX: "auto",
          borderRadius: "8px",
          border: "1px solid var(--border-glass)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.78rem",
            textAlign: "left",
          }}
        >
          <thead>
            <tr style={{ background: "rgba(56, 189, 248, 0.12)", borderBottom: "1px solid var(--border-glass)" }}>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: "8px 12px", color: "var(--accent-cyan)", fontWeight: 700 }}>
                  {h.replace(/\*\*/g, "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                style={{
                  background: rIdx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.02)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                {row.map((cell, cIdx) => (
                  <td key={cIdx} style={{ padding: "8px 12px", color: "var(--text-primary)" }}>
                    {cell.startsWith("`") && cell.endsWith("`") ? (
                      <code style={{ background: "rgba(56, 189, 248, 0.1)", color: "var(--accent-cyan)", padding: "2px 6px", borderRadius: "4px" }}>
                        {cell.replace(/`/g, "")}
                      </code>
                    ) : cell.includes("🔴") || cell.includes("Critical") ? (
                      <span style={{ color: "#ef4444", fontWeight: 700 }}>{cell.replace(/\*\*/g, "")}</span>
                    ) : cell.includes("🟠") ? (
                      <span style={{ color: "#f59e0b", fontWeight: 700 }}>{cell.replace(/\*\*/g, "")}</span>
                    ) : cell.includes("🟢") ? (
                      <span style={{ color: "#10b981", fontWeight: 700 }}>{cell.replace(/\*\*/g, "")}</span>
                    ) : (
                      cell.replace(/\*\*/g, "")
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    tableBuffer = [];
    inTable = false;
    return tableNode;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      inTable = true;
      tableBuffer.push(line);
      continue;
    } else if (inTable) {
      const tableNode = flushTable(i);
      if (tableNode) elements.push(tableNode);
    }

    if (line.startsWith("## ")) {
      elements.push(
        <div
          key={i}
          style={{
            fontSize: "1.1rem",
            fontWeight: 800,
            color: "var(--accent-cyan)",
            margin: "12px 0 6px 0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Sparkles size={18} />
          {line.replace("## ", "").replace(/\*\*/g, "")}
        </div>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <div
          key={i}
          style={{
            fontSize: "0.95rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: "10px 0 4px 0",
          }}
        >
          {line.replace("### ", "").replace(/\*\*/g, "")}
        </div>
      );
    } else if (line.startsWith("#### ")) {
      elements.push(
        <div
          key={i}
          style={{
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "var(--accent-amber)",
            margin: "8px 0 4px 0",
          }}
        >
          {line.replace("#### ", "").replace(/\*\*/g, "")}
        </div>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <div
          key={i}
          style={{
            borderLeft: "3px solid var(--accent-amber)",
            background: "rgba(245, 158, 11, 0.08)",
            padding: "8px 14px",
            margin: "4px 0",
            borderRadius: "0 6px 6px 0",
            fontSize: "0.82rem",
            color: "var(--text-primary)",
          }}
        >
          {line.replace("> ", "").replace(/\*\*/g, "")}
        </div>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
            margin: "3px 0",
            paddingLeft: "4px",
          }}
        >
          <span style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>•</span>
          <span>{line.substring(2).replace(/\*\*/g, "")}</span>
        </div>
      );
    } else if (line.trim() === "---") {
      elements.push(
        <hr
          key={i}
          style={{
            border: "none",
            borderTop: "1px solid var(--border-glass)",
            margin: "12px 0",
          }}
        />
      );
    } else if (line.trim() !== "") {
      elements.push(
        <p
          key={i}
          style={{
            fontSize: "0.84rem",
            color: "var(--text-primary)",
            margin: "4px 0",
            lineHeight: "1.5",
          }}
        >
          {line.replace(/\*\*/g, "")}
        </p>
      );
    }
  }

  if (inTable) {
    const tableNode = flushTable(lines.length);
    if (tableNode) elements.push(tableNode);
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>{elements}</div>;
};

export const CivilEngineeringCopilot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "copilot",
      text: "👋 **Hello! I am your AI Civil Engineering Copilot & Autonomous Work-Order Agent.**\n\nI can autonomously query spatial pavement defect telemetry, calculate MoRTH/IRC compliant **Bills of Materials (BOM)** with live Indian market rates, and draft official municipal maintenance tender tickets (NHAI, State PWD, Municipal Corporations).\n\n*Select a prompt below or ask any highway engineering query:*",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      data: {
        suggestions: [
          "Identify critical segments on NH-44 needing resurfacing before monsoon",
          "Calculate repair costs for Madurai Ring Road",
          "Draft an official NHAI work order for NH-44",
          "What are the IRC:82-2015 specifications for crack sealing?",
        ],
      },
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [corridors, setCorridors] = useState<any[]>([]);
  const [selectedCorridor, setSelectedCorridor] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const loadRoads = async () => {
      try {
        const res = await api.fetchCopilotRoads();
        if (res?.corridors) {
          setCorridors(res.corridors);
        }
      } catch (err) {
        console.warn("Failed to load corridors:", err);
      }
    };
    loadRoads();
  }, []);

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
        selected_corridor: selectedCorridor !== "ALL" ? selectedCorridor : undefined,
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
    } catch (err: any) {
      const errorMsg: Message = {
        id: `cop-err-${Date.now()}`,
        sender: "copilot",
        text: `⚠️ **Agent Error:** Could not process request (${err.message || "Backend unreachable"}). Please verify that the FastAPI backend server is running on port 8000.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopyTicket = (ticketId: string) => {
    navigator.clipboard.writeText(ticketId);
    setCopiedId(ticketId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadWorkOrder = (workOrder: any) => {
    const blob = new Blob([JSON.stringify(workOrder, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workOrder.work_order_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px", minHeight: "750px" }}>
      {/* Sidebar: Available Corridors & Engineering Standards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Active Corridors Panel */}
        <div className="glass-panel" style={{ padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Building size={18} color="var(--accent-cyan)" />
              <span style={{ fontSize: "0.88rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Active Corridors
              </span>
            </div>
            <span className="cyber-badge badge-cyan" style={{ fontSize: "0.68rem" }}>
              {corridors.length || 6} Monitored
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              onClick={() => setSelectedCorridor("ALL")}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: "8px",
                background: selectedCorridor === "ALL" ? "var(--tab-active-bg)" : "var(--bg-surface)",
                border: selectedCorridor === "ALL" ? "1.5px solid var(--accent-cyan)" : "1px solid var(--border-glass)",
                color: "var(--text-primary)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "0.82rem",
                fontWeight: 600,
                boxShadow: "var(--card-shadow)",
              }}
            >
              <span>🌐 All Corridors Network</span>
              <span className="cyber-badge badge-emerald" style={{ fontSize: "0.68rem" }}>
                Active
              </span>
            </button>

            {corridors.map((c) => (
              <button
                key={c.road_name}
                onClick={() => {
                  setSelectedCorridor(c.road_name);
                  handleSendMessage(`Show condition status and critical segments for ${c.road_name}`);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: selectedCorridor === c.road_name ? "var(--tab-active-bg)" : "var(--bg-surface)",
                  border: selectedCorridor === c.road_name ? "1.5px solid var(--accent-cyan)" : "1px solid var(--border-glass)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: "var(--card-shadow)",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.84rem", color: "var(--accent-cyan)" }}>{c.road_name}</span>
                  {c.critical_segments > 0 ? (
                    <span className="cyber-badge badge-rose badge-critical-blink" style={{ fontSize: "0.64rem" }}>
                      {c.critical_segments} Critical
                    </span>
                  ) : (
                    <span className="cyber-badge badge-emerald" style={{ fontSize: "0.64rem" }}>
                      Good
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>
                  Avg PCI: <strong style={{ color: c.average_pci < 30 ? "#ef4444" : c.average_pci < 70 ? "#f59e0b" : "#10b981" }}>{c.average_pci}</strong> • {c.total_segments} Segments ({c.total_length_km || 0.2} km)
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  {c.district}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Engineering Standards Spec Box */}
        <div className="glass-panel" style={{ padding: "18px", fontSize: "0.78rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", color: "var(--accent-amber)" }}>
            <ShieldCheck size={18} />
            <span style={{ fontWeight: 800, textTransform: "uppercase" }}>IRC / MoRTH Knowledge Engine</span>
          </div>
          <p style={{ color: "var(--text-secondary)", margin: "0 0 10px 0", lineHeight: "1.4" }}>
            Trained on national pavement rehabilitation specifications:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ padding: "6px 10px", background: "var(--bg-surface)", borderRadius: "6px", border: "1px solid var(--border-glass)", color: "var(--text-primary)" }}>
              <strong>MoRTH 5th Rev Section 500</strong>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Hot-Mix Asphalt, DBM, Tack Emulsion</div>
            </div>
            <div style={{ padding: "6px 10px", background: "var(--bg-surface)", borderRadius: "6px", border: "1px solid var(--border-glass)", color: "var(--text-primary)" }}>
              <strong>IRC:82-2015 Code</strong>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Maintenance &amp; Crack Sealing Guidelines</div>
            </div>
            <div style={{ padding: "6px 10px", background: "var(--bg-surface)", borderRadius: "6px", border: "1px solid var(--border-glass)", color: "var(--text-primary)" }}>
              <strong>IS 73:2018 Bitumen Grading</strong>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>VG-10, VG-30, VG-40, PMB-120 Viscosity</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Assistant Container */}
      <div
        className="glass-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "780px",
          overflow: "hidden",
          border: "1px solid var(--border-glass)",
          background: "var(--bg-surface)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        {/* Chat Top Header */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--border-glass)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, var(--accent-cyan) 0%, #0369a1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 16px var(--accent-cyan-glow)",
              }}
            >
              <Bot size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-primary)" }}>
                  Civil Engineering AI Copilot
                </span>
                <span className="cyber-badge badge-emerald" style={{ fontSize: "0.68rem" }}>
                  Autonomous ReAct Engine
                </span>
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                Pavement Defect Triage • MoRTH BOM Synthesis • Municipal Work-Order Dispatch
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => {
                setMessages([messages[0]]);
              }}
              className="cyber-btn"
              style={{ fontSize: "0.76rem", padding: "7px 14px", display: "flex", alignItems: "center", gap: "6px" }}
              title="Reset conversation"
            >
              <RefreshCw size={13} />
              Reset Chat
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div
          style={{
            flex: 1,
            padding: "22px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            background: "var(--bg-main)",
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                gap: "8px",
              }}
            >
              {/* Sender label */}
              <div
                style={{
                  fontSize: "0.74rem",
                  color: "var(--text-muted)",
                  padding: "0 4px",
                  display: "flex",
                  gap: "6px",
                  alignItems: "center",
                }}
              >
                {msg.sender === "copilot" ? (
                  <>
                    <Bot size={14} color="var(--accent-cyan)" />
                    <span style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>AI Civil Engineering Copilot</span>
                  </>
                ) : (
                  <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>You (Site Engineer)</span>
                )}
                <span>• {msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                style={{
                  maxWidth: "92%",
                  padding: "16px 20px",
                  borderRadius: msg.sender === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                  background:
                    msg.sender === "user"
                      ? "linear-gradient(135deg, var(--accent-cyan) 0%, #0284c7 100%)"
                      : "var(--bg-card)",
                  color: msg.sender === "user" ? "#ffffff" : "var(--text-primary)",
                  border:
                    msg.sender === "user"
                      ? "1px solid var(--accent-cyan)"
                      : "1px solid var(--border-glass)",
                  boxShadow: "var(--card-shadow)",
                }}
              >
                {/* Formatted Markdown Content */}
                {msg.sender === "user" ? (
                  <div style={{ fontSize: "0.9rem", lineHeight: "1.5", fontWeight: 500 }}>{msg.text}</div>
                ) : (
                  <MarkdownRenderer content={msg.text} />
                )}

                {/* Thought Steps / Tools Called Badges */}
                {msg.data?.tools_called && msg.data.tools_called.length > 0 && (
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "12px 14px",
                      background: "rgba(56, 189, 248, 0.05)",
                      borderRadius: "8px",
                      border: "1px solid rgba(56, 189, 248, 0.2)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.74rem",
                        fontWeight: 800,
                        color: "var(--accent-cyan)",
                        textTransform: "uppercase",
                        marginBottom: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Cpu size={14} />
                      Autonomous Tool Execution Trace ({msg.data.tools_called.length} Tools)
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {msg.data.tools_called.map((tool, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: "0.76rem",
                            color: "var(--text-secondary)",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <CheckCircle2 size={14} color="#10b981" />
                          <code
                            style={{
                              color: "var(--accent-cyan)",
                              background: "rgba(56, 189, 248, 0.12)",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontWeight: 700,
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {tool.tool_name}()
                          </code>
                          <span>{tool.output_summary}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactive Work Order Ticket Card */}
                {msg.data?.work_order && (
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "16px",
                      borderRadius: "10px",
                      background: "rgba(239, 68, 68, 0.06)",
                      border: "1.5px solid rgba(239, 68, 68, 0.4)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <FileText size={20} color="#ef4444" />
                        <span style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text-primary)" }}>
                          {msg.data.work_order.title}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleCopyTicket(msg.data!.work_order.work_order_id)}
                          style={{
                            fontSize: "0.74rem",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border-glass)",
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            fontWeight: 600,
                          }}
                        >
                          {copiedId === msg.data.work_order.work_order_id ? <Check size={13} color="#10b981" /> : <Share2 size={13} />}
                          {copiedId === msg.data.work_order.work_order_id ? "Copied" : "Copy Ticket ID"}
                        </button>
                        <button
                          onClick={() => handleDownloadWorkOrder(msg.data!.work_order)}
                          style={{
                            fontSize: "0.74rem",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            background: "linear-gradient(135deg, var(--accent-cyan) 0%, #0284c7 100%)",
                            border: "none",
                            color: "#ffffff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            fontWeight: 700,
                            boxShadow: "0 2px 8px rgba(2, 132, 199, 0.3)",
                          }}
                        >
                          <Download size={13} />
                          Export Tender JSON
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                        gap: "10px",
                        fontSize: "0.78rem",
                      }}
                    >
                      <div style={{ background: "var(--bg-surface)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700 }}>TICKET ID</div>
                        <div style={{ fontWeight: 800, color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>
                          {msg.data.work_order.work_order_id}
                        </div>
                      </div>
                      <div style={{ background: "var(--bg-surface)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700 }}>JURISDICTION AUTHORITY</div>
                        <div style={{ fontWeight: 700, color: "var(--accent-amber)" }}>
                          {msg.data.work_order.jurisdiction_authority}
                        </div>
                      </div>
                      <div style={{ background: "var(--bg-surface)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-glass)" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700 }}>ESTIMATED PROJECT BUDGET</div>
                        <div style={{ fontWeight: 800, color: "var(--accent-emerald)" }}>
                          ₹{msg.data.work_order.bill_of_materials.total_cost_inr.toLocaleString("en-IN")} INR
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Follow-up Suggestions Chips */}
                {msg.data?.suggestions && msg.data.suggestions.length > 0 && (
                  <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                      💡 Recommended Follow-up Queries:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {msg.data.suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(sug)}
                          style={{
                            fontSize: "0.76rem",
                            fontWeight: 600,
                            padding: "6px 12px",
                            borderRadius: "16px",
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border-glass)",
                            color: "var(--accent-cyan)",
                            cursor: "pointer",
                            textAlign: "left",
                            boxShadow: "var(--card-shadow)",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--tab-active-bg)";
                            e.currentTarget.style.borderColor = "var(--accent-cyan)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "var(--bg-surface)";
                            e.currentTarget.style.borderColor = "var(--border-glass)";
                          }}
                        >
                          ⚡ {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--accent-cyan)", fontSize: "0.84rem", fontWeight: 600, padding: "8px" }}>
              <Bot size={18} className="animate-spin" />
              <span>AI Engineering Copilot is analyzing spatial telemetry &amp; calculating MoRTH BOM...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Preset Prompt Carousel */}
        <div
          style={{
            padding: "10px 18px",
            background: "var(--bg-card)",
            borderTop: "1px solid var(--border-glass)",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            whiteSpace: "nowrap",
          }}
        >
          {PRESET_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              style={{
                fontSize: "0.74rem",
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: "14px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-glass)",
                color: "var(--text-primary)",
                cursor: "pointer",
                boxShadow: "var(--card-shadow)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-cyan)";
                e.currentTarget.style.color = "var(--accent-cyan)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-glass)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
            >
              💬 {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: "14px 18px",
            borderTop: "1px solid var(--border-glass)",
            background: "var(--bg-card)",
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ask AI Copilot (e.g. 'Identify critical segments on NH-44 needing urgent patching before monsoon')..."
            style={{
              flex: 1,
              padding: "12px 18px",
              borderRadius: "8px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-glass)",
              color: "var(--text-primary)",
              fontSize: "0.88rem",
              outline: "none",
              boxShadow: "var(--card-shadow)",
            }}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isTyping}
            style={{
              padding: "12px 22px",
              borderRadius: "8px",
              background: inputValue.trim() ? "linear-gradient(135deg, var(--accent-cyan) 0%, #0284c7 100%)" : "var(--bg-surface)",
              border: "1px solid var(--border-glass)",
              color: inputValue.trim() ? "#ffffff" : "var(--text-muted)",
              cursor: inputValue.trim() && !isTyping ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 800,
              fontSize: "0.86rem",
              boxShadow: inputValue.trim() ? "0 4px 14px rgba(2, 132, 199, 0.4)" : "none",
            }}
          >
            <Send size={16} />
            Ask Copilot
          </button>
        </div>
      </div>
    </div>
  );
};
