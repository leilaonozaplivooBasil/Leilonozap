import React from 'react';
import { Gift, Trophy, ShoppingBag, ExternalLink } from 'lucide-react';

// PrizeShowcase — vitrine dos produtos que estão sendo sorteados.
// Mostra o prêmio do dia + 1º, 2º, 3º lugar como cards clicáveis que levam pra Loja Virtual.
// Só aparece se o admin configurou pelo menos 1 produto com link.
// Formato visual inspirado no card de produto da loja (CatalogProductCard).

const money = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

// Badge da posição: 1º dourado, 2º prata, 3º bronze — troféu + número, design premium
function PosTag({ pos }) {
  const cores = {
    1: { grad: 'linear-gradient(135deg,#fde68a,#f5c451,#e0a920)', glow: 'rgba(245,196,81,.45)', text: '#3d2a05' },
    2: { grad: 'linear-gradient(135deg,#f1f5f9,#cbd5d8,#94a3b8)', glow: 'rgba(203,213,216,.35)', text: '#1e293b' },
    3: { grad: 'linear-gradient(135deg,#f0c89e,#d0894c,#a96d36)', glow: 'rgba(208,137,76,.35)', text: '#3b1f0e' },
  };
  const c = cores[pos] || cores[3];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide"
      style={{ background: c.grad, color: c.text, boxShadow: `0 4px 14px ${c.glow}, inset 0 1px 0 rgba(255,255,255,.4)`, border: '1px solid rgba(255,255,255,.25)' }}
    >
      <Trophy className="w-3.5 h-3.5" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.2))' }} />
      {pos}º Lugar
    </span>
  );
}

// Card de produto individual — clicável, abre o produto na loja
function ProductCard({ item, pos }) {
  if (!item) return null;
  const link = item.produto_link || '';
  if (!link) return null;

  // Garante link interno absoluto (se vier só com /Loja-Virtual...)
  const href = link.startsWith('http') ? link : (link.startsWith('/') ? link : `/Loja-Virtual?produto=${link}`);

  const Wrapper = href.startsWith('http') ? 'a' : 'a';
  const wrapperProps = href.startsWith('http')
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : { href };

  return (
    <Wrapper {...wrapperProps} className="group block rounded-2xl overflow-hidden transition-transform active:scale-[.98] hover:scale-[1.02] no-underline" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(245,196,81,.22)' }}>
      {/* Foto do produto */}
      <div className="relative aspect-square overflow-hidden bg-black/50 grid place-items-center">
        {item.produto_foto ? (
          <img src={item.produto_foto} alt={item.nome} className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="w-full h-full grid place-items-center">
            <Gift className="w-12 h-12 text-white/25" />
          </div>
        )}
        {/* Badge da posição sobre a foto */}
        <div className="absolute top-2 left-2">
          <PosTag pos={pos} />
        </div>
      </div>

      {/* Info do produto */}
      <div className="p-3 space-y-1.5">
        <p className="font-bold text-sm leading-tight text-white line-clamp-2 min-h-[2.5rem]">{item.nome}</p>
        {item.produto_valor > 0 && (
          <p className="text-xs text-green-300/80">
            Na loja por <b className="text-yellow-300">{money(item.produto_valor)}</b>
          </p>
        )}
        <div className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black text-[#052e16]" style={{ background: 'linear-gradient(90deg,#f5c451,#22c55e)' }}>
          <ShoppingBag className="w-3.5 h-3.5" /> Ver na loja <ExternalLink className="w-3 h-3 opacity-70" />
        </div>
      </div>
    </Wrapper>
  );
}

export default function PrizeShowcase({ config, premios }) {
  // Monta a lista de produtos: 3 produtos do dia (1º/2º/3º) + prêmios do pódio (1º/2º/3º lugar)
  const items = [];

  // 3 produtos do dia (da config.produtos_dia) — o admin configura na aba "Sorteio do dia"
  const diaArr = Array.isArray(config?.produtos_dia) ? config.produtos_dia : [];
  for (let i = 0; i < 3; i++) {
    const p = diaArr[i];
    if (p && p.nome && p.link) {
      items.push({
        pos: i + 1,
        item: {
          nome: p.nome,
          produto_foto: p.foto || '',
          produto_valor: p.valor || 0,
          produto_link: p.link,
        },
      });
    }
  }

  // Prêmios do pódio (1º, 2º, 3º lugar) — da tabela concurso_premios
  const posMap = {};
  (Array.isArray(premios) ? premios : []).forEach((p) => { if (p.premio) posMap[p.posicao] = p; });
  for (const pos of [1, 2, 3]) {
    const p = posMap[pos];
    if (p && p.produto_link) {
      items.push({
        pos,
        item: {
          nome: p.premio,
          produto_foto: p.produto_foto || '',
          produto_valor: p.produto_valor || 0,
          produto_link: p.produto_link,
        },
      });
    }
  }

  // Só aparece se tem pelo menos 1 produto com link
  if (items.length === 0) return null;

  return (
    <section className="mt-4">
      <div className="flex items-center gap-2 mb-3 px-1">
        <ShoppingBag className="w-4 h-4 text-yellow-300" />
        <h2 className="font-black text-sm uppercase tracking-wide text-green-100">Produtos sendo sorteados</h2>
        <span className="text-[10px] text-green-300/60">toque pra ver na loja</span>
      </div>
      <div className={`grid gap-3 ${items.length === 1 ? 'grid-cols-1 max-w-[200px] mx-auto' : items.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {items.map(({ pos, item }) => (
          <ProductCard key={pos} item={item} pos={pos} />
        ))}
      </div>
    </section>
  );
}