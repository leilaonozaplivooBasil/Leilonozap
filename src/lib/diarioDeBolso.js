// 📔 O DIÁRIO DE BOLSO — dono, 08/09/2026: "essa funcionalidade sirva para
// 'anotar' e 'documentar' os passos, tarefas e etc dos usuários de forma
// automática para que tudo que foi feito e aprendido esteja de fácil acesso
// pra eles conseguirem acessar/recapitular/conferir".
//
// FASE 1 (só leitura): o diário é MONTADO na hora, a partir do que a tarefa
// já carrega — nenhuma tabela, nenhuma gravação.
//
// FASE 2 (dono, 08/09/2026: "prepare o terreno" → "prossiga"): a mesma
// entrada agora pode carregar uma NOTA PESSOAL por cima (o que só a Fase 2
// permite escrever) e o texto/fonte já computados pela Fase 1 são
// MATERIALIZADOS em segundo plano em `diario_bolso_entradas` (migração
// 20260908180000) — "de forma automática", sem a pessoa precisar apertar
// nada. A LEITURA da lista continua vindo de `metodo_tarefas` (fonte da
// verdade, sempre fresca); a tabela nova só entra pra (a) guardar a nota
// pessoal e (b) congelar o texto pro dia em que a tarefa de origem sumir.
//
// A ORDEM DE PRIORIDADE DO TEXTO de cada entrada (o que a pessoa vê como "o
// que aconteceu aqui"):
//   1. o resumo que a PRÓPRIA PESSOA escreveu na comprovação de aprendizado
//      (comprovacao.resumo) — a fonte mais fiel, é a voz dela;
//   2. o que a IA viu ao validar a foto (comprovacao.veredito_ia.o_que_viu)
//      — já é uma frase pronta, gerada sem custo extra (a validação já rodou);
//   3. o ensinamento da tarefa (ensinamentoDaTarefa) — pra tarefas do
//      X-Performance com mentalidade/Hábito, já existe um parágrafo pronto
//      explicando por que aquilo importava;
//   4. o detalhe da tarefa, se houver;
//   5. nada — a entrada aparece só com o título e o horário, como um feito
//      simples (nem toda tarefa tem "aprendizado" pra contar, e está certo).
import { ensinamentoDaTarefa } from './mentalidades.js';

/**
 * O texto de uma entrada, com a FONTE (pra Fase 2 saber o que gravar em
 * `diario_bolso_entradas.fonte` e a tela poder rotular diferente: "escrito
 * por você" vs "a IA viu" vs "o método explica"). A prioridade do
 * comentário acima do arquivo, primeira fonte que tiver algo.
 */
export function textoEFonte(tarefa = {}) {
  const c = tarefa.comprovacao || {};
  if (typeof c.resumo === 'string' && c.resumo.trim()) return { texto: c.resumo.trim(), fonte: 'resumo' };
  if (typeof c.entrega === 'string' && c.entrega.trim() && !/^https?:\/\//i.test(c.entrega.trim())) return { texto: c.entrega.trim(), fonte: 'resumo' };
  if (typeof c.veredito_ia?.o_que_viu === 'string' && c.veredito_ia.o_que_viu.trim()) return { texto: c.veredito_ia.o_que_viu.trim(), fonte: 'ia' };
  if (tarefa.mentalidade || tarefa.habito) {
    const ensinamento = ensinamentoDaTarefa({ mentalidade: tarefa.mentalidade, habito: tarefa.habito, detalhe: tarefa.detalhe });
    if (ensinamento) return { texto: ensinamento, fonte: 'ensinamento' };
  }
  if (typeof tarefa.detalhe === 'string' && tarefa.detalhe.trim()) return { texto: tarefa.detalhe.trim(), fonte: 'detalhe' };
  return { texto: null, fonte: null };
}

/** O texto de uma entrada — a prioridade acima, primeira que tiver algo. */
export function textoDaEntrada(tarefa = {}) {
  return textoEFonte(tarefa).texto;
}

/**
 * Uma tarefa feita → uma entrada do diário: só o que a tela precisa
 * desenhar. `notaPessoal` (Fase 2, opcional): o que a pessoa escreveu por
 * cima, já lido de `diario_bolso_entradas` — a Fase 1 nunca passa isto.
 */
export function entradaDe(tarefa = {}, notaPessoal = null) {
  const { texto, fonte } = textoEFonte(tarefa);
  return {
    id: tarefa.id,
    data: String(tarefa.data || '').slice(0, 10),
    hora: tarefa.hora ? String(tarefa.hora).slice(0, 5) : null,
    titulo: tarefa.titulo || '',
    texto,
    fonte,
    notaPessoal: notaPessoal || null,
    temFoto: !!(tarefa.comprovacao?.print_url),
  };
}

/**
 * A linha pronta pra gravar em `diario_bolso_entradas`, a partir de uma
 * tarefa feita e de quem é a pessoa. `notaPessoal` (opcional) é o que a
 * PRÓPRIA pessoa escreveu por cima — passa `undefined`/omite pra não mexer
 * numa nota já existente ao regravar a mesma tarefa (a materialização
 * automática em segundo plano nunca passa nota; só o campo de nota passa).
 */
export function linhaParaGravar(tarefa = {}, userId, notaPessoal) {
  const e = entradaDe(tarefa);
  const linha = {
    user_id: userId,
    data: e.data,
    hora: e.hora,
    tarefa_id: tarefa.id ?? null,
    titulo: e.titulo,
    texto: e.texto,
    fonte: e.fonte,
  };
  if (notaPessoal !== undefined) linha.nota_pessoal = notaPessoal;
  return linha;
}

/**
 * As tarefas feitas, uma entrada por tarefa, agrupadas por dia (mais recente
 * primeiro) e por horário dentro do dia. `tarefas` já vem filtrada por
 * pessoa e por `feito = true` — esta função é pura, não busca nada.
 * `notasPorTarefa` (Fase 2, opcional): mapa `{ [tarefa_id]: nota_pessoal }`,
 * já lido de `diario_bolso_entradas`.
 */
export function diarioAgrupado(tarefas = [], notasPorTarefa = {}) {
  const porDia = new Map();
  for (const t of Array.isArray(tarefas) ? tarefas : []) {
    if (!t?.data) continue;
    const entrada = entradaDe(t, notasPorTarefa[t.id]);
    const lista = porDia.get(entrada.data) || [];
    lista.push(entrada);
    porDia.set(entrada.data, lista);
  }
  return [...porDia.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([data, entradas]) => ({
      data,
      entradas: entradas.sort((a, b) => (a.hora || '99:99').localeCompare(b.hora || '99:99')),
    }));
}

/**
 * Fase 2 — quais tarefas ainda não viraram linha em `diario_bolso_entradas`
 * (materialização automática em segundo plano). `idsJaGravados` é o
 * conjunto de `tarefa_id` já presentes na tabela — o que sobra aqui é o que
 * falta gravar, pronto pra virar um upsert em lote com `linhaParaGravar`.
 */
export function tarefasParaMaterializar(tarefas = [], idsJaGravados = new Set()) {
  return (Array.isArray(tarefas) ? tarefas : []).filter((t) => t?.id && !idsJaGravados.has(t.id));
}

/** Busca por palavra: casa no título, no texto ou na nota pessoal (sem acento, sem caixa). */
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function filtrarDiario(dias = [], termo = '') {
  const alvo = semAcento(termo).trim();
  if (!alvo) return dias;
  return dias
    .map((d) => ({
      ...d,
      entradas: d.entradas.filter((e) => semAcento(e.titulo).includes(alvo) || semAcento(e.texto).includes(alvo) || semAcento(e.notaPessoal).includes(alvo)),
    }))
    .filter((d) => d.entradas.length > 0);
}
