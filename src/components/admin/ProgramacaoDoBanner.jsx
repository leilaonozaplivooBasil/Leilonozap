import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarClock } from 'lucide-react';
import { deISOBrasilia, paraISOBrasilia, situacaoDoBanner, validarJanela } from '@/lib/janelaDoBanner';

// 🕛 Programação de datas de UM banner (08/10/2026): "entra em / sai em", no
// horário de Brasília. Regras em src/lib/janelaDoBanner.js.

const COR_DO_ESTADO = {
  no_ar: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  no_ar_com_fim: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  agendado: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  encerrado: 'text-gray-400 border-white/15 bg-white/5',
  desligado: 'text-gray-400 border-white/15 bg-white/5',
};

const CAMPO = 'h-8 rounded-md border border-white/10 bg-gray-800 px-2 text-xs text-gray-200 [color-scheme:dark] disabled:opacity-50';

export const AVISO_SEM_COLUNAS = 'Datas indisponíveis: falta aplicar a atualização do banco. Não programe banners ainda — eles entrariam no ar na hora.';

/** Etiqueta do que o banner faz agora (ou no instante simulado). */
export function EtiquetaDoBanner({ banner, agoraMs }) {
  const s = situacaoDoBanner(banner, agoraMs);
  return (
    <span data-estado={s.estado} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${COR_DO_ESTADO[s.estado]}`}>
      {s.texto}
    </span>
  );
}

/** Linha do banner: etiqueta + botão que abre os dois campos de data. */
export default function ProgramacaoDoBanner({ banner, agoraMs, suporta = true, onSalvar }) {
  const [aberto, setAberto] = useState(false);
  const [inicio, setInicio] = useState(() => deISOBrasilia(banner?.starts_at));
  const [fim, setFim] = useState(() => deISOBrasilia(banner?.ends_at));
  const [erro, setErro] = useState('');

  const salvar = async (ini, fi) => {
    const a = paraISOBrasilia(ini);
    const b = paraISOBrasilia(fi);
    const problema = validarJanela(a, b);
    if (problema) { setErro(problema); return; }
    setErro('');
    await onSalvar({ starts_at: a, ends_at: b });
    setAberto(false);
  };

  const temJanela = !!(banner?.starts_at || banner?.ends_at);

  return (
    <div data-teste="programacao-do-banner" className="px-2.5 pb-2.5 pt-1 bg-gray-900/60">
      <div className="flex flex-wrap items-center gap-2">
        <EtiquetaDoBanner banner={banner} agoraMs={agoraMs} />
        {suporta && (
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            data-teste="abrir-programacao"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-300 hover:text-white"
          >
            <CalendarClock className="w-3.5 h-3.5" /> {temJanela ? 'Editar datas' : 'Programar'}
          </button>
        )}
      </div>
      {!suporta && <p className="mt-1 text-[11px] text-amber-300/90">{AVISO_SEM_COLUNAS}</p>}
      {suporta && aberto && (
        <div className="mt-2 rounded-lg border border-white/10 bg-gray-800/60 p-2.5">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[11px] text-gray-400">
              Entra no ar em
              <input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} data-campo="inicio" className={`${CAMPO} mt-1 w-full`} />
            </label>
            <label className="text-[11px] text-gray-400">
              Sai do ar em
              <input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} data-campo="fim" className={`${CAMPO} mt-1 w-full`} />
            </label>
          </div>
          <p className="mt-1.5 text-[10px] text-gray-500">Horário de Brasília. Deixe em branco o lado que não precisa. À meia-noite em que uma arte sai, a próxima já entra.</p>
          {erro && <p role="alert" className="mt-1 text-[11px] font-semibold text-amber-300">{erro}</p>}
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => salvar(inicio, fim)} data-teste="salvar-programacao" className="h-7 bg-emerald-600 hover:bg-emerald-700 text-xs">Salvar datas</Button>
            {temJanela && (
              <Button size="sm" variant="outline" onClick={() => { setInicio(''); setFim(''); salvar('', ''); }} data-teste="limpar-programacao" className="h-7 border-white/15 text-gray-300 hover:text-white text-xs">
                Tirar as datas
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** "O próximo banner que eu subir já entra programado" — por fileira. */
export function ProgramacaoDoProximo({ valor, onChange, suporta = true }) {
  const v = valor || { inicio: '', fim: '' };
  if (!suporta) return <p className="text-[11px] text-amber-300/90 mb-3">{AVISO_SEM_COLUNAS}</p>;
  return (
    <div data-teste="programacao-do-proximo" className="mb-3 rounded-lg border border-white/10 bg-gray-800/40 p-2.5">
      <p className="text-[11px] font-semibold text-gray-300">O próximo banner que você subir já entra programado (opcional, horário de Brasília)</p>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
        <label className="text-[11px] text-gray-400">
          Entra no ar em
          <input type="datetime-local" value={v.inicio} onChange={(e) => onChange({ ...v, inicio: e.target.value })} data-campo="proximo-inicio" className={`${CAMPO} mt-1 w-full`} />
        </label>
        <label className="text-[11px] text-gray-400">
          Sai do ar em
          <input type="datetime-local" value={v.fim} onChange={(e) => onChange({ ...v, fim: e.target.value })} data-campo="proximo-fim" className={`${CAMPO} mt-1 w-full`} />
        </label>
      </div>
    </div>
  );
}
