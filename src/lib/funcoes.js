// 🏢 AS EMPRESAS E AS FUNÇÕES — de onde sai o dia de cada pessoa.
//
// DE ONDE VEIO (ditado pelo dono em 06/09/2026): "como a gente organiza dentro
// de cada perfil, é só melhorar as tarefas e as funções dos perfis. Eu pego o
// Emanuel: qual é a função dele? Diretor de Operações. A partir dessa função
// o sistema já me dá as tarefas do dia dele. E preciso identificar a
// empresa: a e-Digital faz marketing digital e tecnologia; o Leilão no Zap;
// a X-EOS. O Jean, CMO, trabalha pro Leilão no Zap através da e-Digital."
//
// DUAS LISTAS, e uma conta:
//   • EMPRESAS — as três, com o que cada uma faz;
//   • FUNCOES  — cada função com a mentalidade que ela vive, o que entrega e
//     O DIA DELA: as tarefas que a função faz todo dia, já com hora, Hábito e
//     peso. Quem vem do painel de controle (Diretor Operacional, CEO…) cai na
//     função pelo nível; as funções que o painel não tem (CMO, CTO, CFO) o
//     dono escolhe no painel da pessoa;
//   • montarDiaDaFuncao — o dia da função virando linhas de metodo_tarefas.
import { pesoComMentalidade, ensinamentoDaTarefa } from './mentalidades.js';

// 🏛️ O GRUPO (dono, 06/09/2026): "a To The Top Corporate é a holding
// estratégica — venture builder e venture capital das empresas do grupo. Os
// cinco pilares, cada um uma empresa: X-EOS (desenvolvimento humano e
// aplicação de cultura), Top Tech Digital (tecnologia e marketing digital
// para o bem), Leilão no Zap (consumo inteligente), Human Bank (mercado
// financeiro humano)." Todos operam o Leilão no Zap hoje; a pessoa trabalha
// pra uma empresa "através de" outra (o CMO da Top Tech atendendo o Leilão).
export const EMPRESAS = [
  { id: 'to_the_top', nome: 'To The Top Corporate', curto: 'To The Top', pilar: 'a holding', faz: 'holding estratégica, venture builder e venture capital do grupo — estrutura empresas, forma líderes, organiza governança' },
  { id: 'xeos', nome: 'X-EOS', curto: 'X-EOS', pilar: 'pilares 1 e 2 · desenvolvimento humano e aplicação de cultura', faz: 'formação de líderes, executivos e empresários (Structure · Operation · Expansion) e a governança da TTT nas empresas' },
  { id: 'top_tech_digital', nome: 'Top Tech Digital', curto: 'Top Tech', pilar: 'pilar 3 · tecnologia e marketing digital para o bem', faz: 'infraestrutura tecnológica, desenvolvimento de sistemas e expansão digital' },
  { id: 'leilao_no_zap', nome: 'Leilão no Zap', curto: 'Leilão no Zap', pilar: 'pilar 4 · consumo inteligente', faz: 'o modelo estruturado de mercado e a geração de caixa operacional — leilões, loja e a rede' },
  { id: 'human_bank', nome: 'Human Bank', curto: 'Human Bank', pilar: 'pilar 5 · mercado financeiro humano', faz: 'organização financeira ética e estruturada — #OBancoHumano' },
];
// nome antigo que o dono usou antes de mandar as marcas: continua valendo
const APELIDOS_EMPRESA = { e_digital: 'top_tech_digital', ttt: 'to_the_top', humanbank: 'human_bank' };

export const empresaDe = (id) => EMPRESAS.find((e) => e.id === (APELIDOS_EMPRESA[id] || id)) || null;

/** "Leilão no Zap, através da e-Digital" */
export function rotuloDaEmpresa(empresa, via) {
  const e = empresaDe(empresa);
  if (!e) return null;
  const v = via ? empresaDe(via) : null;
  return v && v.id !== e.id ? `${e.nome}, através da ${v.nome}` : e.nome;
}

const T = (hora, titulo, habito, minutos = null) => ({ hora, titulo, habito, minutos });

export const FUNCOES = [
  {
    id: 'socio_executivo', nome: 'Sócio Executivo', nivel: 'executivo_conta', mentalidade: 'executivo',
    entrega: 'o resultado da própria mão: lista, contatos, apresentações e fechamentos todo dia',
    dia: [
      T('08:30', 'Qualificar 10 pessoas da lista de networking', 3),
      T('09:30', 'Fazer 20 contatos com F.O.R.M. e o próprio script', 4),
      T('14:00', 'Apresentação de sucesso 1 (45 a 60 min)', 5, 60),
      T('15:00', 'Apresentação de sucesso 2 (45 a 60 min)', 5, 60),
      T('16:00', 'Apresentação de sucesso 3 (45 a 60 min)', 5, 60),
      T('17:00', 'Follow-up dos clientes em PPV e contratos do dia', 6),
    ],
  },
  {
    id: 'diretor_operacoes', nome: 'Diretor de Operações', nivel: 'diretoria_operacao', mentalidade: 'diretor',
    entrega: 'a operação rodando: o time performando, os números conferidos e os gargalos corrigidos',
    dia: [
      T('08:30', 'Conferir os números de ontem do time (reuniões, win rate, PPV)', 7),
      T('09:00', 'Treinamento diário com o time', 8, 45),
      T('10:00', 'Reunião 1:1 com um executivo do time', 6, 30),
      T('11:00', 'Validar as tarefas do time (conferência dupla) e dar o pronto', 7),
      T('15:00', 'Acompanhar o follow-up e os fechamentos do time', 6),
      T('17:30', 'Fechar os números do dia e apontar o gargalo de amanhã', 7),
    ],
  },
  {
    id: 'diretoria_executiva', nome: 'Diretoria Executiva', nivel: 'diretoria_executiva', mentalidade: 'diretor',
    entrega: 'os diretores de operação entregando sem depender de empurrão',
    dia: [
      T('08:30', 'Ler os números de todas as operações', 7),
      T('09:30', 'Reunião com os diretores de operação: gargalos e decisões', 7, 60),
      T('11:00', 'Treinar um diretor no Hábito da semana', 8, 45),
      T('15:00', 'Acompanhar os contratos e as pendências das operações', 6),
      T('17:30', 'Preparar a pauta de amanhã e as decisões pendentes', 7),
    ],
  },
  {
    id: 'ceo', nome: 'CEO', nivel: 'ceo', mentalidade: 'ceo',
    entrega: 'uma operação que roda sem você na sala: sistema, processo e gente formada',
    dia: [
      T('08:00', 'Decidir com os números: o gargalo da empresa hoje', 7),
      T('09:30', 'Formar um diretor (plano de 30 dias) — a conversa do dia', 8, 45),
      T('11:00', 'Desenhar ou corrigir um processo que depende de uma pessoa só', 8),
      T('15:00', 'Revisar o planejamento executivo do ciclo', 7),
      T('17:00', 'Preparar a reunião de diretoria de segunda', 7),
    ],
  },
  {
    id: 'livoo_live', nome: 'Livoo Live', nivel: 'livoo_live', mentalidade: 'diretor',
    entrega: 'as lives e a vitrine viva do ecossistema, com o time no ar',
    dia: [
      T('09:00', 'Planejar a live do dia: produtos, roteiro e chamada', 7),
      T('11:00', 'Treinar quem vai apresentar na live', 8, 45),
      T('19:00', 'Live do dia', 5, 60),
      T('20:30', 'Follow-up dos pedidos da live e os números', 6),
    ],
  },
  {
    id: 'embaixador', nome: 'Embaixador', nivel: 'embaixador', mentalidade: 'diretor',
    entrega: 'o ecossistema crescendo pela rede: indicações, parcerias e duplicação',
    dia: [
      T('09:00', 'Mapear 5 indicações e parcerias novas', 3),
      T('10:00', 'Contatos do dia com os parceiros e indicados', 4),
      T('14:00', 'Apresentação do ecossistema para um parceiro', 5, 60),
      T('16:00', 'Acompanhar os parceiros ativos e os fechamentos', 6),
      T('17:30', 'Duplicar: ensinar um parceiro a apresentar', 8, 45),
    ],
  },
  // ── funções que o painel de controle não tem — o dono escolhe no painel da pessoa ──
  {
    id: 'cmo', nome: 'CMO (marketing)', nivel: null, mentalidade: 'diretor', empresaPadrao: 'top_tech_digital',
    entrega: 'a marca e a demanda: conteúdo, campanhas e os números de aquisição',
    dia: [
      T('08:30', 'Ler os números de aquisição de ontem (alcance, leads, custo)', 7),
      T('09:30', 'Planejar e aprovar o conteúdo do dia (stories, posts, anúncios)', 7),
      T('11:00', 'Treinar o time de conteúdo na narrativa da Rotina Perfeita', 8, 45),
      T('14:00', 'Reunião com a operação: o que o marketing precisa entregar', 5, 45),
      T('16:00', 'Acompanhar as campanhas no ar e corrigir o que travou', 6),
      T('17:30', 'Fechar os números do dia e a pauta de amanhã', 7),
    ],
  },
  {
    id: 'cto', nome: 'CTO (tecnologia)', nivel: null, mentalidade: 'ceo', empresaPadrao: 'top_tech_digital',
    entrega: 'a plataforma no ar e evoluindo: o que a operação pede vira sistema',
    dia: [
      T('08:30', 'Conferir a plataforma: erros, filas e o que travou de ontem', 7),
      T('09:30', 'Priorizar com a operação o que entra no dia', 7, 30),
      T('11:00', 'Desenhar o processo/sistema da prioridade do dia', 8),
      T('15:00', 'Revisar o que foi entregue e publicar', 6),
      T('17:30', 'Registrar o que mudou e a pauta de amanhã', 7),
    ],
  },
  {
    id: 'cfo', nome: 'CFO (financeiro)', nivel: null, mentalidade: 'ceo',
    entrega: 'o caixa sob controle: entradas, saídas, comissões e o fixo pago no dia',
    dia: [
      T('08:30', 'Conferir o caixa de ontem: entradas, saídas e pendências', 7),
      T('10:00', 'Aprovar os pagamentos e as comissões do dia', 6),
      T('14:00', 'Revisar o orçamento do ciclo com a diretoria', 7, 45),
      T('17:00', 'Fechar o dia e apontar o que sai do previsto', 7),
    ],
  },
];

export const funcaoDe = (id) => FUNCOES.find((f) => f.id === id) || null;
/** A função pelo nível do painel de controle (Diretor Operacional → Diretor de Operações). */
export const funcaoDoNivel = (nivel) => FUNCOES.find((f) => f.nivel && f.nivel === nivel) || null;

/**
 * A função efetiva da pessoa: a escolhida no painel dela (funcao_titulo,
 * quando bate com uma função daqui), senão a do nível do painel de controle.
 */
export function funcaoDaPessoa({ funcaoTitulo, nivel } = {}) {
  const escolhida = funcaoTitulo ? FUNCOES.find((f) => f.id === funcaoTitulo || f.nome.toLowerCase() === String(funcaoTitulo).toLowerCase()) : null;
  return escolhida || funcaoDoNivel(nivel) || null;
}

/** O dia da função virando linhas de metodo_tarefas — com ensinamento e prazo. */
export function montarDiaDaFuncao(funcao, { userId, dia, criadoPorId = null, prazoISO = null, ordemInicial = 0 } = {}) {
  const f = typeof funcao === 'string' ? funcaoDe(funcao) : funcao;
  if (!f || !userId || !dia) return [];
  return f.dia.map((t, i) => ({
    user_id: userId, data: dia, hora: t.hora, titulo: t.titulo, feito: false, ordem: ordemInicial + i,
    categoria: 'mentoria', peso: pesoComMentalidade(t.titulo, f.mentalidade).peso,
    origem: 'xperf', criado_por_id: criadoPorId,
    mentalidade: f.mentalidade, habito: t.habito,
    detalhe: ensinamentoDaTarefa({ mentalidade: f.mentalidade, habito: t.habito, detalhe: `Tarefa da função ${f.nome}${t.minutos ? ` (${t.minutos} min)` : ''}: ${f.entrega}.` }),
    prazo_em: prazoISO,
  }));
}
