import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './TenantLogin.css'; // Reusing same styles

const TenantForgotPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    company_code: '',
    email: ''
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('https://pool-costing-api.intelithon.in/admin/tenant/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Request failed');
      }

      // Always show success message regardless of whether account exists
      setSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          company_code: '',
          email: ''
        });
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tenant-login-wrapper">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Main Container */}
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
              <h1 className="brand-name">Password Reset</h1>
            </div>
            <p className="brand-tagline">Secure password recovery for your organization</p>
            
            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">🔐</div>
                <div>
                  <h3>Secure Process</h3>
                  <p>One-time reset links</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">⏱️</div>
                <div>
                  <h3>Time-Limited</h3>
                  <p>15-minute expiry</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🔒</div>
                <div>
                  <h3>Tenant Isolation</h3>
                  <p>Company-scoped security</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="tenant-login-form-container">
          <form onSubmit={handleSubmit} className="tenant-login-form">
            <div className="form-header">
              <h2 className="form-title">Reset Password</h2>
              <p className="form-subtitle">Enter your company code and email to receive reset instructions</p>
            </div>

            {error && (
              <div className="alert alert-error">
                <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span>If an account exists with this company code and email, a reset link has been sent.</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="company_code" className="form-label">
                <span>Company Code *</span>
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
                <span>Email Address *</span>
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

            <button
              type="submit"
              disabled={loading}
              className={`login-button ${loading ? "loading" : ""}`}
            >
              {loading ? (
                <>
                  <span className="button-spinner"></span>
                  <span>Sending reset link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <svg className="button-arrow" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"/>
                  </svg>
                </>
              )}
            </button>

            <div className="form-footer">
              <p className="footer-text">
                Remember your password?{' '}
                <Link to="/tenant-login" className="footer-link">
                  Back to Login
                </Link>
              </p>
              <p className="footer-text">
                Need help?{' '}
                <button type="button" className="footer-link" onClick={() => navigate('/support')}>
                  Contact Support
                </button>
              </p>
              <p className="footer-security">
                ⚠️ Reset links expire in 15 minutes for security
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TenantForgotPassword;