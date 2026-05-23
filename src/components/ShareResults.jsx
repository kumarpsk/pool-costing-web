import React, { useState } from "react";
import "./ShareResults.css";

function ShareResults({
  resultData = {},
  mainPoolData = [],
  mepItems = [],
  balancingRows = [],
  balanceTankData = [],
  dimensions = {},
  totalMep = 0,
  mainPoolTotal = 0,
  balancingTankTotal = 0,
  balanceTankTotal = 0,
  pumpRoomTotal = 0,
  pipingTotal = 0,
  finalTotal = 0,
  apiBaseUrl,
  hasBalancingTank = false,
  poolType = "skimmer",
  constructionType = "skimmer",
  mainPoolRemarks = {},
  balancingTankRemarks = {},
  balanceTankRemarks = {},
  mepRemarks = {},
  pumpRoomRemarks = {},
  templateDescriptions = {},
  pumpRoomData = [],
  pipingItems = [],
  includePumpRoom = false,
  selectedTables = {},
  currency = "INR",
  exchangeRate = 83.0,
  onClose = null,
  civilQuantities = {},
  mepQuantities = {},
  pumpRoomQuantities = {},
  dynamicRates = {},
  selectedAdvancedEquipment = [],
  filteredMepItems = [],
  balanceTankQuantities = {},
}) {
  const [showShareOptions, setShowShareOptions] = useState(true);
  const [copySuccess, setCopySuccess] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [fromUserEmail, setFromUserEmail] = useState("");
  const [sendStatus, setSendStatus] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [shareFormat, setShareFormat] = useState("detailed");
  const [generatedImages, setGeneratedImages] = useState({});
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentPasteIndex, setCurrentPasteIndex] = useState(-1);
  const [whatsappOpened, setWhatsappOpened] = useState(false);

  const effectivePoolType = poolType || "skimmer";
  const INSTALLATION_PERCENT = 0.15;

  const [selectedShareSections, setSelectedShareSections] = useState({
    specifications: true,
    mainPool: true,
    balancingTank: false,
    mep: false,
    pumpRoom: false,
    piping: false,
    grandTotal: true
  });

  const toggleShareSection = (section) => {
    setSelectedShareSections(prev => ({ ...prev, [section]: !prev[section] }));
    setGeneratedImages({});
    setCurrentPasteIndex(-1);
    setWhatsappOpened(false);
  };

  const formatMoney = (value) => {
    const n = Number(value ?? 0);
    return n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  };

  const safeToFixed = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) return "0.00";
    return Number(value).toFixed(decimals);
  };

  const truncateText = (text, maxLen = 30) => {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 3) + '...';
  };

  const getPoolTypeName = () => {
    switch (effectivePoolType) {
      case 'overflow': return 'Overflow Pool';
      case 'infinity': return 'Infinity Pool';
      case 'curved': case 'freeform': return 'FreeForm Pool';
      case 'jacuzzi': case 'spa': case 'jacuzzispa': return 'Jacuzzi/Spa';
      case 'waterbody': return 'Water Body';
      case 'terrace': return 'Terrace Skimmer Pool';
      default: return 'Skimmer Pool';
    }
  };

  const needsBalancingTank = () => {
    return effectivePoolType === 'overflow' || effectivePoolType === 'infinity' || hasBalancingTank === true;
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isMobileDevice = () => /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);

  const getSupplyRate = (item) => {
    if (item.SlNo === 1) return dynamicRates?.filter_rate ?? item.Rate ?? 0;
    if (item.SlNo === 7) return dynamicRates?.pump_rate ?? item.Rate ?? 0;
    return item.Rate ?? 0;
  };
  const getInstallationRate = (item) => getSupplyRate(item) * INSTALLATION_PERCENT;

  // =============================================
  // QUANTITY HELPERS
  // =============================================
  const MAIN_POOL_QTY_FIELDS = {
    1: "EarthExcavation_QTY", 2: "BackFilling_QTY", 3: "Consolidation_QTY",
    4: "Disposal_QTY", 5: "Soling_QTY", 6: "plaincement_QTY",
    7: "BurntBrick_QTY", 8: "steelreinforcement_QTY", 9: "Shuttering_QTY",
    10: "shotcreting_QTY", 11: "WaterProofing_QTY", 12: "plastering_QTY",
    13: "Coping_QTY", 14: "Tiling_QTY"
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

  const MEP_QTY_FIELDS = {
    1: "Filter_QTY", 2: "Glass_QTY", 3: "Pressure_QTY", 4: "Filter_Drain_QTY",
    5: "Mpv_QTY", 6: "Mpv_connset_QTY", 7: "Cpump_QTY", 8: "Return_Inlets_QTY",
    9: "MainDrain_QTY", 10: "Vaccume_Inlets_QTY", 11: "Skimmer_QTY",
    12: "FloatValve_QTY", 13: "GutterDrain_QTY", 14: "Underwaterlight_QTY",
    15: "Transformer_QTY", 16: "ControlPanel_QTY", 17: "Cables_QTY",
    18: "Earthing_QTY", 19: "ChlorinePump_QTY", 20: "DosingTank_QTY",
    21: "Stirrer_QTY", 22: "FloatingHose_QTY", 23: "Brush_QTY",
    24: "Algae_QTY", 25: "Net_QTY", 26: "Handle_QTY", 27: "VacuumHead_QTY",
    28: "TestKit_QTY", 29: "CurvedBrush_QTY", 30: "HeatPump_QTY",
    31: "PoolHeater_QTY", 32: "Chiller_QTY", 33: "Ozonator_QTY", 34: "SaltChlorinator_QTY"
  };

  const getQuantity = (slNo, qtyFields, quantities, result) => {
    const key = qtyFields[slNo];
    if (!key) return 0;
    if (quantities?.[key] !== undefined && quantities[key] !== null) return Number(quantities[key]);
    if (result?.[key] !== undefined && result[key] !== null) return Number(result[key]);
    return 0;
  };

  const getCivilQuantity = (slNo) => getQuantity(slNo, MAIN_POOL_QTY_FIELDS, civilQuantities, resultData);
  const getBalanceTankQty = (slNo) => getQuantity(slNo, BALANCE_TANK_QTY_FIELDS, balanceTankQuantities, resultData);
  const getPumpRoomQty = (slNo) => getQuantity(slNo, PUMP_ROOM_QTY_FIELDS, pumpRoomQuantities, resultData);

  const getMepQuantity = (slNo) => {
    const key = MEP_QTY_FIELDS[slNo];
    if (!key) return 0;
    if (slNo === 13) return 0;
    if (slNo >= 30 && slNo <= 34) return selectedAdvancedEquipment?.includes(slNo) ? 1 : 0;
    if (mepQuantities?.[key] !== undefined && mepQuantities[key] !== null) return Number(mepQuantities[key]);
    if (resultData?.[key] !== undefined && resultData[key] !== null) return Number(resultData[key]);
    return 0;
  };

  const calculateTotals = () => {
    const mp = Number(mainPoolTotal || 0);
    const bt = Number(balanceTankTotal || balancingTankTotal || 0);
    const mep = Number(totalMep || 0);
    const pr = Number(pumpRoomTotal || 0);
    const pip = Number(pipingTotal || 0);
    const subtotal = mp + bt + mep + pr + pip;
    const gst = subtotal * 0.18;
    return { mainPoolCost: mp, balancingCost: bt, mepCost: mep, pumpRoomCost: pr, pipingCost: pip, subtotal, gstAmount: gst, totalCost: subtotal + gst };
  };

  const hasSelectedDetailedSections = () => {
    return selectedShareSections.mainPool || selectedShareSections.balancingTank || 
           selectedShareSections.mep || selectedShareSections.piping || selectedShareSections.pumpRoom;
  };

  const getSelectedSectionKeys = () => {
    const keys = [];
    if (selectedShareSections.mainPool) keys.push('mainPool');
    if (selectedShareSections.balancingTank && needsBalancingTank()) keys.push('balancingTank');
    if (selectedShareSections.mep) keys.push('mep');
    if (selectedShareSections.piping) keys.push('piping');
    if (selectedShareSections.pumpRoom && includePumpRoom) keys.push('pumpRoom');
    return keys;
  };

  // =============================================
  // CANVAS IMAGE GENERATION
  // =============================================
  const drawTableHeaderRow = (ctx, headers, colWidths, x, y, w, h) => {
    let cx = x;
    ctx.fillStyle = '#1a73e8'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'left';
    headers.forEach((hdr, i) => { ctx.fillText(hdr, cx + 5, y + h / 2 + 5); cx += colWidths[i]; });
  };

  const drawDataRow = (ctx, values, colWidths, x, y, w, h, bg, font = '11px') => {
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#333'; ctx.font = `${font} "Segoe UI", Arial, sans-serif`; ctx.textAlign = 'left';
    let cx = x;
    values.forEach((val, i) => {
      if (i === values.length - 1) { ctx.textAlign = 'right'; ctx.fillText(String(val), x + w - 8, y + h / 2 + 4); }
      else if (i >= 2) { ctx.textAlign = i === 3 ? 'center' : 'right'; ctx.fillText(String(val), cx + colWidths[i] - 8, y + h / 2 + 4); }
      else { ctx.fillText(String(val), cx + 5, y + h / 2 + 4); }
      cx += colWidths[i] || 0;
    });
    ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 0.5; ctx.strokeRect(x, y, w, h);
  };

  const drawTotalRow = (ctx, label, value, x, y, w, h) => {
    ctx.fillStyle = '#1a73e8'; ctx.fillRect(x, y, w, h + 10);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(label, x + 10, y + h / 2 + 6);
    ctx.textAlign = 'right'; ctx.fillText(value, x + w - 10, y + h / 2 + 6); ctx.textAlign = 'left';
  };

  const drawGenericTable = (ctx, canvas, canvasWidth, padding, title, subtitle, headers, items, getQtyFn, total, filterFn) => {
    const colWidths = headers.length === 6 ? [50, 260, 80, 60, 100, 110] : [50, 100, 200, 60, 80, 100, 120];
    const rowHeight = 26, headerHeight = 32, width = canvasWidth - padding * 2;
    const filteredItems = filterFn ? items.filter(filterFn) : items;
    const totalRows = filteredItems.length;
    canvas.width = canvasWidth; canvas.height = 130 + (totalRows * rowHeight) + 60;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    let y = 20;
    ctx.fillStyle = '#1a73e8'; ctx.font = 'bold 17px "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(title, padding + 10, y + 22);
    ctx.font = '12px "Segoe UI", Arial, sans-serif'; ctx.fillStyle = '#666';
    ctx.fillText(subtitle, padding + 10, y + 44);
    y += 70;
    drawTableHeaderRow(ctx, headers, colWidths, padding, y, width, headerHeight);
    y += headerHeight;
    filteredItems.forEach((item, index) => {
      const bg = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      const qty = getQtyFn(item.SlNo);
      const rate = item.Rate || 0;
      drawDataRow(ctx, [String(item.SlNo), truncateText(item.Description || '', 36), safeToFixed(qty, 3), item.Unit || '', formatMoney(rate), formatMoney(qty * rate)], colWidths, padding, y, width, rowHeight, bg);
      y += rowHeight;
    });
    drawTotalRow(ctx, `TOTAL ${title.split(' ').pop()}`, `₹${formatMoney(total)}`, padding, y, width, rowHeight);
    return canvas.toDataURL('image/png');
  };

  const generateSingleTableImage = (tableType) => {
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d'), padding = 20, canvasWidth = 800;
    switch (tableType) {
      case 'mainPool':
        return drawGenericTable(ctx, canvas, canvasWidth, padding, '🏗 Main Pool Civil Works', `${mainPoolData?.filter(i => i.SlNo >= 1 && i.SlNo <= 14).length || 0} items | Total: ₹${formatMoney(mainPoolTotal)}`, ['Sl.No', 'Description', 'QTY', 'Unit', 'Rate (₹)', 'Amount (₹)'], mainPoolData, getCivilQuantity, mainPoolTotal, i => i.SlNo >= 1 && i.SlNo <= 14);
      case 'balancingTank':
        const btData = balancingRows?.length > 0 ? balancingRows : balanceTankData;
        return drawGenericTable(ctx, canvas, canvasWidth, padding, '⚖️ Balance Tank', `${btData?.filter(i => i.SlNo >= 1 && i.SlNo <= 12).length || 0} items | Total: ₹${formatMoney(balanceTankTotal || balancingTankTotal)}`, ['Sl.No', 'Description', 'QTY', 'Unit', 'Rate (₹)', 'Amount (₹)'], btData, getBalanceTankQty, balanceTankTotal || balancingTankTotal, i => i.SlNo >= 1 && i.SlNo <= 12);
      case 'mep':
        const mepData = filteredMepItems?.length > 0 ? filteredMepItems : mepItems;
        const mepFiltered = mepData?.filter(i => i.SlNo <= 29 && i.SlNo !== 13) || [];
        const mepCanvas = document.createElement('canvas'); const mepCtx = mepCanvas.getContext('2d');
        mepCanvas.width = canvasWidth; mepCanvas.height = 130 + (mepFiltered.length * 26) + 60;
        mepCtx.fillStyle = '#ffffff'; mepCtx.fillRect(0, 0, mepCanvas.width, mepCanvas.height);
        let my = 20;
        mepCtx.fillStyle = '#1a73e8'; mepCtx.font = 'bold 17px "Segoe UI", Arial, sans-serif'; mepCtx.textAlign = 'left';
        mepCtx.fillText('⚙️ MEP Systems', padding + 10, my + 22);
        mepCtx.font = '12px'; mepCtx.fillStyle = '#666'; mepCtx.fillText(`${mepFiltered.length} items`, padding + 10, my + 44);
        my += 70;
        const mepColWidths = [50, 260, 70, 110, 110, 110];
        drawTableHeaderRow(mepCtx, ['Sl.No', 'Description', 'QTY', 'Supply (₹)', 'Install (₹)', 'Total (₹)'], mepColWidths, padding, my, canvasWidth - padding * 2, 32);
        my += 32;
        let ts = 0, ti = 0;
        mepFiltered.forEach((item, index) => {
          const qty = getMepQuantity(item.SlNo), sCost = qty * getSupplyRate(item), iCost = qty * getInstallationRate(item);
          ts += sCost; ti += iCost;
          const bg = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
          drawDataRow(mepCtx, [String(item.SlNo), truncateText(item.Description || '', 36), safeToFixed(qty, 2), formatMoney(sCost), formatMoney(iCost), formatMoney(sCost + iCost)], mepColWidths, padding, my, canvasWidth - padding * 2, 26, bg);
          my += 26;
        });
        drawTotalRow(mepCtx, 'TOTAL MEP', `₹${formatMoney(ts)} | ₹${formatMoney(ti)} | ₹${formatMoney(ts + ti)}`, padding, my, canvasWidth - padding * 2, 26);
        return mepCanvas.toDataURL('image/png');
      case 'piping':
        if (!pipingItems?.length) return null;
        return drawGenericTable(ctx, canvas, canvasWidth, padding, '🔩 Piping System', `${pipingItems.length} items`, ['Sl.No', 'Type', 'Description', 'Dia(mm)', 'Qty', 'Rate (₹)', 'Total (₹)'], pipingItems, () => 0, pipingTotal, null);
      case 'pumpRoom':
        if (!includePumpRoom || !pumpRoomData?.length) return null;
        return drawGenericTable(ctx, canvas, canvasWidth, padding, '🏢 Pump Room', `${pumpRoomData.filter(i => [1,2,3,4,5,6,7,8,9,10,11,12].includes(i.SlNo)).length} items | Total: ₹${formatMoney(pumpRoomTotal)}`, ['Sl.No', 'Description', 'QTY', 'Unit', 'Rate (₹)', 'Amount (₹)'], pumpRoomData, getPumpRoomQty, pumpRoomTotal, i => [1,2,3,4,5,6,7,8,9,10,11,12].includes(i.SlNo));
      default: return null;
    }
  };

  const generateAllImages = async () => {
    setIsGeneratingImage(true);
    const images = {};
    for (const key of getSelectedSectionKeys()) {
      const url = generateSingleTableImage(key);
      if (url) {
        images[key] = {
          url,
          name: key === 'mainPool' ? 'Main_Pool' : key === 'balancingTank' ? 'Balance_Tank' : key === 'mep' ? 'MEP_Systems' : key === 'piping' ? 'Piping_System' : 'Pump_Room',
          label: key === 'mainPool' ? '🏗 Main Pool' : key === 'balancingTank' ? '⚖️ Balance Tank' : key === 'mep' ? '⚙️ MEP' : key === 'piping' ? '🔩 Piping' : '🏢 Pump Room'
        };
      }
    }
    setGeneratedImages(images);
    setIsGeneratingImage(false);
    return images;
  };

  // =============================================
  // TEXT GENERATORS
  // =============================================
  const generateTextTable = (title, headers, rows, totalLabel, totalValue) => {
    const colW = headers.map((h, i) => {
      const maxDataLen = Math.max(...rows.map(r => String(r[i] || '').length));
      return Math.max(h.length, maxDataLen, 5) + 2;
    });
    const topBorder = '┌' + colW.map(w => '─'.repeat(w)).join('┬') + '┐';
    const headerSep = '├' + colW.map(w => '─'.repeat(w)).join('┼') + '┤';
    const bottomBorder = '└' + colW.map(w => '─'.repeat(w)).join('┴') + '┘';
    const lines = [title, topBorder];
    lines.push('│ ' + headers.map((h, i) => h.padEnd(colW[i])).join(' │ ') + ' │');
    lines.push(headerSep);
    rows.forEach((row) => {
      lines.push('│ ' + row.map((cell, i) => String(cell || '').padEnd(colW[i])).join(' │ ') + ' │');
    });
    const totalWidth = colW.slice(0, -1).reduce((sum, w) => sum + w + 3, 0) - 1;
    const totalSep = '├' + '─'.repeat(totalWidth) + '┴' + '─'.repeat(colW[colW.length - 1]) + '┤';
    lines.push(totalSep);
    lines.push('│ ' + totalLabel.padEnd(totalWidth) + ' │ ' + String(totalValue).padEnd(colW[colW.length - 1]) + ' │');
    lines.push(bottomBorder);
    return lines.join('\n');
  };

  const getFullDetailedText = () => {
    const lines = [];
    lines.push('═'.repeat(55));
    lines.push(`  🏊 ${getPoolTypeName()} - Quotation Report`);
    lines.push('═'.repeat(55));
    lines.push('');

    if (selectedShareSections.specifications) {
      const vol = resultData?.volume_m3 != null ? Number(resultData.volume_m3).toFixed(2) : (dimensions.length * dimensions.width * dimensions.depth).toFixed(2);
      lines.push('📐 SPECIFICATIONS');
      lines.push(`  Type    : ${getPoolTypeName()}`);
      lines.push(`  Size    : ${dimensions.length || 'N/A'}m × ${dimensions.width || 'N/A'}m × ${dimensions.depth || 'N/A'}m`);
      lines.push(`  Volume  : ${vol} m³`);
      lines.push('');
    }

    if (selectedShareSections.mainPool && mainPoolData?.length) {
      const rows = mainPoolData.filter(i => i.SlNo >= 1 && i.SlNo <= 14).map(item => {
        const qty = getCivilQuantity(item.SlNo), rate = item.Rate || 0;
        return [String(item.SlNo), truncateText(item.Description || '', 28), safeToFixed(qty, 3), item.Unit || '', formatMoney(rate), formatMoney(qty * rate)];
      });
      lines.push(generateTextTable('🏗 MAIN POOL', ['Sl.No', 'Description', 'QTY', 'Unit', 'Rate (₹)', 'Amount (₹)'], rows, 'TOTAL', formatMoney(mainPoolTotal)));
      lines.push('');
    }

    if (selectedShareSections.balancingTank && needsBalancingTank()) {
      const btData = balancingRows?.length > 0 ? balancingRows : balanceTankData;
      if (btData?.length) {
        const rows = btData.filter(i => i.SlNo >= 1 && i.SlNo <= 12).map(item => {
          const qty = getBalanceTankQty(item.SlNo), rate = item.Rate || 0;
          return [String(item.SlNo), truncateText(item.Description || '', 28), safeToFixed(qty, 3), item.Unit || '', formatMoney(rate), formatMoney(qty * rate)];
        });
        lines.push(generateTextTable('⚖️ BALANCE TANK', ['Sl.No', 'Description', 'QTY', 'Unit', 'Rate (₹)', 'Amount (₹)'], rows, 'TOTAL', formatMoney(balanceTankTotal || balancingTankTotal)));
        lines.push('');
      }
    }

    if (selectedShareSections.mep) {
      const data = filteredMepItems?.length > 0 ? filteredMepItems : mepItems;
      const items = data?.filter(i => i.SlNo <= 29 && i.SlNo !== 13) || [];
      if (items.length) {
        const rows = items.map(item => {
          const qty = getMepQuantity(item.SlNo), sCost = qty * getSupplyRate(item), iCost = qty * getInstallationRate(item);
          return [String(item.SlNo), truncateText(item.Description || '', 24), safeToFixed(qty, 2), formatMoney(sCost), formatMoney(iCost), formatMoney(sCost + iCost)];
        });
        const ts = rows.reduce((a, r) => a + Number(String(r[3]).replace(/,/g, '')), 0);
        const ti = rows.reduce((a, r) => a + Number(String(r[4]).replace(/,/g, '')), 0);
        lines.push(generateTextTable('⚙️ MEP', ['Sl.No', 'Description', 'QTY', 'Supply (₹)', 'Install (₹)', 'Total (₹)'], rows, 'TOTAL', `${formatMoney(ts)} | ${formatMoney(ti)} | ${formatMoney(ts + ti)}`));
        lines.push('');
      }
    }

    if (selectedShareSections.piping && pipingItems?.length) {
      const rows = pipingItems.map(item => [String(item.sl_no || ''), item.type || '', truncateText(item.description || '', 20), String(item.dia || '-'), safeToFixed(item.quantity, 2), formatMoney(item.supply_rate), formatMoney(item.total)]);
      lines.push(generateTextTable('🔩 PIPING', ['Sl.No', 'Type', 'Description', 'Dia', 'Qty', 'Rate (₹)', 'Total (₹)'], rows, 'TOTAL', formatMoney(rows.reduce((a, r) => a + Number(String(r[6]).replace(/,/g, '')), 0))));
      lines.push('');
    }

    if (selectedShareSections.pumpRoom && includePumpRoom && pumpRoomData?.length) {
      const items = pumpRoomData.filter(i => [1,2,3,4,5,6,7,8,9,10,11,12].includes(i.SlNo));
      const rows = items.map(item => { const qty = getPumpRoomQty(item.SlNo), rate = item.Rate || 0; return [String(item.SlNo), truncateText(item.Description || '', 28), safeToFixed(qty, 3), item.Unit || '', formatMoney(rate), formatMoney(qty * rate)]; });
      lines.push(generateTextTable('🏢 PUMP ROOM', ['Sl.No', 'Description', 'QTY', 'Unit', 'Rate (₹)', 'Amount (₹)'], rows, 'TOTAL', formatMoney(pumpRoomTotal)));
      lines.push('');
    }

    if (selectedShareSections.grandTotal) {
      const t = calculateTotals();
      lines.push('💰 COST SUMMARY');
      lines.push('─'.repeat(35));
      if (selectedShareSections.mainPool) lines.push(`  Main Pool      : ₹${formatMoney(t.mainPoolCost)}`);
      if (selectedShareSections.balancingTank && needsBalancingTank()) lines.push(`  Balance Tank   : ₹${formatMoney(t.balancingCost)}`);
      if (selectedShareSections.mep) lines.push(`  MEP Systems    : ₹${formatMoney(t.mepCost)}`);
      if (selectedShareSections.piping) lines.push(`  Piping Works   : ₹${formatMoney(t.pipingCost)}`);
      if (selectedShareSections.pumpRoom && includePumpRoom) lines.push(`  Pump Room      : ₹${formatMoney(t.pumpRoomCost)}`);
      lines.push('─'.repeat(35));
      lines.push(`  Subtotal       : ₹${formatMoney(t.subtotal)}`);
      lines.push(`  GST (18%)      : ₹${formatMoney(t.gstAmount)}`);
      lines.push(`  GRAND TOTAL    : ₹${formatMoney(t.totalCost)}`);
      lines.push('─'.repeat(35));
    }

    return lines.join('\n');
  };

  const getSummaryText = () => {
    const t = calculateTotals();
    const lines = [`🏊 ${getPoolTypeName()} - Summary`, ''];
    if (selectedShareSections.specifications) lines.push(`📐 ${dimensions.length || 'N/A'}m × ${dimensions.width || 'N/A'}m × ${dimensions.depth || 'N/A'}m`);
    lines.push('💰 Cost:');
    if (selectedShareSections.mainPool) lines.push(`  Main Pool: ₹${formatMoney(t.mainPoolCost)}`);
    if (selectedShareSections.balancingTank && needsBalancingTank()) lines.push(`  Balance Tank: ₹${formatMoney(t.balancingCost)}`);
    if (selectedShareSections.mep) lines.push(`  MEP: ₹${formatMoney(t.mepCost)}`);
    if (selectedShareSections.piping) lines.push(`  Piping: ₹${formatMoney(t.pipingCost)}`);
    if (selectedShareSections.pumpRoom && includePumpRoom) lines.push(`  Pump Room: ₹${formatMoney(t.pumpRoomCost)}`);
    if (selectedShareSections.grandTotal) lines.push(`  TOTAL: ₹${formatMoney(t.totalCost)}`);
    return lines.join('\n');
  };

  // =============================================
  // SHARE HANDLERS
  // =============================================
  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
      const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;left:-9999px;top:-9999px";
      document.body.appendChild(ta); ta.select(); const success = document.execCommand("copy"); document.body.removeChild(ta); return success;
    } catch { return false; }
  };

  const copyImageToClipboard = async (imageUrl) => {
    try { const resp = await fetch(imageUrl); const blob = await resp.blob(); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); return true; }
    catch { return false; }
  };

  const handleCopyText = async () => {
    if (shareFormat === "detailed" && !hasSelectedDetailedSections()) { setCopySuccess("⚠️ Please select at least one table"); setTimeout(() => setCopySuccess(""), 3000); return; }
    const text = shareFormat === "detailed" ? getFullDetailedText() : getSummaryText();
    const ok = await copyToClipboard(text);
    setCopySuccess(ok ? "✅ Text copied!" : "❌ Failed");
    setTimeout(() => setCopySuccess(""), 3000);
  };

  const handleDownloadImages = async () => {
    if (!hasSelectedDetailedSections()) { setCopySuccess("⚠️ Select at least one table"); setTimeout(() => setCopySuccess(""), 3000); return; }
    setIsGeneratingImage(true); const images = await generateAllImages(); setIsGeneratingImage(false);
    const keys = Object.keys(images);
    if (!keys.length) { setCopySuccess("❌ No images"); setTimeout(() => setCopySuccess(""), 3000); return; }
    keys.forEach((k, i) => setTimeout(() => { const a = document.createElement('a'); a.href = images[k].url; a.download = `${images[k].name}.png`; a.click(); }, i * 300));
    setCopySuccess(`💾 ${keys.length} image(s) downloaded!`);
    setTimeout(() => setCopySuccess(""), 4000);
  };

  const openWhatsAppWithPicker = () => {
    if (isMobileDevice()) { window.location.href = 'whatsapp://send'; setTimeout(() => { if (!document.hidden) window.open('https://wa.me/', '_blank'); }, 1500); }
    else { window.location.href = 'whatsapp://send'; setTimeout(() => { if (!document.hidden) window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer'); }, 2000); }
  };

  const handleWhatsAppShare = () => {
    const text = shareFormat === "detailed" ? getFullDetailedText() : getSummaryText();
    const encoded = encodeURIComponent(text);
    try { window.location.href = `whatsapp://send?text=${encoded}`; setTimeout(() => { if (!document.hidden) { const a = document.createElement('a'); a.href = `https://api.whatsapp.com/send?text=${encoded}`; a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a); } }, 2000); setCopySuccess("📱 Opening WhatsApp..."); }
    catch { window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank'); }
    setTimeout(() => setCopySuccess(""), 3000);
  };

  const handleWhatsAppShareImage = async () => {
    if (!hasSelectedDetailedSections()) { setCopySuccess("⚠️ Select at least one table"); setTimeout(() => setCopySuccess(""), 3000); return; }
    setIsGeneratingImage(true); const images = await generateAllImages(); setIsGeneratingImage(false);
    const keys = Object.keys(images);
    if (!keys.length) { setCopySuccess("❌ No images"); setTimeout(() => setCopySuccess(""), 3000); return; }
    const imageList = keys.map(key => ({ key, url: images[key].url, name: images[key].name, label: images[key].label }));
    openWhatsAppWithPicker(); setWhatsappOpened(true);
    let successCount = 0; const firstCopied = await copyImageToClipboard(imageList[0].url); if (firstCopied) successCount++;
    if (imageList.length === 1) { setCopySuccess(firstCopied ? "📸 Image copied! Paste in WhatsApp (Ctrl+V)" : "❌ Failed"); setTimeout(() => setCopySuccess(""), 5000); return; }
    setCurrentPasteIndex(0);
    setCopySuccess(firstCopied ? `📸 Image 1/${imageList.length} copied! Paste & click "Copy Next"` : `⚠️ Failed. Click "Copy Next"`);
    window.__whatsappImages = imageList; window.__whatsappIndex = 1; window.__whatsappSuccess = successCount;
  };

  const handleCopyNextImage = async () => {
    const imageList = window.__whatsappImages; const currentIndex = window.__whatsappIndex;
    if (!imageList || currentIndex >= imageList.length) { setCopySuccess("✅ All done!"); setCurrentPasteIndex(-1); setTimeout(() => setCopySuccess(""), 3000); return; }
    const copied = await copyImageToClipboard(imageList[currentIndex].url); if (copied) window.__whatsappSuccess++;
    window.__whatsappIndex = currentIndex + 1; setCurrentPasteIndex(currentIndex);
    setCopySuccess(currentIndex + 1 < imageList.length ? `📸 Image ${currentIndex + 1}/${imageList.length} copied!` : `✅ Last image! All ${imageList.length} done!`);
    setTimeout(() => setCopySuccess(""), 4000);
  };

  // =============================================
  // 🆕 EMAIL SHARE — OPENS GMAIL COMPOSE (NO BACKEND)
  // =============================================
  const handleEmailShare = async () => {

    if (!recipientEmail) {
      setSendStatus("⚠️ Enter recipient email");
      setTimeout(() => setSendStatus(""), 3000);
      return;
    }

    if (!validateEmail(recipientEmail)) {
      setSendStatus("⚠️ Invalid email address");
      setTimeout(() => setSendStatus(""), 3000);
      return;
    }

    try {
      setIsSending(true);

      const subject = `${getPoolTypeName()} Quotation`;

      const body = shareFormat === "detailed"
        ? getFullDetailedText()
        : getSummaryText();

      // OPEN GMAIL COMPOSE
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      window.open(gmailUrl, "_blank");

      setSendStatus("✅ Gmail compose opened");
      setRecipientEmail("");

      setTimeout(() => {
        setSendStatus("");
      }, 4000);

    } catch (error) {
      console.error("Email share error:", error);
      setSendStatus("❌ Failed to open Gmail");
      setTimeout(() => {
        setSendStatus("");
      }, 4000);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => { setShowShareOptions(false); setCurrentPasteIndex(-1); setWhatsappOpened(false); setCopySuccess(""); setSendStatus(""); if (window.__whatsappImages) delete window.__whatsappImages; if (window.__whatsappIndex) delete window.__whatsappIndex; if (window.__whatsappSuccess) delete window.__whatsappSuccess; if (onClose) onClose(); };
  if (!showShareOptions) return null;

  const mainPoolCount = mainPoolData?.filter(i => i.SlNo >= 1 && i.SlNo <= 14).length || 0;
  const balanceTankCount = (balancingRows?.length > 0 ? balancingRows : balanceTankData)?.filter(i => i.SlNo >= 1 && i.SlNo <= 12).length || 0;
  const mepCount = (filteredMepItems?.length > 0 ? filteredMepItems : mepItems)?.filter(i => i.SlNo !== 13 && i.SlNo < 35).length || 0;
  const pipingCount = pipingItems?.length || 0;
  const pumpRoomCount = pumpRoomData?.filter(i => [1,2,3,4,5,6,7,8,9,10,11,12].includes(i.SlNo)).length || 0;
  const selectedCount = getSelectedSectionKeys().length;
  const imageKeys = Object.keys(generatedImages);
  const isSequentialPasting = currentPasteIndex >= 0;
  const showBalancing = needsBalancingTank();

  const sections = [
    { key: 'specifications', icon: '📐', label: 'Specifications', count: null },
    { key: 'mainPool', icon: '🏗', label: 'Main Pool', count: mainPoolCount },
    ...(showBalancing ? [{ key: 'balancingTank', icon: '⚖️', label: 'Balance Tank', count: balanceTankCount }] : []),
    { key: 'mep', icon: '⚙️', label: 'MEP', count: mepCount },
    { key: 'piping', icon: '🔩', label: 'Piping', count: pipingCount },
    ...(includePumpRoom ? [{ key: 'pumpRoom', icon: '🏢', label: 'Pump Room', count: pumpRoomCount }] : []),
    { key: 'grandTotal', icon: '💰', label: 'Grand Total', count: null },
  ];

  return (
    <div className="share-results-container">
      <div className="share-options-modal" role="dialog" aria-modal="true">
        <div className="share-options-content">
          <h3>Share {getPoolTypeName()} Results</h3>

          <div className="share-step">
            <div className="step-label">Step 1: Choose Format</div>
            <div className="share-format-toggle">
              <button className={`format-toggle-button ${shareFormat === "summary" ? "active" : ""}`} onClick={() => { setShareFormat("summary"); setGeneratedImages({}); setCurrentPasteIndex(-1); }}>
                <span className="format-icon">📋</span><span className="format-label">Summary</span>
              </button>
              <button className={`format-toggle-button ${shareFormat === "detailed" ? "active" : ""}`} onClick={() => { setShareFormat("detailed"); setGeneratedImages({}); setCurrentPasteIndex(-1); }}>
                <span className="format-icon">📊</span><span className="format-label">Detailed Tables</span>
              </button>
            </div>
          </div>

          <div className="share-step">
            <div className="step-label">Step 2: Select Tables {selectedCount > 0 && `(${selectedCount} selected)`}</div>
            <div className="share-section-selector">
              <div className="share-checkbox-grid">
                {sections.map(({ key, icon, label, count }) => (
                  <label key={key} className={`share-checkbox-card ${selectedShareSections[key] ? "active" : ""}`}>
                    <input type="checkbox" checked={selectedShareSections[key]} onChange={() => toggleShareSection(key)} />
                    <div className="share-card-content">
                      <span className="share-card-icon">{icon}</span>
                      <span className="share-card-text">{label}{shareFormat === "detailed" && count != null && <span className="item-count-badge">{count}</span>}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="share-step">
            <div className="step-label">Step 3: Share Via</div>
            {shareFormat === "summary" && (
              <div className="share-option"><button className="share-option-button" onClick={handleCopyText}><span className="option-icon">📋</span> Copy as Text</button></div>
            )}
            {shareFormat === "detailed" && (
              <div className="share-option"><button className="share-option-button" onClick={handleDownloadImages} disabled={isGeneratingImage || !hasSelectedDetailedSections()}><span className="option-icon">💾</span> {isGeneratingImage ? "⏳ Generating..." : `Download ${selectedCount || ''} Image(s)`}</button></div>
            )}
            <div className="share-option-group">
              <div className="share-option-group-title">💬 WhatsApp</div>
              {shareFormat === "summary" && (
                <div className="share-option-row"><button className="share-option-button whatsapp-btn" onClick={handleWhatsAppShare}><span className="option-icon">📝</span> Share as Text<span className="btn-hint">Opens WhatsApp → select contact</span></button></div>
              )}
              {shareFormat === "detailed" && (
                <div className="share-option-row"><button className="share-option-button whatsapp-btn" onClick={handleWhatsAppShareImage} disabled={isGeneratingImage || !hasSelectedDetailedSections()}><span className="option-icon">🖼️</span> {isGeneratingImage ? "⏳ Generating..." : `Share ${selectedCount || ''} Image(s)`}<span className="btn-hint">Copies images → paste in WhatsApp</span></button></div>
              )}
              {isSequentialPasting && (
                <div className="share-option-row" style={{ marginTop: '8px' }}><button className="share-option-button copy-next-btn" onClick={handleCopyNextImage}><span className="option-icon">📋</span> Copy Next Image<span className="btn-hint">Click after pasting previous</span></button></div>
              )}
            </div>
            <div className="share-option-group email-group">
              <div className="share-option-group-title">✉️ Email (Gmail)</div>
              <div className="email-share">
                <div className="email-input-group"><label>Recipient *</label><input type="email" placeholder="recipient@example.com" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} className="email-input" disabled={isSending} /></div>
                <div className="email-input-group"><label>Your Email (optional)</label><input type="email" placeholder="your@email.com" value={fromUserEmail} onChange={e => setFromUserEmail(e.target.value)} className="email-input" disabled={isSending} /></div>
                <button className="share-option-button send-email-btn" onClick={handleEmailShare} disabled={isSending || !recipientEmail}><span className="option-icon">✉️</span> {isSending ? "Opening Gmail..." : "Open Gmail Compose"}</button>
              </div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '8px', textAlign: 'center' }}>
                Opens Gmail with subject & quotation pre-filled. Click Send in Gmail.
              </div>
            </div>
          </div>

          {copySuccess && <span className={`status-message ${copySuccess.includes('❌') || copySuccess.includes('⚠️') ? 'error' : 'success'}`}>{copySuccess}</span>}
          {sendStatus && <span className={`status-message ${sendStatus.includes('❌') || sendStatus.includes('⚠️') ? 'error' : 'success'}`}>{sendStatus}</span>}

          {imageKeys.length > 0 && (
            <div className="image-preview-container">
              <h4 style={{ margin: '0 0 16px', fontSize: '14px', textAlign: 'center' }}>📊 {imageKeys.length} Table Image(s)</h4>
              {imageKeys.map(key => (
                <div key={key} style={{ marginBottom: '16px', background: '#f8f9fa', padding: '10px', borderRadius: '8px' }}>
                  <p style={{ fontWeight: 'bold', color: '#1a73e8', marginBottom: '6px' }}>{generatedImages[key].label}</p>
                  <img src={generatedImages[key].url} alt={generatedImages[key].label} style={{ width: '100%', borderRadius: '6px', border: '1px solid #dee2e6' }} />
                </div>
              ))}
            </div>
          )}

          <button className="close-share-options" onClick={handleClose} disabled={isSending}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default ShareResults;