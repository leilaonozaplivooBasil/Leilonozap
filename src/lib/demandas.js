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
export function jaEstaNaFila(abertas, titulo) {
  const alvo = normalizar(titulo);
  if (!alvo) return false;
  return (abertas || []).some(
    (d) => d && d.origem === ORIGEM_MAPA && normalizar(d.titulo) === alvo,
  );
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
