// admin-app/src/components/IssueReporting.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

const IssueReporting = () => {
  const [issues, setIssues] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [currentIssue, setCurrentIssue] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch issues
        const { data: issuesData, error: issuesError } = await supabase
          .from('vehicle_issues')
          .select(`
            id,
            description,
            priority,
            status,
            created_at,
            admin_notes,
            vehicles (id, registration_number, make, model),
            users (id, full_name, email)
          `)
          .order('created_at', { ascending: false });
          
        if (issuesError) throw issuesError;
        
        // Fetch vehicles
        const { data: vehiclesData, error: vehiclesError } = await supabase
          .from('vehicles')
          .select('id, registration_number, make, model');
          
        if (vehiclesError) throw vehiclesError;
        
        setIssues(issuesData || []);
        setVehicles(vehiclesData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load issues. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Subscribe to issues changes
    const subscription = supabase
      .channel('public:vehicle_issues')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'vehicle_issues' 
      }, () => {
        fetchData();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'low':
        return <Badge bg="info">Low</Badge>;
      case 'medium':
        return <Badge bg="warning">Medium</Badge>;
      case 'high':
        return <Badge bg="danger">High</Badge>;
      case 'critical':
        return <Badge bg="dark">Critical</Badge>;
      default:
        return <Badge bg="secondary">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'reported':
        return <Badge bg="secondary">Reported</Badge>;
      case 'acknowledged':
        return <Badge bg="primary">Acknowledged</Badge>;
      case 'in_progress':
        return <Badge bg="warning">In Progress</Badge>;
      case 'resolved':
        return <Badge bg="success">Resolved</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const openDetailsModal = (issue) => {
    setCurrentIssue(issue);
    setShowDetailsModal(true);
  };

  const openUpdateModal = (issue) => {
    setCurrentIssue(issue);
    setStatusUpdate(issue.status);
    setAdminNotes(issue.admin_notes || '');
    setShowUpdateModal(true);
  };

  const handleStatusUpdate = async () => {
    try {
      setUpdateLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('vehicle_issues')
        .update({
          status: statusUpdate,
          admin_notes: adminNotes
        })
        .eq('id', currentIssue.id);
        
      if (error) throw error;
      
      setShowUpdateModal(false);
      setSuccessMessage('Issue status updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating issue:', err);
      setError('Failed to update issue status. Please try again.');
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Issue Reporting</h2>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : issues.length === 0 ? (
        <Alert variant="info">No issues reported yet.</Alert>
      ) : (
        <>
          {/* Issues requiring attention */}
          <h4 className="mt-4 mb-3">Issues Requiring Attention</h4>
          <Card className="mb-4">
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Reported By</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Reported</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues
                  .filter(issue => issue.status !== 'resolved')
                  .map(issue => (
                    <tr key={issue.id}>
                      <td>{issue.vehicles?.registration_number} ({issue.vehicles?.make} {issue.vehicles?.model})</td>
                      <td>{issue.users?.full_name}</td>
                      <td>{getPriorityBadge(issue.priority)}</td>
                      <td>{getStatusBadge(issue.status)}</td>
                      <td>{new Date(issue.created_at).toLocaleDateString()}</td>
                      <td>
                        <Button variant="outline-primary" size="sm" className="me-2" onClick={() => openDetailsModal(issue)}>
                          <i className="bi bi-eye"></i>
                        </Button>
                        <Button variant="outline-warning" size="sm" onClick={() => openUpdateModal(issue)}>
                          <i className="bi bi-pencil"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </Card>
          
          {/* Resolved issues */}
          <h4 className="mt-4 mb-3">Resolved Issues</h4>
          <Card>
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Reported By</th>
                  <th>Priority</th>
                  <th>Resolved</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues
                  .filter(issue => issue.status === 'resolved')
                  .map(issue => (
                    <tr key={issue.id}>
                      <td>{issue.vehicles?.registration_number} ({issue.vehicles?.make} {issue.vehicles?.model})</td>
                      <td>{issue.users?.full_name}</td>
                      <td>{getPriorityBadge(issue.priority)}</td>
                      <td>{new Date(issue.created_at).toLocaleDateString()}</td>
                      <td>
                        <Button variant="outline-primary" size="sm" onClick={() => openDetailsModal(issue)}>
                          <i className="bi bi-eye"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
      
      {/* Issue Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Issue Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentIssue && (
            <>
              <Row className="mb-3">
                <Col xs={4} className="fw-bold">Vehicle:</Col>
                <Col xs={8}>{currentIssue.vehicles?.registration_number} ({currentIssue.vehicles?.make} {currentIssue.vehicles?.model})</Col>
              </Row>
              <Row className="mb-3">
                <Col xs={4} className="fw-bold">Reported By:</Col>
                <Col xs={8}>{currentIssue.users?.full_name} ({currentIssue.users?.email})</Col>
              </Row>
              <Row className="mb-3">
                <Col xs={4} className="fw-bold">Date:</Col>
                <Col xs={8}>{new Date(currentIssue.created_at).toLocaleString()}</Col>
              </Row>
              <Row className="mb-3">
                <Col xs={4} className="fw-bold">Priority:</Col>
                <Col xs={8}>{getPriorityBadge(currentIssue.priority)}</Col>
              </Row>
              <Row className="mb-3">
                <Col xs={4} className="fw-bold">Status:</Col>
                <Col xs={8}>{getStatusBadge(currentIssue.status)}</Col>
              </Row>
              <Row className="mb-3">
                <Col xs={12} className="fw-bold">Issue Description:</Col>
                <Col xs={12}>
                  <Card>
                    <Card.Body>{currentIssue.description}</Card.Body>
                  </Card>
                </Col>
              </Row>
              {currentIssue.admin_notes && (
                <Row className="mb-3">
                  <Col xs={12} className="fw-bold">Admin Notes:</Col>
                  <Col xs={12}>
                    <Card>
                      <Card.Body>{currentIssue.admin_notes}</Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
          <Button variant="warning" onClick={() => {
            setShowDetailsModal(false);
            openUpdateModal(currentIssue);
          }}>
            Update Status
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Update Status Modal */}
      <Modal show={showUpdateModal} onHide={() => setShowUpdateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Update Issue Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentIssue && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Issue Status</Form.Label>
                <Form.Select
                  value={statusUpdate}
                  onChange={(e) => setStatusUpdate(e.target.value)}
                >
                  <option value="reported">Reported</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Admin Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about the issue or resolution..."
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUpdateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleStatusUpdate} disabled={updateLoading}>
            {updateLoading ? 'Updating...' : 'Update Status'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default IssueReporting;