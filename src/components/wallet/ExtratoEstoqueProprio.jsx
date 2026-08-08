import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Store } from 'lucide-react';

const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dia = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');

// 🧾 VENDAS DO MEU ESTOQUE — cada peça vendida, com o custo devolvido e o lucro separados.
export default function ExtratoEstoqueProprio({ user }) {
  const [linhas, setLinhas] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('store_payouts')
        .select('id,product_title,quantity,custo,comissao,margem,divida_abatida,total_creditado,status,created_at,origem')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      setLinhas(data || []);
    })();
  }, [user?.id]);

  if (!linhas.length) return null;

  return (
    <div className="rounded-2xl border border-nz-borda bg-white p-5 shadow-sm">
      <h2 className="font-bold flex items-center gap-2 mb-3"><Store className="w-5 h-5 text-nz-verde" /> Vendas do meu estoque</h2>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {linhas.map((l) => (
          <div key={l.id} className="border-b border-nz-borda pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{l.product_title || 'Produto'}</div>
                <div className="text-[11px] text-nz-tinta-fraca">
                  {dia(l.created_at)} · {l.quantity}x · {l.origem === 'consignado' ? 'consignado' : 'comprado'}
                  {l.status === 'pending' && <span className="text-red-500 font-semibold"> · crédito pendente</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-black text-nz-verde">+ {money(l.total_creditado)}</div>
                <div className="text-[11px] text-nz-tinta-fraca">
                  custo {money(l.custo)} · lucro {money(l.margem)}
                  {Number(l.divida_abatida) > 0 && <> · dívida {money(l.divida_abatida)}</>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}