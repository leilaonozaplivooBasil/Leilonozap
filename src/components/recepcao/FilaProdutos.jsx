import React from 'react';

/**
 * FilaProdutos — fila de produtos chapados deslizando bem lento (ritmo vitrine).
 *
 * Como o fundo branco das fotos de catálogo é eliminado:
 *   mix-blend-mode: multiply. Pixel branco (255) × fundo da seção = fundo da seção.
 *   Ou seja, o retângulo branco simplesmente desaparece, sem recorte manual.
 *   Por isso NÃO pode haver forma decorativa atrás — ela apareceria através.
 *
 * Movimento: faixa duplicada transladando -50% em ciclo longo e linear,
 * então o loop não tem salto. Respeita prefers-reduced-motion.
 */

// Escalas alternadas dão profundidade — o do meio sempre maior.
const ESCALAS = [0.82, 1, 0.88, 0.95];

// Produtos-vitrine curados, em recorte com fundo branco puro.
// As fotos do catálogo são banners promocionais (fundo roxo/cinza/degradê),
// então nunca ficariam "chapadas" — por isso a vitrine usa estes recortes.
const VITRINE = [
  { id: 'smartphone', src: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/73e6de558_generated_image.png', alt: 'Smartphone premium em leilão' },
  { id: 'tv', src: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/ae152d078_generated_image.png', alt: 'Smart TV em leilão' },
  { id: 'headphone', src: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/6e9c4e69e_generated_image.png', alt: 'Fone de ouvido premium em leilão' },
  { id: 'notebook', src: 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/9de567473_generated_image.png', alt: 'Notebook em leilão' },
];

function Item({ produto, indice }) {
  const escala = ESCALAS[indice % ESCALAS.length];
  return (
    <div className="flex flex-none flex-col items-center justify-end px-3 sm:px-6">
      <img
        src={produto.src}
        alt={produto.alt}
        loading={indice < 2 ? 'eager' : 'lazy'}
        decoding="async"
        className="w-auto object-contain"
        style={{
          height: `calc(clamp(200px, 34vw, 400px) * ${escala})`,
          mixBlendMode: 'multiply',
        }}
      />
      {/* sombra difusa no chão, ancorando o produto sem moldura */}
      <div
        aria-hidden="true"
        className="mt-1 h-3 w-[62%] rounded-[50%] bg-black/10 blur-md"
      />
    </div>
  );
}

export default function FilaProdutos() {
  const lista = VITRINE;
  // faixa duplicada = loop contínuo sem emenda
  const faixa = [...lista, ...lista];

  return (
    <div className="relative w-full overflow-hidden">
      <div className="nz-fila flex w-max items-end">
        {faixa.map((p, i) => (
          <Item key={`${p.id}-${i}`} produto={p} indice={i % lista.length} />
        ))}
      </div>

      {/* bordas esfumaçadas: o produto entra e sai de cena sem corte seco */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32"
        style={{ background: 'linear-gradient(to right, var(--nz-cinza-fundo), transparent)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32"
        style={{ background: 'linear-gradient(to left, var(--nz-cinza-fundo), transparent)' }}
      />

      <style>{`
        @keyframes nzFilaDesliza {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
        .nz-fila {
          animation: nzFilaDesliza 75s linear infinite;
          /* A faixa é transformada, o que cria uma camada isolada: sem pintar
             o fundo AQUI, o multiply das imagens não encontraria a cor da seção
             e o retângulo branco da foto continuaria visível. */
          background: var(--nz-cinza-fundo);
        }
        @media (prefers-reduced-motion: reduce) {
          .nz-fila { animation: none; }
        }
      `}</style>
    </div>
  );
}