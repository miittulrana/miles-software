// admin-app/src/services/mapService.js
import mapboxgl from 'mapbox-gl';

// Default center coordinates (New York City for guaranteed map data)
const DEFAULT_CENTER = [-74.006, 40.7128];
const DEFAULT_ZOOM = 10;
const MAX_ZOOM = 18;
const DEFAULT_PITCH = 0; // Start with 0 for better performance

// Vehicle marker update animation duration (ms)
const ANIMATION_DURATION = 1000;

class MapService {
  constructor() {
    this.map = null;
    this.markers = new Map(); // Vehicle ID -> marker object
    this.markerElements = new Map(); // Vehicle ID -> DOM element
    this.vehicleColors = new Map(); // Vehicle ID -> color
    this.selectedVehicleId = null;
    this.colorPalette = [
      '#3498db', '#2ecc71', '#e74c3c', '#9b59b6', '#f1c40f', 
      '#1abc9c', '#e67e22', '#34495e', '#7f8c8d', '#d35400',
      '#27ae60', '#2980b9', '#8e44ad', '#c0392b', '#16a085'
    ];
    this.colorIndex = 0;
    this.isInitialized = false;
    this.onVehicleClickCallbacks = [];
  }

  // Initialize the map in the provided container
  initializeMap(container, token, options = {}) {
    if (this.isInitialized) {
      console.log("Map already initialized, cleaning up first");
      this.cleanup();
    }

    try {
      // Set Mapbox access token
      mapboxgl.accessToken = token;

      console.log("Creating map with container:", container);
      console.log("Using Mapbox token:", token.substring(0, 10) + '...');

      // Verify container has dimensions
      const rect = container.getBoundingClientRect();
      console.log("Container dimensions:", rect.width, "x", rect.height);
      
      if (rect.width === 0 || rect.height === 0) {
        console.warn("Container has zero dimensions, map may fail to initialize");
      }

      // Use the full style URL instead of the shorthand
      const styleUrl = options.mapStyle;

      // Create the map
      this.map = new mapboxgl.Map({
        container,
        style: styleUrl,
        center: options.center || DEFAULT_CENTER,
        zoom: options.zoom || DEFAULT_ZOOM,
        pitch: options.pitch || DEFAULT_PITCH,
        bearing: options.bearing || 0,
        antialias: true, // Enables smoother rendering for 3D
        attributionControl: true, // Required by Mapbox terms of service
        preserveDrawingBuffer: true, // Helps with certain rendering issues
        failIfMajorPerformanceCaveat: false, // More forgiving of performance issues
        renderWorldCopies: true // Shows multiple copies of the map when zoomed out
      });

      // Add navigation controls
      this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add fullscreen control
      this.map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      // Add geolocate control
      this.map.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true
        }),
        'top-right'
      );

      // Add scale control
      this.map.addControl(new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
      }), 'bottom-left');

      // Track errors
      this.map.on('error', (e) => {
        console.error("Mapbox error:", e);
        if (options.onMapError) {
          options.onMapError(e);
        }
      });

      // Wait for map to load
      this.map.on('load', () => {
        console.log("Map loaded successfully");
        
        // Force a resize to ensure the map fills the container properly
        this.map.resize();
        
        // Add 3D building layer if enabled
        if (options.show3DBuildings) {
          this.add3DBuildings();
        }

        // Map is now initialized
        this.isInitialized = true;
        
        // Execute any callback provided
        if (options.onMapLoaded) {
          options.onMapLoaded(this.map);
        }
      });
      
    } catch (error) {
      console.error("Error initializing map:", error);
      if (options.onMapError) {
        options.onMapError(error);
      }
      throw error;
    }
  }

  // Add 3D building extrusion layer
  add3DBuildings() {
    // Only add if map is loaded and layer doesn't exist
    if (!this.map || this.map.getLayer('3d-buildings')) {
      return;
    }

    // Wait for map style to load
    if (!this.map.isStyleLoaded()) {
      this.map.once('style.load', () => {
        this.add3DBuildings();
      });
      return;
    }

    try {
      this.map.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 14,
        'paint': {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            14, 0,
            16, ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate', ['linear'], ['zoom'],
            14, 0,
            16, ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.6
        }
      }, 'road-label');
    } catch (error) {
      console.error("Error adding 3D buildings:", error);
      // Just log the error, don't rethrow it as this is non-critical
    }
  }

  // Add or update a vehicle marker on the map
  updateVehicleMarker(vehicle, location) {
    if (!this.map || !this.isInitialized) {
      console.warn("Map not initialized, can't update marker");
      return;
    }

    const vehicleId = vehicle.id;
    
    // Assign a consistent color for this vehicle if not already assigned
    if (!this.vehicleColors.has(vehicleId)) {
      this.vehicleColors.set(vehicleId, this.colorPalette[this.colorIndex % this.colorPalette.length]);
      this.colorIndex++;
    }
    
    const vehicleColor = this.vehicleColors.get(vehicleId);
    
    try {
      // Check if we already have a marker for this vehicle
      if (this.markers.has(vehicleId)) {
        const marker = this.markers.get(vehicleId);
        const currentLngLat = marker.getLngLat();
        
        // Only animate if the position has changed significantly
        if (Math.abs(currentLngLat.lng - location.longitude) > 0.00001 || 
            Math.abs(currentLngLat.lat - location.latitude) > 0.00001) {
          
          // Smooth animation to new position
          this._animateMarkerMovement(
            marker, 
            currentLngLat, 
            { lng: location.longitude, lat: location.latitude },
            ANIMATION_DURATION
          );
        }
        
        // Update marker element (direction, status, etc.)
        const element = this.markerElements.get(vehicleId);
        if (element) {
          // Update vehicle direction/heading arrow
          if (location.heading !== undefined) {
            const arrowElement = element.querySelector('.vehicle-direction');
            if (arrowElement) {
              arrowElement.style.transform = `rotate(${location.heading}deg)`;
            }
          }
          
          // Update vehicle status indicator
          const statusElement = element.querySelector('.vehicle-status');
          if (statusElement) {
            statusElement.className = `vehicle-status ${location.is_moving ? 'moving' : 'stopped'}`;
          }
          
          // Update speed display if available
          if (location.speed !== undefined) {
            const speedElement = element.querySelector('.vehicle-speed');
            if (speedElement) {
              speedElement.textContent = `${Math.round(location.speed)} km/h`;
            }
          }
        }
      } else {
        // Create a new marker if one doesn't exist
        const element = this._createMarkerElement(vehicle, vehicleColor);
        
        // Create the marker
        const marker = new mapboxgl.Marker({
          element,
          anchor: 'center'
        })
          .setLngLat([location.longitude, location.latitude])
          .addTo(this.map);
        
        // Store references
        this.markers.set(vehicleId, marker);
        this.markerElements.set(vehicleId, element);
        
        // Add click handler
        element.addEventListener('click', () => {
          this.selectVehicle(vehicleId);
          this.onVehicleClickCallbacks.forEach(callback => callback(vehicleId));
        });
      }
    } catch (error) {
      console.error("Error updating vehicle marker:", error);
      // Just log the error, don't rethrow it
    }
  }

  // Remove a vehicle marker from the map
  removeVehicleMarker(vehicleId) {
    if (this.markers.has(vehicleId)) {
      try {
        // Remove the marker from the map
        this.markers.get(vehicleId).remove();
        
        // Remove from our collections
        this.markers.delete(vehicleId);
        this.markerElements.delete(vehicleId);
        
        // If this was the selected vehicle, clear selection
        if (this.selectedVehicleId === vehicleId) {
          this.selectedVehicleId = null;
        }
      } catch (error) {
        console.error("Error removing vehicle marker:", error);
      }
    }
  }

  // Select a vehicle (highlight it on the map)
  selectVehicle(vehicleId) {
    try {
      // Clear previous selection
      if (this.selectedVehicleId && this.markerElements.has(this.selectedVehicleId)) {
        const prevElement = this.markerElements.get(this.selectedVehicleId);
        prevElement.classList.remove('selected');
      }
      
      // Set new selection
      this.selectedVehicleId = vehicleId;
      
      // Highlight new selection
      if (vehicleId && this.markerElements.has(vehicleId)) {
        const element = this.markerElements.get(vehicleId);
        element.classList.add('selected');
        
        // Center map on this vehicle
        if (this.markers.has(vehicleId) && this.map) {
          this.map.flyTo({
            center: this.markers.get(vehicleId).getLngLat(),
            zoom: 15,
            pitch: 60,
            duration: 1000
          });
        }
      }
    } catch (error) {
      console.error("Error selecting vehicle:", error);
    }
  }

  // Force the map to recenter and resize
  recenterMap(center = DEFAULT_CENTER, zoom = DEFAULT_ZOOM) {
    if (!this.map) return;
    
    try {
      this.map.resize();
      this.map.setCenter(center);
      this.map.setZoom(zoom);
      console.log("Map forcibly recentered and resized");
    } catch (error) {
      console.error("Error recentering map:", error);
    }
  }

  // Get the position of a vehicle
  getVehiclePosition(vehicleId) {
    if (this.markers.has(vehicleId)) {
      return this.markers.get(vehicleId).getLngLat();
    }
    return null;
  }

  // Set a callback for when a vehicle is clicked
  onVehicleClick(callback) {
    if (typeof callback === 'function') {
      this.onVehicleClickCallbacks.push(callback);
    }
  }

  // Clear all click handlers
  clearClickHandlers() {
    this.onVehicleClickCallbacks = [];
  }

  // Get map status for debugging
  getMapStatus() {
    if (!this.map) {
      return {
        initialized: false,
        message: "Map not initialized"
      };
    }
    
    try {
      const center = this.map.getCenter();
      const zoom = this.map.getZoom();
      const style = this.map.getStyle();
      const styleName = style?.name || "Unknown style";
      
      return {
        initialized: this.isInitialized,
        center: [center.lng, center.lat],
        zoom,
        styleName,
        markerCount: this.markers.size,
        containerId: this.map.getContainer().id,
        containerSize: {
          width: this.map.getContainer().offsetWidth,
          height: this.map.getContainer().offsetHeight
        }
      };
    } catch (error) {
      return {
        initialized: this.isInitialized,
        error: error.message
      };
    }
  }

  // Clean up the map service
  cleanup() {
    try {
      // Remove all markers
      this.markers.forEach(marker => {
        try {
          marker.remove();
        } catch (err) {
          console.warn("Error removing marker:", err);
        }
      });
      
      this.markers.clear();
      this.markerElements.clear();
      
      // Clear other state
      this.vehicleColors.clear();
      this.selectedVehicleId = null;
      this.colorIndex = 0;
      this.clearClickHandlers();
      
      // Remove map if it exists
      if (this.map) {
        this.map.remove();
        this.map = null;
      }
      
      this.isInitialized = false;
      console.log("Map service cleaned up");
    } catch (error) {
      console.error("Error cleaning up map:", error);
    }
  }

  // Create a custom marker element for a vehicle
  _createMarkerElement(vehicle, color) {
    // Create container element
    const element = document.createElement('div');
    element.className = 'vehicle-marker-container';
    element.id = `marker-${vehicle.id}`;
    
    // Create marker content
    element.innerHTML = `
      <div class="vehicle-icon" style="background-color: ${color}">
        <i class="bi bi-truck"></i>
      </div>
      <div class="vehicle-direction">↑</div>
      <div class="vehicle-status stopped"></div>
      <div class="vehicle-info">
        <div class="vehicle-label">${vehicle.registration_number || 'Unknown'}</div>
        <div class="vehicle-speed"></div>
      </div>
    `;
    
    return element;
  }

  // Animate marker movement with smooth transition
  _animateMarkerMovement(marker, startPos, endPos, duration) {
    try {
      const startTime = Date.now();
      
      const animate = () => {
        // Calculate progress
        const progress = Math.min((Date.now() - startTime) / duration, 1);
        
        // Calculate current position using easing function
        const lng = startPos.lng + (endPos.lng - startPos.lng) * this._easeInOutCubic(progress);
        const lat = startPos.lat + (endPos.lat - startPos.lat) * this._easeInOutCubic(progress);
        
        // Update marker position
        marker.setLngLat([lng, lat]);
        
        // Continue animation if not complete
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      // Start animation
      animate();
    } catch (error) {
      console.error("Error animating marker:", error);
      // Fall back to immediate position update
      marker.setLngLat([endPos.lng, endPos.lat]);
    }
  }

  // Cubic easing function for smooth movement
  _easeInOutCubic(t) {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

// Create and export singleton instance
const mapService = new MapService();
export default mapService;