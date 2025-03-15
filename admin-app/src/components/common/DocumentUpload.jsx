// admin-app/src/components/vehicles/common/DocumentUpload.jsx
import React, { useState } from 'react';
import { supabase } from '../../../supabaseClient';

/**
 * Reusable component for uploading documents
 * 
 * @param {Object} props
 * @param {string} props.vehicleId - ID of the vehicle to upload document for
 * @param {Function} props.onSuccess - Callback after successful upload
 * @param {Function} props.onError - Callback for error handling
 * @param {Function} props.onCancel - Callback for cancel action
 * @param {number} props.maxDocuments - Maximum documents allowed (default: 4)
 */
const DocumentUpload = ({ vehicleId, onSuccess, onError, onCancel, maxDocuments = 4 }) => {
  const [documentFile, setDocumentFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('registration');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!documentFile || !documentName || !documentType) {
      setError('Please fill in all required fields.');
      return;
    }
    
    try {
      setUploadLoading(true);
      setError(null);
      
      // Check if we already have the maximum documents for this vehicle
      const { count, error: countError } = await supabase
        .from('vehicle_documents')
        .select('*', { count: 'exact', head: true })
        .eq('vehicle_id', vehicleId);
        
      if (countError) throw countError;
      
      if (count >= maxDocuments) {
        throw new Error(`Maximum ${maxDocuments} documents allowed per vehicle. Please delete an existing document first.`);
      }
      
      // Upload file to storage
      const fileExt = documentFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `vehicle-documents/${vehicleId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('miles-express')
        .upload(filePath, documentFile);
        
      if (uploadError) throw uploadError;
      
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
        
      if (insertError) throw insertError;
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form
      setDocumentFile(null);
      setDocumentName('');
      setDocumentType('registration');
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err.message || 'Failed to upload document. Please try again.');
      
      if (onError) {
        onError(err);
      }
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      
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
          Note: Maximum {maxDocuments} documents allowed per vehicle
        </p>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
        <button 
          onClick={onCancel}
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
          onClick={handleUpload}
          disabled={uploadLoading || !documentFile || !documentName || !documentType}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: uploadLoading || !documentFile || !documentName || !documentType ? 0.6 : 1
          }}
        >
          {uploadLoading ? 'Uploading...' : 'Upload Document'}
        </button>
      </div>
    </div>
  );
};

export default DocumentUpload;