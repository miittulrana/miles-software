// admin-app/src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Initialize with values from .env file
const supabaseUrl = 'https://srhjbbtpedfsqmfrizzn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaGpiYnRwZWRmc3FtZnJpenpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDc5OTMsImV4cCI6MjA1NzYyMzk5M30.EPwvUaSrezYHRqUTuVbfYcVPQUanhs7Kh8RxzCydo5Q';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication helpers
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
};

export const getUserRole = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    
    // Get user details from the users table
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (error) throw error;
    return data?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

export const isAdmin = async () => {
  const role = await getUserRole();
  return role === 'admin';
};

// Subscribe to vehicle changes
export const subscribeToVehicleChanges = (callback) => {
  return supabase
    .channel('public:vehicles')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'vehicles' 
    }, callback)
    .subscribe();
};

// Subscribe to driver changes
export const subscribeToDriverChanges = (callback) => {
  return supabase
    .channel('public:users')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'users',
      filter: 'role=eq.driver'
    }, callback)
    .subscribe();
};

// Subscribe to vehicle assignments
export const subscribeToVehicleAssignments = (callback) => {
  return supabase
    .channel('public:vehicle_assignments')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'vehicle_assignments'
    }, callback)
    .subscribe();
};

// Subscribe to vehicle issues
export const subscribeToVehicleIssues = (callback) => {
  return supabase
    .channel('public:vehicle_issues')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'vehicle_issues'
    }, callback)
    .subscribe();
};

// Subscribe to vehicle locations
export const subscribeToVehicleLocations = (callback) => {
  return supabase
    .channel('public:vehicle_locations')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'vehicle_locations'
    }, callback)
    .subscribe();
};

// Vehicle status helpers
export const getVehicleStatusColor = (status) => {
  switch (status) {
    case 'available':
      return '#28a745'; // green
    case 'assigned':
      return '#007bff'; // blue
    case 'maintenance':
      return '#ffc107'; // yellow
    case 'inactive':
      return '#6c757d'; // grey
    default:
      return '#6c757d';
  }
};

export const getFormattedStatus = (status) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};