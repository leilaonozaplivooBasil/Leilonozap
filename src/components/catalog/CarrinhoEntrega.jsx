import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';

/**
 * 🛒 CarrinhoEntrega — animação de entrega no cartão da Loja Virtual.
 *
 * O carrinho desce de cima ao lado do nome do parceiro, dá uma pausa,
 * atravessa correndo o cartão deixando uma fumacinha e desaparece no
 * canto das ações (compartilhar). Roda 1x, é decorativo:
 * position absolute + pointer-events-none → não empurra layout nem
 * rouba clique dos botões, nem em 320px.
 */
export default function CarrinhoEntrega() {
  const semMovimento = useReducedMotion();
  if (semMovimento) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      <motion.div
        className="absolute top-1.5 left-14"
        initial={{ y: -40, x: 0, opacity: 0 }}
        animate={{
          y: [-40, 0, 0, 2, 2],
          x: ['0%', '0%', '0%', '620%', '760%'],
          opacity: [0, 1, 1, 1, 0],
        }}
        transition={{ duration: 2.6, times: [0, 0.22, 0.42, 0.92, 1], ease: ['easeOut', 'linear', 'easeIn', 'linear'] }}
      >
        <ShoppingCart className="w-4 h-4 text-green-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.7)]" />
        {/* fumacinha de entrega: partículas saindo por trás do carrinho */}
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute top-2 -left-1 h-1.5 w-1.5 rounded-full bg-white/40"
            animate={{ x: [-2, -14 - i * 6], y: [0, -3 - i * 2], opacity: [0.5, 0], scale: [0.6, 1.8] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: 0.9 + i * 0.12, ease: 'easeOut' }}
          />
        ))}
      </motion.div>
    </div>
  );
}