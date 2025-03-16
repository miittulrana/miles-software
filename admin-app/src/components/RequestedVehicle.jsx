// admin-app/src/components/RequestedVehicle.jsx
import React, { useState, useEffect } from 'react';
import { Container, Card, Tab, Tabs, Table, Badge, Button, Alert, Spinner, Form, Modal } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

const RequestedVehicle = () => {
  // State variables
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [existingAssignments, setExistingAssignments] = useState([]);
  
  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [conflicts, setConflicts] = useState([]);

  // Fetch data on component mount
  useEffect(() => {
    fetchRequests();
    fetchBlockedPeriods();
    fetchExistingAssignments();
    
    // Set up real-time subscription for vehicle_assignments table
    const subscription = supabase
      .channel('vehicle_assignments_changes')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'vehicle_assignments' }, 
          () => {
            fetchRequests();
          }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch vehicle requests with different statuses
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, check if the vehicle_assignments table exists and its structure
      const { data: tableInfo, error: tableError } = await supabase
        .from('vehicle_assignments')
        .select('id')
        .limit(1);
        
      if (tableError) {
        console.error('Error checking vehicle_assignments table:', tableError);
        throw new Error(`Table error: ${tableError.message || tableError}`);
      }
      
      // Simplify the query first to isolate the problem
      const { data: pendingData, error: pendingError } = await supabase
        .from('vehicle_assignments')
        .select(`
          id,
          vehicle_id,
          driver_id,
          start_time,
          end_time,
          notes,
          created_at,
          status
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (pendingError) {
        console.error('Pending requests query error:', pendingError);
        throw new Error(`Pending requests error: ${pendingError.message || pendingError}`);
      }
      
      // Now try to get vehicle info separately
      let enhancedPendingData = [];
      if (pendingData && pendingData.length > 0) {
        enhancedPendingData = await Promise.all(pendingData.map(async (request) => {
          // Get vehicle info
          const { data: vehicleData, error: vehicleError } = await supabase
            .from('vehicles')
            .select('id, registration_number, make, model, status')
            .eq('id', request.vehicle_id)
            .single();
            
          if (vehicleError) {
            console.warn(`Could not fetch vehicle for request ${request.id}:`, vehicleError);
          }
          
          // Get user info
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, full_name, email, phone')
            .eq('id', request.driver_id)
            .single();
            
          if (userError) {
            console.warn(`Could not fetch driver for request ${request.id}:`, userError);
          }
          
          return {
            ...request,
            vehicles: vehicleData || null,
            users: userData || null
          };
        }));
      }
      
      // Similarly simplify approved and rejected queries
      const { data: approvedData, error: approvedError } = await supabase
        .from('vehicle_assignments')
        .select(`
          id,
          vehicle_id,
          driver_id,
          start_time,
          end_time,
          notes,
          created_at,
          status
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (approvedError) {
        console.error('Approved requests query error:', approvedError);
        throw new Error(`Approved requests error: ${approvedError.message || approvedError}`);
      }
      
      // Enhance approved data
      let enhancedApprovedData = [];
      if (approvedData && approvedData.length > 0) {
        enhancedApprovedData = await Promise.all(approvedData.map(async (request) => {
          const { data: vehicleData } = await supabase
            .from('vehicles')
            .select('id, registration_number, make, model, status')
            .eq('id', request.vehicle_id)
            .single();
            
          const { data: userData } = await supabase
            .from('users')
            .select('id, full_name, email, phone')
            .eq('id', request.driver_id)
            .single();
            
          return {
            ...request,
            vehicles: vehicleData || null,
            users: userData || null
          };
        }));
      }
      
      // Fetch rejected requests
      const { data: rejectedData, error: rejectedError } = await supabase
        .from('vehicle_assignments')
        .select(`
          id,
          vehicle_id,
          driver_id,
          start_time,
          end_time,
          notes,
          created_at,
          status,
          admin_notes
        `)
        .eq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (rejectedError) {
        console.error('Rejected requests query error:', rejectedError);
        throw new Error(`Rejected requests error: ${rejectedError.message || rejectedError}`);
      }
      
      // Enhance rejected data
      let enhancedRejectedData = [];
      if (rejectedData && rejectedData.length > 0) {
        enhancedRejectedData = await Promise.all(rejectedData.map(async (request) => {
          const { data: vehicleData } = await supabase
            .from('vehicles')
            .select('id, registration_number, make, model, status')
            .eq('id', request.vehicle_id)
            .single();
            
          const { data: userData } = await supabase
            .from('users')
            .select('id, full_name, email, phone')
            .eq('id', request.driver_id)
            .single();
            
          return {
            ...request,
            vehicles: vehicleData || null,
            users: userData || null
          };
        }));
      }
      
      setPendingRequests(enhancedPendingData || []);
      setApprovedRequests(enhancedApprovedData || []);
      setRejectedRequests(enhancedRejectedData || []);
      
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(`Failed to load vehicle requests: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch blocked periods for conflict checking
  const fetchBlockedPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_blocked_periods')
        .select('*');
        
      if (error) throw error;
      
      setBlockedPeriods(data || []);
    } catch (err) {
      console.error('Error fetching blocked periods:', err);
    }
  };

  // Fetch existing approved assignments for conflict checking
  const fetchExistingAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_assignments')
        .select('*')
        .eq('status', 'approved');
        
      if (error) throw error;
      
      setExistingAssignments(data || []);
    } catch (err) {
      console.error('Error fetching existing assignments:', err);
    }
  };

  // Check for conflicts before approval
  const checkForConflicts = (request) => {
    const conflicts = [];
    const requestStart = new Date(request.start_time);
    const requestEnd = request.end_time ? new Date(request.end_time) : new Date(9999, 11, 31); // Far future date if no end
    
    // Check blocked periods
    for (const block of blockedPeriods) {
      if (block.vehicle_id === request.vehicle_id) {
        const blockStart = new Date(block.start_date);
        const blockEnd = new Date(block.end_date);
        
        // Check for overlap
        if (requestStart <= blockEnd && requestEnd >= blockStart) {
          conflicts.push({
            type: 'block',
            reason: `Vehicle is blocked from ${formatDate(block.start_date)} to ${formatDate(block.end_date)}`,
            data: block
          });
        }
      }
    }
    
    // Check existing assignments
    for (const assignment of existingAssignments) {
      if (assignment.id !== request.id && // Not the same request
          assignment.vehicle_id === request.vehicle_id) { // Same vehicle
        
        const assignmentStart = new Date(assignment.start_time);
        const assignmentEnd = assignment.end_time ? 
                             new Date(assignment.end_time) : 
                             new Date(9999, 11, 31); // Far future if no end
        
        // Check for overlap
        if (requestStart <= assignmentEnd && requestEnd >= assignmentStart) {
          conflicts.push({
            type: 'assignment',
            reason: `Vehicle is already assigned from ${formatDate(assignment.start_time)} to ${assignment.end_time ? formatDate(assignment.end_time) : 'indefinitely'}`,
            data: assignment
          });
        }
      }
    }
    
    return conflicts;
  };

  // Handle approving a request
  const handleApproveRequest = async () => {
    try {
      if (!currentRequest) return;
      
      // Update assignment status
      const { error } = await supabase
        .from('vehicle_assignments')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          approved_by: (await supabase.auth.getUser()).data.user.id
        })
        .eq('id', currentRequest.id);
        
      if (error) throw error;
      
      setShowApproveModal(false);
      setSuccessMessage('Request approved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh requests
      fetchRequests();
      fetchExistingAssignments();
    } catch (err) {
      console.error('Error approving request:', err);
      setError(`Failed to approve request: ${err.message}`);
    }
  };

  // Handle rejecting a request
  const handleRejectRequest = async () => {
    try {
      if (!currentRequest) return;
      
      if (!adminNotes.trim()) {
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
        .eq('id', currentRequest.id);
        
      if (error) throw error;
      
      setShowRejectModal(false);
      setAdminNotes('');
      setSuccessMessage('Request rejected successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh requests
      fetchRequests();
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError(`Failed to reject request: ${err.message}`);
    }
  };

  // Open approve modal
  const openApproveModal = (request) => {
    setCurrentRequest(request);
    setAdminNotes('');
    
    // Check for conflicts
    const foundConflicts = checkForConflicts(request);
    setConflicts(foundConflicts);
    
    setShowApproveModal(true);
  };

  // Open reject modal
  const openRejectModal = (request) => {
    setCurrentRequest(request);
    setAdminNotes('');
    setShowRejectModal(true);
  };

  // Helper function to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to format datetime
  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to calculate duration
  const calculateDuration = (startDate, endDate) => {
    if (!startDate) return 'N/A';
    if (!endDate) return 'Ongoing';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  };

  // Render requests table based on status
  const renderRequestsTable = (requests, status) => {
    if (requests.length === 0) {
      return (
        <div className="text-center p-4">
          <i className="bi bi-inbox" style={{ fontSize: '2rem', color: '#6c757d' }}></i>
          <p className="mt-3 text-muted">No {status} vehicle requests found</p>
        </div>
      );
    }
    
    return (
      <Table responsive hover>
        <thead>
          <tr>
            <th>Driver</th>
            <th>Vehicle</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Duration</th>
            <th>Requested On</th>
            <th>Reason</th>
            {status === 'pending' && <th className="text-center">Actions</th>}
            {status === 'rejected' && <th>Rejection Reason</th>}
          </tr>
        </thead>
        <tbody>
          {requests.map(request => (
            <tr key={request.id}>
              <td>
                <div className="d-flex align-items-center">
                  <i className="bi bi-person-circle me-2 text-secondary" style={{ fontSize: '1.2rem' }}></i>
                  <div>
                    <div>{request.users.full_name}</div>
                    <div className="text-muted small">{request.users.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <div>
                  <Badge bg={request.vehicles.status === 'available' ? 'success' : 
                             request.vehicles.status === 'maintenance' ? 'warning' : 'secondary'} 
                         className="me-2">
                    {request.vehicles.status}
                  </Badge>
                  {request.vehicles.registration_number}
                </div>
                <div className="small text-muted">{request.vehicles.make} {request.vehicles.model}</div>
              </td>
              <td>{formatDateTime(request.start_time)}</td>
              <td>{request.end_time ? formatDateTime(request.end_time) : 'Indefinitely'}</td>
              <td>{calculateDuration(request.start_time, request.end_time)}</td>
              <td>{formatDate(request.created_at)}</td>
              <td>
                <div className="text-truncate" style={{ maxWidth: '200px' }} title={request.notes}>
                  {request.notes || 'No reason provided'}
                </div>
              </td>
              {status === 'pending' && (
                <td className="text-center">
                  <Button 
                    variant="outline-success" 
                    size="sm" 
                    className="me-2"
                    onClick={() => openApproveModal(request)}
                  >
                    <i className="bi bi-check-lg"></i> Approve
                  </Button>
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => openRejectModal(request)}
                  >
                    <i className="bi bi-x-lg"></i> Reject
                  </Button>
                </td>
              )}
              {status === 'rejected' && (
                <td>
                  <div className="text-danger">
                    {request.admin_notes || 'No reason provided'}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Vehicle Requests</h2>
      
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          <i className="bi bi-exclamation-triangle me-2"></i>
          <div>
            <strong>Error:</strong> {error}
            <div className="mt-2">
              <Button 
                variant="outline-danger" 
                size="sm"
                onClick={() => {
                  console.log('Retrying fetch...');
                  fetchRequests();
                }}
              >
                <i className="bi bi-arrow-repeat me-1"></i> Retry
              </Button>
            </div>
          </div>
        </Alert>
      )}
      
      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
          <i className="bi bi-check-circle me-2"></i>
          {successMessage}
        </Alert>
      )}
      
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading vehicle requests...</p>
        </div>
      ) : (
        <Card>
          <Card.Header>
            <Tabs
              id="request-tabs"
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-3"
            >
              <Tab 
                eventKey="pending" 
                title={
                  <div className="d-flex align-items-center">
                    <i className="bi bi-hourglass-split me-2"></i>
                    Pending
                    {pendingRequests.length > 0 && (
                      <Badge bg="danger" pill className="ms-2">
                        {pendingRequests.length}
                      </Badge>
                    )}
                  </div>
                }
              >
                {renderRequestsTable(pendingRequests, 'pending')}
              </Tab>
              <Tab 
                eventKey="approved" 
                title={
                  <div className="d-flex align-items-center">
                    <i className="bi bi-check-circle me-2"></i>
                    Approved
                  </div>
                }
              >
                {renderRequestsTable(approvedRequests, 'approved')}
              </Tab>
              <Tab 
                eventKey="rejected" 
                title={
                  <div className="d-flex align-items-center">
                    <i className="bi bi-x-circle me-2"></i>
                    Rejected
                  </div>
                }
              >
                {renderRequestsTable(rejectedRequests, 'rejected')}
              </Tab>
            </Tabs>
          </Card.Header>
        </Card>
      )}
      
      {/* Approve Modal */}
      <Modal show={showApproveModal} onHide={() => setShowApproveModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Approve Vehicle Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentRequest && (
            <>
              <div className="mb-4">
                <h5>Request Details</h5>
                <Table bordered>
                  <tbody>
                    <tr>
                      <th width="150">Driver</th>
                      <td>{currentRequest.users.full_name}</td>
                    </tr>
                    <tr>
                      <th>Vehicle</th>
                      <td>{currentRequest.vehicles.registration_number} ({currentRequest.vehicles.make} {currentRequest.vehicles.model})</td>
                    </tr>
                    <tr>
                      <th>Period</th>
                      <td>
                        {formatDateTime(currentRequest.start_time)} to {currentRequest.end_time ? formatDateTime(currentRequest.end_time) : 'Indefinitely'}
                        <div className="small text-muted">Duration: {calculateDuration(currentRequest.start_time, currentRequest.end_time)}</div>
                      </td>
                    </tr>
                    <tr>
                      <th>Reason</th>
                      <td>{currentRequest.notes || 'No reason provided'}</td>
                    </tr>
                  </tbody>
                </Table>
              </div>
              
              {conflicts.length > 0 && (
                <Alert variant="warning">
                  <Alert.Heading>
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Conflicts Detected
                  </Alert.Heading>
                  <p>This request has conflicts with existing assignments or blocked periods:</p>
                  <ul>
                    {conflicts.map((conflict, index) => (
                      <li key={index}>{conflict.reason}</li>
                    ))}
                  </ul>
                  <p className="mb-0">You can still approve this request, but it may cause scheduling conflicts.</p>
                </Alert>
              )}
              
              <Form.Group className="mb-3">
                <Form.Label>Admin Notes (optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes or instructions for the driver"
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApproveModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleApproveRequest}
            disabled={!currentRequest}
          >
            <i className="bi bi-check-lg me-2"></i>
            Approve Request
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reject Vehicle Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentRequest && (
            <>
              <div className="mb-3">
                <div><strong>Driver:</strong> {currentRequest.users.full_name}</div>
                <div><strong>Vehicle:</strong> {currentRequest.vehicles.registration_number}</div>
                <div><strong>Period:</strong> {formatDate(currentRequest.start_time)} to {currentRequest.end_time ? formatDate(currentRequest.end_time) : 'Indefinitely'}</div>
              </div>
              
              <Form.Group className="mb-3">
                <Form.Label>Reason for Rejection*</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Provide a reason for rejecting this request"
                  required
                />
                <Form.Text className="text-muted">
                  This will be visible to the driver in the mobile app.
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleRejectRequest}
            disabled={!currentRequest || !adminNotes.trim()}
          >
            <i className="bi bi-x-lg me-2"></i>
            Reject Request
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default RequestedVehicle;