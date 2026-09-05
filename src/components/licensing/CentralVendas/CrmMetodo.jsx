import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save, ChevronLeft, ChevronRight, Star, CalendarPlus, ExternalLink, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { plataforma } from '@/api/plataformaClient';
import {
  HABITOS, ROTINA_PADRAO, periodoDe, PERIODOS, gerarTarefasDaRotina,
  progressoDia, linkGoogleAgenda,
  HORIZONTES_SONHO, agruparSonhosPorHorizonte, normalizarSonho, PLACEHOLDER_DETALHES_SONHO,
  PRINCIPIO_ROTINA, NARRATIVA_DO_DIA, guiaDaRotina,
  probabilidadeFechamento, produtoApresentacao,
  agendaDoDiaContatos, eventoGoogleDaReuniao, linhaDoTempoUnificada, plural,
  ultimoContato, proximasReunioes, RESULTADOS_CONTATO,
  idDoEventoGoogle, resumoSemanaReunioes, META_REUNIOES_SEMANA,
  reunioesEmpresaDoDia, DIAS_SEMANA, DURACOES_REUNIAO, duracaoEntreHoras,
} from '@/lib/metodo';
import { ehAtiva } from '@/lib/esteiraCaptacao';
import CrmSonhoModal from './CrmSonhoModal';
import CrmNetworkQualificacaoModal from './CrmNetworkQualificacaoModal';
import CrmContatoRegistroModal from './CrmContatoRegistroModal';

// DIR-46 — cor da faixa de probabilidade na lista
const COR_FAIXA = { quente: 'text-nz-verde', morno: 'text-amber-600', frio: 'text-nz-tinta-fraca' };

// 🏆 DIR-43 — O MÉTODO VIVO: os painéis dos hábitos 1-5 e 8 (os hábitos 6 e
// 7 são o próprio CRM: Acompanhamento = Clientes+Esteira, Verificação =
// Visão Executiva). Dados pessoais em metodo_perfil/metodo_tarefas.
const hojeStr = () => new Date().toISOString().slice(0, 10);
const fmtDia = (s) => new Date(`${s}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });

const EXEMPLO_SCRIPT = `Ex.: "Oi {nome}! Lembrei de você por causa do {contexto da pessoa — FORM}.
Estou construindo um negócio de leilões e loja com preço de fábrica que está crescendo forte,
e queria te mostrar uma possibilidade — não é promessa, é projeto sério, com números abertos.
Topa uma conversa de 45 minutos essa semana? Tenho agenda {dia} às {hora}."`;

export default function CrmMetodo({ painel, currentUser, visaoTotal = false, nomePorUsuarioId = {}, clientesManuais = [], oportunidades = [], onQualificar, onRegistrarContato, onEditarRegistro, onExcluirRegistro, onNovoCliente, onIr }) {
  const uid = currentUser?.id;
  const [perfil, setPerfil] = useState(null);
  const [dia, setDia] = useState(hojeStr());
  const [tarefas, setTarefas] = useState([]);
  const [salvando, setSalvando] = useState(false);
  // edições locais
  const [modalSonho, setModalSonho] = useState(null); // horizonte pré-escolhido, ou null (fechado)
  const [editandoSonho, setEditandoSonho] = useState(null); // { indice, texto }
  const [script, setScript] = useState('');
  const [apresentacaoUrl, setApresentacaoUrl] = useState('');
  const [novaTarefa, setNovaTarefa] = useState({ hora: '', titulo: '' });
  const [guiaAberto, setGuiaAberto] = useState(null); // id da tarefa com o guia expandido
  const [confirmaRegerar, setConfirmaRegerar] = useState(false); // regerar dia já gerado (DIR-45.2)
  const [logicaAberta, setLogicaAberta] = useState(false); // a escada da narrativa
  const [buscaLista, setBuscaLista] = useState(''); // agenda: busca por nome/telefone (DIR-46)
  const [qualificando, setQualificando] = useState(null); // contato aberto no modal de qualificação
  const [registroAberto, setRegistroAberto] = useState(null); // {contato} = registrar; {contato, agendar:true} = agendar direto; {contato, editar:registro} = editar (DIR-50); {contato:null} = agendar livre
  const [escopoAgenda, setEscopoAgenda] = useState('minha'); // DIR-49: 'minha' é o padrão; 'time' só pra visão total
  const [confirmaExcluir, setConfirmaExcluir] = useState(null); // DIR-50: id do registro esperando o 2º clique
  const [reunioesEmpresa, setReunioesEmpresa] = useState([]); // 🏛️ DIR-52
  const [novaEmpresa, setNovaEmpresa] = useState({ titulo: '', recorrencia: 'semana', dia_semana: 1, data: '', hora: '09:00', modoFim: 'duracao', duracao_min: 60, hora_fim: '10:00' });
  const [googleEventos, setGoogleEventos] = useState(null); // null = agenda Google não conectada
  const [googleConectando, setGoogleConectando] = useState(false);
  const [googleToken, setGoogleToken] = useState(null); // token da SESSÃO (nunca vai pro servidor)

  useEffect(() => {
    if (!uid) return;
    plataforma.entities.MetodoPerfil.filter({ user_id: uid })
      .then((rows) => {
        const p = Array.isArray(rows) ? rows[0] : null;
        setPerfil(p || null);
        setScript(p?.script || '');
        setApresentacaoUrl(p?.apresentacao_url || '');
      })
      .catch(() => setPerfil(null));
  }, [uid]);

  const carregarTarefas = useCallback(() => {
    if (!uid) return;
    plataforma.entities.MetodoTarefa.filter({ user_id: uid, data: dia })
      .then((rows) => setTarefas((Array.isArray(rows) ? rows : []).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || String(a.hora).localeCompare(String(b.hora)))))
      .catch(() => setTarefas([]));
  }, [uid, dia]);
  useEffect(() => { carregarTarefas(); }, [carregarTarefas]);

  const salvarPerfil = async (patch) => {
    setSalvando(true);
    try {
      if (perfil?.id) {
        await plataforma.entities.MetodoPerfil.update(perfil.id, patch);
        setPerfil({ ...perfil, ...patch });
      } else {
        const criado = await plataforma.entities.MetodoPerfil.create({ user_id: uid, ...patch });
        setPerfil(criado?.id ? criado : { user_id: uid, ...patch });
      }
      toast.success('Salvo!');
      return true;
    } catch (e) {
      console.error('Erro ao salvar método:', e);
      toast.error('Erro ao salvar — a migração do Método já foi colada no banco?');
      return false;
    } finally { setSalvando(false); }
  };

  // 🌟 DIR-44 — o quadro dos sonhos por horizonte
  const adicionarSonhos = async (itens) => {
    const ok = await salvarPerfil({ sonhos: [...sonhos, ...itens] });
    if (ok) setModalSonho(null); // falhou? modal fica aberto, nada se perde
  };
  const salvarDetalhesSonho = async (indice, texto) => {
    const ok = await salvarPerfil({
      sonhos: sonhos.map((item, j) => (j === indice ? { ...normalizarSonho(item), detalhes: String(texto || '').trim() } : item)),
    });
    if (ok) setEditandoSonho(null);
  };

  const sonhos = Array.isArray(perfil?.sonhos) ? perfil.sonhos : [];
  const rotina = Array.isArray(perfil?.rotina) && perfil.rotina.length ? perfil.rotina : ROTINA_PADRAO;
  const progresso = progressoDia(tarefas);

  const mudarDia = (delta) => {
    const d = new Date(`${dia}T12:00:00`);
    d.setDate(d.getDate() + delta);
    setDia(d.toISOString().slice(0, 10));
  };

  const gerarDia = async () => {
    setSalvando(true);
    try {
      const linhas = gerarTarefasDaRotina(rotina, uid, dia);
      for (const linha of linhas) await plataforma.entities.MetodoTarefa.create(linha);
      toast.success(`Dia gerado com ${linhas.length} tarefas da sua rotina!`);
      carregarTarefas();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar o dia — a migração do Método já foi colada no banco?');
    } finally { setSalvando(false); }
  };

  // DIR-45.2 — dia gerado com a rotina antiga continua salvo no banco; este
  // botão apaga as tarefas do DIA ESCOLHIDO e recria com a Rotina Perfeita.
  const regerarDia = async () => {
    setSalvando(true);
    try {
      for (const t of tarefas) await plataforma.entities.MetodoTarefa.delete(t.id);
      const linhas = gerarTarefasDaRotina(rotina, uid, dia);
      for (const linha of linhas) await plataforma.entities.MetodoTarefa.create(linha);
      toast.success(`Dia regenerado com as ${linhas.length} tarefas da Rotina Perfeita!`);
      setConfirmaRegerar(false);
      carregarTarefas();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao regenerar o dia — tente de novo');
    } finally { setSalvando(false); }
  };

  const alternarFeito = async (t) => {
    setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, feito: !t.feito } : x)));
    try { await plataforma.entities.MetodoTarefa.update(t.id, { feito: !t.feito }); }
    catch { toast.error('Erro ao salvar'); carregarTarefas(); }
  };

  const addTarefa = async () => {
    if (!novaTarefa.titulo.trim()) return;
    try {
      await plataforma.entities.MetodoTarefa.create({ user_id: uid, data: dia, hora: novaTarefa.hora, titulo: novaTarefa.titulo.trim(), detalhe: '', feito: false, ordem: tarefas.length });
      setNovaTarefa({ hora: '', titulo: '' });
      carregarTarefas();
    } catch { toast.error('Erro ao adicionar'); }
  };

  const removerTarefa = async (t) => {
    setTarefas((prev) => prev.filter((x) => x.id !== t.id));
    try { await plataforma.entities.MetodoTarefa.delete(t.id); }
    catch { toast.error('Erro ao apagar'); carregarTarefas(); }
  };

  // 🎤 Hábito 5 — reuniões da esteira nos próximos 7 dias
  const reunioes = useMemo(() => {
    const agora = new Date();
    const fim = new Date(agora.getTime() + 7 * 86400000);
    return oportunidades
      .filter((o) => ehAtiva(o) && o.reuniao_em && new Date(o.reuniao_em) >= new Date(agora.getTime() - 86400000) && new Date(o.reuniao_em) <= fim)
      .sort((a, b) => new Date(a.reuniao_em) - new Date(b.reuniao_em));
  }, [oportunidades]);
  const reunioesHoje = reunioes.filter((o) => String(o.reuniao_em).slice(0, 10) === hojeStr()).length;

  // DIR-46 — agenda qualificada: busca + ordenação por probabilidade de
  // fechamento (não qualificados por último, em ordem alfabética).
  const listaOrdenada = useMemo(() => {
    const termo = buscaLista.trim().toLowerCase();
    const filtrados = clientesManuais.filter((c) => !termo
      || String(c.full_name || '').toLowerCase().includes(termo)
      || String(c.phone || '').toLowerCase().includes(termo)
      || String(c.email || '').toLowerCase().includes(termo));
    return [...filtrados].sort((a, b) => {
      const pa = probabilidadeFechamento(a.qualificacao_network)?.pct ?? -1;
      const pb = probabilidadeFechamento(b.qualificacao_network)?.pct ?? -1;
      return pb - pa || String(a.full_name || '').localeCompare(String(b.full_name || ''), 'pt-BR');
    });
  }, [clientesManuais, buscaLista]);

  const salvarQualificacao = async (contato, quali) => {
    setSalvando(true);
    const ok = await onQualificar?.(contato, quali);
    setSalvando(false);
    if (ok) setQualificando(null); // falhou? modal fica aberto, notas não se perdem
  };

  // 📜 DIR-47/50 — registrar o desfecho (novo) ou salvar a edição (existente)
  const salvarRegistroContato = async (contato, registro) => {
    setSalvando(true);
    const ok = registroAberto?.editar
      ? await onEditarRegistro?.(contato, { ...registroAberto.editar, ...registro })
      : await onRegistrarContato?.(contato, registro);
    setSalvando(false);
    if (ok) setRegistroAberto(null);
  };

  // 🗓️ DIR-47/48 — token da Google Agenda da PRÓPRIA pessoa (leitura +
  // criação de evento; mesmo GOOGLE_CLIENT_ID do login; o token vive só
  // nesta sessão do navegador — nunca vai pro servidor).
  const obterTokenGoogle = async () => {
    if (googleToken) return googleToken;
    const r = await plataforma.functions.invoke('getGoogleClientId', {});
    const clientId = r?.clientId;
    if (!clientId) throw new Error('login Google não configurado');
    if (!window.google?.accounts?.oauth2) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.onload = res; s.onerror = () => rej(new Error('não carregou o script do Google'));
        document.head.appendChild(s);
      });
    }
    if (!window.google?.accounts?.oauth2) throw new Error('Google indisponível neste navegador');
    const token = await new Promise((res, rej) => {
      const tc = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
        callback: (resp) => (resp?.access_token ? res(resp.access_token) : rej(new Error(resp?.error || 'sem autorização'))),
        error_callback: (e) => rej(new Error(e?.message || 'janela do Google fechada')),
      });
      tc.requestAccessToken();
    });
    setGoogleToken(token);
    return token;
  };

  const conectarGoogleAgenda = async () => {
    setGoogleConectando(true);
    try {
      const token = await obterTokenGoogle();
      const ini = new Date(); ini.setHours(0, 0, 0, 0);
      const fim = new Date(ini.getTime() + 86400000);
      const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(ini.toISOString())}&timeMax=${encodeURIComponent(fim.toISOString())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`Google respondeu ${resp.status}`);
      const j = await resp.json();
      setGoogleEventos((j.items || []).map((e) => ({ id: e.id, titulo: e.summary || '(sem título)', inicio: e.start?.dateTime || e.start?.date || '' })));
      toast.success('Google Agenda conectada — eventos de hoje na tela');
    } catch (e) {
      console.warn('Google Agenda:', e);
      setGoogleToken(null);
      toast.error(`Não deu pra conectar a Google Agenda: ${e.message}`);
    } finally { setGoogleConectando(false); }
  };

  // DIR-48 — cria o evento DE VERDADE na agenda da própria pessoa. Falhou?
  // Devolve null e o agendamento segue com o link de template (nunca trava).
  const criarEventoNoGoogle = async (registro, cliente) => {
    try {
      const corpo = eventoGoogleDaReuniao({
        titulo: registro.titulo_reuniao || `Reunião — ${cliente?.full_name || 'contato'} (Leilão NoZap)`,
        inicio: registro.quando,
        duracaoMin: registro.duracao_min || 60,
        detalhes: registro.obs || 'Apresentação de sucesso — Leilão NoZap',
        local: registro.local || '',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
      });
      if (!corpo) return null;
      const token = await obterTokenGoogle();
      const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      if (!resp.ok) throw new Error(`Google respondeu ${resp.status}`);
      const j = await resp.json();
      if (j?.id) registro.google_event_id = j.id; // DIR-50: o id permite editar/apagar depois
      toast.success('Evento criado na sua Google Agenda!');
      return j?.htmlLink || null;
    } catch (e) {
      console.warn('Criar evento Google:', e);
      setGoogleToken(null);
      toast.info(`Não deu pra criar no Google agora (${e.message}) — o agendamento foi salvo e o botão Google Agenda continua na agenda do dia.`);
      return null;
    }
  };

  // ✏️ DIR-50 — edita o evento JÁ CRIADO na agenda da pessoa (PATCH). Sem id
  // (registro antigo sem link)? Cria um novo. Falhou? Devolve o link antigo e
  // avisa honesto — a edição no método nunca trava por causa do Google.
  const atualizarEventoNoGoogle = (registroOriginal) => async (registro, cliente) => {
    const eventId = idDoEventoGoogle(registroOriginal);
    if (!eventId) return criarEventoNoGoogle(registro, cliente);
    try {
      const corpo = eventoGoogleDaReuniao({
        titulo: registro.titulo_reuniao || `Reunião — ${cliente?.full_name || 'contato'} (Leilão NoZap)`,
        inicio: registro.quando,
        duracaoMin: registro.duracao_min || 60,
        detalhes: registro.obs || 'Apresentação de sucesso — Leilão NoZap',
        local: registro.local || '',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
      });
      if (!corpo) return registroOriginal.google_event_link || null;
      const token = await obterTokenGoogle();
      const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      if (!resp.ok) throw new Error(`Google respondeu ${resp.status}`);
      const j = await resp.json();
      registro.google_event_id = j?.id || eventId;
      toast.success('Evento atualizado na sua Google Agenda!');
      return j?.htmlLink || registroOriginal.google_event_link || null;
    } catch (e) {
      console.warn('Atualizar evento Google:', e);
      setGoogleToken(null);
      toast.info(`A reunião foi atualizada no método, mas o Google não deixou mexer no evento agora (${e.message}) — ajuste por lá pelo link.`);
      return registroOriginal.google_event_link || null;
    }
  };

  // 🗑️ DIR-50 — apaga o evento na Google Agenda (DELETE). Falhou? A exclusão
  // no método segue, com aviso honesto pra apagar por lá.
  const apagarEventoNoGoogle = async (registro) => {
    const eventId = idDoEventoGoogle(registro);
    if (!eventId) return true;
    try {
      const token = await obterTokenGoogle();
      const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok && resp.status !== 404 && resp.status !== 410) throw new Error(`Google respondeu ${resp.status}`);
      toast.success('Evento apagado da sua Google Agenda.');
      return true;
    } catch (e) {
      console.warn('Apagar evento Google:', e);
      setGoogleToken(null);
      toast.info(`Excluída do método — mas o Google não deixou apagar o evento agora (${e.message}). Apague por lá pelo link, se ainda existir.`);
      return false;
    }
  };

  // 🗑️ DIR-50 — excluir com 2 cliques (o segundo confirma), Google junto
  const excluirRegistro = async (cliente, registro) => {
    if (confirmaExcluir !== registro.id) { setConfirmaExcluir(registro.id); return; }
    setConfirmaExcluir(null);
    setSalvando(true);
    await apagarEventoNoGoogle(registro);
    await onExcluirRegistro?.(cliente, registro.id);
    setSalvando(false);
  };

  // 🏛️ DIR-52 — reuniões fixas do negócio (tabela própria; leitura pra todos)
  useEffect(() => {
    if (painel !== 'contato') return;
    plataforma.entities.ReuniaoEmpresa.filter({})
      .then((rows) => setReunioesEmpresa(Array.isArray(rows) ? rows : []))
      .catch(() => setReunioesEmpresa([])); // tabela ainda sem migração → lista vazia, sem quebrar
  }, [painel]);

  // DIR-54 — "até às" é só uma outra forma de dizer a duração: convertida
  // ANTES de gravar, o banco guarda sempre `duracao_min` (fonte única).
  const duracaoEmpresaMin = novaEmpresa.modoFim === 'fim'
    ? duracaoEntreHoras(novaEmpresa.hora, novaEmpresa.hora_fim)
    : Number(novaEmpresa.duracao_min) || 60;

  const criarReuniaoEmpresa = async () => {
    if (!novaEmpresa.titulo.trim() || !novaEmpresa.hora || !duracaoEmpresaMin) return;
    setSalvando(true);
    try {
      const linha = {
        titulo: novaEmpresa.titulo.trim(),
        dia_semana: novaEmpresa.recorrencia === 'semana' ? Number(novaEmpresa.dia_semana) : null,
        data: novaEmpresa.recorrencia === 'data' ? novaEmpresa.data || null : null,
        hora: novaEmpresa.hora,
        duracao_min: duracaoEmpresaMin,
        ativo: true,
        criado_por_id: uid || null,
        criado_por_nome: currentUser?.full_name || '',
      };
      const criada = await plataforma.entities.ReuniaoEmpresa.create(linha);
      setReunioesEmpresa((prev) => [...prev, criada?.id ? criada : linha]);
      setNovaEmpresa({ titulo: '', recorrencia: 'semana', dia_semana: 1, data: '', hora: '09:00', modoFim: 'duracao', duracao_min: 60, hora_fim: '10:00' });
      toast.success('Reunião da empresa salva — entra na agenda de todo mundo!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar — a migração da DIR-52 (reunioes_empresa) já foi colada no banco?');
    } finally { setSalvando(false); }
  };

  const excluirReuniaoEmpresa = async (r) => {
    if (confirmaExcluir !== `emp-${r.id}`) { setConfirmaExcluir(`emp-${r.id}`); return; }
    setConfirmaExcluir(null);
    setReunioesEmpresa((prev) => prev.filter((x) => x.id !== r.id));
    try { await plataforma.entities.ReuniaoEmpresa.delete(r.id); toast.success('Reunião da empresa excluída.'); }
    catch { toast.error('Erro ao excluir — tente de novo'); }
  };

  const habito = HABITOS.find((h) => h.id === painel);

  return (
    <Card className="bg-white border-nz-borda mb-4 sm:mb-6">
      <CardContent className="p-4 sm:p-6 space-y-4">
        {habito && (
          <div>
            <p className="text-lg font-bold text-nz-tinta"><span className="text-nz-verde">Hábito {habito.n} — {habito.titulo}</span></p>
            <p className="text-sm text-nz-tinta-fraca">{habito.texto}</p>
          </div>
        )}

        {/* ══ 🌟 HÁBITO 1 — QUADRO DOS SONHOS (DIR-44: curto/médio/longo, com imagem) ══ */}
        {painel === 'sonho' && (() => {
          const grupos = agruparSonhosPorHorizonte(sonhos);
          return (
            <div className="space-y-4">
              <div className="rounded-lg bg-nz-cinza-fundo/60 border border-nz-borda p-3 text-xs text-nz-tinta-fraca">
                🖼️ <strong>Monte o seu quadro.</strong> O sonho tem três prazos — ⚡ curto (1 a 2 anos), 🎯 médio (2 a 4) e 🏆 longo (5 pra frente).
                Coloque quantas imagens quiser em cada um (busque pelo nome sem sair daqui, ou envie do aparelho) e escreva os
                <strong> detalhes exatos</strong> embaixo de cada imagem — se for um carro: ano, cor, banco de couro, roda. Sonho detalhado vira meta.
              </div>

              {HORIZONTES_SONHO.map((hz) => {
                const doHorizonte = grupos[hz.id];
                return (
                  <div key={hz.id} className="rounded-2xl border-2 border-nz-verde/25 bg-nz-verde-fundo/30 p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <p className="text-sm font-bold text-nz-tinta">
                        {hz.emoji} {hz.label}
                        <span className="text-nz-tinta-fraca font-normal"> · {hz.faixa}{doHorizonte.length > 0 ? ` · ${doHorizonte.length} sonho${doHorizonte.length === 1 ? '' : 's'}` : ''}</span>
                      </p>
                      <Button size="sm" onClick={() => setModalSonho(hz.id)} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8 shrink-0">
                        <Plus className="w-4 h-4 mr-1" /> Adicionar
                      </Button>
                    </div>

                    {doHorizonte.length === 0 ? (
                      <p className="text-xs text-nz-tinta-fraca text-center py-5 border border-dashed border-nz-verde/30 rounded-xl">
                        Nenhum sonho aqui ainda — adicione a imagem do que você quer.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {doHorizonte.map(({ sonho: s, indice }) => (
                          <div key={s.id || `i${indice}`} className="rounded-xl border border-nz-borda bg-white overflow-hidden flex flex-col shadow-sm">
                            {s.imagem_url && (
                              <img
                                src={s.imagem_url}
                                alt={s.titulo}
                                loading="lazy"
                                className="w-full aspect-[4/3] object-cover bg-nz-cinza-fundo"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                            <div className="p-3 flex-1 flex flex-col gap-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-bold text-nz-tinta">🌟 {s.titulo}</p>
                                <button
                                  type="button"
                                  title="Remover do quadro"
                                  onClick={() => salvarPerfil({ sonhos: sonhos.filter((_, j) => j !== indice) })}
                                  className="text-nz-tinta-fraca hover:text-red-600 shrink-0"
                                ><Trash2 className="w-4 h-4" /></button>
                              </div>

                              {editandoSonho?.indice === indice ? (
                                <div className="space-y-1.5">
                                  <Textarea
                                    value={editandoSonho.texto}
                                    onChange={(e) => setEditandoSonho({ indice, texto: e.target.value })}
                                    rows={3}
                                    placeholder={PLACEHOLDER_DETALHES_SONHO}
                                    className="bg-white border-nz-borda text-nz-tinta text-xs"
                                  />
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Button size="sm" disabled={salvando} onClick={() => salvarDetalhesSonho(indice, editandoSonho.texto)} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-7 text-xs">
                                      <Save className="w-3.5 h-3.5 mr-1" /> Salvar
                                    </Button>
                                    <button type="button" onClick={() => setEditandoSonho(null)} className="text-xs text-nz-tinta-fraca hover:text-nz-tinta">cancelar</button>
                                  </div>
                                </div>
                              ) : s.detalhes ? (
                                <p
                                  className="text-xs text-nz-tinta-fraca whitespace-pre-line cursor-pointer"
                                  title="Toque pra editar os detalhes"
                                  onClick={() => setEditandoSonho({ indice, texto: s.detalhes })}
                                >{s.detalhes}</p>
                              ) : (
                                <button type="button" onClick={() => setEditandoSonho({ indice, texto: '' })} className="text-xs text-nz-verde hover:text-nz-verde-claro text-left font-medium">
                                  ＋ escreva os detalhes do seu sonho
                                </button>
                              )}
                              {!editandoSonho && s.prazo && !s.detalhes && <p className="text-[11px] text-nz-tinta-fraca">alvo: {s.prazo}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <CrmSonhoModal
                aberto={modalSonho !== null}
                horizonteInicial={modalSonho || 'curto'}
                onFechar={() => setModalSonho(null)}
                onAdicionar={adicionarSonhos}
              />
            </div>
          );
        })()}

        {/* ══ ✅ HÁBITO 2 — MASTER TASK + ROTINA PERFEITA (DIR-45) ══ */}
        {painel === 'compromisso' && (
          <div className="space-y-3">
            <div className="rounded-lg bg-nz-cinza-fundo/60 border border-nz-borda p-3 text-xs text-nz-tinta-fraca space-y-1.5">
              <p>
                📣 <strong>A Rotina Perfeita não é agenda de posts</strong> — é a sua rotina real virando narrativa nas redes:{' '}
                <strong className="text-nz-tinta">{PRINCIPIO_ROTINA.percepcoes.join(' → ')}</strong>.
              </p>
              <p className="italic">"{PRINCIPIO_ROTINA.regra}" — {PRINCIPIO_ROTINA.texto}</p>
              <button type="button" onClick={() => setLogicaAberta(!logicaAberta)} className="font-semibold text-nz-verde hover:text-nz-verde-claro">
                {logicaAberta ? '▾ esconder a lógica do dia' : '▸ ver a lógica do dia (a história que a rotina conta)'}
              </button>
              {logicaAberta && (
                <div className="pt-1 space-y-0.5">
                  <p className="text-[11px]">Você não termina o dia tendo feito dez propagandas — termina tendo contado UMA história:</p>
                  {NARRATIVA_DO_DIA.map((n) => (
                    <p key={n.hora} className="text-[11px]"><span className="font-bold text-nz-tinta">{n.hora}</span> — {n.frase}</p>
                  ))}
                  <p className="text-[11px] italic pt-1">Quando chegar a hora de apresentar a Leilão NoZap, a audiência já viu o mais importante: <strong>a pessoa vivendo aquilo que fala.</strong></p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => mudarDia(-1)}><ChevronLeft className="w-5 h-5 text-nz-tinta" /></Button>
                <p className="text-sm font-bold text-nz-tinta capitalize min-w-[180px] text-center">{fmtDia(dia)}{dia === hojeStr() ? ' · HOJE' : ''}</p>
                <Button variant="ghost" size="icon" onClick={() => mudarDia(1)}><ChevronRight className="w-5 h-5 text-nz-tinta" /></Button>
              </div>
              <p className="text-sm font-semibold text-nz-tinta">{progresso.feitas}/{progresso.total} feitas · {progresso.pct.toFixed(0)}%</p>
            </div>
            <div className="h-2 rounded-full bg-nz-cinza-fundo overflow-hidden">
              <div className="bg-nz-verde h-full transition-all" style={{ width: `${progresso.pct}%` }} />
            </div>

            {tarefas.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-nz-tinta-fraca">Dia sem Master Task ainda. "O compromisso é uma decisão diária."</p>
                <Button onClick={gerarDia} disabled={salvando} className="bg-nz-verde hover:bg-nz-verde-claro text-white">
                  ⚡ {salvando ? 'Gerando...' : 'Gerar Minha Rotina Perfeita (Rotina do Método)'}
                </Button>
                <p className="text-[11px] text-nz-tinta-fraca">Cria as {rotina.length} tarefas da Rotina Perfeita — das 5h ao descanso, com o guia de cada horário.</p>
              </div>
            ) : (
              PERIODOS.map((p) => {
                const doPeriodo = tarefas.filter((t) => periodoDe(t.hora) === p.id);
                if (doPeriodo.length === 0) return null;
                return (
                  <div key={p.id}>
                    <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">{p.label}</p>
                    <div className="space-y-1.5">
                      {doPeriodo.map((t) => {
                        const guia = guiaDaRotina(t.titulo);
                        return (
                          <div key={t.id} className={`rounded-lg border p-2.5 ${t.feito ? 'border-nz-verde/30 bg-nz-verde-fundo/50' : 'border-nz-borda bg-white'}`}>
                            <div className="flex items-center gap-2.5">
                              <input type="checkbox" checked={!!t.feito} onChange={() => alternarFeito(t)} className="w-4 h-4 accent-green-600 shrink-0 cursor-pointer" />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${t.feito ? 'line-through text-nz-tinta-fraca' : 'text-nz-tinta font-medium'}`}>
                                  {t.hora && <span className="font-bold">{t.hora} · </span>}{t.titulo}
                                </p>
                                {t.detalhe && !t.feito && <p className="text-[11px] text-nz-tinta-fraca truncate">{t.detalhe}</p>}
                              </div>
                              {guia && !t.feito && (
                                <button
                                  type="button"
                                  onClick={() => setGuiaAberto(guiaAberto === t.id ? null : t.id)}
                                  className={`shrink-0 text-[11px] font-semibold ${guiaAberto === t.id ? 'text-nz-verde' : 'text-nz-tinta-fraca hover:text-nz-verde'}`}
                                >📖 guia</button>
                              )}
                              <button type="button" onClick={() => removerTarefa(t)} className="text-nz-tinta-fraca/50 hover:text-red-600 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                            {guia && guiaAberto === t.id && !t.feito && (
                              <p className="mt-2 ml-6 text-[11px] leading-relaxed text-nz-tinta-fraca border-l-2 border-nz-verde/40 pl-2.5 whitespace-pre-line">{guia}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

            <div className="flex gap-2 pt-1">
              <Input type="time" value={novaTarefa.hora} onChange={(e) => setNovaTarefa({ ...novaTarefa, hora: e.target.value })} className="bg-white border-nz-borda text-nz-tinta w-28 shrink-0" />
              <Input value={novaTarefa.titulo} onChange={(e) => setNovaTarefa({ ...novaTarefa, titulo: e.target.value })} placeholder="nova tarefa do dia..." className="bg-white border-nz-borda text-nz-tinta" />
              <Button onClick={addTarefa} disabled={!novaTarefa.titulo.trim()} className="bg-nz-verde hover:bg-nz-verde-claro text-white shrink-0"><Plus className="w-4 h-4" /></Button>
            </div>
            {tarefas.length > 0 && (
              confirmaRegerar ? (
                <div className="flex items-center gap-2 flex-wrap rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs">
                  <p className="text-nz-tinta">Apagar as <strong>{tarefas.length} tarefas deste dia</strong> (feitas e não feitas) e criar as <strong>{rotina.length} da Rotina Perfeita</strong>?</p>
                  <Button size="sm" onClick={regerarDia} disabled={salvando} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-7 text-xs">
                    {salvando ? 'Regenerando...' : 'Sim, gerar de novo'}
                  </Button>
                  <button type="button" onClick={() => setConfirmaRegerar(false)} className="text-nz-tinta-fraca hover:text-nz-tinta">cancelar</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmaRegerar(true)} className="text-xs font-semibold text-nz-verde hover:text-nz-verde-claro text-left">
                  ⚡ Este dia foi gerado com a rotina antiga? Gerar de novo com a Rotina Perfeita ({rotina.length} tarefas)
                </button>
              )
            )}
          </div>
        )}

        {/* ══ 🤝 HÁBITO 3 — LISTA DE NETWORK QUALIFICADA (DIR-46) ══ */}
        {painel === 'lista' && (() => {
          const qualificadas = clientesManuais.filter((c) => probabilidadeFechamento(c.qualificacao_network)).length;
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm text-nz-tinta-fraca">
                  {clientesManuais.length} pessoas na sua lista · {qualificadas} qualificada{qualificadas === 1 ? '' : 's'}
                </p>
                <Button size="sm" onClick={onNovoCliente} className="bg-nz-verde hover:bg-nz-verde-claro text-white">
                  <UserPlus className="w-4 h-4 mr-1" /> Adicionar pessoa
                </Button>
              </div>
              <Input
                value={buscaLista}
                onChange={(e) => setBuscaLista(e.target.value)}
                placeholder="🔎 buscar na agenda por nome, telefone ou e-mail..."
                className="bg-white border-nz-borda text-nz-tinta"
              />
              {listaOrdenada.length === 0 ? (
                <p className="text-sm text-nz-tinta-fraca py-4 text-center">
                  {clientesManuais.length === 0 ? 'Sua lista começa aqui — adicione as pessoas da sua agenda.' : 'Ninguém na agenda com essa busca.'}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {listaOrdenada.map((c) => {
                    const q = c.qualificacao_network || null;
                    const prob = probabilidadeFechamento(q);
                    const prod = produtoApresentacao(q?.produto);
                    return (
                      <div key={c.id} className="flex items-center gap-3 rounded-lg border border-nz-borda bg-white p-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-nz-tinta truncate">{c.full_name || 'Sem nome'}</p>
                          <p className="text-[11px] text-nz-tinta-fraca truncate">{[c.phone, c.email].filter(Boolean).join(' · ') || 'sem contato'}</p>
                        </div>
                        {prob ? (
                          <button type="button" onClick={() => setQualificando(c)} className="shrink-0 text-right" title="Editar qualificação">
                            <p className="text-[11px] text-nz-tinta-fraca">
                              🫱{q.confianca} 💰{q.financeiro} 🔥{q.apetite}{prod ? ` · ${prod.emoji} ${prod.label}` : ''}
                            </p>
                            <p className={`text-xs font-bold ${COR_FAIXA[prob.faixa.id]}`}>
                              {prob.faixa.emoji} {prob.pct}% de fechamento · {prob.total}/15
                            </p>
                          </button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setQualificando(c)} className="border-nz-borda text-nz-tinta h-8 shrink-0">
                            <Star className="w-4 h-4 mr-1 text-amber-500" /> Qualificar
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <CrmNetworkQualificacaoModal
                contato={qualificando}
                onFechar={() => setQualificando(null)}
                onSalvar={salvarQualificacao}
                salvando={salvando}
              />
            </div>
          );
        })()}

        {/* ══ 📜 HÁBITO 4 — CONTATO E CONVITE VIVO (DIR-47) ══ */}
        {painel === 'contato' && (() => {
          const hoje = hojeStr();
          const fmtHora = (s) => { const d = new Date(s); return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
          const fmtQuando = (s) => { const d = new Date(s); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };
          // 🙋/👥 DIR-49 — o escopo (fila + agenda): MINHA é o padrão; TIME só
          // existe pra visão total. "Minha" = o que EU cadastrei/registrei.
          const minha = !visaoTotal || escopoAgenda === 'minha';
          const quem = (nome) => (minha ? 'você' : (nome || 'sem dono definido')); // DIR-50/54: dono na frente
          const nomeDoDono = (c) => (c.created_by_id && c.created_by_id !== 'anonymous' ? nomePorUsuarioId[c.created_by_id] : null);

          // 🎯 DIR-54 — a fila respeita o MESMO escopo: MINHA só os que EU
          // cadastrei; TIME mostra todos, com o dono identificado em cada um.
          const filaTodos = clientesManuais
            .map((c) => ({ c, prob: probabilidadeFechamento(c.qualificacao_network) }))
            .filter((x) => x.prob)
            .sort((a, b) => b.prob.pct - a.prob.pct);
          const fila = visaoTotal && minha ? filaTodos.filter(({ c }) => c.created_by_id === uid) : filaTodos;
          const totalEscopado = visaoTotal && minha ? clientesManuais.filter((c) => c.created_by_id === uid).length : clientesManuais.length;
          const semQualificar = totalEscopado - fila.length; // DIR-49/54: fila honesta, no MESMO escopo

          const agenda = agendaDoDiaContatos(clientesManuais, hoje);
          const reunioesEsteiraHoje = reunioes.filter((o) => String(o.reuniao_em).slice(0, 10) === hoje);
          const agendados = minha ? agenda.agendados.filter(({ registro }) => registro.registrado_por_id === uid) : agenda.agendados;
          const retornos = minha ? agenda.retornos.filter(({ registro }) => registro.registrado_por_id === uid) : agenda.retornos;
          const esteiraDoDia = minha ? reunioesEsteiraHoje.filter((o) => o.responsavel_id === uid || o.criado_por_id === uid) : reunioesEsteiraHoje;
          // DIR-49.1 — reunião de dia futuro não pode ser invisível
          const proximasTodas = proximasReunioes(clientesManuais, hoje);
          const proximas = minha ? proximasTodas.filter(({ registro }) => registro.registrado_por_id === uid) : proximasTodas;
          // a LINHA DO TEMPO UNIFICADA: método + esteira + empresa + (na MINHA)
          // o Google — o Google é pessoal, nunca entra na visão do time; a
          // reunião da EMPRESA é de todos, entra nas duas.
          const empresaHoje = reunioesEmpresaDoDia(reunioesEmpresa, hoje);
          const linha = linhaDoTempoUnificada([
            ...agendados.map(({ cliente, registro }) => ({ origem: 'metodo', quando: registro.quando, cliente, registro })),
            ...esteiraDoDia.map((o) => ({ origem: 'esteira', quando: o.reuniao_em, o })),
            ...empresaHoje.map((r) => ({ origem: 'empresa', quando: r.quando, r })),
            ...(minha && Array.isArray(googleEventos) ? googleEventos.map((e) => ({ origem: 'google', quando: e.inicio, e })) : []),
          ]);
          const nReunioes = agendados.length + esteiraDoDia.length + empresaHoje.length;
          const resumoSemana = resumoSemanaReunioes(clientesManuais, hoje); // DIR-51
          const podeMexer = (registro) => registro.registrado_por_id === uid || visaoTotal; // DIR-50
          return (
            <div className="space-y-4">
              <div className="rounded-lg bg-nz-cinza-fundo/60 border border-nz-borda p-3 text-xs text-nz-tinta-fraca">
                📖 Antes do convite, o F.O.R.M. da pessoa: <strong>F</strong>amília · <strong>O</strong>cupação · <strong>R</strong>ecreação · <strong>M</strong>ensagem certa — você preenche na ficha de cada pessoa (Hábito 6 → Clientes).
              </div>

              {/* 🎯 fila dos qualificados da lista (DIR-46 alimenta o contato) */}
              <div>
                <p className="text-sm font-bold text-nz-tinta mb-1.5">
                  🎯 Quem contatar — {visaoTotal && !minha ? 'os qualificados do TIME' : 'os qualificados da sua lista'}{fila.length > 0 ? ` (${fila.length})` : ''}
                </p>
                {visaoTotal && (
                  <p className="text-[11px] text-nz-tinta-fraca mb-1.5">{minha ? '🙋 mostrando só os SEUS cadastros — troque pra 👥 TIME INTEIRO na agenda abaixo pra ver de todo mundo' : '👥 mostrando os cadastros de TODO MUNDO, cada um com o dono identificado'}</p>
                )}
                {fila.length === 0 ? (
                  <p className="text-xs text-nz-tinta-fraca py-3 text-center border border-dashed border-nz-borda rounded-xl">
                    Ninguém qualificado ainda —{' '}
                    <button type="button" onClick={() => onIr?.('lista')} className="font-semibold text-nz-verde hover:text-nz-verde-claro">qualifique sua lista no Hábito 3 →</button>
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {fila.map(({ c, prob }) => (
                      <div key={c.id} className="flex items-center gap-2 sm:gap-3 rounded-lg border border-nz-borda bg-white p-2.5 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-nz-tinta truncate">
                            {visaoTotal && <span className="font-bold text-nz-verde">👤 {quem(nomeDoDono(c))} · </span>}
                            {c.full_name || 'Sem nome'}
                          </p>
                          <p className="text-[11px] text-nz-tinta-fraca truncate">{[c.phone, c.email].filter(Boolean).join(' · ') || 'sem contato'}</p>
                          {(() => { // DIR-49.1 — o registro salvo aparece AQUI, na hora
                            const u = ultimoContato(c);
                            const r = u && RESULTADOS_CONTATO.find((x) => x.id === u.resultado);
                            return r ? <p className="text-[11px] font-medium text-nz-verde truncate">último: {r.emoji} {r.label} · {fmtQuando(u.em)}</p> : null;
                          })()}
                        </div>
                        <p className={`text-xs font-bold shrink-0 ${COR_FAIXA[prob.faixa.id]}`}>{prob.faixa.emoji} {prob.pct}%</p>
                        {/* DIR-49 — os DOIS caminhos claros: agendar em 1 clique ou registrar o desfecho */}
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" onClick={() => setRegistroAberto({ contato: c, agendar: true })} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8">
                            📅 Agendar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRegistroAberto({ contato: c })} className="border-nz-verde/40 text-nz-verde hover:bg-nz-verde-fundo h-8">
                            ✍️ Registrar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* DIR-49/54 — fila honesta: quem ficou de fora e por quê, no MESMO escopo */}
                {semQualificar > 0 && (
                  <p className="text-[11px] text-nz-tinta-fraca mt-1.5">
                    ⭐ {semQualificar === 1 ? `+1 pessoa d${visaoTotal && !minha ? 'o time' : 'a sua lista'} ainda sem qualificação` : `+${semQualificar} pessoas d${visaoTotal && !minha ? 'o time' : 'a sua lista'} ainda sem qualificação`} —{' '}
                    <button type="button" onClick={() => onIr?.('lista')} className="font-semibold text-nz-verde hover:text-nz-verde-claro">qualificar no Hábito 3 →</button>
                  </p>
                )}
              </div>

              {/* 📅 DIR-49 — A AGENDA UNIFICADA: minha (padrão) × time inteiro,
                  método + esteira + Google numa linha do tempo só */}
              <div className="rounded-xl border border-nz-verde/25 bg-nz-verde-fundo/30 p-3 space-y-2">
                {visaoTotal && (
                  <div className="grid grid-cols-2 rounded-lg border border-nz-verde/30 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setEscopoAgenda('minha')}
                      className={`py-2 text-xs font-bold transition-colors ${minha ? 'bg-nz-verde text-white' : 'bg-white text-nz-tinta-fraca hover:text-nz-tinta'}`}
                    >
                      🙋 MINHA AGENDA
                    </button>
                    <button
                      type="button"
                      onClick={() => setEscopoAgenda('time')}
                      className={`py-2 text-xs font-bold transition-colors ${!minha ? 'bg-nz-verde text-white' : 'bg-white text-nz-tinta-fraca hover:text-nz-tinta'}`}
                    >
                      👥 TIME INTEIRO
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-bold text-nz-tinta">
                    {minha ? '🙋 Minha agenda de hoje' : '👥 Agenda do TIME hoje'} · {plural(nReunioes, 'reunião', 'reuniões')} · {plural(retornos.length, 'retorno', 'retornos')}
                  </p>
                  <div className="flex gap-1.5 shrink-0 flex-wrap">
                    {minha && (
                      <Button size="sm" variant="outline" onClick={conectarGoogleAgenda} disabled={googleConectando} className="border-nz-borda text-nz-tinta h-8 bg-white">
                        🗓️ {googleConectando ? 'Conectando...' : googleEventos ? 'Atualizar Google' : 'Conectar Google'}
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setRegistroAberto({ contato: null })} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8">
                      <CalendarPlus className="w-4 h-4 mr-1" /> Agendar reunião
                    </Button>
                  </div>
                </div>
                {minha && googleEventos === null && (
                  <p className="text-[11px] text-nz-tinta-fraca">🗓️ Conecte o Google pra ver os SEUS eventos de hoje aqui no meio (só leitura, direto no seu navegador — ninguém mais vê a sua agenda).</p>
                )}
                {!minha && (
                  <p className="text-[11px] text-nz-tinta-fraca">👥 Você está vendo as reuniões DO MÉTODO do time inteiro — a Google Agenda é pessoal e só aparece na sua.</p>
                )}
                {/* 📊 DIR-51 — a visão MACRO da semana, só no TIME INTEIRO */}
                {!minha && (
                  <div className="rounded-lg bg-white border border-nz-verde/25 p-2.5">
                    <p className="text-xs font-bold text-nz-tinta">📊 Semana: {plural(resumoSemana.total, 'reunião agendada', 'reuniões agendadas')} <span className="font-normal text-nz-tinta-fraca">(meta do método: {META_REUNIOES_SEMANA}/pessoa)</span></p>
                    {resumoSemana.porPessoa.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        {resumoSemana.porPessoa.map((p) => (
                          <span key={p.id} className="text-[11px] text-nz-tinta"><span className="font-bold text-nz-verde">👤 {p.nome}</span> {plural(p.total, 'reunião', 'reuniões')} · <span className={p.pct >= 100 ? 'text-nz-verde font-bold' : ''}>{p.pct}% da meta</span></span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {linha.length === 0 && retornos.length === 0 ? (
                  <p className="text-xs text-nz-tinta-fraca text-center py-2">
                    {minha && Array.isArray(googleEventos) && googleEventos.length === 0
                      ? 'Nada na sua agenda de hoje — nem no método, nem no Google. Dia livre pra contatar a fila. 🎯'
                      : minha ? 'Nada na sua agenda de hoje ainda — use o 📅 Agendar da fila acima.' : 'Nenhuma reunião do time hoje.'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {linha.map((item) => {
                      if (item.origem === 'metodo') {
                        const { cliente, registro } = item;
                        const g = registro.google_event_link
                          || linkGoogleAgenda({ titulo: registro.titulo_reuniao || `Reunião — ${cliente.full_name || 'contato'} (Leilão NoZap)`, inicio: registro.quando, duracaoMin: registro.duracao_min || 60, detalhes: registro.obs || 'Apresentação de sucesso — Contato e Convite' });
                        return (
                          <div key={registro.id || `${cliente.id}-${registro.quando}`} className="flex items-center gap-2 sm:gap-3 rounded-lg border border-nz-borda bg-white p-2.5 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-nz-tinta truncate"><span className="font-bold text-nz-verde">👤 {quem(registro.registrado_por_nome)}</span> · 📅 <span className="font-bold">{fmtHora(registro.quando)}</span> · {registro.titulo_reuniao || cliente.full_name || 'Sem nome'}</p>
                              <p className="text-[11px] text-nz-tinta-fraca truncate">reunião do método{registro.obs ? ` · ${registro.obs}` : ''}</p>
                            </div>
                            {g && (
                              <a href={g} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                <Button size="sm" variant="outline" className="border-nz-borda text-nz-tinta h-8"><CalendarPlus className="w-4 h-4 mr-1" /> {registro.google_event_link ? 'Abrir no Google' : 'Google Agenda'}</Button>
                              </a>
                            )}
                            {podeMexer(registro) && (
                              <div className="flex gap-1 shrink-0">
                                <Button size="sm" variant="outline" onClick={() => setRegistroAberto({ contato: cliente, editar: registro })} className="h-8 px-2 border-nz-borda text-nz-tinta" title="Editar reunião">✏️</Button>
                                <Button size="sm" variant="outline" onClick={() => excluirRegistro(cliente, registro)} className={`h-8 px-2 ${confirmaExcluir === registro.id ? 'border-red-500 text-red-600 bg-red-50 font-bold' : 'border-nz-borda text-nz-tinta-fraca'}`} title="Excluir (apaga do Google junto)">
                                  {confirmaExcluir === registro.id ? 'Confirma excluir?' : '🗑️'}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      }
                      if (item.origem === 'esteira') {
                        const { o } = item;
                        return (
                          <div key={o.id} className="flex items-center gap-2 sm:gap-3 rounded-lg border border-nz-borda bg-white p-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-nz-tinta truncate"><span className="font-bold text-nz-verde">👤 {quem(o.responsavel_nome)}</span> · 🛤️ <span className="font-bold">{fmtHora(o.reuniao_em)}</span> · {o.cliente_nome || 'Sem nome'}</p>
                              <p className="text-[11px] text-nz-tinta-fraca truncate">reunião da esteira</p>
                            </div>
                          </div>
                        );
                      }
                      if (item.origem === 'empresa') {
                        const { r } = item; // 🏛️ DIR-52 — de todos, sinalizada
                        return (
                          <div key={`emp-${r.id || r.titulo}`} className="flex items-center gap-2 sm:gap-3 rounded-lg border-2 border-amber-400/50 bg-amber-50/70 p-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-nz-tinta truncate">🏛️ <span className="font-bold">{r.hora}</span> · {r.titulo}</p>
                              <p className="text-[11px] text-nz-tinta-fraca truncate">reunião da empresa — todo mundo participa{r.dia_semana !== null && r.dia_semana !== undefined ? ` · toda ${DIAS_SEMANA[r.dia_semana]}` : ''}</p>
                            </div>
                          </div>
                        );
                      }
                      const { e } = item; // origem google — só na MINHA agenda
                      return (
                        <div key={e.id} className="flex items-center gap-3 rounded-lg border border-dashed border-nz-borda bg-white/70 p-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-nz-tinta truncate">🗓️ <span className="font-bold">{fmtHora(e.inicio) || 'dia todo'}</span> · {e.titulo}</p>
                            <p className="text-[11px] text-nz-tinta-fraca">da sua Google Agenda</p>
                          </div>
                        </div>
                      );
                    })}
                    {retornos.map(({ cliente, registro }) => (
                      <div key={registro.id || `${cliente.id}-ret`} className="flex items-center gap-2 sm:gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-2.5 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-nz-tinta truncate"><span className="font-bold text-nz-verde">👤 {quem(registro.registrado_por_nome)}</span> · 🔁 Retornar hoje · {cliente.full_name || 'Sem nome'}</p>
                          <p className="text-[11px] text-nz-tinta-fraca truncate">{registro.obs || 'pediu pra retornar'}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" onClick={() => setRegistroAberto({ contato: cliente, agendar: true })} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8">📅 Agendar</Button>
                          <Button size="sm" variant="outline" onClick={() => setRegistroAberto({ contato: cliente })} className="border-nz-verde/40 text-nz-verde hover:bg-nz-verde-fundo h-8">✍️ Registrar</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 📆 DIR-49.1 — reunião de dia futuro tem casa: as próximas */}
                {proximas.length > 0 && (
                  <div className="pt-1.5 border-t border-nz-verde/20">
                    <p className="text-xs font-bold text-nz-tinta mb-1.5">📆 {plural(proximas.length, 'próxima reunião', 'próximas reuniões')}</p>
                    <div className="space-y-1.5">
                      {proximas.map(({ cliente, registro }) => {
                        const g = registro.google_event_link
                          || linkGoogleAgenda({ titulo: registro.titulo_reuniao || `Reunião — ${cliente.full_name || 'contato'} (Leilão NoZap)`, inicio: registro.quando, duracaoMin: registro.duracao_min || 60, detalhes: registro.obs || 'Apresentação de sucesso — Contato e Convite' });
                        return (
                          <div key={registro.id || `${cliente.id}-${registro.quando}`} className="flex items-center gap-2 sm:gap-3 rounded-lg border border-nz-borda bg-white p-2.5 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-nz-tinta truncate"><span className="font-bold text-nz-verde">👤 {quem(registro.registrado_por_nome)}</span> · 📅 <span className="font-bold">{fmtQuando(registro.quando)}</span> · {registro.titulo_reuniao || cliente.full_name || 'Sem nome'}</p>
                              <p className="text-[11px] text-nz-tinta-fraca truncate">reunião do método{registro.local ? ` · ${registro.local}` : ''}</p>
                            </div>
                            {g && (
                              <a href={g} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                <Button size="sm" variant="outline" className="border-nz-borda text-nz-tinta h-8"><CalendarPlus className="w-4 h-4 mr-1" /> {registro.google_event_link ? 'Abrir no Google' : 'Google Agenda'}</Button>
                              </a>
                            )}
                            {podeMexer(registro) && (
                              <div className="flex gap-1 shrink-0">
                                <Button size="sm" variant="outline" onClick={() => setRegistroAberto({ contato: cliente, editar: registro })} className="h-8 px-2 border-nz-borda text-nz-tinta" title="Editar reunião">✏️</Button>
                                <Button size="sm" variant="outline" onClick={() => excluirRegistro(cliente, registro)} className={`h-8 px-2 ${confirmaExcluir === registro.id ? 'border-red-500 text-red-600 bg-red-50 font-bold' : 'border-nz-borda text-nz-tinta-fraca'}`} title="Excluir (apaga do Google junto)">
                                  {confirmaExcluir === registro.id ? 'Confirma excluir?' : '🗑️'}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 🏛️ DIR-52 — gestão das reuniões da empresa (só visão total) */}
              {visaoTotal && (
                <div className="rounded-xl border border-amber-400/40 bg-amber-50/40 p-3 space-y-2">
                  <p className="text-sm font-bold text-nz-tinta">🏛️ Reuniões da empresa <span className="font-normal text-xs text-nz-tinta-fraca">— cadastra uma vez, entra na agenda de TODO MUNDO</span></p>
                  {reunioesEmpresa.length > 0 && (
                    <div className="space-y-1">
                      {reunioesEmpresa.map((r) => (
                        <div key={r.id || r.titulo} className="flex items-center gap-2 rounded-lg border border-nz-borda bg-white p-2 flex-wrap">
                          <p className="flex-1 min-w-0 text-xs text-nz-tinta truncate"><span className="font-bold">{r.titulo}</span> · {r.dia_semana !== null && r.dia_semana !== undefined ? `toda ${DIAS_SEMANA[r.dia_semana]}` : (r.data || 'sem data')} às {r.hora} · {r.duracao_min || 60} min</p>
                          <Button size="sm" variant="outline" onClick={() => excluirReuniaoEmpresa(r)} className={`h-7 px-2 text-xs ${confirmaExcluir === `emp-${r.id}` ? 'border-red-500 text-red-600 bg-red-50 font-bold' : 'border-nz-borda text-nz-tinta-fraca'}`}>
                            {confirmaExcluir === `emp-${r.id}` ? 'Confirma excluir?' : '🗑️'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-[11px] font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1">Título</p>
                      <Input value={novaEmpresa.titulo} onChange={(e) => setNovaEmpresa((p) => ({ ...p, titulo: e.target.value }))} placeholder="ex.: Mentalidade do Diretor" className="bg-white border-nz-borda text-nz-tinta text-sm h-9" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1">Quando</p>
                      <div className="flex gap-1.5">
                        <select value={novaEmpresa.recorrencia} onChange={(e) => setNovaEmpresa((p) => ({ ...p, recorrencia: e.target.value }))} className="rounded-md border border-nz-borda bg-white text-nz-tinta text-sm h-9 px-2">
                          <option value="semana">toda semana</option>
                          <option value="data">data única</option>
                        </select>
                        {novaEmpresa.recorrencia === 'semana' ? (
                          <select value={novaEmpresa.dia_semana} onChange={(e) => setNovaEmpresa((p) => ({ ...p, dia_semana: Number(e.target.value) }))} className="rounded-md border border-nz-borda bg-white text-nz-tinta text-sm h-9 px-2">
                            {DIAS_SEMANA.map((d, i) => <option key={d} value={i}>{d}</option>)}
                          </select>
                        ) : (
                          <Input type="date" value={novaEmpresa.data} onChange={(e) => setNovaEmpresa((p) => ({ ...p, data: e.target.value }))} className="bg-white border-nz-borda text-nz-tinta text-sm h-9 w-auto" />
                        )}
                        <Input type="time" value={novaEmpresa.hora} onChange={(e) => setNovaEmpresa((p) => ({ ...p, hora: e.target.value }))} className="bg-white border-nz-borda text-nz-tinta text-sm h-9 w-auto" />
                      </div>
                    </div>
                    <div>
                      {/* DIR-54 — duas formas de dizer quando termina: minutos OU o horário final */}
                      <p className="text-[11px] font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1">Até quando</p>
                      <div className="flex gap-1.5">
                        <select value={novaEmpresa.modoFim} onChange={(e) => setNovaEmpresa((p) => ({ ...p, modoFim: e.target.value }))} className="rounded-md border border-nz-borda bg-white text-nz-tinta text-sm h-9 px-2">
                          <option value="duracao">⏱️ duração</option>
                          <option value="fim">🏁 até às</option>
                        </select>
                        {novaEmpresa.modoFim === 'duracao' ? (
                          <select value={novaEmpresa.duracao_min} onChange={(e) => setNovaEmpresa((p) => ({ ...p, duracao_min: Number(e.target.value) }))} className="rounded-md border border-nz-borda bg-white text-nz-tinta text-sm h-9 px-2">
                            {DURACOES_REUNIAO.map((d) => <option key={d} value={d}>{d} min</option>)}
                          </select>
                        ) : (
                          <Input type="time" value={novaEmpresa.hora_fim} onChange={(e) => setNovaEmpresa((p) => ({ ...p, hora_fim: e.target.value }))} className="bg-white border-nz-borda text-nz-tinta text-sm h-9 w-auto" />
                        )}
                      </div>
                      {novaEmpresa.modoFim === 'fim' && (
                        <p className="text-[11px] text-nz-tinta-fraca mt-1">{duracaoEmpresaMin ? `= ${duracaoEmpresaMin} min` : 'o término precisa ser depois do início'}</p>
                      )}
                    </div>
                    <Button size="sm" onClick={criarReuniaoEmpresa} disabled={salvando || !novaEmpresa.titulo.trim() || !duracaoEmpresaMin} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-9">
                      <Plus className="w-4 h-4 mr-1" /> Salvar pra todo mundo
                    </Button>
                  </div>
                </div>
              )}

              {/* o SEU script (mantém) */}
              <div className="rounded-lg border border-nz-borda p-3 space-y-2">
                <p className="text-xs text-nz-tinta-fraca">Escreva o SEU script de convite — o método ensina, mas a voz é sua. Aperfeiçoe a cada conversa.</p>
                <Textarea value={script} onChange={(e) => setScript(e.target.value)} rows={8} placeholder={EXEMPLO_SCRIPT} className="bg-white border-nz-borda text-nz-tinta text-sm" />
                <Button onClick={() => salvarPerfil({ script })} disabled={salvando} className="bg-nz-verde hover:bg-nz-verde-claro text-white">
                  <Save className="w-4 h-4 mr-2" /> {salvando ? 'Salvando...' : 'Salvar meu script'}
                </Button>
              </div>

              <CrmContatoRegistroModal
                aberto={registroAberto !== null}
                contatoInicial={registroAberto?.contato || null}
                agendarDireto={!!registroAberto?.agendar}
                registroInicial={registroAberto?.editar || null}
                contatos={clientesManuais}
                onFechar={() => setRegistroAberto(null)}
                onSalvar={salvarRegistroContato}
                salvando={salvando}
                criarNoGoogleFn={registroAberto?.editar ? atualizarEventoNoGoogle(registroAberto.editar) : criarEventoNoGoogle}
              />
            </div>
          );
        })()}

        {/* ══ 🎤 HÁBITO 5 — APRESENTAÇÃO DE SUCESSO (agenda) ══ */}
        {painel === 'apresentacao' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <p className={`text-sm font-bold ${reunioesHoje >= 3 ? 'text-nz-verde' : 'text-nz-tinta'}`}>📅 Hoje: {reunioesHoje} de 3 reuniões (meta do método)</p>
              <button type="button" onClick={() => onIr?.('acompanhamento', 'expansao')} className="text-sm font-semibold text-nz-verde hover:text-nz-verde-claro">+ Agendar reunião (na esteira) →</button>
            </div>
            {reunioes.length === 0 ? (
              <p className="text-sm text-nz-tinta-fraca py-3 text-center">Nenhuma reunião nos próximos 7 dias — reunião nasce da oportunidade na esteira.</p>
            ) : (
              <div className="space-y-1.5">
                {reunioes.map((o) => {
                  const g = linkGoogleAgenda({ titulo: `Reunião — ${o.cliente_nome || 'apresentação'} (Leilão NoZap)`, inicio: o.reuniao_em, duracaoMin: 60, detalhes: `Apresentação de sucesso · ${o.tipo || ''} · responsável: ${o.responsavel_nome || ''}` });
                  return (
                    <div key={o.id} className="flex items-center gap-3 rounded-lg border border-nz-borda bg-white p-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-nz-tinta truncate">{o.cliente_nome || 'Sem nome'}</p>
                        <p className="text-[11px] text-nz-tinta-fraca">{new Date(o.reuniao_em).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {o.responsavel_nome || ''}</p>
                      </div>
                      {g && (
                        <a href={g} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <Button size="sm" variant="outline" className="border-nz-borda text-nz-tinta h-8"><CalendarPlus className="w-4 h-4 mr-1" /> Google Agenda</Button>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="rounded-lg border border-nz-borda p-3 space-y-2">
              <p className="text-xs font-semibold text-nz-tinta">🎤 Apresentação oficial do negócio</p>
              <div className="flex gap-2">
                <Input value={apresentacaoUrl} onChange={(e) => setApresentacaoUrl(e.target.value)} placeholder="cole aqui o link da apresentação (deck, página, vídeo)..." className="bg-white border-nz-borda text-nz-tinta text-sm" />
                <Button size="sm" onClick={() => salvarPerfil({ apresentacao_url: apresentacaoUrl })} disabled={salvando} className="bg-nz-verde hover:bg-nz-verde-claro text-white shrink-0 h-9"><Save className="w-4 h-4" /></Button>
                {perfil?.apresentacao_url && (
                  <a href={perfil.apresentacao_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <Button size="sm" variant="outline" className="border-nz-borda text-nz-tinta h-9"><ExternalLink className="w-4 h-4 mr-1" /> Abrir</Button>
                  </a>
                )}
              </div>
              <p className="text-[11px] text-nz-tinta-fraca">Conexão → FORM → Mensagem → Convite → Apresentação → <strong>Próximo Passo</strong>.</p>
            </div>
          </div>
        )}

        {/* ══ 🔁 HÁBITO 8 — DUPLICAÇÃO (local de treinamento) ══ */}
        {painel === 'duplicacao' && (
          <div className="space-y-3">
            <div className="space-y-2">
              {HABITOS.map((h) => (
                <div key={h.n} className="rounded-lg border border-nz-borda p-3">
                  <p className="text-sm font-bold text-nz-tinta"><span className="text-nz-verde">{h.n}. {h.titulo}</span><span className="text-nz-tinta-fraca font-normal"> — {h.sub}</span></p>
                  <p className="text-sm text-nz-tinta-fraca mt-0.5">{h.texto}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-dashed border-nz-verde/40 bg-nz-verde-fundo/40 p-4 text-center">
              <p className="text-sm font-semibold text-nz-tinta">🎓 Local de treinamento do time</p>
              <p className="text-xs text-nz-tinta-fraca mt-1">Aqui entram os materiais oficiais (vídeos, decks, trilha do novo executivo). Estrutura pronta — os conteúdos entram conforme o time for gravando.</p>
            </div>
            <p className="text-xs text-nz-tinta-fraca text-center italic">"A disciplina é a ponte entre objetivos e realização." — Jim Rohn</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
