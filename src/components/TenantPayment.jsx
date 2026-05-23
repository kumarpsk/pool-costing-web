// TenantPayment.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './TenantPayment.css';

const TenantPayment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState(null);
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('tenant_token');
    if (!token) {
      navigate('/tenant/login');
      return;
    }

    const planId = searchParams.get('plan_id');
    if (!planId) {
      navigate('/tenant/plans');
      return;
    }

    // In real app, fetch plan details using planId
    // For demo, we'll simulate a plan
    setPlan({
      id: planId,
      name: planId === '1' ? 'Basic Plan' : planId === '2' ? 'Pro Plan' : 'Enterprise Plan',
      price: planId === '1' ? 999 : planId === '2' ? 1999 : 2999,
      period: 'month',
      features: [
        `${planId === '1' ? '5' : planId === '2' ? '20' : 'Unlimited'} users`,
        `${planId === '1' ? '10GB' : planId === '2' ? '50GB' : 'Unlimited'} storage`,
        '24/7 Support',
        'Basic Analytics',
        ...(planId !== '1' ? ['Advanced Analytics'] : []),
        ...(planId === '3' ? ['Custom Reports', 'Dedicated Manager'] : [])
      ]
    });
  }, [navigate, searchParams]);

  const handlePayment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError('');

    // Simulate payment processing
    setTimeout(async () => {
      try {
        const token = localStorage.getItem('tenant_token');
        
        const response = await fetch('https://pool-costing-api.intelithon.in/admin/tenant/pay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            planId: plan.id,
            amount: plan.price,
            paymentMethod: 'card'
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Payment failed');
        }

        navigate('/tenant/subscription-success');
      } catch (err) {
        setError(err.message);
      } finally {
        setProcessing(false);
      }
    }, 2000);
  };

  const handleChange = (e) => {
    setPaymentData({
      ...paymentData,
      [e.target.name]: e.target.value
    });
  };

  if (!plan) {
    return (
      <div className="payment-container">
        <div className="loading">Loading payment details...</div>
      </div>
    );
  }

  return (
    <div className="payment-container">
      <div className="payment-wrapper">
        <div className="payment-summary">
          <h2>Order Summary</h2>
          <div className="plan-details">
            <h3>{plan.name}</h3>
            <div className="price">₹{plan.price}<span>/{plan.period}</span></div>
            <div className="features">
              <h4>Features:</h4>
              <ul>
                {plan.features.map((feature, index) => (
                  <li key={index}>✓ {feature}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="payment-form-container">
          <h2>Payment Details</h2>
          
          {error && <div className="alert alert-error">{error}</div>}
          
          <form onSubmit={handlePayment} className="payment-form">
            <div className="form-group">
              <label>Card Number</label>
              <input
                type="text"
                name="cardNumber"
                value={paymentData.cardNumber}
                onChange={handleChange}
                placeholder="1234 5678 9012 3456"
                maxLength="19"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Expiry Date</label>
                <input
                  type="text"
                  name="expiry"
                  value={paymentData.expiry}
                  onChange={handleChange}
                  placeholder="MM/YY"
                  maxLength="5"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>CVV</label>
                <input
                  type="text"
                  name="cvv"
                  value={paymentData.cvv}
                  onChange={handleChange}
                  placeholder="123"
                  maxLength="3"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Card Holder Name</label>
              <input
                type="text"
                name="name"
                value={paymentData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={processing}
            >
              {processing ? (
                <>
                  <span className="spinner"></span>
                  Processing Payment...
                </>
              ) : 'Pay Now'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TenantPayment;