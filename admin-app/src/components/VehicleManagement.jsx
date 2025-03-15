// admin-app/src/components/VehicleManagement.jsx
import React, { useState, useEffect } from 'react';
import { supabase, subscribeToVehicleChanges } from '../supabaseClient';

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
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
      
      // Validate form
      if (!vehicleData.registration_number || !vehicleData.make || !vehicleData.model) {
        setError('Please fill in all required fields.');
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

  const handleMaintenanceUpdate = async () => {
    try {
      setError(null);
      
      // Validate dates
      if (!maintenanceData.start_date) {
        setError('Please specify a start date for maintenance.');
        return;
      }
      
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
      setSuccessMessage('Maintenance scheduled successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      resetMaintenanceForm();
    } catch (err) {
      console.error('Error updating maintenance:', err);
      setError('Failed to schedule maintenance. Please try again.');
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
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Vehicle Management</h2>
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
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Notes</th>
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
                    {vehicle.notes?.length > 30 ? vehicle.notes.substring(0, 30) + '...' : vehicle.notes}
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
                    >
                      <span role="img" aria-label="Edit">✏️</span>
                    </button>
                    <button 
                      onClick={() => openMaintenanceModal(vehicle)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #ffc107',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        marginRight: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      <span role="img" aria-label="Maintenance">🔧</span>
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
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
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
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
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
      </Modal>
      
      {/* Maintenance Modal */}
      <Modal 
        show={showMaintenanceModal} 
        onClose={() => setShowMaintenanceModal(false)} 
        title="Schedule Maintenance"
        footer={
          <>
            <button 
              onClick={() => setShowMaintenanceModal(false)}
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
              onClick={handleMaintenanceUpdate}
              style={{
                backgroundColor: '#ffc107',
                color: 'black',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Schedule Maintenance
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Start Date*</label>
            <input
              type="date"
              value={maintenanceData.start_date}
              onChange={(e) => setMaintenanceData({...maintenanceData, start_date: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>End Date</label>
            <input
              type="date"
              value={maintenanceData.end_date}
              onChange={(e) => setMaintenanceData({...maintenanceData, end_date: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Maintenance Notes</label>
            <textarea
              rows={3}
              value={maintenanceData.notes}
              onChange={(e) => setMaintenanceData({...maintenanceData, notes: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              placeholder="Describe maintenance details..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VehicleManagement;