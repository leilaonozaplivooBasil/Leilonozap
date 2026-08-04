import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ambient: preenche as laterais/sobras do container com a própria arte desfocada
// (em vez de barras chapadas) quando fit="contain" e o banner não cobre tudo.
// PONTO 92 — mobileFit: permite um encaixe diferente só no celular (ex.: a Home
// usa "contain" no desktop, mas no mobile precisa "cover" pra não sobrar faixa
// escura acima/abaixo, igual à Loja Virtual). Sem mobileFit, nada muda.
export default function RotatingBanner({ banners, fit = 'cover', mobileFit, heightClass = 'h-64 md:h-80 lg:h-96', rounded = true, ambient = false }) {
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
    <div className={`relative w-full ${heightClass} ${rounded ? 'rounded-2xl' : ''} overflow-hidden group`}>
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
                        className={`relative w-full h-full ${videoFitClass} ${banner.link_url ? 'cursor-pointer' : ''}`}
                        style={{ objectPosition: videoObjectPosition, backgroundColor: isContain ? '#0f172a' : undefined }}
                      />
                    </>
                  );
                  const caption = (
                    <div className="nz-video-caption absolute inset-x-0 bottom-0 z-10 pt-14 pb-12 sm:pb-14 md:pb-16 px-4 sm:px-6 md:px-8 bg-gradient-to-t from-black/85 via-black/45 to-transparent text-left">
                      <p className="text-base sm:text-xl md:text-2xl font-bold text-white leading-tight max-w-[88%] sm:max-w-[70%]">
                        {banner.caption_title || banner.title}
                      </p>
                      {banner.caption_subtitle && (
                        <p className="mt-1 text-xs sm:text-base md:text-lg text-nz-verde-claro font-medium leading-snug max-w-[88%] sm:max-w-[70%]">
                          {banner.caption_subtitle}
                        </p>
                      )}
                    </div>
                  );
                  return banner.link_url ? (
                    <a href={banner.link_url} className="relative block w-full h-full">
                      {videoContent}
                      {caption}
                    </a>
                  ) : (
                    <div className="relative w-full h-full">
                      {videoContent}
                      {caption}
                    </div>
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
            {banner.link_url ? (
              <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full overflow-hidden">
                <img
                  src={banner.image_url}
                  alt={banner.title || 'Banner'}
                  className={`w-full h-full cursor-pointer relative ${fitAtual === 'contain' ? 'object-contain' : ''} ${fitAtual === 'contain' && !ambient ? 'bg-gray-900' : ''}`}
                  loading={shouldEagerLoad ? "eager" : "lazy"}
                  fetchPriority={isActive ? "high" : "low"}
                  decoding={shouldEagerLoad ? "sync" : "async"}
                  style={{
                    objectFit: fitAtual,
                    backgroundColor: fitAtual === 'contain' && !ambient ? '#0f172a' : undefined,
                    ...(banner.image_adjustments ? {
                      objectPosition: `${banner.image_adjustments.position?.x || 0}px ${banner.image_adjustments.position?.y || 0}px`,
                      transform: `scale(${banner.image_adjustments.scale || 1})`
                    } : {})
                  }}
                />
              </a>
            ) : (
              <div className="w-full h-full overflow-hidden">
                <img
                  src={banner.image_url}
                  alt={banner.title || 'Banner'}
                  className={`w-full h-full relative ${fitAtual === 'contain' ? 'object-contain' : ''} ${fitAtual === 'contain' && !ambient ? 'bg-gray-900' : ''}`}
                  loading={shouldEagerLoad ? "eager" : "lazy"}
                  fetchPriority={isActive ? "high" : "low"}
                  decoding={shouldEagerLoad ? "sync" : "async"}
                  style={{
                    objectFit: fitAtual,
                    backgroundColor: fitAtual === 'contain' && !ambient ? '#0f172a' : undefined,
                    ...(banner.image_adjustments ? {
                      objectPosition: `${banner.image_adjustments.position?.x || 0}px ${banner.image_adjustments.position?.y || 0}px`,
                      transform: `scale(${banner.image_adjustments.scale || 1})`
                    } : {})
                  }}
                />
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Botões de Navegação */}
      {filteredBanners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-label="Próximo banner"
          >
            <ChevronRight className="w-6 h-6" />
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