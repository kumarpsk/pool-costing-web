import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TenantSubscription.css';

const TenantSubscription = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState('monthly');

  // ✅ A. FIXED ENTRY LOGIC
  useEffect(() => {
    const tenantInfo = localStorage.getItem('tenant_info');
    const token = localStorage.getItem('tenant_token');
    const pendingInfo = localStorage.getItem('pending_tenant_info');
    
    console.log('TenantSubscription mounted:', { tenantInfo, token, pendingInfo });
    
    // Handle pending info from login redirect
    if (pendingInfo) {
      console.log('Found pending tenant info from login redirect');
      localStorage.setItem('tenant_info', pendingInfo);
      localStorage.removeItem('pending_tenant_info');
    }
    
    // If no registration info → go to login
    if (!localStorage.getItem('tenant_info')) {
      console.log('No tenant info found, redirecting to login');
      navigate('/tenant/login');
      return;
    }
    
    // If already logged in → go to dashboard
    if (token) {
      console.log('User already logged in, redirecting to dashboard');
      navigate('/skimmer');
      return;
    }

    fetchPlan();
  }, [navigate]);

  const fetchPlan = async () => {
    try {
      console.log('Fetching active plans from public endpoint...');
      
      const response = await fetch('https://pool-costing-api.intelithon.in/super-admin/public/plans?is_active=true');

      if (!response.ok) {
        throw new Error('Failed to fetch plan');
      }

      const result = await response.json();
      console.log('Plans fetched:', result);

      if (result.success && result.data && result.data.length > 0) {
        setPlan(result.data[0]);
      } else {
        setError('No active plan found');
      }    } catch (err) {
      console.error('Error fetching plan:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = () => {
    setShowPayment(true);
  };

  // ✅ B. FIXED PAYMENT FUNCTION
  const handlePayment = async () => {
    setPaymentProcessing(true);
    setError('');

    try {
      const tenantInfo = JSON.parse(localStorage.getItem('tenant_info') || '{}');

      if (!tenantInfo.tenant_id) {
        throw new Error('Tenant information missing. Please register again.');
      }

      const amount = selectedBillingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;

      const response = await fetch('https://pool-costing-api.intelithon.in/super-admin/public/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantInfo.tenant_id,
          amount: amount,
          currency: 'INR',
          payment_method: 'card',
          transaction_id: `TXN${Date.now()}`,
          status: 'success',
          paid_at: new Date().toISOString()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Payment failed');
      }

      // ✅ Clean temp data
      localStorage.removeItem('tenant_info');

      // ✅ Mark payment success
      localStorage.setItem('payment_completed', 'true');

      navigate('/tenant/subscription-success');

    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('₹', '₹ ');
  };

  const calculateSavings = () => {
    if (!plan) return 0;
    const monthlyTotal = plan.price_monthly * 12;
    const yearlyTotal = plan.price_yearly;
    return Math.round(((monthlyTotal - yearlyTotal) / monthlyTotal) * 100);
  };

  const getPrice = () => {
    if (!plan) return 0;
    return selectedBillingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
  };

  if (loading) {
    return (
      <div className="subscription-container_7">
        <div className="loading-spinner_7">
          <div className="spinner_7"></div>
          <p>Loading plan details...</p>
        </div>
      </div>
    );
  }

  if (showPayment && plan) {
    return (
      <div className="subscription-container_7">
        <div className="payment-wrapper_7">
          <div className="payment-header_7">
            <button onClick={() => setShowPayment(false)} className="back-button_7">
              ← Back
            </button>
            <h1>Complete Payment</h1>
          </div>
          
          <div className="payment-content_7">
            <div className="payment-summary_7">
              <h3>Order Summary</h3>
              <div className="summary-card_7">
                <div className="summary-item_7">
                  <span>{plan.name} - {selectedBillingCycle === 'monthly' ? 'Monthly' : 'Yearly'}</span>
                  <span>{formatCurrency(getPrice())}</span>
                </div>
                <div className="summary-item_7">
                  <span>GST (18%)</span>
                  <span>{formatCurrency(getPrice() * 0.18)}</span>
                </div>
                <div className="summary-total_7">
                  <span>Total Amount</span>
                  <span className="total-amount_7">{formatCurrency(getPrice() * 1.18)}</span>
                </div>
              </div>
            </div>

            <div className="payment-form_7">
              <h3>Payment Details</h3>
              
              {error && <div className="error-message_7">{error}</div>}
              
              <div className="form-group_7">
                <label>Card Number</label>
                <div className="card-input-wrapper_7">
                  <input 
                    type="text" 
                    placeholder="4242 4242 4242 4242" 
                    defaultValue="4242 4242 4242 4242"
                    readOnly
                  />
                  <div className="card-icons_7">
                    <span>💳</span>
                    <span>💳</span>
                    <span>💳</span>
                  </div>
                </div>
              </div>
              
              <div className="form-row_7">
                <div className="form-group_7">
                  <label>Expiry Date</label>
                  <input 
                    type="text" 
                    placeholder="MM/YY" 
                    defaultValue="12/25"
                    readOnly
                  />
                </div>
                <div className="form-group_7">
                  <label>CVV</label>
                  <input 
                    type="text" 
                    placeholder="123" 
                    defaultValue="123"
                    readOnly
                  />
                </div>
              </div>
              
              <div className="form-group_7">
                <label>Name on Card</label>
                <input 
                  type="text" 
                  placeholder="John Doe" 
                  defaultValue="Test User"
                  readOnly
                />
              </div>
              
              <div className="demo-notice_7">
                ⚡ This is a demo - No actual payment will be charged
              </div>
              
              <button 
                onClick={handlePayment}
                className="pay-button_7"
                disabled={paymentProcessing}
              >
                {paymentProcessing ? (
                  <>
                    <span className="button-spinner_7"></span>
                    Processing Payment...
                  </>
                ) : (
                  `Pay ${formatCurrency(getPrice() * 1.18)}`
                )}
              </button>
              
              <p className="secure-payment_7">
                🔒 Secure payment powered by Stripe
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-container_7">
      {/* Header */}
      <header className="subscription-header_7">
        <div className="header-content_7">
          <h1>Complete Your Subscription</h1>
          <p>Choose your plan to start managing your projects effectively</p>
        </div>
      </header>

      {error && <div className="error-alert_7">{error}</div>}

      {/* Main Content */}
      <div className="subscription-content_7">
        {/* Plan Card */}
        <div className="plan-card_7">
          <div className="plan-card-header_7">
            <h2>Premium Plan</h2>
            {plan && <span className="plan-badge_7">Recommended</span>}
          </div>
          
          {plan ? (
            <>
              <div className="billing-toggle_7">
                <button 
                  className={`toggle-btn_7 ${selectedBillingCycle === 'monthly' ? 'active_7' : ''}`}
                  onClick={() => setSelectedBillingCycle('monthly')}
                >
                  Monthly
                </button>
                <button 
                  className={`toggle-btn_7 ${selectedBillingCycle === 'yearly' ? 'active_7' : ''}`}
                  onClick={() => setSelectedBillingCycle('yearly')}
                >
                  Yearly
                  {plan.price_yearly && (
                    <span className="savings-badge_7">Save {calculateSavings()}%</span>
                  )}
                </button>
              </div>

              <div className="plan-price_7">
                <span className="currency_7">₹</span>
                <span className="amount_7">
                  {selectedBillingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly}
                </span>
                <span className="period_7">
                  /{selectedBillingCycle === 'monthly' ? 'month' : 'year'}
                </span>
              </div>

              {selectedBillingCycle === 'yearly' && plan.price_yearly && (
                <div className="savings-text_7">
                  Save {formatCurrency((plan.price_monthly * 12) - plan.price_yearly)} annually
                </div>
              )}

              <div className="features-list_7">
                <h3>What's included:</h3>
                <ul>
                  <li className="feature-item_7">
                    <span className="feature-check_7">✓</span>
                    <span>Up to <strong>{plan.max_users} users</strong></span>
                  </li>
                  <li className="feature-item_7">
                    <span className="feature-check_7">✓</span>
                    <span><strong>Unlimited Projects</strong></span>
                  </li>
                  <li className={`feature-item_7 ${!plan.can_export_excel ? 'disabled_7' : ''}`}>
                    <span className={plan.can_export_excel ? 'feature-check_7' : 'feature-x_7'}>
                      {plan.can_export_excel ? '✓' : '✗'}
                    </span>
                    <span>Excel Export</span>
                  </li>
                  <li className="feature-item_7">
                    <span className="feature-check_7">✓</span>
                    <span><strong>Delivery Challan</strong> Generation</span>
                  </li>
                  <li className="feature-item_7">
                    <span className="feature-check_7">✓</span>
                    <span><strong>Tax Invoice</strong> Generation</span>
                  </li>
                  <li className="feature-item_7 highlight_7">
                    <span className="feature-special_7">✨</span>
                    <span><strong>3D Pool Visualize</strong> - Advanced Analytics</span>
                  </li>
                  <li className="feature-item_7">
                    <span className="feature-check_7">✓</span>
                    <span>Priority Support</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={handleProceedToPayment}
                className="proceed-button_7"
              >
                Proceed to Payment
                <span className="button-arrow_7">→</span>
              </button>

              <p className="guarantee-text_7">
                🛡️ 30-day money-back guarantee • No hidden fees • Cancel anytime
              </p>
            </>
          ) : (
            <div className="no-plan_7">
              <p>No plan available. Please contact support.</p>
              <button 
                onClick={() => navigate('/tenant/login')} 
                className="back-to-login_7"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="subscription-sidebar_7">
          {/* Quick Actions */}
          <div className="sidebar-card_7">
            <h3>Need Help?</h3>
            <div className="action-buttons_7">
              <button onClick={() => window.location.href = 'mailto:support@example.com'} className="action-btn_7">
                <span className="action-icon_7">📧</span>
                <span>Contact Support</span>
              </button>
              <button onClick={() => navigate('/tenant/login')} className="action-btn_7 secondary_7">
                <span className="action-icon_7">←</span>
                <span>Back to Login</span>
              </button>
            </div>
          </div>

          {/* Guarantee Card */}
          <div className="sidebar-card_7 guarantee-card_7">
            <div className="guarantee-icon_7">🛡️</div>
            <h3>30-Day Money-Back Guarantee</h3>
            <p>If you're not completely satisfied, get a full refund within 30 days. No questions asked.</p>
          </div>

          {/* Trust Badges */}
          <div className="sidebar-card_7 trust-badges_7">
            <h3>Trusted By</h3>
            <div className="badges-grid_7">
              <div className="badge_7">🔒 SSL Secure</div>
              <div className="badge_7">💳 Secure Payment</div>
              <div className="badge_7">⭐ 24/7 Support</div>
              <div className="badge_7">🚀 Instant Access</div>
              <div className="badge_7">📦 Delivery Challan</div>
              <div className="badge_7">🧾 Tax Invoice</div>
              <div className="badge_7">🌊 3D Visualize</div>
              <div className="badge_7">📊 Unlimited Projects</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantSubscription;