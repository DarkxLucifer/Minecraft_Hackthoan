import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Checks if Supabase credentials are validly supplied in .env.local
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith("http") &&
  !supabaseUrl.includes("your-project-id")
);

// Fallback dummy credentials to prevent createClient from crashing if unconfigured
const clientUrl = isSupabaseConfigured ? supabaseUrl : "https://placeholder-domain.supabase.co";
const clientKey = isSupabaseConfigured ? supabaseAnonKey : "placeholder-anon-key";

export const supabase: SupabaseClient = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
