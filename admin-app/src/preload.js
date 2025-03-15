const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// specific APIs from the main process without exposing everything
contextBridge.exposeInMainWorld('electronAPI', {
  // Get Supabase configuration from main process
  getSupabaseConfig: () => ipcRenderer.invoke('get-supabase-config'),
  
  // Add any other APIs you need to expose to the renderer process here
  platform: process.platform
});

// Provide a minimal global console for debugging
contextBridge.exposeInMainWorld('electronConsole', {
  log: (...args) => console.log(...args),
  error: (...args) => console.error(...args)
});

// Signal that preload script is loaded
console.log('Preload script loaded successfully');