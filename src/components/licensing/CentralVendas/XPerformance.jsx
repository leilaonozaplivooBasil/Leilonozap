import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Check, Clock, AlertTriangle, ChevronRight, Trash2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import useArrastavel from '@/hooks/useArrastavel';
import {
  TRILHAS, trilhaDoCargo, COLUNAS, ORDEM_COLUNAS, moverEntregavel, podeMover, podeValidar,
  encontroDaSemana, proximaSegunda, resumoDaPessoa, PESO_MAX,
} from '@/lib/xperformance';
import { HABITOS } from '@/lib/metodo';

// 🏛️ X-PERFORMANCE — a visão executiva do planejamento da diretoria.
//
// Ordem do dono (06/09/2026): "não vamos chamar de Trello, vamos chamar de
// X-Performance... e isso precisa encaixar dentro do planejamento diário, mas
// com uma visão executiva estilo Master Task".
//
// O QUE ISSO QUER DIZER NA PRÁTICA, E COMO A TELA RESPONDE:
// a Master Task mostra O DIA de uma pessoa. Aqui é a mesma gramática — blocos
// empilhados, estado à vista, sem cartão dentro de cartão — só que o recorte é
// A SEMANA DA DIRETORIA. Por isso a ordem da tela é: quem eu sou na trilha →
// o que a semana combinou → o que está na minha mão → onde isso me leva.
//
// O QUE ELA NÃO FAZ, DE PROPÓSITO: não calcula dinheiro. O fixo vem pronto do
// X-Game. Aqui ele só é MOSTRADO ao lado do caminho pra sociedade, e as duas
// barras nunca se somam — é a separação que o dono pediu com todas as letras.

const fmtDia = (iso) => {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};

/** Um card do quadro. A alça é o card inteiro; o clique continua vivo. */
function Card({ item, onMover, onExcluir, ehValidador, meuId }) {
  const [sobre, setSobre] = useState(null);
  const { arrastando, alcas, engolirCliqueDoArrasto } = useArrastavel({
    aoSoltar: ({ x, y }) => {
      // qual coluna estava embaixo do dedo quando soltou
      const alvo = document.elementFromPoint(x, y)?.closest('[data-coluna]');
      setSobre(null);
      const destino = alvo?.getAttribute('data-coluna');
      if (destino && destino !== item.coluna) onMover(item, destino);
    },
    aoMover: ({ x, y }) => {
      const alvo = document.elementFromPoint(x, y)?.closest('[data-coluna]');
      setSobre(alvo?.getAttribute('data-coluna') || null);
    },
  });

  const habito = HABITOS.find((h) => h.n === item.habito);
  const proxima = ORDEM_COLUNAS[ORDEM_COLUNAS.indexOf(item.coluna) + 1];
  // 🔒 DIR-74 — dois motivos diferentes pra travar o passo pra "Entregue", e a
  // tela diz QUAL: não ser validador, ou o card ser seu. Um "travado" sem
  // motivo faz a pessoa achar que é bug e chamar o suporte.
  const meuCard = !podeValidar(item, meuId);
  const bloqueado = proxima === 'entregue' && (!ehValidador || meuCard);
  const motivo = proxima !== 'entregue' ? '' : meuCard
    ? 'é o seu entregável — quem valida tem que ser outra pessoa'
    : !ehValidador ? 'só quem valida move pra Entregue' : '';

  return (
    <div
      {...alcas}
      onClickCapture={engolirCliqueDoArrasto}
      className={`rounded-xl border p-2.5 text-left transition-all ${
        arrastando ? 'border-white/40 opacity-80 scale-[1.02]' : 'border-white/10 hover:border-white/25'
      }`}
      style={{ background: 'rgba(255,255,255,0.04)', cursor: arrastando ? 'grabbing' : 'grab' }}
    >
      <p className="text-[13px] font-bold leading-snug text-white">{item.titulo}</p>
      {item.detalhe && <p className="mt-1 text-[11px] leading-snug text-white/50">{item.detalhe}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="rounded-full bg-white/10 px-2 py-0.5 font-bold text-white/70">
          {'★'.repeat(item.peso)}<span className="text-white/25">{'★'.repeat(PESO_MAX - item.peso)}</span>
        </span>
        {habito && <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/55">Hábito {habito.n}</span>}
        {item.dono_nome && <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/55">{item.dono_nome}</span>}
        {item.prazo && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/55 inline-flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> {fmtDia(item.prazo)}
          </span>
        )}
      </div>
      {sobre && sobre !== item.coluna && (
        <p className="mt-1.5 text-[10px] font-bold text-nz-verde">
          soltar em “{COLUNAS.find((c) => c.id === sobre)?.nome}”
          {!podeMover(item.coluna, sobre) && <span className="text-white/40"> — não pode pular etapa</span>}
        </p>
      )}
      {proxima && (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            disabled={bloqueado}
            onClick={() => onMover(item, proxima)}
            className={`text-[11px] font-bold inline-flex items-center gap-1 ${
              bloqueado ? 'text-white/25 cursor-not-allowed' : 'text-white/60 hover:text-white'
            }`}
            title={bloqueado ? motivo : ''}
          >
            {COLUNAS.find((c) => c.id === proxima)?.nome} <ChevronRight className="w-3 h-3" />
          </button>
          {bloqueado && meuCard && <span className="text-[9px] leading-tight text-amber-300/70">seu card — outro valida</span>}
          <button type="button" onClick={() => onExcluir(item)} className="ml-auto text-white/25 hover:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function XPerformance({ currentUser, visaoTotal = false, hojeISO }) {
  const hoje = hojeISO || new Date().toISOString().slice(0, 10);
  const uid = currentUser?.id;
  // o cargo e o fixo moram no X-Game; esta tela busca, não guarda cópia — uma
  // verdade só, num lugar só
  const [participante, setParticipante] = useState(null);
  const trilha = trilhaDoCargo(participante?.cargo);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [encontros, setEncontros] = useState([]);
  const [entregaveis, setEntregaveis] = useState([]);
  const [rascunho, setRascunho] = useState({});
  const [novo, setNovo] = useState(null);

  const carregar = useCallback(async () => {
    if (uid) {
      supabase.from('xgame_participantes').select('cargo,verba_producao,verba_bonus').eq('user_id', uid).maybeSingle()
        .then(({ data }) => setParticipante(data || null));
    }
    const [enc, ent] = await Promise.all([
      supabase.from('xperf_encontros').select('*').order('data', { ascending: false }).limit(12),
      supabase.from('xperf_entregaveis').select('*').order('created_at', { ascending: true }),
    ]);
    setEncontros(enc.data || []);
    setEntregaveis(ent.data || []);
    setCarregando(false);
  }, [uid]);

  useEffect(() => { carregar(); }, [carregar]);

  const encontro = useMemo(() => encontroDaSemana(encontros, hoje), [encontros, hoje]);
  const anterior = useMemo(() => {
    const antes = encontros.filter((e) => String(e.data).slice(0, 10) < encontro.data);
    return antes.length ? encontroDaSemana(encontros, antes[0].data) : null;
  }, [encontros, encontro.data]);

  const meuResumo = useMemo(
    () => resumoDaPessoa({ entregaveis, pessoaId: uid, fixoMes: participante?.verba_producao ?? null, hojeISO: hoje }),
    [entregaveis, uid, participante, hoje],
  );

  const salvarBloco = async (blocoId) => {
    const texto = rascunho[blocoId];
    if (texto === undefined) return;
    setSalvando(true);
    const blocos = { ...(encontros.find((e) => e.id === encontro.id)?.blocos || {}), [blocoId]: texto };
    const linha = {
      data: encontro.data, trilha: trilha.id, blocos,
      criado_por_id: uid, criado_por_nome: currentUser?.full_name || '', updated_at: new Date().toISOString(),
    };
    // upsert por `data`: a chave única da tabela é o que garante UMA ata por
    // semana, mesmo com duas pessoas escrevendo ao mesmo tempo
    const { error } = await supabase.from('xperf_encontros').upsert(linha, { onConflict: 'data' });
    setSalvando(false);
    if (error) { toast.error('Não salvou a pauta — tenta de novo'); return; }
    toast.success('Pauta salva');
    setRascunho((r) => { const c = { ...r }; delete c[blocoId]; return c; });
    carregar();
  };

  const mover = async (item, destino) => {
    if (!podeMover(item.coluna, destino)) {
      toast.error('Não dá pra pular etapa: entregue sem revisão não conta ponto');
      return;
    }
    // 🔒 DIR-74 — validar o próprio entregável é recusado aqui e some da tela
    // logo abaixo. Duas defesas de propósito: a de baixo evita o clique, esta
    // evita o caminho de teclado e o arrasto.
    if (destino === 'entregue' && !podeValidar(item, uid)) {
      toast.error('Quem valida não pode ser o dono — peça pra outra pessoa conferir');
      return;
    }
    const validadoEm = new Date().toISOString();
    // o carimbo é montado UMA vez, na lib, e vale pro estado local e pro banco:
    // dois carimbos escritos separados é como a tela e o banco divergem
    setEntregaveis((l) => moverEntregavel(l, item.id, destino, { validadoPorId: uid, validadoEm }));
    const extra = destino === 'entregue'
      ? { validado_por_id: uid, validado_em: validadoEm }
      : { validado_por_id: null, validado_em: null };
    const { error } = await supabase.from('xperf_entregaveis')
      .update({ coluna: destino, ...extra, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (error) { toast.error('Não moveu — recarregando'); carregar(); }
  };

  const criar = async () => {
    if (!novo?.titulo?.trim()) return;
    setSalvando(true);
    const { error } = await supabase.from('xperf_entregaveis').insert({
      titulo: novo.titulo.trim(), detalhe: novo.detalhe || null, trilha: trilha.id,
      peso: Number(novo.peso) || 1, habito: novo.habito ? Number(novo.habito) : null,
      dono_id: uid, dono_nome: currentUser?.full_name || '', prazo: novo.prazo || null,
      encontro_id: encontro.id || null,
    });
    setSalvando(false);
    if (error) { toast.error('Não criou o entregável'); return; }
    setNovo(null);
    carregar();
  };

  const excluir = async (item) => {
    setEntregaveis((l) => l.filter((e) => e.id !== item.id));
    await supabase.from('xperf_entregaveis').delete().eq('id', item.id);
  };

  if (carregando) {
    return <div className="py-10 text-center text-white/40"><Loader2 className="w-5 h-5 animate-spin inline" /></div>;
  }

  const doQuadro = visaoTotal ? entregaveis : entregaveis.filter((e) => e.dono_id === uid);

  return (
    <div className="space-y-5">
      {/* ── 1. QUEM EU SOU NA TRILHA ─────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.28em] text-white/40 uppercase">Mentalidade</p>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TRILHAS.map((t) => {
            const minha = t.id === trilha.id;
            return (
              <div key={t.id}
                className={`rounded-xl border p-3 ${minha ? 'border-white/30' : 'border-white/8'}`}
                style={{ background: minha ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)' }}
              >
                <p className={`text-[13px] font-extrabold ${minha ? 'text-white' : 'text-white/45'}`}>{t.nome}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{t.lema}</p>
                <p className="mt-1.5 text-[10px] text-white/35">
                  Hábitos {t.foco.join(' · ')} — entrega {t.entrega}
                </p>
                {minha && <p className="mt-1.5 text-[10px] font-bold text-nz-verde">é a sua trilha hoje</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. AS DUAS CONTAS, SEPARADAS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase">O fixo do mês</p>
          <p className="mt-1 text-xl font-extrabold text-white">
            {meuResumo.fixo != null ? `R$ ${Number(meuResumo.fixo).toLocaleString('pt-BR')}` : '—'}
          </p>
          <p className="text-[10px] text-white/35">paga o combinado. Fecha e zera todo mês.</p>
        </div>
        {/* 🚪 DIR-74 — a sociedade deixou de ser UMA barra. Uma barra que só sobe
            premia acervo: quem entregou muito num semestre e nada no seguinte
            seguia parecendo perto. São três portões, e valem juntos. */}
        <div className="rounded-xl border border-white/10 p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase">Caminho pra sociedade</p>
            <p className={`text-[10px] font-bold ${meuResumo.portoes.liberado ? 'text-nz-verde' : 'text-white/35'}`}>
              {meuResumo.portoes.abertos} de {meuResumo.portoes.total} portões
            </p>
          </div>
          <div className="mt-2 space-y-2">
            {meuResumo.portoes.portoes.map((g) => {
              const pct = Math.min(100, Math.round((g.valor / Math.max(1, g.alvo)) * 100));
              return (
                <div key={g.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`text-[11px] font-bold ${g.aberto ? 'text-white' : 'text-white/55'}`}>
                      {g.aberto ? '✓' : '○'} {g.titulo}
                    </p>
                    <p className="text-[10px] text-white/35 tabular-nums">
                      {g.valor} / {g.alvo} <span className="text-white/25">{g.unidade}</span>
                    </p>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${pct}%`,
                      background: g.aberto
                        ? 'linear-gradient(90deg, var(--topcollege-azul), var(--topcollege-magenta))'
                        : 'rgba(255,255,255,0.28)',
                    }} />
                  </div>
                  <p className="mt-0.5 text-[9px] leading-snug text-white/30">{g.ajuda}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-white/35">
            {meuResumo.portoes.liberado
              ? 'os três acesos — a conversa de sociedade está aberta.'
              : 'a conversa abre com os TRÊS acesos. Não é média: falta um, não abre.'}
          </p>
        </div>
      </div>

      {/* ── 3. O ENCONTRO DE SEGUNDA ─────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <p className="text-[10px] font-bold tracking-[0.28em] text-white/40 uppercase">
            Encontro de segunda · {fmtDia(encontro.data)}
          </p>
          <p className="text-[10px] text-white/35">
            {encontro.preenchidos} de {encontro.total} blocos escritos
            {encontro.data === hoje ? ' · é hoje' : ` · próxima: ${fmtDia(proximaSegunda(hoje))}`}
          </p>
        </div>
        <div className="mt-2 space-y-2">
          {encontro.blocos.map((b) => {
            const anteriorTexto = anterior?.blocos.find((x) => x.id === b.id)?.texto;
            const valor = rascunho[b.id] !== undefined ? rascunho[b.id] : b.texto;
            return (
              <div key={b.id} className="rounded-xl border border-white/10 p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-bold text-white">{b.titulo}</p>
                  {b.vazio
                    ? <span className="text-[10px] text-amber-300 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> em branco</span>
                    : <Check className="w-3.5 h-3.5 text-nz-verde" />}
                </div>
                <p className="text-[10px] text-white/35 mb-1.5">{b.ajuda}</p>
                <Textarea
                  value={valor}
                  onChange={(e) => setRascunho((r) => ({ ...r, [b.id]: e.target.value }))}
                  placeholder={b.ajuda}
                  rows={3}
                  className="text-[12px]"
                />
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <Button size="sm" disabled={salvando || rascunho[b.id] === undefined} onClick={() => salvarBloco(b.id)}
                    className="bg-nz-verde hover:bg-nz-verde-claro text-white h-7 text-[11px]">
                    {salvando ? 'Salvando...' : 'Salvar bloco'}
                  </Button>
                  {/* 📚 O QUE UM DOCUMENTO SOLTO NÃO DÁ: o mesmo bloco da semana
                      passada, do lado. É por isso que a pauta é fixa. */}
                  {anteriorTexto && (
                    <details className="text-[10px] text-white/40">
                      <summary className="cursor-pointer hover:text-white/70">semana passada ({fmtDia(anterior.data)})</summary>
                      <p className="mt-1 whitespace-pre-line text-white/50 max-w-prose">{anteriorTexto}</p>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. O QUADRO ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[10px] font-bold tracking-[0.28em] text-white/40 uppercase">
            X-Performance · o quadro {visaoTotal ? 'da diretoria' : 'que está na sua mão'}
          </p>
          <Button size="sm" onClick={() => setNovo({ peso: 1 })} className="bg-white/10 hover:bg-white/20 text-white h-7 text-[11px]">
            <Plus className="w-3 h-3 mr-1" /> Novo entregável
          </Button>
        </div>

        {novo && (
          <div className="mt-2 rounded-xl border border-white/20 p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Input autoFocus placeholder="O que precisa ficar pronto?" value={novo.titulo || ''}
              onChange={(e) => setNovo((n) => ({ ...n, titulo: e.target.value }))} />
            <Input placeholder="detalhe (opcional)" value={novo.detalhe || ''}
              onChange={(e) => setNovo((n) => ({ ...n, detalhe: e.target.value }))} />
            <div className="flex gap-2 flex-wrap items-center">
              <label className="text-[11px] text-white/50">peso
                <select value={novo.peso} onChange={(e) => setNovo((n) => ({ ...n, peso: e.target.value }))}
                  className="ml-1 rounded bg-white/10 px-2 py-1 text-white text-[11px]">
                  {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="text-[11px] text-white/50">hábito
                <select value={novo.habito || ''} onChange={(e) => setNovo((n) => ({ ...n, habito: e.target.value }))}
                  className="ml-1 rounded bg-white/10 px-2 py-1 text-white text-[11px]">
                  <option value="">—</option>
                  {trilha.foco.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <Input type="date" value={novo.prazo || ''} onChange={(e) => setNovo((n) => ({ ...n, prazo: e.target.value }))}
                className="w-auto h-8 text-[11px]" />
              <Button size="sm" onClick={criar} disabled={salvando || !novo.titulo?.trim()}
                className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8 text-[11px]">Criar</Button>
              <Button size="sm" variant="ghost" onClick={() => setNovo(null)} className="h-8 text-[11px] text-white/50">Cancelar</Button>
            </div>
          </div>
        )}

        <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {COLUNAS.map((c) => {
            const doColuna = doQuadro.filter((e) => e.coluna === c.id);
            return (
              <div key={c.id} data-coluna={c.id}
                className="rounded-xl border border-white/8 p-2 min-h-[120px]"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p className="text-[11px] font-bold text-white/70">{c.nome} <span className="text-white/30">{doColuna.length}</span></p>
                <p className="text-[9px] text-white/30 mb-2 leading-snug">{c.ajuda}</p>
                <div className="space-y-2">
                  {doColuna.map((item) => (
                    <Card key={item.id} item={item} onMover={mover} onExcluir={excluir} ehValidador={visaoTotal} meuId={uid} />
                  ))}
                  {!doColuna.length && <p className="text-[10px] text-white/20 py-2 text-center">vazio</p>}
                </div>
              </div>
            );
          })}
        </div>
        {!visaoTotal && (
          <p className="mt-2 text-[10px] text-white/30">
            Mover pra “Entregue” é de quem valida — por isso o botão fica travado aqui.
          </p>
        )}
      </div>
    </div>
  );
}
