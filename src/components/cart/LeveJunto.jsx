import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { plataforma } from '@/api/plataformaClient';
import { fmtBR } from '@/lib/money';
import { trackAddToCart } from '@/lib/tracking';
import { recomendarLeveJunto, itemDoCarrinho } from '@/lib/leveJunto';

// 🧺 O bloco "Leve junto" do carrinho (regra em src/lib/leveJunto.js).
// 2 lado a lado no celular, 4 no desktop. "+ Adicionar" soma 1 unidade sem
// sair do carrinho; quem grava o carrinho é a página (onAdicionar), pra
// lista, subtotal e contador do cabeçalho atualizarem juntos.
export default function LeveJunto({ carrinho = [], onAdicionar }) {
  const [produtos, setProdutos] = useState(null);
  useEffect(() => {
    let vivo = true;
    plataforma.entities.Product.filter({ catalog_active: true }, '-created_date', 500)
      .then((rows) => { if (vivo) setProdutos(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (vivo) setProdutos([]); });
    return () => { vivo = false; };
  }, []);
  const escolhidos = useMemo(() => recomendarLeveJunto({ produtos: produtos || [], carrinho }), [produtos, carrinho]);
  if (!produtos || escolhidos.length === 0) return null;
  const vazio = carrinho.length === 0;
  return (
    <section className="mt-6" data-teste="leve-junto" aria-label="Leve junto">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gray-400">{vazio ? 'Pra começar' : 'Leve junto'}</p>
      <p className="mt-0.5 text-sm text-gray-300">{vazio ? 'Os mais em conta da loja hoje.' : 'Combina com o que já está no seu carrinho.'}</p>
      <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {escolhidos.map((p, i) => (
          <li key={p.id} className={`rounded-xl border border-gray-600/50 bg-gray-700/40 p-2.5 ${i >= 2 ? 'hidden md:block' : ''}`} data-teste="leve-junto-item">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-800">
              {p.image_urls?.[0] && <img src={p.image_urls[0]} alt="" className="h-full w-full object-cover" loading="lazy" />}
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-white" title={p.description}>{p.description}</p>
            <div className="mt-2 flex flex-col gap-2">
              <span className="whitespace-nowrap text-sm font-bold text-emerald-300">R$ {fmtBR(p.price_catalog)}</span>
              <button
                type="button"
                onClick={() => { trackAddToCart(p, 1); onAdicionar?.(itemDoCarrinho(p)); }}
                className="inline-flex min-h-[36px] w-full items-center justify-center gap-1 rounded-full bg-green-600 px-3 text-xs font-bold text-white hover:bg-green-700 active:scale-95"
                aria-label={`Adicionar ${p.description}`}
                data-teste="leve-junto-adicionar"
              ><Plus className="h-3.5 w-3.5" /> Adicionar</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
