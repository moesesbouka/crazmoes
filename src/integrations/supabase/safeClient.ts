import { createClient } from "@supabase/supabase-js";

// IMPORTANT: Do not rely on hardcoded fallbacks.
// Lovable Cloud provides these as Vite env vars at build/runtime.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Some Lovable Cloud projects expose the key as VITE_SUPABASE_PUBLISHABLE_KEY.
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly instead of silently using the wrong project.
  throw new Error(
    "Missing backend configuration: VITE_SUPABASE_URL and VITE_SUPABASE_(ANON|PUBLISHABLE)_KEY"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
