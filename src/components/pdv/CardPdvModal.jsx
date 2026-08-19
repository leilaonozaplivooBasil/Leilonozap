import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { base44 } from '@/api/base44Client';
import { money } from '@/lib/format';
import { toast } from 'sonner';
import { Loader2, Copy, Check, CreditCard, X, ExternalLink } from 'lucide-react';

// 💳 Modal do CARTÃO no balcão: link/QR do Checkout Pro (página hospedada do Mercado
// Pago) + confirmação AUTOMÁTICA. Mesmo padrão do PixPdvModal — só troca o que identifica
// o pagamento: o PIX já nasce com payment_id, o cartão só ganha um quando o cliente paga,
// então o polling aqui pergunta pelo pedido (sale_id), não pelo pagamento.
export default function CardPdvModal({ cartao, total, onConfirmed, onCancel }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(null);
  const confirmedRef = useRef(false);

  useEffect(() => {
    QRCode.toDataURL(cartao.url, { width: 280, margin: 1, color: { dark: '#0b1a12', light: '#ffffff' } })
      .then(setQr)
      .catch(() => { /* sem QR, o link continua funcionando */ });
  }, [cartao.url]);

  const check = async () => {
    if (confirmedRef.current) return;
    try {
      const r = await base44.functions.invoke('checkPaymentStatus', { sale_id: cartao.sale_id });
      if (r?.status === 'confirmed' && !confirmedRef.current) {
        confirmedRef.current = true;
        onConfirmed();
      }
    } catch (_) { /* tenta de novo no próximo ciclo */ }
  };

  useEffect(() => {
    const iv = setInterval(check, 4000);
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    check();
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, []);

  const copy = () => {
    navigator.clipboard?.writeText(cartao.url || '');
    setCopied(true);
    toast.success('Link de pagamento copiado!');
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 text-nz-tinta max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black flex items-center gap-2"><CreditCard className="w-5 h-5" style={{ color: '#1B7A48' }} /> Cartão — {money(total)}</h3>
          <button onClick={onCancel} aria-label="Fechar" className="p-1.5 text-gray-400 hover:text-red-500"><X className="w-5 h-5" /></button>
        </div>

        {qr && (
          <div className="flex justify-center mb-3">
            <img src={qr} alt="QR do link de pagamento" className="w-56 h-56 rounded-lg border border-nz-borda" />
          </div>
        )}

        <p className="text-xs text-center text-nz-tinta-fraca mb-2">O cliente aponta a câmera do celular pro QR, ou abre o link e paga no cartão dele (crédito ou débito):</p>
        <div className="flex gap-2 mb-2">
          <input readOnly aria-label="Link de pagamento" value={cartao.url || ''} className="flex-1 bg-nz-cinza-fundo border border-nz-borda rounded-lg px-2 py-2 text-[11px] text-nz-tinta-fraca truncate" />
          <button type="button" aria-label="Copiar link de pagamento" onClick={copy} className="px-3 rounded-lg text-sm font-semibold text-white flex items-center gap-1" style={{ background: '#1B7A48' }}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <a href={cartao.url} target="_blank" rel="noopener noreferrer" className="w-full mb-4 py-2.5 rounded-xl border-2 border-nz-borda text-sm font-semibold flex items-center justify-center gap-2 hover:border-green-500 hover:text-green-700">
          <ExternalLink className="w-4 h-4" /> Abrir link de pagamento
        </a>

        <div className="flex items-center justify-center gap-2 text-sm font-semibold mb-3" style={{ color: '#1B7A48' }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Aguardando pagamento…
        </div>
        <p className="text-[11px] text-center text-nz-tinta-fraca mb-4">Quando o pagamento cair, o pedido confirma sozinho — estoque baixa e comissão entra automaticamente.</p>

        <button onClick={onCancel} className="w-full py-2.5 rounded-xl border border-nz-borda text-sm font-semibold text-nz-tinta-fraca hover:text-red-500 hover:border-red-300">
          Cancelar cobrança
        </button>
      </div>
    </div>
  );
}
