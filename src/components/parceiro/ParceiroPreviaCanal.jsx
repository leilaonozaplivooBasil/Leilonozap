import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ParceiroComparativoPreco from './ParceiroComparativoPreco';

// 👁️ Prévia institucional de um canal, SEM tirar o parceiro da página.
// canal = 'loja' (produtos da Loja Virtual) | 'leilao' (lotes em leilão).
// ⚠️ REGRA: nada de preço, valor em R$, botão comprar ou dar lance.
// É demonstração de curadoria e posicionamento — não é vitrine de venda.
const TEXTOS = {
  loja: {
    rotulo: 'Canal próprio · Loja Virtual',
    titulo: 'Prévia da Loja Virtual',
    apoio: 'Itens curados já publicados no canal digital próprio da empresa.',
    selo: 'Curadoria aprovada',
    vazio: 'Nenhum item publicado na loja no momento.',
  },
  leilao: {
    rotulo: 'Canal direto · Leilão',
    titulo: 'Prévia dos Leilões',
    apoio: 'Lotes em disputa no canal de giro acelerado da empresa.',
    selo: 'Lote em operação',
    vazio: 'Nenhum lote em disputa no momento.',
  },
};

export default function ParceiroPreviaCanal({ canal, onClose }) {
  const [itens, setItens] = useState(null); // null = carregando
  const t = TEXTOS[canal] || TEXTOS.loja;

  // Esc fecha + trava o scroll do fundo enquanto a prévia está aberta
  useEffect(() => {
    const aoTeclar = (e) => { if (e.key === 'Escape') onClose(); };
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [onClose]);

  useEffect(() => {
    let ativo = true;
    const busca = canal === 'leilao'
      ? base44.entities.Auction.filter({ status: 'active' }, '-created_date', 18)
      : base44.entities.Product.filter({ catalog_active: true }, '-created_date', 24);

    busca
      .then((lista) => {
        if (!ativo) return;
        const limite = canal === 'leilao' ? 6 : 8;
        const comFoto = (lista || []).filter((i) => i?.image_urls?.[0]).slice(0, limite);
        setItens(comFoto);
      })
      .catch(() => { if (ativo) setItens([]); });
    return () => { ativo = false; };
  }, [canal]);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center overflow-y-auto bg-pc-preto/90 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t.titulo}
    >
      <div
        className="my-6 w-full max-w-5xl border border-pc-borda bg-pc-preto-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho da prévia */}
        <div className="flex items-start justify-between gap-3 border-b border-pc-borda p-4 sm:p-6">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-pc-ouro sm:text-xs">
              {t.rotulo}
            </p>
            <h2 className="mt-2 text-xl font-bold text-pc-tinta sm:text-3xl">{t.titulo}</h2>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">
              {t.apoio}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar prévia"
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-pc-borda text-pc-tinta-fraca transition-colors hover:border-pc-ouro hover:text-pc-ouro"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {itens === null && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border border-pc-borda">
                  <div className="aspect-square animate-pulse bg-pc-preto" />
                  <div className="space-y-2 p-4">
                    <div className="h-3 w-3/4 animate-pulse bg-pc-borda" />
                    <div className="h-2 w-1/3 animate-pulse bg-pc-borda" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {itens?.length === 0 && (
            <p className="border border-pc-borda p-10 text-center text-sm text-pc-tinta-fraca">
              {t.vazio}
            </p>
          )}

          {itens?.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {itens.map((item) => (
                <article key={item.id} className="border border-pc-borda">
                  <div className="aspect-square overflow-hidden bg-pc-preto">
                    <img
                      src={item.image_urls[0]}
                      alt={item.title || item.description || 'Item da operação'}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      width={400}
                      height={400}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">{t.selo}</p>
                    <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-pc-tinta">
                      {item.title || item.description || 'Item em operação'}
                    </h3>
                    {item.category && (
                      <p className="mt-2 text-xs capitalize text-pc-tinta-fraca">
                        {String(item.category).replace(/_/g, ' ')}
                      </p>
                    )}
                    <ParceiroComparativoPreco item={item} />
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="mt-6 border-t border-pc-borda pt-4 text-[10px] leading-relaxed text-pc-tinta-fraca sm:text-xs">
            Amostra ilustrativa da curadoria vigente. Condições comerciais, preços e
            resultados apurados são tratados exclusivamente em ambiente restrito,
            após cadastro e termo de confidencialidade.
          </p>
        </div>
      </div>
    </div>
  );
}