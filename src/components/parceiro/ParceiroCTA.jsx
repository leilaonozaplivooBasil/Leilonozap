import React from 'react';

// Bloco 10 — os dois caminhos: solicitar acesso ou entrar no painel do parceiro.
export default function ParceiroCTA({ onSolicitarAcesso, onAcessarPainel }) {
  return (
    <section className="bg-pc-preto">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <span className="h-px w-16 bg-pc-ouro mx-auto block" />
        <h2 className="mt-8 text-2xl font-bold leading-tight text-pc-tinta sm:text-4xl">
          As condições completas são apresentadas em{' '}
          <span className="text-pc-ouro">ambiente restrito</span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-pc-tinta-fraca sm:text-base">
          Por se tratar de captação privada, prazos e condições comerciais não são divulgados
          publicamente. O acesso é liberado após identificação e assinatura do termo de
          confidencialidade.
        </p>

        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onSolicitarAcesso}
            className="inline-flex min-h-[48px] items-center justify-center border border-pc-ouro bg-pc-ouro px-7 text-xs font-semibold uppercase tracking-[0.18em] text-pc-preto transition-colors hover:bg-pc-ouro-claro"
          >
            Solicitar acesso às condições
          </button>
          <button
            type="button"
            onClick={onAcessarPainel}
            className="inline-flex min-h-[48px] items-center justify-center border border-pc-borda px-7 text-xs font-semibold uppercase tracking-[0.18em] text-pc-tinta transition-colors hover:border-pc-ouro hover:text-pc-ouro"
          >
            Já sou parceiro — acessar painel
          </button>
        </div>
      </div>
    </section>
  );
}