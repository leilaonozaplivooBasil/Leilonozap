import React from 'react';
import { ScrollText, Landmark, Gauge, CalendarClock } from 'lucide-react';
import { fmtReais } from '@/lib/xgame';
import { getLevel } from '@/lib/careerLevels';
import {
  CAMADAS, CICLO, METAS_CENTRAIS, RITUAIS, LINHA_SCORE, VALUATION_ATUAL, VALUATIONS_REFERENCIA, INTEGRANTES_POOL_REFERENCIA,
  rendaDaCarteira, poolDiretoriaOperacional, valorDoEquity, posicoesDaPessoa, scoreExecutivo, degrauDaEscada,
} from '@/lib/documentoOficial';
import { cargoOficialDaFuncao } from '@/lib/funcoes';
import { chaveDe } from '@/lib/metasPessoa';

// 📜 O PAINEL OFICIAL DA PESSOA — o que o Documento Oficial de Operação diz
// sobre a função dela, transferido pro Quadro Geral (06/09/2026). Quatro
// pedaços, cada um com a página de onde saiu:
//   • CartaoFuncaoOficial — a função no documento: missão, "dono de", metas,
//     entregáveis, cadência e o fixo do budget (Resumo p. 9);
//   • ModeloEconomico — as cinco camadas (p. 11/44) com os números da pessoa:
//     fixo, carteira × 1%, pool de 0,5% ÷ 7, equity 0,5% por valuation, e as
//     posições de governança que ela já tem no painel de controle;
//   • ScoreEscada — o Score Executivo (p. 42) lido do que ela fez, com a
//     linha dos 80%, e o degrau da Escada de Ascensão (p. 43);
//   • RituaisSemana — segunda 9h–12h, 2 reuniões/dia, 5 lives, Conexão Sexta.

const caixa = { background: 'rgba(255,255,255,0.03)' };
const titulo = 'text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase';
const fmtK = (v) => (v >= 1000000 ? `R$ ${(v / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi` : fmtReais(v));

export function CartaoFuncaoOficial({ funcao, origem, nivel, fixoMes }) {
  const cargo = cargoOficialDaFuncao(funcao);
  if (!funcao) {
    return (
      <div className="mt-3 rounded-lg border border-amber-400/40 p-2.5 text-[11px] text-amber-100" style={{ background: 'rgba(251,191,36,0.06)' }} data-teste="funcao-oficial" data-estado="sem-funcao">
        <p className="font-bold">Sem função definida.</p>
        <p className="text-amber-100/70 mt-0.5">{nivel ? `${getLevel(nivel).name} é a POSIÇÃO dela no painel de controle; a função (COO, CFO, CMO…) é o trabalho — escolha acima.` : 'Escolha a função acima: é ela que define o dia, as metas e os entregáveis.'}</p>
      </div>
    );
  }
  const ORIGEM = { escolhida: 'escolhida aqui', documento: 'sugerida pelo Documento Oficial (pelo nome)', painel: 'o nível do painel de controle também é o trabalho' };
  return (
    <div className="mt-3 rounded-lg border border-white/10 p-2.5" style={caixa} data-teste="funcao-oficial" data-funcao={funcao.id} data-origem={origem || ''}>
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className={titulo}><ScrollText className="w-3 h-3 inline mr-1" />No Documento Oficial</p>
        <span className="text-[10px] text-white/35">· {ORIGEM[origem] || 'sem origem'}</span>
        {cargo?.paginas && <span className="ml-auto text-[10px] text-white/25">{cargo.paginas}</span>}
      </div>
      {cargo ? (
        <>
          <p className="mt-1 text-[12px] text-white"><span className="font-extrabold">{cargo.sigla}</span> · {cargo.nome} · <span className="text-white/60">{cargo.cargoPt}</span></p>
          <p className="text-[11px] text-white/75 mt-0.5"><span className="text-white/40">missão:</span> {cargo.missao} <span className="text-white/40">· {cargo.dono}</span></p>
          {cargo.titular && <p className="text-[10px] text-white/40 mt-0.5">titular no documento: {cargo.titular}{cargo.fixoBudget ? ` · budget ${fmtReais(cargo.fixoBudget)}/mês` : ''}{fixoMes && cargo.fixoBudget && Number(fixoMes) !== cargo.fixoBudget ? <span className="text-amber-300/80"> · aqui está {fmtReais(fixoMes)}</span> : null}</p>}
          {cargo.nota && <p className="text-[10px] text-amber-200/70 mt-0.5">{cargo.nota}</p>}
          <div className="mt-2 grid sm:grid-cols-2 gap-2">
            <div>
              <p className={titulo}>Entregáveis</p>
              <ul className="mt-0.5 space-y-0.5 text-[11px] text-white/65" data-teste="entregaveis-oficiais">
                {cargo.entregaveis.map((e) => <li key={e}>• {e}</li>)}
              </ul>
            </div>
            <div>
              <p className={titulo}>Metas do mês</p>
              <ul className="mt-0.5 space-y-0.5 text-[11px] text-white/65" data-teste="metas-oficiais">
                {cargo.captacaoMes ? <li>• Captação <span className="text-white font-bold tabular-nums">{fmtReais(cargo.captacaoMes)}</span> por mês <span className="text-white/35">· {fmtReais(cargo.captacaoMes * 6)} no ciclo</span></li> : null}
                {cargo.metas.filter((m) => m.chave !== 'captacao').map((m) => (
                  <li key={m.chave}>• <span className="text-white font-bold tabular-nums">{m.alvo.toLocaleString('pt-BR')}</span> {(chaveDe(m.chave)?.rotulo || m.chave.replace(/_/g, ' ')).toLowerCase()}{m.oficial ? '' : <span className="text-amber-300/70"> · sugestão</span>}{m.nota ? <span className="text-white/35"> · {m.nota}</span> : null}</li>
                ))}
              </ul>
              {cargo.cadencia?.length > 0 && (
                <>
                  <p className={`${titulo} mt-1.5`}>Cadência</p>
                  <ul className="mt-0.5 space-y-0.5 text-[11px] text-white/55">{cargo.cadencia.map((c) => <li key={c}>• {c}</li>)}</ul>
                </>
              )}
            </div>
          </div>
          {cargo.areas?.length > 0 && <p className="mt-1.5 text-[10px] text-white/35">áreas: {cargo.areas.join(' · ')}</p>}
        </>
      ) : (
        <p className="mt-1 text-[11px] text-white/60"><span className="text-white font-bold">{funcao.nome}</span> é uma função do painel de controle, não do Documento Oficial — entrega {funcao.entrega}.</p>
      )}
    </div>
  );
}

export function ModeloEconomico({ fixoMes, carteira = 0, niveis = [], vendasMesReferencia = METAS_CENTRAIS.vendasMes }) {
  const posicoes = posicoesDaPessoa(niveis);
  const pool = poolDiretoriaOperacional(vendasMesReferencia);
  const naDirOp = posicoes.some((p) => p.id === 'diretoria_operacao');
  const governanca = posicoes.filter((p) => p.convite);
  const linhas = [
    { c: CAMADAS[0], valor: fixoMes ? fmtReais(fixoMes) : '—', nota: fixoMes ? 'o fixo do mês, distribuído por peso nas tarefas' : 'sem fixo definido' },
    { c: CAMADAS[1], valor: `${fmtReais(rendaDaCarteira(carteira))}/mês`, nota: `carteira construída ${fmtReais(carteira)} × 1% a.m. (contratos de 12 meses)` },
    { c: CAMADAS[2], valor: naDirOp ? `~${fmtReais(pool.porIntegrante)}/mês` : '—', nota: naDirOp ? `pool de 0,5% sobre ${fmtK(vendasMesReferencia)} = ${fmtReais(pool.pool)} ÷ ${INTEGRANTES_POOL_REFERENCIA} integrantes (referência)` : 'entra quando estiver na Diretoria Operacional' },
    { c: CAMADAS[3], valor: fmtReais(valorDoEquity(VALUATION_ATUAL)), nota: `0,5% a ${fmtK(VALUATION_ATUAL)} · ${VALUATIONS_REFERENCIA.slice(1).map((v) => `${fmtK(v)} → ${fmtReais(valorDoEquity(v))}`).join(' · ')} · mediante Score ≥ ${LINHA_SCORE}%` },
    { c: CAMADAS[4], valor: governanca.length ? governanca.map((p) => p.nome).join(' · ') : 'por convite', nota: governanca.length ? governanca.map((p) => `${p.nome}: ${p.pool}`).join(' · ') : 'Diretoria Executiva, Fundadores e Conselho — cada um com pool de 1% Brasil + Mundial' },
  ];
  return (
    <div className="mt-3 rounded-lg border border-white/10 p-2.5" style={caixa} data-teste="modelo-economico">
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className={titulo}><Landmark className="w-3 h-3 inline mr-1" />Modelo econômico do executivo</p>
        <span className="text-[10px] text-white/35">· cinco camadas (Documento p. 11 e 44) · renda + recorrência + participação + patrimônio + governança</span>
      </div>
      <ol className="mt-1.5 space-y-1">
        {linhas.map(({ c, valor, nota }) => (
          <li key={c.id} className="flex items-start gap-2 text-[11px]" data-camada={c.id}>
            <span className="shrink-0 w-4 h-4 rounded-full bg-white/10 text-[9px] font-bold text-white/70 inline-flex items-center justify-center">{c.n}</span>
            <div className="min-w-0 flex-1">
              <p className="text-white/85"><span className="font-bold text-white">{c.nome}</span> · <span className="tabular-nums text-nz-verde font-bold" data-teste={`camada-${c.id}`}>{valor}</span></p>
              <p className="text-[10px] text-white/40">{nota}</p>
            </div>
          </li>
        ))}
      </ol>
      {posicoes.length > 0 && <p className="mt-1.5 text-[10px] text-white/45">posições no painel de controle: {posicoes.map((p) => p.nome).join(' · ')}</p>}
    </div>
  );
}

export function ScoreEscada({ fracoes, niveis = [], portoesAbertos = 0, emFormacao = true }) {
  const score = scoreExecutivo(fracoes || {});
  const escada = degrauDaEscada({ niveis, score, portoesAbertos, emFormacao });
  return (
    <div className="mt-3 rounded-lg border border-white/10 p-2.5" style={caixa} data-teste="score-executivo" data-score={score.total} data-degrau={escada.n}>
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className={titulo}><Gauge className="w-3 h-3 inline mr-1" />Score Executivo</p>
        <span className="text-[10px] text-white/35">· pra consolidar o equity de 0,5% (Documento p. 42) · linha {LINHA_SCORE}%</span>
        <p className={`ml-auto text-[14px] font-extrabold tabular-nums ${score.liberado ? 'text-nz-verde' : 'text-white'}`}>{score.total.toLocaleString('pt-BR')}<span className="text-[10px] text-white/40 font-medium">/100</span></p>
      </div>
      <div className="mt-1.5 relative h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full ${score.liberado ? 'bg-nz-verde' : 'bg-amber-400'}`} style={{ width: `${Math.min(100, score.total)}%` }} />
        <div className="absolute top-0 h-full w-px bg-white/70" style={{ left: `${LINHA_SCORE}%` }} title={`linha dos ${LINHA_SCORE}%`} />
      </div>
      <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-5 gap-1">
        {score.partes.map((p) => (
          <div key={p.id} className="rounded-md border border-white/10 px-2 py-1" data-parte={p.id}>
            <p className="text-[9px] text-white/35 uppercase tracking-wider truncate" title={p.rotulo}>{p.rotulo}</p>
            <p className="text-[11px] font-bold text-white tabular-nums">{p.semDado ? <span className="text-white/30 font-medium">sem dado</span> : `${Math.round(p.fracao * 100)}%`} <span className="text-white/35 font-medium">· peso {p.peso}</span></p>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-white/40">{score.liberado ? 'acima da linha: permanência + cultura + entrega + resultado' : `faltam ${score.faltam.toLocaleString('pt-BR')} pontos pra linha dos ${LINHA_SCORE}% — o equity não vem pelo decurso dos seis meses`}</p>
      <div className="mt-2">
        <p className={titulo}>Escada de ascensão <span className="normal-case tracking-normal text-white/30">(p. 43)</span></p>
        <ol className="mt-1 flex flex-wrap gap-1" data-teste="escada">
          {escada.degraus.map((d) => (
            <li key={d.id} className={`rounded-full border px-2 py-0.5 text-[10px] ${d.atual ? 'border-nz-verde/60 text-white bg-nz-verde/15 font-bold' : d.feito ? 'border-white/20 text-white/60' : 'border-white/10 text-white/30'}`} title={d.descricao} data-degrau={d.n} data-atual={d.atual ? 'sim' : 'nao'}>
              {d.feito ? '✓ ' : ''}{d.n}. {d.nome}
            </li>
          ))}
        </ol>
        {escada.proximo && <p className="mt-1 text-[10px] text-white/40">próximo degrau: {escada.proximo.nome} — {escada.proximo.descricao}</p>}
      </div>
    </div>
  );
}

export function RituaisSemana({ hoje }) {
  const d = hoje ? new Date(`${hoje}T12:00:00`).getDay() : null;
  const mes = String(hoje || '').slice(0, 7);
  const fase = CICLO.meses.find((m) => m.mes === mes);
  return (
    <div className="mb-2 rounded-lg border border-white/10 p-2.5" style={caixa} data-teste="rituais-semana">
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className={titulo}><CalendarClock className="w-3 h-3 inline mr-1" />A semana oficial</p>
        <span className="text-[10px] text-white/35">· Documento p. 16, 23, 33–35{fase ? ` · ${mes.slice(5)}/${mes.slice(0, 4)}: ${fase.fase}` : ''}</span>
      </div>
      <ul className="mt-1 grid sm:grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-white/65">
        {RITUAIS.map((r) => {
          const hojeSim = d !== null && (r.dia === null || r.dia === d || (Array.isArray(r.dia) && r.dia.includes(d)));
          return <li key={r.id} className={hojeSim ? 'text-white' : ''}>{hojeSim ? '▸ ' : '• '}<span className="font-bold">{r.nome}</span>{r.hora ? <span className="text-white/40"> {r.hora}{r.ate ? `–${r.ate}` : ''}</span> : null} <span className="text-white/45">— {r.descricao}</span></li>;
        })}
      </ul>
    </div>
  );
}
