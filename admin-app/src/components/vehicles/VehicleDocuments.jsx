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
  const [formErrors, setFormErrors] = useState({});

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
    setFormErrors({});
    setShowUploadModal(true);
  };

  const handleOpenDeleteModal = (document) => {
    setCurrentDocument(document);
    setShowDeleteModal(true);
  };

  const validateUploadForm = () => {
    const errors = {};
    
    if (!documentName.trim()) {
      errors.name = 'Document name is required';
    }
    
    if (!documentType) {
      errors.type = 'Document type is required';
    }
    
    if (!uploadVehicleId) {
      errors.vehicle = 'Please select a vehicle';
    }
    
    if (!documentFile) {
      errors.file = 'Please select a file to upload';
    } else {
      // Check file size (max 5MB)
      if (documentFile.size > 5 * 1024 * 1024) {
        errors.file = 'File size exceeds the 5MB limit';
      }
      
      // Check file type
      const fileExt = documentFile.name.split('.').pop().toLowerCase();
      const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
      if (!allowedTypes.includes(fileExt)) {
        errors.file = 'File type not supported. Please use PDF, JPG, PNG, DOC, or DOCX';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUploadDocument = async () => {
    if (!validateUploadForm()) {
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
      const fileExt = documentFile.name.split('.').pop().toLowerCase();
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

  // Helper function to get document type color
  const getDocumentTypeColor = (type) => {
    switch (type) {
      case 'registration':
        return '#007bff'; // blue
      case 'insurance':
        return '#17a2b8'; // teal
      case 'maintenance':
        return '#6f42c1'; // purple
      case 'inspection':
        return '#fd7e14'; // orange
      case 'other':
        return '#6c757d'; // gray
      default:
        return '#17a2b8'; // default teal
    }
  };

  // Modal component
  const Modal = ({ show, onClose, title, children, footer, size = 'default' }) => {
    if (!show) return null;
    
    const modalWidth = size === 'large' ? '700px' : '500px';
    
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
        zIndex: 1000,
        backdropFilter: 'blur(3px)'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: modalWidth,
          maxWidth: '95%',
          maxHeight: '90%',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}>
          <div style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid #eee', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: '#f8f9fa',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>{title}</h3>
            <button 
              onClick={onClose} 
              style={{ 
                background: 'none', 
                border: 'none', 
                fontSize: '1.5rem', 
                cursor: 'pointer',
                color: '#6c757d',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              &times;
            </button>
          </div>
          <div style={{ padding: '20px' }}>
            {children}
          </div>
          {footer && (
            <div style={{ 
              padding: '15px 20px', 
              borderTop: '1px solid #eee', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '10px',
              backgroundColor: '#f8f9fa',
              borderBottomLeftRadius: '8px',
              borderBottomRightRadius: '8px'
            }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Button component for consistency
  const Button = ({ children, onClick, variant = 'primary', disabled = false, size = 'default', icon = null }) => {
    const getBackgroundColor = () => {
      switch (variant) {
        case 'primary': return '#007bff';
        case 'secondary': return '#6c757d';
        case 'success': return '#28a745';
        case 'danger': return '#dc3545';
        case 'outline-primary': return 'transparent';
        case 'outline-secondary': return 'transparent';
        case 'outline-success': return 'transparent';
        case 'outline-danger': return 'transparent';
        default: return '#007bff';
      }
    };
    
    const getColor = () => {
      if (variant.startsWith('outline-')) {
        switch (variant) {
          case 'outline-primary': return '#007bff';
          case 'outline-secondary': return '#6c757d';
          case 'outline-success': return '#28a745';
          case 'outline-danger': return '#dc3545';
          default: return '#007bff';
        }
      }
      return 'white';
    };
    
    const getBorder = () => {
      if (variant.startsWith('outline-')) {
        switch (variant) {
          case 'outline-primary': return '1px solid #007bff';
          case 'outline-secondary': return '1px solid #6c757d';
          case 'outline-success': return '1px solid #28a745';
          case 'outline-danger': return '1px solid #dc3545';
          default: return '1px solid #007bff';
        }
      }
      return 'none';
    };
    
    const getPadding = () => {
      return size === 'small' ? '4px 8px' : '8px 16px';
    };
    
    const getFontSize = () => {
      return size === 'small' ? '0.875rem' : '1rem';
    };
    
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          backgroundColor: getBackgroundColor(),
          color: getColor(),
          border: getBorder(),
          padding: getPadding(),
          borderRadius: '4px',
          fontSize: getFontSize(),
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.65 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          transition: 'all 0.2s',
          fontWeight: '500'
        }}
        onMouseOver={(e) => {
          if (!disabled) {
            if (variant.startsWith('outline-')) {
              e.currentTarget.style.backgroundColor = getColor();
              e.currentTarget.style.color = 'white';
            } else {
              e.currentTarget.style.opacity = 0.9;
            }
          }
        }}
        onMouseOut={(e) => {
          if (!disabled) {
            if (variant.startsWith('outline-')) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = getColor();
            } else {
              e.currentTarget.style.opacity = 1;
            }
          }
        }}
      >
        {icon && <span>{icon}</span>}
        {children}
      </button>
    );
  };

  // Alert component for messages
  const Alert = ({ children, variant = 'info', onDismiss = null }) => {
    const getBackgroundColor = () => {
      switch (variant) {
        case 'success': return '#d4edda';
        case 'danger': return '#f8d7da';
        case 'warning': return '#fff3cd';
        case 'info': return '#d1ecf1';
        default: return '#d1ecf1';
      }
    };
    
    const getColor = () => {
      switch (variant) {
        case 'success': return '#155724';
        case 'danger': return '#721c24';
        case 'warning': return '#856404';
        case 'info': return '#0c5460';
        default: return '#0c5460';
      }
    };
    
    const getBorderColor = () => {
      switch (variant) {
        case 'success': return '#c3e6cb';
        case 'danger': return '#f5c6cb';
        case 'warning': return '#ffeeba';
        case 'info': return '#bee5eb';
        default: return '#bee5eb';
      }
    };
    
    return (
      <div style={{
        padding: '12px 16px',
        marginBottom: '15px',
        backgroundColor: getBackgroundColor(),
        color: getColor(),
        borderRadius: '4px',
        border: `1px solid ${getBorderColor()}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>{children}</div>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: getColor(),
              fontSize: '1.5rem',
              cursor: 'pointer',
              marginLeft: '10px',
              padding: '0',
              lineHeight: '1'
            }}
          >
            &times;
          </button>
        )}
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
            gap: '5px',
            cursor: 'pointer',
            color: '#007bff',
            padding: '0'
          }}
        >
          <i className="bi bi-arrow-left"></i>
          Back to Vehicle Management
        </button>
        <Button
          onClick={() => handleOpenUploadModal()}
          icon={<i className="bi bi-plus-lg"></i>}
        >
          Upload Document
        </Button>
      </div>
      
      <h2 style={{ marginBottom: '20px' }}>Vehicle Documents</h2>
      
      {error && (
        <Alert variant="danger" onDismiss={() => setError(null)}>
          <strong>Error:</strong> {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
          <strong>Success:</strong> {successMessage}
        </Alert>
      )}
      
      {/* Filters */}
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ 
          marginTop: 0, 
          marginBottom: '15px', 
          fontSize: '1.1rem', 
          fontWeight: '600',
          color: '#343a40'
        }}>
          Filters
        </h3>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '500',
              color: '#495057',
              fontSize: '0.9rem'
            }}>
              Vehicle
            </label>
            <select
              value={selectedVehicle}
              onChange={handleVehicleSelect}
              style={{ 
                padding: '8px 12px', 
                borderRadius: '4px', 
                border: '1px solid #ced4da', 
                minWidth: '220px',
                backgroundColor: '#fff',
                color: '#495057',
                fontFamily: 'inherit'
              }}
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
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '500',
              color: '#495057',
              fontSize: '0.9rem'
            }}>
              Document Type
            </label>
            <select
              value={selectedType}
              onChange={handleTypeSelect}
              style={{ 
                padding: '8px 12px', 
                borderRadius: '4px', 
                border: '1px solid #ced4da', 
                minWidth: '220px',
                backgroundColor: '#fff',
                color: '#495057',
                fontFamily: 'inherit'
              }}
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
            <Button variant="secondary" onClick={resetFilters} icon={<i className="bi bi-x-circle"></i>}>
              Reset Filters
            </Button>
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
          <div style={{ color: '#6c757d' }}>Loading documents...</div>
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
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 0', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px', color: '#6c757d' }}>
            <i className="bi bi-file-earmark-text"></i>
          </div>
          <h3 style={{ marginBottom: '10px', color: '#343a40' }}>No documents found</h3>
          <p style={{ color: '#6c757d', maxWidth: '500px', margin: '0 auto' }}>
            {selectedVehicle !== 'all' || selectedType !== 'all' ? 
              'Try adjusting your filters or upload new documents.' : 
              'Upload documents to vehicles for easy access and management.'}
          </p>
          <div style={{ marginTop: '20px' }}>
            <Button onClick={() => handleOpenUploadModal()} icon={<i className="bi bi-plus-lg"></i>}>
              Upload First Document
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
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
                <tr 
                  key={document.id} 
                  style={{ 
                    borderBottom: '1px solid #dee2e6',
                    transition: 'background-color 0.1s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <td style={{ padding: '12px 15px' }}>{document.name}</td>
                  <td style={{ padding: '12px 15px' }}>
                    <span style={{ 
                      backgroundColor: getDocumentTypeColor(document.type),
                      color: 'white',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      display: 'inline-block'
                    }}>
                      {getDocumentTypeLabel(document.type)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <i className="bi bi-truck" style={{ color: '#6c757d' }}></i>
                      <span>
                        {document.vehicles?.registration_number} 
                        <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                          ({document.vehicles?.make} {document.vehicles?.model})
                        </span>
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    <span style={{ 
                      backgroundColor: '#e9ecef',
                      color: '#495057',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: '500'
                    }}>
                      {document.file_type.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    {formatDate(document.created_at)}
                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px' }}>
                      <button 
                        onClick={() => handleViewDocument(document)}
                        style={{
                          backgroundColor: 'transparent',
                          border: '1px solid #007bff',
                          color: '#007bff',
                          borderRadius: '4px',
                          padding: '5px 8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        title="View Document"
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#007bff';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#007bff';
                        }}
                      >
                        <i className="bi bi-eye"></i>
                      </button>
                      <button 
                        onClick={() => handleDownloadDocument(document)}
                        style={{
                          backgroundColor: 'transparent',
                          border: '1px solid #28a745',
                          color: '#28a745',
                          borderRadius: '4px',
                          padding: '5px 8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        title="Download Document"
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#28a745';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#28a745';
                        }}
                      >
                        <i className="bi bi-download"></i>
                      </button>
                      <button 
                        onClick={() => handleOpenDeleteModal(document)}
                        style={{
                          backgroundColor: 'transparent',
                          border: '1px solid #dc3545',
                          color: '#dc3545',
                          borderRadius: '4px',
                          padding: '5px 8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        title="Delete Document"
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc3545';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#dc3545';
                        }}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
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
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>{currentDocument?.name || 'Document Viewer'}</span>
            {currentDocument?.type && (
              <span style={{ 
                backgroundColor: getDocumentTypeColor(currentDocument.type),
                color: 'white',
                padding: '2px 10px',
                borderRadius: '20px',
                fontSize: '0.7rem',
                fontWeight: '500'
              }}>
                {getDocumentTypeLabel(currentDocument.type)}
              </span>
            )}
          </div>
        }
        size="large"
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button 
              variant="secondary" 
              onClick={() => setShowViewModal(false)}
            >
              Close
            </Button>
            {currentDocument && (
              <>
                <Button 
                  variant="success" 
                  icon={<i className="bi bi-download"></i>}
                  onClick={() => handleDownloadDocument(currentDocument)}
                >
                  Download
                </Button>
                <Button 
                  variant="danger" 
                  icon={<i className="bi bi-trash"></i>}
                  onClick={() => {
                    setShowViewModal(false);
                    handleOpenDeleteModal(currentDocument);
                  }}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
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
            <div style={{ color: '#6c757d' }}>Loading document...</div>
          </div>
        ) : documentUrl ? (
          <div style={{ textAlign: 'center' }}>
            {currentDocument?.file_type === 'pdf' ? (
              <div style={{ 
                border: '1px solid #dee2e6', 
                borderRadius: '4px', 
                overflow: 'hidden',
                marginBottom: '15px'
              }}>
                <iframe 
                  src={documentUrl} 
                  width="100%" 
                  height="500px" 
                  style={{ border: 'none' }}
                  title={currentDocument?.name}
                />
              </div>
            ) : ['jpg', 'jpeg', 'png', 'gif'].includes(currentDocument?.file_type.toLowerCase()) ? (
              <div style={{ marginBottom: '15px' }}>
                <img 
                  src={documentUrl} 
                  alt={currentDocument?.name} 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '500px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    padding: '5px',
                    backgroundColor: '#f8f9fa'
                  }} 
                />
              </div>
            ) : (
              <div style={{ 
                padding: '30px', 
                textAlign: 'center',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '15px',
                border: '1px dashed #dee2e6',
              }}>
                <div style={{ 
                  fontSize: '48px', 
                  marginBottom: '15px',
                  color: '#6c757d'
                }}>
                  <i className="bi bi-file-earmark"></i>
                </div>
                <p style={{ marginBottom: '15px' }}>This file type cannot be previewed directly.</p>
                <Button 
                  variant="success" 
                  icon={<i className="bi bi-download"></i>}
                  onClick={() => handleDownloadDocument(currentDocument)}
                >
                  Download File
                </Button>
              </div>
            )}
            
            <div style={{ 
              marginTop: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              padding: '15px',
              textAlign: 'left',
              border: '1px solid #e9ecef'
            }}>
              <h4 style={{ 
                fontSize: '1rem', 
                marginBottom: '15px',
                color: '#495057',
                fontWeight: '600'
              }}>
                Document Information
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 30px' }}>
                <div style={{ minWidth: '200px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '3px' }}>
                    DOCUMENT NAME
                  </div>
                  <div style={{ fontWeight: '500' }}>{currentDocument?.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '3px' }}>
                    DOCUMENT TYPE
                  </div>
                  <div style={{ fontWeight: '500' }}>{getDocumentTypeLabel(currentDocument?.type)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '3px' }}>
                    FILE TYPE
                  </div>
                  <div style={{ fontWeight: '500' }}>{currentDocument?.file_type.toUpperCase()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '3px' }}>
                    UPLOADED
                  </div>
                  <div style={{ fontWeight: '500' }}>{formatDate(currentDocument?.created_at)}</div>
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '3px' }}>
                  VEHICLE
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px',
                  fontWeight: '500'
                }}>
                  <i className="bi bi-truck" style={{ color: '#6c757d' }}></i>
                  <span>
                    {currentDocument?.vehicles?.registration_number} 
                    ({currentDocument?.vehicles?.make} {currentDocument?.vehicles?.model})
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>
            <div style={{ 
              fontSize: '48px', 
              marginBottom: '15px',
              color: '#dc3545'
            }}>
              <i className="bi bi-exclamation-triangle"></i>
            </div>
            <h4 style={{ marginBottom: '10px' }}>Document Preview Failed</h4>
            <p style={{ color: '#6c757d' }}>
              We couldn't load the document preview. Please try again or download the file instead.
            </p>
            {currentDocument && (
              <div style={{ marginTop: '15px' }}>
                <Button 
                  variant="success" 
                  icon={<i className="bi bi-download"></i>}
                  onClick={() => handleDownloadDocument(currentDocument)}
                >
                  Download File
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
      
      {/* Upload Document Modal */}
      <Modal
        show={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Document"
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button 
              variant="secondary" 
              onClick={() => setShowUploadModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUploadDocument}
              disabled={uploadLoading}
              icon={uploadLoading ? 
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid rgba(255,255,255,0.3)', 
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div> : 
                <i className="bi bi-cloud-upload"></i>
              }
            >
              {uploadLoading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ marginBottom: '20px' }}>
            <Alert variant="info">
              <i className="bi bi-info-circle me-2"></i>
              Maximum 4 documents allowed per vehicle
            </Alert>
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '500',
              color: '#495057',
              fontSize: '0.9rem'
            }}>
              Vehicle*
            </label>
            <select
              value={uploadVehicleId}
              onChange={(e) => setUploadVehicleId(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '10px', 
                borderRadius: '4px', 
                border: formErrors.vehicle ? '1px solid #dc3545' : '1px solid #ced4da',
                backgroundColor: formErrors.vehicle ? '#fff8f8' : '#fff'
              }}
              required
            >
              <option value="">Select a vehicle</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registration_number} ({vehicle.make} {vehicle.model})
                </option>
              ))}
            </select>
            {formErrors.vehicle && (
              <div style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '5px' }}>
                {formErrors.vehicle}
              </div>
            )}
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '500',
              color: '#495057',
              fontSize: '0.9rem'
            }}>
              Document Name*
            </label>
            <input
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '10px', 
                borderRadius: '4px', 
                border: formErrors.name ? '1px solid #dc3545' : '1px solid #ced4da',
                backgroundColor: formErrors.name ? '#fff8f8' : '#fff'
              }}
              placeholder="e.g., Insurance Policy 2025, Vehicle Registration"
            />
            {formErrors.name && (
              <div style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '5px' }}>
                {formErrors.name}
              </div>
            )}
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '500',
              color: '#495057',
              fontSize: '0.9rem'
            }}>
              Document Type*
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '10px', 
                borderRadius: '4px', 
                border: formErrors.type ? '1px solid #dc3545' : '1px solid #ced4da',
                backgroundColor: formErrors.type ? '#fff8f8' : '#fff'
              }}
              required
            >
              <option value="registration">Registration</option>
              <option value="insurance">Insurance</option>
              <option value="maintenance">Maintenance Record</option>
              <option value="inspection">Inspection Certificate</option>
              <option value="other">Other</option>
            </select>
            {formErrors.type && (
              <div style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '5px' }}>
                {formErrors.type}
              </div>
            )}
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '500',
              color: '#495057',
              fontSize: '0.9rem'
            }}>
              File*
            </label>
            <div style={{ 
              width: '100%', 
              border: formErrors.file ? '1px solid #dc3545' : '1px dashed #ced4da',
              borderRadius: '4px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: formErrors.file ? '#fff8f8' : '#f8f9fa',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              <div style={{ fontSize: '24px', color: '#6c757d', marginBottom: '10px' }}>
                <i className="bi bi-cloud-upload"></i>
              </div>
              <div style={{ marginBottom: '15px' }}>
                {documentFile ? (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <div>{documentFile.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                      {(documentFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div>Drag & drop a file here or click to browse</div>
                    <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '5px' }}>
                      Supported formats: PDF, JPG, PNG, DOC, DOCX (max 5MB)
                    </div>
                  </div>
                )}
              </div>
              <input
                type="file"
                onChange={(e) => setDocumentFile(e.target.files[0])}
                style={{ display: 'none' }}
                id="fileInput"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <Button 
                variant="outline-primary" 
                onClick={() => document.getElementById('fileInput').click()}
                size="small"
              >
                {documentFile ? 'Change File' : 'Select File'}
              </Button>
            </div>
            {formErrors.file && (
              <div style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '5px' }}>
                {formErrors.file}
              </div>
            )}
          </div>
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Document"
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button 
              variant="secondary" 
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteDocument}
              icon={<i className="bi bi-trash"></i>}
            >
              Delete Document
            </Button>
          </div>
        }
      >
        <div>
          <div style={{ 
            fontSize: '48px', 
            textAlign: 'center',
            color: '#dc3545',
            marginBottom: '15px'
          }}>
            <i className="bi bi-exclamation-triangle"></i>
          </div>
          
          <p style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '15px' }}>
            Are you sure you want to delete this document?
          </p>
          
          {currentDocument && (
            <div style={{ 
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '15px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Document:</strong> {currentDocument.name}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Type:</strong> {getDocumentTypeLabel(currentDocument.type)}
              </div>
              <div>
                <strong>Vehicle:</strong> {currentDocument.vehicles?.registration_number} ({currentDocument.vehicles?.make} {currentDocument.vehicles?.model})
              </div>
            </div>
          )}
          
          <Alert variant="warning">
            <strong>Warning:</strong> This action cannot be undone. The document will be permanently deleted.
          </Alert>
        </div>
      </Modal>
    </div>
  );
};

export default VehicleDocuments;