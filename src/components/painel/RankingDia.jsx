import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Trophy, Crown, Package, TrendingUp, Flame, PartyPopper, Target } from 'lucide-react';

const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CARGO = { distribuidor: 'Distribuidor', loja_fisica: 'Loja Física', ponto_retirada: 'Ponto', parceiro: 'Parceiro', licenciado: 'Licenciado', licenciado_catalogo: 'Lic. Catálogo', licenciado_aplicativo: 'Lic. App', vendedor: 'Vendedor', influenciador: 'Influenciador', plano_lider: 'Líder', trainee: 'Trainee', usuario: 'Usuário' };
const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`);

// 🏆 Ranking do dia + mensagem de parabéns (meta batida) ou motivação (o que falta).
export default function RankingDia({ userId, refreshKey }) {
  const [r, setR] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    supabase.rpc('ranking_dia', { _owner: userId })
      .then(({ data }) => { if (alive) setR(data || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [userId, refreshKey]);

  if (!r) return null;
  const vendedores = r.vendedor_campeao || [];
  const produtos = r.produto_campeao || [];
  const temMeta = r.meta != null;
  const pct = temMeta && r.meta > 0 ? Math.min(100, Math.round((Number(r.vendido) / Number(r.meta)) * 100)) : 0;
  const campeaoProduto = produtos[0]?.produto;

  return (
    <div className="mb-8">
      {/* mensagem motivacional / parabéns */}
      {temMeta && (
        r.atingida ? (
          <div className="rounded-2xl p-5 mb-4 border border-yellow-400/50 bg-gradient-to-r from-yellow-500/20 via-amber-500/15 to-green-500/15 flex items-center gap-4">
            <PartyPopper className="w-9 h-9 text-yellow-300 shrink-0" />
            <div>
              <div className="text-lg font-black text-yellow-200">🎉 META BATIDA! Mandou bem demais!</div>
              <div className="text-sm text-gray-200">{money(r.vendido)} hoje · meta de {money(r.meta)} alcançada. Agora é passar por cima — bora pro recorde! 🚀</div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-5 mb-4 border border-orange-500/30 bg-gradient-to-r from-orange-900/30 to-amber-800/10">
            <div className="flex items-center gap-2 text-orange-300 font-bold mb-1"><Flame className="w-5 h-5" /> Falta pouco — bora bater a meta!</div>
            <div className="text-sm text-gray-200">
              Faltam <strong className="text-orange-300">{money(r.falta)}</strong> ({100 - pct}% restante) pra fechar os {money(r.meta)} de hoje.
              {campeaoProduto ? <> O que mais sai hoje é <strong className="text-white">“{campeaoProduto.slice(0, 38)}”</strong> — empurra esse que a meta cai! 💪</> : <> Cada pedido conta — fecha mais um! 💪</>}
            </div>
          </div>
        )
      )}

      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-yellow-400" />
        <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">Ranking de hoje</h3>
        <span className="text-[11px] text-gray-500">· {money(r.rede_total)} em {r.rede_pedidos || 0} pedido(s) na rede</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* VENDEDOR CAMPEÃO */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3 text-emerald-300 font-bold"><Crown className="w-4 h-4" /> Vendedor campeão</div>
          {vendedores.length === 0 ? <p className="text-sm text-gray-500 py-4 text-center">Sem vendas hoje ainda. Bora começar! 🚀</p> : (
            <div className="space-y-1.5">
              {vendedores.slice(0, 5).map((v, i) => (
                <div key={v.id || i} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${i === 0 ? 'bg-gradient-to-r from-yellow-500/15 to-transparent border border-yellow-500/30' : 'bg-gray-900/50'}`}>
                  <span className="text-lg w-7 text-center shrink-0">{medal(i)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{v.nome}</div>
                    <div className="text-[10px] text-gray-500">{CARGO[v.cargo] || v.cargo || '—'} · {v.pedidos} pedido(s)</div>
                  </div>
                  <div className={`text-sm font-black ${i === 0 ? 'text-yellow-300' : 'text-emerald-400'}`}>{money(v.total)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PRODUTO CAMPEÃO */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3 text-emerald-300 font-bold"><Package className="w-4 h-4" /> Produto campeão</div>
          {produtos.length === 0 ? <p className="text-sm text-gray-500 py-4 text-center">Nenhum produto vendido hoje ainda.</p> : (
            <div className="space-y-1.5">
              {produtos.slice(0, 5).map((p, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${i === 0 ? 'bg-gradient-to-r from-yellow-500/15 to-transparent border border-yellow-500/30' : 'bg-gray-900/50'}`}>
                  <span className="text-lg w-7 text-center shrink-0">{medal(i)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p.produto}</div>
                    <div className="text-[10px] text-gray-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {Number(p.qtd) || 0} un. vendida(s)</div>
                  </div>
                  <div className={`text-sm font-black ${i === 0 ? 'text-yellow-300' : 'text-emerald-400'}`}>{money(p.total)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
