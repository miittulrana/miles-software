// admin-app/src/components/App.jsx
import React, { useState, useEffect } from 'react';

// Main App component with all functionality included
const App = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [vehicles, setVehicles] = useState([
    { id: 1, registration_number: 'ABC123', make: 'Toyota', model: 'Hilux', year: 2022, status: 'available', notes: 'Good condition' },
    { id: 2, registration_number: 'XYZ789', make: 'Ford', model: 'Transit', year: 2021, status: 'maintenance', notes: 'Engine issues' },
    { id: 3, registration_number: 'MLT505', make: 'Mercedes', model: 'Sprinter', year: 2023, status: 'assigned', notes: 'Assigned to John' }
  ]);
  
  // Vehicle management modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehicleData, setVehicleData] = useState({
    registration_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    status: 'available',
    notes: ''
  });
  const [currentVehicleId, setCurrentVehicleId] = useState(null);

  // Dashboard component
  const renderDashboard = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Miles Express Admin</h1>
      <p>Welcome to the dashboard</p>
      
      {/* Stats cards */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '30px',
        marginTop: '20px'
      }}>
        <div style={{ 
          backgroundColor: '#007bff',
          color: 'white',
          padding: '20px',
          borderRadius: '5px',
          textAlign: 'center',
          width: '200px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{vehicles.length}</div>
          <div>Total Vehicles</div>
        </div>
        
        <div style={{ 
          backgroundColor: '#28a745',
          color: 'white',
          padding: '20px',
          borderRadius: '5px',
          textAlign: 'center',
          width: '200px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
            {vehicles.filter(v => v.status === 'available' || v.status === 'assigned').length}
          </div>
          <div>Active Vehicles</div>
        </div>
        
        <div style={{ 
          backgroundColor: '#ffc107',
          color: 'black',
          padding: '20px',
          borderRadius: '5px',
          textAlign: 'center',
          width: '200px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
            {vehicles.filter(v => v.status === 'maintenance').length}
          </div>
          <div>In Maintenance</div>
        </div>
      </div>
      
      {/* Module selection cards */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        flexWrap: 'wrap',
        gap: '20px', 
        marginTop: '30px' 
      }}>
        <div style={{ 
          padding: '20px', 
          border: '1px solid #ddd',
          borderRadius: '5px',
          width: '200px',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        }} onClick={() => setCurrentView('vehicles')}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🚚</div>
          <h3>Vehicles</h3>
        </div>
        
        <div style={{ 
          padding: '20px', 
          border: '1px solid #ddd',
          borderRadius: '5px',
          width: '200px',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }} onClick={() => setCurrentView('drivers')}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>👤</div>
          <h3>Drivers</h3>
        </div>
        
        <div style={{ 
          padding: '20px', 
          border: '1px solid #ddd',
          borderRadius: '5px',
          width: '200px',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }} onClick={() => setCurrentView('tracking')}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🗺️</div>
          <h3>Tracking</h3>
        </div>
      </div>
    </div>
  );

  // Vehicle management functionality
  const handleAddVehicle = () => {
    // Validate form
    if (!vehicleData.registration_number || !vehicleData.make || !vehicleData.model) {
      alert('Please fill in all required fields.');
      return;
    }
    
    // Add new vehicle with unique ID
    const newId = Math.max(...vehicles.map(v => v.id)) + 1;
    setVehicles([...vehicles, {...vehicleData, id: newId}]);
    
    // Reset and close modal
    setShowAddModal(false);
    resetVehicleForm();
  };

  const handleUpdateVehicle = () => {
    // Validate form
    if (!vehicleData.registration_number || !vehicleData.make || !vehicleData.model) {
      alert('Please fill in all required fields.');
      return;
    }
    
    // Update vehicle
    setVehicles(vehicles.map(vehicle => 
      vehicle.id === currentVehicleId ? {...vehicleData, id: currentVehicleId} : vehicle
    ));
    
    // Reset and close modal
    setShowEditModal(false);
    resetVehicleForm();
  };

  const handleDeleteVehicle = () => {
    // Remove vehicle
    setVehicles(vehicles.filter(vehicle => vehicle.id !== currentVehicleId));
    
    // Close modal
    setShowDeleteModal(false);
  };

  const openEditModal = (vehicle) => {
    setCurrentVehicleId(vehicle.id);
    setVehicleData({
      registration_number: vehicle.registration_number,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      status: vehicle.status,
      notes: vehicle.notes || ''
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (vehicle) => {
    setCurrentVehicleId(vehicle.id);
    setShowDeleteModal(true);
  };

  const resetVehicleForm = () => {
    setVehicleData({
      registration_number: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      status: 'available',
      notes: ''
    });
    setCurrentVehicleId(null);
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

  // Vehicle management component
  const renderVehicles = () => (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Vehicle Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
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
          <span>+</span> Add Vehicle
        </button>
      </div>
      
      {vehicles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🚚</div>
          <h3>No vehicles found</h3>
          <p>Add your first vehicle to get started</p>
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
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Registration</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Make & Model</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Year</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Notes</th>
                <th style={{ padding: '12px 15px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(vehicle => (
                <tr key={vehicle.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px 15px' }}>{vehicle.registration_number}</td>
                  <td style={{ padding: '12px 15px' }}>{vehicle.make} {vehicle.model}</td>
                  <td style={{ padding: '12px 15px' }}>{vehicle.year}</td>
                  <td style={{ padding: '12px 15px' }}>
                    <span style={{ 
                      backgroundColor: 
                        vehicle.status === 'available' ? '#28a745' :
                        vehicle.status === 'assigned' ? '#007bff' :
                        vehicle.status === 'maintenance' ? '#ffc107' : '#6c757d',
                      color: vehicle.status === 'maintenance' ? 'black' : 'white',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.85rem'
                    }}>
                      {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    {vehicle.notes?.length > 30 ? vehicle.notes.substring(0, 30) + '...' : vehicle.notes}
                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                    <button 
                      onClick={() => openEditModal(vehicle)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #6c757d',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        marginRight: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      <span role="img" aria-label="Edit">✏️</span>
                    </button>
                    <button 
                      onClick={() => openDeleteModal(vehicle)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #dc3545',
                        color: '#dc3545',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer'
                      }}
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
      
      {/* Add Vehicle Modal */}
      <Modal 
        show={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        title="Add New Vehicle"
        footer={
          <>
            <button 
              onClick={() => setShowAddModal(false)}
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
              onClick={handleAddVehicle}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add Vehicle
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Registration Number*</label>
            <input
              type="text"
              value={vehicleData.registration_number}
              onChange={(e) => setVehicleData({...vehicleData, registration_number: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Make*</label>
            <input
              type="text"
              value={vehicleData.make}
              onChange={(e) => setVehicleData({...vehicleData, make: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Model*</label>
            <input
              type="text"
              value={vehicleData.model}
              onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Year</label>
            <input
              type="number"
              value={vehicleData.year}
              onChange={(e) => setVehicleData({...vehicleData, year: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Status</label>
            <select
              value={vehicleData.status}
              onChange={(e) => setVehicleData({...vehicleData, status: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Notes</label>
            <textarea
              rows={3}
              value={vehicleData.notes}
              onChange={(e) => setVehicleData({...vehicleData, notes: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
        </div>
      </Modal>
      
      {/* Edit Vehicle Modal */}
      <Modal 
        show={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        title="Edit Vehicle"
        footer={
          <>
            <button 
              onClick={() => setShowEditModal(false)}
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
              onClick={handleUpdateVehicle}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Update Vehicle
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Registration Number*</label>
            <input
              type="text"
              value={vehicleData.registration_number}
              onChange={(e) => setVehicleData({...vehicleData, registration_number: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Make*</label>
            <input
              type="text"
              value={vehicleData.make}
              onChange={(e) => setVehicleData({...vehicleData, make: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Model*</label>
            <input
              type="text"
              value={vehicleData.model}
              onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Year</label>
            <input
              type="number"
              value={vehicleData.year}
              onChange={(e) => setVehicleData({...vehicleData, year: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Status</label>
            <select
              value={vehicleData.status}
              onChange={(e) => setVehicleData({...vehicleData, status: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Notes</label>
            <textarea
              rows={3}
              value={vehicleData.notes}
              onChange={(e) => setVehicleData({...vehicleData, notes: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
        title="Confirm Delete"
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
              onClick={handleDeleteVehicle}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Delete Vehicle
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete this vehicle? This action cannot be undone.</p>
      </Modal>
    </div>
  );

  // Driver management placeholder
  const renderDrivers = () => (
    <div style={{ padding: '20px' }}>
      <h2>Driver Management</h2>
      <p>This is the driver management module.</p>
      <button 
        onClick={() => setCurrentView('dashboard')}
        style={{
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '10px'
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );

  // Vehicle tracking placeholder
  const renderTracking = () => (
    <div style={{ padding: '20px' }}>
      <h2>Vehicle Tracking</h2>
      <p>This is the vehicle tracking module.</p>
      <button 
        onClick={() => setCurrentView('dashboard')}
        style={{
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '10px'
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );

  // Render the current view
  const renderContent = () => {
    switch (currentView) {
      case 'vehicles':
        return renderVehicles();
      case 'drivers':
        return renderDrivers();
      case 'tracking':
        return renderTracking();
      default:
        return renderDashboard();
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        background: '#343a40', 
        color: 'white', 
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <div style={{ 
          fontWeight: 'bold', 
          fontSize: '1.2rem',
          cursor: 'pointer' 
        }} onClick={() => setCurrentView('dashboard')}>
          Miles Express
        </div>
      </div>
      
      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default App;