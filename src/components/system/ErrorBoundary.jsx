import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Error Boundary capturou erro:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Auto-reload após 3 erros consecutivos
    if (this.state.errorCount >= 2) {
      console.log('🔄 Múltiplos erros detectados - recarregando página...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-800 border border-red-500/50 rounded-lg p-6 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Ops! Algo deu errado</h1>
            <p className="text-gray-300 mb-6">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            
            {this.state.errorCount >= 2 && (
              <div className="bg-yellow-900/20 border border-yellow-500/50 rounded p-3 mb-4 text-yellow-300 text-sm">
                ⚠️ Recarregando automaticamente em 2 segundos...
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReload}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="border-gray-600 text-gray-300 flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Início
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;