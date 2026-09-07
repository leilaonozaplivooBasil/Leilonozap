import React from 'react';
import { Plus, Clock3, LayoutGrid, CalendarPlus, Route } from 'lucide-react';
import { fraseVaiEntrar } from '@/lib/destinos';

// 🔗 A ENTRADA COM DESTINOS — a linha de "adicionar" que fala pra onde vai
// (dono, 06/09/2026): "toda alimentação na lista ou no quadro dá a opção de
// colocar na Jornada; se eu botar na lista, dá a opção de botar na Jornada e
// no quadro; se eu botar no quadro, dá a opção de botar na lista e na
// Jornada — com uma comunicação mais clara."
//
// A mesma peça nos dois lugares. Só muda a ORIGEM:
//   • origem 'lista'  → o dia é certo; oferece a hora (= a Jornada) e o quadro;
//   • origem 'quadro' → o quadro é certo; oferece o dia e a hora (= a Jornada).
// Enquanto a pessoa escreve, a frase embaixo diz exatamente pra onde vai
// entrar (lib/destinos.js). Nada de adivinhar o que "horário" ou "no dia" quer dizer.

const campoClaro = 'rounded-lg border px-2 text-[13px] outline-none';
const estiloCampo = { background: '#FFFFFF', color: '#172B4D', borderColor: '#DFE1E6', height: 36 };

export default function EntradaComDestinos({ origem = 'lista', valor, onChange, onCriar, listas = [], listaNome = null, salvando = false, placeholder, testeCampo = 'campo-nova-entrada', altura = 44 }) {
  const v = valor || {};
  const muda = (parte) => onChange({ ...v, ...parte });
  const escrevendo = !!String(v.titulo || '').trim();
  const nomeDaLista = origem === 'quadro' ? listaNome : (listas.find((l) => l.id === v.listaId)?.nome || listas[0]?.nome || null);
  const frase = fraseVaiEntrar({ origem, hora: v.hora, noDia: !!v.noDia, noQuadro: !!v.noQuadro, listaNome: nomeDaLista });
  const pronto = escrevendo && !salvando;

  return (
    <div className="space-y-2" data-teste={`entrada-${origem}`} data-escrevendo={escrevendo ? 'sim' : 'nao'}>
      <div className="flex items-center gap-2">
        <input
          value={v.titulo || ''}
          onChange={(e) => muda({ titulo: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter' && pronto) onCriar(); }}
          placeholder={placeholder || (origem === 'quadro' ? 'escreva o tópico' : 'nova tarefa do dia…')}
          data-teste={testeCampo}
          className="flex-1 min-w-0 rounded-xl px-3.5 text-[15px] outline-none placeholder:text-[#B3BAC5]"
          style={{ background: '#FFFFFF', color: '#172B4D', height: altura, boxShadow: '0 1px 3px rgba(9,30,66,0.28)' }}
        />
        <button type="button" onClick={onCriar} disabled={!pronto} data-teste={`${testeCampo}-criar`}
          className="shrink-0 rounded-xl text-white grid place-items-center disabled:opacity-40"
          style={{ background: '#1B7A48', height: altura, width: altura }} title={frase.texto}>
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {escrevendo && (
        <div className="rounded-xl p-2.5 space-y-2" style={{ background: 'rgba(255,255,255,0.92)', color: '#172B4D' }} data-teste="destinos">
          <div className="flex items-center gap-2 flex-wrap text-[12.5px] font-semibold">
            {origem === 'quadro' && (
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={!!v.noDia} onChange={(e) => muda({ noDia: e.target.checked })} data-teste="destino-dia" className="accent-[#1B7A48]" />
                <CalendarPlus className="w-3.5 h-3.5" style={{ color: '#5E6C84' }} /> também no meu dia (hoje)
              </label>
            )}
            {(origem === 'lista' || v.noDia) && (
              <label className="inline-flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5" style={{ color: '#5E6C84' }} /> na Jornada às
                <input type="time" value={v.hora || ''} onChange={(e) => muda({ hora: e.target.value })} data-teste="destino-hora" className={campoClaro} style={estiloCampo} />
                {!v.hora && <span className="text-[11px] font-normal" style={{ color: '#8993A4' }}>(sem hora = fora da Jornada)</span>}
              </label>
            )}
            {origem === 'lista' && (
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={!!v.noQuadro} onChange={(e) => muda({ noQuadro: e.target.checked })} data-teste="destino-quadro" className="accent-[#1B7A48]" />
                <LayoutGrid className="w-3.5 h-3.5" style={{ color: '#5E6C84' }} /> também no quadro
                {v.noQuadro && listas.length > 0 && (
                  <select value={v.listaId || listas[0]?.id || ''} onChange={(e) => muda({ listaId: e.target.value })} data-teste="destino-lista" className={campoClaro} style={estiloCampo}>
                    {listas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                )}
                {v.noQuadro && listas.length === 0 && <span className="text-[11px] font-normal" style={{ color: '#8993A4' }}>(na sua primeira lista)</span>}
              </label>
            )}
          </div>
          <p className="text-[12px] flex items-center gap-1.5 flex-wrap" data-teste="frase-destinos">
            <Clock3 className="w-3.5 h-3.5" style={{ color: '#0B5FFF' }} />
            <span className="font-bold" style={{ color: '#0B5FFF' }}>{frase.texto}</span>
            {frase.aviso && <span style={{ color: '#8993A4' }}>· {frase.aviso}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
