import React from 'react';
import { money } from '@/lib/format';
import { Trash2, Minus, Plus, Loader2, Truck, Store, Wallet, QrCode, CreditCard } from 'lucide-react';

// Resumo do pedido de reposição: itens, desconto da licença, frete e pagamento.
// O servidor recalcula tudo antes de cobrar — aqui é só a vitrine da conta.
export default function ResumoReposicao({
  itens, descontoPct, licencaNome, onQtd, onRemover,
  entrega, onEntrega, cep, onCep, opcoesFrete, freteId, onFreteId, cotando, onCotar,
  saldo, enviando, onPagar,
}) {
  const bruto = itens.reduce((s, i) => s + (Number(i.preco) || 0) * i.qtd, 0);
  const desconto = bruto * (Number(descontoPct) || 0) / 100;
  const liquido = bruto - desconto;
  const freteSel = opcoesFrete.find((o) => String(o.id) === String(freteId));
  const frete = entrega === 'delivery' ? (Number(freteSel?.preco) || 0) : 0;
  const total = liquido + frete;
  const podePagar = itens.length > 0 && !enviando && (entrega === 'pickup' || !!freteId);

  return (
    <div className="bg-white border border-nz-borda rounded-2xl p-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-nz-tinta mb-1">Meu pedido</h2>
      <p className="text-[11px] text-gray-500 mb-3">Desconto de <b className="text-nz-verde">{descontoPct}%</b> pela sua licença {licencaNome ? `(${licencaNome})` : ''}.</p>

      {itens.length === 0 ? (
        <div className="border border-dashed border-nz-borda rounded-xl p-6 text-center text-gray-500 text-sm">Nenhum item ainda. Escolha os produtos ao lado.</div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {itens.map((i) => (
            <div key={i.id} className="flex items-center gap-2 border-b border-nz-borda pb-2 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-nz-tinta truncate">{i.descricao}</p>
                <p className="text-[11px] text-gray-500">{money((Number(i.preco) || 0) * (1 - (Number(descontoPct) || 0) / 100))} cada</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onQtd(i, i.qtd - 1)} className="w-9 h-9 rounded bg-nz-cinza-fundo flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                <span className="w-7 text-center text-sm font-bold">{i.qtd}</span>
                <button onClick={() => onQtd(i, i.qtd + 1)} className="w-9 h-9 rounded bg-nz-cinza-fundo flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                <button onClick={() => onRemover(i)} className="w-9 h-9 rounded flex items-center justify-center text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* entrega — o frete da remessa é por conta do lojista */}
      <div className="mt-4">
        <p className="text-[11px] font-bold uppercase text-gray-500 mb-1.5">Como quer receber</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onEntrega('pickup')} className={`min-h-[44px] rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${entrega === 'pickup' ? 'bg-nz-verde text-white border-nz-verde' : 'bg-white text-nz-tinta border-nz-borda'}`}><Store className="w-4 h-4" /> Retirar no depósito</button>
          <button onClick={() => onEntrega('delivery')} className={`min-h-[44px] rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${entrega === 'delivery' ? 'bg-nz-verde text-white border-nz-verde' : 'bg-white text-nz-tinta border-nz-borda'}`}><Truck className="w-4 h-4" /> Receber na loja</button>
        </div>
        {entrega === 'delivery' && (
          <div className="mt-2">
            <div className="flex gap-2">
              <input value={cep} onChange={(e) => onCep(e.target.value)} inputMode="numeric" placeholder="CEP da sua loja" className="flex-1 min-w-0 bg-white border border-nz-borda rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
              <button onClick={onCotar} disabled={cotando} className="min-h-[44px] px-3 rounded-lg bg-nz-cinza-fundo text-xs font-bold text-nz-tinta">{cotando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Calcular'}</button>
            </div>
            {opcoesFrete.length > 0 && (
              <div className="mt-2 space-y-1">
                {opcoesFrete.map((o) => (
                  <button key={o.id} onClick={() => onFreteId(o.id)} className={`w-full min-h-[44px] px-3 rounded-lg border text-left text-xs flex items-center justify-between gap-2 ${String(freteId) === String(o.id) ? 'border-nz-verde bg-green-500/10' : 'border-nz-borda bg-white'}`}>
                    <span className="truncate">{o.empresa} {o.nome}{o.prazo ? ` · ${o.prazo} dias` : ''}</span>
                    <span className="font-bold text-nz-verde shrink-0">{money(o.preco)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* conta */}
      <div className="mt-4 border-t border-nz-borda pt-3 space-y-1 text-sm">
        <div className="flex justify-between text-gray-500"><span>Preço de venda</span><span>{money(bruto)}</span></div>
        <div className="flex justify-between text-nz-verde"><span>Seu desconto ({descontoPct}%)</span><span>− {money(desconto)}</span></div>
        <div className="flex justify-between text-gray-500"><span>Frete</span><span>{entrega === 'pickup' ? 'Retirada' : money(frete)}</span></div>
        <div className="flex justify-between text-lg font-black text-nz-tinta pt-1"><span>Total</span><span>{money(total)}</span></div>
      </div>

      {/* pagamento */}
      <div className="mt-4 space-y-2">
        <button onClick={() => onPagar('saldo')} disabled={!podePagar} className="w-full min-h-[48px] rounded-xl bg-nz-verde text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />} Pagar com saldo de comissão
        </button>
        <p className="text-[11px] text-center text-gray-500">Seu saldo de comissão: <b>{money(saldo)}</b></p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onPagar('pix')} disabled={!podePagar} className="min-h-[48px] rounded-xl border border-nz-borda bg-white text-nz-tinta font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"><QrCode className="w-4 h-4" /> PIX</button>
          <button onClick={() => onPagar('card')} disabled={!podePagar} className="min-h-[48px] rounded-xl border border-nz-borda bg-white text-nz-tinta font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"><CreditCard className="w-4 h-4" /> Cartão</button>
        </div>
        <p className="text-[10px] text-center text-gray-400">A mercadoria entra no seu estoque assim que o pagamento é confirmado.</p>
      </div>
    </div>
  );
}