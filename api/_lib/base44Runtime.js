// base44Runtime — PONTO 77 CAMADA 4
// Ponte servidor→servidor entre as rotas /api/functions/* (Vercel) e o runtime
// Base44/Deno das MESMAS functions.
//
// POR QUE ISSO EXISTE:
// Os dois ambientes são segregados. Chaves guardadas no cofre do Base44
// (SERPAPI_KEY) NÃO são visíveis para process.env na Vercel — foi o que fez a
// busca de fotos responder "SERPAPI_KEY não configurada" na tela, mesmo com a
// conta SerpAPI válida e com saldo (2.841/6.000 buscas restantes).
//
// Em vez de duplicar a chave em dois lugares (risco de divergir), a rota Vercel
// repassa a chamada para o runtime que já tem a credencial.
//
// ⚠️ A chamada sai do SERVIDOR (Vercel), nunca do navegador — logo não passa por
// CORS, que é restrição de browser.
// ⚠️ Endpoint verificado: https://base44.app/api/apps/<appId>/functions/<nome>
//    (o domínio da plataforma app.base44.com recusa: 403 "use the app's subdomain")
const APP_ID = process.env.BASE44_APP_ID || '68d536db3c26ff51f79c4137';
const BASE = 'https://base44.app/api/apps';

/**
 * Executa uma backend function no runtime Base44 e devolve o JSON dela.
 * @param {string} nome nome exato da function (ex: 'buscarFotosPorImagem')
 * @param {object} payload corpo JSON enviado à function
 * @param {number} timeoutMs teto de espera (Lens costuma levar 4–10s)
 */
export async function chamarRuntimeBase44(nome, payload, timeoutMs = 25000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(`${BASE}/${APP_ID}/functions/${nome}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
      signal: ctrl.signal,
    });
    const texto = await resp.text();
    let json = null;
    try { json = JSON.parse(texto); } catch { json = null; }
    if (!json) throw new Error(`runtime Base44 devolveu resposta não-JSON (${resp.status})`);
    return json;
  } finally {
    clearTimeout(t);
  }
}

// Extrai SOMENTE URLs de imagem, aceitando os dois formatos existentes:
// Vercel devolve { images: [] }; o runtime Deno pode devolver { products: [{ imageUrl }] }.
export function urlsDeImagem(json) {
  const brutas = [
    ...(json?.images || []),
    ...(json?.products || []).map((p) => p?.imageUrl || p?.image),
  ];
  return brutas.filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u));
}