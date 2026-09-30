// 📦 rastrearPedido — a situação REAL da entrega, direto da transportadora, pra tela
// "Acompanhar Pedido" (DIR-187, 30/09/2026).
//
// 🔴 POR QUE EXISTE: o cliente Herbert leu "Entregue! 🎉" no site enquanto os Correios
// diziam "endereço inexistente". A tela traduzia o status de PAGAMENTO ('entregue' =
// venda paga, herança do Base44) como status de ENTREGA, e mostrava o número interno
// LZ… como se fosse código de rastreio. Ele mandou o print no grupo. Ninguém mais
// pode passar por isso.
//
// O que esta rota faz, nesta ordem, tudo best-effort (falha em uma fonte não derruba
// as outras — o cliente sempre recebe o que foi possível apurar):
//   1. carrega a venda (service_role) — só os campos da entrega, nunca dinheiro;
//   2. pergunta ao Melhor Envio (tracking + detalhe do pedido → transportadora/serviço);
//   3. pergunta ao Melhor Rastreio (rastreador público do Melhor Envio) os eventos
//      da transportadora — a API pública dos Correios recusa servidor (403), esta não;
//   4. deriva a situação com a MESMA biblioteca que a tela usa (src/lib/rastreio.js);
//   5. guarda o resultado em raw_base44.rastreio (cache de 5 min) e, quando a
//      transportadora PROVA algo, grava tracking_code/carrier/shipped_at/delivered_at/
//      fulfillment_status. NUNCA mexe em `status` (pagamento) nem em valores.
//
// Público como getCatalogOrderById (o link do pedido é o que o cliente tem em mãos),
// com limite por IP e por pedido pra ninguém usar isto como proxy dos Correios.
import { getAccessToken, baseUrl, ambienteAtual, UA } from '../_lib/melhorEnvioShipment.js';
import { ipDoRequest, estourouLimite } from '../_lib/rateLimit.js';
import {
  situacaoDaEntrega, codigoReal, linksDeRastreio, ordenarEventos, eventosDoMelhorRastreio, tipoDoRastreador,
  ehCodigoCorreios, ehCodigoInterno, numeroInternoDoPedido,
} from '../../src/lib/rastreio.js';

const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CACHE_SEG = 5 * 60;
const CAMPOS = 'id,status,fulfillment_status,shipped_at,delivered_at,tracking_code,carrier,product_title,created_at,created_date,buyer_address,raw_base44';

/** O endereço que foi para a etiqueta, em uma linha — o cliente precisa conferir com os próprios olhos. */
function enderecoDeEnvio(sale, raw) {
  if (sale?.buyer_address) return String(sale.buyer_address);
  const a = raw?.address && typeof raw.address === 'object' ? raw.address : null;
  if (!a) return '';
  const rua = [a.street, a.number].filter(Boolean).join(', ');
  const compl = a.complement ? ` — ${a.complement}` : '';
  const cidade = [a.neighborhood, [a.city, a.state].filter(Boolean).join('/')].filter(Boolean).join(', ');
  return [rua + compl, cidade, a.zip ? `CEP ${a.zip}` : ''].filter(Boolean).join(' · ');
}

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

async function comTempo(url, opts = {}, ms = 7000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ---- Melhor Envio -----------------------------------------------------------
async function consultarMelhorEnvio(orderId, ambiente) {
  const out = { tracking: null, pedido: null, erro: null };
  if (!orderId) return out;
  try {
    const token = await getAccessToken(ambiente);
    if (!token) { out.erro = 'sem_token'; return out; }
    const headers = { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'User-Agent': UA };
    const API = `${baseUrl(ambiente)}/api/v2/me`;
    const [rt, rp] = await Promise.allSettled([
      comTempo(`${API}/shipment/tracking`, { method: 'POST', headers, body: JSON.stringify({ orders: [orderId] }) }),
      comTempo(`${API}/orders/${encodeURIComponent(orderId)}`, { headers }),
    ]);
    if (rt.status === 'fulfilled' && rt.value.ok) {
      const j = await rt.value.json().catch(() => null);
      const t = j && (j[orderId] || Object.values(j)[0]);
      if (t && typeof t === 'object') {
        out.tracking = {
          status: t.status || null, tracking: t.tracking || null, melhorenvio_tracking: t.melhorenvio_tracking || null,
          generated_at: t.generated_at || null, posted_at: t.posted_at || null, delivered_at: t.delivered_at || null,
          canceled_at: t.canceled_at || null, expired_at: t.expired_at || null,
        };
      }
    } else if (rt.status === 'fulfilled') {
      out.erro = `tracking_http_${rt.value.status}`;
    } else {
      out.erro = 'tracking_falhou';
    }
    if (rp.status === 'fulfilled' && rp.value.ok) {
      const p = await rp.value.json().catch(() => null);
      if (p && typeof p === 'object') {
        out.pedido = {
          transportadora: p?.service?.company?.name || null,
          servico: p?.service?.name || null,
          tracking: p?.tracking || null,
          status: p?.status || null,
          posted_at: p?.posted_at || null,
          delivered_at: p?.delivered_at || null,
          tracking_url: p?.tracking_url || null,
        };
      }
    }
  } catch (e) {
    out.erro = String(e?.message || e).slice(0, 120);
  }
  return out;
}

// ---- Melhor Rastreio (rastreador público do Melhor Envio) --------------------
// Os Correios respondem 403 a qualquer consulta feita por servidor (testado 30/09/2026
// com vários User-Agents). O Melhor Rastreio expõe os mesmos eventos, sem token.
const MELHOR_RASTREIO = 'https://api.melhorrastreio.com.br/graphql';
const QUERY_RASTREIO = 'mutation($tracker: TrackerSearchInput!){ result: searchParcel(tracker:$tracker){ id lastStatus postedAt receivedAt updatedAt trackingEvents { createdAt registeredAt title description notes from to status trackerType } } }';
async function consultarMelhorRastreio(codigo, tipo) {
  if (!codigo) return { eventos: [], parcel: null, erro: null };
  try {
    const r = await comTempo(MELHOR_RASTREIO, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({ query: QUERY_RASTREIO, variables: { tracker: { trackingCode: codigo, type: tipo } } }),
    }, 8000);
    if (!r.ok) return { eventos: [], parcel: null, erro: `melhor_rastreio_http_${r.status}` };
    const j = await r.json().catch(() => null);
    const parcel = j?.data?.result || null;
    if (!parcel) return { eventos: [], parcel: null, erro: j?.errors?.[0]?.message ? String(j.errors[0].message).slice(0, 120) : 'sem_resultado' };
    return { eventos: eventosDoMelhorRastreio(j), parcel: { lastStatus: parcel.lastStatus || null, postedAt: parcel.postedAt || null, receivedAt: parcel.receivedAt || null, updatedAt: parcel.updatedAt || null }, erro: null };
  } catch (e) {
    return { eventos: [], parcel: null, erro: String(e?.message || e).slice(0, 120) };
  }
}

function eventosDoMelhorEnvio(me) {
  const evs = [];
  const t = me?.tracking || {};
  if (t.posted_at) evs.push({ descricao: 'Objeto postado', detalhe: 'Registrado pelo Melhor Envio', data: t.posted_at, local: '', fonte: 'melhor_envio' });
  if (t.delivered_at) evs.push({ descricao: 'Objeto entregue ao destinatário', detalhe: 'Confirmado pelo Melhor Envio', data: t.delivered_at, local: '', fonte: 'melhor_envio' });
  if (t.canceled_at) evs.push({ descricao: 'Envio cancelado', detalhe: 'Registrado pelo Melhor Envio', data: t.canceled_at, local: '', fonte: 'melhor_envio' });
  return evs;
}

function montarResposta(sale, r) {
  const numeroInterno = numeroInternoDoPedido(sale.id);
  const raw = (sale.raw_base44 && typeof sale.raw_base44 === 'object') ? sale.raw_base44 : {};
  const links = linksDeRastreio({ codigo: r.codigo, transportadora: r.transportadora, melhorEnvioTrackingUrl: r.melhor_envio?.tracking_url || null });
  return {
    success: true,
    sale_id: sale.id,
    codigo: r.codigo || '',
    codigo_interno: numeroInterno,
    transportadora: r.transportadora || '',
    servico: r.servico || '',
    links,
    melhor_envio: r.melhor_envio || null,
    eventos: r.eventos || [],
    situacao: r.situacao,
    consultado_em: r.consultado_em,
    fonte: r.fonte || [],
    avisos: r.avisos || [],
    endereco_envio: enderecoDeEnvio(sale, raw),
    entrega: { fulfillment_status: sale.fulfillment_status, shipped_at: sale.shipped_at, delivered_at: sale.delivered_at, carrier: sale.carrier, tracking_code: sale.tracking_code },
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const saleId = String(body?.sale_id || '').trim();
    const forcar = Boolean(body?.forcar);
    if (!saleId || saleId.length > 64 || !/^[0-9a-zA-Z-]+$/.test(saleId)) return res.status(400).json({ success: false, error: 'sale_id obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const ip = ipDoRequest(req);
    if (await estourouLimite(`rastreio:ip:${ip}`, 60, 60)) return res.status(429).json({ success: false, error: 'Muitas consultas. Aguarde um minuto.' });

    const rows = await (await sb(`catalog_sales?select=${CAMPOS}&id=eq.${encodeURIComponent(saleId)}&limit=1`)).json();
    const sale = Array.isArray(rows) ? rows[0] : null;
    if (!sale) return res.status(200).json({ success: false, error: 'Pedido não encontrado' });

    const raw = (sale.raw_base44 && typeof sale.raw_base44 === 'object') ? sale.raw_base44 : {};
    const cache = raw.rastreio && typeof raw.rastreio === 'object' ? raw.rastreio : null;
    const idadeCache = cache?.consultado_em ? (Date.now() - new Date(cache.consultado_em).getTime()) / 1000 : Infinity;
    const finalizado = ['entregue', 'cancelado'].includes(cache?.situacao?.etapa);

    // cache fresco (ou pedido já encerrado há mais de um dia) → responde sem sair de casa
    if (cache && !forcar && (idadeCache < CACHE_SEG || (finalizado && idadeCache < 86400))) {
      return res.status(200).json(montarResposta(sale, cache));
    }
    if (forcar && await estourouLimite(`rastreio:pedido:${sale.id}`, 6, 60)) {
      if (cache) return res.status(200).json(montarResposta(sale, cache));
      return res.status(429).json({ success: false, error: 'Aguarde um minuto para consultar de novo.' });
    }

    const ambiente = raw?.melhor_envio?.ambiente || ambienteAtual();
    const meOrderId = raw?.melhor_envio?.order_id || null;
    const me = await consultarMelhorEnvio(meOrderId, ambiente);
    // 🔴 Etiqueta cancelada no Melhor Envio = o Melhor Envio deixou de ser fonte (o objeto
    // pode ter seguido por outra transportadora — foi o caso do Herbert: etiqueta J&T
    // cancelada, objeto postado nos Correios). Nunca vira "pedido cancelado".
    const etiquetaCancelada = Boolean(me.tracking?.canceled_at) || me.tracking?.status === 'canceled' || me.pedido?.status === 'canceled';
    const meBruto = me.tracking
      ? { ...me.tracking, tracking_url: me.pedido?.tracking_url || null }
      : (me.pedido ? { status: me.pedido.status, tracking: me.pedido.tracking, posted_at: me.pedido.posted_at, delivered_at: me.pedido.delivered_at, tracking_url: me.pedido.tracking_url } : null);
    const melhorEnvio = meBruto
      ? (etiquetaCancelada ? { status: 'canceled', etiqueta_cancelada: true, tracking: null, posted_at: null, delivered_at: null, canceled_at: meBruto.canceled_at || null } : meBruto)
      : null;

    const codigo = codigoReal({ tracking_code: sale.tracking_code, melhorEnvio });
    const transportadora = (!etiquetaCancelada && me.pedido?.transportadora)
      || (ehCodigoCorreios(codigo) ? 'Correios' : '')
      || sale.carrier
      || raw?.frete?.empresa || '';
    const servico = (!etiquetaCancelada && me.pedido?.servico) || (ehCodigoCorreios(codigo) ? '' : raw?.frete?.servico) || '';

    const rastreador = await consultarMelhorRastreio(codigo, tipoDoRastreador({ codigo, transportadora }));
    const eventos = ordenarEventos([...rastreador.eventos, ...(rastreador.eventos.length ? [] : eventosDoMelhorEnvio({ tracking: melhorEnvio }))]);
    const situacao = situacaoDaEntrega({
      status: sale.status, fulfillment_status: sale.fulfillment_status, shipped_at: sale.shipped_at, delivered_at: sale.delivered_at,
      tracking_code: sale.tracking_code, melhorEnvio, eventos,
    });
    const fonte = [];
    if (rastreador.eventos.some((e) => e.fonte === 'correios')) fonte.push('correios');
    if (rastreador.eventos.length) fonte.push('melhor_rastreio');
    if (me.tracking || me.pedido) fonte.push('melhor_envio');
    const avisos = [me.erro ? `melhor_envio:${me.erro}` : null, rastreador.erro ? `melhor_rastreio:${rastreador.erro}` : null].filter(Boolean);
    const postadoEm = melhorEnvio?.posted_at || rastreador.parcel?.postedAt || null;

    const resultado = {
      consultado_em: new Date().toISOString(), codigo, transportadora, servico, melhor_envio: melhorEnvio, eventos: eventos.slice(0, 40), situacao, fonte, avisos,
      postado_em: postadoEm, rastreador: rastreador.parcel,
    };

    // 🔒 Só o que a transportadora PROVOU — e nunca o status de pagamento.
    const patch = {};
    if (codigo && (ehCodigoInterno(sale.tracking_code) || !sale.tracking_code)) patch.tracking_code = codigo;
    if (transportadora && transportadora !== sale.carrier) patch.carrier = transportadora;
    if (situacao.etapa === 'entregue' && situacao.quando && !sale.delivered_at) {
      patch.delivered_at = situacao.quando;
      patch.fulfillment_status = 'entregue';
    } else if (['postado', 'em_transito', 'saiu_entrega', 'problema'].includes(situacao.etapa)) {
      if (!sale.shipped_at && (postadoEm || eventos.length)) patch.shipped_at = postadoEm || eventos[eventos.length - 1]?.data || null;
      if (!patch.shipped_at) delete patch.shipped_at;
      if (['a_enviar', 'preparando', null, undefined, ''].includes(sale.fulfillment_status)) patch.fulfillment_status = situacao.etapa === 'saiu_entrega' ? 'saiu_entrega' : 'enviado';
      if (situacao.etapa === 'saiu_entrega' && sale.fulfillment_status === 'enviado') patch.fulfillment_status = 'saiu_entrega';
    }
    patch.raw_base44 = { ...raw, rastreio: resultado };
    await sb(`catalog_sales?id=eq.${encodeURIComponent(sale.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) }).catch(() => null);

    const saleAtual = { ...sale, ...patch };
    return res.status(200).json(montarResposta(saleAtual, resultado));
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao consultar a transportadora', details: String(e?.message || e).slice(0, 200) });
  }
}
