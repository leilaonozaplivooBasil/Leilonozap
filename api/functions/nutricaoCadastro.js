// 🌱 NUTRIÇÃO D+1 / D+3 — cron diário (28/09/2026). Regras e textos em
// api/_lib/nutricaoCadastro.js; o envio segue o da campanha do PS5
// (dispararCampanhaPs5.js): ofertas@, lotes na Brevo, descadastro do marketing.
//
// Travas:
//   • só quem se cadastrou há exatamente 1 ou 3 dias (calendário de Brasília);
//   • só cliente comum que ainda não pagou nada (depósito, pedido ou arremate);
//   • régua do público da campanha (e-mail válido, não interno, não descadastrado);
//   • 1x por pessoa por etapa (avisos_enviados);
//   • ?teste=<e-mail> manda as DUAS peças, só para caixas da casa.
import crypto from 'crypto';
import { registrarEmail, idDaBrevo } from '../_lib/registroDeEmail.js';
import { elegivel } from '../_lib/campanhaPs5.js';
import { ETAPAS, CHAVE, etapaDoDia, perfilDeCliente, montarNutricao } from '../_lib/nutricaoCadastro.js';
import { EMAILS_INTERNOS, normalizarEmail } from '../../scripts/campanha/publico.mjs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO = process.env.BREVO_API_KEY;
const SEGREDO = process.env.CAMPANHA_SECRET || SR;
const SITE = 'https://leilaonozap.net';
const DE = { name: 'Leilão NoZap', email: 'ofertas@leilaonozap.com' };
const RESPONDER = { name: 'Leilão NoZap', email: 'relacionamento@leilaonozap.com' };
const CAIXAS_DE_TESTE = ['leilaonozaplivoo@gmail.com', ...EMAILS_INTERNOS];
const PAGOS = 'paid,entregue,shipped,preparando,saiu_entrega,delivered';

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
// a MESMA assinatura do descadastrar.js e da campanha
const assinar = (v) => crypto.createHmac('sha256', String(SEGREDO)).update(String(v).trim().toLowerCase()).digest('hex').slice(0, 24);
const linkSaida = (email) => `${SITE}/api/functions/descadastrar?${new URLSearchParams({ email, t: assinar(email) })}`;
const ler = async (path) => { const r = await sb(path); const j = await r.json().catch(() => []); return Array.isArray(j) ? j : []; };
// o PostgREST devolve no máximo 1000 linhas por chamada: a lista de quem saiu vem em páginas
async function lerTodos(path, pagina = 1000) {
  const tudo = [];
  for (let offset = 0; offset < 50000; offset += pagina) {
    const rows = await ler(`${path}&limit=${pagina}&offset=${offset}`);
    tudo.push(...rows);
    if (rows.length < pagina) break;
  }
  return tudo;
}

async function mandarLote(etapa, pessoas, leiloes) {
  const versoes = pessoas.map((u) => {
    const email = normalizarEmail(u.email);
    const m = montarNutricao({ etapa, nome: u.display_first_name || u.full_name, leiloes, linkSaida: linkSaida(email) });
    return { to: [{ email, name: u.full_name || undefined }], subject: m.assunto, htmlContent: m.html, textContent: m.texto };
  });
  const base = montarNutricao({ etapa, leiloes });
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': BREVO, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: DE, replyTo: RESPONDER, subject: base.assunto, htmlContent: base.html, textContent: base.texto,
      headers: { 'List-Unsubscribe': `<mailto:${RESPONDER.email}?subject=SAIR>` },
      tags: [`nutricao-${etapa}`],
      messageVersions: versoes,
    }),
  });
  const corpo = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, corpo, assunto: base.assunto };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!SUPABASE_URL || !SR || !BREVO) return res.status(200).json({ success: false, error: 'config' });
    const leiloes = await ler('auctions?select=title,current_price,end_time&status=eq.active&or=(is_test_auction.is.null,is_test_auction.eq.false)&order=end_time.asc&limit=3');

    const teste = normalizarEmail(req.query?.teste || '');
    if (teste) {
      if (!CAIXAS_DE_TESTE.includes(teste)) return res.status(403).json({ success: false, error: 'teste_so_para_caixas_da_casa' });
      const out = {};
      for (const etapa of Object.keys(ETAPAS)) {
        const r = await mandarLote(etapa, [{ id: 'teste', email: teste, full_name: 'Teste' }], leiloes);
        await registrarEmail({ para: teste, assunto: `${r.assunto} (teste)`, tipo: 'campanha', ok: r.ok, messageId: idDaBrevo(r.corpo), erro: r.ok ? null : JSON.stringify(r.corpo || r.status), provedor: 'brevo' });
        out[etapa] = r.status;
      }
      return res.status(200).json({ success: true, teste, status: out });
    }

    // o cron é da Vercel; fora do teste, só ela chama
    if (process.env.CRON_SECRET && (req.headers?.authorization || '') !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ ok: false, error: 'nao_autorizado' });
    }

    const desde = new Date(Date.now() - 5 * 86400000).toISOString();
    const cadastros = await ler(`app_users?select=id,email,full_name,display_first_name,active,avisos_leilao,role,primary_career_level,created_at&created_at=gte.${desde}&email=not.is.null&limit=1000`);
    const agora = Date.now();
    const candidatos = cadastros.map((u) => ({ u, etapa: etapaDoDia(u.created_at, agora) })).filter((x) => x.etapa && perfilDeCliente(x.u));
    if (!candidatos.length) return res.status(200).json({ success: true, enviados: 0, motivo: 'ninguem_hoje' });

    const ids = candidatos.map((x) => x.u.id);
    const lista = ids.map(encodeURIComponent).join(',');
    const [pagaram, feitos, saidas] = await Promise.all([
      ler(`catalog_sales?select=buyer_id&buyer_id=in.(${lista})&status=in.(${PAGOS})&limit=1000`),
      ler(`avisos_enviados?select=user_id,tipo&user_id=in.(${lista})&tipo=in.(${ETAPAS.d1.tipo},${ETAPAS.d3.tipo})&limit=1000`),
      lerTodos('marketing_descadastro?select=email&order=email.asc'),
    ]);
    const jaPagou = new Set(pagaram.map((x) => String(x.buyer_id)));
    const descadastrados = new Set(saidas.map((s) => normalizarEmail(s.email)).filter(Boolean));
    const motivos = {}; const porEtapa = { d1: [], d3: [] }; const vistos = new Set();
    for (const { u, etapa } of candidatos) {
      const tipo = ETAPAS[etapa].tipo;
      const jaReceberam = new Set(feitos.filter((f) => f.tipo === tipo).map((f) => String(f.user_id)));
      if (jaPagou.has(String(u.id))) { motivos.ja_pagou = (motivos.ja_pagou || 0) + 1; continue; }
      const e = elegivel(u, { descadastrados, jaReceberam });
      if (!e.ok) { motivos[e.motivo] = (motivos[e.motivo] || 0) + 1; continue; }
      const email = normalizarEmail(u.email);
      if (vistos.has(email)) { motivos.repetido = (motivos.repetido || 0) + 1; continue; }
      vistos.add(email); porEtapa[etapa].push(u);
    }

    const resultado = {};
    for (const etapa of Object.keys(porEtapa)) {
      const fila = porEtapa[etapa]; let enviados = 0; let falhas = 0;
      for (let i = 0; i < fila.length; i += 50) {
        const lote = fila.slice(i, i + 50);
        const r = await mandarLote(etapa, lote, leiloes);
        if (r.ok) {
          enviados += lote.length;
          await sb('avisos_enviados', { method: 'POST', headers: { Prefer: 'return=minimal,resolution=ignore-duplicates' }, body: JSON.stringify(lote.map((u) => ({ user_id: u.id, tipo: ETAPAS[etapa].tipo, chave: CHAVE, enviado_em: new Date().toISOString() }))) });
        } else {
          falhas += lote.length;
          console.error(`[NUTRIÇÃO ${etapa}] Brevo recusou ${lote.length}: HTTP ${r.status} ${JSON.stringify(r.corpo || '').slice(0, 200)}`);
        }
        for (const u of lote) {
          registrarEmail({ para: normalizarEmail(u.email), assunto: r.assunto, tipo: 'campanha', ok: r.ok, messageId: r.ok ? idDaBrevo(r.corpo) : null, erro: r.ok ? null : `HTTP ${r.status}`, provedor: 'brevo', atorId: u.id }).catch(() => {});
        }
        if (!r.ok) break;
      }
      resultado[etapa] = { fila: fila.length, enviados, falhas };
    }
    console.log(`[NUTRIÇÃO] ${JSON.stringify(resultado)} · fora: ${JSON.stringify(motivos)}`);
    return res.status(200).json({ success: true, ...resultado, fora: motivos });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
