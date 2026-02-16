import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * Componente exibido quando não há conexão com a internet
 */
export function OfflineScreen({ onRetry }) {
    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center z-50">
            <div className="text-center p-8 max-w-md">
                {/* Ícone animado */}
                <div className="mb-6 relative">
                    <div className="w-24 h-24 mx-auto bg-slate-700/50 rounded-full flex items-center justify-center">
                        <WifiOff className="w-12 h-12 text-slate-400" />
                    </div>
                    <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-slate-600 rounded-full animate-ping opacity-20" />
                </div>

                {/* Mensagem principal */}
                <h2 className="text-2xl font-bold text-white mb-3">
                    Sem conexão
                </h2>
                <p className="text-slate-400 mb-8">
                    Verifique sua conexão com a internet e tente novamente.
                </p>

                {/* Botão de retry */}
                <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors"
                >
                    <RefreshCw className="w-5 h-5" />
                    Tentar novamente
                </button>

                {/* Dica */}
                <p className="mt-8 text-sm text-slate-500">
                    💡 Você ainda pode ver os leilões salvos quando voltar a conexão
                </p>
            </div>
        </div>
    );
}

/**
 * Banner compacto de offline (para mostrar em cima do app)
 */
export function OfflineBanner({ onRetry }) {
    return (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-amber-900 px-4 py-2 flex items-center justify-center gap-3 z-50 shadow-lg">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Sem conexão com a internet</span>
            <button
                onClick={onRetry}
                className="text-xs bg-amber-600 text-white px-2 py-1 rounded hover:bg-amber-700 transition-colors"
            >
                Reconectar
            </button>
        </div>
    );
}

/**
 * Banner de reconexão (quando volta a conexão)
 */
export function ReconnectedBanner({ onDismiss }) {
    React.useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className="fixed top-0 left-0 right-0 bg-green-500 text-white px-4 py-2 flex items-center justify-center gap-2 z-50 shadow-lg animate-pulse">
            <span className="text-sm font-medium">✓ Conexão restaurada!</span>
        </div>
    );
}

export default OfflineScreen;
