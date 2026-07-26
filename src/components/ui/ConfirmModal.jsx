import React from 'react';
import { Loader2, X } from 'lucide-react';

// ✅ ConfirmModal — confirmação DA PLATAFORMA em liquid glass (pedido Gabriel 25/07:
// "nada de confirmar pelo navegador"). Substitui window.confirm/alert nos fluxos
// de pedidos. danger=true deixa o botão de confirmar vermelho (ações destrutivas).
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  loading = false,
  icon = null,
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => !loading && onClose?.()}
    >
      <div
        className="confirm-glass relative w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderRadius: 22,
          border: `1px solid ${danger ? 'rgba(248,113,113,0.35)' : 'rgba(52,211,153,0.35)'}`,
          background: danger
            ? 'linear-gradient(155deg, rgba(239,68,68,0.22) 0%, rgba(69,10,10,0.6) 50%, rgba(23,10,10,0.85) 100%)'
            : 'linear-gradient(155deg, rgba(16,185,129,0.24) 0%, rgba(6,78,59,0.55) 50%, rgba(2,44,34,0.8) 100%)',
          backdropFilter: 'blur(22px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.4)',
          boxShadow: `0 20px 60px rgba(0,0,0,0.55), 0 0 36px ${danger ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.22)'}, inset 0 1px 0 rgba(255,255,255,0.15)`,
        }}
      >
        <button
          onClick={() => !loading && onClose?.()}
          aria-label="Fechar"
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {icon && <div className="mb-3 flex justify-center">{icon}</div>}

        <h3 className="text-lg font-black text-white mb-2">{title}</h3>
        {message && <div className="text-sm text-white/80 mb-5 leading-relaxed">{message}</div>}

        <div className="flex gap-2.5">
          <button
            onClick={() => !loading && onClose?.()}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white/85 border border-white/20 bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-black text-white transition-transform hover:scale-[1.02] disabled:opacity-60 flex items-center justify-center gap-2"
            style={{
              background: danger
                ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                : 'linear-gradient(135deg,#34d399,#10b981)',
              boxShadow: danger ? '0 8px 22px rgba(239,68,68,.4)' : '0 8px 22px rgba(16,185,129,.4)',
            }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Aguarde…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
