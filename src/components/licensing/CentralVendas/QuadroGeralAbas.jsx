import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Send, Target, CalendarDays, LayoutGrid, History, GraduationCap, Camera } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtReais, fixoDoParticipante, pesoReferenciaDe, categoriaDaTarefa, PARTICIPANTE_PADRAO } from '@/lib/xgame';
import { distribuirDia } from '@/lib/distribuicaoFixo';
import { isSalePago, isVendaMercadoria } from '@/lib/crmUnifiedCustomers';
import { CHAVES, metasDoModelo, progressoDasMetas, mesDe } from '@/lib/metasPessoa';
import { PROGRAMA_PADRAO, programaJunto, programaParaGravar, cardsDoMes, rotuloDoMes } from '@/lib/programaMentoria';
import { MENTALIDADES, mentalidadeDe, habitoDe, planejamentoDoDia } from '@/lib/mentalidades';
import { filaDoPronto, rotuloDoPrazo } from '@/lib/pronto';
import { estaAberto, progressoChecklist, atrasado as cartaoAtrasado } from '@/lib/quadroCompromisso';

// 🗂️ AS ABAS DO QUADRO GERAL DA PESSOA (06/09/2026).
//
// Ordem do dono: "quando eu selecionar a pessoa, um menu do quadro geral
// dela: tudo, tudo, tudo — função, cargo, valores, o que fazer, meta mensal,
// entregáveis da mentoria (setembro a março de 2027), os produtos que precisa
// vender, o planejamento diário, o quadro dele por prioridade". A aba
// "Pessoa" fica no modal de sempre (XPerformanceGestao); estas são as outras
// cinco, cada uma carregando o que é seu:
//   🎯 Metas — o mês da pessoa (número e produto), progresso das tarefas
//      feitas e das vendas pagas, ritmo do mês; o modelo da função é o
//      ponto de partida, editável.
//   🎓 Programa — os sete meses da mentoria (o padrão do código, o do dono
//      por cima), os entregáveis da mentalidade dela, e o botão que vira
//      cards no quadro da diretoria.
//   📅 Semana — os sete dias: gerou, feitas, pago.
//   🗂️ Quadro dele — o quadro pessoal do Compromisso (DIR-75/76) visto pela
//      gestão, com card novo direto nele.
//   🕘 Histórico — tudo que foi distribuído, com pronto, devolução e ✔✔.

const campo = 'rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-[11px] text-white outline-none focus:border-white/40';
const caixa = { background: 'rgba(255,255,255,0.03)' };
const fmtDia = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
};

// ── 🎯 as metas: o carregar mora num hook, porque o semáforo do topo também lê ──
export function useMetasDaPessoa({ pessoaId, mes, hoje, tarefasDoMes }) {
  const [metas, setMetas] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const carregar = useCallback(async () => {
    if (!pessoaId || !mes) return;
    setCarregando(true);
    const [m, v] = await Promise.all([
      supabase.from('xperf_metas').select('*').eq('user_id', pessoaId).eq('mes', mes).order('created_at'),
      supabase.from('catalog_sales').select('id,status,kind,created_date,total_amount,product_title,product_id,quantity')
        .or(`seller_id.eq.${pessoaId},licensee_id.eq.${pessoaId},anchor_id.eq.${pessoaId},owner_id.eq.${pessoaId}`)
        .gte('created_date', `${mes}-01T00:00:00`),
    ]);
    setMetas(m.data || []);
    setVendas((v.data || []).filter((s) => isSalePago(s) && isVendaMercadoria(s) && mesDe(String(s.created_date)) === mes));
    setCarregando(false);
  }, [pessoaId, mes]);
  useEffect(() => { carregar(); }, [carregar]);
  const progresso = useMemo(() => progressoDasMetas({ metas, tarefasDoMes, vendasDoMes: vendas, mes, hojeISO: hoje }), [metas, tarefasDoMes, vendas, mes, hoje]);
  return { metas, setMetas, vendas, progresso, carregando, carregar };
}

export function AbaMetas({ pessoaId, nome, funcaoId, mes, criadoPorId, metasInfo }) {
  const { metas, setMetas, progresso, carregando, carregar, vendas } = metasInfo;
  const [nova, setNova] = useState({ tipo: 'numero', chave: 'contatos', produto_nome: '', alvo: '' });
  const [salvando, setSalvando] = useState(false);

  const usarModelo = async () => {
    const linhas = metasDoModelo(funcaoId, { userId: pessoaId, mes, criadoPorId });
    if (!linhas.length) { toast.error('A função ainda não tem modelo de metas.'); return; }
    setSalvando(true);
    const { error } = await supabase.from('xperf_metas').insert(linhas);
    setSalvando(false);
    if (error) { toast.error('Não salvou o modelo'); return; }
    toast.success(`${linhas.length} metas do modelo entraram pra ${nome}`);
    carregar();
  };
  const adicionar = async () => {
    const alvo = Number(nova.alvo);
    if (!alvo) { toast.error('Diga o alvo.'); return; }
    const c = CHAVES.find((x) => x.chave === nova.chave);
    const linha = nova.tipo === 'produto'
      ? { user_id: pessoaId, mes, tipo: 'produto', chave: `produto:${nova.produto_nome.trim().toLowerCase()}`, rotulo: `Vender ${nova.produto_nome.trim()}`, alvo, unidade: 'un', produto_nome: nova.produto_nome.trim(), criado_por_id: criadoPorId }
      : { user_id: pessoaId, mes, tipo: 'numero', chave: nova.chave, rotulo: c?.rotulo || nova.chave, alvo, unidade: c?.unidade || 'no mês', criado_por_id: criadoPorId };
    if (nova.tipo === 'produto' && !linha.produto_nome) { toast.error('Diga o produto.'); return; }
    setSalvando(true);
    const { error } = await supabase.from('xperf_metas').insert(linha);
    setSalvando(false);
    if (error) { toast.error('Não salvou a meta'); return; }
    setNova((n) => ({ ...n, alvo: '', produto_nome: '' }));
    carregar();
  };
  const mudarAlvo = async (m, alvo) => {
    const v = Number(alvo);
    if (!Number.isFinite(v) || v === Number(m.alvo)) return;
    setMetas((l) => l.map((x) => (x.id === m.id ? { ...x, alvo: v } : x)));
    await supabase.from('xperf_metas').update({ alvo: v, updated_at: new Date().toISOString() }).eq('id', m.id);
  };
  const remover = async (m) => {
    setMetas((l) => l.filter((x) => x.id !== m.id));
    await supabase.from('xperf_metas').delete().eq('id', m.id);
  };

  if (carregando) return <p className="text-[11px] text-white/40 py-2"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> carregando as metas…</p>;
  return (
    <div className="space-y-3" data-teste="aba-metas">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase">Metas de {rotuloDoMes(mes)}</p>
        <span className="text-[10px] text-white/35">· {vendas.length} venda{vendas.length === 1 ? '' : 's'} paga{vendas.length === 1 ? '' : 's'} no mês</span>
        {metas.length === 0 && funcaoId && (
          <Button size="sm" onClick={usarModelo} disabled={salvando} className="ml-auto bg-white/10 hover:bg-white/20 text-white h-7 text-[11px]" data-teste="metas-modelo">
            <Target className="w-3 h-3 mr-1" /> usar o modelo da função
          </Button>
        )}
      </div>
      {progresso.length === 0 ? (
        <p className="text-[11px] text-white/40">Sem meta neste mês ainda. Use o modelo da função ou crie abaixo.</p>
      ) : (
        <ul className="space-y-1.5" data-teste="metas-lista">
          {progresso.map((m) => (
            <li key={m.id} className="rounded-lg border border-white/10 px-2.5 py-2" style={caixa} data-teste="meta" data-no-ritmo={m.noRitmo ? 'sim' : 'nao'}>
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="font-bold text-white/85 truncate">{m.rotulo}</span>
                <span className="text-white/45 tabular-nums">
                  {m.unidade === 'R$' ? fmtReais(m.feito) : m.feito} de{' '}
                  <input type="number" defaultValue={m.alvo} onBlur={(e) => mudarAlvo(m, e.target.value)} className={`${campo} w-24 inline tabular-nums`} data-teste="meta-alvo" />{' '}
                  {m.unidade !== 'R$' ? m.unidade : ''}
                </span>
                <span className={`ml-auto text-[10px] font-bold ${m.noRitmo ? 'text-nz-verde' : 'text-amber-300'}`}>
                  {m.pct}% {m.noRitmo ? '· no ritmo' : `· atrás do ritmo (faltam ${m.unidade === 'R$' ? fmtReais(m.faltaNoRitmo) : Math.ceil(m.faltaNoRitmo)} pra hoje)`}
                </span>
                <button type="button" onClick={() => remover(m)} className="text-white/30 hover:text-red-300" aria-label={`remover ${m.rotulo}`}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, m.pct)}%`, background: m.noRitmo ? 'linear-gradient(90deg, var(--topcollege-azul), var(--topcollege-magenta))' : 'rgba(251,191,36,0.7)' }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-1.5 flex-wrap rounded-lg border border-white/10 p-2" style={caixa} data-teste="meta-nova">
        <label className="text-[10px] text-white/45 uppercase tracking-wider">tipo
          <select value={nova.tipo} onChange={(e) => setNova((n) => ({ ...n, tipo: e.target.value }))} className={`mt-0.5 block ${campo}`} data-teste="meta-tipo">
            <option value="numero">número</option><option value="produto">produto a vender</option>
          </select>
        </label>
        {nova.tipo === 'produto' ? (
          <label className="text-[10px] text-white/45 uppercase tracking-wider">produto
            <Input value={nova.produto_nome} onChange={(e) => setNova((n) => ({ ...n, produto_nome: e.target.value }))} placeholder="nome do produto" className="mt-0.5 h-7 w-44 border-white/15 bg-white/[0.06] text-white text-[11px]" data-teste="meta-produto" />
          </label>
        ) : (
          <label className="text-[10px] text-white/45 uppercase tracking-wider">o quê
            <select value={nova.chave} onChange={(e) => setNova((n) => ({ ...n, chave: e.target.value }))} className={`mt-0.5 block ${campo}`} data-teste="meta-chave">
              {CHAVES.map((c) => <option key={c.chave} value={c.chave}>{c.rotulo}</option>)}
            </select>
          </label>
        )}
        <label className="text-[10px] text-white/45 uppercase tracking-wider">alvo
          <Input type="number" value={nova.alvo} onChange={(e) => setNova((n) => ({ ...n, alvo: e.target.value }))} className="mt-0.5 h-7 w-24 border-white/15 bg-white/[0.06] text-white text-[11px]" data-teste="meta-alvo-nova" />
        </label>
        <Button size="sm" onClick={adicionar} disabled={salvando} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-7 text-[11px]" data-teste="meta-adicionar"><Plus className="w-3 h-3 mr-1" /> meta</Button>
      </div>
    </div>
  );
}

// ── 🎓 o programa da mentoria ──
export function AbaPrograma({ pessoaId, nome, mentalidade, hoje, criadoPorId }) {
  const [doBanco, setDoBanco] = useState([]);
  const [cards, setCards] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mesAberto, setMesAberto] = useState(mesDe(hoje));
  const [novo, setNovo] = useState({ titulo: '', habito: '', peso: 3 });
  const [salvando, setSalvando] = useState(false);
  const carregar = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase.from('xperf_programa').select('*').order('ordem'),
      supabase.from('xperf_entregaveis').select('id,titulo,coluna,prazo,peso,habito').eq('dono_id', pessoaId).order('created_at'),
    ]);
    setDoBanco(p.data || []); setCards(c.data || []); setCarregando(false);
  }, [pessoaId]);
  useEffect(() => { carregar(); }, [carregar]);
  const programa = useMemo(() => programaJunto(PROGRAMA_PADRAO, doBanco), [doBanco]);
  const m = mentalidadeDe(mentalidade)?.id || 'executivo';
  const mes = programa.find((x) => x.mes === mesAberto) || programa[0];

  const gravarMes = async (mesNovo) => {
    setSalvando(true);
    const linha = programaParaGravar(mesNovo);
    const { error } = await supabase.from('xperf_programa').upsert({ ...linha, updated_at: new Date().toISOString() }, { onConflict: 'mes' });
    setSalvando(false);
    if (error) { toast.error('Não salvou o programa'); return; }
    carregar();
  };
  const adicionar = () => {
    if (!novo.titulo.trim()) return;
    const ent = { ...mes.entregaveis, [m]: [...(mes.entregaveis[m] || []), { titulo: novo.titulo.trim(), habito: novo.habito ? Number(novo.habito) : null, peso: Number(novo.peso) || 3 }] };
    setNovo({ titulo: '', habito: '', peso: 3 });
    gravarMes({ ...mes, entregaveis: ent });
  };
  const remover = (i) => {
    const ent = { ...mes.entregaveis, [m]: (mes.entregaveis[m] || []).filter((_, j) => j !== i) };
    gravarMes({ ...mes, entregaveis: ent });
  };
  const gerarCards = async () => {
    const jaTem = new Set(cards.map((c) => c.titulo));
    const novos = cardsDoMes(mes, { mentalidade: m, donoId: pessoaId, donoNome: nome }).filter((c) => !jaTem.has(c.titulo));
    if (!novos.length) { toast.message('Os entregáveis deste mês já estão no quadro dela.'); return; }
    setSalvando(true);
    const { error } = await supabase.from('xperf_entregaveis').insert(novos);
    setSalvando(false);
    if (error) { toast.error('Não gerou os cards'); return; }
    toast.success(`${novos.length} entregáve${novos.length === 1 ? 'l' : 'is'} de ${rotuloDoMes(mes.mes)} no quadro de ${nome}`);
    carregar();
  };

  if (carregando) return <p className="text-[11px] text-white/40 py-2"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> carregando o programa…</p>;
  const lista = mes.entregaveis[m] || [];
  const estadoDe = (titulo) => cards.find((c) => c.titulo === titulo)?.coluna || null;
  return (
    <div className="space-y-3" data-teste="aba-programa">
      <div className="flex gap-1 flex-wrap" data-teste="programa-meses">
        {programa.map((p) => (
          <button key={p.mes} type="button" onClick={() => setMesAberto(p.mes)}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${p.mes === mes.mes ? 'border-white/40 text-white bg-white/10' : 'border-white/10 text-white/45 hover:text-white'} ${p.mes === mesDe(hoje) ? 'ring-1 ring-nz-verde/60' : ''}`}
            title={p.tema} data-mes={p.mes}>
            {rotuloDoMes(p.mes)}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-white/10 p-2.5" style={caixa}>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[12px] font-extrabold text-white">{rotuloDoMes(mes.mes)} · {mes.tema}</p>
          <span className="text-[10px] text-white/40">Hábito{mes.habitos.length > 1 ? 's' : ''} {mes.habitos.join(' · ')} · {mentalidadeDe(m)?.nome}{mes.padrao ? '' : ' · editado por você'}</span>
          <Button size="sm" onClick={gerarCards} disabled={salvando || !lista.length} className="ml-auto bg-nz-verde hover:bg-nz-verde-claro text-white h-7 text-[11px]" data-teste="programa-gerar">
            <Send className="w-3 h-3 mr-1" /> pôr no quadro dela
          </Button>
        </div>
        <ul className="mt-2 space-y-1" data-teste="programa-entregaveis">
          {lista.map((e, i) => {
            const est = estadoDe(e.titulo);
            return (
              <li key={`${e.titulo}-${i}`} className="flex items-center gap-2 text-[11px] text-white/75">
                <span className={`shrink-0 rounded-full border px-1.5 text-[9px] uppercase tracking-wider ${est === 'entregue' ? 'border-nz-verde/50 text-nz-verde' : est ? 'border-white/25 text-white/60' : 'border-white/10 text-white/30'}`}>{est || 'não gerado'}</span>
                <span className="truncate">{e.titulo}</span>
                <span className="text-white/35 shrink-0">{e.habito ? `H${e.habito} · ` : ''}peso {e.peso}</span>
                <button type="button" onClick={() => remover(i)} className="ml-auto text-white/30 hover:text-red-300" aria-label={`remover ${e.titulo}`}><Trash2 className="w-3.5 h-3.5" /></button>
              </li>
            );
          })}
          {!lista.length && <li className="text-[11px] text-white/35">nenhum entregável pra esta mentalidade neste mês — acrescente abaixo</li>}
        </ul>
        <div className="mt-2 flex items-end gap-1.5 flex-wrap" data-teste="programa-novo">
          <Input value={novo.titulo} onChange={(e) => setNovo((n) => ({ ...n, titulo: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') adicionar(); }} placeholder="novo entregável do mês" className="h-7 flex-1 min-w-[180px] border-white/15 bg-white/[0.06] text-white text-[11px]" data-teste="programa-titulo" />
          <select value={novo.habito} onChange={(e) => setNovo((n) => ({ ...n, habito: e.target.value }))} className={campo} data-teste="programa-habito">
            <option value="">hábito</option>{[1, 2, 3, 4, 5, 6, 7, 8].map((h) => <option key={h} value={h}>H{h} · {habitoDe(h)?.completo}</option>)}
          </select>
          <select value={novo.peso} onChange={(e) => setNovo((n) => ({ ...n, peso: e.target.value }))} className={campo}>
            {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>peso {p}</option>)}
          </select>
          <Button size="sm" onClick={adicionar} disabled={salvando || !novo.titulo.trim()} className="bg-white/10 hover:bg-white/20 text-white h-7 text-[11px]" data-teste="programa-adicionar"><Plus className="w-3 h-3 mr-1" /> acrescentar</Button>
        </div>
      </div>
      <p className="text-[10px] text-white/35"><GraduationCap className="w-3 h-3 inline mr-1" />O padrão segue os 8 Hábitos na ordem do método; o que você acrescenta ou tira fica gravado e vale por cima. Mentalidades: {MENTALIDADES.map((x) => x.nome.replace('Mentalidade do ', '')).join(', ')}.</p>
    </div>
  );
}

// ── 📅 a semana ──
export function AbaSemana({ pessoaId, tarefasCiclo, hoje, participante }) {
  const base = { ...PARTICIPANTE_PADRAO, ...(participante || {}) };
  const dias = useMemo(() => {
    const d = new Date(`${hoje}T12:00:00`);
    const seg = new Date(d); seg.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => { const x = new Date(seg); x.setDate(seg.getDate() + i); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; });
  }, [hoje]);
  const ehProd = (t) => { const c = categoriaDaTarefa(t); return c !== 'bonus' && c !== 'venda'; };
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5" data-teste="aba-semana">
      {dias.map((dia) => {
        const doDia = tarefasCiclo.filter((t) => t.user_id === pessoaId && String(t.data).slice(0, 10) === dia);
        const plano = planejamentoDoDia(doDia);
        const dist = distribuirDia({ fixoMes: fixoDoParticipante(base), pesoReferencia: pesoReferenciaDe(base), tarefas: doDia.filter(ehProd) });
        const feitas = doDia.filter((t) => t.feito).length;
        const ehHoje = dia === hoje;
        return (
          <div key={dia} className={`rounded-lg border p-2 ${ehHoje ? 'border-nz-verde/50' : 'border-white/10'}`} style={caixa} data-teste="dia-semana" data-dia={dia} data-gerado={plano.gerado ? 'sim' : 'nao'}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${ehHoje ? 'text-nz-verde' : 'text-white/45'}`}>{fmtDia(dia)}</p>
            {doDia.length === 0 ? (
              <p className="mt-1 text-[10px] text-white/30">vazio</p>
            ) : (
              <>
                <p className="mt-1 text-[11px] text-white/80">{feitas}/{doDia.length} feitas</p>
                <p className={`text-[10px] ${plano.gerado ? 'text-white/40' : 'text-amber-300/80'}`}>{plano.gerado ? 'planejado' : 'só distribuídas'}</p>
                <p className="text-[10px] text-white/50 tabular-nums">{fmtReais(dist.pago)}{dist.pesoFalta ? ` · falta peso ${dist.pesoFalta}` : ''}</p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── 🗂️ o quadro dele (DIR-75/76), visto pela gestão ──
export function AbaQuadro({ pessoaId, hoje, responsavelNome }) {
  const [listas, setListas] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [novo, setNovo] = useState({ titulo: '', prazo: '', lista_id: '' });
  const [salvando, setSalvando] = useState(false);
  const carregar = useCallback(async () => {
    const [l, c] = await Promise.all([
      supabase.from('metodo_quadro_listas').select('*').eq('user_id', pessoaId).order('ordem'),
      supabase.from('metodo_quadro').select('*').eq('user_id', pessoaId).order('ordem'),
    ]);
    setListas(l.data || []); setCartoes(c.data || []); setCarregando(false);
  }, [pessoaId]);
  useEffect(() => { carregar(); }, [carregar]);
  const criar = async () => {
    if (!novo.titulo.trim()) return;
    setSalvando(true);
    const { error } = await supabase.from('metodo_quadro').insert({
      user_id: pessoaId, titulo: novo.titulo.trim(), coluna: 'aberto', prazo: novo.prazo || null, lista_id: novo.lista_id || null,
      responsavel_nome: responsavelNome || null, ordem: cartoes.length, checklist: [],
    });
    setSalvando(false);
    if (error) { toast.error('Não criou o card'); return; }
    toast.success('Card no quadro dela');
    setNovo({ titulo: '', prazo: '', lista_id: '' });
    carregar();
  };
  if (carregando) return <p className="text-[11px] text-white/40 py-2"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> carregando o quadro…</p>;
  const abertos = cartoes.filter(estaAberto);
  const grupos = [...listas.map((l) => ({ id: l.id, nome: l.nome, cards: abertos.filter((c) => c.lista_id === l.id) })), { id: null, nome: 'sem lista', cards: abertos.filter((c) => !c.lista_id) }].filter((g) => g.cards.length || g.id);
  return (
    <div className="space-y-2" data-teste="aba-quadro">
      <p className="text-[10px] text-white/40"><LayoutGrid className="w-3 h-3 inline mr-1" />{abertos.length} card{abertos.length === 1 ? '' : 's'} aberto{abertos.length === 1 ? '' : 's'} · {cartoes.length - abertos.length} feito{cartoes.length - abertos.length === 1 ? '' : 's'} · o quadro é dela; o que você põe aqui aparece na mesa dela</p>
      {grupos.map((g) => (
        <div key={g.id || 'sem'} className="rounded-lg border border-white/10 p-2" style={caixa} data-teste="quadro-lista">
          <p className="text-[10px] font-bold tracking-[0.18em] text-white/45 uppercase">{g.nome} <span className="text-white/25">{g.cards.length}</span></p>
          <ul className="mt-1 space-y-0.5">
            {g.cards.map((c) => { const pc = progressoChecklist(c); return (
              <li key={c.id} className="flex items-center gap-2 text-[11px] text-white/75" data-teste="quadro-card">
                <span className="truncate">{c.titulo}</span>
                {pc.total > 0 && <span className="text-white/35 shrink-0">{pc.feitos}/{pc.total}</span>}
                {c.prazo && <span className={`ml-auto shrink-0 text-[10px] ${cartaoAtrasado(c, hoje) ? 'text-red-300' : 'text-white/40'}`}>até {fmtDia(String(c.prazo).slice(0, 10))}</span>}
              </li>
            ); })}
            {!g.cards.length && <li className="text-[10px] text-white/25">vazio</li>}
          </ul>
        </div>
      ))}
      <div className="flex items-end gap-1.5 flex-wrap rounded-lg border border-white/10 p-2" style={caixa} data-teste="quadro-novo">
        <Input value={novo.titulo} onChange={(e) => setNovo((n) => ({ ...n, titulo: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') criar(); }} placeholder="card novo no quadro dela" className="h-7 flex-1 min-w-[180px] border-white/15 bg-white/[0.06] text-white text-[11px]" data-teste="quadro-titulo" />
        <input type="date" value={novo.prazo} onChange={(e) => setNovo((n) => ({ ...n, prazo: e.target.value }))} className={campo} data-teste="quadro-prazo" />
        {listas.length > 0 && (
          <select value={novo.lista_id} onChange={(e) => setNovo((n) => ({ ...n, lista_id: e.target.value }))} className={campo}>
            <option value="">sem lista</option>{listas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        )}
        <Button size="sm" onClick={criar} disabled={salvando || !novo.titulo.trim()} className="bg-white/10 hover:bg-white/20 text-white h-7 text-[11px]" data-teste="quadro-criar"><Plus className="w-3 h-3 mr-1" /> card</Button>
      </div>
    </div>
  );
}

// ── 🕘 o histórico: o prontuário ──
export function AbaHistorico({ pessoaId, tarefasCiclo }) {
  const itens = useMemo(() => filaDoPronto(tarefasCiclo.filter((t) => t.user_id === pessoaId))
    .sort((a, b) => String(b.tarefa.data).localeCompare(String(a.tarefa.data)) || String(b.tarefa.hora || '').localeCompare(String(a.tarefa.hora || ''))), [tarefasCiclo, pessoaId]);
  const COR = { atrasada: 'text-red-200 border-red-400/40', pronto: 'text-nz-verde border-nz-verde/50', devolvida: 'text-amber-200 border-amber-400/40', aguardando: 'text-white/50 border-white/15', conferida: 'text-white/70 border-white/25' };
  const fmtHora = (iso) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null);
  if (!itens.length) return <p className="text-[11px] text-white/40 py-2"><History className="w-3 h-3 inline mr-1" />nada distribuído pra esta pessoa no ciclo ainda.</p>;
  return (
    <ul className="space-y-1" data-teste="aba-historico">
      {itens.map(({ tarefa: t, estado }) => (
        <li key={t.id} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px]" style={caixa} data-teste="historico-item" data-estado={estado.id}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/40 shrink-0 tabular-nums">{fmtDia(String(t.data).slice(0, 10))}{t.hora ? ` ${String(t.hora).slice(0, 5)}` : ''}</span>
            <span className="text-white/80 truncate">{t.titulo}</span>
            <span className={`ml-auto shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${COR[estado.id]}`}>{estado.rotulo}</span>
          </div>
          <p className="mt-0.5 text-[10px] text-white/35">
            {t.prazo_em ? rotuloDoPrazo(t.prazo_em, String(t.data).slice(0, 10)) : 'sem prazo'}
            {t.pronto_em ? ` · pronto às ${fmtHora(t.pronto_em)}` : ''}
            {t.conferido === true ? ' · ✔✔ conferida' : ''}
            {t.devolvida_motivo ? ` · ↩ "${t.devolvida_motivo}"${t.devolvida_em ? ` às ${fmtHora(t.devolvida_em)}` : ''}` : ''}
          </p>
        </li>
      ))}
    </ul>
  );
}

export const ABAS = [
  ['pessoa', 'Pessoa', null], ['metas', 'Metas', Target], ['programa', 'Programa', GraduationCap], ['semana', 'Semana', CalendarDays], ['quadro', 'Quadro dele', LayoutGrid], ['comprovacoes', 'Comprovações', Camera], ['historico', 'Histórico', History],
];
