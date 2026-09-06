import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Camera, Check, X } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// 📸 AS COMPROVAÇÕES — a segunda análise do gestor, em cima.
//
// Ordem do dono (06/09/2026): "as comprovações têm que subir — tanto dentro
// de cada um como a comprovação geral". Antes moravam só na aba do admin do
// X-GAME, lá embaixo. Agora este painel aparece duas vezes, com a MESMA
// regra e as MESMAS gravações do admin (XGameAdmin): a fila geral, logo
// depois da fila do pronto; e a aba "Comprovações" do Quadro Geral, filtrada
// pela pessoa. Aprovar carimba `aprovada_manual` e confirma o feito;
// reprovar carimba `reprovada` com o motivo e devolve a tarefa pra pessoa.

export const statusDaComp = (c) => c?.status || (c?.valido ? 'aprovada_ia' : 'reprovada');
const ROTULO = { em_analise: 'em análise', aprovada_ia: 'aprovada pela IA', aprovada_manual: 'aprovada por você', reprovada: 'reprovada' };
const COR = { em_analise: 'border-amber-400/40 text-amber-200', aprovada_ia: 'border-nz-verde/40 text-nz-verde', aprovada_manual: 'border-nz-verde/50 text-nz-verde', reprovada: 'border-red-400/40 text-red-200' };
const fmtDia = (iso) => { const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); };

/** As comprovações (de todo mundo, ou de uma pessoa). O radar por pessoa sai da própria fila. */
export function useComprovacoes({ pessoaId = null } = {}) {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const carregar = useCallback(async () => {
    let q = supabase.from('metodo_tarefas').select('id,user_id,data,hora,titulo,feito,comprovacao').not('comprovacao', 'is', null);
    if (pessoaId) q = q.eq('user_id', pessoaId);
    const { data } = await q.order('data', { ascending: false }).limit(150);
    setLista(data || []);
    setCarregando(false);
  }, [pessoaId]);
  useEffect(() => { carregar(); }, [carregar]);
  const radar = useMemo(() => {
    const por = {};
    for (const t of lista) {
      const r = por[t.user_id] || (por[t.user_id] = { reprovadas: 0, analise: 0, aprovadas: 0 });
      const s = statusDaComp(t.comprovacao);
      if (s === 'reprovada') r.reprovadas += 1; else if (s === 'em_analise') r.analise += 1; else r.aprovadas += 1;
    }
    return por;
  }, [lista]);
  const aprovar = async (t) => {
    const comprovacao = { ...t.comprovacao, status: 'aprovada_manual', valido: true };
    const { error } = await supabase.from('metodo_tarefas').update({ comprovacao, feito: true }).eq('id', t.id);
    if (error) { toast.error('Erro ao aprovar.'); return; }
    toast.success('Comprovação aprovada ✔');
    setLista((l) => l.map((x) => (x.id === t.id ? { ...x, comprovacao, feito: true } : x)));
  };
  const reprovar = async (t, motivo) => {
    const comprovacao = { ...t.comprovacao, status: 'reprovada', valido: false, motivo_gestor: String(motivo || '').trim() || 'reprovada pelo gestor na segunda análise' };
    const { error } = await supabase.from('metodo_tarefas').update({ comprovacao, feito: false }).eq('id', t.id);
    if (error) { toast.error('Erro ao reprovar.'); return; }
    toast.success('Reprovada — a tarefa voltou a ficar pendente pra pessoa.');
    setLista((l) => l.map((x) => (x.id === t.id ? { ...x, comprovacao, feito: false } : x)));
  };
  return { lista, carregando, carregar, radar, aprovar, reprovar };
}

export default function ComprovacoesPainel({ pessoaId = null, nomeDe = (id) => id, compacto = false }) {
  const { lista, carregando, radar, aprovar, reprovar } = useComprovacoes({ pessoaId });
  const [filtro, setFiltro] = useState('em_analise');
  const [reprovando, setReprovando] = useState(null); // { id, motivo }
  const pendentes = lista.filter((t) => statusDaComp(t.comprovacao) === 'em_analise').length;
  const visiveis = lista.filter((t) => filtro === 'todas' || statusDaComp(t.comprovacao) === filtro);
  const r = pessoaId ? radar[pessoaId] : null;

  if (carregando) return <p className="text-[11px] text-white/40 py-2"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> carregando as comprovações…</p>;
  return (
    <div className="space-y-2" data-teste={pessoaId ? 'comprovacoes-pessoa' : 'comprovacoes-geral'} data-pendentes={pendentes}>
      <div className="flex items-center gap-2 flex-wrap">
        {!compacto && (
          <>
            <Camera className="w-4 h-4 text-nz-verde" />
            <p className="text-[10px] font-bold tracking-[0.28em] text-white/50 uppercase">Comprovações</p>
          </>
        )}
        <span className={`text-[10px] ${pendentes ? 'text-amber-300 font-bold' : 'text-white/35'}`} data-teste="comprovacoes-pendentes">
          {pendentes ? `${pendentes} em análise — a segunda análise é sua` : 'nada em análise'}
        </span>
        {r && <span className="text-[10px] text-white/35" data-teste="comprovacoes-radar">· radar: {r.aprovadas} aprovada{r.aprovadas === 1 ? '' : 's'} · {r.analise} em análise · {r.reprovadas} reprovada{r.reprovadas === 1 ? '' : 's'}</span>}
        <span className="ml-auto flex gap-1">
          {[['em_analise', 'em análise'], ['todas', 'todas']].map(([v, rot]) => (
            <button key={v} type="button" onClick={() => setFiltro(v)} className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${filtro === v ? 'border-white/40 text-white bg-white/10' : 'border-white/10 text-white/45 hover:text-white'}`}>{rot}</button>
          ))}
        </span>
      </div>
      {visiveis.length === 0 ? (
        <p className="text-[11px] text-white/35">{filtro === 'em_analise' ? 'Nenhuma comprovação esperando a sua análise.' : 'Nenhuma comprovação.'}</p>
      ) : (
        <ul className="space-y-1">
          {visiveis.map((t) => {
            const s = statusDaComp(t.comprovacao);
            const c = t.comprovacao || {};
            return (
              <li key={t.id} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px]" style={{ background: 'rgba(255,255,255,0.02)' }} data-teste="comprovacao" data-status={s}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${COR[s] || ''}`}>{ROTULO[s] || s}</span>
                  {!pessoaId && <span className="font-bold text-white/85 truncate">{nomeDe(t.user_id)}</span>}
                  <span className="text-white/70 truncate">{t.titulo}</span>
                  <span className="text-white/40 shrink-0">{fmtDia(t.data)}{t.hora ? ` ${String(t.hora).slice(0, 5)}` : ''}</span>
                  {c.print_url && <a href={c.print_url} target="_blank" rel="noreferrer" className="shrink-0 text-nz-verde hover:underline">ver o print</a>}
                  {c.veredito_ia?.motivo && <span className="text-white/35 truncate" title={c.veredito_ia.o_que_viu || ''}>IA: {c.veredito_ia.motivo}</span>}
                  {s === 'reprovada' && c.motivo_gestor && <span className="text-red-200/70 truncate">↩ {c.motivo_gestor}</span>}
                  {s === 'em_analise' && (
                    <span className="ml-auto flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => aprovar(t)} className="inline-flex items-center gap-1 rounded-full bg-nz-verde/20 hover:bg-nz-verde/35 px-2 py-0.5 text-nz-verde font-bold" data-teste="comp-aprovar"><Check className="w-3 h-3" /> aprovar</button>
                      <button type="button" onClick={() => setReprovando({ id: t.id, motivo: '' })} className="inline-flex items-center gap-1 rounded-full bg-red-400/15 hover:bg-red-400/30 px-2 py-0.5 text-red-200 font-bold" data-teste="comp-reprovar"><X className="w-3 h-3" /> reprovar</button>
                    </span>
                  )}
                </div>
                {reprovando?.id === t.id && (
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <Input autoFocus value={reprovando.motivo} onChange={(e) => setReprovando((d) => ({ ...d, motivo: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { reprovar(t, reprovando.motivo); setReprovando(null); } }} placeholder="o motivo: o que a prova não mostrou" className="h-8 flex-1 min-w-[200px] border-white/15 bg-white/[0.06] text-white placeholder:text-white/30 text-[11px]" data-teste="comp-motivo" />
                    <Button size="sm" onClick={() => { reprovar(t, reprovando.motivo); setReprovando(null); }} className="bg-red-400 hover:bg-red-300 text-red-950 h-8 text-[11px] font-extrabold" data-teste="comp-reprovar-confirmar">reprovar com o motivo</Button>
                    <Button size="sm" variant="ghost" onClick={() => setReprovando(null)} className="h-8 text-[11px] text-white/50">cancelar</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
