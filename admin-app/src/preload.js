// admin-app/src/preload.js
const { contextBridge } = require('electron');

// Simple API to indicate we're in Electron
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true
});

// Log that preload script loaded
console.log('Preload script loaded successfully');