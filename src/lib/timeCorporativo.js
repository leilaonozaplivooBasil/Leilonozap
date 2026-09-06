// 🏛️ O TIME CORPORATIVO — quem aparece na gestão do X-Performance, e com
// qual função. Vem do PAINEL DE CONTROLE (os níveis de carreira do usuário),
// não de um cadastro à parte.
//
// Ordem do dono (06/09/2026): "tem que puxar a função do painel de controle,
// que já tem a função da pessoa. Só quem tem que aparecer ali é o time
// corporativo, que vai do executivo até o embaixador — todas essas pessoas".
import { CAREER_LEVELS, normalizeLevels, levelName } from './careerLevels.js';

/** Do Sócio Executivo (102) ao Embaixador (107), na ordem do plano de carreira. */
export const NIVEIS_TIME = CAREER_LEVELS
  .filter((l) => l.bloco === 'diretor' && l.ordem >= 102 && l.ordem <= 107)
  .map((l) => l.id);

const ORDEM = Object.fromEntries(CAREER_LEVELS.map((l) => [l.id, l.ordem]));

/** O nível mais alto da pessoa dentro do time — ou null se ela não é do time. */
export function nivelNoTime(user) {
  const meus = normalizeLevels(user?.career_levels).filter((id) => NIVEIS_TIME.includes(id));
  if (!meus.length) return null;
  return meus.sort((a, b) => ORDEM[b] - ORDEM[a])[0];
}

/** A função como está no painel de controle ("Sócio Executivo", "CEO"…). */
export const funcaoNoTime = (user) => { const n = nivelNoTime(user); return n ? levelName(n) : null; };

/** O cargo do jogo (xgame_participantes.cargo) que corresponde ao nível do painel. */
export function cargoDoNivel(nivel) {
  if (nivel === 'executivo_conta') return 'executivo';
  if (nivel === 'ceo') return 'ceo';
  return 'diretor';
}

/**
 * A lista pra tela: só quem é do time, em ordem alfabética, cada um com a
 * função do painel. `nome` já vem pronto pra mostrar.
 */
export function timeCorporativo(usuarios, nomeDe = (u) => u.full_name || u.nickname || u.email || u.id) {
  return (Array.isArray(usuarios) ? usuarios : [])
    .map((u) => ({ u, nivel: nivelNoTime(u) }))
    .filter(({ nivel }) => nivel)
    .map(({ u, nivel }) => ({ id: u.id, nome: nomeDe(u), nivel, funcao: levelName(nivel), cargo: cargoDoNivel(nivel) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
