// admin-app/src/components/DocumentManagement.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge, Modal, Alert, Spinner } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

const DocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [documentType, setDocumentType] = useState('vehicle');
  const [relatedId, setRelatedId] = useState('');
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('');
  const [docFile, setDocFile] = useState(null);
  
  // View state
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch documents
        const { data: docsData, error: docsError } = await supabase
          .from('documents')
          .select(`
            id,
            name,
            type,
            file_path,
            created_at,
            vehicle_id,
            driver_id,
            vehicles (id, registration_number, make, model),
            users (id, full_name, email)
          `)
          .order('created_at', { ascending: false });
          
        if (docsError) throw docsError;
        
        // Fetch vehicles
        const { data: vehiclesData, error: vehiclesError } = await supabase
          .from('vehicles')
          .select('id, registration_number, make, model')
          .order('registration_number', { ascending: true });
          
        if (vehiclesError) throw vehiclesError;
        
        // Fetch drivers
        const { data: driversData, error: driversError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('role', 'driver')
          .order('full_name', { ascending: true });
          
        if (driversError) throw driversError;
        
        setDocuments(docsData || []);
        setVehicles(vehiclesData || []);
        setDrivers(driversData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load documents. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Subscribe to document changes
    const subscription = supabase
      .channel('public:documents')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'documents' 
      }, () => {
        fetchData();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!docFile) {
      setError('Please select a file to upload');
      return;
    }
    
    try {
      setUploadLoading(true);
      setError(null);
      
      // Upload file to storage
      const fileExt = docFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('miles-express')
        .upload(filePath, docFile);
        
      if (uploadError) throw uploadError;
      
      // Save document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          name: docName,
          type: docType,
          file_path: filePath,
          vehicle_id: documentType === 'vehicle' ? relatedId : null,
          driver_id: documentType === 'driver' ? relatedId : null
        });
        
      if (insertError) throw insertError;
      
      // Reset form and close modal
      setDocName('');
      setDocType('');
      setDocFile(null);
      setRelatedId('');
      setShowUploadModal(false);
      
      // Show success message
      setSuccessMessage('Document uploaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error uploading document:', err);
      setError('Failed to upload document. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleViewDocument = async (document) => {
    try {
      setSelectedDocument(document);
      setViewLoading(true);
      setShowViewModal(true);
      
      // Get document URL
      const { data, error } = await supabase.storage
        .from('miles-express')
        .createSignedUrl(document.file_path, 60); // URL valid for 60 seconds
        
      if (error) throw error;
      
      setDocumentUrl(data.signedUrl);
    } catch (err) {
      console.error('Error getting document URL:', err);
      setError('Failed to retrieve document. Please try again.');
      setShowViewModal(false);
    } finally {
      setViewLoading(false);
    }
  };

  const handleDeleteDocument = async (id) => {
    try {
      // Get document info first to get file path
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('miles-express')
        .remove([document.file_path]);
        
      if (storageError) throw storageError;
      
      // Delete record
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
        
      if (deleteError) throw deleteError;
      
      // Show success message
      setSuccessMessage('Document deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document. Please try again.');
    }
  };

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Document Management</h2>
        <Button variant="primary" onClick={() => setShowUploadModal(true)}>
          <i className="bi bi-plus-lg me-1"></i> Upload Document
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
      ) : documents.length === 0 ? (
        <Alert variant="info">No documents found. Upload your first document to get started.</Alert>
      ) : (
        <Card>
          <Table responsive hover className="mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Related To</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id}>
                  <td>{doc.name}</td>
                  <td>
                    <Badge bg="info">{doc.type}</Badge>
                  </td>
                  <td>
                    {doc.vehicle_id ? (
                      <span className="text-primary">
                        🚚 {doc.vehicles?.registration_number} ({doc.vehicles?.make} {doc.vehicles?.model})
                      </span>
                    ) : doc.driver_id ? (
                      <span className="text-success">
                        👤 {doc.users?.full_name}
                      </span>
                    ) : 'N/A'}
                  </td>
                  <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td>
                    <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleViewDocument(doc)}>
                      <i className="bi bi-eye"></i>
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => handleDeleteDocument(doc.id)}>
                      <i className="bi bi-trash"></i>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      
      {/* Upload Document Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Upload Document</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpload}>
            <Form.Group className="mb-3">
              <Form.Label>Document Name</Form.Label>
              <Form.Control
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Document Type</Form.Label>
              <Form.Control
                type="text"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                placeholder="e.g. Insurance, Logbook, Registration"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Related To</Form.Label>
              <Form.Select 
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="mb-2"
              >
                <option value="vehicle">Vehicle</option>
                <option value="driver">Driver</option>
              </Form.Select>
              
              {documentType === 'vehicle' ? (
                <Form.Select
                  value={relatedId}
                  onChange={(e) => setRelatedId(e.target.value)}
                  required
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.registration_number} ({vehicle.make} {vehicle.model})
                    </option>
                  ))}
                </Form.Select>
              ) : (
                <Form.Select
                  value={relatedId}
                  onChange={(e) => setRelatedId(e.target.value)}
                  required
                >
                  <option value="">Select Driver</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.full_name} ({driver.email})
                    </option>
                  ))}
                </Form.Select>
              )}
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>File</Form.Label>
              <Form.Control
                type="file"
                onChange={(e) => setDocFile(e.target.files[0])}
                required
              />
              <Form.Text className="text-muted">
                Supported formats: PDF, JPG, PNG (max 5MB)
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUploadModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpload} disabled={uploadLoading}>
            {uploadLoading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* View Document Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedDocument?.name}
            <Badge bg="info" className="ms-2">{selectedDocument?.type}</Badge>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewLoading ? (
            <div className="text-center my-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading document...</span>
              </Spinner>
            </div>
          ) : documentUrl ? (
            <div className="text-center">
              <p>
                {selectedDocument?.file_path?.endsWith('.pdf') ? (
                  <iframe 
                    src={documentUrl} 
                    width="100%" 
                    height="500px" 
                    title={selectedDocument?.name}
                    className="border-0"
                  />
                ) : (
                  <img 
                    src={documentUrl} 
                    alt={selectedDocument?.name} 
                    style={{ maxWidth: '100%', maxHeight: '500px' }} 
                  />
                )}
              </p>
              <Button variant="primary" href={documentUrl} target="_blank">
                <i className="bi bi-download me-1"></i> Download
              </Button>
            </div>
          ) : (
            <Alert variant="warning">Failed to load document preview.</Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default DocumentManagement;