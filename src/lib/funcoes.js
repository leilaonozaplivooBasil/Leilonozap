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
import { cargoOficialDe, cargoOficialDoNome } from './documentoOficial.js';

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

// ── AS FUNÇÕES ──
// Duas listas numa só:
//   • as OFICIAIS (Documento Oficial de Operação p. 5 + Resumo Executivo p. 10):
//     COO, CRO, CCO, CMO, CBDO, CAO, CXO, CEO, CFO, CTO — `oficial` liga ao
//     cargo em documentoOficial.js (missão, metas, entregáveis, budget). O dia
//     de cada uma sai dos entregáveis do documento: quem capta faz 2 reuniões
//     de investimento por dia; o CRO treina o comercial todo dia; o CMO lê o
//     funil do Ranking; e assim por diante;
//   • as DO PAINEL (níveis que também são trabalho): Sócio Executivo, Livoo
//     Live e Embaixador — `nivel` aponta o nível do painel de controle.
// A função NÃO é o nível: Diretor Operacional / Diretoria Executiva /
// Fundador / Conselheiro são POSIÇÕES do painel; a função (COO, CFO…) é o
// trabalho. O dono escolhe a função no painel da pessoa; o documento sugere.
export const FUNCOES = [
  {
    id: 'coo', nome: 'COO · Diretor de Operações', curto: 'COO', oficial: 'coo', nivel: null, mentalidade: 'diretor',
    entrega: 'estratégia virando execução: as áreas integradas, 1 ponto de retirada por mês e 1 loja a cada 2 meses',
    dia: [
      T('08:30', 'Conferir os números de ontem das áreas (comercial, logística, distribuidora, estoque)', 7),
      T('09:00', 'Treinamento diário com o time da operação', 8, 45),
      T('10:00', 'Reunião de investimento 1 (captação R$ 150 mil/mês)', 5, 60),
      T('11:00', 'Validar as tarefas do time (conferência dupla) e dar o pronto', 7),
      T('14:00', 'Reunião de investimento 2', 5, 60),
      T('15:30', 'Avançar o próximo ponto de retirada / a próxima loja física', 6),
      T('17:30', 'Fechar os números do dia e apontar o gargalo de amanhã', 7),
    ],
  },
  {
    id: 'cro', nome: 'CRO · Diretor de Receita', curto: 'CRO', oficial: 'cro', nivel: null, mentalidade: 'diretor',
    entrega: 'receita e rede: 20 vendedores, 5 licenciados e 30 influenciadores novos por mês, com treinamento comercial todo dia',
    dia: [
      T('08:30', 'Conferir o funil comercial de ontem: contatos, apresentações, fechamentos', 7),
      T('09:00', 'Treinamento comercial diário com o time', 8, 45),
      T('10:00', 'Reunião de investimento 1 (captação R$ 150 mil/mês)', 5, 60),
      T('11:00', 'Recrutar: contatos com candidatos a vendedor, licenciado e influenciador', 4),
      T('14:00', 'Reunião de investimento 2', 5, 60),
      T('15:30', 'Apresentação de sucesso pra um candidato a licenciado', 5, 60),
      T('17:00', 'Follow-up dos fechamentos do time e os contratos do dia', 6),
    ],
  },
  {
    id: 'cco', nome: 'CCO · Diretor de Capital', curto: 'CCO', oficial: 'cco', nivel: null, mentalidade: 'ceo',
    entrega: 'a máquina de capital: R$ 350 mil por mês, 2 reuniões de investimento por dia, carteira acompanhada',
    dia: [
      T('08:30', 'Ler o pipeline de investidores e o CRM: quem está a um passo do sim', 7),
      T('09:30', 'Follow-up dos investidores em conversa e os contratos em assinatura', 6),
      T('10:30', 'Reunião de investimento 1 (ticket R$ 50 mil)', 5, 60),
      T('14:00', 'Reunião de investimento 2', 5, 60),
      T('15:30', 'Parceiros de compra e renovação da carteira (contratos de 12 meses)', 6),
      T('17:30', 'Fechar o dia: carteira, custo de capital e a pauta de amanhã', 7),
    ],
  },
  {
    id: 'cmo', nome: 'CMO · Diretor de Marketing', curto: 'CMO', oficial: 'cmo', nivel: null, mentalidade: 'diretor', empresaPadrao: 'top_tech_digital',
    entrega: 'audiência que compra: 1.000 novas pessoas por dia (1.200 visitantes → K ≥ 2 → 330–350 cadastros) e 5 lives por semana',
    dia: [
      T('08:30', 'Ler o funil do Ranking de ontem: visitantes, cadastros, K-Factor, CPC', 7),
      T('09:30', 'Planejar e aprovar o conteúdo do dia (stories, posts, anúncios, WhatsApp)', 7),
      T('11:00', 'Treinar embaixadores e influenciadores na chamada do Ranking Premiado', 8, 45),
      T('14:00', 'Reunião com a operação: o que o marketing precisa entregar hoje', 5, 45),
      T('16:00', 'Acompanhar as campanhas no ar e a escada de tráfego (só sobe com o funil validado)', 6),
      T('19:00', 'Live comercial do dia (seg, ter, qua, qui, sáb)', 5, 60),
    ],
  },
  {
    id: 'cbdo', nome: 'CBDO · Desenvolvimento de Negócios', curto: 'CBDO', oficial: 'cbdo', nivel: null, mentalidade: 'diretor',
    entrega: 'relacionamento virando negócio: 2 parcerias estratégicas por mês e R$ 250 mil de captação',
    dia: [
      T('08:30', 'Mapear distribuidores, indústrias, fabricantes e fornecedores pra abordar', 3),
      T('09:30', 'Contatos do dia com parceiros e grandes estoques (consignação, canais)', 4),
      T('10:30', 'Reunião de investimento 1 (captação R$ 250 mil/mês)', 5, 60),
      T('14:00', 'Reunião de investimento 2', 5, 60),
      T('15:30', 'Apresentação pra uma parceria estratégica', 5, 60),
      T('17:00', 'Follow-up das parcerias em andamento e os contratos', 6),
    ],
  },
  {
    id: 'cao', nome: 'CAO · Diretor Administrativo', curto: 'CAO', oficial: 'cao', nivel: null, mentalidade: 'diretor',
    entrega: 'crescimento virando organização: contratos, pagamentos, recebimentos, controles e a logística administrativa em dia',
    dia: [
      T('08:30', 'Conferir pagamentos, recebimentos e pendências de ontem', 7),
      T('09:30', 'Contratos, documentos e controles do dia (investidores e fornecedores)', 6),
      T('10:30', 'Reunião de investimento 1 (captação R$ 100 mil/mês)', 5, 60),
      T('14:00', 'Reunião de investimento 2', 5, 60),
      T('15:30', 'Logística administrativa: pedidos, notas, entrada, saída, conferência e transportadoras', 7),
      T('17:30', 'Fechar o dia e a contabilidade pendente', 7),
    ],
  },
  {
    id: 'cxo', nome: 'CXO · Relacionamento e Experiência', curto: 'CXO', oficial: 'cxo', nivel: null, mentalidade: 'ceo',
    entrega: 'as relações humanas e institucionais protegidas: executivos, parceiros, investidores estratégicos e a cultura',
    dia: [
      T('09:00', 'Conversa institucional com um executivo ou parceiro', 5, 45),
      T('11:00', 'Abrir um relacionamento relevante pra companhia', 4),
      T('15:00', 'Integrar pessoas: apoio institucional ao CEO e à diretoria', 8),
      T('17:00', 'Registrar a história e os valores vividos hoje', 7),
    ],
  },
  {
    id: 'ceo', nome: 'CEO · Diretor Executivo', curto: 'CEO', oficial: 'ceo', nivel: 'ceo', mentalidade: 'ceo',
    entrega: 'valor empresarial: visão, tecnologia, modelo de negócio, capital, valuation, cultura e marketing estratégico',
    dia: [
      T('08:00', 'Decidir com os 12 números do dashboard: o gargalo da companhia hoje', 7),
      T('09:30', 'Formar um diretor (Mentalidade do Diretor / do CEO) — a conversa do dia', 8, 45),
      T('11:00', 'Tecnologia e modelo de negócio: uma decisão de produto ou de canal', 7),
      T('15:00', 'Capital e valuation: uma apresentação ou relacionamento estratégico', 5, 60),
      T('17:00', 'Preparar a segunda-feira: Bloco 1 (formação) e Bloco 2 (organização)', 7),
    ],
  },
  {
    id: 'cfo', nome: 'CFO · Diretor Financeiro', curto: 'CFO', oficial: 'cfo', nivel: null, mentalidade: 'ceo',
    entrega: 'o caixa sob comando: entradas, saídas, comissões, o fixo pago no dia e o orçamento do ciclo contra o realizado',
    dia: [
      T('08:30', 'Conferir o caixa de ontem: entradas, saídas e pendências', 7),
      T('10:00', 'Aprovar os pagamentos, as comissões e o fixo do dia', 6),
      T('14:00', 'Orçamento do ciclo (R$ 213–248 mil/mês) contra o realizado', 7, 45),
      T('17:00', 'Fechar o dia: dado realizado, premissa e projeção separados', 7),
    ],
  },
  {
    id: 'cto', nome: 'CTO · Diretor de Tecnologia', curto: 'CTO', oficial: 'cto', nivel: null, mentalidade: 'ceo', empresaPadrao: 'top_tech_digital',
    entrega: 'a plataforma no ar e evoluindo: aplicativo, IA, automação, Superagente e integrações',
    dia: [
      T('08:30', 'Conferir a plataforma: erros, filas e o que travou de ontem', 7),
      T('09:30', 'Priorizar com a operação o que entra no dia', 7, 30),
      T('11:00', 'Desenhar o processo/sistema da prioridade do dia', 8),
      T('15:00', 'Revisar o que foi entregue e publicar', 6),
      T('17:30', 'Registrar o que mudou e a pauta de amanhã', 7),
    ],
  },
  // ── funções do painel de controle (níveis que também são trabalho) ──
  {
    id: 'socio_executivo', nome: 'Sócio Executivo', curto: 'Sócio Executivo', oficial: null, nivel: 'executivo_conta', mentalidade: 'executivo',
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
    id: 'livoo_live', nome: 'Livoo Live', curto: 'Livoo Live', oficial: null, nivel: 'livoo_live', mentalidade: 'diretor',
    entrega: 'as lives e a vitrine viva do ecossistema, com o time no ar',
    dia: [
      T('09:00', 'Planejar a live do dia: produtos, roteiro e chamada', 7),
      T('11:00', 'Treinar quem vai apresentar na live', 8, 45),
      T('19:00', 'Live do dia', 5, 60),
      T('20:30', 'Follow-up dos pedidos da live e os números', 6),
    ],
  },
  {
    id: 'embaixador', nome: 'Embaixador', curto: 'Embaixador', oficial: null, nivel: 'embaixador', mentalidade: 'diretor',
    entrega: 'o ecossistema crescendo pela rede: indicações, parcerias, influenciadores cadastrados e duplicação',
    dia: [
      T('09:00', 'Mapear 5 indicações e parcerias novas', 3),
      T('10:00', 'Contatos do dia com os parceiros e indicados', 4),
      T('14:00', 'Apresentação do ecossistema para um parceiro', 5, 60),
      T('16:00', 'Acompanhar os parceiros ativos e os fechamentos', 6),
      T('17:30', 'Duplicar: ensinar um parceiro a apresentar', 8, 45),
    ],
  },
];

// nomes antigos e nomes por extenso que o dono usa: continuam achando a função
const APELIDOS_FUNCAO = {
  diretor_operacoes: 'coo', 'diretor de operações': 'coo', 'diretora de operações': 'coo', 'diretor operacional': 'coo', operacoes: 'coo',
  'diretor financeiro': 'cfo', 'diretora financeira': 'cfo', financeiro: 'cfo',
  'diretor de marketing': 'cmo', marketing: 'cmo', 'cmo (marketing)': 'cmo',
  'diretor de tecnologia': 'cto', tecnologia: 'cto', 'cto (tecnologia)': 'cto', 'cfo (financeiro)': 'cfo',
  'diretor de capital': 'cco', capital: 'cco',
  'diretor de receita': 'cro', receita: 'cro', comercial: 'cro',
  'diretor administrativo': 'cao', 'diretora administrativa': 'cao', administrativo: 'cao',
  'desenvolvimento de negócios': 'cbdo', 'diretor de desenvolvimento de negócios': 'cbdo',
  'diretor executivo': 'ceo',
  'sócio executivo': 'socio_executivo', 'socio executivo': 'socio_executivo', executivo_conta: 'socio_executivo',
};
const semAcento = (s) => String(s || '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const funcaoDe = (id) => {
  if (!id) return null;
  const chave = String(id).toLowerCase().trim();
  const alias = APELIDOS_FUNCAO[chave] || APELIDOS_FUNCAO[semAcento(chave)];
  return FUNCOES.find((f) => f.id === (alias || chave))
    || FUNCOES.find((f) => semAcento(f.nome) === semAcento(chave) || semAcento(f.curto) === semAcento(chave))
    || null;
};
/** A função pelo nível do painel de controle — só pros níveis que também são trabalho (CEO, Livoo Live, Embaixador, Sócio Executivo). */
export const funcaoDoNivel = (nivel) => FUNCOES.find((f) => f.nivel && f.nivel === nivel) || null;
/** As funções oficiais do documento, na ordem do documento; e as do painel. */
export const FUNCOES_OFICIAIS = FUNCOES.filter((f) => f.oficial);
export const FUNCOES_DO_PAINEL = FUNCOES.filter((f) => !f.oficial);

/**
 * A função efetiva da pessoa, e DE ONDE ela veio:
 *   1. a escolhida no painel dela (funcao_titulo) — vence sempre;
 *   2. a que o Documento Oficial dá pelo nome (Emanuel → COO, Jean → CMO…);
 *   3. a do nível do painel, quando o nível também é trabalho (CEO, Livoo Live…);
 *   4. nada — o dono escolhe.
 * Diretor Operacional e Diretoria Executiva são POSIÇÕES, não função: não caem em nada.
 */
export function funcaoDaPessoaComOrigem({ funcaoTitulo, nivel, nome } = {}) {
  const escolhida = funcaoTitulo ? funcaoDe(funcaoTitulo) : null;
  if (escolhida) return { funcao: escolhida, origem: 'escolhida' };
  const doDoc = nome ? cargoOficialDoNome(nome) : null;
  const oficial = doDoc ? funcaoDe(doDoc.id) : null;
  if (oficial) return { funcao: oficial, origem: 'documento' };
  const doNivel = funcaoDoNivel(nivel);
  if (doNivel) return { funcao: doNivel, origem: 'painel' };
  return { funcao: null, origem: null };
}
export const funcaoDaPessoa = (args) => funcaoDaPessoaComOrigem(args).funcao;

/** O cargo oficial (missão, metas, entregáveis, budget) por trás de uma função. */
export const cargoOficialDaFuncao = (funcao) => (funcao?.oficial ? cargoOficialDe(funcao.oficial) : null);

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
