import React from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProductImagePreview({ imageUrls }) {
  const validImages = imageUrls.filter(url => url && url.trim());
  
  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    alert('✅ URL copiada!');
  };

  const copyAll = () => {
    const allUrls = validImages.join(',\n');
    navigator.clipboard.writeText(allUrls);
    alert(`✅ ${validImages.length} URLs copiadas!`);
  };

  if (validImages.length === 0) {
    return (
      <div className="bg-gray-900/50 rounded-lg p-6 text-center text-gray-500 border border-gray-700">
        <p>📸 As URLs das imagens aparecerão aqui após importação</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-sm font-bold">
          ✅ {validImages.length} {validImages.length === 1 ? 'Imagem Importada' : 'Imagens Importadas'}
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
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {validImages.map((url, index) => (
          <div 
            key={index}
            className="bg-gray-800 rounded-lg p-3 border border-gray-700"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-white font-bold text-sm">
                {index === 0 ? '🏆 CAPA' : `#${index + 1}`}
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={() => copyToClipboard(url)}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar
                </Button>
                <Button
                  onClick={() => window.open(url, '_blank')}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Abrir
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-400 break-all font-mono">
              {url}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}