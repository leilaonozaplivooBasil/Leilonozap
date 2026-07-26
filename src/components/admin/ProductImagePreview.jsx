import React from 'react';
import { Copy, ExternalLink, CheckCircle, Images, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProductImagePreview({ imageUrls }) {
  const validImages = imageUrls.filter(url => url && url.trim());
  
  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    alert('URL copiada!');
  };

  const copyAll = () => {
    const allUrls = validImages.join('\n');
    navigator.clipboard.writeText(allUrls);
    alert(` ${validImages.length} URLs copiadas!`);
  };

  if (validImages.length === 0) {
    return (
      <div className="bg-gray-900/50 rounded-lg p-6 text-center text-gray-500 border border-gray-700">
        <p className="flex items-center justify-center gap-1.5"><Images className="w-4 h-4" />As imagens aparecerão aqui após importação</p>
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
      
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {validImages.map((url, index) => (
          <div 
            key={index}
            className="bg-gray-800 rounded-lg border-2 border-gray-700 p-3"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-bold">
                <span className="inline-flex items-center gap-1">
                    {index === 0 ? <Trophy className="w-3 h-3" /> : <Images className="w-3 h-3" />}
                    {index === 0 ? 'IMAGEM DE CAPA' : `Imagem #${index + 1}`}
                  </span>
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={() => copyToClipboard(url)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 h-8"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar
                </Button>
                <Button
                  onClick={() => window.open(url, '_blank')}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 h-8"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Abrir
                </Button>
              </div>
            </div>

            {/* PREVIEW DA IMAGEM */}
            <div style={{
              width: '100%',
              height: '240px',
              backgroundColor: '#000',
              borderRadius: '8px',
              marginBottom: '12px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #374151'
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
                  console.log(`RENDERIZADA #${index + 1}:`, e.target.naturalWidth, 'x', e.target.naturalHeight);
                }}
                onError={(e) => {
                  console.error(`FALHA #${index + 1}:`, url);
                  e.target.outerHTML = '<div style="color: #ef4444; padding: 20px; text-align: center;">Erro ao carregar imagem</div>';
                }}
              />
            </div>

            {/* URL */}
            <div className="bg-gray-900 rounded p-2 border border-gray-700">
              <p className="text-xs text-gray-400 break-all font-mono">
                {url}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}