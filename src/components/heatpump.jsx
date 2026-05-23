import React, { useState } from "react";
import "./heatpump.css";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const HeatPumpCalculator = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [inputs, setInputs] = useState({
    length: 10,
    width: 3,
    depth: 1.2,
    initialTemp: 15,
    finalTemp: 30,
    heatingTime: 24,
    humidity: 60,
    windSpeed: 0.5,
    poolType: "indoor",
    circulationTime: 4,
    safetyBuffer: 15,
  });

  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs({
      ...inputs,
      [name]: parseFloat(value) || 0
    });
  };

  const handlePoolTypeChange = (type) => {
    setInputs({
      ...inputs,
      poolType: type,
      windSpeed: type === "indoor" ? 0.5 : 2.0,
      humidity: type === "indoor" ? 50 : 60
    });
  };

  const roundValue = (value, decimals = 1) => {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  };

  const roundToNearestInteger = (value) => {
    return Math.round(value);
  };

  const calculate = () => {
    const { 
      length, width, depth, initialTemp, finalTemp, heatingTime, 
      poolType, safetyBuffer
    } = inputs;

    const volume = length * width * depth;
    const surfaceArea = length * width;
    const deltaT = finalTemp - initialTemp;

    // 1. HEATING LOAD
    const heatingKW = (volume * 1000 * 4.1868 * deltaT) / (heatingTime * 3600);

    // 2. EVAPORATION LOSS (0.246 kW per m²)
    const evaporationKW = surfaceArea * 0.246;

    // 3. CONDUCTIVE LOSS (20% of evaporation loss)
    const conductionKW = evaporationKW * 0.20;

    // 4. Total Heat Loss
    const totalLossKW = evaporationKW + conductionKW;

    // 5. REPLENISHMENT HEATING
    const replenishmentPercent = poolType === "indoor" ? 0.03 : 0.05;
    const replenishmentVolume = volume * 1000 * replenishmentPercent;
    const replenishmentKW = (4.1868 * replenishmentVolume * deltaT) / (12 * 3600);

    // 6. TOTAL REQUIRED CAPACITY
    let totalKW = heatingKW + totalLossKW + replenishmentKW;
    
    // Apply safety buffer
    const bufferMultiplier = 1 + (safetyBuffer / 100);
    const totalWithBuffer = totalKW * bufferMultiplier;
    
    // Circulation flow
    const circulationFlow = volume / inputs.circulationTime;

    setResult({
      volume: roundValue(volume, 1),
      surfaceArea: roundValue(surfaceArea, 1),
      heatingKW: roundValue(heatingKW, 1),
      evaporationKW: roundValue(evaporationKW, 1),
      conductionKW: roundValue(conductionKW, 1),
      totalLossKW: roundValue(totalLossKW, 1),
      replenishmentVolume: roundToNearestInteger(replenishmentVolume),
      replenishmentKW: roundValue(replenishmentKW, 1),
      circulationFlow: roundValue(circulationFlow, 1),
      totalKW: roundValue(totalKW, 1),
      totalWithBuffer: roundValue(totalWithBuffer, 1),
      safetyBuffer: safetyBuffer,
      deltaT: roundValue(deltaT, 1),
    });
  };

  const resetForm = () => {
    setInputs({
      length: 10,
      width: 3,
      depth: 1.2,
      initialTemp: 15,
      finalTemp: 30,
      heatingTime: 24,
      humidity: 60,
      windSpeed: 0.5,
      poolType: "indoor",
      circulationTime: 4,
      safetyBuffer: 15,
    });
    setResult(null);
  };

  const generatePDF = () => {
    if (!result) return;
    
    setIsDownloading(true);
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = 20;
      
      // Title
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.setFont("helvetica", "bold");
      doc.text("Heat Pump Calculation Report", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;
      
      // Date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      const date = new Date();
      const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`;
      doc.text(`Generated: ${dateStr}`, pageWidth - margin, 15, { align: "right" });
      
      // Divider
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
      
      // Input Parameters Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Input Parameters", margin, yPos);
      yPos += 8;
      
      const inputData = [
        ["Pool Length", `${inputs.length} meters`],
        ["Pool Width", `${inputs.width} meters`],
        ["Average Depth", `${inputs.depth} meters`],
        ["Pool Volume", `${result.volume} m³ (${result.volume * 1000} Liters)`],
        ["Surface Area", `${result.surfaceArea} m²`],
        ["Current Temperature", `${inputs.initialTemp}°C`],
        ["Target Temperature", `${inputs.finalTemp}°C`],
        ["Temperature Rise", `${result.deltaT}°C`],
        ["Heating Time", `${inputs.heatingTime} hours`],
        ["Ambient Humidity", `${inputs.humidity}%`],
        ["Wind Speed", `${inputs.windSpeed} m/s`],
        ["Circulation Time", `${inputs.circulationTime} hours`],
        ["Pool Type", inputs.poolType === "indoor" ? "Indoor Pool" : "Outdoor Pool"],
        ["Safety Buffer", `${inputs.safetyBuffer}%`],
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [["Parameter", "Value"]],
        body: inputData,
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 'auto' }
        }
      });
      
      yPos = doc.lastAutoTable.finalY + 10;
      
      // Calculation Results Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Calculation Results", margin, yPos);
      yPos += 8;
      
      const resultData = [
        ["Heating Load", `${result.heatingKW} kW`, "Energy required to heat water"],
        ["Evaporation Loss", `${result.evaporationKW} kW`, `${result.surfaceArea} m² × 0.246 kW/m²`],
        ["Conductive Loss", `${result.conductionKW} kW`, "20% of evaporation loss"],
        ["Total Heat Loss", `${result.totalLossKW} kW`, "Evaporation + Conduction"],
        ["Replenishment Heating", `${result.replenishmentKW} kW`, `${result.replenishmentVolume} Liters/day (${inputs.poolType === "indoor" ? "3%" : "5%"} of volume)`],
        ["Circulation Flow", `${result.circulationFlow} m³/hr`, "Required pump flow rate"],
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [["Component", "Value", "Calculation Basis"]],
        body: resultData,
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 40 },
          2: { cellWidth: 'auto' }
        }
      });
      
      yPos = doc.lastAutoTable.finalY + 10;
      
      // Final Capacity Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Final Capacity Recommendation", margin, yPos);
      yPos += 8;
      
      const finalData = [
        ["Total Required Capacity", `${result.totalKW} kW`, "Heating + Losses + Replenishment"],
        [`With ${result.safetyBuffer}% Safety Buffer`, `${result.totalWithBuffer} kW`, "Recommended for cold climates"],
        ["Standard Size Selection", `${Math.ceil(result.totalWithBuffer / 5) * 5} kW`, "Closest available commercial model"],
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [["Description", "Value", "Notes"]],
        body: finalData,
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 65 },
          1: { cellWidth: 45 },
          2: { cellWidth: 'auto' }
        }
      });
      
      yPos = doc.lastAutoTable.finalY + 10;
      
      // Summary Section
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", margin, yPos);
      yPos += 6;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const summaryText = `For a ${result.volume} m³ ${inputs.poolType} pool with ${result.surfaceArea} m² surface area, 
heating from ${inputs.initialTemp}°C to ${inputs.finalTemp}°C in ${inputs.heatingTime} hours, 
the total required heat pump capacity is ${result.totalKW} kW. 
We recommend a ${Math.ceil(result.totalWithBuffer / 5) * 5} kW heat pump including a ${result.safetyBuffer}% safety buffer.`;
      
      const splitText = doc.splitTextToSize(summaryText, pageWidth - margin * 2);
      doc.text(splitText, margin, yPos);
      yPos += splitText.length * 6 + 10;
      
      // Recommendations
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Recommendations", margin, yPos);
      yPos += 6;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const recommendations = [
        "• Consider energy efficiency (COP) when selecting a heat pump model",
        "• For cold climates, increase safety buffer to 20-25%",
        "• Professional installation recommended for optimal performance",
        "• Regular maintenance extends equipment life and efficiency",
      ];
      
      recommendations.forEach(rec => {
        doc.text(rec, margin, yPos);
        yPos += 6;
      });
      
      yPos += 5;
      
      // Footer Note
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text("Note: This calculation provides an estimate using industry-standard formulas.", margin, yPos);
      yPos += 4;
      doc.text("Actual requirements may vary based on local climate, pool usage, and insulation.", margin, yPos);
      
      // Save PDF
      doc.save(`Heat_Pump_Report_${date.getTime()}.pdf`);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const getRecommendedSize = (kw) => {
    const sizes = [5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50];
    for (let size of sizes) {
      if (kw <= size) return size;
    }
    return Math.ceil(kw / 5) * 5;
  };

  return (
    <div className="calculator-wrapper">
      <div className="calculator-container">
        {/* Header */}
        <div className="calculator-header">
          <div className="header-content">
            <h1>🏊 Swimming Pool Heat Pump Calculator</h1>
            <p>Professional heat pump sizing calculator for residential and commercial pools</p>
          </div>
        </div>

        <div className="calculator-body">
          {/* Input Section */}
          <div className="input-card">
            <div className="card-header">
              <h2>📋 Pool Specifications</h2>
              <p>Enter your pool dimensions and requirements</p>
            </div>

            <div className="input-grid">
              <div className="input-field">
                <label>Pool Length <span>(meters)</span></label>
                <input
                  type="number"
                  name="length"
                  value={inputs.length}
                  onChange={handleChange}
                  min="1"
                  max="50"
                  step="0.5"
                />
                <small>Length of the pool in meters</small>
              </div>

              <div className="input-field">
                <label>Pool Width <span>(meters)</span></label>
                <input
                  type="number"
                  name="width"
                  value={inputs.width}
                  onChange={handleChange}
                  min="1"
                  max="20"
                  step="0.5"
                />
                <small>Width of the pool in meters</small>
              </div>

              <div className="input-field">
                <label>Average Depth <span>(meters)</span></label>
                <input
                  type="number"
                  name="depth"
                  value={inputs.depth}
                  onChange={handleChange}
                  min="0.5"
                  max="5"
                  step="0.1"
                />
                <small>Average water depth</small>
              </div>

              <div className="input-field">
                <label>Current Temperature <span>(°C)</span></label>
                <input
                  type="number"
                  name="initialTemp"
                  value={inputs.initialTemp}
                  onChange={handleChange}
                  min="5"
                  max="40"
                  step="0.5"
                />
                <small>Starting water temperature</small>
              </div>

              <div className="input-field">
                <label>Target Temperature <span>(°C)</span></label>
                <input
                  type="number"
                  name="finalTemp"
                  value={inputs.finalTemp}
                  onChange={handleChange}
                  min="15"
                  max="40"
                  step="0.5"
                />
                <small>Desired water temperature</small>
              </div>

              <div className="input-field">
                <label>Heating Time <span>(hours)</span></label>
                <input
                  type="number"
                  name="heatingTime"
                  value={inputs.heatingTime}
                  onChange={handleChange}
                  min="1"
                  max="72"
                  step="1"
                />
                <small>Time to reach target temperature</small>
              </div>

              <div className="input-field">
                <label>Ambient Humidity <span>(%)</span></label>
                <input
                  type="number"
                  name="humidity"
                  value={inputs.humidity}
                  onChange={handleChange}
                  min="10"
                  max="100"
                  step="5"
                />
                <small>Relative humidity at pool location</small>
              </div>

              <div className="input-field">
                <label>Wind Speed <span>(m/s)</span></label>
                <input
                  type="number"
                  name="windSpeed"
                  value={inputs.windSpeed}
                  onChange={handleChange}
                  min="0"
                  max="10"
                  step="0.5"
                />
                <small>Average wind speed at pool surface</small>
              </div>

              <div className="input-field">
                <label>Circulation Time <span>(hours)</span></label>
                <input
                  type="number"
                  name="circulationTime"
                  value={inputs.circulationTime}
                  onChange={handleChange}
                  min="2"
                  max="12"
                  step="0.5"
                />
                <small>Full water circulation time</small>
              </div>

              <div className="input-field">
                <label>Safety Buffer <span>(%)</span></label>
                <input
                  type="number"
                  name="safetyBuffer"
                  value={inputs.safetyBuffer}
                  onChange={handleChange}
                  min="0"
                  max="30"
                  step="5"
                />
                <small>Recommended: 15-20% for cold climates</small>
              </div>
            </div>

            <div className="pool-type-section">
              <label>Pool Type</label>
              <div className="pool-type-options">
                <button
                  className={`pool-option ${inputs.poolType === "indoor" ? "active" : ""}`}
                  onClick={() => handlePoolTypeChange("indoor")}
                >
                  <span className="pool-emoji">🏠</span>
                  <div>
                    <strong>Indoor Pool</strong>
                    <small>3% replenishment • Lower evaporation</small>
                  </div>
                </button>
                <button
                  className={`pool-option ${inputs.poolType === "outdoor" ? "active" : ""}`}
                  onClick={() => handlePoolTypeChange("outdoor")}
                >
                  <span className="pool-emoji">🌳</span>
                  <div>
                    <strong>Outdoor Pool</strong>
                    <small>5% replenishment • Higher heat loss</small>
                  </div>
                </button>
              </div>
            </div>

            <div className="action-buttons">
              <button className="btn-calculate" onClick={calculate}>
                🔥 Calculate Heat Pump Size
              </button>
              <button className="btn-reset" onClick={resetForm}>
                ↺ Reset Values
              </button>
            </div>
          </div>

          {/* Results Section */}
          {result && (
            <div className="results-card">
              <div className="card-header">
                <h2>📊 Calculation Results</h2>
                <button 
                  className="btn-pdf" 
                  onClick={generatePDF}
                  disabled={isDownloading}
                >
                  {isDownloading ? "⏳ Generating..." : "📄 Download PDF Report"}
                </button>
              </div>

              {/* Main Result */}
              <div className="main-result-grid">
                <div className="result-box primary">
                  <div className="result-icon">⚡</div>
                  <div className="result-content">
                    <div className="result-label">Required Heat Pump Capacity</div>
                    <div className="result-value">{result.totalKW} <span>kW</span></div>
                    <div className="result-note">Without safety buffer</div>
                  </div>
                </div>

                <div className="result-box secondary">
                  <div className="result-icon">🛡️</div>
                  <div className="result-content">
                    <div className="result-label">Recommended Capacity</div>
                    <div className="result-value">{result.totalWithBuffer} <span>kW</span></div>
                    <div className="result-note">With {result.safetyBuffer}% safety buffer</div>
                  </div>
                </div>

                <div className="result-box info">
                  <div className="result-icon">📏</div>
                  <div className="result-content">
                    <div className="result-label">Standard Size Selection</div>
                    <div className="result-value">{getRecommendedSize(result.totalWithBuffer)} <span>kW</span></div>
                    <div className="result-note">Closest available model</div>
                  </div>
                </div>
              </div>

              {/* Pool Information */}
              <div className="info-grid">
                <div className="info-box">
                  <div className="info-title">🏊 Pool Volume</div>
                  <div className="info-value">{result.volume} <span>m³</span></div>
                  <div className="info-desc">{result.volume * 1000} Liters</div>
                </div>
                <div className="info-box">
                  <div className="info-title">📐 Surface Area</div>
                  <div className="info-value">{result.surfaceArea} <span>m²</span></div>
                  <div className="info-desc">Water surface exposed to air</div>
                </div>
                <div className="info-box">
                  <div className="info-title">🌡️ Temperature Rise</div>
                  <div className="info-value">{result.deltaT} <span>°C</span></div>
                  <div className="info-desc">Over {inputs.heatingTime} hours</div>
                </div>
                <div className="info-box">
                  <div className="info-title">💧 Circulation Flow</div>
                  <div className="info-value">{result.circulationFlow} <span>m³/hr</span></div>
                  <div className="info-desc">Pump flow rate required</div>
                </div>
              </div>

              {/* Calculation Breakdown */}
              <div className="breakdown-section">
                <h3>📈 Detailed Calculation Breakdown</h3>
                <div className="breakdown-grid">
                  <div className="breakdown-item">
                    <div className="breakdown-header">
                      <span className="breakdown-icon">🔥</span>
                      <span>Heating Load</span>
                    </div>
                    <div className="breakdown-value">{result.heatingKW} kW</div>
                    <div className="breakdown-desc">Energy to raise water temperature</div>
                  </div>

                  <div className="breakdown-item">
                    <div className="breakdown-header">
                      <span className="breakdown-icon">💨</span>
                      <span>Evaporation Loss</span>
                    </div>
                    <div className="breakdown-value">{result.evaporationKW} kW</div>
                    <div className="breakdown-desc">Heat lost through surface evaporation</div>
                  </div>

                  <div className="breakdown-item">
                    <div className="breakdown-header">
                      <span className="breakdown-icon">🌡️</span>
                      <span>Conductive Loss</span>
                    </div>
                    <div className="breakdown-value">{result.conductionKW} kW</div>
                    <div className="breakdown-desc">Heat loss through pool walls</div>
                  </div>

                  <div className="breakdown-item">
                    <div className="breakdown-header">
                      <span className="breakdown-icon">💧</span>
                      <span>Total Heat Loss</span>
                    </div>
                    <div className="breakdown-value">{result.totalLossKW} kW</div>
                    <div className="breakdown-desc">Evaporation + Conduction</div>
                  </div>

                  <div className="breakdown-item">
                    <div className="breakdown-header">
                      <span className="breakdown-icon">🔄</span>
                      <span>Replenishment Heating</span>
                    </div>
                    <div className="breakdown-value">{result.replenishmentKW} kW</div>
                    <div className="breakdown-desc">{result.replenishmentVolume} L/day</div>
                  </div>

                  <div className="breakdown-item highlight">
                    <div className="breakdown-header">
                      <span className="breakdown-icon">⚡</span>
                      <span>Total Required Capacity</span>
                    </div>
                    <div className="breakdown-value">{result.totalKW} kW</div>
                    <div className="breakdown-desc">Heating + Losses + Replenishment</div>
                  </div>
                </div>
              </div>

              {/* Capacity Distribution Chart */}
              <div className="chart-section">
                <h3>📊 Capacity Distribution</h3>
                <div className="chart-bars">
                  <div className="chart-bar-item">
                    <div className="chart-label">Heating Load</div>
                    <div className="chart-bar-container">
                      <div 
                        className="chart-bar heating" 
                        style={{ width: `${(result.heatingKW / result.totalKW) * 100}%` }}
                      >
                        <span>{result.heatingKW} kW</span>
                      </div>
                    </div>
                    <div className="chart-percent">{Math.round((result.heatingKW / result.totalKW) * 100)}%</div>
                  </div>
                  <div className="chart-bar-item">
                    <div className="chart-label">Evaporation Loss</div>
                    <div className="chart-bar-container">
                      <div 
                        className="chart-bar evaporation" 
                        style={{ width: `${(result.evaporationKW / result.totalKW) * 100}%` }}
                      >
                        <span>{result.evaporationKW} kW</span>
                      </div>
                    </div>
                    <div className="chart-percent">{Math.round((result.evaporationKW / result.totalKW) * 100)}%</div>
                  </div>
                  <div className="chart-bar-item">
                    <div className="chart-label">Conductive Loss</div>
                    <div className="chart-bar-container">
                      <div 
                        className="chart-bar conduction" 
                        style={{ width: `${(result.conductionKW / result.totalKW) * 100}%` }}
                      >
                        <span>{result.conductionKW} kW</span>
                      </div>
                    </div>
                    <div className="chart-percent">{Math.round((result.conductionKW / result.totalKW) * 100)}%</div>
                  </div>
                  <div className="chart-bar-item">
                    <div className="chart-label">Replenishment</div>
                    <div className="chart-bar-container">
                      <div 
                        className="chart-bar replenishment" 
                        style={{ width: `${(result.replenishmentKW / result.totalKW) * 100}%` }}
                      >
                        <span>{result.replenishmentKW} kW</span>
                      </div>
                    </div>
                    <div className="chart-percent">{Math.round((result.replenishmentKW / result.totalKW) * 100)}%</div>
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="recommendation-section">
                <div className="recommendation-icon">💡</div>
                <div className="recommendation-content">
                  <h4>Professional Recommendation</h4>
                  <p>
                    Based on your pool specifications, we recommend a <strong>{getRecommendedSize(result.totalWithBuffer)} kW</strong> heat pump.
                    This includes a <strong>{result.safetyBuffer}% safety buffer</strong> for {inputs.poolType === "indoor" ? "indoor" : "outdoor"} conditions.
                  </p>
                  <div className="recommendation-tips">
                    <div className="tip">✓ Consider energy efficiency (COP) when selecting a model</div>
                    <div className="tip">✓ For cold climates, increase buffer to 20-25%</div>
                    <div className="tip">✓ Professional installation recommended for optimal performance</div>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="results-footer">
                <div className="footer-note">
                  <strong>Note:</strong> This calculation provides an estimate using industry-standard formulas. 
                  Actual requirements may vary based on local climate, pool usage, and insulation.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="calculator-footer">
          <button className="back-button">
            <Link to="/">← Back to Home</Link>
          </button>
          <p className="copyright">© 2024 Pool Heat Pump Calculator | Professional Sizing Tool</p>
        </div>
      </div>
    </div>
  );
};

export default HeatPumpCalculator;