import React, { useState } from 'react';
import { Store, Users, Gavel } from 'lucide-react';
import ParceiroSecao from './ParceiroSecao';
import ParceiroTourLoja from './ParceiroTourLoja';
import ParceiroTourExpansao from './ParceiroTourExpansao';

// 🛣️ Bloco 07 — por onde o produto curado gira, com os percursos em destaque
// no topo (a ação principal precisa ser vista de cara, não no pé do cartão).
// ⚠️ PROIBIDO aqui: comissão, percentual, faturamento, ticket médio, projeção,
// "investimento" e qualquer valor em R$. Descrição operacional apenas.
const PERCURSOS = [
  { id: 'loja', rotulo: 'Percorrer a Loja Virtual' },
  { id: 'leilao', rotulo: 'Percorrer o Leilão' },
  { id: 'expansao', rotulo: 'Conhecer o Plano de Expansão' },
];

const CANAIS = [
  {
    id: 'loja',
    icone: Store,
    rotulo: 'Canal próprio · Digital',
    titulo: 'Loja Virtual',
    texto:
      'Canal digital próprio da empresa. Recebe o item curado, com ficha, foto tratada e posicionamento definido pela operação — sem depender de marketplace de terceiros.',
  },
  {
    id: 'licenciados',
    icone: Users,
    rotulo: 'Canal humano · Estrutura de Alavancagem',
    titulo: 'Estrutura de Alavancagem',
    texto:
      'Licenciados e vendedores que revendem o estoque curado nas próprias praças e comunidades. Capilaridade de escoamento sem custo fixo de loja física.',
  },
  {
    id: 'leilao',
    icone: Gavel,
    rotulo: 'Canal direto · Giro acelerado',
    titulo: 'Leilão',
    texto:
      'Canal direto da empresa, com disputa em tempo real. Usado para acelerar o giro de lotes e definir saída rápida quando a operação precisa de velocidade.',
  },
];

export default function ParceiroCanaisVenda() {
  const [tour, setTour] = useState(null);

  return (
    <>
      <ParceiroSecao numero="07" rotulo="Canais próprios de venda" referencia="Escoamento">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <h2 className="text-2xl font-bold leading-tight text-pc-tinta sm:text-4xl">
            Por onde o produto <span className="text-pc-ouro">gira</span>
          </h2>
          <p className="text-sm leading-relaxed text-pc-tinta-fraca lg:text-right">
            Três canais próprios de escoamento,
            <br className="hidden sm:block" /> operados pela própria estrutura.
          </p>
        </div>

        {/* Percursos em destaque — ação principal do bloco */}
        <div className="mt-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">
            Percursos demonstrativos — navegue pelos canais sem sair desta página
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PERCURSOS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTour(p.id)}
                className="flex min-h-[44px] w-full items-center justify-center border border-pc-ouro px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.15em] text-pc-ouro transition-colors hover:bg-pc-ouro hover:text-pc-preto"
              >
                {p.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CANAIS.map((c) => {
            const Icone = c.icone;
            return (
              <article key={c.id} className="flex flex-col border border-pc-borda bg-pc-preto-2 p-6">
                <Icone className="h-6 w-6 text-pc-ouro" strokeWidth={1.5} />
                <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-pc-ouro">{c.rotulo}</p>
                <h3 className="mt-2 text-lg font-bold text-pc-tinta">{c.titulo}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-pc-tinta-fraca">{c.texto}</p>
              </article>
            );
          })}
        </div>
      </ParceiroSecao>

      {(tour === 'loja' || tour === 'leilao') && (
        <ParceiroTourLoja canal={tour} onClose={() => setTour(null)} />
      )}
      {tour === 'expansao' && <ParceiroTourExpansao onClose={() => setTour(null)} />}
    </>
  );
}