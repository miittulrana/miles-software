// admin-app/src/components/vehicles/DocumentModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Table, Badge, Spinner } from 'react-bootstrap';
import { supabase } from '../../supabaseClient';

const DocumentModal = ({ show, onHide, vehicleId, vehicleName }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Document data
  const [documentFile, setDocumentFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('registration');
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);

  useEffect(() => {
    if (show && vehicleId) {
      fetchDocuments();
    }
  }, [show, vehicleId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // SQL: SELECT * FROM vehicle_documents WHERE vehicle_id = $1 ORDER BY created_at DESC
      const { data, error } = await supabase
        .from('vehicle_documents')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    
    if (!documentFile || !documentName || !documentType) {
      setError('Please fill in all document fields.');
      return;
    }
    
    try {
      setUploadLoading(true);
      setError(null);
      
      // Check if we already have 4 documents for this vehicle
      const { count, error: countError } = await supabase
        .from('vehicle_documents')
        .select('*', { count: 'exact', head: true })
        .eq('vehicle_id', vehicleId);
        
      if (countError) throw countError;
      
      if (count >= 4) {
        setError('Maximum 4 documents allowed per vehicle. Please delete an existing document first.');
        return;
      }
      
      // Upload file to storage with explicit public access
      const fileExt = documentFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `vehicle-documents/${vehicleId}/${fileName}`;
      
      // Upload with public access option
      const { error: uploadError } = await supabase.storage
        .from('miles-express')
        .upload(filePath, documentFile, {
          upsert: true,
          cacheControl: '3600'
        });
        
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }
      
      // Create document record
      const { error: insertError } = await supabase
        .from('vehicle_documents')
        .insert({
          vehicle_id: vehicleId,
          name: documentName,
          type: documentType,
          file_path: filePath,
          file_type: fileExt
        });
        
      if (insertError) {
        console.error('Document insert error:', insertError);
        
        // If insert failed, try to clean up the uploaded file
        await supabase.storage
          .from('miles-express')
          .remove([filePath]);
          
        throw insertError;
      }
      
      // Reset form
      setDocumentFile(null);
      setDocumentName('');
      setDocumentType('registration');
      
      // Show success message
      setSuccessMessage('Document uploaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh documents
      fetchDocuments();
      
      // Reset the file input
      document.getElementById('documentFile').value = '';
    } catch (err) {
      console.error('Error uploading document:', err);
      
      if (err.message?.includes('security policy')) {
        setError('Permission denied: You do not have access to upload documents. Please contact your administrator.');
      } else {
        setError('Failed to upload document: ' + err.message);
      }
    } finally {
      setUploadLoading(false);
    }
  };

  const handleViewDocument = async (document) => {
    try {
      setCurrentDocument(document);
      setShowViewModal(true);
      
      // Get signed URL for document
      const { data, error } = await supabase.storage
        .from('miles-express')
        .createSignedUrl(document.file_path, 60); // 60 seconds expiry
        
      if (error) throw error;
      
      setDocumentUrl(data.signedUrl);
    } catch (err) {
      console.error('Error getting document URL:', err);
      setError('Failed to retrieve document. Please try again.');
      setShowViewModal(false);
    }
  };

  const handleDeleteClick = (document) => {
    setCurrentDocument(document);
    setShowDeleteModal(true);
  };

  const handleDeleteDocument = async () => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('miles-express')
        .remove([currentDocument.file_path]);
        
      if (storageError) throw storageError;
      
      // Delete record
      // SQL: DELETE FROM vehicle_documents WHERE id = $1
      const { error: deleteError } = await supabase
        .from('vehicle_documents')
        .delete()
        .eq('id', currentDocument.id);
        
      if (deleteError) throw deleteError;
      
      setShowDeleteModal(false);
      setSuccessMessage('Document deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh documents
      fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document: ' + err.message);
    }
  };

  // Helper function to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  // Helper to get document type label
  const getDocumentTypeLabel = (type) => {
    const typeMap = {
      'registration': 'Registration',
      'insurance': 'Insurance',
      'maintenance': 'Maintenance Record',
      'inspection': 'Inspection Certificate',
      'other': 'Other'
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Vehicle Documents - {vehicleName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {successMessage && <Alert variant="success">{successMessage}</Alert>}
          
          <h5>Upload New Document</h5>
          <Form onSubmit={handleUploadDocument} className="mb-4">
            <Form.Group className="mb-3">
              <Form.Label>Document Name*</Form.Label>
              <Form.Control
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="e.g., Insurance Policy 2025, Vehicle Registration"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Document Type*</Form.Label>
              <Form.Select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                <option value="registration">Registration</option>
                <option value="insurance">Insurance</option>
                <option value="maintenance">Maintenance Record</option>
                <option value="inspection">Inspection Certificate</option>
                <option value="other">Other</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>File*</Form.Label>
              <Form.Control
                type="file"
                id="documentFile"
                onChange={(e) => setDocumentFile(e.target.files[0])}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                required
              />
              <Form.Text className="text-muted">
                Supported formats: PDF, JPG, PNG, DOC, DOCX (max 5MB)
              </Form.Text>
            </Form.Group>
            
            <Alert variant="warning">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Maximum 4 documents allowed per vehicle.
            </Alert>
            
            <Button 
              type="submit" 
              variant="primary"
              disabled={uploadLoading || !documentFile || !documentName}
            >
              {uploadLoading ? (
                <>
                  <Spinner as="span" size="sm" animation="border" className="me-2" />
                  Uploading...
                </>
              ) : 'Upload Document'}
            </Button>
          </Form>
          
          <hr />
          
          <h5>Existing Documents</h5>
          {loading ? (
            <div className="text-center my-3">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : documents.length === 0 ? (
            <Alert variant="info">No documents found for this vehicle.</Alert>
          ) : (
            <Table responsive bordered hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Date Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td>{doc.name}</td>
                    <td>
                      <Badge bg="info">{getDocumentTypeLabel(doc.type)}</Badge>
                    </td>
                    <td>{formatDate(doc.created_at)}</td>
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
                        onClick={() => handleDeleteClick(doc)}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Document Modal */}
      <Modal 
        show={showViewModal} 
        onHide={() => setShowViewModal(false)} 
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{currentDocument?.name || 'Document'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!documentUrl ? (
            <div className="text-center my-3">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading document...</span>
              </Spinner>
            </div>
          ) : currentDocument?.file_type === 'pdf' ? (
            <div className="ratio ratio-16x9">
              <iframe src={documentUrl} title={currentDocument?.name} allowFullScreen />
            </div>
          ) : ['jpg', 'jpeg', 'png', 'gif'].includes(currentDocument?.file_type.toLowerCase()) ? (
            <div className="text-center">
              <img 
                src={documentUrl} 
                alt={currentDocument?.name} 
                className="img-fluid"
                style={{ maxHeight: '60vh' }}
              />
            </div>
          ) : (
            <Alert variant="info">
              This file type cannot be previewed in the browser. 
              <div className="mt-3">
                <Button
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="primary"
                >
                  <i className="bi bi-download me-2"></i>
                  Download Document
                </Button>
              </div>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
          <Button variant="primary" href={documentUrl} target="_blank" rel="noopener noreferrer">
            <i className="bi bi-download me-2"></i>
            Download
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteModal} 
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Document</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete <strong>{currentDocument?.name}</strong>?</p>
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            This action cannot be undone.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteDocument}>
            Delete Document
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default DocumentModal;