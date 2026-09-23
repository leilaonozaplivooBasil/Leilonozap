import React, { useState } from 'react';
import { Handshake, CalendarPlus, Star, Loader2, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { plataforma } from '@/api/plataformaClient';
import CrmNetworkQualificacaoModal from './CrmNetworkQualificacaoModal';
import { eventoDoCartao, linkGoogleAgenda, diaDoEvento } from '@/lib/agendaDoQuadro';
import { tokenDoGoogle, invalidarTokenSePreciso, statusDoErro } from '@/lib/googleAgenda';

/**
 * 🤝📅 O LEAD E A AGENDA, DENTRO DO CARD DO QUADRO.
 *
 * 23/09/2026 — pedido: "qualificar lead + Google Agenda pelo quadro".
 *
 * Nada aqui é novo por baixo: o modal de qualificação é o do CRM (DIR-46), a
 * conexão com o Google é a do Método (src/lib/googleAgenda.js), o corpo do
 * evento é o do Método (eventoGoogleDaReuniao). O que faltava era o card
 * saber QUEM é o cliente — coluna cliente_id/cliente_nome, migração
 * 20260923032810 — e um lugar pra apertar.
 *
 * 📅 Dois caminhos pro Google, o mesmo evento:
 *   1. conta conectada (token do Método) → cria o evento DE VERDADE pela API,
 *      com o alarme de 30 e 10 min;
 *   2. sem conexão (ou negou) → abre o evento PRÉ-PREENCHIDO no Google Calendar
 *      num toque — não sincroniza de volta, mas não pede senha.
 * Nos dois, o follow_up_date do cliente é gravado, e a aba Negociação passa a
 * cobrar na data.
 *
 * Autocontido de propósito: carrega os clientes SÓ quando a pessoa clica —
 * o quadro tem dezenas de cards, e cada um puxando a lista no mount seria
 * dezenas de leituras iguais.
 */
export default function LeadDoCartao({ cartao, dono, hoje, onMudar }) {
  const [escolhendo, setEscolhendo] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [clientes, setClientes] = useState(null);
  const [termo, setTermo] = useState('');
  const [qualificando, setQualificando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [agendando, setAgendando] = useState(false);
  const uid = dono?.id || null;

  const carregarClientes = async () => {
    if (clientes) return clientes;
    setCarregando(true);
    try {
      const todos = await plataforma.entities.Customer.list();
      // a MESMA régua do Método: cada um só a própria lista; super admin todas
      const meus = dono?.role === 'super_admin' ? (todos || []) : (todos || []).filter((c) => c?.created_by_id && c.created_by_id === uid);
      setClientes(meus);
      return meus;
    } catch { toast.error('Não consegui carregar seus clientes'); return []; }
    finally { setCarregando(false); }
  };

  const abrirEscolha = async () => { setEscolhendo(true); await carregarClientes(); };

  const vincular = async (c) => {
    await onMudar({ ...cartao, cliente_id: c.id, cliente_nome: c.full_name || 'Cliente' });
    setEscolhendo(false); setTermo('');
    setQualificando(c);
  };
  const desvincular = async () => onMudar({ ...cartao, cliente_id: null, cliente_nome: null });

  const abrirQualificacao = async () => {
    const lista = await carregarClientes();
    const c = lista.find((x) => x.id === cartao.cliente_id);
    if (!c) { toast.error('Esse cliente não está mais na sua lista'); return; }
    setQualificando(c);
  };
  const salvarQualificacao = async (contato, quali) => {
    setSalvando(true);
    try {
      await plataforma.entities.Customer.update(contato.id, { qualificacao_network: quali });
      setClientes((l) => (l || []).map((x) => (x.id === contato.id ? { ...x, qualificacao_network: quali } : x)));
      const total = Object.values(quali || {}).filter((n) => Number.isFinite(Number(n))).reduce((s, n) => s + Number(n), 0);
      toast.success(`${contato.full_name || 'Contato'} qualificado: ${total}/15`);
      setQualificando(null);
    } catch { toast.error('Não salvou a qualificação'); }
    finally { setSalvando(false); }
  };

  const agendar = async () => {
    const evento = eventoDoCartao(cartao, { clienteNome: cartao.cliente_nome || null, hojeISO: hoje, quadroUrl: typeof window !== 'undefined' ? `${window.location.origin}/Licensing?tab=catalogo&catalogTab=catalogo-xperformance` : '' });
    if (!evento) { toast.error('Dê um prazo ao card pra agendar'); return; }
    setAgendando(true);
    let criouNaApi = false;
    try {
      const token = await tokenDoGoogle();
      const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(evento),
      });
      if (resp.ok) criouNaApi = true;
      else invalidarTokenSePreciso(resp.status);
    } catch (e) { invalidarTokenSePreciso(statusDoErro(e)); }
    if (!criouNaApi) {
      // sem conexão: o evento pré-preenchido, um toque
      const link = linkGoogleAgenda(evento);
      if (link && typeof window !== 'undefined') window.open(link, '_blank', 'noopener');
    }
    // nos dois caminhos, o cliente passa a ter follow-up — é o que a aba Negociação cobra
    if (cartao.cliente_id) {
      try { await plataforma.entities.Customer.update(cartao.cliente_id, { follow_up_date: diaDoEvento(evento) }); } catch { /* o evento já existe; o follow-up é bônus */ }
    }
    toast.success(criouNaApi ? 'Evento criado na sua Google Agenda' : 'Abri o evento pra você confirmar no Google');
    setAgendando(false);
  };

  const filtrados = (clientes || []).filter((c) => !termo || String(c.full_name || '').toLowerCase().includes(termo.toLowerCase())).slice(0, 8);

  return (
    <div className="mt-2.5" data-teste="lead-do-cartao">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
        {cartao.cliente_id ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1" style={{ background: 'rgba(255,255,255,0.10)' }} data-teste="chip-cliente">
              <Handshake className="w-3.5 h-3.5" /> {cartao.cliente_nome}
              <button type="button" onClick={desvincular} title="Tirar o cliente do card" data-teste="desvincular-cliente" className="ml-0.5 opacity-70 hover:opacity-100"><X className="w-3 h-3" /></button>
            </span>
            <button type="button" onClick={abrirQualificacao} className="inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-white/10" data-teste="qualificar-lead">
              <Star className="w-3.5 h-3.5 text-amber-400" /> Qualificar
            </button>
          </>
        ) : (
          <button type="button" onClick={abrirEscolha} className="inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-white/10" data-teste="vincular-lead">
            <Handshake className="w-3.5 h-3.5" /> Lead
          </button>
        )}
        <button type="button" onClick={agendar} disabled={agendando} className="inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-white/10 disabled:opacity-50" data-teste="agendar-google">
          {agendando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />} Google Agenda
        </button>
      </div>

      {escolhendo && (
        <div className="mt-2 rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.06)' }} data-teste="escolher-cliente">
          <div className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 opacity-60" />
            <input autoFocus value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="nome do cliente…" data-teste="busca-cliente"
              className="flex-1 bg-transparent text-[12px] outline-none placeholder:opacity-50" />
            <button type="button" onClick={() => { setEscolhendo(false); setTermo(''); }} data-teste="fechar-escolha"><X className="w-3.5 h-3.5 opacity-70" /></button>
          </div>
          <div className="mt-1.5 max-h-40 overflow-y-auto">
            {carregando ? <p className="text-[11px] opacity-70 px-1 py-1">carregando…</p>
              : filtrados.length === 0 ? <p className="text-[11px] opacity-70 px-1 py-1">{clientes?.length ? 'ninguém com esse nome' : 'sua lista de clientes está vazia'}</p>
                : filtrados.map((c) => (
                  <button key={c.id} type="button" onClick={() => vincular(c)} data-teste="opcao-cliente"
                    className="block w-full text-left text-[12px] px-1.5 py-1 rounded hover:bg-white/10 truncate">{c.full_name || 'Sem nome'}</button>
                ))}
          </div>
        </div>
      )}

      <CrmNetworkQualificacaoModal contato={qualificando} onFechar={() => setQualificando(null)} onSalvar={salvarQualificacao} salvando={salvando} />
    </div>
  );
}
