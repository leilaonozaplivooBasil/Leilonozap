import React from 'react';

export default function ProductImagePreview({ imageUrls }) {
  const validImages = imageUrls.filter(url => url && url.trim());
  
  console.log('🖼️ PREVIEW - Imagens válidas:', validImages.length);
  
  if (validImages.length === 0) {
    return (
      <div className="bg-gray-900/50 rounded-lg p-6 text-center text-gray-500 border border-gray-700">
        <svg className="w-12 h-12 mb-3 opacity-30 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">As imagens aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
      <h3 className="text-white text-sm mb-3 font-bold">Preview das Imagens ({validImages.length})</h3>
      <div className="grid grid-cols-2 gap-3">
        {validImages.map((url, index) => {
          console.log(`🖼️ Renderizando imagem ${index + 1}:`, url);
          
          return (
            <div 
              key={index}
              style={{
                width: '100%',
                height: '120px',
                backgroundColor: '#1f2937',
                borderRadius: '8px',
                border: '1px solid #374151',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <img 
                src={url} 
                alt={`Produto ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onLoad={() => {
                  console.log(`✅ PREVIEW IMAGEM ${index + 1} CARREGADA!`);
                }}
                onError={(e) => {
                  console.error(`❌ PREVIEW ERRO ${index + 1}:`, url);
                  e.target.style.display = 'none';
                }}
              />
              
              <div style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: 'white',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                {index === 0 ? 'CAPA' : `#${index + 1}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}