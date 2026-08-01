import React from 'react';
import { Link } from 'react-router-dom';
import { fmtBR } from '@/lib/money';
import { Trophy } from 'lucide-react';

const IMG_FALLBACK = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';

export default function UltimosArremates({ arremates }) {
  const tres = arremates.slice(0, 3);
  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Meus arremates
        </h2>
        <Link to="/MyWinnings" className="text-xs font-bold text-emerald-400 hover:text-emerald-300">
          ver todos
        </Link>
      </div>

      {tres.length === 0 ? (
        <div className="rounded-2xl border border-gray-700/60 bg-gray-800/40 p-6 text-center text-sm text-gray-400">
          Você ainda não arrematou nenhum produto.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {tres.map((a) => (
            <div key={a.id} className="rounded-xl border border-gray-700/60 bg-gray-800/60 overflow-hidden">
              <img
                src={a.image_urls?.[0] || IMG_FALLBACK}
                alt={a.title}
                className="w-full h-32 object-cover bg-gray-900"
                loading="lazy"
              />
              <div className="p-3">
                <p className="text-sm font-bold text-white line-clamp-2">{a.title}</p>
                <p className="text-emerald-400 font-black mt-1">R$ {fmtBR(a.current_price)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}