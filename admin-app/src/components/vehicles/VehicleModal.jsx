import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { supabase } from '../../supabaseClient';

const VehicleModal = ({ 
  show, 
  onHide, 
  isEditing = false, 
  initialData = {}, 
  onSuccess 
}) => {
  const [vehicleData, setVehicleData] = useState({
    registration_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    status: 'available',
    notes: '',
    assigned_driver_id: null,
    ...initialData
  });
  
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch drivers on component mount
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('role', 'driver')
          .order('full_name', { ascending: true });
        
        if (error) throw error;
        setDrivers(data || []);
      } catch (err) {
        console.error('Error fetching drivers:', err);
        setError('Failed to load drivers. Please try again.');
      }
    };
    
    fetchDrivers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setVehicleData(prevData => {
      const newData = { ...prevData };
      
      if (name === 'year') {
        newData[name] = value === '' ? '' : parseInt(value);
      } else if (name === 'status' && value !== 'assigned') {
        newData[name] = value;
        newData.assigned_driver_id = null;
      } else {
        newData[name] = value;
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate basic required fields
      if (!vehicleData.registration_number || !vehicleData.make || !vehicleData.model) {
        setError('Please fill in all required fields.');
        return;
      }
      
      // Validate driver assignment
      if (vehicleData.status === 'assigned' && !vehicleData.assigned_driver_id) {
        setError('Please select a driver when status is assigned.');
        return;
      }

      // Create a complete vehicle object with all necessary fields
      const vehicleToUpsert = {
        registration_number: vehicleData.registration_number,
        make: vehicleData.make,
        model: vehicleData.model,
        year: parseInt(vehicleData.year) || new Date().getFullYear(),
        status: vehicleData.status || 'available',
        notes: vehicleData.notes || null
      };
      
      // Only include driver assignment if status is "assigned"
      if (vehicleData.status === 'assigned') {
        vehicleToUpsert.assigned_driver_id = vehicleData.assigned_driver_id;
      }

      let result;
      if (isEditing) {
        // Update existing vehicle
        result = await supabase
          .from('vehicles')
          .update(vehicleToUpsert)
          .eq('id', initialData.id)
          .select();
      } else {
        // Insert new vehicle
        result = await supabase
          .from('vehicles')
          .insert(vehicleToUpsert)
          .select();
      }
      
      if (result.error) {
        throw result.error;
      }
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal
      onHide();
      
    } catch (err) {
      console.error(`Error ${isEditing ? 'updating' : 'adding'} vehicle:`, err);
      setError(`Failed to ${isEditing ? 'update' : 'add'} vehicle: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form id="vehicleForm" onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Registration Number*</Form.Label>
                <Form.Control
                  type="text"
                  name="registration_number"
                  value={vehicleData.registration_number}
                  onChange={handleInputChange}
                  required
                  autoFocus
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Year</Form.Label>
                <Form.Control
                  type="number"
                  name="year"
                  value={vehicleData.year}
                  onChange={handleInputChange}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </Form.Group>
            </Col>
          </Row>
          
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Make*</Form.Label>
                <Form.Control
                  type="text"
                  name="make"
                  value={vehicleData.make}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Model*</Form.Label>
                <Form.Control
                  type="text"
                  name="model"
                  value={vehicleData.model}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
            </Col>
          </Row>
          
          <Row>
            <Col md={vehicleData.status === 'assigned' ? 6 : 12}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={vehicleData.status}
                  onChange={handleInputChange}
                >
                  <option value="available">Available</option>
                  <option value="assigned">Assigned</option>
                  <option value="spare">Spare</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </Form.Select>
              </Form.Group>
            </Col>
            
            {vehicleData.status === 'assigned' && (
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Assign to Driver*</Form.Label>
                  <Form.Select
                    name="assigned_driver_id"
                    value={vehicleData.assigned_driver_id || ''}
                    onChange={handleInputChange}
                    required={vehicleData.status === 'assigned'}
                  >
                    <option value="">Select a driver</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>{driver.full_name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            )}
          </Row>
          
          <Form.Group className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              name="notes"
              rows={2}
              value={vehicleData.notes}
              onChange={handleInputChange}
              placeholder="Optional notes about this vehicle"
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          type="submit" 
          form="vehicleForm"
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner as="span" animation="border" size="sm" className="me-2" />
              {isEditing ? 'Updating...' : 'Adding...'}
            </>
          ) : (
            isEditing ? 'Update Vehicle' : 'Add Vehicle'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default VehicleModal;