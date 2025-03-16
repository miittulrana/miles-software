// Set up the global object for browser environment
window.global = window;
if (typeof global === 'undefined') {
  window.global = window;
}

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import 'leaflet/dist/leaflet.css';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    const container = document.getElementById('app');
    
    if (!container) {
      console.error('App container not found!');
      return;
    }

    // Use the React 18 createRoot API
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

  } catch (error) {
    console.error('Error rendering app:', error);
    
    // Render a fallback error UI
    const container = document.getElementById('app');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; font-family: system-ui, sans-serif;">
          <h2>Something went wrong</h2>
          <p>${error.toString()}</p>
          <button onclick="location.reload()">Reload</button>
        </div>
      `;
    }
  }
});