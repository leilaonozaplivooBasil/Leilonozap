import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Zap, ChevronRight, ChevronLeft, Package } from 'lucide-react';
import foguinho from '@/assets/foguinho.webp';
import { descontoExibivel, precoDeReferencia, ofertasDoCarrossel } from '@/lib/ofertaRelampago';
import { avancoAutomatico, posicaoAntesDaSeta } from '@/lib/carrosselInfinito';

const money = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// 🔴 02/09/2026 — "os produtos das Ofertas Relâmpago estão completamente fora de
// nexo", e depois "ainda há valores 'REAIS' errados". Duas coisas quebravam a
// home: (1) a ORDENAÇÃO por maior desconto, que é ordenar por maior ERRO DE
// DADO — por isso 8 linhas ruins em 270 pareciam a loja inteira quebrada; e (2)
// o campo `market_value`, que era média de busca automática, não preço que
// alguém cobrou (44 dos 262 tinham três casas decimais: "de R$ 68,645").
// A régua toda vive em src/lib/ofertaRelampago.js, testada. Aqui não se calcula
// desconto nem se ordena por ele.
const desconto = descontoExibivel;

function Box({ v }) {
  return <span className="bg-gray-900 text-white text-[10px] sm:text-[13px] font-black rounded px-1 sm:px-1.5 py-0.5 tabular-nums">{String(v).padStart(2, '0')}</span>;
}

function FlashCard({ p, onOpenDetails }) {
  const navigate = useNavigate();
  const d = desconto(p);
  const ref = precoDeReferencia(p);
  const img = (p.image_urls && p.image_urls[0]) || null;
  const vendidos = Number(p.quantity_sold || 0);
  return (
    <button
      onClick={() => onOpenDetails ? onOpenDetails(p) : navigate(createPageUrl('CatalogProductDetails') + `?id=${p.id}`)}
      className="w-[24vw] max-w-[98px] sm:w-[150px] sm:max-w-none shrink-0 bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden text-left hover:border-green-500/50 transition-colors"
    >
      <div className="relative aspect-square bg-white">
        {img ? <img src={img} alt={p.description} loading="lazy" className="w-full h-full object-contain" />
          : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">📦</div>}
        {d > 0 && (
          <span className="absolute top-0 right-0 text-[11px] font-black text-white px-1.5 py-0.5 rounded-bl-lg flex items-center gap-0.5"
            style={{ background: 'linear-gradient(135deg,#e0a92e,#d4880b)' }}>
            <Zap className="w-3 h-3 fill-white" />-{d}%
          </span>
        )}
      </div>
      <div className="p-1.5 sm:p-2">
        <p className="text-green-400 font-black text-[13px] sm:text-base leading-none">{money(p.price_catalog)}</p>
        {/* o riscado e o selo de % andam juntos: preço de referência sem desconto
            que o sustente é preço inventado (CDC art. 37, publicidade enganosa) */}
        {ref > 0 && <p className="text-gray-500 text-[9px] sm:text-[11px] line-through">{money(ref)}</p>}
        <div className="mt-1 sm:mt-1.5 relative h-3 sm:h-4 rounded-full bg-green-900/40 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-green-100 z-10">
            {vendidos > 0 ? `${vendidos} vendidos` : 'POPULAR'}
          </div>
          <div className="h-full" style={{ width: vendidos > 0 ? `${Math.min(100, 30 + vendidos * 5)}%` : '60%', background: 'linear-gradient(90deg,#f5c451,#16a34a)' }} />
        </div>
      </div>
    </button>
  );
}

// 🎠 02/09/2026 — "é necessária a função de arrastar para o lado ou setas para
// conseguir ver as demais ofertas".
//
// Antes o rolo era `@keyframes` + `translateX(-50%)` dentro de `overflow-hidden`:
// bonito, mas o cliente NÃO conseguia mexer. Transform não é rolagem — não há o
// que arrastar, e seta nenhuma tem onde agir.
//
// Agora é rolagem de verdade (`overflow-x-auto`), e cada gesto ganha de graça o
// que o navegador já faz melhor: no celular, deslizar com o dedo (com a inércia
// nativa); no computador, roda do mouse e trackpad. Por cima disso vão só as
// duas coisas que o navegador não dá: ARRASTAR COM O MOUSE e as SETAS.
//
// O rolo sozinho continua, mas agora feito por `scrollLeft` — e QUALQUER toque,
// arrasto, roda ou seta o pausa na hora. Ele volta a andar ~2,5s depois que a
// pessoa para de mexer, para não brigar com quem está olhando um produto.
const VELOCIDADE_PX_S = 34;   // ritmo do rolo sozinho (o marquee antigo dava ~43)
const RETOMAR_APOS_MS = 2500; // silêncio necessário para o rolo voltar a andar

// Faixa "Ofertas Relâmpago" estilo Shopee, identidade Leila (verde+dourado).
// onOpenDetails: abre o produto expandido na própria página (modal) em vez de navegar.
export default function OfertasRelampago({ products = [], onOpenDetails, totalProdutosTexto = null }) {
  const navigate = useNavigate();
  const [left, setLeft] = React.useState(0);
  const trilho = React.useRef(null);
  const arrasto = React.useRef(null);   // arrasto com o mouse em andamento
  const arrastou = React.useRef(false); // arrastou? então o clique não abre o produto
  const pausadoAte = React.useRef(0);
  const sobre = React.useRef(false);

  React.useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now); end.setHours(24, 0, 0, 0); // fim do dia
      setLeft(Math.max(0, Math.floor((end - now) / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Foto e estoque. Quem tem oferta que se sustenta vem primeiro; o resto
  // completa, na ordem em que o Catalog carregou (mais recente primeiro).
  // Produto sem preço de referência confiável continua à venda — só aparece
  // sem o riscado e sem o selo de %.
  const ofertas = ofertasDoCarrossel(products, 12);

  const adiar = React.useCallback(() => {
    pausadoAte.current = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + RETOMAR_APOS_MS;
  }, []);

  React.useEffect(() => {
    const el = trilho.current;
    if (!el) return undefined;
    const semAnimacao = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (semAnimacao) return undefined;

    let raf;
    let anterior = performance.now();
    let resto = 0; // acumula a fração: navegador que arredonda scrollLeft travaria em 0,5px/quadro
    const passo = (agora) => {
      const dt = Math.min(agora - anterior, 100); // aba em segundo plano não pode dar salto
      anterior = agora;
      const livre = !sobre.current && !arrasto.current && agora >= pausadoAte.current;
      if (livre) {
        // a conta da volta invisível vive em src/lib/carrosselInfinito.js, testada
        const proximo = avancoAutomatico({
          scrollLeft: el.scrollLeft, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
          resto, dt, velocidade: VELOCIDADE_PX_S,
        });
        resto = proximo.resto;
        if (proximo.scrollLeft !== el.scrollLeft) el.scrollLeft = proximo.scrollLeft;
      }
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [ofertas.length]);

  // ---- arrastar com o mouse ----
  // Só no mouse: no toque quem rola é o próprio navegador, com a inércia dele.
  // Mexer nisso no celular é trocar algo que funciona por algo que trava.
  const aoApertar = (e) => {
    arrastou.current = false;           // todo clique começa por aqui: zera antes
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = trilho.current;
    if (!el) return;
    arrasto.current = { x: e.clientX, inicio: el.scrollLeft };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* navegador antigo */ }
    adiar();
  };
  const aoMover = (e) => {
    const a = arrasto.current;
    const el = trilho.current;
    if (!a || !el) return;
    const dx = e.clientX - a.x;
    if (Math.abs(dx) > 4) arrastou.current = true;  // passou de 4px: foi arrasto, não clique
    el.scrollLeft = a.inicio - dx;
    adiar();
  };
  const aoSoltar = (e) => {
    if (!arrasto.current) return;
    arrasto.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* idem */ }
    adiar();
  };
  // Arrastar por cima de um card não pode abrir o produto. Fase de captura, para
  // chegar antes do onClick do próprio card.
  const aoClicarCapturando = (e) => {
    if (!arrastou.current) return;
    e.preventDefault();
    e.stopPropagation();
  };

  // ---- setas ----
  // Chegou na ponta? Volta um período INTEIRO antes de rolar. Como o conteúdo se
  // repete, o salto não aparece — e a seta nunca fica "morta" no fim da faixa.
  const rolar = (dir) => {
    const el = trilho.current;
    if (!el) return;
    adiar();
    // na ponta, pula um período inteiro antes de rolar — senão a seta morre ali
    const antes = posicaoAntesDaSeta({
      scrollLeft: el.scrollLeft, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, dir,
    });
    if (antes !== el.scrollLeft) el.scrollLeft = antes;
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  if (ofertas.length < 4) return null;
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;

  // Carrossel "estende até o final" (padrão Base44): a faixa de cards sangra até a borda
  // da caixa e ganha respiro no fim (spacer) + fade à direita sinalizando que continua —
  // assim o último card entra INTEIRO ao deslizar e nada fica cortado.
  return (
    <div className="relative z-10 -mt-4 sm:-mt-16 rounded-2xl pt-2.5 pb-2.5 sm:pt-4 sm:pb-4 mb-6 sm:mb-8 overflow-hidden border border-white/15 shadow-2xl shadow-black/50 bg-white/[0.02] backdrop-blur-sm backdrop-saturate-150">
      {/* liquid glass mais transparente: brilho superior + borda interna sutil (banner aparece mais nítido atrás) */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/10 to-transparent" aria-hidden />
      {/* cabeçalho responsivo: título + timer + "Ver Tudo" que se ajustam sem quebrar feio no mobile */}
      <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1.5 sm:gap-y-2 mb-2.5 sm:mb-4 px-3 sm:px-4">
        <span className="text-xs sm:text-xl font-black flex items-center gap-1 sm:gap-1.5 whitespace-nowrap" style={{ color: '#f5c451' }}>
          <img src={foguinho} alt="" aria-hidden className="w-5 h-5 sm:w-9 sm:h-9 shrink-0 -my-1 object-contain" /> OFERTAS RELÂMPAGO
        </span>
        <span className="flex items-center gap-1 shrink-0"><Box v={h} /><span className="text-white font-black">:</span><Box v={m} /><span className="text-white font-black">:</span><Box v={s} /></span>
        {/* total REAL de produtos da loja, colado no "Ver Tudo" */}
        {totalProdutosTexto && (
          <span className="ml-auto flex items-center gap-1 text-[10.5px] sm:text-xs text-gray-300 whitespace-nowrap">
            <Package className="w-3 h-3 text-green-400 shrink-0" />{totalProdutosTexto}
          </span>
        )}
        <button onClick={() => navigate(createPageUrl('Catalog'))} className={`${totalProdutosTexto ? 'ml-1 sm:ml-2' : 'ml-auto'} min-h-[44px] sm:min-h-0 -my-2 sm:my-0 px-1 text-green-400 text-xs sm:text-sm font-semibold flex items-center hover:text-green-300 shrink-0`}>
          Ver Tudo <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <style>{`
        /* a barra de rolagem some, o gesto continua: é rolagem de verdade por baixo */
        .ofr-trilho { scrollbar-width: none; -ms-overflow-style: none; }
        .ofr-trilho::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="relative group">
        <div
          ref={trilho}
          className="ofr-trilho flex w-full overflow-x-auto overscroll-x-contain cursor-grab active:cursor-grabbing select-none"
          onPointerDown={aoApertar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
          onClickCapture={aoClicarCapturando}
          onMouseEnter={() => { sobre.current = true; }}
          onMouseLeave={() => { sobre.current = false; }}
          onTouchStart={adiar}
          onWheel={adiar}
        >
          {/* a lista vai DUAS vezes: é o que deixa o rolo dar a volta sem emenda */}
          {[...ofertas, ...ofertas].map((p, i) => (
            <div key={`${p.id}-${i}`} className="shrink-0 pr-3"><FlashCard p={p} onOpenDetails={onOpenDetails} /></div>
          ))}
        </div>
        {/* setas — só no computador: no celular o gesto certo é deslizar, e seta em
            cima do card ia tapar produto numa tela estreita */}
        <button
          type="button" aria-label="Ver ofertas anteriores" onClick={() => rolar(-1)}
          className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 items-center justify-center rounded-full bg-gray-900/80 border border-white/20 text-white shadow-lg backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-gray-800"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button" aria-label="Ver mais ofertas" onClick={() => rolar(1)}
          className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 items-center justify-center rounded-full bg-gray-900/80 border border-white/20 text-white shadow-lg backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-gray-800"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        {/* fades nas bordas */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-gray-900/70 to-transparent" aria-hidden />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-gray-900/50 to-transparent" aria-hidden />
      </div>
    </div>
  );
}
