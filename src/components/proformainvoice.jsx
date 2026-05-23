import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./proformainvoice.css";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const INSTALL_PCT  = 0.15;
const GST_RATE     = 0.18;
const API_BASE_URL = "https://pool-costing-api.intelithon.in";

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
  12: "Tiling_QTY",
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

// EXACT MAPPING from ResultPage — DO NOT CHANGE
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

const SECTION_META = {
  mainPool:    { label: "Civil — Pool Structure",    color: "#0d3b6e", icon: "🏊", hasInstall: false },
  balanceTank: { label: "Civil — Balance Tank",      color: "#2a5f9e", icon: "⚖️", hasInstall: false },
  pumpRoom:    { label: "Civil — Pump Room",         color: "#1a4f72", icon: "🏗️", hasInstall: false },
  mep:         { label: "MEP Systems & Equipment",   color: "#154360", icon: "⚙️", hasInstall: true  },
  piping:      { label: "Piping System",             color: "#1b4f72", icon: "🔩", hasInstall: true  },
};

const DEFAULT_COMPANY_PROFILE = {
  company_name: "INTELITHON TECHNOLOGIES",
  company_code: "INT",
  address:  "No. 1, 1st Floor, Deepa Towers, Esther Enclave, Horamavu, Bangalore, Karnataka - 560043",
  phone:    "+91 9964457127",
  email:    "intelithontech@gmail.com",
  website:  "www.intelithon.in",
  logo_url: null,
  gst:      "GSTIN: 29AAGCI1234B1Z5",
  pan:      "",
};

// Overflow Grating replacement data (ONLY used for overflow pools)
const OVERFLOW_GRATING_DATA = {
  SlNo:        11,
  Code:        "OG-001",
  Description: "Overflow Grating - Durable, anti-slip cover installed along the overflow channel. Allows excess water to drain efficiently back to the balance tank while ensuring safe foot traffic around the pool perimeter. Manufactured from UV-stabilized PVC or ABS, it is corrosion-resistant, easy to remove for cleaning, and designed to maintain a uniform water level with a clean, finished edge.",
  Unit:        "RMT",
  Rate:        1850,
  Image:       "/public/grating.png",
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const num = (v, fb = 0) => { const n = parseFloat(v); return isNaN(n) ? fb : n; };

function cleanDesc(text = "") {
  return String(text || "").replace(/\{\{[^}]+\}\}/g, "").replace(/\s{2,}/g, " ").trim();
}

function shortDesc(text = "", max = 120) {
  const c = cleanDesc(text);
  return c.length > max ? c.slice(0, max - 1) + "…" : c;
}

function formatINR(v) {
  const n2 = num(v).toFixed(2);
  const [i, d] = n2.split(".");
  const last3 = i.slice(-3);
  const rest  = i.slice(0, -3);
  return `₹${rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3}.${d}`;
}

const ONES = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
  "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const TENS = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

function conv(n) {
  if (n < 20)  return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
  return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + conv(n % 100) : "");
}

function toWords(n) {
  if (!n) return "Zero Only";
  let r = "", m = Math.floor(n);
  if (m >= 10000000) { r += conv(Math.floor(m / 10000000)) + " Crore ";  m %= 10000000; }
  if (m >= 100000)   { r += conv(Math.floor(m / 100000))   + " Lakh ";   m %= 100000;   }
  if (m >= 1000)     { r += conv(Math.floor(m / 1000))     + " Thousand "; m %= 1000;   }
  if (m > 0)           r += conv(m);
  return r.trim() + " Only";
}

function genPI(code = "INT") {
  return `${code}/PI/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 9000) + 1000)}`;
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function addDays(d, n) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split("T")[0];
}
const TODAY = new Date().toISOString().split("T")[0];

// ─────────────────────────────────────────────────────────────
// QUANTITY GETTER FUNCTIONS — exact match with ResultPage
// ─────────────────────────────────────────────────────────────

// ✅ STEP 1: FIXED getCivilQuantity - checks multiple paths
const getCivilQuantity = (slNo, civilQuantities, resultData) => {
  const fieldName = MAIN_POOL_QTY_FIELDS[slNo];
  if (!fieldName) return 0;

  // 1. From civilQuantities (highest priority)
  if (civilQuantities?.[fieldName] !== undefined) {
    return num(civilQuantities[fieldName]);
  }

  // 2. From resultData direct
  if (resultData?.[fieldName] !== undefined) {
    return num(resultData[fieldName]);
  }

  // 3. 🔥 NEW: from resultData.civil_quantities
  if (resultData?.civil_quantities?.[fieldName] !== undefined) {
    return num(resultData.civil_quantities[fieldName]);
  }

  return 0;
};

const getBalanceTankQuantity = (slNo, balanceTankQuantities, resultData) => {
  const fieldName = BALANCE_TANK_QTY_FIELDS[slNo];
  if (!fieldName) return 0;
  
  if (balanceTankQuantities?.[fieldName] !== undefined) {
    return num(balanceTankQuantities[fieldName]);
  }
  
  if (resultData?.[fieldName] !== undefined) {
    return num(resultData[fieldName]);
  }
  
  if (resultData?.balance_tank_quantities?.[fieldName] !== undefined) {
    return num(resultData.balance_tank_quantities[fieldName]);
  }
  
  return 0;
};

// ✅ STEP 2: FIXED getPumpRoomQuantity - checks multiple paths
const getPumpRoomQuantity = (slNo, pumpRoomQuantities, resultData) => {
  const fieldName = PUMP_ROOM_QTY_FIELDS[slNo];
  if (!fieldName) return 0;

  // 1. From pumpRoomQuantities
  if (pumpRoomQuantities?.[fieldName] !== undefined) {
    return num(pumpRoomQuantities[fieldName]);
  }

  // 2. From resultData direct
  if (resultData?.[fieldName] !== undefined) {
    return num(resultData[fieldName]);
  }

  // 3. 🔥 NEW: from resultData.pump_room_quantities
  if (resultData?.pump_room_quantities?.[fieldName] !== undefined) {
    return num(resultData.pump_room_quantities[fieldName]);
  }

  return 0;
};

// Get MEP Quantity — supports all pool types (Jacuzzi, Skimmer, Overflow, Infinity, Freeform)
const getMepQuantity = (slNo, mepQuantities, resultData, selectedAdvancedEquipment, includeHeatPump, poolType) => {
  const fieldName = MEP_QTY_FIELDS[slNo];
  if (!fieldName) return 0;

  // Jacuzzi specific logic
  if (poolType === "jacuzzi") {
    if (mepQuantities?.[fieldName] !== undefined) {
      return num(mepQuantities[fieldName]);
    }
    
    if (resultData?.mep_quantities?.[fieldName] !== undefined) {
      return num(resultData.mep_quantities[fieldName]);
    }
    
    if (slNo === 26) return num(resultData?.water_jets || 0);
    if (slNo === 27) return num(resultData?.air_jets || 0);
    if (slNo === 28) return num(resultData?.jet_pump_qty || 1);
    
    if (slNo === 29) {
      return selectedAdvancedEquipment?.includes(29) ? 1 : 0;
    }
    
    return 0;
  }

  // Gutter Drain (SlNo 13) — ONLY hidden for overflow pools
  if (poolType === "overflow" && slNo === 13) return 0;

  // Advanced Equipment (SlNo 30-34) — only if explicitly selected
  if (slNo >= 30 && slNo <= 34) {
    return selectedAdvancedEquipment?.includes(slNo) ? 1 : 0;
  }

  // Heat Pump (SlNo 30) special guard
  if (slNo === 30 && !includeHeatPump) return 0;

  // Priority 1: mepQuantities
  if (mepQuantities?.[fieldName] !== undefined) return num(mepQuantities[fieldName]);

  // Priority 2: resultData
  if (resultData?.[fieldName] !== undefined) return num(resultData[fieldName]);
  
  // Priority 3: resultData.mep_quantities
  if (resultData?.mep_quantities?.[fieldName] !== undefined) return num(resultData.mep_quantities[fieldName]);

  return 0;
};

// Get Supply Rate — exact match with ResultPage
const getSupplyRate = (item, dynamicRates) => {
  if (item.SlNo === 1) return dynamicRates?.filter_rate ?? 0;
  if (item.SlNo === 7) return dynamicRates?.pump_rate   ?? 0;
  if (item.SlNo === 28) return 52500; // Jet Pump fixed rate
  return item.Rate ?? 0;
};

// Overflow Grating Quantity (perimeter based) — only for overflow
const getOverflowGratingQty = (resultData) => {
  return num(resultData?.perimeter || resultData?.overflow_length || 0);
};

// ─────────────────────────────────────────────────────────────
// PIPING LINES — build from already-mapped piping objects
// ─────────────────────────────────────────────────────────────
function buildPipingLines(rawItems) {
  const src = Array.isArray(rawItems) ? rawItems : [];
  return src.map((item, idx) => {
    const qty  = num(item.Quantity ?? item.quantity ?? item.qty  ?? 1);
    const rate = num(item.SupplyRate ?? item.supply_rate ?? item.Rate ?? item.rate ?? 0);
    const desc = cleanDesc(
      item.Description || item.description || item.actualDescription || ""
    );
    const code = item.Code || item.code || "";
    const unit = item.Unit || item.unit || "Nos";
    const slNo = item.SlNo || item.sl_no || (idx + 1);
    const dia  = item.Dia  || item.dia;

    let finalDesc = desc;
    if (dia && finalDesc && !finalDesc.includes(`${dia}mm`) && !finalDesc.includes(`${dia} mm`)) {
      finalDesc = `${dia}mm ${finalDesc}`;
    }

    return {
      _key:       `piping_${idx}`,
      section:    "piping",
      idx,
      slNo,
      desc:       finalDesc || desc,
      code,
      unit,
      qty,
      rate,
      dia,
      hasInstall: true,
      _raw:       item,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function ProformaInvoice() {
  const location = useLocation();
  const navigate = useNavigate();
  const state    = location.state || {};

  // Pool type detection
  const poolType   = state.poolType || "skimmer";
  const isJacuzzi  = poolType === "jacuzzi";
  const isOverflow = poolType === "overflow";
  const isInfinity = poolType === "infinity";
  const isFreeform = poolType === "freeform";

  // Data from ResultPage
  const resultData               = state.resultData               || {};
  const dimensions               = state.dimensions               || {};
  const companyProfile           = state.companyProfile           || DEFAULT_COMPANY_PROFILE;
  const includePumpRoom          = state.includePumpRoom          !== undefined ? state.includePumpRoom : true;
  const selectedAdvancedEquipment = state.selectedAdvancedEquipment|| [];
  const dynamicRates             = state.dynamicRates             || {};
  const filteredMainPoolItems    = state.filteredMainPoolItems     || [];
  const filteredMepItemsRaw      = state.filteredMepItems         || [];
  const pumpRoomItems            = state.pumpRoomItems            || [];
  const balanceTankItems         = state.balanceTankItems         || [];
  const includeHeatPump          = state.includeHeatPump          || false;

  // Balance tank logic
  const includeBalancingTank =
    state.hasBalancingTank !== undefined
      ? state.hasBalancingTank
      : (isOverflow || isInfinity || isFreeform);

  // Piping items
  const rawPipingItems =
    resultData?.piping_items ||
    resultData?.piping       ||
    state.pipingItems        ||
    [];

  const civilQuantities       = state.civilQuantities       || {};
  const mepQuantities         = state.mepQuantities         || {};
  const pumpRoomQuantities    = state.pumpRoomQuantities    || {};
  const balanceTankQuantities = state.balanceTankQuantities || {};

  // MEP Items Transformation — ONLY for overflow
  const filteredMepItems = useMemo(() => {
    if (!isOverflow) return filteredMepItemsRaw;

    return filteredMepItemsRaw.map(item => {
      if (item.SlNo === 11) {
        return {
          ...item,
          Description:        OVERFLOW_GRATING_DATA.Description,
          Unit:               OVERFLOW_GRATING_DATA.Unit,
          Rate:               OVERFLOW_GRATING_DATA.Rate,
          isOverflowGrating:  true,
          originalDescription: item.Description,
        };
      }
      if (item.SlNo === 13) {
        return { ...item, isGutterDrain: true };
      }
      return item;
    });
  }, [filteredMepItemsRaw, isOverflow]);

  // Company profile
  const [profile, setProfile]               = useState(companyProfile);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const fetchTenantProfile = async () => {
      if (profile.company_name && profile.company_name !== "INTELITHON TECHNOLOGIES") return;
      setProfileLoading(true);
      try {
        const companyCode = localStorage.getItem("tenant_company_code");
        if (!companyCode) return;
        const response = await fetch(
          `${API_BASE_URL}/admin/tenant/public-profile?company_code=${companyCode}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        );
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setProfile(result.data);
            localStorage.setItem("tenant_company_profile", JSON.stringify(result.data));
          }
        }
      } catch (err) { console.error("Error fetching tenant profile:", err); }
      finally { setProfileLoading(false); }
    };
    fetchTenantProfile();
  }, []);

  const [view, setView] = useState("setup");

  // Client info
  const [cl, setCl] = useState({
    name: "", company: "", address: "", city: "", state: "", pin: "",
    phone: "", email: "", gstin: "", pan: "", tinNo: "",
  });
  const sc = (k, v) => setCl(p => ({ ...p, [k]: v }));

  const [piNo]       = useState(() => genPI(profile.company_code));
  const validDate    = addDays(TODAY, 30);
  const [poRef,        setPoRef]      = useState("");
  const [payTerms,     setPayTerms]   = useState(
    "50% advance with Purchase Order\n40% before dispatch of materials\n10% on successful testing & commissioning"
  );
  const [delivTerms,   setDelivTerms] = useState(
    "In-stock materials: 2–3 weeks from PO\nImported materials: 12–14 weeks from PO"
  );
  const [addNotes, setAddNotes] = useState("");

  // Pool label
  const poolLabel =
    poolType === "jacuzzi"
      ? "Jacuzzi / Spa Pool"
      : poolType === "freeform"
      ? "Freeform Swimming Pool"
      : poolType === "infinity"
      ? "Infinity Swimming Pool"
      : poolType === "overflow"
      ? "Overflow Swimming Pool"
      : "Skimmer Swimming Pool";

  // Build Main Pool lines
  const mainPoolLines = useMemo(() => {
    if (!Array.isArray(filteredMainPoolItems)) return [];
    return filteredMainPoolItems
      .filter(item => item.SlNo >= 1 && item.SlNo <= 12)
      .map((item, idx) => {
        const slNo = item.SlNo;
        const qty  = getCivilQuantity(slNo, civilQuantities, resultData);
        const rate = item.Rate || 0;
        return {
          _key:       `mainPool_${idx}`,
          section:    "mainPool",
          idx,
          slNo,
          desc:       cleanDesc(item.Description || ""),
          code:       item.Code || "",
          unit:       item.Unit || "",
          qty,
          rate,
          hasInstall: false,
          _raw:       item,
        };
      });
  }, [filteredMainPoolItems, civilQuantities, resultData]);

  // Build Balance Tank lines
  const balanceTankLines = useMemo(() => {
    if (!includeBalancingTank) return [];

    const sourceItems =
      Array.isArray(balanceTankItems) && balanceTankItems.length > 0
        ? balanceTankItems
        : filteredMainPoolItems;

    return sourceItems
      .filter(item => item.SlNo >= 1 && item.SlNo <= 10)
      .map((item, idx) => {
        const slNo = item.SlNo;
        const qty  = getBalanceTankQuantity(slNo, balanceTankQuantities, resultData);
        const rate = item.Rate || 0;
        return {
          _key:       `balanceTank_${idx}`,
          section:    "balanceTank",
          idx,
          slNo,
          desc:       `${cleanDesc(item.Description || "")} (Balance Tank)`,
          code:       item.Code || "",
          unit:       item.Unit || "",
          qty,
          rate,
          hasInstall: false,
          _raw:       item,
        };
      });
  }, [filteredMainPoolItems, balanceTankItems, balanceTankQuantities, resultData, includeBalancingTank]);

  // Build Pump Room lines
  const pumpRoomLines = useMemo(() => {
    if (!includePumpRoom || !Array.isArray(pumpRoomItems)) return [];
    return pumpRoomItems
      .filter(item => item.SlNo >= 1 && item.SlNo <= 10)
      .map((item, idx) => {
        const slNo = item.SlNo;
        const qty  = getPumpRoomQuantity(slNo, pumpRoomQuantities, resultData);
        const rate = item.Rate || 0;
        return {
          _key:       `pumpRoom_${idx}`,
          section:    "pumpRoom",
          idx,
          slNo,
          desc:       `${cleanDesc(item.Description || "")} (Pump Room)`,
          code:       item.Code || "",
          unit:       item.Unit || "",
          qty,
          rate,
          hasInstall: false,
          _raw:       item,
        };
      });
  }, [pumpRoomItems, pumpRoomQuantities, resultData, includePumpRoom]);

  // Build MEP lines
  const mepLines = useMemo(() => {
    if (!Array.isArray(filteredMepItems)) return [];

    return filteredMepItems
      .filter(item => {
        if (isOverflow && item.SlNo === 13) return false;
        return isJacuzzi ? item.SlNo <= 29 : item.SlNo < 35;
      })
      .map((item, idx) => {
        const slNo = item.SlNo;

        let qty;
        if (item.isOverflowGrating) {
          qty = getOverflowGratingQty(resultData);
        } else {
          qty = getMepQuantity(
            slNo,
            mepQuantities,
            resultData,
            selectedAdvancedEquipment,
            includeHeatPump,
            poolType
          );
        }

        const rate = getSupplyRate(item, dynamicRates);
        return {
          _key:              `mep_${idx}`,
          section:           "mep",
          idx,
          slNo,
          desc:              cleanDesc(item.Description || ""),
          code:              item.Code || "",
          unit:              item.Unit || "",
          qty,
          rate,
          hasInstall:        true,
          isOverflowGrating: item.isOverflowGrating || false,
          isGutterDrain:     item.isGutterDrain     || false,
          _raw:              item,
        };
      });
  }, [filteredMepItems, mepQuantities, resultData, selectedAdvancedEquipment, includeHeatPump, dynamicRates, poolType, isJacuzzi, isOverflow]);

  // Build Piping lines
  const pipingLines = useMemo(() => buildPipingLines(rawPipingItems), [rawPipingItems]);

  const allLines = {
    mainPool:    mainPoolLines,
    balanceTank: balanceTankLines,
    pumpRoom:    pumpRoomLines,
    mep:         mepLines,
    piping:      pipingLines,
  };

  // Piping items start DESELECTED by default
  const [desel, setDesel] = useState(() => {
    const init = new Set();
    buildPipingLines(rawPipingItems).forEach(l => init.add(l._key));
    return init;
  });

  const isSel      = k  => !desel.has(k);
  const toggleItem = k  => setDesel(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const selectAll  = () => setDesel(new Set());
  const deselectAll= () => setDesel(new Set(Object.values(allLines).flat().map(l => l._key)));
  const toggleSection = sk => {
    const keys  = allLines[sk].map(l => l._key);
    const allOn = keys.every(k => isSel(k));
    setDesel(p => {
      const n = new Set(p);
      allOn ? keys.forEach(k => n.add(k)) : keys.forEach(k => n.delete(k));
      return n;
    });
  };

  const [qtyOvr, setQtyOvr] = useState({});
  const getQty = l  => qtyOvr[l._key] !== undefined ? qtyOvr[l._key] : l.qty;
  const setQty = (key, v) => setQtyOvr(p => ({ ...p, [key]: parseFloat(v) || 0 }));

  const activeLines = useMemo(() => {
    const proc = sk => allLines[sk].filter(l => isSel(l._key)).map(l => {
      const qty = getQty(l);
      const sup = qty * l.rate;
      const ins = l.hasInstall ? sup * INSTALL_PCT : 0;
      return { ...l, qty, supplyAmt: sup, installAmt: ins, amount: sup + ins };
    });
    return {
      mainPool:    proc("mainPool"),
      balanceTank: proc("balanceTank"),
      pumpRoom:    proc("pumpRoom"),
      mep:         proc("mep"),
      piping:      proc("piping"),
    };
  }, [allLines, desel, qtyOvr]);

  const totals = useMemo(() => Object.fromEntries(
    Object.entries(activeLines).map(([k, v]) => [k, v.reduce((s, l) => s + l.amount, 0)])
  ), [activeLines]);

  const mainPoolTotal    = totals.mainPool    || 0;
  const balanceTankTotal = totals.balanceTank || 0;
  const pumpRoomTotal    = totals.pumpRoom    || 0;
  const totalMepCost     = totals.mep         || 0;
  const pipingTotal      = totals.piping      || 0;

  const subTotal   = mainPoolTotal + balanceTankTotal + pumpRoomTotal + totalMepCost + pipingTotal;
  const gstAmt     = subTotal * GST_RATE;
  const grandTotal = subTotal + gstAmt;

  const dimL   = num(dimensions?.length || resultData?.length || 0);
  const dimW   = num(dimensions?.width  || resultData?.width  || 0);
  const dimD   = num(dimensions?.depth  || resultData?.depth  || resultData?.height || 0);
  const volume = dimL * dimW * dimD;

  const docRef = useRef();

  // Print / PDF
  const handlePrint = useCallback(() => {
    const html = docRef.current?.innerHTML || "";
    const w    = window.open("", "_blank", "width=950,height=750");
    w.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8"><title>${piNo}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Source Sans 3',sans-serif;background:#fff;color:#1a202c;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:10.5px;line-height:1.5}
@page{size:A4;margin:9mm 8mm}
h1,h2,h3{font-family:'Playfair Display',serif}
.pi-mono{font-family:'JetBrains Mono',monospace}
table{border-collapse:collapse;width:100%}
.pi-doc{background:#fff}
.pi-doc-header{background:linear-gradient(135deg,#0d2d52 0%,#1a4272 100%);color:#fff;padding:20px 24px 0}
.pi-dh-inner{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:16px}
.pi-dh-logo{width:68px;height:68px;background:linear-gradient(135deg,#c9a84c,#b8932a);border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:24px;color:#1a0e00;font-weight:700;flex-shrink:0}
.pi-logo-img{width:100%;height:100%;object-fit:contain;border-radius:12px}
.pi-dh-brand{display:flex;align-items:center;gap:16px}
.pi-dh-cname{font-family:'Playfair Display',serif;font-size:17px;color:#fff;letter-spacing:.05em;text-transform:uppercase}
.pi-dh-csub{font-size:10px;color:rgba(255,255,255,.5);margin-top:4px}
.pi-dh-center{text-align:center}
.pi-dh-doctype{font-family:'Playfair Display',serif;font-size:22px;color:#fff;letter-spacing:.1em;text-transform:uppercase}
.pi-dh-pooltag{display:inline-block;margin-top:5px;background:rgba(201,168,76,.25);border:1px solid rgba(201,168,76,.5);color:#e8d08a;font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:3px 12px;border-radius:20px}
.pi-dh-meta{text-align:right}
.pi-meta-row{display:flex;justify-content:flex-end;gap:8px;padding:3px 0;font-size:10px}
.pi-meta-k{color:rgba(255,255,255,.5)}.pi-meta-v{color:#e8d08a;font-weight:600}
.pi-stripe{display:flex;height:4px}
.pi-ds-a{flex:1;background:#c9a84c}.pi-ds-b{flex:3;background:#2a5f9e}.pi-ds-c{flex:1;background:#e8d08a}
.pi-parties{display:grid;grid-template-columns:1fr 40px 1fr;gap:0;padding:16px 24px;background:#f7f9fc;border-bottom:1px solid #dce6f0}
.pi-party-card{background:#fff;border:1px solid #dce6f0;border-radius:8px;padding:14px 16px}
.pi-party-badge{display:inline-block;font-size:8px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#fff;background:#0d3b6e;padding:2px 8px;border-radius:20px;margin-bottom:8px}
.pi-badge-accent{background:linear-gradient(135deg,#c9a84c,#b8932a);color:#1a0e00}
.pi-party-name,.pi-client-name{font-family:'Playfair Display',serif;font-size:13px;color:#0d2d52;margin-bottom:5px;font-weight:700}
.pi-party-details p{font-size:11px;color:#4a5568;margin:2px 0}
.pi-gst-tag{font-family:'JetBrains Mono',monospace;font-size:10px;background:#f0f4f8;padding:1px 6px;border-radius:3px;display:inline-block;margin-top:2px}
.pi-parties-arrow{display:flex;align-items:center;justify-content:center;color:#a0aec0;font-size:18px}
.pi-placeholder{color:#a0aec0;font-style:italic;font-size:11px}
.pi-doc-specs{background:linear-gradient(90deg,#0d2d52,#1a4272);padding:12px 24px;border-bottom:2px solid #c9a84c}
.pi-specs-label{font-size:8px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:7px}
.pi-specs-chips{display:flex;flex-wrap:wrap;gap:6px}
.pi-chip{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:3px 10px}
.pi-chip-accent{background:rgba(201,168,76,.18);border-color:rgba(201,168,76,.35)}
.pi-chip-k{font-size:9px;font-weight:600;color:rgba(255,255,255,.45);text-transform:uppercase}
.pi-chip-v{font-size:10.5px;font-weight:600;color:#fff}
.pi-doc-items{padding:14px 24px}
.pi-doc-section{margin-bottom:18px;border:1px solid #dce6f0;border-radius:8px;overflow:hidden}
.pi-doc-sec-head{display:flex;align-items:center;gap:8px;padding:9px 14px;color:#fff}
.pi-doc-sec-title{font-size:11px;font-weight:700;letter-spacing:.04em;flex:1}
.pi-doc-sec-count{font-size:9px;background:rgba(255,255,255,.15);padding:2px 7px;border-radius:20px}
.pi-doc-table{width:100%;border-collapse:collapse;table-layout:fixed}
.pi-doc-table thead tr{background:rgba(13,59,110,.06)}
.pi-doc-table th{padding:8px 10px;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#0d3b6e;text-align:left;border-bottom:2px solid #dce6f0;border-right:1px solid #dce6f0;white-space:nowrap}
.pi-doc-table th:last-child{border-right:none}
.pi-col-sl{width:42px;text-align:center}
.pi-col-unit,.pi-col-qty{width:62px;text-align:center}
.pi-col-rate{width:112px;text-align:right}
.pi-col-amt{width:122px;text-align:right}
.pi-row-even{background:#f9fbfe}.pi-row-odd{background:#fff}
.pi-doc-table td{border-bottom:1px solid #e8eef5;border-right:1px solid #e8eef5}
.pi-doc-table td:last-child{border-right:none}
.pi-doc-table tbody tr:last-child td{border-bottom:none}
.pi-td-sl{text-align:center;font-size:9.5px;color:#718096;padding:8px 10px}
.pi-td-desc{padding:8px 10px;vertical-align:top}
.pi-td-desc-main{font-weight:500;color:#1a202c;font-size:11px;line-height:1.45}
.pi-td-code{font-size:9px;background:#edf2f7;color:#4a5568;padding:1px 5px;border-radius:3px;margin-top:2px;display:inline-block}
.pi-td-center{text-align:center;padding:8px 10px;color:#4a5568;font-size:11px}
.pi-td-num{text-align:right;padding:8px 10px;font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#4a5568}
.pi-td-install{color:#718096!important}
.pi-td-amt{text-align:right;padding:8px 10px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:#0d2d52}
.pi-sec-sub{background:rgba(13,59,110,.06)}
.pi-sub-label{padding:9px 10px;font-size:10px;font-weight:700;text-align:right;color:#0d2d52;letter-spacing:.03em;text-transform:uppercase;border-top:2px solid #dce6f0}
.pi-sub-val{padding:9px 10px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#0d2d52;text-align:right;border-top:2px solid #dce6f0}
.pi-doc-totals-section{display:grid;grid-template-columns:1fr auto;gap:20px;padding:12px 24px 10px;background:#f7f9fc;border-top:1px solid #dce6f0;border-bottom:1px solid #dce6f0}
.pi-breakdown-head{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#718096;margin-bottom:8px}
.pi-bd-row{display:flex;justify-content:space-between;gap:16px;padding:4px 0;font-size:11px;border-bottom:1px dashed #e2e8f0;color:#4a5568}
.pi-bd-amt{font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:500;color:#2d3748}
.pi-doc-totals{min-width:250px;background:#fff;border:1px solid #dce6f0;border-radius:8px;padding:14px 18px}
.pi-tot-row{display:flex;justify-content:space-between;gap:12px;padding:5px 0;font-size:12px;color:#4a5568}
.pi-tot-row span:last-child{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500}
.pi-tot-gst{color:#718096;font-size:11px}
.pi-tot-divider{height:2px;background:linear-gradient(90deg,#c9a84c,#0d3b6e);margin:8px 0;border-radius:2px}
.pi-tot-grand{font-size:14px!important;font-weight:700!important;color:#0d2d52!important}
.pi-tot-grand span:first-child{font-family:'Playfair Display',serif;font-size:13px;color:#0d2d52!important}
.pi-tot-grand span:last-child{font-family:'JetBrains Mono',monospace!important;font-size:14px!important;font-weight:700!important;color:#0d2d52!important}
.pi-doc-words{margin:0 24px 12px;padding:10px 16px;background:#fdf6e3;border:1px solid #e8d9a8;border-left:3px solid #c9a84c;border-radius:5px;font-size:11px}
.pi-words-k{font-weight:700;color:#0d2d52;margin-right:8px;text-transform:uppercase;font-size:9px;letter-spacing:.07em}
.pi-words-v{color:#2d3748;font-style:italic}
.pi-doc-terms{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;padding:10px 24px 12px}
.pi-term-card{background:#f7f9fc;border:1px solid #dce6f0;border-radius:8px;overflow:hidden}
.pi-term-head{padding:7px 14px;background:#0d3b6e;color:rgba(255,255,255,.85);font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.pi-term-body{padding:10px 14px}
.pi-pre{font-family:'Source Sans 3',sans-serif;font-size:10.5px;color:#4a5568;white-space:pre-wrap;line-height:1.6}
.pi-bank-row{display:flex;gap:10px;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:10.5px}
.pi-bank-row:last-child{border-bottom:none}
.pi-bank-k{min-width:90px;color:#718096;font-size:9.5px;text-transform:uppercase;letter-spacing:.03em;font-weight:600}
.pi-bank-v{color:#2d3748;font-weight:600}
.pi-doc-notes{margin:0 24px 10px;padding:10px 14px;background:#f7f9fc;border:1px solid #dce6f0;border-radius:6px;font-size:11px;color:#4a5568}
.pi-notes-head{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#0d3b6e;margin-bottom:6px}
.pi-doc-gt{margin:0 24px 14px;padding:12px 16px;background:#f7f9fc;border:1px solid #dce6f0;border-radius:8px}
.pi-gt-head{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#0d3b6e;margin-bottom:8px}
.pi-gt-ol{padding-left:16px;display:flex;flex-direction:column;gap:4px}
.pi-gt-ol li{font-size:10.5px;color:#4a5568;line-height:1.5}
.pi-doc-footer{background:linear-gradient(135deg,#0d2d52,#1a4272);padding:18px 24px;color:rgba(255,255,255,.7)}
.pi-footer-msg{font-size:11px;font-style:italic;margin-bottom:18px}
.pi-footer-msg strong{color:#fff}
.pi-doc-sigs{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-bottom:18px}
.pi-sig-box{text-align:center}
.pi-sig-space{height:36px}
.pi-sig-line{border-top:1px solid rgba(255,255,255,.2);width:75%;margin:0 auto 8px}
.pi-sig-title{font-size:10.5px;color:rgba(255,255,255,.5)}
.pi-sig-name{font-family:'Playfair Display',serif;font-size:12px;color:#fff;margin:3px 0}
.pi-sig-role{font-size:10px;color:#e8d08a}
.pi-footer-stamp{text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,.3);border-top:1px solid rgba(255,255,255,.08);padding-top:12px}
.pi-overflow-badge,.pi-gutter-badge{display:inline-block;font-size:8px;font-weight:700;padding:1px 6px;border-radius:3px;margin-top:3px}
.pi-overflow-badge{background:#e8f4fd;color:#0d3b6e}
.pi-gutter-badge{background:#fff5e6;color:#b7791f}
</style></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 800);
  }, [piNo, docRef]);

  const selCount   = sk => allLines[sk]?.filter(l => isSel(l._key)).length || 0;
  const totalItems = Object.values(allLines).flat().length;
  const selItems   = Object.values(allLines).flat().filter(l => isSel(l._key)).length;
  const handleClose = () => navigate(-1);

  if (profileLoading) {
    return (
      <div className="pi-root">
        <div className="pi-toolbar">
          <div className="pi-tb-left">
            <button className="pi-tb-close" onClick={handleClose}>✕</button>
            <span className="pi-tb-title">Proforma Invoice</span>
          </div>
        </div>
        <div className="pi-loading">Loading company profile…</div>
      </div>
    );
  }

  return (
    <div className="pi-root">

      {/* TOOLBAR */}
      <div className="pi-toolbar">
        <div className="pi-tb-left">
          <button className="pi-tb-close" onClick={handleClose} title="Close">✕</button>
          <span className="pi-tb-title">Proforma Invoice</span>
          <span className="pi-tb-pino">{piNo}</span>
        </div>
        <div className="pi-tb-tabs">
          <button
            className={`pi-tab ${view === "setup" ? "pi-tab-on" : ""}`}
            onClick={() => setView("setup")}
          >
            <span className="pi-tab-num">①</span> Configure &amp; Select Items
          </button>
          <button
            className={`pi-tab ${view === "preview" ? "pi-tab-on" : ""}`}
            onClick={() => setView("preview")}
          >
            <span className="pi-tab-num">②</span> Preview Invoice
          </button>
        </div>
        <div className="pi-tb-right">
          <button className="pi-btn-print" onClick={handlePrint}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* SETUP PANEL */}
      <div className={`pi-setup ${view !== "setup" ? "pi-hidden" : ""}`}>

        {/* Client + Invoice meta */}
        <div className="pi-s-section">
          <div className="pi-s-section-title">📋 Client &amp; Invoice Details</div>
          <div className="pi-s-grid-2">

            <div className="pi-s-card">
              <div className="pi-s-card-head">Bill To</div>
              <div className="pi-s-card-body">
                <Field label="Client Name">
                  <input type="text" placeholder="Full name / Company" value={cl.name} onChange={e => sc("name", e.target.value)} />
                </Field>
                <Field label="Address">
                  <input type="text" placeholder="Street address" value={cl.address} onChange={e => sc("address", e.target.value)} />
                </Field>
                <div className="pi-f-row-3">
                  <Field label="City"><input type="text" value={cl.city}  onChange={e => sc("city",  e.target.value)} /></Field>
                  <Field label="State"><input type="text" value={cl.state} onChange={e => sc("state", e.target.value)} /></Field>
                  <Field label="PIN"><input   type="text" value={cl.pin}   onChange={e => sc("pin",   e.target.value)} /></Field>
                </div>
                <div className="pi-f-row-2">
                  <Field label="Phone">
                    <input type="text" placeholder="+91 XXXXXXXXXX" value={cl.phone} onChange={e => sc("phone", e.target.value)} />
                  </Field>
                  <Field label="Email">
                    <input type="text" placeholder="email@domain.com" value={cl.email} onChange={e => sc("email", e.target.value)} />
                  </Field>
                </div>
                <div className="pi-f-row-3">
                  <Field label="GSTIN">
                    <input type="text" placeholder="29XXXXX"    value={cl.gstin} onChange={e => sc("gstin", e.target.value)} />
                  </Field>
                  <Field label="PAN">
                    <input type="text" placeholder="ABCDE1234F" value={cl.pan}   onChange={e => sc("pan",   e.target.value)} />
                  </Field>
                  <Field label="TIN No.">
                    <input type="text" placeholder="TIN Number"  value={cl.tinNo} onChange={e => sc("tinNo", e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>

            <div className="pi-s-card">
              <div className="pi-s-card-head">Invoice Details</div>
              <div className="pi-s-card-body">
                <div className="pi-f-static"><span>PI Number</span><strong className="pi-mono">{piNo}</strong></div>
                <div className="pi-f-static"><span>Issue Date</span><strong>{fmtDate(TODAY)}</strong></div>
                <div className="pi-f-static pi-f-highlight"><span>Valid Until</span><strong>{fmtDate(validDate)}</strong></div>
                <div className="pi-f-static"><span>Pool Type</span><strong>{poolLabel}</strong></div>
                <Field label="PO Reference">
                  <input type="text" placeholder="Optional PO number" value={poRef} onChange={e => setPoRef(e.target.value)} />
                </Field>
                <Field label="Payment Terms">
                  <textarea rows={3} value={payTerms} onChange={e => setPayTerms(e.target.value)} />
                </Field>
                <Field label="Delivery Terms">
                  <textarea rows={2} value={delivTerms} onChange={e => setDelivTerms(e.target.value)} />
                </Field>
                <Field label="Additional Notes">
                  <textarea rows={2} placeholder="Any special notes…" value={addNotes} onChange={e => setAddNotes(e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* Item selection */}
        <div className="pi-s-section">
          <div className="pi-s-section-title">☑️ Select Line Items</div>

          <div className="pi-sel-bar">
            <div className="pi-sel-stat">
              <span className="pi-sel-count">{selItems}</span>
              <span className="pi-sel-of"> of {totalItems} items selected</span>
            </div>
            <div className="pi-sel-actions">
              <button className="pi-sab pi-sab-all"  onClick={selectAll}>✓ Select All</button>
              <button className="pi-sab pi-sab-none" onClick={deselectAll}>✗ Clear All</button>
            </div>
          </div>

          {Object.entries(allLines).map(([sk, lines]) => {
            if (!lines.length) return null;
            const meta  = SECTION_META[sk];
            const cnt   = selCount(sk);
            const allOn = lines.every(l => isSel(l._key));
            const secTotal = lines.filter(l => isSel(l._key)).reduce((s, l) => {
              const q   = getQty(l);
              const sup = q * l.rate;
              return s + sup + (l.hasInstall ? sup * INSTALL_PCT : 0);
            }, 0);

            return (
              <div key={sk} className="pi-sel-block">
                <div className="pi-sel-blk-head" style={{ borderLeftColor: meta.color }}>
                  <div className="pi-sbh-left">
                    <button
                      className={`pi-sec-chk ${allOn ? "pi-chk-on" : cnt > 0 ? "pi-chk-part" : ""}`}
                      onClick={() => toggleSection(sk)}
                      title={allOn ? "Deselect section" : "Select section"}
                    >
                      {allOn ? "✓" : cnt > 0 ? "−" : ""}
                    </button>
                    <span className="pi-sec-icon">{meta.icon}</span>
                    <span className="pi-sec-lbl">{meta.label}</span>
                    <span className="pi-sec-badge">{cnt}/{lines.length}</span>
                    {meta.hasInstall && <span className="pi-install-pill">+15% install</span>}
                  </div>
                  <span className="pi-sec-tot">{formatINR(secTotal)}</span>
                </div>

                <div className="pi-sel-tbl-wrap">
                  <table className="pi-sel-tbl">
                    <thead>
                      <tr>
                        <th className="pi-sth pi-sth-chk" />
                        <th className="pi-sth pi-sth-sl">Sl.No</th>
                        <th className="pi-sth pi-sth-desc">Description</th>
                        <th className="pi-sth pi-sth-sm">Unit</th>
                        <th className="pi-sth pi-sth-sm">Qty</th>
                        <th className="pi-sth pi-sth-num">Supply Rate</th>
                        {meta.hasInstall && <th className="pi-sth pi-sth-num">Install</th>}
                        <th className="pi-sth pi-sth-amt">Amount</th>
                       </tr>
                    </thead>
                    <tbody>
                      {lines.map(line => {
                        const sel = isSel(line._key);
                        const q   = getQty(line);
                        const sup = q * line.rate;
                        const ins = line.hasInstall ? sup * INSTALL_PCT : 0;
                        const amt = sup + ins;
                        return (
                          <tr key={line._key} className={`pi-str ${sel ? "" : "pi-str-off"}`}>
                            <td className="pi-stc pi-stc-chk">
                              <button
                                className={`pi-item-chk ${sel ? "pi-item-chk-on" : ""}`}
                                onClick={() => toggleItem(line._key)}
                              >
                                {sel && (
                                  <svg width="10" height="10" viewBox="0 0 12 12">
                                    <polyline points="1,6 4.5,9.5 11,2" stroke="white" strokeWidth="2" fill="none" />
                                  </svg>
                                )}
                              </button>
                             </td>
                            <td className="pi-stc pi-stc-sl">{line.slNo}</td>
                            <td className="pi-stc pi-stc-desc">
                              <div className="pi-std-main">{shortDesc(line.desc, 110) || "—"}</div>
                              {line.code && <span className="pi-std-code">{line.code}</span>}
                              {line.isOverflowGrating && <div className="pi-overflow-badge">Overflow Grating</div>}
                              {line.isGutterDrain     && <div className="pi-gutter-badge">Gutter Drain</div>}
                             </td>
                            <td className="pi-stc pi-stc-ctr">{line.unit || "—"}</td>
                            <td className="pi-stc pi-stc-qty">
                              <input
                                type="number"
                                className="pi-qty-inp"
                                value={q}
                                min="0"
                                step="0.01"
                                disabled={!sel}
                                onChange={e => setQty(line._key, e.target.value)}
                              />
                             </td>
                            <td className="pi-stc pi-stc-num">{formatINR(line.rate)}</td>
                            {line.hasInstall && (
                              <td className="pi-stc pi-stc-num pi-stc-install">
                                {formatINR(line.rate * INSTALL_PCT)}
                               </td>
                            )}
                            <td className={`pi-stc pi-stc-amt ${!sel ? "pi-stc-dim" : ""}`}>
                              {formatINR(amt)}
                             </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          <div className="pi-sel-footer">
            <div className="pi-sel-ftot">
              <div className="pi-sft-row"><span>Sub-Total</span><span className="pi-mono">{formatINR(subTotal)}</span></div>
              <div className="pi-sft-row"><span>GST @ 18%</span><span className="pi-mono">{formatINR(gstAmt)}</span></div>
              <div className="pi-sft-grand"><span>Grand Total</span><span className="pi-mono">{formatINR(grandTotal)}</span></div>
            </div>
            <button className="pi-prev-btn" onClick={() => setView("preview")}>
              Preview Invoice
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* PREVIEW NOTICE */}
      {view === "preview" && (
        <div className="pi-preview-bar">
          <button className="pi-link-btn" onClick={() => setView("setup")}>← Back to item selection</button>
          <span className="pi-preview-hint">Use <strong>Print / Save PDF</strong> in the toolbar to export.</span>
        </div>
      )}

      {/* INVOICE DOCUMENT */}
      <div className={`pi-doc-wrap ${view === "setup" ? "pi-doc-hidden" : ""}`} ref={docRef}>
        <div className="pi-doc">

          {/* Header */}
          <header className="pi-doc-header">
            <div className="pi-dh-inner">
              <div className="pi-dh-brand">
                <div className="pi-dh-logo">
                  {profile.logo_url
                    ? <img
                        src={profile.logo_url.startsWith("http") ? profile.logo_url : `${API_BASE_URL}/${profile.logo_url}`}
                        alt="logo"
                        className="pi-logo-img"
                        onError={e => { e.target.onerror = null; e.target.src = "/INT.png"; }}
                      />
                    : <span>{(profile.company_name || "IT").split(" ").map(w => w[0]).join("").slice(0, 2)}</span>
                  }
                </div>
                <div>
                  <div className="pi-dh-cname">{profile.company_name || "INTELITHON TECHNOLOGIES"}</div>
                  <div className="pi-dh-csub">{profile.website || "www.intelithon.in"}</div>
                </div>
              </div>
              <div className="pi-dh-center">
                <div className="pi-dh-doctype">PROFORMA INVOICE</div>
                <div className="pi-dh-pooltag">{poolLabel} Project</div>
              </div>
              <div className="pi-dh-meta">
                <div className="pi-meta-row"><span className="pi-meta-k">PI No.</span><span className="pi-meta-v pi-mono">{piNo}</span></div>
                <div className="pi-meta-row"><span className="pi-meta-k">Date</span><span className="pi-meta-v">{fmtDate(TODAY)}</span></div>
                <div className="pi-meta-row"><span className="pi-meta-k">Valid</span><span className="pi-meta-v">{fmtDate(validDate)}</span></div>
                {poRef && <div className="pi-meta-row"><span className="pi-meta-k">PO Ref</span><span className="pi-meta-v">{poRef}</span></div>}
              </div>
            </div>
            <div className="pi-stripe">
              <div className="pi-ds-a" /><div className="pi-ds-b" /><div className="pi-ds-c" />
            </div>
          </header>

          {/* Parties */}
          <section className="pi-parties">
            <div className="pi-party-card">
              <div className="pi-party-badge">FROM</div>
              <div className="pi-party-name">{profile.company_name || "Intelithon Technologies"}</div>
              <div className="pi-party-details">
                {profile.address && <p>{profile.address}</p>}
                {profile.phone   && <p>📞 {profile.phone}</p>}
                {profile.email   && <p>✉ {profile.email}</p>}
                {profile.gst     && <p><span className="pi-gst-tag">{profile.gst}</span></p>}
              </div>
            </div>
            <div className="pi-parties-arrow">⇄</div>
            <div className="pi-party-card">
              <div className="pi-party-badge pi-badge-accent">BILL TO</div>
              {cl.name
                ? <div className="pi-client-name">{cl.name}</div>
                : <div className="pi-placeholder">Client Name</div>
              }
              <div className="pi-party-details">
                {cl.company && <p>{cl.company}</p>}
                {cl.address && <p>{cl.address}</p>}
                {(cl.city || cl.state || cl.pin) && <p>{[cl.city, cl.state, cl.pin].filter(Boolean).join(", ")}</p>}
                {cl.phone   && <p>📞 {cl.phone}</p>}
                {cl.email   && <p>✉ {cl.email}</p>}
                {cl.gstin   && <p><span className="pi-gst-tag">GSTIN: {cl.gstin}</span></p>}
                {cl.pan     && <p><span className="pi-gst-tag">PAN: {cl.pan}</span></p>}
                {cl.tinNo   && <p><span className="pi-gst-tag">TIN: {cl.tinNo}</span></p>}
              </div>
            </div>
          </section>

          {/* Specs */}
          <section className="pi-doc-specs">
            <div className="pi-specs-label">Project Specifications</div>
            <div className="pi-specs-chips">
              {dimL > 0 && (
                <div className="pi-chip">
                  <span className="pi-chip-k">Dimensions</span>
                  <span className="pi-chip-v">{dimL}m × {dimW}m × {dimD}m</span>
                </div>
              )}
              {volume > 0 && (
                <div className="pi-chip">
                  <span className="pi-chip-k">Volume</span>
                  <span className="pi-chip-v">{volume.toFixed(2)} m³</span>
                </div>
              )}
              {/* Jacuzzi specific specs */}
              {isJacuzzi && resultData?.water_jets && (
                <div className="pi-chip">
                  <span className="pi-chip-k">Water Jets</span>
                  <span className="pi-chip-v">{resultData.water_jets} jets</span>
                </div>
              )}
              {isJacuzzi && resultData?.air_jets && (
                <div className="pi-chip">
                  <span className="pi-chip-k">Air Controllers</span>
                  <span className="pi-chip-v">{resultData.air_jets} units</span>
                </div>
              )}
              {isJacuzzi && resultData?.seating_capacity && (
                <div className="pi-chip">
                  <span className="pi-chip-k">Seating</span>
                  <span className="pi-chip-v">{resultData.seating_capacity} persons</span>
                </div>
              )}
              {/* Balance tank volume — for overflow, infinity, freeform */}
              {(isOverflow || isInfinity || isFreeform) && resultData?.bt_volume && (
                <div className="pi-chip">
                  <span className="pi-chip-k">Balance Tank</span>
                  <span className="pi-chip-v">{resultData.bt_volume} m³</span>
                </div>
              )}
              {(dynamicRates?.hp || resultData?.hp) && (
                <div className="pi-chip">
                  <span className="pi-chip-k">Pump</span>
                  <span className="pi-chip-v">{dynamicRates?.hp || resultData?.hp} HP</span>
                </div>
              )}
              {(dynamicRates?.filter_dia || resultData?.filter_dia_mm) && (
                <div className="pi-chip">
                  <span className="pi-chip-k">Filter Ø</span>
                  <span className="pi-chip-v">{dynamicRates?.filter_dia || resultData?.filter_dia_mm} mm</span>
                </div>
              )}
              <div className="pi-chip pi-chip-accent">
                <span className="pi-chip-k">Install</span>
                <span className="pi-chip-v">15% on MEP &amp; Piping</span>
              </div>
            </div>
          </section>

          {/* Line Items */}
          <section className="pi-doc-items">
            {Object.entries(activeLines).map(([sk, lines]) => {
              if (!lines.length) return null;
              const meta = SECTION_META[sk];
              if (!meta) return null;
              return (
                <div key={sk} className="pi-doc-section">
                  <div className="pi-doc-sec-head" style={{ background: meta.color }}>
                    <span className="pi-doc-sec-icon">{meta.icon}</span>
                    <span className="pi-doc-sec-title">{meta.label}</span>
                    <span className="pi-doc-sec-count">{lines.length} items</span>
                  </div>
                  <table className="pi-doc-table">
                    <colgroup>
                      <col style={{ width: "42px" }} />
                      <col />
                      <col style={{ width: "64px" }} />
                      <col style={{ width: "64px" }} />
                      <col style={{ width: "112px" }} />
                      {meta.hasInstall && <col style={{ width: "112px" }} />}
                      <col style={{ width: "122px" }} />
                    </colgroup>
                    <thead>
                       <tr>
                        <th className="pi-col-sl">Sl.No</th>
                        <th className="pi-col-desc">Description</th>
                        <th className="pi-col-unit">Unit</th>
                        <th className="pi-col-qty">Qty</th>
                        <th className="pi-col-rate">Supply Rate</th>
                        {meta.hasInstall && <th className="pi-col-rate">Install (15%)</th>}
                        <th className="pi-col-amt">Amount</th>
                       </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, i) => (
                        <tr key={i} className={i % 2 === 0 ? "pi-row-even" : "pi-row-odd"}>
                          <td className="pi-td-sl">{line.slNo}</td>
                          <td className="pi-td-desc">
                            <div className="pi-td-desc-main">{shortDesc(line.desc, 130) || "—"}</div>
                            {line.code && <span className="pi-td-code">{line.code}</span>}
                            {line.isOverflowGrating && (
                              <div className="pi-overflow-badge">Overflow Grating (replaces Skimmer)</div>
                            )}
                            {line.isGutterDrain && (
                              <div className="pi-gutter-badge">Gutter Drain</div>
                            )}
                          </td>
                          <td className="pi-td-center">{line.unit || "—"}</td>
                          <td className="pi-td-center">{line.qty}</td>
                          <td className="pi-td-num">{formatINR(line.rate)}</td>
                          {meta.hasInstall && (
                            <td className="pi-td-num pi-td-install">{formatINR(line.rate * INSTALL_PCT)}</td>
                          )}
                          <td className="pi-td-amt">{formatINR(line.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="pi-sec-sub">
                        <td colSpan={meta.hasInstall ? 6 : 5} className="pi-sub-label">
                          {meta.label} — SUBTOTAL
                        </td>
                                                <td className="pi-sub-val">{formatINR(totals[sk])}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}
          </section>

          {/* Totals */}
          <section className="pi-doc-totals-section">
            <div className="pi-doc-breakdown">
              <div className="pi-breakdown-head">Cost Summary</div>
              {mainPoolTotal > 0 && (
                <div className="pi-bd-row">
                  <span>🏊 Civil — Pool Structure</span>
                  <span className="pi-bd-amt">{formatINR(mainPoolTotal)}</span>
                </div>
              )}
              {(isOverflow || isInfinity || isFreeform) && balanceTankTotal > 0 && (
                <div className="pi-bd-row">
                  <span>⚖️ Civil — Balance Tank</span>
                  <span className="pi-bd-amt">{formatINR(balanceTankTotal)}</span>
                </div>
              )}
              {pumpRoomTotal > 0 && (
                <div className="pi-bd-row">
                  <span>🏗️ Civil — Pump Room</span>
                  <span className="pi-bd-amt">{formatINR(pumpRoomTotal)}</span>
                </div>
              )}
              {totalMepCost > 0 && (
                <div className="pi-bd-row">
                  <span>⚙️ MEP Systems &amp; Equipment</span>
                  <span className="pi-bd-amt">{formatINR(totalMepCost)}</span>
                </div>
              )}
              {pipingTotal > 0 && (
                <div className="pi-bd-row">
                  <span>🔩 Piping System</span>
                  <span className="pi-bd-amt">{formatINR(pipingTotal)}</span>
                </div>
              )}
            </div>
            <div className="pi-doc-totals">
              <div className="pi-tot-row">
                <span>Sub-Total (Excl. GST)</span>
                <span>{formatINR(subTotal)}</span>
              </div>
              <div className="pi-tot-row pi-tot-gst">
                <span>GST @ 18%</span>
                <span>{formatINR(gstAmt)}</span>
              </div>
              <div className="pi-tot-divider" />
              <div className="pi-tot-row pi-tot-grand">
                <span>GRAND TOTAL</span>
                <span>{formatINR(grandTotal)}</span>
              </div>
            </div>
          </section>

          {/* Amount in Words */}
          {grandTotal > 0 && (
            <div className="pi-doc-words">
              <span className="pi-words-k">Amount in Words: </span>
              <span className="pi-words-v">Indian Rupees {toWords(Math.round(grandTotal))}</span>
            </div>
          )}

          {/* Terms */}
          <section className="pi-doc-terms">
            <div className="pi-term-card">
              <div className="pi-term-head">Payment Terms</div>
              <div className="pi-term-body">
                <pre className="pi-pre">{payTerms}</pre>
              </div>
            </div>
            <div className="pi-term-card">
              <div className="pi-term-head">Delivery Terms</div>
              <div className="pi-term-body">
                <pre className="pi-pre">{delivTerms}</pre>
              </div>
            </div>
            <div className="pi-term-card">
              <div className="pi-term-head">Bank Details</div>
              <div className="pi-term-body">
                <div className="pi-bank-row">
                  <span className="pi-bank-k">Account Name</span>
                  <strong className="pi-bank-v">{profile.company_name || "—"}</strong>
                </div>
                <div className="pi-bank-row">
                  <span className="pi-bank-k">Account No.</span>
                  <strong className="pi-bank-v">XXXXXXXXXX</strong>
                </div>
                <div className="pi-bank-row">
                  <span className="pi-bank-k">Bank &amp; Branch</span>
                  <strong className="pi-bank-v">HDFC Bank, Horamavu Agara, Bengaluru – 560043</strong>
                </div>
                <div className="pi-bank-row">
                  <span className="pi-bank-k">IFSC Code</span>
                  <strong className="pi-bank-v">HDFC0XXXXXX</strong>
                </div>
              </div>
            </div>
          </section>

          {/* Additional Notes */}
          {addNotes && (
            <div className="pi-doc-notes">
              <div className="pi-notes-head">Additional Notes</div>
              <div className="pi-notes-body">{addNotes}</div>
            </div>
          )}

          {/* General T&C */}
          <section className="pi-doc-gt">
            <div className="pi-gt-head">General Terms &amp; Conditions</div>
            <ol className="pi-gt-ol">
              <li>All taxes (GST and applicable levies) are additional to quoted amounts.</li>
              <li>Scope: Supply, Installation, Testing &amp; Commissioning of all listed items.</li>
              <li>Quantities may vary ±10–15% subject to actual site conditions.</li>
              <li>Materials dispatched only after PO confirmation and advance payment.</li>
              <li>Client scope: incoming power, conduit runs, backwash drain, pump pedestals, and water/power for T&amp;C.</li>
              <li>Any site-specific changes communicated before commencement of work.</li>
            </ol>
          </section>

          {/* Footer */}
          <footer className="pi-doc-footer">
            <div className="pi-footer-msg">
              Thank you for choosing{" "}
              <strong>{profile.company_name?.trim() || "Intelithon Technologies"}</strong>{" "}
              for your {poolLabel} project.
            </div>
            <div className="pi-doc-sigs">
              <div className="pi-sig-box">
                <div className="pi-sig-space" />
                <div className="pi-sig-line" />
                <div className="pi-sig-title">Authorised Signatory</div>
                <div className="pi-sig-name">Director — Mr. Shreyas R</div>
                <div className="pi-sig-role">{profile.company_name?.trim() || "Intelithon Technologies"}</div>
              </div>
              <div className="pi-sig-box">
                <div className="pi-sig-space" />
                <div className="pi-sig-line" />
                <div className="pi-sig-title">Client Acceptance</div>
                <div className="pi-sig-name">Signature &amp; Stamp</div>
                <div className="pi-sig-role">Date: _______________</div>
              </div>
            </div>
            <div className="pi-footer-stamp">
              {piNo} · Generated {fmtDate(TODAY)} · Page 1 of 1
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="pi-field">
      <label className="pi-field-label">{label}</label>
      {children}
    </div>
  );
}