import React, { useState } from 'react';
import { Copy, ExternalLink, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ImagePreviewCard({ url, index }) {
  const [status, setStatus] = useState('loading'); // loading, loaded, error
  const [dimensions, setDimensions] = useState(null);

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    alert('✅ URL copiada!');
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* THUMBNAIL */}
      <div className="relative bg-gray-900 h-40 flex items-center justify-center">
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-red-400 text-center p-4">
            <XCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-xs">Erro ao carregar</p>
          </div>
        )}

        <img
          src={url}
          alt={`Produto ${index + 1}`}
          className="max-w-full max-h-full object-contain"
          onLoad={(e) => {
            setStatus('loaded');
            setDimensions({
              width: e.target.naturalWidth,
              height: e.target.naturalHeight
            });
            console.log(`✅ IMG ${index + 1} LOADED:`, e.target.naturalWidth, 'x', e.target.naturalHeight);
          }}
          onError={() => {
            setStatus('error');
            console.error(`❌ IMG ${index + 1} FAILED:`, url);
          }}
          style={{ display: status === 'error' ? 'none' : 'block' }}
        />

        {/* BADGE */}
        <div className="absolute top-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded">
          {index === 0 ? '🏆 CAPA' : `#${index + 1}`}
        </div>

        {/* SUCCESS INDICATOR */}
        {status === 'loaded' && (
          <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {dimensions && `${dimensions.width}x${dimensions.height}`}
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="p-3 flex gap-2">
        <Button
          onClick={copyUrl}
          size="sm"
          variant="outline"
          className="flex-1"
        >
          <Copy className="w-3 h-3 mr-1" />
          Copiar URL
        </Button>
        <Button
          onClick={() => window.open(url, '_blank')}
          size="sm"
          variant="outline"
        >
          <ExternalLink className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default function ProductImagePreview({ imageUrls }) {
  const validImages = imageUrls.filter(url => url && url.trim());
  
  const copyAll = () => {
    const allUrls = validImages.join(',\n');
    navigator.clipboard.writeText(allUrls);
    alert(`✅ ${validImages.length} URLs copiadas!`);
  };

  if (validImages.length === 0) {
    return (
      <div className="bg-gray-900/50 rounded-lg p-6 text-center text-gray-500 border border-gray-700">
        <p className="text-sm">📸 As imagens aparecerão aqui após a importação</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          {validImages.length} {validImages.length === 1 ? 'Imagem Importada' : 'Imagens Importadas'}
        </h3>
        <Button 
          onClick={copyAll}
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copiar Todas
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
        {validImages.map((url, index) => (
          <ImagePreviewCard 
            key={index}
            url={url}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}