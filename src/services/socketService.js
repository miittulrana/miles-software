// src/services/socketService.js
import { io } from 'socket.io-client';
import { supabase } from './supabase';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { Platform } from 'react-native';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.locationSubscription = null;
    this.serverUrl = 'http://localhost:3001'; // Change this to your server URL when deploying
    this.trackingActive = false;
    this.lastKnownLocation = null;
    this.isAuthenticated = false;
    this.user = null;
    this.vehicle = null;
    
    // Check connectivity every 30 seconds
    this.connectivityInterval = null;
  }

  // Initialize socket connection
  async connect() {
    if (this.socket) {
      return;
    }

    console.log('Attempting to connect to socket server');

    try {
      // Check for user session
      const { data: authData } = await supabase.auth.getSession();
      if (!authData?.session) {
        console.log('No active session found');
        return false;
      }

      // Create socket instance
      this.socket = io(this.serverUrl, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        transports: ['websocket']
      });

      // Setup event handlers
      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.isConnected = true;
        this._notifyListeners('connection_change', { connected: true });
        
        // Authenticate after connection
        this._authenticateSocket(authData.session.access_token);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        this.isConnected = false;
        this.isAuthenticated = false;
        this._notifyListeners('connection_change', { connected: false, reason });
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        this._notifyListeners('connection_error', { error });
      });

      // Socket authentication response handlers
      this.socket.on('authenticated', (data) => {
        console.log('Socket authenticated successfully', data);
        this.isAuthenticated = true;
        this.user = data.driver;
        this.vehicle = data.vehicle;
        this._notifyListeners('authenticated', data);
        
        // Start location tracking if not already active
        if (!this.trackingActive) {
          this.startLocationTracking();
        }
      });

      this.socket.on('auth_error', (error) => {
        console.error('Socket authentication error:', error);
        this.isAuthenticated = false;
        this._notifyListeners('auth_error', error);
      });

      // Setup connectivity check interval
      this.connectivityInterval = setInterval(() => {
        if (!this.isConnected && this.socket) {
          console.log('Connectivity check: reconnecting...');
          this.socket.connect();
        }
      }, 30000);

      return true;
    } catch (error) {
      console.error('Error initializing socket connection:', error);
      return false;
    }
  }

  // Authenticate with the socket server
  async _authenticateSocket(token) {
    if (!this.socket || !this.isConnected) return false;
    
    console.log('Authenticating socket connection');
    this.socket.emit('authenticate', { token });
    return true;
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.stopLocationTracking();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isAuthenticated = false;
    }
    
    if (this.connectivityInterval) {
      clearInterval(this.connectivityInterval);
      this.connectivityInterval = null;
    }
  }

  // Start tracking location
  async startLocationTracking() {
    if (this.locationSubscription) {
      return; // Already tracking
    }
    
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Location permission denied');
        this._notifyListeners('location_error', { message: 'Location permission denied' });
        return false;
      }
      
      // Request background location permission on Android
      if (Platform.OS === 'android') {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
          console.warn('Background location permission denied');
        }
      }
      
      // Configure location tracking settings
      await Location.enableNetworkProviderAsync();
      
      // Start location updates subscription
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // minimum change (in meters) to receive updates
          timeInterval: 5000,   // minimum time to wait between updates
        },
        this._handleLocationUpdate.bind(this)
      );
      
      this.trackingActive = true;
      console.log('Location tracking started');
      this._notifyListeners('tracking_status', { active: true });
      
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      this._notifyListeners('location_error', { 
        message: 'Failed to start location tracking', 
        details: error.message 
      });
      return false;
    }
  }
  
  // Handle incoming location updates
  async _handleLocationUpdate(location) {
    try {
      if (!this.socket || !this.isConnected || !this.isAuthenticated) {
        // Store last location even if not connected
        this.lastKnownLocation = location;
        return;
      }
      
      // Get battery level
      const batteryLevel = await Battery.getBatteryLevelAsync();
      
      // Calculate if moving based on speed
      const isMoving = location.coords.speed > 1; // speed > 1 m/s (3.6 km/h)
      
      // Prepare location data
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        heading: location.coords.heading || 0,
        speed: location.coords.speed * 3.6, // Convert m/s to km/h
        accuracy: location.coords.accuracy,
        is_moving: isMoving,
        battery_level: Math.round(batteryLevel * 100),
        timestamp: new Date().toISOString()
      };
      
      // Send location update
      this.socket.emit('location_update', locationData);
      
      // Update last known location
      this.lastKnownLocation = location;
      
      // Notify listeners
      this._notifyListeners('location_update', locationData);
      
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }
  
  // Stop tracking location
  stopLocationTracking() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
      this.trackingActive = false;
      console.log('Location tracking stopped');
      this._notifyListeners('tracking_status', { active: false });
    }
  }

  // Send driver status update
  sendStatusUpdate(status) {
    if (!this.socket || !this.isConnected || !this.isAuthenticated) {
      return false;
    }
    
    this.socket.emit('driver_status', status);
    return true;
  }

  // Add event listener
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  // Remove event listener
  removeEventListener(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  // Notify all listeners of an event
  _notifyListeners(event, data) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in ${event} listener:`, err);
      }
    });
  }

  // Check connection status
  isSocketConnected() {
    return this.isConnected && this.isAuthenticated;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;