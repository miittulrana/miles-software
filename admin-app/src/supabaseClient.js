// admin-app/src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Supabase configuration 
const supabaseUrl = 'https://vtuxejdnmpdfisgdgbdd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0dXhlamRubXBkZmlzZ2RnYmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNzg1MjcsImV4cCI6MjA1NzY1NDUyN30.ebDSQ_KZG8skVPxFfcQVr1loX52DuYooBHRKx95sC8k';

// Create the standard client 
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Basic query function - simplified to maximum
export async function executeQuery(queryFn) {
  try {
    return await queryFn();
  } catch (error) {
    console.error('Query error:', error);
    return { data: null, error };
  }
}

// Helper to get current user 
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
};

// Helper to check if user is admin
export const isUserAdmin = async () => {
  try {
    const { data } = await supabase.auth.getUser();
    
    if (!data || !data.user) return false;
    
    // Simple direct query with no joins
    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('email', data.user.email)
      .single();
      
    if (error || !userData) return false;
    
    return userData.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};