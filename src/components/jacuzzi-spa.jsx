import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import './skimmer.css';

const API_BASE_URL = "https://pool-costing-api.intelithon.in";

function JacuzziSpa() {
  const [form_6, setForm_6] = useState({
    length: "",
    width: "",
    depth: "",
    diameter: "",
    poolType: "jacuzzi",
    shape: "circular",
    standardSize: "",
    seating_capacity: "",
    ambient_temperature: "20",
    target_temperature: "40",
    usage_type: "residential",
    filter_type: "cartridge",
    dosing_required: false,
    heater_required: true,
    turnover: "1.5",
    pool_type_construction: "in_ground"
  });

  const [showStandardSizes_6, setShowStandardSizes_6] = useState(true);
  const [selectedCategory_6, setSelectedCategory_6] = useState("residential");
  const [loading_6, setLoading_6] = useState(false);
  const [errors_6, setErrors_6] = useState({});
  const [recentDimensions_6, setRecentDimensions_6] = useState([]);
  const [savedResults_6, setSavedResults_6] = useState([]);
  const [features_6, setFeatures_6] = useState([]);
  const [includePumpRoom_6, setIncludePumpRoom_6] = useState(true);
  const [isAuthenticated_6, setIsAuthenticated_6] = useState(false);

  const navigate = useNavigate();

  // Unique key for this component's recent dimensions
  const RECENT_DIMENSIONS_KEY = 'recentJacuzziSpaDimensions';

  useEffect(() => {
    checkAuthentication_6();
    loadStoredData_6();
    
    const handleStorageUpdate = () => {
      loadSavedResults_6();
    };
    
    window.addEventListener('savedJacuzziResultsUpdated', handleStorageUpdate);
    return () => {
      window.removeEventListener('savedJacuzziResultsUpdated', handleStorageUpdate);
    };
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
    residential: [
      { label: "Small Round (2.1m)", diameter: 2.1, depth: 0.9, type: "jacuzzi", shape: "circular", seating_capacity: 4, area: "3.5 m²" },
      { label: "Medium Round (2.4m)", diameter: 2.4, depth: 1.0, type: "jacuzzi", shape: "circular", seating_capacity: 6, area: "4.5 m²" },
      { label: "Large Round (3.0m)", diameter: 3.0, depth: 1.1, type: "jacuzzi", shape: "circular", seating_capacity: 8, area: "7.1 m²" },
      { label: "Small Oval (1.8×2.4m)", length: 1.8, width: 2.4, depth: 0.9, type: "jacuzzi", shape: "oval", seating_capacity: 5, area: "4.3 m²" },
      { label: "Rectangle (2.4×1.8m)", length: 2.4, width: 1.8, depth: 0.9, type: "jacuzzi", shape: "rectangular", seating_capacity: 4, area: "4.3 m²" },
      { label: "Small Spa (2.4×1.8m)", length: 2.4, width: 1.8, depth: 0.9, type: "spa", shape: "rectangular", seating_capacity: 4, area: "4.3 m²" }
    ],
    premium: [
      { label: "Executive Round (3.6m)", diameter: 3.6, depth: 1.2, type: "jacuzzi", shape: "circular", seating_capacity: 10, area: "10.2 m²" },
      { label: "Executive Oval (2.4×3.6m)", length: 2.4, width: 3.6, depth: 1.2, type: "jacuzzi", shape: "oval", seating_capacity: 12, area: "8.6 m²" },
      { label: "Luxury Square (3.0×3.0m)", length: 3.0, width: 3.0, depth: 1.1, type: "jacuzzi", shape: "square", seating_capacity: 10, area: "9.0 m²" },
      { label: "Luxury Rectangle (3.6×2.4m)", length: 3.6, width: 2.4, depth: 1.1, type: "jacuzzi", shape: "rectangular", seating_capacity: 12, area: "8.6 m²" },
      { label: "Medium Spa (3.0×2.1m)", length: 3.0, width: 2.1, depth: 1.0, type: "spa", shape: "rectangular", seating_capacity: 6, area: "6.3 m²" }
    ],
    commercial: [
      { label: "Commercial Round (3.0m)", diameter: 3.0, depth: 1.2, type: "jacuzzi", shape: "circular", seating_capacity: 10, area: "7.1 m²" },
      { label: "Large Commercial (4.2m)", diameter: 4.2, depth: 1.3, type: "jacuzzi", shape: "circular", seating_capacity: 16, area: "13.9 m²" },
      { label: "Commercial Oval (3.0×4.2m)", length: 3.0, width: 4.2, depth: 1.3, type: "jacuzzi", shape: "oval", seating_capacity: 18, area: "12.6 m²" },
      { label: "Commercial Rectangle (4.8×2.4m)", length: 4.8, width: 2.4, depth: 1.2, type: "jacuzzi", shape: "rectangular", seating_capacity: 20, area: "11.5 m²" },
      { label: "Commercial Spa (4.8×2.4m)", length: 4.8, width: 2.4, depth: 1.2, type: "spa", shape: "rectangular", seating_capacity: 10, area: "11.5 m²" }
    ],
    swim: [
      { label: "Swim Spa Small (4.8×2.4m)", length: 4.8, width: 2.4, depth: 1.4, type: "jacuzzi", shape: "rectangular", seating_capacity: 6, area: "11.5 m²" },
      { label: "Swim Spa Medium (5.4×3.0m)", length: 5.4, width: 3.0, depth: 1.5, type: "jacuzzi", shape: "rectangular", seating_capacity: 8, area: "16.2 m²" },
      { label: "Swim Spa Large (6.0×3.6m)", length: 6.0, width: 3.6, depth: 1.6, type: "jacuzzi", shape: "rectangular", seating_capacity: 10, area: "21.6 m²" }
    ]
  };

  const categoryInfo_6 = {
    residential: { name: "Residential", description: "Perfect for homes and private use", icon: "🏠" },
    premium: { name: "Premium Luxury", description: "High-end features and premium materials", icon: "⭐" },
    commercial: { name: "Commercial", description: "Designed for hotels, spas, and resorts", icon: "🏨" },
    swim: { name: "Swim Spas", description: "Combination of spa relaxation and swimming", icon: "🏊‍♂️" }
  };

  const poolTypeOptions_6 = [
    { value: "jacuzzi", label: "Jacuzzi (Multiple Shapes)", icon: "🌀" },
    { value: "spa", label: "Spa (Rectangular Only)", icon: "💆‍♀️" }
  ];

  const getShapeOptions_6 = (poolType) => {
    if (poolType === "spa") {
      return [{ value: "rectangular", label: "Rectangle", icon: "⬜" }];
    }
    return [
      { value: "circular", label: "Circular", icon: "⭕" },
      { value: "oval", label: "Oval", icon: "🔘" },
      { value: "square", label: "Square", icon: "⬛" },
      { value: "rectangular", label: "Rectangle", icon: "⬜" }
    ];
  };

  const loadStoredData_6 = () => {
    try {
      const savedDimensions = localStorage.getItem(RECENT_DIMENSIONS_KEY);
      if (savedDimensions) {
        const parsed = JSON.parse(savedDimensions);
        setRecentDimensions_6(parsed);
      }
      loadSavedResults_6();
    } catch {
      setRecentDimensions_6([]);
      setSavedResults_6([]);
    }
  };

  const loadSavedResults_6 = () => {
    try {
      const saved = localStorage.getItem('savedJacuzziResults');
      if (saved) setSavedResults_6(JSON.parse(saved));
    } catch {
      setSavedResults_6([]);
    }
  };

  const saveToRecentDimensions_6 = (dimensions) => {
    const newDimension = {
      id: Date.now(),
      ...dimensions,
      pool_type_construction: form_6.pool_type_construction,
      includePumpRoom: includePumpRoom_6,
      turnover: form_6.turnover,
      timestamp: new Date().toLocaleString()
    };
    const updatedDimensions = [
      newDimension,
      ...recentDimensions_6.filter(d => 
        d.poolType !== dimensions.poolType || 
        (d.shape === 'circular' ? d.diameter !== dimensions.diameter : 
         (d.length !== dimensions.length || d.width !== dimensions.width)) ||
        d.turnover !== form_6.turnover ||
        d.pool_type_construction !== form_6.pool_type_construction ||
        d.includePumpRoom !== includePumpRoom_6
      ).slice(0, 4)
    ];
    setRecentDimensions_6(updatedDimensions);
    localStorage.setItem(RECENT_DIMENSIONS_KEY, JSON.stringify(updatedDimensions));
  };

  const validateForm_6 = () => {
    const newErrors = {};
    if (!form_6.turnover || parseFloat(form_6.turnover) <= 0) {
      newErrors.turnover = "Please enter a valid turnover (hours)";
    }
    if (showStandardSizes_6) {
      if (!form_6.standardSize) newErrors.standardSize = "Please select a standard Jacuzzi/Spa size";
    } else {
      if (form_6.shape === "circular") {
        if (!form_6.diameter || form_6.diameter <= 0) newErrors.diameter = "Please enter a valid diameter";
      } else {
        if (!form_6.length || form_6.length <= 0) newErrors.length = "Please enter a valid length";
        if (!form_6.width || form_6.width <= 0) newErrors.width = "Please enter a valid width";
      }
      if (!form_6.depth || form_6.depth <= 0) newErrors.depth = "Please enter a valid depth";
    }
    setErrors_6(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange_6 = (e) => {
    const { name, value, type, checked } = e.target;
    setErrors_6({ ...errors_6, [name]: "" });
    if (name === "standardSize") {
      handleStandardSizeChange_6(value);
    } else if (name === "poolType") {
      const newShape = value === "spa" ? "rectangular" : form_6.shape;
      setForm_6({ ...form_6, [name]: value, shape: newShape, diameter: "", length: "", width: "" });
    } else if (type === "checkbox") {
      setForm_6({ ...form_6, [name]: checked });
    } else {
      setForm_6({ ...form_6, [name]: value });
    }
  };

  const handleStandardSizeChange_6 = (value) => {
    const selected = Object.values(standardSizes_6).flat().find(size => size.label === value);
    if (selected) {
      setForm_6({
        ...form_6,
        standardSize: value,
        diameter: selected.diameter || "",
        length: selected.length || "",
        width: selected.width || "",
        depth: selected.depth || "",
        poolType: selected.type,
        shape: selected.shape,
        seating_capacity: selected.seating_capacity?.toString() || "",
        turnover: form_6.turnover
      });
    } else {
      setForm_6({ ...form_6, standardSize: value });
    }
  };

  const handleSizeCardClick_6 = (size) => {
    handleStandardSizeChange_6(size.label);
  };

  const calculateAndShowResults_6 = async (dimensions) => {
    setLoading_6(true);
    try {
      const headers = getAuthHeaders_6();
      let length, width;
      if (dimensions.shape === "circular") {
        length = parseFloat(dimensions.diameter);
        width = parseFloat(dimensions.diameter);
      } else {
        length = parseFloat(dimensions.length);
        width = parseFloat(dimensions.width);
      }
      const seatingCapacity = dimensions.seating_capacity ? parseInt(dimensions.seating_capacity) : 4;
      const waterJets = seatingCapacity * 4;
      const airJets = seatingCapacity;

      const requestData = {
        length: length,
        width: width,
        depth: parseFloat(dimensions.depth),
        shape: dimensions.shape,
        seating_capacity: seatingCapacity,
        ambient_temperature: parseFloat(dimensions.ambient_temperature || 20),
        target_temperature: parseFloat(dimensions.target_temperature || 40),
        usage_type: dimensions.usage_type || "residential",
        features: features_6 || [],
        water_jets: waterJets,
        air_jets: airJets,
        filter_type: dimensions.filter_type || "cartridge",
        dosing_required: Boolean(dimensions.dosing_required),
        heater_required: dimensions.heater_required !== false,
        construction_type: form_6.pool_type_construction,
        include_pump_room: includePumpRoom_6,
        turnover: parseFloat(form_6.turnover)
      };

      const response = await fetch(`${API_BASE_URL}/jacuzzi/calculate`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestData),
      });
      if (handleAuthError_6(response.status)) return;
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Calculation failed: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      navigate("/jacuzzi-spa-results", { 
        state: { 
          result: data,
          dimensions: { length: requestData.length, width: requestData.width, depth: requestData.depth },
          jacuzziSpecs: {
            shape: requestData.shape,
            seating_capacity: seatingCapacity,
            ambient_temperature: requestData.ambient_temperature,
            target_temperature: requestData.target_temperature,
            usage_type: requestData.usage_type,
            features: requestData.features,
            filter_type: requestData.filter_type,
            dosing_required: requestData.dosing_required,
            heater_required: requestData.heater_required,
            calculated_water_jets: waterJets,
            calculated_air_controllers: airJets,
            construction_type: form_6.pool_type_construction,
            include_pump_room: includePumpRoom_6,
            turnover: form_6.turnover
          }
        } 
      });
      setForm_6({
        length: "", width: "", depth: "", diameter: "", poolType: "jacuzzi", shape: "circular",
        standardSize: "", seating_capacity: "", ambient_temperature: "20", target_temperature: "40",
        usage_type: "residential", filter_type: "cartridge", dosing_required: false,
        heater_required: true, turnover: "1.5", pool_type_construction: form_6.pool_type_construction
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
    setForm_6({
      diameter: dimension.diameter || "", length: dimension.length || "",
      width: dimension.width || "", depth: dimension.depth || "",
      poolType: dimension.poolType || "jacuzzi", shape: dimension.shape || "circular",
      standardSize: "", seating_capacity: dimension.seating_capacity?.toString() || "",
      ambient_temperature: dimension.ambient_temperature?.toString() || "20",
      target_temperature: dimension.target_temperature?.toString() || "40",
      usage_type: dimension.usage_type || "residential", filter_type: dimension.filter_type || "cartridge",
      dosing_required: dimension.dosing_required || false,
      heater_required: dimension.heater_required !== undefined ? dimension.heater_required : true,
      turnover: dimension.turnover || "1.5", pool_type_construction: dimension.pool_type_construction || "in_ground"
    });
    setFeatures_6(dimension.features || []);
    setIncludePumpRoom_6(dimension.includePumpRoom !== undefined ? dimension.includePumpRoom : true);
    setShowStandardSizes_6(false);
    await calculateAndShowResults_6(dimension);
  };

  const clearRecentDimensions_6 = () => {
    setRecentDimensions_6([]);
    localStorage.removeItem(RECENT_DIMENSIONS_KEY);
  };

  const handleSubmit_6 = async (e) => {
    e.preventDefault();
    if (!validateForm_6()) return;
    setLoading_6(true);
    try {
      let dimensions;
      if (showStandardSizes_6) {
        const selected = Object.values(standardSizes_6).flat().find(size => size.label === form_6.standardSize);
        if (!selected) return;
        dimensions = {
          shape: selected.shape, depth: selected.depth, poolType: selected.type,
          seating_capacity: selected.seating_capacity || 4,
          ambient_temperature: 20, target_temperature: 40, usage_type: "residential",
          features: features_6, filter_type: form_6.filter_type || "cartridge",
          dosing_required: form_6.dosing_required || false,
          heater_required: form_6.heater_required !== undefined ? form_6.heater_required : true,
          pool_type_construction: form_6.pool_type_construction,
          includePumpRoom: includePumpRoom_6, turnover: form_6.turnover
        };
        if (selected.shape === "circular") {
          dimensions.diameter = selected.diameter;
        } else {
          dimensions.length = selected.length;
          dimensions.width = selected.width;
        }
      } else {
        dimensions = {
          shape: form_6.shape, depth: parseFloat(form_6.depth),
          poolType: form_6.poolType,
          seating_capacity: form_6.seating_capacity ? parseInt(form_6.seating_capacity) : 4,
          ambient_temperature: parseFloat(form_6.ambient_temperature),
          target_temperature: parseFloat(form_6.target_temperature),
          usage_type: form_6.usage_type, features: features_6,
          filter_type: form_6.filter_type || "cartridge",
          dosing_required: form_6.dosing_required || false,
          heater_required: form_6.heater_required !== undefined ? form_6.heater_required : true,
          pool_type_construction: form_6.pool_type_construction,
          includePumpRoom: includePumpRoom_6, turnover: form_6.turnover
        };
        if (form_6.shape === "circular") {
          dimensions.diameter = parseFloat(form_6.diameter);
        } else {
          dimensions.length = parseFloat(form_6.length);
          dimensions.width = parseFloat(form_6.width);
        }
      }
      saveToRecentDimensions_6(dimensions);
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
    if (saved?.result) {
      navigate("/jacuzzi-spa-results", { 
        state: { result: saved.result, dimensions: saved.dimensions, jacuzziSpecs: saved.jacuzziSpecs || {} } 
      });
    } else {
      alert("Saved result data is missing or corrupted.");
    }
  };

  const handleDeleteSaved_6 = (id) => {
    const updated = savedResults_6.filter(s => s.id !== id);
    setSavedResults_6(updated);
    localStorage.setItem('savedJacuzziResults', JSON.stringify(updated));
  };

  const handleDeleteAllSaved_6 = () => {
    if (!window.confirm("Delete all saved results? This cannot be undone.")) return;
    setSavedResults_6([]);
    localStorage.removeItem('savedJacuzziResults');
  };

  const formatINR_6 = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "";
    try { return Number(num).toLocaleString('en-IN', { maximumFractionDigits: 2 }); } catch { return String(num); }
  };

  const getShapeSymbol_6 = (shape) => {
    const symbols = { circular: "⭕", oval: "🔘", square: "⬛", rectangular: "⬜" };
    return symbols[shape] || "⬜";
  };

  if (!isAuthenticated_6 && window.location.pathname !== "/tenant-login") {
    return (
      <div className="auth-required-container_6">
        <div className="auth-required-card_6">
          <h2>🔐 Authentication Required</h2>
          <p>Please login to access the Jacuzzi/Spa Cost Calculator</p>
          <button onClick={() => navigate("/tenant-login")} className="login-redirect-button_6">Go to Login</button>
        </div>
      </div>
    );
  }

  const currentShapeOptions = getShapeOptions_6(form_6.poolType);

  return (
    <div className="app-wrapper_6">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar_6">
        <div className="sidebar-header_6">
          <h1>Jacuzzi & Spa Size Selection</h1>
          <p>Calculate costs for hot tubs, spas, and Jacuzzis</p>
        </div>

        {/* Pool Type Selection - SAME RADIO DESIGN */}
        <div className="pool-type-selection_6">
          <h3>🏊 Select Construction Pool Type</h3>
          <div className="radio-group_6">
            <label className="radio-label_6">
              <input type="radio" name="pool_type_construction" value="in_ground" checked={form_6.pool_type_construction === "in_ground"} onChange={handleChange_6} />
              <span className="radio-custom_6"></span>
              <span className="radio-text_6"><span className="radio-icon_6">⛰️</span>In-Ground Pool</span>
            </label>
            <label className="radio-label_6">
              <input type="radio" name="pool_type_construction" value="terrace" checked={form_6.pool_type_construction === "terrace"} onChange={handleChange_6} />
              <span className="radio-custom_6"></span>
              <span className="radio-text_6"><span className="radio-icon_6">🏢</span>Terrace Pool</span>
            </label>
          </div>
          <div className="pool-type-info_6">
            {form_6.pool_type_construction === "in_ground"
              ? <p className="info-text_6">Includes excavation, foundation, and complete civil works</p>
              : <p className="info-text_6">Includes structural works only (no excavation)</p>}
          </div>
        </div>

        {/* Pump Room Toggle */}
        <div className="pool-type-selection_6">
          <h3>🏗️ Pump Room</h3>
          <div className="toggle-section_6">
            <label className="toggle-label_6">
              <input type="checkbox" checked={includePumpRoom_6} onChange={(e) => setIncludePumpRoom_6(e.target.checked)} />
              <span className="toggle-text_6"><span className="toggle-icon_6">🏗️</span>Include Pump Room Equipment</span>
            </label>
          </div>
        </div>

        <div className="size-toggle-container-sidebar_6">
          <button onClick={() => setShowStandardSizes_6(true)} className={`size-toggle-button-sidebar_6 ${showStandardSizes_6 ? "active_6" : ""}`}>
            <span className="button-icon_6">📋</span>Standard Size
          </button>
          <button onClick={() => { setShowStandardSizes_6(false); setForm_6(p => ({ ...p, standardSize: "" })); }} className={`size-toggle-button-sidebar_6 ${!showStandardSizes_6 ? "active_6" : ""}`}>
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
                      {dimension.shape === "circular" 
                        ? `⭕ ${dimension.diameter}m × ${dimension.depth}m`
                        : `${getShapeSymbol_6(dimension.shape)} ${dimension.length}×${dimension.width}×${dimension.depth}m`
                      }
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
                    <div className="saved-dim_6"><strong>Type:</strong> {item.jacuzziSpecs?.shape || "Unknown"}</div>
                    <div className="saved-pool-type_6"><strong>Construction:</strong> {item.jacuzziSpecs?.construction_type === "terrace" ? "🏢 Terrace" : "⛰️ In-Ground"}</div>
                    <div className="saved-turnover_6"><strong>Turnover:</strong> {item.jacuzziSpecs?.turnover || "1.5"} hours</div>
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
          <div className="header-eyebrow_6">JACUZZI & SPA ESTIMATOR</div>
          <h2 className="app-title_6">Jacuzzi & Spa Cost Estimator</h2>
          <p className="app-subtitle_6">Calculate your spa installation costs accurately</p>
          <div className="current-pool-type_6">
            <span className={`pool-type-badge_6 ${form_6.pool_type_construction === "terrace" ? "terrace" : "in-ground"}`}>
              {form_6.pool_type_construction === "terrace" ? "🏢 Terrace Pool" : "⛰️ In-Ground Pool"}
            </span>
          </div>
        </div>

        <div className="input-section_6">
          <div className="section-title_6">
            <span className="section-title-dot_6"></span>
            {showStandardSizes_6 ? "Select Standard Jacuzzi/Spa Size" : "Enter Custom Dimensions"}
          </div>

          {/* Turnover Input */}
          <div className="turnover-input-section_6">
            <label htmlFor="turnover" className="input-label_6">
              <span className="label-icon_6">⏱️</span>
              Turnover Time (hours)
            </label>
            <input id="turnover" name="turnover" type="number" step="0.1" min="0.5" max="6" value={form_6.turnover} onChange={handleChange_6} placeholder="Enter turnover time in hours" className={`form-input_6 ${errors_6.turnover ? 'error_6' : ''}`} />
            {errors_6.turnover && <span className="error-message_6">{errors_6.turnover}</span>}
            <div className="input-hint_6">Recommended: 1.5 hours for Jacuzzi/Spa (faster turnover than pools)</div>
          </div>

          {showStandardSizes_6 ? (
            <div className="standard-sizes-container_6">
              <div className="category-tabs_6">
                {Object.entries(categoryInfo_6).map(([key, info]) => (
                  <button key={key} className={`category-tab_6 ${selectedCategory_6 === key ? "active_6" : ""}`} onClick={() => setSelectedCategory_6(key)}>
                    <span className="category-icon_6">{info.icon}</span>{info.name}
                  </button>
                ))}
              </div>

              <div className="category-description_6">
                <h4>{categoryInfo_6[selectedCategory_6].name}</h4>
                <p>{categoryInfo_6[selectedCategory_6].description}</p>
              </div>

              <div className="sizes-grid_6">
                {standardSizes_6[selectedCategory_6].map((size, idx) => (
                  <div key={idx} className={`size-card_6 ${form_6.standardSize === size.label ? "selected_6" : ""}`} onClick={() => handleSizeCardClick_6(size)}>
                    {form_6.standardSize === size.label && <div className="size-check_6">✓</div>}
                    <div className="size-label_6">{size.label}</div>
                    <div className="size-area_6">👥 {size.seating_capacity} people</div>
                    <div className="size-type_6">{size.type === "spa" ? "Spa" : "Jacuzzi"}</div>
                  </div>
                ))}
              </div>

              {form_6.standardSize && (
                <div className="selected-size-display_6">
                  <span className="selected-check_6">✓</span>
                  <strong>Selected: {form_6.standardSize}</strong>
                </div>
              )}
            </div>
          ) : (
            <div className="custom-inputs_6">
              {/* Pool Type Selection */}
              <div className="pool-type-selection_6" style={{ background: '#DBEAFE', border: '1px solid #B5D0FF' }}>
                <h3 style={{ color: '#1E3A6E' }}>🔷 Pool Type</h3>
                <div className="radio-group_6">
                  {poolTypeOptions_6.map(poolType => (
                    <label key={poolType.value} className="radio-label_6" style={{ border: '1px solid #B5D0FF', background: '#ffffff' }}>
                      <input type="radio" name="poolType" value={poolType.value} checked={form_6.poolType === poolType.value} onChange={handleChange_6} />
                      <span className="radio-custom_6"></span>
                      <span className="radio-text_6" style={{ color: '#0B1D3A' }}>
                        <span className="radio-icon_6">{poolType.icon}</span>
                        {poolType.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Shape Selection */}
              <div className="pool-type-selection_6" style={{ background: '#DBEAFE', border: '1px solid #B5D0FF' }}>
                <h3 style={{ color: '#1E3A6E' }}>📐 Shape</h3>
                <div className="radio-group_6">
                  {currentShapeOptions.map(shape => (
                    <label key={shape.value} className="radio-label_6" style={{ border: '1px solid #B5D0FF', background: '#ffffff' }}>
                      <input type="radio" name="shape" value={shape.value} checked={form_6.shape === shape.value} onChange={handleChange_6} />
                      <span className="radio-custom_6"></span>
                      <span className="radio-text_6" style={{ color: '#0B1D3A' }}>
                        <span className="radio-icon_6">{shape.icon}</span>
                        {shape.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="input-row_6">
                {form_6.shape === "circular" ? (
                  <div className="input-group_6 single-input_6">
                    <label className="input-label_6">Diameter (meters)</label>
                    <input id="diameter" name="diameter" type="number" step="0.1" min="1.5" value={form_6.diameter} onChange={handleChange_6} placeholder="e.g. 2.4" className={`form-input_6 ${errors_6.diameter ? 'error_6' : ''}`} />
                    {errors_6.diameter && <span className="error-message_6">{errors_6.diameter}</span>}
                  </div>
                ) : (
                  <>
                    <div className="input-group_6">
                      <label className="input-label_6">Length (meters)</label>
                      <input id="length" name="length" type="number" step="0.1" min="1.5" value={form_6.length} onChange={handleChange_6} placeholder="e.g. 2.4" className={`form-input_6 ${errors_6.length ? 'error_6' : ''}`} />
                      {errors_6.length && <span className="error-message_6">{errors_6.length}</span>}
                    </div>
                    <div className="input-group_6">
                      <label className="input-label_6">Width (meters)</label>
                      <input id="width" name="width" type="number" step="0.1" min="1.5" value={form_6.width} onChange={handleChange_6} placeholder="e.g. 1.8" className={`form-input_6 ${errors_6.width ? 'error_6' : ''}`} />
                      {errors_6.width && <span className="error-message_6">{errors_6.width}</span>}
                    </div>
                  </>
                )}
              </div>

              <div className="input-group_6 single-input_6">
                <label className="input-label_6">Depth (meters)</label>
                <input id="depth" name="depth" type="number" step="0.1" min="0.7" max="1.5" value={form_6.depth} onChange={handleChange_6} placeholder="e.g. 1.0" className={`form-input_6 ${errors_6.depth ? 'error_6' : ''}`} />
                {errors_6.depth && <span className="error-message_6">{errors_6.depth}</span>}
              </div>

              <div className="input-group_6 single-input_6">
                <label className="input-label_6">👥 Seating Capacity</label>
                <input type="number" name="seating_capacity" min="1" max="20" value={form_6.seating_capacity} onChange={handleChange_6} placeholder="e.g. 4" className={`form-input_6 ${errors_6.seating_capacity ? 'error_6' : ''}`} />
                {errors_6.seating_capacity && <span className="error-message_6">{errors_6.seating_capacity}</span>}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit_6} className="calculation-form_6">
          <button type="submit" className={`submit-button_6 ${loading_6 ? 'loading_6' : ''} ${!isAuthenticated_6 ? 'disabled_6' : ''}`} disabled={loading_6 || !isAuthenticated_6} title={!isAuthenticated_6 ? "Please login to calculate" : ""}>
            {loading_6 ? <><span className="loader_6"></span>Calculating...</> : !isAuthenticated_6 ? <><span className="button-icon_6">🔒</span>Login Required</> : <><span className="button-icon_6">💰</span>Calculate {form_6.poolType === "spa" ? "Spa" : "Jacuzzi"} Cost</>}
          </button>
          {!isAuthenticated_6 && (
            <div className="auth-required-hint_6">
              <p>Please login to access the calculator</p>
              <button type="button" onClick={() => navigate("/tenant-login")} className="login-button_6">Go to Login</button>
            </div>
          )}
        </form>

        <div className="app-footer_6">
          <p>Need help choosing the right Jacuzzi or Spa? Contact our specialists</p>
        </div>
      </main>
    </div>
  );
}

export default JacuzziSpa;