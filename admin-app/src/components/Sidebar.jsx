import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const Sidebar = ({ currentPage, setCurrentPage }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Group menu items by category for better organization
  const menuGroups = [
    {
      title: "Main",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2' }
      ]
    },
    {
      title: "Fleet Management",
      items: [
        { id: 'vehicles', label: 'Vehicle Management', icon: 'bi-truck' },
        { id: 'drivers', label: 'Driver Management', icon: 'bi-person' },
        { id: 'assignments', label: 'Assignments', icon: 'bi-calendar-check' }
      ]
    },
    {
      title: "Documentation",
      items: [
        { id: 'documents', label: 'Documents', icon: 'bi-file-earmark' },
        { id: 'issues', label: 'Issue Reporting', icon: 'bi-exclamation-triangle' }
      ]
    },
    {
      title: "System",
      items: [
        { id: 'tracking', label: 'Vehicle Tracking', icon: 'bi-geo-alt' },
        { id: 'api', label: 'API Keys', icon: 'bi-key' }
      ]
    }
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  return (
    <div style={{ 
      width: '280px', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#1e2023',
      color: '#f0f0f1',
      borderRight: '1px solid #2d3439',
      overflow: 'hidden'
    }}>
      {/* Logo and header */}
      <div style={{ 
        padding: '20px', 
        display: 'flex', 
        alignItems: 'center', 
        borderBottom: '1px solid #2d3439'
      }}>
        <i className="bi bi-truck-flatbed" style={{ fontSize: '24px', marginRight: '12px', color: '#3498db' }}></i>
        <span style={{ fontSize: '20px', fontWeight: '600' }}>Miles Express</span>
      </div>
      
      {/* Menu items */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '10px' }}>
        {menuGroups.map((group, index) => (
          <div key={index} style={{ marginBottom: '15px' }}>
            <div style={{ 
              padding: '8px 20px', 
              fontSize: '12px', 
              textTransform: 'uppercase', 
              fontWeight: '600',
              color: '#a7aaad',
              letterSpacing: '0.5px'
            }}>
              {group.title}
            </div>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {group.items.map((item) => (
                <li key={item.id} style={{ padding: '2px 0' }}>
                  <a 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(item.id);
                    }}
                    style={{ 
                      padding: '10px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      textDecoration: 'none',
                      color: currentPage === item.id ? '#ffffff' : '#c2c2c2',
                      fontWeight: currentPage === item.id ? '500' : 'normal',
                      backgroundColor: currentPage === item.id ? 'rgba(52, 152, 219, 0.15)' : 'transparent',
                      borderLeft: currentPage === item.id ? '3px solid #3498db' : '3px solid transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <i className={`bi ${item.icon}`} style={{ marginRight: '12px', fontSize: '16px' }}></i>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.id === 'issues' && (
                      <span style={{ 
                        padding: '2px 8px',
                        fontSize: '11px',
                        borderRadius: '50px',
                        backgroundColor: '#e74c3c',
                        color: '#ffffff',
                        fontWeight: '600'
                      }}>
                        2
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      {/* System status indicator */}
      <div style={{ 
        padding: '10px 20px', 
        borderTop: '1px solid #2d3439',
        borderBottom: '1px solid #2d3439',
        display: 'flex',
        alignItems: 'center',
        fontSize: '13px'
      }}>
        <div style={{ 
          width: '8px', 
          height: '8px', 
          backgroundColor: '#2ecc71', 
          borderRadius: '50%',
          marginRight: '10px'
        }}></div>
        <span>System Status: </span>
        <span style={{ color: '#2ecc71', marginLeft: '4px', fontWeight: '500' }}>Operational</span>
      </div>
      
      {/* User profile section */}
      <div style={{ 
        padding: '15px 20px',
        position: 'relative'
      }}>
        <div 
          onClick={toggleUserMenu}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer'
          }}
        >
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            backgroundColor: '#3498db',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '600',
            marginRight: '12px'
          }}>
            A
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '500' }}>Administrator</div>
            <div style={{ fontSize: '12px', color: '#a7aaad' }}>admin@milesexpress.com</div>
          </div>
          <i className={`bi ${showUserMenu ? 'bi-chevron-up' : 'bi-chevron-down'}`} style={{ color: '#a7aaad', fontSize: '14px' }}></i>
        </div>
        
        {/* User menu dropdown */}
        {showUserMenu && (
          <div style={{ 
            position: 'absolute', 
            bottom: '70px', 
            left: '15px', 
            right: '15px',
            backgroundColor: '#2c3338',
            borderRadius: '8px',
            boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
            zIndex: 1000
          }}>
            <ul style={{ listStyle: 'none', padding: '10px 0', margin: 0 }}>
              <li>
                <a 
                  href="#" 
                  style={{ 
                    padding: '10px 15px', 
                    display: 'flex', 
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: '#f0f0f1',
                    transition: 'background-color 0.1s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3d464d'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <i className="bi bi-person me-2"></i>
                  <span>My Profile</span>
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  style={{ 
                    padding: '10px 15px', 
                    display: 'flex', 
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: '#f0f0f1',
                    transition: 'background-color 0.1s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3d464d'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <i className="bi bi-gear me-2"></i>
                  <span>Account Settings</span>
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  style={{ 
                    padding: '10px 15px', 
                    display: 'flex', 
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: '#f0f0f1',
                    transition: 'background-color 0.1s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3d464d'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <i className="bi bi-shield-lock me-2"></i>
                  <span>Security</span>
                </a>
              </li>
              <li style={{ borderTop: '1px solid #3d464d', marginTop: '5px', paddingTop: '5px' }}>
                <a 
                  href="#" 
                  onClick={handleSignOut}
                  style={{ 
                    padding: '10px 15px', 
                    display: 'flex', 
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: '#e74c3c',
                    transition: 'background-color 0.1s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3d464d'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <i className="bi bi-box-arrow-right me-2"></i>
                  <span>Logout</span>
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;