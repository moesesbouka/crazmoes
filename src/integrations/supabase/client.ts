import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sfheqjnxlkygjfohoybo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmaGVxam54bGt5Z2pmb2hveWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNTc3NjUsImV4cCI6MjA4MzkzMzc2NX0.oWEnB48w_k_hOtYM1Ls2AHj8j-THDs_43BBzXrqPyxY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'exists' : 'missing');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Debug logging (remove after testing)
console.log('Supabase initialized with URL:', supabaseUrl);
