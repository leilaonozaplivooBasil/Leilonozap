import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight, Clock } from 'lucide-react';
import CountdownTimer from '@/components/common/CountdownTimer';
import { precoDoLeilao, emReais } from '@/lib/homeNova';
import { urgenciaDoLeilao, pilulaDaUrgencia, recadoDaUrgencia } from '@/lib/urgenciaDoLeilao';
import { aoEntrar } from './aoEntrar';

// 🎠 Carrossel de leilões — a mesma peça serve os dois blocos da home
// ("Em destaque" e "Leilões da semana"), só muda a lista e o rótulo do botão.
//
// Rolagem nativa com snap: sem biblioteca, funciona com o dedo no celular e com
// as setas no desktop.
//
// ⏱️ O CRONÔMETRO FICA NO CARD de propósito. Num leilão, o tempo que falta é o
// que faz a pessoa clicar — data escrita não cria urgência nenhuma.

/**
 * ⏳ Reavalia a faixa de urgência enquanto a página está aberta.
 *
 * 15 em 15 segundos, não a cada segundo: o relógio do card já conta sozinho: o
 * que muda aqui é só a COR, e cor que muda quinze segundos depois da hora exata
 * não engana ninguém. Com doze cards na tela, um intervalo por card a cada
 * segundo seria doze vezes mais trabalho para a mesma informação.
 */
function useUrgencia(endTime) {
  const [faixa, setFaixa] = useState(() => urgenciaDoLeilao(endTime));
  useEffect(() => {
    setFaixa(urgenciaDoLeilao(endTime));
    const id = setInterval(() => setFaixa(urgenciaDoLeilao(endTime)), 15000);
    return () => clearInterval(id);
  }, [endTime]);
  return faixa;
}

function CartaoDeLeilao({ leilao, rotuloDoBotao, naLoja = 0 }) {
  const foto = leilao.image_urls?.[0] || null;
  const lance = precoDoLeilao(leilao);
  // 💰 Só compara quando a loja é REALMENTE mais cara — senão a comparação
  // depõe contra o leilão. E o preço é NOSSO, da nossa loja, não estimativa.
  const compara = naLoja > 0 && naLoja > lance;
  const faixa = useUrgencia(leilao.end_time);
  const recado = recadoDaUrgencia(faixa);
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
      className="group relative flex w-[176px] flex-none flex-col overflow-hidden rounded-2xl border border-nz-verde-claro/25 bg-nz-noite-3 shadow-[0_10px_26px_-20px_rgba(46,157,99,0.6)] transition-all duration-300 hover:-translate-y-1.5 hover:border-nz-verde-neon/70 hover:shadow-[0_24px_50px_-18px_rgba(63,208,126,0.8)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-[212px]"
      data-teste="cartao-de-leilao"
    >
      {/* ✨ O BRILHO QUE ATRAVESSA. Pedido do dono (19/09): "ter interação quando
          passar o mouse". Cor que troca é aviso; luz que ANDA é interação — e é o
          que um leilão pede, porque o card está disputando o olho com outros seis.
          Some inteiro para quem pediu menos movimento no sistema. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-full top-0 z-20 h-full w-1/2 -skew-x-12 opacity-0 transition-all duration-700 ease-out group-hover:left-[150%] group-hover:opacity-100 motion-reduce:hidden"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)' }}
      />

      <Link to={sala} className="relative block">
        {/* A foto deixa de flutuar sobre cinza chapado: nasce sobre uma luz da
            marca, que é o que dá o "bonito em repouso" que o dono pediu. */}
        <div
          className="relative h-[150px] overflow-hidden sm:h-[172px]"
          style={{ background: 'radial-gradient(120% 100% at 50% 0%, rgba(46,157,99,0.20) 0%, rgba(15,28,22,0) 70%)' }}
        >
          {foto && (
            <img
              src={foto}
              alt={leilao.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.09] motion-reduce:transform-none"
            />
          )}
          {/* fio de luz no pé da foto: costura a imagem ao corpo do card */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px opacity-60 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(63,208,126,0.7), transparent)' }}
          />
        </div>
      </Link>

      <div className="relative flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 min-h-[36px] text-[13px] font-medium leading-[1.3] text-white transition-colors duration-200 group-hover:text-nz-verde-menta">{leilao.title}</h3>

        <div
          className={`mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200 ${pilulaDaUrgencia(faixa)}`}
          data-teste="contagem-do-cartao"
          data-urgencia={faixa}
        >
          <Clock size={11} /> <CountdownTimer endTime={leilao.end_time} />
          {recado && <span className="uppercase tracking-[0.08em] opacity-80">· {recado}</span>}
        </div>

        <div className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Lance atual</div>
        <div className="font-slab text-[19px] font-extrabold leading-tight text-nz-verde-neon" data-teste="preco-do-cartao">
          {emReais(lance)}
        </div>
        {compara && (
          <div className="mt-0.5 text-[11px] text-white/45" data-teste="preco-na-loja">
            na loja <span className="line-through">{emReais(naLoja)}</span>
          </div>
        )}

        {/* 🟢 O BOTÃO JÁ NASCE VERDE. Antes era um vulto cinza que só virava botão
            quando o mouse passava — o print do dono mostrava os seis cards
            apagados e UM bonito, o que estava sob o cursor. No celular não existe
            "passar o mouse": para metade das pessoas o botão nunca ficava pronto. */}
        <Link
          to={sala}
          className="mt-3 flex min-h-[42px] items-center justify-center gap-1.5 rounded-full bg-nz-verde-claro px-3 text-[13px] font-bold text-white shadow-[0_6px_18px_-8px_rgba(46,157,99,0.9)] transition-all duration-200 group-hover:bg-nz-verde-neon group-hover:shadow-[0_10px_24px_-8px_rgba(63,208,126,0.95)] hover:bg-nz-verde-neon motion-reduce:transition-none"
        >
          {rotuloDoBotao}
          <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none" />
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
  // 🖱️ 19/09/2026 — O CARROSSEL NÃO ERA UM CARROSSEL, ERA DUAS SETAS.
  //
  // Faltavam as três coisas que a pessoa TENTA fazer num trilho de cards:
  //   • arrastar com o mouse (no celular o dedo já funcionava; no desktop não);
  //   • saber que chegou ao fim — as setas continuavam acesas e o clique não
  //     fazia nada, que é a pior resposta possível: parece defeito;
  //   • ver ONDE está dentro da lista.
  const [posicao, setPosicao] = useState({ inicio: true, fim: false, progresso: 0 });

  const medir = useCallback(() => {
    const el = trilho.current;
    if (!el) return;
    const sobra = el.scrollWidth - el.clientWidth;
    // sobra pequena = não há o que rolar: as setas somem em vez de enganar
    if (sobra <= 4) { setPosicao({ inicio: true, fim: true, progresso: 1 }); return; }
    const x = el.scrollLeft;
    setPosicao({ inicio: x <= 4, fim: x >= sobra - 4, progresso: Math.min(1, Math.max(0, x / sobra)) });
  }, []);

  useEffect(() => {
    medir();
    const el = trilho.current;
    if (!el) return undefined;
    el.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir);
    return () => { el.removeEventListener('scroll', medir); window.removeEventListener('resize', medir); };
  }, [medir, leiloes.length]);

  const deslizar = (direcao) => {
    const el = trilho.current;
    if (!el) return;
    el.scrollBy({ left: direcao * Math.round(el.clientWidth * 0.8), behavior: semMovimento ? 'auto' : 'smooth' });
  };

  // ── arrastar com o mouse ──────────────────────────────────────────────────
  //
  // 🔴 AQUI TINHA `setPointerCapture` NO TRILHO, E ELE QUEBRAVA O CLIQUE.
  //
  // Com captura de ponteiro ativa, o navegador entrega o `click` ao elemento que
  // capturou — não ao que está embaixo do cursor. Ou seja: o trilho recebia
  // todos os cliques e NENHUM card abria. A página parecia normal e não dava
  // para comprar nada.
  //
  // Quem pegou foi o passo de CONTROLE da prova ("um clique parado precisa
  // chegar no card"): sem ele, a prova do arrasto passaria — porque um arrasto
  // longo termina em outro elemento e o navegador nem dispara clique. Prova sem
  // controle mede o próprio silêncio.
  //
  // A troca: os ouvintes de mover/soltar vão na JANELA enquanto o arrasto dura.
  // Cobre o mouse que sai do trilho no meio do gesto e não mexe no alvo do
  // clique.
  const arrasto = useRef({ ativo: false, x0: 0, scroll0: 0, andou: false });

  const pegar = (e) => {
    if (e.pointerType === 'touch') return; // o dedo já rola sozinho, nativo e melhor
    const el = trilho.current;
    if (!el) return;
    arrasto.current = { ativo: true, x0: e.clientX, scroll0: el.scrollLeft, andou: false };
  };

  useEffect(() => {
    const mover = (e) => {
      const a = arrasto.current;
      const el = trilho.current;
      if (!a.ativo || !el) return;
      const d = e.clientX - a.x0;
      if (Math.abs(d) > 4) a.andou = true;
      if (a.andou) {
        e.preventDefault();         // não deixa virar seleção de texto
        el.scrollLeft = a.scroll0 - d;
      }
    };
    const soltar = () => {
      if (!arrasto.current.ativo) return;
      arrasto.current.ativo = false;
      // `andou` só é apagado no quadro SEGUINTE: o clique que o navegador ainda
      // vai disparar ao soltar precisa encontrá-lo ligado para ser engolido.
      requestAnimationFrame(() => { arrasto.current.andou = false; });
    };
    window.addEventListener('pointermove', mover, { passive: false });
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
  }, []);

  const engolirCliqueDeArrasto = (e) => {
    if (arrasto.current.andou) { e.preventDefault(); e.stopPropagation(); }
  };

  const seta = (ligada) => `flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 ${
    ligada
      ? 'border-white/15 text-white/70 hover:-translate-y-0.5 hover:border-nz-verde-neon hover:text-nz-verde-neon motion-reduce:hover:translate-y-0'
      : 'cursor-not-allowed border-white/5 text-white/20'
  }`;

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
            <Link to={verTudo.para} className="group mr-1 hidden items-center gap-1.5 text-[14px] font-semibold text-nz-verde-neon transition-colors hover:text-white sm:inline-flex">
              {verTudo.rotulo}
              <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none" />
            </Link>
            <button
              type="button" onClick={() => deslizar(-1)} disabled={posicao.inicio}
              aria-label="Anterior" className={seta(!posicao.inicio)} data-teste="seta-anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button" onClick={() => deslizar(1)} disabled={posicao.fim}
              aria-label="Próximo" className={seta(!posicao.fim)} data-teste="seta-proximo"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div
          ref={trilho}
          role="group"
          aria-label={titulo}
          tabIndex={0}
          onPointerDown={pegar}
          onClickCapture={engolirCliqueDeArrasto}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); deslizar(1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); deslizar(-1); }
          }}
          className="nz-no-scrollbar mt-6 flex cursor-grab snap-x snap-mandatory gap-3.5 overflow-x-auto pb-2 pt-1 outline-none focus-visible:ring-2 focus-visible:ring-nz-verde-neon/60 active:cursor-grabbing"
        >
          {leiloes.map((a) => (
            <div key={a.id} className="snap-start">
              <CartaoDeLeilao leilao={a} rotuloDoBotao={rotuloDoBotao} naLoja={Number(precoNaLoja[a.product_id]) || 0} />
            </div>
          ))}
        </div>

        {/* 📍 Onde estou na lista. Só aparece quando há o que rolar. */}
        {!(posicao.inicio && posicao.fim) && (
          <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-white/10" data-teste="progresso-do-carrossel">
            <div
              className="h-full rounded-full bg-nz-verde-neon transition-[width,margin] duration-150 ease-out motion-reduce:transition-none"
              style={{ width: '32%', marginLeft: `${posicao.progresso * 68}%` }}
            />
          </div>
        )}
      </motion.div>
    </section>
  );
}
