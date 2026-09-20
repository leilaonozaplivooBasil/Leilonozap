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

// 🏢 07/09 — CONTAS não são PESSOAS. "Distribuidor Recreio – Eloha", "Leilão
// Nozap – Site Oficial" e "Livoo Live" carregam nível do painel (pra receber
// participação), mas não acordam às 5 nem fazem lista: contá-las como gente
// deixava a média em 0,7 de 8 e "11 sem nenhum hábito" — números desonestos.
// Até existir a marca no cadastro, a leitura é pelo nome: sinais de empresa,
// canal ou loja. Quem some daqui é mostrado na tela como "N contas fora do time".
const SINAIS_DE_CONTA = /\b(site oficial|oficial|distribuidor(a)?|loja|live|canal|ltda|s\/a|holding|franquia|unidade|filial|matriz|equipe|time|suporte|financeiro|admin(istra[cç][aã]o)?)\b/i;
export function pareceConta(nome) {
  const n = String(nome || '').trim();
  if (!n) return false;
  if (/\s[–—-]\s/.test(n)) return true; // "Distribuidor Recreio – Eloha", "Leilão Nozap – Site Oficial"
  return SINAIS_DE_CONTA.test(n.normalize('NFD').replace(/[̀-ͯ]/g, ''));
}
/** As contas que têm nível do painel mas não entram no time de pessoas. */
export function contasForaDoTime(usuarios, nomeDe = (u) => u.full_name || u.nickname || u.email || u.id) {
  return (Array.isArray(usuarios) ? usuarios : []).filter((u) => nivelNoTime(u) && pareceConta(nomeDe(u)));
}

/**
 * A lista pra tela da gestão: só quem é do time, em ordem alfabética, cada
 * um com a função do painel. `nome` já vem pronto pra mostrar.
 * Contas institucionais (pareceConta) ficam fora — são empresa, não gente.
 */
export function timeCorporativo(usuarios, nomeDe = (u) => u.full_name || u.nickname || u.email || u.id) {
  return (Array.isArray(usuarios) ? usuarios : [])
    .map((u) => ({ u, nivel: nivelNoTime(u) }))
    .filter(({ u, nivel }) => nivel && !pareceConta(nomeDe(u)))
    .map(({ u, nivel }) => ({ id: u.id, nome: nomeDe(u), nivel, funcao: getLevel(nivel).name, cargo: cargoDoNivel(nivel) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// 🎯 20/09/2026 — dono, no "escolha a pessoa…" do Quadro Geral (X-Performance):
// "aqui preciso que todos que estão recebendo apareça aqui, exemplo Sophia
// Sant'Anna não está aparecendo." Achado: Sophia tem cadastro ativo em
// xgame_participantes (recebe verba de produção) mas não é do time
// corporativo (não é Sócio Executivo pra cima) — timeCorporativo() não a
// lista, porque essa função responde "quem o gestor administra na
// hierarquia", uma pergunta diferente de "quem recebe dinheiro no jogo".
// A resposta certa pro Quadro Geral é a união: o time corporativo (que
// continua a base, com a função do painel) + quem tem cadastro ativo no
// jogo e ainda não está nela, com a função que dá pra saber sobre ele.
/**
 * @param {{id:string, nome:string}[]} equipe o time corporativo já calculado (timeCorporativo())
 * @param {{user_id:string, ativo?:boolean, cargo?:string}[]} participantes linhas de xgame_participantes
 * @param {Map<string,object>} usuariosPorId app_users indexados por id
 * @param {(u:object)=>string} nomeDe como extrair o nome de exibição de um app_user (mesma função passada pra timeCorporativo)
 * @param {(id:string)=>string} nomeFallback nome de fallback quando o usuário não está no mapa
 */
export function equipeQuadroGeral(equipe = [], participantes = [], usuariosPorId = new Map(), nomeDe = (u) => u.full_name || u.nickname || u.email || u.id, nomeFallback = (id) => id) {
  const extras = (Array.isArray(participantes) ? participantes : [])
    .filter((p) => p?.ativo !== false && !equipe.some((m) => m.id === p.user_id))
    .map((p) => {
      const u = usuariosPorId.get?.(p.user_id);
      const nivelPainel = normalizeLevels(u?.primary_career_level ? [u.primary_career_level] : [])[0] || null;
      const funcao = (nivelPainel && getLevel(nivelPainel)?.name)
        || (p.cargo ? p.cargo.charAt(0).toUpperCase() + p.cargo.slice(1) : 'Sem função no painel');
      return { id: p.user_id, nome: u ? nomeDe(u) : nomeFallback(p.user_id), nivel: null, funcao, cargo: p.cargo || 'executivo' };
    });
  return [...equipe, ...extras].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
