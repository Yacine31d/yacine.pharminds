import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Hardcoded project constants — these are public/safe values (anon key has no special privileges).
// Using hardcoded values avoids Windows Vite env-var parsing issues (quotes, encoding, etc.)
const PROJECT_URL = 'https://bwtgavgdwihqdlbpystw.supabase.co';
const PROJECT_ANON_KEY = 'sb_publishable_mNMXNMRIiY2eApYvtieM4w_FnQl246O';

// Allow .env overrides for staging/production deployments, but strip any accidental quotes
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const SUPABASE_URL = (rawUrl ? rawUrl.replace(/^["']|["']$/g, '').trim() : '') || PROJECT_URL;
const SUPABASE_KEY = (rawKey ? rawKey.replace(/^["']|["']$/g, '').trim() : '') || PROJECT_ANON_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});