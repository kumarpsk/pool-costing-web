import React, { useState, useEffect } from "react";

function CostBreakdownChart({ 
  mainPoolCost = 0, 
  mepCost = 0, 
  balancingTankCost = 0,
  pumpRoomCost = 0,
  currency = 'INR',
  equipmentDistance = 0 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [animProgress, setAnimProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  // Exchange rate (you can make this dynamic by fetching from an API)
  const EXCHANGE_RATE = 83.0; // 1 USD = 83 INR

  const totalCost = mainPoolCost + mepCost + balancingTankCost + pumpRoomCost;
  const mainPoolPercentage = totalCost > 0 ? (mainPoolCost / totalCost) * 100 : 0;
  const mepPercentage = totalCost > 0 ? (mepCost / totalCost) * 100 : 0;
  const balancingTankPercentage = totalCost > 0 ? (balancingTankCost / totalCost) * 100 : 0;
  const pumpRoomPercentage = totalCost > 0 ? (pumpRoomCost / totalCost) * 100 : 0;

  useEffect(() => {
    setIsLoaded(true);
    const startTime = Date.now();
    const duration = 2000;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setAnimProgress(eased);
      
      if (progress < 1) requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }, []);

  // Check mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Updated currency formatting functions
  const formatCurrency = (amount) => {
    if (currency === 'USD') {
      const usdAmount = amount / EXCHANGE_RATE;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(usdAmount);
    }
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCompact = (amount) => {
    const displayAmount = currency === 'USD' ? amount / EXCHANGE_RATE : amount;
    const symbol = currency === 'USD' ? '$' : '₹';
    
    if (displayAmount >= 10000000) return `${symbol}${(displayAmount / 10000000).toFixed(2)}Cr`;
    if (displayAmount >= 100000) return `${symbol}${(displayAmount / 100000).toFixed(2)}L`;
    return formatCurrency(amount);
  };

  // Get currency symbol
  const getCurrencySymbol = () => {
    return currency === 'USD' ? '$' : '₹';
  };

  const mainPoolBreakdown = [
    { category: "Excavation & Structure", percentage: 45, cost: mainPoolCost * 0.45, icon: "🏗️", color: "#8B5CF6", desc: "Earthwork & concrete" },
    { category: "Finishing & Tiling", percentage: 30, cost: mainPoolCost * 0.30, icon: "✨", color: "#EC4899", desc: "Premium surfaces" },
    { category: "Waterproofing", percentage: 15, cost: mainPoolCost * 0.15, icon: "💧", color: "#06B6D4", desc: "Membrane systems" },
    { category: "Miscellaneous", percentage: 10, cost: mainPoolCost * 0.10, icon: "📦", color: "#10B981", desc: "Additional items" }
  ];

  const balancingTankBreakdown = [
    { category: "Structure & Waterproofing", percentage: 60, cost: balancingTankCost * 0.60, icon: "🏢", color: "#F59E0B", desc: "Tank construction" },
    { category: "Plumbing Connections", percentage: 25, cost: balancingTankCost * 0.25, icon: "🔧", color: "#EF4444", desc: "Piping systems" },
    { category: "Access & Safety Features", percentage: 15, cost: balancingTankCost * 0.15, icon: "🛡️", color: "#3B82F6", desc: "Safety equipment" }
  ];

  const pumpRoomBreakdown = [
    { category: "Civil Structure", percentage: 40, cost: pumpRoomCost * 0.40, icon: "🏭", color: "#8B5CF6", desc: "Room construction" },
    { category: "Electrical Works", percentage: 25, cost: pumpRoomCost * 0.25, icon: "⚡", color: "#F59E0B", desc: "Wiring & panels" },
    { category: "Plumbing & Ventilation", percentage: 20, cost: pumpRoomCost * 0.20, icon: "💨", color: "#06B6D4", desc: "Air & water systems" },
    { category: "Finishing & Safety", percentage: 15, cost: pumpRoomCost * 0.15, icon: "🎨", color: "#10B981", desc: "Interior & safety" }
  ];

  const mepBreakdown = [
    { category: "Filtration System", percentage: 40, cost: mepCost * 0.40, icon: "⚙️", color: "#8B5CF6", desc: "Water purification" },
    { category: "Pumps & Plumbing", percentage: 30, cost: mepCost * 0.30, icon: "🔧", color: "#EC4899", desc: "Circulation system" },
    { category: "Electrical & Lighting", percentage: 20, cost: mepCost * 0.20, icon: "💡", color: "#06B6D4", desc: "Power & lights" },
    { category: "Control Systems", percentage: 10, cost: mepCost * 0.10, icon: "🎛️", color: "#10B981", desc: "Automation tech" }
  ];

  const sections = [
    { 
      title: 'Main Pool', 
      amount: mainPoolCost, 
      percentage: mainPoolPercentage, 
      color: '#8B5CF6', 
      icon: '🏊‍♂️', 
      items: mainPoolBreakdown 
    },
    { 
      title: 'Balancing Tank', 
      amount: balancingTankCost, 
      percentage: balancingTankPercentage, 
      color: '#10B981', 
      icon: '💧', 
      items: balancingTankBreakdown 
    },
    { 
      title: 'Pump Room', 
      amount: pumpRoomCost, 
      percentage: pumpRoomPercentage, 
      color: '#F59E0B', 
      icon: '🏗️', 
      items: pumpRoomBreakdown 
    },
    { 
      title: 'MEP Systems', 
      amount: mepCost, 
      percentage: mepPercentage, 
      color: '#EC4899', 
      icon: '⚙️', 
      items: mepBreakdown 
    }
  ];

  // Filter out sections with zero cost
  const visibleSections = sections.filter(section => section.amount > 0);

  // Currency Display Component
  const CurrencyDisplay = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      background: 'rgba(255,255,255,0.1)',
      padding: isMobile ? '6px 12px' : '8px 16px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.2)',
      marginBottom: '20px',
      flexWrap: 'wrap',
      textAlign: 'center'
    }}>
      <span style={{ 
        fontSize: isMobile ? '14px' : '16px', 
        color: 'white', 
        fontWeight: '600' 
      }}>
        Currency: {getCurrencySymbol()} {currency}
      </span>
      {currency === 'USD' && (
        <span style={{ 
          fontSize: isMobile ? '11px' : '12px', 
          color: '#94A3B8' 
        }}>
          (1 USD = {EXCHANGE_RATE} INR)
        </span>
      )}
    </div>
  );

  // Main Overview Component
  const MainOverview = () => (
    <div style={{
      opacity: isLoaded ? 1 : 0,
      transform: isLoaded ? 'translateY(0)' : 'translateY(30px)',
      transition: 'all 0.8s ease'
    }}>
      {/* Currency Display */}
      <CurrencyDisplay />

      {/* Hero Total */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: isMobile ? '40px' : '60px'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(255,255,255,0.1)',
          borderRadius: isMobile ? '20px' : '32px',
          padding: isMobile ? '24px' : '48px',
          textAlign: 'center',
          minWidth: isMobile ? '100%' : '450px',
          maxWidth: isMobile ? '100%' : '500px',
          position: 'relative',
          width: '100%'
        }}>
          {/* Equipment Distance Info */}
          {equipmentDistance > 0 && (
            <div style={{
              position: 'absolute',
              top: isMobile ? '12px' : '20px',
              right: isMobile ? '12px' : '20px',
              background: 'rgba(139, 92, 246, 0.2)',
              padding: isMobile ? '6px 8px' : '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
              <div style={{ 
                fontSize: isMobile ? '10px' : '12px', 
                color: '#8B5CF6', 
                fontWeight: '600' 
              }}>
                📏 {equipmentDistance}m
              </div>
            </div>
          )}
          
          <div style={{ 
            fontSize: isMobile ? '14px' : '16px', 
            color: '#94A3B8', 
            fontWeight: '600', 
            marginBottom: isMobile ? '8px' : '12px', 
            textTransform: 'uppercase', 
            letterSpacing: isMobile ? '1px' : '2px' 
          }}>
            Total Project Investment
          </div>
          <div style={{
            fontSize: isMobile ? '48px' : '72px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: isMobile ? '6px' : '8px',
            letterSpacing: '-0.02em',
            lineHeight: 1.1
          }}>
            {formatCompact(totalCost * animProgress)}
          </div>
          <div style={{ 
            fontSize: isMobile ? '13px' : '14px', 
            color: '#64748B', 
            fontWeight: '500',
            lineHeight: 1.4
          }}>
            Complete swimming pool construction
          </div>
          {currency === 'USD' && (
            <div style={{ 
              fontSize: isMobile ? '11px' : '12px', 
              color: '#8B5CF6', 
              marginTop: '8px',
              background: 'rgba(139, 92, 246, 0.1)',
              padding: '4px 8px',
              borderRadius: '6px',
              display: 'inline-block'
            }}>
              ≈ {formatCurrency(totalCost)} exact
            </div>
          )}
        </div>
      </div>

      {/* Section Cards with Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: isMobile ? '20px' : '32px',
        marginBottom: isMobile ? '32px' : '48px'
      }}>
        {visibleSections.map((section, idx) => (
          <div key={idx} style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: isMobile ? '16px' : '28px',
            padding: isMobile ? '24px' : '40px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={!isMobile ? (e) => {
            e.currentTarget.style.transform = 'translateY(-8px)';
            e.currentTarget.style.boxShadow = `0 20px 60px ${section.color}40`;
          } : undefined}
          onMouseLeave={!isMobile ? (e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          } : undefined}>
            {/* Glow Background */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '200%',
              height: '200%',
              background: `radial-gradient(circle, ${section.color}15 0%, transparent 70%)`,
              pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative' }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: isMobile ? '24px' : '32px' }}>
                <div style={{
                  width: isMobile ? '60px' : '72px',
                  height: isMobile ? '60px' : '72px',
                  borderRadius: isMobile ? '16px' : '20px',
                  background: `linear-gradient(135deg, ${section.color} 0%, ${section.color}dd 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '32px' : '36px',
                  margin: '0 auto 16px',
                  boxShadow: `0 16px 48px ${section.color}50`
                }}>
                  {section.icon}
                </div>
                <h3 style={{ 
                  fontSize: isMobile ? '20px' : '22px', 
                  fontWeight: '800', 
                  color: 'white', 
                  margin: '0 0 8px 0',
                  lineHeight: 1.2
                }}>
                  {section.title}
                </h3>
                <div style={{ 
                  fontSize: isMobile ? '28px' : '36px', 
                  fontWeight: '900', 
                  color: section.color, 
                  marginBottom: '6px',
                  lineHeight: 1.1
                }}>
                  {formatCompact(section.amount * animProgress)}
                </div>
                <div style={{ 
                  fontSize: isMobile ? '14px' : '16px', 
                  color: '#94A3B8', 
                  fontWeight: '600' 
                }}>
                  {(section.percentage * animProgress).toFixed(1)}% of total
                </div>
                {currency === 'USD' && section.amount > 0 && (
                  <div style={{ 
                    fontSize: isMobile ? '11px' : '12px', 
                    color: section.color, 
                    marginTop: '4px',
                    opacity: 0.8
                  }}>
                    {formatCurrency(section.amount)}
                  </div>
                )}
              </div>

              {/* Mini Donut Chart */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: isMobile ? '20px' : '24px' }}>
                <svg 
                  width={isMobile ? 160 : 220} 
                  height={isMobile ? 160 : 220} 
                  viewBox="0 0 220 220"
                >
                  <defs>
                    {section.items.map((item, i) => (
                      <linearGradient key={i} id={`grad-${idx}-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: item.color, stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: item.color, stopOpacity: 0.7 }} />
                      </linearGradient>
                    ))}
                  </defs>
                  
                  <circle cx="110" cy="110" r="80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="32"/>
                  
                  {section.items.map((item, i) => {
                    const prevSum = section.items.slice(0, i).reduce((sum, it) => sum + it.percentage, 0);
                    const circumference = 2 * Math.PI * 80;
                    const offset = (prevSum / 100) * circumference;
                    const dashArray = (item.percentage / 100) * circumference * animProgress;
                    
                    return (
                      <circle
                        key={i}
                        cx="110"
                        cy="110"
                        r="80"
                        fill="none"
                        stroke={`url(#grad-${idx}-${i})`}
                        strokeWidth="32"
                        strokeDasharray={`${dashArray} ${circumference}`}
                        strokeDashoffset={-offset}
                        transform="rotate(-90 110 110)"
                        style={{
                          cursor: !isMobile ? 'pointer' : 'default',
                          transition: 'all 0.3s ease',
                          opacity: hoveredSegment === `${idx}-${i}` ? 1 : hoveredSegment?.startsWith(`${idx}-`) ? 0.4 : 1
                        }}
                        onMouseEnter={!isMobile ? () => setHoveredSegment(`${idx}-${i}`) : undefined}
                        onMouseLeave={!isMobile ? () => setHoveredSegment(null) : undefined}
                      />
                    );
                  })}
                  
                  <circle cx="110" cy="110" r="55" fill="rgba(15, 23, 42, 0.95)"/>
                  <text x="110" y="105" textAnchor="middle" style={{ 
                    fontSize: isMobile ? '12px' : '14px', 
                    fill: '#94A3B8', 
                    fontWeight: '600' 
                  }}>
                    Total
                  </text>
                  <text x="110" y="125" textAnchor="middle" style={{ 
                    fontSize: isMobile ? '16px' : '20px', 
                    fill: section.color, 
                    fontWeight: '900' 
                  }}>
                    {(section.percentage * animProgress).toFixed(0)}%
                  </text>
                </svg>
              </div>

              {/* Category Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '10px' }}>
                {section.items.map((item, i) => (
                  <div
                    key={i}
                    onMouseEnter={!isMobile ? () => setHoveredSegment(`${idx}-${i}`) : undefined}
                    onMouseLeave={!isMobile ? () => setHoveredSegment(null) : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? '8px' : '10px',
                      padding: isMobile ? '8px 12px' : '10px 14px',
                      borderRadius: '10px',
                      background: hoveredSegment === `${idx}-${i}` ? 'rgba(255,255,255,0.1)' : 'transparent',
                      cursor: !isMobile ? 'pointer' : 'default',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{
                      width: isMobile ? '8px' : '10px',
                      height: isMobile ? '8px' : '10px',
                      borderRadius: '3px',
                      background: item.color,
                      flexShrink: 0
                    }} />
                    <span style={{ 
                      fontSize: isMobile ? '12px' : '13px', 
                      fontWeight: '600', 
                      color: 'white', 
                      flex: 1 
                    }}>
                      {item.category}
                    </span>
                    <span style={{ 
                      fontSize: isMobile ? '12px' : '13px', 
                      fontWeight: '700', 
                      color: item.color 
                    }}>
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => setShowDetails(true)}
          style={{
            background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
            border: 'none',
            borderRadius: isMobile ? '12px' : '16px',
            padding: isMobile ? '16px 32px' : '20px 48px',
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: '700',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 20px 60px rgba(139, 92, 246, 0.4)',
            transition: 'all 0.3s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            width: isMobile ? '100%' : 'auto',
            justifyContent: 'center'
          }}
          onMouseEnter={!isMobile ? (e) => {
            e.target.style.transform = 'translateY(-4px)';
            e.target.style.boxShadow = '0 24px 70px rgba(139, 92, 246, 0.5)';
          } : undefined}
          onMouseLeave={!isMobile ? (e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 20px 60px rgba(139, 92, 246, 0.4)';
          } : undefined}
        >
          <span>View Detailed Breakdown</span>
          <span style={{ fontSize: isMobile ? '18px' : '20px' }}>📊</span>
        </button>
      </div>
    </div>
  );

  // Detailed Breakdown Component
  const DetailedBreakdown = () => (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Currency Display */}
      <CurrencyDisplay />

      {/* Back Button */}
      <div style={{ marginBottom: isMobile ? '24px' : '40px' }}>
        <button
          onClick={() => setShowDetails(false)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            padding: isMobile ? '10px 16px' : '12px 24px',
            fontSize: isMobile ? '14px' : '15px',
            fontWeight: '600',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            width: isMobile ? '100%' : 'auto',
            justifyContent: 'center'
          }}
          onMouseEnter={!isMobile ? (e) => e.target.style.background = 'rgba(255,255,255,0.15)' : undefined}
          onMouseLeave={!isMobile ? (e) => e.target.style.background = 'rgba(255,255,255,0.1)' : undefined}
        >
          <span>←</span>
          <span>Back to Overview</span>
        </button>
      </div>

      {/* Detailed Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: isMobile ? '20px' : '32px',
        marginBottom: isMobile ? '32px' : '48px'
      }}>
        {visibleSections.map((section, idx) => (
          <div key={idx} style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: isMobile ? '16px' : '24px',
            padding: isMobile ? '20px' : '40px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '12px' : '16px', 
              marginBottom: isMobile ? '24px' : '32px',
              flexDirection: isMobile ? 'column' : 'row',
              textAlign: isMobile ? 'center' : 'left'
            }}>
              <div style={{
                width: isMobile ? '48px' : '64px',
                height: isMobile ? '48px' : '64px',
                borderRadius: isMobile ? '12px' : '20px',
                background: `linear-gradient(135deg, ${section.color} 0%, ${section.color}dd 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '24px' : '32px',
                boxShadow: `0 10px 30px ${section.color}60`,
                flexShrink: 0
              }}>
                {section.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  fontSize: isMobile ? '20px' : '24px', 
                  fontWeight: '800', 
                  color: 'white', 
                  margin: '0 0 4px 0' 
                }}>
                  {section.title}
                </h3>
                <div style={{ 
                  fontSize: isMobile ? '18px' : '20px', 
                  fontWeight: '700', 
                  color: section.color 
                }}>
                  {formatCompact(section.amount)}
                </div>
                {currency === 'USD' && (
                  <div style={{ 
                    fontSize: isMobile ? '13px' : '14px', 
                    color: '#94A3B8' 
                  }}>
                    {formatCurrency(section.amount)}
                  </div>
                )}
              </div>
            </div>

            <div>
              {section.items.map((item, i) => {
                const maxValue = Math.max(...section.items.map(it => it.value || it.cost));
                return (
                  <div
                    key={i}
                    onMouseEnter={!isMobile ? () => setHoveredItem(`${idx}-${i}`) : undefined}
                    onMouseLeave={!isMobile ? () => setHoveredItem(null) : undefined}
                    style={{
                      marginBottom: isMobile ? '16px' : '24px',
                      transition: 'all 0.3s ease',
                      transform: hoveredItem === `${idx}-${i}` ? 'translateX(8px)' : 'translateX(0)'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: isMobile ? 'flex-start' : 'center',
                      marginBottom: '10px',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? '8px' : '0'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: isMobile ? '8px' : '12px',
                        flex: 1 
                      }}>
                        <span style={{ fontSize: isMobile ? '20px' : '24px' }}>{item.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontSize: isMobile ? '14px' : '15px', 
                            fontWeight: '700', 
                            color: 'white',
                            lineHeight: 1.3
                          }}>
                            {item.category}
                          </div>
                          <div style={{ 
                            fontSize: isMobile ? '11px' : '12px', 
                            color: '#94A3B8',
                            lineHeight: 1.3
                          }}>
                            {item.desc}
                          </div>
                        </div>
                      </div>
                      <div style={{ 
                        textAlign: isMobile ? 'left' : 'right',
                        width: isMobile ? '100%' : 'auto'
                      }}>
                        <div style={{ 
                          fontSize: isMobile ? '16px' : '18px', 
                          fontWeight: '800', 
                          color: item.color 
                        }}>
                          {formatCompact(item.cost)}
                        </div>
                        <div style={{ 
                          fontSize: isMobile ? '12px' : '13px', 
                          color: '#64748B', 
                          fontWeight: '600' 
                        }}>
                          {item.percentage}%
                        </div>
                        {currency === 'USD' && (
                          <div style={{ 
                            fontSize: isMobile ? '10px' : '11px', 
                            color: '#94A3B8' 
                          }}>
                            {formatCurrency(item.cost)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{
                      height: isMobile ? '12px' : '16px',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '999px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(item.cost / maxValue) * 100}%`,
                        background: `linear-gradient(90deg, ${item.color} 0%, ${item.color}aa 100%)`,
                        borderRadius: '999px',
                        boxShadow: hoveredItem === `${idx}-${i}` ? `0 0 20px ${item.color}` : 'none',
                        transition: 'all 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Cost Insights */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: isMobile ? '16px' : '24px',
        padding: isMobile ? '24px' : '40px'
      }}>
        <h3 style={{ 
          fontSize: isMobile ? '20px' : '24px', 
          fontWeight: '800', 
          color: 'white', 
          marginBottom: isMobile ? '24px' : '32px', 
          textAlign: 'center' 
        }}>
          💡 Cost Optimization Tips
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: isMobile ? '16px' : '24px'
        }}>
          {[
            { icon: '📐', title: 'Smart Design', desc: 'Simpler shapes reduce excavation and construction complexity by 15-20%', color: '#8B5CF6' },
            { icon: '⏰', title: 'Seasonal Planning', desc: 'Off-peak construction can save 15-20% on labor and material costs', color: '#EC4899' },
            { icon: '⚡', title: 'Energy Efficiency', desc: 'Modern equipment reduces operational costs by up to 40% annually', color: '#06B6D4' },
            { icon: '🔍', title: 'Compare Quotes', desc: 'Multiple contractor quotes ensure competitive pricing and quality', color: '#10B981' },
            { icon: '📅', title: 'Phased Construction', desc: 'Spread costs over time while maintaining quality standards', color: '#F59E0B' },
            { icon: '🎯', title: 'Standard Equipment', desc: 'Standard sizes over custom options can reduce costs by 20-30%', color: '#EF4444' },
            { icon: '🏗️', title: 'Pump Room Planning', desc: 'Optimize pump room size to 20% of pool area for cost efficiency', color: '#F59E0B' },
            { icon: '🔧', title: 'Equipment Placement', desc: 'Strategic equipment placement reduces piping costs significantly', color: '#3B82F6' }
          ].map((tip, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: isMobile ? '12px' : '16px',
              padding: isMobile ? '16px' : '24px',
              borderRadius: isMobile ? '12px' : '16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.3s ease',
              cursor: !isMobile ? 'pointer' : 'default'
            }}
            onMouseEnter={!isMobile ? (e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            } : undefined}
            onMouseLeave={!isMobile ? (e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            } : undefined}>
              <div style={{
                width: isMobile ? '40px' : '48px',
                height: isMobile ? '40px' : '48px',
                borderRadius: isMobile ? '8px' : '12px',
                background: `linear-gradient(135deg, ${tip.color} 0%, ${tip.color}dd 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '20px' : '24px',
                flexShrink: 0,
                boxShadow: `0 8px 24px ${tip.color}40`
              }}>
                {tip.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: isMobile ? '15px' : '16px', 
                  fontWeight: '700', 
                  color: 'white', 
                  marginBottom: '6px',
                  lineHeight: 1.3
                }}>
                  {tip.title}
                </div>
                <div style={{ 
                  fontSize: isMobile ? '13px' : '14px', 
                  color: '#94A3B8', 
                  lineHeight: 1.4 
                }}>
                  {tip.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
      padding: isMobile ? '20px 12px' : '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: isMobile ? '40px' : '60px',
          opacity: isLoaded ? 1 : 0,
          transition: 'all 0.8s ease'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #8B5CF640 0%, #EC489940 100%)',
            padding: isMobile ? '8px 16px' : '10px 24px',
            borderRadius: '999px',
            marginBottom: isMobile ? '16px' : '20px',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <span style={{ fontSize: isMobile ? '20px' : '24px' }}>🏊‍♂️</span>
            <span style={{ 
              color: 'white', 
              fontSize: isMobile ? '13px' : '15px', 
              fontWeight: '700', 
              letterSpacing: '0.5px' 
            }}>
              SWIMMING POOL COST ANALYSIS
            </span>
          </div>
          
          <h1 style={{
            fontSize: isMobile ? '32px' : '48px',
            fontWeight: '900',
            color: 'white',
            marginBottom: isMobile ? '8px' : '12px',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}>
            {showDetails ? 'Detailed Cost Breakdown' : 'Cost Distribution Overview'}
          </h1>
          
          <p style={{ 
            fontSize: isMobile ? '16px' : '18px', 
            color: '#94A3B8', 
            fontWeight: '500',
            lineHeight: 1.4,
            padding: isMobile ? '0 8px' : '0'
          }}>
            {showDetails ? 'Complete itemized breakdown of all cost components' : 'Visual analysis of your pool project investment'}
          </p>
        </div>

        {/* Content */}
        {showDetails ? <DetailedBreakdown /> : <MainOverview />}
      </div>
    </div>
  );
}

export default CostBreakdownChart;