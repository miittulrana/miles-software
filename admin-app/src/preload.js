// admin-app/src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal set of APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Simple test function to verify preload is working
  isElectron: true,
  
  // Get app path
  getAppPath: () => ipcRenderer.invoke('get-app-path')
});

// Log that preload script loaded
console.log('Preload script loaded successfully');