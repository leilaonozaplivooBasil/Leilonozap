import React, { useEffect, useMemo, useState } from 'react';
import { Handshake, Star, CalendarClock, MessageSquare, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { plataforma } from '@/api/plataformaClient';
import { listarTudo } from '@/lib/listarTudo';
import { agruparNegociacao, clientesDoEscopo, resumoDaNegociacao, ESTADO_FOLLOWUP } from '@/lib/negociacao';
import CrmNetworkQualificacaoModal from './CrmNetworkQualificacaoModal';

/**
 * 🤝 NEGOCIAÇÃO — seção da Top College.
 *
 * 23/09/2026 — pedido: aba "Negociação". As etapas são as do funil que já
 * existe (customers.purchase_status) — decisão do dono, nenhum campo novo. O
 * que esta aba acrescenta é ORDEM: dentro de cada etapa, follow-up vencido no
 * topo, depois hoje, depois quem nunca foi contatado. É a lista de "com quem
 * eu falo agora" (regra em src/lib/negociacao.js).
 *
 * Escopo: a régua do Método — cada um só a própria lista; super admin, todas.
 */
const hojeISO = () => {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const soData = (iso) => (iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—');

const COR_FOLLOWUP = {
  [ESTADO_FOLLOWUP.VENCIDO]: 'text-red-300', [ESTADO_FOLLOWUP.HOJE]: 'text-amber-300',
  [ESTADO_FOLLOWUP.FUTURO]: 'text-white/60', [ESTADO_FOLLOWUP.SEM]: 'text-white/40',
};
const ROTULO_FOLLOWUP = (c) => {
  if (c._followUp === ESTADO_FOLLOWUP.VENCIDO) return `venceu ${soData(c.follow_up_date)}`;
  if (c._followUp === ESTADO_FOLLOWUP.HOJE) return 'hoje';
  if (c._followUp === ESTADO_FOLLOWUP.FUTURO) return soData(c.follow_up_date);
  return 'sem follow-up';
};

export default function Negociacao({ currentUser, superAdmin = false }) {
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [qualificando, setQualificando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [movendo, setMovendo] = useState(null);
  const uid = currentUser?.id || null;
  const hoje = hojeISO();

  const carregar = async () => {
    setCarregando(true); setErro('');
    try { setClientes((await listarTudo(plataforma.entities.Customer)) || []); }
    catch { setErro('Não consegui carregar os clientes agora.'); }
    finally { setCarregando(false); }
  };
  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const colunas = useMemo(() => agruparNegociacao(clientesDoEscopo(clientes, { uid, superAdmin }), { hojeISO: hoje }), [clientes, uid, superAdmin, hoje]);
  const resumo = useMemo(() => resumoDaNegociacao(colunas), [colunas]);

  const salvarQualificacao = async (contato, quali) => {
    setSalvando(true);
    try {
      await plataforma.entities.Customer.update(contato.id, { qualificacao_network: quali });
      setClientes((l) => l.map((x) => (x.id === contato.id ? { ...x, qualificacao_network: quali } : x)));
      toast.success(`${contato.full_name || 'Contato'} qualificado`); setQualificando(null);
    } catch { toast.error('Não salvou a qualificação'); }
    finally { setSalvando(false); }
  };

  const mover = async (c, etapa) => {
    if (!etapa || etapa === (c.purchase_status || 'sem_compra')) return;
    setMovendo(c.id);
    try {
      await plataforma.entities.Customer.update(c.id, { purchase_status: etapa });
      setClientes((l) => l.map((x) => (x.id === c.id ? { ...x, purchase_status: etapa } : x)));
    } catch { toast.error('Não consegui mover'); }
    finally { setMovendo(null); }
  };

  const registrarContato = async (c) => {
    // o registro completo mora no CRM; aqui o gesto rápido: "falei hoje", e o follow-up sai da urgência
    setMovendo(c.id);
    try {
      await plataforma.entities.Customer.update(c.id, { last_contact: new Date().toISOString(), follow_up_date: null });
      setClientes((l) => l.map((x) => (x.id === c.id ? { ...x, last_contact: new Date().toISOString(), follow_up_date: null } : x)));
      toast.success('Contato registrado — marque o próximo follow-up pelo card do quadro');
    } catch { toast.error('Não registrou'); }
    finally { setMovendo(null); }
  };

  return (
    <div className="space-y-4" data-teste="negociacao">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            <Handshake className="w-5 h-5" /> Negociação
          </h2>
          <p className="text-sm text-white/60">Com quem você fala agora — por etapa, vencido no topo.</p>
        </div>
        <button type="button" onClick={carregar} disabled={carregando} className="rounded-md border border-white/15 px-3 py-2 text-white/70 hover:text-white disabled:opacity-50" data-teste="recarregar-negociacao">
          <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-teste="resumo-negociacao">
        <Numero rotulo="Em negociação" valor={resumo.total} />
        <Numero rotulo="Follow-up vencido" valor={resumo.vencidos} cor={resumo.vencidos ? 'text-red-300' : 'text-white'} />
        <Numero rotulo="Follow-up hoje" valor={resumo.hoje} cor={resumo.hoje ? 'text-amber-300' : 'text-white'} />
        <Numero rotulo="Sem qualificar" valor={resumo.semQualificar} />
      </div>

      {erro && <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200" data-teste="negociacao-erro">{erro}</p>}
      {carregando && !clientes.length && <p className="text-sm text-white/60 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> carregando…</p>}

      <div className="grid gap-3 md:grid-cols-3">
        {colunas.map((col) => (
          <div key={col.key} className="rounded-xl border border-white/10 p-2.5" style={{ background: 'rgba(255,255,255,0.04)' }} data-teste={`coluna-${col.key}`}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/60 px-1 mb-2">{col.label} <span className="text-white/40">· {col.clientes.length}</span></p>
            <div className="space-y-2">
              {col.clientes.length === 0 && <p className="text-[12px] text-white/40 px-1 py-2">ninguém aqui</p>}
              {col.clientes.map((c) => (
                <div key={c.id} className="rounded-lg border border-white/10 p-2.5" style={{ background: 'rgba(255,255,255,0.05)' }} data-teste="cartao-negociacao">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-bold text-white truncate">{c.full_name || 'Sem nome'}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300" title="qualificação" data-teste="nota-lead">
                      <Star className="w-3 h-3" /> {c._nota === null ? '—' : `${c._nota}/15`}
                    </span>
                  </div>
                  <p className={`mt-1 text-[11px] font-semibold flex items-center gap-1 ${COR_FOLLOWUP[c._followUp]}`} data-teste="followup-lead">
                    {c._followUp === ESTADO_FOLLOWUP.VENCIDO && <AlertTriangle className="w-3 h-3" />}
                    <CalendarClock className="w-3 h-3" /> {ROTULO_FOLLOWUP(c)}
                  </p>
                  {c.next_steps && <p className="mt-1 text-[11px] text-white/60 line-clamp-2">{c.next_steps}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                    <button type="button" onClick={() => registrarContato(c)} disabled={movendo === c.id} className="inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-white/10 disabled:opacity-50" data-teste="falei-hoje">
                      <MessageSquare className="w-3 h-3" /> Falei hoje
                    </button>
                    <button type="button" onClick={() => setQualificando(c)} className="inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-white/10" data-teste="qualificar-negociacao">
                      <Star className="w-3 h-3" /> Qualificar
                    </button>
                    <select value={c.purchase_status || 'sem_compra'} onChange={(e) => mover(c, e.target.value)} disabled={movendo === c.id}
                      className="ml-auto rounded-md bg-transparent border border-white/15 px-1.5 py-1 text-[11px] text-white/80" data-teste="mover-etapa">
                      {colunas.map((o) => <option key={o.key} value={o.key} className="text-black">{o.label}</option>)}
                      <option value="pago" className="text-black">Pago</option>
                      <option value="cancelado" className="text-black">Perdido</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <CrmNetworkQualificacaoModal contato={qualificando} onFechar={() => setQualificando(null)} onSalvar={salvarQualificacao} salvando={salvando} />
    </div>
  );
}

function Numero({ rotulo, valor, cor = 'text-white' }) {
  return (
    <div className="rounded-lg border border-white/10 p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <p className="text-[11px] uppercase tracking-wide text-white/50">{rotulo}</p>
      <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
    </div>
  );
}
