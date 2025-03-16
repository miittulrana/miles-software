// admin-app/src/components/vehicles/AvailableVehicles.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const AvailableVehicles = ({ onBack }) => {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [networkStatus, setNetworkStatus] = useState(true);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  
  // Form data
  const [vehicleData, setVehicleData] = useState({
    registration_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    status: 'available',
    notes: '',
    assigned_driver_id: null
  });

  const [documents, setDocuments] = useState([]);
  const [currentVehicleId, setCurrentVehicleId] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('registration');
  const [uploadLoading, setUploadLoading] = useState(false);

  // Fetch vehicles and drivers on component mount
  useEffect(() => {
    fetchVehicles();
    fetchDrivers();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching vehicles from Supabase...");
      
      // SIMPLIFIED QUERY - Just get the basic vehicle data
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      // Now manually enhance the vehicles with driver data
      const enhancedVehicles = [];
      
      for (const vehicle of data || []) {
        enhancedVehicles.push({
          ...vehicle,
          // We'll fill in driver details later after fetching drivers
        });
      }
      
      setNetworkStatus(true);
      console.log("Fetched vehicles:", enhancedVehicles.length);
      setVehicles(enhancedVehicles);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      if (err.message.includes('Failed to fetch') || 
          err.message.includes('network') || 
          err.message.includes('connection')) {
        setNetworkStatus(false);
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to load vehicles. Error: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      console.log("Fetching drivers...");
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'driver');
      
      if (error) {
        console.error('Error fetching drivers:', error);
        throw error;
      }
      
      console.log("Fetched drivers:", data?.length || 0);
      setDrivers(data || []);
      
      // Now update vehicles with driver information
      setVehicles(prevVehicles => 
        prevVehicles.map(vehicle => ({
          ...vehicle,
          driver: data?.find(d => d.id === vehicle.assigned_driver_id) || null
        }))
      );
    } catch (err) {
      console.error('Error fetching drivers:', err);
      // Don't show an error message here as it's secondary to the vehicles
    }
  };
  
  const fetchVehicleDocuments = async (vehicleId) => {
    try {
      const { data, error } = await supabase
        .from('vehicle_documents')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents. Please try again.');
    }
  };

  const handleAddVehicle = async () => {
    if (!networkStatus) {
      setError('Cannot add vehicle while offline. Please check your internet connection.');
      return;
    }
    
    try {
      setError(null);
      
      // Validate basic required fields
      if (!vehicleData.registration_number || !vehicleData.make || !vehicleData.model) {
        setError('Please fill in all required fields.');
        return;
      }
      
      // Create a complete vehicle object with all necessary fields
      const vehicleToInsert = {
        registration_number: vehicleData.registration_number,
        make: vehicleData.make,
        model: vehicleData.model,
        year: parseInt(vehicleData.year) || new Date().getFullYear(),
        status: vehicleData.status || 'available',
        notes: vehicleData.notes || null
      };
      
      // Only include driver assignment if status is "assigned"
      if (vehicleData.status === 'assigned') {
        if (!vehicleData.assigned_driver_id) {
          setError('Please select a driver when status is assigned.');
          return;
        }
        vehicleToInsert.assigned_driver_id = vehicleData.assigned_driver_id;
      }
      
      console.log('Inserting vehicle:', vehicleToInsert);
      
      // Insert vehicle with proper error handling
      const { data, error } = await supabase
        .from('vehicles')
        .insert(vehicleToInsert)
        .select();
      
      if (error) {
        console.error('Database error:', error);
        setError(`Failed to add vehicle: ${error.message}`);
        return;
      }
      
      // Success handling
      console.log('Vehicle added successfully:', data);
      setShowAddModal(false);
      setSuccessMessage('Vehicle added successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      resetVehicleForm();
      
      // Refresh the vehicles list
      fetchVehicles();
    } catch (err) {
      console.error('Error adding vehicle:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
        setNetworkStatus(false);
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to add vehicle: ' + err.message);
      }
    }
  };

  const handleUpdateVehicle = async () => {
    if (!networkStatus) {
      setError('Cannot update vehicle while offline. Please check your internet connection.');
      return;
    }
    
    try {
      setError(null);
      
      // Validate form
      if (!vehicleData.registration_number || !vehicleData.make || !vehicleData.model) {
        setError('Please fill in all required fields.');
        return;
      }
      
      // Create update object
      const vehicleToUpdate = {
        registration_number: vehicleData.registration_number,
        make: vehicleData.make,
        model: vehicleData.model,
        year: parseInt(vehicleData.year) || new Date().getFullYear(),
        status: vehicleData.status,
        notes: vehicleData.notes || null
      };
      
      // Handle driver assignment
      if (vehicleData.status === 'assigned') {
        if (!vehicleData.assigned_driver_id) {
          setError('Please select a driver when status is assigned.');
          return;
        }
        vehicleToUpdate.assigned_driver_id = vehicleData.assigned_driver_id;
      } else {
        // Remove driver assignment if status is not 'assigned'
        vehicleToUpdate.assigned_driver_id = null;
      }
      
      console.log('Updating vehicle:', vehicleToUpdate, 'ID:', currentVehicleId);
      
      const { error: updateError } = await supabase
        .from('vehicles')
        .update(vehicleToUpdate)
        .eq('id', currentVehicleId);
      
      if (updateError) {
        console.error('Update error details:', updateError);
        throw updateError;
      }
      
      // Success handling
      setShowEditModal(false);
      setSuccessMessage('Vehicle updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      resetVehicleForm();
      
      // Force refresh
      fetchVehicles();
    } catch (err) {
      console.error('Error updating vehicle:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
        setNetworkStatus(false);
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(`Failed to update vehicle: ${err.message || 'Unknown error'}`);
      }
    }
  };

  const handleDeleteVehicle = async () => {
    if (!networkStatus) {
      setError('Cannot delete vehicle while offline. Please check your internet connection.');
      return;
    }
    
    try {
      setError(null);
      
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', currentVehicleId);
      
      if (error) throw error;
      
      setShowDeleteModal(false);
      setSuccessMessage('Vehicle deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Force refresh
      fetchVehicles();
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
        setNetworkStatus(false);
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to delete vehicle: ' + err.message);
      }
    }
  };
  
  const handleUploadDocument = async () => {
    if (!networkStatus) {
      setError('Cannot upload document while offline. Please check your internet connection.');
      return;
    }
    
    if (!documentFile || !documentName || !documentType) {
      setError('Please fill in all document fields.');
      return;
    }
    
    try {
      setUploadLoading(true);
      setError(null);
      
      // Check if we already have 4 documents for this vehicle
      const { count, error: countError } = await supabase
        .from('vehicle_documents')
        .select('*', { count: 'exact', head: true })
        .eq('vehicle_id', currentVehicleId);
        
      if (countError) throw countError;
      
      if (count >= 4) {
        setError('Maximum 4 documents allowed per vehicle. Please delete an existing document first.');
        return;
      }
      
      // Upload file to storage
      const fileExt = documentFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `vehicle-documents/${currentVehicleId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('miles-express')
        .upload(filePath, documentFile);
        
      if (uploadError) throw uploadError;
      
      // Create document record
      const { error: insertError } = await supabase
        .from('vehicle_documents')
        .insert({
          vehicle_id: currentVehicleId,
          name: documentName,
          type: documentType,
          file_path: filePath,
          file_type: fileExt
        });
        
      if (insertError) throw insertError;
      
      // Refresh document list
      fetchVehicleDocuments(currentVehicleId);
      
      // Reset form
      setDocumentFile(null);
      setDocumentName('');
      setDocumentType('registration');
      setSuccessMessage('Document uploaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error uploading document:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
        setNetworkStatus(false);
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to upload document: ' + err.message);
      }
    } finally {
      setUploadLoading(false);
    }
  };
  
  const handleDownloadDocument = async (document) => {
    if (!networkStatus) {
      setError('Cannot download document while offline. Please check your internet connection.');
      return;
    }
    
    try {
      const { data, error } = await supabase.storage
        .from('miles-express')
        .createSignedUrl(document.file_path, 60);
        
      if (error) throw error;
      
      // Open the URL in a new tab
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Error downloading document:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
        setNetworkStatus(false);
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to download document: ' + err.message);
      }
    }
  };
  
  const handleDeleteDocument = async (documentId) => {
    if (!networkStatus) {
      setError('Cannot delete document while offline. Please check your internet connection.');
      return;
    }
    
    try {
      // Get document details first
      const { data: document, error: fetchError } = await supabase
        .from('vehicle_documents')
        .select('file_path')
        .eq('id', documentId)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('miles-express')
        .remove([document.file_path]);
        
      if (storageError) throw storageError;
      
      // Delete record
      const { error: deleteError } = await supabase
        .from('vehicle_documents')
        .delete()
        .eq('id', documentId);
        
      if (deleteError) throw deleteError;
      
      // Update the documents list
      setDocuments(documents.filter(doc => doc.id !== documentId));
      
      setSuccessMessage('Document deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting document:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
        setNetworkStatus(false);
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to delete document: ' + err.message);
      }
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
      notes: vehicle.notes || '',
      assigned_driver_id: vehicle.assigned_driver_id
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (vehicle) => {
    setCurrentVehicleId(vehicle.id);
    setShowDeleteModal(true);
  };
  
  const openDocumentModal = (vehicle) => {
    setCurrentVehicleId(vehicle.id);
    fetchVehicleDocuments(vehicle.id);
    setShowDocumentModal(true);
  };

  const resetVehicleForm = () => {
    setVehicleData({
      registration_number: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      status: 'available',
      notes: '',
      assigned_driver_id: null
    });
    setCurrentVehicleId(null);
  };
  
  // Handle input change without losing focus
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Use a functional update to prevent focus issues
    setVehicleData(prevData => {
      const newData = { ...prevData };
      
      // Special handling for year to ensure it's a number
      if (name === 'year') {
        newData[name] = value === '' ? '' : parseInt(value);
      } else if (name === 'status' && value !== 'assigned') {
        // If changing from assigned to another status, clear driver
        newData[name] = value;
        newData.assigned_driver_id = null;
      } else {
        newData[name] = value;
      }
      
      return newData;
    });
  };

  const retryConnection = () => {
    fetchVehicles();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <button 
          className="btn btn-link ps-0"
          onClick={onBack}
        >
          <i className="bi bi-arrow-left me-1"></i> Back to Vehicle Management
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
          disabled={!networkStatus}
        >
          <i className="bi bi-plus-lg me-1"></i> Add Vehicle
        </button>
      </div>
      
      <h2>Vehicle Management</h2>
      
      {!networkStatus && (
        <div className="alert alert-warning mb-3">
          <i className="bi bi-wifi-off me-2"></i>
          <strong>Network connection issue detected.</strong> Some features may be unavailable.
          <button className="btn btn-sm btn-outline-dark float-end" onClick={retryConnection}>
            <i className="bi bi-arrow-repeat me-1"></i> Retry
          </button>
        </div>
      )}
      
      {error && <div className="alert alert-danger">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      
      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading vehicles...</span>
          </div>
        </div>
      ) : !networkStatus && vehicles.length === 0 ? (
        <div className="text-center p-5 bg-light rounded">
          <div className="display-1 mb-3">🌐</div>
          <h3>Network Connection Error</h3>
          <p className="text-muted">Unable to load vehicles. Please check your internet connection.</p>
          <button className="btn btn-outline-primary mt-3" onClick={retryConnection}>
            <i className="bi bi-arrow-repeat me-1"></i> Retry Connection
          </button>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center p-5 bg-light rounded">
          <div className="display-1 mb-3">🚚</div>
          <h3>No vehicles found</h3>
          <p className="text-muted">Add your first vehicle to get started</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
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
                      <span className={`badge ${
                        vehicle.status === 'available' ? 'bg-success' :
                        vehicle.status === 'assigned' ? 'bg-primary' :
                        vehicle.status === 'spare' ? 'bg-info' :
                        vehicle.status === 'maintenance' ? 'bg-warning' : 'bg-secondary'
                      }`}>
                        {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                      </span>
                    </td>
                    <td>{vehicle.driver?.full_name || 'None'}</td>
                    <td className="text-end">
                      <button 
                        className="btn btn-sm btn-outline-secondary me-1"
                        onClick={() => openEditModal(vehicle)}
                        title="Edit Vehicle"
                        disabled={!networkStatus}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-info me-1"
                        onClick={() => openDocumentModal(vehicle)}
                        title="Manage Documents"
                        disabled={!networkStatus}
                      >
                        <i className="bi bi-file-earmark"></i>
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => openDeleteModal(vehicle)}
                        title="Delete Vehicle"
                        disabled={!networkStatus}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="modal-wrapper" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }}>
          {/* Backdrop with lower z-index */}
          <div 
            className="modal-backdrop show" 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1040 }}
            onClick={() => setShowAddModal(false)}
          ></div>
          
          {/* Modal dialog with higher z-index */}
          <div 
            className="modal show d-block" 
            tabIndex="-1" 
            style={{ zIndex: 1050, position: 'relative', pointerEvents: 'none' }}
          >
            <div className="modal-dialog" style={{ pointerEvents: 'auto' }}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add New Vehicle</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                </div>
                <div className="modal-body">
                  <form id="addVehicleForm" onSubmit={(e) => { e.preventDefault(); handleAddVehicle(); }}>
                    <div className="mb-3">
                      <label htmlFor="registration_number" className="form-label">Registration Number*</label>
                      <input
                        type="text"
                        className="form-control"
                        id="registration_number"
                        name="registration_number"
                        value={vehicleData.registration_number}
                        onChange={handleInputChange}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="make" className="form-label">Make*</label>
                      <input
                        type="text"
                        className="form-control"
                        id="make"
                        name="make"
                        value={vehicleData.make}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="model" className="form-label">Model*</label>
                      <input
                        type="text"
                        className="form-control"
                        id="model"
                        name="model"
                        value={vehicleData.model}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="year" className="form-label">Year</label>
                      <input
                        type="number"
                        className="form-control"
                        id="year"
                        name="year"
                        value={vehicleData.year}
                        onChange={handleInputChange}
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="status" className="form-label">Status</label>
                      <select
                        className="form-select"
                        id="status"
                        name="status"
                        value={vehicleData.status}
                        onChange={handleInputChange}
                      >
                        <option value="available">Available</option>
                        <option value="assigned">Assigned</option>
                        <option value="spare">Spare</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    
                    {vehicleData.status === 'assigned' && (
                      <div className="mb-3">
                        <label htmlFor="assigned_driver_id" className="form-label">Assign to Driver*</label>
                        <select
                          className="form-select"
                          id="assigned_driver_id"
                          name="assigned_driver_id"
                          value={vehicleData.assigned_driver_id || ''}
                          onChange={handleInputChange}
                          required={vehicleData.status === 'assigned'}
                        >
                          <option value="">Select a driver</option>
                          {drivers.map(driver => (
                            <option key={driver.id} value={driver.id}>{driver.full_name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <div className="mb-3">
                      <label htmlFor="notes" className="form-label">Notes</label>
                      <textarea
                        className="form-control"
                        id="notes"
                        name="notes"
                        rows={3}
                        value={vehicleData.notes}
                        onChange={handleInputChange}
                      />
                    </div>
                  </form>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" form="addVehicleForm" className="btn btn-primary">
                    Add Vehicle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Vehicle Modal */}
      {showEditModal && (
        <div className="modal-wrapper" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }}>
          {/* Backdrop with lower z-index */}
          <div 
            className="modal-backdrop show" 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1040 }}
            onClick={() => setShowEditModal(false)}
          ></div>
          
          {/* Modal dialog with higher z-index */}
          <div 
            className="modal show d-block" 
            tabIndex="-1" 
            style={{ zIndex: 1050, position: 'relative', pointerEvents: 'none' }}
          >
            <div className="modal-dialog" style={{ pointerEvents: 'auto' }}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit Vehicle</h5>
                  <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                </div>
                <div className="modal-body">
                  <form id="editVehicleForm" onSubmit={(e) => { e.preventDefault(); handleUpdateVehicle(); }}>
                    <div className="mb-3">
                      <label htmlFor="edit_registration_number" className="form-label">Registration Number*</label>
                      <input
                        type="text"
                        className="form-control"
                        id="edit_registration_number"
                        name="registration_number"
                        value={vehicleData.registration_number}
                        onChange={handleInputChange}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="edit_make" className="form-label">Make*</label>
                      <input
                        type="text"
                        className="form-control"
                        id="edit_make"
                        name="make"
                        value={vehicleData.make}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="edit_model" className="form-label">Model*</label>
                      <input
                        type="text"
                        className="form-control"
                        id="edit_model"
                        name="model"
                        value={vehicleData.model}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="edit_year" className="form-label">Year</label>
                      <input
                        type="number"
                        className="form-control"
                        id="edit_year"
                        name="year"
                        value={vehicleData.year}
                        onChange={handleInputChange}
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="edit_status" className="form-label">Status</label>
                      <select
                        className="form-select"
                        id="edit_status"
                        name="status"
                        value={vehicleData.status}
                        onChange={handleInputChange}
                      >
                        <option value="available">Available</option>
                        <option value="assigned">Assigned</option>
                        <option value="spare">Spare</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    
                    {vehicleData.status === 'assigned' && (
                      <div className="mb-3">
                        <label htmlFor="edit_assigned_driver_id" className="form-label">Assign to Driver*</label>
                        <select
                          className="form-select"
                          id="edit_assigned_driver_id"
                          name="assigned_driver_id"
                          value={vehicleData.assigned_driver_id || ''}
                          onChange={handleInputChange}
                          required={vehicleData.status === 'assigned'}
                        >
                          <option value="">Select a driver</option>
                          {drivers.map(driver => (
                            <option key={driver.id} value={driver.id}>{driver.full_name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <div className="mb-3">
                      <label htmlFor="edit_notes" className="form-label">Notes</label>
                      <textarea
                        className="form-control"
                        id="edit_notes"
                        name="notes"
                        rows={3}
                        value={vehicleData.notes}
                        onChange={handleInputChange}
                      />
                    </div>
                  </form>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" form="editVehicleForm" className="btn btn-primary">
                    Update Vehicle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-wrapper" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }}>
          {/* Backdrop with lower z-index */}
          <div 
            className="modal-backdrop show" 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1040 }}
            onClick={() => setShowDeleteModal(false)}
          ></div>
          
          {/* Modal dialog with higher z-index */}
          <div 
            className="modal show d-block" 
            tabIndex="-1" 
            style={{ zIndex: 1050, position: 'relative', pointerEvents: 'none' }}
          >
            <div className="modal-dialog" style={{ pointerEvents: 'auto' }}>
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
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={handleDeleteVehicle}>
                    Delete Vehicle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Document Modal */}
      {showDocumentModal && (
        <div className="modal-wrapper" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }}>
          {/* Backdrop with lower z-index */}
          <div 
            className="modal-backdrop show" 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1040 }}
            onClick={() => setShowDocumentModal(false)}
          ></div>
          
          {/* Modal dialog with higher z-index */}
          <div 
            className="modal show d-block" 
            tabIndex="-1" 
            style={{ zIndex: 1050, position: 'relative', pointerEvents: 'none' }}
          >
            <div className="modal-dialog modal-lg" style={{ pointerEvents: 'auto' }}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Vehicle Documents</h5>
                  <button type="button" className="btn-close" onClick={() => setShowDocumentModal(false)}></button>
                </div>
                <div className="modal-body">
                  <h5>Upload New Document</h5>
                  <form id="uploadDocumentForm" onSubmit={(e) => { e.preventDefault(); handleUploadDocument(); }} className="mb-4">
                    <div className="mb-3">
                      <label htmlFor="document_name" className="form-label">Document Name*</label>
                      <input
                        type="text"
                        className="form-control"
                        id="document_name"
                        value={documentName}
                        onChange={(e) => setDocumentName(e.target.value)}
                        required
                        placeholder="e.g., Insurance Policy 2023, Vehicle Registration"
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="document_type" className="form-label">Document Type*</label>
                      <select
                        className="form-select"
                        id="document_type"
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value)}
                      >
                        <option value="registration">Registration</option>
                        <option value="insurance">Insurance</option>
                        <option value="maintenance">Maintenance Record</option>
                        <option value="inspection">Inspection Certificate</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="document_file" className="form-label">File*</label>
                      <input
                        type="file"
                        className="form-control"
                        id="document_file"
                        onChange={(e) => setDocumentFile(e.target.files[0])}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                      <div className="form-text">Supported formats: PDF, JPG, PNG, DOC, DOCX (max 5MB)</div>
                    </div>
                    <button 
                      type="submit"
                      className="btn btn-primary" 
                      disabled={uploadLoading || !documentFile || !documentName || !documentType}
                    >
                      {uploadLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          Uploading...
                        </>
                      ) : 'Upload Document'}
                    </button>
                  </form>
                  
                  <hr />
                  
                  <h5>Existing Documents</h5>
                  {documents.length === 0 ? (
                    <p className="text-muted">No documents found for this vehicle.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Date Uploaded</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents.map(doc => (
                            <tr key={doc.id}>
                              <td>{doc.name}</td>
                              <td>
                                <span className="badge bg-info">
                                  {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)}
                                </span>
                              </td>
                              <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-outline-primary me-1"
                                  onClick={() => handleDownloadDocument(doc)}
                                  title="Download Document"
                                >
                                  <i className="bi bi-download"></i>
                                </button>
                                <button 
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  title="Delete Document"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-danger fw-bold mt-2">Maximum 4 documents allowed per vehicle.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDocumentModal(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableVehicles;