import { createClient } from '@supabase/supabase-js';

// Initialize with empty values, will be updated once config is loaded
let supabaseUrl = 'https://placeholder.supabase.co';
let supabaseAnonKey = 'placeholder-key';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Update Supabase configuration when available
if (window.getSupabaseConfig) {
  window.getSupabaseConfig().then(config => {
    if (config) {
      // Update the client with actual credentials
      Object.assign(supabase, createClient(config.url, config.key));
      console.log('Supabase client configured');
    }
  });
}