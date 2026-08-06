import React from 'react';

// 💰 HERÓI DO BLOCO — o repasse previsto do ciclo em número GRANDE, preenchendo
// de dourado da esquerda pra direita conforme o ciclo anda (mesma leitura da
// água subindo no cofre). É referência do ciclo, nunca valor devido.
const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v || 0);

export default function ValorRepasseHeroi({ valor = 0, pct = 0, diaRepasse = 30 }) {
  const preenchido = Math.max(0, Math.min(100, pct));

  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase leading-tight tracking-[0.14em] text-pc-tinta-fraca">
        Repasse previsto no fechamento ({diaRepasse}º dia)
      </p>
      <p
        className="heroi-valor mt-1 font-mono text-4xl font-black tabular-nums leading-none tracking-tight sm:text-5xl"
        style={{
          backgroundImage: `linear-gradient(90deg, var(--pc-ouro-claro) 0%, var(--pc-ouro) ${preenchido}%, var(--pc-tinta-fraca) ${preenchido}%, var(--pc-tinta-fraca) 100%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {brl(valor)}
      </p>
      <style>{`
        .heroi-valor { transition: background-image 900ms linear; }
        @media (prefers-reduced-motion: reduce) {
          .heroi-valor { transition: none; }
        }
      `}</style>
    </div>
  );
}