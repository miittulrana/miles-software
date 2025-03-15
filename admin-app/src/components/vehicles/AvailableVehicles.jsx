// admin-app/src/components/vehicles/AvailableVehicles.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const AvailableVehicles = ({ onBack }) => {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
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
    
    // Subscribe to realtime vehicle changes
    const subscription = supabase
      .channel('public:vehicles')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'vehicles' 
      }, (payload) => {
        console.log('Vehicle change detected:', payload);
        
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
      })
      .subscribe();
    
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
        .select(`
          *,
          driver:assigned_driver_id(id, full_name)
        `)
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

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'driver');
      
      if (error) throw error;
      
      setDrivers(data || []);
    } catch (err) {
      console.error('Error fetching drivers:', err);
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
    try {
      setError(null);
      
      // Validate form
      if (!vehicleData.registration_number || !vehicleData.make || !vehicleData.model) {
        setError('Please fill in all required fields.');
        return;
      }
      
      // If status is assigned, assigned_driver_id must be provided
      if (vehicleData.status === 'assigned' && !vehicleData.assigned_driver_id) {
        setError('Please select a driver when status is assigned.');
        return;
      }
      
      const { data, error } = await supabase
        .from('vehicles')
        .insert([vehicleData])
        .select();
      
      if (error) throw error;
      
      // Vehicle will be added via realtime subscription
      setShowAddModal(false);
      setSuccessMessage('Vehicle added successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      resetVehicleForm();
    } catch (err) {
      console.error('Error adding vehicle:', err);
      setError('Failed to add vehicle. Please try again.');
    }
  };

  const handleUpdateVehicle = async () => {
    try {
      setError(null);
      
      // Validate form
      if (!vehicleData.registration_number || !vehicleData.make || !vehicleData.model) {
        setError('Please fill in all required fields.');
        return;
      }
      
      // If status is assigned, assigned_driver_id must be provided
      if (vehicleData.status === 'assigned' && !vehicleData.assigned_driver_id) {
        setError('Please select a driver when status is assigned.');
        return;
      }
      
      const { data, error } = await supabase
        .from('vehicles')
        .update(vehicleData)
        .eq('id', currentVehicleId)
        .select();
      
      if (error) throw error;
      
      // Vehicle will be updated via realtime subscription
      setShowEditModal(false);
      setSuccessMessage('Vehicle updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
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
      setSuccessMessage('Vehicle deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      setError('Failed to delete vehicle. Please try again.');
    }
  };
  
  const handleUploadDocument = async () => {
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
      setError('Failed to upload document. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };
  
  const handleDownloadDocument = async (document) => {
    try {
      const { data, error } = await supabase.storage
        .from('miles-express')
        .createSignedUrl(document.file_path, 60);
        
      if (error) throw error;
      
      // Open the URL in a new tab
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Failed to download document. Please try again.');
    }
  };
  
  const handleDeleteDocument = async (documentId) => {
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
      setError('Failed to delete document. Please try again.');
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

  // Modal component
  const Modal = ({ show, onClose, title, children, footer }) => {
    if (!show) return null;
    
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '5px',
          width: '500px',
          maxWidth: '90%',
          maxHeight: '90%',
          overflowY: 'auto',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
          </div>
          <div style={{ padding: '15px' }}>
            {children}
          </div>
          {footer && (
            <div style={{ padding: '15px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button 
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          ← Back to Vehicle Management
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <span>+</span> Add Vehicle
        </button>
      </div>
      
      <h2>Available Vehicles</h2>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '15px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      
      {successMessage && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '15px', 
          backgroundColor: '#d4edda', 
          color: '#155724',
          borderRadius: '4px'
        }}>
          {successMessage}
        </div>
      )}
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ 
            border: '4px solid rgba(0, 0, 0, 0.1)',
            borderLeftColor: '#007bff',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            margin: '0 auto 15px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div>Loading vehicles...</div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      ) : vehicles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🚚</div>
          <h3>No vehicles found</h3>
          <p>Add your first vehicle to get started</p>
        </div>
      ) : (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Registration</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Make & Model</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Year</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Driver</th>
                <th style={{ padding: '12px 15px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(vehicle => (
                <tr key={vehicle.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px 15px' }}>{vehicle.registration_number}</td>
                  <td style={{ padding: '12px 15px' }}>{vehicle.make} {vehicle.model}</td>
                  <td style={{ padding: '12px 15px' }}>{vehicle.year}</td>
                  <td style={{ padding: '12px 15px' }}>
                    <span style={{ 
                      backgroundColor: 
                        vehicle.status === 'available' ? '#28a745' :
                        vehicle.status === 'assigned' ? '#007bff' :
                        vehicle.status === 'spare' ? '#17a2b8' :
                        vehicle.status === 'maintenance' ? '#ffc107' : '#6c757d',
                      color: vehicle.status === 'maintenance' ? 'black' : 'white',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.85rem'
                    }}>
                      {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    {vehicle.driver?.full_name || 'None'}
                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                    <button 
                      onClick={() => openEditModal(vehicle)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #6c757d',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        marginRight: '5px',
                        cursor: 'pointer'
                      }}
                      title="Edit Vehicle"
                    >
                      <span role="img" aria-label="Edit">✏️</span>
                    </button>
                    <button 
                      onClick={() => openDocumentModal(vehicle)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #17a2b8',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        marginRight: '5px',
                        cursor: 'pointer'
                      }}
                      title="Manage Documents"
                    >
                      <span role="img" aria-label="Documents">📄</span>
                    </button>
                    <button 
                      onClick={() => openDeleteModal(vehicle)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #dc3545',
                        color: '#dc3545',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer'
                      }}
                      title="Delete Vehicle"
                    >
                      <span role="img" aria-label="Delete">🗑️</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Add Vehicle Modal */}
      <Modal 
        show={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        title="Add New Vehicle"
        footer={
          <>
            <button 
              onClick={() => setShowAddModal(false)}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleAddVehicle}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add Vehicle
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Registration Number*</label>
            <input
              type="text"
              value={vehicleData.registration_number}
              onChange={(e) => setVehicleData({...vehicleData, registration_number: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Make*</label>
            <input
              type="text"
              value={vehicleData.make}
              onChange={(e) => setVehicleData({...vehicleData, make: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Model*</label>
            <input
              type="text"
              value={vehicleData.model}
              onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Year</label>
            <input
              type="number"
              value={vehicleData.year}
              onChange={(e) => setVehicleData({...vehicleData, year: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Status</label>
            <select
              value={vehicleData.status}
              onChange={(e) => setVehicleData({...vehicleData, status: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="spare">Spare</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          {vehicleData.status === 'assigned' && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Assign to Driver*</label>
              <select
                value={vehicleData.assigned_driver_id || ''}
                onChange={(e) => setVehicleData({...vehicleData, assigned_driver_id: e.target.value || null})}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                required={vehicleData.status === 'assigned'}
              >
                <option value="">Select a driver</option>
                {drivers.map(driver => (
                  <option key={driver.id} value={driver.id}>{driver.full_name}</option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Notes</label>
            <textarea
              rows={3}
              value={vehicleData.notes}
              onChange={(e) => setVehicleData({...vehicleData, notes: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Documents</label>
            <p style={{ fontSize: '0.9rem', color: '#6c757d' }}>Documents can be added after creating the vehicle.</p>
          </div>
        </div>
      </Modal>
      
      {/* Edit Vehicle Modal */}
      <Modal 
        show={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        title="Edit Vehicle"
        footer={
          <>
            <button 
              onClick={() => setShowEditModal(false)}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleUpdateVehicle}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Update Vehicle
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Registration Number*</label>
            <input
              type="text"
              value={vehicleData.registration_number}
              onChange={(e) => setVehicleData({...vehicleData, registration_number: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Make*</label>
            <input
              type="text"
              value={vehicleData.make}
              onChange={(e) => setVehicleData({...vehicleData, make: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Model*</label>
            <input
              type="text"
              value={vehicleData.model}
              onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Year</label>
            <input
              type="number"
              value={vehicleData.year}
              onChange={(e) => setVehicleData({...vehicleData, year: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Status</label>
            <select
              value={vehicleData.status}
              onChange={(e) => setVehicleData({...vehicleData, status: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="spare">Spare</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          {vehicleData.status === 'assigned' && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Assign to Driver*</label>
              <select
                value={vehicleData.assigned_driver_id || ''}
                onChange={(e) => setVehicleData({...vehicleData, assigned_driver_id: e.target.value || null})}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                required={vehicleData.status === 'assigned'}
              >
                <option value="">Select a driver</option>
                {drivers.map(driver => (
                  <option key={driver.id} value={driver.id}>{driver.full_name}</option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Notes</label>
            <textarea
              rows={3}
              value={vehicleData.notes}
              onChange={(e) => setVehicleData({...vehicleData, notes: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
        </div>
      </Modal>
      
      {/* Document Modal */}
      <Modal 
        show={showDocumentModal} 
        onClose={() => setShowDocumentModal(false)} 
        title="Vehicle Documents"
        footer={
          <button 
            onClick={() => setShowDocumentModal(false)}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h4>Upload New Document</h4>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Document Name*</label>
            <input
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Document Type*</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              <option value="registration">Registration</option>
              <option value="insurance">Insurance</option>
              <option value="maintenance">Maintenance Record</option>
              <option value="inspection">Inspection Certificate</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>File*</label>
            <input
              type="file"
              onChange={(e) => setDocumentFile(e.target.files[0])}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <p style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '5px' }}>
              Supported formats: PDF, JPG, PNG, DOC, DOCX (max 5MB)
            </p>
          </div>
          <button
            onClick={handleUploadDocument}
            disabled={uploadLoading}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            {uploadLoading ? 'Uploading...' : 'Upload Document'}
          </button>
          
          <hr style={{ margin: '15px 0' }} />
          
          <h4>Existing Documents</h4>
          {documents.length === 0 ? (
            <p style={{ color: '#6c757d' }}>No documents found for this vehicle.</p>
          ) : (
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '5px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '10px' }}>{doc.name}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ 
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.85rem'
                        }}>
                          {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDownloadDocument(doc)}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #28a745',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            marginRight: '5px',
                            cursor: 'pointer'
                          }}
                          title="Download Document"
                        >
                          <span role="img" aria-label="Download">📥</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteDocument(doc.id)}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #dc3545',
                            color: '#dc3545',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}
                          title="Delete Document"
                        >
                          <span role="img" aria-label="Delete">🗑️</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '0.9rem' }}>
            Maximum 4 documents allowed per vehicle.
          </p>
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
        title="Confirm Delete"
        footer={
          <>
            <button 
              onClick={() => setShowDeleteModal(false)}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleDeleteVehicle}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Delete Vehicle
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete this vehicle? This action cannot be undone.</p>
        <p><strong>Warning:</strong> All associated documents and records will also be deleted.</p>
      </Modal>
    </div>
  );
};

export default AvailableVehicles;