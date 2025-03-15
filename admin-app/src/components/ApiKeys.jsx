// admin-app/src/components/ApiKeys.jsx
import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Modal, Form, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

const ApiKeys = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [currentKeyId, setCurrentKeyId] = useState(null);
  const [newKeyData, setNewKeyData] = useState({
    name: '',
    module: 'vehicle_management',
    expiry_days: 365
  });
  const [generatedKey, setGeneratedKey] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Fetch api keys on component mount
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('api_keys')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setApiKeys(data || []);
      } catch (err) {
        console.error('Error fetching API keys:', err);
        setError('Failed to load API keys. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchApiKeys();
    
    // Subscribe to api_keys changes
    const subscription = supabase
      .channel('public:api_keys')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'api_keys' 
      }, () => {
        fetchApiKeys();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAddKey = async () => {
    try {
      setAddLoading(true);
      setError(null);
      
      // Generate a secure random API key
      const apiKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(newKeyData.expiry_days));
      
      // Calculate hashed key value (in a real app, you'd use a strong hash function)
      // For simplicity, we'll just store the key directly, but in production you should hash it
      
      // Save the API key record
      const { error } = await supabase
        .from('api_keys')
        .insert({
          name: newKeyData.name,
          module: newKeyData.module,
          key_hash: apiKey, // in production, store hash instead
          expires_at: expiryDate.toISOString()
        });
        
      if (error) throw error;
      
      // Close modal and show the generated key
      setShowAddModal(false);
      setGeneratedKey(apiKey);
      setShowKeyModal(true);
      
      // Reset form
      setNewKeyData({
        name: '',
        module: 'vehicle_management',
        expiry_days: 365
      });
    } catch (err) {
      console.error('Error generating API key:', err);
      setError('Failed to generate API key. Please try again.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteKey = async () => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', currentKeyId);
        
      if (error) throw error;
      
      setShowDeleteModal(false);
      setSuccessMessage('API key deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting API key:', err);
      setError('Failed to delete API key. Please try again.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setSuccessMessage('API key copied to clipboard!');
        setTimeout(() => setSuccessMessage(null), 3000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  const formatModuleName = (module) => {
    return module
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getModuleBadgeClass = (module) => {
    switch (module) {
      case 'vehicle_management':
        return 'bg-primary';
      case 'driver_management':
        return 'bg-success';
      case 'vehicle_tracking':
        return 'bg-danger';
      case 'document_management':
        return 'bg-info';
      case 'issue_reporting':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>API Keys Management</h2>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <i className="bi bi-plus-lg me-1"></i> Generate API Key
        </Button>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : apiKeys.length === 0 ? (
        <Alert variant="info">No API keys found. Generate your first API key to get started.</Alert>
      ) : (
        <Card>
          <Table responsive hover className="mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Module</th>
                <th>Created</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map(key => {
                const now = new Date();
                const expiryDate = new Date(key.expires_at);
                const isExpired = expiryDate < now;
                
                return (
                  <tr key={key.id}>
                    <td>{key.name}</td>
                    <td>
                      <span className={`badge ${getModuleBadgeClass(key.module)}`}>
                        {formatModuleName(key.module)}
                      </span>
                    </td>
                    <td>{new Date(key.created_at).toLocaleDateString()}</td>
                    <td>{new Date(key.expires_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${isExpired ? 'bg-danger' : 'bg-success'}`}>
                        {isExpired ? 'Expired' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        onClick={() => {
                          setCurrentKeyId(key.id);
                          setShowDeleteModal(true);
                        }}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
      
      {/* Add API Key Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Generate API Key</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Key Name</Form.Label>
              <Form.Control
                type="text"
                value={newKeyData.name}
                onChange={(e) => setNewKeyData({...newKeyData, name: e.target.value})}
                placeholder="e.g., Mobile App Key, Integration Key"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Module</Form.Label>
              <Form.Select
                value={newKeyData.module}
                onChange={(e) => setNewKeyData({...newKeyData, module: e.target.value})}
              >
                <option value="vehicle_management">Vehicle Management</option>
                <option value="driver_management">Driver Management</option>
                <option value="vehicle_tracking">Vehicle Tracking</option>
                <option value="document_management">Document Management</option>
                <option value="issue_reporting">Issue Reporting</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Expiry (days)</Form.Label>
              <Form.Control
                type="number"
                value={newKeyData.expiry_days}
                onChange={(e) => setNewKeyData({...newKeyData, expiry_days: e.target.value})}
                min="1"
                max="3650"
              />
              <Form.Text className="text-muted">
                Number of days until the key expires (max 10 years)
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddKey} 
            disabled={addLoading || !newKeyData.name}
          >
            {addLoading ? 'Generating...' : 'Generate Key'}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this API key? This action cannot be undone and may break integrations that use this key.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteKey}>
            Delete Key
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Generated Key Modal */}
      <Modal show={showKeyModal} onHide={() => setShowKeyModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Your New API Key</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            This key will only be shown once. Please copy it now and store it in a secure location.
          </Alert>
          
          <InputGroup className="mb-3">
            <Form.Control
              type="text"
              value={generatedKey}
              readOnly
            />
            <Button 
              variant="outline-secondary" 
              onClick={() => copyToClipboard(generatedKey)}
            >
              <i className="bi bi-clipboard"></i>
            </Button>
          </InputGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="primary" 
            onClick={() => {
              copyToClipboard(generatedKey);
              setShowKeyModal(false);
            }}
          >
            Copy & Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ApiKeys;