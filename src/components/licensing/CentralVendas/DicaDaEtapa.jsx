import React, { useEffect } from 'react';
import { Check } from 'lucide-react';
import { progressoDaEtapa, coresDaFase, fraseDoProgresso } from '@/lib/progressoDaEtapa';
import { som } from '@/lib/somDaInterface';

/**
 * DicaDaEtapa — o aviso embaixo do botão, agora como progresso.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * O QUE MUDOU, E POR QUÊ (18/09/2026)
 * ══════════════════════════════════════════════════════════════════════════
 * Era: `<p className="text-[11px] text-white/45">fale mais 9s — ou escreva</p>`
 *
 * Onze pixels a 45% de branco, sobre um degradê que muda de cor. O dono
 * circulou de vermelho no print: "estamos pecando em atenção do usuário nesses
 * textos especificamente".
 *
 * Agora é uma pílula com fundo próprio (legível sobre qualquer fundo), uma
 * BARRA que enche, o número que PULA quando muda, e a cor subindo de âmbar pra
 * lima conforme chega perto. Quando libera, vira verde, aparece o ✓ e toca a
 * mesma notinha de avançar etapa.
 *
 * ── a barra é a parte que importa ──
 * Quem gravou 61 de 70 segundos andou 87% do caminho. A tela antiga escolhia
 * contar os 13% que faltavam. O que faz alguém falar mais nove segundos é ver
 * a barra quase cheia — não ler uma cobrança.
 *
 * ── três coisas que o desenho tem de respeitar ──
 * 🔇 O som passa por `som()`, que já obedece o botão de silêncio do ritual.
 * 🎞️ `prefers-reduced-motion` desliga pulso e salto — quem pediu menos
 *    movimento tem motivo (enjoo, vertigem), e a pílula continua legível sem
 *    animação nenhuma: a cor e a barra não dependem de movimento.
 * 🔁 A notinha toca UMA vez por liberação, e quem garante isso é o `[pronto]`
 *    do efeito: ele só roda quando esse valor VIRA. Uma versão anterior tinha
 *    também um `useRef` de trava — a mutação mostrou que era enfeite: apagar o
 *    ref não fazia teste nenhum cair, porque o array de dependências já
 *    resolvia. Saiu, e o teste passou a provar o mecanismo de verdade.
 */
export default function DicaDaEtapa({ feito, meta, unidade = 's', complemento = '', teste = 'dica-da-etapa' }) {
  const { pct, fase, pronto } = progressoDaEtapa({ feito, meta });
  const cor = coresDaFase(fase);
  const frase = fraseDoProgresso({ feito, meta, unidade });

  // `[pronto]`: o efeito só roda quando a etapa LIBERA (ou volta a faltar).
  // Re-render com o mesmo valor não toca nada.
  useEffect(() => {
    if (pronto) som('passo');
  }, [pronto]);

  return (
    <div
      data-teste={teste}
      data-fase={fase}
      className={`xeos-cru w-full rounded-2xl ${cor.fundo} ring-1 ${cor.aro} px-3 py-2 ${pronto ? 'dica-liberou' : ''}`}
    >
      <div className="flex items-center gap-2">
        {pronto
          ? <Check className={`w-4 h-4 shrink-0 ${cor.texto}`} strokeWidth={3} />
          : <span className={`dica-pulso w-2 h-2 shrink-0 rounded-full ${cor.barra}`} />}
        {/* 🔑 `key` na frase: trocar a chave remonta o elemento, e é isso que
            faz a animação de salto rodar DE NOVO a cada número novo. Sem ela o
            React reaproveita o nó, a animação não reinicia e o número muda sem
            ninguém perceber — que é o defeito de hoje. */}
        <span key={frase} className={`dica-salto text-[13px] font-extrabold tabular-nums ${cor.texto}`}>
          {frase}
        </span>
      </div>

      {!pronto && (
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-black/25 overflow-hidden">
          <div
            data-teste="dica-barra"
            className={`h-full rounded-full ${cor.barra} transition-[width] duration-500 ease-out`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {complemento && <p className="mt-1 text-[11px] text-white/70">{complemento}</p>}

      <style>{`
        @keyframes dicaSalto {
          0%   { transform: translateY(4px) scale(0.92); opacity: 0; }
          60%  { transform: translateY(-2px) scale(1.06); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes dicaPulso {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50%      { transform: scale(1.5); opacity: 1; }
        }
        @keyframes dicaLiberou {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        .dica-salto  { display: inline-block; animation: dicaSalto 320ms cubic-bezier(.2,.9,.3,1.3); }
        .dica-pulso  { animation: dicaPulso 1.6s ease-in-out infinite; }
        .dica-liberou{ animation: dicaLiberou 420ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .dica-salto, .dica-pulso, .dica-liberou { animation: none; }
        }
      `}</style>
    </div>
  );
}
