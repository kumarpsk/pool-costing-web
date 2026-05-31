import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./admin.css";

const API_BASE_URL = "https://pool-costing-api.intelithon.in"; // Update with your backend URL
const AUTH_TOKEN_KEY = "tenant_admin_token";
const ADMIN_DATA_KEY = "tenant_admin_data";

// Validation utilities
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const validatePassword = (password) => {
  return password.trim().length >= 6;
};

const validateCompanyCode = (companyCode) => {
  return companyCode.trim().length >= 2;
};

// Error message handler
const getErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  
  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }
  
  if (error?.detail) {
    return error.detail;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.error) {
    return error.error;
  }
  
  return "An unexpected error occurred. Please try again.";
};

export default function Admin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    company_code: "", 
    email: "", 
    password: "" 
  });
  const [formErrors, setFormErrors] = useState({
    company_code: "",
    email: "",
    password: ""
  });
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token && token.trim() !== "") {
          navigate("/admindashboard", { replace: true });
        } else {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(ADMIN_DATA_KEY);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(ADMIN_DATA_KEY);
      } finally {
        setIsLoading(false);
        setTimeout(() => setMounted(true), 50);
      }
    };

    checkAuth();
  }, [navigate]);

  // Clear errors when user types
  useEffect(() => {
    if (apiError) setApiError("");
  }, [form.company_code, form.email, form.password]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    
    // Auto-uppercase company code
    const processedValue = name === 'company_code' ? value.toUpperCase() : value;
    
    setForm(prev => ({ ...prev, [name]: processedValue }));
    
    // Clear field-specific error
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  }, [formErrors]);

  const validateForm = useCallback(() => {
    const newErrors = { company_code: "", email: "", password: "" };
    let isValid = true;

    const trimmedCompanyCode = form.company_code.trim();
    const trimmedEmail = form.email.trim();
    const trimmedPassword = form.password.trim();

    // Company Code validation
    if (!trimmedCompanyCode) {
      newErrors.company_code = "Company code is required";
      isValid = false;
    } else if (!validateCompanyCode(trimmedCompanyCode)) {
      newErrors.company_code = "Company code must be at least 2 characters";
      isValid = false;
    }

    // Email validation
    if (!trimmedEmail) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!validateEmail(trimmedEmail)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    // Password validation
    if (!trimmedPassword) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (!validatePassword(trimmedPassword)) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    setFormErrors(newErrors);
    return isValid;
  }, [form.company_code, form.email, form.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedCompanyCode = form.company_code.trim().toUpperCase();
      const trimmedEmail = form.email.trim();
      const trimmedPassword = form.password.trim();

      const response = await fetch(`${API_BASE_URL}/admin/tenant/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          company_code: trimmedCompanyCode,
          email: trimmedEmail,
          password: trimmedPassword
        })
      });

      // Handle HTTP errors
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { 
            detail: `HTTP Error: ${response.status} ${response.statusText}` 
          };
        }
        
        // Clear form on 401 (wrong credentials)
        if (response.status === 401) {
          setForm({ company_code: "", email: "", password: "" });
        }
        
        throw errorData;
      }

      // Parse successful response
      const data = await response.json();
      
      // Validate response structure
      if (!data?.access_token) {
        throw new Error("Invalid response from server: Missing access token");
      }

      if (!data.admin && !data.user) {
        throw new Error("Invalid response from server: Missing admin/user data");
      }

      // Save authentication data
      const adminData = data.admin || data.user;
      const authToken = data.access_token;

      try {
        localStorage.setItem(AUTH_TOKEN_KEY, authToken);
        localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(adminData));
      } catch (storageError) {
        console.error("LocalStorage error:", storageError);
        throw new Error("Unable to save session. Please check browser storage permissions.");
      }

      // Clear form and redirect
      setForm({ company_code: "", email: "", password: "" });
      navigate("/admindashboard", { replace: true });

    } catch (error) {
      console.error("Login error:", error);
      
      // Network errors
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        setApiError("Cannot connect to server. Please check your connection and try again.");
        return;
      }

      // Server errors
      const errorMessage = getErrorMessage(error);
      setApiError(errorMessage);
      
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="admin-login-wrapper">
        <div className="animated-bg">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login-wrapper">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Main Login Container */}
      <div className={`admin-login-container ${mounted ? 'mounted' : ''}`}>
        {/* Left Side - Branding */}
        <div className="admin-login-branding">
          <div className="brand-content">
            <div className="logo-container">
              <div className="logo-icon">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="3" fill="none"/>
                  <path d="M50 25V50L65 65" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="50" cy="50" r="5" fill="currentColor"/>
                </svg>
              </div>
              <h1 className="brand-name">Admin Portal</h1>
            </div>
            <p className="brand-tagline">Manage rates and master tables efficiently</p>
            
            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">⚙️</div>
                <div>
                  <h3>Rate Management</h3>
                  <p>Configure and update rates</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📋</div>
                <div>
                  <h3>Master Tables</h3>
                  <p>Control system configurations</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🔐</div>
                <div>
                  <h3>Secure Access</h3>
                  <p>Admin-level authentication</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="admin-login-form-container">
          <form onSubmit={handleSubmit} className="admin-login-form" noValidate>
            <div className="form-header">
              <h2 className="form-title">Admin Access</h2>
              <p className="form-subtitle">Sign in to manage your tenant</p>
            </div>

            {apiError && (
              <div className="alert alert-error">
                <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
                </svg>
                <span>{apiError}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="company_code" className="form-label">
                <span>Company Code</span>
                <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"/>
                </svg>
              </label>
              <div className="input-wrapper">
                <input
                  id="company_code"
                  type="text"
                  name="company_code"
                  value={form.company_code}
                  onChange={handleChange}
                  placeholder="Enter company code"
                  className="form-input"
                  required
                  autoComplete="organization"
                  disabled={isSubmitting}
                  aria-required="true"
                  aria-invalid={!!formErrors.company_code}
                  aria-describedby={formErrors.company_code ? "company-code-error" : undefined}
                  style={{ textTransform: 'uppercase' , color: '#333' }}
                />
              </div>
              {formErrors.company_code && (
                <span id="company-code-error" className="field-error" role="alert">
                  {formErrors.company_code}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <span>Email Address</span>
                <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
              </label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@company.com"
                  className="form-input"
                  required
                  autoComplete="email"
                  disabled={isSubmitting}
                  aria-required="true"
                  aria-invalid={!!formErrors.email}
                  aria-describedby={formErrors.email ? "email-error" : undefined}
                  style={{color: '#333' }}
                />
              </div>
              {formErrors.email && (
                <span id="email-error" className="field-error" role="alert">
                  {formErrors.email}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <span>Password</span>
                <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"/>
                </svg>
              </label>
              <div className="input-wrapper password-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  style={{color: '#333' }}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="form-input"
                  required
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  aria-required="true"
                  aria-invalid={!!formErrors.password}
                  aria-describedby={formErrors.password ? "password-error" : undefined}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"/>
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"/>
                    </svg>
                  )}
                </button>
              </div>
              {formErrors.password && (
                <span id="password-error" className="field-error" role="alert">
                  {formErrors.password}
                </span>
              )}
            </div>

            <div className="form-options">
              <label className="checkbox-wrapper">
                <input type="checkbox" />
                <span className="checkbox-label">Remember me</span>
              </label>
              <button type="button" className="forgot-link">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`login-button ${isSubmitting ? "loading" : ""}`}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="button-spinner"></span>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Admin</span>
                  
                </>
              )}
            </button>

            <div className="form-footer">
              <p className="footer-text">
                🔒 Admin-level authentication required
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}