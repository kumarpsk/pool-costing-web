import React, { useState } from 'react';
import './download.css';

// Utility function for safe number formatting
function safeToFixed(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.00";
  }
  return Number(value).toFixed(decimals);
}

// PDF Generation Function - Updated to include balancing tank
export const generatePDF = async (resultData, mainPoolData = [], mepItems = [], dimensions = {}, totalMep = 0, balancingRows = []) => {
  try {
    // Show loading indicator
    showLoadingModal();

    // Create PDF content
    const pdfContent = createPDFContent(resultData, mainPoolData, mepItems, dimensions, totalMep, balancingRows);
    
    // Generate PDF using html2pdf
    const element = document.createElement('div');
    element.innerHTML = pdfContent;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '-9999px';
    document.body.appendChild(element);

    // Use browser's built-in print functionality for PDF generation
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pool Calculation Report</title>
          <style>
            ${getPDFStyles()}
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
          <div class="no-print" style="position: fixed; bottom: 20px; right: 20px; background: #2c5aa0; color: white; padding: 10px 20px; border-radius: 8px; font-family: Arial, sans-serif; cursor: pointer;" onclick="window.print()">
            🖨️ Print / Save as PDF
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Auto-focus and show print dialog after a brief delay
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
    
    // Cleanup
    document.body.removeChild(element);
    hideLoadingModal();
    
    // Show success notification
    showSuccessNotification();

  } catch (error) {
    console.error('PDF generation error:', error);
    hideLoadingModal();
    showErrorNotification();
  }
};

// Advanced PDF Content Generator - Updated to include balancing tank
function createPDFContent(resultData, mainPoolData, mepItems, dimensions, totalMep, balancingRows) {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const totalMainPool = resultData?.total_cost || 0;
  const totalBalancingTank = resultData?.total_cost_1 || 0;
  const calculatedTotalMEP = totalMep || mepItems.reduce((sum, item) => {
    const mepQuantityMapping = {
      1: 'Filter_QTY',
      2: 'Pumps_QTY', 
      3: 'Inlets_QTY',
      4: 'MainDrain_QTY',
      5: 'VaccumInlet_QTY',
      6: 'Mpv_QTY',
      7: 'Lights_QTY'
    };
    const quantityField = mepQuantityMapping[item.SlNo];
    const qty = quantityField ? (resultData?.[quantityField] || 0) : (item.Qty || 0);
    return sum + (qty * (item.Rate || 0));
  }, 0);

  const subtotal = totalMainPool + totalBalancingTank + calculatedTotalMEP;
  const grandTotal = subtotal * 1.18; // Including 18% GST

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pool Calculation Report</title>
      <style>
        ${getPDFStyles()}
      </style>
    </head>
    <body>
      <!-- Header Section -->
      <div class="pdf-header">
        <div class="company-logo">
          <img src="/Screenshot_2025-08-08_131502-removebg-preview.png" class="img"/>
          <p>Professional Pool Design & Construction</p>
        </div>
        <div class="report-info">
          <h2>Pool Calculation Report</h2>
          <p class="report-date">Generated: ${currentDate}</p>
          <p class="report-id">Report ID: #PCR-${Date.now().toString().slice(-6)}</p>
        </div>
      </div>

      <!-- Executive Summary -->
      <div class="pdf-section executive-summary">
        <h2>Executive Summary</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Pool Dimensions</span>
            <span class="summary-value">${resultData?.dimensions || 'N/A'}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Volume</span>
            <span class="summary-value">${safeToFixed(resultData?.volume_m3)} m³</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Project Cost</span>
            <span class="summary-value highlight">₹${safeToFixed(grandTotal)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Estimated Timeline</span>
            <span class="summary-value">45-60 Days</span>
          </div>
        </div>
      </div>

      <!-- Pool Specifications -->
      <div class="pdf-section pool-specs">
        <h2>Pool Specifications & Technical Details</h2>
        <div class="specs-table-container">
          <table class="specs-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Value</th>
                <th>Unit</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Pool Dimensions</td>
                <td>${resultData?.dimensions || 'N/A'}</td>
                <td>meters</td>
                <td>Length x Width x Depth</td>
              </tr>
              <tr>
                <td>Water Volume</td>
                <td>${safeToFixed(resultData?.volume_m3)}</td>
                <td>m³</td>
                <td>${safeToFixed(resultData?.liters, 0)} Liters</td>
              </tr>
              <tr>
                <td>Floor Area</td>
                <td>${safeToFixed(resultData?.floor_area_m2)}</td>
                <td>m²</td>
                <td>Surface area of pool bottom</td>
              </tr>
              <tr>
                <td>Wall Area</td>
                <td>${safeToFixed(resultData?.wall_area_m2)}</td>
                <td>m²</td>
                <td>Total wall surface area</td>
              </tr>
              <tr>
                <td>Turnover Rate</td>
                <td>4</td>
                <td>hours</td>
                <td>Complete water circulation</td>
              </tr>
              <tr>
                <td>Flow Rate</td>
                <td>${safeToFixed(resultData?.flowrate_m3_per_hr)}</td>
                <td>m³/hr</td>
                <td>Water circulation rate</td>
              </tr>
              <tr>
                <td>Filter Diameter</td>
                <td>${resultData?.filter_dia_mm || 'N/A'}</td>
                <td>mm</td>
                <td>Sand filter specification</td>
              </tr>
              <tr>
                <td>Pump Capacity</td>
                <td>${resultData?.hp || 'N/A'}</td>
                <td>HP</td>
                <td>Motor horsepower</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Civil Works Breakdown - Main Pool -->
      <div class="pdf-section page-break">
        <h2>Civil Works - Main Pool Construction</h2>
        <div class="cost-summary-box">
          <span class="cost-label">Main Pool Total:</span>
          <span class="cost-amount">₹${safeToFixed(totalMainPool)}</span>
        </div>
        
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Sl.No</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Rate (₹)</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${generateMainPoolRows(mainPoolData, resultData)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Civil Works Breakdown - Balancing Tank -->
      <div class="pdf-section">
        <h2>Civil Works - Balancing Tank</h2>
        <div class="cost-summary-box balancing-tank">
          <span class="cost-label">Balancing Tank Total:</span>
          <span class="cost-amount">₹${safeToFixed(totalBalancingTank)}</span>
        </div>
        
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Sl.No</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Rate (₹)</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${generateBalancingTankRows(balancingRows, resultData)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- MEP Items -->
      <div class="pdf-section">
        <h2>MEP (Mechanical, Electrical, Plumbing) Items</h2>
        <div class="cost-summary-box mep">
          <span class="cost-label">MEP Items Total:</span>
          <span class="cost-amount">₹${safeToFixed(calculatedTotalMEP)}</span>
        </div>
        
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Sl.No</th>
                <th>Code</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Rate (₹)</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${generateMEPRows(mepItems, resultData)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Cost Summary -->
      <div class="pdf-section cost-breakdown">
        <h2>Project Cost Summary</h2>
        <div class="cost-breakdown-container">
          <div class="cost-item">
            <span class="cost-category">Civil Works (Main Pool)</span>
            <span class="cost-value">₹${safeToFixed(totalMainPool)}</span>
          </div>
          <div class="cost-item">
            <span class="cost-category">Civil Works (Balancing Tank)</span>
            <span class="cost-value">₹${safeToFixed(totalBalancingTank)}</span>
          </div>
          <div class="cost-item">
            <span class="cost-category">MEP Items</span>
            <span class="cost-value">₹${safeToFixed(calculatedTotalMEP)}</span>
          </div>
          <div class="cost-item subtotal">
            <span class="cost-category">Subtotal</span>
            <span class="cost-value">₹${safeToFixed(subtotal)}</span>
          </div>
          <div class="cost-item tax">
            <span class="cost-category">GST (18%)</span>
            <span class="cost-value">₹${safeToFixed(subtotal * 0.18)}</span>
          </div>
          <div class="cost-item grand-total">
            <span class="cost-category">Grand Total (Including GST)</span>
            <span class="cost-value">₹${safeToFixed(grandTotal)}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="pdf-footer">
        <div class="footer-content">
          <div class="footer-section">
            <h3>Terms & Conditions</h3>
            <ul>
              <li>All prices are subject to change based on site conditions</li>
              <li>Final costs may vary ±10% based on actual measurements</li>
              <li>GST as applicable at the time of billing</li>
              <li>This estimate is valid for 30 days from generation date</li>
            </ul>
          </div>
          <div class="footer-section">
            <h3>Contact Information</h3>
            <p><strong>Intellithon Technologies</strong></p>
            <p>📧 intelithontech@gmail.com</p>
            <p>📞 +91 9964457127</p>
            <p>🌐 www.intelithon.in</p>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2024 AquaTech Pool Solutions. All rights reserved. | Generated on ${currentDate}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate Main Pool table rows
function generateMainPoolRows(mainPoolData, resultData) {
  const quantityMapping = {
    1: 'EarthExcavation_QTY',
    2: 'BackFilling_QTY',
    3: 'plaincement_QTY',
    4: 'BurntBrick_QTY',
    5: 'steelreinforcement_QTY',
    6: 'shotcreting_QTY',
    7: 'plastering_QTY',
    8: 'Coping_QTY',
    9: 'Soling_QTY',
    10: 'WaterProofing_QTY',
    11: 'Tiling_QTY',
    12: 'Shuttering_QTY'
  };

  return mainPoolData.map((item, idx) => {
    const sl = item.SlNo;
    const quantityField = quantityMapping[sl];
    const qty = quantityField ? (resultData?.[quantityField] || 0) : 0;
    const amount = qty * (item.Rate || 0);

    return `
      <tr>
        <td>${sl ?? idx + 1}</td>
        <td>${item.Description || 'N/A'}</td>
        <td>${qty ? safeToFixed(qty) : '-'}</td>
        <td>${item.Unit || ''}</td>
        <td>${item.Rate ? safeToFixed(item.Rate) : '-'}</td>
        <td class="amount-cell">₹${amount ? safeToFixed(amount) : '0.00'}</td>
      </tr>
    `;
  }).join('');
}

// Generate Balancing Tank table rows
function generateBalancingTankRows(balancingRows, resultData) {
  return balancingRows.map((row, idx) => {
    const sl = row.SlNo;
    let qty = 0;
    
    // Mapping for balancing tank quantity fields
    if (sl === 1) {
      qty = resultData?.EarthExcavation_QTY_1 || 0;
    } else if (sl === 2) {
      qty = resultData?.BackFilling_QTY_1 || 0;
    } else if (sl === 3) {
      qty = resultData?.plaincement_QTY_1 || 0;
    } else if (sl === 4) {
      qty = resultData?.BurntBrick_QTY_1 || 0;
    } else if (sl === 5) {
      qty = resultData?.steelreinforcement_QTY_1 || 0;
    } else if (sl === 6) {
      qty = resultData?.shotcreting_QTY_1 || 0;
    } else if (sl === 7) {
      qty = resultData?.Shuttering_QTY_1 || 0;
    } else if (sl === 8) {
      qty = resultData?.Soling_QTY_1 || 0;
    }
    
    const amount = qty * (row.Rate || 0);

    return `
      <tr>
        <td>${row.SlNo || idx + 1}</td>
        <td>${row.Description || 'N/A'}</td>
        <td>${qty ? safeToFixed(qty) : '-'}</td>
        <td>${row.Unit || ''}</td>
        <td>${row.Rate ? safeToFixed(row.Rate) : '-'}</td>
        <td class="amount-cell">₹${amount ? safeToFixed(amount) : '0.00'}</td>
      </tr>
    `;
  }).join('');
}

// Generate MEP table rows
function generateMEPRows(mepItems, resultData) {
  const mepQuantityMapping = {
    1: 'Filter_QTY',
    2: 'Pumps_QTY',
    3: 'Inlets_QTY',
    4: 'MainDrain_QTY',
    5: 'VaccumInlet_QTY',
    6: 'Mpv_QTY',
    7: 'Lights_QTY'
  };

  return mepItems.map((item, idx) => {
    const sl = item.SlNo;
    const quantityField = mepQuantityMapping[sl];
    const qty = quantityField ? (resultData?.[quantityField] || 0) : (item.Qty || 0);
    const rate = item.Rate || 0;
    const amount = qty * rate;

    let description = item.Description || 'N/A';
    if (sl === 1 && resultData?.filter_dia_mm) {
      description += ` (${resultData.filter_dia_mm}mm)`;
    }
    if (sl === 2 && resultData?.hp) {
      description += ` (${resultData.hp}hp)`;
    }

    return `
      <tr>
        <td>${sl ?? idx + 1}</td>
        <td>${item.Code || 'N/A'}</td>
        <td>${description}</td>
        <td>${qty ? safeToFixed(qty) : '-'}</td>
        <td>${item.Unit || ''}</td>
        <td>₹${rate ? safeToFixed(rate) : '0.00'}</td>
        <td class="amount-cell">₹${amount ? safeToFixed(amount) : '0.00'}</td>
      </tr>
    `;
  }).join('');
}

// PDF Styles - Updated for balancing tank
function getPDFStyles() {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    
    .pdf-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 0;
      border-bottom: 3px solid #2c5aa0;
      margin-bottom: 30px;
    }
    
    .company-logo {
      display: flex;
      flex-direction: column;
    }
    .img{
     width:10rem;
    }
    .logo-placeholder {
      font-size: 40px;
      background: linear-gradient(135deg, #2c5aa0, #4a90e2);
      color: white;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .company-info h1 {
      color: #2c5aa0;
      font-size: 24px;
      font-weight: bold;
    }
    
    .company-info p {
      color: #666;
      font-size: 14px;
    }
    
    .report-info {
      text-align: right;
    }
    
    .report-info h2 {
      color: #2c5aa0;
      font-size: 20px;
      margin-bottom: 5px;
    }
    
    .report-date, .report-id {
      color: #666;
      font-size: 12px;
      margin: 2px 0;
    }
    
    .pdf-section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    
    .pdf-section h2 {
      color: #2c5aa0;
      font-size: 18px;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .executive-summary {
      background: linear-gradient(135deg, #f8f9ff, #ffffff);
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #2c5aa0;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 15px;
    }
    
    .summary-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: white;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .summary-label {
      font-weight: 600;
      color: #555;
    }
    
    .summary-value {
      font-weight: bold;
      color: #2c5aa0;
    }
    
    .summary-value.highlight {
      background: linear-gradient(135deg, #2c5aa0, #4a90e2);
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 16px;
    }
    
    .specs-table-container, .table-container {
      overflow-x: auto;
      margin-top: 15px;
    }
    
    .specs-table, .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      background: white;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .specs-table th, .data-table th {
      background: linear-gradient(135deg, #2c5aa0, #4a90e2);
      color: white;
      padding: 12px 8px;
      font-weight: 600;
      text-align: left;
      font-size: 11px;
    }
    
    .specs-table td, .data-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    
    .specs-table tr:nth-child(even), .data-table tr:nth-child(even) {
      background: #f8f9ff;
    }
    
    .amount-cell {
      text-align: right;
      font-weight: 600;
      color: #2c5aa0;
    }
    
    .cost-summary-box {
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      font-weight: bold;
    }
    
    .cost-summary-box.balancing-tank {
      background: linear-gradient(135deg, #FF9800, #F57C00);
    }
    
    .cost-summary-box.mep {
      background: linear-gradient(135deg, #9C27B0, #7B1FA2);
    }
    
    .cost-label {
      font-size: 16px;
    }
    
    .cost-amount {
      font-size: 20px;
    }
    
    .cost-breakdown {
      background: #f8f9ff;
      padding: 20px;
      border-radius: 8px;
    }
    
    .cost-breakdown-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .cost-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 15px;
      background: white;
      border-radius: 6px;
      border-left: 4px solid #e0e0e0;
    }
    
    .cost-item.subtotal {
      border-left-color: #ffa500;
      font-weight: 600;
    }
    
    .cost-item.tax {
      border-left-color: #ff6b6b;
    }
    
    .cost-item.grand-total {
      border-left-color: #4CAF50;
      background: linear-gradient(135deg, #f8fff8, #ffffff);
      font-weight: bold;
      font-size: 16px;
    }
    
    .cost-category {
      color: #555;
    }
    
    .cost-value {
      color: #2c5aa0;
      font-weight: 600;
    }
    
    .pdf-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #2c5aa0;
      page-break-inside: avoid;
    }
    
    .footer-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 20px;
    }
    
    .footer-section h3 {
      color: #2c5aa0;
      font-size: 14px;
      margin-bottom: 10px;
    }
    
    .footer-section ul {
      list-style: none;
      font-size: 11px;
    }
    
    .footer-section li {
      margin-bottom: 4px;
      color: #666;
    }
    
    .footer-section p {
      font-size: 11px;
      color: #666;
      margin-bottom: 3px;
    }
    
    .footer-bottom {
      text-align: center;
      padding-top: 15px;
      border-top: 1px solid #e0e0e0;
      color: #888;
      font-size: 10px;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    @media print {
      .pdf-section {
        page-break-inside: avoid;
      }
    }
  `;
}

// UI Components for notifications and loading
export const PDFDownloadModal = () => {
  return (
    <div id="pdf-loading-modal" className="pdf-modal" style={{display: 'none'}}>
      <div className="pdf-modal-content">
        <div className="pdf-spinner"></div>
        <h3>Generating PDF Report...</h3>
        <p>Please wait while we create your professional pool calculation report.</p>
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
      </div>
    </div>
  );
};

// Helper functions for modals
function showLoadingModal() {
  const modal = document.getElementById('pdf-loading-modal');
  if (modal) {
    modal.style.display = 'flex';
    // Animate progress bar
    const progressFill = modal.querySelector('.progress-fill');
    if (progressFill) {
      progressFill.style.animation = 'progressAnimation 3s ease-in-out infinite';
    }
  }
}

function hideLoadingModal() {
  const modal = document.getElementById('pdf-loading-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function showSuccessNotification() {
  const notification = document.createElement('div');
  notification.className = 'success-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">✅</span>
      <span>PDF Report Downloaded Successfully!</span>
    </div>
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => document.body.removeChild(notification), 300);
  }, 3000);
}

function showErrorNotification() {
  const notification = document.createElement('div');
  notification.className = 'error-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">❌</span>
      <span>Failed to generate PDF. Please try again.</span>
    </div>
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => document.body.removeChild(notification), 300);
  }, 3000);
}

// Enhanced PDF Download Button Component - Updated to pass all data including balancing tank
export const PDFDownloadButton = ({ 
  resultData, 
  mainPoolData = [], 
  mepItems = [], 
  dimensions = {}, 
  totalMep = 0,
  balancingRows = [],
  className = "" 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    console.log('Download button clicked with data:', {
      resultData: !!resultData,
      mainPoolDataLength: mainPoolData.length,
      mepItemsLength: mepItems.length,
      totalMep: totalMep,
      balancingRowsLength: balancingRows.length
    });

    setIsGenerating(true);
    try {
      await generatePDF(resultData, mainPoolData, mepItems, dimensions, totalMep, balancingRows);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      className={`pdf-download-button ${className} ${isGenerating ? 'generating' : ''}`}
      onClick={handleDownload}
      disabled={isGenerating}
    >
      <span className="button-icon">
        {isGenerating ? '⏳' : '📄'}
      </span>
      <span className="button-text">
        {isGenerating ? 'Generating PDF...' : 'Download PDF Report'}
      </span>
      {isGenerating && <div className="button-spinner"></div>}
    </button>
  );
};