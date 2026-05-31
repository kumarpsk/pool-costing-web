import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

// SUB-ROW STRUCTURE
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

// Tenant auth helper
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
    "X-Tenant-ID": tenantId
  };
}

function safeToFixed(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return Number(value).toFixed(decimals);
}

// Piping item mapper
const mapPipingItem = (item, index) => {
  const sl_no = Number(item.SlNo ?? item.sl_no ?? index + 1);
  const type = String(item.Type ?? item.type ?? "").trim();
  const category = String(item.Category ?? item.category ?? "").toLowerCase().trim();
  const code = String(item.Code ?? item.code ?? "").trim();
  const description = String(item.Description ?? item.description ?? "").trim();
  const unit = String(item.Unit ?? item.unit ?? "").trim();
  let dia = item.Dia ?? item.dia;
  if (dia !== undefined && dia !== null) dia = Number(dia);
  let quantity = Number(item.Quantity ?? item.quantity ?? 0);
  let rate = Number(item.Rate ?? item.rate ?? 0);
  const supply_rate = rate;
  const installation_rate = rate * INSTALLATION_PERCENT;
  const supply_cost = quantity * supply_rate;
  const installation_cost = quantity * installation_rate;
  const total = supply_cost + installation_cost;
  let finalUnit = unit;
  if (!finalUnit) {
    if (["ball_valve", "puddle_flange", "valve", "flange"].includes(category))
      finalUnit = "Nos";
    else if (["pipe", "header"].includes(category)) finalUnit = "Mtrs";
    else finalUnit = "Nos";
  }
  let finalDescription = description;
  if (!finalDescription) {
    if (category === "puddle_flange") finalDescription = `${dia || ""}mm Puddle Flange`;
    else if (category === "ball_valve") finalDescription = `${dia || ""}mm Ball Valve`;
    else if (category === "pipe") finalDescription = `${dia || ""}mm Pipe`;
    else if (category === "header") finalDescription = `${dia || ""}mm Header`;
    else finalDescription = type || "N/A";
  }
  return {
    sl_no,
    type,
    category,
    code,
    description: finalDescription,
    dia,
    unit: finalUnit,
    quantity,
    rate,
    supply_rate,
    installation_rate,
    supply_cost,
    installation_cost,
    total
  };
};

// 3D Visualization Component
function PoolVisualization3D({ dimensions }) {
  const [viewMode, setViewMode] = useState("embed");
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const { length = 0, width = 0, depth = 0 } = dimensions || {};
  const buildUrl = () => {
    const params = new URLSearchParams();
    if (length) params.set("length", length);
    if (width) params.set("width", width);
    if (depth) params.set("depth", depth);
    const q = params.toString();
    return q ? `${VISUALIZATION_3D_URL}?${q}` : VISUALIZATION_3D_URL;
  };
  const url = buildUrl();
  const handleFullscreen = () => {
    setViewMode("fullscreen");
    setShowDisclaimer(false);
  };
  const handleExitFullscreen = () => setViewMode("embed");
  const handleOpenExternal = () => window.open(url, "_blank", "noopener,noreferrer");
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
          <iframe src={url} title="3D Pool Viz Full" style={{ width: "100%", height: "100%", border: "none" }} allow="accelerometer; autoplay; camera; fullscreen; gyroscope; xr-spatial-tracking" allowFullScreen />
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
        <div style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(251,191,36,0.05) 100%)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "10px", padding: "12px 16px", marginBottom: "14px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <span style={{ fontSize: "16px", flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "12px", color: "#f59e0b", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "4px" }}>Reference Only — Not Your Actual Project</div>
            <div style={{ fontSize: "12px", color: "rgba(238, 134, 6, 0.93)", lineHeight: 1.5 }}>This 3D visualization is a <strong>general conceptual model</strong> generated for reference purposes only.</div>
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
        <iframe src={url} title="3D Pool Viz" style={{ width: "100%", height: "460px", border: "none", display: "block", opacity: iframeLoaded ? 1 : 0, transition: "opacity 0.4s ease" }} onLoad={() => setIframeLoaded(true)} onError={() => setIframeError(true)} allow="accelerometer; autoplay; camera; fullscreen; gyroscope; xr-spatial-tracking" allowFullScreen sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-top-navigation" />
      </div>
    </div>
  );
}

function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // --- All original state declarations (kept exactly as before) ---
  const initialState = location.state?.result || null;
  const [resultData, setResultData] = useState(initialState);
  const [dimensions, setDimensions] = useState(location.state?.dimensions || {});
  const [poolType, setPoolType] = useState(location.state?.poolType || "skimmer");
  const [constructionType, setConstructionType] = useState(
    location.state?.constructionType ||
    location.state?.result?.construction_type ||
    location.state?.result?.pool_type ||
    "in-ground"
  );
  const [mainPoolItems, setMainPoolItems] = useState([]);
  const [mepItems, setMepItems] = useState([]);
  const [balanceTankItems, setBalanceTankItems] = useState([]);
  const [excavationRates, setExcavationRates] = useState([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [showExcelExportModal, setShowExcelExportModal] = useState(false);
  const [civilQuantities, setCivilQuantities] = useState({});
  const [mepQuantities, setMepQuantities] = useState({});
  const [pumpRoomQuantities, setPumpRoomQuantities] = useState({});
  const [pumpRoomDimensions, setPumpRoomDimensions] = useState({});
  const [includePumpRoom, setIncludePumpRoom] = useState(true);
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
    filter_dia: null
  });
  const [loadingMainPool, setLoadingMainPool] = useState(true);
  const [loadingMep, setLoadingMep] = useState(true);
  const [loadingBalanceTank, setLoadingBalanceTank] = useState(true);
  const [loadingMepCalculation, setLoadingMepCalculation] = useState(false);
  const [loadingCalc, setLoadingCalc] = useState(!initialState);
  const [templateDescriptions, setTemplateDescriptions] = useState({});
  const [savedCalculations, setSavedCalculations] = useState([]);
  const [mainPoolRemarks, setMainPoolRemarks] = useState({});
  const [mepRemarks, setMepRemarks] = useState({});
  const [pumpRoomRemarks, setPumpRoomRemarks] = useState({});
  const [includeHeatPump, setIncludeHeatPump] = useState(false);
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
  const [currency, setCurrency] = useState("INR");
  const [columnVisibility, setColumnVisibility] = useState({
    image: true,
    unit: true,
    qty: true,
    fixedRate: true,
    remarks: true,
    code: true
  });
  const [selectedTables, setSelectedTables] = useState({
    mainPool: true,
    pumpRoom: true,
    mep: true,
    piping: true
  });
  const [showRawData, setShowRawData] = useState(false);
  const [pumpRoomDistance, setPumpRoomDistance] = useState(15);
  const [updatingDistance, setUpdatingDistance] = useState(false);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [workingDays, setWorkingDays] = useState(0);
  const [completeProjectSnapshot, setCompleteProjectSnapshot] = useState(null);
  const [editableCivilQty, setEditableCivilQty] = useState({});
  const [editableMepQty, setEditableMepQty] = useState({});
  const [editablePumpRoomQty, setEditablePumpRoomQty] = useState({});
  const [editablePipingQty, setEditablePipingQty] = useState({});
  const [editableSubRowQty, setEditableSubRowQty] = useState({});
  // Sidebar collapsed state (new)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ================================
  // STEP 1: ADD VOLUME CHECK FOR IMAGE OVERRIDE
  // ================================
  const shouldUseLargePoolImages = useMemo(() => {
    const length = Number(dimensions?.length || 0);
    const width = Number(dimensions?.width || 0);
    const depth = Number(dimensions?.depth || 0);
    const volume = length * width * depth;

    console.log("SKIMMER POOL VOLUME:", volume);
    console.log("VOLUME THRESHOLD CHECK:", volume >= 500 ? "LARGE POOL - Use override images" : "SMALL/MEDIUM POOL - Use database images");

    return volume >= 500;
  }, [dimensions]);

  // ================================
  // STEP 2: CREATE IMAGE OVERRIDE FUNCTION
  // ================================
  const getSkimmerMepImage = (item) => {
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

  // --- Helper functions (unchanged) ---
  const getBackRoute = () => {
    switch (poolType) {
      case "overflow": return "/overflow";
      case "infinity": return "/infinity";
      case "curved": return "/curved";
      case "waterbody": return "/water-body";
      case "jacuzzi": return "/jacuzzi-spa";
      default: return "/skimmer";
    }
  };

  const handleQtyChange = (type, key, value) => {
    const qty = Number(value) || 0;
    switch (type) {
      case "civil": setEditableCivilQty(prev => ({ ...prev, [key]: qty })); break;
      case "mep": setEditableMepQty(prev => ({ ...prev, [key]: qty })); break;
      case "pump": setEditablePumpRoomQty(prev => ({ ...prev, [key]: qty })); break;
      case "piping": setEditablePipingQty(prev => ({ ...prev, [key]: qty })); break;
      case "subrow": setEditableSubRowQty(prev => ({ ...prev, [key]: qty })); break;
      default: break;
    }
  };

  const MAIN_POOL_QTY_FIELDS = {
    1: "EarthExcavation_QTY", 2: "BackFilling_QTY", 3: "Consolidation_QTY", 4: "Disposal_QTY",
    5: "Soling_QTY", 6: "plaincement_QTY", 7: "BurntBrick_QTY", 8: "steelreinforcement_QTY",
    9: "Shuttering_QTY", 10: "shotcreting_QTY", 11: "WaterProofing_QTY", 12: "plastering_QTY",
    13: "Coping_QTY", 14: "Tiling_QTY"
  };
  const MEP_QTY_FIELDS = {
    1: "Filter_QTY", 2: "Glass_QTY", 3: "Pressure_QTY", 4: "Filter_Drain_QTY", 5: "Mpv_QTY",
    6: "Mpv_connset_QTY", 7: "Cpump_QTY", 8: "Return_Inlets_QTY", 9: "MainDrain_QTY",
    10: "Vaccume_Inlets_QTY", 11: "Skimmer_QTY", 12: "FloatValve_QTY", 13: "GutterDrain_QTY",
    14: "Underwaterlight_QTY", 15: "Transformer_QTY", 16: "ControlPanel_QTY", 17: "Cables_QTY",
    18: "Earthing_QTY", 19: "ChlorinePump_QTY", 20: "DosingTank_QTY", 21: "Stirrer_QTY",
    22: "FloatingHose_QTY", 23: "Brush_QTY", 24: "Algae_QTY", 25: "Net_QTY", 26: "Handle_QTY",
    27: "VacuumHead_QTY", 28: "TestKit_QTY", 29: "CurvedBrush_QTY", 30: "HeatPump_QTY",
    31: "PoolHeater_QTY", 32: "Chiller_QTY", 33: "Ozonator_QTY", 34: "SaltChlorinator_QTY"
  };
  const PUMP_ROOM_QTY_FIELDS = {
    1: "EarthExcavation_QTY_2", 2: "BackFilling_QTY_2", 3: "Consolidation_QTY_2", 4: "Disposal_QTY_2",
    5: "Soling_QTY_2", 6: "plaincement_QTY_2", 7: "BurntBrick_QTY_2", 8: "steelreinforcement_QTY_2",
    9: "Shuttering_QTY_2", 10: "shotcreting_QTY_2", 11: "WaterProofing_QTY_2", 12: "plastering_QTY_2"
  };

  const filteredMainPoolItems = useMemo(() => {
    if (!Array.isArray(mainPoolItems)) return [];
    return mainPoolItems.filter(item => item.SlNo >= 1 && item.SlNo <= 14);
  }, [mainPoolItems]);

  const pumpRoomItems = useMemo(() => {
    if (!Array.isArray(mainPoolItems)) return [];
    return mainPoolItems.filter(item => [1,2,3,4,5,6,7,8,9,10,11,12].includes(item.SlNo));
  }, [mainPoolItems]);

  const pipingItems = useMemo(() => {
    if (!resultData?.piping || !Array.isArray(resultData.piping)) return [];
    return resultData.piping.map((item, idx) => mapPipingItem(item, idx));
  }, [resultData]);

  const pipes = useMemo(() => pipingItems.filter(i => i.category === "pipe"), [pipingItems]);
  const ballValves = useMemo(() => pipingItems.filter(i => i.category === "ball_valve"), [pipingItems]);
  const puddleFlanges = useMemo(() => pipingItems.filter(i => i.category === "puddle_flange"), [pipingItems]);
  const headers = useMemo(() => pipingItems.filter(i => i.category === "header"), [pipingItems]);
  const otherValves = useMemo(() => pipingItems.filter(i => i.category === "valve"), [pipingItems]);
  const otherFlanges = useMemo(() => pipingItems.filter(i => i.category === "flange"), [pipingItems]);

  const pipingTotals = useMemo(() => {
    const total = pipes.reduce((s,i)=>s+i.total,0) + ballValves.reduce((s,i)=>s+i.total,0) +
      puddleFlanges.reduce((s,i)=>s+i.total,0) + headers.reduce((s,i)=>s+i.total,0) +
      otherValves.reduce((s,i)=>s+i.total,0) + otherFlanges.reduce((s,i)=>s+i.total,0);
    return { totalSupply: total, totalInstallation: 0, grandTotal: total };
  }, [pipes, ballValves, puddleFlanges, headers, otherValves, otherFlanges]);

  const getSupplyRate = (item) => {
    if (item.SlNo === 1) return dynamicRates.filter_rate ?? 0;
    if (item.SlNo === 7) return dynamicRates.pump_rate ?? 0;
    return item.Rate ?? 0;
  };
  const getInstallationRate = (item) => getSupplyRate(item) * INSTALLATION_PERCENT;
  const getSupplyCost = (item, qty) => qty * getSupplyRate(item);
  const getInstallationCost = (item, qty) => qty * getInstallationRate(item);
  const getRowTotal = (item, qty) => getSupplyCost(item, qty) + getInstallationCost(item, qty);

  const filteredMepItems = useMemo(() => {
    if (!Array.isArray(mepItems)) return [];
    return mepItems.filter(item => item.SlNo !== 13 && item.SlNo < 35);
  }, [mepItems]);

  const excavationRateMap = useMemo(() => {
    const map = {};
    excavationRates.forEach(item => {
      const key = String(item.code ?? item.Code ?? "").trim();
      if (key) map[key] = item;
    });
    return map;
  }, [excavationRates]);

  const getExcavationRate = (subSlNo) => {
    const key = String(subSlNo).trim();
    const entry = excavationRateMap[key];
    return entry ? Number(entry.rate ?? entry.Rate ?? 0) : 0;
  };
  const getSplitQty = (splitData, subSlNo) => {
    if (!splitData) return 0;
    const entry = splitData[String(subSlNo).trim()];
    if (entry === undefined) return 0;
    if (typeof entry === "number") return entry;
    if (typeof entry === "object") return Number(entry.qty ?? entry.Qty ?? entry.quantity ?? entry.Quantity ?? 0);
    return Number(entry) || 0;
  };

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("columnVisibility") || "null");
    if (saved) setColumnVisibility(saved);
    const savedTables = JSON.parse(localStorage.getItem("selectedTables") || "null");
    if (savedTables) setSelectedTables(savedTables);
    const savedAdv = JSON.parse(localStorage.getItem("selectedAdvancedEquipment") || "[]");
    if (savedAdv) setSelectedAdvancedEquipment(savedAdv);
    const savedUpdate = localStorage.getItem("updateDatabase");
    if (savedUpdate !== null) setUpdateDatabase(savedUpdate === "true");
    const savedCalc = JSON.parse(localStorage.getItem("saved_calculations") || "[]");
    setSavedCalculations(savedCalc);
    const savedDist = localStorage.getItem("pumpRoomDistance");
    if (savedDist !== null) setPumpRoomDistance(Number(savedDist));
  }, []);

  useEffect(() => localStorage.setItem("columnVisibility", JSON.stringify(columnVisibility)), [columnVisibility]);
  useEffect(() => localStorage.setItem("selectedTables", JSON.stringify(selectedTables)), [selectedTables]);
  useEffect(() => localStorage.setItem("selectedAdvancedEquipment", JSON.stringify(selectedAdvancedEquipment)), [selectedAdvancedEquipment]);
  useEffect(() => localStorage.setItem("updateDatabase", updateDatabase.toString()), [updateDatabase]);
  useEffect(() => localStorage.setItem("pumpRoomDistance", pumpRoomDistance.toString()), [pumpRoomDistance]);

  const toggleColumnVisibility = (col) => setColumnVisibility(prev => ({ ...prev, [col]: !prev[col] }));
  const resetColumnVisibility = () => setColumnVisibility({ image: true, unit: true, qty: true, fixedRate: true, remarks: true, code: true });
  const toggleTableSelection = (tbl) => setSelectedTables(prev => ({ ...prev, [tbl]: !prev[tbl] }));
  const selectAllTables = () => setSelectedTables({ mainPool: true, pumpRoom: true, mep: true, piping: true });
  const deselectAllTables = () => setSelectedTables({ mainPool: false, pumpRoom: false, mep: false, piping: false });
  const toggleDropdown = (name) => setOpenDropdown(openDropdown === name ? null : name);
  const handleAdvancedEquipmentToggle = (slNo) => setSelectedAdvancedEquipment(prev => prev.includes(slNo) ? prev.filter(id => id !== slNo) : [...prev, slNo]);
  const handleSelectAllAdvanced = () => {
    const adv = [30,31,32,33,34];
    if (selectedAdvancedEquipment.length === adv.length) setSelectedAdvancedEquipment([]);
    else setSelectedAdvancedEquipment(adv);
  };

  const fetchRealTimeExchangeRate = async () => {
    setLoadingExchangeRate(true);
    setExchangeRateError(null);
    try {
      const apis = ["https://api.exchangerate-api.com/v4/latest/INR", "https://open.er-api.com/v6/latest/INR", "https://api.frankfurter.app/latest?from=INR"];
      let found = false;
      for (const api of apis) {
        try {
          const controller = new AbortController();
          const to = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(api, { signal: controller.signal });
          clearTimeout(to);
          if (!res.ok) continue;
          const data = await res.json();
          let usd = data.rates?.USD || data.rates?.usd || data.conversion_rates?.USD;
          if (usd && usd > 0) {
            setExchangeRate(1 / usd);
            setLastExchangeUpdate(new Date());
            found = true;
            break;
          }
        } catch (e) { continue; }
      }
      if (!found) {
        setExchangeRate(83.0);
        setLastExchangeUpdate(new Date());
        setExchangeRateError("Using fallback rate: 1 USD = 83.0 INR");
      }
    } catch (err) {
      setExchangeRate(83.0);
      setLastExchangeUpdate(new Date());
      setExchangeRateError("Failed to fetch exchange rates. Using fallback rate.");
    } finally {
      setLoadingExchangeRate(false);
    }
  };

  const formatCurrency = (amount, curr = currency) => {
    if (curr === "USD") return `$${safeToFixed(amount / exchangeRate, 2)}`;
    return `₹${safeToFixed(amount)}`;
  };
  const getCurrencySymbol = () => (currency === "USD" ? "$" : "₹");
  const handleCurrencyToggle = () => setCurrency(prev => prev === "INR" ? "USD" : "INR");

  // Fetch company profile etc. (truncated for brevity, but kept as in original)
  useEffect(() => {
    const fetchCompany = async () => {
      const code = localStorage.getItem("tenant_company_code");
      if (!code) return;
      try {
        const res = await fetch(`${API_BASE_URL}/admin/tenant/public-profile?company_code=${code}`);
        const data = await res.json();
        if (data.success && data.data) setCompanyProfile(data.data);
      } catch (e) { console.error(e); }
    };
    fetchCompany();
  }, []);

  // Fetch main pool, mep, balance tank, excavation rates (same as original)
  useEffect(() => {
    const fetchMain = async () => {
      setLoadingMainPool(true);
      try {
        const headers = getTenantAuthHeaders(navigate);
        const res = await fetch(`${API_BASE_URL}/admin/main_pool`, { headers });
        if (!res.ok) throw new Error("HTTP error");
        const data = await res.json();
        setMainPoolItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.message !== "AUTH_MISSING") console.error(err);
        setMainPoolItems([]);
      } finally { setLoadingMainPool(false); }
    };
    fetchMain();
  }, [navigate]);

  useEffect(() => {
    const fetchMep = async () => {
      setLoadingMep(true);
      try {
        const headers = getTenantAuthHeaders(navigate);
        const res = await fetch(`${API_BASE_URL}/admin/mep`, { headers });
        if (!res.ok) throw new Error("HTTP error");
        const data = await res.json();
        setMepItems(Array.isArray(data) ? data : (data?.items || data?.mep_items || []));
      } catch (err) {
        if (err.message !== "AUTH_MISSING") console.error(err);
        setMepItems([]);
      } finally { setLoadingMep(false); }
    };
    fetchMep();
  }, [navigate]);

  useEffect(() => {
    const fetchBalance = async () => {
      setLoadingBalanceTank(true);
      try {
        const headers = getTenantAuthHeaders(navigate);
        const res = await fetch(`${API_BASE_URL}/admin/balancetank`, { headers });
        if (!res.ok) throw new Error("HTTP error");
        const data = await res.json();
        setBalanceTankItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.message !== "AUTH_MISSING") console.error(err);
        setBalanceTankItems([]);
      } finally { setLoadingBalanceTank(false); }
    };
    fetchBalance();
  }, [navigate]);

  useEffect(() => {
    const fetchExc = async () => {
      try {
        const headers = getTenantAuthHeaders(navigate);
        const res = await fetch(`${API_BASE_URL}/skimmer/excavation-rates`, { headers });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        const ratesData = data.rates || data;
        let arr = [];
        if (ratesData && typeof ratesData === "object" && !Array.isArray(ratesData)) {
          arr = Object.entries(ratesData).map(([code, val]) => ({
            code,
            description: val.description || `Excavation ${code}`,
            rate: val.rate ?? val,
            unit: val.unit || "CUM"
          }));
        } else arr = Array.isArray(ratesData) ? ratesData : [];
        setExcavationRates(arr);
      } catch (err) {
        if (err.message !== "AUTH_MISSING") console.error(err);
        setExcavationRates([]);
      }
    };
    fetchExc();
  }, [navigate]);

  const fetchMepCalculation = async (distanceOverride = null) => {
    if (!dimensions.length || !dimensions.width || !dimensions.depth) return;
    setMepQuantities({});
    setCivilQuantities({});
    setLoadingMepCalculation(true);
    const dist = distanceOverride !== null ? distanceOverride : pumpRoomDistance;
    try {
      const headers = getTenantAuthHeaders(navigate);
      const url = `${API_BASE_URL}/skimmer/calculations/mep/${dimensions.length}/${dimensions.width}/${dimensions.depth}?include_pump_room=${includePumpRoom}&construction_type=${constructionType}&turnover=4.5&update_database=${updateDatabase}&pump_room_distance=${dist}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("HTTP error");
      const data = await res.json();
      if (!data.success) return;
      setResultData(data);
      if (data.civil_quantities) {
        setCivilQuantities({
          EarthExcavation_QTY: data.civil_quantities.EarthExcavation_QTY || 0,
          BackFilling_QTY: data.civil_quantities.BackFilling_QTY || 0,
          Consolidation_QTY: data.civil_quantities.Consolidation_QTY || 0,
          Disposal_QTY: data.civil_quantities.Disposal_QTY || 0,
          Soling_QTY: data.civil_quantities.Soling_QTY || 0,
          plaincement_QTY: data.civil_quantities.plaincement_QTY || 0,
          BurntBrick_QTY: data.civil_quantities.BurntBrick_QTY || 0,
          steelreinforcement_QTY: data.civil_quantities.steelreinforcement_QTY || 0,
          Shuttering_QTY: data.civil_quantities.Shuttering_QTY || 0,
          shotcreting_QTY: data.civil_quantities.shotcreting_QTY || 0,
          WaterProofing_QTY: data.civil_quantities.WaterProofing_QTY || 0,
          plastering_QTY: data.civil_quantities.plastering_QTY || 0,
          Coping_QTY: data.civil_quantities.Coping_QTY || 0,
          Tiling_QTY: data.civil_quantities.Tiling_QTY || 0,
          excavation_split: data.civil_quantities.excavation_split || {},
          shuttering_split: data.shuttering_subrows || {},
          rcc_split: data.rcc_subrows || {}
        });
      }
      if (data.quantities) setMepQuantities(data.quantities);
      if (data.system_parameters) {
        setDynamicRates({
          filter_rate: data.system_parameters.filter_rate ?? 0,
          pump_rate: data.system_parameters.pump_rate ?? 0,
          filter_description: data.system_parameters.filter_description || "",
          pump_description: data.system_parameters.pump_description || "",
          source: data.system_parameters.rate_source || "no_match",
          exact_match: data.system_parameters.rate_source === "mep_rates_exact",
          hp_overridden: data.system_parameters.hp_overridden || false,
          original_hp: data.system_parameters.original_hp || null,
          hp_from_db: data.system_parameters.pump_hp || data.system_parameters.hp_from_db || null,
          hp: data.system_parameters.pump_hp || data.system_parameters.hp,
          filter_dia: data.system_parameters.filter_diameter,
          database_updated: data.system_parameters.database_updated || false,
          rate_source_note: data.system_parameters.rate_source === "mep_rates_exact" ? "Rates from mep_rates table - saved to mep_tenant_data" : data.system_parameters.rate_source === "mep_rates_closest" ? "Using closest match from mep_rates table" : "No match found - rates set to 0"
        });
      }
      if (data.heat_pump_selection) setIncludeHeatPump(data.heat_pump_selection.available || false);
      if (includePumpRoom) {
        setPumpRoomQuantities(data.pump_room_quantities || {});
        if (data.pump_room_calculation) {
          setPumpRoomDimensions({
            length: data.pump_room_calculation.pr_length_2,
            width: data.pump_room_calculation.pr_width_2,
            height: data.pump_room_calculation.pr_height_2
          });
        }
      }
      if (data.working_days) setWorkingDays(data.working_days);
    } catch (err) {
      if (err.message !== "AUTH_MISSING") console.error(err);
    } finally {
      setLoadingMepCalculation(false);
    }
  };

  useEffect(() => {
    if (!resultData?.mep?.length || !mepItems.length) return;
    setMepItems(prev => prev.map(item => {
      const calcItem = resultData.mep.find(m => (m.SlNo ?? m.sl_no) === item.SlNo);
      if (calcItem?.Description && !calcItem.Description.includes("{{")) return { ...item, Description: calcItem.Description };
      return item;
    }));
  }, [resultData?.mep, mepItems.length]);

  const handleDistanceSubmit = async () => {
    if (!dimensions.length || !dimensions.width || !dimensions.depth) {
      alert("Pool dimensions are required to update piping.");
      return;
    }
    setUpdatingDistance(true);
    try { await fetchMepCalculation(pumpRoomDistance); }
    catch (err) { console.error(err); alert("Failed to update with new distance."); }
    finally { setUpdatingDistance(false); }
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      if (dimensions.length && dimensions.width && dimensions.depth) {
        try {
          const headers = getTenantAuthHeaders(navigate);
          const res = await fetch(`${API_BASE_URL}/skimmer/templates/${dimensions.length}/${dimensions.width}/${dimensions.depth}`, { headers });
          const data = await res.json();
          if (data.templates) setTemplateDescriptions(data.templates);
        } catch (err) { if (err.message !== "AUTH_MISSING") console.error(err); }
      }
    };
    fetchTemplates();
  }, [dimensions, navigate]);

  useEffect(() => {
    if (dimensions.length && dimensions.width && dimensions.depth) fetchMepCalculation();
  }, [dimensions.length, dimensions.width, dimensions.depth, includePumpRoom, constructionType, updateDatabase]);

  useEffect(() => {
    fetchRealTimeExchangeRate();
    const interval = setInterval(fetchRealTimeExchangeRate, 3600000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (!e.target.closest(".dropdown")) setOpenDropdown(null); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const getCivilQuantity = (slNo) => {
    if (editableCivilQty[slNo] !== undefined) return Number(editableCivilQty[slNo]);
    const field = MAIN_POOL_QTY_FIELDS[slNo];
    if (!field) return 0;
    if (civilQuantities[field] !== undefined) return Number(civilQuantities[field]);
    if (resultData?.[field] !== undefined) return Number(resultData[field]);
    if (mepQuantities[field] !== undefined) return Number(mepQuantities[field]);
    return 0;
  };
  const getMepQuantity = (slNo) => {
    if (editableMepQty[slNo] !== undefined) return Number(editableMepQty[slNo]);
    const field = MEP_QTY_FIELDS[slNo];
    if (!field) return 0;
    if (slNo === 13) return 0;
    if (slNo >= 30 && slNo <= 34) return selectedAdvancedEquipment.includes(slNo) ? 1 : 0;
    if (slNo === 30 && !includeHeatPump) return 0;
    if (mepQuantities[field] !== undefined) return mepQuantities[field];
    if (resultData?.[field] !== undefined) return resultData[field];
    return 0;
  };
  const getPumpRoomQty = (slNo) => {
    if (editablePumpRoomQty[slNo] !== undefined) return Number(editablePumpRoomQty[slNo]);
    const key = PUMP_ROOM_QTY_FIELDS[slNo];
    if (!key) return 0;
    if (pumpRoomQuantities[key] !== undefined) return Number(pumpRoomQuantities[key]);
    if (civilQuantities[key] !== undefined) return Number(civilQuantities[key]);
    if (resultData?.[key] !== undefined) return Number(resultData[key]);
    if (resultData?.civil_quantities?.[key] !== undefined) return Number(resultData.civil_quantities[key]);
    return 0;
  };

  const mainPoolTotal = useMemo(() => {
    if (!filteredMainPoolItems.length) return 0;
    let total = 0;
    filteredMainPoolItems.forEach(item => {
      const sl = item.SlNo;
      if (sl === 1) {
        const split = civilQuantities?.excavation_split || {};
        total += (split["1.1"]?.amount || 0) + (split["1.2"]?.amount || 0);
      } else if (MAIN_POOL_QTY_FIELDS[sl]) {
        total += getCivilQuantity(sl) * (item.Rate || 0);
      }
    });
    return total;
  }, [filteredMainPoolItems, civilQuantities, resultData, editableCivilQty]);

  const baseMepTotals = useMemo(() => {
    let supply = 0, install = 0;
    filteredMepItems.forEach(item => {
      if (item.SlNo >= 30) return;
      const qty = getMepQuantity(item.SlNo);
      supply += qty * getSupplyRate(item);
      install += qty * getInstallationRate(item);
    });
    return { totalSupply: supply, totalInstallation: install, grand: supply + install };
  }, [filteredMepItems, mepQuantities, resultData, dynamicRates, includeHeatPump, selectedAdvancedEquipment, editableMepQty]);

  const advancedEquipmentTotals = useMemo(() => {
    let supply = 0, install = 0;
    filteredMepItems.forEach(item => {
      if (item.SlNo >= 30 && item.SlNo <= 34 && selectedAdvancedEquipment.includes(item.SlNo)) {
        supply += getSupplyRate(item);
        install += getInstallationRate(item);
      }
    });
    return { totalSupply: supply, totalInstallation: install, grand: supply + install };
  }, [filteredMepItems, selectedAdvancedEquipment, dynamicRates]);

  const pumpRoomTotal = useMemo(() => {
    if (!includePumpRoom) return 0;
    let total = 0;
    pumpRoomItems.forEach(item => {
      total += getPumpRoomQty(item.SlNo) * (item.Rate || 0);
    });
    return total;
  }, [pumpRoomItems, pumpRoomQuantities, includePumpRoom, resultData, editablePumpRoomQty]);

  const totalMepCost = baseMepTotals.grand + advancedEquipmentTotals.grand;
  const grandTotal = mainPoolTotal + totalMepCost + (includePumpRoom ? pumpRoomTotal : 0) + pipingTotals.grandTotal;

  useEffect(() => {
    const vol = dimensions.length * dimensions.width * dimensions.depth;
    const flow = vol / 4.5;
    setCompleteProjectSnapshot({
      project_type: poolType,
      construction_type: constructionType,
      main_pool_total: mainPoolTotal,
      balance_tank_total: 0,
      pump_room_total: includePumpRoom ? pumpRoomTotal : 0,
      mep_total: totalMepCost,
      piping_total: pipingTotals.grandTotal,
      working_days: workingDays,
      pool_specification: { length: dimensions.length || 0, width: dimensions.width || 0, depth: dimensions.depth || 0, volume: vol, flow_rate: flow },
      grand_total: grandTotal,
      timestamp: new Date().toISOString(),
      pump_room_distance: pumpRoomDistance,
      selected_advanced_equipment: selectedAdvancedEquipment,
      include_pump_room: includePumpRoom,
      currency,
      exchange_rate: exchangeRate
    });
  }, [poolType, constructionType, mainPoolTotal, pumpRoomTotal, totalMepCost, pipingTotals.grandTotal, workingDays, dimensions, grandTotal, includePumpRoom, pumpRoomDistance, selectedAdvancedEquipment, currency, exchangeRate]);

  const CurrencyToggle = () => (
    <div className="currency-toggle_1">
      <label className="currency-toggle-label_1">
        <span className="currency-label_1">Currency:</span>
        <div className="toggle-switch_1">
          <input type="checkbox" checked={currency === "USD"} onChange={handleCurrencyToggle} className="toggle-checkbox_1" />
          <span className="toggle-slider_1">
            <span className="toggle-inr_1">₹ INR</span>
            <span className="toggle-usd_1">$ USD</span>
          </span>
        </div>
      </label>
      <div className="exchange-rate-info_1">
        {loadingExchangeRate ? (
          <div className="rate-loading_1"><span className="loading-spinner-small_1"></span>Loading exchange rate...</div>
        ) : (
          <>
            <div className="rate-display_1"><span className="rate-value_1">1 USD = {safeToFixed(exchangeRate, 2)} INR</span></div>
            {lastExchangeUpdate && (
              <div className="rate-meta_1">
                <span className="rate-update-time_1">Updated: {lastExchangeUpdate.toLocaleTimeString()}</span>
                {exchangeRateError && <span className="rate-error_1">⚠️ Using fallback rate</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const PoolTypeDisplay = () => (
    <div className="pool-type-display">
      <div className={`pool-type-badge ${constructionType}`}>
        {constructionType === "terrace" ? (
          <><span className="pool-type-icon">🏢</span>Terrace Pool</>
        ) : (
          <><span className="pool-type-icon">⛰️</span>In-Ground Pool</>
        )}
      </div>
    </div>
  );

  const HPOverrideDisplay = () => {
    if (!dynamicRates.hp_overridden) return null;
    return (
      <div className="hp-override-info">
        <span className="info-icon">ℹ️</span>
        <span className="hp-override-text">Pump HP overridden from database: {dynamicRates.original_hp} HP → {dynamicRates.hp_from_db} HP</span>
      </div>
    );
  };

  const ColumnVisibilityControls = () => (
    <div className="column-visibility-controls_1">
      <div className="visibility-header">
        <span className="visibility-title">Column Visibility:</span>
        <button className="reset-visibility-btn" onClick={resetColumnVisibility}>Reset All</button>
      </div>
      <div className="visibility-checkboxes">
        {[
          { key: "image", label: "Image" }, { key: "unit", label: "Unit" }, { key: "qty", label: "QTY" },
          { key: "fixedRate", label: "Fixed Rate" }, { key: "code", label: "Code" }, { key: "remarks", label: "Remarks" }
        ].map(({ key, label }) => (
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
        <label className="selection-checkbox">
          <input type="checkbox" checked={selectedTables.mainPool} onChange={() => toggleTableSelection("mainPool")} />
          <span className="checkbox-label">Main Pool</span>
          <span className="table-count">({filteredMainPoolItems.length} items)</span>
        </label>
        <label className="selection-checkbox">
          <input type="checkbox" checked={selectedTables.pumpRoom} onChange={() => toggleTableSelection("pumpRoom")} />
          <span className="checkbox-label">Pump Room</span>
          <span className="table-count">({pumpRoomItems.length} items)</span>
        </label>
        <label className="selection-checkbox">
          <input type="checkbox" checked={selectedTables.mep} onChange={() => toggleTableSelection("mep")} />
          <span className="checkbox-label">MEP Systems</span>
          <span className="table-count">({filteredMepItems.length} items)</span>
        </label>
        <label className="selection-checkbox">
          <input type="checkbox" checked={selectedTables.piping} onChange={() => toggleTableSelection("piping")} />
          <span className="checkbox-label">Piping System</span>
          <span className="table-count">({pipingItems.length} items)</span>
        </label>
      </div>
    </div>
  );

  // ================================
  // STEP 3: UPDATED renderImage FUNCTION WITH TABLE-SPECIFIC OVERRIDE
  // ================================
  const renderImage = (imageData, item = null, tableType = "default") => {
    // Only apply overrides for MEP table
    const overrideImage = tableType === "mep" ? getSkimmerMepImage(item) : null;

    const imageSource = overrideImage || imageData;

    if (!imageSource) return "-";

    let fullPath = "";

    if (imageSource.startsWith("/")) {
      fullPath = imageSource;
    } else {
      fullPath = `${API_BASE_URL}/admin/static/${imageSource}`;
    }

    return (
      <img
        src={fullPath}
        className="item-image"
        alt="item"
        loading="lazy"
        onClick={() => setImageModal({ show: true, src: fullPath })}
        onError={(e) => {
          console.log("FAILED IMAGE:", fullPath);
          e.target.style.display = "none";
        }}
      />
    );
  };

  const getDescriptionWithTemplate = (item) => {
    if (templateDescriptions?.[item.SlNo]) return templateDescriptions[item.SlNo];
    return item.Description || "Description not available";
  };

  const calculateColSpan = () => {
    let col = 2;
    if (columnVisibility.code) col++;
    if (columnVisibility.image) col++;
    if (columnVisibility.unit) col++;
    if (columnVisibility.qty) col++;
    if (columnVisibility.fixedRate) col++;
    col++;
    return col;
  };

  const calculatePipingColSpan = () => {
    let col = 2;
    if (columnVisibility.code) col++;
    col++;
    if (columnVisibility.qty) col++;
    if (columnVisibility.unit) col++;
    if (columnVisibility.fixedRate) col += 2;
    col += 3;
    if (columnVisibility.remarks) col++;
    return col;
  };

  // ========== RENDER FUNCTIONS ==========
  const renderMainPoolTable = () => {
    if (!filteredMainPoolItems.length) return <div className="no-data-message">No main pool data available.</div>;
    const excavationSplit = civilQuantities?.excavation_split || {};
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
            {filteredMainPoolItems.flatMap(item => {
              const sl = item.SlNo;
              const rows = [];
              rows.push(
                <tr key={`main-${sl}`} className="main-row">
                  <td data-label="Sl.No"><strong>{sl}</strong></td>
                  {columnVisibility.code && <td data-label="Code">{item.Code || ""}</td>}
                  <td data-label="Description" className="description-cell"><strong>{getDescriptionWithTemplate(item)}</strong></td>
                  {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image, item, "civil") : "-"}</td>}
                  {columnVisibility.unit && <td data-label="Unit"><strong>{item.Unit || ""}</strong></td>}
                  {columnVisibility.qty && <td data-label="QTY">—</td>}
                  {columnVisibility.fixedRate && <td data-label="Fixed Rate">—</td>}
                  <td data-label="Amount" className="amount-cell">—</td>
                  {columnVisibility.remarks && <td data-label="Remarks" className="remarks-cell"><textarea className="remarks-textbox" placeholder="Add remarks..." value={mainPoolRemarks[sl] || ""} onChange={e => setMainPoolRemarks(prev => ({ ...prev, [sl]: e.target.value }))} rows="2" /></td>}
                </tr>
              );
              if (SUB_ROWS[sl]) {
                SUB_ROWS[sl].forEach(sub => {
                  let qty = 0;
                  if (sl === 1) qty = getSplitQty(excavationSplit, sub.slNo);
                  else if (sl === 9) qty = getSplitQty(civilQuantities?.shuttering_split, sub.slNo);
                  else if (sl === 10) qty = getSplitQty(civilQuantities?.rcc_split, sub.slNo);
                  const displayQty = editableSubRowQty[sub.slNo] !== undefined ? editableSubRowQty[sub.slNo] : qty;
                  const rate = getExcavationRate(sub.slNo);
                  const amount = displayQty * rate;
                  rows.push(
                    <tr key={`sub-${sub.slNo}`} className="sub-row">
                      <td data-label="Sl.No" style={{ paddingLeft: "20px" }}>{sub.slNo}</td>
                      {columnVisibility.code && <td data-label="Code"></td>}
                      <td data-label="Description" style={{ paddingLeft: "40px" }}>{sub.description || "-"}</td>
                      {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image, item, "civil") : "-"}</td>}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                      {columnVisibility.qty && (
                        <td data-label="QTY">
                          <input type="number" step="0.001" value={displayQty} onChange={e => handleQtyChange("subrow", sub.slNo, e.target.value)} className="qty-input subrow-input" />
                        </td>
                      )}
                      {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(rate)}</td>}
                      <td data-label="Amount" className="amount-cell">{formatCurrency(amount)}</td>
                      {columnVisibility.remarks && <td data-label="Remarks"></td>}
                    </tr>
                  );
                });
              } else if (MAIN_POOL_QTY_FIELDS[sl]) {
                const qty = getCivilQuantity(sl);
                const rate = item.Rate || 0;
                const amount = qty * rate;
                rows[0] = (
                  <tr key={`main-${sl}`} className="main-row with-values">
                    <td data-label="Sl.No"><strong>{sl}</strong></td>
                    {columnVisibility.code && <td data-label="Code">{item.Code || ""}</td>}
                    <td data-label="Description" className="description-cell"><strong>{getDescriptionWithTemplate(item)}</strong></td>
                    {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image, item, "civil") : "-"}</td>}
                    {columnVisibility.unit && <td data-label="Unit"><strong>{item.Unit || ""}</strong></td>}
                    {columnVisibility.qty && (
                      <td data-label="QTY">
                        <input type="number" step="0.001" value={qty} onChange={e => handleQtyChange("civil", sl, e.target.value)} className="qty-input" />
                      </td>
                    )}
                    {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(rate)}</td>}
                    <td data-label="Amount" className="amount-cell">{formatCurrency(amount)}</td>
                    {columnVisibility.remarks && <td data-label="Remarks" className="remarks-cell"><textarea className="remarks-textbox" placeholder="Add remarks..." value={mainPoolRemarks[sl] || ""} onChange={e => setMainPoolRemarks(prev => ({ ...prev, [sl]: e.target.value }))} rows="2" /></td>}
                  </tr>
                );
              }
              return rows;
            })}
          </tbody>
          <tfoot>
            <tr className="table-total">
              <td colSpan={calculateColSpan()} style={{ textAlign: "right", fontWeight: "bold" }}>Total:</td>
              <td className="amount-cell total-amount" style={{ fontWeight: "bold" }}>{formatCurrency(mainPoolTotal)}</td>
              {columnVisibility.remarks && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const renderPumpRoomTable = () => {
    if (!includePumpRoom) return <div className="pump-room-disabled-message"><div className="info-message">ℹ️ Pump Room calculation is currently disabled.</div></div>;
    if (loadingBalanceTank) return <div className="loading-spinner">Loading pump room data...</div>;
    if (!pumpRoomItems.length) return <div className="no-data-message">No pump room data available.</div>;
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
              {columnVisibility.fixedRate && <th>Rate ({getCurrencySymbol()})</th>}
              <th>Amount ({getCurrencySymbol()})</th>
              {columnVisibility.remarks && <th>Remarks</th>}
            </tr>
          </thead>
          <tbody>
            {pumpRoomItems.map(item => {
              const qty = getPumpRoomQty(item.SlNo);
              const rate = item.Rate || 0;
              const amount = qty * rate;
              return (
                <tr key={item.SlNo}>
                  <td data-label="Sl.No">{item.SlNo}</td>
                  {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                  <td data-label="Description" className="description-cell">{getDescriptionWithTemplate(item)}</td>
                  {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image, item, "pump") : "-"}</td>}
                  {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                  {columnVisibility.qty && (
                    <td data-label="QTY"><input type="number" step="0.001" value={qty} onChange={e => handleQtyChange("pump", item.SlNo, e.target.value)} className="qty-input" /></td>
                  )}
                  {columnVisibility.fixedRate && <td data-label="Rate">{formatCurrency(rate)}</td>}
                  <td data-label="Amount" className="amount-cell">{formatCurrency(amount)}</td>
                  {columnVisibility.remarks && <td data-label="Remarks" className="remarks-cell"><textarea className="remarks-textbox" placeholder="Add remarks..." value={pumpRoomRemarks[item.SlNo] || ""} onChange={e => setPumpRoomRemarks(prev => ({ ...prev, [item.SlNo]: e.target.value }))} rows="2" /></td>}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-total">
              <td colSpan={calculateColSpan()} style={{ textAlign: "right", fontWeight: "bold" }}>Total:</td>
              <td className="amount-cell total-amount" style={{ fontWeight: "bold" }}>{formatCurrency(pumpRoomTotal)}</td>
              {columnVisibility.remarks && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const renderMepTable = () => {
    if (!filteredMepItems.length) return <div className="no-data-message">No MEP data available.</div>;
    const base = filteredMepItems.filter(i => i.SlNo <= 29);
    const advanced = filteredMepItems.filter(i => i.SlNo >= 30 && i.SlNo <= 34);
    const visibleCount = () => {
      let c = 1;
      if (columnVisibility.code) c++;
      c++;
      if (columnVisibility.image) c++;
      if (columnVisibility.unit) c++;
      if (columnVisibility.qty) c++;
      if (columnVisibility.fixedRate) c += 2;
      c += 3;
      if (columnVisibility.remarks) c++;
      return c;
    };
    return (
      <>
        <div className="mep-table-section">
          <h3 className="mep-table-title">Base MEP Systems (Items 1-29)</h3>
          <div className="table-container">
            <table className="excel-preview-table mep-table">
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
                  {columnVisibility.fixedRate && <><th>Supply</th><th>Installation</th></>}
                  <th>Supply</th><th>Installation</th><th>Total</th>
                </tr>
              </thead>
              <tbody>
                {base.map(item => {
                  const qty = getMepQuantity(item.SlNo);
                  const sRate = getSupplyRate(item);
                  const iRate = getInstallationRate(item);
                  const sCost = getSupplyCost(item, qty);
                  const iCost = getInstallationCost(item, qty);
                  const total = getRowTotal(item, qty);
                  let desc = item.Description || "N/A";
                  if (item.SlNo === 1 && dynamicRates.filter_description) desc = dynamicRates.filter_description;
                  else if (item.SlNo === 7) {
                    const calc = resultData?.mep?.find(m => (m.SlNo ?? m.sl_no) === 7);
                    if (calc?.Description && !calc.Description.includes("{{")) desc = calc.Description;
                    else if (dynamicRates.pump_description) desc = dynamicRates.pump_description;
                  }
                  return (
                    <tr key={item.SlNo} className={qty === 0 ? "zero-quantity-row" : ""}>
                      <td data-label="Sl.No">{item.SlNo}</td>
                      {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                      <td data-label="Description" className="description-cell">
                        {desc}
                        {(item.SlNo === 1 || item.SlNo === 7) && (
                          <div className="dynamic-rate-indicator">
                            <small>
                              {dynamicRates.source === "mep_rates_exact" ? "✅ Exact match from mep_rates table" :
                               dynamicRates.source === "mep_rates_closest" ? "⚠️ Using closest match" :
                               "❌ No match in mep_rates table - using 0"}
                            </small>
                          </div>
                        )}
                      </td>
                      {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image, item, "mep") : "-"}</td>}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                      {columnVisibility.qty && (
                        <td data-label="QTY"><input type="number" step="0.001" value={qty} onChange={e => handleQtyChange("mep", item.SlNo, e.target.value)} className="qty-input" /></td>
                      )}
                      {columnVisibility.fixedRate && (
                        <>
                          <td data-label="Supply Rate">{formatCurrency(sRate)}</td>
                          <td data-label="Installation Rate">{formatCurrency(iRate)}</td>
                        </>
                      )}
                      <td data-label="Supply Cost">{formatCurrency(sCost)}</td>
                      <td data-label="Installation Cost">{formatCurrency(iCost)}</td>
                      <td data-label="Total Amount" className="amount-cell">{formatCurrency(total)}</td>
                      {columnVisibility.remarks && <td data-label="Remarks" className="remarks-cell"><textarea className="remarks-textbox" placeholder="Add remarks..." value={mepRemarks[item.SlNo] || ""} onChange={e => setMepRemarks(prev => ({ ...prev, [item.SlNo]: e.target.value }))} rows="2" /></td>}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="table-subtotal">
                  <td colSpan={visibleCount() - 3} className="subtotal-label">Subtotal:</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(baseMepTotals.totalSupply)}</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(baseMepTotals.totalInstallation)}</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(baseMepTotals.grand)}</td>
                  {columnVisibility.remarks && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div className="mep-table-section">
          <div className="mep-table-header">
            <h3 className="mep-table-title">Advanced Equipment (Items 30-34) - Optional</h3>
            <div className="advanced-equipment-controls">
              <button className="select-all-btn" onClick={handleSelectAllAdvanced}>{selectedAdvancedEquipment.length === 5 ? "Deselect All" : "Select All"}</button>
              <span className="selection-info">Selected: {selectedAdvancedEquipment.length} of 5</span>
            </div>
          </div>
          <div className="table-container">
            <table className="excel-preview-table mep-table">
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
                  {columnVisibility.fixedRate && <><th>Supply</th><th>Installation</th></>}
                  <th>Supply</th><th>Installation</th><th>Total</th>
                </tr>
              </thead>
              <tbody>
                {advanced.map(item => {
                  const isSelected = selectedAdvancedEquipment.includes(item.SlNo);
                  const qty = isSelected ? 1 : 0;
                  const sRate = getSupplyRate(item);
                  const iRate = getInstallationRate(item);
                  const sCost = getSupplyCost(item, qty);
                  const iCost = getInstallationCost(item, qty);
                  const total = getRowTotal(item, qty);
                  let desc = item.Description || "N/A";
                  const calc = resultData?.mep?.find(m => (m.SlNo ?? m.sl_no) === item.SlNo);
                  if (calc?.Description && !calc.Description.includes("{{")) desc = calc.Description;
                  return (
                    <tr key={item.SlNo} className={!isSelected ? "equipment-not-selected" : ""}>
                      <td><input type="checkbox" checked={isSelected} onChange={() => handleAdvancedEquipmentToggle(item.SlNo)} /></td>
                      <td data-label="Sl.No">{item.SlNo}</td>
                      {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                      <td data-label="Description" className="description-cell">{desc}</td>
                      {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image, item, "mep") : "-"}</td>}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                      {columnVisibility.qty && <td data-label="QTY">{isSelected ? "1" : "0"}</td>}
                      {columnVisibility.fixedRate && (
                        <>
                          <td data-label="Supply Rate">{formatCurrency(sRate)}</td>
                          <td data-label="Installation Rate">{formatCurrency(iRate)}</td>
                        </>
                      )}
                      <td data-label="Supply Cost">{formatCurrency(sCost)}</td>
                      <td data-label="Installation Cost">{formatCurrency(iCost)}</td>
                      <td data-label="Total Amount" className="amount-cell">{formatCurrency(total)}</td>
                      {columnVisibility.remarks && <td data-label="Remarks" className="remarks-cell"><textarea className="remarks-textbox" placeholder="Add remarks..." value={mepRemarks[item.SlNo] || ""} onChange={e => setMepRemarks(prev => ({ ...prev, [item.SlNo]: e.target.value }))} rows="2" /></td>}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="table-subtotal">
                  <td colSpan={visibleCount() - 3} className="subtotal-label">Subtotal:</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(advancedEquipmentTotals.totalSupply)}</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(advancedEquipmentTotals.totalInstallation)}</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(advancedEquipmentTotals.grand)}</td>
                  {columnVisibility.remarks && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="advanced-equipment-info">
            <div className="info-box">
              <span className="info-icon">💡</span>
              <p><strong>Note:</strong> Advanced equipment items are optional. Only selected items will be included in the total cost and in downloaded reports.</p>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderPipingTable = () => {
    if (!resultData?.piping) return <div className="error-message">Piping data not available from backend.</div>;
    if (!pipingItems.length) return <div className="no-data-message">No piping items found.</div>;
    const renderSection = (title, items, icon) => {
      if (!items.length) return null;
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
                {items.map(item => {
                  const qty = editablePipingQty[item.sl_no] !== undefined ? editablePipingQty[item.sl_no] : item.quantity;
                  return (
                    <tr key={`${item.sl_no}-${item.type}`} className={qty === 0 ? "zero-quantity-row" : ""}>
                      <td data-label="Sl.No">{item.sl_no}</td>
                      {columnVisibility.code && <td data-label="Code">{item.code || "-"}</td>}
                      <td data-label="Description" className="description-cell">{item.description || "-"}</td>
                      <td data-label="Dia (mm)">{item.dia ? `${item.dia} mm` : "-"}</td>
                      {columnVisibility.qty && <td data-label="Qty"><input type="number" step="0.001" value={qty} onChange={e => handleQtyChange("piping", item.sl_no, e.target.value)} className="qty-input" /></td>}
                      {columnVisibility.unit && <td data-label="Unit">{item.unit}</td>}
                      {columnVisibility.fixedRate && (
                        <>
                          <td data-label="Supply Rate">{formatCurrency(item.supply_rate)}</td>
                          <td data-label="Installation Rate">{formatCurrency(item.installation_rate)}</td>
                        </>
                      )}
                      <td data-label="Supply Cost">{formatCurrency(item.supply_cost)}</td>
                      <td data-label="Installation Cost">{formatCurrency(item.installation_cost)}</td>
                      <td data-label="Total Amount" className="amount-cell">{formatCurrency(item.total)}</td>
                      {columnVisibility.remarks && <td data-label="Remarks" className="remarks-cell"><textarea className="remarks-textbox" placeholder="Add remarks..." value={mepRemarks[`piping_${item.sl_no}`] || ""} onChange={e => setMepRemarks(prev => ({ ...prev, [`piping_${item.sl_no}`]: e.target.value }))} rows="2" /></td>}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="table-subtotal">
                  <td colSpan={calculatePipingColSpan()} style={{ textAlign: "right", fontWeight: "bold" }}>Section Total:</td>
                  <td className="amount-cell" style={{ fontWeight: "bold" }}>{formatCurrency(items.reduce((s,i) => s + i.total, 0))}</td>
                  {columnVisibility.remarks && <td></td>}
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
            <div className="total-amount-box"><span className="total-label">Total Supply:</span><span className="total-value">{formatCurrency(pipingTotals.totalSupply)}</span></div>
            
            <div className="total-amount-box"><span className="total-label">Grand Total:</span><span className="total-value">{formatCurrency(pipingTotals.grandTotal)}</span></div>
            <div className="item-count-badge">{pipingItems.length} items</div>
          </div>
        </div>
        <div className="piping-distance-input" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px", padding: "12px 15px", background: "rgba(99,179,237,0.08)", borderRadius: "8px", border: "1px solid rgba(99,179,237,0.2)" }}>
          <label style={{ fontWeight: "600", color: "#63b3ed" }}>Pump Room Distance (m):</label>
          <input type="number" min="1" step="1" value={pumpRoomDistance} onChange={e => setPumpRoomDistance(Number(e.target.value))} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ccc", width: "100px", background: "#fff", color: "#333" }} />
          <button onClick={handleDistanceSubmit} disabled={updatingDistance} style={{ padding: "6px 12px", background: "#007bff", color: "#fff", border: "none", borderRadius: "6px", cursor: updatingDistance ? "not-allowed" : "pointer", opacity: updatingDistance ? 0.7 : 1 }}>{updatingDistance ? "Updating..." : "Update"}</button>
          <div style={{ marginLeft: "auto", fontSize: "12px", color: "#888" }}>Current Distance: {pumpRoomDistance} m</div>
        </div>
        {renderSection("Pipes", pipes, "🔧")}
        {renderSection("Ball Valves", ballValves, "🔩")}
        {renderSection("Puddle Flanges", puddleFlanges, "⭕")}
        {renderSection("Headers", headers, "📐")}
        {renderSection("Other Valves", otherValves, "🔧")}
        {renderSection("Other Flanges", otherFlanges, "⭕")}
        <div className="boq-note"><div><strong>Note:</strong> Piping quantities are calculated based on pool dimensions, pump room distance, and MEP equipment quantities.</div></div>
      </div>
    );
  };

  const saveCalculation = () => {
    try {
      const newCalc = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        dimensions: dimensions ? `${dimensions.length} × ${dimensions.width} × ${dimensions.depth} m` : "N/A",
        poolType, constructionType, totalCost: grandTotal, mainPoolCost: mainPoolTotal, mepCost: totalMepCost,
        pipingCost: pipingTotals.grandTotal, pumpRoomCost: includePumpRoom ? pumpRoomTotal : 0,
        includePumpRoom, includeHeatPump, selectedAdvancedEquipment, mainPoolRemarks, mepRemarks, pumpRoomRemarks,
        templateDescriptions, pumpRoomDimensions, exchangeRate, currency, columnVisibility, selectedTables,
        dynamicRates, updateDatabase, pumpRoomDistance,
        pipingItems: pipingItems.map(i => ({ sl_no: i.sl_no, type: i.type, category: i.category, dia: i.dia, quantity: i.quantity, total: i.total }))
      };
      const existing = JSON.parse(localStorage.getItem("saved_calculations") || "[]");
      const updated = [newCalc, ...existing].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0,10);
      localStorage.setItem("saved_calculations", JSON.stringify(updated));
      setSavedCalculations(updated);
      alert("✅ Calculation saved successfully!");
    } catch (err) { alert("❌ Failed to save calculation."); }
  };

  const downloadPDF = async () => {
  try {
    if (!Object.values(selectedTables).some(Boolean)) {
      alert("⚠️ Please select at least one table to export!");
      return;
    }

    // ── ADD THESE 4 LINES ──────────────────────────────────────
    const shotcretingSplit =
      civilQuantities?.rcc_split ||           // skimmer stores it as rcc_split
      civilQuantities?.shotcreting_split ||
      resultData?.rcc_subrows ||
      resultData?.civil_quantities?.shotcreting_split ||
      {};

    const rccShutteringSplit =
      civilQuantities?.shuttering_split ||    // skimmer stores it as shuttering_split
      civilQuantities?.rcc_shuttering_split ||
      resultData?.shuttering_subrows ||
      resultData?.civil_quantities?.rcc_shuttering_split ||
      {};

    console.log("PDF shotcretingSplit (rcc_split):", shotcretingSplit);
    console.log("PDF rccShutteringSplit (shuttering_split):", rccShutteringSplit);
    // ── END ADD ────────────────────────────────────────────────

    await generatePDF({
      resultData,
      poolType: resultData?.pool_type || poolType || "skimmer",
      constructionType: constructionType || "in-ground",
      dimensions: dimensions || {},
      pumpRoomDimensions: pumpRoomDimensions || {},
      mainPoolItems: selectedTables.mainPool ? filteredMainPoolItems : [],
      mepItems: selectedTables.mep ? filteredMepItems : [],
      pumpRoomItems: selectedTables.pumpRoom && includePumpRoom ? pumpRoomItems : [],
      pipingItems: selectedTables.piping ? pipingItems : [],
      civilQuantities: civilQuantities || {},
      mepQuantities: mepQuantities || {},
      pumpRoomQuantities: pumpRoomQuantities || {},
      mainPoolTotal: Number(mainPoolTotal || 0),
      mepTotal: Number(totalMepCost || 0),
      pumpRoomTotal: selectedTables.pumpRoom && includePumpRoom ? Number(pumpRoomTotal || 0) : 0,
      pipingTotal: Number(pipingTotals?.grandTotal || 0),
      mainPoolRemarks: mainPoolRemarks || {},
      mepRemarks: mepRemarks || {},
      pumpRoomRemarks: pumpRoomRemarks || {},
      templateDescriptions: templateDescriptions || {},
      dynamicRates: dynamicRates || {},
      currency: currency || "INR",
      exchangeRate: exchangeRate || 83.0,
      selectedTables: selectedTables || {},
      columnVisibility: columnVisibility || {},
      selectedAdvancedEquipment: selectedAdvancedEquipment || [],
      includePumpRoom: includePumpRoom || false,
      pumpRoomDistance: pumpRoomDistance || 15,
      companyProfile: companyProfile || {},
      excavationSplit: civilQuantities?.excavation_split || {},
      balanceTankItems: [],
      balanceTankQuantities: {},
      hasBalancingTank: false,
      // ── ADD THESE TWO ─────────────────────────────────────────
      shotcretingSplit: shotcretingSplit,
      rccShutteringSplit: rccShutteringSplit,
      // ── END ADD ───────────────────────────────────────────────
    });
  } catch (err) {
    console.error(err);
    alert("PDF generation failed.");
  }
};

  // --------------------------------------------------------------
  // MAIN RETURN WITH COLLAPSIBLE SIDEBAR
  // --------------------------------------------------------------
  return (
    <div className="result-page">
      {/* All inline CSS removed – styles now only from imported result.css or individual style props where necessary */}

      <header className="header-section">
        <div className="page-header">
          <div className="header-content">
            <h1>Skimmer Pool Calculation Results</h1>
            <p className="subtitle" style={{ color: "gray" }}>A detailed summary of your Skimmer Pool's construction, MEP components, piping system, and cost estimates</p>
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
            <h3 style={{marginBottom:"3%" , color:"gray"}}>Views</h3>
            <div className="sidebar-tab-buttons">
              {[
                { id: 1, icon: "📊", label: "Calculation & 3D" },
                { id: 2, icon: "🏊", label: `Civil Work (${filteredMainPoolItems.length})` },
                { id: 5, icon: "⚙️", label: `Pump Room (${pumpRoomItems.length})` },
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
            <h3 style={{marginBottom:"3%" , color:"gray"}}>Actions</h3>
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
              <button className="sidebar-action-btn proforma-btn" onClick={() => navigate("/proformainvoice", { state: { resultData, dimensions, mainPoolTotal, mepTotal: totalMepCost, pipingTotal: pipingTotals.grandTotal, pumpRoomTotal: includePumpRoom ? pumpRoomTotal : 0, grandTotal, poolType, constructionType, includePumpRoom, selectedAdvancedEquipment, companyProfile, currency, exchangeRate, dynamicRates, pumpRoomDistance, filteredMainPoolItems, filteredMepItems, pumpRoomItems, pipingItems, mainPoolRemarks, mepRemarks, pumpRoomRemarks, templateDescriptions, civilQuantities, mepQuantities, pumpRoomQuantities, selectedTables, columnVisibility } })} data-tooltip="Proforma Invoice">
                <span className="sidebar-tab-icon">📄</span>
                <span className="btn-text">Proforma Invoice</span>
              </button>
              <button className="sidebar-action-btn" onClick={() => navigate("/delivery", { state: { result: { ...resultData, ...civilQuantities, ...mepQuantities, ...pumpRoomQuantities }, dimensions, filteredMainPoolItems, filteredMepItems, pumpRoomItems: selectedTables.pumpRoom ? pumpRoomItems : [], pipingItems: selectedTables.piping ? pipingItems : [], pipingTotal: selectedTables.piping ? pipingTotals.grandTotal : 0, pumpRoomQuantities, pumpRoomDimensions, templateDescriptions, poolType: "skimmer", constructionType, hasGutter: false, hasBalancingTank: false, includePumpRoom: selectedTables.pumpRoom || false, selectedTables } })} data-tooltip="Delivery Challan">
                <span className="sidebar-tab-icon">📦</span>
                <span className="btn-text">Delivery Challan</span>
              </button>
              <button className="sidebar-action-btn" onClick={() => navigate("/tax", { state: { result: resultData, dimensions, mainPoolData: selectedTables.mainPool ? filteredMainPoolItems : [], mepItems: selectedTables.mep ? filteredMepItems : [], pumpRoomData: selectedTables.pumpRoom ? pumpRoomItems : [], mainPoolTotal, mepTotal: totalMepCost, pumpRoomTotal: includePumpRoom ? pumpRoomTotal : 0, templateDescriptions, poolType: "skimmer", constructionType, includePumpRoom, currency, exchangeRate, selectedTables, finalTotal: grandTotal, selectedAdvancedEquipment, percentageAmounts: { item35: 0, item36: 0, item37: 0, item38: 0 }, pipingItems: selectedTables.piping ? pipingItems : [], pipingTotal: selectedTables.piping ? pipingTotals.grandTotal : 0 } })} data-tooltip="Tax Invoice">
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
                  <div className="section-header"><h2 className="section-title">Pool Specifications</h2><div className="header-controls"><PoolTypeDisplay /></div></div>
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
                            <tr><td className="spec-label"><strong>Turnover Time</strong></td><td className="spec-value">{safeToFixed(resultData.turnover_hours || 4.5)} hours</td></tr>
                            <tr><td className="spec-label"><strong>Flow Rate</strong></td><td className="spec-value">{safeToFixed(resultData.flowrate_m3_per_hr || ((dimensions.length * dimensions.width * dimensions.depth) / 4.5))} m³/hr</td></tr>
                            <tr><td className="spec-label"><strong>Filter Diameter</strong></td><td className="spec-value">{resultData.filter_dia_mm || dynamicRates.filter_dia || "N/A"} mm</td></tr>
                            <tr><td className="spec-label"><strong>Pump Capacity</strong></td><td className="spec-value">{resultData.hp || dynamicRates.hp || "N/A"} HP{dynamicRates.hp_overridden && <span className="hp-override-indicator" title={`Original: ${dynamicRates.original_hp} HP`}> (from DB)</span>}</td></tr>
                            <tr><td className="spec-label"><strong>Pump Room Distance</strong></td><td className="spec-value">{pumpRoomDistance} m</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div className="preview-section" style={{ flex: 1, minWidth: 0 }}>
                    <div className="preview-header" style={{ marginBottom: "14px" }}><h3 className="preview-title" style={{ margin: 0 }}>3D Pool Visualization</h3></div>
                    <PoolVisualization3D dimensions={dimensions} />
                  </div>
                </>
              )}
            </section>
          )}

          {activeTab === 2 && (
            <section className="tab-content active">
              <div className="section-header"><h2>Civil Works - Main Pool (Items 1-14)</h2><div className="header-controls"><div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(mainPoolTotal)}</span></div></div></div>
              {loadingMainPool ? <div className="loading-spinner">Loading data...</div> : <>{renderMainPoolTable()}<div className="boq-note"><div><strong>Note:</strong> The estimates provided are based on current industry standards and average material costs. Actual costs may vary depending on location, specific material selections, and site conditions.<span className="small"> Variations of ±10–15% from the estimate are common.</span>{constructionType === "terrace" && <div className="terrace-note"><strong>Terrace Pool Note:</strong> This configuration includes structural works only and excludes excavation, soling, and backfilling items.</div>}</div></div></>}
            </section>
          )}

          {activeTab === 3 && (
            <section className="tab-content active">
              <Timeline poolSize={dimensions} resultData={resultData} currency={currency} exchangeRate={exchangeRate} includePumpRoom={includePumpRoom} pumpRoomDimensions={pumpRoomDimensions} constructionType={constructionType} selectedAdvancedEquipment={selectedAdvancedEquipment} columnVisibility={columnVisibility} selectedTables={selectedTables} filteredMepItems={filteredMepItems} />
            </section>
          )}

          {activeTab === 4 && (
            <section className="tab-content active">
              <div className="section-header"><h2>MEP (Mechanical, Electrical, Plumbing) Items</h2><div className="header-controls"><PoolTypeDisplay /><div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(totalMepCost)}</span></div></div></div>
              {loadingMep ? <div className="loading-spinner">Loading MEP data...</div> : !filteredMepItems.length ? <div className="error-message">No MEP items available.</div> : <>{loadingMepCalculation && <div className="calculation-status"><span className="status-icon">⏳</span><span>Calculating MEP quantities...</span></div>}{renderMepTable()}<div className="mep-grand-total"><div className="grand-total-box"><div className="total-breakdown"><div className="breakdown-item"><span className="breakdown-label">Base MEP (Items 1-29):</span><span className="breakdown-value">{formatCurrency(baseMepTotals.grand)}</span></div><div className="breakdown-item"><span className="breakdown-label">Advanced Equipment (Items 30-34):</span><span className="breakdown-value">{formatCurrency(advancedEquipmentTotals.grand)}</span></div><div className="breakdown-total"><span className="breakdown-label">Total MEP Cost:</span><span className="breakdown-value" style={{ color: "white" }}>{formatCurrency(totalMepCost)}</span></div></div></div></div><div className="boq-note"><div><strong>Note:</strong> The estimates provided are based on current industry standards and average material costs. Piping items are shown in the <strong>Piping System</strong> tab.<span className="small"> Variations of ±10–15% from the estimate are common.</span></div></div></>}
            </section>
          )}

          {activeTab === 5 && (
            <section className="tab-content active">
              <div className="section-header"><h2>Pump Room - Civil Construction (Items 1-12)</h2><div className="header-controls"><div className="controls-left"><PoolTypeDisplay /></div><div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(includePumpRoom ? pumpRoomTotal : 0)}</span></div></div></div>
              {loadingBalanceTank && <div className="loading-spinner">Loading pump room data...</div>}
              {includePumpRoom && (
                <div className="pump-room-specs">
                  <h3>Pump Room Specifications</h3>
                  <div className="specs-grid">
                    {pumpRoomDimensions?.length ? (
                      <>
                        <div className="spec-item"><span className="spec-label">Construction Type:</span><span className="spec-value">{constructionType === "terrace" ? "🏢 Terrace Pump Room" : "⛰️ In-Ground Pump Room"}</span></div>
                        <div className="spec-item"><span className="spec-label">Pump Room Dimensions:</span><span className="spec-value">{pumpRoomDimensions.length || 0}m × {pumpRoomDimensions.width || 0}m × {pumpRoomDimensions.height || 0}m</span></div>
                        <div className="spec-item"><span className="spec-label">Pump Room Area:</span><span className="spec-value">{safeToFixed((pumpRoomDimensions.length || 0) * (pumpRoomDimensions.width || 0))} m²</span></div>
                        <div className="spec-item"><span className="spec-label">Pump Room Items:</span><span className="spec-value">{pumpRoomItems.length} items (SlNo 1–12)</span></div>
                      </>
                    ) : (
                      <>
                        <div className="spec-item"><span className="spec-label">Construction Type:</span><span className="spec-value">{constructionType === "terrace" ? "🏢 Terrace" : "⛰️ In-Ground"}</span></div>
                        <div className="spec-item"><span className="spec-label">Pump Room Items:</span><span className="spec-value">{pumpRoomItems.length} items (SlNo 1–12)</span></div>
                       
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className="pump-room-section"><h3>Pump Room Construction Details</h3>{renderPumpRoomTable()}</div>
              <div className="boq-note"><div><strong>Note:</strong> Pump room construction costs are calculated based on standard RCC construction practices for underground structures.<span className="small"> Actual costs may vary based on site conditions and local material rates.</span>{constructionType === "terrace" && includePumpRoom && <div className="terrace-note"><strong>Terrace Pump Room Note:</strong> This configuration includes structural civil items only and excludes excavation, soling, and backfilling works.</div>}</div></div>
            </section>
          )}

          {activeTab === "piping" && <section className="tab-content active">{renderPipingTable()}</section>}

          {activeTab === "total" && (
            <section className="tab-content active">
              <div className="section-header"><h2 className="section-title">Total Pool Cost Summary</h2><div className="header-controls"><PoolTypeDisplay /></div></div>
              <div className="summary-cards">
                <div className="summary-card"><div className="summary-icon">🏊</div><div className="summary-details"><h3>Main Pool (Civil Works) - 14 Items</h3><p className="summary-amount">{formatCurrency(mainPoolTotal)}</p></div></div>
                {includePumpRoom && <div className="summary-card"><div className="summary-icon">⚙️</div><div className="summary-details"><h3>Pump Room - 12 Items</h3><p className="summary-amount">{formatCurrency(pumpRoomTotal)}</p></div></div>}
                <div className="summary-card"><div className="summary-icon">🔧</div><div className="summary-details"><h3>MEP Systems</h3><p className="summary-amount">{formatCurrency(totalMepCost)}</p></div></div>
                <div className="summary-card"><div className="summary-icon">🔩</div><div className="summary-details"><h3>Piping System</h3><div className="piping-total-breakdown"><div>Supply: {formatCurrency(pipingTotals.totalSupply)}</div><div className="total">Total: {formatCurrency(pipingTotals.grandTotal)}</div></div></div></div>
                
              </div>
              <div className="grand-total_1">
                <h3>Grand Total</h3>
                {(() => { const gst = grandTotal * 0.18; return (
                  <>
                    <div className="amount-breakdown_1"><div className="breakdown-item_1"><span>Subtotal:</span><span>{formatCurrency(grandTotal)}</span></div><div className="breakdown-item_1"><span>GST (18%):</span><span>{formatCurrency(gst)}</span></div></div>
                    <div className="grand-total-amount_1">{formatCurrency(grandTotal + gst)}<span className="gst-label_1"> (incl. GST)</span></div>
                  </>
                ); })()}
                <p className="grand-total-note_1">Includes {constructionType === "terrace" ? "structural civil works" : "complete civil works with excavation"}, MEP equipment{selectedAdvancedEquipment.length > 0 ? " (with selected advanced equipment)" : ""}, complete piping system{includePumpRoom ? ", and pump room construction" : ""}<br /><span className="gst-note_1">All prices include 18% GST as per applicable tax regulations</span></p>
              </div>
            </section>
          )}

          {activeTab === "visualization" && (
            <section className="tab-content active">
              <div className="section-header"><h2 className="section-title">Cost Breakdown Visualization</h2><div className="header-controls"><PoolTypeDisplay /></div></div>
              <CostBreakdownChart mainPoolCost={mainPoolTotal} mepCost={totalMepCost} pipingCost={pipingTotals.grandTotal} pumpRoomCost={includePumpRoom ? pumpRoomTotal : 0} currency={currency} exchangeRate={exchangeRate} includePumpRoom={includePumpRoom} constructionType={constructionType} selectedAdvancedEquipment={selectedAdvancedEquipment} advancedEquipmentTotal={advancedEquipmentTotal} columnVisibility={columnVisibility} selectedTables={selectedTables} filteredMepItems={filteredMepItems} />
            </section>
          )}
        </div>
      </div>

      {imageModal.show && (
        <div className="image-modal-overlay" onClick={() => setImageModal({ show: false, src: "" })}>
          <div className="image-modal-content" onClick={e => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setImageModal({ show: false, src: "" })}>×</button>
            <img src={imageModal.src} alt="Enlarged view" className="image-modal-image" />
          </div>
        </div>
      )}

      {showComparison && (
        <ComparisonTool currentData={resultData} currentTotal={grandTotal} savedCalculations={savedCalculations} onClose={() => setShowComparison(false)} hasPumpRoom={includePumpRoom} mainPoolCost={mainPoolTotal} pumpRoomCost={includePumpRoom ? pumpRoomTotal : 0} mepCost={totalMepCost} mainPoolRemarks={mainPoolRemarks} pumpRoomRemarks={pumpRoomRemarks} mepRemarks={mepRemarks} templateDescriptions={templateDescriptions} currentRates={dynamicRates} currency={currency} exchangeRate={exchangeRate} includePumpRoom={includePumpRoom} pumpRoomDimensions={pumpRoomDimensions} constructionType={constructionType} selectedAdvancedEquipment={selectedAdvancedEquipment} columnVisibility={columnVisibility} selectedTables={selectedTables} filteredMepItems={filteredMepItems} pipingItems={pipingItems} pipingTotal={pipingTotals.grandTotal} />
      )}

      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal-content" onClick={e => e.stopPropagation()}>
            <button className="share-modal-close" onClick={() => setShowShareModal(false)}>✕</button>
            <ShareResults resultData={resultData} mainPoolData={filteredMainPoolItems} mepItems={filteredMepItems} pumpRoomData={pumpRoomItems} pipingItems={pipingItems} dimensions={dimensions} totalMep={totalMepCost} mainPoolTotal={mainPoolTotal} pumpRoomTotal={pumpRoomTotal} pipingTotal={pipingTotals.grandTotal} finalTotal={grandTotal} mainPoolRemarks={mainPoolRemarks} mepRemarks={mepRemarks} pumpRoomRemarks={pumpRoomRemarks} currentRates={dynamicRates} currency={currency} exchangeRate={exchangeRate} includePumpRoom={includePumpRoom} constructionType={constructionType} selectedAdvancedEquipment={selectedAdvancedEquipment} columnVisibility={columnVisibility} selectedTables={selectedTables} apiBaseUrl={`${API_BASE_URL}/admin`} poolTypeForFilter="skimmer" civilQuantities={civilQuantities} mepQuantities={mepQuantities} pumpRoomQuantities={pumpRoomQuantities} dynamicRates={dynamicRates} filteredMepItems={filteredMepItems} />
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
                mainPoolData={selectedTables.mainPool ? filteredMainPoolItems : []}
                mepItems={selectedTables.mep ? filteredMepItems : []}
                pumpRoomItems={pumpRoomItems}
                pipingItems={selectedTables.piping ? pipingItems : []}
                selectedTables={selectedTables}
                columnVisibility={columnVisibility}
                currency={currency}
                exchangeRate={exchangeRate}
                dimensions={dimensions}
                totalMep={selectedTables.mep ? totalMepCost : 0}
                mainPoolTotal={selectedTables.mainPool ? mainPoolTotal : 0}
                balancingRows={selectedTables.pumpRoom ? pumpRoomItems : []}
                balancingTankTotal={0}
                poolType="skimmer"
                hasBalancingTank={false}
                includePumpRoomExcel={selectedTables.pumpRoom ? includePumpRoom : false}
                mainPoolRemarks={mainPoolRemarks}
                balancingTankRemarks={pumpRoomRemarks}
                mepRemarks={mepRemarks}
                pumpRoomRemarks={pumpRoomRemarks}
                templateDescriptions={templateDescriptions}
                totalMepWithFittings={selectedTables.mep ? totalMepCost : 0}
                currentRates={dynamicRates}
                pumpRoomDimensions={pumpRoomDimensions}
                pumpRoomQuantities={pumpRoomQuantities}
                constructionType={constructionType}
                pumpRoomTotal={selectedTables.pumpRoom && includePumpRoom ? pumpRoomTotal : 0}
                pumpRoomRemarksExcel={pumpRoomRemarks}
                selectedAdvancedEquipment={selectedAdvancedEquipment}
                pumpRoomData={selectedTables.pumpRoom ? pumpRoomItems : []}
                pumpRoomRows={[]}
                poolTypeForFilter="skimmer"
                pipingTotal={selectedTables.piping ? pipingTotals.grandTotal : 0}
                civilQuantities={civilQuantities}
                balanceTankQuantities={{}}
                mepQuantities={mepQuantities}
                dynamicRates={dynamicRates}
                hasGutter={false}
                companyProfile={companyProfile}
                editableCivilQty={editableCivilQty}
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

      <SaveProjectModal open={saveOpen} onClose={() => setSaveOpen(false)} resultData={completeProjectSnapshot} dimensions={dimensions} projectType="skimmer" />
    </div>
  );
}

export default ResultPage;