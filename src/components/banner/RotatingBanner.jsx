import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ambient: preenche as laterais/sobras do container com a própria arte desfocada
// (em vez de barras chapadas) quando fit="contain" e o banner não cobre tudo.
export default function RotatingBanner({ banners, fit = 'cover', heightClass = 'h-64 md:h-80 lg:h-96', rounded = true, ambient = false }) {
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

  const filteredBanners = !Array.isArray(banners) ? [] : banners.filter(banner => {
    const deviceType = banner.device_type || 'desktop';
    return deviceType === (isMobile ? 'mobile' : 'desktop');
  });

  useEffect(() => {
    if (filteredBanners.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredBanners.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [filteredBanners.length]);

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
                {banner.link_url ? (
                  <a href={banner.link_url} className="relative block w-full h-full">
                    <video
                      src={banner.video_url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload={shouldEagerLoad ? 'auto' : 'metadata'}
                      className="w-full h-full object-cover cursor-pointer"
                      style={{ objectPosition: 'center 20%' }}
                    />
                    <span className="nz-video-caption absolute top-3 right-3 md:top-5 md:right-5 z-10 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] sm:text-xs font-semibold tracking-wide max-w-[75%] text-right">
                      Torne-se um <span className="text-nz-verde-claro">Vendedor</span>, <span className="text-nz-verde-claro">Licenciado</span> ou <span className="text-nz-verde-claro">Influencer</span>
                    </span>
                  </a>
                ) : (
                  <div className="relative w-full h-full">
                    <video
                      src={banner.video_url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload={shouldEagerLoad ? 'auto' : 'metadata'}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: 'center 20%' }}
                    />
                    <span className="nz-video-caption absolute top-3 right-3 md:top-5 md:right-5 z-10 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] sm:text-xs font-semibold tracking-wide max-w-[75%] text-right">
                      Torne-se um <span className="text-nz-verde-claro">Vendedor</span>, <span className="text-nz-verde-claro">Licenciado</span> ou <span className="text-nz-verde-claro">Influencer</span>
                    </span>
                  </div>
                )}
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
                  className={`w-full h-full cursor-pointer relative ${fit === 'contain' ? 'object-contain' : ''} ${fit === 'contain' && !ambient ? 'bg-gray-900' : ''}`}
                  loading={shouldEagerLoad ? "eager" : "lazy"}
                  fetchPriority={isActive ? "high" : "low"}
                  decoding={shouldEagerLoad ? "sync" : "async"}
                  style={{
                    objectFit: fit,
                    backgroundColor: fit === 'contain' && !ambient ? '#0f172a' : undefined,
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
                  className={`w-full h-full relative ${fit === 'contain' ? 'object-contain' : ''} ${fit === 'contain' && !ambient ? 'bg-gray-900' : ''}`}
                  loading={shouldEagerLoad ? "eager" : "lazy"}
                  fetchPriority={isActive ? "high" : "low"}
                  decoding={shouldEagerLoad ? "sync" : "async"}
                  style={{
                    objectFit: fit,
                    backgroundColor: fit === 'contain' && !ambient ? '#0f172a' : undefined,
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
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1">
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
                  index === currentIndex ? 'bg-white w-8' : 'w-2 bg-white/50 hover:bg-white/75'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}