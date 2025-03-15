import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge } from 'react-bootstrap';
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get vehicles stats
        const { data: vehicles, error: vehiclesError } = await supabase
          .from('vehicles')
          .select('*');
          
        if (vehiclesError) throw vehiclesError;
        
        // Get drivers count
        const { count: driversCount, error: driversError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'driver');
        
        if (driversError) throw driversError;
        
        // Get pending requests
        const { count: pendingCount, error: pendingError } = await supabase
          .from('vehicle_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        if (pendingError) throw pendingError;
        
        // Get recent issues
        const { data: issues, error: issuesError } = await supabase
          .from('vehicle_issues')
          .select(`
            id,
            description,
            priority,
            status,
            created_at,
            vehicles (registration_number),
            users (full_name)
          `)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (issuesError) throw issuesError;
        
        // Update stats
        setStats({
          totalVehicles: vehicles.length,
          activeVehicles: vehicles.filter(v => v.status === 'available' || v.status === 'assigned').length,
          totalDrivers: driversCount,
          pendingRequests: pendingCount
        });
        
        setRecentIssues(issues || []);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Subscribe to realtime issues
    const issueSubscription = supabase
      .channel('public:vehicle_issues')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'vehicle_issues' 
      }, () => {
        fetchData(); // Reload data when issues change
      })
      .subscribe();
      
    return () => {
      issueSubscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
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
                    <td>{issue.vehicles?.registration_number || "Unknown"}</td>
                    <td>{issue.users?.full_name || "Unknown"}</td>
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