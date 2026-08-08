import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { User as UserIcon, Trash2, Loader2, BadgePercent } from 'lucide-react';

// Seletor "Quem está levando (licença)" do balcão.
// Mostra a ÁRVORE INTEIRA abaixo do balcão e, ao digitar, também gente de outras
// estruturas — nesse caso avisando na tela pra onde vai a comissão.
export default function SeletorLicenca({ ownerId, comprador, onSelect, onClear }) {
  const [q, setQ] = useState('');
  const [rede, setRede] = useState([]);
  const [outras, setOutras] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async (termo) => {
    if (!ownerId) return;
    setCarregando(true);
    try {
      const r = await base44.functions.invoke('pdvNetworkTree', { ownerId, q: termo });
      setRede(r?.minha_rede || []);
      setOutras(r?.outras_estruturas || []);
    } catch (_) { /* balcão continua funcionando sem o seletor */ }
    setCarregando(false);
  }, [ownerId]);

  useEffect(() => {
    if (comprador) return;
    const t = setTimeout(() => carregar(q), 300);
    return () => clearTimeout(t);
  }, [q, comprador, carregar]);

  if (comprador) {
    return (
      <div className="mb-3">
        <label className="text-[11px] text-gray-500 flex items-center gap-1.5 mb-1"><UserIcon className="w-3 h-3" /> Quem está levando (licença)</label>
        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
          <span className="text-sm text-green-800 truncate">
            {comprador.full_name}
            <span className="text-[10px] text-green-700/80"> · {comprador.nivel_nome} · {comprador.desconto_pct}% de desconto</span>
          </span>
          <button onClick={onClear} className="text-gray-500 hover:text-red-500 min-h-[44px] px-2"><Trash2 className="w-4 h-4" /></button>
        </div>
        {comprador.estrutura && (
          <p className="text-[10px] text-orange-600 mt-1">
            É da estrutura de {comprador.estrutura} — desconto aplicado aqui, o restante fica neste balcão.
          </p>
        )}
      </div>
    );
  }

  const Linha = ({ p, deOutra }) => (
    <button
      onClick={() => { onSelect(deOutra ? p : { ...p, estrutura: null }); setQ(''); }}
      className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-nz-cinza-fundo text-sm border-b border-nz-borda last:border-0 flex items-center justify-between gap-2"
    >
      <div className="min-w-0">
        <div className="truncate font-medium">{p.full_name || p.email}</div>
        <div className="text-[10px] text-gray-500 truncate">{p.email}{deOutra && p.estrutura ? ` · estrutura de ${p.estrutura}` : ''}</div>
      </div>
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-700 font-bold shrink-0 flex items-center gap-1">
        <BadgePercent className="w-3 h-3" />{p.desconto_pct}%
      </span>
    </button>
  );

  return (
    <div className="mb-3">
      <label className="text-[11px] text-gray-500 flex items-center gap-1.5 mb-1"><UserIcon className="w-3 h-3" /> Quem está levando (licença) — opcional</label>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtrar por nome, e-mail ou cargo…"
        className="w-full bg-white border border-nz-borda rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500 mb-1"
      />
      <div className="border border-nz-borda rounded-lg max-h-64 overflow-y-auto bg-white">
        {carregando && <div className="px-3 py-3 text-xs text-gray-500 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Carregando a rede…</div>}
        {!carregando && !rede.length && !outras.length && (
          <div className="px-3 py-3 text-xs text-gray-500">Nenhum login encontrado.</div>
        )}
        {rede.length > 0 && <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 bg-nz-cinza-fundo">Minha rede</div>}
        {rede.map((p) => <Linha key={p.id} p={p} />)}
        {outras.length > 0 && <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-orange-600 bg-nz-fogo-fundo">Outras estruturas</div>}
        {outras.map((p) => <Linha key={p.id} p={p} deOutra />)}
      </div>
      <p className="text-[10px] text-gray-500 mt-1">Sem seleção, a venda fica na casa.</p>
    </div>
  );
}