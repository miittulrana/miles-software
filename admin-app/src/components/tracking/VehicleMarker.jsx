// admin-app/src/components/tracking/VehicleMarker.jsx
import React, { useRef, useEffect } from 'react';
import './VehicleMarker.css';

/**
 * Vehicle marker component for the map
 * This is a custom marker renderer that uses CSS for styling
 */
const VehicleMarker = ({ 
  vehicle, 
  isSelected, 
  isMoving, 
  heading = 0, 
  color = '#3498db',
  onClick,
  speed = 0
}) => {
  const markerRef = useRef(null);
  const rotationRef = useRef(null);
  
  // Handle rotation updates
  useEffect(() => {
    if (rotationRef.current) {
      rotationRef.current.style.transform = `rotate(${heading}deg)`;
    }
  }, [heading]);
  
  return (
    <div 
      ref={markerRef}
      className={`vehicle-marker-container ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {/* Vehicle icon with background color */}
      <div 
        className="vehicle-icon" 
        style={{ backgroundColor: color }}
      >
        <i className="bi bi-truck"></i>
      </div>
      
      {/* Direction arrow that rotates based on heading */}
      <div 
        ref={rotationRef}
        className="vehicle-direction"
      >
        ↑
      </div>
      
      {/* Status indicator (moving/stopped) */}
      <div className={`vehicle-status ${isMoving ? 'moving' : 'stopped'}`} />
      
      {/* Vehicle information */}
      <div className="vehicle-info">
        <div className="vehicle-label">
          {vehicle.registration_number}
        </div>
        
        {/* Only show speed if it's available and vehicle is moving */}
        {isMoving && speed > 0 && (
          <div className="vehicle-speed">
            {Math.round(speed)} km/h
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleMarker;