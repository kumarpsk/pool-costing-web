import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas'; // new import
import './tax.css';

// Utility function for safe number formatting
const safeToFixed = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.00";
  }
  return Number(value).toFixed(decimals);
};

// Convert number to words (Indian numbering system)
const numberToWords = (num) => {
  if (num === 0) return "Zero";
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  const convert = (n) => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  let result = convert(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + convert(paise) + ' Paise';
  }
  return result + ' Only';
};

const TaxInvoice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const invoiceRef = useRef();   // for the whole preview
  const docRef = useRef();       // for the exact document to capture

  // Tenant branding state
  const [companyProfile, setCompanyProfile] = useState(null);
  const [brandingLoading, setBrandingLoading] = useState(true);
  
  // Extract ALL data from location state
  const {
    mainPoolTotal = 0,
    mepTotal = 0,
    totalMepWithPipes = 0,
    balanceTankItems = [],
    balanceTankQuantities = {},
    balanceTankTotal = 0,
    hasBalancingTank = false,
    balancingTankTotal = 0,
    balancingRows = [],
    pumpRoomTotal = 0,
    pumpRoomItems = [],
    pumpRoomQuantities = {},
    pumpRoomDimensions = {},
    includePumpRoom = false,
    pipingItems = [],
    pipingTotal = 0,
    selectedAdvancedEquipment = [],
    advancedEquipmentTotal = 0,
    poolType = 'skimmer',
    hasGutter = false,
    exchangeRate = 83.25,
    constructionType = 'in-ground',
    overflowGratingData = null,
  } = location.state || {};

  // Fetch tenant branding
  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const companyCode = localStorage.getItem("tenant_company_code");
        if (!companyCode) {
          const cached = localStorage.getItem("tenant_company_profile");
          if (cached) setCompanyProfile(JSON.parse(cached));
          setBrandingLoading(false);
          return;
        }
        const response = await fetch(
          `https://pool-costing-api.intelithon.in/admin/tenant/public-profile?company_code=${companyCode}`
        );
        const result = await response.json();
        if (result.success && result.data) {
          setCompanyProfile(result.data);
          localStorage.setItem("tenant_company_profile", JSON.stringify(result.data));
        }
      } catch (error) {
        const cached = localStorage.getItem("tenant_company_profile");
        if (cached) setCompanyProfile(JSON.parse(cached));
      } finally {
        setBrandingLoading(false);
      }
    };
    fetchCompanyProfile();
  }, []);

  // Effective totals
  const effectiveMepTotal = Number(totalMepWithPipes) || Number(mepTotal) || 0;

  const getEffectiveBalanceTankTotal = () => {
    let btTotal = Number(balanceTankTotal) || Number(balancingTankTotal) || 0;
    const hasBTItems = (balanceTankItems?.length > 0) || (balancingRows?.length > 0);
    const poolTypeLower = (poolType || 'skimmer').toLowerCase();
    if ((poolTypeLower === 'overflow' || poolTypeLower === 'infinity') && btTotal === 0 && hasBTItems) {
      let calculatedTotal = 0;
      const itemsToUse = balanceTankItems.length > 0 ? balanceTankItems : balancingRows;
      itemsToUse.forEach(item => {
        const qty = balanceTankQuantities[`${item.SlNo}`] || 0;
        calculatedTotal += qty * (item.Rate || 0);
      });
      return calculatedTotal;
    }
    return btTotal;
  };
  const effectiveBalanceTankTotal = getEffectiveBalanceTankTotal();

  const getEffectivePumpRoomTotal = () => {
    const poolTypeLower = (poolType || 'skimmer').toLowerCase();
    const shouldIncludePR = poolTypeLower === 'overflow' || poolTypeLower === 'infinity' || includePumpRoom;
    return shouldIncludePR ? Number(pumpRoomTotal) || 0 : 0;
  };
  const effectivePumpRoomTotal = getEffectivePumpRoomTotal();

  const effectiveAdvancedEquipmentTotal = selectedAdvancedEquipment?.length > 0 ? Number(advancedEquipmentTotal) || 0 : 0;
  const effectivePipingTotal = pipingItems?.length > 0 ? Number(pipingTotal) || 0 : 0;

  const subtotal = Number(mainPoolTotal || 0) + effectiveMepTotal + effectiveBalanceTankTotal +
                   effectivePumpRoomTotal + effectiveAdvancedEquipmentTotal + effectivePipingTotal;

  // Invoice state
  const [invoiceData, setInvoiceData] = useState({
    invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    sellerName: '',
    sellerAddress: '',
    sellerCity: '',
    sellerGSTIN: '',
    sellerPhone: '',
    sellerEmail: '',
    billToName: '',
    billToAddress: '',
    billToCity: '',
    billToGSTIN: '',
    billToPhone: '',
    shipToName: '',
    shipToAddress: '',
    shipToCity: '',
    shipToPhone: '',
    poNumber: '',
    poDate: ''
  });

  useEffect(() => {
    if (companyProfile) {
      setInvoiceData(prev => ({
        ...prev,
        sellerName: companyProfile.company_name || "",
        sellerAddress: companyProfile.address || "",
        sellerCity: "",
        sellerGSTIN: companyProfile.gst_number || "",
        sellerPhone: companyProfile.phone || "",
        sellerEmail: companyProfile.email || ""
      }));
    }
  }, [companyProfile]);

  const [isEditing, setIsEditing] = useState(true);
  const [cgstRate, setCgstRate] = useState(9);
  const [sgstRate, setSgstRate] = useState(9);
  const [igstRate, setIgstRate] = useState(18);
  const [useIGST, setUseIGST] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showUSD, setShowUSD] = useState(false);
  const [usdRate, setUsdRate] = useState(exchangeRate || 83.25);
  const [loadingRates, setLoadingRates] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [rateError, setRateError] = useState(null);

  // Tax calculations
  const cgstAmount = !useIGST ? (subtotal * cgstRate) / 100 : 0;
  const sgstAmount = !useIGST ? (subtotal * sgstRate) / 100 : 0;
  const igstAmount = useIGST ? (subtotal * igstRate) / 100 : 0;
  const grandTotal = subtotal + cgstAmount + sgstAmount + igstAmount;

  const convertToUSD = (amount) => amount / usdRate;
  const formatCurrency = (amount, inUSD = false) => {
    const value = inUSD && showUSD ? convertToUSD(amount) : amount;
    const symbol = inUSD && showUSD ? '$' : '₹';
    return `${symbol}${safeToFixed(value)}`;
  };

  const getPoolTypeDisplay = () => {
    const map = { skimmer: 'Skimmer', overflow: 'Overflow', infinity: 'Infinity', curved: 'FreeForm', freeform: 'FreeForm' };
    return map[poolType?.toLowerCase()] || 'Skimmer';
  };

  // Descriptions (same as before – kept for readability)
  const getCivilWorksDescription = () => {
    let desc = `Civil Works - ${getPoolTypeDisplay()} Pool Construction`;
    if (effectiveBalanceTankTotal > 0) desc += ' with Balance Tank';
    if (effectivePumpRoomTotal > 0) desc += ' & Pump Room';
    if (hasGutter) desc += ' (Gutter System)';
    desc += constructionType === 'terrace' ? ' (Terrace)' : ' (In-Ground)';
    return desc;
  };

  const getMEPWorksDescription = () => {
    let desc = 'MEP Works – Mechanical, Electrical & Plumbing Systems';
    const features = [];
    if (poolType === 'skimmer') features.push('skimmer filtration');
    if (poolType === 'overflow' || poolType === 'infinity') features.push('overflow edge circulation');
    features.push('circulation pump', 'electrical controls');
    if (overflowGratingData) features.push('overflow grating');
    if (features.length) desc += ` including ${features.join(', ')}`;
    if (effectiveAdvancedEquipmentTotal > 0) desc += `, advanced equipment (${selectedAdvancedEquipment?.length || 0} items)`;
    desc += ' – installation & commissioning';
    desc += ' (Pipes, fittings, valves billed separately under Piping System)';
    return desc;
  };

  const getBalanceTankDescription = () => {
    let desc = 'Balance Tank Construction – ';
    if (poolType === 'overflow' || poolType === 'infinity') {
      desc += 'Essential for overflow pools; recirculates overflow water.';
    } else {
      desc += 'For gutter drainage systems.';
    }
    desc += constructionType === 'terrace' ? ' Terrace works, no excavation.' : ' In‑Ground: excavation, PCC, RCC, waterproofing, plastering.';
    return desc;
  };

  const getPipingSystemDescription = () => {
    if (!pipingItems?.length) return '';
    const pipeCount = pipingItems.filter(i => i.category === "pipe" || i.category === "pipes").length;
    const valveCount = pipingItems.filter(i => i.category === "valve" || i.category === "ball_valve" || i.category === "check_valve").length;
    const flangeCount = pipingItems.filter(i => i.category === "flange" || i.category === "puddle_flange").length;
    const headerCount = pipingItems.filter(i => i.category === "header").length;
    let desc = 'Piping System – Complete plumbing network including ';
    const parts = [];
    if (headerCount > 0) parts.push(`${headerCount} headers`);
    if (pipeCount > 0) parts.push(`${pipeCount} pipes`);
    if (valveCount > 0) parts.push(`${valveCount} valves`);
    if (flangeCount > 0) parts.push(`${flangeCount} flanges`);
    desc += parts.join(', ') + '. Fittings, supports & accessories included. Installation (15%) included.';
    return desc;
  };

  // Handler for inputs
  const handleInputChange = (field, value) => setInvoiceData(prev => ({ ...prev, [field]: value }));

  const copyBillToShip = () => {
    setInvoiceData(prev => ({
      ...prev,
      shipToName: prev.billToName,
      shipToAddress: prev.billToAddress,
      shipToCity: prev.billToCity,
      shipToPhone: prev.billToPhone
    }));
  };

  // **NEW PDF DOWNLOAD using html2canvas**
  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const element = docRef.current; // the invoice-document_5 div
      if (!element) {
        alert('Invoice preview not found');
        setDownloading(false);
        return;
      }
      
      // Add a clean capture class temporarily
      element.classList.add('pdf-capture-mode_5');
      
      const canvas = await html2canvas(element, {
        scale: 2,               // higher resolution
        useCORS: true,          // allow external images (logo)
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      // Remove the class after capture
      element.classList.remove('pdf-capture-mode_5');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit A4
      const imgWidth = pdfWidth - 20; // margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10; // top margin

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // If content exceeds one page, add more pages
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10; // adjust for margin
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const currencySuffix = showUSD ? '_USD' : '_INR';
      pdf.save(`Tax_Invoice_${invoiceData.invoiceNo}_${getPoolTypeDisplay()}${currencySuffix}.pdf`);
      alert(`✅ Invoice downloaded in ${showUSD ? 'USD' : 'INR'}`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('❌ Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Currency rate fetch (unchanged)
  const fetchExchangeRate = async () => { /* ... same as before ... */ };

  useEffect(() => {
    if (exchangeRate) setUsdRate(exchangeRate);
    else fetchExchangeRate();
  }, []);

  if (!mainPoolTotal && !effectiveMepTotal && !effectiveBalanceTankTotal && !effectivePipingTotal) {
    return (
      <div className="tax-invoice-error_5">
        <h2>⚠️ No Data Available</h2>
        <p>Please generate calculations first before creating a tax invoice.</p>
        <button onClick={() => navigate('/')}>Go to Calculator</button>
      </div>
    );
  }

  if (brandingLoading) {
    return (
      <div className="tax-invoice-loading_5">
        <div className="loading-spinner_5"></div>
        <p>Loading invoice...</p>
      </div>
    );
  }

  return (
    <div className="tax-invoice-container_5">
      {/* Actions Bar */}
      <div className="invoice-actions_5">
        <button className="btn-back_5" onClick={() => navigate(-1)}>← Back</button>
        <div className="action-buttons_5">
          <div className="usd-toggle_5">
            <label className="toggle-switch_5">
              <input type="checkbox" checked={showUSD} onChange={(e) => setShowUSD(e.target.checked)} />
              <span className="toggle-slider_5"></span>
              <span className="toggle-label_5">Show in USD</span>
            </label>
            <button className="btn-refresh-rates_5" onClick={fetchExchangeRate} disabled={loadingRates}>
              {loadingRates ? '🔄 Updating...' : '🔄 Refresh Rates'}
            </button>
          </div>
          <button className={`btn-toggle_5 ${isEditing ? 'active_5' : ''}`} onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? '👁️ Preview' : '✏️ Edit'}
          </button>
          <button className="btn-download_5" onClick={downloadPDF} disabled={downloading}>
            {downloading ? '⏳ Generating...' : '📄 Download PDF'}
          </button>
        </div>
      </div>

      {/* Pool Type Banner */}
      <div className="pool-type-banner_5">
        <span className="pool-type-tag_5">{getPoolTypeDisplay()} Pool</span>
        <span className="construction-type-tag_5">{constructionType === 'terrace' ? 'Terrace' : 'In-Ground'}</span>
        {hasGutter && <span className="feature-tag_5">Gutter System</span>}
        {effectiveBalanceTankTotal > 0 && <span className="feature-tag_5 balance-tank-tag_5">Balance Tank</span>}
        {effectivePumpRoomTotal > 0 && <span className="feature-tag_5">Pump Room</span>}
        {effectiveAdvancedEquipmentTotal > 0 && <span className="feature-tag_5">Advanced Equipment</span>}
        {effectivePipingTotal > 0 && <span className="feature-tag_5">Piping System</span>}
      </div>

      {/* Cost Summary Banner */}
      <div className="cost-summary-banner_5">
        <div className="cost-item_5"><span>Main Pool:</span> <strong>{formatCurrency(mainPoolTotal, showUSD)}</strong></div>
        {effectiveBalanceTankTotal > 0 && <div className="cost-item_5"><span>Balance Tank:</span> <strong>{formatCurrency(effectiveBalanceTankTotal, showUSD)}</strong></div>}
        {effectivePumpRoomTotal > 0 && <div className="cost-item_5"><span>Pump Room:</span> <strong>{formatCurrency(effectivePumpRoomTotal, showUSD)}</strong></div>}
        <div className="cost-item_5"><span>MEP Systems:</span> <strong>{formatCurrency(effectiveMepTotal, showUSD)}</strong></div>
        {effectiveAdvancedEquipmentTotal > 0 && <div className="cost-item_5"><span>Advanced Equipment:</span> <strong>{formatCurrency(effectiveAdvancedEquipmentTotal, showUSD)}</strong></div>}
        {effectivePipingTotal > 0 && <div className="cost-item_5"><span>Piping System:</span> <strong>{formatCurrency(effectivePipingTotal, showUSD)}</strong></div>}
        <div className="cost-item_5 total_5"><span>Subtotal:</span> <strong>{formatCurrency(subtotal, showUSD)}</strong></div>
      </div>

      {/* Exchange Rate Info */}
      {showUSD && (
        <div className="currency-info-banner_5">
          <div className="exchange-rate_5"><strong>Live Exchange Rate:</strong> 1 USD = ₹{safeToFixed(usdRate, 2)} INR</div>
          <div className="rate-info_5">
            <small>Last updated: {lastUpdated.toLocaleTimeString()}</small>
            {rateError && <span className="rate-error_5">⚠️ {rateError}</span>}
            {loadingRates && <span className="loading-indicator_5">🔄 Updating rates...</span>}
          </div>
        </div>
      )}

      {/* Editor Form */}
      {isEditing && (
        <div className="invoice-editor_5">
          <h2>📝 Edit Invoice Details</h2>
          <div className="editor-grid_5">
            {/* Invoice Information */}
            <div className="editor-section_5">
              <h3>Invoice Information</h3>
              <div className="form-group_5"><label>Invoice Number</label><input type="text" value={invoiceData.invoiceNo} onChange={(e) => handleInputChange('invoiceNo', e.target.value)} /></div>
              <div className="form-group_5"><label>Invoice Date</label><input type="date" value={invoiceData.invoiceDate} onChange={(e) => handleInputChange('invoiceDate', e.target.value)} /></div>
              <div className="form-group_5"><label>Due Date</label><input type="date" value={invoiceData.dueDate} onChange={(e) => handleInputChange('dueDate', e.target.value)} /></div>
              <div className="form-group_5"><label>PO Number (Optional)</label><input type="text" value={invoiceData.poNumber} onChange={(e) => handleInputChange('poNumber', e.target.value)} /></div>
              <div className="form-group_5"><label>PO Date (Optional)</label><input type="date" value={invoiceData.poDate} onChange={(e) => handleInputChange('poDate', e.target.value)} /></div>
            </div>

            {/* Bill To */}
            <div className="editor-section_5">
              <h3>Bill To (Customer Details)</h3>
              <div className="form-group_5"><label>Customer Name *</label><input type="text" value={invoiceData.billToName} onChange={(e) => handleInputChange('billToName', e.target.value)} required /></div>
              <div className="form-group_5"><label>Address *</label><textarea value={invoiceData.billToAddress} onChange={(e) => handleInputChange('billToAddress', e.target.value)} rows="2" required /></div>
              <div className="form-group_5"><label>City, State & PIN *</label><input type="text" value={invoiceData.billToCity} onChange={(e) => handleInputChange('billToCity', e.target.value)} required /></div>
              <div className="form-group_5"><label>GSTIN (Optional)</label><input type="text" value={invoiceData.billToGSTIN} onChange={(e) => handleInputChange('billToGSTIN', e.target.value)} /></div>
              <div className="form-group_5"><label>Phone *</label><input type="tel" value={invoiceData.billToPhone} onChange={(e) => handleInputChange('billToPhone', e.target.value)} required /></div>
            </div>

            {/* Ship To */}
            <div className="editor-section_5">
              <div className="section-header-with-action_5">
                <h3>Ship To (Delivery Address)</h3>
                <button className="btn-copy_5" onClick={copyBillToShip}>📋 Same as Bill To</button>
              </div>
              <div className="form-group_5"><label>Name</label><input type="text" value={invoiceData.shipToName} onChange={(e) => handleInputChange('shipToName', e.target.value)} /></div>
              <div className="form-group_5"><label>Address</label><textarea value={invoiceData.shipToAddress} onChange={(e) => handleInputChange('shipToAddress', e.target.value)} rows="2" /></div>
              <div className="form-group_5"><label>City, State & PIN</label><input type="text" value={invoiceData.shipToCity} onChange={(e) => handleInputChange('shipToCity', e.target.value)} /></div>
              <div className="form-group_5"><label>Phone</label><input type="tel" value={invoiceData.shipToPhone} onChange={(e) => handleInputChange('shipToPhone', e.target.value)} /></div>
            </div>

            {/* Tax Rates */}
            <div className="editor-section_5">
              <h3>Tax Configuration</h3>
              <div className="form-group_5 checkbox-group_5">
                <label className="checkbox-label_5"><input type="checkbox" checked={useIGST} onChange={(e) => setUseIGST(e.target.checked)} /> Use IGST (Interstate)</label>
              </div>
              {useIGST ? (
                <div className="form-group_5"><label>IGST Rate (%)</label><input type="number" min="0" max="28" step="0.5" value={igstRate} onChange={(e) => setIgstRate(parseFloat(e.target.value) || 0)} /><small className="help-text_5">For interstate transactions</small></div>
              ) : (
                <>
                  <div className="form-group_5"><label>CGST Rate (%)</label><input type="number" min="0" max="18" step="0.5" value={cgstRate} onChange={(e) => setCgstRate(parseFloat(e.target.value) || 0)} /><small className="help-text_5">Central GST</small></div>
                  <div className="form-group_5"><label>SGST Rate (%)</label><input type="number" min="0" max="18" step="0.5" value={sgstRate} onChange={(e) => setSgstRate(parseFloat(e.target.value) || 0)} /><small className="help-text_5">State GST</small></div>
                </>
              )}
              <div className="tax-summary_5">
                <p><strong>Tax Type:</strong> {useIGST ? 'IGST' : 'CGST + SGST'}</p>
                <p><strong>Total Tax Rate:</strong> {useIGST ? igstRate : (cgstRate + sgstRate)}%</p>
                <p><strong>Tax Amount:</strong> {formatCurrency(useIGST ? igstAmount : (cgstAmount + sgstAmount), showUSD)}</p>
                <p><strong>Grand Total:</strong> {formatCurrency(grandTotal, showUSD)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview – this is the element captured for PDF */}
      <div className="invoice-preview_5" ref={invoiceRef}>
        <div className="invoice-document_5" ref={docRef}>
          
          {/* Header */}
          <div className="invoice-header_5">
            <div className="company-info_5">
              <div className="company-logo_5">
                <img
                  src={companyProfile?.logo_url ? `https://pool-costing-api.intelithon.in/${companyProfile.logo_url}` : "/intelithon-logo.jpg"}
                  alt="Company Logo"
                  width={100}
                  onError={(e) => { e.target.style.display = 'none'; }} // hide broken logo gracefully
                />
              </div>
              <div className="company-details_5">
                <h1 className="company-name_5">{invoiceData.sellerName || 'Company Name'}</h1>
                <p className="company-address_5">{invoiceData.sellerAddress || ''}</p>
                <p className="company-city_5">{invoiceData.sellerCity || ''}</p>
                <p className="company-gstin_5">GSTIN: {invoiceData.sellerGSTIN || ''}</p>
                <p className="company-contact_5">
                  <span>Phone: {invoiceData.sellerPhone || ''}</span>
                  <span>Email: {invoiceData.sellerEmail || ''}</span>
                </p>
                
                {showUSD && (
                  <div className="currency-display_5">
                    <small><strong>Live Rate:</strong> 1 USD = ₹{safeToFixed(usdRate, 2)} INR</small><br />
                    <small><strong>Updated:</strong> {lastUpdated.toLocaleTimeString()}</small>
                  </div>
                )}
              </div>
            </div>
            
            <div className="invoice-title-section_5">
              <h2 className="invoice-title_5">TAX INVOICE</h2>
              <div className="invoice-meta_5">
                <div className="meta-row_5"><span className="meta-label_5">Invoice No:</span><span className="meta-value_5">{invoiceData.invoiceNo}</span></div>
                <div className="meta-row_5"><span className="meta-label_5">Date:</span><span className="meta-value_5">{new Date(invoiceData.invoiceDate).toLocaleDateString('en-IN')}</span></div>
                {invoiceData.poNumber && <div className="meta-row_5"><span className="meta-label_5">PO No:</span><span className="meta-value_5">{invoiceData.poNumber}</span></div>}
                {invoiceData.poDate && <div className="meta-row_5"><span className="meta-label_5">PO Date:</span><span className="meta-value_5">{new Date(invoiceData.poDate).toLocaleDateString('en-IN')}</span></div>}
                <div className="meta-row_5"><span className="meta-label_5">Tax Type:</span><span className="meta-value_5">{useIGST ? 'IGST' : 'CGST + SGST'}</span></div>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="address-section_5">
            <div className="bill-to-section_5">
              <h3 className="section-title_5">BILL TO</h3>
              <div className="address-details_5">
                <p className="address-name_5">{invoiceData.billToName || 'Customer Name'}</p>
                <p className="address-line_5">{invoiceData.billToAddress || 'Address'}</p>
                <p className="address-city_5">{invoiceData.billToCity || 'City'}</p>
                <p className="address-phone_5">Phone: {invoiceData.billToPhone || 'Phone Number'}</p>
                {invoiceData.billToGSTIN && <p className="address-gstin_5">GSTIN: {invoiceData.billToGSTIN}</p>}
              </div>
            </div>
            <div className="ship-to-section_5">
              <h3 className="section-title_5">SHIP TO</h3>
              <div className="address-details_5">
                <p className="address-name_5">{invoiceData.shipToName || invoiceData.billToName || 'Recipient Name'}</p>
                <p className="address-line_5">{invoiceData.shipToAddress || invoiceData.billToAddress || 'Address'}</p>
                <p className="address-city_5">{invoiceData.shipToCity || invoiceData.billToCity || 'City'}</p>
                <p className="address-phone_5">Phone: {invoiceData.shipToPhone || invoiceData.billToPhone || 'Phone Number'}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="invoice-table_5" style={{ minWidth:"400px" }}>
            <thead>
              <tr>
                <th className="sl-no_5">Sl.No</th>
                <th className="description_5">Description</th>
                <th className="hsn_5">HSN/SAC</th>
                <th className="amount_5">Amount ({showUSD ? 'USD' : 'INR'})</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td><div className="item-description_5"><strong>Civil Works – Pool Construction</strong><span className="item-details_5">{getCivilWorksDescription()}</span></div></td>
                <td>995414</td>
                <td className="amount_5">{formatCurrency(mainPoolTotal, showUSD)}</td>
              </tr>
              <tr>
                <td>2</td>
                <td><div className="item-description_5"><strong>MEP Works – Equipment & Systems</strong><span className="item-details_5">{getMEPWorksDescription()}</span></div></td>
                <td>841290</td>
                <td className="amount_5">{formatCurrency(effectiveMepTotal, showUSD)}</td>
              </tr>
              {effectiveBalanceTankTotal > 0 && (
                <tr>
                  <td>3</td>
                  <td><div className="item-description_5"><strong>Balance Tank Construction</strong><span className="item-details_5">{getBalanceTankDescription()}</span></div></td>
                  <td>995414</td>
                  <td className="amount_5">{formatCurrency(effectiveBalanceTankTotal, showUSD)}</td>
                </tr>
              )}
              {effectivePumpRoomTotal > 0 && (
                <tr>
                  <td>{effectiveBalanceTankTotal > 0 ? 4 : 3}</td>
                  <td><div className="item-description_5"><strong>Pump Room Construction</strong><span className="item-details_5">Complete civil construction of pump room with foundation, walls, and finishing.</span></div></td>
                  <td>995414</td>
                  <td className="amount_5">{formatCurrency(effectivePumpRoomTotal, showUSD)}</td>
                </tr>
              )}
              {effectivePipingTotal > 0 && (
                <tr>
                  <td>{(effectiveBalanceTankTotal > 0 ? 1 : 0) + (effectivePumpRoomTotal > 0 ? 1 : 0) + 3}</td>
                  <td><div className="item-description_5"><strong>Piping System – Plumbing Network</strong><span className="item-details_5">{getPipingSystemDescription()}</span></div></td>
                  <td>995493</td>
                  <td className="amount_5">{formatCurrency(effectivePipingTotal, showUSD)}</td>
                </tr>
              )}
              {effectiveAdvancedEquipmentTotal > 0 && (
                <tr>
                  <td>{(effectiveBalanceTankTotal > 0 ? 1 : 0) + (effectivePumpRoomTotal > 0 ? 1 : 0) + (effectivePipingTotal > 0 ? 1 : 0) + 3}</td>
                  <td><div className="item-description_5"><strong>Advanced Equipment</strong><span className="item-details_5">Selected advanced equipment items ({selectedAdvancedEquipment?.length || 0} items)</span></div></td>
                  <td>841290</td>
                  <td className="amount_5">{formatCurrency(effectiveAdvancedEquipmentTotal, showUSD)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="totals-section_5">
            <div className="terms-section_5">
              <h4>Terms & Conditions</h4>
              <div className="terms-content_5">
                <p>Certified that the particulars given above are true and correct</p>
                <p>Goods Once sold will not be taken back</p>
                <p>Our Responsibility Ceases once goods delivered to the buyer/transporter</p>
                <p>Subject to Bengaluru judiciary</p>
                <p>Payment due within 30 days</p>
              </div>
            </div>
            <div className="amounts-section_5">
              <div className="amount-row_5"><span className="amount-label_5">Subtotal:</span><span className="amount-value_5">{formatCurrency(subtotal, showUSD)}</span></div>
              {useIGST ? (
                <div className="amount-row_5"><span className="amount-label_5">IGST @ {igstRate}%:</span><span className="amount-value_5">{formatCurrency(igstAmount, showUSD)}</span></div>
              ) : (
                <>
                  <div className="amount-row_5"><span className="amount-label_5">CGST @ {cgstRate}%:</span><span className="amount-value_5">{formatCurrency(cgstAmount, showUSD)}</span></div>
                  <div className="amount-row_5"><span className="amount-label_5">SGST @ {sgstRate}%:</span><span className="amount-value_5">{formatCurrency(sgstAmount, showUSD)}</span></div>
                </>
              )}
              <div className="amount-row_5 total-row_5"><span className="amount-label_5">Total:</span><span className="amount-value_5">{formatCurrency(grandTotal, showUSD)}</span></div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="amount-words_5"><strong>Amount in Words:</strong> {numberToWords(grandTotal)}</div>

          {/* Footer */}
          <div className="invoice-footer_5">
            <div className="bank-details_5">
              <h4>Bank Details</h4>
              <div className="bank-info_5">
                <p><strong>Bank Name:</strong> State Bank of India</p>
                <p><strong>Account Name:</strong> {invoiceData.sellerName || 'Company Name'}</p>
                <p><strong>Account No:</strong> 1234567890</p>
                <p><strong>IFSC Code:</strong> SBIN0001234</p>
                <p><strong>Branch:</strong> MG Road, Bengaluru</p>
              </div>
            </div>
            <div className="signature-section_5">
              <div className="signature-box_5">
                <p>Authorized Signature</p>
                <div className="signature-line_5"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxInvoice;