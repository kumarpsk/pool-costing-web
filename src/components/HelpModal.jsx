import React, { useState, useEffect } from "react";
import "./HelpModal.css";
import SavingsTips from "./SavingsTips";

function FloatingHelpModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [activeSection, setActiveSection] = useState("quicktips");

  // Load user preference from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('helpModalMinimized');
    if (savedState !== null) {
      setIsMinimized(JSON.parse(savedState));
    }
  }, []);

  // Save user preference to localStorage
  useEffect(() => {
    localStorage.setItem('helpModalMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  const toggleModal = () => {
    if (isMinimized) {
      setIsMinimized(false);
    }
    setIsVisible(!isVisible);
  };

  const minimizeModal = () => {
    setIsMinimized(true);
    setIsVisible(false);
  };

  // Seasonal construction data
  const constructionSeasons = [
    {
      name: "Spring",
      months: "March - May",
      advantages: [
        "Ideal weather conditions in most regions",
        "Complete before summer swimming season",
        "Contractors readily available after winter"
      ],
      disadvantages: [
        "Possible rain delays in some areas",
        "Higher demand may increase prices"
      ],
      recommendation: "Excellent time to start construction"
    },
    {
      name: "Summer",
      months: "June - August",
      advantages: [
        "Warm weather speeds up curing processes",
        "Long daylight hours allow more work time"
      ],
      disadvantages: [
        "Peak season may mean contractor shortages",
        "Higher prices due to demand",
        "Extreme heat in some regions can be challenging"
      ],
      recommendation: "Good but potentially more expensive"
    },
    {
      name: "Fall",
      months: "September - November",
      advantages: [
        "Moderate temperatures ideal for construction",
        "Contractors more available as demand decreases",
        "Potential for off-season discounts"
      ],
      disadvantages: [
        "Shorter daylight hours",
        "Weather becomes less predictable"
      ],
      recommendation: "One of the best times for construction"
    },
    {
      name: "Winter",
      months: "December - February",
      advantages: [
        "Lowest prices with significant discounts",
        "Highest contractor availability",
        "No disruption to summer swimming"
      ],
      disadvantages: [
        "Weather challenges in colder climates",
        "Frozen ground may require special equipment",
        "Shorter work days"
      ],
      recommendation: "Great for budgeting but weather-dependent"
    }
  ];

  return (
    <>
      {/* Floating Help Button */}
      <div className={`floating-help-button ${isMinimized ? '' : 'hidden'}`} onClick={toggleModal}>
        <span className="help-icon">❓</span>
        <span className="help-text">Help Guide</span>
      </div>

      {/* Help Modal */}
      {isVisible && (
        <div className="floating-help-modal-overlay" onClick={minimizeModal}>
          <div className="floating-help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="floating-modal-header">
              <h2>Pool Calculator Help Center</h2>
              <div className="floating-modal-actions">
                <button className="minimize-button" onClick={minimizeModal}>
                  −
                </button>
                <button className="close-button" onClick={minimizeModal}>
                  ×
                </button>
              </div>
            </div>
            
            <div className="floating-modal-tabs">
              <button 
                className={`tab-button ${activeSection === "quicktips" ? "active" : ""}`}
                onClick={() => setActiveSection("quicktips")}
              >
                Quick Tips
              </button>
              <button 
                className={`tab-button ${activeSection === "instructions" ? "active" : ""}`}
                onClick={() => setActiveSection("instructions")}
              >
                Instructions
              </button>
              <button 
                className={`tab-button ${activeSection === "seasons" ? "active" : ""}`}
                onClick={() => setActiveSection("seasons")}
              >
                Best Seasons
              </button>
              <button 
                className={`tab-button ${activeSection === "faqs" ? "active" : ""}`}
                onClick={() => setActiveSection("faqs")}
              >
                FAQs
              </button>
              <button 
                className={`tab-button ${activeSection === "resources" ? "active" : ""}`}
                onClick={() => setActiveSection("resources")}
              >
                Resources
              </button>
              
            </div>
            
            <div className="floating-modal-content">
              {activeSection === "quicktips" && (
                <div className="help-section">
                  <h3>🚀 Quick Start Guide</h3>
                  <div className="tip-card">
                    <h4>For New Users</h4>
                    <p>Start by entering your pool dimensions in the main calculator. The system will automatically generate estimates for all construction aspects.</p>
                  </div>
                  
                  <div className="tip-card">
                    <h4>Navigation Tips</h4>
                    <ul>
                      <li>Use the tabs to switch between different cost components</li>
                      <li>Save your calculations to compare different scenarios</li>
                      <li>Export results to PDF or Excel for sharing with contractors</li>
                      <li>Use the comparison tool to evaluate different pool sizes</li>
                    </ul>
                  </div>
                  
                  <div className="tip-card">
                    <h4>Cost Optimization</h4>
                    <ul>
                      <li>Simple rectangular shapes are most cost-effective</li>
                      <li>Consider standard equipment sizes for better pricing</li>
                      <li>Plan construction during off-peak seasons (fall/winter)</li>
                      <li>Bundle services with the same contractor for discounts</li>
                    </ul>
                  </div>
                  
                </div>
              )}
              
              {activeSection === "instructions" && (
                <div className="help-section">
                  <h3>📋 Step-by-Step Instructions</h3>
                  
                  <div className="instruction-card">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h4>Enter Pool Dimensions</h4>
                      <p>Start with the calculator page. Input length, width, and depth measurements. The system supports both rectangular and freeform shapes.</p>
                    </div>
                  </div>
                  
                  <div className="instruction-card">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h4>Review Calculations</h4>
                      <p>Examine the automatically generated results across different tabs: Main Pool, MEP Systems, Timeline, and Total Cost.</p>
                    </div>
                  </div>
                  
                  <div className="instruction-card">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h4>Customize Options</h4>
                      <p>Adjust material choices, equipment specifications, and additional features to match your preferences.</p>
                    </div>
                  </div>
                  
                  <div className="instruction-card">
                    <div className="step-number">4</div>
                    <div className="step-content">
                      <h4>Save and Compare</h4>
                      <p>Save your calculation to compare different scenarios. Use the comparison tool to evaluate options side by side.</p>
                    </div>
                  </div>
                  
                  <div className="instruction-card">
                    <div className="step-number">5</div>
                    <div className="step-content">
                      <h4>Export Results</h4>
                      <p>Generate professional PDF or Excel reports to share with contractors, lenders, or for your records.</p>
                    </div>
                  </div>
                  
                  <div className="instruction-card">
                    <div className="step-number">6</div>
                    <div className="step-content">
                      <h4>Plan Timeline</h4>
                      <p>Review the construction timeline and adjust based on your schedule and seasonal considerations.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {activeSection === "seasons" && (
                <div className="help-section">
                  <h3>🌤️ Best Seasons for Pool Construction</h3>
                  <p className="section-intro">Choosing the right time for pool construction can save you money and ensure a smoother process. Here's a seasonal guide:</p>
                  
                  <div className="seasonal-guide">
                    {constructionSeasons.map((season, index) => (
                      <div key={index} className="season-card">
                        <div className="season-header">
                          <h4>{season.name}</h4>
                          <span className="season-months">{season.months}</span>
                        </div>
                        
                        <div className="season-details">
                          <div className="pros-cons">
                            <div className="pros">
                              <h5>✅ Advantages</h5>
                              <ul>
                                {season.advantages.map((advantage, i) => (
                                  <li key={i}>{advantage}</li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="cons">
                              <h5>⚠️ Challenges</h5>
                              <ul>
                                {season.disadvantages.map((disadvantage, i) => (
                                  <li key={i}>{disadvantage}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          
                          <div className="recommendation">
                            <strong>Recommendation:</strong> {season.recommendation}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="regional-considerations">
                    <h4>Regional Considerations</h4>
                    <div className="region-cards">
                      <div className="region-card">
                        <h5>Northern Climates</h5>
                        <p>Spring and fall are ideal. Avoid winter due to frozen ground. Summer may have contractor shortages.</p>
                      </div>
                      <div className="region-card">
                        <h5>Southern Climates</h5>
                        <p>Fall and winter are best. Summer heat can be challenging for workers and materials.</p>
                      </div>
                      <div className="region-card">
                        <h5>Coastal Areas</h5>
                        <p>Consider dry seasons to avoid rain delays. Be mindful of hurricane seasons in certain regions.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeSection === "faqs" && (
                <div className="help-section">
                  <h3>❓ Frequently Asked Questions</h3>
                  
                  <div className="faq-category">
                    <h4>Calculation Questions</h4>
                    
                    <div className="faq-item">
                      <h5>How accurate are the cost estimates?</h5>
                      <p>Our estimates are based on current industry standards and average material costs. They typically fall within 10-15% of actual project costs, but may vary based on your location, specific material choices, and site conditions.</p>
                    </div>
                    
                    
                    
                    <div className="faq-item">
                      <h5>How often are material prices updated?</h5>
                      <p>We update our pricing database quarterly to reflect market changes. However, for the most accurate estimates, consult with local suppliers.</p>
                    </div>
                  </div>
                  
                  <div className="faq-category">
                    <h4>Technical Questions</h4>
                    
                    <div className="faq-item">
                      <h5>What pool shapes are supported?</h5>
                      <p>The calculator supports rectangular, oval, and freeform shapes. For complex custom shapes, the system approximates based on the dimensions you provide.</p>
                    </div>
                    
                    <div className="faq-item">
                      <h5>Can I save my calculations?</h5>
                      <p>Yes, you can save unlimited calculations to your account. They're stored securely and can be accessed from any device.</p>
                    </div>
                    
                    <div className="faq-item">
                      <h5>How do I share my estimates with contractors?</h5>
                      <p>Use the export feature to generate PDF or Excel reports that you can email directly to contractors. The reports include all necessary details for accurate quoting.</p>
                    </div>
                  </div>
                  
                  <div className="faq-category">
                    <h4>Construction Questions</h4>
                    
                    <div className="faq-item">
                      <h5>What's included in the main pool cost?</h5>
                      <p>This includes excavation, structural work, reinforcement, plumbing rough-in, shotcreting, waterproofing, tiling, and coping.</p>
                    </div>
                    
                    <div className="faq-item">
                      <h5>What's included in MEP costs?</h5>
                      <p>Mechanical, Electrical, and Plumbing components including filtration system, pumps, pipes, drains, inlets, lights, control systems, and electrical connections.</p>
                    </div>
                    
                    <div className="faq-item">
                      <h5>How long does pool construction typically take?</h5>
                      <p>Depending on size and complexity, construction typically takes 8-12 weeks from excavation to completion, not including planning and permit acquisition time.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {activeSection === "resources" && (
                <div className="help-section">
                  <h3>📚 Additional Resources</h3>
                  
                  <div className="resource-card">
                    <h4>Planning Your Pool</h4>
                    <ul>
                      <li><strong>Site Preparation Guide</strong> - How to prepare your yard for construction</li>
                      <li><strong>Zoning Regulations</strong> - Understanding local requirements</li>
                      <li><strong>Safety Compliance</strong> - Meeting safety standards for residential pools</li>
                    </ul>
                  </div>
                  
                  <div className="resource-card">
                    <h4>Maintenance Information</h4>
                    <ul>
                      <li><strong>Seasonal Maintenance Checklist</strong> - Year-round pool care</li>
                      <li><strong>Water Chemistry Guide</strong> - Balancing pH and chemicals</li>
                      <li><strong>Equipment Maintenance</strong> - Extending the life of your pool systems</li>
                    </ul>
                  </div>
                  
                  <div className="resource-card">
                    <h4>Energy Efficiency</h4>
                    <ul>
                      <li><strong>Variable Speed Pumps</strong> - Saving on energy costs</li>
                      <li><strong>Solar Heating Options</strong> - Environmentally friendly heating</li>
                      <li><strong>LED Lighting</strong> - Efficient pool illumination</li>
                    </ul>
                  </div>
                  
                  <div className="resource-card">
                    <h4>Downloadable Guides</h4>
                    <div className="download-links">
                      <button className="download-btn">Pool Planning Checklist</button>
                      <button className="download-btn">Contractor Questions</button>
                      <button className="download-btn">Maintenance Schedule</button>
                    </div>
                  </div>
                  
                  <div className="support-contact">
                    <h4>📞 Need Personalized Help?</h4>
                    <p>Our pool experts are available to answer your specific questions:</p>
                    <div className="contact-methods">
                      <p><strong>Email:</strong> support@poolcalculator.com</p>
                      <p><strong>Phone:</strong> 1-800-POOL-HELP (1-800-766-5435)</p>
                      <p><strong>Live Chat:</strong> Available weekdays 9AM-6PM EST</p>
                    </div>
                  </div>
                </div>
              )}
              
                
                  
                  
               
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FloatingHelpModal;