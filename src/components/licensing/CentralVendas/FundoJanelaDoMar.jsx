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
export default function FundoJanelaDoMar({ luz = 0, foto = null, raios = false }) {
  const { solY, solForca, noite } = cenaDaLuz(luz);
  // o quanto de tela sobra pra água, abaixo da linha do horizonte. Tudo que
  // é do mar se mede como fração DISTO, e não em pontos soltos de viewport:
  // é o que permite mover o horizonte sem desmontar a cena.
  const MAR = 100 - HORIZONTE;
  // a nuvem acende junto com o dia. Passa pelo mesmo aperto que `cenaDaLuz`
  // faz: `luz` vindo torto (NaN, texto, negativo) não pode apagar o céu.
  const luzSegura = Math.max(0, Math.min(1, Number(luz) || 0));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" data-teste="fundo-janela-do-mar" aria-hidden="true">
      {/* ── 1. A VISTA ────────────────────────────────────────────────────
          O céu: noite alta em cima, hora azul no meio, a faixa quente
          colando no horizonte. Os tons são de amanhecer de verdade — nada
          de roxo. */}
      <div
        className="absolute inset-0"
        style={{
          // 🎨 22/09, 2ª volta — esta paleta NÃO foi escolhida no olho: ela veio
          // da cena de amanhecer que ficou de pé entre quatro desenhadas lado
          // a lado e fotografadas. A anterior tinha cinza (#6E8492, #7E7C7C)
          // encostando no horizonte, e cinza no meio de um nascer do sol dá
          // aquele ar de lavado que denuncia a máquina. Aqui a faixa quente é
          // LARGA — começa quatro pontos antes da água — e é ela que faz o céu
          // parecer que está esquentando de verdade.
          // 🔴 22/09, 2ª rodada — ESTAS PARADAS ERAM NÚMEROS FIXOS (9.7%, 21%,
          // 29.1%…), calculados à mão pra um horizonte em 42%. Quando o
          // horizonte subiu pra 22% elas ficaram FORA DE ORDEM, e o CSS
          // resolve isso grudando cada parada atrasada na anterior: o céu
          // quente esticava até 41,7% e TODAS as cores do mar eram esmagadas
          // nesse mesmo ponto. Na tela virava uma tarja laranja com corte
          // seco atravessando o meio da lâmina — um defeito que nenhuma
          // leitura do código denuncia, só a foto.
          //
          // Agora cada parada é uma FRAÇÃO: do céu, entre o topo e a linha
          // da água; do mar, entre a linha e o pé da tela. Mover o horizonte
          // passa a recompor a cena inteira, em vez de quebrá-la.
          background: `linear-gradient(180deg,
            rgba(5,14,26,${noite}) 0%,
            #0B2340 ${(HORIZONTE * 0.231).toFixed(2)}%,
            #14415F ${(HORIZONTE * 0.500).toFixed(2)}%,
            #22637E ${(HORIZONTE * 0.693).toFixed(2)}%,
            #4E8698 ${(HORIZONTE * 0.826).toFixed(2)}%,
            #9E8B80 ${(HORIZONTE * 0.914).toFixed(2)}%,
            #D79C6C ${(HORIZONTE * 0.962).toFixed(2)}%,
            #F6BE81 ${(HORIZONTE * 0.993).toFixed(2)}%,
            #FFD79C ${HORIZONTE}%,
            #9E8067 ${(HORIZONTE + MAR * 0.014).toFixed(2)}%,
            #2E6076 ${(HORIZONTE + MAR * 0.050).toFixed(2)}%,
            #1B4E64 ${(HORIZONTE + MAR * 0.160).toFixed(2)}%,
            #113B4F ${(HORIZONTE + MAR * 0.400).toFixed(2)}%,
            #0A2A3B ${(HORIZONTE + MAR * 0.720).toFixed(2)}%,
            #061B27 100%)`,
        }}
      />

      {/* ☁️ 22/09 — O QUE TIRA A CARA DE PLÁSTICO.
          Um degradê de CSS é matematicamente liso: cada faixa de cor é
          perfeita, e é justamente essa perfeição que o olho lê como
          "desenhado por máquina". Céu de verdade tem nuvem, água de verdade
          tem ondulação, e foto de verdade tem grão. Os três nascem aqui de
          RUÍDO FRACTAL (feTurbulence), que é ruído de imagem de verdade —
          não é textura baixada, não pesa um byte de rede, e é o que separa
          esta tela de um fundo de app genérico. */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          {/* nuvem: ruído esticado na horizontal, como nuvem de amanhecer */}
          <filter id="jmNuvens" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.004 0.02" numOctaves="5" seed="7" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 1   0 0 0 0 0.86   0 0 0 0 0.72   0 0 0 -1.15 0.86" result="c" />
            <feGaussianBlur in="c" stdDeviation="2" />
          </filter>
          <filter id="jmNuvens2" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.003 0.016" numOctaves="4" seed="21" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 1   0 0 0 0 0.72   0 0 0 0 0.55   0 0 0 -1.05 0.72" result="c" />
            <feGaussianBlur in="c" stdDeviation="3" />
          </filter>
          {/* água: o mesmo ruído, esticado ao extremo na horizontal */}
          <filter id="jmAgua" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.9" numOctaves="3" seed="3" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   0 0 0 -1.4 0.95" />
          </filter>
          {/* a mesma água, em escala grossa: é a ondulação de perto */}
          <filter id="jmAgua2" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.004 0.35" numOctaves="2" seed="17" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   0 0 0 -1.6 1.05" />
          </filter>
          {/* grão de filme: fino, sem cor, por cima de tudo */}
          <filter id="jmGrao">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="11" result="n" />
            <feColorMatrix in="n" type="saturate" values="0" />
          </filter>
        </defs>
      </svg>

      {/* as nuvens: só na faixa do céu que encosta no horizonte, que é onde a
          luz do sol nascente as acende. Em cima elas somem na noite. */}
      <div
        className="absolute inset-x-0"
        style={{
          top: `${(HORIZONTE * 0.40).toFixed(1)}%`, height: `${(HORIZONTE * 0.52).toFixed(1)}%`, filter: 'url(#jmNuvens)', opacity: 0.16 + 0.14 * luzSegura,
          maskImage: 'linear-gradient(180deg, transparent, #000 35%, #000 70%, transparent)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 35%, #000 70%, transparent)',
        }}
      />
      <div
        className="absolute inset-x-0"
        style={{
          top: `${(HORIZONTE * 0.28).toFixed(1)}%`, height: `${(HORIZONTE * 0.62).toFixed(1)}%`, filter: 'url(#jmNuvens2)', opacity: 0.10 + 0.10 * luzSegura,
          maskImage: 'linear-gradient(180deg, transparent, #000 40%, transparent)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 40%, transparent)',
        }}
      />

      {/* o halo do sol — a luz que abre o céu inteiro em volta dele */}
      <div
        className="absolute inset-0 jm-respira"
        style={{
          background: `radial-gradient(circle at ${SOL_X}% ${solY}%,
            rgba(255,222,164,${0.66 * solForca}) 0%,
            rgba(255,190,118,${0.46 * solForca}) 9%,
            rgba(255,164,90,${0.29 * solForca}) 19%,
            rgba(255,138,66,${0.13 * solForca}) 32%,
            transparent 52%)`,
        }}
      />

      {/* o DISCO do sol: sem ele a tela tinha um brilho difuso, mas não tinha
          sol nenhum — e "nascer do sol" sem sol não emociona ninguém */}
      <div
        className="absolute jm-respira"
        style={{
          left: `${SOL_X}%`,
          top: `${solY}%`,
          // 🔴 ERA `8.6vmin`. `vmin` num celular alto é a LARGURA — 8,6vmin
          // num aparelho de 393px dá 34px, um caroço. O sol tem que ter
          // tamanho de sol em QUALQUER tela: o `clamp` garante um piso de
          // 58px no celular e um teto de 104px no computador, sem virar
          // uma bola no meio da tela grande.
          width: 'clamp(58px, 9vmin, 104px)',
          height: 'clamp(58px, 9vmin, 104px)',
          transform: 'translate(-50%, -50%)',
          borderRadius: '9999px',
          // 🔴 o MIOLO do disco agora é OPACO, sempre. Ele era multiplicado
          // pela força da luz e, na abertura, saía a 61% — translúcido em
          // cima de um céu que já está clareando, ou seja, invisível. Quem
          // varia com a luz é o BRILHO EM VOLTA (o halo, o caminho na água,
          // a bruma); o disco, quando aparece, aparece.
          background: `radial-gradient(circle,
            rgba(255,251,236,1) 0%,
            rgba(255,238,190,1) 30%,
            rgba(255,214,140,${Math.min(1, 1.02 * solForca)}) 56%,
            rgba(255,176,92,${0.72 * solForca}) 78%,
            rgba(255,150,74,${0.26 * solForca}) 92%,
            rgba(255,140,70,0) 100%)`,
          filter: 'blur(0.8px)',
        }}
      />

      {/* 🌅 OS RAIOS DO DESPERTAR — só na lâmina do "acordei" (22/09, dono:
          "uma imagem que reflita o Despertar, uma força, que pegue a tela
          toda"). Sol nascendo atrás de nuvem baixa abre leque de luz, e é
          esse leque que o olho lê como FORÇA — não como clarão. Saem do
          disco, com máscara que os apaga antes de encostar na borda, pra
          não virarem listra de fundo de slide. */}
      {raios && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 70% 42% at ${SOL_X}% ${solY}%,
              rgba(255,214,150,${0.17 * solForca}) 0%,
              rgba(255,186,110,${0.08 * solForca}) 34%,
              transparent 72%)`,
          }}
        />
      )}
      {raios && (
        <div
          className="absolute inset-0 jm-raios"
          style={{
            background: `repeating-conic-gradient(from 192deg at ${SOL_X}% ${solY}%,
              rgba(255,231,186,${0.40 * solForca}) 0deg 2.6deg,
              transparent 2.6deg 9.5deg)`,
            maskImage: `radial-gradient(ellipse 85% 70% at ${SOL_X}% ${solY}%, #000 0%, rgba(0,0,0,.75) 30%, rgba(0,0,0,.35) 60%, transparent 92%)`,
            WebkitMaskImage: `radial-gradient(ellipse 85% 70% at ${SOL_X}% ${solY}%, #000 0%, rgba(0,0,0,.75) 30%, rgba(0,0,0,.35) 60%, transparent 92%)`,
            filter: 'blur(7px)',
          }}
        />
      )}

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

      {/* ➖ A LINHA DO HORIZONTE, 22/09 — dono: "o sol é extremamente
          importante aparecer, a linha do horizonte". Até agora existia só a
          bruma (borrada em 9px): ela dá distância, mas não desenha LINHA
          nenhuma — e sem linha o olho não sabe onde acaba o céu e começa a
          água. Um fio de 1px, claro, com máscara saindo do sol: forte perto
          dele, morrendo nas pontas, que é como o horizonte se comporta
          contra a luz. */}
      <div
        className="absolute inset-x-0"
        style={{
          top: `${HORIZONTE}%`,
          height: '1px',
          background: `rgba(255,236,200,${0.75 * solForca})`,
          maskImage: `linear-gradient(90deg, transparent 0%, #000 ${SOL_X * 0.5}%, #000 ${50 + SOL_X * 0.4}%, transparent 100%)`,
          WebkitMaskImage: `linear-gradient(90deg, transparent 0%, #000 ${SOL_X * 0.5}%, #000 ${50 + SOL_X * 0.4}%, transparent 100%)`,
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
          background: `radial-gradient(ellipse 15% 62% at ${SOL_X}% 0%,
            rgba(255,224,158,${0.74 * solForca}) 0%,
            rgba(255,196,118,${0.38 * solForca}) 26%,
            rgba(255,176,98,${0.16 * solForca}) 54%,
            transparent 80%)`,
          filter: 'blur(12px)',
        }}
      />

      {/* ✨ AS FAÍSCAS DO CAMINHO. Linhas curtas e claras, e sim: é o mesmo
          `repeating-linear-gradient` que foi expulso do mar inteiro logo
          abaixo. A diferença é a máscara. Espalhado pela tela toda ele lia
          como scanline de televisão; apertado numa elipse de 11% em volta do
          reflexo do sol, ele lê como o que é — a luz quebrando na crista das
          ondas. O mesmo recurso, local, faz o trabalho oposto. */}
      <div
        className="absolute inset-x-0 jm-respira"
        style={{
          top: `${HORIZONTE}%`,
          bottom: 0,
          backgroundImage: `repeating-linear-gradient(180deg, rgba(255,246,220,${0.46 * solForca}) 0 1px, transparent 1px 6px)`,
          maskImage: `radial-gradient(ellipse 11% 40% at ${SOL_X}% 0%, #000 0%, transparent 75%)`,
          WebkitMaskImage: `radial-gradient(ellipse 11% 40% at ${SOL_X}% 0%, #000 0%, transparent 75%)`,
        }}
      />

      {/* 🌊 O BRILHO QUEBRADO DA SUPERFÍCIE.
          🔴 ISTO JÁ FOI `repeating-linear-gradient` — linhas de 1px repetidas
          descendo o mar inteiro. Medido na tela, virava LISTRA DE TELEVISÃO
          SEM SINAL: o olho lia scanline, não água, e era o maior delator de
          "fundo feito por máquina" que sobrava na lâmina. Agora as duas
          camadas saem do mesmo ruído fractal das nuvens, só que esmagado na
          vertical — que é exatamente o que uma ondulação é: ruído esticado.
          Longe do horizonte a ondulação é fina; perto de quem olha, grossa. */}
      <div
        className="absolute inset-x-0 jm-mare"
        style={{
          top: `${HORIZONTE}%`,
          height: `${(MAR * 0.31).toFixed(1)}%`,
          filter: 'url(#jmAgua)',
          opacity: 0.34,
          mixBlendMode: 'soft-light',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,.95) 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,.95) 0%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 jm-mare-perto"
        style={{
          top: `${(HORIZONTE + MAR * 0.19).toFixed(1)}%`,
          bottom: 0,
          filter: 'url(#jmAgua2)',
          opacity: 0.20,
          mixBlendMode: 'soft-light',
          maskImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,.85) 35%, rgba(0,0,0,.55) 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,.85) 35%, rgba(0,0,0,.55) 100%)',
        }}
      />

      {/* a textura da água: o ruído é o que faz a superfície ter matéria.
          Sem ele, o mar era um degradê azul e lia como papel de parede. */}
      <div
        className="absolute inset-x-0"
        style={{
          top: `${HORIZONTE}%`, bottom: 0, filter: 'url(#jmAgua)', opacity: 0.30, mixBlendMode: 'overlay',
          maskImage: 'linear-gradient(180deg, #000 0%, rgba(0,0,0,.5) 45%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, #000 0%, rgba(0,0,0,.5) 45%, transparent 100%)',
        }}
      />

      {/* 📷 A FOTO, quando existe. A vista desenhada acima continua embaixo
          dela: é o que a pessoa vê no meio segundo em que a foto ainda está
          baixando, e é o que sobra se ela nunca baixar. Uma foto que já traz
          a própria janela dispensa a janela desenhada — duas molduras, uma
          por cima da outra, viram um erro visual. */}
      {foto && (
        <img
          src={foto}
          alt=""
          data-teste="foto-da-janela"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* ── 2. A JANELA ───────────────────────────────────────────────────
          O truque da parede: este retângulo é o VÃO da janela, e a sombra
          que ele joga pra fora (0 0 0 100vmax) pinta a parede do cômodo em
          volta. Uma caixa só, sem imagem nenhuma. */}
      {!foto && (<><div
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
      /></>)}

      {/* o GRÃO DE FILME, por cima de tudo — inclusive da parede e da foto,
          quando existe foto. É a última camada porque é ela que amarra tudo
          numa imagem só: sem grão, cada camada continua parecendo uma camada. */}
      <div
        className="absolute inset-0"
        style={{ filter: 'url(#jmGrao)', opacity: 0.10, mixBlendMode: 'overlay' }}
      />

      {/* ── 3. O CÔMODO ───────────────────────────────────────────────────
          A sombra de quem está dentro: escurece o pé da tela pro texto ter
          onde pisar, sem tapar a vista. */}
      <div
        className="absolute inset-0"
        // 🔴 esta vinheta já teve dois stops só (transparente 46% → escuro 100%) e
        // o salto desenhava um ARCO visível atravessando o céu, que na foto lia
        // como defeito de tela. Escurecer tem que ser lento pra ninguém ver
        // onde começa; por isso os degraus no meio.
        style={{ background: 'radial-gradient(135% 92% at 50% 30%, transparent 30%, rgba(4,10,18,.10) 55%, rgba(4,10,18,.26) 75%, rgba(4,10,18,.44) 90%, rgba(4,10,18,.56) 100%)' }}
      />

      {/* 🔤 O VÉU DO TEXTO. A vista é bonita no meio da tela — que é
          exatamente onde moram o título, o contrato e o botão. Sem este véu,
          o subtítulo caía em cima da faixa clara do horizonte e sumia. Ele
          escurece SÓ o miolo, de leve, e deixa as bordas com a vista inteira:
          o texto ganha chão sem a janela virar tela cinza. */}
      <div
        className="absolute inset-0"
        // 🔴 o véu também tinha degrau: com três stops, a borda dele desenhava um
        // ARCO no céu — e um arco no céu não é nascer do sol nenhum, é defeito.
        // O mesmo escuro no miolo, agora derramado até a borda da tela.
        // 📷 COM FOTO O VÉU PRECISA SER MAIS FUNDO, e isto foi medido: numa
        // das fotos da semana (céu de nascer do sol, quase branco no meio) o
        // título caía a 2,80:1 — reprovado até no mínimo frouxo de 3,0 pra
        // texto grande. A cena desenhada é escura por construção; uma foto
        // qualquer não é, e o véu é o que garante que QUALQUER foto que o
        // dono mandar amanhã continue tendo texto legível por cima.
        style={{ background: foto
          ? 'radial-gradient(ellipse 72% 66% at 50% 50%, rgba(4,11,20,.70) 0%, rgba(4,11,20,.62) 30%, rgba(4,11,20,.50) 52%, rgba(4,11,20,.34) 70%, rgba(4,11,20,.18) 85%, rgba(4,11,20,0) 100%)'
          : 'radial-gradient(ellipse 62% 58% at 50% 52%, rgba(4,11,20,.50) 0%, rgba(4,11,20,.44) 30%, rgba(4,11,20,.34) 52%, rgba(4,11,20,.22) 70%, rgba(4,11,20,.11) 85%, rgba(4,11,20,0) 100%)' }}
      />

      <style>{`
        @keyframes jmRaios { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        @keyframes jmMare { 0%,100% { transform: translateY(0) } 50% { transform: translateY(2px) } }
        @keyframes jmMarePerto { 0%,100% { transform: translateY(0) } 50% { transform: translateY(5px) } }
        @keyframes jmRespira { 0%,100% { opacity: .94 } 50% { opacity: 1 } }
        @keyframes jmCaminho { 0%,100% { transform: scaleX(1) } 50% { transform: scaleX(1.09) } }
        .jm-raios       { animation: jmRaios 12s ease-in-out infinite; }
        .jm-mare        { animation: jmMare 13s ease-in-out infinite; }
        .jm-mare-perto  { animation: jmMarePerto 17s ease-in-out infinite; }
        .jm-respira     { animation: jmRespira 9s ease-in-out infinite; }
        .jm-caminho     { animation: jmCaminho 11s ease-in-out infinite; transform-origin: 50% 0; }
        @media (prefers-reduced-motion: reduce) {
          .jm-mare, .jm-mare-perto, .jm-respira, .jm-caminho, .jm-raios { animation: none; }
        }
      `}</style>
    </div>
  );
}
