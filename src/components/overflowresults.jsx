import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import "./result.css";

import { generatePDF, PDFDownloadButton } from "./download";
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

// SUB-ROW STRUCTURE FOR EXCAVATION, SHUTTERING, AND RCC
const SUB_ROWS = {
  1: [
    { slNo: "1.1", description: "Excavation up to 1.5m depth" },
    { slNo: "1.2", description: "Excavation from 1.5m to 3.0m depth" }
  ],
  9: [
    { slNo: "9.1", description: "Raft" },
    { slNo: "9.2", description: "Retaining wall/ overflow drain" }
  ],
  10: [
    { slNo: "10.1", description: "Raft" },
    { slNo: "10.2", description: "Retaining wall" }
  ]
};

// Tenant Authentication Helper Function
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
    "Authorization": `Bearer ${token}`,
    "X-Tenant-ID": tenantId
  };
}

// Safe formatter to avoid invalid values
function safeToFixed(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.00";
  }
  return Number(value).toFixed(decimals);
}

// Helper function to extract numeric diameter from piping items
const getNumericDiameter = (item) => {
  if (!item) return 0;
  const dia = item.dia !== undefined && item.dia !== null ? item.dia : 0;
  if (typeof dia === 'string') {
    return Number(String(dia).replace(/[^0-9.]/g, '')) || 0;
  }
  return Number(dia) || 0;
};

// ================================
// PIPING ITEM MAPPER
// ================================
const mapPipingItem = (item, index) => {
  const sl_no = Number(item.SlNo ?? item.sl_no ?? index + 1);
  const type = String(item.Type ?? item.type ?? "").trim();
  const category = String(item.Category ?? item.category ?? "").toLowerCase().trim();
  const code = String(item.Code ?? item.code ?? "").trim();

  const description = item.Description || item.description || "";
  const unit = String(item.Unit ?? item.unit ?? "").trim();

  let dia = null;
  if (item.Dia !== undefined && item.Dia !== null) {
    dia = Number(item.Dia);
  } else if (item.dia !== undefined && item.dia !== null) {
    dia = Number(item.dia);
  }

  let quantity = 0;
  if (item.Quantity !== undefined && item.Quantity !== null) {
    quantity = Number(item.Quantity);
  } else if (item.quantity !== undefined && item.quantity !== null) {
    quantity = Number(item.quantity);
  }

  let rate = 0;
  if (item.Rate !== undefined && item.Rate !== null) {
    rate = Number(item.Rate);
  } else if (item.rate !== undefined && item.rate !== null) {
    rate = Number(item.rate);
  }

  const final_rate = rate;
  const supply_rate = rate;
  const installation_rate = rate * INSTALLATION_PERCENT;
  const supply_cost = quantity * supply_rate;
  const installation_cost = quantity * installation_rate;
  const total = supply_cost + installation_cost;

  let finalUnit = unit;
  if (!finalUnit || finalUnit === "") {
    if (category === "ball_valve" || category === "puddle_flange" || category === "valve" || category === "flange") {
      finalUnit = "Nos";
    } else if (category === "pipe" || category === "header") {
      finalUnit = "Mtrs";
    } else {
      finalUnit = "Nos";
    }
  }

  let finalDescription = description;
  if (!finalDescription || finalDescription === "") {
    if (category === "puddle_flange") {
      finalDescription = `${dia || ""}mm Puddle Flange`;
    } else if (category === "ball_valve") {
      finalDescription = `${dia || ""}mm Ball Valve`;
    } else if (category === "pipe") {
      finalDescription = `${dia || ""}mm Pipe`;
    } else if (category === "header") {
      finalDescription = `${dia || ""}mm Header`;
    } else {
      finalDescription = type || "N/A";
    }
  }

  return {
    sl_no, type, category, code,
    description: finalDescription, dia,
    unit: finalUnit, quantity, rate,
    supply_rate, installation_rate,
    supply_cost, installation_cost, total
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
              <div style={{ color: "#63b3ed", fontWeight: 700, fontSize: "15px" }}>3D Pool Visualization</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>{length} × {width} × {depth} m | For reference only</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handleOpenExternal} style={{ padding: "7px 14px", background: "rgba(99,179,237,0.15)", border: "1px solid rgba(99,179,237,0.4)", borderRadius: "6px", color: "#63b3ed", cursor: "pointer", fontSize: "12px" }}>↗ Open in New Tab</button>
            <button onClick={handleExitFullscreen} style={{ padding: "7px 14px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "6px", color: "#f87171", cursor: "pointer", fontSize: "12px" }}>✕ Exit Fullscreen</button>
          </div>
        </div>
        <div style={{ flex: 1, position: "relative" }}>
          <iframe src={visualizationUrl} title="3D Pool Visualization - Full View" style={{ width: "100%", height: "100%", border: "none", display: "block" }} allow="accelerometer; autoplay; camera; fullscreen; gyroscope; xr-spatial-tracking" allowFullScreen />
        </div>
        <div style={{ padding: "8px 20px", background: "rgba(245,158,11,0.1)", borderTop: "1px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <span style={{ fontSize: "13px" }}>⚠️</span>
          <span style={{ color: "orange" }}>This 3D visualization is provided for conceptual reference only and does not represent the actual pool design.</span>
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
            <div style={{ fontSize: "12px", color: "rgba(238, 134, 6, 0.93)", lineHeight: 1.5 }}>This 3D visualization is a <strong style={{ color: "rgba(238, 134, 6, 0.93)" }}>general conceptual model</strong> generated for reference purposes only.</div>
          </div>
          <button onClick={() => setShowDisclaimer(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "16px", padding: "0", flexShrink: 0 }}>×</button>
        </div>
      )}
      <div style={{ position: "relative", width: "100%", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(99,179,237,0.2)", background: "#0d0d1a" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "rgba(0,0,0,0.5)", borderBottom: "1px solid rgba(99,179,237,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#28c840" }} />
            <span style={{ marginLeft: "8px", color: "rgba(255,255,255,0.5)", fontSize: "11px", fontFamily: "monospace" }}>3d.intelithon.in</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleOpenExternal} style={{ padding: "5px 10px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "5px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "11px" }}>↗ New Tab</button>
            <button onClick={handleFullscreen} style={{ padding: "5px 12px", background: "linear-gradient(135deg, rgba(99,179,237,0.2), rgba(66,153,225,0.2))", border: "1px solid rgba(99,179,237,0.35)", borderRadius: "5px", color: "#63b3ed", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}>⛶ Full View</button>
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
            </div>
            <style>{`@keyframes spin3d { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        <iframe src={visualizationUrl} title="3D Pool Visualization" style={{ width: "100%", height: "460px", border: "none", display: "block", opacity: iframeLoaded ? 1 : 0, transition: "opacity 0.4s ease" }} onLoad={() => setIframeLoaded(true)} onError={() => setIframeError(true)} allow="accelerometer; autoplay; camera; fullscreen; gyroscope; xr-spatial-tracking" allowFullScreen sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-top-navigation" />
      </div>
    </div>
  );
}

function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialState = location.state?.result || null;
  const [resultData, setResultData] = useState(initialState);
  const [dimensions, setDimensions] = useState(location.state?.dimensions || {});
  const [poolType, setPoolType] = useState(location.state?.poolType || "overflow");
  const [constructionType, setConstructionType] = useState(location.state?.constructionType || "in_ground");

  const [companyProfile, setCompanyProfile] = useState(null);
  const [turnover, setTurnover] = useState(location.state?.turnover || 4.5);

  const [mainPoolItems, setMainPoolItems] = useState([]);
  const [mepItems, setMepItems] = useState([]);
  const [balanceTankItems, setBalanceTankItems] = useState([]);

  const [excavationRates, setExcavationRates] = useState([]);

  const [civilQuantities, setCivilQuantities] = useState({});
  const [mepQuantities, setMepQuantities] = useState({});
  const [balanceTankQuantities, setBalanceTankQuantities] = useState({});
  const [pumpRoomQuantities, setPumpRoomQuantities] = useState({});
  const [pumpRoomItems, setPumpRoomItems] = useState([]);
  const [templateDescriptions, setTemplateDescriptions] = useState({});

  const [pumpRoomDimensions, setPumpRoomDimensions] = useState({});
  const [balanceTankDimensions, setBalanceTankDimensions] = useState({});
  const [includePumpRoom, setIncludePumpRoom] = useState(true);
  const [hasBalancingTank, setHasBalancingTank] = useState(true);

  const [dynamicRates, setDynamicRates] = useState({
    filter_rate: 0, pump_rate: 0,
    filter_description: "", pump_description: "",
    source: "no_match", exact_match: false,
    hp_overridden: false, original_hp: null, hp_from_db: null,
    database_updated: false, rate_source_note: "",
    hp: null, filter_dia: null
  });

  const [includeHeatPump, setIncludeHeatPump] = useState(false);
  const [heatPumpSelection, setHeatPumpSelection] = useState(null);

  const [loadingMainPool, setLoadingMainPool] = useState(true);
  const [loadingMep, setLoadingMep] = useState(true);
  const [loadingBalanceTank, setLoadingBalanceTank] = useState(true);
  const [loadingMepCalculation, setLoadingMepCalculation] = useState(false);
  const [loadingCalc, setLoadingCalc] = useState(!initialState);

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExcelExportModal, setShowExcelExportModal] = useState(false);

  const [currency, setCurrency] = useState('INR');

  const [columnVisibility, setColumnVisibility] = useState({
    image: true, unit: true, qty: true, fixedRate: true, remarks: true, code: true
  });

  const [selectedTables, setSelectedTables] = useState({
    mainPool: true, balancingTank: true, pumpRoom: true, mep: true, piping: true
  });

  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  const [pumpRoomDistance, setPumpRoomDistance] = useState(15);
  const [updatingDistance, setUpdatingDistance] = useState(false);

  const [saveOpen, setSaveOpen] = useState(false);
  
  // SIDEBAR COLLAPSED STATE
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // EDITABLE STATES
  const [editableCivilQty, setEditableCivilQty] = useState({});
  const [editableBalanceQty, setEditableBalanceQty] = useState({});
  const [editablePumpRoomQty, setEditablePumpRoomQty] = useState({});
  const [editableMepQty, setEditableMepQty] = useState({});
  const [editablePipingQty, setEditablePipingQty] = useState({});
  const [editableSubRowQty, setEditableSubRowQty] = useState({});

  // ================================
  // VOLUME CHECK FOR LARGE POOLS
  // ================================
  const shouldUseLargePoolImages = useMemo(() => {
    const length = Number(dimensions?.length || 0);
    const width = Number(dimensions?.width || 0);
    const depth = Number(dimensions?.depth || 0);
    const volume = length * width * depth;

    console.log("POOL VOLUME:", volume);
    console.log("VOLUME THRESHOLD CHECK:", volume >= 500 ? "LARGE POOL - Use override images" : "SMALL/MEDIUM POOL - Use database images");

    // Semi Olympic / Commercial pools (500 m³ and above)
    return volume >= 500;
  }, [dimensions]);

  // ================================
  // IMAGE OVERRIDE FUNCTION - VOLUME-BASED
  // ================================
  const getOverflowMepImage = (item) => {
    // Only apply overrides for large pools
    if (!shouldUseLargePoolImages) {
      console.log("SKIP OVERRIDE: Pool volume < 500 m³ - using database images");
      return null;
    }

    if (!item) return null;

    const slNo = Number(
      item?.SlNo ??
      item?.sl_no ??
      item?.slno ??
      0
    );

    console.log("LARGE POOL - SLNO CHECK:", slNo, item);

    const imageMap = {
      1: "/filter1.png",
      5: "/mpv1.png",
      7: "/pump1.png",
      9: "/md1.png",
      13: "/gutter1.png",
      19: "/dosing1.png",
    };

    const overrideImage = imageMap[slNo] || null;
    if (overrideImage) {
      console.log("OVERRIDE IMAGE SELECTED FOR SLNO", slNo, ":", overrideImage);
    }
    return overrideImage;
  };

  // COMMON QTY HANDLER
  const handleQtyChange = (type, key, value) => {
    const qty = Number(value) || 0;

    switch (type) {
      case "civil":
        setEditableCivilQty(prev => ({ ...prev, [key]: qty }));
        break;
      case "balance":
        setEditableBalanceQty(prev => ({ ...prev, [key]: qty }));
        break;
      case "pump":
        setEditablePumpRoomQty(prev => ({ ...prev, [key]: qty }));
        break;
      case "mep":
        setEditableMepQty(prev => ({ ...prev, [key]: qty }));
        break;
      case "piping":
        setEditablePipingQty(prev => ({ ...prev, [key]: qty }));
        break;
      case "subrow":
        setEditableSubRowQty(prev => ({ ...prev, [key]: qty }));
        break;
      default:
        break;
    }
  };

  const excavationRateMap = useMemo(() => {
    const map = {};
    excavationRates.forEach((item) => {
      const key = String(item.code ?? item.Code ?? "").trim();
      if (key) {
        map[key] = item;
      }
    });
    return map;
  }, [excavationRates]);

  const getExcavationRate = (subSlNo) => {
    const key = String(subSlNo).trim();
    const entry = excavationRateMap[key];
    if (!entry) return 0;
    const rate = entry.rate ?? entry.Rate ?? entry ?? 0;
    return Number(rate) || 0;
  };

  const getSplitQty = (splitData, subSlNo) => {
    if (!splitData) return 0;
    const entry = splitData[String(subSlNo).trim()];
    if (entry === undefined || entry === null) return 0;
    if (typeof entry === 'number') return entry;
    if (typeof entry === 'object') {
      const qty = entry.qty ?? entry.Qty ?? entry.quantity ?? entry.Quantity ?? 0;
      return Number(qty) || 0;
    }
    return Number(entry) || 0;
  };

  const getResolvedMepDescription = (slNo, fallbackItem) => {
    const calcItem = resultData?.mep?.find(m => (m.SlNo ?? m.sl_no) === slNo);
    if (calcItem?.Description && !calcItem.Description.includes('{{')) {
      return calcItem.Description;
    }
    if (slNo === 1 && dynamicRates.filter_description && !dynamicRates.filter_description.includes('{{')) {
      return dynamicRates.filter_description;
    }
    if (slNo === 7 && dynamicRates.pump_description && !dynamicRates.pump_description.includes('{{')) {
      return dynamicRates.pump_description;
    }
    return fallbackItem?.Description || "N/A";
  };

  const pipingItems = useMemo(() => {
    if (!resultData?.piping || !Array.isArray(resultData.piping)) return [];
    return resultData.piping.map((item, index) => mapPipingItem(item, index));
  }, [resultData]);

  const pipes = useMemo(() =>
    pipingItems.filter(i => i.category === "pipe").sort((a, b) => getNumericDiameter(a) - getNumericDiameter(b)),
    [pipingItems]
  );

  const ballValves = useMemo(() =>
    pipingItems.filter(i => i.category === "ball_valve").sort((a, b) => getNumericDiameter(a) - getNumericDiameter(b)),
    [pipingItems]
  );

  const puddleFlanges = useMemo(() =>
    pipingItems.filter(i => i.category === "puddle_flange").sort((a, b) => getNumericDiameter(a) - getNumericDiameter(b)),
    [pipingItems]
  );

  const headers = useMemo(() =>
    pipingItems.filter(i => i.category === "header").sort((a, b) => getNumericDiameter(a) - getNumericDiameter(b)),
    [pipingItems]
  );

  const otherValves = useMemo(() =>
    pipingItems.filter(i => i.category === "valve").sort((a, b) => getNumericDiameter(a) - getNumericDiameter(b)),
    [pipingItems]
  );

  const otherFlanges = useMemo(() =>
    pipingItems.filter(i => i.category === "flange").sort((a, b) => getNumericDiameter(a) - getNumericDiameter(b)),
    [pipingItems]
  );

  const pipingTotals = useMemo(() => {
    const pipesSubtotal = pipingItems
      .filter(item => item.category === "pipe")
      .reduce((sum, item) => {
        const qty = editablePipingQty[item.sl_no] !== undefined ? editablePipingQty[item.sl_no] : item.quantity;
        const rate = Number(item.supply_rate || 0) + Number(item.installation_rate || 0);
        return sum + (qty * rate);
      }, 0);

    const ballValvesSubtotal = pipingItems
      .filter(item => item.category === "ball_valve")
      .reduce((sum, item) => {
        const qty = editablePipingQty[item.sl_no] !== undefined ? editablePipingQty[item.sl_no] : item.quantity;
        const rate = Number(item.supply_rate || 0) + Number(item.installation_rate || 0);
        return sum + (qty * rate);
      }, 0);

    const puddleFlangesSubtotal = pipingItems
      .filter(item => item.category === "puddle_flange")
      .reduce((sum, item) => {
        const qty = editablePipingQty[item.sl_no] !== undefined ? editablePipingQty[item.sl_no] : item.quantity;
        const rate = Number(item.supply_rate || 0) + Number(item.installation_rate || 0);
        return sum + (qty * rate);
      }, 0);

    const headersSubtotal = pipingItems
      .filter(item => item.category === "header")
      .reduce((sum, item) => {
        const qty = editablePipingQty[item.sl_no] !== undefined ? editablePipingQty[item.sl_no] : item.quantity;
        const rate = Number(item.supply_rate || 0) + Number(item.installation_rate || 0);
        return sum + (qty * rate);
      }, 0);

    const otherValvesSubtotal = pipingItems
      .filter(item => item.category === "valve")
      .reduce((sum, item) => {
        const qty = editablePipingQty[item.sl_no] !== undefined ? editablePipingQty[item.sl_no] : item.quantity;
        const rate = Number(item.supply_rate || 0) + Number(item.installation_rate || 0);
        return sum + (qty * rate);
      }, 0);

    const otherFlangesSubtotal = pipingItems
      .filter(item => item.category === "flange")
      .reduce((sum, item) => {
        const qty = editablePipingQty[item.sl_no] !== undefined ? editablePipingQty[item.sl_no] : item.quantity;
        const rate = Number(item.supply_rate || 0) + Number(item.installation_rate || 0);
        return sum + (qty * rate);
      }, 0);

    const grandTotal = pipesSubtotal + ballValvesSubtotal + puddleFlangesSubtotal + headersSubtotal + otherValvesSubtotal + otherFlangesSubtotal;

    return {
      pipesSubtotal, ballValvesSubtotal, puddleFlangesSubtotal, headersSubtotal,
      otherValvesSubtotal, otherFlangesSubtotal,
      totalSupply: grandTotal, totalInstallation: 0, grandTotal
    };
  }, [pipingItems, editablePipingQty]);

  const overflowGratingData = {
    SlNo: 11, Code: "OG-001",
    Description: "Overflow Grating - Durable, anti-slip cover installed along the overflow channel.",
    Unit: "RMT", Rate: 1850, Image: "/public/grating.png"
  };

  const MAIN_POOL_QTY_FIELDS = {
    1: "EarthExcavation_QTY", 2: "BackFilling_QTY", 3: "Consolidation_QTY", 4: "Disposal_QTY",
    5: "Soling_QTY", 6: "plaincement_QTY", 7: "BurntBrick_QTY", 8: "steelreinforcement_QTY",
    9: "Shuttering_QTY", 10: "shotcreting_QTY", 11: "WaterProofing_QTY", 12: "plastering_QTY",
    13: "Coping_QTY", 14: "Tiling_QTY"
  };

  const BALANCE_TANK_QTY_FIELDS = {
    1: "EarthExcavation_QTY_1", 2: "BackFilling_QTY_1", 3: "Consolidation_QTY_1", 4: "Disposal_QTY_1",
    5: "Soling_QTY_1", 6: "plaincement_QTY_1", 7: "BurntBrick_QTY_1", 8: "steelreinforcement_QTY_1",
    9: "Shuttering_QTY_1", 10: "shotcreting_QTY_1", 11: "WaterProofing_QTY_1", 12: "plastering_QTY_1"
  };

  const PUMP_ROOM_QTY_FIELDS = {
    1: "EarthExcavation_QTY_2", 2: "BackFilling_QTY_2", 3: "Consolidation_QTY_2", 4: "Disposal_QTY_2",
    5: "Soling_QTY_2", 6: "plaincement_QTY_2", 7: "BurntBrick_QTY_2", 8: "steelreinforcement_QTY_2",
    9: "Shuttering_QTY_2", 10: "shotcreting_QTY_2", 11: "WaterProofing_QTY_2", 12: "plastering_QTY_2"
  };

  const MEP_QTY_FIELDS = {
    1: "Filter_QTY", 2: "Glass_QTY", 3: "Pressure_QTY", 4: "Filter_Drain_QTY",
    5: "Mpv_QTY", 6: "Mpv_connset_QTY", 7: "Cpump_QTY", 8: "Return_Inlets_QTY",
    9: "MainDrain_QTY", 10: "Vaccume_Inlets_QTY", 11: "Skimmer_QTY",
    12: "FloatValve_QTY", 13: "GutterDrain_QTY", 14: "Underwaterlight_QTY",
    15: "Transformer_QTY", 16: "ControlPanel_QTY", 17: "Cables_QTY",
    18: "Earthing_QTY", 19: "ChlorinePump_QTY", 20: "DosingTank_QTY",
    21: "Stirrer_QTY", 22: "FloatingHose_QTY", 23: "Brush_QTY",
    24: "Algae_QTY", 25: "Net_QTY", 26: "Handle_QTY", 27: "VacuumHead_QTY",
    28: "TestKit_QTY", 29: "CurvedBrush_QTY", 30: "HeatPump_QTY",
    31: "PoolHeater_QTY", 32: "Chiller_QTY", 33: "Ozonator_QTY", 34: "SaltChlorinator_QTY"
  };

  const filteredMepItems = useMemo(() => {
    if (!Array.isArray(mepItems)) return [];
    const filtered = mepItems.filter(item => item.SlNo < 35);
    if (poolType === "overflow") {
      return filtered.map(item => {
        if (item.SlNo === 11) return { ...item, SlNo: 11, Code: item.Code, Description: overflowGratingData.Description, Unit: overflowGratingData.Unit, Rate: overflowGratingData.Rate, Image: overflowGratingData.Image, isOverflowGrating: true };
        if (item.SlNo === 13) return { ...item, isGutterDrain: true };
        return item;
      });
    }
    return filtered;
  }, [mepItems, poolType]);

  useEffect(() => {
    const savedVisibility = JSON.parse(localStorage.getItem('columnVisibility') || 'null');
    if (savedVisibility) setColumnVisibility(savedVisibility);
    const savedTableSelection = JSON.parse(localStorage.getItem('selectedTables') || 'null');
    if (savedTableSelection) setSelectedTables({ ...savedTableSelection, balancingTank: savedTableSelection.balancingTank ?? savedTableSelection.balanceTank ?? true });
    const savedAdvanced = JSON.parse(localStorage.getItem('selectedAdvancedEquipment') || '[]');
    if (savedAdvanced) setSelectedAdvancedEquipment(savedAdvanced);
    const savedUpdateDB = localStorage.getItem('updateDatabase');
    if (savedUpdateDB !== null) setUpdateDatabase(savedUpdateDB === 'true');
    const saved = JSON.parse(localStorage.getItem('saved_calculations') || '[]');
    setSavedCalculations(saved);
    const savedDistance = localStorage.getItem('pumpRoomDistance');
    if (savedDistance !== null) setPumpRoomDistance(Number(savedDistance));
  }, []);

  useEffect(() => { localStorage.setItem('columnVisibility', JSON.stringify(columnVisibility)); }, [columnVisibility]);
  useEffect(() => { localStorage.setItem('selectedTables', JSON.stringify(selectedTables)); }, [selectedTables]);
  useEffect(() => { localStorage.setItem('selectedAdvancedEquipment', JSON.stringify(selectedAdvancedEquipment)); }, [selectedAdvancedEquipment]);
  useEffect(() => { localStorage.setItem('updateDatabase', updateDatabase.toString()); }, [updateDatabase]);
  useEffect(() => { localStorage.setItem('pumpRoomDistance', pumpRoomDistance.toString()); }, [pumpRoomDistance]);

  const toggleColumnVisibility = (columnName) => setColumnVisibility(prev => ({ ...prev, [columnName]: !prev[columnName] }));
  const resetColumnVisibility = () => setColumnVisibility({ image: true, unit: true, qty: true, fixedRate: true, remarks: true, code: true });
  const toggleTableSelection = (tableName) => setSelectedTables(prev => ({ ...prev, [tableName]: !prev[tableName] }));
  const selectAllTables = () => setSelectedTables({ mainPool: true, balancingTank: true, pumpRoom: true, mep: true, piping: true });
  const deselectAllTables = () => setSelectedTables({ mainPool: false, balancingTank: false, pumpRoom: false, mep: false, piping: false });
  const toggleDropdown = (name) => setOpenDropdown(openDropdown === name ? null : name);

  const handleAdvancedEquipmentToggle = (slNo) => {
    setSelectedAdvancedEquipment(prev => prev.includes(slNo) ? prev.filter(id => id !== slNo) : [...prev, slNo]);
  };
  const handleSelectAllAdvanced = () => {
    const advancedSlNos = [30, 31, 32, 33, 34];
    if (selectedAdvancedEquipment.length === advancedSlNos.length) setSelectedAdvancedEquipment([]);
    else setSelectedAdvancedEquipment(advancedSlNos);
  };

  const fetchRealTimeExchangeRate = async () => {
    setLoadingExchangeRate(true);
    setExchangeRateError(null);
    try {
      const apiUrls = ['https://api.exchangerate-api.com/v4/latest/INR', 'https://open.er-api.com/v6/latest/INR'];
      let rateFound = false;
      for (const apiUrl of apiUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(apiUrl, { method: 'GET', signal: controller.signal, mode: 'cors' });
          clearTimeout(timeoutId);
          if (!response.ok) continue;
          const data = await response.json();
          let usdRate = data.rates?.USD || data.rates?.usd || data.conversion_rates?.USD;
          if (usdRate && !isNaN(usdRate) && usdRate > 0) {
            setExchangeRate(1 / usdRate);
            setLastExchangeUpdate(new Date());
            rateFound = true;
            break;
          }
        } catch { continue; }
      }
      if (!rateFound) { setExchangeRate(83.0); setLastExchangeUpdate(new Date()); setExchangeRateError("Using fallback rate: 1 USD = 83.0 INR"); }
    } catch { setExchangeRate(83.0); setLastExchangeUpdate(new Date()); setExchangeRateError("Failed to fetch. Using fallback."); }
    finally { setLoadingExchangeRate(false); }
  };

  const formatCurrency = (amount, curr = currency) => {
    const formattedAmount = safeToFixed(amount);
    if (curr === 'USD') return `$${safeToFixed(amount / exchangeRate, 2)}`;
    return `₹${formattedAmount}`;
  };
  const getCurrencySymbol = (curr = currency) => curr === 'USD' ? '$' : '₹';
  const handleCurrencyToggle = () => setCurrency(prev => prev === 'INR' ? 'USD' : 'INR');

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const companyCode = localStorage.getItem("tenant_company_code");
        if (!companyCode) return;
        const response = await fetch(`${API_BASE_URL}/admin/tenant/public-profile?company_code=${companyCode}`);
        const data = await response.json();
        if (data.success && data.data) {
          setCompanyProfile(data.data);
          localStorage.setItem("tenant_company_profile", JSON.stringify(data.data));
        }
      } catch (err) { console.error("Company profile fetch error:", err); }
    };
    fetchCompanyProfile();
  }, []);

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
      } finally { setLoadingMainPool(false); }
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
        let items = Array.isArray(data) ? data : (data?.items || data?.mep_items || []);
        setMepItems(items);
      } catch (error) {
        if (error.message === "AUTH_MISSING") return;
        console.error("Error fetching MEP items:", error);
        setMepItems([]);
      } finally { setLoadingMep(false); }
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
      } finally { setLoadingBalanceTank(false); }
    };
    fetchBalanceTankItems();
  }, [navigate]);

  useEffect(() => {
    const fetchExcavationRates = async () => {
      try {
        const headers = getTenantAuthHeaders(navigate);
        const response = await fetch(`${API_BASE_URL}/overflow/excavation-rates`, { headers });
        if (!response.ok) {
          throw new Error("Failed to fetch excavation rates");
        }
        const data = await response.json();

        let ratesArray = [];
        const ratesData = data.rates ?? data.data ?? data;

        if (Array.isArray(ratesData)) {
          ratesArray = ratesData.map(item => ({
            code: String(item.code ?? item.Code ?? "").trim(),
            description: item.description ?? item.Description ?? "",
            rate: Number(item.rate ?? item.Rate ?? 0),
            unit: item.unit ?? item.Unit ?? "CUM"
          }));
        } else if (ratesData && typeof ratesData === 'object') {
          ratesArray = Object.entries(ratesData).map(([code, value]) => {
            if (typeof value === 'number') {
              return { code: String(code).trim(), description: `Excavation ${code}`, rate: value, unit: "CUM" };
            }
            return {
              code: String(code).trim(),
              description: value.description ?? value.Description ?? `Excavation ${code}`,
              rate: Number(value.rate ?? value.Rate ?? 0),
              unit: value.unit ?? value.Unit ?? "CUM"
            };
          });
        }

        setExcavationRates(ratesArray);
      } catch (error) {
        if (error.message === "AUTH_MISSING") return;
        console.error("Excavation rates fetch error:", error);
        setExcavationRates([]);
      }
    };
    fetchExcavationRates();
  }, [navigate]);

  const fetchMepCalculation = async (distanceOverride = null) => {
    if (!dimensions.length || !dimensions.width || !dimensions.depth) {
      return;
    }

    setMepQuantities({});
    setCivilQuantities({});
    setLoadingMepCalculation(true);

    const distanceToUse = distanceOverride !== null ? distanceOverride : pumpRoomDistance;

    try {
      const headers = getTenantAuthHeaders(navigate);

      const url =
        `${API_BASE_URL}/overflow/calculations/mep/` +
        `${dimensions.length}/` +
        `${dimensions.width}/` +
        `${dimensions.depth}` +
        `?pool_type=${poolType}` +
        `&auto_dosing=true` +
        `&include_heat_pump=${includeHeatPump}` +
        `&pool_type_construction=${constructionType}` +
        `&turnover=${turnover}` +
        `&update_database=${updateDatabase}` +
        `&pump_room_distance=${distanceToUse}`;

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        console.error("❌ MEP calculation failed:", data);
        return;
      }

      setResultData(data);

      if (data.quantities) {
        setMepQuantities(data.quantities);
      }

      const civilData = data.civil_quantities || data.main_pool_quantities || {};

      if (constructionType === "terrace") {
        setCivilQuantities({
          EarthExcavation_QTY: 0, BackFilling_QTY: 0, Consolidation_QTY: 0, Disposal_QTY: 0,
          Soling_QTY: 0, plaincement_QTY: 0, BurntBrick_QTY: 0,
          steelreinforcement_QTY: civilData?.steelreinforcement_QTY ?? 0,
          Shuttering_QTY: civilData?.Shuttering_QTY ?? 0,
          shotcreting_QTY: civilData?.shotcreting_QTY ?? 0,
          WaterProofing_QTY: civilData?.WaterProofing_QTY ?? 0,
          plastering_QTY: civilData?.plastering_QTY ?? 0,
          Coping_QTY: civilData?.Coping_QTY ?? 0,
          Tiling_QTY: civilData?.Tiling_QTY ?? 0,
          excavation_split: civilData?.excavation_split || {},
          rcc_shuttering_split: civilData?.rcc_shuttering_split || {},
          shotcreting_split: civilData?.shotcreting_split || {},   
        });
      } else {
        setCivilQuantities(civilData || {});
      }

      const balanceData = data.balance_tank_quantities || {};
      setBalanceTankQuantities(balanceData);

      const pumpRoomData = data.pump_room_quantities || {};
      setPumpRoomQuantities(pumpRoomData);

      if (data.system_parameters) {
        setDynamicRates({
          filter_rate: data.system_parameters.filter_rate ?? 0,
          pump_rate: data.system_parameters.pump_rate ?? 0,
          filter_description: (() => {
            const mepItem1 = data.mep?.find(m => (m.SlNo ?? m.sl_no) === 1);
            if (mepItem1?.Description && !mepItem1.Description.includes('{{')) {
              return mepItem1.Description;
            }
            const sp = data.system_parameters.filter_description || "";
            if (sp && !sp.includes('{{')) return sp;
            return "";
          })(),
          pump_description: (() => {
            const mepItem7 = data.mep?.find(m => (m.SlNo ?? m.sl_no) === 7);
            if (mepItem7?.Description && !mepItem7.Description.includes('{{')) {
              return mepItem7.Description;
            }
            const sp = data.system_parameters.pump_description || "";
            if (sp && !sp.includes('{{')) return sp;
            return "";
          })(),
          source: data.system_parameters.rate_source || "no_match",
          exact_match: data.system_parameters.rate_source === "mep_rates_exact",
          hp_overridden: data.system_parameters.hp_overridden || false,
          original_hp: data.system_parameters.original_hp || null,
          hp_from_db: data.system_parameters.pump_hp || null,
          hp: data.system_parameters.pump_hp || data.system_parameters.hp,
          filter_dia: data.system_parameters.filter_diameter,
          database_updated: data.system_parameters.database_updated || false,
          rate_source_note: data.system_parameters.rate_source === "mep_rates_exact"
            ? "Rates from mep_rates table"
            : ""
        });
      }

      if (data.heat_pump_selection) {
        setHeatPumpSelection(data.heat_pump_selection);
        setIncludeHeatPump(data.heat_pump_selection.available ?? false);
      }

      if (data.pump_room_calculation) {
        setPumpRoomQuantities(data.pump_room_calculation);
        setPumpRoomDimensions({
          length: data.pump_room_calculation.pr_length_2 ?? 0,
          width: data.pump_room_calculation.pr_width_2 ?? 0,
          height: data.pump_room_calculation.pr_height_2 ?? 0
        });
      }

      if (data.balance_tank_calculation) {
        setBalanceTankDimensions({
          l1: data.balance_tank_calculation.l1 ?? 0,
          w1: data.balance_tank_calculation.w1 ?? 0,
          d1: data.balance_tank_calculation.d1 ?? 0
        });
      }

    } catch (error) {
      if (error.message === "AUTH_MISSING") return;
      console.error("❌ Error fetching MEP calculation:", error);
    } finally {
      setLoadingMepCalculation(false);
    }
  };

  const handleDistanceSubmit = async () => {
    if (!dimensions.length || !dimensions.width || !dimensions.depth) { alert("Pool dimensions are required."); return; }
    setUpdatingDistance(true);
    try { await fetchMepCalculation(pumpRoomDistance); }
    catch (error) { console.error("Distance update failed:", error); alert("Failed to update. Please try again."); }
    finally { setUpdatingDistance(false); }
  };

  useEffect(() => {
    if (dimensions?.length && dimensions?.width && dimensions?.depth) fetchMepCalculation();
  }, [dimensions.length, dimensions.width, dimensions.depth, poolType, constructionType, includeHeatPump, updateDatabase]);

  useEffect(() => {
    if (!resultData?.mep?.length || !mepItems.length) return;
    setMepItems(prev => prev.map(item => {
      const calcItem = resultData.mep.find(m => (m.SlNo ?? m.sl_no) === item.SlNo);
      if (calcItem?.Description && !calcItem.Description.includes('{{'))
        return { ...item, Description: calcItem.Description };
      return item;
    }));
  }, [resultData?.mep?.length, resultData?.system_parameters?.filter_diameter]);

  useEffect(() => {
    fetchRealTimeExchangeRate();
    const interval = setInterval(fetchRealTimeExchangeRate, 3600000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => { if (!event.target.closest(".dropdown")) setOpenDropdown(null); };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const getCivilQuantity = (slNo) => {
    if (editableCivilQty[slNo] !== undefined) {
      return Number(editableCivilQty[slNo]);
    }
    const fieldName = MAIN_POOL_QTY_FIELDS[slNo];
    if (!fieldName) return 0;
    const value = civilQuantities?.[fieldName];
    return value !== undefined && value !== null ? Number(value) : 0;
  };

  const getBalanceTankQuantity = (slNo) => {
    if (editableBalanceQty[slNo] !== undefined) {
      return Number(editableBalanceQty[slNo]);
    }
    if (slNo > 12) return 0;
    const fieldName = BALANCE_TANK_QTY_FIELDS[slNo];
    if (!fieldName) return 0;
    const value = balanceTankQuantities?.[fieldName];
    return value !== undefined && value !== null ? Number(value) : 0;
  };

  const getPumpRoomQuantity = (slNo) => {
    if (editablePumpRoomQty[slNo] !== undefined) {
      return Number(editablePumpRoomQty[slNo]);
    }
    if (slNo > 12) return 0;
    const fieldName = PUMP_ROOM_QTY_FIELDS[slNo];
    if (!fieldName) return 0;
    const value = pumpRoomQuantities?.[fieldName];
    return value !== undefined && value !== null ? Number(value) : 0;
  };

  const getMepQuantity = (slNo) => {
    if (editableMepQty[slNo] !== undefined) {
      return Number(editableMepQty[slNo]);
    }
    const fieldName = MEP_QTY_FIELDS[slNo];
    if (!fieldName) return 0;
    if (slNo >= 30 && slNo <= 34) return selectedAdvancedEquipment.includes(slNo) ? 1 : 0;
    if (slNo === 30 && !includeHeatPump) return 0;
    if (mepQuantities?.[fieldName] !== undefined) return mepQuantities[fieldName];
    if (resultData?.[fieldName] !== undefined) return resultData[fieldName];
    return 0;
  };

  const getSupplyRate = (item) => {
    if (item.SlNo === 1) return dynamicRates.filter_rate ?? 0;
    if (item.SlNo === 7) return dynamicRates.pump_rate ?? 0;
    return item.Rate ?? 0;
  };
  const getInstallationRate = (item) => getSupplyRate(item) * INSTALLATION_PERCENT;
  const getSupplyCost = (item, quantity) => quantity * getSupplyRate(item);
  const getInstallationCost = (item, quantity) => quantity * getInstallationRate(item);
  const getRowTotal = (item, quantity) => getSupplyCost(item, quantity) + getInstallationCost(item, quantity);

  const mainPoolTotal = useMemo(() => {
    if (!mainPoolItems.length) return 0;
    return mainPoolItems.reduce((total, item) => {
      if (MAIN_POOL_QTY_FIELDS[item.SlNo]) {
        return total + (getCivilQuantity(item.SlNo) * (item.Rate || 0));
      }
      return total;
    }, 0);
  }, [mainPoolItems, civilQuantities, editableCivilQty, editableSubRowQty]);

  const balanceTankTotal = useMemo(() => {
    if (!balanceTankItems.length) return 0;
    return balanceTankItems.reduce((total, item) => {
      if (item.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[item.SlNo]) {
        return total + (getBalanceTankQuantity(item.SlNo) * (item.Rate || 0));
      }
      return total;
    }, 0);
  }, [balanceTankItems, balanceTankQuantities, editableBalanceQty]);

  const pumpRoomTotal = useMemo(() => {
    if (!includePumpRoom || !balanceTankItems.length) return 0;
    return balanceTankItems.reduce((total, item) => {
      if (item.SlNo <= 12 && PUMP_ROOM_QTY_FIELDS[item.SlNo]) {
        return total + (getPumpRoomQuantity(item.SlNo) * (item.Rate || 0));
      }
      return total;
    }, 0);
  }, [balanceTankItems, pumpRoomQuantities, includePumpRoom, editablePumpRoomQty]);

  const baseMepTotals = useMemo(() => {
    let totalSupply = 0, totalInstallation = 0;
    if (!filteredMepItems.length) return { totalSupply: 0, totalInstallation: 0, grand: 0 };
    filteredMepItems.forEach(item => {
      if (item.SlNo >= 30 && item.SlNo <= 34) return;
      const quantity = getMepQuantity(item.SlNo);
      totalSupply += quantity * getSupplyRate(item);
      totalInstallation += quantity * getInstallationRate(item);
    });
    return { totalSupply, totalInstallation, grand: totalSupply + totalInstallation };
  }, [filteredMepItems, mepQuantities, resultData, dynamicRates, includeHeatPump, editableMepQty]);

  const baseMepTotal = baseMepTotals.grand;

  const advancedEquipmentTotals = useMemo(() => {
    let totalSupply = 0, totalInstallation = 0;
    if (!filteredMepItems.length) return { totalSupply: 0, totalInstallation: 0, grand: 0 };
    filteredMepItems.forEach(item => {
      if (item.SlNo >= 30 && item.SlNo <= 34 && selectedAdvancedEquipment.includes(item.SlNo)) {
        totalSupply += getSupplyRate(item);
        totalInstallation += getInstallationRate(item);
      }
    });
    return { totalSupply, totalInstallation, grand: totalSupply + totalInstallation };
  }, [filteredMepItems, selectedAdvancedEquipment, dynamicRates]);

  const advancedEquipmentTotal = advancedEquipmentTotals.grand;
  const totalMepCost = useMemo(() => baseMepTotal + advancedEquipmentTotal, [baseMepTotal, advancedEquipmentTotal]);

  const grandTotal = useMemo(() => {
    return mainPoolTotal + balanceTankTotal + (includePumpRoom ? pumpRoomTotal : 0) + totalMepCost + pipingTotals.grandTotal;
  }, [mainPoolTotal, balanceTankTotal, pumpRoomTotal, totalMepCost, includePumpRoom, pipingTotals.grandTotal]);

  const workingDays = useMemo(() => {
    if (!resultData?.timeline) return 0;
    return resultData.timeline.reduce((total, phase) => total + (phase.days || 0), 0);
  }, [resultData]);

  const resultDataForSave = {
    project_type: "overflow",
    main_pool_total: mainPoolTotal,
    balance_tank_total: balanceTankTotal,
    pump_room_total: pumpRoomTotal,
    mep_total: totalMepCost,
    piping_total: pipingTotals?.grandTotal || 0,
    working_days: workingDays || 0,
    pool_specification: {
      length: dimensions?.length || 0,
      width: dimensions?.width || 0,
      depth: dimensions?.depth || 0,
      volume: resultData?.volume_m3 || (dimensions?.length * dimensions?.width * dimensions?.depth) || 0,
      flow_rate: resultData?.flowrate_m3_per_hr || 0
    },
    grand_total: grandTotal
  };

  const CurrencyToggle = () => (
    <div className="currency-toggle_1">
      <label className="currency-toggle-label_1">
        <span className="currency-label_1">Currency:</span>
        <div className="toggle-switch_1">
          <input type="checkbox" checked={currency === 'USD'} onChange={handleCurrencyToggle} className="toggle-checkbox_1" />
          <span className="toggle-slider_1">
            <span className="toggle-inr_1">₹ INR</span>
            <span className="toggle-usd_1">$ USD</span>
          </span>
        </div>
      </label>
      <div className="exchange-rate-info_1">
        {loadingExchangeRate ? <div className="rate-loading_1"><span className="loading-spinner-small_1"></span>Loading exchange rate...</div> : (
          <>
            <div className="rate-display_1"><span className="rate-value_1">1 USD = {safeToFixed(exchangeRate, 2)} INR</span></div>
            {lastExchangeUpdate && <div className="rate-meta_1"><span className="rate-update-time_1">Updated: {lastExchangeUpdate.toLocaleTimeString()}</span>{exchangeRateError && <span className="rate-error_1">⚠️ Using fallback rate</span>}</div>}
          </>
        )}
      </div>
    </div>
  );

  const ConstructionTypeDisplay = () => (
    <div className="pool-type-display">
      <div className={`pool-type-badge ${constructionType}`}>
        {constructionType === "terrace" ? <><span className="pool-type-icon">🏢</span>Terrace Pool</> : <><span className="pool-type-icon">⛰️</span>In-Ground Pool</>}
      </div>
    </div>
  );

  const HPOverrideDisplay = () => {
    if (!dynamicRates.hp_overridden) return null;
    return (
      <div className="hp-override-info">
        <span className="info-icon">ℹ️</span>
        <span className="hp-override-text">Pump HP overridden: {dynamicRates.original_hp} HP → {dynamicRates.hp_from_db} HP</span>
      </div>
    );
  };

  const DatabaseUpdateToggle = () => (
    <div className="database-update-toggle">
      <label className="toggle-label">
        <input type="checkbox" checked={updateDatabase} onChange={(e) => setUpdateDatabase(e.target.checked)} className="toggle-checkbox" />
        <span className="toggle-text">{updateDatabase ? "✅ Save rates to mep_tenant_data" : "💾 Don't save rates to database"}</span>
      </label>
      {dynamicRates.database_updated && <span className="update-success-badge">✓ Rates saved</span>}
    </div>
  );

  const ColumnVisibilityControls = () => (
    <div className="column-visibility-controls_1">
      <div className="visibility-header">
        <span className="visibility-title">Column Visibility:</span>
        <button className="reset-visibility-btn" onClick={resetColumnVisibility}>Reset All</button>
      </div>
      <div className="visibility-checkboxes">
        {[{ key: 'image', label: 'Image' }, { key: 'unit', label: 'Unit' }, { key: 'qty', label: 'QTY' }, { key: 'fixedRate', label: 'Fixed Rate' }, { key: 'code', label: 'Code' }, { key: 'remarks', label: 'Remarks' }].map(({ key, label }) => (
          <label key={key} className="visibility-checkbox">
            <input type="checkbox" checked={columnVisibility[key]} onChange={() => toggleColumnVisibility(key)} />
            <span className="checkbox-label">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const TableSelectionControls = () => (
    <div className="table-selection-controls">
      <div className="selection-header">
        <span className="selection-title">Export Table Selection:</span>
        <div className="selection-buttons">
          <button className="selection-btn select-all-btn" onClick={selectAllTables}>Select All</button>
          <button className="selection-btn deselect-all-btn" onClick={deselectAllTables}>Deselect All</button>
        </div>
      </div>
      <div className="selection-checkboxes">
        {[
          { key: 'mainPool', label: 'Main Pool', count: '14 items' },
          { key: 'balancingTank', label: 'Balance Tank', count: '12 items' },
          { key: 'pumpRoom', label: 'Pump Room', count: '12 items' },
          { key: 'mep', label: 'MEP Systems', count: '34 items' },
          { key: 'piping', label: 'Piping System', count: `${pipingItems.length} items` },
        ].map(({ key, label, count }) => (
          <label key={key} className="selection-checkbox">
            <input type="checkbox" checked={selectedTables[key]} onChange={() => toggleTableSelection(key)} />
            <span className="checkbox-label">{label}</span>
            <span className="table-count">({count})</span>
          </label>
        ))}
      </div>
    </div>
  );

  // ================================
  // UPDATED renderImage FUNCTION - Table-specific override
  // ================================
  const renderImage = (imageData, item = null, tableType = "default") => {
    // Only apply overrides for MEP table
    const overrideImage = tableType === "mep" ? getOverflowMepImage(item) : null;

    const imageSource = overrideImage || imageData;

    console.log("OVERRIDE:", overrideImage);
    console.log("IMAGE SOURCE:", imageSource);
    console.log("TABLE TYPE:", tableType);

    if (!imageSource) return "-";

    let fullPath = "";

    // If path starts with / (root relative), use as is (public folder)
    if (imageSource.startsWith("/")) {
      fullPath = imageSource;
    } else {
      // Backend image - prepend API base URL
      fullPath = `${API_BASE_URL}/admin/static/${imageSource}`;
    }

    console.log("FINAL IMAGE PATH:", fullPath);

    return (
      <img
        src={fullPath}
        alt="Item"
        className="item-image"
        loading="lazy"
        onClick={() =>
          setImageModal({
            show: true,
            src: fullPath
          })
        }
        onError={(e) => {
          console.log("FAILED IMAGE:", fullPath);
          e.target.style.display = "none";
        }}
      />
    );
  };

  const calculateColSpan = () => {
    let colSpan = 2;
    if (columnVisibility.code) colSpan++;
    if (columnVisibility.image) colSpan++;
    if (columnVisibility.unit) colSpan++;
    if (columnVisibility.qty) colSpan++;
    if (columnVisibility.fixedRate) colSpan++;
    return colSpan;
  };

  const calculatePipingColSpan = () => {
    let colSpan = 2;
    if (columnVisibility.code) colSpan++;
    colSpan++;
    if (columnVisibility.qty) colSpan++;
    if (columnVisibility.unit) colSpan++;
    if (columnVisibility.fixedRate) colSpan++;
    colSpan += 3;
    if (columnVisibility.remarks) colSpan++;
    return colSpan;
  };

  // RENDER MAIN POOL TABLE
  const renderMainPoolTable = () => {
    if (!mainPoolItems.length) return <div className="no-data-message">No main pool data available.</div>;
    const filteredItems = mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo]);

    const excavationSplit = civilQuantities?.excavation_split_qty || {};
    const rccShutteringSplit = civilQuantities?.rcc_shuttering_split || {};

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
            {filteredItems.flatMap((item) => {
              const baseQty = getCivilQuantity(item.SlNo);
              const rows = [];
              const itemDescription = item.Description || item.description || "N/A";

              rows.push(
                <tr key={`main-${item.SlNo}`} className="parent-row">
                  <td data-label="Sl.No" className="parent-slno">{item.SlNo}</td>
                  {columnVisibility.code && <td data-label="Code" className="parent-code">{item.Code || "N/A"}</td>}
                  <td data-label="Description" className="description-cell parent-desc">
                    {itemDescription}
                    {item.SlNo === 3 && baseQty > 0 && (
                      <div className="consolidation-badge"><small>🔨 Backfill Compaction</small></div>
                    )}
                    {item.SlNo === 4 && baseQty > 0 && (
                      <div className="disposal-badge"><small>🚛 Excess Soil Removal</small></div>
                    )}
                  </td>
                  {columnVisibility.image && <td data-label="Image" className="image-cell parent-image">{item.Image ? renderImage(item.Image, item, "civil") : "-"}</td>}
                  {columnVisibility.unit && <td data-label="Unit" className="parent-unit">{item.Unit || ""}</td>}
                  {columnVisibility.qty && <td data-label="QTY" className="parent-qty"></td>}
                  {columnVisibility.fixedRate && <td data-label="Fixed Rate" className="parent-fixed-rate"></td>}
                  <td data-label="Amount" className="parent-amount"></td>
                  {columnVisibility.remarks && <td data-label="Remarks" className="parent-remarks"></td>}
                </tr>
              );

              if (SUB_ROWS[item.SlNo]) {
                SUB_ROWS[item.SlNo].forEach((sub) => {
                  const rate = getExcavationRate(sub.slNo);
                  let qty = 0;
                  const editableSubQty = editableSubRowQty[sub.slNo];
                  if (editableSubQty !== undefined) {
                    qty = Number(editableSubQty);
                  } else {
                    if (item.SlNo === 1) {
                      qty = getSplitQty(excavationSplit, sub.slNo);
                    } else if (item.SlNo === 9 || item.SlNo === 10) {
                      qty = getSplitQty(rccShutteringSplit, sub.slNo);
                    }
                  }
                  const amount = qty * rate;
                  const subImage = item.Image ?? null;
                  const subUnit = item.Unit ?? "";

                  rows.push(
                    <tr key={`sub-${sub.slNo}`} className="sub-row">
                      <td data-label="Sl.No" className="sub-slno">{sub.slNo}</td>
                      {columnVisibility.code && (<td data-label="Code" className="sub-code"></td>)}
                      <td data-label="Description" className="description-cell sub-desc">↳ {sub.description}</td>
                      {columnVisibility.image && (<td data-label="Image" className="image-cell sub-image">{subImage ? renderImage(subImage, item, "civil") : "-"}</td>)}
                      {columnVisibility.unit && (<td data-label="Unit" className="sub-unit">{subUnit}</td>)}
                      {columnVisibility.qty && (
                        <td data-label="QTY" className={`sub-qty ${qty ? "quantity-filled" : ""}`}>
                          <input type="number" step="0.001" value={qty} onChange={(e) => handleQtyChange("subrow", sub.slNo, e.target.value)} className="qty-input subrow-input" />
                        </td>
                      )}
                      {columnVisibility.fixedRate && (<td data-label="Fixed Rate" className="sub-fixed-rate">{formatCurrency(rate)}</td>)}
                      <td data-label="Amount" className="amount-cell sub-amount">{formatCurrency(amount)}</td>
                      {columnVisibility.remarks && (
                        <td data-label="Remarks" className="remarks-cell sub-remarks">
                          <textarea className="remarks-textbox" placeholder="Add remarks..." value={mainPoolRemarks[`${item.SlNo}_${sub.slNo}`] || ""} onChange={(e) => setMainPoolRemarks(prev => ({ ...prev, [`${item.SlNo}_${sub.slNo}`]: e.target.value }))} rows="2" />
                        </td>
                      )}
                    </tr>
                  );
                });
              } else if (baseQty > 0 && item.SlNo !== 9 && item.SlNo !== 10) {
                const rate = item.Rate || 0;
                const amount = baseQty * rate;

                rows[0] = (
                  <tr key={`main-${item.SlNo}`} className="parent-row with-values">
                    <td data-label="Sl.No" className="parent-slno">{item.SlNo}</td>
                    {columnVisibility.code && <td data-label="Code" className="parent-code">{item.Code || "N/A"}</td>}
                    <td data-label="Description" className="description-cell parent-desc">
                      {itemDescription}
                      {item.SlNo === 3 && baseQty > 0 && (<div className="consolidation-badge"><small>🔨 Backfill Compaction</small></div>)}
                      {item.SlNo === 4 && baseQty > 0 && (<div className="disposal-badge"><small>🚛 Excess Soil Removal</small></div>)}
                    </td>
                    {columnVisibility.image && <td data-label="Image" className="image-cell parent-image">{item.Image ? renderImage(item.Image, item, "civil") : "-"}</td>}
                    {columnVisibility.unit && <td data-label="Unit" className="parent-unit">{item.Unit || ""}</td>}
                    {columnVisibility.qty && (
                      <td data-label="QTY" className={`parent-qty ${baseQty ? "quantity-filled" : ""}`}>
                        <input type="number" step="0.001" value={baseQty} onChange={(e) => handleQtyChange("civil", item.SlNo, e.target.value)} className="qty-input" />
                      </td>
                    )}
                    {columnVisibility.fixedRate && (<td data-label="Fixed Rate" className="parent-fixed-rate">{formatCurrency(rate)}</td>)}
                    <td data-label="Amount" className="amount-cell parent-amount">{formatCurrency(amount)}</td>
                    {columnVisibility.remarks && (
                      <td data-label="Remarks" className="remarks-cell parent-remarks">
                        <textarea className="remarks-textbox" placeholder="Add remarks..." value={mainPoolRemarks[item.SlNo] || ""} onChange={(e) => setMainPoolRemarks(prev => ({ ...prev, [item.SlNo]: e.target.value }))} rows="2" />
                      </td>
                    )}
                  </tr>
                );
              }
              return rows;
            })}
          </tbody>
          <tfoot>
            <tr className="table-total">
              <td colSpan={calculateColSpan()} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
              <td className="amount-cell total-amount" style={{ fontWeight: 'bold' }}>{formatCurrency(mainPoolTotal)}</td>
              {columnVisibility.remarks && <td></td>}
             </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const renderBalanceTankTable = () => {
    if (loadingBalanceTank) return <div className="loading-spinner">Loading balance tank data...</div>;
    if (!balanceTankItems.length) return <div className="no-data-message">No balance tank data available.</div>;

    const filteredItems = balanceTankItems.filter(item => item.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[item.SlNo]);

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
              const baseQty = getBalanceTankQuantity(item.SlNo);
              const rate = item.Rate || 0;
              const amount = baseQty * rate;
              const itemDescription = item.Description || item.description || "N/A";

              return (
                <tr key={`bt-${item.SlNo}`}>
                  <td data-label="Sl.No">{item.SlNo}</td>
                  {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                  <td data-label="Description" className="description-cell">
                    {itemDescription}
                    <div className="balance-tank-badge"><small>Balance Tank</small></div>
                    {item.SlNo === 3 && baseQty > 0 && (<div className="consolidation-badge"><small>🔨 Backfill Compaction</small></div>)}
                    {item.SlNo === 4 && baseQty > 0 && (<div className="disposal-badge"><small>🚛 Excess Soil Removal</small></div>)}
                  </td>
                  {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image, item, "balance") : "-"}</td>}
                  {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                  {columnVisibility.qty && (
                    <td data-label="QTY" className={baseQty ? "quantity-filled" : ""}>
                      <input type="number" step="0.001" value={baseQty} onChange={(e) => handleQtyChange("balance", item.SlNo, e.target.value)} className="qty-input" />
                    </td>
                  )}
                  {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(rate)}</td>}
                  <td data-label="Amount" className="amount-cell">{formatCurrency(amount)}</td>
                  {columnVisibility.remarks && (
                    <td data-label="Remarks" className="remarks-cell">
                      <textarea className="remarks-textbox" placeholder="Add remarks..." value={balanceTankRemarks[item.SlNo] || ""} onChange={(e) => setBalanceTankRemarks(prev => ({ ...prev, [item.SlNo]: e.target.value }))} rows="2" />
                    </td>
                  )}
                 </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-total">
              <td colSpan={calculateColSpan()} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
              <td className="amount-cell total-amount" style={{ fontWeight: 'bold' }}>{formatCurrency(balanceTankTotal)}</td>
              {columnVisibility.remarks && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const renderPumpRoomTable = () => {
    if (!includePumpRoom) {
      return (
        <div className="pump-room-disabled-message">
          <div className="info-message"><span className="info-icon">ℹ️</span>Pump Room calculation is currently disabled.</div>
        </div>
      );
    }
    if (loadingBalanceTank) return <div className="loading-spinner">Loading pump room data...</div>;
    if (!balanceTankItems.length) return <div className="no-data-message">No pump room data available.</div>;

    const filteredItems = balanceTankItems.filter(item => item.SlNo <= 12 && PUMP_ROOM_QTY_FIELDS[item.SlNo]);

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
              const baseQty = getPumpRoomQuantity(item.SlNo);
              const rate = item.Rate || 0;
              const amount = baseQty * rate;
              const itemDescription = item.Description || item.description || "N/A";

              return (
                <tr key={`pr-${item.SlNo}`}>
                  <td data-label="Sl.No">{item.SlNo}</td>
                  {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                  <td data-label="Description" className="description-cell">
                    {itemDescription}
                    <div className="pump-room-badge"><small>Pump Room</small></div>
                    {item.SlNo === 3 && baseQty > 0 && (<div className="consolidation-badge"><small>🔨 Backfill Compaction</small></div>)}
                    {item.SlNo === 4 && baseQty > 0 && (<div className="disposal-badge"><small>🚛 Excess Soil Removal</small></div>)}
                   </td>
                  {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image, item, "pump") : "-"}</td>}
                  {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                  {columnVisibility.qty && (
                    <td data-label="QTY" className={baseQty ? "quantity-filled" : ""}>
                      <input type="number" step="0.001" value={baseQty} onChange={(e) => handleQtyChange("pump", item.SlNo, e.target.value)} className="qty-input" />
                    </td>
                  )}
                  {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(rate)}</td>}
                  <td data-label="Amount" className="amount-cell">{formatCurrency(amount)}</td>
                  {columnVisibility.remarks && (
                    <td data-label="Remarks" className="remarks-cell">
                      <textarea className="remarks-textbox" placeholder="Add remarks..." value={pumpRoomRemarks[item.SlNo] || ""} onChange={(e) => setPumpRoomRemarks(prev => ({ ...prev, [item.SlNo]: e.target.value }))} rows="2" />
                    </td>
                  )}
                 </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-total">
              <td colSpan={calculateColSpan()} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
              <td className="amount-cell total-amount" style={{ fontWeight: 'bold' }}>{formatCurrency(pumpRoomTotal)}</td>
              {columnVisibility.remarks && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const renderMepTable = () => {
    if (!filteredMepItems.length) return <div className="no-data-message">No MEP data available.</div>;

    const baseItems = filteredMepItems.filter(item => item.SlNo <= 29);
    const advancedItems = filteredMepItems.filter(item => item.SlNo >= 30 && item.SlNo <= 34);
    const hasOverflowGrating = poolType === "overflow";

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
        <div className="mep-table-section">
          <h3 className="mep-table-title">Base MEP Systems (Items 1-29)</h3>
          <div className="table-container">
            <table className="excel-preview-table responsive-table mep-table">
              <thead>
                <tr>
                  <th rowSpan="2">Sl.No</th>
                  {columnVisibility.code && <th rowSpan="2">Code</th>}
                  <th rowSpan="2">Description</th>
                  {columnVisibility.image && <th rowSpan="2">Image</th>}
                  {columnVisibility.unit && <th rowSpan="2">Unit</th>}
                  {columnVisibility.qty && <th rowSpan="2">QTY</th>}
                  {columnVisibility.fixedRate && <th colSpan="2">Rate ({getCurrencySymbol()})</th>}
                  <th colSpan="3">Amount ({getCurrencySymbol()})</th>
                  {columnVisibility.remarks && <th rowSpan="2">Remarks</th>}
                </tr>
                <tr>
                  {columnVisibility.fixedRate && (<><th>Supply</th><th>Installation</th></>)}
                  <th>Supply</th><th>Installation</th><th>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {baseItems.map((item) => {
                  const quantity = getMepQuantity(item.SlNo);
                  const supplyRate = getSupplyRate(item);
                  const installationRate = getInstallationRate(item);
                  const supplyCost = getSupplyCost(item, quantity);
                  const installationCost = getInstallationCost(item, quantity);
                  const totalAmount = getRowTotal(item, quantity);
                  const isZeroQuantity = quantity === 0;
                  const isOverflowGrating = hasOverflowGrating && item.SlNo === 11;
                  const isGutterDrain = hasOverflowGrating && item.SlNo === 13;
                  let description = getResolvedMepDescription(item.SlNo, item);

                  return (
                    <tr key={item.SlNo} className={isZeroQuantity ? 'zero-quantity-row' : ''}>
                      <td data-label="Sl.No">{item.SlNo}</td>
                      {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                      <td data-label="Description" className="description-cell">
                        {description}
                        {isOverflowGrating && (<div className="overflow-grating-badge"><small>⭐ Overflow Grating (replaces Skimmer)</small></div>)}
                        {isGutterDrain && (<div className="gutter-drain-badge"><small>Gutter Drain</small></div>)}
                        {(item.SlNo === 1 || item.SlNo === 7) && (
                          <div className="dynamic-rate-indicator">
                            <small>{dynamicRates.source === "mep_rates_exact" ? "✅ Exact match" : dynamicRates.source === "mep_rates_closest" ? "⚠️ Closest match" : "❌ No match - rate 0"}</small>
                          </div>
                        )}
                       </td>
                      {columnVisibility.image && (<td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image, item, "mep") : "-"}</td>)}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                      {columnVisibility.qty && (
                        <td data-label="QTY" className={quantity ? "quantity-filled" : ""}>
                          <input type="number" step="0.001" value={quantity} onChange={(e) => handleQtyChange("mep", item.SlNo, e.target.value)} className="qty-input" />
                        </td>
                      )}
                      {columnVisibility.fixedRate && (<><td data-label="Supply Rate">{formatCurrency(supplyRate)}</td><td data-label="Installation Rate">{formatCurrency(installationRate)}</td></>)}
                      <td data-label="Supply Cost">{formatCurrency(supplyCost)}</td>
                      <td data-label="Installation Cost">{formatCurrency(installationCost)}</td>
                      <td data-label="Total Amount" className="amount-cell">{formatCurrency(totalAmount)}</td>
                      {columnVisibility.remarks && (
                        <td data-label="Remarks" className="remarks-cell">
                          <textarea className="remarks-textbox" placeholder="Add remarks..." value={mepRemarks[item.SlNo] || ""} onChange={(e) => setMepRemarks(prev => ({ ...prev, [item.SlNo]: e.target.value }))} rows="2" />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="table-subtotal">
                  <td colSpan={getVisibleColumnCount() - 3} className="subtotal-label">Subtotal:</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(baseMepTotals.totalSupply)}</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(baseMepTotals.totalInstallation)}</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(baseMepTotals.grand)}</td>
                  {columnVisibility.remarks && <td className="subtotal-empty"></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="mep-table-section">
          <div className="mep-table-header">
            <h3 className="mep-table-title">Advanced Equipment (Items 30-34) - Optional</h3>
            <div className="advanced-equipment-controls">
              <button className="select-all-btn" onClick={handleSelectAllAdvanced}>
                {selectedAdvancedEquipment.length === 5 ? "Deselect All" : "Select All"}
              </button>
              <span className="selection-info">Selected: {selectedAdvancedEquipment.length} of 5</span>
            </div>
          </div>
          <div className="table-container">
            <table className="excel-preview-table responsive-table mep-table">
              <thead>
                <tr>
                  <th rowSpan="2">Select</th>
                  <th rowSpan="2">Sl.No</th>
                  {columnVisibility.code && <th rowSpan="2">Code</th>}
                  <th rowSpan="2">Description</th>
                  {columnVisibility.image && <th rowSpan="2">Image</th>}
                  {columnVisibility.unit && <th rowSpan="2">Unit</th>}
                  {columnVisibility.qty && <th rowSpan="2">QTY</th>}
                  {columnVisibility.fixedRate && <th colSpan="2">Rate ({getCurrencySymbol()})</th>}
                  <th colSpan="3">Amount ({getCurrencySymbol()})</th>
                  {columnVisibility.remarks && <th rowSpan="2">Remarks</th>}
                </tr>
                <tr>
                  {columnVisibility.fixedRate && (<><th>Supply</th><th>Installation</th></>)}
                  <th>Supply</th><th>Installation</th><th>Total</th>
                </tr>
              </thead>
              <tbody>
                {advancedItems.map((item) => {
                  const isSelected = selectedAdvancedEquipment.includes(item.SlNo);
                  const quantity = isSelected ? 1 : 0;
                  const supplyRate = getSupplyRate(item);
                  const installationRate = getInstallationRate(item);
                  const supplyCost = getSupplyCost(item, quantity);
                  const installationCost = getInstallationCost(item, quantity);
                  const totalAmount = getRowTotal(item, quantity);
                  const itemDescription = item.Description || item.description || "N/A";

                  return (
                    <tr key={item.SlNo} className={!isSelected ? 'equipment-not-selected' : ''}>
                      <td>
                        <input type="checkbox" checked={isSelected} onChange={() => handleAdvancedEquipmentToggle(item.SlNo)} />
                      </td>
                      <td data-label="Sl.No">{item.SlNo}</td>
                      {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                      <td data-label="Description" className="description-cell">{itemDescription}</td>
                      {columnVisibility.image && (<td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image, item, "mep") : "-"}</td>)}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                      {columnVisibility.qty && <td data-label="QTY">{isSelected ? "1" : "0"}</td>}
                      {columnVisibility.fixedRate && (<><td data-label="Supply Rate">{formatCurrency(supplyRate)}</td><td data-label="Installation Rate">{formatCurrency(installationRate)}</td></>)}
                      <td data-label="Supply Cost">{formatCurrency(supplyCost)}</td>
                      <td data-label="Installation Cost">{formatCurrency(installationCost)}</td>
                      <td data-label="Total Amount" className="amount-cell">{formatCurrency(totalAmount)}</td>
                      {columnVisibility.remarks && (
                        <td data-label="Remarks" className="remarks-cell">
                          <textarea className="remarks-textbox" placeholder="Add remarks..." value={mepRemarks[item.SlNo] || ""} onChange={(e) => setMepRemarks(prev => ({ ...prev, [item.SlNo]: e.target.value }))} rows="2" />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="table-subtotal">
                  <td colSpan={getVisibleColumnCount() - 2} className="subtotal-label">Subtotal:</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(advancedEquipmentTotals.totalSupply)}</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(advancedEquipmentTotals.totalInstallation)}</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(advancedEquipmentTotals.grand)}</td>
                  {columnVisibility.remarks && <td className="subtotal-empty"></td>}
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="advanced-equipment-info">
            <div className="info-box">
              <span className="info-icon">💡</span>
              <p><strong>Note:</strong> Advanced equipment items are optional. Only selected items will be included in the total cost.</p>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderPipingTable = () => {
    if (!selectedTables.piping) return <div className="no-data-message">Piping table is deselected for export.</div>;
    if (!resultData?.piping) return (
      <div className="error-message">
        <div className="warning-message"><span className="warning-icon">⚠️</span><strong>Piping data not available from backend.</strong></div>
        <button className="debug-toggle-btn" onClick={() => setShowRawData(!showRawData)}>{showRawData ? 'Hide' : 'Show'} Raw Response</button>
        {showRawData && <div className="raw-data-display"><pre>{JSON.stringify(resultData, null, 2)}</pre></div>}
      </div>
    );
    if (pipingItems.length === 0) return (
      <div className="no-data-message">
        <div className="info-message"><span className="info-icon">ℹ️</span><strong>No piping items found.</strong></div>
      </div>
    );

    const renderPipingSection = (title, items, icon) => {
      if (items.length === 0) return null;

      return (
        <div className="piping-section" key={title}>
          <h3 className="piping-section-title">{icon} {title} ({items.length})</h3>
          <div className="table-container">
            <table className="excel-preview-table responsive-table">
              <thead>
                <tr>
                  <th rowSpan="2">Sl.No</th>
                  {columnVisibility.code && <th rowSpan="2">Code</th>}
                  <th rowSpan="2">Description</th>
                  <th rowSpan="2">Dia (mm)</th>
                  {columnVisibility.qty && <th rowSpan="2">Qty</th>}
                  {columnVisibility.unit && <th rowSpan="2">Unit</th>}
                  {columnVisibility.fixedRate && <th colSpan="2">Rate ({getCurrencySymbol()})</th>}
                  <th colSpan="3">Amount ({getCurrencySymbol()})</th>
                  {columnVisibility.remarks && <th rowSpan="2">Remarks</th>}
                </tr>
                <tr>
                  {columnVisibility.fixedRate && <><th>Supply</th><th>Installation</th></>}
                  <th>Supply</th><th>Installation</th><th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const quantity = editablePipingQty[item.sl_no] !== undefined ? editablePipingQty[item.sl_no] : item.quantity;
                  const supplyCost = quantity * item.supply_rate;
                  const installationCost = quantity * item.installation_rate;
                  const total = supplyCost + installationCost;

                  return (
                    <tr key={`${item.sl_no}-${item.type}`} className={quantity === 0 ? 'zero-quantity-row' : ''}>
                      <td data-label="Sl.No">{item.sl_no}</td>
                      {columnVisibility.code && <td data-label="Code">{item.code || "-"}</td>}
                      <td data-label="Description" className="description-cell">{item.description || "-"}</td>
                      <td data-label="Dia (mm)">{item.dia !== undefined && item.dia !== null && item.dia !== 0 ? `${item.dia} mm` : "-"}</td>
                      {columnVisibility.qty && (
                        <td data-label="Qty" className={quantity ? "quantity-filled" : "quantity-zero"}>
                          <input type="number" step="0.001" value={quantity} onChange={(e) => handleQtyChange("piping", item.sl_no, e.target.value)} className="qty-input" />
                        </td>
                      )}
                      {columnVisibility.unit && <td data-label="Unit">{item.unit}</td>}
                      {columnVisibility.fixedRate && (<><td data-label="Supply Rate">{formatCurrency(item.supply_rate)}</td><td data-label="Installation Rate">{formatCurrency(item.installation_rate)}</td></>)}
                      <td data-label="Supply Cost">{formatCurrency(supplyCost)}</td>
                      <td data-label="Installation Cost">{formatCurrency(installationCost)}</td>
                      <td data-label="Total Amount" className="amount-cell">{formatCurrency(total)}</td>
                      {columnVisibility.remarks && (
                        <td data-label="Remarks" className="remarks-cell">
                          <textarea className="remarks-textbox" placeholder="Add remarks..." value={mepRemarks[`piping_${item.sl_no}`] || ""} onChange={(e) => setMepRemarks(prev => ({ ...prev, [`piping_${item.sl_no}`]: e.target.value }))} rows="2" />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="table-subtotal">
                  <td colSpan={calculatePipingColSpan()} style={{ textAlign: 'right', fontWeight: 'bold' }}>Section Total:</td>
                  <td className="amount-cell" style={{ fontWeight: 'bold' }}>{formatCurrency(items.reduce((sum, item) => {
                    const qty = editablePipingQty[item.sl_no] !== undefined ? editablePipingQty[item.sl_no] : item.quantity;
                    return sum + (qty * (item.supply_rate + item.installation_rate));
                  }, 0))}</td>
                  {columnVisibility.remarks && <td className="subtotal-empty"></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      );
    };

    return (
      <div className="piping-system-section">
        <div className="section-header">
          <h2 className="section-title">Piping System</h2>
          <div className="header-controls">
            <div className="total-amount-box"><span className="total-label">Grand Total:</span><span className="total-value">{formatCurrency(pipingTotals.grandTotal)}</span></div>
            <div className="item-count-badge">{pipingItems.length} items</div>
          </div>
        </div>

        <div className="piping-distance-input" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px", padding: "12px 15px", background: "rgba(99,179,237,0.08)", borderRadius: "8px", border: "1px solid rgba(99,179,237,0.2)" }}>
          <label style={{ fontWeight: "600", color: "#63b3ed" }}>Pump Room Distance (m):</label>
          <input type="number" min="1" step="1" value={pumpRoomDistance} onChange={(e) => setPumpRoomDistance(Number(e.target.value))} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ccc", width: "100px", background: "#fff", color: "#333" }} />
          <button onClick={handleDistanceSubmit} disabled={updatingDistance} style={{ padding: "6px 12px", background: "#007bff", color: "#fff", border: "none", borderRadius: "6px", cursor: updatingDistance ? "not-allowed" : "pointer", opacity: updatingDistance ? 0.7 : 1 }}>
            {updatingDistance ? "Updating..." : "Update"}
          </button>
          <div style={{ marginLeft: "auto", fontSize: "12px", color: "#888" }}>Current Distance: {pumpRoomDistance} m</div>
        </div>

        {renderPipingSection("Pipes", pipes, "🔧")}
        {renderPipingSection("Ball Valves", ballValves, "🔩")}
        {renderPipingSection("Puddle Flanges", puddleFlanges, "⭕")}
        {renderPipingSection("Headers", headers, "📐")}
        {renderPipingSection("Other Valves", otherValves, "🔧")}
        {renderPipingSection("Other Flanges", otherFlanges, "⭕")}

        <div className="boq-note">
          <div><strong>Note:</strong> Piping quantities are calculated based on pool dimensions, pump room distance, and MEP equipment quantities. Installation cost is 15% of supply cost. <strong>Items are sorted in ascending diameter order for proper BOQ format.</strong></div>
        </div>
      </div>
    );
  };

  const saveCalculation = () => {
    try {
      const newCalc = {
        id: Date.now(), timestamp: new Date().toISOString(),
        dimensions: dimensions ? `${dimensions.length} × ${dimensions.width} × ${dimensions.depth} m` : "N/A",
        poolType, constructionType, totalCost: grandTotal,
        mainPoolCost: mainPoolTotal, balanceTankCost: balanceTankTotal,
        pumpRoomCost: includePumpRoom ? pumpRoomTotal : 0, mepCost: totalMepCost,
        pipingCost: pipingTotals.grandTotal, includePumpRoom, includeHeatPump,
        selectedAdvancedEquipment, pumpRoomDistance,
      };
      const existing = JSON.parse(localStorage.getItem("saved_calculations") || "[]");
      const isDuplicate = existing.some(calc => JSON.stringify(calc.dimensions) === JSON.stringify(dimensions) && calc.poolType === poolType && calc.pumpRoomDistance === pumpRoomDistance);
      if (isDuplicate) { alert("⚠️ A calculation with these settings already exists!"); return; }
      const updated = [newCalc, ...existing].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
      localStorage.setItem("saved_calculations", JSON.stringify(updated));
      setSavedCalculations(updated);
      alert("✅ Calculation saved successfully!");
    } catch { alert("❌ Failed to save calculation."); }
  };

  const downloadPDF = async () => {
  try {
    if (!Object.values(selectedTables).some(Boolean)) {
      alert("⚠️ Please select at least one table to export!");
      return;
    }

    // ============================================================
    // STEP 1 — SAFE ARRAYS
    // ============================================================
    const safeMainPoolItems = Array.isArray(mainPoolItems)
      ? mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo])
      : [];

    const safeBalanceTankItems = Array.isArray(balanceTankItems)
      ? balanceTankItems.filter(
          item => item.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[item.SlNo]
        )
      : [];

    const safeMepItems   = Array.isArray(filteredMepItems) ? filteredMepItems : [];
    const safePumpRoomItems = Array.isArray(pumpRoomItems)  ? pumpRoomItems   : [];
    const safePipingItems   = Array.isArray(pipingItems)    ? pipingItems     : [];

    // ============================================================
    // STEP 2 — SAFE OBJECTS
    // ============================================================
    const safeCivilQuantities     = civilQuantities     || {};
    const safeMepQuantities        = mepQuantities       || {};
    const safeBalanceTankQuantities = balanceTankQuantities || {};
    const safePumpRoomQuantities   = pumpRoomQuantities  || {};
    const safeDynamicRates         = dynamicRates        || {};
    const safeCompanyProfile       = companyProfile      || {};

    // ============================================================
    // STEP 3 — DETECTED POOL / CONSTRUCTION TYPE
    // ============================================================
    const detectedPoolType =
      resultData?.pool_type ||
      resultData?.system_parameters?.pool_type ||
      poolType ||
      "overflow";

    const detectedConstructionType =
      resultData?.construction_type ||
      resultData?.constructionType ||
      constructionType ||
      "in-ground";

    // ============================================================
    // STEP 4 — EXCAVATION SPLIT (SlNo 1 sub-rows)
    // ============================================================
    const excavationSplit =
      safeCivilQuantities?.excavation_split ||
      safeCivilQuantities?.excavation_split_qty ||
      resultData?.civil_quantities?.excavation_split ||
      {};

    // ============================================================
    // STEP 5 — SHOTCRETING SPLIT (SlNo 10 → 10.1 / 10.2)
    //
    // Overflow backend stores this inside civil_quantities.
    // We set civilQuantities = civilData (raw data.civil_quantities)
    // for non-terrace, so safeCivilQuantities IS civil_quantities.
    //
    // Key priority:
    //   1. shotcreting_split  — overflow non-terrace standard key
    //   2. rcc_shuttering_split — overflow sometimes uses a combined split
    //   3. rcc_split            — skimmer fallback key
    //   4. resultData direct    — last resort
    // ============================================================
    const shotcretingSplit =
      safeCivilQuantities?.shotcreting_split        ||
      safeCivilQuantities?.rcc_shuttering_split     ||   // ← overflow may combine both here
      safeCivilQuantities?.rcc_split                ||
      resultData?.civil_quantities?.shotcreting_split ||
      resultData?.civil_quantities?.rcc_shuttering_split ||
      resultData?.shotcreting_split                 ||
      resultData?.rcc_subrows                       ||
      {};

    // ============================================================
    // STEP 6 — RCC SHUTTERING SPLIT (SlNo 9 → 9.1 / 9.2)
    //
    // Same logic — prefer the more specific key first.
    // ============================================================
    const rccShutteringSplit =
      safeCivilQuantities?.rcc_shuttering_split     ||
      safeCivilQuantities?.shuttering_split         ||
      safeCivilQuantities?.shotcreting_split        ||   // ← if backend uses one key for both
      resultData?.civil_quantities?.rcc_shuttering_split ||
      resultData?.civil_quantities?.shuttering_split ||
      resultData?.rcc_shuttering_split              ||
      resultData?.shuttering_subrows                ||
      {};

    // ============================================================
    // STEP 7 — DEBUG LOG (remove after confirming fix)
    // ============================================================
    console.log("=== OVERFLOW PDF SPLIT DEBUG ===");
    console.log("civilQuantities keys    :", Object.keys(safeCivilQuantities));
    console.log("excavationSplit         :", excavationSplit);
    console.log("shotcretingSplit (10.x) :", shotcretingSplit);
    console.log("rccShutteringSplit (9.x):", rccShutteringSplit);
    console.log("10.1 value              :", shotcretingSplit?.["10.1"]);
    console.log("10.2 value              :", shotcretingSplit?.["10.2"]);
    console.log("9.1  value              :", rccShutteringSplit?.["9.1"]);
    console.log("9.2  value              :", rccShutteringSplit?.["9.2"]);
    console.log("================================");

    // ============================================================
    // STEP 8 — CALL generatePDF
    // Note: shotcretingSplit and rccShutteringSplit MUST be passed
    // with exactly these key names — the safe wrapper in download.jsx
    // reads pdfData.shotcretingSplit and pdfData.rccShutteringSplit.
    // ============================================================
    await generatePDF({
      // ── Core ───────────────────────────────────────────────────
      resultData,
      poolType:          detectedPoolType,
      constructionType:  detectedConstructionType,
      dimensions:        dimensions          || {},
      pumpRoomDimensions: pumpRoomDimensions || {},

      // ── Main Pool Civil ────────────────────────────────────────
      mainPoolItems:     selectedTables.mainPool ? safeMainPoolItems : [],
      mainPoolTotal:     Number(mainPoolTotal || 0),
      civilQuantities:   safeCivilQuantities,
      mainPoolRemarks:   mainPoolRemarks || {},

      // ── Balance Tank ───────────────────────────────────────────
      hasBalancingTank:        true,
      balanceTankItems:        selectedTables.balancingTank ? safeBalanceTankItems : [],
      balanceTankQuantities:   safeBalanceTankQuantities,
      balanceTankTotal:        Number(balanceTankTotal || 0),
      balanceTankRemarks:      balanceTankRemarks || {},

      // ── MEP ────────────────────────────────────────────────────
      mepItems:        selectedTables.mep ? safeMepItems : [],
      mepQuantities:   safeMepQuantities,
      mepTotal:        Number(totalMepCost || 0),
      mepRemarks:      mepRemarks || {},

      // ── Pump Room ──────────────────────────────────────────────
      includePumpRoom:    selectedTables.pumpRoom ? (includePumpRoom || false) : false,
      pumpRoomItems:      selectedTables.pumpRoom ? safePumpRoomItems : [],
      pumpRoomQuantities: safePumpRoomQuantities,
      pumpRoomTotal:      selectedTables.pumpRoom ? Number(pumpRoomTotal || 0) : 0,
      pumpRoomRemarks:    pumpRoomRemarks || {},

      // ── Piping ─────────────────────────────────────────────────
      pipingItems:      selectedTables.piping ? safePipingItems : [],
      pipingTotal:      Number(pipingTotals?.grandTotal || 0),
      pumpRoomDistance: pumpRoomDistance || 15,

      // ── MEP Rates / Equipment ──────────────────────────────────
      dynamicRates:             safeDynamicRates,
      selectedAdvancedEquipment: selectedAdvancedEquipment || [],

      // ── Overflow specific ──────────────────────────────────────
      overflowGratingData:
        detectedPoolType === "overflow" ? overflowGratingData : null,

      // ── Display Options ────────────────────────────────────────
      templateDescriptions: templateDescriptions || {},
      selectedTables:       selectedTables       || {},
      columnVisibility:     columnVisibility     || {},
      currency:             currency             || "INR",
      exchangeRate:         exchangeRate         || 83,
      companyProfile:       safeCompanyProfile,

      // ── SPLIT DATA — exact key names required by generatePDF ───
      shotcretingSplit:  shotcretingSplit,    // SlNo 10 → 10.1 / 10.2
      rccShutteringSplit: rccShutteringSplit, // SlNo 9  → 9.1  / 9.2

      // ── Extra refs (used by excavation sub-rows) ───────────────
      excavationSplit:  excavationSplit,
      excavationRates:  excavationRates || [],
    });

  } catch (error) {
    console.error("❌ Overflow PDF Error:", error);
    alert("PDF generation failed. Check console.");
  }
};

  // ============================================================
  // MAIN RETURN WITH COLLAPSIBLE SIDEBAR
  // ============================================================
  return (
    <div className="result-page">
      <style>{`
        .qty-input {
          width: 90px;
          min-width: 90px;
          padding: 6px 8px;
          border: 1px solid #cfd8dc;
          border-radius: 6px;
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          background: #fff;
          transition: all 0.2s ease;
        }
        .qty-input:focus {
          outline: none;
          border-color: #1976d2;
          box-shadow: 0 0 4px rgba(25,118,210,0.3);
        }
        .subrow-input {
          background: #f8f9fa;
        }
        .quantity-filled input {
          background: #f1fff3;
        }
      `}</style>

      <header className="header-section">
        <div className="page-header">
          <div className="header-content">
            <h1>Overflow Pool Calculation Results</h1>
            <p className="subtitle" style={{ color: "gray" }}>A detailed summary of your Overflow Pool's construction, MEP components, piping system, and cost estimates</p>
          </div>
          <div className="header-currency-toggle">
            <CurrencyToggle />
            <button onClick={() => setSaveOpen(true)} style={{ padding: "10px 20px", background: "#4CAF50", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer" }}>💾 Save Project</button>
          </div>
        </div>
      </header>

      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}

      <div className="results-dashboard-layout">
        <aside className={`results-sidebar${sidebarCollapsed ? " collapsed" : ""}`}>
          <button className="sidebar-toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <span className="toggle-arrow">{sidebarCollapsed ? "→" : "←"}</span>
          </button>
          <div className="sidebar-inner">
            <div className="sidebar-divider" />
            <h3 style={{ marginBottom: "3%", color: "gray" }}>Views</h3>
            <div className="sidebar-tab-buttons">
              {[
                { id: 1, icon: "📊", label: "Calculation & 3D" },
                { id: 2, icon: "🏊", label: `Civil Work (${mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo]).length})` },
                { id: 6, icon: "⚖️", label: `Balance Tank (${balanceTankItems.filter(item => item.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[item.SlNo]).length})` },
                { id: 5, icon: "⚙️", label: `Pump Room (${balanceTankItems.filter(item => item.SlNo <= 12 && PUMP_ROOM_QTY_FIELDS[item.SlNo]).length})` },
                { id: 4, icon: "🔧", label: "MEP Amount" },
                { id: "piping", icon: "🔩", label: `Piping (${pipingItems.length})` },
                { id: "total", icon: "💰", label: "Total Cost" },
                { id: "visualization", icon: "📈", label: "Visualization" },
                { id: 3, icon: "📅", label: "Timeline" }
              ].map(tab => (
                <button key={tab.id} className={`sidebar-tab-btn ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)} data-tooltip={tab.label}>
                  <span className="sidebar-tab-icon">{tab.icon}</span>
                  <span className="tab-label-text">{tab.label}</span>
                </button>
              ))}
            </div>
            <h3 style={{ marginBottom: "3%", color: "gray" }}>Actions</h3>
            <div className="sidebar-actions">
              <button
                className="sidebar-action-btn primary-btn"
                data-tooltip="Download PDF Report"
                onClick={downloadPDF}
              >
                📄 Download PDF
              </button>
              <button className="sidebar-action-btn" onClick={() => setShowExcelExportModal(true)} data-tooltip="Export Excel">
                <span className="sidebar-tab-icon">📊</span>
                <span className="btn-text">Export Excel</span>
              </button>
              <button className="sidebar-action-btn" onClick={() => setShowShareModal(true)} data-tooltip="Share Project">
                <span className="sidebar-tab-icon">🔗</span>
                <span className="btn-text">Share Project</span>
              </button>
              <button className="sidebar-action-btn" onClick={() => setShowComparison(true)} data-tooltip="Compare">
                <span className="sidebar-tab-icon">⚖</span>
                <span className="btn-text">Compare</span>
              </button>
              <button className="sidebar-action-btn proforma-btn" onClick={() => navigate("/proformainvoice", {
                state: {
                  resultData, dimensions,
                  mainPoolTotal, mepTotal: totalMepCost,
                  pipingTotal: pipingTotals?.grandTotal || 0,
                  pumpRoomTotal: includePumpRoom ? pumpRoomTotal : 0,
                  balanceTankTotal: balanceTankTotal || 0,
                  grandTotal,
                  poolType: "overflow",
                  includePumpRoom,
                  hasBalancingTank: true,
                  selectedAdvancedEquipment,
                  includeHeatPump,
                  companyProfile,
                  currency,
                  exchangeRate,
                  dynamicRates,
                  pumpRoomDistance,
                  filteredMainPoolItems: mainPoolItems || [],
                  filteredMepItems: filteredMepItems || [],
                  pumpRoomItems: balanceTankItems || [],
                  balanceTankItems: balanceTankItems || [],
                  pipingItems: resultData?.piping || [],
                  mainPoolRemarks,
                  mepRemarks,
                  pumpRoomRemarks,
                  templateDescriptions: {},
                  civilQuantities: civilQuantities || resultData,
                  mepQuantities: mepQuantities || resultData,
                  pumpRoomQuantities: pumpRoomQuantities || resultData,
                  balanceTankQuantities: balanceTankQuantities || resultData,
                  selectedTables,
                  columnVisibility
                }
              })} data-tooltip="Proforma Invoice">
                <span className="sidebar-tab-icon">📄</span>
                <span className="btn-text">Proforma Invoice</span>
              </button>
              <button className="sidebar-action-btn" onClick={() => navigate("/delivery", {
                state: {
                  result: { ...resultData, ...civilQuantities, ...mepQuantities, ...pumpRoomQuantities },
                  dimensions,
                  filteredMainPoolItems: mainPoolItems || [],
                  filteredMepItems: filteredMepItems || [],
                  balanceTankItems: balanceTankItems || [],
                  pumpRoomItems: selectedTables.pumpRoom ? balanceTankItems : [],
                  pipingItems: selectedTables.piping ? pipingItems : [],
                  pipingTotal: selectedTables.piping ? (pipingTotals?.grandTotal || 0) : 0,
                  pumpRoomQuantities,
                  pumpRoomDimensions,
                  templateDescriptions: {},
                  poolType: 'overflow',
                  hasBalancingTank: true,
                  hasGutter: true,
                  includePumpRoom: selectedTables.pumpRoom || false,
                  selectedTables,
                  selectedAdvancedEquipment,
                  overflowGratingData,
                  constructionType
                }
              })} data-tooltip="Delivery Challan">
                <span className="sidebar-tab-icon">📦</span>
                <span className="btn-text">Delivery Challan</span>
              </button>
              <button className="sidebar-action-btn" onClick={() => navigate("/tax", {
                state: {
                  result: resultData,
                  dimensions,
                  mainPoolData: selectedTables.mainPool ? mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo]) : [],
                  mepItems: selectedTables.mep ? filteredMepItems : [],
                  pumpRoomData: selectedTables.pumpRoom ? balanceTankItems.filter(item => item.SlNo <= 12 && PUMP_ROOM_QTY_FIELDS[item.SlNo]) : [],
                  mainPoolTotal: mainPoolTotal || 0,
                  mepTotal: totalMepCost || 0,
                  pumpRoomTotal: includePumpRoom ? pumpRoomTotal : 0,
                  balanceTankTotal: balanceTankTotal || 0,
                  pipingItems: selectedTables.piping ? pipingItems : [],
                  pipingTotal: selectedTables.piping ? pipingTotals.grandTotal : 0,
                  templateDescriptions: {},
                  poolType: 'overflow',
                  includePumpRoom,
                  currency,
                  exchangeRate,
                  selectedTables,
                  constructionType,
                  finalTotal: grandTotal,
                  selectedAdvancedEquipment,
                  percentageAmounts: { item35: 0, item36: 0, item37: 0, item38: 0 },
                  overflowGratingData: poolType === "overflow" ? overflowGratingData : null
                }
              })} data-tooltip="Tax Invoice">
                <span className="sidebar-tab-icon">🧾</span>
                <span className="btn-text">Tax Invoice</span>
              </button>
              <button className="sidebar-action-btn save-project-btn" onClick={() => setSaveOpen(true)} data-tooltip="Save Project">
                <span className="sidebar-tab-icon">💾</span>
                <span className="btn-text">Save Project</span>
              </button>
            </div>
          </div>
          <div className="sidebar-footer">
            <button className="back-to-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} data-tooltip="Back to Top">
              <span className="top-icon">↑</span>
              <span className="top-text">Back to Top</span>
            </button>
          </div>
        </aside>

        <div className="results-main-content">
          {activeTab === 1 && (
            <section className="tab-content active">
              {loadingCalc ? (
                <div className="loading-spinner">Loading calculation data...</div>
              ) : !resultData ? (
                <div className="error-message">No calculation data available.</div>
              ) : (
                <>
                  <div className="section-header">
                    <h2 className="section-title">Pool Specifications</h2>
                    <div className="header-controls"><ConstructionTypeDisplay /></div>
                  </div>
                  <div className="specs-controls"><DatabaseUpdateToggle /></div>
                  <HPOverrideDisplay />
                  <div className="specs-container_1">
                    <div className="specs-table-container">
                      <div className="specs-table-wrapper">
                        <table className="excel-preview-table">
                          <tbody>
                            <tr><td className="spec-label"><strong>Dimensions</strong></td><td className="spec-value">{resultData.dimensions || `${dimensions.length || 0} × ${dimensions.width || 0} × ${dimensions.depth || 0} m`}</td></tr>
                            <tr><td className="spec-label"><strong>Volume</strong></td><td className="spec-value">{safeToFixed(resultData.volume_m3 || (dimensions.length * dimensions.width * dimensions.depth))} m³ ({safeToFixed(resultData.liters || (dimensions.length * dimensions.width * dimensions.depth * 1000), 0)} L)</td></tr>
                            <tr><td className="spec-label"><strong>Floor Area</strong></td><td className="spec-value">{safeToFixed(resultData.floor_area_m2 || (dimensions.length * dimensions.width))} m²</td></tr>
                            <tr><td className="spec-label"><strong>Wall Area</strong></td><td className="spec-value">{safeToFixed(resultData.wall_area_m2 || (2 * (dimensions.length + dimensions.width) * dimensions.depth))} m²</td></tr>
                            <tr><td className="spec-label"><strong>Turnover Time</strong></td><td className="spec-value">{safeToFixed(resultData.turnover_hours || turnover || 4.5)} hours</td></tr>
                            <tr><td className="spec-label"><strong>Flow Rate</strong></td><td className="spec-value">{safeToFixed(resultData.flowrate_m3_per_hr || ((dimensions.length * dimensions.width * dimensions.depth) / 4.5))} m³/hr</td></tr>
                            <tr><td className="spec-label"><strong>Filter Diameter</strong></td><td className="spec-value">{resultData.filter_dia_mm || dynamicRates.filter_dia || "N/A"} mm</td></tr>
                            <tr><td className="spec-label"><strong>Pump Capacity</strong></td><td className="spec-value">{resultData.hp || dynamicRates.hp || "N/A"} HP{dynamicRates.hp_overridden && <span className="hp-override-indicator"> (from DB)</span>}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div className="preview-section" style={{ flex: 1, minWidth: 0 }}>
                    <div className="preview-header" style={{ marginBottom: "14px" }}>
                      <h3 className="preview-title" style={{ margin: 0 }}>3D Pool Visualization</h3>
                    </div>
                    <PoolVisualization3D dimensions={dimensions} />
                  </div>
                </>
              )}
            </section>
          )}

          {activeTab === 2 && (
            <section className="tab-content active">
              <div className="section-header">
                <h2>Civil Works - Main Pool (Items 1-14)</h2>
                <div className="header-controls">
                  <div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(mainPoolTotal)}</span></div>
                </div>
              </div>
              {loadingMainPool ? <div className="loading-spinner">Loading data...</div> : <>{renderMainPoolTable()}<div className="boq-note"><div><strong>Note:</strong> Estimates based on current industry standards. Actual costs may vary ±10–15%.{constructionType === "terrace" && <div className="terrace-note"><strong>Terrace Pool Note:</strong> Excludes excavation, soling, and backfilling items.</div>}</div><div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}><strong>New Items:</strong> Consolidation (SlNo 3) - Backfill compaction | Disposal (SlNo 4) - Excess soil removal</div><div style={{ marginTop: "8px", fontSize: "12px", color: "#666", fontStyle: "italic" }}><strong>Split Items:</strong> All subrows (1.1/1.2, 9.1/9.2, 10.1/10.2) — descriptions and rates sourced from excavation_rates table</div></div></>}
            </section>
          )}

          {activeTab === 3 && (
            <section className="tab-content active">
              <Timeline poolSize={dimensions} resultData={resultData} currency={currency} exchangeRate={exchangeRate} includePumpRoom={includePumpRoom} pumpRoomDimensions={pumpRoomDimensions} constructionType={constructionType} selectedAdvancedEquipment={selectedAdvancedEquipment} columnVisibility={columnVisibility} selectedTables={selectedTables} filteredMepItems={filteredMepItems} hasBalancingTank={true} balanceTankDimensions={balanceTankDimensions} pipingItems={pipingItems} pipingTotal={pipingTotals.grandTotal} />
            </section>
          )}

          {activeTab === 4 && (
            <section className="tab-content active">
              <div className="section-header">
                <h2>MEP (Mechanical, Electrical, Plumbing) Items</h2>
                <div className="header-controls">
                  <ConstructionTypeDisplay />
                  <div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(totalMepCost)}</span></div>
                </div>
              </div>
              {loadingMep ? <div className="loading-spinner">Loading MEP data...</div> : !Array.isArray(filteredMepItems) || filteredMepItems.length === 0 ? (
                <div className="error-message">No MEP items available.</div>
              ) : (
                <>
                  {loadingMepCalculation && <div className="calculation-status"><span className="status-icon">⏳</span><span>Calculating MEP quantities...</span></div>}
                  {renderMepTable()}
                  <div className="mep-grand-total">
                    <div className="grand-total-box">
                      <div className="total-breakdown">
                        <div className="breakdown-item"><span className="breakdown-label">Base MEP (Items 1-29):</span><span className="breakdown-value">{formatCurrency(baseMepTotals.grand)}</span></div>
                        <div className="breakdown-item"><span className="breakdown-label">Advanced Equipment (Items 30-34):</span><span className="breakdown-value">{formatCurrency(advancedEquipmentTotals.grand)}</span></div>
                        <div className="breakdown-total" style={{ color: "white" }}><span className="breakdown-label">Total MEP Cost:</span><span className="breakdown-value" style={{ color: "white" }}>{formatCurrency(totalMepCost)}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="boq-note"><div><strong>Note:</strong> Estimates based on current industry standards. Actual costs may vary ±10–15%.</div></div>
                </>
              )}
            </section>
          )}

          {activeTab === 5 && (
            <section className="tab-content active">
              <div className="section-header">
                <h2>Civil Works - Pump Room (12 Items)</h2>
                <div className="header-controls">
                  <div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(pumpRoomTotal)}</span></div>
                </div>
              </div>
              {renderPumpRoomTable()}
              <div className="boq-note"><div><strong>Note:</strong> Pump room quantities are calculated as 15% of main pool quantities. Variations of ±10–15% are common.</div></div>
            </section>
          )}

          {activeTab === 6 && (
            <section className="tab-content active">
              <div className="section-header">
                <h2>Civil Works - Balance Tank (12 Items)</h2>
                <div className="header-controls">
                  <div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(balanceTankTotal)}</span></div>
                </div>
              </div>
              {renderBalanceTankTable()}
              <div className="boq-note"><div><strong>Note:</strong> Balance tank quantities are 7.5% of main pool quantities for in-ground pools. Terrace pools have 0 balance tank quantities.</div></div>
            </section>
          )}

          {activeTab === "piping" && (
            <section className="tab-content active">
              {renderPipingTable()}
            </section>
          )}

          {activeTab === "total" && (
            <section className="tab-content active">
              <div className="section-header">
                <h2 className="section-title">Total Pool Cost Summary</h2>
                <div className="header-controls"><ConstructionTypeDisplay /></div>
              </div>
              <div className="summary-cards">
                <div className="summary-card"><div className="summary-icon">🏊</div><div className="summary-details"><h3>Main Pool (Civil Works)</h3><p className="summary-amount">{formatCurrency(mainPoolTotal)}</p><p className="summary-items">14 items</p></div></div>
                <div className="summary-card"><div className="summary-icon">⚖️</div><div className="summary-details"><h3>Balance Tank</h3><p className="summary-amount">{formatCurrency(balanceTankTotal)}</p><p className="summary-items">12 items</p></div></div>
                {includePumpRoom && (<div className="summary-card"><div className="summary-icon">⚙️</div><div className="summary-details"><h3>Pump Room</h3><p className="summary-amount">{formatCurrency(pumpRoomTotal)}</p><p className="summary-items">12 items</p></div></div>)}
                <div className="summary-card"><div className="summary-icon">🔧</div><div className="summary-details"><h3>MEP Systems</h3><p className="summary-amount">{formatCurrency(totalMepCost)}</p><p className="summary-items">34 items</p></div></div>
                <div className="summary-card"><div className="summary-icon">🔩</div><div className="summary-details"><h3>Piping System</h3><p className="summary-amount">{formatCurrency(pipingTotals.grandTotal)}</p><p className="summary-items">{pipingItems.length} items</p></div></div>
              </div>
              <div className="grand-total_1">
                <h3>Grand Total</h3>
                {(() => { const gstAmount = grandTotal * 0.18; const grandTotalWithGST = grandTotal + gstAmount; return (
                  <>
                    <div className="amount-breakdown_1"><div className="breakdown-item_1"><span>Subtotal (All Items):</span><span>{formatCurrency(grandTotal)}</span></div><div className="breakdown-item_1"><span>GST (18%):</span><span>{formatCurrency(gstAmount)}</span></div></div>
                    <div className="grand-total-amount_1">{formatCurrency(grandTotalWithGST)}<span className="gst-label_1"> (incl. GST)</span></div>
                  </>
                ); })()}
                <p className="grand-total-note_1">Includes {constructionType === "terrace" ? "structural civil works" : "complete civil works with excavation"}, MEP equipment{selectedAdvancedEquipment.length > 0 ? " (with selected advanced equipment)" : ""}, complete piping system, balance tank, and pump room construction<br /><span className="gst-note_1">All prices include 18% GST as per applicable tax regulations</span></p>
              </div>
            </section>
          )}

          {activeTab === "visualization" && (
            <section className="tab-content active">
              <div className="section-header">
                <h2 className="section-title">Cost Breakdown Visualization</h2>
                <div className="header-controls"><ConstructionTypeDisplay /></div>
              </div>
              <CostBreakdownChart
                mainPoolCost={mainPoolTotal}
                mepCost={totalMepCost || 0}
                balancingTankCost={balanceTankTotal}
                pumpRoomCost={includePumpRoom ? pumpRoomTotal : 0}
                pipingCost={pipingTotals.grandTotal}
                currency={currency}
                exchangeRate={exchangeRate}
                includePumpRoom={includePumpRoom}
                hasBalancingTank={true}
                constructionType={constructionType}
                selectedAdvancedEquipment={selectedAdvancedEquipment}
                advancedEquipmentTotal={advancedEquipmentTotal}
                columnVisibility={columnVisibility}
                selectedTables={selectedTables}
                filteredMepItems={filteredMepItems}
                overflowGratingData={poolType === "overflow" ? overflowGratingData : null}
                pipingItems={pipingItems}
              />
            </section>
          )}
        </div>
      </div>

      {imageModal.show && (
        <div className="image-modal-overlay" onClick={() => setImageModal({ show: false, src: "" })}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setImageModal({ show: false, src: "" })}>×</button>
            <img src={imageModal.src} alt="Enlarged view" className="image-modal-image" />
          </div>
        </div>
      )}

      {showComparison && (
        <ComparisonTool
          currentData={resultData}
          currentTotal={grandTotal}
          savedCalculations={savedCalculations}
          onClose={() => setShowComparison(false)}
          hasBalancingTank={true}
          mainPoolCost={mainPoolTotal}
          balancingTankCost={balanceTankTotal}
          pumpRoomCost={includePumpRoom ? pumpRoomTotal : 0}
          mepCost={totalMepCost}
          pipingCost={pipingTotals.grandTotal}
          mainPoolRemarks={mainPoolRemarks}
          balancingTankRemarks={balanceTankRemarks}
          mepRemarks={mepRemarks}
          pumpRoomRemarks={pumpRoomRemarks}
          templateDescriptions={{}}
          currentRates={dynamicRates}
          currency={currency}
          exchangeRate={exchangeRate}
          includePumpRoom={includePumpRoom}
          pumpRoomDimensions={pumpRoomDimensions}
          constructionType={constructionType}
          selectedAdvancedEquipment={selectedAdvancedEquipment}
          columnVisibility={columnVisibility}
          selectedTables={selectedTables}
          filteredMepItems={filteredMepItems}
          overflowGratingData={poolType === "overflow" ? overflowGratingData : null}
          pipingItems={pipingItems}
          pipingTotal={pipingTotals.grandTotal}
          pumpRoomDistance={pumpRoomDistance}
        />
      )}

      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="share-modal-close" onClick={() => setShowShareModal(false)}>✕</button>
            <ShareResults
              resultData={resultData}
              mainPoolData={selectedTables.mainPool ? mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo]) : []}
              mepItems={selectedTables.mep ? filteredMepItems : []}
              balancingRows={selectedTables.balancingTank ? balanceTankItems.filter(item => item.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[item.SlNo]) : []}
              balanceTankData={selectedTables.balancingTank ? balanceTankItems.filter(item => item.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[item.SlNo]) : []}
              pumpRoomData={selectedTables.pumpRoom ? balanceTankItems.filter(item => item.SlNo <= 12 && PUMP_ROOM_QTY_FIELDS[item.SlNo]) : []}
              dimensions={dimensions}
              totalMep={selectedTables.mep ? totalMepCost : 0}
              mainPoolTotal={selectedTables.mainPool ? mainPoolTotal : 0}
              balancingTankTotal={selectedTables.balancingTank ? balanceTankTotal : 0}
              balanceTankTotal={selectedTables.balancingTank ? balanceTankTotal : 0}
              pumpRoomTotal={selectedTables.pumpRoom && includePumpRoom ? pumpRoomTotal : 0}
              pipingTotal={selectedTables.piping ? pipingTotals.grandTotal : 0}
              finalTotal={grandTotal}
              hasBalancingTank={true}
              poolType="overflow"
              constructionType={constructionType}
              mainPoolRemarks={mainPoolRemarks}
              mepRemarks={mepRemarks}
              balancingTankRemarks={balanceTankRemarks}
              balanceTankRemarks={balanceTankRemarks}
              pumpRoomRemarks={pumpRoomRemarks}
              templateDescriptions={templateDescriptions || {}}
              civilQuantities={civilQuantities}
              mepQuantities={mepQuantities}
              pumpRoomQuantities={pumpRoomQuantities}
              dynamicRates={dynamicRates}
              currency={currency}
              exchangeRate={exchangeRate}
              includePumpRoom={selectedTables.pumpRoom ? includePumpRoom : false}
              selectedAdvancedEquipment={selectedAdvancedEquipment}
              columnVisibility={columnVisibility}
              selectedTables={selectedTables}
              apiBaseUrl={`${API_BASE_URL}/admin`}
              pipingItems={selectedTables.piping ? pipingItems : []}
              filteredMepItems={selectedTables.mep ? filteredMepItems : []}
            />
          </div>
        </div>
      )}

      {showExcelExportModal && (
        <div className="excel-export-modal-overlay" onClick={() => setShowExcelExportModal(false)}>
          <div className="excel-export-modal" onClick={e => e.stopPropagation()}>
            <div className="excel-export-header"><h2>📊 Export Excel Report</h2><button className="close-modal-btn" onClick={() => setShowExcelExportModal(false)}>✕</button></div>
            <div className="excel-export-body">
              <div className="export-section"><ColumnVisibilityControls /></div>
              <div className="export-section"><TableSelectionControls /></div>
            </div>
            <div className="excel-export-footer">
              <button className="cancel-export-btn" onClick={() => setShowExcelExportModal(false)}>Cancel</button>
              <ExcelDownloadButton
                resultData={resultData}
                mainPoolData={selectedTables.mainPool ? mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo]) : []}
                mepItems={selectedTables.mep ? filteredMepItems : []}
                dimensions={dimensions}
                totalMep={selectedTables.mep ? totalMepCost : 0}
                mainPoolTotal={selectedTables.mainPool ? mainPoolTotal : 0}
                balancingRows={selectedTables.balancingTank ? balanceTankItems : []}
                balancingTankTotal={selectedTables.balancingTank ? balanceTankTotal : 0}
                poolType="overflow"
                hasBalancingTank={true}
                includePumpRoomExcel={selectedTables.pumpRoom ? includePumpRoom : false}
                mainPoolRemarks={mainPoolRemarks}
                balancingTankRemarks={balanceTankRemarks}
                mepRemarks={mepRemarks}
                pumpRoomRemarks={pumpRoomRemarks}
                templateDescriptions={{}}
                totalMepWithFittings={selectedTables.mep ? totalMepCost : 0}
                currentRates={dynamicRates}
                currency={currency}
                exchangeRate={exchangeRate}
                pumpRoomDimensions={pumpRoomDimensions}
                pumpRoomQuantities={pumpRoomQuantities}
                constructionType={constructionType}
                pumpRoomTotal={selectedTables.pumpRoom && includePumpRoom ? pumpRoomTotal : 0}
                pumpRoomRemarksExcel={pumpRoomRemarks}
                selectedAdvancedEquipment={selectedAdvancedEquipment}
                pumpRoomData={selectedTables.pumpRoom ? balanceTankItems : []}
                pumpRoomRows={[]}
                columnVisibility={columnVisibility}
                selectedTables={selectedTables}
                poolTypeForFilter="overflow"
                overflowGratingData={poolType === "overflow" ? overflowGratingData : null}
                pipingItems={selectedTables.piping ? pipingItems : []}
                pipingTotal={selectedTables.piping ? pipingTotals.grandTotal : 0}
                civilQuantities={civilQuantities}
                balanceTankQuantities={balanceTankQuantities}
                mepQuantities={mepQuantities}
                dynamicRates={dynamicRates}
                balancingTankDimensions={balanceTankDimensions}
                balanceTankItems={balanceTankItems}
                hasGutter={true}
                companyProfile={companyProfile}
                editableCivilQty={editableCivilQty}
                editableBalanceQty={editableBalanceQty}
                editablePumpRoomQty={editablePumpRoomQty}
                editableMepQty={editableMepQty}
                editablePipingQty={editablePipingQty}
                editableSubRowQty={editableSubRowQty}
                onDownloadComplete={() => setShowExcelExportModal(false)}
                className="excel-export-btn"
              >
                <span className="download-icon">📊</span> Download Excel
              </ExcelDownloadButton>
            </div>
          </div>
        </div>
      )}

      <SaveProjectModal open={saveOpen} onClose={() => setSaveOpen(false)} resultData={resultDataForSave} dimensions={dimensions} projectType="overflow" />
    </div>
  );
}

export default ResultPage;