import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Gavel, DollarSign, ShoppingCart } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { SECTORS } from '@/lib/sectors';
import { ITENS_DA_BARRA, mostraBarraDoApp, itemAtivo, contadorDoCarrinho } from '@/lib/barraDoApp';
import { TILE, P, Rotulo } from '@/components/nav/AtalhosGrid';

// 🧩 24/09/2026 — os ícones são os MESMOS azulejos dos Atalhos do menu (Comprar,
// Leilões, Lucre vêm de sectors.js, como lá; Carrinho é o mesmo ShoppingCart).
// Pedido do dono: "duplique daqui para lá esses botões, para seguir o padrão".
const RESERVA = { comprar: ShoppingBag, leiloes: Gavel, lucre: DollarSign, carrinho: ShoppingCart };
export function iconeDaBarra(item) {
  const setor = SECTORS.find((s) => s?.href?.page === item.pagina);
  return setor?.icon || RESERVA[item.id];
}

// 📱 A barra do app: quatro atalhos fixos na base da tela, só no site e só
// até lg (ver src/lib/barraDoApp.js). Altura: 3.75rem + a área segura do
// aparelho — o FloatingDock soma a mesma medida pra nada ficar por baixo.
// Visual: o azulejo verde 3D + rótulo em caixa alta do AtalhosGrid (mesma fonte
// de estilo: TILE / Rotulo). O carrinho saiu do cabeçalho do celular e mora aqui.
export default function BarraDoApp({ currentPageName, cartCount = 0 }) {
  if (!mostraBarraDoApp(currentPageName)) return null;
  const ativo = itemAtivo(currentPageName);
  const badge = contadorDoCarrinho(cartCount);
  return (
    <nav
      aria-label="Atalhos do app"
      data-teste="barra-do-app"
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      // 🪟 24/09/2026 — pedido do dono: "a barra tem que ser mais transparente,
      // estilo o bloco Leilões Ativos, mais limpa, coisa de Apple". Mesmo vidro
      // do #hero-leiloes: quase sem cor própria, desfoque forte e saturação pra
      // o conteúdo aparecer através, fio claro no topo e brilho descendo. Os
      // azulejos já têm sombra própria; o rótulo ganha uma sombra de texto pra
      // continuar legível sobre foto clara.
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%), rgba(10, 16, 14, 0.42)',
        backdropFilter: 'blur(22px) saturate(1.7)',
        WebkitBackdropFilter: 'blur(22px) saturate(1.7)',
        // 🫥 24/09 — dono: "a linha que divide pode ser praticamente imperceptível?"
        // Fio a 4% (era 12% + brilho interno de 8%, que somavam uma linha nítida).
        // Fica só um sopro pra o vidro não parecer cortado; a sombra suave faz o resto.
        borderTop: '1px solid rgba(255,255,255,0.04)',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.18)',
      }}
    >
      <ul className="grid h-[3.75rem] grid-cols-4" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
        {ITENS_DA_BARRA.map((item) => {
          const Icone = iconeDaBarra(item);
          const aceso = ativo === item.id;
          return (
            <li key={item.id} className="min-w-0">
              <Link
                to={createPageUrl(item.pagina)}
                aria-current={aceso ? 'page' : undefined}
                data-teste={`barra-${item.id}`}
                className="flex h-full flex-col items-center justify-center gap-1 transition-transform active:scale-95"
              >
                <span
                  className="relative flex h-[38px] w-[38px] items-center justify-center rounded-xl"
                  style={aceso ? { ...TILE, border: `1px solid ${P.beige}`, boxShadow: `${TILE.boxShadow}, 0 0 0 2px rgba(218,187,152,0.35)` } : TILE}
                >
                  <Icone className="h-[19px] w-[19px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                  {item.id === 'carrinho' && badge && (
                    <span
                      className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-extrabold leading-none"
                      style={{ background: `linear-gradient(150deg, #ecd3ae, ${P.beige})`, color: P.navy, border: '2px solid #131418' }}
                      data-teste="barra-carrinho-contador"
                    >{badge}</span>
                  )}
                </span>
                <Rotulo tom={aceso ? 'beige' : undefined}>{item.rotulo}</Rotulo>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
