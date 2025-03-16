// admin-app/src/components/drivers/DriverModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { supabase } from '../../supabaseClient';

const DriverModal = ({ 
  show, 
  onHide, 
  isEditing = false, 
  initialData = {}, 
  onSuccess 
}) => {
  const [driverData, setDriverData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    license_number: '',
    license_expiry: '',
    status: 'active',
    role: 'driver', // This is fixed for this component
    ...initialData
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDriverData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field when changed
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Required fields
    if (!driverData.full_name) errors.full_name = 'Name is required';
    if (!driverData.email) errors.email = 'Email is required';
    
    // Email validation
    if (driverData.email && !/\S+@\S+\.\S+/.test(driverData.email)) {
      errors.email = 'Email is invalid';
    }
    
    // Phone validation (optional)
    if (driverData.phone && !/^\+?[0-9\s\-()]+$/.test(driverData.phone)) {
      errors.phone = 'Phone number is invalid';
    }
    
    // License expiry date must be in the future if provided
    if (driverData.license_expiry) {
      const today = new Date();
      const expiryDate = new Date(driverData.license_expiry);
      if (expiryDate < today) {
        errors.license_expiry = 'Expiry date must be in the future';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Create a driver object with all fields
      const driverToUpsert = {
        full_name: driverData.full_name,
        email: driverData.email.toLowerCase().trim(),
        phone: driverData.phone || null,
        address: driverData.address || null,
        license_number: driverData.license_number || null,
        license_expiry: driverData.license_expiry || null,
        status: driverData.status || 'active',
        role: 'driver' // Always set role to driver
      };
      
      let result;
      
      if (isEditing) {
        // Update existing driver
        result = await supabase
          .from('users')
          .update(driverToUpsert)
          .eq('id', initialData.id)
          .select();
      } else {
        // When creating a new driver, handle auth separately
        // First check if the email already exists
        const { data: existingUsers } = await supabase
          .from('users')
          .select('email')
          .eq('email', driverToUpsert.email)
          .maybeSingle();
          
        if (existingUsers) {
          throw new Error('A user with this email already exists');
        }
        
        // For a new driver, we need to generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        
        // Create auth user first
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: driverToUpsert.email,
          password: tempPassword,
          email_confirm: true // Auto-confirm the email
        });
        
        if (authError) {
          throw authError;
        }
        
        // Then insert into the users table with the auth user's ID
        result = await supabase
          .from('users')
          .insert({
            ...driverToUpsert,
            id: authData.user.id, // Use the auth user's ID
            temp_password: tempPassword // Store the temporary password
          })
          .select();
      }
      
      if (result.error) {
        throw result.error;
      }
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal
      onHide();
      
    } catch (err) {
      console.error(`Error ${isEditing ? 'updating' : 'adding'} driver:`, err);
      setError(`Failed to ${isEditing ? 'update' : 'add'} driver: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{isEditing ? 'Edit Driver' : 'Add New Driver'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form id="driverForm" onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Full Name*</Form.Label>
                <Form.Control
                  type="text"
                  name="full_name"
                  value={driverData.full_name}
                  onChange={handleInputChange}
                  isInvalid={!!validationErrors.full_name}
                  required
                  autoFocus
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.full_name}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Email Address*</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={driverData.email}
                  onChange={handleInputChange}
                  isInvalid={!!validationErrors.email}
                  required
                  disabled={isEditing} // Can't change email for existing users
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.email}
                </Form.Control.Feedback>
                {isEditing && (
                  <Form.Text className="text-muted">
                    Email cannot be changed for existing drivers
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
          </Row>
          
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Phone Number</Form.Label>
                <Form.Control
                  type="tel"
                  name="phone"
                  value={driverData.phone || ''}
                  onChange={handleInputChange}
                  isInvalid={!!validationErrors.phone}
                  placeholder="e.g., +1 (555) 123-4567"
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.phone}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={driverData.status || 'active'}
                  onChange={handleInputChange}
                >
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>License Number</Form.Label>
                <Form.Control
                  type="text"
                  name="license_number"
                  value={driverData.license_number || ''}
                  onChange={handleInputChange}
                  isInvalid={!!validationErrors.license_number}
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.license_number}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>License Expiry Date</Form.Label>
                <Form.Control
                  type="date"
                  name="license_expiry"
                  value={driverData.license_expiry || ''}
                  onChange={handleInputChange}
                  isInvalid={!!validationErrors.license_expiry}
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.license_expiry}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
          
          <Form.Group className="mb-3">
            <Form.Label>Address</Form.Label>
            <Form.Control
              as="textarea"
              name="address"
              rows={2}
              value={driverData.address || ''}
              onChange={handleInputChange}
              placeholder="Full address"
            />
          </Form.Group>
          
          {!isEditing && (
            <Alert variant="info">
              <Alert.Heading>Note about new driver accounts</Alert.Heading>
              <p>
                A temporary password will be generated for this driver. You'll need to share this with them
                so they can log in for the first time. They will be prompted to reset their password on first login.
              </p>
            </Alert>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          type="submit" 
          form="driverForm"
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner as="span" animation="border" size="sm" className="me-2" />
              {isEditing ? 'Updating...' : 'Adding...'}
            </>
          ) : (
            isEditing ? 'Update Driver' : 'Add Driver'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DriverModal;