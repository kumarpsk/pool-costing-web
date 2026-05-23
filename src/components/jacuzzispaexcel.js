import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ================================
// COLOR SCHEME
// ================================
const COLORS = {
  primary:      "020357",
  secondary:    "2C3E50",
  accent:       "1E40AF",
  light:        "F8FAFC",
  dark:         "0F172A",
  border:       "CBD5E1",
  headerText:   "FFFFFF",
  text:         "1E293B",
  lightText:    "64748B",
  highlight:    "F1F5F9",
  subtotalBg:   "DBEAFE",
  grandTotalBg: "020357",
  logoBg:       "FFFFFF",
  sectionBg:    "EFF6FF",
  groupBg:      "1E3A5F",
  amountCol:    "E8F4FD",
  subRowBg:     "F8FAFF",
};

const INSTALLATION_PERCENT = 0.15;

const DEFAULT_TABLE_SELECTION = {
  mainPool: true,
  pumpRoom: true,
  mep:      true,
  piping:   true,
};

const DEFAULT_COLUMN_VISIBILITY = {
  image:     true,
  unit:      true,
  qty:       true,
  fixedRate: true,
  remarks:   true,
  code:      true,
};

// ================================
// QUANTITY FIELD NAME MAPS
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
  1:  "Filter_QTY",
  2:  "Glass_QTY",
  3:  "Pressure_QTY",
  4:  "Filter_Drain_QTY",
  5:  "Mpv_QTY",
  6:  "Mpv_connset_QTY",
  7:  "Cpump_QTY",
  8:  "Return_Inlets_QTY",
  9:  "MainDrain_QTY",
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
  26: "water_jet_qty",
  27: "air_controller_qty",
  28: "jet_pump_qty",
  29: "HeatPump_QTY",
};

// ================================
// FORMATTERS
// ================================
function formatINR(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return "Rs. 0.00";
  const num = Number(amount);
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const formatted = rest !== ""
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3
    : last3;
  return `Rs. ${formatted}.${decPart}`;
}

function safeNum(v, d = 2) {
  if (v === null || v === undefined || isNaN(Number(v))) return "0." + "0".repeat(d);
  return Number(v).toFixed(d);
}

// ================================
// IMAGE HELPERS
// ================================
async function imageToBase64(imageUrl) {
  if (!imageUrl) return null;
  try {
    if (imageUrl.startsWith("data:image")) return imageUrl.split(",")[1];
    let url = imageUrl;
    if (!url.startsWith("http") && !url.startsWith("/")) {
      url = `${typeof window !== "undefined" ? window.location.origin : ""}/admin/static/${url}`;
    } else if (url.startsWith("/") && typeof window !== "undefined") {
      url = `${window.location.origin}${url}`;
    }
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result.split(",")[1] : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadLogoAsBase64(logoUrl) {
  if (!logoUrl) return null;
  try {
    const BACKEND = "https://pool-costing-api.intelithon.in";
    let fullUrl = logoUrl;
    if (!fullUrl.startsWith("http")) {
      const clean = fullUrl.startsWith("/") ? fullUrl.substring(1) : fullUrl;
      fullUrl = `${BACKEND}/${clean}`;
    }
    const response = await fetch(fullUrl, { method: "GET", cache: "no-cache" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadStampAsBase64(stampUrl) {
  if (!stampUrl) return null;
  try {
    const BACKEND = "https://pool-costing-api.intelithon.in";
    let fullUrl = stampUrl;
    if (!fullUrl.startsWith("http")) {
      const clean = fullUrl.startsWith("/") ? fullUrl.substring(1) : fullUrl;
      fullUrl = `${BACKEND}/${clean}`;
    }
    const response = await fetch(fullUrl, { method: "GET", cache: "no-cache" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ================================
// DEFAULT COMPANY PROFILE
// ================================
const DEFAULT_COMPANY_PROFILE = {
  company_name: "INTELITHON TECHNOLOGIES",
  company_code: "INT",
  address: "No. 1, 1st Floor, Deepa Towers, Esther Enclave, Horamavu, Bangalore, Karnataka - 560043",
  phone: "+91 9964457127",
  email: "intelithontech@gmail.com",
  website: "www.intelithon.in",
  logo_url: null,
  stamp_url: null,
  gst: "GSTIN: 29AAGCI1234B1Z5",
  pan: "",
};

// ================================
// STYLE HELPERS
// ================================
function fillSolid(hex) {
  return { type: "pattern", pattern: "solid", fgColor: { argb: `FF${hex}` } };
}

function borderAll() {
  const b = { style: "thin", color: { argb: `FF${COLORS.border}` } };
  return { top: b, left: b, bottom: b, right: b };
}

function borderNone() {
  const b = { style: "none" };
  return { top: b, left: b, bottom: b, right: b };
}

function applyCell(cell, opts = {}) {
  const {
    fill = COLORS.light,
    fontSize = 11,
    bold = false,
    italic = false,
    color = COLORS.text,
    h = "left",
    v = "middle",
    wrap = false,
    borders = true,
  } = opts;
  cell.fill = fillSolid(fill);
  cell.font = { name: "Arial", size: fontSize, bold, italic, color: { argb: `FF${color}` } };
  cell.alignment = { horizontal: h, vertical: v, wrapText: wrap };
  cell.border = borders ? borderAll() : borderNone();
}

function mc(sheet, r1, r2, c1, c2) {
  const L = (n) => String.fromCharCode(64 + n);
  sheet.mergeCells(`${L(c1)}${r1}:${L(c2)}${r2}`);
}

function sectionDivider(sheet, row, label, COLS) {
  mc(sheet, row, row, 1, COLS);
  const c = sheet.getCell(`A${row}`);
  c.value = label;
  applyCell(c, { fill: COLORS.primary, fontSize: 14, bold: true, color: COLORS.headerText, h: "center" });
  sheet.getRow(row).height = 32;
  return row + 2;
}

// ================================
// MEP QUANTITY RESOLVER
// ================================
function resolveMepQty(slNo, item, mepQtys, resultData, selectedAdvancedEquipment) {
  if (slNo === 29) {
    return Array.isArray(selectedAdvancedEquipment) && selectedAdvancedEquipment.includes(29) ? 1 : 0;
  }
  if (slNo === 28) return 1;
  if (slNo === 26) {
    return Number(resultData?.water_jets || resultData?.system_parameters?.water_jets || 0);
  }
  if (slNo === 27) {
    return Number(resultData?.air_jets || resultData?.system_parameters?.air_jets || 0);
  }
  if (item.Quantity !== undefined && item.Quantity !== null) return Number(item.Quantity);
  if (item.calculatedQty !== undefined && item.calculatedQty !== null) return Number(item.calculatedQty);
  const field = MEP_QTY_MAP[slNo];
  if (field) {
    if (mepQtys && mepQtys[field] !== undefined) return Number(mepQtys[field]);
    if (resultData?.mep_quantities && resultData.mep_quantities[field] !== undefined) return Number(resultData.mep_quantities[field]);
    if (resultData?.quantities && resultData.quantities[field] !== undefined) return Number(resultData.quantities[field]);
  }
  return 0;
}

// ================================
// MEP RATE RESOLVER
// ================================
function resolveMepRate(slNo, item, dynamicRates) {
  if (slNo === 1 && dynamicRates?.filter_rate > 0) return Number(dynamicRates.filter_rate);
  if (slNo === 7 && dynamicRates?.pump_rate > 0) return Number(dynamicRates.pump_rate);
  if (slNo === 28) return 52500;
  if (item.Rate !== undefined && item.Rate !== null && Number(item.Rate) > 0) return Number(item.Rate);
  if (item.calculatedRate !== undefined && item.calculatedRate !== null && Number(item.calculatedRate) > 0) return Number(item.calculatedRate);
  return Number(item.rate || 0);
}

// ================================
// BUILD CIVIL ITEMS FOR EXCEL
// This mirrors exactly what result.js renderMainPoolTable() does:
// - Uses resultData.civil_items for 1.1 / 1.2 sub-rows (rates + qty + amount)
// - Falls back to excavationSplit (plain numbers) + mainPoolData rates
// - Uses mainPoolData[item].Rate for SlNo 2-14
// - Uses civilQuantities for qty of SlNo 2-14
// ================================
function buildCivilItemsForExcel(mainPoolData, resultData, civilQuantities, excavationSplit) {
  const items = [];

  // Get civil_items from resultData (same as result.js does)
  const civilItemsFromBackend = Array.isArray(resultData?.civil_items) ? resultData.civil_items : [];

  // Find sub-rows from civil_items
  const backendSubRow11 = civilItemsFromBackend.find(ci => String(ci.SlNo) === "1.1");
  const backendSubRow12 = civilItemsFromBackend.find(ci => String(ci.SlNo) === "1.2");

  // excavationSplit["1.1"] and ["1.2"] are plain numbers (qty only) from civilQuantities
  const split = excavationSplit || {};

  // Rates: prefer civil_items, fallback to split object if it has rate key
  const rate_1_1 = Number(backendSubRow11?.Rate ?? split["1.1_rate"] ?? 0);
  const rate_1_2 = Number(backendSubRow12?.Rate ?? split["1.2_rate"] ?? 0);

  // Quantities
  const qty_1_1 = Number(
    backendSubRow11?.Quantity ??
    (typeof split["1.1"] === "object" ? split["1.1"]?.qty : split["1.1"]) ??
    0
  );
  const qty_1_2 = Number(
    backendSubRow12?.Quantity ??
    (typeof split["1.2"] === "object" ? split["1.2"]?.qty : split["1.2"]) ??
    0
  );

  // Amounts
  const amount_1_1 = Number(backendSubRow11?.Amount ?? (qty_1_1 * rate_1_1));
  const amount_1_2 = Number(backendSubRow12?.Amount ?? (qty_1_2 * rate_1_2));

  // Descriptions
  const desc_1_1 = backendSubRow11?.Description ?? "Earth Excavation up to 1.5m depth";
  const desc_1_2 = backendSubRow12?.Description ?? "Earth Excavation beyond 1.5m depth";

  const totalExcavationQty = Number(civilQuantities?.[MAIN_POOL_QTY_MAP[1]] ?? resultData?.civil_quantities?.[MAIN_POOL_QTY_MAP[1]] ?? 0);

  // Sort mainPoolData by SlNo
  const sorted = [...mainPoolData]
    .filter(item => MAIN_POOL_QTY_MAP[item.SlNo])
    .sort((a, b) => a.SlNo - b.SlNo);

  let displayIdx = 1;

  for (const item of sorted) {
    const slNo = item.SlNo;

    if (slNo === 1) {
      // PARENT ROW
      items.push({
        SlNo: 1,
        displaySlNo: displayIdx++,
        isParent: true,
        isSubRow: false,
        Description: item.Description || "Earth Excavation",
        Code: item.Code || "",
        Unit: item.Unit || "Cum",
        Image: item.Image || null,
        Quantity: totalExcavationQty,
        Rate: 0,
        Amount: 0,
        originalSlNo: 1,
      });

      // SUB ROW 1.1
      items.push({
        SlNo: "1.1",
        displaySlNo: null,
        isParent: false,
        isSubRow: true,
        Description: desc_1_1,
        Code: "",
        Unit: item.Unit || "Cum",
        Image: null,
        Quantity: qty_1_1,
        Rate: rate_1_1,
        Amount: amount_1_1,
        originalSlNo: 1,
      });

      // SUB ROW 1.2
      items.push({
        SlNo: "1.2",
        displaySlNo: null,
        isParent: false,
        isSubRow: true,
        Description: desc_1_2,
        Code: "",
        Unit: item.Unit || "Cum",
        Image: null,
        Quantity: qty_1_2,
        Rate: rate_1_2,
        Amount: amount_1_2,
        originalSlNo: 1,
      });

    } else {
      // NORMAL ROWS (SlNo 2-14)
      const field = MAIN_POOL_QTY_MAP[slNo];
      const qty = Number(
        civilQuantities?.[field] ??
        resultData?.civil_quantities?.[field] ??
        0
      );
      const rate = Number(item.Rate || 0);
      const amount = qty * rate;

      items.push({
        SlNo: slNo,
        displaySlNo: displayIdx++,
        isParent: false,
        isSubRow: false,
        Description: item.Description || "",
        Code: item.Code || "",
        Unit: item.Unit || "",
        Image: item.Image || null,
        Quantity: qty,
        Rate: rate,
        Amount: amount,
        originalSlNo: slNo,
      });
    }
  }

  return items;
}

// ================================
// BUILD PUMP ROOM ITEMS FOR EXCEL
// ================================
function buildPumpRoomItemsForExcel(pumpRoomData, pumpRoomQuantities, resultData) {
  const sorted = [...pumpRoomData]
    .filter(item => PUMP_ROOM_QTY_MAP[item.SlNo])
    .sort((a, b) => a.SlNo - b.SlNo);

  return sorted.map((item, idx) => {
    const slNo = item.SlNo;
    const field = PUMP_ROOM_QTY_MAP[slNo];
    const qty = Number(
      pumpRoomQuantities?.[field] ??
      resultData?.pump_room_quantities?.[field] ??
      resultData?.pump_room_calculation?.[field] ??
      0
    );
    const rate = Number(item.Rate || 0);
    const amount = qty * rate;

    return {
      SlNo: slNo,
      displaySlNo: idx + 1,
      isParent: false,
      isSubRow: false,
      Description: item.Description || "",
      Code: item.Code || "",
      Unit: item.Unit || "",
      Image: item.Image || null,
      Quantity: qty,
      Rate: rate,
      Amount: amount,
      originalSlNo: slNo,
    };
  });
}

// ================================
// CIVIL TABLE BUILDER (Main Pool & Pump Room)
// ================================
async function buildCivilTable(sheet, startRow, title, items, remarks, colVis) {
  if (!items || items.length === 0) return { currentRow: startRow, total: 0 };
  const TCOLS = 9;
  let row = startRow;

  // Title row
  mc(sheet, row, row, 1, TCOLS);
  let c = sheet.getCell(`A${row}`);
  c.value = title;
  applyCell(c, { fill: COLORS.primary, fontSize: 13, bold: true, color: COLORS.headerText, h: "center" });
  sheet.getRow(row).height = 28;
  row++;

  // Header row
  ["Sl.No", "Code", "Description", "Image", "Unit", "QTY", "Rate (Rs.)", "Amount (Rs.)", "Remarks"].forEach((label, i) => {
    const cell = sheet.getCell(row, i + 1);
    cell.value = label;
    applyCell(cell, { fill: COLORS.groupBg, fontSize: 10, bold: true, color: COLORS.headerText, h: "center" });
  });
  sheet.getRow(row).height = 26;
  row++;

  let total = 0;
  const imgPromises = [];

  for (const item of items) {
    if (!item) continue;

    const isParent = item.isParent === true;
    const isSubRow = item.isSubRow === true;
    const qty    = Number(item.Quantity || 0);
    const rate   = Number(item.Rate || 0);
    const amt    = Number(item.Amount || (qty * rate));
    const slNoStr = String(item.SlNo);

    // Only count non-parent rows in total
    if (!isParent) total += amt;

    const bg   = isSubRow ? COLORS.subRowBg : (isParent ? COLORS.sectionBg : COLORS.light);
    const desc = item.Description || "";
    const code = item.Code || "";
    const unit = item.Unit || "";
    const img  = item.Image || null;
    const rh   = row;

    const set = (col, val, opts = {}) => {
      const cell = sheet.getCell(rh, col);
      cell.value = val;
      applyCell(cell, { fill: bg, ...opts });
    };

    if (isParent) {
      // PARENT ROW — bold header, dash for qty/rate/amount
      set(1, item.displaySlNo || slNoStr, { h: "center", bold: true });
      set(2, colVis.code ? code : "", { h: "center", fontSize: 10 });
      set(3, desc, { wrap: true, v: "top", bold: true });
      set(4, "", { h: "center", v: "middle" });
      set(5, colVis.unit ? unit : "", { h: "center" });
      set(6, colVis.qty ? "—" : "", { h: "center", color: COLORS.lightText });
      set(7, colVis.fixedRate ? "—" : "", { h: "right", color: COLORS.lightText });
      set(8, "—", { h: "right", color: COLORS.lightText });
      set(9, colVis.remarks ? (remarks?.[item.originalSlNo || 1] || "") : "", { wrap: true, v: "top", fontSize: 10, color: COLORS.lightText });

    } else if (isSubRow) {
      // SUB ROW 1.1 / 1.2 — indented, italic
      set(1, slNoStr, { h: "center", fontSize: 10, italic: true });
      set(2, colVis.code ? "" : "", { h: "center", fontSize: 10, italic: true });
      set(3, `↳ ${desc}`, { wrap: true, v: "top", italic: true });
      set(4, "", { h: "center", v: "middle" });
      set(5, colVis.unit ? unit : "", { h: "center" });
      set(6, colVis.qty ? (qty > 0 ? parseFloat(safeNum(qty, 3)) : 0) : "", { h: "center" });
      set(7, colVis.fixedRate ? (rate > 0 ? parseFloat(safeNum(rate, 2)) : 0) : "", { h: "right" });
      set(8, parseFloat(safeNum(amt, 2)), { h: "right", bold: true, fill: COLORS.amountCol });
      set(9, colVis.remarks ? "" : "", { wrap: true, v: "top", fontSize: 10, color: COLORS.lightText });

    } else {
      // NORMAL ROW
      set(1, item.displaySlNo || slNoStr, { h: "center" });
      set(2, colVis.code ? code : "", { h: "center", fontSize: 10 });
      set(3, desc, { wrap: true, v: "top" });
      set(4, "", { h: "center", v: "middle" });
      set(5, colVis.unit ? unit : "", { h: "center" });
      set(6, colVis.qty ? parseFloat(safeNum(qty, 3)) : "", { h: "center" });
      set(7, colVis.fixedRate ? parseFloat(safeNum(rate, 2)) : "", { h: "right" });
      set(8, parseFloat(safeNum(amt, 2)), {
        h: "right",
        bold: true
      });
      set(9, colVis.remarks ? (remarks?.[item.originalSlNo || item.SlNo] || "") : "", { wrap: true, v: "top", fontSize: 10, color: COLORS.lightText });
    }

    const lines = Math.max(Math.ceil(desc.length / 55), 1);
    sheet.getRow(rh).height = img ? Math.max(72, 18 + lines * 14) : Math.max(35, 18 + lines * 14);

    if (colVis.image && img) {
      imgPromises.push((async () => {
        try {
          const b64 = await imageToBase64(img);
          if (!b64) return;
          const imgId = sheet.workbook.addImage({ base64: b64, extension: "png" });
          const rh_pts = sheet.getRow(rh).height * 0.75;
          const top = ((rh_pts - 43.5) / 2) / rh_pts;
          sheet.addImage(imgId, {
            tl: { col: 3.32, row: rh - 1 + top + 0.03 },
            ext: { width: 50, height: 50 },
            editAs: "oneCell",
          });
        } catch {}
      })());
    }

    row++;
  }

  await Promise.allSettled(imgPromises);
  row++;

  // Subtotal row
  mc(sheet, row, row, 1, 7);
  mc(sheet, row, row, 8, 9);
  c = sheet.getCell(`A${row}`);
  c.value = `${title} — SUBTOTAL`;
  applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: "right", fontSize: 11, color: COLORS.primary });
  c = sheet.getCell(`H${row}`);
  c.value = formatINR(total);
  applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: "right", fontSize: 11, color: COLORS.primary });
  sheet.getRow(row).height = 26;
  row += 2;

  return { currentRow: row, total };
}

// ================================
// MEP TABLE BUILDER
// ================================
async function buildMEPTable(sheet, startRow, title, items, colVis, mepQtys, dynamicRates, resultData, selectedAdvancedEquipment) {
  if (!items || items.length === 0) return { currentRow: startRow, total: 0 };
  const TCOLS = 12;
  let row = startRow;

  mc(sheet, row, row, 1, TCOLS);
  let c = sheet.getCell(`A${row}`);
  c.value = title;
  applyCell(c, { fill: COLORS.groupBg, fontSize: 12, bold: true, color: COLORS.headerText, h: "center" });
  sheet.getRow(row).height = 26;
  row++;

  const h1Map = [
    { text: "Sl.No",        c1: 1,  c2: 1  },
    { text: "Code",         c1: 2,  c2: 2  },
    { text: "Description",  c1: 3,  c2: 3  },
    { text: "Image",        c1: 4,  c2: 4  },
    { text: "Unit",         c1: 5,  c2: 5  },
    { text: "QTY",          c1: 6,  c2: 6  },
    { text: "Rate (Rs.)",   c1: 7,  c2: 8  },
    { text: "Amount (Rs.)", c1: 9,  c2: 11 },
    { text: "Remarks",      c1: 12, c2: 12 },
  ];
  h1Map.forEach(({ text, c1, c2 }) => {
    if (c1 !== c2) mc(sheet, row, row, c1, c2);
    const cell = sheet.getCell(row, c1);
    cell.value = text;
    applyCell(cell, { fill: COLORS.primary, fontSize: 10, bold: true, color: COLORS.headerText, h: "center" });
    for (let col = c1 + 1; col <= c2; col++) {
      const sc = sheet.getCell(row, col);
      applyCell(sc, { fill: COLORS.primary, fontSize: 10, bold: true, color: COLORS.headerText, h: "center" });
    }
  });
  sheet.getRow(row).height = 24;
  row++;

  const h2 = ["", "", "", "", "", "", "Supply", "Install", "Supply Amt", "Install Amt", "Total Amt", ""];
  h2.forEach((val, i) => {
    const cell = sheet.getCell(row, i + 1);
    cell.value = val;
    applyCell(cell, { fill: COLORS.accent, fontSize: 9, bold: true, color: COLORS.headerText, h: "center" });
  });
  sheet.getRow(row).height = 22;
  row++;

  let total = 0;
  const imgPromises = [];

  const sortedItems = [...items].sort((a, b) => {
    const slA = a.originalSlNo || a.SlNo;
    const slB = b.originalSlNo || b.SlNo;
    return slA - slB;
  });

  sortedItems.forEach((item, idx) => {
    if (!item) return;
    const bg       = idx % 2 === 0 ? COLORS.light : COLORS.highlight;
    const slNo     = item.originalSlNo || item.SlNo;
    const desc     = item.actualDescription || item.Description || "";
    const code     = item.actualCode || item.Code || "";
    const unit     = item.actualUnit || item.Unit || "";
    const img      = item.actualImage || item.Image || item.image || null;

    const qty         = resolveMepQty(slNo, item, mepQtys, resultData, selectedAdvancedEquipment);
    const supplyRate  = resolveMepRate(slNo, item, dynamicRates);
    const installRate = supplyRate * INSTALLATION_PERCENT;
    const supplyAmt   = qty * supplyRate;
    const installAmt  = qty * installRate;
    const totalAmt    = supplyAmt + installAmt;
    total += totalAmt;

    const rh = row;
    const set = (col, val, opts = {}) => {
      const cell = sheet.getCell(rh, col);
      cell.value = val;
      applyCell(cell, { fill: bg, ...opts });
    };

    set(1,  item.displaySlNo || idx + 1,                                { h: "center" });
    set(2,  colVis.code ? code : "",                                    { h: "center", fontSize: 10 });
    set(3,  desc,                                                       { wrap: true, v: "top" });
    set(4,  "",                                                         { h: "center", v: "middle" });
    set(5,  colVis.unit ? unit : "",                                    { h: "center" });
    set(6,  colVis.qty ? parseFloat(safeNum(qty, 2)) : "",              { h: "center" });
    set(7,  colVis.fixedRate ? parseFloat(safeNum(supplyRate, 2)) : "", { h: "right" });
    set(8,  colVis.fixedRate ? parseFloat(safeNum(installRate, 2)) : "",{ h: "right", color: COLORS.lightText });
    set(9,  parseFloat(safeNum(supplyAmt, 2)),                          { h: "right", fill: COLORS.amountCol });
    set(10, parseFloat(safeNum(installAmt, 2)),                         { h: "right", fill: COLORS.amountCol });
    set(11, parseFloat(safeNum(totalAmt, 2)),                           { h: "right", bold: true, fill: COLORS.subtotalBg });
    set(12, colVis.remarks ? (item.remark || "") : "",                  { wrap: true, v: "top", fontSize: 10, color: COLORS.lightText });

    const lines = Math.max(Math.ceil(desc.length / 50), 1);
    sheet.getRow(rh).height = img ? Math.max(72, 18 + lines * 14) : Math.max(35, 18 + lines * 14);

    if (colVis.image && img) {
      imgPromises.push((async () => {
        try {
          const b64 = await imageToBase64(img);
          if (!b64) return;
          const imgId = sheet.workbook.addImage({ base64: b64, extension: "png" });
          const rh_pts = sheet.getRow(rh).height * 0.75;
          const top = ((rh_pts - 43.5) / 2) / rh_pts;
          sheet.addImage(imgId, {
            tl: { col: 3.25, row: rh - 1 + top },
            ext: { width: 58, height: 58 },
            editAs: "oneCell",
          });
        } catch {}
      })());
    }
    row++;
  });

  await Promise.allSettled(imgPromises);
  row++;

  mc(sheet, row, row, 1, 10);
  mc(sheet, row, row, 11, 12);
  c = sheet.getCell(`A${row}`);
  c.value = `${title} — SUBTOTAL`;
  applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: "right", fontSize: 11, color: COLORS.primary });
  c = sheet.getCell(`K${row}`);
  c.value = formatINR(total);
  applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: "right", fontSize: 12, color: COLORS.primary });
  sheet.getRow(row).height = 28;
  row += 2;

  return { currentRow: row, total };
}

// ================================
// PIPING TABLE BUILDER
// ================================
async function buildPipingTable(sheet, startRow, title, items, colVis) {
  if (!items || items.length === 0) return { currentRow: startRow, total: 0 };
  const TCOLS = 12;
  let row = startRow;

  mc(sheet, row, row, 1, TCOLS);
  let c = sheet.getCell(`A${row}`);
  c.value = title;
  applyCell(c, { fill: COLORS.groupBg, fontSize: 12, bold: true, color: COLORS.headerText, h: "center" });
  sheet.getRow(row).height = 26;
  row++;

  const h1Map = [
    { text: "Sl.No",        c1: 1,  c2: 1  },
    { text: "Code",         c1: 2,  c2: 2  },
    { text: "Description",  c1: 3,  c2: 3  },
    { text: "Dia (mm)",     c1: 4,  c2: 4  },
    { text: "Image",        c1: 5,  c2: 5  },
    { text: "Unit",         c1: 6,  c2: 6  },
    { text: "QTY",          c1: 7,  c2: 7  },
    { text: "Rate (Rs.)",   c1: 8,  c2: 9  },
    { text: "Amount (Rs.)", c1: 10, c2: 12 },
  ];
  h1Map.forEach(({ text, c1, c2 }) => {
    if (c1 !== c2) mc(sheet, row, row, c1, c2);
    const cell = sheet.getCell(row, c1);
    cell.value = text;
    applyCell(cell, { fill: COLORS.primary, fontSize: 10, bold: true, color: COLORS.headerText, h: "center" });
    for (let col = c1 + 1; col <= c2; col++) {
      const sc = sheet.getCell(row, col);
      applyCell(sc, { fill: COLORS.primary, fontSize: 10, bold: true, color: COLORS.headerText, h: "center" });
    }
  });
  sheet.getRow(row).height = 24;
  row++;

  const h2 = ["", "", "", "", "", "", "", "Supply", "Install", "Supply Amt", "Install Amt", "Total Amt"];
  h2.forEach((val, i) => {
    const cell = sheet.getCell(row, i + 1);
    cell.value = val;
    applyCell(cell, { fill: COLORS.accent, fontSize: 9, bold: true, color: COLORS.headerText, h: "center" });
  });
  sheet.getRow(row).height = 22;
  row++;

  let total = 0;
  const imgPromises = [];

  items.forEach((item, idx) => {
    if (!item) return;
    const bg          = idx % 2 === 0 ? COLORS.light : COLORS.highlight;
    const desc        = item.description || item.Description || "";
    const dia         = item.dia || item.Dia || "";
    const code        = item.code || item.Code || "";
    const unit        = item.unit || item.Unit || "m";
    const img         = item.image || item.Image || null;
    const qty         = Number(item.Quantity ?? item.quantity ?? item.qty ?? 0);
    const supplyRate  = Number(item.Rate ?? item.rate ?? 0);
    const installRate = supplyRate * INSTALLATION_PERCENT;
    const supplyAmt   = qty * supplyRate;
    const installAmt  = qty * installRate;
    const totalAmt    = supplyAmt + installAmt;
    total += totalAmt;

    const rh = row;
    const set = (col, val, opts = {}) => {
      const cell = sheet.getCell(rh, col);
      cell.value = val;
      applyCell(cell, { fill: bg, ...opts });
    };

    set(1,  item.displaySlNo || idx + 1,                                { h: "center" });
    set(2,  colVis.code ? code : "",                                    { h: "center", fontSize: 10 });
    set(3,  desc,                                                       { wrap: true, v: "top" });
    set(4,  dia ? String(dia) : "—",                                    { h: "center", fontSize: 10 });
    set(5,  "",                                                         { h: "center", v: "middle" });
    set(6,  colVis.unit ? unit : "",                                    { h: "center" });
    set(7,  colVis.qty ? parseFloat(safeNum(qty, 2)) : "",              { h: "center" });
    set(8,  colVis.fixedRate ? parseFloat(safeNum(supplyRate, 2)) : "", { h: "right" });
    set(9,  colVis.fixedRate ? parseFloat(safeNum(installRate, 2)) : "",{ h: "right", color: COLORS.lightText });
    set(10, parseFloat(safeNum(supplyAmt, 2)),                          { h: "right", fill: COLORS.amountCol });
    set(11, parseFloat(safeNum(installAmt, 2)),                         { h: "right", fill: COLORS.amountCol });
    set(12, parseFloat(safeNum(totalAmt, 2)),                           { h: "right", bold: true, fill: COLORS.subtotalBg });

    const lines = Math.max(Math.ceil(desc.length / 45), 1);
    sheet.getRow(rh).height = img ? Math.max(78, 20 + lines * 14) : Math.max(35, 20 + lines * 14);

    if (colVis.image && img) {
      imgPromises.push((async () => {
        try {
          const b64 = await imageToBase64(img);
          if (!b64) return;
          const imgId = sheet.workbook.addImage({ base64: b64, extension: "png" });
          const rh_pts = sheet.getRow(rh).height * 0.75;
          const top = ((rh_pts - 43.5) / 2) / rh_pts;
          sheet.addImage(imgId, {
            tl: { col: 4.25, row: rh - 1 + top },
            ext: { width: 58, height: 58 },
            editAs: "oneCell",
          });
        } catch {}
      })());
    }
    row++;
  });

  await Promise.allSettled(imgPromises);
  row++;

  mc(sheet, row, row, 1, 11);
  mc(sheet, row, row, 12, 12);
  c = sheet.getCell(`A${row}`);
  c.value = `${title} — SUBTOTAL`;
  applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: "right", fontSize: 11, color: COLORS.primary });
  c = sheet.getCell(`L${row}`);
  c.value = formatINR(total);
  applyCell(c, { fill: COLORS.subtotalBg, bold: true, h: "right", fontSize: 12, color: COLORS.primary });
  sheet.getRow(row).height = 28;
  row += 2;

  return { currentRow: row, total };
}

// ================================
// WATERMARK HELPER
// ================================
async function addWatermark(workbook, sheet, companyName, totalRows) {
  try {
    const wmText  = (companyName || "CONFIDENTIAL").toUpperCase();
    const svgWidth = 600, svgHeight = 200;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="48" font-weight="bold"
        fill="rgba(180,180,200,0.18)"
        transform="rotate(-30, ${svgWidth / 2}, ${svgHeight / 2})"
      >${wmText}</text>
    </svg>`;
    const svgBase64 = btoa(unescape(encodeURIComponent(svg)));
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;
    const canvas  = document.createElement("canvas");
    canvas.width  = svgWidth;
    canvas.height = svgHeight;
    const ctx = canvas.getContext("2d");
    await new Promise((resolve) => {
      const img  = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0); resolve(); };
      img.onerror = () => resolve();
      img.src = dataUrl;
    });
    const pngBase64 = canvas.toDataURL("image/png").split(",")[1];
    if (!pngBase64) return;
    const wmImageId  = workbook.addImage({ base64: pngBase64, extension: "png" });
    const tilesPerRow = 2;
    const rowStep     = 20;
    const numTiles    = Math.ceil(totalRows / rowStep);
    for (let t = 0; t < numTiles; t++) {
      for (let col = 0; col < tilesPerRow; col++) {
        sheet.addImage(wmImageId, {
          tl: { col: col * 5.5 + 0.5, row: t * rowStep + 5 },
          ext: { width: svgWidth * 0.7, height: svgHeight * 0.7 },
          editAs: "absolute",
        });
      }
    }
  } catch (err) {
    console.warn("Watermark generation failed (non-critical):", err);
  }
}

// ================================
// MAIN EXCEL GENERATION FUNCTION
// ================================
export default async function generateJacuzziSpaExcelReport({
  resultData,
  mainPoolData,
  mepItems,
  pumpRoomData,
  pipingItems,
  selectedTables,
  columnVisibility,
  pumpRoomQuantities,
  mepQuantities,
  constructionType,
  poolType = "jacuzzi",
  dynamicRates = {},
  mainPoolRemarks = {},
  pumpRoomRemarks = {},
  mepRemarks = {},
  companyProfile,
  dimensions: dimensionsProp,
  selectedAdvancedEquipment = [],
  excavationSplit = {},
}) {
  console.log("🔧 Starting Jacuzzi/Spa Excel Generation...", { poolType, constructionType });
  console.log("🔍 excavationSplit received:", excavationSplit);
  console.log("🔍 resultData.civil_items:", resultData?.civil_items?.length, resultData?.civil_items);
  console.log("🔍 mainPoolData rates sample:", mainPoolData?.slice(0, 5)?.map(i => ({ SlNo: i.SlNo, Rate: i.Rate, Desc: i.Description })));

  const safeSelTables = selectedTables || DEFAULT_TABLE_SELECTION;
  const safeColVis    = columnVisibility || DEFAULT_COLUMN_VISIBILITY;
  const company       = companyProfile || DEFAULT_COMPANY_PROFILE;

  const dimensions = dimensionsProp || resultData?.dimensions || {
    length: resultData?.length || 0,
    width:  resultData?.width  || 0,
    depth:  resultData?.depth  || resultData?.height || 0,
  };
  const dimL = Number(dimensions.length || 0);
  const dimW = Number(dimensions.width  || 0);
  const dimD = Number(dimensions.depth  || dimensions.height || 0);

  // Get civil quantities — prefer passed civilQuantities from excavationSplit's parent
  // excavationSplit comes from civilQuantities.excavation_split in result.js
  // We need full civilQuantities for SlNo 2-14 — get from resultData
  const civilQtys    = resultData?.civil_quantities || {};
  const finalMepQtys = resultData?.mep_quantities || resultData?.quantities || mepQuantities || {};
  const finalPumpQtys = pumpRoomQuantities || resultData?.pump_room_quantities || resultData?.pump_room_calculation || {};

  const finalPipingItems = Array.isArray(resultData?.piping_items) ? resultData.piping_items
    : Array.isArray(resultData?.piping) ? resultData.piping
    : Array.isArray(pipingItems) ? pipingItems
    : [];

  console.log("📐 Dimensions:", { dimL, dimW, dimD });
  console.log("🏗️ Civil Quantities:", civilQtys);

  if (!Object.values(safeSelTables).some(Boolean)) {
    alert("⚠️ Please select at least one table to export!");
    return false;
  }

  const now     = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  // ================================================================
  // BUILD ALL TABLE DATA
  // ================================================================
  const tableData = {
    mainPool: { items: [], total: 0 },
    pumpRoom: { items: [], total: 0 },
    mep:      { items: [], total: 0 },
    piping:   { items: [], total: 0 },
  };

  // --- MAIN POOL (14 items + excavation sub-rows) ---
  if (safeSelTables.mainPool && mainPoolData?.length) {
    const builtItems = buildCivilItemsForExcel(
      mainPoolData,
      resultData,
      civilQtys,
      excavationSplit
    );
    // Calculate total (skip parent rows)
    let tot = 0;
    builtItems.forEach(item => {
      if (!item.isParent) tot += Number(item.Amount || 0);
    });
    tableData.mainPool.items = builtItems;
    tableData.mainPool.total = tot;
    console.log(`✅ Main Pool: ${builtItems.length} rows (incl parent+subrows), Total: ${formatINR(tot)}`);
  }

  // --- PUMP ROOM (12 items) ---
  if (safeSelTables.pumpRoom && pumpRoomData?.length) {
    const builtItems = buildPumpRoomItemsForExcel(pumpRoomData, finalPumpQtys, resultData);
    let tot = 0;
    builtItems.forEach(item => { tot += Number(item.Amount || 0); });
    tableData.pumpRoom.items = builtItems;
    tableData.pumpRoom.total = tot;
    console.log(`✅ Pump Room: ${builtItems.length} items, Total: ${formatINR(tot)}`);
  }

  // --- MEP (29 items) ---
  if (safeSelTables.mep && mepItems?.length) {
    let tot = 0;
    const filtered = mepItems.filter(item => item.SlNo >= 1 && item.SlNo <= 29);
    const proc = filtered.map((item, idx) => {
      const slNo       = item.SlNo;
      const qty        = resolveMepQty(slNo, item, finalMepQtys, resultData, selectedAdvancedEquipment);
      const supplyRate = resolveMepRate(slNo, item, dynamicRates);
      const totalAmt   = qty * supplyRate * (1 + INSTALLATION_PERCENT);
      tot += totalAmt;
      let desc = item.actualDescription || item.Description || "";
      if (slNo === 26) desc = `${desc} (${qty} jets)`;
      if (slNo === 27) desc = `${desc} (${qty} controllers)`;
      if (slNo === 28) desc = `${desc} (Fixed: Rs.52,500)`;
      if (slNo === 29) desc = `${desc} ${selectedAdvancedEquipment.includes(29) ? "(Selected)" : "(Not Selected)"}`;
      return {
        ...item,
        SlNo: slNo,
        Description: desc,
        originalSlNo: slNo,
        displaySlNo: idx + 1,
        calculatedQty: qty,
        calculatedRate: supplyRate,
        calculatedAmount: totalAmt,
        remark: mepRemarks[slNo] || "",
      };
    }).filter(Boolean);
    proc.sort((a, b) => a.originalSlNo - b.originalSlNo);
    tableData.mep.items = proc.map((x, i) => ({ ...x, displaySlNo: i + 1 }));
    tableData.mep.total = tot;
    console.log(`✅ MEP: ${proc.length} items, Total: ${formatINR(tot)}`);
  }

  // --- PIPING ---
  if (safeSelTables.piping && finalPipingItems.length) {
    let tot = 0;
    const proc = finalPipingItems.map((item, idx) => {
      const qty      = Number(item.Quantity ?? item.quantity ?? item.qty ?? 0);
      const rate     = Number(item.Rate ?? item.rate ?? 0);
      const totalAmt = qty * rate * (1 + INSTALLATION_PERCENT);
      tot += totalAmt;
      return {
        ...item,
        SlNo: idx + 1,
        displaySlNo: idx + 1,
        Description: item.description || item.Description || "",
        description: item.description || item.Description || "",
        Code: item.code || item.Code || "",
        Unit: item.unit || item.Unit || "m",
        Quantity: qty,
        Rate: rate,
        Amount: totalAmt,
        dia: item.dia || item.Dia || "",
        Category: item.Category || item.category || "Other",
      };
    });
    tableData.piping.items = proc;
    tableData.piping.total = tot;
    console.log(`✅ Piping: ${proc.length} items, Total: ${formatINR(tot)}`);
  }

  // ==========================================
  // CREATE WORKBOOK
  // ==========================================
  const workbook      = new ExcelJS.Workbook();
  workbook.creator    = company.company_name || "Jacuzzi Quotation";
  workbook.created    = workbook.modified = now;

  const sheet = workbook.addWorksheet("Jacuzzi Spa Quotation", {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      fitToPage: true,
      fitToWidth: 1,
    },
  });

  sheet.getColumn(1).width = 7;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 48;
  sheet.getColumn(4).width = 14;
  sheet.getColumn(5).width = 8;
  sheet.getColumn(6).width = 10;
  sheet.getColumn(7).width = 10;
  sheet.getColumn(8).width = 14;
  sheet.getColumn(9).width = 16;

  sheet.getColumn(10).width = 12;
  sheet.getColumn(11).width = 12;
  sheet.getColumn(12).width = 14;

  const COLS = 12;
  let row = 1;

  // ==========================================
  // COMPANY HEADER
  // ==========================================
  for (let r = row; r <= row + 3; r++) {
    for (let col = 1; col <= COLS; col++) {
      const cell = sheet.getCell(r, col);
      cell.fill   = fillSolid(COLORS.logoBg);
      cell.border = borderNone();
    }
    sheet.getRow(r).height = 22;
  }

  sheet.mergeCells(`A${row}:C${row + 3}`);
  const logoAreaCell   = sheet.getCell(`A${row}`);
  logoAreaCell.fill    = fillSolid(COLORS.logoBg);
  logoAreaCell.border  = borderNone();
  logoAreaCell.alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells(`D${row}:L${row}`);
  const nameCell  = sheet.getCell(`D${row}`);
  nameCell.value  = company.company_name || "";
  nameCell.fill   = fillSolid(COLORS.logoBg);
  nameCell.font   = { name: "Arial", size: 18, bold: true, color: { argb: `FF${COLORS.primary}` } };
  nameCell.alignment = { horizontal: "right", vertical: "middle" };
  nameCell.border = borderNone();
  sheet.getRow(row).height = 32;

  sheet.mergeCells(`D${row + 1}:L${row + 1}`);
  const addrCell  = sheet.getCell(`D${row + 1}`);
  addrCell.value  = company.address || "";
  addrCell.fill   = fillSolid(COLORS.logoBg);
  addrCell.font   = { name: "Arial", size: 10, color: { argb: `FF${COLORS.lightText}` } };
  addrCell.alignment = { horizontal: "right", vertical: "middle" };
  addrCell.border = borderNone();

  sheet.mergeCells(`D${row + 2}:L${row + 2}`);
  const contactCell  = sheet.getCell(`D${row + 2}`);
  contactCell.value  = [
    company.phone ? `Ph: ${company.phone}` : "",
    company.email ? `Email: ${company.email}` : "",
  ].filter(Boolean).join("   |   ");
  contactCell.fill   = fillSolid(COLORS.logoBg);
  contactCell.font   = { name: "Arial", size: 10, color: { argb: `FF${COLORS.lightText}` } };
  contactCell.alignment = { horizontal: "right", vertical: "middle" };
  contactCell.border = borderNone();

  sheet.mergeCells(`D${row + 3}:L${row + 3}`);
  const extraCell  = sheet.getCell(`D${row + 3}`);
  extraCell.value  = [
    company.website ? `Web: ${company.website}` : "",
    company.gst     ? company.gst : "",
  ].filter(Boolean).join("   |   ");
  extraCell.fill   = fillSolid(COLORS.logoBg);
  extraCell.font   = { name: "Arial", size: 10, color: { argb: `FF${COLORS.lightText}` } };
  extraCell.alignment = { horizontal: "right", vertical: "middle" };
  extraCell.border = borderNone();

  if (company.logo_url) {
    try {
      const lb64 = await loadLogoAsBase64(company.logo_url);
      if (lb64) {
        const imgId = workbook.addImage({ base64: lb64.split(",")[1], extension: "png" });
        sheet.addImage(imgId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 140, height: 80 }, editAs: "oneCell" });
      }
    } catch {}
  }

  row += 4;

  sheet.mergeCells(`A${row}:L${row}`);
  const divCell  = sheet.getCell(`A${row}`);
  divCell.value  = "";
  divCell.fill   = fillSolid(COLORS.primary);
  divCell.border = borderNone();
  sheet.getRow(row).height = 4;
  row += 2;

  // ==========================================
  // QUOTATION TITLE
  // ==========================================
  mc(sheet, row, row, 1, COLS);
  let c = sheet.getCell(`A${row}`);
  c.value = "JACUZZI / SPA — DETAILED QUOTATION";
  applyCell(c, { fill: COLORS.primary, fontSize: 17, bold: true, color: COLORS.headerText, h: "center" });
  sheet.getRow(row).height = 36;
  row += 2;

  // ==========================================
  // BILL TO / QUOTATION DETAILS
  // ==========================================
  const quoteNo = `${company.company_code || "JAC"}/SPA/${now.getFullYear()}/${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const projRef = `${company.company_code || "JAC"}-SPA-${now.getFullYear()}`;
  const lFlds   = [["Name:", ""], ["Address:", ""], ["Phone:", ""], ["PAN:", ""], ["GSTIN:", ""], ["Site Address:", ""]];
  const rFlds   = [["Quotation No:", quoteNo], ["Date:", `${dateStr}  ${timeStr}`], ["Project Ref:", projRef], ["Prepared By:", company.company_name || ""]];

  mc(sheet, row, row, 1, 6);
  c = sheet.getCell(`A${row}`);
  c.value = "BILL TO";
  applyCell(c, { fill: COLORS.secondary, bold: true, fontSize: 11, color: COLORS.headerText, h: "center" });
  mc(sheet, row, row, 7, COLS);
  c = sheet.getCell(`G${row}`);
  c.value = "QUOTATION DETAILS";
  applyCell(c, { fill: COLORS.secondary, bold: true, fontSize: 11, color: COLORS.headerText, h: "center" });
  sheet.getRow(row).height = 26;
  row++;

  for (let i = 0; i < 6; i++) {
    mc(sheet, row, row, 1, 2);
    c = sheet.getCell(`A${row}`);
    c.value = lFlds[i][0];
    applyCell(c, { fill: COLORS.highlight, bold: true, h: "left", fontSize: 10 });
    mc(sheet, row, row, 3, 6);
    c = sheet.getCell(`C${row}`);
    c.value = "";
    applyCell(c, { fill: "FFFFFF", h: "left", fontSize: 10 });
    if (i < rFlds.length) {
      mc(sheet, row, row, 7, 9);
      c = sheet.getCell(`G${row}`);
      c.value = rFlds[i][0];
      applyCell(c, { fill: COLORS.highlight, bold: true, h: "right", fontSize: 10 });
      mc(sheet, row, row, 10, COLS);
      c = sheet.getCell(`J${row}`);
      c.value = rFlds[i][1];
      applyCell(c, { fill: "FFFFFF", h: "left", fontSize: 10 });
    } else {
      mc(sheet, row, row, 7, COLS);
      c = sheet.getCell(`G${row}`);
      c.value = "";
      applyCell(c, { fill: COLORS.highlight });
    }
    sheet.getRow(row).height = 22;
    row++;
  }
  row++;

  // ==========================================
  // SPECIFICATIONS
  // ==========================================
  row = sectionDivider(sheet, row, "JACUZZI / SPA SPECIFICATIONS", COLS);

  const volume   = dimL * dimW * dimD;
  const floorArea = dimL * dimW;
  const prDist   = resultData?.pump_room_distance || resultData?.system_parameters?.pump_room_distance || 15;

  // Get excavation split details for specs
  const civilItems = Array.isArray(resultData?.civil_items) ? resultData.civil_items : [];
  const subRow11   = civilItems.find(ci => String(ci.SlNo) === "1.1");
  const subRow12   = civilItems.find(ci => String(ci.SlNo) === "1.2");
  const qty11      = Number(subRow11?.Quantity ?? (typeof excavationSplit["1.1"] === "object" ? excavationSplit["1.1"]?.qty : excavationSplit["1.1"]) ?? 0);
  const qty12      = Number(subRow12?.Quantity ?? (typeof excavationSplit["1.2"] === "object" ? excavationSplit["1.2"]?.qty : excavationSplit["1.2"]) ?? 0);
  const rate11     = Number(subRow11?.Rate ?? 0);
  const rate12     = Number(subRow12?.Rate ?? 0);

  const specs = [
    ["Project Type:",        "Jacuzzi / Hot Tub Spa"],
    ["Construction Type:",   constructionType === "terrace" ? "Terrace" : "In-Ground"],
    ["Spa Dimensions:",      dimL && dimW && dimD ? `${dimL}m x ${dimW}m x ${dimD}m` : "N/A"],
    ["Spa Volume:",          volume > 0 ? `${safeNum(volume, 2)} m3  (${safeNum(volume * 1000, 0)} Litres)` : "N/A"],
    ["Surface Area:",        floorArea > 0 ? `${safeNum(floorArea, 2)} m2` : "N/A"],
    ["Seating Capacity:",    `${resultData?.seating_capacity || 4} persons`],
    ["Water Jets:",          `${resultData?.water_jets || 16} jets`],
    ["Air Controllers:",     `${resultData?.air_jets || 4} controllers`],
    ["Excavation 1.1 (≤1.5m):", `${safeNum(qty11, 3)} m³ @ Rs.${safeNum(rate11, 2)}/m³`],
    ["Excavation 1.2 (>1.5m):", `${safeNum(qty12, 3)} m³ @ Rs.${safeNum(rate12, 2)}/m³`],
    ["Filter Diameter:",     `${dynamicRates?.filter_dia || resultData?.filter_dia_mm || resultData?.system_parameters?.filter_dia_mm || "N/A"} mm`],
    ["Pump Capacity:",       `${dynamicRates?.hp || resultData?.hp || resultData?.system_parameters?.pump_hp || "N/A"} HP`],
    ["MPV Size:",            `${dynamicRates?.mpv_size || resultData?.mpv_size || "N/A"}`],
    ["Pump Room Distance:",  `${prDist} m`],
    ["Pump Room Dimensions:", resultData?.pump_room_dimensions?.length
      ? `${resultData.pump_room_dimensions.length}m x ${resultData.pump_room_dimensions.width}m x ${resultData.pump_room_dimensions.height}m`
      : "See Pump Room section"],
    ["Filter Rate:",         dynamicRates?.filter_rate > 0 ? formatINR(dynamicRates.filter_rate) : "N/A"],
    ["Pump Rate:",           dynamicRates?.pump_rate > 0  ? formatINR(dynamicRates.pump_rate)  : "N/A"],
    ["Jet Pump Rate:",       "Rs. 52,500 (Fixed)"],
    ["Installation Cost:",   "15% of Supply Cost (applied on MEP and Piping)"],
  ];

  specs.forEach(([label, val], idx) => {
    const bg = idx % 2 === 0 ? COLORS.light : COLORS.highlight;
    mc(sheet, row, row, 1, 5);
    c = sheet.getCell(`A${row}`);
    c.value = label;
    applyCell(c, { fill: bg, bold: true, h: "left", fontSize: 10, color: COLORS.text });
    mc(sheet, row, row, 6, COLS);
    c = sheet.getCell(`F${row}`);
    c.value = val;
    applyCell(c, { fill: bg, h: "left", fontSize: 10, color: COLORS.text });
    sheet.getRow(row).height = 22;
    row++;
  });
  row++;

  // ==========================================
  // COST SUMMARY
  // ==========================================
  row = sectionDivider(sheet, row, "COST SUMMARY", COLS);

  const mainTotal = safeSelTables.mainPool ? tableData.mainPool.total : 0;
  const pumpTotal = safeSelTables.pumpRoom ? tableData.pumpRoom.total : 0;
  const mepTotal  = safeSelTables.mep      ? tableData.mep.total      : 0;
  const pipTotal  = safeSelTables.piping   ? tableData.piping.total   : 0;
  const subTotal  = mainTotal + pumpTotal + mepTotal + pipTotal;
  const gstAmt    = subTotal * 0.18;
  const grandTotal = subTotal + gstAmt;

  mc(sheet, row, row, 1, 9);
  c = sheet.getCell(`A${row}`);
  c.value = "Description";
  applyCell(c, { fill: COLORS.groupBg, bold: true, color: COLORS.headerText, h: "center", fontSize: 11 });
  mc(sheet, row, row, 10, COLS);
  c = sheet.getCell(`J${row}`);
  c.value = "Amount (Rs.)";
  applyCell(c, { fill: COLORS.groupBg, bold: true, color: COLORS.headerText, h: "center", fontSize: 11 });
  sheet.getRow(row).height = 26;
  row++;

  const summaryRows = [
    ["01", "Civil Works — Jacuzzi Structure (14 items)",      mainTotal, false],
    ["02", "Pump Room Civil Works (12 items)",                pumpTotal, false],
    ["03", "MEP Systems & Equipment (29 items)",              mepTotal,  false],
    ...(pipTotal > 0 ? [["04", "Piping System (incl. 15% install)", pipTotal, false]] : []),
    [null, "PROJECT SUB-TOTAL",             subTotal,   "sub"],
    [null, "GST @ 18%",                     gstAmt,     false],
    [null, "GRAND TOTAL (INCL. GST)",       grandTotal, "grand"],
  ];

  summaryRows.forEach(([num, desc, amt, style], i) => {
    const bg = style === "grand" ? COLORS.grandTotalBg
             : style === "sub"   ? COLORS.subtotalBg
             : i % 2 === 0       ? COLORS.light
             : COLORS.highlight;
    const fc = style === "grand" ? COLORS.headerText
             : style === "sub"   ? COLORS.primary
             : COLORS.text;
    mc(sheet, row, row, 1, 9);
    c = sheet.getCell(`A${row}`);
    c.value = num ? `${num}.  ${desc}` : desc;
    applyCell(c, { fill: bg, bold: !!style, h: "left", fontSize: style ? 12 : 11, color: fc });
    mc(sheet, row, row, 10, COLS);
    c = sheet.getCell(`J${row}`);
    c.value = formatINR(amt);
    applyCell(c, { fill: bg, bold: !!style, h: "right", fontSize: style ? 12 : 11, color: fc });
    sheet.getRow(row).height = style === "grand" ? 32 : style === "sub" ? 28 : 24;
    row++;
  });
  row += 2;

  // ==========================================
  // DETAILED BOQ
  // ==========================================
  row = sectionDivider(sheet, row, "DETAILED BILL OF QUANTITIES", COLS);

  // --- Main Pool Civil Works ---
  if (safeSelTables.mainPool && tableData.mainPool.items.length > 0) {
    const res = await buildCivilTable(
      sheet, row,
      "CIVIL WORKS — JACUZZI STRUCTURE",
      tableData.mainPool.items,
      mainPoolRemarks,
      safeColVis
    );
    row = res.currentRow;
  }

  // --- Pump Room Civil Works ---
  if (safeSelTables.pumpRoom && tableData.pumpRoom.items.length > 0) {
    const res = await buildCivilTable(
      sheet, row,
      "CIVIL WORKS — PUMP ROOM",
      tableData.pumpRoom.items,
      pumpRoomRemarks,
      safeColVis
    );
    row = res.currentRow;
  }

  // --- MEP Systems ---
  if (safeSelTables.mep && tableData.mep.items.length > 0) {
    mc(sheet, row, row, 1, COLS);
    c = sheet.getCell(`A${row}`);
    c.value = "MECHANICAL, ELECTRICAL & PLUMBING SYSTEMS (29 ITEMS)";
    applyCell(c, { fill: COLORS.primary, fontSize: 15, bold: true, color: COLORS.headerText, h: "center" });
    sheet.getRow(row).height = 34;
    row += 2;
    const res = await buildMEPTable(
      sheet, row,
      "MEP SYSTEMS — JACUZZI/SPA",
      tableData.mep.items,
      safeColVis,
      finalMepQtys,
      dynamicRates,
      resultData,
      selectedAdvancedEquipment
    );
    row = res.currentRow;
  }

  // --- Piping Systems ---
  if (safeSelTables.piping && tableData.piping.items.length > 0) {
    const pipGroups = [
      { items: tableData.piping.items.filter(i => (i.Category || "").toLowerCase() === "pipe"),   label: "PIPING SYSTEM — PIPES",             title: "PIPES"             },
      { items: tableData.piping.items.filter(i => (i.Category || "").toLowerCase() === "valve"),  label: "PIPING SYSTEM — VALVES",            title: "VALVES"            },
      { items: tableData.piping.items.filter(i => (i.Category || "").toLowerCase() === "flange"), label: "PIPING SYSTEM — FLANGES",           title: "FLANGES"           },
      { items: tableData.piping.items.filter(i => !["pipe","valve","flange"].includes((i.Category || "").toLowerCase())), label: "PIPING SYSTEM — OTHER COMPONENTS", title: "OTHER COMPONENTS" },
    ];

    let anyPiping = false;
    for (const grp of pipGroups) {
      if (!grp.items.length) continue;
      mc(sheet, row, row, 1, COLS);
      c = sheet.getCell(`A${row}`);
      c.value = grp.label;
      applyCell(c, { fill: COLORS.primary, fontSize: 15, bold: true, color: COLORS.headerText, h: "center" });
      sheet.getRow(row).height = 34;
      row += 2;
      const res = await buildPipingTable(sheet, row, grp.title, grp.items, safeColVis);
      row = res.currentRow;
      anyPiping = true;
    }

    if (!anyPiping) {
      mc(sheet, row, row, 1, COLS);
      c = sheet.getCell(`A${row}`);
      c.value = "PIPING SYSTEM";
      applyCell(c, { fill: COLORS.primary, fontSize: 15, bold: true, color: COLORS.headerText, h: "center" });
      sheet.getRow(row).height = 34;
      row += 2;
      const res = await buildPipingTable(sheet, row, "PIPING SYSTEM", tableData.piping.items, safeColVis);
      row = res.currentRow;
    }
  }

  row += 2;

  // ==========================================
  // TERMS & CONDITIONS
  // ==========================================
  row = sectionDivider(sheet, row, "TERMS & CONDITIONS", COLS);
  const terms = [
    "1.  Prices are valid for 30 days from the date of this quotation.",
    "2.  Delivery:",
    "    • Materials in stock: 2–3 weeks from Purchase Order date.",
    "    • Imported materials: 12–14 weeks from PO date against advance payment.",
    "3.  After 30 days from confirmation, revised charges may apply.",
    "4.  Materials dispatched only against PO & advance payment in favour of:",
    `    ${company.company_name || ""}`,
    "5.  Taxes: GST and all applicable taxes are additional.",
    "6.  Payment Terms:",
    "    50% — Advance with Purchase Order / Work Order.",
    "    40% — Before dispatch of materials.",
    "    10% — Balance on successful testing & commissioning.",
    "7.  Scope of Work: Supply, Installation, Testing & Commissioning of Jacuzzi/Spa MEP & Tiling Works.",
    "    Quantities may vary subject to site conditions.",
    "8.  Cost estimates are based on current industry standards; actual costs may vary ±10–15%.",
    "9.  Exclusions (client scope):",
    "    • Incoming electrical power supply to plant room.",
    "    • Electrical conduit from power source to plant room.",
    "    • Earthing near panel board in plant room.",
    "    • Backwash pipes from plant room to storm water / waste drain.",
    "    • Floor trap connections to storm water / waste drain.",
    "    • Pedestal / foundation for pumps & equipment.",
    "    • Water and electrical supply for testing & commissioning.",
    "10. Any changes in site conditions will be communicated before commencement of work.",
    "11. Banking Details:",
    `    Account Name : ${company.company_name || ""}`,
    "    Account No.  : XXXXXXXXXX",
    "    Bank & Branch: HDFC Bank, Horamavu Agara Branch, Bengaluru – 560043",
    "    IFSC Code    : HDFC0XXXXXX",
  ];
  terms.forEach(term => {
    mc(sheet, row, row, 1, COLS);
    c = sheet.getCell(`A${row}`);
    c.value = term;
    applyCell(c, { fill: term.startsWith(" ") ? "FFFFFF" : COLORS.sectionBg, fontSize: 10, h: "left", color: COLORS.text });
    sheet.getRow(row).height = 22;
    row++;
  });
  row += 2;

  // ==========================================
  // FOOTER
  // ==========================================
  mc(sheet, row, row, 1, COLS);
  c = sheet.getCell(`A${row}`);
  c.value = `Thank you for choosing ${company.company_name?.trim() || "Intelithon Technologies"} for your Jacuzzi/Spa project.`;
  applyCell(c, { fill: COLORS.sectionBg, fontSize: 11, h: "center", italic: true, color: COLORS.primary });
  sheet.getRow(row).height = 26;
  row += 2;

  mc(sheet, row, row, 1, COLS);
  c = sheet.getCell(`A${row}`);
  c.value = [company.address, company.phone, company.email, company.website].filter(Boolean).join("   |   ");
  applyCell(c, { fill: COLORS.primary, fontSize: 9, h: "center", color: COLORS.headerText });
  sheet.getRow(row).height = 22;
  row += 2;

  // ==========================================
  // AUTHORIZED SIGNATORY
  // ==========================================
  row = sectionDivider(sheet, row, "AUTHORIZED SIGNATORY", COLS);

  if (company.stamp_url) {
    try {
      const stampB64 = await loadStampAsBase64(company.stamp_url);
      if (stampB64) {
        const stampId = workbook.addImage({ base64: stampB64.split(",")[1], extension: "png" });
        mc(sheet, row, row + 1, 4, 8);
        sheet.addImage(stampId, { tl: { col: 3.2, row: row - 1 + 0.1 }, ext: { width: 120, height: 50 }, editAs: "oneCell" });
        for (let r = row; r <= row + 1; r++) sheet.getRow(r).height = 28;
        row += 2;
      } else {
        row += 2;
      }
    } catch {
      row += 2;
    }
  } else {
    row += 2;
  }

  [
    { text: "________________________",                                    bold: false, clr: COLORS.text,      h: 24 },
    { text: "Director — Mr Shreyas.R",                                    bold: true,  clr: COLORS.primary,   h: 24 },
    { text: "Director – Projects",                                         bold: false, clr: COLORS.lightText, h: 22 },
    { text: `For ${company.company_name?.trim() || "Intelithon Technologies"}`, bold: true,  clr: COLORS.primary,   h: 24 },
  ].forEach(({ text, bold, clr, h }) => {
    mc(sheet, row, row, 1, COLS);
    c = sheet.getCell(`A${row}`);
    c.value = text;
    applyCell(c, { fill: COLORS.light, bold, h: "center", fontSize: bold ? 12 : 11, color: clr });
    sheet.getRow(row).height = h;
    row++;
  });
  row += 2;

  mc(sheet, row, row, 1, COLS);
  c = sheet.getCell(`A${row}`);
  c.value = `Generated on ${dateStr} at ${timeStr}  |  Page 1 of 1`;
  applyCell(c, { fill: COLORS.highlight, fontSize: 9, h: "center", italic: true, color: COLORS.lightText });
  sheet.getRow(row).height = 18;
  row++;

  await addWatermark(workbook, sheet, company.company_name || "", row);

  // ==========================================
  // SAVE FILE
  // ==========================================
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const fname  = `${(company.company_name || "Jacuzzi_Quotation").replace(/\s+/g, "_")}_${dateStr.replace(/\//g, "-")}.xlsx`;
    saveAs(new Blob([buffer]), fname);
    console.log("✅ Excel saved:", fname);
    console.log("📊 Final Totals:", {
      mainPool:  formatINR(tableData.mainPool.total),
      pumpRoom:  formatINR(tableData.pumpRoom.total),
      mep:       formatINR(tableData.mep.total),
      piping:    formatINR(tableData.piping.total),
      subTotal:  formatINR(subTotal),
      gst:       formatINR(gstAmt),
      grand:     formatINR(grandTotal),
      excavation11: `qty=${qty11}, rate=${rate11}`,
      excavation12: `qty=${qty12}, rate=${rate12}`,
    });
    return true;
  } catch (err) {
    console.error("❌ Excel save failed:", err);
    alert("Failed to generate Excel. Check console for details.");
    return false;
  }
}