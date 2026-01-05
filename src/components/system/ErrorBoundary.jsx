import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Não muda o estado - deixa o componente renderizar normalmente
    return { hasError: false };
  }

  componentDidCatch(error, errorInfo) {
    // Apenas registra no console, não mostra UI de erro
    console.debug('🛡️ ErrorBoundary capturou erro (silencioso):', error.message);
  }

  render() {
    // Sempre renderiza os filhos, nunca mostra tela de erro
    return this.props.children;
  }
}

export default ErrorBoundary;