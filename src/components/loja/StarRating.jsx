import React from 'react';
import { Star } from 'lucide-react';

// Exibe estrelas (com meia-estrela via fração) — só leitura.
export function Stars({ value = 0, size = 16, className = '' }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className={`inline-flex items-center ${className}`} aria-label={`${v} de 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, v - i)); // 0..1
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star style={{ width: size, height: size }} className="absolute inset-0 text-gray-600" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star style={{ width: size, height: size }} className="text-yellow-400" fill="#facc15" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

// Resumo compacto: ★ 4.8 (123) — pra cabeçalho da loja.
export function RatingBadge({ media = 0, total = 0, size = 15 }) {
  if (!total) return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
      <Star style={{ width: size, height: size }} className="text-gray-500" /> Sem avaliações ainda
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Stars value={media} size={size} />
      <span className="font-bold text-yellow-300">{Number(media).toFixed(1)}</span>
      <span className="text-gray-300">({total})</span>
    </span>
  );
}

// Seletor interativo de estrelas.
export function StarPicker({ value = 0, onChange, size = 36 }) {
  const [hover, setHover] = React.useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange?.(n)}
          className="transition-transform hover:scale-110"
          aria-label={`${n} estrela(s)`}
        >
          <Star style={{ width: size, height: size }} className={n <= shown ? 'text-yellow-400' : 'text-gray-600'} fill={n <= shown ? '#facc15' : 'none'} />
        </button>
      ))}
    </div>
  );
}
