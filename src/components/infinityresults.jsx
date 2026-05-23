import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import "./result.css";

import { generatePDF, PDFDownloadButton } from "./download";
import { generateExcelReport } from "./excel";
import ExcelDownloadButton from "./excel";
import Timeline from "./timeline";
import HelpModal from "./HelpModal";
import CostBreakdownChart from "./CostBreakdownChart";
import ShareResults from "./ShareResults";
import ComparisonTool from "./ComparisonTool";
import SaveProjectModal from "./SaveProjectModal";

const API_BASE_URL = "https://pool-costing-api.intelithon.in";
const INSTALLATION_PERCENT = 0.15;
const VISUALIZATION_3D_URL = "https://3d.intelithon.in";

// ================================
// 🚀 SUB ROWS CONFIG - Main Pool Only
// ================================
const SUB_ROWS = {
  1: [
    { slNo: "1.1", label: "Excavation up to 1.50m depth" },
    { slNo: "1.2", label: "Excavation from 1.50m to 3.00m depth" },
  ],
  9: [
    { slNo: "9.1", label: "Raft" },
    { slNo: "9.2", label: "Retaining Wall" },
  ],
  10: [
    { slNo: "10.1", label: "Raft RCC" },
    { slNo: "10.2", label: "Retaining Wall RCC" },
  ],
};

// Items that have subrows (hide parent qty and amount)
const ITEMS_WITH_SUBROWS = [1, 9, 10];

// ================================
// COMMON HELPER FOR ALL SUBROW DATA - FIXED PATHS
// ================================
const getSubRowData = (resultData, type, excavationRateMap = {}) => {

  // =========================
  // EXCAVATION
  // =========================
  if (type === "excavation") {
    // ✅ CORRECT PATH: inside civil_quantities
    const split =
      resultData?.civil_quantities?.excavation_split || {};

    console.log("🔥 EXCAVATION SPLIT =", split);

    return {
      "1.1": {
        qty: Number(split?.["1.1"]?.qty || 0),
        rate: Number(split?.["1.1"]?.rate || 0),
        amount: Number(split?.["1.1"]?.amount || 0),
      },
      "1.2": {
        qty: Number(split?.["1.2"]?.qty || 0),
        rate: Number(split?.["1.2"]?.rate || 0),
        amount: Number(split?.["1.2"]?.amount || 0),
      },
    };
  }

  // =========================
  // SHUTTERING
  // =========================
  if (type === "shuttering") {
    // ✅ FIXED PATH - inside civil_quantities
    const split =
      resultData?.civil_quantities?.shuttering_split || {};

    console.log("🔥 SHUTTERING SPLIT =", split);

    return {
      "9.1": {
        qty: Number(split?.["9.1"]?.qty || 0),
        rate: Number(
          split?.["9.1"]?.rate ||
          excavationRateMap?.["9.1"]?.rate ||
          0
        ),
        amount: Number(split?.["9.1"]?.amount || 0),
      },
      "9.2": {
        qty: Number(split?.["9.2"]?.qty || 0),
        rate: Number(
          split?.["9.2"]?.rate ||
          excavationRateMap?.["9.2"]?.rate ||
          0
        ),
        amount: Number(split?.["9.2"]?.amount || 0),
      },
    };
  }

  // =========================
  // RCC
  // =========================
  if (type === "rcc") {
    // ✅ FIXED PATH - inside civil_quantities
    const split =
      resultData?.civil_quantities?.rcc_split || {};

    console.log("🔥 RCC SPLIT =", split);

    return {
      "10.1": {
        qty: Number(split?.["10.1"]?.qty || 0),
        rate: Number(
          split?.["10.1"]?.rate ||
          excavationRateMap?.["10.1"]?.rate ||
          0
        ),
        amount: Number(split?.["10.1"]?.amount || 0),
      },
      "10.2": {
        qty: Number(split?.["10.2"]?.qty || 0),
        rate: Number(
          split?.["10.2"]?.rate ||
          excavationRateMap?.["10.2"]?.rate ||
          0
        ),
        amount: Number(split?.["10.2"]?.amount || 0),
      },
    };
  }

  return {};
};

// ================================
// Tenant Authentication Helper
// ================================
function getTenantAuthHeaders(navigate) {
  const token = localStorage.getItem("tenant_token");
  const tenantId = localStorage.getItem("tenant_id");
  if (!token || !tenantId) {
    alert("Session expired. Please login again.");
    localStorage.removeItem("tenant_token");
    localStorage.removeItem("tenant_id");
    navigate("/tenant-login");
    throw new Error("AUTH_MISSING");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-Tenant-ID": tenantId,
  };
}

// ================================
// Safe formatter
// ================================
function safeToFixed(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return "0.00";
  return Number(value).toFixed(decimals);
}

// ================================
// PIPING ITEM MAPPER
// ================================
const mapPipingItem = (item, index) => {
  const sl_no = Number(item.SlNo ?? item.sl_no ?? index + 1);
  const type = String(item.Type ?? item.type ?? "").trim();
  const category = String(item.Category ?? item.category ?? "").toLowerCase().trim();
  const code = String(item.Code ?? item.code ?? "").trim();
  const description = String(item.Description ?? item.description ?? "").trim();
  const unit = String(item.Unit ?? item.unit ?? "").trim();

  let dia = null;
  if (item.Dia !== undefined && item.Dia !== null) dia = Number(item.Dia);
  else if (item.dia !== undefined && item.dia !== null) dia = Number(item.dia);

  let quantity = 0;
  if (item.Quantity !== undefined && item.Quantity !== null) quantity = Number(item.Quantity);
  else if (item.quantity !== undefined && item.quantity !== null) quantity = Number(item.quantity);

  let rate = 0;
  if (item.Rate !== undefined && item.Rate !== null) rate = Number(item.Rate);
  else if (item.rate !== undefined && item.rate !== null) rate = Number(item.rate);

  const supply_rate = rate;
  const installation_rate = rate * INSTALLATION_PERCENT;
  const supply_cost = quantity * supply_rate;
  const installation_cost = quantity * installation_rate;
  const total = supply_cost + installation_cost;

  let finalUnit = unit;
  if (!finalUnit || finalUnit === "") {
    if (category === "ball_valve" || category === "puddle_flange" || category === "valve" || category === "flange")
      finalUnit = "Nos";
    else if (category === "pipe" || category === "header") finalUnit = "Mtrs";
    else finalUnit = "Nos";
  }

  let finalDescription = description;
  if (!finalDescription || finalDescription === "") {
    if (category === "puddle_flange") finalDescription = `${dia || ""}mm Puddle Flange`;
    else if (category === "ball_valve") finalDescription = `${dia || ""}mm Ball Valve`;
    else if (category === "pipe") finalDescription = `${dia || ""}mm Pipe`;
    else if (category === "header") finalDescription = `${dia || ""}mm Header`;
    else finalDescription = type || "N/A";
  }

  return {
    sl_no, type, category, code, description: finalDescription, dia, unit: finalUnit,
    quantity, rate, supply_rate, installation_rate, supply_cost, installation_cost, total,
  };
};

// ================================
// 3D VISUALIZATION COMPONENT
// ================================
function PoolVisualization3D({ dimensions }) {
  const [viewMode, setViewMode] = useState("embed");
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const { length = 0, width = 0, depth = 0 } = dimensions || {};

  const build3DUrl = () => {
    const params = new URLSearchParams();
    if (length) params.set("length", length);
    if (width) params.set("width", width);
    if (depth) params.set("depth", depth);
    const query = params.toString();
    return query ? `${VISUALIZATION_3D_URL}?${query}` : VISUALIZATION_3D_URL;
  };
  const visualizationUrl = build3DUrl();

  const handleFullscreen = () => { setViewMode("fullscreen"); setShowDisclaimer(false); };
  const handleExitFullscreen = () => setViewMode("embed");
  const handleOpenExternal = () => window.open(visualizationUrl, "_blank", "noopener,noreferrer");

  if (viewMode === "fullscreen") {
    return (
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 9999, background: "#0a0a0f", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", background: "rgba(0,0,0,0.85)", borderBottom: "1px solid rgba(99,179,237,0.3)", flexShrink: 0, backdropFilter: "blur(10px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "20px" }}>🏊</span>
            <div>
              <div style={{ color: "#63b3ed", fontWeight: 700, fontSize: "15px", letterSpacing: "0.5px" }}>3D Pool Visualization</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>{length} × {width} × {depth} m &nbsp;|&nbsp; For reference only</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handleOpenExternal} style={{ padding: "7px 14px", background: "rgba(99,179,237,0.15)", border: "1px solid rgba(99,179,237,0.4)", borderRadius: "6px", color: "#63b3ed", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}><span>↗</span> Open in New Tab</button>
            <button onClick={handleExitFullscreen} style={{ padding: "7px 14px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "6px", color: "#f87171", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}><span>✕</span> Exit Fullscreen</button>
          </div>
        </div>
        <div style={{ flex: 1, position: "relative" }}>
          <iframe src={visualizationUrl} title="3D Pool Visualization - Full View" style={{ width: "100%", height: "100%", border: "none", display: "block" }} allow="accelerometer; autoplay; camera; fullscreen; gyroscope; xr-spatial-tracking" allowFullScreen />
        </div>
        <div style={{ padding: "8px 20px", background: "rgba(245,158,11,0.1)", borderTop: "1px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <span style={{ fontSize: "13px" }}>⚠️</span>
          <span style={{ color: "orange" }}>This 3D visualization is provided for conceptual reference only and does not represent the actual pool design, specifications, or final project outcome. Dimensions and materials may differ from the final build.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {showDisclaimer && (
        <div style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(251,191,36,0.05) 100%)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "10px", padding: "12px 16px", marginBottom: "14px", display: "flex", alignItems: "flex-start", gap: "10px", position: "relative" }}>
          <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "12px", color: "#f59e0b", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "4px" }}>Reference Only — Not Your Actual Project</div>
            <div style={{ fontSize: "12px", color: "rgba(238, 134, 6, 0.93)", lineHeight: 1.5 }}>
              This 3D visualization is a <strong style={{ color: "rgba(238, 134, 6, 0.93)" }}>general conceptual model</strong> generated for reference purposes only. It is <strong style={{ color: "rgba(238, 134, 6, 0.93)" }}>not linked</strong> to your actual pool project, architectural drawings, or engineering specifications. Final designs, structural details, and material selections will differ from what is shown. Do not use this model for construction planning or decision-making.
            </div>
          </div>
          <button onClick={() => setShowDisclaimer(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "16px", padding: "0", flexShrink: 0, lineHeight: 1 }} title="Dismiss">×</button>
        </div>
      )}
      <div style={{ position: "relative", width: "100%", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(99,179,237,0.2)", background: "#0d0d1a", boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,179,237,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "rgba(0,0,0,0.5)", borderBottom: "1px solid rgba(99,179,237,0.15)", backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#28c840" }} />
            <span style={{ marginLeft: "8px", color: "rgba(255,255,255,0.5)", fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.3px" }}>
              3d.intelithon.in
              {(length || width || depth) && <span style={{ color: "rgba(99,179,237,0.7)", marginLeft: "8px" }}>?length={length}&width={width}&depth={depth}</span>}
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleOpenExternal} title="Open in new tab" style={{ padding: "5px 10px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "5px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", transition: "all 0.2s" }} onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }} onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}>↗ New Tab</button>
            <button onClick={handleFullscreen} title="View fullscreen" style={{ padding: "5px 12px", background: "linear-gradient(135deg, rgba(99,179,237,0.2), rgba(66,153,225,0.2))", border: "1px solid rgba(99,179,237,0.35)", borderRadius: "5px", color: "#63b3ed", cursor: "pointer", fontSize: "11px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", transition: "all 0.2s" }} onMouseOver={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(99,179,237,0.35), rgba(66,153,225,0.35))"; }} onMouseOut={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(99,179,237,0.2), rgba(66,153,225,0.2))"; }}>⛶ Full View</button>
          </div>
        </div>
        {!iframeLoaded && !iframeError && (
          <div style={{ position: "absolute", top: "46px", left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0d0d1a", zIndex: 2, gap: "16px" }}>
            <div style={{ position: "relative", width: "60px", height: "60px" }}>
              <div style={{ width: "60px", height: "60px", border: "2px solid rgba(99,179,237,0.1)", borderTop: "2px solid #63b3ed", borderRadius: "50%", animation: "spin3d 1s linear infinite" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "22px" }}>🏊</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#63b3ed", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Loading 3D Visualization...</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>Preparing your pool model</div>
            </div>
            <style>{`@keyframes spin3d { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {iframeError && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "420px", gap: "16px", background: "#0d0d1a" }}>
            <span style={{ fontSize: "40px" }}>🔌</span>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#f87171", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Unable to load 3D visualization</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginBottom: "14px" }}>The visualization service may be unavailable</div>
              <button onClick={handleOpenExternal} style={{ padding: "8px 18px", background: "rgba(99,179,237,0.15)", border: "1px solid rgba(99,179,237,0.35)", borderRadius: "7px", color: "#63b3ed", cursor: "pointer", fontSize: "12px" }}>↗ Try Opening Directly</button>
            </div>
          </div>
        )}
        <iframe src={visualizationUrl} title="3D Pool Visualization" style={{ width: "100%", height: "460px", border: "none", display: "block", opacity: iframeLoaded ? 1 : 0, transition: "opacity 0.4s ease" }} onLoad={() => setIframeLoaded(true)} onError={() => setIframeError(true)} allow="accelerometer; autoplay; camera; fullscreen; gyroscope; xr-spatial-tracking" allowFullScreen sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-top-navigation" />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
        {[
          { icon: "📐", label: "Pool Dimensions", value: `${length} × ${width} × ${depth} m` },
          { icon: "🔄", label: "Interactive", value: "Drag to rotate" },
          { icon: "🔍", label: "Scroll", value: "Zoom in/out" },
          { icon: "⛶", label: "Full View", value: "Click button above" },
        ].map((chip, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
            <span>{chip.icon}</span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>{chip.label}:</span>
            <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{chip.value}</span>
          </div>
        ))}
      </div>
      {!showDisclaimer && (
        <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "7px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px" }}>⚠️</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}><strong style={{ color: "rgba(245,158,11,0.8)" }}>Disclaimer:</strong> This 3D model is for conceptual reference only — not a representation of your actual project.</span>
          <button onClick={() => setShowDisclaimer(true)} style={{ background: "none", border: "none", color: "rgba(99,179,237,0.6)", cursor: "pointer", fontSize: "10px", marginLeft: "auto", padding: 0, textDecoration: "underline" }}>Read more</button>
        </div>
      )}
    </div>
  );
}

// ================================
// PIPING TABLE COMPONENT
// ================================
function PipingTable({ title, data, formatCurrency }) {
  if (!data || data.length === 0) return null;
  const totalAmount = data.reduce((sum, item) => sum + item.total, 0);
  return (
    <div className="piping-table-section" style={{ marginBottom: "30px" }}>
      <h3 style={{ color: "#63b3ed", marginBottom: "15px", fontSize: "18px" }}>{title}</h3>
      <div className="table-container" style={{ overflowX: "auto" }}>
        <table className="excel-preview-table responsive-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(99,179,237,0.1)" }}>
              <th style={{ padding: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>Sl.No</th>
              <th style={{ padding: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>Description</th>
              <th style={{ padding: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>Dia (mm)</th>
              <th style={{ padding: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>Unit</th>
              <th style={{ padding: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>Quantity</th>
              <th style={{ padding: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>Supply Rate</th>
              <th style={{ padding: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>Installation Rate</th>
              <th style={{ padding: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>Supply Cost</th>
              <th style={{ padding: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>Installation Cost</th>
              <th style={{ padding: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "8px", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>{item.sl_no}</td>
                <td style={{ padding: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>{item.description}</td>
                <td style={{ padding: "8px", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>{item.dia ? `${item.dia} mm` : "-"}</td>
                <td style={{ padding: "8px", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>{item.unit}</td>
                <td style={{ padding: "8px", border: "1px solid rgba(255,255,255,0.1)", textAlign: "right" }}>{safeToFixed(item.quantity, 2)}</td>
                <td style={{ padding: "8px", border: "1px solid rgba(255,255,255,0.1)", textAlign: "right" }}>{formatCurrency(item.supply_rate)}</td>
                <td style={{ padding: "8px", border: "1px solid rgba(255,255,255,0.1)", textAlign: "right" }}>{formatCurrency(item.installation_rate)}</td>
                <td style={{ padding: "8px", border: "1px solid rgba(255,255,255,0.1)", textAlign: "right" }}>{formatCurrency(item.supply_cost)}</td>
                <td style={{ padding: "8px", border: "1px solid rgba(255,255,255,0.1)", textAlign: "right" }}>{formatCurrency(item.installation_cost)}</td>
                <td style={{ padding: "8px", border: "1px solid rgba(255,255,255,0.1)", textAlign: "right", fontWeight: "bold", color: "#63b3ed" }}>{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: "rgba(99,179,237,0.15)", fontWeight: "bold" }}>
              <td colSpan="9" style={{ padding: "10px", textAlign: "right", border: "1px solid rgba(255,255,255,0.1)" }}>Total:</td>
              <td style={{ padding: "10px", textAlign: "right", border: "1px solid rgba(255,255,255,0.1)", color: "#63b3ed" }}>{formatCurrency(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ================================
// MAIN RESULT PAGE COMPONENT
// ================================
function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Terrace detection
  const isTerracePool = String(
    location.state?.pool_type_construction ||
    resultData?.pool_type_construction ||
    "in_ground"
  ).trim().toLowerCase() === "terrace";

  // State variables
  const [resultData, setResultData] = useState(null);
  const [dimensions, setDimensions] = useState({ length: 0, width: 0, depth: 0 });
  const [poolType, setPoolType] = useState("infinity");
  const [constructionType, setConstructionType] = useState(location.state?.constructionType || "in_ground");
  const [mainPoolItems, setMainPoolItems] = useState([]);
  const [mepItems, setMepItems] = useState([]);
  const [balanceTankItems, setBalanceTankItems] = useState([]);
  const [excavationRates, setExcavationRates] = useState([]);
  const [civilQuantities, setCivilQuantities] = useState({});
  const [mepQuantities, setMepQuantities] = useState({});
  const [balanceTankQuantities, setBalanceTankQuantities] = useState({});
  const [pumpRoomQuantities, setPumpRoomQuantities] = useState({});
  const [pumpRoomItems, setPumpRoomItems] = useState([]);
  const [pumpRoomDimensions, setPumpRoomDimensions] = useState({});
  const [balanceTankDimensions, setBalanceTankDimensions] = useState({});
  const [includePumpRoom, setIncludePumpRoom] = useState(true);
  const [hasBalancingTank, setHasBalancingTank] = useState(true);
  const [pipingItems, setPipingItems] = useState([]);
  const [pumpRoomDistance, setPumpRoomDistance] = useState(15.0);
  const [dynamicRates, setDynamicRates] = useState({
    filter_rate: 0,
    pump_rate: 0,
    filter_description: "",
    pump_description: "",
    source: "no_match",
    exact_match: false,
    hp_overridden: false,
    original_hp: null,
    hp_from_db: null,
    database_updated: false,
    rate_source_note: "",
    hp: null,
    filter_dia: null,
  });
  const [includeHeatPump, setIncludeHeatPump] = useState(false);
  const [heatPumpSelection, setHeatPumpSelection] = useState(null);
  const [loadingMainPool, setLoadingMainPool] = useState(true);
  const [loadingMep, setLoadingMep] = useState(true);
  const [loadingBalanceTank, setLoadingBalanceTank] = useState(true);
  const [loadingMepCalculation, setLoadingMepCalculation] = useState(false);
  const [loadingCalc, setLoadingCalc] = useState(!location.state?.result);
  const [templateDescriptions, setTemplateDescriptions] = useState({});
  const [savedCalculations, setSavedCalculations] = useState([]);
  const [mainPoolRemarks, setMainPoolRemarks] = useState({});
  const [mepRemarks, setMepRemarks] = useState({});
  const [balanceTankRemarks, setBalanceTankRemarks] = useState({});
  const [pumpRoomRemarks, setPumpRoomRemarks] = useState({});
  const [exchangeRate, setExchangeRate] = useState(83.0);
  const [loadingExchangeRate, setLoadingExchangeRate] = useState(false);
  const [lastExchangeUpdate, setLastExchangeUpdate] = useState(null);
  const [exchangeRateError, setExchangeRateError] = useState(null);
  const [selectedAdvancedEquipment, setSelectedAdvancedEquipment] = useState([]);
  const [updateDatabase, setUpdateDatabase] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [activeTab, setActiveTab] = useState(1);
  const [imageModal, setImageModal] = useState({ show: false, src: "" });
  const [companyProfile, setCompanyProfile] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [currency, setCurrency] = useState("INR");
  const [columnVisibility, setColumnVisibility] = useState({
    image: true,
    unit: true,
    qty: true,
    fixedRate: true,
    remarks: true,
    code: true,
  });
  const [selectedTables, setSelectedTables] = useState({
    mainPool: true,
    balanceTank: true,
    pumpRoom: true,
    mep: true,
    piping: true,
  });
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  // Quantity field mappings
  const MAIN_POOL_QTY_FIELDS = {
    1: "EarthExcavation_QTY",
    2: "BackFilling_QTY",
    3: "Consolidation_QTY",
    4: "Disposal_QTY",
    5: "Soling_QTY",
    6: "plaincement_QTY",
    7: "BurntBrick_QTY",
    8: "steelreinforcement_QTY",
    9: "Shuttering_QTY",
    10: "shotcreting_QTY",
    11: "WaterProofing_QTY",
    12: "plastering_QTY",
    13: "Coping_QTY",
    14: "Tiling_QTY",
  };
  const BALANCE_TANK_QTY_FIELDS = {
    1: "EarthExcavation_QTY_1",
    2: "BackFilling_QTY_1",
    3: "Consolidation_QTY_1",
    4: "Disposal_QTY_1",
    5: "Soling_QTY_1",
    6: "plaincement_QTY_1",
    7: "BurntBrick_QTY_1",
    8: "steelreinforcement_QTY_1",
    9: "Shuttering_QTY_1",
    10: "shotcreting_QTY_1",
    11: "WaterProofing_QTY_1",
    12: "plastering_QTY_1",
  };
  const PUMP_ROOM_QTY_FIELDS = {
    1: "EarthExcavation_QTY_2",
    2: "BackFilling_QTY_2",
    3: "Consolidation_QTY_2",
    4: "Disposal_QTY_2",
    5: "Soling_QTY_2",
    6: "plaincement_QTY_2",
    7: "BurntBrick_QTY_2",
    8: "steelreinforcement_QTY_2",
    9: "Shuttering_QTY_2",
    10: "shotcreting_QTY_2",
    11: "WaterProofing_QTY_2",
    12: "plastering_QTY_2",
  };
  const MEP_QTY_FIELDS = {
    1: "Filter_QTY",
    2: "Glass_QTY",
    3: "Pressure_QTY",
    4: "Filter_Drain_QTY",
    5: "Mpv_QTY",
    6: "Mpv_connset_QTY",
    7: "Cpump_QTY",
    8: "Return_Inlets_QTY",
    9: "MainDrain_QTY",
    10: "Vaccume_Inlets_QTY",
    11: "Skimmer_QTY",
    12: "FloatValve_QTY",
    13: "GutterDrain_QTY",
    14: "Underwaterlight_QTY",
    15: "Transformer_QTY",
    16: "ControlPanel_QTY",
    17: "Cables_QTY",
    18: "Earthing_QTY",
    19: "ChlorinePump_QTY",
    20: "DosingTank_QTY",
    21: "Stirrer_QTY",
    22: "FloatingHose_QTY",
    23: "Brush_QTY",
    24: "Algae_QTY",
    25: "Net_QTY",
    26: "Handle_QTY",
    27: "VacuumHead_QTY",
    28: "TestKit_QTY",
    29: "CurvedBrush_QTY",
    30: "HeatPump_QTY",
  };

  const getSafeQty = (qtyKey, value) => {
    if (!isTerracePool) return Number(value ?? 0);
    const terraceZeroKeys = [
      "EarthExcavation_QTY", "BackFilling_QTY", "Consolidation_QTY", "Disposal_QTY", "Soling_QTY",
      "plaincement_QTY", "BurntBrick_QTY", "EarthExcavation_QTY_1", "BackFilling_QTY_1",
      "Consolidation_QTY_1", "Disposal_QTY_1", "Soling_QTY_1", "plaincement_QTY_1", "BurntBrick_QTY_1",
      "EarthExcavation_QTY_2", "BackFilling_QTY_2", "Consolidation_QTY_2", "Disposal_QTY_2",
      "Soling_QTY_2", "plaincement_QTY_2", "BurntBrick_QTY_2"
    ];
    if (terraceZeroKeys.includes(qtyKey)) return 0;
    return Number(value ?? 0);
  };

  const filteredMepItems = useMemo(() => {
    if (!Array.isArray(mepItems)) return [];
    const filtered = mepItems.filter((item) => Number(item.SlNo) < 35);
    return filtered.filter((item) => Number(item.SlNo) !== 11);
  }, [mepItems]);

  // ================================
  // EFFECTS
  // ================================
  useEffect(() => {
    if (location.state?.result) {
      console.log("📦 Loading result from location.state:", location.state.result);
      setResultData(location.state.result);
      if (location.state.result.length && location.state.result.width && location.state.result.depth) {
        setDimensions({
          length: location.state.result.length || 0,
          width: location.state.result.width || 0,
          depth: location.state.result.depth || 0,
        });
      }
    }
  }, [location.state]);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const companyCode = localStorage.getItem("tenant_company_code");
        if (!companyCode) return;
        const cachedProfile = localStorage.getItem("tenant_company_profile");
        if (cachedProfile) {
          try {
            const parsed = JSON.parse(cachedProfile);
            setCompanyProfile(parsed);
          } catch (e) { console.error("Error parsing cached company profile", e); }
        }
        const response = await fetch(`${API_BASE_URL}/admin/tenant/public-profile?company_code=${companyCode}`);
        const data = await response.json();
        if (data.success && data.data) {
          setCompanyProfile(data.data);
          localStorage.setItem("tenant_company_profile", JSON.stringify(data.data));
        } else {
          console.error("Failed to fetch company profile:", data);
        }
      } catch (err) {
        console.error("Company profile fetch error:", err);
      }
    };
    fetchCompanyProfile();
  }, []);

  const updateDimensionsFromData = (data) => {
    if (!data) return;
    let length = 0, width = 0, depth = 0;
    if (data.length !== undefined && data.length !== null) length = data.length;
    if (data.width !== undefined && data.width !== null) width = data.width;
    if (data.depth !== undefined && data.depth !== null) depth = data.depth;
    if (data.pool_dimensions) {
      if (data.pool_dimensions.length && !length) length = data.pool_dimensions.length;
      if (data.pool_dimensions.width && !width) width = data.pool_dimensions.width;
      if (data.pool_dimensions.depth && !depth) depth = data.pool_dimensions.depth;
    }
    if (!length && !width && !depth && data.dimensions) {
      if (typeof data.dimensions === "string") {
        const parts = data.dimensions.split("×").map((p) => parseFloat(p.trim()));
        if (parts.length >= 3) {
          length = parts[0] || 0;
          width = parts[1] || 0;
          depth = parts[2] || 0;
        }
      } else if (typeof data.dimensions === "object") {
        length = data.dimensions.length || 0;
        width = data.dimensions.width || 0;
        depth = data.dimensions.depth || 0;
      }
    }
    if (data.pool_length && !length) length = data.pool_length;
    if (data.pool_width && !width) width = data.pool_width;
    if (data.pool_depth && !depth) depth = data.pool_depth;
    setDimensions({ length, width, depth });
    console.log("✅ Dimensions updated from API:", { length, width, depth });
  };

  useEffect(() => {
    if (!resultData) return;
    console.log("📦 INITIAL LOAD - Updating all quantities from resultData:", resultData);
    updateDimensionsFromData(resultData);
    if (resultData.civil_quantities) setCivilQuantities(resultData.civil_quantities);
    if (resultData.mep_quantities || resultData.quantities) setMepQuantities(resultData.mep_quantities || resultData.quantities || {});
    if (resultData.balance_tank_quantities) setBalanceTankQuantities(resultData.balance_tank_quantities);
    if (resultData.pump_room_quantities) setPumpRoomQuantities(resultData.pump_room_quantities);
    if (resultData.pump_room_distance) setPumpRoomDistance(resultData.pump_room_distance);
    const dr = resultData.dynamic_rates || resultData.system_parameters || {};
if (Object.keys(dr).length > 0) {
  setDynamicRates({
    filter_rate:        Number(dr.filter_rate  ?? 0),
    pump_rate:          Number(dr.pump_rate    ?? 0),
    source:             dr.source || dr.rate_source || "no_match",
    exact_match:        dr.exact_match        || false,
    hp_overridden:      dr.hp_overridden       || false,
    original_hp:        dr.original_hp         || null,
    hp_from_db:         dr.hp_from_db          || null,
    hp:                 dr.hp                  ?? null,
    filter_dia:         dr.filter_dia ?? dr.filter_diameter ?? null,
    database_updated:   dr.database_updated    || false,
    filter_description: dr.filter_description  || "",
    pump_description:   dr.pump_description    || "",
  });
}
    if (resultData.pump_room_quantities) {
      setPumpRoomDimensions({
        length: resultData.pump_room_quantities.pr_length_2 || 0,
        width: resultData.pump_room_quantities.pr_width_2 || 0,
        height: resultData.pump_room_quantities.pr_height_2 || 0,
      });
    }
    if (resultData.balance_tank_quantities) {
      setBalanceTankDimensions({
        l1: resultData.balance_tank_quantities.l1 || 0,
        w1: resultData.balance_tank_quantities.w1 || 0,
        d1: resultData.balance_tank_quantities.d1 || 0,
      });
    }
  }, [resultData]);

  useEffect(() => {
    if (!resultData) return;
    let pipingData = null;
    if (resultData.piping_items && Array.isArray(resultData.piping_items)) pipingData = resultData.piping_items;
    else if (resultData.mep_details?.piping_items && Array.isArray(resultData.mep_details.piping_items)) pipingData = resultData.mep_details.piping_items;
    if (pipingData && pipingData.length > 0) {
      const mapped = pipingData.map((item, idx) => mapPipingItem(item, idx));
      setPipingItems(mapped);
    } else {
      setPipingItems([]);
    }
  }, [resultData]);

  const groupedPiping = useMemo(() => ({
    pipes: pipingItems.filter((i) => i.category === "pipe"),
    valves: pipingItems.filter((i) => i.category === "ball_valve"),
    flanges: pipingItems.filter((i) => i.category === "puddle_flange"),
  }), [pipingItems]);

  const pipingTotal = useMemo(() => pipingItems.reduce((sum, item) => sum + (item.total || 0), 0), [pipingItems]);

  const getSupplyRate = (item) => {
    if (Number(item.SlNo) === 1) return dynamicRates.filter_rate ?? 0;
    if (Number(item.SlNo) === 7) return dynamicRates.pump_rate ?? 0;
    return item.Rate ?? 0;
  };
  const getInstallationRate = (item) => getSupplyRate(item) * INSTALLATION_PERCENT;
  const getSupplyCost = (item, quantity) => quantity * getSupplyRate(item);
  const getInstallationCost = (item, quantity) => quantity * getInstallationRate(item);
  const getRowTotal = (item, quantity) => getSupplyCost(item, quantity) + getInstallationCost(item, quantity);

  // Load saved settings
  useEffect(() => {
    const savedVisibility = JSON.parse(localStorage.getItem("columnVisibility") || "null");
    if (savedVisibility) setColumnVisibility(savedVisibility);
    const savedTableSelection = JSON.parse(localStorage.getItem("selectedTables") || "null");
    if (savedTableSelection) setSelectedTables(savedTableSelection);
    const savedAdvanced = JSON.parse(localStorage.getItem("selectedAdvancedEquipment") || "[]");
    if (savedAdvanced) setSelectedAdvancedEquipment(savedAdvanced);
    const savedUpdateDB = localStorage.getItem("updateDatabase");
    if (savedUpdateDB !== null) setUpdateDatabase(savedUpdateDB === "true");
    const saved = JSON.parse(localStorage.getItem("saved_calculations") || "[]");
    setSavedCalculations(saved);
    const savedDistance = localStorage.getItem("pumpRoomDistance");
    if (savedDistance !== null) setPumpRoomDistance(parseFloat(savedDistance));
  }, []);

  useEffect(() => { localStorage.setItem("columnVisibility", JSON.stringify(columnVisibility)); }, [columnVisibility]);
  useEffect(() => { localStorage.setItem("selectedTables", JSON.stringify(selectedTables)); }, [selectedTables]);
  useEffect(() => { localStorage.setItem("selectedAdvancedEquipment", JSON.stringify(selectedAdvancedEquipment)); }, [selectedAdvancedEquipment]);
  useEffect(() => { localStorage.setItem("updateDatabase", updateDatabase.toString()); }, [updateDatabase]);
  useEffect(() => { localStorage.setItem("pumpRoomDistance", pumpRoomDistance.toString()); }, [pumpRoomDistance]);

  const toggleColumnVisibility = (columnName) => setColumnVisibility((prev) => ({ ...prev, [columnName]: !prev[columnName] }));
  const resetColumnVisibility = () => setColumnVisibility({ image: true, unit: true, qty: true, fixedRate: true, remarks: true, code: true });
  const toggleTableSelection = (tableName) => setSelectedTables((prev) => ({ ...prev, [tableName]: !prev[tableName] }));
  const selectAllTables = () => setSelectedTables({ mainPool: true, balanceTank: true, pumpRoom: true, mep: true, piping: true });
  const deselectAllTables = () => setSelectedTables({ mainPool: false, balanceTank: false, pumpRoom: false, mep: false, piping: false });
  const toggleDropdown = (name) => setOpenDropdown(openDropdown === name ? null : name);
  const handleAdvancedEquipmentToggle = (slNo) => setSelectedAdvancedEquipment((prev) => prev.includes(slNo) ? prev.filter((id) => id !== slNo) : [...prev, slNo]);
  const handleSelectAllAdvanced = () => {
    const advancedSlNos = [30, 31, 32, 33, 34];
    setSelectedAdvancedEquipment(prev => prev.length === advancedSlNos.length ? [] : advancedSlNos);
  };

  const fetchRealTimeExchangeRate = async () => {
    setLoadingExchangeRate(true);
    setExchangeRateError(null);
    try {
      const apiUrls = [
        "https://api.exchangerate-api.com/v4/latest/INR",
        "https://open.er-api.com/v6/latest/INR",
        "https://api.frankfurter.app/latest?from=INR",
      ];
      let rateFound = false;
      for (const apiUrl of apiUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(apiUrl, { method: "GET", signal: controller.signal, mode: "cors" });
          clearTimeout(timeoutId);
          if (!response.ok) continue;
          const data = await response.json();
          let usdRate = data.rates?.USD || data.rates?.usd || data.conversion_rates?.USD;
          if (usdRate && !isNaN(usdRate) && usdRate > 0) {
            setExchangeRate(1 / usdRate);
            setLastExchangeUpdate(new Date());
            setExchangeRateError(null);
            rateFound = true;
            break;
          }
        } catch (apiError) { continue; }
      }
      if (!rateFound) {
        setExchangeRate(83.0);
        setLastExchangeUpdate(new Date());
        setExchangeRateError("Using fallback rate");
      }
    } catch (error) {
      setExchangeRate(83.0);
      setLastExchangeUpdate(new Date());
      setExchangeRateError("Using fallback rate");
    } finally {
      setLoadingExchangeRate(false);
    }
  };

  const formatCurrency = (amount, curr = currency) => {
    if (curr === "USD") return `$${safeToFixed(amount / exchangeRate, 2)}`;
    return `₹${safeToFixed(amount)}`;
  };
  const getCurrencySymbol = () => currency === "USD" ? "$" : "₹";
  const handleCurrencyToggle = () => setCurrency(prev => prev === "INR" ? "USD" : "INR");

  // Fetch master data
  useEffect(() => {
    const fetchMainPoolItems = async () => {
      setLoadingMainPool(true);
      try {
        const headers = getTenantAuthHeaders(navigate);
        const response = await fetch(`${API_BASE_URL}/admin/main_pool`, { headers });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setMainPoolItems(Array.isArray(data) ? data : []);
      } catch (error) {
        if (error.message === "AUTH_MISSING") return;
        console.error("Error fetching main pool items:", error);
        setMainPoolItems([]);
      } finally {
        setLoadingMainPool(false);
      }
    };
    fetchMainPoolItems();
  }, [navigate]);

  useEffect(() => {
    const fetchMepItems = async () => {
      setLoadingMep(true);
      try {
        const headers = getTenantAuthHeaders(navigate);
        const response = await fetch(`${API_BASE_URL}/admin/mep`, { headers });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        let items = [];
        if (Array.isArray(data)) items = data;
        else if (data?.items) items = data.items;
        else if (data?.mep_items) items = data.mep_items;
        setMepItems(items);
      } catch (error) {
        if (error.message === "AUTH_MISSING") return;
        console.error("Error fetching MEP items:", error);
        setMepItems([]);
      } finally {
        setLoadingMep(false);
      }
    };
    fetchMepItems();
  }, [navigate]);

  useEffect(() => {
    const fetchBalanceTankItems = async () => {
      setLoadingBalanceTank(true);
      try {
        const headers = getTenantAuthHeaders(navigate);
        const response = await fetch(`${API_BASE_URL}/admin/balancetank`, { headers });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setBalanceTankItems(Array.isArray(data) ? data : []);
      } catch (error) {
        if (error.message === "AUTH_MISSING") return;
        console.error("Error fetching balance tank items:", error);
        setBalanceTankItems([]);
      } finally {
        setLoadingBalanceTank(false);
      }
    };
    fetchBalanceTankItems();
  }, [navigate]);

  useEffect(() => {
    const fetchExcavationRates = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/excavation-rates`, { headers: getTenantAuthHeaders(navigate) });
        const data = await response.json();
        console.log("✅ excavation rates:", data);
        if (Array.isArray(data)) setExcavationRates(data);
      } catch (err) {
        console.error("❌ excavation rates fetch failed", err);
      }
    };
    fetchExcavationRates();
  }, [navigate]);

  const excavationRateMap = useMemo(() => {
    const map = {};
    excavationRates.forEach((item) => {
      const code = String(item.code ?? item.Code ?? "").trim();
      if (code) map[code] = item;
    });
    console.log("✅ excavationRateMap", map);
    return map;
  }, [excavationRates]);

  const debugRateFlow = async () => {
    if (!dimensions.length || !dimensions.width || !dimensions.depth) {
      alert("Please enter dimensions first");
      return;
    }
    try {
      const headers = getTenantAuthHeaders(navigate);
      const response = await fetch(`${API_BASE_URL}/infinity/debug/rate-flow/${dimensions.length}/${dimensions.width}/${dimensions.depth}?turnover=4.5`, { headers });
      const data = await response.json();
      console.log("🔍 Rate Flow Debug:", data);
      setDebugInfo(data);
      setShowDebug(true);
    } catch (error) {
      console.error("Debug error:", error);
      alert("Debug failed: " + error.message);
    }
  };

  const applyQuantitiesFromResponse = (data) => {
    if (!data) return;
    if (data.civil_quantities && Object.keys(data.civil_quantities).length > 0) setCivilQuantities(data.civil_quantities);
    if (data.mep_quantities || data.quantities) setMepQuantities(data.mep_quantities || data.quantities || {});
    if (data.balance_tank_quantities && Object.keys(data.balance_tank_quantities).length > 0) setBalanceTankQuantities(data.balance_tank_quantities);
    if (data.pump_room_quantities && Object.keys(data.pump_room_quantities).length > 0) setPumpRoomQuantities(data.pump_room_quantities);
    const dr = data.dynamic_rates || data.system_parameters || {};
if (Object.keys(dr).length > 0) {
  setDynamicRates({
    filter_rate:        Number(dr.filter_rate  ?? 0),
    pump_rate:          Number(dr.pump_rate    ?? 0),
    source:             dr.source || dr.rate_source || "no_match",
    exact_match:        dr.exact_match        || false,
    hp_overridden:      dr.hp_overridden       || false,
    original_hp:        dr.original_hp         || null,
    hp_from_db:         dr.hp_from_db          || null,
    hp:                 dr.hp                  ?? null,
    filter_dia:         dr.filter_dia ?? dr.filter_diameter ?? null,
    database_updated:   dr.database_updated    || false,
    filter_description: dr.filter_description  || "",
    pump_description:   dr.pump_description    || "",
  });
}
    if (data.pump_room_quantities) {
      setPumpRoomDimensions({
        length: data.pump_room_quantities.pr_length_2 || 0,
        width: data.pump_room_quantities.pr_width_2 || 0,
        height: data.pump_room_quantities.pr_height_2 || 0,
      });
    }
    if (data.balance_tank_quantities) {
      setBalanceTankDimensions({
        l1: data.balance_tank_quantities.l1 || 0,
        w1: data.balance_tank_quantities.w1 || 0,
        d1: data.balance_tank_quantities.d1 || 0,
      });
    }
    if (data.heat_pump_selection) {
      setHeatPumpSelection(data.heat_pump_selection);
      setIncludeHeatPump(data.heat_pump_selection.available || false);
    }
    if (data.piping_items && Array.isArray(data.piping_items)) {
      const mapped = data.piping_items.map((item, idx) => mapPipingItem(item, idx));
      setPipingItems(mapped);
    } else {
      setPipingItems([]);
    }
  };

  const recalculate = async () => {
    if (!dimensions.length || !dimensions.width || !dimensions.depth) {
      console.warn("⚠️ Cannot recalculate: dimensions missing");
      return;
    }
    setLoadingMepCalculation(true);
    try {
      const headers = getTenantAuthHeaders(navigate);
      const url = `${API_BASE_URL}/infinity/calculations/mep/${dimensions.length}/${dimensions.width}/${dimensions.depth}?pool_type=infinity&auto_dosing=true&include_heat_pump=${includeHeatPump}&pool_location=${constructionType}&turnover=4.5&update_database=${updateDatabase}&pump_room_distance=${pumpRoomDistance}`;
      console.log(`🔄 Recalculating with pump_room_distance: ${pumpRoomDistance}`);
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (!data.success) {
        console.error("MEP calculation failed:", data);
        return;
      }
      setResultData(data);
      updateDimensionsFromData(data);
      applyQuantitiesFromResponse(data);
    } catch (error) {
      if (error.message === "AUTH_MISSING") return;
      console.error("❌ Recalculation error:", error);
    } finally {
      setLoadingMepCalculation(false);
    }
  };

  const fetchMepCalculation = async () => {
    if (!dimensions.length || !dimensions.width || !dimensions.depth) return;
    setLoadingMepCalculation(true);
    try {
      const headers = getTenantAuthHeaders(navigate);
      const url = `${API_BASE_URL}/infinity/calculations/mep/${dimensions.length}/${dimensions.width}/${dimensions.depth}?pool_type=infinity&auto_dosing=true&include_heat_pump=${includeHeatPump}&pool_location=${constructionType}&turnover=4.5&update_database=${updateDatabase}&pump_room_distance=${pumpRoomDistance}`;
      console.log(`📡 Fetching MEP calculation with pump_room_distance: ${pumpRoomDistance}`);
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (!data.success) {
        console.error("MEP calculation failed:", data);
        return;
      }
      setResultData(data);
      updateDimensionsFromData(data);
      applyQuantitiesFromResponse(data);
    } catch (error) {
      if (error.message === "AUTH_MISSING") return;
      console.error("Error fetching MEP calculation:", error);
    } finally {
      setLoadingMepCalculation(false);
    }
  };

  useEffect(() => {
    const fetchTemplateDescriptions = async () => {
      if (dimensions && dimensions.length && dimensions.width && dimensions.depth) {
        try {
          const headers = getTenantAuthHeaders(navigate);
          const response = await fetch(`${API_BASE_URL}/infinity/templates/${dimensions.length}/${dimensions.width}/${dimensions.depth}`, { headers });
          const data = await response.json();
          if (data.templates) setTemplateDescriptions(data.templates);
        } catch (error) {
          if (error.message === "AUTH_MISSING") return;
          console.error("Error fetching template descriptions:", error);
        }
      }
    };
    fetchTemplateDescriptions();
  }, [dimensions, navigate]);

  useEffect(() => {
    if (dimensions && dimensions.length && dimensions.width && dimensions.depth) {
      fetchMepCalculation();
    }
  }, [dimensions.length, dimensions.width, dimensions.depth, poolType, constructionType, includeHeatPump, updateDatabase, pumpRoomDistance]);

  useEffect(() => {
    fetchRealTimeExchangeRate();
    const interval = setInterval(fetchRealTimeExchangeRate, 3600000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown")) setOpenDropdown(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    console.log("🔥 FRONTEND CIVIL:", civilQuantities);
    console.log("🔥 EXCAVATION SPLIT (main pool only):", civilQuantities?.excavation_split);
    console.log("🔥 SHUTTERING SPLIT:", civilQuantities?.shuttering_split);
    console.log("🔥 RCC SPLIT:", civilQuantities?.rcc_split);
    console.log("🔥 BALANCE TANK (plain qty, no split):", balanceTankQuantities);
    console.log("🔥 PUMP ROOM (plain qty, no split):", pumpRoomQuantities);
  }, [civilQuantities, balanceTankQuantities, pumpRoomQuantities]);

  // Quantity getters
  const getCivilQuantity = (slNo) => {
    const numericSlNo = Number(slNo);
    const key = MAIN_POOL_QTY_FIELDS[numericSlNo];
    if (!key) return 0;
    let value = 0;
    if (civilQuantities && civilQuantities[key] !== undefined && civilQuantities[key] !== null) value = Number(civilQuantities[key]) || 0;
    else if (resultData?.civil_quantities && resultData.civil_quantities[key] !== undefined) value = Number(resultData.civil_quantities[key]) || 0;
    else if (resultData && resultData[key] !== undefined) value = Number(resultData[key]) || 0;
    return getSafeQty(key, value);
  };

  const getBalanceTankQuantity = (slNo) => {
    const numericSlNo = Number(slNo);
    const key = BALANCE_TANK_QTY_FIELDS[numericSlNo];
    if (!key) return 0;
    let value = 0;
    if (balanceTankQuantities && balanceTankQuantities[key] !== undefined && balanceTankQuantities[key] !== null) value = Number(balanceTankQuantities[key]) || 0;
    else if (resultData?.balance_tank_quantities && resultData.balance_tank_quantities[key] !== undefined) value = Number(resultData.balance_tank_quantities[key]) || 0;
    else if (resultData && resultData[key] !== undefined) value = Number(resultData[key]) || 0;
    return getSafeQty(key, value);
  };

  const getPumpRoomQuantity = (slNo) => {
    const numericSlNo = Number(slNo);
    const key = PUMP_ROOM_QTY_FIELDS[numericSlNo];
    if (!key) return 0;
    let value = 0;
    if (pumpRoomQuantities && pumpRoomQuantities[key] !== undefined && pumpRoomQuantities[key] !== null) value = Number(pumpRoomQuantities[key]) || 0;
    else if (resultData?.pump_room_quantities && resultData.pump_room_quantities[key] !== undefined) value = Number(resultData.pump_room_quantities[key]) || 0;
    else if (resultData && resultData[key] !== undefined) value = Number(resultData[key]) || 0;
    return getSafeQty(key, value);
  };

  const getMepQuantity = (slNo) => {
    const fieldName = MEP_QTY_FIELDS[slNo];
    if (!fieldName) return 0;
    if (slNo === 11) return 0;
    if (slNo >= 30 && slNo <= 34) return selectedAdvancedEquipment.includes(slNo) ? 1 : 0;
    if (slNo === 30 && !includeHeatPump) return 0;
    const value = mepQuantities?.[fieldName];
    return value !== undefined && value !== null ? Number(value) : 0;
  };

  // Compute split data using FIXED getSubRowData with correct paths
  const excavationSplit = getSubRowData(resultData, "excavation");
  const shutteringSplit = getSubRowData(resultData, "shuttering", excavationRateMap);
  const rccSplit = getSubRowData(resultData, "rcc", excavationRateMap);

  const mainPoolTotal = useMemo(() => {
    if (!mainPoolItems.length) return 0;
    let total = 0;
    mainPoolItems.forEach((item) => {
      const numericSlNo = Number(item.SlNo);
      if (!MAIN_POOL_QTY_FIELDS[numericSlNo]) return;
      if (numericSlNo === 1) {
        const amt1 = excavationSplit["1.1"]?.amount || 0;
        const amt2 = excavationSplit["1.2"]?.amount || 0;
        total += isTerracePool ? 0 : (amt1 + amt2);
      } else if (numericSlNo === 9) {
        const amt1 = shutteringSplit["9.1"]?.amount || 0;
        const amt2 = shutteringSplit["9.2"]?.amount || 0;
        total += (amt1 + amt2);
      } else if (numericSlNo === 10) {
        const amt1 = rccSplit["10.1"]?.amount || 0;
        const amt2 = rccSplit["10.2"]?.amount || 0;
        total += (amt1 + amt2);
      } else {
        total += getCivilQuantity(numericSlNo) * (item.Rate || 0);
      }
    });
    return total;
  }, [mainPoolItems, civilQuantities, isTerracePool, excavationSplit, shutteringSplit, rccSplit]);

  const balanceTankTotal = useMemo(() => {
    if (!mainPoolItems.length) return 0;
    let total = 0;
    mainPoolItems.forEach((item) => {
      const numericSlNo = Number(item.SlNo);
      if (BALANCE_TANK_QTY_FIELDS[numericSlNo]) {
        total += getBalanceTankQuantity(numericSlNo) * (item.Rate || 0);
      }
    });
    return total;
  }, [mainPoolItems, balanceTankQuantities]);

  const pumpRoomTotal = useMemo(() => {
    if (!includePumpRoom || !mainPoolItems.length) return 0;
    let total = 0;
    mainPoolItems.forEach((item) => {
      const numericSlNo = Number(item.SlNo);
      if (PUMP_ROOM_QTY_FIELDS[numericSlNo]) {
        total += getPumpRoomQuantity(numericSlNo) * (item.Rate || 0);
      }
    });
    return total;
  }, [mainPoolItems, pumpRoomQuantities, includePumpRoom]);

  const baseMepTotals = useMemo(() => {
    let totalSupply = 0, totalInstallation = 0;
    if (!filteredMepItems.length) return { totalSupply: 0, totalInstallation: 0, grand: 0 };
    filteredMepItems.forEach((item) => {
      const numericSlNo = Number(item.SlNo);
      if (numericSlNo >= 30 && numericSlNo <= 34) return;
      const quantity = getMepQuantity(numericSlNo);
      totalSupply += quantity * getSupplyRate(item);
      totalInstallation += quantity * getInstallationRate(item);
    });
    return { totalSupply, totalInstallation, grand: totalSupply + totalInstallation };
  }, [filteredMepItems, mepQuantities, dynamicRates, includeHeatPump]);

  const advancedEquipmentTotals = useMemo(() => {
    let totalSupply = 0, totalInstallation = 0;
    if (!filteredMepItems.length) return { totalSupply: 0, totalInstallation: 0, grand: 0 };
    filteredMepItems.forEach((item) => {
      const numericSlNo = Number(item.SlNo);
      if (numericSlNo >= 30 && numericSlNo <= 34 && selectedAdvancedEquipment.includes(numericSlNo)) {
        const quantity = 1;
        totalSupply += quantity * getSupplyRate(item);
        totalInstallation += quantity * getInstallationRate(item);
      }
    });
    return { totalSupply, totalInstallation, grand: totalSupply + totalInstallation };
  }, [filteredMepItems, selectedAdvancedEquipment, dynamicRates]);

  const totalMepCost = baseMepTotals.grand + advancedEquipmentTotals.grand + pipingTotal;
  const grandTotal = mainPoolTotal + balanceTankTotal + (includePumpRoom ? pumpRoomTotal : 0) + totalMepCost;
  const workingDays = useMemo(() => resultData?.timeline ? resultData.timeline.reduce((total, phase) => total + (phase.days || 0), 0) : 0, [resultData]);

  const resultDataForSave = {
    project_type: "infinity",
    main_pool_total: mainPoolTotal,
    balance_tank_total: balanceTankTotal,
    pump_room_total: pumpRoomTotal,
    mep_total: totalMepCost,
    piping_total: pipingTotal || 0,
    working_days: workingDays || 0,
    pool_specification: {
      length: dimensions?.length || 0,
      width: dimensions?.width || 0,
      depth: dimensions?.depth || 0,
      volume: resultData?.volume_m3 || dimensions?.length * dimensions?.width * dimensions?.depth || 0,
      flow_rate: resultData?.flowrate_m3_per_hr || 0,
    },
    grand_total: grandTotal,
  };

  // UI Components (CurrencyToggle, ConstructionTypeDisplay, etc.)
  const CurrencyToggle = () => (
    <div className="currency-toggle_1">
      <label className="currency-toggle-label_1">
        <span className="currency-label_1">Currency:</span>
        <div className="toggle-switch_1">
          <input type="checkbox" checked={currency === "USD"} onChange={handleCurrencyToggle} className="toggle-checkbox_1" />
          <span className="toggle-slider_1"><span className="toggle-inr_1">₹ INR</span><span className="toggle-usd_1">$ USD</span></span>
        </div>
      </label>
      <div className="exchange-rate-info_1">
        {loadingExchangeRate ? <div className="rate-loading_1">Loading exchange rate...</div> : (
          lastExchangeUpdate && (
            <div className="rate-meta_1">
              Updated: {lastExchangeUpdate.toLocaleTimeString()}
              {exchangeRateError && <span className="rate-error_1" title={exchangeRateError}>⚠️ Using fallback rate</span>}
            </div>
          )
        )}
      </div>
    </div>
  );

  const ConstructionTypeDisplay = () => (
    <div className="pool-type-display">
      <div className={`pool-type-badge ${constructionType}`}>{constructionType === "terrace" ? "🏢 Terrace Pool" : "⛰️ In-Ground Pool"}</div>
    </div>
  );

  const PumpRoomDistanceControl = () => (
    <div className="pump-distance-control" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 15px", background: "rgba(99,179,237,0.08)", borderRadius: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
      <label style={{ fontWeight: "600", color: "#63b3ed" }}>📏 Pump Room Distance:</label>
      <input type="number" min="1" step="1" value={pumpRoomDistance} onChange={(e) => setPumpRoomDistance(Number(e.target.value))} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ccc", width: "80px" }} />
      <span>meters</span>
      <button onClick={recalculate} disabled={loadingMepCalculation} style={{ padding: "6px 15px", background: "#007bff", color: "#fff", border: "none", borderRadius: "6px", cursor: loadingMepCalculation ? "not-allowed" : "pointer" }}>{loadingMepCalculation ? "Updating..." : "Update Distance"}</button>
      <div style={{ fontSize: "12px", color: "#888", marginLeft: "auto" }}>Affects pipe, valve, and flange quantities</div>
    </div>
  );

  const HPOverrideDisplay = () => dynamicRates.hp_overridden ? (
    <div className="hp-override-info"><span className="info-icon">ℹ️</span><span className="hp-override-text">Pump HP overridden from database: {dynamicRates.original_hp} HP → {dynamicRates.hp_from_db} HP</span></div>
  ) : null;

  const DatabaseUpdateToggle = () => (
    <div className="database-update-toggle">
      <label className="toggle-label"><input type="checkbox" checked={updateDatabase} onChange={(e) => setUpdateDatabase(e.target.checked)} className="toggle-checkbox" /><span className="toggle-text">{updateDatabase ? "✅ Save rates to mep_tenant_data" : "💾 Don't save rates"}</span></label>
      {dynamicRates.database_updated && <span className="update-success-badge">✓ Rates saved</span>}
    </div>
  );

  const DebugModal = () => showDebug && debugInfo ? (
    <div className="debug-modal-overlay" onClick={() => setShowDebug(false)}><div className="debug-modal-content" onClick={(e) => e.stopPropagation()}><h3>Rate Flow Debug Info</h3><button className="debug-modal-close" onClick={() => setShowDebug(false)}>×</button><div className="debug-section"><h4>Dimensions</h4><pre>{JSON.stringify(debugInfo.dimensions, null, 2)}</pre></div><div className="debug-section"><h4>Data.json Selection</h4><pre>{JSON.stringify(debugInfo.data_json, null, 2)}</pre></div><div className="debug-section"><h4>mep_rates Table</h4><p>Exact match found: {debugInfo.mep_rates?.exact_match_found ? "✅" : "❌"}</p><pre>{JSON.stringify(debugInfo.mep_rates, null, 2)}</pre></div><div className="debug-section"><h4>Diagnosis</h4><p><strong>Issue:</strong> {debugInfo.diagnosis?.issue}</p><p><strong>Next Steps:</strong></p><ul>{debugInfo.diagnosis?.next_steps?.map((step, i) => <li key={i}>{step}</li>)}</ul></div></div></div>
  ) : null;

  const ColumnVisibilityControls = () => (
    <div className="column-visibility-controls_1">
      <div className="visibility-header"><span className="visibility-title">Column Visibility:</span><button className="reset-visibility-btn" onClick={resetColumnVisibility}>Reset All</button></div>
      <div className="visibility-checkboxes">
        {["image", "unit", "qty", "fixedRate", "code", "remarks"].map((col) => (
          <label className="visibility-checkbox" key={col}><input type="checkbox" checked={columnVisibility[col]} onChange={() => toggleColumnVisibility(col)} /><span className="checkbox-label">{col === "fixedRate" ? "Fixed Rate" : col.charAt(0).toUpperCase() + col.slice(1)}</span></label>
        ))}
      </div>
    </div>
  );

  const TableSelectionControls = () => (
    <div className="table-selection-controls">
      <div className="selection-header"><span className="selection-title">Export Table Selection:</span><div className="selection-buttons"><button className="selection-btn select-all-btn" onClick={selectAllTables}>Select All</button><button className="selection-btn deselect-all-btn" onClick={deselectAllTables}>Deselect All</button></div></div>
      <div className="selection-checkboxes">
        {[
          { key: "mainPool", label: "Main Pool", count: "14 items" },
          { key: "balanceTank", label: "Balance Tank", count: "12 items" },
          { key: "pumpRoom", label: "Pump Room", count: "12 items" },
          { key: "mep", label: "MEP Systems", count: "33 items" },
          { key: "piping", label: "Piping System", count: `${pipingItems.length} items` },
        ].map(({ key, label, count }) => (
          <label className="selection-checkbox" key={key}><input type="checkbox" checked={selectedTables[key]} onChange={() => toggleTableSelection(key)} /><span className="checkbox-label">{label}</span><span className="table-count">({count})</span></label>
        ))}
      </div>
    </div>
  );

  const renderImage = (imageData) => {
    if (!imageData) return null;
    const getFullPath = () => {
      if (imageData.startsWith("data:image")) return imageData;
      if (imageData.startsWith("http") || imageData.startsWith("/")) return imageData;
      return `${API_BASE_URL}/admin/static/${imageData}`;
    };
    const fullPath = getFullPath();
    return <img src={fullPath} alt="Item" className="item-image" onClick={() => setImageModal({ show: true, src: fullPath })} onError={(e) => { e.target.style.display = "none"; }} />;
  };

  const getDescriptionWithTemplate = (item) => templateDescriptions[Number(item.SlNo)] || item.Description || "N/A";

  const calculateColSpan = () => {
    let span = 2;
    if (columnVisibility.code) span++;
    if (columnVisibility.image) span++;
    if (columnVisibility.unit) span++;
    if (columnVisibility.qty) span++;
    if (columnVisibility.fixedRate) span++;
    return span;
  };

  // Render functions
  const renderPipingTables = () => {
    if (!pipingItems.length) return <div className="piping-empty-message"><div className="info-message"><span className="info-icon">📏</span>No piping items calculated. Set pump room distance and click Update Distance.</div></div>;
    return (
      <div className="piping-tables-container">
        <div className="piping-header"><h3 className="piping-title">Piping System Calculation</h3><div className="piping-note"><span className="info-icon">ℹ️</span><span>Based on pump room distance: <strong>{pumpRoomDistance} meters</strong></span></div></div>
        <PipingTable title="Pipes" data={groupedPiping.pipes} formatCurrency={formatCurrency} />
        <PipingTable title="Ball Valves" data={groupedPiping.valves} formatCurrency={formatCurrency} />
        <PipingTable title="Puddle Flanges" data={groupedPiping.flanges} formatCurrency={formatCurrency} />
        <div className="piping-total-box"><div className="piping-total-label">Piping System Total:</div><div className="piping-total-amount">{formatCurrency(pipingTotal)}</div></div>
      </div>
    );
  };

  // ================================
  // RENDER MAIN POOL TABLE - FIXED SUBROWS WITH CORRECT PATHS & HIDDEN PARENT QTY/AMOUNT
  // ================================
  const renderMainPoolTable = () => {
    if (!mainPoolItems.length) return <div className="no-data-message">No main pool data available.</div>;
    const filteredItems = mainPoolItems.filter((item) => MAIN_POOL_QTY_FIELDS[Number(item.SlNo)]);
    const showSubRows = !isTerracePool;

    return (
      <div className="table-container">
        <table className="excel-preview-table responsive-table">
          <thead>
            <tr>
              <th>Sl.No</th>
              {columnVisibility.code && <th>Code</th>}
              <th>Description</th>
              {columnVisibility.image && <th>Image</th>}
              {columnVisibility.unit && <th>Unit</th>}
              {columnVisibility.qty && <th>QTY</th>}
              {columnVisibility.fixedRate && <th>Fixed Rate ({getCurrencySymbol()})</th>}
              <th>Amount ({getCurrencySymbol()})</th>
              {columnVisibility.remarks && <th>Remarks</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const numericSlNo = Number(item.SlNo);
              const quantity = getCivilQuantity(numericSlNo);
              const rate = item.Rate || 0;
              const amount = quantity * rate;
              const hasSubrows = ITEMS_WITH_SUBROWS.includes(numericSlNo);

              return (
                <React.Fragment key={item.SlNo}>
                  <tr style={numericSlNo === 1 ? { background: "rgba(99,179,237,0.05)" } : numericSlNo === 3 || numericSlNo === 4 ? { background: "rgba(34,197,94,0.04)" } : {}}>
                    <td data-label="Sl.No">{numericSlNo === 1 ? <strong>{item.SlNo}</strong> : item.SlNo}</td>
                    {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                    <td data-label="Description" className="description-cell">
                      {numericSlNo === 1 ? <strong>{getDescriptionWithTemplate(item)}</strong> : (
                        <>
                          {getDescriptionWithTemplate(item)}
                          {(numericSlNo === 3 || numericSlNo === 4) && <span style={{ marginLeft: "8px", fontSize: "10px", color: "#4ade80", fontStyle: "italic" }}>🆕 New</span>}
                        </>
                      )}
                    </td>
                    {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>}
                    {columnVisibility.unit && <td data-label="Unit">{numericSlNo === 1 ? <strong>{item.Unit || "CuM"}</strong> : item.Unit || ""}</td>}
                    {columnVisibility.qty && (
                      <td data-label="QTY" style={hasSubrows && !isTerracePool ? { color: "rgba(255,255,255,0.3)", fontStyle: "italic", textAlign: "center" } : {}}>
                        {/* ✅ HIDE PARENT QTY FOR ITEMS WITH SUBROWS */}
                        {hasSubrows && !isTerracePool ? "-" : safeToFixed(quantity, 3)}
                      </td>
                    )}
                    {columnVisibility.fixedRate && (
                      <td data-label="Fixed Rate" style={hasSubrows && !isTerracePool ? { color: "rgba(255,255,255,0.3)", fontStyle: "italic", textAlign: "center" } : {}}>
                        {hasSubrows && !isTerracePool ? "-" : formatCurrency(rate)}
                      </td>
                    )}
                    <td data-label="Amount" className="amount-cell" style={hasSubrows && !isTerracePool ? { color: "rgba(255,255,255,0.3)", fontStyle: "italic", textAlign: "center" } : {}}>
                      {/* ✅ HIDE PARENT AMOUNT FOR ITEMS WITH SUBROWS */}
                      {hasSubrows && !isTerracePool ? "-" : formatCurrency(amount)}
                    </td>
                    {columnVisibility.remarks && (
                      <td data-label="Remarks" className="remarks-cell"><textarea className="remarks-textbox" placeholder="Add remarks..." value={mainPoolRemarks[numericSlNo] || ""} onChange={(e) => setMainPoolRemarks((prev) => ({ ...prev, [numericSlNo]: e.target.value }))} rows="2" /></td>
                    )}
                  </tr>

                  {showSubRows && SUB_ROWS[numericSlNo]?.map((sub) => {
                    let subQty = 0, subRate = 0, subAmount = 0;
                    let subUnit = item.Unit || "";
                    let subDescription = sub.label;

                    if (sub.slNo === "1.1") {
                      subQty = excavationSplit["1.1"]?.qty || 0;
                      subRate = excavationSplit["1.1"]?.rate || 0;
                      subAmount = excavationSplit["1.1"]?.amount || 0;
                    } else if (sub.slNo === "1.2") {
                      subQty = excavationSplit["1.2"]?.qty || 0;
                      subRate = excavationSplit["1.2"]?.rate || 0;
                      subAmount = excavationSplit["1.2"]?.amount || 0;
                    } else if (sub.slNo === "9.1") {
                      subQty = shutteringSplit["9.1"]?.qty || 0;
                      subRate = shutteringSplit["9.1"]?.rate || 0;
                      subAmount = shutteringSplit["9.1"]?.amount || 0;
                    } else if (sub.slNo === "9.2") {
                      subQty = shutteringSplit["9.2"]?.qty || 0;
                      subRate = shutteringSplit["9.2"]?.rate || 0;
                      subAmount = shutteringSplit["9.2"]?.amount || 0;
                    } else if (sub.slNo === "10.1") {
                      subQty = rccSplit["10.1"]?.qty || 0;
                      subRate = rccSplit["10.1"]?.rate || 0;
                      subAmount = rccSplit["10.1"]?.amount || 0;
                    } else if (sub.slNo === "10.2") {
                      subQty = rccSplit["10.2"]?.qty || 0;
                      subRate = rccSplit["10.2"]?.rate || 0;
                      subAmount = rccSplit["10.2"]?.amount || 0;
                    }

                    const dbItem = excavationRateMap[sub.slNo];
                    if (dbItem) {
                      subDescription = dbItem.description ?? dbItem.Description ?? subDescription;
                      subUnit = dbItem.unit ?? dbItem.Unit ?? subUnit;
                    }

                    console.log("✅ SUB ROW:", sub.slNo, { qty: subQty, rate: subRate, amount: subAmount });

                    return (
                      <tr key={sub.slNo} className="sub-row">
                        <td data-label="Sl.No">{sub.slNo}</td>
                        {columnVisibility.code && <td data-label="Code">－</td>}
                        <td data-label="Description" style={{ paddingLeft: "30px" }}>{subDescription}</td>
                        {columnVisibility.image && <td data-label="Image">－</td>}
                        {columnVisibility.unit && <td data-label="Unit">{subUnit}</td>}
                        {columnVisibility.qty && <td data-label="QTY" style={{ textAlign: "right" }}>{safeToFixed(subQty, 3)}</td>}
                        {columnVisibility.fixedRate && <td data-label="Fixed Rate" style={{ textAlign: "right" }}>{formatCurrency(subRate)}</td>}
                        <td data-label="Amount" className="amount-cell" style={{ textAlign: "right" }}>{formatCurrency(subAmount)}</td>
                        {columnVisibility.remarks && <td data-label="Remarks">－</td>}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-total"><td colSpan={calculateColSpan()} style={{ textAlign: "right", fontWeight: "bold" }}>Total:</td><td className="amount-cell total-amount" style={{ fontWeight: "bold" }}>{formatCurrency(mainPoolTotal)}</td>{columnVisibility.remarks && <td></td>}</tr>
          </tfoot>
        </table>
      </div>
    );
  };

  // ================================
  // RENDER BALANCE TANK TABLE
  // ================================
  const renderBalanceTankTable = () => {
    const filteredItems = mainPoolItems.filter((item) => BALANCE_TANK_QTY_FIELDS[Number(item.SlNo)]);
    if (!filteredItems.length) return <div className="no-data-message">No balance tank data available.</div>;
    return (
      <div className="table-container">
        <table className="excel-preview-table responsive-table">
          <thead><tr><th>Sl.No</th>{columnVisibility.code && <th>Code</th>}<th>Description</th>{columnVisibility.image && <th>Image</th>}{columnVisibility.unit && <th>Unit</th>}{columnVisibility.qty && <th>QTY</th>}{columnVisibility.fixedRate && <th>Fixed Rate ({getCurrencySymbol()})</th>}<th>Amount ({getCurrencySymbol()})</th>{columnVisibility.remarks && <th>Remarks</th>}</tr></thead>
          <tbody>
            {filteredItems.map((item) => {
              const numericSlNo = Number(item.SlNo);
              const quantity = getBalanceTankQuantity(numericSlNo);
              const rate = item.Rate || 0;
              const amount = quantity * rate;
              const isNewItem = numericSlNo === 3 || numericSlNo === 4;
              return (
                <tr key={`bt-${item.SlNo}`} style={isNewItem ? { background: "rgba(34,197,94,0.04)" } : {}}>
                  <td data-label="Sl.No">{item.SlNo}</td>
                  {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                  <td data-label="Description" className="description-cell">{getDescriptionWithTemplate(item)}<div className="balance-tank-badge"><small>Balance Tank</small></div>{isNewItem && <span style={{ marginLeft: "8px", fontSize: "10px", color: "#4ade80", fontStyle: "italic" }}>🆕 New</span>}</td>
                  {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>}
                  {columnVisibility.unit && <td data-label="Unit">{item.Unit || "CuM"}</td>}
                  {columnVisibility.qty && <td data-label="QTY" className={quantity ? "quantity-filled" : ""} style={{ textAlign: "right" }}>{safeToFixed(quantity, 3)}</td>}
                  {columnVisibility.fixedRate && <td data-label="Fixed Rate" style={{ textAlign: "right" }}>{formatCurrency(rate)}</td>}
                  <td data-label="Amount" className="amount-cell" style={{ textAlign: "right" }}>{formatCurrency(amount)}</td>
                  {columnVisibility.remarks && <td data-label="Remarks" className="remarks-cell"><textarea className="remarks-textbox" placeholder="Add remarks..." value={balanceTankRemarks[numericSlNo] || ""} onChange={(e) => setBalanceTankRemarks((prev) => ({ ...prev, [numericSlNo]: e.target.value }))} rows="2" /></td>}
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr className="table-total"><td colSpan={calculateColSpan()} style={{ textAlign: "right", fontWeight: "bold" }}>Total:</td><td className="amount-cell total-amount" style={{ fontWeight: "bold" }}>{formatCurrency(balanceTankTotal)}</td>{columnVisibility.remarks && <td></td>}</tr></tfoot>
        </table>
      </div>
    );
  };

  const renderPumpRoomTable = () => {
    if (!includePumpRoom) return <div className="pump-room-disabled-message"><div className="info-message"><span className="info-icon">ℹ️</span>Pump Room calculation is currently disabled.</div></div>;
    const filteredItems = mainPoolItems.filter((item) => PUMP_ROOM_QTY_FIELDS[Number(item.SlNo)]);
    if (!filteredItems.length) return <div className="no-data-message">No pump room data available.</div>;
    return (
      <div className="table-container">
        <table className="excel-preview-table responsive-table">
          <thead><tr><th>Sl.No</th>{columnVisibility.code && <th>Code</th>}<th>Description</th>{columnVisibility.image && <th>Image</th>}{columnVisibility.unit && <th>Unit</th>}{columnVisibility.qty && <th>QTY</th>}{columnVisibility.fixedRate && <th>Fixed Rate ({getCurrencySymbol()})</th>}<th>Amount ({getCurrencySymbol()})</th>{columnVisibility.remarks && <th>Remarks</th>}</tr></thead>
          <tbody>
            {filteredItems.map((item) => {
              const numericSlNo = Number(item.SlNo);
              const quantity = getPumpRoomQuantity(numericSlNo);
              const rate = item.Rate || 0;
              const amount = quantity * rate;
              const isNewItem = numericSlNo === 3 || numericSlNo === 4;
              return (
                <tr key={`pr-${item.SlNo}`} style={isNewItem ? { background: "rgba(34,197,94,0.04)" } : {}}>
                  <td data-label="Sl.No">{item.SlNo}</td>
                  {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                  <td data-label="Description" className="description-cell">{getDescriptionWithTemplate(item)}<div className="pump-room-badge"><small>Pump Room</small></div>{isNewItem && <span style={{ marginLeft: "8px", fontSize: "10px", color: "#4ade80", fontStyle: "italic" }}>🆕 New</span>}</td>
                  {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>}
                  {columnVisibility.unit && <td data-label="Unit">{item.Unit || "CuM"}</td>}
                  {columnVisibility.qty && <td data-label="QTY" className={quantity ? "quantity-filled" : ""} style={{ textAlign: "right" }}>{safeToFixed(quantity, 3)}</td>}
                  {columnVisibility.fixedRate && <td data-label="Fixed Rate" style={{ textAlign: "right" }}>{formatCurrency(rate)}</td>}
                  <td data-label="Amount" className="amount-cell" style={{ textAlign: "right" }}>{formatCurrency(amount)}</td>
                  {columnVisibility.remarks && <td data-label="Remarks" className="remarks-cell"><textarea className="remarks-textbox" placeholder="Add remarks..." value={pumpRoomRemarks[numericSlNo] || ""} onChange={(e) => setPumpRoomRemarks((prev) => ({ ...prev, [numericSlNo]: e.target.value }))} rows="2" /></td>}
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr className="table-total"><td colSpan={calculateColSpan()} style={{ textAlign: "right", fontWeight: "bold" }}>Total:</td><td className="amount-cell total-amount" style={{ fontWeight: "bold" }}>{formatCurrency(pumpRoomTotal)}</td>{columnVisibility.remarks && <td></td>}</tr></tfoot>
        </table>
      </div>
    );
  };

  // ================================
  // RENDER MEP TABLE
  // ================================
  const renderMepTable = () => {
    if (!filteredMepItems.length) return <div className="no-data-message">No MEP data available.</div>;
    const baseItems = filteredMepItems.filter((item) => { const n = Number(item.SlNo); return n <= 29 && n !== 11; });
    const advancedItems = filteredMepItems.filter((item) => { const n = Number(item.SlNo); return n >= 30 && n <= 34; });
    const getVisibleColumnCount = () => {
      let count = 1;
      if (columnVisibility.code) count++;
      count++;
      if (columnVisibility.image) count++;
      if (columnVisibility.unit) count++;
      if (columnVisibility.qty) count++;
      if (columnVisibility.fixedRate) count += 2;
      count += 3;
      if (columnVisibility.remarks) count++;
      return count;
    };
    return (
      <>
        {dynamicRates.source === "no_match" && <div className="rate-warning">⚠️ No exact filter_dia match found in mep_rates table. Filter and Pump rates are set to 0.</div>}
        {dynamicRates.source === "mep_rates_closest" && <div className="rate-warning info">ℹ️ Using closest match from mep_rates table (not exact)</div>}
        {dynamicRates.hp_overridden && <div className="hp-override-banner"><span className="info-icon">🔄</span><span className="hp-override-text">Pump HP updated from database: {dynamicRates.original_hp} HP → {dynamicRates.hp_from_db} HP</span></div>}
        {dynamicRates.database_updated && <div className="database-update-success"><span className="success-icon">✅</span><span className="success-text">Rates successfully saved to mep_tenant_data</span></div>}
        <div className="infinity-notice-banner"><span className="info-icon">🌊</span><span className="notice-text">Infinity Pool: SlNo 11 is hidden (Skimmer not required)</span></div>
        <div className="removed-items-notice" style={{ background: "rgba(99,179,237,0.05)", border: "1px solid rgba(99,179,237,0.15)", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px" }}><p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.7)" }}><span style={{ color: "#63b3ed", fontWeight: 600 }}>📌 Note:</span> Items 35-38 (Pipes, Fittings, Valves &amp; Installation) have been removed. Piping items are calculated separately based on pump room distance.</p></div>

        <div className="mep-table-section">
          <h3 className="mep-table-title">Base MEP Systems (Items 1-29, excluding Skimmer)</h3>
          <div className="table-container">
            <table className="excel-preview-table responsive-table mep-table">
              <thead><tr><th rowSpan="2">Sl.No</th>{columnVisibility.code && <th rowSpan="2">Code</th>}<th rowSpan="2">Description</th>{columnVisibility.image && <th rowSpan="2">Image</th>}{columnVisibility.unit && <th rowSpan="2">Unit</th>}{columnVisibility.qty && <th rowSpan="2">QTY</th>}{columnVisibility.fixedRate && <th colSpan="2">Rate ({getCurrencySymbol()})</th>}<th colSpan="3">Amount ({getCurrencySymbol()})</th>{columnVisibility.remarks && <th rowSpan="2">Remarks</th>}</tr></thead>
              <tbody>
                {baseItems.map((item) => {
                  const numericSlNo = Number(item.SlNo);
                  const quantity = getMepQuantity(numericSlNo);
                  const supplyRate = getSupplyRate(item);
                  const installationRate = getInstallationRate(item);
                  const supplyCost = getSupplyCost(item, quantity);
                  const installationCost = getInstallationCost(item, quantity);
                  const totalAmount = getRowTotal(item, quantity);
                  const isZeroQuantity = quantity === 0;
                  return (
                    <tr key={item.SlNo} className={isZeroQuantity ? "zero-quantity-row" : ""}>
                      <td data-label="Sl.No">{item.SlNo}</td>
                      {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                      <td data-label="Description" className="description-cell">{item.Description || "N/A"}{(numericSlNo === 1 || numericSlNo === 7) && <div className="dynamic-rate-indicator"><small>{dynamicRates.source === "mep_rates_exact" ? "✅ Exact match from mep_rates table" : dynamicRates.source === "mep_rates_closest" ? "⚠️ Using closest match" : "❌ No match in mep_rates table - using 0"}</small></div>}</td>
                      {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                      {columnVisibility.qty && <td data-label="QTY" className={quantity ? "quantity-filled" : ""}>{quantity ? safeToFixed(quantity, 2) : "0.00"}</td>}
                      {columnVisibility.fixedRate && (<><td data-label="Supply Rate">{formatCurrency(supplyRate)}</td><td data-label="Installation Rate">{formatCurrency(installationRate)}</td></>)}
                      <td data-label="Supply Cost">{formatCurrency(supplyCost)}</td>
                      <td data-label="Installation Cost">{formatCurrency(installationCost)}</td>
                      <td data-label="Total Amount" className="amount-cell">{formatCurrency(totalAmount)}</td>
                      {columnVisibility.remarks && <td data-label="Remarks" className="remarks-cell"><textarea className="remarks-textbox" placeholder="Add remarks..." value={mepRemarks[numericSlNo] || ""} onChange={(e) => setMepRemarks((prev) => ({ ...prev, [numericSlNo]: e.target.value }))} rows="2" /></td>}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr className="table-subtotal"><td colSpan={getVisibleColumnCount() - 3} className="subtotal-label">Subtotal:</td><td className="amount-cell subtotal-value">{formatCurrency(baseMepTotals.totalSupply)}</td><td className="amount-cell subtotal-value">{formatCurrency(baseMepTotals.totalInstallation)}</td><td className="amount-cell subtotal-value">{formatCurrency(baseMepTotals.grand)}</td>{columnVisibility.remarks && <td className="subtotal-empty"></td>}</tr></tfoot>
            </table>
          </div>
        </div>

        <div className="mep-table-section">
          <div className="mep-table-header"><h3 className="mep-table-title">Advanced Equipment (Items 30-34) - Optional</h3><div className="advanced-equipment-controls"><button className="select-all-btn" onClick={handleSelectAllAdvanced}>{selectedAdvancedEquipment.length === 5 ? "Deselect All" : "Select All"}</button><span className="selection-info">Selected: {selectedAdvancedEquipment.length} of 5</span></div></div>
          <div className="table-container">
            <table className="excel-preview-table responsive-table mep-table">
              <thead><tr><th rowSpan="2">Select</th><th rowSpan="2">Sl.No</th>{columnVisibility.code && <th rowSpan="2">Code</th>}<th rowSpan="2">Description</th>{columnVisibility.image && <th rowSpan="2">Image</th>}{columnVisibility.unit && <th rowSpan="2">Unit</th>}{columnVisibility.qty && <th rowSpan="2">QTY</th>}{columnVisibility.fixedRate && <th colSpan="2">Rate ({getCurrencySymbol()})</th>}<th colSpan="3">Amount ({getCurrencySymbol()})</th>{columnVisibility.remarks && <th rowSpan="2">Remarks</th>}</tr></thead>
              <tbody>
                {advancedItems.map((item) => {
                  const numericSlNo = Number(item.SlNo);
                  const isSelected = selectedAdvancedEquipment.includes(numericSlNo);
                  const quantity = isSelected ? 1 : 0;
                  const supplyRate = getSupplyRate(item);
                  const installationRate = getInstallationRate(item);
                  const supplyCost = getSupplyCost(item, quantity);
                  const installationCost = getInstallationCost(item, quantity);
                  const totalAmount = getRowTotal(item, quantity);
                  return (
                    <tr key={item.SlNo} className={!isSelected ? "equipment-not-selected" : ""}>
                      <td><input type="checkbox" checked={isSelected} onChange={() => handleAdvancedEquipmentToggle(numericSlNo)} /></td>
                      <td data-label="Sl.No">{item.SlNo}</td>
                      {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                      <td data-label="Description" className="description-cell">{item.Description || "N/A"}</td>
                      {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                      {columnVisibility.qty && <td data-label="QTY">{isSelected ? "1" : "0"}</td>}
                      {columnVisibility.fixedRate && (<><td data-label="Supply Rate">{formatCurrency(supplyRate)}</td><td data-label="Installation Rate">{formatCurrency(installationRate)}</td></>)}
                      <td data-label="Supply Cost">{formatCurrency(supplyCost)}</td>
                      <td data-label="Installation Cost">{formatCurrency(installationCost)}</td>
                      <td data-label="Total Amount" className="amount-cell">{formatCurrency(totalAmount)}</td>
                      {columnVisibility.remarks && <td data-label="Remarks" className="remarks-cell"><textarea className="remarks-textbox" placeholder="Add remarks..." value={mepRemarks[numericSlNo] || ""} onChange={(e) => setMepRemarks((prev) => ({ ...prev, [numericSlNo]: e.target.value }))} rows="2" /></td>}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr className="table-subtotal"><td colSpan={getVisibleColumnCount() - 2} className="subtotal-label">Subtotal:</td><td className="amount-cell subtotal-value">{formatCurrency(advancedEquipmentTotals.totalSupply)}</td><td className="amount-cell subtotal-value">{formatCurrency(advancedEquipmentTotals.totalInstallation)}</td><td className="amount-cell subtotal-value">{formatCurrency(advancedEquipmentTotals.grand)}</td>{columnVisibility.remarks && <td className="subtotal-empty"></td>}</tr></tfoot>
            </table>
          </div>
          <div className="advanced-equipment-info"><div className="info-box"><span className="info-icon">💡</span><p><strong>Note:</strong> Advanced equipment items are optional. Only selected items will be included in the total cost.</p></div></div>
        </div>

        <div className="mep-grand-total"><div className="grand-total-box"><div className="total-breakdown"><div className="breakdown-item"><span className="breakdown-label">Base MEP (Items 1-29):</span><span className="breakdown-value">{formatCurrency(baseMepTotals.grand)}</span></div><div className="breakdown-item"><span className="breakdown-label">Advanced Equipment (Items 30-34):</span><span className="breakdown-value">{formatCurrency(advancedEquipmentTotals.grand)}</span></div><div className="breakdown-item"><span className="breakdown-label">Piping System:</span><span className="breakdown-value">{formatCurrency(pipingTotal)}</span></div><div className="breakdown-total"><span className="breakdown-label">Total MEP Cost:</span><span className="breakdown-value" style={{ color: "white" }}>{formatCurrency(totalMepCost)}</span></div></div></div></div>
      </>
    );
  };

  // Save calculation and PDF/Excel functions
  const saveCalculation = () => {
    try {
      const newCalc = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        dimensions: dimensions ? `${dimensions.length} × ${dimensions.width} × ${dimensions.depth} m` : "N/A",
        poolType, constructionType, totalCost: grandTotal, mainPoolCost: mainPoolTotal, balanceTankCost: balanceTankTotal,
        pumpRoomCost: includePumpRoom ? pumpRoomTotal : 0, mepCost: totalMepCost, pipingCost: pipingTotal,
        includePumpRoom, includeHeatPump, heatPumpSelection, selectedAdvancedEquipment, pumpRoomDistance,
        mainPoolRemarks, mepRemarks, balanceTankRemarks, pumpRoomRemarks, templateDescriptions,
        pumpRoomDimensions, balanceTankDimensions, exchangeRate, currency, columnVisibility, selectedTables, dynamicRates, updateDatabase,
      };
      const existing = JSON.parse(localStorage.getItem("saved_calculations") || "[]");
      const updated = [newCalc, ...existing].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
      localStorage.setItem("saved_calculations", JSON.stringify(updated));
      setSavedCalculations(updated);
      alert("✅ Calculation saved successfully!");
    } catch (error) { console.error("Error saving calculation:", error); alert("❌ Failed to save calculation. Please try again."); }
  };

  const downloadPDF = async () => {
    try {
      if (Object.values(selectedTables).filter(Boolean).length === 0) { alert("⚠️ Please select at least one table to export!"); return; }
      const safeMainPoolItems = Array.isArray(mainPoolItems) ? mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[Number(item.SlNo)]) : [];
      const safeBalanceTankItems = Array.isArray(balanceTankItems) ? balanceTankItems.filter(item => BALANCE_TANK_QTY_FIELDS[Number(item.SlNo)]) : [];
      const safeMepItems = Array.isArray(filteredMepItems) ? filteredMepItems : [];
      const safePumpRoomItems = Array.isArray(pumpRoomItems) ? pumpRoomItems : [];
      const safePipingItems = Array.isArray(pipingItems) ? pipingItems : [];
      const detectedPoolType = resultData?.pool_type || resultData?.system_parameters?.pool_type || poolType || "infinity";
      await generatePDF({
        resultData, poolType: detectedPoolType, constructionType, dimensions, pumpRoomDimensions,
        mainPoolItems: selectedTables.mainPool ? safeMainPoolItems : [], mainPoolTotal: Number(mainPoolTotal || 0), civilQuantities: civilQuantities || {}, mainPoolRemarks,
        hasBalancingTank: true, balanceTankItems: selectedTables.balanceTank ? safeBalanceTankItems : [], balanceTankQuantities: balanceTankQuantities || {},
        balanceTankTotal: Number(balanceTankTotal || 0), balanceTankRemarks,
        mepItems: selectedTables.mep ? safeMepItems : [], mepQuantities: mepQuantities || {}, mepTotal: Number(totalMepCost || 0), mepRemarks,
        includePumpRoom: selectedTables.pumpRoom ? includePumpRoom : false, pumpRoomItems: selectedTables.pumpRoom ? safePumpRoomItems : [],
        pumpRoomQuantities: pumpRoomQuantities || {}, pumpRoomTotal: selectedTables.pumpRoom ? Number(pumpRoomTotal || 0) : 0, pumpRoomRemarks,
        pipingItems: selectedTables.piping ? safePipingItems : [], pipingTotal: 0, pumpRoomDistance: pumpRoomDistance || 15,
        dynamicRates: dynamicRates || {}, templateDescriptions, selectedTables, columnVisibility, selectedAdvancedEquipment, currency, exchangeRate,
        companyProfile: companyProfile || {}, excavationSplit: civilQuantities?.excavation_split || {},
      });
    } catch (error) { console.error("❌ Infinity PDF Error:", error); alert("PDF generation failed. Check console for details."); }
  };

  const downloadExcel = async () => {
    if (Object.values(selectedTables).filter(Boolean).length === 0) { alert("⚠️ Please select at least one table to export!"); return; }
    await generateExcelReport(
      resultData,
      selectedTables.mainPool ? mainPoolItems.filter((item) => MAIN_POOL_QTY_FIELDS[Number(item.SlNo)]) : [],
      selectedTables.mep ? filteredMepItems : [],
      selectedTables.balanceTank || selectedTables.pumpRoom ? mainPoolItems : [],
      dimensions, totalMepCost, mainPoolTotal, selectedTables.balanceTank ? balanceTankTotal : 0,
      mainPoolRemarks, mepRemarks, balanceTankRemarks, templateDescriptions, dynamicRates, currency, exchangeRate,
      selectedTables.pumpRoom ? includePumpRoom : false, pumpRoomDimensions, constructionType, selectedAdvancedEquipment,
      columnVisibility, selectedTables, "infinity", selectedTables.pumpRoom ? pumpRoomTotal : 0, pumpRoomRemarks, pumpRoomQuantities,
      0, 0, 0, 0, null, selectedTables.piping ? pipingItems : []
    );
  };

  // Main return JSX
  return (
    <div className="result-page">
      <header className="header-section">
        <div className="page-header">
          <div className="header-content">
            <h1>Infinity Pool Calculation Results</h1>
            <p className="subtitle">A detailed summary of your Infinity Pool's construction, MEP components, and cost estimates<br /><span style={{ fontSize: "11px", color: "#4ade80" }}>🆕 Now with Backend-Driven Excavation Split (Main Pool only), Shuttering & RCC Subrows</span></p>
          </div>
          <div className="header-actions_1">
            <div className="dropdown">
              <button className="download-button" onClick={(e) => { e.stopPropagation(); toggleDropdown("download"); }}><span className="download-icon">⬇️</span> Download</button>
              <div className={`dropdown-menu ${openDropdown === "download" ? "show" : ""}`}>
                <button onClick={downloadPDF} className="dropdown-item"><span className="download-icon">📄</span> PDF Report</button>
                <ExcelDownloadButton resultData={resultData} mainPoolData={selectedTables.mainPool ? mainPoolItems.filter((item) => MAIN_POOL_QTY_FIELDS[Number(item.SlNo)]) : []} mepItems={selectedTables.mep ? filteredMepItems : []} dimensions={dimensions} totalMep={selectedTables.mep ? totalMepCost : 0} mainPoolTotal={selectedTables.mainPool ? mainPoolTotal : 0} balancingRows={selectedTables.balanceTank ? mainPoolItems.filter((item) => BALANCE_TANK_QTY_FIELDS[Number(item.SlNo)]) : []} balancingTankTotal={selectedTables.balanceTank ? balanceTankTotal : 0} poolType="infinity" hasBalancingTank={true} includePumpRoomExcel={selectedTables.pumpRoom ? includePumpRoom : false} mainPoolRemarks={mainPoolRemarks} balancingTankRemarks={balanceTankRemarks} mepRemarks={mepRemarks} pumpRoomRemarks={pumpRoomRemarks} templateDescriptions={templateDescriptions} totalMepWithFittings={selectedTables.mep ? totalMepCost : 0} currentRates={dynamicRates} currency={currency} exchangeRate={exchangeRate} mpvDetails={{ mpv_size: resultData?.mpv_size, filter_diameter: resultData?.filter_dia_mm, pump_hp: resultData?.hp }} pumpRoomDetails={{ pr_length_2: pumpRoomDimensions?.length, pr_width_2: pumpRoomDimensions?.width, pr_height_2: pumpRoomDimensions?.height, total_cost: selectedTables.pumpRoom ? pumpRoomTotal : 0 }} balancingTankDimensions={balanceTankDimensions} balancingTankQuantities={balanceTankQuantities} pumpRoomDimensions={pumpRoomDimensions} pumpRoomQuantities={pumpRoomQuantities} mepCalculationData={null} constructionType={constructionType} selectedAdvancedEquipment={selectedAdvancedEquipment} pumpRoomData={selectedTables.pumpRoom ? mainPoolItems.filter((item) => PUMP_ROOM_QTY_FIELDS[Number(item.SlNo)]) : []} pumpRoomTotal={selectedTables.pumpRoom && includePumpRoom ? pumpRoomTotal : 0} columnVisibility={columnVisibility} percentageAmount35={0} percentageAmount36={0} percentageAmount37={0} percentageAmount38={0} selectedTables={selectedTables} poolTypeForFilter="infinity" overflowGratingData={null} pipingItems={selectedTables.piping ? pipingItems : []} pipingTotal={selectedTables.piping ? pipingTotal : 0} civilQuantities={civilQuantities} mepQuantities={mepQuantities} balanceTankQuantities={balanceTankQuantities} dynamicRates={dynamicRates} balanceTankItems={mainPoolItems.filter((item) => BALANCE_TANK_QTY_FIELDS[Number(item.SlNo)])} hasGutter={false} pumpRoomDistance={pumpRoomDistance} companyProfile={companyProfile} className="dropdown-item"><span className="download-icon">📊</span> Excel Report</ExcelDownloadButton>
              </div>
            </div>
            <button className="download-button" onClick={() => setShowShareModal(true)}><span className="download-icon">🔗</span> Share</button>
            <div className="dropdown">
              <button className="download-button" onClick={(e) => { e.stopPropagation(); toggleDropdown("compare"); }}><span className="download-icon">⚖️</span> Compare</button>
              <div className={`dropdown-menu ${openDropdown === "compare" ? "show" : ""}`}><button onClick={() => setShowComparison(true)}>Compare Results</button></div>
            </div>
            <button className="download-button proforma-button" onClick={() => navigate("/proformainvoice", { state: { resultData, dimensions, mainPoolTotal, mepTotal: totalMepCost, pipingTotal, pumpRoomTotal: includePumpRoom ? pumpRoomTotal : 0, grandTotal, poolType: "infinity", hasBalancingTank: true, includePumpRoom, selectedAdvancedEquipment, includeHeatPump, companyProfile: null, currency, exchangeRate, dynamicRates, pumpRoomDistance, filteredMainPoolItems: mainPoolItems || [], filteredMepItems: filteredMepItems || [], pumpRoomItems: mainPoolItems || [], balanceTankItems: balanceTankItems || [], pipingItems: pipingItems || [], mainPoolRemarks, mepRemarks, pumpRoomRemarks, templateDescriptions, civilQuantities: civilQuantities || resultData, mepQuantities: mepQuantities || resultData, pumpRoomQuantities: pumpRoomQuantities || resultData, balanceTankQuantities: balanceTankQuantities || resultData, selectedTables, columnVisibility } })}><span className="download-icon">📄</span> Proforma Invoice (Infinity)</button>
            <button className="download-button" onClick={() => navigate("/delivery", { state: { result: resultData, dimensions, filteredMainPoolItems: mainPoolItems, filteredMepItems: mepItems, balanceTankItems, pumpRoomItems: selectedTables.pumpRoom ? balanceTankItems : [], pipingItems: selectedTables.piping ? pipingItems : [], pipingTotal: selectedTables.piping ? pipingTotal || 0 : 0, pumpRoomQuantities, pumpRoomDimensions, templateDescriptions, poolType: "infinity", hasBalancingTank: true, hasGutter: true, includePumpRoom: selectedTables.pumpRoom || false, selectedTables, selectedAdvancedEquipment, constructionType } })}>📦 Delivery Challan</button>
            <button className="download-button" onClick={() => navigate("/tax", { state: { result: resultData, dimensions, mainPoolData: selectedTables.mainPool ? mainPoolItems.filter((item) => MAIN_POOL_QTY_FIELDS[Number(item.SlNo)]) : [], mepItems: selectedTables.mep ? filteredMepItems : [], pumpRoomData: selectedTables.pumpRoom ? mainPoolItems.filter((item) => PUMP_ROOM_QTY_FIELDS[Number(item.SlNo)]) : [], mainPoolTotal: mainPoolTotal || 0, mepTotal: totalMepCost || 0, pumpRoomTotal: includePumpRoom ? pumpRoomTotal : 0, balanceTankTotal: balanceTankTotal || 0, templateDescriptions, poolType: "infinity", includePumpRoom, currency, exchangeRate, selectedTables, constructionType, finalTotal: grandTotal, selectedAdvancedEquipment, percentageAmounts: { item35: 0, item36: 0, item37: 0, item38: 0 }, overflowGratingData: null, pipingItems: selectedTables.piping ? pipingItems : [], pumpRoomDistance } })}><span className="button-icon">🧾</span> Tax Invoice</button>
          </div>
        </div>
        <div className="header-currency-toggle"><CurrencyToggle /><button className="download-button" onClick={() => setSaveOpen(true)} style={{ padding: "10px 20px", background: "#4CAF50", color: "#fff" }}><span className="download-icon">💾</span> Save Project</button></div>
      </header>

      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
      <div><ColumnVisibilityControls /></div>
      <div className="global-table-selection"><TableSelectionControls /></div>

      <nav className="tab-navigation">
        <div className="tab-buttons">
          <button className={`tab-button ${activeTab === 1 ? "active" : ""}`} onClick={() => setActiveTab(1)}><span className="tab-icon">📊</span><span className="tab-label">Calculation &amp; 3D</span></button>
          <button className={`tab-button ${activeTab === 4 ? "active" : ""}`} onClick={() => setActiveTab(4)}><span className="tab-icon">🔧</span><span className="tab-label">MEP Amount (33 items + Piping)</span></button>
          <button className={`tab-button ${activeTab === 2 ? "active" : ""}`} onClick={() => setActiveTab(2)}><span className="tab-icon">🏊</span><span className="tab-label">Civil work of Main Pool (14 items)</span></button>
          <button className={`tab-button ${activeTab === 6 ? "active" : ""}`} onClick={() => setActiveTab(6)}><span className="tab-icon">⚖️</span><span className="tab-label">Civil work of Balance Tank (12 items)</span></button>
          <button className={`tab-button ${activeTab === 5 ? "active" : ""}`} onClick={() => setActiveTab(5)}><span className="tab-icon">⚙️</span><span className="tab-label">Civil works of Pump Room (12 items)</span></button>
          <button className={`tab-button ${activeTab === "piping" ? "active" : ""}`} onClick={() => setActiveTab("piping")}><span className="tab-icon">📏</span><span className="tab-label">Piping System</span></button>
          <button className={`tab-button ${activeTab === "total" ? "active" : ""}`} onClick={() => setActiveTab("total")}><span className="tab-icon">💰</span><span className="tab-label">Total Cost</span></button>
          <button className={`tab-button ${activeTab === "visualization" ? "active" : ""}`} onClick={() => setActiveTab("visualization")}><span className="tab-icon">📈</span><span className="tab-label">Visualization</span></button>
          <button className={`tab-button ${activeTab === 3 ? "active" : ""}`} onClick={() => setActiveTab(3)}><span className="tab-icon">📅</span><span className="tab-label">Timeline</span></button>
        </div>
      </nav>

      <main className="tab-content-container">
        {activeTab === 1 && (
  <section className="tab-content active" aria-live="polite">
    {/* ======================================== */}
    {/* LOADING STATE */}
    {/* ======================================== */}
    {loadingCalc ? (
      <div className="loading-spinner">
        <div className="spinner-icon">⏳</div>
        <p className="spinner-text">Loading calculation data...</p>
      </div>
    ) : !resultData ? (
      <div className="error-message">
        <div className="error-icon">⚠️</div>
        <p className="error-text">No calculation data available.</p>
        <p className="error-subtext">Please run a calculation first.</p>
      </div>
    ) : (
      (() => {
        // ========================================
        // SAFE VALUES - Extracted once, no re-renders
        // ========================================
        const dimensionsText =
          dimensions?.length && dimensions?.width && dimensions?.depth
            ? `${dimensions.length} × ${dimensions.width} × ${dimensions.depth} m`
            : resultData?.dimensions || "N/A";

        const volume =
          resultData?.volume_m3 ||
          resultData?.pool_volume ||
          resultData?.volume ||
          0;

        const liters = resultData?.liters || 0;

        const floorArea =
          resultData?.floor_area_m2 ||
          resultData?.floor_area ||
          0;

        const wallArea =
          resultData?.wall_area_m2 ||
          resultData?.wall_area ||
          0;

        const turnover =
          resultData?.turnover_hours ||
          resultData?.turnover ||
          4.5;

        const flowRate =
          resultData?.flowrate_m3_per_hr ||
          resultData?.flow_rate ||
          0;

        // ========================================
        // FILTER DIAMETER FIX - No flicker, stable value
        // ========================================
        const filterDiameter =
          resultData?.filter_dia_mm ??
          resultData?.filter_details?.filter_dia_mm ??
          resultData?.system_parameters?.filter_diameter ??
          dynamicRates?.filter_dia ??
          location?.state?.result?.filter_dia_mm ??
          null;

        // ========================================
        // PUMP HP FIX - No flicker, stable value
        // ========================================
        const pumpHP =
          resultData?.hp ??
          resultData?.pump_hp ??
          resultData?.filter_details?.hp ??
          resultData?.system_parameters?.pump_hp ??
          dynamicRates?.hp ??
          location?.state?.result?.hp ??
          null;

        // ========================================
        // MPV SIZE - Safe fallback
        // ========================================
        const mpvSize =
          resultData?.mpv_size ??
          resultData?.filter_details?.mpv_size ??
          resultData?.equipment_specifications?.mpv_size ??
          "N/A";

        // ========================================
        // HEAT PUMP INFO - If applicable
        // ========================================
        const heatPumpInfo =
          resultData?.heat_pump_selection ??
          heatPumpSelection ??
          null;

        return (
          <>
            {/* ======================================== */}
            {/* HEADER */}
            {/* ======================================== */}
            <div className="section-header">
              <h2 className="section-title">Pool Specifications</h2>
              <div className="header-controls">
                <ConstructionTypeDisplay />
              </div>
            </div>

            {/* ======================================== */}
            {/* CONTROLS & NOTIFICATIONS */}
            {/* ======================================== */}
            <div className="specs-controls">
              <DatabaseUpdateToggle />
            </div>

            <HPOverrideDisplay />

            {/* ======================================== */}
            {/* RATE SOURCE DISPLAY */}
            {/* ======================================== */}
            {dynamicRates?.source && dynamicRates.source !== "no_match" && (
              <div className="rate-source-display">
                <span className="rate-source-label">Filter Rate Source:</span>
                <span className={`rate-source-value ${dynamicRates.source}`}>
                  {dynamicRates.source === "mep_rates_exact"
                    ? "✅ Exact match from mep_rates table"
                    : dynamicRates.source === "mep_rates_closest"
                    ? "⚠️ Closest match from mep_rates table"
                    : dynamicRates.source === "default_fallback"
                    ? "ℹ️ Using default fallback rates"
                    : dynamicRates.source}
                </span>
              </div>
            )}

            {/* ======================================== */}
            {/* MAIN CONTENT - SPECS + 3D */}
            {/* ======================================== */}
            <div className="specs-container-2">
              {/* ======================================== */}
              {/* SPECIFICATIONS TABLE */}
              {/* ======================================== */}
              <div className="specs-table-container">
                <div className="specs-table-wrapper">
                  <table className="excel-preview-table" aria-label="Pool Specifications">
                    <tbody>
                      {/* Dimensions */}
                      <tr>
                        <td className="spec-label">
                          <strong>Dimensions</strong>
                        </td>
                        <td className="spec-value">{dimensionsText}</td>
                      </tr>

                      {/* Volume */}
                      <tr>
                        <td className="spec-label">
                          <strong>Volume</strong>
                        </td>
                        <td className="spec-value">
                          {safeToFixed(volume)} m³ ({safeToFixed(liters, 0)} L)
                        </td>
                      </tr>

                      {/* Floor Area */}
                      <tr>
                        <td className="spec-label">
                          <strong>Floor Area</strong>
                        </td>
                        <td className="spec-value">
                          {safeToFixed(floorArea)} m²
                        </td>
                      </tr>

                      {/* Wall Area */}
                      <tr>
                        <td className="spec-label">
                          <strong>Wall Area</strong>
                        </td>
                        <td className="spec-value">
                          {safeToFixed(wallArea)} m²
                        </td>
                      </tr>

                      {/* Turnover Time */}
                      <tr>
                        <td className="spec-label">
                          <strong>Turnover Time</strong>
                        </td>
                        <td className="spec-value">
                          {safeToFixed(turnover, 1)} hours
                        </td>
                      </tr>

                      {/* Flow Rate */}
                      <tr>
                        <td className="spec-label">
                          <strong>Flow Rate</strong>
                        </td>
                        <td className="spec-value">
                          {safeToFixed(flowRate)} m³/hr
                        </td>
                      </tr>

                      {/* ======================================== */}
                      {/* FILTER DIAMETER - STABLE, NO FLICKER */}
                      {/* ======================================== */}
                      <tr>
                        <td className="spec-label">
                          <strong>Filter Diameter</strong>
                        </td>
                        <td className="spec-value">
                          {filterDiameter !== null && filterDiameter !== undefined ? (
                            <span className="spec-value-data">
                              {filterDiameter} mm
                            </span>
                          ) : (
                            <span className="spec-value-loading">
                              Calculating...
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* ======================================== */}
                      {/* PUMP CAPACITY - STABLE, NO FLICKER */}
                      {/* ======================================== */}
                      <tr>
                        <td className="spec-label">
                          <strong>Pump Capacity</strong>
                        </td>
                        <td className="spec-value">
                          {pumpHP !== null && pumpHP !== undefined ? (
                            <span className="spec-value-data">
                              {pumpHP} HP
                              {dynamicRates?.hp_overridden && (
                                <span
                                  className="hp-override-indicator"
                                  title={`Originally: ${dynamicRates.original_hp} HP`}
                                >
                                  {" "}(from DB)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="spec-value-loading">
                              Calculating...
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* MPV Size */}
                      <tr>
                        <td className="spec-label">
                          <strong>MPV Size</strong>
                        </td>
                        <td className="spec-value">{mpvSize}</td>
                      </tr>

                      {/* Pool Type */}
                      <tr>
                        <td className="spec-label">
                          <strong>Pool Type</strong>
                        </td>
                        <td className="spec-value">
                          <span className="pool-type-badge-small">
                            🌊 Infinity Pool
                          </span>
                        </td>
                      </tr>

                      {/* Construction Type */}
                      <tr>
                        <td className="spec-label">
                          <strong>Construction Type</strong>
                        </td>
                        <td className="spec-value">
                          {constructionType === "terrace"
                            ? "🏢 Terrace"
                            : "⛰️ In-Ground"}
                        </td>
                      </tr>

                      {/* Pump Room Distance */}
                      <tr>
                        <td className="spec-label">
                          <strong>Pump Room Distance</strong>
                        </td>
                        <td className="spec-value">{pumpRoomDistance} m</td>
                      </tr>

                      {/* Heat Pump - Conditional */}
                      {includeHeatPump && heatPumpInfo && (
                        <tr>
                          <td className="spec-label">
                            <strong>Heat Pump</strong>
                          </td>
                          <td className="spec-value">
                            {heatPumpInfo.model || heatPumpInfo.name || "Included"}
                            {heatPumpInfo.capacity && ` (${heatPumpInfo.capacity} kW)`}
                          </td>
                        </tr>
                      )}

                      {/* Advanced Equipment Summary */}
                      {selectedAdvancedEquipment.length > 0 && (
                        <tr>
                          <td className="spec-label">
                            <strong>Advanced Equipment</strong>
                          </td>
                          <td className="spec-value">
                            {selectedAdvancedEquipment.length} item(s) selected
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ======================================== */}
              {/* 3D VISUALIZATION */}
              {/* ======================================== */}
              <div
                className="preview-section"
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  className="preview-header"
                  style={{
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <h3
                    className="preview-title"
                    style={{ margin: 0 }}
                  >
                    3D Pool Visualization
                  </h3>

                  <div className="preview-status">
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "3px 10px",
                        background: "rgba(34,197,94,0.1)",
                        border: "1px solid rgba(34,197,94,0.3)",
                        borderRadius: "20px",
                        fontSize: "11px",
                        color: "#4ade80",
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#4ade80",
                          display: "inline-block",
                          animation: "pulse3d 2s infinite",
                        }}
                      />
                      Live
                    </span>
                    <style>
                      {`
                        @keyframes pulse3d {
                          0%, 100% { opacity: 1; }
                          50% { opacity: 0.4; }
                        }
                      `}
                    </style>
                  </div>
                </div>

                <PoolVisualization3D dimensions={dimensions} />
              </div>
            </div>

            {/* ======================================== */}
            {/* ADDITIONAL INFO CARDS */}
            {/* ======================================== */}
            <div className="specs-info-cards" style={{ marginTop: "20px" }}>
              <div className="info-card">
                <div className="info-card-icon">💡</div>
                <div className="info-card-content">
                  <strong>Calculation Method</strong>
                  <p>
                    Turnover-based flow rate calculation with {safeToFixed(turnover, 1)} hour
                    turnover time.
                  </p>
                </div>
              </div>

              <div className="info-card">
                <div className="info-card-icon">📊</div>
                <div className="info-card-content">
                  <strong>Rate Source</strong>
                  <p>
                    {dynamicRates?.source === "mep_rates_exact"
                      ? "Rates fetched from mep_rates table (exact match)"
                      : dynamicRates?.source === "mep_rates_closest"
                      ? "Rates from closest mep_rates match"
                      : "Using default fallback rates"}
                  </p>
                </div>
              </div>

              {dynamicRates?.database_updated && (
                <div className="info-card success-card">
                  <div className="info-card-icon">✅</div>
                  <div className="info-card-content">
                    <strong>Database Updated</strong>
                    <p>Rates successfully saved to mep_tenant_data</p>
                  </div>
                </div>
              )}
            </div>
          </>
        );
      })()
    )}
  </section>
)}
        {activeTab === 2 && (
          <section className="tab-content active">
            <div className="section-header"><div className="table-selection-indicator"><span className={`selection-status ${selectedTables.mainPool ? "selected" : "not-selected"}`}>{selectedTables.mainPool ? "✓ Selected for export" : "✗ Not selected for export"}</span></div><h2>Civil Works - Main Pool (14 Items with Subrows)</h2><div className="header-controls"><div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(mainPoolTotal)}</span></div></div></div>
            {loadingMainPool ? <div className="loading-spinner">Loading data...</div> : <> {renderMainPoolTable()} <div className="boq-note"><div><strong>Note:</strong> The estimates provided are based on current industry standards and average material costs. Actual costs may vary depending on location, specific material selections, and site conditions.<span className="small"> Variations of ±10–15% from the estimate are common.</span>{constructionType === "terrace" && <div className="terrace-note"><strong>Terrace Pool Note:</strong> This configuration includes structural works only and excludes excavation, soling, and backfilling items.</div>}<div className="new-items-note" style={{ marginTop: "8px", color: "#4ade80" }}><strong>🆕 New Items:</strong> SlNo 3 (Consolidation) = L × W | SlNo 4 (Disposal) = Excavation - Backfill</div><div className="excavation-split-note" style={{ marginTop: "8px", color: "#63b3ed" }}><strong>✅ Subrows Fixed:</strong> Excavation (1.1, 1.2), Shuttering (9.1, 9.2), and RCC/Shotcreting (10.1, 10.2) now correctly reading from resultData.civil_quantities. Parent row qty/amount hidden for items with subrows.{isTerracePool && <span style={{ display: "block", color: "#f59e0b" }}>⚠️ Terrace pools: Sub-rows are hidden and quantities are set to 0.</span>}</div></div></div> </>}
          </section>
        )}
        {activeTab === 6 && (
          <section className="tab-content active">
            <div className="section-header"><div className="table-selection-indicator"><span className={`selection-status ${selectedTables.balanceTank ? "selected" : "not-selected"}`}>{selectedTables.balanceTank ? "✓ Selected for export" : "✗ Not selected for export"}</span></div><h2>Civil Works - Balance Tank (12 Items)</h2><div className="header-controls"><div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(balanceTankTotal)}</span></div></div></div>
            {loadingBalanceTank ? <div className="loading-spinner">Loading data...</div> : <> {renderBalanceTankTable()} <div className="boq-note"><div><strong>Note:</strong> Balance tank quantities are calculated as 7.5% of main pool quantities for in-ground pools. For terrace pools, balance tank is not required (all quantities are 0).<span className="small"> Balance Tank includes 12 items only (no Coping, no Tiling).</span><div className="excavation-split-note" style={{ marginTop: "8px", color: "#63b3ed" }}><strong>Note:</strong> Balance Tank SlNo 1 uses a plain single quantity (EarthExcavation_QTY_1) — no excavation sub-rows. Only the Main Pool has sub-rows.</div></div></div> </>}
          </section>
        )}
        {activeTab === 5 && (
          <section className="tab-content active">
            <div className="section-header"><div className="table-selection-indicator"><span className={`selection-status ${selectedTables.pumpRoom ? "selected" : "not-selected"}`}>{selectedTables.pumpRoom ? "✓ Selected for export" : "✗ Not selected for export"}</span></div><h2>Civil Works - Pump Room (12 Items)</h2><div className="header-controls"><div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(pumpRoomTotal)}</span></div></div></div>
            {loadingBalanceTank ? <div className="loading-spinner">Loading data...</div> : <> {renderPumpRoomTable()} <div className="boq-note"><div><strong>Note:</strong> Pump room quantities are calculated as 15% of main pool quantities. The pump room dimensions are derived from the calculated volume.<span className="small"> Pump Room includes 12 items only (no Coping, no Tiling).</span><div className="pump-room-note" style={{ marginTop: "8px", color: "#63b3ed" }}><strong>Pump Room Distance:</strong> The pump room is located {pumpRoomDistance} meters from the pool, which affects piping quantities.</div><div className="excavation-split-note" style={{ marginTop: "8px", color: "#63b3ed" }}><strong>Note:</strong> Pump Room SlNo 1 uses a plain single quantity (EarthExcavation_QTY_2) — no excavation sub-rows. Only the Main Pool has sub-rows.</div></div></div> </>}
          </section>
        )}
        {activeTab === "piping" && (
          <section className="tab-content active">
            <div className="section-header"><div className="table-selection-indicator"><span className={`selection-status ${selectedTables.piping ? "selected" : "not-selected"}`}>{selectedTables.piping ? "✓ Selected for export" : "✗ Not selected for export"}</span></div><h2>Piping System</h2><div className="header-controls"><div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(pipingTotal)}</span></div></div></div>
            <PumpRoomDistanceControl />
            {loadingMepCalculation ? <div className="loading-spinner">Calculating piping quantities...</div> : renderPipingTables()}
            <div className="boq-note"><div><strong>Note:</strong> Piping quantities are calculated based on the pump room distance ({pumpRoomDistance} meters).<ul><li><strong>Pipes:</strong> Main circulation pipes</li><li><strong>Ball Valves:</strong> Isolation valves</li><li><strong>Puddle Flanges:</strong> Waterproofing penetrations</li></ul><span className="small">Adjust the pump room distance to see updated quantities.</span></div></div>
          </section>
        )}
        {activeTab === 4 && (
          <section className="tab-content active">
            <div className="section-header"><h2>MEP (Mechanical, Electrical, Plumbing) Items + Piping System</h2><div className="header-controls"><ConstructionTypeDisplay /><div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(totalMepCost)}</span></div></div></div>
            {loadingMep ? <div className="loading-spinner">Loading MEP data...</div> : !Array.isArray(filteredMepItems) || filteredMepItems.length === 0 ? <div className="error-message">No MEP items available.</div> : <> {loadingMepCalculation && <div className="calculation-status"><span className="status-icon">⏳</span><span>Calculating MEP quantities...</span></div>} {renderMepTable()} <div className="boq-note"><div><strong>Note:</strong> The estimates provided are based on current industry standards and average material costs. Actual costs may vary.<span className="small"> Variations of ±10–15% from the estimate are common.</span><div className="infinity-note"><strong>Infinity Pool Note:</strong><ul><li><strong>SlNo 11:</strong> Skimmer hidden - not required</li><li><strong>Items 35-38:</strong> Removed - piping calculated separately</li></ul></div></div></div> </>}
          </section>
        )}
        {activeTab === 3 && (
          <section className="tab-content active">
            <Timeline poolSize={dimensions} resultData={resultData} currency={currency} exchangeRate={exchangeRate} includePumpRoom={includePumpRoom} pumpRoomDimensions={pumpRoomDimensions} constructionType={constructionType} selectedAdvancedEquipment={selectedAdvancedEquipment} columnVisibility={columnVisibility} selectedTables={selectedTables} filteredMepItems={filteredMepItems} hasBalancingTank={true} pipingItems={pipingItems} pumpRoomDistance={pumpRoomDistance} />
          </section>
        )}
        {activeTab === "total" && (
          <section className="tab-content active">
            <div className="section-header"><h2 className="section-title">Total Pool Cost Summary</h2><div className="header-controls"><ConstructionTypeDisplay /></div></div>
            <div className="summary-cards">
              <div className="summary-card"><div className="summary-icon">🏊</div><div className="summary-details"><h3>Main Pool (Civil Works)</h3><p className="summary-amount">{formatCurrency(mainPoolTotal)}</p><p className="summary-items">14 items (with Excavation, Shuttering & RCC Subrows)</p></div></div>
              <div className="summary-card"><div className="summary-icon">⚖️</div><div className="summary-details"><h3>Balance Tank</h3><p className="summary-amount">{formatCurrency(balanceTankTotal)}</p><p className="summary-items">12 items (no Coping/Tiling)</p></div></div>
              {includePumpRoom && <div className="summary-card"><div className="summary-icon">⚙️</div><div className="summary-details"><h3>Pump Room</h3><p className="summary-amount">{formatCurrency(pumpRoomTotal)}</p><p className="summary-items">12 items (no Coping/Tiling)</p></div></div>}
              <div className="summary-card"><div className="summary-icon">🔧</div><div className="summary-details"><h3>MEP Systems</h3><p className="summary-amount">{formatCurrency(totalMepCost)}</p><p className="summary-items">Base MEP + Advanced + Piping</p></div></div>
            </div>
            <div className="grand-total_1">
              <h3>Grand Total</h3>
              {(() => { const baseAmount = grandTotal; const gstAmount = baseAmount * 0.18; const grandTotalWithGST = baseAmount + gstAmount; return (<><div className="amount-breakdown_1"><div className="breakdown-item_1"><span>Subtotal:</span><span>{formatCurrency(baseAmount)}</span></div><div className="breakdown-item_1"><span>GST (18%):</span><span>{formatCurrency(gstAmount)}</span></div></div><div className="grand-total-amount_1">{formatCurrency(grandTotalWithGST)}<span className="gst-label_1"> (incl. GST)</span></div></>); })()}
              <p className="grand-total-note_1">Includes {constructionType === "terrace" ? "structural civil works" : "complete civil works with excavation"}, balance tank (12 items), pump room (12 items), MEP equipment{selectedAdvancedEquipment.length > 0 ? " (with selected advanced equipment)" : ""}, and piping system based on {pumpRoomDistance}m pump room distance.<br /><span className="gst-note_1">All prices include 18% GST</span><br /><span className="infinity-total-note"><strong>🌊 Infinity Pool:</strong> SlNo 11 hidden (Skimmer not required)</span><br /><span className="structure-total-note" style={{ color: "#63b3ed", fontSize: "11px" }}>📐 Balance Tank &amp; Pump Room: 12 items only (no Coping, no Tiling)</span><br /><span className="excavation-total-note" style={{ color: "#63b3ed", fontSize: "11px" }}>🏗️ Subrows: Main Pool has Excavation (1.1, 1.2), Shuttering (9.1, 9.2), RCC (10.1, 10.2). Balance Tank &amp; Pump Room use plain single qty rows.</span></p>
            </div>
          </section>
        )}
        {activeTab === "visualization" && (
          <section className="tab-content active">
            <div className="section-header"><h2 className="section-title">Cost Breakdown Visualization</h2><div className="header-controls"><ConstructionTypeDisplay /></div></div>
            <CostBreakdownChart mainPoolCost={mainPoolTotal} mepCost={totalMepCost || 0} balancingTankCost={balanceTankTotal} pumpRoomCost={includePumpRoom ? pumpRoomTotal : 0} currency={currency} exchangeRate={exchangeRate} includePumpRoom={includePumpRoom} hasBalancingTank={true} constructionType={constructionType} selectedAdvancedEquipment={selectedAdvancedEquipment} advancedEquipmentTotal={advancedEquipmentTotals.grand} columnVisibility={columnVisibility} selectedTables={selectedTables} filteredMepItems={filteredMepItems} pipingCost={pipingTotal} />
          </section>
        )}
      </main>

      <DebugModal />
      {imageModal.show && <div className="image-modal-overlay" onClick={() => setImageModal({ show: false, src: "" })}><div className="image-modal-content" onClick={(e) => e.stopPropagation()}><button className="image-modal-close" onClick={() => setImageModal({ show: false, src: "" })}>×</button><img src={imageModal.src} alt="Enlarged view" className="image-modal-image" /></div></div>}
      {showComparison && <ComparisonTool currentData={resultData} currentTotal={grandTotal} savedCalculations={savedCalculations} onClose={() => setShowComparison(false)} hasBalancingTank={true} mainPoolCost={mainPoolTotal} balancingTankCost={balanceTankTotal} pumpRoomCost={includePumpRoom ? pumpRoomTotal : 0} mepCost={totalMepCost} mainPoolRemarks={mainPoolRemarks} balancingTankRemarks={balanceTankRemarks} mepRemarks={mepRemarks} pumpRoomRemarks={pumpRoomRemarks} templateDescriptions={templateDescriptions} currentRates={dynamicRates} currency={currency} exchangeRate={exchangeRate} includePumpRoom={includePumpRoom} pumpRoomDimensions={pumpRoomDimensions} constructionType={constructionType} selectedAdvancedEquipment={selectedAdvancedEquipment} columnVisibility={columnVisibility} selectedTables={selectedTables} filteredMepItems={filteredMepItems} overflowGratingData={null} pipingItems={pipingItems} pumpRoomDistance={pumpRoomDistance} />}
      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}><div className="share-modal-content" onClick={(e) => e.stopPropagation()}><button className="share-modal-close" onClick={() => setShowShareModal(false)}>✕</button><ShareResults resultData={resultData} mainPoolData={selectedTables.mainPool ? mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo]) : []} mepItems={selectedTables.mep ? filteredMepItems : []} balancingRows={selectedTables.balancingTank ? balanceTankItems.filter(item => item.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[item.SlNo]) : []} balanceTankData={selectedTables.balancingTank ? balanceTankItems.filter(item => item.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[item.SlNo]) : []} pumpRoomData={selectedTables.pumpRoom ? balanceTankItems.filter(item => item.SlNo <= 12 && PUMP_ROOM_QTY_FIELDS[item.SlNo]) : []} dimensions={dimensions} totalMep={selectedTables.mep ? totalMepCost : 0} mainPoolTotal={selectedTables.mainPool ? mainPoolTotal : 0} balancingTankTotal={selectedTables.balancingTank ? balanceTankTotal : 0} balanceTankTotal={selectedTables.balancingTank ? balanceTankTotal : 0} pumpRoomTotal={selectedTables.pumpRoom && includePumpRoom ? pumpRoomTotal : 0} finalTotal={grandTotal} hasBalancingTank={true} poolType="infinity" constructionType={constructionType} mainPoolRemarks={mainPoolRemarks} mepRemarks={mepRemarks} balancingTankRemarks={balanceTankRemarks} balanceTankRemarks={balanceTankRemarks} pumpRoomRemarks={pumpRoomRemarks} templateDescriptions={templateDescriptions || {}} civilQuantities={civilQuantities} mepQuantities={mepQuantities} pumpRoomQuantities={pumpRoomQuantities} balanceTankQuantities={balanceTankQuantities} dynamicRates={dynamicRates} currency={currency} exchangeRate={exchangeRate} includePumpRoom={selectedTables.pumpRoom ? includePumpRoom : false} selectedAdvancedEquipment={selectedAdvancedEquipment} columnVisibility={columnVisibility} selectedTables={selectedTables} apiBaseUrl={`${API_BASE_URL}/admin`} pipingItems={selectedTables.piping ? pipingItems : []} filteredMepItems={selectedTables.mep ? filteredMepItems : []} /></div></div>
      )}
      <SaveProjectModal open={saveOpen} onClose={() => setSaveOpen(false)} resultData={resultDataForSave} dimensions={dimensions} projectType="infinity" />
      <footer className="action-buttons">
        <button className="download-button" onClick={saveCalculation}><span className="button-icon">💾</span> Save Calculation</button>
        <button className="download-button" onClick={() => navigate("/")}><span className="button-icon">←</span> Back to Calculator</button>
        <button className="download-button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><span className="button-icon">↑</span> Back to top</button>
      </footer>
    </div>
  );
}

export default ResultPage;