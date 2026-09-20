import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { aoEntrar } from './aoEntrar';

// 📊 A faixa de números.
//
// 🔴 Só entra contagem que veio do banco (ver `numerosDaCasa`). O mock trazia
// "+100 mil usuários ativos" e "+10 mil produtos leiloados" como exemplo; os
// valores reais são outra ordem de grandeza e é o real que vai ao ar.
//
// 🎬 O número SOBE quando a faixa entra na tela. É a diferença entre um dado
// parado e um sinal de vida — e o alvo é sempre o valor de verdade: a animação
// só controla o caminho até ele, nunca o destino.

/** Sobe de 0 até o alvo em ~900ms, com desaceleração. Respeita reduced-motion. */
function useSubida(alvo, ligado) {
  const [valor, setValor] = useState(alvo);
  const quadro = useRef(0);

  useEffect(() => {
    if (!ligado || !Number.isFinite(alvo)) { setValor(alvo); return undefined; }
    const querParado = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (querParado) { setValor(alvo); return undefined; }

    const inicio = performance.now();
    const DURACAO = 900;
    const passo = (agora) => {
      const t = Math.min(1, (agora - inicio) / DURACAO);
      const suave = 1 - (1 - t) ** 3; // easeOutCubic
      setValor(Math.round(alvo * suave));
      if (t < 1) quadro.current = requestAnimationFrame(passo);
    };
    quadro.current = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro.current);
  }, [alvo, ligado]);

  return valor;
}

function Ladrilho({ item, visivel }) {
  // só anima o que é número; "Brasil" e "PIX e cartão" são fato, não contagem
  const numero = Number(String(item.valor).replace(/\./g, ''));
  const ehNumero = /^\d/.test(String(item.valor)) && Number.isFinite(numero);
  const subindo = useSubida(ehNumero ? numero : 0, visivel && ehNumero);

  // 🔠 19/09/2026 — NÚMERO E FATO NÃO PODEM TER O MESMO PESO.
  //
  // A faixa mostrava `56 · 235 · 2.853 · Brasil · PIX e cartão` com os cinco no
  // mesmo verde gigante. "Brasil" não é uma contagem: pintado de métrica, ele
  // rouba o olho dos três números que a casa tem de verdade. Agora o fato entra
  // menor e em branco — continua dizendo o que diz, sem disputar o palco.
  return (
    <div className="min-w-[132px] text-center sm:text-left" data-teste="numero-da-casa">
      <div
        className={ehNumero
          ? 'font-slab text-[22px] font-extrabold leading-none text-nz-verde-neon sm:text-[27px]'
          : 'text-[16px] font-semibold leading-none text-white/90 sm:text-[18px] sm:leading-none'}
      >
        {ehNumero ? subindo.toLocaleString('pt-BR') : item.valor}
      </div>
      <div className={`leading-tight text-white/50 ${ehNumero ? 'mt-1.5 text-[13px]' : 'mt-2 text-[12px]'}`}>{item.rotulo}</div>
    </div>
  );
}

export default function FaixaDeNumeros({ itens = [] }) {
  const alvo = useRef(null);
  const semMovimento = useReducedMotion();
  const visivel = useInView(alvo, { once: true, amount: 0.4 });
  if (itens.length === 0) return null;

  return (
    <section ref={alvo} className="relative border-y border-white/10 bg-nz-noite-2 px-5 py-8" data-teste="faixa-numeros">
      {/* fio verde no topo: costura a faixa com o resto da página */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(63,208,126,0.5), transparent)' }} />
      <motion.div
        {...aoEntrar({ semMovimento, distancia: 0 })}
        className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:justify-between"
      >
        {itens.map((n) => <Ladrilho key={n.chave} item={n} visivel={visivel} />)}
      </motion.div>
    </section>
  );
}
