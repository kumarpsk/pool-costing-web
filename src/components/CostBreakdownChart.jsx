import React, { useState, useEffect } from "react";

function PremiumPoolDashboard({ 
  mainPoolCost = 0, 
  mepCost = 0, 
  pumpRoomCost = 0,
  currency = 'INR',
  equipmentDistance = 0,
  includePumpRoom = false,
  constructionType = 'in-ground',
  selectedAdvancedEquipment = [],
  advancedEquipmentTotal = 0,
  filteredMepItems = []
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [animProgress, setAnimProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  // Exchange rate
  const EXCHANGE_RATE = 83.0;

  const totalCost = mainPoolCost + mepCost + (includePumpRoom ? pumpRoomCost : 0);
  const mainPoolPercentage = totalCost > 0 ? (mainPoolCost / totalCost) * 100 : 0;
  const mepPercentage = totalCost > 0 ? (mepCost / totalCost) * 100 : 0;
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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const getCurrencySymbol = () => {
    return currency === 'USD' ? '$' : '₹';
  };

  const poolCategories = [
    { name: "Structural Works", value: mainPoolCost * 0.42, icon: "🏗️", color: "#8B5CF6", desc: "Foundation, walls & framework", percentage: 42 },
    { name: "Premium Finishes", value: mainPoolCost * 0.28, icon: "✨", color: "#EC4899", desc: "Tiles, coping & surfaces", percentage: 28 },
    { name: "Waterproofing", value: mainPoolCost * 0.18, icon: "💧", color: "#06B6D4", desc: "Membrane & sealing", percentage: 18 },
    { name: "Deck & Landscaping", value: mainPoolCost * 0.12, icon: "🌿", color: "#10B981", desc: "Surroundings & aesthetics", percentage: 12 }
  ];

  const pumpRoomCategories = [
    { name: "Civil Structure", value: pumpRoomCost * 0.35, icon: "🏭", color: "#8B5CF6", desc: "Room construction & foundation", percentage: 35 },
    { name: "Electrical Systems", value: pumpRoomCost * 0.25, icon: "⚡", color: "#F59E0B", desc: "Wiring, panels & lighting", percentage: 25 },
    { name: "Ventilation & Plumbing", value: pumpRoomCost * 0.20, icon: "💨", color: "#06B6D4", desc: "Air flow & water connections", percentage: 20 },
    { name: "Finishing & Safety", value: pumpRoomCost * 0.20, icon: "🎨", color: "#10B981", desc: "Interior finishes & safety", percentage: 20 }
  ];

  const mepCategories = [
    { name: "Filtration & Sanitation", value: mepCost * 0.38, icon: "⚙️", color: "#F59E0B", desc: "Advanced purification", percentage: 38 },
    { name: "Pumping Systems", value: mepCost * 0.26, icon: "🔧", color: "#EF4444", desc: "Circulation equipment", percentage: 26 },
    { name: "Smart Lighting", value: mepCost * 0.22, icon: "💡", color: "#3B82F6", desc: "LED & underwater lights", percentage: 22 },
    { name: "Automation & Controls", value: mepCost * 0.14, icon: "🎛️", color: "#6366F1", desc: "Smart pool tech", percentage: 14 }
  ];

  // Create sections array with all components
  const sections = [
    { 
      title: 'Pool Construction', 
      amount: mainPoolCost, 
      percentage: mainPoolPercentage, 
      icon: '🏊‍♂️', 
      color: '#8B5CF6', 
      items: poolCategories,
      show: mainPoolCost > 0
    },
    { 
      title: 'MEP Systems', 
      amount: mepCost, 
      percentage: mepPercentage, 
      icon: '⚙️', 
      color: '#EC4899', 
      items: mepCategories,
      show: mepCost > 0,
      advancedCount: selectedAdvancedEquipment.length
    },
    { 
      title: 'Pump Room', 
      amount: pumpRoomCost, 
      percentage: pumpRoomPercentage, 
      icon: '🏗️', 
      color: '#F59E0B', 
      items: pumpRoomCategories,
      show: includePumpRoom && pumpRoomCost > 0,
      constructionType: constructionType
    }
  ];

  // Filter visible sections
  const visibleSections = sections.filter(section => section.show);

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

  // Main Overview Chart Component
  const MainOverview = () => (
    <div style={{
      opacity: isLoaded ? 1 : 0,
      transform: isLoaded ? 'translateY(0)' : 'translateY(30px)',
      transition: 'all 0.8s ease'
    }}>
      {/* Currency Display */}
      <CurrencyDisplay />

      
      {/* Hero Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: isMobile ? '20px' : '40px',
        marginBottom: isMobile ? '40px' : '60px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(255,255,255,0.1)',
          borderRadius: isMobile ? '20px' : '32px',
          padding: isMobile ? '24px' : '48px',
          textAlign: 'center',
          minWidth: isMobile ? '100%' : '400px',
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
            letterSpacing: '1px' 
          }}>
            Total Investment
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
            Complete pool construction & systems
            {includePumpRoom && " + Pump Room"}
            {selectedAdvancedEquipment.length > 0 && ` + ${selectedAdvancedEquipment.length} Advanced Items`}
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

      {/* Large Comparison Chart */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: isMobile ? '20px' : '32px',
        marginBottom: isMobile ? '32px' : '48px'
      }}>
        {visibleSections.map((section, idx) => (
          <div key={idx} style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: isMobile ? '20px' : '32px',
            padding: isMobile ? '24px' : '48px',
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
            {/* Glow effect */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '200%',
              height: '200%',
              background: `radial-gradient(circle, ${section.color}20 0%, transparent 70%)`,
              pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative' }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: isMobile ? '24px' : '40px' }}>
                <div style={{
                  width: isMobile ? '60px' : '80px',
                  height: isMobile ? '60px' : '80px',
                  borderRadius: isMobile ? '16px' : '24px',
                  background: `linear-gradient(135deg, ${section.color} 0%, ${section.color}dd 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '32px' : '40px',
                  margin: '0 auto 16px',
                  boxShadow: `0 20px 60px ${section.color}60`
                }}>
                  {section.icon}
                </div>
                <h3 style={{ 
                  fontSize: isMobile ? '22px' : '28px', 
                  fontWeight: '800', 
                  color: 'white', 
                  margin: '0 0 8px 0',
                  lineHeight: 1.2
                }}>
                  {section.title}
                  {section.advancedCount > 0 && (
                    <span style={{
                      fontSize: '14px',
                      background: section.color,
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '20px',
                      marginLeft: '10px',
                      display: 'inline-block'
                    }}>
                      +{section.advancedCount}
                    </span>
                  )}
                </h3>
                {section.constructionType && (
                  <div style={{
                    fontSize: '14px',
                    color: section.color,
                    marginBottom: '8px',
                    opacity: 0.9
                  }}>
                    {section.constructionType === 'terrace' ? '🏢 Terrace Construction' : '⛰️ In-Ground Construction'}
                  </div>
                )}
                <div style={{ 
                  fontSize: isMobile ? '32px' : '40px', 
                  fontWeight: '900', 
                  color: section.color, 
                  marginBottom: '6px',
                  lineHeight: 1.1
                }}>
                  {formatCompact(section.amount * animProgress)}
                </div>
                <div style={{ 
                  fontSize: isMobile ? '16px' : '18px', 
                  color: '#94A3B8', 
                  fontWeight: '600' 
                }}>
                  {(section.percentage * animProgress).toFixed(1)}% of total
                </div>
                {currency === 'USD' && section.amount > 0 && (
                  <div style={{ 
                    fontSize: isMobile ? '13px' : '14px', 
                    color: section.color, 
                    marginTop: '4px',
                    opacity: 0.8
                  }}>
                    {formatCurrency(section.amount)}
                  </div>
                )}
              </div>

              {/* Donut Chart */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: isMobile ? '24px' : '32px' }}>
                <svg 
                  width={isMobile ? 200 : 280} 
                  height={isMobile ? 200 : 280} 
                  viewBox="0 0 280 280"
                >
                  <defs>
                    {section.items.map((item, i) => (
                      <linearGradient key={i} id={`grad-${idx}-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: item.color, stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: item.color, stopOpacity: 0.7 }} />
                      </linearGradient>
                    ))}
                    <filter id="shadow">
                      <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.3"/>
                    </filter>
                  </defs>
                  
                  <circle cx="140" cy="140" r="100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="40"/>
                  
                  {section.items.map((item, i) => {
                    const prevSum = section.items.slice(0, i).reduce((sum, it) => sum + it.percentage, 0);
                    const circumference = 2 * Math.PI * 100;
                    const offset = (prevSum / 100) * circumference;
                    const dashArray = (item.percentage / 100) * circumference * animProgress;
                    
                    return (
                      <circle
                        key={i}
                        cx="140"
                        cy="140"
                        r="100"
                        fill="none"
                        stroke={`url(#grad-${idx}-${i})`}
                        strokeWidth="40"
                        strokeDasharray={`${dashArray} ${circumference}`}
                        strokeDashoffset={-offset}
                        transform="rotate(-90 140 140)"
                        style={{
                          cursor: 'pointer',
                          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
                          transition: 'all 0.3s ease',
                          opacity: hoveredSegment === `${idx}-${i}` ? 1 : hoveredSegment ? 0.4 : 1
                        }}
                        onMouseEnter={!isMobile ? () => setHoveredSegment(`${idx}-${i}`) : undefined}
                        onMouseLeave={!isMobile ? () => setHoveredSegment(null) : undefined}
                      />
                    );
                  })}
                  
                  <circle cx="140" cy="140" r="70" fill="rgba(15, 23, 42, 0.95)" filter="url(#shadow)"/>
                  <text x="140" y="130" textAnchor="middle" style={{ 
                    fontSize: isMobile ? '14px' : '16px', 
                    fill: '#94A3B8', 
                    fontWeight: '600' 
                  }}>
                    Total
                  </text>
                  <text x="140" y="155" textAnchor="middle" style={{ 
                    fontSize: isMobile ? '20px' : '24px', 
                    fill: section.color, 
                    fontWeight: '900' 
                  }}>
                    {(section.percentage * animProgress).toFixed(0)}%
                  </text>
                </svg>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px' }}>
                {section.items.map((item, i) => (
                  <div
                    key={i}
                    onMouseEnter={!isMobile ? () => setHoveredSegment(`${idx}-${i}`) : undefined}
                    onMouseLeave={!isMobile ? () => setHoveredSegment(null) : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? '8px' : '12px',
                      padding: isMobile ? '10px 12px' : '12px 16px',
                      borderRadius: '12px',
                      background: hoveredSegment === `${idx}-${i}` ? 'rgba(255,255,255,0.1)' : 'transparent',
                      cursor: !isMobile ? 'pointer' : 'default',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{
                      width: isMobile ? '10px' : '12px',
                      height: isMobile ? '10px' : '12px',
                      borderRadius: '3px',
                      background: item.color,
                      flexShrink: 0
                    }} />
                    <span style={{ 
                      fontSize: isMobile ? '13px' : '14px', 
                      fontWeight: '600', 
                      color: 'white', 
                      flex: 1 
                    }}>
                      {item.name}
                    </span>
                    <span style={{ 
                      fontSize: isMobile ? '13px' : '14px', 
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

      {/* Advanced Equipment Summary */}
      {selectedAdvancedEquipment.length > 0 && (
        <div style={{
          background: 'rgba(236, 72, 153, 0.1)',
          border: '1px solid #EC489940',
          borderRadius: '16px',
          padding: isMobile ? '20px' : '24px',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '24px' }}>⚙️</span>
            <h4 style={{ color: 'white', fontSize: '18px', fontWeight: '600', margin: 0 }}>
              Selected Advanced Equipment ({selectedAdvancedEquipment.length})
            </h4>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {filteredMepItems
              .filter(item => selectedAdvancedEquipment.includes(item.SlNo))
              .map(item => (
                <div key={item.SlNo} style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: '12px',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#94A3B8', fontSize: '14px' }}>{item.Description}</span>
                  <span style={{ color: '#EC4899', fontWeight: '600' }}>
                    {formatCompact(item.Rate || 0)}
                  </span>
                </div>
              ))}
          </div>
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: 'white', fontWeight: '600' }}>Advanced Equipment Total:</span>
            <span style={{ color: '#EC4899', fontSize: '18px', fontWeight: '700' }}>
              {formatCompact(advancedEquipmentTotal)}
            </span>
          </div>
        </div>
      )}

      {/* CTA Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => setShowDetailed(true)}
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
    <div style={{
      animation: 'fadeIn 0.5s ease'
    }}>
      {/* Currency Display */}
      <CurrencyDisplay />

      {/* Back Button */}
      <div style={{ marginBottom: isMobile ? '24px' : '40px' }}>
        <button
          onClick={() => setShowDetailed(false)}
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
          onMouseEnter={!isMobile ? (e) => {
            e.target.style.background = 'rgba(255,255,255,0.15)';
          } : undefined}
          onMouseLeave={!isMobile ? (e) => {
            e.target.style.background = 'rgba(255,255,255,0.1)';
          } : undefined}
        >
          <span>←</span>
          <span>Back to Overview</span>
        </button>
      </div>

      {/* Pump Room Summary Banner */}
      {includePumpRoom && pumpRoomCost > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #F59E0B20 0%, #F59E0B40 100%)',
          border: '1px solid #F59E0B40',
          borderRadius: '16px',
          padding: isMobile ? '16px' : '20px',
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <span style={{ color: '#F59E0B', fontWeight: '700', fontSize: '18px' }}>
              Pump Room Construction Details
            </span>
            <span style={{ color: '#94A3B8', marginLeft: '12px', fontSize: '14px' }}>
              {constructionType === 'terrace' ? '🏢 Terrace Type' : '⛰️ In-Ground Type'}
            </span>
          </div>
          <div style={{ 
            background: 'rgba(245, 158, 11, 0.2)',
            padding: '8px 16px',
            borderRadius: '12px'
          }}>
            <span style={{ color: '#F59E0B', fontWeight: '700', fontSize: '20px' }}>
              {formatCompact(pumpRoomCost)}
            </span>
          </div>
        </div>
      )}

      {/* Detailed Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(600px, 1fr))',
        gap: isMobile ? '20px' : '32px'
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
                {section.constructionType && (
                  <div style={{ 
                    fontSize: '14px', 
                    color: section.color, 
                    marginBottom: '4px' 
                  }}>
                    {section.constructionType === 'terrace' ? '🏢 Terrace Construction' : '⛰️ In-Ground Construction'}
                  </div>
                )}
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

            {/* Horizontal Bars */}
            <div style={{ marginBottom: isMobile ? '24px' : '32px' }}>
              {section.items.map((item, i) => {
                const maxValue = Math.max(...section.items.map(it => it.value));
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
                            {item.name}
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
                          {formatCompact(item.value)}
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
                            {formatCurrency(item.value)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{
                      height: isMobile ? '12px' : '16px',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '999px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(item.value / maxValue) * 100}%`,
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

            {/* Section Total */}
            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'white', fontWeight: '600' }}>Section Total:</span>
              <span style={{ color: section.color, fontSize: '18px', fontWeight: '700' }}>
                {formatCompact(section.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Equipment Detailed Breakdown */}
      {selectedAdvancedEquipment.length > 0 && (
        <div style={{
          marginTop: '32px',
          background: 'rgba(236, 72, 153, 0.1)',
          border: '1px solid #EC489940',
          borderRadius: '16px',
          padding: isMobile ? '20px' : '24px'
        }}>
          <h4 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Selected Advanced Equipment Details
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '12px'
          }}>
            {filteredMepItems
              .filter(item => selectedAdvancedEquipment.includes(item.SlNo))
              .map(item => (
                <div key={item.SlNo} style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: '16px',
                  borderRadius: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#94A3B8', fontSize: '14px' }}>SlNo {item.SlNo}</span>
                    <span style={{ color: '#EC4899', fontWeight: '600' }}>{formatCompact(item.Rate || 0)}</span>
                  </div>
                  <div style={{ color: 'white', fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>
                    {item.Description}
                  </div>
                  {item.Code && (
                    <div style={{ color: '#64748B', fontSize: '12px' }}>Code: {item.Code}</div>
                  )}
                </div>
              ))}
          </div>
          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: 'white', fontWeight: '600', fontSize: '16px' }}>Advanced Equipment Total:</span>
            <span style={{ color: '#EC4899', fontSize: '20px', fontWeight: '700' }}>
              {formatCompact(advancedEquipmentTotal)}
            </span>
          </div>
        </div>
      )}

      {/* Grand Total Summary */}
      <div style={{
        marginTop: '40px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)',
        borderRadius: '20px',
        padding: isMobile ? '24px' : '32px'
      }}>
        <h4 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
          Total Investment Summary
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94A3B8' }}>Main Pool Construction:</span>
            <span style={{ color: '#8B5CF6', fontWeight: '600' }}>{formatCompact(mainPoolCost)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94A3B8' }}>MEP Systems:</span>
            <span style={{ color: '#EC4899', fontWeight: '600' }}>{formatCompact(mepCost)}</span>
          </div>
          {includePumpRoom && pumpRoomCost > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94A3B8' }}>Pump Room Construction:</span>
              <span style={{ color: '#F59E0B', fontWeight: '600' }}>{formatCompact(pumpRoomCost)}</span>
            </div>
          )}
          <div style={{
            marginTop: '12px',
            paddingTop: '16px',
            borderTop: '2px solid rgba(255,255,255,0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>Subtotal:</span>
            <span style={{ color: 'white', fontSize: '20px', fontWeight: '800' }}>
              {formatCompact(totalCost)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94A3B8' }}>GST (18%):</span>
            <span style={{ color: '#10B981', fontWeight: '600' }}>{formatCompact(totalCost * 0.18)}</span>
          </div>
          <div style={{
            marginTop: '8px',
            paddingTop: '16px',
            borderTop: '2px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: '#10B981', fontSize: '20px', fontWeight: '800' }}>Grand Total (incl. GST):</span>
            <span style={{ color: '#10B981', fontSize: '24px', fontWeight: '900' }}>
              {formatCompact(totalCost * 1.18)}
            </span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div style={{
        marginTop: isMobile ? '32px' : '48px',
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
          💡 Investment Insights
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: isMobile ? '16px' : '24px'
        }}>
          {[
            { icon: '💎', title: 'Premium Materials', desc: 'High-grade finishes ensuring 20+ years longevity', color: '#8B5CF6' },
            { icon: '⚡', title: 'Smart Technology', desc: 'Automated controls reducing energy costs by 40%', color: '#EC4899' },
            { icon: '🛡️', title: 'Warranty Coverage', desc: 'Comprehensive 5-year warranty on all components', color: '#06B6D4' },
            { icon: '🏗️', title: 'Optimized Infrastructure', desc: `Pump room sized for ${constructionType === 'terrace' ? 'terrace' : 'in-ground'} efficiency`, color: '#F59E0B' },
            { icon: '🔧', title: 'Professional Installation', desc: 'Expert installation ensuring system reliability', color: '#EF4444' },
            { icon: '📊', title: 'Cost Efficiency', desc: 'Optimized design reducing long-term operational costs', color: '#10B981' }
          ].map((insight, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: isMobile ? '12px' : '16px',
              padding: isMobile ? '16px' : '20px',
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
                background: `linear-gradient(135deg, ${insight.color} 0%, ${insight.color}dd 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '20px' : '24px',
                flexShrink: 0,
                boxShadow: `0 8px 24px ${insight.color}40`
              }}>
                {insight.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: isMobile ? '15px' : '16px', 
                  fontWeight: '700', 
                  color: 'white', 
                  marginBottom: '4px',
                  lineHeight: 1.3
                }}>
                  {insight.title}
                </div>
                <div style={{ 
                  fontSize: isMobile ? '13px' : '14px', 
                  color: '#94A3B8', 
                  lineHeight: 1.4 
                }}>
                  {insight.desc}
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
              PREMIUM POOL INVESTMENT
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
            {showDetailed ? 'Detailed Cost Analysis' : 'Investment Overview'}
          </h1>
          
          <p style={{ 
            fontSize: isMobile ? '16px' : '18px', 
            color: '#94A3B8', 
            fontWeight: '500',
            lineHeight: 1.4,
            padding: isMobile ? '0 8px' : '0'
          }}>
            {showDetailed ? 'Complete breakdown of all cost components' : 'High-level summary of your pool investment'}
            {includePumpRoom && " including Pump Room"}
            {selectedAdvancedEquipment.length > 0 && ` with ${selectedAdvancedEquipment.length} Advanced Equipment`}
          </p>
        </div>

        {/* Content */}
        {showDetailed ? <DetailedBreakdown /> : <MainOverview />}
      </div>
    </div>
  );
}

export default PremiumPoolDashboard;