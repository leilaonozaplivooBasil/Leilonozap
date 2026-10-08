// importarProdutoPeloLink — lê a PÁGINA do anúncio e devolve a ficha do produto
// (título, descrição, marca, modelo, peso e medidas, fotos). NUNCA grava nada:
// quem grava é a tela, depois que a pessoa conferiu (salvarProdutoDoLeilao).
//
// 📦 DIR-207 (08/10/2026) — "a IA não está botando o peso correto".
// Diagnóstico: nenhuma rota lia a página do link. extractMLImages é stub
// ("ml_bloqueado"), e o único peso que entrava era chute da IA pelo título,
// gravado como se fosse medida. 2.819 dos 2.858 produtos sem peso.
//
// Dois caminhos, e a resposta DIZ qual foi (`fonte`):
//   'pagina'     → a página abriu, tinha texto, e a IA COPIOU os números da
//                  ficha técnica (encontrado_na_pagina = true).
//   'estimativa' → a página não abriu (403, timeout, não é HTML) ou não trazia
//                  medidas: a IA estima pelo nome, com confiança baixa/média,
//                  e a tela mostra "estimativa, conferir" em vez de fingir.
// Mesmo motor do InvokeLLM (api/_lib/ia.js; output_config.format json_schema
// com a mesma rede de segurança quando a API recusa o schema).
import { exigirSessao } from '../_lib/sessao.js';
import { resolverIA, clienteIA, opcoesDeReserva, detalhesDoErro, Anthropic } from '../_lib/ia.js';
import { buscarPagina, textoDaPagina, SCHEMA_DA_FICHA, montarPromptDaFicha, montarPromptDaEstimativa, sanearFicha, medidasDoJsonLd } from '../_lib/fichaDaPagina.js';

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];

// Os MESMOS modelos do InvokeLLM: texto é o forte do Sonnet, e a ficha é texto.
const MODEL_DIRETO = process.env.AI_MODEL_TEXT_ANTHROPIC || 'claude-sonnet-5';
const MODEL_GATEWAY = process.env.AI_MODEL_TEXT || 'anthropic/claude-sonnet-5';
const MODEL_GATEWAY_RESERVA = process.env.AI_MODEL_TEXT_RESERVA || 'anthropic/claude-haiku-4-5';

const SISTEMA = 'Você é um assistente da Leilão NoZap que preenche fichas de produto. Responda em português do Brasil. Nunca invente número de peso ou medida: se não está no texto, devolva null.';

/** Texto útil de verdade: menos que isto é página de bloqueio/captcha/"ative o JavaScript". */
const MINIMO_DE_TEXTO = 200;

function jsonDoTexto(texto) {
  let clean = String(texto || '').replace(/```(json)?/gi, '').trim();
  const a = clean.indexOf('{'); const b = clean.lastIndexOf('}');
  if (a >= 0 && b > a) clean = clean.slice(a, b + 1);
  try { return JSON.parse(clean); } catch { return null; }
}
const textoDe = (m) => (m?.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

/** Pergunta à IA no formato SCHEMA_DA_FICHA. Mesma rede de segurança do InvokeLLM. */
async function perguntarIA(ia, prompt) {
  const client = clienteIA(ia);
  const base = { model: ia.model, max_tokens: 2000, system: SISTEMA, messages: [{ role: 'user', content: prompt }], ...opcoesDeReserva(ia) };
  let m;
  try {
    m = await client.messages.create({ ...base, output_config: { format: { type: 'json_schema', schema: SCHEMA_DA_FICHA } } });
  } catch (e) {
    if (!(e instanceof Anthropic.BadRequestError)) {
      const d = detalhesDoErro(e);
      console.error('[importarProdutoPeloLink] IA falhou', { via: ia.via, model: ia.model, ...d });
      return { ok: false, error: 'IA indisponível', details: d };
    }
    // 🪢 schema recusado pela API (forma não suportada) → refaz UMA vez sem o formato e faz o parse do texto.
    console.warn('[importarProdutoPeloLink] schema recusado pela API, refazendo sem output_config.format', String(e.message || '').slice(0, 200));
    try {
      m = await client.messages.create({ ...base, system: `${SISTEMA} Responda SOMENTE com um JSON válido que satisfaça este schema (sem markdown, sem texto fora do JSON):\n${JSON.stringify(SCHEMA_DA_FICHA)}` });
    } catch (e2) {
      const d = detalhesDoErro(e2);
      console.error('[importarProdutoPeloLink] IA falhou (2ª tentativa)', { via: ia.via, model: ia.model, ...d });
      return { ok: false, error: 'IA indisponível', details: d };
    }
  }
  if (m.stop_reason === 'refusal') return { ok: false, error: 'A IA não pôde responder a este pedido.', details: { stop_reason: m.stop_reason } };
  const obj = jsonDoTexto(textoDe(m));
  if (!obj) return { ok: false, error: m.stop_reason === 'max_tokens' ? 'A resposta da IA foi cortada (max_tokens)' : 'IA não retornou JSON válido', details: { stop_reason: m.stop_reason } };
  return { ok: true, obj, model: m.model };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET') {
    const ia = await resolverIA({ modelDireto: MODEL_DIRETO, modelGateway: MODEL_GATEWAY, reserva: MODEL_GATEWAY_RESERVA });
    return res.status(200).json({ ok: true, tem_ia: Boolean(ia), model: ia?.model || null, via: ia?.via || null });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actor_id || body?.actorId || '').trim();
    const _ses = exigirSessao(req, actorId, 'importarProdutoPeloLink');
    if (!_ses.liberado) return res.status(_ses.http).json({ ok: false, error: 'nao_autenticado' });
    const url = String(body?.url || '').trim();
    const tituloDoCorpo = String(body?.titulo || '').trim().slice(0, 300);
    if (!actorId || (!url && !tituloDoCorpo)) return res.status(400).json({ ok: false, error: 'actor_id e url (ou titulo) obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ ok: false, error: 'Config ausente' });

    // guard — o mesmo do productAdminAction: admin/super_admin ou cargo de estoque
    const actorArr = await (await sb(`app_users?select=id,role,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    const podeEstoque = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
    if (!podeEstoque) return res.status(403).json({ ok: false, error: 'Sem permissão' });

    // 1) a página
    let host = '';
    try { host = url ? new URL(url).hostname : ''; } catch { host = ''; }
    const pag = url ? await buscarPagina(url) : { ok: false, status: 0, html: '', finalUrl: '', erro: 'sem_url' };
    const lida = pag.ok ? textoDaPagina(pag.html, { url: pag.finalUrl || url }) : null;
    const temTexto = Boolean(lida && (lida.texto.length >= MINIMO_DE_TEXTO || lida.jsonLd));
    const titulo = tituloDoCorpo || lida?.titulo || '';
    const fotos = lida?.imagens || [];
    const pagina = { status: pag.status, host, lida: temTexto, erro: pag.ok ? (temTexto ? null : 'sem_texto_util') : pag.erro };

    // 2) a IA
    const ia = await resolverIA({ modelDireto: MODEL_DIRETO, modelGateway: MODEL_GATEWAY, reserva: MODEL_GATEWAY_RESERVA });
    if (!ia) {
      // Sem IA ainda dá para aproveitar o que a página DECLARA (JSON-LD, título, meta).
      const doLd = medidasDoJsonLd(lida?.jsonLd);
      const ficha = sanearFicha({ titulo, descricao: lida?.jsonLd?.description || lida?.descricaoMeta || '', marca: lida?.jsonLd?.brand || null, modelo: lida?.jsonLd?.model || null, ...(doLd || {}), encontrado_na_pagina: Boolean(doLd), confianca: doLd ? 'media' : 'baixa', observacao: 'IA não conectada: li só o que a página declara nos dados estruturados.' }, { fonte: temTexto ? 'pagina' : 'estimativa' });
      ficha.avisos.unshift('IA não conectada (configure ANTHROPIC_API_KEY ou AI_GATEWAY_API_KEY).');
      console.warn('[importarProdutoPeloLink] sem IA', { host, status: pag.status, fonte: ficha.fonte });
      return res.status(200).json({ ok: true, ...ficha, pagina, fotos, needs_key: true });
    }

    if (!temTexto && !titulo) {
      return res.status(200).json({ ok: false, error: 'Não consegui ler a página e não tenho um título para estimar.', details: { pagina }, fotos });
    }

    const prompt = temTexto ? montarPromptDaFicha({ url: pag.finalUrl || url, titulo, pagina: lida }) : montarPromptDaEstimativa({ titulo });
    const r = await perguntarIA(ia, prompt);
    if (!r.ok) return res.status(200).json({ ok: false, error: r.error, details: { ...(r.details || {}), pagina }, fotos, titulo });

    const ficha = sanearFicha(r.obj, { fonte: temTexto ? 'pagina' : 'estimativa' });
    if (!ficha.titulo) ficha.titulo = titulo;
    if (!temTexto) ficha.avisos.unshift(pag.erro === 'origem_403' || pag.erro === 'demorou_demais'
      ? 'A página não abriu para o nosso servidor (bloqueio ou demora): peso e medidas são estimativa pelo nome.'
      : 'A página não trouxe texto útil: peso e medidas são estimativa pelo nome.');
    console.log('[importarProdutoPeloLink]', { fonte: ficha.fonte, host, status: pag.status, lida: temTexto, confianca: ficha.confianca, fotos: fotos.length, model: r.model });
    return res.status(200).json({ ok: true, ...ficha, pagina, fotos });
  } catch (e) {
    console.error('[importarProdutoPeloLink] erro inesperado', String(e?.message || e));
    return res.status(200).json({ ok: false, error: 'Erro ao importar pelo link', details: String(e?.message || e).slice(0, 300) });
  }
}
