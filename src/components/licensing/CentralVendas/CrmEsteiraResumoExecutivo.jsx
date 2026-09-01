import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { GitBranch, CalendarClock } from 'lucide-react';
import StatInfoTooltip from './StatInfoTooltip';
import {
  ESTAGIOS_ESTEIRA, resumoEsteira, conversaoPorResponsavel, fechadoProvado,
} from '@/lib/esteiraCaptacao';
import { agendaEsteira, reunioesPorResponsavel } from '@/lib/agendaEsteira';
import { META_CAPTACAO } from '@/lib/captacaoParceiros';

// 🎯 DIR-38 — O CENTRO DE COMANDO da Visão Executiva: a esteira em números
// (quantidade por estágio), a agenda de reuniões do dia por pessoa do time e
// a projeção da meta de captação — tudo pra bater o olho e entender.
// Honestidade: "na conta" (venda real casada) nunca se mistura com
// "declarado" (100% sem dinheiro provado) nem com o ponderado (previsão).
const brl = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const brlCurto = (v) => {
  if (v >= 1000000) return `R$ ${(v / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (v >= 1000) return `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: v >= 100000 ? 0 : 1 })} mil`;
  return brl(v);
};

const NOME_CURTO = {
  reuniao_agendada: 'Agendadas', interesse_futuro: 'Pra frente', interesse_nova_reuniao: 'Nova reunião',
  fechado_50: '50%', fechado_70: '70%', fechado_99: '99% assinatura', fechado_100: '100% fechado',
  sem_interesse: 'Perdidas',
};
const EMOJI = {
  reuniao_agendada: '📅', interesse_futuro: '🕐', interesse_nova_reuniao: '🔄',
  fechado_50: '💰', fechado_70: '📋', fechado_99: '✍️', fechado_100: '✅', sem_interesse: '❌',
};

export default function CrmEsteiraResumoExecutivo({ oportunidades = [], sales = [], visaoTotal, onVerEsteira }) {
  const resumo = useMemo(() => resumoEsteira(oportunidades), [oportunidades]);
  const provado = useMemo(() => fechadoProvado(oportunidades, sales), [oportunidades, sales]);
  const agenda = useMemo(() => agendaEsteira(oportunidades), [oportunidades]);
  const porResp = useMemo(() => reunioesPorResponsavel(oportunidades), [oportunidades]);
  const winPorNome = useMemo(() => {
    const m = new Map();
    conversaoPorResponsavel(oportunidades).forEach((r) => m.set(r.nome, r));
    return m;
  }, [oportunidades]);

  const caminhado = provado.naConta + provado.declarado + resumo.pipelinePonderado;
  const pct = Math.min(100, (caminhado / META_CAPTACAO) * 100);
  const pctNaConta = Math.min(100, (provado.naConta / META_CAPTACAO) * 100);
  const pctDeclarado = Math.min(100 - pctNaConta, (provado.declarado / META_CAPTACAO) * 100);

  return (
    <Card className="bg-white border-nz-borda mb-4 sm:mb-6">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Cabeçalho + projeção da meta de captação */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold text-nz-tinta flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-nz-verde" />
            Esteira de Captação — projeção da meta de {brlCurto(META_CAPTACAO)}
            <StatInfoTooltip text='Verde = fechado COM dinheiro na conta (venda real casada). Âmbar = fechado declarado, ainda sem o dinheiro provado. Cinza = pipeline ponderado (Σ valor × probabilidade das negociações ativas). Declarado e previsão nunca se somam como dinheiro — cada um na sua cor.' />
          </p>
          <button type="button" onClick={onVerEsteira} className="text-sm font-semibold text-nz-verde hover:text-nz-verde-claro">
            Ver esteira →
          </button>
        </div>

        <div>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 mb-2">
            <p className="text-sm"><span className="text-nz-tinta-fraca">Na conta:</span> <span className="font-bold text-nz-verde">{brl(provado.naConta)}</span></p>
            <p className="text-sm"><span className="text-nz-tinta-fraca">Fechado declarado:</span> <span className="font-bold text-amber-600">{brl(provado.declarado)}</span></p>
            <p className="text-sm"><span className="text-nz-tinta-fraca">Em esteira (ponderado):</span> <span className="font-bold text-nz-tinta">{brl(resumo.pipelinePonderado)}</span></p>
            <p className="text-xs text-nz-tinta-fraca">{resumo.ativas} negociações ativas · caminho de {pct.toFixed(1).replace('.', ',')}% da meta</p>
          </div>
          {/* Barra da meta: verde (na conta) + âmbar (declarado) + cinza (ponderado) */}
          <div className="h-2.5 rounded-full bg-nz-cinza-fundo overflow-hidden flex">
            <div className="bg-nz-verde h-full" style={{ width: `${pctNaConta}%` }} />
            <div className="bg-amber-400 h-full" style={{ width: `${pctDeclarado}%` }} />
            <div className="bg-nz-tinta-fraca/30 h-full" style={{ width: `${Math.max(0, pct - pctNaConta - pctDeclarado)}%` }} />
          </div>
        </div>

        {/* Funil em chips: quantidade por estágio, batendo o olho */}
        <div className="flex flex-wrap gap-1.5">
          {ESTAGIOS_ESTEIRA.map((est) => {
            const { qtd, valor } = resumo.porEstagio[est.id];
            return (
              <span
                key={est.id}
                title={`${NOME_CURTO[est.id]}: ${qtd} · ${brl(valor)}`}
                className={`px-2 py-1 rounded-lg border text-xs flex items-center gap-1 ${qtd > 0
                  ? (est.id === 'fechado_100' ? 'border-nz-verde/40 bg-nz-verde-fundo text-nz-tinta font-semibold'
                    : est.id === 'sem_interesse' ? 'border-nz-borda bg-nz-cinza-fundo text-nz-tinta-fraca'
                    : 'border-nz-borda bg-white text-nz-tinta font-medium')
                  : 'border-nz-borda/60 bg-nz-cinza-fundo/40 text-nz-tinta-fraca/60'}`}
              >
                {EMOJI[est.id]} {NOME_CURTO[est.id]} <span className="font-bold">{qtd}</span>
                {valor > 0 && <span className="text-[10px] text-nz-tinta-fraca">· {brlCurto(valor)}</span>}
              </span>
            );
          })}
        </div>

        {/* Agenda do dia */}
        <div className="rounded-lg border border-nz-borda bg-nz-cinza-fundo/50 p-3">
          <p className="text-xs font-semibold text-nz-tinta uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5 text-nz-verde" /> Agenda de hoje
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <p className={agenda.reunioesHoje.length > 0 ? 'text-nz-tinta font-semibold' : 'text-nz-tinta-fraca'}>
              📅 {agenda.reunioesHoje.length} reunião(ões) hoje
            </p>
            <p className={agenda.reunioesAtrasadas.length > 0 ? 'text-red-600 font-semibold' : 'text-nz-tinta-fraca'}>
              ⏰ {agenda.reunioesAtrasadas.length} atrasada(s)
            </p>
            <p className="text-nz-tinta-fraca">🗓️ {agenda.reunioesSemana} nos próximos 7 dias</p>
            <p className={agenda.recontatosHoje > 0 ? 'text-amber-700 font-semibold' : 'text-nz-tinta-fraca'}>
              🔁 {agenda.recontatosHoje} recontato(s) vencido(s)
            </p>
          </div>
          {agenda.reunioesHoje.length > 0 && (
            <p className="text-xs text-nz-tinta-fraca mt-1 truncate">
              Hoje: {agenda.reunioesHoje.map((o) => o.cliente_nome).filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Time: reuniões + win rate por responsável (só visão total) */}
        {visaoTotal && porResp.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nz-borda text-nz-tinta">
                  <th className="text-left py-1.5 font-semibold">Time</th>
                  <th className="text-center py-1.5 font-semibold">Reuniões hoje</th>
                  <th className="text-center py-1.5 font-semibold">Marcadas</th>
                  <th className="text-center py-1.5 font-semibold">Win rate</th>
                </tr>
              </thead>
              <tbody>
                {porResp.map((r) => {
                  const win = winPorNome.get(r.nome)?.winRate;
                  return (
                    <tr key={r.nome} className="border-b border-nz-borda/60">
                      <td className="py-1.5 text-nz-tinta font-medium">{r.nome}</td>
                      <td className="py-1.5 text-center font-bold text-nz-tinta">{r.hoje}</td>
                      <td className="py-1.5 text-center text-nz-tinta-fraca">{r.marcadas}</td>
                      <td className="py-1.5 text-center text-nz-tinta">{win == null ? '—' : `${win.toFixed(0)}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
