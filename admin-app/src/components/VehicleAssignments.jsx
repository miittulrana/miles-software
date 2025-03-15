import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Button } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

const VehicleAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('vehicle_assignments')
          .select(`
            id,
            vehicle_id,
            driver_id,
            is_permanent,
            start_time,
            end_time,
            status,
            approved_by,
            created_at,
            vehicles (id, registration_number, make, model),
            users!vehicle_assignments_driver_id_fkey (id, full_name, email)
          `)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setAssignments(data || []);
      } catch (error) {
        console.error('Error fetching assignments:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignments();
    
    // Set up realtime subscription
    const subscription = supabase
      .channel('public:vehicle_assignments')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'vehicle_assignments'
      }, () => {
        fetchAssignments();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const approveAssignment = async (id) => {
    try {
      const { error } = await supabase
        .from('vehicle_assignments')
        .update({ 
          status: 'approved',
          approved_by: (await supabase.auth.getUser()).data.user.id
        })
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error approving assignment:', error);
    }
  };

  const rejectAssignment = async (id) => {
    try {
      const { error } = await supabase
        .from('vehicle_assignments')
        .update({ status: 'rejected' })
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error rejecting assignment:', error);
    }
  };

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Vehicle Assignments</h2>
        <Button variant="primary">
          <i className="bi bi-plus-lg me-1"></i> New Assignment
        </Button>
      </div>
      
      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : assignments.length === 0 ? (
        <p className="text-muted">No assignments found</p>
      ) : (
        <Card>
          <Table responsive hover className="mb-0">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(assignment => (
                <tr key={assignment.id}>
                  <td>{assignment.vehicles.registration_number} ({assignment.vehicles.make} {assignment.vehicles.model})</td>
                  <td>{assignment.users.full_name}</td>
                  <td>{assignment.is_permanent ? 'Permanent' : 'Temporary'}</td>
                  <td>{new Date(assignment.start_time).toLocaleDateString()}</td>
                  <td>{assignment.end_time ? new Date(assignment.end_time).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <Badge bg={
                      assignment.status === 'approved' ? 'success' :
                      assignment.status === 'rejected' ? 'danger' : 'warning'
                    }>
                      {assignment.status}
                    </Badge>
                  </td>
                  <td>
                    {assignment.status === 'pending' && (
                      <>
                        <Button 
                          variant="outline-success" 
                          size="sm" 
                          className="me-2"
                          onClick={() => approveAssignment(assignment.id)}
                        >
                          <i className="bi bi-check-lg"></i>
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => rejectAssignment(assignment.id)}
                        >
                          <i className="bi bi-x-lg"></i>
                        </Button>
                      </>
                    )}
                    {assignment.status !== 'pending' && (
                      <Button variant="outline-primary" size="sm">
                        <i className="bi bi-eye"></i>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </Container>
  );
};

export default VehicleAssignments;