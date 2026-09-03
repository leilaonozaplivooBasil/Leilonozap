/**
 * relogioLeilao — a DATA em que o leilão termina, escrita por extenso.
 *
 * 🔴 POR QUE ESTE ARQUIVO EXISTE (03/09/2026)
 * Um cliente abriu chamado dizendo que a CAIXA DE SOM MONDIAL estava "travada
 * em 1 semana": ele viu "1 semana" na semana passada e "1 semana" de novo hoje.
 *
 * Nada estava travado. O leilão nasceu com UM MÊS de duração (11/08 12:28 →
 * 11/09 12:28, ao minuto) e o contador da tela tem RESOLUÇÃO DE SEMANA:
 *
 *     Math.floor(diferenca / 7 dias)
 *
 * Isso faz "1 semana" cobrir de 7,00 a 13,99 dias — o rótulo fica parado por
 * SETE DIAS SEGUIDOS. Num leilão de um mês, a tela mostra só quatro rótulos
 * ("4 semanas", "3 semanas", "2 semanas", "1 semana") e depois vira dias.
 *
 * Ele lançou em 28/08 15:09, DUAS HORAS E QUARENTA depois de o rótulo virar
 * "1 semana". Nunca viu esse leilão dizer outra coisa. E não tinha como
 * conferir: a sala mostra só a HORA do lance ("15:09"), nunca a data.
 *
 * ─────────────── o que este arquivo faz, e o que NÃO faz ───────────────
 *
 * FAZ: devolver "11/09 às 12:28" — a data de término, sem ambiguidade.
 * NÃO FAZ: mexer no contador que já existe. Esta é a Fase 1, aditiva de
 * propósito: se qualquer coisa aqui falhar, a função devolve STRING VAZIA e a
 * tela fica exatamente como está hoje. Não existe caminho em que este arquivo
 * apague ou corrompa o que já funciona.
 *
 * ─────────────── por que as guardas são tão paranoicas ───────────────
 *
 * Medido antes de escrever, com o `toLocaleString` de verdade:
 *
 *     new Date(null)       → "31/12, 21:00"    ← a Época de 1970 em Brasília
 *     new Date(0)          → "31/12, 21:00"
 *     new Date(undefined)  → "Invalid Date"
 *
 * O caso `null` é o perigoso: não parece erro, PARECE INFORMAÇÃO. Um leilão sem
 * data de fim anunciaria "Termina 31/12 às 21:00" com a maior cara de sério.
 * Por isso nada sai daqui sem passar por `Number.isFinite`.
 */

/**
 * Fuso fixo, sempre. Nunca o do aparelho.
 *
 * Se a data fosse formatada no fuso do visitante, o MESMO leilão terminaria em
 * horas diferentes para pessoas diferentes — e num leilão isso não é detalhe de
 * exibição, é a regra do jogo. O Brasil não tem horário de verão desde 2019,
 * então não há ambiguidade de hora repetida ou inexistente.
 */
export const FUSO_DA_CASA = 'America/Sao_Paulo';

/**
 * Piso de sanidade: 01/01/2000.
 *
 * Recusar só `<= 0` não bastava — os próprios testes pegaram isso. `new Date(true)`
 * dá 1 milissegundo, que passa por "maior que zero" e vira "01/01 às 00:00" na
 * tela. Qualquer data anterior a 2000 num leilão é lixo que virou número no
 * caminho, nunca um término de verdade.
 */
const PISO_DE_SANIDADE = Date.UTC(2000, 0, 1);

/** O instante do término, em milissegundos — ou `null` se não dá para confiar. */
export function instanteDeTermino(endTime) {
  if (endTime === null || endTime === undefined || endTime === '') return null;
  let ms;
  try {
    // `new Date(Symbol())` LANÇA — não devolve Invalid Date. Sem este try, um
    // valor estranho vindo do banco derrubaria a tela inteira em vez de sumir.
    ms = endTime instanceof Date ? endTime.getTime() : new Date(endTime).getTime();
  } catch {
    return null;
  }
  if (!Number.isFinite(ms)) return null;
  if (ms < PISO_DE_SANIDADE) return null;
  return ms;
}

/**
 * A data de término para mostrar ao cliente: "11/09 às 12:28".
 *
 * @param {string|number|Date} endTime
 * @param {{comAno?: boolean}} [opcoes] comAno inclui o ano ("11/09/2026 às 12:28"),
 *   para quando o leilão termina em outro ano e "11/09" seria enganoso.
 * @returns {string} vazio quando não há data confiável — e aí a tela não desenha nada.
 */
export function dataDeTermino(endTime, opcoes = {}) {
  const ms = instanteDeTermino(endTime);
  if (ms === null) return '';
  try {
    const d = new Date(ms);
    const data = d.toLocaleDateString('pt-BR', {
      timeZone: FUSO_DA_CASA,
      day: '2-digit',
      month: '2-digit',
      ...(opcoes.comAno ? { year: 'numeric' } : {}),
    });
    const hora = d.toLocaleTimeString('pt-BR', {
      timeZone: FUSO_DA_CASA, hour: '2-digit', minute: '2-digit', hour12: false,
    });
    return `${data} às ${hora}`;
  } catch {
    // Ambiente sem Intl ou sem a base de fusos: melhor não escrever nada do que
    // escrever uma hora errada num leilão.
    return '';
  }
}

/**
 * Termina em ano diferente do de agora? Aí o "11/09" sozinho engana.
 * Comparação feita NO FUSO DA CASA, não no do aparelho.
 */
export function terminaEmOutroAno(endTime, agora = Date.now()) {
  const ms = instanteDeTermino(endTime);
  if (ms === null) return false;
  const ano = (t) => new Date(t).toLocaleDateString('pt-BR', { timeZone: FUSO_DA_CASA, year: 'numeric' });
  try { return ano(ms) !== ano(agora); } catch { return false; }
}

/**
 * O texto pronto, já decidindo sozinho se precisa do ano.
 * É esta que as telas usam — uma chamada, nenhuma decisão do lado do JSX.
 */
export function textoDeTermino(endTime, agora = Date.now()) {
  return dataDeTermino(endTime, { comAno: terminaEmOutroAno(endTime, agora) });
}
