import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { destinoDoBanner } from '@/lib/linkDoBanner';

// ambient: preenche as laterais/sobras do container com a própria arte desfocada
// (em vez de barras chapadas) quando fit="contain" e o banner não cobre tudo.
// PONTO 92 — mobileFit: permite um encaixe diferente só no celular (ex.: a Home
// usa "contain" no desktop, mas no mobile precisa "cover" pra não sobrar faixa
// escura acima/abaixo, igual à Loja Virtual). Sem mobileFit, nada muda.
// 🖼️ objectPosition: onde a área do "cover" ancora o corte quando a foto não
// cabe inteira no container (célula normal do CSS: some da tela quem não
// coube, quem fica é decidido por isto). Sem isto, o corte é 50% 50% (centro
// exato) — em foto de gente, isso corta cabeça em cima e perna embaixo em
// proporções iguais quando o container fica bem baixo e largo (desktop). Só
// afeta quem passar a prop; sem ela, nada muda no comportamento de hoje.
// 🔴 17/09/2026, SEGUNDA RODADA — O TETO DE ALTURA CAIU.
//
// Havia aqui um `TETO_DE_ALTURA = 520`, e dele saía um teto de LARGURA
// (520 × proporção). Era ele que deixava a arte 16:9 com 924px numa tela de
// 1354px — a moldura encostava na arte, mas a arte não encostava na tela.
//
// O dono, com print: "no desktop os banners ainda não preenchem toda tela".
// E, escolhendo entre encher cortando ou encher esticando: NÃO CORTAR NADA.
//
// A geometria não deixa ter as duas coisas. Numa tela mais larga que a arte,
// ou a arte é cortada, ou o banner fica alto, ou sobra faixa. Medido com as
// artes reais (home 16:9, Loja ≈2,8:1):
//
//     tela 1354px → home 761px de altura · Loja 484px
//     tela 1440px → home 810px           · Loja 514px
//     tela 1920px → home 1080px          · Loja 686px
//
// A arte larga da Loja preenche sem crescer muito; a 16:9 do home cresce. Isso
// é da ARTE, não do código: arte desktop larga (≈2,6:1) resolve sozinha, e é
// por isso que a Loja nunca teve este problema.
//
// Sem teto nenhum, de propósito: qualquer `maxHeight` aqui faz a altura travar
// enquanto a largura segue em 100%, a proporção quebra, e a faixa lateral que
// o dono está reclamando VOLTA. Foi essa a escolha dele.

/**
 * 🔗 O CLIQUE DO BANNER — um lugar só para os dois ramos (imagem e vídeo).
 *
 * 🔴 19/09/2026. Antes: o ramo da imagem tinha `target="_blank"` cravado e o do
 * vídeo não tinha nenhum. Mesmo clique, dois comportamentos — e o da imagem
 * abria ABA NOVA para ir de uma página nossa a outra página nossa.
 *
 * Agora quem decide é `destinoDoBanner`: caminho nosso navega DENTRO da
 * aplicação (sem recarregar, mesma aba); site de fora abre em aba nova com
 * `rel` de segurança; sem link, nada de <a> — porque um <a> sem destino é um
 * cursor de mãozinha que não leva a lugar nenhum.
 */
function CliqueDoBanner({ linkUrl, className, children }) {
  const destino = destinoDoBanner(linkUrl);
  if (!destino) return <div className={className}>{children}</div>;
  if (destino.tipo === 'interno') {
    return <Link to={destino.para} className={className}>{children}</Link>;
  }
  return (
    <a
      href={destino.href}
      {...(destino.novaAba ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={className}
    >
      {children}
    </a>
  );
}

export default function RotatingBanner({ banners, fit = 'cover', mobileFit, heightClass = 'h-64 md:h-80 lg:h-96', rounded = true, ambient = false, objectPosition, molduraSegueArte = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredBanners = useMemo(() => {
    if (!Array.isArray(banners)) return [];
    return banners.filter(banner => {
      const deviceType = banner.device_type || 'desktop';
      // "any" = arte única que serve celular e desktop (não filtra por dispositivo)
      if (deviceType === 'any') return true;
      return deviceType === (isMobile ? 'mobile' : 'desktop');
    });
  }, [banners, isMobile]);

  const videoRefs = useRef({});

  // 📐 17/09/2026 — A MOLDURA PERGUNTA A PROPORÇÃO À PRÓPRIA ARTE.
  //
  // O dono: "o banner ainda está em tamanhos diferentes nas páginas". Estava —
  // e a causa não era o código: as artes têm proporções DIFERENTES. Medido nos
  // prints dele: a da Loja é ~2,8:1 e a dos leilões (trocada em 17/09) é 16:9.
  //
  // 🔴 POR QUE O 16:9 FIXO SAIU (era a primeira versão desta mesma PR):
  // ele consertava os leilões e ESTRAGAVA a Loja. A arte de 2,8:1 numa moldura
  // 16:9 encolheria de 1355 para 924px de largura E ganharia faixa em cima e
  // embaixo. Proporção fixa só serve se TODAS as artes forem daquela proporção,
  // e o Painel de Mídia não exige isso de ninguém.
  //
  // Agora: `naturalWidth/naturalHeight` da arte ativa no `onLoad`. A largura
  // máxima cai do teto de altura (teto × proporção). A moldura termina onde a
  // arte termina, qualquer que seja a arte — e continua de borda a borda quando
  // a arte é larga o bastante para isso.
  const [proporcaoDaArte, setProporcaoDaArte] = useState(null);

  const medirArte = (el) => {
    if (!el?.naturalWidth || !el?.naturalHeight) return;
    const r = el.naturalWidth / el.naturalHeight;
    if (Number.isFinite(r) && r > 0) setProporcaoDaArte((atual) => (atual === r ? atual : r));
  };

  const anotarProporcao = (e) => medirArte(e?.target);

  // 🔴 `onLoad` SOZINHO NÃO BASTA. Imagem que já está no cache (ou um `data:`,
  // como nas bancas) termina de decodificar ANTES do React ligar o ouvinte — o
  // evento nunca chega e a moldura fica na proporção de partida para sempre.
  // Medido: a arte 2,8:1 ficava enquadrada em 16:9, com 95px de faixa em cima e
  // embaixo. O `ref` pega justamente esse caso, lendo `complete` na montagem.
  const medirSeJaPronta = (el) => { if (el?.complete) medirArte(el); };

  // 👆 17/09/2026 — O BANNER DESLIZA COM O DEDO.
  //
  // Pedido do dono, duas vezes: no celular as setas brancas ficaram grandes e
  // atrapalham a arte, e o carrossel tem que andar com o dedo como em qualquer
  // app. As setas somem no celular (regra de CSS nos wrappers) e o arrasto toma
  // o lugar delas — sem arrasto, o celular ficaria SEM nenhuma forma de passar
  // o banner a não ser esperar os 10 segundos.
  //
  // 🔴 Só conta como deslize o gesto HORIZONTAL. Sem essa conferência, rolar a
  // página com o dedo em cima do banner trocaria o slide sem querer — o gesto
  // de rolar começa igual ao de deslizar, e quem decide é a direção.
  const toqueRef = useRef(null);

  const aoTocar = (e) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    toqueRef.current = { x: t.clientX, y: t.clientY };
  };

  const aoSoltar = (e) => {
    const inicio = toqueRef.current;
    toqueRef.current = null;
    if (!inicio) return;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    // 40px de corrida mínima: abaixo disso é toque trêmulo, não deslize.
    // E o movimento tem que ser mais horizontal que vertical, senão é rolagem.
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
    setCurrentIndex((prev) => {
      const total = filteredBanners.length;
      if (total <= 1) return prev;
      return dx < 0 ? (prev + 1) % total : (prev - 1 + total) % total;
    });
  };

  // ⏱️ Banners de imagem trocam no intervalo fixo de 10s. Banners de vídeo
  // avançam exatamente quando o próprio vídeo termina — sem loop reiniciando
  // sozinho no meio da exibição (sensação de "travada"/duplicado).
  useEffect(() => {
    if (filteredBanners.length === 0) return;

    const activeBanner = filteredBanners[currentIndex];
    const advance = () => setCurrentIndex((prev) => (prev + 1) % filteredBanners.length);

    if (activeBanner?.video_url) {
      const videoEl = videoRefs.current[activeBanner.id];
      if (videoEl) {
        videoEl.currentTime = 0;
        videoEl.play().catch(() => {});
        videoEl.addEventListener('ended', advance);
        return () => videoEl.removeEventListener('ended', advance);
      }
    }

    const timer = setTimeout(advance, 10000);
    return () => clearTimeout(timer);
  }, [currentIndex, filteredBanners]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [isMobile]);

  if (!Array.isArray(banners) || banners.length === 0) return null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredBanners.length) % filteredBanners.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredBanners.length);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  if (filteredBanners.length === 0) return null;

  // encaixe efetivo: no celular respeita mobileFit quando informado
  const fitAtual = isMobile && mobileFit ? mobileFit : fit;

  return (
    <div
      className={`relative w-full ${heightClass} ${rounded ? 'rounded-2xl' : ''} overflow-hidden group `}
      style={molduraSegueArte ? (() => {
        // 🔴 PROPORÇÃO DE PARTIDA, senão a moldura nasce com ALTURA ZERO e nada
        // carrega: sem altura a arte não ocupa espaço, e sem a arte não há
        // proporção para dar altura. Medido: moldura 1339x0 em todas as telas.
        // 16:9 é o palpite inicial; assim que a arte carrega, ela corrige.
        const r = proporcaoDaArte || 16 / 9;
        // largura 100% (vem da classe) + proporção da arte = altura calculada.
        // Sem maxWidth e sem maxHeight: é o que faz a arte encostar nas duas
        // bordas da tela, inteira, em qualquer largura.
        return { aspectRatio: String(r) };
      })() : undefined}
      onTouchStart={aoTocar}
      onTouchEnd={aoSoltar}
      data-teste="moldura-do-carrossel"
    >
      <style>{`
        @keyframes nzCaptionFade { 0%, 100% { opacity: 0; } 15%, 85% { opacity: 1; } }
        .nz-video-caption { animation: nzCaptionFade 5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .nz-video-caption { animation: none; opacity: 1; } }
      `}</style>
      {/* Imagem do Banner */}
      <div className="relative w-full h-full">
        {filteredBanners.map((banner, index) => {
          const isActive = index === currentIndex;
          const isNext = index === (currentIndex + 1) % filteredBanners.length;
          const shouldEagerLoad = index === 0 || isActive;
          if (banner.video_url) {
            return (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {(() => {
                  const isContain = fitAtual === 'contain';
                  const videoFitClass = isContain ? 'object-contain' : 'object-cover';
                  const videoObjectPosition = isContain ? 'center center' : 'center 20%';
                  const videoContent = (
                    <>
                      {ambient && isContain && (
                        <video
                          src={banner.video_url}
                          autoPlay
                          muted
                          loop
                          playsInline
                          aria-hidden
                          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
                        />
                      )}
                      <video
                        ref={(el) => { if (el) videoRefs.current[banner.id] = el; }}
                        src={banner.video_url}
                        autoPlay
                        muted
                        playsInline
                        preload={shouldEagerLoad ? 'auto' : 'metadata'}
                        className={`relative w-full h-full ${videoFitClass} ${destinoDoBanner(banner.link_url) ? 'cursor-pointer' : ''}`}
                        style={{ objectPosition: videoObjectPosition, backgroundColor: isContain ? '#0f172a' : undefined }}
                      />
                    </>
                  );
                  // 📐 AUDITORIA 14/08/2026 — a legenda do banner era larga e caía por cima
                  // da ilustração/mascote (que vive no centro-direita da arte), parecendo
                  // defeito de desenho. Agora fica estreita, encostada à esquerda, com véu
                  // escuro mais firme por baixo: sai da frente do personagem e ganha leitura.
                  // Só pintura — mesmo texto, mesmo clique, mesmo carrossel.
                  const caption = (
                    <div className="nz-video-caption absolute inset-x-0 bottom-0 z-10 pt-14 pb-12 sm:pb-14 md:pb-16 px-4 sm:px-6 md:px-8 bg-gradient-to-t from-black/90 via-black/55 to-transparent text-left">
                      <p className="text-base sm:text-xl md:text-2xl font-bold text-white leading-tight max-w-[62%] sm:max-w-[52%]">
                        {banner.caption_title || banner.title}
                      </p>
                      {banner.caption_subtitle && (
                        <p className="mt-1 text-xs sm:text-base md:text-lg text-nz-verde-claro font-medium leading-snug max-w-[62%] sm:max-w-[52%]">
                          {banner.caption_subtitle}
                        </p>
                      )}
                    </div>
                  );
                  return (
                    <CliqueDoBanner linkUrl={banner.link_url} className="relative block w-full h-full">
                      {videoContent}
                      {caption}
                    </CliqueDoBanner>
                  );
                })()}
              </div>
            );
          }
          return (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {ambient && (
              <img
                src={banner.image_url}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
                loading={shouldEagerLoad ? 'eager' : 'lazy'}
                decoding="async"
              />
            )}
            {/* A imagem é escrita UMA vez: antes ela aparecia em dois ramos
                quase idênticos, e qualquer ajuste de encaixe tinha que ser feito
                nos dois — foi assim que o `target="_blank"` ficou só num deles. */}
            <CliqueDoBanner linkUrl={banner.link_url} className="block w-full h-full overflow-hidden">
              <img
                src={banner.image_url}
                alt={banner.title || 'Banner'}
                className={`w-full h-full relative ${destinoDoBanner(banner.link_url) ? 'cursor-pointer' : ''} ${fitAtual === 'contain' ? 'object-contain' : ''} ${fitAtual === 'contain' && !ambient ? 'bg-gray-900' : ''}`}
                loading={shouldEagerLoad ? "eager" : "lazy"}
                fetchPriority={isActive ? "high" : "low"}
                decoding={shouldEagerLoad ? "sync" : "async"}
                onLoad={isActive ? anotarProporcao : undefined}
                ref={isActive ? medirSeJaPronta : undefined}
                style={{
                  objectFit: fitAtual,
                  objectPosition: fitAtual === 'cover' ? objectPosition : undefined,
                  backgroundColor: fitAtual === 'contain' && !ambient ? '#0f172a' : undefined,
                  ...(banner.image_adjustments ? {
                    objectPosition: `${banner.image_adjustments.position?.x || 0}px ${banner.image_adjustments.position?.y || 0}px`,
                    transform: `scale(${banner.image_adjustments.scale || 1})`
                  } : {})
                }}
              />
            </CliqueDoBanner>
          </div>
          );
        })}
      </div>

      {/* Botões de Navegação */}
      {filteredBanners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={goToNext}
            className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-label="Próximo banner"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Indicadores */}
      {filteredBanners.length > 1 && (
        // PONTO 90 — indicadores colados na base e bem translúcidos (mesmo espírito
        // do "voltar ao topo"): antes encostavam na legenda e disputavam com o texto.
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1">
          {filteredBanners.map((_, index) => (
            // 📱 o pontinho continua com 8px de desenho, mas o botão tem 44px de
            // área de toque — no celular era praticamente impossível acertar.
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className="grid h-11 w-6 place-items-center"
              aria-label={`Ir para banner ${index + 1}`}
            >
              <span
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'bg-white/30 w-8' : 'w-2 bg-white/15 hover:bg-white/35'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}