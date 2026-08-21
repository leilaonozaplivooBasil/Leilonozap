import React, { useEffect, useState } from 'react';
import { money } from '@/lib/format';
import { plataforma } from '@/api/plataformaClient';
import { buscarRegiao } from '@/lib/regiaoInteligenciaCache';
import { MapPin, Users2, TrendingUp, Network, Loader2 } from 'lucide-react';

const num = (n) => Number(n || 0).toLocaleString('pt-BR');

// Inteligência da região do endereço cadastrado (habitantes, potencial, afiliações).
// Robusto: não quebra se não tiver CEP ou se a API externa falhar.
export default function RegiaoCard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const cep = (user?.address_zip_code || user?.cep || '').replace(/\D/g, '');
  const cidade = user?.address_city || '';
  const uf = user?.address_state || '';

  // 🛰️ Uma consulta por região a cada 2 minutos, no máximo. O porteiro
  // (regiaoInteligenciaCache) guarda a resposta, junta pedidos simultâneos e
  // dá espera crescente quando a API recusa — era daqui que vinha a rajada
  // que estourava o limite e mostrava o alerta vermelho sobre o painel.
  // As dependências agora são os VALORES (cep/cidade/uf), não o objeto do
  // usuário: antes, qualquer re-render do painel podia pedir tudo de novo.
  useEffect(() => {
    if (!cep && !cidade) { setLoading(false); setData({ available: false }); return; }
    let alive = true;
    buscarRegiao(plataforma, { cep, cidade, uf }).then((r) => {
      if (!alive) return;
      setData(r);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [cep, cidade, uf]);

  if (loading) return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-5 mb-6 flex items-center gap-2 text-gray-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Carregando inteligência da região…</div>
  );
  if (!data?.available) return (
    <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-2xl p-4 mb-6 text-sm text-gray-400 flex items-center gap-2">
      <MapPin className="w-4 h-4" /> {data?.motivo || 'Cadastre seu CEP em Empresa / Perfil pra ver a inteligência da sua região.'}
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-indigo-900/30 to-gray-900 border border-indigo-500/25 rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 text-indigo-300 font-bold mb-3"><MapPin className="w-4 h-4" /> Inteligência da Região — {data.cidade}{data.uf ? `/${data.uf}` : ''}</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-0.5"><Users2 className="w-3.5 h-3.5" /> Habitantes</div>
          <div className="text-2xl font-black text-white">{data.habitantes != null ? num(data.habitantes) : '—'}</div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-0.5"><TrendingUp className="w-3.5 h-3.5" /> Potencial de venda <span className="text-[10px] text-gray-600">(mês)</span></div>
          <div className="text-2xl font-black text-green-400">{data.potencial_venda != null ? money(data.potencial_venda) : '—'}</div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-0.5"><Network className="w-3.5 h-3.5" /> Afiliações na região</div>
          <div className="text-2xl font-black text-indigo-300">{num(data.afiliacoes)}</div>
        </div>
      </div>
      {data.premissas && <div className="text-[11px] text-gray-500 mt-3">Estimativa: {data.premissas.penetracao_pct}% da população × ticket de {money(data.premissas.ticket)}.</div>}
    </div>
  );
}