// admin-app/src/components/VehicleManagement.jsx
import React, { useState } from 'react';
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
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            
            <div className="row row-cols-1 row-cols-md-3 g-4 mt-3">
              {subModules.map(module => (
                <div key={module.id} className="col">
                  <div 
                    className="card h-100 shadow-sm" 
                    onClick={() => setCurrentSubModule(module.id)}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div className="card-body text-center">
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>{module.icon}</div>
                      <h3 className="card-title">{module.name}</h3>
                      <p className="card-text text-muted">{module.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="container py-4">
      {renderSubModule()}
    </div>
  );
};

export default VehicleManagement;