import React, { useEffect, useState, useMemo } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { fmtBR } from '@/lib/money';
import { analiseFiscal } from '@/lib/simplesNacional';
import { TrendingUp, TrendingDown, Package, Percent, Receipt, AlertTriangle, ShoppingBag, Gavel, Wallet, Landmark } from 'lucide-react';

// 📊 REGRA OFICIAL DE COMISSÃO (docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md) —
// 30% = 20% cadeia telescópica + 10% topo institucional, sobre venda de
// Loja Virtual / PDV. Leilão (arremate) é regra DIFERENTE: 5% fixo pro
// indicador direto, sem cadeia nem pool de topo.
const PCT_COMISSAO_LOJA = 30;
const PCT_COMISSAO_LEILAO = 5;

const money = (n) => Number(n) || 0;

/** Mapa productId -> custo unitário médio (cost_price / (quantity + quantity_sold)). */
function buildCostMap(products) {
  const map = {};
  for (const p of products) {
    const totalUnidades = money(p.quantity) + money(p.quantity_sold);
    map[p.id] = totalUnidades > 0 ? money(p.cost_price) / totalUnidades : money(p.cost_price);
  }
  return map;
}

/** Custo total (COGS) de UMA venda — item único (product_id) ou múltiplos (items_json). */
function custoDaVenda(sale, costMap) {
  if (Array.isArray(sale.items_json) && sale.items_json.length > 0) {
    return sale.items_json.reduce((sum, item) => {
      const unit = costMap[item.product_id] ?? 0;
      return sum + unit * (money(item.qty) || 1);
    }, 0);
  }
  if (sale.product_id) {
    const unit = costMap[sale.product_id] ?? 0;
    return unit * (money(sale.quantity) || 1);
  }
  return 0;
}

export default function PainelLucroDiario({
  purchasesToday = [],
  arrematesToday = [],
  depositsToday = [],
  depositsOperacaoToday = [],
  purchasesUltimos12Meses = [],
}) {
  const [costMap, setCostMap] = useState({});
  const [loadingCosts, setLoadingCosts] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const products = await plataforma.entities.Product.list('-created_date', 3000);
        if (vivo) setCostMap(buildCostMap(Array.isArray(products) ? products : []));
      } catch (e) {
        console.debug('Erro ao carregar custo de produtos:', e?.message);
      } finally {
        if (vivo) setLoadingCosts(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  const numero = useMemo(() => {
    const faturamentoLoja = purchasesToday.reduce((s, v) => s + money(v.total_amount), 0);
    const faturamentoLeilao = arrematesToday.reduce((s, v) => s + money(v.total_amount), 0);
    const faturamentoBruto = faturamentoLoja + faturamentoLeilao;

    const custoLoja = purchasesToday.reduce((s, v) => s + custoDaVenda(v, costMap), 0);
    const custoLeilao = arrematesToday.reduce((s, v) => s + custoDaVenda(v, costMap), 0);
    const custoProdutos = custoLoja + custoLeilao;

    // 🏷️ prioriza a comissão REAL já gravada na venda (commission_total,
    // gravada pelo próprio motor de venda) — cai pro percentual oficial só
    // quando a linha não tem esse valor (vendas mais antigas).
    const comissaoLoja = purchasesToday.reduce((s, v) => {
      if (typeof v.commission_total === 'number') return s + v.commission_total;
      return s + money(v.total_amount) * (PCT_COMISSAO_LOJA / 100);
    }, 0);
    const comissaoLeilao = faturamentoLeilao * (PCT_COMISSAO_LEILAO / 100);
    const comissaoTotal = comissaoLoja + comissaoLeilao;

    // 📈 RBT12 estimado pelas vendas reais dos últimos 12 meses — alimenta a
    // alíquota efetiva certa pra faixa atual do Simples (Anexo I), com aviso
    // de proximidade da próxima faixa conforme a operação cresce.
    const rbt12 = purchasesUltimos12Meses.reduce((s, v) => s + money(v.total_amount), 0);
    const fiscal = analiseFiscal(rbt12);
    const imposto = faturamentoBruto * (fiscal.aliquotaEfetiva / 100);

    const lucroLiquido = faturamentoBruto - custoProdutos - comissaoTotal - imposto;
    const margemPct = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;

    const depositoCarteiraHoje = depositsToday.reduce((s, v) => s + money(v.total_amount), 0);
    const depositoOperacaoHoje = depositsOperacaoToday.reduce((s, v) => s + money(v.total_amount), 0);

    return {
      faturamentoBruto, faturamentoLoja, faturamentoLeilao,
      custoProdutos, comissaoTotal, imposto, lucroLiquido, margemPct,
      depositoCarteiraHoje, depositoOperacaoHoje,
      vendasCount: purchasesToday.length + arrematesToday.length,
      fiscal,
    };
  }, [purchasesToday, arrematesToday, depositsToday, depositsOperacaoToday, purchasesUltimos12Meses, costMap]);

  const fmtPct = (n) => (Number.isFinite(n) ? n.toFixed(1).replace('.', ',') : '0,0');
  const positivo = numero.lucroLiquido >= 0;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-900/10 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {positivo ? <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />}
          <span className="text-[13px] font-semibold text-amber-300">Lucro Líquido — HOJE, em tempo real</span>
        </div>
        {loadingCosts && <span className="text-[10.5px] text-gray-500">carregando custo dos produtos…</span>}
      </div>

      {/* Cascata: faturamento → custo → comissão → imposto → lucro */}
      <div className="grid gap-2 sm:grid-cols-5">
        <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5"><ShoppingBag className="w-3 h-3" /> Faturamento bruto</div>
          <div className="text-lg font-bold text-white">R$ {fmtBR(numero.faturamentoBruto)}</div>
          <div className="text-[10px] text-gray-500">{numero.vendasCount} venda{numero.vendasCount === 1 ? '' : 's'} hoje</div>
        </div>
        <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5"><Package className="w-3 h-3" /> Custo do produto</div>
          <div className="text-lg font-bold text-red-300">− R$ {fmtBR(numero.custoProdutos)}</div>
          <div className="text-[10px] text-gray-500">custo médio do estoque</div>
        </div>
        <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5"><Percent className="w-3 h-3" /> Comissão da rede</div>
          <div className="text-lg font-bold text-red-300">− R$ {fmtBR(numero.comissaoTotal)}</div>
          <div className="text-[10px] text-gray-500">30% loja/PDV · 5% leilão</div>
        </div>
        <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5"><Receipt className="w-3 h-3" /> Imposto (Simples)</div>
          <div className="text-lg font-bold text-red-300">− R$ {fmtBR(numero.imposto)}</div>
          <div className="text-[10px] text-gray-500">{fmtPct(numero.fiscal.aliquotaEfetiva)}% · Faixa {numero.fiscal.faixaAtual ? `até R$ ${fmtBR(numero.fiscal.faixaAtual.max)}` : '—'}</div>
        </div>
        <div className={`rounded-lg border px-3 py-2 ${positivo ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-red-500/10 border-red-500/40'}`}>
          <div className="text-[11px] text-gray-300">Lucro líquido</div>
          <div className={`text-lg font-bold ${positivo ? 'text-emerald-400' : 'text-red-400'}`}>R$ {fmtBR(numero.lucroLiquido)}</div>
          <div className="text-[10px] text-gray-400">margem {fmtPct(numero.margemPct)}%</div>
        </div>
      </div>

      {/* Alerta de faixa do Simples — cresce, avisa antes de mudar de alíquota */}
      {numero.fiscal.pertoDaProximaFaixa && numero.fiscal.proximaFaixa && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11.5px] text-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            A operação está perto de mudar de faixa do Simples: faltam <strong>R$ {fmtBR(numero.fiscal.faltamParaProximaFaixa)}</strong> em
            faturamento dos últimos 12 meses pra alíquota efetiva subir de {fmtPct(numero.fiscal.aliquotaEfetiva)}% pra {fmtPct(numero.fiscal.aliquotaEfetivaProximaFaixa)}%.
          </span>
        </div>
      )}

      {/* Volume do dia — separado por origem, nunca somado (propósitos diferentes) */}
      <div>
        <div className="text-[10.5px] uppercase tracking-wide text-gray-500 mb-1.5">Volume de hoje, por origem</div>
        <div className="grid gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
            <div className="text-[11px] text-gray-400 flex items-center gap-1.5"><ShoppingBag className="w-3 h-3" /> Loja Virtual / PDV</div>
            <div className="text-base font-bold text-white">R$ {fmtBR(numero.faturamentoLoja)}</div>
          </div>
          <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
            <div className="text-[11px] text-gray-400 flex items-center gap-1.5"><Gavel className="w-3 h-3" /> Leilão (arremates)</div>
            <div className="text-base font-bold text-white">R$ {fmtBR(numero.faturamentoLeilao)}</div>
          </div>
          <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
            <div className="text-[11px] text-gray-400 flex items-center gap-1.5"><Wallet className="w-3 h-3" /> Depósito Carteira Digital</div>
            <div className="text-base font-bold text-white">R$ {fmtBR(numero.depositoCarteiraHoje)}</div>
          </div>
          <div className="rounded-lg bg-gray-800/60 border border-gray-700/70 px-3 py-2">
            <div className="text-[11px] text-gray-400 flex items-center gap-1.5"><Landmark className="w-3 h-3" /> Depósito Saldo Operação</div>
            <div className="text-base font-bold text-white">R$ {fmtBR(numero.depositoOperacaoHoje)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
