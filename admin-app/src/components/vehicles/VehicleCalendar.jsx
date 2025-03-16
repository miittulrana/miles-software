// admin-app/src/components/vehicles/VehicleCalendar.jsx
import React, { useState, useEffect } from 'react';
import { supabase, executeQuery } from '../../supabaseClient';

const VehicleCalendar = ({ onBack }) => {
  const [vehicles, setVehicles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [users, setUsers] = useState({}); // To store user data for assignments
  const [viewMode, setViewMode] = useState('month'); // month or week
  const [showTooltip, setShowTooltip] = useState(null); // For hover tooltips

  useEffect(() => {
    fetchData();
    
    // Simple subscription with retry
    const setupSubscriptions = () => {
      try {
        // Subscribe to realtime changes for assignments
        const assignmentsChannel = supabase
          .channel('public:vehicle_assignments')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'vehicle_assignments' 
          }, () => {
            console.log('Assignments changed, refreshing data');
            fetchData();
          })
          .subscribe((status) => {
            console.log('Assignments subscription status:', status);
          });
          
        // Subscribe to realtime changes for blocked periods
        const blockedChannel = supabase
          .channel('public:vehicle_blocked_periods')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'vehicle_blocked_periods' 
          }, () => {
            console.log('Blocked periods changed, refreshing data');
            fetchData();
          })
          .subscribe((status) => {
            console.log('Blocked periods subscription status:', status);
          });
          
        return { assignmentsChannel, blockedChannel };
      } catch (err) {
        console.error('Failed to set up subscriptions:', err);
        return null;
      }
    };
    
    const subscriptions = setupSubscriptions();
    
    return () => {
      if (subscriptions) {
        if (subscriptions.assignmentsChannel) {
          subscriptions.assignmentsChannel.unsubscribe();
        }
        if (subscriptions.blockedChannel) {
          subscriptions.blockedChannel.unsubscribe();
        }
      }
    };
  }, [currentDate, selectedVehicle, viewMode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 1. Get vehicles
      const vehiclesResult = await executeQuery(() => 
        supabase
          .from('vehicles')
          .select('id, registration_number, make, model, status')
          .order('registration_number', { ascending: true })
      );
      
      if (vehiclesResult.error) {
        throw new Error(vehiclesResult.error.message || 'Failed to load vehicles');
      }
      
      setVehicles(vehiclesResult.data || []);
      
      // 2. Get users for reference (drivers and admins)
      const usersResult = await executeQuery(() => 
        supabase
          .from('users')
          .select('id, full_name, email, role')
      );
      
      if (usersResult.error) {
        throw new Error(usersResult.error.message || 'Failed to load users');
      }
      
      // Create a lookup object for users
      const userLookup = {};
      usersResult.data.forEach(user => {
        userLookup[user.id] = user;
      });
      
      setUsers(userLookup);
      
      // 3. Get assignments with expanded information
      // Format dates for filtering based on view mode
      let startDate, endDate;
      
      if (viewMode === 'month') {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      } else if (viewMode === 'week') {
        // Calculate the first day of the week (Sunday)
        const day = currentDate.getDay();
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
        
        // Calculate the last day of the week (Saturday)
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      }
      
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();
      
      // Base assignments query - get all assignments that overlap with the date range
      let assignmentsQuery = supabase
        .from('vehicle_assignments')
        .select(`
          id, 
          vehicle_id, 
          driver_id, 
          start_time, 
          end_time, 
          is_temporary, 
          status, 
          notes,
          created_by,
          created_at
        `)
        .or(`start_time.lte.${endDateStr},end_time.gte.${startDateStr}`);
      
      // Add vehicle filter if needed
      if (selectedVehicle !== 'all') {
        assignmentsQuery = assignmentsQuery.eq('vehicle_id', selectedVehicle);
      }
      
      const assignmentsResult = await executeQuery(() => assignmentsQuery);
      
      if (assignmentsResult.error) {
        throw new Error(assignmentsResult.error.message || 'Failed to load assignments');
      }
      
      // Enhance assignments with user information
      const enhancedAssignments = assignmentsResult.data.map(assignment => {
        // Find the driver and creator
        const driver = userLookup[assignment.driver_id] || null;
        const creator = userLookup[assignment.created_by] || null;
        
        return {
          ...assignment,
          driver,
          creator
        };
      });
      
      setAssignments(enhancedAssignments || []);
      
      // 4. Get blocked periods
      let blockedQuery = supabase
        .from('vehicle_blocked_periods')
        .select(`
          id, 
          vehicle_id, 
          start_date, 
          end_date, 
          reason,
          created_by
        `)
        .or(`start_date.lte.${endDateStr},end_date.gte.${startDateStr}`);
      
      if (selectedVehicle !== 'all') {
        blockedQuery = blockedQuery.eq('vehicle_id', selectedVehicle);
      }
      
      const blockedResult = await executeQuery(() => blockedQuery);
      
      if (blockedResult.error) {
        throw new Error(blockedResult.error.message || 'Failed to load blocked periods');
      }
      
      // Enhance blocked periods with creator information
      const enhancedBlockedPeriods = blockedResult.data.map(block => {
        const creator = userLookup[block.created_by] || null;
        
        return {
          ...block,
          creator
        };
      });
      
      setBlockedPeriods(enhancedBlockedPeriods || []);
      
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      setError('Failed to load calendar data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const handleNextMonth = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const handleVehicleSelect = (e) => {
    setSelectedVehicle(e.target.value);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  const handleJumpToToday = () => {
    setCurrentDate(new Date());
  };

  const showEventDetails = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  // Helper function to get days in the month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Helper function to get first day of the month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Generate calendar days based on view mode
  const generateCalendarDays = () => {
    if (viewMode === 'month') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = getDaysInMonth(year, month);
      const firstDayOfMonth = getFirstDayOfMonth(year, month);
      
      const days = [];
      
      // Add empty cells for days before the 1st of the month
      for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
      }
      
      // Add days of the month
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
      }
      
      return days;
    } else if (viewMode === 'week') {
      const days = [];
      const day = currentDate.getDay();
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - day);
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        days.push(date);
      }
      
      return days;
    }
    
    return [];
  };

  // Check if a vehicle has events on a specific day
  const getEventsForDay = (vehicleId, day) => {
    if (!day) return [];
    
    try {
      // Create a date object for the current day
      let date;
      
      if (viewMode === 'month') {
        date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      } else if (viewMode === 'week') {
        date = new Date(day); // For week view, day is already a Date object
      }
      
      date.setHours(0, 0, 0, 0);
      
      // Format as ISO date string for comparison
      const dateStr = date.toISOString().split('T')[0];
      
      const events = [];
      
      // Check assignments
      assignments.forEach(assignment => {
        if (assignment.vehicle_id === vehicleId) {
          const startDate = new Date(assignment.start_time);
          startDate.setHours(0, 0, 0, 0);
          
          // Default end date is far in the future if not specified
          let endDate;
          if (assignment.end_time) {
            endDate = new Date(assignment.end_time);
            endDate.setHours(23, 59, 59, 999);
          } else {
            // If no end date, consider it ongoing indefinitely
            endDate = new Date(9999, 11, 31);
          }
          
          if (date >= startDate && date <= endDate && assignment.status !== 'rejected' && assignment.status !== 'cancelled') {
            events.push({
              type: 'assignment',
              data: assignment,
              color: assignment.is_temporary ? '#17a2b8' : '#007bff',
              priority: 2, // Priority for rendering (higher shows on top)
              title: `Driver: ${assignment.driver?.full_name || 'Unknown'}`,
              status: assignment.status
            });
          }
        }
      });
      
      // Check blocked periods
      blockedPeriods.forEach(block => {
        if (block.vehicle_id === vehicleId) {
          // Handle date comparison properly
          const blockStartStr = block.start_date.split('T')[0];
          const blockEndStr = block.end_date.split('T')[0];
          
          // Compare as date strings for simplicity (YYYY-MM-DD format)
          if (dateStr >= blockStartStr && dateStr <= blockEndStr) {
            events.push({
              type: 'blocked',
              data: block,
              color: '#dc3545',
              priority: 1, // Priority for rendering (higher shows on top)
              title: `Blocked: ${block.reason.substring(0, 20)}${block.reason.length > 20 ? '...' : ''}`
            });
          }
        }
      });
      
      // Sort events by priority
      events.sort((a, b) => b.priority - a.priority);
      
      return events;
    } catch (error) {
      console.error("Error getting events for day:", error, "Date:", day);
      return [];
    }
  };

  // Helper function to format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to format time
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to format datetime
  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to determine status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'approved':
        return '#28a745';
      case 'pending':
        return '#ffc107';
      case 'rejected':
        return '#dc3545';
      case 'cancelled':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  // Modal component with improved styling
  const Modal = ({ show, onClose, title, children }) => {
    if (!show) return null;
    
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(3px)'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '550px',
          maxWidth: '95%',
          maxHeight: '90%',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}>
          <div style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid #eee', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: '#f8f9fa',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>{title}</h3>
            <button 
              onClick={onClose} 
              style={{ 
                background: 'none', 
                border: 'none', 
                fontSize: '1.5rem', 
                cursor: 'pointer',
                color: '#6c757d',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              &times;
            </button>
          </div>
          <div style={{ padding: '20px' }}>
            {children}
          </div>
          <div style={{ 
            padding: '15px 20px', 
            borderTop: '1px solid #eee', 
            display: 'flex', 
            justifyContent: 'flex-end',
            backgroundColor: '#f8f9fa',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px'
          }}>
            <button 
              onClick={onClose}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Tooltip component for hover info
  const Tooltip = ({ position, content }) => {
    if (!position) return null;
    
    return (
      <div style={{
        position: 'fixed',
        top: position.y + 10,
        left: position.x + 10,
        backgroundColor: 'rgba(33, 37, 41, 0.9)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '0.85rem',
        maxWidth: '250px',
        zIndex: 1200,
        pointerEvents: 'none',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(5px)'
      }}>
        {content}
      </div>
    );
  };

  // Get the month and year for the header
  const getHeaderTitle = () => {
    if (viewMode === 'month') {
      const monthName = currentDate.toLocaleString('default', { month: 'long' });
      const year = currentDate.getFullYear();
      return `${monthName} ${year}`;
    } else if (viewMode === 'week') {
      const day = currentDate.getDay();
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - day);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Format: "March 10 - 16, 2025"
      const startMonth = weekStart.toLocaleString('default', { month: 'short' });
      const endMonth = weekEnd.toLocaleString('default', { month: 'short' });
      const startDay = weekStart.getDate();
      const endDay = weekEnd.getDate();
      const year = weekEnd.getFullYear();
      
      if (startMonth === endMonth) {
        return `${startMonth} ${startDay} - ${endDay}, ${year}`;
      } else {
        return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
      }
    }
    
    return '';
  };
  
  // Calendar days
  const calendarDays = generateCalendarDays();
  
  // Weekday headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get today's info
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() && 
                         today.getFullYear() === currentDate.getFullYear();
  const currentDay = today.getDate();

  // Format a day cell date for week view
  const formatDayForWeekView = (date) => {
    const isToday = date.getDate() === today.getDate() && 
                    date.getMonth() === today.getMonth() && 
                    date.getFullYear() === today.getFullYear();
    
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    
    return { month, day, isToday };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button 
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            color: '#007bff'
          }}
        >
          ← Back to Vehicle Management
        </button>
      </div>
      
      <h2 style={{ marginBottom: '20px' }}>Vehicle Calendar</h2>
      
      {error && (
        <div style={{ 
          padding: '12px 16px', 
          marginBottom: '15px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px',
          border: '1px solid #f5c6cb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span><strong>Error:</strong> {error}</span>
          <button onClick={fetchData} style={{
            backgroundColor: '#721c24',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}>
            <i className="bi bi-arrow-repeat me-1"></i> Retry
          </button>
        </div>
      )}
      
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          {/* Calendar Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Previous Button */}
            <button 
              onClick={handlePreviousMonth}
              style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                padding: '8px 12px',
                cursor: 'pointer',
                color: '#495057',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.borderColor = '#adb5bd';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#ced4da';
              }}
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            
            {/* Current Period Display */}
            <span style={{ 
              fontSize: '1.2rem', 
              fontWeight: 'bold',
              color: '#212529',
              minWidth: '180px',
              textAlign: 'center'
            }}>
              {getHeaderTitle()}
            </span>
            
            {/* Next Button */}
            <button 
              onClick={handleNextMonth}
              style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                padding: '8px 12px',
                cursor: 'pointer',
                color: '#495057',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.borderColor = '#adb5bd';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#ced4da';
              }}
            >
              <i className="bi bi-chevron-right"></i>
            </button>
            
            {/* Today Button */}
            <button 
              onClick={handleJumpToToday}
              style={{
                backgroundColor: '#e9ecef',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                padding: '8px 12px',
                cursor: 'pointer',
                marginLeft: '10px',
                color: '#495057',
                fontWeight: '500',
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#dee2e6';
                e.currentTarget.style.borderColor = '#adb5bd';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.borderColor = '#ced4da';
              }}
            >
              Today
            </button>
            
            {/* View Mode Selector */}
            <div style={{ 
              display: 'flex', 
              border: '1px solid #ced4da',
              borderRadius: '4px', 
              overflow: 'hidden',
              marginLeft: '15px'
            }}>
              <button 
                onClick={() => handleViewModeChange('month')}
                style={{
                  backgroundColor: viewMode === 'month' ? '#007bff' : '#f8f9fa',
                  color: viewMode === 'month' ? 'white' : '#495057',
                  border: 'none',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s'
                }}
              >
                Month
              </button>
              <button 
                onClick={() => handleViewModeChange('week')}
                style={{
                  backgroundColor: viewMode === 'week' ? '#007bff' : '#f8f9fa',
                  color: viewMode === 'week' ? 'white' : '#495057',
                  border: 'none',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                  borderLeft: '1px solid #ced4da'
                }}
              >
                Week
              </button>
            </div>
          </div>
          
          {/* Vehicle Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="vehicleSelect" style={{ 
              marginRight: '5px',
              fontWeight: '500',
              color: '#495057' 
            }}>
              Vehicle:
            </label>
            <select 
              id="vehicleSelect" 
              value={selectedVehicle} 
              onChange={handleVehicleSelect}
              style={{ 
                padding: '8px 12px', 
                borderRadius: '4px', 
                border: '1px solid #ced4da',
                minWidth: '220px',
                backgroundColor: '#fff',
                transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
                boxShadow: 'none',
                color: '#495057'
              }}
            >
              <option value="all">All Vehicles</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registration_number} ({vehicle.make} {vehicle.model})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Calendar Legend */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '12px 16px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '6px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '15px', 
            alignItems: 'center' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                backgroundColor: '#007bff', 
                borderRadius: '3px', 
                marginRight: '8px',
                border: '1px solid rgba(0,0,0,0.1)'
              }}></div>
              <span style={{ color: '#495057', fontSize: '0.9rem' }}>Permanent Assignment</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                backgroundColor: '#17a2b8', 
                borderRadius: '3px', 
                marginRight: '8px',
                border: '1px solid rgba(0,0,0,0.1)'
              }}></div>
              <span style={{ color: '#495057', fontSize: '0.9rem' }}>Temporary Assignment</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                backgroundColor: '#dc3545', 
                borderRadius: '3px', 
                marginRight: '8px',
                border: '1px solid rgba(0,0,0,0.1)'
              }}></div>
              <span style={{ color: '#495057', fontSize: '0.9rem' }}>Blocked Period</span>
            </div>
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginLeft: 'auto',
                color: '#6c757d',
                fontSize: '0.85rem'
              }}
            >
              <i className="bi bi-info-circle me-1"></i>
              <span>Click on any colored cell to view details</span>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ 
              border: '4px solid rgba(0, 0, 0, 0.1)',
              borderLeftColor: '#007bff',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              margin: '0 auto 15px',
              animation: 'spin 1s linear infinite'
            }}></div>
            <div style={{ color: '#6c757d' }}>Loading calendar data...</div>
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        ) : (
          <>
            {/* Calendar header with weekdays - fixed and more visible */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, minmax(80px, 1fr))', 
              position: 'sticky',
              top: 0,
              backgroundColor: '#f8f9fa',
              zIndex: 2,
              borderRadius: '6px 6px 0 0',
              overflow: 'hidden',
              border: '1px solid #dee2e6',
              borderBottom: 'none'
            }}>
              {weekdays.map((day, index) => (
                <div 
                  key={index}
                  style={{
                    padding: '10px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: index === 0 || index === 6 ? '#dc3545' : '#495057',
                    borderRight: index < 6 ? '1px solid #dee2e6' : 'none',
                    fontSize: '0.95rem'
                  }}
                >
                  {day}
                </div>
              ))}
            </div>
            
            {selectedVehicle === 'all' ? (
              /* All vehicles view */
              <div style={{ 
                border: '1px solid #dee2e6',
                borderTop: 'none',
                borderRadius: '0 0 6px 6px',
                backgroundColor: '#fff'
              }}>
                {vehicles.map(vehicle => (
                  <div key={vehicle.id} style={{ 
                    marginBottom: '20px', 
                    borderTop: '1px solid #dee2e6', 
                    paddingTop: '15px',
                    paddingBottom: '15px',
                    paddingLeft: '15px',
                    paddingRight: '15px'
                  }}>
                    <h4 style={{ 
                      marginBottom: '10px',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#212529',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <i className="bi bi-truck" style={{ color: '#6c757d' }}></i>
                      {vehicle.registration_number} 
                      <span style={{ 
                        fontWeight: 'normal',
                        fontSize: '0.95rem',
                        color: '#6c757d'
                      }}>
                        ({vehicle.make} {vehicle.model})
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        color: 'white',
                        backgroundColor: 
                          vehicle.status === 'available' ? '#28a745' :
                          vehicle.status === 'assigned' ? '#007bff' :
                          vehicle.status === 'spare' ? '#17a2b8' :
                          vehicle.status === 'maintenance' ? '#ffc107' : '#6c757d',
                        marginLeft: 'auto'
                      }}>
                        {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                      </span>
                    </h4>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(7, minmax(80px, 1fr))',
                      gap: '2px'
                    }}>
                      {/* If Week View */}
                      {viewMode === 'week' && calendarDays.map((date, index) => {
                        const { month, day, isToday } = formatDayForWeekView(date);
                        const events = getEventsForDay(vehicle.id, date);
                        const hasEvents = events.length > 0;
                        
                        return (
                          <div 
                            key={index}
                            style={{
                              height: '50px',
                              border: isToday ? '2px solid #007bff' : '1px solid #dee2e6',
                              backgroundColor: isToday ? '#f0f8ff' : 'white',
                              position: 'relative',
                              overflow: 'hidden',
                              borderRadius: '4px'
                            }}
                          >
                            <div style={{ 
                              padding: '2px 5px', 
                              fontSize: '0.7rem', 
                              textAlign: 'right',
                              fontWeight: isToday ? 'bold' : 'normal',
                              color: '#6c757d',
                              backgroundColor: 'rgba(248, 249, 250, 0.7)',
                              borderBottom: '1px solid #e9ecef'
                            }}>
                              {day} {month}
                            </div>
                            {hasEvents && (
                              <div 
                                style={{
                                  position: 'absolute',
                                  top: '18px',
                                  left: '3px',
                                  right: '3px',
                                  bottom: '3px',
                                  backgroundColor: events[0].color,
                                  borderRadius: '3px',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  opacity: 0.9,
                                  transition: 'opacity 0.2s',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                                onClick={() => showEventDetails({ vehicle, events, day })}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.opacity = 1;
                                  setShowTooltip({ 
                                    x: e.clientX, 
                                    y: e.clientY,
                                    content: events[0].title || (events[0].type === 'assignment' ? 'Assignment' : 'Blocked')
                                  });
                                }}
                                onMouseMove={(e) => {
                                  if (showTooltip) {
                                    setShowTooltip({ 
                                      ...showTooltip,
                                      x: e.clientX, 
                                      y: e.clientY 
                                    });
                                  }
                                }}
                                onMouseOut={() => {
                                  setShowTooltip(null);
                                }}
                              >
                                {events.length > 1 && (
                                  <span style={{ 
                                    color: 'white', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 'bold',
                                    textShadow: '0px 0px 2px rgba(0,0,0,0.5)'
                                  }}>
                                    {events.length}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* If Month View */}
                      {viewMode === 'month' && calendarDays.map((day, index) => {
                        const events = getEventsForDay(vehicle.id, day);
                        const hasEvents = events.length > 0;
                        
                        // Check if this is today
                        const isToday = isCurrentMonth && day === currentDay;
                        
                        return (
                          <div 
                            key={index}
                            style={{
                              height: '50px',
                              border: day ? (isToday ? '2px solid #007bff' : '1px solid #dee2e6') : 'none',
                              backgroundColor: day ? (isToday ? '#f0f8ff' : 'white') : 'transparent',
                              position: 'relative',
                              overflow: 'hidden',
                              borderRadius: day ? '4px' : '0'
                            }}
                          >
                            {day && (
                              <>
                                <div style={{ 
                                  padding: '2px 5px', 
                                  fontSize: '0.75rem', 
                                  textAlign: 'right',
                                  fontWeight: isToday ? 'bold' : 'normal',
                                  color: '#6c757d',
                                  backgroundColor: 'rgba(248, 249, 250, 0.7)',
                                  borderBottom: '1px solid #e9ecef'
                                }}>
                                  {day}
                                </div>
                                {hasEvents && (
                                  <div 
                                    style={{
                                      position: 'absolute',
                                      top: '18px',
                                      left: '3px',
                                      right: '3px',
                                      bottom: '3px',
                                      backgroundColor: events[0].color,
                                      borderRadius: '3px',
                                      display: 'flex',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      cursor: 'pointer',
                                      opacity: 0.9,
                                      transition: 'opacity 0.2s',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                    }}
                                    onClick={() => showEventDetails({ vehicle, events, day })}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.opacity = 1;
                                      setShowTooltip({ 
                                        x: e.clientX, 
                                        y: e.clientY,
                                        content: events[0].title || (events[0].type === 'assignment' ? 'Assignment' : 'Blocked')
                                      });
                                    }}
                                    onMouseMove={(e) => {
                                      if (showTooltip) {
                                        setShowTooltip({ 
                                          ...showTooltip,
                                          x: e.clientX, 
                                          y: e.clientY 
                                        });
                                      }
                                    }}
                                    onMouseOut={() => {
                                      setShowTooltip(null);
                                    }}
                                  >
                                    {events.length > 1 && (
                                      <span style={{ 
                                        color: 'white', 
                                        fontSize: '0.75rem', 
                                        fontWeight: 'bold',
                                        textShadow: '0px 0px 2px rgba(0,0,0,0.5)'
                                      }}>
                                        {events.length}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Single vehicle view - with more details */
              <div style={{ 
                border: '1px solid #dee2e6',
                borderTop: 'none',
                borderRadius: '0 0 6px 6px',
                backgroundColor: '#fff',
                padding: '15px'
              }}>
                {/* Vehicle info header */}
                {vehicles.find(v => v.id === selectedVehicle) && (
                  <div style={{
                    marginBottom: '20px',
                    padding: '12px 15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #e9ecef',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ flex: '1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="bi bi-truck" style={{ fontSize: '1.2rem', color: '#495057' }}></i>
                        <h3 style={{ 
                          margin: 0, 
                          fontSize: '1.1rem', 
                          fontWeight: '600',
                          color: '#212529'
                        }}>
                          {vehicles.find(v => v.id === selectedVehicle)?.registration_number}
                        </h3>
                      </div>
                      <div style={{ 
                        fontSize: '0.9rem',
                        color: '#6c757d',
                        marginTop: '4px'
                      }}>
                        {vehicles.find(v => v.id === selectedVehicle)?.make} {vehicles.find(v => v.id === selectedVehicle)?.model}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <div>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          textTransform: 'uppercase',
                          color: '#6c757d',
                          display: 'block',
                          marginBottom: '3px'
                        }}>
                          Status
                        </span>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          color: 'white',
                          fontSize: '0.75rem',
                          backgroundColor: 
                            vehicles.find(v => v.id === selectedVehicle)?.status === 'available' ? '#28a745' :
                            vehicles.find(v => v.id === selectedVehicle)?.status === 'assigned' ? '#007bff' :
                            vehicles.find(v => v.id === selectedVehicle)?.status === 'spare' ? '#17a2b8' :
                            vehicles.find(v => v.id === selectedVehicle)?.status === 'maintenance' ? '#ffc107' : '#6c757d',
                        }}>
                          {vehicles.find(v => v.id === selectedVehicle)?.status.charAt(0).toUpperCase() + 
                           vehicles.find(v => v.id === selectedVehicle)?.status.slice(1)}
                        </span>
                      </div>
                      <div>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          textTransform: 'uppercase',
                          color: '#6c757d',
                          display: 'block',
                          marginBottom: '3px'
                        }}>
                          Year
                        </span>
                        <span style={{ fontWeight: '500', color: '#495057' }}>
                          {vehicles.find(v => v.id === selectedVehicle)?.year || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Detailed Calendar */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))',
                  gap: '3px'
                }}>
                  {/* Week View */}
                  {viewMode === 'week' && calendarDays.map((date, index) => {
                    const { month, day, isToday } = formatDayForWeekView(date);
                    const events = getEventsForDay(selectedVehicle, date);
                    const hasEvents = events.length > 0;
                    
                    return (
                      <div 
                        key={index}
                        style={{
                          minHeight: '180px',
                          border: isToday ? '2px solid #007bff' : '1px solid #dee2e6',
                          backgroundColor: isToday ? '#f0f8ff' : 'white',
                          padding: '5px',
                          position: 'relative',
                          overflow: 'hidden',
                          borderRadius: '4px'
                        }}
                      >
                        <div style={{ 
                          fontSize: '0.9rem', 
                          fontWeight: isToday ? 'bold' : 'normal', 
                          textAlign: 'right', 
                          marginBottom: '8px',
                          padding: '4px',
                          color: '#495057',
                          borderBottom: '1px solid #e9ecef',
                          backgroundColor: 'rgba(248, 249, 250, 0.7)'
                        }}>
                          {day} {month}
                        </div>
                        {hasEvents ? (
                          <div style={{ fontSize: '0.85rem' }}>
                            {events.map((event, idx) => (
                              <div 
                                key={idx}
                                style={{ 
                                  padding: '6px 8px',
                                  backgroundColor: event.color,
                                  color: 'white',
                                  borderRadius: '4px',
                                  marginBottom: '6px',
                                  cursor: 'pointer',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '3px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                  transition: 'transform 0.1s, box-shadow 0.1s'
                                }}
                                onClick={() => showEventDetails({ 
                                  vehicle: vehicles.find(v => v.id === selectedVehicle), 
                                  events: [event], 
                                  day: date
                                })}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.1)';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                }}
                              >
                                <div style={{ 
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                }}>
                                  {event.type === 'assignment' ? 'Driver Assigned' : 'Blocked'}
                                </div>
                                {event.type === 'assignment' && (
                                  <div style={{ fontSize: '0.75rem' }}>
                                    {event.data.driver?.full_name || 'Unknown Driver'}
                                    {event.data.status !== 'approved' && (
                                      <span style={{
                                        display: 'inline-block',
                                        marginLeft: '4px',
                                        fontSize: '0.7rem',
                                        padding: '1px 4px',
                                        borderRadius: '3px',
                                        backgroundColor: 'rgba(0,0,0,0.2)',
                                        textTransform: 'uppercase'
                                      }}>
                                        {event.data.status}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {event.type === 'blocked' && (
                                  <div style={{ 
                                    fontSize: '0.75rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {event.data.reason.length > 25 
                                      ? `${event.data.reason.substring(0, 25)}...` 
                                      : event.data.reason}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ 
                            height: '110px', 
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: '#adb5bd',
                            fontSize: '0.85rem',
                            fontStyle: 'italic',
                            backgroundColor: 'rgba(248, 249, 250, 0.3)',
                            borderRadius: '4px',
                            border: '1px dashed #dee2e6'
                          }}>
                            Available
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Month View */}
                  {viewMode === 'month' && calendarDays.map((day, index) => {
                    const events = getEventsForDay(selectedVehicle, day);
                    const hasEvents = events.length > 0;
                    
                    // Check if this is today
                    const isToday = isCurrentMonth && day === currentDay;
                    
                    return (
                      <div 
                        key={index}
                        style={{
                          minHeight: day ? '150px' : '0',
                          border: day ? (isToday ? '2px solid #007bff' : '1px solid #dee2e6') : 'none',
                          backgroundColor: day ? (isToday ? '#f0f8ff' : 'white') : 'transparent',
                          padding: day ? '5px' : '0',
                          position: 'relative',
                          overflow: 'hidden',
                          borderRadius: day ? '4px' : '0'
                        }}
                      >
                        {day && (
                          <>
                            <div style={{ 
                              fontSize: '0.9rem', 
                              fontWeight: isToday ? 'bold' : 'normal', 
                              textAlign: 'right', 
                              marginBottom: '8px',
                              padding: '4px',
                              color: '#495057',
                              borderBottom: '1px solid #e9ecef',
                              backgroundColor: 'rgba(248, 249, 250, 0.7)'
                            }}>
                              {day}
                            </div>
                            {hasEvents ? (
                              <div style={{ fontSize: '0.85rem' }}>
                                {events.map((event, idx) => (
                                  <div 
                                    key={idx}
                                    style={{ 
                                      padding: '6px 8px',
                                      backgroundColor: event.color,
                                      color: 'white',
                                      borderRadius: '4px',
                                      marginBottom: '6px',
                                      cursor: 'pointer',
                                      overflow: 'hidden',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '3px',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                      transition: 'transform 0.1s, box-shadow 0.1s'
                                    }}
                                    onClick={() => showEventDetails({ 
                                      vehicle: vehicles.find(v => v.id === selectedVehicle), 
                                      events: [event], 
                                      day 
                                    })}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                      e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.1)';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                    }}
                                  >
                                    <div style={{ 
                                      fontWeight: 'bold',
                                      fontSize: '0.8rem',
                                      textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                    }}>
                                      {event.type === 'assignment' ? 'Driver Assigned' : 'Blocked'}
                                    </div>
                                    {event.type === 'assignment' && (
                                      <div style={{ fontSize: '0.75rem' }}>
                                        {event.data.driver?.full_name || 'Unknown Driver'}
                                        {event.data.status !== 'approved' && (
                                          <span style={{
                                            display: 'inline-block',
                                            marginLeft: '4px',
                                            fontSize: '0.7rem',
                                            padding: '1px 4px',
                                            borderRadius: '3px',
                                            backgroundColor: 'rgba(0,0,0,0.2)',
                                            textTransform: 'uppercase'
                                          }}>
                                            {event.data.status}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {event.type === 'blocked' && (
                                      <div style={{ 
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}>
                                        {event.data.reason.length > 25 
                                          ? `${event.data.reason.substring(0, 25)}...` 
                                          : event.data.reason}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ 
                                height: '80px', 
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: '#adb5bd',
                                fontSize: '0.85rem',
                                fontStyle: 'italic',
                                backgroundColor: 'rgba(248, 249, 250, 0.3)',
                                borderRadius: '4px',
                                border: '1px dashed #dee2e6'
                              }}>
                                Available
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Event Details Modal */}
      <Modal
        show={showEventModal}
        onClose={() => setShowEventModal(false)}
        title="Event Details"
      >
        {selectedEvent && (
          <div>
            {/* Vehicle Info */}
            <div style={{ 
              marginBottom: '20px',
              padding: '12px 15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="bi bi-truck" style={{ fontSize: '1.1rem', color: '#6c757d' }}></i>
                <span style={{ fontWeight: '600', color: '#495057' }}>
                  {selectedEvent.vehicle.registration_number}
                </span>
                <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                  ({selectedEvent.vehicle.make} {selectedEvent.vehicle.model})
                </span>
              </div>
              <div style={{ 
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#6c757d',
                fontSize: '0.9rem'
              }}>
                <i className="bi bi-calendar3"></i>
                <span>
                  {viewMode === 'month' 
                    ? formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedEvent.day))
                    : formatDate(selectedEvent.day)
                  }
                </span>
              </div>
            </div>
            
            <h5 style={{ 
              marginTop: '20px', 
              marginBottom: '15px',
              fontSize: '1.1rem',
              color: '#343a40',
              fontWeight: '600'
            }}>
              Events
            </h5>
            {selectedEvent.events.map((event, idx) => (
              <div 
                key={idx}
                style={{ 
                  marginBottom: '15px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  border: '1px solid #dee2e6',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}
              >
                {/* Header with color and type */}
                <div style={{ 
                  backgroundColor: event.color,
                  color: 'white',
                  padding: '10px 15px',
                  fontWeight: '600',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>
                    {event.type === 'assignment' 
                      ? `${event.data.is_temporary ? 'Temporary' : 'Permanent'} Assignment` 
                      : 'Vehicle Blocked'
                    }
                  </span>
                  {event.data.status && (
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255,255,255,0.25)',
                      textTransform: 'uppercase',
                      fontWeight: 'bold'
                    }}>
                      {event.data.status}
                    </span>
                  )}
                </div>
                
                {/* Event details */}
                <div style={{ padding: '15px', backgroundColor: 'white' }}>
                  {/* For assignments */}
                  {event.type === 'assignment' && (
                    <>
                      {/* Driver info */}
                      <div style={{ 
                        marginBottom: '15px',
                        borderBottom: '1px solid #e9ecef',
                        paddingBottom: '15px'
                      }}>
                        <h6 style={{ 
                          margin: '0 0 10px 0', 
                          fontSize: '0.9rem',
                          color: '#6c757d',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Driver Information
                        </h6>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <i className="bi bi-person-circle" style={{ fontSize: '1.8rem', color: '#6c757d' }}></i>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                              {event.data.driver?.full_name || 'Unknown Driver'}
                            </div>
                            <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                              {event.data.driver?.email || 'No email available'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Assignment details */}
                      <div style={{ marginBottom: '15px' }}>
                        <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center' }}>
                          <span style={{ 
                            width: '120px', 
                            color: '#6c757d', 
                            fontSize: '0.9rem',
                            fontWeight: '500'
                          }}>
                            Start Date:
                          </span>
                          <span>{formatDateTime(event.data.start_time)}</span>
                        </div>
                        <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center' }}>
                          <span style={{ 
                            width: '120px', 
                            color: '#6c757d', 
                            fontSize: '0.9rem',
                            fontWeight: '500'
                          }}>
                            End Date:
                          </span>
                          <span>{event.data.end_time ? formatDateTime(event.data.end_time) : 'Ongoing'}</span>
                        </div>
                        <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center' }}>
                          <span style={{ 
                            width: '120px', 
                            color: '#6c757d', 
                            fontSize: '0.9rem',
                            fontWeight: '500'
                          }}>
                            Type:
                          </span>
                          <span>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.8rem',
                              color: 'white',
                              backgroundColor: event.data.is_temporary ? '#17a2b8' : '#007bff'
                            }}>
                              {event.data.is_temporary ? 'Temporary' : 'Permanent'}
                            </span>
                          </span>
                        </div>
                        <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center' }}>
                          <span style={{ 
                            width: '120px', 
                            color: '#6c757d', 
                            fontSize: '0.9rem',
                            fontWeight: '500'
                          }}>
                            Status:
                          </span>
                          <span>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.8rem',
                              color: 'white',
                              backgroundColor: getStatusBadgeColor(event.data.status)
                            }}>
                              {event.data.status.charAt(0).toUpperCase() + event.data.status.slice(1)}
                            </span>
                          </span>
                        </div>
                      </div>
                      
                      {/* Notes */}
                      {event.data.notes && (
                        <div style={{ 
                          marginTop: '15px',
                          padding: '10px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '4px',
                          border: '1px solid #e9ecef'
                        }}>
                          <div style={{ 
                            margin: '0 0 5px 0', 
                            fontSize: '0.9rem',
                            color: '#6c757d',
                            fontWeight: '500'
                          }}>
                            Notes:
                          </div>
                          <div style={{ color: '#495057' }}>
                            {event.data.notes}
                          </div>
                        </div>
                      )}
                      
                      {/* Admin details */}
                      <div style={{ 
                        marginTop: '15px',
                        paddingTop: '15px',
                        borderTop: '1px solid #e9ecef'
                      }}>
                        <h6 style={{ 
                          margin: '0 0 10px 0', 
                          fontSize: '0.9rem',
                          color: '#6c757d',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Assignment Details
                        </h6>
                        <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center' }}>
                          <span style={{ 
                            width: '120px', 
                            color: '#6c757d', 
                            fontSize: '0.9rem',
                            fontWeight: '500'
                          }}>
                            Created By:
                          </span>
                          <span>
                            {event.data.creator?.full_name || 'Unknown'} {event.data.creator?.email ? `(${event.data.creator.email})` : ''}
                          </span>
                        </div>
                        {/* Admin approval info removed as it doesn't exist in schema */}
                        <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center' }}>
                          <span style={{ 
                            width: '120px', 
                            color: '#6c757d', 
                            fontSize: '0.9rem',
                            fontWeight: '500'
                          }}>
                            Created On:
                          </span>
                          <span>{formatDateTime(event.data.created_at)}</span>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* For blocked periods */}
                  {event.type === 'blocked' && (
                    <>
                      <div style={{ marginBottom: '15px' }}>
                        <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center' }}>
                          <span style={{ 
                            width: '120px', 
                            color: '#6c757d', 
                            fontSize: '0.9rem',
                            fontWeight: '500'
                          }}>
                            Start Date:
                          </span>
                          <span>{formatDate(event.data.start_date)}</span>
                        </div>
                        <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center' }}>
                          <span style={{ 
                            width: '120px', 
                            color: '#6c757d', 
                            fontSize: '0.9rem',
                            fontWeight: '500'
                          }}>
                            End Date:
                          </span>
                          <span>{formatDate(event.data.end_date)}</span>
                        </div>
                      </div>
                      
                      {/* Reason */}
                      <div style={{ 
                        marginTop: '15px',
                        padding: '10px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{ 
                          margin: '0 0 5px 0', 
                          fontSize: '0.9rem',
                          color: '#6c757d',
                          fontWeight: '500'
                        }}>
                          Reason:
                        </div>
                        <div style={{ color: '#495057' }}>
                          {event.data.reason}
                        </div>
                      </div>
                      
                      {/* Admin details */}
                      {event.data.creator && (
                        <div style={{ 
                          marginTop: '15px',
                          paddingTop: '15px',
                          borderTop: '1px solid #e9ecef'
                        }}>
                          <h6 style={{ 
                            margin: '0 0 10px 0', 
                            fontSize: '0.9rem',
                            color: '#6c757d',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Block Details
                          </h6>
                          <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center' }}>
                            <span style={{ 
                              width: '120px', 
                              color: '#6c757d', 
                              fontSize: '0.9rem',
                              fontWeight: '500'
                            }}>
                              Created By:
                            </span>
                            <span>
                              {event.data.creator?.full_name || 'Unknown'} {event.data.creator?.email ? `(${event.data.creator.email})` : ''}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
      
      {/* Tooltip for hover info */}
      <Tooltip 
        position={showTooltip} 
        content={showTooltip?.content} 
      />
    </div>
  );
};

export default VehicleCalendar;