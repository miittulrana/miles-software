// admin-app/src/components/drivers/AvailableDrivers.jsx
import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { supabase } from '../../supabaseClient';
import DriverModal from './DriverModal';

const AvailableDrivers = ({ onBack }) => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [networkStatus, setNetworkStatus] = useState(true);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Current driver for edit/delete operations
  const [currentDriver, setCurrentDriver] = useState(null);

  // Fetch drivers on component mount
  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          phone,
          created_at,
          updated_at,
          address,
          license_number,
          license_expiry,
          status
        `)
        .eq('role', 'driver')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setNetworkStatus(true);
      setDrivers(data || []);
    } catch (err) {
      console.error('Error fetching drivers:', err);
      
      if (err.message?.includes('Failed to fetch') || 
          err.message?.includes('network') || 
          err.message?.includes('connection')) {
        setNetworkStatus(false);
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to load drivers. Error: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDriverAdded = () => {
    setSuccessMessage('Driver added successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
    fetchDrivers(); // Refresh the list
  };

  const handleDriverUpdated = () => {
    setSuccessMessage('Driver updated successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
    fetchDrivers(); // Refresh the list
  };

  const handleDeleteDriver = async () => {
    if (!networkStatus) {
      setError('Cannot delete driver while offline. Please check your internet connection.');
      return;
    }
    
    try {
      setError(null);
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', currentDriver.id);
      
      if (error) throw error;
      
      setShowDeleteModal(false);
      setSuccessMessage('Driver deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh the list
      fetchDrivers();
    } catch (err) {
      console.error('Error deleting driver:', err);
      
      if (err.message?.includes('Failed to fetch') || err.message?.includes('network')) {
        setNetworkStatus(false);
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to delete driver: ' + err.message);
      }
    }
  };

  const openEditModal = (driver) => {
    setCurrentDriver(driver);
    setShowEditModal(true);
  };

  const openDeleteModal = (driver) => {
    setCurrentDriver(driver);
    setShowDeleteModal(true);
  };

  const retryConnection = () => {
    fetchDrivers();
  };

  // Helper function to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  // Helper function to get status badge
  const getStatusBadge = (status) => {
    if (!status) return <Badge bg="secondary">Inactive</Badge>;
    
    switch(status.toLowerCase()) {
      case 'active':
        return <Badge bg="success">Active</Badge>;
      case 'on_leave':
        return <Badge bg="warning">On Leave</Badge>;
      case 'suspended':
        return <Badge bg="danger">Suspended</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
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
          Back to Driver Management
        </Button>
        
        <Button
          variant="primary"
          onClick={() => setShowAddModal(true)}
          disabled={!networkStatus}
        >
          <i className="bi bi-plus-lg me-2"></i> 
          Add Driver
        </Button>
      </div>
      
      <h2 className="mb-4">Driver Management</h2>
      
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
            <span className="visually-hidden">Loading drivers...</span>
          </Spinner>
        </div>
      ) : !networkStatus && drivers.length === 0 ? (
        <Alert variant="light" className="text-center p-5">
          <div className="display-1 mb-3">🌐</div>
          <h3>Network Connection Error</h3>
          <p className="text-muted">Unable to load drivers. Please check your internet connection.</p>
          <Button variant="outline-primary" onClick={retryConnection}>
            <i className="bi bi-arrow-repeat me-2"></i> Retry Connection
          </Button>
        </Alert>
      ) : drivers.length === 0 ? (
        <Alert variant="light" className="text-center p-5">
          <div className="display-1 mb-3">👤</div>
          <h3>No drivers found</h3>
          <p className="text-muted">Add your first driver to get started</p>
        </Alert>
      ) : (
        <Card>
          <Table responsive hover className="mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>License Number</th>
                <th>License Expiry</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(driver => (
                <tr key={driver.id}>
                  <td>{driver.full_name}</td>
                  <td>{driver.email}</td>
                  <td>{driver.phone || 'N/A'}</td>
                  <td>{driver.license_number || 'N/A'}</td>
                  <td>{driver.license_expiry ? formatDate(driver.license_expiry) : 'N/A'}</td>
                  <td>{getStatusBadge(driver.status)}</td>
                  <td className="text-end">
                    <Button 
                      variant="outline-secondary"
                      size="sm"
                      className="me-1"
                      onClick={() => openEditModal(driver)}
                      disabled={!networkStatus}
                      title="Edit Driver"
                    >
                      <i className="bi bi-pencil"></i>
                    </Button>
                    <Button 
                      variant="outline-info"
                      size="sm"
                      className="me-1"
                      onClick={() => {
                        // Navigate to driver documents with this driver pre-selected
                        window.driverId = driver.id; // Store in window for use in documents component
                        onBack(); // Go back to main driver management
                        setTimeout(() => document.querySelector('[data-module="documents"]')?.click(), 100); // Click the documents module
                      }}
                      disabled={!networkStatus}
                      title="View Documents"
                    >
                      <i className="bi bi-file-earmark"></i>
                    </Button>
                    <Button 
                      variant="outline-danger"
                      size="sm"
                      onClick={() => openDeleteModal(driver)}
                      disabled={!networkStatus}
                      title="Delete Driver"
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
      
      {/* Add Driver Modal */}
      {showAddModal && (
        <DriverModal
          show={showAddModal}
          onHide={() => setShowAddModal(false)}
          isEditing={false}
          onSuccess={handleDriverAdded}
        />
      )}
      
      {/* Edit Driver Modal */}
      {showEditModal && (
        <DriverModal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          isEditing={true}
          initialData={currentDriver}
          onSuccess={handleDriverUpdated}
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
                <p>Are you sure you want to delete driver <strong>{currentDriver?.full_name}</strong>?</p>
                <p className="text-danger"><strong>Warning:</strong> All associated documents and assignments will also be deleted.</p>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDeleteDriver}>
                  Delete Driver
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default AvailableDrivers;