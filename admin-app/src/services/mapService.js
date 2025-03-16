// admin-app/src/services/mapService.js
import { loadHereMapsScripts, initializeHerePlatform, createVehicleMarker } from '../utils/hereMapLoader';

class MapService {
  constructor() {
    this.map = null;
    this.platform = null;
    this.defaultLayers = null;
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
    this.objectGroup = null;
  }

  // Initialize the HERE Maps library
  async loadMapLibrary() {
    try {
      await loadHereMapsScripts();
      return true;
    } catch (error) {
      console.error('Failed to load HERE Maps library:', error);
      return false;
    }
  }

  // Initialize the map in the provided container
  async initializeMap(container, apiKey, options = {}) {
    if (this.isInitialized) {
      console.log("Map already initialized, cleaning up first");
      this.cleanup();
    }

    try {
      // Make sure libraries are loaded
      if (!window.H) {
        const loaded = await this.loadMapLibrary();
        if (!loaded) {
          throw new Error('Failed to load HERE Maps library');
        }
      }

      // Initialize platform
      this.platform = initializeHerePlatform(apiKey);
      if (!this.platform) {
        throw new Error('Failed to initialize HERE platform');
      }

      // Obtain default layers
      this.defaultLayers = this.platform.createDefaultLayers();

      // Create map with default settings
      this.map = new H.Map(
        container,
        this.defaultLayers.vector.normal.map,
        {
          zoom: options.zoom || 10,
          center: options.center 
            ? { lat: options.center[1], lng: options.center[0] } 
            : { lat: 40.7128, lng: -74.006 }, // NYC default
          pixelRatio: window.devicePixelRatio || 1
        }
      );

      // Add MapEvents and Behavior for interactivity
      const mapEvents = new H.mapevents.MapEvents(this.map);
      const behavior = new H.mapevents.Behavior(mapEvents);
      
      // Add UI components
      const ui = H.ui.UI.createDefault(this.map, this.defaultLayers);

      // Create a group for vehicle markers
      this.objectGroup = new H.map.Group();
      this.map.addObject(this.objectGroup);

      // Add map resize listener
      window.addEventListener('resize', () => {
        this.map.getViewPort().resize();
      });

      // Setup complete
      this.isInitialized = true;
      console.log("Map initialized successfully");

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
      // Check if marker already exists
      if (this.markers.has(vehicleId)) {
        const marker = this.markers.get(vehicleId);
        marker.setGeometry(new H.geo.Point(location.latitude, location.longitude));
      } else {
        // Create new marker
        const marker = createVehicleMarker(
          location.latitude, 
          location.longitude, 
          vehicleColor, 
          vehicleId
        );
        
        if (!marker) {
          console.error('Failed to create marker for vehicle:', vehicleId);
          return;
        }
        
        // Add tap event
        marker.addEventListener('tap', (evt) => {
          const data = evt.target.getData();
          if (data && data.vehicleId) {
            this.selectVehicle(data.vehicleId);
            this.onVehicleClickCallbacks.forEach(callback => callback(data.vehicleId));
          }
        });
        
        // Add to map
        this.objectGroup.addObject(marker);
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
      this.objectGroup.removeObject(marker);
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
        this.map.setCenter(marker.getGeometry());
        this.map.setZoom(15);
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

  // Set map style
  setMapStyle(style) {
    if (!this.isInitialized || !this.map || !this.defaultLayers) return;
    
    try {
      let layer;
      
      switch (style) {
        case 'satellite':
          layer = this.defaultLayers.raster.satellite.map;
          break;
        case 'terrain':
          layer = this.defaultLayers.vector.normal.map;
          break;
        case 'traffic':
          layer = this.defaultLayers.vector.normal.traffic;
          break;
        case 'normal':
        default:
          layer = this.defaultLayers.vector.normal.map;
          break;
      }
      
      this.map.setBaseLayer(layer);
    } catch (error) {
      console.error("Error changing map style:", error);
    }
  }

  // Toggle 3D view
  toggle3DView(enable) {
    if (!this.isInitialized || !this.map) return;
    
    try {
      const viewModel = this.map.getViewModel();
      viewModel.setLookAtData({
        tilt: enable ? 45 : 0
      });
    } catch (error) {
      console.error("Error toggling 3D view:", error);
    }
  }

  // Force map to recenter
  recenterMap(center = [-74.006, 40.7128], zoom = 10) {
    if (!this.isInitialized || !this.map) return;
    
    try {
      this.map.setCenter({lat: center[1], lng: center[0]});
      this.map.setZoom(zoom);
      this.map.getViewPort().resize();
    } catch (error) {
      console.error("Error recentering map:", error);
    }
  }

  // Clean up the map service
  cleanup() {
    try {
      if (this.objectGroup) {
        this.objectGroup.removeAll();
      }
      
      this.markers.clear();
      this.vehicleColors.clear();
      this.selectedVehicleId = null;
      this.colorIndex = 0;
      this.onVehicleClickCallbacks = [];
      
      if (this.map) {
        this.map.dispose();
        this.map = null;
      }
      
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