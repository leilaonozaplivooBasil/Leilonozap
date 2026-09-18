import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gem, Users, TrendingUp } from 'lucide-react';

// 🤝 BLOCO PARCEIRO.
//
// O mock trazia DOIS blocos colados (a faixa "Transforme indicações" e o bloco
// grande), com o mesmo botão repetido três vezes em 15% da página — o mesmo
// vício da home antiga, que gasta 4 das 18 saídas vendendo renda para quem
// ainda não comprou nada. Aqui os dois viram um: os selos da faixa entraram
// como apoio do bloco, e sobrou UM caminho.
const SELOS = [
  { icone: Gem, titulo: 'Comissão real', linha: 'Percentual do seu cargo em cada venda' },
  { icone: Users, titulo: 'Suporte dedicado', linha: 'Time de apoio pra sua estrutura' },
  { icone: TrendingUp, titulo: 'Oportunidades', linha: 'Em todo o Brasil, todos os dias' },
];

export default function BlocoParceiro({ foto = null }) {
  return (
    <section className="relative overflow-hidden bg-[#07100C]" data-teste="bloco-parceiro">
      {foto && (
        <>
          <img src={foto} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-right" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #07100C 22%, rgba(7,16,12,0.78) 52%, rgba(7,16,12,0.25) 100%)' }} />
        </>
      )}

      <div className="relative mx-auto max-w-[1200px] px-5 py-[clamp(48px,7vw,88px)]">
        <div className="max-w-[560px]">
          <h2 className="font-semibold leading-[1.06] tracking-[-0.03em] text-white" style={{ fontSize: 'clamp(2rem, 4.6vw, 3.2rem)' }}>
            Seja um <span className="text-nz-verde-claro">Parceiro</span>
          </h2>
          <p className="mt-4 text-[16px] leading-[1.5] text-white/70">
            Indique, divulgue e ganhe com o Leilão NoZap.
          </p>

          <Link
            to="/Lucre"
            className="mt-7 inline-flex min-h-[52px] items-center gap-2 rounded-full bg-nz-verde-claro px-7 text-[16px] font-semibold text-white transition-colors hover:bg-nz-verde"
          >
            Quero ser parceiro <ArrowRight size={17} />
          </Link>

          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {SELOS.map((s) => (
              <div key={s.titulo} className="flex gap-2.5">
                <s.icone size={18} className="mt-0.5 flex-none text-nz-verde-claro" />
                <div>
                  <div className="text-[14px] font-medium text-white">{s.titulo}</div>
                  <div className="mt-0.5 text-[12px] leading-snug text-white/50">{s.linha}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
