import React, { useState, useContext } from 'react';
import { Handshake, CalendarPlus, Star, Loader2, X, Search, LayoutPanelTop } from 'lucide-react';
import { toast } from 'sonner';
import { plataforma } from '@/api/plataformaClient';
import CrmNetworkQualificacaoModal from './CrmNetworkQualificacaoModal';
import CrmContatoRegistroModal from './CrmContatoRegistroModal';
import ModalDoLead from './ModalDoLead';
import { eventoDoCartao, linkGoogleAgenda, diaDoEvento } from '@/lib/agendaDoQuadro';
import { tokenDoGoogle, invalidarTokenSePreciso, statusDoErro, erroDoGoogle } from '@/lib/googleAgenda';
import { eventoGoogleDaReuniao } from '@/lib/metodo';
import { meusContatos, filtrarPorNome, registroComCarimbo, historicoComRegistro, nomeVivoDoLead } from '@/lib/leadDoQuadro';
import { ClientesVivosContext } from './clientesVivos';

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
 * 🧩 24/09/2026 — "TUDO AQUI" (dono: "modal no quadro para que tudo possa ser
 * feito lá — lista, contatos, e mais. Da qualificação do lead à criação do
 * contato novo, sem sair do quadro"). O chip abre o ModalDoLead: a minha
 * lista, cadastrar contato novo (com a trava de duplicado do CRM), qualificar,
 * registrar o contato (Hábito 4, append em contatos_metodo com carimbo) e
 * agendar. As regras estão em src/lib/leadDoQuadro.js. Os chips antigos
 * (Lead · Qualificar · Google Agenda) continuam — são o caminho curto.
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
  const [modalAberto, setModalAberto] = useState(false);
  const [contatando, setContatando] = useState(null);
  const [salvandoRegistro, setSalvandoRegistro] = useState(false);
  // 🔗 25/09 — o nome VIVO da pessoa (o quadro busca todos de uma vez); a
  // cópia do card (cliente_nome) só vale enquanto a lista não respondeu.
  const vivos = useContext(ClientesVivosContext);
  const lead = nomeVivoDoLead(cartao, vivos);

  const carregarClientes = async () => {
    if (clientes) return clientes;
    setCarregando(true);
    try {
      const todos = await plataforma.entities.Customer.list();
      // a MESMA régua do Método: cada um só a própria lista; super admin todas
      const meus = meusContatos(todos, dono);
      setClientes(meus);
      return meus;
    } catch { toast.error('Não consegui carregar seus clientes'); return []; }
    finally { setCarregando(false); }
  };

  const abrirEscolha = async () => { setEscolhendo(true); await carregarClientes(); };
  const abrirModal = async () => { setModalAberto(true); await carregarClientes(); };

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

  // 📜 Hábito 4 pelo card: o MESMO append-only de customers.contatos_metodo,
  // com o carimbo de quem registrou (ver handleRegistrarContatoMetodo no CRM).
  const registrarContato = async (contato, registro) => {
    setSalvandoRegistro(true);
    try {
      const completo = registroComCarimbo(registro, dono);
      const historico = historicoComRegistro(contato, completo);
      await plataforma.entities.Customer.update(contato.id, { contatos_metodo: historico });
      setClientes((l) => (l || []).map((x) => (x.id === contato.id ? { ...x, contatos_metodo: historico } : x)));
      toast.success(registro.resultado === 'agendado' ? `Reunião agendada com ${contato.full_name || 'o contato'}` : `Contato registrado: ${contato.full_name || ''}`);
      setContatando(null);
    } catch { toast.error('Não salvou o registro do contato'); }
    finally { setSalvandoRegistro(false); }
  };
  // o evento da reunião AGENDADA no registro — a mesma criação do Método
  const criarEventoNoGoogle = async (registro, cliente) => {
    try {
      const corpo = eventoGoogleDaReuniao({
        titulo: registro.titulo_reuniao || `Reunião — ${cliente?.full_name || 'contato'} (Leilão NoZap)`,
        inicio: registro.quando, duracaoMin: registro.duracao_min || 60,
        detalhes: registro.obs || 'Apresentação de sucesso — Leilão NoZap', local: registro.local || '',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
      });
      if (!corpo) return null;
      const token = await tokenDoGoogle();
      const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
      });
      if (!resp.ok) throw erroDoGoogle(resp);
      const j = await resp.json();
      if (j?.id) registro.google_event_id = j.id;
      return j?.htmlLink || null;
    } catch (e) {
      invalidarTokenSePreciso(statusDoErro(e));
      toast.info('Não deu pra criar no Google agora — o agendamento foi salvo no histórico do contato.');
      return null;
    }
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

  // o contato novo cadastrado pelo painel: entra na lista, vira o cliente do
  // card e já abre a qualificação — o mesmo fluxo de escolher um da lista
  const aoCriarContato = async (c) => {
    setClientes((l) => [c, ...(l || [])]);
    await vincular(c);
  };

  const filtrados = filtrarPorNome(clientes || [], termo, 8);

  return (
    <div className="mt-2.5" data-teste="lead-do-cartao">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
        {cartao.cliente_id ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1" style={{ background: 'rgba(255,255,255,0.10)' }} data-teste="chip-cliente">
              <Handshake className="w-3.5 h-3.5" /> {lead.nome}{lead.removido && <span className="ml-1 text-[10px] font-normal text-red-300" data-teste="lead-removido">· removido da lista</span>}
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
        <button type="button" onClick={abrirModal} title="Lista, contato novo, qualificar, registrar contato e agendar — sem sair do quadro" className="inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-white/10" data-teste="abrir-modal-lead">
          <LayoutPanelTop className="w-3.5 h-3.5 text-nz-verde" /> Tudo aqui
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

      {/* o painel "Tudo aqui" vem ANTES dos dois modais abaixo de propósito: os
          três são sobrepostos fixos z-50, e quem monta depois fica por cima */}
      <ModalDoLead
        aberto={modalAberto} onFechar={() => setModalAberto(false)}
        cartao={cartao} dono={dono} hoje={hoje} clientes={clientes || []} carregando={carregando}
        onVincular={vincular} onDesvincular={desvincular}
        onQualificar={(c) => setQualificando(c)} onContatar={(c) => setContatando(c)}
        onAgendar={agendar} agendando={agendando} onCriado={aoCriarContato}
      />
      <CrmNetworkQualificacaoModal contato={qualificando} onFechar={() => setQualificando(null)} onSalvar={salvarQualificacao} salvando={salvando} />
      <CrmContatoRegistroModal
        aberto={contatando !== null} contatoInicial={contatando} contatos={clientes || []}
        onFechar={() => setContatando(null)} onSalvar={registrarContato} salvando={salvandoRegistro}
        criarNoGoogleFn={criarEventoNoGoogle} autor={dono}
      />
    </div>
  );
}
