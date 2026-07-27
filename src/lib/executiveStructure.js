/**
 * executiveStructure — Carteira do Sócio Executivo (estrutura de negócio)
 *
 * REGRA DO PLANO (careerLevels.js): o Sócio Executivo é o único cargo do topo
 * que NÃO é pool — ele recebe 1% sobre a PRÓPRIA estrutura de negócio. Logo,
 * todo licenciado precisa ter um executivo dono da estrutura, senão esse 1%
 * fica sem destino.
 *
 * IMPORTANTE: este vínculo é um EIXO SEPARADO da linha de indicação.
 * `referred_by_id`  = quem indicou (define o rebate de 20% da cadeia)
 * `executive_owner` = de quem é a estrutura (define o 1% do executivo)
 * Um distribuidor pode ter sido indicado pelo Site Oficial e pertencer à
 * estrutura de outro executivo.
 *
 * ATRIBUIÇÃO SEMIAUTOMÁTICA (nesta ordem):
 *   1. Override manual (pinado) — a negociação manda
 *   2. Herança de quem indicou (sobe a linha até achar alguém com carteira)
 *   3. Executivo padrão da casa (configurável) — ninguém entra órfão
 *
 * ARMAZENAMENTO: usa a coluna dedicada `executive_owner_id` quando ela existir.
 * Enquanto a migration não for aplicada, o valor vive em `licenciado_context`
 * (coluna livre, hoje vazia em 100% dos cadastros). A leitura entende os dois
 * formatos, então o dia da migration não quebra nada nem exige retrabalho.
 */

export const EXECUTIVE_LEVEL_ID = 'executivo_conta';

/** Cargos de rede que precisam obrigatoriamente de um executivo dono. */
export const LEVELS_REQUIRING_EXECUTIVE = [
  'licenciado',
  'licenciado_catalogo',
  'licenciado_aplicativo',
  'parceiro',
  'ponto_retirada',
  'loja_fisica',
  'distribuidor',
];

const levelsOf = (user) => {
  const raw = user?.career_levels;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) return [raw];
  return [];
};

/** É Sócio Executivo? Olha TODOS os cargos — o principal pode ser outro (ex.: CEO). */
export function isExecutive(user) {
  return levelsOf(user).includes(EXECUTIVE_LEVEL_ID);
}

/** Precisa de carteira executiva? (qualquer cargo de rede relevante) */
export function requiresExecutive(user) {
  if (!user || user.active === false) return false;
  return levelsOf(user).some((l) => LEVELS_REQUIRING_EXECUTIVE.includes(l));
}

export function listExecutives(users = []) {
  return users
    .filter((u) => isExecutive(u) && u.active !== false)
    .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
}

/** Lê o vínculo gravado no cadastro (coluna dedicada ou fallback). */
export function readExecutiveOwner(user) {
  if (!user) return { id: null, pinned: false, since: null };

  if (user.executive_owner_id) {
    return {
      id: user.executive_owner_id,
      pinned: user.executive_owner_pinned === true,
      since: user.executive_owner_since || null,
    };
  }

  const ctx = user.licenciado_context;
  if (!ctx) return { id: null, pinned: false, since: null };
  try {
    const parsed = typeof ctx === 'string' ? JSON.parse(ctx) : ctx;
    if (parsed && typeof parsed === 'object' && parsed.executive_owner_id) {
      return {
        id: parsed.executive_owner_id,
        pinned: parsed.executive_owner_pinned === true,
        since: parsed.executive_owner_since || null,
      };
    }
  } catch {
    /* conteúdo antigo em formato desconhecido — ignora */
  }
  return { id: null, pinned: false, since: null };
}

/**
 * Monta o payload de gravação. A API tenta a coluna dedicada e, se ela ainda
 * não existir no banco, converte sozinha para o campo de compatibilidade.
 */
export function buildExecutiveUpdate(executiveId, { pinned = false } = {}) {
  return {
    executive_owner_id: executiveId || null,
    executive_owner_pinned: !!pinned,
    executive_owner_since: executiveId ? new Date().toISOString() : null,
  };
}

/**
 * Executivo efetivo de um usuário: override > herança pela linha de indicação
 * > executivo padrão da casa. Devolve também a origem, para a UI ser honesta
 * sobre o que é definido e o que é herdado.
 */
export function resolveEffectiveExecutive(user, byId, defaultExecutiveId = null) {
  const own = readExecutiveOwner(user);
  if (own.id) return { executiveId: own.id, source: own.pinned ? 'fixado' : 'definido', pinned: own.pinned };

  const seen = new Set([user?.id]);
  let cur = user?.referred_by_id ? byId.get(user.referred_by_id) : null;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    const parent = readExecutiveOwner(cur);
    if (parent.id) return { executiveId: parent.id, source: 'herdado', from: cur, pinned: false };
    if (isExecutive(cur)) return { executiveId: cur.id, source: 'herdado', from: cur, pinned: false };
    cur = cur.referred_by_id ? byId.get(cur.referred_by_id) : null;
  }

  if (defaultExecutiveId) return { executiveId: defaultExecutiveId, source: 'padrão', pinned: false };
  return { executiveId: null, source: 'sem executivo', pinned: false };
}

/** Carteira de cada executivo + quem está sem destino para o 1%. */
export function buildStructureReport(users = [], defaultExecutiveId = null) {
  const byId = new Map(users.map((u) => [u.id, u]));
  const executives = listExecutives(users);
  const carteiras = new Map(executives.map((e) => [e.id, { executive: e, membros: [], herdados: 0, definidos: 0 }]));
  const orfaos = [];

  for (const u of users) {
    if (u.active === false) continue;
    if (!requiresExecutive(u)) continue;
    const { executiveId, source } = resolveEffectiveExecutive(u, byId, defaultExecutiveId);
    if (!executiveId || !carteiras.has(executiveId)) {
      orfaos.push(u);
      continue;
    }
    const c = carteiras.get(executiveId);
    c.membros.push({ user: u, source });
    if (source === 'herdado' || source === 'padrão') c.herdados += 1;
    else c.definidos += 1;
  }

  return {
    executives,
    carteiras: [...carteiras.values()].sort((a, b) => b.membros.length - a.membros.length),
    orfaos,
  };
}

/** Todos os descendentes de alguém (para aplicar a troca em cascata). */
export function descendantsOf(userId, users = []) {
  const out = [];
  const stack = [userId];
  const seen = new Set([userId]);
  while (stack.length) {
    const cur = stack.pop();
    for (const u of users) {
      if (u.referred_by_id === cur && !seen.has(u.id)) {
        seen.add(u.id);
        out.push(u);
        stack.push(u.id);
      }
    }
  }
  return out;
}
