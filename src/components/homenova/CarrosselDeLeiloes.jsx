import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight, Clock } from 'lucide-react';
import CountdownTimer from '@/components/common/CountdownTimer';
import { precoDoLeilao, emReais } from '@/lib/homeNova';
import { aoEntrar } from './aoEntrar';

// 🎠 Carrossel de leilões — a mesma peça serve os dois blocos da home
// ("Em destaque" e "Leilões da semana"), só muda a lista e o rótulo do botão.
//
// Rolagem nativa com snap: sem biblioteca, funciona com o dedo no celular e com
// as setas no desktop.
//
// ⏱️ O CRONÔMETRO FICA NO CARD de propósito. Num leilão, o tempo que falta é o
// que faz a pessoa clicar — data escrita não cria urgência nenhuma.

function CartaoDeLeilao({ leilao, rotuloDoBotao, naLoja = 0 }) {
  const foto = leilao.image_urls?.[0] || null;
  const lance = precoDoLeilao(leilao);
  // 💰 Só compara quando a loja é REALMENTE mais cara — senão a comparação
  // depõe contra o leilão. E o preço é NOSSO, da nossa loja, não estimativa.
  const compara = naLoja > 0 && naLoja > lance;
  const sala = `/AuctionRoom?id=${encodeURIComponent(leilao.id)}`;

  // 🚫 AQUI NÃO ENTRA SELO DE "-99%", e não é falta de espaço.
  //
  // Cheguei a colocar `Math.round((1 - lance / naLoja) * 100)` em cima da foto.
  // No print ficou "-99%" num item de R$ 1,60 cujo preço de loja é R$ 152,96.
  // O número está certo e a promessa está errada: num leilão ABERTO, o lance
  // atual não é o preço final — ele existe para subir. Carimbar o desconto de
  // um preço provisório anuncia um abatimento que quase certamente não vai
  // existir no martelo.
  //
  // A comparação "na loja R$ X" fica, porque ela afirma dois FATOS lado a lado
  // (o que a nossa loja cobra e em quanto está o lance agora) sem prometer
  // resultado nenhum. Se o dono quiser a porcentagem, ela cabe DEPOIS do
  // encerramento, sobre o preço de arremate — aí é fato consumado.

  return (
    <article
      className="group relative flex w-[176px] flex-none flex-col overflow-hidden rounded-2xl border border-white/10 bg-nz-noite-3 transition-all duration-300 hover:-translate-y-1 hover:border-nz-verde-claro/60 hover:shadow-[0_18px_40px_-18px_rgba(46,157,99,0.65)] sm:w-[212px]"
      data-teste="cartao-de-leilao"
    >
      <Link to={sala} className="relative block">
        <div className="h-[150px] overflow-hidden bg-white/[0.03] sm:h-[172px]">
          {foto && (
            <img
              src={foto}
              alt={leilao.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.07]"
            />
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 min-h-[36px] text-[13px] font-medium leading-[1.3] text-white">{leilao.title}</h3>

        <div className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-nz-verde-menta" data-teste="contagem-do-cartao">
          <Clock size={11} /> <CountdownTimer endTime={leilao.end_time} />
        </div>

        <div className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Lance atual</div>
        <div className="font-slab text-[19px] font-extrabold leading-tight text-nz-verde-neon" data-teste="preco-do-cartao">
          {emReais(lance)}
        </div>
        {compara && (
          <div className="mt-0.5 text-[11px] text-white/35" data-teste="preco-na-loja">
            na loja <span className="line-through">{emReais(naLoja)}</span>
          </div>
        )}

        <Link
          to={sala}
          className="mt-3 flex min-h-[42px] items-center justify-center rounded-full bg-white/[0.07] px-3 text-[13px] font-bold text-white transition-colors duration-200 group-hover:bg-nz-verde-claro hover:bg-nz-verde-claro"
        >
          {rotuloDoBotao}
        </Link>
      </div>
    </article>
  );
}

export default function CarrosselDeLeiloes({
  titulo,
  subtitulo,
  leiloes = [],
  precoNaLoja = {},
  rotuloDoBotao = 'Dar lance',
  verTudo = { rotulo: 'Ver todos os leilões', para: '/leiloes' },
  teste = 'carrossel-de-leiloes',
}) {
  const trilho = useRef(null);
  const semMovimento = useReducedMotion();
  if (leiloes.length === 0) return null;

  const deslizar = (direcao) => {
    const el = trilho.current;
    if (!el) return;
    el.scrollBy({ left: direcao * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <section className="bg-nz-noite px-5 py-[clamp(34px,5vw,60px)]" data-teste={teste}>
      <motion.div {...aoEntrar({ semMovimento })} className="mx-auto max-w-[1200px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-slab font-extrabold leading-[1.1] tracking-[-0.02em] text-white" style={{ fontSize: 'clamp(1.5rem, 3.2vw, 2.2rem)' }}>
              {titulo}
            </h2>
            {subtitulo && <p className="mt-2 text-[15px] text-white/50">{subtitulo}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Link to={verTudo.para} className="mr-1 hidden items-center gap-1.5 text-[14px] font-semibold text-nz-verde-neon transition-colors hover:text-white sm:inline-flex">
              {verTudo.rotulo} <ArrowRight size={15} />
            </Link>
            <button type="button" onClick={() => deslizar(-1)} aria-label="Anterior" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-nz-verde-neon hover:text-nz-verde-neon">
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={() => deslizar(1)} aria-label="Próximo" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-nz-verde-neon hover:text-nz-verde-neon">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div ref={trilho} className="nz-no-scrollbar mt-6 flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-2 pt-1">
          {leiloes.map((a) => (
            <div key={a.id} className="snap-start">
              <CartaoDeLeilao leilao={a} rotuloDoBotao={rotuloDoBotao} naLoja={Number(precoNaLoja[a.product_id]) || 0} />
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
