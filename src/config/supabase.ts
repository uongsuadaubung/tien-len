import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const envUrl = import.meta.env?.VITE_SUPABASE_URL;
export const SUPABASE_URL: string = typeof envUrl === 'string' && envUrl ? envUrl : 'https://pmzyefqrqhvygupovwzy.supabase.co';

const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;
export const SUPABASE_ANON_KEY: string = typeof envKey === 'string' && envKey ? envKey : 'sb_publishable_0Q5tIjaKsVvrhx_uLQH-Mw_UgsEznCG';

let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 20
        }
      }
    });
  }
  return supabaseClientInstance;
}
