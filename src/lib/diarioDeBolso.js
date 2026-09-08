// 📔 O DIÁRIO DE BOLSO — Fase 1 (dono, 08/09/2026): "essa funcionalidade
// sirva para 'anotar' e 'documentar' os passos, tarefas e etc dos usuários
// de forma automática para que tudo que foi feito e aprendido esteja de
// fácil acesso pra eles conseguirem acessar/recapitular/conferir".
//
// FASE 1 É SÓ LEITURA: nada aqui grava nada novo no banco. As entradas são
// MONTADAS na hora, a partir do que a tarefa já carrega (a régua pura vive
// aqui pra dar pra testar sem tela) — se o formato agradar, a Fase 2 decide
// se vale persistir. Zero tabela nova, zero cron novo, zero risco pro que já
// funciona: é puramente aditivo.
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

/** Uma tarefa feita → uma entrada do diário: só o que a tela precisa desenhar. */
export function entradaDe(tarefa = {}) {
  const { texto, fonte } = textoEFonte(tarefa);
  return {
    id: tarefa.id,
    data: String(tarefa.data || '').slice(0, 10),
    hora: tarefa.hora ? String(tarefa.hora).slice(0, 5) : null,
    titulo: tarefa.titulo || '',
    texto,
    fonte,
    temFoto: !!(tarefa.comprovacao?.print_url),
  };
}

// ── 🚧 FASE 2 (terreno preparado em 08/09/2026) ─────────────────────────────
// A função abaixo NÃO é chamada por nenhuma tela ainda — a Fase 1 continua só
// leitura. Ela existe pronta pra quando a Fase 2 for ligada: monta a linha
// exata que `diario_bolso_entradas` espera (migração
// 20260908180000_diario_bolso_entradas.sql), a partir da MESMA tarefa que a
// Fase 1 já lê — sem duplicar a régua do texto.
/**
 * A linha pronta pra gravar em `diario_bolso_entradas`, a partir de uma
 * tarefa feita e de quem é a pessoa. `notaPessoal` (opcional) é o que a
 * PRÓPRIA pessoa escreveu por cima — passa `undefined`/omite pra não mexer
 * numa nota já existente ao regravar a mesma tarefa.
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
 */
export function diarioAgrupado(tarefas = []) {
  const porDia = new Map();
  for (const t of Array.isArray(tarefas) ? tarefas : []) {
    if (!t?.data) continue;
    const entrada = entradaDe(t);
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

/** Busca por palavra: casa no título ou no texto da entrada (sem acento, sem caixa). */
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function filtrarDiario(dias = [], termo = '') {
  const alvo = semAcento(termo).trim();
  if (!alvo) return dias;
  return dias
    .map((d) => ({ ...d, entradas: d.entradas.filter((e) => semAcento(e.titulo).includes(alvo) || semAcento(e.texto).includes(alvo)) }))
    .filter((d) => d.entradas.length > 0);
}
