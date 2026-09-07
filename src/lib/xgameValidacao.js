// 🤖 A VALIDAÇÃO FODA — DIR-84.
//
// Ordem do dono (07/09/2026): *"ela tem que pensar. Não deixa a foto repetida.
// Se a pessoa está comprovando um pré-treino com uma imagem deitada na cama,
// com uma imagem bebendo água, ela vai ter que perguntar pra pessoa justificar,
// antes mesmo de validar direto. Mas ela tem que cruzar imagem, ela tem que
// ser o maior validador do caralho pra ficar tudo automático e pouco ter
// intervenção humana. Na verdade tem que ser intervenção humana ZERO — ela
// tem que ser mais foda que humano nessas validações."*
//
// O que já existia (F10.2, xgameValidarPrint.js): a IA olhava UMA imagem
// isolada e devolvia aprovada/reprovada/duvida. "Duvida" caía direto na fila
// do gestor — intervenção humana na PRIMEIRA hesitação, o oposto do pedido.
//
// A regra que faltava, e mora aqui (pura, testável sem rede/sem IA):
// 1. Alguém só vira responsabilidade do GESTOR depois de ter tido a chance
//    de SE EXPLICAR pra própria IA — nunca na primeira dúvida.
// 2. Anti-reciclagem de imagem não é só hash exato (isso já existe e barra
//    ANTES de gastar chamada de IA) — a IA também recebe as últimas fotos
//    da MESMA pessoa pro MESMO tipo de tarefa, pra flagrar reuso reprocessado
//    (recortado, comprimido, com filtro) que o hash sozinho não pega.
//
// A CHAMADA À IA e o PROMPT moram em api/functions/xgameValidarPrint.js (só
// ali existe fetch de rede). Este arquivo é a REGRA de quando pedir
// justificativa, quando aceitar e quando — só então — cai pro humano.

/** Quantas fotos recentes (do mesmo tipo, mesma pessoa) mandar pra IA
 *  comparar. Mais que isso é payload caro sem ganho real de precisão. */
export const JANELA_ANTI_RECICLAGEM = 4;

/** As últimas N comprovações (mais recentes primeiro) do mesmo tipo de
 *  tarefa, pra IA cruzar contra a imagem nova. `lista` vem em qualquer ordem
 *  com `{ quando, print_url }`; devolve só as URLs, mais recentes primeiro,
 *  sem nulos. */
export function imagensParaComparar(lista = [], n = JANELA_ANTI_RECICLAGEM) {
  return (Array.isArray(lista) ? lista : [])
    .filter((c) => c && c.print_url)
    .sort((a, b) => String(b.quando || '').localeCompare(String(a.quando || '')))
    .slice(0, n)
    .map((c) => c.print_url);
}

/**
 * O que fazer com o veredito da IA — a régua de "zero intervenção humana
 * até esgotar a chance de justificar".
 *
 * `tentativa` conta rodadas de IA para ESTA comprovação: 1 = primeira olhada
 * (sem justificativa da pessoa ainda); 2 = já veio com a justificativa dela.
 *
 * @returns {{acao: 'aprovar'|'reprovar'|'pedir_justificativa'|'analise_gestor', motivo?: string, pergunta?: string}}
 */
export function decisaoAposIA(ia, { foraDaJanela = false, tentativa = 1 } = {}) {
  // 🚫 DIR-84.1 — IA FORA DO AR NÃO É "DÚVIDA". Antes, gateway caído virava
  // 'duvida' → 'em_analise' → a tarefa CONTAVA provisoriamente: qualquer foto
  // passava enquanto a IA estivesse fora (foi exatamente o que o dono viu —
  // foto na cama aceita pra "Resolver: o financeiro"). Sem IA não há
  // validação; sem validação não há conclusão. A pessoa tenta de novo.
  if (ia?.ia_indisponivel) {
    return { acao: 'ia_fora', motivo: ia?.motivo || 'a IA de validação está fora do ar agora' };
  }
  const veredito = ia?.veredito;
  const pergunta = String(ia?.pergunta_para_pessoa || '').trim();

  if (veredito === 'aprovada') {
    // aprovada mas fora da janela de horário: a IA confirma que a prova é
    // real, mas o PRAZO é regra da casa, não da IA — isso o gestor decide.
    return { acao: foraDaJanela ? 'analise_gestor' : 'aprovar' };
  }

  if (veredito === 'reprovada') {
    // reprovação franca (ex.: imagem sem nenhuma relação, ou reciclagem
    // clara) não precisa de segunda chance — a pessoa reenvia uma prova nova.
    return { acao: 'reprovar', motivo: ia?.motivo || 'a imagem não comprova essa tarefa' };
  }

  // veredito === 'duvida' (ou ausente/inesperado: trata como dúvida, nunca
  // aprova/reprova por omissão)
  if (tentativa <= 1 && pergunta) {
    // primeira hesitação COM uma pergunta específica → a pessoa se explica
    // antes de qualquer humano ser acionado.
    return { acao: 'pedir_justificativa', pergunta };
  }
  // sem pergunta pra fazer, ou já é a segunda rodada (a pessoa já se
  // justificou e a IA continua em dúvida): aí sim, e só aí, o gestor entra.
  return { acao: 'analise_gestor', motivo: ia?.motivo || 'a IA não conseguiu decidir com segurança' };
}
