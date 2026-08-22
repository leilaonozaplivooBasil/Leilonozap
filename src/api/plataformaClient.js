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
 * PREVIEW ISOLADO: somente nesta branch de teste, e só com a variável de
 * ambiente `VITE_PREVIEW_STAGING=true` explicitamente configurada na Vercel
 * (ver comentário no fim de `supabaseClient.js`), acessos *.vercel.app usam a
 * Edge Function preview-api do Supabase preview-staging. A correção real de
 * produção continua separada.
 *
 * 🔴 PONTO 121 (21/08/2026) — antes o harness ativava sozinho só por causa do
 * hostname terminar em `.vercel.app` (bate em QUALQUER preview deste projeto)
 * e usava um JWT hardcoded separado, diferente da chave que `supabaseClient.js`
 * já usava pro mesmo projeto — provavelmente a causa dos 401 que a OpenAI
 * achou nos logs depois da v2 da Edge Function (duas chaves divergentes pro
 * mesmo projeto). Agora reaproveita a MESMA chave resolvida em
 * `supabaseClient.js` (uma fonte só) e exige a variável de ambiente explícita.
 * ══════════════════════════════════════════════════════════════════════════
 */
import { plataforma as basePlataforma } from './plataformaAdapter';
import { supabase, PREVIEW_STAGING, SUPABASE_URL, SUPABASE_KEY } from './supabaseClient';
export { supabase };

const PREVIEW_API = PREVIEW_STAGING ? `${SUPABASE_URL}/functions/v1/preview-api` : '';

// Harness TEMPORÁRIO: entra como admin fictício somente com PREVIEW_STAGING
// ativo (hostname de preview + variável de ambiente explícita) E chave
// resolvida. Nenhum usuário ou dado real de produção é usado.
if (PREVIEW_STAGING && SUPABASE_KEY && typeof localStorage !== 'undefined') {
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
  // Harness deliberadamente mínimo: só o necessário para reproduzir a Gestão
  // de Pedidos. Nenhuma outra função pode escrever no staging.
  if (!['login', 'updateOrderStatus', 'updatePackedItems'].includes(String(name))) {
    return { success: false, error: `Função ${String(name)} desativada no preview isolado` };
  }
  try {
    const resp = await fetch(`${PREVIEW_API}?fn=${encodeURIComponent(String(name))}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
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

// CatalogSale.update(raw_base44) é usado pelo checklist de conferência. No
// preview, o adapter normal tentaria entityWrite da Vercel e seria bloqueado;
// aqui roteamos SOMENTE esse write para a Edge Function isolada do staging.
const previewCatalogSale = PREVIEW_STAGING
  ? new Proxy(basePlataforma.entities.CatalogSale, {
      get(target, prop) {
        if (prop !== 'update') return target[prop];
        return async (id, data = {}) => {
          const keys = Object.keys(data || {});
          if (String(id) !== 'preview-order-status-sync' || keys.length !== 1 || keys[0] !== 'raw_base44') {
            throw new Error('Preview isolado: escrita de CatalogSale não autorizada');
          }
          const result = await previewInvoke('updatePackedItems', {
            actorId: 'preview-admin',
            saleId: String(id),
            raw_base44: data.raw_base44,
          });
          if (!result?.success) throw new Error(result?.error || 'Falha ao salvar conferência');
          return { id, raw_base44: result.raw_base44 };
        };
      },
    })
  : null;

const previewEntities = PREVIEW_STAGING
  ? new Proxy(basePlataforma.entities, {
      get(target, name) {
        if (name === 'CatalogSale') return previewCatalogSale;
        return target[name];
      },
    })
  : null;

export const plataforma = PREVIEW_STAGING
  ? new Proxy(basePlataforma, {
      get(target, prop) {
        if (prop === 'functions') return previewFunctions;
        if (prop === 'entities') return previewEntities;
        return target[prop];
      },
    })
  : basePlataforma;
