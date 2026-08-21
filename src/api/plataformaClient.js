/**
 * ══════════════════════════════════════════════════════════════════════════
 * 📜 MEMÓRIA DO PROJETO — leia antes de mexer aqui (21/08/2026)
 * ══════════════════════════════════════════════════════════════════════════
 * A Leilão NoZap NASCEU na Base44 — uma plataforma de criar app com IA. Foi a
 * primeira IA do projeto, a que montou a base inicial. Isso fica registrado
 * aqui de propósito: não é vergonha, é história.
 *
 * O que mudou: o app cortou o cordão com os SERVIDORES da Base44 (SDK, plugin,
 * mídia — tudo saiu de lá; ver commit "corta o cordão"). Só ficou a FORMA da
 * API (`.entities`, `.functions.invoke`, `.auth`) porque centenas de telas já
 * chamavam esse formato, e reescrever tudo de uma vez custava mais do que
 * valia. Este arquivo é esse adapter: por fora parece a API antiga, por dentro
 * fala só com o Supabase e as rotas da Vercel do próprio projeto.
 *
 * PREVIEW ISOLADO: somente nesta branch de teste, acessos *.vercel.app usam a
 * Edge Function preview-api do Supabase preview-staging. A correção real de
 * produção continua separada e contém apenas +1 linha em CatalogOrdersAdmin.
 * ══════════════════════════════════════════════════════════════════════════
 */
import { plataforma as basePlataforma } from './plataformaAdapter';
export { supabase } from './supabaseClient';

const PREVIEW_STAGING = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app');
const PREVIEW_API = 'https://obipnfhwiaafxeqgfeop.supabase.co/functions/v1/preview-api';
// Chave anon pública da branch de teste — não é service_role nem segredo de servidor.
const PREVIEW_ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iaXBuZmh3aWFhZnhlcWdmZW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNDgzNDAsImV4cCI6MjEwMjkyNDM0MH0.XS42_n2QWWtzV07Et7dUnr5juvRufrnSBJfbql7CwvI';

// Harness TEMPORÁRIO: entra como admin fictício somente em deploy *.vercel.app
// desta branch. Nenhum usuário ou dado real de produção é usado.
if (PREVIEW_STAGING && typeof localStorage !== 'undefined') {
  localStorage.setItem('currentUser', JSON.stringify({
    id: 'preview-admin',
    email: 'preview@leilaonozap.test',
    full_name: 'Admin Preview',
    display_first_name: 'Preview',
    role: 'admin',
    enabled_panels: ['admin'],
  }));
  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('isLoggedIn', 'true');
}

async function previewInvoke(name, body = {}) {
  // Harness deliberadamente mínimo: só o necessário para reproduzir o bug
  // da Gestão de Pedidos. Nenhuma outra função pode escrever no staging.
  if (!['login', 'updateOrderStatus'].includes(String(name))) {
    return { success: false, error: `Função ${String(name)} desativada no preview isolado` };
  }
  try {
    const resp = await fetch(`${PREVIEW_API}?fn=${encodeURIComponent(String(name))}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: PREVIEW_ANON_JWT,
        Authorization: `Bearer ${PREVIEW_ANON_JWT}`,
      },
      body: JSON.stringify(body || {}),
    });
    return await resp.json();
  } catch (error) {
    return { success: false, error: 'Preview staging indisponível', details: String(error?.message || error) };
  }
}

const previewFunctions = new Proxy(
  { invoke: previewInvoke },
  {
    get(target, name) {
      if (name in target) return target[name];
      if (typeof name === 'symbol') return undefined;
      return (body) => previewInvoke(name, body);
    },
  }
);

export const plataforma = PREVIEW_STAGING
  ? new Proxy(basePlataforma, {
      get(target, prop) {
        if (prop === 'functions') return previewFunctions;
        return target[prop];
      },
    })
  : basePlataforma;
