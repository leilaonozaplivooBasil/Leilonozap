// 💾 O CACHE DO COMPAREAQUI — 10/09/2026
//
// Ver o porquê inteiro em supabase/migrations/20260910230000_comparai_cache.sql.
// Resumo: cada clique em "Comparar Preços" gastava 2 a 3 buscas da SerpApi, o
// mesmo motor roda em laço na análise de preço do importador, e a conta chegou
// em 10/09 com 995 buscas e o cartão recusado.
//
// ⚠️ REGRA DE OURO DESTE ARQUIVO: cache é CONFORTO, nunca dependência.
// Nenhuma função aqui lança. Banco fora do ar, tabela ainda não migrada,
// service_role ausente — em todos os casos devolve "não tenho" e a busca ao
// vivo acontece igual. Um cache que derruba a comparação é pior que cache
// nenhum, porque some com o recurso em vez de só encarecê-lo.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Quanto tempo o preço de mercado de um item vale. */
export const VALIDADE_DIAS = 7;
const TIMEOUT_MS = 2500; // o cache não pode custar mais que a busca que evita

/**
 * A chave: entidade + id + impressão digital do que foi buscado.
 *
 * 🔴 A impressão digital não é enfeite. Sem ela, corrigir a descrição de um
 * produto ou trocar a foto continuaria devolvendo o preço da busca ANTIGA por
 * até uma semana — e ninguém entenderia por quê. Mudou o insumo, muda a chave.
 */
export function chaveDoCache({ entidade, id, titulo, imagem }) {
  const cru = `${String(titulo || '').trim().toLowerCase()}|${String(imagem || '')}`;
  let h = 5381;
  for (let i = 0; i < cru.length; i += 1) h = (((h * 33) ^ cru.charCodeAt(i)) >>> 0);
  return `${entidade}:${id}:${h.toString(36)}`;
}

const sb = (caminho, opcoes = {}) => fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
  ...opcoes,
  headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opcoes.headers || {}) },
  signal: AbortSignal.timeout(TIMEOUT_MS),
});

const ligado = () => !!SUPABASE_URL && !!SR;

/** O resultado guardado e ainda válido, ou `null`. NUNCA lança. */
export async function lerCache(chave) {
  if (!ligado() || !chave) return null;
  try {
    const r = await sb(`comparai_cache?chave=eq.${encodeURIComponent(chave)}&select=payload,fonte,criado_em&expira_em=gt.${new Date().toISOString()}&limit=1`);
    if (!r.ok) return null;
    const linhas = await r.json();
    const linha = Array.isArray(linhas) ? linhas[0] : null;
    return linha?.payload ? { payload: linha.payload, fonte: linha.fonte, criadoEm: linha.criado_em } : null;
  } catch { return null; }
}

/**
 * Guarda o resultado. NUNCA lança, e NUNCA guarda busca vazia.
 *
 * 🔴 Guardar um "não encontrei" por sete dias seria o pior dos mundos: o item
 * ficaria sem comparação por uma semana mesmo depois de a fonte voltar. O que
 * não achou hoje precisa poder ser tentado de novo amanhã.
 */
export async function gravarCache(chave, { entidade, id, payload, dias = VALIDADE_DIAS }) {
  if (!ligado() || !chave || !payload?.found) return false;
  try {
    const expira = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
    const r = await sb('comparai_cache?on_conflict=chave', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{
        chave, entidade, entidade_id: String(id), payload,
        fonte: payload.source || null, criado_em: new Date().toISOString(), expira_em: expira,
      }]),
    });
    return r.ok;
  } catch { return false; }
}
