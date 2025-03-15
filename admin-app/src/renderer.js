// admin-app/src/renderer.js
import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    const container = document.getElementById('app');
    
    if (!container) {
      console.error('App container not found!');
      return;
    }
    
    ReactDOM.render(<App />, container);
  } catch (error) {
    console.error('Error rendering app:', error);
  }
});