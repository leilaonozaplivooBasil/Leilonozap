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

// ranking do período via RPC (dia | semana | mes | geral) — timezone Brasília.
// v2 ("só conta quem entrou no grupo") assume automaticamente quando a migração
// db/rank-premiado-tracking.sql rodar; até lá cai na v1 (cliques).
async function rankingPeriodo(periodo) {
  let r = await sb('rpc/concurso_ranking_periodo_v2', { method: 'POST', body: JSON.stringify({ p_periodo: periodo }) });
  if (!r.ok) r = await sb('rpc/concurso_ranking_periodo', { method: 'POST', body: JSON.stringify({ p_periodo: periodo }) });
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
      const p = await sb('concurso_premios?select=posicao,premio,produto_foto,produto_valor,produto_link&order=posicao');
      const premiosRaw = (await p.json().catch(() => [])) || [];
      const premios = Array.isArray(premiosRaw) ? premiosRaw : [];
      const config = await getConfig();
      return jset(res, 200, { ranking, premios, config, group_link: GROUP_LINK, total: ranking.length, periodo });
    }

    // ---------- RASTREAMENTO: status (a migração db/rank-premiado-tracking.sql já rodou?) ----------
    // O fluxo do convidado só pede o WhatsApp quando a tabela concurso_indicados existe.
    if (action === 'track_status') {
      const r = await sb('concurso_indicados?select=id&limit=1');
      return jset(res, 200, { enabled: r.ok });
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

    // ---------- MEU CÓDIGO (conta ↔ concurso são um só: acha o participante pelo CPF da conta) ----------
    // Permite ao front restaurar o painel pessoal depois do login na plataforma.
    // O code já é semi-público (aparece no ranking e nos links ?ref=), então não vaza nada novo.
    if (action === 'mycode') {
      const userId = (req.query?.user_id || body.user_id || '').toString();
      if (!userId) return jset(res, 400, { error: 'user_id' });
      const u = await (await sb(`app_users?select=cpf&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
      const cpf = digits(Array.isArray(u) && u[0] ? u[0].cpf : '');
      if (!cpf) return jset(res, 200, { code: null });
      const p = await (await sb(`concurso_participantes?select=code&cpf=eq.${cpf}&limit=1`)).json();
      return jset(res, 200, { code: (Array.isArray(p) && p[0] && p[0].code) || null });
    }

    // ---------- REGISTRO ----------
    if (action === 'register') {
      const nome = (body.nome || '').toString().trim();
      const cpf = digits(body.cpf);
      const whatsapp = digits(body.whatsapp);
      if (nome.length < 3) return jset(res, 400, { error: 'Informe seu nome completo.' });
      if (!cpfValido(cpf)) return jset(res, 400, { error: 'CPF inválido.' });
      if (whatsapp.length < 10 || whatsapp.length > 13) return jset(res, 400, { error: 'WhatsApp inválido (com DDD).' });

      // Usuário LOGADO se cadastrando no concurso: vincula o CPF à conta quando ela
      // ainda não tem (nunca sobrescreve CPF existente — evitaria troca de identidade).
      // É esse vínculo que faz o action=mycode achar o painel da conta depois.
      const uid = (body.user_id || '').toString();
      if (uid) {
        try {
          const u = await (await sb(`app_users?select=cpf&id=eq.${encodeURIComponent(uid)}&limit=1`)).json();
          if (Array.isArray(u) && u[0] && !digits(u[0].cpf)) {
            await sb(`app_users?id=eq.${encodeURIComponent(uid)}&cpf=is.null`, { method: 'PATCH', body: JSON.stringify({ cpf }) });
          }
        } catch { /* vínculo é best-effort; cadastro do concurso segue normal */ }
      }

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
      // Rastreamento por telefone (Etapa 9): grava o indicado como "clicou" — vira "entrou"
      // quando o webhook da Evolution confirmar a entrada no grupo. Primeiro indicador a
      // trazer o número fica com ele (unique em phone). Silencioso se a migração não rodou.
      let phone = digits(body.phone);
      if ((phone.length === 12 || phone.length === 13) && phone.startsWith('55')) phone = phone.slice(2);
      if (phone.length >= 10 && phone.length <= 11) {
        await sb('concurso_indicados', {
          method: 'POST',
          headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify({ referrer_code: ref, phone, visitor_id: visitor, status: 'clicou' }),
        });
      }
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
      const viaDiag = process.env.DIAG_KEY && body.diag === process.env.DIAG_KEY; // diagnóstico interno
      if (!viaDiag && !(await isAdmin(body.user_id))) return jset(res, 403, { error: 'Sem permissão.' });
      const parts = await (await sb('concurso_participantes?select=code,nome,whatsapp,foto_url,created_at,cpf&limit=2000')).json();
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
      // Funil por telefone (quando a migração já rodou): clicou / entrou / saiu
      const funil = {};
      let rastreado = false;
      const ir = await sb('concurso_indicados?select=referrer_code,status&limit=10000');
      if (ir.ok) {
        rastreado = true;
        const rows = await ir.json().catch(() => []);
        for (const x of Array.isArray(rows) ? rows : []) {
          const f = funil[x.referrer_code] || (funil[x.referrer_code] = { clicou: 0, entrou: 0, saiu: 0 });
          f[x.status] = (f[x.status] || 0) + 1;
        }
      }
      // Conversão + gasto na plataforma: casa o CPF do participante com app_users e
      // agrega compras da loja (catalog_sales) e adesões (adesao_orders). CPF fica
      // no servidor — nunca vai pra resposta.
      const chunk = (arr, n) => arr.reduce((acc, x, i) => { (acc[Math.floor(i / n)] ||= []).push(x); return acc; }, []);
      const listaParts = Array.isArray(parts) ? parts : [];
      const cpfs = [...new Set(listaParts.map((p) => digits(p.cpf)).filter((c) => c.length === 11))];
      const contas = []; // {id, cpf, indicated_clients_count, network_bids_count}
      for (const grupo of chunk(cpfs, 40)) {
        const r = await sb(`app_users?select=id,cpf,indicated_clients_count,network_bids_count&cpf=in.(${grupo.map((c) => `"${c}"`).join(',')})`);
        const rows = await r.json().catch(() => []);
        if (Array.isArray(rows)) contas.push(...rows);
      }
      const contaPorCpf = Object.fromEntries(contas.map((u) => [digits(u.cpf), u]));
      const PAGO = new Set(['paid', 'pago', 'approved', 'aprovado', 'confirmed', 'confirmado', 'completed', 'concluido', 'entregue', 'delivered', 'shipped', 'enviado']);
      const gastoPorUser = {}; // user_id → { compras, gasto, adesao }
      const ids = contas.map((u) => u.id);
      for (const grupo of chunk(ids, 40)) {
        const filtroIds = grupo.map((x) => `"${x}"`).join(',');
        const vendas = await (await sb(`catalog_sales?select=buyer_id,total_amount,sale_price,status&buyer_id=in.(${filtroIds})&limit=5000`)).json().catch(() => []);
        for (const v of Array.isArray(vendas) ? vendas : []) {
          const g = gastoPorUser[v.buyer_id] || (gastoPorUser[v.buyer_id] = { compras: 0, gasto: 0, adesao: 0 });
          g.compras++;
          if (PAGO.has(String(v.status || '').toLowerCase())) g.gasto += Number(v.total_amount ?? v.sale_price) || 0;
        }
        const adesoes = await (await sb(`adesao_orders?select=user_id,valor_produto,status&user_id=in.(${filtroIds})&limit=5000`)).json().catch(() => []);
        for (const a of Array.isArray(adesoes) ? adesoes : []) {
          const g = gastoPorUser[a.user_id] || (gastoPorUser[a.user_id] = { compras: 0, gasto: 0, adesao: 0 });
          if (PAGO.has(String(a.status || '').toLowerCase())) g.adesao += Number(a.valor_produto) || 0;
        }
      }
      const participantes = listaParts
        .map((p) => {
          const conta = contaPorCpf[digits(p.cpf)];
          const g = conta ? gastoPorUser[conta.id] : null;
          return {
            code: p.code, nome: p.nome, whatsapp: p.whatsapp || null, foto_url: p.foto_url || null, cadastro: p.created_at || null,
            cliques: agg[p.code]?.total || 0, dia: agg[p.code]?.dia || 0, semana: agg[p.code]?.semana || 0, mes: agg[p.code]?.mes || 0,
            ultimo_clique: agg[p.code]?.ultimo || null,
            convertido: !!conta,
            compras: g?.compras || 0,
            gasto: Math.round((g?.gasto || 0) * 100) / 100,
            adesao: Math.round((g?.adesao || 0) * 100) / 100,
            indicados_plataforma: conta?.indicated_clients_count || 0,
            lances_rede: conta?.network_bids_count || 0,
            ...(rastreado ? { entrou: funil[p.code]?.entrou || 0, saiu: funil[p.code]?.saiu || 0, aguardando: funil[p.code]?.clicou || 0 } : {}),
          };
        })
        .sort((a, b) => b.cliques - a.cliques || (b.ultimo_clique || '').localeCompare(a.ultimo_clique || ''));
      return jset(res, 200, {
        totais: {
          participantes: participantes.length,
          impactados: clicks.length,
          cliques_dia: participantes.reduce((s, p) => s + p.dia, 0),
          cliques_semana: participantes.reduce((s, p) => s + p.semana, 0),
          cliques_mes: participantes.reduce((s, p) => s + p.mes, 0),
          ativos_7d: participantes.filter((p) => p.ultimo_clique && (spNow - toSP(p.ultimo_clique)) < 7 * 864e5).length,
          convertidos: participantes.filter((p) => p.convertido).length,
          gasto_total: Math.round(participantes.reduce((s, p) => s + p.gasto + p.adesao, 0) * 100) / 100,
          compras_total: participantes.reduce((s, p) => s + p.compras, 0),
          ...(rastreado ? {
            entraram: participantes.reduce((s, p) => s + (p.entrou || 0), 0),
            sairam: participantes.reduce((s, p) => s + (p.saiu || 0), 0),
          } : {}),
        },
        participantes,
        rastreamento_completo: rastreado,
      });
    }

    // ---------- ADMIN: prêmios do pódio (1..10) — agora com foto, preço e link da loja ----------
    if (action === 'prizes') {
      if (!(await isAdmin(body.user_id))) return jset(res, 403, { error: 'Sem permissão.' });
      const premios = Array.isArray(body.premios) ? body.premios : [];
      for (const it of premios) {
        const pos = parseInt(it.posicao, 10);
        if (pos >= 1 && pos <= 10) {
          const patch = { premio: (it.premio || '').toString().slice(0, 200) };
          if ('produto_foto' in it) patch.produto_foto = (it.produto_foto || '').toString().slice(0, 2000);
          if ('produto_valor' in it) patch.produto_valor = Number(it.produto_valor) || 0;
          if ('produto_link' in it) patch.produto_link = (it.produto_link || '').toString().slice(0, 500);
          await sb(`concurso_premios?posicao=eq.${pos}`, { method: 'PATCH', body: JSON.stringify(patch) });
        }
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
      const campos = ['produto_nome', 'produto_foto', 'produto_valor', 'produto_desc', 'produto_link', 'propaganda', 'live_ativa', 'live_url', 'live_horario', 'live_produto', 'live_meta', 'live_audiencia', 'premio_dia', 'premio_semana', 'premio_mes', 'sorteio_horario'];
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