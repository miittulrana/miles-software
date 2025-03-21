// admin-app/src/components/vehicles/AssignVehicle.jsx
import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
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
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  
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
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchData();
    
    // Set up realtime subscription
    const channel = supabase.channel('assignment_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'vehicle_assignments' }, 
        () => {
          console.log('Assignments updated');
          fetchData();
        }
      )
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, []);

  // admin-app/src/components/vehicles/AssignVehicle.jsx - fetchData function
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, registration_number, make, model, status')
        .order('registration_number', { ascending: true })
      
      if (vehiclesError) {
        throw new Error(vehiclesError.message || 'Failed to load vehicles');
      }
      
      // Fetch all drivers
      const { data: driversData, error: driversError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'driver')
        .order('full_name', { ascending: true })
      
      if (driversError) {
        throw new Error(driversError.message || 'Failed to load drivers');
      }
      
      // Fetch temporary assignments - simplified query
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('vehicle_assignments')
        .select('id, vehicle_id, driver_id, start_time, end_time, notes, is_temporary, status, created_by, created_at')
        .eq('is_temporary', true)
        .order('start_time', { ascending: false });
      
      if (assignmentsError) {
        throw new Error(assignmentsError.message || 'Failed to load assignments');
      }
      
      // Enhance assignments with vehicle and driver data
      const enhancedAssignments = assignmentsData.map(assignment => {
        // Find related vehicle
        const vehicle = vehiclesData.find(v => v.id === assignment.vehicle_id) || { 
          registration_number: 'Unknown', 
          make: '', 
          model: '' 
        };
        
        // Find related driver
        const driver = driversData.find(d => d.id === assignment.driver_id) || { 
          full_name: 'Unknown', 
          email: '' 
        };
        
        return {
          ...assignment,
          vehicles: vehicle,
          users: driver
        };
      });
      
      // Store data
      setVehicles(vehiclesData || []);
      setDrivers(driversData || []);
      setAssignments(enhancedAssignments || []);
      
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

  // Modified to create pending assignments instead of approved ones
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
      
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting current user:', userError);
        setError('Authentication error. Please sign in again.');
        return;
      }
      
      if (!userData || !userData.user) {
        setError('Authentication required. Please sign in again.');
        return;
      }
      
      // Create assignment with pending status instead of approved
      const { error } = await supabase
        .from('vehicle_assignments')
        .insert({
          vehicle_id: assignmentData.vehicle_id,
          driver_id: assignmentData.driver_id,
          start_time: assignmentData.start_time,
          end_time: assignmentData.end_time || null,
          notes: assignmentData.notes,
          is_temporary: true,
          status: 'pending', // Changed from 'approved' to 'pending'
          created_by: userData.user.id
        });
      
      if (error) {
        throw new Error(error.message || 'Failed to assign vehicle');
      }
      
      setShowAddModal(false);
      resetForm();
      setSuccessMessage('Vehicle assignment request created! The request will now appear in the "Requested Vehicles" tab for approval.');
      setTimeout(() => setSuccessMessage(null), 5000);
      
      // Refresh data
      fetchData();
    } catch (err) {
      console.error('Error assigning vehicle:', err);
      setError(err.message || 'Failed to assign vehicle. Please try again.');
    }
  };

  // New function to handle assignment approval
  const handleApproveAssignment = async () => {
    try {
      if (!currentAssignmentId) return;
      
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      // Update assignment status
      const { error } = await supabase
        .from('vehicle_assignments')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          approved_by: userData.user.id
        })
        .eq('id', currentAssignmentId);
        
      if (error) throw error;
      
      setShowApproveModal(false);
      setAdminNotes('');
      setSuccessMessage('Assignment approved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh data
      fetchData();
    } catch (err) {
      console.error('Error approving assignment:', err);
      setError(`Failed to approve assignment: ${err.message}`);
    }
  };

  // New function to handle assignment rejection
  const handleRejectAssignment = async () => {
    try {
      if (!currentAssignmentId || !adminNotes.trim()) {
        setError('Please provide a reason for rejection');
        return;
      }
      
      // Update assignment status
      const { error } = await supabase
        .from('vehicle_assignments')
        .update({
          status: 'rejected',
          admin_notes: adminNotes
        })
        .eq('id', currentAssignmentId);
        
      if (error) throw error;
      
      setShowRejectModal(false);
      setAdminNotes('');
      setSuccessMessage('Assignment rejected successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh data
      fetchData();
    } catch (err) {
      console.error('Error rejecting assignment:', err);
      setError(`Failed to reject assignment: ${err.message}`);
    }
  };

  const handleDeleteAssignment = async () => {
    try {
      setError(null);
      
      // Cancel assignment
      const { error } = await supabase
        .from('vehicle_assignments')
        .update({ status: 'cancelled' })
        .eq('id', currentAssignmentId);
      
      if (error) {
        throw new Error(error.message || 'Failed to cancel assignment');
      }
      
      setShowDeleteModal(false);
      setSuccessMessage('Assignment cancelled successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh data
      fetchData();
    } catch (err) {
      console.error('Error cancelling assignment:', err);
      setError(err.message || 'Failed to cancel assignment. Please try again.');
    }
  };

  const openApproveModal = (assignment) => {
    setCurrentAssignmentId(assignment.id);
    setAdminNotes('');
    setShowApproveModal(true);
  };

  const openRejectModal = (assignment) => {
    setCurrentAssignmentId(assignment.id);
    setAdminNotes('');
    setShowRejectModal(true);
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
          {/* Pending Assignments */}
          <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Pending Approval</h3>
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
                  <th style={{ padding: '12px 15px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.filter(assignment => assignment.status === 'pending').length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '15px', textAlign: 'center', color: '#6c757d' }}>
                      No pending assignment requests
                    </td>
                  </tr>
                ) : (
                  assignments.filter(assignment => assignment.status === 'pending').map(assignment => (
                    <tr key={assignment.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px 15px' }}>
                        {assignment.vehicles?.registration_number} ({assignment.vehicles?.make} {assignment.vehicles?.model})
                      </td>
                      <td style={{ padding: '12px 15px' }}>{assignment.users?.full_name}</td>
                      <td style={{ padding: '12px 15px' }}>{formatDate(assignment.start_time)}</td>
                      <td style={{ padding: '12px 15px' }}>{assignment.end_time ? formatDate(assignment.end_time) : 'Ongoing'}</td>
                      <td style={{ padding: '12px 15px' }}>{assignment.notes || 'N/A'}</td>
                      <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                        <button 
                          onClick={() => openApproveModal(assignment)}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #28a745',
                            color: '#28a745',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            marginRight: '5px',
                            cursor: 'pointer'
                          }}
                          title="Approve Assignment"
                        >
                          <span role="img" aria-label="Approve">✅</span>
                        </button>
                        <button 
                          onClick={() => openRejectModal(assignment)}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #dc3545',
                            color: '#dc3545',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}
                          title="Reject Assignment"
                        >
                          <span role="img" aria-label="Reject">❌</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
                  <th style={{ padding: '12px 15px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.filter(assignment => isActive(assignment)).length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '15px', textAlign: 'center', color: '#6c757d' }}>
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
                  <th style={{ padding: '12px 15px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.filter(assignment => isUpcoming(assignment)).length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '15px', textAlign: 'center', color: '#6c757d' }}>
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
                </tr>
              </thead>
              <tbody>
                {assignments.filter(assignment => isCompleted(assignment)).length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '15px', textAlign: 'center', color: '#6c757d' }}>
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
                </tr>
              </thead>
              <tbody>
                {assignments.filter(assignment => assignment.status === 'cancelled').length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '15px', textAlign: 'center', color: '#6c757d' }}>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Rejected Assignments */}
          <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Rejected Assignments</h3>
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
                  <th style={{ padding: '12px 15px', textAlign: 'left' }}>Reason for Rejection</th>
                </tr>
              </thead>
              <tbody>
                {assignments.filter(assignment => assignment.status === 'rejected').length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '15px', textAlign: 'center', color: '#6c757d' }}>
                      No rejected assignments
                    </td>
                  </tr>
                ) : (
                  assignments.filter(assignment => assignment.status === 'rejected').slice(0, 10).map(assignment => (
                    <tr key={assignment.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px 15px' }}>
                        {assignment.vehicles?.registration_number} ({assignment.vehicles?.make} {assignment.vehicles?.model})
                      </td>
                      <td style={{ padding: '12px 15px' }}>{assignment.users?.full_name}</td>
                      <td style={{ padding: '12px 15px' }}>{formatDate(assignment.start_time)}</td>
                      <td style={{ padding: '12px 15px' }}>{assignment.end_time ? formatDate(assignment.end_time) : 'Ongoing'}</td>
                      <td style={{ padding: '12px 15px' }}>{assignment.admin_notes || 'No reason provided'}</td>
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
              Request Assignment
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
              placeholder="Reason for assignment request"
            />
          </div>

          <div style={{ 
            padding: '10px', 
            backgroundColor: '#fff3cd', 
            borderRadius: '4px', 
            fontSize: '0.9rem', 
            color: '#856404',
            border: '1px solid #ffeeba' 
          }}>
            <strong>Note:</strong> This will create a request that needs approval in the "Requested Vehicles" section.
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

      {/* Approve Modal */}
      <Modal 
        show={showApproveModal} 
        onClose={() => setShowApproveModal(false)} 
        title="Approve Assignment"
        footer={
          <>
            <button 
              onClick={() => setShowApproveModal(false)}
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
              onClick={handleApproveAssignment}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <span role="img" aria-label="Approve">✅</span> Approve
            </button>
          </>
        }
      >
        <p>Are you sure you want to approve this vehicle assignment?</p>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Notes (Optional)</label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            rows={3}
            placeholder="Add any notes for the driver"
          />
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal 
        show={showRejectModal} 
        onClose={() => setShowRejectModal(false)} 
        title="Reject Assignment"
        footer={
          <>
            <button 
              onClick={() => setShowRejectModal(false)}
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
              onClick={handleRejectAssignment}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: !adminNotes.trim() ? 0.7 : 1
              }}
              disabled={!adminNotes.trim()}
            >
              <span role="img" aria-label="Reject">❌</span> Reject
            </button>
          </>
        }
      >
        <p>Please provide a reason for rejecting this vehicle assignment:</p>
        <div>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            rows={3}
            placeholder="Reason for rejection (required)"
            required
          />
          <p style={{ color: '#6c757d', fontSize: '0.9rem', marginTop: '5px' }}>
            This information will be visible to the driver.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default AssignVehicle;