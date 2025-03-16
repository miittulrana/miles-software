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
  }, [currentDate, selectedVehicle]);

// admin-app/src/components/vehicles/VehicleCalendar.jsx - fetchData function
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
      
      // 2. Get assignments - simplified to avoid relationship issues
      // Format dates for filtering
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      const startDateStr = startOfMonth.toISOString();
      const endDateStr = endOfMonth.toISOString();
      
      // Base assignments query
      let assignmentsQuery = supabase
        .from('vehicle_assignments')
        .select('id, vehicle_id, driver_id, start_time, end_time, is_temporary, status')
        .gte('start_time', startDateStr)
        .lte('start_time', endDateStr);
      
      // Add vehicle filter if needed
      if (selectedVehicle !== 'all') {
        assignmentsQuery = assignmentsQuery.eq('vehicle_id', selectedVehicle);
      }
      
      const assignmentsResult = await executeQuery(() => assignmentsQuery);
      
      if (assignmentsResult.error) {
        throw new Error(assignmentsResult.error.message || 'Failed to load assignments');
      }
      
      // Handle assignment relationships manually
      const enhancedAssignments = assignmentsResult.data.map(assignment => {
        // Add user/driver details
        // For simplicity, we're skipping driver details for now, but you would fetch users separately
        // and map them here if needed
        
        return {
          ...assignment
        };
      });
      
      setAssignments(enhancedAssignments || []);
      
      // 3. Get blocked periods - simplified to avoid relationship issues
      let blockedQuery = supabase
        .from('vehicle_blocked_periods')
        .select('id, vehicle_id, start_date, end_date, reason');
      
      if (selectedVehicle !== 'all') {
        blockedQuery = blockedQuery.eq('vehicle_id', selectedVehicle);
      }
      
      const blockedResult = await executeQuery(() => blockedQuery);
      
      if (blockedResult.error) {
        throw new Error(blockedResult.error.message || 'Failed to load blocked periods');
      }
      
      setBlockedPeriods(blockedResult.data || []);
      
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      setError('Failed to load calendar data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleVehicleSelect = (e) => {
    setSelectedVehicle(e.target.value);
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

  // Generate calendar days
  const generateCalendarDays = () => {
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
  };

  // Check if a vehicle has events on a specific day
  const getEventsForDay = (vehicleId, day) => {
    if (!day) return [];
    
    try {
      // Create a date object for the current day
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
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
              color: assignment.is_temporary ? '#17a2b8' : '#007bff'
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
              color: '#dc3545'
            });
          }
        }
      });
      
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

  // Modal component
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
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '5px',
          width: '400px',
          maxWidth: '90%',
          maxHeight: '90%',
          overflowY: 'auto',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
          </div>
          <div style={{ padding: '15px' }}>
            {children}
          </div>
          <div style={{ padding: '15px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={onClose}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Get the month and year for the header
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  
  // Calendar days
  const calendarDays = generateCalendarDays();
  
  // Weekday headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get today's info
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() && 
                         today.getFullYear() === currentDate.getFullYear();
  const currentDay = today.getDate();

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
            cursor: 'pointer'
          }}
        >
          ← Back to Vehicle Management
        </button>
      </div>
      
      <h2>Vehicle Calendar</h2>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '15px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>{error}</span>
          <button onClick={fetchData} style={{
            backgroundColor: '#721c24',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer'
          }}>
            Retry
          </button>
        </div>
      )}
      
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '5px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '15px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <button 
              onClick={handlePreviousMonth}
              style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                padding: '5px 10px',
                marginRight: '10px',
                cursor: 'pointer'
              }}
            >
              ←
            </button>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{monthName} {year}</span>
            <button 
              onClick={handleNextMonth}
              style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                padding: '5px 10px',
                marginLeft: '10px',
                cursor: 'pointer'
              }}
            >
              →
            </button>
          </div>
          
          <div>
            <label htmlFor="vehicleSelect" style={{ marginRight: '10px' }}>Vehicle:</label>
            <select 
              id="vehicleSelect" 
              value={selectedVehicle} 
              onChange={handleVehicleSelect}
              style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ced4da' }}
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
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ 
              border: '4px solid rgba(0, 0, 0, 0.1)',
              borderLeftColor: '#007bff',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              margin: '0 auto 15px',
              animation: 'spin 1s linear infinite'
            }}></div>
            <div>Loading calendar data...</div>
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
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '10px', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginRight: '20px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#007bff', borderRadius: '2px', marginRight: '5px' }}></div>
                  <span>Permanent Assignment</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginRight: '20px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#17a2b8', borderRadius: '2px', marginRight: '5px' }}></div>
                  <span>Temporary Assignment</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#dc3545', borderRadius: '2px', marginRight: '5px' }}></div>
                  <span>Blocked Period</span>
                </div>
              </div>
              <p style={{ color: '#6c757d', margin: 0, fontSize: '0.9rem' }}>Click on any colored cell to view details</p>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              {/* Calendar header with weekdays - fixed and more visible */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, minmax(80px, 1fr))', 
                position: 'sticky',
                top: 0,
                backgroundColor: '#f8f9fa',
                zIndex: 1
              }}>
                {weekdays.map((day, index) => (
                  <div 
                    key={index}
                    style={{
                      padding: '8px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      borderBottom: '2px solid #dee2e6',
                      borderRight: index < 6 ? '1px solid #dee2e6' : 'none'
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>
              
              {selectedVehicle === 'all' ? (
                /* All vehicles view */
                vehicles.map(vehicle => (
                  <div key={vehicle.id} style={{ 
                    marginBottom: '20px', 
                    borderTop: '1px solid #dee2e6', 
                    paddingTop: '10px'
                  }}>
                    <h4 style={{ marginBottom: '10px' }}>
                      {vehicle.registration_number} ({vehicle.make} {vehicle.model})
                    </h4>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(7, minmax(80px, 1fr))',
                      gap: '2px'
                    }}>
                      {calendarDays.map((day, index) => {
                        const events = getEventsForDay(vehicle.id, day);
                        const hasEvents = events.length > 0;
                        
                        // Check if this is today
                        const isToday = isCurrentMonth && day === currentDay;
                        
                        return (
                          <div 
                            key={index}
                            style={{
                              height: '50px',
                              border: isToday ? '2px solid #007bff' : '1px solid #dee2e6',
                              backgroundColor: day ? (isToday ? '#f0f8ff' : 'white') : '#f8f9fa',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                          >
                            {day && (
                              <>
                                <div style={{ 
                                  padding: '2px 5px', 
                                  fontSize: '0.8rem', 
                                  textAlign: 'right',
                                  fontWeight: isToday ? 'bold' : 'normal'
                                }}>
                                  {day}
                                </div>
                                {hasEvents && (
                                  <div 
                                    style={{
                                      position: 'absolute',
                                      top: '18px',
                                      left: '2px',
                                      right: '2px',
                                      bottom: '2px',
                                      backgroundColor: events[0].color,
                                      borderRadius: '3px',
                                      display: 'flex',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      cursor: 'pointer',
                                      opacity: 0.9
                                    }}
                                    onClick={() => showEventDetails({ vehicle, events, day })}
                                  >
                                    {events.length > 1 && (
                                      <span style={{ 
                                        color: 'white', 
                                        fontSize: '0.8rem', 
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
                ))
              ) : (
                /* Single vehicle view - with more details */
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))',
                  gap: '3px'
                }}>
                  {calendarDays.map((day, index) => {
                    const events = getEventsForDay(selectedVehicle, day);
                    const hasEvents = events.length > 0;
                    
                    // Check if this is today
                    const isToday = isCurrentMonth && day === currentDay;
                    
                    return (
                      <div 
                        key={index}
                        style={{
                          minHeight: '120px',
                          border: isToday ? '2px solid #007bff' : '1px solid #dee2e6',
                          backgroundColor: day ? (isToday ? '#f0f8ff' : 'white') : '#f8f9fa',
                          padding: '5px',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {day && (
                          <>
                            <div style={{ 
                              fontSize: '0.9rem', 
                              fontWeight: isToday ? 'bold' : 'normal', 
                              textAlign: 'right', 
                              marginBottom: '5px' 
                            }}>
                              {day}
                            </div>
                            {hasEvents ? (
                              <div style={{ fontSize: '0.8rem' }}>
                                {events.map((event, idx) => (
                                  <div 
                                    key={idx}
                                    style={{ 
                                      padding: '4px 6px',
                                      backgroundColor: event.color,
                                      color: 'white',
                                      borderRadius: '3px',
                                      marginBottom: '4px',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      textShadow: '0px 0px 2px rgba(0,0,0,0.3)'
                                    }}
                                    onClick={() => showEventDetails({ 
                                      vehicle: vehicles.find(v => v.id === selectedVehicle), 
                                      events: [event], 
                                      day 
                                    })}
                                  >
                                    {event.type === 'assignment' 
                                      ? `Driver assigned`
                                      : `Blocked`
                                    }
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ 
                                height: '70px', 
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: '#adb5bd',
                                fontSize: '0.8rem'
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
              )}
            </div>
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
            <p><strong>Vehicle:</strong> {selectedEvent.vehicle.registration_number}</p>
            <p><strong>Date:</strong> {formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedEvent.day))}</p>
            
            <h4 style={{ marginTop: '15px', marginBottom: '10px' }}>Events</h4>
            {selectedEvent.events.map((event, idx) => (
              <div 
                key={idx}
                style={{ 
                  marginBottom: '10px',
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  borderLeft: `4px solid ${event.color}`,
                  borderRadius: '2px'
                }}
              >
                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                  {event.type === 'assignment' ? 'Vehicle Assignment' : 'Blocked Period'}
                </p>
                
                {event.type === 'assignment' && (
                  <>
                    <p style={{ margin: '0 0 5px 0' }}><strong>Type:</strong> {event.data.is_temporary ? 'Temporary' : 'Permanent'}</p>
                    <p style={{ margin: '0 0 5px 0' }}><strong>From:</strong> {formatDate(event.data.start_time)}</p>
                    <p style={{ margin: '0 0 5px 0' }}><strong>To:</strong> {event.data.end_time ? formatDate(event.data.end_time) : 'Ongoing'}</p>
                    <p style={{ margin: '0' }}><strong>Status:</strong> {event.data.status}</p>
                  </>
                )}
                
                {event.type === 'blocked' && (
                  <>
                    <p style={{ margin: '0 0 5px 0' }}><strong>From:</strong> {formatDate(event.data.start_date)}</p>
                    <p style={{ margin: '0 0 5px 0' }}><strong>To:</strong> {formatDate(event.data.end_date)}</p>
                    <p style={{ margin: '0 0 5px 0' }}><strong>Reason:</strong> {event.data.reason}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VehicleCalendar;