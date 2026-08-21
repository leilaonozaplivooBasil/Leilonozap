import React, { useState } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet, ChevronDown, ChevronUp } from 'lucide-react';

const fmt = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const TIPO_LABEL = {
  deposit: { texto: 'Depósito', cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  purchase: { texto: 'Compra', cls: 'text-red-300 bg-red-500/15 border-red-500/30' },
  sale: { texto: 'Venda recebida', cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  withdrawal: { texto: 'Saque', cls: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
  bid: { texto: 'Lance', cls: 'text-gray-300 bg-gray-500/15 border-gray-500/30' },
  bid_hold: { texto: 'Lance reservado', cls: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
  bid_release: { texto: 'Lance devolvido', cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  bid_settle: { texto: 'Arremate confirmado', cls: 'text-gray-300 bg-gray-500/15 border-gray-500/30' },
};

/**
 * 🔎 WalletExtractAdmin — extrato completo da carteira de QUALQUER usuário, aberto
 * direto do cartão de identificação na árvore. Antes disso, o admin tinha que abrir
 * o Mercado Pago à parte pra achar o depósito e não tinha nenhuma tela com o
 * histórico de lances/compras/saques daquela pessoa específica.
 * Usa os mesmos endpoints da carteira do próprio usuário (getMyWallet /
 * getDigitalWalletHistory), passando actor_id = admin logado — os dois endpoints
 * verificam no banco que quem está pedindo é admin de verdade antes de liberar.
 */
export default function WalletExtractAdmin({ userId }) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [carteira, setCarteira] = useState(null);
  const [transacoes, setTransacoes] = useState([]);

  const abrir = async () => {
    const novoEstado = !aberto;
    setAberto(novoEstado);
    if (!novoEstado || carteira) return; // já carregado, só reabrindo

    let admin = null;
    try { admin = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { admin = null; }
    if (!admin?.id) { setErro('Sessão de admin expirada.'); return; }

    setCarregando(true);
    setErro(null);
    try {
      const [walletRes, historyRes] = await Promise.all([
        plataforma.functions.invoke('getMyWallet', { user_id: userId, actor_id: admin.id }),
        plataforma.functions.invoke('getDigitalWalletHistory', { user_id: userId, actor_id: admin.id }),
      ]);
      const w = walletRes?.data || walletRes;
      const h = historyRes?.data || historyRes;
      if (!w?.success) throw new Error(w?.error || 'Falha ao buscar carteira');
      setCarteira(w);
      setTransacoes(Array.isArray(h?.transactions) ? h.transactions : []);
    } catch (e) {
      setErro(e?.message || 'Erro ao carregar extrato');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-gray-700 bg-gray-800/40">
      <button
        type="button"
        onClick={abrir}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 rounded-xl"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <Wallet className="w-4 h-4 text-emerald-400" />
          Extrato completo da carteira
        </span>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {aberto && (
        <div className="px-4 pb-4">
          {carregando && (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando extrato…
            </div>
          )}

          {erro && !carregando && (
            <p className="text-sm text-red-400 py-2">{erro}</p>
          )}

          {carteira && !carregando && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-2.5">
                  <p className="text-[10px] uppercase text-gray-500">Disponível</p>
                  <p className="text-sm font-bold text-emerald-400">{fmt(carteira.saldo_disponivel)}</p>
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-2.5">
                  <p className="text-[10px] uppercase text-gray-500">Reservado (lances)</p>
                  <p className="text-sm font-bold text-amber-400">{fmt(carteira.saldo_reservado)}</p>
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-2.5">
                  <p className="text-[10px] uppercase text-gray-500">Comissões</p>
                  <p className="text-sm font-bold text-blue-400">{fmt(carteira.commission_balance)}</p>
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-2.5">
                  <p className="text-[10px] uppercase text-gray-500">A liberar</p>
                  <p className="text-sm font-bold text-gray-300">{fmt(carteira.saldo_a_liberar)}</p>
                </div>
              </div>

              <p className="text-[10.5px] uppercase tracking-wider text-gray-400 font-bold mb-2">
                Últimas movimentações ({transacoes.length})
              </p>
              <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
                {transacoes.length === 0 && (
                  <p className="text-xs text-gray-500 py-2">Nenhuma movimentação encontrada.</p>
                )}
                {transacoes.map((t) => {
                  const tipo = TIPO_LABEL[t.type] || { texto: t.type, cls: 'text-gray-300 bg-gray-500/15 border-gray-500/30' };
                  const valor = Number(t.amount) || 0;
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-700/60 px-2.5 py-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${tipo.cls}`}>{tipo.texto}</span>
                          <span className="text-gray-300 truncate">{t.title}</span>
                        </div>
                        <p className="text-[10.5px] text-gray-500 mt-0.5">{fmtDate(t.date)}{t.source ? ` · ${t.source}` : ''}</p>
                        {t.type === 'bid' && t.frete_amount > 0 && (
                          <p className="text-[10.5px] text-gray-500">inclui frete de {fmt(t.frete_amount)}{t.frete_label ? ` — ${t.frete_label}` : ''}</p>
                        )}
                      </div>
                      {t.type !== 'bid' && t.type !== 'bid_settle' && (
                        <span className={`font-bold whitespace-nowrap ${valor >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {valor >= 0 ? '+' : ''}{fmt(valor)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
