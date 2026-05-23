import React, { useState } from "react";

const SaveProjectModal = ({ open, onClose, resultData, dimensions, projectType }) => {
  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    client_email: "",
    project_name: ""
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ================= SAFE DATA EXTRACTION =================
  
  // Safely extract totals with fallbacks
  const subtotal = (() => {
    if (resultData?.totals?.subtotal) return Number(resultData.totals.subtotal);
    if (resultData?.grand_total) return Number(resultData.grand_total);
    if (resultData?.total_cost) return Number(resultData.total_cost);
    return 0;
  })();

  const gstRate = 0.18;
  const gstAmount = subtotal * gstRate;
  const finalTotal = subtotal + gstAmount;

  // Safely extract working days
  const workingDays = resultData?.working_days || 
                      resultData?.totals?.working_days || 
                      resultData?.system_settings?.working_days || 
                      0;

  // Safely extract pool specifications
  const poolSpecs = resultData?.pool_specification || {};
  const systemSettings = resultData?.system_settings || {};

  // ================= VALIDATION =================

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.client_name.trim()) {
      newErrors.client_name = "Client name is required";
    }
    
    if (!form.project_name.trim()) {
      newErrors.project_name = "Project name is required";
    }
    
    if (form.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.client_email)) {
      newErrors.client_email = "Invalid email format";
    }
    
    if (form.client_phone && !/^[0-9+\-\s()]{10,15}$/.test(form.client_phone)) {
      newErrors.client_phone = "Invalid phone number";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ================= SAVE FUNCTION =================

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const token = localStorage.getItem("tenant_token");
      const tenantId = localStorage.getItem("tenant_id");

      if (!token || !tenantId) {
        alert("Session expired. Please login again.");
        onClose();
        window.location.href = "/tenant-login";
        return;
      }

      setLoading(true);

      // Build comprehensive payload
      const payload = {
        // Client info
        client_name: form.client_name.trim(),
        client_phone: form.client_phone.trim(),
        client_email: form.client_email.trim(),
        project_name: form.project_name.trim(),

        // Project type
        project_type: projectType,
        pool_type: projectType,

        // Dimensions
        length: dimensions?.length || 0,
        width: dimensions?.width || 0,
        depth: dimensions?.depth || 0,

        // Turnover and working days
        turnover: resultData?.turnover || systemSettings?.turnover || 0,
        working_days: workingDays,

        // Pool specifications
        seating_capacity: poolSpecs?.seating_capacity || 0,
        water_jets: poolSpecs?.water_jets || 0,
        air_jets: poolSpecs?.air_jets || 0,
        volume: poolSpecs?.volume || 0,
        flow_rate: poolSpecs?.flow_rate || 0,

        // System settings
        construction_type: systemSettings?.construction_type || "in_ground",
        include_pump_room: systemSettings?.include_pump_room || false,
        pump_room_distance: systemSettings?.pump_room_distance || 15,

        // Cost breakdown
        main_pool_total: resultData?.main_pool_total || 0,
        pump_room_total: resultData?.pump_room_total || 0,
        mep_total: resultData?.mep_total || 0,
        piping_total: resultData?.piping_total || 0,
        
        // GST and final totals
        subtotal: subtotal,
        gst_amount: gstAmount,
        gst_rate: gstRate,
        total_cost: finalTotal,

        // FULL SNAPSHOT for future reference
        result_data: {
          ...resultData,
          client_info: {
            name: form.client_name.trim(),
            phone: form.client_phone.trim(),
            email: form.client_email.trim()
          },
          project_name: form.project_name.trim(),
          saved_at: new Date().toISOString(),
          subtotal: subtotal,
          gst: gstAmount,
          final_total: finalTotal,
          working_days: workingDays
        },

        // Metadata
        saved_at: new Date().toISOString(),
        project_status: "draft"
      };

      console.log("📦 Sending payload to server:", payload);

      const response = await fetch("https://pool-costing-api.intelithon.in/admin/admin/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Tenant-ID": tenantId
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert("✅ Project saved successfully!");
        
        // Reset form
        setForm({
          client_name: "",
          client_phone: "",
          client_email: "",
          project_name: ""
        });
        setErrors({});
        onClose();
      } else {
        console.error("Save failed:", data);
        alert(data.message || "❌ Failed to save project. Please try again.");
      }

    } catch (error) {
      console.error("Error saving project:", error);
      alert("❌ Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSave();
    }
  };

  if (!open) return null;

  // ================= UI =================

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div style={headerStyle}>
          <h3 style={{ margin: 0, color: "#1e3a5f" }}>💾 Save Project</h3>
          <button onClick={onClose} style={closeBtn} disabled={loading}>✕</button>
        </div>

        {/* BODY */}
        <div style={bodyStyle}>
          
          {/* Client Name */}
          <div style={fieldGroupStyle}>
            <input
              type="text"
              placeholder="Client Name *"
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              onKeyPress={handleKeyPress}
              style={{ ...inputStyle, borderColor: errors.client_name ? "#dc3545" : "#ccc" }}
              disabled={loading}
            />
            {errors.client_name && <span style={errorStyle}>{errors.client_name}</span>}
          </div>

          {/* Phone Number */}
          <div style={fieldGroupStyle}>
            <input
              type="tel"
              placeholder="Phone Number"
              value={form.client_phone}
              onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
              onKeyPress={handleKeyPress}
              style={{ ...inputStyle, borderColor: errors.client_phone ? "#dc3545" : "#ccc" }}
              disabled={loading}
            />
            {errors.client_phone && <span style={errorStyle}>{errors.client_phone}</span>}
          </div>

          {/* Email */}
          <div style={fieldGroupStyle}>
            <input
              type="email"
              placeholder="Email Address"
              value={form.client_email}
              onChange={(e) => setForm({ ...form, client_email: e.target.value })}
              onKeyPress={handleKeyPress}
              style={{ ...inputStyle, borderColor: errors.client_email ? "#dc3545" : "#ccc" }}
              disabled={loading}
            />
            {errors.client_email && <span style={errorStyle}>{errors.client_email}</span>}
          </div>

          {/* Project Name */}
          <div style={fieldGroupStyle}>
            <input
              type="text"
              placeholder="Project Name *"
              value={form.project_name}
              onChange={(e) => setForm({ ...form, project_name: e.target.value })}
              onKeyPress={handleKeyPress}
              style={{ ...inputStyle, borderColor: errors.project_name ? "#dc3545" : "#ccc" }}
              disabled={loading}
            />
            {errors.project_name && <span style={errorStyle}>{errors.project_name}</span>}
          </div>

          {/* PROJECT SUMMARY */}
          <div style={summaryStyle}>
            <div style={summaryTitleStyle}>📋 Project Summary</div>
            
            <div style={summaryRowStyle}>
              <span style={summaryLabelStyle}>Project Type:</span>
              <span style={summaryValueStyle}>{projectType === "jacuzzi" ? "🛁 Jacuzzi/Spa" : "🏊 Pool"}</span>
            </div>

            <div style={summaryRowStyle}>
              <span style={summaryLabelStyle}>Dimensions:</span>
              <span style={summaryValueStyle}>
                {dimensions?.length || 0}m × {dimensions?.width || 0}m × {dimensions?.depth || 0}m
              </span>
            </div>

            {poolSpecs?.seating_capacity > 0 && (
              <div style={summaryRowStyle}>
                <span style={summaryLabelStyle}>Seating Capacity:</span>
                <span style={summaryValueStyle}>{poolSpecs.seating_capacity} persons</span>
              </div>
            )}

            {poolSpecs?.water_jets > 0 && (
              <div style={summaryRowStyle}>
                <span style={summaryLabelStyle}>Water Jets:</span>
                <span style={summaryValueStyle}>{poolSpecs.water_jets} jets</span>
              </div>
            )}

            {systemSettings?.construction_type && (
              <div style={summaryRowStyle}>
                <span style={summaryLabelStyle}>Construction:</span>
                <span style={summaryValueStyle}>
                  {systemSettings.construction_type === "terrace" ? "🏢 Terrace" : "⛰️ In-Ground"}
                </span>
              </div>
            )}

            {systemSettings?.pump_room_distance > 0 && (
              <div style={summaryRowStyle}>
                <span style={summaryLabelStyle}>Pump Room Distance:</span>
                <span style={summaryValueStyle}>{systemSettings.pump_room_distance}m</span>
              </div>
            )}

            <div style={summaryDividerStyle} />

            <div style={summaryRowStyle}>
              <span style={summaryLabelStyle}>Subtotal:</span>
              <span style={summaryValueStyle}>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            <div style={summaryRowStyle}>
              <span style={summaryLabelStyle}>GST (18%):</span>
              <span style={summaryValueStyle}>₹{gstAmount.toLocaleString('en-IN')}</span>
            </div>

            <div style={summaryTotalStyle}>
              <span style={summaryTotalLabelStyle}>Total Amount:</span>
              <span style={summaryTotalValueStyle}>₹{finalTotal.toLocaleString('en-IN')}</span>
            </div>

            {workingDays > 0 && (
              <div style={summaryRowStyle}>
                <span style={summaryLabelStyle}>Estimated Working Days:</span>
                <span style={summaryValueStyle}>{workingDays} days</span>
              </div>
            )}
          </div>

          {/* Note */}
          <div style={noteStyle}>
            <span style={noteIconStyle}>ℹ️</span>
            <span style={noteTextStyle}>
              Fields marked with * are required. All data will be saved securely.
            </span>
          </div>
        </div>

        {/* FOOTER */}
        <div style={footerStyle}>
          <button 
            onClick={onClose} 
            style={cancelBtn} 
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = "#bbb";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = "#ccc";
            }}
          >
            Cancel
          </button>

          <button 
            onClick={handleSave} 
            style={saveBtn} 
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = "#218838";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = "#28a745";
            }}
          >
            {loading ? (
              <>
                <span style={spinnerStyle}></span>
                Saving...
              </>
            ) : (
              "💾 Save Project"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ================= STYLES =================

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(3px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999999
};

const modalStyle = {
  width: "480px",
  maxWidth: "90vw",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#ffffff",
  borderRadius: "12px",
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
  display: "flex",
  flexDirection: "column",
  animation: "slideIn 0.3s ease-out"
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "20px 24px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: "12px 12px 0 0"
};

const bodyStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "24px"
};

const footerStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  padding: "16px 24px",
  borderTop: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: "0 0 12px 12px"
};

const fieldGroupStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "4px"
};

const inputStyle = {
  padding: "12px 14px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  transition: "all 0.2s ease",
  outline: "none",
  fontFamily: "inherit"
};

const errorStyle = {
  color: "#dc3545",
  fontSize: "12px",
  marginTop: "2px"
};

const summaryStyle = {
  marginTop: "8px",
  padding: "16px",
  background: "#f8fafc",
  borderRadius: "10px",
  border: "1px solid #e5e7eb"
};

const summaryTitleStyle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#1e3a5f",
  marginBottom: "12px",
  paddingBottom: "8px",
  borderBottom: "1px solid #e5e7eb"
};

const summaryRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
  fontSize: "13px"
};

const summaryLabelStyle = {
  color: "#6b7280",
  fontWeight: "500"
};

const summaryValueStyle = {
  color: "#1f2937",
  fontWeight: "500"
};

const summaryDividerStyle = {
  height: "1px",
  background: "#e5e7eb",
  margin: "12px 0"
};

const summaryTotalStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "12px",
  paddingTop: "12px",
  borderTop: "2px solid #e5e7eb"
};

const summaryTotalLabelStyle = {
  fontWeight: "700",
  fontSize: "14px",
  color: "#1e3a5f"
};

const summaryTotalValueStyle = {
  fontWeight: "700",
  fontSize: "16px",
  color: "#28a745"
};

const noteStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 12px",
  background: "#fff3cd",
  borderRadius: "8px",
  border: "1px solid #ffc107",
  fontSize: "12px"
};

const noteIconStyle = {
  fontSize: "14px"
};

const noteTextStyle = {
  color: "#856404",
  lineHeight: "1.4"
};

const saveBtn = {
  background: "#28a745",
  color: "#ffffff",
  border: "none",
  padding: "10px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "600",
  transition: "all 0.2s ease",
  display: "flex",
  alignItems: "center",
  gap: "8px"
};

const cancelBtn = {
  background: "#e5e7eb",
  color: "#374151",
  border: "none",
  padding: "10px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
  transition: "all 0.2s ease"
};

const closeBtn = {
  background: "transparent",
  border: "none",
  fontSize: "20px",
  cursor: "pointer",
  color: "#6b7280",
  padding: "4px 8px",
  borderRadius: "6px",
  transition: "all 0.2s ease"
};

const spinnerStyle = {
  display: "inline-block",
  width: "14px",
  height: "14px",
  border: "2px solid #ffffff",
  borderTop: "2px solid transparent",
  borderRadius: "50%",
  animation: "spin 0.6s linear infinite"
};

// Add animation styles to document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    input:focus {
      border-color: #28a745;
      box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
    }
    
    button:active {
      transform: scale(0.98);
    }
  `;
  document.head.appendChild(styleSheet);
}

export default SaveProjectModal;