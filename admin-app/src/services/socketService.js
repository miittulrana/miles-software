// admin-app/src/services/socketService.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    // Set to localhost for development - this is a key issue
    // Change this URL to match your actual socket server
    this.serverUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3001'  // Local development
      : 'http://localhost:3001'; // Replace with your production URL when deploying
  }

  // Initialize socket connection
  connect() {
    if (this.socket) {
      return;
    }

    console.log("Attempting to connect to socket server at:", this.serverUrl);

    // Create socket instance with improved connection settings
    this.socket = io(this.serverUrl, {
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000, // Increased timeout
      transports: ['websocket', 'polling']
    });

    // Setup event handlers
    this.socket.on('connect', () => {
      console.log('Socket connected to tracking server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Notify any registered connection listeners
      this._notifyListeners('connection_change', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      
      // Notify any registered connection listeners
      this._notifyListeners('connection_change', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.reconnectAttempts += 1;
      
      // Notify any registered error listeners
      this._notifyListeners('connection_error', { error, attempts: this.reconnectAttempts });
      
      // If max reconnect attempts reached, stop trying
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Maximum reconnection attempts reached. Stopping reconnection attempts.');
        this.socket.disconnect();
        this._notifyListeners('max_reconnect_attempts', {});
      }
    });

    // Handle vehicle location updates
    this.socket.on('vehicle_location', (locationData) => {
      this._notifyListeners('vehicle_location', locationData);
    });

    // Handle vehicle status changes (online/offline)
    this.socket.on('vehicle_status_change', (statusData) => {
      this._notifyListeners('vehicle_status_change', statusData);
    });

    // Handle vehicle status updates (moving, idle, etc)
    this.socket.on('vehicle_status', (statusData) => {
      this._notifyListeners('vehicle_status', statusData);
    });
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
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
    return this.isConnected;
  }

  // Manual reconnection attempt
  reconnect() {
    console.log("Manually attempting to reconnect to socket server");
    this.reconnectAttempts = 0;
    this.disconnect();
    this.connect();
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;