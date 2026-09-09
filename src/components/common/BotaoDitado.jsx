import React from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { textoDoCronometro, segundosRestantes } from '@/lib/ditado';

// 🎙️ BOTÃO DE DITADO — o mesmo microfone em qualquer tela.
//
// Some sozinho quando a transcrição não está ligada (`ditado.disponivel`):
// botão que existe e falha é pior que botão que não existe — foi a lição do
// `transcribeAudio`, que tinha tela chamando rota inexistente.
//
// TEMA: o X-GAME é escuro e o CRM é claro. Em vez de adivinhar, o componente
// não pinta nada por conta própria — quem usa passa `className`. O padrão é
// neutro o bastante pra funcionar nos dois sem ficar feio em nenhum.

export default function BotaoDitado({
  ditado,
  className = '',
  rotulo = 'Falar',
  rotuloGravando = 'Parar',
  compacto = false,
}) {
  if (!ditado?.disponivel) return null;

  const { gravando, transcrevendo, segundos, tetoSeg, alternar } = ditado;
  const ocupado = transcrevendo;
  const faltando = segundosRestantes(segundos, tetoSeg);
  // Os últimos 15 segundos ficam em destaque: gravação cortada no meio da
  // frase, sem aviso, faz a pessoa achar que o microfone falhou.
  const acabando = gravando && faltando <= 15;

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={ocupado}
      aria-label={gravando ? 'parar a gravação' : 'ditar em vez de digitar'}
      aria-pressed={gravando}
      title={gravando ? 'Toque para parar' : 'Toque e fale — vira texto no campo'}
      data-teste="botao-ditado"
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
        gravando ? 'bg-red-600 text-white hover:bg-red-700' : ''
      } ${className}`}
    >
      {ocupado ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {!compacto && <span>Entendendo...</span>}
        </>
      ) : gravando ? (
        <>
          <Square className="w-4 h-4 fill-current" />
          <span className={acabando ? 'animate-pulse' : ''}>
            {compacto ? textoDoCronometro(segundos) : `${rotuloGravando} · ${textoDoCronometro(segundos)}`}
          </span>
        </>
      ) : (
        <>
          <Mic className="w-4 h-4" />
          {!compacto && <span>{rotulo}</span>}
        </>
      )}
    </button>
  );
}
