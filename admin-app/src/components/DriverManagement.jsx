// admin-app/src/components/DriverManagement.jsx
import React, { useState } from 'react';

// Import sub-modules
import AvailableDrivers from './drivers/AvailableDrivers';
import DriverDocuments from './drivers/DriverDocuments';

const DriverManagement = () => {
  const [currentSubModule, setCurrentSubModule] = useState('main');
  const [error, setError] = useState(null);
  
  // Define the sub-modules
  const subModules = [
    {
      id: 'available',
      name: 'Manage Drivers',
      icon: '👤',
      description: 'Add, edit, or remove drivers'
    },
    {
      id: 'documents',
      name: 'Driver Documents',
      icon: '📄',
      description: 'Manage driver licenses and ID cards'
    }
  ];

  // Render the appropriate sub-module based on state
  const renderSubModule = () => {
    switch(currentSubModule) {
      case 'available':
        return <AvailableDrivers onBack={() => setCurrentSubModule('main')} />;
      case 'documents':
        return <DriverDocuments onBack={() => setCurrentSubModule('main')} />;
      default:
        // Main module selection screen
        return (
          <div>
            <h2>Driver Management</h2>
            
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            
            <div className="row row-cols-1 row-cols-md-2 g-4 mt-3">
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

export default DriverManagement;