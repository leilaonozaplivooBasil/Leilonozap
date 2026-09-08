import React from 'react';
import { X, Clock3, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { conflitosDeHorario, saidaDoConflito, faixaDeHorario, emMinutos } from '@/lib/quadroCompromisso';

/**
 * 🔮 A PRÉVIA DA JORNADA (DIR-91). Pedido do dono: "antes do usuario colocar
 * algo em sua jornada, deve aparecer um popup com prévia de como vai ficar
 * a jornada dele. Para evitar sobreposições, conflitos e etc."
 *
 * Mostra o dia inteiro com a peça nova JÁ DENTRO, no lugar cronológico dela —
 * a pessoa vê a sobreposição de olho, antes de confirmar, em vez de descobrir
 * depois que duas coisas caem no mesmo horário. Reaproveita a régua que já
 * existe pra isso (`conflitosDeHorario`/`saidaDoConflito`, lib/quadroCompromisso)
 * — mesma verdade usada no editor de hora do card do quadro.
 *
 * Pura vitrine de decisão: NÃO grava nada sozinha. Quem chama decide o que
 * fazer em `onConfirmar` (a pessoa aceitou, mesmo com choque ou não) e
 * `onUsarLivre` (a pessoa aceitou o horário livre sugerido — quem chama só
 * precisa atualizar a hora que está editando; a prévia recalcula sozinha).
 *
 * @param {Array} itens - as tarefas do dia (mesmo formato de metodo_tarefas:
 *   {id, titulo, hora, hora_fim, feito}).
 * @param {{titulo, hora, hora_fim, ignorarId}} novo - a peça sendo colocada.
 *   `ignorarId` é o id dela mesma quando já existe (editar um horário não
 *   pode "bater" com ela própria).
 */
export default function PreviaJornadaModal({ itens = [], novo, onConfirmar, onAjustar, onUsarLivre, onFechar }) {
  const { titulo, hora, hora_fim = null, ignorarId = null } = novo || {};
  const conflitos = conflitosDeHorario(itens, { hora, hora_fim, ignorarId });
  const livre = conflitos.length > 0 ? saidaDoConflito(itens, { hora, hora_fim, ignorarId }) : null;

  // a agenda do dia, com a peça nova inserida na posição cronológica dela
  const doDia = (Array.isArray(itens) ? itens : []).filter((t) => t && t.id !== ignorarId && !t.feito);
  const linha = doDia
    .filter((t) => emMinutos(t.hora) !== null)
    .map((t) => ({ ...t, ehNovo: false, emConflito: conflitos.some((c) => c.id === t.id) }));
  const semHorario = doDia.filter((t) => emMinutos(t.hora) === null);
  const peca = { id: '__novo__', titulo, hora, hora_fim, ehNovo: true, emConflito: conflitos.length > 0 };
  const agenda = [...linha, peca].sort((a, b) => (emMinutos(a.hora) ?? 0) - (emMinutos(b.hora) ?? 0));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,2,12,0.72)' }} onClick={onFechar} data-teste="previa-jornada">
      <div className="w-full max-w-md rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
        style={{ background: '#14151F', border: '1px solid rgba(255,255,255,0.12)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-start gap-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Clock3 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#7AB2FF' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-extrabold" style={{ color: '#F4F4F4' }}>Prévia da sua Jornada</p>
            <p className="text-[12px] truncate" style={{ color: '#A7A4B4' }}>é assim que o dia fica com "{titulo}" às {hora}</p>
          </div>
          <button type="button" onClick={onFechar} data-teste="previa-fechar" className="text-white/50 hover:text-white shrink-0"><X className="w-5 h-5" /></button>
        </div>

        {conflitos.length > 0 ? (
          <div className="mx-5 mt-4 rounded-lg p-3 flex items-start gap-2" style={{ background: 'rgba(255,160,0,0.16)' }} data-teste="previa-aviso">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#FFC46B' }} />
            <div className="flex-1 text-[12px]" style={{ color: '#FFC46B' }}>
              <p className="font-bold">bate com {conflitos.length === 1 ? `"${conflitos[0].titulo}"` : `${conflitos.length} compromissos`}</p>
              {livre && (
                <button type="button" onClick={() => onUsarLivre?.(livre)} data-teste="previa-usar-livre" className="mt-1 font-bold hover:underline">
                  usar {livre} — sem choque
                </button>
              )}
            </div>
          </div>
        ) : hora ? (
          <div className="mx-5 mt-4 rounded-lg p-3 flex items-center gap-2 text-[12px] font-bold" style={{ background: 'rgba(53,208,127,0.14)', color: '#7CE0A8' }} data-teste="previa-livre">
            <CheckCircle2 className="w-4 h-4" /> livre — não bate com nada do seu dia
          </div>
        ) : null}

        <div className="px-5 py-4 space-y-1.5 overflow-y-auto">
          {agenda.map((item) => (
            <div key={item.id}
              data-teste={item.ehNovo ? 'previa-item-novo' : 'previa-item'}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px]"
              style={item.ehNovo
                ? { background: 'rgba(122,178,255,0.14)', border: '1px solid rgba(122,178,255,0.5)' }
                : item.emConflito ? { background: 'rgba(255,160,0,0.10)' } : { background: 'rgba(255,255,255,0.04)' }}>
              <span className="font-bold tabular-nums w-12 shrink-0" style={{ color: item.ehNovo ? '#7AB2FF' : '#A7A4B4' }}>{item.hora}</span>
              <span className="flex-1 min-w-0 truncate" style={{ color: item.ehNovo ? '#F4F4F4' : '#D7D9E0', fontWeight: item.ehNovo ? 700 : 500 }}>{item.titulo || faixaDeHorario(item)}</span>
              {item.ehNovo && <span className="text-[10px] font-extrabold uppercase tracking-wide shrink-0" style={{ color: '#7AB2FF' }}>novo</span>}
              {!item.ehNovo && item.emConflito && <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: '#FFC46B' }} />}
            </div>
          ))}
          {semHorario.length > 0 && (
            <p className="pt-2 text-[11px]" style={{ color: '#8993A4' }} data-teste="previa-sem-horario">
              + {semHorario.length} sem horário, fora da linha do tempo
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <button type="button" onClick={onAjustar} data-teste="previa-ajustar" className="text-[13px] font-bold hover:underline" style={{ color: '#A7A4B4' }}>
            ajustar horário
          </button>
          <button type="button" onClick={onConfirmar} data-teste="previa-confirmar"
            className="ml-auto rounded-lg px-4 h-10 font-bold text-white text-[13px]"
            style={{ background: conflitos.length > 0 ? '#C4470F' : '#1B7A48' }}>
            {conflitos.length > 0 ? 'confirmar mesmo assim' : `confirmar ${hora}`}
          </button>
        </div>
      </div>
    </div>
  );
}
