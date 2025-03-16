// admin-app/src/services/mapService.js
import L from 'leaflet';

class MapService {
  constructor() {
    this.map = null;
    this.markers = new Map(); // vehicle ID -> marker
    this.vehicleColors = new Map(); // vehicle ID -> color
    this.colorPalette = [
      '#3498db', '#2ecc71', '#e74c3c', '#9b59b6', '#f1c40f', 
      '#1abc9c', '#e67e22', '#34495e'
    ];
    this.colorIndex = 0;
    this.selectedVehicleId = null;
    this.isInitialized = false;
    this.onVehicleClickCallbacks = [];
    
    // Malta center coordinates
    this.maltaCenter = [35.937496, 14.375416];
  }

  // Initialize the map in the provided container
  initializeMap(container, options = {}) {
    if (this.isInitialized) {
      console.log("Map already initialized, cleaning up first");
      this.cleanup();
    }

    try {
      // Create new Leaflet map instance
      this.map = L.map(container, {
        center: options.center || this.maltaCenter,
        zoom: options.zoom || 10,
      });

      // Add OpenStreetMap tile layer (free, no API key needed)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.map);
      
      // Setup complete
      this.isInitialized = true;
      console.log("Leaflet map initialized successfully");

      // Call onMapLoaded callback if provided
      if (options.onMapLoaded) {
        options.onMapLoaded();
      }

      return true;
    } catch (error) {
      console.error("Error initializing map:", error);
      if (options.onMapError) {
        options.onMapError(error);
      }
      return false;
    }
  }

  // Add or update a vehicle marker on the map
  updateVehicleMarker(vehicle, location) {
    if (!this.isInitialized || !this.map) {
      console.warn("Map not initialized, can't update marker");
      return;
    }

    const vehicleId = vehicle.id;
    
    // Assign color if not already assigned
    if (!this.vehicleColors.has(vehicleId)) {
      this.vehicleColors.set(vehicleId, this.colorPalette[this.colorIndex % this.colorPalette.length]);
      this.colorIndex++;
    }
    
    const vehicleColor = this.vehicleColors.get(vehicleId);
    
    try {
      const position = [location.latitude, location.longitude];
      
      // Check if marker already exists
      if (this.markers.has(vehicleId)) {
        // Update existing marker position
        const marker = this.markers.get(vehicleId);
        marker.setLatLng(position);
        
        // Update popup content with latest info
        marker.getPopup().setContent(`
          <div style="text-align: center;">
            <strong>${vehicle.registration_number || 'Vehicle'}</strong><br>
            ${vehicle.make || ''} ${vehicle.model || ''}<br>
            ${location.is_moving ? 'Moving' : 'Stopped'}
            ${location.speed ? ` at ${Math.round(location.speed)} km/h` : ''}
          </div>
        `);
      } else {
        // Create icon
        const icon = L.divIcon({
          className: 'vehicle-marker',
          html: `<div style="background-color: ${vehicleColor}; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white;">
                  <i class="bi bi-truck"></i>
                </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });
        
        // Create new marker
        const marker = L.marker(position, {
          icon: icon,
          title: vehicle.registration_number || 'Vehicle'
        }).addTo(this.map);
        
        // Add popup with vehicle info
        marker.bindPopup(`
          <div style="text-align: center;">
            <strong>${vehicle.registration_number || 'Vehicle'}</strong><br>
            ${vehicle.make || ''} ${vehicle.model || ''}<br>
            ${location.is_moving ? 'Moving' : 'Stopped'}
            ${location.speed ? ` at ${Math.round(location.speed)} km/h` : ''}
          </div>
        `);
        
        // Add click event
        marker.on('click', () => {
          // Handle vehicle selection
          this.selectVehicle(vehicleId);
          this.onVehicleClickCallbacks.forEach(callback => callback(vehicleId));
        });
        
        // Store marker
        this.markers.set(vehicleId, marker);
      }
    } catch (error) {
      console.error("Error updating vehicle marker:", error);
    }
  }

  // Remove a vehicle marker from the map
  removeVehicleMarker(vehicleId) {
    if (!this.isInitialized || !this.markers.has(vehicleId)) return;
    
    try {
      const marker = this.markers.get(vehicleId);
      this.map.removeLayer(marker);
      this.markers.delete(vehicleId);
      
      if (this.selectedVehicleId === vehicleId) {
        this.selectedVehicleId = null;
      }
    } catch (error) {
      console.error(`Error removing marker for vehicle ${vehicleId}:`, error);
    }
  }

  // Select a vehicle and center the map on it
  selectVehicle(vehicleId) {
    if (!this.isInitialized) return;
    
    try {
      // Clear previous selection
      this.selectedVehicleId = vehicleId;
      
      if (vehicleId && this.markers.has(vehicleId)) {
        const marker = this.markers.get(vehicleId);
        
        // Center map on vehicle
        this.map.setView(marker.getLatLng(), 15);
        
        // Open popup
        marker.openPopup();
      }
    } catch (error) {
      console.error("Error selecting vehicle:", error);
    }
  }

  // Set a callback for when a vehicle is clicked
  onVehicleClick(callback) {
    if (typeof callback === 'function') {
      this.onVehicleClickCallbacks.push(callback);
    }
  }

  // Set map style - in Leaflet we just change the tile layer
  setMapStyle(style) {
    if (!this.isInitialized || !this.map) return;
    
    try {
      // Remove existing tile layers
      this.map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
          this.map.removeLayer(layer);
        }
      });
      
      // Add new tile layer based on style
      let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
      
      switch (style) {
        case 'satellite':
          // Free satellite tiles from ESRI
          tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
          attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
          break;
        case 'terrain':
          // Terrain view
          tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
          attribution = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>';
          break;
      }
      
      L.tileLayer(tileUrl, { attribution }).addTo(this.map);
    } catch (error) {
      console.error("Error changing map style:", error);
    }
  }

  // Force map to recenter on Malta
  recenterMap(center = null, zoom = 10) {
    if (!this.isInitialized || !this.map) return;
    
    try {
      this.map.setView(center || this.maltaCenter, zoom);
    } catch (error) {
      console.error("Error recentering map:", error);
    }
  }

  // Clean up the map service
  cleanup() {
    try {
      if (this.map) {
        this.markers.forEach(marker => {
          this.map.removeLayer(marker);
        });
        
        this.map.remove();
      }
      
      this.markers.clear();
      this.vehicleColors.clear();
      this.selectedVehicleId = null;
      this.colorIndex = 0;
      this.onVehicleClickCallbacks = [];
      
      this.map = null;
      this.isInitialized = false;
      console.log("Map service cleaned up");
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
}

// Create and export singleton instance
const mapService = new MapService();
export default mapService;