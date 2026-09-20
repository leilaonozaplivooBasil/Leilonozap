import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Gem, Volume2, VolumeX } from 'lucide-react';
import { querSom, gravarQuerSom, calarARadio } from '@/lib/somDoDestaque';
import CountdownTimer from '@/components/common/CountdownTimer';
import { textoDeTermino } from '@/lib/relogioLeilao';
import { precoDoLeilao, emReais, AVISO_NAO_OFICIAL } from '@/lib/homeNova';

// 🎯 HERO — o leilão do dia.
//
// 🔴 NADA AQUI É TEXTO DIGITADO. Título, foto, preço e prazo saem do leilão que
// o hero aponta. A home antiga tinha a data escrita na arte, e no dia seguinte
// a página mentia sozinha. Sem leilão em cartaz, o hero não renderiza.
//
// 🎨 A IDENTIDADE vem do logo, não de uma paleta inventada: verde vivo do
// símbolo, verde quase preto do fundo e o CARAMELO do martelo (nz-ouro/marrom)
// como acento — é o único tom quente da marca, e é o que separa a página de
// "mais um site escuro com verde".
export default function HeroDoDia({ leilao, arte = null, chamada = 'Leilão do dia', naLoja = 0, video = null }) {
  // 🎬 19/09/2026 — O VÍDEO NO LUGAR DA FOTO, "sempre ativo e com som tocando".
  //
  // 🔴 "COM SOM TOCANDO" NÃO EXISTE NA PARTIDA, e isto já foi descoberto aqui em
  // 17/09: Chrome, Safari, Firefox e Edge recusam `play()` com áudio antes de um
  // gesto da pessoa. Vídeo que nasce com som não é vídeo com som — é vídeo que
  // não toca, parado no primeiro quadro.
  //
  // A regra da casa para isso já existe e mora em `lib/somDoDestaque.js`: nasce
  // MUDO (aí toca sozinho), e o PRIMEIRO toque ou clique em qualquer lugar da
  // página tira o mudo. Na prática o som entra em segundos, sem bloqueio. Não
  // escrevi regra nova: seria um segundo vocabulário para a mesma decisão.
  //
  // Diferença do card: aqui o vídeo tem `loop`. No card ele acaba e as fotos
  // voltam a girar; no hero "sempre ativo" quer dizer sempre, e não há rodízio
  // para o qual voltar.
  const videoRef = useRef(null);
  const [mudo, setMudo] = useState(true);
  // 📊 Quanto do vídeo já passou, de 0 a 1. Alimenta a barra no pé da moldura —
  // que é, ao mesmo tempo, o sinal de "isto é um vídeo" e o diagnóstico de
  // "ele está mesmo tocando?".
  const [andamento, setAndamento] = useState(0);
  const temVideo = video?.tipo === 'arquivo' && Boolean(video?.embed);

  useEffect(() => {
    if (!temVideo || !querSom()) return undefined;
    const ligarSom = () => {
      const v = videoRef.current;
      if (!v || !querSom()) return;
      v.muted = false;
      setMudo(false);
      calarARadio();
      // `play()` pode ser recusado mesmo aqui (aba em segundo plano). Sem o
      // catch vira "Unhandled promise rejection" no console de quem está comprando.
      v.play?.().catch(() => {});
    };
    const opcoes = { once: true, capture: true, passive: true };
    window.addEventListener('pointerdown', ligarSom, opcoes);
    window.addEventListener('touchstart', ligarSom, opcoes);
    window.addEventListener('keydown', ligarSom, opcoes);
    return () => {
      window.removeEventListener('pointerdown', ligarSom, opcoes);
      window.removeEventListener('touchstart', ligarSom, opcoes);
      window.removeEventListener('keydown', ligarSom, opcoes);
    };
  }, [temVideo]);

  // ▶️ 20/09/2026 — O VÍDEO PARECIA UMA FOTO ATÉ A PESSOA MEXER O MOUSE.
  //
  // Duas causas, as duas aqui:
  //
  // 1. `preload="metadata"` mandava o navegador baixar SÓ o cabeçalho. Com 7,9
  //    MB e `autoplay`, o Chrome fica no cartaz até juntar quadro suficiente —
  //    e cartaz parado é exatamente uma foto. Virou `preload="auto"`.
  //
  // 2. O atributo `autoplay` sozinho é um PEDIDO, não uma garantia: aba que
  //    nasceu em segundo plano, economia de bateria, política do navegador —
  //    qualquer um deles engole a partida em silêncio, sem erro no console.
  //    Agora o play é pedido na mão quando o vídeo avisa que tem dados, e o
  //    `catch` existe porque a recusa é normal e não pode virar erro vermelho
  //    na tela de quem está comprando.
  //
  // ⚠️ O QUE A BANCA PROVA E O QUE NÃO PROVA: tirar o `preload="auto"` ou o
  // `autoPlay` derruba a prova "o vídeo está tocando sozinho". Tirar ESTE
  // `play()` não derruba nada — na banca a aba está sempre visível e em
  // primeiro plano, que é justamente o caso em que o `autoplay` não falha. Ele
  // fica como cinto e suspensório para o caso que a banca não sabe criar, e
  // fica dito aqui para ninguém confundir o verde com prova.
  const tentarTocar = () => { videoRef.current?.play?.().catch(() => {}); };

  const trocarSom = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const v = videoRef.current;
    const querMudo = !mudo;
    setMudo(querMudo);
    gravarQuerSom(!querMudo);
    if (v) v.muted = querMudo;
    if (!querMudo) { calarARadio(); v?.play?.().catch(() => {}); }
  };

  if (!leilao?.id) return null;

  const foto = arte || leilao.image_urls?.[0] || null;
  const preco = precoDoLeilao(leilao);
  // 💰 19/09/2026 — A ÂNCORA FALTAVA JUSTO NO ITEM MAIS CARO.
  //
  // Todo cartão do carrossel mostra "na loja R$ X" riscado embaixo do lance. O
  // hero, que carrega o produto de maior valor da casa, mostrava só "R$ 597,00"
  // solto — sem nada que dissesse de quanto ele partiu. A mesma régua do
  // carrossel vale aqui, incluindo a recusa ao selo de "-99%": dois fatos lado
  // a lado, sem prometer desconto que o martelo ainda não confirmou.
  const compara = naLoja > 0 && naLoja > preco;
  // `textoDeTermino` e não `dataDeTermino`: é ela que decide sozinha se
  // precisa do ano (a própria lib manda usar esta nas telas).
  const quando = textoDeTermino(leilao.end_time);

  return (
    <section className="relative overflow-hidden bg-nz-noite" data-teste="hero-do-dia">
      {/* halo do produto: luz que nasce atrás da foto, não um degradê chapado */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(58% 70% at 76% 46%, rgba(46,157,99,0.30) 0%, rgba(46,157,99,0.07) 42%, transparent 72%)' }}
      />
      {/* trama fina: tira o "preto chapado" sem virar textura visível */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(80% 70% at 50% 40%, #000 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(80% 70% at 50% 40%, #000 30%, transparent 100%)',
        }}
      />

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-8 px-5 py-[clamp(32px,5.5vw,64px)] md:grid-cols-[1.02fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-nz-ouro-claro/35 bg-nz-ouro-claro/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-nz-ouro-claro">
            <Gem size={13} /> {chamada}
          </span>

          <h1
            className="font-slab mt-5 font-extrabold leading-[1.02] tracking-[-0.025em] text-white"
            style={{ fontSize: 'clamp(2.1rem, 5vw, 3.7rem)' }}
          >
            {leilao.title}
          </h1>

          {/* 💰 O preço deixa de ser uma linha de texto e vira o segundo herói
              da tela — é o número que faz a pessoa clicar. */}
          <div className="mt-7 flex flex-wrap items-end gap-x-8 gap-y-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Lance atual</div>
              <div
                className="font-slab font-extrabold leading-none text-nz-verde-neon"
                style={{ fontSize: 'clamp(2rem, 4.2vw, 3rem)' }}
                data-teste="hero-preco"
              >
                {emReais(preco)}
              </div>
              {compara && (
                <div className="mt-1.5 text-[13px] text-white/40" data-teste="hero-na-loja">
                  na loja <span className="line-through">{emReais(naLoja)}</span>
                </div>
              )}
            </div>

            {/* ⏱️ Relógio VIVO, contando. A versão anterior escrevia "Termina
                20/09 às 18:00" e ficava parada: num leilão, o que move a pessoa
                é ver o tempo andando. */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Termina em</div>
              <div
                className="font-slab text-[1.6rem] font-bold leading-none text-white sm:text-[2rem]"
                data-teste="hero-contagem"
              >
                <CountdownTimer endTime={leilao.end_time} className="font-slab" />
              </div>
              {quando && <div className="mt-1.5 text-[12px] text-white/40" data-teste="hero-fim">{quando}</div>}
            </div>
          </div>

          <Link
            to={`/AuctionRoom?id=${encodeURIComponent(leilao.id)}`}
            className="group mt-8 inline-flex min-h-[56px] items-center gap-2.5 rounded-full bg-nz-verde-claro px-8 text-[16px] font-bold text-white shadow-[0_10px_30px_-10px_rgba(46,157,99,0.85)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-nz-verde-neon hover:shadow-[0_16px_38px_-10px_rgba(63,208,126,0.9)]"
          >
            <Gavel size={18} className="transition-transform duration-200 group-hover:-rotate-12" />
            Dar meu lance
          </Link>

          {/* ⚖️ Obrigação de contrato, não enfeite — ver lib/homeNova.js */}
          <p className="mt-6 max-w-[46ch] text-[12px] leading-snug text-white/45" data-teste="aviso-nao-oficial">
            {AVISO_NAO_OFICIAL}
          </p>
        </div>

        {(temVideo || foto) && (
          <div className="relative flex items-center justify-center">
            {temVideo ? (
              /* 🖼️ 19/09/2026 — A MOLDURA, DEPOIS DO PRINT DO DONO.
                 A primeira versão punha o <video> numa caixa de altura fixa
                 (400px) com `object-contain`. O quadro do vídeo é 16:9: ele
                 ficava no meio e sobravam ~70px de CAIXA VAZIA em cima e
                 embaixo — invisíveis, mas ocupando espaço. O botão de som,
                 ancorado no fundo dessa caixa, aparecia boiando no preto, longe
                 do vídeo. Agora a moldura TEM a proporção do vídeo: nada sobra,
                 e o que é âncora fica onde se espera. */
              <div
                className="group/video relative aspect-video w-full max-w-[520px] overflow-hidden rounded-2xl border border-nz-verde-claro/25 bg-nz-noite-3 shadow-[0_28px_60px_-24px_rgba(46,157,99,0.75)]"
                data-teste="hero-com-video"
              >
                <video
                  ref={videoRef}
                  src={video.embed}
                  data-teste="video-do-hero"
                  autoPlay
                  loop
                  muted={mudo}
                  playsInline
                  preload="auto"
                  // a foto do produto como cartaz: o herói nunca nasce preto, e
                  // quem está com dados curtos vê a imagem de sempre. `contain`
                  // serve aos dois — o vídeo 16:9 preenche a moldura inteira, e
                  // a foto, que é quadrada, fica centrada sem ser decepada.
                  poster={foto || undefined}
                  onLoadedData={tentarTocar}
                  onCanPlay={tentarTocar}
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget;
                    if (v.duration > 0) setAndamento(v.currentTime / v.duration);
                  }}
                  className="h-full w-full object-contain"
                />

                {/* ▶️ A LINHA QUE ANDA. Um vídeo de produto pode ter cena quase
                    parada e aí ele LÊ como foto, por mais que esteja tocando —
                    foi o que o dono viu. Esta linha se move sempre, então diz
                    "isto é vídeo" sem precisar de ícone de play por cima da
                    arte. E serve de diagnóstico: linha parada é vídeo parado. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[3px] bg-white/15"
                  data-teste="andamento-do-video"
                >
                  <div
                    className="h-full bg-nz-verde-neon"
                    style={{ width: `${Math.min(100, Math.max(0, andamento * 100))}%` }}
                  />
                </div>

                {/* véu no pé: o botão precisa ser legível também quando a cena
                    do vídeo está clara, e uma cena clara acontece o tempo todo */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
                  style={{ background: 'linear-gradient(to top, rgba(7,16,12,0.75), transparent)' }}
                />

                <button
                  type="button"
                  onClick={trocarSom}
                  data-teste="som-do-hero"
                  aria-label={mudo ? 'Ligar o som do vídeo' : 'Tirar o som do vídeo'}
                  className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-nz-verde-neon hover:text-nz-verde-neon motion-reduce:transition-none motion-reduce:hover:scale-100"
                >
                  {mudo ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                {/* 🔇 enquanto está mudo, o convite fica escrito: sem isto a
                    pessoa não tem como saber que existe som para ligar */}
                {mudo && (
                  <span
                    className="pointer-events-none absolute bottom-[22px] right-[68px] whitespace-nowrap rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur-sm"
                    data-teste="convite-do-som"
                  >
                    Toque para ouvir
                  </span>
                )}
              </div>
            ) : (
              <img
                src={foto}
                alt={leilao.title}
                loading="eager"
                decoding="async"
                className="relative w-full max-w-[460px] object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.6)]"
                style={{ height: 'clamp(230px, 32vw, 400px)' }}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
