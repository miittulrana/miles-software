import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Modal, Form, Badge, Alert } from 'react-bootstrap';
import { supabase, subscribeToVehicleChanges } from '../supabaseClient';

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  
  // Form data
  const [vehicleData, setVehicleData] = useState({
    registration_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    status: 'available',
    notes: ''
  });
  
  const [maintenanceData, setMaintenanceData] = useState({
    start_date: '',
    end_date: '',
    notes: ''
  });
  
  const [currentVehicleId, setCurrentVehicleId] = useState(null);

  // Fetch vehicles on component mount
  useEffect(() => {
    fetchVehicles();
    
    // Subscribe to realtime vehicle changes
    const subscription = subscribeToVehicleChanges((payload) => {
      if (payload.eventType === 'INSERT') {
        setVehicles(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setVehicles(prev => 
          prev.map(vehicle => 
            vehicle.id === payload.new.id ? payload.new : vehicle
          )
        );
      } else if (payload.eventType === 'DELETE') {
        setVehicles(prev => 
          prev.filter(vehicle => vehicle.id !== payload.old.id)
        );
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setVehicles(data || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async () => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from('vehicles')
        .insert([vehicleData])
        .select();
      
      if (error) throw error;
      
      // Vehicle will be added via realtime subscription
      setShowAddModal(false);
      resetVehicleForm();
    } catch (err) {
      console.error('Error adding vehicle:', err);
      setError('Failed to add vehicle. Please try again.');
    }
  };

  const handleUpdateVehicle = async () => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from('vehicles')
        .update(vehicleData)
        .eq('id', currentVehicleId)
        .select();
      
      if (error) throw error;
      
      // Vehicle will be updated via realtime subscription
      setShowEditModal(false);
      resetVehicleForm();
    } catch (err) {
      console.error('Error updating vehicle:', err);
      setError('Failed to update vehicle. Please try again.');
    }
  };

  const handleDeleteVehicle = async () => {
    try {
      setError(null);
      
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', currentVehicleId);
      
      if (error) throw error;
      
      // Vehicle will be removed via realtime subscription
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      setError('Failed to delete vehicle. Please try again.');
    }
  };

  const handleMaintenanceUpdate = async () => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from('vehicles')
        .update({
          status: 'maintenance',
          maintenance_start: maintenanceData.start_date,
          maintenance_end: maintenanceData.end_date,
          notes: maintenanceData.notes
        })
        .eq('id', currentVehicleId)
        .select();
      
      if (error) throw error;
      
      // Vehicle will be updated via realtime subscription
      setShowMaintenanceModal(false);
      resetMaintenanceForm();
    } catch (err) {
      console.error('Error updating maintenance:', err);
      setError('Failed to update maintenance. Please try again.');
    }
  };

  const openEditModal = (vehicle) => {
    setCurrentVehicleId(vehicle.id);
    setVehicleData({
      registration_number: vehicle.registration_number,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      status: vehicle.status,
      notes: vehicle.notes || ''
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (vehicle) => {
    setCurrentVehicleId(vehicle.id);
    setShowDeleteModal(true);
  };

  const openMaintenanceModal = (vehicle) => {
    setCurrentVehicleId(vehicle.id);
    setMaintenanceData({
      start_date: '',
      end_date: '',
      notes: ''
    });
    setShowMaintenanceModal(true);
  };

  const resetVehicleForm = () => {
    setVehicleData({
      registration_number: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      status: 'available',
      notes: ''
    });
    setCurrentVehicleId(null);
  };

  const resetMaintenanceForm = () => {
    setMaintenanceData({
      start_date: '',
      end_date: '',
      notes: ''
    });
  };

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Vehicle Management</h2>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <i className="bi bi-plus-lg me-1"></i> Add Vehicle
        </Button>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : vehicles.length === 0 ? (
        <Alert variant="info">No vehicles found. Add your first vehicle to get started.</Alert>
      ) : (
        <Card>
          <Table responsive hover className="mb-0">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Make & Model</th>
                <th>Year</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(vehicle => (
                <tr key={vehicle.id}>
                  <td>{vehicle.registration_number}</td>
                  <td>{vehicle.make} {vehicle.model}</td>
                  <td>{vehicle.year}</td>
                  <td>
                    <Badge bg={
                      vehicle.status === 'available' ? 'success' :
                      vehicle.status === 'assigned' ? 'primary' :
                      vehicle.status === 'maintenance' ? 'warning' : 'secondary'
                    }>
                      {vehicle.status}
                    </Badge>
                  </td>
                  <td>{vehicle.notes}</td>
                  <td>
                    <Button variant="outline-primary" size="sm" className="me-2" onClick={() => openEditModal(vehicle)}>
                      <i className="bi bi-pencil"></i>
                    </Button>
                    <Button variant="outline-warning" size="sm" className="me-2" onClick={() => openMaintenanceModal(vehicle)}>
                      <i className="bi bi-tools"></i>
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => openDeleteModal(vehicle)}>
                      <i className="bi bi-trash"></i>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      
      {/* Add Vehicle Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Vehicle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Registration Number</Form.Label>
              <Form.Control
                type="text"
                value={vehicleData.registration_number}
                onChange={(e) => setVehicleData({...vehicleData, registration_number: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Make</Form.Label>
              <Form.Control
                type="text"
                value={vehicleData.make}
                onChange={(e) => setVehicleData({...vehicleData, make: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Model</Form.Label>
              <Form.Control
                type="text"
                value={vehicleData.model}
                onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Year</Form.Label>
              <Form.Control
                type="number"
                value={vehicleData.year}
                onChange={(e) => setVehicleData({...vehicleData, year: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={vehicleData.status}
                onChange={(e) => setVehicleData({...vehicleData, status: e.target.value})}
              >
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={vehicleData.notes}
                onChange={(e) => setVehicleData({...vehicleData, notes: e.target.value})}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddVehicle}>
            Add Vehicle
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Edit Vehicle Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Vehicle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Registration Number</Form.Label>
              <Form.Control
                type="text"
                value={vehicleData.registration_number}
                onChange={(e) => setVehicleData({...vehicleData, registration_number: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Make</Form.Label>
              <Form.Control
                type="text"
                value={vehicleData.make}
                onChange={(e) => setVehicleData({...vehicleData, make: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Model</Form.Label>
              <Form.Control
                type="text"
                value={vehicleData.model}
                onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Year</Form.Label>
              <Form.Control
                type="number"
                value={vehicleData.year}
                onChange={(e) => setVehicleData({...vehicleData, year: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={vehicleData.status}
                onChange={(e) => setVehicleData({...vehicleData, status: e.target.value})}
              >
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={vehicleData.notes}
                onChange={(e) => setVehicleData({...vehicleData, notes: e.target.value})}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateVehicle}>
            Update Vehicle
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this vehicle? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteVehicle}>
            Delete Vehicle
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Maintenance Modal */}
      <Modal show={showMaintenanceModal} onHide={() => setShowMaintenanceModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Schedule Maintenance</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                value={maintenanceData.start_date}
                onChange={(e) => setMaintenanceData({...maintenanceData, start_date: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="date"
                value={maintenanceData.end_date}
                onChange={(e) => setMaintenanceData({...maintenanceData, end_date: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Maintenance Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={maintenanceData.notes}
                onChange={(e) => setMaintenanceData({...maintenanceData, notes: e.target.value})}
                placeholder="Describe maintenance details..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMaintenanceModal(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleMaintenanceUpdate}>
            Schedule Maintenance
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default VehicleManagement;