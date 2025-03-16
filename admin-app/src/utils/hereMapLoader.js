// admin-app/src/utils/hereMapLoader.js

/**
 * Load HERE Maps scripts dynamically
 * @returns {Promise} Promise that resolves when all scripts are loaded
 */
export function loadHereMapsScripts() {
    if (window.H) {
      console.log('HERE Maps already loaded');
      return Promise.resolve();
    }
  
    return new Promise((resolve, reject) => {
      const scripts = [
        { src: 'https://js.api.here.com/v3/3.1/mapsjs-core.js' },
        { src: 'https://js.api.here.com/v3/3.1/mapsjs-service.js' },
        { src: 'https://js.api.here.com/v3/3.1/mapsjs-ui.js' },
        { src: 'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js' }
      ];
  
      // Load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = 'https://js.api.here.com/v3/3.1/mapsjs-ui.css';
      document.head.appendChild(link);
  
      // Counter for loaded scripts
      let loadedCount = 0;
  
      // Function to load each script
      const loadScript = (script) => {
        const scriptElement = document.createElement('script');
        scriptElement.type = 'text/javascript';
        scriptElement.src = script.src;
        scriptElement.async = false; // Important: keep false for proper load order
        scriptElement.defer = false;
  
        scriptElement.onload = () => {
          loadedCount++;
          console.log(`Loaded HERE Maps script: ${script.src}`);
          if (loadedCount === scripts.length) {
            console.log('All HERE Maps scripts loaded');
            // Give a small delay to ensure everything is initialized
            setTimeout(() => {
              if (window.H) {
                resolve();
              } else {
                reject(new Error('HERE Maps not found after loading all scripts'));
              }
            }, 500);
          }
        };
  
        scriptElement.onerror = (error) => {
          reject(new Error(`Failed to load HERE Maps script: ${script.src}`));
        };
  
        document.head.appendChild(scriptElement);
      };
  
      // Load scripts in sequence (order matters)
      scripts.forEach(loadScript);
    });
  }
  
  /**
   * Initialize HERE Maps platform
   * @param {string} apiKey - HERE Maps API key
   * @returns {object|null} - HERE Maps platform object or null if initialization failed
   */
  export function initializeHerePlatform(apiKey) {
    if (!window.H || !window.H.service || !window.H.service.Platform) {
      console.error('HERE Maps library not properly loaded');
      return null;
    }
    
    try {
      return new window.H.service.Platform({
        'apikey': apiKey
      });
    } catch (error) {
      console.error('Error initializing HERE platform:', error);
      return null;
    }
  }
  
  /**
   * Create a simple marker for a vehicle
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {string} color - Marker color
   * @param {string} vehicleId - ID of the vehicle
   * @returns {H.map.Marker} HERE Maps marker
   */
  export function createVehicleMarker(lat, lng, color = '#3498db', vehicleId = null) {
    if (!window.H) return null;
  
    try {
      // Create a simple SVG icon
      const svgMarkup = `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="12" y="14" font-size="10" text-anchor="middle" fill="white">🚚</text>
      </svg>`;
      
      // Create icon and marker
      const icon = new window.H.map.Icon(svgMarkup, { size: { w: 24, h: 24 } });
      const marker = new window.H.map.Marker(
        { lat, lng },
        { icon, data: { vehicleId } }
      );
      
      return marker;
    } catch (error) {
      console.error('Error creating vehicle marker:', error);
      return null;
    }
  }