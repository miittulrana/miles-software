// server/src/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with CORS settings
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your admin app URL
    methods: ["GET", "POST"]
  }
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Store active connections by vehicle ID
const activeVehicles = new Map();

// Log vehicle status 
const logVehicleStatus = async (locationData) => {
  try {
    // Insert location data into vehicle_locations table
    const { error } = await supabase
      .from('vehicle_locations')
      .insert({
        vehicle_id: locationData.vehicle_id,
        driver_id: locationData.driver_id,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        heading: locationData.heading || 0,
        speed: locationData.speed || 0,
        is_moving: locationData.is_moving || false,
        battery_level: locationData.battery_level,
        accuracy: locationData.accuracy,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('Error logging vehicle location:', error);
    }
  } catch (err) {
    console.error('Failed to log vehicle status:', err);
  }
};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  let vehicleId = null;
  let driverId = null;

  // Handle driver authentication
  socket.on('authenticate', async (data) => {
    try {
      // Verify JWT from Supabase
      const { data: userData, error } = await supabase.auth.getUser(data.token);
      
      if (error || !userData) {
        socket.emit('auth_error', { message: 'Authentication failed' });
        return;
      }

      // Get driver information from users table
      const { data: driverData, error: driverError } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('id', userData.user.id)
        .single();

      if (driverError || !driverData || driverData.role !== 'driver') {
        socket.emit('auth_error', { message: 'Not authorized as driver' });
        return;
      }

      // Get assigned vehicle for this driver
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, registration_number, make, model')
        .eq('assigned_driver_id', driverData.id)
        .single();

      if (vehicleError || !vehicleData) {
        socket.emit('auth_error', { message: 'No vehicle assigned to this driver' });
        return;
      }

      // Store vehicle and driver IDs
      vehicleId = vehicleData.id;
      driverId = driverData.id;

      // Add to active vehicles
      activeVehicles.set(vehicleId, {
        socketId: socket.id,
        vehicleInfo: vehicleData,
        driverInfo: driverData,
        lastUpdate: new Date()
      });

      // Send success response
      socket.emit('authenticated', { 
        vehicle: vehicleData,
        driver: driverData
      });

      // Notify all clients about new active vehicle
      io.emit('vehicle_status_change', {
        vehicleId,
        status: 'online',
        vehicle: vehicleData,
        driver: driverData
      });

      console.log(`Driver ${driverData.full_name} authenticated with vehicle ${vehicleData.registration_number}`);
    } catch (err) {
      console.error('Authentication error:', err);
      socket.emit('auth_error', { message: 'Server error during authentication' });
    }
  });

  // Handle location updates from driver app
  socket.on('location_update', async (locationData) => {
    try {
      // Validate location data
      if (!vehicleId || !driverId || 
          !locationData.latitude || !locationData.longitude) {
        return;
      }

      // Prepare full location data
      const fullLocationData = {
        ...locationData,
        vehicle_id: vehicleId,
        driver_id: driverId,
        timestamp: new Date().toISOString()
      };

      // Update last seen time
      if (activeVehicles.has(vehicleId)) {
        activeVehicles.get(vehicleId).lastUpdate = new Date();
      }

      // Broadcast to all admin clients
      io.emit('vehicle_location', fullLocationData);

      // Log to database (throttled to avoid excessive writes)
      // Only log every 10 seconds or if significant movement detected
      logVehicleStatus(fullLocationData);
    } catch (err) {
      console.error('Error processing location update:', err);
    }
  });

  // Handle driver status updates
  socket.on('driver_status', (statusData) => {
    if (!vehicleId) return;
    
    // Update vehicle status and broadcast to admin clients
    io.emit('vehicle_status', {
      vehicleId,
      ...statusData
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // If this was a vehicle, mark it as offline
    if (vehicleId) {
      activeVehicles.delete(vehicleId);
      
      // Notify all clients about offline vehicle
      io.emit('vehicle_status_change', {
        vehicleId,
        status: 'offline'
      });
    }
  });
});

// Periodic cleanup of inactive vehicles (if no updates for 2 minutes)
setInterval(() => {
  const now = new Date();
  
  for (const [vehicleId, data] of activeVehicles.entries()) {
    const timeDiff = now - data.lastUpdate;
    
    // If no updates for 2 minutes, mark as inactive
    if (timeDiff > 2 * 60 * 1000) {
      activeVehicles.delete(vehicleId);
      
      // Notify all clients
      io.emit('vehicle_status_change', {
        vehicleId,
        status: 'offline'
      });
    }
  }
}, 30000); // Run every 30 seconds

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeVehicles: activeVehicles.size,
    timestamp: new Date().toISOString()
  });
});

// Get active vehicles endpoint
app.get('/active-vehicles', (req, res) => {
  const vehicles = Array.from(activeVehicles.entries()).map(([id, data]) => ({
    id,
    registration: data.vehicleInfo.registration_number,
    make: data.vehicleInfo.make,
    model: data.vehicleInfo.model,
    driver: data.driverInfo.full_name,
    lastUpdate: data.lastUpdate
  }));
  
  res.json(vehicles);
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Vehicle tracking server running on port ${PORT}`);
});