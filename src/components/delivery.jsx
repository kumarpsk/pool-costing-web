import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./delivery.css";

const API_BASE_URL = "https://pool-costing-api.intelithon.in";
const INSTALLATION_PERCENT = 0.15;

// ================================
// UTILITY FUNCTIONS
// ================================
function safeToFixed(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return "0.00";
  return Number(value).toFixed(decimals);
}

function cleanTextForPDF(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, 'and')
    .replace(/[<>"'\*\#]/g, '')
    .trim();
}

const formatDimensions = (dimensions) => {
  if (!dimensions) return "N/A";
  if (typeof dimensions === 'string') return dimensions;
  if (typeof dimensions === 'object' && dimensions.length && dimensions.width && dimensions.depth) {
    return `${dimensions.length}m × ${dimensions.width}m × ${dimensions.depth}m`;
  }
  return "N/A";
};

// Improved image loading helper with timeout
const loadImageAsBase64 = (url) =>
  new Promise((resolve) => {
    if (!url) { 
      resolve(""); 
      return; 
    }
    
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    const timeout = setTimeout(() => {
      console.log(`⏰ Logo load timeout for: ${url}`);
      img.src = '';
      resolve("");
    }, 5000);
    
    img.onload = function () {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(this.naturalWidth || this.width, 400);
        canvas.height = Math.min(this.naturalHeight || this.height, 400);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(this, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        console.log(`✅ Logo loaded: ${url}`);
        resolve(dataUrl);
      } catch (e) {
        console.error(`❌ Canvas error for ${url}:`, e);
        resolve("");
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      console.log(`❌ Failed to load: ${url}`);
      resolve("");
    };
    
    if (url.startsWith('/') || url.includes('localhost') || url.includes('8009')) {
      img.src = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    } else {
      img.src = url;
    }
  });

// ================================
// QUANTITY FIELD MAPPINGS
// ================================
const MAIN_POOL_QTY_FIELDS = {
  1: "EarthExcavation_QTY", 2: "BackFilling_QTY", 3: "Consolidation_QTY",
  4: "Disposal_QTY", 5: "Soling_QTY", 6: "plaincement_QTY",
  7: "BurntBrick_QTY", 8: "steelreinforcement_QTY", 9: "Shuttering_QTY",
  10: "shotcreting_QTY", 11: "WaterProofing_QTY", 12: "plastering_QTY",
  13: "Coping_QTY", 14: "Tiling_QTY"
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
  28: "TestKit_QTY", 29: "CurvedBrush_QTY", 30: "HeatPump_QTY"
};

const BALANCE_TANK_QTY_FIELDS = {
  1: "EarthExcavation_QTY_1", 2: "BackFilling_QTY_1", 3: "Consolidation_QTY_1",
  4: "Disposal_QTY_1", 5: "Soling_QTY_1", 6: "plaincement_QTY_1",
  7: "BurntBrick_QTY_1", 8: "steelreinforcement_QTY_1", 9: "Shuttering_QTY_1",
  10: "shotcreting_QTY_1", 11: "WaterProofing_QTY_1", 12: "plastering_QTY_1"
};

const PUMP_ROOM_QTY_FIELDS = {
  1: "EarthExcavation_QTY_2", 2: "BackFilling_QTY_2", 3: "Consolidation_QTY_2",
  4: "Disposal_QTY_2", 5: "Soling_QTY_2", 6: "plaincement_QTY_2",
  7: "BurntBrick_QTY_2", 8: "steelreinforcement_QTY_2", 9: "Shuttering_QTY_2",
  10: "shotcreting_QTY_2", 11: "WaterProofing_QTY_2", 12: "plastering_QTY_2"
};

const DEFAULT_COMPANY_PROFILE = {
  company_name: "INTELITHON TECHNOLOGIES",
  logo_url: "", phone: "+91 1234567890", email: "info@intelithon.com",
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

  const stateData = location.state || {};
  
  const resultData = {
    ...(stateData.result || {}),
    ...(stateData.civilQuantities || {}),
    ...(stateData.mepQuantities || {}),
    ...(stateData.pumpRoomQuantities || {})
  };
  
  const dimensions = stateData.dimensions || {};
  const mainPoolItems = stateData.filteredMainPoolItems || stateData.mainPoolItems || [];
  const mepItems = stateData.filteredMepItems || stateData.mepItems || [];
  const balanceTankItems = stateData.balanceTankItems || [];
  const pumpRoomItems = stateData.pumpRoomItems || [];
  const pipingItemsFromState = stateData.pipingItems || [];
  const pumpRoomQuantities = stateData.pumpRoomQuantities || {};
  const pumpRoomDimensions = stateData.pumpRoomDimensions || {};
  const templateDescriptions = stateData.templateDescriptions || {};
  const mainPoolRemarks = stateData.mainPoolRemarks || {};
  const balancingTankRemarks = stateData.balancingTankRemarks || {};
  const mepRemarks = stateData.mepRemarks || {};
  const pumpRoomRemarks = stateData.pumpRoomRemarks || {};
  const selectedAdvancedEquipment = stateData.selectedAdvancedEquipment || [];
  const pipingTotal = stateData.pipingTotal || 0;
  
  const poolType = stateData.poolType || 'skimmer';
  const hasGutter = stateData.hasGutter || false;
  const hasBalancingTank = stateData.hasBalancingTank || 
    ['overflow', 'infinity', 'curved'].includes(poolType);
  const includePumpRoom = stateData.includePumpRoom !== false;
  const constructionType = stateData.constructionType || 'in_ground';
  
  const constructionDisplay = constructionType === 'terrace' ? 'Terrace' : 'In-Ground';

  const calculatedVolume = dimensions.length && dimensions.width && dimensions.depth 
    ? dimensions.length * dimensions.width * dimensions.depth 
    : (resultData?.volume_m3 || resultData?.volume || 0);
  
  const calculatedLiters = calculatedVolume * 1000;
  const flowRate = resultData?.flowrate_m3_per_hr || resultData?.flow_rate || (calculatedVolume / 4.5);

  // ================================
  // STATE
  // ================================
  const [companyProfile, setCompanyProfile] = useState(DEFAULT_COMPANY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [logoBase64, setLogoBase64] = useState("");
  
  const [deliveryData, setDeliveryData] = useState({
    challanNo: `DC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 1000)}`,
    date: new Date().toISOString().split('T')[0],
    fromCompanyName: "", fromAddress: "", fromContact: "", fromGST: "",
    customerName: "", customerAddress: "", contactPerson: "", contactNumber: "",
    projectName: "Swimming Pool Construction", deliveryAddress: "",
    preparedBy: "", authorizedBy: "", receivedBy: "",
    deliveryStatus: "pending", vehicleNumber: "", driverName: "", driverContact: "",
    notes: "Handle with care. Store in dry place. Verify all items upon delivery."
  });

  const [selectedMainPool, setSelectedMainPool] = useState([]);
  const [selectedBalancingTank, setSelectedBalancingTank] = useState([]);
  const [selectedPumpRoom, setSelectedPumpRoom] = useState([]);
  const [selectedMep, setSelectedMep] = useState([]);
  const [selectedPiping, setSelectedPiping] = useState([]);

  const [filteredMainPoolItems, setFilteredMainPoolItems] = useState([]);
  const [filteredBalancingTankItems, setFilteredBalancingTankItems] = useState([]);
  const [filteredPumpRoomItems, setFilteredPumpRoomItems] = useState([]);
  const [filteredMepItems, setFilteredMepItems] = useState([]);
  const [pipingItems, setPipingItems] = useState([]);
  const [editedQuantities, setEditedQuantities] = useState({});

  // ================================
  // FETCH TENANT PROFILE & LOGO - FIXED
  // ================================
  useEffect(() => {
    const fetchProfileAndLogo = async () => {
      setProfileLoading(true);
      let profile = null;
      
      try {
        const companyCode = localStorage.getItem("tenant_company_code");
        
        // Try cached profile first
        const cached = localStorage.getItem("tenant_company_profile");
        if (cached) {
          try {
            profile = JSON.parse(cached);
            setCompanyProfile(profile);
            updateDeliveryFromProfile(profile);
          } catch (e) {
            console.error("Error parsing cached profile:", e);
          }
        }
        
        // Fetch fresh profile from API
        if (companyCode) {
          try {
            const response = await fetch(
              `${API_BASE_URL}/admin/tenant/public-profile?company_code=${companyCode}`,
              { headers: { "Content-Type": "application/json" } }
            );
            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data) {
                profile = result.data;
                setCompanyProfile(profile);
                localStorage.setItem("tenant_company_profile", JSON.stringify(profile));
                updateDeliveryFromProfile(profile);
              }
            }
          } catch (error) {
            console.error("Profile fetch error:", error);
          }
        }
        
        // Load logo AFTER profile is set
        await loadLogoWithProfile(profile);
        
      } catch (error) {
        console.error("Error in fetchProfileAndLogo:", error);
        await loadLogoWithProfile(profile);
      } finally {
        setProfileLoading(false);
      }
    };
    
    fetchProfileAndLogo();
  }, []);

  // FIXED: loadLogo function that accepts profile parameter
  const loadLogoWithProfile = async (profile) => {
    const logoPaths = [];
    
    // 1. Try company profile logo from API
    if (profile?.logo_url) {
      const logoUrl = profile.logo_url.startsWith('http') 
        ? profile.logo_url 
        : `${API_BASE_URL}/${profile.logo_url.replace(/^\/+/, '')}`;
      logoPaths.push(logoUrl);
    }
    
    // 2. Try the profile currently in state
    if (companyProfile?.logo_url && companyProfile.logo_url !== profile?.logo_url) {
      const logoUrl = companyProfile.logo_url.startsWith('http') 
        ? companyProfile.logo_url 
        : `${API_BASE_URL}/${companyProfile.logo_url.replace(/^\/+/, '')}`;
      logoPaths.push(logoUrl);
    }
    
    // 3. Try default logo paths
    logoPaths.push(`${API_BASE_URL}/static/INT.png`);
    logoPaths.push(`${API_BASE_URL}/INT.png`);
    logoPaths.push('/INT.png');
    logoPaths.push(`${API_BASE_URL}/static/logo.png`);
    logoPaths.push('/logo.png');
    
    console.log("🔍 Trying logo paths:", logoPaths);
    
    for (const path of logoPaths) {
      try {
        const base64 = await loadImageAsBase64(path);
        if (base64 && base64.length > 100) {
          setLogoBase64(base64);
          console.log(`✅ Logo loaded from: ${path}`);
          return;
        }
      } catch (e) {
        continue;
      }
    }
    
    console.log("⚠️ No logo found from any path");
  };

  const updateDeliveryFromProfile = (profile) => {
    setDeliveryData(prev => ({
      ...prev,
      fromCompanyName: profile.company_name || prev.fromCompanyName,
      fromAddress: profile.address || prev.fromAddress,
      fromContact: `${profile.phone || ""} | ${profile.email || ""}`,
      fromGST: profile.gst_number || prev.fromGST
    }));
  };

  // ================================
  // QUANTITY HELPERS
  // ================================
  const getQty = useCallback((slNo, fields, source = resultData) => {
    if (!slNo) return 0;
    const fieldName = fields[slNo];
    if (!fieldName) return 0;
    return Number(source?.[fieldName] || 0);
  }, [resultData]);

  const getFinalQty = useCallback((section, slNo, originalQty) => {
    const key = `${section}_${slNo || 'noSlNo'}`;
    return editedQuantities[key] !== undefined ? Number(editedQuantities[key]) : Number(originalQty || 0);
  }, [editedQuantities]);

  const handleQtyChange = useCallback((section, slNo, value) => {
    const key = `${section}_${slNo || 'noSlNo'}`;
    setEditedQuantities(prev => ({ ...prev, [key]: Number(value) || 0 }));
  }, []);

  // ================================
  // SELECTION HANDLERS
  // ================================
  const toggleItemSelection = useCallback((setter, index) => {
    setter(prev => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  }, []);

  const toggleAllSelection = useCallback((setter, items) => {
    setter(prev => {
      const allSelected = prev.length === items.length && prev.every(Boolean);
      return allSelected ? items.map(() => false) : items.map(() => true);
    });
  }, []);

  const getSelectedItems = useCallback((items, selection) => {
    if (!items || !selection) return [];
    return items.filter((_, index) => selection[index]);
  }, []);

  const getSelectedCount = useCallback((selection) => {
    if (!selection || !selection.length) return 0;
    return selection.filter(Boolean).length;
  }, []);

  // ================================
  // PROCESS ITEMS
  // ================================
  useEffect(() => {
    const processItems = () => {
      setLoading(true);
      
      // Main Pool Items
      const mp = (mainPoolItems || [])
        .filter(item => {
          const slNo = Number(item.SlNo || 0);
          return slNo >= 1 && slNo <= 14 && MAIN_POOL_QTY_FIELDS[slNo];
        })
        .map((item, idx) => ({
          ...item,
          uiSlNo: item.SlNo || idx + 1,
          deliveryQuantity: getFinalQty('mainPool', item.SlNo, getQty(item.SlNo, MAIN_POOL_QTY_FIELDS)),
          deliveryStatus: 'pending',
          deliveryRemarks: mainPoolRemarks[item.SlNo] || '',
          description: templateDescriptions[item.SlNo] || item.Description || item.description || 'N/A',
          unit: item.Unit || item.unit || 'Nos',
          code: item.Code || item.code || ''
        }));
      setFilteredMainPoolItems(mp);
      setSelectedMainPool(mp.map(() => true));

      // Balance Tank Items
      if (hasBalancingTank) {
        const bt = (balanceTankItems || [])
          .filter(item => {
            const slNo = Number(item.SlNo || 0);
            return slNo >= 1 && slNo <= 12 && BALANCE_TANK_QTY_FIELDS[slNo];
          })
          .map((item, idx) => ({
            ...item,
            uiSlNo: item.SlNo || idx + 1,
            deliveryQuantity: getFinalQty('balancingTank', item.SlNo, getQty(item.SlNo, BALANCE_TANK_QTY_FIELDS)),
            deliveryStatus: 'pending',
            deliveryRemarks: balancingTankRemarks[item.SlNo] || '',
            description: templateDescriptions[item.SlNo] || item.Description || item.description || 'N/A',
            unit: item.Unit || item.unit || 'Nos',
            code: item.Code || item.code || ''
          }));
        setFilteredBalancingTankItems(bt);
        setSelectedBalancingTank(bt.map(() => true));
      } else {
        setFilteredBalancingTankItems([]);
        setSelectedBalancingTank([]);
      }

      // Pump Room Items
      if (includePumpRoom) {
        const pr = (pumpRoomItems || [])
          .filter(item => {
            const slNo = Number(item.SlNo || 0);
            return slNo >= 1 && slNo <= 12 && PUMP_ROOM_QTY_FIELDS[slNo];
          })
          .map((item, idx) => ({
            ...item,
            uiSlNo: item.SlNo || idx + 1,
            deliveryQuantity: getFinalQty('pumpRoom', item.SlNo, getQty(item.SlNo, PUMP_ROOM_QTY_FIELDS, pumpRoomQuantities)),
            deliveryStatus: 'pending',
            deliveryRemarks: pumpRoomRemarks[item.SlNo] || '',
            description: templateDescriptions[item.SlNo] || item.Description || item.description || 'N/A',
            unit: item.Unit || item.unit || 'Nos',
            code: item.Code || item.code || ''
          }));
        setFilteredPumpRoomItems(pr);
        setSelectedPumpRoom(pr.map(() => true));
      } else {
        setFilteredPumpRoomItems([]);
        setSelectedPumpRoom([]);
      }

      // MEP Items
      const mep = (mepItems || [])
        .filter(item => {
          const slNo = Number(item.SlNo || 0);
          if (slNo >= 1 && slNo <= 34 && MEP_QTY_FIELDS[slNo]) return true;
          if (!slNo) {
            const desc = (item.Description || item.description || '').toLowerCase();
            const code = (item.Code || item.code || '').toLowerCase();
            const isPiping = desc.includes('pipe') || desc.includes('valve') || 
                           desc.includes('flange') || desc.includes('header') ||
                           code.includes('pipe') || code.includes('valve') ||
                           code.includes('flange') || code.includes('header');
            return !isPiping;
          }
          return false;
        })
        .map((item, idx) => ({
          ...item,
          uiSlNo: item.SlNo || idx + 1,
          deliveryQuantity: getFinalQty('mep', item.SlNo, getQty(item.SlNo, MEP_QTY_FIELDS)),
          deliveryStatus: 'pending',
          deliveryRemarks: mepRemarks[item.SlNo] || '',
          description: templateDescriptions[item.SlNo] || item.Description || item.description || 'N/A',
          unit: item.Unit || item.unit || 'Nos',
          code: item.Code || item.code || ''
        }));
      setFilteredMepItems(mep);
      setSelectedMep(mep.map(() => true));

      // Piping Items
      const pipingKeywords = ['pipe', 'valve', 'flange', 'header', 'puddle', 'ball', 'check', 'elbow', 'tee', 'coupling', 'nipple', 'union', 'connector'];
      
      const pip = (pipingItemsFromState || [])
        .filter(item => {
          const slNo = Number(item.SlNo || item.sl_no || 0);
          const category = (item.category || item.Category || '').toLowerCase();
          const type = (item.type || item.Type || '').toLowerCase();
          const desc = (item.description || item.Description || '').toLowerCase();
          const code = (item.code || item.Code || '').toLowerCase();
          
          if (slNo >= 1 && slNo <= 34) return false;
          
          const isPiping = pipingKeywords.some(keyword => 
            category.includes(keyword) || type.includes(keyword) || 
            desc.includes(keyword) || code.includes(keyword)
          );
          
          return isPiping;
        })
        .map((item, idx) => ({
          ...item,
          uiSlNo: item.sl_no || item.SlNo || idx + 1,
          deliveryQuantity: item.quantity || item.Quantity || 0,
          deliveryStatus: 'pending',
          deliveryRemarks: '',
          description: item.description || item.Description || 'Piping Item',
          unit: item.unit || item.Unit || 'NOS',
          code: item.code || item.Code || '',
          type: item.type || item.Type || item.category || '',
          dia: item.dia || item.Dia || null
        }));
      setPipingItems(pip);
      setSelectedPiping(pip.map(() => true));

      setLoading(false);
    };
    processItems();
  }, [location.state]);

  // ================================
  // PDF GENERATION - FIXED with logo
  // ================================
  const generatePDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageW = 210, pageH = 297, margin = 12;
      const usableW = pageW - 2 * margin;
      let y = margin;
      
      const primaryColor = [25, 55, 109];
      const headerBg = [240, 245, 250];
      const altRowBg = [250, 250, 255];
      
      // Header with logo - FIXED
      pdf.setFillColor(...primaryColor);
      pdf.rect(0, 0, pageW, 30, 'F');
      
      let logoAdded = false;
      if (logoBase64 && logoBase64.length > 100) {
        try {
          const logoWidth = 22;
          const logoHeight = 22;
          pdf.addImage(logoBase64, 'PNG', margin, 4, logoWidth, logoHeight);
          logoAdded = true;
          console.log("✅ Logo added to PDF successfully");
        } catch (e) {
          console.error("❌ Failed to add logo to PDF:", e);
        }
      }
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      
      const companyName = deliveryData.fromCompanyName || companyProfile.company_name || 'Company Name';
      
      if (logoAdded) {
        pdf.setFontSize(14);
        pdf.text(companyName, margin + 26, 12);
        pdf.setFontSize(10);
        pdf.text('DELIVERY CHALLAN', margin + 26, 20);
      } else {
        pdf.setFontSize(16);
        pdf.text(companyName, margin, 13);
        pdf.setFontSize(10);
        pdf.text('DELIVERY CHALLAN', margin, 22);
      }
      
      y = 37;
      
      // Info bar
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.3);
      pdf.setFillColor(248, 249, 250);
      pdf.rect(margin, y, usableW, 10, 'F');
      pdf.rect(margin, y, usableW, 10);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(0);
      
      const poolTypeDisplay = `${poolType.toUpperCase()}${constructionType === 'terrace' ? ' (Terrace)' : ' (In-Ground)'}`;
      
      pdf.text(`Challan No: ${deliveryData.challanNo}`, margin + 3, y + 6.5);
      pdf.text(`Date: ${new Date(deliveryData.date).toLocaleDateString('en-IN')}`, margin + 55, y + 6.5);
      pdf.text(`Status: ${deliveryData.deliveryStatus.toUpperCase()}`, margin + 115, y + 6.5);
      pdf.text(`Pool: ${poolTypeDisplay}`, margin + 160, y + 6.5);
      
      y += 14;
      
      // FROM/TO boxes
      const boxW = (usableW - 6) / 2;
      const boxH = 28;
      
      // FROM Box
      pdf.setDrawColor(180);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, y, boxW, boxH);
      pdf.setFillColor(...primaryColor);
      pdf.rect(margin, y, boxW, 7, 'F');
      pdf.setTextColor(255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('FROM', margin + 3, y + 5);
      
      pdf.setTextColor(0);
      pdf.setFontSize(7.5);
      const fromName = deliveryData.fromCompanyName || companyProfile.company_name || 'Company Name';
      pdf.text(cleanTextForPDF(fromName), margin + 3, y + 12);
      pdf.setFontSize(6.5);
      const fromAddr = deliveryData.fromAddress || companyProfile.address || '';
      const fromAddrLines = pdf.splitTextToSize(cleanTextForPDF(fromAddr), boxW - 6);
      pdf.text(fromAddrLines, margin + 3, y + 17);
      pdf.text(`GST: ${cleanTextForPDF(deliveryData.fromGST || companyProfile.gst_number || '')}`, margin + 3, y + 25);
      
      // TO Box
      const toX = margin + boxW + 6;
      pdf.setDrawColor(180);
      pdf.rect(toX, y, boxW, boxH);
      pdf.setFillColor(...primaryColor);
      pdf.rect(toX, y, boxW, 7, 'F');
      pdf.setTextColor(255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('DELIVERY TO', toX + 3, y + 5);
      
      pdf.setTextColor(0);
      pdf.setFontSize(7.5);
      pdf.text(cleanTextForPDF(deliveryData.customerName || 'Customer'), toX + 3, y + 12);
      pdf.setFontSize(6.5);
      const toAddr = deliveryData.deliveryAddress || deliveryData.customerAddress || '';
      const toAddrLines = pdf.splitTextToSize(cleanTextForPDF(toAddr), boxW - 6);
      pdf.text(toAddrLines, toX + 3, y + 17);
      pdf.text(`Contact: ${cleanTextForPDF(deliveryData.contactPerson || '')} | ${cleanTextForPDF(deliveryData.contactNumber || '')}`, toX + 3, y + 25);
      
      y += boxH + 10;
      
      // Pool Specifications
      pdf.setFillColor(...primaryColor);
      pdf.rect(margin, y, usableW, 7, 'F');
      pdf.setTextColor(255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('POOL SPECIFICATIONS', margin + 3, y + 5);
      y += 10;
      
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, y, usableW, 18);
      
      const specColW = usableW / 3;
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(0);
      
      pdf.text('Dimensions:', margin + 3, y + 6);
      pdf.text('Volume:', margin + specColW + 3, y + 6);
      pdf.text('Pool Type:', margin + 2 * specColW + 3, y + 6);
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatDimensions(dimensions), margin + 3, y + 12);
      pdf.text(`${safeToFixed(calculatedVolume)} m³`, margin + specColW + 3, y + 12);
      pdf.text(poolTypeDisplay, margin + 2 * specColW + 3, y + 12);
      
      y += 22;
      
      // Table rendering function
      const renderTable = (title, items, selection) => {
        const selectedItems = getSelectedItems(items, selection);
        if (selectedItems.length === 0) return y;
        
        if (y > pageH - 40) {
          pdf.addPage();
          y = margin;
        }
        
        pdf.setFillColor(...primaryColor);
        pdf.rect(margin, y, usableW, 7, 'F');
        pdf.setTextColor(255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text(`${title} (${selectedItems.length} items)`, margin + 3, y + 5);
        y += 8;
        
        const cols = [
          { x: margin, w: 10, label: '#' },
          { x: margin + 10, w: 20, label: 'Code' },
          { x: margin + 30, w: 80, label: 'Description' },
          { x: margin + 110, w: 18, label: 'Unit' },
          { x: margin + 128, w: 22, label: 'Quantity' },
          { x: margin + 150, w: 24, label: 'Status' }
        ];
        
        pdf.setFillColor(...headerBg);
        pdf.rect(margin, y, usableW, 7, 'F');
        pdf.setDrawColor(200);
        pdf.setLineWidth(0.2);
        pdf.rect(margin, y, usableW, 7);
        pdf.setTextColor(0);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        cols.forEach(col => {
          pdf.text(col.label, col.x + 1, y + 5);
        });
        y += 7;
        
        selectedItems.forEach((item, idx) => {
          if (y > pageH - 15) {
            pdf.addPage();
            y = margin;
            pdf.setFillColor(...headerBg);
            pdf.rect(margin, y, usableW, 7, 'F');
            pdf.setDrawColor(200);
            pdf.rect(margin, y, usableW, 7);
            cols.forEach(col => pdf.text(col.label, col.x + 1, y + 5));
            y += 7;
          }
          
          if (idx % 2 === 0) {
            pdf.setFillColor(...altRowBg);
            pdf.rect(margin, y, usableW, 6, 'F');
          }
          
          pdf.setDrawColor(220);
          pdf.setLineWidth(0.1);
          pdf.rect(margin, y, usableW, 6);
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(6);
          pdf.setTextColor(0);
          
          const rowY = y + 4.5;
          pdf.text(String(item.uiSlNo || idx + 1), cols[0].x + 1, rowY);
          pdf.text(cleanTextForPDF(item.code || '-'), cols[1].x + 1, rowY);
          
          const desc = cleanTextForPDF(item.description || 'N/A').substring(0, 50);
          pdf.text(desc, cols[2].x + 1, rowY);
          
          pdf.text(cleanTextForPDF(item.unit || 'Nos'), cols[3].x + 1, rowY);
          
          const qty = safeToFixed(item.deliveryQuantity, 2);
          pdf.text(qty, cols[4].x + cols[4].w - 2, rowY, { align: 'right' });
          
          pdf.text((item.deliveryStatus || 'pending').toUpperCase(), cols[5].x + 1, rowY);
          
          y += 6;
        });
        
        y += 8;
        return y;
      };
      
      // Render all tables
      y = renderTable('MAIN POOL ITEMS', filteredMainPoolItems, selectedMainPool);
      if (hasBalancingTank && filteredBalancingTankItems.length > 0) {
        y = renderTable('BALANCE TANK ITEMS', filteredBalancingTankItems, selectedBalancingTank);
      }
      if (includePumpRoom && filteredPumpRoomItems.length > 0) {
        y = renderTable('PUMP ROOM ITEMS', filteredPumpRoomItems, selectedPumpRoom);
      }
      y = renderTable('MEP EQUIPMENT', filteredMepItems, selectedMep);
      if (pipingItems.length > 0) {
        y = renderTable('PIPING SYSTEM', pipingItems, selectedPiping);
      }
      
      // Summary
      if (y > pageH - 35) { pdf.addPage(); y = margin; }
      
      y += 5;
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.5);
      pdf.setFillColor(248, 249, 250);
      pdf.rect(margin, y, usableW, 22, 'F');
      pdf.rect(margin, y, usableW, 22);
      
      const totalSelected = getSelectedCount(selectedMainPool) + getSelectedCount(selectedMep) + 
        getSelectedCount(selectedBalancingTank) + getSelectedCount(selectedPumpRoom) + 
        getSelectedCount(selectedPiping);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(0);
      pdf.text('DELIVERY SUMMARY', margin + 3, y + 6);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text(`Total Items Selected: ${totalSelected}`, margin + 3, y + 13);
      pdf.text(`Pool Type: ${poolTypeDisplay} | Dimensions: ${formatDimensions(dimensions)} | Volume: ${safeToFixed(calculatedVolume)} m³`, margin + 3, y + 19);
      
      y += 28;
      
      // Signatures
      const sigW = 52;
      const sigH = 18;
      pdf.setDrawColor(180);
      pdf.setLineWidth(0.3);
      
      pdf.rect(margin, y, sigW, sigH);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text('Prepared By', margin + 2, y + 6);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      pdf.text(cleanTextForPDF(deliveryData.preparedBy || '_____________'), margin + 2, y + 15);
      
      pdf.rect(margin + sigW + 5, y, sigW, sigH);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text('Authorized By', margin + sigW + 7, y + 6);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      pdf.text(cleanTextForPDF(deliveryData.authorizedBy || '_____________'), margin + sigW + 7, y + 15);
      
      pdf.rect(margin + 2 * (sigW + 5), y, sigW, sigH);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text('Received By', margin + 2 * (sigW + 5) + 2, y + 6);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      pdf.text(cleanTextForPDF(deliveryData.receivedBy || '_____________'), margin + 2 * (sigW + 5) + 2, y + 15);
      
      // Footer
      pdf.setFontSize(6);
      pdf.setTextColor(150);
      pdf.text('This is a computer-generated delivery challan', pageW / 2, pageH - 8, { align: 'center' });
      
      pdf.save(`Delivery-Challan-${deliveryData.challanNo}.pdf`);
      alert("✅ Delivery Challan PDF generated successfully!");
    } catch (error) {
      console.error("PDF Error:", error);
      alert("❌ Failed to generate PDF. Please try again.");
    }
  };

  // ================================
  // HANDLERS
  // ================================
  const handleInputChange = (field, value) => {
    setDeliveryData(prev => ({ ...prev, [field]: value }));
  };

  const handleStatusChange = (setter, index, value) => {
    setter(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], deliveryStatus: value };
      }
      return updated;
    });
  };

  const handleRemarksChange = (setter, index, value) => {
    setter(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], deliveryRemarks: value };
      }
      return updated;
    });
  };

  const saveChallan = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('delivery_challans') || '[]');
      saved.unshift({ ...deliveryData, poolType, constructionType, savedAt: new Date().toISOString() });
      localStorage.setItem('delivery_challans', JSON.stringify(saved.slice(0, 20)));
      alert("✅ Delivery challan saved successfully!");
    } catch (error) {
      alert("❌ Failed to save challan.");
    }
  };

  // ================================
  // TABLE RENDERER COMPONENT
  // ================================
  const renderItemTable = (title, items, selection, setSelection, setItems, section) => {
    if (!items || items.length === 0) return null;
    
    return (
      <section className="items-section-1">
        <div className="section-header-1">
          <h2>{title} ({items.length} items)</h2>
          <div className="section-actions-1">
            <span className="selection-count-1">Selected: {getSelectedCount(selection)} / {items.length}</span>
            <button className="select-all-section-1" onClick={() => toggleAllSelection(setSelection, items)}>
              {getSelectedCount(selection) === items.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
        <div className="table-container-1">
          <table className="delivery-table-1">
            <thead>
              <tr>
                <th className="select-column-1">
                  <input type="checkbox" 
                    checked={getSelectedCount(selection) === items.length && items.length > 0}
                    onChange={() => toggleAllSelection(setSelection, items)}
                    className="select-all-checkbox-1" />
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
              {items.map((item, index) => (
                <tr key={`${section}-${index}`} className={selection[index] ? 'selected-row-1' : ''}>
                  <td className="select-column-1">
                    <input type="checkbox" 
                      checked={selection[index] || false}
                      onChange={() => toggleItemSelection(setSelection, index)}
                      className="item-checkbox-1" />
                  </td>
                  <td className="text-center-1">{item.uiSlNo}</td>
                  <td className="text-center-1">{item.code || "N/A"}</td>
                  <td className="description-cell-1">{item.description}</td>
                  <td className="text-center-1">{item.unit || "Nos"}</td>
                  <td className="text-center-1 quantity-cell-1">
                    <input type="number" 
                      value={getFinalQty(section, item.SlNo || item.sl_no, item.deliveryQuantity)}
                      onChange={(e) => handleQtyChange(section, item.SlNo || item.sl_no, e.target.value)} />
                  </td>
                  <td className="text-center-1">
                    <select value={item.deliveryStatus || 'pending'} 
                      onChange={(e) => handleStatusChange(setItems, index, e.target.value)}
                      className="status-select-1">
                      <option value="pending">Pending</option>
                      <option value="dispatched">Dispatched</option>
                      <option value="delivered">Delivered</option>
                      <option value="not-required">Not Required</option>
                    </select>
                  </td>
                  <td>
                    <input type="text" value={item.deliveryRemarks || ''}
                      onChange={(e) => handleRemarksChange(setItems, index, e.target.value)}
                      placeholder="Remarks" className="remarks-input-1" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

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

  return (
    <div className="delivery-page-1">
      {/* Header */}
      <header className="delivery-header-1">
        <div className="header-content-1">
          <div className="company-logo-section-1">
            {(logoBase64 || companyProfile?.logo_url) && (
              <img 
                src={logoBase64 || (companyProfile?.logo_url?.startsWith('http') ? companyProfile.logo_url : `${API_BASE_URL}/${companyProfile.logo_url}`)} 
                alt="Company Logo" 
                className="company-logo-1"
                onError={(e) => { e.target.style.display = 'none'; }} 
              />
            )}
            <div className="company-text-1">
              <h1>{deliveryData.fromCompanyName || companyProfile.company_name}</h1>
              <p className="subtitle-1">Professional Swimming Pool Construction</p>
            </div>
          </div>
          <h2 className="challan-title-1">DELIVERY CHALLAN</h2>
          <div className="challan-info-1">
            <span><strong>Challan No:</strong> {deliveryData.challanNo}</span>
            <span><strong>Date:</strong> {new Date(deliveryData.date).toLocaleDateString('en-IN')}</span>
            <span><strong>Status:</strong> {deliveryData.deliveryStatus.toUpperCase()}</span>
            <span><strong>Pool Type:</strong> {poolType.toUpperCase()} ({constructionDisplay})</span>
          </div>
        </div>
        <div className="header-actions-1">
          <button className="pdf-button-1" onClick={generatePDF}>📄 Download PDF</button>
          <button className="save-button-1" onClick={saveChallan}>💾 Save</button>
          <button className="back-button-1" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </header>

      {/* FROM / TO Section */}
      <section className="address-section-1">
        <div className="address-grid-1">
          <div className="address-card-1 from-address-1">
            <h3>FROM</h3>
            <div className="company-info-1">
              <h4>{deliveryData.fromCompanyName || companyProfile.company_name}</h4>
              <p>{deliveryData.fromAddress || companyProfile.address}</p>
              <p>{deliveryData.fromContact || `${companyProfile.phone} | ${companyProfile.email}`}</p>
              <p className="gst-number-1">{deliveryData.fromGST || companyProfile.gst_number}</p>
            </div>
          </div>
          <div className="address-card-1 to-address-1">
            <h3>DELIVERY TO</h3>
            <div className="customer-info-1">
              <div className="form-group-1">
                <label>Customer Name:</label>
                <input type="text" value={deliveryData.customerName} onChange={(e) => handleInputChange('customerName', e.target.value)} placeholder="Enter customer name" />
              </div>
              <div className="form-group-1">
                <label>Delivery Address:</label>
                <textarea value={deliveryData.deliveryAddress} onChange={(e) => handleInputChange('deliveryAddress', e.target.value)} rows="3" placeholder="Enter delivery address" />
              </div>
              <div className="contact-grid-1">
                <div className="form-group-1">
                  <label>Contact Person:</label>
                  <input type="text" value={deliveryData.contactPerson} onChange={(e) => handleInputChange('contactPerson', e.target.value)} placeholder="Contact person" />
                </div>
                <div className="form-group-1">
                  <label>Contact Number:</label>
                  <input type="tel" value={deliveryData.contactNumber} onChange={(e) => handleInputChange('contactNumber', e.target.value)} placeholder="Contact number" />
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
            <input type="text" value={deliveryData.challanNo} readOnly className="readonly-input-1" />
          </div>
          <div className="form-group-1">
            <label>Date:</label>
            <input type="date" value={deliveryData.date} onChange={(e) => handleInputChange('date', e.target.value)} />
          </div>
          <div className="form-group-1">
            <label>Project Name:</label>
            <input type="text" value={deliveryData.projectName} onChange={(e) => handleInputChange('projectName', e.target.value)} placeholder="Project name" />
          </div>
          <div className="form-group-1">
            <label>Delivery Status:</label>
            <select value={deliveryData.deliveryStatus} onChange={(e) => handleInputChange('deliveryStatus', e.target.value)}>
              <option value="pending">Pending</option>
              <option value="in-transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="partially-delivered">Partially Delivered</option>
            </select>
          </div>
          <div className="form-group-1">
            <label>Vehicle Number:</label>
            <input type="text" value={deliveryData.vehicleNumber} onChange={(e) => handleInputChange('vehicleNumber', e.target.value)} placeholder="Vehicle number" />
          </div>
          <div className="form-group-1">
            <label>Driver Name:</label>
            <input type="text" value={deliveryData.driverName} onChange={(e) => handleInputChange('driverName', e.target.value)} placeholder="Driver name" />
          </div>
          <div className="form-group-1">
            <label>Driver Contact:</label>
            <input type="tel" value={deliveryData.driverContact} onChange={(e) => handleInputChange('driverContact', e.target.value)} placeholder="Driver contact" />
          </div>
        </div>
        <div className="form-group-1 full-width-1">
          <label>Notes / Special Instructions:</label>
          <textarea value={deliveryData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} rows="3" placeholder="Any special instructions or notes for delivery" />
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
            <span className="spec-value-1">{safeToFixed(calculatedVolume)} m³ ({safeToFixed(calculatedLiters, 0)} L)</span>
          </div>
          <div className="spec-item-1">
            <span className="spec-label-1">Flow Rate:</span>
            <span className="spec-value-1">{safeToFixed(flowRate)} m³/hr</span>
          </div>
          <div className="spec-item-1">
            <span className="spec-label-1">Pool Type:</span>
            <span className="spec-value-1">{poolType.toUpperCase()} ({constructionDisplay})</span>
          </div>
          <div className="spec-item-1">
            <span className="spec-label-1">Gutter System:</span>
            <span className="spec-value-1">{hasBalancingTank ? 'Yes (Balance Tank)' : 'No'}</span>
          </div>
          <div className="spec-item-1">
            <span className="spec-label-1">Pump Room:</span>
            <span className="spec-value-1">{includePumpRoom ? 'Included' : 'Not Included'}</span>
          </div>
          {pumpRoomDimensions?.length && (
            <div className="spec-item-1">
              <span className="spec-label-1">Pump Room Size:</span>
              <span className="spec-value-1">{pumpRoomDimensions.length}m × {pumpRoomDimensions.width}m × {pumpRoomDimensions.height}m</span>
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
          <div className="spec-item-1">
            <span className="spec-label-1">Construction:</span>
            <span className="spec-value-1">{constructionDisplay}</span>
          </div>
        </div>
      </section>

      {/* Selection Summary */}
      <section className="selection-summary-1">
        <h2>Selection Summary</h2>
        <div className="selection-stats-1">
          <div className="selection-stat-1">
            <span className="stat-label-1">Main Pool:</span>
            <span className="stat-value-1">{getSelectedCount(selectedMainPool)} / {filteredMainPoolItems.length}</span>
          </div>
          {hasBalancingTank && (
            <div className="selection-stat-1">
              <span className="stat-label-1">Balance Tank:</span>
              <span className="stat-value-1">{getSelectedCount(selectedBalancingTank)} / {filteredBalancingTankItems.length}</span>
            </div>
          )}
          {includePumpRoom && (
            <div className="selection-stat-1">
              <span className="stat-label-1">Pump Room:</span>
              <span className="stat-value-1">{getSelectedCount(selectedPumpRoom)} / {filteredPumpRoomItems.length}</span>
            </div>
          )}
          <div className="selection-stat-1">
            <span className="stat-label-1">MEP Equipment:</span>
            <span className="stat-value-1">{getSelectedCount(selectedMep)} / {filteredMepItems.length}</span>
          </div>
          <div className="selection-stat-1">
            <span className="stat-label-1">Piping System:</span>
            <span className="stat-value-1">{getSelectedCount(selectedPiping)} / {pipingItems.length}</span>
          </div>
        </div>
        <div className="selection-actions-1">
          <button className="select-all-button-1" onClick={() => {
            toggleAllSelection(setSelectedMainPool, filteredMainPoolItems);
            if (hasBalancingTank) toggleAllSelection(setSelectedBalancingTank, filteredBalancingTankItems);
            if (includePumpRoom) toggleAllSelection(setSelectedPumpRoom, filteredPumpRoomItems);
            toggleAllSelection(setSelectedMep, filteredMepItems);
            toggleAllSelection(setSelectedPiping, pipingItems);
          }}>Select All</button>
          <button className="deselect-all-button-1" onClick={() => {
            setSelectedMainPool(filteredMainPoolItems.map(() => false));
            setSelectedBalancingTank(filteredBalancingTankItems.map(() => false));
            setSelectedPumpRoom(filteredPumpRoomItems.map(() => false));
            setSelectedMep(filteredMepItems.map(() => false));
            setSelectedPiping(pipingItems.map(() => false));
          }}>Deselect All</button>
        </div>
      </section>

      {/* Tables */}
      {renderItemTable('Civil Works - Main Pool', filteredMainPoolItems, selectedMainPool, setSelectedMainPool, setFilteredMainPoolItems, 'mainPool')}
      {hasBalancingTank && renderItemTable('Civil Works - Balance Tank', filteredBalancingTankItems, selectedBalancingTank, setSelectedBalancingTank, setFilteredBalancingTankItems, 'balancingTank')}
      {includePumpRoom && renderItemTable('Civil Works - Pump Room', filteredPumpRoomItems, selectedPumpRoom, setSelectedPumpRoom, setFilteredPumpRoomItems, 'pumpRoom')}
      {renderItemTable('MEP Equipment & Materials', filteredMepItems, selectedMep, setSelectedMep, setFilteredMepItems, 'mep')}
      {renderItemTable('Piping System', pipingItems, selectedPiping, setSelectedPiping, setPipingItems, 'piping')}

      {/* Summary */}
      <section className="summary-section-1">
        <h2>Delivery Summary</h2>
        <div className="summary-grid-1">
          <div className="summary-item-1">
            <span className="summary-label-1">Main Pool Items:</span>
            <span className="summary-value-1">{filteredMainPoolItems.length}</span>
          </div>
          <div className="summary-item-1">
            <span className="summary-label-1">MEP Items:</span>
            <span className="summary-value-1">{filteredMepItems.length}</span>
          </div>
          <div className="summary-item-1">
            <span className="summary-label-1">Piping Items:</span>
            <span className="summary-value-1">{pipingItems.length}</span>
          </div>
          <div className="summary-item-1">
            <span className="summary-label-1">Pool Type:</span>
            <span className="summary-value-1">{poolType.toUpperCase()} ({constructionDisplay})</span>
          </div>
        </div>
      </section>

      {/* Signatures */}
      <section className="signatures-section-1">
        <h2>Authorizations</h2>
        <div className="signatures-grid-1">
          <div className="signature-block-1">
            <div className="signature-line-1"></div>
            <p>Prepared By</p>
            <input type="text" value={deliveryData.preparedBy} onChange={(e) => handleInputChange('preparedBy', e.target.value)} placeholder="Name of preparer" className="signature-input-1" />
          </div>
          <div className="signature-block-1">
            <div className="signature-line-1"></div>
            <p>Authorized By</p>
            <input type="text" value={deliveryData.authorizedBy} onChange={(e) => handleInputChange('authorizedBy', e.target.value)} placeholder="Name of authorized person" className="signature-input-1" />
          </div>
          <div className="signature-block-1">
            <div className="signature-line-1"></div>
            <p>Received By</p>
            <input type="text" value={deliveryData.receivedBy} onChange={(e) => handleInputChange('receivedBy', e.target.value)} placeholder="Receiver's signature" className="signature-input-1" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="delivery-actions-1">
        <button className="pdf-button-1" onClick={generatePDF}>📄 Download PDF</button>
        <button className="back-button-1" onClick={() => navigate(-1)}>← Back to Results</button>
      </footer>
    </div>
  );
}

export default DeliveryChallan;