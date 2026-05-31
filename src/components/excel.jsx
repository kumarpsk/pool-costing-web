import React from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ================================
// PROFESSIONAL COLOR SCHEME
// ================================
const COLORS = {
  primary:      "0B1F5B",
  secondary:    "2F7E8C",
  tableHeader:  "1796BE",
  groupBg:      "1796BE",
  subtotalBg:   "1796BE",
  light:        "FFFFFF",
  highlight:    "F5F7FA",
  border:       "000000",
  headerText:   "FFFFFF",
  text:         "000000",
  grandTotalBg: "0B1F5B",
  totalText:    "FFFFFF",
  sectionBg:    "2F7E8C",
  lightText:    "000000",
};

const INSTALLATION_PERCENT = 0.15;

const DEFAULT_TABLE_SELECTION = {
  mainPool:      true,
  balancingTank: true,
  pumpRoom:      true,
  mep:           true,
  piping:        true,
};

const DEFAULT_COLUMN_VISIBILITY = {
  image:     true,
  unit:      true,
  qty:       true,
  fixedRate: true,
  remarks:   true,
  code:      true,
};

const MEP_INCLUDES_PIPING = true;

// Advanced equipment IDs
const ADVANCED_EQUIPMENT_IDS = [30, 31, 32, 33, 34];

// ================================
// QUANTITY MAP CONSTANTS
// ================================
const MAIN_POOL_QTY_MAP = {
  1:  "EarthExcavation_QTY",
  2:  "BackFilling_QTY",
  3:  "Consolidation_QTY",
  4:  "Disposal_QTY",
  5:  "Soling_QTY",
  6:  "plaincement_QTY",
  7:  "BurntBrick_QTY",
  8:  "steelreinforcement_QTY",
  9:  "Shuttering_QTY",
  10: "shotcreting_QTY",
  11: "WaterProofing_QTY",
  12: "plastering_QTY",
  13: "Coping_QTY",
  14: "Tiling_QTY",
};

const BALANCE_TANK_QTY_MAP = {
  1:  "EarthExcavation_QTY_1",
  2:  "BackFilling_QTY_1",
  3:  "Consolidation_QTY_1",
  4:  "Disposal_QTY_1",
  5:  "Soling_QTY_1",
  6:  "plaincement_QTY_1",
  7:  "BurntBrick_QTY_1",
  8:  "steelreinforcement_QTY_1",
  9:  "Shuttering_QTY_1",
  10: "shotcreting_QTY_1",
  11: "WaterProofing_QTY_1",
  12: "plastering_QTY_1",
};

const PUMP_ROOM_QTY_MAP = {
  1:  "EarthExcavation_QTY_2",
  2:  "BackFilling_QTY_2",
  3:  "Consolidation_QTY_2",
  4:  "Disposal_QTY_2",
  5:  "Soling_QTY_2",
  6:  "plaincement_QTY_2",
  7:  "BurntBrick_QTY_2",
  8:  "steelreinforcement_QTY_2",
  9:  "Shuttering_QTY_2",
  10: "shotcreting_QTY_2",
  11: "WaterProofing_QTY_2",
  12: "plastering_QTY_2",
};

const MEP_QTY_MAP = {
  1:  "Filter_QTY",         2:  "Glass_QTY",          3:  "Pressure_QTY",
  4:  "Filter_Drain_QTY",   5:  "Mpv_QTY",             6:  "Mpv_connset_QTY",
  7:  "Cpump_QTY",          8:  "Return_Inlets_QTY",   9:  "MainDrain_QTY",
  10: "Vaccume_Inlets_QTY", 11: "Skimmer_QTY",         12: "FloatValve_QTY",
  13: "GutterDrain_QTY",    14: "Underwaterlight_QTY", 15: "Transformer_QTY",
  16: "ControlPanel_QTY",   17: "Cables_QTY",          18: "Earthing_QTY",
  19: "ChlorinePump_QTY",   20: "DosingTank_QTY",      21: "Stirrer_QTY",
  22: "FloatingHose_QTY",   23: "Brush_QTY",           24: "Algae_QTY",
  25: "Net_QTY",            26: "Handle_QTY",          27: "VacuumHead_QTY",
  28: "TestKit_QTY",        29: "CurvedBrush_QTY",     30: "HeatPump_QTY",
  31: "PoolHeater_QTY",     32: "Chiller_QTY",         33: "Ozonator_QTY",
  34: "SaltChlorinator_QTY",
};

const JACUZZI_MEP_QTY_MAP = {
  1:  "Filter_QTY",       2:  "Glass_QTY",        3:  "Pressure_QTY",
  4:  "Filter_Drain_QTY", 5:  "Mpv_QTY",          6:  "Mpv_connset_QTY",
  7:  "Cpump_QTY",        8:  "Return_Inlets_QTY", 9:  "MainDrain_QTY",
  10: "Underwaterlight_QTY", 11: "Transformer_QTY", 12: "ControlPanel_QTY",
  13: "Cables_QTY",       14: "Earthing_QTY",      15: "FloatingHose_QTY",
  16: "Brush_QTY",        17: "Algae_QTY",         18: "Net_QTY",
  19: "Handle_QTY",       20: "VacuumHead_QTY",    21: "TestKit_QTY",
  22: "CurvedBrush_QTY",  23: "ChlorinePump_QTY",  24: "DosingTank_QTY",
  25: "Stirrer_QTY",      26: "water_jet_qty",      27: "air_controller_qty",
  28: "jet_pump_qty",     29: "HeatPump_QTY",
};

// ================================
// CIVIL SUB ITEMS
// ================================
const CIVIL_SUB_ITEMS = {
  1: [
    { slNo: "1.1", description: "Excavation up to 1.50m depth",       unit: "Cum" },
    { slNo: "1.2", description: "Excavation from 1.50m to 3.00m depth", unit: "Cum" },
  ],
  9: [
    { slNo: "9.1", description: "Raft",                         unit: "sqm" },
    { slNo: "9.2", description: "Retaining wall/ overflow drain", unit: "sqm" },
  ],
  10: [
    { slNo: "10.1", description: "Raft",             unit: "sqm" },
    { slNo: "10.2", description: "Retaining Wall",   unit: "sqm" },
  ],
};

const PARENT_ITEMS_WITH_SUBROWS = [1, 9, 10];

// ================================
// POOL TYPE HELPERS
// ================================
function normalizePoolType(rawType) {
  const norm = (rawType || "").toLowerCase().trim();
  if (norm === "jacuzzi" || norm === "spa" || norm === "jacuzzi/spa" || norm === "jacuzzi spa") {
    return "jacuzzi";
  }
  return norm;
}

const STANDARD_MEP_UI_MAP  = { 1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,11:11,12:12,13:13,14:14,15:15,16:16,17:17,18:18,19:19,20:20,21:21,22:22,23:23,24:24,25:25,26:26,27:27,28:28,29:29,30:30,31:31,32:32,33:33,34:34 };
const INFINITY_MEP_UI_MAP  = { 1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,12:11,13:12,14:13,15:14,16:15,17:16,18:17,19:18,20:19,21:20,22:21,23:22,24:23,25:24,26:25,27:26,28:27,29:28,30:29,31:30,32:31,33:32,34:33 };
const OVERFLOW_MEP_UI_MAP  = STANDARD_MEP_UI_MAP;
const FREEFORM_MEP_UI_MAP  = STANDARD_MEP_UI_MAP;
const JACUZZI_MEP_UI_MAP   = { 1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,11:11,12:12,13:13,14:14,15:15,16:16,17:17,18:18,19:19,20:20,21:21,22:22,23:23,24:24,25:25,26:26,27:27,28:28,29:29 };

function getMepUiSlNo(slNo, normPT) {
  if (normPT === 'infinity') return INFINITY_MEP_UI_MAP[slNo]  || slNo;
  if (normPT === 'overflow') return OVERFLOW_MEP_UI_MAP[slNo]  || slNo;
  if (normPT === 'freeform' || normPT === 'curved') return FREEFORM_MEP_UI_MAP[slNo] || slNo;
  if (normPT === 'jacuzzi')  return JACUZZI_MEP_UI_MAP[slNo]  || slNo;
  return STANDARD_MEP_UI_MAP[slNo] || slNo;
}

function filterMepItemsByPoolType(items, normPT, hasGutter = false) {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(item => {
    const slNo = item.originalSlNo || item.SlNo;
    if (normPT === 'jacuzzi')  return slNo <= 29;
    if (normPT === 'infinity') return slNo !== 11;
    if (normPT === 'freeform' || normPT === 'curved') {
      if (hasGutter  && slNo === 11) return false;
      if (!hasGutter && slNo === 13) return false;
      return true;
    }
    return true;
  });
}

function shouldShowBalanceTank(normPT, constructionType, hasGutter) {
  if (normPT === 'jacuzzi')  return false;
  if (normPT === 'infinity') return true;
  if (normPT === 'overflow') return true;
  if (normPT === 'freeform' || normPT === 'curved') return hasGutter === true;
  if (normPT === 'skimmer')  return false;
  return false;
}

function getBalanceTankItems(normPT, mainPoolItems, balanceTankItems, hasGutter) {
  if (!mainPoolItems) mainPoolItems = [];
  if (normPT === 'jacuzzi') return [];
  if (normPT === 'infinity' || normPT === 'overflow') {
    if (balanceTankItems && balanceTankItems.length > 0) return balanceTankItems;
    return mainPoolItems.filter(item => item.SlNo <= 12 && BALANCE_TANK_QTY_MAP[item.SlNo]);
  }
  if ((normPT === 'freeform' || normPT === 'curved') && hasGutter) {
    if (balanceTankItems && balanceTankItems.length > 0) return balanceTankItems;
    return mainPoolItems.filter(item => item.SlNo <= 12 && BALANCE_TANK_QTY_MAP[item.SlNo]);
  }
  return [];
}

// ================================
// FORMATTERS
// ================================
function safeNum(v, d = 2) {
  if (v === null || v === undefined || isNaN(v)) return "0." + "0".repeat(d);
  return Number(v).toFixed(d);
}

function cleanNumericValue(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const cleaned = String(value).trim().replace(/\.+$/, '');
  if (cleaned === '' || cleaned === '-') return 0;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function getSmartNumFmt(value) {
  const num = cleanNumericValue(value);
  if (num === 0) return '#,##0';
  if (Math.abs(num - Math.round(num)) < 0.0001) return '#,##0';
  if (Math.abs(num * 10 - Math.round(num * 10)) < 0.001) return '#,##0.0';
  if (Math.abs(num * 100 - Math.round(num * 100)) < 0.001) return '#,##0.00';
  return '#,##0.000';
}

function setNumericCell(cell, value) {
  const num = cleanNumericValue(value);
  cell.value  = num;
  cell.numFmt = getSmartNumFmt(num);
}

function setCurrencyCell(cell, value, numFmt = '₹#,##0.00') {
  const num = cleanNumericValue(value);
  cell.value  = num;
  cell.numFmt = numFmt;
}

// ================================
// UNIVERSAL QUANTITY GETTER
// ================================
const getUniversalQty = ({ item, qtyMap, quantities, resultData, editableQtyMap = {} }) => {
  if (!item || !qtyMap) return 0;
  const slNo = Number(item.SlNo || item.sl_no);
  const qtyField = qtyMap[slNo];
  if (!qtyField) return 0;
  if (editableQtyMap && editableQtyMap[slNo] !== undefined) {
    return cleanNumericValue(editableQtyMap[slNo]);
  }
  if (quantities && quantities[qtyField] !== undefined && quantities[qtyField] !== null) {
    return cleanNumericValue(quantities[qtyField]);
  }
  if (resultData?.civil_quantities && resultData.civil_quantities[qtyField] !== undefined) {
    return cleanNumericValue(resultData.civil_quantities[qtyField]);
  }
  if (resultData && resultData[qtyField] !== undefined) {
    return cleanNumericValue(resultData[qtyField]);
  }
  return 0;
};

// ================================
// ✅ FIXED: getCivilSubRowData
//
// ROOT CAUSE ANALYSIS:
// The backend (overflow.py) stores split data as:
//   civil_quantities.rcc_shuttering_split = { "9.1": 0, "9.2": 300, "10.1": 45.6, "10.2": 180 }
//   civil_quantities.excavation_split     = { "1.1": {...}, "1.2": {...} }
//
// OLD CODE BUGS:
//   1. For parentSlNo=9  → looked for source.raft / source.retaining_wall  (WRONG keys, doesn't exist)
//   2. For parentSlNo=10 → looked for overflowCivil.rcc_split (WRONG key, backend uses rcc_shuttering_split)
//   3. Rate was read from the split data (which is plain numbers = 0 rate always)
//
// FIX:
//   1. Use the subSlNo directly as the key: source["9.2"] = 300
//   2. For parentSlNo=9 and 10: both use rcc_shuttering_split (same source)
//   3. Rate comes from the PARENT ITEM's Rate field, not from the split data
// ================================
const getCivilSubRowData = ({
  resultData,
  civilQuantities,
  parentSlNo,
  subSlNo,
  parentItem = null,
}) => {
  const overflowCivil = civilQuantities || resultData?.civil_quantities || {};

  let qty  = 0;
  let rate = 0;

  // ── EXCAVATION (parent SlNo = 1) ──────────────────────────────
  if (parentSlNo === 1) {
    const excavationSplit =
      overflowCivil?.excavation_split ||
      overflowCivil?.excavation_split_qty ||
      {};

    const rawValue = excavationSplit?.[subSlNo];

    if (rawValue !== null && rawValue !== undefined) {
      if (typeof rawValue === 'object') {
        qty  = cleanNumericValue(rawValue?.qty ?? rawValue?.quantity ?? 0);
        rate = cleanNumericValue(rawValue?.rate ?? 0);
      } else {
        qty  = cleanNumericValue(rawValue);
        rate = 0;
      }
    }

    // Rate fallback: if no rate in split object, use parent item rate
    if (rate === 0 && parentItem) {
      rate = cleanNumericValue(parentItem.calculatedRate ?? parentItem.Rate ?? parentItem.rate ?? 0);
    }
  }

  // ── SHUTTERING (parent SlNo = 9) ─────────────────────────────
  // ✅ FIX: rcc_shuttering_split keys are "9.1" and "9.2" directly
  // ✅ FIX: rate comes from parentItem.Rate (NOT from the split number)
  if (parentSlNo === 9) {
    const shutteringSplit =
      overflowCivil?.rcc_shuttering_split ||
      overflowCivil?.shuttering_split ||
      {};

    // Direct key lookup: shutteringSplit["9.1"] or shutteringSplit["9.2"]
    const rawValue = shutteringSplit?.[subSlNo];

    if (rawValue !== null && rawValue !== undefined) {
      if (typeof rawValue === 'object') {
        qty  = cleanNumericValue(rawValue?.qty ?? rawValue?.quantity ?? 0);
        rate = cleanNumericValue(rawValue?.rate ?? 0);
      } else {
        // Plain number = just the quantity
        qty = cleanNumericValue(rawValue);
      }
    }

    // ✅ FIX: Rate MUST come from parent item — split only stores qty
    if (parentItem) {
      rate = cleanNumericValue(parentItem.calculatedRate ?? parentItem.Rate ?? parentItem.rate ?? 0);
    }
  }

  // ── RCC / SHOTCRETING (parent SlNo = 10) ─────────────────────
  // ✅ FIX: use rcc_shuttering_split (same as SlNo 9's source)
  // ✅ FIX: keys are "10.1" and "10.2" directly
  // ✅ FIX: rate comes from parentItem.Rate
  if (parentSlNo === 10) {
    const rccSplit =
      overflowCivil?.rcc_shuttering_split ||
      overflowCivil?.rcc_split ||
      overflowCivil?.shotcreting_split ||
      {};

    // Direct key lookup: rccSplit["10.1"] or rccSplit["10.2"]
    const rawValue = rccSplit?.[subSlNo];

    if (rawValue !== null && rawValue !== undefined) {
      if (typeof rawValue === 'object') {
        qty  = cleanNumericValue(rawValue?.qty ?? rawValue?.quantity ?? 0);
        rate = cleanNumericValue(rawValue?.rate ?? 0);
      } else {
        // Plain number = just the quantity
        qty = cleanNumericValue(rawValue);
      }
    }

    // ✅ FIX: Rate MUST come from parent item — split only stores qty
    if (parentItem) {
      rate = cleanNumericValue(parentItem.calculatedRate ?? parentItem.Rate ?? parentItem.rate ?? 0);
    }
  }

  return {
    qty,
    rate,
    amount: qty * rate,
  };
};

// ================================
// IMAGE HELPERS
// ================================
function getImageUrl(imageData, baseUrl = '') {
  if (!imageData) return null;
  if (imageData.startsWith('data:image')) return imageData;
  if (imageData.startsWith('http'))       return imageData;
  if (imageData.startsWith('/')) {
    if (typeof window !== 'undefined') return `${window.location.origin}${imageData}`;
    return `${baseUrl}${imageData}`;
  }
  if (typeof window !== 'undefined') return `${window.location.origin}/admin/static/${imageData}`;
  return `${baseUrl}/admin/static/${imageData}`;
}

async function imageToBase64(imageUrl) {
  if (!imageUrl) return null;
  try {
    if (imageUrl.startsWith('data:image')) return imageUrl.split(',')[1];
    const url = getImageUrl(imageUrl);
    if (!url) return null;
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') resolve(reader.result.split(',')[1]);
        else resolve(null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function loadLogoAsBase64(logoUrl) {
  if (!logoUrl) return null;
  try {
    const BACKEND = 'https://pool-costing-api.intelithon.in';
    let fullUrl = logoUrl;
    if (!fullUrl.startsWith('http')) {
      const clean = fullUrl.startsWith('/') ? fullUrl.substring(1) : fullUrl;
      fullUrl = `${BACKEND}/${clean}`;
    }
    const response = await fetch(fullUrl, { method: 'GET', cache: 'no-cache' });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function loadStampAsBase64(stampUrl) {
  if (!stampUrl) return null;
  try {
    const BACKEND = 'https://pool-costing-api.intelithon.in';
    let fullUrl = stampUrl;
    if (!fullUrl.startsWith('http')) {
      const clean = fullUrl.startsWith('/') ? fullUrl.substring(1) : fullUrl;
      fullUrl = `${BACKEND}/${clean}`;
    }
    const response = await fetch(fullUrl, { method: 'GET', cache: 'no-cache' });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

const shouldUseLargePoolImages = (dimensions) => {
  if (!dimensions) return false;
  return (
    Number(dimensions?.length || 0) *
    Number(dimensions?.width  || 0) *
    Number(dimensions?.depth  || 0)
  ) >= 500;
};

const getExcelMepImage = (item, dimensions) => {
  if (!shouldUseLargePoolImages(dimensions))
    return item?.Image || item?.image || null;
  const slNo = Number(item?.SlNo || item?.sl_no || 0);
  const imageMap = { 1: "/filter1.png", 5: "/mpv1.png", 7: "/pump1.png", 9: "/md1.png", 13: "/gutter1.png", 19: "/dosing1.png" };
  return imageMap[slNo] || item?.Image || item?.image || null;
};

// ================================
// DEFAULT COMPANY PROFILE
// ================================
const DEFAULT_COMPANY_PROFILE = {
  company_name:  "INTELITHON TECHNOLOGIES",
  company_code:  "INT",
  director_name: "",
  address:  "No. 1, 1st Floor, Deepa Towers, Esther Enclave, Horamavu, Bangalore, Karnataka - 560043",
  phone:    "+91 1234567890",
  email:    "info@intelithon.com",
  website:  "www.intelithon.com",
  logo_url:  null,
  stamp_url: null,
  gst: "GSTIN: 33AABCA1234B1Z5",
  pan: "",
};

// ================================
// STYLE SYSTEM
// ================================
const S = {
  fill: (hex) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${hex}` } }),
  font: (sz = 11, bold = false, color = COLORS.text, name = 'Arial') =>
    ({ name, size: sz, bold, color: { argb: `FF${color}` } }),
  border: (style = 'thin') => {
    const b = { style, color: { argb: `FF${COLORS.border}` } };
    return { top: b, left: b, bottom: b, right: b };
  },
  noBorder: () => {
    const b = { style: 'none' };
    return { top: b, left: b, bottom: b, right: b };
  },
  align: (h = 'left', v = 'middle', wrap = false) => ({ horizontal: h, vertical: v, wrapText: wrap }),
};

function applyCell(cell, {
  fill = COLORS.light, fontSize = 11, bold = false,
  color = COLORS.text, h = 'left', v = 'middle',
  wrap = false, borders = true, italic = false,
}) {
  cell.fill      = S.fill(fill);
  cell.font      = { ...S.font(fontSize, bold, color), italic };
  cell.alignment = S.align(h, v, wrap);
  cell.border    = borders ? S.border('thin') : S.noBorder();
}

function mc(sheet, r1, r2, c1, c2) {
  const L = (n) => String.fromCharCode(64 + n);
  sheet.mergeCells(`${L(c1)}${r1}:${L(c2)}${r2}`);
}

// ================================
// ✅ FULLY FIXED: CIVIL TABLE BUILDER
//
// All three bugs fixed:
//  BUG 1 (9.2 rate=0):  getCivilSubRowData now reads rate from parentItem.Rate
//  BUG 2 (10.x qty=0):  getCivilSubRowData now reads rcc_shuttering_split with direct key "10.1"/"10.2"
//  BUG 3 (10.x rate=0): getCivilSubRowData now reads rate from parentItem.Rate for SlNo 10 too
// ================================
async function buildCivilTable(
  sheet,
  startRow,
  title,
  items,
  remarks,
  colVis,
  quantityMap,
  subQuantityMap,
  quantitiesData,
  resultData,
  editableCivilQty = {},
  editableBalanceQty = {},
  editablePumpRoomQty = {},
  editableSubRowQty = {},
  isBalanceTank = false,
  isPumpRoom = false,
  dimensions = null
) {
  if (!items || items.length === 0) return { currentRow: startRow };
  let row = startRow;

  // Section title
  mc(sheet, row, row, 1, 11);
  let c = sheet.getCell(`A${row}`);
  c.value = title;
  applyCell(c, { fill: "FFFFFF", fontSize: 13, bold: true, color: "000000", h: 'center' });
  sheet.getRow(row).height = 20;
  row++;

  // Header row
  const hDefs = [
    [1, 'Sl.No'], [2, 'Code'], [3, 'Description'], [4, 'Image'],
    [5, 'Unit'],  [6, 'Qty'],  [7, 'Rate'],         [8, 'Amount'],
  ];
  hDefs.forEach(([col, label]) => {
    const cell = sheet.getCell(row, col);
    cell.value = label;
    applyCell(cell, { fill: "FFFFFF", fontSize: 10, bold: true, color: "000000", h: 'center' });
  });
  mc(sheet, row, row, 9, 11);
  const rhCell = sheet.getCell(row, 9);
  rhCell.value = 'Remarks';
  applyCell(rhCell, { fill: "FFFFFF", fontSize: 10, bold: true, color: "000000", h: 'center' });
  sheet.getRow(row).height = 20;
  row++;

  const imgPromises = [];
  const civilData   = quantitiesData || resultData?.civil_quantities || {};
  let   sectionSubtotal = 0;

  // Row renderer
  const renderRow = async (item, idx, isSubItem = false, customQty = null, customRate = null) => {
    const bg          = idx % 2 === 0 ? COLORS.light : COLORS.highlight;
    const displaySlNo = item.displaySlNo || (isSubItem ? item.slNo : String(idx + 1));
    const desc        = item.actualDescription || item.Description || '';
    const slNo        = item.originalSlNo || item.SlNo;

    let qty = 0, rate = 0, amt = 0;

    if (isSubItem) {
      qty  = customQty  !== null ? cleanNumericValue(customQty)  : 0;
      rate = customRate !== null ? cleanNumericValue(customRate) : 0;
      amt  = qty * rate;
      sectionSubtotal += amt;
    } else {
      if (PARENT_ITEMS_WITH_SUBROWS.includes(Number(slNo)) && !isBalanceTank && !isPumpRoom) {
        // Parent row with subrows — blank qty/rate/amount
        qty = -1; rate = -1; amt = -1;
      } else {
        qty = getUniversalQty({
          item,
          qtyMap: quantityMap,
          quantities: civilData,
          resultData,
          editableQtyMap: isBalanceTank ? editableBalanceQty : isPumpRoom ? editablePumpRoomQty : editableCivilQty,
        });
        rate = cleanNumericValue(item.calculatedRate ?? item.Rate ?? item.rate);
        amt  = qty * rate;
        sectionSubtotal += amt;
      }
    }

    const code = item.actualCode  || item.Code  || '';
    const unit = item.actualUnit  || item.Unit  || '';
    const img  = (!isSubItem) ? (item.actualImage || item.Image || item.image || null) : null;
    const rh   = row;

    let cell;
    cell = sheet.getCell(rh, 1); cell.value = displaySlNo; applyCell(cell, { fill: bg, h: 'center' });
    cell = sheet.getCell(rh, 2); cell.value = colVis.code ? code : ''; applyCell(cell, { fill: bg, h: 'center', fontSize: 10 });
    cell = sheet.getCell(rh, 3); cell.value = isSubItem ? `    ${desc}` : desc; applyCell(cell, { fill: bg, wrap: true, v: 'top', fontSize: isSubItem ? 10 : 11 });
    cell = sheet.getCell(rh, 4); cell.value = ''; applyCell(cell, { fill: bg, h: 'center', v: 'middle' });
    cell = sheet.getCell(rh, 5); cell.value = colVis.unit ? unit : ''; applyCell(cell, { fill: bg, h: 'center' });

    cell = sheet.getCell(rh, 6);
    if (qty === -1)            { cell.value = ''; applyCell(cell, { fill: bg, h: 'center' }); }
    else if (colVis.qty)       { setNumericCell(cell, qty); applyCell(cell, { fill: bg, h: 'center' }); }
    else                       { cell.value = ''; applyCell(cell, { fill: bg, h: 'center' }); }

    cell = sheet.getCell(rh, 7);
    if (rate === -1)            { cell.value = ''; applyCell(cell, { fill: bg, h: 'right' }); }
    else if (colVis.fixedRate)  { setCurrencyCell(cell, rate, '₹#,##0.00'); applyCell(cell, { fill: bg, h: 'right' }); }
    else                        { cell.value = ''; applyCell(cell, { fill: bg, h: 'right' }); }

    cell = sheet.getCell(rh, 8);
    if (amt === -1) { cell.value = ''; applyCell(cell, { fill: bg, h: 'right' }); }
    else            { setCurrencyCell(cell, amt, '₹#,##0.00'); applyCell(cell, { fill: bg, h: 'right' }); }

    mc(sheet, rh, rh, 9, 11);
    cell = sheet.getCell(rh, 9);
    cell.value = colVis.remarks ? (remarks[slNo] || remarks[item.slNo] || '') : '';
    applyCell(cell, { fill: bg, wrap: true, v: 'top', fontSize: 10, color: COLORS.lightText });

    const lines       = Math.max(Math.ceil(desc.length / 55), 1);
    const rowHeightPx = img
      ? Math.max(72, 18 + lines * 14)
      : (isSubItem ? 30 : Math.max(35, 18 + lines * 14));
    sheet.getRow(rh).height = rowHeightPx;

    if (colVis.image && img) {
      imgPromises.push((async () => {
        try {
          const b64 = await imageToBase64(img);
          if (!b64) return;
          const imgId         = sheet.workbook.addImage({ base64: b64, extension: 'png' });
          const imgHeightPx   = 58;
          const rowHeightPts  = rowHeightPx * 0.75;
          const topPaddingPts = (rowHeightPts - imgHeightPx * 0.75) / 2;
          const rowFraction   = topPaddingPts / rowHeightPts;
          sheet.addImage(imgId, {
            tl: { col: 3.25, row: rh - 1 + rowFraction },
            ext: { width: 58, height: 58 },
            editAs: 'oneCell',
          });
        } catch {}
      })());
    }

    row++;
    return { row };
  };

  // Render items with subrow hierarchy
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const slNo = item.originalSlNo || item.SlNo;

    if (
      PARENT_ITEMS_WITH_SUBROWS.includes(Number(slNo)) &&
      !isBalanceTank &&
      !isPumpRoom
    ) {
      // ── PARENT ROW (blank qty/rate/amount) ──
      await renderRow(item, idx, false);

      // ── SUB ROWS ──
      const subRows = CIVIL_SUB_ITEMS[Number(slNo)] || [];

      for (let subIdx = 0; subIdx < subRows.length; subIdx++) {
        const subDef = subRows[subIdx];

        // ✅ FIXED: Check editableSubRowQty first, then call fixed getCivilSubRowData
        // Pass parentItem so getCivilSubRowData can read the rate from it
        const editedQty = editableSubRowQty?.[subDef.slNo];

        const subData = getCivilSubRowData({
          resultData,
          civilQuantities: civilData,
          parentSlNo: Number(slNo),
          subSlNo:    subDef.slNo,
          parentItem: item,   // ✅ NEW: pass parent for rate lookup
        });

        const finalQty  = editedQty !== undefined ? cleanNumericValue(editedQty) : subData.qty;
        const finalRate = subData.rate;

        console.log(`✅ EXCEL SUB ROW ${subDef.slNo}: qty=${finalQty}, rate=${finalRate}, amount=${finalQty * finalRate}`);

        const subItem = {
          ...item,
          slNo:               subDef.slNo,
          originalSlNo:       subDef.slNo,
          Description:        subDef.description,
          actualDescription:  subDef.description,
          Unit:               subDef.unit,
          actualUnit:         subDef.unit,
          displaySlNo:        subDef.slNo,
          actualCode:         item.Code || '',
          isSubItem:          true,
        };

        await renderRow(subItem, subIdx, true, finalQty, finalRate);
      }
    } else {
      // Normal row (no subrows)
      await renderRow(item, idx, false);
    }
  }

  await Promise.allSettled(imgPromises);

  // Subtotal row
  mc(sheet, row, row, 1, 7);
  c = sheet.getCell(`A${row}`);
  c.value = `${title} — SUBTOTAL`;
  applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: 'right', fontSize: 11, color: COLORS.headerText });

  c = sheet.getCell(`H${row}`);
  setCurrencyCell(c, sectionSubtotal, '₹#,##0.00');
  applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: 'right', fontSize: 11, color: COLORS.headerText });

  mc(sheet, row, row, 9, 11);
  c = sheet.getCell(`I${row}`);
  c.value = '';
  applyCell(c, { fill: COLORS.subtotalBg });
  sheet.getRow(row).height = 20;
  row += 1;

  return { currentRow: row, subtotal: sectionSubtotal };
}

// ================================
// MEP TABLE BUILDER
// ================================
async function buildMEPTable(
  sheet,
  startRow,
  title,
  items,
  colVis,
  mepQuantities,
  editableMepQty = {},
  dynamicRates,
  resultData,
  normPT = 'freeform',
  hasGutter = false,
  dimensions = null
) {
  if (!items || items.length === 0) return { currentRow: startRow };
  let row = startRow;
  const COLS = 11;

  mc(sheet, row, row, 1, COLS);
  let c = sheet.getCell(`A${row}`);
  c.value = title;
  applyCell(c, { fill: "FFFFFF", fontSize: 12, bold: true, color: "000000", h: 'center' });
  sheet.getRow(row).height = 20;
  row++;

  const h1 = ['Sl.No', 'Code', 'Description', 'Image', 'Unit', 'Qty', 'Rate (₹)', '', 'Amount (₹)', '', ''];
  h1.forEach((val, i) => {
    const cell = sheet.getCell(row, i + 1);
    cell.value = val;
    applyCell(cell, { fill: "FFFFFF", fontSize: 10, bold: true, color: "000000", h: 'center' });
  });
  mc(sheet, row, row, 7, 8);
  mc(sheet, row, row, 9, 11);
  sheet.getRow(row).height = 20;
  row++;

  const h2 = ['', '', '', '', '', '', 'Supply', 'Installation', 'Supply', 'Installation', 'Total'];
  h2.forEach((val, i) => {
    const cell = sheet.getCell(row, i + 1);
    cell.value = val;
    applyCell(cell, { fill: "FFFFFF", fontSize: 9, bold: true, color: "000000", h: 'center' });
  });
  sheet.getRow(row).height = 20;
  row++;

  const imgPromises   = [];
  const isOverflow    = normPT === 'overflow';
  const isInfinity    = normPT === 'infinity';
  const isFreeform    = normPT === 'freeform' || normPT === 'curved';
  const isJacuzzi     = normPT === 'jacuzzi';

  let supplySubtotal  = 0;
  let installSubtotal = 0;
  let totalSubtotal   = 0;

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (!item) continue;
    const bg   = idx % 2 === 0 ? COLORS.light : COLORS.highlight;
    const slNo = item.originalSlNo || item.SlNo;

    let desc = item.renderedDescription || item.actualDescription || item.Description || "";
    let unit = item.actualUnit || item.Unit || '';
    const uiSlNo      = getMepUiSlNo(slNo, normPT);
    const displaySlNo = item.displaySlNo || uiSlNo;

    let qty = getUniversalQty({
      item,
      qtyMap: isJacuzzi ? JACUZZI_MEP_QTY_MAP : MEP_QTY_MAP,
      quantities: mepQuantities,
      resultData,
      editableQtyMap: editableMepQty,
    });

    if (isOverflow && slNo === 11) {
      const pl = cleanNumericValue(resultData?.length || resultData?.pool_dimensions?.length || resultData?.dimensions?.length);
      const pw = cleanNumericValue(resultData?.width  || resultData?.pool_dimensions?.width  || resultData?.dimensions?.width);
      qty  = 2 * (pl + pw);
      desc = "Overflow Grating – Durable, anti-slip cover installed along the overflow channel perimeter.";
      unit = "RMT";
    } else if (isFreeform) {
      if (hasGutter && slNo === 11)  { qty = 0; desc = '❌ Skimmer (HIDDEN – Gutter system enabled)'; }
      else if (!hasGutter && slNo === 13) { qty = 0; desc = '❌ Gutter Drain (HIDDEN – No gutter system)'; }
      else if (hasGutter && slNo === 13) { desc = 'Gutter Drain – Full perimeter drainage system'; }
      else if (!hasGutter && slNo === 11) { desc = 'Skimmer – Standard pool skimmer for surface debris collection'; }
    } else if (isJacuzzi) {
      if (slNo === 26) desc = desc || 'Water Jets';
      if (slNo === 27) desc = desc || 'Air Controller';
      if (slNo === 28) desc = desc || 'Jet Pump';
    }

    const filterDia = resultData?.filter_dia_mm || resultData?.system_parameters?.filter_dia_mm || dynamicRates?.filter_dia_mm || dynamicRates?.filter_dia || "";
    const mpvSize   = resultData?.mpv_size || resultData?.system_parameters?.mpv_size || dynamicRates?.mpv_size || "";
    const flowRate  = resultData?.flowrate_m3 || resultData?.system_parameters?.flowrate_m3 || resultData?.flow_rate_m3_per_hr || dynamicRates?.flowrate_m3 || "";

    if (slNo === 1) {
      const preResolvedDesc = resultData?.filter_description || resultData?.dynamicRates?.filter_description || dynamicRates?.filter_description || "";
      if (preResolvedDesc && preResolvedDesc.length > 15 && !preResolvedDesc.includes('{{')) {
        desc = preResolvedDesc;
      } else {
        desc = `Filter – Dia ${filterDia} mm with clamp lid and ${mpvSize} connections. Manufactured from high-grade FRP/GRP material, complete with pressure gauge, manual air release valve, drain plug and internal distribution system consisting of laterals and diffuser made of UPVC/Polypropylene. Suitable for maximum working pressure and designed for a filtration rate of ${flowRate} m³/hr.`;
      }
    }

    if (slNo === 7) {
      const preResolvedPumpDesc = resultData?.pump_description || resultData?.dynamicRates?.pump_description || dynamicRates?.pump_description || "";
      if (preResolvedPumpDesc && preResolvedPumpDesc.length > 15 && !preResolvedPumpDesc.includes('{{')) {
        desc = preResolvedPumpDesc;
      } else {
        const hp = resultData?.hp || resultData?.system_parameters?.hp || resultData?.system_parameters?.pump_hp || resultData?.pump_hp || dynamicRates?.hp || "";
        if (hp) desc = `${desc} (${hp} HP)`;
        if (flowRate) desc = desc.replace(/{{flowrate_m3}}/g, flowRate);
      }
    }

    desc = desc
      .replace(/{{filter_dia_mm}}/g, filterDia)
      .replace(/{{mpv_size}}/g,      mpvSize)
      .replace(/{{flowrate_m3}}/g,   flowRate)
      .replace(/{{hp}}/g, resultData?.hp || resultData?.system_parameters?.hp || resultData?.pump_hp || dynamicRates?.hp || "");

    let rate = cleanNumericValue(item.calculatedRate || item.Rate || item.rate);
    if (slNo === 1 && dynamicRates?.filter_rate > 0) rate = cleanNumericValue(dynamicRates.filter_rate);
    if (slNo === 7 && dynamicRates?.pump_rate  > 0) rate = cleanNumericValue(dynamicRates.pump_rate);
    if (isOverflow && slNo === 11) rate = cleanNumericValue(dynamicRates?.grating_rate || 1850);

    const supplyRate  = rate;
    const installRate = rate * INSTALLATION_PERCENT;
    const supplyAmt   = qty * supplyRate;
    const installAmt  = qty * installRate;
    const totalAmt    = supplyAmt + installAmt;

    supplySubtotal  += supplyAmt;
    installSubtotal += installAmt;
    totalSubtotal   += totalAmt;

    const rh   = row;
    const code = item.actualCode || item.Code || '';
    const img  = getExcelMepImage(item, dimensions);

    let cell;
    cell = sheet.getCell(rh, 1);  cell.value = displaySlNo; applyCell(cell, { fill: bg, h: 'center' });
    cell = sheet.getCell(rh, 2);  cell.value = colVis.code ? code : ''; applyCell(cell, { fill: bg, h: 'center', fontSize: 10 });
    cell = sheet.getCell(rh, 3);  cell.value = desc; applyCell(cell, { fill: bg, wrap: true, v: 'top' });
    cell = sheet.getCell(rh, 4);  cell.value = ''; applyCell(cell, { fill: bg, h: 'center', v: 'middle' });
    cell = sheet.getCell(rh, 5);  cell.value = colVis.unit ? unit : ''; applyCell(cell, { fill: bg, h: 'center' });
    cell = sheet.getCell(rh, 6);  setNumericCell(cell, qty); applyCell(cell, { fill: bg, h: 'center' });
    cell = sheet.getCell(rh, 7);  setCurrencyCell(cell, supplyRate, '₹#,##0.00'); applyCell(cell, { fill: bg, h: 'right' });
    cell = sheet.getCell(rh, 8);  setCurrencyCell(cell, installRate, '₹#,##0.00'); applyCell(cell, { fill: bg, h: 'right' });
    cell = sheet.getCell(rh, 9);  setCurrencyCell(cell, supplyAmt, '₹#,##0.00'); applyCell(cell, { fill: bg, h: 'right' });
    cell = sheet.getCell(rh, 10); setCurrencyCell(cell, installAmt, '₹#,##0.00'); applyCell(cell, { fill: bg, h: 'right' });
    cell = sheet.getCell(rh, 11); setCurrencyCell(cell, totalAmt, '₹#,##0.00'); applyCell(cell, { fill: bg, h: 'right', bold: true });

    const lines       = Math.max(Math.ceil(desc.length / 55), 1);
    const rowHeightPx = img ? Math.max(72, 18 + lines * 14) : Math.max(35, 18 + lines * 14);
    sheet.getRow(rh).height = rowHeightPx;

    if (colVis.image && img) {
      imgPromises.push((async () => {
        try {
          const b64 = await imageToBase64(img);
          if (!b64) return;
          const imgId        = sheet.workbook.addImage({ base64: b64, extension: 'png' });
          const imgHeightPx  = 58;
          const rowHeightPts = rowHeightPx * 0.75;
          const topPadPts    = (rowHeightPts - imgHeightPx * 0.75) / 2;
          const rowFraction  = topPadPts / rowHeightPts;
          sheet.addImage(imgId, {
            tl: { col: 3.25, row: rh - 1 + rowFraction },
            ext: { width: 58, height: 58 },
            editAs: 'oneCell',
          });
        } catch {}
      })());
    }
    row++;
  }

  await Promise.allSettled(imgPromises);

  mc(sheet, row, row, 1, 6);
  c = sheet.getCell(`A${row}`);
  c.value = `${title} — SUBTOTAL`;
  applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: 'right', fontSize: 11, color: COLORS.headerText });
  c = sheet.getCell(`G${row}`); setCurrencyCell(c, supplySubtotal,  '₹#,##0.00'); applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: 'right', fontSize: 10, color: COLORS.primary });
  c = sheet.getCell(`H${row}`); setCurrencyCell(c, installSubtotal, '₹#,##0.00'); applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: 'right', fontSize: 10, color: COLORS.primary });
  c = sheet.getCell(`K${row}`); setCurrencyCell(c, totalSubtotal,   '₹#,##0.00'); applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: 'right', fontSize: 11, color: COLORS.primary });
  for (let col = 9; col <= 10; col++) { c = sheet.getCell(row, col); c.value = ''; applyCell(c, { fill: COLORS.subtotalBg }); }
  sheet.getRow(row).height = 20;
  row += 1;

  return { currentRow: row, subtotal: totalSubtotal };
}

// ================================
// PIPING TABLE BUILDER
// ================================
async function buildPipingTable(sheet, startRow, title, items, colVis, editablePipingQty = {}) {
  if (!items || items.length === 0) return { currentRow: startRow };
  let row = startRow;
  const COLS = 11;

  mc(sheet, row, row, 1, COLS);
  let c = sheet.getCell(`A${row}`);
  c.value = title;
  applyCell(c, { fill: "FFFFFF", fontSize: 12, bold: true, color: "000000", h: 'center' });
  sheet.getRow(row).height = 20;
  row++;

  const h1 = ['Sl.No', 'Code', 'Description', 'Image', 'Unit', 'Qty', 'Rate (₹)', '', 'Amount (₹)', '', ''];
  h1.forEach((val, i) => {
    const cell = sheet.getCell(row, i + 1);
    cell.value = val;
    applyCell(cell, { fill: "FFFFFF", fontSize: 10, bold: true, color: "000000", h: 'center' });
  });
  mc(sheet, row, row, 7, 8);
  mc(sheet, row, row, 9, 11);
  sheet.getRow(row).height = 20;
  row++;

  const h2 = ['', '', '', '', '', '', 'Supply', 'Installation', 'Supply', 'Installation', 'Total'];
  h2.forEach((val, i) => {
    const cell = sheet.getCell(row, i + 1);
    cell.value = val;
    applyCell(cell, { fill: "FFFFFF", fontSize: 9, bold: true, color: "000000", h: 'center' });
  });
  sheet.getRow(row).height = 20;
  row++;

  const imgPromises   = [];
  let supplySubtotal  = 0;
  let installSubtotal = 0;
  let totalSubtotal   = 0;

  items.forEach((item, idx) => {
    if (!item) return;
    const bg          = idx % 2 === 0 ? COLORS.light : COLORS.highlight;
    const displaySlNo = item.displaySlNo || (idx + 1);
    const desc        = item.description || item.Description || '';
    const finalQty    = editablePipingQty?.[item.sl_no] !== undefined
      ? cleanNumericValue(editablePipingQty[item.sl_no])
      : cleanNumericValue(item.qty ?? item.Qty ?? item.quantity ?? item.Quantity ?? 0);
    const rate        = cleanNumericValue(item.rate || item.Rate || 0);
    const supplyRate  = rate;
    const installRate = rate * INSTALLATION_PERCENT;
    const supplyAmt   = finalQty * supplyRate;
    const installAmt  = finalQty * installRate;
    const rowTotal    = supplyAmt + installAmt;

    supplySubtotal  += supplyAmt;
    installSubtotal += installAmt;
    totalSubtotal   += rowTotal;

    const code = item.code || item.Code || '';
    const unit = item.unit || item.Unit || '';
    const img  = item.image || item.Image || null;
    const rh   = row;

    let cell;
    cell = sheet.getCell(rh, 1);  cell.value = displaySlNo; applyCell(cell, { fill: bg, h: 'center' });
    cell = sheet.getCell(rh, 2);  cell.value = colVis.code ? code : ''; applyCell(cell, { fill: bg, h: 'center', fontSize: 10 });
    cell = sheet.getCell(rh, 3);  cell.value = desc; applyCell(cell, { fill: bg, wrap: true, v: 'top' });
    cell = sheet.getCell(rh, 4);  cell.value = ''; applyCell(cell, { fill: bg, h: 'center', v: 'middle' });
    cell = sheet.getCell(rh, 5);  cell.value = colVis.unit ? unit : ''; applyCell(cell, { fill: bg, h: 'center' });
    cell = sheet.getCell(rh, 6);
    if (colVis.qty) { setNumericCell(cell, finalQty); applyCell(cell, { fill: bg, h: 'center' }); }
    else            { cell.value = ''; applyCell(cell, { fill: bg, h: 'center' }); }
    cell = sheet.getCell(rh, 7);
    if (colVis.fixedRate) { setCurrencyCell(cell, supplyRate, '₹#,##0.00'); applyCell(cell, { fill: bg, h: 'right' }); }
    else                  { cell.value = ''; applyCell(cell, { fill: bg, h: 'right' }); }
    cell = sheet.getCell(rh, 8);  setCurrencyCell(cell, installRate, '₹#,##0.00'); applyCell(cell, { fill: bg, h: 'right' });
    cell = sheet.getCell(rh, 9);  setCurrencyCell(cell, supplyAmt,   '₹#,##0.00'); applyCell(cell, { fill: bg, h: 'right' });
    cell = sheet.getCell(rh, 10); setCurrencyCell(cell, installAmt,  '₹#,##0.00'); applyCell(cell, { fill: bg, h: 'right' });
    cell = sheet.getCell(rh, 11); setCurrencyCell(cell, rowTotal,    '₹#,##0.00'); applyCell(cell, { fill: bg, h: 'right', bold: true });

    const lines       = Math.max(Math.ceil(desc.length / 55), 1);
    const rowHeightPx = img ? Math.max(78, 20 + lines * 14) : Math.max(35, 20 + lines * 14);
    sheet.getRow(rh).height = rowHeightPx;

    if (colVis.image && img) {
      imgPromises.push((async () => {
        try {
          const b64 = await imageToBase64(img);
          if (!b64) return;
          const imgId        = sheet.workbook.addImage({ base64: b64, extension: 'png' });
          const imgHeightPx  = 58;
          const rowHeightPts = rowHeightPx * 0.75;
          const topPadPts    = (rowHeightPts - imgHeightPx * 0.75) / 2;
          const rowFraction  = topPadPts / rowHeightPts;
          sheet.addImage(imgId, {
            tl: { col: 3.25, row: rh - 1 + rowFraction },
            ext: { width: 58, height: 58 },
            editAs: 'oneCell',
          });
        } catch {}
      })());
    }
    row++;
  });

  await Promise.allSettled(imgPromises);

  mc(sheet, row, row, 1, 6);
  c = sheet.getCell(`A${row}`);
  c.value = `${title} — SUBTOTAL`;
  applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: 'right', fontSize: 11, color: COLORS.headerText });
  c = sheet.getCell(`G${row}`); setCurrencyCell(c, supplySubtotal,  '₹#,##0.00'); applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: 'right', fontSize: 10, color: COLORS.primary });
  c = sheet.getCell(`H${row}`); setCurrencyCell(c, installSubtotal, '₹#,##0.00'); applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: 'right', fontSize: 10, color: COLORS.primary });
  c = sheet.getCell(`K${row}`); setCurrencyCell(c, totalSubtotal,   '₹#,##0.00'); applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: 'right', fontSize: 11, color: COLORS.primary });
  for (let col = 9; col <= 10; col++) { c = sheet.getCell(row, col); c.value = ''; applyCell(c, { fill: COLORS.subtotalBg }); }
  sheet.getRow(row).height = 20;
  row += 1;

  return { currentRow: row, subtotal: totalSubtotal };
}

function sectionDivider(sheet, row, label, COLS) {
  mc(sheet, row, row, 1, COLS);
  const c = sheet.getCell(`A${row}`);
  c.value = label;
  applyCell(c, { fill: COLORS.primary, fontSize: 14, bold: true, color: COLORS.headerText, h: 'center' });
  sheet.getRow(row).height = 24;
  return row + 1;
}

function applyOuterBorder(sheet, startRow, endRow, totalCols) {
  for (let r = startRow; r <= endRow; r++) {
    for (let col = 1; col <= totalCols; col++) {
      const cell    = sheet.getCell(r, col);
      const isTop   = r === startRow;
      const isBot   = r === endRow;
      const isLeft  = col === 1;
      const isRight = col === totalCols;
      cell.border = {
        top:    isTop   ? { style: 'thin', color: { argb: 'FF000000' } } : cell.border?.top,
        bottom: isBot   ? { style: 'thin', color: { argb: 'FF000000' } } : cell.border?.bottom,
        left:   isLeft  ? { style: 'thin', color: { argb: 'FF000000' } } : cell.border?.left,
        right:  isRight ? { style: 'thin', color: { argb: 'FF000000' } } : cell.border?.right,
      };
    }
  }
}

// ================================
// MAIN GENERATOR
// ================================
export const generateExcelReport = async (
  resultData,
  mainPoolData,
  mepItems,
  dimensions,
  totalMepWithFittings,
  mainPoolTotal,
  balancingRows = [],
  balancingTankTotal = 0,
  poolType = 'freeform',
  hasBalancingTank = false,
  includePumpRoomExcel = true,
  mainPoolRemarks = {},
  balancingTankRemarks = {},
  mepRemarks = {},
  pumpRoomRemarks = {},
  templateDescriptions = {},
  currentRates = {},
  currency = 'INR',
  exchangeRate = 83.0,
  pumpRoomDimensions = {},
  pumpRoomQuantities = {},
  constructionType = 'in-ground',
  pumpRoomTotal = 0,
  pumpRoomRemarksExcel = {},
  selectedAdvancedEquipment = [],
  pumpRoomData = [],
  pumpRoomRows = [],
  columnVisibility = DEFAULT_COLUMN_VISIBILITY,
  mepCalculationData = {},
  filterDetails = {},
  percentageAmounts = {},
  ratesDetails = {},
  selectedTables = DEFAULT_TABLE_SELECTION,
  overflowGratingData = null,
  poolTypeForFilter = null,
  pipingItems = [],
  pipingTotal = 0,
  companyProfile,
  civilQuantities = {},
  balanceTankQuantities = {},
  mepQuantities = {},
  dynamicRates = {},
  balancingTankDimensions = {},
  balanceTankItems = [],
  hasGutter = false,
  pumpRoomDistance = 15,
  safetyFactor = 1.1,
  excavationDepth = null,
  editableCivilQty = {},
  editableBalanceQty = {},
  editablePumpRoomQty = {},
  editableMepQty = {},
  editablePipingQty = {},
  editableSubRowQty = {},
) => {
  const company = companyProfile || DEFAULT_COMPANY_PROFILE;
  const normPT  = normalizePoolType(poolTypeForFilter || poolType || 'freeform');
  const colVis  = { ...DEFAULT_COLUMN_VISIBILITY, ...columnVisibility };

  const selTbl = { ...DEFAULT_TABLE_SELECTION };
  Object.keys(selTbl).forEach(key => {
    if (selectedTables[key] !== undefined) selTbl[key] = selectedTables[key];
  });
  if (selectedTables.balancingTank !== undefined) selTbl.balancingTank = selectedTables.balancingTank;
  else if (selectedTables.balanceTank !== undefined) selTbl.balancingTank = selectedTables.balanceTank;

  const showBalanceTank       = shouldShowBalanceTank(normPT, constructionType, hasGutter);
  const balanceTankItemsFinal = getBalanceTankItems(normPT, mainPoolData || [], balanceTankItems, hasGutter);

  const filteredMepItems = filterMepItemsByPoolType(mepItems || [], normPT, hasGutter)
    .filter(item => {
      const slNo = Number(item.originalSlNo ?? item.SlNo ?? item.sl_no);
      if (ADVANCED_EQUIPMENT_IDS.includes(slNo)) {
        return selectedAdvancedEquipment.includes(slNo);
      }
      return true;
    });

  if (!Object.values(selTbl).some(Boolean)) {
    alert("⚠️ Please select at least one table to export!");
    return false;
  }

  const mainPoolTotalFinal    = cleanNumericValue(mainPoolTotal);
  const balanceTankTotalFinal = cleanNumericValue(balancingTankTotal);
  const pumpRoomTotalFinal    = cleanNumericValue(pumpRoomTotal);
  const pipingTotalFinal      = cleanNumericValue(pipingTotal);
  const mepTotalFinal         = cleanNumericValue(totalMepWithFittings);

  const projectSubtotal =
    (selTbl.mainPool                                  ? mainPoolTotalFinal    : 0) +
    (selTbl.balancingTank && showBalanceTank          ? balanceTankTotalFinal : 0) +
    (selTbl.pumpRoom && normPT !== 'jacuzzi'          ? pumpRoomTotalFinal    : 0) +
    (selTbl.mep                                       ? mepTotalFinal         : 0) +
    (selTbl.piping && normPT !== 'infinity'           ? pipingTotalFinal      : 0);

  const gstAmount  = projectSubtotal * 0.18;
  const grandTotal = projectSubtotal * 1.18;

  const poolLabels = {
    skimmer:  'SKIMMER POOL', overflow: 'OVERFLOW POOL', infinity: 'INFINITY POOL',
    curved:   'FREEFORM POOL', freeform: 'FREEFORM POOL', jacuzzi: 'JACUZZI / SPA',
  };
  const poolLabel = poolLabels[normPT] || 'FREEFORM POOL';

  const tableData = {
    mainPool:     { items: [] },
    balancingTank:{ items: [] },
    pumpRoom:     { items: [] },
    mep:          { items: [], groups: [] },
    piping:       { headers: [], pipes: [], valves: [], flanges: [] },
  };

  if (selTbl.mainPool && mainPoolData?.length) {
    tableData.mainPool.items = mainPoolData
      .filter(item => MAIN_POOL_QTY_MAP[item.SlNo] || item.SlNo === 1)
      .map(item => {
        const slNo = item.SlNo;
        let description = templateDescriptions?.[slNo] || item.Description || '';
        if (slNo === 1) description = description || 'Earthwork in excavation';
        if (slNo === 3) description = description || 'Consolidation of excavated earth';
        if (slNo === 4) description = description || 'Disposal of excess excavated earth';
        return { ...item, actualCode: item.Code || '', actualUnit: item.Unit || '', actualDescription: description, actualImage: item.Image || null, originalSlNo: slNo };
      })
      .filter(Boolean)
      .sort((a, b) => a.originalSlNo - b.originalSlNo);
  }

  if (selTbl.balancingTank && showBalanceTank && balanceTankItemsFinal.length > 0) {
    tableData.balancingTank.items = balanceTankItemsFinal
      .filter(item => BALANCE_TANK_QTY_MAP[item.SlNo] || item.SlNo === 1)
      .map(item => {
        const slNo = item.SlNo;
        let description = templateDescriptions?.[slNo] || item.Description || '';
        if (slNo === 1) description = description || 'Earthwork in excavation';
        return { ...item, actualCode: item.Code || '', actualUnit: item.Unit || '', actualDescription: description, actualImage: item.Image || null, originalSlNo: slNo };
      })
      .filter(Boolean)
      .sort((a, b) => a.originalSlNo - b.originalSlNo);
  }

  if (selTbl.pumpRoom && normPT !== 'jacuzzi') {
    const prData = pumpRoomData?.length ? pumpRoomData : (pumpRoomRows?.length ? pumpRoomRows : []);
    if (prData.length > 0) {
      tableData.pumpRoom.items = prData
        .filter(item => PUMP_ROOM_QTY_MAP[item.SlNo] || item.SlNo === 1)
        .map(item => {
          const slNo = item.SlNo;
          let description = templateDescriptions?.[slNo] || item.Description || '';
          if (slNo === 1) description = description || 'Earthwork in excavation';
          return { ...item, actualCode: item.Code || '', actualUnit: item.Unit || '', actualDescription: description, actualImage: item.Image || null, originalSlNo: slNo };
        })
        .filter(Boolean)
        .sort((a, b) => a.originalSlNo - b.originalSlNo);
    }
  }

  if (selTbl.mep && filteredMepItems.length > 0) {
    const base = filteredMepItems
      .filter(item => normPT === 'jacuzzi' ? item.SlNo <= 29 : item.SlNo <= 34)
      .map(item => {
        const slNo = item.SlNo;
        let desc = item.Description || '';
        let unit = item.Unit || '';
        if (normPT === 'overflow' && slNo === 11) { desc = 'Overflow Grating – Durable anti-slip cover installed along the overflow channel perimeter.'; unit = 'RMT'; }
        else if (normPT === 'freeform' || normPT === 'curved') {
          if (hasGutter && slNo === 11)  desc = '❌ Skimmer (HIDDEN – Gutter enabled)';
          else if (!hasGutter && slNo === 13) desc = '❌ Gutter Drain (HIDDEN)';
          else if (hasGutter && slNo === 13)  desc = 'Gutter Drain – Full perimeter drainage system';
          else if (!hasGutter && slNo === 11) desc = 'Skimmer – Standard pool skimmer for surface debris collection';
        } else if (normPT === 'jacuzzi') {
          if (slNo === 26) { desc = desc || 'Water Jets'; unit = unit || 'Nos'; }
          if (slNo === 27) { desc = desc || 'Air Controller'; unit = unit || 'Nos'; }
          if (slNo === 28) { desc = desc || 'Jet Pump'; unit = unit || 'Nos'; }
        }
        return { ...item, actualCode: item.Code || '', actualUnit: unit, actualDescription: desc, actualImage: item.Image || null, originalSlNo: slNo, uiSlNo: getMepUiSlNo(slNo, normPT) };
      })
      .filter(Boolean);
    base.sort((a, b) => (a.uiSlNo || 0) - (b.uiSlNo || 0));
    const numbered = base.map((item, i) => ({ ...item, displaySlNo: i + 1 }));
    const inRange  = (item, lo, hi) => { const ui = item.uiSlNo || 0; return ui >= lo && ui <= hi; };
    const fittingsHi = normPT === 'infinity' ? 12 : 13;

    if (normPT === 'jacuzzi') {
      tableData.mep.groups = [
        { title: 'FILTRATION & PUMP SYSTEMS',     lo: 1,  hi: 7  },
        { title: 'POOL FITTINGS & DRAINS',         lo: 8,  hi: 9  },
        { title: 'ELECTRICAL SYSTEMS',             lo: 10, hi: 14 },
        { title: 'CLEANING & MAINTENANCE',         lo: 15, hi: 22 },
        { title: 'CHEMICAL DOSING SYSTEM',         lo: 23, hi: 25 },
        { title: 'JACUZZI JET SYSTEM',             lo: 26, hi: 28 },
        { title: 'ADVANCED EQUIPMENT (OPTIONAL)', lo: 29, hi: 29 },
      ].map(g => ({ title: g.title, items: numbered.filter(item => inRange(item, g.lo, g.hi)) })).filter(g => g.items.length > 0);
    } else {
      tableData.mep.groups = [
        { title: 'FILTRATION & PUMP SYSTEMS',     lo: 1,       hi: 7          },
        { title: 'POOL FITTINGS & DRAINS',         lo: 8,       hi: fittingsHi },
        { title: 'ELECTRICAL SYSTEMS',             lo: 14,      hi: 18         },
        { title: 'CHEMICAL DOSING SYSTEM',         lo: 19,      hi: 21         },
        { title: 'CLEANING & MAINTENANCE',         lo: 22,      hi: 29         },
        { title: 'ADVANCED EQUIPMENT (OPTIONAL)', lo: 30,      hi: 34         },
      ].map(g => ({ title: g.title, items: numbered.filter(item => inRange(item, g.lo, g.hi)) })).filter(g => g.items.length > 0);
    }
    tableData.mep.items = numbered;
  }

  if (selTbl.piping && pipingItems?.length && normPT !== 'infinity') {
    const norm   = (t) => String(t || '').toLowerCase().replace(/[\s_-]+/g, '');
    const byType = (cat) => pipingItems.filter(i => norm(i.type || i.category || '').includes(cat));
    tableData.piping.headers = byType('header').map((item, i) => ({ ...item, displaySlNo: i + 1 }));
    tableData.piping.pipes   = byType('pipe').map((item, i)   => ({ ...item, displaySlNo: i + 1 }));
    tableData.piping.valves  = byType('valve').map((item, i)  => ({ ...item, displaySlNo: i + 1 }));
    tableData.piping.flanges = byType('flange').map((item, i) => ({ ...item, displaySlNo: i + 1 }));
  }

  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = company.company_name || 'Pool Quotation';
  workbook.created = workbook.modified = now;

  const sheet = workbook.addWorksheet('Pool Quotation', {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      scale: 85, horizontalCentered: true, verticalCentered: false,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  const MEP_COL_WIDTHS = [5, 12, 46, 12, 8, 12, 14, 14, 14, 14, 18];
  MEP_COL_WIDTHS.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

  const COLS = 11;
  let row = 1;

  const companyName    = company.company_name    || "";
  const directorName   = company.director_name   || "";
  const companyAddress = company.address         || "";
  const companyPhone   = company.phone           || "";
  const companyEmail   = company.email           || "";
  const companyWebsite = company.website         || "";
  const companyGst     = company.gst             || "";

  const HEADER_ROWS = 7;
  for (let r = row; r <= row + HEADER_ROWS - 1; r++) {
    for (let col = 1; col <= COLS; col++) {
      const cell = sheet.getCell(r, col);
      cell.fill = S.fill(COLORS.light); cell.border = S.noBorder();
    }
  }
  sheet.getRow(row).height = 36; sheet.getRow(row + 1).height = 20; sheet.getRow(row + 2).height = 20;
  sheet.getRow(row + 3).height = 20; sheet.getRow(row + 4).height = 14; sheet.getRow(row + 5).height = 14;

  sheet.mergeCells(`A${row}:C${row + HEADER_ROWS - 1}`);
  const logoAreaCell = sheet.getCell(`A${row}`);
  logoAreaCell.fill = S.fill(COLORS.light); logoAreaCell.border = S.noBorder(); logoAreaCell.alignment = S.align('center', 'middle');

  sheet.mergeCells(`D${row}:K${row}`);
  const nameCell = sheet.getCell(`D${row}`);
  nameCell.value = companyName; nameCell.fill = S.fill(COLORS.light);
  nameCell.font = { name: 'Arial', size: 20, bold: true, color: { argb: `FF${COLORS.primary}` } };
  nameCell.alignment = S.align('right', 'middle'); nameCell.border = S.noBorder();

  sheet.mergeCells(`D${row + 1}:K${row + 1}`);
  const addrCell = sheet.getCell(`D${row + 1}`);
  addrCell.value = companyAddress; addrCell.fill = S.fill(COLORS.light);
  addrCell.font = { name: 'Arial', size: 10, color: 'grey' }; addrCell.alignment = S.align('right', 'middle'); addrCell.border = S.noBorder();

  sheet.mergeCells(`D${row + 2}:K${row + 2}`);
  const contactCell = sheet.getCell(`D${row + 2}`);
  const contactLine = [companyPhone ? `📞 ${companyPhone}` : '', companyEmail ? `✉ ${companyEmail}` : ''].filter(Boolean).join('    |    ');
  contactCell.value = contactLine; contactCell.fill = S.fill(COLORS.light);
  contactCell.font = { name: 'Arial', size: 10, color: { argb: `FF${COLORS.lightText}` } }; contactCell.alignment = S.align('right', 'middle'); contactCell.border = S.noBorder();

  sheet.mergeCells(`D${row + 3}:K${row + 3}`);
  const extraCell = sheet.getCell(`D${row + 3}`);
  const extraLine = [companyWebsite ? `🌐 ${companyWebsite}` : '', companyGst ? `GST: ${companyGst}` : ''].filter(Boolean).join('    |    ');
  extraCell.value = extraLine; extraCell.fill = S.fill(COLORS.light);
  extraCell.font = { name: 'Arial', size: 10, color: { argb: `FF${COLORS.lightText}` } }; extraCell.alignment = S.align('right', 'middle'); extraCell.border = S.noBorder();

  sheet.mergeCells(`D${row + 4}:K${row + 4}`);
  const padCell = sheet.getCell(`D${row + 4}`); padCell.value = ''; padCell.fill = S.fill(COLORS.light); padCell.border = S.noBorder();

  if (company.logo_url) {
    try {
      const logoBase64 = await loadLogoAsBase64(company.logo_url);
      if (logoBase64) {
        const imageId = workbook.addImage({ base64: logoBase64.split(',')[1], extension: 'png' });
        sheet.addImage(imageId, { tl: { col: 1.5, row: 0.3 }, ext: { width: 145, height: 150 }, editAs: 'oneCell' });
      }
    } catch (err) { console.warn("Failed to load logo:", err); }
  }

  row += HEADER_ROWS;
  sheet.mergeCells(`A${row}:K${row}`); const divCell = sheet.getCell(`A${row}`); divCell.value = ''; divCell.fill = S.fill(COLORS.primary); sheet.getRow(row).height = 4; row += 1;

  mc(sheet, row, row, 1, COLS); let c = sheet.getCell(`A${row}`);
  c.value = `${poolLabel} — DETAILED QUOTATION`;
  applyCell(c, { fill: COLORS.primary, fontSize: 17, bold: true, color: COLORS.headerText, h: 'center' }); sheet.getRow(row).height = 36; row += 1;

  const quoteNo  = `${company.company_code || 'QT'}/${poolLabel.replace(/\s+/g, '')}/${now.getFullYear()}/${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const projRef  = `${company.company_code || 'PROJ'}-${poolLabel.replace(/\s+/g, '')}-${now.getFullYear()}`;
  const leftFields  = [['Name:',''],['Address:',''],['Phone No:',''],['PAN No:',''],['GSTIN:',''],['Delivery Address:','']];
  const rightFields = [['Quotation No:', quoteNo],['Date:', `${dateStr}  ${timeStr}`],['Project Reference:', projRef],['Prepared By:', company.company_name || '']];

  mc(sheet, row, row, 1, 5); c = sheet.getCell(`A${row}`); c.value = 'BILL TO'; applyCell(c, { fill: COLORS.secondary, bold: true, fontSize: 11, color: COLORS.headerText, h: 'center' });
  mc(sheet, row, row, 6, COLS); c = sheet.getCell(`F${row}`); c.value = 'QUOTATION DETAILS'; applyCell(c, { fill: COLORS.secondary, bold: true, fontSize: 11, color: COLORS.headerText, h: 'center' }); sheet.getRow(row).height = 20; row++;

  for (let i = 0; i < 6; i++) {
    mc(sheet, row, row, 1, 2); c = sheet.getCell(`A${row}`); c.value = leftFields[i][0]; applyCell(c, { fill: COLORS.highlight, bold: true, h: 'left', fontSize: 10 });
    mc(sheet, row, row, 3, 5); c = sheet.getCell(`C${row}`); c.value = leftFields[i][1]; applyCell(c, { fill: 'FFFFFF', h: 'left', fontSize: 10 });
    if (i < rightFields.length) {
      mc(sheet, row, row, 6, 8); c = sheet.getCell(`F${row}`); c.value = rightFields[i][0]; applyCell(c, { fill: COLORS.highlight, bold: true, h: 'left', fontSize: 10 });
      mc(sheet, row, row, 9, COLS); c = sheet.getCell(`I${row}`); c.value = rightFields[i][1]; applyCell(c, { fill: 'FFFFFF', h: 'left', fontSize: 10 });
    } else {
      mc(sheet, row, row, 6, COLS); c = sheet.getCell(`F${row}`); c.value = ''; applyCell(c, { fill: COLORS.highlight });
    }
    sheet.getRow(row).height = 20; row++;
  }

  row = sectionDivider(sheet, row, 'PROJECT SPECIFICATIONS', COLS);

  const poolLength = cleanNumericValue(dimensions?.length || resultData?.length || resultData?.pool_dimensions?.length);
  const poolWidth  = cleanNumericValue(dimensions?.width  || resultData?.width  || resultData?.pool_dimensions?.width);
  const poolDepth  = cleanNumericValue(dimensions?.depth  || resultData?.depth  || resultData?.pool_dimensions?.depth);
  const poolVolume        = poolLength * poolWidth * poolDepth;
  const balanceTankVolume = cleanNumericValue(resultData?.balance_tank_volume || (poolVolume * 0.075));
  const additionalSources = { dynamicRates, filterDetails, mepCalculationData };
  const getSpec = (keys, fallback = "N/A") => {
    const sources = [resultData, resultData?.specifications, resultData?.system_parameters, resultData?.mep_calculation_data, resultData?.dynamicRates, dynamicRates, filterDetails, mepCalculationData];
    for (const src of sources) { if (!src) continue; for (const k of keys) { const v = src?.[k]; if (v !== undefined && v !== null && v !== "") return v; } }
    return fallback;
  };
  const filterDiameter  = getSpec(['filter_dia', 'filter_dia_mm', 'filterDiameter', 'filter_size', 'diameter']);
  const pumpCapacity    = getSpec(['hp', 'pump_hp', 'pumpCapacity']);
  const totalWaterVolume = poolVolume + balanceTankVolume;
  const surfaceArea      = poolLength * poolWidth;
  const wallArea         = 2 * (poolLength + poolWidth) * poolDepth;
  const flowRate         = cleanNumericValue(resultData?.flowrate_m3_per_hr || resultData?.flow_rate || resultData?.flowRate || mepCalculationData?.flow_rate || mepCalculationData?.flowrate_m3_per_hr || (poolVolume / (resultData?.turnover || 4.5)));
  const turnoverRate     = cleanNumericValue(resultData?.turnover || resultData?.turnover_hours || resultData?.turnover_time || mepCalculationData?.turnover || 4.5);
  const velocity         = cleanNumericValue(resultData?.velocity || resultData?.flow_velocity || mepCalculationData?.velocity || 40);

  const specs = [];
  specs.push(['Project Type:', poolLabel]);
  specs.push(['Construction Type:', constructionType === 'in-ground' ? 'In-ground' : 'Above-ground']);
  if (normPT === 'jacuzzi') {
    specs.push(['Jacuzzi Dimensions:', dimensions?.length ? `${dimensions.length}m × ${dimensions.width}m × ${dimensions.depth}m` : 'Custom Size']);
    specs.push(['Water Volume:', `${safeNum(poolVolume, 2)} m³`]);
    specs.push(['Turnover Rate:', `${safeNum(turnoverRate, 1)} hours`]);
    specs.push(['Flow Rate:', `${safeNum(flowRate, 2)} m³/hr`]);
    specs.push(['Filter Diameter:', filterDiameter !== "N/A" ? `${filterDiameter} mm` : 'N/A']);
    specs.push(['Pump Capacity:', pumpCapacity !== "N/A" ? `${pumpCapacity} HP` : 'N/A']);
  } else {
    specs.push(['Pool Dimensions:', `${poolLength}m × ${poolWidth}m × ${poolDepth}m`]);
    specs.push(['Pool Water Volume:', `${safeNum(poolVolume, 2)} m³`]);
    specs.push(['Balancing Tank Volume:', showBalanceTank ? `${safeNum(balanceTankVolume, 2)} m³` : 'Not Required']);
    specs.push(['Total Water Volume (Pool + Tank):', showBalanceTank ? `${safeNum(totalWaterVolume, 2)} m³` : `${safeNum(poolVolume, 2)} m³`]);
    specs.push(['Surface Area:', `${safeNum(surfaceArea, 2)} m²`]);
    specs.push(['Wall Area:', `${safeNum(wallArea, 2)} m²`]);
    specs.push(['Pump Room:', 'INCLUDED (MANDATORY FOR ALL POOLS)']);
    specs.push(['Pump Room Dimensions:', pumpRoomDimensions?.length ? `${pumpRoomDimensions.length}m × ${pumpRoomDimensions.width}m × ${pumpRoomDimensions.height}m` : 'Standard Size']);
    specs.push(['Turnover Rate:', `${safeNum(turnoverRate, 1)} hours`]);
    specs.push(['Velocity:', `${safeNum(velocity, 2)} m³/hr/sqm`]);
    specs.push(['Flow Rate:', `${safeNum(flowRate, 2)} m³/hr`]);
    specs.push(['Filter Diameter:', filterDiameter !== "N/A" ? `${filterDiameter} mm` : 'N/A']);
    specs.push(['Pump Capacity:', pumpCapacity !== "N/A" ? `${pumpCapacity} HP` : 'N/A']);
  }
  specs.push(['Selected Advanced Equipment:', selectedAdvancedEquipment?.length ? selectedAdvancedEquipment.join(', ') : 'None selected']);

  specs.forEach(([label, val], idx) => {
    const rowBg = idx % 2 === 0 ? COLORS.light : COLORS.highlight;
    mc(sheet, row, row, 1, 4); c = sheet.getCell(`A${row}`); c.value = label; applyCell(c, { fill: rowBg, bold: true, h: 'left', fontSize: 10, color: COLORS.text });
    mc(sheet, row, row, 5, COLS); c = sheet.getCell(`E${row}`); c.value = val; applyCell(c, { fill: rowBg, h: 'left', fontSize: 10, color: COLORS.text });
    sheet.getRow(row).height = 20; row++;
  });

  row = sectionDivider(sheet, row, '◆  COST SUMMARY', COLS);

  mc(sheet, row, row, 1, 8); c = sheet.getCell(`A${row}`); c.value = 'Description'; applyCell(c, { fill: COLORS.groupBg, bold: true, color: COLORS.headerText, h: 'center', fontSize: 11 });
  mc(sheet, row, row, 9, COLS); c = sheet.getCell(`I${row}`); c.value = 'Amount (₹)'; applyCell(c, { fill: COLORS.groupBg, bold: true, color: COLORS.headerText, h: 'center', fontSize: 11 }); sheet.getRow(row).height = 20; row++;

  const summaryRows = [];
  if (selTbl.mainPool)                                            summaryRows.push(['01', 'Main Pool Civil Works',      mainPoolTotalFinal,    false]);
  if (selTbl.balancingTank && showBalanceTank)                   summaryRows.push(['02', 'Balance Tank Civil Works',   balanceTankTotalFinal, false]);
  if (selTbl.pumpRoom && normPT !== 'jacuzzi')                   summaryRows.push(['03', 'Pump Room Civil Works',      pumpRoomTotalFinal,    false]);
  if (selTbl.mep)                                                 summaryRows.push(['04', 'MEP Systems & Equipment',   mepTotalFinal,         false]);
  if (selTbl.piping && normPT !== 'infinity' && pipingTotalFinal > 0) summaryRows.push(['05', 'Piping System',         pipingTotalFinal,      false]);
  summaryRows.push([null, 'PROJECT SUB-TOTAL',              projectSubtotal, 'sub']);
  summaryRows.push([null, 'GST @ 18%',                      gstAmount,       false]);
  summaryRows.push([null, 'GRAND TOTAL (INCL. GST)',         grandTotal,      'grand']);

  summaryRows.forEach(([num, desc, amt, style], i) => {
    const bg = style === 'grand' ? COLORS.grandTotalBg : style === 'sub' ? COLORS.subtotalBg : (i % 2 === 0 ? COLORS.light : COLORS.highlight);
    const fc = style === 'grand' ? COLORS.headerText : style === 'sub' ? COLORS.primary : COLORS.text;
    mc(sheet, row, row, 1, 8); c = sheet.getCell(`A${row}`); c.value = num ? `${num}.  ${desc}` : desc; applyCell(c, { fill: bg, bold: !!style, h: 'left', fontSize: style ? 12 : 11, color: fc });
    mc(sheet, row, row, 9, COLS); c = sheet.getCell(`I${row}`); setCurrencyCell(c, amt, '₹#,##0.00'); applyCell(c, { fill: bg, bold: !!style, h: 'right', fontSize: style ? 12 : 11, color: fc });
    sheet.getRow(row).height = style === 'grand' ? 32 : style === 'sub' ? 28 : 24; row++;
  });

  row = sectionDivider(sheet, row, '◆  DETAILED BILL OF QUANTITIES', COLS);

  // MAIN POOL
  if (selTbl.mainPool && tableData.mainPool.items.length > 0) {
    const res = await buildCivilTable(
      sheet, row, 'MAIN POOL CIVIL WORK', tableData.mainPool.items,
      mainPoolRemarks, colVis, MAIN_POOL_QTY_MAP, {}, civilQuantities, resultData,
      editableCivilQty, editableBalanceQty, editablePumpRoomQty, editableSubRowQty,
      false, false, dimensions
    );
    row = res.currentRow;
  }

  // BALANCE TANK
  if (selTbl.balancingTank && showBalanceTank && tableData.balancingTank.items.length > 0) {
    const res = await buildCivilTable(
      sheet, row, 'BALANCE TANK CIVIL WORK', tableData.balancingTank.items,
      balancingTankRemarks, colVis, BALANCE_TANK_QTY_MAP, {}, balanceTankQuantities, resultData,
      editableCivilQty, editableBalanceQty, editablePumpRoomQty, editableSubRowQty,
      true, false, balancingTankDimensions
    );
    row = res.currentRow;
  }

  // PUMP ROOM
  if (selTbl.pumpRoom && normPT !== 'jacuzzi' && tableData.pumpRoom.items.length > 0) {
    const res = await buildCivilTable(
      sheet, row, 'PUMP ROOM CIVIL WORK', tableData.pumpRoom.items,
      pumpRoomRemarksExcel || pumpRoomRemarks, colVis, PUMP_ROOM_QTY_MAP, {}, pumpRoomQuantities, resultData,
      editableCivilQty, editableBalanceQty, editablePumpRoomQty, editableSubRowQty,
      false, true, pumpRoomDimensions
    );
    row = res.currentRow;
  }

  // MEP
  if (selTbl.mep && tableData.mep.groups.length > 0) {
    mc(sheet, row, row, 1, COLS); c = sheet.getCell(`A${row}`);
    c.value = normPT === 'jacuzzi' ? 'JACUZZI MECHANICAL, ELECTRICAL & PLUMBING (MEP)' : 'MECHANICAL, ELECTRICAL & PLUMBING (MEP)';
    applyCell(c, { fill: COLORS.primary, fontSize: 15, bold: true, color: COLORS.headerText, h: 'center' }); sheet.getRow(row).height = 24; row += 1;
    for (const grp of tableData.mep.groups) {
      if (grp.items.length > 0) {
        const res = await buildMEPTable(
          sheet, row, grp.title, grp.items, colVis, mepQuantities, editableMepQty,
          dynamicRates, resultData, normPT, hasGutter, dimensions
        );
        row = res.currentRow;
      }
    }
  }

  // PIPING
  const anyPiping = tableData.piping.headers.length + tableData.piping.pipes.length + tableData.piping.valves.length + tableData.piping.flanges.length;
  if (selTbl.piping && anyPiping > 0 && pipingTotalFinal > 0 && normPT !== 'infinity') {
    mc(sheet, row, row, 1, 11); c = sheet.getCell(`A${row}`); c.value = 'PIPING SYSTEM'; applyCell(c, { fill: COLORS.primary, fontSize: 15, bold: true, color: COLORS.headerText, h: 'center' }); sheet.getRow(row).height = 24; row += 1;
    if (tableData.piping.headers.length > 0) { const r = await buildPipingTable(sheet, row, 'HEADERS', tableData.piping.headers, colVis, editablePipingQty); row = r.currentRow; }
    if (tableData.piping.pipes.length   > 0) { const r = await buildPipingTable(sheet, row, 'PIPES',   tableData.piping.pipes,   colVis, editablePipingQty); row = r.currentRow; }
    if (tableData.piping.valves.length  > 0) { const r = await buildPipingTable(sheet, row, 'VALVES',  tableData.piping.valves,  colVis, editablePipingQty); row = r.currentRow; }
    if (tableData.piping.flanges.length > 0) { const r = await buildPipingTable(sheet, row, 'FLANGES', tableData.piping.flanges, colVis, editablePipingQty); row = r.currentRow; }
    mc(sheet, row, row, 1, 8); mc(sheet, row, row, 9, 11);
    c = sheet.getCell(`A${row}`); c.value = 'PIPING SYSTEM — GRAND TOTAL'; applyCell(c, { fill: COLORS.grandTotalBg, bold: true, h: 'right', fontSize: 12, color: COLORS.headerText });
    c = sheet.getCell(`I${row}`); setCurrencyCell(c, pipingTotalFinal, '₹#,##0.00'); applyCell(c, { fill: COLORS.grandTotalBg, bold: true, h: 'right', fontSize: 12, color: COLORS.headerText }); sheet.getRow(row).height = 24; row += 1;
  }

  // PROJECT COST SUMMARY (before terms)
  row += 2;
  mc(sheet, row, row, 1, 11);
  let summaryTitleCell = sheet.getCell(`A${row}`);
  summaryTitleCell.value = "PROJECT COST SUMMARY";
  applyCell(summaryTitleCell, { fill: COLORS.primary, fontSize: 13, bold: true, color: COLORS.headerText, h: "center" });
  sheet.getRow(row).height = 24; row++;

  mc(sheet, row, row, 1, 8); let subtotalLabelCell = sheet.getCell(`A${row}`); subtotalLabelCell.value = "Project Subtotal"; applyCell(subtotalLabelCell, { fill: COLORS.highlight, bold: true, h: "right" });
  mc(sheet, row, row, 9, 11); let subtotalValueCell = sheet.getCell(`I${row}`); setCurrencyCell(subtotalValueCell, projectSubtotal, '₹#,##0.00'); applyCell(subtotalValueCell, { fill: COLORS.highlight, bold: true, h: "right" }); row++;

  mc(sheet, row, row, 1, 8); let gstLabelCell = sheet.getCell(`A${row}`); gstLabelCell.value = "GST (18%)"; applyCell(gstLabelCell, { fill: COLORS.highlight, bold: true, h: "right" });
  mc(sheet, row, row, 9, 11); let gstValueCell = sheet.getCell(`I${row}`); setCurrencyCell(gstValueCell, gstAmount, '₹#,##0.00'); applyCell(gstValueCell, { fill: COLORS.highlight, bold: true, h: "right" }); row++;

  mc(sheet, row, row, 1, 8); let grandTotalLabelCell = sheet.getCell(`A${row}`); grandTotalLabelCell.value = "GRAND TOTAL"; applyCell(grandTotalLabelCell, { fill: COLORS.grandTotalBg, fontSize: 13, bold: true, color: COLORS.totalText, h: "right" });
  mc(sheet, row, row, 9, 11); let grandTotalValueCell = sheet.getCell(`I${row}`); setCurrencyCell(grandTotalValueCell, grandTotal, '₹#,##0.00'); applyCell(grandTotalValueCell, { fill: COLORS.grandTotalBg, fontSize: 13, bold: true, color: COLORS.totalText, h: "right" });
  sheet.getRow(row).height = 24; row += 2;

  row = sectionDivider(sheet, row, '◆  TERMS & CONDITIONS', COLS);

  const bankDetails      = company.bank_details || { account_name: "Rainbow Landscape Innovations India Pvt Ltd", account_number: "XXXXXXXXXX", bank_name: "HDFC BANK", ifsc_code: "XXXXXXXXXX", branch: "HORAMAVU AGARA BRANCH BANGALORE-560043" };
  const companyEmail2    = company.email   || "info@intelithon.com";
  const companyPhone2    = company.phone   || "+91 1234567890";
  const companyWebsite2  = company.website || "www.intelithon.com";
  const registeredOffice = company.address || "No. 1, 1st Floor, Deepa Towers, Esther Enclave, Horamavu, Bangalore, Karnataka - 560043";

  const terms = [
    { text: '1. Prices are valid for 30 days from the date of quotation', bold: true, height: 20 },
    { text: '2. Delivery:', bold: true, height: 20 },
    { text: '   ► Materials in stock: 2 to 3 weeks from the date of Purchase Order, and If Local or out station purchase 12 to 14 weeks.', bold: false, height: 20 },
    { text: '   ► Materials to be imported: 14 weeks from the date of purchase order against Advance payment.', bold: false, height: 20 },
    { text: '3. Validity of this offer will be for 30 days from the date of confirmation, after this period the charges will be extra.', bold: true, height: 20 },
    { text: '4. Materials will be dispatched only against purchase order & Advance Payment in the Name of', bold: true, height: 20 },
    { text: `   ${company.company_name || 'Rainbow Landscape Innovations India Pvt Ltd'}`, bold: false, height: 20, color: COLORS.primary },
    { text: '5. Taxes:', bold: true, height: 20 },
    { text: '   ► Taxes will be extra as applicable.', bold: false, height: 20 },
    { text: '6. Payment Terms:', bold: true, height: 20 },
    { text: '   ► 50% - Advance along with PO / work order.', bold: false, height: 20 },
    { text: '   ► 40% - Before Dispatching Material', bold: false, height: 20 },
    { text: '   ► 10% - Balance on Testing and commissioning.', bold: false, height: 20 },
    { text: '7. Scope of Work:', bold: true, height: 20 },
    { text: '   Supply, Installation, Testing and commissioning Swimming Pool MEP Works and Tiling Work.', bold: false, height: 20 },
    { text: '   As per enclosed Bill of Quantities in Annexure and Quantities may vary due to site condition', bold: false, height: 20 },
    { text: '   Value of Contract: As per enclosed Bill of Quotation Annexure.', bold: false, height: 20 },
    { text: '   Types of Contract: This is an item rate material cum Labour contract', bold: false, height: 20 },
    { text: '   Commercial: Prices as per the detailed Bill of QTY in Annexure.', bold: false, height: 20 },
    { text: '   ► Any product to be insured should be intimated to us earlier', bold: false, height: 20 },
    { text: '   ► Once product is dispatched to your destination it will be your total responsibility.', bold: false, height: 20 },
    { text: '8. Estimates based on current industry standards and average material costs.', bold: true, height: 20 },
    { text: '   • Actual costs may vary depending on location, material selections, and site conditions', bold: false, height: 20 },
    { text: '   • Variations of ±10–15% from the estimate are common', bold: false, height: 20 },
    { text: '9. LIST OF EXCLUSIONS', bold: true, height: 20, color: COLORS.primary },
    { text: '10. Required incoming power should be provided near the waterbody', bold: true, height: 20 },
    { text: '11. Electrical conduit from Power Source to Plant room under client scope.', bold: true, height: 20 },
    { text: '12. If there is any change in the site conditions/increase or decrease same will be intimated to the client before commencement of the work.', bold: true, height: 20 },
    { text: '13. Testing and commission purposes, electrical and water points should be provided by the client', bold: true, height: 20 },
    { text: '14. Earthing near the panel board in the plant room.', bold: true, height: 20 },
    { text: '15. All backwash pipes from plant room to storm water / waste.', bold: true, height: 20 },
    { text: '16. All floor trap connection to storm water / waste.', bold: true, height: 20 },
    { text: '17. All pedestal / foundation detail for pump & equipment', bold: true, height: 20 },
    { text: '18. Payment and Banking:', bold: true, height: 20, color: COLORS.primary },
    { text: `   ${bankDetails.account_name || company.company_name || 'Rainbow Landscape Innovations India Pvt Ltd'}`, bold: false, height: 20, color: COLORS.primary },
    { text: `   A/c No. ${bankDetails.account_number || 'XXXXXXXXXX'}`, bold: false, height: 20 },
    { text: `   ${bankDetails.bank_name || 'HDFC BANK'} IFSC CODE : ${bankDetails.ifsc_code || 'XXXXXXXXXX'}`, bold: false, height: 20 },
    { text: `   ${bankDetails.branch || 'HORAMAVU AGARA BRANCH BANGALORE-560043'}`, bold: false, height: 20 },
  ];

  terms.forEach(term => {
    mc(sheet, row, row, 1, COLS); const cell = sheet.getCell(`A${row}`); cell.value = term.text;
    applyCell(cell, { fill: COLORS.light, fontSize: 10, bold: term.bold || false, h: 'left', color: term.color || COLORS.text, wrap: true });
    sheet.getRow(row).height = term.height || 20; row++;
  });

  row += 1;
  mc(sheet, row, row, 1, COLS); c = sheet.getCell(`A${row}`); c.value = 'REGISTERED OFFICE'; applyCell(c, { fill: COLORS.primary, fontSize: 12, bold: true, color: COLORS.headerText, h: 'center' }); sheet.getRow(row).height = 20; row++;

  const registeredDetails = [['Email:', companyEmail2],['Phone:', companyPhone2],['Website:', companyWebsite2],['Address:', registeredOffice]];
  registeredDetails.forEach(([label, value]) => {
    mc(sheet, row, row, 1, 3); c = sheet.getCell(`A${row}`); c.value = label; applyCell(c, { fill: COLORS.highlight, bold: true, h: 'left', fontSize: 10 });
    mc(sheet, row, row, 4, COLS); c = sheet.getCell(`D${row}`); c.value = value; applyCell(c, { fill: COLORS.light, h: 'left', fontSize: 10 }); sheet.getRow(row).height = 20; row++;
  });

  row += 1;
  mc(sheet, row, row, 1, COLS); c = sheet.getCell(`A${row}`); c.value = `Thank you for choosing ${company.company_name?.trim() || 'us'} for your pool project. We look forward to serving you.`; applyCell(c, { fill: COLORS.sectionBg, fontSize: 11, h: 'center', italic: true, color: COLORS.primary }); sheet.getRow(row).height = 20; row += 1;

  const footerItems = [company.address ? `📍 ${company.address}` : '', company.phone ? `📞 ${company.phone}` : '', company.email ? `✉ ${company.email}` : '', company.website ? `🌐 ${company.website}` : ''].filter(Boolean).join('     |    ');
  mc(sheet, row, row, 1, COLS); c = sheet.getCell(`A${row}`); c.value = footerItems; applyCell(c, { fill: COLORS.primary, fontSize: 9, h: 'center', color: COLORS.headerText }); sheet.getRow(row).height = 20; row += 1;

  row = sectionDivider(sheet, row, 'AUTHORIZED SIGNATORY', COLS);

  if (company.stamp_url) {
    try {
      const stampBase64 = await loadStampAsBase64(company.stamp_url);
      if (stampBase64) {
        const stampId = workbook.addImage({ base64: stampBase64.split(',')[1], extension: 'png' });
        sheet.addImage(stampId, { tl: { col: 3.77, row: row - 1 + 0.15 }, ext: { width: 130, height: 130 }, editAs: 'oneCell' });
        for (let r = row; r <= row + 2; r++) sheet.getRow(r).height = 30; row += 3;
      } else { row += 1; }
    } catch (err) { console.warn("Failed to load stamp:", err); row += 1; }
  } else { row += 1; }

  mc(sheet, row, row, 1, COLS); c = sheet.getCell(`A${row}`); c.value = '________________________'; applyCell(c, { fill: COLORS.light, h: 'center', fontSize: 12 }); sheet.getRow(row).height = 20; row++;
  mc(sheet, row, row, 1, COLS); c = sheet.getCell(`A${row}`); c.value = directorName ? `Director – ${directorName}` : 'Director — Shreyas'; applyCell(c, { fill: COLORS.light, bold: true, h: 'center', fontSize: 12, color: COLORS.primary }); sheet.getRow(row).height = 20; row++;
  mc(sheet, row, row, 1, COLS); c = sheet.getCell(`A${row}`); c.value = `For ${company.company_name?.trim() || ''}`; applyCell(c, { fill: COLORS.light, bold: true, h: 'center', fontSize: 11, color: COLORS.primary }); sheet.getRow(row).height = 20; row += 1;

  mc(sheet, row, row, 1, COLS); c = sheet.getCell(`A${row}`); c.value = `Generated on ${dateStr} at ${timeStr}  •  Page 1 of 1`; applyCell(c, { fill: COLORS.highlight, fontSize: 9, h: 'center', italic: true, color: COLORS.lightText }); sheet.getRow(row).height = 18; row++;

  const lastRow = row - 1;
  sheet.pageSetup.printArea = `A1:K${lastRow}`;
  applyOuterBorder(sheet, 1, lastRow, 11);

  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const fname  = `${(company.company_name || 'Quotation').replace(/\s+/g, '_')}_${poolLabel.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}.xlsx`;
    saveAs(new Blob([buffer]), fname);
    console.log('✅ Excel report generated successfully.');
    return true;
  } catch (err) {
    console.error('❌ Error generating Excel:', err);
    alert('Failed to generate Excel report. Please check the browser console for details.');
    return false;
  }
};

// ================================
// EXCEL DOWNLOAD BUTTON COMPONENT
// ================================
const ExcelDownloadButton = ({
  resultData, mainPoolData, mepItems, dimensions, totalMep, mainPoolTotal,
  balancingRows = [], balancingTankTotal = 0, poolType = 'freeform',
  hasBalancingTank = false, includePumpRoomExcel = true,
  mainPoolRemarks = {}, balancingTankRemarks = {}, mepRemarks = {}, pumpRoomRemarks = {},
  templateDescriptions = {}, totalMepWithFittings = 0, currentRates = {},
  currency = 'INR', exchangeRate = 83.0, pumpRoomDimensions = {}, pumpRoomQuantities = {},
  constructionType = 'in-ground', pumpRoomTotal = 0, pumpRoomRemarksExcel = {},
  selectedAdvancedEquipment = [], pumpRoomData = [], pumpRoomRows = [],
  columnVisibility = DEFAULT_COLUMN_VISIBILITY, mepCalculationData = {},
  filterDetails = {}, percentageAmounts = {}, ratesDetails = {},
  selectedTables = DEFAULT_TABLE_SELECTION, overflowGratingData = null,
  poolTypeForFilter = null, pipingItems = [], pipingTotal = 0,
  civilQuantities = {}, balanceTankQuantities = {}, mepQuantities = {},
  dynamicRates = {}, balancingTankDimensions = {}, balanceTankItems = [],
  hasGutter = false, pumpRoomDistance = 15, safetyFactor = 1.1,
  companyProfile, excavationDepth = null,
  mepIncludesPiping = MEP_INCLUDES_PIPING,
  editableCivilQty = {},
  editableBalanceQty = {},
  editablePumpRoomQty = {},
  editableMepQty = {},
  editablePipingQty = {},
  editableSubRowQty = {},
}) => {
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleDownload = async () => {
    if (!Object.values(selectedTables).some(Boolean)) {
      alert('⚠️ Please select at least one table to export!');
      return;
    }
    try {
      setIsGenerating(true);
      const finalProfile = companyProfile || DEFAULT_COMPANY_PROFILE;
      const normPT       = normalizePoolType(poolTypeForFilter || poolType || 'freeform');

      const filteredMainPoolData = selectedTables.mainPool
        ? (mainPoolData || []).filter(item => MAIN_POOL_QTY_MAP[item.SlNo] || item.SlNo === 1)
        : [];

      const resolvedBtItems         = getBalanceTankItems(normPT, mainPoolData || [], balanceTankItems, hasGutter);
      const filteredBalanceTankData = selectedTables.balancingTank
        ? resolvedBtItems.filter(item => BALANCE_TANK_QTY_MAP[item.SlNo] || item.SlNo === 1)
        : [];

      const filteredPumpRoomData = (selectedTables.pumpRoom && normPT !== 'jacuzzi')
        ? (pumpRoomData?.length ? pumpRoomData : (pumpRoomRows?.length ? pumpRoomRows : []))
            .filter(item => PUMP_ROOM_QTY_MAP[item.SlNo] || item.SlNo === 1)
        : [];

      const resolvedMepItems   = filterMepItemsByPoolType(mepItems || [], normPT, hasGutter);
      const filteredMepData    = selectedTables.mep    ? resolvedMepItems     : [];
      const filteredPipingData = (selectedTables.piping && normPT !== 'infinity') ? (pipingItems || []) : [];

      await generateExcelReport(
        resultData, filteredMainPoolData, filteredMepData, dimensions,
        totalMepWithFittings || totalMep || 0, mainPoolTotal || 0,
        filteredBalanceTankData, balancingTankTotal || 0, poolType,
        hasBalancingTank, includePumpRoomExcel,
        mainPoolRemarks, balancingTankRemarks, mepRemarks, pumpRoomRemarks,
        templateDescriptions, currentRates, currency, exchangeRate,
        pumpRoomDimensions, pumpRoomQuantities, constructionType,
        pumpRoomTotal, pumpRoomRemarksExcel, selectedAdvancedEquipment,
        filteredPumpRoomData, pumpRoomRows, columnVisibility,
        mepCalculationData, filterDetails, percentageAmounts, ratesDetails,
        selectedTables, overflowGratingData, poolTypeForFilter,
        filteredPipingData, pipingTotal, finalProfile,
        civilQuantities, balanceTankQuantities, mepQuantities, dynamicRates,
        balancingTankDimensions, balanceTankItems, hasGutter,
        pumpRoomDistance, safetyFactor, excavationDepth,
        editableCivilQty, editableBalanceQty, editablePumpRoomQty,
        editableMepQty, editablePipingQty, editableSubRowQty,
      );
    } catch (err) {
      console.error('❌ Excel generation error:', err);
      alert('Failed to generate Excel report. Check the browser console for details.');
    } finally { setIsGenerating(false); }
  };

  const selectedCount = Object.values(selectedTables).filter(Boolean).length;
  const totalCount    = Object.keys(selectedTables).length;

  const btnStyle = {
    padding: '11px 22px',
    background: isGenerating ? `#${COLORS.secondary}` : `#${COLORS.primary}`,
    color: '#ffffff', border: 'none', borderRadius: '8px',
    fontSize: '14px', fontWeight: '600', fontFamily: 'Arial, sans-serif',
    cursor: isGenerating ? 'wait' : 'pointer',
    opacity: isGenerating ? 0.75 : 1,
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    transition: 'background 0.2s, transform 0.1s',
    boxShadow: '0 2px 6px rgba(2,3,87,0.35)',
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className="excel-download-btn"
      style={btnStyle}
      onMouseEnter={e => { if (!isGenerating) { e.currentTarget.style.background = `#${COLORS.secondary}`; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
      onMouseLeave={e => { e.currentTarget.style.background = `#${COLORS.primary}`; e.currentTarget.style.transform = 'translateY(0)'; }}
      title={companyProfile?.company_name ? `Download Excel for ${companyProfile.company_name}` : 'Download Excel Quotation'}
    >
      {isGenerating ? (
        <><span>⏳</span><span>Generating Excel…</span></>
      ) : (
        <>
          <span>📊</span>
          <span>Download Excel Quotation</span>
          <span style={{ fontSize: '11px', opacity: 0.75, background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
            {selectedCount}/{totalCount} tables
          </span>
        </>
      )}
    </button>
  );
};

export default ExcelDownloadButton;