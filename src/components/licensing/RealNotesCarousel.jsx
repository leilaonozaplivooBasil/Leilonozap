import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const realNotes = [
  { value: 2, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Anverso_da_c%C3%A9dula_de_2_reais_%28segunda_fam%C3%ADlia%29.jpg/800px-Anverso_da_c%C3%A9dula_de_2_reais_%28segunda_fam%C3%ADlia%29.jpg", color: "#4A90E2" },
  { value: 5, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Anverso_da_c%C3%A9dula_de_5_reais_%28segunda_fam%C3%ADlia%29.jpg/800px-Anverso_da_c%C3%A9dula_de_5_reais_%28segunda_fam%C3%ADlia%29.jpg", color: "#9B59B6" },
  { value: 10, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Anverso_da_c%C3%A9dula_de_10_reais_%28segunda_fam%C3%ADlia%29.jpg/800px-Anverso_da_c%C3%A9dula_de_10_reais_%28segunda_fam%C3%ADlia%29.jpg", color: "#E74C3C" },
  { value: 20, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Anverso_da_c%C3%A9dula_de_20_reais_%28segunda_fam%C3%ADlia%29.jpg/800px-Anverso_da_c%C3%A9dula_de_20_reais_%28segunda_fam%C3%ADlia%29.jpg", color: "#F39C12" },
  { value: 50, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Anverso_da_c%C3%A9dula_de_50_reais_%28segunda_fam%C3%ADlia%29.jpg/800px-Anverso_da_c%C3%A9dula_de_50_reais_%28segunda_fam%C3%ADlia%29.jpg", color: "#A0826D" },
  { value: 100, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Anverso_da_c%C3%A9dula_de_100_reais_%28segunda_fam%C3%ADlia%29.jpg/800px-Anverso_da_c%C3%A9dula_de_100_reais_%28segunda_fam%C3%ADlia%29.jpg", color: "#3498DB" },
  { value: 200, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Anverso_da_c%C3%A9dula_de_200_reais_%28segunda_fam%C3%ADlia%29.jpg/800px-Anverso_da_c%C3%A9dula_de_200_reais_%28segunda_fam%C3%ADlia%29.jpg", color: "#95A5A6" }
];

export default function RealNotesCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % realNotes.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const currentNote = realNotes[currentIndex];

  return (
    <div className="relative w-full max-w-2xl mx-auto py-8">
      <div className="relative h-64 flex items-center justify-center" style={{ perspective: '1500px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            className="absolute"
            initial={{ opacity: 0, scale: 0.8, rotateY: 20 }}
            animate={{ 
              opacity: 1, 
              scale: isHovered ? 1.05 : 1,
              y: isHovered ? -10 : 0,
              rotateY: 0
            }}
            exit={{ opacity: 0, scale: 0.8, rotateY: -20 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            onMouseEnter={() => { setIsHovered(true); setIsPaused(true); }}
            onMouseLeave={() => { setIsHovered(false); setIsPaused(false); }}
          >
            <div 
              className="w-full max-w-xl h-56 rounded-2xl shadow-2xl border-4 relative transition-all cursor-pointer overflow-hidden"
              style={{ 
                boxShadow: isHovered ? `0 40px 120px rgba(0,0,0,0.8), 0 0 60px ${currentNote.color}` : '0 30px 80px rgba(0,0,0,0.6)',
                borderColor: isHovered ? currentNote.color : 'rgba(255,255,255,0.2)'
              }}
            >
              <img 
                src={currentNote.url}
                alt={`Cédula R$ ${currentNote.value}`} 
                className="w-full h-full object-cover"
              />

              <button
                onClick={() => {
                  setCurrentIndex(prev => (prev - 1 + realNotes.length) % realNotes.length);
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 4000);
                }}
                className="absolute left-0 top-0 w-1/2 h-full z-10 bg-transparent cursor-pointer"
                aria-label="Anterior"
              />
              
              <button
                onClick={() => {
                  setCurrentIndex(prev => (prev + 1) % realNotes.length);
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 4000);
                }}
                className="absolute right-0 top-0 w-1/2 h-full z-10 bg-transparent cursor-pointer"
                aria-label="Próxima"
              />
            </div>
            
            <motion.div 
              className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 px-8 py-3 rounded-full font-bold text-2xl shadow-lg border-2"
              style={{
                background: isHovered ? `linear-gradient(to right, ${currentNote.color}, #16a34a)` : 'linear-gradient(to right, #1f2937, #111827)',
                borderColor: isHovered ? 'white' : 'rgba(75, 85, 99, 0.3)',
                color: 'white'
              }}
            >
              R$ {currentNote.value}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-3 mt-12">
        {realNotes.map((note, index) => (
          <button 
            key={note.value} 
            onClick={() => {
              setCurrentIndex(index);
              setIsPaused(true);
              setTimeout(() => setIsPaused(false), 4000);
            }}
            className={`transition-all duration-300 rounded-full ${index === currentIndex ? 'w-10 h-3' : 'w-3 h-3'}`}
            style={{
              backgroundColor: index === currentIndex ? currentNote.color : '#4B5563',
              boxShadow: index === currentIndex ? `0 0 20px ${currentNote.color}` : 'none'
            }}
            aria-label={`Cédula R$ ${note.value}`}
          />
        ))}
      </div>

      <div className="text-center mt-8">
        <motion.h3 
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-bold mb-2 text-white"
        >
          Cédula de R$ {currentNote.value}
        </motion.h3>
        <p className="text-gray-400">Ganhe em dinheiro real com cada indicação</p>
      </div>
    </div>
  );
}