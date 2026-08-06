import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizarLoteRecebido } from '@/lib/loteParceiro';
import ParceiroLoteLinha from './ParceiroLoteLinha';
import ParceiroLoteDetalheModal from './ParceiroLoteDetalheModal';

// 📦 Os 5 melhores lotes REAIS do Mercado Livre que a operação já arrematou —
// mesma fonte da página interna Leilões Arrematados (entidade LoteRecebido).
// Leitura pura: nenhum botão de salvar, arrematar, gerar produto ou excluir.
export default function ParceiroLotesReais() {
  const [lotes, setLotes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [loteAberto, setLoteAberto] = useState(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const dados = await base44.entities.LoteRecebido.list('-created_date', 50);
        // Só os lotes grandes de leilão do Mercado Livre (LOTE 58, 51, 46-48, 09/04).
        // Lotes pequenos de estoque (maquiagem, relógio) não entram na vitrine.
        const melhores = (dados || [])
          .filter((r) => (r.marketplace || r.origem) === 'Mercado Livre')
          .filter((r) => /^lote\s+(\d|arrematado)/i.test((r.nome_lote || '').trim()))
          .map(normalizarLoteRecebido)
          .filter((l) => l.itens.length > 0 && l.valorMercado > 0 && l.custoTotal > 0)
          .sort((a, b) => (b.economiaPct || 0) - (a.economiaPct || 0));
        if (ativo) setLotes(melhores);
      } catch (e) {
        console.debug('Lotes reais indisponíveis:', e?.message);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-pc-tinta sm:text-xl">
        Um pouco do que já arrematamos
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-pc-tinta-fraca">
        Lotes reais do Mercado Livre já comprados pela operação. Toque em um lote para ver o
        analisador completo: custo, grades, cenários de venda e item por item.
      </p>

      {carregando ? (
        <p className="mt-6 text-sm text-pc-tinta-fraca">Carregando lotes...</p>
      ) : lotes.length === 0 ? (
        <p className="mt-6 border border-pc-borda bg-pc-preto-2 p-4 text-sm text-pc-tinta-fraca">
          Nenhum lote disponível para consulta neste momento.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {lotes.map((lote) => (
            <ParceiroLoteLinha key={lote.id} lote={lote} onAbrir={setLoteAberto} />
          ))}
        </div>
      )}

      <ParceiroLoteDetalheModal lote={loteAberto} onFechar={() => setLoteAberto(null)} />
    </section>
  );
}