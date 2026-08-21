import React, { useState, useEffect } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { money } from '@/lib/format';
import { toast } from 'sonner';
import { Handshake, Loader2, CalendarClock, Undo2, AlertTriangle } from 'lucide-react';

// Cartão "Consignado em minha mão": o que ele está devendo, quanto tempo falta
// e o botão de devolver o que não vendeu. Só leitura + devolução — a cobrança
// acontece sozinha na venda.
export default function ConsignadoCard({ user }) {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [devolvendo, setDevolvendo] = useState('');
  const [confirmar, setConfirmar] = useState(null);

  const carregar = async () => {
    if (!user?.id) { setCarregando(false); return; }
    setCarregando(true);
    const r = await plataforma.functions.invoke('manageConsignacao', { actorId: user.id, action: 'list', escopo: 'meu' });
    setLista((r?.consignacoes || []).filter((c) => ['pendente', 'aprovada'].includes(c.status)));
    setCarregando(false);
  };

  useEffect(() => { carregar(); }, [user?.id]); // eslint-disable-line

  const devolver = async (c) => {
    setDevolvendo(c.id);
    const r = await plataforma.functions.invoke('manageConsignacao', { actorId: user.id, action: 'devolver', consignacao_id: c.id });
    if (r?.success) { toast.success(`Devolvido. Dívida baixada: ${money(r.divida_baixada)}`); carregar(); }
    else toast.error(r?.error || 'Não foi possível devolver');
    setDevolvendo(''); setConfirmar(null);
  };

  if (carregando) {
    return <div className="flex items-center gap-2 text-gray-400 py-4 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Carregando consignado…</div>;
  }
  if (!lista.length) return null;

  const devendo = lista.filter((c) => c.status === 'aprovada').reduce((s, c) => s + (Number(c.valor_total) - Number(c.valor_quitado || 0)), 0);

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <Handshake className="w-5 h-5 text-amber-400" />
        <h3 className="font-black text-base">Consignado em minha mão</h3>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Mercadoria que ainda não é sua. A cada venda, o custo é cobrado na hora — em dinheiro,
        sai do seu saldo; em PIX ou cartão, já vem descontado.
      </p>

      {devendo > 0 && (
        <p className="text-sm mb-3">Em aberto: <b className="text-amber-300">{money(devendo)}</b></p>
      )}

      <div className="space-y-2">
        {lista.map((c) => {
          const dias = c.prazo_em ? Math.ceil((new Date(c.prazo_em) - Date.now()) / 86400000) : null;
          const vencido = dias !== null && dias < 0;
          return (
            <div key={c.id} className="rounded-lg bg-gray-900/60 border border-gray-700 p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {(Array.isArray(c.itens_json) ? c.itens_json.length : 0)} item(ns) · {money(Number(c.valor_total) - Number(c.valor_quitado || 0))} em aberto
                </p>
                {c.status === 'pendente' ? (
                  <p className="text-[11px] text-gray-400 mt-0.5">Aguardando aprovação</p>
                ) : (
                  <p className={`text-[11px] mt-0.5 flex items-center gap-1 ${vencido ? 'text-red-400' : 'text-gray-400'}`}>
                    {vencido ? <AlertTriangle className="w-3 h-3" /> : <CalendarClock className="w-3 h-3" />}
                    {vencido ? 'Prazo vencido — acerte ou devolva' : `${dias} dia(s) para vender ou devolver`}
                  </p>
                )}
              </div>
              {c.status === 'aprovada' && (
                <button
                  onClick={() => setConfirmar(c)}
                  disabled={devolvendo === c.id}
                  className="min-h-[44px] px-3 rounded-lg text-xs font-bold border border-gray-600 hover:bg-gray-800 flex items-center gap-1.5"
                >
                  {devolvendo === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />} Devolver
                </button>
              )}
            </div>
          );
        })}
      </div>

      {confirmar && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-sm">
            <h4 className="font-black mb-2">Devolver o que não vendeu?</h4>
            <p className="text-sm text-gray-400 mb-4">
              As peças que ainda estão com você voltam para o estoque da casa e essa parte da dívida some.
              O que já foi vendido continua quitado.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmar(null)} className="flex-1 min-h-[44px] rounded-lg border border-gray-600 text-sm">Cancelar</button>
              <button onClick={() => devolver(confirmar)} disabled={!!devolvendo} className="flex-1 min-h-[44px] rounded-lg bg-amber-600 hover:bg-amber-700 text-sm font-bold">
                {devolvendo ? 'Devolvendo…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}