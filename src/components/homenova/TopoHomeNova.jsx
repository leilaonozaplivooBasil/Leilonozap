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

export default function TopoHomeNova({ aviso = 'Entregamos para todo o Brasil', leiloesAgora = 0, onBuscar }) {
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState('');

  const buscar = (e) => {
    e.preventDefault();
    onBuscar?.(q.trim());
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-nz-verde px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-white">
        {aviso}
      </div>

      <div className="border-b border-white/10 bg-nz-noite/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center" aria-label="Leilão NoZap — início">
              <img src={LOGO_FALLBACK} alt="Leilão NoZap" className="h-10 w-auto sm:h-11" />
            </Link>

            {/* 🔴 Sinal de vida: só aparece quando existe leilão acontecendo —
                e o número é o do banco, nunca um selo decorativo aceso sempre. */}
            {leiloesAgora > 0 && (
              <Link
                to="/leiloes"
                className="hidden items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-red-300 transition-colors hover:border-red-400/60 sm:inline-flex"
                data-teste="selo-ao-vivo"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                {leiloesAgora} ao vivo
              </Link>
            )}
          </div>

          <nav className="hidden items-center gap-7 lg:flex">
            {MENU_DA_HOME.map((item) => (
              <Link
                key={item.rotulo}
                to={item.para}
                className="relative text-[14px] font-medium text-white/75 transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-[2px] after:w-0 after:rounded-full after:bg-nz-verde-neon after:transition-all after:duration-300 hover:text-white hover:after:w-full"
              >
                {item.rotulo}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={buscar} className="hidden md:block">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar produto"
                  aria-label="Buscar produto"
                  className="h-10 w-[190px] rounded-full border border-white/12 bg-white/[0.05] pl-9 pr-4 text-[14px] text-white outline-none transition-all duration-200 placeholder:text-white/35 focus:w-[240px] focus:border-nz-verde-neon/70 focus:bg-white/[0.08]"
                />
              </div>
            </form>
            <button
              type="button"
              onClick={() => setAberto((v) => !v)}
              aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={aberto}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/10 lg:hidden"
            >
              {aberto ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {aberto && (
          <nav className="border-t border-white/10 bg-nz-noite px-4 pb-4 lg:hidden">
            {MENU_DA_HOME.map((item) => (
              <Link
                key={item.rotulo}
                to={item.para}
                onClick={() => setAberto(false)}
                className="flex min-h-[54px] items-center border-b border-white/5 text-[15px] text-white/85 transition-colors active:text-nz-verde-neon"
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
