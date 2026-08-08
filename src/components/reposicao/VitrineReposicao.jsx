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
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {produtos.map((p) => {
            const cheio = Number(p.preco) || 0;
            const meu = cheio * (1 - (Number(descontoPct) || 0) / 100);
            return (
              <div key={p.id} className="bg-white border border-nz-borda rounded-2xl overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                {/* 🖼️ Foto grande em cima: a vitrine é pra bater o olho e reconhecer o produto */}
                <div className="relative aspect-square bg-nz-preto-barra flex items-center justify-center">
                  {p.imagem
                    ? <img src={p.imagem} alt={p.descricao} className="w-full h-full object-contain p-2" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    : <Package className="w-8 h-8 text-white/40" />}
                  <span className="absolute top-2 left-2 bg-white/95 text-nz-tinta text-[10px] font-bold px-2 py-1 rounded-full">{p.quantidade} em estoque</span>
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-sm font-medium text-nz-tinta line-clamp-2 leading-snug min-h-[2.5rem]">{p.descricao}</p>
                  <p className="text-[11px] text-gray-400 line-through mt-1">{money(cheio)}</p>
                  <p className="text-lg font-black text-nz-verde leading-tight">{money(meu)}</p>
                  <button
                    onClick={() => onAdd(p)}
                    className="mt-2.5 w-full min-h-[44px] rounded-xl bg-nz-verde hover:opacity-90 text-white text-sm font-bold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}