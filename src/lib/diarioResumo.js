// 📔 O RESUMO NARRADO DA SEMANA — terreno da Fase 3 (dono, 08/09/2026:
// "prepare o terreno para a fase 3"). Pega os dias que a Fase 1/2 já montam
// (agrupados por `diarioAgrupado`) e vira o TEXTO da chamada de IA que
// transforma a lista técnica ("09:00 Leitura do dia — Achei uma ideia boa
// sobre follow-up") numa narrativa curta e pessoal ("Essa semana você...").
//
// SÓ O PROMPT — nada aqui chama a IA nem gasta um centavo. Quem chama de
// verdade é api/functions/diarioResumoSemanal.js (o mesmo caminho de
// api/_lib/ia.js que tiraDuvidas.js e InvokeLLM.js já usam — Sonnet 5, "bom
// e barato", nunca Opus pra prosa). Isto fica puro e testável sem rede,
// exatamente como a régua da Fase 1/2.
//
// TETO DE ENTRADAS (MAX_ENTRADAS): quem já tem meses de diário não pode
// mandar tudo isso pro prompt — o custo cresceria sem aviso a cada semana
// que passa. As mais recentes primeiro (a semana já vem só com os 7 dias
// dela, mas o teto protege mesmo assim).
export const RESUMO_SEMANAL_MAX_ENTRADAS = 150;

export function sistemaDoResumoSemanal() {
  return `Você escreve o resumo semanal do Diário de Bolso da Top College (Leilão no Zap) — um app de gamificação de rotina e vendas.

A pessoa já vê a lista técnica de tudo que fez. O seu resumo é OUTRA coisa: uma narrativa curta, calorosa, em português do Brasil, que ajuda a pessoa a se orgulhar da semana e enxergar um padrão — não repete a lista, ela já tem a lista.

O QUE VOCÊ RECEBE: os dias da semana, cada um com as tarefas feitas e (quando existir) o que a pessoa escreveu ou aprendeu naquele momento.

O QUE VOCÊ ESCREVE:
1. Dois a quatro parágrafos curtos, tom de colega que acompanhou a semana — não de relatório corporativo, não de coach genérico.
2. Puxe 1 ou 2 fios que se repetem (um hábito que voltou todo dia, um aprendizado que apareceu mais de uma vez) — é isso que vira insight, não a contagem de tarefas.
3. Termine com UMA frase curta olhando pra frente (não uma meta nova inventada por você — só um convite a continuar o que já está funcionando).

O QUE VOCÊ NUNCA FAZ:
- NUNCA invente uma tarefa, um número ou um fato que não veio nos dados.
- NUNCA vire relatório de métricas ("você completou 87% das tarefas") — isso já existe em outro lugar da tela.
- NUNCA seja genérico a ponto de servir pra qualquer pessoa qualquer semana — cite pelo menos duas coisas específicas que só essa pessoa fez.`;
}

const linhaDaEntrada = (e) => {
  const partes = [`${e.hora ? `${e.hora} ` : ''}${e.titulo}`];
  if (e.texto) partes.push(`— ${e.texto}`);
  if (e.notaPessoal) partes.push(`(nota da pessoa: ${e.notaPessoal})`);
  return partes.join(' ');
};

/**
 * O texto que vai como mensagem do usuário pro modelo: os dias da semana,
 * cada um com as entradas em uma linha. `dias` é a mesma forma que
 * `diarioAgrupado` devolve — reaproveita a régua, não duplica.
 */
export function promptDoResumoSemanal(dias = []) {
  const lista = (Array.isArray(dias) ? dias : []).flatMap((d) => d.entradas.map((e) => ({ ...e, data: d.data })));
  const cortada = lista.slice(0, RESUMO_SEMANAL_MAX_ENTRADAS);
  if (!cortada.length) return null;
  const porDia = new Map();
  for (const e of cortada) { const l = porDia.get(e.data) || []; l.push(e); porDia.set(e.data, l); }
  const blocos = [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, entradas]) => `${data}:\n${entradas.map((e) => `- ${linhaDaEntrada(e)}`).join('\n')}`);
  return blocos.join('\n\n');
}

/** O schema da saída estruturada — o mesmo padrão output_config.format que o resto da casa usa. */
export const SCHEMA_RESUMO_SEMANAL = {
  type: 'object',
  properties: { resumo: { type: 'string', description: 'dois a quatro parágrafos curtos, em português do Brasil' } },
  required: ['resumo'],
};
