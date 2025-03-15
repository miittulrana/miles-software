// admin-app/src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Explicitly set the global object for the renderer
contextBridge.exposeInMainWorld('global', window);

// Log that preload script loaded
console.log('Preload script loaded successfully');