import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Send, CalendarPlus, LayoutGrid, X, GripVertical, Pencil, Check, ArrowUp, ArrowDown, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { dataISO, nomeExibicao } from '@/lib/xgame';
import { SOMBRA_3D } from '@/components/nav/AtalhoTopCollege';
import { assinarTopCollege, estaNaTopCollege } from '@/lib/areaTopCollege';
import {
  mostraBloco, demandaDoBloco, pecasDaAnotacao, fechamentoDaAnotacao, recadoDaAnotacao, anotacoesRecentes, ondeFoiParar,
  moverNota, ordensParaGravar, tituloEditado, EVENTO_ANOTACAO, ORIGEM_BLOCO,
  DESTINOS_DO_BLOCO, destinoDoBloco, lerDestinoDoBloco, gravarDestinoDoBloco,
  posicaoInicialDoBloco, posicaoDoBloco, lerPosicaoDoBloco, gravarPosicaoDoBloco, LARGURA_DO_BLOCO, LARGURA_MINIMA_PARA_FLUTUAR,
} from '@/lib/blocoDeDemandas';

// 📝 O BOTÃO "D" — bloco de notas rápido de demandas, no cabeçalho, colado ao
// ícone da Top College (ver src/lib/blocoDeDemandas.js pro que cada anotação
// vira). O "D" é desenhado aqui, em SVG, na mesma linguagem da Top College:
// violeta, extrudado, com a mesma sombra 3D — sem depender de imagem nova.
//
// 25/09 (dono): o bloco virou uma JANELINHA SOLTA — sem fundo escuro, arrasta
// pelo cabeçalho, lembra onde ficou (localStorage) e a página atrás continua
// viva. No celular (< 640px) cola embaixo da tela, sem arrastar. Sai pelo
// portal do body: o cabeçalho tem backdrop-filter, que faria o `fixed` virar
// relativo a ele.
const SOMBRA_3D_CLARO = 'drop-shadow(0 2px 0 rgba(0,0,0,0.18)) drop-shadow(0 5px 9px rgba(0,0,0,0.22))';

export function IconeD({ className = '', style = {} }) {
  // o "D": arco externo + furo interno (evenodd), com uma camada escura
  // deslocada embaixo pra fazer o relevo
  const d = 'M118 64 H272 C374 64 448 142 448 256 C448 370 374 448 272 448 H118 Z M196 138 V374 H268 C324 374 366 328 366 256 C366 184 324 138 268 138 Z';
  return (
    <svg viewBox="0 0 512 512" className={className} style={style} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="nzD" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C4B5FD" />
          <stop offset="0.55" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#5B21B6" />
        </linearGradient>
      </defs>
      <path d={d} fill="#2E1065" fillRule="evenodd" transform="translate(0 22)" />
      <path d={d} fill="url(#nzD)" fillRule="evenodd" />
      <path d="M150 96 H266 C296 96 322 104 342 118" stroke="rgba(255,255,255,0.55)" strokeWidth="18" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const janela = () => (typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : { w: 1280, h: 800 });

export default function BlocoDeDemandas({ currentUser, temaClaro = false, className = '' }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [destino, setDestino] = useState(() => lerDestinoDoBloco());
  const [salvando, setSalvando] = useState(false);
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [editando, setEditando] = useState(null);      // { id, texto }
  const [arrastando, setArrastando] = useState(null);  // índice da nota sendo arrastada
  const [posicao, setPosicao] = useState(null);        // {x,y} — null até abrir
  const painelRef = useRef(null);
  const uid = currentUser?.id;
  const nome = currentUser ? nomeExibicao(currentUser) : null;

  const carregar = useCallback(async () => {
    if (!uid) return;
    setCarregando(true);
    const { data } = await supabase.from('xperf_demandas').select('*')
      .eq('pessoa_id', uid).eq('origem', ORIGEM_BLOCO).order('created_at', { ascending: false }).limit(30);
    setLinhas(Array.isArray(data) ? data : []);
    setCarregando(false);
  }, [uid]);
  useEffect(() => { if (aberto) carregar(); }, [aberto, carregar]);

  const recentes = useMemo(() => anotacoesRecentes(linhas), [linhas]);
  const avisar = () => window.dispatchEvent(new Event(EVENTO_ANOTACAO));

  const escolherDestino = (id) => setDestino(gravarDestinoDoBloco(id));

  const anotar = async () => {
    const demanda = demandaDoBloco(texto, { pessoaId: uid, pessoaNome: nome });
    if (!demanda) { toast.error('Escreva o que precisa ser feito.'); return; }
    setSalvando(true);
    const hoje = dataISO();
    try {
      // 1. a demanda (a caixa de entrada) — sempre
      const { data: dCriada, error: eDemanda } = await supabase.from('xperf_demandas').insert(demanda).select();
      if (eDemanda) throw eDemanda;
      const gravada = Array.isArray(dCriada) ? dCriada[0] : dCriada;
      let tarefaId = null; let cardId = null;
      // 2. a tarefa de HOJE, sem horário (Jornada + Lista) — se o destino pede
      const { data: jaNoDia } = destinoDoBloco(destino).jornada
        ? await supabase.from('metodo_tarefas').select('id').eq('user_id', uid).eq('data', hoje) : { data: [] };
      const pecas = pecasDaAnotacao(gravada, { hojeISO: hoje, ordem: Array.isArray(jaNoDia) ? jaNoDia.length : 0, nome, destino });
      if (pecas.tarefa) {
        const { data: tCriada, error: eTarefa } = await supabase.from('metodo_tarefas').insert(pecas.tarefa).select();
        if (eTarefa) throw eTarefa;
        tarefaId = (Array.isArray(tCriada) ? tCriada[0] : tCriada)?.id || null;
      }
      // 3. o card do quadro, ligado à tarefa quando ela existe — se o destino pede
      const card = pecas.card(tarefaId);
      if (card) {
        const { data: cCriado } = await supabase.from('metodo_quadro').insert(card).select();
        cardId = (Array.isArray(cCriado) ? cCriado[0] : cCriado)?.id || null;
      }
      // 4. fecha a demanda apontando pro que nasceu ("só anotar" fica recebida)
      const fechamento = fechamentoDaAnotacao({ tarefaId, cardId, hojeISO: hoje });
      if (fechamento) await supabase.from('xperf_demandas').update(fechamento).eq('id', gravada.id);
      toast.success(recadoDaAnotacao(demanda.titulo, { tarefaId, cardId }));
      setTexto('');
      avisar();
      await carregar();
    } catch {
      toast.error('Não consegui anotar — tenta de novo');
    } finally {
      setSalvando(false);
    }
  };

  // ✏️ editar: o título muda na demanda E no que ela virou (tarefa, card)
  const salvarEdicao = async () => {
    if (!editando) return;
    const titulo = tituloEditado(editando.texto);
    const nota = linhas.find((d) => d.id === editando.id);
    if (!titulo || !nota || titulo === nota.titulo) { setEditando(null); return; }
    setSalvando(true);
    try {
      await supabase.from('xperf_demandas').update({ titulo, updated_at: new Date().toISOString() }).eq('id', nota.id);
      if (nota.tarefa_id) await supabase.from('metodo_tarefas').update({ titulo }).eq('id', nota.tarefa_id);
      if (nota.card_id) await supabase.from('metodo_quadro').update({ titulo }).eq('id', nota.card_id);
      setEditando(null);
      avisar();
      await carregar();
    } catch {
      toast.error('Não consegui salvar a edição');
    } finally {
      setSalvando(false);
    }
  };

  // ↕️ reordenar: grava a posição de cada nota da lista (ordem_bloco)
  const reordenar = async (de, para) => {
    const nova = moverNota(recentes, de, para);
    if (nova.every((d, i) => d.id === recentes[i]?.id)) return;
    const ordens = ordensParaGravar(nova);
    setLinhas((atuais) => atuais.map((d) => { const o = ordens.find((x) => x.id === d.id); return o ? { ...d, ordem_bloco: o.ordem_bloco } : d; }));
    try {
      await Promise.all(ordens.map((o) => supabase.from('xperf_demandas').update({ ordem_bloco: o.ordem_bloco }).eq('id', o.id)));
    } catch {
      toast.error('Não consegui salvar a ordem');
      await carregar();
    }
  };

  // 🪟 a janelinha: nasce no canto direito, lembra onde ficou, arrasta pelo cabeçalho
  const flutua = janela().w >= LARGURA_MINIMA_PARA_FLUTUAR;
  const abrir = () => {
    const { w, h } = janela();
    const lembrada = lerPosicaoDoBloco();
    setPosicao(posicaoDoBloco(lembrada || posicaoInicialDoBloco({ larguraJanela: w }), { larguraJanela: w, alturaJanela: h }));
    setAberto(true);
  };
  const arrastarJanela = (e) => {
    if (!flutua || e.button !== 0 || !posicao) return;
    const alvo = e.currentTarget; const origem = { x: e.clientX - posicao.x, y: e.clientY - posicao.y };
    alvo.setPointerCapture?.(e.pointerId);
    let ultima = posicao;
    const mover = (ev) => {
      const { w, h } = janela();
      ultima = posicaoDoBloco({ x: ev.clientX - origem.x, y: ev.clientY - origem.y }, { larguraJanela: w, alturaJanela: h, alturaBloco: painelRef.current?.offsetHeight || 200 });
      setPosicao(ultima);
    };
    const soltar = () => {
      alvo.removeEventListener('pointermove', mover); alvo.removeEventListener('pointerup', soltar); alvo.removeEventListener('pointercancel', soltar);
      gravarPosicaoDoBloco(ultima);
    };
    alvo.addEventListener('pointermove', mover); alvo.addEventListener('pointerup', soltar); alvo.addEventListener('pointercancel', soltar);
  };
  useEffect(() => {
    if (!aberto) return undefined;
    const tecla = (e) => { if (e.key === 'Escape' && !salvando) setAberto(false); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aberto, salvando]);

  // 🎓 só dentro da Top College — a bandeira que o Licensing levanta
  const naTopCollege = useSyncExternalStore(assinarTopCollege, estaNaTopCollege, () => false);
  if (!mostraBloco(currentUser, naTopCollege)) return null;

  const destinoAtual = destinoDoBloco(destino);
  const estiloJanela = flutua && posicao
    ? { left: posicao.x, top: posicao.y, width: Math.min(LARGURA_DO_BLOCO, janela().w - 16) }
    : { left: 0, right: 0, bottom: 0 };

  const painel = aberto ? (
    <div
      ref={painelRef}
      role="dialog" aria-modal="false" aria-label="Bloco de demandas"
      className={`nz-escuro fixed z-[70] bg-gray-900 border border-gray-700 text-white shadow-2xl ${flutua ? 'rounded-2xl' : 'rounded-t-2xl border-b-0 max-h-[85vh] overflow-y-auto'}`}
      style={estiloJanela}
      data-teste="modal-bloco-demandas"
      data-flutua={flutua ? '1' : '0'}
    >
      {/* o cabeçalho é a alça: arrasta por ele */}
      <div
        className={`flex items-center gap-2 px-4 py-3 border-b border-gray-800 select-none ${flutua ? 'cursor-grab active:cursor-grabbing touch-none' : ''}`}
        onPointerDown={arrastarJanela}
        data-teste="arrastar-bloco"
      >
        {flutua && <GripVertical className="w-4 h-4 text-gray-500" />}
        <IconeD className="h-6 w-6" />
        <div className="min-w-0 flex-1">
          <div className="font-bold leading-tight">Bloco de demandas</div>
          <div className="text-[11px] text-gray-400 truncate">anota, escolhe pra onde vai, arrasta e edita</div>
        </div>
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => !salvando && setAberto(false)} aria-label="Fechar" className="rounded-md p-1 text-gray-400 hover:text-white hover:bg-white/10" data-teste="fechar-bloco"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-4 space-y-3">
        {/* 🎯 pra onde vai */}
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Para onde enviar">
          {DESTINOS_DO_BLOCO.map((d) => (
            <button
              key={d.id} type="button" role="radio" aria-checked={destino === d.id}
              onClick={() => escolherDestino(d.id)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${destino === d.id ? 'border-violet-400 bg-violet-500/20 text-violet-100' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}
              data-teste={`destino-${d.id}`}
            >
              {d.rotulo}
            </button>
          ))}
        </div>

        <Textarea
          autoFocus rows={2} value={texto} disabled={salvando}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (texto.trim() && !salvando) anotar(); } }}
          placeholder="o que precisa ser feito? (Enter anota · Shift+Enter quebra linha)"
          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          data-teste="texto-anotacao"
        />
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={anotar} disabled={salvando || !texto.trim()} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8 text-[12px]" data-teste="anotar">
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />} Anotar
          </Button>
          <span className="text-[11px] text-gray-500 inline-flex items-center gap-1" data-teste="resumo-destino">
            {destinoAtual.jornada && <><CalendarPlus className="w-3 h-3" /> jornada</>}
            {destinoAtual.jornada && destinoAtual.quadro && ' · '}
            {destinoAtual.quadro && <><LayoutGrid className="w-3 h-3" /> quadro</>}
            {!destinoAtual.jornada && !destinoAtual.quadro && <><Inbox className="w-3 h-3" /> fica nas Demandas</>}
          </span>
        </div>

        <div data-teste="anotacoes-recentes">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Suas últimas anotações</div>
          {carregando && !linhas.length ? (
            <p className="text-[11px] text-gray-500"><Loader2 className="w-3 h-3 animate-spin inline mr-1" /> carregando…</p>
          ) : !recentes.length ? (
            <p className="text-[11px] text-gray-500" data-teste="anotacoes-vazio">Nada anotado por aqui ainda.</p>
          ) : (
            <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {recentes.map((d, i) => (
                <li
                  key={d.id}
                  draggable={editando?.id !== d.id}
                  onDragStart={(e) => { setArrastando(i); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)); } catch { /* alguns navegadores exigem */ } }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={(e) => { e.preventDefault(); const de = arrastando ?? Number(e.dataTransfer.getData('text/plain')); setArrastando(null); if (Number.isFinite(de)) reordenar(de, i); }}
                  onDragEnd={() => setArrastando(null)}
                  className={`group flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[12px] ${arrastando === i ? 'border-violet-400 opacity-60' : 'border-gray-800 bg-gray-800/50'}`}
                  data-teste="anotacao"
                  data-id={d.id}
                >
                  <GripVertical className="w-3.5 h-3.5 shrink-0 text-gray-600 cursor-grab" aria-hidden="true" />
                  {editando?.id === d.id ? (
                    <input
                      autoFocus value={editando.texto}
                      onChange={(e) => setEditando({ id: d.id, texto: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); salvarEdicao(); } if (e.key === 'Escape') setEditando(null); }}
                      className="flex-1 min-w-0 rounded bg-gray-950 border border-violet-400/60 px-1.5 py-0.5 text-[12px] text-white outline-none"
                      data-teste="nota-editando"
                    />
                  ) : (
                    <span className="flex-1 min-w-0 truncate text-gray-100" title={d.titulo}>{d.titulo}</span>
                  )}
                  <span className="shrink-0 text-[10px] text-gray-500 hidden sm:inline">{ondeFoiParar(d)}</span>
                  {editando?.id === d.id ? (
                    <button type="button" onClick={salvarEdicao} disabled={salvando} className="shrink-0 rounded p-0.5 text-emerald-300 hover:bg-white/10" aria-label="Salvar" data-teste="nota-salvar"><Check className="w-3.5 h-3.5" /></button>
                  ) : (
                    <button type="button" onClick={() => setEditando({ id: d.id, texto: d.titulo })} className="shrink-0 rounded p-0.5 text-gray-500 hover:text-white hover:bg-white/10" aria-label="Editar" data-teste="nota-editar"><Pencil className="w-3.5 h-3.5" /></button>
                  )}
                  <span className="shrink-0 flex flex-col -my-1">
                    <button type="button" onClick={() => reordenar(i, i - 1)} disabled={i === 0} className="rounded p-0 text-gray-600 hover:text-white disabled:opacity-20" aria-label="Subir" data-teste="nota-subir"><ArrowUp className="w-3 h-3" /></button>
                    <button type="button" onClick={() => reordenar(i, i + 1)} disabled={i === recentes.length - 1} className="rounded p-0 text-gray-600 hover:text-white disabled:opacity-20" aria-label="Descer" data-teste="nota-descer"><ArrowDown className="w-3 h-3" /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => (aberto ? setAberto(false) : abrir())}
        aria-label="Bloco de demandas"
        aria-expanded={aberto}
        title="Bloco de demandas — anota e escolhe pra onde vai: jornada, quadro ou só anotar"
        data-teste="botao-d-demandas"
        className={`grid shrink-0 place-items-center translate-y-[3px] transition-transform duration-200 hover:scale-110 active:scale-95 ${className}`}
      >
        <IconeD className="h-9 w-9 sm:h-10 sm:w-10" style={{ filter: temaClaro ? SOMBRA_3D_CLARO : SOMBRA_3D }} />
      </button>
      {painel && typeof document !== 'undefined' ? createPortal(painel, document.body) : null}
    </>
  );
}
