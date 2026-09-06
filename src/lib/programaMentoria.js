// 🎓 O PROGRAMA DA MENTORIA — setembro de 2026 a março de 2027, mês a mês.
//
// DE ONDE VEIO (dono, 06/09/2026): "os entregáveis da mentoria que começou em
// setembro e vai até março de 2027 — manda o seu, mas eu podendo acrescentar,
// excluir". Então: o PADRÃO mora aqui, segue os 8 Hábitos do Sucesso na
// ordem do método, e o que o dono salvar em xperf_programa vale por cima.
//
// Cada mês: o tema, os Hábitos que ele trabalha e os entregáveis por
// mentalidade (o executivo entrega com a mão; o diretor e o CEO entregam o
// time e o sistema). Gerar o mês pra uma pessoa vira cards no quadro da
// diretoria (xperf_entregaveis), com prazo no último dia do mês.
import { mentalidadeDe } from './mentalidades.js';
import { faseDoMes } from './documentoOficial.js';

const E = (titulo, habito, peso = 3) => ({ titulo, habito, peso });

export const PROGRAMA_PADRAO = [
  { mes: '2026-09', tema: 'Sonho e Compromisso', habitos: [1, 2], entregaveis: {
    executivo: [E('Quadro dos sonhos completo (curto, médio e longo)', 1, 2), E('30 dias de Rotina Perfeita gerada e fechada', 2, 4)],
    diretor: [E('Time inteiro com quadro dos sonhos e rotina gerada', 2, 4), E('Rotina do time acompanhada todo dia (conferência dupla)', 2, 3)],
    ceo: [E('A cultura dos 8 Hábitos apresentada a toda a diretoria', 2, 4), E('Rotina Perfeita da diretoria rodando', 2, 3)],
  } },
  { mes: '2026-10', tema: 'Lista e Contato', habitos: [3, 4], entregaveis: {
    executivo: [E('Lista de networking com 100 nomes qualificados', 3, 3), E('20 contatos por dia com F.O.R.M. durante o mês', 4, 4)],
    diretor: [E('Cada executivo com lista qualificada e script próprio', 3, 3), E('Treinamento de contato (F.O.R.M.) dado ao time', 8, 4)],
    ceo: [E('Processo de prospecção da empresa desenhado e no ar', 3, 4), E('Formar um diretor no Hábito 4', 8, 4)],
  } },
  { mes: '2026-11', tema: 'Apresentação de Sucesso', habitos: [5], entregaveis: {
    executivo: [E('3 apresentações por dia durante o mês (45 a 60 min)', 5, 5), E('Apresentação gravada e revisada com o diretor', 5, 3)],
    diretor: [E('Time com 3 apresentações por dia, medidas', 7, 4), E('Treinar a Apresentação de Sucesso no time', 8, 5)],
    ceo: [E('Apresentação institucional do grupo pronta', 5, 4), E('Diretores apresentando o método sem você na sala', 8, 5)],
  } },
  { mes: '2026-12', tema: 'Acompanhamento e Fechamento', habitos: [6], entregaveis: {
    executivo: [E('Follow-up de 100% dos clientes em PPV', 6, 4), E('Meta de fechamentos do mês batida', 6, 5)],
    diretor: [E('Pipeline do time acompanhado toda semana (win rate)', 6, 4), E('Fechamentos do time acima da meta', 6, 5)],
    ceo: [E('Processo de pós-venda e contratos no sistema', 6, 4), E('Fechamento do ano com os números de cada operação', 7, 4)],
  } },
  { mes: '2027-01', tema: 'Verificação do Progresso', habitos: [7], entregaveis: {
    executivo: [E('Placar pessoal do ciclo revisado com o diretor', 7, 3), E('Metas de 2027 escritas e no quadro', 7, 3)],
    diretor: [E('Números do time verificados toda segunda, com gargalo e correção', 7, 4), E('Metas de 2027 do time em cascata', 7, 4)],
    ceo: [E('Planejamento executivo de 2027 por empresa', 7, 5), E('Metas em cascata: empresa, função, pessoa', 7, 5)],
  } },
  { mes: '2027-02', tema: 'Duplicação dos 8 Hábitos', habitos: [8], entregaveis: {
    executivo: [E('Formar um novo executivo do zero até a primeira apresentação', 8, 5), E('Ensinar os 8 Hábitos a um novo membro', 8, 4)],
    diretor: [E('Um diretor novo formado (plano de 30 dias concluído)', 8, 5), E('Time duplicando: cada executivo formando um', 8, 5)],
    ceo: [E('Uma operação nova rodando sem você na sala', 8, 6), E('Diretor formado assumindo uma operação', 8, 5)],
  } },
  { mes: '2027-03', tema: 'Apresentação final e a conversa de sociedade', habitos: [5, 7, 8], entregaveis: {
    executivo: [E('Apresentação final: o que construí em 7 meses (números e gente)', 5, 5), E('Os três portões da sociedade revisados', 7, 3)],
    diretor: [E('Apresentação do time à diretoria: resultado e duplicação', 5, 5), E('Os três portões da sociedade acesos', 7, 5)],
    ceo: [E('Apresentação do grupo: 7 meses, empresas e líderes formados', 5, 6), E('Sociedades abertas com quem acendeu os três portões', 8, 6)],
  } },
];

export const MESES = PROGRAMA_PADRAO.map((p) => p.mes);
export const rotuloDoMes = (mes) => {
  const [a, m] = String(mes || '').split('-').map(Number);
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return m ? `${nomes[m - 1]}/${a}` : mes;
};

/** O programa em vigor: o do banco por cima do padrão, mês a mês. */
export function programaJunto(padrao = PROGRAMA_PADRAO, doBanco = []) {
  const mapa = new Map(padrao.map((p) => [p.mes, { ...p, padrao: true, fase: faseDoMes(p.mes) }]));
  for (const p of Array.isArray(doBanco) ? doBanco : []) {
    if (!p?.mes) continue;
    const ent = Array.isArray(p.entregaveis) ? p.entregaveis : [];
    // no banco os entregáveis vêm achatados [{titulo, mentalidade, habito, peso}]; aqui viram por mentalidade
    const porM = { executivo: [], diretor: [], ceo: [] };
    for (const e of ent) (porM[mentalidadeDe(e.mentalidade)?.id || 'executivo']).push({ titulo: e.titulo, habito: Number(e.habito) || null, peso: Number(e.peso) || 3 });
    mapa.set(p.mes, { id: p.id, mes: p.mes, tema: p.tema, habitos: p.habitos || [], entregaveis: porM, padrao: false, fase: faseDoMes(p.mes) });
  }
  return [...mapa.values()].sort((a, b) => a.mes.localeCompare(b.mes));
}

/** O mês do programa pra gravar (achatado, como a tabela guarda). */
export function programaParaGravar(mes) {
  const ent = [];
  for (const m of ['executivo', 'diretor', 'ceo']) for (const e of mes.entregaveis?.[m] || []) ent.push({ titulo: e.titulo, mentalidade: m, habito: e.habito, peso: e.peso });
  return { mes: mes.mes, tema: mes.tema, habitos: mes.habitos || [], entregaveis: ent, ordem: MESES.indexOf(mes.mes) };
}

/** A fase oficial do ciclo (Documento p. 39) — março/2027 é o pós-ciclo: a conversa de sociedade. */
export const faseDoPrograma = (mes) => faseDoMes(mes) || (mes === '2027-03' ? { mes, fase: 'Pós-ciclo · sociedade', foco: 'o ciclo oficial fecha em fevereiro; março é a conversa de sociedade com quem acendeu os três portões' } : null);

/** O último dia do mês, ISO. */
export const fimDoMes = (mes) => { const [a, m] = String(mes).split('-').map(Number); return `${mes}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`; };

/** Os cards do mês pra uma pessoa (xperf_entregaveis), na mentalidade dela. */
export function cardsDoMes(mesDoPrograma, { mentalidade = 'executivo', donoId, donoNome } = {}) {
  if (!mesDoPrograma || !donoId) return [];
  const lista = mesDoPrograma.entregaveis?.[mentalidadeDe(mentalidade)?.id || 'executivo'] || [];
  return lista.map((e) => ({
    titulo: e.titulo, detalhe: `Programa da mentoria · ${rotuloDoMes(mesDoPrograma.mes)} · ${mesDoPrograma.tema}`,
    trilha: mentalidadeDe(mentalidade)?.id || 'executivo', coluna: 'combinado',
    peso: Math.min(5, Math.max(1, Number(e.peso) || 3)), habito: e.habito || null,
    dono_id: donoId, dono_nome: donoNome || null, prazo: fimDoMes(mesDoPrograma.mes),
  }));
}
