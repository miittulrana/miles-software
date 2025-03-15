// admin-app/src/renderer.js
import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';

// Simple renderer that will definitely work
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('Initializing app...');
    const container = document.getElementById('app');
    
    if (!container) {
      console.error('App container not found!');
      return;
    }
    
    // Use ReactDOM.render for better compatibility
    ReactDOM.render(<App />, container);
    console.log('App rendered successfully');
  } catch (error) {
    console.error('Error rendering app:', error);
  }
});