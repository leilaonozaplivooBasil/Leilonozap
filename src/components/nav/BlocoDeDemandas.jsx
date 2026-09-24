import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Loader2, Send, CalendarPlus, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { dataISO, nomeExibicao } from '@/lib/xgame';
import { SOMBRA_3D } from '@/components/nav/AtalhoTopCollege';
import { assinarTopCollege, estaNaTopCollege } from '@/lib/areaTopCollege';
import {
  mostraBloco, demandaDoBloco, pecasDaAnotacao, fechamentoDaAnotacao, anotacoesRecentes, ondeFoiParar, EVENTO_ANOTACAO, ORIGEM_BLOCO,
} from '@/lib/blocoDeDemandas';

// 📝 O BOTÃO "D" — bloco de notas rápido de demandas, no cabeçalho, colado ao
// ícone da Top College (ver src/lib/blocoDeDemandas.js pro que cada anotação
// vira). O "D" é desenhado aqui, em SVG, na mesma linguagem da Top College:
// violeta, extrudado, com a mesma sombra 3D — sem depender de imagem nova.
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

export default function BlocoDeDemandas({ currentUser, temaClaro = false, className = '' }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(false);
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

  const anotar = async () => {
    const demanda = demandaDoBloco(texto, { pessoaId: uid, pessoaNome: nome });
    if (!demanda) { toast.error('Escreva o que precisa ser feito.'); return; }
    setSalvando(true);
    const hoje = dataISO();
    try {
      // 1. a demanda (a caixa de entrada)
      const { data: dCriada, error: eDemanda } = await supabase.from('xperf_demandas').insert(demanda).select();
      if (eDemanda) throw eDemanda;
      const gravada = Array.isArray(dCriada) ? dCriada[0] : dCriada;
      // 2. a tarefa de HOJE, sem horário (Jornada + Lista)
      const { data: jaNoDia } = await supabase.from('metodo_tarefas').select('id').eq('user_id', uid).eq('data', hoje);
      const pecas = pecasDaAnotacao(gravada, { hojeISO: hoje, ordem: Array.isArray(jaNoDia) ? jaNoDia.length : 0, nome });
      const { data: tCriada, error: eTarefa } = await supabase.from('metodo_tarefas').insert(pecas.tarefa).select();
      if (eTarefa) throw eTarefa;
      const tarefaId = (Array.isArray(tCriada) ? tCriada[0] : tCriada)?.id || null;
      // 3. o card do quadro, ligado à tarefa
      const { data: cCriado } = await supabase.from('metodo_quadro').insert(pecas.card(tarefaId)).select();
      const cardId = (Array.isArray(cCriado) ? cCriado[0] : cCriado)?.id || null;
      // 4. fecha a demanda apontando pros dois
      await supabase.from('xperf_demandas').update(fechamentoDaAnotacao({ tarefaId, cardId, hojeISO: hoje })).eq('id', gravada.id);
      toast.success(`"${demanda.titulo}" entrou na sua jornada de hoje e no quadro`);
      setTexto('');
      window.dispatchEvent(new Event(EVENTO_ANOTACAO));
      await carregar();
    } catch {
      toast.error('Não consegui anotar — tenta de novo');
    } finally {
      setSalvando(false);
    }
  };

  // 🎓 só dentro da Top College — a bandeira que o Licensing levanta
  const naTopCollege = useSyncExternalStore(assinarTopCollege, estaNaTopCollege, () => false);
  if (!mostraBloco(currentUser, naTopCollege)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Bloco de demandas"
        title="Bloco de demandas — anota e já entra na jornada, na lista e no quadro"
        data-teste="botao-d-demandas"
        className={`grid shrink-0 place-items-center translate-y-[3px] transition-transform duration-200 hover:scale-110 active:scale-95 ${className}`}
      >
        <IconeD className="h-9 w-9 sm:h-10 sm:w-10" style={{ filter: temaClaro ? SOMBRA_3D_CLARO : SOMBRA_3D }} />
      </button>

      <Dialog open={aberto} onOpenChange={(v) => { if (!salvando) setAberto(v); }}>
        <DialogContent className="nz-escuro bg-gray-900 border-gray-700 text-white max-w-lg" data-teste="modal-bloco-demandas">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><IconeD className="h-6 w-6" /> Bloco de demandas</DialogTitle>
            <DialogDescription className="text-gray-400">
              Anota e pronto: entra hoje na sua Jornada e na Lista (sem horário — você escolhe quando) e vira card no Quadro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
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
              <span className="text-[11px] text-gray-500 inline-flex items-center gap-1"><CalendarPlus className="w-3 h-3" /> jornada · <LayoutGrid className="w-3 h-3" /> quadro</span>
            </div>
          </div>

          <div className="mt-2" data-teste="anotacoes-recentes">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Suas últimas anotações</div>
            {carregando && !linhas.length ? (
              <p className="text-[11px] text-gray-500"><Loader2 className="w-3 h-3 animate-spin inline mr-1" /> carregando…</p>
            ) : !recentes.length ? (
              <p className="text-[11px] text-gray-500" data-teste="anotacoes-vazio">Nada anotado por aqui ainda.</p>
            ) : (
              <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {recentes.map((d) => (
                  <li key={d.id} className="flex items-start gap-2 rounded-lg border border-gray-800 bg-gray-800/50 px-2.5 py-1.5 text-[12px]" data-teste="anotacao">
                    <span className="flex-1 text-gray-100">{d.titulo}</span>
                    <span className="shrink-0 text-[10px] text-gray-500">{ondeFoiParar(d)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
