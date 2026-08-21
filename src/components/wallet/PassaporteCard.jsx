import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Lock } from 'lucide-react';
import { plataforma } from '@/api/plataformaClient';
import { money } from '@/lib/format';

/**
 * Cartão do Cupom Passaporte na Carteira — SOMENTE LEITURA.
 * Consulta a function 'passaporteCoupon' (statusCupons) e mostra o crédito guardado.
 * Se o usuário não tem cupom, não renderiza nada.
 */
export default function PassaporteCard({ user }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      try {
        const r = await plataforma.functions.invoke('passaporteCoupon', { user_id: user.id });
        const data = r?.data || r;
        if (alive && data?.success) setStatus(data);
      } catch { /* sem cupom / offline: cartão simplesmente não aparece */ }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  if (!status) return null;

  if (status.liberado) {
    const { saldo, credito } = status.liberado;
    return (
      <div className="rounded-2xl border border-green-500/40 bg-green-600/10 p-5 shadow-lg shadow-black/10">
        <div className="flex items-start gap-3">
          <Ticket className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-green-400">Seu crédito Passaporte está liberado</h2>
            <p className="text-sm text-gray-300 mt-1">
              Crédito de {money(credito)} · disponível agora: <strong className="text-green-300">{money(saldo)}</strong>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Sem validade — o que sobrar continua guardado para a próxima compra. Vale só na Loja Virtual, não dá pra dar lance com ele.
            </p>
          </div>
        </div>
        <Link
          to="/Loja-Virtual"
          className="mt-4 flex items-center justify-center w-full min-h-[44px] rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors"
        >
          Usar na Loja Virtual
        </Link>
      </div>
    );
  }

  if (status.tem_bloqueado) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gray-800/40 backdrop-blur-xl p-5 shadow-lg shadow-black/10 flex items-start gap-3">
        <Lock className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h2 className="font-bold text-white">Crédito Passaporte de 10% — saldo potencializado</h2>
          <p className="text-sm text-gray-400 mt-1">
            Este crédito é à parte do seu saldo de lance — <strong className="text-gray-300">não pode ser usado pra dar lance em leilão</strong>.
          </p>
          <p className="text-xs text-gray-500 mt-1.5">
            Se você <strong>não ganhar</strong> o leilão que está disputando, ele libera pra usar na Loja Virtual assim que o leilão terminar.
            Se você <strong>ganhar</strong>, este crédito é cancelado automaticamente — o valor pago virou a sua compra.
          </p>
        </div>
      </div>
    );
  }

  return null;
}