import React, { useState } from 'react';
import { X, Copy, Check, QrCode } from 'lucide-react';
import { fmtBR } from '@/lib/money';

// 💳 Mostra o código PIX recém-gerado para um pedido que já existia.
// Simples de propósito: QR + copia-e-cola. Quem paga confirma pelo próprio app do banco
// e a página de pedidos já detecta a confirmação sozinha.
export default function PixNovoModal({ dados, onClose }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(dados.pix_code || '');
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4">
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-gray-900 p-5 text-white">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <QrCode className="h-5 w-5 text-green-400" /> Novo código PIX
            </h3>
            <p className="mt-0.5 text-xs text-gray-400">Mesmo pedido, código novo</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="min-h-[44px] min-w-[44px] rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X className="mx-auto h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-center text-2xl font-black text-green-400">R$ {fmtBR(dados.amount || 0)}</p>

        {dados.qr_code_base64 && (
          <div className="mb-4 flex justify-center">
            <img
              src={`data:image/png;base64,${dados.qr_code_base64}`}
              alt="QR Code do PIX"
              className="h-52 w-52 rounded-lg bg-white p-2"
            />
          </div>
        )}

        {dados.pix_code && (
          <>
            <p className="mb-1.5 text-xs font-semibold text-gray-400">PIX copia e cola</p>
            <p className="mb-3 break-all rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-gray-300">
              {dados.pix_code}
            </p>
            <button
              onClick={copiar}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 font-bold text-white hover:from-green-500 hover:to-emerald-500"
            >
              {copiado ? <><Check className="h-5 w-5" /> Código copiado!</> : <><Copy className="h-5 w-5" /> Copiar código</>}
            </button>
          </>
        )}

        <p className="mt-4 text-center text-xs text-gray-500">
          Depois de pagar, a confirmação aparece aqui automaticamente.
        </p>
      </div>
    </div>
  );
}