/**
 * Cliente Supabase do Leilão NoZap (substitui Base44 SDK).
 * Projeto principal: gezvviyegtxytnwjkrjv (sa-east-1)
 *
 * PREVIEW ISOLADO: esta branch de teste aponta exclusivamente para a branch
 * Supabase preview-staging. Este arquivo NÃO faz parte da correção de produção.
 */
import { createClient } from '@supabase/supabase-js';

const PREVIEW_STAGING = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app');

const SUPABASE_URL = PREVIEW_STAGING
  ? 'https://obipnfhwiaafxeqgfeop.supabase.co'
  : (import.meta.env.VITE_SUPABASE_URL || 'https://gezvviyegtxytnwjkrjv.supabase.co');

const SUPABASE_KEY = PREVIEW_STAGING
  ? 'sb_publishable_HkscbCHq3kZ2KuRlLnH5Zw_6lmb8oQQ'
  : (
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      'sb_publishable_wZOM37qN_CPxoZnE-OvrAA_m6MWCG4r'
    );

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
