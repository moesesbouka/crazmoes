import { createClient } from '@supabase/supabase-js';

// Dedicated Supabase client for the real marketplace inventory database
// This is separate from the Lovable Cloud project which handles auth, chat, etc.
const MARKETPLACE_SUPABASE_URL = 'https://sfheqjnxlkygjfohoybo.supabase.co';
const MARKETPLACE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmaGVxam54bGt5Z2pmb2hveWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNTc3NjUsImV4cCI6MjA4MzkzMzc2NX0.oWEnB48w_k_hOtYM1Ls2AHj8j-THDs_43BBzXrqPyxY';

export const marketplaceDb = createClient(MARKETPLACE_SUPABASE_URL, MARKETPLACE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});
