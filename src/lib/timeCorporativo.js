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

// ── 🎯 A FAIXA DA GESTÃO DO X-PERFORMANCE (06/09/2026) ──────────────────────
// Ordem do dono: "tem que puxar a função do painel de controle; só quem tem
// que aparecer ali é o time corporativo, do executivo até o embaixador".
// É um RECORTE do topo acima (sem Conselheiro e Fundador), com a mesma
// leitura de cargos (cargosTopoDe) — nada de lista paralela.

/** Do Sócio Executivo (102) ao Embaixador (107), na ordem do plano de carreira. */
export const NIVEIS_TIME = CAREER_LEVELS
  .filter((l) => l.bloco === 'diretor' && l.ordem >= 102 && l.ordem <= 107)
  .map((l) => l.id);
const TIME_SET = new Set(NIVEIS_TIME);

/** O nível mais alto da pessoa dentro da faixa — ou null se ela não é do time. */
export function nivelNoTime(user) {
  return cargosTopoDe(user).find((id) => TIME_SET.has(id)) || null;
}

/** A função como está no painel de controle ("Sócio Executivo", "CEO"…). */
export const funcaoNoTime = (user) => { const n = nivelNoTime(user); return n ? getLevel(n).name : null; };

/** O cargo do jogo (xgame_participantes.cargo) que corresponde ao nível do painel. */
export function cargoDoNivel(nivel) {
  if (nivel === 'executivo_conta') return 'executivo';
  if (nivel === 'ceo') return 'ceo';
  return 'diretor';
}

/**
 * A lista pra tela da gestão: só quem é do time, em ordem alfabética, cada
 * um com a função do painel. `nome` já vem pronto pra mostrar.
 */
export function timeCorporativo(usuarios, nomeDe = (u) => u.full_name || u.nickname || u.email || u.id) {
  return (Array.isArray(usuarios) ? usuarios : [])
    .map((u) => ({ u, nivel: nivelNoTime(u) }))
    .filter(({ nivel }) => nivel)
    .map(({ u, nivel }) => ({ id: u.id, nome: nomeDe(u), nivel, funcao: getLevel(nivel).name, cargo: cargoDoNivel(nivel) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
