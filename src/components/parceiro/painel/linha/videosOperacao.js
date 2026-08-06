// 🎥 VÍDEOS DA OPERAÇÃO por etapa do roadmap.
// Chave = id da etapa (etapasOperacao.js). Enquanto `url` estiver vazia, o slot
// aparece no trilho com o estado elegante "Vídeo em breve" — basta colar a URL
// do vídeo aqui para ele passar a tocar, sem tocar em nenhum componente.
export const VIDEOS_OPERACAO = {
  retirada: {
    titulo: 'Retirada e carregamento',
    legenda: 'Coleta do lote na origem, com conferência de volumes antes do embarque.',
    url: '',
    poster: '',
  },
  transito: {
    titulo: 'Lote em trânsito',
    legenda: 'Transporte da origem até a base operacional no Rio de Janeiro.',
    url: '',
    poster: '',
  },
  deposito: {
    titulo: 'Chegada no depósito',
    legenda: 'Descarregamento e conferência cega contra a planilha do leilão.',
    url: '',
    poster: '',
  },
  curadoria: {
    titulo: 'Curadoria e grades',
    legenda: 'Teste, limpeza e classificação item por item nas grades A a E.',
    url: '',
    poster: '',
  },
  publicado: {
    titulo: 'Publicação na Loja Virtual',
    legenda: 'Produtos entrando no ar com foto, ficha técnica e estoque real.',
    url: '',
    poster: '',
  },
};