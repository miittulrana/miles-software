// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase, getUserProfile, getAssignedVehicle } from '../services/supabase';
import socketService from '../services/socketService';
import * as SecureStore from 'expo-secure-store';

// Create context
export const AuthContext = createContext({
  user: null,
  profile: null,
  vehicle: null,
  session: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  checkSession: async () => {},
  refreshProfile: async () => {},
  refreshVehicle: async () => {},
});

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for an existing session on load
  useEffect(() => {
    checkSession();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        setSession(newSession);
        setUser(newSession?.user || null);

        if (event === 'SIGNED_IN') {
          // Get user profile and vehicle when signed in
          await loadUserData(newSession?.user);
          
          // Connect socket when signed in
          await socketService.connect();
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setVehicle(null);
          
          // Disconnect socket when signed out
          // Note: we don't disconnect for location tracking to continue
          // socketService.disconnect();
        }
      }
    );

    // Clean up listener
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Load user profile and vehicle
  const loadUserData = async (currentUser) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Get user profile
      const userProfile = await getUserProfile();
      setProfile(userProfile);
      
      // Get assigned vehicle
      const assignedVehicle = await getAssignedVehicle();
      setVehicle(assignedVehicle);

      await SecureStore.setItemAsync('userRole', userProfile?.role || 'user');
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check existing session
  const checkSession = async () => {
    try {
      setLoading(true);
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      if (currentSession?.user) {
        await loadUserData(currentSession.user);
        
        // Start socket connection
        const connected = await socketService.connect();
        console.log('Socket connected:', connected);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sign in
  const signIn = async (email, password, rememberMe = true) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Save remember me setting
      if (rememberMe) {
        await SecureStore.setItemAsync('rememberMe', 'true');
      } else {
        await SecureStore.deleteItemAsync('rememberMe');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error signing in:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Don't disconnect socket to maintain location tracking
      // but we do need to handle the auth state change
      
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Refresh user profile
  const refreshProfile = async () => {
    try {
      const userProfile = await getUserProfile();
      setProfile(userProfile);
      return userProfile;
    } catch (error) {
      console.error('Error refreshing profile:', error);
      return null;
    }
  };

  // Refresh vehicle information
  const refreshVehicle = async () => {
    try {
      const assignedVehicle = await getAssignedVehicle();
      setVehicle(assignedVehicle);
      return assignedVehicle;
    } catch (error) {
      console.error('Error refreshing vehicle:', error);
      return null;
    }
  };

  // Context value
  const value = {
    user,
    profile,
    vehicle,
    session,
    loading,
    signIn,
    signOut,
    checkSession,
    refreshProfile,
    refreshVehicle,
  };

  // Provide context
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;