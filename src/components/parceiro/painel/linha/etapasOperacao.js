// 🗺️ ETAPAS OFICIAIS DO CICLO DO APORTE — fonte única da Linha do Tempo.
//
// Regra da operação (definida por Gabriel em 06/08/2026): TODO o ciclo físico —
// do aceite do contrato até o produto disponível para venda na Loja Virtual —
// acontece em NO MÁXIMO 15 dias. A apuração da rentabilidade começa no 31º dia
// e o primeiro repasse ocorre no 60º dia (Cláusula 8.2).
//
// `dia` = D+n contado da assinatura do contrato. Só descrição — nenhum cálculo
// financeiro nasce aqui.

export const DIAS_CICLO_FISICO = 15;
export const DIA_INICIO_APURACAO = 31;
export const DIA_PRIMEIRO_REPASSE = 60;

export const ETAPAS = [
  {
    id: 'contrato',
    dia: 0,
    titulo: 'Contrato de Parceria assinado',
    texto:
      'Aceite eletrônico registrado com data, hora e IP (Lei nº 14.063/2020 e MP nº 2.200-2/2001). É o marco zero do ciclo.',
    marco: 'Jurídico',
  },
  {
    id: 'pagamento',
    dia: 0,
    titulo: 'Pagamento do aporte confirmado',
    texto:
      'Confirmação automática do PIX pelo gateway. O capital entra vinculado ao seu contrato — sem confirmação, o ciclo não começa.',
    marco: 'Financeiro',
  },
  {
    id: 'alocacao',
    dia: 1,
    titulo: 'Capital alocado na operação',
    texto:
      'Seu capital é reservado para a disputa de um lote específico da curadoria, com limite máximo de lance definido antes do leilão.',
    marco: 'Operação',
  },
  {
    id: 'arremate',
    dia: 2,
    titulo: 'Lote arrematado',
    texto:
      'Arremate confirmado no leilão, com nota e comprovante de pagamento do lote anexados ao ciclo.',
    marco: 'Operação',
  },
  {
    id: 'retirada',
    dia: 4,
    titulo: 'Retirada e carregamento',
    texto:
      'Coleta do lote no local indicado pelo leiloeiro, com conferência de volumes na origem.',
    marco: 'Logística',
  },
  {
    id: 'transito',
    dia: 6,
    titulo: 'Em trânsito para o Rio de Janeiro',
    texto: 'Transporte do lote da origem até a nossa base operacional.',
    marco: 'Logística',
  },
  {
    id: 'deposito',
    dia: 8,
    titulo: 'Chegada no depósito',
    texto:
      'Recebimento e conferência cega contra a planilha do leilão: o que veio, o que faltou, o que veio a mais.',
    marco: 'Logística',
  },
  {
    id: 'curadoria',
    dia: 10,
    titulo: 'Curadoria e classificação',
    texto:
      'Teste, limpeza e classificação item por item nas grades A a E. É a curadoria que separa o que vira produto do que vira peça.',
    marco: 'Curadoria',
  },
  {
    id: 'precificacao',
    dia: 12,
    titulo: 'Precificação e cadastro',
    texto:
      'Preço definido contra o valor de mercado do momento, com foto, descrição e ficha técnica de cada item.',
    marco: 'Comercial',
  },
  {
    id: 'publicado',
    dia: 14,
    titulo: 'Publicado na Loja Virtual',
    texto: 'Os produtos entram no ar na Loja Virtual e no aplicativo, com estoque real.',
    marco: 'Comercial',
  },
  {
    id: 'disponivel',
    dia: 15,
    titulo: 'Disponível para venda em toda a rede',
    texto:
      'Toda a rede — licenciados, vendedores e influenciadores — passa a poder vender os produtos do lote. Fim do ciclo físico.',
    marco: 'Comercial',
  },
  {
    id: 'apuracao',
    dia: DIA_INICIO_APURACAO,
    titulo: 'Início da apuração da rentabilidade',
    texto:
      'A partir do 31º dia a rentabilidade do seu aporte passa a ser apurada e contabilizada dia a dia.',
    marco: 'Financeiro',
    destaque: true,
  },
  {
    id: 'repasse',
    dia: DIA_PRIMEIRO_REPASSE,
    titulo: 'Primeiro repasse e prestação de contas',
    texto:
      'Fechamento do primeiro ciclo (Cláusula 8.2): repasse do resultado apurado e demonstrativo completo na tela de Prestação de Contas.',
    marco: 'Financeiro',
    destaque: true,
  },
];