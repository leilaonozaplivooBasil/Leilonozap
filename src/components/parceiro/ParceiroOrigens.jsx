import React from 'react';
import ParceiroSecao from './ParceiroSecao';
import ParceiroLamina from './ParceiroLamina';
import ParceiroDetalhe from './ParceiroDetalhe';

const IMG_ESTOQUE = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/77d21348f_generated_image.png';

const ORIGENS = [
  { n: '01', titulo: 'Devoluções em prazo legal', texto: 'Produtos devolvidos dentro dos sete dias previstos em lei, íntegros e prontos para recolocação.' },
  { n: '02', titulo: 'Estoque direto de fábrica', texto: 'Aquisição junto à indústria, sem camadas de distribuição no meio do caminho.' },
  { n: '03', titulo: 'Mostruários e amostras', texto: 'Itens de exposição comercial, com valor de mercado preservado.' },
  { n: '04', titulo: 'Lotes de estoque parado', texto: 'Excedentes que ocupam capital e espaço de quem os detém — e que têm demanda real.' },
];

// Bloco 03 — as quatro origens do produto (Cláusulas 1 e 4).
export default function ParceiroOrigens() {
  return (
    <ParceiroSecao numero="02" rotulo="A operação estruturada" referencia="Cláusulas 1 e 4" fundo="preto-2">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-end">
        <h2 className="text-2xl font-bold leading-tight text-pc-tinta sm:text-4xl">
          De onde vem o <span className="text-pc-ouro">produto</span>
        </h2>
        <p className="text-sm leading-relaxed text-pc-tinta-fraca sm:text-base lg:text-right">
          O capital é integralmente alocado em operações sucessivas de compra e recompra de produtos
          de alto giro, provenientes de quatro origens definidas em contrato.
        </p>
      </div>

      <div className="mt-10">
        <ParceiroLamina
          imagem={IMG_ESTOQUE}
          alt="Estoque organizado em depósito da operação"
          selo="Produto de alto giro"
          frase="Quatro origens. Um só critério: liquidez real."
        />
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {ORIGENS.map((o, i) => (
          <div key={o.n} className={`border-t pt-5 ${i === 0 ? 'border-pc-ouro' : 'border-pc-borda'}`}>
            <p className="text-xs tracking-[0.2em] text-pc-ouro">{o.n}</p>
            <h3 className="mt-3 text-base font-bold text-pc-tinta sm:text-lg">{o.titulo}</h3>
            <p className="mt-3 text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">{o.texto}</p>
          </div>
        ))}
      </div>

      <ParceiroDetalhe rotulo="Ver como escoa e quem decide">
      <div className="mt-6 grid gap-px overflow-hidden border border-pc-borda bg-pc-borda sm:grid-cols-2">
        <div className="bg-pc-preto p-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-pc-ouro sm:text-xs">Como escoa</p>
          <p className="mt-3 text-sm leading-relaxed text-pc-tinta-fraca">
            Comercialização por <strong className="font-semibold text-pc-tinta">equipe de vendas própria</strong> e{' '}
            <strong className="font-semibold text-pc-tinta">canais digitais próprios</strong> — sem dependência
            de marketplace de terceiros.
          </p>
        </div>
        <div className="bg-pc-preto p-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-pc-ouro sm:text-xs">Quem decide</p>
          <p className="mt-3 text-sm leading-relaxed text-pc-tinta-fraca">
            A seleção dos produtos é competência exclusiva da plataforma. O parceiro{' '}
            <strong className="font-semibold text-pc-tinta">não interfere na curadoria nem na gestão operacional</strong>.
          </p>
        </div>
      </div>
      </ParceiroDetalhe>
    </ParceiroSecao>
  );
}