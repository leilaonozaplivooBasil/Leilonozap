import React, { useEffect, useRef, useState } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { money } from '@/lib/format';
import { toast } from 'sonner';
import { Loader2, Copy, Check, QrCode, X } from 'lucide-react';

// 💳 Modal do PIX no balcão: QR Code + copia-e-cola + confirmação AUTOMÁTICA.
// Polling a cada 4s + checagem imediata quando o operador volta pra aba (celular
// pausa timers em background — regra multi-dispositivo do projeto).
export default function PixPdvModal({ pix, total, onConfirmed, onCancel }) {
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30 * 60); // 30 min de validade no balcão
  const confirmedRef = useRef(false);

  const check = async () => {
    if (confirmedRef.current) return;
    try {
      const r = await plataforma.functions.invoke('checkPaymentStatus', { payment_id: pix.payment_id });
      if (r?.status === 'confirmed' && !confirmedRef.current) {
        confirmedRef.current = true;
        onConfirmed();
      }
    } catch (_) { /* tenta de novo no próximo ciclo */ }
  };

  useEffect(() => {
    const iv = setInterval(check, 4000);
    const tick = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    check();
    return () => {
      clearInterval(iv); clearInterval(tick);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, []);

  const copy = () => {
    navigator.clipboard?.writeText(pix.pix_code || '');
    setCopied(true);
    toast.success('Código PIX copiado!');
    setTimeout(() => setCopied(false), 1800);
  };

  const expired = secondsLeft <= 0;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 text-nz-tinta max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black flex items-center gap-2"><QrCode className="w-5 h-5" style={{ color: '#1B7A48' }} /> PIX — {money(total)}</h3>
          <button onClick={onCancel} aria-label="Fechar" className="p-1.5 text-gray-400 hover:text-red-500"><X className="w-5 h-5" /></button>
        </div>

        {pix.qr_code_base64 && (
          <div className="flex justify-center mb-3">
            <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code PIX" className="w-56 h-56 rounded-lg border border-nz-borda" />
          </div>
        )}

        <p className="text-xs text-center text-nz-tinta-fraca mb-2">O cliente aponta a câmera do celular ou usa o copia-e-cola:</p>
        <div className="flex gap-2 mb-4">
          <input readOnly value={pix.pix_code || ''} className="flex-1 bg-nz-cinza-fundo border border-nz-borda rounded-lg px-2 py-2 text-[11px] text-nz-tinta-fraca truncate" />
          <button onClick={copy} className="px-3 rounded-lg text-sm font-semibold text-white flex items-center gap-1" style={{ background: '#1B7A48' }}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {expired ? (
          <div className="rounded-lg p-3 text-center text-sm font-semibold mb-3" style={{ background: '#FFF1E3', color: '#C42A05' }}>
            Tempo esgotado. Cancele e gere um novo PIX se o cliente ainda quiser pagar.
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm font-semibold mb-3" style={{ color: '#1B7A48' }}>
            <Loader2 className="w-4 h-4 animate-spin" /> Aguardando pagamento… <span className="text-nz-tinta-fraca font-normal">expira em {mm}:{ss}</span>
          </div>
        )}
        <p className="text-[11px] text-center text-nz-tinta-fraca mb-4">Quando o dinheiro cair, o pedido confirma sozinho — estoque baixa e comissão entra automaticamente.</p>

        <button onClick={onCancel} className="w-full py-2.5 rounded-xl border border-nz-borda text-sm font-semibold text-nz-tinta-fraca hover:text-red-500 hover:border-red-300">
          Cancelar cobrança
        </button>
      </div>
    </div>
  );
}