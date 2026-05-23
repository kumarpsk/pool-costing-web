// TenantPlans.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TenantPlans.css';

const TenantPlans = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('tenant_token');
    if (!token) {
      navigate('/tenant/login');
      return;
    }

    fetchPlans();
  }, [navigate]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('https://pool-costing-api.intelithon.in/admin/public/plans');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch plans');
      }

      setPlans(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChoosePlan = (planId) => {
    navigate(`/tenant/payment?plan_id=${planId}`);
  };

  if (loading) {
    return (
      <div className="plans-container">
        <div className="loading">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="plans-container">
      <header className="plans-header">
        <h1>Choose Your Plan</h1>
        <p className="subtitle">Select the plan that best fits your needs</p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="plans-grid">
        {plans.map((plan) => (
          <div key={plan.id} className={`plan-card ${plan.recommended ? 'recommended' : ''}`}>
            {plan.recommended && (
              <div className="plan-badge">Recommended</div>
            )}
            
            <div className="plan-header">
              <h3>{plan.name}</h3>
              <div className="plan-price">
                <span className="price">₹{plan.price}</span>
                <span className="period">/{plan.period}</span>
              </div>
            </div>

            <div className="plan-features">
              {plan.features.map((feature, index) => (
                <div key={index} className="feature">
                  <span className="check">✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleChoosePlan(plan.id)}
              className="btn btn-primary"
            >
              Choose Plan
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TenantPlans;