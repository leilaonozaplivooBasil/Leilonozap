import React from 'react';

// 🏛️ DIR-56 — o cabeçalho das duas marcas, com a ARTE ORIGINAL (extraída dos
// PDFs oficiais que o dono anexou, não redesenhada). Top College é a
// faculdade — vem primeiro e com mais espaço; X-eos é o sistema que sustenta
// — vem inteira, do lado, nunca reduzida a um ícone.
export default function MarcaPalco() {
  return (
    <div className="relative overflow-hidden rounded-3xl mb-6 sm:mb-8 border border-white/10">
      {/* o padrão tonal de X do brandbook, em escala grande */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.30]"
        style={{
          backgroundImage: 'url(/marca/padrao-xeos.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 12% 0%, rgba(59,111,246,0.30), transparent 60%), radial-gradient(110% 90% at 88% 100%, rgba(230,46,139,0.24), transparent 62%)',
        }}
      />

      <div className="relative flex flex-col lg:flex-row items-center gap-8 lg:gap-12 px-6 sm:px-10 py-9 sm:py-12">
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <img
            src="/marca/topcollege.webp"
            alt="Top College — Faculty of Entrepreneurs"
            className="h-24 sm:h-32 w-auto"
          />
          <p className="mt-4 text-sm sm:text-base text-white/80 max-w-sm leading-relaxed">
            A primeira faculdade de empreendedorismo do planeta.
          </p>
        </div>

        <div className="hidden lg:block self-stretch w-px bg-white/15" />
        <div className="lg:hidden w-2/3 h-px bg-white/15" />

        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <img
            src="/marca/xeos.webp"
            alt="X-eos — Estrutura de operações e expansão"
            className="h-16 sm:h-20 w-auto"
          />
          <p className="mt-4 text-sm sm:text-base text-white/80 max-w-sm leading-relaxed">
            Estrutura de operação e expansão de qualquer negócio — a coluna
            vertebral da mentalidade.
          </p>
        </div>
      </div>
    </div>
  );
}
