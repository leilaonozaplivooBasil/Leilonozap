import React, { useState } from 'react';
import { Store, Users, Gavel } from 'lucide-react';
import ParceiroSecao from './ParceiroSecao';
import ParceiroTourLoja from './ParceiroTourLoja';
import ParceiroTourExpansao from './ParceiroTourExpansao';
import ParceiroComoChegamos from './ParceiroComoChegamos';

// 🛣️ Bloco 07 — por onde o produto curado gira, com os percursos em destaque
// no topo (a ação principal precisa ser vista de cara, não no pé do cartão).
// ⚠️ PROIBIDO aqui: comissão, percentual, faturamento, ticket médio, projeção,
// "investimento" e qualquer valor em R$. Descrição operacional apenas.
// Cada botão fica na coluna do cartão que ele demonstra: Leilão (1º),
// Loja Virtual (2º) e Plano de Expansão sobre a Estrutura de Alavancagem (3º).
const PERCURSOS = [
  { id: 'leilao', rotulo: 'Percorrer o Leilão' },
  { id: 'loja', rotulo: 'Percorrer a Loja Virtual' },
  { id: 'expansao', rotulo: 'Conhecer o Plano de Expansão' },
];

// 🗺️ Roadmap 2026 — METAS DE OPERAÇÃO (alcance + base de cálculo conservadora).
// ⚠️ Proibido aqui: volume total consolidado, projeção anual e a palavra
// "investimento". O consolidado só existe no material privado, pós-NDA.
const CANAIS = [
  {
    id: 'leilao',
    ordem: '1º',
    icone: Gavel,
    rotulo: 'Canal direto · Disputa em tempo real',
    titulo: 'Leilão',
    texto:
      'Canal direto da empresa, com disputa em tempo real. Acelera o giro de lotes e define saída rápida quando a operação precisa de velocidade.',
    meta: '100.000 usuários comprando',
    prazo: 'até dez/2026',
    base: 'R$ 297 / mês por usuário',
  },
  {
    id: 'loja',
    ordem: '2º',
    icone: Store,
    rotulo: 'Canal digital próprio',
    titulo: 'Loja Virtual',
    texto:
      'Canal digital próprio da empresa. Recebe o item curado, com ficha, foto tratada e posicionamento definido pela operação — sem depender de marketplace de terceiros.',
    meta: '100.000 usuários comprando',
    prazo: 'até dez/2026',
    base: 'R$ 297 / mês por usuário',
  },
  {
    id: 'licenciados',
    ordem: '3º',
    icone: Users,
    rotulo: 'Canal humano · Estrutura de Alavancagem',
    titulo: 'Estrutura de Alavancagem',
    texto:
      'Licenciados e vendedores que revendem o estoque curado nas próprias praças e comunidades. Capilaridade de escoamento sem custo fixo de loja física.',
    meta: '10.000 vendedores ativos',
    prazo: 'até dez/2026',
    base: 'R$ 2.500 / mês por vendedor',
  },
];

const COMO_CHEGAMOS = [
  {
    titulo: 'Estratégia de influenciadores',
    texto:
      'Rede de criadores já mapeada, com link próprio e material pronto, levando audiência direto para os canais da empresa.',
  },
  {
    titulo: 'Marketing de performance',
    texto:
      'Aquisição paga medida por canal e por praça, com verba concentrada no que já converte.',
  },
  {
    titulo: 'Canais próprios estruturados',
    texto:
      'Leilão, Loja Virtual e Estrutura de Alavancagem já em operação — a meta é escala de audiência, não construção de canal.',
  },
];

export default function ParceiroCanaisVenda() {
  const [tour, setTour] = useState(null);

  return (
    <>
      <ParceiroSecao numero="07" rotulo="Canais próprios de venda" referencia="Roadmap 2026">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <h2 className="text-2xl font-bold leading-tight text-pc-tinta sm:text-4xl">
            Por onde o produto <span className="text-pc-ouro">gira</span>
          </h2>
          <p className="text-sm leading-relaxed text-pc-tinta-fraca lg:text-right">
            Roadmap 2026 — metas de operação
            <br className="hidden sm:block" /> dos três canais próprios da empresa.
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
                <div className="flex items-center justify-between gap-3">
                  <Icone className="h-6 w-6 text-pc-ouro" strokeWidth={1.5} />
                  <span className="text-xs font-bold tracking-[0.15em] text-pc-ouro">{c.ordem}</span>
                </div>
                <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-pc-ouro">{c.rotulo}</p>
                <h3 className="mt-2 text-lg font-bold text-pc-tinta">{c.titulo}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-pc-tinta-fraca">{c.texto}</p>

                {/* Meta de alcance + base de cálculo conservadora */}
                <div className="mt-5 border-t border-pc-ouro/25 pt-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">
                    Meta {c.prazo}
                  </p>
                  <p className="mt-1.5 text-xl font-bold leading-tight text-pc-tinta sm:text-2xl">
                    {c.meta}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-pc-tinta-fraca">
                    Base de cálculo conservadora: <span className="text-pc-tinta">{c.base}</span>
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <ParceiroComoChegamos itens={COMO_CHEGAMOS} />

        <p className="mt-8 border-t border-pc-borda pt-6 text-[10px] leading-relaxed text-pc-tinta-fraca sm:text-xs">
          Os números acima são <strong className="text-pc-tinta">metas de operação do roadmap 2026</strong>,
          construídas sobre base de cálculo conservadora por usuário e por vendedor.
          Não constituem garantia de resultado, promessa de rendimento nem oferta pública.
          Condições comerciais e números consolidados são tratados somente após cadastro
          e termo de confidencialidade.
        </p>
      </ParceiroSecao>

      {(tour === 'loja' || tour === 'leilao') && (
        <ParceiroTourLoja canal={tour} onClose={() => setTour(null)} />
      )}
      {tour === 'expansao' && <ParceiroTourExpansao onClose={() => setTour(null)} />}
    </>
  );
}