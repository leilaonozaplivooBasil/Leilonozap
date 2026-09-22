/**
 * 🧠 DO MAPA MENTAL PARA A FILA QUE JÁ EXISTE.
 *
 * PEDIDO DO DONO (áudio de 19/09/2026):
 *   "criar um mapa mental ali do lado, ligado ao quadro… onde eu esvazio a
 *    minha mente e dessa mente transformo em tarefa"
 *   "estou numa reunião, o pessoal está falando o que tem que fazer, eu só vou
 *    esvaziando a mente… E automaticamente eu já transformo isso e direciono
 *    para onde eu quero."
 *
 * 🔴 ESTE ARQUIVO JÁ FOI MAIOR, E ESTAVA ERRADO (21/09/2026).
 *
 * A primeira versão criava uma tabela `demandas` própria, com estado, caixa de
 * entrada, agrupamento por dia e conversão em cartão — tudo isso já existia em
 * `xperf_demandas`, a tabela do Encontro da Mentalidade, que alimenta o Painel
 * Corporativo e a Performance da Equipe. Dois arquivos da casa avisavam contra
 * o que eu estava fazendo; `src/pages/Demandas.jsx` com todas as letras:
 *
 *   "O QUE ESTA PÁGINA NÃO É: um segundo sistema de tarefas. (…) Uma terceira
 *    lista de pendências na casa seria uma lista que ninguém olha."
 *
 * O dono decidiu em 21/09 reusar a fila que existe. Sobrou o que é de verdade
 * novo: transformar um NÓ DO MAPA na linha certa, e não deixar o mesmo nó
 * entrar duas vezes. O resto — estado, prazo, quem faz, virar tarefa ou cartão —
 * é de `src/lib/encontro.js` e do Painel Corporativo, que já sabem fazer.
 *
 * "direciono para onde eu quero" é `pessoa_id`, e é justamente o que a minha
 * tabela nova não tinha.
 */

/** Como a demanda nascida no mapa se identifica na fila. */
export const ORIGEM_MAPA = 'mapa';

/** `xperf_demandas.status` só aceita recebida|agendada|devolvida (CHECK no banco). */
export const RECEBIDA = 'recebida';

/**
 * Peso 3 de propósito, nunca `null`.
 *
 * O Painel Corporativo imprime "· peso {d.peso}" SEM condicional
 * (PainelCorporativo.jsx:398). Com peso nulo a linha sai "· peso " pendurada,
 * e quem lê acha que o dado sumiu. 3 é o meio da régua (1 a 6) — é o que uma
 * anotação solta é antes de alguém decidir a prioridade dela.
 */
export const PESO_NEUTRO = 3;

const MAX_TITULO = 300;

/** Compara títulos como uma pessoa compararia: sem caixa, sem espaço sobrando. */
function normalizar(texto) {
  return String(texto ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * A linha de `xperf_demandas` que nasce de um nó do mapa.
 *
 * Mesma forma que `demandaDoTopico` (encontro.js) devolve, porque é a MESMA
 * tabela: o Painel Corporativo não pode ter que saber de onde a linha veio.
 *
 * Sem `pessoaId` devolve null em vez de gravar com dono nulo: uma demanda sem
 * dono não aparece em painel nenhum — some em silêncio, que é o pior destino
 * possível para algo que a pessoa acabou de anotar.
 *
 * @param {{texto?: string}} no  o nó do mapa
 * @param {{pessoaId: string, pessoaNome?: string|null}} quem
 * @returns {object|null}
 */
export function demandaDoNo(no, { pessoaId, pessoaNome = null } = {}) {
  const titulo = String(no?.texto ?? '').trim().slice(0, MAX_TITULO);
  if (!titulo || !pessoaId) return null;
  const dono = String(pessoaId);
  return {
    titulo,
    detalhe: null,
    pessoa_id: dono,
    pessoa_nome: pessoaNome || null,
    origem: ORIGEM_MAPA,
    // quem anotou é quem vai fazer: é a própria mente dele sendo esvaziada.
    // Redirecionar para outra pessoa é decisão do Painel, depois, não daqui.
    criado_por_id: dono,
    criado_por_nome: pessoaNome || null,
    encontro_id: null,
    status: RECEBIDA,
    peso: PESO_NEUTRO,
  };
}

/**
 * 🔒 A TRAVA CONTRA DUPLICATA.
 *
 * O ✈ fica no nó e continua lá depois de mandar — nada impede o segundo
 * clique, nem a mesma aba aberta duas vezes. Sem esta trava o dono passa a ver
 * na fila trabalho que ele pediu UMA vez.
 *
 * Compara por título entre as demandas DO MAPA ainda abertas, não por id do
 * nó: `xperf_demandas` não tem onde guardar o id do nó, e o título é o que a
 * pessoa reconhece como "isso eu já mandei".
 */
export function aQueJaEstaNaFila(abertas, titulo) {
  const alvo = normalizar(titulo);
  if (!alvo) return null;
  return (abertas || []).find(
    (d) => d && d.origem === ORIGEM_MAPA && normalizar(d.titulo) === alvo,
  ) || null;
}

/**
 * A MESMA trava, respondendo sim ou não.
 *
 * 22/09: o ✈ passou a mandar direto pro quadro/jornada, e aí saber QUE já
 * existe deixou de bastar — é preciso saber QUAL, para mandar aquela pro
 * destino escolhido em vez de dizer "já está lá" e não fazer nada.
 */
export function jaEstaNaFila(abertas, titulo) {
  return aQueJaEstaNaFila(abertas, titulo) !== null;
}

/** Rótulo curto da origem, para a tela não inventar cada uma o seu. */
export function rotuloDaOrigem(origem) {
  switch (origem) {
    case ORIGEM_MAPA: return 'do mapa mental';
    case 'encontro': return 'do encontro';
    case 'ceo': return 'do CEO';
    case 'diretor': return 'de um diretor';
    case 'gestao': return 'da gestão';
    default: return String(origem || 'anotada');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// A CAIXA DE ENTRADA — o que a aba Demandas do Compromisso mostra.
//
// 🔴 ESTE TRECHO JÁ EXISTIU E FOI APAGADO POR MIM (21/09), junto com a tabela
// própria. Só que o pedido do dono (áudio de 19/09, 10h32) nunca foi sobre a
// tabela — foi sobre a TELA:
//
//   "eu abri o compromisso, já vai aparecer ali um lugar com as demandas que
//    eu posso transformar em tarefa"
//   "estou numa reunião, o pessoal está falando o que tem que fazer, eu só vou
//    esvaziando a mente… entra numa lista COM A DATA DO DIA QUE FOI ANOTADO"
//
// Reusar `xperf_demandas` foi certo; concluir que a aba ficava desnecessária,
// não. O Painel Corporativo é tela de gestão — não é "abro o Compromisso e já
// vejo o que anotei". Voltou, agora lendo a fila que a casa já tem.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * O que ainda espera destino, do mais recente para o mais antigo.
 *
 * Em `xperf_demandas`, "esperando" é `status = 'recebida'`: 'agendada' já virou
 * tarefa ou cartão e 'devolvida' foi recusada. Linha sem título fica de fora —
 * não há o que mostrar nem o que transformar.
 */
export function caixaDeEntrada(linhas) {
  return (linhas || [])
    .filter((d) => d && d.status === RECEBIDA && String(d.titulo || '').trim())
    .sort((a, b) => {
      const qa = new Date(a.created_at ?? 0).getTime();
      const qb = new Date(b.created_at ?? 0).getTime();
      if (qb !== qa) return qb - qa;
      return String(a.titulo).localeCompare(String(b.titulo), 'pt-BR');
    });
}

/**
 * Agrupa por dia da anotação — é assim que o dono pediu para ver.
 *
 * @returns {Array<{dia: string, demandas: object[]}>} do dia mais recente ao mais antigo
 */
export function porDiaDeAnotacao(linhas) {
  const mapa = new Map();
  for (const d of caixaDeEntrada(linhas)) {
    const dia = diaDe(d.created_at);
    if (!mapa.has(dia)) mapa.set(dia, []);
    mapa.get(dia).push(d);
  }
  return [...mapa.entries()].map(([dia, demandas]) => ({ dia, demandas }));
}

/**
 * 'AAAA-MM-DD' no fuso da casa. '' quando não há data legível.
 *
 * 🔴 O FUSO NÃO É DETALHE: das 21h às 23h59 de Brasília já é o dia seguinte em
 * UTC. Sem forçar America/Sao_Paulo, a demanda ditada na reunião da noite
 * apareceria agrupada em "amanhã" — e é pelo dia que o dono vai procurar.
 */
export function diaDe(quando) {
  const t = new Date(quando ?? NaN).getTime();
  if (!Number.isFinite(t)) return '';
  try {
    // en-CA devolve AAAA-MM-DD, que ordena como texto.
    return new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return '';
  }
}

/**
 * O título do grupo: "Hoje", "Ontem" ou a data por extenso.
 *
 * `hojeISO` entra por parâmetro em vez de sair de `new Date()` aqui dentro para
 * que a tela e o teste possam dizer que dia é hoje — e para obedecer ao relógio
 * de teste do super admin, que já manda no resto do Compromisso.
 */
export function rotuloDoDia(dia, hojeISO) {
  if (!dia) return 'Sem data';
  if (dia === hojeISO) return 'Hoje';
  const ontem = new Date(`${hojeISO}T12:00:00`);
  if (Number.isFinite(ontem.getTime())) {
    ontem.setDate(ontem.getDate() - 1);
    const iso = `${ontem.getFullYear()}-${String(ontem.getMonth() + 1).padStart(2, '0')}-${String(ontem.getDate()).padStart(2, '0')}`;
    if (dia === iso) return 'Ontem';
  }
  const [a, m, d] = String(dia).split('-');
  return (a && m && d) ? `${d}/${m}/${a}` : String(dia);
}

/** Quantas esperando destino — o número da bolinha na aba. */
export function quantasEsperando(linhas) {
  return caixaDeEntrada(linhas).length;
}
