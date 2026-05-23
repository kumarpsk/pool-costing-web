import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './TenantLogin.css';

const TenantLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loginResponse, setLoginResponse] = useState(null);
  const [formData, setFormData] = useState({
    company_code: '',
    email: '',
    password: ''
  });

  // List of companies with permanent access (no subscription required)
  // INT002 now has permanent access based on your updated list
  const PERMANENT_ACCESS_COMPANIES = ['INT002', 'RLI123', 'W-123'];

  useEffect(() => {
    setMounted(true);
    
    // Clear any stale subscription data
    const pendingSub = localStorage.getItem('pending_subscription');
    if (pendingSub) {
      try {
        const data = JSON.parse(pendingSub);
        const timestamp = new Date(data.timestamp || 0);
        const now = new Date();
        // Clear if older than 10 minutes
        if (now.getTime() - timestamp.getTime() > 10 * 60 * 1000) {
          localStorage.removeItem('pending_subscription');
          localStorage.removeItem('tenant_info');
        }
      } catch (e) {
        localStorage.removeItem('pending_subscription');
      }
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Since the API endpoint is returning 404, we'll determine subscription status locally
  const checkSubscriptionStatus = async (tenantId, companyCode) => {
    console.log(`Checking subscription for tenant: ${tenantId}, company: ${companyCode}`);
    
    // For demo purposes, assume all non-permanent companies need subscription
    // You can replace this with your actual logic
    return { 
      has_active_subscription: false, 
      subscription_ends_at: null,
      days_remaining: 0,
      plan_name: 'Standard Plan',
      amount_due: 5000.00,
      plan_id: 1
    };
  };

  const handleSubscriptionPayment = () => {
    // Create comprehensive tenant info object
    const tenantInfo = {
      tenant_id: loginResponse?.tenant?.tenant_id || subscriptionData?.tenant_id || `TEMP_${Date.now()}`,
      company_code: formData.company_code,
      company_name: loginResponse?.tenant?.company_name || subscriptionData?.company_name || formData.company_code,
      email: formData.email,
      plan_name: subscriptionData?.plan_name || 'Standard Plan',
      amount_due: subscriptionData?.amount_due || 5000,
      plan_id: subscriptionData?.plan_id || 1,
      timestamp: new Date().toISOString(),
      fromLogin: true
    };

    console.log('Storing tenant info for subscription:', tenantInfo);

    // Store in multiple places for redundancy
    localStorage.setItem('tenant_info', JSON.stringify(tenantInfo));
    localStorage.setItem('pending_tenant_info', JSON.stringify(tenantInfo));
    localStorage.setItem('pending_subscription', JSON.stringify(tenantInfo));
    sessionStorage.setItem('temp_tenant_info', JSON.stringify(tenantInfo));
    
    // Also store in state for immediate use if needed
    setSubscriptionData(tenantInfo);

    // Navigate to subscription page
    navigate('/tenant/subscription');
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`Subscription Issue for ${formData.company_code}`);
    const body = encodeURIComponent(
      `Company Code: ${formData.company_code}\n` +
      `Email: ${formData.email}\n` +
      `Issue: Need Subscription Assistance\n` +
      `Please help me set up my subscription.`
    );
    
    window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowSubscriptionModal(false);

    try {
      console.log('Attempting login with:', formData);
      
      // First, authenticate the user
      const response = await fetch('https://pool-costing-api.intelithon.in/admin/tenant/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Login failed');
      }

      if (data.success === false) {
        throw new Error(data.message || 'Login failed');
      }

      // Store login response for later use
      setLoginResponse(data);

      // Check if company has permanent access (no subscription required)
      const companyCode = data.tenant?.company_code?.toString().toUpperCase().trim();
      const hasPermanentAccess = PERMANENT_ACCESS_COMPANIES.includes(companyCode);
      
      console.log(`Company: ${companyCode}, Permanent Access: ${hasPermanentAccess}`);

      // For permanent access companies, login directly
      if (hasPermanentAccess) {
        console.log('Permanent access - logging in directly');
        
        // Store token and tenant data
        localStorage.setItem('tenant_token', data.access_token);
        localStorage.setItem('tenant_token_expiry', data.expiry);
        localStorage.setItem('tenant_data', JSON.stringify({
          tenant_id: data.tenant?.tenant_id,
          company_code: data.tenant?.company_code,
          company_name: data.tenant?.company_name,
          user_id: data.user?.user_id,
          email: data.user?.email,
          role: data.user?.role
        }));

        if (data.tenant?.company_code) {
          localStorage.setItem("tenant_company_code", data.tenant.company_code);
        }

        if (data.tenant?.tenant_id) {
          localStorage.setItem('tenant_id', data.tenant.tenant_id);
        }

        navigate('/skimmer');
        return;
      }

      // For non-permanent companies, check subscription status
      // Since API is 404, we'll use our local check
      console.log('Checking subscription for non-permanent company');
      
      const subscriptionStatus = await checkSubscriptionStatus(
        data.tenant?.tenant_id, 
        data.tenant?.company_code
      );

      console.log('Subscription status:', subscriptionStatus);

      // If no active subscription, show payment modal
      if (!subscriptionStatus.has_active_subscription) {
        console.log('Subscription required - showing modal');
        
        const subData = {
          tenant_id: data.tenant?.tenant_id,
          company_code: data.tenant?.company_code,
          company_name: data.tenant?.company_name,
          subscription_ends_at: subscriptionStatus.subscription_ends_at,
          days_remaining: subscriptionStatus.days_remaining,
          plan_name: subscriptionStatus.plan_name,
          amount_due: subscriptionStatus.amount_due,
          plan_id: subscriptionStatus.plan_id || 1,
          status: 'inactive'
        };
        
        setSubscriptionData(subData);
        setShowSubscriptionModal(true);
        setLoading(false);
        return;
      }

      // Active subscription - login
      localStorage.setItem('tenant_token', data.access_token);
      localStorage.setItem('tenant_token_expiry', data.expiry);
      localStorage.setItem('tenant_data', JSON.stringify({
        tenant_id: data.tenant?.tenant_id,
        company_code: data.tenant?.company_code,
        company_name: data.tenant?.company_name,
        user_id: data.user?.user_id,
        email: data.user?.email,
        role: data.user?.role
      }));

      if (data.tenant?.company_code) {
        localStorage.setItem("tenant_company_code", data.tenant.company_code);
      }

      if (data.tenant?.tenant_id) {
        localStorage.setItem('tenant_id', data.tenant.tenant_id);
      }

      navigate('/skimmer');

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="tenant-login-wrapper">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Subscription Required Modal */}
      {showSubscriptionModal && subscriptionData && (
        <div className="subscription-modal-overlay">
          <div className="subscription-modal">
            <button 
              className="modal-close"
              onClick={() => setShowSubscriptionModal(false)}
            >
              ×
            </button>
            
            <div className="subscription-modal-icon">🔒</div>
            <h2 className="subscription-modal-title">Subscription Required</h2>
            <p className="subscription-modal-subtitle">
              Your company needs an active subscription to access the portal.
              Please complete the payment to continue.
            </p>
            
            <div className="subscription-details">
              <div className="subscription-detail-item">
                <span className="detail-label">Company:</span>
                <span className="detail-value">{subscriptionData.company_name || formData.company_code}</span>
              </div>
              
              <div className="subscription-detail-item">
                <span className="detail-label">Plan:</span>
                <span className="detail-value">{subscriptionData.plan_name}</span>
              </div>
              
              <div className="subscription-detail-item highlight">
                <span className="detail-label">Amount Due:</span>
                <span className="detail-value">{formatCurrency(subscriptionData.amount_due)}</span>
              </div>
              
              <div className="subscription-detail-item">
                <span className="detail-label">Payment Cycle:</span>
                <span className="detail-value">Monthly</span>
              </div>
            </div>
            
            <div className="subscription-modal-actions">
              <button 
                className="subscription-pay-now"
                onClick={handleSubscriptionPayment}
              >
                Pay Now - {formatCurrency(subscriptionData.amount_due)}
              </button>
              <button 
                className="subscription-contact-support"
                onClick={handleContactSupport}
              >
                Contact Support
              </button>
            </div>
            
            <p className="subscription-modal-note">
              Having trouble? Email us at support@example.com
            </p>
          </div>
        </div>
      )}

      {/* Main Login Container */}
      <div className={`tenant-login-container ${mounted ? 'mounted' : ''}`}>
        {/* Left Side - Branding */}
        <div className="tenant-login-branding">
          <div className="brand-content">
            <div className="logo-container">
              <div className="logo-icon">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="15" y="15" width="70" height="70" rx="8" stroke="currentColor" strokeWidth="3" fill="none"/>
                  <path d="M35 40L50 50L65 40M35 60L50 50L65 60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="50" cy="50" r="8" fill="currentColor"/>
                </svg>
              </div>
              <h1 className="brand-name">Tenant Portal</h1>
            </div>
            <p className="brand-tagline">Manage your organization with ease</p>
            
            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">🏢</div>
                <div>
                  <h3>Multi-Tenant</h3>
                  <p>Isolated & secure environments</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">⚙️</div>
                <div>
                  <h3>Easy Management</h3>
                  <p>Intuitive admin controls</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🚀</div>
                <div>
                  <h3>Scale Seamlessly</h3>
                  <p>Grow without limitations</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="tenant-login-form-container">
          <form onSubmit={handleSubmit} className="tenant-login-form">
            <div className="form-header">
              <h2 className="form-title">Tenant Access</h2>
              <p className="form-subtitle">Sign in to your organization dashboard</p>
            </div>

            {error && (
              <div className="alert alert-error">
                <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
                </svg>
                <span>{error}</span>
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
                  value={formData.company_code}
                  onChange={handleChange}
                  placeholder="Enter company code"
                  required
                  disabled={loading}
                  className="form-input"
                  autoComplete="organization"
                />
              </div>
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
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@company.com"
                  required
                  disabled={loading}
                  className="form-input"
                  autoComplete="email"
                />
              </div>
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  className="form-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-wrapper">
                <input type="checkbox" />
                <span className="checkbox-label">Remember me</span>
              </label>
              <Link to="/tenant/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`login-button ${loading ? 'loading' : ''}`}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="form-footer">
              <p className="footer-text">
                Don't have an account?{' '}
                <Link to="/tenant/register" className="footer-link">
                  Register Here
                </Link>
              </p>
              <p className="footer-security">
                🔒 Protected by enterprise-grade security
              </p>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #999;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
          z-index: 10;
        }
        
        .modal-close:hover {
          background: #f0f0f0;
          color: #333;
        }
        
        .company-access-info {
          margin-top: 30px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .info-title {
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        
        .access-types {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 12px;
        }
        
        .access-type {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }
        
        .type-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          min-width: 90px;
          text-align: center;
        }
        
        .permanent .type-badge {
          background: rgba(76, 175, 80, 0.2);
          color: #4caf50;
          border: 1px solid #4caf50;
        }
        
        .subscription .type-badge {
          background: rgba(255, 152, 0, 0.2);
          color: #ff9800;
          border: 1px solid #ff9800;
        }
        
        .type-codes {
          color: #fff;
          font-size: 13px;
          font-family: monospace;
        }
        
        .info-note {
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
          margin-top: 12px;
          font-style: italic;
        }
        
        .subscription-modal-note {
          margin-top: 20px;
          font-size: 13px;
          color: #666;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default TenantLogin;
