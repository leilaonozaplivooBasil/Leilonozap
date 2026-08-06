import React, { useState } from 'react';
import { Store, Users, Gavel } from 'lucide-react';
import ParceiroSecao from './ParceiroSecao';
import ParceiroTourLoja from './ParceiroTourLoja';
import ParceiroTourExpansao from './ParceiroTourExpansao';
import ParceiroComoChegamos from './ParceiroComoChegamos';
import ParceiroRoadmapLinha from './ParceiroRoadmapLinha';
import ParceiroEstruturaRede from './ParceiroEstruturaRede';
import ParceiroMetaCalculo from './ParceiroMetaCalculo';

// 🛣️ Bloco 07 — por onde o produto curado gira, com os percursos em destaque
// no topo (a ação principal precisa ser vista de cara, não no pé do cartão).
// ⚠️ PROIBIDO aqui: comissão, percentual de comissão, faturamento, ticket médio,
// projeção consolidada e a palavra "investimento".
const PERCURSOS = [
  { id: 'leilao', rotulo: 'Percorrer o Leilão' },
  { id: 'loja', rotulo: 'Percorrer a Loja Virtual' },
  { id: 'expansao', rotulo: 'Conhecer o Plano de Expansão' },
];

// 📊 Números REAIS de hoje (informados por Gabriel em 06/08/2026):
// 52 pessoas ativas na plataforma · ~70 licenciados reunidos no grupo,
// em pré-lançamento (ainda não ativados comercialmente).
const CANAIS = [
  {
    id: 'leilao',
    ordem: '1º',
    icone: Gavel,
    rotulo: 'Canal direto · Disputa em tempo real',
    titulo: 'Leilão',
    texto:
      'Canal direto da empresa, com disputa em tempo real. Acelera o giro de lotes e define saída rápida quando a operação precisa de velocidade.',
    atingido: '52 pessoas ativas hoje',
    atingidoNota: 'Pré-lançamento, sem mídia paga ligada e sem abertura oficial.',
    atingidoExtra: 'Herda a base histórica de +10.000 clientes da Loja Virtual.',
    metaMinima: 'Abertura oficial operando com os 300 licenciados ativos vendendo',
    metaAlcancavel: '100.000 usuários comprando',
    base: 'R$ 297 / mês por usuário',
    estruturaExistente:
      'o canal de leilão já está construído, publicado e operando com usuários reais — falta ligar audiência.',
    calculo: [
      { rotulo: 'Ponto de partida real (hoje)', valor: '52 pessoas ativas na plataforma', nota: 'Sem mídia paga, sem influenciador ativado e antes da abertura oficial.' },
      { rotulo: 'Base histórica já impactada', valor: '+10.000 clientes desde o início das vendas', nota: 'Base compartilhada entre os canais — é público já atendido, não público a conquistar.' },
      { rotulo: 'Prazo restante', valor: '5 meses (ago a dez/2026)' },
      { rotulo: 'Quem traz a audiência', valor: '300 licenciados ativos + vendedores + influenciadores', nota: 'Cada degrau da estrutura alimenta o canal com público próprio.' },
      { rotulo: 'Ritmo necessário para a meta alcançável', valor: '~20.000 novos usuários por mês', nota: 'Depende diretamente da verba de aquisição — é exatamente o que a captação destrava.' },
      { rotulo: 'Base de cálculo conservadora', valor: 'R$ 297 / mês por usuário' },
    ],
  },
  {
    id: 'loja',
    ordem: '2º',
    icone: Store,
    rotulo: 'Canal digital próprio',
    titulo: 'Loja Virtual',
    texto:
      'Canal digital próprio da empresa. Recebe o item curado, com ficha, foto tratada e posicionamento definido pela operação — sem depender de marketplace de terceiros.',
    atingido: '+10.000 clientes impactados',
    atingidoNota:
      'Base histórica desde o início das vendas, em migração para a plataforma.',
    atingidoSecundario: '52 pessoas ativas na plataforma hoje',
    atingidoSecundarioNota: 'Pré-lançamento, sem mídia paga ligada.',
    metaMinima: 'Abertura oficial operando com os 300 licenciados ativos vendendo',
    metaAlcancavel: '100.000 usuários comprando',
    base: 'R$ 297 / mês por usuário',
    estruturaExistente:
      'a loja já está no ar, com catálogo curado, checkout, frete e pagamento em produção, e mais de 10 mil clientes já atendidos desde o início das vendas.',
    calculo: [
      { rotulo: 'Ponto de partida real (hoje)', valor: '52 pessoas ativas na plataforma', nota: 'A loja já opera de ponta a ponta: catálogo, checkout, frete e pagamento.' },
      { rotulo: 'Base histórica já impactada', valor: '+10.000 clientes desde o início das vendas', nota: 'Base em migração — não é público a conquistar, é público já atendido.' },
      { rotulo: 'Prazo restante', valor: '5 meses (ago a dez/2026)' },
      { rotulo: 'Quem traz a audiência', valor: '300 licenciados ativos + vendedores + influenciadores' },
      { rotulo: 'Ritmo necessário para a meta alcançável', valor: '~20.000 novos usuários por mês', nota: 'Parte desse caminho vem da reativação da base histórica de mais de 10 mil clientes, não só de aquisição nova.' },
      { rotulo: 'Base de cálculo conservadora', valor: 'R$ 297 / mês por usuário' },
    ],
  },
  {
    id: 'licenciados',
    ordem: '3º',
    icone: Users,
    rotulo: 'Canal humano · Licenciado → Vendedor → Influenciador',
    titulo: 'Estrutura de Alavancagem',
    texto:
      'O licenciado assume a praça e sustenta os próprios vendedores; o vendedor revende o estoque curado e ativa influenciadores. Capilaridade de escoamento sem custo fixo de loja física.',
    atingido: '70 licenciados reunidos',
    atingidoNota: 'Já no grupo, em pré-lançamento — aguardando ativação comercial.',
    metaMinima: '300 licenciados ativos (memorando)',
    metaAlcancavel: '10.000 vendedores ativos',
    base: 'R$ 2.500 / mês por vendedor',
    // barra de progresso: 70 de 300 licenciados = 23%
    progresso: { atual: 70, minimo: 300 },
    estruturaExistente:
      'as praças já estão fechadas (1 distribuidor em Bangu, 3 lojas físicas em Bangu e 1 distribuidor no Recreio) e os 70 licenciados já estão reunidos.',
    calculo: [
      { rotulo: 'Ponto de partida real (hoje)', valor: '70 licenciados reunidos no grupo', nota: 'Pessoas já comprometidas, ainda em pré-lançamento.' },
      { rotulo: 'Meta mínima do memorando', valor: '300 licenciados ativos' },
      { rotulo: 'Falta para a meta mínima', valor: '230 licenciados' },
      { rotulo: 'Prazo restante', valor: '5 meses (ago a dez/2026)' },
      { rotulo: 'Ritmo necessário', valor: '~46 ativações de licenciado por mês', nota: 'Cada licenciado ativado sustenta os próprios vendedores, que ativam influenciadores.' },
      { rotulo: 'Progresso atual da meta mínima', valor: '23% (70 de 300)' },
      { rotulo: 'Base de cálculo conservadora', valor: 'R$ 2.500 / mês por vendedor' },
    ],
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
  const [calculo, setCalculo] = useState(null);

  return (
    <>
      <ParceiroSecao numero="07" rotulo="Canais próprios de venda" referencia="Roadmap 2026">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <h2 className="text-2xl font-bold leading-tight text-pc-tinta sm:text-4xl">
            Por onde o produto <span className="text-pc-ouro">gira</span>
          </h2>
          <p className="text-sm leading-relaxed text-pc-tinta-fraca lg:text-right">
            Onde estamos hoje, de verdade,
            <br className="hidden sm:block" /> e o que falta até dezembro de 2026.
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
            const pct = c.progresso
              ? Math.round((c.progresso.atual / c.progresso.minimo) * 100)
              : null;
            return (
              <article key={c.id} className="flex flex-col border border-pc-borda bg-pc-preto-2 p-6">
                <div className="flex items-center justify-between gap-3">
                  <Icone className="h-6 w-6 text-pc-ouro" strokeWidth={1.5} />
                  <span className="text-xs font-bold tracking-[0.15em] text-pc-ouro">{c.ordem}</span>
                </div>
                <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-pc-ouro">{c.rotulo}</p>
                <h3 className="mt-2 text-lg font-bold text-pc-tinta">{c.titulo}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-pc-tinta-fraca">{c.texto}</p>

                {/* Já atingido → meta mínima → meta alcançável */}
                <div className="mt-5 space-y-4 border-t border-pc-ouro/25 pt-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">
                      Já atingido hoje
                    </p>
                    <p className="mt-1 text-xl font-bold leading-tight text-pc-tinta sm:text-2xl">
                      {c.atingido}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-pc-tinta-fraca">
                      {c.atingidoNota}
                    </p>
                    {c.atingidoSecundario && (
                      <div className="mt-3 border-t border-pc-borda pt-3">
                        <p className="text-sm font-semibold leading-snug text-pc-tinta">
                          {c.atingidoSecundario}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-pc-tinta-fraca">
                          {c.atingidoSecundarioNota}
                        </p>
                      </div>
                    )}
                    {c.atingidoExtra && (
                      <p className="mt-3 border-t border-pc-borda pt-3 text-xs leading-relaxed text-pc-tinta">
                        {c.atingidoExtra}
                      </p>
                    )}
                    {pct !== null && (
                      <div className="mt-3">
                        <div className="h-1 w-full bg-pc-borda">
                          <div className="h-1 bg-pc-ouro" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1.5 text-[10px] uppercase tracking-[0.15em] text-pc-ouro">
                          {`${pct}% da meta mínima`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-pc-tinta-fraca">
                      Meta mínima (memorando)
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-snug text-pc-tinta">
                      {c.metaMinima}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-pc-tinta-fraca">
                      Meta alcançável até dez/2026
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-snug text-pc-tinta">
                      {c.metaAlcancavel}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-pc-tinta-fraca">
                      Base de cálculo conservadora: <span className="text-pc-tinta">{c.base}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCalculo(c)}
                    className="flex min-h-[44px] w-full items-center justify-center border border-pc-borda px-4 text-xs font-semibold uppercase tracking-[0.15em] text-pc-ouro transition-colors hover:border-pc-ouro"
                  >
                    Ver o cálculo
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <ParceiroEstruturaRede />

        <ParceiroRoadmapLinha />

        <ParceiroComoChegamos itens={COMO_CHEGAMOS} />

        <p className="mt-8 border-t border-pc-borda pt-6 text-[10px] leading-relaxed text-pc-tinta-fraca sm:text-xs">
          A estrutura operacional, os canais e as praças físicas{' '}
          <strong className="text-pc-tinta">já existem e já operam</strong>. A captação é para
          alavancar o que está montado — não para construir. Os números de hoje são reais e
          verificáveis; os de dezembro são metas de operação do roadmap 2026 (meta mínima conforme
          memorando e meta alcançável por canal), construídas sobre base de cálculo conservadora por
          usuário e por vendedor. Não constituem garantia de resultado, promessa de rendimento nem
          oferta pública. Condições comerciais e números consolidados são tratados somente após
          cadastro e termo de confidencialidade.
        </p>
      </ParceiroSecao>

      {calculo && <ParceiroMetaCalculo canal={calculo} onClose={() => setCalculo(null)} />}

      {(tour === 'loja' || tour === 'leilao') && (
        <ParceiroTourLoja canal={tour} onClose={() => setTour(null)} />
      )}
      {tour === 'expansao' && <ParceiroTourExpansao onClose={() => setTour(null)} />}
    </>
  );
}