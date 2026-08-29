import React from 'react';

// Capa — abertura institucional (convite à parceria comercial). Sem número:
// a contagem visível começa no Resumo executivo.
export default function ParceiroAbertura({ onSolicitarAcesso }) {
  return (
    <header className="relative overflow-hidden bg-pc-preto">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pc-ouro to-transparent" />
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mb-10 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="border border-pc-ouro px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.25em] text-pc-ouro sm:text-xs">
            Confidencial
          </span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-pc-tinta-fraca sm:text-xs">
            Captação privada
          </span>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <span className="h-px w-10 bg-pc-ouro" />
          <p className="text-[10px] uppercase tracking-[0.25em] text-pc-ouro sm:text-xs">
            Convite à parceria comercial
          </p>
        </div>

        <h1 className="max-w-3xl text-3xl font-bold leading-tight text-pc-tinta sm:text-5xl md:text-6xl">
          Participação em <span className="text-pc-ouro">operação estruturada</span> de venda de produtos
        </h1>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-pc-tinta-fraca sm:text-base">
          Capital alocado em operações sucessivas de compra e revenda de produtos de alto giro,
          com participação no resultado comercial apurado. Ciclo fechado de doze meses.
        </p>

        <button
          type="button"
          onClick={onSolicitarAcesso}
          className="mt-10 inline-flex min-h-[48px] items-center justify-center border border-pc-ouro bg-pc-ouro px-7 text-xs font-semibold uppercase tracking-[0.18em] text-pc-preto transition-colors hover:bg-pc-ouro-claro"
        >
          Solicitar acesso às condições
        </button>

        <div className="mt-16 border-t border-pc-borda pt-6 sm:flex sm:items-end sm:justify-between">
          <div className="text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">
            <p className="font-semibold text-pc-tinta">COMPRAS FULL COMÉRCIO LTDA · CNPJ 51.544.091/0001-67</p>
            <p>Av. das Américas, 19.005, Torre 1, Sala 1106, Recreio dos Bandeirantes, Rio de Janeiro/RJ</p>
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-[0.25em] text-pc-tinta-fraca sm:mt-0 sm:text-xs">
            Não é oferta pública
          </p>
        </div>
      </div>
    </header>
  );
}