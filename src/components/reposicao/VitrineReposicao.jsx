import React from 'react';
import { money } from '@/lib/format';
import { Search, Package, Loader2, Plus } from 'lucide-react';

// Vitrine do estoque central dentro do pedido de reposição.
// Mostra sempre o preço da casa e, ao lado, quanto o lojista paga com o desconto
// da licença dele — o preço de venda NUNCA muda, o que muda é o que ele paga.
export default function VitrineReposicao({ produtos, carregando, termo, onTermo, descontoPct, onAdd }) {
  return (
    <div>
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={termo}
          onChange={(e) => onTermo(e.target.value)}
          placeholder="Buscar produto no estoque central…"
          className="w-full bg-white border border-nz-borda rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500"
        />
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 text-gray-500 py-10 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Carregando produtos…</div>
      ) : produtos.length === 0 ? (
        <div className="border border-dashed border-nz-borda rounded-xl p-8 text-center text-gray-500 text-sm">Nenhum produto disponível com esse nome.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {produtos.map((p) => {
            const cheio = Number(p.preco) || 0;
            const meu = cheio * (1 - (Number(descontoPct) || 0) / 100);
            return (
              <div key={p.id} className="bg-white border border-nz-borda rounded-xl p-3 flex gap-3">
                <span className="w-20 h-20 rounded-lg bg-nz-preto-barra flex items-center justify-center overflow-hidden shrink-0">
                  {p.imagem
                    ? <img src={p.imagem} alt={p.descricao} className="w-full h-full object-contain" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    : <Package className="w-5 h-5 text-white/50" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-nz-tinta line-clamp-2 leading-snug">{p.descricao}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Preço de venda {money(cheio)} · {p.quantidade} em estoque</p>
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <span className="text-sm font-black text-nz-verde">{money(meu)}</span>
                    <button
                      onClick={() => onAdd(p)}
                      className="min-h-[44px] px-3 rounded-lg bg-nz-verde hover:opacity-90 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}