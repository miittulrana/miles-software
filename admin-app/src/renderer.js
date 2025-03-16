// admin-app/src/renderer.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { supabase } from './supabaseClient';

<userStyle>Normal</userStyle>

// Global error handler for Supabase realtime errors
const handleSupabaseError = (error) => {
  console.error('Supabase error:', error);
  // We could show a global notification here if needed
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const container = document.getElementById('app');
    
    if (!container) {
      console.error('App container not found!');
      return;
    }

    // Test Supabase connection before mounting React
    try {
      // Simple connection test - fetch a single record
      const { error } = await supabase
        .from('vehicles')
        .select('id')
        .limit(1);
      
      if (error) {
        console.warn('Supabase connection test failed:', error);
        // Continue anyway, but log the warning
      } else {
        console.log('Supabase connection successful');
      }
    } catch (supabaseError) {
      console.error('Error initializing Supabase:', supabaseError);
      // Continue mounting the app anyway - it will handle connection errors
    }

    // Use the newer React 18 createRoot API
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // Set up global Supabase error handler
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.error && 
          event.reason.error.message && 
          event.reason.error.message.includes('policy')) {
        handleSupabaseError(event.reason.error);
        console.warn('Supabase permission error detected globally:', event.reason.error.message);
      }
    });

  } catch (error) {
    console.error('Error rendering app:', error);
    
    // Render a fallback error UI
    const container = document.getElementById('app');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; font-family: system-ui, sans-serif;">
          <h2>Something went wrong</h2>
          <p>The application encountered an error during startup.</p>
          <button onclick="location.reload()">Reload</button>
        </div>
      `;
    }
  }
});