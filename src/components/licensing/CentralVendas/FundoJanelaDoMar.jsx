import React from 'react';
// 🧮 a conta do nascer do sol mora FORA da tela, pra poder ser testada em node
import { HORIZONTE, SOL_X, cenaDaLuz } from '@/lib/janelaDoMar';

// 🌊 A JANELA PRO MAR — o fundo do Ritual do Amanhecer (22/09/2026)
//
// ═══════════════════════════════════════════════════════════════════════════
// ORDEM DO DONO
// ═══════════════════════════════════════════════════════════════════════════
// "Quero melhorar a X-Game, deixar as cores com menos cara de aplicativo feito
// por IA e cores mais bonitas. Se possível, imagens de praia no fundo, como se
// fosse uma janela em frente ao mar... quero que ela sinta que está no mar
// nessa lâmina."
//
// 🔴 O QUE SAIU: `bg-gradient-to-b from-[#141432] via-[#5b2a5e] to-[#f59e5b]`.
// Roxo-escuro para laranja, em degradê chapado, é literalmente a assinatura
// visual de app gerado por IA — era a primeira coisa que denunciava a tela, e
// nenhuma outra mudança de tipografia ia consertar isso enquanto ele estivesse
// lá atrás.
//
// 🟢 O QUE ENTRA: uma cena de amanhecer no mar, vista de DENTRO DE CASA, por
// uma janela. Três camadas, nesta ordem:
//   1. A VISTA — céu da hora azul virando dourado, o sol na linha do horizonte,
//      o mar com o caminho de luz e o brilho da água.
//   2. A JANELA — a parede do cômodo em volta, a esquadria, o peitoril embaixo
//      e o reflexo do vidro.
//   3. O CÔMODO — a sombra funda nas bordas, que é o que diz "você está DENTRO
//      olhando pra FORA", e não "isto é um papel de parede".
//
// ⚠️ POR QUE CSS E NÃO UMA FOTO: às 4h40 da manhã, no 4G do celular, uma foto
// de 250KB é meio segundo de tela vazia no momento exato em que a pessoa
// precisa ser puxada pra dentro do ritual — e é o momento mais frágil do dia
// dela. Isto aqui pinta em zero byte, nunca falha, e fica nítido em qualquer
// tamanho de tela. Trocar por foto depois é UMA linha: um <img> por cima da
// camada 1 (a vista), com todo o resto — janela, vidro, peitoril, sombra —
// continuando por cima, funcionando igual.
//
// `luz` (0 a 1) é o quanto o dia já nasceu. A tela ABRE na hora azul e vai
// esquentando a cada bloco entregue: quem termina o ritual vê o sol alto. É o
// mesmo movimento que a pessoa está fazendo na vida dela naquela meia hora.

/**
 * O fundo inteiro do ritual. Não recebe clique (`pointer-events-none`) e não
 * guarda estado: é pintura pura, o conteúdo vive por cima.
 */
export default function FundoJanelaDoMar({ luz = 0 }) {
  const { solY, solForca, noite } = cenaDaLuz(luz);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" data-teste="fundo-janela-do-mar" aria-hidden="true">
      {/* ── 1. A VISTA ────────────────────────────────────────────────────
          O céu: noite alta em cima, hora azul no meio, a faixa quente
          colando no horizonte. Os tons são de amanhecer de verdade — nada
          de roxo. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg,
            rgba(5,14,26,${noite}) 0%,
            #0A2039 11%,
            #123F5A 24%,
            #1B5D77 32%,
            #37798E 37%,
            #6E8492 39.5%,
            #7E7C7C ${HORIZONTE - 0.8}%,
            #8F7F73 ${HORIZONTE}%,
            #6E7076 ${HORIZONTE + 0.4}%,
            #2F6577 ${HORIZONTE + 2}%,
            #175267 ${HORIZONTE + 10}%,
            #0E3A4E ${HORIZONTE + 28}%,
            #082334 100%)`,
        }}
      />

      {/* o halo do sol — a luz que abre o céu inteiro em volta dele */}
      <div
        className="absolute inset-0 jm-respira"
        style={{
          background: `radial-gradient(circle at ${SOL_X}% ${solY}%,
            rgba(255,226,178,${0.50 * solForca}) 0%,
            rgba(255,198,132,${0.34 * solForca}) 9%,
            rgba(255,176,105,${0.22 * solForca}) 18%,
            rgba(255,150,80,${0.09 * solForca}) 30%,
            transparent 48%)`,
        }}
      />

      {/* o DISCO do sol: sem ele a tela tinha um brilho difuso, mas não tinha
          sol nenhum — e "nascer do sol" sem sol não emociona ninguém */}
      <div
        className="absolute jm-respira"
        style={{
          left: `${SOL_X}%`,
          top: `${solY}%`,
          width: '7.5vmin',
          height: '7.5vmin',
          transform: 'translate(-50%, -50%)',
          borderRadius: '9999px',
          background: `radial-gradient(circle,
            rgba(255,250,236,${0.98 * solForca}) 0%,
            rgba(255,228,176,${0.92 * solForca}) 42%,
            rgba(255,196,124,${0.55 * solForca}) 68%,
            rgba(255,176,104,0) 100%)`,
          filter: 'blur(1.5px)',
        }}
      />

      {/* a bruma que deita em cima da água — é ela que dá distância */}
      <div
        className="absolute inset-x-0"
        style={{
          top: `${HORIZONTE - 3.5}%`,
          height: '8%',
          background: `linear-gradient(180deg, transparent, rgba(255,206,152,${0.62 * solForca}) 52%, transparent)`,
          // 🔴 a faixa do horizonte ia acesa de ponta a ponta e lia como uma
          // RÉGUA fluorescente atravessando a tela. A luz tem que morrer
          // conforme se afasta do sol — por isso a máscara sai dele.
          maskImage: `radial-gradient(ellipse 52% 100% at ${SOL_X}% 50%, #000 0%, rgba(0,0,0,.45) 45%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(ellipse 52% 100% at ${SOL_X}% 50%, #000 0%, rgba(0,0,0,.45) 45%, transparent 100%)`,
          filter: 'blur(9px)',
        }}
      />

      {/* 🌟 O CAMINHO DE LUZ — o detalhe que faz o mar ser mar.
          Ele ABRE conforme desce: estreito no sol, largo perto de quem olha.
          É isso que dá perspectiva; um retângulo reto lia como um holofote. */}
      <div
        className="absolute jm-caminho"
        style={{
          top: `${HORIZONTE}%`,
          bottom: 0,
          left: 0,
          right: 0,
          // 🔴 ISTO JÁ FOI UM TRIÂNGULO (clip-path) e virava um CONE DE
          // HOLOFOTE de teatro na tela: as duas retas diagonais apareciam
          // por mais borrão que levasse. Elipse não tem borda pra aparecer —
          // e é assim que a luz cai na água de verdade: forte junto do sol,
          // se desmanchando conforme chega perto de quem olha.
          background: `radial-gradient(ellipse 14% 60% at ${SOL_X}% 0%,
            rgba(255,226,170,${0.58 * solForca}) 0%,
            rgba(255,200,135,${0.28 * solForca}) 28%,
            rgba(255,184,115,${0.12 * solForca}) 55%,
            transparent 80%)`,
          filter: 'blur(12px)',
        }}
      />

      {/* o brilho quebrado da superfície. Duas camadas: linhas juntinhas
          perto do horizonte (longe) e mais abertas embaixo (perto) — com uma
          só, a água virava listra de televisão sem sinal. */}
      <div
        className="absolute inset-x-0 jm-ondas"
        style={{
          top: `${HORIZONTE}%`,
          height: '16%',
          backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,240,215,.10) 0px, rgba(255,240,215,.10) 1px, transparent 1px, transparent 5px)',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,.9) 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,.9) 0%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 jm-ondas-perto"
        style={{
          top: `${HORIZONTE + 12}%`,
          bottom: 0,
          backgroundImage: 'repeating-linear-gradient(180deg, rgba(210,235,245,.055) 0px, rgba(210,235,245,.055) 2px, transparent 2px, transparent 14px)',
          maskImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,.85) 40%, rgba(0,0,0,.5) 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,.85) 40%, rgba(0,0,0,.5) 100%)',
        }}
      />

      {/* ── 2. A JANELA ───────────────────────────────────────────────────
          O truque da parede: este retângulo é o VÃO da janela, e a sombra
          que ele joga pra fora (0 0 0 100vmax) pinta a parede do cômodo em
          volta. Uma caixa só, sem imagem nenhuma. */}
      <div
        className="absolute rounded-[2rem]"
        style={{
          inset: '3vmin',
          boxShadow: `0 0 0 100vmax #060D17,
                      0 0 0 1px rgba(255,226,190,.14),
                      inset 0 0 70px 6px rgba(3,8,16,.45),
                      inset 0 1px 0 0 rgba(255,232,200,.20)`,
        }}
      />

      {/* o CHANFRO da esquadria: luz batendo em cima e à esquerda, sombra
          embaixo e à direita — é o que faz a moldura ter espessura, em vez
          de ser uma borda desenhada */}
      <div
        className="absolute rounded-[2rem] pointer-events-none"
        style={{
          inset: '3vmin',
          boxShadow: `inset 2px 2px 3px -1px rgba(255,236,208,.22),
                      inset -2px -3px 4px -1px rgba(0,0,0,.55)`,
        }}
      />

      {/* o peitoril: a pedra em que a pessoa apoiaria a mão */}
      <div
        className="absolute rounded-b-[2rem]"
        style={{
          left: '3vmin',
          right: '3vmin',
          bottom: '3vmin',
          height: '4.2vmin',
          background: 'linear-gradient(180deg, rgba(255,232,200,.26) 0%, rgba(120,96,74,.42) 18%, rgba(9,16,26,.92) 75%)',
          borderTop: '1px solid rgba(255,232,200,.32)',
        }}
      />

      {/* o vidro: um reflexo diagonal de leve, só pra existir um vidro ali */}
      <div
        className="absolute rounded-[2rem]"
        style={{
          inset: '3vmin',
          background: 'linear-gradient(115deg, rgba(255,255,255,.075) 0%, rgba(255,255,255,.028) 15%, transparent 32%)',
        }}
      />

      {/* ── 3. O CÔMODO ───────────────────────────────────────────────────
          A sombra de quem está dentro: escurece o pé da tela pro texto ter
          onde pisar, sem tapar a vista. */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(125% 80% at 50% 30%, transparent 46%, rgba(4,10,18,.52) 100%)' }}
      />

      {/* 🔤 O VÉU DO TEXTO. A vista é bonita no meio da tela — que é
          exatamente onde moram o título, o contrato e o botão. Sem este véu,
          o subtítulo caía em cima da faixa clara do horizonte e sumia. Ele
          escurece SÓ o miolo, de leve, e deixa as bordas com a vista inteira:
          o texto ganha chão sem a janela virar tela cinza. */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 52% 46% at 50% 52%, rgba(4,11,20,.50) 0%, rgba(4,11,20,.30) 55%, transparent 78%)' }}
      />

      <style>{`
        @keyframes jmOndas { from { background-position-y: 0px } to { background-position-y: 5px } }
        @keyframes jmOndasPerto { from { background-position-y: 0px } to { background-position-y: 14px } }
        @keyframes jmRespira { 0%,100% { opacity: .94 } 50% { opacity: 1 } }
        @keyframes jmCaminho { 0%,100% { transform: scaleX(1) } 50% { transform: scaleX(1.09) } }
        .jm-ondas       { animation: jmOndas 6s linear infinite; }
        .jm-ondas-perto { animation: jmOndasPerto 9s linear infinite; }
        .jm-respira     { animation: jmRespira 9s ease-in-out infinite; }
        .jm-caminho     { animation: jmCaminho 11s ease-in-out infinite; transform-origin: 50% 0; }
        @media (prefers-reduced-motion: reduce) {
          .jm-ondas, .jm-ondas-perto, .jm-respira, .jm-caminho { animation: none; }
        }
      `}</style>
    </div>
  );
}
