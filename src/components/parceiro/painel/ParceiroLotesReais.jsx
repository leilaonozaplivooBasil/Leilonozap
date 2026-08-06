import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizarLoteRecebido } from '@/lib/loteParceiro';
import ParceiroLoteLinha from './ParceiroLoteLinha';
import ParceiroLoteDetalheModal from './ParceiroLoteDetalheModal';

// 📦 Lotes reais que a operação já arrematou — MESMA fonte da página interna
// Estoque de Lotes (entidade LoteRecebido, mais recente primeiro). Leitura pura:
// nenhum botão de salvar, arrematar, gerar produto ou excluir.
export default function ParceiroLotesReais() {
  const [lotes, setLotes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [loteAberto, setLoteAberto] = useState(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const dados = await base44.entities.LoteRecebido.list('-created_date', 30);
        // 🙈 Vitrine do parceiro: só entram lotes com economia real sobre o valor de
        // mercado. Lote sem margem (0% ou negativo) fica FORA daqui — nada é alterado
        // nem removido do Estoque de Lotes, é apenas um filtro de exibição.
        const comMargem = (dados || [])
          .map(normalizarLoteRecebido)
          .filter((l) => typeof l.economiaPct === 'number' && l.economiaPct > 0);
        if (ativo) setLotes(comMargem);
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
        Lotes que já arrematamos
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-pc-tinta-fraca">
        Compras reais da operação, atualizadas conforme novos lotes entram. Toque em um lote
        para ver custo, grades, categorias e itens.
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