import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap, Users, TrendingUp, Shield, Play, RefreshCw, Activity,
  ArrowUpCircle, ArrowDownCircle, AlertTriangle, CheckCircle2
} from 'lucide-react';

export default function PrecificaVivoPainel() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
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
    if (!confirm('⚠️ Executar o PrecificaVivo AGORA?\n\nIsso vai consumir créditos do SerpAPI se houver tráfego ≥ 10 sessões ativas.')) return;

    setIsRunning(true);
    setLastRunResult(null);
    try {
      const res = await base44.functions.invoke('precificaVivoControl', { action: 'run_now' });
      setLastRunResult(res?.data?.result || res?.data);
      alert('✅ Execução concluída! Veja o resultado no painel.');
      await loadData();
    } catch (err) {
      alert('❌ Erro: ' + err.message);
    } finally {
      setIsRunning(false);
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
              onClick={handleRunNow}
              disabled={isRunning}
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
                A ativação/pausa é feita no <strong>Dashboard Base44 → Automations → "⚡ PrecificaVivo Tick (5min)"</strong>.
                Use "Rodar Agora" para testar manualmente a qualquer momento.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            label="Sessões ativas"
            value={stats?.sessions_active ?? '—'}
            icon={Users}
            color="text-blue-400"
            border="border-blue-500/25"
            hint={stats?.sessions_active >= 10 ? 'Motor ativo' : 'Modo econômico'}
          />
          <MetricCard
            label="Updates 24h"
            value={stats?.updates_24h ?? 0}
            icon={TrendingUp}
            color="text-emerald-400"
            border="border-emerald-500/25"
            hint={`${stats?.auto_updates ?? 0} auto · ${stats?.manual_updates ?? 0} manual`}
          />
          <MetricCard
            label="Variação média"
            value={`${stats?.avg_variation_percent ?? 0}%`}
            icon={Activity}
            color="text-purple-400"
            border="border-purple-500/25"
            hint="Absoluta, últimas 24h"
          />
          <MetricCard
            label="Piso aplicado"
            value={stats?.floor_applied_24h ?? 0}
            icon={Shield}
            color="text-amber-400"
            border="border-amber-500/25"
            hint="custo × 1.3 > mercado"
          />
          <MetricCard
            label="Histórico total"
            value={history.length}
            icon={CheckCircle2}
            color="text-cyan-400"
            border="border-cyan-500/25"
            hint="Últimas 50 mudanças"
          />
        </div>

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
              <div className="divide-y divide-gray-800/60">
                {history.map((h) => (
                  <HistoryRow key={h.id} record={h} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ───── Sub-componentes ─────

function MetricCard({ label, value, icon: Icon, color, border, hint }) {
  return (
    <div className={`rounded-2xl border ${border} bg-gray-900 p-4`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {hint && <p className="text-[10px] text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

function HistoryRow({ record }) {
  const isUp = (record.variation_percent || 0) >= 0;
  const variationColor = isUp ? 'text-red-400' : 'text-emerald-400';
  const ArrowIcon = isUp ? ArrowUpCircle : ArrowDownCircle;

  const triggerLabels = {
    auto_traffic: { label: '⚡ Auto', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    manual_single: { label: '👆 Manual', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    manual_batch: { label: '📦 Lote', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    scheduled: { label: '⏰ Agendado', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
  };
  const trig = triggerLabels[record.trigger_type] || triggerLabels.auto_traffic;

  const createdAt = record.created_date ? new Date(record.created_date) : null;
  const timeStr = createdAt ? createdAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/40 transition-colors">
      <ArrowIcon className={`w-5 h-5 ${variationColor} flex-shrink-0`} />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 font-medium truncate">{record.product_description || '—'}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <Badge className={`text-[10px] ${trig.color} border font-normal`}>{trig.label}</Badge>
          {record.floor_applied && (
            <Badge className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-normal">
              <Shield className="w-2.5 h-2.5 mr-1" /> Piso
            </Badge>
          )}
          {record.sessions_active != null && (
            <span className="text-[10px] text-gray-600">
              <Users className="w-2.5 h-2.5 inline mr-0.5" />{record.sessions_active} online
            </span>
          )}
          <span className="text-[10px] text-gray-600">{timeStr}</span>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-xs text-gray-500">
          R$ {(record.old_price || 0).toFixed(2)} → <span className="text-white font-semibold">R$ {(record.new_price || 0).toFixed(2)}</span>
        </div>
        <div className={`text-xs font-bold ${variationColor}`}>
          {isUp ? '+' : ''}{(record.variation_percent || 0).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}