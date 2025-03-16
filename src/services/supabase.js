// src/services/supabase.js
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-url-polyfill/auto';

// Get Supabase URL and key from .env file or use hard-coded values
const supabaseUrl = 'https://vtuxejdnmpdfisgdgbdd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0dXhlamRubXBkZmlzZ2RnYmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNzg1MjcsImV4cCI6MjA1NzY1NDUyN30.ebDSQ_KZG8skVPxFfcQVr1loX52DuYooBHRKx95sC8k';

// Create custom storage for Supabase to use SecureStore
const ExpoSecureStoreAdapter = {
  getItem: (key) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key, value) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key) => {
    SecureStore.deleteItemAsync(key);
  },
};

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper functions for common operations
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error('Error getting current user:', error.message);
    return null;
  }
};

export const getUserProfile = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting user profile:', error.message);
    return null;
  }
};

export const getAssignedVehicle = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    // Get permanently assigned vehicle
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('assigned_driver_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // If no permanent vehicle is found, check for temporary assignments
    if (!data) {
      const now = new Date().toISOString();
      const { data: tempAssignment, error: tempError } = await supabase
        .from('vehicle_assignments')
        .select('*, vehicles(*)')
        .eq('driver_id', user.id)
        .eq('status', 'approved')
        .lte('start_time', now)
        .or(`end_time.gt.${now},end_time.is.null`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (tempError) throw tempError;
      
      if (tempAssignment && tempAssignment.length > 0) {
        return {
          ...tempAssignment[0].vehicles,
          is_temporary: true,
          assignment_id: tempAssignment[0].id,
          start_time: tempAssignment[0].start_time,
          end_time: tempAssignment[0].end_time
        };
      }
      
      return null;
    }
    
    return { ...data, is_temporary: false };
  } catch (error) {
    console.error('Error getting assigned vehicle:', error.message);
    return null;
  }
};

export default supabase;