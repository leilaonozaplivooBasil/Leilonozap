// timeCorporativo — O TOPO da estrutura de negócio (DIR-39, 01/09/2026).
// Regra do dono: as metas de licença e parceiro de compra são do time
// corporativo — TODOS os cargos executivos, do Sócio Executivo ao Fundador
// (Trainee fica fora: está em formação). Responsável de contrato da esteira
// SEMPRE sai daqui. Fonte única sobre careerLevels — nada de lista paralela.
import { CAREER_LEVELS, normalizeLevels, getLevel } from './careerLevels.js';

// Do Sócio Executivo (ordem 102) pra cima — o bloco diretor sem o Trainee.
export const CARGOS_TOPO = CAREER_LEVELS
  .filter((l) => l.bloco === 'diretor' && l.id !== 'trainee_diretor')
  .map((l) => l.id);

const TOPO_SET = new Set(CARGOS_TOPO);

/** Cargos do topo que a pessoa carrega (normalizados, ordenados pela hierarquia). */
export function cargosTopoDe(user) {
  const levels = normalizeLevels([
    ...(Array.isArray(user?.career_levels) ? user.career_levels : []),
    ...(user?.primary_career_level ? [user.primary_career_level] : []),
  ]);
  return [...new Set(levels)]
    .filter((id) => TOPO_SET.has(id))
    .sort((a, b) => getLevel(b).ordem - getLevel(a).ordem);
}

/** A pessoa faz parte do topo? */
export const ehExecutivoTopo = (user) => cargosTopoDe(user).length > 0;

/**
 * Os membros do time corporativo cadastrados no app, com a FUNÇÃO PRINCIPAL:
 * o primary_career_level quando ele é do topo; senão o cargo de topo mais
 * alto que a pessoa carrega. Ordenado pela hierarquia (Fundador → Sócio).
 */
export function membrosDoTopo(users = []) {
  return users
    .map((u) => {
      const cargos = cargosTopoDe(u);
      if (cargos.length === 0) return null;
      const principalNorm = normalizeLevels(u.primary_career_level ? [u.primary_career_level] : [])[0];
      const funcaoPrincipal = (principalNorm && TOPO_SET.has(principalNorm)) ? principalNorm : cargos[0];
      return { user: u, funcaoPrincipal, cargos };
    })
    .filter(Boolean)
    .sort((a, b) => getLevel(b.funcaoPrincipal).ordem - getLevel(a.funcaoPrincipal).ordem
      || String(a.user.full_name || '').localeCompare(String(b.user.full_name || ''), 'pt-BR'));
}
