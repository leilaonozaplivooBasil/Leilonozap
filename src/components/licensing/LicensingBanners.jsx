import React from 'react';
import { Megaphone, ArrowRight, ExternalLink } from 'lucide-react';

// 📣 Banner único de divulgação — Compartilhar link + Abrir, lado a lado.
export default function LicensingBanners({ onCopyLink, shareLink }) {
  return (
    <div className="mb-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-nz-fogo-claro via-nz-fogo to-nz-fogo-escuro text-white p-6 md:p-8 min-h-[160px] flex flex-col justify-between">
        <Megaphone className="w-8 h-8 opacity-90" />
        <div>
          <p className="text-lg md:text-xl font-bold leading-snug mb-1">Divulgue seu link e ganhe comissão</p>
          <p className="text-sm opacity-90 mb-4">Compartilhe com amigos e clientes — toda compra vira dinheiro pra você.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onCopyLink}
              className="inline-flex items-center gap-2 text-sm font-semibold bg-white text-nz-fogo-escuro rounded-full px-4 py-2 hover:bg-nz-fogo-fundo transition-colors">
              Compartilhar link <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={shareLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold bg-white/15 text-white border border-white/30 rounded-full px-4 py-2 hover:bg-white/25 transition-colors">
              Abrir <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}