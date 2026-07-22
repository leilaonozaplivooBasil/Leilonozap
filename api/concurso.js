// Concurso Leilão NoZap — API única (registro, ranking, join, prêmios do admin).
// Usa a service key (bypassa RLS). CPF e WhatsApp NUNCA são expostos no ranking público.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GROUP_LINK = 'https://chat.whatsapp.com/FyKc2sXiB5fBG7ikYlmvri?s=cl&p=i&mlu=4';

const sb = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });

const digits = (s) => String(s || '').replace(/\D/g, '');

function cpfValido(cpf) {
  cpf = digits(cpf);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (base) => {
    let soma = 0;
    for (let i = 0; i < base; i++) soma += parseInt(cpf[i]) * (base + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(cpf[9]) && calc(10) === parseInt(cpf[10]);
}

const slug = (s) =>
  String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 10);

function genCode(nome) {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let r = '';
  for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return `${slug(nome.split(' ')[0]) || 'user'}${r}`;
}

async function jset(res, code, obj) {
  res.status(code).setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  try {
    if (!SUPABASE_URL || !SR) return jset(res, 500, { error: 'config' });
    const action = (req.query?.action || '').toString();
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    // ---------- RANKING (público) ----------
    if (req.method === 'GET' || action === 'ranking') {
      const r = await sb('concurso_participantes?select=code,nome,pontos&order=pontos.desc,created_at.asc&limit=100');
      const parts = (await r.json()) || [];
      const p = await sb('concurso_premios?select=posicao,premio&order=posicao');
      const premios = (await p.json()) || [];
      const ranking = parts.map((x, i) => ({ posicao: i + 1, nome: x.nome, pontos: x.pontos, code: x.code }));
      return jset(res, 200, { ranking, premios, group_link: GROUP_LINK, total: parts.length });
    }

    // ---------- REGISTRO ----------
    if (action === 'register') {
      const nome = (body.nome || '').toString().trim();
      const cpf = digits(body.cpf);
      const whatsapp = digits(body.whatsapp);
      if (nome.length < 3) return jset(res, 400, { error: 'Informe seu nome completo.' });
      if (!cpfValido(cpf)) return jset(res, 400, { error: 'CPF inválido.' });
      if (whatsapp.length < 10 || whatsapp.length > 13) return jset(res, 400, { error: 'WhatsApp inválido (com DDD).' });

      // já existe? devolve o mesmo code (re-login pelo CPF)
      const ex = await (await sb(`concurso_participantes?select=code,nome&cpf=eq.${cpf}&limit=1`)).json();
      if (Array.isArray(ex) && ex[0]) return jset(res, 200, { code: ex[0].code, nome: ex[0].nome, ja_existia: true });

      let code = genCode(nome);
      for (let t = 0; t < 4; t++) {
        const r = await sb('concurso_participantes', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ code, nome, cpf, whatsapp }),
        });
        if (r.status === 201) {
          const row = (await r.json())[0];
          return jset(res, 200, { code: row.code, nome: row.nome });
        }
        const txt = await r.text();
        if (txt.includes('concurso_participantes_cpf_key')) return jset(res, 400, { error: 'Esse CPF já está participando.' });
        if (txt.includes('concurso_participantes_code_key')) { code = genCode(nome); continue; } // colisão de code, tenta outro
        return jset(res, 500, { error: 'Erro ao salvar. Tente de novo.' });
      }
      return jset(res, 500, { error: 'Não foi possível gerar seu link. Tente de novo.' });
    }

    // ---------- JOIN (alguém entrou pelo link de um participante) ----------
    if (action === 'join') {
      const ref = (body.ref || '').toString().trim();
      const visitor = (body.visitor_id || '').toString().trim().slice(0, 80);
      if (!ref || !visitor) return jset(res, 400, { error: 'dados' });
      const pr = await (await sb(`concurso_participantes?select=code,nome&code=eq.${encodeURIComponent(ref)}&limit=1`)).json();
      if (!Array.isArray(pr) || !pr[0]) return jset(res, 200, { ok: false, group_link: GROUP_LINK });
      // grava referral (dedup por visitante); ignora conflito
      await sb('concurso_referrals', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify({ referrer_code: ref, visitor_id: visitor }),
      });
      // recomputa pontos = total de referrals únicos
      const cnt = await sb(`concurso_referrals?select=id&referrer_code=eq.${encodeURIComponent(ref)}`, { headers: { Prefer: 'count=exact' } });
      const range = cnt.headers.get('content-range') || '*/0';
      const pontos = parseInt(range.split('/')[1] || '0', 10);
      await sb(`concurso_participantes?code=eq.${encodeURIComponent(ref)}`, { method: 'PATCH', body: JSON.stringify({ pontos }) });
      return jset(res, 200, { ok: true, group_link: GROUP_LINK, inviter: pr[0].nome, pontos });
    }

    // ---------- ADMIN: definir prêmios (1..10) ----------
    if (action === 'prizes') {
      const userId = (body.user_id || '').toString();
      if (!userId) return jset(res, 403, { error: 'auth' });
      const u = await (await sb(`app_users?select=role&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
      const role = Array.isArray(u) && u[0] ? u[0].role : null;
      if (role !== 'admin' && role !== 'super_admin') return jset(res, 403, { error: 'Sem permissão.' });
      const premios = Array.isArray(body.premios) ? body.premios : [];
      for (const it of premios) {
        const pos = parseInt(it.posicao, 10);
        if (pos >= 1 && pos <= 10) {
          await sb(`concurso_premios?posicao=eq.${pos}`, { method: 'PATCH', body: JSON.stringify({ premio: (it.premio || '').toString().slice(0, 200) }) });
        }
      }
      return jset(res, 200, { ok: true });
    }

    return jset(res, 400, { error: 'ação desconhecida' });
  } catch (e) {
    return jset(res, 500, { error: 'server', detail: String(e?.message || e) });
  }
}
