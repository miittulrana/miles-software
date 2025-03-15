import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

const DriverManagement = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'driver');
          
        if (error) throw error;
        setDrivers(data || []);
      } catch (error) {
        console.error('Error fetching drivers:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDrivers();
    
    // Set up realtime subscription
    const subscription = supabase
      .channel('public:users')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'users',
        filter: 'role=eq.driver'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setDrivers(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setDrivers(prev => prev.map(driver => 
            driver.id === payload.new.id ? payload.new : driver
          ));
        } else if (payload.eventType === 'DELETE') {
          setDrivers(prev => prev.filter(driver => driver.id !== payload.old.id));
        }
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Driver Management</h2>
        <Button variant="primary">
          <i className="bi bi-plus-lg me-1"></i> Add Driver
        </Button>
      </div>
      
      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : drivers.length === 0 ? (
        <p className="text-muted">No drivers found</p>
      ) : (
        <Card>
          <Table responsive hover className="mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(driver => (
                <tr key={driver.id}>
                  <td>{driver.full_name}</td>
                  <td>{driver.email}</td>
                  <td>{driver.phone || 'N/A'}</td>
                  <td>{new Date(driver.created_at).toLocaleDateString()}</td>
                  <td>
                    <Button variant="outline-primary" size="sm" className="me-2">
                      <i className="bi bi-pencil"></i>
                    </Button>
                    <Button variant="outline-danger" size="sm">
                      <i className="bi bi-trash"></i>
                    </Button>
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

export default DriverManagement;