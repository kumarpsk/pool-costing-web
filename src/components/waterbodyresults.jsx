import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./result.css";

import { generatePDF } from "./download";
import generateWaterBodyExcelReport from './waterbodyexcel';
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
    console.error("Missing authentication credentials");
    return null;
  }

  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

// Enhanced safe number parser
function safeParseNumber(value, defaultValue = 0) {
  if (value === null || value === undefined) return defaultValue;
  
  if (typeof value === 'object' && value !== null) {
    if (value.value !== undefined) return safeParseNumber(value.value, defaultValue);
    if (value.qty !== undefined) return safeParseNumber(value.qty, defaultValue);
    if (value.quantity !== undefined) return safeParseNumber(value.quantity, defaultValue);
    if (value.amount !== undefined) return safeParseNumber(value.amount, defaultValue);
    if (value.QTY !== undefined) return safeParseNumber(value.QTY, defaultValue);
    return defaultValue;
  }
  
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Safe formatter
function safeToFixed(value, decimals = 2) {
  const num = safeParseNumber(value);
  if (isNaN(num)) return "0.00";
  return Number(num).toFixed(decimals);
}

// Format currency
function formatCurrency(amount, currency = 'INR', exchangeRate = 83.0) {
  const numAmount = safeParseNumber(amount);
  if (currency === 'USD') {
    const usdAmount = numAmount / exchangeRate;
    return `$${safeToFixed(usdAmount)}`;
  }
  return `₹${safeToFixed(numAmount)}`;
}

// Get currency symbol
function getCurrencySymbol(currency = 'INR') {
  return currency === 'USD' ? '$' : '₹';
}

// Real-time exchange rate fetcher
async function fetchRealTimeExchangeRate() {
  console.log("🔄 Fetching real-time exchange rate...");
  
  try {
    const apiEndpoints = [
      'https://api.exchangerate-api.com/v4/latest/USD',
      'https://api.frankfurter.app/latest?from=USD&to=INR',
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          let rate = null;

          if (endpoint.includes('exchangerate-api')) {
            rate = data.rates?.INR;
          } else if (endpoint.includes('frankfurter')) {
            rate = data.rates?.INR;
          }

          if (rate && rate > 0) {
            const exchangeRate = parseFloat(rate);
            console.log(`✅ Real-time exchange rate fetched: 1 USD = ${exchangeRate} INR`);
            localStorage.setItem('lastExchangeRate', JSON.stringify({
              rate: exchangeRate,
              timestamp: Date.now()
            }));
            return exchangeRate;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch from ${endpoint}:`, error);
        continue;
      }
    }

    const cachedRate = localStorage.getItem('lastExchangeRate');
    if (cachedRate) {
      const { rate, timestamp } = JSON.parse(cachedRate);
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        console.log(`📦 Using cached exchange rate: 1 USD = ${rate} INR`);
        return rate;
      }
    }

    console.warn('⚠️ Using default exchange rate 83.0');
    return 83.0;
  } catch (error) {
    console.error('❌ Error fetching exchange rate:', error);
    return 83.0;
  }
}

// Installation rate functions for MEP only
const getSupplyRate = (item, dynamicRates) => {
  if (!item) return 0;
  if (item.SlNo === 1) {
    return dynamicRates.filter_rate || 0;
  }
  if (item.SlNo === 7) {
    return dynamicRates.pump_rate || 0;
  }
  return item.Rate || 0;
};

const getInstallationRate = (item, dynamicRates) => {
  const supply = getSupplyRate(item, dynamicRates);
  return supply * INSTALLATION_PERCENT;
};

const getSupplyCost = (item, quantity, dynamicRates) => {
  return quantity * getSupplyRate(item, dynamicRates);
};

const getInstallationCost = (item, quantity, dynamicRates) => {
  return quantity * getInstallationRate(item, dynamicRates);
};

const getRowTotal = (item, quantity, dynamicRates) => {
  return getSupplyCost(item, quantity, dynamicRates) + getInstallationCost(item, quantity, dynamicRates);
};

// ================================
// ✅ TEMPLATE SAFETY CHECKER
// ================================
const hasTemplatePlaceholders = (text) => {
  if (!text) return false;
  return /\{\{.*?\}\}/.test(text);
};

// ================================
// ✅ GET FINAL DESCRIPTION (BACKEND PROCESSED ONLY)
// ================================
const getFinalDescription = (item) => {
  if (!item) return "N/A";
  
  // Use backend-processed description only
  const finalDesc = item.Description || item.description || "N/A";
  
  // Safety check - warn if templates still present
  if (hasTemplatePlaceholders(finalDesc)) {
    console.warn(`⚠️ Template placeholder found in description for SlNo ${item.SlNo}:`, finalDesc);
  }
  
  return finalDesc;
};

function WaterBodyResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // State from location
  const [resultData, setResultData] = useState(location.state?.result || null);
  const [dimensions, setDimensions] = useState(location.state?.dimensions || {});
  const [waterBodySpecs, setWaterBodySpecs] = useState(location.state?.waterBodySpecs || {});
  const [constructionType, setConstructionType] = useState(
    location.state?.construction_type || 
    resultData?.design_parameters?.construction_type || 
    'in-ground'
  );
  const [includePumpRoom, setIncludePumpRoom] = useState(true);
  const [hasBalancingTank, setHasBalancingTank] = useState(false);
  const [companyProfile, setCompanyProfile] = useState(null);

  // ================================
  // ✅ STEP 2: ADD NOZZLE STATE
  // ================================
  const [selectedNozzleType, setSelectedNozzleType] = useState("");
  const [waterNozzleData, setWaterNozzleData] = useState(null);

  // Fetched data states
  const [civilItems, setCivilItems] = useState([]);
  const [loadingCivil, setLoadingCivil] = useState(true);
  const [mepItems, setMepItems] = useState([]);
  const [loadingMep, setLoadingMep] = useState(true);
  const [loadingCalc, setLoadingCalc] = useState(!resultData);
  const [civilQuantities, setCivilQuantities] = useState({});
  
  // SUBROW STATES
  const [excavationSubrows, setExcavationSubrows] = useState({});
  const [shutteringSubrows, setShutteringSubrows] = useState({});
  const [shotcretingSubrows, setShotcretingSubrows] = useState({});
  
  const [waterBodyMetrics, setWaterBodyMetrics] = useState({});
  const [mepQuantities, setMepQuantities] = useState({});
  
  // Pump Room Data
  const [pumpRoomData, setPumpRoomData] = useState([]);
  const [loadingPumpRoomData, setLoadingPumpRoomData] = useState(true);
  const [pumpRoomQuantities, setPumpRoomQuantities] = useState({});
  const [pumpRoomDimensions, setPumpRoomDimensions] = useState({});
  
  // Piping System State (Items starting from SlNo 25)
  const [pipingItems, setPipingItems] = useState([]);
  const [pipingTotals, setPipingTotals] = useState(0);
  const [loadingPiping, setLoadingPiping] = useState(false);
  const [updatingPiping, setUpdatingPiping] = useState(false);
  const [pumpRoomDistance, setPumpRoomDistance] = useState(15.0);
  const [safetyFactor, setSafetyFactor] = useState(1.1);
  
  // Equipment specs
  const [equipmentSpecs, setEquipmentSpecs] = useState({
    filter_dia_mm: 0,
    pump_hp: 0,
    mpv_size: "",
    flow_rate_m3_per_h: 0,
    filter_description: "",
    pump_description: "",
    waterfall_pump_description: "",
    filter_rate: 0,
    pump_rate: 0
  });

  // Dynamic rates from backend
  const [dynamicRates, setDynamicRates] = useState({
    filter_rate: 0,
    pump_rate: 0,
    filter_description: "",
    pump_description: "",
    source: "no_match",
    exact_match: false,
    filter_dia: null,
    hp: null
  });

  // UI state
  const [savedCalculations, setSavedCalculations] = useState([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [activeTab, setActiveTab] = useState(1);
  const [imageModal, setImageModal] = useState({ show: false, src: "" });
  const [saveOpen, setSaveOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Remarks state
  const [civilRemarks, setCivilRemarks] = useState({});
  const [mepRemarks, setMepRemarks] = useState({});
  const [pumpRoomRemarks, setPumpRoomRemarks] = useState({});
  const [templateDescriptions, setTemplateDescriptions] = useState({});

  // Currency state
  const [currency, setCurrency] = useState('INR');
  const [exchangeRate, setExchangeRate] = useState(83.0);
  const [loadingExchangeRate, setLoadingExchangeRate] = useState(false);
  const [lastExchangeUpdate, setLastExchangeUpdate] = useState(null);
  const [exchangeRateError, setExchangeRateError] = useState(null);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState({
    image: true,
    unit: true,
    qty: true,
    fixedRate: true,
    remarks: true,
    code: true
  });

  // Table selection for export
  const [selectedTables, setSelectedTables] = useState({
    civil: true,
    pumpRoom: true,
    mep: true,
    piping: true
  });

  // ================================
  // ✅ ADD EDITABLE STATES
  // ================================
  const [editableCivilQty, setEditableCivilQty] = useState({});
  const [editablePumpRoomQty, setEditablePumpRoomQty] = useState({});
  const [editableMepQty, setEditableMepQty] = useState({});
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

      case "pump":
        setEditablePumpRoomQty(prev => ({
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

  // API Base URLs
  const ADMIN_API_BASE = `${API_BASE_URL}/admin`;
  const WATERBODY_API_BASE = `${API_BASE_URL}/waterbody`;

  // Quantity mappings for Civil (1-12)
  const civilQuantityFields = {
    1: "EarthExcavation_QTY",
    2: "BackFilling_QTY",
    3: "Soling_QTY",
    4: "plaincement_QTY",
    5: "BurntBrick_QTY",
    6: "steelreinforcement_QTY",
    7: "Shuttering_QTY",
    8: "shotcreting_QTY",
    9: "WaterProofing_QTY",
    10: "plastering_QTY",
    11: "Coping_QTY",
    12: "Tiling_QTY"
  };

  const pumpRoomQuantityFields = {
    1: "EarthExcavation_QTY_2",
    2: "BackFilling_QTY_2",
    3: "Soling_QTY_2",
    4: "plaincement_QTY_2",
    5: "BurntBrick_QTY_2",
    6: "steelreinforcement_QTY_2",
    7: "Shuttering_QTY_2",
    8: "shotcreting_QTY_2",
    9: "WaterProofing_QTY_2",
    10: "plastering_QTY_2"
  };

  // MEP Quantity Fields for Items 1-24
  const mepQuantityFields = {
    1: "filter_QTY",
    2: "glass_media_QTY",
    3: "pressure_gauge_QTY",
    4: "drain_valve_QTY",
    5: "mpv_QTY",
    6: "mpv_connect_QTY",
    7: "pump_QTY",
    8: "return_inlets_QTY",
    9: "main_drain_QTY",
    10: "underwater_light_QTY",
    11: "light_transformer_QTY",
    12: "control_panel_QTY",
    13: "cable_conduit_QTY",
    14: "earthing_QTY",
    15: "floating_hose_QTY",
    16: "aluminium_brush_QTY",
    17: "algae_brush_QTY",
    18: "deep_net_QTY",
    19: "telescopic_handle_QTY",
    20: "pool_cleaner_QTY",
    21: "test_kit_QTY",
    22: "curved_brush_QTY",
    23: "waterfall_nozzle_QTY",
    24: "waterfall_pump_QTY"
  };

  const mepTableConfigs = [
    { start: 1, end: 7, title: "Filtration & Pump System" },
    { start: 8, end: 9, title: "Pool Heads & Drains" },
    { start: 10, end: 14, title: "Lighting & Electrical System" },
    { start: 15, end: 22, title: "Cleaning & Maintenance Equipment" },
    { start: 23, end: 24, title: "Waterfall Systems" }
  ];

  // Process quantities data
  const processQuantitiesData = (quantities) => {
    if (!quantities) return {};
    const processed = {};
    Object.entries(quantities).forEach(([key, value]) => {
      processed[key] = safeParseNumber(value);
    });
    return processed;
  };

  // ================================
  // ✅ GET CIVIL QUANTITY WITH EDITABLE STATE
  // ================================
  const getCivilQuantity = (slNo) => {
    // ✅ Check editable state first
    if (editableCivilQty[slNo] !== undefined) {
      return Number(editableCivilQty[slNo]);
    }

    const fieldName = civilQuantityFields[slNo];
    if (!fieldName) return 0;
    
    if (civilQuantities && civilQuantities[fieldName] !== undefined) {
      return safeParseNumber(civilQuantities[fieldName]);
    }
    
    if (resultData && resultData.civil_quantities && resultData.civil_quantities[fieldName] !== undefined) {
      return safeParseNumber(resultData.civil_quantities[fieldName]);
    }
    
    return 0;
  };

  // ================================
  // ✅ GET PUMP ROOM QUANTITY WITH EDITABLE STATE
  // ================================
  const getPumpRoomQuantity = (slNo) => {
    // ✅ Check editable state first
    if (editablePumpRoomQty[slNo] !== undefined) {
      return Number(editablePumpRoomQty[slNo]);
    }

    if (slNo > 10) return 0;
    
    const fieldName = pumpRoomQuantityFields[slNo];
    if (!fieldName) return 0;
    
    if (pumpRoomQuantities && pumpRoomQuantities[fieldName] !== undefined) {
      return safeParseNumber(pumpRoomQuantities[fieldName]);
    }
    
    if (resultData && resultData.pump_room_quantities && resultData.pump_room_quantities[fieldName] !== undefined) {
      return safeParseNumber(resultData.pump_room_quantities[fieldName]);
    }
    
    const civilQty = getCivilQuantity(slNo);
    return civilQty * 0.15;
  };

  // ================================
  // ✅ GET MEP QUANTITY WITH EDITABLE STATE
  // ================================
  const getMepQuantity = (slNo) => {
    // ✅ Check editable state first
    if (editableMepQty[slNo] !== undefined) {
      return Number(editableMepQty[slNo]);
    }

    const fieldName = mepQuantityFields[slNo];
    if (!fieldName) return 0;
    
    let value = 0;
    if (mepQuantities && mepQuantities[fieldName] !== undefined) {
      value = safeParseNumber(mepQuantities[fieldName]);
    } else if (resultData && resultData.mep_quantities && resultData.mep_quantities[fieldName] !== undefined) {
      value = safeParseNumber(resultData.mep_quantities[fieldName]);
    }
    
    if (slNo === 10 || slNo === 11) {
      const forced = Math.max(1, value);
      return forced;
    }
    
    return value;
  };

  // Fetch MEP calculation and piping from backend
  const fetchMepCalculationWithDistance = async (distance = pumpRoomDistance) => {
    if (!dimensions?.length || !dimensions?.width || !dimensions?.depth) {
      console.log("⚠️ Missing dimensions, skipping MEP calculation");
      return;
    }

    setUpdatingPiping(true);
    setLoadingPiping(true);

    try {
      const headers = getTenantAuthHeaders(navigate);
      if (!headers) return;

      const requestBody = {
        length: dimensions.length,
        width: dimensions.width,
        depth: dimensions.depth,
        construction_type: constructionType,
        include_pump_room: true,
        pump_room_distance: distance,
        piping_safety_factor: safetyFactor
      };

      console.log("📡 Fetching MEP calculation for water body with distance:", distance, "m", requestBody);

      const response = await fetch(`${WATERBODY_API_BASE}/calculate-mep`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("📊 MEP Calculation Response:", data);

      if (data.success) {
        if (data.mep_quantities) {
          setMepQuantities(data.mep_quantities);
        }

        if (data.excavation_subrows) {
          setExcavationSubrows(data.excavation_subrows);
        }
        if (data.shuttering_subrows) {
          setShutteringSubrows(data.shuttering_subrows);
        }
        if (data.shotcreting_subrows) {
          setShotcretingSubrows(data.shotcreting_subrows);
        }

        if (data.piping_items && Array.isArray(data.piping_items)) {
          const pipingWithSlNo = data.piping_items.map((item, idx) => ({
            ...item,
            SlNo: item.SlNo || 25 + idx,
            Description: item.Description || item.description || "Piping Item",
            Unit: item.Unit || item.unit || "m",
            Code: item.Code || item.code || `PIPE-${item.SlNo || 25 + idx}`,
            Rate: item.Rate || item.rate || 0,
            Quantity: item.Quantity || item.quantity || 0,
            Dia: item.Dia || item.dia || item.size || "-",
            Image: item.Image || item.image || null
          }));
          console.log("🔧 Setting piping items from backend:", pipingWithSlNo.length, "items");
          setPipingItems(pipingWithSlNo);
          
          let total = 0;
          pipingWithSlNo.forEach(item => {
            const qty = Number(item.Quantity || 0);
            const rate = Number(item.Rate || 0);
            const supply = qty * rate;
            const installation = supply * INSTALLATION_PERCENT;
            total += (supply + installation);
          });
          setPipingTotals(total);
        } else {
          setPipingItems([]);
          setPipingTotals(0);
        }

        if (data.system_parameters) {
          setDynamicRates(prev => ({
            ...prev,
            filter_rate: data.system_parameters.filter_rate ?? prev.filter_rate,
            pump_rate: data.system_parameters.pump_rate ?? prev.pump_rate,
            filter_dia: data.system_parameters.filter_dia_mm ?? prev.filter_dia,
            hp: data.system_parameters.pump_hp ?? prev.hp,
            source: data.system_parameters.rate_source || prev.source
          }));
        }
        
        // ✅ UPDATE EQUIPMENT SPECS WITH BACKEND DATA
        if (data.equipment_specifications) {
          setEquipmentSpecs(prev => ({
            ...prev,
            filter_description: data.equipment_specifications.filter_description || prev.filter_description,
            pump_description: data.equipment_specifications.pump_description || prev.pump_description,
            waterfall_pump_description: data.equipment_specifications.waterfall_pump_description || prev.waterfall_pump_description,
            filter_rate: data.equipment_specifications.filter_rate || prev.filter_rate,
            pump_rate: data.equipment_specifications.pump_rate || prev.pump_rate
          }));
        }
        
        if (data.technical_specifications) {
          setEquipmentSpecs(prev => ({
            ...prev,
            filter_dia_mm: data.technical_specifications.filter_dia_mm || prev.filter_dia_mm,
            pump_hp: data.technical_specifications.pump_hp || prev.pump_hp,
            mpv_size: data.technical_specifications.mpv_size || prev.mpv_size,
            flow_rate_m3_per_h: data.technical_specifications.flow_rate_m3_per_h || prev.flow_rate_m3_per_h
          }));
        }
      }
    } catch (error) {
      console.error("❌ Error fetching MEP calculation:", error);
      setPipingItems([]);
      setPipingTotals(0);
    } finally {
      setUpdatingPiping(false);
      setLoadingPiping(false);
    }
  };

  const handleDistanceUpdate = async () => {
    console.log("🔄 Updating with new pump room distance:", pumpRoomDistance, "m");
    await fetchMepCalculationWithDistance(pumpRoomDistance);
  };

  const handleSafetyFactorUpdate = async () => {
    console.log("🔄 Updating with new safety factor:", safetyFactor);
    await fetchMepCalculationWithDistance(pumpRoomDistance);
  };

  // ================================
  // ✅ MEP TOTALS WITH EDITABLE STATE DEPENDENCIES
  // ================================
  const mepTotals = useMemo(() => {
    if (!mepItems.length) return { totalSupply: 0, totalInstallation: 0, grand: 0 };
    
    let totalSupply = 0;
    let totalInstallation = 0;
    
    mepItems.forEach((item) => {
      const sl = item.SlNo;
      if (sl >= 1 && sl <= 24) {
        const qty = getMepQuantity(sl);
        let rate = getSupplyRate(item, dynamicRates);
        
        // ✅ Override rate for item 23 if nozzle data exists
        if (sl === 23 && waterNozzleData) {
          rate = safeParseNumber(waterNozzleData.rate);
        }
        
        const supplyCost = qty * rate;
        const installationCost = supplyCost * INSTALLATION_PERCENT;
        totalSupply += supplyCost;
        totalInstallation += installationCost;
      }
    });
    
    return {
      totalSupply,
      totalInstallation,
      grand: totalSupply + totalInstallation
    };
  }, [mepItems, mepQuantities, resultData, dynamicRates, editableMepQty, waterNozzleData]);

  const mepTotal = mepTotals.grand;

  // ================================
  // ✅ CIVIL TOTAL WITH EDITABLE STATE DEPENDENCIES
  // ================================
  const civilTotal = useMemo(() => {
    if (!civilItems.length) return 0;
    
    let total = 0;
    
    civilItems.forEach((item) => {
      const sl = Number(item?.SlNo || 0);
      if (civilQuantityFields[sl]) {
        const qty = safeParseNumber(getCivilQuantity(sl));
        const rate = safeParseNumber(item?.Rate);

        if (![1, 9, 10].includes(sl)) {
          total += qty * rate;
        }
      }
    });
    
    // Subrow totals with editable support
    const qty11 = editableSubRowQty["1.1"] !== undefined ? editableSubRowQty["1.1"] : safeParseNumber(excavationSubrows["1.1"] || 0);
    const qty12 = editableSubRowQty["1.2"] !== undefined ? editableSubRowQty["1.2"] : safeParseNumber(excavationSubrows["1.2"] || 0);
    total += qty11 * 275;
    total += qty12 * 375;

    const shutteringItem = civilItems.find(i => Number(i?.SlNo) === 9);
    const shutteringRate = safeParseNumber(shutteringItem?.Rate);
    const qty91 = editableSubRowQty["9.1"] !== undefined ? editableSubRowQty["9.1"] : safeParseNumber(shutteringSubrows["9.1"] || 0);
    const qty92 = editableSubRowQty["9.2"] !== undefined ? editableSubRowQty["9.2"] : safeParseNumber(shutteringSubrows["9.2"] || 0);
    total += qty91 * shutteringRate;
    total += qty92 * shutteringRate;

    const shotcretingItem = civilItems.find(i => Number(i?.SlNo) === 10);
    const shotcretingRate = safeParseNumber(shotcretingItem?.Rate);
    const qty101 = editableSubRowQty["10.1"] !== undefined ? editableSubRowQty["10.1"] : safeParseNumber(shotcretingSubrows["10.1"] || 0);
    const qty102 = editableSubRowQty["10.2"] !== undefined ? editableSubRowQty["10.2"] : safeParseNumber(shotcretingSubrows["10.2"] || 0);
    total += qty101 * shotcretingRate;
    total += qty102 * shotcretingRate;
    
    return total;
  }, [civilItems, civilQuantities, resultData, excavationSubrows, shutteringSubrows, shotcretingSubrows, editableCivilQty, editableSubRowQty]);

  // ================================
  // ✅ PUMP ROOM TOTAL WITH EDITABLE STATE DEPENDENCIES
  // ================================
  const pumpRoomTotal = useMemo(() => {
    if (!civilItems.length) return 0;
    
    let total = 0;
    
    civilItems.forEach((item) => {
      const sl = Number(item?.SlNo || 0);
      if (sl <= 10 && pumpRoomQuantityFields[sl]) {
        const qty = safeParseNumber(getPumpRoomQuantity(sl));
        const rate = safeParseNumber(item?.Rate);
        total += qty * rate;
      }
    });
    
    return total;
  }, [civilItems, pumpRoomQuantities, resultData, editablePumpRoomQty]);

  // ================================
  // ✅ PIPING TOTALS WITH EDITABLE STATE
  // ================================
  const computedPipingTotals = useMemo(() => {
    if (!pipingItems.length) return 0;
    let total = 0;
    pipingItems.forEach(item => {
      const slNo = item.SlNo;
      const qty = editablePipingQty[slNo] !== undefined
        ? editablePipingQty[slNo]
        : Number(item.Quantity || 0);
      const rate = Number(item.Rate || 0);
      const supply = qty * rate;
      const installation = supply * INSTALLATION_PERCENT;
      total += (supply + installation);
    });
    return total;
  }, [pipingItems, editablePipingQty]);

  useEffect(() => {
    setPipingTotals(computedPipingTotals);
  }, [computedPipingTotals]);

  // Grand total (Civil + MEP + Pump Room + Piping)
  const grandTotal = useMemo(() => {
    return civilTotal + mepTotal + pumpRoomTotal + pipingTotals;
  }, [civilTotal, mepTotal, pumpRoomTotal, pipingTotals]);

  const getFinalTotal = () => {
    const gstAmount = grandTotal * 0.18;
    return grandTotal + gstAmount;
  };

  // Fetch MEP calculation when dimensions change
  useEffect(() => {
    if (dimensions?.length && dimensions?.width && dimensions?.depth) {
      fetchMepCalculationWithDistance(pumpRoomDistance);
    }
  }, [dimensions.length, dimensions.width, dimensions.depth, constructionType]);

  // ================================
  // ✅ STEP 3: FETCH WATER NOZZLE DATA
  // ================================
  useEffect(() => {
    const fetchWaterNozzle = async () => {
      try {
        if (!selectedNozzleType) {
          console.log("No nozzle type selected, using default");
          return;
        }

        const headers = getTenantAuthHeaders(navigate);
        if (!headers) return;

        console.log("🔍 Fetching water nozzles for type:", selectedNozzleType);
        
        const response = await fetch(
          `${ADMIN_API_BASE}/water-nozzles`,
          {
            method: "GET",
            headers
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch water nozzles: ${response.status}`);
        }

        const responseData = await response.json();
        const nozzleList = responseData.data || responseData;

        const matchedNozzle = nozzleList.find(
          item =>
            String(item.nozzle_type).toLowerCase() ===
            String(selectedNozzleType).toLowerCase()
        );

        if (matchedNozzle) {
          setWaterNozzleData(matchedNozzle);
        } else {
          console.warn(`⚠️ No matching nozzle found for type: ${selectedNozzleType}`);
          setWaterNozzleData(null);
        }
      } catch (error) {
        console.error("❌ Water nozzle fetch error:", error);
        setWaterNozzleData(null);
      }
    };

    fetchWaterNozzle();
  }, [selectedNozzleType, ADMIN_API_BASE, navigate]);

  // Load saved settings
  useEffect(() => {
    const savedVisibility = localStorage.getItem('waterbodyColumnVisibility');
    if (savedVisibility) {
      try {
        setColumnVisibility(JSON.parse(savedVisibility));
      } catch (e) {}
    }
    
    const savedTableSelection = localStorage.getItem('waterbodySelectedTables');
    if (savedTableSelection) {
      try {
        setSelectedTables(JSON.parse(savedTableSelection));
      } catch (e) {}
    }
    
    const savedDistance = localStorage.getItem('waterbodyPumpRoomDistance');
    if (savedDistance) {
      setPumpRoomDistance(Number(savedDistance));
    }
    
    const savedSafetyFactor = localStorage.getItem('waterbodySafetyFactor');
    if (savedSafetyFactor) {
      setSafetyFactor(Number(savedSafetyFactor));
    }
    
    const saved = localStorage.getItem('saved_waterbody_calculations');
    if (saved) {
      try {
        setSavedCalculations(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('waterbodyColumnVisibility', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  useEffect(() => {
    localStorage.setItem('waterbodySelectedTables', JSON.stringify(selectedTables));
  }, [selectedTables]);

  useEffect(() => {
    localStorage.setItem('waterbodyPumpRoomDistance', pumpRoomDistance.toString());
  }, [pumpRoomDistance]);

  useEffect(() => {
    localStorage.setItem('waterbodySafetyFactor', safetyFactor.toString());
  }, [safetyFactor]);

  // Toggle functions
  const toggleColumnVisibility = (columnName) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnName]: !prev[columnName]
    }));
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
    setSelectedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  const selectAllTables = () => {
    setSelectedTables({
      civil: true,
      pumpRoom: true,
      mep: true,
      piping: true
    });
  };

  const deselectAllTables = () => {
    setSelectedTables({
      civil: false,
      pumpRoom: false,
      mep: false,
      piping: false
    });
  };

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  // Fetch company profile
  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const companyCode = localStorage.getItem("tenant_company_code");
        if (!companyCode) return;

        const cachedProfile = localStorage.getItem("tenant_company_profile");
        if (cachedProfile) {
          try {
            setCompanyProfile(JSON.parse(cachedProfile));
          } catch (e) {}
        }

        const headers = getTenantAuthHeaders(navigate);
        if (!headers) return;

        const response = await fetch(
          `${API_BASE_URL}/admin/tenant/public-profile?company_code=${companyCode}`,
          { headers }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setCompanyProfile(data.data);
            localStorage.setItem("tenant_company_profile", JSON.stringify(data.data));
          }
        }
      } catch (err) {
        console.error("Company profile fetch error:", err);
      }
    };

    fetchCompanyProfile();
  }, [navigate]);

  // Exchange rate functions
  const refreshExchangeRate = async () => {
    setLoadingExchangeRate(true);
    setExchangeRateError(null);
    try {
      const newRate = await fetchRealTimeExchangeRate();
      setExchangeRate(newRate);
      setLastExchangeUpdate(new Date());
    } catch (error) {
      setExchangeRateError("Failed to fetch exchange rate");
    } finally {
      setLoadingExchangeRate(false);
    }
  };

  const handleCurrencyToggle = () => {
    setCurrency(prev => prev === 'INR' ? 'USD' : 'INR');
  };

  useEffect(() => {
    refreshExchangeRate();
    const interval = setInterval(refreshExchangeRate, 3600000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data from backend
  const fetchCivilItems = async () => {
    setLoadingCivil(true);
    try {
      const headers = getTenantAuthHeaders(navigate);
      if (!headers) {
        setLoadingCivil(false);
        return;
      }
      
      const response = await fetch(`${ADMIN_API_BASE}/main_pool`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setCivilItems(Array.isArray(data) ? data : []);
      } else {
        setCivilItems([]);
      }
    } catch (error) {
      console.error("Error fetching civil items:", error);
      setCivilItems([]);
    } finally {
      setLoadingCivil(false);
    }
  };

  const fetchMepItems = async () => {
    setLoadingMep(true);
    try {
      const headers = getTenantAuthHeaders(navigate);
      if (!headers) {
        setLoadingMep(false);
        return;
      }
      
      const response = await fetch(`${ADMIN_API_BASE}/waterbody_mep_items`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        let items = Array.isArray(data) ? data : [];
        items = items.filter(item => item.SlNo >= 1 && item.SlNo <= 24);
        setMepItems(items);
      } else {
        setMepItems([]);
      }
    } catch (error) {
      console.error("Error fetching MEP items:", error);
      setMepItems([]);
    } finally {
      setLoadingMep(false);
    }
  };

  useEffect(() => {
    if (civilItems.length > 0) {
      const pumpItems = civilItems.filter(
        item => item.SlNo >= 1 && item.SlNo <= 10
      );
      setPumpRoomData(pumpItems);
      setLoadingPumpRoomData(false);
    }
  }, [civilItems]);

  const fetchTemplateDescriptions = async () => {
    if (dimensions && dimensions.length && dimensions.width && dimensions.depth) {
      try {
        const headers = getTenantAuthHeaders(navigate);
        if (!headers) return;
        
        const response = await fetch(
          `${API_BASE_URL}/main/templates/${dimensions.length}/${dimensions.width}/${dimensions.depth}`,
          { headers }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.templates) {
            const cleanTemplates = {};
            Object.entries(data.templates).forEach(([key, value]) => {
              if (!hasTemplatePlaceholders(value)) {
                cleanTemplates[key] = value;
              } else {
                console.warn(`⚠️ Skipping template with placeholders for SlNo ${key}`);
              }
            });
            setTemplateDescriptions(cleanTemplates);
          }
        }
      } catch (error) {
        console.error("Error fetching template descriptions:", error);
      }
    }
  };

  // Initialize data from resultData
  useEffect(() => {
    if (resultData) {
      const processedCivilQuantities = processQuantitiesData(resultData.civil_quantities);
      setCivilQuantities(processedCivilQuantities);
      
      const processedMepQuantities = processQuantitiesData(resultData.mep_quantities);
      setMepQuantities(processedMepQuantities);
      
      setExcavationSubrows(resultData?.excavation_subrows || {});
      setShutteringSubrows(resultData?.shuttering_subrows || {});
      setShotcretingSubrows(resultData?.shotcreting_subrows || {});
      
      if (resultData.design_parameters?.construction_type) {
        setConstructionType(resultData.design_parameters.construction_type);
      }
      
      if (resultData.pump_room_quantities) {
        setPumpRoomQuantities(resultData.pump_room_quantities);
        setPumpRoomDimensions({
          length: resultData.pump_room_quantities.pr_length_2,
          width: resultData.pump_room_quantities.pr_width_2,
          height: resultData.pump_room_quantities.pr_height_2
        });
      } else {
        const civilVolume = processedCivilQuantities.volume_m3 || (dimensions.length * dimensions.width * dimensions.depth) || 0;
        const pumpRoomVolume = civilVolume * 0.15;
        const pumpLength = Math.cbrt(pumpRoomVolume);
        setPumpRoomDimensions({
          length: pumpLength,
          width: pumpLength,
          height: pumpLength
        });
      }
      
      const equipmentData = resultData.equipment_specifications || {};
      const mepData = processedMepQuantities || {};
      
      setEquipmentSpecs({
        filter_dia_mm: equipmentData.filter_dia_mm || mepData.filter_dia_mm || 400,
        pump_hp: equipmentData.pump_hp || mepData.pump_hp || 0.75,
        mpv_size: equipmentData.mpv_size || mepData.mpv_size || "1.5 inches",
        flow_rate_m3_per_h: equipmentData.flow_rate_m3_per_h || mepData.flow_rate_m3_per_h || 10.0,
        filter_description: equipmentData.filter_description || mepData.filter_description || "",
        pump_description: equipmentData.pump_description || mepData.pump_description || "",
        waterfall_pump_description: equipmentData.waterfall_pump_description || mepData.waterfall_pump_description || "",
        filter_rate: equipmentData.filter_rate || mepData.filter_rate || 0,
        pump_rate: equipmentData.pump_rate || mepData.pump_rate || 0
      });
      
      setDynamicRates({
        filter_rate: equipmentData.filter_rate || mepData.filter_rate || 0,
        pump_rate: equipmentData.pump_rate || mepData.pump_rate || 0,
        filter_description: equipmentData.filter_description || "",
        pump_description: equipmentData.pump_description || "",
        source: "calculation",
        exact_match: true,
        filter_dia: equipmentData.filter_dia_mm || mepData.filter_dia_mm,
        hp: equipmentData.pump_hp || mepData.pump_hp
      });
      
      setWaterBodyMetrics({
        volume_m3: resultData.design_parameters?.volume_m3,
        floor_area_m2: resultData.design_parameters?.floor_area_m2,
        flow_rate: equipmentData.flow_rate_m3_per_h || mepData.flow_rate_m3_per_h
      });
    }
  }, [resultData, dimensions]);

  // Fetch all data on mount
  useEffect(() => {
    fetchCivilItems();
    fetchMepItems();
    fetchTemplateDescriptions();
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown")) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Calculate colSpans
  const calculateMepColSpan = () => {
    let colSpan = 2;
    if (columnVisibility.code) colSpan++;
    if (columnVisibility.image) colSpan++;
    if (columnVisibility.unit) colSpan++;
    if (columnVisibility.qty) colSpan++;
    if (columnVisibility.fixedRate) colSpan += 2;
    colSpan += 3;
    if (columnVisibility.remarks) colSpan++;
    return colSpan;
  };

  const calculateSimpleColSpan = () => {
    let colSpan = 2;
    if (columnVisibility.code) colSpan++;
    if (columnVisibility.image) colSpan++;
    if (columnVisibility.unit) colSpan++;
    if (columnVisibility.qty) colSpan++;
    if (columnVisibility.fixedRate) colSpan++;
    colSpan++;
    if (columnVisibility.remarks) colSpan++;
    return colSpan;
  };

  const calculatePipingColSpan = () => {
    let colSpan = 2;
    if (columnVisibility.code) colSpan++;
    colSpan++;
    if (columnVisibility.image) colSpan++;
    if (columnVisibility.unit) colSpan++;
    if (columnVisibility.qty) colSpan++;
    if (columnVisibility.fixedRate) colSpan += 2;
    colSpan += 3;
    if (columnVisibility.remarks) colSpan++;
    return colSpan;
  };

  // Render functions
  const renderImage = (imageData) => {
    if (!imageData) return null;
    
    let src = imageData;
    if (!imageData.startsWith('data:image') && 
        !imageData.startsWith('http') && 
        !imageData.startsWith('/')) {
      src = `${ADMIN_API_BASE}/static/${imageData}`;
    }
    
    return (
      <img 
        src={src} 
        alt="Item" 
        className="item-image"
        onClick={() => setImageModal({ show: true, src })}
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
    );
  };

  const getDescriptionWithTemplate = (item) => {
    if (templateDescriptions && templateDescriptions[item.SlNo]) {
      return templateDescriptions[item.SlNo];
    }
    if (item.SlNo === 10 || item.SlNo === 11) {
      return `${getFinalDescription(item)} (Standard Lighting System)`;
    }
    return getFinalDescription(item);
  };

  // Component renderers
  const ConstructionTypeDisplay = () => (
    <div className="pool-type-display">
      <div className={`pool-type-badge ${constructionType}`}>
        {constructionType === "terrace" ? (
          <>
            <span className="pool-type-icon">🏢</span>
            Terrace Water Body
          </>
        ) : (
          <>
            <span className="pool-type-icon">⛰️</span>
            In-Ground Water Body
          </>
        )}
      </div>
    </div>
  );

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
        <button 
          className="reset-visibility-btn"
          onClick={resetColumnVisibility}
          title="Reset all columns to visible"
        >
          Reset All
        </button>
      </div>
      <div className="visibility-checkboxes">
        <label className="visibility-checkbox">
          <input
            type="checkbox"
            checked={columnVisibility.image}
            onChange={() => toggleColumnVisibility('image')}
          />
          <span className="checkbox-label">Image</span>
        </label>
        <label className="visibility-checkbox">
          <input
            type="checkbox"
            checked={columnVisibility.unit}
            onChange={() => toggleColumnVisibility('unit')}
          />
          <span className="checkbox-label">Unit</span>
        </label>
        <label className="visibility-checkbox">
          <input
            type="checkbox"
            checked={columnVisibility.qty}
            onChange={() => toggleColumnVisibility('qty')}
          />
          <span className="checkbox-label">QTY</span>
        </label>
        <label className="visibility-checkbox">
          <input
            type="checkbox"
            checked={columnVisibility.fixedRate}
            onChange={() => toggleColumnVisibility('fixedRate')}
          />
          <span className="checkbox-label">Fixed Rate</span>
        </label>
        <label className="visibility-checkbox">
          <input
            type="checkbox"
            checked={columnVisibility.code}
            onChange={() => toggleColumnVisibility('code')}
          />
          <span className="checkbox-label">Code</span>
        </label>
        <label className="visibility-checkbox">
          <input
            type="checkbox"
            checked={columnVisibility.remarks}
            onChange={() => toggleColumnVisibility('remarks')}
          />
          <span className="checkbox-label">Remarks</span>
        </label>
      </div>
    </div>
  );

  const TableSelectionControls = () => (
    <div className="table-selection-controls">
      <div className="selection-header">
        <span className="selection-title">Export Table Selection:</span>
        <div className="selection-buttons">
          <button 
            className="selection-btn select-all-btn"
            onClick={selectAllTables}
            title="Select all tables"
          >
            Select All
          </button>
          <button 
            className="selection-btn deselect-all-btn"
            onClick={deselectAllTables}
            title="Deselect all tables"
          >
            Deselect All
          </button>
        </div>
      </div>
      <div className="selection-checkboxes">
        <label className="selection-checkbox">
          <input
            type="checkbox"
            checked={selectedTables.civil}
            onChange={() => toggleTableSelection('civil')}
          />
          <span className="checkbox-label">Civil Works (All items with subrows)</span>
          <span className="table-count">(with subrows)</span>
        </label>
        <label className="selection-checkbox">
          <input
            type="checkbox"
            checked={selectedTables.pumpRoom}
            onChange={() => toggleTableSelection('pumpRoom')}
          />
          <span className="checkbox-label">Pump Room (10 items - 15% of Civil)</span>
          <span className="table-count">(10 items)</span>
        </label>
        <label className="selection-checkbox">
          <input
            type="checkbox"
            checked={selectedTables.mep}
            onChange={() => toggleTableSelection('mep')}
          />
          <span className="checkbox-label">MEP Systems (Items 1-24)</span>
          <span className="table-count">({mepItems.length} items)</span>
        </label>
        <label className="selection-checkbox">
          <input
            type="checkbox"
            checked={selectedTables.piping}
            onChange={() => toggleTableSelection('piping')}
          />
          <span className="checkbox-label">Piping System (Items 25+)</span>
          <span className="table-count">({pipingItems.length} items)</span>
        </label>
      </div>
    </div>
  );

  // ================================
  // ✅ RENDER CIVIL TABLE WITH EDITABLE QTY
  // ================================
  const renderCivilTable = () => {
    if (loadingCivil) {
      return <div className="loading-spinner">Loading civil data...</div>;
    }

    const filteredItems = civilItems.filter(item => civilQuantityFields[Number(item?.SlNo)]);

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
              {columnVisibility.fixedRate && <th>Fixed Rate ({getCurrencySymbol(currency)})</th>}
              <th>Amount ({getCurrencySymbol(currency)})</th>
              {columnVisibility.remarks && <th>Remarks</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const sl = Number(item?.SlNo || 0);
              const qty = safeParseNumber(getCivilQuantity(sl));
              const rate = safeParseNumber(item?.Rate);
              const amount = qty * rate;
              const hideParentValues = [1, 9, 10].includes(sl);
              const isTerraceZeroQuantity = constructionType === 'terrace' && 
                [1, 2, 3, 4, 5].includes(sl) && qty === 0;

              return (
                <React.Fragment key={sl}>
                  <tr className={isTerraceZeroQuantity ? 'terrace-zero-quantity' : ''}>
                    <td data-label="Sl.No">{sl}</td>
                    {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                    <td data-label="Description" className="description-cell">
                      {getFinalDescription(item)}
                      {isTerraceZeroQuantity && (
                        <div className="terrace-note-badge">
                          <small>🏢 Terrace: 0 quantity</small>
                        </div>
                      )}
                    </td>
                    {columnVisibility.image && (
                      <td data-label="Image" className="image-cell">
                        {item.Image ? renderImage(item.Image) : "-"}
                      </td>
                    )}
                    {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                    {columnVisibility.qty && (
                      <td data-label="QTY" className={qty ? "quantity-filled" : "quantity-zero"}>
                        {hideParentValues ? "-" : (
                          <input
                            type="number"
                            step="0.001"
                            value={qty}
                            onChange={(e) => handleQtyChange("civil", sl, e.target.value)}
                            className="qty-input"
                          />
                        )}
                      </td>
                    )}
                    {columnVisibility.fixedRate && (
                      <td data-label="Fixed Rate">
                        {hideParentValues ? "-" : formatCurrency(rate, currency, exchangeRate)}
                      </td>
                    )}
                    <td data-label="Amount" className="amount-cell">
                      {hideParentValues ? "-" : formatCurrency(amount, currency, exchangeRate)}
                    </td>
                    {columnVisibility.remarks && (
                      <td data-label="Remarks" className="remarks-cell">
                        <textarea
                          className="remarks-textbox"
                          placeholder="Add remarks..."
                          value={civilRemarks[sl] || ""}
                          onChange={(e) => setCivilRemarks(prev => ({ ...prev, [sl]: e.target.value }))}
                          rows="2"
                        />
                      </td>
                    )}
                  </tr>

                  {/* EXCAVATION SUBROWS */}
                  {sl === 1 && (
                    <>
                      <tr className="sub-row">
                        <td>1.1</td>
                        {columnVisibility.code && <td></td>}
                        <td className="sub-description">↳ Excavation up to 1.5m depth</td>
                        {columnVisibility.image && <td>{item.Image ? renderImage(item.Image) : "-"}</td>}
                        {columnVisibility.unit && <td>{item.Unit}</td>}
                        {columnVisibility.qty && (
                          <td>
                            <input
                              type="number"
                              step="0.001"
                              value={editableSubRowQty["1.1"] !== undefined ? editableSubRowQty["1.1"] : safeParseNumber(excavationSubrows["1.1"] || 0)}
                              onChange={(e) => handleQtyChange("subrow", "1.1", e.target.value)}
                              className="qty-input subrow-input"
                            />
                          </td>
                        )}
                        {columnVisibility.fixedRate && <td>₹{safeToFixed(275)}</td>}
                        <td className="amount-cell">
                          {formatCurrency((editableSubRowQty["1.1"] !== undefined ? editableSubRowQty["1.1"] : safeParseNumber(excavationSubrows["1.1"] || 0)) * 275, currency, exchangeRate)}
                        </td>
                        {columnVisibility.remarks && <td></td>}
                       </tr>

                      <tr className="sub-row">
                        <td>1.2</td>
                        {columnVisibility.code && <td></td>}
                        <td className="sub-description">↳ Excavation from 1.5m to 3.0m depth</td>
                        {columnVisibility.image && <td>{item.Image ? renderImage(item.Image) : "-"}</td>}
                        {columnVisibility.unit && <td>{item.Unit}</td>}
                        {columnVisibility.qty && (
                          <td>
                            <input
                              type="number"
                              step="0.001"
                              value={editableSubRowQty["1.2"] !== undefined ? editableSubRowQty["1.2"] : safeParseNumber(excavationSubrows["1.2"] || 0)}
                              onChange={(e) => handleQtyChange("subrow", "1.2", e.target.value)}
                              className="qty-input subrow-input"
                            />
                          </td>
                        )}
                        {columnVisibility.fixedRate && <td>₹{safeToFixed(375)}</td>}
                        <td className="amount-cell">
                          {formatCurrency((editableSubRowQty["1.2"] !== undefined ? editableSubRowQty["1.2"] : safeParseNumber(excavationSubrows["1.2"] || 0)) * 375, currency, exchangeRate)}
                        </td>
                        {columnVisibility.remarks && <td></td>}
                       </tr>
                    </>
                  )}

                  {/* SHUTTERING SUBROWS */}
                  {sl === 9 && (
                    <>
                      <tr className="sub-row">
                        <td>9.1</td>
                        {columnVisibility.code && <td></td>}
                        <td className="sub-description">↳ Retaining Wall</td>
                        {columnVisibility.image && <td>{item.Image ? renderImage(item.Image) : "-"}</td>}
                        {columnVisibility.unit && <td>{item.Unit}</td>}
                        {columnVisibility.qty && (
                          <td>
                            <input
                              type="number"
                              step="0.001"
                              value={editableSubRowQty["9.1"] !== undefined ? editableSubRowQty["9.1"] : safeParseNumber(shutteringSubrows["9.1"] || 0)}
                              onChange={(e) => handleQtyChange("subrow", "9.1", e.target.value)}
                              className="qty-input subrow-input"
                            />
                          </td>
                        )}
                        {columnVisibility.fixedRate && <td>{formatCurrency(rate, currency, exchangeRate)}</td>}
                        <td className="amount-cell">
                          {formatCurrency((editableSubRowQty["9.1"] !== undefined ? editableSubRowQty["9.1"] : safeParseNumber(shutteringSubrows["9.1"] || 0)) * rate, currency, exchangeRate)}
                        </td>
                        {columnVisibility.remarks && <td></td>}
                       </tr>

                      <tr className="sub-row">
                        <td>9.2</td>
                        {columnVisibility.code && <td></td>}
                        <td className="sub-description">↳ Raft</td>
                        {columnVisibility.image && <td>{item.Image ? renderImage(item.Image) : "-"}</td>}
                        {columnVisibility.unit && <td>{item.Unit}</td>}
                        {columnVisibility.qty && (
                          <td>
                            <input
                              type="number"
                              step="0.001"
                              value={editableSubRowQty["9.2"] !== undefined ? editableSubRowQty["9.2"] : safeParseNumber(shutteringSubrows["9.2"] || 0)}
                              onChange={(e) => handleQtyChange("subrow", "9.2", e.target.value)}
                              className="qty-input subrow-input"
                            />
                          </td>
                        )}
                        {columnVisibility.fixedRate && <td>{formatCurrency(rate, currency, exchangeRate)}</td>}
                        <td className="amount-cell">
                          {formatCurrency((editableSubRowQty["9.2"] !== undefined ? editableSubRowQty["9.2"] : safeParseNumber(shutteringSubrows["9.2"] || 0)) * rate, currency, exchangeRate)}
                        </td>
                        {columnVisibility.remarks && <td></td>}
                       </tr>
                    </>
                  )}

                  {/* SHOTCRETING SUBROWS */}
                  {sl === 10 && (
                    <>
                      <tr className="sub-row">
                        <td>10.1</td>
                        {columnVisibility.code && <td></td>}
                        <td className="sub-description">↳ Retaining Wall</td>
                        {columnVisibility.image && <td>{item.Image ? renderImage(item.Image) : "-"}</td>}
                        {columnVisibility.unit && <td>{item.Unit}</td>}
                        {columnVisibility.qty && (
                          <td>
                            <input
                              type="number"
                              step="0.001"
                              value={editableSubRowQty["10.1"] !== undefined ? editableSubRowQty["10.1"] : safeParseNumber(shotcretingSubrows["10.1"] || 0)}
                              onChange={(e) => handleQtyChange("subrow", "10.1", e.target.value)}
                              className="qty-input subrow-input"
                            />
                          </td>
                        )}
                        {columnVisibility.fixedRate && <td>{formatCurrency(rate, currency, exchangeRate)}</td>}
                        <td className="amount-cell">
                          {formatCurrency((editableSubRowQty["10.1"] !== undefined ? editableSubRowQty["10.1"] : safeParseNumber(shotcretingSubrows["10.1"] || 0)) * rate, currency, exchangeRate)}
                        </td>
                        {columnVisibility.remarks && <td></td>}
                       </tr>

                      <tr className="sub-row">
                        <td>10.2</td>
                        {columnVisibility.code && <td></td>}
                        <td className="sub-description">↳ Raft</td>
                        {columnVisibility.image && <td>{item.Image ? renderImage(item.Image) : "-"}</td>}
                        {columnVisibility.unit && <td>{item.Unit}</td>}
                        {columnVisibility.qty && (
                          <td>
                            <input
                              type="number"
                              step="0.001"
                              value={editableSubRowQty["10.2"] !== undefined ? editableSubRowQty["10.2"] : safeParseNumber(shotcretingSubrows["10.2"] || 0)}
                              onChange={(e) => handleQtyChange("subrow", "10.2", e.target.value)}
                              className="qty-input subrow-input"
                            />
                          </td>
                        )}
                        {columnVisibility.fixedRate && <td>{formatCurrency(rate, currency, exchangeRate)}</td>}
                        <td className="amount-cell">
                          {formatCurrency((editableSubRowQty["10.2"] !== undefined ? editableSubRowQty["10.2"] : safeParseNumber(shotcretingSubrows["10.2"] || 0)) * rate, currency, exchangeRate)}
                        </td>
                        {columnVisibility.remarks && <td></td>}
                       </tr>
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-total">
              <td colSpan={calculateSimpleColSpan()} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                Total:
              </td>
              <td className="amount-cell total-amount" style={{ fontWeight: 'bold' }}>
                {formatCurrency(civilTotal, currency, exchangeRate)}
              </td>
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
    if (loadingPumpRoomData) {
      return <div className="loading-spinner">Loading pump room data...</div>;
    }

    if (!pumpRoomData.length) {
      return <div className="no-data-message">No pump room data available.</div>;
    }

    const filteredItems = pumpRoomData.filter(item => item.SlNo <= 10 && pumpRoomQuantityFields[item.SlNo]);

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
              {columnVisibility.fixedRate && <th>Fixed Rate ({getCurrencySymbol(currency)})</th>}
              <th>Amount ({getCurrencySymbol(currency)})</th>
              {columnVisibility.remarks && <th>Remarks</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const sl = item.SlNo;
              const qty = getPumpRoomQuantity(sl);
              const rate = safeParseNumber(item.Rate);
              const amount = qty * rate;
              
              const isTerraceZeroQuantity = constructionType === 'terrace' && 
                [1, 2, 3, 4, 5].includes(sl) && qty === 0;

              return (
                <tr key={item.SlNo} className={isTerraceZeroQuantity ? 'terrace-zero-quantity' : ''}>
                  <td data-label="Sl.No">{sl}</td>
                  {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                  <td data-label="Description" className="description-cell">
                    {getFinalDescription(item)}
                    <div className="pump-room-badge">
                      <small>Pump Room (15% of Civil)</small>
                    </div>
                    {isTerraceZeroQuantity && (
                      <div className="terrace-pump-note">
                        <small>🏢 Terrace: 0 quantity</small>
                      </div>
                    )}
                  </td>
                  {columnVisibility.image && (
                    <td data-label="Image" className="image-cell">
                      {item.Image ? renderImage(item.Image) : "-"}
                    </td>
                  )}
                  {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                  {columnVisibility.qty && (
                    <td data-label="QTY" className={qty ? "quantity-filled" : "quantity-zero"}>
                      <input
                        type="number"
                        step="0.001"
                        value={qty}
                        onChange={(e) => handleQtyChange("pump", sl, e.target.value)}
                        className="qty-input"
                      />
                    </td>
                  )}
                  {columnVisibility.fixedRate && <td data-label="Fixed Rate">{formatCurrency(rate, currency, exchangeRate)}</td>}
                  <td data-label="Amount" className="amount-cell">{formatCurrency(amount, currency, exchangeRate)}</td>
                  {columnVisibility.remarks && (
                    <td data-label="Remarks" className="remarks-cell">
                      <textarea
                        className="remarks-textbox"
                        placeholder="Add remarks..."
                        value={pumpRoomRemarks[sl] || ""}
                        onChange={(e) => setPumpRoomRemarks(prev => ({ ...prev, [sl]: e.target.value }))}
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
              <td colSpan={calculateSimpleColSpan()} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                Total:
              </td>
              <td className="amount-cell total-amount" style={{ fontWeight: 'bold' }}>
                {formatCurrency(pumpRoomTotal, currency, exchangeRate)}
              </td>
              {columnVisibility.remarks && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  // ================================
  // ✅ RENDER MEP TABLE WITH EDITABLE QTY AND DYNAMIC ITEM 23
  // ================================
  const renderMepTable = (config, index) => {
    const items = mepItems.filter(item => item.SlNo >= config.start && item.SlNo <= config.end);
    
    if (items.length === 0) return null;

    let groupSupply = 0;
    let groupInstallation = 0;
    
    return (
      <div key={index} className="mep-table-section">
        <h3 className="mep-table-title">{config.title}</h3>
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
                {columnVisibility.fixedRate && (
                  <th colSpan="2">
                    Rate ({getCurrencySymbol(currency)})
                  </th>
                )}
                <th colSpan="3">
                  Amount ({getCurrencySymbol(currency)})
                </th>
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
              {items.map((item) => {
                let finalDescription = getFinalDescription(item);
                let finalRate = getSupplyRate(item, dynamicRates);

                // ✅ ONLY ITEM 23 USES water_nozzles TABLE
                if (item.SlNo === 23 && waterNozzleData) {
                  console.log("🎯 Applying dynamic nozzle:", waterNozzleData);
                  finalDescription = waterNozzleData.description || finalDescription;
                  finalRate = safeParseNumber(waterNozzleData.rate || 0);
                }

                // ✅ OTHER DYNAMIC ITEMS
                if (item.SlNo === 1 && dynamicRates.filter_rate > 0) {
                  finalRate = dynamicRates.filter_rate;
                }

                if (item.SlNo === 7 && dynamicRates.pump_rate > 0) {
                  finalRate = dynamicRates.pump_rate;
                }

                const sl = item.SlNo;
                const qty = getMepQuantity(sl);
                
                const installationRate = finalRate * INSTALLATION_PERCENT;
                const supplyCost = qty * finalRate;
                const installationCost = qty * installationRate;
                const totalAmount = supplyCost + installationCost;
                
                groupSupply += supplyCost;
                groupInstallation += installationCost;
                
                const isZeroQuantity = qty === 0;
                const showRateSource = (sl === 1 || sl === 7) && finalRate !== safeParseNumber(item.Rate);
                const isLightingItem = (sl === 10 || sl === 11);
                const isWaterfallNozzle = (sl === 23);
                
                return (
                  <tr key={sl} className={(isZeroQuantity && !isLightingItem) ? 'zero-quantity-row' : ''}>
                    <td data-label="Sl.No">{sl}</td>
                    {columnVisibility.code && <td data-label="Code">{item.Code || "N/A"}</td>}
                    <td data-label="Description" className="description-cell">
                      {finalDescription}
                      {showRateSource && (
                        <div className="dynamic-rate-indicator">
                          <small>
                            {dynamicRates.source === "exact" ? "✅ Exact match from mep_rates" : 
                             dynamicRates.source === "closest" ? "⚠️ Using closest match" : "❌ No match"}
                          </small>
                        </div>
                      )}
                      {isWaterfallNozzle && waterNozzleData && (
                        <div className="dynamic-nozzle-indicator">
                          <small>🎯 Dynamic Nozzle: {waterNozzleData.nozzle_type}</small>
                        </div>
                      )}
                    </td>
                    {columnVisibility.image && (
                      <td data-label="Image" className="image-cell">
                        {item.Image ? renderImage(item.Image) : "-"}
                      </td>
                    )}
                    {columnVisibility.unit && <td data-label="Unit">{item.Unit || ""}</td>}
                    {columnVisibility.qty && (
                      <td data-label="QTY" className={qty ? "quantity-filled" : "quantity-zero"}>
                        <input
                          type="number"
                          step="0.001"
                          value={qty}
                          onChange={(e) => handleQtyChange("mep", sl, e.target.value)}
                          className="qty-input"
                        />
                      </td>
                    )}
                    {columnVisibility.fixedRate && (
                      <>
                        <td data-label="Supply Rate">{formatCurrency(finalRate, currency, exchangeRate)}</td>
                        <td data-label="Installation Rate">{formatCurrency(installationRate, currency, exchangeRate)}</td>
                      </>
                    )}
                    <td data-label="Supply Cost">{formatCurrency(supplyCost, currency, exchangeRate)}</td>
                    <td data-label="Installation Cost">{formatCurrency(installationCost, currency, exchangeRate)}</td>
                    <td data-label="Total Amount" className="amount-cell">
                      {formatCurrency(totalAmount, currency, exchangeRate)}
                    </td>
                    {columnVisibility.remarks && (
                      <td data-label="Remarks" className="remarks-cell">
                        <textarea
                          className="remarks-textbox"
                          placeholder="Add remarks..."
                          value={mepRemarks[sl] || ""}
                          onChange={(e) => setMepRemarks(prev => ({ ...prev, [sl]: e.target.value }))}
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
                <td colSpan={calculateMepColSpan() - 3} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                  Subtotal:
                </td>
                <td className="amount-cell" style={{ fontWeight: 'bold' }}>
                  {formatCurrency(groupSupply, currency, exchangeRate)}
                </td>
                <td className="amount-cell" style={{ fontWeight: 'bold' }}>
                  {formatCurrency(groupInstallation, currency, exchangeRate)}
                </td>
                <td className="amount-cell" style={{ fontWeight: 'bold' }}>
                  {formatCurrency(groupSupply + groupInstallation, currency, exchangeRate)}
                </td>
                {columnVisibility.remarks && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // Render all MEP tables (Items 1-24 only)
  const renderAllMepTables = () => {
    return (
      <>
        <div className="rate-source-note">
          <span className="rate-indicator">*</span>
          <span className="rate-note-text">
            Dynamic rates applied based on filter diameter and pump HP from mep_rates table.
            Installation cost is {INSTALLATION_PERCENT * 100}% of supply cost.
          </span>
        </div>
        
        {waterNozzleData && (
          <div className="nozzle-info-note" style={{
            background: "rgba(99,179,237,0.1)",
            border: "1px solid rgba(99,179,237,0.25)",
            borderRadius: "8px",
            padding: "10px 15px",
            marginBottom: "15px",
            fontSize: "13px"
          }}>
            <span style={{ color: "#63b3ed", fontWeight: "600" }}>🎯 Active Nozzle:</span>
            <span style={{ marginLeft: "10px" }}>{waterNozzleData.nozzle_type} - {waterNozzleData.description}</span>
            <span style={{ marginLeft: "10px", fontWeight: "600" }}>Rate: {formatCurrency(waterNozzleData.rate, currency, exchangeRate)}</span>
          </div>
        )}
        
        <div className="waterbody-mep-notice" style={{
          background: "rgba(99,179,237,0.05)",
          border: "1px solid rgba(99,179,237,0.15)",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "20px"
        }}>
          <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
            <span style={{ color: "#63b3ed", fontWeight: 600 }}>💧 Water Body MEP:</span> 
            Items 1-24 include complete filtration, pumping, lighting, and cleaning equipment.
            Lighting system (SlNo 10 & 11) is a standard MEP item and always included.
            <strong> Waterfall Nozzle (SlNo 23) dynamically updates based on selected nozzle type.</strong>
            Piping system (Items 25+) is handled separately in the Piping System tab.
          </p>
        </div>
        
        {mepTableConfigs.map((config, index) => renderMepTable(config, index))}
        
        <div className="mep-grand-total">
          <div className="grand-total-box">
            <div className="total-breakdown">
              <div className="breakdown-item">
                <span className="breakdown-label">Total MEP Supply (Items 1-24):</span>
                <span className="breakdown-value">{formatCurrency(mepTotals.totalSupply, currency, exchangeRate)}</span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Total MEP Installation (Items 1-24):</span>
                <span className="breakdown-value">{formatCurrency(mepTotals.totalInstallation, currency, exchangeRate)}</span>
              </div>
              <div className="breakdown-total">
                <span className="breakdown-label">Total MEP Cost:</span>
                <span className="breakdown-value">{formatCurrency(mepTotal, currency, exchangeRate)}</span>
              </div>
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

    if (loadingPiping || updatingPiping) {
      return (
        <div className="loading-spinner">
          Loading piping data...
        </div>
      );
    }

    if (!pipingItems || pipingItems.length === 0) {
      return (
        <div className="no-data-message">
          <div className="info-message">
            <span className="info-icon">ℹ️</span>
            <strong>No piping items found for this Water Body configuration.</strong>
          </div>
          <p>Dimensions: {dimensions.length}×{dimensions.width}×{dimensions.depth}m | Pump Room Distance: {pumpRoomDistance}m</p>
          <p>Try adjusting the pump room distance to see if piping items appear.</p>
        </div>
      );
    }

    let totalSupply = 0;
    let totalInstallation = 0;
    let totalGrand = 0;

    const processedItems = pipingItems.map((item, idx) => {
      const slNo = item.SlNo || 25 + idx;
      const qty = editablePipingQty[slNo] !== undefined
        ? editablePipingQty[slNo]
        : Number(item.Quantity || item.quantity || 0);
      const rate = Number(item.Rate || item.rate || 0);
      
      const supplyAmount = qty * rate;
      const installationAmount = supplyAmount * INSTALLATION_PERCENT;
      const totalAmount = supplyAmount + installationAmount;
      
      totalSupply += supplyAmount;
      totalInstallation += installationAmount;
      totalGrand += totalAmount;
      
      return {
        slNo: slNo,
        code: item.Code || item.code || `PIPE-${item.SlNo || 25 + idx}`,
        description: getFinalDescription(item),
        dia: item.Dia || item.dia || item.size || "-",
        quantity: qty,
        unit: item.Unit || item.unit || "m",
        rate: rate,
        supplyAmount: supplyAmount,
        installationAmount: installationAmount,
        totalAmount: totalAmount,
        image: item.Image || item.image || null
      };
    });

    return (
      <div className="piping-system-section">
        <div className="section-header">
          <h2 className="section-title">Piping System - Water Body (Items 25+)</h2>
          <div className="header-controls">
            <div className="total-amount-box">
              <span className="total-label">Total Piping Cost:</span>
              <span className="total-value">{formatCurrency(totalGrand, currency, exchangeRate)}</span>
            </div>
            <div className="item-count-badge">
              {processedItems.length} items
            </div>
          </div>
        </div>

        <div className="piping-distance-input" style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "15px",
          padding: "12px 15px",
          background: "rgba(99,179,237,0.08)",
          borderRadius: "8px",
          border: "1px solid rgba(99,179,237,0.2)",
          flexWrap: "wrap"
        }}>
          <label style={{ fontWeight: "600", color: "#63b3ed" }}>
            🏭 Pump Room Distance (m):
          </label>
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={pumpRoomDistance}
            onChange={(e) => setPumpRoomDistance(Number(e.target.value))}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              width: "100px",
              background: "#fff",
              color: "#333"
            }}
          />
          <button
            onClick={handleDistanceUpdate}
            disabled={updatingPiping}
            style={{
              padding: "6px 12px",
              background: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: updatingPiping ? "not-allowed" : "pointer",
              opacity: updatingPiping ? 0.7 : 1
            }}
          >
            {updatingPiping ? "Updating..." : "Update Piping"}
          </button>
          
          <div style={{ marginLeft: "auto", fontSize: "12px", color: "#888" }}>
            Current Distance: {pumpRoomDistance} m
          </div>
        </div>

        <div className="piping-safety-input" style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
          padding: "12px 15px",
          background: "rgba(245,158,11,0.08)",
          borderRadius: "8px",
          border: "1px solid rgba(245,158,11,0.2)",
          flexWrap: "wrap"
        }}>
          <label style={{ fontWeight: "600", color: "#f59e0b" }}>
            🔧 Safety Factor:
          </label>
          <input
            type="number"
            min="1.0"
            max="1.5"
            step="0.05"
            value={safetyFactor}
            onChange={(e) => setSafetyFactor(Number(e.target.value))}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              width: "80px",
              background: "#fff",
              color: "#333"
            }}
          />
          <button
            onClick={handleSafetyFactorUpdate}
            disabled={updatingPiping}
            style={{
              padding: "6px 12px",
              background: "#f59e0b",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: updatingPiping ? "not-allowed" : "pointer",
              opacity: updatingPiping ? 0.7 : 1
            }}
          >
            {updatingPiping ? "Updating..." : "Apply Safety Factor"}
          </button>
          
          <div style={{ marginLeft: "auto", fontSize: "12px", color: "#888" }}>
            Current Factor: {safetyFactor * 100}%
          </div>
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
                {columnVisibility.fixedRate && (
                  <th colSpan="2">
                    Rate ({getCurrencySymbol(currency)})
                  </th>
                )}
                <th colSpan="3">
                  Amount ({getCurrencySymbol(currency)})
                </th>
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
              {processedItems.map((item, idx) => {
                const isZeroQuantity = item.quantity === 0;
                
                return (
                  <tr key={idx} className={isZeroQuantity ? 'zero-quantity-row' : ''}>
                    <td data-label="Sl.No">{item.slNo}</td>
                    {columnVisibility.code && <td data-label="Code">{item.code}</td>}
                    <td data-label="Description" className="description-cell">
                      {item.description}
                      <div className="piping-item-badge">
                        <small>🔩 Piping Item</small>
                      </div>
                    </td>
                    <td data-label="Dia (mm)">{item.dia !== "-" && item.dia !== null ? `${item.dia} mm` : "-"}</td>
                    {columnVisibility.image && (
                      <td data-label="Image" className="image-cell">
                        {item.image ? renderImage(item.image) : "-"}
                      </td>
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
                        <td data-label="Supply Rate">{formatCurrency(item.rate, currency, exchangeRate)}</td>
                        <td data-label="Installation Rate">{formatCurrency(item.rate * INSTALLATION_PERCENT, currency, exchangeRate)}</td>
                      </>
                    )}
                    <td data-label="Supply Cost">{formatCurrency(item.supplyAmount, currency, exchangeRate)}</td>
                    <td data-label="Installation Cost">{formatCurrency(item.installationAmount, currency, exchangeRate)}</td>
                    <td data-label="Total Amount" className="amount-cell">{formatCurrency(item.totalAmount, currency, exchangeRate)}</td>
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
                );
              })}
            </tbody>
            <tfoot>
              <tr className="table-total">
                <td colSpan={calculatePipingColSpan()} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                  Total:
                </td>
                <td className="amount-cell" style={{ fontWeight: 'bold' }}>
                  {formatCurrency(totalSupply, currency, exchangeRate)}
                </td>
                <td className="amount-cell" style={{ fontWeight: 'bold' }}>
                  {formatCurrency(totalInstallation, currency, exchangeRate)}
                </td>
                <td className="amount-cell total-amount" style={{ fontWeight: 'bold' }}>
                  {formatCurrency(totalGrand, currency, exchangeRate)}
                </td>
                {columnVisibility.remarks && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="boq-note">
          <div>
            <strong>Note:</strong> Piping quantities are calculated based on Water Body dimensions ({dimensions.length}m × {dimensions.width}m × {dimensions.depth}m), 
            pump room distance ({pumpRoomDistance}m), and MEP equipment specifications. All diameters are in millimeters (mm). Installation cost is {INSTALLATION_PERCENT * 100}% of supply cost.
            <br />
            <span className="waterbody-piping-note" style={{ color: "#63b3ed", fontSize: "11px" }}>
              💧 Water body piping system includes all required pipes, fittings, and valves for proper water circulation and filtration. Items start from SlNo 25.
            </span>
            <br />
            <span className="distance-note" style={{ color: "#f59e0b", fontSize: "11px" }}>
              🏭 Pump room distance affects pipe lengths - longer distance increases piping material quantities.
            </span>
          </div>
        </div>
      </div>
    );
  };

  // PDF download
  const downloadPDF = async () => {
    try {
      const selectedTableCount = Object.values(selectedTables).filter(Boolean).length;
      if (selectedTableCount === 0) {
        alert("⚠️ Please select at least one table to export!");
        return;
      }

      const safeCivilItems = Array.isArray(civilItems) ? civilItems : [];
      const safeMepItems = Array.isArray(mepItems) ? mepItems : [];
      const safePumpRoomItems = Array.isArray(pumpRoomData) ? pumpRoomData : [];
      const safePipingItems = Array.isArray(pipingItems) ? pipingItems : [];
      const safeCivilQuantities = civilQuantities || {};
      const safeMepQuantities = mepQuantities || {};
      const safePumpRoomQuantities = pumpRoomQuantities || {};
      const safeDynamicRates = dynamicRates || {};
      const safeCompanyProfile = companyProfile || {};

      const safePipingTotal = typeof pipingTotals === "object"
        ? (pipingTotals?.grandTotal || pipingTotals?.total || 0)
        : Number(pipingTotals || 0);

      const distance = pumpRoomDistance || 15;
      const detectedPoolType = resultData?.pool_type || resultData?.system_parameters?.pool_type || "waterbody";

      await generatePDF({
        resultData: resultData || {},
        poolType: detectedPoolType,
        constructionType: constructionType || "in-ground",
        dimensions: dimensions || {},
        pumpRoomDimensions: pumpRoomDimensions || {},
        mainPoolItems: selectedTables.civil ? safeCivilItems : [],
        mainPoolTotal: selectedTables.civil ? Number(civilTotal || 0) : 0,
        civilQuantities: safeCivilQuantities,
        mainPoolRemarks: civilRemarks || {},
        mepItems: selectedTables.mep ? safeMepItems : [],
        mepQuantities: safeMepQuantities,
        mepTotal: Number(mepTotal || 0),
        mepRemarks: mepRemarks || {},
        includePumpRoom: selectedTables.pumpRoom,
        pumpRoomItems: selectedTables.pumpRoom ? safePumpRoomItems : [],
        pumpRoomQuantities: safePumpRoomQuantities,
        pumpRoomTotal: selectedTables.pumpRoom ? Number(pumpRoomTotal || 0) : 0,
        pumpRoomRemarks: pumpRoomRemarks || {},
        pipingItems: selectedTables.piping ? safePipingItems : [],
        pipingTotal: Number(safePipingTotal || 0),
        pumpRoomDistance: distance,
        dynamicRates: safeDynamicRates,
        templateDescriptions: templateDescriptions || {},
        selectedTables: selectedTables || {},
        columnVisibility: columnVisibility || {},
        currency: currency || "INR",
        exchangeRate: exchangeRate || 83.0,
        companyProfile: safeCompanyProfile,
        waterBodySpecs: waterBodySpecs || {},
        waterBodyMetrics: waterBodyMetrics || {},
        excavationSplit: excavationSubrows || {},
        shutteringSplit: shutteringSubrows || {},
        shotcretingSplit: shotcretingSubrows || {},
        balanceTankItems: [],
        balanceTankQuantities: {},
        hasBalancingTank: false,
        selectedAdvancedEquipment: [],
        waterNozzleData: waterNozzleData,
      });
    } catch (error) {
      console.error("❌ WaterBody PDF Error:", error);
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

    await generateWaterBodyExcelReport({
      resultData,
      civilItems: selectedTables.civil ? civilItems : [],
      mepItems: selectedTables.mep ? mepItems : [],
      pumpRoomData: selectedTables.pumpRoom ? pumpRoomData : [],
      pipingItems: selectedTables.piping ? pipingItems : [],
      dimensions,
      totalMepWithPipes: mepTotal,
      civilTotal: selectedTables.civil ? civilTotal : 0,
      pumpRoomTotal: selectedTables.pumpRoom ? pumpRoomTotal : 0,
      pipingTotal: selectedTables.piping ? pipingTotals : 0,
      civilRemarks,
      mepRemarks,
      pumpRoomRemarks,
      currentRates: dynamicRates,
      currency,
      exchangeRate,
      includePumpRoom: true,
      pumpRoomDimensions,
      mepQuantities,
      equipmentSpecs,
      pumpRoomQuantities,
      constructionType,
      columnVisibility,
      selectedTables,
      percentageItems: [],
      fallbackPercentageItems: [],
      waterBodyMetrics,
      waterBodySpecs,
      companyProfile,
      pumpRoomDistance,
      safetyFactor,
      excavationSubrows: excavationSubrows || {},
      shutteringSubrows: shutteringSubrows || {},
      shotcretingSubrows: shotcretingSubrows || {},
      editableCivilQty,
      editablePumpRoomQty,
      editableMepQty,
      editablePipingQty,
      editableSubRowQty,
      waterNozzleData,
    });
  };

  // Save calculation
  const saveCalculation = () => {
    try {
      const newCalc = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        dimensions: dimensions ? `${dimensions.length} × ${dimensions.width} × ${dimensions.depth} m` : "N/A",
        poolType: 'waterbody',
        totalCost: grandTotal,
        civilCost: civilTotal,
        mepCost: mepTotal,
        pumpRoomCost: pumpRoomTotal,
        pipingCost: pipingTotals,
        pumpRoomDistance: pumpRoomDistance,
        safetyFactor: safetyFactor,
        constructionType: constructionType,
        includePumpRoom: true,
        civilRemarks,
        mepRemarks,
        pumpRoomRemarks,
        civilQuantities,
        mepQuantities,
        pumpRoomQuantities,
        equipmentSpecs,
        dynamicRates,
        currency,
        exchangeRate,
        columnVisibility,
        selectedTables,
        pipingItems,
        excavationSubrows,
        shutteringSubrows,
        shotcretingSubrows,
        mepTotals: {
          totalSupply: mepTotals.totalSupply,
          totalInstallation: mepTotals.totalInstallation,
          grand: mepTotal
        },
        selectedNozzleType,
        waterNozzleData,
      };

      const existing = JSON.parse(localStorage.getItem("saved_waterbody_calculations") || "[]");

      const isDuplicate = existing.some(calc => {
        const sameDimensions = JSON.stringify(calc.dimensions) === JSON.stringify(dimensions);
        const sameDistance = calc.pumpRoomDistance === pumpRoomDistance;
        return sameDimensions && sameDistance && calc.poolType === 'waterbody';
      });

      if (isDuplicate) {
        alert("⚠️ A calculation with these dimensions and distance already exists!");
        return;
      }

      const updated = [newCalc, ...existing]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);

      localStorage.setItem("saved_waterbody_calculations", JSON.stringify(updated));
      setSavedCalculations(updated);
      alert("✅ Calculation saved successfully!");
    } catch (error) {
      console.error("Error saving calculation:", error);
      alert("❌ Failed to save calculation.");
    }
  };

  // Prepare data for save project
  const resultDataForSave = {
    project_type: "waterbody",
    main_pool_total: civilTotal,
    pump_room_total: pumpRoomTotal,
    balance_tank_total: 0,
    mep_total: mepTotal,
    piping_total: pipingTotals,
    pump_room_distance: pumpRoomDistance,
    piping_safety_factor: safetyFactor,
    working_days: resultData?.working_days || 0,
    pool_specification: {
      length: dimensions?.length || 0,
      width: dimensions?.width || 0,
      depth: dimensions?.depth || 0,
      volume: waterBodyMetrics.volume_m3 || 0,
      flow_rate: equipmentSpecs.flow_rate_m3_per_h || 0
    },
    system_settings: {
      construction_type: constructionType,
      include_pump_room: includePumpRoom,
      has_balancing_tank: hasBalancingTank
    },
    totals: {
      subtotal: grandTotal,
      gst: grandTotal * 0.18,
      final_total: getFinalTotal()
    },
    selected_nozzle_type: selectedNozzleType,
    water_nozzle_data: waterNozzleData
  };

  // ================================
  // MAIN RENDER WITH SKIMMER LAYOUT
  // ================================
  return (
    <div className="result-page waterbody-result-page">
      <style>
        {`
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
          .dynamic-nozzle-indicator {
            margin-top: 4px;
            font-size: 11px;
            color: #63b3ed;
            background: rgba(99,179,237,0.1);
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
          }
        `}
      </style>

      <header className="header-section">
        <div className="page-header">
          <div className="header-content">
            <h1>Water Body Calculation Results</h1>
            <p className="subtitle">Complete breakdown of civil works (with subrows), MEP systems, pump room construction, and piping system</p>
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
            <h3 style={{ marginBottom: "3%", color: "gray" }}>Views</h3>
            <div className="sidebar-tab-buttons">
              {[
                { id: 1, icon: "📊", label: "Specifications" },
                { id: 2, icon: "💧", label: `Civil Works (${civilItems.filter(item => civilQuantityFields[Number(item?.SlNo)]).length})` },
                { id: 3, icon: "🔧", label: `MEP Systems (${mepItems.length})` },
                { id: 4, icon: "⚙️", label: `Pump Room (${pumpRoomData.length})` },
                { id: "piping", icon: "🔩", label: `Piping (${pipingItems.length})` },
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
                    resultData,
                    dimensions,
                    mainPoolTotal: civilTotal,
                    mepTotal: mepTotal,
                    pipingTotal: pipingTotals,
                    pumpRoomTotal: pumpRoomTotal,
                    grandTotal,
                    poolType: "waterbody",
                    includePumpRoom,
                    hasBalancingTank: false,
                    selectedAdvancedEquipment: [],
                    includeHeatPump: false,
                    companyProfile,
                    currency,
                    exchangeRate,
                    dynamicRates,
                    pumpRoomDistance: pumpRoomDistance,
                    safetyFactor: safetyFactor,
                    filteredMainPoolItems: civilItems,
                    filteredMepItems: mepItems,
                    pumpRoomItems: pumpRoomData,
                    balanceTankItems: [],
                    pipingItems: pipingItems,
                    mainPoolRemarks: civilRemarks,
                    mepRemarks: mepRemarks,
                    pumpRoomRemarks: pumpRoomRemarks,
                    templateDescriptions,
                    civilQuantities,
                    mepQuantities,
                    pumpRoomQuantities,
                    balanceTankQuantities: {},
                    selectedTables,
                    columnVisibility,
                    excavationSubrows,
                    shutteringSubrows,
                    shotcretingSubrows,
                    waterNozzleData,
                  }
                });
              }}>
                <span className="sidebar-tab-icon">📄</span>
                <span className="btn-text">Proforma Invoice</span>
              </button>
              <button className="sidebar-action-btn" onClick={() => {
                navigate('/waterbodydelivery', {
                  state: {
                    result: resultData,
                    dimensions,
                    mainPoolData: selectedTables.civil ? civilItems : [],
                    mepItems: selectedTables.mep ? mepItems : [],
                    pumpRoomData: selectedTables.pumpRoom ? pumpRoomData : [],
                    pipingItems: selectedTables.piping ? pipingItems : [],
                    mainPoolTotal: civilTotal,
                    mepTotal: mepTotal,
                    pumpRoomTotal: pumpRoomTotal,
                    pipingTotal: pipingTotals,
                    waterBodyMetrics,
                    pumpRoomDimensions,
                    pumpRoomQuantities,
                    mepQuantities,
                    equipmentSpecs,
                    constructionType,
                    poolType: 'waterbody',
                    hasBalancingTank: true,
                    includePumpRoom: true,
                    currency,
                    exchangeRate,
                    currentRates: dynamicRates,
                    columnVisibility,
                    selectedTables,
                    templateDescriptions: {},
                    percentageItems: [],
                    fallbackPercentageItems: [],
                    pumpRoomDistance: pumpRoomDistance,
                    safetyFactor: safetyFactor,
                    percentageAmounts: {
                      item25: 0,
                      item26: 0,
                      item27: 0,
                      item28: 0,
                    },
                    excavationSubrows,
                    shutteringSubrows,
                    shotcretingSubrows,
                    waterNozzleData,
                  }
                });
              }}>
                <span className="sidebar-tab-icon">📦</span>
                <span className="btn-text">Delivery Challan</span>
              </button>
              <button className="sidebar-action-btn" onClick={() => {
                navigate('/tax', {
                  state: {
                    result: resultData,
                    dimensions,
                    mainPoolData: selectedTables.civil ? civilItems : [],
                    mepItems: selectedTables.mep ? mepItems : [],
                    pumpRoomData: selectedTables.pumpRoom ? pumpRoomData : [],
                    pipingItems: selectedTables.piping ? pipingItems : [],
                    mainPoolTotal: civilTotal,
                    mepTotal: mepTotal,
                    pumpRoomTotal: pumpRoomTotal,
                    pipingTotal: pipingTotals,
                    templateDescriptions,
                    poolType: 'waterbody',
                    hasBalancingTank: true,
                    currency,
                    exchangeRate,
                    includePumpRoom: true,
                    pumpRoomDimensions,
                    seatingCapacity: 0,
                    waterJets: 0,
                    airControllers: 0,
                    mepQuantities,
                    equipmentSpecs,
                    currentRates: dynamicRates,
                    constructionType,
                    columnVisibility,
                    selectedTables,
                    finalTotal: grandTotal,
                    selectedAdvancedEquipment: [],
                    pumpRoomDistance: pumpRoomDistance,
                    safetyFactor: safetyFactor,
                    percentageAmounts: {
                      item25: 0,
                      item26: 0,
                      item27: 0,
                      item28: 0,
                    },
                    excavationSubrows,
                    shutteringSubrows,
                    shotcretingSubrows,
                    waterNozzleData,
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
              ) : !dimensions.length ? (
                <div className="error-message">No calculation data available. Please run a calculation first.</div>
              ) : (
                <>
                  <div className="section-header">
                    <h2 className="section-title">Water Body Specifications</h2>
                    <div className="header-controls"><ConstructionTypeDisplay /></div>
                  </div>
                  
                  <div className="rate-source-display">
                    <span className="rate-source-label">Filter Rate Source:</span>
                    <span className={`rate-source-value ${dynamicRates.source}`}>
                      {dynamicRates.source === "exact" ? "✅ Exact match from mep_rates table" : 
                       dynamicRates.source === "closest" ? "⚠️ Closest match from mep_rates table" : 
                       "❌ No match in mep_rates table"}
                    </span>
                  </div>

                  {selectedNozzleType && waterNozzleData && (
                    <div className="nozzle-spec-display" style={{
                      background: "rgba(99,179,237,0.1)",
                      padding: "10px 15px",
                      borderRadius: "8px",
                      marginBottom: "15px"
                    }}>
                      <span className="nozzle-label" style={{ fontWeight: "600" }}>🎯 Selected Nozzle:</span>
                      <span style={{ marginLeft: "10px" }}>{waterNozzleData.nozzle_type}</span>
                      <span style={{ marginLeft: "15px", color: "#63b3ed" }}>{waterNozzleData.description}</span>
                      <span style={{ marginLeft: "15px", fontWeight: "600" }}>Rate: {formatCurrency(waterNozzleData.rate, currency, exchangeRate)}</span>
                    </div>
                  )}
                  
                  <div className="specs-container_1">
                    <div className="specs-table-container">
                      <div className="specs-table-wrapper">
                        <table className="excel-preview-table">
                          <tbody>
                            <tr><td className="spec-label"><strong>Dimensions</strong></td><td className="spec-value">{dimensions?.length || 0} × {dimensions?.width || 0} × {dimensions?.depth || 0} m</td></tr>
                            <tr><td className="spec-label"><strong>Shape</strong></td><td className="spec-value">{waterBodySpecs.shape || 'Rectangular'}</td></tr>
                            <tr><td className="spec-label"><strong>Volume</strong></td><td className="spec-value">{waterBodyMetrics.volume_m3 ? safeToFixed(waterBodyMetrics.volume_m3) : 'Calculating...'} m³</td></tr>
                            <tr><td className="spec-label"><strong>Floor Area</strong></td><td className="spec-value">{waterBodyMetrics.floor_area_m2 ? safeToFixed(waterBodyMetrics.floor_area_m2) : 'Calculating...'} m²</td></tr>
                            <tr><td className="spec-label"><strong>Turnover Time</strong></td><td className="spec-value">{waterBodySpecs.turnover || equipmentSpecs.turnover_time_hours || 4} hours</td></tr>
                            <tr><td className="spec-label"><strong>Flow Rate</strong></td><td className="spec-value">{equipmentSpecs.flow_rate_m3_per_h ? safeToFixed(equipmentSpecs.flow_rate_m3_per_h) : 'Calculating...'} m³/h</td></tr>
                            <tr><td className="spec-label"><strong>Filter Diameter</strong></td><td className="spec-value">{dynamicRates.filter_dia || equipmentSpecs.filter_dia_mm || "N/A"} mm</td></tr>
                            <tr><td className="spec-label"><strong>Pump Capacity</strong></td><td className="spec-value">{dynamicRates.hp || equipmentSpecs.pump_hp || "N/A"} HP</td></tr>
                            <tr><td className="spec-label"><strong>MPV Size</strong></td><td className="spec-value">{equipmentSpecs.mpv_size || "Not Defined"}</td></tr>
                            <tr><td className="spec-label"><strong>Construction Type</strong></td><td className="spec-value">{constructionType === "terrace" ? "Terrace" : "In-Ground"}</td></tr>
                            <tr><td className="spec-label"><strong>Pump Room</strong></td><td className="spec-value">Included (15% of Civil Works)</td></tr>
                            <tr><td className="spec-label"><strong>Pump Room Distance</strong></td><td className="spec-value">{pumpRoomDistance} m</td></tr>
                            <tr><td className="spec-label"><strong>Safety Factor</strong></td><td className="spec-value">{safetyFactor * 100}%</td></tr>
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
                <h2>Civil Works - Water Body Structure (All Items with Subrows)</h2>
                <div className="header-controls">
                  <ConstructionTypeDisplay />
                  <div className="total-amount-box">
                    <span className="total-label">Civil Works Total:</span>
                    <span className="total-value">{formatCurrency(civilTotal, currency, exchangeRate)}</span>
                  </div>
                </div>
              </div>
              {loadingCivil ? <div className="loading-spinner">Loading data...</div> : renderCivilTable()}
              <div className="boq-note">
                <div>
                  <strong>Note:</strong> The estimates provided are based on current industry standards and average material costs.
                  Actual costs may vary depending on location, specific material selections, and site conditions.
                  <span className="small">Variations of ±10–15% from the estimate are common.</span>
                  <br />
                  <span style={{ color: "#63b3ed", fontSize: "11px" }}>
                    💧 Subrow quantities (1.1, 1.2, 9.1, 9.2, 10.1, 10.2) are sourced from backend excavation_subrows, shuttering_subrows, and shotcreting_subrows.
                  </span>
                  {constructionType === "terrace" && (
                    <div className="terrace-note">
                      <strong>Terrace Construction Note:</strong> This configuration includes structural works only and excludes excavation, soling, PCC, and backfilling items (SlNo 1-5 show 0 quantity).
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === 3 && (
            <section className="tab-content active">
              <div className="section-header">
                <h2>MEP (Mechanical, Electrical, Plumbing) Systems (Items 1-24)</h2>
                <div className="header-controls">
                  <ConstructionTypeDisplay />
                  <div className="total-amount-box">
                    <span className="total-label">MEP Total:</span>
                    <span className="total-value">{formatCurrency(mepTotal, currency, exchangeRate)}</span>
                  </div>
                </div>
              </div>
              {loadingMep ? <div className="loading-spinner">Loading MEP data...</div> : !Array.isArray(mepItems) || mepItems.length === 0 ? 
                <div className="error-message">No MEP items available. Please check database.</div> : renderAllMepTables()}
              <div className="boq-note">
                <div>
                  <strong>Note:</strong> MEP items 1-24 include all filtration, pumping, lighting, and cleaning equipment.
                  <strong className="lighting-highlight">💡 Lighting items (SlNo 10 & 11) are standard MEP items and always included in the calculation.</strong>
                  <strong className="nozzle-highlight">🎯 Waterfall Nozzle (SlNo 23) dynamically updates based on selected nozzle type.</strong>
                  Pipes, fittings, valves, and installation for piping are handled separately in the Piping System tab (Items 25+).
                  Installation cost is {INSTALLATION_PERCENT * 100}% of supply cost.
                </div>
              </div>
            </section>
          )}

          {activeTab === 4 && (
            <section className="tab-content active">
              <div className="section-header">
                <h2>Pump Room - Civil Construction (10 Items - 15% of Civil)</h2>
                <div className="header-controls">
                  <ConstructionTypeDisplay />
                  <div className="total-amount-box">
                    <span className="total-label">Pump Room Total:</span>
                    <span className="total-value">{formatCurrency(pumpRoomTotal, currency, exchangeRate)}</span>
                  </div>
                </div>
              </div>
              {pumpRoomDimensions && Object.keys(pumpRoomDimensions).length > 0 && (
                <div className="pump-room-specs">
                  <h3>Pump Room Specifications</h3>
                  <div className="specs-grid">
                    <div className="spec-item"><span className="spec-label">Pump Room Dimensions:</span><span className="spec-value">{safeToFixed(pumpRoomDimensions.length, 2)} × {safeToFixed(pumpRoomDimensions.width, 2)} × {safeToFixed(pumpRoomDimensions.height, 2)} m</span></div>
                    <div className="spec-item"><span className="spec-label">Pump Room Area:</span><span className="spec-value">{safeToFixed(pumpRoomDimensions.length * pumpRoomDimensions.width, 2)} m²</span></div>
                    <div className="spec-item"><span className="spec-label">Distance from Pool:</span><span className="spec-value">{pumpRoomDistance} m</span></div>
                    <div className="spec-item"><span className="spec-label">Based on Civil Works:</span><span className="spec-value">15% of Civil quantities (Items 1-10)</span></div>
                  </div>
                </div>
              )}
              <div className="pump-room-section"><h3>Pump Room Construction Details (10 Items - 15% of Civil)</h3>{renderPumpRoomTable()}</div>
            </section>
          )}

          {activeTab === "piping" && renderPipingTable()}

          {activeTab === 5 && (
            <section className="tab-content active">
              <Timeline 
                poolSize={dimensions} 
                resultData={resultData} 
                currency={currency}
                exchangeRate={exchangeRate}
                includePumpRoom={true}
                pumpRoomDimensions={pumpRoomDimensions}
                poolType="waterbody"
                seatingCapacity={0}
                waterJets={0}
                airControllers={0}
                constructionType={constructionType}
                columnVisibility={columnVisibility}
                selectedTables={selectedTables}
                mepItems={mepItems}
                pipingItems={pipingItems}
                pipingTotal={pipingTotals}
                pumpRoomDistance={pumpRoomDistance}
              />
            </section>
          )}

          {activeTab === "total" && (
            <section className="tab-content active">
              <div className="section-header"><h2 className="section-title">Total Water Body Cost Summary</h2><div className="header-controls"><ConstructionTypeDisplay /></div></div>
              <div className="summary-cards">
                <div className="summary-card"><div className="summary-icon">💧</div><div className="summary-details"><h3>Civil Works (All items with subrows)</h3><p className="summary-amount">{formatCurrency(civilTotal, currency, exchangeRate)}</p></div></div>
                <div className="summary-card"><div className="summary-icon">🔧</div><div className="summary-details"><h3>MEP Systems ({mepItems.length} items)</h3><p className="summary-amount">{formatCurrency(mepTotal, currency, exchangeRate)}</p></div></div>
                <div className="summary-card"><div className="summary-icon">⚙️</div><div className="summary-details"><h3>Pump Room (10 items - 15% of Civil)</h3><p className="summary-amount">{formatCurrency(pumpRoomTotal, currency, exchangeRate)}</p><p className="summary-small">Distance: {pumpRoomDistance}m</p></div></div>
                <div className="summary-card"><div className="summary-icon">🔩</div><div className="summary-details"><h3>Piping System (Items 25+)</h3><p className="summary-amount">{formatCurrency(pipingTotals, currency, exchangeRate)}</p><p className="summary-small">{pipingItems.length} items | Distance: {pumpRoomDistance}m</p></div></div>
              </div>
              
              <div className="grand-total_1">
                <h3 className="grand-total-title_1">Grand Total</h3>
                {(() => {
                  const gstAmount = grandTotal * 0.18;
                  const grandTotalWithGST = grandTotal + gstAmount;
                  return (
                    <>
                      <div className="amount-breakdown_1">
                        <div className="breakdown-item_1"><span className="breakdown-label_1">Subtotal:</span><span className="breakdown-value_1">{formatCurrency(grandTotal, currency, exchangeRate)}</span></div>
                        <div className="breakdown-item_1"><span className="breakdown-label_1">GST @ 18%:</span><span className="breakdown-value_1">{formatCurrency(gstAmount, currency, exchangeRate)}</span></div>
                      </div>
                      <div className="grand-total-amount_1">{formatCurrency(grandTotalWithGST, currency, exchangeRate)}<span className="gst-label_1"> (incl. GST)</span></div>
                    </>
                  );
                })()}
                <p className="grand-total-note_1">
                  Includes all civil works (with subrows), MEP systems (Items 1-24 with {INSTALLATION_PERCENT * 100}% installation), pump room construction (15% of Civil Works), and complete piping system (Items 25+)
                  {constructionType === 'terrace' && ' (Terrace installation)'}<br />
                  <span className="tax-disclaimer_1">All prices include 18% GST as per applicable tax regulations</span>
                </p>
              </div>
            </section>
          )}

          {activeTab === "visualization" && (
            <section className="tab-content active">
              <div className="section-header"><h2 className="section-title">Cost Breakdown Visualization</h2><div className="header-controls"><ConstructionTypeDisplay /></div></div>
              <CostBreakdownChart 
                mainPoolCost={civilTotal} 
                mepCost={mepTotal}
                balanceTankCost={pumpRoomTotal}
                pipingCost={pipingTotals}
                currency={currency}
                exchangeRate={exchangeRate}
                includePumpRoom={true}
                poolType="waterbody"
                seatingCapacity={0}
                waterJets={0}
                airControllers={0}
                equipmentSpecs={equipmentSpecs}
                currentRates={dynamicRates}
                pumpRoomDimensions={pumpRoomDimensions}
                pumpRoomDistance={pumpRoomDistance}
                constructionType={constructionType}
                columnVisibility={columnVisibility}
                selectedTables={selectedTables}
                percentageAmounts={{
                  item25: 0,
                  item26: 0,
                  item27: 0,
                  item28: 0,
                }}
                baseMepTotal={mepTotal}
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

      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="share-modal-close" onClick={() => setShowShareModal(false)}>✕</button>
            <ShareResults
              resultData={resultData}
              mainPoolData={selectedTables.civil ? civilItems.filter(item => civilQuantityFields[Number(item?.SlNo)]) : []}
              pumpRoomData={selectedTables.pumpRoom ? pumpRoomData.filter(item => item.SlNo <= 10 && pumpRoomQuantityFields[item.SlNo]) : []}
              mepItems={selectedTables.mep ? mepItems.filter(item => item.SlNo >= 1 && item.SlNo <= 24) : []}
              pipingItems={selectedTables.piping ? pipingItems : []}
              dimensions={dimensions}
              totalMep={selectedTables.mep ? mepTotal : 0}
              mainPoolTotal={selectedTables.civil ? civilTotal : 0}
              pumpRoomTotal={selectedTables.pumpRoom ? pumpRoomTotal : 0}
              pipingTotal={selectedTables.piping ? pipingTotals : 0}
              finalTotal={grandTotal}
              balancingTankTotal={0}
              balanceTankTotal={0}
              balancingRows={[]}
              balanceTankData={[]}
              hasBalancingTank={false}
              mainPoolRemarks={civilRemarks}
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
              includePumpRoom={selectedTables.pumpRoom}
              poolType="waterbody"
              constructionType={constructionType}
              selectedAdvancedEquipment={[]}
              columnVisibility={columnVisibility}
              selectedTables={selectedTables}
              apiBaseUrl={`${API_BASE_URL}/admin`}
              filteredMepItems={selectedTables.mep ? mepItems.filter(item => item.SlNo >= 1 && item.SlNo <= 24) : []}
              templateDescriptions={templateDescriptions || {}}
            />
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
          mainPoolCost={civilTotal}
          balancingTankCost={pumpRoomTotal}
          mepCost={mepTotal}
          pipingCost={pipingTotals}
          mainPoolRemarks={civilRemarks}
          balancingTankRemarks={pumpRoomRemarks}
          mepRemarks={mepRemarks}
          currentRates={dynamicRates}
          currency={currency}
          exchangeRate={exchangeRate}
          includePumpRoom={true}
          pumpRoomDimensions={pumpRoomDimensions}
          poolType="waterbody"
          seatingCapacity={0}
          waterJets={0}
          airControllers={0}
          equipmentSpecs={equipmentSpecs}
          pumpRoomQuantities={pumpRoomQuantities}
          constructionType={constructionType}
          columnVisibility={columnVisibility}
          selectedTables={selectedTables}
          mepItems={mepItems}
          pipingItems={pipingItems}
          pumpRoomDistance={pumpRoomDistance}
          percentageAmounts={{
            item25: 0,
            item26: 0,
            item27: 0,
            item28: 0,
          }}
        />
      )}

      <SaveProjectModal open={saveOpen} onClose={() => setSaveOpen(false)} resultData={resultDataForSave} dimensions={dimensions} projectType="waterbody" />

      <footer className="action-buttons">
        <button className="download-button" onClick={saveCalculation}><span className="button-icon">💾</span> Save Calculation</button>
        <button className="download-button" onClick={() => navigate("/waterbody-calculator")}><span className="button-icon">←</span> Back to Calculator</button>
        <button className="download-button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><span className="button-icon">↑</span> Back to top</button>
      </footer>
    </div>
  );
}

export default WaterBodyResultPage;