// admin-app/src/components/vehicles/AvailableVehicles.jsx
import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { supabase } from '../../supabaseClient';
import VehicleModal from './VehicleModal'; // Import the separate modal component
import DocumentModal from './DocumentModal'; // This would be another separate component

const AvailableVehicles = ({ onBack }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [networkStatus, setNetworkStatus] = useState(true);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  
  // Current vehicle for edit/delete operations
  const [currentVehicle, setCurrentVehicle] = useState(null);

  // Fetch vehicles on component mount
  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // SQL: SELECT * FROM vehicles ORDER BY created_at DESC
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          driver:users(id, full_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setNetworkStatus(true);
      setVehicles(data || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      
      if (err.message?.includes('Failed to fetch') || 
          err.message?.includes('network') || 
          err.message?.includes('connection')) {
        setNetworkStatus(false);
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to load vehicles. Error: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleAdded = () => {
    setSuccessMessage('Vehicle added successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
    fetchVehicles(); // Refresh the list
  };

  const handleVehicleUpdated = () => {
    setSuccessMessage('Vehicle updated successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
    fetchVehicles(); // Refresh the list
  };

  const handleDeleteVehicle = async () => {
    if (!networkStatus) {
      setError('Cannot delete vehicle while offline. Please check your internet connection.');
      return;
    }
    
    try {
      setError(null);
      
      // SQL: DELETE FROM vehicles WHERE id = $1
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', currentVehicle.id);
      
      if (error) throw error;
      
      setShowDeleteModal(false);
      setSuccessMessage('Vehicle deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh the list
      fetchVehicles();
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      
      if (err.message?.includes('Failed to fetch') || err.message?.includes('network')) {
        setNetworkStatus(false);
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to delete vehicle: ' + err.message);
      }
    }
  };

  const openEditModal = (vehicle) => {
    setCurrentVehicle(vehicle);
    setShowEditModal(true);
  };

  const openDeleteModal = (vehicle) => {
    setCurrentVehicle(vehicle);
    setShowDeleteModal(true);
  };
  
  const openDocumentModal = (vehicle) => {
    setCurrentVehicle(vehicle);
    setShowDocumentModal(true);
  };

  const retryConnection = () => {
    fetchVehicles();
  };

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Button 
          variant="link"
          className="ps-0"
          onClick={onBack}
        >
          <i className="bi bi-arrow-left me-2"></i> 
          Back to Vehicle Management
        </Button>
        
        <Button
          variant="primary"
          onClick={() => setShowAddModal(true)}
          disabled={!networkStatus}
        >
          <i className="bi bi-plus-lg me-2"></i> 
          Add Vehicle
        </Button>
      </div>
      
      <h2 className="mb-4">Vehicle Management</h2>
      
      {!networkStatus && (
        <Alert variant="warning" className="d-flex justify-content-between align-items-center">
          <div>
            <i className="bi bi-wifi-off me-2"></i>
            <strong>Network connection issue detected.</strong> Some features may be unavailable.
          </div>
          <Button size="sm" variant="outline-dark" onClick={retryConnection}>
            <i className="bi bi-arrow-repeat me-1"></i> Retry
          </Button>
        </Alert>
      )}
      
      {error && <Alert variant="danger">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading vehicles...</span>
          </Spinner>
        </div>
      ) : !networkStatus && vehicles.length === 0 ? (
        <Alert variant="light" className="text-center p-5">
          <div className="display-1 mb-3">🌐</div>
          <h3>Network Connection Error</h3>
          <p className="text-muted">Unable to load vehicles. Please check your internet connection.</p>
          <Button variant="outline-primary" onClick={retryConnection}>
            <i className="bi bi-arrow-repeat me-2"></i> Retry Connection
          </Button>
        </Alert>
      ) : vehicles.length === 0 ? (
        <Alert variant="light" className="text-center p-5">
          <div className="display-1 mb-3">🚚</div>
          <h3>No vehicles found</h3>
          <p className="text-muted">Add your first vehicle to get started</p>
        </Alert>
      ) : (
        <Card>
          <Table responsive hover className="mb-0">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Make & Model</th>
                <th>Year</th>
                <th>Status</th>
                <th>Driver</th>
                <th className="text-end">Actions</th>
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
                      vehicle.status === 'spare' ? 'info' :
                      vehicle.status === 'maintenance' ? 'warning' : 'secondary'
                    }>
                      {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                    </Badge>
                  </td>
                  <td>{vehicle.driver?.full_name || 'None'}</td>
                  <td className="text-end">
                    <Button 
                      variant="outline-secondary"
                      size="sm"
                      className="me-1"
                      onClick={() => openEditModal(vehicle)}
                      disabled={!networkStatus}
                      title="Edit Vehicle"
                    >
                      <i className="bi bi-pencil"></i>
                    </Button>
                    <Button 
                      variant="outline-info"
                      size="sm"
                      className="me-1"
                      onClick={() => openDocumentModal(vehicle)}
                      disabled={!networkStatus}
                      title="Manage Documents"
                    >
                      <i className="bi bi-file-earmark"></i>
                    </Button>
                    <Button 
                      variant="outline-danger"
                      size="sm"
                      onClick={() => openDeleteModal(vehicle)}
                      disabled={!networkStatus}
                      title="Delete Vehicle"
                    >
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
      {showAddModal && (
        <VehicleModal
          show={showAddModal}
          onHide={() => setShowAddModal(false)}
          isEditing={false}
          onSuccess={handleVehicleAdded}
        />
      )}
      
      {/* Edit Vehicle Modal */}
      {showEditModal && (
        <VehicleModal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          isEditing={true}
          initialData={currentVehicle}
          onSuccess={handleVehicleUpdated}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this vehicle? This action cannot be undone.</p>
                <p className="text-danger"><strong>Warning:</strong> All associated documents and records will also be deleted.</p>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDeleteVehicle}>
                  Delete Vehicle
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Document Modal would be implemented similarly */}
      {showDocumentModal && currentVehicle && (
        <DocumentModal
          show={showDocumentModal}
          onHide={() => setShowDocumentModal(false)}
          vehicleId={currentVehicle.id}
          vehicleName={`${currentVehicle.registration_number} (${currentVehicle.make} ${currentVehicle.model})`}
        />
      )}
    </Container>
  );
};

export default AvailableVehicles;