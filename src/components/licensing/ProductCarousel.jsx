import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';

const products = [
  {
    name: "Eletrônicos",
    buyPrice: 1200,
    sellPrice: 1800,
    profit: 54,
    icon: "📱"
  },
  {
    name: "Eletrodomésticos",
    buyPrice: 800,
    sellPrice: 1400,
    profit: 42,
    icon: "🔌"
  },
  {
    name: "Móveis",
    buyPrice: 2000,
    sellPrice: 3200,
    profit: 96,
    icon: "🛋️"
  }
];

export default function ProductCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex(prev => (prev + 1) % products.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex(prev => (prev - 1 + products.length) % products.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 4000);
  };

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex(prev => (prev + 1) % products.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 4000);
  };

  const currentProduct = products[currentIndex];

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.8
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.8
    })
  };

  return (
    <div className="mb-12 sm:mb-16 max-w-4xl mx-auto px-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-8 sm:mb-12">
        Exemplo de <span className="text-green-400">Produtos</span>
      </h2>

      <div className="relative h-96 flex items-center justify-center">
        {/* Botões de navegação */}
        <button
          onClick={handlePrev}
          className="absolute left-0 z-20 p-3 rounded-full bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-green-500 transition-all shadow-lg"
          aria-label="Produto anterior"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        <button
          onClick={handleNext}
          className="absolute right-0 z-20 p-3 rounded-full bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-green-500 transition-all shadow-lg"
          aria-label="Próximo produto"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>

        {/* Card do produto */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="absolute w-full max-w-md"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700 shadow-2xl hover:shadow-green-500/20 transition-all">
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">{currentProduct.icon}</div>
                <Package className="w-12 h-12 text-green-400 mb-4 mx-auto" />
                <h3 className="text-2xl font-bold text-white mb-6">{currentProduct.name}</h3>
                <div className="space-y-3 text-lg text-gray-300">
                  <p><strong className="text-white">Compra:</strong> R$ {currentProduct.buyPrice.toLocaleString('pt-BR')}</p>
                  <p><strong className="text-white">Venda:</strong> R$ {currentProduct.sellPrice.toLocaleString('pt-BR')}</p>
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-green-400 font-bold text-xl">
                      Seu lucro: R$ {currentProduct.profit.toFixed(2)} (3%)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicadores */}
      <div className="flex justify-center gap-3 mt-8">
        {products.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentIndex ? 1 : -1);
              setCurrentIndex(index);
              setIsPaused(true);
              setTimeout(() => setIsPaused(false), 4000);
            }}
            className={`transition-all duration-300 rounded-full ${
              index === currentIndex ? 'w-10 h-3' : 'w-3 h-3'
            }`}
            style={{
              backgroundColor: index === currentIndex ? '#1DB24A' : '#4B5563',
              boxShadow: index === currentIndex ? '0 0 20px #1DB24A' : 'none'
            }}
            aria-label={`Ver ${products[index].name}`}
          />
        ))}
      </div>
    </div>
  );
}