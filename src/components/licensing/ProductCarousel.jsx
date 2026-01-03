import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Package } from 'lucide-react';

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
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % products.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const currentProduct = products[currentIndex];

  return (
    <div className="mb-12 sm:mb-16 max-w-4xl mx-auto px-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-8 sm:mb-12">
        Exemplo de <span className="text-green-400">Produtos</span>
      </h2>

      <div className="relative w-full max-w-lg mx-auto py-12">
        <div className="relative h-96 flex items-center justify-center" style={{ perspective: '1500px' }}>
          {/* Cards de fundo */}
          {products.map((product, index) => {
            const offset = (index - currentIndex + products.length) % products.length;
            const isActive = offset === 0;
            
            return (
              <motion.div
                key={product.name}
                className="absolute"
                animate={{
                  scale: isActive ? (isHovered ? 1.05 : 1) : 0.85 - (offset * 0.05),
                  y: isActive ? (isHovered ? -10 : 0) : offset * 15,
                  z: isActive ? 0 : -offset * 100,
                  opacity: offset < 2 ? 1 : 0,
                  rotateY: isActive ? 0 : offset * 5
                }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ 
                  zIndex: products.length - offset,
                  pointerEvents: isActive ? 'auto' : 'none'
                }}
                onMouseEnter={() => { if (isActive) { setIsHovered(true); setIsPaused(true); } }}
                onMouseLeave={() => { setIsHovered(false); setIsPaused(false); }}
              >
                <Card 
                  className="w-[400px] h-[280px] cursor-pointer bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl transition-all"
                  style={{
                    boxShadow: isActive && isHovered 
                      ? '0 40px 120px rgba(0,0,0,0.8), 0 0 60px #1DB24A' 
                      : '0 30px 80px rgba(0,0,0,0.6)',
                    borderColor: isActive && isHovered ? '#1DB24A' : 'rgba(107, 114, 128, 0.5)'
                  }}
                  onClick={() => {
                    if (!isActive) {
                      setCurrentIndex(index);
                      setIsPaused(true);
                      setTimeout(() => setIsPaused(false), 4000);
                    }
                  }}
                >
                  <CardContent className="p-6 text-center h-full flex flex-col justify-center">
                    <div className="text-5xl mb-3">{product.icon}</div>
                    <Package className="w-10 h-10 text-green-400 mb-3 mx-auto" />
                    <h3 className="text-xl font-bold text-white mb-4">{product.name}</h3>
                    <div className="space-y-2 text-base text-gray-300">
                      <p><strong className="text-white">Compra:</strong> R$ {product.buyPrice.toLocaleString('pt-BR')}</p>
                      <p><strong className="text-white">Venda:</strong> R$ {product.sellPrice.toLocaleString('pt-BR')}</p>
                      <p className="text-green-400 font-bold text-lg mt-3">
                        Lucro: R$ {product.profit.toFixed(2)} (3%)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Indicadores */}
        <div className="flex justify-center gap-3 mt-8">
          {products.map((_, index) => (
            <button
              key={index}
              onClick={() => {
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
    </div>
  );
}