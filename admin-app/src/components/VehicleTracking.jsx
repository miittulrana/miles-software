// admin-app/src/components/VehicleTracking.jsx
import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Card, Form, Alert, Spinner } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import VehicleDetailsPanel from './tracking/VehicleDetailsPanel';
import './VehicleTracking.css';

// Import Leaflet directly, not through a service
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const VehicleTracking = ({ networkStatus }) => {
  const [vehicles, setVehicles] = useState([]);
  const [activeVehicles, setActiveVehicles] = useState([]);
  const [vehicleLocations, setVehicleLocations] = useState({});
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [filterValue, setFilterValue] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [mapStyle, setMapStyle] = useState('normal');

  // Create a global map variable
  let map = null;
  let markers = {};
  
  // Initialize map directly in useEffect
  useEffect(() => {
    // Load vehicles
    fetchVehicles();
    
    // Initialize map after component is definitely mounted
    const initMap = () => {
      // Find map container by ID (safer than ref)
      const mapContainer = document.getElementById('vehicle-tracking-map');
      
      if (!mapContainer) {
        console.error("Map container element not found");
        setError("Map container not available - please reload the application");
        return;
      }
      
      try {
        console.log("Creating map with container:", mapContainer);
        
        // Create the map
        map = L.map('vehicle-tracking-map', {
          center: [35.937496, 14.375416], // Malta center
          zoom: 10,
          attributionControl: true
        });
        
        // Add tile layer - use standard OSM tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Add a test marker
        L.marker([35.937496, 14.375416]).addTo(map)
          .bindPopup('Map is working!')
          .openPopup();
        
        console.log("Map created successfully");
        addNotification('Map loaded successfully', 'success');
        
        // Invalidate size to ensure proper rendering
        setTimeout(() => {
          map.invalidateSize();
        }, 200);
        
        setLoading(false);
      } catch (err) {
        console.error("Error creating map:", err);
        setError(`Failed to create map: ${err.message}`);
        setLoading(false);
      }
    };
    
    // Delay map initialization to ensure DOM is ready
    setTimeout(initMap, 1000);
    
    // Cleanup function
    return () => {
      if (map) {
        map.remove();
        map = null;
      }
    };
  }, []);
  
  // Fetch all vehicles from Supabase
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      console.log("Fetching vehicles from database...");
      
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          registration_number,
          make,
          model,
          year,
          status,
          assigned_driver_id,
          users:assigned_driver_id(id, full_name, email, phone)
        `);
      
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!data) {
        console.log("No vehicles data returned from database");
        setVehicles([]);
      } else {
        console.log(`Loaded ${data.length} vehicles from database`);
        setVehicles(data);
        
        // Set a sample active vehicle for testing
        if (data.length > 0) {
          setActiveVehicles([data[0]]);
        }
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError(`Failed to load vehicles: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle vehicle selection from sidebar
  const handleVehicleSelect = (vehicleId) => {
    setSelectedVehicleId(vehicleId === selectedVehicleId ? null : vehicleId);
  };
  
  // Close details panel
  const handleCloseDetailsPanel = () => {
    setSelectedVehicleId(null);
    setShowDetailsPanel(false);
  };

  // Add a notification
  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    
    setNotifications(prev => [notification, ...prev].slice(0, 10));
    setNotificationCount(prev => prev + 1);
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
    setNotificationCount(0);
  };
  
  // Handles reloading the map
  const handleMapReload = () => {
    window.location.reload();
  };
  
  // Filter vehicles by registration number or driver name
  const getFilteredVehicles = () => {
    if (!filterValue.trim()) return vehicles;
    
    const searchTerm = filterValue.toLowerCase().trim();
    
    return vehicles.filter(vehicle => {
      // Check registration number
      if (vehicle.registration_number && vehicle.registration_number.toLowerCase().includes(searchTerm)) return true;
      
      // Check make/model
      if (vehicle.make && vehicle.model && 
          `${vehicle.make} ${vehicle.model}`.toLowerCase().includes(searchTerm)) return true;
      
      // Check driver name if assigned
      if (vehicle.users && vehicle.users.full_name && 
          vehicle.users.full_name.toLowerCase().includes(searchTerm)) return true;
      
      return false;
    });
  };
  
  // Get vehicle color (for consistency in list and map)
  const getVehicleColor = (vehicleId) => {
    if (!vehicleId) return '#777777';
    
    const index = vehicles.findIndex(v => v && v.id === vehicleId);
    if (index === -1) return '#777777';
    
    const colors = [
      '#3498db', '#2ecc71', '#e74c3c', '#9b59b6', '#f1c40f', 
      '#1abc9c', '#e67e22', '#34495e', '#7f8c8d', '#d35400'
    ];
    
    return colors[index % colors.length];
  };
  
  return (
    <div className="vehicle-tracking-container">
      {/* Error messages */}
      {error && (
        <Alert 
          variant="danger" 
          className="tracking-error"
          dismissible
          onClose={() => setError(null)}
        >
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <Button 
            variant="link" 
            className="ms-2" 
            onClick={handleMapReload}
            size="sm"
          >
            Try Reloading Map
          </Button>
        </Alert>
      )}
      
      {/* Main content */}
      <div className="tracking-layout">
        {/* Left sidebar - Vehicle list */}
        <div className="tracking-sidebar">
          <div className="sidebar-header">
            <h4>Vehicles</h4>
            <div className="connection-status">
              <span className={`status-dot ${socketConnected ? 'connected' : 'disconnected'}`}></span>
              {socketConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          
          <div className="filter-container">
            <Form.Control
              type="text"
              placeholder="Search vehicles or drivers..."
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="vehicle-filter"
            />
          </div>
          
          <div className="vehicle-list-header">
            <span>Active Vehicles: {activeVehicles.length}</span>
          </div>
          
          {loading ? (
            <div className="loading-container">
              <Spinner animation="border" size="sm" />
              <span>Loading vehicles...</span>
            </div>
          ) : (
            <div className="vehicle-list">
              {getFilteredVehicles().map((vehicle) => {
                if (!vehicle || !vehicle.id) return null;
                
                const isActive = activeVehicles.some(v => v.id === vehicle.id);
                const vehicleColor = getVehicleColor(vehicle.id);
                
                return (
                  <div 
                    key={vehicle.id} 
                    className={`vehicle-item ${isActive ? 'active' : 'inactive'} ${selectedVehicleId === vehicle.id ? 'selected' : ''}`}
                    onClick={() => handleVehicleSelect(vehicle.id)}
                  >
                    <div className="vehicle-item-icon" style={{ backgroundColor: vehicleColor }}>
                      <i className="bi bi-truck"></i>
                    </div>
                    
                    <div className="vehicle-item-details">
                      <div className="vehicle-item-name">
                        {vehicle.registration_number || 'Unknown'}
                      </div>
                      <div className="vehicle-item-info">
                        {vehicle.make || ''} {vehicle.model || ''}
                      </div>
                      <div className="vehicle-item-driver">
                        {vehicle.users ? vehicle.users.full_name : 'No Driver'}
                      </div>
                    </div>
                    
                    <div className="vehicle-item-status">
                      {isActive ? (
                        <div className="status-badge stopped">
                          Stopped
                        </div>
                      ) : (
                        <div className="status-badge offline">Offline</div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {getFilteredVehicles().length === 0 && (
                <div className="no-vehicles">
                  <i className="bi bi-search"></i>
                  <p>No vehicles found matching "{filterValue}"</p>
                </div>
              )}
            </div>
          )}
          
          {/* Notifications section */}
          <div className="notifications-section">
            <div className="notifications-header">
              <h4>
                <i className="bi bi-bell"></i>
                Notifications
                {notificationCount > 0 && (
                  <span className="notification-badge">{notificationCount}</span>
                )}
              </h4>
              {notifications.length > 0 && (
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={clearNotifications}
                  className="clear-notifications"
                >
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="notifications-list">
              {notifications.length === 0 ? (
                <div className="no-notifications">
                  <i className="bi bi-bell-slash"></i>
                  <p>No new notifications</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <div key={notification.id} className={`notification-item ${notification.type}`}>
                    <div className="notification-icon">
                      <i className={`bi ${
                        notification.type === 'success' ? 'bi-check-circle' :
                        notification.type === 'error' ? 'bi-x-circle' :
                        notification.type === 'warning' ? 'bi-exclamation-triangle' :
                        'bi-info-circle'
                      }`}></i>
                    </div>
                    <div className="notification-content">
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {notification.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Main map area */}
        <div className="map-container">
          {/* Map controls */}
          <div className="map-controls">
            <div className="control-group">
              <select 
                className="map-style-select"
                value={mapStyle}
                onChange={(e) => setMapStyle(e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="satellite">Satellite</option>
                <option value="terrain">Terrain</option>
              </select>
              
              <button 
                className="control-button"
                onClick={handleMapReload}
                title="Reload Map"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>
          
          {/* Map container - Key changes here! */}
          <div className="map-wrapper">
            {loading ? (
              <div className="map-loading">
                <Spinner animation="border" role="status" />
                <p>Initializing map...</p>
              </div>
            ) : (
              /* Use div with ID instead of ref */
              <div 
                id="vehicle-tracking-map" 
                style={{ 
                  width: '100%', 
                  height: '500px', 
                  position: 'relative',
                  backgroundColor: '#f0f0f0', 
                  border: '1px solid #ddd'
                }}
              />
            )}
          </div>
          
          {/* Vehicle details panel */}
          {showDetailsPanel && selectedVehicle && (
            <VehicleDetailsPanel
              vehicle={selectedVehicle}
              driver={selectedVehicle.users || null}
              locationData={vehicleLocations[selectedVehicle.id] || null}
              onClose={handleCloseDetailsPanel}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleTracking;