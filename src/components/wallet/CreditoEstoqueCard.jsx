import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Package, Lock } from 'lucide-react';

const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// 📦 CRÉDITO DE ESTOQUE — o valor que o lojista pagou pela mercadoria que está com ele.
// Fica TRAVADO (não saca, não compra) e vai caindo no saldo livre conforme ele vende.
export default function CreditoEstoqueCard({ user }) {
  const [credito, setCredito] = useState(0);
  const [liberado, setLiberado] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: u } = await supabase.from('app_users').select('credito_estoque').eq('id', user.id).maybeSingle();
      setCredito(Number(u?.credito_estoque) || 0);
      const { data: p } = await supabase.from('store_payouts').select('custo').eq('owner_id', user.id);
      setLiberado((p || []).reduce((s, x) => s + (Number(x.custo) || 0), 0));
    })();
  }, [user?.id]);

  if (credito <= 0 && liberado <= 0) return null;

  return (
    <div className="rounded-2xl border border-nz-borda bg-white p-5 shadow-sm">
      <h2 className="font-bold flex items-center gap-2 mb-3">
        <Package className="w-5 h-5 text-nz-fogo" /> Crédito de Estoque
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-nz-fogo/30 bg-nz-fogo-fundo p-3">
          <div className="text-[11px] uppercase text-nz-tinta-fraca flex items-center gap-1"><Lock className="w-3 h-3" /> Travado no estoque</div>
          <div className="text-xl font-black text-nz-fogo-escuro">{money(credito)}</div>
        </div>
        <div className="rounded-xl border border-nz-borda bg-nz-cinza-fundo p-3">
          <div className="text-[11px] uppercase text-nz-tinta-fraca">Já liberado em vendas</div>
          <div className="text-xl font-black text-nz-verde">{money(liberado)}</div>
        </div>
      </div>
      <p className="text-[11px] text-nz-tinta-fraca mt-2">
        Esse valor é o lastro da mercadoria que está com você. A cada venda, a parte da peça vendida cai no seu saldo livre, junto com o seu lucro.
      </p>
    </div>
  );
}