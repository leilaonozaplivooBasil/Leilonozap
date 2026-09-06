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
  {
    id: 'logistica', nome: 'Diretora de Logística', curto: 'Logística', oficial: 'logistica', nivel: null, mentalidade: 'diretor',
    entrega: 'a mercadoria chegando: Distribuidora Recreio a R$ 1 milhão/mês (~132 compras/dia), estoque conferido, expedição no dia e pontos de retirada abastecidos',
    dia: [
      T('08:00', 'Conferir o estoque e as entradas de ontem (listas, lotes, notas)', 7),
      T('09:00', 'Separar e expedir os pedidos do dia (transportadoras e retirada)', 6),
      T('11:00', 'Abastecer a Distribuidora e os pontos de retirada', 6),
      T('14:00', 'Treinar o time da distribuidora no atendimento e na conferência', 8, 45),
      T('16:00', 'Acompanhar as compras da loja física (meta ~132 por dia)', 7),
      T('17:30', 'Fechar a expedição do dia e apontar o que travou', 7),
    ],
  },
  // ── funções que o mercado pede e o documento ainda não tem (dono, 06/09/2026: "insira") ──
  {
    id: 'rh', nome: 'Diretor de Pessoas (CHRO)', curto: 'Pessoas', oficial: null, mercado: true, nivel: null, mentalidade: 'diretor',
    entrega: 'gente certa no lugar certo: recrutamento, onboarding, cultura Top College + X-EOS e o acompanhamento semanal de cada um',
    dia: [
      T('08:30', 'Ler o semáforo do time: quem não planejou, quem atrasou, quem devolveu', 7),
      T('09:30', 'Entrevistas e recrutamento do dia', 5, 60),
      T('11:00', 'Onboarding de quem entrou: os 8 Hábitos e a Rotina Perfeita', 8, 45),
      T('14:00', 'Reunião 1:1 com um executivo do time', 6, 30),
      T('16:00', 'Cultura: um valor do grupo vivido e registrado hoje', 8),
      T('17:30', 'Fechar o dia: contratações, desligamentos e o clima', 7),
    ],
  },
  {
    id: 'produto', nome: 'Diretor de Produto (CPO)', curto: 'Produto', oficial: null, mercado: true, nivel: null, mentalidade: 'ceo',
    entrega: 'o aplicativo que converte: jornada, Ranking Premiado, leilão, loja e as integrações — com os 12 números na tela',
    dia: [
      T('08:30', 'Ler conversão, ticket e K-Factor de ontem', 7),
      T('09:30', 'Priorizar com a operação e o CTO o que entra na semana', 7, 45),
      T('11:00', 'Desenhar a melhoria do dia (jornada, tela, automação)', 8),
      T('15:00', 'Testar com um usuário real e registrar', 5, 45),
      T('17:30', 'Publicar o que ficou pronto e a pauta de amanhã', 6),
    ],
  },
  {
    id: 'compras', nome: 'Diretor de Compras e Estoque', curto: 'Compras', oficial: null, mercado: true, nivel: null, mentalidade: 'diretor',
    entrega: 'listas compradas a ~22,8% do mercado, giro em 30 dias e estoque suficiente pra R$ 5 milhões/mês',
    dia: [
      T('08:30', 'Ler o giro do estoque e o custo médio de aquisição de ontem', 7),
      T('09:30', 'Contatos com fornecedores, indústrias e listas novas', 4),
      T('11:00', 'Negociar um lote (deságio, prazo, frete)', 5, 60),
      T('14:00', 'Conferir a entrada do lote com a logística', 7),
      T('16:00', 'Reposição: o que gira compra de novo', 6),
      T('17:30', 'Fechar o dia: lotes, custo médio e a pauta de amanhã', 7),
    ],
  },
  {
    id: 'atendimento', nome: 'Diretor de Atendimento e Sucesso do Cliente', curto: 'Atendimento', oficial: null, mercado: true, nivel: null, mentalidade: 'diretor',
    entrega: 'o cliente comprando de novo: WhatsApp respondido na hora, pós-venda, recorrência e a reclamação virando melhoria',
    dia: [
      T('08:30', 'Ler a fila do WhatsApp e as reclamações de ontem', 7),
      T('09:00', 'Atender e responder a fila da manhã', 4),
      T('11:00', 'Pós-venda: contato com quem comprou ontem', 4),
      T('14:00', 'Treinar o time de atendimento no script e no tom', 8, 45),
      T('16:00', 'Recompra: oferta pra quem comprou há 30 dias', 6),
      T('17:30', 'Fechar o dia: tempo de resposta, NPS e o que virou melhoria', 7),
    ],
  },
  {
    id: 'expansao', nome: 'Diretor de Expansão e Franquias', curto: 'Expansão', oficial: null, mercado: true, nivel: null, mentalidade: 'diretor',
    entrega: 'a rede física crescendo: pontos de retirada, lojas físicas, licenciados e parceiros abertos no prazo do ciclo',
    dia: [
      T('08:30', 'Ler o pipeline de expansão: candidatos a ponto, loja e licenciado', 7),
      T('09:30', 'Contatos do dia com candidatos e regiões-alvo', 4),
      T('11:00', 'Apresentação de sucesso pra um candidato a licença', 5, 60),
      T('14:00', 'Visita ou reunião de abertura (ponto de retirada / loja)', 5, 90),
      T('16:30', 'Follow-up dos contratos de licença em assinatura', 6),
      T('17:30', 'Fechar o dia: aberturas, contratos e a pauta de amanhã', 7),
    ],
  },
  {
    id: 'juridico', nome: 'Diretor Jurídico e Compliance', curto: 'Jurídico', oficial: null, mercado: true, nivel: null, mentalidade: 'ceo',
    entrega: 'contratos, vesting e termos validados juridicamente — a estrutura contratual refletindo a operação real',
    dia: [
      T('08:30', 'Ler os contratos e termos pendentes de ontem', 7),
      T('10:00', 'Revisar e liberar os contratos do dia (investidores, licenças, adesões)', 6),
      T('14:00', 'Vesting e participação: a regra escrita batendo com o documento oficial', 7, 60),
      T('16:00', 'Compliance: LGPD, termos e o que muda na lei', 7),
      T('17:30', 'Fechar o dia e a pauta de amanhã', 7),
    ],
  },
  {
    id: 'dados', nome: 'Diretor de Dados e BI', curto: 'Dados', oficial: null, mercado: true, nivel: null, mentalidade: 'ceo',
    entrega: 'os 12 números do dashboard da diretoria certos todo dia, e dado realizado separado de premissa e projeção',
    dia: [
      T('08:00', 'Fechar os 12 números de ontem e publicar pra diretoria', 7),
      T('09:30', 'Investigar o número que saiu da curva', 7),
      T('11:00', 'Automatizar uma conta que ainda é feita à mão', 8),
      T('15:00', 'Reunião com uma área: o dado que ela precisa', 5, 45),
      T('17:30', 'Registrar premissas e projeções separadas do realizado', 7),
    ],
  },
  {
    id: 'gerente_loja', nome: 'Gerente de Loja / Distribuidora', curto: 'Gerente de loja', oficial: null, mercado: true, nivel: null, mentalidade: 'executivo',
    entrega: 'a loja batendo ~132 compras por dia: vitrine, atendimento, caixa e o estoque na prateleira',
    dia: [
      T('08:00', 'Abrir a loja: vitrine, preços e estoque na prateleira', 2),
      T('09:00', 'Atender e vender no balcão (meta ~132 compras/dia)', 5),
      T('12:00', 'Conferir o caixa da manhã', 7),
      T('14:00', 'Treinar a equipe da loja em combo, cross-sell e ticket', 8, 30),
      T('17:00', 'Fechar o caixa e contar o estoque do dia', 7),
      T('18:00', 'Reportar as compras do dia e o que faltou na prateleira', 7),
    ],
  },
  {
    id: 'conteudo', nome: 'Diretor de Conteúdo e Lives', curto: 'Conteúdo', oficial: null, mercado: true, nivel: null, mentalidade: 'diretor',
    entrega: '5 lives por semana e o conteúdo diário que alimenta o Ranking, o WhatsApp e a recorrência',
    dia: [
      T('08:30', 'Ler alcance, cadastros e vendas do conteúdo de ontem', 7),
      T('09:30', 'Produzir o conteúdo do dia (stories, posts, chamada do Ranking)', 6),
      T('11:00', 'Preparar a live: produtos, roteiro e leilão', 7),
      T('14:00', 'Treinar quem vai apresentar', 8, 45),
      T('19:00', 'Live comercial (seg, ter, qua, qui, sáb)', 5, 60),
      T('20:30', 'Follow-up dos pedidos da live', 6),
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
  'diretora de logistica': 'logistica', 'diretor de logistica': 'logistica', 'diretora de logística': 'logistica', 'diretor de logística': 'logistica', clo: 'logistica', distribuidora: 'logistica',
  'diretor de pessoas': 'rh', 'diretora de pessoas': 'rh', chro: 'rh', 'recursos humanos': 'rh', pessoas: 'rh',
  'diretor de produto': 'produto', cpo: 'produto',
  'diretor de compras': 'compras', 'diretora de compras': 'compras', estoque: 'compras',
  'diretor de atendimento': 'atendimento', 'sucesso do cliente': 'atendimento', 'customer success': 'atendimento', cso: 'atendimento',
  'diretor de expansao': 'expansao', 'diretor de expansão': 'expansao', franquias: 'expansao',
  'diretor juridico': 'juridico', 'diretor jurídico': 'juridico', compliance: 'juridico',
  'diretor de dados': 'dados', bi: 'dados',
  'gerente de loja': 'gerente_loja', 'gerente da loja': 'gerente_loja', 'gerente de distribuidora': 'gerente_loja',
  'diretor de conteudo': 'conteudo', 'diretor de conteúdo': 'conteudo', lives: 'conteudo',
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
/** As que o mercado pede e o documento ainda não tem — o dono mandou inserir (06/09/2026). */
export const FUNCOES_DE_MERCADO = FUNCOES.filter((f) => f.mercado);
export const FUNCOES_DO_PAINEL = FUNCOES.filter((f) => !f.oficial && !f.mercado);

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
