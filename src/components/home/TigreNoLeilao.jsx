import React from 'react';
import { Gavel, Trophy, RotateCcw, ArrowDown } from 'lucide-react';
import tigre from '@/assets/tigre-leiloeiro.webp';

// 🐯 TIGRE NO LEILÃO — 01/10/2026. Topo da página /tigrinhonoleilao.
//
// Dono: "vamos estilizar a página e deixar com uma aparência de collab entre o
// leiloeiro da nossa identidade visual com o tigrinho, reforçando que na Leilão
// NoZap você ganha ou ganha". O tigre é NOSSO: arte própria, 3D no mesmo
// acabamento do leiloeiro, com a roupa dele (chapéu, colete com o bordado,
// gravata). Nada do Fortune Tiger/PG Soft — nem arte, nem nome, nem cara de
// parceria. A página fica no endereço que o dono escolheu manter.
//
// O cenário é o do banner da marca, feito em CSS: marinho, anel neon verde
// atrás do personagem e pódio com borda dourada sob os pés. Assim o recorte do
// tigre (webp com transparência, 900px) serve aqui e em qualquer outro lugar.
//
// ⚖️ O texto é o que a plataforma faz de verdade. Quem perde o leilão recebe o
// valor DE VOLTA NO SALDO, na hora, para outro lance ou compra na Loja. Saldo de
// depósito não vira dinheiro na conta (só comissão é sacável), então aqui não
// se escreve "dinheiro de volta" nem "não perde dinheiro" — isso daria queixa
// certa e com razão. "Ou arremata, ou seu saldo volta" é verdade inteira.

const VERDE = '#1B7A48';
const MARINHO = '#071225';

function rolarAte(id) {
  const alvo = document.getElementById(id);
  if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** O tigre no cenário da marca: anel neon, pódio dourado e luz vinda de cima. */
function CenaDoTigre() {
  return (
    <div className="relative mx-auto w-full max-w-[420px] lg:max-w-none lg:h-full" aria-hidden="true">
      <div className="relative aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[520px]">
        {/* anel neon */}
        <div
          className="absolute left-1/2 top-[44%] h-[78%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            border: '10px solid rgba(63,208,126,0.95)',
            boxShadow: '0 0 28px 6px rgba(63,208,126,0.55), inset 0 0 28px 6px rgba(63,208,126,0.35)',
            maskImage: 'linear-gradient(180deg, #000 0%, #000 72%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 72%, transparent 100%)',
          }}
        />
        {/* luz difusa */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(63,208,126,0.22) 0%, rgba(63,208,126,0) 55%)' }} />
        {/* pódio */}
        <div className="absolute left-1/2 bottom-[2%] w-[78%] -translate-x-1/2">
          <div className="relative h-0 pb-[26%]">
            <div className="absolute inset-0 rounded-[50%]" style={{ background: 'linear-gradient(180deg, #0b1a33 0%, #060e1f 100%)', boxShadow: '0 0 0 3px rgba(245,197,94,0.95), 0 0 30px 8px rgba(245,197,94,0.35), 0 24px 40px rgba(0,0,0,0.6)' }} />
            <div className="absolute inset-x-[8%] top-[10%] bottom-[30%] rounded-[50%]" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(63,208,126,0.18), rgba(63,208,126,0) 70%)' }} />
          </div>
        </div>
        {/* o tigre */}
        <img
          src={tigre}
          alt="O tigre da Leilão NoZap vestido de leiloeiro, com o martelo erguido"
          width={900}
          height={1183}
          fetchPriority="high"
          decoding="async"
          className="absolute left-1/2 bottom-[9%] h-[90%] w-auto max-w-none -translate-x-1/2 drop-shadow-[0_30px_40px_rgba(0,0,0,0.55)]"
        />
      </div>
    </div>
  );
}

/** Banner fixo do topo: o tigre no cenário da marca e a frase da página. */
export function HeroTigre() {
  return (
    <section aria-label="Tigre no Leilão" data-teste="hero-tigre" className="relative w-full overflow-hidden" style={{ background: `radial-gradient(ellipse at 75% 20%, #0f2a4a 0%, ${MARINHO} 55%, #050b18 100%)` }}>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-10 lg:pt-6 lg:pb-0 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch lg:gap-8">
        <div className="relative z-10 flex flex-col justify-center lg:py-16">
          <p className="text-[11px] sm:text-xs font-extrabold tracking-[0.3em] text-[#dabb98]">LEILÃO NOZAP</p>
          <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.02] tracking-tight text-white">
            Ou arremata,
            <br />
            <span className="text-nz-verde-neon">ou seu saldo volta.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-gray-300">
            Perdeu o leilão? O valor do seu lance volta na hora pro seu saldo, pra você dar
            outro lance ou comprar na Loja Virtual. Aqui a disputa não tem lado perdedor.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => rolarAte('hero-leiloes')}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-extrabold text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: VERDE, boxShadow: '0 10px 30px rgba(27,122,72,0.45)' }}
            >
              <Gavel className="h-5 w-5" /> Ver leilões ativos
            </button>
            <button
              type="button"
              onClick={() => rolarAte('como-funciona-tigre')}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-5 py-3 text-base font-semibold text-gray-100 backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              Como funciona <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-8 lg:mt-0">
          <CenaDoTigre />
        </div>
      </div>
    </section>
  );
}

const PASSOS = [
  {
    icone: Gavel,
    titulo: 'Você dá o lance',
    texto: 'O valor sai do seu saldo e fica reservado só enquanto o leilão está rolando.',
  },
  {
    icone: Trophy,
    titulo: 'Arrematou? É seu',
    texto: 'O produto é seu pelo valor do lance. Você escolhe: entrega em casa ou retirada na loja.',
  },
  {
    icone: RotateCcw,
    titulo: 'Não arrematou? Volta',
    texto: 'O valor volta na hora pro seu saldo. Dá outro lance ou usa na Loja Virtual.',
  },
];

/** Os três passos, logo abaixo do banner: a regra "ganha ou ganha" explicada. */
export function ComoFuncionaTigre() {
  return (
    <section id="como-funciona-tigre" aria-labelledby="como-funciona-tigre-titulo" data-teste="como-funciona-tigre" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-2">
      <div className="text-center">
        <h2 id="como-funciona-tigre-titulo" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Aqui você <span className="text-nz-verde-neon">ganha ou ganha</span>
        </h2>
        <p className="mt-2 text-sm sm:text-base text-gray-400">Três passos, sem letra miúda.</p>
      </div>
      <ol className="mt-7 grid gap-4 sm:grid-cols-3">
        {PASSOS.map((p, i) => {
          const Icone = p.icone;
          return (
            <li
              key={p.titulo}
              className="relative overflow-hidden rounded-2xl bg-white/[0.03] px-5 py-5 backdrop-blur-sm"
              style={{ border: '1px solid rgba(16,185,129,0.22)' }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/10 to-transparent" aria-hidden />
              <div className="relative flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white" style={{ background: VERDE }}>
                  <Icone className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold tracking-[0.2em] text-gray-500">PASSO {i + 1}</p>
                  <h3 className="mt-0.5 text-lg font-extrabold text-white">{p.titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-300">{p.texto}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-center text-xs text-gray-500">
        O saldo vale para lances e compras dentro da plataforma.
      </p>
    </section>
  );
}
