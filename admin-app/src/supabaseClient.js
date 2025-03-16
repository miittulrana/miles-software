// admin-app/src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// FIXED: Using the correct Supabase URL and API key
const supabaseUrl = 'https://vtuxejdnmpdfisgdgbdd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0dXhlamRubXBkZmlzZ2RnYmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNzg1MjcsImV4cCI6MjA1NzY1NDUyN30.ebDSQ_KZG8skVPxFfcQVr1loX52DuYooBHRKx95sC8k';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Helper to check if Supabase is reachable
export const testConnection = async () => {
  try {
    // Try to make a simple request to Supabase
    const { data, error } = await supabase.from('vehicles').select('count', { count: 'exact', head: true });
    return { success: !error, error };
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return { 
      success: false, 
      error: error.message || 'Connection test failed'
    };
  }
};

// Helper to get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
};

// Helper to check if user is admin
export const isUserAdmin = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;
    
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single();
      
    if (error || !data) return false;
    
    return data.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};