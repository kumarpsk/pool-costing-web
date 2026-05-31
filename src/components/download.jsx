// download.jsx – Universal PDF Generator for All Pool Types
import React, { useState } from 'react';

// ============================================================
// CONSTANTS
// ============================================================
const INSTALLATION_PERCENT = 0.15;
const API_BASE = 'https://pool-costing-api.intelithon.in/admin';

const ALLOWED_PIPING_CATEGORIES = [
  'pipe',
  'header',
  'ball_valve',
  'butterfly_valve',
  'check_valve',
  'flange',
  'puddle_flange',
];

const MPV_SIZE_STANDARDS = {
  '600-700': '2" MPV',
  '701-800': '2.5" MPV',
  '801-900': '3" MPV',
  '901-1000': '4" MPV',
  '1001-1200': '5" MPV',
  '1201-1400': '6" MPV',
  '1401-1600': '8" MPV',
};

// ============================================================
// SUB-ROWS FOR ITEMS 9 AND 10
// ============================================================
const SUB_ROWS = {
  9: [
    { slNo: "9.1", description: "Raft", unit: "sqm" },
    { slNo: "9.2", description: "Retaining wall / overflow drain", unit: "sqm" }
  ],
  10: [
    { slNo: "10.1", description: "Raft", unit: "sqm" },
    { slNo: "10.2", description: "Retaining Wall", unit: "sqm" }
  ]
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function safeToFixed(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '0.00';
  return Number(value).toFixed(decimals);
}

function getImageUrlForPDF(imageData) {
  if (!imageData) return null;
  try {
    if (imageData.startsWith('data:image')) return imageData;
    if (imageData.startsWith('http') || imageData.startsWith('/')) return imageData;
    return `${API_BASE}/static/${imageData}`;
  } catch {
    return null;
  }
}

function formatCurrencyValue(amount, currency = 'INR', exchangeRate = 83.0) {
  const safeAmount = Number(amount) || 0;
  if (currency === 'USD') {
    const usdAmount = safeAmount / (Number(exchangeRate) || 83);
    return `$${safeToFixed(usdAmount, 2)}`;
  }
  return `₹${safeToFixed(safeAmount)}`;
}

function getCurrencyLabel(currency = 'INR') {
  return currency === 'USD' ? '$' : '₹';
}

function getPoolTypeDisplayName(poolType = 'skimmer') {
  const t = String(poolType || 'skimmer').toLowerCase();
  const map = {
    skimmer: 'Skimmer Pool',
    overflow: 'Overflow Pool',
    infinity: 'Infinity Pool',
    jacuzzi: 'Jacuzzi / Spa',
    curved: 'FreeForm Pool',
    freeform: 'FreeForm Pool',
    waterbody: 'Water Body',
  };
  return map[t] || 'Swimming Pool';
}

function getMPVSize(filterDiameter) {
  if (!filterDiameter) return '2" MPV (Standard)';
  const d = parseInt(filterDiameter);
  if (isNaN(d)) return '2" MPV (Standard)';
  for (const [range, size] of Object.entries(MPV_SIZE_STANDARDS)) {
    const [min, max] = range.split('-').map(Number);
    if (d >= min && d <= max) return size;
  }
  return '2" MPV (Standard)';
}

// ============================================================
// QUANTITY FIELD MAPS (UNIVERSAL)
// ============================================================
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
  1: 'EarthExcavation_QTY_1',
  2: 'BackFilling_QTY_1',
  3: 'Consolidation_QTY_1',
  4: 'Disposal_QTY_1',
  5: 'Soling_QTY_1',
  6: 'plaincement_QTY_1',
  7: 'BurntBrick_QTY_1',
  8: 'steelreinforcement_QTY_1',
  9: 'Shuttering_QTY_1',
  10: 'shotcreting_QTY_1',
  11: 'WaterProofing_QTY_1',
  12: 'plastering_QTY_1',
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
  1: 'Filter_QTY',
  2: 'Glass_QTY',
  3: 'Pressure_QTY',
  4: 'Filter_Drain_QTY',
  5: 'Mpv_QTY',
  6: 'Mpv_connset_QTY',
  7: 'Cpump_QTY',
  8: 'Return_Inlets_QTY',
  9: 'MainDrain_QTY',
  10: 'Vaccume_Inlets_QTY',
  11: 'Skimmer_QTY',
  12: 'FloatValve_QTY',
  13: 'GutterDrain_QTY',
  14: 'Underwaterlight_QTY',
  15: 'Transformer_QTY',
  16: 'ControlPanel_QTY',
  17: 'Cables_QTY',
  18: 'Earthing_QTY',
  19: 'ChlorinePump_QTY',
  20: 'DosingTank_QTY',
  21: 'Stirrer_QTY',
  22: 'FloatingHose_QTY',
  23: 'Brush_QTY',
  24: 'Algae_QTY',
  25: 'Net_QTY',
  26: 'Handle_QTY',
  27: 'VacuumHead_QTY',
  28: 'TestKit_QTY',
  29: 'CurvedBrush_QTY',
  30: 'HeatPump_QTY',
  31: 'PoolHeater_QTY',
  32: 'Chiller_QTY',
  33: 'Ozonator_QTY',
  34: 'SaltChlorinator_QTY',
};

const JACUZZI_MEP_QTY_FIELDS = {
  1: 'Filter_QTY',
  2: 'Glass_QTY',
  3: 'Pressure_QTY',
  4: 'Filter_Drain_QTY',
  5: 'Mpv_QTY',
  6: 'Mpv_connset_QTY',
  7: 'Cpump_QTY',
  8: 'Return_Inlets_QTY',
  9: 'MainDrain_QTY',
  10: 'Underwaterlight_QTY',
  11: 'Transformer_QTY',
  12: 'ControlPanel_QTY',
  13: 'Cables_QTY',
  14: 'Earthing_QTY',
  15: 'ChlorinePump_QTY',
  16: 'DosingTank_QTY',
  17: 'Stirrer_QTY',
  18: 'FloatingHose_QTY',
  19: 'Brush_QTY',
  20: 'Algae_QTY',
  21: 'Net_QTY',
  22: 'Handle_QTY',
  23: 'VacuumHead_QTY',
  24: 'TestKit_QTY',
  25: 'CurvedBrush_QTY',
  26: 'water_jet_qty',
  27: 'air_controller_qty',
  28: 'jet_pump_qty',
  29: 'HeatPump_QTY',
};

// ============================================================
// EXTRACT SUB QTY SAFELY
// ============================================================
function extractSubQty(raw) {
  if (raw === undefined || raw === null) return 0;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return isNaN(n) ? 0 : n;
  }
  if (typeof raw === "object") {
    return Number(
      raw.qty ?? raw.QTY ?? raw.quantity ?? raw.Quantity ?? raw.value ?? raw.amount ?? raw.total ?? 0
    ) || 0;
  }
  return 0;
}

// ============================================================
// GET SPLIT DATA FOR ITEMS 9 AND 10 - WITH EXPLICIT PASSED SPLITS
// ============================================================
function getSplitData(slNo, quantities, resultData, shotcretingSplit, rccShutteringSplit) {
  const safeQty = quantities || {};
  const safeRD = resultData || {};
  const civilQty = safeRD.civil_quantities || {};

  if (slNo === 9) {
    const split =
      rccShutteringSplit ||
      safeQty.rcc_shuttering_split ||
      safeQty.shuttering_split ||
      civilQty.rcc_shuttering_split ||
      civilQty.shuttering_split ||
      safeRD.rcc_shuttering_split ||
      safeRD.shuttering_split ||
      {};

    return {
      "9.1": split["9.1"] ?? split.raft ?? split.Raft ?? split.raft_qty ?? split.foundation ?? 0,
      "9.2": split["9.2"] ?? split.retaining_wall ?? split.retainingWall ?? split.wall ?? split.wall_qty ?? split.sidewall ?? split.retaining ?? 0
    };
  }
  
  if (slNo === 10) {
    const split =
      shotcretingSplit ||
      safeQty.shotcreting_split ||
      safeQty.shotcretingSplit ||
      safeQty.rcc_split ||
      safeQty.rcc_subrows ||
      safeQty.civilQuantities?.shotcreting_split ||
      civilQty.shotcreting_split ||
      civilQty.rcc_split ||
      safeRD.shotcreting_split ||
      safeRD.rcc_subrows ||
      safeRD.civil_quantities?.shotcreting_split ||
      {};

    return {
      "10.1":
        split["10.1"] ??
        split.raft ??
        split.Raft ??
        split.raft_qty ??
        0,
      "10.2":
        split["10.2"] ??
        split.retaining_wall ??
        split.retainingWall ??
        split.wall ??
        split.wall_qty ??
        0
    };
  }
  
  return {};
}

// ============================================================
// RESOLVE QUANTITY (UNIVERSAL)
// ============================================================
function resolveQty(slNo, qtyFieldMap, quantities = {}, resultData = {}) {
  if (!qtyFieldMap) return 0;
  const field = qtyFieldMap[slNo];
  if (!field) return 0;
  const qty = (quantities || {})[field] ?? (resultData || {})[field] ?? 0;
  const num = Number(qty);
  return isNaN(num) ? 0 : num;
}

// ============================================================
// TOTAL CALCULATORS
// ============================================================
function calcCivilTotal(items, quantities, resultData, qtyMap, shotcretingSplit, rccShutteringSplit) {
  let total = 0;
  const qMap = qtyMap || MAIN_POOL_QTY_FIELDS;
  
  (items || []).forEach(item => {
    if (!item) return;
    const slNo = Number(item.SlNo ?? item.sl_no);
    
    // For excavation (item 1), use split data with individual rates
    if (slNo === 1 && qMap === MAIN_POOL_QTY_FIELDS) {
      const split = (resultData || {}).civil_quantities?.excavation_split || (quantities || {}).excavation_split || {};
      if (split && (split['1.1'] || split['1.2'])) {
        const qty11 = extractSubQty(split['1.1']);
        const rate11 = Number(split['1.1']?.rate ?? split['1.1']?.Rate ?? item.Rate ?? 0) || 0;
        const qty12 = extractSubQty(split['1.2']);
        const rate12 = Number(split['1.2']?.rate ?? split['1.2']?.Rate ?? item.Rate ?? 0) || 0;
        total += (qty11 * rate11) + (qty12 * rate12);
      } else {
        const qty = resolveQty(slNo, qMap, quantities, resultData);
        const rate = Number(item.Rate) || 0;
        total += qty * rate;
      }
      return;
    }
    
    if ((slNo === 9 || slNo === 10) && qMap === MAIN_POOL_QTY_FIELDS) {
      const splitData = getSplitData(slNo, quantities, resultData, shotcretingSplit, rccShutteringSplit);
      const rate = Number(item.Rate) || 0;
      const subRows = SUB_ROWS[slNo] || [];
      
      let subTotal = 0;
      subRows.forEach(sub => {
        const subQty = extractSubQty(splitData[sub.slNo]);
        subTotal += subQty * rate;
      });
      total += subTotal;
      return;
    }
    
    const qty = resolveQty(slNo, qMap, quantities, resultData);
    const rate = Number(item.Rate) || 0;
    total += qty * rate;
  });
  return total;
}

function calcBalanceTankTotal(items, quantities, resultData) {
  return calcCivilTotal(items, quantities, resultData, BALANCE_TANK_QTY_FIELDS, null, null);
}

function calcPumpRoomTotal(items, quantities, resultData) {
  return calcCivilTotal(items, quantities, resultData, PUMP_ROOM_QTY_FIELDS, null, null);
}

function calcMepTotal(items, mepQuantities, resultData, dynamicRates, selectedAdvancedEquipment, isJacuzzi = false) {
  let total = 0;
  const qtyMap = isJacuzzi ? JACUZZI_MEP_QTY_FIELDS : MEP_QTY_FIELDS;
  const safeAdvanced = selectedAdvancedEquipment || [];

  (items || []).forEach(item => {
    if (!item) return;
    const slNo = Number(item.SlNo ?? item.sl_no);
    let qty = 0;

    if (slNo >= 30 && slNo <= 34) {
      qty = safeAdvanced.includes(slNo) ? 1 : 0;
    } else if (isJacuzzi && slNo === 29) {
      qty = safeAdvanced.includes(29) ? 1 : 0;
    } else {
      qty = resolveQty(slNo, qtyMap, mepQuantities, resultData);
    }

    const supplyRate = getSupplyRate(item, dynamicRates);
    const installRate = supplyRate * INSTALLATION_PERCENT;
    const supplyCost = qty * supplyRate;
    const installCost = qty * installRate;
    total += supplyCost + installCost;
  });

  return total;
}

function calcPipingTotal(pipingItems = []) {
  let total = 0;
  (pipingItems || []).forEach(item => {
    if (!item) return;
    const qty = Number(item.quantity ?? item.Quantity ?? 0) || 0;
    const rate = Number(item.rate ?? item.Rate ?? 0) || 0;
    const supply = qty * rate;
    const install = supply * INSTALLATION_PERCENT;
    total += supply + install;
  });
  return total;
}

function getSupplyRate(item, dynamicRates = {}) {
  if (!item) return 0;
  const rates = dynamicRates || {};
  const slNo = Number(item.SlNo ?? item.sl_no);
  if (slNo === 1) return rates.filter_rate ?? item.Rate ?? 0;
  if (slNo === 7) return rates.pump_rate ?? item.Rate ?? 0;
  return item.Rate ?? 0;
}

// ============================================================
// PIPING CLEANING
// ============================================================
function cleanPipingItems(items = []) {
  if (!Array.isArray(items)) return [];
  return items.filter(item => {
    if (!item) return false;
    const cat = (item.category || item.Category || '').toLowerCase();
    return ALLOWED_PIPING_CATEGORIES.includes(cat);
  });
}

// ============================================================
// COMPANY PROFILE FALLBACK
// ============================================================
const DEFAULT_COMPANY_PROFILE = {
  company_name: "INTELITHON TECHNOLOGIES",
  company_code: "INT",
  address: "No. 1, 1st Floor, Deepa Towers, Esther Enclave, Horamavu, Bangalore, Karnataka - 560043",
  phone: "+91 1234567890",
  email: "info@intelithon.com",
  website: "www.intelithon.com",
  logo_url: null,
  gst: "GSTIN: 33AABCA1234B1Z5",
  pan: ""
};

// ============================================================
// LOGO LOADING HELPER
// ============================================================
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
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ============================================================
// PDF STYLES (UNIVERSAL)
// ============================================================
function getPDFStyles() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #222; background: #fff; padding: 16px 20px; line-height: 1.5; }
    .pdf-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 3px solid #1a5276; margin-bottom: 22px; }
    .company-logo img { width: 160px; height: auto; max-height: 80px; object-fit: contain; }
    .company-logo p { margin-top: 4px; font-size: 9px; color: #555; }
    .report-info { text-align: right; }
    .report-info h2 { color: #1a5276; font-size: 16px; margin-bottom: 3px; }
    .report-info p { color: #666; font-size: 9px; margin: 1px 0; }
    .pdf-section { margin-bottom: 26px; page-break-inside: avoid; }
    .pdf-section h2 { font-size: 13px; color: #1a5276; border-bottom: 2px solid #1a5276; padding-bottom: 5px; margin-bottom: 12px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
    .summary-item { background: #f0f4f8; border-left: 4px solid #1a5276; padding: 8px 10px; border-radius: 4px; }
    .summary-item .label { font-size: 8px; color: #555; text-transform: uppercase; }
    .summary-item .value { font-size: 11px; font-weight: 700; color: #1a5276; margin-top: 2px; }
    .summary-item.highlight { background: #1a5276; }
    .summary-item.highlight .label { color: rgba(255,255,255,0.7); }
    .summary-item.highlight .value { color: #fff; }
    .cost-box { border: 1px solid #d0d7e3; border-radius: 6px; overflow: hidden; margin-bottom: 16px; }
    .cost-box-row { display: flex; justify-content: space-between; padding: 8px 14px; border-bottom: 1px solid #e8ecf1; font-size: 10px; }
    .cost-box-row:last-child { border-bottom: none; }
    .cost-box-row:nth-child(even) { background: #f8fafc; }
    .cost-box-row.subtotal { background: #e8f0f8; font-weight: 600; }
    .cost-box-row.tax { background: #fff8e6; }
    .cost-box-row.grand-total { background: #1a5276; color: #fff; font-weight: 700; font-size: 12px; }
    .pdf-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 8px; }
    .pdf-table th { background: #1a5276; color: #fff; padding: 6px 5px; text-align: left; font-weight: 600; font-size: 8.5px; border: 1px solid #144368; }
    .pdf-table th.center, .pdf-table td.center { text-align: center; }
    .pdf-table th.right, .pdf-table td.right { text-align: right; }
    .pdf-table td { padding: 5px; border: 1px solid #dde3eb; vertical-align: middle; }
    .pdf-table tr:nth-child(even) td { background: #f6f9fc; }
    .pdf-table td.amount { text-align: right; font-weight: 600; color: #1a5276; }
    .pdf-table td.desc { max-width: 220px; word-wrap: break-word; }
    .pdf-table td.img-cell { text-align: center; width: 52px; }
    .pdf-table td.img-cell img { max-width: 44px; max-height: 36px; object-fit: contain; border: 1px solid #ddd; border-radius: 3px; }
    .pdf-table tr.subtotal-row td { background: #dce9f5 !important; font-weight: 600; }
    .pdf-table tr.total-row td { background: #1a5276 !important; color: #fff !important; font-weight: 700; }
    .pdf-table tr.section-header-row td { background: #2e86c1 !important; color: #fff !important; font-weight: 700; }
    .pdf-table tr.sub-row td { background: #fefefe !important; font-size: 8.5px; }
    .item-badge { display: inline-block; margin-top: 2px; font-size: 7.5px; background: #d5e8d4; color: #27ae60; padding: 1px 5px; border-radius: 8px; }
    .section-total-bar { background: #27ae60; color: #fff; padding: 7px 12px; border-radius: 4px; font-weight: 700; font-size: 10px; display: flex; justify-content: space-between; margin: 8px 0 6px; }
    .section-total-bar.blue { background: #1a5276; }
    .section-total-bar.purple { background: #6c3483; }
    .section-total-bar.orange { background: #ca6f1e; }
    .section-total-bar.teal { background: #0e6655; }
    .pdf-footer { margin-top: 30px; padding-top: 14px; border-top: 2px solid #1a5276; }
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 12px; }
    .footer-section h3 { color: #1a5276; font-size: 10px; margin-bottom: 6px; }
    .footer-section ul { list-style: none; }
    .footer-section li { font-size: 8.5px; color: #555; margin-bottom: 2px; }
    .footer-bottom { text-align: center; font-size: 8px; color: #888; padding-top: 8px; border-top: 1px solid #e0e0e0; }
    .page-break { page-break-before: always; }
    @media print { body { padding: 8px 12px; } .no-print { display: none !important; } .pdf-section { page-break-inside: avoid; } }
  `;
}

// ============================================================
// TABLE HEADER BUILDERS (UNIVERSAL)
// ============================================================
function buildCivilTableHeaders(options = {}) {
  const { hasImage = true, hasCode = true, hasUnit = true, hasQty = true, hasRate = true, hasRemarks = true, currency = 'INR' } = options;
  const sym = getCurrencyLabel(currency);
  return `
    <th class="center" style="width:32px">Sl.No</th>
    ${hasCode ? '<th style="width:55px">Code</th>' : ''}
    <th>Description</th>
    ${hasImage ? '<th class="center" style="width:52px">Image</th>' : ''}
    ${hasUnit ? '<th class="center" style="width:40px">Unit</th>' : ''}
    ${hasQty ? '<th class="center" style="width:50px">QTY</th>' : ''}
    ${hasRate ? `<th class="right" style="width:65px">Rate (${sym})</th>` : ''}
    <th class="right" style="width:70px">Amount (${sym})</th>
    ${hasRemarks ? '<th style="width:90px">Remarks</th>' : ''}
  `;
}

function buildMepTableHeaders(options = {}) {
  const { hasImage = true, hasCode = true, hasUnit = true, hasQty = true, hasRate = true, hasRemarks = true, currency = 'INR' } = options;
  const sym = getCurrencyLabel(currency);
  return `
    <th class="center" style="width:32px">Sl.No</th>
    ${hasCode ? '<th style="width:55px">Code</th>' : ''}
    <th>Description</th>
    ${hasImage ? '<th class="center" style="width:52px">Image</th>' : ''}
    ${hasUnit ? '<th class="center" style="width:40px">Unit</th>' : ''}
    ${hasQty ? '<th class="center" style="width:50px">QTY</th>' : ''}
    ${hasRate ? `<th class="right" style="width:60px">Supply Rate (${sym})</th>` : ''}
    ${hasRate ? `<th class="right" style="width:60px">Install Rate (${sym})</th>` : ''}
    <th class="right" style="width:65px">Supply (${sym})</th>
    <th class="right" style="width:65px">Install (${sym})</th>
    <th class="right" style="width:70px">Total (${sym})</th>
    ${hasRemarks ? '<th style="width:90px">Remarks</th>' : ''}
  `;
}

function buildPipingTableHeaders(options = {}) {
  const { hasCode = true, hasUnit = true, hasQty = true, hasRate = true, hasRemarks = true, currency = 'INR' } = options;
  const sym = getCurrencyLabel(currency);
  return `
    <th class="center" style="width:32px">Sl.No</th>
    ${hasCode ? '<th style="width:55px">Code</th>' : ''}
    <th>Description</th>
    <th class="center" style="width:48px">Dia (mm)</th>
    ${hasUnit ? '<th class="center" style="width:40px">Unit</th>' : ''}
    ${hasQty ? '<th class="center" style="width:50px">QTY</th>' : ''}
    ${hasRate ? `<th class="right" style="width:60px">Supply Rate (${sym})</th>` : ''}
    ${hasRate ? `<th class="right" style="width:60px">Install Rate (${sym})</th>` : ''}
    <th class="right" style="width:65px">Supply (${sym})</th>
    <th class="right" style="width:65px">Install (${sym})</th>
    <th class="right" style="width:70px">Total (${sym})</th>
    ${hasRemarks ? '<th style="width:90px">Remarks</th>' : ''}
  `;
}

// ============================================================
// ROW BUILDERS (UNIVERSAL) - WITH SUB-ROW SUPPORT AND FIXED EXCAVATION RATES
// ============================================================
function buildCivilRows(items, quantities, resultData, remarks = {}, qtyMap, colOpts = {}, shotcretingSplit, rccShutteringSplit) {
  if (!items || items.length === 0) {
    return `<tr><td colspan="10" style="text-align:center;padding:12px;">No data available</td></tr>`;
  }

  const { hasImage = true, hasCode = true, hasUnit = true, hasQty = true, hasRate = true, hasRemarks = true, currency = 'INR', exchangeRate = 83.0 } = colOpts;
  const fmt = (v) => formatCurrencyValue(v, currency, exchangeRate);
  let html = '';

  (items || []).forEach(item => {
    if (!item) return;
    const slNo = Number(item.SlNo ?? item.sl_no);
    const isExcavation = (slNo === 1);
    const hasSubRows = (slNo === 9 || slNo === 10);

    let qty = 0;
    let rate = 0;
    let amount = 0;
    let showValues = true;

    if (hasSubRows && qtyMap === MAIN_POOL_QTY_FIELDS) {
      showValues = false;
    } else if (isExcavation && qtyMap === MAIN_POOL_QTY_FIELDS) {
      // Excavation parent row shows total from split
      const split = (resultData || {}).civil_quantities?.excavation_split || (quantities || {}).excavation_split || {};
      if (split && (split['1.1'] || split['1.2'])) {
        const qty11 = extractSubQty(split['1.1']);
        const rate11 = Number(split['1.1']?.rate ?? split['1.1']?.Rate ?? item.Rate ?? 0) || 0;
        const qty12 = extractSubQty(split['1.2']);
        const rate12 = Number(split['1.2']?.rate ?? split['1.2']?.Rate ?? item.Rate ?? 0) || 0;
        qty = qty11 + qty12;
        amount = (qty11 * rate11) + (qty12 * rate12);
        rate = qty > 0 ? amount / qty : 0; // blended rate for display
      } else {
        qty = resolveQty(slNo, qtyMap, quantities, resultData);
        rate = Number(item.Rate) || 0;
        amount = qty * rate;
      }
    } else {
      qty = resolveQty(slNo, qtyMap, quantities, resultData);
      rate = Number(item.Rate) || 0;
      amount = qty * rate;
    }

    const imageUrl = getImageUrlForPDF(item.Image);

    html += '<tr>';
    html += `<td class="center">${slNo}</td>`;
    if (hasCode) html += `<td class="center">${item.Code || 'N/A'}</td>`;
    html += `<td class="desc">${item.Description || 'N/A'}</td>`;
    if (hasImage) html += `<td class="img-cell">${imageUrl ? `<img src="${imageUrl}" onerror="this.parentNode.innerHTML='-'"/>` : '-'}</td>`;
    if (hasUnit) html += `<td class="center">${item.Unit || ''}</td>`;
    if (hasQty) {
      if (showValues) {
        html += `<td class="center">${qty ? safeToFixed(qty, 3) : '0.000'}</td>`;
      } else {
        html += `<td class="center">—</td>`;
      }
    }
    if (hasRate) {
      if (showValues) {
        html += `<td class="right">${fmt(rate)}</td>`;
      } else {
        html += `<td class="right">—</td>`;
      }
    }
    if (showValues) {
      html += `<td class="amount">${fmt(amount)}</td>`;
    } else {
      html += `<td class="amount">—</td>`;
    }
    if (hasRemarks) html += `<td style="font-size:8px;">${(remarks || {})[slNo] || ''}</td>`;
    html += '</tr>';

    // Excavation sub-rows — FIXED: use individual rates from split
    if (isExcavation && qtyMap === MAIN_POOL_QTY_FIELDS) {
      const split = (resultData || {}).civil_quantities?.excavation_split || (quantities || {}).excavation_split || (quantities || {}).excavation_split_qty || {};
      
      if (split && (split['1.1'] || split['1.2'])) {
        const sub1 = split['1.1'] || {};
        const sub2 = split['1.2'] || {};
        
        // FIX: use each sub-row's own rate, fallback to parent rate
        const parentRate = Number(item.Rate) || 0;
        const rate11 = Number(sub1.rate ?? sub1.Rate ?? parentRate) || 0;
        const rate12 = Number(sub2.rate ?? sub2.Rate ?? parentRate) || 0;
        const qty11  = extractSubQty(sub1);
        const qty12  = extractSubQty(sub2);
        
        // Sub-row 1.1
        html += '<tr class="sub-row">';
        html += `<td class="center">1.1</td>`;
        if (hasCode) html += `<td class="center">—</td>`;
        html += `<td class="desc" style="padding-left:20px;">Excavation up to 1.50m depth</td>`;
        if (hasImage) html += `<td class="img-cell">—</td>`;
        if (hasUnit) html += `<td class="center">CuM</td>`;
        if (hasQty) html += `<td class="center">${safeToFixed(qty11, 3)}</td>`;
        if (hasRate) html += `<td class="right">${fmt(rate11)}</td>`;   // ← own rate
        html += `<td class="amount">${fmt(qty11 * rate11)}</td>`;       // ← own calc
        if (hasRemarks) html += '<td>—</td>';
        html += '</tr>';
        
        // Sub-row 1.2
        html += '<tr class="sub-row">';
        html += `<td class="center">1.2</td>`;
        if (hasCode) html += `<td class="center">—</td>`;
        html += `<td class="desc" style="padding-left:20px;">Excavation from 1.50m to 3.00m depth</td>`;
        if (hasImage) html += `<td class="img-cell">—</td>`;
        if (hasUnit) html += `<td class="center">CuM</td>`;
        if (hasQty) html += `<td class="center">${safeToFixed(qty12, 3)}</td>`;
        if (hasRate) html += `<td class="right">${fmt(rate12)}</td>`;   // ← own rate
        html += `<td class="amount">${fmt(qty12 * rate12)}</td>`;       // ← own calc
        if (hasRemarks) html += '<td>—</td>';
        html += '</tr>';
      }
    }

    // Sub-rows for items 9 and 10
    if (hasSubRows && qtyMap === MAIN_POOL_QTY_FIELDS) {
      const splitData = getSplitData(slNo, quantities, resultData, shotcretingSplit, rccShutteringSplit);
      const subRows = SUB_ROWS[slNo] || [];
      const parentRate = Number(item.Rate) || 0;
      
      subRows.forEach(sub => {
        const rawValue = splitData?.[sub.slNo];
        const subQty = extractSubQty(rawValue);
        const subAmount = subQty * parentRate;
        
        html += '<tr class="sub-row">';
        html += `<td class="center">${sub.slNo}</td>`;
        if (hasCode) html += `<td class="center">—</td>`;
        html += `<td class="desc" style="padding-left:20px;">${sub.description}</td>`;
        if (hasImage) html += `<td class="img-cell">—</td>`;
        if (hasUnit) html += `<td class="center">${sub.unit || (item.Unit || '')}</td>`;
        if (hasQty) html += `<td class="center">${safeToFixed(subQty, 3)}</td>`;
        if (hasRate) html += `<td class="right">${fmt(parentRate)}</td>`;
        html += `<td class="amount">${fmt(subAmount)}</td>`;
        if (hasRemarks) html += '<td>—</td>';
        html += '</tr>';
      });
    }
  });

  return html;
}

function buildBalanceTankRows(items, quantities, resultData, remarks, colOpts) {
  if (!items || items.length === 0) return '<tr><td colspan="10">No data available</td></tr>';
  return buildCivilRows(
    (items || []).filter(i => i && (Number(i.SlNo ?? i.sl_no) >= 1 && Number(i.SlNo ?? i.sl_no) <= 12)),
    quantities,
    resultData,
    remarks,
    BALANCE_TANK_QTY_FIELDS,
    colOpts,
    null,
    null
  );
}

function buildPumpRoomRows(items, quantities, resultData, remarks, colOpts) {
  if (!items || items.length === 0) return '<tr><td colspan="10">No data available</td></tr>';
  return buildCivilRows(
    (items || []).filter(i => i && (Number(i.SlNo ?? i.sl_no) >= 1 && Number(i.SlNo ?? i.sl_no) <= 12)),
    quantities,
    resultData,
    remarks,
    PUMP_ROOM_QTY_FIELDS,
    colOpts,
    null,
    null
  );
}

function buildMEPRows(items, mepQuantities, resultData, dynamicRates, selectedAdvancedEquipment, mepRemarks, isOverflow, isInfinity, isJacuzzi, colOpts = {}) {
  const safeItems = items || [];
  if (safeItems.length === 0) {
    return '<tr><td colspan="12" style="text-align:center;padding:12px;">No MEP data available</td></tr>';
  }

  const { hasImage = true, hasCode = true, hasUnit = true, hasQty = true, hasRate = true, hasRemarks = true, currency = 'INR', exchangeRate = 83.0 } = colOpts;
  const fmt = (v) => formatCurrencyValue(v, currency, exchangeRate);
  const qtyMap = isJacuzzi ? JACUZZI_MEP_QTY_FIELDS : MEP_QTY_FIELDS;
  const safeAdvanced = selectedAdvancedEquipment || [];
  const safeRemarks = mepRemarks || {};
  const safeDynamicRates = dynamicRates || {};
  let html = '';

  const sortedItems = [...safeItems].sort((a, b) => (Number(a.SlNo ?? a.sl_no) || 0) - (Number(b.SlNo ?? b.sl_no) || 0));
  const baseItems = sortedItems.filter(i => i && (Number(i.SlNo ?? i.sl_no) <= 29));
  const advancedItems = sortedItems.filter(i => i && (Number(i.SlNo ?? i.sl_no) >= 30 && Number(i.SlNo ?? i.sl_no) <= 34));

  const colCount = 1 + (hasCode ? 1 : 0) + 1 + (hasImage ? 1 : 0) + (hasUnit ? 1 : 0) + (hasQty ? 1 : 0) + (hasRate ? 2 : 0) + 3 + (hasRemarks ? 1 : 0);
  html += `<tr class="section-header-row"><td colspan="${colCount}">Base MEP Systems (Items 1–29)</td></tr>`;

  let baseTotal = 0;

  baseItems.forEach(item => {
    if (!item) return;
    const slNo = Number(item.SlNo ?? item.sl_no);

    if (isInfinity && slNo === 11) return;
    if (isJacuzzi && (slNo === 11 || slNo === 12 || slNo === 13)) return;

    let qty = 0;
    if (isJacuzzi && slNo === 29) {
      qty = 0;
    } else {
      qty = resolveQty(slNo, qtyMap, mepQuantities, resultData);
    }

    const supplyRate = getSupplyRate(item, safeDynamicRates);
    const installRate = supplyRate * INSTALLATION_PERCENT;
    const supplyCost = qty * supplyRate;
    const installCost = qty * installRate;
    const total = supplyCost + installCost;
    baseTotal += total;

    const imageUrl = getImageUrlForPDF(item.Image);
    const isGrating = isOverflow && slNo === 11;
    const isGutterDrain = isOverflow && slNo === 13;

    html += '<tr>';
    html += `<td class="center">${slNo}</td>`;
    if (hasCode) html += `<td class="center">${item.Code || 'N/A'}</td>`;

    let descHtml = item.Description || 'N/A';
    if (isGrating) descHtml += '<br><span class="item-badge">⭐ Overflow Grating</span>';
    if (isGutterDrain) descHtml += '<br><span class="item-badge">Gutter Drain</span>';
    if (isJacuzzi && slNo === 28) descHtml += '<br><span class="item-badge">💧 Jet Pump (Fixed ₹52,500)</span>';
    if (isJacuzzi && slNo === 26 && qty > 0) descHtml += `<br><span class="item-badge">💦 ${qty} Jets</span>`;
    if (isJacuzzi && slNo === 27 && qty > 0) descHtml += `<br><span class="item-badge">🌊 ${qty} Air Controllers</span>`;

    html += `<td class="desc">${descHtml}</td>`;
    if (hasImage) html += `<td class="img-cell">${imageUrl ? `<img src="${imageUrl}" onerror="this.parentNode.innerHTML='-'"/>` : '-'}</td>`;
    if (hasUnit) html += `<td class="center">${item.Unit || ''}</td>`;
    if (hasQty) html += `<td class="center">${qty ? safeToFixed(qty, 2) : '0.00'}</td>`;
    if (hasRate) {
      html += `<td class="right">${fmt(supplyRate)}</td>`;
      html += `<td class="right">${fmt(installRate)}</td>`;
    }
    html += `<td class="right">${fmt(supplyCost)}</td>`;
    html += `<td class="right">${fmt(installCost)}</td>`;
    html += `<td class="amount">${fmt(total)}</td>`;
    if (hasRemarks) html += `<td style="font-size:8px;">${safeRemarks[slNo] || ''}</td>`;
    html += '</tr>';
  });

  const subColSpan = (hasCode ? 1 : 0) + 1 + (hasImage ? 1 : 0) + (hasUnit ? 1 : 0) + (hasQty ? 1 : 0) + (hasRate ? 2 : 0);
  html += `<tr class="subtotal-row">`;
  html += `<td class="right" colspan="${1 + subColSpan}" style="font-weight:700">Base MEP Subtotal:</td>`;
  html += `<td class="right"></td><td class="right"></td>`;
  html += `<td class="right" colspan="1">${fmt(baseTotal)}</td>`;
  if (hasRemarks) html += '<td></td>';
  html += '</tr>';

  const filteredAdvanced = (advancedItems || []).filter(item => item && safeAdvanced.includes(Number(item.SlNo ?? item.sl_no)));
  if (filteredAdvanced.length > 0) {
    html += `<tr class="section-header-row"><td colspan="${colCount}">Advanced Equipment (Items 30–34) — Optional</td></tr>`;
    let advTotal = 0;
    filteredAdvanced.forEach(item => {
      if (!item) return;
      const slNo = Number(item.SlNo ?? item.sl_no);
      const qty = 1;
      const supplyRate = getSupplyRate(item, safeDynamicRates);
      const installRate = supplyRate * INSTALLATION_PERCENT;
      const supplyCost = qty * supplyRate;
      const installCost = qty * installRate;
      const total = supplyCost + installCost;
      advTotal += total;
      const imageUrl = getImageUrlForPDF(item.Image);
      html += '<tr>';
      html += `<td class="center">${slNo}</td>`;
      if (hasCode) html += `<td class="center">${item.Code || 'N/A'}</td>`;
      let descHtml = item.Description || 'N/A';
      descHtml += '<br><span class="item-badge" style="background:#d5f5e3;">✅ Selected</span>';
      html += `<td class="desc">${descHtml}</td>`;
      if (hasImage) html += `<td class="img-cell">${imageUrl ? `<img src="${imageUrl}" onerror="this.parentNode.innerHTML='-'"/>` : '-'}</td>`;
      if (hasUnit) html += `<td class="center">${item.Unit || ''}</td>`;
      if (hasQty) html += `<td class="center">1</td>`;
      if (hasRate) {
        html += `<td class="right">${fmt(supplyRate)}</td>`;
        html += `<td class="right">${fmt(installRate)}</td>`;
      }
      html += `<td class="right">${fmt(supplyCost)}</td>`;
      html += `<td class="right">${fmt(installCost)}</td>`;
      html += `<td class="amount">${fmt(total)}</td>`;
      if (hasRemarks) html += `<td style="font-size:8px;">${safeRemarks[slNo] || ''}</td>`;
      html += '</tr>';
    });
    html += `<tr class="subtotal-row">`;
    html += `<td class="right" colspan="${1 + subColSpan}" style="font-weight:700">Advanced Equipment Subtotal:</td>`;
    html += `<td class="right"></td><td class="right"></td>`;
    html += `<td class="right" colspan="1">${fmt(advTotal)}</td>`;
    if (hasRemarks) html += '<td></td>';
    html += '</tr>';
  }

  if (isJacuzzi) {
    const heatPumpItem = safeItems.find(i => i && Number(i.SlNo ?? i.sl_no) === 29);
    if (heatPumpItem && safeAdvanced.includes(29)) {
      const qty = 1;
      const supplyRate = getSupplyRate(heatPumpItem, safeDynamicRates);
      const installRate = supplyRate * INSTALLATION_PERCENT;
      const supplyCost = qty * supplyRate;
      const installCost = qty * installRate;
      const total = supplyCost + installCost;
      html += `<tr class="section-header-row"><td colspan="${colCount}">Heat Pump (Item 29) — Optional</td></tr>`;
      html += '<tr>';
      html += `<td class="center">29</td>`;
      if (hasCode) html += `<td class="center">${heatPumpItem.Code || 'N/A'}</td>`;
      let descHtml = heatPumpItem.Description || 'Heat Pump';
      descHtml += '<br><span class="item-badge" style="background:#d5f5e3;">✅ Selected</span>';
      html += `<td class="desc">${descHtml}</td>`;
      if (hasImage) html += `<td class="img-cell">${getImageUrlForPDF(heatPumpItem.Image) ? `<img src="${getImageUrlForPDF(heatPumpItem.Image)}" onerror="this.parentNode.innerHTML='-'"/>` : '-'}</td>`;
      if (hasUnit) html += `<td class="center">${heatPumpItem.Unit || ''}</td>`;
      if (hasQty) html += `<td class="center">1</td>`;
      if (hasRate) {
        html += `<td class="right">${fmt(supplyRate)}</td>`;
        html += `<td class="right">${fmt(installRate)}</td>`;
      }
      html += `<td class="right">${fmt(supplyCost)}</td>`;
      html += `<td class="right">${fmt(installCost)}</td>`;
      html += `<td class="amount">${fmt(total)}</td>`;
      if (hasRemarks) html += `<td style="font-size:8px;">${safeRemarks[29] || ''}</td>`;
      html += '</tr>';
    }
  }

  return html;
}

function buildPipingRows(pipingItems, colOpts = {}) {
  const safeItems = pipingItems || [];
  if (safeItems.length === 0) {
    return '<tr><td colspan="12" style="text-align:center;padding:12px;">No piping data available</td></tr>';
  }

  const { hasCode = true, hasUnit = true, hasQty = true, hasRate = true, hasRemarks = true, currency = 'INR', exchangeRate = 83.0 } = colOpts;
  const fmt = (v) => formatCurrencyValue(v, currency, exchangeRate);
  let html = '';
  let grandTotal = 0;

  const categories = {};
  safeItems.forEach((item, idx) => {
    if (!item) return;
    const cat = (item.category || item.Category || 'other').toLowerCase();
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ ...item, _idx: idx });
  });

  const catLabels = {
    pipe: 'Pipes',
    header: 'Headers',
    ball_valve: 'Ball Valves',
    butterfly_valve: 'Butterfly Valves',
    check_valve: 'Check Valves',
    flange: 'Flanges',
    puddle_flange: 'Puddle Flanges',
    other: 'Other Items',
  };

  Object.entries(categories).forEach(([cat, items]) => {
    const label = catLabels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
    let catTotal = 0;

    (items || []).forEach((item, idx) => {
      if (!item) return;
      const qty = Number(item.quantity ?? item.Quantity ?? 0) || 0;
      const rate = Number(item.rate ?? item.Rate ?? 0) || 0;
      const supply = qty * rate;
      const install = supply * INSTALLATION_PERCENT;
      const total = supply + install;
      catTotal += total;
      grandTotal += total;

      const dia = item.dia ?? item.Dia ?? null;
      const desc = item.description ?? item.Description ?? item.type ?? 'N/A';
      const unit = item.unit ?? item.Unit ?? 'Nos';
      const code = item.code ?? item.Code ?? '-';

      html += '<tr>';
      html += `<td class="center">${item.sl_no ?? item.SlNo ?? (idx + 1)}</td>`;
      if (hasCode) html += `<td class="center">${code}</td>`;
      html += `<td class="desc">${desc}</td>`;
      html += `<td class="center">${dia !== null && dia !== 0 ? dia + ' mm' : '—'}</td>`;
      if (hasUnit) html += `<td class="center">${unit}</td>`;
      if (hasQty) html += `<td class="center">${safeToFixed(qty, 2)}</td>`;
      if (hasRate) {
        html += `<td class="right">${fmt(rate)}</td>`;
        html += `<td class="right">${fmt(rate * INSTALLATION_PERCENT)}</td>`;
      }
      html += `<td class="right">${fmt(supply)}</td>`;
      html += `<td class="right">${fmt(install)}</td>`;
      html += `<td class="amount">${fmt(total)}</td>`;
      if (hasRemarks) html += '<td style="font-size:8px;"></td>';
      html += '</tr>';
    });

    const spanCount = 1 + (hasCode ? 1 : 0) + 1 + 1 + (hasUnit ? 1 : 0) + (hasQty ? 1 : 0) + (hasRate ? 2 : 0);
    html += `<tr class="subtotal-row">`;
    html += `<td class="right" colspan="${spanCount}" style="font-weight:700">${label} Subtotal:</td>`;
    html += `<td class="right" colspan="1"></td><td class="right" colspan="1"></td>`;
    html += `<td class="right" colspan="1">${fmt(catTotal)}</td>`;
    if (hasRemarks) html += '<td></td>';
    html += '</tr>';
  });

  const totalSpanCount = 1 + (hasCode ? 1 : 0) + 1 + 1 + (hasUnit ? 1 : 0) + (hasQty ? 1 : 0) + (hasRate ? 2 : 0);
  html += `<tr class="total-row">`;
  html += `<td class="right" colspan="${totalSpanCount}" style="font-weight:700">Piping Grand Total:</td>`;
  html += `<td class="right" colspan="1"></td><td class="right" colspan="1"></td>`;
  html += `<td class="right" colspan="1" style="font-weight:700">${fmt(grandTotal)}</td>`;
  if (hasRemarks) html += '<td></td>';
  html += '</tr>';

  return html;
}

// ============================================================
// GENERATE PDF HTML CONTENT (UNIVERSAL)
// ============================================================
async function generatePDFContent(config) {
  const {
    resultData = {},
    dimensions = {},
    poolType = 'skimmer',
    constructionType = 'in-ground',
    mainPoolItems = [],
    civilQuantities = {},
    mainPoolRemarks = {},
    mainPoolTotal = 0,
    balanceTankItems = [],
    balanceTankQuantities = {},
    balanceTankRemarks = {},
    balanceTankTotal = 0,
    hasBalancingTank = false,
    pumpRoomItems = [],
    pumpRoomQuantities = {},
    pumpRoomRemarks = {},
    pumpRoomTotal = 0,
    includePumpRoom = true,
    mepItems = [],
    mepQuantities = {},
    mepRemarks = {},
    dynamicRates = {},
    selectedAdvancedEquipment = [],
    mepTotal = 0,
    isJacuzzi = false,
    pipingItems = [],
    pipingTotal = 0,
    pumpRoomDistance = 15,
    grandTotal = 0,
    columnVisibility = { image: true, unit: true, qty: true, fixedRate: true, remarks: true, code: true },
    currency = 'INR',
    exchangeRate = 83.0,
    companyProfile = DEFAULT_COMPANY_PROFILE,
    shotcretingSplit = null,
    rccShutteringSplit = null,
  } = config || {};

  const fmt = (v) => formatCurrencyValue(v, currency, exchangeRate);
  const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const poolTypeStr = String(poolType || 'skimmer').toLowerCase();
  const isOverflow = poolTypeStr === 'overflow';
  const isInfinity = poolTypeStr === 'infinity';

  const colOpts = {
    hasImage: (columnVisibility || {}).image !== false,
    hasCode: (columnVisibility || {}).code !== false,
    hasUnit: (columnVisibility || {}).unit !== false,
    hasQty: (columnVisibility || {}).qty !== false,
    hasRate: (columnVisibility || {}).fixedRate !== false,
    hasRemarks: (columnVisibility || {}).remarks !== false,
    currency,
    exchangeRate,
  };

  const safeDynamicRates = dynamicRates || {};
  const safeResultData = resultData || {};

  const filterDiameter = safeResultData?.filter_dia_mm || safeDynamicRates?.filter_dia;
  const mpvSize = getMPVSize(filterDiameter);
  const pumpHP = safeResultData?.hp || safeDynamicRates?.hp;
  const poolVolume = safeResultData?.volume_m3 || ((dimensions || {}).length * (dimensions || {}).width * (dimensions || {}).depth) || 0;
  const flowRate = safeResultData?.flowrate_m3_per_hr || (poolVolume / 4.5) || 0;

  const gstAmount = grandTotal * 0.18;
  const grandWithGST = grandTotal + gstAmount;

  const safeDimensions = dimensions || {};
  const dimStr = safeDimensions.length && safeDimensions.width && safeDimensions.depth
    ? `${safeDimensions.length} × ${safeDimensions.width} × ${safeDimensions.depth} m`
    : safeResultData?.dimensions || 'N/A';

  const company = companyProfile || DEFAULT_COMPANY_PROFILE;
  let logoBase64 = null;
  if (company.logo_url) {
    try {
      logoBase64 = await loadLogoAsBase64(company.logo_url);
    } catch (err) {
      console.warn("Failed to load logo for PDF:", err);
    }
  }

  const civilRows = buildCivilRows(
    mainPoolItems || [], civilQuantities || {}, safeResultData, mainPoolRemarks || {},
    MAIN_POOL_QTY_FIELDS, colOpts, shotcretingSplit, rccShutteringSplit
  );
  const balanceRows = buildBalanceTankRows(balanceTankItems || [], balanceTankQuantities || {}, safeResultData, balanceTankRemarks || {}, colOpts);
  const pumpRows = buildPumpRoomRows(pumpRoomItems || [], pumpRoomQuantities || {}, safeResultData, pumpRoomRemarks || {}, colOpts);
  const mepRows = buildMEPRows(mepItems || [], mepQuantities || {}, safeResultData, safeDynamicRates, selectedAdvancedEquipment || [], mepRemarks || {}, isOverflow, isInfinity, isJacuzzi, colOpts);
  const pipingRows = buildPipingRows(pipingItems || [], colOpts);

  const civilColsBeforeAmount =
    1 + (colOpts.hasCode ? 1 : 0) + 1 + (colOpts.hasImage ? 1 : 0) + (colOpts.hasUnit ? 1 : 0) + (colOpts.hasQty ? 1 : 0) + (colOpts.hasRate ? 1 : 0);

  const showPipingSection = (pipingItems || []).length > 0 && !isInfinity;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${getPoolTypeDisplayName(poolType)} Calculation Report</title>
  <style>${getPDFStyles()}</style>
</head>
<body>

<div class="pdf-header">
  <div class="company-logo">
    ${logoBase64 ? `<img src="${logoBase64}" alt="Company Logo" style="width:160px; height:auto; max-height:80px; object-fit:contain;"/>` : '<div style="width:160px; height:60px;"></div>'}
    <p>${company.company_name || 'Professional Pool Design & Construction'}</p>
  </div>
  <div class="report-info">
    <h2>${getPoolTypeDisplayName(poolType)} — Quotation Report</h2>
    <p>Generated: ${currentDate}</p>
    <p>Report ID: #${poolTypeStr.toUpperCase()}-${Date.now().toString().slice(-6)}</p>
    <p>${constructionType === 'terrace' ? '🏢 Terrace Pool' : '⛰️ In-Ground Pool'}</p>
  </div>
</div>

<div class="pdf-section">
  <h2>Executive Summary</h2>
  <div class="summary-grid">
    <div class="summary-item"><div class="label">Pool Type</div><div class="value">${getPoolTypeDisplayName(poolType)}</div></div>
    <div class="summary-item"><div class="label">Construction</div><div class="value">${constructionType === 'terrace' ? 'Terrace' : 'In-Ground'}</div></div>
    <div class="summary-item"><div class="label">Dimensions</div><div class="value">${dimStr}</div></div>
    <div class="summary-item"><div class="label">Volume</div><div class="value">${safeToFixed(poolVolume)} m³</div></div>
    ${filterDiameter ? `<div class="summary-item"><div class="label">Filter</div><div class="value">${filterDiameter} mm</div></div>` : ''}
    ${mpvSize ? `<div class="summary-item"><div class="label">MPV</div><div class="value">${mpvSize}</div></div>` : ''}
    ${pumpHP ? `<div class="summary-item"><div class="label">Pump</div><div class="value">${pumpHP} HP</div></div>` : ''}
    ${flowRate ? `<div class="summary-item"><div class="label">Flow Rate</div><div class="value">${safeToFixed(flowRate)} m³/hr</div></div>` : ''}
    ${hasBalancingTank ? `<div class="summary-item"><div class="label">Balance Tank</div><div class="value">Included</div></div>` : ''}
    ${includePumpRoom ? `<div class="summary-item"><div class="label">Pump Room</div><div class="value">Included (${pumpRoomDistance}m)</div></div>` : ''}
    ${(selectedAdvancedEquipment || []).length > 0 ? `<div class="summary-item"><div class="label">Advanced Equipment</div><div class="value">${(selectedAdvancedEquipment || []).length} selected</div></div>` : ''}
    <div class="summary-item highlight"><div class="label">Total (excl. GST)</div><div class="value">${fmt(grandTotal)}</div></div>
  </div>
</div>

<div class="pdf-section">
  <h2>Project Cost Summary</h2>
  <div class="cost-box">
    <div class="cost-box-row"><span>Civil Works — Main Pool</span><span>${fmt(mainPoolTotal)}</span></div>
    ${hasBalancingTank ? `<div class="cost-box-row"><span>Civil Works — Balance Tank</span><span>${fmt(balanceTankTotal)}</span></div>` : ''}
    ${includePumpRoom ? `<div class="cost-box-row"><span>Civil Works — Pump Room</span><span>${fmt(pumpRoomTotal)}</span></div>` : ''}
    <div class="cost-box-row"><span>MEP Systems (Supply + Installation)</span><span>${fmt(mepTotal)}</span></div>
    ${!isInfinity && pipingTotal > 0 ? `<div class="cost-box-row"><span>Piping System (Supply + Installation)</span><span>${fmt(pipingTotal)}</span></div>` : ''}
    <div class="cost-box-row subtotal"><span>Subtotal (Excl. GST)</span><span>${fmt(grandTotal)}</span></div>
    <div class="cost-box-row tax"><span>GST @ 18%</span><span>${fmt(gstAmount)}</span></div>
    <div class="cost-box-row grand-total"><span>GRAND TOTAL (Incl. GST)</span><span>${fmt(grandWithGST)}</span></div>
  </div>
</div>

<div class="pdf-section page-break">
  <h2>Civil Works — Main Pool Construction (14 Items)</h2>
  <div class="section-total-bar"><span>Civil Works Total</span><span>${fmt(mainPoolTotal)}</span></div>
  <table class="pdf-table">
    <thead><tr>${buildCivilTableHeaders(colOpts)}</tr></thead>
    <tbody>${civilRows}</tbody>
    <tfoot>
      <tr class="total-row">
        <td class="right" colspan="${civilColsBeforeAmount}">Main Pool Civil Total:</td>
        <td class="amount">${fmt(mainPoolTotal)}</td>
        ${colOpts.hasRemarks ? '<td></td>' : ''}
      </tr>
    </tfoot>
  </table>
</div>

${hasBalancingTank ? `
<div class="pdf-section">
  <h2>Civil Works — Balance Tank (12 Items)</h2>
  <div class="section-total-bar blue"><span>Balance Tank Total</span><span>${fmt(balanceTankTotal)}</span></div>
  <table class="pdf-table">
    <thead><tr>${buildCivilTableHeaders(colOpts)}</tr></thead>
    <tbody>${balanceRows}</tbody>
    <tfoot>
      <tr class="total-row">
        <td class="right" colspan="${civilColsBeforeAmount}">Balance Tank Total:</td>
        <td class="amount">${fmt(balanceTankTotal)}</td>
        ${colOpts.hasRemarks ? '<td></td>' : ''}
      </tr>
    </tfoot>
  </table>
</div>
` : ''}

${includePumpRoom ? `
<div class="pdf-section">
  <h2>Civil Works — Pump Room Construction (12 Items)</h2>
  <div class="section-total-bar orange"><span>Pump Room Total</span><span>${fmt(pumpRoomTotal)}</span></div>
  <table class="pdf-table">
    <thead><tr>${buildCivilTableHeaders(colOpts)}</tr></thead>
    <tbody>${pumpRows}</tbody>
    <tfoot>
      <tr class="total-row">
        <td class="right" colspan="${civilColsBeforeAmount}">Pump Room Total:</td>
        <td class="amount">${fmt(pumpRoomTotal)}</td>
        ${colOpts.hasRemarks ? '<td></td>' : ''}
      </tr>
    </tfoot>
  </table>
</div>
` : ''}

<div class="pdf-section page-break">
  <h2>MEP Systems — Mechanical, Electrical &amp; Plumbing</h2>
  <div class="section-total-bar purple"><span>MEP Total (Supply + Installation)</span><span>${fmt(mepTotal)}</span></div>
  ${safeDynamicRates?.source === 'no_match' ? `<div style="background:#fde8e8;border-left:4px solid #c0392b;padding:8px;margin-bottom:10px;font-size:9px;">⚠️ No exact filter diameter match found. Filter/Pump rates are ₹0.</div>` : ''}
  ${isInfinity ? `<div style="background:#e8f4fc;border-left:4px solid #1a5276;padding:8px;margin-bottom:10px;font-size:9px;">🌊 Infinity Pool: Skimmer (SlNo 11) is not required.</div>` : ''}
  ${isOverflow ? `<div style="background:#e8f4fc;border-left:4px solid #1a5276;padding:8px;margin-bottom:10px;font-size:9px;">⭐ Overflow Pool: SlNo 11 = Overflow Grating, SlNo 13 = Gutter Drain.</div>` : ''}
  <table class="pdf-table">
    <thead><tr>${buildMepTableHeaders(colOpts)}</tr></thead>
    <tbody>${mepRows}</tbody>
  </table>
</div>

${showPipingSection ? `
<div class="pdf-section page-break">
  <h2>Piping System (Supply + 15% Installation)</h2>
  <div class="section-total-bar teal"><span>Piping Total (Supply + Installation)</span><span>${fmt(pipingTotal)}</span></div>
  ${pumpRoomDistance ? `<div style="font-size:8.5px;margin-bottom:8px;padding:6px 10px;background:#e8f4f8;border-radius:4px;">📏 Pump Room Distance: <strong>${pumpRoomDistance} m</strong> | ${(pipingItems || []).length} piping items</div>` : ''}
  <table class="pdf-table">
    <thead><tr>${buildPipingTableHeaders(colOpts)}</tr></thead>
    <tbody>${pipingRows}</tbody>
  </table>
</div>
` : ''}

<div class="pdf-footer">
  <div class="footer-grid">
    <div class="footer-section">
      <h3>Terms &amp; Conditions</h3>
      <ul>
        <li>1. Prices valid for 30 days from quotation date.</li>
        <li>2. GST @ 18% applicable on all items.</li>
        <li>3. Payment: 50% advance | 40% before dispatch | 10% on commissioning.</li>
        <li>4. Delivery: Stock 2-3 weeks | Imports 14 weeks from PO.</li>
        <li>5. Scope: Supply, Installation, Testing &amp; Commissioning of MEP &amp; Tiling.</li>
        <li>6. Quantities may vary ±10-15% due to site conditions.</li>
        <li>7. Pump Room: ${includePumpRoom ? 'Included' : 'Not included'} | MPV: ${mpvSize} | Pump: ${pumpHP || 'N/A'} HP.</li>
        <li>8. ${(selectedAdvancedEquipment || []).length > 0 ? `${(selectedAdvancedEquipment || []).length} advanced equipment item(s) selected.` : 'No advanced equipment selected.'}</li>
      </ul>
    </div>
    <div class="footer-section">
      <h3>Contact</h3>
      <ul>
        <li><strong>${company.company_name || 'Intellithon Technologies'}</strong></li>
        <li>📧 ${company.email || 'info@intelithon.com'}</li>
        <li>📞 ${company.phone || '+91 9964457127'}</li>
        <li>🌐 ${company.website || 'www.intelithon.in'}</li>
      </ul>
      <br/>
      <h3>Rate Source</h3>
      <ul>
        <li>Filter: ${fmt(safeDynamicRates?.filter_rate || 0)}</li>
        <li>Pump: ${fmt(safeDynamicRates?.pump_rate || 0)}</li>
        <li>Source: ${safeDynamicRates?.source || 'N/A'}</li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    © ${new Date().getFullYear()} ${company.company_name || 'Intellithon Technologies'}. All rights reserved. | Generated: ${currentDate}
    | Pool: ${getPoolTypeDisplayName(poolType)} | Currency: ${currency}
  </div>
</div>

<div class="no-print" style="position:fixed;bottom:20px;right:20px;background:#1a5276;color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer;" onclick="window.print()">
  🖨️ Print / Save as PDF
</div>

</body>
</html>`;
}

// ============================================================
// MODAL & LOADING UI
// ============================================================
function showLoadingModal() {
  const modal = document.getElementById('pdf-loading-modal');
  if (modal) modal.style.display = 'flex';
}

function hideLoadingModal() {
  const modal = document.getElementById('pdf-loading-modal');
  if (modal) modal.style.display = 'none';
}

function showNotification(message, isError = false) {
  const n = document.createElement('div');
  n.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:${isError ? '#c0392b' : '#27ae60'};color:#fff;
    padding:12px 24px;border-radius:8px;font-family:Arial,sans-serif;
    font-size:13px;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,0.25);
  `;
  n.innerHTML = message;
  document.body.appendChild(n);
  setTimeout(() => { n.style.opacity = '0'; n.style.transition = 'opacity .3s'; setTimeout(() => n.remove(), 300); }, 3500);
}

// ============================================================
// CORE PDF BUILDER (INTERNAL)
// ============================================================
async function buildPDF(pdfData = {}) {
  try {
    showLoadingModal();

    const {
      resultData = {},
      dimensions = {},
      poolType = 'skimmer',
      constructionType = 'in-ground',
      mainPoolItems = [],
      mepItems = [],
      pipingItems = [],
      balanceTankItems = [],
      pumpRoomItems = [],
      civilQuantities = {},
      mepQuantities = {},
      pumpRoomQuantities = {},
      balanceTankQuantities = {},
      dynamicRates = {},
      selectedAdvancedEquipment = [],
      mainPoolRemarks = {},
      mepRemarks = {},
      pumpRoomRemarks = {},
      balanceTankRemarks = {},
      currency = 'INR',
      exchangeRate = 83.0,
      companyProfile = {},
      pumpRoomDistance = 15,
      hasBalancingTank = false,
      hasGutter = false,
      includePumpRoom = true,
      columnVisibility = {},
      mainPoolTotal = 0,
      mepTotal = 0,
      pumpRoomTotal = 0,
      balanceTankTotal = 0,
      pipingTotal = 0,
      shotcretingSplit = null,
      rccShutteringSplit = null,
    } = pdfData;

    const detectedPoolType =
      (resultData || {}).pool_type ||
      (resultData || {}).system_parameters?.pool_type ||
      (resultData || {}).calculation_type ||
      poolType ||
      'skimmer';
    const normalizedPoolType = String(detectedPoolType).toLowerCase().trim();
    const isJacuzzi = normalizedPoolType === 'jacuzzi';
    const isInfinity = normalizedPoolType === 'infinity';

    const safeResultData = resultData || {};
    const civilQty = Object.keys(civilQuantities || {}).length > 0 ? civilQuantities : safeResultData;
    const mepQty = Object.keys(mepQuantities || {}).length > 0 ? mepQuantities : safeResultData;
    const btQty = Object.keys(balanceTankQuantities || {}).length > 0 ? balanceTankQuantities : safeResultData;
    const prQty = Object.keys(pumpRoomQuantities || {}).length > 0 ? pumpRoomQuantities : safeResultData;
    const dynRates = Object.keys(dynamicRates || {}).length > 0 ? dynamicRates : {};

    let rawPiping = [];
    if (Array.isArray(pipingItems) && pipingItems.length > 0) {
      rawPiping = pipingItems;
    } else if (safeResultData?.piping && Array.isArray(safeResultData.piping)) {
      rawPiping = safeResultData.piping;
    } else if (safeResultData?.piping_items && Array.isArray(safeResultData.piping_items)) {
      rawPiping = safeResultData.piping_items;
    }
    const resolvedPipingItems = cleanPipingItems(rawPiping);
    const resolvedPipingTotal = pipingTotal > 0 ? pipingTotal : calcPipingTotal(resolvedPipingItems);

    const mainItemsFiltered = (mainPoolItems || []).filter(item => {
      const slNo = Number(item?.SlNo ?? item?.sl_no);
      return item && slNo >= 1 && slNo <= 14;
    });

    const btItemsForRows =
      (balanceTankItems || []).length > 0
        ? balanceTankItems
        : (mainPoolItems || []).filter(item => {
            const sl = Number(item?.SlNo ?? item?.sl_no);
            return sl >= 1 && sl <= 12;
          });

    const prItemsForRows =
      (pumpRoomItems || []).length > 0
        ? pumpRoomItems
        : (mainPoolItems || []).filter(item => {
            const sl = Number(item?.SlNo ?? item?.sl_no);
            return sl >= 1 && sl <= 12;
          });

    const computedMainPoolTotal = calcCivilTotal(
      mainItemsFiltered, civilQty, safeResultData, MAIN_POOL_QTY_FIELDS,
      shotcretingSplit, rccShutteringSplit
    );

    const computedBalanceTankTotal = hasBalancingTank
      ? calcBalanceTankTotal(btItemsForRows, btQty, safeResultData)
      : 0;

    const computedPumpRoomTotal = includePumpRoom
      ? calcPumpRoomTotal(prItemsForRows, prQty, safeResultData)
      : 0;

    const computedMepTotal = calcMepTotal(
      (mepItems || []), (mepQty || {}), safeResultData || {},
      dynRates || {}, selectedAdvancedEquipment || [], isJacuzzi
    );

    const finalResolvedPipingTotal = isInfinity ? 0 : resolvedPipingTotal;

    const computedGrandTotal = computedMainPoolTotal + computedBalanceTankTotal + computedPumpRoomTotal + computedMepTotal + finalResolvedPipingTotal;

    const htmlContent = await generatePDFContent({
      resultData: safeResultData,
      dimensions,
      poolType: normalizedPoolType,
      constructionType,
      mainPoolItems: mainItemsFiltered,
      civilQuantities: civilQty,
      mainPoolRemarks: mainPoolRemarks || {},
      mainPoolTotal: computedMainPoolTotal,
      balanceTankItems: btItemsForRows,
      balanceTankQuantities: btQty,
      balanceTankRemarks: balanceTankRemarks || {},
      balanceTankTotal: computedBalanceTankTotal,
      hasBalancingTank: hasBalancingTank || hasGutter,
      pumpRoomItems: prItemsForRows,
      pumpRoomQuantities: prQty,
      pumpRoomRemarks: pumpRoomRemarks || {},
      pumpRoomTotal: computedPumpRoomTotal,
      includePumpRoom,
      mepItems: (mepItems || []).filter(i => i && (Number(i.SlNo ?? i.sl_no) < 35)),
      mepQuantities: mepQty,
      mepRemarks: mepRemarks || {},
      dynamicRates: dynRates,
      selectedAdvancedEquipment: selectedAdvancedEquipment || [],
      mepTotal: computedMepTotal,
      isJacuzzi,
      pipingItems: resolvedPipingItems,
      pipingTotal: resolvedPipingTotal,
      pumpRoomDistance: pumpRoomDistance,
      grandTotal: computedGrandTotal,
      columnVisibility: columnVisibility || {},
      currency,
      exchangeRate,
      companyProfile: companyProfile || DEFAULT_COMPANY_PROFILE,
      shotcretingSplit: shotcretingSplit,
      rccShutteringSplit: rccShutteringSplit,
    });

    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      alert('Popup blocked! Please allow popups and try again.');
      hideLoadingModal();
      return false;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 1200);

    hideLoadingModal();
    showNotification('✅ PDF Report opened! Use Print → Save as PDF.');
    return true;

  } catch (error) {
    console.error('PDF generation error:', error);
    hideLoadingModal();
    showNotification(`❌ PDF generation failed: ${error.message}`, true);
    return false;
  }
}

// ============================================================
// MAIN EXPORT: generatePDF (UNIVERSAL - SAFE WRAPPER)
// ============================================================
export const generatePDF = async (pdfData = {}) => {
  try {
    if (!pdfData || typeof pdfData !== "object") {
      throw new Error("Invalid PDF data");
    }

    const safeData = {
      resultData: pdfData.resultData || {},
      dimensions: pdfData.dimensions || {},
      mainPoolItems: pdfData.mainPoolItems || pdfData.mainPoolData || [],
      mepItems: pdfData.mepItems || [],
      pipingItems: pdfData.pipingItems || [],
      balanceTankItems: pdfData.balanceTankItems || [],
      pumpRoomItems: pdfData.pumpRoomItems || [],
      civilQuantities: pdfData.civilQuantities || {},
      mepQuantities: pdfData.mepQuantities || {},
      pumpRoomQuantities: pdfData.pumpRoomQuantities || {},
      balanceTankQuantities: pdfData.balanceTankQuantities || {},
      companyProfile: pdfData.companyProfile || {},
      poolType: pdfData.poolType || "pool",
      currency: pdfData.currency || "INR",
      exchangeRate: pdfData.exchangeRate || 83,
      dynamicRates: pdfData.dynamicRates || {},
      selectedAdvancedEquipment: pdfData.selectedAdvancedEquipment || [],
      mainPoolRemarks: pdfData.mainPoolRemarks || {},
      mepRemarks: pdfData.mepRemarks || {},
      pumpRoomRemarks: pdfData.pumpRoomRemarks || {},
      balanceTankRemarks: pdfData.balanceTankRemarks || {},
      columnVisibility: pdfData.columnVisibility || {},
      mainPoolTotal: pdfData.mainPoolTotal || 0,
      mepTotal: pdfData.mepTotal || pdfData.totalMepWithFittings || 0,
      pumpRoomTotal: pdfData.pumpRoomTotal || 0,
      balanceTankTotal: pdfData.balanceTankTotal || pdfData.balancingTankTotal || 0,
      pipingTotal: pdfData.pipingTotal || 0,
      constructionType: pdfData.constructionType || 'in-ground',
      hasBalancingTank: pdfData.hasBalancingTank || false,
      hasGutter: pdfData.hasGutter || false,
      includePumpRoom: pdfData.includePumpRoom !== false,
      pumpRoomDistance: pdfData.pumpRoomDistance || 15,
      shotcretingSplit: pdfData.shotcretingSplit || null,
      rccShutteringSplit: pdfData.rccShutteringSplit || null,
    };

    return await buildPDF(safeData);

  } catch (err) {
    console.error("PDF GENERATION ERROR:", err);
    alert(`PDF generation failed: ${err.message}`);
    return false;
  }
};

// ============================================================
// REACT UI COMPONENTS
// ============================================================
export const PDFDownloadModal = () => (
  <div id="pdf-loading-modal" style={{ display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 99998, alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: '#fff', borderRadius: '12px', padding: '32px 40px', textAlign: 'center', maxWidth: '360px' }}>
      <div style={{ width: '48px', height: '48px', border: '4px solid #e0e0e0', borderTop: '4px solid #1a5276', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <h3 style={{ color: '#1a5276', marginBottom: '8px' }}>Generating PDF Report…</h3>
      <p style={{ color: '#666', fontSize: '13px' }}>Please wait while we prepare your report.</p>
    </div>
  </div>
);

export const PDFDownloadButton = ({
  resultData,
  mainPoolData = [],
  mepItems = [],
  dimensions = {},
  baseMepTotal = 0,
  mainPoolTotal = 0,
  balancingTankData = [],
  balancingTankTotal = 0,
  poolType = 'skimmer',
  hasBalancingTank = false,
  mainPoolRemarks = {},
  balanceTankRemarks = {},
  mepRemarks = {},
  templateDescriptions = {},
  amount35 = 0,
  amount36 = 0,
  amount37 = 0,
  amount38 = 0,
  totalMepWithFittings = 0,
  currentRates = {},
  equipmentDistance = 4.0,
  currency = 'INR',
  exchangeRate = 83.0,
  includePumpRoom = false,
  pumpRoomDimensions = {},
  pumpRoomQuantities = {},
  constructionType = 'in-ground',
  pumpRoomTotal = 0,
  pumpRoomRemarks = {},
  selectedAdvancedEquipment = [],
  turnoverTime = 4,
  gutterSelected = false,
  columnVisibility = { image: true, unit: true, qty: true, fixedRate: true, remarks: true, code: true },
  className = '',
  pipingItems = [],
  pipingTotal = 0,
  civilQuantities = {},
  mepQuantities = {},
  balanceTankQuantities = {},
  dynamicRates = {},
  balanceTankItems = [],
  hasGutter = false,
  pumpRoomDistance = 15,
  companyProfile = DEFAULT_COMPANY_PROFILE,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const safeCivilQuantities = civilQuantities || {};
      const shotcretingSplit =
        safeCivilQuantities?.shotcreting_split ||
        resultData?.civil_quantities?.shotcreting_split ||
        {};
      const rccShutteringSplit =
        safeCivilQuantities?.rcc_shuttering_split ||
        resultData?.civil_quantities?.rcc_shuttering_split ||
        {};

      await generatePDF({
        resultData,
        poolType,
        constructionType,
        dimensions,
        pumpRoomDimensions,
        mainPoolItems: mainPoolData,
        mepItems,
        pumpRoomItems: balancingTankData,
        balanceTankItems,
        pipingItems,
        civilQuantities,
        mepQuantities,
        pumpRoomQuantities,
        balanceTankQuantities,
        mainPoolTotal,
        mepTotal: totalMepWithFittings,
        pumpRoomTotal,
        balanceTankTotal: balancingTankTotal,
        pipingTotal,
        mainPoolRemarks,
        mepRemarks,
        pumpRoomRemarks,
        balanceTankRemarks,
        templateDescriptions,
        dynamicRates,
        currency,
        exchangeRate,
        selectedTables: {},
        columnVisibility,
        selectedAdvancedEquipment,
        includePumpRoom,
        pumpRoomDistance,
        companyProfile,
        excavationSplit: {},
        overflowGratingData: null,
        hasBalancingTank,
        hasGutter,
        waterBodySpecs: {},
        waterBodyMetrics: {},
        seatingCapacity: null,
        waterJets: null,
        airJets: null,
        heaterKW: null,
        shotcretingSplit: shotcretingSplit,
        rccShutteringSplit: rccShutteringSplit,
      });
    } catch (err) {
      console.error('PDF download error:', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '8px 16px', background: isGenerating ? '#95a5a6' : '#1a5276',
        color: '#fff', border: 'none', borderRadius: '6px',
        cursor: isGenerating ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600
      }}
    >
      <span>{isGenerating ? '⏳' : '📄'}</span>
      &nbsp;&nbsp;<span>{isGenerating ? 'Generating PDF…' : 'Export PDF'}</span>
      {(selectedAdvancedEquipment || []).length > 0 && (
        <span style={{ background: '#f39c12', fontSize: '10px', padding: '2px 7px', borderRadius: '10px' }}>
          {(selectedAdvancedEquipment || []).length} selected
        </span>
      )}
    </button>
  );
};

export default PDFDownloadButton;