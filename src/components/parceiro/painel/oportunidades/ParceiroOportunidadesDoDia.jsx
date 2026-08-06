import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { normalizarLoteRecebido } from '@/lib/loteParceiro';
import OportunidadeCard from './OportunidadeCard';
import OportunidadeDetalheModal from './OportunidadeDetalheModal';

// 🌟 Oportunidades do Dia — vitrine SOMENTE LEITURA dos lotes que a operação
// publicou para comprar em conjunto. Nenhuma escrita acontece nesta tela.
export default function ParceiroOportunidadesDoDia({ onParticipar }) {
  const [oportunidades, setOportunidades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const dados = await base44.entities.LoteRecebido.filter(
        { publicado_parceiro: true },
        '-created_date',
        100
      );
      const agora = Date.now();
      const lista = (dados || [])
        .map((r) => ({
          ...normalizarLoteRecebido(r),
          dataLeilao: r.data_leilao || null,
          lanceEntrada: Number(r.lance_entrada) || 0,
          freteOportunidade: Number(r.frete_oportunidade) || 0,
          vagas: Number(r.vagas) || 0,
          observacaoParceiro: r.observacao_parceiro || null,
        }))
        .filter((o) => o.dataLeilao && new Date(o.dataLeilao).getTime() > agora)
        .sort((a, b) => new Date(a.dataLeilao) - new Date(b.dataLeilao));
      setOportunidades(lista);
    } catch (e) {
      console.debug('Oportunidades indisponíveis:', e?.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  // 📱 Recarrega ao voltar para o app (mobile congela timers em background).
  useEffect(() => {
    carregar();
    window.addEventListener('focus', carregar);
    window.addEventListener('visibilitychange', carregar);
    return () => {
      window.removeEventListener('focus', carregar);
      window.removeEventListener('visibilitychange', carregar);
    };
  }, [carregar]);

  return (
    <section>
      <h1 className="flex items-center gap-2 text-xl font-bold text-pc-tinta sm:text-2xl">
        <Sparkles className="h-5 w-5 text-pc-ouro" strokeWidth={1.8} />
        Oportunidades do dia
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pc-tinta-fraca">
        Lotes que a operação vai disputar nos próximos leilões. Toque em uma oportunidade para ver
        o analisador completo — custo, grades, categorias e cenários de venda — e o horário exato do
        lance.
      </p>

      {carregando ? (
        <p className="mt-8 text-sm text-pc-tinta-fraca">Carregando oportunidades...</p>
      ) : oportunidades.length === 0 ? (
        <p className="mt-8 border border-pc-borda bg-pc-preto-2 p-4 text-sm text-pc-tinta-fraca">
          Nenhuma oportunidade aberta neste momento. Assim que a operação publicar o próximo lote,
          ele aparece aqui com data e horário do leilão.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {oportunidades.map((o) => (
            <OportunidadeCard key={o.id} oportunidade={o} onAbrir={setAberta} />
          ))}
        </div>
      )}

      {aberta && (
        <OportunidadeDetalheModal
          oportunidade={aberta}
          onFechar={() => setAberta(null)}
          onParticipar={() => {
            setAberta(null);
            onParticipar?.();
          }}
        />
      )}
    </section>
  );
}