import React from 'react';
import { registrarLog } from '@/lib/logDedupe';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 ErrorBoundary capturou erro:', error.message);
    
    // Loga o erro no SystemLog para diagnóstico (via gravador único: a mesma
    // tela quebrando em loop não grava N vezes o mesmo registro).
    registrarLog({
      step: 'ErrorBoundary_ClientError',
      status: 'error',
      message: `UI crashed: ${error.message}`,
      component_name: 'ErrorBoundary',
      error_details: {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      },
      url: window.location.href,
      user_agent: navigator.userAgent
    });

    // Auto-reload após 2 segundos ao invés de mostrar tela de erro
    this.setState(prev => ({ errorCount: prev.errorCount + 1 }));
    
    if (this.state.errorCount < 2) {
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }

  render() {
    if (this.state.hasError && this.state.errorCount >= 2) {
      // Após 2 tentativas, mostra uma mensagem simples
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
          <div className="text-center">
            <h2 className="text-xl mb-4">Detectamos um problema</h2>
            <button 
              onClick={() => window.location.href = '/'}
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;