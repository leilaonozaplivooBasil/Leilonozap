import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Download, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { dataISO } from '@/lib/xgame';
import { timeCorporativo } from '@/lib/timeCorporativo';
import { JANELA, estadoDaJanela, resumoDoTime, paraCSV } from '@/lib/organizacaoDoDia';

// 🕥 ORGANIZAÇÃO DO DIA — 10h30 às 12h30.
//
// PEDIDO DO DONO (áudio de 19/09/2026, 10h33):
//   "10h30, todo mundo começa a organização… duas horas de organização diária.
//    Após todo mundo parar na empresa para fazer, isso tem que gerar um
//    relatório bem fluido para o Emanuel, eu, ver todas as demandas do dia.
//    Esse relatório pode ser exportado ou eu posso ser acompanhado em tempo
//    real. De acordo com as tarefas sendo feitas, isso vai contabilizando."
//
// 🔴 POR QUE NÃO É MAIS UM PAINEL: a casa já tem a X-Performance (8 hábitos,
// visão executiva, PDF) e o Painel Corporativo (a fila de UMA pessoa). Esta
// tela responde outra pergunta, que nenhuma das duas responde: QUEM PAROU PARA
// ORGANIZAR HOJE, e o que saiu disso. Por isso conta demanda virando trabalho,
// não hábito.
//
// ⏱️ "em tempo real": relê a cada 60s enquanto a janela está aberta, e para
// sozinha quando ela fecha — não adianta gastar consulta às 19h sobre uma
// janela que terminou às 12h30.

const RELEITURA_MS = 60_000;

const Cartao = ({ rotulo, valor, apoio = null, alerta = false }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{rotulo}</p>
    <p className={`mt-1.5 text-[26px] font-black leading-none tabular-nums ${alerta ? 'text-amber-300' : 'text-white'}`}>{valor}</p>
    {apoio && <p className="mt-1.5 text-[11px] text-white/35">{apoio}</p>}
  </div>
);

export default function OrganizacaoDoDia({ hojeISO = null, pessoas = null }) {
  const hoje = hojeISO || dataISO();
  const [demandas, setDemandas] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [doBanco, setDoBanco] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [lidoEm, setLidoEm] = useState(null);

  const agoraHHMM = () => new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  const [janela, setJanela] = useState(() => estadoDaJanela(agoraHHMM()));

  // 👥 o time é o mesmo da X-Performance (timeCorporativo): quem é gente da
  // casa, sem as contas institucionais. Quem passa `pessoas` (o banco de
  // provas) manda; senão a tela busca sozinha — MentalidadePagina não carrega
  // usuários, e não vale obrigá-la a carregar por causa de uma aba.
  useEffect(() => {
    if (pessoas) return;
    let vivo = true;
    supabase.from('app_users').select('id,full_name,nickname,email,role,career_levels,primary_career_level').order('full_name')
      .then(({ data }) => { if (vivo) setDoBanco(timeCorporativo(data || [])); })
      .catch(() => { if (vivo) setDoBanco([]); });
    return () => { vivo = false; };
  }, [pessoas]);

  // null = ainda buscando o time; [] = buscou e não achou ninguém.
  const time = pessoas || doBanco || [];
  const ids = useMemo(() => (time || []).map((p) => p?.id).filter(Boolean), [time]);

  const carregar = useCallback(async () => {
    if (!pessoas && doBanco === null) return; // o time ainda não chegou: segura o giro
    if (!ids.length) { setCarregando(false); return; }
    const [d, t] = await Promise.all([
      supabase.from('xperf_demandas').select('id,pessoa_id,status,created_at,updated_at').in('pessoa_id', ids).limit(2000),
      supabase.from('metodo_tarefas').select('id,user_id,data,feito').in('user_id', ids).eq('data', hoje).limit(2000),
    ]);
    setDemandas(Array.isArray(d.data) ? d.data : []);
    setTarefas(Array.isArray(t.data) ? t.data : []);
    setLidoEm(new Date());
    setCarregando(false);
  }, [ids, hoje, pessoas, doBanco]);

  useEffect(() => { carregar(); }, [carregar]);

  // ⏱️ o acompanhamento ao vivo. Só enquanto a janela está aberta.
  useEffect(() => {
    const tick = () => setJanela(estadoDaJanela(agoraHHMM()));
    const id = setInterval(() => { tick(); if (estadoDaJanela(agoraHHMM()) === 'agora') carregar(); }, RELEITURA_MS);
    return () => clearInterval(id);
  }, [carregar]);

  const resumo = useMemo(
    () => resumoDoTime({ pessoas: time, demandas, tarefas, hojeISO: hoje }),
    [time, demandas, tarefas, hoje],
  );

  const exportar = () => {
    const csv = paraCSV(resumo, hoje);
    // ﻿: sem o BOM o Excel em português abre acento como caractere estranho
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = `organizacao-${hoje}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const { total, linhas } = resumo;
  const faltam = total.pessoas - total.organizaram;

  return (
    <div className="space-y-4 text-white" data-teste="organizacao-do-dia">
      {/* ── a janela ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Clock className={`h-4 w-4 ${janela === 'agora' ? 'text-nz-verde-neon' : 'text-white/35'}`} />
          <div>
            <p className="text-sm font-bold leading-tight">
              Organização do dia · {JANELA.inicio} às {JANELA.fim}
            </p>
            <p className="text-[11px] text-white/45" data-teste="organizacao-estado">
              {janela === 'agora' ? 'acontecendo agora — a tela se atualiza sozinha'
                : janela === 'antes' ? `ainda não começou (começa ${JANELA.inicio})`
                  : 'a janela de hoje já passou'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button" onClick={carregar} title="reler agora"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white/60 hover:text-white"
          ><RefreshCw className="h-3 w-3" />atualizar</button>
          <button
            type="button" onClick={exportar} disabled={!linhas.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-nz-verde-neon/40 bg-nz-verde-neon/10 px-2.5 py-1.5 text-[11px] font-bold text-nz-verde-neon hover:bg-nz-verde-neon/20 disabled:opacity-40"
            data-teste="organizacao-exportar"
          ><Download className="h-3 w-3" />exportar</button>
        </div>
      </div>

      {carregando ? (
        <div className="flex justify-center py-14 text-white/40"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          {/* ── os números do time, sem nome ── */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-teste="organizacao-numeros">
            <Cartao
              rotulo="Organizaram" valor={`${total.organizaram}/${total.pessoas}`}
              apoio={faltam > 0 ? `${faltam} ainda não` : 'time inteiro'} alerta={faltam > 0}
            />
            <Cartao rotulo="Demandas hoje" valor={total.chegaramHoje} apoio={`${total.tratadasHoje} tratadas`} />
            <Cartao rotulo="Esperando" valor={total.esperando} apoio="sem destino ainda" alerta={total.esperando > 0} />
            <Cartao rotulo="Tarefas do dia" valor={`${total.feitas}/${total.tarefas}`} apoio={`${total.percentual}% feitas`} />
          </div>

          {/* ── pessoa a pessoa, quem não organizou primeiro ── */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm" data-teste="organizacao-tabela">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.12em] text-white/35">
                  <th className="border-b border-white/10 py-2 pr-3 text-left font-semibold">Pessoa</th>
                  <th className="border-b border-white/10 py-2 pr-3 text-right font-semibold">Chegaram</th>
                  <th className="border-b border-white/10 py-2 pr-3 text-right font-semibold">Tratadas</th>
                  <th className="border-b border-white/10 py-2 pr-3 text-right font-semibold">Esperando</th>
                  <th className="border-b border-white/10 py-2 text-right font-semibold">Tarefas</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.pessoaId} data-teste="organizacao-linha" data-organizou={l.organizou ? 'sim' : 'nao'}>
                    <td className="border-b border-white/[0.06] py-2.5 pr-3">
                      <span className="inline-flex items-center gap-2">
                        {l.organizou
                          ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-nz-verde-neon" />
                          : <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-300" />}
                        <span className={l.organizou ? 'text-white/75' : 'font-semibold text-white'}>{l.nome || l.pessoaId}</span>
                      </span>
                    </td>
                    <td className="border-b border-white/[0.06] py-2.5 pr-3 text-right tabular-nums text-white/60">{l.chegaramHoje}</td>
                    <td className="border-b border-white/[0.06] py-2.5 pr-3 text-right tabular-nums text-white/60">{l.tratadasHoje}</td>
                    <td className={`border-b border-white/[0.06] py-2.5 pr-3 text-right tabular-nums ${l.esperando > 0 ? 'font-bold text-amber-300' : 'text-white/35'}`}>{l.esperando}</td>
                    <td className="border-b border-white/[0.06] py-2.5 text-right tabular-nums text-white/60">
                      {l.feitas}/{l.tarefas}{l.tarefas > 0 && <span className="ml-1 text-white/30">({l.percentual}%)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lidoEm && (
            <p className="text-[10.5px] text-white/25">
              lido às {lidoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {janela === 'agora' ? ' · relendo a cada minuto' : ''}
            </p>
          )}
        </>
      )}
    </div>
  );
}
