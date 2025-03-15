// admin-app/src/components/VehicleManagement.jsx
import React, { useState, useEffect } from 'react';
import AvailableVehicles from './vehicles/AvailableVehicles';
import VehicleCalendar from './vehicles/VehicleCalendar';
import BlockedVehicles from './vehicles/BlockedVehicles';
import AssignVehicle from './vehicles/AssignVehicle';
import VehicleLogs from './vehicles/VehicleLogs';
import VehicleDocuments from './vehicles/VehicleDocuments';

const VehicleManagement = () => {
  const [currentSubModule, setCurrentSubModule] = useState('main');
  const [error, setError] = useState(null);
  
  // Define the sub-modules
  const subModules = [
    {
      id: 'available',
      name: 'Available Vehicles',
      icon: '🚗',
      description: 'View and manage all vehicles'
    },
    {
      id: 'calendar',
      name: 'Calendar',
      icon: '📅',
      description: 'Monthly view of vehicle availability'
    },
    {
      id: 'blocked',
      name: 'Blocked Vehicles',
      icon: '🚫',
      description: 'Manage temporarily blocked vehicles'
    },
    {
      id: 'assign',
      name: 'Assign Vehicle',
      icon: '👤',
      description: 'Temporarily assign vehicles to drivers'
    },
    {
      id: 'logs',
      name: 'Logs',
      icon: '📝',
      description: 'View vehicle usage history'
    },
    {
      id: 'documents',
      name: 'Documents',
      icon: '📄',
      description: 'Manage vehicle documents'
    }
  ];

  // Render the appropriate sub-module based on state
  const renderSubModule = () => {
    switch(currentSubModule) {
      case 'available':
        return <AvailableVehicles onBack={() => setCurrentSubModule('main')} />;
      case 'calendar':
        return <VehicleCalendar onBack={() => setCurrentSubModule('main')} />;
      case 'blocked':
        return <BlockedVehicles onBack={() => setCurrentSubModule('main')} />;
      case 'assign':
        return <AssignVehicle onBack={() => setCurrentSubModule('main')} />;
      case 'logs':
        return <VehicleLogs onBack={() => setCurrentSubModule('main')} />;
      case 'documents':
        return <VehicleDocuments onBack={() => setCurrentSubModule('main')} />;
      default:
        // Main module selection screen
        return (
          <div>
            <h2>Vehicle Management</h2>
            
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
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '20px',
              marginTop: '20px'
            }}>
              {subModules.map(module => (
                <div 
                  key={module.id}
                  style={{
                    padding: '20px',
                    backgroundColor: 'white',
                    borderRadius: '5px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    ':hover': {
                      transform: 'translateY(-5px)'
                    }
                  }}
                  onClick={() => setCurrentSubModule(module.id)}
                >
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>{module.icon}</div>
                  <h3>{module.name}</h3>
                  <p style={{ color: '#6c757d' }}>{module.description}</p>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      {renderSubModule()}
    </div>
  );
};

export default VehicleManagement;