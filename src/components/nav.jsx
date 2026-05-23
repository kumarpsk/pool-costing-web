import React, { useState, useEffect, useCallback } from 'react';
import './nav.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Nav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // ========================================== //
  // 🚀 STATE MANAGEMENT - Keep original _2 suffix
  // ========================================== //
  
  const [isScrolled_2, setIsScrolled_2] = useState(false);
  const [mobileMenuOpen_2, setMobileMenuOpen_2] = useState(false);
  const [isLoggedIn_2, setIsLoggedIn_2] = useState(!!localStorage.getItem("tenant_admin_token"));
  const [activeDropdown_2, setActiveDropdown_2] = useState(null);
  const [isLoading_2, setIsLoading_2] = useState(false);
  
  // ✅ BRANDING STATE - ALWAYS loads, NEVER depends on auth token
  const [companyData, setCompanyData] = useState(null);
  const [brandingLoading_2, setBrandingLoading_2] = useState(true);

  // ========================================== //
  // 🚀 PUBLIC BRANDING FETCH - USES COMPANY CODE
  // ========================================== //

  const fetchPublicBranding = useCallback(async () => {
    setBrandingLoading_2(true);
    
    const companyCode = localStorage.getItem("tenant_company_code");
    
    if (!companyCode) {
      console.log('⚠️ No company code found, using fallback branding');
      loadCachedBranding();
      setBrandingLoading_2(false);
      return;
    }
    
    try {
      console.log(`🔄 Fetching public branding for company: ${companyCode}`);
      
      const response = await fetch(`https://pool-costing-api.intelithon.in/admin/tenant/public-profile?company_code=${companyCode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        const profile = data.data;
        
        console.log('✅ Public branding fetched successfully:', profile.company_name);
        
        setCompanyData(profile);
        
        localStorage.setItem("tenant_company_profile", JSON.stringify({
          company_name: profile.company_name,
          company_code: profile.company_code,
          logo_url: profile.logo_url,
          tagline: profile.tagline,
          phone: profile.phone,
          email: profile.email,
          is_fallback: profile.is_fallback || false,
          timestamp: new Date().toISOString()
        }));
        
        if (profile.company_code) {
          localStorage.setItem("tenant_company_code", profile.company_code);
        }
      } else {
        console.log('⚠️ API returned no data, falling back to cache');
        loadCachedBranding();
      }
    } catch (error) {
      console.error('❌ Error fetching public branding:', error);
      loadCachedBranding();
    } finally {
      setBrandingLoading_2(false);
    }
  }, []);

  const loadCachedBranding = useCallback(() => {
    try {
      const cached = localStorage.getItem("tenant_company_profile");
      if (cached) {
        const parsed = JSON.parse(cached);
        setCompanyData(parsed);
        console.log('✅ Loaded branding from localStorage cache');
      } else {
        setCompanyData({
          company_name: "Intelithon",
          logo_url: null,
          tagline: "Technologies",
          is_fallback: true
        });
        console.log('ℹ️ No cached branding found, using defaults');
      }
    } catch (e) {
      console.error('❌ Error loading cached branding:', e);
      setCompanyData({
        company_name: "Intelithon",
        logo_url: null,
        tagline: "Technologies",
        is_fallback: true
      });
    }
  }, []);

  // ========================================== //
  // 🚀 LOGOUT
  // ========================================== //

  const handleLogout_2 = useCallback(async () => {
    setIsLoading_2(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    localStorage.removeItem("tenant_admin_token");
    localStorage.removeItem("tenant_user");
    localStorage.removeItem("token");
    
    setIsLoggedIn_2(false);
    setMobileMenuOpen_2(false);
    setActiveDropdown_2(null);
    setIsLoading_2(false);
    
    navigate("/skimmer");
    
    console.log('✅ Logout successful');
  }, [navigate]);

  // ========================================== //
  // 🚀 HELPER FUNCTIONS
  // ========================================== //

  const getLogoSrc = useCallback(() => {
    if (companyData?.logo_url) {
      let logoUrl = companyData.logo_url;
      logoUrl = logoUrl.replace(/\\/g, "/");
      
      if (logoUrl.startsWith("http")) {
        return `${logoUrl}${logoUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      } else {
        const cleanPath = logoUrl.replace(/^\/+/, "");
        return `https://pool-costing-api.intelithon.in/${cleanPath}?t=${Date.now()}`;
      }
    }
    return '';
  }, [companyData]);

  useEffect(() => {
    const tokenExists = !!localStorage.getItem("tenant_admin_token");
    setIsLoggedIn_2(tokenExists);
  }, [location]);

  // ========================================== //
  // 🚀 FIXED SCROLL HANDLER - NO BLINKING
  // ========================================== //

  useEffect(() => {
    let ticking = false;
    let lastScrollY = window.scrollY;
    const SCROLL_THRESHOLD = 50; // Only trigger after 50px scroll

    const handleScroll_2 = () => {
      // Use requestAnimationFrame to throttle scroll events
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          // Only update if scroll position crosses the threshold
          if (currentScrollY > SCROLL_THRESHOLD && !isScrolled_2) {
            setIsScrolled_2(true);
          } else if (currentScrollY <= SCROLL_THRESHOLD && isScrolled_2) {
            setIsScrolled_2(false);
          }
          
          lastScrollY = currentScrollY;
          ticking = false;
        });
        
        ticking = true;
      }
    };
    
    // Use passive listener for better performance
    window.addEventListener('scroll', handleScroll_2, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll_2);
  }, [isScrolled_2]); // Add isScrolled_2 as dependency

  // ========================================== //
  // 🚀 INITIALIZATION
  // ========================================== //

  useEffect(() => {
    fetchPublicBranding();
    
    const brandingInterval = setInterval(() => {
      fetchPublicBranding();
    }, 1800000);
    
    return () => clearInterval(brandingInterval);
  }, [fetchPublicBranding]);

  useEffect(() => {
    const handleCompanyProfileUpdate = () => {
      fetchPublicBranding();
    };

    window.addEventListener("companyProfileUpdated", handleCompanyProfileUpdate);
    return () => {
      window.removeEventListener("companyProfileUpdated", handleCompanyProfileUpdate);
    };
  }, [fetchPublicBranding]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'tenant_company_profile' && e.newValue) {
        try {
          setCompanyData(JSON.parse(e.newValue));
        } catch (error) {
          console.error('Error parsing storage change:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    setMobileMenuOpen_2(false);
    setActiveDropdown_2(null);
  }, [location]);

  useEffect(() => {
    if (mobileMenuOpen_2) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [mobileMenuOpen_2]);

  const navItems_2 = [
    { path: '/skimmer', label: 'Skimmer Pool', icon: '💧', description: 'Traditional pool design' },
    { path: '/overflow', label: 'Overflow Pool', icon: '🌊', description: 'Elegant overflow style' },
    { path: '/infinity', label: 'Infinity Pool', icon: '∞', description: 'Limitless horizon view' },
    { path: '/curved', label: 'FreeForm Pool', icon: '🔷', description: 'Custom curved design' },
    { path: '/jacuzzi-spa', label: 'Jacuzzi & Spa', icon: '♨️', description: 'Relaxation & therapy' },
    { path: '/water-body', label: 'Water Body', icon: '💦', description: 'Custom water features' },
  ];

  const closeMobileMenu_2 = useCallback(() => {
    setMobileMenuOpen_2(false);
    setActiveDropdown_2(null);
  }, []);

  const toggleMobileMenu_2 = useCallback(() => {
    setMobileMenuOpen_2(prev => !prev);
  }, []);

  const handleNavClick_2 = useCallback((path) => {
    closeMobileMenu_2();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [closeMobileMenu_2]);

  // ========================================== //
  // 🚀 LOGO COMPONENT
  // ========================================== //

  const Logo_2 = ({ className_2 = "", width_2 = 380, height_2 = 200 }) => {
    const logoSrc = getLogoSrc();
    
    const handleImageError = (e) => {
      e.target.onerror = null;
      e.target.src = '/INt.png';
    };

    return (
      <img 
        className={`${className_2} ${brandingLoading_2 ? 'loading_2' : ''}`}
        src={logoSrc}
        alt="Company Logo"
        width={width_2}
        height={height_2}
        loading="eager"
        onError={handleImageError}
      />
    );
  };

  // ========================================== //
  // 🚀 RENDER - BRANDING ALWAYS VISIBLE
  // ========================================== //

  return (
    <>
      <nav 
        className={`nav-container_2 ${isScrolled_2 ? 'scrolled_2' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="nav-content_2">
          
          {/* ===== BRAND SECTION ===== */}
          <div className="nav-brand_2">
            <Link 
              to="/skimmer" 
              className="brand-link_2"
              onClick={() => handleNavClick_2('/skimmer')}
              aria-label="Go to home page"
            >
              <Logo_2 className_2="nav-logo_2" />
            </Link>
          </div>

          {/* ===== DESKTOP NAVIGATION LINKS ===== */}
          <div className="nav-center_2">
            <ul className="nav-list_2" role="menubar">
              {navItems_2.map(({ path, label, icon, description }) => (
                <li key={path} className="nav-item_2" role="none">
                  <Link
                    to={path}
                    className={`nav-link_2 ${location.pathname === path ? 'active_2' : ''}`}
                    role="menuitem"
                    onClick={() => handleNavClick_2(path)}
                    title={description}
                  >
                    <span className="nav-icon_2" aria-hidden="true">{icon}</span>
                    <span className="nav-text_2">{label}</span>
                    <span className="nav-indicator_2"></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ===== DESKTOP ADMIN ACTIONS ===== */}
          <div className="nav-actions_2">
            <div className="admin-panel_2 desktop-admin_2">
              {isLoggedIn_2 ? (
                <div className="admin-buttons-group_2">
                  <Link to="/admindashboard" className="admin-link_2">
                    <button 
                      className="admin-button_2 dashboard-button_2" 
                      aria-label="Go to admin dashboard"
                      title="Admin Dashboard"
                    >
                      <span className="admin-icon_2" aria-hidden="true">📊</span>
                      <span className="admin-text_2">Dashboard</span>
                    </button>
                  </Link>
                  
                  <button 
                    className={`admin-button_2 logout-button_2 ${isLoading_2 ? 'loading_2' : ''}`}
                    onClick={handleLogout_2}
                    disabled={isLoading_2}
                    aria-label="Logout from admin panel"
                    title="Logout"
                  >
                    <span className="admin-icon_2" aria-hidden="true">
                      {isLoading_2 ? '⏳' : '🚪'}
                    </span>
                    <span className="admin-text_2">
                      {isLoading_2 ? 'Logging out...' : 'Logout'}
                    </span>
                  </button>
                </div>
              ) : (
                <Link to="/admin1" className="admin-link_2">
                  <button 
                    className="admin-button_2 login-button_2" 
                    aria-label="Go to admin panel"
                    title="Admin Login"
                  >
                    <span className="admin-icon_2" aria-hidden="true">⚙️</span>
                    <span className="admin-text_2">Admin</span>
                  </button>
                </Link>
              )}
            </div>

            {/* Mobile Menu Toggle Button */}
            <button 
              className={`mobile-menu-button_2 ${mobileMenuOpen_2 ? 'open_2' : ''}`}
              onClick={toggleMobileMenu_2}
              aria-label={mobileMenuOpen_2 ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen_2}
              aria-controls="mobile-navigation_2"
            >
              <span className="hamburger-line_2"></span>
              <span className="hamburger-line_2"></span>
              <span className="hamburger-line_2"></span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="nav-progress_2">
          <div className="nav-progress-bar_2"></div>
        </div>
      </nav>

      {/* ===== MOBILE NAVIGATION MENU ===== */}
      <div 
        id="mobile-navigation_2"
        className={`mobile-nav_2 ${mobileMenuOpen_2 ? 'open_2' : ''}`}
        aria-hidden={!mobileMenuOpen_2}
        role="dialog"
        aria-modal="true"
      >
        <div className="mobile-nav-header_2">
          <div className="mobile-nav-brand_2">
            <Logo_2 className_2="mobile-nav-logo_2" width_2={160} height_2={80} />
          </div>
          <button 
            className="mobile-close-button_2"
            onClick={closeMobileMenu_2}
            aria-label="Close navigation menu"
          >
            <span className="close-icon_2">×</span>
          </button>
        </div>

        <div className="mobile-nav-content_2">
          <ul className="mobile-nav-list_2" role="menu">
            {navItems_2.map(({ path, label, icon, description }) => (
              <li key={path} className="mobile-nav-item_2" role="none">
                <Link
                  to={path}
                  className={`mobile-nav-link_2 ${location.pathname === path ? 'active_2' : ''}`}
                  role="menuitem"
                  onClick={() => handleNavClick_2(path)}
                >
                  <div className="mobile-link-content_2">
                    <span className="mobile-nav-icon_2" aria-hidden="true">{icon}</span>
                    <div className="mobile-link-text_2">
                      <span className="mobile-nav-label_2">{label}</span>
                      <span className="mobile-nav-description_2">{description}</span>
                    </div>
                  </div>
                  {location.pathname === path && (
                    <span className="mobile-active-indicator_2" aria-hidden="true">✓</span>
                  )}
                </Link>
              </li>
            ))}
            
            <li className="mobile-nav-divider_2" role="separator"></li>
            
            <li className="mobile-nav-item_2 mobile-admin-item_2" role="none">
              {isLoggedIn_2 ? (
                <div className="mobile-admin-group_2">
                  <Link
                    to="/admindashboard"
                    className="mobile-nav-link_2 mobile-admin-link_2"
                    role="menuitem"
                    onClick={() => handleNavClick_2('/admindashboard')}
                  >
                    <div className="mobile-link-content_2">
                      <span className="mobile-nav-icon_2" aria-hidden="true">📊</span>
                      <div className="mobile-link-text_2">
                        <span className="mobile-nav-label_2">Dashboard</span>
                        <span className="mobile-nav-description_2">Admin controls</span>
                      </div>
                    </div>
                  </Link>
                  
                  <button 
                    className={`mobile-nav-link_2 mobile-nav-button_2 mobile-logout_2 ${isLoading_2 ? 'loading_2' : ''}`}
                    onClick={handleLogout_2}
                    disabled={isLoading_2}
                    role="menuitem"
                  >
                    <div className="mobile-link-content_2">
                      <span className="mobile-nav-icon_2" aria-hidden="true">
                        {isLoading_2 ? '⏳' : '🚪'}
                      </span>
                      <div className="mobile-link-text_2">
                        <span className="mobile-nav-label_2">
                          {isLoading_2 ? 'Logging out...' : 'Logout'}
                        </span>
                        <span className="mobile-nav-description_2">Sign out</span>
                      </div>
                    </div>
                  </button>
                </div>
              ) : (
                <Link
                  to="/admin1"
                  className="mobile-nav-link_2 mobile-admin-link_2"
                  role="menuitem"
                  onClick={() => handleNavClick_2('/admin1')}
                >
                  <div className="mobile-link-content_2">
                    <span className="mobile-nav-icon_2" aria-hidden="true">⚙️</span>
                    <div className="mobile-link-text_2">
                      <span className="mobile-nav-label_2">Admin</span>
                      <span className="mobile-nav-description_2">Administrator login</span>
                    </div>
                  </div>
                </Link>
              )}
            </li>
          </ul>

          <div className="mobile-nav-footer_2">
            <p className="footer-text_2">© 2025 Company Name</p>
            <p className="footer-tagline_2">Premium Pool Solutions</p>
          </div>
        </div>
      </div>

      <div 
        className={`mobile-nav-overlay_2 ${mobileMenuOpen_2 ? 'active_2' : ''}`}
        onClick={closeMobileMenu_2}
        aria-hidden="true"
      />
    </>
  );
};

export default Nav;