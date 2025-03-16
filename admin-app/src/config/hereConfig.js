// admin-app/src/config/hereConfig.js

// HERE Maps configuration
const hereConfig = {
    // Your HERE Maps API key 
    apiKey: 'TGQS7Az399FFMavDBe37kEgw2jTlb0ZmdVkwhNjy58c',
    
    // Default map center (New York City)
    defaultCenter: [-74.006, 40.7128],
    
    // Default zoom level
    defaultZoom: 10,
    
    // Map style options
    mapStyles: {
      normal: 'normal.day',
      satellite: 'satellite.day',
      terrain: 'terrain.day',
      traffic: 'normal.traffic.day'
    },
    
    // Default map style
    defaultStyle: 'normal',
    
    // Enable 3D buildings by default
    enable3DBuildings: false,
    
    // Enable map animations
    enableAnimations: true
  };
  
  export default hereConfig;