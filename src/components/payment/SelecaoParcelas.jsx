import React, { useEffect, useState } from 'react';
import { MAX_PARCELAS } from '@/lib/parcelamento';
import { Loader2 } from 'lucide-react';

// 💳 Seleção de parcelas REAL — consulta o Mercado Pago com o BIN do cartão digitado e o
// valor da compra, e mostra "3x de R$ 34,50". Antes existia um <select> fixo de 1x a 12x
// sem valor nenhum, travado em 1x: o cliente passava batido e era cobrado à vista.
// NÃO calcula nem altera valor cobrado — quem cobra é o backend; aqui só exibe/escolhe.
const brl = (n) =>
  'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SelecaoParcelas({ mpInstance, cardNumber, amount, value, onChange }) {
  const [opcoes, setOpcoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const bin = String(cardNumber || '').replace(/\D/g, '').slice(0, 6);

  useEffect(() => {
    if (!mpInstance || bin.length < 6 || !(Number(amount) > 0)) { setOpcoes([]); return; }
    let cancel = false;
    setCarregando(true);
    mpInstance
      .getInstallments({ amount: String(amount), bin, paymentTypeId: 'credit_card' })
      .then((res) => {
        if (cancel) return;
        const lista = res?.[0]?.payer_costs || [];
        setOpcoes(
          lista
            .filter((o) => o.installments <= MAX_PARCELAS)
            .map((o) => ({
              n: o.installments,
              parcela: o.installment_amount,
              total: o.total_amount,
              semJuros: Number(o.installment_rate) === 0,
            }))
        );
      })
      .catch(() => { if (!cancel) setOpcoes([]); })
      .finally(() => { if (!cancel) setCarregando(false); });
    return () => { cancel = true; };
  }, [mpInstance, bin, amount]);

  const escolhida = opcoes.find((o) => o.n === Number(value));

  return (
    <div>
      <label className="block text-sm font-medium text-white mb-2">Parcelas</label>

      {carregando && (
        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          Buscando parcelas disponíveis para este cartão...
        </p>
      )}

      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-12 bg-gray-800/50 border border-gray-700 rounded-md text-white px-3"
      >
        {opcoes.length > 0
          ? opcoes.map((o) => (
              <option key={o.n} value={o.n}>
                {o.n === 1
                  ? `À vista — ${brl(o.parcela)}`
                  : `${o.n}x de ${brl(o.parcela)}${o.semJuros ? ' sem juros' : ''} — total ${brl(o.total)}`}
              </option>
            ))
          : Array.from({ length: MAX_PARCELAS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x`}</option>
            ))}
      </select>

      {opcoes.length === 0 && !carregando && (
        <p className="text-[11px] text-gray-400 mt-1.5">
          Digite o número do cartão para ver o valor exato de cada parcela.
        </p>
      )}
      {escolhida && escolhida.n > 1 && (
        <p className="text-[11px] text-gray-300 mt-1.5">
          Você pagará <strong className="text-white">{escolhida.n}x de {brl(escolhida.parcela)}</strong>
          {escolhida.semJuros ? ' (sem juros)' : ''} — total {brl(escolhida.total)}.
        </p>
      )}
    </div>
  );
}