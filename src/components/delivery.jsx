import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./delivery.css";

const API_BASE_URL = "https://pool-costing-api.intelithon.in";
const INSTALLATION_PERCENT = 0.15;

// Helper function to load image as base64 for PDF
const loadImageAsBase64 = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = this.width;
      canvas.height = this.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(this, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      resolve("");
    };
    img.src = url;
  });

// ================================
// UTILITY FUNCTIONS
// ================================
function safeToFixed(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.00";
  }
  return Number(value).toFixed(decimals);
}

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

const formatDimensions = (dimensions) => {
  if (!dimensions) return "N/A";
  if (typeof dimensions === 'string') return dimensions;
  if (typeof dimensions === 'object') {
    if (dimensions.length && dimensions.width && dimensions.depth) {
      return `${dimensions.length}m × ${dimensions.width}m × ${dimensions.depth}m`;
    }
    return "N/A";
  }
  return "N/A";
};

// Simple type normalization for grouping
const normalizeType = (type) => {
  return String(type || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .trim();
};

// ================================
// QUANTITY FIELD MAPPINGS - Same as result pages
// ================================

const MAIN_POOL_QTY_FIELDS = {
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

const BALANCE_TANK_QTY_FIELDS = {
  1: "EarthExcavation_QTY_1",
  2: "BackFilling_QTY_1",
  3: "Soling_QTY_1",
  4: "plaincement_QTY_1",
  5: "BurntBrick_QTY_1",
  6: "steelreinforcement_QTY_1",
  7: "Shuttering_QTY_1",
  8: "shotcreting_QTY_1",
  9: "WaterProofing_QTY_1",
  10: "plastering_QTY_1",
};

const PUMP_ROOM_QTY_FIELDS = {
  1: "EarthExcavation_QTY_2",
  2: "BackFilling_QTY_2",
  3: "Soling_QTY_2",
  4: "plaincement_QTY_2",
  5: "BurntBrick_QTY_2",
  6: "steelreinforcement_QTY_2",
  7: "Shuttering_QTY_2",
  8: "shotcreting_QTY_2",
  9: "WaterProofing_QTY_2",
  10: "plastering_QTY_2",
};

// ================================
// FILTERING FUNCTIONS - FIXED to allow items without SlNo
// ================================

// Check if MEP item should be shown for this pool type
const shouldShowMepItem = (slNo, poolType, hasGutter) => {
  // For skimmer pools, hide Gutter Drain (SlNo 13)
  if (poolType === 'skimmer' && slNo === 13) {
    return false;
  }
  
  // For Infinity pools, hide Skimmer (SlNo 11)
  if (poolType === 'infinity' && slNo === 11) {
    return false;
  }
  
  // For Curved pools without gutter, hide Skimmer and Gutter Drain
  if (poolType === 'curved' && !hasGutter) {
    if (slNo === 11 || slNo === 13) {
      return false;
    }
  }
  
  return true;
};

// Filter main pool items - FIXED to allow items without SlNo
const filterMainPoolItems = (items) => {
  if (!items || !Array.isArray(items)) return [];

  return items.filter(item => {
    // Allow if SlNo exists and is mapped
    if (item?.SlNo && MAIN_POOL_QTY_FIELDS[item.SlNo]) return true;
    // Allow fallback items without SlNo
    if (!item?.SlNo) return true;
    return false;
  });
};

// Filter balancing tank items - FIXED to allow items without SlNo
const filterBalancingTankItems = (items) => {
  if (!items || !Array.isArray(items)) return [];

  return items.filter(item => {
    if (item?.SlNo && BALANCE_TANK_QTY_FIELDS[item.SlNo]) return true;
    if (!item?.SlNo) return true;
    return false;
  });
};

// Filter pump room items - FIXED to allow items without SlNo
const filterPumpRoomItems = (items) => {
  if (!items || !Array.isArray(items)) return [];

  return items.filter(item => {
    if (item?.SlNo && PUMP_ROOM_QTY_FIELDS[item.SlNo]) return true;
    if (!item?.SlNo) return true;
    return false;
  });
};

// Filter MEP items based on pool type - FIXED to allow items without SlNo
const filterMepItems = (items, poolType, hasGutter) => {
  if (!items || !Array.isArray(items)) return [];

  return items.filter(item => {
    if (!item) return false;

    // Allow normal logic if SlNo exists
    if (item?.SlNo && shouldShowMepItem(item.SlNo, poolType, hasGutter)) {
      return true;
    }

    // Allow fallback items without SlNo
    if (!item?.SlNo) return true;

    return false;
  });
};

// Map piping item for display
const mapPipingItem = (item) => ({
  ...item,
  uiSlNo: item.sl_no || item.id || Math.random(),
  deliveryQuantity: item.quantity || 0,
  deliveryStatus: (item.quantity || 0) > 0 ? 'pending' : 'not-required',
  deliveryRemarks: '',
  description: item.description || 'Piping Item',
  unit: item.unit || 'NOS',
  code: item.code || '',
  category: item.category || '',
  type: item.type || '',
  dia: item.dia || null,
  supplyRate: item.supply_rate || item.rate || 0,
  installationRate: item.installation_rate || (item.supply_rate || item.rate || 0) * INSTALLATION_PERCENT,
  totalAmount: item.amount || (item.quantity * ((item.supply_rate || item.rate || 0) + (item.installation_rate || (item.supply_rate || item.rate || 0) * INSTALLATION_PERCENT))) || 0,
  hasQuantity: (item.quantity || 0) > 0
});

// ================================
// DEFAULT FALLBACK COMPANY PROFILE
// ================================
const DEFAULT_COMPANY_PROFILE = {
  company_name: "INTELITHON TECHNOLOGIES",
  logo_url: "",
  phone: "+91 1234567890",
  email: "info@intelithon.com",
  website: "www.intelithon.com",
  address: "No. 1, 1st Floor, Deepa Towers, Esther Enclave, Horamavu, Bangalore, Karnataka - 560043",
  gst_number: "GSTIN: 33AABCA1234B1Z5"
};

// ================================
// MAIN COMPONENT
// ================================
function DeliveryChallan() {
  const location = useLocation();
  const navigate = useNavigate();

  // DEBUG LOG - Helps identify what data is coming from navigation
  console.log("🔍 DELIVERY INPUT STATE:", location.state);

  // ================================
  // FIX 1: MERGE ALL QUANTITY SOURCES INTO resultData
  // ================================
  const resultData = {
    ...(location.state?.result || {}),
    ...(location.state?.civilQuantities || {}),
    ...(location.state?.mepQuantities || {}),
    ...(location.state?.pumpRoomQuantities || {})
  };
  const dimensions = location.state?.dimensions || {};
  
  // FIX 5: ADD SAFE FALLBACK FOR ITEMS (allow both filtered and raw)
  const mainPoolItems =
    location.state?.filteredMainPoolItems ||
    location.state?.mainPoolItems ||
    [];

  const mepItems =
    location.state?.filteredMepItems ||
    location.state?.mepItems ||
    [];

  const balanceTankItems = location.state?.balanceTankItems || [];
  const pumpRoomItems = location.state?.pumpRoomItems || [];
  
  // Additional data
  const pipingItemsFromState = location.state?.pipingItems || [];
  const pumpRoomQuantities = location.state?.pumpRoomQuantities || {};
  const pumpRoomDimensions = location.state?.pumpRoomDimensions || {};
  const templateDescriptions = location.state?.templateDescriptions || {};
  const mainPoolRemarks = location.state?.mainPoolRemarks || {};
  const balancingTankRemarks = location.state?.balancingTankRemarks || {};
  const mepRemarks = location.state?.mepRemarks || {};
  const pumpRoomRemarks = location.state?.pumpRoomRemarks || {};
  const selectedAdvancedEquipment = location.state?.selectedAdvancedEquipment || [];
  const overflowGratingData = location.state?.overflowGratingData || null;
  
  // Piping data from location state
  const pipingTotal = location.state?.pipingTotal || 0;
  
  // Pool type specific settings
  const poolType = location.state?.poolType || 'skimmer';
  const hasGutter = location.state?.hasGutter || false;
  const hasBalancingTank = location.state?.hasBalancingTank || 
    (poolType === 'overflow' || poolType === 'infinity' || poolType === 'curved');
  const includePumpRoom = location.state?.includePumpRoom || 
    (poolType === 'overflow' || poolType === 'infinity' || poolType === 'curved' || poolType === 'skimmer');
  const constructionType = location.state?.constructionType || 'in-ground';

  // DEBUG LOG - Show received data
  console.log("DELIVERY FINAL DATA:", {
    mainPoolItems,
    mepItems,
    pumpRoomItems,
    balanceTankItems,
    resultData,
    dimensions,
    poolType,
    hasGutter,
    hasBalancingTank,
    includePumpRoom,
    constructionType
  });

  // ================================
  // COMPANY PROFILE STATE
  // ================================
  const [companyProfile, setCompanyProfile] = useState(DEFAULT_COMPANY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);

  // ================================
  // COMPONENT STATE
  // ================================
  const [loading, setLoading] = useState(false);
  
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
    projectName: "Swimming Pool Construction",
    deliveryAddress: "",
    preparedBy: "",
    authorizedBy: "",
    receivedBy: "",
    deliveryStatus: "pending",
    vehicleNumber: "",
    driverName: "",
    driverContact: "",
    notes: "Handle with care. Store in dry place. Verify all items upon delivery."
  });

  // Filtered and processed items
  const [filteredMainPoolItems, setFilteredMainPoolItems] = useState([]);
  const [filteredBalancingTankItems, setFilteredBalancingTankItems] = useState([]);
  const [filteredPumpRoomItems, setFilteredPumpRoomItems] = useState([]);
  const [filteredMepItems, setFilteredMepItems] = useState([]);
  
  // Piping items state
  const [pipingItems, setPipingItems] = useState([]);
  
  // Selection state
  const [selectedMainPoolItems, setSelectedMainPoolItems] = useState(new Set());
  const [selectedBalancingTankItems, setSelectedBalancingTankItems] = useState(new Set());
  const [selectedPumpRoomItems, setSelectedPumpRoomItems] = useState(new Set());
  const [selectedMepItems, setSelectedMepItems] = useState(new Set());
  const [selectedPipingItems, setSelectedPipingItems] = useState(new Set());
  
  // Editable quantities state
  const [editedQuantities, setEditedQuantities] = useState({});

  // ================================
  // FETCH TENANT BRANDING
  // ================================
  useEffect(() => {
    const fetchTenantProfile = async () => {
      setProfileLoading(true);
      
      try {
        const companyCode = localStorage.getItem("tenant_company_code");

        if (!companyCode) {
          console.warn("No company_code found in localStorage, using default profile");

          const cached = localStorage.getItem("tenant_company_profile");
          if (cached) {
            const parsed = JSON.parse(cached);
            setCompanyProfile(parsed);
            console.log("Loaded tenant profile from cache:", parsed);
            
            setDeliveryData(prev => ({
              ...prev,
              fromCompanyName: parsed.company_name || "",
              fromAddress: parsed.address || "",
              fromContact: `${parsed.phone || ""} | ${parsed.email || ""}`,
              fromGST: parsed.gst_number || ""
            }));
          }
          
          setProfileLoading(false);
          return;
        }

        console.log("🔄 Fetching tenant profile for company code:", companyCode);

        const response = await fetch(
          `${API_BASE_URL}/admin/tenant/public-profile?company_code=${companyCode}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json"
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          const profile = result.data;
          console.log("✅ Loaded tenant profile:", profile);

          setCompanyProfile(profile);

          localStorage.setItem(
            "tenant_company_profile",
            JSON.stringify(profile)
          );

          setDeliveryData(prev => ({
            ...prev,
            fromCompanyName: profile.company_name || "",
            fromAddress: profile.address || "",
            fromGST: profile.gst_number || "",
            fromContact: `${profile.phone || ""} | ${profile.email || ""}`
          }));

        } else {
          throw new Error("Invalid profile response");
        }

      } catch (error) {
        console.error("❌ Error fetching tenant profile:", error);

        const cached = localStorage.getItem("tenant_company_profile");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setCompanyProfile(parsed);
            console.log("Loaded tenant profile from cache after error:", parsed);
            
            setDeliveryData(prev => ({
              ...prev,
              fromCompanyName: parsed.company_name || "",
              fromAddress: parsed.address || "",
              fromContact: `${parsed.phone || ""} | ${parsed.email || ""}`,
              fromGST: parsed.gst_number || ""
            }));
          } catch (e) {
            console.error("Error parsing cached profile:", e);
          }
        }
      } finally {
        setProfileLoading(false);
      }
    };

    fetchTenantProfile();
  }, []);

  // ================================
  // GENERATE CHALLAN NUMBER
  // ================================
  useEffect(() => {
    const generateChallanNo = () => {
      const timestamp = new Date().getTime();
      const random = Math.floor(Math.random() * 1000);
      return `DC-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${random}`;
    };

    setDeliveryData(prev => ({
      ...prev,
      challanNo: generateChallanNo()
    }));
  }, []);

  // ================================
  // QUANTITY EXTRACTION FUNCTIONS - SAFE with fallback
  // ================================
  
  const getMainPoolQuantity = (slNo) => {
    if (!slNo) return 0;
    const fieldName = MAIN_POOL_QTY_FIELDS[slNo];
    if (!fieldName) return 0;
    
    if (resultData && resultData[fieldName] !== undefined) {
      return resultData[fieldName] || 0;
    }
    
    return 0;
  };

  const getBalancingTankQuantity = (slNo) => {
    if (!slNo) return 0;
    const fieldName = BALANCE_TANK_QTY_FIELDS[slNo];
    if (!fieldName) return 0;
    
    if (resultData && resultData[fieldName] !== undefined) {
      return resultData[fieldName] || 0;
    }
    
    return 0;
  };

  const getPumpRoomQuantity = (slNo) => {
    if (!slNo) return 0;
    const fieldName = PUMP_ROOM_QTY_FIELDS[slNo];
    if (!fieldName) return 0;
    
    if (pumpRoomQuantities && pumpRoomQuantities[fieldName] !== undefined) {
      return pumpRoomQuantities[fieldName] || 0;
    }
    
    if (resultData && resultData[fieldName] !== undefined) {
      return resultData[fieldName] || 0;
    }
    
    return 0;
  };

  const getMepQuantity = (slNo) => {
    if (!slNo) return 0;
    const fieldName = MEP_QTY_FIELDS[slNo];
    if (!fieldName) return 0;
    
    // For advanced equipment (SlNo 30-34)
    if (slNo >= 30 && slNo <= 34) {
      return selectedAdvancedEquipment.includes(slNo) ? 1 : 0;
    }
    
    if (resultData && resultData[fieldName] !== undefined) {
      return resultData[fieldName] || 0;
    }
    
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
  // DESCRIPTION PROCESSING
  // ================================
  
  const getProcessedDescription = (slNo, originalDescription, itemType = 'mainPool') => {
    // Use template descriptions if available
    if (slNo && templateDescriptions && templateDescriptions[slNo]) {
      return templateDescriptions[slNo];
    }
    
    // Handle overflow grating for overflow pools
    if (poolType === 'overflow' && slNo === 11 && overflowGratingData) {
      return overflowGratingData.Description;
    }
    
    // Handle filter description with MPV and diameter
    if (slNo === 1 && resultData?.filter_dia_mm) {
      return `Filter with Clamp Lid and ${resultData.mpv_size || ""} Side Connection, designed for efficient pool water filtration. This model features a filter diameter of ${resultData.filter_dia_mm} mm, optimized for a filtration velocity of 40 m³/h/m² and a maximum operating pressure of 2.5 bar.`;
    }
    
    // Handle pump description with HP
    if (slNo === 7 && resultData?.hp) {
      return `${originalDescription || "Circulation Pump"} (${resultData.hp} HP)`;
    }
    
    // Add context for pump room items
    if (itemType === 'pumpRoom') {
      if (originalDescription) {
        return `${originalDescription} - Pump Room`;
      }
    }
    
    // Add context for balancing tank items
    if (itemType === 'balancingTank') {
      if (originalDescription) {
        return `${originalDescription} - Balancing Tank`;
      }
    }
    
    return originalDescription || "Description not available";
  };

  // ================================
  // PROCESS PIPING ITEMS
  // ================================
  const processPipingItems = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return [];
    }
    
    return items.map(mapPipingItem);
  };

  // ================================
  // GROUP PIPING ITEMS - Using useMemo
  // ================================
  const groupedPipingItems = useMemo(() => {
    if (!pipingItems.length) return { headers: [], pipes: [], valves: [], flanges: [] };
    
    const pipes = pipingItems.filter(i => 
      i.category === "pipe" || 
      i.category === "pipes" ||
      normalizeType(i.type).includes("pipe")
    );
    
    const valves = pipingItems.filter(i => 
      i.category === "valve" || 
      i.category === "ball_valve" ||
      i.category === "check_valve" ||
      normalizeType(i.type).includes("valve")
    );
    
    const flanges = pipingItems.filter(i => 
      i.category === "flange" || 
      i.category === "puddle_flange" ||
      normalizeType(i.type).includes("flange")
    );
    
    const headers = pipingItems.filter(i => 
      i.category === "header" || 
      normalizeType(i.type).includes("header")
    );
    
    return { pipes, valves, flanges, headers };
  }, [pipingItems]);

  // ================================
  // PROCESS DELIVERY ITEMS - WITH SAFE FILTERING
  // ================================
  useEffect(() => {
    const processAllItems = () => {
      setLoading(true);
      
      try {
        console.log("🔄 Processing delivery items for pool type:", poolType);
        console.log("🔄 Main Pool Items count:", mainPoolItems?.length || 0);
        console.log("🔄 MEP Items count:", mepItems?.length || 0);
        console.log("🔄 Balance Tank Items count:", balanceTankItems?.length || 0);
        console.log("🔄 Pump Room Items count:", pumpRoomItems?.length || 0);
        console.log("🔄 Piping Items from state count:", pipingItemsFromState?.length || 0);
        
        // Debug log to see actual items
        console.log("🔄 Main Pool Items sample:", mainPoolItems?.slice(0, 2));
        console.log("🔄 MEP Items sample:", mepItems?.slice(0, 2));
        
        // Warnings for empty data
        if (!mainPoolItems || mainPoolItems.length === 0) {
          console.warn("⚠️ No Main Pool Items received");
        }
        if (!mepItems || mepItems.length === 0) {
          console.warn("⚠️ No MEP Items received");
        }
        
        // ========================================
        // 1. PROCESS MAIN POOL ITEMS - SAFE FILTERING
        // ========================================
        const mainPoolItemsWithQuantities = filterMainPoolItems(mainPoolItems || [])
          .map(item => {
            const slNo = item.SlNo;
            const originalQty = getMainPoolQuantity(slNo);
            const finalQty = getFinalQty('mainPool', slNo, originalQty);
            
            return {
              ...item,
              uiSlNo: slNo || item.id || Math.random(),
              deliveryQuantity: finalQty,
              originalQuantity: originalQty,
              deliveryStatus: finalQty > 0 ? 'pending' : 'not-required',
              deliveryRemarks: mainPoolRemarks[slNo] || '',
              description: getProcessedDescription(slNo, item.Description || item.description, 'mainPool'),
              hasQuantity: finalQty > 0 || originalQty > 0
            };
          })
          // FIX 2: CHANGE FILTER TO item !== null
          .filter(item => item !== null)
          .sort((a, b) => (a.uiSlNo || 0) - (b.uiSlNo || 0));
        
        setFilteredMainPoolItems(mainPoolItemsWithQuantities);
        
        const mainPoolIndices = new Set();
        mainPoolItemsWithQuantities.forEach((_, index) => mainPoolIndices.add(index));
        setSelectedMainPoolItems(mainPoolIndices);
        
        console.log("✅ Main Pool items after processing:", mainPoolItemsWithQuantities.length);
        
        // ========================================
        // 2. PROCESS BALANCING TANK ITEMS - SAFE FILTERING
        // ========================================
        if (hasBalancingTank) {
          const balancingItemsWithQuantities = filterBalancingTankItems(balanceTankItems || [])
            .map(item => {
              const slNo = item.SlNo;
              const originalQty = getBalancingTankQuantity(slNo);
              const finalQty = getFinalQty('balancingTank', slNo, originalQty);
              
              return {
                ...item,
                uiSlNo: slNo || item.id || Math.random(),
                deliveryQuantity: finalQty,
                originalQuantity: originalQty,
                deliveryStatus: finalQty > 0 ? 'pending' : 'not-required',
                deliveryRemarks: balancingTankRemarks[slNo] || '',
                description: getProcessedDescription(slNo, item.Description || item.description, 'balancingTank'),
                hasQuantity: finalQty > 0 || originalQty > 0
              };
            })
            .filter(item => item !== null)
            .sort((a, b) => (a.uiSlNo || 0) - (b.uiSlNo || 0));
          
          setFilteredBalancingTankItems(balancingItemsWithQuantities);
          
          const balancingIndices = new Set();
          balancingItemsWithQuantities.forEach((_, index) => balancingIndices.add(index));
          setSelectedBalancingTankItems(balancingIndices);
        }
        
        // ========================================
        // 3. PROCESS PUMP ROOM ITEMS - SAFE FILTERING
        // ========================================
        if (includePumpRoom) {
          const pumpRoomItemsWithQuantities = filterPumpRoomItems(pumpRoomItems || [])
            .map(item => {
              const slNo = item.SlNo;
              const originalQty = getPumpRoomQuantity(slNo);
              const finalQty = getFinalQty('pumpRoom', slNo, originalQty);
              
              let description = getProcessedDescription(slNo, item.Description || item.description, 'pumpRoom');
              
              return {
                ...item,
                uiSlNo: slNo || item.id || Math.random(),
                deliveryQuantity: finalQty,
                originalQuantity: originalQty,
                deliveryStatus: finalQty > 0 ? 'pending' : 'not-required',
                deliveryRemarks: pumpRoomRemarks[slNo] || '',
                description,
                hasQuantity: finalQty > 0 || originalQty > 0
              };
            })
            .filter(item => item !== null)
            .sort((a, b) => (a.uiSlNo || 0) - (b.uiSlNo || 0));
          
          setFilteredPumpRoomItems(pumpRoomItemsWithQuantities);
          
          const pumpRoomIndices = new Set();
          pumpRoomItemsWithQuantities.forEach((_, index) => pumpRoomIndices.add(index));
          setSelectedPumpRoomItems(pumpRoomIndices);
        }
        
        // ========================================
        // 4. PROCESS MEP ITEMS - SAFE FILTERING
        // ========================================
        const mepItemsWithQuantities = filterMepItems(mepItems || [], poolType, hasGutter)
          .map(item => {
            const slNo = item.SlNo;
            const originalQty = getMepQuantity(slNo);
            const finalQty = getFinalQty('mep', slNo, originalQty);
            
            // For overflow pools, replace SlNo 11 with Overflow Grating
            if (poolType === 'overflow' && slNo === 11 && overflowGratingData) {
              return {
                ...overflowGratingData,
                SlNo: 11,
                uiSlNo: 11,
                deliveryQuantity: finalQty,
                originalQuantity: originalQty,
                deliveryStatus: finalQty > 0 ? 'pending' : 'not-required',
                deliveryRemarks: mepRemarks[slNo] || '',
                description: overflowGratingData.Description,
                Unit: overflowGratingData.Unit,
                Code: 'OG-001',
                hasQuantity: finalQty > 0 || originalQty > 0
              };
            }
            
            let description = getProcessedDescription(slNo, item.Description || item.description, 'mep');
            
            return {
              ...item,
              uiSlNo: slNo || item.id || Math.random(),
              deliveryQuantity: finalQty,
              originalQuantity: originalQty,
              deliveryStatus: finalQty > 0 ? 'pending' : 'not-required',
              deliveryRemarks: mepRemarks[slNo] || '',
              description,
              hasQuantity: finalQty > 0 || originalQty > 0
            };
          })
          .filter(item => item !== null)
          .sort((a, b) => (a.uiSlNo || 0) - (b.uiSlNo || 0));
        
        setFilteredMepItems(mepItemsWithQuantities);
        
        const mepIndices = new Set();
        mepItemsWithQuantities.forEach((_, index) => mepIndices.add(index));
        setSelectedMepItems(mepIndices);
        
        // ========================================
        // 5. PROCESS PIPING ITEMS - SAFE PROCESSING
        // ========================================
        const mappedPipingItems = processPipingItems(pipingItemsFromState);
        setPipingItems(mappedPipingItems);
        
        // DEBUG LOG for piping data
        console.log("PIPING FROM STATE:", pipingItemsFromState);
        console.log("MAPPED PIPING:", mappedPipingItems);
        
        const pipingIndices = new Set();
        mappedPipingItems.forEach((_, index) => pipingIndices.add(index));
        setSelectedPipingItems(pipingIndices);
        
        console.log("✅ Delivery items processed successfully");
        console.log("   Main Pool items:", mainPoolItemsWithQuantities.length);
        console.log("   MEP items:", mepItemsWithQuantities.length);
        console.log("   Balancing Tank items:", filteredBalancingTankItems.length);
        console.log("   Pump Room items:", filteredPumpRoomItems.length);
        console.log("   Piping items:", mappedPipingItems.length);
        
      } catch (error) {
        console.error("❌ Error processing delivery items:", error);
      } finally {
        setLoading(false);
      }
    };
    
    processAllItems();
  }, [
    mainPoolItems, mepItems, balanceTankItems, pumpRoomItems,
    poolType, hasGutter, hasBalancingTank, includePumpRoom,
    resultData, pumpRoomQuantities, templateDescriptions,
    mainPoolRemarks, balancingTankRemarks, mepRemarks, pumpRoomRemarks,
    selectedAdvancedEquipment, overflowGratingData, pipingItemsFromState
  ]);

  // ================================
  // HANDLER FUNCTIONS
  // ================================
  
  const handleInputChange = (field, value) => {
    setDeliveryData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemStatusChange = (category, index, value) => {
    const setters = {
      'mainPool': setFilteredMainPoolItems,
      'balancingTank': setFilteredBalancingTankItems,
      'pumpRoom': setFilteredPumpRoomItems,
      'mep': setFilteredMepItems,
      'piping': setPipingItems
    };
    
    const setter = setters[category];
    if (setter) {
      setter(prev => {
        const newItems = [...prev];
        if (newItems[index]) {
          newItems[index] = {
            ...newItems[index],
            deliveryStatus: value
          };
        }
        return newItems;
      });
    }
  };

  const handleItemRemarksChange = (category, index, value) => {
    const setters = {
      'mainPool': setFilteredMainPoolItems,
      'balancingTank': setFilteredBalancingTankItems,
      'pumpRoom': setFilteredPumpRoomItems,
      'mep': setFilteredMepItems,
      'piping': setPipingItems
    };
    
    const setter = setters[category];
    if (setter) {
      setter(prev => {
        const newItems = [...prev];
        if (newItems[index]) {
          newItems[index] = {
            ...newItems[index],
            deliveryRemarks: value
          };
        }
        return newItems;
      });
    }
  };

  const handleSelectItem = (category, index) => {
    const selectionSetters = {
      'mainPool': setSelectedMainPoolItems,
      'balancingTank': setSelectedBalancingTankItems,
      'pumpRoom': setSelectedPumpRoomItems,
      'mep': setSelectedMepItems,
      'piping': setSelectedPipingItems
    };
    
    const selectionStates = {
      'mainPool': selectedMainPoolItems,
      'balancingTank': selectedBalancingTankItems,
      'pumpRoom': selectedPumpRoomItems,
      'mep': selectedMepItems,
      'piping': selectedPipingItems
    };
    
    const setSelection = selectionSetters[category];
    const selection = selectionStates[category];
    
    if (setSelection && selection) {
      if (selection.has(index)) {
        const newSelection = new Set(selection);
        newSelection.delete(index);
        setSelection(newSelection);
      } else {
        const newSelection = new Set(selection);
        newSelection.add(index);
        setSelection(newSelection);
      }
    }
  };

  const handleSelectAll = (category, items) => {
    const selectionSetters = {
      'mainPool': setSelectedMainPoolItems,
      'balancingTank': setSelectedBalancingTankItems,
      'pumpRoom': setSelectedPumpRoomItems,
      'mep': setSelectedMepItems,
      'piping': setSelectedPipingItems
    };
    
    const selectionStates = {
      'mainPool': selectedMainPoolItems,
      'balancingTank': selectedBalancingTankItems,
      'pumpRoom': selectedPumpRoomItems,
      'mep': selectedMepItems,
      'piping': selectedPipingItems
    };
    
    const setSelection = selectionSetters[category];
    const selection = selectionStates[category];
    
    if (setSelection && selection) {
      if (selection.size === items.length) {
        setSelection(new Set());
      } else {
        const newSelection = new Set();
        items.forEach((_, index) => newSelection.add(index));
        setSelection(newSelection);
      }
    }
  };

  const getSelectedCount = (category) => {
    const selectionStates = {
      'mainPool': selectedMainPoolItems,
      'balancingTank': selectedBalancingTankItems,
      'pumpRoom': selectedPumpRoomItems,
      'mep': selectedMepItems,
      'piping': selectedPipingItems
    };
    return selectionStates[category]?.size || 0;
  };

  const getSelectedItems = (category, items) => {
    const selectionStates = {
      'mainPool': selectedMainPoolItems,
      'balancingTank': selectedBalancingTankItems,
      'pumpRoom': selectedPumpRoomItems,
      'mep': selectedMepItems,
      'piping': selectedPipingItems
    };
    
    return items.filter((_, index) => selectionStates[category]?.has(index));
  };

  // ================================
  // PDF GENERATION FUNCTIONS (unchanged, but kept for completeness)
  // ================================

  const addProfessionalTable = (pdf, title, items, startY, margin, pageWidth, pageHeight) => {
    // ... (same as before, not modified)
    // For brevity, we include the same function from the original code.
    // In a real implementation, this function would be exactly as provided earlier.
    // Since the prompt does not ask to change PDF generation, we keep it as is.
    // To save space in this answer, we'll just show a placeholder.
    // In the final output, the full function must be included.
    let yPos = startY;
    const usableWidth = pageWidth - 2 * margin;
    
    const primaryColor = [30, 60, 114];
    const headerBg = [240, 240, 240];
    const altRowBg = [252, 252, 254];
    
    pdf.setFillColor(...primaryColor);
    pdf.rect(margin, yPos, usableWidth, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(title, margin + 3, yPos + 5.5);
    
    yPos += 8;
    
    const colWidths = {
      no: 12,
      code: 18,
      description: 85,
      unit: 15,
      qty: 22,
      status: 28
    };
    
    pdf.setFillColor(...headerBg);
    pdf.rect(margin, yPos, usableWidth, 8, 'F');
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, yPos, usableWidth, 8);
    
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
    
    pdf.text('Sl.No', margin + colWidths.no/2, yPos + 5.5, { align: 'center' });
    pdf.text('Code', margin + colWidths.no + colWidths.code/2, yPos + 5.5, { align: 'center' });
    pdf.text('Description', margin + colWidths.no + colWidths.code + 2, yPos + 5.5);
    pdf.text('Unit', margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit/2, yPos + 5.5, { align: 'center' });
    pdf.text('Qty', margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit + colWidths.qty/2, yPos + 5.5, { align: 'center' });
    pdf.text('Status', margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit + colWidths.qty + colWidths.status/2, yPos + 5.5, { align: 'center' });
    
    yPos += 8;
    
    const rowHeight = 8;
    
    items.forEach((item, index) => {
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = margin + 10;
        
        pdf.setFillColor(...primaryColor);
        pdf.rect(margin, yPos, usableWidth, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(title + ' (Continued)', margin + 3, yPos + 5.5);
        yPos += 8;
        
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
        pdf.text('Sl.No', margin + colWidths.no/2, yPos + 5.5, { align: 'center' });
        pdf.text('Code', margin + colWidths.no + colWidths.code/2, yPos + 5.5, { align: 'center' });
        pdf.text('Description', margin + colWidths.no + colWidths.code + 2, yPos + 5.5);
        pdf.text('Unit', margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit/2, yPos + 5.5, { align: 'center' });
        pdf.text('Qty', margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit + colWidths.qty/2, yPos + 5.5, { align: 'center' });
        pdf.text('Status', margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit + colWidths.qty + colWidths.status/2, yPos + 5.5, { align: 'center' });
        
        yPos += 8;
      }
      
      if (index % 2 === 0) {
        pdf.setFillColor(...altRowBg);
        pdf.rect(margin, yPos, usableWidth, rowHeight, 'F');
      }
      
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.2);
      pdf.rect(margin, yPos, usableWidth, rowHeight);
      
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
      
      const displayNumber = item.uiSlNo || index + 1;
      pdf.text(String(displayNumber), margin + colWidths.no/2, cellY, { align: 'center' });
      
      pdf.text(cleanTextForPDF(item.Code || 'N/A'), margin + colWidths.no + colWidths.code/2, cellY, { align: 'center' });
      
      const desc = cleanTextForPDF(item.description || 'N/A');
      const maxDescWidth = colWidths.description - 8;
      const descLines = pdf.splitTextToSize(desc, maxDescWidth);
      const firstLine = descLines[0];
      const displayText = descLines.length > 1 ? firstLine.substring(0, 65) + '...' : firstLine;
      pdf.text(displayText, margin + colWidths.no + colWidths.code + 4, cellY);
      
      pdf.text(cleanTextForPDF(item.Unit || ''), margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit/2, cellY, { align: 'center' });
      
      const qtyText = safeToFixed(item.deliveryQuantity, 2);
      const qtyX = margin + colWidths.no + colWidths.code + colWidths.description + colWidths.unit;
      pdf.text(qtyText, qtyX + colWidths.qty - 3, cellY, { align: 'right' });
      
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
      
      pdf.setTextColor(0, 0, 0);
      
      yPos += rowHeight;
    });
    
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.4);
    pdf.line(margin, yPos, margin + usableWidth, yPos);
    
    return yPos + 10;
  };

  const addPipingTable = (pdf, title, pipes, valves, flanges, headers, allItems, startY, margin, pageWidth, pageHeight) => {
    // ... (same as before, not modified)
    // For brevity, we include a placeholder; in the final code it must be the full function.
    let yPos = startY;
    const usableWidth = pageWidth - 2 * margin;
    
    const primaryColor = [30, 60, 114];
    const headerBg = [240, 240, 240];
    const altRowBg = [252, 252, 254];
    const sectionBg = [230, 240, 250];
    
    pdf.setFillColor(...primaryColor);
    pdf.rect(margin, yPos, usableWidth, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(title + ` (Total: ${allItems.length} items)`, margin + 3, yPos + 5.5);
    
    yPos += 8;
    
    const colWidths = {
      no: 12,
      code: 18,
      type: 18,
      dia: 15,
      description: 70,
      unit: 15,
      qty: 22,
      status: 28
    };
    
    const renderSection = (sectionTitle, items) => {
      if (items.length === 0) return yPos;
      
      if (yPos > pageHeight - 60) {
        pdf.addPage();
        yPos = margin + 10;
        
        pdf.setFillColor(...primaryColor);
        pdf.rect(margin, yPos, usableWidth, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(title + ' (Continued)', margin + 3, yPos + 5.5);
        yPos += 8;
      }
      
      pdf.setFillColor(...sectionBg);
      pdf.rect(margin, yPos, usableWidth, 6, 'F');
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margin, yPos, usableWidth, 6);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text(sectionTitle + ` (${items.length} items)`, margin + 3, yPos + 4);
      yPos += 6;
      
      pdf.setFillColor(...headerBg);
      pdf.rect(margin, yPos, usableWidth, 8, 'F');
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margin, yPos, usableWidth, 8);
      
      let xPos = margin;
      const colOrder = ['no', 'code', 'type', 'dia', 'description', 'unit', 'qty', 'status'];
      colOrder.forEach((col, idx) => {
        if (idx > 0) {
          pdf.line(xPos, yPos, xPos, yPos + 8);
        }
        xPos += colWidths[col];
      });
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      
      pdf.text('Sl.No', margin + colWidths.no/2, yPos + 5, { align: 'center' });
      pdf.text('Code', margin + colWidths.no + colWidths.code/2, yPos + 5, { align: 'center' });
      pdf.text('Type', margin + colWidths.no + colWidths.code + colWidths.type/2, yPos + 5, { align: 'center' });
      pdf.text('Dia', margin + colWidths.no + colWidths.code + colWidths.type + colWidths.dia/2, yPos + 5, { align: 'center' });
      pdf.text('Description', margin + colWidths.no + colWidths.code + colWidths.type + colWidths.dia + 2, yPos + 5);
      pdf.text('Unit', margin + colWidths.no + colWidths.code + colWidths.type + colWidths.dia + colWidths.description + colWidths.unit/2, yPos + 5, { align: 'center' });
      pdf.text('Qty', margin + colWidths.no + colWidths.code + colWidths.type + colWidths.dia + colWidths.description + colWidths.unit + colWidths.qty/2, yPos + 5, { align: 'center' });
      pdf.text('Status', margin + colWidths.no + colWidths.code + colWidths.type + colWidths.dia + colWidths.description + colWidths.unit + colWidths.qty + colWidths.status/2, yPos + 5, { align: 'center' });
      
      yPos += 8;
      
      const rowHeight = 8;
      
      items.forEach((item, idx) => {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = margin + 10;
          
          pdf.setFillColor(...primaryColor);
          pdf.rect(margin, yPos, usableWidth, 8, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text(title + ' (Continued)', margin + 3, yPos + 5.5);
          yPos += 8;
          
          pdf.setFillColor(...sectionBg);
          pdf.rect(margin, yPos, usableWidth, 6, 'F');
          pdf.rect(margin, yPos, usableWidth, 6);
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.text(sectionTitle + ` (Continued)`, margin + 3, yPos + 4);
          yPos += 6;
          
          pdf.setFillColor(...headerBg);
          pdf.rect(margin, yPos, usableWidth, 8, 'F');
          pdf.rect(margin, yPos, usableWidth, 8);
          
          xPos = margin;
          colOrder.forEach((col, idx) => {
            if (idx > 0) {
              pdf.line(xPos, yPos, xPos, yPos + 8);
            }
            xPos += colWidths[col];
          });
          
          pdf.text('Sl.No', margin + colWidths.no/2, yPos + 5, { align: 'center' });
          pdf.text('Code', margin + colWidths.no + colWidths.code/2, yPos + 5, { align: 'center' });
          pdf.text('Type', margin + colWidths.no + colWidths.code + colWidths.type/2, yPos + 5, { align: 'center' });
          pdf.text('Dia', margin + colWidths.no + colWidths.code + colWidths.type + colWidths.dia/2, yPos + 5, { align: 'center' });
          pdf.text('Description', margin + colWidths.no + colWidths.code + colWidths.type + colWidths.dia + 2, yPos + 5);
          pdf.text('Unit', margin + colWidths.no + colWidths.code + colWidths.type + colWidths.dia + colWidths.description + colWidths.unit/2, yPos + 5, { align: 'center' });
          pdf.text('Qty', margin + colWidths.no + colWidths.code + colWidths.type + colWidths.dia + colWidths.description + colWidths.unit + colWidths.qty/2, yPos + 5, { align: 'center' });
          pdf.text('Status', margin + colWidths.no + colWidths.code + colWidths.type + colWidths.dia + colWidths.description + colWidths.unit + colWidths.qty + colWidths.status/2, yPos + 5, { align: 'center' });
          
          yPos += 8;
        }
        
        if (idx % 2 === 0) {
          pdf.setFillColor(...altRowBg);
          pdf.rect(margin, yPos, usableWidth, rowHeight, 'F');
        }
        
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.2);
        pdf.rect(margin, yPos, usableWidth, rowHeight);
        
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
        
        pdf.text(String(item.uiSlNo || idx + 1), margin + colWidths.no/2, cellY, { align: 'center' });
        
        pdf.text(cleanTextForPDF(item.code || '-'), margin + colWidths.no + colWidths.code/2, cellY, { align: 'center' });
        
        const itemType = item.type || item.category || '-';
        pdf.text(cleanTextForPDF(itemType).substring(0, 10), margin + colWidths.no + colWidths.code + colWidths.type/2, cellY, { align: 'center' });
        
        const diaText = item.dia ? `${item.dia}mm` : '-';
        pdf.text(diaText, margin + colWidths.no + colWidths.code + colWidths.type + colWidths.dia/2, cellY, { align: 'center' });
        
        const desc = cleanTextForPDF(item.description || 'N/A');
        const maxDescWidth = colWidths.description - 8;
        const descLines = pdf.splitTextToSize(desc, maxDescWidth);
        const firstLine = descLines[0];
        const displayText = descLines.length > 1 ? firstLine.substring(0, 50) + '...' : firstLine;
        pdf.text(displayText, margin + colWidths.no + colWidths.code + colWidths.type + colWidths.dia + 4, cellY);
        
        pdf.text(cleanTextForPDF(item.unit || 'NOS'), margin + colWidths.no + colWidths.code + colWidths.type + colWidths.dia + colWidths.description + colWidths.unit/2, cellY, { align: 'center' });
        
        const qtyText = safeToFixed(item.deliveryQuantity || 0, 2);
        const qtyX = margin + colWidths.no + colWidths.code + colWidths.type + colWidths.dia + colWidths.description + colWidths.unit;
        pdf.text(qtyText, qtyX + colWidths.qty - 3, cellY, { align: 'right' });
        
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
        
        const statusX = margin + colWidths.no + colWidths.code + colWidths.type + colWidths.dia + colWidths.description + colWidths.unit + colWidths.qty;
        pdf.text(status.toUpperCase(), statusX + colWidths.status/2, cellY, { align: 'center' });
        
        pdf.setTextColor(0, 0, 0);
        
        yPos += rowHeight;
      });
      
      return yPos;
    };
    
    if (headers.length > 0) {
      yPos = renderSection('Headers', headers);
    }
    
    if (pipes.length > 0) {
      yPos = renderSection('Pipes', pipes);
    }
    
    if (valves.length > 0) {
      yPos = renderSection('Valves', valves);
    }
    
    if (flanges.length > 0) {
      yPos = renderSection('Flanges', flanges);
    }
    
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.4);
    pdf.line(margin, yPos, margin + usableWidth, yPos);
    
    return yPos + 10;
  };

  const generateDeliveryPDF = async () => {
    // ... (same as before, not modified)
    // For brevity, we include a placeholder; in the final code it must be the full function.
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
      
      try {
        if (companyProfile.logo_url) {
          const logoUrl = `${API_BASE_URL}/${companyProfile.logo_url}`;
          const img = await loadImageAsBase64(logoUrl);
          if (img) {
            pdf.addImage(img, 'PNG', margin, 7, 18, 18);
          } else {
            const defaultLogoUrl = '/INT.png';
            const defaultImg = await loadImageAsBase64(defaultLogoUrl);
            if (defaultImg) {
              pdf.addImage(defaultImg, 'JPEG', margin, 7, 18, 18);
            }
          }
        } else {
          const defaultLogoUrl = '/INT.png';
          const defaultImg = await loadImageAsBase64(defaultLogoUrl);
          if (defaultImg) {
            pdf.addImage(defaultImg, 'JPEG', margin, 7, 18, 18);
          }
        }
      } catch (error) {
        console.log('Logo not found, continuing without logo');
      }
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      
      const pdfCompanyName = deliveryData.fromCompanyName || companyProfile.company_name || DEFAULT_COMPANY_PROFILE.company_name;
      pdf.text(pdfCompanyName, margin + 23, 13);
      
      pdf.setFontSize(12);
      pdf.text('DELIVERY CHALLAN', margin + 23, 21);
      
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
        { label: 'Status:', value: deliveryData.deliveryStatus.toUpperCase(), x: margin + 110 },
        { label: 'Pool Type:', value: `${poolType.toUpperCase()}${constructionType === 'terrace' ? ' (Terrace)' : ' (In-Ground)'}`, x: margin + 160 }
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
      
      const fromCompany = deliveryData.fromCompanyName || companyProfile.company_name || DEFAULT_COMPANY_PROFILE.company_name;
      const fromAddr = deliveryData.fromAddress || companyProfile.address || DEFAULT_COMPANY_PROFILE.address;
      const fromContact = deliveryData.fromContact || `${companyProfile.phone || DEFAULT_COMPANY_PROFILE.phone} | ${companyProfile.email || DEFAULT_COMPANY_PROFILE.email}`;
      const fromGST = deliveryData.fromGST || companyProfile.gst_number || DEFAULT_COMPANY_PROFILE.gst_number;
      
      pdf.text(cleanTextForPDF(fromCompany), margin + 3, yPos + 13);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      const fromLines = pdf.splitTextToSize(cleanTextForPDF(fromAddr), boxWidth - 6);
      pdf.text(fromLines, margin + 3, yPos + 18);
      pdf.text(cleanTextForPDF(fromContact), margin + 3, yPos + 26);
      pdf.setFontSize(7);
      pdf.text(cleanTextForPDF(fromGST), margin + 3, yPos + 30);
      
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
      
      // === POOL SPECIFICATIONS ===
      pdf.setFillColor(...primaryColor);
      pdf.rect(margin, yPos, usableWidth, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('PROJECT SPECIFICATIONS', margin + 3, yPos + 5.5);
      
      yPos += 8;
      
      const specHeight = 28;
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margin, yPos, usableWidth, specHeight);
      
      pdf.line(margin, yPos + 8, margin + usableWidth, yPos + 8);
      pdf.line(margin, yPos + 16, margin + usableWidth, yPos + 16);
      
      const col1Width = 60;
      const col2Width = 50;
      
      pdf.line(margin + col1Width, yPos, margin + col1Width, yPos + specHeight);
      pdf.line(margin + col1Width + col2Width, yPos, margin + col1Width + col2Width, yPos + specHeight);
      
      pdf.setTextColor(...darkText);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      
      pdf.text('Pool Dimensions', margin + 3, yPos + 5.5);
      pdf.text('Volume', margin + col1Width + 3, yPos + 5.5);
      pdf.text('Pool Type', margin + col1Width + col2Width + 3, yPos + 5.5);
      
      pdf.setFont('helvetica', 'normal');
      const dimStr = formatDimensions(dimensions);
      pdf.text(dimStr, margin + 3, yPos + 12);
      
      const volStr = `${safeToFixed(resultData?.volume_m3 || 0)} m³ (${safeToFixed(resultData?.liters || 0, 0)} L)`;
      pdf.text(volStr, margin + col1Width + 3, yPos + 12);
      
      const poolTypeText = `${poolType.toUpperCase()}${constructionType === 'terrace' ? ' - Terrace' : ' - In-Ground'}`;
      pdf.text(poolTypeText, margin + col1Width + col2Width + 3, yPos + 12);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Flow Rate', margin + 3, yPos + 13.5);
      pdf.text('Gutter System', margin + col1Width + 3, yPos + 13.5);
      pdf.text('Pump Room', margin + col1Width + col2Width + 3, yPos + 13.5);
      
      pdf.setFont('helvetica', 'normal');
      const flowStr = `${safeToFixed(resultData?.flowrate_m3_per_hr || 0)} m³/hr`;
      pdf.text(flowStr, margin + 3, yPos + 20);
      
      const gutterStr = hasBalancingTank ? "Yes (Balance Tank)" : "No";
      pdf.text(gutterStr, margin + col1Width + 3, yPos + 20);
      
      const pumpRoomStr = includePumpRoom ? "Included" : "Not Included";
      pdf.text(pumpRoomStr, margin + col1Width + col2Width + 3, yPos + 20);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Construction', margin + 3, yPos + 21.5);
      
      pdf.setFont('helvetica', 'normal');
      const constructionStr = constructionType === 'terrace' ? 'Terrace Pool (Structural only)' : 'In-Ground Pool (Complete)';
      pdf.text(constructionStr, margin + 3, yPos + 28);
      
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
      
      pdf.line(margin, yPos + 7.5, margin + usableWidth, yPos + 7.5);
      
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
      
      // === ITEMS TABLES ===
      const displayMainPoolItems = getSelectedItems('mainPool', filteredMainPoolItems);
      const displayBalancingTankItems = getSelectedItems('balancingTank', filteredBalancingTankItems);
      const displayPumpRoomItems = getSelectedItems('pumpRoom', filteredPumpRoomItems);
      const displayMepItems = getSelectedItems('mep', filteredMepItems);
      const displayPipingItems = getSelectedItems('piping', pipingItems);
      
      const displayPipes = displayPipingItems.filter(i => 
        i.category === "pipe" || i.category === "pipes" || normalizeType(i.type).includes("pipe")
      );
      const displayValves = displayPipingItems.filter(i => 
        i.category === "valve" || i.category === "ball_valve" || i.category === "check_valve" || normalizeType(i.type).includes("valve")
      );
      const displayFlanges = displayPipingItems.filter(i => 
        i.category === "flange" || i.category === "puddle_flange" || normalizeType(i.type).includes("flange")
      );
      const displayHeaders = displayPipingItems.filter(i => 
        i.category === "header" || normalizeType(i.type).includes("header")
      );
      
      if (displayMainPoolItems.length > 0) {
        yPos = addProfessionalTable(pdf, `CIVIL WORKS - MAIN POOL (${constructionType === 'terrace' ? 'Terrace' : 'In-Ground'})`, displayMainPoolItems, yPos, margin, pageWidth, pageHeight);
      }
      
      if (hasBalancingTank && displayBalancingTankItems.length > 0) {
        if (yPos > 200) {
          pdf.addPage();
          yPos = margin + 10;
        }
        yPos = addProfessionalTable(pdf, 'CIVIL WORKS - BALANCING TANK', displayBalancingTankItems, yPos, margin, pageWidth, pageHeight);
      }
      
      if (includePumpRoom && displayPumpRoomItems.length > 0) {
        if (yPos > 200) {
          pdf.addPage();
          yPos = margin + 10;
        }
        yPos = addProfessionalTable(pdf, 'CIVIL WORKS - PUMP ROOM', displayPumpRoomItems, yPos, margin, pageWidth, pageHeight);
      }
      
      if (displayMepItems.length > 0) {
        if (yPos > 200) {
          pdf.addPage();
          yPos = margin + 10;
        }
        
        let mepTitle = 'MEP EQUIPMENT AND MATERIALS';
        if (poolType === 'overflow') {
          mepTitle += ' (Overflow Grating Included)';
        } else if (poolType === 'infinity') {
          mepTitle += ' (Skimmer Hidden)';
        } else if (poolType === 'curved') {
          mepTitle += hasGutter ? ' (With Gutter System)' : ' (Without Gutter System)';
        } else if (poolType === 'skimmer') {
          mepTitle += ' (Skimmer System)';
        }
        
        yPos = addProfessionalTable(pdf, mepTitle, displayMepItems, yPos, margin, pageWidth, pageHeight);
      }
      
      // === PIPING SYSTEM SECTION ===
      if (displayPipingItems.length > 0) {
        if (yPos > 200) {
          pdf.addPage();
          yPos = margin + 10;
        }
        
        yPos = addPipingTable(pdf, 'PIPING SYSTEM', displayPipes, displayValves, displayFlanges, displayHeaders, displayPipingItems, yPos, margin, pageWidth, pageHeight);
      }
      
      // === SUMMARY SECTION ===
      if (yPos > 230) {
        pdf.addPage();
        yPos = margin + 10;
      }
      
      yPos += 5;
      
      pdf.setFillColor(...lightGray);
      pdf.rect(margin, yPos, usableWidth, 40, 'F');
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margin, yPos, usableWidth, 40);
      
      pdf.setTextColor(...primaryColor);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('DELIVERY SUMMARY', margin + 3, yPos + 6);
      
      pdf.setTextColor(...darkText);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      
      const summaryY = yPos + 13;
      pdf.text(`Main Pool Items: ${displayMainPoolItems.length}`, margin + 5, summaryY);
      pdf.text(`MEP Items: ${displayMepItems.length}`, margin + 70, summaryY);
      
      if (hasBalancingTank) {
        pdf.text(`Balancing Tank Items: ${displayBalancingTankItems.length}`, margin + 5, summaryY + 6);
      }
      
      if (includePumpRoom) {
        pdf.text(`Pump Room Items: ${displayPumpRoomItems.length}`, margin + 70, summaryY + 6);
      }
      
      pdf.text(`Piping Items: ${displayPipingItems.length}`, margin + 5, summaryY + 12);
      
      const totalItems = displayMainPoolItems.length + displayMepItems.length + 
        (hasBalancingTank ? displayBalancingTankItems.length : 0) + 
        (includePumpRoom ? displayPumpRoomItems.length : 0) +
        displayPipingItems.length;
      
      pdf.text(`Total Items: ${totalItems}`, margin + 70, summaryY + 12);
      pdf.text(`Pool Type: ${poolType.toUpperCase()}`, margin + 5, summaryY + 18);
      pdf.text(`Gutter System: ${hasBalancingTank ? 'Yes' : 'No'}`, margin + 70, summaryY + 18);
      pdf.text(`Pump Room: ${includePumpRoom ? 'Included' : 'Not Included'}`, margin + 5, summaryY + 24);
      pdf.text(`Piping Total: ${safeToFixed(pipingTotal)}`, margin + 70, summaryY + 24);
      
      yPos += 45;
      
      // === SIGNATURES ===
      const sigBoxWidth = 55;
      const sigBoxHeight = 22;
      const sigSpacing = 7;
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...darkText);
      
      pdf.rect(margin, yPos, sigBoxWidth, sigBoxHeight);
      pdf.text('Prepared By', margin + 3, yPos + 5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text(cleanTextForPDF(deliveryData.preparedBy || '________________'), margin + 3, yPos + 17);
      
      const authX = margin + sigBoxWidth + sigSpacing;
      pdf.rect(authX, yPos, sigBoxWidth, sigBoxHeight);
      pdf.text('Authorized By', authX + 3, yPos + 5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text(cleanTextForPDF(deliveryData.authorizedBy || '________________'), authX + 3, yPos + 17);
      
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
      
      if (deliveryData.notes) {
        pdf.setFontSize(7);
        pdf.setTextColor(...darkText);
        pdf.text(`Notes: ${cleanTextForPDF(deliveryData.notes)}`, margin, pageHeight - 18);
      }
      
      if (poolType === 'overflow' && overflowGratingData) {
        pdf.setFontSize(6.5);
        pdf.setTextColor(...primaryColor);
        pdf.text('Note: Overflow Grating replaces Gutter Drain for overflow pool systems.', margin, pageHeight - 23);
      } else if (poolType === 'infinity') {
        pdf.setFontSize(6.5);
        pdf.setTextColor(...primaryColor);
        pdf.text('Note: Skimmer is hidden for Infinity pool systems.', margin, pageHeight - 23);
      } else if (poolType === 'curved' && !hasGutter) {
        pdf.setFontSize(6.5);
        pdf.setTextColor(...primaryColor);
        pdf.text('Note: Gutter Drain and Skimmer are hidden for Curved pool without gutter system.', margin, pageHeight - 23);
      } else if (poolType === 'skimmer') {
        pdf.setFontSize(6.5);
        pdf.setTextColor(...primaryColor);
        pdf.text('Note: Gutter Drain is hidden for Skimmer pool systems.', margin, pageHeight - 23);
      }
      
      pdf.save(`Delivery-Challan-${deliveryData.challanNo}.pdf`);
      alert("✅ Professional Delivery Challan PDF generated successfully!");
      
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      alert("❌ Error generating PDF. Please try again.");
    }
  };

  // ================================
  // SAVE CHALLAN
  // ================================
  const saveChallan = () => {
    const challanData = {
      ...deliveryData,
      resultData,
      dimensions,
      poolType,
      hasGutter,
      hasBalancingTank,
      includePumpRoom,
      constructionType,
      companyProfile,
      editedQuantities,
      deliveryItems: {
        mainPool: filteredMainPoolItems,
        balancingTank: filteredBalancingTankItems,
        pumpRoom: filteredPumpRoomItems,
        mep: filteredMepItems,
        piping: pipingItems
      },
      selectedItems: {
        mainPool: Array.from(selectedMainPoolItems),
        balancingTank: Array.from(selectedBalancingTankItems),
        pumpRoom: Array.from(selectedPumpRoomItems),
        mep: Array.from(selectedMepItems),
        piping: Array.from(selectedPipingItems)
      },
      pumpRoomDimensions,
      templateDescriptions,
      pipingTotal,
      timestamp: new Date().toISOString()
    };
    
    const savedChallans = JSON.parse(localStorage.getItem('delivery_challans') || '[]');
    savedChallans.push(challanData);
    localStorage.setItem('delivery_challans', JSON.stringify(savedChallans));
    
    alert("✅ Delivery challan saved successfully!");
  };

  // ================================
  // PRINT CHALLAN
  // ================================
  const printChallan = () => {
    window.print();
  };

  // ================================
  // LOADING STATE
  // ================================
  if (loading || profileLoading) {
    return (
      <div className="delivery-page-1">
        <div className="loading-spinner-1">
          <div className="spinner-circle-1"></div>
          <p>Loading delivery data...</p>
        </div>
      </div>
    );
  }

  // ================================
  // RENDER - MAIN POOL TABLE WITH EDITABLE QTY
  // ================================
  return (
    <div className="delivery-page-1">
      {/* Header */}
      <header className="delivery-header-1">
        <div className="header-content-1">
          <div className="company-logo-section-1">
            <img
              src={
                companyProfile?.logo_url
                  ? `${API_BASE_URL}/${companyProfile.logo_url}`
                  : "/INT.png"
              }
              alt="Company Logo"
              className="company-logo-1"
              width={200}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/INT.png";
              }}
            />
            <div className="company-text-1">
              <h1>{deliveryData.fromCompanyName || companyProfile.company_name || DEFAULT_COMPANY_PROFILE.company_name}</h1>
              <p className="subtitle-1">Professional Swimming Pool Construction</p>
            </div>
          </div>
          <h2 className="challan-title-1">DELIVERY CHALLAN</h2>
          <div className="challan-info-1">
            <span><strong>Challan No:</strong> {deliveryData.challanNo}</span>
            <span><strong>Date:</strong> {new Date(deliveryData.date).toLocaleDateString('en-IN')}</span>
            <span><strong>Status:</strong> {deliveryData.deliveryStatus.toUpperCase()}</span>
            <span><strong>Pool Type:</strong> {poolType.toUpperCase()} {constructionType === 'terrace' ? '(Terrace)' : '(In-Ground)'}</span>
            <span><strong>Gutter System:</strong> {hasBalancingTank ? "Yes" : "No"}</span>
            <span><strong>Pump Room:</strong> {includePumpRoom ? "Yes" : "No"}</span>
          </div>
        </div>
        <div className="header-actions-1">
          <button className="pdf-button-1" onClick={generateDeliveryPDF}>
            📄 PDF
          </button>
          <button className="save-button-1" onClick={saveChallan}>
            💾 Save
          </button>
          <button className="back-button-1" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
      </header>

      {/* Address Section */}
      <section className="address-section-1">
        <div className="address-grid-1">
          <div className="address-card-1 from-address-1">
            <h3>FROM</h3>
            <div className="company-info-1">
              <h4>{deliveryData.fromCompanyName || companyProfile.company_name || DEFAULT_COMPANY_PROFILE.company_name}</h4>
              <p>{deliveryData.fromAddress || companyProfile.address || DEFAULT_COMPANY_PROFILE.address}</p>
              <p>{deliveryData.fromContact || `${companyProfile.phone || DEFAULT_COMPANY_PROFILE.phone} | ${companyProfile.email || DEFAULT_COMPANY_PROFILE.email}`}</p>
              <p className="gst-number-1">{deliveryData.fromGST || companyProfile.gst_number || DEFAULT_COMPANY_PROFILE.gst_number}</p>
            </div>
          </div>
          
          <div className="address-card-1 to-address-1">
            <h3>DELIVERY TO</h3>
            <div className="customer-info-1">
              <div className="form-group-1">
                <label>Customer Name:</label>
                <input 
                  type="text" 
                  value={deliveryData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="form-group-1">
                <label>Delivery Address:</label>
                <textarea 
                  value={deliveryData.deliveryAddress}
                  onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                  placeholder="Enter complete delivery address"
                  rows="3"
                />
              </div>
              <div className="contact-grid-1">
                <div className="form-group-1">
                  <label>Contact Person:</label>
                  <input 
                    type="text" 
                    value={deliveryData.contactPerson}
                    onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                    placeholder="Contact person"
                  />
                </div>
                <div className="form-group-1">
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
      <section className="delivery-info-section-1">
        <h2>Delivery Information</h2>
        <div className="info-grid-1">
          <div className="form-group-1">
            <label>Challan No:</label>
            <input 
              type="text" 
              value={deliveryData.challanNo}
              readOnly
              className="readonly-input-1"
            />
          </div>
          <div className="form-group-1">
            <label>Date:</label>
            <input 
              type="date" 
              value={deliveryData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
            />
          </div>
          <div className="form-group-1">
            <label>Project Name:</label>
            <input 
              type="text" 
              value={deliveryData.projectName}
              onChange={(e) => handleInputChange('projectName', e.target.value)}
              placeholder="Project name"
            />
          </div>
          <div className="form-group-1">
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
          <div className="form-group-1">
            <label>Vehicle Number:</label>
            <input 
              type="text" 
              value={deliveryData.vehicleNumber}
              onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
              placeholder="Vehicle number"
            />
          </div>
          <div className="form-group-1">
            <label>Driver Name:</label>
            <input 
              type="text" 
              value={deliveryData.driverName}
              onChange={(e) => handleInputChange('driverName', e.target.value)}
              placeholder="Driver name"
            />
          </div>
          <div className="form-group-1">
            <label>Driver Contact:</label>
            <input 
              type="tel" 
              value={deliveryData.driverContact}
              onChange={(e) => handleInputChange('driverContact', e.target.value)}
              placeholder="Driver contact"
            />
          </div>
        </div>

        <div className="form-group-1 full-width-1">
          <label>Notes/Special Instructions:</label>
          <textarea 
            value={deliveryData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Any special instructions or notes for delivery"
            rows="3"
          />
        </div>
      </section>

      {/* Pool Specifications */}
      <section className="specifications-section-1">
        <h2>Pool Specifications</h2>
        <div className="specs-grid-1">
          <div className="spec-item-1">
            <span className="spec-label-1">Dimensions:</span>
            <span className="spec-value-1">{formatDimensions(dimensions)}</span>
          </div>
          <div className="spec-item-1">
            <span className="spec-label-1">Volume:</span>
            <span className="spec-value-1">{safeToFixed(resultData?.volume_m3 || 0)} m³ ({safeToFixed(resultData?.liters || 0, 0)} L)</span>
          </div>
          <div className="spec-item-1">
            <span className="spec-label-1">Flow Rate:</span>
            <span className="spec-value-1">{safeToFixed(resultData?.flowrate_m3_per_hr || 0)} m³/hr</span>
          </div>
          <div className="spec-item-1">
            <span className="spec-label-1">Pool Type:</span>
            <span className="spec-value-1">{poolType.toUpperCase()} {constructionType === 'terrace' ? '(Terrace)' : '(In-Ground)'}</span>
          </div>
          <div className="spec-item-1">
            <span className="spec-label-1">Gutter System:</span>
            <span className="spec-value-1">{hasBalancingTank ? 'Yes (Balance Tank)' : 'No'}</span>
          </div>
          <div className="spec-item-1">
            <span className="spec-label-1">Pump Room:</span>
            <span className="spec-value-1">{includePumpRoom ? 'Included' : 'Not Included'}</span>
          </div>
          {includePumpRoom && pumpRoomDimensions && (
            <div className="spec-item-1">
              <span className="spec-label-1">Pump Room Size:</span>
              <span className="spec-value-1">
                {pumpRoomDimensions.length || "N/A"}m × {pumpRoomDimensions.width || "N/A"}m × {pumpRoomDimensions.height || "N/A"}m
              </span>
            </div>
          )}
          {resultData?.filter_dia_mm && (
            <div className="spec-item-1">
              <span className="spec-label-1">Filter Diameter:</span>
              <span className="spec-value-1">{resultData.filter_dia_mm} mm</span>
            </div>
          )}
          {resultData?.hp && (
            <div className="spec-item-1">
              <span className="spec-label-1">Pump Capacity:</span>
              <span className="spec-value-1">{resultData.hp} HP</span>
            </div>
          )}
        </div>
      </section>

      {/* Selection Summary */}
      <section className="selection-summary-1">
        <h2>PDF Selection Summary</h2>
        <div className="selection-stats-1">
          <div className="selection-stat-1">
            <span className="stat-label-1">Main Pool Items Selected:</span>
            <span className="stat-value-1">
              {getSelectedCount('mainPool')} / {filteredMainPoolItems.length}
            </span>
          </div>
          {hasBalancingTank && (
            <div className="selection-stat-1">
              <span className="stat-label-1">Balancing Tank Items Selected:</span>
              <span className="stat-value-1">
                {getSelectedCount('balancingTank')} / {filteredBalancingTankItems.length}
              </span>
            </div>
          )}
          {includePumpRoom && (
            <div className="selection-stat-1">
              <span className="stat-label-1">Pump Room Items Selected:</span>
              <span className="stat-value-1">
                {getSelectedCount('pumpRoom')} / {filteredPumpRoomItems.length}
              </span>
            </div>
          )}
          <div className="selection-stat-1">
            <span className="stat-label-1">MEP Items Selected:</span>
            <span className="stat-value-1">
              {getSelectedCount('mep')} / {filteredMepItems.length}
            </span>
          </div>
          <div className="selection-stat-1">
            <span className="stat-label-1">Piping Items Selected:</span>
            <span className="stat-value-1">
              {getSelectedCount('piping')} / {pipingItems.length}
            </span>
          </div>
          <div className="selection-stat-1">
            <span className="stat-label-1">Total Items Selected:</span>
            <span className="stat-value-1">
              {getSelectedCount('mainPool') + 
               (hasBalancingTank ? getSelectedCount('balancingTank') : 0) + 
               (includePumpRoom ? getSelectedCount('pumpRoom') : 0) + 
               getSelectedCount('mep') +
               getSelectedCount('piping')} / 
              {filteredMainPoolItems.length + 
               (hasBalancingTank ? filteredBalancingTankItems.length : 0) + 
               (includePumpRoom ? filteredPumpRoomItems.length : 0) + 
               filteredMepItems.length +
               pipingItems.length}
            </span>
          </div>
        </div>
        <div className="selection-actions-1">
          <button 
            className="select-all-button-1"
            onClick={() => {
              handleSelectAll('mainPool', filteredMainPoolItems);
              if (hasBalancingTank) handleSelectAll('balancingTank', filteredBalancingTankItems);
              if (includePumpRoom) handleSelectAll('pumpRoom', filteredPumpRoomItems);
              handleSelectAll('mep', filteredMepItems);
              handleSelectAll('piping', pipingItems);
            }}
          >
            Select All Items
          </button>
          <button 
            className="deselect-all-button-1"
            onClick={() => {
              setSelectedMainPoolItems(new Set());
              setSelectedBalancingTankItems(new Set());
              setSelectedPumpRoomItems(new Set());
              setSelectedMepItems(new Set());
              setSelectedPipingItems(new Set());
            }}
          >
            Deselect All Items
          </button>
        </div>
      </section>

      {/* Main Pool Materials - WITH EDITABLE QUANTITY */}
      {filteredMainPoolItems.length > 0 && (
        <section className="items-section-1">
          <div className="section-header-1">
            <h2>Civil Works - Main Pool {constructionType === 'terrace' ? '(Terrace)' : '(In-Ground)'} ({filteredMainPoolItems.length} items)</h2>
            <div className="section-actions-1">
              <span className="selection-count-1">
                Selected: {getSelectedCount('mainPool')} / {filteredMainPoolItems.length}
              </span>
              <button 
                className="select-all-section-1"
                onClick={() => handleSelectAll('mainPool', filteredMainPoolItems)}
              >
                {getSelectedCount('mainPool') === filteredMainPoolItems.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
          <div className="table-container-1">
            <table className="delivery-table-1">
              <thead>
                <tr>
                  <th className="select-column-1">
                    <input 
                      type="checkbox"
                      checked={getSelectedCount('mainPool') === filteredMainPoolItems.length && filteredMainPoolItems.length > 0}
                      onChange={() => handleSelectAll('mainPool', filteredMainPoolItems)}
                      className="select-all-checkbox-1"
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
                {filteredMainPoolItems.map((item, index) => (
                  <tr key={`mainpool-${item.SlNo || index}-${index}`} 
                      className={selectedMainPoolItems.has(index) ? 'selected-row-1' : ''}>
                    <td className="select-column-1">
                      <input 
                        type="checkbox"
                        checked={selectedMainPoolItems.has(index)}
                        onChange={() => handleSelectItem('mainPool', index)}
                        className="item-checkbox-1"
                      />
                    </td>
                    <td className="text-center-1">{item.uiSlNo}</td>
                    <td className="text-center-1">{item.Code || "N/A"}</td>
                    <td className="description-cell-1">{item.description}</td>
                    <td className="text-center-1">{item.Unit || ""}</td>
                    <td className="text-center-1 quantity-cell-1">
                      <input
                        type="number"
                        value={getFinalQty("mainPool", item.SlNo, item.deliveryQuantity)}
                        onChange={(e) => handleQtyChange("mainPool", item.SlNo, e.target.value)}
                        style={{
                          width: "70px",
                          padding: "4px",
                          border: "1px solid #ccc",
                          borderRadius: "4px"
                        }}
                      />
                    </td>
                    <td className="text-center-1">
                      <select 
                        value={item.deliveryStatus}
                        onChange={(e) => handleItemStatusChange('mainPool', index, e.target.value)}
                        className="status-select-1"
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
                        className="remarks-input-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {constructionType === 'terrace' && (
            <div className="construction-note-1">
              <p><strong>Terrace Pool Note:</strong> This configuration includes structural works only and excludes excavation, soling, and backfilling items.</p>
            </div>
          )}
        </section>
      )}

      {/* Balancing Tank Materials */}
      {hasBalancingTank && filteredBalancingTankItems.length > 0 && (
        <section className="items-section-1">
          <div className="section-header-1">
            <h2>Civil Works - Balancing Tank ({filteredBalancingTankItems.length} items)</h2>
            <div className="section-actions-1">
              <span className="selection-count-1">
                Selected: {getSelectedCount('balancingTank')} / {filteredBalancingTankItems.length}
              </span>
              <button 
                className="select-all-section-1"
                onClick={() => handleSelectAll('balancingTank', filteredBalancingTankItems)}
              >
                {getSelectedCount('balancingTank') === filteredBalancingTankItems.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
          <div className="table-container-1">
            <table className="delivery-table-1">
              <thead>
                <tr>
                  <th className="select-column-1">
                    <input 
                      type="checkbox"
                      checked={getSelectedCount('balancingTank') === filteredBalancingTankItems.length && filteredBalancingTankItems.length > 0}
                      onChange={() => handleSelectAll('balancingTank', filteredBalancingTankItems)}
                      className="select-all-checkbox-1"
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
                {filteredBalancingTankItems.map((item, index) => (
                  <tr key={`balancing-${item.SlNo || index}-${index}`}
                      className={selectedBalancingTankItems.has(index) ? 'selected-row-1' : ''}>
                    <td className="select-column-1">
                      <input 
                        type="checkbox"
                        checked={selectedBalancingTankItems.has(index)}
                        onChange={() => handleSelectItem('balancingTank', index)}
                        className="item-checkbox-1"
                      />
                    </td>
                    <td className="text-center-1">{item.uiSlNo}</td>
                    <td className="text-center-1">{item.Code || "N/A"}</td>
                    <td className="description-cell-1">{item.description}</td>
                    <td className="text-center-1">{item.Unit || ""}</td>
                    <td className="text-center-1 quantity-cell-1">
                      <input
                        type="number"
                        value={getFinalQty("balancingTank", item.SlNo, item.deliveryQuantity)}
                        onChange={(e) => handleQtyChange("balancingTank", item.SlNo, e.target.value)}
                        style={{
                          width: "70px",
                          padding: "4px",
                          border: "1px solid #ccc",
                          borderRadius: "4px"
                        }}
                      />
                    </td>
                    <td className="text-center-1">
                      <select 
                        value={item.deliveryStatus}
                        onChange={(e) => handleItemStatusChange('balancingTank', index, e.target.value)}
                        className="status-select-1"
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
                        onChange={(e) => handleItemRemarksChange('balancingTank', index, e.target.value)}
                        placeholder="Delivery remarks"
                        className="remarks-input-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="balancing-tank-note-1">
            <p><strong>Note:</strong> Balancing tank quantities are calculated as 10% of main pool volume for overflow/infinity systems.</p>
          </div>
        </section>
      )}

      {/* Pump Room Materials */}
      {includePumpRoom && filteredPumpRoomItems.length > 0 && (
        <section className="items-section-1">
          <div className="section-header-1">
            <h2>Civil Works - Pump Room {constructionType === 'terrace' ? '(Terrace)' : '(In-Ground)'} ({filteredPumpRoomItems.length} items)</h2>
            <div className="section-actions-1">
              <span className="selection-count-1">
                Selected: {getSelectedCount('pumpRoom')} / {filteredPumpRoomItems.length}
              </span>
              <button 
                className="select-all-section-1"
                onClick={() => handleSelectAll('pumpRoom', filteredPumpRoomItems)}
              >
                {getSelectedCount('pumpRoom') === filteredPumpRoomItems.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
          {pumpRoomDimensions && (
            <div className="pump-room-info-1">
              <div className="info-card-1">
                <span className="info-icon-1">🏠</span>
                <div className="info-content-1">
                  <h4>Pump Room Specifications</h4>
                  <div className="dimensions-1">
                    <span>Size: {pumpRoomDimensions.length || "N/A"}m × {pumpRoomDimensions.width || "N/A"}m × {pumpRoomDimensions.height || "N/A"}m</span>
                    {pumpRoomDimensions.length && pumpRoomDimensions.width && (
                      <span>Area: {safeToFixed(pumpRoomDimensions.length * pumpRoomDimensions.width)} m²</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="table-container-1">
            <table className="delivery-table-1">
              <thead>
                <tr>
                  <th className="select-column-1">
                    <input 
                      type="checkbox"
                      checked={getSelectedCount('pumpRoom') === filteredPumpRoomItems.length && filteredPumpRoomItems.length > 0}
                      onChange={() => handleSelectAll('pumpRoom', filteredPumpRoomItems)}
                      className="select-all-checkbox-1"
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
                {filteredPumpRoomItems.map((item, index) => (
                  <tr key={`pumproom-${item.SlNo || index}-${index}`}
                      className={selectedPumpRoomItems.has(index) ? 'selected-row-1' : ''}>
                    <td className="select-column-1">
                      <input 
                        type="checkbox"
                        checked={selectedPumpRoomItems.has(index)}
                        onChange={() => handleSelectItem('pumpRoom', index)}
                        className="item-checkbox-1"
                      />
                    </td>
                    <td className="text-center-1">{item.uiSlNo}</td>
                    <td className="text-center-1">{item.Code || "N/A"}</td>
                    <td className="description-cell-1">{item.description}</td>
                    <td className="text-center-1">{item.Unit || ""}</td>
                    <td className="text-center-1 quantity-cell-1">
                      <input
                        type="number"
                        value={getFinalQty("pumpRoom", item.SlNo, item.deliveryQuantity)}
                        onChange={(e) => handleQtyChange("pumpRoom", item.SlNo, e.target.value)}
                        style={{
                          width: "70px",
                          padding: "4px",
                          border: "1px solid #ccc",
                          borderRadius: "4px"
                        }}
                      />
                    </td>
                    <td className="text-center-1">
                      <select 
                        value={item.deliveryStatus}
                        onChange={(e) => handleItemStatusChange('pumpRoom', index, e.target.value)}
                        className="status-select-1"
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
                        className="remarks-input-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pump-room-notes-1">
            <p><strong>Note:</strong> Pump room construction includes excavation, RCC structure, waterproofing, and finishing works. Quantities are calculated based on pump room dimensions (20% of main pool volume).</p>
            {constructionType === 'terrace' && (
              <p className="terrace-note-1"><strong>Terrace Pump Room Note:</strong> This configuration includes structural works only and excludes excavation, soling, and backfilling items.</p>
            )}
          </div>
        </section>
      )}

      {/* MEP Equipment */}
      {filteredMepItems.length > 0 && (
        <section className="items-section-1">
          <div className="section-header-1">
            <h2>
              MEP Equipment and Materials ({filteredMepItems.length} items)
              {poolType === 'overflow' && ' - Overflow Grating Included'}
              {poolType === 'infinity' && ' - Skimmer Hidden'}
              {poolType === 'curved' && (hasGutter ? ' - With Gutter System' : ' - Without Gutter System')}
              {poolType === 'skimmer' && ' - Skimmer System'}
            </h2>
            <div className="section-actions-1">
              <span className="selection-count-1">
                Selected: {getSelectedCount('mep')} / {filteredMepItems.length}
              </span>
              <button 
                className="select-all-section-1"
                onClick={() => handleSelectAll('mep', filteredMepItems)}
              >
                {getSelectedCount('mep') === filteredMepItems.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
          <div className="table-container-1">
            <table className="delivery-table-1">
              <thead>
                <tr>
                  <th className="select-column-1">
                    <input 
                      type="checkbox"
                      checked={getSelectedCount('mep') === filteredMepItems.length && filteredMepItems.length > 0}
                      onChange={() => handleSelectAll('mep', filteredMepItems)}
                      className="select-all-checkbox-1"
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
                {filteredMepItems.map((item, index) => (
                  <tr key={`mep-${item.SlNo || index}-${index}`}
                      className={selectedMepItems.has(index) ? 'selected-row-1' : ''}>
                    <td className="select-column-1">
                      <input 
                        type="checkbox"
                        checked={selectedMepItems.has(index)}
                        onChange={() => handleSelectItem('mep', index)}
                        className="item-checkbox-1"
                      />
                    </td>
                    <td className="text-center-1">{item.uiSlNo}</td>
                    <td className="text-center-1">{item.Code || "N/A"}</td>
                    <td className="description-cell-1">{item.description}</td>
                    <td className="text-center-1">{item.Unit || ""}</td>
                    <td className="text-center-1 quantity-cell-1">
                      <input
                        type="number"
                        value={getFinalQty("mep", item.SlNo, item.deliveryQuantity)}
                        onChange={(e) => handleQtyChange("mep", item.SlNo, e.target.value)}
                        style={{
                          width: "70px",
                          padding: "4px",
                          border: "1px solid #ccc",
                          borderRadius: "4px"
                        }}
                      />
                    </td>
                    <td className="text-center-1">
                      <select 
                        value={item.deliveryStatus}
                        onChange={(e) => handleItemStatusChange('mep', index, e.target.value)}
                        className="status-select-1"
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
                        className="remarks-input-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mep-notes-1">
            <p><strong>Note:</strong> MEP items include filtration systems, electrical components, plumbing fixtures, and specialized equipment.</p>
            {poolType === 'overflow' && overflowGratingData && (
              <p className="overflow-note-1"><strong>Overflow Grating:</strong> Durable, anti-slip cover installed along the overflow channel that allows excess water to drain efficiently back to the balance tank.</p>
            )}
            {poolType === 'infinity' && (
              <p className="infinity-note-1"><strong>Infinity Pool Note:</strong> Skimmer (Item 11) is hidden for infinity pool systems.</p>
            )}
            {poolType === 'curved' && !hasGutter && (
              <p className="curved-note-1"><strong>Curved Pool Note:</strong> Skimmer and Gutter Drain are hidden for curved pools without gutter system.</p>
            )}
            {poolType === 'skimmer' && (
              <p className="skimmer-note-1"><strong>Skimmer Pool Note:</strong> Gutter Drain (Item 13) is hidden for skimmer pool systems.</p>
            )}
          </div>
        </section>
      )}

      {/* Piping System */}
      {pipingItems.length > 0 && (
        <section className="items-section-1">
          <div className="section-header-1">
            <h2>Piping System ({pipingItems.length} items)</h2>
            <div className="section-actions-1">
              <span className="selection-count-1">
                Selected: {getSelectedCount('piping')} / {pipingItems.length}
              </span>
              <button 
                className="select-all-section-1"
                onClick={() => handleSelectAll('piping', pipingItems)}
              >
                {getSelectedCount('piping') === pipingItems.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
          
          {/* Pipes Section */}
          {groupedPipingItems.pipes.length > 0 && (
            <>
              <h3 className="subsection-title-1">Pipes ({groupedPipingItems.pipes.length} items)</h3>
              <div className="table-container-1">
                <table className="delivery-table-1">
                  <thead>
                    <tr>
                      <th className="select-column-1">
                        <input 
                          type="checkbox"
                          checked={pipingItems.filter(item => 
                            groupedPipingItems.pipes.some(p => p.sl_no === item.sl_no)
                          ).every(item => selectedPipingItems.has(pipingItems.findIndex(i => i.sl_no === item.sl_no)))}
                          onChange={() => {
                            const pipeIndices = pipingItems
                              .map((item, idx) => ({ item, idx }))
                              .filter(({ item }) => 
                                groupedPipingItems.pipes.some(p => p.sl_no === item.sl_no)
                              )
                              .map(({ idx }) => idx);
                            
                            const allSelected = pipeIndices.every(idx => selectedPipingItems.has(idx));
                            if (allSelected) {
                              const newSelection = new Set(selectedPipingItems);
                              pipeIndices.forEach(idx => newSelection.delete(idx));
                              setSelectedPipingItems(newSelection);
                            } else {
                              const newSelection = new Set(selectedPipingItems);
                              pipeIndices.forEach(idx => newSelection.add(idx));
                              setSelectedPipingItems(newSelection);
                            }
                          }}
                          className="select-all-checkbox-1"
                        />
                      </th>
                      <th>Sl.No</th>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Dia (mm)</th>
                      <th>Description</th>
                      <th>Unit</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedPipingItems.pipes.map((item) => {
                      const globalIndex = pipingItems.findIndex(i => i.sl_no === item.sl_no);
                      return (
                        <tr key={`pipe-${item.sl_no}`}
                            className={selectedPipingItems.has(globalIndex) ? 'selected-row-1' : ''}>
                          <td className="select-column-1">
                            <input 
                              type="checkbox"
                              checked={selectedPipingItems.has(globalIndex)}
                              onChange={() => handleSelectItem('piping', globalIndex)}
                              className="item-checkbox-1"
                            />
                          </td>
                          <td className="text-center-1">{item.sl_no}</td>
                          <td className="text-center-1">{item.code || "N/A"}</td>
                          <td className="text-center-1">{item.type || "Pipe"}</td>
                          <td className="text-center-1">{item.dia ? `${item.dia} mm` : "-"}</td>
                          <td className="description-cell-1">{item.description}</td>
                          <td className="text-center-1">{item.unit || "NOS"}</td>
                          <td className="text-center-1 quantity-cell-1">
                            <input
                              type="number"
                              value={getFinalQty("piping", item.sl_no, item.deliveryQuantity)}
                              onChange={(e) => handleQtyChange("piping", item.sl_no, e.target.value)}
                              style={{
                                width: "70px",
                                padding: "4px",
                                border: "1px solid #ccc",
                                borderRadius: "4px"
                              }}
                            />
                          </td>
                          <td className="text-center-1">
                            <select 
                              value={item.deliveryStatus}
                              onChange={(e) => handleItemStatusChange('piping', globalIndex, e.target.value)}
                              className="status-select-1"
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
                              onChange={(e) => handleItemRemarksChange('piping', globalIndex, e.target.value)}
                              placeholder="Remarks"
                              className="remarks-input-1"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Valves Section */}
          {groupedPipingItems.valves.length > 0 && (
            <>
              <h3 className="subsection-title-1">Valves ({groupedPipingItems.valves.length} items)</h3>
              <div className="table-container-1">
                <table className="delivery-table-1">
                  <thead>
                    <tr>
                      <th className="select-column-1">
                        <input 
                          type="checkbox"
                          checked={pipingItems.filter(item => 
                            groupedPipingItems.valves.some(v => v.sl_no === item.sl_no)
                          ).every(item => selectedPipingItems.has(pipingItems.findIndex(i => i.sl_no === item.sl_no)))}
                          onChange={() => {
                            const valveIndices = pipingItems
                              .map((item, idx) => ({ item, idx }))
                              .filter(({ item }) => 
                                groupedPipingItems.valves.some(v => v.sl_no === item.sl_no)
                              )
                              .map(({ idx }) => idx);
                            
                            const allSelected = valveIndices.every(idx => selectedPipingItems.has(idx));
                            if (allSelected) {
                              const newSelection = new Set(selectedPipingItems);
                              valveIndices.forEach(idx => newSelection.delete(idx));
                              setSelectedPipingItems(newSelection);
                            } else {
                              const newSelection = new Set(selectedPipingItems);
                              valveIndices.forEach(idx => newSelection.add(idx));
                              setSelectedPipingItems(newSelection);
                            }
                          }}
                          className="select-all-checkbox-1"
                        />
                      </th>
                      <th>Sl.No</th>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Dia (mm)</th>
                      <th>Description</th>
                      <th>Unit</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedPipingItems.valves.map((item) => {
                      const globalIndex = pipingItems.findIndex(i => i.sl_no === item.sl_no);
                      return (
                        <tr key={`valve-${item.sl_no}`}
                            className={selectedPipingItems.has(globalIndex) ? 'selected-row-1' : ''}>
                          <td className="select-column-1">
                            <input 
                              type="checkbox"
                              checked={selectedPipingItems.has(globalIndex)}
                              onChange={() => handleSelectItem('piping', globalIndex)}
                              className="item-checkbox-1"
                            />
                          </td>
                          <td className="text-center-1">{item.sl_no}</td>
                          <td className="text-center-1">{item.code || "N/A"}</td>
                          <td className="text-center-1">{item.type || "Valve"}</td>
                          <td className="text-center-1">{item.dia ? `${item.dia} mm` : "-"}</td>
                          <td className="description-cell-1">{item.description}</td>
                          <td className="text-center-1">{item.unit || "NOS"}</td>
                          <td className="text-center-1 quantity-cell-1">
                            <input
                              type="number"
                              value={getFinalQty("piping", item.sl_no, item.deliveryQuantity)}
                              onChange={(e) => handleQtyChange("piping", item.sl_no, e.target.value)}
                              style={{
                                width: "70px",
                                padding: "4px",
                                border: "1px solid #ccc",
                                borderRadius: "4px"
                              }}
                            />
                          </td>
                          <td className="text-center-1">
                            <select 
                              value={item.deliveryStatus}
                              onChange={(e) => handleItemStatusChange('piping', globalIndex, e.target.value)}
                              className="status-select-1"
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
                              onChange={(e) => handleItemRemarksChange('piping', globalIndex, e.target.value)}
                              placeholder="Remarks"
                              className="remarks-input-1"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Flanges Section */}
          {groupedPipingItems.flanges.length > 0 && (
            <>
              <h3 className="subsection-title-1">Flanges ({groupedPipingItems.flanges.length} items)</h3>
              <div className="table-container-1">
                <table className="delivery-table-1">
                  <thead>
                    <tr>
                      <th className="select-column-1">
                        <input 
                          type="checkbox"
                          checked={pipingItems.filter(item => 
                            groupedPipingItems.flanges.some(f => f.sl_no === item.sl_no)
                          ).every(item => selectedPipingItems.has(pipingItems.findIndex(i => i.sl_no === item.sl_no)))}
                          onChange={() => {
                            const flangeIndices = pipingItems
                              .map((item, idx) => ({ item, idx }))
                              .filter(({ item }) => 
                                groupedPipingItems.flanges.some(f => f.sl_no === item.sl_no)
                              )
                              .map(({ idx }) => idx);
                            
                            const allSelected = flangeIndices.every(idx => selectedPipingItems.has(idx));
                            if (allSelected) {
                              const newSelection = new Set(selectedPipingItems);
                              flangeIndices.forEach(idx => newSelection.delete(idx));
                              setSelectedPipingItems(newSelection);
                            } else {
                              const newSelection = new Set(selectedPipingItems);
                              flangeIndices.forEach(idx => newSelection.add(idx));
                              setSelectedPipingItems(newSelection);
                            }
                          }}
                          className="select-all-checkbox-1"
                        />
                      </th>
                      <th>Sl.No</th>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Dia (mm)</th>
                      <th>Description</th>
                      <th>Unit</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedPipingItems.flanges.map((item) => {
                      const globalIndex = pipingItems.findIndex(i => i.sl_no === item.sl_no);
                      return (
                        <tr key={`flange-${item.sl_no}`}
                            className={selectedPipingItems.has(globalIndex) ? 'selected-row-1' : ''}>
                          <td className="select-column-1">
                            <input 
                              type="checkbox"
                              checked={selectedPipingItems.has(globalIndex)}
                              onChange={() => handleSelectItem('piping', globalIndex)}
                              className="item-checkbox-1"
                            />
                          </td>
                          <td className="text-center-1">{item.sl_no}</td>
                          <td className="text-center-1">{item.code || "N/A"}</td>
                          <td className="text-center-1">{item.type || "Flange"}</td>
                          <td className="text-center-1">{item.dia ? `${item.dia} mm` : "-"}</td>
                          <td className="description-cell-1">{item.description}</td>
                          <td className="text-center-1">{item.unit || "NOS"}</td>
                          <td className="text-center-1 quantity-cell-1">
                            <input
                              type="number"
                              value={getFinalQty("piping", item.sl_no, item.deliveryQuantity)}
                              onChange={(e) => handleQtyChange("piping", item.sl_no, e.target.value)}
                              style={{
                                width: "70px",
                                padding: "4px",
                                border: "1px solid #ccc",
                                borderRadius: "4px"
                              }}
                            />
                          </td>
                          <td className="text-center-1">
                            <select 
                              value={item.deliveryStatus}
                              onChange={(e) => handleItemStatusChange('piping', globalIndex, e.target.value)}
                              className="status-select-1"
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
                              onChange={(e) => handleItemRemarksChange('piping', globalIndex, e.target.value)}
                              placeholder="Remarks"
                              className="remarks-input-1"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Headers Section */}
          {groupedPipingItems.headers.length > 0 && (
            <>
              <h3 className="subsection-title-1">Headers ({groupedPipingItems.headers.length} items)</h3>
              <div className="table-container-1">
                <table className="delivery-table-1">
                  <thead>
                    <tr>
                      <th className="select-column-1">
                        <input 
                          type="checkbox"
                          checked={pipingItems.filter(item => 
                            groupedPipingItems.headers.some(h => h.sl_no === item.sl_no)
                          ).every(item => selectedPipingItems.has(pipingItems.findIndex(i => i.sl_no === item.sl_no)))}
                          onChange={() => {
                            const headerIndices = pipingItems
                              .map((item, idx) => ({ item, idx }))
                              .filter(({ item }) => 
                                groupedPipingItems.headers.some(h => h.sl_no === item.sl_no)
                              )
                              .map(({ idx }) => idx);
                            
                            const allSelected = headerIndices.every(idx => selectedPipingItems.has(idx));
                            if (allSelected) {
                              const newSelection = new Set(selectedPipingItems);
                              headerIndices.forEach(idx => newSelection.delete(idx));
                              setSelectedPipingItems(newSelection);
                            } else {
                              const newSelection = new Set(selectedPipingItems);
                              headerIndices.forEach(idx => newSelection.add(idx));
                              setSelectedPipingItems(newSelection);
                            }
                          }}
                          className="select-all-checkbox-1"
                        />
                      </th>
                      <th>Sl.No</th>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Dia (mm)</th>
                      <th>Description</th>
                      <th>Unit</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedPipingItems.headers.map((item) => {
                      const globalIndex = pipingItems.findIndex(i => i.sl_no === item.sl_no);
                      return (
                        <tr key={`header-${item.sl_no}`}
                            className={selectedPipingItems.has(globalIndex) ? 'selected-row-1' : ''}>
                          <td className="select-column-1">
                            <input 
                              type="checkbox"
                              checked={selectedPipingItems.has(globalIndex)}
                              onChange={() => handleSelectItem('piping', globalIndex)}
                              className="item-checkbox-1"
                            />
                          </td>
                          <td className="text-center-1">{item.sl_no}</td>
                          <td className="text-center-1">{item.code || "N/A"}</td>
                          <td className="text-center-1">{item.type || "Header"}</td>
                          <td className="text-center-1">{item.dia ? `${item.dia} mm` : "-"}</td>
                          <td className="description-cell-1">{item.description}</td>
                          <td className="text-center-1">{item.unit || "NOS"}</td>
                          <td className="text-center-1 quantity-cell-1">
                            <input
                              type="number"
                              value={getFinalQty("piping", item.sl_no, item.deliveryQuantity)}
                              onChange={(e) => handleQtyChange("piping", item.sl_no, e.target.value)}
                              style={{
                                width: "70px",
                                padding: "4px",
                                border: "1px solid #ccc",
                                borderRadius: "4px"
                              }}
                            />
                          </td>
                          <td className="text-center-1">
                            <select 
                              value={item.deliveryStatus}
                              onChange={(e) => handleItemStatusChange('piping', globalIndex, e.target.value)}
                              className="status-select-1"
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
                              onChange={(e) => handleItemRemarksChange('piping', globalIndex, e.target.value)}
                              placeholder="Remarks"
                              className="remarks-input-1"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="piping-notes-1">
            <p><strong>Piping Total:</strong> {safeToFixed(pipingTotal)}</p>
            <p><strong>Note:</strong> Piping items are calculated based on pool dimensions and type. Installation cost is 15% of supply cost. All diameters are in millimeters (mm).</p>
          </div>
        </section>
      )}

      {/* Summary Section */}
      <section className="summary-section-1">
        <h2>Delivery Summary</h2>
        <div className="summary-grid-1">
          <div className="summary-item-1">
            <span className="summary-label-1">Total Main Pool Items:</span>
            <span className="summary-value-1">{filteredMainPoolItems.length}</span>
          </div>
          {hasBalancingTank && (
            <div className="summary-item-1">
              <span className="summary-label-1">Total Balancing Tank Items:</span>
              <span className="summary-value-1">{filteredBalancingTankItems.length}</span>
            </div>
          )}
          {includePumpRoom && (
            <div className="summary-item-1">
              <span className="summary-label-1">Total Pump Room Items:</span>
              <span className="summary-value-1">{filteredPumpRoomItems.length}</span>
            </div>
          )}
          <div className="summary-item-1">
            <span className="summary-label-1">Total MEP Items:</span>
            <span className="summary-value-1">{filteredMepItems.length}</span>
          </div>
          <div className="summary-item-1">
            <span className="summary-label-1">Total Piping Items:</span>
            <span className="summary-value-1">{pipingItems.length}</span>
          </div>
          <div className="summary-item-1">
            <span className="summary-label-1">Total Items:</span>
            <span className="summary-value-1">
              {filteredMainPoolItems.length + 
               (hasBalancingTank ? filteredBalancingTankItems.length : 0) + 
               (includePumpRoom ? filteredPumpRoomItems.length : 0) + 
               filteredMepItems.length +
               pipingItems.length}
            </span>
          </div>
          <div className="summary-item-1">
            <span className="summary-label-1">Pool Type:</span>
            <span className="summary-value-1">{poolType.toUpperCase()} {constructionType === 'terrace' ? '(Terrace)' : '(In-Ground)'}</span>
          </div>
          <div className="summary-item-1">
            <span className="summary-label-1">Gutter System:</span>
            <span className="summary-value-1">{hasBalancingTank ? "Yes" : "No"}</span>
          </div>
          <div className="summary-item-1">
            <span className="summary-label-1">Pump Room:</span>
            <span className="summary-value-1">{includePumpRoom ? "Included" : "Not Included"}</span>
          </div>
        </div>
      </section>

      {/* Signatures Section */}
      <section className="signatures-section-1">
        <h2>Authorizations</h2>
        <div className="signatures-grid-1">
          <div className="signature-block-1">
            <div className="signature-line-1"></div>
            <p>Prepared By</p>
            <input 
              type="text" 
              value={deliveryData.preparedBy}
              onChange={(e) => handleInputChange('preparedBy', e.target.value)}
              placeholder="Name of preparer"
              className="signature-input-1"
            />
          </div>
          <div className="signature-block-1">
            <div className="signature-line-1"></div>
            <p>Authorized By</p>
            <input 
              type="text" 
              value={deliveryData.authorizedBy}
              onChange={(e) => handleInputChange('authorizedBy', e.target.value)}
              placeholder="Name of authorized person"
              className="signature-input-1"
            />
          </div>
          <div className="signature-block-1">
            <div className="signature-line-1"></div>
            <p>Received By</p>
            <input 
              type="text" 
              value={deliveryData.receivedBy}
              onChange={(e) => handleInputChange('receivedBy', e.target.value)}
              placeholder="Receiver's signature"
              className="signature-input-1"
            />
          </div>
        </div>
      </section>

      {/* Footer Actions */}
      <footer className="delivery-actions-1">
        <button className="pdf-button-1" onClick={generateDeliveryPDF}>
          📄 Download PDF
        </button>
        <button className="secondary-button-1" onClick={printChallan}>
          🖨️ Print Challan
        </button>
        <button className="back-button-1" onClick={() => navigate(-1)}>
          ← Back to Results
        </button>
      </footer>
    </div>
  );
}

export default DeliveryChallan;