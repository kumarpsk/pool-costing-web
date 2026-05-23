import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TenantRegister.css';

const TenantRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [formData, setFormData] = useState({
    company_code: '',
    company_name: '',
    director_name: '',
    gst_number: '',
    address: '',
    phone: '',
    email: '',
    password: '',
    website: ''
  });
  
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  
  // ✅ NEW: Stamp upload state
  const [stamp, setStamp] = useState(null);
  const [stampPreview, setStampPreview] = useState('');

  // Pre-approved company codes that skip subscription
  const SKIP_SUBSCRIPTION_CODES = ['INT002', 'RLI123', 'w-123'];

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Logo handlers
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, GIF)');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      e.target.value = '';
      return;
    }

    setLogo(file);
    setError('');
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    setLogoPreview('');
    const fileInput = document.getElementById('logo');
    if (fileInput) fileInput.value = '';
  };

  // ✅ NEW: Stamp handlers
  const handleStampChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file for stamp (JPG, PNG, GIF)');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Stamp file size must be less than 5MB');
      e.target.value = '';
      return;
    }

    setStamp(file);
    setError('');
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setStampPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveStamp = () => {
    setStamp(null);
    setStampPreview('');
    const fileInput = document.getElementById('stamp');
    if (fileInput) fileInput.value = '';
  };

  const validateForm = () => {
    const requiredFields = ['company_code', 'company_name', 'gst_number', 'address', 'phone', 'email', 'password'];
    
    for (const field of requiredFields) {
      if (!formData[field]?.trim()) {
        const fieldName = field.replace(/_/g, ' ');
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return 'Please enter a valid email address';
    }

    if (!/^[0-9+\-\s()]{10,}$/.test(formData.phone)) {
      return 'Please enter a valid phone number';
    }

    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters';
    }

    if (formData.website && formData.website.trim() !== '') {
      const websiteRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;
      if (!websiteRegex.test(formData.website.trim())) {
        return 'Please enter a valid website URL';
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const validationError = validateForm();
      if (validationError) {
        throw new Error(validationError);
      }

      const formDataToSend = new FormData();
      
      formDataToSend.append("company_code", formData.company_code.trim());
      formDataToSend.append("company_name", formData.company_name.trim());
      formDataToSend.append("director_name", formData.director_name.trim());
      formDataToSend.append("gst_number", formData.gst_number.trim());
      formDataToSend.append("address", formData.address.trim());
      formDataToSend.append("phone", formData.phone.trim());
      formDataToSend.append("email", formData.email.trim());
      formDataToSend.append("password", formData.password);
      formDataToSend.append("website", formData.website.trim());
      
      if (logo) {
        formDataToSend.append("logo", logo);
      }
      
      // ✅ NEW: Append stamp if present
      if (stamp) {
        formDataToSend.append("stamp", stamp);
      }

      const response = await fetch('https://pool-costing-api.intelithon.in/admin/tenant/register', {
        method: 'POST',
        body: formDataToSend
      });

      if (response.status === 422) {
        const errorData = await response.json();
        const validationErrors = errorData.detail || errorData.errors;
        if (Array.isArray(validationErrors)) {
          throw new Error(validationErrors.map(err => err.msg || err.message).join(', '));
        } else if (typeof validationErrors === 'string') {
          throw new Error(validationErrors);
        } else {
          throw new Error('Validation failed. Please check your input.');
        }
      }

      if (!response.ok) {
        let errorMessage = `Registration failed (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.success === false || data.error) {
        throw new Error(data.message || data.error || 'Registration failed');
      }

      // Store tenant info
      localStorage.setItem('tenant_info', JSON.stringify({
        tenant_id: data.tenant_id,
        company_name: data.company_name,
        company_code: data.company_code,
        director_name: formData.director_name.trim(),
        email: formData.email
      }));
      
      // Check if company code is pre-approved and should skip subscription
      const shouldSkipSubscription = SKIP_SUBSCRIPTION_CODES.includes(formData.company_code.trim());
      
      if (shouldSkipSubscription) {
        setSuccess('Registration successful! Redirecting to login page...');
        // Clear form
        setFormData({
          company_code: '',
          company_name: '',
          director_name: '',
          gst_number: '',
          address: '',
          phone: '',
          email: '',
          password: '',
          website: ''
        });
        handleRemoveLogo();
        handleRemoveStamp(); // ✅ Clear stamp as well
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setSuccess('Registration successful! Redirecting to subscription page...');
        localStorage.setItem('just_registered', 'true');
        setFormData({
          company_code: '',
          company_name: '',
          director_name: '',
          gst_number: '',
          address: '',
          phone: '',
          email: '',
          password: '',
          website: ''
        });
        handleRemoveLogo();
        handleRemoveStamp(); // ✅ Clear stamp as well
        setTimeout(() => {
          navigate('/tenant/subscription');
        }, 2000);
      }

    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-wrapper_5">
      {/* Animated Background */}
      <div className="animated-bg_5">
        <div className="gradient-orb_5 orb-1_5"></div>
        <div className="gradient-orb_5 orb-2_5"></div>
        <div className="gradient-orb_5 orb-3_5"></div>
      </div>

      {/* Main Register Container */}
      <div className={`register-container_5 ${mounted ? 'mounted_5' : ''}`}>
        {/* Left Side - Branding */}
        <div className="register-branding_5">
          <div className="brand-content_5">
            <div className="logo-container_5">
              <div className="logo-icon_5">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="15" y="15" width="70" height="70" rx="8" stroke="currentColor" strokeWidth="3" fill="none"/>
                  <path d="M35 40L50 50L65 40M35 60L50 50L65 60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="50" cy="50" r="8" fill="currentColor"/>
                </svg>
              </div>
              <h1 className="brand-name_5">Join Us Today</h1>
            </div>
            <p className="brand-tagline_5">Create your tenant account in minutes</p>
            
            <div className="feature-list_5">
              <div className="feature-item_5">
                <div className="feature-icon_5">✨</div>
                <div>
                  <h3>Quick Setup</h3>
                  <p>Get started in less than 5 minutes</p>
                </div>
              </div>
              <div className="feature-item_5">
                <div className="feature-icon_5">🔒</div>
                <div>
                  <h3>Secure Platform</h3>
                  <p>Your data is protected & encrypted</p>
                </div>
              </div>
              <div className="feature-item_5">
                <div className="feature-icon_5">💼</div>
                <div>
                  <h3>Full Control</h3>
                  <p>Manage your organization effectively</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Register Form */}
        <div className="register-form-container_5">
          <form onSubmit={handleSubmit} className="register-form_5" noValidate>
            <div className="form-header_5">
              <h2 className="form-title_5">Create Account</h2>
              <p className="form-subtitle_5">Register your organization to get started</p>
            </div>

            {error && (
              <div className="alert_5 alert-error_5">
                <svg className="alert-icon_5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert_5 alert-success_5">
                <svg className="alert-icon_5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span>{success}</span>
              </div>
            )}

            <div className="form-grid_5">
              <div className="form-group_5">
                <label htmlFor="company_code" className="form-label_5">
                  <span>Company Code *</span>
                  <svg className="label-icon_5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"/>
                  </svg>
                </label>
                <input
                  id="company_code"
                  type="text"
                  name="company_code"
                  value={formData.company_code}
                  onChange={handleInputChange}
                  placeholder="Enter company code"
                  className="form-input_5"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group_5">
                <label htmlFor="company_name" className="form-label_5">
                  <span>Company Name *</span>
                  <svg className="label-icon_5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                  </svg>
                </label>
                <input
                  id="company_name"
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  placeholder="Enter company name"
                  className="form-input_5"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group_5">
              <label htmlFor="director_name" className="form-label_5">
                <span>Director Name</span>
                <svg className="label-icon_5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                </svg>
              </label>
              <input
                id="director_name"
                type="text"
                name="director_name"
                value={formData.director_name}
                onChange={handleInputChange}
                placeholder="Enter Director Name"
                className="form-input_5"
                disabled={loading}
                maxLength="200"
              />
            </div>

            <div className="form-grid_5">
              <div className="form-group_5">
                <label htmlFor="gst_number" className="form-label_5">
                  <span>GST Number *</span>
                  <svg className="label-icon_5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
                  </svg>
                </label>
                <input
                  id="gst_number"
                  type="text"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleInputChange}
                  placeholder="Enter GST number"
                  className="form-input_5"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group_5">
                <label htmlFor="phone" className="form-label_5">
                  <span>Phone *</span>
                  <svg className="label-icon_5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                  </svg>
                </label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                  className="form-input_5"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group_5">
              <label htmlFor="email" className="form-label_5">
                <span>Email Address *</span>
                <svg className="label-icon_5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your.email@company.com"
                className="form-input_5"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group_5">
              <label htmlFor="website" className="form-label_5">
                <span>Website (Optional)</span>
                <svg className="label-icon_5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.293 2.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 9H7a4 4 0 000 8h3a1 1 0 110 2H7a6 6 0 010-12h7.586l-2.293-2.293a1 1 0 010-1.414z"/>
                </svg>
              </label>
              <input
                id="website"
                type="text"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://yourcompany.com"
                className="form-input_5"
                disabled={loading}
              />
            </div>

            <div className="form-group_5">
              <label htmlFor="address" className="form-label_5">
                <span>Address *</span>
                <svg className="label-icon_5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"/>
                </svg>
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter full address"
                rows="3"
                className="form-textarea_5"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group_5">
              <label htmlFor="password" className="form-label_5">
                <span>Password *</span>
                <svg className="label-icon_5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"/>
                </svg>
              </label>
              <div className="input-wrapper_5 password-wrapper_5">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Min. 6 characters"
                  className="form-input_5"
                  required
                  disabled={loading}
                  minLength="6"
                />
                <button
                  type="button"
                  className="password-toggle_5"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
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
            </div>

            {/* Logo Upload Section (unchanged) */}
            <div className="form-group_5 logo-upload-group_5">
              <label htmlFor="logo" className="form-label_5">
                <span>Company Logo *</span>
                <svg className="label-icon_5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                </svg>
              </label>
              
              <div className="logo-upload-container_5">
                {logoPreview ? (
                  <div className="logo-preview-wrapper_5">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="logo-preview-image_5"
                    />
                    <button 
                      type="button" 
                      className="logo-remove-btn_5"
                      onClick={handleRemoveLogo}
                      disabled={loading}
                      title="Remove logo"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="logo-placeholder_5">
                    <svg className="logo-placeholder-icon_5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                    </svg>
                    <span>No logo selected</span>
                  </div>
                )}
                
                <input
                  id="logo"
                  type="file"
                  name="logo"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="file-input_5"
                  disabled={loading}
                />
                <label htmlFor="logo" className="file-upload-btn_5">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"/>
                  </svg>
                  {logo ? 'Change Logo' : 'Upload Logo'}
                </label>
                <p className="file-hint_5">JPG, PNG, GIF (max 5MB)</p>
              </div>
            </div>

            {/* ✅ NEW: Stamp Upload Section */}
            <div className="form-group_5 logo-upload-group_5">
              <label htmlFor="stamp" className="form-label_5">
                <span>Company Stamp *</span>
                <svg className="label-icon_5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
                </svg>
              </label>
              
              <div className="logo-upload-container_5">
                {stampPreview ? (
                  <div className="logo-preview-wrapper_5">
                    <img 
                      src={stampPreview} 
                      alt="Stamp preview" 
                      className="logo-preview-image_5"
                    />
                    <button 
                      type="button" 
                      className="logo-remove-btn_5"
                      onClick={handleRemoveStamp}
                      disabled={loading}
                      title="Remove stamp"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="logo-placeholder_5">
                    <svg className="logo-placeholder-icon_5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                    </svg>
                    <span>No stamp selected</span>
                  </div>
                )}
                
                <input
                  id="stamp"
                  type="file"
                  name="stamp"
                  accept="image/*"
                  onChange={handleStampChange}
                  className="file-input_5"
                  disabled={loading}
                />
                <label htmlFor="stamp" className="file-upload-btn_5">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"/>
                  </svg>
                  {stamp ? 'Change Stamp' : 'Upload Stamp'}
                </label>
                <p className="file-hint_5">JPG, PNG, GIF (max 5MB)</p>
              </div>
            </div>

            <button 
              type="submit" 
              className={`register-button_5 ${loading ? "loading_5" : ""}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="button-spinner_5"></span>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <svg className="button-arrow_5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"/>
                  </svg>
                </>
              )}
            </button>

            <div className="form-footer_5">
              <p className="footer-text_5">
                Already registered?{' '}
                <button 
                  type="button"
                  onClick={() => navigate('/')} 
                  className="footer-link_5"
                  disabled={loading}
                >
                  Login here
                </button>
              </p>
              <p className="footer-security_5">
                🔒 Protected by enterprise-grade security
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TenantRegister;