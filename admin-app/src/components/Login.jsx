// admin-app/src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { supabase, isAdmin } from '../supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Check for existing session on component mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        setInitializing(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Verify if user is admin
          const adminStatus = await isAdmin();
          
          if (!adminStatus) {
            // If not admin, sign out
            await supabase.auth.signOut();
            setError('Access denied. This portal is for admin users only.');
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setInitializing(false);
      }
    };
    
    checkSession();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Verify if user is admin
      const adminStatus = await isAdmin();
      
      if (!adminStatus) {
        // If not admin, sign out
        await supabase.auth.signOut();
        throw new Error('Access denied. This portal is for admin users only.');
      }
    } catch (err) {
      setError(err.message);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <Container className="vh-100 d-flex align-items-center justify-content-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="vh-100 d-flex align-items-center justify-content-center">
      <Row className="justify-content-center w-100">
        <Col md={6} lg={4}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <i className="bi bi-truck-flatbed display-1 text-primary"></i>
                <h2 className="mt-3">Miles Express</h2>
                <p className="text-muted">Admin Dashboard</p>
              </div>
              
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleLogin}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Signing in...
                    </>
                  ) : 'Sign In'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;