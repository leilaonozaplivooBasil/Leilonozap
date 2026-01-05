import React from 'react';

export default function ProductImagePreview({ imageUrls }) {
  const validImages = imageUrls.filter(url => url && url.trim());
  
  if (validImages.length === 0) {
    return (
      <div className="bg-gray-900/50 rounded-lg p-6 text-center text-gray-500 border border-gray-700 h-full flex flex-col items-center justify-center">
        <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">As imagens aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {validImages.map((url, index) => (
          <div 
            key={url}
            className="relative w-full h-24 rounded overflow-hidden border border-gray-600"
            style={{ backgroundColor: '#1f2937' }}
          >
            <img 
              src={url} 
              alt={`Produto ${index + 1}`} 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                zIndex: 1
              }}
              onLoad={(e) => {
                console.log(`✅ PREVIEW IMAGEM ${index + 1} CARREGADA!`);
              }}
              onError={(e) => {
                console.error(`❌ PREVIEW ERRO ${index + 1}:`, url);
                e.target.src = 'https://via.placeholder.com/150?text=Erro';
              }}
            />
            
            <div 
              className="absolute top-1 right-1 bg-black/80 text-white text-xs px-2 py-1 rounded font-bold"
              style={{ pointerEvents: 'none', zIndex: 10 }}
            >
              {index === 0 ? 'Capa' : index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}