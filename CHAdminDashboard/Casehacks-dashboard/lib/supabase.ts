import { createClient } from '@supabase/supabase-js';
import { createBrowserClient as createBrowserSupabaseClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Browser client - for client components with RLS
export function createBrowserClient() {
  return createBrowserSupabaseClient(supabaseUrl, supabaseAnonKey);
}

// Admin client - bypasses RLS using service role key
export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}