import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

/**
 * ⚡ PrecificaVivoBadge
 * Exibe badge animado quando o produto foi atualizado pelo motor PrecificaVivo nos últimos 60min.
 * Se não houver atualização recente, não renderiza nada (zero impacto no layout).
 *
 * Props:
 * - lastUpdate: string ISO (Product.last_dynamic_update)
 * - size: 'sm' | 'md' (default: 'sm')
 */
export default function PrecificaVivoBadge({ lastUpdate, size = 'sm' }) {
  const [minutesAgo, setMinutesAgo] = useState(null);

  useEffect(() => {
    if (!lastUpdate) {
      setMinutesAgo(null);
      return;
    }

    const compute = () => {
      const updated = new Date(lastUpdate);
      if (isNaN(updated.getTime())) return null;
      const diffMin = Math.floor((Date.now() - updated.getTime()) / 60000);
      return diffMin;
    };

    setMinutesAgo(compute());

    // Atualiza a cada 60s para manter o "há X min" vivo
    const interval = setInterval(() => {
      setMinutesAgo(compute());
    }, 60000);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  // Só exibe se houve atualização nos últimos 60min
  if (minutesAgo === null || minutesAgo < 0 || minutesAgo > 60) return null;

  const label = minutesAgo === 0 ? 'agora' : `há ${minutesAgo} min`;

  const sizeClasses = size === 'md'
    ? 'text-xs px-2.5 py-1 gap-1.5'
    : 'text-[10px] px-2 py-0.5 gap-1';

  const iconSize = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  return (
    <div
      className={`inline-flex items-center ${sizeClasses} rounded-full font-bold text-white whitespace-nowrap`}
      style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.95))',
        border: '1px solid rgba(52,211,153,0.5)',
        boxShadow: '0 2px 12px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
        animation: 'precificavivo-pulse 2.5s ease-in-out infinite'
      }}
      title={`Preço atualizado dinamicamente ${label}`}
    >
      <Zap className={`${iconSize} fill-white`} />
      <span>PrecificaVivo · {label}</span>

      <style>{`
        @keyframes precificavivo-pulse {
          0%, 100% { box-shadow: 0 2px 12px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.15); }
          50% { box-shadow: 0 2px 20px rgba(16,185,129,0.6), inset 0 1px 0 rgba(255,255,255,0.25); }
        }
      `}</style>
    </div>
  );
}