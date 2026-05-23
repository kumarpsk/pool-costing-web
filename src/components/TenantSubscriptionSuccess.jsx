// TenantSubscriptionSuccess.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TenantSubscriptionSuccess.css';

const TenantSubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [transactionId] = useState(`TXN-${Date.now().toString(36).toUpperCase()}`);

  useEffect(() => {
    // Clear tenant token (they need to login again after payment)
    localStorage.removeItem('tenant_token');
    localStorage.removeItem('tenant_info');
    
    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/tenant/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleGoToLogin = () => {
    navigate('/tenant/login');
  };

  return (
    <div className="success-container">
      <div className="success-card">
        <div className="success-icon">
          <svg viewBox="0 0 24 24" width="80" height="80">
            <path fill="currentColor" d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M10,17l-5-5l1.41-1.41L10,14.17l7.59-7.59L19,8l-9,9z"/>
          </svg>
        </div>
        
        <h1>Payment Successful!</h1>
        
        <p className="success-message">
          Your subscription has been activated successfully. You will be redirected to login page to access your account.
        </p>
        
        <div className="success-details">
          <div className="detail-item">
            <span className="label">Transaction ID:</span>
            <span className="value">{transactionId}</span>
          </div>
          <div className="detail-item">
            <span className="label">Date & Time:</span>
            <span className="value">{new Date().toLocaleString()}</span>
          </div>
          <div className="detail-item">
            <span className="label">Status:</span>
            <span className="value status-completed">Completed</span>
          </div>
        </div>
        
        <button onClick={handleGoToLogin} className="btn btn-primary">
          Go to Login Now
        </button>
        
        <div className="countdown-timer">
          Redirecting in <span className="timer">{countdown}</span> seconds...
        </div>
        
        <div className="success-notes">
          <h3>Important Information:</h3>
          <ul>
            <li>Your subscription is now active</li>
            <li>Please login with your credentials</li>
            <li>Access all premium features immediately</li>
            <li>Check your email for confirmation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TenantSubscriptionSuccess;