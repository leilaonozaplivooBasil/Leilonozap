import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, Clock, Zap, Calendar } from 'lucide-react';

/**
 * Retorna um datetime-local string (YYYY-MM-DDTHH:mm) em horário de Brasília (America/Sao_Paulo)
 * somando `minutes` a partir de agora.
 */
function getBRTDateTimeFromNow(minutes) {
  const now = new Date(Date.now() + minutes * 60 * 1000);
  // Formata em America/Sao_Paulo
  const parts = new Intl.DateTimeFormat('fr-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Sao_Paulo'
  }).formatToParts(now);

  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  const h = parts.find(p => p.type === 'hour').value;
  const min = parts.find(p => p.type === 'minute').value;

  return `${y}-${m}-${d}T${h}:${min}`;
}

/**
 * Converte string datetime-local (Brasília) para ISO UTC.
 */
function brtToUTC(brtString) {
  if (!brtString) return null;
  const [datePart, timePart] = brtString.split('T');
  const [year, month, day] = datePart.split('-');
  const [hour, minute] = (timePart || '00:00').split(':');
  const brtDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00-03:00`);
  return brtDate.toISOString();
}

/**
 * Formata datetime-local (Brasília) para exibição amigável.
 */
function formatBRT(brtString) {
  if (!brtString) return '';
  const iso = brtToUTC(brtString);
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const QUICK_PRESETS = [
  { label: '+1h', minutes: 60, icon: Zap },
  { label: '+6h', minutes: 360, icon: Clock },
  { label: '+12h', minutes: 720, icon: Clock },
  { label: '+24h', minutes: 1440, icon: Clock },
  { label: '+3 dias', minutes: 4320, icon: Calendar },
  { label: '+7 dias', minutes: 10080, icon: Calendar },
];

export default function ReactivateAuction({ onReactivate, isReactivating, disabled }) {
  // Valor padrão: +24h a partir de agora
  const [reactivateTime, setReactivateTime] = useState(() => getBRTDateTimeFromNow(1440));
  const [selectedPreset, setSelectedPreset] = useState(1440);

  const displayTime = useMemo(() => formatBRT(reactivateTime), [reactivateTime]);

  const handlePreset = (minutes) => {
    setReactivateTime(getBRTDateTimeFromNow(minutes));
    setSelectedPreset(minutes);
  };

  const handleManualChange = (e) => {
    setReactivateTime(e.target.value);
    setSelectedPreset(null);
  };

  const handleReactivate = () => {
    if (!reactivateTime) {
      alert("⚠️ Por favor, defina uma nova data e hora para reativar o leilão.");
      return;
    }
    const utc = brtToUTC(reactivateTime);
    if (!utc) {
      alert("⚠️ Data e hora inválidas. Verifique o formato.");
      return;
    }
    if (new Date(utc).getTime() <= Date.now()) {
      alert("⚠️ A nova data de término deve ser no futuro.");
      return;
    }
    onReactivate(utc, reactivateTime);
  };

  return (
    <Card className="border-orange-500/50 bg-orange-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-400">
          <RefreshCw className="w-5 h-5 text-orange-500" />
          Reativar Leilão
        </CardTitle>
        <p className="text-sm text-slate-400">
          Este leilão já terminou. Escolha uma data rápida abaixo e clique em Reativar — o vencedor anterior será removido.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* BOTÕES DE TEMPO RÁPIDO */}
        <div>
          <Label className="text-slate-300 mb-2 block flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-400" />
            Reativação Rápida
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_PRESETS.map(preset => {
              const Icon = preset.icon;
              const isActive = selectedPreset === preset.minutes;
              return (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => handlePreset(preset.minutes)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-bold border transition-all
                    ${isActive
                      ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20'
                      : 'bg-[#0d1117] border-[#30363d] text-slate-300 hover:border-orange-500/50 hover:text-orange-400'}
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* INPUT MANUAL COM CALENDÁRIO */}
        <div>
          <Label htmlFor="reactivate_time" className="text-slate-300 mb-2 block flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-400" />
            Nova Data de Término (Brasília)
          </Label>
          <Input
            id="reactivate_time"
            type="datetime-local"
            value={reactivateTime}
            onChange={handleManualChange}
            className="bg-[#0d1117] border-[#30363d] text-white focus:border-orange-500/50 focus:ring-orange-500/20"
          />
          {displayTime && (
            <p className="text-xs text-slate-400 mt-2">
              📅 O leilão será encerrado em: <strong className="text-orange-400">{displayTime}</strong>
            </p>
          )}
        </div>

        {/* BOTÃO REATIVAR */}
        <Button
          className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3"
          onClick={handleReactivate}
          disabled={isReactivating || disabled}
        >
          {isReactivating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reativando...</>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" /> Reativar Agora</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}