import React from 'react';

export default function ProductImagePreview({ imageUrls }) {
  const validImages = imageUrls.filter(url => url && url.trim());
  
  console.log('🖼️ PREVIEW - Total válidas:', validImages.length, validImages);
  
  if (validImages.length === 0) {
    return (
      <div style={{
        backgroundColor: 'rgba(17, 24, 39, 0.5)',
        borderRadius: '8px',
        padding: '24px',
        textAlign: 'center',
        color: '#9ca3af',
        border: '1px solid #374151'
      }}>
        <p>📸 As imagens aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'rgba(17, 24, 39, 0.5)',
      borderRadius: '8px',
      padding: '16px',
      border: '1px solid #374151'
    }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px', fontWeight: 'bold' }}>
        ✅ Preview das Imagens ({validImages.length})
      </h3>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px'
      }}>
        {validImages.map((url, index) => (
          <div 
            key={index}
            style={{
              width: '100%',
              height: '140px',
              backgroundColor: '#1f2937',
              borderRadius: '8px',
              border: '2px solid #4b5563',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* IMAGEM DIRETA SEM ABSTRAÇÕES */}
            <img 
              src={url}
              alt={`Produto ${index + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                display: 'block'
              }}
              onLoad={(e) => {
                console.log(`✅ IMG ${index + 1} LOADED - Dimensões:`, e.target.naturalWidth, 'x', e.target.naturalHeight);
                // FORÇA VISIBILIDADE
                e.target.style.opacity = '1';
                e.target.style.visibility = 'visible';
              }}
              onError={(e) => {
                console.error(`❌ IMG ${index + 1} ERROR:`, url);
              }}
            />
            
            {/* BADGE */}
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: 'rgba(0,0,0,0.9)',
              color: 'white',
              fontSize: '11px',
              padding: '4px 8px',
              borderRadius: '6px',
              fontWeight: 'bold',
              zIndex: 100
            }}>
              {index === 0 ? '🏆 CAPA' : `#${index + 1}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}