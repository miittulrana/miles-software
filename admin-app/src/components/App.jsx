// admin-app/src/components/App.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Import components
import VehicleManagement from './VehicleManagement';
import DriverManagement from './DriverManagement';
import VehicleTracking from './VehicleTracking';
import Dashboard from './Dashboard';
import IssueReporting from './IssueReporting';
import ApiKeys from './ApiKeys';
import DocumentManagement from './DocumentManagement';
import Login from './Login';

const App = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Show loading screen
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!session) {
    return <Login />;
  }

  // Menu items for the sidebar
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { id: 'vehicles', label: 'Vehicle Management', icon: 'bi-truck' },
    { id: 'drivers', label: 'Driver Management', icon: 'bi-person' },
    { id: 'tracking', label: 'Vehicle Tracking', icon: 'bi-geo-alt' },
    { id: 'issues', label: 'Issue Reporting', icon: 'bi-exclamation-triangle' },
    { id: 'documents', label: 'Documents', icon: 'bi-file-earmark' },
    { id: 'api', label: 'API Keys', icon: 'bi-key' },
  ];
  
  // Main content component based on current view
  let content;
  switch (currentView) {
    case 'vehicles':
      content = <VehicleManagement />;
      break;
    case 'drivers':
      content = <DriverManagement />;
      break;
    case 'tracking':
      content = <VehicleTracking />;
      break;
    case 'issues':
      content = <IssueReporting />;
      break;
    case 'api':
      content = <ApiKeys />;
      break;
    case 'documents':
      content = <DocumentManagement />;
      break;
    default:
      content = <Dashboard />;
  }

  return (
    <div className="d-flex h-100">
      {/* Sidebar */}
      <div className="d-flex flex-column flex-shrink-0 p-3 text-white bg-dark" style={{ width: '280px' }}>
        <a href="#" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none" 
           onClick={(e) => { e.preventDefault(); setCurrentView('dashboard'); }}>
          <i className="bi bi-truck-flatbed me-2 fs-4"></i>
          <span className="fs-4">Miles Express</span>
        </a>
        <hr />
        <ul className="nav nav-pills flex-column mb-auto">
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item">
              <a
                href="#"
                className={`nav-link ${currentView === item.id ? 'active' : 'text-white'}`}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentView(item.id);
                }}
              >
                <i className={`bi ${item.icon} me-2`}></i>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <hr />
        <div className="dropdown">
          <a href="#" className="d-flex align-items-center text-white text-decoration-none dropdown-toggle" 
             id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
            <i className="bi bi-person-circle me-2"></i>
            <strong>{session?.user?.email || 'User'}</strong>
          </a>
          <ul className="dropdown-menu dropdown-menu-dark text-small shadow" aria-labelledby="dropdownUser1">
            <li><a className="dropdown-item" href="#" onClick={handleSignOut}>Sign out</a></li>
          </ul>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-grow-1 overflow-auto bg-light">
        {content}
      </div>
    </div>
  );
};

export default App;