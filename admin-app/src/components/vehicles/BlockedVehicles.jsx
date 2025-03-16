// admin-app/src/components/vehicles/BlockedVehicles.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const BlockedVehicles = ({ onBack }) => {
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Form data
  const [blockData, setBlockData] = useState({
    vehicle_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });
  
  const [currentBlockId, setCurrentBlockId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch vehicles - SIMPLE QUERY
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, registration_number, make, model')
        .order('registration_number', { ascending: true });
      
      if (vehiclesError) {
        console.error('Vehicles error:', vehiclesError);
        throw new Error('Failed to load vehicles');
      }
      
      // Fetch blocked periods - SIMPLE QUERY, NO JOINS
      const { data: blockedData, error: blockedError } = await supabase
        .from('vehicle_blocked_periods')
        .select('id, vehicle_id, start_date, end_date, reason, created_by, created_at')
        .order('start_date', { ascending: true });
      
      if (blockedError) {
        console.error('Blocked periods error:', blockedError);
        throw new Error('Failed to load blocked periods');
      }
      
      // Manually combine data instead of using Supabase joins
      const enhancedData = [];
      
      for (const block of blockedData) {
        const matchingVehicle = vehiclesData.find(v => v.id === block.vehicle_id);
        
        enhancedData.push({
          ...block,
          // Add vehicle info in the format the component expects
          vehicles: matchingVehicle ? {
            registration_number: matchingVehicle.registration_number,
            make: matchingVehicle.make,
            model: matchingVehicle.model
          } : null
        });
      }
      
      setVehicles(vehiclesData || []);
      setBlockedPeriods(enhancedData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load blocked vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlock = async () => {
    try {
      setError(null);
      
      // Form validation
      if (!blockData.vehicle_id || !blockData.start_date || !blockData.end_date || !blockData.reason) {
        setError('Please fill in all required fields.');
        return;
      }
      
      // Validate dates
      const startDate = new Date(blockData.start_date);
      const endDate = new Date(blockData.end_date);
      
      if (startDate > endDate) {
        setError('End date must be after start date.');
        return;
      }
      
      // Insert block - SIMPLE INSERT, NO RELATIONSHIP
      const { error } = await supabase
        .from('vehicle_blocked_periods')
        .insert({
          vehicle_id: blockData.vehicle_id,
          start_date: blockData.start_date,
          end_date: blockData.end_date,
          reason: blockData.reason
        });
      
      if (error) {
        console.error('Block insert error:', error);
        throw new Error('Failed to add block');
      }
      
      setShowAddModal(false);
      resetForm();
      setSuccessMessage('Vehicle blocked successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh data
      fetchData();
    } catch (err) {
      console.error('Error blocking vehicle:', err);
      setError(err.message || 'Failed to block vehicle. Please try again.');
    }
  };

  const handleUpdateBlock = async () => {
    try {
      setError(null);
      
      // Validate form
      if (!blockData.vehicle_id || !blockData.start_date || !blockData.end_date || !blockData.reason) {
        setError('Please fill in all required fields.');
        return;
      }
      
      // Validate dates
      const startDate = new Date(blockData.start_date);
      const endDate = new Date(blockData.end_date);
      
      if (startDate > endDate) {
        setError('End date must be after start date.');
        return;
      }
      
      // Update block - SIMPLE UPDATE
      const { error } = await supabase
        .from('vehicle_blocked_periods')
        .update({
          vehicle_id: blockData.vehicle_id,
          start_date: blockData.start_date,
          end_date: blockData.end_date,
          reason: blockData.reason
        })
        .eq('id', currentBlockId);
      
      if (error) {
        console.error('Block update error:', error);
        throw new Error('Failed to update block');
      }
      
      setShowEditModal(false);
      resetForm();
      setSuccessMessage('Block updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh data
      fetchData();
    } catch (err) {
      console.error('Error updating block:', err);
      setError(err.message || 'Failed to update block. Please try again.');
    }
  };

  const handleDeleteBlock = async () => {
    try {
      setError(null);
      
      // Delete block - SIMPLE DELETE
      const { error } = await supabase
        .from('vehicle_blocked_periods')
        .delete()
        .eq('id', currentBlockId);
      
      if (error) {
        console.error('Block delete error:', error);
        throw new Error('Failed to delete block');
      }
      
      setShowDeleteModal(false);
      setSuccessMessage('Block removed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh data
      fetchData();
    } catch (err) {
      console.error('Error deleting block:', err);
      setError(err.message || 'Failed to remove block. Please try again.');
    }
  };

  const openEditModal = (block) => {
    setCurrentBlockId(block.id);
    setBlockData({
      vehicle_id: block.vehicle_id,
      start_date: block.start_date.split('T')[0], // Format date for input field
      end_date: block.end_date.split('T')[0], // Format date for input field
      reason: block.reason
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (block) => {
    setCurrentBlockId(block.id);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setBlockData({
      vehicle_id: '',
      start_date: '',
      end_date: '',
      reason: ''
    });
    setCurrentBlockId(null);
  };

  // Helper function to format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
  
  // Check if a blocked period is active
  const isActive = (block) => {
    const now = new Date();
    const startDate = new Date(block.start_date);
    const endDate = new Date(block.end_date);
    return startDate <= now && endDate >= now;
  };
  
  // Check if a blocked period is upcoming
  const isUpcoming = (block) => {
    const now = new Date();
    const startDate = new Date(block.start_date);
    return startDate > now;
  };
  
  // Check if a blocked period is past
  const isPast = (block) => {
    const now = new Date();
    const endDate = new Date(block.end_date);
    return endDate < now;
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
          <span>+</span> Block Vehicle
        </button>
      </div>
      
      <h2>Blocked Vehicles</h2>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '15px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center' 
        }}>
          <span>{error}</span>
          <button 
            onClick={fetchData}
            style={{
              backgroundColor: '#721c24',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
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
          <div>Loading blocked vehicles...</div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      ) : blockedPeriods.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🚫</div>
          <h3>No blocked vehicles</h3>
          <p>Block a vehicle when it is unavailable for assignment</p>
        </div>
      ) : (
        <div>
          {/* Active Blocks */}
          <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Currently Blocked</h3>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '5px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            marginBottom: '20px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Vehicle</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Start Date</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>End Date</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Reason</th>
                  <th style={{ padding: '12px 15px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {blockedPeriods.filter(block => isActive(block)).length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '15px', textAlign: 'center', color: '#6c757d' }}>
                      No vehicles are currently blocked
                    </td>
                  </tr>
                ) : (
                  blockedPeriods.filter(block => isActive(block)).map(block => (
                    <tr key={block.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px 15px' }}>
                        {block.vehicles ? 
                          `${block.vehicles.registration_number} (${block.vehicles.make} ${block.vehicles.model})` :
                          `Vehicle ID: ${block.vehicle_id}`
                        }
                      </td>
                      <td style={{ padding: '12px 15px' }}>{formatDate(block.start_date)}</td>
                      <td style={{ padding: '12px 15px' }}>{formatDate(block.end_date)}</td>
                      <td style={{ padding: '12px 15px' }}>{block.reason}</td>
                      <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                        <button 
                          onClick={() => openEditModal(block)}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #6c757d',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            marginRight: '5px',
                            cursor: 'pointer'
                          }}
                          title="Edit Block"
                        >
                          <span role="img" aria-label="Edit">✏️</span>
                        </button>
                        <button 
                          onClick={() => openDeleteModal(block)}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #dc3545',
                            color: '#dc3545',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}
                          title="Remove Block"
                        >
                          <span role="img" aria-label="Delete">🗑️</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Upcoming Blocks */}
          <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Upcoming Blocks</h3>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '5px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            marginBottom: '20px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Vehicle</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Start Date</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>End Date</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Reason</th>
                  <th style={{ padding: '12px 15px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {blockedPeriods.filter(block => isUpcoming(block)).length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '15px', textAlign: 'center', color: '#6c757d' }}>
                      No upcoming blocks scheduled
                    </td>
                  </tr>
                ) : (
                  blockedPeriods.filter(block => isUpcoming(block)).map(block => (
                    <tr key={block.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px 15px' }}>
                        {block.vehicles ? 
                          `${block.vehicles.registration_number} (${block.vehicles.make} ${block.vehicles.model})` :
                          `Vehicle ID: ${block.vehicle_id}`
                        }
                      </td>
                      <td style={{ padding: '12px 15px' }}>{formatDate(block.start_date)}</td>
                      <td style={{ padding: '12px 15px' }}>{formatDate(block.end_date)}</td>
                      <td style={{ padding: '12px 15px' }}>{block.reason}</td>
                      <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                        <button 
                          onClick={() => openEditModal(block)}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #6c757d',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            marginRight: '5px',
                            cursor: 'pointer'
                          }}
                          title="Edit Block"
                        >
                          <span role="img" aria-label="Edit">✏️</span>
                        </button>
                        <button 
                          onClick={() => openDeleteModal(block)}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #dc3545',
                            color: '#dc3545',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}
                          title="Remove Block"
                        >
                          <span role="img" aria-label="Delete">🗑️</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Past Blocks */}
          <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Past Blocks</h3>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '5px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Vehicle</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Start Date</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>End Date</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {blockedPeriods.filter(block => isPast(block)).length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '15px', textAlign: 'center', color: '#6c757d' }}>
                      No past blocks found
                    </td>
                  </tr>
                ) : (
                  blockedPeriods.filter(block => isPast(block)).slice(0, 10).map(block => (
                    <tr key={block.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px 15px' }}>
                        {block.vehicles ? 
                          `${block.vehicles.registration_number} (${block.vehicles.make} ${block.vehicles.model})` :
                          `Vehicle ID: ${block.vehicle_id}`
                        }
                      </td>
                      <td style={{ padding: '12px 15px' }}>{formatDate(block.start_date)}</td>
                      <td style={{ padding: '12px 15px' }}>{formatDate(block.end_date)}</td>
                      <td style={{ padding: '12px 15px' }}>{block.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Add Block Modal */}
      <Modal 
        show={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        title="Block Vehicle"
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
              onClick={handleAddBlock}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Block Vehicle
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Vehicle*</label>
            <select
              value={blockData.vehicle_id}
              onChange={(e) => setBlockData({ ...blockData, vehicle_id: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            >
              <option value="">Select a vehicle</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registration_number} ({vehicle.make} {vehicle.model})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Start Date*</label>
            <input
              type="date"
              value={blockData.start_date}
              onChange={(e) => setBlockData({ ...blockData, start_date: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
              min={new Date().toISOString().split('T')[0]} // Prevent past dates
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>End Date*</label>
            <input
              type="date"
              value={blockData.end_date}
              onChange={(e) => setBlockData({ ...blockData, end_date: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
              min={blockData.start_date} // Prevent end date before start date
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Reason*</label>
            <textarea
              value={blockData.reason}
              onChange={(e) => setBlockData({ ...blockData, reason: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              rows={3}
              required
              placeholder="e.g., Maintenance, Repair, Out of service"
            />
          </div>
        </div>
      </Modal>
      
      {/* Edit Block Modal */}
      <Modal 
        show={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        title="Edit Block"
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
              onClick={handleUpdateBlock}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Update Block
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Vehicle*</label>
            <select
              value={blockData.vehicle_id}
              onChange={(e) => setBlockData({ ...blockData, vehicle_id: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            >
              <option value="">Select a vehicle</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registration_number} ({vehicle.make} {vehicle.model})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Start Date*</label>
            <input
              type="date"
              value={blockData.start_date}
              onChange={(e) => setBlockData({ ...blockData, start_date: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>End Date*</label>
            <input
              type="date"
              value={blockData.end_date}
              onChange={(e) => setBlockData({ ...blockData, end_date: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
              min={blockData.start_date} // Prevent end date before start date
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Reason*</label>
            <textarea
              value={blockData.reason}
              onChange={(e) => setBlockData({ ...blockData, reason: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              rows={3}
              required
              placeholder="e.g., Maintenance, Repair, Out of service"
            />
          </div>
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
        title="Remove Block"
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
              onClick={handleDeleteBlock}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Remove Block
            </button>
          </>
        }
      >
        <p>Are you sure you want to remove this block? The vehicle will become available for assignment during this period.</p>
      </Modal>
    </div>
  );
};

export default BlockedVehicles;