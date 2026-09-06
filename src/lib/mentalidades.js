// 🎓 AS MENTALIDADES NA TAREFA — planejamento com ensinamento.
//
// DE ONDE VEIO (ditado pelo dono em 06/09/2026, na gestão do X-Performance):
// "eu preciso ter ali as funções do executivo, do diretor e do CEO, e cada
// vez que eu for atribuir algo eu boto que essa tarefa é de mentalidade do
// diretor, do CEO — inclusive botar peso no valor de acordo com as
// mentalidades — e sempre explicando a ele como funciona um diretor. É um
// ensinamento. Planejamento com ensinamento, com entendimento."
//
// AS TRÊS REGRAS:
//   1. A MENTALIDADE É A TRILHA DO X-PERFORMANCE (TRILHAS): executivo faz
//      acontecer (Hábitos 1 a 5), diretor multiplica e mede (5 a 8), CEO
//      constrói o sistema (5 a 8). Não é conteúdo novo — é a mesma lente.
//   2. O PESO GANHA O ACRÉSCIMO DA MENTALIDADE: a regra do título dá a base
//      (pesoAutomatico); diretor soma 1, CEO soma 2; teto 6. Tarefa de
//      diretor pesa mais porque mexe no time, não só na própria mão.
//   3. TODA TAREFA COM MENTALIDADE LEVA O ENSINAMENTO no `detalhe`: como
//      aquela mentalidade trabalha e qual Hábito a tarefa serve. É o que a
//      pessoa lê no Compromisso dela, embaixo do título.
import { TRILHAS } from './xperformance.js';
import { HABITOS } from './metodo.js';
import { pesoAutomatico, porqueDoPeso } from './xgame.js';

export const ACRESCIMO_MENTALIDADE = { executivo: 0, diretor: 1, ceo: 2 };
export const PESO_TETO = 6;

/** Como cada mentalidade trabalha — o que a pessoa lê embaixo da tarefa. */
const COMO_FUNCIONA = {
  executivo: 'O executivo faz acontecer com a própria mão: tem o sonho claro, cumpre o compromisso todo dia, cuida da lista, faz o contato e apresenta. O resultado dele é o que ele mesmo entrega.',
  diretor: 'O diretor multiplica e mede: acompanha cada pessoa do time, verifica os números toda semana, corrige o que travou e ensina o método até o time performar sem empurrão. O resultado dele é o time.',
  ceo: 'O CEO constrói o sistema: desenha como a operação roda, forma diretores, decide com números e faz a máquina funcionar sem ele na sala. O resultado dele é a empresa inteira.',
};

export const MENTALIDADES = TRILHAS.map((t) => ({
  id: t.id, nome: t.nome, lema: t.lema, foco: t.foco, entrega: t.entrega,
  acrescimo: ACRESCIMO_MENTALIDADE[t.id] || 0,
  comoFunciona: COMO_FUNCIONA[t.id],
}));

export const mentalidadeDe = (id) => MENTALIDADES.find((m) => m.id === String(id || '').toLowerCase()) || null;

/** A mentalidade padrão pelo cargo do jogo (trainee entra na do executivo). */
export function mentalidadePadrao(cargo) {
  const c = String(cargo || '').toLowerCase();
  return mentalidadeDe(c === 'trainee' ? 'executivo' : c)?.id || 'executivo';
}

/** O peso com a mentalidade: base pelo título + acréscimo, teto 6 — e o porquê, escrito. */
export function pesoComMentalidade(titulo, mentalidade) {
  const m = mentalidadeDe(mentalidade);
  const base = pesoAutomatico(titulo);
  const acrescimo = m?.acrescimo || 0;
  const peso = Math.min(PESO_TETO, base + acrescimo);
  const porque = acrescimo
    ? `${porqueDoPeso(titulo)} + ${acrescimo} pela ${m.nome}${base + acrescimo > PESO_TETO ? ' (teto 6)' : ''}`
    : porqueDoPeso(titulo);
  return { peso, base, acrescimo, porque };
}

/** O Hábito por número, com o nome completo. */
export const habitoDe = (n) => HABITOS.find((h) => h.n === Number(n)) || null;

/**
 * O texto que vai no `detalhe` da tarefa — o ensinamento. Sem mentalidade,
 * devolve o detalhe que já existia (ou vazio): tarefa de rotina não ganha
 * sermão.
 */
export function ensinamentoDaTarefa({ mentalidade, habito, detalhe = '' } = {}) {
  const m = mentalidadeDe(mentalidade);
  if (!m) return String(detalhe || '');
  const h = habitoDe(habito);
  const partes = [
    `🎓 ${m.nome} — ${m.lema.toLowerCase()}. ${m.comoFunciona}`,
    h ? `Esta tarefa serve o Hábito ${h.n} (${h.completo}): ${h.texto}` : null,
    String(detalhe || '').trim() || null,
  ].filter(Boolean);
  return partes.join('\n');
}

/**
 * O planejamento do dia da pessoa foi gerado? A Rotina Perfeita cria as
 * tarefas do dia; dia sem NENHUMA tarefa = não gerou. Tarefa distribuída
 * pela gestão (origem xperf) não conta como planejamento — é encomenda.
 */
export function planejamentoDoDia(tarefasDoDia = []) {
  const lista = Array.isArray(tarefasDoDia) ? tarefasDoDia : [];
  const daRotina = lista.filter((t) => t.origem !== 'xperf');
  const distribuidas = lista.length - daRotina.length;
  return {
    gerado: daRotina.length > 0,
    total: lista.length,
    daRotina: daRotina.length,
    distribuidas,
    feitas: lista.filter((t) => t.feito).length,
  };
}

/** Quantas tarefas, quanto peso e quanto dinheiro por mentalidade (e as sem mentalidade). */
export function resumoPorMentalidade(tarefas = [], valores = {}) {
  const saida = Object.fromEntries([...MENTALIDADES.map((m) => m.id), 'rotina'].map((id) => [id, { n: 0, peso: 0, valor: 0 }]));
  for (const t of Array.isArray(tarefas) ? tarefas : []) {
    const id = mentalidadeDe(t.mentalidade)?.id || 'rotina';
    saida[id].n += 1;
    saida[id].peso += Number(t.peso) || 0;
    saida[id].valor += Number(valores[t.id]) || 0;
  }
  for (const k of Object.keys(saida)) saida[k].valor = Math.round(saida[k].valor * 100) / 100;
  return saida;
}
