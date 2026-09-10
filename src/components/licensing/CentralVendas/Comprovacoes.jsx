import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Camera, Check, X, Video, Mic } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { comprovacaoBateNaBusca, agruparComprovacoesPorData, agruparComprovacoesPorPessoa, rotuloDataComprovacao, rotuloDataAmigavel } from '@/lib/filaComprovacoes';
import BotaoLaudoPdf from './PdfComprovacoes';
import { podeVerLaudo } from '@/lib/quemVeOLaudo';

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
// 🩹 09/09/2026 — DIR-125/126, dono, achado independente nas duas sessões:
// o Ritual do Amanhecer ('aprovada_ritual', CrmMetodo.jsx) tinha selo VAZIO
// aqui — faltava o rótulo E a cor (`ROTULO[s] || s` devolvia a chave crua,
// sem classe nenhuma pra pintar). As outras telas da fila (XGameAdmin.jsx)
// já tratavam esse status; aqui não.
const ROTULO = { em_analise: 'em análise', aprovada_ia: 'aprovada pela IA', aprovada_manual: 'aprovada por você', aprovada_ritual: 'ritual aprovado', reprovada: 'reprovada' };
const COR = { em_analise: 'border-amber-400/40 text-amber-200', aprovada_ia: 'border-nz-verde/40 text-nz-verde', aprovada_manual: 'border-nz-verde/50 text-nz-verde', aprovada_ritual: 'border-nz-verde/40 text-nz-verde', reprovada: 'border-red-400/40 text-red-200' };
const fmtDia = (iso) => { const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); };

// 🖱️ 09/09/2026 — dono: "ver uma prévia do print sem clicar e levar pra
// fora, só em passar o mouse". O link continua abrindo a prova inteira num
// clique (histórico/zoom), mas passar o mouse já mostra a imagem — sem sair
// da fila de análise. O vídeo do ritual (sem print — a comprovação dele É o
// vídeo) ganha a mesma prévia, só que tocando mudo em loop.
function PreviaDaProva({ url, tipo, className, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a href={url} target="_blank" rel="noreferrer" className={className}>{children}</a>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-black/95 border border-white/15 p-1 rounded-lg">
        {tipo === 'video' ? (
          <video src={url} className="max-w-[240px] max-h-[240px] rounded object-contain" muted autoPlay loop playsInline />
        ) : (
          <img src={url} alt="prévia da comprovação" className="max-w-[240px] max-h-[240px] rounded object-contain" loading="lazy" />
        )}
      </TooltipContent>
    </Tooltip>
  );
}

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

export default function ComprovacoesPainel({ pessoaId = null, nomeDe = (id) => id, compacto = false, currentUser = null }) {
  // 🔐 Fase 3 — o laudo é do gestor admin e de quem está na lista nominal
  // (src/lib/quemVeOLaudo.js). Sem `currentUser`, NÃO aparece: o padrão de
  // uma permissão que não sabe quem está olhando tem que ser o fechado.
  const laudoLiberado = podeVerLaudo(currentUser);
  const { lista, carregando, radar, aprovar, reprovar } = useComprovacoes({ pessoaId });
  const [filtro, setFiltro] = useState('em_analise');
  const [reprovando, setReprovando] = useState(null); // { id, motivo }
  // 🔎 09/09/2026 — DIR-126, dono, mesma régua do ADM X-Game (DIR-124):
  // "eu preciso separar por data... busca... tanto a data e tanto o dia."
  // Esta é a fila que ele vê TODO dia, logo depois da Fila do Pronto — a
  // busca/agrupamento tinha ido só pra dentro do ADM, sem passar por aqui.
  const [busca, setBusca] = useState('');
  // 📅 dono: "um menu suspenso pra escolher qual é a data do mês. Hoje,
  // ontem..." — um filtro A MAIS, que soma com a busca de texto acima
  // (nunca substitui): "todas" mostra tudo agrupado, como hoje.
  const [dataEscolhida, setDataEscolhida] = useState('todas');
  const pendentes = lista.filter((t) => statusDaComp(t.comprovacao) === 'em_analise').length;
  const visiveis = useMemo(() => lista.filter((t) => {
    if (filtro !== 'todas' && statusDaComp(t.comprovacao) !== filtro) return false;
    return comprovacaoBateNaBusca(t, nomeDe(t.user_id), busca);
  }), [lista, filtro, busca, nomeDe]);
  const visiveisPorData = useMemo(() => agruparComprovacoesPorData(visiveis), [visiveis]);
  const gruposExibidos = useMemo(() => (
    dataEscolhida === 'todas' ? visiveisPorData : visiveisPorData.filter(([data]) => data === dataEscolhida)
  ), [visiveisPorData, dataEscolhida]);
  const r = pessoaId ? radar[pessoaId] : null;

  if (carregando) return <p className="text-[11px] text-white/40 py-2"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> carregando as comprovações…</p>;
  return (
    <TooltipProvider delayDuration={150}>
    {/* 🌑 `nz-escuro`: este painel é um bloco ESCURO dentro de uma página de
        tema claro. Sem a marca, a regra global de `body[data-painel-nav] main`
        pinta a busca e o menu de datas de BRANCO — com print do dono em
        10/09. A marca é a saída de emergência que a casa já usa (index.css). */}
    <div className="nz-escuro space-y-2" data-teste={pessoaId ? 'comprovacoes-pessoa' : 'comprovacoes-geral'} data-pendentes={pendentes}>
      <div className="flex items-center gap-2 flex-wrap">
        {!compacto && (
          <>
            <Camera className="w-4 h-4 text-nz-verde" />
            <p className="text-[10px] font-bold tracking-[0.28em] text-white/50 uppercase">Comprovações</p>
          </>
        )}
        {/* 🤖 09/09/2026 — DIR-125, dono: "a IA tem que pegar tudo... intervenção
            humana zero." Desde a DIR-89 (comprovação normal) e a DIR-125 (o
            Ritual do Amanhecer, a última rota que ainda caía pro gestor), a
            IA decide sozinha — aprova ou reprova. Este número deve ficar em
            zero quase sempre; quando não fica, é caso raro de verdade. */}
        <span className={`text-[10px] ${pendentes ? 'text-amber-300 font-bold' : 'text-white/35'}`} data-teste="comprovacoes-pendentes">
          {pendentes ? `${pendentes} em análise — casos raros que a IA não decidiu sozinha` : 'nada em análise — a IA decide tudo sozinha'}
        </span>
        {r && <span className="text-[10px] text-white/35" data-teste="comprovacoes-radar">· radar: {r.aprovadas} aprovada{r.aprovadas === 1 ? '' : 's'} · {r.analise} em análise · {r.reprovadas} reprovada{r.reprovadas === 1 ? '' : 's'}</span>}
        <span className="ml-auto flex gap-1">
          {[['em_analise', 'em análise'], ['todas', 'todas']].map(([v, rot]) => (
            <button key={v} type="button" onClick={() => setFiltro(v)} className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${filtro === v ? 'border-white/40 text-white bg-white/10' : 'border-white/10 text-white/45 hover:text-white'}`}>{rot}</button>
          ))}
        </span>
      </div>
      {!compacto && (
        <div className="flex items-center gap-1.5">
          <input
            placeholder="🔎 buscar por nome ou por data (ex.: “luciano” ou “09/09”)"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1 h-7 text-[11px] rounded-lg border border-white/10 bg-white/[0.04] text-white placeholder:text-white/30 px-2.5"
            data-teste="comprovacoes-busca"
          />
          <select
            value={dataEscolhida}
            onChange={(e) => setDataEscolhida(e.target.value)}
            className="lista-escura h-7 shrink-0 text-[11px] rounded-lg border border-white/10 bg-white/[0.04] text-white px-1.5"
            data-teste="comprovacoes-filtro-data"
          >
            <option value="todas">todas as datas</option>
            {visiveisPorData.map(([data]) => (
              <option key={data} value={data}>{rotuloDataAmigavel(data)}</option>
            ))}
          </select>
        </div>
      )}
      {visiveis.length === 0 ? (
        <p className="text-[11px] text-white/35">{busca ? 'Nada encontrado nessa busca.' : filtro === 'em_analise' ? 'Nenhuma comprovação esperando a sua análise.' : 'Nenhuma comprovação.'}</p>
      ) : gruposExibidos.length === 0 ? (
        <p className="text-[11px] text-white/35">Nada nessa data.</p>
      ) : (
        <div className="space-y-2" data-teste="comprovacoes-por-data">
        {gruposExibidos.map(([data, itens]) => (
          <div key={data} className="space-y-1.5">
            {!compacto && (
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-wide" data-teste="comprovacoes-cabecalho-data">
                📅 {rotuloDataComprovacao(data)} <span className="font-normal normal-case text-white/25">· {itens.length}</span>
              </p>
            )}
            {/* 👤 dono: "eu quero já separado por datas e por nomes... nome
                das pessoas que estão participando" — depois: "a galera
                lateral, pra ficar mais organizado... pro gestor não ficar
                forçando a mente." Um CARD por pessoa, lado a lado num grid —
                só faz sentido na fila GERAL (`!pessoaId`); a fila de UMA
                pessoa já não repete o nome em cada linha. */}
            <div className={pessoaId ? 'space-y-1' : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2'}>
            {(pessoaId ? [[pessoaId, null, itens]] : agruparComprovacoesPorPessoa(itens, nomeDe)).map(([pid, nome, itensDaPessoa]) => (
              <div key={pid} className={pessoaId ? '' : 'space-y-1 rounded-lg border border-white/10 bg-white/[0.015] p-2'} data-teste={pessoaId ? undefined : 'comprovacoes-grupo-pessoa'}>
                {/* 📄 10/09/2026 — o laudo em PDF (Fase 2). Dono: serve pra
                    "quando o usuário reclamar de algum erro ou problema,
                    podermos ver na hora se foi mal uso do usuário ou se de
                    fato é erro". Fica AQUI, colado no nome e no dia, porque é
                    exatamente este recorte — uma pessoa, um dia — que a
                    reclamação traz. Sai do que já está na tela: não busca
                    nada, não grava nada. */}
                {!pessoaId ? (
                  <p className="text-[10px] font-bold text-white/55 truncate flex items-center gap-1" data-teste="comprovacoes-cabecalho-pessoa">
                    <span className="truncate">👤 {nome} <span className="font-normal text-white/25">· {itensDaPessoa.length}</span></span>
                    {laudoLiberado && <BotaoLaudoPdf itens={itensDaPessoa} data={data} pessoaId={pid} nome={nome} className="ml-auto" />}
                  </p>
                ) : (
                  laudoLiberado && (
                  <div className="flex justify-end">
                    <BotaoLaudoPdf itens={itensDaPessoa} data={data} pessoaId={pid} nome={nomeDe(pid)} />
                  </div>
                  )
                )}
        <ul className="space-y-1">
          {itensDaPessoa.map((t) => {
            const s = statusDaComp(t.comprovacao);
            const c = t.comprovacao || {};
            return (
              <li key={t.id} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px]" style={{ background: 'rgba(255,255,255,0.02)' }} data-teste="comprovacao" data-status={s}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${COR[s] || ''}`}>{ROTULO[s] || s}</span>
                  <span className="text-white/70 truncate">{t.titulo}</span>
                  <span className="text-white/40 shrink-0">{compacto ? fmtDia(t.data) : ''}{t.hora ? ` ${String(t.hora).slice(0, 5)}` : ''}</span>
                  {c.print_url && (
                    <PreviaDaProva url={c.print_url} tipo="imagem" className="shrink-0 text-nz-verde hover:underline">ver o print</PreviaDaProva>
                  )}
                  {c.video_url && (
                    <PreviaDaProva url={c.video_url} tipo="video" className="shrink-0 inline-flex items-center gap-1 text-amber-300 hover:underline">
                      <Video className="w-3 h-3" /> ver o vídeo{c.video_seg ? ` (${c.video_seg}s)` : ''}
                    </PreviaDaProva>
                  )}
                  {/* 📝 09/09/2026 — DIR-126, dono: "se for vídeo, se for áudio,
                      tem que tudo transcrever e mostrar ali." O texto que a
                      pessoa escreveu OU falou (já transcrito — gratidão do
                      ritual, resumo da leitura) nunca aparecia aqui, só o
                      veredito da IA. `entrega` já é essa fonte única
                      (CrmMetodo.jsx); só não mostra quando é uma URL
                      (foto/print/link — a prévia acima já cobre isso). */}
                  {/* 🎙️ DIR-125 — dono: "gravou o vídeo, mandou áudio, tem que
                      ficar mais claro." O ÁUDIO em si continua protegido (só
                      o dono ouve, api/functions/audioDoDitado.js) — aqui é só
                      o AVISO de que ele existe, igual ao "ver o vídeo" acima
                      avisa da visualização. Sem vídeo E sem áudio, o ritual
                      foi só por texto — também vale dizer isso claramente. */}
                  {c.entrada_gratidao === 'audio' && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-sky-300" title="Voz da pessoa — só ela pode ouvir; aqui é só o aviso de que ela mandou.">
                      <Mic className="w-3 h-3" /> gratidão em áudio{c.audio_gratidao_seg ? ` (${c.audio_gratidao_seg}s)` : ''}
                    </span>
                  )}
                  {c.tipo === 'ritual' && !c.video_url && c.entrada_gratidao !== 'audio' && (
                    <span className="shrink-0 text-white/35">só por texto, sem vídeo nem áudio</span>
                  )}
                  {c.entrega && !/^https?:\/\//i.test(c.entrega) && (
                    <span className="text-white/55 italic truncate" title={c.entrega}>"{c.entrega}"</span>
                  )}
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
              </div>
            ))}
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
