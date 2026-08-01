import React from 'react';
import { Link } from 'react-router-dom';
import { fmtBR } from '@/lib/money';
import { Gavel, ArrowRight } from 'lucide-react';
import TempoRestante from './TempoRestante';

const IMG_FALLBACK = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';

function LinhaDisputa({ auction, meuLance, ganhando }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-gray-800/60 border border-gray-700/60">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <img
          src={auction.image_urls?.[0] || IMG_FALLBACK}
          alt={auction.title}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-900"
          loading="lazy"
        />
        <div className="min-w-0">
          <p className="text-sm font-bold text-white line-clamp-2">{auction.title}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className="text-xs text-gray-400">Meu lance: <b className="text-gray-200">R$ {fmtBR(meuLance)}</b></span>
            <span className="text-xs text-gray-400">Atual: <b className="text-emerald-400">R$ {fmtBR(auction.current_price || auction.starting_price)}</b></span>
            <TempoRestante endTime={auction.end_time} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
            ganhando
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              : 'bg-red-500/15 text-red-300 border-red-500/40'
          }`}
        >
          {ganhando ? '🟢 Ganhando' : '🔴 Foi superado'}
        </span>
        <Link
          to={`/AuctionRoom?id=${auction.id}`}
          className="inline-flex items-center justify-center gap-1 min-h-[44px] px-3 rounded-lg text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
        >
          Voltar pra sala
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function DisputandoAgora({ itens }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-3">
        <Gavel className="w-5 h-5 text-emerald-400" />
        Disputando agora
        {itens.length > 0 && (
          <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2 py-0.5">
            {itens.length}
          </span>
        )}
      </h2>

      {itens.length === 0 ? (
        <div className="rounded-2xl border border-gray-700/60 bg-gray-800/40 p-6 text-center">
          <p className="text-gray-300 font-semibold mb-1">Você não está disputando nenhum leilão agora</p>
          <p className="text-sm text-gray-500 mb-4">Entre em uma sala e dê seu lance pra aparecer aqui.</p>
          <Link
            to="/leiloes"
            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg font-bold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            Ver leilões ativos
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map((i) => (
            <LinhaDisputa key={i.auction.id} auction={i.auction} meuLance={i.meuLance} ganhando={i.ganhando} />
          ))}
        </div>
      )}
    </section>
  );
}