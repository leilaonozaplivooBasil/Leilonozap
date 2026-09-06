import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, CalendarPlus, AlertTriangle, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { plataforma } from '@/api/plataformaAdapter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useArrastavel from '@/hooks/useArrastavel';
import {
  ESTADO_ABERTO, LISTAS_MODELO, CARD_EXEMPLO, CORES_LISTA,
  estaFeito, progressoChecklist, atrasado, marcarFeito, reabrir,
  alternarItem, adicionarItem, removerItem, cartoesDaLista, feitosNaMesa, semLista,
  tarefaDoCartao, resumoDoQuadro,
} from '@/lib/quadroCompromisso';
import { ferramentaDe } from '@/lib/ferramentaDaTarefa';
import { getFotoPerfil } from '@/lib/selosCargo';
import { HABITOS } from '@/lib/metodo';

// 🗂️ O NOSSO QUADRO — "melhor que o MeisterTask e mais simples" (DIR-76).
//
// O que ficou do quadro do dono lá, e o que saiu, está em lib/quadroCompromisso.
// Aqui é só a EXPERIÊNCIA, e ela obedece a três coisas:
//   • escrever é UMA linha, sem modal — atrito de cadastro mata quadro pessoal;
//   • editar é clicar em cima — título, item do checklist, nome da lista;
//   • a foto da pessoa fica no card (sentido de pertencimento, palavra dele).

const TOM = {
  verde: 'from-nz-verde/25 to-nz-verde/5 border-nz-verde/40',
  azul: 'from-[#3B6FF6]/25 to-[#3B6FF6]/5 border-[#3B6FF6]/40',
  magenta: 'from-[#E62E8B]/25 to-[#E62E8B]/5 border-[#E62E8B]/40',
  ambar: 'from-amber-400/25 to-amber-400/5 border-amber-400/40',
  cinza: 'from-white/10 to-white/0 border-white/15',
};
const tom = (cor) => TOM[cor] || TOM.cinza;

/** Foto da pessoa — ou as iniciais, quando ela ainda não subiu foto. */
function Foto({ user, nome, tamanho = 'w-6 h-6' }) {
  const foto = getFotoPerfil(user);
  const n = String(nome || user?.full_name || '?').trim();
  const iniciais = n.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';
  return foto
    ? <img src={foto} alt={n} title={n} className={`${tamanho} rounded-full object-cover ring-2 ring-white/20 shrink-0`} />
    : <span title={n} className={`${tamanho} rounded-full bg-gradient-to-br from-nz-verde/60 to-[#3B6FF6]/60 text-white text-[9px] font-extrabold inline-flex items-center justify-center ring-2 ring-white/15 shrink-0`}>{iniciais}</span>;
}

/** Texto que vira campo ao clicar. Enter salva, Esc desiste, vazio não salva. */
function Editavel({ valor, onSalvar, className = '', placeholder = '', linha = true }) {
  const [editando, setEditando] = useState(false);
  const [txt, setTxt] = useState(valor || '');
  useEffect(() => { if (!editando) setTxt(valor || ''); }, [valor, editando]);
  const salvar = () => {
    const t = txt.trim();
    setEditando(false);
    if (t && t !== (valor || '')) onSalvar(t);
  };
  if (!editando) {
    return (
      <span
        role="button" tabIndex={0}
        onClick={() => setEditando(true)}
        onKeyDown={(e) => { if (e.key === 'Enter') setEditando(true); }}
        className={`cursor-text hover:bg-white/5 rounded px-0.5 -mx-0.5 ${className}`}
        title="clique pra editar"
      >{valor || <span className="opacity-40">{placeholder}</span>}</span>
    );
  }
  return (
    <input
      autoFocus
      value={txt}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={salvar}
      onKeyDown={(e) => { if (e.key === 'Enter' && linha) salvar(); if (e.key === 'Escape') { setTxt(valor || ''); setEditando(false); } }}
      className={`bg-white/10 border border-nz-verde/50 rounded px-1 outline-none w-full ${className}`}
    />
  );
}

function Cartao({ cartao, dono, hoje, onMudar, onExcluir, onVirarTarefa, onIr }) {
  const [novoItem, setNovoItem] = useState('');
  const [sobre, setSobre] = useState(null);
  const { arrastando, alcas, engolirCliqueDoArrasto } = useArrastavel({
    aoSoltar: ({ x, y }) => {
      const alvo = document.elementFromPoint(x, y)?.closest('[data-lista]');
      setSobre(null);
      const destino = alvo?.getAttribute('data-lista');
      if (destino && destino !== cartao.lista_id) onMudar({ ...cartao, lista_id: destino });
    },
    aoMover: ({ x, y }) => setSobre(document.elementFromPoint(x, y)?.closest('[data-lista]')?.getAttribute('data-lista-nome') || null),
  });
  const feito = estaFeito(cartao);
  const prog = progressoChecklist(cartao);
  const venceu = atrasado(cartao, hoje);
  const habito = HABITOS.find((h) => h.n === cartao.habito);
  const ferramenta = habito ? { secao: habito.id, rotulo: habito.completo } : ferramentaDe(cartao);
  const agoraISO = () => new Date().toISOString();

  return (
    <div
      {...alcas}
      onClickCapture={engolirCliqueDoArrasto}
      data-teste="cartao-quadro"
      className={`group rounded-xl border p-2.5 transition-all ${
        arrastando ? 'border-nz-verde/60 opacity-80 scale-[1.02]'
          : venceu ? 'border-orange-400/60' : 'border-white/10 hover:border-white/25'
      } ${feito ? 'opacity-60' : ''}`}
      style={{ background: 'rgba(255,255,255,0.04)', cursor: arrastando ? 'grabbing' : 'grab' }}
    >
      <div className="flex items-start gap-2">
        {/* ✓ marcar o card inteiro — o Feito automático em um toque */}
        <button
          type="button"
          onClick={() => onMudar(feito ? reabrir(cartao) : marcarFeito(cartao, agoraISO()))}
          title={feito ? 'reabrir' : 'marcar feito'}
          className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 inline-flex items-center justify-center ${feito ? 'bg-nz-verde border-nz-verde' : 'border-white/30 hover:border-nz-verde'}`}
        >{feito && <Check className="w-3 h-3 text-white" />}</button>
        <div className="flex-1 min-w-0">
          <Editavel
            valor={cartao.titulo}
            onSalvar={(t) => onMudar({ ...cartao, titulo: t })}
            className={`text-[13px] font-bold leading-snug text-nz-tinta block ${feito ? 'line-through' : ''}`}
          />
        </div>
        {/* a foto é a da pessoa dona da mesa — quadro pessoal, sentido de pertencimento */}
        <Foto user={dono} nome={cartao.responsavel_nome || dono?.full_name} />
      </div>

      {/* 📋 o checklist — o card que ele mais usa */}
      {prog.total > 0 && (
        <div className="mt-2 space-y-1">
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${prog.pct}%`, background: 'linear-gradient(90deg, var(--topcollege-azul, #3B6FF6), var(--topcollege-magenta, #E62E8B))' }} />
          </div>
          {cartao.checklist.map((item, i) => (
            <label key={i} className="flex items-start gap-1.5 text-[11px] leading-snug group/item">
              <input type="checkbox" checked={!!item.feito} onChange={() => onMudar(alternarItem(cartao, i, agoraISO()))} className="mt-0.5 w-3 h-3 accent-green-600 shrink-0" />
              <span className={`flex-1 ${item.feito ? 'line-through text-nz-tinta-fraca' : 'text-nz-tinta'}`}>{item.texto}</span>
              <button type="button" onClick={() => onMudar(removerItem(cartao, i))} className="opacity-0 group-hover/item:opacity-100 text-nz-tinta-fraca hover:text-red-400"><X className="w-3 h-3" /></button>
            </label>
          ))}
        </div>
      )}
      {!feito && (
        <input
          value={novoItem}
          onChange={(e) => setNovoItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && novoItem.trim()) { onMudar(adicionarItem(cartao, novoItem)); setNovoItem(''); } }}
          placeholder={prog.total ? '+ item' : '+ lista de tarefas'}
          className="mt-1.5 w-full bg-transparent text-[11px] text-nz-tinta placeholder:text-nz-tinta-fraca/50 outline-none border-b border-transparent focus:border-nz-verde/40"
        />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
        {prog.total > 0 && <span className="rounded-full bg-white/10 px-2 py-0.5 font-bold text-nz-tinta tabular-nums">{prog.feitos}/{prog.total}</span>}
        {habito && <span className="rounded-full bg-nz-verde/15 px-2 py-0.5 font-bold text-nz-verde">Hábito {habito.n}</span>}
        <label className={`rounded-full px-2 py-0.5 inline-flex items-center gap-1 cursor-pointer ${venceu ? 'bg-orange-400/20 text-orange-300 font-bold' : 'bg-white/10 text-nz-tinta-fraca'}`} title="prazo">
          {venceu && <AlertTriangle className="w-3 h-3" />}
          {cartao.prazo ? `${String(cartao.prazo).slice(8, 10)}/${String(cartao.prazo).slice(5, 7)}` : 'prazo'}
          <input type="date" value={cartao.prazo || ''} onChange={(e) => onMudar({ ...cartao, prazo: e.target.value || null })} className="w-0 h-0 opacity-0 absolute" />
        </label>
        {cartao.virou_tarefa_id && <span className="rounded-full bg-nz-verde/15 px-2 py-0.5 font-bold text-nz-verde">✓ no dia</span>}
      </div>

      {sobre && <p className="mt-1.5 text-[10px] font-bold text-nz-verde">soltar em “{sobre}”</p>}

      <div className="mt-2 flex items-center gap-2.5">
        {ferramenta && !feito && (
          <button type="button" onClick={() => onIr?.(ferramenta.secao, ferramenta.sub)} title={`Abrir ${ferramenta.rotulo}`} className="text-[11px] font-semibold text-nz-verde hover:text-nz-verde-claro">🔗 abrir →</button>
        )}
        {!feito && (
          <button
            type="button"
            disabled={!!cartao.virou_tarefa_id}
            onClick={() => onVirarTarefa(cartao)}
            title={cartao.virou_tarefa_id ? 'já está no seu dia' : venceu ? 'remarcar: entra na Master Task de hoje' : 'entra na sua Master Task de hoje'}
            className={`text-[11px] font-semibold inline-flex items-center gap-1 ${cartao.virou_tarefa_id ? 'text-nz-tinta-fraca/50 cursor-not-allowed' : venceu ? 'text-orange-300 hover:text-orange-200' : 'text-nz-tinta-fraca hover:text-nz-verde'}`}
          ><CalendarPlus className="w-3 h-3" /> {cartao.virou_tarefa_id ? 'já está no dia' : venceu ? 'remarcar pra hoje' : 'pro meu dia'}</button>
        )}
        <button type="button" onClick={() => onExcluir(cartao)} className="ml-auto text-nz-tinta-fraca/40 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

export default function QuadroCompromisso({ currentUser, hojeISO, onIr, onTarefaCriada }) {
  const uid = currentUser?.id || null;
  const hoje = hojeISO || new Date().toISOString().slice(0, 10);
  const [listas, setListas] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [novo, setNovo] = useState({});      // { [listaId]: texto }
  const [novaLista, setNovaLista] = useState('');
  const [feitoAberto, setFeitoAberto] = useState(false);

  const carregar = useCallback(async () => {
    if (!uid) { setCarregando(false); return; }
    const [l, c] = await Promise.all([
      supabase.from('metodo_quadro_listas').select('*').eq('user_id', uid).order('ordem', { ascending: true }),
      supabase.from('metodo_quadro').select('*').eq('user_id', uid).order('ordem', { ascending: true }),
    ]);
    setListas(l.error || !Array.isArray(l.data) ? [] : l.data);
    setCartoes(c.error || !Array.isArray(c.data) ? [] : c.data);
    setCarregando(false);
  }, [uid]);
  useEffect(() => { carregar(); }, [carregar]);

  const resumo = useMemo(() => resumoDoQuadro(cartoes, hoje), [cartoes, hoje]);
  const orfaos = useMemo(() => semLista(cartoes), [cartoes]);
  const feitos = useMemo(() => feitosNaMesa(cartoes, hoje), [cartoes, hoje]);

  // ── listas ────────────────────────────────────────────────────────────────
  const criarLista = async (nome, cor) => {
    const n = String(nome || '').trim();
    if (!n || !uid) return null;
    const linha = { user_id: uid, nome: n, cor: cor || CORES_LISTA[listas.length % CORES_LISTA.length], ordem: listas.length };
    const { data, error } = await supabase.from('metodo_quadro_listas').insert(linha).select().single();
    if (error) { toast.error('Não deu pra criar a lista'); return null; }
    setListas((ls) => [...ls, data]);
    return data;
  };
  const mudarLista = async (lista, mudanca) => {
    setListas((ls) => ls.map((l) => (l.id === lista.id ? { ...l, ...mudanca } : l)));
    const { error } = await supabase.from('metodo_quadro_listas').update({ ...mudanca, updated_at: new Date().toISOString() }).eq('id', lista.id);
    if (error) { toast.error('Não salvou — recarregando'); carregar(); }
  };
  const excluirLista = async (lista) => {
    const abertos = cartoesDaLista(cartoes, lista.id).length;
    if (abertos > 0) { toast.message(`"${lista.nome}" ainda tem ${abertos} card${abertos > 1 ? 's' : ''} — mova ou conclua antes de apagar a lista.`); return; }
    setListas((ls) => ls.filter((l) => l.id !== lista.id));
    await supabase.from('metodo_quadro_listas').delete().eq('id', lista.id);
  };

  // 🧭 o MODELO PRONTO — quadro vazio não ensina ninguém a usar quadro
  const comecarComModelo = async () => {
    const criadas = [];
    for (const l of LISTAS_MODELO) { const c = await criarLista(l.nome, l.cor); if (c) criadas.push(c); }
    if (criadas[0]) {
      const linha = { user_id: uid, lista_id: criadas[0].id, titulo: CARD_EXEMPLO.titulo, checklist: CARD_EXEMPLO.checklist, coluna: ESTADO_ABERTO, ordem: 0 };
      const { data } = await supabase.from('metodo_quadro').insert(linha).select().single();
      if (data) setCartoes((cs) => [...cs, data]);
    }
    toast.success('Quadro montado — edite o que quiser clicando em cima.');
  };

  // ── cards ─────────────────────────────────────────────────────────────────
  const criar = async (listaId) => {
    const titulo = String(novo[listaId] || '').trim();
    if (!titulo || !uid) return;
    const f = ferramentaDe({ titulo });
    const linha = { user_id: uid, lista_id: listaId, titulo, coluna: ESTADO_ABERTO, habito: f?.habito || null, checklist: [], ordem: cartoes.length };
    const { data, error } = await supabase.from('metodo_quadro').insert(linha).select().single();
    if (error) { toast.error('Não deu pra salvar o card'); return; }
    setCartoes((cs) => [...cs, data]);
    setNovo((n) => ({ ...n, [listaId]: '' }));
  };
  const mudar = async (cartaoNovo) => {
    setCartoes((cs) => cs.map((c) => (c.id === cartaoNovo.id ? cartaoNovo : c))); // resposta na hora
    const { id, created_date: _criado, ...resto } = cartaoNovo;
    const { error } = await supabase.from('metodo_quadro').update({ ...resto, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Não salvou — recarregando'); carregar(); }
  };
  const excluir = async (cartao) => {
    setCartoes((cs) => cs.filter((c) => c.id !== cartao.id));
    const { error } = await supabase.from('metodo_quadro').delete().eq('id', cartao.id);
    if (error) { toast.error('Não excluiu — recarregando'); carregar(); }
  };

  // 🔗 quadro → dia. A tarefa nasce pela ENTIDADE (o caminho de escrita do
  // app inteiro); o card, tabela sem entidade, fala com o cliente direto.
  const virarTarefa = async (cartao) => {
    const linha = tarefaDoCartao(cartao, { userId: uid, dataISO: hoje });
    if (!linha) { toast.message('Este card já entrou no seu dia.'); return; }
    let criada = null;
    try { criada = await plataforma.entities.MetodoTarefa.create(linha); }
    catch (e) { console.error(e); toast.error('Não deu pra pôr no dia'); return; }
    const carimbo = { virou_tarefa_id: criada?.id || 'sem-id', virou_tarefa_em: new Date().toISOString() };
    await mudar({ ...cartao, ...carimbo });
    toast.success(`"${cartao.titulo}" entrou na sua Master Task de hoje.`);
    onTarefaCriada?.(criada || { ...linha, id: carimbo.virou_tarefa_id });
  };

  // cards órfãos (da DIR-75, ou de lista apagada) vão pra primeira lista
  useEffect(() => {
    if (!listas[0] || !orfaos.length) return;
    orfaos.forEach((c) => mudar({ ...c, lista_id: listas[0].id, coluna: ESTADO_ABERTO }));
  }, [listas.length, orfaos.length]);

  if (carregando) return <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-nz-tinta-fraca" /></div>;

  return (
    <div className="space-y-3" data-teste="quadro-compromisso">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <Foto user={currentUser} tamanho="w-8 h-8" />
          <div>
            <p className="text-sm font-bold text-nz-tinta">🗂️ O nosso quadro</p>
            <p className="text-[11px] text-nz-tinta-fraca">as suas listas — o tempo fica no seu dia, não aqui</p>
          </div>
        </div>
        <p className="text-[11px] text-nz-tinta-fraca tabular-nums">
          {resumo.abertos} abertos
          {resumo.atrasados > 0 && <span className="ml-2 font-bold text-orange-400 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {resumo.atrasados} passou do prazo</span>}
        </p>
      </div>

      {listas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-nz-verde/40 p-6 text-center space-y-2">
          <p className="text-sm text-nz-tinta">Sua mesa ainda está vazia.</p>
          <p className="text-[11px] text-nz-tinta-fraca">Comece com o modelo — Trabalho · Academia · Pessoal e um card de exemplo — e mude tudo depois clicando em cima.</p>
          <Button onClick={comecarComModelo} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-9" data-teste="quadro-modelo">✨ Começar com o modelo</Button>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2 items-start">
          {listas.map((lista) => {
            const daLista = cartoesDaLista(cartoes, lista.id);
            if (lista.recolhida) {
              // 🧱 RECOLHIDA — a barra vertical do MeisterTask
              return (
                <button
                  key={lista.id}
                  type="button"
                  onClick={() => mudarLista(lista, { recolhida: false })}
                  data-lista={lista.id} data-lista-nome={lista.nome} data-teste="lista-recolhida"
                  title={`abrir ${lista.nome}`}
                  className={`shrink-0 w-9 min-h-[220px] rounded-xl border bg-gradient-to-b ${tom(lista.cor)} flex flex-col items-center py-2 gap-2 hover:brightness-125`}
                >
                  <ChevronRight className="w-3.5 h-3.5 text-nz-tinta-fraca" />
                  <span className="text-[11px] font-bold text-nz-tinta tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{lista.nome}</span>
                  <span className="text-[10px] font-bold text-nz-tinta-fraca">{daLista.length}</span>
                </button>
              );
            }
            return (
              <div key={lista.id} data-lista={lista.id} data-lista-nome={lista.nome} data-teste="lista"
                className={`shrink-0 w-[270px] rounded-xl border bg-gradient-to-b ${tom(lista.cor)} p-2 min-h-[220px]`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Editavel valor={lista.nome} onSalvar={(n) => mudarLista(lista, { nome: n })} className="text-[12px] font-extrabold text-nz-tinta tracking-wide flex-1" />
                  <span className="text-[10px] font-bold text-nz-tinta-fraca tabular-nums">{daLista.length}</span>
                  <button type="button" onClick={() => mudarLista(lista, { recolhida: true })} title="recolher" className="text-nz-tinta-fraca hover:text-nz-tinta"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => excluirLista(lista)} title="apagar lista" className="text-nz-tinta-fraca/40 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
                <div className="space-y-2">
                  {daLista.map((cartao) => (
                    <Cartao key={cartao.id} cartao={cartao} dono={currentUser} hoje={hoje} onMudar={mudar} onExcluir={excluir} onVirarTarefa={virarTarefa} onIr={onIr} />
                  ))}
                </div>
                {/* escrever é UMA linha */}
                <div className="mt-2 flex gap-1">
                  <Input
                    value={novo[lista.id] || ''}
                    onChange={(e) => setNovo((n) => ({ ...n, [lista.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') criar(lista.id); }}
                    placeholder="+ card"
                    className="flex-1 bg-white/5 border-white/10 text-nz-tinta text-[12px] h-8"
                  />
                  <Button size="sm" onClick={() => criar(lista.id)} disabled={!(novo[lista.id] || '').trim()} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8 w-8 p-0"><Plus className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            );
          })}
          {/* + lista */}
          <div className="shrink-0 w-[200px] rounded-xl border border-dashed border-white/15 p-2">
            <Input
              value={novaLista}
              onChange={(e) => setNovaLista(e.target.value)}
              onKeyDown={async (e) => { if (e.key === 'Enter' && novaLista.trim()) { await criarLista(novaLista); setNovaLista(''); } }}
              placeholder="+ nova lista"
              className="bg-transparent border-none text-nz-tinta text-[12px] h-8"
            />
          </div>
        </div>
      )}

      {/* ✓ FEITO — automático, recolhido por padrão, some depois de 7 dias */}
      {feitos.length > 0 && (
        <div className="rounded-xl border border-white/10 p-2" data-teste="quadro-feito">
          <button type="button" onClick={() => setFeitoAberto((v) => !v)} className="w-full flex items-center justify-between text-[11px] font-bold text-nz-tinta-fraca hover:text-nz-tinta">
            <span>✓ Feito <span className="tabular-nums">{feitos.length}</span> <span className="font-normal">— sai da mesa depois de 7 dias</span></span>
            {feitoAberto ? <ChevronLeft className="w-3.5 h-3.5 rotate-90" /> : <ChevronRight className="w-3.5 h-3.5 rotate-90" />}
          </button>
          {feitoAberto && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {feitos.map((cartao) => (
                <Cartao key={cartao.id} cartao={cartao} dono={currentUser} hoje={hoje} onMudar={mudar} onExcluir={excluir} onVirarTarefa={virarTarefa} onIr={onIr} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
