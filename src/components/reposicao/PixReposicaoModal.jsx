import React, { useState, useEffect, useCallback, useRef } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { money } from '@/lib/format';
import { toast } from 'sonner';
import { Loader2, Copy, X, CheckCircle2 } from 'lucide-react';

// PIX do pedido de reposição. A checagem do pagamento não depende só do relógio:
// no celular o cronômetro congela em segundo plano, então também conferimos toda
// vez que o app volta pra frente (visibilitychange/focus).
// `mensagem` troca só o texto de espera: o mesmo modal serve pro pedido de
// mercadoria e pro depósito de saldo (onde falar em "estoque" seria mentira).
export default function PixReposicaoModal({ pix, total, onConfirmado, onFechar, mensagem }) {
  const [conferindo, setConferindo] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const pronto = useRef(false);

  const conferir = useCallback(async () => {
    if (pronto.current || !pix?.payment_id) return;
    setConferindo(true);
    try {
      const r = await plataforma.functions.invoke('checkPaymentStatus', { payment_id: pix.payment_id });
      if (r?.status === 'confirmed') {
        pronto.current = true;
        toast.success('Pagamento confirmado!');
        onConfirmado?.();
      }
    } catch (_) { /* segue tentando */ }
    setConferindo(false);
  }, [pix, onConfirmado]);

  useEffect(() => {
    const t = setInterval(conferir, 5000);
    const aoVoltar = () => { if (document.visibilityState === 'visible') conferir(); };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', conferir);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', conferir);
    };
  }, [conferir]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(pix.pix_code || '');
      setCopiado(true); toast.success('Código PIX copiado');
      setTimeout(() => setCopiado(false), 2500);
    } catch { toast.error('Não foi possível copiar. Segure o código para copiar.'); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-nz-tinta">Pague {money(total)} no PIX</h3>
          <button onClick={onFechar} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-nz-tinta"><X className="w-5 h-5" /></button>
        </div>

        {pix?.qr_code_base64 && (
          <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code PIX" className="w-48 h-48 mx-auto rounded-lg border border-nz-borda" />
        )}

        <button onClick={copiar} className="w-full mt-3 min-h-[48px] rounded-xl bg-nz-verde text-white font-bold text-sm flex items-center justify-center gap-2">
          {copiado ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiado ? 'Copiado!' : 'Copiar código PIX'}
        </button>

        <p className="text-[11px] text-gray-500 text-center mt-3 flex items-center justify-center gap-1.5">
          {conferindo ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          {mensagem || 'Assim que o pagamento cair, a mercadoria entra no seu estoque automaticamente.'}
        </p>
        <button onClick={conferir} className="w-full mt-2 min-h-[44px] text-xs font-bold text-nz-verde">Já paguei — conferir agora</button>
      </div>
    </div>
  );
}