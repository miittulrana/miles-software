// admin-app/src/components/App.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Import all components
import VehicleTracking from './VehicleTracking';
import VehicleManagement from './VehicleManagement';
import DriverManagement from './DriverManagement';
import VehicleAssignments from './VehicleAssignments';
import IssueReporting from './IssueReporting';
import ApiKeys from './ApiKeys';
import Login from './Login';

const App = () => {
  const [currentModule, setCurrentModule] = useState('tracking');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [networkStatus, setNetworkStatus] = useState({ online: true, lastChecked: Date.now() });
  const [notifications, setNotifications] = useState([]);

  // Check authentication on mount
  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      
      try {
        // Get current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setSession(null);
          setLoading(false);
          return;
        }
        
        if (sessionData && sessionData.session) {
          console.log('Valid session detected');
          setSession(sessionData.session);
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error('Session error:', err);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
    
    // For development, uncomment to bypass login
    // setSession({ user: { email: 'dev@example.com' } });
    // setLoading(false);
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (session) {
          setSession(session);
        } else {
          setSession(null);
        }
      }
    );
    
    // Check network status periodically
    const networkInterval = setInterval(() => {
      const online = navigator.onLine;
      setNetworkStatus(prev => {
        if (prev.online !== online) {
          addNotification(online ? 'Network connection restored' : 'Network connection lost', 
                          online ? 'success' : 'error');
        }
        return { online, lastChecked: Date.now() };
      });
    }, 10000);
    
    return () => {
      subscription.unsubscribe();
      clearInterval(networkInterval);
    };
  }, []);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      addNotification('You have been signed out successfully', 'info');
    } catch (error) {
      console.error('Sign out error:', error);
      addNotification('Sign out failed: ' + error.message, 'error');
    }
  };

  // Add a notification
  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      time: new Date()
    };
    setNotifications(prev => [notification, ...prev].slice(0, 10));
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

  // Uncomment to enable login
  if (!session) {
    return <Login networkStatus={networkStatus} onSuccess={(msg) => addNotification(msg, 'success')} />;
  }

  // Render the main application
  return (
    <div className="d-flex h-100">
      {/* Sidebar */}
      <div className="d-flex flex-column flex-shrink-0 p-3 text-white bg-dark" style={{ width: '280px' }}>
        <a href="#" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
          <i className="bi bi-truck-flatbed me-2 fs-4"></i>
          <span className="fs-4">Miles Express</span>
        </a>
        <hr />
        
        <ul className="nav nav-pills flex-column mb-auto">
          <li className="nav-item">
            <a 
              href="#" 
              className={`nav-link ${currentModule === 'tracking' ? 'active' : 'text-white'}`} 
              onClick={(e) => {
                e.preventDefault();
                setCurrentModule('tracking');
              }}
            >
              <i className="bi bi-geo-alt me-2"></i>
              Vehicle Tracking
            </a>
          </li>
          <li className="nav-item">
            <a 
              href="#" 
              className={`nav-link ${currentModule === 'vehicles' ? 'active' : 'text-white'}`} 
              onClick={(e) => {
                e.preventDefault();
                setCurrentModule('vehicles');
              }}
            >
              <i className="bi bi-truck me-2"></i>
              Vehicle Management
            </a>
          </li>
          <li className="nav-item">
            <a 
              href="#" 
              className={`nav-link ${currentModule === 'drivers' ? 'active' : 'text-white'}`} 
              onClick={(e) => {
                e.preventDefault();
                setCurrentModule('drivers');
              }}
            >
              <i className="bi bi-person me-2"></i>
              Driver Management
            </a>
          </li>
          <li className="nav-item">
            <a 
              href="#" 
              className={`nav-link ${currentModule === 'assignments' ? 'active' : 'text-white'}`} 
              onClick={(e) => {
                e.preventDefault();
                setCurrentModule('assignments');
              }}
            >
              <i className="bi bi-calendar-check me-2"></i>
              Vehicle Assignments
            </a>
          </li>
          <li className="nav-item">
            <a 
              href="#" 
              className={`nav-link ${currentModule === 'issues' ? 'active' : 'text-white'}`} 
              onClick={(e) => {
                e.preventDefault();
                setCurrentModule('issues');
              }}
            >
              <i className="bi bi-exclamation-triangle me-2"></i>
              Issue Reporting
            </a>
          </li>
          <li className="nav-item">
            <a 
              href="#" 
              className={`nav-link ${currentModule === 'apikeys' ? 'active' : 'text-white'}`} 
              onClick={(e) => {
                e.preventDefault();
                setCurrentModule('apikeys');
              }}
            >
              <i className="bi bi-key me-2"></i>
              API Keys
            </a>
          </li>
        </ul>
        
        <hr />
        {/* Network Status Indicator */}
        <div className="d-flex align-items-center mb-2">
          <div 
            style={{ 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              backgroundColor: networkStatus.online ? '#2ecc71' : '#e74c3c',
              marginRight: '8px'
            }}
          ></div>
          <span className="text-muted small">
            {networkStatus.online ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* User dropdown */}
        {session && (
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
        )}
      </div>
      
      {/* Main content */}
      <div className="flex-grow-1 overflow-auto bg-light">
        {currentModule === 'tracking' && <VehicleTracking networkStatus={networkStatus} onNotification={addNotification} />}
        {currentModule === 'vehicles' && <VehicleManagement />}
        {currentModule === 'drivers' && <DriverManagement />}
        {currentModule === 'assignments' && <VehicleAssignments />}
        {currentModule === 'issues' && <IssueReporting />}
        {currentModule === 'apikeys' && <ApiKeys />}
      </div>
      
      {/* Notification Area (optional) */}
      {notifications.length > 0 && (
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1050 }}>
          {notifications.map(notification => (
            <div key={notification.id} className={`toast show mb-2 bg-${notification.type === 'error' ? 'danger' : notification.type}`} role="alert" aria-live="assertive" aria-atomic="true">
              <div className="toast-header">
                <strong className="me-auto">{notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}</strong>
                <small>{notification.time.toLocaleTimeString()}</small>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}></button>
              </div>
              <div className="toast-body text-white">
                {notification.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;