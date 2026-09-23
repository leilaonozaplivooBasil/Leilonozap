import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Gavel, TrendingUp, ShoppingCart } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { ITENS_DA_BARRA, mostraBarraDoApp, itemAtivo, contadorDoCarrinho } from '@/lib/barraDoApp';

const ICONES = { comprar: ShoppingBag, leiloes: Gavel, lucre: TrendingUp, carrinho: ShoppingCart };

// 📱 A barra do app: quatro atalhos fixos na base da tela, só no site e só
// até lg (ver src/lib/barraDoApp.js). Altura: 3.75rem + a área segura do
// aparelho — o FloatingDock soma a mesma medida pra nada ficar por baixo.
export default function BarraDoApp({ currentPageName, cartCount = 0 }) {
  if (!mostraBarraDoApp(currentPageName)) return null;
  const ativo = itemAtivo(currentPageName);
  const badge = contadorDoCarrinho(cartCount);
  return (
    <nav
      aria-label="Atalhos do app"
      data-teste="barra-do-app"
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'rgba(14, 22, 18, 0.92)',
        backdropFilter: 'blur(16px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
        borderTop: '1px solid rgba(153,193,152,0.14)',
        boxShadow: '0 -6px 24px rgba(0,0,0,0.35)',
      }}
    >
      <ul className="grid h-[3.75rem] grid-cols-4">
        {ITENS_DA_BARRA.map((item) => {
          const Icone = ICONES[item.id];
          const aceso = ativo === item.id;
          return (
            <li key={item.id} className="min-w-0">
              <Link
                to={createPageUrl(item.pagina)}
                aria-current={aceso ? 'page' : undefined}
                data-teste={`barra-${item.id}`}
                className={`relative flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-bold tracking-wide transition-colors active:scale-95 ${
                  aceso ? 'text-emerald-300' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <span className="relative">
                  <Icone className="h-5 w-5" strokeWidth={aceso ? 2.4 : 1.8} />
                  {item.id === 'carrinho' && badge && (
                    <span
                      className="absolute -right-2.5 -top-1.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-green-500 px-1 text-[9px] font-extrabold text-white"
                      data-teste="barra-carrinho-contador"
                    >{badge}</span>
                  )}
                </span>
                <span className="truncate">{item.rotulo}</span>
                {aceso && <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-b bg-emerald-400" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
