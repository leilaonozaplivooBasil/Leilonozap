// 📋 O PAINEL DAS DEMANDAS — a fila do que os usuários mandaram (07/09/2026).
//
// O PEDIDO (dono): "podendo criar uma página exclusiva para anotar as demandas
// e suas prioridades (demandas passadas pelos usuários)".
//
// 🔴 A PONTE, E POR QUE ELA EXISTE: este painel NÃO é um segundo sistema de
// tarefas. Quando o dono decide que um chamado vira trabalho, ele vira uma
// linha em `xperf_demandas` — a MESMA tabela do Encontro da Mentalidade — e
// daí em diante segue o caminho que já existe: Painel Corporativo da pessoa,
// quadro, X-Game. Um mundo paralelo de tarefas seria a terceira lista de
// pendências da casa, e ninguém olha três listas.
//
// O que fica aqui é só o que a outra tabela não sabe representar: o relato
// bruto do usuário, o print, a resposta que a IA deu na hora, e a decisão do
// dono (prioridade, status, nota interna).
import { demandaDoTopico } from './encontro.js';
import { TIPOS, ROTULO_TIPO, STATUS, viraTrabalho } from './tiraDuvidas.js';

export { TIPOS, ROTULO_TIPO, STATUS, viraTrabalho };

export const ROTULO_STATUS = {
  aberto: 'aberto',
  em_analise: 'em análise',
  resolvido: 'resolvido',
  virou_demanda: 'virou demanda',
  descartado: 'descartado',
};

// o que ainda pede decisão do dono — é o que a fila mostra por padrão
export const STATUS_EM_ABERTO = ['aberto', 'em_analise'];

export const ROTULO_PRIORIDADE = {
  1: 'para tudo',
  2: 'urgente',
  3: 'normal',
  4: 'pode esperar',
  5: 'quando der',
};

/** Chamado ainda esperando alguém decidir. */
export function estaEmAberto(chamado) {
  return STATUS_EM_ABERTO.includes(String(chamado?.status || ''));
}

/**
 * A ordem da fila: primeiro o que ainda espera decisão, depois por prioridade
 * (1 antes de 5) e, empatando, o mais novo primeiro.
 *
 * Ordena uma CÓPIA de propósito: `sort` mexe no array original, e o array aqui
 * vem direto do estado do React — mutar ele faz a tela não redesenhar.
 */
export function ordenarFila(lista = []) {
  return (Array.isArray(lista) ? lista.slice() : []).sort((a, b) => {
    const abertoA = estaEmAberto(a) ? 0 : 1;
    const abertoB = estaEmAberto(b) ? 0 : 1;
    if (abertoA !== abertoB) return abertoA - abertoB;
    const pA = Number(a?.prioridade) || 3;
    const pB = Number(b?.prioridade) || 3;
    if (pA !== pB) return pA - pB;
    return String(b?.created_at || '').localeCompare(String(a?.created_at || ''));
  });
}

/** Filtro da tela. Campo vazio não filtra nada — filtro que some com tudo é armadilha. */
export function filtrarFila(lista = [], { status = '', tipo = '', busca = '' } = {}) {
  const termo = String(busca || '').trim().toLowerCase();
  return (Array.isArray(lista) ? lista : []).filter((c) => {
    if (status === 'em_aberto' && !estaEmAberto(c)) return false;
    if (status && status !== 'em_aberto' && c?.status !== status) return false;
    if (tipo && c?.tipo !== tipo) return false;
    if (!termo) return true;
    const alvo = [c?.titulo, c?.pergunta, c?.usuario_nome, c?.resposta].filter(Boolean).join(' ').toLowerCase();
    return alvo.includes(termo);
  });
}

/** Os números do topo: quanto tem esperando, e o que é problema de verdade. */
export function resumoDaFila(lista = []) {
  const itens = Array.isArray(lista) ? lista : [];
  const emAberto = itens.filter(estaEmAberto);
  return {
    total: itens.length,
    em_aberto: emAberto.length,
    // "problema" = o que não é dúvida respondida; é o que vira trabalho
    problemas: emAberto.filter((c) => viraTrabalho(c?.tipo)).length,
    para_tudo: emAberto.filter((c) => Number(c?.prioridade) === 1).length,
  };
}

/**
 * 🌉 O CHAMADO VIRA DEMANDA. Reusa demandaDoTopico (a mesma função que o
 * Encontro usa) pra montar a linha de xperf_demandas — a classificação por
 * mentalidade/hábito e o cálculo do peso saem de graça, iguais aos de lá.
 *
 * `origem: 'tira_duvidas'` é o que permite, depois, separar o que veio do time
 * do que veio da reunião de segunda.
 *
 * Devolve null sem responsável: demanda sem dono é o problema que a tabela
 * xperf_demandas foi feita pra não ter.
 */
export function demandaDoChamado(chamado, { pessoaId, pessoaNome, criadoPorId, criadoPorNome, prazoDia, prazoHora = '18:00' } = {}) {
  if (!chamado?.id || !pessoaId) return null;
  const titulo = String(chamado.titulo || chamado.pergunta || '').trim();
  if (!titulo) return null;
  const relato = String(chamado.pergunta || '').trim();
  return demandaDoTopico(
    { titulo, demanda: titulo },
    {
      pessoaId,
      pessoaNome,
      criadoPorId,
      criadoPorNome,
      origem: 'tira_duvidas',
      prazoDia,
      prazoHora,
      // o relato original vai junto: quem for resolver precisa das palavras de
      // quem sofreu o problema, não do resumo que a IA fez
      detalheExtra: relato ? `Relato de ${chamado.usuario_nome || 'um usuário'}: "${relato.slice(0, 400)}"` : null,
    },
  );
}

/** O que muda no chamado quando ele vira demanda. */
export function chamadoDespachado(demandaId) {
  return { status: 'virou_demanda', demanda_id: demandaId || null };
}
