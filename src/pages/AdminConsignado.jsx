import React, { useState, useEffect } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { money } from '@/lib/format';
import { toast } from 'sonner';
import { Handshake, Loader2, Check, X, RefreshCw, CalendarClock } from 'lucide-react';

// Painel de consignado: aprovar, recusar e acompanhar quem está com mercadoria
// da casa na mão. Aprovar é o momento em que a mercadoria sai de verdade.
export default function AdminConsignado() {
  const [user, setUser] = useState(null);
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busy, setBusy] = useState('');
  const [filtro, setFiltro] = useState('pendente');

  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    setUser(u);
    if (u?.id) carregar(u, 'pendente'); else setCarregando(false);
  }, []);

  const carregar = async (u = user, status = filtro) => {
    setCarregando(true);
    const r = await plataforma.functions.invoke('manageConsignacao', {
      actorId: u.id, action: 'list', escopo: 'todos', status: status || undefined,
    });
    if (r?.success) setLista(r.consignacoes || []);
    else toast.error(r?.error || 'Falha ao carregar');
    setCarregando(false);
  };

  const agir = async (c, action) => {
    setBusy(c.id);
    const r = await plataforma.functions.invoke('manageConsignacao', { actorId: user.id, action, consignacao_id: c.id });
    if (r?.success) {
      toast.success(action === 'aprovar' ? `Aprovado. Dívida gerada: ${money(r.divida_gerada)}` : 'Pedido recusado');
      carregar();
    } else toast.error(r?.error || 'Falha');
    setBusy('');
  };

  if (!user) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">Faça login.</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-950 border-b border-gray-800 px-4 sm:px-6 py-4 sticky top-16 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center"><Handshake className="w-5 h-5 text-amber-400" /></div>
            <div>
              <h1 className="text-xl font-black leading-none">Consignado</h1>
              <p className="text-xs text-gray-500 mt-0.5">Mercadoria da casa na mão da rede</p>
            </div>
          </div>
          <button onClick={() => carregar()} className="min-h-[44px] flex items-center gap-1.5 px-3 rounded-lg text-sm text-gray-300 hover:bg-gray-800 border border-gray-700"><RefreshCw className="w-4 h-4" /> Atualizar</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-2 mb-5 overflow-x-auto">
          {[['pendente', 'Aguardando'], ['aprovada', 'Ativos'], ['devolvida', 'Devolvidos'], ['recusada', 'Recusados']].map(([k, label]) => (
            <button
              key={k}
              onClick={() => { setFiltro(k); carregar(user, k); }}
              className={`min-h-[44px] px-4 rounded-lg text-sm font-semibold whitespace-nowrap ${filtro === k ? 'bg-amber-600' : 'bg-gray-800 text-gray-300'}`}
            >{label}</button>
          ))}
        </div>

        {carregando ? (
          <div className="flex items-center gap-2 text-gray-400 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Carregando…</div>
        ) : !lista.length ? (
          <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl p-8 text-center text-gray-400">Nada por aqui.</div>
        ) : (
          <div className="space-y-3">
            {lista.map((c) => {
              const itens = Array.isArray(c.itens_json) ? c.itens_json : [];
              const dias = c.prazo_em ? Math.ceil((new Date(c.prazo_em) - Date.now()) / 86400000) : null;
              return (
                <div key={c.id} className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">{c.owner_nome || c.owner_id}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{itens.length} item(ns) · custo {money(c.valor_total)}</p>
                      {c.status === 'aprovada' && dias !== null && (
                        <p className={`text-[11px] mt-1 flex items-center gap-1 ${dias < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          <CalendarClock className="w-3 h-3" /> {dias < 0 ? 'Prazo vencido' : `${dias} dia(s) restantes`}
                        </p>
                      )}
                    </div>
                    {c.status === 'pendente' && (
                      <div className="flex gap-2">
                        <button onClick={() => agir(c, 'recusar')} disabled={busy === c.id} className="min-h-[44px] px-3 rounded-lg border border-gray-600 text-sm flex items-center gap-1.5"><X className="w-4 h-4" /> Recusar</button>
                        <button onClick={() => agir(c, 'aprovar')} disabled={busy === c.id} className="min-h-[44px] px-4 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-bold flex items-center gap-1.5">
                          {busy === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Aprovar
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 space-y-1">
                    {itens.slice(0, 4).map((it, i) => (
                      <p key={i} className="text-xs text-gray-400 truncate">{it.qty}x {it.title} · {money(it.custo_unitario)}</p>
                    ))}
                    {itens.length > 4 && <p className="text-xs text-gray-500">+{itens.length - 4} item(ns)</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}