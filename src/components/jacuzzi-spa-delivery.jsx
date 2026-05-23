import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./delivery1.css";

// Safe formatter to avoid invalid values
function safeToFixed(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.00";
  }
  return Number(value).toFixed(decimals);
}

// Function to clean text for PDF (remove special characters)
function cleanTextForPDF(text) {
  if (!text) return "";
  return text
    .replace(/&/g, 'and')
    .replace(/</g, '')
    .replace(/>/g, '')
    .replace(/"/g, '')
    .replace(/'/g, '')
    .replace(/\*/g, '')
    .replace(/#/g, '');
}

// Safe number parser
function safeParseNumber(value, defaultValue = 0) {
  if (value === null || value === undefined) return defaultValue;
  
  if (typeof value === 'object' && value !== null) {
    if (value.value !== undefined) return safeParseNumber(value.value, defaultValue);
    if (value.qty !== undefined) return safeParseNumber(value.qty, defaultValue);
    if (value.quantity !== undefined) return safeParseNumber(value.quantity, defaultValue);
    if (value.amount !== undefined) return safeParseNumber(value.amount, defaultValue);
    if (value.QTY !== undefined) return safeParseNumber(value.QTY, defaultValue);
    
    try {
      const stringValue = JSON.stringify(value);
      const numericString = stringValue.replace(/[^\d.]/g, '');
      const parsed = parseFloat(numericString);
      if (!isNaN(parsed)) return parsed;
    } catch (e) {
      console.error('Error parsing object:', e);
    }
    
    return defaultValue;
  }
  
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function JacuzziSpaDeliveryChallan() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Tenant branding state
  const [companyProfile, setCompanyProfile] = useState(null);
  const [brandingLoading, setBrandingLoading] = useState(true);
  
  console.log("📍 Location state received:", location.state);
  
  // Get data passed from jacuzzi results page - COMPLETE EXTRACTION
  const {
    // Result data - PRIMARY SOURCE for all authoritative data
    result,
    dimensions = {},
    
    // Main pool data and costs
    mainPoolData = [],
    mainPoolTotal = 0,
    
    // MEP data and costs
    mepItems = [],
    mepTotal = 0,
    
    // Pump room data and costs
    pumpRoomData = [],
    pumpRoomTotal = 0,
    
    // Quantities - These should come from resultData primarily
    civilQuantities: propCivilQuantities = {},
    mepQuantities: propMepQuantities = {},
    pumpRoomQuantities: propPumpRoomQuantities = {},
    
    // Jacuzzi specific data
    pumpRoomDimensions = {},
    seatingCapacity = 4,
    waterJets = 16,
    airControllers = 4,
    equipmentSpecs = {},
    constructionType = 'in-ground',
    
    // Currency data
    currency = 'INR',
    exchangeRate = 83.0,
    
    // Advanced equipment selection
    selectedAdvancedEquipment = [],
    
    // Column visibility and table selection
    columnVisibility = {},
    selectedTables = {},
    
    // Percentage amounts (items 30-33)
    percentageAmounts = {},
    
    // Pool metrics
    poolMetrics = {},
    jacuzziSpecs = {},
    
    // Include pump room flag
    includePumpRoom = true,
    
    // Pool type
    poolType = 'jacuzzi'
  } = location.state || {};

  // Fetch tenant branding on component mount
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const companyCode = localStorage.getItem("tenant_company_code");
        
        if (!companyCode) {
          console.warn("No tenant_company_code found");
          setBrandingLoading(false);
          return;
        }

        const response = await fetch(
          `https://pool-costing-api.intelithon.in/admin/tenant/public-profile?company_code=${companyCode}`
        );

        const result = await response.json();

        if (result.success && result.data) {
          const profile = result.data;
          setCompanyProfile(profile);
          localStorage.setItem(
            "tenant_company_profile",
            JSON.stringify(profile)
          );
        }
      } catch (error) {
        console.error("Branding fetch error:", error);
      } finally {
        setBrandingLoading(false);
      }
    };

    fetchBranding();
  }, []);

  // ✅ PRIORITY 1: Use quantities from result (backend authoritative data)
  // ✅ PRIORITY 2: Fall back to props passed directly
  const civilQuantities = result?.civil_quantities || propCivilQuantities || {};
  const mepQuantities = result?.mep_quantities || propMepQuantities || {};
  const pumpRoomQuantities = result?.pump_room_quantities || propPumpRoomQuantities || {};

  console.log("📊 Quantities extracted:", {
    civilQuantities: Object.keys(civilQuantities),
    mepQuantities: Object.keys(mepQuantities),
    pumpRoomQuantities: Object.keys(pumpRoomQuantities)
  });

  // ✅ NORMALIZE ALL DATA ARRAYS FROM MULTIPLE SOURCES
  // First, check what's in result
  console.log("🔍 Result structure:", {
    hasCivilMaterials: !!result?.civil_materials,
    civilMaterialsLength: result?.civil_materials?.length,
    hasMepMaterials: !!result?.mep_materials,
    mepMaterialsLength: result?.mep_materials?.length,
    hasPumpRoomMaterials: !!result?.pump_room_materials,
    pumpRoomMaterialsLength: result?.pump_room_materials?.length
  });

  // ✅ Normalize Civil Works data (Main Pool)
  const normalizedMainPoolData = (() => {
    // Priority 1: Use mainPoolData if it exists and has items
    if (Array.isArray(mainPoolData) && mainPoolData.length > 0) {
      console.log("✅ Using mainPoolData:", mainPoolData.length);
      return mainPoolData;
    }
    // Priority 2: Use result.civil_materials
    if (Array.isArray(result?.civil_materials) && result.civil_materials.length > 0) {
      console.log("✅ Using result.civil_materials:", result.civil_materials.length);
      return result.civil_materials;
    }
    console.log("⚠️ No civil materials found");
    return [];
  })();

  // ✅ Normalize MEP data
  const normalizedMepItems = (() => {
    // Priority 1: Use mepItems if it exists and has items
    if (Array.isArray(mepItems) && mepItems.length > 0) {
      console.log("✅ Using mepItems:", mepItems.length);
      return mepItems;
    }
    // Priority 2: Use result.mep_materials
    if (Array.isArray(result?.mep_materials) && result.mep_materials.length > 0) {
      console.log("✅ Using result.mep_materials:", result.mep_materials.length);
      return result.mep_materials;
    }
    console.log("⚠️ No MEP materials found");
    return [];
  })();

  // ✅ Normalize Pump Room data
  const normalizedPumpRoomData = (() => {
    // Priority 1: Use pumpRoomData if it exists and has items
    if (Array.isArray(pumpRoomData) && pumpRoomData.length > 0) {
      console.log("✅ Using pumpRoomData:", pumpRoomData.length);
      return pumpRoomData;
    }
    // Priority 2: Use result.pump_room_materials
    if (Array.isArray(result?.pump_room_materials) && result.pump_room_materials.length > 0) {
      console.log("✅ Using result.pump_room_materials:", result.pump_room_materials.length);
      return result.pump_room_materials;
    }
    console.log("⚠️ No pump room materials found");
    return [];
  })();

  console.log("📊 Normalized data lengths:", {
    mainPool: normalizedMainPoolData.length,
    mep: normalizedMepItems.length,
    pumpRoom: normalizedPumpRoomData.length
  });

  // Log sample items to verify structure
  if (normalizedMainPoolData.length > 0) {
    console.log("📋 Sample main pool item:", normalizedMainPoolData[0]);
  }
  if (normalizedMepItems.length > 0) {
    console.log("📋 Sample MEP item:", normalizedMepItems[0]);
  }

  // State for delivery data
  const [deliveryData, setDeliveryData] = useState({
    challanNo: "",
    date: new Date().toISOString().split('T')[0],
    fromCompanyName: "",
    fromAddress: "",
    fromContact: "",
    fromGST: "",
    customerName: "",
    customerAddress: "",
    contactPerson: "",
    contactNumber: "",
    projectName: "Jacuzzi/Spa Construction",
    deliveryAddress: "",
    preparedBy: "",
    authorizedBy: "",
    receivedBy: "",
    deliveryStatus: "pending",
    vehicleNumber: "",
    driverName: "",
    driverContact: "",
    notes: "Handle with care. Store in dry place. All electrical equipment must be kept dry. Earth Excavation and Backfilling items excluded from delivery."
  });

  // Update delivery data with company profile when available
  useEffect(() => {
    if (companyProfile) {
      setDeliveryData(prev => ({
        ...prev,
        fromCompanyName: companyProfile.company_name || "Pool Costing Platform",
        fromAddress: companyProfile.address || "Address not provided",
        fromGST: companyProfile.gst_number ? `GSTIN: ${companyProfile.gst_number}` : "",
        fromContact: `${companyProfile.phone || ""}${companyProfile.phone && companyProfile.email ? " | " : ""}${companyProfile.email || ""}`.trim()
      }));
    }
  }, [companyProfile]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Use separate states for each type of items
  const [mainPoolItems, setMainPoolItems] = useState([]);
  const [mepItemsList, setMepItemsList] = useState([]);
  const [pumpRoomItems, setPumpRoomItems] = useState([]);
  
  // Selection states for each category
  const [selectedMainPoolItems, setSelectedMainPoolItems] = useState(new Set());
  const [selectedMepItems, setSelectedMepItems] = useState(new Set());
  const [selectedPumpRoomItems, setSelectedPumpRoomItems] = useState(new Set());
  
  // Editable quantities state
  const [editedQuantities, setEditedQuantities] = useState({});

  // ================================
  // STANDARDIZED MAPPING OBJECTS WITH DB SlNo KEYS (MATCHING JACUZZI RESULT PAGE)
  // ================================

  // Main Pool quantity mapping - DB SlNo 14-25 to quantity field
  const MAIN_POOL_QTY_MAP = {
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
    12: "Tiling_QTY"             // UI 12
  };

  // MEP quantity mapping - DB SlNo 99-131 to quantity field
  const MEP_QTY_MAP = {
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
    15: "ChlorinePump_QTY",
    16: "DosingTank_QTY",
    17: "Stirrer_QTY",
    18: "FloatingHose_QTY",
    19: "Brush_QTY",
    20: "Algae_QTY",
    21: "Net_QTY",
    22: "Handle_QTY",
    23: "VacuumHead_QTY",
    24: "TestKit_QTY",
    25: "CurvedBrush_QTY",
    // Jacuzzi specific items
    26: "water_jet_qty",
    27: "air_controller_qty",
    28: "jet_pump_qty",
    // Advanced equipment
    29: "HeatPump_QTY"    // UI 33 - 25% (percentage item)
  };

  // PUMP ROOM QUANTITY MAPPING - DB SlNo 14-23 to quantity field (_2 suffix)
  const PUMP_ROOM_QTY_MAP = {
    1: "EarthExcavation_QTY_2",
    2: "BackFilling_QTY_2",
    3: "Soling_QTY_2",
    4: "plaincement_QTY_2",
    5: "BurntBrick_QTY_2",
    6: "steelreinforcement_QTY_2",
    7: "Shuttering_QTY_2",
    8: "shotcreting_QTY_2",
    9: "WaterProofing_QTY_2",
    10: "plastering_QTY_2",           // UI 10
  };

  // ================================
  // CONVERT DB SlNo TO UI DISPLAY INDEX
  // ================================

  // Convert DB SlNo to UI display index
  const getUiDisplayIndex = (dbSlNo, itemType) => {
    if (itemType === 'mainPool') {
      // Main pool DB SlNo: 14-25 -> UI: 1-12
      const mainPoolDbSlNos = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
      const index = mainPoolDbSlNos.indexOf(parseInt(dbSlNo));
      return index !== -1 ? index + 1 : dbSlNo;
    } 
    else if (itemType === 'mep') {
      // MEP DB SlNo: 99-131 -> UI: 1-33
      const mepMapping = {
        99: 1, 100: 2, 101: 3, 102: 4, 103: 5, 104: 6, 105: 7, 106: 8,
        107: 9, 108: 10, 109: 11, 110: 12, 111: 13, 112: 14, 113: 15,
        114: 16, 115: 17, 116: 18, 117: 19, 118: 20, 119: 21, 120: 22,
        121: 23, 122: 24, 123: 25, 124: 26, 125: 27, 126: 28, 127: 29,
        128: 30, 129: 31, 130: 32, 131: 33
      };
      return mepMapping[parseInt(dbSlNo)] || dbSlNo;
    }
    else if (itemType === 'pumpRoom') {
      // Pump room DB SlNo: 14-23 -> UI: 1-10
      const pumpRoomDbSlNos = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
      const index = pumpRoomDbSlNos.indexOf(parseInt(dbSlNo));
      return index !== -1 ? index + 1 : dbSlNo;
    }
    return dbSlNo;
  };

  // ================================
  // QUANTITY EXTRACTION FUNCTIONS
  // ================================

  // Get quantity from civil_quantities
  const getCivilQuantity = (dbSlNo) => {
    const quantityField = MAIN_POOL_QTY_MAP[dbSlNo];
    
    console.log(`🔍 Getting civil quantity for DB SlNo ${dbSlNo}, field: ${quantityField}`);
    
    // Try multiple sources in order of priority
    let quantity = 0;
    
    // 1. PRIMARY SOURCE: From civilQuantities (which comes from result.civil_quantities)
    if (quantityField && civilQuantities && civilQuantities[quantityField] !== undefined) {
      quantity = safeParseNumber(civilQuantities[quantityField]);
      console.log(`✅ PRIMARY: Found in civilQuantities[${quantityField}]:`, quantity);
      return quantity;
    }
    
    // 2. SECONDARY SOURCE: From result?.civil_quantities (fallback)
    if (quantityField && result?.civil_quantities && result.civil_quantities[quantityField] !== undefined) {
      quantity = safeParseNumber(result.civil_quantities[quantityField]);
      console.log(`✅ SECONDARY: Found in result.civil_quantities[${quantityField}]:`, quantity);
      return quantity;
    }
    
    // 3. TERTIARY SOURCE: Try to get from item if it has quantity field
    const item = normalizedMainPoolData.find(i => parseInt(i.SlNo) === parseInt(dbSlNo));
    if (item) {
      if (item.quantity !== undefined) {
        quantity = safeParseNumber(item.quantity);
        console.log(`✅ TERTIARY: Found in item.quantity:`, quantity);
        return quantity;
      } else if (item.QTY !== undefined) {
        quantity = safeParseNumber(item.QTY);
        console.log(`✅ TERTIARY: Found in item.QTY:`, quantity);
        return quantity;
      } else if (item.Quantity !== undefined) {
        quantity = safeParseNumber(item.Quantity);
        console.log(`✅ TERTIARY: Found in item.Quantity:`, quantity);
        return quantity;
      }
    }
    
    console.log(`❌ No quantity found for DB SlNo ${dbSlNo}`);
    return 0;
  };

  // Get MEP quantity
  const getMepQuantity = (dbSlNo) => {
    const quantityField = MEP_QTY_MAP[dbSlNo];
    
    console.log(`🔍 Getting MEP quantity for DB SlNo ${dbSlNo}, field: ${quantityField}`);
    
    // For percentage items (128-131), return 1 for display
    if (dbSlNo >= 128 && dbSlNo <= 131) {
      return 1;
    }
    
    // For heater (127) - only if selected
    if (dbSlNo === 127) {
      return selectedAdvancedEquipment.includes(127) ? 1 : 0;
    }
    
    // Try multiple sources in order of priority
    let quantity = 0;
    
    // 1. PRIMARY SOURCE: From mepQuantities (which comes from result.mep_quantities)
    if (quantityField && mepQuantities && mepQuantities[quantityField] !== undefined) {
      quantity = safeParseNumber(mepQuantities[quantityField]);
      console.log(`✅ PRIMARY: Found in mepQuantities[${quantityField}]:`, quantity);
      return quantity;
    }
    
    // 2. SECONDARY SOURCE: From result?.mep_quantities
    if (quantityField && result?.mep_quantities && result.mep_quantities[quantityField] !== undefined) {
      quantity = safeParseNumber(result.mep_quantities[quantityField]);
      console.log(`✅ SECONDARY: Found in result.mep_quantities[${quantityField}]:`, quantity);
      return quantity;
    }
    
    // 3. TERTIARY SOURCE: Try to get from item if it has quantity field
    const item = normalizedMepItems.find(i => parseInt(i.SlNo) === parseInt(dbSlNo));
    if (item) {
      if (item.quantity !== undefined) {
        quantity = safeParseNumber(item.quantity);
        console.log(`✅ TERTIARY: Found in item.quantity:`, quantity);
        return quantity;
      } else if (item.QTY !== undefined) {
        quantity = safeParseNumber(item.QTY);
        console.log(`✅ TERTIARY: Found in item.QTY:`, quantity);
        return quantity;
      } else if (item.Quantity !== undefined) {
        quantity = safeParseNumber(item.Quantity);
        console.log(`✅ TERTIARY: Found in item.Quantity:`, quantity);
        return quantity;
      }
    }
    
    console.log(`❌ No quantity found for MEP DB SlNo ${dbSlNo}`);
    return 0;
  };

  // Get pump room quantity
  const getPumpRoomQuantity = (dbSlNo) => {
    const quantityField = PUMP_ROOM_QTY_MAP[dbSlNo];
    
    console.log(`🔍 Getting pump room quantity for DB SlNo ${dbSlNo}, field: ${quantityField}`);
    
    // Try multiple sources in order of priority
    let quantity = 0;
    
    // 1. PRIMARY SOURCE: From pumpRoomQuantities (which comes from result.pump_room_quantities)
    if (quantityField && pumpRoomQuantities && pumpRoomQuantities[quantityField] !== undefined) {
      quantity = safeParseNumber(pumpRoomQuantities[quantityField]);
      console.log(`✅ PRIMARY: Found in pumpRoomQuantities[${quantityField}]:`, quantity);
      return quantity;
    }
    
    // 2. SECONDARY SOURCE: From result?.pump_room_quantities
    if (quantityField && result?.pump_room_quantities && result.pump_room_quantities[quantityField] !== undefined) {
      quantity = safeParseNumber(result.pump_room_quantities[quantityField]);
      console.log(`✅ SECONDARY: Found in result.pump_room_quantities[${quantityField}]:`, quantity);
      return quantity;
    }
    
    // 3. TERTIARY SOURCE: Try to get from item if it has quantity field
    const item = normalizedPumpRoomData.find(i => parseInt(i.SlNo) === parseInt(dbSlNo));
    if (item) {
      if (item.quantity !== undefined) {
        quantity = safeParseNumber(item.quantity);
        console.log(`✅ TERTIARY: Found in item.quantity:`, quantity);
        return quantity;
      } else if (item.QTY !== undefined) {
        quantity = safeParseNumber(item.QTY);
        console.log(`✅ TERTIARY: Found in item.QTY:`, quantity);
        return quantity;
      } else if (item.Quantity !== undefined) {
        quantity = safeParseNumber(item.Quantity);
        console.log(`✅ TERTIARY: Found in item.Quantity:`, quantity);
        return quantity;
      }
    }
    
    // For terrace construction, set certain items to 0
    if (constructionType === 'terrace') {
      const terraceExcludedFields = [
        "EarthExcavation_QTY_2",
        "BackFilling_QTY_2", 
        "Soling_QTY_2",
        "plaincement_QTY_2",
        "BurntBrick_QTY_2"
      ];
      
      if (terraceExcludedFields.includes(quantityField)) {
        console.log(`🏗️ Terrace construction - setting ${quantityField} to 0`);
        return 0;
      }
    }
    
    console.log(`❌ No quantity found for Pump Room DB SlNo ${dbSlNo}`);
    return 0;
  };

  // Get final quantity with edited override
  const getFinalQty = (section, slNo, originalQty) => {
    const key = `${section}_${slNo || 'noSlNo'}`;
    return editedQuantities[key] !== undefined ? editedQuantities[key] : originalQty;
  };

  // Handle quantity change
  const handleQtyChange = (section, slNo, value) => {
    const key = `${section}_${slNo || 'noSlNo'}`;
    setEditedQuantities(prev => ({
      ...prev,
      [key]: Number(value) || 0
    }));
  };

  // ================================
  // DESCRIPTION FUNCTIONS
  // ================================

  // Get main pool description
  const getMainPoolDescription = (item) => {
    return item.Description || item.description || item.Item || "Description not available";
  };

  // Get MEP description with Jacuzzi-specific details
  const getMepDescription = (item) => {
    const dbSlNo = parseInt(item.SlNo);
    let description = item.Description || item.description || item.Item || "MEP Equipment";
    
    // Add Jacuzzi-specific details
    switch (dbSlNo) {
      case 99: // Filter
        if (equipmentSpecs?.filter_dia_mm) {
          description = `Filter (${equipmentSpecs.filter_dia_mm}mm) with MPV ${equipmentSpecs?.mpv_size || ''}`;
        }
        break;
        
      case 105: // Circulation Pump
        if (equipmentSpecs?.pump_hp) {
          description = `Circulation Pump - ${equipmentSpecs.pump_hp}HP`;
        }
        break;
        
      case 126: // Jet Pump
        description = `Jacuzzi Jet Pump ${equipmentSpecs?.jet_pump_hp ? equipmentSpecs.jet_pump_hp + 'HP' : ''} - Fixed rate: ₹52,500`;
        break;
        
      case 127: // Heater
        if (selectedAdvancedEquipment.includes(127)) {
          description = `Heater ${equipmentSpecs?.heater_kw ? equipmentSpecs.heater_kw + 'kW' : ''} (Selected)`;
        } else {
          description = `Heater (Not Selected)`;
        }
        break;
        
      case 128: // Pipes & Fittings
        description = "Pipes & Fittings (UPVC/CPVC) - 28% of Base MEP + Equipment";
        break;
        
      case 129: // Ball & Check Valves
        description = "Ball Valves & Check Valves - 10% of Base MEP + Equipment";
        break;
        
      case 130: // Puddle Flanges
        description = "Puddle Flanges & Gaskets - 2% of Base MEP + Equipment";
        break;
        
      case 131: // Installation
        description = "Installation & Commissioning - 25% of Total";
        break;
    }
    
    return description;
  };

  // Get pump room description
  const getPumpRoomDescription = (item) => {
    return item.Description || item.description || item.Item || "Description not available";
  };

  // Generate challan number - RUNS ONLY ONCE
  useEffect(() => {
    const generateChallanNo = () => {
      const timestamp = new Date().getTime();
      const random = Math.floor(Math.random() * 1000);
      return `JC-DC-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${random}`;
    };

    setDeliveryData(prev => ({
      ...prev,
      challanNo: generateChallanNo()
    }));
  }, []);

  // Process delivery items from jacuzzi data - SHOW ALL ITEMS
  useEffect(() => {
    const processDeliveryItems = () => {
      setLoading(true);
      setError(null);

      try {
        console.log("🔄 Processing delivery items for Jacuzzi/Spa");
        console.log("📊 Normalized MainPoolData received:", normalizedMainPoolData.length, "items");
        console.log("📊 Normalized MepItems received:", normalizedMepItems.length, "items");
        console.log("📊 Normalized PumpRoomData received:", normalizedPumpRoomData.length, "items");

        // Process main pool items - using normalized data
        const mainPoolDelivery = normalizedMainPoolData
          .filter(item => {
            const slNo = parseInt(item.SlNo);
            return slNo >= 1 && slNo <= 12;
          })
          .map(item => {
            const slNo = parseInt(item.SlNo);
            const originalQuantity = getCivilQuantity(slNo);
            const finalQuantity = getFinalQty('mainPool', slNo, originalQuantity);
            return {
              ...item,
              SlNo: slNo,
              deliveryQuantity: finalQuantity,
              originalQuantity: originalQuantity,
              deliveryStatus: finalQuantity > 0 ? 'pending' : 'not-required',
              deliveryRemarks: '',
              description: getMainPoolDescription(item),
              uiSlNo: getUiDisplayIndex(slNo, 'mainPool')
            };
          });

        console.log("✅ Main Pool Items Processed:", mainPoolDelivery.length);
        console.log("✅ Main Pool Items with quantity > 0:", mainPoolDelivery.filter(i => i.deliveryQuantity > 0).length);
        
        if (mainPoolDelivery.length > 0) {
          console.log("✅ Main Pool Sample:", mainPoolDelivery.slice(0, 2));
        }

        // Process MEP items - using normalized data
        const mepDelivery = normalizedMepItems
          .filter(item => {
            const slNo = parseInt(item.SlNo);
            return slNo >= 1 && slNo <= 29;
          })
          .map(item => {
            const slNo = parseInt(item.SlNo);
            const originalQuantity = getMepQuantity(slNo);
            const finalQuantity = getFinalQty('mep', slNo, originalQuantity);
            const description = getMepDescription(item);
            
            return {
              ...item,
              SlNo: slNo,
              deliveryQuantity: finalQuantity,
              originalQuantity: originalQuantity,
              deliveryStatus: finalQuantity > 0 ? 'pending' : 'not-required',
              deliveryRemarks: '',
              description: description,
              uiSlNo: getUiDisplayIndex(slNo, 'mep')
            };
          });

        console.log("✅ MEP Items Processed:", mepDelivery.length);
        console.log("✅ MEP Items with quantity > 0:", mepDelivery.filter(i => i.deliveryQuantity > 0).length);
        
        if (mepDelivery.length > 0) {
          console.log("✅ MEP Sample:", mepDelivery.slice(0, 2));
        }

        // Process PUMP ROOM ITEMS - using normalized data
        const pumpRoomDelivery = normalizedPumpRoomData
          .filter(item => {
            const slNo = parseInt(item.SlNo);
            return slNo >= 1 && slNo <= 10;
          })
          .map(item => {
            const slNo = parseInt(item.SlNo);
            const originalQuantity = getPumpRoomQuantity(slNo);
            const finalQuantity = getFinalQty('pumpRoom', slNo, originalQuantity);
            return {
              ...item,
              SlNo: slNo,
              deliveryQuantity: finalQuantity,
              originalQuantity: originalQuantity,
              deliveryStatus: finalQuantity > 0 ? 'pending' : 'not-required',
              deliveryRemarks: '',
              description: getPumpRoomDescription(item),
              uiSlNo: getUiDisplayIndex(slNo, 'pumpRoom')
            };
          });

        console.log("✅ Processed Pump Room Items:", pumpRoomDelivery.length);
        console.log("✅ Pump Room Items with quantity > 0:", pumpRoomDelivery.filter(i => i.deliveryQuantity > 0).length);

        setMainPoolItems(mainPoolDelivery);
        setMepItemsList(mepDelivery);
        setPumpRoomItems(pumpRoomDelivery);

        // Initialize items with quantity > 0 as selected by default
        const mainPoolSelected = mainPoolDelivery
          .map((item, index) => item.deliveryQuantity > 0 ? index : null)
          .filter(index => index !== null);
        
        const mepSelected = mepDelivery
          .map((item, index) => item.deliveryQuantity > 0 ? index : null)
          .filter(index => index !== null);
        
        const pumpRoomSelected = pumpRoomDelivery
          .map((item, index) => item.deliveryQuantity > 0 ? index : null)
          .filter(index => index !== null);

        setSelectedMainPoolItems(new Set(mainPoolSelected));
        setSelectedMepItems(new Set(mepSelected));
        setSelectedPumpRoomItems(new Set(pumpRoomSelected));

        console.log("✅ Selection initialized:", {
          mainPool: mainPoolSelected.length,
          mep: mepSelected.length,
          pumpRoom: pumpRoomSelected.length
        });

      } catch (error) {
        console.error("Error processing delivery items:", error);
        setError(`Failed to process delivery items: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    // Process if we have normalized data
    if (
      normalizedMainPoolData.length > 0 ||
      normalizedMepItems.length > 0 ||
      normalizedPumpRoomData.length > 0
    ) {
      processDeliveryItems();
    } else {
      console.warn("⚠️ No normalized data available to process delivery items");
      setLoading(false);
    }
  }, [normalizedMainPoolData, normalizedMepItems, normalizedPumpRoomData, civilQuantities, mepQuantities, pumpRoomQuantities, constructionType, selectedAdvancedEquipment, result]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setDeliveryData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle item status change
  const handleItemStatusChange = (type, index, value) => {
    const updateFunctions = {
      'mainPool': setMainPoolItems,
      'mep': setMepItemsList,
      'pumpRoom': setPumpRoomItems
    };

    const updateFunction = updateFunctions[type];
    if (updateFunction) {
      updateFunction(prev => {
        const newItems = [...prev];
        newItems[index] = {
          ...newItems[index],
          deliveryStatus: value
        };
        return newItems;
      });
    }
  };

  // Handle item remarks change
  const handleItemRemarksChange = (type, index, value) => {
    const updateFunctions = {
      'mainPool': setMainPoolItems,
      'mep': setMepItemsList,
      'pumpRoom': setPumpRoomItems
    };

    const updateFunction = updateFunctions[type];
    if (updateFunction) {
      updateFunction(prev => {
        const newItems = [...prev];
        newItems[index] = {
          ...newItems[index],
          deliveryRemarks: value
        };
        return newItems;
      });
    }
  };

  // Selection handlers
  const handleSelectItem = (category, index) => {
    const selectionSetters = {
      'mainPool': setSelectedMainPoolItems,
      'mep': setSelectedMepItems,
      'pumpRoom': setSelectedPumpRoomItems
    };

    const selectionStates = {
      'mainPool': selectedMainPoolItems,
      'mep': selectedMepItems,
      'pumpRoom': selectedPumpRoomItems
    };

    const setSelection = selectionSetters[category];
    const selection = selectionStates[category];

    if (selection.has(index)) {
      const newSelection = new Set(selection);
      newSelection.delete(index);
      setSelection(newSelection);
    } else {
      const newSelection = new Set(selection);
      newSelection.add(index);
      setSelection(newSelection);
    }
  };

  const handleSelectAll = (category, items) => {
    const selectionSetters = {
      'mainPool': setSelectedMainPoolItems,
      'mep': setSelectedMepItems,
      'pumpRoom': setSelectedPumpRoomItems
    };

    const setSelection = selectionSetters[category];
    
    if (items.length === getSelectedCount(category)) {
      // Deselect all
      setSelection(new Set());
    } else {
      // Select all
      setSelection(new Set(items.map((_, index) => index)));
    }
  };

  const getSelectedCount = (category) => {
    const selectionStates = {
      'mainPool': selectedMainPoolItems,
      'mep': selectedMepItems,
      'pumpRoom': selectedPumpRoomItems
    };
    return selectionStates[category].size;
  };

  const getSelectedItems = (category, items) => {
    const selectionStates = {
      'mainPool': selectedMainPoolItems,
      'mep': selectedMepItems,
      'pumpRoom': selectedPumpRoomItems
    };
    
    return items.filter((_, index) => selectionStates[category].has(index));
  };

  // Print delivery challan
  const printChallan = () => {
    window.print();
  };

  // Generate professional PDF
  const generateDeliveryPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const usableWidth = pageWidth - 2 * margin;
      let yPos = margin;
      
      const primaryColor = [30, 60, 114];
      const lightGray = [245, 245, 245];
      const darkText = [0, 0, 0];
      const mediumGray = [100, 100, 100];

      // === HEADER SECTION ===
      pdf.setFillColor(...primaryColor);
      pdf.rect(0, 0, pageWidth, 30, 'F');
      
      // Add logo
      try {
        const logoUrl = companyProfile?.logo_url
          ? `https://pool-costing-api.intelithon.in/${companyProfile.logo_url}`
          : "/intelithon-logo.jpg";
        pdf.addImage(logoUrl, 'JPEG', margin, 7, 18, 18);
      } catch (error) {
        console.log('Logo not found, continuing without logo');
      }
      
      // Company name and title
      const companyName = companyProfile?.company_name || "Pool Costing Platform";
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text(companyName.toUpperCase(), margin + 23, 13);
      
      pdf.setFontSize(12);
      pdf.text('JACUZZI/SPA DELIVERY CHALLAN', margin + 23, 21);
      
      yPos = 40;
      
      // === CHALLAN INFORMATION BAR ===
      pdf.setFillColor(...lightGray);
      pdf.rect(margin, yPos, usableWidth, 10, 'F');
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, yPos, usableWidth, 10);
      
      pdf.setTextColor(...darkText);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      
      const infoItems = [
        { label: 'Challan No:', value: deliveryData.challanNo, x: margin + 3 },
        { label: 'Date:', value: new Date(deliveryData.date).toLocaleDateString('en-IN'), x: margin + 60 },
        { label: 'Status:', value: deliveryData.deliveryStatus.toUpperCase(), x: margin + 110 }
      ];
      
      infoItems.forEach(item => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(item.label, item.x, yPos + 6.5);
        pdf.setFont('helvetica', 'normal');
        pdf.text(item.value, item.x + 20, yPos + 6.5);
      });
      
      yPos += 15;
      
      // === FROM & TO SECTION ===
      const boxHeight = 32;
      const boxWidth = (usableWidth - 5) / 2;
      
      // FROM Box
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, yPos, boxWidth, boxHeight);
      
      pdf.setFillColor(...primaryColor);
      pdf.rect(margin, yPos, boxWidth, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('FROM', margin + 3, yPos + 5.5);
      
      pdf.setTextColor(...darkText);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.text(cleanTextForPDF(deliveryData.fromCompanyName || companyProfile?.company_name || "Pool Costing Platform"), margin + 3, yPos + 13);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      const fromLines = pdf.splitTextToSize(cleanTextForPDF(deliveryData.fromAddress || companyProfile?.address || ""), boxWidth - 6);
      pdf.text(fromLines, margin + 3, yPos + 18);
      pdf.text(cleanTextForPDF(deliveryData.fromContact || `${companyProfile?.phone || ""}${companyProfile?.phone && companyProfile?.email ? " | " : ""}${companyProfile?.email || ""}`), margin + 3, yPos + 26);
      pdf.setFontSize(7);
      pdf.text(cleanTextForPDF(deliveryData.fromGST || (companyProfile?.gst_number ? `GSTIN: ${companyProfile.gst_number}` : "")), margin + 3, yPos + 30);
      
      // TO Box
      const toBoxX = margin + boxWidth + 5;
      pdf.rect(toBoxX, yPos, boxWidth, boxHeight);
      
      pdf.setFillColor(...primaryColor);
      pdf.rect(toBoxX, yPos, boxWidth, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('DELIVERY TO', toBoxX + 3, yPos + 5.5);
      
      pdf.setTextColor(...darkText);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text(cleanTextForPDF(deliveryData.customerName || 'Customer Name Not Provided'), toBoxX + 3, yPos + 13);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      const toAddress = deliveryData.deliveryAddress || deliveryData.customerAddress || 'Address Not Provided';
      const toLines = pdf.splitTextToSize(cleanTextForPDF(toAddress), boxWidth - 6);
      pdf.text(toLines, toBoxX + 3, yPos + 18);
      pdf.text(`Contact: ${cleanTextForPDF(deliveryData.contactPerson || 'N/A')}`, toBoxX + 3, yPos + 26);
      pdf.text(`Phone: ${cleanTextForPDF(deliveryData.contactNumber || 'N/A')}`, toBoxX + 3, yPos + 30);
      
      yPos += boxHeight + 8;
      
      // === JACUZZI SPECIFICATIONS ===
      pdf.setFillColor(...primaryColor);
      pdf.rect(margin, yPos, usableWidth, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('JACUZZI/SPA SPECIFICATIONS', margin + 3, yPos + 5.5);
      
      yPos += 8;
      
      const specHeight = 25;
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margin, yPos, usableWidth, specHeight);
      
      // Horizontal divider
      pdf.line(margin, yPos + 12.5, margin + usableWidth, yPos + 12.5);
      
      // Vertical dividers
      const col1Width = 60;
      const col2Width = 60;
      const col3Width = usableWidth - col1Width - col2Width;
      
      pdf.line(margin + col1Width, yPos, margin + col1Width, yPos + specHeight);
      pdf.line(margin + col1Width + col2Width, yPos, margin + col1Width + col2Width, yPos + specHeight);
      
      pdf.setTextColor(...darkText);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      
      // Row 1 Headers
      pdf.text('Jacuzzi Dimensions', margin + 3, yPos + 6);
      pdf.text('Seating & Jets', margin + col1Width + 3, yPos + 6);
      pdf.text('Equipment Details', margin + col1Width + col2Width + 3, yPos + 6);
      
      // Row 1 Values
      pdf.setFont('helvetica', 'normal');
      const dimStr = `${dimensions.length || "N/A"}m x ${dimensions.width || "N/A"}m x ${dimensions.depth || "N/A"}m`;
      pdf.text(dimStr, margin + 3, yPos + 11);
      
      const seatingStr = `Seats: ${seatingCapacity} | Jets: ${waterJets} | Air: ${airControllers}`;
      pdf.text(seatingStr, margin + col1Width + 3, yPos + 11);
      
      const pumpStr = `Jet Pump: ₹52,500`;
      pdf.text(pumpStr, margin + col1Width + col2Width + 3, yPos + 11);
      
      // Row 2 Headers
      pdf.setFont('helvetica', 'bold');
      pdf.text('Construction Type', margin + 3, yPos + 17);
      pdf.text('Volume', margin + col1Width + 3, yPos + 17);
      pdf.text('Heater', margin + col1Width + col2Width + 3, yPos + 17);
      
      // Row 2 Values
      pdf.setFont('helvetica', 'normal');
      const constType = constructionType === 'terrace' ? 'Terrace' : 'In-Ground';
      pdf.text(constType, margin + 3, yPos + 22);
      
      const volStr = `Vol: ${safeToFixed(poolMetrics?.volume_m3 || result?.design_parameters?.volume_m3 || 0, 2)} m³`;
      pdf.text(volStr, margin + col1Width + 3, yPos + 22);
      
      const heaterStr = selectedAdvancedEquipment.includes(127) ? 'Included' : 'Not Included';
      pdf.text(heaterStr, margin + col1Width + col2Width + 3, yPos + 22);
      
      yPos += specHeight + 8;
      
      // === DELIVERY DETAILS ===
      pdf.setFillColor(...primaryColor);
      pdf.rect(margin, yPos, usableWidth, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('DELIVERY INFORMATION', margin + 3, yPos + 5.5);
      
      yPos += 8;
      
      const deliveryHeight = 15;
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margin, yPos, usableWidth, deliveryHeight);
      
      // Horizontal divider
      pdf.line(margin, yPos + 7.5, margin + usableWidth, yPos + 7.5);
      
      // Vertical dividers
      const delCol1 = usableWidth / 3;
      const delCol2 = usableWidth / 3;
      
      pdf.line(margin + delCol1, yPos, margin + delCol1, yPos + deliveryHeight);
      pdf.line(margin + delCol1 + delCol2, yPos, margin + delCol1 + delCol2, yPos + deliveryHeight);
      
      pdf.setTextColor(...darkText);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      
      pdf.text('Vehicle Number', margin + 3, yPos + 5);
      pdf.text('Driver Name', margin + delCol1 + 3, yPos + 5);
      pdf.text('Driver Contact', margin + delCol1 + delCol2 + 3, yPos + 5);
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(cleanTextForPDF(deliveryData.vehicleNumber || 'Not Assigned'), margin + 3, yPos + 12);
      pdf.text(cleanTextForPDF(deliveryData.driverName || 'Not Assigned'), margin + delCol1 + 3, yPos + 12);
      pdf.text(cleanTextForPDF(deliveryData.driverContact || 'Not Assigned'), margin + delCol1 + delCol2 + 3, yPos + 12);
      
      yPos += deliveryHeight + 10;
      
      // Use selected items for PDF generation
      const displayMainPoolItems = getSelectedItems('mainPool', mainPoolItems).filter(item => item.deliveryQuantity > 0);
      const displayMepItems = getSelectedItems('mep', mepItemsList).filter(item => item.deliveryQuantity > 0);
      const displayPumpRoomItems = getSelectedItems('pumpRoom', pumpRoomItems).filter(item => item.deliveryQuantity > 0);
      
      console.log("📊 PDF Generation - Items:", {
        civil: displayMainPoolItems.length,
        mep: displayMepItems.length,
        pumpRoom: displayPumpRoomItems.length
      });
      
      // === ITEMS TABLES ===
      // Civil Works Items
      if (displayMainPoolItems.length > 0) {
        yPos = addProfessionalTable(pdf, 'CIVIL WORKS - JACUZZI STRUCTURE', displayMainPoolItems, yPos, margin, pageWidth, pageHeight);
      }
      
      // Pump Room Items
      if (displayPumpRoomItems.length > 0) {
        if (yPos > 200) {
          pdf.addPage();
          yPos = margin + 10;
        }
        yPos = addProfessionalTable(pdf, 'CIVIL WORKS - PUMP ROOM', displayPumpRoomItems, yPos, margin, pageWidth, pageHeight);
      }
      
      // MEP Items
      if (displayMepItems.length > 0) {
        if (yPos > 200) {
          pdf.addPage();
          yPos = margin + 10;
        }
        yPos = addProfessionalTable(pdf, 'MEP EQUIPMENT - JACUZZI SYSTEMS', displayMepItems, yPos, margin, pageWidth, pageHeight);
      }
      
      // === SUMMARY SECTION ===
      if (yPos > 230) {
        pdf.addPage();
        yPos = margin + 10;
      }
      
      yPos += 5;
      
      pdf.setFillColor(...lightGray);
      pdf.rect(margin, yPos, usableWidth, 25, 'F');
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margin, yPos, usableWidth, 25);
      
      pdf.setTextColor(...primaryColor);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('DELIVERY SUMMARY', margin + 3, yPos + 6);
      
      pdf.setTextColor(...darkText);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      
      const summaryY = yPos + 13;
      pdf.text(`Civil Works Items: ${displayMainPoolItems.length}`, margin + 5, summaryY);
      pdf.text(`MEP Equipment Items: ${displayMepItems.length}`, margin + 70, summaryY);
      
      pdf.text(`Pump Room Items: ${displayPumpRoomItems.length}`, margin + 5, summaryY + 6);
      pdf.text(`Jacuzzi Type: Luxury Spa/Jacuzzi`, margin + 70, summaryY + 6);
      
      const totalItems = displayMainPoolItems.length + displayMepItems.length + displayPumpRoomItems.length;
      
      pdf.text(`Total Items: ${totalItems}`, margin + 5, summaryY + 12);
      pdf.text(`Construction: ${constructionType === 'terrace' ? 'Terrace' : 'In-Ground'}`, margin + 70, summaryY + 12);
      
      yPos += 30;
      
      // === SIGNATURES ===
      const sigBoxWidth = 55;
      const sigBoxHeight = 22;
      const sigSpacing = 7;
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...darkText);
      
      // Prepared By
      pdf.rect(margin, yPos, sigBoxWidth, sigBoxHeight);
      pdf.text('Prepared By', margin + 3, yPos + 5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text(cleanTextForPDF(deliveryData.preparedBy || '________________'), margin + 3, yPos + 17);
      
      // Authorized By
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      const authX = margin + sigBoxWidth + sigSpacing;
      pdf.rect(authX, yPos, sigBoxWidth, sigBoxHeight);
      pdf.text('Authorized By', authX + 3, yPos + 5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text(cleanTextForPDF(deliveryData.authorizedBy || '________________'), authX + 3, yPos + 17);
      
      // Received By
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      const recX = authX + sigBoxWidth + sigSpacing;
      pdf.rect(recX, yPos, sigBoxWidth, sigBoxHeight);
      pdf.text('Received By (Customer)', recX + 3, yPos + 5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text(cleanTextForPDF(deliveryData.receivedBy || '________________'), recX + 3, yPos + 17);
      
      // === FOOTER ===
      pdf.setFontSize(7);
      pdf.setTextColor(...mediumGray);
      pdf.text('This is a computer-generated delivery challan. No signature required.', pageWidth / 2, pageHeight - 12, { align: 'center' });
      pdf.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      
      // === NOTES ===
      if (deliveryData.notes) {
        pdf.setFontSize(7);
        pdf.setTextColor(...darkText);
        pdf.text(`Notes: ${cleanTextForPDF(deliveryData.notes)}`, margin, pageHeight - 18);
      }
      
      // Add Jacuzzi specific note
      pdf.text(`* Jet Pump included as regular MEP item (Fixed rate: ₹52,500)`, margin, pageHeight - 14);
      pdf.text(`* Note: Earth Excavation (SlNo 1) and Backfilling (SlNo 2) are excluded from delivery challan`, margin, pageHeight - 10);
      
      pdf.save(`Jacuzzi-Delivery-Challan-${deliveryData.challanNo}.pdf`);
      alert("✅ Jacuzzi/Spa Delivery Challan PDF generated successfully!");
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("❌ Error generating PDF. Please try again.");
    }
  };

  // Professional table generator for PDF
  const addProfessionalTable = (pdf, title, items, startY, margin, pageWidth, pageHeight) => {
    let yPos = startY;
    const usableWidth = pageWidth - 2 * margin;
    
    const primaryColor = [30, 60, 114];
    const headerBg = [240, 240, 240];
    const altRowBg = [252, 252, 254];
    
    // Section header
    pdf.setFillColor(...primaryColor);
    pdf.rect(margin, yPos, usableWidth, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(title, margin + 3, yPos + 5.5);
    
    yPos += 8;
    
    // Column widths
    const colWidths = {
      no: 12,           // Serial number
      code: 18,         // Item code
      description: 85,  // Description
      unit: 15,         // Unit
      qty: 22,          // Quantity
      status: 28        // Status
    };
    
    // Table header
    pdf.setFillColor(...headerBg);
    pdf.rect(margin, yPos, usableWidth, 8, 'F');
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, yPos, usableWidth, 8);
    
    // Draw vertical lines
    let xPos = margin;
    const colOrder = ['no', 'code', 'description', 'unit', 'qty', 'status'];
    colOrder.forEach((col, idx) => {
      if (idx > 0) {
        pdf.line(xPos, yPos, xPos, yPos + 8);
      }
      xPos += colWidths[col];
    });
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    
    // Header labels
    pdf.text('No.', margin + colWidths.no/2, yPos + 5.5, { align: 'center' });
    pdf.text('Code', margin + colWidths.no + colWidths.code/2, yPos + 5.5, { align: 'center' });
    pdf.text('Description', margin + colWidths.no + colWidths.code + 2, yPos + 5.5);
    pdf.text('Unit', margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit/2, yPos + 5.5, { align: 'center' });
    pdf.text('Quantity', margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit + colWidths.qty/2, yPos + 5.5, { align: 'center' });
    pdf.text('Status', margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit + colWidths.qty + colWidths.status/2, yPos + 5.5, { align: 'center' });
    
    yPos += 8;
    
    const rowHeight = 8;
    
    // Table rows
    items.forEach((item, index) => {
      // Check page break
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = margin + 10;
        
        // Redraw header on new page
        pdf.setFillColor(...primaryColor);
        pdf.rect(margin, yPos, usableWidth, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(title + ' (Continued)', margin + 3, yPos + 5.5);
        yPos += 8;
        
        // Redraw table header
        pdf.setFillColor(...headerBg);
        pdf.rect(margin, yPos, usableWidth, 8, 'F');
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(margin, yPos, usableWidth, 8);
        
        xPos = margin;
        colOrder.forEach((col, idx) => {
          if (idx > 0) {
            pdf.line(xPos, yPos, xPos, yPos + 8);
          }
          xPos += colWidths[col];
        });
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.text('No.', margin + colWidths.no/2, yPos + 5.5, { align: 'center' });
        pdf.text('Code', margin + colWidths.no + colWidths.code/2, yPos + 5.5, { align: 'center' });
        pdf.text('Description', margin + colWidths.no + colWidths.code + 2, yPos + 5.5);
        pdf.text('Unit', margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit/2, yPos + 5.5, { align: 'center' });
        pdf.text('Quantity', margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit + colWidths.qty/2, yPos + 5.5, { align: 'center' });
        pdf.text('Status', margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit + colWidths.qty + colWidths.status/2, yPos + 5.5, { align: 'center' });
        
        yPos += 8;
      }
      
      // Alternate row background
      if (index % 2 === 0) {
        pdf.setFillColor(...altRowBg);
        pdf.rect(margin, yPos, usableWidth, rowHeight, 'F');
      }
      
      // Draw row border
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.2);
      pdf.rect(margin, yPos, usableWidth, rowHeight);
      
      // Draw vertical lines
      xPos = margin;
      colOrder.forEach((col, idx) => {
        if (idx > 0) {
          pdf.line(xPos, yPos, xPos, yPos + rowHeight);
        }
        xPos += colWidths[col];
      });
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      
      const cellY = yPos + 5;
      
      // Use sequential numbering (index + 1)
      const displayNumber = index + 1;
      
      // No. - centered
      pdf.text(String(displayNumber), margin + colWidths.no/2, cellY, { align: 'center' });
      
      // Code - centered
      pdf.text(cleanTextForPDF(item.Code || 'N/A'), margin + colWidths.no + colWidths.code/2, cellY, { align: 'center' });
      
      // Description - Proper text wrapping
      const desc = cleanTextForPDF(item.description || 'N/A');
      const maxDescWidth = colWidths.description - 8;
      const descLines = pdf.splitTextToSize(desc, maxDescWidth);
      
      // Display only first line, truncate if too long
      const firstLine = descLines[0];
      const displayText = descLines.length > 1 ? firstLine.substring(0, 65) + '...' : firstLine;
      pdf.text(displayText, margin + colWidths.no + colWidths.code + 4, cellY);
      
      // Unit - centered
      pdf.text(cleanTextForPDF(item.Unit || ''), margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit/2, cellY, { align: 'center' });
      
      // Quantity - right-aligned (using edited or original quantity)
      const displayQty = getFinalQty(
        title.includes('CIVIL WORKS') ? 'mainPool' : (title.includes('PUMP') ? 'pumpRoom' : 'mep'),
        item.SlNo,
        item.deliveryQuantity
      );
      const qtyText = safeToFixed(displayQty, 2);
      const qtyX = margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit;
      pdf.text(qtyText, qtyX + colWidths.qty - 3, cellY, { align: 'right' });
      
      // Status - centered with color coding
      const status = item.deliveryStatus || 'pending';
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6);
      
      if (status === 'delivered') {
        pdf.setTextColor(0, 128, 0);
      } else if (status === 'dispatched') {
        pdf.setTextColor(0, 0, 200);
      } else if (status === 'not-required') {
        pdf.setTextColor(150, 150, 150);
      } else {
        pdf.setTextColor(200, 100, 0);
      }
      
      const statusX = margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit + colWidths.qty;
      pdf.text(status.toUpperCase(), statusX + colWidths.status/2, cellY, { align: 'center' });
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
      
      yPos += rowHeight;
    });
    
    // Bottom border
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.4);
    pdf.line(margin, yPos, margin + usableWidth, yPos);
    
    return yPos + 10;
  };

  // Save challan
  const saveChallan = () => {
    const challanData = {
      ...deliveryData,
      result,
      dimensions,
      editedQuantities,
      deliveryItems: {
        mainPool: mainPoolItems,
        mep: mepItemsList,
        pumpRoom: pumpRoomItems
      },
      selectedItems: {
        mainPool: Array.from(selectedMainPoolItems),
        mep: Array.from(selectedMepItems),
        pumpRoom: Array.from(selectedPumpRoomItems)
      },
      mainPoolTotal,
      mepTotal,
      pumpRoomTotal,
      jacuzziSpecs: {
        seatingCapacity,
        waterJets,
        airControllers,
        constructionType,
        selectedAdvancedEquipment
      },
      equipmentSpecs,
      pumpRoomDimensions,
      poolMetrics,
      companyProfile,
      timestamp: new Date().toISOString(),
      note: "Earth Excavation (SlNo 1) and Backfilling (SlNo 2) excluded from delivery challan"
    };
    
    const savedChallans = JSON.parse(localStorage.getItem('jacuzzi_delivery_challans') || '[]');
    savedChallans.push(challanData);
    localStorage.setItem('jacuzzi_delivery_challans', JSON.stringify(savedChallans));
    
    alert("✅ Jacuzzi/Spa Delivery challan saved successfully!");
  };

  // Show error message if needed
  if (error) {
    return (
      <div className="delivery-page">
        <div className="error-message">
          <h3>❌ Error Loading Delivery Data</h3>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="back-button">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loading || brandingLoading) {
    return (
      <div className="delivery-page">
        <div className="loading-spinner">
          <div className="spinner-circle"></div>
          <p>Loading Jacuzzi/Spa delivery data...</p>
        </div>
      </div>
    );
  }

  // Filter items with quantity > 0 for display
  const displayMainPoolItems = mainPoolItems.filter(item => item.deliveryQuantity > 0);
  const displayMepItems = mepItemsList.filter(item => item.deliveryQuantity > 0);
  const displayPumpRoomItems = pumpRoomItems.filter(item => item.deliveryQuantity > 0);

  console.log("📊 Final display counts:", {
    mainPool: displayMainPoolItems.length,
    mep: displayMepItems.length,
    pumpRoom: displayPumpRoomItems.length
  });

  return (
    <div className="delivery-page">
      {/* Header */}
      <header className="delivery-header">
        <div className="header-content">
          <div className="company-logo-section">
            <img
              src={
                companyProfile?.logo_url
                  ? `https://pool-costing-api.intelithon.in/${companyProfile.logo_url}`
                  : "/intelithon-logo.jpg"
              }
              alt={`${companyProfile?.company_name || "Company"} Logo`}
              className="company-logo"
              width={200}
            />
            <div className="company-text">
              <h1>{companyProfile?.company_name || "Pool Costing Platform"}</h1>
              <p className="subtitle">Professional Jacuzzi/Spa Construction</p>
            </div>
          </div>
          <h2 className="challan-title">JACUZZI/SPA DELIVERY CHALLAN</h2>
          <div className="challan-info">
            <span><strong>Challan No:</strong> {deliveryData.challanNo}</span>
            <span><strong>Date:</strong> {new Date(deliveryData.date).toLocaleDateString('en-IN')}</span>
            <span><strong>Status:</strong> {deliveryData.deliveryStatus.toUpperCase()}</span>
            <span><strong>Construction:</strong> {constructionType === 'terrace' ? 'Terrace' : 'In-Ground'}</span>
            <span><strong>Note:</strong> Earth Excavation & Backfilling excluded</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="pdf-button" onClick={generateDeliveryPDF}>
            📄 PDF
          </button>
          <button className="save-button" onClick={saveChallan}>
            💾 Save
          </button>
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
      </header>

      {/* Address Section */}
      <section className="address-section">
        <div className="address-grid">
          <div className="address-card from-address">
            <h3>FROM</h3>
            <div className="company-info">
              <h4>{deliveryData.fromCompanyName || companyProfile?.company_name || "Pool Costing Platform"}</h4>
              <p>{deliveryData.fromAddress || companyProfile?.address || "Address not provided"}</p>
              <p>{deliveryData.fromContact || `${companyProfile?.phone || ""}${companyProfile?.phone && companyProfile?.email ? " | " : ""}${companyProfile?.email || ""}`}</p>
              {companyProfile?.website && <p>{companyProfile.website}</p>}
              <p className="gst-number">{deliveryData.fromGST || (companyProfile?.gst_number ? `GSTIN: ${companyProfile.gst_number}` : "")}</p>
            </div>
          </div>
          
          <div className="address-card to-address">
            <h3>DELIVERY TO</h3>
            <div className="customer-info">
              <div className="form-group">
                <label>Customer Name:</label>
                <input 
                  type="text" 
                  value={deliveryData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="form-group">
                <label>Delivery Address:</label>
                <textarea 
                  value={deliveryData.deliveryAddress}
                  onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                  placeholder="Enter complete delivery address"
                  rows="3"
                />
              </div>
              <div className="contact-grid">
                <div className="form-group">
                  <label>Contact Person:</label>
                  <input 
                    type="text" 
                    value={deliveryData.contactPerson}
                    onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                    placeholder="Contact person"
                  />
                </div>
                <div className="form-group">
                  <label>Contact Number:</label>
                  <input 
                    type="tel" 
                    value={deliveryData.contactNumber}
                    onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                    placeholder="Contact number"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Information */}
      <section className="delivery-info-section">
        <h2>Delivery Information</h2>
        <div className="info-grid">
          <div className="form-group">
            <label>Challan No:</label>
            <input 
              type="text" 
              value={deliveryData.challanNo}
              readOnly
              className="readonly-input"
            />
          </div>
          <div className="form-group">
            <label>Date:</label>
            <input 
              type="date" 
              value={deliveryData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Project Name:</label>
            <input 
              type="text" 
              value={deliveryData.projectName}
              onChange={(e) => handleInputChange('projectName', e.target.value)}
              placeholder="Jacuzzi/Spa Project"
            />
          </div>
          <div className="form-group">
            <label>Delivery Status:</label>
            <select 
              value={deliveryData.deliveryStatus}
              onChange={(e) => handleInputChange('deliveryStatus', e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="in-transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="partially-delivered">Partially Delivered</option>
            </select>
          </div>
          <div className="form-group">
            <label>Vehicle Number:</label>
            <input 
              type="text" 
              value={deliveryData.vehicleNumber}
              onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
              placeholder="Vehicle number"
            />
          </div>
          <div className="form-group">
            <label>Driver Name:</label>
            <input 
              type="text" 
              value={deliveryData.driverName}
              onChange={(e) => handleInputChange('driverName', e.target.value)}
              placeholder="Driver name"
            />
          </div>
          <div className="form-group">
            <label>Driver Contact:</label>
            <input 
              type="tel" 
              value={deliveryData.driverContact}
              onChange={(e) => handleInputChange('driverContact', e.target.value)}
              placeholder="Driver contact"
            />
          </div>
        </div>

        <div className="form-group full-width">
          <label>Notes/Special Instructions:</label>
          <textarea 
            value={deliveryData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Any special instructions or notes for Jacuzzi/Spa delivery"
            rows="3"
          />
        </div>
      </section>

      {/* Jacuzzi Specifications */}
      <section className="specifications-section">
        <h2>Jacuzzi/Spa Specifications</h2>
        <div className="specs-grid">
          <div className="spec-item">
            <span className="spec-label">Dimensions (L×W×D):</span>
            <span className="spec-value">
              {dimensions.length || "N/A"}m × {dimensions.width || "N/A"}m × {dimensions.depth || "N/A"}m
            </span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Volume:</span>
            <span className="spec-value">{safeToFixed(poolMetrics?.volume_m3 || result?.design_parameters?.volume_m3 || 0)} m³</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Seating Capacity:</span>
            <span className="spec-value">{seatingCapacity} persons</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Water Jets:</span>
            <span className="spec-value">{waterJets} jets</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Air Controllers:</span>
            <span className="spec-value">{airControllers} controllers</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Construction Type:</span>
            <span className="spec-value">{constructionType === 'terrace' ? 'Terrace' : 'In-Ground'}</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Jet Pump:</span>
            <span className="spec-value">Included (₹52,500)</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Heater:</span>
            <span className="spec-value">
              {selectedAdvancedEquipment.includes(127) ? 'Included' : 'Not Included'}
            </span>
          </div>
        </div>
      </section>

      {/* Selection Summary */}
      <section className="selection-summary">
        <h2>PDF Selection Summary</h2>
        <div className="selection-stats">
          <div className="selection-stat">
            <span className="stat-label">Civil Works Items Selected:</span>
            <span className="stat-value">
              {getSelectedCount('mainPool')} / {displayMainPoolItems.length}
            </span>
          </div>
          <div className="selection-stat">
            <span className="stat-label">MEP Equipment Selected:</span>
            <span className="stat-value">
              {getSelectedCount('mep')} / {displayMepItems.length}
            </span>
          </div>
          <div className="selection-stat">
            <span className="stat-label">Pump Room Items Selected:</span>
            <span className="stat-value">
              {getSelectedCount('pumpRoom')} / {displayPumpRoomItems.length}
            </span>
          </div>
          <div className="selection-stat">
            <span className="stat-label">Total Items Selected:</span>
            <span className="stat-value">
              {getSelectedCount('mainPool') + getSelectedCount('mep') + getSelectedCount('pumpRoom')} / 
              {displayMainPoolItems.length + displayMepItems.length + displayPumpRoomItems.length}
            </span>
          </div>
          <div className="selection-stat note-stat">
            <span className="stat-label">Note:</span>
            <span className="stat-value">Earth Excavation & Backfilling items excluded from delivery</span>
          </div>
        </div>
        <div className="selection-actions">
          <button 
            className="select-all-button"
            onClick={() => {
              if (displayMainPoolItems.length > 0) handleSelectAll('mainPool', displayMainPoolItems);
              if (displayMepItems.length > 0) handleSelectAll('mep', displayMepItems);
              if (displayPumpRoomItems.length > 0) handleSelectAll('pumpRoom', displayPumpRoomItems);
            }}
          >
            Select All Items
          </button>
          <button 
            className="deselect-all-button"
            onClick={() => {
              setSelectedMainPoolItems(new Set());
              setSelectedMepItems(new Set());
              setSelectedPumpRoomItems(new Set());
            }}
          >
            Deselect All Items
          </button>
        </div>
      </section>

      {/* Civil Works - Jacuzzi Structure */}
      {displayMainPoolItems.length > 0 ? (
        <section className="items-section">
          <div className="section-header">
            <h2>Civil Works - Jacuzzi Structure ({displayMainPoolItems.length} items)</h2>
            <div className="section-actions">
              <span className="selection-count">
                Selected: {getSelectedCount('mainPool')} / {displayMainPoolItems.length}
              </span>
              <button 
                className="select-all-section"
                onClick={() => handleSelectAll('mainPool', displayMainPoolItems)}
              >
                {getSelectedCount('mainPool') === displayMainPoolItems.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
          <div className="note-banner">
            <p><strong>Note:</strong> Earth Excavation (SlNo 1) and Backfilling (SlNo 2) are excluded from delivery challan</p>
          </div>
          <div className="table-container">
            <table className="delivery-table">
              <thead>
                <tr>
                  <th className="select-column">
                    <input 
                      type="checkbox"
                      checked={getSelectedCount('mainPool') === displayMainPoolItems.length && displayMainPoolItems.length > 0}
                      onChange={() => handleSelectAll('mainPool', displayMainPoolItems)}
                      className="select-all-checkbox"
                    />
                  </th>
                  <th>Sl.No</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {displayMainPoolItems.map((item, index) => (
                  <tr key={`mainpool-${item.SlNo}-${index}`} 
                      className={selectedMainPoolItems.has(index) ? 'selected-row' : ''}>
                    <td className="select-column">
                      <input 
                        type="checkbox"
                        checked={selectedMainPoolItems.has(index)}
                        onChange={() => handleSelectItem('mainPool', index)}
                        className="item-checkbox"
                      />
                    </td>
                    <td className="text-center">{item.uiSlNo || index + 1}</td>
                    <td className="text-center">{item.Code || item.code || "N/A"}</td>
                    <td className="description-cell">{item.description}</td>
                    <td className="text-center">{item.Unit || item.unit || ""}</td>
                    <td className="text-center quantity-cell">
                      <input
                        type="number"
                        value={getFinalQty("mainPool", item.SlNo, item.deliveryQuantity)}
                        onChange={(e) => handleQtyChange("mainPool", item.SlNo, e.target.value)}
                        style={{
                          width: "80px",
                          padding: "4px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          textAlign: "center"
                        }}
                      />
                    </td>
                    <td className="text-center">
                      <select 
                        value={item.deliveryStatus}
                        onChange={(e) => handleItemStatusChange('mainPool', index, e.target.value)}
                        className="status-select"
                      >
                        <option value="pending">Pending</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="delivered">Delivered</option>
                        <option value="partially-delivered">Partially Delivered</option>
                        <option value="not-required">Not Required</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        type="text" 
                        value={item.deliveryRemarks}
                        onChange={(e) => handleItemRemarksChange('mainPool', index, e.target.value)}
                        placeholder="Delivery remarks"
                        className="remarks-input"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="items-section">
          <div className="section-header">
            <h2>Civil Works - Jacuzzi Structure (0 items)</h2>
          </div>
          <div className="no-data-message">
            No civil works items available for delivery. Please check if civil calculations were performed.
          </div>
          <div className="note-banner">
            <p><strong>Note:</strong> Earth Excavation (SlNo 1) and Backfilling (SlNo 2) are excluded from delivery challan</p>
          </div>
        </section>
      )}

      {/* Pump Room Materials */}
      {displayPumpRoomItems.length > 0 ? (
        <section className="items-section">
          <div className="section-header">
            <h2>Civil Works - Pump Room ({displayPumpRoomItems.length} items)</h2>
            <div className="section-actions">
              <span className="selection-count">
                Selected: {getSelectedCount('pumpRoom')} / {displayPumpRoomItems.length}
              </span>
              <button 
                className="select-all-section"
                onClick={() => handleSelectAll('pumpRoom', displayPumpRoomItems)}
              >
                {getSelectedCount('pumpRoom') === displayPumpRoomItems.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
          <div className="note-banner">
            <p><strong>Note:</strong> Earth Excavation (SlNo 1) and Backfilling (SlNo 2) are excluded from delivery challan</p>
          </div>
          <div className="table-container">
            <table className="delivery-table">
              <thead>
                <tr>
                  <th className="select-column">
                    <input 
                      type="checkbox"
                      checked={getSelectedCount('pumpRoom') === displayPumpRoomItems.length && displayPumpRoomItems.length > 0}
                      onChange={() => handleSelectAll('pumpRoom', displayPumpRoomItems)}
                      className="select-all-checkbox"
                    />
                  </th>
                  <th>Sl.No</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {displayPumpRoomItems.map((item, index) => (
                  <tr key={`pumproom-${item.SlNo}-${index}`}
                      className={selectedPumpRoomItems.has(index) ? 'selected-row' : ''}>
                    <td className="select-column">
                      <input 
                        type="checkbox"
                        checked={selectedPumpRoomItems.has(index)}
                        onChange={() => handleSelectItem('pumpRoom', index)}
                        className="item-checkbox"
                      />
                    </td>
                    <td className="text-center">{item.uiSlNo || index + 1}</td>
                    <td className="text-center">{item.Code || item.code || "N/A"}</td>
                    <td className="description-cell">{item.description}</td>
                    <td className="text-center">{item.Unit || item.unit || ""}</td>
                    <td className="text-center quantity-cell">
                      <input
                        type="number"
                        value={getFinalQty("pumpRoom", item.SlNo, item.deliveryQuantity)}
                        onChange={(e) => handleQtyChange("pumpRoom", item.SlNo, e.target.value)}
                        style={{
                          width: "80px",
                          padding: "4px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          textAlign: "center"
                        }}
                      />
                    </td>
                    <td className="text-center">
                      <select 
                        value={item.deliveryStatus}
                        onChange={(e) => handleItemStatusChange('pumpRoom', index, e.target.value)}
                        className="status-select"
                      >
                        <option value="pending">Pending</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="delivered">Delivered</option>
                        <option value="partially-delivered">Partially Delivered</option>
                        <option value="not-required">Not Required</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        type="text" 
                        value={item.deliveryRemarks}
                        onChange={(e) => handleItemRemarksChange('pumpRoom', index, e.target.value)}
                        placeholder="Delivery remarks"
                        className="remarks-input"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {constructionType === 'terrace' && (
            <div className="terrace-note">
              <p><strong>Note for Terrace Construction:</strong> For terrace installations, excavation and backfilling quantities may be zero as these are not required for above-ground pump room construction.</p>
            </div>
          )}
        </section>
      ) : (
        <section className="items-section">
          <div className="section-header">
            <h2>Civil Works - Pump Room (0 items)</h2>
          </div>
          <div className="no-data-message">
            No pump room items available for delivery. Pump room may not be included in this calculation or quantities are zero.
          </div>
          <div className="note-banner">
            <p><strong>Note:</strong> Earth Excavation (SlNo 1) and Backfilling (SlNo 2) are excluded from delivery challan</p>
          </div>
        </section>
      )}

      {/* MEP Equipment */}
      {displayMepItems.length > 0 ? (
        <section className="items-section">
          <div className="section-header">
            <h2>MEP Equipment - Jacuzzi Systems ({displayMepItems.length} items)</h2>
            <div className="section-actions">
              <span className="selection-count">
                Selected: {getSelectedCount('mep')} / {displayMepItems.length}
              </span>
              <button 
                className="select-all-section"
                onClick={() => handleSelectAll('mep', displayMepItems)}
              >
                {getSelectedCount('mep') === displayMepItems.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
          <div className="table-container">
            <table className="delivery-table">
              <thead>
                <tr>
                  <th className="select-column">
                    <input 
                      type="checkbox"
                      checked={getSelectedCount('mep') === displayMepItems.length && displayMepItems.length > 0}
                      onChange={() => handleSelectAll('mep', displayMepItems)}
                      className="select-all-checkbox"
                    />
                  </th>
                  <th>Sl.No</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {displayMepItems.map((item, index) => (
                  <tr key={`mep-${item.SlNo}-${index}`}
                      className={selectedMepItems.has(index) ? 'selected-row' : ''}>
                    <td className="select-column">
                      <input 
                        type="checkbox"
                        checked={selectedMepItems.has(index)}
                        onChange={() => handleSelectItem('mep', index)}
                        className="item-checkbox"
                      />
                    </td>
                    <td className="text-center">{item.uiSlNo}</td>
                    <td className="text-center">{item.Code || item.code || "N/A"}</td>
                    <td className="description-cell">{item.description}</td>
                    <td className="text-center">{item.Unit || item.unit || ""}</td>
                    <td className="text-center quantity-cell">
                      <input
                        type="number"
                        value={getFinalQty("mep", item.SlNo, item.deliveryQuantity)}
                        onChange={(e) => handleQtyChange("mep", item.SlNo, e.target.value)}
                        style={{
                          width: "80px",
                          padding: "4px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          textAlign: "center"
                        }}
                      />
                    </td>
                    <td className="text-center">
                      <select 
                        value={item.deliveryStatus}
                        onChange={(e) => handleItemStatusChange('mep', index, e.target.value)}
                        className="status-select"
                      >
                        <option value="pending">Pending</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="delivered">Delivered</option>
                        <option value="partially-delivered">Partially Delivered</option>
                        <option value="not-required">Not Required</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        type="text" 
                        value={item.deliveryRemarks}
                        onChange={(e) => handleItemRemarksChange('mep', index, e.target.value)}
                        placeholder="Delivery remarks"
                        className="remarks-input"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mep-notes">
            <p><strong>MEP Equipment Notes:</strong></p>
            <ul>
              <li>Jet Pump is included as a regular MEP item (Item 28) with fixed rate of ₹52,500</li>
              <li>Heater is optional - {selectedAdvancedEquipment.includes(127) ? 'INCLUDED in this delivery' : 'NOT INCLUDED in this delivery'}</li>
              <li>Items 30-33 (Pipes, Fittings, Valves, Installation) are calculated as percentages of base MEP cost</li>
              <li>All MEP items are included in delivery challan (no exclusions)</li>
            </ul>
          </div>
        </section>
      ) : (
        <section className="items-section">
          <div className="section-header">
            <h2>MEP Equipment - Jacuzzi Systems (0 items)</h2>
          </div>
          <div className="no-data-message">
            No MEP equipment items available for delivery. Please check if MEP calculations were performed.
          </div>
        </section>
      )}

      {/* Summary Section */}
      <section className="summary-section">
        <h2>Delivery Summary</h2>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Civil Works Items:</span>
            <span className="summary-value">{displayMainPoolItems.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">MEP Equipment Items:</span>
            <span className="summary-value">{displayMepItems.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Pump Room Items:</span>
            <span className="summary-value">{displayPumpRoomItems.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Items:</span>
            <span className="summary-value">
              {displayMainPoolItems.length + displayMepItems.length + displayPumpRoomItems.length}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Jacuzzi Type:</span>
            <span className="summary-value">Luxury Spa/Jacuzzi</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Construction:</span>
            <span className="summary-value">{constructionType === 'terrace' ? 'Terrace' : 'In-Ground'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Jet Pump:</span>
            <span className="summary-value">Included (Fixed: ₹52,500)</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Heater:</span>
            <span className="summary-value">
              {selectedAdvancedEquipment.includes(127) ? 'Included' : 'Not Included'}
            </span>
          </div>
          <div className="summary-item note-item">
            <span className="summary-label">Special Note:</span>
            <span className="summary-value">Earth Excavation & Backfilling excluded from delivery</span>
          </div>
        </div>
      </section>

      {/* Signatures Section */}
      <section className="signatures-section">
        <h2>Authorizations</h2>
        <div className="signatures-grid">
          <div className="signature-block">
            <div className="signature-line"></div>
            <p>Prepared By</p>
            <input 
              type="text" 
              value={deliveryData.preparedBy}
              onChange={(e) => handleInputChange('preparedBy', e.target.value)}
              placeholder="Name of preparer"
              className="signature-input"
            />
          </div>
          <div className="signature-block">
            <div className="signature-line"></div>
            <p>Authorized By</p>
            <input 
              type="text" 
              value={deliveryData.authorizedBy}
              onChange={(e) => handleInputChange('authorizedBy', e.target.value)}
              placeholder="Name of authorized person"
              className="signature-input"
            />
          </div>
          <div className="signature-block">
            <div className="signature-line"></div>
            <p>Received By</p>
            <input 
              type="text" 
              value={deliveryData.receivedBy}
              onChange={(e) => handleInputChange('receivedBy', e.target.value)}
              placeholder="Receiver's signature"
              className="signature-input"
            />
          </div>
        </div>
      </section>

      {/* Footer Actions */}
      <footer className="delivery-actions">
        <button className="pdf-button" onClick={generateDeliveryPDF}>
          📄 Download PDF
        </button>
        <button className="secondary-button" onClick={printChallan}>
          🖨️ Print Challan
        </button>
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back to Jacuzzi Results
        </button>
      </footer>
    </div>
  );
}

export default JacuzziSpaDeliveryChallan;