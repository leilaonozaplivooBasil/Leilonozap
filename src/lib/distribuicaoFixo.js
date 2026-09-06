// 💰 O FIXO DISTRIBUÍDO PELO PESO DAS TAREFAS — a conta, sem tela.
//
// DE ONDE VEIO (ditado pelo dono em 06/09/2026, olhando o X-Performance):
// "o Emanuel vai ganhar sete mil por mês; isso tem que ser distribuído em
// todas as tarefas. O valor de ganho é de acordo com o peso da tarefa, e tem
// que ser distribuído em x tarefas no dia, mínimo. Sete mil dividido pelos
// dias — e conforme eu for colocando, o sistema tem que me avisar: essa
// tarefa tem peso x, vale x em dinheiro, e automaticamente vai ser tirado
// das outras, pra dar sete mil no total."
//
// AS TRÊS REGRAS, e por que cada uma:
//
// 1. O DIA VALE SEMPRE A MESMA COISA: fixo ÷ os DIAS DE OPERAÇÃO do mês.
//    Régua do dono (06/09/2026): "o dia tem que ser distribuído por vinte e
//    quatro; vinte e dois é pouco". Sete mil viram R$ 291,67 por dia.
//    (O calendário do ciclo do X-GAME continua em 22 dias úteis; a divisão
//    do fixo é a régua de pagamento, e é dele.)
//
// 2. DENTRO DO DIA, O PESO REPARTE O VALOR: cada tarefa recebe
//    valorDoDia × peso ÷ soma dos pesos do dia. É isso que faz uma tarefa
//    nova "tirar das outras" automaticamente — o bolo é o mesmo, a fatia
//    de cada uma muda. A soma das fatias É o valor do dia, sempre.
//    (A fórmula antiga da planilha — verba ÷ 22 ÷ nº de tarefas × peso ÷ 3 —
//    não somava o fixo: três tarefas de peso 5 pagavam 5/3 do dia.)
//
// 3. O DIA COMPLETO É A ROTINA PERFEITA. Correção do dono (06/09/2026,
//    olhando "pegar as pautas" valer R$ 106 num dia vazio): "o planejamento
//    diário perfeito são mais de vinte tarefas; uma tarefa dessa não pode
//    valer cento e seis reais num dia". Então o dia só paga inteiro quando o
//    PESO somado das tarefas chega ao peso da Rotina Perfeita
//    (`pesoReferencia`, hoje 75 — 18 tarefas de produção). Uma tarefa de
//    peso 6 num dia vazio vale 6/75 do dia (R$ 25,45 com R$ 7.000), e num
//    dia gerado vale a fatia dela no total. O que falta pro dia completo
//    fica "em aberto" — visível, não pago.
//    (Sem `pesoReferencia`, vale o mínimo por CONTAGEM de tarefas — a régua
//    anterior, mantida pra quem chamar assim.)
//
// Centavos: a distribuição é feita em centavos inteiros e a sobra do
// arredondamento vai pra tarefa de maior peso, pra soma bater no centavo.

export const DIAS_FIXO = 24;
export const MINIMO_DIA_PADRAO = 3;
export const PESO_MIN = 1;
export const PESO_MAX = 6;

const centavos = (n) => Math.round((Number(n) || 0) * 100);
const reais = (c) => c / 100;
/** Peso dentro da régua 1..6; sem peso (null/vazio/texto) vale 3, o padrão do jogo. */
export const pesoValido = (p) => {
  if (p === null || p === undefined || p === '') return 3;
  const n = Number(p);
  if (!Number.isFinite(n)) return 3;
  return Math.min(PESO_MAX, Math.max(PESO_MIN, Math.round(n)));
};

/** Quanto vale um dia útil: fixo ÷ dias. Em reais, com centavos. */
export function valorDoDia(fixoMes, dias = DIAS_FIXO) {
  const d = Math.max(1, Number(dias) || DIAS_FIXO);
  return reais(Math.round(centavos(fixoMes) / d));
}

/**
 * Reparte `totalCentavos` entre as tarefas na proporção do peso, em centavos
 * inteiros; a sobra do arredondamento vai pra de maior peso (a última, em
 * empate). Devolve mapa id → centavos.
 */
function repartirCentavos(totalCentavos, tarefas) {
  const somaPesos = tarefas.reduce((s, t) => s + pesoValido(t.peso), 0);
  if (!tarefas.length || somaPesos <= 0 || totalCentavos <= 0) return Object.fromEntries(tarefas.map((t) => [t.id, 0]));
  const mapa = {};
  let dado = 0;
  let maior = tarefas[0];
  for (const t of tarefas) {
    const fatia = Math.floor((totalCentavos * pesoValido(t.peso)) / somaPesos);
    mapa[t.id] = fatia;
    dado += fatia;
    if (pesoValido(t.peso) >= pesoValido(maior.peso)) maior = t;
  }
  mapa[maior.id] += totalCentavos - dado;
  return mapa;
}

/**
 * A distribuição de UM dia.
 * @param {{fixoMes:number, dias?:number, minimoDia?:number, tarefas:{id:string,peso?:number}[]}} p
 * @returns {{ valorDia:number, valores:Object<string,number>, pago:number, emAberto:number,
 *             faltam:number, fator:number, somaPesos:number, minimoDia:number }}
 *   valores  — id → R$ da tarefa (somam `pago`)
 *   pago     — o que o dia paga com as tarefas que tem
 *   emAberto — o que ficou sem tarefa (valorDia − pago)
 *   faltam   — quantas tarefas faltam pro mínimo
 */
export function distribuirDia({ fixoMes, dias = DIAS_FIXO, minimoDia = MINIMO_DIA_PADRAO, pesoReferencia = null, tarefas = [] } = {}) {
  const lista = (Array.isArray(tarefas) ? tarefas : []).filter((t) => t && t.id != null);
  const minimo = Math.max(1, Math.round(Number(minimoDia) || MINIMO_DIA_PADRAO));
  const diaC = centavos(valorDoDia(fixoMes, dias));
  const somaPesos = lista.reduce((s, t) => s + pesoValido(t.peso), 0);
  const referencia = Number(pesoReferencia) > 0 ? Number(pesoReferencia) : null;
  // por PESO (a Rotina Perfeita) quando há referência; senão por contagem
  const fator = referencia ? Math.min(1, somaPesos / referencia) : Math.min(1, lista.length / minimo);
  const pagoC = Math.round(diaC * fator);
  const mapaC = repartirCentavos(pagoC, lista);
  const valores = Object.fromEntries(Object.entries(mapaC).map(([id, c]) => [id, reais(c)]));
  const pago = reais(Object.values(mapaC).reduce((s, c) => s + c, 0));
  return {
    valorDia: reais(diaC),
    valores,
    pago,
    emAberto: reais(diaC - centavos(pago)),
    faltam: referencia ? 0 : Math.max(0, minimo - lista.length),
    pesoFalta: referencia ? Math.max(0, referencia - somaPesos) : 0,
    pesoReferencia: referencia,
    fator,
    somaPesos,
    minimoDia: minimo,
  };
}

/**
 * "Essa tarefa tem peso x, vale x em dinheiro, e as outras caem pra tanto."
 * Simula a entrada de uma tarefa nova no dia SEM gravar nada.
 */
export function simularNovaTarefa({ fixoMes, dias, minimoDia, pesoReferencia, tarefas = [], novaPeso = 3 } = {}) {
  const antes = distribuirDia({ fixoMes, dias, minimoDia, pesoReferencia, tarefas });
  const nova = { id: '__nova__', peso: pesoValido(novaPeso) };
  const depois = distribuirDia({ fixoMes, dias, minimoDia, pesoReferencia, tarefas: [...tarefas, nova] });
  const quedas = tarefas
    .filter((t) => t && t.id != null)
    .map((t) => ({ id: t.id, de: antes.valores[t.id] ?? 0, para: depois.valores[t.id] ?? 0 }))
    // um centavo de diferença é arredondamento, não queda — não vira aviso
    .filter((q) => Math.abs(q.de - q.para) > 0.011);
  return {
    valorNova: depois.valores[nova.id] ?? 0,
    valorDia: depois.valorDia,
    antes: antes.valores,
    depois: Object.fromEntries(Object.entries(depois.valores).filter(([id]) => id !== nova.id)),
    quedas,
    pagoAntes: antes.pago,
    pagoDepois: depois.pago,
    faltavam: antes.faltam,
    faltam: depois.faltam,
    pesoFaltava: antes.pesoFalta,
    pesoFalta: depois.pesoFalta,
  };
}

/**
 * O mês (ciclo) de uma pessoa: o que já foi ganho, o que ainda está por
 * vir e o que ficou em aberto. `tarefasPorDia` = { 'YYYY-MM-DD': [tarefa] };
 * `ganho` conta tarefa FEITA; `aConferir` é a parte do ganho que o gestor
 * ainda não deu o SIM (conferência dupla).
 */
export function resumoDoCiclo({ fixoMes, dias = DIAS_FIXO, minimoDia, pesoReferencia, tarefasPorDia = {}, diasDoCiclo = [], hojeISO } = {}) {
  const hoje = String(hojeISO || '').slice(0, 10);
  let ganho = 0; let aConferir = 0; let emJogo = 0; let emAberto = 0; let perdido = 0;
  const diasComTarefa = new Set(Object.keys(tarefasPorDia));
  const todos = [...new Set([...diasDoCiclo, ...diasComTarefa])].sort();
  for (const dia of todos) {
    const tarefas = tarefasPorDia[dia] || [];
    const d = distribuirDia({ fixoMes, dias, minimoDia, pesoReferencia, tarefas });
    const passou = hoje && dia < hoje;
    for (const t of tarefas) {
      const v = d.valores[t.id] || 0;
      if (t.feito) { ganho += v; if (t.conferido !== true) aConferir += v; }
      else if (passou) perdido += v;
      else emJogo += v;
    }
    if (passou) perdido += d.emAberto; else emAberto += d.emAberto;
  }
  const r2 = (n) => Math.round(n * 100) / 100;
  return {
    fixo: Number(fixoMes) || 0,
    valorDia: valorDoDia(fixoMes, dias),
    ganho: r2(ganho), aConferir: r2(aConferir), emJogo: r2(emJogo), perdido: r2(perdido), emAberto: r2(emAberto),
  };
}
