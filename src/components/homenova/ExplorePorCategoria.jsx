import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, ShoppingBag, Sparkles, Home, Shirt, Cpu, Sofa, Car,
  Wrench, Dog, Dumbbell, Baby, Gamepad2, PawPrint,
} from 'lucide-react';
import { recadoDaCategoria } from '@/lib/homeNova';
import { aoEntrar } from './aoEntrar';

// 🗂️ EXPLORE POR CATEGORIA.
//
// A contagem vem da view `vw_home_categorias`, que amarra o leilão à categoria
// DO PRODUTO. O campo `auctions.category` não é usado: 52% dos leilões estão
// nele como "outros", o que daria um card "Outros — 29" no lugar de vitrine.
//
// 🎨 Sem foto cadastrada, o card NÃO fica feio nem some: ganha o ícone da
// categoria sobre um degradê da marca. Foto é melhoria, não requisito.

// Casa o nome da categoria com um ícone. Chave em minúsculo e sem acento.
const ICONES = [
  [/beleza|saúde|saude/, Sparkles],
  [/casa|constru/, Home],
  [/moda|roupa|calçad|calcad/, Shirt],
  [/eletr[oô]nico|inform|notebook/, Cpu],
  [/decora|cama|banho/, Sofa],
  [/autom|veic|ve[íi]cul/, Car],
  [/ferrament|constru/, Wrench],
  [/pet/, PawPrint],
  [/esporte|lazer/, Dumbbell],
  [/beb[eê]|infantil/, Baby],
  [/game|vídeo game|video game|brinquedo/, Gamepad2],
  [/eletrodom/, Home],
  [/cozinha/, Home],
  [/papelaria|escrit/, ShoppingBag],
  [/organiza/, ShoppingBag],
  [/costura/, Shirt],
  [/m[uú]sica|instrument/, Sparkles],
  [/jardim|planta/, Dog],
];

export function iconeDaCategoria(nome) {
  const limpo = String(nome || '').toLowerCase();
  const achou = ICONES.find(([regra]) => regra.test(limpo));
  return achou ? achou[1] : ShoppingBag;
}

export default function ExplorePorCategoria({ categorias = [] }) {
  const semMovimento = useReducedMotion();
  if (categorias.length === 0) return null;

  return (
    <section className="bg-nz-noite px-5 py-[clamp(36px,5.5vw,68px)]" data-teste="explore-categoria">
      <motion.div
        {...aoEntrar({ semMovimento })}
        className="mx-auto max-w-[1200px]"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-nz-ouro-claro">Categorias</span>
            <h2 className="font-slab mt-1.5 font-extrabold leading-[1.1] tracking-[-0.02em] text-white" style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.4rem)' }}>
              Explore por categoria
            </h2>
            <p className="mt-2 text-[15px] text-white/50">Os leilões abertos agora, organizados por setor.</p>
          </div>
          <Link
            to="/Loja-Virtual"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/15 px-5 text-[14px] font-semibold text-white/80 transition-colors hover:border-nz-verde-neon hover:text-nz-verde-neon"
          >
            Ver todas <ArrowRight size={15} />
          </Link>
        </div>

        {/* 📱 20/09/2026 — NO CELULAR ISTO NÃO PODE SER GRADE.
            Com doze cards em duas colunas viram SEIS fileiras: uma parede de
            ~1.400px que ninguém rola até o fim, logo na segunda dobra da home.
            No telefone vira trilho que desliza — o mesmo gesto dos carrosséis
            de leilão, que a pessoa já aprendeu duas seções abaixo. Do `sm` para
            cima volta a ser grade, onde as duas fileiras cabem sem empurrar
            nada. */}
        <div className="nz-no-scrollbar -mx-5 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
          {categorias.map((c, i) => {
            const Icone = iconeDaCategoria(c.nome);
            return (
              <motion.div
                key={c.id || c.nome}
                className="w-[46vw] max-w-[190px] flex-none snap-start sm:w-auto sm:max-w-none"
                {...aoEntrar({ semMovimento, atraso: Math.min(i, 5) * 0.05, distancia: 14 })}
              >
                <Link
                  to={`/Loja-Virtual?categoria=${encodeURIComponent(c.id || c.nome)}`}
                  className="group relative block aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-nz-noite-3 transition-all duration-300 hover:-translate-y-1 hover:border-nz-verde-claro/60 hover:shadow-[0_18px_38px_-18px_rgba(46,157,99,0.75)]"
                  data-teste="card-categoria"
                >
                  {c.imagem ? (
                    <img
                      src={c.imagem}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'radial-gradient(120% 110% at 50% 0%, rgba(46,157,99,0.32) 0%, rgba(10,20,16,0) 72%)' }}
                    >
                      <Icone
                        size={38}
                        strokeWidth={1.5}
                        className="text-nz-verde-menta/60 transition-all duration-300 group-hover:scale-110 group-hover:text-nz-verde-neon"
                      />
                    </div>
                  )}

                  {/* A cortina que faz o nome ser legível sobre QUALQUER foto.
                      Sem ela o texto branco some numa arte clara — e as artes
                      que o dono mandou têm fundo claro em duas das cinco. */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(7,16,12,0.94) 0%, rgba(7,16,12,0.72) 26%, rgba(7,16,12,0.12) 58%, rgba(7,16,12,0.06) 100%)' }}
                  />

                  {/* 🖱️ 19/09/2026 — o card inteiro era clicável e nada dizia isso.
                      A pílula surge de baixo no hover: é a resposta do card ao
                      mouse, e de quebra nomeia a ação em vez de deixar a pessoa
                      adivinhar que clicar leva à lista da categoria. */}
                  <span
                    aria-hidden="true"
                    /* 🔠 20/09/2026 — a pílula saiu do RODAPÉ do card.
                       Lá embaixo ela comia 64px de largura e "Casa & Construção"
                       quebrava em duas linhas, empurrando a contagem para uma
                       terceira. Com doze cards, metade tinha nome longo. No topo
                       ela não disputa espaço com texto nenhum. */
                    className="pointer-events-none absolute right-2.5 top-2.5 z-10 inline-flex -translate-y-1.5 items-center gap-1 rounded-full bg-nz-verde-neon px-2.5 py-1 text-[11px] font-bold text-nz-noite opacity-0 shadow-[0_8px_20px_-8px_rgba(63,208,126,0.9)] transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
                  >
                    Ver <ArrowRight size={12} />
                  </span>

                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <div className="line-clamp-2 text-[13.5px] font-semibold leading-[1.2] text-white transition-colors group-hover:text-nz-verde-neon">{c.nome}</div>
                    <div className="mt-1 whitespace-nowrap text-[11.5px] text-white/70" data-teste="recado-categoria">
                      {recadoDaCategoria(c)}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
