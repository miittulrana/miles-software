// admin-app/src/components/vehicles/AssignVehicle.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const AssignVehicle = ({ onBack }) => {
  const [assignments, setAssignments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Form data
  const [assignmentData, setAssignmentData] = useState({
    vehicle_id: '',
    driver_id: '',
    start_time: '',
    end_time: '',
    notes: '',
    is_temporary: true
  });
  
  const [currentAssignmentId, setCurrentAssignmentId] = useState(null);
  const [availableVehicles, setAvailableVehicles] = useState([]);

  useEffect(() => {
    fetchData();
    
    // Subscribe to realtime changes
    const subscription = supabase
      .channel('public:vehicle_assignments')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'vehicle_assignments' 
      }, () => fetchData())
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, registration_number, make, model, status, assigned_driver_id')
        .order('registration_number', { ascending: true });
      
      if (vehiclesError) throw vehiclesError;
      
      // Fetch all drivers
      const { data: driversData, error: driversError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'driver')
        .order('full_name', { ascending: true });
      
      if (driversError) throw driversError;
      
      // Fetch temporary assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('vehicle_assignments')
        .select(`
          id,
          vehicle_id,
          driver_id,
          start_time,
          end_time,
          notes,
          is_temporary,
          status,
          created_by,
          created_at,
          vehicles(id, registration_number, make, model),
          users!vehicle_assignments_driver_id_fkey(id, full_name, email),
          admin:users!vehicle_assignments_created_by_fkey(id, email)
        `)
        .eq('is_temporary', true)
        .order('start_time', { ascending: false });
      
      if (assignmentsError) throw assignmentsError;
      
      // Store data
      setVehicles(vehiclesData || []);
      setDrivers(driversData || []);
      setAssignments(assignmentsData || []);
      
      // Calculate available vehicles (not permanently assigned)
      const available = vehiclesData?.filter(vehicle => 
        vehicle.status === 'available' || vehicle.status === 'spare'
      ) || [];
      
      setAvailableVehicles(available);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load assignment data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    try {
      setError(null);
      
      // Validate form
      if (!assignmentData.vehicle_id || !assignmentData.driver_id || !assignmentData.start_time) {
        setError('Please fill in all required fields.');
        return;
      }
      
      // Validate dates
      const startTime = new Date(assignmentData.start_time);
      const endTime = assignmentData.end_time ? new Date(assignmentData.end_time) : null;
      
      if (endTime && startTime > endTime) {
        setError('End date must be after start date.');
        return;
      }
      
      // Check if vehicle is available during this period
      // 1. Check if vehicle is blocked
      const { data: blockedData, error: blockedError } = await supabase
        .from('vehicle_blocked_periods')
        .select('id')
        .eq('vehicle_id', assignmentData.vehicle_id)
        .or(`start_date.lte.${assignmentData.end_time || '9999-12-31'},end_date.gte.${assignmentData.start_time}`);
      
      if (blockedError) throw blockedError;
      
      if (blockedData && blockedData.length > 0) {
        setError('Vehicle is blocked during this period. Please check the calendar or blocked vehicles section.');
        return;
      }
      
      // 2. Check if vehicle is already assigned during this period
      const { data: existingData, error: existingError } = await supabase
        .from('vehicle_assignments')
        .select('id')
        .eq('vehicle_id', assignmentData.vehicle_id)
        .or(`start_time.lte.${assignmentData.end_time || '9999-12-31'},end_time.gte.${assignmentData.start_time}`)
        .is('status', 'not.eq.rejected');
      
      if (existingError) throw existingError;
      
      if (existingData && existingData.length > 0) {
        setError('Vehicle is already assigned during this period. Please check the calendar or choose a different vehicle.');
        return;
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create assignment
      const { error } = await supabase
        .from('vehicle_assignments')
        .insert({
          vehicle_id: assignmentData.vehicle_id,
          driver_id: assignmentData.driver_id,
          start_time: assignmentData.start_time,
          end_time: assignmentData.end_time || null,
          notes: assignmentData.notes,
          is_temporary: true,
          status: 'approved', // Auto-approve admin assignments
          created_by: user.id
        });
      
      if (error) throw error;
      
      setShowAddModal(false);
      resetForm();
      setSuccessMessage('Vehicle assigned successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error assigning vehicle:', err);
      setError('Failed to assign vehicle. Please try again.');
    }
  };

  const handleDeleteAssignment = async () => {
    try {
      setError(null);
      
      const { error } = await supabase
        .from('vehicle_assignments')
        .update({ status: 'cancelled' })
        .eq('id', currentAssignmentId);
      
      if (error) throw error;
      
      setShowDeleteModal(false);
      setSuccessMessage('Assignment cancelled successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error cancelling assignment:', err);
      setError('Failed to cancel assignment. Please try again.');
    }
  };

  const openDeleteModal = (assignment) => {
    setCurrentAssignmentId(assignment.id);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setAssignmentData({
      vehicle_id: '',
      driver_id: '',
      start_time: '',
      end_time: '',
      notes: '',
      is_temporary: true
    });
    setCurrentAssignmentId(null);
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

  // Check if an assignment is active
  const isActive = (assignment) => {
    const now = new Date();
    const startTime = new Date(assignment.start_time);
    const endTime = assignment.end_time ? new Date(assignment.end_time) : null;
    
    if (!endTime) {
      return startTime <= now && assignment.status === 'approved';
    }
    
    return startTime <= now && endTime >= now && assignment.status === 'approved';
  };
  
  // Check if an assignment is upcoming
  const isUpcoming = (assignment) => {
    const now = new Date();
    const startTime = new Date(assignment.start_time);
    return startTime > now && assignment.status === 'approved';
  };
  
  // Check if an assignment is completed
  const isCompleted = (assignment) => {
    const now = new Date();
    const endTime = assignment.end_time ? new Date(assignment.end_time) : null;
    return endTime && endTime < now && assignment.status === 'approved';
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
          <span>+</span> Assign Vehicle
        </button>
      </div>
      
      <h2>Temporary Vehicle Assignments</h2>
      
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
          <div>Loading assignments...</div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      ) : (
        <div>
          {/* Active Assignments */}
          <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Active Assignments</h3>
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
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Driver</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Start Date</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>End Date</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Notes</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Assigned By</th>
                  <th style={{ padding: '12px 15px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.filter(assignment => isActive(assignment)).length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '15px', textAlign: 'center', color: '#6c757d' }}>
                      No active assignments
                    </td>
                  </tr>
                ) : (
                  assignments.filter(assignment => isActive(assignment)).map(assignment => (
                    <tr key={assignment.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px 15px' }}>
                        {assignment.vehicles?.registration_number} ({assignment.vehicles?.make} {assignment.vehicles?.model})
                      </td>
                      <td style={{ padding: '12px 15px' }}>{assignment.users?.full_name}</td>
                      <td style={{ padding: '12px 15px' }}>{formatDate(assignment.start_time)}</td>
                      <td style={{ padding: '12px 15px' }}>{assignment.end_time ? formatDate(assignment.end_time) : 'Ongoing'}</td>
                      <td style={{ padding: '12px 15px' }}>{assignment.notes || 'N/A'}</td>
                      <td style={{ padding: '12px 15px' }}>{assignment.admin?.email}</td>
                      <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                        <button 
                          onClick={() => openDeleteModal(assignment)}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #dc3545',
                            color: '#dc3545',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}
                          title="Cancel Assignment"
                        >
                          <span role="img" aria-label="Cancel">🚫</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Upcoming Assignments */}
          <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Upcoming Assignments</h3>
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
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Driver</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Start Date</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>End Date</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Notes</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Assigned By</th>
                  <th style={{ padding: '12px 15px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.filter(assignment => isUpcoming(assignment)).length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '15px', textAlign: 'center', color: '#6c757d' }}>
                      No upcoming assignments
                    </td>
                  </tr>
                ) : (
                  assignments.filter(assignment => isUpcoming(assignment)).map(assignment => (
                    <tr key={assignment.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px 15px' }}>
                        {assignment.vehicles?.registration_number} ({assignment.vehicles?.make} {assignment.vehicles?.model})
                      </td>
                      <td style={{ padding: '12px 15px' }}>{assignment.users?.full_name}</td>
                      <td style={{ padding: '12px 15px' }}>{formatDate(assignment.start_time)}</td>
                      <td style={{ padding: '12px 15px' }}>{assignment.end_time ? formatDate(assignment.end_time) : 'Ongoing'}</td>
                      <td style={{ padding: '12px 15px' }}>{assignment.notes || 'N/A'}</td>
                      <td style={{ padding: '12px 15px' }}>{assignment.admin?.email}</td>
                      <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                        <button 
                          onClick={() => openDeleteModal(assignment)}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #dc3545',
                            color: '#dc3545',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}
                          title="Cancel Assignment"
                        >
                          <span role="img" aria-label="Cancel">🚫</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Completed Assignments */}
          <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Completed Assignments</h3>
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
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Driver</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Start Date</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>End Date</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Assigned By</th>
                </tr>
              </thead>
              <tbody>
                {assignments.filter(assignment => isCompleted(assignment)).length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '15px', textAlign: 'center', color: '#6c757d' }}>
                      No completed assignments
                    </td>
                  </tr>
                ) : (
                  assignments.filter(assignment => isCompleted(assignment)).slice(0, 10).map(assignment => (
                    <tr key={assignment.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px 15px' }}>
                        {assignment.vehicles?.registration_number} ({assignment.vehicles?.make} {assignment.vehicles?.model})
                      </td>
                      <td style={{ padding: '12px 15px' }}>{assignment.users?.full_name}</td>
                      <td style={{ padding: '12px 15px' }}>{formatDate(assignment.start_time)}</td>
                      <td style={{ padding: '12px 15px' }}>{assignment.end_time ? formatDate(assignment.end_time) : 'Ongoing'}</td>
                      <td style={{ padding: '12px 15px' }}>{assignment.admin?.email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Cancelled Assignments */}
          <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Cancelled Assignments</h3>
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
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Driver</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Start Date</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>End Date</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Assigned By</th>
                </tr>
              </thead>
              <tbody>
                {assignments.filter(assignment => assignment.status === 'cancelled').length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '15px', textAlign: 'center', color: '#6c757d' }}>
                      No cancelled assignments
                    </td>
                  </tr>
                ) : (
                  assignments.filter(assignment => assignment.status === 'cancelled').slice(0, 10).map(assignment => (
                    <tr key={assignment.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px 15px' }}>
                        {assignment.vehicles?.registration_number} ({assignment.vehicles?.make} {assignment.vehicles?.model})
                      </td>
                      <td style={{ padding: '12px 15px' }}>{assignment.users?.full_name}</td>
                      <td style={{ padding: '12px 15px' }}>{formatDate(assignment.start_time)}</td>
                      <td style={{ padding: '12px 15px' }}>{assignment.end_time ? formatDate(assignment.end_time) : 'Ongoing'}</td>
                      <td style={{ padding: '12px 15px' }}>{assignment.admin?.email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Add Assignment Modal */}
      <Modal 
        show={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        title="Assign Vehicle"
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
              onClick={handleAddAssignment}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Assign Vehicle
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Vehicle*</label>
            <select
              value={assignmentData.vehicle_id}
              onChange={(e) => setAssignmentData({ ...assignmentData, vehicle_id: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            >
              <option value="">Select a vehicle</option>
              {availableVehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registration_number} ({vehicle.make} {vehicle.model})
                </option>
              ))}
            </select>
            {availableVehicles.length === 0 && (
              <div style={{ color: '#dc3545', marginTop: '5px', fontSize: '0.9rem' }}>
                No available vehicles. All vehicles are either assigned or unavailable.
              </div>
            )}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Driver*</label>
            <select
              value={assignmentData.driver_id}
              onChange={(e) => setAssignmentData({ ...assignmentData, driver_id: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            >
              <option value="">Select a driver</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name} ({driver.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Start Date*</label>
            <input
              type="date"
              value={assignmentData.start_time}
              onChange={(e) => setAssignmentData({ ...assignmentData, start_time: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
              min={new Date().toISOString().split('T')[0]} // Prevent past dates
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>End Date</label>
            <input
              type="date"
              value={assignmentData.end_time}
              onChange={(e) => setAssignmentData({ ...assignmentData, end_time: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              min={assignmentData.start_time} // Prevent end date before start date
            />
            <p style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '5px' }}>
              Leave empty for ongoing or indefinite assignments
            </p>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Notes</label>
            <textarea
              value={assignmentData.notes}
              onChange={(e) => setAssignmentData({ ...assignmentData, notes: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              rows={3}
              placeholder="Optional notes about this assignment"
            />
          </div>
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
        title="Cancel Assignment"
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
              Back
            </button>
            <button 
              onClick={handleDeleteAssignment}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel Assignment
            </button>
          </>
        }
      >
        <p>Are you sure you want to cancel this vehicle assignment?</p>
        <p>The vehicle will become available for other assignments after cancellation.</p>
      </Modal>
    </div>
  );
};

export default AssignVehicle;