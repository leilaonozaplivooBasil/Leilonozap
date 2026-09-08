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

/** O texto de uma entrada — a prioridade acima, primeira que tiver algo. */
export function textoDaEntrada(tarefa = {}) {
  const c = tarefa.comprovacao || {};
  if (typeof c.resumo === 'string' && c.resumo.trim()) return c.resumo.trim();
  if (typeof c.entrega === 'string' && c.entrega.trim() && !/^https?:\/\//i.test(c.entrega.trim())) return c.entrega.trim();
  if (typeof c.veredito_ia?.o_que_viu === 'string' && c.veredito_ia.o_que_viu.trim()) return c.veredito_ia.o_que_viu.trim();
  if (tarefa.mentalidade || tarefa.habito) {
    const ensinamento = ensinamentoDaTarefa({ mentalidade: tarefa.mentalidade, habito: tarefa.habito, detalhe: tarefa.detalhe });
    if (ensinamento) return ensinamento;
  }
  if (typeof tarefa.detalhe === 'string' && tarefa.detalhe.trim()) return tarefa.detalhe.trim();
  return null;
}

/** Uma tarefa feita → uma entrada do diário: só o que a tela precisa desenhar. */
export function entradaDe(tarefa = {}) {
  return {
    id: tarefa.id,
    data: String(tarefa.data || '').slice(0, 10),
    hora: tarefa.hora ? String(tarefa.hora).slice(0, 5) : null,
    titulo: tarefa.titulo || '',
    texto: textoDaEntrada(tarefa),
    temFoto: !!(tarefa.comprovacao?.print_url),
  };
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
