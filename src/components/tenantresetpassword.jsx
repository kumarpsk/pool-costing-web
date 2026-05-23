import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './TenantLogin.css'; // Reusing same styles

const TenantResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [token, setToken] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setMounted(true);
    
    // Extract token from URL query parameters
    const searchParams = new URLSearchParams(location.search);
    const tokenParam = searchParams.get('token');
    
    if (!tokenParam) {
      setError('Invalid or missing reset token');
    } else {
      setToken(tokenParam);
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Validate password confirmation in real-time
    if (name === 'confirm_password' || name === 'new_password') {
      validatePasswords();
    }
  };

  const validatePasswords = () => {
    if (formData.new_password && formData.confirm_password) {
      if (formData.new_password !== formData.confirm_password) {
        setPasswordError('Passwords do not match');
        return false;
      }
      
      if (formData.new_password.length < 8) {
        setPasswordError('Password must be at least 8 characters');
        return false;
      }
      
      setPasswordError('');
      return true;
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords
    if (!validatePasswords()) {
      if (!passwordError) {
        setPasswordError('Please fill in both password fields');
      }
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('https://pool-costing-api.intelithon.in/admin/tenant/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          new_password: formData.new_password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Password reset failed');
      }

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/tenant-login');
      }, 3000);

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
              <h1 className="brand-name">Set New Password</h1>
            </div>
            <p className="brand-tagline">Create a secure new password for your account</p>
            
            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">🔑</div>
                <div>
                  <h3>Strong Password</h3>
                  <p>Minimum 8 characters</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🔄</div>
                <div>
                  <h3>One-Time Use</h3>
                  <p>Token invalid after use</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🔒</div>
                <div>
                  <h3>Session Security</h3>
                  <p>Previous sessions invalidated</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="tenant-login-form-container">
          {!token ? (
            <div className="tenant-login-form">
              <div className="form-header">
                <h2 className="form-title">Invalid Reset Link</h2>
                <p className="form-subtitle">The password reset link is invalid or has expired</p>
              </div>
              
              {error && (
                <div className="alert alert-error">
                  <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              
              <div className="form-footer">
                <p className="footer-text">
                  <Link to="/tenant/forgot-password" className="footer-link">
                    Request a new reset link
                  </Link>
                </p>
                <p className="footer-text">
                  <Link to="/tenant-login" className="footer-link">
                    Back to Login
                  </Link>
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="tenant-login-form">
              <div className="form-header">
                <h2 className="form-title">Create New Password</h2>
                <p className="form-subtitle">Enter your new password below</p>
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
                  <span>Password reset successful! Redirecting to login...</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="new_password" className="form-label">
                  <span>New Password *</span>
                  <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"/>
                  </svg>
                </label>
                <div className="input-wrapper">
                  <input
                    id="new_password"
                    type="password"
                    name="new_password"
                    value={formData.new_password}
                    onChange={handleChange}
                    placeholder="Enter new password (min 8 characters)"
                    required
                    disabled={loading || success}
                    className="form-input"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirm_password" className="form-label">
                  <span>Confirm Password *</span>
                  <svg className="label-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"/>
                  </svg>
                </label>
                <div className="input-wrapper">
                  <input
                    id="confirm_password"
                    type="password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Confirm new password"
                    required
                    disabled={loading || success}
                    className="form-input"
                    autoComplete="new-password"
                  />
                </div>
                {passwordError && (
                  <p className="input-error">{passwordError}</p>
                )}
              </div>

              {!success && (
                <button
                  type="submit"
                  disabled={loading || !!passwordError}
                  className={`login-button ${loading ? "loading" : ""} ${passwordError ? "disabled" : ""}`}
                >
                  {loading ? (
                    <>
                      <span className="button-spinner"></span>
                      <span>Resetting password...</span>
                    </>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <svg className="button-arrow" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"/>
                      </svg>
                    </>
                  )}
                </button>
              )}

              <div className="form-footer">
                <p className="footer-text">
                  <Link to="/tenant-login" className="footer-link">
                    Back to Login
                  </Link>
                </p>
                <p className="footer-security">
                  🔐 Your previous sessions will be invalidated for security
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantResetPassword;