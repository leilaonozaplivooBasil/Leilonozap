// 📜 O DOCUMENTO OFICIAL DE OPERAÇÃO — a fonte única do ciclo executivo.
//
// DE ONDE VEIO (06/09/2026): o dono mandou dois PDFs e a ordem "estuda
// diligentemente os dois documentos, puxa o plano de carreira do painel,
// entende metas, share, entregáveis, função de cada um e transfere pro
// painel". São eles:
//   • DOCUMENTO OFICIAL DE OPERAÇÃO — Modelo Integrado de Governança,
//     Performance e Participação Econômica — Leilão NoZap — Ciclo Executivo
//     de 6 meses, setembro/2026 a fevereiro/2027 (46 páginas). É a LEI: os
//     cargos C-level com missão, metas e entregáveis; as cinco camadas do
//     modelo econômico; o Score Executivo; a escada de ascensão; os rituais.
//   • RESUMO EXECUTIVO INTEGRADO — Captação, Operação, Estoque, Distribuição,
//     Consórcio, Marketing e Escala (41 páginas). Traz o budget mensal por
//     pessoa (a Camada 1, "remuneração da função"), os 12 números do dashboard
//     da diretoria e a regra FUNÇÃO → KPI → META → ENTREGÁVEL → PRAZO →
//     CONDIÇÃO DE PERMANÊNCIA/VESTING.
//
// O QUE O DOCUMENTO SEPARA (p. 4), e o painel também: cargo funcional (a
// FUNÇÃO: COO, CRO…) ≠ posição institucional (Diretoria Operacional,
// Diretoria Executiva, Fundador, Conselheiro — os NÍVEIS do painel de
// controle) ≠ participação econômica ≠ carteira ≠ equity ≠ entregáveis ≠
// performance ≠ critérios de ascensão ≠ governança. Por isso a pessoa tem
// um nível (do painel) E uma função (daqui), e são coisas diferentes.
//
// Cada número abaixo tem a página de onde saiu. Nada aqui é chute: o que o
// documento não diz fica marcado como "não consta" e o dono preenche.

/** O ciclo executivo: seis meses, cada um com a fase oficial do roadmap (p. 3 e 39). */
export const CICLO = {
  nome: 'Ciclo Executivo de 6 meses',
  inicio: '2026-09',
  fim: '2027-02',
  meses: [
    { mes: '2026-09', fase: 'Estruturação', foco: 'formação, estruturação, preparação da Distribuidora, organização, contratos, tecnologia, marketing, testes e preparação do Ranking Premiado' },
    { mes: '2026-10', fase: '1.000 entradas/dia', foco: 'entra em escala a máquina de aquisição: 1.000 novas pessoas por dia no ecossistema' },
    { mes: '2026-11', fase: 'Escala', foco: 'crescimento de audiência, vendedores, influência, tráfego, estoque e conversão' },
    { mes: '2026-12', fase: 'Aceleração', foco: 'acelerar o que provou funcionar — capital só escala depois da eficiência' },
    { mes: '2027-01', fase: 'Consolidação', foco: 'consolidar a base, a carteira de capital e a operação física' },
    { mes: '2027-02', fase: 'Fechamento do ciclo e avaliação', foco: 'Score Executivo, equity de 0,5% e o convite para as camadas de governança' },
  ],
};
export const faseDoMes = (mes) => CICLO.meses.find((m) => m.mes === mes) || null;

/** As metas centrais da companhia (Documento p. 36–45; Resumo p. 2–3, 38). */
export const METAS_CENTRAIS = {
  captacaoMes: 1000000,        // R$ 1 milhão de captação por mês (p. 13)
  captacaoCiclo: 6000000,      // R$ 6 milhões em 6 meses (p. 14)
  vendasMes: 5000000,          // R$ 5 milhões/mês = online + física (p. 36)
  onlineMes: 4000000,
  fisicaMes: 1000000,
  usuariosAtivos: 250000,      // ~250 mil usuários ativos (p. 37)
  entradasDia: 1000,           // 1.000 novas pessoas/dia a partir de outubro (p. 24, 39)
  visitantesDia: 1200,
  cadastrosDia: 336,           // 330–350 cadastros/dia (p. 24)
  kFactor: 2,
  conversao: 0.064,
  ticketMedio: 252,
  ticketInvestimento: 50000,   // ticket médio de investimento (p. 16)
  livesSemana: 5,              // seg, ter, qua, qui, sáb (p. 23)
  reunioesInvestimentoDia: 2,  // por captador, inclusive segunda (p. 16, 34)
  diasProdutivos: 22,          // "~22 dias produtivos → 44 reuniões/mês por pessoa" (p. 16)
};

// ── 🎯 OS CARGOS OFICIAIS (Documento p. 5, 17–32; Resumo p. 9–10) ──
// `id` é a sigla; `titular` é quem o documento nomeia; `fixoBudget` é a linha
// do budget mensal do Resumo Executivo (p. 9) — a Camada 1 de cada um.
// `metas` são as metas mensais que o documento fixa; `oficial: false` marca a
// sugestão do assistente onde o documento não dá número.
const M = (chave, alvo, oficial = true, nota = null) => ({ chave, alvo, oficial, nota });

export const CARGOS_OFICIAIS = [
  {
    id: 'ceo', sigla: 'CEO', nome: 'Chief Executive Officer', cargoPt: 'Diretor Executivo',
    titular: 'Luiz Alberto Sant\'Anna Filho', primeiroNome: 'luiz', fixoBudget: 50000,
    dono: 'dono da visão', missao: 'Construir valor empresarial.',
    mentalidade: 'ceo',
    areas: ['visão estratégica', 'tecnologia', 'modelo de negócio', 'capital', 'valuation', 'cultura', 'marketing estratégico'],
    entregaveis: [
      'Direção, prioridades, roadmap, novos mercados e oportunidades',
      'Aplicativo, IA, automação, Superagente, integrações e ecossistema digital',
      'Distribuidores, lojas, vendedores, licenciados, influenciadores e monetização',
      'Grandes apresentações, tese de investimento, relacionamento estratégico e próximas rodadas',
      'Construção de ativos, acompanhamento dos indicadores e valorização da companhia',
      'Condução da Mentalidade do Diretor e do CEO, proteção da X-EOS e alinhamento com a cultura Top College',
      'Narrativa, posicionamento, campanhas estruturais e visão de marca',
    ],
    posicoes: ['diretoria_operacao', 'diretoria_executiva', 'fundador', 'conselheiro'],
    captacaoMes: null,
    metas: [M('encontros_formacao', 4, false, 'o documento não dá número ao CEO; conduz a formação de segunda (4 por mês)')],
    cadencia: ['Segunda 9h–12h: conduz o Bloco 1 (formação) e o Bloco 2 (organização)', 'Protege a X-EOS e a cultura Top College'],
    paginas: 'Documento p. 5, 17–18; Resumo p. 9',
  },
  {
    id: 'cco', sigla: 'CCO', nome: 'Chief Capital Officer', cargoPt: 'Diretor de Capital',
    titular: 'Luciano Pinheiro', primeiroNome: 'luciano', fixoBudget: 50000,
    dono: 'dono do capital', missao: 'Construir a máquina de capital.',
    mentalidade: 'ceo',
    areas: ['capital', 'investidores', 'estrutura financeira'],
    entregaveis: ['2 reuniões de investimento por dia', 'Investidores, CRM, pipeline e follow-up', 'Contratos e parceiros de compra', 'Recorrência, custo de capital e renovação', 'Acompanhamento da carteira'],
    posicoes: ['diretoria_operacao', 'diretoria_executiva', 'fundador', 'conselheiro'],
    captacaoMes: 350000,
    metas: [M('captacao', 350000), M('reunioes_investimento', 44)],
    cadencia: ['2 reuniões de investimento por dia, inclusive segunda', '44 reuniões por mês · 1 fechamento a cada 11'],
    nota: 'Os 10% históricos têm tratamento à parte do vesting padrão (p. 20).',
    paginas: 'Documento p. 5, 19–20; Resumo p. 9',
  },
  {
    id: 'coo', sigla: 'COO', nome: 'Chief Operating Officer', cargoPt: 'Diretor de Operações',
    titular: 'Emanuel Alves', primeiroNome: 'emanuel', fixoBudget: 7000,
    dono: 'dono da execução', missao: 'Transformar estratégia em execução.',
    mentalidade: 'diretor',
    areas: ['comercial', 'marketing', 'logística', 'distribuidora', 'estoque', 'processos', 'expansão', 'tecnologia operacional'],
    entregaveis: ['Integração operacional das áreas sob coordenação', '1 ponto de retirada por mês (6 em 6 meses)', '1 nova loja física a cada 2 meses (3 em 6 meses)', '2 reuniões de investimento por dia'],
    posicoes: ['diretoria_operacao'],
    captacaoMes: 150000,
    metas: [M('captacao', 150000), M('reunioes_investimento', 44), M('pontos_retirada', 1), M('lojas', 1, true, '1 a cada 2 meses: 3 no ciclo')],
    cadencia: ['2 reuniões de investimento por dia', 'Acompanhamento semanal das áreas'],
    paginas: 'Documento p. 5, 21; Resumo p. 9',
  },
  {
    id: 'cro', sigla: 'CRO', nome: 'Chief Revenue Officer', cargoPt: 'Diretor de Receita',
    titular: 'Cristiano Ribeiro', primeiroNome: 'cristiano', fixoBudget: 7000,
    dono: 'dono da receita', missao: 'Construir receita e rede.',
    mentalidade: 'diretor',
    areas: ['vendedores', 'licenciados', 'influenciadores', 'treinamento comercial', 'conversão'],
    entregaveis: ['20 vendedores novos por mês (20 × R$ 1.497 = R$ 29.940)', '5 licenciados novos por mês (5 × R$ 5.000 = R$ 25.000)', '30 influenciadores novos por mês', 'Treinamento comercial diário', 'Gestão do time, metas, recrutamento, conversão e performance'],
    posicoes: ['diretoria_operacao'],
    captacaoMes: 150000,
    metas: [M('captacao', 150000), M('reunioes_investimento', 44), M('vendedores', 20), M('licenciados', 5), M('influenciadores', 30), M('treinamentos', 22, true, 'treinamento comercial diário')],
    cadencia: ['Treinamento comercial todo dia', '2 reuniões de investimento por dia'],
    paginas: 'Documento p. 5, 22; Resumo p. 9',
  },
  {
    id: 'cmo', sigla: 'CMO', nome: 'Chief Marketing Officer', cargoPt: 'Diretor de Marketing',
    titular: 'Jean Aranha', primeiroNome: 'jean', fixoBudget: 4000,
    dono: 'dono da audiência', missao: 'Construir audiência que compra.',
    mentalidade: 'diretor',
    areas: ['Ranking Premiado', 'tráfego pago', 'orgânico', 'influenciadores', 'embaixadores', 'vendedores', 'WhatsApp', 'live', 'remarketing'],
    entregaveis: ['1.000 novas pessoas por dia a partir de outubro', '1.200 visitantes/dia → K-Factor ≥ 2 → 330–350 cadastros/dia', 'Escada de tráfego: R$ 300 → 500 → 800 → 1.000–1.200 por dia, só com o funil validado', '5 lives comerciais por semana (seg, ter, qua, qui, sáb)'],
    posicoes: ['diretoria_operacao'],
    captacaoMes: null,
    metas: [M('entradas', 30000, true, '1.000 por dia a partir de outubro'), M('cadastros', 10000, true, '330–350 por dia'), M('lives', 20, true, '5 por semana')],
    cadencia: ['Dashboard diário: visitantes, cadastros, K-Factor', 'Live comercial seg, ter, qua, qui e sáb'],
    paginas: 'Documento p. 5, 23–24, 40; Resumo p. 9, 17–24',
  },
  {
    id: 'cbdo', sigla: 'CBDO', nome: 'Chief Business Development Officer', cargoPt: 'Diretor de Desenvolvimento de Negócios',
    titular: 'Karen Castro', primeiroNome: 'karen', fixoBudget: 20000,
    dono: 'dono das oportunidades', missao: 'Transformar relacionamento em negócio.',
    mentalidade: 'diretor',
    areas: ['distribuidores', 'indústrias', 'fabricantes', 'fornecedores', 'grandes estoques', 'consignação', 'vendas diretas', 'novos canais', 'parcerias estratégicas'],
    entregaveis: ['2 parcerias estratégicas por mês (12 em 6 meses)', 'Distribuidores, indústrias, fabricantes e fornecedores', 'Grandes estoques, consignação e novos canais', 'O escritório da Barra como hub de capital e business development'],
    posicoes: ['diretoria_operacao'],
    captacaoMes: 250000,
    metas: [M('captacao', 250000), M('reunioes_investimento', 44), M('parcerias', 2)],
    cadencia: ['2 reuniões de investimento por dia'],
    paginas: 'Documento p. 5, 25; Resumo p. 9',
  },
  {
    id: 'cao', sigla: 'CAO', nome: 'Chief Administrative Officer', cargoPt: 'Diretor Administrativo',
    titular: 'Aline Mendes', primeiroNome: 'aline', fixoBudget: 10000,
    dono: 'dono da organização', missao: 'Transformar crescimento em organização.',
    mentalidade: 'diretor',
    areas: ['contratos', 'investidores', 'documentos', 'pagamentos', 'recebimentos', 'controles', 'fornecedores', 'contabilidade', 'logística administrativa'],
    entregaveis: ['Contratos, documentos e controles em dia', 'Pagamentos e recebimentos', 'Fornecedores e contabilidade', 'Logística administrativa: pedidos, notas, entrada, saída, conferência, transportadoras e documentação do estoque'],
    posicoes: ['diretoria_operacao'],
    captacaoMes: 100000,
    metas: [M('captacao', 100000), M('reunioes_investimento', 44)],
    cadencia: ['2 reuniões de investimento por dia'],
    paginas: 'Documento p. 5, 26; Resumo p. 9',
  },
  {
    id: 'cxo', sigla: 'CXO', nome: 'Chief Experience & Relationship Officer', cargoPt: 'Diretor de Relacionamento e Experiência',
    titular: 'José Amâncio', primeiroNome: 'amâncio', fixoBudget: null,
    dono: 'dono do relacionamento e da experiência humana', missao: 'Proteger e desenvolver as relações humanas e institucionais da Leilão NoZap.',
    mentalidade: 'ceo',
    areas: ['executivos', 'parceiros', 'investidores estratégicos', 'networking institucional', 'integração das pessoas', 'cultura'],
    entregaveis: ['Relacionamento com executivos, parceiros e investidores estratégicos', 'Networking institucional e abertura de relacionamentos relevantes', 'Integração das pessoas e fortalecimento de confiança', 'Representação da cultura e preservação da história e dos valores', 'Apoio institucional ao CEO'],
    posicoes: ['diretoria_executiva', 'fundador', 'conselheiro'],
    captacaoMes: null,
    metas: [M('reunioes', 12, false, 'o documento não dá número ao CXO; sugestão: 12 encontros institucionais no mês')],
    cadencia: [],
    nota: '0,5% de equity consolidado; +1,0% com aporte patrimonial de R$ 500 mil → 1,5% (p. 29–31).',
    paginas: 'Documento p. 5, 27–32',
  },
  {
    id: 'logistica', sigla: 'CLO', nome: 'Chief Logistics Officer', cargoPt: 'Diretora de Logística',
    titular: 'Beatriz Sant\'anna', primeiroNome: 'beatriz', fixoBudget: 3000,
    dono: 'dona da distribuidora e da entrega', missao: 'Fazer a mercadoria chegar: estoque, expedição, pontos de retirada e a Distribuidora Recreio rodando.',
    mentalidade: 'diretor',
    areas: ['Distribuidora Recreio', 'estoque', 'expedição', 'transportadoras', 'pontos de retirada', 'loja física'],
    entregaveis: ['Distribuidora Recreio operando: R$ 1 milhão/mês = ~132 compras por dia (ticket R$ 252)', 'Estoque conferido e girando (compra ao longo de 30 dias, sem imobilizar tudo)', 'Expedição e transportadoras: pedido sai no dia', 'Pontos de retirada abastecidos (1 novo por mês com o COO)'],
    posicoes: ['diretoria_operacao'],
    captacaoMes: null,
    metas: [M('expedicoes', 22 * 20, false, 'sugestão: ~20 pedidos expedidos por dia de operação'), M('inventarios', 4, false, 'sugestão: uma conferência de estoque por semana'), M('faturamento', 1000000, true, 'a meta física da Distribuidora (Documento p. 38)')],
    cadencia: ['Conferência de estoque semanal', 'Expedição fechada todo dia'],
    nota: 'Titular e budget no Resumo Executivo (p. 9: "Diretora de Logística / Responsável Distribuidora Recreio"); a meta física vem do Documento (p. 36–38).',
    paginas: 'Resumo p. 3, 9, 11–13; Documento p. 36–38, 41',
  },
  {
    id: 'cfo', sigla: 'CFO', nome: 'Chief Financial Officer', cargoPt: 'Diretor Financeiro',
    titular: null, primeiroNome: null, fixoBudget: null,
    dono: 'dono do caixa', missao: 'Manter o caixa, os controles e o resultado sob comando.',
    mentalidade: 'ceo',
    areas: ['caixa', 'resultado', 'comissões', 'orçamento', 'controles financeiros'],
    entregaveis: ['Caixa e resultado do mês fechados', 'Comissões e fixos pagos no dia', 'Orçamento do ciclo acompanhado contra o realizado (budget R$ 213–248 mil/mês)', 'Dado realizado, premissa e projeção sempre separados'],
    posicoes: ['diretoria_operacao'],
    captacaoMes: null,
    metas: [M('fechamentos_caixa', 22, false, 'o Documento Oficial não tem CFO; o Resumo Executivo lista o cargo sem titular nem meta — sugestão: fechar o caixa todo dia de operação')],
    cadencia: [],
    nota: 'Não consta no Documento Oficial; está na Estrutura de Liderança do Resumo Executivo (p. 10). O mais próximo no Documento é o CCO (capital) e a CAO (pagamentos e contabilidade).',
    paginas: 'Resumo p. 10',
  },
  {
    id: 'cto', sigla: 'CTO', nome: 'Chief Technology Officer', cargoPt: 'Diretor de Tecnologia',
    titular: 'Avila (futuro CTO)', primeiroNome: 'avila', fixoBudget: 2000,
    dono: 'dono da tecnologia', missao: 'Sustentar o aplicativo, a IA, a automação e as integrações.',
    mentalidade: 'ceo',
    areas: ['aplicativo', 'IA', 'automação', 'Superagente', 'integrações', 'tecnologia operacional'],
    entregaveis: ['Aplicativo, IA, automação, Superagente e integrações (a tecnologia é missão do CEO)', 'Tecnologia operacional sob o COO'],
    posicoes: ['diretoria_operacao'],
    captacaoMes: null,
    metas: [M('entregas_tecnicas', 4, false, 'sem meta no documento; sugestão: 4 entregas técnicas por mês')],
    cadencia: [],
    nota: '"Futuro CTO" no budget do Resumo Executivo (p. 9); no Documento Oficial a tecnologia é do CEO.',
    paginas: 'Resumo p. 9–10; Documento p. 17, 21',
  },
];

export const cargoOficialDe = (id) => CARGOS_OFICIAIS.find((c) => c.id === String(id || '').toLowerCase()) || null;

/** O cargo que o documento dá a uma pessoa pelo nome ("Emanuel Silva" → COO). */
export function cargoOficialDoNome(nome) {
  const n = String(nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!n) return null;
  return CARGOS_OFICIAIS.find((c) => c.primeiroNome && n.split(/\s+/).includes(c.primeiroNome.normalize('NFD').replace(/[̀-ͯ]/g, ''))) || null;
}

/** O time de captação e a conta da máquina de reuniões (p. 13–16). */
export const CAPTACAO = {
  time: [
    { id: 'cco', nome: 'Luciano', metaMes: 350000 },
    { id: 'cbdo', nome: 'Karen', metaMes: 250000 },
    { id: 'cro', nome: 'Cristiano', metaMes: 150000 },
    { id: 'coo', nome: 'Emanuel', metaMes: 150000 },
    { id: 'cao', nome: 'Aline', metaMes: 100000 },
  ],
  reunioesDia: 2, diasProdutivos: 22, reunioesMes: 44, ticket: 50000, fechamentosMes: 20, conversao: 1 / 11,
};

// ── 💰 O MODELO ECONÔMICO DO EXECUTIVO — cinco camadas (p. 11 e 44) ──
export const CAMADAS = [
  { id: 'funcao', n: 1, nome: 'Remuneração da função', regra: 'Valor mensal definido individualmente.', resumo: 'RENDA' },
  { id: 'carteira', n: 2, nome: 'Carteira de capital', regra: 'O captador recebe 1% ao mês sobre a carteira elegível de capital por ele construída, dentro dos contratos de 12 meses.', resumo: 'RECORRÊNCIA' },
  { id: 'pool', n: 3, nome: 'Diretoria Operacional', regra: 'Participação no pool de 0,5% das vendas da Leilão NoZap Brasil, creditado no Escritório Virtual.', resumo: 'PARTICIPAÇÃO' },
  { id: 'equity', n: 4, nome: 'Equity', regra: 'Executivos elegíveis poderão consolidar 0,5% da companhia mediante cumprimento do ciclo.', resumo: 'PATRIMÔNIO' },
  { id: 'governanca', n: 5, nome: 'Governança', regra: 'Possibilidade de convite para Diretoria Executiva, Fundadores e Conselho — cada posição com a sua fatia dos 10% do topo.', resumo: 'PODER DE CONSTRUÇÃO' },
];
export const RENDA_CARTEIRA_MES = 0.01;      // 1% ao mês sobre a carteira (p. 11, 15)
export const POOL_DIRETORIA_OPERACIONAL = 0.005; // 0,5% das vendas (p. 7)

// ── 🏛️ OS 10% DO TOPO — a divisão oficial do negócio (docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md §6) ──
// Dono, 06/09/2026: "0,5% de pool pra Diretoria Operacional, pool pra Diretoria
// Executiva, 1% pro Sócio Executivo sobre a sua estrutura de negócio, 3% pro
// CEO, 1% dividido entre fundadores, 1% pra Embaixador, 2% pra Livoo Live e 1%
// dividido pros conselheiros, totalizando 10%. Toda a divisão do nosso negócio
// está baseada nisso." É a mesma tabela que o motor paga (api/_lib/arvoreOficial.js
// POOLS + PCT_EXECUTIVO) — aqui só se LÊ; comissão não se mexe (DIR-39).
export const PARTICIPACAO_TOPO = [
  { id: 'ceo', nome: 'CEO', pct: 3.0, tipo: 'individual', convite: false },
  { id: 'livoo_live', nome: 'Livoo Live', pct: 2.0, tipo: 'individual', convite: false },
  { id: 'embaixador', nome: 'Embaixador', pct: 1.0, tipo: 'individual', convite: false },
  { id: 'conselheiro', nome: 'Conselheiro', pct: 1.0, tipo: 'pool', convite: true },
  { id: 'fundador', nome: 'Fundador', pct: 1.0, tipo: 'pool', convite: true },
  { id: 'diretoria_executiva', nome: 'Diretoria Executiva', pct: 0.5, tipo: 'pool', convite: true },
  { id: 'diretoria_operacao', nome: 'Diretoria Operacional', pct: 0.5, tipo: 'pool', convite: false },
  { id: 'executivo_conta', nome: 'Sócio Executivo', pct: 1.0, tipo: 'estrutura', convite: false },
];
export const TOTAL_TOPO_PCT = PARTICIPACAO_TOPO.reduce((s, p) => s + p.pct, 0); // 10
/** "3% individual sobre todas as vendas" / "1% em pool dividido entre os fundadores" / "1% sobre a própria estrutura de negócio" */
export function regraDaParticipacao(p) {
  const pct = `${p.pct.toLocaleString('pt-BR')}%`;
  if (p.tipo === 'pool') return `${pct} em pool, dividido entre quem tem a posição, sobre todas as vendas`;
  if (p.tipo === 'estrutura') return `${pct} sobre a própria estrutura de negócio (não é pool)`;
  return `${pct} individual sobre todas as vendas do ecossistema`;
}
export const INTEGRANTES_POOL_REFERENCIA = 7; // "considerando sete integrantes elegíveis" (p. 7)
export const EQUITY_CICLO = 0.005;           // 0,5% da companhia (p. 11, 12)
export const VALUATION_ATUAL = 25000000;     // R$ 25 milhões (p. 12)
export const VALUATIONS_REFERENCIA = [25000000, 50000000, 65000000, 100000000];

/** Quanto rende por mês uma carteira de capital (1% a.m.). */
export const rendaDaCarteira = (carteira) => Math.max(0, Number(carteira) || 0) * RENDA_CARTEIRA_MES;
/** O pool de 0,5% sobre as vendas do mês, e a referência por integrante. */
export function poolDiretoriaOperacional(vendasMes, integrantes = INTEGRANTES_POOL_REFERENCIA) {
  const pool = Math.max(0, Number(vendasMes) || 0) * POOL_DIRETORIA_OPERACIONAL;
  return { pool, porIntegrante: integrantes > 0 ? pool / integrantes : 0, integrantes };
}
/** O valor econômico de uma fatia de equity a um valuation. */
export const valorDoEquity = (valuation = VALUATION_ATUAL, fatia = EQUITY_CICLO) => Math.max(0, Number(valuation) || 0) * fatia;

// ── 📊 O SCORE EXECUTIVO (p. 42) — pra aquisição integral do equity ──
export const SCORE_EXECUTIVO = [
  { id: 'resultado', rotulo: 'Resultado financeiro', peso: 40 },
  { id: 'entregaveis', rotulo: 'Entregáveis da função', peso: 25 },
  { id: 'equipe', rotulo: 'Desenvolvimento da equipe', peso: 15 },
  { id: 'cultura', rotulo: 'Cultura e formação', peso: 10 },
  { id: 'organizacao', rotulo: 'Organização e accountability', peso: 10 },
];
export const LINHA_SCORE = 80; // "linha de referência: 80% de performance"

const clamp01 = (v) => (Number.isFinite(Number(v)) ? Math.min(1, Math.max(0, Number(v))) : 0);

/**
 * O score de 0 a 100 a partir de cinco frações (0..1). `null` numa fração
 * quer dizer "sem dado" — ela entra como zero e fica marcada.
 */
export function scoreExecutivo(fracoes = {}) {
  const partes = SCORE_EXECUTIVO.map((c) => {
    const bruto = fracoes[c.id];
    const semDado = bruto === null || bruto === undefined;
    const fracao = clamp01(bruto);
    return { ...c, fracao, pontos: Math.round(fracao * c.peso * 10) / 10, semDado };
  });
  const total = Math.round(partes.reduce((s, p) => s + p.pontos, 0) * 10) / 10;
  return { total, partes, liberado: total >= LINHA_SCORE, faltam: Math.max(0, Math.round((LINHA_SCORE - total) * 10) / 10) };
}

// ── 🪜 A ESCADA DE ASCENSÃO (p. 43) ──
export const ESCADA_ASCENSAO = [
  { id: 'formacao', n: 1, nome: 'Top College + X-EOS', descricao: 'a formação' },
  { id: 'mentalidade', n: 2, nome: 'Mentalidade do Diretor + CEO', descricao: 'a trilha rodando toda segunda' },
  { id: 'diretoria_operacional', n: 3, nome: 'Diretoria Operacional', descricao: 'território, meta, KPI, entregáveis e acompanhamento semanal' },
  { id: 'entregaveis', n: 4, nome: 'Entregáveis + Performance', descricao: 'Score Executivo ≥ 80%' },
  { id: 'equity', n: 5, nome: '0,5% de equity', descricao: 'consolidado ao fim do ciclo' },
  { id: 'convite', n: 6, nome: 'Convite: Diretoria Executiva · Fundadores · Conselho', descricao: 'somente por convite' },
];

/** As posições do topo (com a fatia de cada uma) — o nível do painel de controle é a posição. */
export const POSICOES = PARTICIPACAO_TOPO.map((p) => ({ ...p, pool: regraDaParticipacao(p) }));
/** As posições do topo que a pessoa ocupa, lidas dos níveis do painel de controle. */
export function posicoesDaPessoa(niveis = []) {
  const set = new Set((Array.isArray(niveis) ? niveis : [niveis]).filter(Boolean));
  return POSICOES.filter((p) => set.has(p.id));
}

/**
 * Em que degrau da escada a pessoa está. Lê: os níveis do painel (posições),
 * o score, os portões da sociedade (DIR-74) e se a trilha está rodando.
 */
export function degrauDaEscada({ niveis = [], score = null, portoesAbertos = 0, emFormacao = true } = {}) {
  const pos = posicoesDaPessoa(niveis).map((p) => p.id);
  // o degrau 6 é o convite: Diretoria Executiva, Fundadores, Conselho (p. 43)
  const temConvite = posicoesDaPessoa(niveis).some((p) => p.convite);
  let n = 1;
  if (emFormacao) n = 2;
  if (pos.includes('diretoria_operacao') || temConvite) n = 3;
  if (n >= 3 && (portoesAbertos > 0 || (score && score.total > 0))) n = 4;
  if (n >= 4 && score && score.liberado) n = 5;
  if (temConvite) n = 6;
  const atual = ESCADA_ASCENSAO.find((d) => d.n === n) || ESCADA_ASCENSAO[0];
  return { n, atual, proximo: ESCADA_ASCENSAO.find((d) => d.n === n + 1) || null, degraus: ESCADA_ASCENSAO.map((d) => ({ ...d, feito: d.n < n, atual: d.n === n })) };
}

// ── 🗓️ OS RITUAIS DA SEMANA (p. 16, 23, 33–35) ──
export const RITUAIS = [
  { id: 'segunda_formacao', dia: 1, hora: '09:00', ate: '10:00', nome: 'Bloco 1 — Formação', descricao: 'Top College + X-EOS: liderança, mentalidade, estratégia, cultura, visão e gestão (45 min a 1 h)' },
  { id: 'segunda_organizacao', dia: 1, hora: '10:00', ate: '12:00', nome: 'Bloco 2 — Organização', descricao: 'números, metas, problemas, decisões, responsáveis, prazos, entregáveis e planejamento semanal (~2 h)' },
  { id: 'reunioes_investimento', dia: null, hora: null, nome: '2 reuniões de investimento por dia', descricao: 'cada captador, inclusive segunda — 44 por mês, 220 no time' },
  { id: 'lives', dia: [1, 2, 3, 4, 6], hora: null, nome: 'Live comercial', descricao: 'segunda, terça, quarta, quinta e sábado — venda, leilão, ativação, relacionamento e recorrência' },
  { id: 'conexao_sexta', dia: 5, hora: null, nome: 'Conexão Sexta (opcional)', descricao: 'pausa espiritual; quem participa transfere a produção da sexta pro sábado — não existe redução da semana' },
];
export const rituaisDoDia = (diaDaSemana) => RITUAIS.filter((r) => r.dia === null || r.dia === diaDaSemana || (Array.isArray(r.dia) && r.dia.includes(diaDaSemana)));

/** O dashboard diário da diretoria — os 12 números (Resumo p. 38). */
export const DASHBOARD_DIRETORIA = [
  ['Usuários ativos', '→ 250 mil'], ['Novos usuários/dia', '1.000+'], ['Visitantes do Ranking/dia', '~1.200'], ['Cadastros do Ranking/dia', '330–350'],
  ['K-Factor', '≥ 2'], ['Conversão digital', '≥ 6,4%'], ['Ticket médio', '≥ R$ 252'], ['Venda online', '→ R$ 4M/mês'],
  ['Venda física', '→ R$ 1M/mês'], ['Faturamento total', '→ R$ 5M/mês'], ['Custo das listas', '~22,8%'], ['ROI operacional', '~113,68%'],
];
