import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const valoraNotes = [
  { value: 1, url: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/92dfe7c21_17cee75b0_90515FAF-DF1E-4B38-88A2-0DB1650A0338.png" },
  { value: 2, url: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/2caf4c091_D19AF866-7F01-4359-B34C-6E1E49BB5B662.png" },
  { value: 5, url: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/51d72aa1d_C92CFAFF-FF7B-450A-9148-2B1B09CE77A512.png" },
  { value: 20, url: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/940575a06_7E0EC402-D37F-4C7E-A9AF-9CBAFAEC67B5.png" },
  { value: 100, url: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/35cd22e8d_22E71172-1469-40C1-91F5-52FB1CEB81B7.png" },
  { value: 200, url: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/5af62ec46_560AB3F0-BC1C-455F-9909-8366C699B0A3.png" },
  { value: 500, url: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/e743cb8f9_A098D677-881A-4913-9F73-1B09CE77A512.png" },
  { value: 1000, url: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/3f149d7ea_9F6550BF-035D-4171-85DA-960040528E39.png" }
];



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
              className="w-[500px] h-72 rounded-2xl shadow-2xl border-4 relative transition-all cursor-pointer overflow-hidden bg-white"
              style={{ 
                boxShadow: isHovered ? '0 40px 120px rgba(0,0,0,0.8), 0 0 60px #1DB24A' : '0 30px 80px rgba(0,0,0,0.6)',
                borderColor: isHovered ? '#1DB24A' : 'rgba(255,255,255,0.3)'
              }}
            >
              <img 
                src={currentNote.url}
                alt={`Nota V$ ${currentNote.value}`} 
                className="w-full h-full object-cover"
                onLoad={() => setImagesLoaded(prev => ({ ...prev, [currentIndex]: true }))}
                onError={() => setImagesFailed(prev => ({ ...prev, [currentIndex]: true }))}
              />


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
              className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 px-8 py-3 rounded-full font-bold text-2xl shadow-lg border-2"
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
            aria-label={`Nota V$ ${note.value}`}
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
          Nota Valora Pay - V$ {currentNote.value}
        </motion.h3>
        <p className="text-gray-400">Indique e lucre com o sistema de alavancagem</p>
      </div>
    </div>
  );
}