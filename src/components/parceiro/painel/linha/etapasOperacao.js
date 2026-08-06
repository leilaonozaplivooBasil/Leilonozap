// 🗺️ ETAPAS OFICIAIS DO CICLO DO APORTE — fonte única da Linha do Tempo.
//
// ⚠️ REGRA OFICIAL ATUALIZADA POR GABRIEL EM 06/08/2026 (substitui a régua
// anterior de 15/31/60 dias). A operação inteira é de **30 DIAS**:
//   • D+0  — contrato assinado, aporte confirmado e LOTE PAGO no mesmo dia
//   • D+3 a D+7 — retirada e carregamento no leiloeiro
//   • D+10 — produtos publicados na Loja Virtual (fim do ciclo físico) e
//            início da rentabilização do capital
//   • D+30 — repasse pago + prestação de contas do ciclo
//
// `dia` = D+n contado da assinatura do contrato. Só descrição — nenhum cálculo
// financeiro nasce aqui.

export const DIAS_CICLO_FISICO = 10;
export const DIA_INICIO_APURACAO = 10;
export const DIA_PRIMEIRO_REPASSE = 30;

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
    dia: 0,
    titulo: 'Capital alocado na operação',
    texto:
      'Seu capital é reservado para a disputa de um lote específico da curadoria, com limite máximo de lance definido antes do leilão.',
    marco: 'Operação',
  },
  {
    id: 'arremate',
    dia: 0,
    titulo: 'Lote arrematado e pago no mesmo dia',
    texto:
      'O lote é arrematado e o pagamento ao leiloeiro é feito no mesmo dia, com nota e comprovante anexados ao ciclo.',
    marco: 'Operação',
  },
  {
    id: 'retirada',
    dia: 3,
    titulo: 'Retirada e carregamento (3 a 7 dias)',
    texto:
      'Coleta do lote no local indicado pelo leiloeiro, entre o 3º e o 7º dia, com conferência de volumes na origem.',
    marco: 'Logística',
  },
  {
    id: 'transito',
    dia: 7,
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
    dia: 9,
    titulo: 'Curadoria e classificação',
    texto:
      'Teste, limpeza e classificação item por item nas grades A a E. É a curadoria que separa o que vira produto do que vira peça.',
    marco: 'Curadoria',
  },
  {
    id: 'precificacao',
    dia: 9,
    titulo: 'Precificação e cadastro',
    texto:
      'Preço definido contra o valor de mercado do momento, com foto, descrição e ficha técnica de cada item.',
    marco: 'Comercial',
  },
  {
    id: 'publicado',
    dia: 10,
    titulo: 'Publicado na Loja Virtual',
    texto: 'Os produtos entram no ar na Loja Virtual e no aplicativo, com estoque real.',
    marco: 'Comercial',
  },
  {
    id: 'disponivel',
    dia: DIAS_CICLO_FISICO,
    titulo: 'Disponível para venda em toda a rede',
    texto:
      'Toda a rede — licenciados, vendedores e influenciadores — passa a poder vender os produtos do lote. Fim do ciclo físico.',
    marco: 'Comercial',
  },
  {
    id: 'apuracao',
    dia: DIA_INICIO_APURACAO,
    titulo: 'Capital começa a rentabilizar',
    texto:
      'Com os produtos no ar, o resultado do lote passa a ser apurado. Nada é devido antes do fechamento do ciclo.',
    marco: 'Financeiro',
    destaque: true,
  },
  {
    id: 'repasse',
    dia: DIA_PRIMEIRO_REPASSE,
    titulo: 'Repasse pago e prestação de contas',
    texto:
      'Fechamento do ciclo no 30º dia: repasse do resultado apurado e demonstrativo completo na tela de Prestação de Contas. Deste marco começam a contar os 12 meses de repasses do contrato.',
    marco: 'Financeiro',
    destaque: true,
  },
];