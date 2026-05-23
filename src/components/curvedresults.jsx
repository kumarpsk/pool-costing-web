import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import "./result.css";

import { generatePDF, PDFDownloadButton } from "./download";
import { generateExcelReport } from "./excel";
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

// Safe number helper
const safeNumber = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// Safe formatter to avoid invalid values
function safeToFixed(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.00";
  }
  return Number(value).toFixed(decimals);
}

// Currency formatter
function formatIndianCurrency(amount) {
  return Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// ================================
// PIPING ITEM MAPPER
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
  const amount = safeNumber(item.Amount || item.amount || (quantity * rate));
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
    Amount: amount,
    raw: item
  };
}

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

  const handleFullscreen = () => {
    setViewMode("fullscreen");
    setShowDisclaimer(false);
  };

  const handleExitFullscreen = () => {
    setViewMode("embed");
  };

  const handleOpenExternal = () => {
    window.open(visualizationUrl, "_blank", "noopener,noreferrer");
  };

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
              <div style={{ color: "#63b3ed", fontWeight: 700, fontSize: "15px", letterSpacing: "0.5px" }}>
                3D Pool Visualization
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>
                {length} × {width} × {depth} m &nbsp;|&nbsp; For reference only
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
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>↗</span> Open in New Tab
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
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>✕</span> Exit Fullscreen
            </button>
          </div>
        </div>
        <div style={{ flex: 1, position: "relative" }}>
          <iframe
            src={visualizationUrl}
            title="3D Pool Visualization - Full View"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
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
          <span style={{color:"orange"}}>
            This 3D visualization is provided for conceptual reference only and does not represent the actual pool design, specifications, or final project outcome. Dimensions and materials may differ from the final build.
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
            background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(251,191,36,0.05) 100%)",
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
              This 3D visualization is a <strong style={{ color: "rgba(238, 134, 6, 0.93)" }}>general conceptual model</strong> generated for reference purposes only.
              It is <strong style={{ color: "rgba(238, 134, 6, 0.93)" }}>not linked</strong> to your actual pool project, architectural drawings, or engineering specifications.
              Final designs, structural details, and material selections will differ from what is shown. Do not use this model for construction planning or decision-making.
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
              lineHeight: 1,
            }}
            title="Dismiss"
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
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,179,237,0.05)",
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
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#28c840" }} />
            <span
              style={{
                marginLeft: "8px",
                color: "rgba(255,255,255,0.5)",
                fontSize: "11px",
                fontFamily: "monospace",
                letterSpacing: "0.3px",
              }}
            >
              3d.intelithon.in
              {(length || width || depth) && (
                <span style={{ color: "rgba(99,179,237,0.7)", marginLeft: "8px" }}>
                  ?length={length}&width={width}&depth={depth}
                </span>
              )}
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleOpenExternal}
              title="Open in new tab"
              style={{
                padding: "5px 10px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "5px",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.2s",
              }}
            >
              ↗ New Tab
            </button>
            <button
              onClick={handleFullscreen}
              title="View fullscreen"
              style={{
                padding: "5px 12px",
                background: "linear-gradient(135deg, rgba(99,179,237,0.2), rgba(66,153,225,0.2))",
                border: "1px solid rgba(99,179,237,0.35)",
                borderRadius: "5px",
                color: "#63b3ed",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.2s",
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
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>
                Preparing your pool model
              </div>
            </div>
            <style>{`
              @keyframes spin3d { to { transform: rotate(360deg); } }
            `}</style>
          </div>
        )}

        {iframeError && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "420px",
              gap: "16px",
              background: "#0d0d1a",
            }}
          >
            <span style={{ fontSize: "40px" }}>🔌</span>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#f87171", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                Unable to load 3D visualization
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginBottom: "14px" }}>
                The visualization service may be unavailable
              </div>
              <button
                onClick={handleOpenExternal}
                style={{
                  padding: "8px 18px",
                  background: "rgba(99,179,237,0.15)",
                  border: "1px solid rgba(99,179,237,0.35)",
                  borderRadius: "7px",
                  color: "#63b3ed",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                ↗ Try Opening Directly
              </button>
            </div>
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

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginTop: "12px",
        }}
      >
        {[
          { icon: "📐", label: "Pool Dimensions", value: `${length} × ${width} × ${depth} m` },
          { icon: "🔄", label: "Interactive", value: "Drag to rotate" },
          { icon: "🔍", label: "Scroll", value: "Zoom in/out" },
          { icon: "⛶", label: "Full View", value: "Click button above" },
        ].map((chip, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              fontSize: "11px",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <span>{chip.icon}</span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>{chip.label}:</span>
            <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{chip.value}</span>
          </div>
        ))}
      </div>

      {!showDisclaimer && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px 12px",
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.15)",
            borderRadius: "7px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "12px" }}>⚠️</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>
            <strong style={{ color: "rgba(245,158,11,0.8)" }}>Disclaimer:</strong> This 3D model is for conceptual reference only — not a representation of your actual project.
          </span>
          <button
            onClick={() => setShowDisclaimer(true)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(99,179,237,0.6)",
              cursor: "pointer",
              fontSize: "10px",
              marginLeft: "auto",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            Read more
          </button>
        </div>
      )}
    </div>
  );
}

// ================================
// QUANTITY FIELD MAPPINGS
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
  14: "Tiling_QTY"
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
  12: "plastering_QTY_1"
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
  12: "plastering_QTY_2"
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
  34: "SaltChlorinator_QTY"
};

function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // ================================
  // STATE MANAGEMENT
  // ================================
  const initialState = location.state?.result || null;
  const [resultData, setResultData] = useState(initialState);
  const [dimensions, setDimensions] = useState(location.state?.dimensions || {});
  const [poolType, setPoolType] = useState("freeform");
  const [constructionType, setConstructionType] = useState(location.state?.constructionType || "in_ground");
  const [hasGutter, setHasGutter] = useState(location.state?.hasGutter || false);
  const [companyProfile, setCompanyProfile] = useState(null);

  // STEP 1 — ADD TERRACE DETECTION
  const isTerracePool = String(constructionType || "in_ground")
    .trim()
    .toLowerCase() === "terrace";

  // STEP 3 — ADD SAFE TERRACE QUANTITY HELPER
  const getSafeQty = (qtyKey, value) => {
    if (!isTerracePool) {
      return Number(value ?? 0);
    }

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
      "BurntBrick_QTY_2"
    ];

    if (terraceZeroKeys.includes(qtyKey)) {
      return 0;
    }

    return Number(value ?? 0);
  };

  // Safe extraction from resultData
  const civilQuantities = resultData?.civil_quantities || {};
  const balanceTankQuantities = resultData?.balance_tank_quantities || {};
  const pumpRoomQuantities = resultData?.pump_room_quantities || {};
  const mepQuantities = resultData?.mep_quantities || {};
  const [pumpRoomItems, setPumpRoomItems] = useState([]);

  // PIPING ITEMS STATE
  const [pipingItems, setPipingItems] = useState([]);
  const [pipingTotal, setPipingTotal] = useState(0);
  const [loadingPiping, setLoadingPiping] = useState(false);

  // PUMP ROOM DISTANCE - DYNAMIC INPUT
  const [equipmentDistance, setEquipmentDistance] = useState(location.state?.equipmentDistance || 15.0);
  const [safetyFactor, setSafetyFactor] = useState(1.1);
  const [isUpdatingDistance, setIsUpdatingDistance] = useState(false);

  // Use useRef for debounce timer
  const debounceRef = useRef(null);

  // Handle distance change
  const handleDistanceChange = (e) => {
    const newValue = parseFloat(e.target.value) || 15.0;
    if (newValue > 0) {
      setEquipmentDistance(newValue);
    }
  };

  // Handle safety factor change
  const handleSafetyFactorChange = (e) => {
    const newValue = parseFloat(e.target.value) || 1.1;
    if (newValue >= 1.0 && newValue <= 1.5) {
      setSafetyFactor(newValue);
    }
  };

  useEffect(() => {
    if (resultData && resultData.has_gutter !== undefined) {
      setHasGutter(resultData.has_gutter);
    }
    if (resultData && resultData.pump_room_distance !== undefined) {
      setEquipmentDistance(resultData.pump_room_distance);
    }
    if (resultData && resultData.safety_factor !== undefined) {
      setSafetyFactor(resultData.safety_factor);
    }
  }, [resultData]);

  // MASTER DATA
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
    filter_dia: null
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
  const [currency, setCurrency] = useState('INR');
  const [showShareModal, setShowShareModal] = useState(false);
  
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
    balanceTank: true,
    pumpRoom: true,
    mep: true,
    piping: true
  });
  
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  
  // SAVE PROJECT MODAL STATE
  const [saveOpen, setSaveOpen] = useState(false);
  const [includePumpRoom, setIncludePumpRoom] = useState(true);
  const [pumpRoomDimensions, setPumpRoomDimensions] = useState({});
  const [balanceTankDimensions, setBalanceTankDimensions] = useState({});

  // OVERFLOW GRATING DATA
  const overflowGratingData = {
    SlNo: 11,
    Code: "OG-001",
    Description: "Overflow Grating - Durable, anti-slip cover installed along the overflow channel.",
    Unit: "RMT",
    Rate: 1850,
    Image: "/public/grating.png"
  };

  // ================================
  // INSTALLATION RATE HELPER FUNCTIONS
  // ================================
  const getSupplyRate = (item) => {
    if (!item) return 0;
    if (item.SlNo === 1) return safeNumber(dynamicRates.filter_rate);
    if (item.SlNo === 7) return safeNumber(dynamicRates.pump_rate);
    return safeNumber(item.Rate);
  };
  
  const getInstallationRate = (item) => getSupplyRate(item) * INSTALLATION_PERCENT;
  const getTotalRate = (item) => getSupplyRate(item) + getInstallationRate(item);
  const getSupplyCost = (item, quantity) => safeNumber(quantity) * getSupplyRate(item);
  const getInstallationCost = (item, quantity) => safeNumber(quantity) * getInstallationRate(item);
  const getRowTotal = (item, quantity) => getSupplyCost(item, quantity) + getInstallationCost(item, quantity);

  // ================================
  // QUANTITY GETTER FUNCTIONS (with terrace safety)
  // ================================
  const getCivilQuantity = (slNo) => {
    const fieldName = MAIN_POOL_QTY_FIELDS[slNo];
    if (!fieldName) return 0;
    const value = safeNumber(civilQuantities[fieldName]);
    return getSafeQty(fieldName, value);
  };

  const getBalanceTankQuantity = (slNo) => {
    const fieldName = BALANCE_TANK_QTY_FIELDS[slNo];
    if (!fieldName) return 0;
    const value = safeNumber(balanceTankQuantities[fieldName]);
    return getSafeQty(fieldName, value);
  };

  const getPumpRoomQuantity = (slNo) => {
    const fieldName = PUMP_ROOM_QTY_FIELDS[slNo];
    if (!fieldName) return 0;
    const value = safeNumber(pumpRoomQuantities[fieldName]);
    return getSafeQty(fieldName, value);
  };

  const getMepQuantity = (slNo) => {
    const fieldName = MEP_QTY_FIELDS[slNo];
    if (!fieldName) return 0;
    if (slNo >= 30 && slNo <= 34) return selectedAdvancedEquipment.includes(slNo) ? 1 : 0;
    if (slNo === 30 && !includeHeatPump) return 0;
    return safeNumber(mepQuantities[fieldName]);
  };

  // ================================
  // MEMOIZED TOTALS
  // ================================
  const mainPoolTotal = useMemo(() => {
    if (!mainPoolItems.length) return 0;
    let total = 0;
    mainPoolItems.forEach(item => {
      if (MAIN_POOL_QTY_FIELDS[item.SlNo]) {
        const quantity = getCivilQuantity(item.SlNo);
        const rate = safeNumber(item.Rate);
        total += quantity * rate;
      }
    });
    return total;
  }, [mainPoolItems, civilQuantities, isTerracePool]);

  const balanceTankTotal = useMemo(() => {
    if (!hasGutter || !mainPoolItems.length) return 0;
    let total = 0;
    mainPoolItems.forEach(item => {
      if (BALANCE_TANK_QTY_FIELDS[item.SlNo]) {
        const quantity = getBalanceTankQuantity(item.SlNo);
        const rate = safeNumber(item.Rate);
        total += quantity * rate;
      }
    });
    return total;
  }, [mainPoolItems, balanceTankQuantities, hasGutter, isTerracePool]);

  const pumpRoomTotal = useMemo(() => {
    if (!includePumpRoom || !mainPoolItems.length) return 0;
    let total = 0;
    mainPoolItems.forEach(item => {
      if (PUMP_ROOM_QTY_FIELDS[item.SlNo]) {
        const quantity = getPumpRoomQuantity(item.SlNo);
        const rate = safeNumber(item.Rate);
        total += quantity * rate;
      }
    });
    return total;
  }, [mainPoolItems, pumpRoomQuantities, includePumpRoom, isTerracePool]);

  const filteredMepItems = useMemo(() => {
    if (!Array.isArray(mepItems)) return [];
    return mepItems.filter(item => item.SlNo < 35);
  }, [mepItems]);

  const baseMepTotals = useMemo(() => {
    let totalSupply = 0;
    let totalInstallation = 0;
    if (!filteredMepItems.length) return { totalSupply: 0, totalInstallation: 0, grand: 0 };
    filteredMepItems.forEach(item => {
      if (item.SlNo >= 30 && item.SlNo <= 34) return;
      const quantity = getMepQuantity(item.SlNo);
      totalSupply += getSupplyCost(item, quantity);
      totalInstallation += getInstallationCost(item, quantity);
    });
    return { totalSupply, totalInstallation, grand: totalSupply + totalInstallation };
  }, [filteredMepItems, mepQuantities, dynamicRates, includeHeatPump]);

  const baseMepTotal = baseMepTotals.grand;

  const advancedEquipmentTotals = useMemo(() => {
    let totalSupply = 0;
    let totalInstallation = 0;
    if (!filteredMepItems.length) return { totalSupply: 0, totalInstallation: 0, grand: 0 };
    filteredMepItems.forEach(item => {
      if (item.SlNo >= 30 && item.SlNo <= 34) {
        if (selectedAdvancedEquipment.includes(item.SlNo)) {
          const quantity = 1;
          totalSupply += getSupplyCost(item, quantity);
          totalInstallation += getInstallationCost(item, quantity);
        }
      }
    });
    return { totalSupply, totalInstallation, grand: totalSupply + totalInstallation };
  }, [filteredMepItems, selectedAdvancedEquipment, dynamicRates]);

  const advancedEquipmentTotal = advancedEquipmentTotals.grand;

  const totalMepCost = useMemo(() => baseMepTotal + advancedEquipmentTotal, [baseMepTotal, advancedEquipmentTotal]);

  const grandTotal = useMemo(() => {
    return safeNumber(mainPoolTotal) + 
           (hasGutter ? safeNumber(balanceTankTotal) : 0) + 
           safeNumber(pumpRoomTotal) + 
           safeNumber(totalMepCost) + 
           safeNumber(pipingTotal);
  }, [mainPoolTotal, balanceTankTotal, pumpRoomTotal, totalMepCost, pipingTotal, hasGutter]);

  const getFinalTotal = () => {
    const gstAmount = grandTotal * 0.18;
    return grandTotal + gstAmount;
  };

  // ================================
  // WORKING DAYS (for save snapshot)
  // ================================
  const workingDays = useMemo(() => {
    if (!resultData?.timeline) return 0;
    return resultData.timeline.reduce((total, phase) => total + (phase.days || 0), 0);
  }, [resultData]);

  // ================================
  // COMPLETE SNAPSHOT FOR SAVING PROJECT
  // ================================
  const resultDataForSave = {
    project_type: "freeform",
    main_pool_total: mainPoolTotal,
    balance_tank_total: hasGutter ? balanceTankTotal : 0,
    pump_room_total: pumpRoomTotal,
    mep_total: totalMepCost,
    piping_total: pipingTotal || 0,
    working_days: workingDays || 0,
    pool_specification: {
      length: dimensions?.length || 0,
      width: dimensions?.width || 0,
      depth: dimensions?.depth || 0,
      volume: resultData?.volume_m3 || (dimensions?.length * dimensions?.width * dimensions?.depth) || 0,
      flow_rate: resultData?.flowrate_m3_per_hr || 0
    },
    system_settings: {
      has_gutter: hasGutter,
      pool_type: poolType,
      construction_type: constructionType,
      safety_factor: safetyFactor,
      pump_room_distance: equipmentDistance
    },
    totals: {
      subtotal: grandTotal,
      gst: grandTotal * 0.18,
      final_total: getFinalTotal()
    },
    grand_total: grandTotal
  };

  // ================================
  // DEBUG LOGS
  // ================================
  useEffect(() => {
    console.log("civilQuantities", civilQuantities);
    console.log("balanceTankQuantities", balanceTankQuantities);
    console.log("pumpRoomQuantities", pumpRoomQuantities);
    console.log("mepItems", mepItems);
    console.log("pipingItems", pipingItems);
    console.log("isTerracePool", isTerracePool);
  }, [civilQuantities, balanceTankQuantities, pumpRoomQuantities, mepItems, pipingItems, isTerracePool]);

  // ================================
  // LOAD SAVED SETTINGS
  // ================================
  useEffect(() => {
    const savedVisibility = JSON.parse(localStorage.getItem('columnVisibility') || 'null');
    if (savedVisibility) setColumnVisibility(savedVisibility);
    
    const savedTableSelection = JSON.parse(localStorage.getItem('selectedTables') || 'null');
    if (savedTableSelection) setSelectedTables(savedTableSelection);
    
    const savedAdvanced = JSON.parse(localStorage.getItem('selectedAdvancedEquipment') || '[]');
    if (savedAdvanced) setSelectedAdvancedEquipment(savedAdvanced);
    
    const savedUpdateDB = localStorage.getItem('updateDatabase');
    if (savedUpdateDB !== null) setUpdateDatabase(savedUpdateDB === 'true');
    
    const saved = JSON.parse(localStorage.getItem('saved_calculations') || '[]');
    setSavedCalculations(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('columnVisibility', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  useEffect(() => {
    localStorage.setItem('selectedTables', JSON.stringify(selectedTables));
  }, [selectedTables]);

  useEffect(() => {
    localStorage.setItem('selectedAdvancedEquipment', JSON.stringify(selectedAdvancedEquipment));
  }, [selectedAdvancedEquipment]);

  useEffect(() => {
    localStorage.setItem('updateDatabase', updateDatabase.toString());
  }, [updateDatabase]);

  // Toggle functions
  const toggleColumnVisibility = (columnName) => {
    setColumnVisibility(prev => ({ ...prev, [columnName]: !prev[columnName] }));
  };

  const resetColumnVisibility = () => {
    setColumnVisibility({
      image: true,
      unit: true,
      qty: true,
      fixedRate: true,
      remarks: true,
      code: true
    });
  };

  const toggleTableSelection = (tableName) => {
    setSelectedTables(prev => ({ ...prev, [tableName]: !prev[tableName] }));
  };

  const selectAllTables = () => {
    setSelectedTables({
      mainPool: true,
      balanceTank: true,
      pumpRoom: true,
      mep: true,
      piping: true
    });
  };

  const deselectAllTables = () => {
    setSelectedTables({
      mainPool: false,
      balanceTank: false,
      pumpRoom: false,
      mep: false,
      piping: false
    });
  };

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const handleAdvancedEquipmentToggle = (slNo) => {
    setSelectedAdvancedEquipment(prev => {
      if (prev.includes(slNo)) {
        return prev.filter(id => id !== slNo);
      } else {
        return [...prev, slNo];
      }
    });
  };

  const handleSelectAllAdvanced = () => {
    const advancedSlNos = [30, 31, 32, 33, 34];
    if (selectedAdvancedEquipment.length === advancedSlNos.length) {
      setSelectedAdvancedEquipment([]);
    } else {
      setSelectedAdvancedEquipment(advancedSlNos);
    }
  };

  // ================================
  // EXCHANGE RATE FUNCTIONS
  // ================================
  const fetchRealTimeExchangeRate = async () => {
    setLoadingExchangeRate(true);
    setExchangeRateError(null);
    
    try {
      const apiUrls = [
        'https://api.exchangerate-api.com/v4/latest/INR',
        'https://open.er-api.com/v6/latest/INR',
        'https://api.frankfurter.app/latest?from=INR',
      ];

      let rateFound = false;
      
      for (const apiUrl of apiUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            signal: controller.signal,
            mode: 'cors',
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) continue;
          
          const data = await response.json();
          
          let usdRate = null;
          
          if (data.rates && data.rates.USD) {
            usdRate = data.rates.USD;
          } else if (data.rates && data.rates.usd) {
            usdRate = data.rates.usd;
          } else if (data.conversion_rates && data.conversion_rates.USD) {
            usdRate = data.conversion_rates.USD;
          }
          
          if (usdRate && !isNaN(usdRate) && usdRate > 0) {
            const inrToUsdRate = 1 / usdRate;
            setExchangeRate(inrToUsdRate);
            setLastExchangeUpdate(new Date());
            setExchangeRateError(null);
            rateFound = true;
            break;
          }
        } catch (apiError) {
          continue;
        }
      }

      if (!rateFound) {
        const fallbackRate = 83.0;
        setExchangeRate(fallbackRate);
        setLastExchangeUpdate(new Date());
        setExchangeRateError(`Using fallback rate: 1 USD = ${fallbackRate} INR`);
      }
    } catch (error) {
      const fallbackRate = 83.0;
      setExchangeRate(fallbackRate);
      setLastExchangeUpdate(new Date());
      setExchangeRateError("Failed to fetch exchange rates. Using fallback rate.");
    } finally {
      setLoadingExchangeRate(false);
    }
  };

  const formatCurrency = (amount, curr = currency) => {
    const safeAmount = safeNumber(amount);
    if (curr === 'USD') {
      const usdAmount = safeAmount / exchangeRate;
      return `$${safeToFixed(usdAmount, 2)}`;
    }
    return `₹${formatIndianCurrency(safeAmount)}`;
  };

  const getCurrencySymbol = (curr = currency) => {
    return curr === 'USD' ? '$' : '₹';
  };

  const handleCurrencyToggle = () => {
    setCurrency(prev => prev === 'INR' ? 'USD' : 'INR');
  };

  // ================================
  // BACKEND DATA FETCHING
  // ================================
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
        else if (data && data.items) items = data.items;
        else if (data && data.mep_items) items = data.mep_items;
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

  // Fetch company profile
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
          } catch (e) {
            console.error("Error parsing cached company profile", e);
          }
        }

        const headers = getTenantAuthHeaders(navigate);
        const response = await fetch(
          `${API_BASE_URL}/admin/tenant/public-profile?company_code=${companyCode}`,
          { headers }
        );

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
  }, [navigate]);

  // ================================
  // FETCH MEP CALCULATION
  // ================================
  const fetchMepCalculation = useCallback(async () => {
    if (!dimensions.length || !dimensions.width || !dimensions.depth) return;

    setLoadingMepCalculation(true);
    setLoadingPiping(true);

    try {
      const headers = getTenantAuthHeaders(navigate);
      
      const url = `${API_BASE_URL}/freeform/calculations/mep/${dimensions.length}/${dimensions.width}/${dimensions.depth}?pool_type=${poolType}&auto_dosing=true&include_heat_pump=${includeHeatPump}&pool_location=${constructionType}&has_gutter=${hasGutter}&turnover=4.5&update_database=${updateDatabase}&pump_room_distance=${equipmentDistance}&safety_factor=${safetyFactor}`;
      
      const response = await fetch(url, { headers });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      
      if (!data.success) {
        console.error("MEP calculation failed:", data);
        return;
      }

      // Update resultData with all quantities from response
      if (data.quantities) {
        setResultData(prev => ({ ...prev, mep_quantities: data.quantities }));
      }
      
      if (data.civil_quantities) {
        setResultData(prev => ({ ...prev, civil_quantities: data.civil_quantities }));
      }
      
      if (data.balance_tank_quantities) {
        setResultData(prev => ({ ...prev, balance_tank_quantities: data.balance_tank_quantities }));
      }
      
      if (data.pump_room_quantities) {
        setResultData(prev => ({ ...prev, pump_room_quantities: data.pump_room_quantities }));
      }

      if (data.piping_items && data.piping_items.length > 0) {
        const mappedPiping = data.piping_items.map(mapPipingItem).filter(Boolean);
        setPipingItems(mappedPiping);
        const total = mappedPiping.reduce((sum, item) => sum + safeNumber(item.Total), 0);
        setPipingTotal(total);
      } else {
        setPipingItems([]);
        setPipingTotal(0);
      }

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
          rate_source_note: data.system_parameters.rate_source === "mep_rates_exact" 
            ? "Rates from mep_rates table - saved to mep_tenant_data" 
            : data.system_parameters.rate_source === "mep_rates_closest"
              ? "Using closest match from mep_rates table"
              : "No match found - rates set to 0"
        });
      }

      if (data.heat_pump_selection) {
        setHeatPumpSelection(data.heat_pump_selection);
        setIncludeHeatPump(data.heat_pump_selection.available || false);
      }

      // Extract dimensions
      if (data.pump_room_quantities) {
        setPumpRoomDimensions({
          length: data.pump_room_quantities.pr_length_2 || 0,
          width: data.pump_room_quantities.pr_width_2 || 0,
          height: data.pump_room_quantities.pr_height_2 || 0
        });
      }

      if (data.balance_tank_quantities) {
        setBalanceTankDimensions({
          l1: data.balance_tank_quantities.l1 || 0,
          w1: data.balance_tank_quantities.w1 || 0,
          d1: data.balance_tank_quantities.d1 || 0
        });
      }

    } catch (error) {
      if (error.message === "AUTH_MISSING") return;
      console.error("Error fetching MEP calculation:", error);
    } finally {
      setLoadingMepCalculation(false);
      setLoadingPiping(false);
      setIsUpdatingDistance(false);
    }
  }, [
    dimensions.length, dimensions.width, dimensions.depth,
    poolType, constructionType, includeHeatPump, hasGutter,
    updateDatabase, equipmentDistance, safetyFactor, navigate
  ]);

  // Fetch template descriptions
  useEffect(() => {
    const fetchTemplateDescriptions = async () => {
      if (dimensions && dimensions.length && dimensions.width && dimensions.depth) {
        try {
          const headers = getTenantAuthHeaders(navigate);
          const response = await fetch(
            `${API_BASE_URL}/freeform/templates/${dimensions.length}/${dimensions.width}/${dimensions.depth}`,
            { headers }
          );
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

  // ================================
  // Debounced effect for distance/safety factor changes
  // ================================
  useEffect(() => {
    if (!dimensions.length || !dimensions.width || !dimensions.depth) return;

    setIsUpdatingDistance(true);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchMepCalculation();
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [equipmentDistance, safetyFactor, fetchMepCalculation]);

  // ================================
  // Effect for other pool settings changes
  // ================================
  useEffect(() => {
    if (!dimensions.length || !dimensions.width || !dimensions.depth) return;
    fetchMepCalculation();
  }, [
    dimensions.length,
    dimensions.width,
    dimensions.depth,
    poolType,
    constructionType,
    includeHeatPump,
    hasGutter,
    updateDatabase,
    fetchMepCalculation
  ]);

  // REAL-TIME EXCHANGE RATE
  useEffect(() => {
    fetchRealTimeExchangeRate();
    const interval = setInterval(fetchRealTimeExchangeRate, 3600000);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown")) setOpenDropdown(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // ================================
  // RENDER HELPER FUNCTIONS
  // ================================
  const renderImage = (imageData) => {
    if (!imageData) return null;
    const getFullPath = () => {
      if (imageData.startsWith('data:image')) return imageData;
      if (imageData.startsWith('http') || imageData.startsWith('/')) return imageData;
      return `${API_BASE_URL}/admin/static/${imageData}`;
    };
    const fullPath = getFullPath();
    return (
      <img 
        src={fullPath} 
        alt="Item" 
        className="item-image"
        onClick={() => setImageModal({ show: true, src: fullPath })}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  };

  const getDescriptionWithTemplate = (item) => {
    if (!item) return "";
    if (templateDescriptions && templateDescriptions[item.SlNo]) return templateDescriptions[item.SlNo];
    return item.Description || "Description not available";
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

  // ================================
  // ✅ RENDER MAIN POOL TABLE (WITH EXCAVATION, SHUTTERING, AND RCC SUB-ROWS)
  // ================================
  const renderMainPoolTable = () => {
    if (!mainPoolItems.length) return <div className="no-data-message">No main pool data available.</div>;
    
    // STEP 1 — ADD NEW DATA EXTRACTION
    const excavationSplit = civilQuantities?.excavation_split || {};
    const shutteringSubrows = civilQuantities?.shuttering_subrows || {};
    const rccSubrows = civilQuantities?.rcc_subrows || {};

    // STEP 14 — DEBUG LOGS
    console.log("excavationSplit", excavationSplit);
    console.log("shutteringSubrows", shutteringSubrows);
    console.log("rccSubrows", rccSubrows);

    const filteredItems = mainPoolItems
      .filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo])
      .sort((a, b) => a.SlNo - b.SlNo);

    // STEP 2 — Determine if excavation sub-rows should be shown (only for in-ground pools)
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
            {filteredItems.map((item) => {
              const isExcavation = item.SlNo === 1;
              const isShuttering = item.SlNo === 9;
              const isRCC = item.SlNo === 10;
              const quantity = getCivilQuantity(item.SlNo);
              const rate = safeNumber(item.Rate);
              const amount = quantity * rate;
              const isNewItem = item.SlNo === 3 || item.SlNo === 4;
              
              // ✅ STEP 3 — EXCAVATION SUBROWS (SlNo === 1)
              if (isExcavation && showExcavationSubRows) {
                return (
                  <React.Fragment key={item.SlNo}>
                    {/* Parent excavation row - shows "-" for qty/rate/amount */}
                    <tr style={{ background: "rgba(99,179,237,0.05)", fontWeight: "bold" }}>
                      <td data-label="Sl.No">{item.SlNo}</td>
                      {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                      <td data-label="Description" className="description-cell">
                        {getDescriptionWithTemplate(item)}
                      </td>
                      {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                      {columnVisibility.qty && <td data-label="QTY" style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>}
                      {columnVisibility.fixedRate && <td data-label="Fixed Rate" style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>}
                      <td data-label="Amount" className="amount-cell" style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>
                      {columnVisibility.remarks && (
                        <td data-label="Remarks" className="remarks-cell">
                          <textarea className="remarks-textbox" placeholder="Add remarks..." value={mainPoolRemarks[item.SlNo] || ""} onChange={(e) => setMainPoolRemarks(prev => ({ ...prev, [item.SlNo]: e.target.value }))} rows="2" />
                        </td>
                      )}
                    </tr>
                    
                    {/* Sub row 1.1 */}
                    {excavationSplit["1.1"] && safeNumber(excavationSplit["1.1"].qty) > 0 && (
                      <tr className="sub-row" style={{ background: "rgba(99,179,237,0.02)" }}>
                        <td data-label="Sl.No" style={{ paddingLeft: "20px", color: "#63b3ed" }}>1.1</td>
                        {columnVisibility.code && <td data-label="Code">-</td>}
                        <td data-label="Description" style={{ paddingLeft: "40px", fontSize: "13px" }}>↳ Excavation up to 1.50m depth</td>
                        {columnVisibility.image && <td data-label="Image">-</td>}
                        {columnVisibility.unit && <td data-label="Unit">{item.Unit || "CuM"}</td>}
                        {columnVisibility.qty && <td data-label="QTY">{safeNumber(excavationSplit["1.1"].qty).toFixed(3)}</td>}
                        {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(safeNumber(excavationSplit["1.1"].rate))}</td>}
                        <td data-label="Amount" className="amount-cell">{formatCurrency(safeNumber(excavationSplit["1.1"].amount))}</td>
                        {columnVisibility.remarks && <td data-label="Remarks">-</td>}
                       </tr>
                    )}
                    
                    {/* Sub row 1.2 */}
                    {excavationSplit["1.2"] && safeNumber(excavationSplit["1.2"].qty) > 0 && (
                      <tr className="sub-row" style={{ background: "rgba(99,179,237,0.02)" }}>
                        <td data-label="Sl.No" style={{ paddingLeft: "20px", color: "#63b3ed" }}>1.2</td>
                        {columnVisibility.code && <td data-label="Code">-</td>}
                        <td data-label="Description" style={{ paddingLeft: "40px", fontSize: "13px" }}>↳ Excavation above 1.50m depth</td>
                        {columnVisibility.image && <td data-label="Image">-</td>}
                        {columnVisibility.unit && <td data-label="Unit">{item.Unit || "CuM"}</td>}
                        {columnVisibility.qty && <td data-label="QTY">{safeNumber(excavationSplit["1.2"].qty).toFixed(3)}</td>}
                        {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(safeNumber(excavationSplit["1.2"].rate))}</td>}
                        <td data-label="Amount" className="amount-cell">{formatCurrency(safeNumber(excavationSplit["1.2"].amount))}</td>
                        {columnVisibility.remarks && <td data-label="Remarks">-</td>}
                       </tr>
                    )}
                  </React.Fragment>
                );
              }
       
              // For terrace pools, excavation item should show 0 quantity and amount
              if (isExcavation && isTerracePool) {
                return (
                  <tr key={item.SlNo} style={{ background: "rgba(99,179,237,0.05)" }}>
                    <td data-label="Sl.No">{item.SlNo}</td>
                    {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                    <td data-label="Description" className="description-cell">
                      {getDescriptionWithTemplate(item)}
                     </td>
                    {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>}
                    {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                    {columnVisibility.qty && <td data-label="QTY">0.000</td>}
                    {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(rate)}</td>}
                    <td data-label="Amount" className="amount-cell">{formatCurrency(0)}</td>
                    {columnVisibility.remarks && (
                      <td data-label="Remarks" className="remarks-cell">
                        <textarea className="remarks-textbox" placeholder="Add remarks..." value={mainPoolRemarks[item.SlNo] || ""} onChange={(e) => setMainPoolRemarks(prev => ({ ...prev, [item.SlNo]: e.target.value }))} rows="2" />
                       </td>
                    )}
                   </tr>
                );
              }

              // ✅ STEP 4 — SHUTTERING SUBROWS (SlNo === 9)
              if (isShuttering) {
                const row_9_1 = shutteringSubrows["9.1"] || {};
                const row_9_2 = shutteringSubrows["9.2"] || {};
                const totalShutteringQty = safeNumber(row_9_1?.qty || 0) + safeNumber(row_9_2?.qty || 0);

                return (
                  <React.Fragment key={item.SlNo}>
                    {/* Parent shuttering row */}
                    <tr style={{ background: "rgba(99,179,237,0.05)", fontWeight: "bold" }}>
                      <td data-label="Sl.No">{item.SlNo}</td>
                      {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                      <td data-label="Description" className="description-cell">
                        {getDescriptionWithTemplate(item)}
                        <div className="excavation-note" style={{ marginTop: "4px", fontSize: "11px", color: "#666", fontWeight: "normal" }}>
                          <small>Total Shuttering: {safeToFixed(totalShutteringQty, 3)} SqM</small>
                        </div>
                      </td>
                      {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                      {columnVisibility.qty && <td data-label="QTY" style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>}
                      {columnVisibility.fixedRate && <td data-label="Fixed Rate" style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>}
                      <td data-label="Amount" className="amount-cell" style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>
                      {columnVisibility.remarks && (
                        <td data-label="Remarks" className="remarks-cell">
                          <textarea className="remarks-textbox" placeholder="Add remarks..." value={mainPoolRemarks[item.SlNo] || ""} onChange={(e) => setMainPoolRemarks(prev => ({ ...prev, [item.SlNo]: e.target.value }))} rows="2" />
                        </td>
                      )}
                    </tr>

                    {/* Sub row 9.1 — Raft Shuttering */}
                    {safeNumber(row_9_1?.qty || 0) > 0 && (
                      <tr className="sub-row" style={{ background: "rgba(99,179,237,0.02)" }}>
                        <td data-label="Sl.No" style={{ paddingLeft: "20px", color: "#63b3ed" }}>9.1</td>
                        {columnVisibility.code && <td data-label="Code">-</td>}
                        <td data-label="Description" style={{ paddingLeft: "40px", fontSize: "13px" }}>↳ {row_9_1?.description || "Raft Shuttering"}</td>
                        {columnVisibility.image && <td data-label="Image">-</td>}
                        {columnVisibility.unit && <td data-label="Unit">{item.Unit || "SqM"}</td>}
                        {columnVisibility.qty && <td data-label="QTY">{safeToFixed(safeNumber(row_9_1?.qty || 0), 3)}</td>}
                        {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(safeNumber(row_9_1?.rate || 0))}</td>}
                        <td data-label="Amount" className="amount-cell">{formatCurrency(safeNumber(row_9_1?.amount || 0))}</td>
                        {columnVisibility.remarks && <td data-label="Remarks">-</td>}
                      </tr>
                    )}

                    {/* Sub row 9.2 — Retaining Wall Shuttering */}
                    {safeNumber(row_9_2?.qty || 0) > 0 && (
                      <tr className="sub-row" style={{ background: "rgba(99,179,237,0.02)" }}>
                        <td data-label="Sl.No" style={{ paddingLeft: "20px", color: "#63b3ed" }}>9.2</td>
                        {columnVisibility.code && <td data-label="Code">-</td>}
                        <td data-label="Description" style={{ paddingLeft: "40px", fontSize: "13px" }}>↳ {row_9_2?.description || "Retaining Wall Shuttering"}</td>
                        {columnVisibility.image && <td data-label="Image">-</td>}
                        {columnVisibility.unit && <td data-label="Unit">{item.Unit || "SqM"}</td>}
                        {columnVisibility.qty && <td data-label="QTY">{safeToFixed(safeNumber(row_9_2?.qty || 0), 3)}</td>}
                        {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(safeNumber(row_9_2?.rate || 0))}</td>}
                        <td data-label="Amount" className="amount-cell">{formatCurrency(safeNumber(row_9_2?.amount || 0))}</td>
                        {columnVisibility.remarks && <td data-label="Remarks">-</td>}
                      </tr>
                    )}
                  </React.Fragment>
                );
              }

              // ✅ STEP 5 — RCC SUBROWS (SlNo === 10)
              if (isRCC) {
                const row_10_1 = rccSubrows["10.1"] || {};
                const row_10_2 = rccSubrows["10.2"] || {};
                const totalRCCQty = safeNumber(row_10_1?.qty || 0) + safeNumber(row_10_2?.qty || 0);

                return (
                  <React.Fragment key={item.SlNo}>
                    {/* Parent RCC row */}
                    <tr style={{ background: "rgba(99,179,237,0.05)", fontWeight: "bold" }}>
                      <td data-label="Sl.No">{item.SlNo}</td>
                      {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                      <td data-label="Description" className="description-cell">
                        {getDescriptionWithTemplate(item)}
                        <div className="excavation-note" style={{ marginTop: "4px", fontSize: "11px", color: "#666", fontWeight: "normal" }}>
                          <small>Total RCC: {safeToFixed(totalRCCQty, 3)} CuM</small>
                        </div>
                      </td>
                      {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                      {columnVisibility.qty && <td data-label="QTY" style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>}
                      {columnVisibility.fixedRate && <td data-label="Fixed Rate" style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>}
                      <td data-label="Amount" className="amount-cell" style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>-</td>
                      {columnVisibility.remarks && (
                        <td data-label="Remarks" className="remarks-cell">
                          <textarea className="remarks-textbox" placeholder="Add remarks..." value={mainPoolRemarks[item.SlNo] || ""} onChange={(e) => setMainPoolRemarks(prev => ({ ...prev, [item.SlNo]: e.target.value }))} rows="2" />
                        </td>
                      )}
                    </tr>

                    {/* Sub row 10.1 — RCC Raft */}
                    {safeNumber(row_10_1?.qty || 0) > 0 && (
                      <tr className="sub-row" style={{ background: "rgba(99,179,237,0.02)" }}>
                        <td data-label="Sl.No" style={{ paddingLeft: "20px", color: "#63b3ed" }}>10.1</td>
                        {columnVisibility.code && <td data-label="Code">-</td>}
                        <td data-label="Description" style={{ paddingLeft: "40px", fontSize: "13px" }}>↳ {row_10_1?.description || "RCC Raft"}</td>
                        {columnVisibility.image && <td data-label="Image">-</td>}
                        {columnVisibility.unit && <td data-label="Unit">{item.Unit || "CuM"}</td>}
                        {columnVisibility.qty && <td data-label="QTY">{safeToFixed(safeNumber(row_10_1?.qty || 0), 3)}</td>}
                        {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(safeNumber(row_10_1?.rate || 0))}</td>}
                        <td data-label="Amount" className="amount-cell">{formatCurrency(safeNumber(row_10_1?.amount || 0))}</td>
                        {columnVisibility.remarks && <td data-label="Remarks">-</td>}
                      </tr>
                    )}

                    {/* Sub row 10.2 — RCC Retaining Wall */}
                    {safeNumber(row_10_2?.qty || 0) > 0 && (
                      <tr className="sub-row" style={{ background: "rgba(99,179,237,0.02)" }}>
                        <td data-label="Sl.No" style={{ paddingLeft: "20px", color: "#63b3ed" }}>10.2</td>
                        {columnVisibility.code && <td data-label="Code">-</td>}
                        <td data-label="Description" style={{ paddingLeft: "40px", fontSize: "13px" }}>↳ {row_10_2?.description || "RCC Retaining Wall"}</td>
                        {columnVisibility.image && <td data-label="Image">-</td>}
                        {columnVisibility.unit && <td data-label="Unit">{item.Unit || "CuM"}</td>}
                        {columnVisibility.qty && <td data-label="QTY">{safeToFixed(safeNumber(row_10_2?.qty || 0), 3)}</td>}
                        {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(safeNumber(row_10_2?.rate || 0))}</td>}
                        <td data-label="Amount" className="amount-cell">{formatCurrency(safeNumber(row_10_2?.amount || 0))}</td>
                        {columnVisibility.remarks && <td data-label="Remarks">-</td>}
                      </tr>
                    )}
                  </React.Fragment>
                );
              }
       
              // Regular items (SlNo 2-8, 11-14)
              return (
                <tr key={item.SlNo} style={isNewItem ? { background: "rgba(34,197,94,0.04)" } : {}}>
                  <td data-label="Sl.No">{item.SlNo}</td>
                  {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                  <td data-label="Description" className="description-cell">
                    {getDescriptionWithTemplate(item)}
                    {isNewItem && <span style={{ marginLeft: "8px", fontSize: "10px", color: "#4ade80", fontStyle: "italic" }}>🆕</span>}
                   </td>
                  {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>}
                  {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                  {columnVisibility.qty && (
                    <td data-label="QTY" className={quantity ? "quantity-filled" : ""}>
                      {safeToFixed(quantity, 3)}
                     </td>
                  )}
                  {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(rate)}</td>}
                  <td data-label="Amount" className="amount-cell">{formatCurrency(amount)}</td>
                  {columnVisibility.remarks && (
                    <td data-label="Remarks" className="remarks-cell">
                      <textarea className="remarks-textbox" placeholder="Add remarks..." value={mainPoolRemarks[item.SlNo] || ""} onChange={(e) => setMainPoolRemarks(prev => ({ ...prev, [item.SlNo]: e.target.value }))} rows="2" />
                     </td>
                  )}
                 </tr>
              );
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

  // ================================
  // ✅ RENDER BALANCE TANK TABLE (12 ITEMS - NO SUB ROWS)
  // ================================
  const renderBalanceTankTable = () => {
    if (!hasGutter) return (
      <div className="balance-tank-disabled-message">
        <div className="info-message"><span className="info-icon">ℹ️</span> Balance Tank is only applicable when gutter system is selected.</div>
      </div>
    );
    if (!mainPoolItems.length) return <div className="no-data-message">No balance tank data available.</div>;
    
    const filteredItems = mainPoolItems
      .filter(item => item.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[item.SlNo])
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
            {/* ✅ BALANCE TANK: NO excavation sub-rows, normal rendering for ALL items including SlNo 1 */}
            {filteredItems.map((item) => {
              const quantity = getBalanceTankQuantity(item.SlNo);
              const rate = safeNumber(item.Rate);
              const amount = quantity * rate;
              const isNewItem = item.SlNo === 3 || item.SlNo === 4;
              
              return (
                <tr key={`bt-${item.SlNo}`} style={isNewItem ? { background: "rgba(34,197,94,0.04)" } : {}}>
                  <td data-label="Sl.No">{item.SlNo}</td>
                  {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                  <td data-label="Description" className="description-cell">
                    {getDescriptionWithTemplate(item)}
                    <div className="balance-tank-badge"><small>Balance Tank</small></div>
                    {isNewItem && <span style={{ marginLeft: "8px", fontSize: "10px", color: "#4ade80", fontStyle: "italic" }}>🆕</span>}
                   </td>
                  {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>}
                  {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                  {/* ✅ NORMAL QTY - no hiding for SlNo 1 */}
                  {columnVisibility.qty && (
                    <td data-label="QTY" className={quantity ? "quantity-filled" : ""}>
                      {safeToFixed(quantity, 3)}
                     </td>
                  )}
                  {/* ✅ NORMAL RATE - no hiding for SlNo 1 */}
                  {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(rate)}</td>}
                  {/* ✅ NORMAL AMOUNT - no hiding for SlNo 1 */}
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

  // ================================
  // ✅ RENDER PUMP ROOM TABLE (12 ITEMS - NO SUB ROWS)
  // ================================
  const renderPumpRoomTable = () => {
    if (!includePumpRoom) return (
      <div className="pump-room-disabled-message">
        <div className="info-message"><span className="info-icon">ℹ️</span> Pump Room calculation is currently disabled.</div>
      </div>
    );
    if (!mainPoolItems.length) return <div className="no-data-message">No pump room data available.</div>;
    
    const filteredItems = mainPoolItems
      .filter(item => item.SlNo <= 12 && PUMP_ROOM_QTY_FIELDS[item.SlNo])
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
            {/* ✅ PUMP ROOM: NO excavation sub-rows, normal rendering for ALL items including SlNo 1 */}
            {filteredItems.map((item) => {
              const quantity = getPumpRoomQuantity(item.SlNo);
              const rate = safeNumber(item.Rate);
              const amount = quantity * rate;
              const isNewItem = item.SlNo === 3 || item.SlNo === 4;
              
              return (
                <tr key={`pr-${item.SlNo}`} style={isNewItem ? { background: "rgba(34,197,94,0.04)" } : {}}>
                  <td data-label="Sl.No">{item.SlNo}</td>
                  {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                  <td data-label="Description" className="description-cell">
                    {getDescriptionWithTemplate(item)}
                    <div className="pump-room-badge"><small>Pump Room</small></div>
                    {isNewItem && <span style={{ marginLeft: "8px", fontSize: "10px", color: "#4ade80", fontStyle: "italic" }}>🆕</span>}
                   </td>
                  {columnVisibility.image && <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>}
                  {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                  {/* ✅ NORMAL QTY - no hiding for SlNo 1 */}
                  {columnVisibility.qty && (
                    <td data-label="QTY" className={quantity ? "quantity-filled" : ""}>
                      {safeToFixed(quantity, 3)}
                     </td>
                  )}
                  {/* ✅ NORMAL RATE - no hiding for SlNo 1 */}
                  {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(rate)}</td>}
                  {/* ✅ NORMAL AMOUNT - no hiding for SlNo 1 */}
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

  // ================================
  // MEP TABLE RENDERER
  // ================================
  const renderMepTable = () => {
    if (!filteredMepItems.length) return <div className="no-data-message">No MEP data available.</div>;
    
    const baseItems = filteredMepItems.filter(item => item.SlNo <= 29);
    const advancedItems = filteredMepItems.filter(item => item.SlNo >= 30 && item.SlNo <= 34);

    const getVisibleColumnCount = (isAdvancedTable = false) => {
        let count = 1;
        if (isAdvancedTable) count++;
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

            {/* Base MEP Systems Table */}
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
                                const quantity = getMepQuantity(item.SlNo);
                                const supplyRate = getSupplyRate(item);
                                const installationRate = getInstallationRate(item);
                                const supplyCost = getSupplyCost(item, quantity);
                                const installationCost = getInstallationCost(item, quantity);
                                const totalAmount = getRowTotal(item, quantity);
                                const isZeroQuantity = quantity === 0;
                                
                                return (
                                    <tr key={item.SlNo} className={isZeroQuantity ? 'zero-quantity-row' : ''}>
                                        <td data-label="Sl.No">{item.SlNo}</td>
                                        {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                                        <td data-label="Description" className="description-cell">
                                            {item.Description || "N/A"}
                                        </td>
                                        {columnVisibility.image && (
                                            <td data-label="Image" className="image-cell">
                                                {item.Image ? renderImage(item.Image) : "-"}
                                            </td>
                                        )}
                                        {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                                        {columnVisibility.qty && (
                                            <td data-label="QTY" className={quantity ? "quantity-filled" : ""}>
                                                {quantity ? safeToFixed(quantity, 2) : "0.00"}
                                            </td>
                                        )}
                                        {columnVisibility.fixedRate && (
                                            <>
                                                <td data-label="Supply Rate">{formatCurrency(supplyRate)}</td>
                                                <td data-label="Installation Rate">{formatCurrency(installationRate)}</td>
                                            </>
                                        )}
                                        <td data-label="Supply Cost">{formatCurrency(supplyCost)}</td>
                                        <td data-label="Installation Cost">{formatCurrency(installationCost)}</td>
                                        <td data-label="Total Amount" className="amount-cell">{formatCurrency(totalAmount)}</td>
                                        {columnVisibility.remarks && (
                                            <td data-label="Remarks" className="remarks-cell">
                                                <textarea
                                                    className="remarks-textbox"
                                                    placeholder="Add remarks..."
                                                    value={mepRemarks[item.SlNo] || ""}
                                                    onChange={(e) => setMepRemarks(prev => ({ ...prev, [item.SlNo]: e.target.value }))}
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
                                <td colSpan={getVisibleColumnCount(false) - 3} className="subtotal-label">Subtotal:</td>
                                <td className="amount-cell subtotal-value">{formatCurrency(baseMepTotals.totalSupply)}</td>
                                <td className="amount-cell subtotal-value">{formatCurrency(baseMepTotals.totalInstallation)}</td>
                                <td className="amount-cell subtotal-value">{formatCurrency(baseMepTotals.grand)}</td>
                                {columnVisibility.remarks && <td className="subtotal-empty"></td>}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Advanced Equipment Table */}
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
                            {advancedItems.map((item) => {
                                const isSelected = selectedAdvancedEquipment.includes(item.SlNo);
                                const quantity = isSelected ? 1 : 0;
                                const supplyRate = getSupplyRate(item);
                                const installationRate = getInstallationRate(item);
                                const supplyCost = getSupplyCost(item, quantity);
                                const installationCost = getInstallationCost(item, quantity);
                                const totalAmount = getRowTotal(item, quantity);
                                
                                return (
                                    <tr key={item.SlNo} className={!isSelected ? 'equipment-not-selected' : ''}>
                                        <td><input type="checkbox" checked={isSelected} onChange={() => handleAdvancedEquipmentToggle(item.SlNo)} /></td>
                                        <td data-label="Sl.No">{item.SlNo}</td>
                                        {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                                        <td data-label="Description" className="description-cell">{item.Description || "N/A"}</td>
                                        {columnVisibility.image && (<td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>)}
                                        {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                                        {columnVisibility.qty && <td data-label="QTY">{isSelected ? "1" : "0"}</td>}
                                        {columnVisibility.fixedRate && (
                                            <>
                                                <td data-label="Supply Rate">{formatCurrency(supplyRate)}</td>
                                                <td data-label="Installation Rate">{formatCurrency(installationRate)}</td>
                                            </>
                                        )}
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
                                <td colSpan={getVisibleColumnCount(true) - 3} className="subtotal-label">Subtotal:</td>
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

  // ================================
  // PIPING TABLE RENDERER
  // ================================
  const renderPipingTable = () => {
    if (loadingPiping) {
      return (
        <div className="loading-spinner" style={{ textAlign: "center", padding: "40px" }}>
          <span className="status-icon">⏳</span>
          <span>Loading piping calculations...</span>
        </div>
      );
    }

    const validPipingItems = pipingItems.filter(item => item && item.Description);
    
    if (!validPipingItems || validPipingItems.length === 0) {
      return (
        <div className="no-data-message">
          No piping items available. Please check the pump room distance and ensure piping data is available.
        </div>
      );
    }

    const groupedItems = {
      pipes: validPipingItems.filter(item => item.Category === "pipe"),
      headers: validPipingItems.filter(item => item.Category === "header"),
      ball_valves: validPipingItems.filter(item => item.Category === "ball_valve"),
      flanges: validPipingItems.filter(item => item.Category === "flange"),
      puddle_flanges: validPipingItems.filter(item => item.Category === "puddle_flange"),
    };

    const categoryNames = {
      pipes: "Pipes",
      headers: "Headers",
      ball_valves: "Ball Valves",
      flanges: "Flanges",
      puddle_flanges: "Puddle Flanges",
    };

    const calculatePipingColSpan = () => {
      let colSpan = 2;
      if (columnVisibility?.code) colSpan++;
      if (columnVisibility?.image) colSpan++;
      if (columnVisibility?.unit) colSpan++;
      if (columnVisibility?.qty) colSpan++;
      if (columnVisibility?.fixedRate) colSpan += 2;
      colSpan += 3;
      return colSpan;
    };

    return (
      <div className="piping-section">
        <div className="section-header">
          <div className="table-selection-indicator">
            <span className={`selection-status ${selectedTables.piping ? 'selected' : 'not-selected'}`}>
              {selectedTables.piping ? '✓ Selected for export' : '✗ Not selected for export'}
            </span>
          </div>
          <h2 className="section-title">Piping System</h2>
          <div className="header-controls">
            <div className="total-amount-box">
              <span className="total-label">Total Amount:</span>
              <span className="total-value">{formatCurrency(pipingTotal)}</span>
            </div>
          </div>
        </div>

        <div className="pump-room-distance-control" style={{
          background: "rgba(99,179,237,0.05)",
          border: "1px solid rgba(99,179,237,0.15)",
          borderRadius: "10px",
          padding: "15px 20px",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "20px"
        }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: 600, color: "#63b3ed" }}>
              📏 Pump Room Distance from Pool (meters)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="number"
                value={equipmentDistance}
                onChange={handleDistanceChange}
                step="1"
                min="1"
                max="100"
                style={{
                  width: "120px",
                  padding: "8px 12px",
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(99,179,237,0.3)",
                  borderRadius: "6px",
                  color: "white",
                  fontSize: "14px"
                }}
              />
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                Effective distance: <strong style={{ color: "#f59e0b" }}>{safeToFixed(equipmentDistance * safetyFactor, 2)}m</strong>
              </span>
            </div>
          </div>
          
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: 600, color: "#63b3ed" }}>
              🔧 Safety Factor (%)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="number"
                value={safetyFactor}
                onChange={handleSafetyFactorChange}
                step="0.05"
                min="1.0"
                max="1.5"
                style={{
                  width: "100px",
                  padding: "8px 12px",
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(99,179,237,0.3)",
                  borderRadius: "6px",
                  color: "white",
                  fontSize: "14px"
                }}
              />
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                {((safetyFactor - 1) * 100).toFixed(0)}% buffer
              </span>
            </div>
          </div>
        </div>

        {Object.entries(groupedItems).map(([category, items]) => {
          if (items.length === 0) return null;
          
          const categoryTotal = items.reduce((sum, item) => sum + safeNumber(item.Total), 0);
          
          return (
            <div key={category} className="piping-category-section" style={{ marginBottom: "30px" }}>
              <h3 className="piping-category-title" style={{
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "15px",
                paddingBottom: "8px",
                borderBottom: "2px solid rgba(99,179,237,0.3)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                {categoryNames[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                <span className="category-total" style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#63b3ed",
                  background: "rgba(99,179,237,0.1)",
                  padding: "4px 12px",
                  borderRadius: "20px"
                }}>
                  Total: {formatCurrency(categoryTotal)}
                </span>
              </h3>
              
              <div className="table-container">
                <table className="excel-preview-table responsive-table">
                  <thead>
                    <tr>
                      <th rowSpan="2">Sl.No</th>
                      {columnVisibility?.code && <th rowSpan="2">Code</th>}
                      <th rowSpan="2">Description</th>
                      {columnVisibility?.image && <th rowSpan="2">Image</th>}
                      {columnVisibility?.unit && <th rowSpan="2">Unit</th>}
                      {columnVisibility?.qty && <th rowSpan="2">QTY</th>}
                      {columnVisibility?.fixedRate && <th colSpan="2">Rate ({getCurrencySymbol()})</th>}
                      <th colSpan="3">Amount ({getCurrencySymbol()})</th>
                      {columnVisibility?.remarks && <th rowSpan="2">Remarks</th>}
                    </tr>
                    <tr>
                      {columnVisibility?.fixedRate && <><th>Supply</th><th>Installation</th></>}
                      <th>Supply</th><th>Installation</th><th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={`${category}-${item.SlNo || idx}`}>
                        <td data-label="Sl.No">{item.SlNo || idx + 1}</td>
                        {columnVisibility?.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                        <td data-label="Description" className="description-cell">
                          {item.Description}
                          {item.Dia && <span className="dia-badge" style={{
                            display: "inline-block",
                            marginLeft: "8px",
                            padding: "2px 8px",
                            background: "rgba(99,179,237,0.15)",
                            borderRadius: "12px",
                            fontSize: "11px",
                            color: "#63b3ed"
                          }}>Ø{item.Dia}mm</span>}
                        </td>
                        {columnVisibility?.image && <td data-label="Image" className="image-cell">-</td>}
                        {columnVisibility?.unit && <td data-label="Unit">{item.Unit}</td>}
                        {columnVisibility?.qty && (
                          <td data-label="QTY" className={item.Quantity ? "quantity-filled" : ""}>
                            {safeToFixed(item.Quantity, 3)}
                          </td>
                        )}
                        {columnVisibility?.fixedRate && (
                          <>
                            <td data-label="Supply Rate">{formatCurrency(item.SupplyRate)}</td>
                            <td data-label="Installation Rate">{formatCurrency(item.InstallationRate)}</td>
                          </>
                        )}
                        <td data-label="Supply Cost">{formatCurrency(item.SupplyCost)}</td>
                        <td data-label="Installation Cost">{formatCurrency(item.InstallationCost)}</td>
                        <td data-label="Total Amount" className="amount-cell">
                          {formatCurrency(item.Total)}
                        </td>
                        {columnVisibility?.remarks && (
                          <td data-label="Remarks" className="remarks-cell">
                            <textarea className="remarks-textbox" placeholder="Add remarks..." rows="2" style={{ width: "100%", padding: "6px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "inherit", fontSize: "12px", resize: "vertical" }} />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-subtotal">
                      <td colSpan={calculatePipingColSpan()} style={{ textAlign: 'right', fontWeight: 'bold' }}>Category Total:</td>
                      <td className="amount-cell" style={{ fontWeight: 'bold' }}>{formatCurrency(categoryTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}

        <div className="piping-grand-total" style={{ marginTop: "20px", padding: "20px", background: "linear-gradient(135deg, rgba(99,179,237,0.1), rgba(66,153,225,0.05))", borderRadius: "12px", border: "1px solid rgba(99,179,237,0.2)" }}>
          <div className="grand-total-box">
            <div className="total-breakdown">
              <div className="breakdown-total" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "18px", fontWeight: "bold" }}>
                <span className="breakdown-label">Total Piping Cost:</span>
                <span className="breakdown-value" style={{ color: "#63b3ed", fontSize: "22px" }}>{formatCurrency(pipingTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="boq-note" style={{ marginTop: "20px", padding: "12px 16px", background: "rgba(245,158,11,0.05)", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.15)" }}>
          <div>
            <strong>Note:</strong>
            Piping items include pipes, headers, ball valves, and puddle flanges. 
            Installation cost is calculated at {INSTALLATION_PERCENT * 100}% of supply rate.
            <span className="small">Variations of ±10–15% from the estimate are common.</span>
          </div>
        </div>
      </div>
    );
  };

  // ================================
  // UI COMPONENTS
  // ================================
  const CurrencyToggle = () => (
    <div className="currency-toggle_1">
      <label className="currency-toggle-label_1">
        <span className="currency-label_1">Currency:</span>
        <div className="toggle-switch_1">
          <input
            type="checkbox"
            checked={currency === 'USD'}
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
            <span className="loading-spinner-small_1"></span>
            Loading exchange rate...
          </div>
        ) : (
          <>
            <div className="rate-display_1">
              <span className="rate-value_1">
                1 USD = {safeToFixed(exchangeRate, 2)} INR
              </span>
            </div>
            {lastExchangeUpdate && (
              <div className="rate-meta_1">
                <span className="rate-update-time_1">
                  Updated: {lastExchangeUpdate.toLocaleTimeString()}
                </span>
                {exchangeRateError && (
                  <span className="rate-error_1" title={exchangeRateError}>
                    ⚠️ Using fallback rate
                  </span>
                )}
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
        <button className="reset-visibility-btn" onClick={resetColumnVisibility}>Reset All</button>
      </div>
      <div className="visibility-checkboxes">
        <label className="visibility-checkbox">
          <input type="checkbox" checked={columnVisibility.image} onChange={() => toggleColumnVisibility('image')} />
          <span className="checkbox-label">Image</span>
        </label>
        <label className="visibility-checkbox">
          <input type="checkbox" checked={columnVisibility.unit} onChange={() => toggleColumnVisibility('unit')} />
          <span className="checkbox-label">Unit</span>
        </label>
        <label className="visibility-checkbox">
          <input type="checkbox" checked={columnVisibility.qty} onChange={() => toggleColumnVisibility('qty')} />
          <span className="checkbox-label">QTY</span>
        </label>
        <label className="visibility-checkbox">
          <input type="checkbox" checked={columnVisibility.fixedRate} onChange={() => toggleColumnVisibility('fixedRate')} />
          <span className="checkbox-label">Fixed Rate</span>
        </label>
        <label className="visibility-checkbox">
          <input type="checkbox" checked={columnVisibility.code} onChange={() => toggleColumnVisibility('code')} />
          <span className="checkbox-label">Code</span>
        </label>
        <label className="visibility-checkbox">
          <input type="checkbox" checked={columnVisibility.remarks} onChange={() => toggleColumnVisibility('remarks')} />
          <span className="checkbox-label">Remarks</span>
        </label>
      </div>
    </div>
  );

  const TableSelectionControls = () => {
    const totalTables = (hasGutter ? 4 : 3) + 1;
    
    return (
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
            <input type="checkbox" checked={selectedTables.mainPool} onChange={() => toggleTableSelection('mainPool')} />
            <span className="checkbox-label">Main Pool</span>
            <span className="table-count">(14 items)</span>
          </label>
          {hasGutter && (
            <label className="selection-checkbox">
              <input type="checkbox" checked={selectedTables.balanceTank} onChange={() => toggleTableSelection('balanceTank')} />
              <span className="checkbox-label">Balance Tank</span>
              <span className="table-count">(12 items)</span>
            </label>
          )}
          <label className="selection-checkbox">
            <input type="checkbox" checked={selectedTables.pumpRoom} onChange={() => toggleTableSelection('pumpRoom')} />
            <span className="checkbox-label">Pump Room</span>
            <span className="table-count">(12 items)</span>
          </label>
          <label className="selection-checkbox">
            <input type="checkbox" checked={selectedTables.mep} onChange={() => toggleTableSelection('mep')} />
            <span className="checkbox-label">MEP Systems</span>
            <span className="table-count">(34 items)</span>
          </label>
          <label className="selection-checkbox">
            <input type="checkbox" checked={selectedTables.piping} onChange={() => toggleTableSelection('piping')} />
            <span className="checkbox-label">Piping System</span>
            <span className="table-count">({pipingItems.length} items)</span>
          </label>
        </div>
        <div className="selection-info">
          <span className="info-text">
            Selected: {Object.values(selectedTables).filter(Boolean).length} of {totalTables} tables
          </span>
          {Object.values(selectedTables).filter(Boolean).length === 0 && (
            <span className="warning-text">⚠️ At least one table must be selected for export</span>
          )}
        </div>
      </div>
    );
  };

  // ================================
  // SAVE CALCULATION
  // ================================
  const saveCalculation = () => {
    try {
      const newCalc = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        dimensions: dimensions ? `${dimensions.length} × ${dimensions.width} × ${dimensions.depth} m` : "N/A",
        poolType: poolType,
        constructionType: constructionType,
        hasGutter: hasGutter,
        totalCost: grandTotal,
        mainPoolCost: mainPoolTotal,
        balanceTankCost: hasGutter ? balanceTankTotal : 0,
        pumpRoomCost: pumpRoomTotal,
        mepCost: totalMepCost,
        pipingCost: pipingTotal,
        includePumpRoom: includePumpRoom,
        includeHeatPump: includeHeatPump,
        heatPumpSelection: heatPumpSelection,
        selectedAdvancedEquipment: selectedAdvancedEquipment,
        mainPoolRemarks: mainPoolRemarks,
        mepRemarks: mepRemarks,
        balanceTankRemarks: balanceTankRemarks,
        pumpRoomRemarks: pumpRoomRemarks,
        templateDescriptions: templateDescriptions,
        pumpRoomDimensions: pumpRoomDimensions,
        balanceTankDimensions: balanceTankDimensions,
        exchangeRate: exchangeRate,
        currency: currency,
        columnVisibility: columnVisibility,
        selectedTables: selectedTables,
        dynamicRates: dynamicRates,
        updateDatabase: updateDatabase,
        equipmentDistance: equipmentDistance,
        safetyFactor: safetyFactor,
        overflowGratingIncluded: hasGutter,
        pipingItems: pipingItems
      };

      const existing = JSON.parse(localStorage.getItem("saved_calculations") || "[]");
      const isDuplicate = existing.some(calc => {
        const sameDimensions = JSON.stringify(calc.dimensions) === JSON.stringify(dimensions);
        const sameType = calc.poolType === poolType;
        const sameConstructionType = calc.constructionType === constructionType;
        return sameDimensions && sameType && sameConstructionType;
      });

      if (isDuplicate) {
        alert("⚠️ A calculation with these dimensions and settings already exists!");
        return;
      }

      const updated = [newCalc, ...existing].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
      localStorage.setItem("saved_calculations", JSON.stringify(updated));
      setSavedCalculations(updated);
      alert("✅ Calculation saved successfully!");
    } catch (error) {
      console.error("Error saving calculation:", error);
      alert("❌ Failed to save calculation. Please try again.");
    }
  };

  // ================================
  // PDF/EXCEL DOWNLOAD FUNCTIONS
  // ================================
  const downloadPDF = async () => {

try {

const selectedTableCount =
  Object.values(selectedTables)
    .filter(Boolean).length;

if (selectedTableCount === 0) {

  alert(
    "⚠️ Please select at least one table to export!"
  );

  return;
}

// ================================
// SAFE DATA
// ================================
const safeMainPoolItems =
  Array.isArray(mainPoolItems)
    ? mainPoolItems.filter(
        item =>
          MAIN_POOL_QTY_FIELDS[
            Number(item.SlNo)
          ]
      )
    : [];

const safeBalanceTankItems =
  Array.isArray(balanceTankItems)
    ? balanceTankItems.filter(
        item =>
          BALANCE_TANK_QTY_FIELDS[
            Number(item.SlNo)
          ]
      )
    : [];

const safeMepItems =
  Array.isArray(filteredMepItems)
    ? filteredMepItems
    : [];

const safePipingItems =
  Array.isArray(pipingItems)
    ? pipingItems
    : [];

const safeCivilQuantities =
  civilQuantities || {};

const safeMepQuantities =
  mepQuantities || {};

const safeBalanceTankQuantities =
  balanceTankQuantities || {};

const safePumpRoomQuantities =
  pumpRoomQuantities || {};

const safeDynamicRates =
  dynamicRates || {};

const safeCompanyProfile =
  companyProfile || {};

// ================================
// DETECT POOL TYPE
// ================================
const detectedPoolType =
  resultData?.pool_type ||
  resultData?.system_parameters?.pool_type ||
  poolType ||
  "freeform";

// ================================
// GENERATE PDF
// ================================
await generatePDF({

  // ================================
  // CORE
  // ================================
  resultData,
  poolType: detectedPoolType,
  constructionType,

  // ================================
  // DIMENSIONS
  // ================================
  dimensions,
  pumpRoomDimensions,

  // ================================
  // MAIN POOL
  // ================================
  mainPoolItems:
    selectedTables.mainPool
      ? safeMainPoolItems
      : [],

  mainPoolTotal:
    Number(mainPoolTotal || 0),

  civilQuantities:
    safeCivilQuantities,

  mainPoolRemarks,

  // ================================
  // BALANCE TANK / GUTTER
  // ================================
  hasBalancingTank:
    hasGutter,

  balanceTankItems:
    selectedTables.balanceTank &&
    hasGutter
      ? safeBalanceTankItems
      : [],

  balanceTankQuantities:
    safeBalanceTankQuantities,

  balanceTankTotal:
    hasGutter
      ? Number(balanceTankTotal || 0)
      : 0,

  balanceTankRemarks,

  // ================================
  // OVERFLOW GRATING
  // ================================
  overflowGratingData:
    hasGutter
      ? overflowGratingData
      : null,

  // ================================
  // MEP
  // ================================
  mepItems:
    selectedTables.mep
      ? safeMepItems
      : [],

  mepQuantities:
    safeMepQuantities,

  mepTotal:
    Number(totalMepCost || 0),

  mepRemarks,

  // ================================
  // PUMP ROOM
  // ================================
  includePumpRoom:
    selectedTables.pumpRoom
      ? includePumpRoom
      : false,

  pumpRoomItems:
    selectedTables.pumpRoom
      ? pumpRoomItems
      : [],

  pumpRoomQuantities:
    safePumpRoomQuantities,

  pumpRoomTotal:
    selectedTables.pumpRoom
      ? Number(pumpRoomTotal || 0)
      : 0,

  pumpRoomRemarks,

  // ================================
  // PIPING
  // ================================
  pipingItems:
    selectedTables.piping
      ? safePipingItems
      : [],

  pipingTotal:
    Number(pipingTotal || 0),

  pumpRoomDistance:
    equipmentDistance || 15,

  // ================================
  // RATES
  // ================================
  dynamicRates:
    safeDynamicRates,

  // ================================
  // TEMPLATE / REMARKS
  // ================================
  templateDescriptions,

  // ================================
  // UI SETTINGS
  // ================================
  selectedTables,
  columnVisibility,

  // ================================
  // ADVANCED EQUIPMENT
  // ================================
  selectedAdvancedEquipment,

  // ================================
  // CURRENCY
  // ================================
  currency,
  exchangeRate,

  // ================================
  // COMPANY
  // ================================
  companyProfile:
    safeCompanyProfile,

  // ================================
  // EXCAVATION SPLIT
  // ================================
  excavationSplit:
    civilQuantities?.excavation_split || {},

  // ================================
  // SHUTTERING & RCC SUBROWS
  // ================================
  shutteringSubrows:
    civilQuantities?.shuttering_subrows || {},

  rccSubrows:
    civilQuantities?.rcc_subrows || {},

  // ================================
  // FREEFORM SUPPORT
  // ================================
  poolShape:
    resultData?.poolShape ||
    resultData?.shape ||
    "freeform",

});

} catch (error) {

console.error(
  "❌ Freeform PDF Error:",
  error
);

alert(
  "PDF generation failed. Check console for details."
);


}
};


  const downloadExcel = async () => {
    const selectedTableCount = Object.values(selectedTables).filter(Boolean).length;
    if (selectedTableCount === 0) {
      alert("⚠️ Please select at least one table to export!");
      return;
    }
    
    await generateExcelReport(
      resultData,
      selectedTables.mainPool ? mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo]) : [],
      selectedTables.mep ? filteredMepItems : [],
      selectedTables.balanceTank || selectedTables.pumpRoom ? mainPoolItems : [],
      dimensions,
      totalMepCost,
      mainPoolTotal,
      selectedTables.balanceTank && hasGutter ? balanceTankTotal : 0,
      mainPoolRemarks,
      mepRemarks,
      balanceTankRemarks,
      templateDescriptions,
      dynamicRates,
      currency,
      exchangeRate,
      selectedTables.pumpRoom ? includePumpRoom : false,
      pumpRoomDimensions,
      constructionType,
      selectedAdvancedEquipment,
      columnVisibility,
      selectedTables,
      'freeform',
      selectedTables.pumpRoom ? pumpRoomTotal : 0,
      pumpRoomRemarks,
      pumpRoomQuantities,
      0, 0, 0, 0,
      hasGutter ? overflowGratingData : null,
      selectedTables.piping ? pipingItems : []
    );
  };

  // ================================
  // MAIN RENDER
  // ================================
  return (
    <div className="result-page">
      <header className="header-section">
        <div className="page-header">
          <div className="header-content">
            <h1>FreeForm Pool Calculation Results</h1>
            <p className="subtitle">
              A detailed summary of your FreeForm Pool's construction, MEP components, piping system, and cost estimates
              <br />
              <span style={{ fontSize: "11px", color: "#4ade80" }}>🆕 Excavation, Shuttering & RCC sub-rows (Main Pool only) | BT/PR: 12 items normal rendering</span>
              {isTerracePool && (
                <span style={{ fontSize: "11px", color: "#f59e0b", display: "block" }}>
                  🏢 Terrace Pool Mode: Excavation, backfilling, soling, PCC, and brickwork quantities are set to 0.
                </span>
              )}
            </p> 
          </div>
          
          <div className="header-actions_1">
            <div className="dropdown">
              <button className="download-button" onClick={(e) => { e.stopPropagation(); toggleDropdown('download'); }}>
                <span className="download-icon">⬇️</span> Download
              </button>
              <div className={`dropdown-menu ${openDropdown === 'download' ? 'show' : ''}`}>
                <button onClick={downloadPDF} className="dropdown-item"><span className="download-icon">📄</span> PDF Report</button>
                <ExcelDownloadButton
  resultData={resultData}
  mainPoolData={selectedTables.mainPool ? mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo]) : []}
  mepItems={selectedTables.mep ? filteredMepItems : []}
  dimensions={dimensions}
  totalMep={selectedTables.mep ? totalMepCost : 0}
  mainPoolTotal={selectedTables.mainPool ? mainPoolTotal : 0}
  balancingRows={selectedTables.balanceTank && hasGutter ? balanceTankItems : []}
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
  pumpRoomData={selectedTables.pumpRoom ? mainPoolItems.filter(item => PUMP_ROOM_QTY_FIELDS[item.SlNo]) : []}
  pumpRoomRows={[]}
  columnVisibility={columnVisibility}
  selectedTables={selectedTables}
  poolTypeForFilter="freeform"
  overflowGratingData={hasGutter ? overflowGratingData : null}
  pipingItems={selectedTables.piping ? pipingItems : []}
  pipingTotal={selectedTables.piping ? pipingTotal : 0}
  
  // ✅ FIXED: Properly formatted civilQuantities with split data
  civilQuantities={{
    // Base quantities
    ...civilQuantities,
    
    // Excavation split (for item 1 subrows)
    excavation_split: civilQuantities?.excavation_split || {},
    
    // Shuttering split (for item 9 subrows) - from shuttering_subrows
    shuttering_split: civilQuantities?.shuttering_subrows || {},
    
    // RCC split (for item 10 subrows) - from rcc_subrows
    rcc_split: civilQuantities?.rcc_subrows || {},
  }}
  
  balanceTankQuantities={balanceTankQuantities}
  mepQuantities={mepQuantities}
  dynamicRates={dynamicRates}
  balancingTankDimensions={balanceTankDimensions}
  balanceTankItems={balanceTankItems}
  hasGutter={hasGutter}
  pumpRoomDistance={equipmentDistance}
  safetyFactor={safetyFactor}
  companyProfile={companyProfile}
  className="dropdown-item"
>
  <span className="download-icon">📊</span> Excel Report
</ExcelDownloadButton>
              </div>
            </div>

            <button className="download-button" onClick={() => setShowShareModal(true)} > <span className="download-icon">🔗</span> Share </button>

            <div className="dropdown">
              <button className="download-button" onClick={(e) => { e.stopPropagation(); toggleDropdown('compare'); }}>
                <span className="download-icon">⚖️</span> Compare
              </button>
              <div className={`dropdown-menu ${openDropdown === 'compare' ? 'show' : ''}`}>
                <button onClick={() => setShowComparison(true)}>Compare Results</button>
              </div>
            </div>
            <button className="download-button proforma-button" onClick={() => {
              navigate('/proformainvoice', { state: { resultData, dimensions, mainPoolTotal, mepTotal: totalMepCost, pipingTotal: 0, pumpRoomTotal: includePumpRoom ? pumpRoomTotal : 0, grandTotal, poolType: "freeform", hasBalancingTank: true, includePumpRoom, selectedAdvancedEquipment, includeHeatPump, companyProfile: companyProfile || null, currency, exchangeRate, dynamicRates, pumpRoomDistance: equipmentDistance, filteredMainPoolItems: mainPoolItems || [], filteredMepItems: filteredMepItems || [], pumpRoomItems: mainPoolItems || [], balanceTankItems: balanceTankItems || [], pipingItems: pipingItems || [], mainPoolRemarks, mepRemarks, pumpRoomRemarks, templateDescriptions, civilQuantities: civilQuantities || resultData, mepQuantities: mepQuantities || resultData, pumpRoomQuantities: pumpRoomQuantities || resultData, balanceTankQuantities: balanceTankQuantities || resultData, selectedTables, columnVisibility } });
            }}>
              <span className="download-icon">📄</span> Proforma Invoice (Freeform)
            </button>
            <button className="download-button" onClick={() => {
              const fixedPipingItems = (pipingItems || []).map(item => ({ quantity: item.Quantity ?? item.quantity ?? 0, rate: item.Rate ?? item.rate ?? 0, description: item.Description ?? item.description ?? "", unit: item.Unit ?? item.unit ?? "Nos", code: item.Code ?? item.code ?? "", category: item.Category ?? item.category ?? "", type: item.Type ?? item.type ?? "", dia: item.Dia ?? item.dia ?? null, amount: item.Amount ?? item.amount ?? 0 }));
              navigate('/delivery', { state: { result: resultData, dimensions, filteredMainPoolItems: mainPoolItems || [], filteredMepItems: filteredMepItems || [], balanceTankItems: hasGutter ? (balanceTankItems || []) : [], pumpRoomItems: balanceTankItems || [], pumpRoomQuantities, pumpRoomDimensions, pipingItems: fixedPipingItems, pipingTotal: pipingTotal || 0, templateDescriptions, poolType: 'freeform', hasBalancingTank: hasGutter, hasGutter: hasGutter, includePumpRoom: true, selectedTables, selectedAdvancedEquipment, overflowGratingData, constructionType } });
            }}>
              📦 Delivery Challan
            </button>  
            <button className="download-button" onClick={() => {
              navigate('/tax', { state: { result: resultData, dimensions, mainPoolData: selectedTables.mainPool ? mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo]) : [], mepItems: selectedTables.mep ? filteredMepItems : [], pipingItems: selectedTables.piping ? pipingItems : [], pumpRoomData: selectedTables.pumpRoom ? mainPoolItems.filter(item => PUMP_ROOM_QTY_FIELDS[item.SlNo]) : [], mainPoolTotal: mainPoolTotal || 0, mepTotal: totalMepCost || 0, pipingTotal: pipingTotal || 0, pumpRoomTotal: includePumpRoom ? pumpRoomTotal : 0, balanceTankTotal: hasGutter ? balanceTankTotal : 0, templateDescriptions, poolType: 'freeform', includePumpRoom: includePumpRoom, currency, exchangeRate, selectedTables: selectedTables, constructionType: constructionType, finalTotal: grandTotal, selectedAdvancedEquipment: selectedAdvancedEquipment, percentageAmounts: { item35: 0, item36: 0, item37: 0, item38: 0 }, overflowGratingData: hasGutter ? overflowGratingData : null, hasGutter: hasGutter, equipmentDistance: equipmentDistance, safetyFactor: safetyFactor } });
            }}>
              <span className="button-icon">🧾</span> Tax Invoice
            </button>

            
          </div>
        </div>
        
        <div className="header-currency-toggle"><CurrencyToggle /><button onClick={() => setSaveOpen(true)} style={{ padding: "8px 16px", background: "#4CAF50", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="download-icon">💾</span> Save Project
            </button></div>
      </header>

      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
      
      <div><ColumnVisibilityControls /></div>
      <div className="global-table-selection"><TableSelectionControls /></div>
      
      <nav className="tab-navigation">
        <div className="tab-buttons">
          <button className={`tab-button ${activeTab === 1 ? "active" : ""}`} onClick={() => setActiveTab(1)}><span className="tab-icon">📊</span><span className="tab-label">Calculation & 3D</span></button>
          <button className={`tab-button ${activeTab === 4 ? "active" : ""}`} onClick={() => setActiveTab(4)}><span className="tab-icon">🔧</span><span className="tab-label">MEP Amount (34 items)</span></button>
          <button className={`tab-button ${activeTab === 2 ? "active" : ""}`} onClick={() => setActiveTab(2)}><span className="tab-icon">🏊</span><span className="tab-label">Civil work of Main Pool (14 items)</span></button>
          {hasGutter && <button className={`tab-button ${activeTab === 6 ? "active" : ""}`} onClick={() => setActiveTab(6)}><span className="tab-icon">⚖️</span><span className="tab-label">Civil work of Balance Tank (12 items)</span></button>}
          <button className={`tab-button ${activeTab === 5 ? "active" : ""}`} onClick={() => setActiveTab(5)}><span className="tab-icon">⚙️</span><span className="tab-label">Civil works of Pump Room (12 items)</span></button>
          <button className={`tab-button ${activeTab === 7 ? "active" : ""}`} onClick={() => setActiveTab(7)}><span className="tab-icon">🔧</span><span className="tab-label">Piping System</span></button>
          <button className={`tab-button ${activeTab === "total" ? "active" : ""}`} onClick={() => setActiveTab("total")}><span className="tab-icon">💰</span><span className="tab-label">Total Cost</span></button>
          <button className={`tab-button ${activeTab === "visualization" ? "active" : ""}`} onClick={() => setActiveTab("visualization")}><span className="tab-icon">📈</span><span className="tab-label">Visualization</span></button>
          <button className={`tab-button ${activeTab === 3 ? "active" : ""}`} onClick={() => setActiveTab(3)}><span className="tab-icon">📅</span><span className="tab-label">Timeline</span></button>
        </div>
      </nav>

      <main className="tab-content-container">
        {/* Tab 1: Calculation & 3D */}
        {activeTab === 1 && (
          <section className="tab-content active">
            <div className="specs-section" style={{ marginBottom: "30px" }}>
              <h2>Pool Specifications</h2>
              <div className="specs-container_1">
              <div className="specs-table-containe">
                <div className="specs-table-wrapper">
                  <table className="excel-preview-table" aria-label="Jacuzzi Specifications">
                    <tbody>
                      <tr>
                        <td className="spec-label"><strong>Dimensions</strong></td>
                        <td className="spec-value">{dimensions.length || 0} × {dimensions.width || 0} × {dimensions.depth || 0} m</td>
                      </tr>
                      <tr>
                        <td className="spec-label"><strong>Volume</strong></td>
                        <td className="spec-value">{safeNumber(resultData?.volume_m3 || resultData?.volume || (dimensions.length * dimensions.width * dimensions.depth)).toFixed(2)} m³</td>
                      </tr>
                     <tr>
                        <td className="spec-label"><strong>Floor Area</strong></td>
                        <td className="spec-value">{safeNumber(resultData?.floor_area_m2 || resultData?.floor_area || (dimensions.length * dimensions.width)).toFixed(2)} m²</td>
                      </tr>
                      <tr>
                        <td className="spec-label"><strong>Wall Area</strong></td>
                        <td className="spec-value">{safeNumber(resultData?.wall_area_m2 || resultData?.wall_area).toFixed(2)} m²</td>
                      </tr>
                      <tr>
                        <td className="spec-label"><strong>Turnover Time</strong></td>
                        <td className="spec-value">{safeNumber(resultData?.turnover_hours || resultData?.turnover).toFixed(1)} hours</td>
                      </tr>
                      <tr>
                        <td className="spec-label"><strong>Flow Rate</strong></td>
                        <td className="spec-value">{safeNumber(resultData?.flowrate_m3_per_hr || resultData?.flow_rate).toFixed(2)} m³/hr</td>
                      </tr>
                      <tr>
                        <td className="spec-label"><strong>Filter Diameter</strong></td>
                        <td className="spec-value">{resultData?.filter_dia_mm || resultData?.filter_diameter || "N/A"} mm</td>
                      </tr>
                      <tr>
                        <td className="spec-label"><strong>Pump HP</strong></td>
                        <td className="spec-value">{resultData?.hp || resultData?.pump_hp || "N/A"} HP</td>
                      </tr>
                      <tr>
                        <td className="spec-label"><strong>Pool Type</strong></td>
                        <td className="spec-value">{poolType}</td>
                      </tr>
                      <tr>
                        <td className="spec-label"><strong>Construction</strong></td>
                        <td className="spec-value">{constructionType} {isTerracePool && "(Terrace Mode - No Excavation)"}</td>
                      </tr>
                      <tr>
                        <td className="spec-label"><strong>Gutter System</strong></td>
                        <td className="spec-value">{hasGutter ? "Yes" : "No"}</td>
                      </tr>
                      <tr>
                        <td className="spec-label"><strong>Pump Room Distance</strong></td>
                        <td className="spec-value">{equipmentDistance} m</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
            
            <PoolVisualization3D dimensions={dimensions} />
          </section>
        )}

        {/* Tab 2: Main Pool Civil */}
        {activeTab === 2 && (
          <section className="tab-content active">
            <div className="section-header">
              <div className="table-selection-indicator"><span className={`selection-status ${selectedTables.mainPool ? 'selected' : 'not-selected'}`}>{selectedTables.mainPool ? '✓ Selected for export' : '✗ Not selected for export'}</span></div>
              <h2>Civil Works - Main Pool (14 Items)</h2>
              <div className="header-controls"><div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(mainPoolTotal)}</span></div></div>
            </div>
            {loadingMainPool ? <div className="loading-spinner">Loading data...</div> : <>{renderMainPoolTable()}<div className="boq-note"><div><strong>Note:</strong> The estimates provided are based on current industry standards. <span className="small">Variations of ±10–15% are common.</span>
            {isTerracePool && <div className="terrace-note" style={{ marginTop: "8px", color: "#f59e0b" }}><strong>🏢 Terrace Pool Note:</strong> Excavation, backfilling, disposal, consolidation, soling, PCC, and brickwork quantities are set to 0. Only structural items are included.</div>}
            <div className="excavation-split-note" style={{ marginTop: "8px", color: "#63b3ed" }}><strong>Sub-Rows:</strong> Excavation (1.1/1.2), Shuttering (9.1/9.2), RCC (10.1/10.2) with rates and amounts from backend. Only Main Pool has sub-rows {isTerracePool && <span>(excavation hidden for terrace pools)</span>}.</div></div></div></>}
          </section>
        )}

        {/* Tab 6: Balance Tank Civil */}
        {activeTab === 6 && hasGutter && (
          <section className="tab-content active">
            <div className="section-header">
              <div className="table-selection-indicator"><span className={`selection-status ${selectedTables.balanceTank ? 'selected' : 'not-selected'}`}>{selectedTables.balanceTank ? '✓ Selected for export' : '✗ Not selected for export'}</span></div>
              <h2>Civil Works - Balance Tank (12 Items)</h2>
              <div className="header-controls"><div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(balanceTankTotal)}</span></div></div>
            </div>
            {loadingBalanceTank ? <div className="loading-spinner">Loading data...</div> : <>{renderBalanceTankTable()}<div className="boq-note"><div><strong>Note:</strong> Balance tank quantities are 7.5% of main pool. 12 items only (no Coping, no Tiling). NO sub-rows - all items rendered normally.
            {isTerracePool && <div className="terrace-note" style={{ marginTop: "8px", color: "#f59e0b" }}><strong>🏢 Terrace Pool Note:</strong> Soil-related items (excavation, backfilling, soling, PCC, brickwork) are set to 0.</div>}
            </div></div></>}
          </section>
        )}

        {/* Tab 5: Pump Room Civil */}
        {activeTab === 5 && (
          <section className="tab-content active">
            <div className="section-header">
              <div className="table-selection-indicator"><span className={`selection-status ${selectedTables.pumpRoom ? 'selected' : 'not-selected'}`}>{selectedTables.pumpRoom ? '✓ Selected for export' : '✗ Not selected for export'}</span></div>
              <h2>Civil Works - Pump Room (12 Items)</h2>
              <div className="header-controls"><div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(pumpRoomTotal)}</span></div></div>
            </div>
            {loadingBalanceTank ? <div className="loading-spinner">Loading data...</div> : <>{renderPumpRoomTable()}<div className="boq-note"><div><strong>Note:</strong> Pump room quantities are 15% of main pool. 12 items only (no Coping, no Tiling). NO sub-rows - all items rendered normally.
            {isTerracePool && <div className="terrace-note" style={{ marginTop: "8px", color: "#f59e0b" }}><strong>🏢 Terrace Pool Note:</strong> Soil-related items (excavation, backfilling, soling, PCC, brickwork) are set to 0.</div>}
            </div></div></>}
          </section>
        )}

        {/* Tab 4: MEP */}
        {activeTab === 4 && (
          <section className="tab-content active">
            <div className="section-header">
              <div className="table-selection-indicator"><span className={`selection-status ${selectedTables.mep ? 'selected' : 'not-selected'}`}>{selectedTables.mep ? '✓ Selected for export' : '✗ Not selected for export'}</span></div>
              <h2>MEP Systems (34 Items)</h2>
              <div className="header-controls"><div className="total-amount-box"><span className="total-label">Total Amount:</span><span className="total-value">{formatCurrency(totalMepCost)}</span></div></div>
            </div>
            {loadingMep ? <div className="loading-spinner">Loading data...</div> : <>{renderMepTable()}</>}
          </section>
        )}

        {/* Tab 7: Piping */}
        {activeTab === 7 && (
          <section className="tab-content active">
            {renderPipingTable()}
          </section>
        )}

        {/* Tab: Total Cost */}
        {activeTab === "total" && (
          <section className="tab-content active">
            <div className="section-header">
              <h2 className="section-title">Total Pool Cost Summary</h2>
            </div>

            <div className="summary-cards">
              <div className="summary-card">
                <div className="summary-icon">🏊</div>
                <div className="summary-details">
                  <h3>Main Pool Civil</h3>
                  <p className="summary-amount">{formatCurrency(mainPoolTotal)}</p>
                </div>
              </div>

              {hasGutter && (
                <div className="summary-card">
                  <div className="summary-icon">💧</div>
                  <div className="summary-details">
                    <h3>Balance Tank Civil</h3>
                    <p className="summary-amount">{formatCurrency(balanceTankTotal)}</p>
                  </div>
                </div>
              )}

              <div className="summary-card">
                <div className="summary-icon">⚙️</div>
                <div className="summary-details">
                  <h3>Pump Room Civil</h3>
                  <p className="summary-amount">{formatCurrency(pumpRoomTotal)}</p>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon">🔧</div>
                <div className="summary-details">
                  <h3>MEP Systems</h3>
                  <p className="summary-amount">{formatCurrency(totalMepCost)}</p>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon">🔩</div>
                <div className="summary-details">
                  <h3>Piping System</h3>
                  <p className="summary-amount">{formatCurrency(pipingTotal)}</p>
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
                        <span>Subtotal:</span>
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
                Includes complete civil works, MEP systems, piping network
                {hasGutter ? ", balancing tank" : ""}, and pump room construction.
                <br />
                <span className="gst-note_1">All prices include 18% GST as per applicable tax regulations</span>
                
              </p>
            </div>
          </section>
        )}

        {/* Tab: Visualization */}
        {activeTab === "visualization" && (
          <section className="tab-content active">
            <h2>Cost Visualization</h2>
            <CostBreakdownChart mainPoolTotal={mainPoolTotal} balanceTankTotal={hasGutter ? balanceTankTotal : 0} pumpRoomTotal={pumpRoomTotal} mepTotal={totalMepCost} pipingTotal={pipingTotal} />
            <PoolVisualization3D dimensions={dimensions} />
          </section>
        )}

        {/* Tab 3: Timeline */}
        {activeTab === 3 && (
          <section className="tab-content active">
            <h2>Project Timeline</h2>
            {resultData?.timeline ? <Timeline data={resultData.timeline} /> : <div className="no-data-message">No timeline data available.</div>}
          </section>
        )}
      </main>

      {/* Debug Modal */}
      {showDebug && debugInfo && (
        <div className="debug-modal-overlay" onClick={() => setShowDebug(false)}>
          <div className="debug-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Rate Flow Debug Info</h3>
            <button className="debug-modal-close" onClick={() => setShowDebug(false)}>×</button>
            <div className="debug-section">
              <h4>Dimensions</h4>
              <pre>{JSON.stringify(debugInfo.dimensions, null, 2)}</pre>
            </div>
            <div className="debug-section">
              <h4>mep_rates Table</h4>
              <p>Exact match found: {debugInfo.mep_rates?.exact_match_found ? '✅' : '❌'}</p>
              <pre>{JSON.stringify(debugInfo.mep_rates, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {imageModal.show && (
        <div className="image-modal-overlay" onClick={() => setImageModal({ show: false, src: "" })}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setImageModal({ show: false, src: "" })}>×</button>
            <img src={imageModal.src} alt="Enlarged view" className="image-modal-image" />
          </div>
        </div>
      )}

      {/* Comparison Tool */}
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
          overflowGratingData={hasGutter ? overflowGratingData : null} 
          pipingItems={selectedTables.piping ? pipingItems : []} 
        />
      )}

      {/* Share Modal */}
      {/* Share Modal */}
{showShareModal && (
  <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
    <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
      <button className="share-modal-close" onClick={() => setShowShareModal(false)}>✕</button>
      <ShareResults 
        resultData={resultData}
        
        mainPoolData={
          selectedTables.mainPool
            ? mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo])
            : []
        }
        
        mepItems={
          selectedTables.mep
            ? filteredMepItems
            : []
        }
        
        balancingRows={
          selectedTables.balanceTank && hasGutter
            ? balanceTankItems.filter(item => item.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[item.SlNo])
            : []
        }
        
        balanceTankData={
          selectedTables.balanceTank && hasGutter
            ? balanceTankItems.filter(item => item.SlNo <= 12 && BALANCE_TANK_QTY_FIELDS[item.SlNo])
            : []
        }
        
        pumpRoomData={
          selectedTables.pumpRoom
            ? mainPoolItems.filter(item => item.SlNo <= 12 && PUMP_ROOM_QTY_FIELDS[item.SlNo])
            : []
        }
        
        pipingItems={
          selectedTables.piping
            ? pipingItems
            : []
        }
        
        dimensions={dimensions}
        
        totalMep={
          selectedTables.mep
            ? totalMepCost
            : 0
        }
        
        mainPoolTotal={
          selectedTables.mainPool
            ? mainPoolTotal
            : 0
        }
        
        balancingTankTotal={
          selectedTables.balanceTank && hasGutter
            ? balanceTankTotal
            : 0
        }
        
        balanceTankTotal={
          selectedTables.balanceTank && hasGutter
            ? balanceTankTotal
            : 0
        }
        
        pumpRoomTotal={
          selectedTables.pumpRoom && includePumpRoom
            ? pumpRoomTotal
            : 0
        }
        
        pipingTotal={
          selectedTables.piping
            ? pipingTotal
            : 0
        }
        
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
        
        // Quantity data
        civilQuantities={civilQuantities}
        mepQuantities={mepQuantities}
        pumpRoomQuantities={pumpRoomQuantities}
        balanceTankQuantities={balanceTankQuantities}
        dynamicRates={dynamicRates}
        
        currency={currency}
        exchangeRate={exchangeRate}
        
        includePumpRoom={
          selectedTables.pumpRoom
            ? includePumpRoom
            : false
        }
        
        selectedAdvancedEquipment={selectedAdvancedEquipment}
        columnVisibility={columnVisibility}
        selectedTables={selectedTables}
        
        apiBaseUrl={`${API_BASE_URL}/admin`}
        
        filteredMepItems={
          selectedTables.mep
            ? filteredMepItems
            : []
        }
      />
    </div>
  </div>
)}

      {/* Save Project Modal */}
      <SaveProjectModal 
        open={saveOpen} 
        onClose={() => setSaveOpen(false)} 
        resultData={resultDataForSave} 
        dimensions={dimensions} 
        projectType="freeform" 
      />

      <footer className="action-buttons">
        <button className="download-button" onClick={saveCalculation}>
          <span className="button-icon">💾</span> Save Calculation
        </button>
        <button className="download-button" onClick={() => navigate("/")}>
          <span className="button-icon">←</span> Back to Calculator
        </button>
        <button className="download-button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="button-icon">↑</span> Back to top
        </button>
      </footer>
    </div>
  );
}

export default ResultPage;