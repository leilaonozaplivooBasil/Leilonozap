import React, { useCallback, useEffect, useState } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { isPaga, isDinheiroReal, isPosMarco } from '@/lib/dinheiroReal';
import PainelLucroDiario from '@/components/network/PainelLucroDiario';
import { Loader2 } from 'lucide-react';

// 💹 ABA "LUCRO DO DIA" DO SETOR FINANCEIRO — DIR-190 (30/09/2026)
// Dono: "tira a parte do lucro dali e insere num local melhor pra eu ver — pode
// colocar dentro do setor financeiro em alguma aba". O painel de lucro líquido
// do dia saiu da Visão Geral (Sistema de Alavancagem) e vive aqui. A regra de
// "dinheiro real" é a mesma de sempre (src/lib/dinheiroReal.js).

const ehHoje = (dataStr) => {
  const d = new Date(dataStr); const h = new Date();
  return d.getFullYear() === h.getFullYear() && d.getMonth() === h.getMonth() && d.getDate() === h.getDate();
};

export default function LucroDoDiaTab() {
  const [dados, setDados] = useState(null);
  const carregar = useCallback(async () => {
    try {
      const sales = await plataforma.entities.CatalogSale.listAll('-created_date');
      const list = Array.isArray(sales) ? sales : [];
      const real = (s) => isPaga(s) && isDinheiroReal(s) && isPosMarco(s);
      const purchases = list.filter((s) => (s.kind === 'loja' || s.kind === 'produto') && real(s));
      const umAno = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      setDados({
        purchasesToday: purchases.filter((s) => ehHoje(s.created_date)),
        arrematesToday: list.filter((s) => s.kind === 'arremate' && real(s) && ehHoje(s.created_date)),
        depositsToday: list.filter((s) => s.kind === 'wallet_deposit' && real(s) && ehHoje(s.created_date)),
        depositsOperacaoToday: list.filter((s) => s.kind === 'operacao_deposit' && real(s) && ehHoje(s.created_date)),
        purchasesUltimos12Meses: purchases.filter((s) => new Date(s.created_date) >= umAno),
      });
    } catch (e) {
      console.debug('Erro ao calcular lucro do dia:', e?.message);
      setDados({});
    }
  }, []);
  useEffect(() => { carregar(); const t = setInterval(carregar, 60000); return () => clearInterval(t); }, [carregar]);

  if (!dados) return <div className="grid place-items-center py-16 text-gray-400"><Loader2 className="w-7 h-7 animate-spin text-emerald-400" /></div>;
  return (
    <div data-teste="aba-lucro-do-dia">
      <PainelLucroDiario
        purchasesToday={dados.purchasesToday || []}
        arrematesToday={dados.arrematesToday || []}
        depositsToday={dados.depositsToday || []}
        depositsOperacaoToday={dados.depositsOperacaoToday || []}
        purchasesUltimos12Meses={dados.purchasesUltimos12Meses || []}
      />
    </div>
  );
}
