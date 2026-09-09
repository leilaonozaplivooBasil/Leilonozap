import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing, X, Reply } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { nomeExibicao } from '@/lib/xgame';
import {
  TIPOS_MENSAGEM, ordenarMensagens, mensagensRecebidasPor, contarNaoLidas, papeisDoCargo, respostaValida,
} from '@/lib/mensagensXgame';
import { proximaParaBanner, SEGUNDOS_ANTES_DE_FECHAR } from '@/lib/notificacoesXgame';
import { cabecalhosSessao } from '@/lib/sessaoCliente';

const POLL_MS = 30000;

const fmtQuando = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return mesmoDia ? `hoje ${hora}` : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hora}`;
};

/**
 * 🔔 O SINO — notificação persistente do X-GAME/Método (09/09/2026, DIR-130).
 *
 * Dono: "está faltando um sininho de notificação... quando a pessoa abrir o
 * aplicativo, tem que entrar uma mensagem como fosse a venda, e ficar ali
 * até ela identificar, e fechar ou esperar um tempo, uns dez segundos, e dar
 * a opção dela fechar. Não pode ter certeza que ela viu, e ficar no sininho
 * pra ela ler... e precisa estar funcional a respostas por dentro, pra
 * comunicar a ida e a volta."
 *
 * Auto-contido: recebe só `currentUser`, busca o cargo dele (pra saber se
 * também recebe mensagem de papel coletivo — CEO/diretoria/executivos) e as
 * mensagens (mesma rota server-side de `MensagemProCeo.jsx`, já que a
 * tabela nega SELECT direto — ver `xgameMensagensListar.js`).
 *
 * Fechar o BANNER nunca marca como lida — só sai da tela; a mensagem
 * continua no sino até a pessoa abrir de verdade (clicar no item). O botão
 * de fechar fica desabilitado por `SEGUNDOS_ANTES_DE_FECHAR` — "não pode ter
 * certeza que ela viu" sem pelo menos esse tempo na tela.
 */
export default function SinoNotificacoes({ currentUser }) {
  const uid = currentUser?.id;
  const [cargo, setCargo] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [dispensadosNaSessao, setDispensadosNaSessao] = useState(() => new Set());
  const [segundosRestantes, setSegundosRestantes] = useState(SEGUNDOS_ANTES_DE_FECHAR);
  const [respondendo, setRespondendo] = useState(null); // { id, texto }
  const [respondendoEnviando, setRespondendoEnviando] = useState(false);
  const painelRef = useRef(null);

  const carregar = useCallback(async () => {
    if (!uid) return;
    const [msgsR, part] = await Promise.all([
      fetch('/api/functions/xgameMensagensListar', {
        method: 'POST',
        headers: cabecalhosSessao({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ actorId: uid }),
      }).then((r) => r.json()).catch(() => null),
      supabase.from('xgame_participantes').select('cargo').eq('user_id', uid).maybeSingle(),
    ]);
    setMensagens(msgsR?.ok ? msgsR.mensagens : []);
    setCargo(part?.data?.cargo || null);
  }, [uid]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    if (!uid) return undefined;
    const t = setInterval(carregar, POLL_MS);
    return () => clearInterval(t);
  }, [uid, carregar]);

  // 🚪 fecha o painel ao clicar fora
  useEffect(() => {
    if (!aberto) return undefined;
    const aoClicar = (e) => { if (painelRef.current && !painelRef.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', aoClicar);
    return () => document.removeEventListener('mousedown', aoClicar);
  }, [aberto]);

  const papeis = useMemo(() => papeisDoCargo(cargo), [cargo]);
  const recebidas = useMemo(() => ordenarMensagens(mensagensRecebidasPor(mensagens, { userId: uid, papeis })), [mensagens, uid, papeis]);
  const naoLidas = contarNaoLidas(recebidas);
  const banner = useMemo(() => proximaParaBanner(recebidas, dispensadosNaSessao), [recebidas, dispensadosNaSessao]);

  // ⏳ a contagem de 10s recomeça sempre que um banner NOVO aparece
  useEffect(() => {
    if (!banner) { setSegundosRestantes(SEGUNDOS_ANTES_DE_FECHAR); return undefined; }
    setSegundosRestantes(SEGUNDOS_ANTES_DE_FECHAR);
    const t = setInterval(() => setSegundosRestantes((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [banner?.id]);

  const marcarLida = async (m) => {
    if (m.lida) return;
    setMensagens((l) => l.map((x) => (x.id === m.id ? { ...x, lida: true } : x)));
    await supabase.from('xgame_mensagens').update({ lida: true }).eq('id', m.id);
  };

  const dispensarBanner = (m) => {
    if (segundosRestantes > 0) return;
    setDispensadosNaSessao((s) => new Set(s).add(m.id));
  };

  const enviarResposta = async (original) => {
    const texto = respondendo?.texto || '';
    const validacao = respostaValida(texto);
    if (!validacao.ok) return;
    setRespondendoEnviando(true);
    const citacao = String(original.texto || '').slice(0, 80);
    const linha = {
      remetente_id: uid,
      remetente_nome: nomeExibicao(currentUser) || currentUser?.full_name || 'alguém do time',
      destino_tipo: 'pessoa',
      destino_id: original.remetente_id,
      destino_nome: original.remetente_nome,
      tipo: 'resposta',
      texto: `↩️ em resposta a "${citacao}${original.texto.length > 80 ? '…' : ''}": ${texto.trim()}`,
    };
    const { error } = await supabase.from('xgame_mensagens').insert(linha);
    setRespondendoEnviando(false);
    if (error) return;
    setRespondendo(null);
    await marcarLida(original);
    setDispensadosNaSessao((s) => new Set(s).add(original.id));
    carregar();
  };

  if (!uid) return null;

  return (
    <div className="relative" data-teste="sino-notificacoes">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-label={naoLidas > 0 ? `${naoLidas} notificações não lidas` : 'Notificações'}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-nz-tinta-fraca hover:text-nz-verde hover:bg-black/5 transition-colors"
        data-teste="sino-botao"
      >
        {naoLidas > 0 ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-nz-verde px-1 text-[9px] font-bold text-white" data-teste="sino-contador">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div ref={painelRef} className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-white/15 bg-nz-tinta shadow-2xl z-50" data-teste="sino-painel">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Notificações</p>
            <button type="button" onClick={() => setAberto(false)} className="text-white/40 hover:text-white" aria-label="Fechar"><X className="w-3.5 h-3.5" /></button>
          </div>
          <ul className="max-h-96 overflow-y-auto p-2 space-y-1.5">
            {recebidas.length === 0 && <p className="p-2 text-[11px] text-white/30">nada por aqui ainda.</p>}
            {recebidas.map((m) => (
              <li
                key={m.id}
                onClick={() => marcarLida(m)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] cursor-pointer ${!m.lida ? 'border-nz-verde/40' : 'border-white/10'}`}
                style={{ background: 'rgba(255,255,255,0.02)' }}
                data-teste="sino-item"
                data-lida={m.lida ? 'sim' : 'nao'}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>{TIPOS_MENSAGEM[m.tipo]?.emoji}</span>
                  <span className="font-bold text-white/85">{m.remetente_nome}</span>
                  <span className="ml-auto text-white/30 text-[10px]">{fmtQuando(m.created_at)}</span>
                </div>
                <p className="mt-0.5 text-white/70">{m.texto}</p>
                {respondendo?.id === m.id ? (
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()} data-teste="sino-responder-caixa">
                    <input
                      autoFocus value={respondendo.texto}
                      onChange={(e) => setRespondendo((r) => ({ ...r, texto: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') enviarResposta(m); }}
                      placeholder="responde por dentro..."
                      className="h-7 flex-1 min-w-[140px] rounded-lg border border-white/15 bg-white/[0.06] px-2 text-[11px] text-white placeholder:text-white/30 outline-none focus:border-white/40"
                      data-teste="sino-responder-texto"
                    />
                    <button type="button" onClick={() => enviarResposta(m)} disabled={respondendoEnviando} className="h-7 rounded-lg bg-nz-verde px-2 text-[10px] font-bold text-white hover:bg-nz-verde-claro" data-teste="sino-responder-enviar">enviar</button>
                  </div>
                ) : (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setRespondendo({ id: m.id, texto: '' }); }} className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-white/40 hover:text-white" data-teste="sino-responder-abrir">
                    <Reply className="w-3 h-3" /> responder por dentro
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 📣 O BANNER — "fica ali até ela identificar, e fechar ou esperar um
          tempo, uns dez segundos, e dar a opção dela fechar." Fixo, como um
          alerta de venda; fechar NUNCA marca como lida — só some da tela. */}
      {banner && (
        <div className="fixed inset-x-3 bottom-3 z-[60] sm:inset-x-auto sm:right-4 sm:w-96" data-teste="sino-banner" data-mensagem-id={banner.id}>
          <div className="rounded-xl border border-nz-verde/40 bg-nz-tinta p-3 shadow-2xl">
            <div className="flex items-center gap-1.5">
              <span className="text-base">{TIPOS_MENSAGEM[banner.tipo]?.emoji}</span>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-nz-verde">{banner.remetente_nome}</p>
              <button
                type="button"
                onClick={() => dispensarBanner(banner)}
                disabled={segundosRestantes > 0}
                aria-label="Fechar"
                title={segundosRestantes > 0 ? `fecha em ${segundosRestantes}s` : 'fechar'}
                className="ml-auto inline-flex h-6 items-center gap-1 rounded-full px-1.5 text-[10px] text-white/40 disabled:opacity-40 enabled:hover:text-white enabled:hover:bg-white/10"
                data-teste="sino-banner-fechar"
              >
                {segundosRestantes > 0 ? segundosRestantes : <X className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="mt-1 text-[12px] text-white/85">{banner.texto}</p>
            {respondendo?.id === banner.id ? (
              <div className="mt-2 flex items-center gap-1.5" data-teste="sino-banner-responder-caixa">
                <input
                  autoFocus value={respondendo.texto}
                  onChange={(e) => setRespondendo((r) => ({ ...r, texto: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') enviarResposta(banner); }}
                  placeholder="responde por dentro..."
                  className="h-8 flex-1 rounded-lg border border-white/15 bg-white/[0.06] px-2 text-[12px] text-white placeholder:text-white/30 outline-none focus:border-white/40"
                  data-teste="sino-banner-responder-texto"
                />
                <button type="button" onClick={() => enviarResposta(banner)} disabled={respondendoEnviando} className="h-8 rounded-lg bg-nz-verde px-2.5 text-[11px] font-bold text-white hover:bg-nz-verde-claro" data-teste="sino-banner-responder-enviar">enviar</button>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={() => setRespondendo({ id: banner.id, texto: '' })} className="inline-flex items-center gap-1 text-[11px] font-bold text-nz-verde hover:underline" data-teste="sino-banner-responder-abrir">
                  <Reply className="w-3 h-3" /> responder por dentro
                </button>
                <button type="button" onClick={() => { marcarLida(banner); setDispensadosNaSessao((s) => new Set(s).add(banner.id)); }} className="ml-auto text-[10px] text-white/40 hover:text-white" data-teste="sino-banner-marcar-lida">
                  marcar como lida
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
