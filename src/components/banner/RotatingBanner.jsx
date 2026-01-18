import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function RotatingBanner({ banners }) { if (!Array.isArray(banners) || banners.length === 0) return null;
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

  const filteredBanners = banners.filter(banner => {
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
    <div className="relative w-full h-64 md:h-80 lg:h-96 rounded-2xl overflow-hidden group">
      {/* Imagem do Banner */}
      <div className="relative w-full h-full">
        {filteredBanners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {banner.link_url ? (
              <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full overflow-hidden">
                <img
                  src={banner.image_url}
                  alt={banner.title || 'Banner'}
                  className="w-full h-full cursor-pointer"
                  loading="eager"
                  fetchpriority="high"
                  decoding="sync"
                  style={{
                    imageRendering: '-webkit-optimize-contrast',
                    objectFit: 'cover',
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
                  className="w-full h-full"
                  loading="eager"
                  fetchpriority="high"
                  decoding="sync"
                  style={{
                    imageRendering: '-webkit-optimize-contrast',
                    objectFit: 'cover',
                    ...(banner.image_adjustments ? {
                      objectPosition: `${banner.image_adjustments.position?.x || 0}px ${banner.image_adjustments.position?.y || 0}px`,
                      transform: `scale(${banner.image_adjustments.scale || 1})`
                    } : {})
                  }}
                />
              </div>
            )}
          </div>
        ))}
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {filteredBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Ir para banner ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}