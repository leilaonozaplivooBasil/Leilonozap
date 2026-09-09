import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { DESTINOS, TIPOS_MENSAGEM, ordenarMensagens, contarNaoLidas } from '@/lib/mensagensXgame';
import { cabecalhosSessao } from '@/lib/sessaoCliente';

const fmtQuando = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return mesmoDia ? `hoje ${hora}` : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hora}`;
};

/**
 * 📨 A CAIXA DE ENTRADA DO ADM (DIR-106, 09/09/2026) — dono: "eu queria
 * saber onde é que a gente vê isso... tanto eu como super admin." Uma
 * caixa só, com TUDO que o time mandou — pro CEO, pra Diretoria, pros
 * Executivos e as demandas de colega pra colega — porque o super admin
 * enxerga o negócio inteiro, não só o que é endereçado a ele.
 */
export default function CaixaDeMensagensAdmin({ currentUser }) {
  const [carregando, setCarregando] = useState(true);
  const [mensagens, setMensagens] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroDestino, setFiltroDestino] = useState('');

  // 🔐 09/09/2026 — achado crítico na auditoria pré-publicação: mesmo
  // vazamento do MensagemProCeo.jsx, só que aqui pior — esta caixa buscava
  // as 300 mensagens mais recentes de TODO MUNDO sem filtro nenhum. Agora
  // passa pela mesma rota server-side (api/functions/xgameMensagensListar),
  // que só devolve "tudo" quando o `actorId` é de fato admin/super_admin
  // ou CEO — conferido no servidor, não no navegador.
  const carregar = useCallback(async () => {
    const r = await fetch('/api/functions/xgameMensagensListar', {
      method: 'POST',
      headers: cabecalhosSessao({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ actorId: currentUser?.id, verTudo: true }),
    }).then((res) => res.json()).catch(() => null);
    setMensagens(r?.ok ? r.mensagens : []);
    setCarregando(false);
  }, [currentUser?.id]);
  useEffect(() => { carregar(); }, [carregar]);

  const marcarLida = async (m) => {
    if (m.lida) return;
    setMensagens((l) => l.map((x) => (x.id === m.id ? { ...x, lida: true } : x)));
    await supabase.from('xgame_mensagens').update({ lida: true }).eq('id', m.id);
  };

  const filtradas = useMemo(() => ordenarMensagens(mensagens).filter((m) => (
    (!filtroTipo || m.tipo === filtroTipo) && (!filtroDestino || m.destino_tipo === filtroDestino)
  )), [mensagens, filtroTipo, filtroDestino]);
  const naoLidas = contarNaoLidas(mensagens);

  if (carregando) return <div className="py-4 text-center text-white/40"><Loader2 className="w-4 h-4 animate-spin inline" /></div>;

  return (
    <div className="space-y-2" data-teste="caixa-mensagens-admin">
      <div className="flex items-center gap-2 flex-wrap">
        <Inbox className="w-4 h-4 text-nz-verde" />
        <span className="text-[10px] text-white/40">{mensagens.length} no total{naoLidas > 0 ? ` · ${naoLidas} não lida${naoLidas === 1 ? '' : 's'}` : ''}</span>
        <select value={filtroDestino} onChange={(e) => setFiltroDestino(e.target.value)} className="ml-auto rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white" data-teste="filtro-destino">
          <option value="">todo destino</option>
          {Object.entries(DESTINOS).map(([id, rotulo]) => <option key={id} value={id}>{rotulo}</option>)}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white" data-teste="filtro-tipo">
          <option value="">todo tipo</option>
          {Object.entries(TIPOS_MENSAGEM).map(([id, t]) => <option key={id} value={id}>{t.emoji} {t.rotulo}</option>)}
        </select>
      </div>
      {filtradas.length === 0 ? (
        <p className="text-[11px] text-white/30">nada por aqui ainda.</p>
      ) : (
        <ul className="space-y-1.5 max-h-96 overflow-y-auto">
          {filtradas.map((m) => (
            <li key={m.id} onClick={() => marcarLida(m)}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] cursor-pointer ${!m.lida ? 'border-nz-verde/50' : 'border-white/10'}`}
              style={{ background: 'rgba(255,255,255,0.02)' }} data-teste="mensagem-admin-item" data-lida={m.lida}>
              <div className="flex items-center gap-1.5 flex-wrap">
                {!m.lida && <span className="h-1.5 w-1.5 rounded-full bg-nz-verde shrink-0" />}
                <span>{TIPOS_MENSAGEM[m.tipo]?.emoji}</span>
                <span className="font-bold text-white/85">{m.remetente_nome}</span>
                <span className="text-white/30 text-[10px]">→ {m.destino_nome || DESTINOS[m.destino_tipo]} · {TIPOS_MENSAGEM[m.tipo]?.rotulo}</span>
                <span className="ml-auto text-white/30 text-[10px]">{fmtQuando(m.created_at)}</span>
              </div>
              <p className="mt-0.5 text-white/70">{m.texto}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
