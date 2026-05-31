import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import "./result.css";

import { generatePDF } from "./download";
import { generateExcelReport } from "./excel.jsx";
import Timeline from "./timeline";
import HelpModal from "./HelpModal";
import CostBreakdownChart from "./CostBreakdownChart";
import ShareResults from "./ShareResults";
import ComparisonTool from "./ComparisonTool";
import SaveProjectModal from "./SaveProjectModal";

const API_BASE_URL = "https://pool-costing-api.intelithon.in";
const INSTALLATION_PERCENT = 0.15;

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

function JacuzziSpaResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // ================================
  // STATE MANAGEMENT
  // ================================
  const initialState = location.state?.result || null;
  const [resultData, setResultData] = useState(initialState);
  const [dimensions, setDimensions] = useState(location.state?.dimensions || {});
  const [poolType, setPoolType] = useState("jacuzzi");
  const [constructionType, setConstructionType] = useState(location.state?.constructionType || "in_ground");

  // MASTER DATA - From admin endpoints
  const [mainPoolItems, setMainPoolItems] = useState([]);
  const [mepItems, setMepItems] = useState([]);
  const [balanceTankItems, setBalanceTankItems] = useState([]);

  const [companyProfile, setCompanyProfile] = useState(null);

  // QUANTITIES - From calculation endpoints
  const [civilQuantities, setCivilQuantities] = useState({});
  const [mepQuantities, setMepQuantities] = useState({});
  const [pumpRoomQuantities, setPumpRoomQuantities] = useState({});

  // Pump room and balance tank dimensions
  const [pumpRoomDimensions, setPumpRoomDimensions] = useState({});
  const [balanceTankDimensions, setBalanceTankDimensions] = useState({});
  const [includePumpRoom, setIncludePumpRoom] = useState(true);
  const [hasBalancingTank, setHasBalancingTank] = useState(false);

  // ================================
  // PIPING SYSTEM STATE
  // ================================
  const [pipingItems, setPipingItems] = useState([]);
  const [pumpRoomDistance, setPumpRoomDistance] = useState(15.0);
  const [updatingDistance, setUpdatingDistance] = useState(false);

  // ================================
  // DYNAMIC RATES FROM MEP_RATES TABLE
  // ================================
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
    jet_pump_rate: 52500,
    heater_rate: 0,
    last_updated: null
  });

  const [includeHeatPump, setIncludeHeatPump] = useState(false);
  const [heatPumpSelection, setHeatPumpSelection] = useState(null);

  // Loading states
  const [loadingMainPool, setLoadingMainPool] = useState(true);
  const [loadingMep, setLoadingMep] = useState(true);
  const [loadingBalanceTank, setLoadingBalanceTank] = useState(true);
  const [loadingMepCalculation, setLoadingMepCalculation] = useState(false);
  const [loadingCalc, setLoadingCalc] = useState(!initialState);
  const [apiError, setApiError] = useState(null);

  // Template descriptions
  const [templateDescriptions, setTemplateDescriptions] = useState({});

  // Saved calculations
  const [savedCalculations, setSavedCalculations] = useState([]);

  // Remarks
  const [mainPoolRemarks, setMainPoolRemarks] = useState({});
  const [mepRemarks, setMepRemarks] = useState({});
  const [pumpRoomRemarks, setPumpRoomRemarks] = useState({});

  // REAL-TIME EXCHANGE RATE
  const [exchangeRate, setExchangeRate] = useState(83.0);
  const [loadingExchangeRate, setLoadingExchangeRate] = useState(false);
  const [lastExchangeUpdate, setLastExchangeUpdate] = useState(null);
  const [exchangeRateError, setExchangeRateError] = useState(null);

  // Advanced equipment selection (Heat Pump - SlNo 29)
  const [selectedAdvancedEquipment, setSelectedAdvancedEquipment] = useState([]);

  // Option to update database - DEFAULT TO TRUE for saving rates
  const [updateDatabase, setUpdateDatabase] = useState(true);

  // UI state
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [activeTab, setActiveTab] = useState(1);
  const [imageModal, setImageModal] = useState({ show: false, src: "" });
  const [saveOpen, setSaveOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Currency
  const [currency, setCurrency] = useState('INR');

  // Column visibility
  const [columnVisibility, setColumnVisibility] = useState({
    image: true,
    unit: true,
    qty: true,
    fixedRate: true,
    remarks: true,
    code: true
  });

  // Table selection
  const [selectedTables, setSelectedTables] = useState({
    mainPool: true,
    pumpRoom: true,
    mep: true,
    piping: true
  });

  // Debug state
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  // Jacuzzi specific specs
  const [seatingCapacity, setSeatingCapacity] = useState(4);
  const [waterJets, setWaterJets] = useState(16);
  const [airJets, setAirJets] = useState(4);
  const [heaterKW, setHeaterKW] = useState(6);

  // ================================
  // ✅ ADD EDITABLE STATES
  // ================================
  const [editableCivilQty, setEditableCivilQty] = useState({});
  const [editableMepQty, setEditableMepQty] = useState({});
  const [editablePumpRoomQty, setEditablePumpRoomQty] = useState({});
  const [editablePipingQty, setEditablePipingQty] = useState({});
  const [editableSubRowQty, setEditableSubRowQty] = useState({});

  // ================================
  // ✅ ADD COMMON QTY HANDLER
  // ================================
  const handleQtyChange = (type, key, value) => {
    const qty = Number(value) || 0;

    switch (type) {
      case "civil":
        setEditableCivilQty(prev => ({
          ...prev,
          [key]: qty
        }));
        break;

      case "mep":
        setEditableMepQty(prev => ({
          ...prev,
          [key]: qty
        }));
        break;

      case "pump":
        setEditablePumpRoomQty(prev => ({
          ...prev,
          [key]: qty
        }));
        break;

      case "piping":
        setEditablePipingQty(prev => ({
          ...prev,
          [key]: qty
        }));
        break;

      case "subrow":
        setEditableSubRowQty(prev => ({
          ...prev,
          [key]: qty
        }));
        break;

      default:
        break;
    }
  };

  // ================================
  // ✅ FIXED — resolveTemplateDescription helper
  // Replaces {{placeholders}} with actual values from dynamicRates
  // ================================
  const resolveTemplateDescription = (desc) => {
    if (!desc || typeof desc !== 'string') return desc;
    if (!desc.includes('{{')) return desc;

    let resolved = desc;

    // Replace all known placeholders
    const replacements = {
      '{{filter_dia_mm}}': dynamicRates.filter_dia || 'N/A',
      '{{mpv_size}}': getMpvSizeFromDia(dynamicRates.filter_dia),
      '{{flowrate_m3}}': safeToFixed(dynamicRates.flowrate_m3 || 0, 2),
      '{{hp}}': dynamicRates.hp || 'N/A',
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      if (resolved.includes(placeholder)) {
        resolved = resolved.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), String(value));
      }
    }

    return resolved;
  };

  // Helper to get MPV size from filter diameter
  const getMpvSizeFromDia = (dia) => {
    if (!dia) return 'N/A';
    const d = Number(dia);
    if (d >= 400 && d <= 650) return '1.5';
    if (d >= 700 && d <= 900) return '2';
    if (d >= 1000 && d <= 1200) return '2.5';
    if (d >= 1400 && d <= 1600) return '3';
    return 'N/A';
  };

  // ================================
  // ✅ FIXED — Centralized MEP description resolution helper
  // Uses resolveTemplateDescription to fix {{placeholders}}
  // ================================
  const getResolvedMepDescription = (slNo, fallbackItem) => {
    const numericSlNo = Number(slNo);
    const GENERIC = ["filter", "pump", "n/a", ""];

    const isUsable = (desc) =>
      desc &&
      typeof desc === 'string' &&
      !GENERIC.includes(desc.toLowerCase().trim()) &&
      desc.length > 10;

    // Priority 1: Check resultData.mep_items (from calculate-mep endpoint)
    const calcItem = resultData?.mep_items?.find(
      m => Number(m.SlNo ?? m.sl_no) === numericSlNo
    );
    const apiDesc = calcItem?.Description || "";
    const resolvedApiDesc = resolveTemplateDescription(apiDesc);
    if (isUsable(resolvedApiDesc) && !resolvedApiDesc.includes('{{')) {
      return resolvedApiDesc;
    }

    // Priority 2: Check mepItems (from admin endpoint) - these have the full templates
    const adminItem = mepItems?.find(m => Number(m.SlNo) === numericSlNo);
    const adminDesc = adminItem?.Description || "";
    const resolvedAdminDesc = resolveTemplateDescription(adminDesc);
    if (isUsable(resolvedAdminDesc) && !resolvedAdminDesc.includes('{{')) {
      return resolvedAdminDesc;
    }

    // Priority 3: Check dynamicRates descriptions
    if (numericSlNo === 1 && dynamicRates.filter_description) {
      const resolved = resolveTemplateDescription(dynamicRates.filter_description);
      if (isUsable(resolved) && !resolved.includes('{{')) return resolved;
    }
    if (numericSlNo === 7 && dynamicRates.pump_description) {
      const resolved = resolveTemplateDescription(dynamicRates.pump_description);
      if (isUsable(resolved) && !resolved.includes('{{')) return resolved;
    }

    // Priority 4: Check root-level resultData
    if (numericSlNo === 1 && resultData?.filter_description) {
      const resolved = resolveTemplateDescription(resultData.filter_description);
      if (isUsable(resolved) && !resolved.includes('{{')) return resolved;
    }
    if (numericSlNo === 7 && resultData?.pump_description) {
      const resolved = resolveTemplateDescription(resultData.pump_description);
      if (isUsable(resolved) && !resolved.includes('{{')) return resolved;
    }

    // Priority 5: Fallback to fallbackItem description
    const fallbackDesc = fallbackItem?.Description || "";
    const resolvedFallback = resolveTemplateDescription(fallbackDesc);
    if (isUsable(resolvedFallback) && !resolvedFallback.includes('{{')) {
      return resolvedFallback;
    }

    // Last resort: Build description from available data
    if (numericSlNo === 1) {
      const dia = dynamicRates.filter_dia || 'N/A';
      const mpv = getMpvSizeFromDia(dynamicRates.filter_dia);
      return `Filter – Dia ${dia} mm with clamp lid and ${mpv} inches connections, flow rate ${safeToFixed(dynamicRates.flowrate_m3 || 0, 2)} m³/hr`;
    }
    if (numericSlNo === 7) {
      const hp = dynamicRates.hp || 'N/A';
      return `Pump – ${hp} HP centrifugal pump with thermoplastic corrosion-resistant body, flow rate ${safeToFixed(dynamicRates.flowrate_m3 || 0, 2)} m³/hr`;
    }

    return fallbackItem?.Description || `Item ${numericSlNo}`;
  };

  // ================================
  // INSTALLATION RATE HELPER FUNCTIONS
  // ================================
  const getSupplyRate = (item) => {
    if (!item) return 0;
    if (item.SlNo === 1) return dynamicRates.filter_rate || 0;
    if (item.SlNo === 7) return dynamicRates.pump_rate || 0;
    if (item.SlNo === 28) return 52500;
    return item.Rate || 0;
  };

  const getInstallationRate = (item) => {
    const supply = getSupplyRate(item);
    return supply * INSTALLATION_PERCENT;
  };

  const getTotalRate = (item) => {
    return getSupplyRate(item) + getInstallationRate(item);
  };

  const getSupplyCost = (item, quantity) => {
    return quantity * getSupplyRate(item);
  };

  const getInstallationCost = (item, quantity) => {
    return quantity * getInstallationRate(item);
  };

  const getRowTotal = (item, quantity) => {
    return getSupplyCost(item, quantity) + getInstallationCost(item, quantity);
  };

  // ================================
  // QTY FIELDS - 14 ITEMS (MATCHES BACKEND)
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
    10: "Underwaterlight_QTY",
    11: "Transformer_QTY",
    12: "ControlPanel_QTY",
    13: "Cables_QTY",
    14: "Earthing_QTY",
    15: "FloatingHose_QTY",
    16: "Brush_QTY",
    17: "Algae_QTY",
    18: "Net_QTY",
    19: "Handle_QTY",
    20: "VacuumHead_QTY",
    21: "TestKit_QTY",
    22: "CurvedBrush_QTY",
    23: "ChlorinePump_QTY",
    24: "DosingTank_QTY",
    25: "Stirrer_QTY",
    26: "water_jet_qty",
    27: "air_controller_qty",
    28: "jet_pump_qty",
    29: "HeatPump_QTY"
  };

  // ================================
  // DEBUG LOG FOR CIVIL DATA
  // ================================
  useEffect(() => {
    console.log("🧱 CIVIL DATA FRONTEND:", {
      civilQuantities,
      resultDataCivil: resultData?.civil_quantities,
      excavationSplit: civilQuantities?.excavation_split,
      shutteringSplit: civilQuantities?.shuttering_split,
      shotcretingSplit: civilQuantities?.shotcreting_split,
      mapping: MAIN_POOL_QTY_FIELDS
    });
  }, [civilQuantities, resultData]);

  // ================================
  // ✅ GET QUANTITY FOR MEP ITEM - WITH EDITABLE STATE
  // ================================
  const getMepQuantity = (item) => {
    const slNo = item.SlNo;
    
    // ✅ Check editable state first
    if (editableMepQty[slNo] !== undefined) {
      return Number(editableMepQty[slNo]);
    }

    const qtyField = MEP_QTY_FIELDS[slNo];
    let qty = 0;

    if (qtyField && mepQuantities && mepQuantities[qtyField] !== undefined) {
      qty = Number(mepQuantities[qtyField]);
    } else if (qtyField && resultData?.mep_quantities && resultData.mep_quantities[qtyField] !== undefined) {
      qty = Number(resultData.mep_quantities[qtyField]);
    } else if (slNo === 26) {
      qty = Number(resultData?.water_jets || waterJets || 0);
    } else if (slNo === 27) {
      qty = Number(resultData?.air_jets || airJets || 0);
    } else if (slNo === 28) {
      qty = Number(resultData?.jet_pump_qty || 1);
    } else if (slNo === 29) {
      qty = selectedAdvancedEquipment.includes(29) ? 1 : 0;
    } else if (item.Quantity !== undefined) {
      qty = Number(item.Quantity);
    }

    return qty;
  };

  // ================================
  // FILTERED MEP ITEMS - ALWAYS SHOW ALL 29 ITEMS, HEAT PUMP OPTIONAL
  // ================================
  const filteredMepItems = useMemo(() => {
    if (!Array.isArray(mepItems)) return [];
    const items = mepItems.filter(item => item.SlNo >= 1 && item.SlNo <= 29);
    return items.filter(item => {
      if (item.SlNo === 29) return selectedAdvancedEquipment.includes(29);
      return true;
    });
  }, [mepItems, selectedAdvancedEquipment]);

  // ================================
  // PIPING ITEMS FROM RESULT DATA
  // ================================
  const pipingItemsFromResult = useMemo(() => {
    return resultData?.piping_items || resultData?.piping || [];
  }, [resultData]);

  // ================================
  // ✅ PIPING TOTALS WITH EDITABLE QTY
  // ================================
  const pipingTotals = useMemo(() => {
    if (!pipingItemsFromResult || pipingItemsFromResult.length === 0) return 0;
    let total = 0;
    pipingItemsFromResult.forEach(item => {
      const slNo = item.SlNo || item.sl_no;
      const qty = editablePipingQty[slNo] !== undefined
        ? editablePipingQty[slNo]
        : Number(item.Quantity || item.quantity || 0);
      const rate = Number(item.Rate || item.rate || 0);
      const supply = qty * rate;
      const installation = supply * INSTALLATION_PERCENT;
      total += (supply + installation);
    });
    return total;
  }, [pipingItemsFromResult, editablePipingQty]);

  // ================================
  // LOAD SAVED SETTINGS
  // ================================
  useEffect(() => {
    const savedVisibility = JSON.parse(localStorage.getItem('jacuzziColumnVisibility') || 'null');
    if (savedVisibility) setColumnVisibility(savedVisibility);

    const savedTableSelection = JSON.parse(localStorage.getItem('jacuzziSelectedTables') || 'null');
    if (savedTableSelection) setSelectedTables(savedTableSelection);

    const savedAdvanced = JSON.parse(localStorage.getItem('selectedAdvancedEquipment') || '[]');
    if (savedAdvanced) setSelectedAdvancedEquipment(savedAdvanced);

    const savedUpdateDB = localStorage.getItem('updateDatabase');
    if (savedUpdateDB !== null) {
      setUpdateDatabase(savedUpdateDB === 'true');
    } else {
      setUpdateDatabase(true);
    }

    const saved = JSON.parse(localStorage.getItem('saved_jacuzzi_calculations') || '[]');
    setSavedCalculations(saved);

    const savedDistance = localStorage.getItem('jacuzziPumpRoomDistance');
    if (savedDistance !== null) setPumpRoomDistance(Number(savedDistance));
  }, []);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const companyCode = localStorage.getItem("tenant_company_code");
        if (!companyCode) return;
        const cachedProfile = localStorage.getItem("tenant_company_profile");
        if (cachedProfile) {
          try { setCompanyProfile(JSON.parse(cachedProfile)); } catch (e) { console.error("Error parsing cached company profile", e); }
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
        }
      } catch (err) {
        console.error("Company profile fetch error:", err);
      }
    };
    fetchCompanyProfile();
  }, [navigate]);

  useEffect(() => { localStorage.setItem('jacuzziColumnVisibility', JSON.stringify(columnVisibility)); }, [columnVisibility]);
  useEffect(() => { localStorage.setItem('jacuzziSelectedTables', JSON.stringify(selectedTables)); }, [selectedTables]);
  useEffect(() => { localStorage.setItem('selectedAdvancedEquipment', JSON.stringify(selectedAdvancedEquipment)); }, [selectedAdvancedEquipment]);
  useEffect(() => { localStorage.setItem('updateDatabase', updateDatabase.toString()); }, [updateDatabase]);
  useEffect(() => { localStorage.setItem('jacuzziPumpRoomDistance', pumpRoomDistance.toString()); }, [pumpRoomDistance]);

  // Toggle functions
  const toggleColumnVisibility = (columnName) => {
    setColumnVisibility(prev => ({ ...prev, [columnName]: !prev[columnName] }));
  };

  const resetColumnVisibility = () => {
    setColumnVisibility({ image: true, unit: true, qty: true, fixedRate: true, remarks: true, code: true });
  };

  const toggleTableSelection = (tableName) => {
    setSelectedTables(prev => ({ ...prev, [tableName]: !prev[tableName] }));
  };

  const selectAllTables = () => setSelectedTables({ mainPool: true, pumpRoom: true, mep: true, piping: true });
  const deselectAllTables = () => setSelectedTables({ mainPool: false, pumpRoom: false, mep: false, piping: false });
  const toggleDropdown = (name) => setOpenDropdown(openDropdown === name ? null : name);

  // ================================
  // ADVANCED EQUIPMENT HANDLERS (Heat Pump - SlNo 29)
  // ================================
  const handleAdvancedEquipmentToggle = (slNo) => {
    if (slNo === 29) {
      setSelectedAdvancedEquipment(prev =>
        prev.includes(slNo) ? prev.filter(id => id !== slNo) : [...prev, slNo]
      );
    }
  };

  const handleSelectAllAdvanced = () => {
    const heatPumpSlNo = 29;
    if (selectedAdvancedEquipment.includes(heatPumpSlNo)) {
      setSelectedAdvancedEquipment([]);
    } else {
      setSelectedAdvancedEquipment([heatPumpSlNo]);
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
          const response = await fetch(apiUrl, { method: 'GET', signal: controller.signal, mode: 'cors' });
          clearTimeout(timeoutId);
          if (!response.ok) continue;
          const data = await response.json();
          let usdRate = null;
          if (data.rates && data.rates.USD) usdRate = data.rates.USD;
          else if (data.rates && data.rates.usd) usdRate = data.rates.usd;
          else if (data.conversion_rates && data.conversion_rates.USD) usdRate = data.conversion_rates.USD;
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
        setExchangeRateError(`Using fallback rate: 1 USD = 83.0 INR`);
      }
    } catch (error) {
      setExchangeRate(83.0);
      setLastExchangeUpdate(new Date());
      setExchangeRateError("Failed to fetch exchange rates. Using fallback rate.");
    } finally {
      setLoadingExchangeRate(false);
    }
  };

  const formatCurrency = (amount, curr = currency) => {
    const formattedAmount = safeToFixed(amount);
    if (curr === 'USD') {
      const usdAmount = amount / exchangeRate;
      return `$${safeToFixed(usdAmount, 2)}`;
    }
    return `₹${formattedAmount}`;
  };

  const getCurrencySymbol = (curr = currency) => curr === 'USD' ? '$' : '₹';
  const handleCurrencyToggle = () => setCurrency(prev => prev === 'INR' ? 'USD' : 'INR');

  // ================================
  // BACKEND DATA FETCHING
  // ================================
  useEffect(() => {
    const fetchMainPoolItems = async () => {
      setLoadingMainPool(true);
      setApiError(null);
      try {
        const headers = getTenantAuthHeaders(navigate);
        const response = await fetch(`${API_BASE_URL}/admin/main_pool`, { headers });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setMainPoolItems(Array.isArray(data) ? data : []);
      } catch (error) {
        if (error.message === "AUTH_MISSING") return;
        console.error("Error fetching main pool items:", error);
        setApiError("Failed to load civil works data");
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
      setApiError(null);
      try {
        const headers = getTenantAuthHeaders(navigate);
        const response = await fetch(`${API_BASE_URL}/admin/jacuzzi_spa_mep_master`, { headers });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        let items = [];
        if (Array.isArray(data)) items = data;
        else if (data && data.items) items = data.items;
        else if (data && data.mep_items) items = data.mep_items;
        console.log("📦 MEP Items from backend:", items);
        setMepItems(items);
      } catch (error) {
        if (error.message === "AUTH_MISSING") return;
        console.error("Error fetching MEP items:", error);
        setApiError("Failed to load MEP data");
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

  const debugRateFlow = async () => {
    if (!dimensions.length || !dimensions.width || !dimensions.depth) {
      alert("Please enter dimensions first");
      return;
    }
    try {
      const headers = getTenantAuthHeaders(navigate);
      const response = await fetch(
        `${API_BASE_URL}/jacuzzi/debug/rate-flow/${dimensions.length}/${dimensions.width}/${dimensions.depth}?turnover=1.5`,
        { headers }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Debug endpoint failed: ${response.status}`);
      }
      const data = await response.json();
      console.log("🔍 Rate Flow Debug:", data);
      setDebugInfo(data);
      setShowDebug(true);
    } catch (error) {
      console.error("Debug error:", error);
      alert("Debug failed: " + error.message);
    }
  };

  // ================================
  // FETCH MEP CALCULATION WITH DYNAMIC RATES AND PIPING
  // ================================
  const fetchMepCalculation = async (distanceOverride = null) => {
    if (!dimensions.length || !dimensions.width || !dimensions.depth) {
      console.log("⚠️ Missing dimensions, skipping MEP calculation");
      return;
    }

    setMepQuantities({});
    setCivilQuantities({});
    setLoadingMepCalculation(true);
    setApiError(null);

    const distanceToUse = distanceOverride !== null ? distanceOverride : pumpRoomDistance;

    try {
      const headers = getTenantAuthHeaders(navigate);

      const requestBody = {
        length: dimensions.length,
        width: dimensions.width,
        depth: dimensions.depth,
        seating_capacity: seatingCapacity,
        water_jets: waterJets,
        air_jets: airJets,
        filter_type: "cartridge",
        dosing_required: false,
        heater_required: selectedAdvancedEquipment.includes(29),
        features: [],
        turnover: 1.5,
        update_database: updateDatabase,
        pump_room_distance: distanceToUse,
        piping_safety_factor: 1.1
      };

      console.log(`📡 Fetching MEP calculation with update_database=${updateDatabase}, pump_room_distance=${distanceToUse}m`, requestBody);

      const response = await fetch(`${API_BASE_URL}/jacuzzi/calculate-mep`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("📊 MEP Calculation Response:", data);

      if (!data.success) {
        setApiError(data.error || "MEP calculation failed");
        return;
      }

      // STORE CIVIL QUANTITIES
      if (data.civil_quantities) {
        console.log("✅ Setting Civil quantities from data.civil_quantities:", data.civil_quantities);
        setCivilQuantities(data.civil_quantities);
      }

      if (data.mep_quantities) {
        console.log("📦 Setting MEP quantities:", data.mep_quantities);
        setMepQuantities(data.mep_quantities);
      }

      if (data.piping_items) {
        console.log("🔧 Setting piping items:", data.piping_items.length, "items");
        setPipingItems(data.piping_items);
      }

      if (data.system_parameters) {
        // Calculate flowrate for template resolution
        const volume = dimensions.length * dimensions.width * dimensions.depth;
        const flowrate_m3 = volume / 1.5;

        setDynamicRates({
          filter_rate: data.system_parameters.filter_rate ?? 0,
          pump_rate: data.system_parameters.pump_rate ?? 0,
          filter_description: data.system_parameters.filter_description || "",
          pump_description: data.system_parameters.pump_description || "",
          source: data.system_parameters.rate_source || "no_match",
          exact_match: data.system_parameters.rate_source === "mep_rates_exact",
          hp_overridden: false,
          original_hp: null,
          hp_from_db: null,
          hp: data.system_parameters.pump_hp || data.system_parameters.hp,
          filter_dia: data.system_parameters.filter_dia_mm,
          flowrate_m3: flowrate_m3,
          database_updated: data.system_parameters.database_updated || false,
          rate_source_note: data.system_parameters.rate_source === "mep_rates_exact"
            ? "Rates from mep_rates table - saved"
            : data.system_parameters.rate_source === "mep_rates_closest"
              ? "Using closest match from mep_rates table"
              : "No match found - rates set to 0",
          jet_pump_rate: 52500,
          heater_rate: data.mep_quantities?.heater_rate || 0,
          last_updated: new Date().toISOString()
        });
      }

      if (data.pump_room_calculation) {
        console.log("🏗️ Setting pump room quantities:", data.pump_room_calculation);
        setPumpRoomQuantities(data.pump_room_calculation);
        setPumpRoomDimensions({
          length: data.pump_room_calculation.pr_length_2,
          width: data.pump_room_calculation.pr_width_2,
          height: data.pump_room_calculation.pr_height_2
        });
      }

      if (data.pump_room_quantities) {
        console.log("✅ Setting pump room quantities from data.pump_room_quantities:", data.pump_room_quantities);
        setPumpRoomQuantities(data.pump_room_quantities);
      }

      setResultData(prev => ({
        ...prev,
        ...data,
        piping_items: data.piping_items || [],
        civil_quantities: data.civil_quantities || prev?.civil_quantities || {}
      }));

    } catch (error) {
      if (error.message === "AUTH_MISSING") return;
      console.error("❌ Error fetching MEP calculation:", error);
      setApiError(`MEP calculation failed: ${error.message}`);
      alert(`MEP calculation failed: ${error.message}. Please check console for details.`);
    } finally {
      setLoadingMepCalculation(false);
    }
  };

  const handleDistanceSubmit = async () => {
    if (!dimensions.length || !dimensions.width || !dimensions.depth) {
      alert("Pool dimensions are required to update piping.");
      return;
    }
    setUpdatingDistance(true);
    try {
      await fetchMepCalculation(pumpRoomDistance);
    } catch (error) {
      console.error("❌ Distance update failed:", error);
      alert("Failed to update with new distance. Please try again.");
    } finally {
      setUpdatingDistance(false);
    }
  };

  useEffect(() => {
    const fetchTemplateDescriptions = async () => {
      if (dimensions && dimensions.length && dimensions.width && dimensions.depth) {
        try {
          const headers = getTenantAuthHeaders(navigate);
          const response = await fetch(
            `${API_BASE_URL}/jacuzzi/templates/${dimensions.length}/${dimensions.width}/${dimensions.depth}`,
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
  // EFFECT TO UPDATE DYNAMIC RATES FROM RESULTDATA (Initial Load)
  // ================================
  useEffect(() => {
    if (resultData && resultData.system_parameters) {
      const volume = dimensions.length * dimensions.width * dimensions.depth;
      const flowrate_m3 = volume / 1.5;

      setDynamicRates({
        filter_rate: resultData.system_parameters.filter_rate ?? 0,
        pump_rate: resultData.system_parameters.pump_rate ?? 0,
        filter_description: resultData.system_parameters.filter_description || "",
        pump_description: resultData.system_parameters.pump_description || "",
        source: resultData.system_parameters.rate_source || "no_match",
        exact_match: resultData.system_parameters.rate_source === "mep_rates_exact",
        hp_overridden: false,
        original_hp: null,
        hp_from_db: null,
        hp: resultData.system_parameters.pump_hp || resultData.system_parameters.hp,
        filter_dia: resultData.system_parameters.filter_dia_mm,
        flowrate_m3: flowrate_m3,
        database_updated: resultData.system_parameters.database_updated || false,
        rate_source_note: resultData.system_parameters.rate_source === "mep_rates_exact"
          ? "Rates from mep_rates table - saved"
          : resultData.system_parameters.rate_source === "mep_rates_closest"
            ? "Using closest match from mep_rates table"
            : "No match found - rates set to 0",
        jet_pump_rate: 52500,
        heater_rate: resultData.mep_quantities?.heater_rate || 0,
        last_updated: new Date().toISOString()
      });
    }
  }, [resultData]);

  useEffect(() => {
    if (dimensions?.length && dimensions?.width && dimensions?.depth) {
      fetchMepCalculation();
    }
  }, [
    dimensions.length,
    dimensions.width,
    dimensions.depth,
    seatingCapacity,
    waterJets,
    airJets,
    updateDatabase,
    pumpRoomDistance,
    selectedAdvancedEquipment
  ]);

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

  // ================================
  // DEBUG LOGGING
  // ================================
  useEffect(() => {
    if (Object.keys(civilQuantities).length > 0) {
      console.log("Civil Quantities updated:", civilQuantities);
      console.log("Excavation Split (Jacuzzi):", civilQuantities?.excavation_split);
      console.log("🔨 Shuttering Split:", civilQuantities?.shuttering_split);
      console.log("🔨 Shotcreting Split:", civilQuantities?.shotcreting_split);
    }
  }, [civilQuantities]);

  useEffect(() => {
    console.log("Pump Room Quantities:", pumpRoomQuantities);
  }, [pumpRoomQuantities]);

  // ================================
  // ✅ QUANTITY GETTER FUNCTIONS WITH EDITABLE STATE
  // ================================
  const getCivilQuantity = (slNo) => {
    // ✅ Check editable state first
    if (editableCivilQty[slNo] !== undefined) {
      return Number(editableCivilQty[slNo]);
    }

    const fieldName = MAIN_POOL_QTY_FIELDS[slNo];
    if (!fieldName) return 0;
    return Number(
      civilQuantities?.[fieldName] ??
      resultData?.civil_quantities?.[fieldName] ??
      0
    );
  };

  const getPumpRoomQuantity = (slNo) => {
    // ✅ Check editable state first
    if (editablePumpRoomQty[slNo] !== undefined) {
      return Number(editablePumpRoomQty[slNo]);
    }

    if (slNo > 12) return 0;
    const fieldName = PUMP_ROOM_QTY_FIELDS[slNo];
    if (!fieldName) return 0;
    return Number(
      pumpRoomQuantities?.[fieldName] ??
      resultData?.pump_room_quantities?.[fieldName] ??
      0
    );
  };

  // ================================
  // ✅ MEMOIZED TOTALS WITH EDITABLE STATE DEPENDENCIES
  // ================================

  // mainPoolTotal - uses sub-rows to avoid double counting
  const mainPoolTotal = useMemo(() => {
    if (!mainPoolItems.length) return 0;
    let total = 0;

    const excavationSplit = civilQuantities?.excavation_split || {};
    const shutteringSplit = civilQuantities?.shuttering_split || {};
    const shotcretingSplit = civilQuantities?.shotcreting_split || {};

    const excavationRates =
      civilQuantities?.excavation_rates ||
      resultData?.civil_quantities?.excavation_rates ||
      {};

    const civilItemsFromBackend = resultData?.civil_items || [];

    // Excavation subrow amounts
    const backendSubRow11 = civilItemsFromBackend.find(ci => String(ci.SlNo) === "1.1");
    const backendSubRow12 = civilItemsFromBackend.find(ci => String(ci.SlNo) === "1.2");
    const qty_1_1 = editableSubRowQty["1.1"] !== undefined 
      ? editableSubRowQty["1.1"]
      : Number(backendSubRow11?.Quantity ?? excavationSplit["1.1"] ?? 0);
    const rate_1_1 = Number(backendSubRow11?.Rate ?? excavationRates["1.1"] ?? 0);
    const qty_1_2 = editableSubRowQty["1.2"] !== undefined
      ? editableSubRowQty["1.2"]
      : Number(backendSubRow12?.Quantity ?? excavationSplit["1.2"] ?? 0);
    const rate_1_2 = Number(backendSubRow12?.Rate ?? excavationRates["1.2"] ?? 0);
    const amount_1_1 = qty_1_1 * rate_1_1;
    const amount_1_2 = qty_1_2 * rate_1_2;

    // Shuttering subrow amounts
    const backendSubRow91 = civilItemsFromBackend.find(ci => String(ci.SlNo) === "9.1");
    const backendSubRow92 = civilItemsFromBackend.find(ci => String(ci.SlNo) === "9.2");
    const qty_9_1 = editableSubRowQty["9.1"] !== undefined
      ? editableSubRowQty["9.1"]
      : Number(backendSubRow91?.Quantity ?? shutteringSplit["9.1"] ?? 0);
    const rate_9_1 = Number(backendSubRow91?.Rate ?? 0);
    const qty_9_2 = editableSubRowQty["9.2"] !== undefined
      ? editableSubRowQty["9.2"]
      : Number(backendSubRow92?.Quantity ?? shutteringSplit["9.2"] ?? 0);
    const rate_9_2 = Number(backendSubRow92?.Rate ?? 0);
    const amount_9_1 = qty_9_1 * rate_9_1;
    const amount_9_2 = qty_9_2 * rate_9_2;

    // Shotcreting subrow amounts
    const backendSubRow101 = civilItemsFromBackend.find(ci => String(ci.SlNo) === "10.1");
    const backendSubRow102 = civilItemsFromBackend.find(ci => String(ci.SlNo) === "10.2");
    const qty_10_1 = editableSubRowQty["10.1"] !== undefined
      ? editableSubRowQty["10.1"]
      : Number(backendSubRow101?.Quantity ?? shotcretingSplit["10.1"] ?? 0);
    const rate_10_1 = Number(backendSubRow101?.Rate ?? 0);
    const qty_10_2 = editableSubRowQty["10.2"] !== undefined
      ? editableSubRowQty["10.2"]
      : Number(backendSubRow102?.Quantity ?? shotcretingSplit["10.2"] ?? 0);
    const rate_10_2 = Number(backendSubRow102?.Rate ?? 0);
    const amount_10_1 = qty_10_1 * rate_10_1;
    const amount_10_2 = qty_10_2 * rate_10_2;

    mainPoolItems.forEach(item => {
      const slNo = item.SlNo;

      if (slNo === 1) {
        total += amount_1_1 + amount_1_2;
      } else if (slNo === 9) {
        total += amount_9_1 + amount_9_2;
      } else if (slNo === 10) {
        total += amount_10_1 + amount_10_2;
      } else if (MAIN_POOL_QTY_FIELDS[slNo]) {
        const quantity = getCivilQuantity(slNo);
        total += quantity * (item.Rate || 0);
      }
    });

    return total;
  }, [mainPoolItems, civilQuantities, resultData, editableCivilQty, editableSubRowQty]);

  const pumpRoomTotal = useMemo(() => {
    if (!includePumpRoom || !mainPoolItems.length) return 0;
    let total = 0;
    mainPoolItems.forEach(item => {
      if (PUMP_ROOM_QTY_FIELDS[item.SlNo]) {
        const quantity = getPumpRoomQuantity(item.SlNo);
        total += quantity * (item.Rate || 0);
      }
    });
    return total;
  }, [mainPoolItems, pumpRoomQuantities, includePumpRoom, resultData, editablePumpRoomQty]);

  const baseMepTotals = useMemo(() => {
    let totalSupply = 0;
    let totalInstallation = 0;
    if (!filteredMepItems.length) return { totalSupply: 0, totalInstallation: 0, grand: 0 };
    filteredMepItems.forEach(item => {
      if (item.SlNo === 29) return;
      const quantity = getMepQuantity(item);
      totalSupply += quantity * getSupplyRate(item);
      totalInstallation += quantity * getInstallationRate(item);
    });
    return { totalSupply, totalInstallation, grand: totalSupply + totalInstallation };
  }, [filteredMepItems, mepQuantities, resultData, dynamicRates, editableMepQty]);

  const baseMepTotal = baseMepTotals.grand;

  const advancedEquipmentTotals = useMemo(() => {
    let totalSupply = 0;
    let totalInstallation = 0;
    if (!filteredMepItems.length) return { totalSupply: 0, totalInstallation: 0, grand: 0 };
    filteredMepItems.forEach(item => {
      if (item.SlNo === 29 && selectedAdvancedEquipment.includes(29)) {
        totalSupply += getSupplyRate(item);
        totalInstallation += getInstallationRate(item);
      }
    });
    return { totalSupply, totalInstallation, grand: totalSupply + totalInstallation };
  }, [filteredMepItems, selectedAdvancedEquipment, dynamicRates]);

  const advancedEquipmentTotal = advancedEquipmentTotals.grand;

  const totalMepCost = useMemo(() => baseMepTotal + advancedEquipmentTotal, [baseMepTotal, advancedEquipmentTotal]);

  const grandTotal = useMemo(() => {
    return (mainPoolTotal || 0) + (pumpRoomTotal || 0) + (totalMepCost || 0) + (pipingTotals || 0);
  }, [mainPoolTotal, pumpRoomTotal, totalMepCost, pipingTotals]);

  useEffect(() => {
    console.log("💰 TOTAL DEBUG:", {
      mainPoolTotal,
      pumpRoomTotal,
      totalMepCost,
      pipingTotals,
      grandTotal,
      mepQuantities,
      civilQuantities,
      excavationSplit: civilQuantities?.excavation_split,
      shutteringSplit: civilQuantities?.shuttering_split,
      shotcretingSplit: civilQuantities?.shotcreting_split,
      resultData,
      loadingMepCalculation
    });
  }, [mainPoolTotal, pumpRoomTotal, totalMepCost, pipingTotals, grandTotal]);

  const getFinalTotal = () => {
    const gstAmount = grandTotal * 0.18;
    return grandTotal + gstAmount;
  };

  // ================================
  // PREPARE DATA FOR SAVE PROJECT
  // ================================
  const resultDataForSave = {
    project_type: "jacuzzi",
    main_pool_total: mainPoolTotal,
    pump_room_total: hasBalancingTank ? balanceTankItems?.length || 0 : 0,
    balance_tank_total: 0,
    mep_total: totalMepCost,
    piping_total: pipingTotals,
    working_days: resultData?.working_days || 0,
    pool_specification: {
      length: dimensions?.length || 0,
      width: dimensions?.width || 0,
      depth: dimensions?.depth || 0,
      volume: resultData?.volume || 0,
      flow_rate: resultData?.flow_rate || 0,
      seating_capacity: seatingCapacity,
      water_jets: waterJets,
      air_jets: airJets
    },
    system_settings: {
      construction_type: constructionType,
      include_pump_room: includePumpRoom,
      has_balancing_tank: hasBalancingTank,
      pump_room_distance: pumpRoomDistance,
      safety_factor: 1.1
    },
    totals: {
      subtotal: grandTotal,
      gst: grandTotal * 0.18,
      final_total: getFinalTotal()
    }
  };

  // ================================
  // UI COMPONENTS
  // ================================
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
        {loadingExchangeRate ? (
          <div className="rate-loading_1">
            <span className="loading-spinner-small_1"></span>
            Loading exchange rate...
          </div>
        ) : (
          <>
            <div className="rate-display_1">
              <span className="rate-value_1">1 USD = {safeToFixed(exchangeRate, 2)} INR</span>
            </div>
            {lastExchangeUpdate && (
              <div className="rate-meta_1">
                <span className="rate-update-time_1">Updated: {lastExchangeUpdate.toLocaleTimeString()}</span>
                {exchangeRateError && <span className="rate-error_1" title={exchangeRateError}>⚠️ Using fallback rate</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const ConstructionTypeDisplay = () => (
    <div className="pool-type-display">
      <div className={`pool-type-badge ${constructionType}`}>
        {constructionType === "terrace" ? (
          <><span className="pool-type-icon">🏢</span>Terrace Jacuzzi</>
        ) : (
          <><span className="pool-type-icon">⛰️</span>In-Ground Jacuzzi</>
        )}
      </div>
    </div>
  );

  const DatabaseUpdateToggle = () => (
    <div className="database-update-toggle">
      <label className="toggle-label">
        <input type="checkbox" checked={updateDatabase} onChange={(e) => setUpdateDatabase(e.target.checked)} className="toggle-checkbox" />
      </label>
      {dynamicRates.database_updated && (
        <span className="update-success-badge">✓ Rates saved</span>
      )}
    </div>
  );

  const DebugButton = () => (
    <button className="debug-button" onClick={debugRateFlow} title="Debug rate flow">
      🔍 Debug Rates
    </button>
  );

  const DebugModal = () => {
    if (!showDebug || !debugInfo) return null;
    return (
      <div className="debug-modal-overlay" onClick={() => setShowDebug(false)}>
        <div className="debug-modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>Rate Flow Debug Info</h3>
          <button className="debug-modal-close" onClick={() => setShowDebug(false)}>×</button>
          <div className="debug-section">
            <h4>Dimensions</h4>
            <pre>{JSON.stringify(debugInfo.dimensions, null, 2)}</pre>
          </div>
          <div className="debug-section">
            <h4>Data.json Selection</h4>
            <pre>{JSON.stringify(debugInfo.data_json, null, 2)}</pre>
          </div>
          <div className="debug-section">
            <h4>mep_rates Table</h4>
            <p>Exact match found: {debugInfo.mep_rates?.exact_match_found ? '✅' : '❌'}</p>
            <pre>{JSON.stringify(debugInfo.mep_rates, null, 2)}</pre>
          </div>
          <div className="debug-section">
            <h4>Diagnosis</h4>
            <p><strong>Issue:</strong> {debugInfo.diagnosis?.issue}</p>
            <p><strong>Next Steps:</strong></p>
            <ul>{debugInfo.diagnosis?.next_steps?.map((step, i) => <li key={i}>{step}</li>)}</ul>
          </div>
        </div>
      </div>
    );
  };

  const ColumnVisibilityControls = () => (
    <div className="column-visibility-controls_1">
      <div className="visibility-header">
        <span className="visibility-title">Column Visibility:</span>
        <button className="reset-visibility-btn" onClick={resetColumnVisibility} title="Reset all columns to visible">Reset All</button>
      </div>
      <div className="visibility-checkboxes">
        {[
          { key: 'image', label: 'Image' },
          { key: 'unit', label: 'Unit' },
          { key: 'qty', label: 'QTY' },
          { key: 'fixedRate', label: 'Fixed Rate' },
          { key: 'code', label: 'Code' },
          { key: 'remarks', label: 'Remarks' },
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
          <input type="checkbox" checked={selectedTables.mainPool} onChange={() => toggleTableSelection('mainPool')} />
          <span className="checkbox-label">Civil Works</span>
          <span className="table-count">(14 items)</span>
        </label>
        <label className="selection-checkbox">
          <input type="checkbox" checked={selectedTables.pumpRoom} onChange={() => toggleTableSelection('pumpRoom')} />
          <span className="checkbox-label">Pump Room</span>
          <span className="table-count">(12 items)</span>
        </label>
        <label className="selection-checkbox">
          <input type="checkbox" checked={selectedTables.mep} onChange={() => toggleTableSelection('mep')} />
          <span className="checkbox-label">MEP Systems</span>
          <span className="table-count">({filteredMepItems.length} items)</span>
        </label>
        <label className="selection-checkbox">
          <input type="checkbox" checked={selectedTables.piping} onChange={() => toggleTableSelection('piping')} />
          <span className="checkbox-label">Piping System</span>
          <span className="table-count">({pipingItemsFromResult.length} items)</span>
        </label>
      </div>
    </div>
  );

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

  const calculateMepColSpan = (hasSelectColumn) => {
    let colSpan = 1;
    if (hasSelectColumn) colSpan++;
    if (columnVisibility.code) colSpan++;
    colSpan++;
    if (columnVisibility.image) colSpan++;
    if (columnVisibility.unit) colSpan++;
    if (columnVisibility.qty) colSpan++;
    if (columnVisibility.fixedRate) colSpan += 2;
    colSpan += 3;
    return colSpan;
  };

  // ================================
  // ✅ RENDER MAIN POOL TABLE - WITH EDITABLE QTY + SUBROWS
  // ================================
  const renderMainPoolTable = () => {
    if (!mainPoolItems.length) {
      return <div className="no-data-message">No civil works data available.</div>;
    }

    const excavationSplit = civilQuantities?.excavation_split || {};
    const shutteringSplit = civilQuantities?.shuttering_split || {};
    const shotcretingSplit = civilQuantities?.shotcreting_split || {};

    const civilItemsFromBackend = resultData?.civil_items || [];

    // Excavation subrows
    const backendSubRow11 = civilItemsFromBackend.find(ci => String(ci.SlNo) === "1.1");
    const backendSubRow12 = civilItemsFromBackend.find(ci => String(ci.SlNo) === "1.2");

    // Shuttering subrows
    const backendSubRow91 = civilItemsFromBackend.find(ci => String(ci.SlNo) === "9.1");
    const backendSubRow92 = civilItemsFromBackend.find(ci => String(ci.SlNo) === "9.2");

    // Shotcreting subrows
    const backendSubRow101 = civilItemsFromBackend.find(ci => String(ci.SlNo) === "10.1");
    const backendSubRow102 = civilItemsFromBackend.find(ci => String(ci.SlNo) === "10.2");

    // Excavation values
    const rate_1_1 = backendSubRow11?.Rate ?? excavationSplit["1.1"]?.rate ?? 0;
    const rate_1_2 = backendSubRow12?.Rate ?? excavationSplit["1.2"]?.rate ?? 0;
    const qty_1_1 = editableSubRowQty["1.1"] !== undefined 
      ? editableSubRowQty["1.1"]
      : (backendSubRow11?.Quantity ?? excavationSplit["1.1"]?.qty ?? excavationSplit["1.1"] ?? 0);
    const qty_1_2 = editableSubRowQty["1.2"] !== undefined
      ? editableSubRowQty["1.2"]
      : (backendSubRow12?.Quantity ?? excavationSplit["1.2"]?.qty ?? excavationSplit["1.2"] ?? 0);
    const amount_1_1 = Number(qty_1_1) * Number(rate_1_1);
    const amount_1_2 = Number(qty_1_2) * Number(rate_1_2);
    const desc_1_1 = backendSubRow11?.Description ?? "Earth Excavation up to 1.5m depth";
    const desc_1_2 = backendSubRow12?.Description ?? "Earth Excavation beyond 1.5m depth";

    // Shuttering values
    const qty_9_1 = editableSubRowQty["9.1"] !== undefined
      ? editableSubRowQty["9.1"]
      : (backendSubRow91?.Quantity ?? shutteringSplit["9.1"] ?? 0);
    const qty_9_2 = editableSubRowQty["9.2"] !== undefined
      ? editableSubRowQty["9.2"]
      : (backendSubRow92?.Quantity ?? shutteringSplit["9.2"] ?? 0);
    const rate_9_1 = backendSubRow91?.Rate ?? 0;
    const rate_9_2 = backendSubRow92?.Rate ?? 0;
    const amount_9_1 = Number(qty_9_1) * Number(rate_9_1);
    const amount_9_2 = Number(qty_9_2) * Number(rate_9_2);
    const desc_9_1 = backendSubRow91?.Description ?? "Retaining wall";
    const desc_9_2 = backendSubRow92?.Description ?? "raft";

    // Shotcreting values
    const qty_10_1 = editableSubRowQty["10.1"] !== undefined
      ? editableSubRowQty["10.1"]
      : (backendSubRow101?.Quantity ?? shotcretingSplit["10.1"] ?? 0);
    const qty_10_2 = editableSubRowQty["10.2"] !== undefined
      ? editableSubRowQty["10.2"]
      : (backendSubRow102?.Quantity ?? shotcretingSplit["10.2"] ?? 0);
    const rate_10_1 = backendSubRow101?.Rate ?? 0;
    const rate_10_2 = backendSubRow102?.Rate ?? 0;
    const amount_10_1 = Number(qty_10_1) * Number(rate_10_1);
    const amount_10_2 = Number(qty_10_2) * Number(rate_10_2);
    const desc_10_1 = backendSubRow101?.Description ?? "Retaining wall";
    const desc_10_2 = backendSubRow102?.Description ?? "Raft";

    const totalExcavationQty = getCivilQuantity(1);
    const totalShutteringQty = getCivilQuantity(9);
    const totalShotcretingQty = getCivilQuantity(10);

    const filteredItems = mainPoolItems
      .filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo])
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
            {filteredItems.map((item) => {
              const slNo = item.SlNo;

              // EXCAVATION (SlNo 1) - Parent + Subrows
              if (slNo === 1) {
                return (
                  <React.Fragment key={slNo}>
                    <tr className="main-row">
                      <td data-label="Sl.No"><strong>{slNo}</strong></td>
                      {columnVisibility.code && <td data-label="Code">{item.Code || ""}</td>}
                      <td data-label="Description" className="description-cell">
                        <strong>{getDescriptionWithTemplate(item)}</strong>
                        <div className="excavation-note">
                          <small>Total Excavation: {safeToFixed(totalExcavationQty, 3)} m³</small>
                        </div>
                      </td>
                      {columnVisibility.image && (
                        <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>
                      )}
                      {columnVisibility.unit && <td data-label="Unit"><strong>{item.Unit || "CuM"}</strong></td>}
                      {columnVisibility.qty && <td data-label="QTY">—</td>}
                      {columnVisibility.fixedRate && <td data-label="Fixed Rate">—</td>}
                      <td data-label="Amount" className="amount-cell">—</td>
                      {columnVisibility.remarks && (
                        <td data-label="Remarks" className="remarks-cell">
                          <textarea
                            className="remarks-textbox"
                            placeholder="Add remarks..."
                            value={mainPoolRemarks[slNo] || ""}
                            onChange={(e) => setMainPoolRemarks(prev => ({ ...prev, [slNo]: e.target.value }))}
                            rows="2"
                          />
                        </td>
                      )}
                    </tr>

                    <tr className="sub-row">
                      <td data-label="Sl.No" style={{ paddingLeft: "20px" }}>1.1</td>
                      {columnVisibility.code && <td data-label="Code"></td>}
                      <td data-label="Description" style={{ paddingLeft: "40px" }}>{desc_1_1}</td>
                      {columnVisibility.image && <td data-label="Image"></td>}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || "CuM"}</td>}
                      {columnVisibility.qty && (
                        <td data-label="QTY" className={Number(qty_1_1) > 0 ? "quantity-filled" : "quantity-zero"}>
                          <input
                            type="number"
                            step="0.001"
                            value={qty_1_1}
                            onChange={(e) => handleQtyChange("subrow", "1.1", e.target.value)}
                            className="qty-input subrow-input"
                          />
                        </td>
                      )}
                      {columnVisibility.fixedRate && (
                        <td data-label="Fixed Rate">{formatCurrency(rate_1_1)}</td>
                      )}
                      <td data-label="Amount" className="amount-cell">
                        {formatCurrency(amount_1_1)}
                      </td>
                      {columnVisibility.remarks && <td data-label="Remarks"></td>}
                    </tr>

                    <tr className="sub-row">
                      <td data-label="Sl.No" style={{ paddingLeft: "20px" }}>1.2</td>
                      {columnVisibility.code && <td data-label="Code"></td>}
                      <td data-label="Description" style={{ paddingLeft: "40px" }}>{desc_1_2}</td>
                      {columnVisibility.image && <td data-label="Image"></td>}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || "CuM"}</td>}
                      {columnVisibility.qty && (
                        <td data-label="QTY" className={Number(qty_1_2) > 0 ? "quantity-filled" : "quantity-zero"}>
                          <input
                            type="number"
                            step="0.001"
                            value={qty_1_2}
                            onChange={(e) => handleQtyChange("subrow", "1.2", e.target.value)}
                            className="qty-input subrow-input"
                          />
                        </td>
                      )}
                      {columnVisibility.fixedRate && (
                        <td data-label="Fixed Rate">{formatCurrency(rate_1_2)}</td>
                      )}
                      <td data-label="Amount" className="amount-cell">
                        {formatCurrency(amount_1_2)}
                      </td>
                      {columnVisibility.remarks && <td data-label="Remarks"></td>}
                    </tr>
                  </React.Fragment>
                );
              }

              // SHUTTERING (SlNo 9) - Parent + Subrows
              if (slNo === 9) {
                return (
                  <React.Fragment key={slNo}>
                    <tr className="main-row">
                      <td data-label="Sl.No"><strong>{slNo}</strong></td>
                      {columnVisibility.code && <td data-label="Code">{item.Code || ""}</td>}
                      <td data-label="Description" className="description-cell">
                        <strong>{getDescriptionWithTemplate(item)}</strong>
                        <div className="excavation-note">
                          <small>Total Shuttering: {safeToFixed(totalShutteringQty, 3)} SqM</small>
                        </div>
                      </td>
                      {columnVisibility.image && (
                        <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>
                      )}
                      {columnVisibility.unit && <td data-label="Unit"><strong>{item.Unit || "SqM"}</strong></td>}
                      {columnVisibility.qty && <td data-label="QTY">—</td>}
                      {columnVisibility.fixedRate && <td data-label="Fixed Rate">—</td>}
                      <td data-label="Amount" className="amount-cell">—</td>
                      {columnVisibility.remarks && (
                        <td data-label="Remarks" className="remarks-cell">
                          <textarea
                            className="remarks-textbox"
                            placeholder="Add remarks..."
                            value={mainPoolRemarks[slNo] || ""}
                            onChange={(e) => setMainPoolRemarks(prev => ({ ...prev, [slNo]: e.target.value }))}
                            rows="2"
                          />
                        </td>
                      )}
                    </tr>

                    <tr className="sub-row">
                      <td data-label="Sl.No" style={{ paddingLeft: "20px" }}>9.1</td>
                      {columnVisibility.code && <td data-label="Code"></td>}
                      <td data-label="Description" style={{ paddingLeft: "40px" }}>{desc_9_1}</td>
                      {columnVisibility.image && <td data-label="Image"></td>}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || "SqM"}</td>}
                      {columnVisibility.qty && (
                        <td data-label="QTY" className={Number(qty_9_1) > 0 ? "quantity-filled" : "quantity-zero"}>
                          <input
                            type="number"
                            step="0.001"
                            value={qty_9_1}
                            onChange={(e) => handleQtyChange("subrow", "9.1", e.target.value)}
                            className="qty-input subrow-input"
                          />
                        </td>
                      )}
                      {columnVisibility.fixedRate && (
                        <td data-label="Fixed Rate">{formatCurrency(rate_9_1)}</td>
                      )}
                      <td data-label="Amount" className="amount-cell">
                        {formatCurrency(amount_9_1)}
                      </td>
                      {columnVisibility.remarks && <td data-label="Remarks"></td>}
                    </tr>

                    <tr className="sub-row">
                      <td data-label="Sl.No" style={{ paddingLeft: "20px" }}>9.2</td>
                      {columnVisibility.code && <td data-label="Code"></td>}
                      <td data-label="Description" style={{ paddingLeft: "40px" }}>{desc_9_2}</td>
                      {columnVisibility.image && <td data-label="Image"></td>}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || "SqM"}</td>}
                      {columnVisibility.qty && (
                        <td data-label="QTY" className={Number(qty_9_2) > 0 ? "quantity-filled" : "quantity-zero"}>
                          <input
                            type="number"
                            step="0.001"
                            value={qty_9_2}
                            onChange={(e) => handleQtyChange("subrow", "9.2", e.target.value)}
                            className="qty-input subrow-input"
                          />
                        </td>
                      )}
                      {columnVisibility.fixedRate && (
                        <td data-label="Fixed Rate">{formatCurrency(rate_9_2)}</td>
                      )}
                      <td data-label="Amount" className="amount-cell">
                        {formatCurrency(amount_9_2)}
                      </td>
                      {columnVisibility.remarks && <td data-label="Remarks"></td>}
                    </tr>
                  </React.Fragment>
                );
              }

              // SHOTCRETING (SlNo 10) - Parent + Subrows
              if (slNo === 10) {
                return (
                  <React.Fragment key={slNo}>
                    <tr className="main-row">
                      <td data-label="Sl.No"><strong>{slNo}</strong></td>
                      {columnVisibility.code && <td data-label="Code">{item.Code || ""}</td>}
                      <td data-label="Description" className="description-cell">
                        <strong>{getDescriptionWithTemplate(item)}</strong>
                        <div className="excavation-note">
                          <small>Total Shotcreting: {safeToFixed(totalShotcretingQty, 3)} CuM</small>
                        </div>
                      </td>
                      {columnVisibility.image && (
                        <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>
                      )}
                      {columnVisibility.unit && <td data-label="Unit"><strong>{item.Unit || "CuM"}</strong></td>}
                      {columnVisibility.qty && <td data-label="QTY">—</td>}
                      {columnVisibility.fixedRate && <td data-label="Fixed Rate">—</td>}
                      <td data-label="Amount" className="amount-cell">—</td>
                      {columnVisibility.remarks && (
                        <td data-label="Remarks" className="remarks-cell">
                          <textarea
                            className="remarks-textbox"
                            placeholder="Add remarks..."
                            value={mainPoolRemarks[slNo] || ""}
                            onChange={(e) => setMainPoolRemarks(prev => ({ ...prev, [slNo]: e.target.value }))}
                            rows="2"
                          />
                        </td>
                      )}
                    </tr>

                    <tr className="sub-row">
                      <td data-label="Sl.No" style={{ paddingLeft: "20px" }}>10.1</td>
                      {columnVisibility.code && <td data-label="Code"></td>}
                      <td data-label="Description" style={{ paddingLeft: "40px" }}>{desc_10_1}</td>
                      {columnVisibility.image && <td data-label="Image"></td>}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || "CuM"}</td>}
                      {columnVisibility.qty && (
                        <td data-label="QTY" className={Number(qty_10_1) > 0 ? "quantity-filled" : "quantity-zero"}>
                          <input
                            type="number"
                            step="0.001"
                            value={qty_10_1}
                            onChange={(e) => handleQtyChange("subrow", "10.1", e.target.value)}
                            className="qty-input subrow-input"
                          />
                        </td>
                      )}
                      {columnVisibility.fixedRate && (
                        <td data-label="Fixed Rate">{formatCurrency(rate_10_1)}</td>
                      )}
                      <td data-label="Amount" className="amount-cell">
                        {formatCurrency(amount_10_1)}
                      </td>
                      {columnVisibility.remarks && <td data-label="Remarks"></td>}
                    </tr>

                    <tr className="sub-row">
                      <td data-label="Sl.No" style={{ paddingLeft: "20px" }}>10.2</td>
                      {columnVisibility.code && <td data-label="Code"></td>}
                      <td data-label="Description" style={{ paddingLeft: "40px" }}>{desc_10_2}</td>
                      {columnVisibility.image && <td data-label="Image"></td>}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || "CuM"}</td>}
                      {columnVisibility.qty && (
                        <td data-label="QTY" className={Number(qty_10_2) > 0 ? "quantity-filled" : "quantity-zero"}>
                          <input
                            type="number"
                            step="0.001"
                            value={qty_10_2}
                            onChange={(e) => handleQtyChange("subrow", "10.2", e.target.value)}
                            className="qty-input subrow-input"
                          />
                        </td>
                      )}
                      {columnVisibility.fixedRate && (
                        <td data-label="Fixed Rate">{formatCurrency(rate_10_2)}</td>
                      )}
                      <td data-label="Amount" className="amount-cell">
                        {formatCurrency(amount_10_2)}
                      </td>
                      {columnVisibility.remarks && <td data-label="Remarks"></td>}
                    </tr>
                  </React.Fragment>
                );
              }

              // Regular items (2-8, 11-14)
              const quantity = getCivilQuantity(slNo);
              const rate = item.Rate || 0;
              const amount = quantity * rate;
              const isNewItem = slNo === 3 || slNo === 4;

              return (
                <tr key={slNo} style={isNewItem ? { background: "rgba(34,197,94,0.04)" } : {}}>
                  <td data-label="Sl.No">{slNo}</td>
                  {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                  <td data-label="Description" className="description-cell">
                    {getDescriptionWithTemplate(item)}
                    {isNewItem && <span style={{ marginLeft: "8px", fontSize: "10px", color: "#4ade80", fontStyle: "italic" }}>🆕 New</span>}
                    {constructionType === "terrace" && slNo <= 5 && (
                      <div className="terrace-note-badge">
                        <small>🏢 Terrace: 0 quantity</small>
                      </div>
                    )}
                  </td>
                  {columnVisibility.image && (
                    <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>
                  )}
                  {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                  {columnVisibility.qty && (
                    <td data-label="QTY" className={quantity ? "quantity-filled" : "quantity-zero"}>
                      <input
                        type="number"
                        step="0.001"
                        value={quantity}
                        onChange={(e) => handleQtyChange("civil", slNo, e.target.value)}
                        className="qty-input"
                      />
                    </td>
                  )}
                  {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(rate)}</td>}
                  <td data-label="Amount" className="amount-cell">{formatCurrency(amount)}</td>
                  {columnVisibility.remarks && (
                    <td data-label="Remarks" className="remarks-cell">
                      <textarea
                        className="remarks-textbox"
                        placeholder="Add remarks..."
                        value={mainPoolRemarks[slNo] || ""}
                        onChange={(e) => setMainPoolRemarks(prev => ({ ...prev, [slNo]: e.target.value }))}
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
  // ✅ RENDER PUMP ROOM TABLE WITH EDITABLE QTY
  // ================================
  const renderPumpRoomTable = () => {
    if (!includePumpRoom) {
      return (
        <div className="pump-room-disabled-message">
          <div className="info-message">
            <span className="info-icon">ℹ️</span>
            Pump Room calculation is currently disabled.
          </div>
        </div>
      );
    }

    if (!mainPoolItems.length) {
      return <div className="no-data-message">No pump room data available.</div>;
    }

    const filteredItems = mainPoolItems
      .filter(item => PUMP_ROOM_QTY_FIELDS[item.SlNo])
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
            {filteredItems.map((item) => {
              const slNo = item.SlNo;
              const quantity = getPumpRoomQuantity(slNo);
              const rate = item.Rate || 0;
              const amount = quantity * rate;
              const isNewItem = slNo === 3 || slNo === 4;

              return (
                <tr key={slNo} style={isNewItem ? { background: "rgba(34,197,94,0.04)" } : {}}>
                  <td data-label="Sl.No">{slNo}</td>
                  {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                  <td data-label="Description" className="description-cell">
                    {getDescriptionWithTemplate(item)}
                    <div className="pump-room-badge">
                      <small>Pump Room (15% of Jacuzzi)</small>
                    </div>
                    {isNewItem && <span style={{ marginLeft: "8px", fontSize: "10px", color: "#4ade80", fontStyle: "italic" }}>🆕</span>}
                    {constructionType === "terrace" && slNo <= 5 && (
                      <div className="terrace-pump-note">
                        <small>🏢 Terrace: 0 quantity</small>
                      </div>
                    )}
                  </td>
                  {columnVisibility.image && (
                    <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>
                  )}
                  {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                  {columnVisibility.qty && (
                    <td data-label="QTY" className={quantity ? "quantity-filled" : "quantity-zero"}>
                      <input
                        type="number"
                        step="0.001"
                        value={quantity}
                        onChange={(e) => handleQtyChange("pump", slNo, e.target.value)}
                        className="qty-input"
                      />
                    </td>
                  )}
                  {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(rate)}</td>}
                  <td data-label="Amount" className="amount-cell">{formatCurrency(amount)}</td>
                  {columnVisibility.remarks && (
                    <td data-label="Remarks" className="remarks-cell">
                      <textarea
                        className="remarks-textbox"
                        placeholder="Add remarks..."
                        value={pumpRoomRemarks[slNo] || ""}
                        onChange={(e) => setPumpRoomRemarks(prev => ({ ...prev, [slNo]: e.target.value }))}
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
  // ✅ RENDER MEP TABLE WITH EDITABLE QTY
  // ================================
  const renderMepTable = () => {
    if (!filteredMepItems.length) {
      return <div className="no-data-message">No MEP data available.</div>;
    }

    const baseItems = filteredMepItems.filter(item => item.SlNo >= 1 && item.SlNo <= 28);
    const advancedItems = filteredMepItems.filter(item => item.SlNo === 29);

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
          <h3 className="mep-table-title">Base MEP Systems (Items 1-28)</h3>
          <div className="table-container">
            <table className="excel-preview-table responsive-table">
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
                  <th>Supply</th>
                  <th>Installation</th>
                  <th>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {baseItems.map((item) => {
                  const quantity = getMepQuantity(item);
                  const supplyRate = getSupplyRate(item);
                  const installationRate = getInstallationRate(item);
                  const supplyCost = getSupplyCost(item, quantity);
                  const installationCost = getInstallationCost(item, quantity);
                  const totalAmount = getRowTotal(item, quantity);
                  const isZeroQuantity = quantity === 0;
                  const isJetPump = item.SlNo === 28;
                  const isJetSystem = item.SlNo === 26;
                  const isAirController = item.SlNo === 27;

                  // ✅ Use getResolvedMepDescription which now handles {{placeholders}}
                  const resolvedDescription = getResolvedMepDescription(item.SlNo, item);

                  return (
                    <tr key={item.SlNo} className={isZeroQuantity ? 'zero-quantity-row' : ''}>
                      <td data-label="Sl.No">{item.SlNo}</td>
                      {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                      <td data-label="Description" className="description-cell">
                        <div className="main-description">{resolvedDescription}</div>
                        {isJetPump && <div className="jet-pump-badge"><small>💧 Jet Pump (Fixed rate: ₹52,500)</small></div>}
                        {isJetSystem && <div className="jet-system-badge"><small>💦 Jet System ({quantity} jets)</small></div>}
                        {isAirController && <div className="air-controller-badge"><small>🌊 Air Controller ({quantity} units)</small></div>}
                        {(Number(item.SlNo) === 1 || Number(item.SlNo) === 7) && dynamicRates.exact_match && (
                          <small style={{ display: 'block', marginTop: '4px', color: '#4ade80', fontSize: '11px' }}>
                            ✅ Exact match from mep_rates table
                          </small>
                        )}
                      </td>
                      {columnVisibility.image && (
                        <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>
                      )}
                      {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                      {columnVisibility.qty && (
                        <td data-label="QTY" className={quantity ? "quantity-filled" : "quantity-zero"}>
                          <input
                            type="number"
                            step="0.001"
                            value={quantity}
                            onChange={(e) => handleQtyChange("mep", item.SlNo, e.target.value)}
                            className="qty-input"
                          />
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
                  <td colSpan={getVisibleColumnCount() - 3} style={{ textAlign: 'right', fontWeight: 'bold' }}>Subtotal:</td>
                  <td className="amount-cell" style={{ fontWeight: 'bold' }}>{formatCurrency(baseMepTotals.totalSupply)}</td>
                  <td className="amount-cell" style={{ fontWeight: 'bold' }}>{formatCurrency(baseMepTotals.totalInstallation)}</td>
                  <td className="amount-cell" style={{ fontWeight: 'bold' }}>{formatCurrency(baseMepTotals.grand)}</td>
                  {columnVisibility.remarks && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="mep-table-section">
          <div className="mep-table-header">
            <h3 className="mep-table-title">Heat Pump (Item 29) - Optional</h3>
            <div className="advanced-equipment-controls">
              <button className="select-all-btn" onClick={handleSelectAllAdvanced}>
                {selectedAdvancedEquipment.includes(29) ? "Deselect" : "Select"}
              </button>
              <span className="selection-info">
                {selectedAdvancedEquipment.includes(29) ? "✓ Selected" : "✗ Not Selected"}
              </span>
            </div>
          </div>
          <div className="table-container">
            <table className="excel-preview-table responsive-table">
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
                      <td>
                        <input type="checkbox" checked={isSelected} onChange={() => handleAdvancedEquipmentToggle(item.SlNo)} />
                      </td>
                      <td data-label="Sl.No">{item.SlNo}</td>
                      {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                      <td data-label="Description" className="description-cell">{item.Description || "N/A"}</td>
                      {columnVisibility.image && (
                        <td data-label="Image" className="image-cell">{item.Image ? renderImage(item.Image) : "-"}</td>
                      )}
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
                  <td colSpan={calculateMepColSpan(true) - 3} style={{ textAlign: 'right', fontWeight: 'bold' }}>Subtotal:</td>
                  <td className="amount-cell" style={{ fontWeight: 'bold' }}>{formatCurrency(advancedEquipmentTotals.totalSupply)}</td>
                  <td className="amount-cell" style={{ fontWeight: 'bold' }}>{formatCurrency(advancedEquipmentTotals.totalInstallation)}</td>
                  <td className="amount-cell" style={{ fontWeight: 'bold' }}>{formatCurrency(advancedEquipmentTotals.grand)}</td>
                  {columnVisibility.remarks && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="advanced-equipment-info">
            <div className="info-box">
              <span className="info-icon">🔥</span>
              <p>
                <strong>Heat Pump Note:</strong> Heat Pump is optional. When selected, it will be included in the total cost and in downloaded reports. Quantity is fixed at 1 per selected item.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  };

  // ================================
  // ✅ RENDER PIPING TABLE WITH EDITABLE QTY
  // ================================
  const renderPipingTable = () => {
    if (!selectedTables.piping) {
      return (
        <div className="no-data-message">
          Piping table is deselected for export. Use the Table Selection controls above to enable.
        </div>
      );
    }

    if (loadingMepCalculation) {
      return (
        <div className="loading-spinner">
          Loading piping data with distance: {pumpRoomDistance}m...
        </div>
      );
    }

    if (!pipingItemsFromResult || pipingItemsFromResult.length === 0) {
      return (
        <div className="no-data-message">
          <div className="info-message">
            <span className="info-icon">ℹ️</span>
            <strong>No piping items found for this Jacuzzi configuration.</strong>
          </div>
          <p>Distance: {pumpRoomDistance}m | Dimensions: {dimensions.length}×{dimensions.width}×{dimensions.depth}m</p>
          <p>Try adjusting the pump room distance to see if piping items appear.</p>
        </div>
      );
    }

    let totalSupply = 0;
    let totalInstallation = 0;
    let totalGrand = 0;

    const processedItems = pipingItemsFromResult.map((item, idx) => {
      const slNo = item.SlNo || idx + 1;
      const qty = editablePipingQty[slNo] !== undefined
        ? editablePipingQty[slNo]
        : (item.Quantity || item.quantity || 0);
      const rate = item.Rate || item.rate || 0;
      const supplyAmount = qty * rate;
      const installationAmount = supplyAmount * INSTALLATION_PERCENT;
      const totalAmount = supplyAmount + installationAmount;
      totalSupply += supplyAmount;
      totalInstallation += installationAmount;
      totalGrand += totalAmount;
      return {
        ...item,
        slNo: slNo,
        description: item.Description || item.description || "N/A",
        dia: item.Dia || item.dia || "-",
        quantity: qty,
        unit: item.Unit || item.unit || "Nos",
        rate: rate,
        supplyAmount,
        installationAmount,
        totalAmount,
        code: item.Code || item.code || "-",
        image: item.Image || item.image || null
      };
    });

    return (
      <div className="piping-system-section">
        <div className="section-header">
          <h2 className="section-title">Piping System - Jacuzzi/Spa</h2>
          <div className="header-controls">
            <div className="total-amount-box">
              <span className="total-label">Total Piping Cost:</span>
              <span className="total-value">{formatCurrency(totalGrand)}</span>
            </div>
            <div className="item-count-badge">{processedItems.length} items</div>
          </div>
        </div>

        <div className="piping-distance-input" style={{
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px",
          padding: "12px 15px", background: "rgba(99,179,237,0.08)", borderRadius: "8px",
          border: "1px solid rgba(99,179,237,0.2)"
        }}>
          <label style={{ fontWeight: "600", color: "#63b3ed" }}>Pump Room Distance (m):</label>
          <input
            type="number" min="1" step="1" value={pumpRoomDistance}
            onChange={(e) => setPumpRoomDistance(Number(e.target.value))}
            style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ccc", width: "100px", background: "#fff", color: "#333" }}
          />
          <button
            onClick={handleDistanceSubmit} disabled={updatingDistance}
            style={{ padding: "6px 12px", background: "#007bff", color: "#fff", border: "none", borderRadius: "6px", cursor: updatingDistance ? "not-allowed" : "pointer", opacity: updatingDistance ? 0.7 : 1 }}
          >
            {updatingDistance ? "Updating..." : "Update Piping"}
          </button>
          <div style={{ marginLeft: "auto", fontSize: "12px", color: "#888" }}>Current Distance: {pumpRoomDistance} m</div>
        </div>

        <div className="table-container">
          <table className="excel-preview-table responsive-table">
            <thead>
              <tr>
                <th rowSpan="2">Sl.No</th>
                {columnVisibility.code && <th rowSpan="2">Code</th>}
                <th rowSpan="2">Description</th>
                <th rowSpan="2">Dia (mm)</th>
                {columnVisibility.image && <th rowSpan="2">Image</th>}
                {columnVisibility.unit && <th rowSpan="2">Unit</th>}
                {columnVisibility.qty && <th rowSpan="2">QTY</th>}
                {columnVisibility.fixedRate && <th colSpan="2">Rate ({getCurrencySymbol()})</th>}
                <th colSpan="3">Amount ({getCurrencySymbol()})</th>
                {columnVisibility.remarks && <th rowSpan="2">Remarks</th>}
              </tr>
              <tr>
                {columnVisibility.fixedRate && (<><th>Supply</th><th>Installation</th></>)}
                <th>Supply</th>
                <th>Installation</th>
                <th>Grand Total</th>
              </tr>
            </thead>
            <tbody>
              {processedItems.map((item, idx) => (
                <tr key={idx} className={item.quantity === 0 ? 'zero-quantity-row' : ''}>
                  <td data-label="Sl.No">{item.slNo}</td>
                  {columnVisibility.code && <td data-label="Code">{item.code}</td>}
                  <td data-label="Description" className="description-cell">{item.description}</td>
                  <td data-label="Dia (mm)">{item.dia !== "-" && item.dia !== null ? `${item.dia} mm` : "-"}</td>
                  {columnVisibility.image && (
                    <td data-label="Image" className="image-cell">{item.image ? renderImage(item.image) : "-"}</td>
                  )}
                  {columnVisibility.unit && <td data-label="Unit">{item.unit}</td>}
                  {columnVisibility.qty && (
                    <td data-label="QTY" className={item.quantity ? "quantity-filled" : "quantity-zero"}>
                      <input
                        type="number"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => handleQtyChange("piping", item.slNo, e.target.value)}
                        className="qty-input"
                      />
                    </td>
                  )}
                  {columnVisibility.fixedRate && (
                    <>
                      <td data-label="Supply Rate">{formatCurrency(item.rate)}</td>
                      <td data-label="Installation Rate">{formatCurrency(item.rate * INSTALLATION_PERCENT)}</td>
                    </>
                  )}
                  <td data-label="Supply Cost">{formatCurrency(item.supplyAmount)}</td>
                  <td data-label="Installation Cost">{formatCurrency(item.installationAmount)}</td>
                  <td data-label="Total Amount" className="amount-cell">{formatCurrency(item.totalAmount)}</td>
                  {columnVisibility.remarks && (
                    <td data-label="Remarks" className="remarks-cell">
                      <textarea
                        className="remarks-textbox"
                        placeholder="Add remarks..."
                        value={mepRemarks[`piping_${item.slNo}`] || ""}
                        onChange={(e) => setMepRemarks(prev => ({ ...prev, [`piping_${item.slNo}`]: e.target.value }))}
                        rows="2"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="table-total">
                <td colSpan={(() => {
                  let colSpan = 2;
                  if (columnVisibility.code) colSpan++;
                  colSpan++;
                  if (columnVisibility.image) colSpan++;
                  if (columnVisibility.unit) colSpan++;
                  if (columnVisibility.qty) colSpan++;
                  if (columnVisibility.fixedRate) colSpan += 2;
                  return colSpan;
                })()} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                <td className="amount-cell" style={{ fontWeight: 'bold' }}>{formatCurrency(totalSupply)}</td>
                <td className="amount-cell" style={{ fontWeight: 'bold' }}>{formatCurrency(totalInstallation)}</td>
                <td className="amount-cell total-amount" style={{ fontWeight: 'bold' }}>{formatCurrency(totalGrand)}</td>
                {columnVisibility.remarks && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="boq-note">
          <div>
            <strong>Note:</strong> Piping quantities are calculated based on Jacuzzi dimensions ({dimensions.length}m × {dimensions.width}m × {dimensions.depth}m),
            pump room distance ({pumpRoomDistance}m), and MEP equipment quantities.
            All diameters are in millimeters (mm). Installation cost is 15% of supply cost.
            <br />
            <span className="jacuzzi-piping-note" style={{ color: "#63b3ed", fontSize: "11px" }}>
              🛁 Jacuzzi/Spa uses overflow piping logic with gutter system.
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Save calculation
  const saveCalculation = () => {
    try {
      const newCalc = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        dimensions: dimensions ? `${dimensions.length} × ${dimensions.width} × ${dimensions.depth} m` : "N/A",
        poolType: poolType,
        constructionType: constructionType,
        totalCost: grandTotal,
        mainPoolCost: mainPoolTotal,
        pumpRoomCost: pumpRoomTotal,
        mepCost: totalMepCost,
        pipingCost: pipingTotals,
        pumpRoomDistance: pumpRoomDistance,
        includePumpRoom: includePumpRoom,
        seatingCapacity: seatingCapacity,
        waterJets: waterJets,
        airJets: airJets,
        selectedAdvancedEquipment: selectedAdvancedEquipment,
        mainPoolRemarks: mainPoolRemarks,
        mepRemarks: mepRemarks,
        pumpRoomRemarks: pumpRoomRemarks,
        templateDescriptions: templateDescriptions,
        pumpRoomDimensions: pumpRoomDimensions,
        exchangeRate: exchangeRate,
        currency: currency,
        columnVisibility: columnVisibility,
        selectedTables: selectedTables,
        dynamicRates: dynamicRates,
        updateDatabase: updateDatabase
      };

      const existing = JSON.parse(localStorage.getItem("saved_jacuzzi_calculations") || "[]");
      const isDuplicate = existing.some(calc => {
        const sameDimensions = JSON.stringify(calc.dimensions) === JSON.stringify(dimensions);
        const sameType = calc.poolType === poolType;
        const sameDistance = calc.pumpRoomDistance === pumpRoomDistance;
        return sameDimensions && sameType && sameDistance;
      });

      if (isDuplicate) {
        alert("⚠️ A calculation with these dimensions and distance already exists!");
        return;
      }

      const updated = [newCalc, ...existing]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);

      localStorage.setItem("saved_jacuzzi_calculations", JSON.stringify(updated));
      setSavedCalculations(updated);
      alert("✅ Calculation saved successfully!");
    } catch (error) {
      console.error("Error saving calculation:", error);
      alert("❌ Failed to save calculation. Please try again.");
    }
  };

  // PDF download
  const downloadPDF = async () => {
    try {
      const selectedTableCount = Object.values(selectedTables).filter(Boolean).length;
      if (selectedTableCount === 0) {
        alert("⚠️ Please select at least one table to export!");
        return;
      }

      const safeMainPoolItems = Array.isArray(mainPoolItems)
        ? mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[Number(item.SlNo)])
        : [];

      const safeMepItems = Array.isArray(filteredMepItems)
        ? filteredMepItems.filter(item => Number(item.SlNo) >= 1 && Number(item.SlNo) <= 28)
        : [];

      const safePumpRoomItems = Array.isArray(mainPoolItems)
        ? mainPoolItems.filter(item => PUMP_ROOM_QTY_FIELDS[Number(item.SlNo)])
        : [];

      const safePipingItems = Array.isArray(pipingItemsFromResult) ? pipingItemsFromResult : [];
      const safeCivilQuantities = civilQuantities || {};
      const safeMepQuantities = mepQuantities || {};
      const safePumpRoomQuantities = pumpRoomQuantities || {};
      const safeDynamicRates = dynamicRates || {};
      const safeCompanyProfile = companyProfile || {};

      let pipingTotalValue = 0;
      if (typeof pipingTotals !== "undefined") {
        if (typeof pipingTotals === "object") {
          pipingTotalValue = pipingTotals?.grandTotal || pipingTotals?.total || 0;
        } else {
          pipingTotalValue = Number(pipingTotals) || 0;
        }
      }

      const distance = pumpRoomDistance || 15;
      const detectedPoolType = resultData?.pool_type || resultData?.system_parameters?.pool_type || poolType || "jacuzzi";

      await generatePDF({
        resultData: resultData || {},
        poolType: detectedPoolType,
        constructionType: constructionType || "in-ground",
        dimensions: dimensions || {},
        pumpRoomDimensions: pumpRoomDimensions || {},
        mainPoolItems: selectedTables.mainPool ? safeMainPoolItems : [],
        mainPoolTotal: Number(mainPoolTotal || 0),
        civilQuantities: safeCivilQuantities,
        mainPoolRemarks: mainPoolRemarks || {},
        mepItems: selectedTables.mep ? safeMepItems : [],
        mepQuantities: safeMepQuantities,
        mepTotal: Number(totalMepCost || 0),
        mepRemarks: mepRemarks || {},
        includePumpRoom: selectedTables.pumpRoom ? (includePumpRoom || false) : false,
        pumpRoomItems: selectedTables.pumpRoom ? safePumpRoomItems : [],
        pumpRoomQuantities: safePumpRoomQuantities,
        pumpRoomTotal: selectedTables.pumpRoom ? Number(pumpRoomTotal || 0) : 0,
        pumpRoomRemarks: pumpRoomRemarks || {},
        pipingItems: selectedTables.piping ? safePipingItems : [],
        pipingTotal: Number(pipingTotalValue || 0),
        pumpRoomDistance: distance,
        dynamicRates: safeDynamicRates,
        templateDescriptions: templateDescriptions || {},
        selectedTables: selectedTables || {},
        columnVisibility: columnVisibility || { image: true, unit: true, qty: true, fixedRate: true, remarks: true, code: true },
        selectedAdvancedEquipment: selectedAdvancedEquipment || [],
        currency: currency || "INR",
        exchangeRate: exchangeRate || 83.0,
        companyProfile: safeCompanyProfile,
        excavationSplit: civilQuantities?.excavation_split || {},
        shutteringSplit: civilQuantities?.shuttering_split || {},
        shotcretingSplit: civilQuantities?.shotcreting_split || {},
        seatingCapacity,
        waterJets,
        airJets,
        heaterKW,
        balanceTankItems: [],
        balanceTankQuantities: {},
        hasBalancingTank: false,
      });
    } catch (error) {
      console.error("❌ Jacuzzi PDF Error:", error);
      alert("PDF generation failed. Check console for details.");
    }
  };

  // Excel download
  const downloadExcel = async () => {
    const selectedTableCount = Object.values(selectedTables).filter(Boolean).length;
    if (selectedTableCount === 0) {
      alert("⚠️ Please select at least one table to export!");
      return;
    }

    try {
      const processedMepItems = selectedTables.mep && filteredMepItems?.length
        ? filteredMepItems.map(item => {
            const qty = getMepQuantity(item);
            const rate = getSupplyRate(item);
            return { ...item, calculatedQty: qty, calculatedRate: rate, calculatedAmount: qty * rate };
          }).filter(Boolean)
        : [];

      const processedPipingItems = selectedTables.piping
        ? (resultData?.piping_items || resultData?.piping || pipingItemsFromResult || []).map((item, idx) => ({
            ...item,
            quantity: item.Quantity || item.quantity || item.qty || 0,
            rate: item.Rate || item.rate || 0,
            description: item.description || item.Description || "N/A",
            Category: item.Category || item.category || "Other"
          }))
        : [];

      const item9 = mainPoolItems.find(item => Number(item.SlNo) === 9);
      const item10 = mainPoolItems.find(item => Number(item.SlNo) === 10);
      const shutteringRate = Number(item9?.Rate || 1055);
      const shotcretingRate = Number(item10?.Rate || 7950);

      const rawExcavationSplit = civilQuantities?.excavation_split || resultData?.civil_quantities?.excavation_split || {};
      const rawShutteringSplit = civilQuantities?.shuttering_split || resultData?.civil_quantities?.shuttering_split || {};
      const rawShotcretingSplit = civilQuantities?.shotcreting_split || resultData?.civil_quantities?.shotcreting_split || {};

      const enhanceSplit = (rawSplit, defaultRate) => {
        const enhanced = {};
        Object.keys(rawSplit).forEach(key => {
          const value = rawSplit[key];
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            enhanced[key] = {
              qty: Number(value.qty ?? value.Qty ?? value.quantity ?? 0),
              rate: Number(value.rate ?? value.Rate ?? defaultRate ?? 0)
            };
          } else {
            enhanced[key] = { qty: Number(value || 0), rate: Number(defaultRate || 0) };
          }
        });
        return enhanced;
      };

      const civilItems = resultData?.civil_items || [];
      const subRow11 = civilItems.find(ci => String(ci.SlNo) === "1.1");
      const subRow12 = civilItems.find(ci => String(ci.SlNo) === "1.2");
      const excavationRate11 = Number(subRow11?.Rate || 250);
      const excavationRate12 = Number(subRow12?.Rate || 350);

      const enhancedExcavation = enhanceSplit(rawExcavationSplit, 0);
      if (enhancedExcavation["1.1"]) enhancedExcavation["1.1"].rate = excavationRate11;
      if (enhancedExcavation["1.2"]) enhancedExcavation["1.2"].rate = excavationRate12;
      
      const enhancedShuttering = enhanceSplit(rawShutteringSplit, shutteringRate);
      const enhancedShotcreting = enhanceSplit(rawShotcretingSplit, shotcretingRate);

      const updatedCivilQuantities = {
        ...civilQuantities,
        excavation_split: enhancedExcavation,
        shuttering_split: enhancedShuttering,
        rcc_split: enhancedShotcreting,
        shotcreting_split: enhancedShotcreting,
      };

      console.log("🔥 JACUZZI ENHANCED CIVIL DATA:", {
        excavation_split: updatedCivilQuantities.excavation_split,
        shuttering_split: updatedCivilQuantities.shuttering_split,
        rcc_split: updatedCivilQuantities.rcc_split,
        shutteringRate,
        shotcretingRate,
      });

      await generateExcelReport(
        resultData || {},
        selectedTables.mainPool ? mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo]) : [],
        selectedTables.mep ? processedMepItems : [],
        dimensions || {},
        totalMepCost || 0,
        mainPoolTotal || 0,
        [],
        selectedTables.pumpRoom ? (pumpRoomTotal || 0) : 0,
        'jacuzzi',
        false,
        selectedTables.pumpRoom ? includePumpRoom : false,
        mainPoolRemarks || {},
        {},
        mepRemarks || {},
        pumpRoomRemarks || {},
        templateDescriptions || {},
        dynamicRates || {},
        currency || 'INR',
        exchangeRate || 83.0,
        selectedTables.pumpRoom ? pumpRoomDimensions : {},
        selectedTables.pumpRoom ? pumpRoomQuantities : {},
        constructionType || 'in-ground',
        selectedTables.pumpRoom ? (pumpRoomTotal || 0) : 0,
        pumpRoomRemarks || {},
        selectedAdvancedEquipment || [],
        selectedTables.pumpRoom ? mainPoolItems.filter(item => PUMP_ROOM_QTY_FIELDS[item.SlNo]) : [],
        [],
        columnVisibility || {},
        {},
        {},
        {},
        {},
        selectedTables || {},
        null,
        'jacuzzi',
        selectedTables.piping ? processedPipingItems : [],
        selectedTables.piping ? (pipingTotals || 0) : 0,
        companyProfile || null,
        updatedCivilQuantities,
        {},
        selectedTables.mep ? mepQuantities : {},
        dynamicRates || {},
        {},
        [],
        false,
        pumpRoomDistance || 15,
        1.1,
        null,
        // ================================
        // ✅ EDITABLE QTY PARAMETERS
        // ================================
        editableCivilQty,
        {},
        editablePumpRoomQty,
        editableMepQty,
        editablePipingQty,
        editableSubRowQty
      );

      console.log("✅ Excel download completed successfully!");
    } catch (error) {
      console.error("❌ Excel download failed:", error);
      alert("Failed to generate Excel. Check console for details.");
    }
  };

  // ================================
  // MAIN RENDER WITH SKIMMER LAYOUT
  // ================================
  return (
    <div className="result-page">
      <style>
        {`
          .sub-row {
            background-color: rgba(255,255,255,0.03);
            font-size: 13px;
          }
          .sub-row:hover {
            background-color: rgba(255,255,255,0.06);
          }
          .sub-row td:first-child {
            padding-left: 20px;
          }
          .sub-row td:nth-child(3) {
            padding-left: 40px;
          }
          .main-row {
            font-weight: bold;
            background-color: rgba(99,179,237,0.06);
          }
          .excavation-note {
            margin-top: 4px;
            font-size: 11px;
            color: #888;
            font-weight: normal;
          }
          .quantity-zero {
            color: #999;
            font-style: italic;
          }
          .quantity-filled {
            color: #e2e8f0;
            font-weight: 500;
          }
          .main-row td.amount-cell {
            color: #888;
          }
          .main-description {
            font-size: 14px;
            line-height: 1.4;
          }
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
        `}
      </style>

      <header className="header-section">
        <div className="page-header">
          <div className="header-content">
            <h1>Jacuzzi/Spa Calculation Results</h1>
            <p className="subtitle">A detailed summary of your Jacuzzi/Spa's construction, MEP components, piping system, and cost estimates</p>
          </div>
          <div className="header-currency-toggle">
            <CurrencyToggle />
            <button onClick={() => setSaveOpen(true)} style={{ padding: "10px 20px", background: "#4CAF50", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer" }}>💾 Save Project</button>
          </div>
        </div>
      </header>

      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}

      <div className="results-dashboard-layout">
        <aside className="results-sidebar">
          <div className="sidebar-inner">
            <h3 style={{ marginBottom: "3%", color: "gray" }}>Views</h3>
            <div className="sidebar-tab-buttons">
              {[
                { id: 1, icon: "📊", label: "Specifications" },
                { id: 2, icon: "🏊", label: `Civil Works (${mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo]).length})` },
                { id: 4, icon: "⚙️", label: `Pump Room (${mainPoolItems.filter(item => PUMP_ROOM_QTY_FIELDS[item.SlNo]).length})` },
                { id: 3, icon: "🔧", label: `MEP Systems (${filteredMepItems.length})` },
                { id: "piping", icon: "🔩", label: `Piping (${pipingItemsFromResult.length})` },
                { id: "total", icon: "💰", label: "Total Cost" },
                { id: 5, icon: "📅", label: "Timeline" },
                { id: "visualization", icon: "📈", label: "Chart" }
              ].map(tab => (
                <button key={tab.id} className={`sidebar-tab-btn ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)} data-tooltip={tab.label}>
                  <span className="sidebar-tab-icon">{tab.icon}</span>
                  <span className="tab-label-text">{tab.label}</span>
                </button>
              ))}
            </div>
            <h3 style={{ marginBottom: "3%", color: "gray" }}>Actions</h3>
            <div className="sidebar-actions">
              <button className="sidebar-action-btn" onClick={downloadPDF}>
                <span className="sidebar-tab-icon">📄</span>
                <span className="btn-text">PDF Report</span>
              </button>
              <button className="sidebar-action-btn" onClick={downloadExcel}>
                <span className="sidebar-tab-icon">📊</span>
                <span className="btn-text">Excel Report</span>
              </button>
              <button className="sidebar-action-btn" onClick={() => setShowShareModal(true)}>
                <span className="sidebar-tab-icon">🔗</span>
                <span className="btn-text">Share Project</span>
              </button>
              <button className="sidebar-action-btn" onClick={() => setShowComparison(true)}>
                <span className="sidebar-tab-icon">⚖</span>
                <span className="btn-text">Compare</span>
              </button>
              <button className="sidebar-action-btn proforma-btn" onClick={() => {
                navigate('/proformainvoice', {
                  state: {
                    resultData, dimensions, mainPoolTotal, mepTotal: totalMepCost,
                    pipingTotal: pipingTotals || 0,
                    pumpRoomTotal: includePumpRoom ? pumpRoomTotal : 0,
                    grandTotal, poolType: "jacuzzi", includePumpRoom,
                    hasBalancingTank: false, selectedAdvancedEquipment, includeHeatPump,
                    companyProfile: null, currency, exchangeRate, dynamicRates,
                    pumpRoomDistance,
                    filteredMainPoolItems: mainPoolItems || [],
                    filteredMepItems: filteredMepItems || [],
                    pumpRoomItems: mainPoolItems || [],
                    balanceTankItems: [],
                    pipingItems: pipingItemsFromResult || [],
                    mainPoolRemarks, mepRemarks, pumpRoomRemarks, templateDescriptions,
                    civilQuantities: civilQuantities || resultData,
                    mepQuantities: mepQuantities || resultData,
                    pumpRoomQuantities: pumpRoomQuantities || resultData,
                    balanceTankQuantities: {},
                    selectedTables, columnVisibility
                  }
                });
              }}>
                <span className="sidebar-tab-icon">📄</span>
                <span className="btn-text">Proforma Invoice</span>
              </button>
              <button className="sidebar-action-btn" onClick={() => {
                navigate('/jacuzzi-spa-delivery', {
                  state: {
                    result: resultData, dimensions,
                    mainPoolData: selectedTables.mainPool ? mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo]) : [],
                    mepItems: selectedTables.mep ? filteredMepItems : [],
                    pumpRoomData: selectedTables.pumpRoom ? mainPoolItems.filter(item => PUMP_ROOM_QTY_FIELDS[item.SlNo]) : [],
                    pumpRoomQuantities: selectedTables.pumpRoom ? pumpRoomQuantities : {},
                    pumpRoomDimensions: selectedTables.pumpRoom ? pumpRoomDimensions : {},
                    mainPoolTotal: mainPoolTotal || 0, mepTotal: totalMepCost || 0,
                    pumpRoomTotal: selectedTables.pumpRoom ? (pumpRoomTotal || 0) : 0,
                    pipingTotal: selectedTables.piping ? pipingTotals : 0,
                    pipingItems: selectedTables.piping ? pipingItemsFromResult : [],
                    templateDescriptions, poolType: 'jacuzzi',
                    includePumpRoom: selectedTables.pumpRoom || false,
                    selectedTables, selectedAdvancedEquipment, constructionType,
                    seatingCapacity, waterJets, airJets, pumpRoomDistance
                  }
                });
              }}>
                <span className="sidebar-tab-icon">📦</span>
                <span className="btn-text">Delivery Challan</span>
              </button>
              <button className="sidebar-action-btn" onClick={() => {
                navigate('/tax', {
                  state: {
                    result: resultData, dimensions,
                    mainPoolData: selectedTables.mainPool ? mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo]) : [],
                    mepItems: selectedTables.mep ? filteredMepItems : [],
                    pumpRoomData: selectedTables.pumpRoom ? mainPoolItems.filter(item => PUMP_ROOM_QTY_FIELDS[item.SlNo]) : [],
                    mainPoolTotal: mainPoolTotal || 0, mepTotal: totalMepCost || 0,
                    pumpRoomTotal: includePumpRoom ? pumpRoomTotal : 0,
                    pipingTotal: selectedTables.piping ? pipingTotals : 0,
                    pipingItems: selectedTables.piping ? pipingItemsFromResult : [],
                    templateDescriptions, poolType: 'jacuzzi', includePumpRoom,
                    currency, exchangeRate, selectedTables, constructionType,
                    finalTotal: grandTotal, selectedAdvancedEquipment,
                    percentageAmounts: { item35: 0, item36: 0, item37: 0, item38: 0 },
                    seatingCapacity, waterJets, airJets, pumpRoomDistance
                  }
                });
              }}>
                <span className="sidebar-tab-icon">🧾</span>
                <span className="btn-text">Tax Invoice</span>
              </button>
              <button className="sidebar-action-btn save-project-btn" onClick={() => setSaveOpen(true)}>
                <span className="sidebar-tab-icon">💾</span>
                <span className="btn-text">Save Project</span>
              </button>
            </div>
          </div>
          <div className="sidebar-footer">
            <button className="back-to-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <span className="top-icon">↑</span>
              <span className="top-text">Back to Top</span>
            </button>
          </div>
        </aside>

        <div className="results-main-content">
          <div><ColumnVisibilityControls /></div>
          <div className="global-table-selection"><TableSelectionControls /></div>

          {activeTab === 1 && (
            <section className="tab-content active">
              {loadingCalc ? (
                <div className="loading-spinner">Loading calculation data...</div>
              ) : !resultData ? (
                <div className="error-message">No calculation data available. Please run a calculation first.</div>
              ) : (
                <>
                  <div className="section-header">
                    <h2 className="section-title">Jacuzzi/Spa Specifications</h2>
                    <div className="header-controls"><ConstructionTypeDisplay /></div>
                  </div>

                  <div className="specs-controls"><DatabaseUpdateToggle /></div>

                  <div className="specs-container_1">
                    <div className="specs-table-container">
                      <div className="specs-table-wrapper">
                        <table className="excel-preview-table">
                          <tbody>
                            <tr><td className="spec-label"><strong>Dimensions</strong></td><td className="spec-value">{dimensions.length} × {dimensions.width} × {dimensions.depth} m</td></tr>
                            <tr><td className="spec-label"><strong>Volume</strong></td><td className="spec-value">{safeToFixed(resultData?.volume_m3 || dimensions.length * dimensions.width * dimensions.depth)} m³</td></tr>
                            <tr><td className="spec-label"><strong>Floor Area</strong></td><td className="spec-value">{safeToFixed(dimensions.length * dimensions.width)} m²</td></tr>
                            <tr><td className="spec-label"><strong>Seating Capacity</strong></td><td className="spec-value">{seatingCapacity} persons</td></tr>
                            <tr><td className="spec-label"><strong>Water Jets</strong></td><td className="spec-value">{waterJets} jets</td></tr>
                            <tr><td className="spec-label"><strong>Air Controllers</strong></td><td className="spec-value">{airJets} controllers</td></tr>
                            <tr><td className="spec-label"><strong>Filter Diameter</strong></td><td className="spec-value">{dynamicRates.filter_dia || resultData?.filter_dia_mm || "N/A"} mm</td></tr>
                            <tr><td className="spec-label"><strong>Pump Capacity</strong></td><td className="spec-value">{dynamicRates.hp || resultData?.hp || "N/A"} HP</td></tr>
                            <tr><td className="spec-label"><strong>Pump Room Distance</strong></td><td className="spec-value">{pumpRoomDistance} m</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {activeTab === 2 && (
            <section className="tab-content active">
              <div className="section-header">
                <h2>Civil Works - Jacuzzi Structure (14 Items)</h2>
                <div className="header-controls">
                  <div className="total-amount-box">
                    <span className="total-label">Total Amount:</span>
                    <span className="total-value">{formatCurrency(mainPoolTotal)}</span>
                  </div>
                </div>
              </div>
              {loadingMainPool ? (
                <div className="loading-spinner">Loading data...</div>
              ) : (
                <>
                  {loadingMepCalculation && (
                    <div className="calculation-status">
                      <span className="status-icon">⏳</span>
                      <span>Calculating civil quantities...</span>
                    </div>
                  )}
                  {renderMainPoolTable()}
                  <div className="boq-note">
                    <div>
                      <strong>Note:</strong> The estimates provided are based on current industry standards and average material costs.
                      Actual costs may vary depending on location, specific material selections, and site conditions.
                      <span className="small"> Variations of ±10–15% from the estimate are common.</span>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {activeTab === 4 && (
            <section className="tab-content active">
              <div className="section-header">
                <h2>Pump Room - Civil Construction (12 Items)</h2>
                <div className="header-controls">
                  <div className="total-amount-box">
                    <span className="total-label">Total Amount:</span>
                    <span className="total-value">{formatCurrency(pumpRoomTotal)}</span>
                  </div>
                </div>
              </div>

              {pumpRoomDimensions.length ? (
                <div className="pump-room-specs">
                  <h3>Pump Room Specifications</h3>
                  <div className="specs-grid">
                    <div className="spec-item">
                      <span className="spec-label">Construction Type:</span>
                      <span className="spec-value">{constructionType === "terrace" ? "🏢 Terrace Pump Room" : "⛰️ In-Ground Pump Room"}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Pump Room Dimensions:</span>
                      <span className="spec-value">{pumpRoomDimensions.length} × {pumpRoomDimensions.width} × {pumpRoomDimensions.height} m</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Pump Room Area:</span>
                      <span className="spec-value">{safeToFixed(pumpRoomDimensions.length * pumpRoomDimensions.width)} m²</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Distance to Pump Room:</span>
                      <span className="spec-value">{pumpRoomDistance} m</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="calculation-status">
                  <span className="status-icon">⏳</span>
                  <span>Calculating pump room quantities...</span>
                </div>
              )}

              <div className="pump-room-section">
                <h3>Pump Room Construction Details (12 Items)</h3>
                {renderPumpRoomTable()}
              </div>

              <div className="boq-note">
                <div>
                  <strong>Note:</strong> Pump room construction costs are calculated based on standard RCC construction practices (15% of Jacuzzi civil quantities).
                  <span className="small"> Actual costs may vary based on site conditions and local material rates.</span>
                </div>
              </div>
            </section>
          )}

          {activeTab === 3 && (
            <section className="tab-content active">
              <div className="section-header">
                <h2>MEP (Mechanical, Electrical, Plumbing) Systems</h2>
                <div className="header-controls">
                  <ConstructionTypeDisplay />
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
                          <span className="breakdown-label">Base MEP (Items 1-28):</span>
                          <span className="breakdown-value">{formatCurrency(baseMepTotals.grand)}</span>
                        </div>
                        <div className="breakdown-item">
                          <span className="breakdown-label">Heat Pump (Item 29):</span>
                          <span className="breakdown-value">{formatCurrency(advancedEquipmentTotals.grand)}</span>
                        </div>
                        <div className="breakdown-total">
                          <span className="breakdown-label">Total MEP Cost:</span>
                          <span className="breakdown-value">{formatCurrency(totalMepCost)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="boq-note">
                    <div>
                      <strong>Note:</strong> The estimates provided are based on current industry standards and average material costs.
                      <span className="small"> Variations of ±10–15% from the estimate are common.</span>
                    </div>
                  </div>
                </>
              )}
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
                <h2 className="section-title">Total Jacuzzi/Spa Cost Summary</h2>
                <div className="header-controls"><ConstructionTypeDisplay /></div>
              </div>

              <div className="summary-cards">
                <div className="summary-card">
                  <div className="summary-icon">🏊</div>
                  <div className="summary-details">
                    <h3>Civil Works (14 items)</h3>
                    <p className="summary-amount">{formatCurrency(mainPoolTotal)}</p>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon">⚙️</div>
                  <div className="summary-details">
                    <h3>Pump Room (12 items)</h3>
                    <p className="summary-amount">{formatCurrency(pumpRoomTotal)}</p>
                    <p className="summary-small">Distance: {pumpRoomDistance}m</p>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon">🔧</div>
                  <div className="summary-details">
                    <h3>MEP Systems</h3>
                    <p className="summary-amount">{formatCurrency(totalMepCost)}</p>
                    <p className="summary-small">29 items - Includes Supply + Installation</p>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon">🔩</div>
                  <div className="summary-details">
                    <h3>Piping System</h3>
                    <p className="summary-amount">{formatCurrency(pipingTotals)}</p>
                    <p className="summary-small">{pipingItemsFromResult.length} items • Distance: {pumpRoomDistance}m</p>
                  </div>
                </div>
              </div>

              <div className="grand-total_1">
                <h3>Grand Total</h3>
                {(() => {
                  const baseAmount = grandTotal;
                  const gstAmount = baseAmount * 0.18;
                  const grandTotalWithGST = baseAmount + gstAmount;
                  return (
                    <>
                      <div className="amount-breakdown_1">
                        <div className="breakdown-item_1">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(baseAmount)}</span>
                        </div>
                        <div className="breakdown-item_1">
                          <span>GST (18%):</span>
                          <span>{formatCurrency(gstAmount)}</span>
                        </div>
                        <div className="breakdown-item_1 total">
                          <span>Total with GST:</span>
                          <span>{formatCurrency(grandTotalWithGST)}</span>
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
                  Includes {constructionType === "terrace" ? "structural civil works" : "complete civil works with sub-rows"},
                  pump room (12 items, 15% of Jacuzzi), MEP equipment{selectedAdvancedEquipment.includes(29) ? " (with Heat Pump)" : ""},
                  and complete piping system
                  <br />
                  <span className="gst-note_1">All prices include 18% GST as per applicable tax regulations</span>
                </p>
              </div>
            </section>
          )}

          {activeTab === 5 && (
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
              />
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
                mepCost={totalMepCost}
                pipingCost={pipingTotals}
                pumpRoomCost={pumpRoomTotal}
                currency={currency}
                exchangeRate={exchangeRate}
                includePumpRoom={includePumpRoom}
                constructionType={constructionType}
                selectedAdvancedEquipment={selectedAdvancedEquipment}
                advancedEquipmentTotal={advancedEquipmentTotal}
                columnVisibility={columnVisibility}
                selectedTables={selectedTables}
                filteredMepItems={filteredMepItems}
              />
            </section>
          )}
        </div>
      </div>

      <DebugModal />

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
          hasPumpRoom={includePumpRoom}
          mainPoolCost={mainPoolTotal}
          pumpRoomCost={pumpRoomTotal}
          mepCost={totalMepCost}
          pipingCost={pipingTotals}
          mainPoolRemarks={mainPoolRemarks}
          pumpRoomRemarks={pumpRoomRemarks}
          mepRemarks={mepRemarks}
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
          pipingItems={pipingItemsFromResult}
        />
      )}

      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="share-modal-close" onClick={() => setShowShareModal(false)}>✕</button>
            <ShareResults
              resultData={resultData}
              mainPoolData={selectedTables.mainPool ? mainPoolItems.filter(item => MAIN_POOL_QTY_FIELDS[item.SlNo]) : []}
              pumpRoomData={selectedTables.pumpRoom ? mainPoolItems.filter(item => item.SlNo <= 12 && PUMP_ROOM_QTY_FIELDS[item.SlNo]) : []}
              mepItems={selectedTables.mep ? filteredMepItems : []}
              pipingItems={selectedTables.piping ? pipingItemsFromResult : []}
              dimensions={dimensions}
              totalMep={selectedTables.mep ? totalMepCost : 0}
              mainPoolTotal={selectedTables.mainPool ? mainPoolTotal : 0}
              pumpRoomTotal={selectedTables.pumpRoom && includePumpRoom ? pumpRoomTotal : 0}
              pipingTotal={selectedTables.piping ? pipingTotals : 0}
              finalTotal={grandTotal}
              balancingTankTotal={0}
              balanceTankTotal={0}
              balancingRows={[]}
              balanceTankData={[]}
              hasBalancingTank={false}
              mainPoolRemarks={mainPoolRemarks}
              mepRemarks={mepRemarks}
              pumpRoomRemarks={pumpRoomRemarks}
              balancingTankRemarks={{}}
              balanceTankRemarks={{}}
              civilQuantities={civilQuantities}
              mepQuantities={mepQuantities}
              pumpRoomQuantities={pumpRoomQuantities}
              balanceTankQuantities={{}}
              dynamicRates={dynamicRates}
              currency={currency}
              exchangeRate={exchangeRate}
              includePumpRoom={selectedTables.pumpRoom ? includePumpRoom : false}
              poolType="jacuzzi"
              constructionType={constructionType}
              selectedAdvancedEquipment={selectedAdvancedEquipment}
              columnVisibility={columnVisibility}
              selectedTables={selectedTables}
              apiBaseUrl={`${API_BASE_URL}/admin`}
              filteredMepItems={selectedTables.mep ? filteredMepItems : []}
              templateDescriptions={templateDescriptions || {}}
            />
          </div>
        </div>
      )}

      <SaveProjectModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        resultData={resultDataForSave}
        dimensions={dimensions}
        projectType="jacuzzi"
      />

      <footer className="action-buttons">
        <button className="download-button" onClick={saveCalculation}>
          <span className="button-icon">💾</span> Save Calculation
        </button>
        <button className="download-button" onClick={() => navigate("/jacuzzi-calculator")}>
          <span className="button-icon">←</span> Back to Calculator
        </button>
        <button className="download-button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="button-icon">↑</span> Back to top
        </button>
      </footer>
    </div>
  );
}

export default JacuzziSpaResultPage;