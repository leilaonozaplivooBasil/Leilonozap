import React from 'react';
import { Star, Trash2 } from 'lucide-react';

// 📸 Grade de fotos do produto com ações SEMPRE VISÍVEIS (regra do projeto:
// botão que só aparece no hover não funciona em celular/tablet).
// - "Principal": move a foto para a posição 0 (a loja usa image_urls[0] como capa).
// - Lixeira: remove só aquela foto.
// Nada de arrastar aqui: o arraste nunca foi implementado e a foto "voltava
// para o lugar", passando a impressão de bug.
export default function GradeFotosProduto({ urls = [], onDefinirPrincipal, onRemover }) {
  return (
    <>
      {urls.map((url, index) => (
        <div key={`${url}-${index}`} className="relative">
          <img
            src={url}
            alt={`Produto ${index + 1}`}
            className={`w-full h-32 object-cover rounded-lg border-2 ${
              index === 0 ? 'border-blue-600' : 'border-gray-200'
            }`}
          />

          {index === 0 ? (
            <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded font-medium">
              Principal
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onDefinirPrincipal(index)}
              className="absolute bottom-2 left-2 bg-white/95 text-gray-800 text-xs px-2 py-1 rounded font-medium border border-gray-300 shadow-sm hover:bg-blue-50 hover:text-blue-700 flex items-center gap-1"
              title="Tornar esta a foto principal"
            >
              <Star className="w-3 h-3" />
              Principal
            </button>
          )}

          <button
            type="button"
            onClick={() => onRemover(index)}
            className="absolute top-2 right-2 bg-white/95 rounded-full p-2 shadow-sm border border-gray-300 text-red-600 hover:bg-red-50"
            title="Excluir esta foto"
            aria-label="Excluir esta foto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </>
  );
}