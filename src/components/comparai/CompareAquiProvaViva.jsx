import React, { useState } from 'react';
import { Search, Loader2, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const EXEMPLOS = ['Fone de ouvido bluetooth', 'Air fryer 5 litros', 'Cadeira gamer'];

/**
 * 🔴 PROVA AO VIVO (19/08/2026, pedido do dono) — deixa o visitante testar o
 * motor de comparação de verdade, sem sair do site: digita qualquer produto,
 * o MESMO searchMarket usado nos produtos reais roda na hora, e o resultado
 * aparece aqui dentro. Não é encenação — é a busca real.
 */
export default function CompareAquiProvaViva() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [imagemAtiva, setImagemAtiva] = useState(null);

  const buscar = async (termo) => {
    const q = (termo ?? query).trim();
    if (q.length < 3) { setErro('Digite pelo menos 3 letras do produto.'); return; }
    setQuery(q);
    setLoading(true);
    setErro(null);
    setResultado(null);
    try {
      const r = await base44.functions.invoke('comparaiDemo', { query: q });
      const data = r?.data || r;
      if (typeof data?.searchApiImagemAtiva === 'boolean') setImagemAtiva(data.searchApiImagemAtiva);
      if (!data?.success) {
        setErro(data?.error || 'Não encontramos preços reais para comparar agora — tente um nome mais específico.');
      } else if (!data.found) {
        setErro('Não encontramos preços reais pra esse termo agora. Tente um nome mais específico, com marca/modelo.');
      } else {
        setResultado(data);
      }
    } catch (e) {
      setErro('A busca demorou demais. Tente novamente em alguns segundos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-white">Teste agora, ao vivo</h3>
      </div>
      <p className="text-sm text-gray-400 mb-1">
        Digite qualquer produto e veja o CompareAQUI buscar preços reais na hora — sem sair daqui.
      </p>
      {imagemAtiva !== null && (
        <p className={`text-[11px] mb-3 flex items-center gap-1.5 ${imagemAtiva ? 'text-emerald-400/90' : 'text-amber-300/90'}`}>
          {imagemAtiva ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
          {imagemAtiva
            ? 'Método principal (busca por foto do produto) ativo em toda a loja e leilão.'
            : 'Método principal por foto está DESATIVADO agora (falta configurar SEARCHAPI_KEY na Vercel) — rodando só por nome.'}
        </p>
      )}

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') buscar(); }}
          placeholder="Ex.: fone de ouvido bluetooth"
          className="min-h-[44px] flex-1 min-w-0 rounded-xl border border-white/12 bg-black/40 px-4 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => buscar()}
          disabled={loading || query.trim().length < 3}
          className="min-h-[44px] shrink-0 rounded-xl px-4 font-bold text-white disabled:opacity-40 flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Buscar
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {EXEMPLOS.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => buscar(ex)}
            disabled={loading}
            className="text-[11px] px-2.5 py-1 rounded-full border border-white/15 text-gray-300 hover:bg-white/10 disabled:opacity-40"
          >
            {ex}
          </button>
        ))}
      </div>

      {erro && (
        <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">{erro}</p>
      )}

      {resultado?.found && (
        <div className="space-y-3">
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2.5 text-center">
            <p className="text-[11px] text-emerald-300/80">Preço médio de mercado encontrado</p>
            <p className="text-2xl font-bold text-emerald-400">
              R$ {Number(resultado.avg).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10.5px] text-gray-500">{resultado.count} loja{resultado.count === 1 ? '' : 's'} comparada{resultado.count === 1 ? '' : 's'} em tempo real</p>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {(resultado.results || []).slice(0, 6).map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm hover:bg-white/[0.06] transition-colors"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-gray-300 truncate">{item.store}</span>
                  <span className="block text-[11px] text-gray-500 truncate">{item.productNameFound}</span>
                </span>
                <span className="shrink-0 flex items-center gap-1.5 font-bold text-white">
                  R$ {Number(item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  <ExternalLink className="w-3 h-3 text-gray-500" />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
