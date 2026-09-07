import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Send, ExternalLink, MessageSquare, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { timeCorporativo } from '@/lib/timeCorporativo';
import { nomeBonito } from '@/lib/relatorioExecutivo';
import {
  ordenarFila, filtrarFila, resumoDaFila, estaEmAberto,
  ROTULO_STATUS, ROTULO_TIPO, ROTULO_PRIORIDADE, STATUS, TIPOS,
} from '@/lib/painelDemandas';

// 📋 DEMANDAS — a fila do que os usuários mandaram pelo Tira Dúvidas 24h.
//
// O PEDIDO (dono, 06/09/2026): "uma página exclusiva para anotar as demandas e
// suas prioridades (demandas passadas pelos usuários)".
//
// 🔴 O QUE ESTA PÁGINA NÃO É: um segundo sistema de tarefas. Quando o dono
// decide que um chamado vira trabalho, ele vira uma linha em xperf_demandas —
// a MESMA tabela do Encontro da Mentalidade — e segue o caminho que já existe
// (Painel Corporativo, quadro, X-Game). Uma terceira lista de pendências na
// casa seria uma lista que ninguém olha.
//
// A ESCRITA PASSA PELA ROTA, nunca daqui: suporte_chamados tem RLS só de
// leitura, e a gravação é do service_role. Assim o navegador de qualquer
// pessoa logada não mexe na fila.

const ROTA = '/api/functions/despacharChamado';

const CORES_TIPO = {
  duvida: 'bg-white/10 text-white/70',
  bug: 'bg-red-500/20 text-red-200',
  erro: 'bg-orange-500/20 text-orange-200',
  correcao: 'bg-amber-500/20 text-amber-200',
  otimizacao: 'bg-sky-500/20 text-sky-200',
};
const CORES_PRIORIDADE = {
  1: 'bg-red-500/25 text-red-100',
  2: 'bg-orange-500/20 text-orange-200',
  3: 'bg-white/10 text-white/60',
  4: 'bg-white/[0.06] text-white/45',
  5: 'bg-white/[0.06] text-white/40',
};

const campo = 'rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-white/40';
const quando = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};

function Chamado({ c, time, currentUser, onMudou }) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [pessoa, setPessoa] = useState('');
  const [prazo, setPrazo] = useState('');
  const [nota, setNota] = useState(c.nota_interna || '');

  const chamar = async (corpo) => {
    setSalvando(true);
    try {
      const r = await fetch(ROTA, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chamado_id: c.id, ...corpo }),
      });
      const j = await r.json().catch(() => null);
      if (!j?.ok) { toast.error(j?.error || 'Não consegui salvar'); return null; }
      if (j.avisoMarcacao) toast.warning(j.avisoMarcacao);
      onMudou();
      return j;
    } catch {
      toast.error('Falhou. Tenta de novo?');
      return null;
    } finally { setSalvando(false); }
  };

  const despachar = async () => {
    if (!pessoa) { toast.error('Escolha quem leva esta demanda.'); return; }
    const p = time.find((x) => x.id === pessoa);
    const j = await chamar({
      acao: 'virar_demanda', pessoa_id: pessoa, pessoa_nome: p?.nome || null,
      criado_por_id: currentUser?.id || null, criado_por_nome: currentUser?.full_name || null,
      prazo_dia: prazo || null,
    });
    if (j?.ok) toast.success(j.jaDespachado ? 'Este chamado já tinha virado demanda.' : `Vai pro Painel Corporativo de ${nomeBonito(p?.nome || '')}.`);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden" data-teste="chamado">
      <button type="button" onClick={() => setAberto((v) => !v)} className="w-full text-left px-3 py-2.5 hover:bg-white/[0.03]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${CORES_TIPO[c.tipo] || CORES_TIPO.duvida}`}>{ROTULO_TIPO[c.tipo] || c.tipo}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${CORES_PRIORIDADE[c.prioridade] || CORES_PRIORIDADE[3]}`}>{ROTULO_PRIORIDADE[c.prioridade] || 'normal'}</span>
          {!estaEmAberto(c) && <span className="rounded px-1.5 py-0.5 text-[10px] bg-emerald-500/15 text-emerald-200">{ROTULO_STATUS[c.status]}</span>}
          <span className="flex-1" />
          <span className="text-[10px] text-white/35">{quando(c.created_at)}</span>
        </div>
        <p className="text-white font-semibold mt-1 leading-snug">{c.titulo || c.pergunta}</p>
        <p className="text-[11px] text-white/40 mt-0.5">
          {c.usuario_nome ? nomeBonito(c.usuario_nome) : 'alguém do time'}{c.pagina ? ` · ${c.pagina}` : ''}
        </p>
      </button>

      {aberto && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-white/[0.07] pt-2.5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/35 mb-0.5">o que a pessoa escreveu</p>
            <p className="text-white/80 text-[13px] whitespace-pre-line">{c.pergunta}</p>
          </div>

          {c.imagem_url && (
            <a href={c.imagem_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] text-sky-300 hover:text-sky-200">
              ver o print <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {c.resposta && (
            <div className="rounded-lg bg-black/25 px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-widest text-white/35 mb-0.5 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> o que a IA respondeu na hora
                {typeof c.confianca === 'number' && <span className="text-white/25">· confiança {c.confianca}%</span>}
              </p>
              <p className="text-white/65 text-[12px] whitespace-pre-line">{c.resposta}</p>
            </div>
          )}

          {/* ── a decisão ── */}
          <div className="flex items-center gap-2 flex-wrap">
            <select value={c.status} onChange={(e) => chamar({ acao: 'atualizar', status: e.target.value })} disabled={salvando} className={campo} data-teste="chamado-status">
              {STATUS.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}
            </select>
            <select value={c.prioridade || 3} onChange={(e) => chamar({ acao: 'atualizar', prioridade: Number(e.target.value) })} disabled={salvando} className={campo} data-teste="chamado-prioridade">
              {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>{p} · {ROTULO_PRIORIDADE[p]}</option>)}
            </select>
            {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              onBlur={() => { if (nota !== (c.nota_interna || '')) chamar({ acao: 'atualizar', nota_interna: nota }); }}
              placeholder="nota interna (só você vê)"
              className={`${campo} flex-1`}
              data-teste="chamado-nota"
            />
          </div>

          {/* 🌉 a ponte: vira demanda de verdade, na tabela que o time já usa */}
          {c.demanda_id ? (
            <p className="text-[11px] text-emerald-200">já virou demanda — está no Painel Corporativo de quem leva</p>
          ) : (
            <div className="rounded-lg border border-dashed border-white/15 px-2.5 py-2 flex items-center gap-2 flex-wrap" data-teste="virar-demanda">
              <Send className="w-3 h-3 text-white/40 shrink-0" />
              <span className="text-[10px] text-white/35">virar demanda pra</span>
              <select value={pessoa} onChange={(e) => setPessoa(e.target.value)} className={campo} data-teste="virar-demanda-pessoa">
                <option value="">quem leva…</option>
                {time.map((p) => <option key={p.id} value={p.id}>{nomeBonito(p.nome)}{p.cargo ? ` · ${p.cargo}` : ''}</option>)}
              </select>
              <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className={campo} />
              <button
                type="button"
                onClick={despachar}
                disabled={salvando || !pessoa}
                data-teste="virar-demanda-enviar"
                className="rounded-lg bg-white/12 hover:bg-white/22 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
              >
                direcionar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Demandas() {
  const [chamados, setChamados] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [status, setStatus] = useState('em_aberto');
  const [tipo, setTipo] = useState('');
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    setErro('');
    const [ch, us, me] = await Promise.all([
      supabase.from('suporte_chamados').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('app_users').select('id,full_name,nickname,role,career_levels,primary_career_level').order('full_name'),
      supabase.auth.getUser().catch(() => ({ data: { user: null } })),
    ]);
    if (ch.error) setErro('Não consegui ler a fila agora.');
    setChamados(ch.data || []);
    setUsuarios(us.data || []);
    const id = me?.data?.user?.id;
    setCurrentUser(id ? (us.data || []).find((u) => u.id === id) || { id } : null);
    setCarregando(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const time = useMemo(() => timeCorporativo(usuarios), [usuarios]);
  const resumo = useMemo(() => resumoDaFila(chamados), [chamados]);
  const fila = useMemo(() => ordenarFila(filtrarFila(chamados, { status, tipo, busca })), [chamados, status, tipo, busca]);

  return (
    <div className="min-h-screen bg-[#0b1018] px-3 sm:px-6 py-5">
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-xl font-black text-white">Demandas do time</h1>
          <p className="text-white/45 text-[13px]">o que os usuários mandaram pelo Tira Dúvidas 24h</p>
          <span className="flex-1" />
          <button type="button" onClick={carregar} className="flex items-center gap-1.5 text-[11px] text-white/50 hover:text-white/80">
            <RefreshCw className="w-3 h-3" /> atualizar
          </button>
        </div>

        {/* os números que dizem se tem incêndio */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-teste="resumo-fila">
          {[
            { r: 'esperando', v: resumo.em_aberto },
            { r: 'problemas', v: resumo.problemas, alerta: resumo.problemas > 0 },
            { r: 'para tudo', v: resumo.para_tudo, alerta: resumo.para_tudo > 0 },
            { r: 'no total', v: resumo.total },
          ].map((n) => (
            <div key={n.r} className={`rounded-xl border px-3 py-2 ${n.alerta ? 'border-amber-400/30 bg-amber-500/[0.07]' : 'border-white/10 bg-white/[0.03]'}`}>
              <p className="text-[10px] uppercase tracking-widest text-white/35">{n.r}</p>
              <p className="text-xl font-black text-white">{n.v}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="procurar no relato, no título, em quem mandou…" className={`${campo} w-full pl-8`} data-teste="filtro-busca" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={campo} data-teste="filtro-status">
            <option value="em_aberto">esperando decisão</option>
            <option value="">todos os status</option>
            {STATUS.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}
          </select>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo} data-teste="filtro-tipo">
            <option value="">todo tipo</option>
            {TIPOS.map((t) => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}
          </select>
        </div>

        {erro && (
          <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {erro}
          </p>
        )}

        {carregando ? (
          <p className="text-white/40 text-[13px] flex items-center gap-2 py-6"><Loader2 className="w-4 h-4 animate-spin" /> lendo a fila…</p>
        ) : fila.length === 0 ? (
          <p className="text-white/40 text-[13px] py-6" data-teste="fila-vazia">
            {chamados.length === 0
              ? 'Nenhum chamado ainda. Quando alguém usar o Tira Dúvidas na página “Como jogar”, aparece aqui.'
              : 'Nada com esse filtro. Tente “todos os status”.'}
          </p>
        ) : (
          <div className="space-y-2">
            {fila.map((c) => <Chamado key={c.id} c={c} time={time} currentUser={currentUser} onMudou={carregar} />)}
          </div>
        )}
      </div>
    </div>
  );
}
