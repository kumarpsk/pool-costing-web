import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ================================
// PROFESSIONAL COLOR SCHEME
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
};

const INSTALLATION_PERCENT = 0.15;

// ================================
// QUANTITY FIELD NAME MAPS (EXACT MATCH WITH BACKEND)
// ================================

// Main Pool Civil Works - 12 items (SlNo 1-12)
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
  12: "Tiling_QTY",
};

// Pump Room Civil Works - 10 items (SlNo 1-10)
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
  10: "plastering_QTY_2",
};

// WATER BODY MEP QUANTITY FIELDS - 28 ITEMS (SlNo 1-28)
const MEP_QTY_MAP = {
  // Filter System (1-7)
  1: "filter_QTY",
  2: "glass_media_QTY",
  3: "pressure_gauge_QTY",
  4: "drain_valve_QTY",
  5: "mpv_QTY",
  6: "mpv_connect_QTY",
  7: "pump_QTY",
  
  // Pool Heads & Drains (8-10)
  8: "return_inlets_QTY",
  9: "main_drain_QTY",
  10: "skimmer_QTY",
  
  // Electrical & Lighting (11-14)
  11: "underwater_light_QTY",
  12: "light_transformer_QTY",
  13: "control_panel_QTY",
  14: "cable_conduit_QTY",
  15: "earthing_QTY",
  
  // Cleaning Equipment (16-23)
  16: "floating_hose_QTY",
  17: "aluminium_brush_QTY",
  18: "algae_brush_QTY",
  19: "deep_net_QTY",
  20: "telescopic_handle_QTY",
  21: "pool_cleaner_QTY",
  22: "test_kit_QTY",
  23: "curved_brush_QTY",
  
  // Waterfall Systems (24-25)
  24: "waterfall_nozzle_QTY",
  25: "waterfall_pump_QTY",
  
  // Percentage-based items (26-28) - calculated, not from database
  26: "pipes_fittings_QTY",
  27: "ball_check_valves_QTY",
  28: "puddle_flanges_QTY",
  29: "installation_commissioning_QTY"
};

// PIPING ITEMS - These come from piping.py calculation
const PIPING_CATEGORIES = ["Pipe", "Valve", "Flange", "Fitting"];

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
  const formatted = rest !== "" ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
  return `Rs. ${formatted}.${decPart}`;
}

function formatCurrency(amount, currency = 'INR', exchangeRate = 83) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return currency === 'INR' ? "Rs. 0.00" : "$0.00";
  const num = Number(amount);
  if (currency === 'USD') {
    const usdAmount = num / exchangeRate;
    return `$${usdAmount.toFixed(2)}`;
  }
  return formatINR(num);
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

// Merge cells using 1-based column numbers
function mc(sheet, r1, r2, c1, c2) {
  const L = (n) => String.fromCharCode(64 + n);
  sheet.mergeCells(`${L(c1)}${r1}:${L(c2)}${r2}`);
}

// Section divider banner
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
function resolveMepQty(slNo, item, mepQtys, resultData) {
  if (item.calculatedQty !== undefined && item.calculatedQty !== null) {
    return Number(item.calculatedQty);
  }
  
  const field = MEP_QTY_MAP[slNo];
  if (field) {
    if (mepQtys && mepQtys[field] !== undefined) {
      return Number(mepQtys[field]);
    }
    if (resultData?.mep_quantities && resultData.mep_quantities[field] !== undefined) {
      return Number(resultData.mep_quantities[field]);
    }
    if (resultData?.quantities && resultData.quantities[field] !== undefined) {
      return Number(resultData.quantities[field]);
    }
  }
  
  return 0;
}

// ================================
// MEP RATE RESOLVER
// ================================
function resolveMepRate(slNo, item, dynamicRates) {
  if (slNo === 1 && dynamicRates?.filter_rate > 0) {
    return Number(dynamicRates.filter_rate);
  }
  if (slNo === 7 && dynamicRates?.pump_rate > 0) {
    return Number(dynamicRates.pump_rate);
  }
  if (item.calculatedRate !== undefined && item.calculatedRate !== null && Number(item.calculatedRate) > 0) {
    return Number(item.calculatedRate);
  }
  return Number(item.Rate || item.rate || 0);
}

// ================================
// PERCENTAGE ITEM CALCULATIONS
// ================================
function calculatePercentageAmount(slNo, baseMepTotal) {
  if (slNo === 26) {
    return baseMepTotal * 0.28;  // Pipes & Fittings
  } else if (slNo === 27) {
    return baseMepTotal * 0.10;  // Ball & Check Valves
  } else if (slNo === 28) {
    return baseMepTotal * 0.02;  // Puddle Flanges
  } else if (slNo === 29) {
    const amount26 = baseMepTotal * 0.28;
    const amount27 = baseMepTotal * 0.10;
    const amount28 = baseMepTotal * 0.02;
    const totalBeforeInstallation = baseMepTotal + amount26 + amount27 + amount28;
    return totalBeforeInstallation * 0.25;
  }
  return 0;
}

function calculateBaseMepTotal(mepItems, dynamicRates, mepQtys, resultData) {
  if (!mepItems || mepItems.length === 0) return 0;
  
  let total = 0;
  mepItems.forEach((item) => {
    const sl = item.SlNo;
    if (sl >= 1 && sl <= 25) {
      const qty = resolveMepQty(sl, item, mepQtys, resultData);
      const supplyRate = resolveMepRate(sl, item, dynamicRates);
      total += qty * supplyRate;
    }
  });
  return total;
}

// ================================
// CIVIL TABLE BUILDER - FIXED REMARKS COLUMN GAP
// ================================
async function buildCivilTable(sheet, startRow, title, items, remarks, colVis, qtyMap, qtysData, resultData, constructionType) {
  if (!items || items.length === 0) return { currentRow: startRow, total: 0 };
  // Using 12 columns total for civil table to match the main sheet layout
  const TCOLS = 12;
  let row = startRow;

  // Title row - spans all 12 columns
  mc(sheet, row, row, 1, TCOLS);
  let c = sheet.getCell(`A${row}`);
  c.value = title;
  applyCell(c, { fill: COLORS.primary, fontSize: 13, bold: true, color: COLORS.headerText, h: "center" });
  sheet.getRow(row).height = 28;
  row++;

  // Header row - properly distributed across 12 columns
  // Column mapping: 1:SlNo, 2:Code, 3:Description, 4:Image, 5:Unit, 6:QTY, 7:Rate, 8:Amount, 9-12:Remarks (merged)
  const headers = [
    { col: 1, label: "Sl.No" },
    { col: 2, label: "Code" },
    { col: 3, label: "Description" },
    { col: 4, label: "Image" },
    { col: 5, label: "Unit" },
    { col: 6, label: "QTY" },
    { col: 7, label: "Rate (Rs.)" },
    { col: 8, label: "Amount (Rs.)" },
  ];
  
  headers.forEach(({ col, label }) => {
    const cell = sheet.getCell(row, col);
    cell.value = label;
    applyCell(cell, { fill: COLORS.groupBg, fontSize: 10, bold: true, color: COLORS.headerText, h: "center" });
  });
  
  // Remarks spans columns 9-12 (4 columns merged)
  mc(sheet, row, row, 9, TCOLS);
  const remarksHeaderCell = sheet.getCell(row, 9);
  remarksHeaderCell.value = "Remarks";
  applyCell(remarksHeaderCell, { fill: COLORS.groupBg, fontSize: 10, bold: true, color: COLORS.headerText, h: "center" });
  
  sheet.getRow(row).height = 26;
  row++;

  let total = 0;
  const imgPromises = [];

  items.forEach((item, idx) => {
    if (!item) return;
    const bg = idx % 2 === 0 ? COLORS.light : COLORS.highlight;
    const slNo = item.originalSlNo || item.SlNo;
    const field = qtyMap[slNo];

    let qty = 0;
    if (item.calculatedQty !== undefined) qty = Number(item.calculatedQty);
    else if (field && qtysData?.[field] !== undefined) qty = Number(qtysData[field]);
    else if (field && resultData?.civil_quantities?.[field] !== undefined) qty = Number(resultData.civil_quantities[field]);

    const rate = Number(item.calculatedRate || item.Rate || 0);
    const amt = qty * rate;
    total += amt;

    let desc = item.actualDescription || item.Description || "";
    const isTerraceZeroQuantity = constructionType === 'terrace' && [1, 2, 3, 4, 5].includes(slNo) && qty === 0;
    if (isTerraceZeroQuantity) desc += " (Not required for terrace)";

    const code = item.actualCode || item.Code || "";
    const unit = item.actualUnit || item.Unit || "";
    const img = item.actualImage || item.Image || item.image || null;
    const rh = row;

    // Helper to set cell with proper styling
    const set = (col, val, opts = {}) => {
      const cell = sheet.getCell(rh, col);
      cell.value = val;
      applyCell(cell, { fill: bg, ...opts });
    };

    set(1, item.displaySlNo || idx + 1, { h: "center" });
    set(2, colVis.code ? code : "", { h: "center", fontSize: 10 });
    set(3, desc, { wrap: true, v: "top" });
    set(4, "", { h: "center", v: "middle" });
    set(5, colVis.unit ? unit : "", { h: "center" });
    set(6, colVis.qty ? parseFloat(safeNum(qty, 3)) : "", { h: "center" });
    set(7, colVis.fixedRate ? parseFloat(safeNum(rate, 2)) : "", { h: "right" });
    set(8, parseFloat(safeNum(amt, 2)), { h: "right", bold: true, fill: COLORS.amountCol });
    
    // Remarks spans columns 9-12 (merged)
    mc(sheet, rh, rh, 9, TCOLS);
    const remarksCell = sheet.getCell(rh, 9);
    remarksCell.value = colVis.remarks ? (remarks?.[slNo] || "") : "";
    applyCell(remarksCell, { fill: bg, wrap: true, v: "top", fontSize: 10, color: COLORS.lightText, h: "left" });

    // Calculate row height based on content
    const lines = Math.max(Math.ceil(desc.length / 55), 1);
    const remarksLines = Math.max(Math.ceil((remarks?.[slNo] || "").length / 60), 1);
    const totalLines = Math.max(lines, remarksLines);
    sheet.getRow(rh).height = img ? Math.max(72, 18 + totalLines * 14) : Math.max(35, 18 + totalLines * 14);

    // Handle image insertion
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
            editAs: "oneCell" 
          });
        } catch {}
      })());
    }
    row++;
  });

  await Promise.allSettled(imgPromises);
  row++;

  // Subtotal row - spans columns 1-7 and 8-12
  mc(sheet, row, row, 1, 7);
  mc(sheet, row, row, 8, TCOLS);
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
// MEP TABLE BUILDER - 29 ITEMS (SlNo 1-29) WITH SUPPLY + INSTALLATION
// ================================
async function buildMEPTable(sheet, startRow, title, items, colVis, mepQtys, dynamicRates, resultData, baseMepTotal, percentageAmounts) {
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
    { text: "Sl.No", c1: 1, c2: 1 },
    { text: "Code", c1: 2, c2: 2 },
    { text: "Description", c1: 3, c2: 3 },
    { text: "Image", c1: 4, c2: 4 },
    { text: "Unit", c1: 5, c2: 5 },
    { text: "QTY", c1: 6, c2: 6 },
    { text: "Rate (Rs.)", c1: 7, c2: 8 },
    { text: "Amount (Rs.)", c1: 9, c2: 11 },
    { text: "Remarks", c1: 12, c2: 12 },
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
    const bg = idx % 2 === 0 ? COLORS.light : COLORS.highlight;
    const slNo = item.originalSlNo || item.SlNo;
    let desc = item.actualDescription || item.Description || "";
    const code = item.actualCode || item.Code || "";
    const unit = item.actualUnit || item.Unit || "";
    const img = item.actualImage || item.Image || item.image || null;

    let qty = 0;
    let supplyRate = 0;
    let installRate = 0;
    let supplyAmt = 0;
    let installAmt = 0;
    let totalAmt = 0;

    const isPercentageItem = slNo >= 26 && slNo <= 29;
    
    if (isPercentageItem) {
      totalAmt = percentageAmounts[slNo] || 0;
      supplyAmt = totalAmt;
      installAmt = 0;
      qty = 1;
      supplyRate = totalAmt;
      
      let percentageText = "";
      if (slNo === 26) percentageText = "(28% of Base MEP)";
      else if (slNo === 27) percentageText = "(10% of Base MEP)";
      else if (slNo === 28) percentageText = "(2% of Base MEP)";
      else if (slNo === 29) percentageText = "(25% of Total Before Installation)";
      desc = `${desc} ${percentageText}`;
    } else {
      qty = resolveMepQty(slNo, item, mepQtys, resultData);
      supplyRate = resolveMepRate(slNo, item, dynamicRates);
      installRate = supplyRate * INSTALLATION_PERCENT;
      supplyAmt = qty * supplyRate;
      installAmt = qty * installRate;
      totalAmt = supplyAmt + installAmt;
      
      const showRateSource = (slNo === 1 || slNo === 7) && supplyRate !== Number(item.Rate || 0);
      if (showRateSource) desc += " (Dynamic rate applied)";
    }
    
    total += totalAmt;

    const rh = row;
    const set = (col, val, opts = {}) => {
      const cell = sheet.getCell(rh, col);
      cell.value = val;
      applyCell(cell, { fill: bg, ...opts });
    };

    set(1, item.displaySlNo || idx + 1, { h: "center" });
    set(2, colVis.code ? code : "", { h: "center", fontSize: 10 });
    set(3, desc, { wrap: true, v: "top" });
    set(4, "", { h: "center", v: "middle" });
    set(5, colVis.unit ? unit : "", { h: "center" });
    set(6, colVis.qty ? (isPercentageItem ? "1.00" : parseFloat(safeNum(qty, 2))) : "", { h: "center" });
    set(7, colVis.fixedRate ? (isPercentageItem ? "-" : parseFloat(safeNum(supplyRate, 2))) : "", { h: "right" });
    set(8, colVis.fixedRate ? (isPercentageItem ? "-" : parseFloat(safeNum(installRate, 2))) : "", { h: "right", color: COLORS.lightText });
    set(9, parseFloat(safeNum(supplyAmt, 2)), { h: "right", fill: COLORS.amountCol });
    set(10, parseFloat(safeNum(installAmt, 2)), { h: "right", fill: COLORS.amountCol });
    set(11, parseFloat(safeNum(totalAmt, 2)), { h: "right", bold: true, fill: COLORS.subtotalBg });
    set(12, colVis.remarks ? (item.remark || "") : "", { wrap: true, v: "top", fontSize: 10, color: COLORS.lightText });

    const lines = Math.max(Math.ceil(desc.length / 50), 1);
    sheet.getRow(rh).height = img ? Math.max(72, 18 + lines * 14) : Math.max(35, 18 + lines * 14);

    if (colVis.image && img && !isPercentageItem) {
      imgPromises.push((async () => {
        try {
          const b64 = await imageToBase64(img);
          if (!b64) return;
          const imgId = sheet.workbook.addImage({ base64: b64, extension: "png" });
          const rh_pts = sheet.getRow(rh).height * 0.75;
          const top = ((rh_pts - 43.5) / 2) / rh_pts;
          sheet.addImage(imgId, { tl: { col: 3.25, row: rh - 1 + top }, ext: { width: 58, height: 58 }, editAs: "oneCell" });
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
async function buildPipingTable(sheet, startRow, title, items, colVis, remarks = {}) {
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
    { text: "Sl.No", c1: 1, c2: 1 },
    { text: "Code", c1: 2, c2: 2 },
    { text: "Description", c1: 3, c2: 3 },
    { text: "Dia (mm)", c1: 4, c2: 4 },
    { text: "Image", c1: 5, c2: 5 },
    { text: "Unit", c1: 6, c2: 6 },
    { text: "QTY", c1: 7, c2: 7 },
    { text: "Rate (Rs.)", c1: 8, c2: 9 },
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
    const bg = idx % 2 === 0 ? COLORS.light : COLORS.highlight;
    
    const slNo = item.SlNo || item.slNo || idx + 1;
    const desc = item.description || item.Description || "N/A";
    const dia = item.dia || item.Dia || "";
    const code = item.code || item.Code || "";
    const unit = item.unit || item.Unit || "m";
    const img = item.image || item.Image || null;

    const qty = Number(item.Quantity || item.quantity || 0);
    const supplyRate = Number(item.Rate || item.rate || 0);
    const installRate = supplyRate * INSTALLATION_PERCENT;
    const supplyAmt = qty * supplyRate;
    const installAmt = qty * installRate;
    const totalAmt = supplyAmt + installAmt;
    total += totalAmt;

    const rh = row;
    const set = (col, val, opts = {}) => {
      const cell = sheet.getCell(rh, col);
      cell.value = val;
      applyCell(cell, { fill: bg, ...opts });
    };

    set(1, slNo, { h: "center" });
    set(2, colVis.code ? code : "", { h: "center", fontSize: 10 });
    set(3, desc, { wrap: true, v: "top" });
    set(4, dia ? String(dia) : "—", { h: "center", fontSize: 10 });
    set(5, "", { h: "center", v: "middle" });
    set(6, colVis.unit ? unit : "", { h: "center" });
    set(7, colVis.qty ? parseFloat(safeNum(qty, 2)) : "", { h: "center" });
    set(8, colVis.fixedRate ? parseFloat(safeNum(supplyRate, 2)) : "", { h: "right" });
    set(9, colVis.fixedRate ? parseFloat(safeNum(installRate, 2)) : "", { h: "right", color: COLORS.lightText });
    set(10, parseFloat(safeNum(supplyAmt, 2)), { h: "right", fill: COLORS.amountCol });
    set(11, parseFloat(safeNum(installAmt, 2)), { h: "right", fill: COLORS.amountCol });
    set(12, parseFloat(safeNum(totalAmt, 2)), { h: "right", bold: true, fill: COLORS.subtotalBg });

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
          sheet.addImage(imgId, { tl: { col: 4.25, row: rh - 1 + top }, ext: { width: 58, height: 58 }, editAs: "oneCell" });
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
    const wmText = (companyName || "CONFIDENTIAL").toUpperCase();
    const svgWidth = 600;
    const svgHeight = 200;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
      <text
        x="50%" y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="48"
        font-weight="bold"
        fill="rgba(180,180,200,0.12)"
        transform="rotate(-30, ${svgWidth / 2}, ${svgHeight / 2})"
      >${wmText}</text>
    </svg>`;

    const svgBase64 = btoa(unescape(encodeURIComponent(svg)));
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    const canvas = document.createElement("canvas");
    canvas.width = svgWidth;
    canvas.height = svgHeight;
    const ctx = canvas.getContext("2d");

    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0); resolve(); };
      img.onerror = () => resolve();
      img.src = dataUrl;
    });

    const pngBase64 = canvas.toDataURL("image/png").split(",")[1];
    if (!pngBase64) return;

    const wmImageId = workbook.addImage({ base64: pngBase64, extension: "png" });

    const tilesPerRow = 2;
    const rowStep = 20;
    const numTiles = Math.ceil(totalRows / rowStep);

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
export const generateWaterBodyExcelReport = async ({
  resultData,
  civilItems,
  mepItems,
  pumpRoomData,
  pipingItems = [],
  dimensions,
  totalMepWithPipes,
  civilTotal,
  pumpRoomTotal,
  pipingTotal = 0,
  civilRemarks = {},
  mepRemarks = {},
  pumpRoomRemarks = {},
  currentRates = {},
  currency = 'INR',
  exchangeRate = 83.0,
  includePumpRoom = true,
  pumpRoomDimensions = {},
  mepQuantities = {},
  equipmentSpecs = {},
  pumpRoomQuantities = {},
  constructionType = 'in-ground',
  columnVisibility = {
    image: true, unit: true, qty: true, fixedRate: true, remarks: true, code: true
  },
  selectedTables = {
    civil: true, pumpRoom: true, mep: true, piping: true
  },
  percentageItems = [],
  fallbackPercentageItems = [],
  waterBodyMetrics = {},
  waterBodySpecs = {},
  companyProfile,
}) => {
  console.log("🔧 Starting Water Body Excel generation with PIPING INTEGRATION...");

  const safeSelTables = selectedTables || { civil: true, pumpRoom: true, mep: true, piping: true };
  const safeColVis = columnVisibility || { image: true, unit: true, qty: true, fixedRate: true, remarks: true, code: true };
  const company = companyProfile || DEFAULT_COMPANY_PROFILE;

  // Check if any tables are selected
  if (!Object.values(safeSelTables).some(Boolean)) {
    alert("⚠️ Please select at least one table to export!");
    return false;
  }

  // Get current date
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Resolve dimensions
  const dimL = Number(dimensions?.length || resultData?.dimensions?.length || 0);
  const dimW = Number(dimensions?.width || resultData?.dimensions?.width || 0);
  const dimD = Number(dimensions?.depth || resultData?.dimensions?.depth || 0);

  // Consolidate data sources
  const civilQtys = resultData?.civil_quantities || {};
  const finalMepQtys = resultData?.mep_quantities || mepQuantities || {};
  const finalPumpQtys = resultData?.pump_room_quantities || pumpRoomQuantities || {};

  // Calculate base MEP total for percentage calculations
  const baseMepTotal = calculateBaseMepTotal(mepItems, currentRates, finalMepQtys, resultData);
  
  // Calculate percentage amounts (using SlNo 26-29)
  const percentageAmounts = {
    26: calculatePercentageAmount(26, baseMepTotal),
    27: calculatePercentageAmount(27, baseMepTotal),
    28: calculatePercentageAmount(28, baseMepTotal),
    29: calculatePercentageAmount(29, baseMepTotal),
  };
  
  const totalMepCost = baseMepTotal + percentageAmounts[26] + percentageAmounts[27] + percentageAmounts[28] + percentageAmounts[29];

  console.log("💰 Excel Calculation Results:", {
    baseMepTotal,
    percentageAmounts,
    totalMepCost,
    pipingItemsCount: pipingItems?.length || 0,
    pipingTotalProvided: pipingTotal
  });

  // ==========================================
  // BUILD TABLE DATA
  // ==========================================
  const tableData = {
    civil: { items: [], total: 0 },
    pumpRoom: { items: [], total: 0 },
    mep: { items: [], total: 0 },
    piping: { items: [], total: 0 },
  };

  // Main Pool Civil (12 items)
  if (safeSelTables.civil && civilItems?.length) {
    let tot = 0;
    const proc = civilItems
      .filter(item => MAIN_POOL_QTY_MAP[item.SlNo])
      .map(item => {
        const slNo = item.SlNo;
        const field = MAIN_POOL_QTY_MAP[slNo];
        const qty = Number(civilQtys?.[field] ?? resultData?.civil_quantities?.[field] ?? 0);
        const rate = Number(item.Rate || 0);
        tot += qty * rate;
        
        let desc = item.Description || "";
        const isTerraceZeroQuantity = constructionType === 'terrace' && [1, 2, 3, 4, 5].includes(slNo) && qty === 0;
        if (isTerraceZeroQuantity) desc += " (Not required for terrace)";
        
        return {
          ...item,
          calculatedQty: qty,
          calculatedRate: rate,
          calculatedAmount: qty * rate,
          actualCode: item.Code || "",
          actualUnit: item.Unit || "",
          actualDescription: desc,
          actualImage: item.Image || null,
          originalSlNo: slNo
        };
      }).filter(Boolean);
    tableData.civil.items = proc.map((x, i) => ({ ...x, displaySlNo: i + 1 }));
    tableData.civil.total = tot;
    console.log(`✅ Main Pool Civil: ${proc.length} items, Total: ${formatINR(tot)}`);
  }

  // Pump Room Civil (10 items)
  if (safeSelTables.pumpRoom && pumpRoomData?.length) {
    let tot = 0;
    const proc = pumpRoomData
      .filter(item => PUMP_ROOM_QTY_MAP[item.SlNo])
      .map(item => {
        const slNo = item.SlNo;
        const field = PUMP_ROOM_QTY_MAP[slNo];
        const qty = Number(finalPumpQtys?.[field] ?? resultData?.pump_room_quantities?.[field] ?? 0);
        const rate = Number(item.Rate || 0);
        tot += qty * rate;
        
        let desc = item.Description || "";
        desc += " (Pump Room - 20% of Civil)";
        const isTerraceZeroQuantity = constructionType === 'terrace' && [1, 2, 3, 4, 5].includes(slNo) && qty === 0;
        if (isTerraceZeroQuantity) desc += " (Not required for terrace)";
        
        return {
          ...item,
          calculatedQty: qty,
          calculatedRate: rate,
          calculatedAmount: qty * rate,
          actualCode: item.Code || "",
          actualUnit: item.Unit || "",
          actualDescription: desc,
          actualImage: item.Image || null,
          originalSlNo: slNo
        };
      }).filter(Boolean);
    tableData.pumpRoom.items = proc.map((x, i) => ({ ...x, displaySlNo: i + 1 }));
    tableData.pumpRoom.total = tot;
    console.log(`✅ Pump Room Civil: ${proc.length} items, Total: ${formatINR(tot)}`);
  }

  // MEP - ALL 29 items (SlNo 1-29)
  if (safeSelTables.mep) {
    let allMepItems = [];
    
    // Add regular MEP items (1-25)
    if (mepItems?.length) {
      const processedItems = mepItems
        .filter(item => item.SlNo >= 1 && item.SlNo <= 25)
        .map(item => {
          const slNo = item.SlNo;
          return {
            ...item,
            originalSlNo: slNo,
            actualCode: item.Code || "",
            actualUnit: item.Unit || "",
            actualDescription: item.Description || "",
            actualImage: item.Image || null,
            remark: mepRemarks[slNo] || ""
          };
        });
      allMepItems.push(...processedItems);
    }
    
    // Add percentage items (26-29)
    const itemsToDisplay = percentageItems && percentageItems.length > 0 ? percentageItems : fallbackPercentageItems;
    const processedPercentageItems = itemsToDisplay.map(item => {
      const slNo = item.SlNo;
      let percentageText = "";
      if (slNo === 26) percentageText = "(28% of Base MEP)";
      else if (slNo === 27) percentageText = "(10% of Base MEP)";
      else if (slNo === 28) percentageText = "(2% of Base MEP)";
      else if (slNo === 29) percentageText = "(25% of Total Before Installation)";
      
      return {
        ...item,
        originalSlNo: slNo,
        actualCode: item.Code || "",
        actualUnit: item.Unit || "Lot",
        actualDescription: `${item.Description || ""} ${percentageText}`,
        actualImage: null,
        remark: mepRemarks[slNo] || ""
      };
    });
    allMepItems.push(...processedPercentageItems);
    
    // Sort by SlNo
    allMepItems.sort((a, b) => (a.originalSlNo || a.SlNo) - (b.originalSlNo || b.SlNo));
    tableData.mep.items = allMepItems.map((x, i) => ({ ...x, displaySlNo: i + 1 }));
    tableData.mep.total = totalMepCost;
    console.log(`✅ MEP: ${allMepItems.length} items, Total: ${formatINR(totalMepCost)}`);
  }

  // Piping Items
  if (safeSelTables.piping && pipingItems?.length) {
    let tot = 0;
    const proc = pipingItems.map((item, idx) => {
      const qty = Number(item.Quantity || item.quantity || 0);
      const supplyRate = Number(item.Rate || item.rate || 0);
      const totalAmt = qty * supplyRate * (1 + INSTALLATION_PERCENT);
      tot += totalAmt;
      
      return {
        ...item,
        calculatedQty: qty,
        calculatedRate: supplyRate,
        calculatedAmount: totalAmt,
        description: item.description || item.Description || "N/A",
        dia: item.dia || item.Dia || "",
        code: item.code || item.Code || "",
        unit: item.unit || item.Unit || "m",
        displaySlNo: idx + 1,
        Category: item.Category || item.category || "Other"
      };
    });
    tableData.piping.items = proc;
    tableData.piping.total = pipingTotal > 0 ? pipingTotal : tot;
    console.log(`✅ Piping: ${proc.length} items, Total: ${formatINR(tableData.piping.total)}`);
  } else if (safeSelTables.piping && (!pipingItems || pipingItems.length === 0)) {
    console.log("⚠️ Piping table selected but no piping items provided");
    tableData.piping.items = [];
    tableData.piping.total = 0;
  }

  // Calculate grand totals
  const civilTotalVal = safeSelTables.civil ? tableData.civil.total : 0;
  const pumpTotalVal = safeSelTables.pumpRoom ? tableData.pumpRoom.total : 0;
  const mepTotalVal = safeSelTables.mep ? tableData.mep.total : 0;
  const pipingTotalVal = safeSelTables.piping ? tableData.piping.total : 0;
  const subTotal = civilTotalVal + pumpTotalVal + mepTotalVal + pipingTotalVal;
  const gstAmt = subTotal * 0.18;
  const grandTotal = subTotal + gstAmt;

  console.log("📊 Final Totals Summary:", {
    civil: formatINR(civilTotalVal),
    pumpRoom: formatINR(pumpTotalVal),
    mep: formatINR(mepTotalVal),
    piping: formatINR(pipingTotalVal),
    subTotal: formatINR(subTotal),
    gst: formatINR(gstAmt),
    grand: formatINR(grandTotal)
  });

  // ==========================================
  // CREATE WORKBOOK
  // ==========================================
  const workbook = new ExcelJS.Workbook();
  workbook.creator = company.company_name || "Water Body Quotation";
  workbook.created = workbook.modified = now;

  const sheet = workbook.addWorksheet("Water Body Quotation", {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      fitToPage: true,
      fitToWidth: 1,
    },
  });

  // Set column widths - using 12 columns for all tables
  const colWidths = [5, 9, 36, 9, 8, 7, 7, 11, 11, 12, 12, 14];
  colWidths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });

  const COLS = 12;
  let row = 1;

  // ==========================================
  // COMPANY HEADER — LOGO LEFT, DETAILS RIGHT
  // ==========================================
  for (let r = row; r <= row + 3; r++) {
    for (let col = 1; col <= COLS; col++) {
      const cell = sheet.getCell(r, col);
      cell.fill = fillSolid(COLORS.logoBg);
      cell.border = borderNone();
    }
    sheet.getRow(r).height = 22;
  }

  sheet.mergeCells(`A${row}:C${row + 3}`);
  const logoAreaCell = sheet.getCell(`A${row}`);
  logoAreaCell.fill = fillSolid(COLORS.logoBg);
  logoAreaCell.border = borderNone();
  logoAreaCell.alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells(`D${row}:L${row}`);
  const nameCell = sheet.getCell(`D${row}`);
  nameCell.value = company.company_name || "";
  nameCell.fill = fillSolid(COLORS.logoBg);
  nameCell.font = { name: "Arial", size: 18, bold: true, color: { argb: `FF${COLORS.primary}` } };
  nameCell.alignment = { horizontal: "right", vertical: "middle" };
  nameCell.border = borderNone();
  sheet.getRow(row).height = 32;

  sheet.mergeCells(`D${row + 1}:L${row + 1}`);
  const addrCell = sheet.getCell(`D${row + 1}`);
  addrCell.value = company.address || "";
  addrCell.fill = fillSolid(COLORS.logoBg);
  addrCell.font = { name: "Arial", size: 10, color: { argb: `FF${COLORS.lightText}` } };
  addrCell.alignment = { horizontal: "right", vertical: "middle" };
  addrCell.border = borderNone();
  sheet.getRow(row + 1).height = 22;

  sheet.mergeCells(`D${row + 2}:L${row + 2}`);
  const contactCell = sheet.getCell(`D${row + 2}`);
  const contactLine = [
    company.phone ? `Ph: ${company.phone}` : "",
    company.email ? `Email: ${company.email}` : "",
  ].filter(Boolean).join("   |   ");
  contactCell.value = contactLine;
  contactCell.fill = fillSolid(COLORS.logoBg);
  contactCell.font = { name: "Arial", size: 10, color: { argb: `FF${COLORS.lightText}` } };
  contactCell.alignment = { horizontal: "right", vertical: "middle" };
  contactCell.border = borderNone();
  sheet.getRow(row + 2).height = 22;

  sheet.mergeCells(`D${row + 3}:L${row + 3}`);
  const extraCell = sheet.getCell(`D${row + 3}`);
  const extraLine = [
    company.website ? `Web: ${company.website}` : "",
    company.gst ? company.gst : "",
  ].filter(Boolean).join("   |   ");
  extraCell.value = extraLine;
  extraCell.fill = fillSolid(COLORS.logoBg);
  extraCell.font = { name: "Arial", size: 10, color: { argb: `FF${COLORS.lightText}` } };
  extraCell.alignment = { horizontal: "right", vertical: "middle" };
  extraCell.border = borderNone();
  sheet.getRow(row + 3).height = 22;

  if (company.logo_url) {
    try {
      const lb64 = await loadLogoAsBase64(company.logo_url);
      if (lb64) {
        const imgId = workbook.addImage({ base64: lb64.split(",")[1], extension: "png" });
        sheet.addImage(imgId, {
          tl: { col: 0.1, row: 0.1 },
          ext: { width: 140, height: 80 },
          editAs: "oneCell",
        });
      }
    } catch {}
  }

  row += 4;

  sheet.mergeCells(`A${row}:L${row}`);
  const divCell = sheet.getCell(`A${row}`);
  divCell.value = "";
  divCell.fill = fillSolid(COLORS.primary);
  divCell.border = borderNone();
  sheet.getRow(row).height = 4;
  row += 2;

  // ==========================================
  // QUOTATION TITLE
  // ==========================================
  mc(sheet, row, row, 1, COLS);
  let c = sheet.getCell(`A${row}`);
  c.value = "WATER BODY — DETAILED QUOTATION";
  applyCell(c, { fill: COLORS.primary, fontSize: 17, bold: true, color: COLORS.headerText, h: "center" });
  sheet.getRow(row).height = 36;
  row += 2;

  // ==========================================
  // BILL TO / QUOTATION DETAILS
  // ==========================================
  const quoteNo = `${company.company_code || "WB"}/WATER/${now.getFullYear()}/${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const projRef = `${company.company_code || "WB"}-WATER-${now.getFullYear()}`;
  const lFlds = [["Name:", ""], ["Address:", ""], ["Phone:", ""], ["PAN:", ""], ["GSTIN:", ""], ["Site Address:", ""]];
  const rFlds = [["Quotation No:", quoteNo], ["Date:", `${dateStr}  ${timeStr}`], ["Project Ref:", projRef], ["Prepared By:", company.company_name || ""]];

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
  // WATER BODY SPECIFICATIONS
  // ==========================================
  row = sectionDivider(sheet, row, "WATER BODY SPECIFICATIONS", COLS);

  const volume = waterBodyMetrics.volume_m3 || (dimL * dimW * dimD) || 0;
  const floorArea = waterBodyMetrics.floor_area_m2 || (dimL * dimW) || 0;
  const shape = waterBodySpecs.shape || "Rectangular";
  const turnoverTime = waterBodySpecs.turnover || equipmentSpecs.turnover_time_hours || 4;
  const flowRate = equipmentSpecs.flow_rate_m3_per_h || 0;
  const filterDia = equipmentSpecs.filter_dia_mm || currentRates?.filter_dia || "N/A";
  const pumpHp = equipmentSpecs.pump_hp || currentRates?.hp || "N/A";
  const mpvSize = equipmentSpecs.mpv_size || "1.5 inches";

  const specs = [
    ["Project Type:", "Water Body / Ornamental Pool"],
    ["Construction Type:", constructionType === "terrace" ? "Terrace" : "In-Ground"],
    ["Water Body Dimensions:", dimL && dimW && dimD ? `${safeNum(dimL, 2)}m × ${safeNum(dimW, 2)}m × ${safeNum(dimD, 2)}m` : "N/A"],
    ["Water Body Shape:", shape],
    ["Water Body Volume:", volume > 0 ? `${safeNum(volume, 2)} m³ (${safeNum(volume * 1000, 0)} L)` : "N/A"],
    ["Surface Area:", floorArea > 0 ? `${safeNum(floorArea, 2)} m²` : "N/A"],
    ["Turnover Time:", `${turnoverTime} hours`],
    ["Flow Rate:", flowRate > 0 ? `${safeNum(flowRate, 1)} m³/h` : "N/A"],
    ["Filter System:", `${filterDia} mm Sand Filter`],
    ["Pump Capacity:", `${pumpHp} HP`],
    ["MPV Size:", mpvSize],
    ["Pump Room:", "INCLUDED (MANDATORY)"],
    ["Pump Room Dimensions:", pumpRoomDimensions?.length ? 
      `${safeNum(pumpRoomDimensions.length, 2)}m × ${safeNum(pumpRoomDimensions.width, 2)}m × ${safeNum(pumpRoomDimensions.height, 2)}m` : "Calculated based on water body volume"],
    ["MEP Installation Cost:", `${INSTALLATION_PERCENT * 100}% of Supply Cost`],
    ["Piping System:", tableData.piping.items.length > 0 ? `${tableData.piping.items.length} items included` : "No piping items"],
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

  const summaryRows = [
    ["01", "Civil Works — Water Body Structure", civilTotalVal, false],
    ...(pumpTotalVal > 0 ? [["02", "Pump Room Civil Works (20% of Civil)", pumpTotalVal, false]] : []),
    ["03", "MEP Systems & Equipment (29 items)", mepTotalVal, false],
    ...(pipingTotalVal > 0 ? [["04", "Piping System", pipingTotalVal, false]] : []),
    [null, "PROJECT SUB-TOTAL", subTotal, "sub"],
    [null, "GST @ 18%", gstAmt, false],
    [null, "GRAND TOTAL (INCL. GST)", grandTotal, "grand"],
  ];
  
  summaryRows.forEach(([num, desc, amt, style], i) => {
    const bg = style === "grand" ? COLORS.grandTotalBg : style === "sub" ? COLORS.subtotalBg : i % 2 === 0 ? COLORS.light : COLORS.highlight;
    const fc = style === "grand" ? COLORS.headerText : style === "sub" ? COLORS.primary : COLORS.text;
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

  // Main Pool Civil Works
  if (safeSelTables.civil && tableData.civil.items.length > 0) {
    const res = await buildCivilTable(sheet, row, "CIVIL WORKS — WATER BODY STRUCTURE", tableData.civil.items, civilRemarks, safeColVis, MAIN_POOL_QTY_MAP, civilQtys, resultData, constructionType);
    row = res.currentRow;
  }

  // Pump Room Civil Works
  if (safeSelTables.pumpRoom && tableData.pumpRoom.items.length > 0) {
    const res = await buildCivilTable(sheet, row, "CIVIL WORKS — PUMP ROOM", tableData.pumpRoom.items, pumpRoomRemarks, safeColVis, PUMP_ROOM_QTY_MAP, finalPumpQtys, resultData, constructionType);
    row = res.currentRow;
  }

  // MEP Systems - 29 items
  if (safeSelTables.mep && tableData.mep.items.length > 0) {
    mc(sheet, row, row, 1, COLS);
    c = sheet.getCell(`A${row}`);
    c.value = "MECHANICAL, ELECTRICAL & PLUMBING SYSTEMS (29 ITEMS)";
    applyCell(c, { fill: COLORS.primary, fontSize: 15, bold: true, color: COLORS.headerText, h: "center" });
    sheet.getRow(row).height = 34;
    row += 2;
    
    const res = await buildMEPTable(sheet, row, "MEP SYSTEMS — WATER BODY", tableData.mep.items, safeColVis, finalMepQtys, currentRates, resultData, baseMepTotal, percentageAmounts);
    row = res.currentRow;
  }

  // Piping System
  if (safeSelTables.piping && tableData.piping.items.length > 0) {
    // Group piping items by category if available
    const pipeGroups = [
      { items: tableData.piping.items.filter(i => (i.Category || "").toLowerCase() === "pipe"), label: "PIPING SYSTEM — PIPES", title: "PIPES" },
      { items: tableData.piping.items.filter(i => (i.Category || "").toLowerCase() === "valve"), label: "PIPING SYSTEM — VALVES", title: "VALVES" },
      { items: tableData.piping.items.filter(i => (i.Category || "").toLowerCase() === "flange"), label: "PIPING SYSTEM — FLANGES", title: "FLANGES" },
      { items: tableData.piping.items.filter(i => (i.Category || "").toLowerCase() === "fitting"), label: "PIPING SYSTEM — FITTINGS", title: "FITTINGS" },
      { items: tableData.piping.items.filter(i => !["pipe", "valve", "flange", "fitting"].includes((i.Category || "").toLowerCase())), label: "PIPING SYSTEM — OTHER COMPONENTS", title: "OTHER COMPONENTS" },
    ];
    
    let anyPiping = false;
    for (const grp of pipeGroups) {
      if (!grp.items.length) continue;
      mc(sheet, row, row, 1, COLS);
      c = sheet.getCell(`A${row}`);
      c.value = grp.label;
      applyCell(c, { fill: COLORS.primary, fontSize: 15, bold: true, color: COLORS.headerText, h: "center" });
      sheet.getRow(row).height = 34;
      row += 2;
      const res = await buildPipingTable(sheet, row, grp.title, grp.items, safeColVis, {});
      row = res.currentRow;
      anyPiping = true;
    }
    
    if (!anyPiping && tableData.piping.items.length > 0) {
      mc(sheet, row, row, 1, COLS);
      c = sheet.getCell(`A${row}`);
      c.value = "PIPING SYSTEM";
      applyCell(c, { fill: COLORS.primary, fontSize: 15, bold: true, color: COLORS.headerText, h: "center" });
      sheet.getRow(row).height = 34;
      row += 2;
      const res = await buildPipingTable(sheet, row, "PIPING SYSTEM", tableData.piping.items, safeColVis, {});
      row = res.currentRow;
    }
  }

  // MEP Cost Breakdown
  if (safeSelTables.mep) {
    row += 1;
    mc(sheet, row, row, 1, COLS);
    c = sheet.getCell(`A${row}`);
    c.value = "MEP COST BREAKDOWN SUMMARY";
    applyCell(c, { fill: COLORS.secondary, fontSize: 13, bold: true, color: COLORS.headerText, h: "center" });
    sheet.getRow(row).height = 28;
    row += 2;

    const breakdownData = [
      ["Base MEP Systems (Items 1-25)", `₹ ${safeNum(baseMepTotal, 2)}`],
      ["Pipes & Fittings (26 - 28% of Base MEP)", `₹ ${safeNum(percentageAmounts[26], 2)}`],
      ["Ball Valves & Check Valves (27 - 10% of Base MEP)", `₹ ${safeNum(percentageAmounts[27], 2)}`],
      ["Puddle Flanges & Gaskets (28 - 2% of Base MEP)", `₹ ${safeNum(percentageAmounts[28], 2)}`],
      ["Installation & Commissioning (29 - 25% of Total)", `₹ ${safeNum(percentageAmounts[29], 2)}`],
      ["", ""],
      ["TOTAL MEP COST", `₹ ${safeNum(tableData.mep.total, 2)}`]
    ];

    breakdownData.forEach(([label, value]) => {
      if (label === "") {
        row++;
        return;
      }
      
      const labelCols = Math.floor(COLS * 0.67);
      const valueCols = labelCols + 1;
      
      mc(sheet, row, row, 1, labelCols);
      mc(sheet, row, row, valueCols, COLS);
        
      const labelCell = sheet.getCell(`A${row}`);
      labelCell.value = label;
        
      const valueCell = sheet.getCell(`${getColumnLetter(valueCols)}${row}`);
      valueCell.value = value;

      const isTotal = label.includes("TOTAL");
        
      if (isTotal) {
        applyCell(labelCell, { fill: COLORS.subtotalBg, bold: true, fontSize: 12, color: COLORS.primary });
        applyCell(valueCell, { fill: COLORS.subtotalBg, bold: true, fontSize: 12, color: COLORS.primary });
      } else {
        applyCell(labelCell, { fill: COLORS.light, fontSize: 11 });
        applyCell(valueCell, { fill: COLORS.amountCol, fontSize: 11, h: "right" });
      }
      labelCell.alignment.horizontal = "left";
      valueCell.alignment.horizontal = "right";
      
      sheet.getRow(row).height = 24;
      row++;
    });
    row += 2;
  }

  // ==========================================
  // TERMS & CONDITIONS
  // ==========================================
  row = sectionDivider(sheet, row, "TERMS & CONDITIONS", COLS);
  
  const terms = [
    '1.  Prices are valid for 30 days from the date of this quotation.',
    '2.  Delivery Schedule:',
    '    • Materials in stock: 2–3 weeks from Purchase Order date.',
    '    • Imported materials: 12–14 weeks from PO date against advance payment.',
    '3.  Validity of this offer will be for 30 days from the date of confirmation.',
    '4.  Materials will be dispatched only against Purchase Order & Advance Payment.',
    '5.  Taxes: GST @ 18% will be extra as applicable.',
    '6.  Payment Terms:',
    '    • 50% — Advance with Purchase Order / Work Order.',
    '    • 40% — Before dispatch of materials.',
    '    • 10% — Balance on successful testing & commissioning.',
    '7.  Scope of Work: Supply, Installation, Testing & Commissioning of Water Body.',
    '    • Civil Works and Tiling Work as per BOQ.',
    '    • Piping System as per design calculations.',
    '    • Quantities may vary due to site conditions.',
    '8.  Cost estimates are based on current industry standards.',
    '    • Actual costs may vary depending on location and site conditions.',
    '    • Variations of ±10–15% are common.',
    '9.  Construction Type Notes:',
    '    • Terrace construction excludes excavation and foundation work (Items 1-5 show 0 quantity).',
    '    • In-ground construction includes full excavation and foundation work.',
    '10. Pump room construction is mandatory for all Water Body installations.',
    '11. Piping System:',
    '    • Includes all pipes, fittings, valves, and flanges.',
    '    • Installation cost is 15% of supply cost.',
    '    • Piping quantities are calculated based on water body dimensions and MEP equipment.',
    '12. Exclusions (client scope):',
    '    • Incoming electrical power supply to plant room.',
    '    • Electrical conduit from power source to plant room.',
    '    • Earthing near panel board in plant room.',
    '    • Backwash pipes from plant room to storm water / waste drain.',
    '    • Water and electrical supply for testing & commissioning.',
    '13. Warranty:',
    '    • 1 year comprehensive warranty on all equipment.',
    '    • 5 years structural warranty on civil works.',
    '14. Percentage Items Calculation:',
    '    • Item 26 (Pipes & Fittings): 28% of Base MEP (Items 1-25)',
    '    • Item 27 (Ball & Check Valves): 10% of Base MEP',
    '    • Item 28 (Puddle Flanges): 2% of Base MEP',
    '    • Item 29 (Installation): 25% of (Base MEP + Items 26-28)',
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
  c.value = `Thank you for choosing ${company.company_name?.trim() || "Intelithon Technologies"} for your Water Body project.`;
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
  // AUTHORIZED SIGNATORY WITH DYNAMIC STAMP
  // ==========================================
  row = sectionDivider(sheet, row, "AUTHORIZED SIGNATORY", COLS);

  if (company.stamp_url) {
    try {
      const stampB64 = await loadStampAsBase64(company.stamp_url);
      if (stampB64) {
        const stampId = workbook.addImage({ 
          base64: stampB64.split(",")[1], 
          extension: "png" 
        });
        mc(sheet, row, row + 1, 4, 8);
        sheet.addImage(stampId, {
          tl: { col: 3.2, row: row - 1 + 0.1 },
          ext: { width: 120, height: 50 },
          editAs: "oneCell",
        });
        for (let r = row; r <= row + 1; r++) sheet.getRow(r).height = 28;
        row += 2;
      } else {
        row += 2;
      }
    } catch (err) {
      console.warn("Failed to load stamp:", err);
      row += 2;
    }
  } else {
    row += 2;
  }
  
  [
    { text: "________________________", bold: false, clr: COLORS.text, h: 24 },
    { text: "Director — Mr Shreyas.R", bold: true, clr: COLORS.primary, h: 24 },
    { text: "Director – Projects", bold: false, clr: COLORS.lightText, h: 22 },
    { text: `For ${company.company_name?.trim() || "Intelithon Technologies"}`, bold: true, clr: COLORS.primary, h: 24 },
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

  // ==========================================
  // WATERMARK
  // ==========================================
  await addWatermark(workbook, sheet, company.company_name || "", row);

  // ==========================================
  // SAVE
  // ==========================================
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const fname = `${(company.company_name || "Water_Body_Quotation").replace(/\s+/g, "_")}_${dateStr.replace(/\//g, "-")}.xlsx`;
    saveAs(new Blob([buffer]), fname);
    console.log("✅ Water Body Excel saved:", fname);
    console.log("📊 Final Totals:", {
      civil: formatINR(tableData.civil.total),
      pumpRoom: formatINR(tableData.pumpRoom.total),
      mep: formatINR(tableData.mep.total),
      piping: formatINR(tableData.piping.total),
      subTotal: formatINR(subTotal),
      gst: formatINR(gstAmt),
      grand: formatINR(grandTotal),
    });
    return true;
  } catch (err) {
    console.error("❌ Excel save failed:", err);
    alert("Failed to generate Excel report: " + err.message);
    return false;
  }
};

// Helper function to get column letter
function getColumnLetter(colIndex) {
  let letters = '';
  while (colIndex > 0) {
    let remainder = (colIndex - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    colIndex = Math.floor((colIndex - 1) / 26);
  }
  return letters || 'A';
}

export default generateWaterBodyExcelReport;