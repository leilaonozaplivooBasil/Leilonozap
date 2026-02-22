import React from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaymentErrorModal({ isOpen, onClose, errorTitle, errorDescription, errorDetails }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gray-900 border-2 border-red-500/50 rounded-2xl shadow-2xl shadow-red-500/20 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Barra de alerta no topo */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 px-4 py-2 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
          <span className="text-white font-bold text-sm tracking-wide uppercase">⚠️ Atenção — Erro no Pagamento</span>
        </div>

        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute top-2 right-3 p-1 rounded-full hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>

        {/* Conteúdo */}
        <div className="p-6 space-y-5">
          {/* Ícone central */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
          </div>

          {/* Título do erro */}
          <h3 className="text-xl font-bold text-white text-center">
            {errorTitle || 'Falha no Pagamento'}
          </h3>

          {/* Descrição */}
          <p className="text-gray-300 text-center text-sm leading-relaxed">
            {errorDescription || 'Ocorreu um erro ao processar seu pagamento. Verifique os dados e tente novamente.'}
          </p>

          {/* Detalhes técnicos (se disponíveis) */}
          {errorDetails && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs text-red-300 font-mono break-all">
                {typeof errorDetails === 'string' 
                  ? errorDetails 
                  : Array.isArray(errorDetails) 
                    ? errorDetails.map((d, i) => (
                        <span key={i} className="block mb-1">• {d.description || d.code || JSON.stringify(d)}</span>
                      ))
                    : JSON.stringify(errorDetails)
                }
              </p>
            </div>
          )}

          {/* Aviso de atenção */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-yellow-300 text-xs">
              Se o problema persistir, entre em contato pelo WhatsApp informando o erro acima.
            </p>
          </div>

          {/* Botão */}
          <Button
            onClick={onClose}
            className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-base"
          >
            Entendi, vou tentar novamente
          </Button>
        </div>
      </div>
    </div>
  );
}