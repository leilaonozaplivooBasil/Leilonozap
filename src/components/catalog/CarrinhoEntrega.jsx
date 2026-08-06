import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';

/**
 * 🛒 CarrinhoEntrega — animação de entrega no cartão da Loja Virtual.
 *
 * Depois de a loja abrir (atraso de entrada), o carrinho desce na PONTA DIREITA
 * do selo de cargo, atravessa pausadamente até o botão de compartilhar deixando
 * uma linha que vai se apagando por trás (mais a fumacinha), e apaga tudo ao
 * chegar. Repete em looping com pausa, e para quando o cartão sai da tela ou a
 * aba fica em background (economia de CPU no mobile).
 *
 * 100% decorativo: camada absolute + pointer-events-none + aria-hidden. Não
 * empurra layout, não cobre o "Envio para todo Brasil" e não rouba clique.
 */
const ATRASO_ENTRADA = 2500; // tempo de a loja abrir antes do 1º ciclo
const PAUSA_ENTRE_CICLOS = 9000;
const DURACAO = 3.2; // travessia pausada (s)

export default function CarrinhoEntrega({ containerRef, inicioRef, fimRef }) {
  const semMovimento = useReducedMotion();
  const [rota, setRota] = useState(null); // { x, y, dist }
  const [ciclo, setCiclo] = useState(0);
  const [rodando, setRodando] = useState(false);
  const timerRef = useRef(null);
  const visivelRef = useRef(true);

  // Mede início (ponta direita do selo) e fim (centro do compartilhar)
  const medir = useCallback(() => {
    const caixa = containerRef?.current?.getBoundingClientRect();
    const alvo = fimRef?.current?.getBoundingClientRect();
    const partida = inicioRef?.current?.getBoundingClientRect();
    if (!caixa || !alvo || !partida) return null;
    const x = partida.right - caixa.left;
    const y = partida.top + partida.height / 2 - caixa.top;
    const dist = alvo.left + alvo.width / 2 - caixa.left - x;
    if (dist <= 8) return null;
    return { x, y, dist };
  }, [containerRef, inicioRef, fimRef]);

  // Agenda o próximo ciclo (só se o cartão estiver visível e a aba ativa)
  const agendar = useCallback((espera) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (document.hidden || !visivelRef.current) {
        agendar(1500); // tenta de novo quando voltar
        return;
      }
      const r = medir();
      if (!r) {
        agendar(2000);
        return;
      }
      setRota(r);
      setCiclo((c) => c + 1);
      setRodando(true);
    }, espera);
  }, [medir]);

  useEffect(() => {
    if (semMovimento) return;
    const alvo = containerRef?.current;
    const io = alvo
      ? new IntersectionObserver(([e]) => { visivelRef.current = e.isIntersecting; }, { threshold: 0.2 })
      : null;
    if (io && alvo) io.observe(alvo);

    agendar(ATRASO_ENTRADA);

    const aoRedimensionar = () => setRota(null);
    window.addEventListener('resize', aoRedimensionar);
    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener('resize', aoRedimensionar);
      if (io) io.disconnect();
    };
  }, [semMovimento, containerRef, agendar]);

  if (semMovimento || !rota || !rodando) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      {/* rastro: linha verde que segue o carrinho e se apaga por trás */}
      <motion.div
        key={`linha-${ciclo}`}
        className="absolute h-[2px] rounded-full"
        style={{
          left: rota.x,
          top: rota.y,
          background: 'linear-gradient(to right, rgba(34,197,94,0), rgba(34,197,94,0.55))',
        }}
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: [0, rota.dist * 0.85, rota.dist], opacity: [0, 0.9, 0.9, 0] }}
        transition={{ duration: DURACAO + 0.4, times: [0, 0.55, 0.88, 1], ease: 'easeInOut' }}
      />

      {/* carrinho: desce na ponta do selo e atravessa até o compartilhar */}
      <motion.div
        key={`carrinho-${ciclo}`}
        className="absolute"
        style={{ left: rota.x, top: rota.y - 8 }}
        initial={{ x: 0, y: -34, opacity: 0 }}
        animate={{ x: [0, 0, rota.dist, rota.dist], y: [-34, 0, 0, 0], opacity: [0, 1, 1, 0] }}
        transition={{ duration: DURACAO + 0.4, times: [0, 0.22, 0.88, 1], ease: 'easeInOut' }}
        onAnimationComplete={() => {
          setRodando(false);
          agendar(PAUSA_ENTRE_CICLOS);
        }}
      >
        <ShoppingCart className="w-4 h-4 text-green-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.7)]" />
        {/* fumacinha de entrega */}
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute top-2 -left-1 h-1.5 w-1.5 rounded-full bg-white/40"
            animate={{ x: [-2, -14 - i * 6], y: [0, -3 - i * 2], opacity: [0.5, 0], scale: [0.6, 1.8] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.8 + i * 0.14, ease: 'easeOut' }}
          />
        ))}
      </motion.div>
    </div>
  );
}