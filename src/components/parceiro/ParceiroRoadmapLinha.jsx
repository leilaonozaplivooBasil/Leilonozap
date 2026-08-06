import React from 'react';
import { Check, Circle, Dot } from 'lucide-react';

// 🗺️ Linha do tempo do Roadmap 2026 — de onde viemos, onde estamos e até dezembro.
// ⚠️ Só marcos operacionais: proibido valor em R$, projeção e "investimento".
const MARCOS = [
  {
    periodo: 'Ago/2024',
    estado: 'concluido',
    titulo: 'MVP validado',
    texto:
      'Mais de 600 produtos comercializados via WhatsApp, Facebook e OLX, com mais de 60% de giro rápido. Validação prática do modelo.',
  },
  {
    periodo: 'Nov/2025',
    estado: 'concluido',
    titulo: 'Primeira estrutura executiva',
    texto: 'Operação comercial organizada e primeiras vendas através da rede.',
  },
  {
    periodo: 'Jul/2026',
    estado: 'concluido',
    titulo: 'Praças físicas fechadas',
    texto:
      '1 distribuidor em Bangu, 3 lojas físicas em Bangu e 1 distribuidor no Recreio.',
  },
  {
    periodo: 'Ago/2026',
    estado: 'atual',
    titulo: 'Aplicativo 100% entregue',
    texto:
      'Plataforma concluída e em fase de pré-lançamento, com vendas estratégicas em curso para consolidar números antes da abertura oficial.',
  },
  {
    periodo: 'Dez/2026',
    estado: 'previsto',
    titulo: 'Lançamento oficial',
    texto:
      'Meta mínima do memorando: 300 licenciados ativos, 8 lojas físicas e distribuidor no Recreio em operação.',
  },
];

const SELO = {
  concluido: { rotulo: 'Concluído', Icone: Check },
  atual: { rotulo: 'Em curso', Icone: Circle },
  previsto: { rotulo: 'Previsto', Icone: Dot },
};

export default function ParceiroRoadmapLinha() {
  return (
    <div className="mt-14 border-t border-pc-borda pt-10">
      <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">
        Linha do tempo — execução até dezembro de 2026
      </p>

      <ol className="mt-6 space-y-4">
        {MARCOS.map((m) => {
          const { rotulo, Icone } = SELO[m.estado];
          const destaque = m.estado === 'atual';
          return (
            <li
              key={m.periodo}
              className={`border p-5 ${
                destaque
                  ? 'border-pc-ouro bg-pc-preto-2'
                  : 'border-pc-borda bg-pc-preto-2'
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-xs font-bold tracking-[0.15em] text-pc-ouro">
                  {m.periodo}
                </span>
                <span
                  className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${
                    m.estado === 'previsto'
                      ? 'border-pc-borda text-pc-tinta-fraca'
                      : 'border-pc-ouro text-pc-ouro'
                  }`}
                >
                  <Icone className="h-3 w-3" strokeWidth={2.5} />
                  {rotulo}
                </span>
              </div>
              <h4 className="mt-3 text-base font-bold text-pc-tinta sm:text-lg">{m.titulo}</h4>
              <p className="mt-2 text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">
                {m.texto}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}