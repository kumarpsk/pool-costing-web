import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import './skimmer.css';

const API_BASE_URL = "https://pool-costing-api.intelithon.in";

function InfinityPool() {
  const [form_6, setForm_6] = useState({
    length: "",
    width: "",
    depth: "",
    shallowDepth: "",
    deepDepth: "",
    standardSize: "",
    hasSlope: false,
    pool_type_construction: "in_ground",
    turnover: "4.5"
  });

  const [showStandardSizes_6, setShowStandardSizes_6] = useState(true);
  const [selectedCategory_6, setSelectedCategory_6] = useState("small");
  const [loading_6, setLoading_6] = useState(false);
  const [errors_6, setErrors_6] = useState({});
  const [recentDimensions_6, setRecentDimensions_6] = useState([]);
  const [savedResults_6, setSavedResults_6] = useState([]);
  const [isAuthenticated_6, setIsAuthenticated_6] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    checkAuthentication_6();
  }, []);

  const checkAuthentication_6 = () => {
    const token = localStorage.getItem("tenant_token");
    const tenantId = localStorage.getItem("tenant_id");
    const authenticated = !!(token && token.trim() !== "" && tenantId && tenantId.trim() !== "");
    setIsAuthenticated_6(authenticated);
    return authenticated;
  };

  const getAuthHeaders_6 = () => {
    const token = localStorage.getItem("tenant_token");
    const tenantId = localStorage.getItem("tenant_id");
    if (!token || !tenantId) {
      alert("Session expired. Please login again.");
      localStorage.removeItem("tenant_token");
      localStorage.removeItem("tenant_id");
      setIsAuthenticated_6(false);
      navigate("/tenant-login");
      throw new Error("AUTH_MISSING");
    }
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-Tenant-ID": tenantId
    };
  };

  const handleAuthError_6 = (status) => {
    if (status === 401 || status === 403) {
      localStorage.removeItem("tenant_token");
      localStorage.removeItem("tenant_id");
      setIsAuthenticated_6(false);
      alert("Session expired. Please login again.");
      navigate("/tenant-login");
      return true;
    }
    return false;
  };

  const standardSizes_6 = {
    small: [
      { label: "6 × 3 × 1.2", length: 6, width: 3, depth: 1.2, area: "18 m²", type: "Residential" },
      { label: "6 × 4 × 1.2", length: 6, width: 4, depth: 1.2, area: "24 m²", type: "Residential" },
      { label: "6 × 5 × 1.2", length: 6, width: 5, depth: 1.2, area: "30 m²", type: "Residential" },
      { label: "6 × 6 × 1.2", length: 6, width: 6, depth: 1.2, area: "36 m²", type: "Residential" },
      { label: "8 × 4 × 1.2", length: 8, width: 4, depth: 1.2, area: "32 m²", type: "Residential" },
      { label: "8 × 6 × 1.2", length: 8, width: 6, depth: 1.2, area: "48 m²", type: "Residential" }
    ],
    medium: [
      { label: "10 × 4 × 1.2", length: 10, width: 4, depth: 1.2, area: "40 m²", type: "Family" },
      { label: "10 × 5 × 1.2", length: 10, width: 5, depth: 1.2, area: "50 m²", type: "Family" },
      { label: "10 × 6 × 1.2", length: 10, width: 6, depth: 1.2, area: "60 m²", type: "Family" },
      { label: "12 × 6 × 1.2", length: 12, width: 6, depth: 1.2, area: "72 m²", type: "Family" },
      { label: "12 × 10 × 1.2", length: 12, width: 10, depth: 1.2, area: "120 m²", type: "Family" }
    ],
    large: [
      { label: "12 × 12 × 1.2", length: 12, width: 12, depth: 1.2, area: "144 m²", type: "Luxury" },
      { label: "14 × 6 × 1.2", length: 14, width: 6, depth: 1.2, area: "84 m²", type: "Luxury" },
      { label: "14 × 18 × 1.2", length: 14, width: 18, depth: 1.2, area: "252 m²", type: "Luxury" },
      { label: "15 × 10 × 1.2", length: 15, width: 10, depth: 1.2, area: "150 m²", type: "Luxury" },
      { label: "15 × 21 × 1.2", length: 15, width: 21, depth: 1.2, area: "315 m²", type: "Luxury" }
    ],
    commercial: [
      { label: "18 × 10 × 1.2", length: 18, width: 10, depth: 1.2, area: "180 m²", type: "Commercial" },
      { label: "20 × 12 × 1.2", length: 20, width: 12, depth: 1.2, area: "240 m²", type: "Commercial" },
      { label: "20 × 12.5 × 1.2", length: 20, width: 12.5, depth: 1.2, area: "250 m²", type: "Commercial" },
      { label: "25 × 14 × 1.25", length: 25, width: 14, depth: 1.25, area: "350 m²", type: "Commercial" },
      { label: "25 × 15 × 1.2", length: 25, width: 15, depth: 1.2, area: "375 m²", type: "Commercial" }
    ],
  };

  const categoryInfo_6 = {
    small: { name: "Residential", description: "Perfect for backyard pools and small spaces", icon: "🏠" },
    medium: { name: "Domestic", description: "Ideal for family use and recreation", icon: "👨‍👩‍👧‍👦" },
    large: { name: "Semi-Commercial", description: "Spacious pools for luxury homes", icon: "🏰" },
    commercial: { name: "Commercial", description: "Suitable for hotels and resorts", icon: "🏨" },
  };

  useEffect(() => {
    const savedDimensions = localStorage.getItem('recentPoolDimensions');
    if (savedDimensions) {
      try {
        const parsed = JSON.parse(savedDimensions);
        const dimensionsWithType = parsed.map(dim => ({
          ...dim,
          pool_type_construction: String(dim.pool_type_construction || "in_ground").trim().toLowerCase(),
          turnover: dim.turnover || "4.5"
        }));
        setRecentDimensions_6(dimensionsWithType);
      } catch {
        setRecentDimensions_6([]);
      }
    }
    const saved = localStorage.getItem('savedPoolResults');
    if (saved) {
      try {
        setSavedResults_6(JSON.parse(saved));
      } catch {
        setSavedResults_6([]);
      }
    }
    const onSaved = () => {
      const fresh = localStorage.getItem('savedPoolResults');
      if (fresh) {
        try { setSavedResults_6(JSON.parse(fresh)); } catch { setSavedResults_6([]); }
      }
    };
    window.addEventListener('savedPoolResultsUpdated', onSaved);
    return () => window.removeEventListener('savedPoolResultsUpdated', onSaved);
  }, []);

  const saveToRecentDimensions_6 = (dimensions) => {
    const newDimension = {
      id: Date.now(),
      ...dimensions,
      // ✅ STEP 4: Normalize pool_type_construction when saving
      pool_type_construction: String(form_6.pool_type_construction || "in_ground").trim().toLowerCase(),
      turnover: form_6.turnover,
      timestamp: new Date().toLocaleString()
    };
    const updatedDimensions = [
      newDimension,
      ...recentDimensions_6.filter(d =>
        d.length !== dimensions.length ||
        d.width !== dimensions.width ||
        (d.shallowDepth !== dimensions.shallowDepth) ||
        (d.deepDepth !== dimensions.deepDepth) ||
        String(d.pool_type_construction || "in_ground").trim().toLowerCase() !== String(form_6.pool_type_construction || "in_ground").trim().toLowerCase() ||
        d.turnover !== form_6.turnover
      ).slice(0, 4)
    ];
    setRecentDimensions_6(updatedDimensions);
    localStorage.setItem('recentPoolDimensions', JSON.stringify(updatedDimensions));
  };

  const validateForm_6 = () => {
    const newErrors = {};
    if (!form_6.turnover || parseFloat(form_6.turnover) <= 0) {
      newErrors.turnover = "Please enter a valid turnover (hours)";
    }
    if (showStandardSizes_6) {
      if (!form_6.standardSize) newErrors.standardSize = "Please select a standard pool size";
    } else {
      if (!form_6.length || form_6.length <= 0) newErrors.length = "Please enter a valid length";
      if (!form_6.width || form_6.width <= 0) newErrors.width = "Please enter a valid width";
      if (form_6.hasSlope) {
        if (!form_6.shallowDepth || form_6.shallowDepth <= 0) newErrors.shallowDepth = "Please enter a valid shallow depth";
        if (!form_6.deepDepth || form_6.deepDepth <= 0) newErrors.deepDepth = "Please enter a valid deep depth";
        if (parseFloat(form_6.shallowDepth) >= parseFloat(form_6.deepDepth)) {
          newErrors.deepDepth = "Deep end must be deeper than shallow end";
        }
      } else {
        if (!form_6.depth || form_6.depth <= 0) newErrors.depth = "Please enter a valid depth";
      }
    }
    setErrors_6(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange_6 = (e) => {
    const { name, value, type, checked } = e.target;
    setErrors_6({ ...errors_6, [name]: "" });
    if (name === "standardSize") {
      const selected = Object.values(standardSizes_6).flat().find(size => size.label === value);
      if (selected) {
        setForm_6({ ...form_6, standardSize: value, length: selected.length, width: selected.width, depth: selected.depth, hasSlope: false, turnover: form_6.turnover });
      } else {
        setForm_6({ ...form_6, standardSize: value });
      }
    } else if (type === "checkbox") {
      setForm_6({ ...form_6, [name]: checked });
    } else {
      setForm_6({ ...form_6, [name]: value });
    }
  };

  const handleSizeCardClick_6 = (size) => {
    setForm_6({ ...form_6, standardSize: size.label, length: size.length, width: size.width, depth: size.depth, hasSlope: false, turnover: form_6.turnover });
  };

  const calculateAndShowResults_6 = async (dimensions) => {
    setLoading_6(true);
    try {
      const headers = getAuthHeaders_6();
      
      // ✅ STEP 1: Normalize the pool type before sending to backend
      const normalizedPoolType = String(
        dimensions.pool_type_construction ||
        form_6.pool_type_construction ||
        "in_ground"
      ).trim().toLowerCase();
      
      console.log(`🔧 Infinity Pool - Sending normalized pool type: "${normalizedPoolType}"`);
      
      // ✅ STEP 2: Use normalized value in payload
      const payload = {
        length: dimensions.length,
        width: dimensions.width,
        depth: dimensions.depth,
        pool_type_construction: normalizedPoolType,
        turnover: parseFloat(form_6.turnover)
      };
      
      const response = await fetch(`${API_BASE_URL}/infinity/calculate`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });
      
      if (handleAuthError_6(response.status)) return;
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Calculation failed: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      // ✅ STEP 3: Navigate with normalized pool type
      navigate("/infinityresults", { 
        state: { 
          result: data, 
          dimensions: dimensions, 
          pool_type_construction: normalizedPoolType,
          turnover: form_6.turnover 
        } 
      });
      
      setForm_6({ 
        length: "", width: "", depth: "", 
        shallowDepth: "", deepDepth: "", standardSize: "", 
        hasSlope: false, 
        pool_type_construction: form_6.pool_type_construction, 
        turnover: "4.5" 
      });
    } catch (error) {
      if (error.message !== "AUTH_MISSING" && !error.message.includes("401") && !error.message.includes("403")) {
        alert("Calculation failed. Please try again.");
      }
    } finally {
      setLoading_6(false);
    }
  };

  const handleRecentDimensionClick_6 = async (dimension) => {
    // ✅ Normalize pool type when loading from recent dimensions
    const normalizedPoolType = String(
      dimension.pool_type_construction || "in_ground"
    ).trim().toLowerCase();
    
    setForm_6({ 
      length: dimension.length, 
      width: dimension.width, 
      depth: dimension.depth, 
      shallowDepth: dimension.shallowDepth || "", 
      deepDepth: dimension.deepDepth || "", 
      standardSize: "", 
      hasSlope: dimension.hasSlope || false, 
      pool_type_construction: normalizedPoolType, 
      turnover: dimension.turnover || "4.5" 
    });
    setShowStandardSizes_6(false);
    await calculateAndShowResults_6({ 
      ...dimension, 
      pool_type_construction: normalizedPoolType, 
      turnover: dimension.turnover || "4.5" 
    });
  };

  const clearRecentDimensions_6 = () => {
    setRecentDimensions_6([]);
    localStorage.removeItem('recentPoolDimensions');
  };

  const handleSubmit_6 = async (e) => {
    e.preventDefault();
    if (!validateForm_6()) return;
    setLoading_6(true);
    try {
      let dimensions;
      if (showStandardSizes_6) {
        const selected = Object.values(standardSizes_6).flat().find(size => size.label === form_6.standardSize);
        dimensions = { 
          length: selected.length, 
          width: selected.width, 
          depth: selected.depth, 
          hasSlope: false, 
          pool_type_construction: String(form_6.pool_type_construction || "in_ground").trim().toLowerCase(), 
          turnover: parseFloat(form_6.turnover) 
        };
      } else {
        dimensions = { 
          length: parseFloat(form_6.length), 
          width: parseFloat(form_6.width), 
          hasSlope: form_6.hasSlope, 
          pool_type_construction: String(form_6.pool_type_construction || "in_ground").trim().toLowerCase(), 
          turnover: parseFloat(form_6.turnover) 
        };
        if (form_6.hasSlope) {
          dimensions.shallowDepth = parseFloat(form_6.shallowDepth);
          dimensions.deepDepth = parseFloat(form_6.deepDepth);
          dimensions.depth = (dimensions.shallowDepth + dimensions.deepDepth) / 2;
        } else {
          dimensions.depth = parseFloat(form_6.depth);
          dimensions.shallowDepth = parseFloat(form_6.depth);
          dimensions.deepDepth = parseFloat(form_6.depth);
        }
      }
      saveToRecentDimensions_6({ ...dimensions, pool_type_construction: String(form_6.pool_type_construction || "in_ground").trim().toLowerCase(), turnover: form_6.turnover });
      await calculateAndShowResults_6(dimensions);
    } catch (error) {
      if (error.message !== "AUTH_MISSING" && !error.message.includes("401") && !error.message.includes("403")) {
        alert("Something went wrong! Please try again.");
      }
    } finally {
      setLoading_6(false);
    }
  };

  const handleViewSavedDetails_6 = (saved) => {
    if (saved && saved.result) {
      // ✅ Normalize pool type when viewing saved results
      const normalizedPoolType = String(
        saved.pool_type_construction || "in_ground"
      ).trim().toLowerCase();
      
      navigate("/infinityresults", { 
        state: { 
          result: saved.result, 
          dimensions: saved.dimensions, 
          pool_type_construction: normalizedPoolType, 
          turnover: saved.turnover || "4.5" 
        } 
      });
    } else {
      alert("Saved result data is missing or corrupted.");
    }
  };

  const handleDeleteSaved_6 = (id) => {
    const updated = savedResults_6.filter(s => s.id !== id);
    setSavedResults_6(updated);
    localStorage.setItem('savedPoolResults', JSON.stringify(updated));
  };

  const handleDeleteAllSaved_6 = () => {
    if (!window.confirm("Delete all saved results? This cannot be undone.")) return;
    setSavedResults_6([]);
    localStorage.removeItem('savedPoolResults');
  };

  const formatINR_6 = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "";
    try { return Number(num).toLocaleString('en-IN', { maximumFractionDigits: 2 }); } catch { return String(num); }
  };

  if (!isAuthenticated_6 && window.location.pathname !== "/tenant-login") {
    return (
      <div className="auth-required-container_6">
        <div className="auth-required-card_6">
          <h2>🔐 Authentication Required</h2>
          <p>Please login to access the Infinity Pool Cost Calculator</p>
          <button onClick={() => navigate("/tenant-login")} className="login-redirect-button_6">Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper_6">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar_6">
        <div className="sidebar-header_6">
          <h1>Infinity Pool Size Selection</h1>
          <p>Choose between standard pool sizes or enter custom dimensions</p>
        </div>

        {/* Pool Type Selection - SAME RADIO BUTTON DESIGN AS SKIMMER */}
        <div className="pool-type-selection_6">
          <h3>🏊 Select Construction Pool Type</h3>
          <div className="radio-group_6">
            <label className="radio-label_6">
              <input 
                type="radio" 
                name="pool_type_construction" 
                value="in_ground" 
                checked={form_6.pool_type_construction === "in_ground"} 
                onChange={handleChange_6} 
              />
              <span className="radio-custom_6"></span>
              <span className="radio-text_6">
                <span className="radio-icon_6">⛰️</span>
                In-Ground Pool
              </span>
            </label>
            <label className="radio-label_6">
              <input 
                type="radio" 
                name="pool_type_construction" 
                value="terrace" 
                checked={form_6.pool_type_construction === "terrace"} 
                onChange={handleChange_6} 
              />
              <span className="radio-custom_6"></span>
              <span className="radio-text_6">
                <span className="radio-icon_6">🏢</span>
                Terrace Pool
              </span>
            </label>
          </div>
          <div className="pool-type-info_6">
            {form_6.pool_type_construction === "in_ground"
              ? <p className="info-text_6">Includes excavation, foundation, and complete civil works</p>
              : <p className="info-text_6">Includes structural works only (no excavation)</p>
            }
          </div>
        </div>

        <div className="size-toggle-container-sidebar_6">
          <button 
            onClick={() => setShowStandardSizes_6(true)} 
            className={`size-toggle-button-sidebar_6 ${showStandardSizes_6 ? "active_6" : ""}`}
          >
            <span className="button-icon_6">📋</span>Standard Size
          </button>
          <button 
            onClick={() => { setShowStandardSizes_6(false); setForm_6(p => ({ ...p, standardSize: "" })); }} 
            className={`size-toggle-button-sidebar_6 ${!showStandardSizes_6 ? "active_6" : ""}`}
          >
            <span className="button-icon_6">📏</span>Custom Size
          </button>
        </div>

        {recentDimensions_6.length > 0 && (
          <div className="recent-dimensions_6">
            <div className="recent-header_6">
              <h3>Recent Dimensions</h3>
              <button onClick={clearRecentDimensions_6} className="clear-recent-btn_6" title="Clear all recent dimensions">🗑️ Clear</button>
            </div>
            <div className="recent-list_6">
              {recentDimensions_6.map((dimension) => (
                <div key={dimension.id} className="recent-item_6" onClick={() => handleRecentDimensionClick_6(dimension)}>
                  <div className="recent-dimension-info_6">
                    <span className="recent-dimension_6">
                      {dimension.length} × {dimension.width} × {dimension.hasSlope ? `${dimension.shallowDepth}-${dimension.deepDepth}m` : `${dimension.depth}m`}
                    </span>
                    <span className="recent-pool-type_6">{dimension.pool_type_construction === "terrace" ? "🏢 Terrace" : "⛰️ In-Ground"}</span>
                  </div>
                  <span className="recent-time_6">{dimension.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {savedResults_6.length > 0 && (
          <div className="saved-results_6">
            <div className="recent-header_6"><h3>Saved Results</h3></div>
            <ul className="saved-list_6">
              {savedResults_6.map((item) => (
                <li key={item.id} className="saved-list-item_6">
                  <div className="saved-result-info_6">
                    <div className="saved-dim_6"><strong>Dimensions:</strong> {item.dimensions}</div>
                    <div className="saved-pool-type_6"><strong>Type:</strong> {item.pool_type_construction === "terrace" ? "🏢 Terrace" : "⛰️ In-Ground"}</div>
                    <div className="saved-turnover_6"><strong>Turnover:</strong> {item.turnover || "4.5"} hours</div>
                    <div className="saved-cost_6"><strong>Total Cost:</strong> ₹{formatINR_6(item.totalCost)}</div>
                    <div className="saved-time_6"><small style={{ color: '#6b7280' }}>{new Date(item.savedAt).toLocaleString()}</small></div>
                  </div>
                  <div className="saved-result-actions_6">
                    <button className="view-btn_6" onClick={() => handleViewSavedDetails_6(item)}>👁 View</button>
                    <button className="delete-btn_6" onClick={() => handleDeleteSaved_6(item.id)}>🗑 Delete</button>
                  </div>
                </li>
              ))}
            </ul>
            <button className="delete-all-btn_6" onClick={handleDeleteAllSaved_6}>Delete All Saved Results</button>
          </div>
        )}

        <div className="sidebar-info_6">
          <h3>📚 Pool Resources</h3>
          <div className="info-links_6">
            <a href="/210805-Facilities-Rules_clean.pdf" className="info-link_6" target="_blank" rel="noopener noreferrer"><span className="link-icon_6">📄</span>Swimming Pool Facilities Rules</a>
            <a href="/swimming pool products.pdf" className="info-link_6" target="_blank" rel="noopener noreferrer"><span className="link-icon_6">🔧</span>Pool Equipment Catalog</a>
            <a href="/Expanded Pool Leak Detection Guide.pdf" className="info-link_6" target="_blank" rel="noopener noreferrer"><span className="link-icon_6">🏢</span>About Swimming Pool Leak Detection</a>
            <Link to="/heatpump" className="info-link_6"><span className="link-icon_6">🌡️</span>Heat Pump Calculator</Link>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="app-container_1_6">
        <div className="app-header_6">
          <div className="header-eyebrow_6">POOL CONSTRUCTION ESTIMATOR</div>
          <h2 className="app-title_6">Infinity Pool Cost Estimator</h2>
          <p className="app-subtitle_6">Calculate your pool construction costs accurately</p>
          <div className="current-pool-type_6">
            <span className={`pool-type-badge_6 ${form_6.pool_type_construction === "terrace" ? "terrace" : "in-ground"}`}>
              {form_6.pool_type_construction === "terrace" ? "🏢 Terrace Pool" : "⛰️ In-Ground Pool"}
            </span>
          </div>
        </div>

        <div className="input-section_6">
          <div className="section-title_6">
            <span className="section-title-dot_6"></span>
            {showStandardSizes_6 ? "Select Standard Pool Size" : "Enter Custom Dimensions"}
          </div>

          {/* Turnover Input */}
          <div className="turnover-input-section_6">
            <label htmlFor="turnover" className="input-label_6">
              <span className="label-icon_6">⏱️</span>
              Turnover Time (hours)
            </label>
            <input
              id="turnover"
              name="turnover"
              type="number"
              step="0.1"
              min="0.5"
              max="24"
              value={form_6.turnover}
              onChange={handleChange_6}
              placeholder="Enter turnover time in hours"
              className={`form-input_6 ${errors_6.turnover ? 'error_6' : ''}`}
            />
            {errors_6.turnover && <span className="error-message_6">{errors_6.turnover}</span>}
            <div className="input-hint_6">Recommended: 4.5 hours for residential pools</div>
          </div>

          {showStandardSizes_6 ? (
            <div className="standard-sizes-container_6">
              {/* Category Tabs - ALL 5 CATEGORIES */}
              <div className="category-tabs_6">
                {Object.entries(categoryInfo_6).map(([key, info]) => (
                  <button 
                    key={key} 
                    className={`category-tab_6 ${selectedCategory_6 === key ? "active_6" : ""}`} 
                    onClick={() => setSelectedCategory_6(key)}
                  >
                    <span className="category-icon_6">{info.icon}</span>
                    {info.name}
                  </button>
                ))}
              </div>

              {/* Category Description */}
              <div className="category-description_6">
                <h4>{categoryInfo_6[selectedCategory_6].name}</h4>
                <p>{categoryInfo_6[selectedCategory_6].description}</p>
              </div>

              {/* Size Cards Grid */}
              <div className="sizes-grid_6">
                {standardSizes_6[selectedCategory_6].map((size, idx) => (
                  <div 
                    key={idx} 
                    className={`size-card_6 ${form_6.standardSize === size.label ? "selected_6" : ""}`} 
                    onClick={() => handleSizeCardClick_6(size)}
                  >
                    {form_6.standardSize === size.label && (
                      <div className="size-check_6">✓</div>
                    )}
                    <div className="size-label_6">{size.label}</div>
                    <div className="size-area_6">{size.area}</div>
                    <div className="size-type_6">{size.type}</div>
                  </div>
                ))}
              </div>

              {/* Selected Size Display */}
              {form_6.standardSize && (
                <div className="selected-size-display_6">
                  <span className="selected-check_6">✓</span>
                  <strong>Selected: {form_6.standardSize}</strong>
                </div>
              )}

              {/* Fallback Select for Mobile */}
              <div className="mobile-size-select_6">
                <select 
                  id="standardSize" 
                  name="standardSize" 
                  className={`standard-size-select_6 ${errors_6.standardSize ? 'error_6' : ''}`} 
                  value={form_6.standardSize} 
                  onChange={handleChange_6}
                >
                  <option value="" disabled>Or select from dropdown</option>
                  {Object.values(standardSizes_6).flat().map((size, idx) => (
                    <option key={idx} value={size.label}>{size.label} - {size.area} ({size.type})</option>
                  ))}
                </select>
                {errors_6.standardSize && <span className="error-message_6">{errors_6.standardSize}</span>}
              </div>
            </div>
          ) : (
            <div className="custom-inputs_6">
              <div className="input-row_6">
                <div className="input-group_6">
                  <label className="input-label_6">Length (meters)</label>
                  <input id="length" name="length" type="number" step="0.1" min="1" value={form_6.length} onChange={handleChange_6} placeholder="e.g. 10" className={`form-input_6 ${errors_6.length ? 'error_6' : ''}`} />
                  {errors_6.length && <span className="error-message_6">{errors_6.length}</span>}
                </div>
                <div className="input-group_6">
                  <label className="input-label_6">Width (meters)</label>
                  <input id="width" name="width" type="number" step="0.1" min="1" value={form_6.width} onChange={handleChange_6} placeholder="e.g. 5" className={`form-input_6 ${errors_6.width ? 'error_6' : ''}`} />
                  {errors_6.width && <span className="error-message_6">{errors_6.width}</span>}
                </div>
              </div>

              <div className="slope-toggle_6">
                <label className="toggle-label_6">
                  <input type="checkbox" name="hasSlope" checked={form_6.hasSlope} onChange={handleChange_6} />
                  <span className="toggle-text_6"><span className="toggle-icon_6">↗️</span>Pool has sloped bottom (different shallow/deep ends)</span>
                </label>
              </div>

              {form_6.hasSlope ? (
                <div className="input-row_6">
                  <div className="input-group_6">
                    <label className="input-label_6">Shallow End Depth (m)</label>
                    <input id="shallowDepth" name="shallowDepth" type="number" step="0.1" min="0.5" value={form_6.shallowDepth} onChange={handleChange_6} placeholder="e.g. 1.0" className={`form-input_6 ${errors_6.shallowDepth ? 'error_6' : ''}`} />
                    {errors_6.shallowDepth && <span className="error-message_6">{errors_6.shallowDepth}</span>}
                  </div>
                  <div className="input-group_6">
                    <label className="input-label_6">Deep End Depth (m)</label>
                    <input id="deepDepth" name="deepDepth" type="number" step="0.1" min="0.5" value={form_6.deepDepth} onChange={handleChange_6} placeholder="e.g. 2.0" className={`form-input_6 ${errors_6.deepDepth ? 'error_6' : ''}`} />
                    {errors_6.deepDepth && <span className="error-message_6">{errors_6.deepDepth}</span>}
                  </div>
                </div>
              ) : (
                <div className="input-group_6 single-input_6">
                  <label className="input-label_6">Depth (meters)</label>
                  <input id="depth" name="depth" type="number" step="0.1" min="0.5" value={form_6.depth} onChange={handleChange_6} placeholder="e.g. 1.5" className={`form-input_6 ${errors_6.depth ? 'error_6' : ''}`} />
                  {errors_6.depth && <span className="error-message_6">{errors_6.depth}</span>}
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit_6} className="calculation-form_6">
          <button
            type="submit"
            className={`submit-button_6 ${loading_6 ? 'loading_6' : ''} ${!isAuthenticated_6 ? 'disabled_6' : ''}`}
            disabled={loading_6 || !isAuthenticated_6}
            title={!isAuthenticated_6 ? "Please login to calculate" : ""}
          >
            {loading_6 ? (
              <><span className="loader_6"></span>Calculating...</>
            ) : !isAuthenticated_6 ? (
              <><span className="button-icon_6">🔒</span>Login Required</>
            ) : (
              <><span className="button-icon_6">💰</span>Calculate Cost</>
            )}
          </button>

          {!isAuthenticated_6 && (
            <div className="auth-required-hint_6">
              <p>Please login to access the calculator</p>
              <button type="button" onClick={() => navigate("/tenant-login")} className="login-button_6">Go to Login</button>
            </div>
          )}
        </form>

        <div className="app-footer_6">
          <p>Need help? Contact our support team</p>
        </div>
      </main>
    </div>
  );
}

export default InfinityPool;