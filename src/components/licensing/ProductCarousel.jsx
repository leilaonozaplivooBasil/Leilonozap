import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ProductCarousel({ onBuyClick }) {
  const [products, setProducts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await base44.entities.FeaturedProduct.filter({ is_active: true }, 'order');
        if (data && data.length > 0) {
          setProducts(data);
        }
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8,
      rotateY: direction > 0 ? 45 : -45
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8,
      rotateY: direction < 0 ? 45 : -45
    })
  };

  const paginate = (newDirection) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      let nextIndex = prevIndex + newDirection;
      if (nextIndex < 0) nextIndex = products.length - 1;
      if (nextIndex >= products.length) nextIndex = 0;
      return nextIndex;
    });
  };

  useEffect(() => {
    if (isPaused || products.length === 0) return;

    const interval = setInterval(() => {
      paginate(1);
    }, 4000);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, products.length]);

  if (isLoading) {
    return (
      <div className="w-full py-12 px-4">
        <div className="text-center text-gray-400">Carregando produtos...</div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  const currentProduct = products[currentIndex];

  return (
    <div className="w-full py-8 sm:py-12 px-3 sm:px-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
        Produtos em <span className="text-green-400">Destaque</span>
      </h2>
      <p className="text-sm sm:text-base text-gray-400 text-center mb-8 sm:mb-12">
        Invista e lucre com produtos selecionados
      </p>

      <div className="relative max-w-5xl mx-auto" style={{ perspective: '2000px' }}>
        {/* Background Stacked Cards - ESCONDE EM MOBILE */}
        <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none">
          <div
            className="absolute w-[85%] h-[400px] bg-gray-800/40 rounded-2xl border border-gray-700/50"
            style={{ transform: 'translateZ(-100px) scale(0.9)', filter: 'blur(2px)' }}
          />
          <div
            className="absolute w-[90%] h-[420px] bg-gray-800/60 rounded-2xl border border-gray-700/50"
            style={{ transform: 'translateZ(-50px) scale(0.95)', filter: 'blur(1px)' }}
          />
        </div>

        {/* Main Card Container - ALTURA REDUZIDA MOBILE */}
        <div className="relative h-[500px] sm:h-[450px] flex items-center justify-center">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 },
                rotateY: { duration: 0.4 }
              }}
              className="absolute w-full max-w-3xl"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div className="bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-gray-700 overflow-hidden transform-gpu">
                {/* IMAGEM RESPONSIVA */}
                <div className="relative h-48 sm:h-64 md:h-80 overflow-hidden bg-gray-900">
                  <img
                    src={currentProduct.image_url}
                    alt={currentProduct.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-green-600 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg">
                    {currentProduct.category}
                  </div>
                </div>

                <div className="p-3 sm:p-4 md:p-6">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3">{currentProduct.name}</h3>

                  <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                    <div className="bg-gray-900/50 rounded-lg p-2 sm:p-3 border border-gray-700">
                      <p className="text-gray-400 text-xs sm:text-sm mb-1">Investimento</p>
                      <p className="text-base sm:text-xl md:text-2xl font-bold text-white break-words">{currentProduct.investment}</p>
                    </div>
                    <div className="bg-green-600/10 rounded-lg p-2 sm:p-3 border border-green-500/30">
                      <p className="text-gray-400 text-xs sm:text-sm mb-1">Lucro Estimado (3%)</p>
                      <p className="text-base sm:text-xl md:text-2xl font-bold text-green-400 break-words">{currentProduct.expected_return}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400">
                    <span className="flex items-center gap-1">⏱️ Retorno em 60 dias</span>
                    <span className="flex items-center gap-1">📦 Gestão 100% nossa</span>
                  </div>

                  <button
                    onClick={() => {
                      if (onBuyClick) onBuyClick(currentProduct);
                    }}
                    className="mt-4 sm:mt-5 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 sm:py-4 rounded-xl text-sm sm:text-base border-2 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] transition-all flex items-center justify-center gap-2"
                  >
                    🛒 Comprar Pacote
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows - MAIORES EM MOBILE */}
          <button
            onClick={() => paginate(-1)}
            className="absolute left-1 sm:left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 sm:w-14 sm:h-14 bg-gray-800/90 hover:bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>

          <button
            onClick={() => paginate(1)}
            className="absolute right-1 sm:right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 sm:w-14 sm:h-14 bg-gray-800/90 hover:bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg"
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        </div>

        {/* Indicators */}
        <div className="flex justify-center gap-2 sm:gap-4 mt-6 sm:mt-12">
          {products.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex
                  ? 'w-6 sm:w-8 bg-green-500'
                  : 'w-2 bg-gray-600 hover:bg-gray-500'
                }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}