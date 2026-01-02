import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const valoraNotes = [
  { value: 1, url: "", name: "Micro-ondas", icon: "📻" },
  { value: 2, url: "", name: "Liquidificador", icon: "🌪️" },
  { value: 5, url: "", name: "Cafeteira", icon: "☕" },
  { value: 20, url: "", name: "Aspirador", icon: "🧹" },
  { value: 100, url: "", name: "Geladeira", icon: "❄️" },
  { value: 200, url: "", name: "Fogão", icon: "🔥" },
  { value: 500, url: "", name: "Máquina de Lavar", icon: "🌊" },
  { value: 1000, url: "", name: "Ar-Condicionado", icon: "❄️" }
];

const generatePlaceholder = (note) => {
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
      <defs>
        <linearGradient id="grad-${note.value}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#16a34a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#15803d;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="250" fill="url(#grad-${note.value})" rx="15"/>
      <text x="200" y="80" font-family="Arial, sans-serif" font-size="72" text-anchor="middle">${note.icon}</text>
      <text x="200" y="130" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ffffff" text-anchor="middle">V$ ${note.value}</text>
      <text x="200" y="165" font-family="Arial, sans-serif" font-size="24" fill="#dcfce7" text-anchor="middle">${note.name}</text>
      <circle cx="50" cy="50" r="20" fill="#ffffff" opacity="0.1"/>
      <circle cx="350" cy="200" r="30" fill="#ffffff" opacity="0.1"/>
    </svg>
  `)}`;
};

export default function ValoraNotesGallery() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState({});
  const [imagesFailed, setImagesFailed] = useState({});
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Marcar todas as imagens como carregadas (usando SVG gerado)
    const loadedState = {};
    valoraNotes.forEach((_, index) => {
      loadedState[index] = true;
    });
    setImagesLoaded(loadedState);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % valoraNotes.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const currentNote = valoraNotes[currentIndex];
  
  const getImageSrc = () => {
    return generatePlaceholder(currentNote);
  };

  return (
    <div className="relative w-full max-w-lg mx-auto py-12">
      <div className="relative h-80 flex items-center justify-center" style={{ perspective: '1500px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            className="absolute"
            initial={{ opacity: 0, scale: 0.8, rotateY: 20 }}
            animate={{ 
              opacity: 1, 
              scale: isHovered ? 1.1 : 1,
              y: isHovered ? -20 : 0,
              rotateY: 0
            }}
            exit={{ opacity: 0, scale: 0.8, rotateY: -20 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            onMouseEnter={() => { setIsHovered(true); setIsPaused(true); }}
            onMouseLeave={() => { setIsHovered(false); setIsPaused(false); }}
          >
            <div 
              className="w-96 h-56 rounded-2xl shadow-2xl border-4 relative transition-all cursor-pointer overflow-hidden"
              style={{ 
                boxShadow: isHovered ? '0 40px 120px rgba(0,0,0,0.8), 0 0 60px #1DB24A' : '0 30px 80px rgba(0,0,0,0.6)',
                borderColor: isHovered ? '#1DB24A' : 'rgba(255,255,255,0.3)'
              }}
            >
              <img 
                src={getImageSrc()}
                alt={`Nota ${currentNote.name}`} 
                className="w-full h-full object-cover rounded-xl"
                style={{ opacity: imagesLoaded[currentIndex] ? 1 : 0.7 }}
              />
              
              {!imagesLoaded[currentIndex] && !imagesFailed[currentIndex] && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/90">
                  <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mb-3"></div>
                  <p className="text-white text-sm">Carregando V$ {currentNote.value}...</p>
                </div>
              )}

              <button
                onClick={() => {
                  setCurrentIndex(prev => (prev - 1 + valoraNotes.length) % valoraNotes.length);
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 4000);
                }}
                className="absolute left-0 top-0 w-1/2 h-full z-10 bg-transparent cursor-pointer"
                aria-label="Anterior"
              />
              
              <button
                onClick={() => {
                  setCurrentIndex(prev => (prev + 1) % valoraNotes.length);
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 4000);
                }}
                className="absolute right-0 top-0 w-1/2 h-full z-10 bg-transparent cursor-pointer"
                aria-label="Próxima"
              />
            </div>
            
            <motion.div 
              className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 px-8 py-3 rounded-full font-bold text-xl shadow-lg border-2"
              style={{
                background: isHovered ? 'linear-gradient(to right, #1DB24A, #16a34a)' : 'linear-gradient(to right, #1f2937, #111827)',
                borderColor: isHovered ? 'white' : 'rgba(75, 85, 99, 0.3)',
                color: 'white'
              }}
            >
              V$ {currentNote.value}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-3 mt-16">
        {valoraNotes.map((note, index) => (
          <button 
            key={note.value} 
            onClick={() => {
              setCurrentIndex(index);
              setIsPaused(true);
              setTimeout(() => setIsPaused(false), 4000);
            }}
            className={`transition-all duration-300 rounded-full ${index === currentIndex ? 'w-10 h-3' : 'w-3 h-3'}`}
            style={{
              backgroundColor: index === currentIndex ? '#1DB24A' : '#4B5563',
              boxShadow: index === currentIndex ? '0 0 20px #1DB24A' : 'none'
            }}
            aria-label={`Nota V$ {note.value}`}
          />
        ))}
      </div>

      <div className="text-center mt-12">
        <motion.h3 
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-bold mb-2 text-white"
        >
          {currentNote.name} - V$ {currentNote.value}
        </motion.h3>
        <p className="text-gray-400">Sua moeda exclusiva para arrematar produtos</p>
      </div>
    </div>
  );
}