// admin-app/src/components/drivers/DriverDocuments.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Table, Badge } from 'react-bootstrap';
import { supabase } from '../../supabaseClient';

const DriverDocuments = ({ onBack }) => {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(window.driverId || '');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Document upload state
  const [documentFile, setDocumentFile] = useState(null);
  const [documentType, setDocumentType] = useState('license');
  const [documentName, setDocumentName] = useState('');
  const [documentExpiry, setDocumentExpiry] = useState('');
  
  // Document view/delete state
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);

  // Fetch drivers on component mount
  useEffect(() => {
    fetchDrivers();
    
    // Clear any stored driver ID
    window.driverId = null;
  }, []);

  // Fetch documents when selected driver changes
  useEffect(() => {
    if (selectedDriver) {
      fetchDocuments(selectedDriver);
    } else {
      setDocuments([]);
    }
  }, [selectedDriver]);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'driver')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      
      setDrivers(data || []);
      setLoading(false);
      
      // If there was a stored driver ID, select it
      if (window.driverId) {
        setSelectedDriver(window.driverId);
      }
    } catch (err) {
      console.error('Error fetching drivers:', err);
      setError('Failed to load drivers: ' + err.message);
      setLoading(false);
    }
  };

  const fetchDocuments = async (driverId) => {
    try {
      setDocumentLoading(true);
      
      const { data, error } = await supabase
        .from('driver_documents')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setDocuments(data || []);
      setDocumentLoading(false);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents: ' + err.message);
      setDocumentLoading(false);
    }
  };

  const handleDriverSelect = (e) => {
    setSelectedDriver(e.target.value);
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    
    if (!selectedDriver) {
      setError('Please select a driver first');
      return;
    }
    
    if (!documentFile || !documentType || !documentName) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setUploadLoading(true);
      setError(null);
      
      // Check document type limit (only 1 of each type per driver)
      const { data: existingDocs, error: checkError } = await supabase
        .from('driver_documents')
        .select('id')
        .eq('driver_id', selectedDriver)
        .eq('type', documentType);
        
      if (checkError) throw checkError;
      
      if (existingDocs && existingDocs.length > 0) {
        throw new Error(`A document of type ${documentType === 'license' ? 'Driver\'s License' : 'ID Card'} already exists for this driver. Please delete it first.`);
      }
      
      // Upload file to storage
      const fileExt = documentFile.name.split('.').pop().toLowerCase();
      const allowedTypes = ['jpg', 'jpeg', 'png', 'pdf'];
      
      if (!allowedTypes.includes(fileExt)) {
        throw new Error('Only JPG, PNG, and PDF files are allowed');
      }
      
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `driver-documents/${selectedDriver}/${documentType}_${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('miles-express')
        .upload(filePath, documentFile);
        
      if (uploadError) throw uploadError;
      
      // Save document record in database
      const { error: insertError } = await supabase
        .from('driver_documents')
        .insert({
          driver_id: selectedDriver,
          name: documentName,
          type: documentType,
          expiry_date: documentExpiry || null,
          file_path: filePath,
          file_type: fileExt
        });
        
      if (insertError) throw insertError;
      
      // Success! Reset form and show message
      setDocumentFile(null);
      setDocumentName('');
      setDocumentExpiry('');
      setSuccessMessage('Document uploaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reset the file input by clearing its value
      const fileInput = document.getElementById('documentFile');
      if (fileInput) fileInput.value = '';
      
      // Refresh documents
      fetchDocuments(selectedDriver);
    } catch (err) {
      console.error('Error uploading document:', err);
      setError('Failed to upload document: ' + err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleViewDocument = async (document) => {
    try {
      setCurrentDocument(document);
      setShowViewModal(true);
      
      // Get a signed URL for the document
      const { data, error } = await supabase.storage
        .from('miles-express')
        .createSignedUrl(document.file_path, 60); // 60 seconds expiry
        
      if (error) throw error;
      
      setDocumentUrl(data.signedUrl);
    } catch (err) {
      console.error('Error getting document URL:', err);
      setError('Failed to retrieve document: ' + err.message);
      setShowViewModal(false);
    }
  };

  const handleDeleteDocument = async (document) => {
    try {
      setCurrentDocument(document);
      setShowDeleteModal(true);
    } catch (err) {
      console.error('Error preparing to delete document:', err);
      setError('Failed to prepare document deletion: ' + err.message);
    }
  };

  const confirmDeleteDocument = async () => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('miles-express')
        .remove([currentDocument.file_path]);
        
      if (storageError) throw storageError;
      
      // Delete from database
      const { error: deleteError } = await supabase
        .from('driver_documents')
        .delete()
        .eq('id', currentDocument.id);
        
      if (deleteError) throw deleteError;
      
      // Success
      setShowDeleteModal(false);
      setCurrentDocument(null);
      setSuccessMessage('Document deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh documents
      fetchDocuments(selectedDriver);
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document: ' + err.message);
      setShowDeleteModal(false);
    }
  };

  // Helper function to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  // Helper function to get document type label
  const getDocumentTypeLabel = (type) => {
    switch (type) {
      case 'license':
        return 'Driver\'s License';
      case 'id_card':
        return 'ID Card';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Helper function to check if a document is expired
  const isDocumentExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today;
  };

  // Helper function to get document status based on expiry
  const getDocumentStatus = (document) => {
    if (!document.expiry_date) {
      return <Badge bg="secondary">No Expiry</Badge>;
    }
    
    const today = new Date();
    const expiry = new Date(document.expiry_date);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <Badge bg="danger">Expired</Badge>;
    } else if (diffDays < 30) {
      return <Badge bg="warning">Expires Soon ({diffDays} days)</Badge>;
    } else {
      return <Badge bg="success">Valid</Badge>;
    }
  };

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Button 
          variant="link"
          className="ps-0"
          onClick={onBack}
        >
          <i className="bi bi-arrow-left me-2"></i> 
          Back to Driver Management
        </Button>
      </div>
      
      <h2 className="mb-4">Driver Documents</h2>
      
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {successMessage && <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>{successMessage}</Alert>}
      
      <Row className="mb-4">
        <Col md={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Select Driver</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading drivers...</span>
                  </Spinner>
                </div>
              ) : (
                <>
                  <Form.Group>
                    <Form.Label>Driver</Form.Label>
                    <Form.Select 
                      value={selectedDriver} 
                      onChange={handleDriverSelect}
                    >
                      <option value="">Select a driver</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {driver.full_name} ({driver.email})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  
                  {selectedDriver && (
                    <div className="mt-4">
                      <h6>Upload New Document</h6>
                      <Form onSubmit={handleUploadDocument}>
                        <Form.Group className="mb-3">
                          <Form.Label>Document Type*</Form.Label>
                          <Form.Select
                            value={documentType}
                            onChange={(e) => setDocumentType(e.target.value)}
                            required
                          >
                            <option value="license">Driver's License</option>
                            <option value="id_card">ID Card</option>
                          </Form.Select>
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Document Name*</Form.Label>
                          <Form.Control
                            type="text"
                            value={documentName}
                            onChange={(e) => setDocumentName(e.target.value)}
                            placeholder="e.g., State Driver's License"
                            required
                          />
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Expiry Date (if applicable)</Form.Label>
                          <Form.Control
                            type="date"
                            value={documentExpiry}
                            onChange={(e) => setDocumentExpiry(e.target.value)}
                          />
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Document File* (JPG, PNG, PDF only)</Form.Label>
                          <Form.Control
                            type="file"
                            id="documentFile"
                            onChange={(e) => setDocumentFile(e.target.files[0])}
                            accept=".jpg,.jpeg,.png,.pdf"
                            required
                          />
                        </Form.Group>
                        
                        <div className="d-grid">
                          <Button 
                            type="submit" 
                            variant="primary"
                            disabled={uploadLoading || !documentFile}
                          >
                            {uploadLoading ? (
                              <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Uploading...
                              </>
                            ) : (
                              <>Upload Document</>
                            )}
                          </Button>
                        </div>
                      </Form>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Documents</h5>
            </Card.Header>
            <Card.Body>
              {!selectedDriver ? (
                <Alert variant="info">
                  Please select a driver to view their documents
                </Alert>
              ) : documentLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading documents...</span>
                  </Spinner>
                </div>
              ) : documents.length === 0 ? (
                <Alert variant="light" className="text-center">
                  <div className="py-4">
                    <i className="bi bi-file-earmark-x" style={{ fontSize: '2rem' }}></i>
                    <h5 className="mt-3">No Documents Found</h5>
                    <p className="text-muted">Upload driver documents using the form on the left</p>
                  </div>
                </Alert>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Name</th>
                      <th>Expiry Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map(doc => (
                      <tr key={doc.id}>
                        <td>
                          <Badge 
                            bg={doc.type === 'license' ? 'primary' : 'info'}
                            className="text-white"
                          >
                            {getDocumentTypeLabel(doc.type)}
                          </Badge>
                        </td>
                        <td>{doc.name}</td>
                        <td>{doc.expiry_date ? formatDate(doc.expiry_date) : 'N/A'}</td>
                        <td>{getDocumentStatus(doc)}</td>
                        <td>
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="me-1"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <i className="bi bi-eye"></i>
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleDeleteDocument(doc)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* View Document Modal */}
      {showViewModal && currentDocument && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {getDocumentTypeLabel(currentDocument.type)}: {currentDocument.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowViewModal(false)}></button>
              </div>
              <div className="modal-body">
                {!documentUrl ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading document...</span>
                    </Spinner>
                  </div>
                ) : currentDocument.file_type === 'pdf' ? (
                  <div style={{ height: '500px', overflow: 'hidden' }}>
                    <iframe 
                      src={documentUrl} 
                      width="100%" 
                      height="100%" 
                      style={{ border: 'none' }}
                      title={currentDocument.name}
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <img 
                      src={documentUrl} 
                      alt={currentDocument.name} 
                      className="img-fluid"
                      style={{ maxHeight: '500px' }}
                    />
                  </div>
                )}
                
                <div className="mt-3">
                  <Table bordered size="sm">
                    <tbody>
                      <tr>
                        <th width="150">Document Type</th>
                        <td>{getDocumentTypeLabel(currentDocument.type)}</td>
                      </tr>
                      <tr>
                        <th>Name</th>
                        <td>{currentDocument.name}</td>
                      </tr>
                      <tr>
                        <th>File Type</th>
                        <td>{currentDocument.file_type.toUpperCase()}</td>
                      </tr>
                      <tr>
                        <th>Expiry Date</th>
                        <td>
                          {currentDocument.expiry_date ? formatDate(currentDocument.expiry_date) : 'N/A'}
                          {' '}
                          {currentDocument.expiry_date && getDocumentStatus(currentDocument)}
                        </td>
                      </tr>
                      <tr>
                        <th>Upload Date</th>
                        <td>{formatDate(currentDocument.created_at)}</td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" onClick={() => setShowViewModal(false)}>
                  Close
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => window.open(documentUrl, '_blank')}
                >
                  <i className="bi bi-download me-1"></i> Download
                </Button>
                <Button 
                  variant="danger" 
                  onClick={() => {
                    setShowViewModal(false);
                    handleDeleteDocument(currentDocument);
                  }}
                >
                  <i className="bi bi-trash me-1"></i> Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && currentDocument && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this document?</p>
                <div className="alert alert-info">
                  <strong>Document:</strong> {getDocumentTypeLabel(currentDocument.type)} - {currentDocument.name}
                </div>
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  This action cannot be undone.
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={confirmDeleteDocument}>
                  Delete Document
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default DriverDocuments;