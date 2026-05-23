// TenantProfile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TenantProfile.css';

const TenantProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState({
    companyName: '',
    ownerName: '',
    gstin: '',
    address: '',
    phone: '',
    email: ''
  });
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('tenant_token');
    if (!token) {
      navigate('/tenant/login');
      return;
    }

    fetchProfile();
  }, [navigate]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('tenant_token');
      
      const response = await fetch('https://pool-costing-api.intelithon.in/admin/admin/tenant/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch profile');
      }

      setProfile({
        companyName: data.companyName || '',
        ownerName: data.ownerName || '',
        gstin: data.gstin || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || ''
      });

      if (data.logo) {
        setLogoPreview(data.logo);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('tenant_token');
      
      const formDataToSend = new FormData();
      Object.keys(profile).forEach(key => {
        formDataToSend.append(key, profile[key]);
      });
      
      if (logo) {
        formDataToSend.append('logo', logo);
      }

      const response = await fetch('http://localhost:5000/api/tenant/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <header className="profile-header">
          <h1>Profile Settings</h1>
          <p className="subtitle">Manage your tenant account information</p>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {/* Logo Upload Section */}
          <div className="logo-section">
            <div className="logo-preview">
              {logoPreview ? (
                <img src={logoPreview} alt="Company Logo" />
              ) : (
                <div className="logo-placeholder">
                  <span>Add Logo</span>
                </div>
              )}
            </div>
            
            <div className="logo-upload">
              <label className="file-upload-btn">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="file-input"
                />
                Choose Logo
              </label>
              <p className="file-hint">Recommended: Square image, max 2MB</p>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Company Name *</label>
              <input
                type="text"
                name="companyName"
                value={profile.companyName}
                onChange={handleChange}
                placeholder="Enter company name"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Owner Name *</label>
              <input
                type="text"
                name="ownerName"
                value={profile.ownerName}
                onChange={handleChange}
                placeholder="Enter owner name"
                required
              />
            </div>
            
            <div className="form-group">
              <label>GSTIN *</label>
              <input
                type="text"
                name="gstin"
                value={profile.gstin}
                onChange={handleChange}
                placeholder="Enter GSTIN"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Phone *</label>
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleChange}
                placeholder="Enter email"
                required
                disabled
              />
              <p className="field-hint">Email cannot be changed</p>
            </div>
            
            <div className="form-group full-width">
              <label>Address *</label>
              <textarea
                name="address"
                value={profile.address}
                onChange={handleChange}
                placeholder="Enter full address"
                rows="4"
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/tenant/subscription')}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner"></span>
                  Saving...
                </>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantProfile;