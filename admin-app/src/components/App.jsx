import React, { useState } from 'react';
import { Container, Nav, Navbar } from 'react-bootstrap';
// Import your components here
import Dashboard from './Dashboard';
import VehicleManagement from './VehicleManagement';
import DriverManagement from './DriverManagement';
import VehicleTracking from './VehicleTracking';

// This is a simplified component that should fix the navigation
const App = () => {
  // This state tracks which component to show
  const [currentView, setCurrentView] = useState('dashboard');

  // Render the appropriate component based on currentView
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'vehicles':
        return <VehicleManagement />;
      case 'drivers':
        return <DriverManagement />;
      case 'tracking':
        return <VehicleTracking />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="d-flex flex-column vh-100">
      <Navbar bg="dark" variant="dark">
        <Container>
          <Navbar.Brand href="#" onClick={() => setCurrentView('dashboard')}>Miles Express</Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link 
              href="#" 
              active={currentView === 'dashboard'} 
              onClick={() => setCurrentView('dashboard')}
            >
              Dashboard
            </Nav.Link>
            <Nav.Link 
              href="#" 
              active={currentView === 'vehicles'} 
              onClick={() => setCurrentView('vehicles')}
            >
              Vehicles
            </Nav.Link>
            <Nav.Link 
              href="#" 
              active={currentView === 'drivers'} 
              onClick={() => setCurrentView('drivers')}
            >
              Drivers
            </Nav.Link>
            <Nav.Link 
              href="#" 
              active={currentView === 'tracking'} 
              onClick={() => setCurrentView('tracking')}
            >
              Tracking
            </Nav.Link>
          </Nav>
        </Container>
      </Navbar>
      
      <div className="flex-grow-1 overflow-auto p-3">
        {/* This renders the current view */}
        {renderContent()}
      </div>
    </div>
  );
};

export default App;