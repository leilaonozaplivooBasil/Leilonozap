import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Search } from 'lucide-react';
import { LOGO_FALLBACK } from '@/hooks/useSiteMedia';

// 🧭 O menu da home nova. Uma lista só, usada no desktop e no acordeão do celular.
// ⚠️ Enquanto for só da home, ele NÃO substitui o menu por setores (`lib/sectors.js`)
// que roda nas outras 142 páginas. Unificar os dois é decisão à parte.
export const MENU_DA_HOME = [
  { rotulo: 'Categorias', para: '/Loja-Virtual' },
  { rotulo: 'Leilão ao Vivo', para: '/LiveShopNoZap' },
  { rotulo: 'Compre Agora', para: '/Loja-Virtual' },
  { rotulo: 'Lucre', para: '/Lucre' },
  { rotulo: 'Como funciona', para: '/ComoFunciona' },
];

// Itens que o mock pede mas cuja página ainda não existe. Ficam FORA do menu de
// propósito: link morto no topo derruba confiança e indexação. Entram quando a
// página nascer.
export const MENU_PENDENTE = ['Quem Somos', 'Contato', 'Rastreie o seu pedido'];

export default function TopoHomeNova({ aviso = 'Entregamos para todo o Brasil', onBuscar }) {
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState('');

  const buscar = (e) => {
    e.preventDefault();
    onBuscar?.(q.trim());
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-nz-verde px-4 py-2 text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-white">
        {aviso}
      </div>

      <div className="border-b border-white/10 bg-[#0A1410]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center" aria-label="Leilão NoZap — início">
            <img src={LOGO_FALLBACK} alt="Leilão NoZap" className="h-9 w-auto" />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {MENU_DA_HOME.map((item) => (
              <Link
                key={item.rotulo}
                to={item.para}
                className="text-[14px] font-medium text-white/80 transition-colors hover:text-nz-verde-claro"
              >
                {item.rotulo}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={buscar} className="hidden md:block">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar produto"
                  aria-label="Buscar produto"
                  className="h-10 w-[200px] rounded-full border border-white/15 bg-white/5 pl-9 pr-4 text-[14px] text-white outline-none placeholder:text-white/40 focus:border-nz-verde-claro"
                />
              </div>
            </form>
            <button
              type="button"
              onClick={() => setAberto((v) => !v)}
              aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={aberto}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-white lg:hidden"
            >
              {aberto ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {aberto && (
          <nav className="border-t border-white/10 bg-[#0A1410] px-4 pb-4 lg:hidden">
            {MENU_DA_HOME.map((item) => (
              <Link
                key={item.rotulo}
                to={item.para}
                onClick={() => setAberto(false)}
                className="flex min-h-[52px] items-center border-b border-white/5 text-[15px] text-white/85"
              >
                {item.rotulo}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
