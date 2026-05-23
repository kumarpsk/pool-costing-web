import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import './skimmer.css';

const API_BASE_URL = "https://pool-costing-api.intelithon.in";

// Tenant Authentication Helper Function
function getTenantAuthHeaders_6() {
  const token = localStorage.getItem("tenant_token");
  const tenantId = localStorage.getItem("tenant_id");

  if (!token || !tenantId) {
    console.error("Missing authentication credentials");
    return null;
  }

  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "X-Tenant-ID": tenantId
  };
}

function WaterBody() {
  const [form_6, setForm_6] = useState({
    length: "",
    width: "",
    depth: "",
    shape: "rectangular",
    standardSize: "",
    nozzle_type: "",
    turnover: "4.0"
  });

  const [showStandardSizes_6, setShowStandardSizes_6] = useState(true);
  const [selectedCategory_6, setSelectedCategory_6] = useState("decorative");
  const [loading_6, setLoading_6] = useState(false);
  const [errors_6, setErrors_6] = useState({});
  const [recentDimensions_6, setRecentDimensions_6] = useState([]);
  const [savedResults_6, setSavedResults_6] = useState([]);
  const [constructionType_6, setConstructionType_6] = useState("in-ground");
  const [includePumpRoom_6, setIncludePumpRoom_6] = useState(true);
  const [filtration_6, setFiltration_6] = useState("standard");
  const [circulation_6, setCirculation_6] = useState("standard");
  const [hasWaterfall_6, setHasWaterfall_6] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("tenant_token");
    const tenantId = localStorage.getItem("tenant_id");
    
    if (!token || !tenantId) {
      console.warn("⚠️ No authentication found. Please login first.");
    }
  }, [navigate]);

  const constructionTypeOptions_6 = [
    { value: "in-ground", label: "In-Ground", icon: "🏞️", description: "Full excavation and foundation work" },
    { value: "terrace", label: "Terrace", icon: "🏢", description: "Above-ground structural construction" }
  ];

  const nozzleTypeOptions_6 = [
    { value: "", label: "Select Nozzle Type", description: "Choose a water feature nozzle" },
    { value: "cascade", label: "Cascade / Blade Waterfall Nozzle", icon: "💧", description: "Creates a smooth, sheet-like waterfall effect" },
    { value: "jet", label: "Jet Nozzle (Geyser)", icon: "⛲", description: "Produces powerful vertical water jets" },
    { value: "foam", label: "Foam Jet / Bubbler", icon: "🫧", description: "Creates foaming, bubbling water effects" },
    { value: "aerator", label: "Aerator Nozzle", icon: "🌀", description: "Increases oxygen levels with fine bubbles" },
    { value: "fan", label: "Fan Nozzle", icon: "🌬️", description: "Produces wide, fan-shaped water patterns" },
    { value: "bell", label: "Bell Nozzle", icon: "🔔", description: "Creates dome-shaped water formations" },
    { value: "spray", label: "Spray Nozzle (Mist)", icon: "🌫️", description: "Produces fine mist for atmospheric effects" }
  ];

  const filtrationOptions_6 = [
    { value: "standard", label: "Standard Filtration", icon: "🔍", description: "Basic filtration for clean water" },
    { value: "enhanced", label: "Enhanced Filtration", icon: "🌟", description: "Advanced filtration for crystal clear water" },
    { value: "none", label: "No Filtration", icon: "❌", description: "Natural pond without mechanical filtration" }
  ];

  const circulationOptions_6 = [
    { value: "standard", label: "Standard Circulation", icon: "🌀", description: "Basic water circulation" },
    { value: "enhanced", label: "Enhanced Circulation", icon: "💨", description: "Stronger circulation for better water movement" },
    { value: "none", label: "No Circulation", icon: "❌", description: "Static water body" }
  ];

  const standardSizes_6 = {
    decorative: [
      { label: "Small Garden Pond (3.0×2.0×0.6m)", length: 3.0, width: 2.0, depth: 0.6, volume: "3.6 m³", type: "Decorative", shape: "oval" },
      { label: "Medium Garden Pond (4.5×3.0×0.8m)", length: 4.5, width: 3.0, depth: 0.8, volume: "10.8 m³", type: "Decorative", shape: "irregular" },
      { label: "Large Garden Pond (6.0×4.0×1.0m)", length: 6.0, width: 4.0, depth: 1.0, volume: "24 m³", type: "Decorative", shape: "natural" },
      { label: "Koi Pond Small (3.0×2.5×1.2m)", length: 3.0, width: 2.5, depth: 1.2, volume: "9 m³", type: "Koi Pond", shape: "rectangular" },
      { label: "Koi Pond Medium (4.0×3.0×1.5m)", length: 4.0, width: 3.0, depth: 1.5, volume: "18 m³", type: "Koi Pond", shape: "rectangular" },
      { label: "Reflection Pool (8.0×2.0×0.4m)", length: 8.0, width: 2.0, depth: 0.4, volume: "6.4 m³", type: "Reflection", shape: "rectangular" }
    ],
    recreational: [
      { label: "Small Swimming Pond (8.0×4.0×1.8m)", length: 8.0, width: 4.0, depth: 1.8, volume: "57.6 m³", type: "Swimming Pond", shape: "rectangular" },
      { label: "Medium Swimming Pond (10.0×5.0×2.0m)", length: 10.0, width: 5.0, depth: 2.0, volume: "100 m³", type: "Swimming Pond", shape: "rectangular" },
      { label: "Large Swimming Pond (12.0×6.0×2.2m)", length: 12.0, width: 6.0, depth: 2.2, volume: "158.4 m³", type: "Swimming Pond", shape: "natural" },
      { label: "Family Pond (6.0×4.0×1.5m)", length: 6.0, width: 4.0, depth: 1.5, volume: "36 m³", type: "Recreational", shape: "oval" },
      { label: "Therapeutic Pond (5.0×3.0×1.2m)", length: 5.0, width: 3.0, depth: 1.2, volume: "18 m³", type: "Therapeutic", shape: "irregular" }
    ],
    commercial: [
      { label: "Hotel Water Feature (15.0×8.0×1.2m)", length: 15.0, width: 8.0, depth: 1.2, volume: "144 m³", type: "Commercial", shape: "freeform" },
      { label: "Park Pond Small (20.0×10.0×1.5m)", length: 20.0, width: 10.0, depth: 1.5, volume: "300 m³", type: "Public Park", shape: "natural" },
      { label: "Park Pond Large (30.0×15.0×2.0m)", length: 30.0, width: 15.0, depth: 2.0, volume: "900 m³", type: "Public Park", shape: "natural" },
      { label: "Corporate Water Feature (12.0×6.0×0.8m)", length: 12.0, width: 6.0, depth: 0.8, volume: "57.6 m³", type: "Corporate", shape: "geometric" },
      { label: "Shopping Center Pond (25.0×8.0×1.0m)", length: 25.0, width: 8.0, depth: 1.0, volume: "200 m³", type: "Commercial", shape: "rectangular" }
    ],
    natural: [
      { label: "Natural Pond Small (8.0×6.0×1.5m)", length: 8.0, width: 6.0, depth: 1.5, volume: "72 m³", type: "Natural", shape: "natural" },
      { label: "Natural Pond Medium (15.0×10.0×2.0m)", length: 15.0, width: 10.0, depth: 2.0, volume: "300 m³", type: "Natural", shape: "natural" },
      { label: "Natural Pond Large (25.0×15.0×2.5m)", length: 25.0, width: 15.0, depth: 2.5, volume: "937.5 m³", type: "Natural", shape: "natural" },
      { label: "Wildlife Pond (6.0×4.0×1.0m)", length: 6.0, width: 4.0, depth: 1.0, volume: "24 m³", type: "Wildlife", shape: "irregular" },
      { label: "Biodiversity Pond (10.0×8.0×1.2m)", length: 10.0, width: 8.0, depth: 1.2, volume: "96 m³", type: "Biodiversity", shape: "natural" }
    ]
  };

  const categoryInfo_6 = {
    decorative: { name: "Decorative", description: "Beautiful water features for gardens and landscapes", icon: "🌿" },
    recreational: { name: "Recreational", description: "Ponds for swimming, therapy, and family enjoyment", icon: "🏊‍♀️" },
    commercial: { name: "Commercial", description: "Large water features for hotels, parks, and public spaces", icon: "🏢" },
    natural: { name: "Natural & Wildlife", description: "Eco-friendly ponds supporting biodiversity", icon: "🦆" }
  };

  const shapeOptions_6 = [
    { value: "rectangular", label: "Rectangular", icon: "⬜", description: "Standard rectangular shape" },
    { value: "circular", label: "Circular", icon: "⭕", description: "Perfect circular shape" },
    { value: "oval", label: "Oval", icon: "🔘", description: "Elliptical or oval shape" },
    { value: "square", label: "Square", icon: "🔲", description: "Perfect square shape" },
    { value: "natural", label: "Natural", icon: "🌿", description: "Freeform natural shape" },
    { value: "irregular", label: "Irregular", icon: "🌀", description: "Custom irregular shape" }
  ];

  const shapeSymbols_6 = {
    rectangular: "⬜",
    circular: "⭕",
    oval: "🔘",
    square: "🔲",
    natural: "🌿",
    irregular: "🌀",
    freeform: "🎨"
  };

  useEffect(() => {
    const savedDimensions = localStorage.getItem('recentWaterBodyDimensions');
    if (savedDimensions) {
      try {
        const parsed = JSON.parse(savedDimensions);
        const dimensionsWithTurnover = parsed.map(dim => ({
          ...dim,
          turnover: dim.turnover || "4.0"
        }));
        setRecentDimensions_6(dimensionsWithTurnover);
      } catch {
        setRecentDimensions_6([]);
      }
    }

    const saved = localStorage.getItem('savedWaterBodyResults');
    if (saved) {
      try {
        setSavedResults_6(JSON.parse(saved));
      } catch {
        setSavedResults_6([]);
      }
    }

    const onSaved = () => {
      const fresh = localStorage.getItem('savedWaterBodyResults');
      if (fresh) {
        try {
          setSavedResults_6(JSON.parse(fresh));
        } catch {
          setSavedResults_6([]);
        }
      }
    };
    
    window.addEventListener('savedWaterBodyResultsUpdated', onSaved);
    return () => {
      window.removeEventListener('savedWaterBodyResultsUpdated', onSaved);
    };
  }, []);

  const saveToRecentDimensions_6 = (dimensions) => {
    const newDimension = {
      id: Date.now(),
      ...dimensions,
      constructionType: constructionType_6,
      includePumpRoom: includePumpRoom_6,
      filtration: filtration_6,
      circulation: circulation_6,
      hasWaterfall: hasWaterfall_6,
      turnover: form_6.turnover,
      timestamp: new Date().toLocaleString()
    };
    
    const updatedDimensions = [
      newDimension,
      ...recentDimensions_6.filter(d => 
        d.length !== dimensions.length || 
        d.width !== dimensions.width || 
        d.depth !== dimensions.depth ||
        d.turnover !== form_6.turnover
      ).slice(0, 4)
    ];
    
    setRecentDimensions_6(updatedDimensions);
    localStorage.setItem('recentWaterBodyDimensions', JSON.stringify(updatedDimensions));
  };

  const validateForm_6 = () => {
    const newErrors = {};
    
    if (!form_6.turnover || parseFloat(form_6.turnover) <= 0) {
      newErrors.turnover = "Please enter a valid turnover (hours)";
    } else if (parseFloat(form_6.turnover) > 24) {
      newErrors.turnover = "Turnover should not exceed 24 hours for water bodies";
    } else if (parseFloat(form_6.turnover) < 1) {
      newErrors.turnover = "Turnover should be at least 1 hour";
    }
    
    if (showStandardSizes_6) {
      if (!form_6.standardSize) {
        newErrors.standardSize = "Please select a standard water body size";
      }
    } else {
      if (!form_6.length || form_6.length <= 0) newErrors.length = "Please enter a valid length";
      if (!form_6.width || form_6.width <= 0) newErrors.width = "Please enter a valid width";
      if (!form_6.depth || form_6.depth <= 0) newErrors.depth = "Please enter a valid depth";
    }
    
    setErrors_6(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange_6 = (e) => {
    const { name, value, type, checked } = e.target;
    setErrors_6({...errors_6, [name]: ""});

    if (name === "standardSize") {
      const selected = Object.values(standardSizes_6)
        .flat()
        .find(size => size.label === value);
      if (selected) {
        setForm_6({
          ...form_6,
          standardSize: value,
          length: selected.length,
          width: selected.width,
          depth: selected.depth,
          shape: selected.shape,
          turnover: form_6.turnover
        });
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
    setForm_6({
      ...form_6,
      standardSize: size.label,
      length: size.length,
      width: size.width,
      depth: size.depth,
      shape: size.shape,
      turnover: form_6.turnover
    });
  };

  const handleConstructionTypeChange_6 = (type) => {
    setConstructionType_6(type);
  };

  const handleWaterfallToggle_6 = () => {
    setHasWaterfall_6(!hasWaterfall_6);
  };

  const calculateAndShowResults_6 = async (dimensions) => {
    setLoading_6(true);

    try {
      const headers = getTenantAuthHeaders_6();
      if (!headers) {
        alert("Authentication required. Please login again.");
        navigate("/tenant-login");
        return;
      }

      const requestData = {
        length: parseFloat(dimensions.length),
        width: parseFloat(dimensions.width),
        depth: parseFloat(dimensions.depth),
        shape: dimensions.shape || "rectangular",
        construction_type: constructionType_6,
        include_pump_room: includePumpRoom_6,
        filtration: filtration_6,
        circulation: circulation_6,
        hasWaterfall: hasWaterfall_6,
        turnover: parseFloat(form_6.turnover)
      };

      console.log("📤 Sending Water Body calculation request:", requestData);
      console.log("🔐 Headers:", headers);

      const response = await fetch(`${API_BASE_URL}/waterbody/calculate`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestData),
      });

      if (response.status === 401 || response.status === 403) {
        alert("Session expired. Please login again.");
        localStorage.removeItem("tenant_token");
        localStorage.removeItem("tenant_id");
        navigate("/tenant-login");
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Backend error:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("✅ Water Body calculation response:", data);

      navigate("/waterbodyresults", { 
        state: { 
          result: data,
          dimensions: dimensions,
          waterBodySpecs: {
            shape: dimensions.shape,
            construction_type: constructionType_6,
            include_pump_room: includePumpRoom_6,
            filtration: filtration_6,
            circulation: circulation_6,
            hasWaterfall: hasWaterfall_6,
            turnover: parseFloat(form_6.turnover)
          },
          construction_type: constructionType_6,
          turnover: parseFloat(form_6.turnover)
        } 
      });

      setForm_6({
        length: "",
        width: "",
        depth: "",
        shape: "rectangular",
        standardSize: "",
        nozzle_type: form_6.nozzle_type,
        turnover: form_6.turnover
      });
    } catch (error) {
      console.error("❌ Error calculating water body:", error);
      alert(`Calculation failed: ${error.message}`);
    } finally {
      setLoading_6(false);
    }
  };

  const handleRecentDimensionClick_6 = async (dimension) => {
    setForm_6({
      length: dimension.length,
      width: dimension.width,
      depth: dimension.depth,
      shape: dimension.shape || "rectangular",
      standardSize: "",
      nozzle_type: form_6.nozzle_type,
      turnover: dimension.turnover || "4.0"
    });
    
    setConstructionType_6(dimension.constructionType || "in-ground");
    setIncludePumpRoom_6(dimension.includePumpRoom !== undefined ? dimension.includePumpRoom : true);
    setFiltration_6(dimension.filtration || "standard");
    setCirculation_6(dimension.circulation || "standard");
    setHasWaterfall_6(dimension.hasWaterfall || false);
    
    setShowStandardSizes_6(false);
    
    await calculateAndShowResults_6(dimension);
  };

  const clearRecentDimensions_6 = () => {
    setRecentDimensions_6([]);
    localStorage.removeItem('recentWaterBodyDimensions');
  };

  const handleSubmit_6 = async (e) => {
    e.preventDefault();
    
    if (!validateForm_6()) return;
    
    setLoading_6(true);

    try {
      let dimensions;
      
      if (showStandardSizes_6) {
        const selected = Object.values(standardSizes_6)
          .flat()
          .find(size => size.label === form_6.standardSize);
        dimensions = {
          length: selected.length,
          width: selected.width,
          depth: selected.depth,
          shape: selected.shape,
          construction_type: constructionType_6,
          include_pump_room: includePumpRoom_6,
          filtration: filtration_6,
          circulation: circulation_6,
          hasWaterfall: hasWaterfall_6,
          turnover: parseFloat(form_6.turnover)
        };
      } else {
        dimensions = {
          length: parseFloat(form_6.length),
          width: parseFloat(form_6.width),
          depth: parseFloat(form_6.depth),
          shape: form_6.shape,
          construction_type: constructionType_6,
          include_pump_room: includePumpRoom_6,
          filtration: filtration_6,
          circulation: circulation_6,
          hasWaterfall: hasWaterfall_6,
          turnover: parseFloat(form_6.turnover)
        };
      }

      console.log("📐 Water Body Calculation Parameters:");
      console.log("  Dimensions:", dimensions);
      console.log("  Construction Type:", constructionType_6);
      console.log("  Include Pump Room:", includePumpRoom_6);
      console.log("  Filtration:", filtration_6);
      console.log("  Circulation:", circulation_6);
      console.log("  Waterfall:", hasWaterfall_6);
      console.log("  Lighting: STANDARD (always included - SlNo 10 & 11)");
      console.log("  Turnover:", form_6.turnover, "hours");

      saveToRecentDimensions_6(dimensions);
      await calculateAndShowResults_6(dimensions);

    } catch (error) {
      console.error("❌ Error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading_6(false);
    }
  };

  const handleViewSavedDetails_6 = (saved) => {
    if (saved && saved.result) {
      navigate("/waterbodyresults", { state: { result: saved.result } });
    } else {
      alert("Saved result data is missing or corrupted.");
    }
  };

  const handleDeleteSaved_6 = (id) => {
    const updated = savedResults_6.filter(s => s.id !== id);
    setSavedResults_6(updated);
    localStorage.setItem('savedWaterBodyResults', JSON.stringify(updated));
  };

  const handleDeleteAllSaved_6 = () => {
    if (!window.confirm("Delete all saved results? This cannot be undone.")) return;
    setSavedResults_6([]);
    localStorage.removeItem('savedWaterBodyResults');
  };

  const formatINR_6 = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "";
    try {
      return Number(num).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    } catch {
      return String(num);
    }
  };

  const getShapeSymbol_6 = (shape) => {
    return shapeSymbols_6[shape] || "🌊";
  };

  const getNozzleIcon_6 = (nozzleType) => {
    const nozzle = nozzleTypeOptions_6.find(n => n.value === nozzleType);
    return nozzle ? nozzle.icon : "💧";
  };

  const formatRecentDimension_6 = (dimension) => {
    const symbol = getShapeSymbol_6(dimension.shape);
    const constructionTypeIcon = dimension.constructionType === 'terrace' ? '🏢' : '🏞️';
    const pumpRoom = dimension.includePumpRoom ? '🏗️' : '';
    const turnoverInfo = dimension.turnover ? ` ⏱️${dimension.turnover}h` : '';
    
    return `${constructionTypeIcon} ${symbol} ${dimension.length}×${dimension.width}×${dimension.depth}m${pumpRoom}${turnoverInfo}`;
  };

  return (
    <div className="app-wrapper_6">
      <aside className="sidebar_6">
        <div className="sidebar-header_6">
          <h1>Water Body Calculator</h1>
          <p>Calculate civil construction costs for ponds and water features</p>
        </div>
        
        {/* Construction Type Selection */}
        <div className="pool-type-selection_6">
          <h3>🏗️ Construction Type</h3>
          <div className="radio-group_6">
            {constructionTypeOptions_6.map(type => (
              <label 
                key={type.value} 
                className={`radio-label_6 ${constructionType_6 === type.value ? "active_6" : ""}`}
              >
                <input
                  type="radio"
                  name="construction_type"
                  value={type.value}
                  checked={constructionType_6 === type.value}
                  onChange={() => handleConstructionTypeChange_6(type.value)}
                />
                <div className="construction-type-card-sidebar_6">
                  <span className="construction-type-icon_6">{type.icon}</span>
                  <div className="construction-type-info_6">
                    <div className="construction-type-name_6">{type.label}</div>
                    <div className="construction-type-description_6">{type.description}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
        
        {/* Pump Room Option */}
        <div className="pool-type-selection_6">
          <label className="pump-room-option_6">
            <input
              type="checkbox"
              checked={includePumpRoom_6}
              onChange={(e) => setIncludePumpRoom_6(e.target.checked)}
            />
            <span className="pump-room-icon_6">🏗️</span>
            <p style={{color:"white"}}>Include Pump Room Equipment</p>
            <div className="pump-room-description_6" style={{color:"white"}}>
              {constructionType_6 === "terrace" 
                ? "Terrace pump room includes structural support only"  
                : "In-ground pump room includes full excavation and construction"}
            </div>
          </label>
        </div>

        {/* Size Toggle */}
        <div className="size-toggle-container-sidebar_6">
          <button
            onClick={() => setShowStandardSizes_6(true)}
            className={`size-toggle-button-sidebar_6 ${showStandardSizes_6 ? "active_6" : ""}`}
          >
            <span className="button-icon_6">📋</span>
            Standard Size
          </button>
          <button
            onClick={() => {
              setShowStandardSizes_6(false);
              setForm_6(prevForm => ({ ...prevForm, standardSize: "" }));
            }}
            className={`size-toggle-button-sidebar_6 ${!showStandardSizes_6 ? "active_6" : ""}`}
          >
            <span className="button-icon_6">📏</span>
            Custom Size
          </button>
        </div>

        {/* Recent Dimensions */}
        {recentDimensions_6.length > 0 && (
          <div className="recent-dimensions_6">
            <div className="recent-header_6">
              <h3>Recent Dimensions</h3>
              <button 
                onClick={clearRecentDimensions_6}
                className="clear-recent-btn_6"
                title="Clear all recent dimensions"
              >
                🗑️ Clear
              </button>
            </div>
            <div className="recent-list_6">
              {recentDimensions_6.map((dimension) => (
                <div
                  key={dimension.id}
                  className="recent-item_6"
                  onClick={() => handleRecentDimensionClick_6(dimension)}
                >
                  <span className="recent-dimension_6">
                    {formatRecentDimension_6(dimension)}
                  </span>
                  <span className="recent-time_6">{dimension.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved Results */}
        {savedResults_6.length > 0 && (
          <div className="saved-results_6">
            <div className="recent-header_6">
              <h3>Saved Results</h3>
            </div>
            <ul className="saved-list_6">
              {savedResults_6.map((item) => (
                <li key={item.id} className="saved-list-item_6">
                  <div className="saved-result-info_6">
                    <div className="saved-dim_6">
                      <strong>Size:</strong> {item.dimensions}
                    </div>
                    <div className="saved-cost_6">
                      <strong>Total Cost:</strong> ₹{formatINR_6(item.totalCost)}
                    </div>
                    <div className="saved-time_6">
                      <small style={{ color: '#6b7280' }}>{new Date(item.savedAt).toLocaleString()}</small>
                    </div>
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
            <a href="/210805-Facilities-Rules_clean.pdf" className="info-link_6" target="_blank" rel="noopener noreferrer">
              <span className="link-icon_6">📄</span>
              Swimming Pool Facilities Rules
            </a>
            <a href="/swimming pool products.pdf" className="info-link_6" target="_blank" rel="noopener noreferrer">
              <span className="link-icon_6">🔧</span>
              Pool Equipment Catalog
            </a>
            <a href="" className="info-link_6" target="_blank" rel="noopener noreferrer">
              <span className="link-icon_6">🔧</span>
              Pool Equipment Catalog
            </a>
            <a href="/INTELITHON TECHNOLOGIES.pdf" className="info-link_6" target="_blank" rel="noopener noreferrer">
              <span className="link-icon_6">🏢</span>
              About Swimming Pool Leak Detection
            </a>
            <Link to="/heatpump" className="info-link_6">
              <span className="link-icon_6">🌡️</span>
              Heat Pump Calculator
            </Link>
          </div>
        </div>
      </aside>

      <main className="app-container_1_6">
        <div className="app-header_6">
          <h2 className="app-title_6">Water Body Civil Works Calculator</h2>
          <p className="app-subtitle_6">Calculate civil construction costs for ponds, water features, and decorative water bodies</p>
          
          {/* Construction Type Display */}
          <div className="construction-type-display_6">
            <div className={`construction-badge_6 ${constructionType_6}`}>
              <span className="badge-icon_6">
                {constructionType_6 === "terrace" ? "🏢" : "🏞️"}
              </span>
              <span className="badge-text_6">
                {constructionType_6 === "terrace" ? "Terrace Water Body" : "In-Ground Water Body"}
              </span>
            </div>
            {includePumpRoom_6 && (
              <div className="pump-room-badge_6">
                <span className="badge-icon_6">🏗️</span>
                <span className="badge-text_6">Includes Pump Room</span>
              </div>
            )}
            <div className="lighting-standard-badge_6">
              <span className="badge-icon_6">💡</span>
              <span className="badge-text_6">Lighting Included (Standard)</span>
            </div>
          </div>
        </div>
        
        {/* Turnover Input Section */}
        <div className="turnover-input-section_6">
          <div className="input-group_6 turnover-input_6">
            <label htmlFor="turnover" className="input-label_6">
              <span className="label-icon_6">⏱️</span>
              Turnover Time (hours)
            </label>
            <input
              id="turnover"
              name="turnover"
              type="number"
              step="0.5"
              min="1"
              max="24"
              value={form_6.turnover}
              onChange={handleChange_6}
              placeholder="Enter turnover time in hours"
              className={`form-input_6 ${errors_6.turnover ? 'error_6' : ''}`}
            />
            {errors_6.turnover && <span className="error-message_6">{errors_6.turnover}</span>}
            <div className="input-hint_6">
              Recommended: 4 hours for ponds, 2 hours for swimming ponds, 6+ hours for natural ponds
            </div>
          </div>
        </div>

        {/* Nozzle Type Selection */}
        <div className="nozzle-type-section_6">
          <h3 style={{color:"white"}}>Water Feature Nozzle</h3>
          <div className="nozzle-type-select-container_6">
            <select
              name="nozzle_type"
              value={form_6.nozzle_type}
              onChange={handleChange_6}
              className="nozzle-type-select_6"
            >
              {nozzleTypeOptions_6.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
            {form_6.nozzle_type && (
              <div className="nozzle-description_6">
                <span className="nozzle-icon_6">
                  {getNozzleIcon_6(form_6.nozzle_type)}
                </span>
                <div className="nozzle-info_6">
                  <div className="nozzle-name_6">
                    {nozzleTypeOptions_6.find(n => n.value === form_6.nozzle_type)?.label}
                  </div>
                  <div className="nozzle-description-text_6">
                    {nozzleTypeOptions_6.find(n => n.value === form_6.nozzle_type)?.description}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Section */}
        <div className="input-section_6">
          <div className="section-title_6">
            {showStandardSizes_6 ? "Select Standard Water Body" : "Enter Custom Dimensions"}
          </div>
          
          {showStandardSizes_6 ? (
            <div className="standard-sizes-container_6">
              {/* Category Tabs */}
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
                    <div className="size-label_6">{size.label}</div>
                    <div className="size-volume_6">{size.volume}</div>
                    <div className="size-type_6">{size.type}</div>
                    <div className="size-shape_6">
                      <span className="shape-indicator_6">{getShapeSymbol_6(size.shape)}</span>
                      <span className="shape-name_6">{size.shape}</span>
                    </div>
                    <div className="construction-type-indicator_6">
                      {constructionType_6 === 'terrace' ? '🏢 Terrace' : '🏞️ In-Ground'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Size Display */}
              {form_6.standardSize && (
                <div className="selected-size-display_6">
                  <strong>Selected: {form_6.standardSize}</strong>
                  <span className="construction-badge_6">
                    {constructionType_6 === 'terrace' ? '🏢 Terrace Construction' : '🏞️ In-Ground Construction'}
                  </span>
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
                    <option key={idx} value={size.label}>
                      {size.label} - {size.volume} ({size.type})
                    </option>
                  ))}
                </select>
                {errors_6.standardSize && <span className="error-message_6">{errors_6.standardSize}</span>}
              </div>
            </div>
          ) : (
            <>
              <div className="custom-inputs_6">
                {/* Shape Selection */}
                <div className="shape-selection_6">
                  <label className="shape-label_6">Water Body Shape:</label>
                  <div className="shape-options_6">
                    {shapeOptions_6.map(shape => (
                      <label key={shape.value} className="shape-option_6">
                        <input
                          type="radio"
                          name="shape"
                          value={shape.value}
                          checked={form_6.shape === shape.value}
                          onChange={handleChange_6}
                        />
                        <span className="shape-icon_6">{shape.icon}</span>
                        <div className="shape-info_6">
                          <div className="shape-name_6">{shape.label}</div>
                          <div className="shape-description_6">{shape.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Current Shape Display */}
                <div className="current-shape-display_6">
                  <div className="shape-display-info_6">
                    <span className="shape-display-label_6">Selected Shape:</span>
                    <span className="shape-display-value_6">
                      {shapeOptions_6.find(s => s.value === form_6.shape)?.icon} {shapeOptions_6.find(s => s.value === form_6.shape)?.label}
                    </span>
                  </div>
                </div>

                {/* Basic Dimensions */}
                <div className="input-row_6">
                  <div className="input-group_6">
                    <label htmlFor="length" className="input-label_6">Length (meters)</label>
                    <input
                      id="length"
                      name="length"
                      type="number"
                      step="0.1"
                      min="1"
                      value={form_6.length}
                      onChange={handleChange_6}
                      placeholder="Enter length"
                      className={`form-input_6 ${errors_6.length ? 'error_6' : ''}`}
                    />
                    {errors_6.length && <span className="error-message_6">{errors_6.length}</span>}
                  </div>

                  <div className="input-group_6">
                    <label htmlFor="width" className="input-label_6">Width (meters)</label>
                    <input
                      id="width"
                      name="width"
                      type="number"
                      step="0.1"
                      min="1"
                      value={form_6.width}
                      onChange={handleChange_6}
                      placeholder="Enter width"
                      className={`form-input_6 ${errors_6.width ? 'error_6' : ''}`}
                    />
                    {errors_6.width && <span className="error-message_6">{errors_6.width}</span>}
                  </div>

                  <div className="input-group_6">
                    <label htmlFor="depth" className="input-label_6">Depth (meters)</label>
                    <input
                      id="depth"
                      name="depth"
                      type="number"
                      step="0.1"
                      min="0.3"
                      value={form_6.depth}
                      onChange={handleChange_6}
                      placeholder="Enter depth"
                      className={`form-input_6 ${errors_6.depth ? 'error_6' : ''}`}
                    />
                    {errors_6.depth && <span className="error-message_6">{errors_6.depth}</span>}
                  </div>
                </div>

                {/* Construction Summary */}
                <div className="construction-summary_6">
                  <div className="summary-card_6">
                    <div className="summary-icon_6">
                      {constructionType_6 === 'terrace' ? '🏢' : '🏞️'}
                    </div>
                    <div className="summary-content_6">
                      <h4>{constructionType_6 === 'terrace' ? 'Terrace Construction' : 'In-Ground Construction'}</h4>
                      <p>
                        {constructionType_6 === 'terrace' 
                          ? 'Above-ground structural construction without excavation'
                          : 'Full excavation and foundation work with complete civil construction'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit_6} className="calculation-form_6">
          <button 
            type="submit" 
            className={`submit-button_6 ${loading_6 ? 'loading_6' : ''}`} 
            disabled={loading_6}
          >
            {loading_6 ? (
              <>
                <span className="loader_6"></span>
                Calculating...
              </>
            ) : (
              <>
                <span className="button-icon_6">💰</span>
                Calculate Water Body Cost
              </>
            )}
          </button>
        </form>
        
        <div className="app-footer_6">
          <p>Need help with water body construction? Contact our civil engineering specialists</p>
          <p className="footer-note_6">💡 Lighting system (underwater lights & transformer) is a standard MEP item and always included in calculation.</p>
        </div>
      </main>
    </div>
  );
}

export default WaterBody;