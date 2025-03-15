// admin-app/src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Initialize with values from .env file (or hard-coded for the example)
const supabaseUrl = 'https://srhjbbtpedfsqmfrizzn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaGpiYnRwZWRmc3FtZnJpenpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDc5OTMsImV4cCI6MjA1NzYyMzk5M30.EPwvUaSrezYHRqUTuVbfYcVPQUanhs7Kh8RxzCydo5Q';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);