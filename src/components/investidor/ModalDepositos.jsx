// 🧾 MODAL DE DEPÓSITOS E CARTEIRAS — DIR-196 (03/10/2026)
//
// Dono: "preciso de um modal para ver todos os depósitos e entender tudo que a
// plataforma está falando: qual o momento do dinheiro, e principalmente quanto
// de carteira dentro da operação está parado para compra, para eu virar em
// produto."
//
// Duas abas sobre o mesmo dado (painel_depositos, no banco):
//   • Carteiras — pessoa a pessoa: depositou, gastou, reservou, PAROU, bloqueado.
//     "Parado" é dinheiro que já é da empresa, na carteira do cliente, esperando
//     produto: é a verba que vira mercadoria.
//   • Depósitos — um por um, com o MOMENTO do dinheiro: aguardando pagamento,
//     creditado na carteira, bloqueado por contestação, dinheiro saiu no gateway…
import React, { useEffect, useMemo, useState } from 'react';
import { fmtBR } from '@/lib/money';
import { X, Search, Phone, MessageCircle, Wallet, PiggyBank, ShoppingBag, Gavel, ShieldAlert, Loader2 } from 'lucide-react';

const moeda = (v) => `R$ ${fmtBR(Number(v) || 0)}`;
const soDigitos = (v) => String(v || '').replace(/\D/g, '');
const quando = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
const dia = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—');

// O momento do dinheiro, em uma frase que o dono lê sem precisar de glossário.
export const MOMENTOS = {
  creditado: { rotulo: 'Na carteira do cliente', cor: '#34D399', passo: 4 },
  bloqueado: { rotulo: 'Bloqueado por contestação', cor: '#F87171', passo: 4 },
  dinheiro_saiu_sem_bloqueio: { rotulo: 'Dinheiro saiu no gateway e segue na carteira', cor: '#EF4444', passo: 4 },
  creditado_sem_conferencia: { rotulo: 'Creditado, ainda não conferido no gateway', cor: '#9CA3AF', passo: 3 },
  creditado_sem_pagamento: { rotulo: 'Creditado sem pagamento no gateway', cor: '#F87171', passo: 4 },
  aguardando_pagamento: { rotulo: 'Aguardando pagamento', cor: '#FBBF24', passo: 1 },
  cancelado: { rotulo: 'Cancelado, não entrou', cor: '#6B7280', passo: 0 },
  outro: { rotulo: 'Situação não classificada', cor: '#6B7280', passo: 0 },
};
const SITUACAO_GATEWAY = {
  liberado: 'liberado', retido: 'retido', devolvido: 'devolvido', devolvido_parcial: 'devolvido em parte', chargeback: 'contestado',
  disputa: 'em disputa', alterado: 'alterado após aprovação', cancelado: 'cancelado', pendente: 'pendente', desconhecido: 'não reconhecido', nao_conferido: 'não conferido',
};
const PASSOS = ['Pedido', 'Pago no gateway', 'Liberado', 'Conferido', 'Na carteira'];

function Passos({ momento }) {
  const m = MOMENTOS[momento] || MOMENTOS.outro;
  const ruim = ['bloqueado', 'dinheiro_saiu_sem_bloqueio', 'creditado_sem_pagamento', 'cancelado'].includes(momento);
  return (
    <ol className="flex items-center gap-1" aria-label="Momento do dinheiro">
      {PASSOS.map((p, i) => (
        <li key={p} title={p} className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: i <= m.passo ? (ruim && i === m.passo ? m.cor : '#34D399') : '#374151' }} />
          {i < PASSOS.length - 1 && <span className="inline-block w-3 h-px" style={{ background: i < m.passo ? '#34D399' : '#374151' }} />}
        </li>
      ))}
    </ol>
  );
}

function Tile({ icon: Icon, rotulo, valor, detalhe, cor = 'text-white', destaque = false, teste }) {
  return (
    <div className={`rounded-xl border p-3 ${destaque ? 'border-amber-400/40 bg-amber-400/10' : 'border-white/10 bg-white/[0.03]'}`} data-teste={teste}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400"><Icon className="w-3 h-3" /> {rotulo}</div>
      <div className={`mt-1 text-lg sm:text-xl font-black tabular-nums ${cor}`}>{valor}</div>
      {detalhe && <div className="text-[11px] text-gray-400">{detalhe}</div>}
    </div>
  );
}

export default function ModalDepositos({ aberto, aba, onAba, onFechar, dados, carregando }) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  useEffect(() => {
    if (!aberto) return undefined;
    const aoTeclar = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', aoTeclar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', aoTeclar); document.body.style.overflow = overflow; };
  }, [aberto, onFechar]);

  const t = dados?.totais || {};
  const carteiras = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (dados?.carteiras || []).filter((c) => !q || String(c.nome || '').toLowerCase().includes(q) || soDigitos(c.telefone).includes(soDigitos(q)));
  }, [dados, busca]);
  const depositos = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (dados?.depositos || []).filter((d) => (filtro === 'todos' || d.momento === filtro) && (!q || String(d.nome || '').toLowerCase().includes(q) || String(d.payment_id || '').includes(q)));
  }, [dados, busca, filtro]);
  const contagem = useMemo(() => {
    const c = {};
    for (const d of dados?.depositos || []) c[d.momento] = (c[d.momento] || 0) + 1;
    return c;
  }, [dados]);
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-6 nz-tela-cheia" role="dialog" aria-modal="true" aria-label="Depósitos e carteiras" onClick={onFechar} data-teste="modal-depositos">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl border border-white/10 bg-gray-950 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-gray-950/95 px-4 py-3 backdrop-blur">
          <div>
            <h2 className="text-lg font-black text-white">Depósitos e carteiras</h2>
            <p className="text-xs text-gray-400">O dinheiro depositado, um por um, e onde cada real está agora.</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-xl border border-white/10 p-2 text-gray-300 hover:bg-white/10" data-teste="fechar-modal-depositos"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2" data-teste="depositos-totais">
            <Tile icon={Wallet} rotulo="Depositado" valor={moeda(t.depositado)} detalhe={`${t.depositantes || 0} pessoas · pago no gateway`} />
            <Tile icon={ShoppingBag} rotulo="Virou compra" valor={moeda(t.gasto)} detalhe="arremates, loja e PDV pagos com saldo" cor="text-sky-300" />
            <Tile icon={Gavel} rotulo="Reservado em lances" valor={moeda(t.reservado)} detalhe="preso em leilões ativos" cor="text-emerald-300" />
            <Tile icon={PiggyBank} rotulo="Parado, para virar produto" valor={moeda(t.parado)} detalhe={`${t.pessoas_com_saldo || 0} pessoas com saldo`} cor="text-amber-200" destaque teste="tile-parado" />
            <Tile icon={ShieldAlert} rotulo="Bloqueado" valor={moeda(t.bloqueado)} detalhe="contestação aberta no gateway" cor={Number(t.bloqueado) > 0 ? 'text-red-300' : 'text-white'} />
          </div>
          <p className="text-xs text-gray-400">"Parado" é dinheiro que já entrou pelo gateway, está na carteira do cliente e ainda não virou produto. É a verba que você pode transformar em mercadoria hoje.</p>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-white/10 p-0.5" role="tablist">
              {[['carteiras', `Carteiras · ${(dados?.carteiras || []).length}`], ['depositos', `Depósitos · ${(dados?.depositos || []).length}`]].map(([k, r]) => (
                <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => onAba(k)} data-teste={`aba-${k}`}
                  className={`rounded-lg px-3 py-1.5 text-sm font-bold ${aba === k ? 'bg-amber-400/20 text-amber-200' : 'text-gray-400 hover:text-white'}`}>{r}</button>
              ))}
            </div>
            <label className="relative flex-1 min-w-[12rem]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, telefone ou nº do pagamento" className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-400/50" />
            </label>
            {carregando && <Loader2 className="w-4 h-4 animate-spin text-amber-300" />}
          </div>

          {aba === 'carteiras' && (
            <ul className="space-y-2" data-teste="lista-carteiras">
              {carteiras.map((c) => {
                const tel = soDigitos(c.telefone);
                return (
                  <li key={c.buyer_id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{c.nome || 'Sem nome'}</p>
                        <p className="text-[11px] text-gray-500">{c.depositos} depósito(s) · último em {dia(c.ultimo_deposito)} · último acesso {c.ultimo_login ? dia(c.ultimo_login) : 'nunca'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">Parado</p>
                        <p className="tabular-nums text-xl font-black text-amber-200">{moeda(c.parado)}</p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="rounded-lg bg-white/5 px-2 py-1"><span className="text-gray-500">Depositou</span><br /><span className="tabular-nums font-bold text-white">{moeda(c.depositado)}</span></div>
                      <div className="rounded-lg bg-white/5 px-2 py-1"><span className="text-gray-500">Virou compra</span><br /><span className="tabular-nums font-bold text-sky-200">{moeda(c.gasto)}</span> <span className="text-gray-500">· {c.compras}</span></div>
                      <div className="rounded-lg bg-white/5 px-2 py-1"><span className="text-gray-500">Reservado</span><br /><span className="tabular-nums font-bold text-emerald-200">{moeda(c.reservado)}</span></div>
                      <div className={`rounded-lg px-2 py-1 ${Number(c.bloqueado) > 0 ? 'bg-red-400/10' : 'bg-white/5'}`}><span className="text-gray-500">Bloqueado</span><br /><span className={`tabular-nums font-bold ${Number(c.bloqueado) > 0 ? 'text-red-200' : 'text-white'}`}>{moeda(c.bloqueado)}</span></div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {tel && <a href={`tel:+55${tel}`} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-gray-200 hover:bg-white/10"><Phone className="w-3 h-3" /> {c.telefone}</a>}
                      {tel && <a href={`https://wa.me/55${tel}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-emerald-200 hover:bg-emerald-400/20"><MessageCircle className="w-3 h-3" /> WhatsApp</a>}
                      {c.email && <span className="text-gray-500 truncate max-w-[16rem]">{c.email}</span>}
                    </div>
                  </li>
                );
              })}
              {carteiras.length === 0 && <li className="text-sm text-gray-500">Nenhuma carteira para mostrar.</li>}
            </ul>
          )}

          {aba === 'depositos' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5" data-teste="filtros-momento">
                {[['todos', 'Todos'], ...Object.entries(MOMENTOS).filter(([k]) => contagem[k]).map(([k, v]) => [k, v.rotulo])].map(([k, r]) => (
                  <button key={k} type="button" onClick={() => setFiltro(k)} className={`rounded-full border px-2.5 py-1 text-xs ${filtro === k ? 'border-amber-400/50 bg-amber-400/15 text-amber-200' : 'border-white/10 text-gray-400 hover:text-white'}`}>
                    {r}{k !== 'todos' ? ` · ${contagem[k]}` : ''}
                  </button>
                ))}
              </div>
              <ul className="space-y-2" data-teste="lista-depositos">
                {depositos.map((d) => {
                  const m = MOMENTOS[d.momento] || MOMENTOS.outro;
                  return (
                    <li key={d.sale_id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{d.nome || 'Sem nome'} <span className="text-xs font-medium text-gray-500">· {d.kind === 'operacao_deposit' ? 'operação' : 'carteira'} · {d.meio || '—'}</span></p>
                          <p className="text-xs" style={{ color: m.cor }}>{m.rotulo}</p>
                        </div>
                        <div className="text-right">
                          <p className="tabular-nums font-black text-white">{moeda(d.valor)}</p>
                          <p className="text-[11px] text-gray-500">{quando(d.quando)}{d.liquido ? ` · líquido ${moeda(d.liquido)}` : ''}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                        <Passos momento={d.momento} />
                        <span className="rounded-full border border-white/10 px-2 py-0.5">gateway: {SITUACAO_GATEWAY[d.situacao] || d.situacao}</span>
                        <span className="rounded-full border border-white/10 px-2 py-0.5">aqui: {d.status}</span>
                        {Number(d.bloqueado) > 0 && <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-red-200">bloqueado {moeda(d.bloqueado)}</span>}
                        {d.payment_id && <span className="text-gray-600">pagamento {d.payment_id}</span>}
                      </div>
                    </li>
                  );
                })}
                {depositos.length === 0 && <li className="text-sm text-gray-500">Nenhum depósito neste filtro.</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
