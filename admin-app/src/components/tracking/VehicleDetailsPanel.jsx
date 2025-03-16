// admin-app/src/components/tracking/VehicleDetailsPanel.jsx
import React from 'react';
import './VehicleDetailsPanel.css';

const VehicleDetailsPanel = ({ 
  vehicle, 
  driver, 
  locationData, 
  onClose 
}) => {
  if (!vehicle) {
    return null;
  }
  
  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + ' ' + date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  
  // Calculate time since last update
  const getTimeSinceUpdate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const now = new Date();
    const updateTime = new Date(timestamp);
    const diffMs = now - updateTime;
    
    // Convert to appropriate unit
    if (diffMs < 60000) {
      return `${Math.floor(diffMs / 1000)} seconds ago`;
    } else if (diffMs < 3600000) {
      return `${Math.floor(diffMs / 60000)} minutes ago`;
    } else if (diffMs < 86400000) {
      return `${Math.floor(diffMs / 3600000)} hours ago`;
    } else {
      return `${Math.floor(diffMs / 86400000)} days ago`;
    }
  };
  
  // Format coordinates
  const formatLocation = (lat, lng) => {
    if (lat === undefined || lng === undefined) return 'N/A';
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };
  
  // Determine status message
  const getVehicleStatus = () => {
    if (!locationData) return 'Unknown';
    
    if (locationData.is_moving) {
      return 'Moving';
    } else {
      return 'Stopped';
    }
  };
  
  return (
    <div className="vehicle-details-panel">
      <div className="details-header">
        <h3>Vehicle Details</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="details-content">
        {/* Vehicle Information Section */}
        <div className="details-section">
          <h4>
            <i className="bi bi-truck"></i> 
            Vehicle Information
          </h4>
          
          <div className="details-grid">
            <div className="detail-label">Registration</div>
            <div className="detail-value">{vehicle.registration_number}</div>
            
            <div className="detail-label">Make</div>
            <div className="detail-value">{vehicle.make}</div>
            
            <div className="detail-label">Model</div>
            <div className="detail-value">{vehicle.model}</div>
            
            <div className="detail-label">Year</div>
            <div className="detail-value">{vehicle.year || 'N/A'}</div>
            
            <div className="detail-label">Status</div>
            <div className="detail-value">
              <span className={`status-indicator ${locationData?.is_moving ? 'moving' : 'stopped'}`}>
                {getVehicleStatus()}
              </span>
            </div>
          </div>
        </div>
        
        {/* Driver Information Section */}
        {driver && (
          <div className="details-section">
            <h4>
              <i className="bi bi-person"></i> 
              Driver Information
            </h4>
            
            <div className="details-grid">
              <div className="detail-label">Name</div>
              <div className="detail-value">{driver.full_name}</div>
              
              <div className="detail-label">Email</div>
              <div className="detail-value">{driver.email}</div>
              
              <div className="detail-label">Phone</div>
              <div className="detail-value">{driver.phone || 'N/A'}</div>
            </div>
          </div>
        )}
        
        {/* Location Information Section */}
        {locationData && (
          <div className="details-section">
            <h4>
              <i className="bi bi-geo-alt"></i> 
              Location Information
            </h4>
            
            <div className="details-grid">
              <div className="detail-label">Coordinates</div>
              <div className="detail-value">
                {formatLocation(locationData.latitude, locationData.longitude)}
              </div>
              
              <div className="detail-label">Speed</div>
              <div className="detail-value">
                {locationData.speed !== undefined ? `${Math.round(locationData.speed)} km/h` : 'N/A'}
              </div>
              
              <div className="detail-label">Heading</div>
              <div className="detail-value">
                {locationData.heading !== undefined ? `${Math.round(locationData.heading)}°` : 'N/A'}
              </div>
              
              <div className="detail-label">Last Updated</div>
              <div className="detail-value">
                {formatTime(locationData.timestamp)}
                <div className="secondary-text">
                  {getTimeSinceUpdate(locationData.timestamp)}
                </div>
              </div>
              
              {locationData.battery_level !== undefined && (
                <>
                  <div className="detail-label">Battery</div>
                  <div className="detail-value">
                    <div className="battery-indicator">
                      <div 
                        className="battery-level" 
                        style={{ 
                          width: `${locationData.battery_level}%`,
                          backgroundColor: locationData.battery_level < 20 ? '#e74c3c' : 
                                          locationData.battery_level < 50 ? '#f39c12' : '#2ecc71'
                        }}
                      ></div>
                    </div>
                    <span className="battery-text">{locationData.battery_level}%</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="details-actions">
          <button className="action-button primary">
            <i className="bi bi-telephone"></i> Call Driver
          </button>
          <button className="action-button secondary">
            <i className="bi bi-chat"></i> Message
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailsPanel;