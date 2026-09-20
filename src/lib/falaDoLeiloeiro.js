/**
 * 🔨 QUANDO O LEILOEIRO FALA — e por que ele estava perdendo a deixa.
 *
 * 🔴 O DEFEITO (achado em 20/09/2026)
 *
 * O leiloeiro da sala fala três vezes, em segundos exatos do fim: 110, 70 e 35.
 * A condição era IGUALDADE:
 *
 *     if (remaining === trigger.time)
 *
 * avaliada uma vez por segundo. Se AQUELE segundo não for avaliado, a fala se
 * perde para sempre: o relógio segue para 109, 108, e o 110 nunca volta.
 *
 * E pular um segundo não é exceção, é rotina:
 *   • aba em segundo plano — o navegador estrangula setInterval para ~1x por
 *     minuto. Quem deixa a sala aberta em outra aba NUNCA vê o leiloeiro;
 *   • celular com a tela apagada, ou o app fora de foco;
 *   • uma pausa de coleta de lixo, ou o recálculo do relógio do servidor
 *     caindo justo em cima da virada.
 *
 * Não dava erro. Dava silêncio — que é o pior dos dois, porque ninguém nota.
 *
 * ── A REGRA NOVA: CRUZAMENTO, NÃO COINCIDÊNCIA ──
 *
 * Fala quando o relógio CRUZA a marca: estava acima, passou para igual ou
 * abaixo. Um tique de 60 segundos continua disparando a fala que ficou no meio.
 *
 * 🔒 DUAS COISAS QUE ELA NÃO PODE FAZER, E POR ISSO ESTÃO AQUI
 *
 * 1. Não fala ao ABRIR a sala já adiantada. Quem entra faltando 30 segundos
 *    não pode levar "dou-lhe uma, duas e três" de uma vez na cara: ele não
 *    perdeu nada, ele chegou agora. Sem `anterior`, ninguém fala.
 *
 * 2. Se um tique pular VÁRIAS marcas de uma vez (de 120 para 30, cruzando as
 *    três), fala só a MAIS URGENTE. Três balões empilhados viram ruído, e a
 *    informação que importa é a última.
 */

/** As três deixas, da mais distante para a mais urgente. */
export const DEIXAS = [
  { time: 110, phase: 1, chave: 'first', message: 'Dou-lhe uma! O lote segue em disputa. Registre o seu lance.' },
  { time: 70, phase: 2, chave: 'second', message: 'Dou-lhe duas! A disputa continua aberta. Últimos lances.' },
  { time: 35, phase: 3, chave: 'third', message: 'Dou-lhe três! Última chamada antes do arremate.' },
];

/**
 * Que deixa falar agora?
 *
 * @param {object} p
 * @param {number|null} p.anterior  segundos restantes no tique passado (null = primeiro)
 * @param {number} p.agora          segundos restantes agora
 * @param {object} p.jaDitas        { first, second, third } — o que já foi falado
 * @returns {object|null} a deixa a falar, ou null
 */
export function deixaAoCruzar({ anterior, agora, jaDitas = {} } = {}) {
  // Primeiro tique da sala: não há travessia, só uma leitura. Ver a trava 1.
  if (anterior === null || anterior === undefined) return null;
  if (!Number.isFinite(agora) || !Number.isFinite(anterior)) return null;

  const cruzadas = DEIXAS.filter(
    (d) => !jaDitas[d.chave] && anterior > d.time && agora <= d.time,
  );
  if (!cruzadas.length) return null;

  // A mais urgente é a de menor tempo — ver a trava 2.
  return cruzadas.reduce((maisUrgente, d) => (d.time < maisUrgente.time ? d : maisUrgente));
}

/**
 * Tudo que o tique pulou fica marcado como dito, mesmo o que não vai ser falado.
 *
 * Sem isto, um salto de 120 para 30 falaria "dou-lhe três" agora e, no tique
 * seguinte, "dou-lhe uma" e "dou-lhe duas" ficariam eternamente pendentes —
 * prontas para disparar fora de hora se o relógio oscilasse para cima.
 */
export function marcarCruzadas({ anterior, agora, jaDitas = {} } = {}) {
  const novo = { ...jaDitas };
  if (anterior === null || anterior === undefined) return novo;
  if (!Number.isFinite(agora) || !Number.isFinite(anterior)) return novo;
  for (const d of DEIXAS) {
    if (anterior > d.time && agora <= d.time) novo[d.chave] = true;
  }
  return novo;
}
