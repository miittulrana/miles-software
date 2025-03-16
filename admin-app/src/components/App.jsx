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
  const [authError, setAuthError] = useState(null);
  const [networkStatus, setNetworkStatus] = useState({ online: true, lastChecked: Date.now() });

  // Check authentication on mount
  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      
      try {
        // First check connection
        await checkNetworkConnection();
        
        // Get current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (sessionData.session) {
          // Verify this user is an admin 
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('email', sessionData.session.user.email) // Using email to match users
            .maybeSingle(); // Use maybeSingle to avoid errors
          
          // If error querying, log it but allow the user in for now
          if (userError) {
            console.error('User data fetch error:', userError);
          }
          
          // If no user found or not admin role, sign out
          if (!userData || userData.role !== 'admin') {
            // Not an admin, sign out
            console.error('Not authorized as admin');
            await supabase.auth.signOut();
            setSession(null);
          } else {
            // Valid admin session
            console.log('Valid admin session');
            setSession(sessionData.session);
            setAuthError(null);
          }
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error('Session error:', err);
        
        // Check if this is a connection error
        if (err.message && (
            err.message.includes('Failed to fetch') || 
            err.message.includes('Network') ||
            err.message.includes('connection'))) {
          setNetworkStatus({ ...networkStatus, online: false });
        }
        
        setSession(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (session) {
          // Only update session - we'll verify on page load and navigation
          setSession(session);
        } else {
          setSession(null);
        }
      }
    );
    
    // Also check for online/offline status
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
    }
  }, []);
  
  // Check network connection
  const checkNetworkConnection = async () => {
    try {
      // Simple check - try to fetch from Supabase
      const { error } = await supabase.from('vehicles').select('count', { count: 'exact', head: true });
      const isOnline = !error;
      
      setNetworkStatus({ online: isOnline, lastChecked: Date.now() });
      return isOnline;
    } catch (error) {
      console.error('Network check failed:', error);
      setNetworkStatus({ online: false, lastChecked: Date.now() });
      return false;
    }
  };
  
  const handleOnlineStatus = () => {
    console.log('Browser reports online status');
    checkNetworkConnection();
  };
  
  const handleOfflineStatus = () => {
    console.log('Browser reports offline status');
    setNetworkStatus({ online: false, lastChecked: Date.now() });
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
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
    return <Login networkStatus={networkStatus} onNetworkCheck={checkNetworkConnection} />;
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
      content = <VehicleManagement networkStatus={networkStatus} />;
      break;
    case 'drivers':
      content = <DriverManagement networkStatus={networkStatus} />;
      break;
    case 'tracking':
      content = <VehicleTracking networkStatus={networkStatus} />;
      break;
    case 'issues':
      content = <IssueReporting networkStatus={networkStatus} />;
      break;
    case 'api':
      content = <ApiKeys networkStatus={networkStatus} />;
      break;
    case 'documents':
      content = <DocumentManagement networkStatus={networkStatus} />;
      break;
    default:
      content = <Dashboard networkStatus={networkStatus} />;
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
        
        {!networkStatus.online && (
          <div className="alert alert-warning py-2 mb-3">
            <i className="bi bi-wifi-off me-2"></i>
            <small>Offline Mode</small>
            <button 
              className="btn btn-sm btn-outline-dark float-end py-0 px-1" 
              onClick={checkNetworkConnection}
              title="Check connection"
            >
              <i className="bi bi-arrow-repeat"></i>
            </button>
          </div>
        )}
        
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