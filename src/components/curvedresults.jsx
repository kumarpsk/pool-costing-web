import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./result.css";
import { generatePDF, PDFDownloadButton } from "./download";
import ExcelDownloadButton from "./excel";
import Timeline from "./timeline";
import HelpModal from "./HelpModal";
import CostBreakdownChart from "./costbreakdownchart1";
import ShareResults from "./ShareResults";
import ComparisonTool from "./ComparisonTool";
import SaveProjectModal from "./SaveProjectModal";

const API_BASE_URL = "https://pool-costing-api.intelithon.in";
const INSTALLATION_PERCENT = 0.15;
const VISUALIZATION_3D_URL = "https://3d.intelithon.in";

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
// Safe number & formatting helpers
// ================================
const safeNumber = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};
function safeToFixed(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return "0.00";
  return Number(value).toFixed(decimals);
}
function formatIndianCurrency(amount) {
  return Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ================================
// Piping Item Mapper (same as Freeform)
// ================================
function mapPipingItem(item) {
  if (!item) return null;
  const slNo = item.SlNo || item.sl_no || "";
  const type = item.Type || item.type || "Pipe";
  const category = item.Category || item.category || "";
  const description = item.Description || item.description || "";
  const dia = item.Dia || item.dia || "";
  const unit = item.Unit || item.unit || "Nos";
  const quantity = safeNumber(item.Quantity || item.quantity || 0);
  const rate = safeNumber(item.Rate || item.rate || 0);
  const code = item.Code || item.code || "";

  const supplyRate = rate;
  const installationRate = rate * INSTALLATION_PERCENT;
  const supplyCost = quantity * supplyRate;
  const installationCost = quantity * installationRate;
  const totalCost = supplyCost + installationCost;

  let finalCategory = category;
  if (!finalCategory) {
    const lowerType = (type || "").toLowerCase();
    if (lowerType.includes("pipe")) finalCategory = "pipe";
    else if (lowerType.includes("header")) finalCategory = "header";
    else if (lowerType.includes("valve")) finalCategory = "ball_valve";
    else if (lowerType.includes("flange")) finalCategory = "puddle_flange";
    else finalCategory = "other";
  }

  return {
    SlNo: slNo,
    Type: type,
    Category: finalCategory,
    Description: description,
    Dia: dia,
    Unit: unit,
    Quantity: quantity,
    Rate: rate,
    SupplyRate: supplyRate,
    InstallationRate: installationRate,
    SupplyCost: supplyCost,
    InstallationCost: installationCost,
    Total: totalCost,
    Code: code,
  };
}

// ================================
// 3D Visualization Component (identical to Overflow)
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

  const handleFullscreen = () => {
    setViewMode("fullscreen");
    setShowDisclaimer(false);
  };
  const handleExitFullscreen = () => setViewMode("embed");
  const handleOpenExternal = () =>
    window.open(visualizationUrl, "_blank", "noopener,noreferrer");

  if (viewMode === "fullscreen") {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9999,
          background: "#0a0a0f",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 20px",
            background: "rgba(0,0,0,0.85)",
            borderBottom: "1px solid rgba(99,179,237,0.3)",
            flexShrink: 0,
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "20px" }}>🏊</span>
            <div>
              <div style={{ color: "#63b3ed", fontWeight: 700, fontSize: "15px" }}>
                3D Pool Visualization
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>
                {length} × {width} × {depth} m | For reference only
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleOpenExternal}
              style={{
                padding: "7px 14px",
                background: "rgba(99,179,237,0.15)",
                border: "1px solid rgba(99,179,237,0.4)",
                borderRadius: "6px",
                color: "#63b3ed",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              ↗ Open in New Tab
            </button>
            <button
              onClick={handleExitFullscreen}
              style={{
                padding: "7px 14px",
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.4)",
                borderRadius: "6px",
                color: "#f87171",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              ✕ Exit Fullscreen
            </button>
          </div>
        </div>
        <div style={{ flex: 1, position: "relative" }}>
          <iframe
            src={visualizationUrl}
            title="3D Pool Visualization - Full View"
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            allow="accelerometer; autoplay; camera; fullscreen; gyroscope; xr-spatial-tracking"
            allowFullScreen
          />
        </div>
        <div
          style={{
            padding: "8px 20px",
            background: "rgba(245,158,11,0.1)",
            borderTop: "1px solid rgba(245,158,11,0.25)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "13px" }}>⚠️</span>
          <span style={{ color: "orange" }}>
            This 3D visualization is provided for conceptual reference only and does not represent
            the actual pool design.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {showDisclaimer && (
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(251,191,36,0.05) 100%)",
            border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            position: "relative",
          }}
        >
          <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: "12px",
                color: "#f59e0b",
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                marginBottom: "4px",
              }}
            >
              Reference Only — Not Your Actual Project
            </div>
            <div style={{ fontSize: "12px", color: "rgba(238, 134, 6, 0.93)", lineHeight: 1.5 }}>
              This 3D visualization is a{" "}
              <strong style={{ color: "rgba(238, 134, 6, 0.93)" }}>
                general conceptual model
              </strong>{" "}
              generated for reference purposes only.
            </div>
          </div>
          <button
            onClick={() => setShowDisclaimer(false)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              fontSize: "16px",
              padding: "0",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      )}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid rgba(99,179,237,0.2)",
          background: "#0d0d1a",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            background: "rgba(0,0,0,0.5)",
            borderBottom: "1px solid rgba(99,179,237,0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#ff5f57",
              }}
            />
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#febc2e",
              }}
            />
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#28c840",
              }}
            />
            <span
              style={{
                marginLeft: "8px",
                color: "rgba(255,255,255,0.5)",
                fontSize: "11px",
                fontFamily: "monospace",
              }}
            >
              3d.intelithon.in
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleOpenExternal}
              style={{
                padding: "5px 10px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "5px",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              ↗ New Tab
            </button>
            <button
              onClick={handleFullscreen}
              style={{
                padding: "5px 12px",
                background:
                  "linear-gradient(135deg, rgba(99,179,237,0.2), rgba(66,153,225,0.2))",
                border: "1px solid rgba(99,179,237,0.35)",
                borderRadius: "5px",
                color: "#63b3ed",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              ⛶ Full View
            </button>
          </div>
        </div>
        {!iframeLoaded && !iframeError && (
          <div
            style={{
              position: "absolute",
              top: "46px",
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#0d0d1a",
              zIndex: 2,
              gap: "16px",
            }}
          >
            <div style={{ position: "relative", width: "60px", height: "60px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  border: "2px solid rgba(99,179,237,0.1)",
                  borderTop: "2px solid #63b3ed",
                  borderRadius: "50%",
                  animation: "spin3d 1s linear infinite",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: "22px",
                }}
              >
                🏊
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#63b3ed", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                Loading 3D Visualization...
              </div>
            </div>
            <style>{`@keyframes spin3d { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        <iframe
          src={visualizationUrl}
          title="3D Pool Visualization"
          style={{
            width: "100%",
            height: "460px",
            border: "none",
            display: "block",
            opacity: iframeLoaded ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
          onLoad={() => setIframeLoaded(true)}
          onError={() => setIframeError(true)}
          allow="accelerometer; autoplay; camera; fullscreen; gyroscope; xr-spatial-tracking"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-top-navigation"
        />
      </div>
    </div>
  );
}

// ================================
// Quantity Field Mappings
// ================================
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
  31: "PoolHeater_QTY",
  32: "Chiller_QTY",
  33: "Ozonator_QTY",
  34: "SaltChlorinator_QTY",
};

// ================================
// Main Component
// ================================
function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // ----- State (exactly as in original Freeform) -----
  const initialState = location.state?.result || null;
  const [resultData, setResultData] = useState(initialState);
  const [dimensions, setDimensions] = useState(location.state?.dimensions || {});
  const [poolType, setPoolType] = useState("freeform");
  const [constructionType, setConstructionType] = useState(
    location.state?.constructionType || "in_ground"
  );
  const [hasGutter, setHasGutter] = useState(location.state?.hasGutter || false);
  const [companyProfile, setCompanyProfile] = useState(null);
  const isTerracePool = String(constructionType || "").trim().toLowerCase() === "terrace";

  // ================================
  // STEP 1: ADD VOLUME CHECK FOR IMAGE OVERRIDE
  // ================================
  const shouldUseLargePoolImages = useMemo(() => {
    const length = Number(dimensions?.length || 0);
    const width = Number(dimensions?.width || 0);
    const depth = Number(dimensions?.depth || 0);
    const volume = length * width * depth;

    console.log("FREEFORM POOL VOLUME:", volume);
    console.log("VOLUME THRESHOLD CHECK:", volume >= 500 ? "LARGE POOL - Use override images" : "SMALL/MEDIUM POOL - Use database images");

    return volume >= 500;
  }, [dimensions]);

  // ================================
  // STEP 2: CREATE IMAGE OVERRIDE FUNCTION
  // ================================
  const getFreeformMepImage = (item) => {
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

  const getSafeQty = (qtyKey, value) => {
    if (!isTerracePool) return Number(value ?? 0);
    const terraceZeroKeys = [
      "EarthExcavation_QTY",
      "BackFilling_QTY",
      "Consolidation_QTY",
      "Disposal_QTY",
      "Soling_QTY",
      "plaincement_QTY",
      "BurntBrick_QTY",
      "EarthExcavation_QTY_1",
      "BackFilling_QTY_1",
      "Consolidation_QTY_1",
      "Disposal_QTY_1",
      "Soling_QTY_1",
      "plaincement_QTY_1",
      "BurntBrick_QTY_1",
      "EarthExcavation_QTY_2",
      "BackFilling_QTY_2",
      "Consolidation_QTY_2",
      "Disposal_QTY_2",
      "Soling_QTY_2",
      "plaincement_QTY_2",
      "BurntBrick_QTY_2",
    ];
    if (terraceZeroKeys.includes(qtyKey)) return 0;
    return Number(value ?? 0);
  };

  const civilQuantities = resultData?.civil_quantities || {};
  const balanceTankQuantities = resultData?.balance_tank_quantities || {};
  const pumpRoomQuantities = resultData?.pump_room_quantities || {};
  const mepQuantities = resultData?.mep_quantities || {};

  // Piping
  const [pipingItems, setPipingItems] = useState([]);
  const [pipingTotal, setPipingTotal] = useState(0);
  const [loadingPiping, setLoadingPiping] = useState(false);

  // Distance & safety factor
  const [equipmentDistance, setEquipmentDistance] = useState(
    location.state?.equipmentDistance || 15.0
  );
  const [safetyFactor, setSafetyFactor] = useState(1.1);
  const debounceRef = useRef(null);
  const handleDistanceChange = (e) => {
    const v = parseFloat(e.target.value) || 15;
    if (v > 0) setEquipmentDistance(v);
  };
  const handleSafetyFactorChange = (e) => {
    const v = parseFloat(e.target.value) || 1.1;
    if (v >= 1.0 && v <= 1.5) setSafetyFactor(v);
  };

  // Master data
  const [mainPoolItems, setMainPoolItems] = useState([]);
  const [mepItems, setMepItems] = useState([]);
  const [balanceTankItems, setBalanceTankItems] = useState([]);
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
  const [loadingCalc, setLoadingCalc] = useState(!initialState);

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
  const [currency, setCurrency] = useState("INR");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExcelExportModal, setShowExcelExportModal] = useState(false);

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

  const [saveOpen, setSaveOpen] = useState(false);
  const [includePumpRoom, setIncludePumpRoom] = useState(true);
  const [pumpRoomDimensions, setPumpRoomDimensions] = useState({});
  const [balanceTankDimensions, setBalanceTankDimensions] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Editable quantities
  const [editableCivilQty, setEditableCivilQty] = useState({});
  const [editableBalanceQty, setEditableBalanceQty] = useState({});
  const [editablePumpRoomQty, setEditablePumpRoomQty] = useState({});
  const [editableMepQty, setEditableMepQty] = useState({});
  const [editablePipingQty, setEditablePipingQty] = useState({});
  const [editableSubRowQty, setEditableSubRowQty] = useState({});

  // ----- Helper Functions -----
  const handleQtyChange = (type, key, value) => {
    const qty = Number(value) || 0;
    switch (type) {
      case "civil":
        setEditableCivilQty((p) => ({ ...p, [key]: qty }));
        break;
      case "balance":
        setEditableBalanceQty((p) => ({ ...p, [key]: qty }));
        break;
      case "pump":
        setEditablePumpRoomQty((p) => ({ ...p, [key]: qty }));
        break;
      case "mep":
        setEditableMepQty((p) => ({ ...p, [key]: qty }));
        break;
      case "piping":
        setEditablePipingQty((p) => ({ ...p, [key]: qty }));
        break;
      case "subrow":
        setEditableSubRowQty((p) => ({ ...p, [key]: qty }));
        break;
      default:
        break;
    }
  };

  const getResolvedMepDescription = (slNo, fallbackItem) => {
    const numericSlNo = Number(slNo);
    const calcItem = resultData?.mep_items?.find(
      (m) => Number(m.SlNo ?? m.sl_no) === numericSlNo
    );
    const apiDesc = calcItem?.Description || "";
    if (apiDesc && !apiDesc.includes("{{")) return apiDesc;
    if (numericSlNo === 1 && dynamicRates.filter_description && !dynamicRates.filter_description.includes("{{"))
      return dynamicRates.filter_description;
    if (numericSlNo === 7 && dynamicRates.pump_description && !dynamicRates.pump_description.includes("{{"))
      return dynamicRates.pump_description;
    return fallbackItem?.Description || "N/A";
  };

  const getSupplyRate = (item) => {
    if (!item) return 0;
    if (item.SlNo === 1) return safeNumber(dynamicRates.filter_rate);
    if (item.SlNo === 7) return safeNumber(dynamicRates.pump_rate);
    return safeNumber(item.Rate);
  };
  const getInstallationRate = (item) => getSupplyRate(item) * INSTALLATION_PERCENT;
  const getSupplyCost = (item, quantity) => quantity * getSupplyRate(item);
  const getInstallationCost = (item, quantity) => quantity * getInstallationRate(item);
  const getRowTotal = (item, quantity) => getSupplyCost(item, quantity) + getInstallationCost(item, quantity);

  // Quantity getters with editable override
  const getCivilQuantity = (slNo) => {
    if (editableCivilQty[slNo] !== undefined) return Number(editableCivilQty[slNo]);
    const field = MAIN_POOL_QTY_FIELDS[slNo];
    if (!field) return 0;
    return getSafeQty(field, safeNumber(civilQuantities[field]));
  };
  const getBalanceTankQuantity = (slNo) => {
    if (editableBalanceQty[slNo] !== undefined) return Number(editableBalanceQty[slNo]);
    const field = BALANCE_TANK_QTY_FIELDS[slNo];
    if (!field) return 0;
    return getSafeQty(field, safeNumber(balanceTankQuantities[field]));
  };
  const getPumpRoomQuantity = (slNo) => {
    if (editablePumpRoomQty[slNo] !== undefined) return Number(editablePumpRoomQty[slNo]);
    const field = PUMP_ROOM_QTY_FIELDS[slNo];
    if (!field) return 0;
    return getSafeQty(field, safeNumber(pumpRoomQuantities[field]));
  };
  const getMepQuantity = (slNo) => {
    if (editableMepQty[slNo] !== undefined) return Number(editableMepQty[slNo]);
    const field = MEP_QTY_FIELDS[slNo];
    if (!field) return 0;
    if (slNo >= 30 && slNo <= 34) return selectedAdvancedEquipment.includes(slNo) ? 1 : 0;
    if (slNo === 30 && !includeHeatPump) return 0;
    return safeNumber(mepQuantities[field]);
  };

  // Memoized totals
  const mainPoolTotal = useMemo(() => {
    if (!mainPoolItems.length) return 0;
    return mainPoolItems.reduce((sum, item) => {
      if (MAIN_POOL_QTY_FIELDS[item.SlNo]) {
        return sum + getCivilQuantity(item.SlNo) * safeNumber(item.Rate);
      }
      return sum;
    }, 0);
  }, [mainPoolItems, civilQuantities, editableCivilQty, isTerracePool]);

  const balanceTankTotal = useMemo(() => {
    if (!hasGutter || !mainPoolItems.length) return 0;
    return mainPoolItems.reduce((sum, item) => {
      if (BALANCE_TANK_QTY_FIELDS[item.SlNo]) {
        return sum + getBalanceTankQuantity(item.SlNo) * safeNumber(item.Rate);
      }
      return sum;
    }, 0);
  }, [mainPoolItems, balanceTankQuantities, hasGutter, editableBalanceQty, isTerracePool]);

  const pumpRoomTotal = useMemo(() => {
    if (!includePumpRoom || !mainPoolItems.length) return 0;
    return mainPoolItems.reduce((sum, item) => {
      if (PUMP_ROOM_QTY_FIELDS[item.SlNo]) {
        return sum + getPumpRoomQuantity(item.SlNo) * safeNumber(item.Rate);
      }
      return sum;
    }, 0);
  }, [mainPoolItems, pumpRoomQuantities, includePumpRoom, editablePumpRoomQty, isTerracePool]);

  const filteredMepItems = useMemo(() => {
    if (!Array.isArray(mepItems)) return [];
    return mepItems.filter((item) => item.SlNo < 35);
  }, [mepItems]);

  const baseMepTotals = useMemo(() => {
    let sup = 0,
      ins = 0;
    if (!filteredMepItems.length) return { totalSupply: 0, totalInstallation: 0, grand: 0 };
    filteredMepItems.forEach((item) => {
      if (item.SlNo >= 30 && item.SlNo <= 34) return;
      const q = getMepQuantity(item.SlNo);
      sup += getSupplyCost(item, q);
      ins += getInstallationCost(item, q);
    });
    return { totalSupply: sup, totalInstallation: ins, grand: sup + ins };
  }, [filteredMepItems, mepQuantities, dynamicRates, includeHeatPump, editableMepQty]);

  const advancedEquipmentTotals = useMemo(() => {
    let sup = 0,
      ins = 0;
    if (!filteredMepItems.length) return { totalSupply: 0, totalInstallation: 0, grand: 0 };
    filteredMepItems.forEach((item) => {
      if (item.SlNo >= 30 && item.SlNo <= 34 && selectedAdvancedEquipment.includes(item.SlNo)) {
        sup += getSupplyCost(item, 1);
        ins += getInstallationCost(item, 1);
      }
    });
    return { totalSupply: sup, totalInstallation: ins, grand: sup + ins };
  }, [filteredMepItems, selectedAdvancedEquipment, dynamicRates]);

  const totalMepCost = baseMepTotals.grand + advancedEquipmentTotals.grand;

  const computedPipingTotal = useMemo(() => {
    return pipingItems.reduce((sum, item) => {
      const qty =
        editablePipingQty[item.SlNo] !== undefined ? editablePipingQty[item.SlNo] : safeNumber(item.Quantity);
      return sum + qty * (safeNumber(item.SupplyRate) + safeNumber(item.InstallationRate));
    }, 0);
  }, [pipingItems, editablePipingQty]);

  useEffect(() => {
    setPipingTotal(computedPipingTotal);
  }, [computedPipingTotal]);

  const grandTotal =
    safeNumber(mainPoolTotal) +
    (hasGutter ? safeNumber(balanceTankTotal) : 0) +
    safeNumber(pumpRoomTotal) +
    safeNumber(totalMepCost) +
    safeNumber(pipingTotal);

  const workingDays = useMemo(() => {
    if (!resultData?.timeline) return 0;
    return resultData.timeline.reduce((t, p) => t + (p.days || 0), 0);
  }, [resultData]);

  const resultDataForSave = {
    project_type: "freeform",
    main_pool_total: mainPoolTotal,
    balance_tank_total: hasGutter ? balanceTankTotal : 0,
    pump_room_total: pumpRoomTotal,
    mep_total: totalMepCost,
    piping_total: pipingTotal,
    working_days: workingDays,
    pool_specification: {
      length: dimensions?.length || 0,
      width: dimensions?.width || 0,
      depth: dimensions?.depth || 0,
      volume: resultData?.volume_m3 || dimensions?.length * dimensions?.width * dimensions?.depth || 0,
      flow_rate: resultData?.flowrate_m3_per_hr || 0,
    },
    system_settings: {
      has_gutter: hasGutter,
      pool_type: poolType,
      construction_type: constructionType,
      safety_factor: safetyFactor,
      pump_room_distance: equipmentDistance,
    },
    totals: {
      subtotal: grandTotal,
      gst: grandTotal * 0.18,
      final_total: grandTotal + grandTotal * 0.18,
    },
    grand_total: grandTotal,
  };

  // ----- LocalStorage & UI toggles (same as Overflow) -----
  useEffect(() => {
    const savedVis = JSON.parse(localStorage.getItem("columnVisibility") || "null");
    if (savedVis) setColumnVisibility(savedVis);
    const savedSel = JSON.parse(localStorage.getItem("selectedTables") || "null");
    if (savedSel) setSelectedTables(savedSel);
    const savedAdv = JSON.parse(localStorage.getItem("selectedAdvancedEquipment") || "[]");
    if (savedAdv) setSelectedAdvancedEquipment(savedAdv);
    const savedDB = localStorage.getItem("updateDatabase");
    if (savedDB !== null) setUpdateDatabase(savedDB === "true");
    const saved = JSON.parse(localStorage.getItem("saved_calculations") || "[]");
    setSavedCalculations(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("columnVisibility", JSON.stringify(columnVisibility));
  }, [columnVisibility]);
  useEffect(() => {
    localStorage.setItem("selectedTables", JSON.stringify(selectedTables));
  }, [selectedTables]);
  useEffect(() => {
    localStorage.setItem("selectedAdvancedEquipment", JSON.stringify(selectedAdvancedEquipment));
  }, [selectedAdvancedEquipment]);
  useEffect(() => {
    localStorage.setItem("updateDatabase", updateDatabase.toString());
  }, [updateDatabase]);

  const toggleColumnVisibility = (col) =>
    setColumnVisibility((p) => ({ ...p, [col]: !p[col] }));
  const resetColumnVisibility = () =>
    setColumnVisibility({ image: true, unit: true, qty: true, fixedRate: true, remarks: true, code: true });
  const toggleTableSelection = (tbl) =>
    setSelectedTables((p) => ({ ...p, [tbl]: !p[tbl] }));
  const selectAllTables = () =>
    setSelectedTables({ mainPool: true, balanceTank: true, pumpRoom: true, mep: true, piping: true });
  const deselectAllTables = () =>
    setSelectedTables({ mainPool: false, balanceTank: false, pumpRoom: false, mep: false, piping: false });
  const toggleDropdown = (name) => setOpenDropdown(openDropdown === name ? null : name);
  const handleAdvancedEquipmentToggle = (slNo) =>
    setSelectedAdvancedEquipment((prev) =>
      prev.includes(slNo) ? prev.filter((id) => id !== slNo) : [...prev, slNo]
    );
  const handleSelectAllAdvanced = () => {
    const adv = [30, 31, 32, 33, 34];
    setSelectedAdvancedEquipment((prev) => (prev.length === adv.length ? [] : adv));
  };

  // Exchange rate
  const fetchRealTimeExchangeRate = async () => {
    setLoadingExchangeRate(true);
    setExchangeRateError(null);
    try {
      const apiUrls = [
        "https://api.exchangerate-api.com/v4/latest/INR",
        "https://open.er-api.com/v6/latest/INR",
      ];
      let found = false;
      for (const url of apiUrls) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          if (!res.ok) continue;
          const data = await res.json();
          let usd = data.rates?.USD || data.rates?.usd || data.conversion_rates?.USD;
          if (usd && !isNaN(usd) && usd > 0) {
            setExchangeRate(1 / usd);
            setLastExchangeUpdate(new Date());
            found = true;
            break;
          }
        } catch {}
      }
      if (!found) {
        setExchangeRate(83.0);
        setLastExchangeUpdate(new Date());
        setExchangeRateError("Using fallback rate: 1 USD = 83.0 INR");
      }
    } catch {
      setExchangeRate(83.0);
      setLastExchangeUpdate(new Date());
      setExchangeRateError("Failed to fetch. Using fallback.");
    } finally {
      setLoadingExchangeRate(false);
    }
  };

  const formatCurrency = (amount, curr = currency) => {
    const safeAmt = safeNumber(amount);
    if (curr === "USD") return `$${safeToFixed(safeAmt / exchangeRate, 2)}`;
    return `₹${formatIndianCurrency(safeAmt)}`;
  };
  const getCurrencySymbol = () => (currency === "USD" ? "$" : "₹");
  const handleCurrencyToggle = () => setCurrency((p) => (p === "INR" ? "USD" : "INR"));

  // ----- Data fetching (identical to original Freeform) -----
  useEffect(() => {
    const fetchMainPool = async () => {
      setLoadingMainPool(true);
      try {
        const headers = getTenantAuthHeaders(navigate);
        const res = await fetch(`${API_BASE_URL}/admin/main_pool`, { headers });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setMainPoolItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.message !== "AUTH_MISSING") console.error(err);
        setMainPoolItems([]);
      } finally {
        setLoadingMainPool(false);
      }
    };
    fetchMainPool();
  }, [navigate]);

  useEffect(() => {
    const fetchMep = async () => {
      setLoadingMep(true);
      try {
        const headers = getTenantAuthHeaders(navigate);
        const res = await fetch(`${API_BASE_URL}/admin/mep`, { headers });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const items = Array.isArray(data) ? data : data?.items || data?.mep_items || [];
        setMepItems(items);
      } catch (err) {
        if (err.message !== "AUTH_MISSING") console.error(err);
        setMepItems([]);
      } finally {
        setLoadingMep(false);
      }
    };
    fetchMep();
  }, [navigate]);

  useEffect(() => {
    const fetchBalance = async () => {
      setLoadingBalanceTank(true);
      try {
        const headers = getTenantAuthHeaders(navigate);
        const res = await fetch(`${API_BASE_URL}/admin/balancetank`, { headers });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setBalanceTankItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.message !== "AUTH_MISSING") console.error(err);
        setBalanceTankItems([]);
      } finally {
        setLoadingBalanceTank(false);
      }
    };
    fetchBalance();
  }, [navigate]);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const code = localStorage.getItem("tenant_company_code");
        if (!code) return;
        const headers = getTenantAuthHeaders(navigate);
        const res = await fetch(
          `${API_BASE_URL}/admin/tenant/public-profile?company_code=${code}`,
          { headers }
        );
        const data = await res.json();
        if (data.success && data.data) {
          setCompanyProfile(data.data);
          localStorage.setItem("tenant_company_profile", JSON.stringify(data.data));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCompany();
  }, [navigate]);

  const fetchMepCalculation = useCallback(async () => {
    if (!dimensions.length || !dimensions.width || !dimensions.depth) return;
    setLoadingMepCalculation(true);
    setLoadingPiping(true);
    try {
      const headers = getTenantAuthHeaders(navigate);
      const url = `${API_BASE_URL}/freeform/calculations/mep/${dimensions.length}/${dimensions.width}/${dimensions.depth}?pool_type=${poolType}&auto_dosing=true&include_heat_pump=${includeHeatPump}&pool_location=${constructionType}&has_gutter=${hasGutter}&turnover=4.5&update_database=${updateDatabase}&pump_room_distance=${equipmentDistance}&safety_factor=${safetyFactor}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.success) return;
      if (data.quantities) setResultData((p) => ({ ...p, mep_quantities: data.quantities }));
      if (data.civil_quantities) setResultData((p) => ({ ...p, civil_quantities: data.civil_quantities }));
      if (data.balance_tank_quantities)
        setResultData((p) => ({ ...p, balance_tank_quantities: data.balance_tank_quantities }));
      if (data.pump_room_quantities)
        setResultData((p) => ({ ...p, pump_room_quantities: data.pump_room_quantities }));
      if (data.piping_items && data.piping_items.length) {
        const mapped = data.piping_items.map(mapPipingItem).filter(Boolean);
        setPipingItems(mapped);
        setPipingTotal(mapped.reduce((s, it) => s + safeNumber(it.Total), 0));
      } else {
        setPipingItems([]);
        setPipingTotal(0);
      }
      if (data.system_parameters) {
        setDynamicRates({
          filter_rate: data.system_parameters.filter_rate ?? 0,
          pump_rate: data.system_parameters.pump_rate ?? 0,
          filter_description: (() => {
            const mep1 = data.mep_items?.find((m) => Number(m.SlNo ?? m.sl_no) === 1);
            const d1 = mep1?.Description || "";
            if (d1 && !d1.includes("{{")) return d1;
            const sp = data.system_parameters.filter_description || "";
            if (sp && !sp.includes("{{")) return sp;
            return "";
          })(),
          pump_description: (() => {
            const mep7 = data.mep_items?.find((m) => Number(m.SlNo ?? m.sl_no) === 7);
            const d7 = mep7?.Description || "";
            if (d7 && !d7.includes("{{")) return d7;
            const sp = data.system_parameters.pump_description || "";
            if (sp && !sp.includes("{{")) return sp;
            return "";
          })(),
          source: data.system_parameters.rate_source || "no_match",
          exact_match: data.system_parameters.rate_source === "mep_rates_exact",
          hp_overridden: data.system_parameters.hp_overridden || false,
          original_hp: data.system_parameters.original_hp || null,
          hp_from_db: data.system_parameters.pump_hp || data.system_parameters.hp_from_db || null,
          hp: data.system_parameters.pump_hp || data.system_parameters.hp,
          filter_dia: data.system_parameters.filter_diameter,
          database_updated: data.system_parameters.database_updated || false,
          rate_source_note:
            data.system_parameters.rate_source === "mep_rates_exact"
              ? "Rates from mep_rates table"
              : "",
        });
      }
      if (data.heat_pump_selection) {
        setHeatPumpSelection(data.heat_pump_selection);
        setIncludeHeatPump(data.heat_pump_selection.available || false);
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
    } catch (err) {
      if (err.message !== "AUTH_MISSING") console.error(err);
    } finally {
      setLoadingMepCalculation(false);
      setLoadingPiping(false);
    }
  }, [
    dimensions.length,
    dimensions.width,
    dimensions.depth,
    poolType,
    constructionType,
    includeHeatPump,
    hasGutter,
    updateDatabase,
    equipmentDistance,
    safetyFactor,
    navigate,
  ]);

  // Debounced distance update
  useEffect(() => {
    if (!dimensions.length || !dimensions.width || !dimensions.depth) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchMepCalculation();
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [equipmentDistance, safetyFactor, fetchMepCalculation]);

  useEffect(() => {
    if (dimensions?.length && dimensions?.width && dimensions?.depth) fetchMepCalculation();
  }, [
    dimensions.length,
    dimensions.width,
    dimensions.depth,
    poolType,
    constructionType,
    includeHeatPump,
    hasGutter,
    updateDatabase,
    fetchMepCalculation,
  ]);

  useEffect(() => {
    fetchRealTimeExchangeRate();
    const interval = setInterval(fetchRealTimeExchangeRate, 3600000);
    return () => clearInterval(interval);
  }, []);

  // ================================
  // STEP 3: UPDATED renderImage FUNCTION WITH TABLE-SPECIFIC OVERRIDE
  // ================================
  const renderImage = (imageData, item = null, tableType = "default") => {
    // Only apply overrides for MEP table
    const overrideImage = tableType === "mep" ? getFreeformMepImage(item) : null;

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
    if (!item) return "";
    if (templateDescriptions && templateDescriptions[item.SlNo]) return templateDescriptions[item.SlNo];
    return item.Description || "Description not available";
  };

  const calculateColSpan = () => {
    let span = 2;
    if (columnVisibility.code) span++;
    if (columnVisibility.image) span++;
    if (columnVisibility.unit) span++;
    if (columnVisibility.qty) span++;
    if (columnVisibility.fixedRate) span++;
    return span;
  };

  // --- Main Pool Table (with sub‑rows for excavation, shuttering, RCC) ---
  const renderMainPoolTable = () => {
    if (!mainPoolItems.length) return <div className="no-data-message">No main pool data available.</div>;
    const excavationSplit = civilQuantities?.excavation_split || {};
    const shutteringSubrows = civilQuantities?.shuttering_subrows || {};
    const rccSubrows = civilQuantities?.rcc_subrows || {};
    const filtered = mainPoolItems.filter((i) => MAIN_POOL_QTY_FIELDS[i.SlNo]).sort((a, b) => a.SlNo - b.SlNo);
    const showExcavationSubRows = !isTerracePool;

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
            {filtered.flatMap((item) => {
              const isExcavation = item.SlNo === 1;
              const isShuttering = item.SlNo === 9;
              const isRCC = item.SlNo === 10;
              const quantity = getCivilQuantity(item.SlNo);
              const rate = safeNumber(item.Rate);
              const amount = quantity * rate;
              const isNewItem = item.SlNo === 3 || item.SlNo === 4;
              const rows = [];

              // Excavation sub‑rows
              if (isExcavation && showExcavationSubRows) {
                const row11Qty =
                  editableSubRowQty["1.1"] !== undefined
                    ? editableSubRowQty["1.1"]
                    : safeNumber(excavationSplit["1.1"]?.qty || 0);
                const row12Qty =
                  editableSubRowQty["1.2"] !== undefined
                    ? editableSubRowQty["1.2"]
                    : safeNumber(excavationSplit["1.2"]?.qty || 0);
                rows.push(
                  <tr key={`main-${item.SlNo}`} style={{ background: "rgba(99,179,237,0.05)", fontWeight: "bold" }}>
                    <td>{item.SlNo}</td>
                    {columnVisibility.code && <td>{item.Code || "N/A"}</td>}
                    <td className="description-cell">{getDescriptionWithTemplate(item)}</td>
                    {columnVisibility.image && <td>{item.Image ? renderImage(item.Image, item, "civil") : "-"}</td>}
                    {columnVisibility.unit && <td>{item.Unit || ""}</td>}
                    {columnVisibility.qty && <td style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>}
                    {columnVisibility.fixedRate && <td style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>}
                    <td className="amount-cell" style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>
                    {columnVisibility.remarks && (
                      <td>
                        <textarea
                          className="remarks-textbox"
                          placeholder="Add remarks..."
                          value={mainPoolRemarks[item.SlNo] || ""}
                          onChange={(e) => setMainPoolRemarks((p) => ({ ...p, [item.SlNo]: e.target.value }))}
                          rows="2"
                        />
                      </td>
                    )}
                  </tr>
                );
                if (excavationSplit["1.1"]) {
                  rows.push(
                    <tr key="sub-1.1" className="sub-row">
                      <td style={{ paddingLeft: "20px", color: "#63b3ed" }}>1.1</td>
                      {columnVisibility.code && <td>-</td>}
                      <td style={{ paddingLeft: "40px", fontSize: "13px" }}>↳ Excavation up to 1.50m depth</td>
                      {columnVisibility.image && <td>-</td>}
                      {columnVisibility.unit && <td>{item.Unit || "CuM"}</td>}
                      {columnVisibility.qty && (
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            value={row11Qty}
                            onChange={(e) => handleQtyChange("subrow", "1.1", e.target.value)}
                            className="qty-input subrow-input"
                          />
                        </td>
                      )}
                      {columnVisibility.fixedRate && <td>{formatCurrency(safeNumber(excavationSplit["1.1"].rate))}</td>}
                      <td className="amount-cell">{formatCurrency(row11Qty * safeNumber(excavationSplit["1.1"].rate))}</td>
                      {columnVisibility.remarks && <td>-</td>}
                    </tr>
                  );
                }
                if (excavationSplit["1.2"]) {
                  rows.push(
                    <tr key="sub-1.2" className="sub-row">
                      <td style={{ paddingLeft: "20px", color: "#63b3ed" }}>1.2</td>
                      {columnVisibility.code && <td>-</td>}
                      <td style={{ paddingLeft: "40px", fontSize: "13px" }}>↳ Excavation above 1.50m depth</td>
                      {columnVisibility.image && <td>-</td>}
                      {columnVisibility.unit && <td>{item.Unit || "CuM"}</td>}
                      {columnVisibility.qty && (
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            value={row12Qty}
                            onChange={(e) => handleQtyChange("subrow", "1.2", e.target.value)}
                            className="qty-input subrow-input"
                          />
                        </td>
                      )}
                      {columnVisibility.fixedRate && <td>{formatCurrency(safeNumber(excavationSplit["1.2"].rate))}</td>}
                      <td className="amount-cell">{formatCurrency(row12Qty * safeNumber(excavationSplit["1.2"].rate))}</td>
                      {columnVisibility.remarks && <td>-</td>}
                    </tr>
                  );
                }
                return rows;
              }

              if (isExcavation && isTerracePool) {
                rows.push(
                  <tr key={`main-${item.SlNo}`} style={{ background: "rgba(99,179,237,0.05)" }}>
                    <td>{item.SlNo}</td>
                    {columnVisibility.code && <td>{item.Code || "N/A"}</td>}
                    <td className="description-cell">{getDescriptionWithTemplate(item)}</td>
                    {columnVisibility.image && <td>{item.Image ? renderImage(item.Image, item, "civil") : "-"}</td>}
                    {columnVisibility.unit && <td>{item.Unit || ""}</td>}
                    {columnVisibility.qty && <td>0.000</td>}
                    {columnVisibility.fixedRate && <td>{formatCurrency(rate)}</td>}
                    <td className="amount-cell">{formatCurrency(0)}</td>
                    {columnVisibility.remarks && (
                      <td>
                        <textarea
                          className="remarks-textbox"
                          placeholder="Add remarks..."
                          value={mainPoolRemarks[item.SlNo] || ""}
                          onChange={(e) => setMainPoolRemarks((p) => ({ ...p, [item.SlNo]: e.target.value }))}
                          rows="2"
                        />
                      </td>
                    )}
                  </tr>
                );
                return rows;
              }

              // Shuttering sub‑rows
              if (isShuttering) {
                const row91 = shutteringSubrows["9.1"] || {};
                const row92 = shutteringSubrows["9.2"] || {};
                const qty91 =
                  editableSubRowQty["9.1"] !== undefined ? editableSubRowQty["9.1"] : safeNumber(row91?.qty || 0);
                const qty92 =
                  editableSubRowQty["9.2"] !== undefined ? editableSubRowQty["9.2"] : safeNumber(row92?.qty || 0);
                const total = qty91 + qty92;
                rows.push(
                  <tr key={`main-${item.SlNo}`} style={{ background: "rgba(99,179,237,0.05)", fontWeight: "bold" }}>
                    <td>{item.SlNo}</td>
                    {columnVisibility.code && <td>{item.Code || "N/A"}</td>}
                    <td className="description-cell">
                      {getDescriptionWithTemplate(item)}
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#666" }}>
                        <small>Total Shuttering: {safeToFixed(total, 3)} SqM</small>
                      </div>
                    </td>
                    {columnVisibility.image && <td>{item.Image ? renderImage(item.Image, item, "civil") : "-"}</td>}
                    {columnVisibility.unit && <td>{item.Unit || ""}</td>}
                    {columnVisibility.qty && <td style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>}
                    {columnVisibility.fixedRate && <td style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>}
                    <td className="amount-cell" style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>
                    {columnVisibility.remarks && (
                      <td>
                        <textarea
                          className="remarks-textbox"
                          placeholder="Add remarks..."
                          value={mainPoolRemarks[item.SlNo] || ""}
                          onChange={(e) => setMainPoolRemarks((p) => ({ ...p, [item.SlNo]: e.target.value }))}
                          rows="2"
                        />
                      </td>
                    )}
                  </tr>
                );
                if (safeNumber(row91?.qty || 0) > 0) {
                  rows.push(
                    <tr key="sub-9.1" className="sub-row">
                      <td style={{ paddingLeft: "20px", color: "#63b3ed" }}>9.1</td>
                      {columnVisibility.code && <td>-</td>}
                      <td style={{ paddingLeft: "40px", fontSize: "13px" }}>↳ {row91?.description || "Raft Shuttering"}</td>
                      {columnVisibility.image && <td>-</td>}
                      {columnVisibility.unit && <td>{item.Unit || "SqM"}</td>}
                      {columnVisibility.qty && (
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            value={qty91}
                            onChange={(e) => handleQtyChange("subrow", "9.1", e.target.value)}
                            className="qty-input subrow-input"
                          />
                        </td>
                      )}
                      {columnVisibility.fixedRate && <td>{formatCurrency(safeNumber(row91?.rate || 0))}</td>}
                      <td className="amount-cell">{formatCurrency(qty91 * safeNumber(row91?.rate || 0))}</td>
                      {columnVisibility.remarks && <td>-</td>}
                    </tr>
                  );
                }
                if (safeNumber(row92?.qty || 0) > 0) {
                  rows.push(
                    <tr key="sub-9.2" className="sub-row">
                      <td style={{ paddingLeft: "20px", color: "#63b3ed" }}>9.2</td>
                      {columnVisibility.code && <td>-</td>}
                      <td style={{ paddingLeft: "40px", fontSize: "13px" }}>
                        ↳ {row92?.description || "Retaining Wall Shuttering"}
                      </td>
                      {columnVisibility.image && <td>-</td>}
                      {columnVisibility.unit && <td>{item.Unit || "SqM"}</td>}
                      {columnVisibility.qty && (
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            value={qty92}
                            onChange={(e) => handleQtyChange("subrow", "9.2", e.target.value)}
                            className="qty-input subrow-input"
                          />
                        </td>
                      )}
                      {columnVisibility.fixedRate && <td>{formatCurrency(safeNumber(row92?.rate || 0))}</td>}
                      <td className="amount-cell">{formatCurrency(qty92 * safeNumber(row92?.rate || 0))}</td>
                      {columnVisibility.remarks && <td>-</td>}
                    </tr>
                  );
                }
                return rows;
              }

              // RCC sub‑rows
              if (isRCC) {
                const row101 = rccSubrows["10.1"] || {};
                const row102 = rccSubrows["10.2"] || {};
                const qty101 =
                  editableSubRowQty["10.1"] !== undefined ? editableSubRowQty["10.1"] : safeNumber(row101?.qty || 0);
                const qty102 =
                  editableSubRowQty["10.2"] !== undefined ? editableSubRowQty["10.2"] : safeNumber(row102?.qty || 0);
                const total = qty101 + qty102;
                rows.push(
                  <tr key={`main-${item.SlNo}`} style={{ background: "rgba(99,179,237,0.05)", fontWeight: "bold" }}>
                    <td>{item.SlNo}</td>
                    {columnVisibility.code && <td>{item.Code || "N/A"}</td>}
                    <td className="description-cell">
                      {getDescriptionWithTemplate(item)}
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#666" }}>
                        <small>Total RCC: {safeToFixed(total, 3)} CuM</small>
                      </div>
                    </td>
                    {columnVisibility.image && <td>{item.Image ? renderImage(item.Image, item, "civil") : "-"}</td>}
                    {columnVisibility.unit && <td>{item.Unit || ""}</td>}
                    {columnVisibility.qty && <td style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>}
                    {columnVisibility.fixedRate && <td style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>}
                    <td className="amount-cell" style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>
                    {columnVisibility.remarks && (
                      <td>
                        <textarea
                          className="remarks-textbox"
                          placeholder="Add remarks..."
                          value={mainPoolRemarks[item.SlNo] || ""}
                          onChange={(e) => setMainPoolRemarks((p) => ({ ...p, [item.SlNo]: e.target.value }))}
                          rows="2"
                        />
                      </td>
                    )}
                  </tr>
                );
                if (safeNumber(row101?.qty || 0) > 0) {
                  rows.push(
                    <tr key="sub-10.1" className="sub-row">
                      <td style={{ paddingLeft: "20px", color: "#63b3ed" }}>10.1</td>
                      {columnVisibility.code && <td>-</td>}
                      <td style={{ paddingLeft: "40px", fontSize: "13px" }}>↳ {row101?.description || "RCC Raft"}</td>
                      {columnVisibility.image && <td>-</td>}
                      {columnVisibility.unit && <td>{item.Unit || "CuM"}</td>}
                      {columnVisibility.qty && (
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            value={qty101}
                            onChange={(e) => handleQtyChange("subrow", "10.1", e.target.value)}
                            className="qty-input subrow-input"
                          />
                        </td>
                      )}
                      {columnVisibility.fixedRate && <td>{formatCurrency(safeNumber(row101?.rate || 0))}</td>}
                      <td className="amount-cell">{formatCurrency(qty101 * safeNumber(row101?.rate || 0))}</td>
                      {columnVisibility.remarks && <td>-</td>}
                    </tr>
                  );
                }
                if (safeNumber(row102?.qty || 0) > 0) {
                  rows.push(
                    <tr key="sub-10.2" className="sub-row">
                      <td style={{ paddingLeft: "20px", color: "#63b3ed" }}>10.2</td>
                      {columnVisibility.code && <td>-</td>}
                      <td style={{ paddingLeft: "40px", fontSize: "13px" }}>↳ {row102?.description || "RCC Retaining Wall"}</td>
                      {columnVisibility.image && <td>-</td>}
                      {columnVisibility.unit && <td>{item.Unit || "CuM"}</td>}
                      {columnVisibility.qty && (
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            value={qty102}
                            onChange={(e) => handleQtyChange("subrow", "10.2", e.target.value)}
                            className="qty-input subrow-input"
                          />
                        </td>
                      )}
                      {columnVisibility.fixedRate && <td>{formatCurrency(safeNumber(row102?.rate || 0))}</td>}
                      <td className="amount-cell">{formatCurrency(qty102 * safeNumber(row102?.rate || 0))}</td>
                      {columnVisibility.remarks && <td>-</td>}
                    </tr>
                  );
                }
                return rows;
              }

              // Regular item (non‑split)
              rows.push(
                <tr key={`main-${item.SlNo}`} style={isNewItem ? { background: "rgba(34,197,94,0.04)" } : {}}>
                  <td>{item.SlNo}</td>
                  {columnVisibility.code && <td>{item.Code || "N/A"}</td>}
                  <td className="description-cell">
                    {getDescriptionWithTemplate(item)}
                    {isNewItem && (
                      <span style={{ marginLeft: "8px", fontSize: "10px", color: "#4ade80", fontStyle: "italic" }}>
                        🆕
                      </span>
                    )}
                  </td>
                  {columnVisibility.image && <td>{item.Image ? renderImage(item.Image, item, "civil") : "-"}</td>}
                  {columnVisibility.unit && <td>{item.Unit || ""}</td>}
                  {columnVisibility.qty && (
                    <td className={quantity ? "quantity-filled" : ""}>
                      <input
                        type="number"
                        step="0.001"
                        value={quantity}
                        onChange={(e) => handleQtyChange("civil", item.SlNo, e.target.value)}
                        className="qty-input"
                      />
                    </td>
                  )}
                  {columnVisibility.fixedRate && <td>{formatCurrency(rate)}</td>}
                  <td className="amount-cell">{formatCurrency(amount)}</td>
                  {columnVisibility.remarks && (
                    <td>
                      <textarea
                        className="remarks-textbox"
                        placeholder="Add remarks..."
                        value={mainPoolRemarks[item.SlNo] || ""}
                        onChange={(e) => setMainPoolRemarks((p) => ({ ...p, [item.SlNo]: e.target.value }))}
                        rows="2"
                      />
                    </td>
                  )}
                </tr>
              );
              return rows;
            })}
          </tbody>
          <tfoot>
            <tr className="table-total">
              <td colSpan={calculateColSpan()} style={{ textAlign: "right", fontWeight: "bold" }}>
                Total:
              </td>
              <td className="amount-cell total-amount" style={{ fontWeight: "bold" }}>
                {formatCurrency(mainPoolTotal)}
              </td>
              {columnVisibility.remarks && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  // --- Balance Tank Table (no sub‑rows) ---
  const renderBalanceTankTable = () => {
    if (!hasGutter)
      return (
        <div className="balance-tank-disabled-message">
          <div className="info-message">
            <span className="info-icon">ℹ️</span> Balance Tank is only applicable when gutter system is selected.
          </div>
        </div>
      );
    if (!mainPoolItems.length) return <div className="no-data-message">No balance tank data available.</div>;
    const filtered = mainPoolItems
      .filter((i) => i.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[i.SlNo])
      .sort((a, b) => a.SlNo - b.SlNo);
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
            {filtered.map((item) => {
              const qty = getBalanceTankQuantity(item.SlNo);
              const rate = safeNumber(item.Rate);
              const amount = qty * rate;
              const isNew = item.SlNo === 3 || item.SlNo === 4;
              return (
                <tr key={`bt-${item.SlNo}`} style={isNew ? { background: "rgba(34,197,94,0.04)" } : {}}>
                  <td>{item.SlNo}</td>
                  {columnVisibility.code && <td>{item.Code || "N/A"}</td>}
                  <td className="description-cell">
                    {getDescriptionWithTemplate(item)}
                    <div className="balance-tank-badge">
                      <small>Balance Tank</small>
                    </div>
                    {isNew && (
                      <span style={{ marginLeft: "8px", fontSize: "10px", color: "#4ade80", fontStyle: "italic" }}>
                        🆕
                      </span>
                    )}
                  </td>
                  {columnVisibility.image && <td>{item.Image ? renderImage(item.Image, item, "balance") : "-"}</td>}
                  {columnVisibility.unit && <td>{item.Unit || ""}</td>}
                  {columnVisibility.qty && (
                    <td className={qty ? "quantity-filled" : ""}>
                      <input
                        type="number"
                        step="0.001"
                        value={qty}
                        onChange={(e) => handleQtyChange("balance", item.SlNo, e.target.value)}
                        className="qty-input"
                      />
                    </td>
                  )}
                  {columnVisibility.fixedRate && <td>{formatCurrency(rate)}</td>}
                  <td className="amount-cell">{formatCurrency(amount)}</td>
                  {columnVisibility.remarks && (
                    <td>
                      <textarea
                        className="remarks-textbox"
                        placeholder="Add remarks..."
                        value={balanceTankRemarks[item.SlNo] || ""}
                        onChange={(e) => setBalanceTankRemarks((p) => ({ ...p, [item.SlNo]: e.target.value }))}
                        rows="2"
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-total">
              <td colSpan={calculateColSpan()} style={{ textAlign: "right", fontWeight: "bold" }}>
                Total:
              </td>
              <td className="amount-cell total-amount" style={{ fontWeight: "bold" }}>
                {formatCurrency(balanceTankTotal)}
              </td>
              {columnVisibility.remarks && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  // --- Pump Room Table (no sub‑rows) ---
  const renderPumpRoomTable = () => {
    if (!includePumpRoom)
      return (
        <div className="pump-room-disabled-message">
          <div className="info-message">
            <span className="info-icon">ℹ️</span> Pump Room calculation is currently disabled.
          </div>
        </div>
      );
    if (!mainPoolItems.length) return <div className="no-data-message">No pump room data available.</div>;
    const filtered = mainPoolItems
      .filter((i) => i.SlNo <= 12 && PUMP_ROOM_QTY_FIELDS[i.SlNo])
      .sort((a, b) => a.SlNo - b.SlNo);
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
            {filtered.map((item) => {
              const qty = getPumpRoomQuantity(item.SlNo);
              const rate = safeNumber(item.Rate);
              const amount = qty * rate;
              const isNew = item.SlNo === 3 || item.SlNo === 4;
              return (
                <tr key={`pr-${item.SlNo}`} style={isNew ? { background: "rgba(34,197,94,0.04)" } : {}}>
                  <td>{item.SlNo}</td>
                  {columnVisibility.code && <td>{item.Code || "N/A"}</td>}
                  <td className="description-cell">
                    {getDescriptionWithTemplate(item)}
                    <div className="pump-room-badge">
                      <small>Pump Room</small>
                    </div>
                    {isNew && (
                      <span style={{ marginLeft: "8px", fontSize: "10px", color: "#4ade80", fontStyle: "italic" }}>
                        🆕
                      </span>
                    )}
                  </td>
                  {columnVisibility.image && <td>{item.Image ? renderImage(item.Image, item, "pump") : "-"}</td>}
                  {columnVisibility.unit && <td>{item.Unit || ""}</td>}
                  {columnVisibility.qty && (
                    <td className={qty ? "quantity-filled" : ""}>
                      <input
                        type="number"
                        step="0.001"
                        value={qty}
                        onChange={(e) => handleQtyChange("pump", item.SlNo, e.target.value)}
                        className="qty-input"
                      />
                    </td>
                  )}
                  {columnVisibility.fixedRate && <td>{formatCurrency(rate)}</td>}
                  <td className="amount-cell">{formatCurrency(amount)}</td>
                  {columnVisibility.remarks && (
                    <td>
                      <textarea
                        className="remarks-textbox"
                        placeholder="Add remarks..."
                        value={pumpRoomRemarks[item.SlNo] || ""}
                        onChange={(e) => setPumpRoomRemarks((p) => ({ ...p, [item.SlNo]: e.target.value }))}
                        rows="2"
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-total">
              <td colSpan={calculateColSpan()} style={{ textAlign: "right", fontWeight: "bold" }}>
                Total:
              </td>
              <td className="amount-cell total-amount" style={{ fontWeight: "bold" }}>
                {formatCurrency(pumpRoomTotal)}
              </td>
              {columnVisibility.remarks && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  // --- MEP Table (Base + Advanced) ---
  const renderMepTable = () => {
    if (!filteredMepItems.length) return <div className="no-data-message">No MEP data available.</div>;
    const baseItems = filteredMepItems.filter((i) => i.SlNo <= 29);
    const advItems = filteredMepItems.filter((i) => i.SlNo >= 30 && i.SlNo <= 34);
    const getVisibleColCount = (isAdv = false) => {
      let c = 1;
      if (isAdv) c++;
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
        <div className="mep-controls">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={updateDatabase}
              onChange={(e) => setUpdateDatabase(e.target.checked)}
              className="toggle-checkbox"
            />
            <span className="toggle-text">
              {updateDatabase ? "✅ Save rates to mep_tenant_data" : "💾 Don't save rates to database"}
            </span>
          </label>
          {dynamicRates.database_updated && (
            <span className="update-success-badge" style={{ marginLeft: "12px", color: "#4ade80", fontSize: "12px" }}>
              ✓ Rates saved to mep_tenant_data
            </span>
          )}
        </div>
        {/* Base MEP */}
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
                  {columnVisibility.fixedRate && (
                    <>
                      <th>Supply</th>
                      <th>Installation</th>
                    </>
                  )}
                  <th>Supply</th>
                  <th>Installation</th>
                  <th>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {baseItems.map((item) => {
                  const qty = getMepQuantity(item.SlNo);
                  const supplyRate = getSupplyRate(item);
                  const instRate = getInstallationRate(item);
                  const supplyCost = getSupplyCost(item, qty);
                  const instCost = getInstallationCost(item, qty);
                  const total = getRowTotal(item, qty);
                  const isZero = qty === 0;
                  const desc = getResolvedMepDescription(item.SlNo, item);
                  return (
                    <tr key={item.SlNo} className={isZero ? "zero-quantity-row" : ""}>
                      <td>{item.SlNo}</td>
                      {columnVisibility.code && <td>{item.Code || "N/A"}</td>}
                      <td className="description-cell">
                        {desc}
                        {(item.SlNo === 1 || item.SlNo === 7) && (
                          <div className="dynamic-rate-indicator">
                            <small>
                              {dynamicRates.source === "mep_rates_exact"
                                ? "✅ Exact match from mep_rates table"
                                : dynamicRates.source === "mep_rates_closest"
                                ? "⚠️ Using closest match"
                                : "❌ No match - using 0"}
                            </small>
                          </div>
                        )}
                      </td>
                      {columnVisibility.image && <td>{item.Image ? renderImage(item.Image, item, "mep") : "-"}</td>}
                      {columnVisibility.unit && <td>{item.Unit || ""}</td>}
                      {columnVisibility.qty && (
                        <td className={qty ? "quantity-filled" : ""}>
                          <input
                            type="number"
                            step="0.001"
                            value={qty}
                            onChange={(e) => handleQtyChange("mep", item.SlNo, e.target.value)}
                            className="qty-input"
                          />
                        </td>
                      )}
                      {columnVisibility.fixedRate && (
                        <>
                          <td>{formatCurrency(supplyRate)}</td>
                          <td>{formatCurrency(instRate)}</td>
                        </>
                      )}
                      <td>{formatCurrency(supplyCost)}</td>
                      <td>{formatCurrency(instCost)}</td>
                      <td className="amount-cell">{formatCurrency(total)}</td>
                      {columnVisibility.remarks && (
                        <td>
                          <textarea
                            className="remarks-textbox"
                            placeholder="Add remarks..."
                            value={mepRemarks[item.SlNo] || ""}
                            onChange={(e) => setMepRemarks((p) => ({ ...p, [item.SlNo]: e.target.value }))}
                            rows="2"
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="table-subtotal">
                  <td colSpan={getVisibleColCount(false) - 3} className="subtotal-label">
                    Subtotal:
                  </td>
                  <td className="amount-cell subtotal-value">{formatCurrency(baseMepTotals.totalSupply)}</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(baseMepTotals.totalInstallation)}</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(baseMepTotals.grand)}</td>
                  {columnVisibility.remarks && <td className="subtotal-empty"></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        {/* Advanced Equipment */}
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
                  {columnVisibility.fixedRate && (
                    <>
                      <th>Supply</th>
                      <th>Installation</th>
                    </>
                  )}
                  <th>Supply</th>
                  <th>Installation</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {advItems.map((item) => {
                  const selected = selectedAdvancedEquipment.includes(item.SlNo);
                  const qty = selected ? 1 : 0;
                  const supplyRate = getSupplyRate(item);
                  const instRate = getInstallationRate(item);
                  const supplyCost = getSupplyCost(item, qty);
                  const instCost = getInstallationCost(item, qty);
                  const total = getRowTotal(item, qty);
                  return (
                    <tr key={item.SlNo} className={!selected ? "equipment-not-selected" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleAdvancedEquipmentToggle(item.SlNo)}
                        />
                      </td>
                      <td>{item.SlNo}</td>
                      {columnVisibility.code && <td>{item.Code || "N/A"}</td>}
                      <td className="description-cell">{item.Description || "N/A"}</td>
                      {columnVisibility.image && <td>{item.Image ? renderImage(item.Image, item, "mep") : "-"}</td>}
                      {columnVisibility.unit && <td>{item.Unit || ""}</td>}
                      {columnVisibility.qty && <td>{selected ? "1" : "0"}</td>}
                      {columnVisibility.fixedRate && (
                        <>
                          <td>{formatCurrency(supplyRate)}</td>
                          <td>{formatCurrency(instRate)}</td>
                        </>
                      )}
                      <td>{formatCurrency(supplyCost)}</td>
                      <td>{formatCurrency(instCost)}</td>
                      <td className="amount-cell">{formatCurrency(total)}</td>
                      {columnVisibility.remarks && (
                        <td>
                          <textarea
                            className="remarks-textbox"
                            placeholder="Add remarks..."
                            value={mepRemarks[item.SlNo] || ""}
                            onChange={(e) => setMepRemarks((p) => ({ ...p, [item.SlNo]: e.target.value }))}
                            rows="2"
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="table-subtotal">
                  <td colSpan={getVisibleColCount(true) - 3} className="subtotal-label">
                    Subtotal:
                  </td>
                  <td className="amount-cell subtotal-value">{formatCurrency(advancedEquipmentTotals.totalSupply)}</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(advancedEquipmentTotals.totalInstallation)}</td>
                  <td className="amount-cell subtotal-value">{formatCurrency(advancedEquipmentTotals.grand)}</td>
                  {columnVisibility.remarks && <td className="subtotal-empty"></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </>
    );
  };

  // --- Piping Table (with category grouping) ---
  const renderPipingTable = () => {
    if (loadingPiping) {
      return (
        <div className="loading-spinner" style={{ textAlign: "center", padding: "40px" }}>
          <span className="status-icon">⏳</span>
          <span>Loading piping calculations...</span>
        </div>
      );
    }
    const valid = pipingItems.filter((i) => i && i.Description);
    if (!valid.length)
      return (
        <div className="no-data-message">
          No piping items available. Please check the pump room distance and ensure piping data is available.
        </div>
      );
    const groups = {
      pipes: valid.filter((i) => i.Category === "pipe"),
      headers: valid.filter((i) => i.Category === "header"),
      ball_valves: valid.filter((i) => i.Category === "ball_valve"),
      flanges: valid.filter((i) => i.Category === "flange"),
      puddle_flanges: valid.filter((i) => i.Category === "puddle_flange"),
    };
    const categoryNames = {
      pipes: "Pipes",
      headers: "Headers",
      ball_valves: "Ball Valves",
      flanges: "Flanges",
      puddle_flanges: "Puddle Flanges",
    };
    const calculatePipingColSpan = () => {
      let span = 2;
      if (columnVisibility.code) span++;
      if (columnVisibility.image) span++;
      if (columnVisibility.unit) span++;
      if (columnVisibility.qty) span++;
      if (columnVisibility.fixedRate) span += 2;
      span += 3;
      return span;
    };
    return (
      <div className="piping-system-section">
        <div className="section-header">
          <h2 className="section-title">Piping System</h2>
          <div className="header-controls">
            <div className="total-amount-box">
              <span className="total-label">Grand Total:</span>
              <span className="total-value">{formatCurrency(pipingTotal)}</span>
            </div>
            <div className="item-count-badge">{pipingItems.length} items</div>
          </div>
        </div>
        <div
          className="piping-distance-input"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "15px",
            padding: "12px 15px",
            background: "rgba(99,179,237,0.08)",
            borderRadius: "8px",
            border: "1px solid rgba(99,179,237,0.2)",
          }}
        >
          <label style={{ fontWeight: "600", color: "#63b3ed" }}>Pump Room Distance (m):</label>
          <input
            type="number"
            min="1"
            step="1"
            value={equipmentDistance}
            onChange={handleDistanceChange}
            style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ccc", width: "100px", background: "#fff", color: "#333" }}
          />
          <div style={{ marginLeft: "auto", fontSize: "12px", color: "#888" }}>Current Distance: {equipmentDistance} m</div>
        </div>
        {Object.entries(groups).map(([cat, items]) => {
          if (!items.length) return null;
          return (
            <div key={cat} className="piping-section">
              <h3 className="piping-section-title">
                {categoryNames[cat] || cat.replace(/_/g, " ")} ({items.length})
              </h3>
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
                      {columnVisibility.fixedRate && (
                        <>
                          <th>Supply</th>
                          <th>Installation</th>
                        </>
                      )}
                      <th>Supply</th>
                      <th>Installation</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const qty =
                        editablePipingQty[item.SlNo] !== undefined
                          ? editablePipingQty[item.SlNo]
                          : safeNumber(item.Quantity);
                      const supplyCost = qty * safeNumber(item.SupplyRate);
                      const instCost = qty * safeNumber(item.InstallationRate);
                      const total = supplyCost + instCost;
                      return (
                        <tr key={`${cat}-${item.SlNo || idx}`} className={qty === 0 ? "zero-quantity-row" : ""}>
                          <td>{item.SlNo || idx + 1}</td>
                          {columnVisibility.code && <td>{item.Code || "-"}</td>}
                          <td className="description-cell">{item.Description || "-"}</td>
                          <td>{item.Dia && item.Dia !== 0 ? `${item.Dia} mm` : "-"}</td>
                          {columnVisibility.qty && (
                            <td className={qty ? "quantity-filled" : "quantity-zero"}>
                              <input
                                type="number"
                                step="0.001"
                                value={qty}
                                onChange={(e) => handleQtyChange("piping", item.SlNo, e.target.value)}
                                className="qty-input"
                              />
                            </td>
                          )}
                          {columnVisibility.unit && <td>{item.Unit}</td>}
                          {columnVisibility.fixedRate && (
                            <>
                              <td>{formatCurrency(item.SupplyRate)}</td>
                              <td>{formatCurrency(item.InstallationRate)}</td>
                            </>
                          )}
                          <td>{formatCurrency(supplyCost)}</td>
                          <td>{formatCurrency(instCost)}</td>
                          <td className="amount-cell">{formatCurrency(total)}</td>
                          {columnVisibility.remarks && (
                            <td>
                              <textarea
                                className="remarks-textbox"
                                placeholder="Add remarks..."
                                rows="2"
                                value={mepRemarks[`piping_${item.SlNo}`] || ""}
                                onChange={(e) => setMepRemarks((p) => ({ ...p, [`piping_${item.SlNo}`]: e.target.value }))}
                              />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="table-subtotal">
                      <td colSpan={calculatePipingColSpan()} style={{ textAlign: "right", fontWeight: "bold" }}>
                        Section Total:
                      </td>
                      <td className="amount-cell" style={{ fontWeight: "bold" }}>
                        {formatCurrency(
                          items.reduce((sum, it) => {
                            const q =
                              editablePipingQty[it.SlNo] !== undefined
                                ? editablePipingQty[it.SlNo]
                                : safeNumber(it.Quantity);
                            return sum + q * (safeNumber(it.SupplyRate) + safeNumber(it.InstallationRate));
                          }, 0)
                        )}
                      </td>
                      {columnVisibility.remarks && <td className="subtotal-empty"></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}
        <div className="boq-note">
          <div>
            <strong>Note:</strong> Piping quantities are calculated based on pool dimensions, pump room distance,
            and MEP equipment quantities. Installation cost is {INSTALLATION_PERCENT * 100}% of supply cost.
            <strong> Items are sorted in ascending diameter order for proper BOQ format.</strong>
          </div>
        </div>
      </div>
    );
  };

  // Save, PDF, Excel (same as original)
  const saveCalculation = () => {
    try {
      const newCalc = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        dimensions: dimensions ? `${dimensions.length} × ${dimensions.width} × ${dimensions.depth} m` : "N/A",
        poolType,
        constructionType,
        totalCost: grandTotal,
        mainPoolCost: mainPoolTotal,
        balanceTankCost: hasGutter ? balanceTankTotal : 0,
        pumpRoomCost: pumpRoomTotal,
        mepCost: totalMepCost,
        pipingCost: pipingTotal,
        includePumpRoom,
        includeHeatPump,
        selectedAdvancedEquipment,
        pumpRoomDistance: equipmentDistance,
      };
      const existing = JSON.parse(localStorage.getItem("saved_calculations") || "[]");
      const isDuplicate = existing.some(
        (calc) =>
          JSON.stringify(calc.dimensions) === JSON.stringify(dimensions) &&
          calc.poolType === poolType &&
          calc.pumpRoomDistance === equipmentDistance
      );
      if (isDuplicate) {
        alert("⚠️ A calculation with these settings already exists!");
        return;
      }
      const updated = [newCalc, ...existing]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
      localStorage.setItem("saved_calculations", JSON.stringify(updated));
      setSavedCalculations(updated);
      alert("✅ Calculation saved successfully!");
    } catch {
      alert("❌ Failed to save calculation.");
    }
  };

  const downloadPDF = async () => {
    try {
      if (!Object.values(selectedTables).some(Boolean)) {
        alert("⚠️ Please select at least one table to export!");
        return;
      }
      const safeMain = mainPoolItems.filter((i) => MAIN_POOL_QTY_FIELDS[i.SlNo]);
      const safeBalance = balanceTankItems.filter((i) => i.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[i.SlNo]);
      const safeMep = filteredMepItems;
      const safePiping = pipingItems;
      await generatePDF({
        resultData,
        poolType: "freeform",
        constructionType,
        dimensions,
        pumpRoomDimensions,
        mainPoolItems: selectedTables.mainPool ? safeMain : [],
        mainPoolTotal: Number(mainPoolTotal || 0),
        civilQuantities,
        mainPoolRemarks,
        hasBalancingTank: hasGutter,
        balanceTankItems: selectedTables.balanceTank && hasGutter ? safeBalance : [],
        balanceTankQuantities,
        balanceTankTotal: hasGutter ? Number(balanceTankTotal || 0) : 0,
        balanceTankRemarks,
        overflowGratingData: null,
        mepItems: selectedTables.mep ? safeMep : [],
        mepQuantities,
        mepTotal: Number(totalMepCost || 0),
        mepRemarks,
        includePumpRoom: selectedTables.pumpRoom ? includePumpRoom : false,
        pumpRoomItems: [],
        pumpRoomQuantities,
        pumpRoomTotal: selectedTables.pumpRoom ? Number(pumpRoomTotal || 0) : 0,
        pumpRoomRemarks,
        pipingItems: selectedTables.piping ? safePiping : [],
        pipingTotal: Number(pipingTotal || 0),
        pumpRoomDistance: equipmentDistance || 15,
        dynamicRates,
        templateDescriptions,
        selectedTables,
        columnVisibility,
        selectedAdvancedEquipment,
        currency,
        exchangeRate,
        companyProfile,
        excavationSplit: civilQuantities?.excavation_split || {},
        shutteringSubrows: civilQuantities?.shuttering_subrows || {},
        rccSubrows: civilQuantities?.rcc_subrows || {},
        poolShape: "freeform",
      });
    } catch (error) {
      console.error("❌ Freeform PDF Error:", error);
      alert("PDF generation failed. Check console for details.");
    }
  };

  // Currency Toggle Component (reused)
  const CurrencyToggle = () => (
    <div className="currency-toggle_1">
      <label className="currency-toggle-label_1">
        <span className="currency-label_1">Currency:</span>
        <div className="toggle-switch_1">
          <input
            type="checkbox"
            checked={currency === "USD"}
            onChange={handleCurrencyToggle}
            className="toggle-checkbox_1"
          />
          <span className="toggle-slider_1">
            <span className="toggle-inr_1">₹ INR</span>
            <span className="toggle-usd_1">$ USD</span>
          </span>
        </div>
      </label>
      <div className="exchange-rate-info_1">
        {loadingExchangeRate ? (
          <div className="rate-loading_1">
            <span className="loading-spinner-small_1"></span>Loading exchange rate...
          </div>
        ) : (
          <>
            <div className="rate-display_1">
              <span className="rate-value_1">1 USD = {safeToFixed(exchangeRate, 2)} INR</span>
            </div>
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

  const ColumnVisibilityControls = () => (
    <div className="column-visibility-controls_1">
      <div className="visibility-header">
        <span className="visibility-title">Column Visibility:</span>
        <button className="reset-visibility-btn" onClick={resetColumnVisibility}>
          Reset All
        </button>
      </div>
      <div className="visibility-checkboxes">
        {[
          { key: "image", label: "Image" },
          { key: "unit", label: "Unit" },
          { key: "qty", label: "QTY" },
          { key: "fixedRate", label: "Fixed Rate" },
          { key: "code", label: "Code" },
          { key: "remarks", label: "Remarks" },
        ].map(({ key, label }) => (
          <label key={key} className="visibility-checkbox">
            <input
              type="checkbox"
              checked={columnVisibility[key]}
              onChange={() => toggleColumnVisibility(key)}
            />
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
          <button className="selection-btn select-all-btn" onClick={selectAllTables}>
            Select All
          </button>
          <button className="selection-btn deselect-all-btn" onClick={deselectAllTables}>
            Deselect All
          </button>
        </div>
      </div>
      <div className="selection-checkboxes">
        <label className="selection-checkbox">
          <input type="checkbox" checked={selectedTables.mainPool} onChange={() => toggleTableSelection("mainPool")} />
          <span className="checkbox-label">Main Pool</span>
          <span className="table-count">(14 items)</span>
        </label>
        {hasGutter && (
          <label className="selection-checkbox">
            <input
              type="checkbox"
              checked={selectedTables.balanceTank}
              onChange={() => toggleTableSelection("balanceTank")}
            />
            <span className="checkbox-label">Balance Tank</span>
            <span className="table-count">(12 items)</span>
          </label>
        )}
        <label className="selection-checkbox">
          <input type="checkbox" checked={selectedTables.pumpRoom} onChange={() => toggleTableSelection("pumpRoom")} />
          <span className="checkbox-label">Pump Room</span>
          <span className="table-count">(12 items)</span>
        </label>
        <label className="selection-checkbox">
          <input type="checkbox" checked={selectedTables.mep} onChange={() => toggleTableSelection("mep")} />
          <span className="checkbox-label">MEP Systems</span>
          <span className="table-count">(34 items)</span>
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
  // Main Render (Overflow‑style layout)
  // ================================
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
            <h1>FreeForm Pool Calculation Results</h1>
            <p className="subtitle" style={{ color: "gray" }}>
              A detailed summary of your FreeForm Pool's construction, MEP components, piping system, and cost estimates
            </p>
          </div>
          <div className="header-currency-toggle">
            <CurrencyToggle />
            <button
              onClick={() => setSaveOpen(true)}
              style={{ padding: "10px 20px", background: "#4CAF50", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer" }}
            >
              💾 Save Project
            </button>
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
                { id: 2, icon: "🏊", label: `Civil Work (${mainPoolItems.filter(i => MAIN_POOL_QTY_FIELDS[i.SlNo]).length})` },
                { id: 6, icon: "⚖️", label: `Balance Tank (${balanceTankItems.filter(i => i.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[i.SlNo]).length})` },
                { id: 5, icon: "⚙️", label: `Pump Room (${balanceTankItems.filter(i => i.SlNo <= 12 && PUMP_ROOM_QTY_FIELDS[i.SlNo]).length})` },
                { id: 4, icon: "🔧", label: "MEP Amount" },
                { id: "piping", icon: "🔩", label: `Piping (${pipingItems.length})` },
                { id: "total", icon: "💰", label: "Total Cost" },
                { id: "visualization", icon: "📈", label: "Visualization" },
                { id: 3, icon: "📅", label: "Timeline" },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`sidebar-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                  data-tooltip={tab.label}
                >
                  <span className="sidebar-tab-icon">{tab.icon}</span>
                  <span className="tab-label-text">{tab.label}</span>
                </button>
              ))}
            </div>
            <h3 style={{ marginBottom: "3%", color: "gray" }}>Actions</h3>
            <div className="sidebar-actions">
              <PDFDownloadButton resultData={resultData} dimensions={dimensions} poolType={poolType} className="sidebar-action-btn primary-btn" data-tooltip="Download PDF Report" />
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
                  resultData, dimensions, mainPoolTotal, mepTotal: totalMepCost, pipingTotal, pumpRoomTotal: includePumpRoom ? pumpRoomTotal : 0,
                  balanceTankTotal: hasGutter ? balanceTankTotal : 0, grandTotal, poolType: "freeform", includePumpRoom, hasBalancingTank: hasGutter,
                  selectedAdvancedEquipment, includeHeatPump, companyProfile, currency, exchangeRate, dynamicRates, pumpRoomDistance: equipmentDistance,
                  filteredMainPoolItems: mainPoolItems, filteredMepItems: filteredMepItems, pumpRoomItems: balanceTankItems, balanceTankItems,
                  pipingItems, mainPoolRemarks, mepRemarks, pumpRoomRemarks, templateDescriptions: {}, civilQuantities, mepQuantities,
                  pumpRoomQuantities, balanceTankQuantities, selectedTables, columnVisibility
                }
              })} data-tooltip="Proforma Invoice">
                <span className="sidebar-tab-icon">📄</span>
                <span className="btn-text">Proforma Invoice</span>
              </button>
              <button className="sidebar-action-btn" onClick={() => navigate("/delivery", {
                state: {
                  result: { ...resultData, ...civilQuantities, ...mepQuantities, ...pumpRoomQuantities },
                  dimensions, filteredMainPoolItems: mainPoolItems, filteredMepItems: filteredMepItems, balanceTankItems,
                  pumpRoomItems: selectedTables.pumpRoom ? balanceTankItems : [], pipingItems: selectedTables.piping ? pipingItems : [],
                  pipingTotal: selectedTables.piping ? pipingTotal : 0, pumpRoomQuantities, pumpRoomDimensions, templateDescriptions: {},
                  poolType: 'freeform', hasBalancingTank: hasGutter, hasGutter, includePumpRoom: selectedTables.pumpRoom || false,
                  selectedTables, selectedAdvancedEquipment, overflowGratingData: null, constructionType
                }
              })} data-tooltip="Delivery Challan">
                <span className="sidebar-tab-icon">📦</span>
                <span className="btn-text">Delivery Challan</span>
              </button>
              <button className="sidebar-action-btn" onClick={() => navigate("/tax", {
                state: {
                  result: resultData, dimensions,
                  mainPoolData: selectedTables.mainPool ? mainPoolItems.filter(i => MAIN_POOL_QTY_FIELDS[i.SlNo]) : [],
                  mepItems: selectedTables.mep ? filteredMepItems : [],
                  pumpRoomData: selectedTables.pumpRoom ? balanceTankItems.filter(i => i.SlNo <= 12 && PUMP_ROOM_QTY_FIELDS[i.SlNo]) : [],
                  mainPoolTotal, mepTotal: totalMepCost, pumpRoomTotal: includePumpRoom ? pumpRoomTotal : 0,
                  balanceTankTotal: hasGutter ? balanceTankTotal : 0, pipingItems: selectedTables.piping ? pipingItems : [],
                  pipingTotal: selectedTables.piping ? pipingTotal : 0, templateDescriptions: {}, poolType: 'freeform', includePumpRoom,
                  currency, exchangeRate, selectedTables, constructionType, finalTotal: grandTotal, selectedAdvancedEquipment,
                  percentageAmounts: { item35:0, item36:0, item37:0, item38:0 }, overflowGratingData: null, hasGutter
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
                    <div className="header-controls">
                      <div className={`pool-type-badge ${constructionType}`}>
                        {constructionType === "terrace" ? (
                          <>
                            <span className="pool-type-icon">🏢</span>Terrace Pool
                          </>
                        ) : (
                          <>
                            <span className="pool-type-icon">⛰️</span>In-Ground Pool
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="specs-controls">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={updateDatabase}
                        onChange={(e) => setUpdateDatabase(e.target.checked)}
                        className="toggle-checkbox"
                      />
                      <span className="toggle-text">
                        {updateDatabase ? "✅ Save rates to mep_tenant_data" : "💾 Don't save rates to database"}
                      </span>
                    </label>
                    {dynamicRates.database_updated && <span className="update-success-badge">✓ Rates saved</span>}
                  </div>
                  {dynamicRates.hp_overridden && (
                    <div className="hp-override-info">
                      <span className="info-icon">ℹ️</span>
                      <span className="hp-override-text">
                        Pump HP overridden: {dynamicRates.original_hp} HP → {dynamicRates.hp_from_db} HP
                      </span>
                    </div>
                  )}
                  <div className="specs-container_1">
                    <div className="specs-table-container">
                      <div className="specs-table-wrapper">
                        <table className="excel-preview-table">
                          <tbody>
                            <tr>
                              <td className="spec-label">
                                <strong>Dimensions</strong>
                              </td>
                              <td className="spec-value">
                                {dimensions.length || 0} × {dimensions.width || 0} × {dimensions.depth || 0} m
                              </td>
                            </tr>
                            <tr>
                              <td className="spec-label">
                                <strong>Volume</strong>
                              </td>
                              <td className="spec-value">
                                {safeToFixed(resultData.volume_m3 || dimensions.length * dimensions.width * dimensions.depth)} m³
                              </td>
                            </tr>
                            <tr>
                              <td className="spec-label">
                                <strong>Floor Area</strong>
                              </td>
                              <td className="spec-value">
                                {safeToFixed(resultData.floor_area_m2 || dimensions.length * dimensions.width)} m²
                              </td>
                            </tr>
                            <tr>
                              <td className="spec-label">
                                <strong>Wall Area</strong>
                              </td>
                              <td className="spec-value">
                                {safeToFixed(resultData.wall_area_m2 || 2 * (dimensions.length + dimensions.width) * dimensions.depth)} m²
                              </td>
                            </tr>
                            <tr>
                              <td className="spec-label">
                                <strong>Turnover Time</strong>
                              </td>
                              <td className="spec-value">{safeToFixed(resultData.turnover_hours || 4.5)} hours</td>
                            </tr>
                            <tr>
                              <td className="spec-label">
                                <strong>Flow Rate</strong>
                              </td>
                              <td className="spec-value">
                                {safeToFixed(resultData.flowrate_m3_per_hr || (dimensions.length * dimensions.width * dimensions.depth) / 4.5)} m³/hr
                              </td>
                            </tr>
                            <tr>
                              <td className="spec-label">
                                <strong>Filter Diameter</strong>
                              </td>
                              <td className="spec-value">{resultData.filter_dia_mm || dynamicRates.filter_dia || "N/A"} mm</td>
                            </tr>
                            <tr>
                              <td className="spec-label">
                                <strong>Pump Capacity</strong>
                              </td>
                              <td className="spec-value">
                                {resultData.hp || dynamicRates.hp || "N/A"} HP
                                {dynamicRates.hp_overridden && <span className="hp-override-indicator"> (from DB)</span>}
                              </td>
                            </tr>
                            <tr>
                              <td className="spec-label">
                                <strong>Pump Room Distance</strong>
                              </td>
                              <td className="spec-value">{equipmentDistance} m</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div className="preview-section" style={{ flex: 1, minWidth: 0 }}>
                    <div className="preview-header" style={{ marginBottom: "14px" }}>
                      <h3 className="preview-title" style={{ margin: 0 }}>
                        3D Pool Visualization
                      </h3>
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
                  <div className="total-amount-box">
                    <span className="total-label">Total Amount:</span>
                    <span className="total-value">{formatCurrency(mainPoolTotal)}</span>
                  </div>
                </div>
              </div>
              {loadingMainPool ? <div className="loading-spinner">Loading data...</div> : renderMainPoolTable()}
              <div className="boq-note">
                <div>
                  <strong>Note:</strong> Estimates based on current industry standards. Actual costs may vary ±10–15%.
                  {constructionType === "terrace" && (
                    <div className="terrace-note">
                      <strong>Terrace Pool Note:</strong> Excludes excavation, soling, and backfilling items.
                    </div>
                  )}
                </div>
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
                  <strong>New Items:</strong> Consolidation (SlNo 3) - Backfill compaction | Disposal (SlNo 4) - Excess soil removal
                </div>
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
                  <strong>Split Items:</strong> All subrows (1.1/1.2, 9.1/9.2, 10.1/10.2) — descriptions and rates sourced from backend.
                </div>
              </div>
            </section>
          )}

          {activeTab === 3 && (
            <section className="tab-content active">
              <Timeline
                poolSize={dimensions}
                resultData={resultData}
                currency={currency}
                exchangeRate={exchangeRate}
                includePumpRoom={includePumpRoom}
                pumpRoomDimensions={pumpRoomDimensions}
                constructionType={constructionType}
                selectedAdvancedEquipment={selectedAdvancedEquipment}
                columnVisibility={columnVisibility}
                selectedTables={selectedTables}
                filteredMepItems={filteredMepItems}
                hasBalancingTank={hasGutter}
                balanceTankDimensions={balanceTankDimensions}
                pipingItems={pipingItems}
                pipingTotal={pipingTotal}
              />
            </section>
          )}

          {activeTab === 4 && (
            <section className="tab-content active">
              <div className="section-header">
                <h2>MEP (Mechanical, Electrical, Plumbing) Items</h2>
                <div className="header-controls">
                  <div className={`pool-type-badge ${constructionType}`}>
                    {constructionType === "terrace" ? "🏢 Terrace Pool" : "⛰️ In-Ground Pool"}
                  </div>
                  <div className="total-amount-box">
                    <span className="total-label">Total Amount:</span>
                    <span className="total-value">{formatCurrency(totalMepCost)}</span>
                  </div>
                </div>
              </div>
              {loadingMep ? (
                <div className="loading-spinner">Loading MEP data...</div>
              ) : !Array.isArray(filteredMepItems) || filteredMepItems.length === 0 ? (
                <div className="error-message">No MEP items available.</div>
              ) : (
                <>
                  {loadingMepCalculation && (
                    <div className="calculation-status">
                      <span className="status-icon">⏳</span>
                      <span>Calculating MEP quantities...</span>
                    </div>
                  )}
                  {renderMepTable()}
                  <div className="mep-grand-total">
                    <div className="grand-total-box">
                      <div className="total-breakdown">
                        <div className="breakdown-item">
                          <span className="breakdown-label">Base MEP (Items 1-29):</span>
                          <span className="breakdown-value">{formatCurrency(baseMepTotals.grand)}</span>
                        </div>
                        <div className="breakdown-item">
                          <span className="breakdown-label">Advanced Equipment (Items 30-34):</span>
                          <span className="breakdown-value">{formatCurrency(advancedEquipmentTotals.grand)}</span>
                        </div>
                        <div className="breakdown-total" style={{ color: "white" }}>
                          <span className="breakdown-label">Total MEP Cost:</span>
                          <span className="breakdown-value" style={{ color: "white" }}>
                            {formatCurrency(totalMepCost)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="boq-note">
                    <div>
                      <strong>Note:</strong> Estimates based on current industry standards. Actual costs may vary ±10–15%.
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {activeTab === 5 && (
            <section className="tab-content active">
              <div className="section-header">
                <h2>Civil Works - Pump Room (12 Items)</h2>
                <div className="header-controls">
                  <div className="total-amount-box">
                    <span className="total-label">Total Amount:</span>
                    <span className="total-value">{formatCurrency(pumpRoomTotal)}</span>
                  </div>
                </div>
              </div>
              {renderPumpRoomTable()}
              <div className="boq-note">
                <div>
                  <strong>Note:</strong> Pump room quantities are calculated as 15% of main pool quantities.
                  Variations of ±10–15% are common.
                </div>
              </div>
            </section>
          )}

          {activeTab === 6 && (
            <section className="tab-content active">
              <div className="section-header">
                <h2>Civil Works - Balance Tank (12 Items)</h2>
                <div className="header-controls">
                  <div className="total-amount-box">
                    <span className="total-label">Total Amount:</span>
                    <span className="total-value">{formatCurrency(balanceTankTotal)}</span>
                  </div>
                </div>
              </div>
              {renderBalanceTankTable()}
              <div className="boq-note">
                <div>
                  <strong>Note:</strong> Balance tank quantities are 7.5% of main pool quantities for in‑ground pools.
                  Terrace pools have 0 balance tank quantities.
                </div>
              </div>
            </section>
          )}

          {activeTab === "piping" && (
            <section className="tab-content active">{renderPipingTable()}</section>
          )}

          {activeTab === "total" && (
            <section className="tab-content active">
              <div className="section-header">
                <h2 className="section-title">Total Pool Cost Summary</h2>
                <div className="header-controls">
                  <div className={`pool-type-badge ${constructionType}`}>
                    {constructionType === "terrace" ? "🏢 Terrace Pool" : "⛰️ In-Ground Pool"}
                  </div>
                </div>
              </div>
              <div className="summary-cards">
                <div className="summary-card">
                  <div className="summary-icon">🏊</div>
                  <div className="summary-details">
                    <h3>Main Pool (Civil Works)</h3>
                    <p className="summary-amount">{formatCurrency(mainPoolTotal)}</p>
                    <p className="summary-items">14 items</p>
                  </div>
                </div>
                {hasGutter && (
                  <div className="summary-card">
                    <div className="summary-icon">⚖️</div>
                    <div className="summary-details">
                      <h3>Balance Tank</h3>
                      <p className="summary-amount">{formatCurrency(balanceTankTotal)}</p>
                      <p className="summary-items">12 items</p>
                    </div>
                  </div>
                )}
                {includePumpRoom && (
                  <div className="summary-card">
                    <div className="summary-icon">⚙️</div>
                    <div className="summary-details">
                      <h3>Pump Room</h3>
                      <p className="summary-amount">{formatCurrency(pumpRoomTotal)}</p>
                      <p className="summary-items">12 items</p>
                    </div>
                  </div>
                )}
                <div className="summary-card">
                  <div className="summary-icon">🔧</div>
                  <div className="summary-details">
                    <h3>MEP Systems</h3>
                    <p className="summary-amount">{formatCurrency(totalMepCost)}</p>
                    <p className="summary-items">34 items</p>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon">🔩</div>
                  <div className="summary-details">
                    <h3>Piping System</h3>
                    <p className="summary-amount">{formatCurrency(pipingTotal)}</p>
                    <p className="summary-items">{pipingItems.length} items</p>
                  </div>
                </div>
              </div>
              <div className="grand-total_1">
                <h3>Grand Total</h3>
                {(() => {
                  const gstAmount = grandTotal * 0.18;
                  const grandTotalWithGST = grandTotal + gstAmount;
                  return (
                    <>
                      <div className="amount-breakdown_1">
                        <div className="breakdown-item_1">
                          <span>Subtotal (All Items):</span>
                          <span>{formatCurrency(grandTotal)}</span>
                        </div>
                        <div className="breakdown-item_1">
                          <span>GST (18%):</span>
                          <span>{formatCurrency(gstAmount)}</span>
                        </div>
                      </div>
                      <div className="grand-total-amount_1">
                        {formatCurrency(grandTotalWithGST)}
                        <span className="gst-label_1"> (incl. GST)</span>
                      </div>
                    </>
                  );
                })()}
                <p className="grand-total-note_1">
                  Includes{" "}
                  {constructionType === "terrace"
                    ? "structural civil works"
                    : "complete civil works with excavation"}
                  , MEP equipment{selectedAdvancedEquipment.length > 0 ? " (with selected advanced equipment)" : ""},
                  complete piping system, balance tank, and pump room construction
                  <br />
                  <span className="gst-note_1">All prices include 18% GST as per applicable tax regulations</span>
                </p>
              </div>
            </section>
          )}

          {activeTab === "visualization" && (
            <section className="tab-content active">
              <div className="section-header">
                <h2 className="section-title">Cost Breakdown Visualization</h2>
                <div className="header-controls">
                  <div className={`pool-type-badge ${constructionType}`}>
                    {constructionType === "terrace" ? "🏢 Terrace Pool" : "⛰️ In-Ground Pool"}
                  </div>
                </div>
              </div>
              <CostBreakdownChart
                mainPoolTotal={mainPoolTotal}
                balanceTankTotal={hasGutter ? balanceTankTotal : 0}
                pumpRoomTotal={pumpRoomTotal}
                mepTotal={totalMepCost}
                pipingTotal={pipingTotal}
              />
            </section>
          )}
        </div>
      </div>

      {/* Modals */}
      {imageModal.show && (
        <div className="image-modal-overlay" onClick={() => setImageModal({ show: false, src: "" })}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setImageModal({ show: false, src: "" })}>
              ×
            </button>
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
          hasBalancingTank={hasGutter}
          mainPoolCost={mainPoolTotal}
          balancingTankCost={hasGutter ? balanceTankTotal : 0}
          pumpRoomCost={pumpRoomTotal}
          mepCost={totalMepCost}
          pipingCost={pipingTotal}
          mainPoolRemarks={mainPoolRemarks}
          balancingTankRemarks={balanceTankRemarks}
          mepRemarks={mepRemarks}
          pumpRoomRemarks={pumpRoomRemarks}
          templateDescriptions={templateDescriptions}
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
          overflowGratingData={null}
          pipingItems={pipingItems}
          pipingTotal={pipingTotal}
          pumpRoomDistance={equipmentDistance}
        />
      )}

      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="share-modal-close" onClick={() => setShowShareModal(false)}>
              ✕
            </button>
            <ShareResults
              resultData={resultData}
              mainPoolData={selectedTables.mainPool ? mainPoolItems.filter(i => MAIN_POOL_QTY_FIELDS[i.SlNo]) : []}
              mepItems={selectedTables.mep ? filteredMepItems : []}
              balancingRows={selectedTables.balanceTank && hasGutter ? balanceTankItems.filter(i => i.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[i.SlNo]) : []}
              balanceTankData={selectedTables.balanceTank && hasGutter ? balanceTankItems.filter(i => i.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[i.SlNo]) : []}
              pumpRoomData={selectedTables.pumpRoom ? balanceTankItems.filter(i => i.SlNo <= 12 && PUMP_ROOM_QTY_FIELDS[i.SlNo]) : []}
              pipingItems={selectedTables.piping ? pipingItems : []}
              dimensions={dimensions}
              totalMep={selectedTables.mep ? totalMepCost : 0}
              mainPoolTotal={selectedTables.mainPool ? mainPoolTotal : 0}
              balancingTankTotal={selectedTables.balanceTank && hasGutter ? balanceTankTotal : 0}
              balanceTankTotal={selectedTables.balanceTank && hasGutter ? balanceTankTotal : 0}
              pumpRoomTotal={selectedTables.pumpRoom && includePumpRoom ? pumpRoomTotal : 0}
              pipingTotal={selectedTables.piping ? pipingTotal : 0}
              finalTotal={grandTotal}
              hasBalancingTank={hasGutter}
              poolType="freeform"
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
              balanceTankQuantities={balanceTankQuantities}
              dynamicRates={dynamicRates}
              currency={currency}
              exchangeRate={exchangeRate}
              includePumpRoom={selectedTables.pumpRoom ? includePumpRoom : false}
              selectedAdvancedEquipment={selectedAdvancedEquipment}
              columnVisibility={columnVisibility}
              selectedTables={selectedTables}
              apiBaseUrl={`${API_BASE_URL}/admin`}
              filteredMepItems={selectedTables.mep ? filteredMepItems : []}
            />
          </div>
        </div>
      )}

      {showExcelExportModal && (
        <div className="excel-export-modal-overlay" onClick={() => setShowExcelExportModal(false)}>
          <div className="excel-export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="excel-export-header">
              <h2>📊 Export Excel Report</h2>
              <button className="close-modal-btn" onClick={() => setShowExcelExportModal(false)}>
                ✕
              </button>
            </div>
            <div className="excel-export-body">
              <div className="export-section">
                <ColumnVisibilityControls />
              </div>
              <div className="export-section">
                <TableSelectionControls />
              </div>
            </div>
            <div className="excel-export-footer">
              <button className="cancel-export-btn" onClick={() => setShowExcelExportModal(false)}>
                Cancel
              </button>
              <ExcelDownloadButton
                resultData={resultData}
                mainPoolData={selectedTables.mainPool ? mainPoolItems.filter(i => MAIN_POOL_QTY_FIELDS[i.SlNo]) : []}
                mepItems={selectedTables.mep ? filteredMepItems : []}
                dimensions={dimensions}
                totalMep={selectedTables.mep ? totalMepCost : 0}
                mainPoolTotal={selectedTables.mainPool ? mainPoolTotal : 0}
                balancingRows={selectedTables.balanceTank ? balanceTankItems : []}
                balancingTankTotal={selectedTables.balanceTank && hasGutter ? balanceTankTotal : 0}
                poolType="freeform"
                hasBalancingTank={hasGutter}
                includePumpRoomExcel={selectedTables.pumpRoom ? includePumpRoom : false}
                mainPoolRemarks={mainPoolRemarks}
                balancingTankRemarks={balanceTankRemarks}
                mepRemarks={mepRemarks}
                pumpRoomRemarks={pumpRoomRemarks}
                templateDescriptions={templateDescriptions}
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
                poolTypeForFilter="freeform"
                overflowGratingData={null}
                pipingItems={selectedTables.piping ? pipingItems : []}
                pipingTotal={selectedTables.piping ? pipingTotal : 0}
                civilQuantities={civilQuantities}
                balanceTankQuantities={balanceTankQuantities}
                mepQuantities={mepQuantities}
                dynamicRates={dynamicRates}
                balancingTankDimensions={balanceTankDimensions}
                balanceTankItems={balanceTankItems}
                hasGutter={hasGutter}
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

      <SaveProjectModal open={saveOpen} onClose={() => setSaveOpen(false)} resultData={resultDataForSave} dimensions={dimensions} projectType="freeform" />
    </div>
  );
}

export default ResultPage;