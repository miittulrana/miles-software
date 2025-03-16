// admin-app/src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert, Spinner } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeVehicles: 0,
    totalDrivers: 0,
    pendingRequests: 0
  });
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get vehicles stats - SIMPLE QUERY
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, status');
        
      if (vehiclesError) {
        console.error("Vehicles error:", vehiclesError);
        throw new Error('Failed to load vehicles');
      }
      
      // Get drivers count - SIMPLE COUNT QUERY
      const { count: driversCount, error: driversError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'driver');
      
      if (driversError) {
        console.error("Drivers error:", driversError);
        throw new Error('Failed to count drivers');
      }
      
      // Get pending requests - SIMPLE COUNT QUERY
      const { count: pendingCount, error: pendingError } = await supabase
        .from('vehicle_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (pendingError) {
        console.error("Pending assignments error:", pendingError);
        throw new Error('Failed to count pending assignments');
      }
      
      // Get recent issues - WITHOUT JOINS
      const { data: issues, error: issuesError } = await supabase
        .from('vehicle_issues')
        .select('id, description, priority, status, created_at, vehicle_id, reported_by')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (issuesError) {
        console.error("Issues error:", issuesError);
        throw new Error('Failed to load recent issues');
      }
      
      // Get additional data for issues separately if needed
      let enhancedIssues = [];
      if (issues && issues.length > 0) {
        // Get all unique vehicle IDs from issues
        const vehicleIds = [...new Set(issues.map(issue => issue.vehicle_id))];
        
        // Fetch vehicle details
        const { data: issueVehicles, error: issueVehiclesError } = await supabase
          .from('vehicles')
          .select('id, registration_number, make, model')
          .in('id', vehicleIds);
          
        if (issueVehiclesError) {
          console.warn("Issue vehicles error:", issueVehiclesError);
          // Continue without vehicle details
        }
        
        // Get all unique user IDs from issues
        const userIds = [...new Set(issues.map(issue => issue.reported_by))];
        
        // Fetch user details
        const { data: issueUsers, error: issueUsersError } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', userIds);
          
        if (issueUsersError) {
          console.warn("Issue users error:", issueUsersError);
          // Continue without user details
        }
        
        // Combine data
        enhancedIssues = issues.map(issue => {
          const vehicle = issueVehicles?.find(v => v.id === issue.vehicle_id);
          const user = issueUsers?.find(u => u.id === issue.reported_by);
          
          return {
            ...issue,
            vehicles: vehicle || null,
            users: user || null
          };
        });
      }
      
      // Update stats
      setStats({
        totalVehicles: vehicles?.length || 0,
        activeVehicles: vehicles?.filter(v => v.status === 'available' || v.status === 'assigned').length || 0,
        totalDrivers: driversCount || 0,
        pendingRequests: pendingCount || 0
      });
      
      setRecentIssues(enhancedIssues || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger" className="my-3">
          <Alert.Heading>Error Loading Dashboard</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <button onClick={fetchData} className="btn btn-outline-danger">
              Retry
            </button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <h2 className="mb-4">Dashboard</h2>
      
      {/* Stats Cards */}
      <Row className="g-4 mb-4">
        <Col md={3}>
          <Card className="h-100 bg-primary text-white">
            <Card.Body className="d-flex flex-column align-items-center justify-content-center p-4">
              <div className="display-4 mb-2">{stats.totalVehicles}</div>
              <div className="text-center">Total Vehicles</div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="h-100 bg-success text-white">
            <Card.Body className="d-flex flex-column align-items-center justify-content-center p-4">
              <div className="display-4 mb-2">{stats.activeVehicles}</div>
              <div className="text-center">Active Vehicles</div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="h-100 bg-info text-white">
            <Card.Body className="d-flex flex-column align-items-center justify-content-center p-4">
              <div className="display-4 mb-2">{stats.totalDrivers}</div>
              <div className="text-center">Total Drivers</div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="h-100 bg-warning text-white">
            <Card.Body className="d-flex flex-column align-items-center justify-content-center p-4">
              <div className="display-4 mb-2">{stats.pendingRequests}</div>
              <div className="text-center">Pending Requests</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Recent Issues */}
      <Card>
        <Card.Header as="h5">Recent Issue Reports</Card.Header>
        <Card.Body>
          {recentIssues.length === 0 ? (
            <p className="text-center text-muted my-4">No issues reported</p>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Reported By</th>
                  <th>Issue</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentIssues.map(issue => (
                  <tr key={issue.id}>
                    <td>{issue.vehicles?.registration_number || `Vehicle ID: ${issue.vehicle_id}`}</td>
                    <td>{issue.users?.full_name || `User ID: ${issue.reported_by}`}</td>
                    <td>{issue.description}</td>
                    <td>
                      <Badge bg={
                        issue.priority === 'low' ? 'info' :
                        issue.priority === 'medium' ? 'warning' :
                        issue.priority === 'high' ? 'danger' : 'dark'
                      }>
                        {issue.priority}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={
                        issue.status === 'reported' ? 'secondary' :
                        issue.status === 'acknowledged' ? 'primary' :
                        issue.status === 'in_progress' ? 'warning' :
                        'success'
                      }>
                        {issue.status}
                      </Badge>
                    </td>
                    <td>{new Date(issue.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Dashboard;