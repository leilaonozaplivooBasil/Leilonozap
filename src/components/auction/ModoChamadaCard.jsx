// 📣 PONTO 69 — bloco do Modo Chamada na tela de edição do leilão.
// Só UI: liga/desliga o pré-lançamento e escolhe a data/hora de abertura dos lances.
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Megaphone, CalendarClock } from 'lucide-react';

const LABEL_CLS = 'text-[10px] uppercase tracking-widest text-slate-500 font-bold';
const INPUT_CLS = 'bg-[#0d1117]/80 border-white/10 text-white h-11 rounded-xl focus:border-sky-500/60 focus-visible:ring-1 focus-visible:ring-sky-500/30 transition-colors';

export default function ModoChamadaCard({ ativo, dataAbertura, onToggle, onChangeData, onAbrirSeletor, rotuloData }) {
  return (
    <div className="rounded-xl bg-sky-500/[0.04] border border-sky-500/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`${LABEL_CLS} flex items-center gap-1.5 text-sky-400`}>
            <Megaphone className="w-3.5 h-3.5" /> Modo Chamada (Pré-Lançamento)
          </p>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Exibe o leilão na vitrine e bloqueia os lances até a data de abertura.
          </p>
        </div>
        <Switch checked={ativo} onCheckedChange={onToggle} className="mt-0.5 shrink-0" />
      </div>

      {ativo && (
        <div className="mt-4">
          <Label htmlFor="data_abertura_lances" className={`${LABEL_CLS} flex items-center gap-1.5 mb-2`}>
            <CalendarClock className="w-3.5 h-3.5 text-sky-400" /> Data e hora de abertura dos lances (Brasília)
          </Label>
          <Input
            id="data_abertura_lances"
            type="datetime-local"
            value={dataAbertura}
            onChange={(e) => onChangeData(e.target.value)}
            onClick={onAbrirSeletor}
            onFocus={onAbrirSeletor}
            className={`cursor-pointer ${INPUT_CLS}`}
          />
          {rotuloData && (
            <p className="text-xs font-bold text-sky-300 mt-2">Abre em: {rotuloData}</p>
          )}
          <p className="text-[10px] text-slate-500 mt-2">
            Até esse horário o card mostra a contagem e o botão fica como “Aguardando abertura”. Na hora marcada os lances liberam sozinhos.
          </p>
        </div>
      )}
    </div>
  );
}