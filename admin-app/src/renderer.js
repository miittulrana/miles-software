import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';

// Set up Supabase configuration for React components
window.getSupabaseConfig = async () => {
  try {
    // Get configuration from main process via preload bridge
    if (window.electronAPI) {
      return await window.electronAPI.getSupabaseConfig();
    }
    
    // Fallback for development
    return {
      url: 'https://your-project-url.supabase.co',
      key: 'your-anon-key'
    };
  } catch (error) {
    console.error('Error getting Supabase config:', error);
    return null;
  }
};

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded, initializing React app');
  const container = document.getElementById('app');
  const root = createRoot(container);
  root.render(<App />);
});