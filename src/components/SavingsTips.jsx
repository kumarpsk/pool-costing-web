import React from "react";
import "./SavingsTips.css";

function SavingsTips({ onClose }) {
  return (
    <div onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cost Saving Tips for Pool Construction</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="savings-content">
          <div className="savings-category">
            <h3>🏗️ Construction Savings</h3>
            <div className="tip-card">
              <h4>Choose a Simple Design</h4>
              <p>Rectangular pools are generally less expensive than freeform designs with complex curves.</p>
              <span className="savings-estimate">Potential savings: 10-20%</span>
            </div>
            <div className="tip-card">
              <h4>Optimize Excavation</h4>
              <p>Schedule excavation during dry seasons and consider soil conditions before digging.</p>
              <span className="savings-estimate">Potential savings: 5-15%</span>
            </div>
            <div className="tip-card">
              <h4>Standard Depth Profile</h4>
              <p>Maintain consistent depth rather than multiple depth levels to reduce complexity.</p>
              <span className="savings-estimate">Potential savings: 5-10%</span>
            </div>
          </div>
          
          <div className="savings-category">
            <h3>🔧 Equipment Savings</h3>
            <div className="tip-card">
              <h4>Energy Efficient Pumps</h4>
              <p>Variable speed pumps may cost more initially but save significantly on electricity bills.</p>
              <span className="savings-estimate">Annual energy savings: 30-50%</span>
            </div>
            <div className="tip-card">
              <h4>Standard Filter Sizes</h4>
              <p>Choose commonly available filter sizes rather than custom options.</p>
              <span className="savings-estimate">Potential savings: 5-15%</span>
            </div>
            <div className="tip-card">
              <h4>LED Lighting</h4>
              <p>LED pool lights use less energy and last longer than traditional halogen lights.</p>
              <span className="savings-estimate">Potential savings: 40-60% on energy</span>
            </div>
          </div>
          
          <div className="savings-category">
            <h3>📅 Planning & Timing</h3>
            <div className="tip-card">
              <h4>Off-Season Construction</h4>
              <p>Schedule construction during fall or winter when contractors may offer discounts.</p>
              <span className="savings-estimate">Potential savings: 5-15%</span>
            </div>
            <div className="tip-card">
              <h4>Phased Construction</h4>
              <p>Consider building the basic pool now and adding features like heating or automation later.</p>
              <span className="savings-estimate">Improves cash flow management</span>
            </div>
            <div className="tip-card">
              <h4>Bundle Services</h4>
              <p>Use the same contractor for pool and landscaping to potentially negotiate better rates.</p>
              <span className="savings-estimate">Potential savings: 5-10%</span>
            </div>
          </div>
          
          <div className="savings-category">
            <h3>💰 Material Selection</h3>
            <div className="tip-card">
              <h4>Tile Choices</h4>
              <p>Standard ceramic tiles are more affordable than glass or mosaic tiles.</p>
              <span className="savings-estimate">Potential savings: 20-40%</span>
            </div>
            <div className="tip-card">
              <h4>Concrete Options</h4>
              <p>Shotcrete is often more cost-effective than gunite for similar strength characteristics.</p>
              <span className="savings-estimate">Potential savings: 5-15%</span>
            </div>
            <div className="tip-card">
              <h4>CopING Materials</h4>
              <p>Precast concrete coping is more affordable than natural stone options.</p>
              <span className="savings-estimate">Potential savings: 20-30%</span>
            </div>
          </div>
          
          <div className="important-notes">
            <h3>⚠️ Important Considerations</h3>
            <ul>
              <li>Never compromise on structural integrity or safety to save costs</li>
              <li>Check local building codes and regulations before making changes</li>
              <li>Consider long-term maintenance costs, not just initial construction</li>
              <li>Get multiple quotes and references for any contractor</li>
              <li>Ensure proper warranties are provided for all work and materials</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SavingsTips;