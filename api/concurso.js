// Concurso Leilão NoZap — API (registro, ranking por período, join, prêmios, config admin, sorteios, painel pessoal).
// Usa a service key (bypassa RLS). CPF e WhatsApp NUNCA são expostos no ranking público.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GROUP_LINK = 'https://chat.whatsapp.com/FyKc2sXiB5fBG7ikYlmvri?s=cl&p=i&mlu=4';

const sb = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
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
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 10);

function genCode(nome) {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let r = '';
  for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return `${slug(nome.split(' ')[0]) || 'user'}${r}`;
}

async function uploadFoto(code, dataUrl) {
  try {
    const m = /^data:(image\/(jpeg|jpg|png|webp));base64,(.+)$/i.exec(dataUrl || '');
    if (!m) return null;
    const mime = m[1].toLowerCase();
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    const buf = Buffer.from(m[3], 'base64');
    if (buf.length > 2000000) return null;
    const path = `${code}.${ext}`;
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/concurso/${path}`, {
      method: 'POST',
      headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': mime, 'x-upsert': 'true' },
      body: buf,
    });
    if (!r.ok) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/concurso/${path}?v=${Date.now()}`;
  } catch { return null; }
}

// ranking do período via RPC (dia | semana | mes | geral) — timezone Brasília
async function rankingPeriodo(periodo) {
  const r = await sb('rpc/concurso_ranking_periodo', { method: 'POST', body: JSON.stringify({ p_periodo: periodo }) });
  const rows = await r.json().catch(() => []);
  if (!Array.isArray(rows)) return [];
  return rows.map((x, i) => ({ posicao: i + 1, code: x.code, nome: x.nome, pontos: Number(x.pontos) || 0, foto_url: x.foto_url || null }));
}

async function getConfig() {
  const r = await sb('concurso_config?id=eq.main&limit=1');
  const rows = await r.json().catch(() => []);
  return (Array.isArray(rows) && rows[0]) || {};
}

// Cria conta NÍVEL 1 na plataforma reusando publicRegister (bcrypt, referral_code, indicador).
// Só cria pra CADASTRO NOVO — se o CPF/telefone já existe, publicRegister falha e retornamos null
// (nunca auto-logamos numa conta existente por CPF: seria takeover).
async function criarContaPlataforma(host, nome, cpf, whatsapp) {
  try {
    if (!host) return null;
    const email = `c${cpf}@concurso.leilaonozap.net`;
    const password = 'Cc' + Math.random().toString(36).slice(2, 12) + Math.floor(Math.random() * 90 + 10) + '!';
    const r = await fetch(`https://${host}/api/functions/publicRegister`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: nome, email, password, phone: whatsapp, cpf }),
    });
    const j = await r.json().catch(() => ({}));
    return j?.success && j.user ? j.user : null;
  } catch { return null; }
}

async function isAdmin(userId) {
  if (!userId) return false;
  const u = await (await sb(`app_users?select=role&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
  const role = Array.isArray(u) && u[0] ? u[0].role : null;
  return role === 'admin' || role === 'super_admin';
}

function jset(res, code, obj) {
  res.status(code).setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  try {
    if (!SUPABASE_URL || !SR) return jset(res, 500, { error: 'config' });
    const action = (req.query?.action || '').toString();
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    // ---------- RANKING + CONFIG (público) ----------
    // GET sem action (ou action=ranking). Os GETs "me" e "sorteios" seguem para os blocos abaixo —
    // antes o catch-all de método engolia todo GET e o painel pessoal nunca carregava.
    if ((req.method === 'GET' && !action) || action === 'ranking') {
      const periodo = (req.query?.periodo || 'geral').toString();
      const ranking = await rankingPeriodo(['dia', 'semana', 'mes', 'geral'].includes(periodo) ? periodo : 'geral');
      const p = await sb('concurso_premios?select=posicao,premio&order=posicao');
      const premios = (await p.json().catch(() => [])) || [];
      const config = await getConfig();
      return jset(res, 200, { ranking, premios, config, group_link: GROUP_LINK, total: ranking.length, periodo });
    }

    // ---------- PAINEL PESSOAL (posições nos 3 períodos) ----------
    if (action === 'me') {
      const code = (req.query?.code || body.code || '').toString();
      if (!code) return jset(res, 400, { error: 'code' });
      const out = {};
      for (const per of ['dia', 'semana', 'mes', 'geral']) {
        const rk = await rankingPeriodo(per);
        const row = rk.find((x) => x.code === code);
        out[per] = row ? { posicao: row.posicao, pontos: row.pontos } : { posicao: null, pontos: 0 };
      }
      const pr = await (await sb(`concurso_participantes?select=nome,foto_url&code=eq.${encodeURIComponent(code)}&limit=1`)).json();
      return jset(res, 200, { code, nome: pr?.[0]?.nome || null, foto_url: pr?.[0]?.foto_url || null, periodos: out, config: await getConfig(), group_link: GROUP_LINK });
    }

    // ---------- REGISTRO ----------
    if (action === 'register') {
      const nome = (body.nome || '').toString().trim();
      const cpf = digits(body.cpf);
      const whatsapp = digits(body.whatsapp);
      if (nome.length < 3) return jset(res, 400, { error: 'Informe seu nome completo.' });
      if (!cpfValido(cpf)) return jset(res, 400, { error: 'CPF inválido.' });
      if (whatsapp.length < 10 || whatsapp.length > 13) return jset(res, 400, { error: 'WhatsApp inválido (com DDD).' });

      const ex = await (await sb(`concurso_participantes?select=code,nome&cpf=eq.${cpf}&limit=1`)).json();
      if (Array.isArray(ex) && ex[0]) {
        let foto_url = null;
        if (body.foto) { foto_url = await uploadFoto(ex[0].code, body.foto); if (foto_url) await sb(`concurso_participantes?code=eq.${encodeURIComponent(ex[0].code)}`, { method: 'PATCH', body: JSON.stringify({ foto_url }) }); }
        return jset(res, 200, { code: ex[0].code, nome: ex[0].nome, ja_existia: true, foto_url });
      }

      let code = genCode(nome);
      for (let t = 0; t < 4; t++) {
        const r = await sb('concurso_participantes', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ code, nome, cpf, whatsapp }) });
        if (r.status === 201) {
          const row = (await r.json())[0];
          let foto_url = null;
          if (body.foto) { foto_url = await uploadFoto(code, body.foto); if (foto_url) await sb(`concurso_participantes?code=eq.${encodeURIComponent(code)}`, { method: 'PATCH', body: JSON.stringify({ foto_url }) }); }
          // cria conta NÍVEL 1 na plataforma (só cadastro novo) → auto-login no front
          const app_user = await criarContaPlataforma(req.headers?.host, nome, cpf, whatsapp);
          return jset(res, 200, { code: row.code, nome: row.nome, foto_url, app_user });
        }
        const txt = await r.text();
        if (txt.includes('concurso_participantes_cpf_key')) return jset(res, 400, { error: 'Esse CPF já está participando.' });
        if (txt.includes('concurso_participantes_code_key')) { code = genCode(nome); continue; }
        return jset(res, 500, { error: 'Erro ao salvar. Tente de novo.' });
      }
      return jset(res, 500, { error: 'Não foi possível gerar seu link. Tente de novo.' });
    }

    // ---------- JOIN (entrou pelo link) ----------
    if (action === 'join') {
      const ref = (body.ref || '').toString().trim();
      const visitor = (body.visitor_id || '').toString().trim().slice(0, 80);
      if (!ref || !visitor) return jset(res, 400, { error: 'dados' });
      const pr = await (await sb(`concurso_participantes?select=code,nome&code=eq.${encodeURIComponent(ref)}&limit=1`)).json();
      if (!Array.isArray(pr) || !pr[0]) return jset(res, 200, { ok: false, group_link: GROUP_LINK });
      await sb('concurso_referrals', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ referrer_code: ref, visitor_id: visitor }) });
      const cnt = await sb(`concurso_referrals?select=id&referrer_code=eq.${encodeURIComponent(ref)}`, { headers: { Prefer: 'count=exact' } });
      const range = cnt.headers.get('content-range') || '*/0';
      const pontos = parseInt(range.split('/')[1] || '0', 10);
      await sb(`concurso_participantes?code=eq.${encodeURIComponent(ref)}`, { method: 'PATCH', body: JSON.stringify({ pontos }) });
      return jset(res, 200, { ok: true, group_link: GROUP_LINK, inviter: pr[0].nome, pontos });
    }

    // ---------- ADMIN: inteligência das indicações (funil por participante) ----------
    // v1 com o que o schema atual permite: impactados = cliques no link (concurso_referrals).
    // Entradas/saídas do grupo, conversões e gasto por indicado dependem da migração
    // de rastreamento (db/rank-premiado-tracking.sql) + webhook Evolution.
    if (action === 'admin_stats') {
      if (!(await isAdmin(body.user_id))) return jset(res, 403, { error: 'Sem permissão.' });
      const parts = await (await sb('concurso_participantes?select=code,nome,whatsapp,foto_url,created_at&limit=2000')).json();
      const clicks = [];
      for (let p = 0; p < 20; p++) {
        const r = await sb(`concurso_referrals?select=referrer_code,created_at&order=created_at.desc&limit=1000&offset=${p * 1000}`);
        const rows = await r.json().catch(() => []);
        if (!Array.isArray(rows) || !rows.length) break;
        clicks.push(...rows);
        if (rows.length < 1000) break;
      }
      // janelas em horário de Brasília (dia / semana desde segunda / mês)
      const toSP = (d) => new Date(new Date(d).toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      const spNow = toSP(new Date());
      const d0 = new Date(spNow); d0.setHours(0, 0, 0, 0);
      const w0 = new Date(d0); w0.setDate(w0.getDate() - ((d0.getDay() + 6) % 7));
      const m0 = new Date(d0); m0.setDate(1);
      const agg = {};
      for (const c of clicks) {
        const a = agg[c.referrer_code] || (agg[c.referrer_code] = { total: 0, dia: 0, semana: 0, mes: 0, ultimo: null });
        a.total++;
        const t = toSP(c.created_at);
        if (t >= d0) a.dia++;
        if (t >= w0) a.semana++;
        if (t >= m0) a.mes++;
        if (!a.ultimo || c.created_at > a.ultimo) a.ultimo = c.created_at;
      }
      const participantes = (Array.isArray(parts) ? parts : [])
        .map((p) => ({
          code: p.code, nome: p.nome, whatsapp: p.whatsapp || null, foto_url: p.foto_url || null, cadastro: p.created_at || null,
          cliques: agg[p.code]?.total || 0, dia: agg[p.code]?.dia || 0, semana: agg[p.code]?.semana || 0, mes: agg[p.code]?.mes || 0,
          ultimo_clique: agg[p.code]?.ultimo || null,
        }))
        .sort((a, b) => b.cliques - a.cliques || (b.ultimo_clique || '').localeCompare(a.ultimo_clique || ''));
      return jset(res, 200, {
        totais: {
          participantes: participantes.length,
          impactados: clicks.length,
          cliques_dia: participantes.reduce((s, p) => s + p.dia, 0),
          cliques_semana: participantes.reduce((s, p) => s + p.semana, 0),
          cliques_mes: participantes.reduce((s, p) => s + p.mes, 0),
          ativos_7d: participantes.filter((p) => p.ultimo_clique && (spNow - toSP(p.ultimo_clique)) < 7 * 864e5).length,
        },
        participantes,
        rastreamento_completo: false,
      });
    }

    // ---------- ADMIN: prêmios do pódio (1..10) ----------
    if (action === 'prizes') {
      if (!(await isAdmin(body.user_id))) return jset(res, 403, { error: 'Sem permissão.' });
      const premios = Array.isArray(body.premios) ? body.premios : [];
      for (const it of premios) {
        const pos = parseInt(it.posicao, 10);
        if (pos >= 1 && pos <= 10) await sb(`concurso_premios?posicao=eq.${pos}`, { method: 'PATCH', body: JSON.stringify({ premio: (it.premio || '').toString().slice(0, 200) }) });
      }
      return jset(res, 200, { ok: true });
    }

    // ---------- ADMIN: config (produto do dia, live, propaganda, prêmios por período) ----------
    if (action === 'save_config') {
      if (!(await isAdmin(body.user_id))) return jset(res, 403, { error: 'Sem permissão.' });
      const c = body.config || {};
      const patch = {};
      // sorteio_horario: aguardando a coluna na concurso_config (ALTER TABLE pendente) —
      // o painel só passa a enviar essa chave quando o input for liberado no admin.
      const campos = ['produto_nome', 'produto_foto', 'produto_valor', 'produto_desc', 'propaganda', 'live_ativa', 'live_url', 'live_horario', 'live_produto', 'live_meta', 'live_audiencia', 'premio_dia', 'premio_semana', 'premio_mes', 'sorteio_horario'];
      for (const k of campos) if (k in c) patch[k] = c[k];
      patch.updated_at = new Date().toISOString();
      await sb('concurso_config?id=eq.main', { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
      return jset(res, 200, { ok: true });
    }

    // ---------- ADMIN: realizar sorteio (coroa o 1º do período + registra) ----------
    if (action === 'sorteio') {
      if (!(await isAdmin(body.user_id))) return jset(res, 403, { error: 'Sem permissão.' });
      const periodo = ['dia', 'semana', 'mes'].includes(body.periodo) ? body.periodo : 'dia';
      const rk = await rankingPeriodo(periodo);
      const vencedor = rk.find((x) => x.pontos > 0);
      if (!vencedor) return jset(res, 200, { ok: false, error: 'Ninguém pontuou nesse período ainda.' });
      const cfg = await getConfig();
      const premio = periodo === 'dia' ? cfg.premio_dia : periodo === 'semana' ? cfg.premio_semana : cfg.premio_mes;
      const r = await sb('concurso_sorteios', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ periodo, data_ref: new Date().toISOString().slice(0, 10), ganhador_code: vencedor.code, ganhador_nome: vencedor.nome, ganhador_foto: vencedor.foto_url, pontos: vencedor.pontos, premio: premio || '' }),
      });
      const row = (await r.json().catch(() => []))?.[0] || {};
      return jset(res, 200, { ok: true, vencedor: { nome: vencedor.nome, pontos: vencedor.pontos, foto_url: vencedor.foto_url, premio: premio || '' }, sorteio: row });
    }

    // ---------- histórico de sorteios (público) ----------
    if (action === 'sorteios') {
      const r = await sb('concurso_sorteios?select=periodo,data_ref,ganhador_nome,ganhador_foto,pontos,premio,created_at&order=created_at.desc&limit=30');
      return jset(res, 200, { sorteios: (await r.json().catch(() => [])) || [] });
    }

    // ---------- TROCAR FOTO ----------
    if (action === 'photo') {
      const code = (body.code || '').toString().trim();
      if (!code) return jset(res, 400, { error: 'code' });
      const pr = await (await sb(`concurso_participantes?select=code&code=eq.${encodeURIComponent(code)}&limit=1`)).json();
      if (!Array.isArray(pr) || !pr[0]) return jset(res, 404, { error: 'não achou' });
      const foto_url = await uploadFoto(code, body.foto);
      if (!foto_url) return jset(res, 400, { error: 'foto inválida' });
      await sb(`concurso_participantes?code=eq.${encodeURIComponent(code)}`, { method: 'PATCH', body: JSON.stringify({ foto_url }) });
      return jset(res, 200, { ok: true, foto_url });
    }

    return jset(res, 400, { error: 'ação desconhecida' });
  } catch (e) {
    return jset(res, 500, { error: 'server', detail: String(e?.message || e) });
  }
}
