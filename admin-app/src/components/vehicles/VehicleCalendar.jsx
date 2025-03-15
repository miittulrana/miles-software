// admin-app/src/components/vehicles/VehicleCalendar.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

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
    
    // Subscribe to realtime changes
    const assignmentsSubscription = supabase
      .channel('public:vehicle_assignments')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'vehicle_assignments' 
      }, () => fetchData())
      .subscribe();
      
    const blockedSubscription = supabase
      .channel('public:vehicle_blocked_periods')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'vehicle_blocked_periods' 
      }, () => fetchData())
      .subscribe();
    
    return () => {
      assignmentsSubscription.unsubscribe();
      blockedSubscription.unsubscribe();
    };
  }, [currentDate, selectedVehicle]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, registration_number, make, model, status');
      
      if (vehiclesError) throw vehiclesError;
      
      // Calculate month range for filtering
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      // Format dates for Supabase
      const startDate = startOfMonth.toISOString();
      const endDate = endOfMonth.toISOString();
      
      // Get vehicle assignments for the month
      let query = supabase
        .from('vehicle_assignments')
        .select(`
          id,
          vehicle_id,
          driver_id,
          start_time,
          end_time,
          is_temporary,
          status,
          created_by,
          users!vehicle_assignments_driver_id_fkey(id, full_name)
        `)
        .or(`start_time.lte.${endDate},end_time.gte.${startDate}`)
        .order('start_time', { ascending: true });
      
      // Filter by vehicle if selected
      if (selectedVehicle !== 'all') {
        query = query.eq('vehicle_id', selectedVehicle);
      }
      
      const { data: assignmentsData, error: assignmentsError } = await query;
      
      if (assignmentsError) throw assignmentsError;
      
      // Get blocked periods for the month
      let blockedQuery = supabase
        .from('vehicle_blocked_periods')
        .select(`
          id,
          vehicle_id,
          start_date,
          end_date,
          reason,
          created_by,
          created_at
        `)
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);
      
      // Filter by vehicle if selected
      if (selectedVehicle !== 'all') {
        blockedQuery = blockedQuery.eq('vehicle_id', selectedVehicle);
      }
      
      const { data: blockedData, error: blockedError } = await blockedQuery;
      
      if (blockedError) throw blockedError;
      
      setVehicles(vehiclesData || []);
      setAssignments(assignmentsData || []);
      setBlockedPeriods(blockedData || []);
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
    
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    
    const events = [];
    
    // Check assignments
    assignments.forEach(assignment => {
      if (assignment.vehicle_id === vehicleId) {
        const startDate = new Date(assignment.start_time);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(assignment.end_time || assignment.start_time);
        endDate.setHours(0, 0, 0, 0);
        
        if (date >= startDate && date <= endDate) {
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
        const startDate = new Date(block.start_date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(block.end_date);
        endDate.setHours(0, 0, 0, 0);
        
        if (date >= startDate && date <= endDate) {
          events.push({
            type: 'blocked',
            data: block,
            color: '#dc3545'
          });
        }
      }
    });
    
    return events;
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
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '5px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
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
              <div style={{ display: 'flex', marginBottom: '10px' }}>
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
            
            {/* Calendar header with weekdays */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '5px' }}>
              {weekdays.map((day, index) => (
                <div 
                  key={index}
                  style={{
                    padding: '5px',
                    backgroundColor: '#f8f9fa',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            {selectedVehicle === 'all' ? (
              // Display all vehicles in a list with their calendars
              vehicles.map(vehicle => (
                <div key={vehicle.id} style={{ marginBottom: '20px', borderTop: '1px solid #dee2e6', paddingTop: '10px' }}>
                  <h4 style={{ marginBottom: '10px' }}>{vehicle.registration_number} ({vehicle.make} {vehicle.model})</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                    {calendarDays.map((day, index) => {
                      const events = getEventsForDay(vehicle.id, day);
                      const hasEvents = events.length > 0;
                      
                      return (
                        <div 
                          key={index}
                          style={{
                            height: '40px',
                            border: '1px solid #dee2e6',
                            backgroundColor: day ? 'white' : '#f8f9fa',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative'
                          }}
                        >
                          {day && (
                            <>
                              <div style={{ padding: '2px 5px', fontSize: '0.8rem', textAlign: 'right' }}>
                                {day}
                              </div>
                              {hasEvents && (
                                <div 
                                  style={{
                                    position: 'absolute',
                                    top: '18px',
                                    left: '0',
                                    right: '0',
                                    bottom: '0',
                                    backgroundColor: events[0].color,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => showEventDetails({ vehicle, events, day })}
                                >
                                  {events.length > 1 && (
                                    <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 'bold' }}>
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
              // Display a single vehicle calendar with more details
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {calendarDays.map((day, index) => {
                  const events = getEventsForDay(selectedVehicle, day);
                  const hasEvents = events.length > 0;
                  
                  return (
                    <div 
                      key={index}
                      style={{
                        height: '100px',
                        border: '1px solid #dee2e6',
                        backgroundColor: day ? 'white' : '#f8f9fa',
                        padding: '5px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {day && (
                        <>
                          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'right', marginBottom: '5px' }}>
                            {day}
                          </div>
                          {hasEvents ? (
                            <div style={{ fontSize: '0.8rem' }}>
                              {events.map((event, idx) => (
                                <div 
                                  key={idx}
                                  style={{ 
                                    padding: '2px 5px',
                                    backgroundColor: event.color,
                                    color: 'white',
                                    borderRadius: '2px',
                                    marginBottom: '2px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                  onClick={() => showEventDetails({ 
                                    vehicle: vehicles.find(v => v.id === selectedVehicle), 
                                    events: [event], 
                                    day 
                                  })}
                                >
                                  {event.type === 'assignment' 
                                    ? `${event.data.users.full_name.split(' ')[0]}`
                                    : `Blocked: ${event.data.reason.substring(0, 10)}...`
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
                    <p style={{ margin: '0 0 5px 0' }}><strong>Driver:</strong> {event.data.users.full_name}</p>
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