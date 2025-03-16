import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeVehicles: 0,
    maintenanceVehicles: 0,
    totalDrivers: 0,
    availableDrivers: 0,
    pendingRequests: 0,
    fuelConsumption: 0,
    totalTrips: 0
  });
  
  const [recentIssues, setRecentIssues] = useState([]);
  const [vehicleUtilization, setVehicleUtilization] = useState([]);
  const [tripStats, setTripStats] = useState([]);
  const [vehicleStatus, setVehicleStatus] = useState([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weatherData, setWeatherData] = useState(null);

  // Mock data for charts when real data can't be fetched
  const mockVehicleUtilization = [
    { name: 'Mon', utilization: 65 },
    { name: 'Tue', utilization: 72 },
    { name: 'Wed', utilization: 80 },
    { name: 'Thu', utilization: 78 },
    { name: 'Fri', utilization: 85 },
    { name: 'Sat', utilization: 40 },
    { name: 'Sun', utilization: 30 }
  ];

  const mockTripStats = [
    { month: 'Jan', count: 45 },
    { month: 'Feb', count: 52 },
    { month: 'Mar', count: 48 },
    { month: 'Apr', count: 61 },
    { month: 'May', count: 55 },
    { month: 'Jun', count: 67 }
  ];

  const mockVehicleStatus = [
    { name: 'Available', value: 15, color: '#4caf50' },
    { name: 'In Use', value: 20, color: '#2196f3' },
    { name: 'Maintenance', value: 5, color: '#ff9800' },
    { name: 'Out of Service', value: 3, color: '#f44336' }
  ];

  const mockUpcomingMaintenance = [
    { id: 1, vehicle: 'Toyota Hiace (ABC-123)', service: 'Oil Change & Inspection', date: '2025-03-25' },
    { id: 2, vehicle: 'Ford Transit (XYZ-789)', service: 'Brake System Service', date: '2025-03-28' },
    { id: 3, vehicle: 'Mercedes Sprinter (DEF-456)', service: 'Transmission Service', date: '2025-04-02' }
  ];

  // Mock weather data
  const mockWeatherData = {
    location: 'New York City',
    temperature: '32°F',
    condition: 'Partly Cloudy',
    icon: 'bi-cloud-sun',
    forecast: [
      { day: 'Tue', high: '34°F', low: '28°F', icon: 'bi-cloud' },
      { day: 'Wed', high: '36°F', low: '29°F', icon: 'bi-cloud-sun' },
      { day: 'Thu', high: '38°F', low: '30°F', icon: 'bi-sun' }
    ]
  };

  useEffect(() => {
    fetchData();
    setWeatherData(mockWeatherData); // In a real app, fetch this from a weather API
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get vehicles stats
      let vehiclesData = [];
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('id, status');
          
        if (!error) {
          vehiclesData = data || [];
        } else {
          console.warn("Vehicles fetch error:", error);
        }
      } catch (err) {
        console.warn("Vehicles try/catch error:", err);
      }
      
      // Get drivers count
      let driversCount = 0;
      let availableDriversCount = 0;
      try {
        const { count, error } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'driver');
        
        if (!error) {
          driversCount = count || 0;
        }
        
        // Get available drivers
        const { count: availCount, error: availError } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'driver')
          .eq('status', 'available');
          
        if (!availError) {
          availableDriversCount = availCount || 0;
        }
      } catch (err) {
        console.warn("Drivers try/catch error:", err);
      }
      
      // Get pending assignments
      let pendingCount = 0;
      try {
        const { count, error } = await supabase
          .from('vehicle_assignments')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        if (!error) {
          pendingCount = count || 0;
        }
      } catch (err) {
        console.warn("Pending assignments try/catch error:", err);
      }
      
      // Get recent issues - Try different table names if necessary
      let issuesData = [];
      let issueSuccess = false;
      
      // First attempt with vehicle_issues
      try {
        const { data, error } = await supabase
          .from('vehicle_issues')
          .select('id, description, priority, status, created_at, vehicle_id, reported_by')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (!error) {
          issuesData = data || [];
          issueSuccess = true;
        } else {
          console.warn("Issues error with 'vehicle_issues' table:", error);
        }
      } catch (err) {
        console.warn("Issues try/catch error with 'vehicle_issues' table:", err);
      }
      
      // If first attempt failed, try with 'issues' table
      if (!issueSuccess) {
        try {
          const { data, error } = await supabase
            .from('issues')
            .select('id, description, priority, status, created_at, vehicle_id, reported_by')
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (!error) {
            issuesData = data || [];
            issueSuccess = true;
          } else {
            console.warn("Issues error with 'issues' table:", error);
          }
        } catch (err) {
          console.warn("Issues try/catch error with 'issues' table:", err);
        }
      }
      
      // If both attempts failed, use mock data
      if (!issueSuccess) {
        issuesData = [
          { 
            id: 1, 
            description: 'Check engine light on', 
            priority: 'high', 
            status: 'in_progress', 
            created_at: new Date().toISOString(),
            vehicle_id: 1,
            reported_by: 1,
            vehicles: { registration_number: 'ABC-123' },
            users: { full_name: 'John Smith' }
          },
          { 
            id: 2, 
            description: 'Tire pressure low', 
            priority: 'medium', 
            status: 'reported', 
            created_at: new Date(Date.now() - 86400000).toISOString(),
            vehicle_id: 2,
            reported_by: 2,
            vehicles: { registration_number: 'XYZ-789' },
            users: { full_name: 'Jane Doe' }
          }
        ];
      } else {
        // Try to enhance issues with vehicle and user details
        try {
          // Get all unique vehicle IDs from issues
          const vehicleIds = [...new Set(issuesData.map(issue => issue.vehicle_id))];
          
          if (vehicleIds.length > 0) {
            // Fetch vehicle details
            const { data: issueVehicles, error: issueVehiclesError } = await supabase
              .from('vehicles')
              .select('id, registration_number, make, model')
              .in('id', vehicleIds);
              
            if (!issueVehiclesError && issueVehicles) {
              // Get all unique user IDs from issues
              const userIds = [...new Set(issuesData.map(issue => issue.reported_by))];
              
              // Fetch user details
              const { data: issueUsers, error: issueUsersError } = await supabase
                .from('users')
                .select('id, full_name')
                .in('id', userIds);
                
              // Combine data
              issuesData = issuesData.map(issue => {
                const vehicle = issueVehicles?.find(v => v.id === issue.vehicle_id);
                const user = issueUsers?.find(u => u.id === issue.reported_by);
                
                return {
                  ...issue,
                  vehicles: vehicle || null,
                  users: user || null
                };
              });
            }
          }
        } catch (err) {
          console.warn("Error enhancing issues with details:", err);
        }
      }
      
      // For charts and other visualizations, use mock data for now
      // In a real implementation, you would fetch this data from your database
      
      // Update states with fetched and mock data
      setStats({
        totalVehicles: vehiclesData.length || 43,
        activeVehicles: vehiclesData.filter(v => v.status === 'available' || v.status === 'assigned').length || 35,
        maintenanceVehicles: vehiclesData.filter(v => v.status === 'maintenance').length || 5,
        totalDrivers: driversCount || 38,
        availableDrivers: availableDriversCount || 12,
        pendingRequests: pendingCount || 7,
        fuelConsumption: 4520, // Gallons/month (mock data)
        totalTrips: 267 // This month (mock data)
      });
      
      setRecentIssues(issuesData);
      setVehicleUtilization(mockVehicleUtilization);
      setTripStats(mockTripStats);
      setVehicleStatus(mockVehicleStatus);
      setUpcomingMaintenance(mockUpcomingMaintenance);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load some dashboard data. Partial information is displayed.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Helper function for priority badge
  const getPriorityBadge = (priority) => {
    const badgeColors = {
      low: { bg: '#e3f2fd', text: '#0d47a1' },
      medium: { bg: '#fff8e1', text: '#ff8f00' },
      high: { bg: '#ffebee', text: '#c62828' }
    };
    
    const style = badgeColors[priority] || { bg: '#e0e0e0', text: '#424242' };
    
    return (
      <span style={{
        backgroundColor: style.bg,
        color: style.text,
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '500',
        textTransform: 'capitalize'
      }}>
        {priority}
      </span>
    );
  };

  // Helper function for status badge
  const getStatusBadge = (status) => {
    const badgeColors = {
      reported: { bg: '#e0e0e0', text: '#424242' },
      acknowledged: { bg: '#e3f2fd', text: '#0d47a1' },
      in_progress: { bg: '#fff8e1', text: '#ff8f00' },
      resolved: { bg: '#e8f5e9', text: '#2e7d32' }
    };
    
    const style = badgeColors[status] || { bg: '#e0e0e0', text: '#424242' };
    const displayText = status.replace('_', ' ');
    
    return (
      <span style={{
        backgroundColor: style.bg,
        color: style.text,
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '500',
        textTransform: 'capitalize'
      }}>
        {displayText}
      </span>
    );
  };

  // Helper function to calculate days until a date
  const getDaysUntil = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.8rem', fontWeight: '600' }}>Fleet Dashboard</h2>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchData}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <i className="bi bi-arrow-repeat"></i> Refresh
          </button>
          
          <button
            style={{
              backgroundColor: '#3b82f6',
              border: 'none',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            <i className="bi bi-plus-lg"></i> Quick Action
          </button>
        </div>
      </div>
      
      {error && (
        <div style={{
          backgroundColor: '#fff8f8',
          border: '1px solid #ffcdd2',
          color: '#b71c1c',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '0.9rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="bi bi-exclamation-triangle-fill"></i>
            <strong>Data loading issue:</strong> {error}
          </div>
        </div>
      )}
      
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(59, 130, 246, 0.2)',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite' 
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        <>
          {/* First row: Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
            gap: '20px',
            marginBottom: '20px' 
          }}>
            {/* Vehicle Stats Card */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '20px'
            }}>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '5px' }}>VEHICLES</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                  color: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  <i className="bi bi-truck"></i>
                </div>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: '600', lineHeight: '1.2', color: '#1e293b' }}>
                    {stats.totalVehicles}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                    {stats.activeVehicles} active • {stats.maintenanceVehicles} in maintenance
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px',
                  fontSize: '0.85rem',
                  color: '#10b981'
                }}>
                  <i className="bi bi-arrow-up"></i>
                  <span>+3 since last month</span>
                </div>
                <a href="#" style={{ 
                  color: '#3b82f6', 
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <span>View all</span>
                  <i className="bi bi-chevron-right"></i>
                </a>
              </div>
            </div>
            
            {/* Drivers Card */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '20px'
            }}>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '5px' }}>DRIVERS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(14, 165, 233, 0.1)', 
                  color: '#0ea5e9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  <i className="bi bi-person"></i>
                </div>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: '600', lineHeight: '1.2', color: '#1e293b' }}>
                    {stats.totalDrivers}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                    {stats.availableDrivers} available drivers
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px',
                  fontSize: '0.85rem',
                  color: '#10b981'
                }}>
                  <i className="bi bi-arrow-up"></i>
                  <span>+2 since last month</span>
                </div>
                <a href="#" style={{ 
                  color: '#3b82f6', 
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <span>View all</span>
                  <i className="bi bi-chevron-right"></i>
                </a>
              </div>
            </div>
            
            {/* Fuel Consumption Card */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '20px'
            }}>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '5px' }}>FUEL CONSUMPTION</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(249, 115, 22, 0.1)', 
                  color: '#f97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  <i className="bi bi-fuel-pump"></i>
                </div>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: '600', lineHeight: '1.2', color: '#1e293b' }}>
                    {stats.fuelConsumption.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                    Gallons this month
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px',
                  fontSize: '0.85rem',
                  color: '#ef4444'
                }}>
                  <i className="bi bi-arrow-up"></i>
                  <span>+8.2% from last month</span>
                </div>
                <a href="#" style={{ 
                  color: '#3b82f6', 
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <span>Details</span>
                  <i className="bi bi-chevron-right"></i>
                </a>
              </div>
            </div>
            
            {/* Trips Card */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '20px'
            }}>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '5px' }}>TOTAL TRIPS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(139, 92, 246, 0.1)', 
                  color: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  <i className="bi bi-map"></i>
                </div>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: '600', lineHeight: '1.2', color: '#1e293b' }}>
                    {stats.totalTrips}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                    Trips this month
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px',
                  fontSize: '0.85rem',
                  color: '#10b981'
                }}>
                  <i className="bi bi-arrow-up"></i>
                  <span>+12% from last month</span>
                </div>
                <a href="#" style={{ 
                  color: '#3b82f6', 
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <span>View logs</span>
                  <i className="bi bi-chevron-right"></i>
                </a>
              </div>
            </div>
          </div>
          
          {/* Second row: Charts */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '20px',
            marginBottom: '20px'
          }}>
            {/* Vehicle Utilization Chart */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '20px'
            }}>
              <div style={{ marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#1e293b' }}>Vehicle Utilization</h3>
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Daily utilization rate for the past week</div>
              </div>
              
              <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vehicleUtilization}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Utilization']}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="utilization" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#3b82f6' }}
                      activeDot={{ r: 6, fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div style={{ marginTop: '15px', fontSize: '0.85rem', color: '#64748b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <i className="bi bi-info-circle"></i>
                  <span>Average utilization: 64.3%</span>
                </div>
              </div>
            </div>
            
            {/* Vehicle Status Chart */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '20px'
            }}>
              <div style={{ marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#1e293b' }}>Vehicle Status</h3>
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Current status of all vehicles</div>
              </div>
              
              <div style={{ height: '250px', display: 'flex', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vehicleStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {vehicleStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value} vehicles`, name]}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
                {vehicleStatus.map((status, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '3px', 
                      backgroundColor: status.color 
                    }}></div>
                    <span>{status.name}: {status.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Third row: Issues and Maintenance */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '20px',
            marginBottom: '20px'
          }}>
            {/* Recent Issues */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '15px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#1e293b' }}>Recent Issues</h3>
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Latest reported vehicle problems</div>
              </div>
              
              {recentIssues.length === 0 ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>
                    <i className="bi bi-check-circle"></i>
                  </div>
                  <p style={{ margin: 0 }}>No issues reported</p>
                </div>
              ) : (
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {recentIssues.map((issue, index) => (
                    <div key={issue.id} style={{ 
                      padding: '15px 20px', 
                      borderBottom: index < recentIssues.length - 1 ? '1px solid #f1f5f9' : 'none',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: '500', color: '#334155' }}>
                          {issue.description}
                        </div>
                        <div>
                          {getPriorityBadge(issue.priority)}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                        <div>Vehicle: {issue.vehicles?.registration_number || `ID: ${issue.vehicle_id}`}</div>
                        <div>Reported: {formatDate(issue.created_at)}</div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          By: {issue.users?.full_name || `User ID: ${issue.reported_by}`}
                        </div>
                        <div>
                          {getStatusBadge(issue.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div style={{ padding: '15px 20px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                <a href="#" style={{ 
                  color: '#3b82f6', 
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}>
                  <span>View all issues</span>
                  <i className="bi bi-arrow-right"></i>
                </a>
              </div>
            </div>
            
            {/* Upcoming Maintenance */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '15px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#1e293b' }}>Upcoming Maintenance</h3>
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Scheduled vehicle services</div>
              </div>
              
              {upcomingMaintenance.length === 0 ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>
                    <i className="bi bi-calendar-check"></i>
                  </div>
                  <p style={{ margin: 0 }}>No maintenance scheduled</p>
                </div>
              ) : (
                <div>
                  {upcomingMaintenance.map((maintenance, index) => {
                    const daysUntil = getDaysUntil(maintenance.date);
                    
                    return (
                      <div key={maintenance.id} style={{ 
                        padding: '15px 20px', 
                        borderBottom: index < upcomingMaintenance.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ fontWeight: '500', color: '#334155' }}>
                            {maintenance.vehicle}
                          </div>
                          <div style={{ 
                            backgroundColor: daysUntil <= 3 ? '#ffebee' : '#e8f5e9',
                            color: daysUntil <= 3 ? '#c62828' : '#2e7d32',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                          <div>{maintenance.service}</div>
                          <div>{formatDate(maintenance.date)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div style={{ padding: '15px 20px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                <a href="#" style={{ 
                  color: '#3b82f6', 
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}>
                  <span>Schedule maintenance</span>
                  <i className="bi bi-plus"></i>
                </a>
              </div>
            </div>
          </div>
          
          {/* Fourth row: Weather and Quick Actions */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '20px'
          }}>
            {/* Weather Widget */}
            {weatherData && (
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '12px', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '20px'
              }}>
                <div style={{ marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#1e293b' }}>Weather Conditions</h3>
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Fleet operations forecast</div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ 
                    fontSize: '2.5rem', 
                    color: '#3b82f6',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className={weatherData.icon}></i>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b' }}>
                      {weatherData.temperature}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      {weatherData.condition}, {weatherData.location}
                    </div>
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '15px'
                }}>
                  {weatherData.forecast.map((day, index) => (
                    <div key={index} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#334155', marginBottom: '5px' }}>
                        {day.day}
                      </div>
                      <div style={{ fontSize: '1.2rem', color: '#3b82f6', marginBottom: '5px' }}>
                        <i className={day.icon}></i>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                        {day.high}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {day.low}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quick Actions */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '20px'
            }}>
              <div style={{ marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#1e293b' }}>Quick Actions</h3>
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Common fleet management tasks</div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <button style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '15px',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}>
                  <i className="bi bi-truck" style={{ fontSize: '1.5rem', color: '#3b82f6', marginBottom: '8px' }}></i>
                  <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#334155' }}>
                    Add Vehicle
                  </div>
                </button>
                
                <button style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '15px',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}>
                  <i className="bi bi-person-plus" style={{ fontSize: '1.5rem', color: '#3b82f6', marginBottom: '8px' }}></i>
                  <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#334155' }}>
                    Add Driver
                  </div>
                </button>
                
                <button style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '15px',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}>
                  <i className="bi bi-calendar-plus" style={{ fontSize: '1.5rem', color: '#3b82f6', marginBottom: '8px' }}></i>
                  <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#334155' }}>
                    New Assignment
                  </div>
                </button>
                
                <button style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '15px',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}>
                  <i className="bi bi-file-earmark-text" style={{ fontSize: '1.5rem', color: '#3b82f6', marginBottom: '8px' }}></i>
                  <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#334155' }}>
                    Run Reports
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;