import React from 'react';
import { money } from '@/lib/format';
import { CheckCircle2, MessageCircle, X } from 'lucide-react';

const PAY_LABEL = { saldo: 'Saldo', dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão' };
const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

// 🧾 Nota de pedido do PDV: resumo da compra pro cliente, com envio em tempo real
// pelo WhatsApp (usa o número informado no pedido; sem número, abre o WhatsApp
// pra escolher o contato).
export default function NotaPedido({ nota, onClose }) {
  const { items = [], total = 0, customer = {}, payment, vendedor, saleId = '', storeName = 'Leilão NoZap' } = nota || {};
  const codigo = String(saleId).slice(0, 8).toUpperCase();

  const linhas = items.map((i) => `• ${i.description} — ${i.qty}x ${money(i.unit)} = ${money(i.qty * i.unit)}`).join('\n');
  const texto = [
    `🧾 *Nota de Pedido — ${storeName}*`,
    `Pedido: ${codigo}`,
    `Data: ${new Date().toLocaleString('pt-BR')}`,
    '',
    linhas,
    '',
    `*Total: ${money(total)}*`,
    `Pagamento: ${PAY_LABEL[payment] || payment || '—'}`,
    customer.name ? `Cliente: ${customer.name}` : null,
    vendedor ? `Vendedor: ${vendedor}` : null,
    '',
    'Obrigado pela preferência! 💚',
  ].filter((l) => l !== null).join('\n');

  const digits = onlyDigits(customer.phone);
  const phone = digits ? (digits.length > 11 ? digits : `55${digits}`) : '';
  const waHref = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(texto)}`
    : `https://wa.me/?text=${encodeURIComponent(texto)}`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 text-nz-tinta max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="text-center mb-4">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-2" style={{ color: '#1B7A48' }} />
          <h3 className="font-black text-lg">Pedido fechado!</h3>
          <p className="text-xs text-nz-tinta-fraca">Nota {codigo} · {PAY_LABEL[payment] || payment}</p>
        </div>

        <div className="bg-nz-cinza-fundo border border-nz-borda rounded-xl p-3 mb-3 space-y-1.5">
          {items.map((i, idx) => (
            <div key={idx} className="flex items-start justify-between gap-2 text-sm">
              <span className="flex-1 min-w-0 truncate">{i.description} <span className="text-nz-tinta-fraca">×{i.qty}</span></span>
              <span className="font-semibold shrink-0">{money(i.qty * i.unit)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-nz-borda pt-2 mt-1">
            <span className="text-sm font-bold">Total</span>
            <span className="text-lg font-black" style={{ color: '#1B7A48' }}>{money(total)}</span>
          </div>
        </div>

        {customer.name && <p className="text-xs text-nz-tinta-fraca mb-3">Cliente: <strong className="text-nz-tinta">{customer.name}</strong>{customer.phone ? ` · ${customer.phone}` : ''}</p>}

        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="w-full py-3 rounded-xl font-black text-white flex items-center justify-center gap-2 mb-2"
          style={{ background: '#1B7A48' }}
        >
          <MessageCircle className="w-4 h-4" /> Enviar nota no WhatsApp
        </a>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-nz-borda text-sm font-semibold text-nz-tinta-fraca flex items-center justify-center gap-1.5">
          <X className="w-4 h-4" /> Fechar
        </button>
      </div>
    </div>
  );
}