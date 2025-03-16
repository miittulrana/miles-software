// admin-app/src/components/VehicleTracking.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Button, Card, Form, Alert, Spinner } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import mapService from '../services/mapService';
import socketService from '../services/socketService';
import VehicleDetailsPanel from './tracking/VehicleDetailsPanel';
import 'leaflet/dist/leaflet.css';
import './VehicleTracking.css';

const VehicleTracking = ({ networkStatus }) => {
  const mapContainerRef = useRef(null);
  const [vehicles, setVehicles] = useState([]);
  const [activeVehicles, setActiveVehicles] = useState([]);
  const [vehicleLocations, setVehicleLocations] = useState({});
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [filterValue, setFilterValue] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [mapStyle, setMapStyle] = useState('normal');
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  
  // Load map when component mounts
  useEffect(() => {
    initializeTracking();
    
    // Cleanup on unmount
    return () => {
      socketService.disconnect();
      mapService.cleanup();
    };
  }, []);
  
  // Update map when active vehicles change
  useEffect(() => {
    if (!mapInitialized || !activeVehicles.length || !vehiclesLoaded) return;
    
    // Update each vehicle marker on the map
    activeVehicles.forEach(vehicle => {
      const location = vehicleLocations[vehicle.id];
      if (location) {
        mapService.updateVehicleMarker(vehicle, location);
      }
    });
  }, [activeVehicles, vehicleLocations, mapInitialized, vehiclesLoaded]);
  
  // Update selected vehicle info when selection changes
  useEffect(() => {
    if (selectedVehicleId && vehicles.length > 0) {
      // Find the vehicle info
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (vehicle) {
        setSelectedVehicle(vehicle);
        setShowDetailsPanel(true);
        
        // Center map on this vehicle
        mapService.selectVehicle(selectedVehicleId);
      }
    } else {
      setSelectedVehicle(null);
      setShowDetailsPanel(false);
    }
  }, [selectedVehicleId, vehicles]);
  
  // Initialize tracking system
  const initializeTracking = async () => {
    try {
      setLoading(true);
      
      // Initialize the map
      if (mapContainerRef.current) {
        // Try to initialize the map - much simpler with Leaflet
        const success = mapService.initializeMap(mapContainerRef.current, {
          center: [35.937496, 14.375416], // Malta center coordinates
          zoom: 10,
          onMapLoaded: () => {
            setMapInitialized(true);
            addNotification('Map loaded successfully', 'success');
          },
          onMapError: (err) => {
            setError(`Map error: ${err.message}`);
          }
        });
        
        if (!success) {
          throw new Error('Map initialization failed');
        }
        
        // Set up vehicle click handler
        mapService.onVehicleClick((vehicleId) => {
          setSelectedVehicleId(vehicleId);
        });
      }
      
      // Load all vehicles
      await fetchVehicles();
      
      // Connect to socket server
      connectToSocketServer();
      
      // Load initial vehicle locations
      if (vehiclesLoaded) {
        await fetchInitialVehicleLocations();
      }
      
      setMapLoading(false);
    } catch (err) {
      console.error('Error initializing tracking:', err);
      setError('Failed to initialize tracking system: ' + err.message);
      setMapLoading(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Connect to socket.io server
  const connectToSocketServer = () => {
    // Connect to the socket server
    socketService.connect();
    
    // Handle connection state changes
    socketService.addEventListener('connection_change', (data) => {
      setSocketConnected(data.connected);
      
      if (!data.connected) {
        addNotification('Connection lost to tracking server', 'error');
      } else {
        addNotification('Connected to tracking server', 'success');
      }
    });
    
    // Handle connection errors
    socketService.addEventListener('connection_error', (data) => {
      setError(`Connection error: ${data.error?.message || 'Unknown error'}`);
    });
    
    // Handle vehicle location updates
    socketService.addEventListener('vehicle_location', (locationData) => {
      if (!locationData || !locationData.vehicle_id) return;
      
      setVehicleLocations(prev => ({
        ...prev,
        [locationData.vehicle_id]: locationData
      }));
    });
    
    // Handle vehicle status changes
    socketService.addEventListener('vehicle_status_change', (statusData) => {
      if (!statusData || !statusData.vehicleId) return;
      
      // Update active vehicles list
      if (statusData.status === 'online') {
        setActiveVehicles(prev => {
          if (!prev.find(v => v.id === statusData.vehicleId)) {
            const vehicle = vehicles.find(v => v.id === statusData.vehicleId);
            if (vehicle) {
              addNotification(`Vehicle ${vehicle.registration_number} is now online`, 'info');
              return [...prev, vehicle];
            }
          }
          return prev;
        });
      } else if (statusData.status === 'offline') {
        setActiveVehicles(prev => {
          const filtered = prev.filter(v => v.id !== statusData.vehicleId);
          
          const vehicle = vehicles.find(v => v.id === statusData.vehicleId);
          if (vehicle) {
            addNotification(`Vehicle ${vehicle.registration_number} is now offline`, 'warning');
          }
          
          return filtered;
        });
        
        // Remove marker from map
        mapService.removeVehicleMarker(statusData.vehicleId);
      }
    });
  };
  
  // Fetch all vehicles from Supabase
  const fetchVehicles = async () => {
    try {
      // Check network status first
      if (!networkStatus.online) {
        console.log("Network is offline, using cached vehicles if available");
        return;
      }
      
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
      }
      
      setVehiclesLoaded(true);
      
      // Now that vehicles are loaded, we can fetch locations
      await fetchInitialVehicleLocations();
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError(`Failed to load vehicles: ${err.message}`);
      setVehiclesLoaded(false);
    }
  };
  
  // Fetch initial vehicle locations
  const fetchInitialVehicleLocations = async () => {
    if (!vehiclesLoaded || vehicles.length === 0) {
      console.log("Skipping location fetch - vehicles not loaded yet");
      return;
    }
    
    try {
      console.log("Fetching initial vehicle locations...");
      
      // Check network status first
      if (!networkStatus.online) {
        console.log("Network is offline, skipping location fetch");
        return;
      }
      
      // Fetch the most recent location for each vehicle
      const { data, error } = await supabase
        .from('vehicle_locations')
        .select(`
          id,
          vehicle_id,
          driver_id,
          latitude,
          longitude,
          speed,
          heading,
          is_moving,
          battery_level,
          accuracy,
          timestamp
        `)
        .order('timestamp', { ascending: false });
      
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        console.log("No vehicle location data found in database");
        return;
      }
      
      console.log(`Loaded ${data.length} location records from database`);
      
      // Process to get the latest location for each vehicle
      const latestLocations = {};
      
      data.forEach(location => {
        if (!location.vehicle_id) {
          console.warn("Found location record without vehicle_id, skipping", location);
          return;
        }
        
        if (!latestLocations[location.vehicle_id] || 
            new Date(location.timestamp) > new Date(latestLocations[location.vehicle_id].timestamp)) {
          latestLocations[location.vehicle_id] = location;
        }
      });
      
      // Filter locations that are recent (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const recentLocations = {};
      const activeVehicleIds = [];
      
      Object.entries(latestLocations).forEach(([vehicleId, location]) => {
        if (new Date(location.timestamp) > oneDayAgo) {
          recentLocations[vehicleId] = location;
          activeVehicleIds.push(vehicleId);
        }
      });
      
      console.log(`Found ${Object.keys(recentLocations).length} recent vehicle locations`);
      
      // Update states
      setVehicleLocations(recentLocations);
      
      // Set active vehicles based on recent locations
      if (activeVehicleIds.length > 0 && vehicles.length > 0) {
        const activeVehiclesList = vehicles.filter(v => v && v.id && activeVehicleIds.includes(v.id));
        console.log(`Setting ${activeVehiclesList.length} active vehicles`);
        setActiveVehicles(activeVehiclesList);
      } else {
        console.log("No active vehicles found with recent locations");
      }
    } catch (err) {
      // Log error but don't show to user - non-critical feature
      console.error('Error fetching initial vehicle locations:', err);
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
    mapService.selectVehicle(null);
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
  
  // Change map style
  const handleMapStyleChange = (e) => {
    const newStyle = e.target.value;
    setMapStyle(newStyle);
    
    if (mapInitialized) {
      mapService.setMapStyle(newStyle);
    }
  };
  
  // Handles reloading the map
  const handleMapReload = () => {
    try {
      if (mapService) {
        // Force map recenter to Malta
        mapService.recenterMap();
        addNotification('Map reloaded successfully', 'success');
      } else {
        // If map service isn't available, try to reinitialize
        initializeTracking().then(() => {
          addNotification('Map reinitialized successfully', 'success');
        });
      }
    } catch (err) {
      console.error("Error during map reload:", err);
      setError(`Error reloading map: ${err.message}`);
    }
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
  
  // Filter for active vehicles only
  const getActiveVehicleIds = () => {
    return activeVehicles.filter(v => v && v.id).map(v => v.id);
  };
  
  // Determine if vehicle is currently moving
  const isVehicleMoving = (vehicleId) => {
    if (!vehicleId) return false;
    const location = vehicleLocations[vehicleId];
    return location?.is_moving || false;
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
                
                const isActive = getActiveVehicleIds().includes(vehicle.id);
                const isMoving = isVehicleMoving(vehicle.id);
                const vehicleLocation = vehicleLocations[vehicle.id];
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
                        <div className={`status-badge ${isMoving ? 'moving' : 'stopped'}`}>
                          {isMoving ? 'Moving' : 'Stopped'}
                        </div>
                      ) : (
                        <div className="status-badge offline">Offline</div>
                      )}
                      
                      {vehicleLocation && vehicleLocation.speed !== undefined && (
                        <div className="vehicle-speed">
                          {Math.round(vehicleLocation.speed)} km/h
                        </div>
                      )}
                      
                      {vehicleLocation && vehicleLocation.timestamp && (
                        <div className="vehicle-last-update">
                          {new Date(vehicleLocation.timestamp).toLocaleTimeString()}
                        </div>
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
                onChange={handleMapStyleChange}
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
          
          {/* Map content */}
          {loading || mapLoading ? (
            <div className="map-loading">
              <Spinner animation="border" role="status" />
              <p>Initializing map...</p>
            </div>
          ) : (
            <div 
              ref={mapContainerRef} 
              id="map"
              className="map-content"
            />
          )}
          
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