import React, { useState, useEffect, useRef } from 'react';
import { Container, Card, Row, Col, Table, Badge, Form } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import 'mapbox-gl/dist/mapbox-gl.css';

// Replace with your Mapbox token
const MAPBOX_TOKEN = 'sk.eyJ1IjoicmFuYWppNSIsImEiOiJjbThhd2hkenUxbW1yMmtzZm1qcHRodXI2In0.A9_ke0F5JrP5OYHd0tAVkg';

const VehicleTracking = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeVehicles, setActiveVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [centerPosition, setCenterPosition] = useState([14.5, 35.9]); // Center of Malta
  const [zoom, setZoom] = useState(11);
  const markers = useRef({});
  
  // Load MapboxGL dynamically
  useEffect(() => {
    const loadMapbox = async () => {
      try {
        const mapboxgl = await import('mapbox-gl');
        mapboxgl.default.accessToken = MAPBOX_TOKEN;
        
        if (map.current) return; // Initialize map only once
        
        map.current = new mapboxgl.default.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: centerPosition,
          zoom: zoom
        });
        
        map.current.on('load', () => {
          map.current.addControl(new mapboxgl.default.NavigationControl(), 'top-right');
        });
      } catch (error) {
        console.error('Error loading Mapbox:', error);
      }
    };
    
    loadMapbox();
  }, []);
  
  // Fetch vehicles and drivers
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch vehicles
        const { data: vehiclesData, error: vehiclesError } = await supabase
          .from('vehicles')
          .select('*');
        
        if (vehiclesError) throw vehiclesError;
        
        // Fetch drivers
        const { data: driversData, error: driversError } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'driver');
        
        if (driversError) throw driversError;
        
        // Fetch latest vehicle locations
        const { data: locationsData, error: locationsError } = await supabase
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
            timestamp
          `)
          .order('timestamp', { ascending: false });
        
        if (locationsError) throw locationsError;
        
        // Process the data to get latest locations
        const uniqueVehicleLocations = {};
        
        locationsData.forEach(location => {
          if (!uniqueVehicleLocations[location.vehicle_id]) {
            uniqueVehicleLocations[location.vehicle_id] = location;
          }
        });
        
        // Combine data
        const activeVehiclesList = Object.values(uniqueVehicleLocations).map(location => {
          const vehicle = vehiclesData.find(v => v.id === location.vehicle_id);
          const driver = driversData.find(d => d.id === location.driver_id);
          
          return {
            location,
            vehicle,
            driver
          };
        });
        
        setVehicles(vehiclesData || []);
        setDrivers(driversData || []);
        setActiveVehicles(activeVehiclesList);
      } catch (error) {
        console.error('Error fetching tracking data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Subscribe to realtime location updates
    const subscription = supabase
      .channel('vehicle-locations')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'vehicle_locations' }, 
        (payload) => {
          updateVehicleLocation(payload.new);
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Update vehicle markers on map
  useEffect(() => {
    if (!map.current || activeVehicles.length === 0) return;
    
    // Clear old markers
    Object.values(markers.current).forEach(marker => marker.remove());
    markers.current = {};
    
    // Create new markers
    activeVehicles.forEach(item => {
      if (!item.location || !item.vehicle) return;
      
      const { location, vehicle, driver } = item;
      const vehicleId = vehicle.id;
      
      // Skip if no location data
      if (!location.latitude || !location.longitude) return;
      
      // Create marker element
      const el = document.createElement('div');
      el.className = 'vehicle-marker';
      
      // Style based on vehicle type/status
      el.style.width = '25px';
      el.style.height = '25px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = location.is_moving ? '#28a745' : '#dc3545';
      el.style.border = '2px solid white';
      el.style.cursor = 'pointer';
      
      // Add marker to map
      const marker = new mapboxgl.Marker(el)
        .setLngLat([location.longitude, location.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <h5>${vehicle.make} ${vehicle.model}</h5>
            <p>Registration: ${vehicle.registration_number}</p>
            <p>Driver: ${driver?.full_name || 'Not assigned'}</p>
            <p>Speed: ${location.speed || 0} km/h</p>
            <p>Status: ${location.is_moving ? 'Moving' : 'Stopped'}</p>
            <p>Updated: ${new Date(location.timestamp).toLocaleString()}</p>
          `)
        )
        .addTo(map.current);
      
      // Store marker reference for later updates
      markers.current[vehicleId] = marker;
      
      // Center map on selected vehicle
      if (selectedVehicle && selectedVehicle === vehicleId) {
        map.current.flyTo({
          center: [location.longitude, location.latitude],
          zoom: 14
        });
      }
    });
  }, [activeVehicles, selectedVehicle]);
  
  // Update a single vehicle location (for realtime updates)
  const updateVehicleLocation = async (newLocation) => {
    try {
      // Get vehicle and driver info if needed
      let vehicle = vehicles.find(v => v.id === newLocation.vehicle_id);
      let driver = drivers.find(d => d.id === newLocation.driver_id);
      
      if (!vehicle) {
        const { data } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', newLocation.vehicle_id)
          .single();
        vehicle = data;
      }
      
      if (!driver) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', newLocation.driver_id)
          .single();
        driver = data;
      }
      
      // Update activeVehicles list
      setActiveVehicles(prev => {
        const index = prev.findIndex(item => item.vehicle?.id === newLocation.vehicle_id);
        
        if (index >= 0) {
          // Update existing vehicle
          const updatedList = [...prev];
          updatedList[index] = {
            ...updatedList[index],
            location: newLocation
          };
          return updatedList;
        } else {
          // Add new vehicle
          return [...prev, {
            location: newLocation,
            vehicle,
            driver
          }];
        }
      });
      
      // Update marker on map if it exists
      if (map.current && markers.current[newLocation.vehicle_id]) {
        markers.current[newLocation.vehicle_id]
          .setLngLat([newLocation.longitude, newLocation.latitude]);
      }
    } catch (error) {
      console.error('Error updating vehicle location:', error);
    }
  };
  
  const handleVehicleSelect = (vehicleId) => {
    setSelectedVehicle(vehicleId);
    
    // Find the vehicle location
    const vehicleData = activeVehicles.find(item => item.vehicle?.id === vehicleId);
    
    if (vehicleData && vehicleData.location) {
      // Center map on the selected vehicle
      map.current.flyTo({
        center: [vehicleData.location.longitude, vehicleData.location.latitude],
        zoom: 14
      });
    }
  };

  return (
    <Container fluid>
      <h2 className="mb-4">Vehicle Tracking</h2>
      
      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <Card.Body>
              <div ref={mapContainer} style={{ height: '600px', borderRadius: '4px' }} />
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="mb-4">
            <Card.Header>
              <Form.Group>
                <Form.Label>Select Vehicle</Form.Label>
                <Form.Select 
                  value={selectedVehicle || ''}
                  onChange={(e) => handleVehicleSelect(e.target.value)}
                >
                  <option value="">All Vehicles</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.registration_number} - {vehicle.make} {vehicle.model}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Card.Header>
            <Card.Body style={{ maxHeight: '540px', overflowY: 'auto' }}>
              <h5>Active Vehicles</h5>
              {loading ? (
                <div className="text-center my-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : activeVehicles.length === 0 ? (
                <p className="text-muted">No active vehicles found</p>
              ) : (
                <Table hover size="sm">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Driver</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeVehicles.map((item) => (
                      <tr 
                        key={item.vehicle?.id} 
                        onClick={() => handleVehicleSelect(item.vehicle?.id)}
                        className={selectedVehicle === item.vehicle?.id ? 'table-primary' : ''}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{item.vehicle?.registration_number}</td>
                        <td>{item.driver?.full_name || 'Unknown'}</td>
                        <td>
                          <Badge bg={item.location?.is_moving ? 'success' : 'secondary'}>
                            {item.location?.is_moving ? 'Moving' : 'Stopped'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              
              {selectedVehicle && (
                <div className="mt-4">
                  <h5>Vehicle Details</h5>
                  {(() => {
                    const selected = activeVehicles.find(item => item.vehicle?.id === selectedVehicle);
                    
                    if (!selected) return <p>No details available</p>;
                    
                    return (
                      <div>
                        <p><strong>Registration:</strong> {selected.vehicle?.registration_number}</p>
                        <p><strong>Make/Model:</strong> {selected.vehicle?.make} {selected.vehicle?.model}</p>
                        <p><strong>Driver:</strong> {selected.driver?.full_name || 'Not assigned'}</p>
                        <p><strong>Speed:</strong> {selected.location?.speed || 0} km/h</p>
                        <p><strong>Status:</strong> {selected.location?.is_moving ? 'Moving' : 'Stopped'}</p>
                        <p><strong>Last Updated:</strong> {new Date(selected.location?.timestamp).toLocaleString()}</p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default VehicleTracking;