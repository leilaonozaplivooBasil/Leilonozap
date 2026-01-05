import React, { useState } from 'react';
import { Copy, ExternalLink, CheckCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProductImagePreview({ imageUrls, onReorder }) {
  const validImages = imageUrls.filter(url => url && url.trim());
  const [coverIndex, setCoverIndex] = useState(0);

  const handleSetCover = (index) => {
    if (index === 0) return; // Já é capa
    
    const newImages = [...validImages];
    const [selectedImage] = newImages.splice(index, 1);
    newImages.unshift(selectedImage);
    
    setCoverIndex(0);
    if (onReorder) onReorder(newImages);
  };
  
  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    alert('✅ URL copiada!');
  };

  const copyAll = () => {
    const allUrls = validImages.join('\n');
    navigator.clipboard.writeText(allUrls);
    alert(`✅ ${validImages.length} URLs copiadas!`);
  };

  if (validImages.length === 0) {
    return (
      <div className="bg-gray-900/50 rounded-lg p-6 text-center text-gray-500 border border-gray-700">
        <p>📸 As imagens aparecerão aqui após importação</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 text-green-500" />
          {validImages.length} {validImages.length === 1 ? 'Imagem' : 'Imagens'}
        </h3>
        <Button 
          onClick={copyAll}
          size="sm"
          className="bg-green-600 hover:bg-green-700 h-7 text-xs"
        >
          <Copy className="w-3 h-3 mr-1" />
          Copiar Todas
        </Button>
      </div>
      
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {validImages.map((url, index) => (
          <div 
            key={index}
            className={`bg-gray-800 rounded-lg border-2 p-2 transition-all ${
              index === 0 ? 'border-yellow-500/50' : 'border-gray-700'
            }`}
          >
            {/* HEADER COMPACTO */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {index === 0 ? (
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                ) : (
                  <Button
                    onClick={() => handleSetCover(index)}
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-gray-400 hover:text-yellow-500"
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Definir Capa
                  </Button>
                )}
                <span className="text-white text-xs font-medium">
                  {index === 0 ? 'CAPA' : `#${index + 1}`}
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  onClick={() => copyToClipboard(url)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 h-6 px-2 text-xs"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  onClick={() => window.open(url, '_blank')}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 h-6 px-2 text-xs"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* PREVIEW MENOR */}
            <div style={{
              width: '100%',
              height: '120px',
              backgroundColor: '#000',
              borderRadius: '6px',
              marginBottom: '8px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #374151'
            }}>
              <img
                src={url}
                alt={`Preview ${index + 1}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block'
                }}
                onLoad={(e) => {
                  console.log(`✅ RENDERIZADA #${index + 1}:`, e.target.naturalWidth, 'x', e.target.naturalHeight);
                }}
                onError={(e) => {
                  console.error(`❌ FALHA #${index + 1}:`, url);
                  e.target.outerHTML = '<div style="color: #ef4444; padding: 10px; text-align: center; font-size: 11px;">❌ Erro</div>';
                }}
              />
            </div>

            {/* URL COMPACTA */}
            <div className="bg-gray-900 rounded px-2 py-1 border border-gray-700">
              <p className="text-[10px] text-gray-500 break-all font-mono leading-tight">
                {url}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}