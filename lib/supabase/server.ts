import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (
  !supabaseUrl ||
  supabaseUrl.includes('your-project-ref') ||
  !supabaseServiceKey ||
  supabaseServiceKey.includes('your_supabase_service_role_key')
) {
  throw new Error(
    'Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are missing or invalid in .env.local'
  );
}

// Server-side Supabase client using Service Role Key (bypasses RLS safely from Server Actions/Route Handlers)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export function isSupabaseConfigured(): boolean {
  return true;
}
