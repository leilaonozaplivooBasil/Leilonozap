import React, { useState } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { toast } from 'sonner';
import { X, QrCode, CreditCard, Loader2, Banknote } from 'lucide-react';

// 💵 Depósito do SALDO DE OPERAÇÃO — quem recebeu do cliente em dinheiro coloca
// esse valor aqui e usa como saldo para pagar os pedidos. Não é sacável: sai em
// mercadoria ou por transferência para alguém da rede.
const ATALHOS = [50, 100, 200, 500, 1000];

export default function DepositoOperacaoModal({ userId, onPix, onFechar }) {
  const [valor, setValor] = useState('');
  const [enviando, setEnviando] = useState(false);

  const numero = Number(String(valor).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;

  const depositar = async (forma) => {
    if (numero < 1) return toast.error('Valor mínimo: R$ 1,00');
    setEnviando(true);
    const r = await plataforma.functions.invoke('createOperationDeposit', {
      actorId: userId, amount: numero, payment_method: forma,
    });
    setEnviando(false);
    if (!r?.success) return toast.error(r?.error || 'Não foi possível abrir o depósito.');
    if (forma === 'card' && r.url) { window.location.href = r.url; return; }
    if (r.pix) onPix({ pix: r.pix, total: r.total });
  };

  return (
    <div className="fixed inset-0 z-[95] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-base font-black text-nz-tinta flex items-center gap-2"><Banknote className="w-4 h-4 text-nz-verde" /> Depositar saldo</h3>
          <button onClick={onFechar} aria-label="Fechar" className="w-9 h-9 -mr-2 -mt-1 flex items-center justify-center text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-[11px] text-gray-500 mb-4">Recebeu do cliente em dinheiro? Coloque o valor aqui e use como saldo para fechar seus pedidos.</p>

        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          inputMode="decimal"
          placeholder="Quanto quer depositar? Ex: 250,00"
          className="w-full bg-white border border-nz-borda rounded-xl px-3 py-3 text-sm outline-none focus:border-green-500"
        />
        <div className="grid grid-cols-5 gap-1.5 mt-2">
          {ATALHOS.map((v) => (
            <button key={v} onClick={() => setValor(String(v))} className="min-h-[44px] rounded-lg border border-nz-borda text-xs font-bold text-nz-tinta">{v}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={() => depositar('pix')} disabled={enviando} className="min-h-[48px] rounded-xl bg-nz-verde text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />} PIX
          </button>
          <button onClick={() => depositar('card')} disabled={enviando} className="min-h-[48px] rounded-xl border border-nz-borda bg-white text-nz-tinta font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
            <CreditCard className="w-4 h-4" /> Cartão
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-400 mt-3">Este saldo não é sacável: sai em mercadoria ou por transferência para alguém da rede.</p>
      </div>
    </div>
  );
}