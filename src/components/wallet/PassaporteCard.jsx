import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
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
        const r = await base44.functions.invoke('passaporteCoupon', { user_id: user.id });
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
              Sem validade — o que sobrar continua guardado para a próxima compra.
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
          <h2 className="font-bold text-white">Seu crédito Passaporte de 10% está guardado</h2>
          <p className="text-sm text-gray-400 mt-1">
            Libera quando você disputar um leilão e for superado. Depois disso, dá para usar na Loja Virtual.
          </p>
        </div>
      </div>
    );
  }

  return null;
}