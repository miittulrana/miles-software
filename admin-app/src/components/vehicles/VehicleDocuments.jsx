// admin-app/src/components/vehicles/VehicleDocuments.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const VehicleDocuments = ({ onBack }) => {
  const [documents, setDocuments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  
  // Upload state
  const [uploadLoading, setUploadLoading] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('registration');
  const [uploadVehicleId, setUploadVehicleId] = useState('');

  useEffect(() => {
    fetchData();
    
    // Subscribe to document changes
    const subscription = supabase
      .channel('public:vehicle_documents')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'vehicle_documents' 
      }, () => fetchData())
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [selectedVehicle, selectedType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, registration_number, make, model')
        .order('registration_number', { ascending: true });
      
      if (vehiclesError) throw vehiclesError;
      
      // Base query for documents
      let query = supabase
        .from('vehicle_documents')
        .select(`
          id,
          vehicle_id,
          name,
          type,
          file_path,
          file_type,
          created_at,
          vehicles(id, registration_number, make, model)
        `)
        .order('created_at', { ascending: false });
      
      // Apply vehicle filter
      if (selectedVehicle !== 'all') {
        query = query.eq('vehicle_id', selectedVehicle);
      }
      
      // Apply document type filter
      if (selectedType !== 'all') {
        query = query.eq('type', selectedType);
      }
      
      // Execute query
      const { data: documentsData, error: documentsError } = await query;
      
      if (documentsError) throw documentsError;
      
      setVehicles(vehiclesData || []);
      setDocuments(documentsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (e) => {
    setSelectedVehicle(e.target.value);
  };

  const handleTypeSelect = (e) => {
    setSelectedType(e.target.value);
  };

  const resetFilters = () => {
    setSelectedVehicle('all');
    setSelectedType('all');
  };

  const handleViewDocument = async (document) => {
    try {
      setCurrentDocument(document);
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

  const handleOpenUploadModal = (vehicleId = null) => {
    setDocumentFile(null);
    setDocumentName('');
    setDocumentType('registration');
    setUploadVehicleId(vehicleId || '');
    setShowUploadModal(true);
  };

  const handleOpenDeleteModal = (document) => {
    setCurrentDocument(document);
    setShowDeleteModal(true);
  };

  const handleUploadDocument = async () => {
    if (!documentFile || !documentName || !documentType || !uploadVehicleId) {
      setError('Please fill in all required fields.');
      return;
    }
    
    try {
      setUploadLoading(true);
      setError(null);
      
      // Check if we already have 4 documents for this vehicle
      const { count, error: countError } = await supabase
        .from('vehicle_documents')
        .select('*', { count: 'exact', head: true })
        .eq('vehicle_id', uploadVehicleId);
        
      if (countError) throw countError;
      
      if (count >= 4) {
        setError('Maximum 4 documents allowed per vehicle. Please delete an existing document first.');
        return;
      }
      
      // Upload file to storage
      const fileExt = documentFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `vehicle-documents/${uploadVehicleId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('miles-express')
        .upload(filePath, documentFile);
        
      if (uploadError) throw uploadError;
      
      // Create document record
      const { error: insertError } = await supabase
        .from('vehicle_documents')
        .insert({
          vehicle_id: uploadVehicleId,
          name: documentName,
          type: documentType,
          file_path: filePath,
          file_type: fileExt
        });
        
      if (insertError) throw insertError;
      
      // Reset form and close modal
      setShowUploadModal(false);
      setDocumentFile(null);
      setDocumentName('');
      setDocumentType('registration');
      setUploadVehicleId('');
      
      setSuccessMessage('Document uploaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error uploading document:', err);
      setError('Failed to upload document. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteDocument = async () => {
    try {
      // Get document details
      const { file_path } = currentDocument;
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('miles-express')
        .remove([file_path]);
        
      if (storageError) throw storageError;
      
      // Delete record
      const { error: deleteError } = await supabase
        .from('vehicle_documents')
        .delete()
        .eq('id', currentDocument.id);
        
      if (deleteError) throw deleteError;
      
      // Close modal
      setShowDeleteModal(false);
      
      setSuccessMessage('Document deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document. Please try again.');
    }
  };

  const handleDownloadDocument = async (document) => {
    try {
      const { data, error } = await supabase.storage
        .from('miles-express')
        .createSignedUrl(document.file_path, 60);
        
      if (error) throw error;
      
      // Open the URL in a new tab
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Failed to download document. Please try again.');
    }
  };

  // Helper function to format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to get document type label
  const getDocumentTypeLabel = (type) => {
    switch (type) {
      case 'registration':
        return 'Registration';
      case 'insurance':
        return 'Insurance';
      case 'maintenance':
        return 'Maintenance Record';
      case 'inspection':
        return 'Inspection Certificate';
      case 'other':
        return 'Other';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Modal component
  const Modal = ({ show, onClose, title, children, footer }) => {
    if (!show) return null;
    
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '5px',
          width: '500px',
          maxWidth: '90%',
          maxHeight: '90%',
          overflowY: 'auto',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
          </div>
          <div style={{ padding: '15px' }}>
            {children}
          </div>
          {footer && (
            <div style={{ padding: '15px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button 
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          ← Back to Vehicle Management
        </button>
        <button
          onClick={() => handleOpenUploadModal()}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <span>+</span> Upload Document
        </button>
      </div>
      
      <h2>Vehicle Documents</h2>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '15px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      
      {successMessage && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '15px', 
          backgroundColor: '#d4edda', 
          color: '#155724',
          borderRadius: '4px'
        }}>
          {successMessage}
        </div>
      )}
      
      {/* Filters */}
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '5px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Filters</h3>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Vehicle</label>
            <select
              value={selectedVehicle}
              onChange={handleVehicleSelect}
              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', minWidth: '200px' }}
            >
              <option value="all">All Vehicles</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registration_number} ({vehicle.make} {vehicle.model})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Document Type</label>
            <select
              value={selectedType}
              onChange={handleTypeSelect}
              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', minWidth: '200px' }}
            >
              <option value="all">All Types</option>
              <option value="registration">Registration</option>
              <option value="insurance">Insurance</option>
              <option value="maintenance">Maintenance Record</option>
              <option value="inspection">Inspection Certificate</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <button
              onClick={resetFilters}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>
      
      {/* Documents List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ 
            border: '4px solid rgba(0, 0, 0, 0.1)',
            borderLeftColor: '#007bff',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            margin: '0 auto 15px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div>Loading documents...</div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📄</div>
          <h3>No documents found</h3>
          <p>Upload documents to vehicles for easy access and management</p>
        </div>
      ) : (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Document Name</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Vehicle</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>File Type</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Date Uploaded</th>
                <th style={{ padding: '12px 15px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(document => (
                <tr key={document.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px 15px' }}>{document.name}</td>
                  <td style={{ padding: '12px 15px' }}>
                    <span style={{ 
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.85rem'
                    }}>
                      {getDocumentTypeLabel(document.type)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    {document.vehicles?.registration_number} ({document.vehicles?.make} {document.vehicles?.model})
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    {document.file_type.toUpperCase()}
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    {formatDate(document.created_at)}
                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleViewDocument(document)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #007bff',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        marginRight: '5px',
                        cursor: 'pointer'
                      }}
                      title="View Document"
                    >
                      <span role="img" aria-label="View">👁️</span>
                    </button>
                    <button 
                      onClick={() => handleDownloadDocument(document)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #28a745',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        marginRight: '5px',
                        cursor: 'pointer'
                      }}
                      title="Download Document"
                    >
                      <span role="img" aria-label="Download">📥</span>
                    </button>
                    <button 
                      onClick={() => handleOpenDeleteModal(document)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #dc3545',
                        color: '#dc3545',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer'
                      }}
                      title="Delete Document"
                    >
                      <span role="img" aria-label="Delete">🗑️</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* View Document Modal */}
      <Modal
        show={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={currentDocument?.name || 'Document Viewer'}
        footer={
          <button 
            onClick={() => setShowViewModal(false)}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        }
      >
        {viewLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ 
              border: '4px solid rgba(0, 0, 0, 0.1)',
              borderLeftColor: '#007bff',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              margin: '0 auto 15px',
              animation: 'spin 1s linear infinite'
            }}></div>
            <div>Loading document...</div>
          </div>
        ) : documentUrl ? (
          <div style={{ textAlign: 'center' }}>
            {currentDocument?.file_type === 'pdf' ? (
              <iframe 
                src={documentUrl} 
                width="100%" 
                height="500px" 
                style={{ border: 'none' }}
                title={currentDocument?.name}
              />
            ) : ['jpg', 'jpeg', 'png', 'gif'].includes(currentDocument?.file_type.toLowerCase()) ? (
              <img 
                src={documentUrl} 
                alt={currentDocument?.name} 
                style={{ maxWidth: '100%', maxHeight: '500px' }} 
              />
            ) : (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>This file type cannot be previewed directly.</p>
                <button
                  onClick={() => handleDownloadDocument(currentDocument)}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    margin: '10px auto'
                  }}
                >
                  <span role="img" aria-label="Download">📥</span> Download File
                </button>
              </div>
            )}
            
            <div style={{ marginTop: '15px' }}>
              <p><strong>Vehicle:</strong> {currentDocument?.vehicles?.registration_number} ({currentDocument?.vehicles?.make} {currentDocument?.vehicles?.model})</p>
              <p><strong>Type:</strong> {getDocumentTypeLabel(currentDocument?.type)}</p>
              <p><strong>Uploaded:</strong> {formatDate(currentDocument?.created_at)}</p>
            </div>
            
            <button
              onClick={() => handleDownloadDocument(currentDocument)}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                margin: '10px auto'
              }}
            >
              <span role="img" aria-label="Download">📥</span> Download
            </button>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>
            Failed to load document preview.
          </div>
        )}
      </Modal>
      
      {/* Upload Document Modal */}
      <Modal
        show={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Document"
        footer={
          <>
            <button 
              onClick={() => setShowUploadModal(false)}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleUploadDocument}
              disabled={uploadLoading || !documentFile || !documentName || !documentType || !uploadVehicleId}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: uploadLoading || !documentFile || !documentName || !documentType || !uploadVehicleId ? 0.6 : 1
              }}
            >
              {uploadLoading ? 'Uploading...' : 'Upload Document'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Vehicle*</label>
            <select
              value={uploadVehicleId}
              onChange={(e) => setUploadVehicleId(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            >
              <option value="">Select a vehicle</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registration_number} ({vehicle.make} {vehicle.model})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Document Name*</label>
            <input
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
              placeholder="e.g., Insurance Policy 2025, Vehicle Registration"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Document Type*</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            >
              <option value="registration">Registration</option>
              <option value="insurance">Insurance</option>
              <option value="maintenance">Maintenance Record</option>
              <option value="inspection">Inspection Certificate</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>File*</label>
            <input
              type="file"
              onChange={(e) => setDocumentFile(e.target.files[0])}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <p style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '5px' }}>
              Supported formats: PDF, JPG, PNG, DOC, DOCX (max 5MB)
            </p>
          </div>
          
          <div style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
            <p style={{ fontSize: '0.9rem', color: '#dc3545', fontWeight: 'bold', margin: '0' }}>
              Note: Maximum 4 documents allowed per vehicle
            </p>
          </div>
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Document"
        footer={
          <>
            <button 
              onClick={() => setShowDeleteModal(false)}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleDeleteDocument}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Delete Document
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete the document "{currentDocument?.name}"?</p>
        <p><strong>Warning:</strong> This action cannot be undone. The document will be permanently deleted.</p>
      </Modal>
    </div>
  );
};

export default VehicleDocuments;