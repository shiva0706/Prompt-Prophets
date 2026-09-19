import React, { useState, useEffect } from "react";
import {
  Download,
  HardHat,
  MapPin,
  ExternalLink,
  Calculator,
  FileCheck2,
  Layers,
  Printer,
  Receipt,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { api } from "../services/api";
import type { FullRoadInspectionReport, RoadWorkOrderItem } from "../types";

interface MaintenancePrioritizationProps {
  report: FullRoadInspectionReport | null;
}

interface BomMaterialItem {
  item: string;
  quantity: number;
  unit: string;
  unit_rate_inr: number;
  total_cost_inr: number;
  specification_standard: string;
}

interface BomMachineryItem {
  equipment: string;
  duration_hours: number;
  rate_per_hour_inr: number;
  total_cost_inr: number;
}

interface BomLaborItem {
  role: string;
  crew_count: number;
  duration_hours: number;
  rate_per_hour_inr: number;
  total_cost_inr: number;
}

interface LiveBomResult {
  segment_ids: string[];
  total_area_sqm: number;
  repair_strategy: string;
  materials: BomMaterialItem[];
  machinery: BomMachineryItem[];
  labor: BomLaborItem[];
  subtotal_materials_inr: number;
  subtotal_machinery_inr: number;
  subtotal_labor_inr: number;
  contingency_overhead_inr: number;
  total_cost_inr: number;
  total_cost_usd: number;
  compliance_standard: string;
}

interface GeneratedWorkOrder {
  work_order_id: string;
  title: string;
  road_name: string;
  chainage_summary: string;
  jurisdiction_authority: string;
  urgency: string;
  primary_action: string;
  target_completion_days: number;
  segments_covered: string[];
  bill_of_materials: LiveBomResult;
  items: Array<{
    defect_id: string;
    defect_type: string;
    severity: string;
    action: string;
    urgency: string;
    cost_inr: number;
  }>;
  compliance_notes: string;
  created_at: string;
  status: string;
}

export const MaintenancePrioritization: React.FC<MaintenancePrioritizationProps> = ({ report }) => {
  const [filterUrgency, setFilterUrgency] = useState<string>("ALL");
  const [completedOrders, setCompletedOrders] = useState<Record<string, boolean>>({});

  // Corridors & Multi-segment synthesis state
  const [corridors, setCorridors] = useState<any[]>([]);
  const [selectedCorridor, setSelectedCorridor] = useState<string>("NH-44 (Chennai-Bengaluru Highway)");
  const [availableSegments, setAvailableSegments] = useState<any[]>([]);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>(["NH44-SEG-001", "NH44-SEG-002", "NH44-SEG-003"]);
  const [repairStrategy, setRepairStrategy] = useState<string>(
    "MoRTH Section 500: 40mm Bituminous Concrete (BC) with VG-30 Bitumen Binder & Tack Coat"
  );
  const [targetAuthority, setTargetAuthority] = useState<string>(
    "Tamil Nadu State Highways & Minor Ports Department (TN-SHD)"
  );
  const [orderUrgency, setOrderUrgency] = useState<string>("CRITICAL EMERGENCY (SLA < 24 Hours)");

  // Live Backend Results
  const [isCalculatingBom, setIsCalculatingBom] = useState<boolean>(false);
  const [isDraftingOrder, setIsDraftingOrder] = useState<boolean>(false);
  const [liveBom, setLiveBom] = useState<LiveBomResult | null>(null);
  const [generatedOrder, setGeneratedOrder] = useState<GeneratedWorkOrder | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Initial load of corridors
  useEffect(() => {
    const loadCorridorsAndSegments = async () => {
      try {
        const roadsData = await api.fetchCopilotRoads();
        if (roadsData?.corridors && roadsData.corridors.length > 0) {
          setCorridors(roadsData.corridors);
          setSelectedCorridor(roadsData.corridors[0].road_name);
        } else {
          setCorridors([
            { road_name: "NH-44 (Chennai-Bengaluru Highway)", corridor_description: "Heavy Commercial Golden Quadrilateral", total_segments: 12, critical_segments: 4, average_pci: 28.4 },
            { road_name: "SH-49A (OMR IT Expressway, Chennai)", corridor_description: "High-Traffic IT Corridor", total_segments: 10, critical_segments: 3, average_pci: 34.2 },
            { road_name: "SH-72 (Kanchipuram - Chengalpattu)", corridor_description: "Industrial Transit Highway", total_segments: 8, critical_segments: 2, average_pci: 41.0 },
          ]);
        }
      } catch (e) {
        console.warn("Using default corridors", e);
      }
    };
    loadCorridorsAndSegments();
  }, []);

  // Fetch segments when corridor changes
  useEffect(() => {
    const loadSegmentsForCorridor = async () => {
      try {
        const segData = await api.fetchCopilotSegments({ road_name: selectedCorridor });
        if (segData?.segments && segData.segments.length > 0) {
          setAvailableSegments(segData.segments);
          const criticalIds = segData.segments.filter((s: any) => (s.pci ?? 100) < 45).map((s: any) => s.segment_id);
          setSelectedSegmentIds(criticalIds.length > 0 ? criticalIds.slice(0, 3) : segData.segments.slice(0, 3).map((s: any) => s.segment_id));
        } else if (report?.segments && report.segments.length > 0) {
          const mapped = report.segments.map((s: any, idx: number) => ({
            segment_id: s.segment_id || `SEG-${idx + 1}`,
            road_name: s.road_name || selectedCorridor,
            chainage_km: `Km ${(idx * 0.05 + 12.0).toFixed(2)}`,
            pci: (32 - idx * 2),
            sri: (78 + idx * 3),
            defect_type: idx % 2 === 0 ? "Pothole Cavity" : "Alligator Fatigue Cracking",
            severity: "Critical",
            depth_cm: "5.4",
            area_sqm: 2.8,
          }));
          setAvailableSegments(mapped);
          setSelectedSegmentIds(mapped.slice(0, 3).map((s: any) => s.segment_id));
        }
      } catch (e) {
        console.warn("Error loading segments", e);
      }
    };
    loadSegmentsForCorridor();
  }, [selectedCorridor, report]);

  // Multi-Segment Distress Synthesis Metrics
  const activeSelectedSegments = availableSegments.filter((s) => selectedSegmentIds.includes(s.segment_id));
  const synthesizedMetrics = {
    segmentCount: activeSelectedSegments.length,
    totalAreaSqm: activeSelectedSegments.reduce((acc, s) => acc + (s.area_sqm || (s.pothole_count || 1) * 2.8 + (s.crack_count || 1) * 4.2), 0),
    avgPci: activeSelectedSegments.length > 0
      ? Math.round(activeSelectedSegments.reduce((acc, s) => acc + (s.pci ?? 35), 0) / activeSelectedSegments.length)
      : 0,
    avgSri: activeSelectedSegments.length > 0
      ? Math.round(activeSelectedSegments.reduce((acc, s) => acc + (s.sri ?? 75), 0) / activeSelectedSegments.length)
      : 0,
    totalSpanMeters: activeSelectedSegments.length * 50,
  };

  const handleToggleSegment = (segId: string) => {
    setSelectedSegmentIds((prev) =>
      prev.includes(segId) ? prev.filter((id) => id !== segId) : [...prev, segId]
    );
  };

  const handleSelectAllCritical = () => {
    const criticalIds = availableSegments.filter((s) => (s.pci ?? 100) < 40).map((s) => s.segment_id);
    setSelectedSegmentIds(criticalIds.length > 0 ? criticalIds : availableSegments.map((s) => s.segment_id));
  };

  // Direct Backend: Calculate BOM
  const handleCalculateBom = async () => {
    if (selectedSegmentIds.length === 0) {
      alert("Please select at least one road segment for BOM calculation.");
      return;
    }
    setIsCalculatingBom(true);
    try {
      const result = await api.calculateBomDirect({
        segment_ids: selectedSegmentIds,
        road_name: selectedCorridor,
        repair_strategy: repairStrategy,
      });
      setLiveBom(result);
      setSuccessToast(`✓ MoRTH & IRC:82 Calibrated BOM generated for ${selectedSegmentIds.length} segments!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (e) {
      console.error("Failed to calculate BOM:", e);
    } finally {
      setIsCalculatingBom(false);
    }
  };

  // Direct Backend: Generate Work Order
  const handleGenerateWorkOrder = async () => {
    if (selectedSegmentIds.length === 0) {
      alert("Please select at least one road segment for work order generation.");
      return;
    }
    setIsDraftingOrder(true);
    try {
      const result = await api.draftWorkOrderDirect({
        road_name: selectedCorridor,
        segment_ids: selectedSegmentIds,
        urgency: orderUrgency,
        action: repairStrategy,
        authority: targetAuthority,
        notes: `Compliant with MoRTH Section 500 (5th Rev) & IRC:82-2015. Live Indian Market Pricing applied.`,
      });
      setGeneratedOrder(result);
      setSuccessToast(`✓ Official Municipal Work Order #${result.work_order_id} generated & docketed!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (e) {
      console.error("Failed to generate work order:", e);
    } finally {
      setIsDraftingOrder(false);
    }
  };

  // Export BOM to CSV
  const handleExportBomCsv = () => {
    if (!liveBom) return;
    const lines = [
      `"MoRTH & IRC:82-2015 Calibrated Bill of Materials (BOM)"`,
      `"Corridor: ${selectedCorridor}"`,
      `"Segments Covered: ${liveBom.segment_ids.join(", ")}"`,
      `"Repair Strategy: ${liveBom.repair_strategy}"`,
      `"Compliance Standard: ${liveBom.compliance_standard}"`,
      `"Total Surface Area: ${liveBom.total_area_sqm} Sq.m"`,
      `""`,
      `"Category","Item Description","Quantity","Unit","Unit Rate (INR)","Total Cost (INR)","Specification Standard"`,
      ...liveBom.materials.map((m) => `"Material","${m.item}",${m.quantity},"${m.unit}",${m.unit_rate_inr},${m.total_cost_inr},"${m.specification_standard}"`),
      ...liveBom.machinery.map((m) => `"Machinery","${m.equipment}",${m.duration_hours},"Hours",${m.rate_per_hour_inr},${m.total_cost_inr},"IS 3025"`),
      ...liveBom.labor.map((l) => `"Labor","${l.role} (${l.crew_count} personnel)",${l.duration_hours},"Hours",${l.rate_per_hour_inr},${l.total_cost_inr},"Labour Standard"`),
      `""`,
      `"Subtotal Materials","","","","",${liveBom.subtotal_materials_inr},""`,
      `"Subtotal Machinery","","","","",${liveBom.subtotal_machinery_inr},""`,
      `"Subtotal Labor","","","","",${liveBom.subtotal_labor_inr},""`,
      `"Contingency & Overhead (5%)","","","","",${liveBom.contingency_overhead_inr},""`,
      `"GST (18%)","","","","",${Math.round(liveBom.total_cost_inr * 0.18)},""`,
      `"GRAND TOTAL ESTIMATED COST (INR)","","","","",${liveBom.total_cost_inr},""`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MoRTH_IRC82_Calibrated_BOM_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

      {/* Toast Notification */}
      {successToast && (
        <div
          className="fade-in-up"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            color: "#ffffff",
            padding: "14px 22px",
            borderRadius: "10px",
            boxShadow: "0 8px 30px rgba(2, 132, 199, 0.45)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: 700,
            fontSize: "0.88rem",
            border: "1px solid rgba(255, 255, 255, 0.4)",
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
        </div>
      )}
      
      {/* Top Level Summary Cards */}
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
            {immediateCount} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Critical Orders</span>
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

      {/* ========================================================================= */}
      {/* DIRECT BACKEND CONNECTED: MoRTH & IRC:82-2015 CIVIL ENGINEERING WORKBENCH */}
      {/* ========================================================================= */}
      <div
        className="glass-panel"
        style={{
          padding: "24px 28px",
          borderTop: "4px solid #0284c7",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                }}
              >
                <Calculator size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  MoRTH &amp; IRC:82-2015 Civil Engineering Workbench
                </h2>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Direct Backend Connected • Multi-Segment Distress Synthesis • Live Indian Market Rates BOM • Municipal Work Order Generator
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span className="cyber-badge badge-cyan" style={{ fontSize: "0.72rem", padding: "5px 10px" }}>
              MoRTH Section 500 Compliant
            </span>
            <span className="cyber-badge badge-emerald" style={{ fontSize: "0.72rem", padding: "5px 10px" }}>
              IRC:82-2015 Standard
            </span>
          </div>
        </div>

        {/* Step 1: Corridor, Urgency & Multi-Segment Selection */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            background: "rgba(2, 132, 199, 0.04)",
            padding: "18px",
            borderRadius: "10px",
            border: "1px solid rgba(2, 132, 199, 0.15)",
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
              🛣️ Select Target Corridor / Highway
            </label>
            <select
              value={selectedCorridor}
              onChange={(e) => setSelectedCorridor(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-glass)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                fontWeight: 600,
                outline: "none",
              }}
            >
              {corridors.map((c) => (
                <option key={c.road_name} value={c.road_name}>
                  {c.road_name} (PCI: {c.average_pci ?? 35} • {c.critical_segments ?? 3} Critical)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
              🛠️ Engineering Repair Strategy (MoRTH / IRC Specification)
            </label>
            <select
              value={repairStrategy}
              onChange={(e) => setRepairStrategy(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-glass)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                fontWeight: 600,
                outline: "none",
              }}
            >
              <option value="MoRTH Section 500: 40mm Bituminous Concrete (BC) with VG-30 Bitumen Binder & Tack Coat">
                MoRTH Section 500: 40mm Bituminous Concrete (BC) VG-30 Binder
              </option>
              <option value="IRC:82-2015 Clause 6.4: Full-Depth Saw Cutting & Hot Mix Asphalt (HMA PG 64-22)">
                IRC:82-2015: Full-Depth Saw Cutting &amp; HMA PG 64-22 Inlay
              </option>
              <option value="IRC:SP:81: Polymer-Modified Micro-Surfacing (Type III 6mm Aggregate)">
                IRC:SP:81: Polymer-Modified Micro-Surfacing (Type III)
              </option>
              <option value="MoRTH Section 3004: Hot-Poured Rubberized Sealant (ASTM D6690 Type II)">
                MoRTH Section 3004: Hot-Poured Rubberized Crack Sealant
              </option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
              🏛️ Designated Jurisdiction Authority
            </label>
            <select
              value={targetAuthority}
              onChange={(e) => setTargetAuthority(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-glass)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                fontWeight: 600,
                outline: "none",
              }}
            >
              <option value="Tamil Nadu State Highways & Minor Ports Department (TN-SHD)">
                Tamil Nadu State Highways &amp; Minor Ports Dept (TN-SHD)
              </option>
              <option value="National Highways Authority of India (NHAI) - Regional Office Chennai">
                National Highways Authority of India (NHAI)
              </option>
              <option value="Greater Chennai Corporation (GCC) - Works & Roads Wing">
                Greater Chennai Corporation (GCC)
              </option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
              ⏱️ Intervention SLA &amp; Urgency
            </label>
            <select
              value={orderUrgency}
              onChange={(e) => setOrderUrgency(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-glass)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                fontWeight: 600,
                outline: "none",
              }}
            >
              <option value="CRITICAL EMERGENCY (SLA < 24 Hours)">CRITICAL EMERGENCY (SLA &lt; 24 Hours)</option>
              <option value="HIGH URGENCY (SLA < 48 Hours)">HIGH URGENCY (SLA &lt; 48 Hours)</option>
              <option value="SCHEDULED MAINTENANCE (SLA 7 Days)">SCHEDULED MAINTENANCE (SLA 7 Days)</option>
            </select>
          </div>
        </div>

        {/* Step 2: Multi-Segment Distress Grid & Automated Synthesis */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Layers size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Multi-Segment Spatial Distress Grid ({activeSelectedSegments.length} Segments Selected)
              </span>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleSelectAllCritical}
                className="btn-cyber-secondary"
                style={{ padding: "4px 10px", fontSize: "0.72rem" }}
              >
                Select Critical (PCI &lt; 40)
              </button>
              <button
                onClick={() => setSelectedSegmentIds(availableSegments.map((s) => s.segment_id))}
                className="btn-cyber-secondary"
                style={{ padding: "4px 10px", fontSize: "0.72rem" }}
              >
                Select All ({availableSegments.length})
              </button>
              <button
                onClick={() => setSelectedSegmentIds([])}
                className="btn-cyber-secondary"
                style={{ padding: "4px 10px", fontSize: "0.72rem" }}
              >
                Clear Selection
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "10px",
              maxHeight: "220px",
              overflowY: "auto",
              padding: "8px",
              background: "var(--bg-surface)",
              borderRadius: "8px",
              border: "1px solid var(--border-glass)",
            }}
          >
            {availableSegments.map((seg) => {
              const isSelected = selectedSegmentIds.includes(seg.segment_id);
              const isCritical = (seg.pci ?? 100) < 30 || seg.severity === "Critical";
              return (
                <div
                  key={seg.segment_id}
                  onClick={() => handleToggleSegment(seg.segment_id)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "7px",
                    border: isSelected ? "1.5px solid #0284c7" : "1px solid var(--border-glass)",
                    background: isSelected ? "rgba(2, 132, 199, 0.12)" : "var(--bg-card)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#0284c7" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {seg.segment_id}
                      </span>
                      <span
                        className={`cyber-badge ${isCritical ? "badge-rose" : "badge-amber"}`}
                        style={{ fontSize: "0.62rem", padding: "2px 6px" }}
                      >
                        PCI: {seg.pci ?? 35}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {seg.chainage_km ?? "Km 12.20"} • {seg.defect_type ?? "Pothole Cavity"} ({seg.depth_cm ?? "5.4"}cm depth)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Automated Multi-Segment Distress Synthesis Metrics Card */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(240, 249, 255, 0.85))",
            padding: "14px 18px",
            borderRadius: "10px",
            border: "1px solid rgba(2, 132, 199, 0.2)",
          }}
        >
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Synthesized Span
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
              {synthesizedMetrics.totalSpanMeters} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Meters</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              {synthesizedMetrics.segmentCount} Adjacent Segments
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Distress Surface Area
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0284c7", marginTop: "2px" }}>
              {synthesizedMetrics.totalAreaSqm.toFixed(1)} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>m²</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              Void Cavity &amp; Cracking Plane
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Composite Route PCI
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: synthesizedMetrics.avgPci < 35 ? "#ef4444" : "#f59e0b", marginTop: "2px" }}>
              {synthesizedMetrics.avgPci} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>/ 100</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              ASTM D6433 Standard
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Mean Segment Risk (SRI)
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ef4444", marginTop: "2px" }}>
              {synthesizedMetrics.avgSri} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>/ 100</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              Accident Hazard Tier: Severe
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Intervention Mandate
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
              Emergency SLA
            </div>
            <div style={{ fontSize: "0.68rem", color: "#ef4444", fontWeight: 700 }}>
              &lt; 24 Hours Required
            </div>
          </div>
        </div>

        {/* Step 3: Action Buttons (Calculate BOM & Generate Work Order) */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={handleCalculateBom}
            disabled={isCalculatingBom || selectedSegmentIds.length === 0}
            className="btn-cyber-primary"
            style={{
              padding: "11px 22px",
              fontSize: "0.85rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
            }}
          >
            {isCalculatingBom ? <RefreshCw className="animate-spin" size={16} /> : <Calculator size={16} />}
            <span>⚡ Calculate MoRTH &amp; IRC:82 Calibrated BOM (Live Market Rates)</span>
          </button>

          <button
            onClick={handleGenerateWorkOrder}
            disabled={isDraftingOrder || selectedSegmentIds.length === 0}
            className="btn-cyber-secondary"
            style={{
              padding: "11px 22px",
              fontSize: "0.85rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            {isDraftingOrder ? <RefreshCw className="animate-spin" size={16} /> : <FileCheck2 size={16} />}
            <span>📋 Generate Official Municipal Work Order Ticket</span>
          </button>

          {liveBom && (
            <button
              onClick={handleExportBomCsv}
              className="btn-cyber-secondary"
              style={{
                padding: "11px 18px",
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginLeft: "auto",
              }}
            >
              <Download size={14} />
              <span>Export Calibrated BOM (CSV)</span>
            </button>
          )}
        </div>

        {/* Step 4: Calibrated BOM Live Breakdown Display */}
        {liveBom && (
          <div
            className="fade-in-up"
            style={{
              background: "var(--bg-surface)",
              borderRadius: "10px",
              border: "1.5px solid rgba(2, 132, 199, 0.25)",
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Receipt size={18} color="#0284c7" />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  Itemized Bill of Materials (BOM) • Live Indian Market Rates Breakdown
                </h3>
              </div>
              <span className="cyber-badge badge-cyan" style={{ fontSize: "0.72rem" }}>
                {liveBom.compliance_standard}
              </span>
            </div>

            {/* Materials Table */}
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "8px" }}>
                📦 1. Raw Materials &amp; Bituminous Products (MoRTH Specification)
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead>
                    <tr style={{ background: "rgba(2, 132, 199, 0.08)", color: "var(--text-primary)", textAlign: "left" }}>
                      <th style={{ padding: "8px 10px", borderRadius: "6px 0 0 6px" }}>Item Description</th>
                      <th style={{ padding: "8px 10px" }}>Standard Spec</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Quantity</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Live Rate (INR)</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", borderRadius: "0 6px 6px 0" }}>Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveBom.materials.map((m, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border-glass)" }}>
                        <td style={{ padding: "9px 10px", fontWeight: 600, color: "var(--text-primary)" }}>{m.item}</td>
                        <td style={{ padding: "9px 10px", color: "var(--text-muted)", fontSize: "0.74rem" }}>{m.specification_standard}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700 }}>{m.quantity} {m.unit}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", color: "var(--text-secondary)" }}>₹{m.unit_rate_inr.toLocaleString('en-IN')}/{m.unit}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 800, color: "#0284c7" }}>₹{m.total_cost_inr.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    <tr style={{ background: "rgba(2, 132, 199, 0.04)", fontWeight: 700 }}>
                      <td colSpan={4} style={{ padding: "8px 10px", textAlign: "right" }}>Subtotal Materials:</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--text-primary)" }}>₹{liveBom.subtotal_materials_inr.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Machinery & Labor Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
              {/* Machinery Schedule */}
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "8px" }}>
                  🚜 2. Heavy Machinery &amp; Compaction Equipment
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                  <thead>
                    <tr style={{ background: "rgba(245, 158, 11, 0.08)", color: "var(--text-primary)", textAlign: "left" }}>
                      <th style={{ padding: "6px 8px" }}>Equipment</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Hours</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Rate/Hr</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveBom.machinery.map((mac, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border-glass)" }}>
                        <td style={{ padding: "7px 8px", fontWeight: 600 }}>{mac.equipment}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right" }}>{mac.duration_hours}h</td>
                        <td style={{ padding: "7px 8px", textAlign: "right" }}>₹{mac.rate_per_hour_inr}/h</td>
                        <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700 }}>₹{mac.total_cost_inr.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 700, background: "rgba(245, 158, 11, 0.04)" }}>
                      <td colSpan={3} style={{ padding: "6px 8px", textAlign: "right" }}>Subtotal Machinery:</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>₹{liveBom.subtotal_machinery_inr.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Labor Workforce Schedule */}
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "8px" }}>
                  👷 3. Civil Engineering Labor &amp; Masons
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                  <thead>
                    <tr style={{ background: "rgba(16, 185, 129, 0.08)", color: "var(--text-primary)", textAlign: "left" }}>
                      <th style={{ padding: "6px 8px" }}>Role</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Crew</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Rate/Hr</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveBom.labor.map((lab, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border-glass)" }}>
                        <td style={{ padding: "7px 8px", fontWeight: 600 }}>{lab.role}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right" }}>{lab.crew_count}p x {lab.duration_hours}h</td>
                        <td style={{ padding: "7px 8px", textAlign: "right" }}>₹{lab.rate_per_hour_inr}/h</td>
                        <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700 }}>₹{lab.total_cost_inr.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 700, background: "rgba(16, 185, 129, 0.04)" }}>
                      <td colSpan={3} style={{ padding: "6px 8px", textAlign: "right" }}>Subtotal Labor:</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>₹{liveBom.subtotal_labor_inr.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Final Financial Synthesis Summary */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(2, 132, 199, 0.1), rgba(16, 185, 129, 0.1))",
                padding: "16px 20px",
                borderRadius: "8px",
                border: "1px solid rgba(2, 132, 199, 0.3)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  Materials (₹{liveBom.subtotal_materials_inr.toLocaleString('en-IN')}) + Machinery (₹{liveBom.subtotal_machinery_inr.toLocaleString('en-IN')}) + Labor (₹{liveBom.subtotal_labor_inr.toLocaleString('en-IN')}) + Overheads (₹{liveBom.contingency_overhead_inr.toLocaleString('en-IN')})
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Includes 5% Contingency &amp; Site Sanitation Overhead Mandates
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  Grand Total Calibrated Budget
                </div>
                <div style={{ fontSize: "1.65rem", fontWeight: 900, color: "#0284c7" }}>
                  ₹{liveBom.total_cost_inr.toLocaleString('en-IN')} <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>INR</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  ≈ ${liveBom.total_cost_usd?.toLocaleString('en-US') || Math.round(liveBom.total_cost_inr / 84)} USD Equivalent
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Official Municipal Work Order Output */}
        {generatedOrder && (
          <div
            className="fade-in-up"
            style={{
              background: "#ffffff",
              borderRadius: "10px",
              border: "2px solid #0f172a",
              padding: "24px 28px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              color: "#0f172a",
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0f172a", paddingBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#64748b" }}>
                  OFFICIAL GOVERNMENT DISPATCH DOCKET
                </div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 900, margin: "2px 0 0", color: "#0f172a" }}>
                  {generatedOrder.title}
                </h3>
                <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "3px" }}>
                  Docket No: <strong className="code-font" style={{ color: "#0284c7" }}>{generatedOrder.work_order_id}</strong> • Jurisdiction: <strong>{generatedOrder.jurisdiction_authority}</strong>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    background: "#fee2e2",
                    color: "#991b1b",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    border: "1px solid #f87171",
                  }}
                >
                  {generatedOrder.urgency}
                </span>
                <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "4px" }}>
                  Issued: {generatedOrder.created_at}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", fontSize: "0.78rem" }}>
              <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.7rem", fontWeight: 700 }}>PRIMARY ACTION DIRECTIVE</span>
                <strong style={{ color: "#0f172a" }}>{generatedOrder.primary_action}</strong>
              </div>
              <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.7rem", fontWeight: 700 }}>TARGET COMPLETION SLA</span>
                <strong style={{ color: "#0f172a" }}>{generatedOrder.target_completion_days} Day(s) (Emergency Rapid Repair)</strong>
              </div>
              <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.7rem", fontWeight: 700 }}>TOTAL SANCTIONED BUDGET</span>
                <strong style={{ color: "#0284c7" }}>₹{generatedOrder.bill_of_materials.total_cost_inr.toLocaleString('en-IN')} INR</strong>
              </div>
            </div>

            <div style={{ fontSize: "0.78rem", background: "#f1f5f9", padding: "12px 14px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
              📜 <strong>Mandatory Compliance Notes:</strong> {generatedOrder.compliance_notes}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => window.print()}
                style={{
                  padding: "7px 14px",
                  borderRadius: "6px",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "1px solid #0f172a",
                  background: "#ffffff",
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <Printer size={13} />
                <span>Print Official Docket</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PRIORITIZED MAINTENANCE WORK ORDER QUEUE                                   */}
      {/* ========================================================================= */}
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
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                    SLA: {wo.urgency === "CRITICAL" ? "< 24h Directive" : "< 48h Directive"}
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
