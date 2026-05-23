// ComparisonTool.js
import React, { useState } from "react";
import "./ComparisonTool.css";

function ComparisonTool({ 
  currentData, 
  currentTotal, 
  savedCalculations, 
  onClose,
  hasBalancingTank = false,
  mainPoolCost = 0,
  balancingTankCost = 0,
  mepCost = 0,
  mainPoolRemarks = {},
  balancingTankRemarks = {},
  mepRemarks = {},
  templateDescriptions = {}
}) {
  const [selectedComparisons, setSelectedComparisons] = useState([]);
  const [activeTab, setActiveTab] = useState("summary");

  const toggleComparison = (id) => {
    setSelectedComparisons((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Helper function to format dimensions object into a readable string
  const formatDimensions = (dimensions) => {
    if (!dimensions) return "N/A";
    
    if (typeof dimensions === 'string') return dimensions;
    
    if (typeof dimensions === 'object') {
      if (dimensions.length && dimensions.width && dimensions.depth) {
        return `${dimensions.length}m × ${dimensions.width}m × ${dimensions.depth}m`;
      }
      return "N/A";
    }
    
    return "N/A";
  };

  // Safe number formatting
  const safeToFixed = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) {
      return "0.00";
    }
    return Number(value).toFixed(decimals);
  };

  // Filtered selected calculations
  const selected = savedCalculations.filter((calc) =>
    selectedComparisons.includes(calc.id)
  );

  // Function to get balancing tank cost from calculation data
  const getBalancingTankCost = (calc) => {
    return calc.balancingTankCost || calc.data?.total_cost_1 || 0;
  };

  // Function to get main pool cost from calculation data
  const getMainPoolCost = (calc) => {
    return calc.mainPoolCost || calc.data?.total_cost || 0;
  };

  // Function to get MEP cost from calculation data
  const getMepCost = (calc) => {
    return calc.mepCost || calc.data?.mep_amount || 0;
  };

  // Function to get pipe data from calculation
  const getPipeData = (calc) => {
    return calc.pipeQuantities || {
      total_pipe_length: calc.data?.total_pipe_length || 0,
      equipment_distance: calc.data?.equipment_distance || 4.0,
      total_pipe_amount: 0,
      fittings_amount: 0,
      installation_amount: 0
    };
  };

  // Function to get pool type display name
  const getPoolTypeDisplay = (calc) => {
    return calc.poolType === 'curved' ? 'FreeForm Pool' : 
           calc.poolType === 'skimmer' ? 'Skimmer Pool' :
           calc.poolType === 'overflow' ? 'Overflow Pool' :
           calc.poolType === 'infinity' ? 'Infinity Pool' : 'Swimming Pool';
  };

  // Render summary comparison table
  const renderSummaryComparison = () => (
    <div className="comparison-table">
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Current</th>
            {selected.map((calc) => (
              <th key={calc.id}>
                <div>{formatDate(calc.timestamp)}</div>
                <div className="pool-type-badge">{getPoolTypeDisplay(calc)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="total-row">
            <td><strong>Total Cost</strong></td>
            <td><strong>₹{safeToFixed(currentTotal)}</strong></td>
            {selected.map((calc) => (
              <td key={calc.id}>
                <strong>₹{safeToFixed(calc.totalCost)}</strong>
              </td>
            ))}
          </tr>
          
          <tr>
            <td>Main Pool Cost</td>
            <td>₹{safeToFixed(mainPoolCost)}</td>
            {selected.map((calc) => (
              <td key={calc.id}>
                ₹{safeToFixed(getMainPoolCost(calc))}
              </td>
            ))}
          </tr>
          
          {/* Balancing Tank Cost */}
          <tr>
            <td>Balancing Tank Cost</td>
            <td>{hasBalancingTank ? `₹${safeToFixed(balancingTankCost)}` : "N/A"}</td>
            {selected.map((calc) => (
              <td key={calc.id}>
                {calc.hasBalancingTank ? `₹${safeToFixed(getBalancingTankCost(calc))}` : "N/A"}
              </td>
            ))}
          </tr>
          
          <tr>
            <td>MEP Systems Cost</td>
            <td>₹{safeToFixed(mepCost)}</td>
            {selected.map((calc) => (
              <td key={calc.id}>₹{safeToFixed(getMepCost(calc))}</td>
            ))}
          </tr>

          <tr className="separator">
            <td colSpan={2 + selected.length}><strong>Technical Specifications</strong></td>
          </tr>

          <tr>
            <td>Dimensions</td>
            <td>{formatDimensions(currentData?.dimensions)}</td>
            {selected.map((calc) => (
              <td key={calc.id}>{formatDimensions(calc.dimensions)}</td>
            ))}
          </tr>
          
          <tr>
            <td>Volume (m³)</td>
            <td>{currentData?.volume_m3 ? safeToFixed(currentData.volume_m3) : "N/A"}</td>
            {selected.map((calc) => (
              <td key={calc.id}>
                {calc.data?.volume_m3 ? safeToFixed(calc.data.volume_m3) : "N/A"}
              </td>
            ))}
          </tr>
          
          <tr>
            <td>Surface Area (m²)</td>
            <td>{currentData?.surface_area_m2 ? safeToFixed(currentData.surface_area_m2) : "N/A"}</td>
            {selected.map((calc) => (
              <td key={calc.id}>
                {calc.data?.surface_area_m2 ? safeToFixed(calc.data.surface_area_m2) : "N/A"}
              </td>
            ))}
          </tr>
          
          <tr>
            <td>Flow Rate (m³/hr)</td>
            <td>{currentData?.flowrate_m3_per_hr ? safeToFixed(currentData.flowrate_m3_per_hr) : "N/A"}</td>
            {selected.map((calc) => (
              <td key={calc.id}>
                {calc.data?.flowrate_m3_per_hr ? safeToFixed(calc.data.flowrate_m3_per_hr) : "N/A"}
              </td>
            ))}
          </tr>

          <tr className="separator">
            <td colSpan={2 + selected.length}><strong>Pipe System Details</strong></td>
          </tr>

          <tr>
            <td>Total Pipe Length</td>
            <td>{currentData?.total_pipe_length ? `${safeToFixed(currentData.total_pipe_length)} m` : "N/A"}</td>
            {selected.map((calc) => {
              const pipeData = getPipeData(calc);
              return (
                <td key={calc.id}>
                  {pipeData.total_pipe_length ? `${safeToFixed(pipeData.total_pipe_length)} m` : "N/A"}
                </td>
              );
            })}
          </tr>

          <tr>
            <td>Equipment Distance</td>
            <td>{currentData?.equipment_distance ? `${safeToFixed(currentData.equipment_distance)} m` : "4.00 m"}</td>
            {selected.map((calc) => {
              const pipeData = getPipeData(calc);
              return (
                <td key={calc.id}>
                  {pipeData.equipment_distance ? `${safeToFixed(pipeData.equipment_distance)} m` : "4.00 m"}
                </td>
              );
            })}
          </tr>

          <tr>
            <td>Pipe Fittings Cost</td>
            <td>₹{safeToFixed(getPipeData(currentData).fittings_amount)}</td>
            {selected.map((calc) => {
              const pipeData = getPipeData(calc);
              return (
                <td key={calc.id}>₹{safeToFixed(pipeData.fittings_amount)}</td>
              );
            })}
          </tr>

          <tr>
            <td>Installation Cost</td>
            <td>₹{safeToFixed(getPipeData(currentData).installation_amount)}</td>
            {selected.map((calc) => {
              const pipeData = getPipeData(calc);
              return (
                <td key={calc.id}>₹{safeToFixed(pipeData.installation_amount)}</td>
              );
            })}
          </tr>

          <tr className="separator">
            <td colSpan={2 + selected.length}><strong>System Configuration</strong></td>
          </tr>

          <tr>
            <td>Pool Type</td>
            <td>{getPoolTypeDisplay({poolType: 'curved'})}</td>
            {selected.map((calc) => (
              <td key={calc.id}>{getPoolTypeDisplay(calc)}</td>
            ))}
          </tr>

          <tr>
            <td>Water System</td>
            <td>{hasBalancingTank ? "Gutter System (with Balance Tank)" : "Skimmer System (No Balance Tank)"}</td>
            {selected.map((calc) => (
              <td key={calc.id}>
                {calc.hasBalancingTank ? "Gutter System (with Balance Tank)" : "Skimmer System (No Balance Tank)"}
              </td>
            ))}
          </tr>

          <tr>
            <td>Templates Processed</td>
            <td>{Object.keys(templateDescriptions).length} items</td>
            {selected.map((calc) => (
              <td key={calc.id}>
                {Object.keys(calc.templateDescriptions || {}).length} items
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );

  // Render cost breakdown comparison
  const renderCostBreakdown = () => (
    <div className="cost-breakdown-comparison">
      <div className="cost-bars">
        {/* Current Calculation */}
        <div className="cost-bar-group">
          <h4>Current Calculation</h4>
          <div className="cost-bar">
            <div 
              className="cost-segment main-pool" 
              style={{width: `${(mainPoolCost / currentTotal) * 100}%`}}
              title={`Main Pool: ₹${safeToFixed(mainPoolCost)} (${((mainPoolCost / currentTotal) * 100).toFixed(1)}%)`}
            >
              <span>Main Pool</span>
            </div>
            {hasBalancingTank && (
              <div 
                className="cost-segment balancing-tank" 
                style={{width: `${(balancingTankCost / currentTotal) * 100}%`}}
                title={`Balancing Tank: ₹${safeToFixed(balancingTankCost)} (${((balancingTankCost / currentTotal) * 100).toFixed(1)}%)`}
              >
                <span>Balance Tank</span>
              </div>
            )}
            <div 
              className="cost-segment mep" 
              style={{width: `${(mepCost / currentTotal) * 100}%`}}
              title={`MEP Systems: ₹${safeToFixed(mepCost)} (${((mepCost / currentTotal) * 100).toFixed(1)}%)`}
            >
              <span>MEP Systems</span>
            </div>
          </div>
          <div className="cost-total">Total: ₹{safeToFixed(currentTotal)}</div>
        </div>

        {/* Selected Calculations */}
        {selected.map((calc) => {
          const calcMainPool = getMainPoolCost(calc);
          const calcBalanceTank = getBalancingTankCost(calc);
          const calcMep = getMepCost(calc);
          const calcTotal = calc.totalCost;

          return (
            <div key={calc.id} className="cost-bar-group">
              <h4>{formatDate(calc.timestamp)}</h4>
              <div className="cost-bar">
                <div 
                  className="cost-segment main-pool" 
                  style={{width: `${(calcMainPool / calcTotal) * 100}%`}}
                  title={`Main Pool: ₹${safeToFixed(calcMainPool)} (${((calcMainPool / calcTotal) * 100).toFixed(1)}%)`}
                >
                  <span>Main Pool</span>
                </div>
                {calc.hasBalancingTank && (
                  <div 
                    className="cost-segment balancing-tank" 
                    style={{width: `${(calcBalanceTank / calcTotal) * 100}%`}}
                    title={`Balancing Tank: ₹${safeToFixed(calcBalanceTank)} (${((calcBalanceTank / calcTotal) * 100).toFixed(1)}%)`}
                  >
                    <span>Balance Tank</span>
                  </div>
                )}
                <div 
                  className="cost-segment mep" 
                  style={{width: `${(calcMep / calcTotal) * 100}%`}}
                  title={`MEP Systems: ₹${safeToFixed(calcMep)} (${((calcMep / calcTotal) * 100).toFixed(1)}%)`}
                >
                  <span>MEP Systems</span>
                </div>
              </div>
              <div className="cost-total">Total: ₹{safeToFixed(calcTotal)}</div>
            </div>
          );
        })}
      </div>

      {/* Cost Breakdown Table */}
      <div className="cost-breakdown-table">
        <table>
          <thead>
            <tr>
              <th>Cost Category</th>
              <th>Current</th>
              {selected.map((calc) => (
                <th key={calc.id}>{formatDate(calc.timestamp)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Main Pool</td>
              <td>₹{safeToFixed(mainPoolCost)}</td>
              {selected.map((calc) => (
                <td key={calc.id}>₹{safeToFixed(getMainPoolCost(calc))}</td>
              ))}
            </tr>
            <tr>
              <td>Balancing Tank</td>
              <td>{hasBalancingTank ? `₹${safeToFixed(balancingTankCost)}` : "—"}</td>
              {selected.map((calc) => (
                <td key={calc.id}>{calc.hasBalancingTank ? `₹${safeToFixed(getBalancingTankCost(calc))}` : "—"}</td>
              ))}
            </tr>
            <tr>
              <td>MEP Systems</td>
              <td>₹{safeToFixed(mepCost)}</td>
              {selected.map((calc) => (
                <td key={calc.id}>₹{safeToFixed(getMepCost(calc))}</td>
              ))}
            </tr>
            <tr className="total-row">
              <td><strong>Total</strong></td>
              <td><strong>₹{safeToFixed(currentTotal)}</strong></td>
              {selected.map((calc) => (
                <td key={calc.id}><strong>₹{safeToFixed(calc.totalCost)}</strong></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="comparison-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Compare Calculations</h2>
          <div className="header-actions">
            <span className="selected-count">
              {selected.length} calculation{selected.length !== 1 ? 's' : ''} selected
            </span>
            <button className="close-button" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="comparison-content">
          {/* Current Calculation */}
          <div className="current-calculation">
            <h3>Current Calculation</h3>
            <div className="calculation-card current">
              <div className="card-header">
                <span className="date">Current Calculation</span>
                <span className="total">₹{safeToFixed(currentTotal)}</span>
              </div>
              <div className="card-details">
                <p><strong>Dimensions:</strong> {formatDimensions(currentData?.dimensions)}</p>
                <p><strong>Volume:</strong> {currentData?.volume_m3 ? `${safeToFixed(currentData.volume_m3)} m³` : "N/A"}</p>
                <p><strong>Type:</strong> {hasBalancingTank ? "Gutter System (with Balance Tank)" : "Skimmer System (No Balance Tank)"}</p>
                <p><strong>Pool Type:</strong> FreeForm Pool</p>
              </div>
              <div className="cost-breakdown-mini">
                <span>Main Pool: ₹{safeToFixed(mainPoolCost)}</span>
                {hasBalancingTank && <span>Balance Tank: ₹{safeToFixed(balancingTankCost)}</span>}
                <span>MEP: ₹{safeToFixed(mepCost)}</span>
              </div>
            </div>
          </div>

          {/* Saved Calculations */}
          <div className="saved-calculations">
            <h3>Select Calculations to Compare ({savedCalculations.length} available)</h3>
            {savedCalculations.length === 0 ? (
              <p className="no-data">No saved calculations yet.</p>
            ) : (
              <div className="calculations-list">
                {savedCalculations.map((calc) => (
                  <div
                    key={calc.id}
                    className={`calculation-card ${
                      selectedComparisons.includes(calc.id) ? "selected" : ""
                    }`}
                    onClick={() => toggleComparison(calc.id)}
                  >
                    <div className="card-header">
                      <span className="date">{formatDate(calc.timestamp)}</span>
                      <span className="total">
                        ₹{safeToFixed(calc.totalCost)}
                      </span>
                    </div>
                    <div className="card-details">
                      <p><strong>Dimensions:</strong> {formatDimensions(calc.dimensions)}</p>
                      <p><strong>Volume:</strong> {calc.data?.volume_m3 ? `${safeToFixed(calc.data.volume_m3)} m³` : "N/A"}</p>
                      <p><strong>Type:</strong> {calc.hasBalancingTank ? "Gutter System (with Balance Tank)" : "Skimmer System (No Balance Tank)"}</p>
                      <p><strong>Pool Type:</strong> {getPoolTypeDisplay(calc)}</p>
                    </div>
                    <div className="cost-breakdown-mini">
                      <span>Main Pool: ₹{safeToFixed(getMainPoolCost(calc))}</span>
                      {calc.hasBalancingTank && <span>Balance Tank: ₹{safeToFixed(getBalancingTankCost(calc))}</span>}
                      <span>MEP: ₹{safeToFixed(getMepCost(calc))}</span>
                    </div>
                    <div className="select-indicator">
                      {selectedComparisons.includes(calc.id)
                        ? "✓ Selected"
                        : "Click to compare"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comparison Results */}
          {selected.length > 0 && (
            <div className="comparison-results">
              <div className="results-header">
                <h3>Comparison Results</h3>
                <div className="view-tabs">
                  <button 
                    className={`tab-button ${activeTab === "summary" ? "active" : ""}`}
                    onClick={() => setActiveTab("summary")}
                  >
                    Summary View
                  </button>
                  <button 
                    className={`tab-button ${activeTab === "cost" ? "active" : ""}`}
                    onClick={() => setActiveTab("cost")}
                  >
                    Cost Breakdown
                  </button>
                </div>
              </div>

              {activeTab === "summary" && renderSummaryComparison()}
              {activeTab === "cost" && renderCostBreakdown()}

              {/* Action Buttons */}
              <div className="comparison-actions">
                <button 
                  className="action-button secondary"
                  onClick={() => setSelectedComparisons([])}
                >
                  Clear Selection
                </button>
                <button 
                  className="action-button primary"
                  onClick={() => window.print()}
                >
                  Print Comparison
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComparisonTool;