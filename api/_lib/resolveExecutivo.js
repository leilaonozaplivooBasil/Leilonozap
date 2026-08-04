// 🔴 FONTE ÚNICA DA REGRA DO EXECUTIVO — não duplicar esta lógica em nenhum lugar.
//
// REGRA CONGELADA PELO DONO (04/08/2026 18:36):
//   "Migrou para um executivo, vai com tudo. Não fica nada."
//   O executivo é quem dá o suporte. Não existe executivo ganhando em cima
//   do suporte de outro.
//
// ORDEM EXATA (subindo a linha de indicação, começando no próprio vendedor):
//   1) A pessoa tem carteira migrada (executive_owner_id)? → esse executivo
//      decide. PARA AQUI.
//   2) Senão, a pessoa tem o cargo de executivo? → ela mesma decide. PARA AQUI.
//   3) Senão, sobe para quem a indicou e repete.
//   Linha acabou sem ninguém → executivo raiz (quem tem executivo + ceo).
//
// CONSEQUÊNCIA INTENCIONAL: a carteira migrada captura a SUBÁRVORE INTEIRA —
// quem pendurar embaixo da pessoa migrada também resolve no mesmo executivo.
// Quem cuida do galho cuida das folhas.
//
// PROTEÇÃO EMBUTIDA: por ser "o mais próximo manda", uma carteira gravada num
// avô NÃO captura o 1% de um neto que já tem executivo mais perto. Isso impede
// sequestro de estrutura.

export const EXECUTIVE_LEVEL = 'executivo_conta';
export const EXECUTIVE_PCT = 1;

// Cargo do executivo de último recurso (linha sem nenhum executivo acima).
// Genérico de propósito: quando entrar um executivo novo, a própria árvore
// passa a resolvê-lo e nada aqui precisa mudar.
const FALLBACK_EXECUTIVE_LEVEL = 'ceo';

// O banco tem as duas grafias por histórico de migração.
const EXEC_ALIASES = ['executivo_conta', 'executivo'];

/** Lê os cargos de um usuário, aceitando array ou string única. */
export function levelsOf(user) {
  const raw = user?.career_levels;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) return [raw];
  return [];
}

/** A pessoa tem cargo de executivo de conta? */
export function isExecutivo(user) {
  const meus = levelsOf(user);
  return EXEC_ALIASES.some((c) => meus.includes(c));
}

/** Lê a carteira migrada — coluna dedicada ou dentro do licenciado_context (JSON). */
export function readExecutiveOwner(user) {
  if (!user) return null;
  if (user.executive_owner_id) return user.executive_owner_id;
  const ctx = user.licenciado_context;
  if (!ctx) return null;
  try {
    const parsed = typeof ctx === 'string' ? JSON.parse(ctx) : ctx;
    return parsed?.executive_owner_id || null;
  } catch {
    return null;
  }
}

/**
 * Resolve QUEM é o executivo de uma venda.
 * @param anchor  usuário dono da venda (vendedor/âncora)
 * @param byId    Map de id → usuário
 * @param users   lista de usuários ativos (para achar o executivo raiz)
 * @returns o usuário executivo, ou null se não houver nenhum no sistema
 */
export function resolveExecutivo(anchor, byId, users) {
  if (!anchor) return null;

  const vistos = new Set();
  let atual = anchor;

  while (atual && !vistos.has(atual.id) && vistos.size < 50) {
    vistos.add(atual.id);

    // 1) carteira migrada da PRÓPRIA pessoa vence — inclusive sobre a árvore
    const dono = byId.get(readExecutiveOwner(atual));
    if (dono && isExecutivo(dono)) return dono;

    // 2) a própria pessoa é executiva (ex.: executivo atuando como parceiro
    //    dentro da estrutura que ele mesmo comanda)
    if (isExecutivo(atual)) return atual;

    // 3) sobe para quem indicou
    atual = atual.referred_by_id ? byId.get(atual.referred_by_id) : null;
  }

  // Linha sem nenhum executivo acima → executivo raiz
  const lista = Array.isArray(users) ? users : [];
  return lista.find((u) => isExecutivo(u) && levelsOf(u).includes(FALLBACK_EXECUTIVE_LEVEL)) || null;
}