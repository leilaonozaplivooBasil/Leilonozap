import React, { useState, useEffect, useCallback } from 'react';
import { fmtBR } from '@/lib/money';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap, Users, TrendingUp, Shield, Play, RefreshCw, Activity,
  ArrowUpCircle, ArrowDownCircle, CheckCircle2, HelpCircle,
  FlaskConical, MousePointerClick, Package, Clock
} from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import CatalogSyncCard from '@/components/precificavivo/CatalogSyncCard';

export default function PrecificaVivoPainel() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [lastRunResult, setLastRunResult] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, historyData] = await Promise.all([
        base44.functions.invoke('precificaVivoControl', { action: 'get_stats' }),
        base44.entities.PriceHistory.list('-created_date', 50)
      ]);
      setStats(statsRes?.data || null);
      setHistory(historyData || []);
    } catch (err) {
      console.error('Erro ao carregar painel:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Atualiza métricas a cada 30s
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRunNow = async () => {
    if (!confirm('Executar o PrecificaVivo AGORA?\n\nIsso vai consumir créditos do SerpAPI se houver tráfego ≥ 10 sessões ativas.')) return;

    setIsRunning(true);
    setLastRunResult(null);
    try {
      const res = await base44.functions.invoke('precificaVivoControl', { action: 'run_now' });
      setLastRunResult(res?.data?.result || res?.data);
      alert('Execução concluída! Veja o resultado no painel.');
      await loadData();
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunTest = async () => {
    if (!confirm('MODO TESTE\n\nIgnora o limite de sessões e processa APENAS 1 produto (consumo mínimo SerpAPI).\n\nContinuar?')) return;

    setIsTestRunning(true);
    setLastRunResult(null);
    try {
      const res = await base44.functions.invoke('precificaVivoControl', { action: 'run_test' });
      setLastRunResult(res?.data?.result || res?.data);
      alert('Teste concluído! Veja o resultado no painel.');
      await loadData();
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setIsTestRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-emerald-950/40 border-b border-gray-800 px-6 py-5 sticky top-16 z-30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none">PrecificaVivo — Painel</h1>
              <p className="text-xs text-gray-500 mt-0.5">Motor de preço dinâmico baseado em tráfego</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={loadData} className="bg-gray-800 hover:bg-gray-700 text-gray-300 border-0">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar
            </Button>
            <Button
              size="sm"
              onClick={handleRunTest}
              disabled={isTestRunning || isRunning}
              className="bg-purple-600 hover:bg-purple-500 text-white border-0"
              title="Ignora o limite de sessões e processa apenas 1 produto"
            >
              {isTestRunning ? (
                <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Testando...</>
              ) : (
                <><FlaskConical className="w-3.5 h-3.5 mr-1.5" />Rodar em Modo Teste</>
              )}
            </Button>
            <Button
              size="sm"
              onClick={handleRunNow}
              disabled={isRunning || isTestRunning}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"
            >
              {isRunning ? (
                <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Rodando...</>
              ) : (
                <><Play className="w-3.5 h-3.5 mr-1.5" /> Rodar Agora</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Aviso: automation */}
        <Card className="bg-blue-950/30 border-blue-700/40">
          <CardContent className="p-4 flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-semibold mb-1">Automação agendada a cada 5 min</p>
              <p className="text-blue-300/80 text-xs">
                A ativação/pausa é feita no <strong>Dashboard Base44 → Automations → "PrecificaVivo Tick (5min)"</strong>.
                Use "Rodar Agora" para testar manualmente a qualquer momento.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card inteligente: sincronização da Loja Virtual */}
        <CatalogSyncCard />

        {/* Métricas */}
        <TooltipProvider delayDuration={150}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              label="Sessões ativas"
              value={stats?.sessions_active ?? '—'}
              icon={Users}
              color="text-blue-400"
              border="border-blue-500/25"
              hint={stats?.sessions_active >= 10 ? 'Motor ativo' : 'Modo econômico'}
              tooltip="Quantas pessoas estão usando o app agora (últimos 10 min). O motor só roda automaticamente quando tem 10 ou mais, para economizar créditos de busca de preço. No modo teste, esse limite é ignorado."
            />
            <MetricCard
              label="Updates 24h"
              value={stats?.updates_24h ?? 0}
              icon={TrendingUp}
              color="text-emerald-400"
              border="border-emerald-500/25"
              hint={`${stats?.auto_updates ?? 0} auto · ${stats?.manual_updates ?? 0} manual`}
              tooltip="Quantos produtos tiveram o preço alterado nas últimas 24h. 'Auto' = ajustes feitos pelo motor automaticamente (tráfego ativo). 'Manual' = você clicou em 'Rodar Agora' ou 'Rodar em Modo Teste'."
            />
            <MetricCard
              label="Variação média"
              value={`${stats?.avg_variation_percent ?? 0}%`}
              icon={Activity}
              color="text-purple-400"
              border="border-purple-500/25"
              hint="Absoluta, últimas 24h"
              tooltip="Média de quanto os preços mudaram (para cima ou para baixo) nas últimas 24h. Valor sempre positivo. Exemplo: 8% significa que, em média, os produtos mudaram 8% de preço."
            />
            <MetricCard
              label="Piso aplicado"
              value={stats?.floor_applied_24h ?? 0}
              icon={Shield}
              color="text-amber-400"
              border="border-amber-500/25"
              hint="custo × 1.3 > mercado"
              tooltip="Quantas vezes o motor teve que usar o PISO DE SEGURANÇA (custo × 1,3) em vez do preço de mercado. Isso acontece quando o mercado está tão barato que venderíamos com prejuízo. O piso protege sua margem mínima de 30%."
            />
            <MetricCard
              label="Histórico total"
              value={history.length}
              icon={CheckCircle2}
              color="text-cyan-400"
              border="border-cyan-500/25"
              hint="Últimas 50 mudanças"
              tooltip="Total de alterações de preço registradas (limitado às 50 mais recentes exibidas abaixo). Cada linha do Histórico de Preços representa 1 alteração aplicada."
            />
          </div>
        </TooltipProvider>

        {/* Última execução manual */}
        {lastRunResult && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Resultado da última execução manual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-black/40 rounded-lg p-3 text-emerald-300 overflow-auto max-h-60">
                {JSON.stringify(lastRunResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Timeline de mudanças */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Histórico de Preços
            </CardTitle>
            <span className="text-xs text-gray-500">{history.length} registros</span>
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <div className="py-12 text-center text-gray-600 text-sm">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhuma atualização de preço registrada ainda.
                <p className="text-xs mt-1">Ative a automação ou clique em "Rodar Agora"</p>
              </div>
            ) : (
              <TooltipProvider delayDuration={150}>
                <div className="divide-y divide-gray-800/60">
                  {history.map((h) => (
                    <HistoryRow key={h.id} record={h} />
                  ))}
                </div>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ───── Sub-componentes ─────

function MetricCard({ label, value, icon: Icon, color, border, hint, tooltip }) {
  const card = (
    <div className={`rounded-2xl border ${border} bg-gray-900 p-4 ${tooltip ? 'cursor-help hover:bg-gray-800/60 transition-colors' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
          {tooltip && <HelpCircle className="w-3 h-3 text-gray-600" />}
        </div>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {hint && <p className="text-[10px] text-gray-600 mt-1">{hint}</p>}
    </div>
  );

  if (!tooltip) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs bg-gray-900 border-gray-700 text-gray-200 text-xs p-3 leading-relaxed">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function HistoryRow({ record }) {
  const variation = record.variation_percent || 0;
  const isUp = variation >= 0;
  // Regra de negócio visual: preço SUBIU = ruim p/ cliente (vermelho) | preço DESCEU = ganho p/ cliente (verde)
  const variationColor = isUp ? 'text-red-400' : 'text-emerald-400';
  const variationBg = isUp ? 'bg-red-500/10 border-red-500/25' : 'bg-emerald-500/10 border-emerald-500/25';
  const ArrowIcon = isUp ? ArrowUpCircle : ArrowDownCircle;

  const triggerLabels = {
    auto_traffic: { label: 'Auto', icon: Zap, color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    manual_single: { label: 'Manual', icon: MousePointerClick, color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
    manual_batch: { label: 'Lote', icon: Package, color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
    scheduled: { label: 'Agendado', icon: Clock, color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
  };
  const trig = triggerLabels[record.trigger_type] || triggerLabels.auto_traffic;

  const createdAt = record.created_date ? new Date(record.created_date) : null;
  const timeStr = createdAt ? createdAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="group flex items-center gap-4 px-5 py-4 hover:bg-gradient-to-r hover:from-gray-800/40 hover:to-transparent transition-all cursor-help border-l-2 border-transparent hover:border-emerald-500/40">

          {/* Ícone de direção em círculo */}
          <div className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 ${variationBg}`}>
            <ArrowIcon className={`w-5 h-5 ${variationColor}`} />
          </div>

          {/* Coluna central: produto + metadados */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-100 font-medium truncate group-hover:text-white transition-colors">
              {record.product_description || '—'}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge className={`text-[10px] px-2 py-0.5 ${trig.color} border font-medium gap-1`}>
                <trig.icon className="w-3 h-3" /> {trig.label}
              </Badge>
              {record.floor_applied && (
                <Badge className="text-[10px] px-2 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium gap-1">
                  <Shield className="w-2.5 h-2.5" /> Piso
                </Badge>
              )}
              {record.sessions_active != null && (
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Users className="w-2.5 h-2.5" />{record.sessions_active} online
                </span>
              )}
              <span className="text-[10px] text-gray-600 ml-auto sm:ml-0">{timeStr}</span>
            </div>
          </div>

          {/* Coluna direita: antes → depois + variação */}
          <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 line-through">R$ {fmtBR((record.old_price || 0))}</span>
              <span className="text-gray-600">→</span>
              <span className="text-white font-bold text-sm">R$ {fmtBR((record.new_price || 0))}</span>
            </div>
            <div className={`text-xs font-bold px-2 py-0.5 rounded-md border ${variationBg} ${variationColor}`}>
              {isUp ? '+' : ''}{variation.toFixed(2)}%
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-sm bg-gray-950 border border-gray-700 text-gray-200 p-0 overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-950/60 to-gray-900 px-4 py-2.5 border-b border-gray-800">
          <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Detalhes da alteração</p>
        </div>
        <div className="p-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Antes</p>
              <p className="text-sm text-gray-400 line-through">R$ {fmtBR((record.old_price || 0))}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Depois</p>
              <p className="text-sm text-white font-bold">R$ {fmtBR((record.new_price || 0))}</p>
            </div>
          </div>

          <div className={`rounded-lg px-3 py-2 border ${variationBg} flex items-center justify-between`}>
            <span className="text-[11px] text-gray-400 font-medium">Variação</span>
            <span className={`text-sm font-bold ${variationColor} flex items-center gap-1`}>
              <ArrowIcon className="w-3.5 h-3.5" />
              {isUp ? '+' : ''}{variation.toFixed(2)}%
            </span>
          </div>

          {record.new_market > 0 && (
            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-gray-800">
              <span className="text-gray-500">Mercado (mediana Google)</span>
              <span className="text-purple-300 font-semibold">R$ {fmtBR(record.new_market)}</span>
            </div>
          )}

          {record.floor_applied && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-200 leading-relaxed">
                <span className="font-semibold">Piso de segurança</span> aplicado (custo × 1,3) para proteger a margem.
              </p>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}