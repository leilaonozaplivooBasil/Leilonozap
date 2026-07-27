// adminUpdateUser — atualiza um usuário (app_users) com service_role, bypassando RLS.
// O app usa só a anon key (auth custom em app_users), então UPDATE direto via PostgREST
// dá no-op silencioso (RLS de escrita é só pra 'authenticated'). Esta route resolve isso.
// Guard: quem chama (actorId) precisa ser admin/super_admin no banco.
// ⚠️ Segurança: guard provisório baseado em actorId (modelo client-trust atual). Trocar por
// Supabase Auth + verificação de JWT antes do go-live público. Ver auditoria 2026-06-10.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

// Campos que o admin pode editar pelo modal de usuário
const ALLOWED = [
  'full_name', 'nickname', 'email', 'phone', 'role', 'referred_by_id',
  'career_levels', 'primary_career_level', 'display_first_name',
  'display_last_name', 'avatar_url', 'profile_photo_url', 'enabled_panels',
  'is_seller', 'store_name',
  // 'active' = arquivar/reativar usuário sem apagar histórico (painel da rede)
  'active',
  // crédito manual de comissão pelo Painel de Controle
  'commission_balance',
  // carteira do Sócio Executivo (1% sobre a própria estrutura de negócio)
  'executive_owner_id', 'executive_owner_pinned', 'executive_owner_since',
  'licenciado_context',
];

// Campos da carteira executiva. Enquanto a coluna dedicada não existir no banco,
// eles viajam dentro de licenciado_context (coluna livre) — a leitura no front
// entende os dois formatos, então a migration pode ser feita a qualquer momento.
const EXECUTIVE_FIELDS = ['executive_owner_id', 'executive_owner_pinned', 'executive_owner_since'];

// A coluna dedicada pode ainda não existir (migration pendente). Descobrimos uma
// vez por instância e guardamos — assim nem chegamos a mandar um PATCH que falha.
let _execColumnExists = null;
async function executiveColumnExists() {
  if (_execColumnExists !== null) return _execColumnExists;
  try {
    const r = await sb('app_users?select=executive_owner_id&limit=1');
    _execColumnExists = r.ok;
  } catch {
    _execColumnExists = false;
  }
  return _execColumnExists;
}

// MESCLA a carteira executiva no contexto que já existe. Substituir o objeto
// inteiro (como fazia antes) apagava o resto do conteúdo — inclusive
// { enabled: true }, a chave que abria o painel de alavancagem. Em 27/07/2026 isso
// derrubou o painel de 12 pessoas de uma vez.
function foldExecutiveIntoContext(payload, contextoAtual) {
  const ctx = {};
  for (const f of EXECUTIVE_FIELDS) {
    if (f in payload) {
      ctx[f] = payload[f];
      delete payload[f];
    }
  }
  if (Object.keys(ctx).length === 0) return payload;

  let base = {};
  const bruto = contextoAtual ?? payload.licenciado_context;
  if (bruto) {
    try {
      const p = typeof bruto === 'string' ? JSON.parse(bruto) : bruto;
      if (p && typeof p === 'object' && !Array.isArray(p)) base = p;
    } catch { /* contexto ilegível: não dá para preservar, segue só com a carteira */ }
  }
  payload.licenciado_context = JSON.stringify({ ...base, ...ctx });
  return payload;
}

// lê o licenciado_context que está gravado hoje, para não perder o que há dentro
async function lerContextoAtual(userId) {
  try {
    const r = await (await sb(`app_users?select=licenciado_context&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
    return Array.isArray(r) && r[0] ? r[0].licenciado_context : null;
  } catch {
    return null;
  }
}


// Cargos que existem no plano (espelha src/lib/careerLevels.js). Qualquer id fora
// desta lista é descartado na gravação — sem isso, editar um cadastro com a tela
// aberta antes da limpeza fazia o cargo antigo (licenciado_catalogo etc.) voltar.
const CARGOS_VALIDOS = new Set([
  'usuario', 'influenciador', 'vendedor', 'licenciado', 'parceiro',
  'ponto_retirada', 'loja_fisica', 'distribuidor',
  'trainee_diretor', 'executivo_conta', 'diretoria_operacao',
  'diretoria_executiva', 'ceo', 'livoo_live', 'embaixador', 'conselheiro', 'fundador',
]);
const RENOMEAR_CARGO = { influencer: 'influenciador', user: 'usuario', trainee: 'trainee_diretor' };

function sanearCargos(lista) {
  const out = new Set();
  for (const c of Array.isArray(lista) ? lista : []) {
    if (CARGOS_VALIDOS.has(c)) out.add(c);
    else if (RENOMEAR_CARGO[c]) out.add(RENOMEAR_CARGO[c]);
  }
  return out.size ? [...out] : ['usuario'];
}

// Auditoria: registra QUEM fez O QUÊ com QUEM. Guardado em system_logs
// (tabela genérica de logs que já existe), no campo jsonb raw_base44.
// Nunca derruba a operação principal — se o log falhar, só avisa no console.
function newId() {
  let out = '';
  const hex = '0123456789abcdef';
  for (let i = 0; i < 24; i++) out += hex[Math.floor(Math.random() * 16)];
  return out;
}

async function writeAudit(entry) {
  try {
    const row = {
      id: newId(),
      raw_base44: { kind: 'network_audit', ...entry, at: new Date().toISOString() },
    };
    await sb('system_logs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
  } catch (e) {
    console.warn('[adminUpdateUser] auditoria não gravada:', e?.message || e);
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== 'object') body = {};
    const { userId, updates, actorId } = body;

    if (!SUPABASE_URL || !SR) {
      return res.status(500).json({ success: false, error: 'Config do servidor ausente (service role)' });
    }
    if (!userId || !updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'userId e updates são obrigatórios' });
    }
    if (!actorId) {
      return res.status(403).json({ success: false, error: 'Sem credencial de admin' });
    }

    // Guard: actor precisa ser admin/super_admin
    const actorResp = await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(actorId)}&limit=1`);
    const actorArr = await actorResp.json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    if (!actor || !['admin', 'super_admin'].includes(actor.role)) {
      return res.status(403).json({ success: false, error: 'Apenas admin pode editar usuários' });
    }

    // Monta payload só com campos permitidos
    const payload = {};
    for (const k of ALLOWED) if (k in updates) payload[k] = updates[k];

    // cargos: descarta ids que não existem mais no plano
    if ('career_levels' in payload) payload.career_levels = sanearCargos(payload.career_levels);
    if ('primary_career_level' in payload && payload.primary_career_level) {
      const p = payload.primary_career_level;
      payload.primary_career_level = CARGOS_VALIDOS.has(p) ? p : (RENOMEAR_CARGO[p] || 'usuario');
    }
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum campo válido para atualizar' });
    }

    // 🛡️ ANTI-REBAIXAMENTO: nunca tirar o acesso de um admin/super_admin sem pedir explicitamente.
    // O form "Loja Virtual do Vendedor" manda role='licensee'; se o alvo já é admin, isso apagava
    // o acesso dele (aconteceu com um super_admin em 12/07). Só rebaixa com allow_role_downgrade=true.
    const tgtArr = await (await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
    const target = Array.isArray(tgtArr) ? tgtArr[0] : null;
    const targetIsAdmin = target && ['admin', 'super_admin'].includes(target.role);
    if (targetIsAdmin && payload.role && !['admin', 'super_admin'].includes(payload.role) && body?.allow_role_downgrade !== true) {
      delete payload.role;            // preserva o acesso admin
      delete payload.career_levels;   // e o cargo que vem junto (ex.: ceo → licenciado_catalogo)
      delete payload.primary_career_level;
    }

    if (Object.keys(payload).length === 0) {
      return res.status(200).json({ success: true, skipped: 'nada a atualizar (role de admin preservado)' });
    }
    payload.updated_date = new Date().toISOString();

    // Sem a coluna dedicada, os campos da carteira executiva já vão dobrados
    // no campo de compatibilidade — nada de PATCH que quebra o save inteiro.
    if (EXECUTIVE_FIELDS.some((f) => f in payload) && !(await executiveColumnExists())) {
      foldExecutiveIntoContext(payload, await lerContextoAtual(userId));
    }

    let upd = await sb(`app_users?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
    let rows = await upd.json();

    // Coluna dedicada ainda não criada (42703): repete gravando no campo de
    // compatibilidade, para o painel funcionar antes da migration.
    const erroDeColuna =
      rows?.code === '42703' ||
      rows?.code === 'PGRST204' ||
      /column .* does not exist|Could not find the '.*' column/i.test(
        `${rows?.message || ''} ${rows?.details || ''}`
      );
    const semColuna = !upd.ok && erroDeColuna && EXECUTIVE_FIELDS.some((f) => f in payload);
    if (semColuna) _execColumnExists = false;
    if (semColuna) {
      const alt = foldExecutiveIntoContext({ ...payload }, await lerContextoAtual(userId));
      upd = await sb(`app_users?id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(alt),
      });
      rows = await upd.json();
    }

    if (!upd.ok) {
      return res.status(upd.status).json({ success: false, error: 'Falha ao salvar', details: rows });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    // Auditoria da ação (não bloqueia a resposta se falhar)
    const saved = rows[0];
    let action = 'update';
    if (EXECUTIVE_FIELDS.some((f) => f in payload) || 'licenciado_context' in payload) action = 'executive';
    else if ('active' in payload) action = payload.active === false ? 'trash' : 'restore';
    else if ('referred_by_id' in payload) action = 'move';
    else if ('primary_career_level' in payload || 'career_levels' in payload) action = 'promote';

    const actorInfo = await (await sb(
      `app_users?select=id,full_name,email&id=eq.${encodeURIComponent(actorId)}&limit=1`
    )).json().catch(() => []);
    const who = Array.isArray(actorInfo) ? actorInfo[0] : null;

    let newParentName = null;
    if (action === 'move' && payload.referred_by_id) {
      const p = await (await sb(
        `app_users?select=full_name&id=eq.${encodeURIComponent(payload.referred_by_id)}&limit=1`
      )).json().catch(() => []);
      newParentName = Array.isArray(p) && p[0] ? p[0].full_name : null;
    }

    await writeAudit({
      action,
      actor_id: actorId,
      actor_name: who?.full_name || null,
      actor_email: who?.email || null,
      target_id: saved.id,
      target_name: saved.full_name || null,
      target_email: saved.email || null,
      fields: Object.keys(payload).filter((k) => k !== 'updated_date'),
      new_parent_id: action === 'move' ? (payload.referred_by_id || null) : undefined,
      new_parent_name: action === 'move' ? newParentName : undefined,
    });

    return res.status(200).json({ success: true, user: saved });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Erro ao salvar', details: String((e && e.message) || e) });
  }
}
