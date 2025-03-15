// admin-app/src/components/vehicles/VehicleLogs.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const VehicleLogs = ({ onBack }) => {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterType, setFilterType] = useState('temporary');

  useEffect(() => {
    fetchVehicles();
    fetchLogs();
  }, [selectedVehicle, filterDateFrom, filterDateTo, filterType]);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, registration_number, make, model')
        .order('registration_number', { ascending: true });
      
      if (error) throw error;
      
      setVehicles(data || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load vehicles. Please try again.');
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Base query
      let query = supabase
        .from('vehicle_assignments')
        .select(`
          id,
          vehicle_id,
          driver_id,
          start_time,
          end_time,
          is_temporary,
          status,
          created_by,
          created_at,
          vehicles(id, registration_number, make, model),
          users!vehicle_assignments_driver_id_fkey(id, full_name, email),
          admin:users!vehicle_assignments_created_by_fkey(id, email)
        `)
        .order('start_time', { ascending: false });
      
      // Apply vehicle filter
      if (selectedVehicle !== 'all') {
        query = query.eq('vehicle_id', selectedVehicle);
      }
      
      // Apply date filters
      if (filterDateFrom) {
        query = query.gte('start_time', filterDateFrom);
      }
      
      if (filterDateTo) {
        query = query.lte('start_time', filterDateTo);
      }
      
      // Apply assignment type filter
      if (filterType !== 'all') {
        if (filterType === 'temporary') {
          query = query.eq('is_temporary', true);
        } else if (filterType === 'permanent') {
          query = query.eq('is_temporary', false);
        }
      }
      
      // Execute query
      const { data, error } = await query;
      
      if (error) throw error;
      
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to load vehicle logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (e) => {
    setSelectedVehicle(e.target.value);
  };

  const handleFilterDateFrom = (e) => {
    setFilterDateFrom(e.target.value);
  };

  const handleFilterDateTo = (e) => {
    setFilterDateTo(e.target.value);
  };

  const handleFilterType = (e) => {
    setFilterType(e.target.value);
  };

  const resetFilters = () => {
    setSelectedVehicle('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterType('temporary');
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

  // Helper function to calculate duration in days
  const calculateDuration = (startDate, endDate) => {
    if (!endDate) return 'Ongoing';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
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
      </div>
      
      <h2>Vehicle Usage Logs</h2>
      
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
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Date From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={handleFilterDateFrom}
              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Date To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={handleFilterDateTo}
              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
              min={filterDateFrom}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Assignment Type</label>
            <select
              value={filterType}
              onChange={handleFilterType}
              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              <option value="all">All Types</option>
              <option value="temporary">Temporary Only</option>
              <option value="permanent">Permanent Only</option>
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
      
      {/* Logs Table */}
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
          <div>Loading logs...</div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📝</div>
          <h3>No logs found</h3>
          <p>Try adjusting your filters or check back later</p>
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
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Vehicle</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Driver</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Start Date</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>End Date</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Duration</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Assigned By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px 15px' }}>
                    {log.vehicles?.registration_number} ({log.vehicles?.make} {log.vehicles?.model})
                  </td>
                  <td style={{ padding: '12px 15px' }}>{log.users?.full_name}</td>
                  <td style={{ padding: '12px 15px' }}>{formatDate(log.start_time)}</td>
                  <td style={{ padding: '12px 15px' }}>{log.end_time ? formatDate(log.end_time) : 'Ongoing'}</td>
                  <td style={{ padding: '12px 15px' }}>{calculateDuration(log.start_time, log.end_time)}</td>
                  <td style={{ padding: '12px 15px' }}>
                    <span style={{ 
                      backgroundColor: log.is_temporary ? '#17a2b8' : '#007bff',
                      color: 'white',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.85rem'
                    }}>
                      {log.is_temporary ? 'Temporary' : 'Permanent'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    <span style={{ 
                      backgroundColor: 
                        log.status === 'approved' ? '#28a745' :
                        log.status === 'pending' ? '#ffc107' :
                        log.status === 'rejected' ? '#dc3545' : 
                        log.status === 'cancelled' ? '#6c757d' : '#6c757d',
                      color: log.status === 'pending' ? 'black' : 'white',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.85rem'
                    }}>
                      {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 15px' }}>{log.admin?.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Export Functionality Placeholder */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          disabled={logs.length === 0}
          title="Export logs to CSV"
        >
          <span role="img" aria-label="Export">📊</span> Export Logs
        </button>
      </div>
    </div>
  );
};

export default VehicleLogs;