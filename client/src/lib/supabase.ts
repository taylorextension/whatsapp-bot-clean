import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lnrvzopgabdijhqyzscc.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucnZ6b3BnYWJkaWpocXl6c2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNzgyMDEsImV4cCI6MjA3ODY1NDIwMX0.ZCIyxptYOAxqMHQjhi1Og6X5NtnYA-hq7umnq0D3Cbs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
