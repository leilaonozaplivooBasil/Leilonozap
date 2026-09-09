import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Send, Inbox, Loader2, Reply } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { nomeExibicao } from '@/lib/xgame';
import { timeCorporativo } from '@/lib/timeCorporativo';
import {
  DESTINOS, TIPOS_MENSAGEM, TIPOS_COMPOSIVEIS, TAMANHO_MINIMO_TEXTO, mensagemValida, respostaValida,
  ordenarMensagens, mensagensRecebidasPor, mensagensEnviadasPor, papeisDoCargo,
} from '@/lib/mensagensXgame';

const fmtQuando = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return mesmoDia ? `hoje ${hora}` : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hora}`;
};

/**
 * 📨 MENSAGEM PRO CEO (DIR-106, 09/09/2026) — dono: "a mensagem pro CEO, a
 * mensagem pra diretoria, a mensagem pros executivos, a gente tem que ter
 * isso aí... eles precisam entender que pra falar com o CEO, precisa, não
 * pode ser bobeira... sugestão, pedido, agradecimento. E eles podem mandar
 * um pros outros, demandas." Escopo: quem está no time corporativo e no
 * game — o mesmo público desta tela (XPerformance).
 */
export default function MensagemProCeo({ currentUser, cargo }) {
  const uid = currentUser?.id;
  const [carregando, setCarregando] = useState(true);
  const [mensagens, setMensagens] = useState([]);
  const [colegas, setColegas] = useState([]);
  const [aba, setAba] = useState('recebidas'); // 'recebidas' | 'enviadas'
  const [rascunho, setRascunho] = useState({ destinoTipo: 'ceo', destinoId: '', tipo: 'sugestao', texto: '' });
  const [enviando, setEnviando] = useState(false);
  // ↩️ 09/09/2026 — DIR-107, dono: "eu quero sempre o retorno deles
  // dentro." A resposta a uma mensagem recebida, direto por dentro.
  const [respondendo, setRespondendo] = useState(null); // { id, texto }
  const [respondendoEnviando, setRespondendoEnviando] = useState(false);

  const carregar = useCallback(async () => {
    const [msgs, usuarios] = await Promise.all([
      supabase.from('xgame_mensagens').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('app_users').select('id,full_name,nickname,career_levels,primary_career_level'),
    ]);
    setMensagens(msgs.data || []);
    setColegas(timeCorporativo(usuarios.data || [], nomeExibicao).filter((p) => p.id !== uid));
    setCarregando(false);
  }, [uid]);

  useEffect(() => { carregar(); }, [carregar]);

  const papeis = useMemo(() => papeisDoCargo(cargo), [cargo]);
  const recebidas = useMemo(() => ordenarMensagens(mensagensRecebidasPor(mensagens, { userId: uid, papeis })), [mensagens, uid, papeis]);
  const enviadas = useMemo(() => ordenarMensagens(mensagensEnviadasPor(mensagens, uid)), [mensagens, uid]);

  const validacao = mensagemValida(rascunho);
  const faltam = Math.max(0, TAMANHO_MINIMO_TEXTO - rascunho.texto.trim().length);

  const marcarLida = async (m) => {
    if (m.lida) return;
    setMensagens((l) => l.map((x) => (x.id === m.id ? { ...x, lida: true } : x)));
    await supabase.from('xgame_mensagens').update({ lida: true }).eq('id', m.id);
  };

  const enviar = async () => {
    if (!validacao.ok) { toast.error(validacao.motivo); return; }
    if (rascunho.destinoTipo === 'pessoa' && !rascunho.destinoId) { toast.error('Escolhe o colega.'); return; }
    setEnviando(true);
    const colega = colegas.find((c) => c.id === rascunho.destinoId);
    const linha = {
      remetente_id: uid,
      remetente_nome: nomeExibicao(currentUser) || currentUser?.full_name || 'alguém do time',
      destino_tipo: rascunho.destinoTipo,
      destino_id: rascunho.destinoTipo === 'pessoa' ? rascunho.destinoId : null,
      destino_nome: rascunho.destinoTipo === 'pessoa' ? (colega?.nome || null) : DESTINOS[rascunho.destinoTipo],
      tipo: rascunho.tipo,
      texto: rascunho.texto.trim(),
    };
    const { error } = await supabase.from('xgame_mensagens').insert(linha);
    setEnviando(false);
    if (error) { toast.error('Não enviou — tenta de novo'); return; }
    toast.success(`${TIPOS_MENSAGEM[rascunho.tipo].emoji} enviada pra ${linha.destino_nome}`);
    setRascunho({ destinoTipo: 'ceo', destinoId: '', tipo: 'sugestao', texto: '' });
    carregar();
  };

  const enviarResposta = async (original) => {
    const texto = respondendo?.texto || '';
    const validacao = respostaValida(texto);
    if (!validacao.ok) { toast.error(validacao.motivo); return; }
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
    if (error) { toast.error('Não enviou a resposta — tenta de novo'); return; }
    toast.success(`Resposta enviada pra ${original.remetente_nome}`);
    setRespondendo(null);
    marcarLida(original);
    carregar();
  };

  const naoLidas = recebidas.filter((m) => !m.lida).length;

  if (carregando) return <div className="py-4 text-center text-white/40"><Loader2 className="w-4 h-4 animate-spin inline" /></div>;

  return (
    <div className="space-y-3" data-teste="mensagem-pro-ceo">
      {/* ── compor ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/10 p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex flex-wrap gap-2">
          <select
            value={rascunho.destinoTipo}
            onChange={(e) => setRascunho((r) => ({ ...r, destinoTipo: e.target.value, destinoId: '' }))}
            className="rounded-lg bg-white/10 px-2 py-1.5 text-[12px] text-white"
            data-teste="mensagem-destino-tipo"
          >
            <option value="ceo">pro CEO</option>
            <option value="diretoria">pra Diretoria</option>
            <option value="executivos">pros Executivos</option>
            <option value="pessoa">pra um colega</option>
          </select>
          {rascunho.destinoTipo === 'pessoa' && (
            <select
              value={rascunho.destinoId}
              onChange={(e) => setRascunho((r) => ({ ...r, destinoId: e.target.value }))}
              className="rounded-lg bg-white/10 px-2 py-1.5 text-[12px] text-white"
              data-teste="mensagem-destino-pessoa"
            >
              <option value="">quem?</option>
              {colegas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          )}
          <select
            value={rascunho.tipo}
            onChange={(e) => setRascunho((r) => ({ ...r, tipo: e.target.value }))}
            className="rounded-lg bg-white/10 px-2 py-1.5 text-[12px] text-white"
            data-teste="mensagem-tipo"
          >
            {TIPOS_COMPOSIVEIS.map((id) => <option key={id} value={id}>{TIPOS_MENSAGEM[id].emoji} {TIPOS_MENSAGEM[id].rotulo}</option>)}
          </select>
        </div>
        <Textarea
          value={rascunho.texto}
          onChange={(e) => setRascunho((r) => ({ ...r, texto: e.target.value }))}
          placeholder={rascunho.destinoTipo === 'pessoa' ? 'a demanda pro colega — não pode ser bobeira' : 'a sugestão, o pedido ou o agradecimento — pra chegar no CEO precisa valer a pena'}
          rows={3}
          className="text-[12px]"
          data-teste="mensagem-texto"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={enviar} disabled={enviando || !validacao.ok} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8 text-[11px]" data-teste="mensagem-enviar">
            <Send className="w-3 h-3 mr-1" /> {enviando ? 'Enviando...' : 'Enviar'}
          </Button>
          <span className="text-[10px] text-white/35">
            {faltam > 0 ? `faltam ${faltam} caracteres` : 'pronta pra enviar'}
          </span>
        </div>
      </div>

      {/* ── recebidas / enviadas ──────────────────────────────────────── */}
      <div className="flex gap-1">
        <button type="button" onClick={() => setAba('recebidas')} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${aba === 'recebidas' ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white'}`} data-teste="aba-recebidas">
          <Inbox className="w-3 h-3" /> recebidas {naoLidas > 0 && <span className="rounded-full bg-nz-verde px-1.5 text-[9px] text-white">{naoLidas}</span>}
        </button>
        <button type="button" onClick={() => setAba('enviadas')} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${aba === 'enviadas' ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white'}`} data-teste="aba-enviadas">
          enviadas
        </button>
      </div>
      <ul className="space-y-1.5">
        {(aba === 'recebidas' ? recebidas : enviadas).length === 0 && (
          <p className="text-[11px] text-white/30">{aba === 'recebidas' ? 'nada por aqui ainda.' : 'você ainda não mandou nenhuma.'}</p>
        )}
        {(aba === 'recebidas' ? recebidas : enviadas).map((m) => (
          <li key={m.id} onClick={() => aba === 'recebidas' && marcarLida(m)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${aba === 'recebidas' && !m.lida ? 'border-nz-verde/40' : 'border-white/10'}`}
            style={{ background: 'rgba(255,255,255,0.02)' }} data-teste="mensagem-item">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>{TIPOS_MENSAGEM[m.tipo]?.emoji}</span>
              <span className="font-bold text-white/85">{aba === 'recebidas' ? m.remetente_nome : `pra ${m.destino_nome || DESTINOS[m.destino_tipo]}`}</span>
              <span className="text-white/30 text-[10px]">· {TIPOS_MENSAGEM[m.tipo]?.rotulo}</span>
              <span className="ml-auto text-white/30 text-[10px]">{fmtQuando(m.created_at)}</span>
            </div>
            <p className="mt-0.5 text-white/70">{m.texto}</p>
            {aba === 'recebidas' && (
              respondendo?.id === m.id ? (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()} data-teste="responder-caixa">
                  <input
                    autoFocus value={respondendo.texto}
                    onChange={(e) => setRespondendo((r) => ({ ...r, texto: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') enviarResposta(m); }}
                    placeholder="responde por dentro..."
                    className="h-7 flex-1 min-w-[160px] rounded-lg border border-white/15 bg-white/[0.06] px-2 text-[11px] text-white placeholder:text-white/30 outline-none focus:border-white/40"
                    data-teste="responder-texto"
                  />
                  <Button size="sm" onClick={() => enviarResposta(m)} disabled={respondendoEnviando} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-7 text-[10px]" data-teste="responder-enviar">enviar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setRespondendo(null)} className="h-7 text-[10px] text-white/50">cancelar</Button>
                </div>
              ) : (
                <button type="button" onClick={(e) => { e.stopPropagation(); setRespondendo({ id: m.id, texto: '' }); }} className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-white/40 hover:text-white" data-teste="responder-abrir">
                  <Reply className="w-3 h-3" /> responder por dentro
                </button>
              )
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
