/**
 * Cliente Supabase do Leilão NoZap (substitui Base44 SDK).
 * Projeto principal: gezvviyegtxytnwjkrjv (sa-east-1)
 *
 * PREVIEW ISOLADO (só nesta branch de teste): antes, o modo staging ativava
 * sozinho sempre que o hostname terminasse em `.vercel.app` — o que bate em
 * TODO deploy de preview deste projeto, não só este, e loga qualquer visitante
 * como admin fictício sem senha nenhuma. Achado crítico pela auditoria; a
 * OpenAI confirmou e pediu remoção. Agora exige DUAS condições ao mesmo
 * tempo: o hostname de preview E uma variável de ambiente explícita
 * (`VITE_PREVIEW_STAGING=true`), configurada só no ambiente Preview da
 * Vercel — nunca em Production. Sem a variável, este build se comporta como
 * produção (aponta pro projeto principal) mesmo rodando num domínio
 * `.vercel.app` — falha fechado, não aberto.
 *
 * A URL e a chave do projeto de staging saem de variável de ambiente, nunca
 * mais hardcoded no código-fonte (REGRA da OpenAI). Ver o comentário no fim
 * do arquivo com as variáveis exatas que a Vercel precisa ter.
 */
import { createClient } from '@supabase/supabase-js';

export const PREVIEW_STAGING =
  typeof window !== 'undefined' &&
  window.location.hostname.endsWith('.vercel.app') &&
  import.meta.env.VITE_PREVIEW_STAGING === 'true';

export const SUPABASE_URL = PREVIEW_STAGING
  ? (import.meta.env.VITE_PREVIEW_SUPABASE_URL || '')
  : (import.meta.env.VITE_SUPABASE_URL || 'https://gezvviyegtxytnwjkrjv.supabase.co');

export const SUPABASE_KEY = PREVIEW_STAGING
  ? (import.meta.env.VITE_PREVIEW_SUPABASE_ANON_KEY || '')
  : (
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      'sb_publishable_wZOM37qN_CPxoZnE-OvrAA_m6MWCG4r'
    );

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

/**
 * VARIÁVEIS QUE A OPENAI PRECISA CONFIGURAR NA VERCEL (Project Settings →
 * Environment Variables), escopo "Preview" — de preferência limitado à
 * branch `openai/catalog-status-sync-preview`, nunca em "Production":
 *
 *   VITE_PREVIEW_STAGING            = true
 *   VITE_PREVIEW_SUPABASE_URL       = https://obipnfhwiaafxeqgfeop.supabase.co
 *   VITE_PREVIEW_SUPABASE_ANON_KEY  = (chave publicável/anon do projeto
 *                                      preview-staging — não é segredo de
 *                                      servidor, mas não deve mais viver
 *                                      hardcoded no código-fonte)
 *
 * Sem essas três, o Preview passa a se comportar como produção (não abre a
 * tela sem login real) em vez de logar admin fictício sozinho — comportamento
 * seguro por padrão, não uma regressão.
 */
