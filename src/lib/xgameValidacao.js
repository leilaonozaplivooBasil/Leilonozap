// 🤖 A VALIDAÇÃO FODA — DIR-84, e DIR-89 (07/09/2026) fechando o gestor de vez.
//
// Ordem do dono (07/09/2026, DIR-84): *"ela tem que pensar. Não deixa a foto
// repetida. Se a pessoa está comprovando um pré-treino com uma imagem deitada
// na cama, com uma imagem bebendo água, ela vai ter que perguntar pra pessoa
// justificar, antes mesmo de validar direto. Mas ela tem que cruzar imagem,
// ela tem que ser o maior validador do caralho pra ficar tudo automático e
// pouco ter intervenção humana. Na verdade tem que ser intervenção humana
// ZERO — ela tem que ser mais foda que humano nessas validações."*
//
// O que ainda sobrava depois da DIR-84: duas rotas para o GESTOR — "aprovada
// mas fora da janela de horário" e "ainda em dúvida depois da pessoa se
// explicar" — davam trabalho de decidir caso a caso. Ordem do dono (DIR-89):
// *"mais fácil diminuir a régua justamente pra evitar tantas reprovações, e
// não deve haver mais aprovação vinda da minha parte. Melhorar o fluxo para
// zerar meu trabalho."* As duas rotas aprovam sozinhas agora — 'analise_gestor'
// não existe mais como ação. Atraso e dúvida residual (depois da chance de se
// explicar) pesam a favor da pessoa, não do gestor.
//
// O que já existia (F10.2, xgameValidarPrint.js): a IA olhava UMA imagem
// isolada e devolvia aprovada/reprovada/duvida.
//
// A regra que mora aqui (pura, testável sem rede/sem IA):
// 1. Toda dúvida ganha uma chance de SE EXPLICAR pra própria IA antes de
//    qualquer decisão final — mas a decisão final, com ou sem convencer,
//    é sempre automática (nunca mais um humano).
// 2. Anti-reciclagem de imagem não é só hash exato (isso já existe e barra
//    ANTES de gastar chamada de IA) — a IA também recebe as últimas fotos
//    da MESMA pessoa pro MESMO tipo de tarefa, pra flagrar reuso reprocessado
//    (recortado, comprimido, com filtro) que o hash sozinho não pega. Essa
//    trava continua de pé: só o "cai pro gestor" saiu de cena.
//
// A CHAMADA À IA e o PROMPT moram em api/functions/xgameValidarPrint.js (só
// ali existe fetch de rede). Este arquivo é a REGRA de quando pedir
// justificativa e quando aceitar — não existe mais "quando cai pro humano".

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
 * O que fazer com o veredito da IA — a régua de "intervenção humana ZERO,
 * de vez" (DIR-89): a única saída que não é automática é a IA fora do ar
 * (aí ninguém decide nada, nem a favor nem contra — a pessoa tenta de novo).
 *
 * `tentativa` conta rodadas de IA para ESTA comprovação: 1 = primeira olhada
 * (sem justificativa da pessoa ainda); 2 = já veio com a justificativa dela.
 *
 * @returns {{acao: 'aprovar'|'reprovar'|'pedir_justificativa'|'ia_fora', motivo?: string, pergunta?: string}}
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
    // 🌊 DIR-89 — aprovada mas fora da janela de horário: a IA já confirmou
    // que a prova é real: atraso é regra de HORÁRIO, não motivo pra segurar
    // a aprovação esperando alguém decidir. `fora_da_janela` continua sendo
    // gravado por quem chama (CrmMetodo.jsx), só não trava mais em fila.
    return { acao: 'aprovar' };
  }

  if (veredito === 'reprovada') {
    // reprovação franca (ex.: imagem sem nenhuma relação, ou reciclagem
    // clara) não precisa de segunda chance — a pessoa reenvia uma prova nova.
    return { acao: 'reprovar', motivo: ia?.motivo || 'a imagem não comprova essa tarefa' };
  }

  // veredito === 'duvida' (ou ausente/inesperado: trata como dúvida, nunca
  // reprova por omissão)
  if (tentativa <= 1 && pergunta) {
    // primeira hesitação COM uma pergunta específica → a pessoa se explica
    // antes da decisão final.
    return { acao: 'pedir_justificativa', pergunta };
  }
  // 🌊 DIR-89 — sem pergunta pra fazer, ou já é a segunda rodada (a pessoa já
  // se justificou e a IA continua em dúvida): antes caía pro gestor decidir;
  // agora o benefício da dúvida é da PESSOA — aprova, com o veredito e o
  // motivo da IA preservados em `veredito_ia` pra quem quiser auditar depois.
  return { acao: 'aprovar', motivo: ia?.motivo || 'dúvida residual — aprovada com o benefício da dúvida' };
}
