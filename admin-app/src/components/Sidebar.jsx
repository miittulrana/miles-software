import React from 'react';
import { supabase } from '../supabaseClient';

const Sidebar = ({ currentPage, setCurrentPage }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { id: 'vehicles', label: 'Vehicle Management', icon: 'bi-truck' },
    { id: 'drivers', label: 'Driver Management', icon: 'bi-person' },
    { id: 'assignments', label: 'Assignments', icon: 'bi-calendar-check' },
    { id: 'documents', label: 'Documents', icon: 'bi-file-earmark' },
    { id: 'issues', label: 'Issue Reporting', icon: 'bi-exclamation-triangle' },
    { id: 'tracking', label: 'Vehicle Tracking', icon: 'bi-geo-alt' },
    { id: 'api', label: 'API Keys', icon: 'bi-key' },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="d-flex flex-column flex-shrink-0 p-3 text-white bg-dark" style={{ width: '280px', height: '100vh' }}>
      <a href="#" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
        <i className="bi bi-truck-flatbed me-2"></i>
        <span className="fs-4">Miles Express</span>
      </a>
      <hr />
      <ul className="nav nav-pills flex-column mb-auto">
        {menuItems.map((item) => (
          <li key={item.id} className="nav-item">
            
              href="#"
              className={`nav-link ${currentPage === item.id ? 'active' : 'text-white'}`}
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage(item.id);
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
        <a href="#" className="d-flex align-items-center text-white text-decoration-none dropdown-toggle" id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
          <i className="bi bi-person-circle me-2"></i>
          <strong>Administrator</strong>
        </a>
        <ul className="dropdown-menu dropdown-menu-dark text-small shadow" aria-labelledby="dropdownUser1">
          <li><a className="dropdown-item" href="#">Settings</a></li>
          <li><a className="dropdown-item" href="#">Profile</a></li>
          <li><hr className="dropdown-divider" /></li>
          <li><a className="dropdown-item" href="#" onClick={handleSignOut}>Sign out</a></li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;