import { createClient } from '@supabase/supabase-js';

// crazymoes-prod — single source of truth for all CrazyMoe data
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://sfheqjnxlkygjfohoybo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmaGVxam54bGt5Z2pmb2hveWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNTc3NjUsImV4cCI6MjA4MzkzMzc2NX0.oWEnB48w_k_hOtYM1Ls2AHj8j-THDs_43BBzXrqPyxY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
