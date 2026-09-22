/**
 * 🕥 A ORGANIZAÇÃO DIÁRIA — 10h30 às 12h30.
 *
 * PEDIDO DO DONO (áudio de 19/09/2026, 10h33):
 *   "10h30, todo mundo começa a organização, que às 10h30 é meio-dia, até
 *    meio-dia e meia — duas horas de organização diária. Após todo mundo parar
 *    na empresa para fazer, isso tem que gerar um relatório bem fluido para o
 *    Emanuel, eu, ver todas as demandas do dia. Esse relatório pode ser
 *    exportado ou eu posso ser acompanhado em tempo real. De acordo com as
 *    tarefas sendo feitas, isso vai contabilizando e aparecendo."
 *   "E o Emanuel está precisando muito disso, e o Luciano, para a gente poder
 *    não falhar no nosso acompanhamento."
 *
 * 🔴 O QUE ESTA PEÇA NÃO É: mais um painel de time. A casa já tem a
 * X-Performance (os 8 hábitos, visão executiva, PDF por pessoa) e o Painel
 * Corporativo (a fila de UMA pessoa). Nenhum dos dois responde a pergunta
 * desta janela, que é outra: **quem parou para organizar hoje, e o que saiu
 * disso.** Por isso aqui se conta DEMANDA virando trabalho, não hábito.
 *
 * Sem tela e sem banco: só a conta. Quem serve a tela é OrganizacaoDoDia.jsx.
 */

/** A janela combinada. Minutos desde a meia-noite, para comparar sem fuso. */
export const JANELA = Object.freeze({ inicio: '10:30', fim: '12:30' });

const emMinutos = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h = Number(m[1]); const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

/**
 * Onde o relógio está em relação à janela: 'antes' | 'agora' | 'depois'.
 *
 * Hora ilegível devolve 'depois' e não 'agora': é melhor a tela dizer "a
 * organização de hoje já passou" do que anunciar uma janela aberta que não
 * está — ninguém para o escritório por engano, mas todo mundo confere o
 * relatório de um dia que terminou.
 */
export function estadoDaJanela(agoraHHMM) {
  const agora = emMinutos(agoraHHMM);
  if (agora === null) return 'depois';
  if (agora < emMinutos(JANELA.inicio)) return 'antes';
  if (agora > emMinutos(JANELA.fim)) return 'depois';
  return 'agora';
}

/** 'AAAA-MM-DD' de um timestamp, no fuso da casa. */
function diaDe(quando) {
  const t = new Date(quando ?? NaN).getTime();
  if (!Number.isFinite(t)) return '';
  try {
    return new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return '';
  }
}

/**
 * O que UMA pessoa fez na organização de hoje.
 *
 * `organizou` é a pergunta que o dono quer responder olhando a tela: essa
 * pessoa PAROU para organizar? Não basta ter tarefa — é ter MEXIDO na caixa
 * hoje, transformando ou descartando demanda. Quem só cumpriu tarefa antiga
 * não organizou nada; quem esvaziou a caixa organizou, mesmo sem tarefa nova.
 */
export function resumoDaPessoa({ pessoaId, demandas = [], tarefas = [], hojeISO }) {
  const minhas = (demandas || []).filter((d) => d && String(d.pessoa_id) === String(pessoaId));
  const minhasTarefas = (tarefas || []).filter(
    (t) => t && String(t.user_id) === String(pessoaId) && String(t.data ?? '').slice(0, 10) === hojeISO,
  );

  const chegaramHoje = minhas.filter((d) => diaDe(d.created_at) === hojeISO).length;
  // "mexeu hoje" lê updated_at: é o carimbo que a transformação e o descarte
  // deixam. created_at diria só que a demanda nasceu, não que foi tratada.
  const tratadasHoje = minhas.filter(
    (d) => (d.status === 'agendada' || d.status === 'devolvida') && diaDe(d.updated_at) === hojeISO,
  ).length;
  const esperando = minhas.filter((d) => d.status === 'recebida').length;

  const total = minhasTarefas.length;
  const feitas = minhasTarefas.filter((t) => t.feito === true).length;

  return {
    pessoaId: String(pessoaId),
    chegaramHoje,
    tratadasHoje,
    esperando,
    tarefas: total,
    feitas,
    // 0 quando não há tarefa: "100% de zero" é a mentira que faz um dia vazio
    // parecer um dia perfeito no topo do relatório.
    percentual: total > 0 ? Math.round((feitas / total) * 100) : 0,
    organizou: tratadasHoje > 0,
  };
}

/**
 * O time inteiro na janela de hoje, já ordenado para leitura:
 * quem NÃO organizou primeiro — é quem o dono precisa ver.
 */
export function resumoDoTime({ pessoas = [], demandas = [], tarefas = [], hojeISO }) {
  const linhas = (pessoas || [])
    .filter((p) => p && p.id)
    .map((p) => ({ ...p, ...resumoDaPessoa({ pessoaId: p.id, demandas, tarefas, hojeISO }) }))
    .sort((a, b) => {
      if (a.organizou !== b.organizou) return a.organizou ? 1 : -1;
      if (b.esperando !== a.esperando) return b.esperando - a.esperando;
      return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
    });

  const soma = (campo) => linhas.reduce((n, l) => n + (l[campo] || 0), 0);
  const tarefas_ = soma('tarefas');
  const feitas_ = soma('feitas');

  return {
    linhas,
    total: {
      pessoas: linhas.length,
      organizaram: linhas.filter((l) => l.organizou).length,
      chegaramHoje: soma('chegaramHoje'),
      tratadasHoje: soma('tratadasHoje'),
      esperando: soma('esperando'),
      tarefas: tarefas_,
      feitas: feitas_,
      percentual: tarefas_ > 0 ? Math.round((feitas_ / tarefas_) * 100) : 0,
    },
  };
}

/** Cabeçalho e linhas do CSV — "esse relatório pode ser exportado". */
export const COLUNAS_CSV = Object.freeze([
  'Pessoa', 'Organizou', 'Demandas do dia', 'Tratadas hoje', 'Ainda esperando', 'Tarefas', 'Feitas', '%',
]);

export function paraCSV(resumo, hojeISO) {
  const linhas = resumo?.linhas || [];
  const corpo = linhas.map((l) => [
    l.nome || l.pessoaId,
    l.organizou ? 'sim' : 'nao',
    l.chegaramHoje, l.tratadasHoje, l.esperando, l.tarefas, l.feitas, `${l.percentual}%`,
  ]);
  const t = resumo?.total;
  if (t) corpo.push(['TOTAL', `${t.organizaram}/${t.pessoas}`, t.chegaramHoje, t.tratadasHoje, t.esperando, t.tarefas, t.feitas, `${t.percentual}%`]);
  return [
    `Organizacao do dia ${hojeISO} (${JANELA.inicio} as ${JANELA.fim})`,
    COLUNAS_CSV.join(';'),
    // ponto e vírgula, não vírgula: o Excel em português abre assim sem pedir
    // nada. Nome com vírgula ("Silva, João") também deixaria de quebrar coluna.
    ...corpo.map((l) => l.join(';')),
  ].join('\n');
}
