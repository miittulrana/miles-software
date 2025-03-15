// admin-app/src/components/vehicles/common/VehicleForm.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';

/**
 * Reusable vehicle form component for adding/editing vehicles
 * 
 * @param {Object} props
 * @param {Object} props.initialData - Initial vehicle data for editing (empty for new vehicles)
 * @param {boolean} props.isEditing - Whether we're editing an existing vehicle or adding a new one
 * @param {Function} props.onSubmit - Function to call with form data on submission
 * @param {Function} props.onCancel - Function to call when canceling
 */
const VehicleForm = ({ initialData = {}, isEditing = false, onSubmit, onCancel }) => {
  const [vehicleData, setVehicleData] = useState({
    registration_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    status: 'available',
    notes: '',
    assigned_driver_id: null,
    ...initialData
  });
  
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch drivers for assignment
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('role', 'driver')
          .order('full_name', { ascending: true });
        
        if (error) throw error;
        
        setDrivers(data || []);
      } catch (err) {
        console.error('Error fetching drivers:', err);
        setError('Failed to load drivers. Please try again.');
      }
    };
    
    fetchDrivers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVehicleData({ ...vehicleData, [name]: value });
    
    // If status is not 'assigned', clear assigned_driver_id
    if (name === 'status' && value !== 'assigned') {
      setVehicleData(prev => ({ ...prev, [name]: value, assigned_driver_id: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!vehicleData.registration_number || !vehicleData.make || !vehicleData.model) {
      setError('Please fill in all required fields.');
      return;
    }
    
    // Validate assigned driver if status is 'assigned'
    if (vehicleData.status === 'assigned' && !vehicleData.assigned_driver_id) {
      setError('Please select a driver when status is assigned.');
      return;
    }
    
    // Call the onSubmit callback with the form data
    onSubmit(vehicleData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Registration Number*</label>
        <input
          type="text"
          name="registration_number"
          value={vehicleData.registration_number}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
          required
        />
      </div>
      
      <div>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Make*</label>
        <input
          type="text"
          name="make"
          value={vehicleData.make}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
          required
        />
      </div>
      
      <div>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Model*</label>
        <input
          type="text"
          name="model"
          value={vehicleData.model}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
          required
        />
      </div>
      
      <div>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Year</label>
        <input
          type="number"
          name="year"
          value={vehicleData.year}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
          min="1900"
          max={new Date().getFullYear() + 1}
        />
      </div>
      
      <div>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Status</label>
        <select
          name="status"
          value={vehicleData.status}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
        >
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="spare">Spare</option>
          <option value="maintenance">Maintenance</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      
      {vehicleData.status === 'assigned' && (
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Assign to Driver*</label>
          <select
            name="assigned_driver_id"
            value={vehicleData.assigned_driver_id || ''}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            required={vehicleData.status === 'assigned'}
          >
            <option value="">Select a driver</option>
            {drivers.map(driver => (
              <option key={driver.id} value={driver.id}>{driver.full_name}</option>
            ))}
          </select>
        </div>
      )}
      
      <div>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Notes</label>
        <textarea
          name="notes"
          rows={3}
          value={vehicleData.notes}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
        />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
        <button 
          type="button"
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
          type="submit"
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isEditing ? 'Update Vehicle' : 'Add Vehicle'}
        </button>
      </div>
    </form>
  );
};

export default VehicleForm;