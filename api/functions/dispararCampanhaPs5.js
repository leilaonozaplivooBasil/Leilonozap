// 📣 DISPARO DA CAMPANHA DO PS5 (26/09/2026) — roda pelo cron da Vercel, na janela.
//
// Por que pelo servidor: a chave da Brevo e a service role só existem na
// Vercel. O scripts/campanha/disparar.mjs faz a mesma coisa da máquina de quem
// tem as chaves — hoje ninguém tem, e o dono quer o disparo hoje.
//
// Travas:
//   • só na JANELA (dia e hora de Brasília, api/_lib/campanhaPs5.js);
//   • cada pessoa recebe UMA vez (avisos_enviados tipo/chave únicos);
//   • no máximo POR_EXECUCAO pessoas por rodada — o cron volta em 5 min;
//   • público pela MESMA régua do scripts/campanha/publico.mjs (sem e-mail
//     inventado, sem caixa de teste, sem caixa interna, sem descadastrado);
//   • ?teste=<e-mail> manda UMA peça só, e só para caixas da casa.
import crypto from 'crypto';
import { registrarEmail, idDaBrevo } from '../_lib/registroDeEmail.js';
import { TIPO, CHAVE, JANELA, POR_EXECUCAO, POR_CHAMADA_BREVO, dentroDaJanela, elegivel, montarEmailPs5 } from '../_lib/campanhaPs5.js';
import { EMAILS_INTERNOS, normalizarEmail } from '../../scripts/campanha/publico.mjs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO = process.env.BREVO_API_KEY;
const SEGREDO = process.env.CAMPANHA_SECRET || SR;
const SITE = 'https://leilaonozap.net';
const DE = { name: 'Leilão NoZap', email: 'ofertas@leilaonozap.com' };
const RESPONDER = { name: 'Leilão NoZap', email: 'relacionamento@leilaonozap.com' };
const CAIXAS_DE_TESTE = ['leilaonozaplivoo@gmail.com', ...EMAILS_INTERNOS];

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
// a MESMA assinatura do descadastrar.js e do scripts/campanha/disparar.mjs
const assinar = (v) => crypto.createHmac('sha256', String(SEGREDO)).update(String(v).trim().toLowerCase()).digest('hex').slice(0, 24);
const linkSaida = (email) => `${SITE}/api/functions/descadastrar?${new URLSearchParams({ email, t: assinar(email) })}`;

async function lerTodos(path, pagina = 1000) {
  const tudo = [];
  for (let offset = 0; offset < 20000; offset += pagina) {
    const r = await sb(`${path}&limit=${pagina}&offset=${offset}`);
    const rows = await r.json().catch(() => []);
    if (!Array.isArray(rows) || !rows.length) break;
    tudo.push(...rows);
    if (rows.length < pagina) break;
  }
  return tudo;
}

async function mandarLote(pessoas) {
  const versoes = pessoas.map((u) => {
    const email = normalizarEmail(u.email);
    const m = montarEmailPs5({ nome: u.display_first_name || u.full_name, linkSaida: linkSaida(email) });
    return { to: [{ email, name: u.full_name || undefined }], subject: m.assunto, htmlContent: m.html, textContent: m.texto };
  });
  const base = montarEmailPs5({});
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': BREVO, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: DE, replyTo: RESPONDER, subject: base.assunto, htmlContent: base.html, textContent: base.texto,
      headers: { 'List-Unsubscribe': `<mailto:${RESPONDER.email}?subject=SAIR>` },
      tags: ['campanha-ps5'],
      messageVersions: versoes,
    }),
  });
  const corpo = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, corpo };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!SUPABASE_URL || !SR || !BREVO) return res.status(200).json({ success: false, error: 'config' });
    const teste = normalizarEmail(req.query?.teste || '');
    if (teste) {
      if (!CAIXAS_DE_TESTE.includes(teste)) return res.status(403).json({ success: false, error: 'teste_so_para_caixas_da_casa' });
      const r = await mandarLote([{ id: 'teste', email: teste, full_name: 'Teste' }]);
      await registrarEmail({ para: teste, assunto: 'Campanha PS5 (teste)', tipo: 'campanha', ok: r.ok, messageId: idDaBrevo(r.corpo), erro: r.ok ? null : JSON.stringify(r.corpo || r.status), provedor: 'brevo' });
      return res.status(200).json({ success: r.ok, teste, status: r.status });
    }
    if (!dentroDaJanela(Date.now())) return res.status(200).json({ success: true, enviados: 0, motivo: 'fora_da_janela', janela: JANELA });

    const [pessoas, saidas, feitos] = await Promise.all([
      lerTodos('app_users?select=id,email,full_name,display_first_name,active,avisos_leilao&email=not.is.null&order=created_at.asc'),
      lerTodos('marketing_descadastro?select=email'),
      lerTodos(`avisos_enviados?select=user_id&tipo=eq.${TIPO}&chave=eq.${CHAVE}`),
    ]);
    const descadastrados = new Set(saidas.map((s) => normalizarEmail(s.email)).filter(Boolean));
    const jaReceberam = new Set(feitos.map((f) => String(f.user_id)));
    const motivos = {};
    const fila = [];
    const vistos = new Set();
    for (const u of pessoas) {
      const e = elegivel(u, { descadastrados, jaReceberam });
      if (!e.ok) { motivos[e.motivo] = (motivos[e.motivo] || 0) + 1; continue; }
      const email = normalizarEmail(u.email);
      if (vistos.has(email)) { motivos.repetido = (motivos.repetido || 0) + 1; continue; }
      vistos.add(email); fila.push(u);
    }
    const rodada = fila.slice(0, POR_EXECUCAO);
    let enviados = 0; let falhas = 0;
    for (let i = 0; i < rodada.length; i += POR_CHAMADA_BREVO) {
      const lote = rodada.slice(i, i + POR_CHAMADA_BREVO);
      const r = await mandarLote(lote);
      const agora = new Date().toISOString();
      if (r.ok) {
        enviados += lote.length;
        await sb('avisos_enviados', { method: 'POST', headers: { Prefer: 'return=minimal,resolution=ignore-duplicates' }, body: JSON.stringify(lote.map((u) => ({ user_id: u.id, tipo: TIPO, chave: CHAVE, enviado_em: agora }))) });
      } else {
        falhas += lote.length;
        console.error(`[CAMPANHA PS5] Brevo recusou um lote de ${lote.length}: HTTP ${r.status} ${JSON.stringify(r.corpo || '').slice(0, 200)}`);
      }
      for (const u of lote) {
        registrarEmail({ para: normalizarEmail(u.email), assunto: 'Campanha PS5 — encerra hoje às 18h', tipo: 'campanha', ok: r.ok, messageId: r.ok ? idDaBrevo(r.corpo) : null, erro: r.ok ? null : `HTTP ${r.status}`, provedor: 'brevo', atorId: u.id }).catch(() => {});
      }
      if (!r.ok) break; // não insiste numa Brevo que está recusando — o cron volta em 5 min
    }
    console.log(`[CAMPANHA PS5] fila ${fila.length} · rodada ${rodada.length} · enviados ${enviados} · falhas ${falhas} · fora: ${JSON.stringify(motivos)}`);
    return res.status(200).json({ success: true, fila: fila.length, enviados, falhas, restam: Math.max(0, fila.length - enviados), fora: motivos });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
