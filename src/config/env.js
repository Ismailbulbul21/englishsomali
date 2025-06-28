// Environment configuration
export const env = {
  SUPABASE_URL: 'https://mlfyhbykswlvbiacjrnk.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZnloYnlrc3dsdmJpYWNqcm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MjYyMzMsImV4cCI6MjA2NTMwMjIzM30.m3a6VTwo2EVBXkM5egAYhoLA6xL8eYCIOmkJHBVl6as',
  // API Keys should be set via environment variables
  OPENROUTER_API_KEY: import.meta.env?.VITE_OPENROUTER_API_KEY || 'demo-mode',
  HUGGING_FACE_API_KEY: import.meta.env?.VITE_HUGGING_FACE_API_KEY || 'demo-mode'
} 
