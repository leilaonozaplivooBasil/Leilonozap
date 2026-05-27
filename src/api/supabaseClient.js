/**
 * Cliente Supabase do Leilão NoZap (substitui Base44 SDK).
 * Projeto: gezvviyegtxytnwjkrjv (sa-east-1)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://gezvviyegtxytnwjkrjv.supabase.co';
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_wZOM37qN_CPxoZnE-OvrAA_m6MWCG4r';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
