import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon, ChevronRight, Map, Truck } from "lucide-react";
import { getRedeCargo, REDE_META } from "@/lib/roleBadge";
import AtalhosGrid from "@/components/nav/AtalhosGrid";
import MobileUserHeader from "@/components/nav/MobileUserHeader";
import MinhaContaGrid from "@/components/nav/MinhaContaGrid";

/**
 * 📱 NavMobile — MENU MOBILE PADRÃO ÚNICO (todos os perfis usam o mesmo esqueleto)
 *
 *   1. Perfil        — avatar, nome, e-mail e selo do cargo real
 *   2. Visão Geral   — mapa do painel + demais painéis (só admin / super admin)
 *   3. Meu Painel    — painel próprio do cargo de rede (quem tem)
 *   4. Atalhos       — azulejos: Comprar / Leilões / Lucre / Rank / Carrinho /
 *                      Alavancagem / Arremates / Favoritos / Perfil
 *                      (fonte única: @/lib/menuAtalhos)
 *   5. Minha Conta   — Meus Pedidos e Carteira, nos MESMOS azulejos
 *   6. Sair
 *
 * A seção "Também acessar como…" foi REMOVIDA: repetia painéis que agora são
 * azulejo (Loja Virtual = Comprar, Arrematante = Arremates) ou vivem na Visão Geral.
 *
 * ⚠️ Antes cada perfil via um menu diferente: admin só tinha a Visão Geral (sem
 * nenhum "acessar como"), o usuário via acordeões em caixa alta + Rank em card
 * gigante + Carrinho solto, e Pedidos/Arremates/Favoritos apareciam só para alguns.
 * Agora a estrutura é a mesma para todos — muda apenas o que o cargo libera.
 */
export default function NavMobile({
  isOpen,
  onClose,
  currentUser,
  onLoginClick,
  onLogout,
  isAdmin,
  // props legadas — mantidas para compatibilidade com o Layout
   
  currentPageName,
   
  finalMenuItems,
   
  isLoggedIn,
   
  isInvestidor,
   
  isLeiloeiro,
   
  isCatalogPage,
   
  adminMenuItems,
   
  onShareClick,
}) {
  const navigate = useNavigate();

  // 🛒 Mesmo contador do desktop (lido do mesmo localStorage do Layout)
  const cartCount = React.useMemo(() => {
    if (!isOpen) return 0;
    try {
      const c = JSON.parse(localStorage.getItem("catalogCart") || "[]");
      return c.reduce((s, i) => s + (i.quantity || 1), 0);
    } catch { return 0; }
  }, [isOpen]);

  if (!isOpen) return null;

  const userLogged = !!(currentUser && currentUser.email);
  const redeCargo = userLogged ? getRedeCargo(currentUser) : null;
  const redeMeta = redeCargo ? REDE_META[redeCargo] : null;
  const RedeIcon = redeMeta?.icon || Truck;

  const go = (route) => { onClose(); navigate(route); };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-200" onClick={onClose} />

      <div
        className="fixed inset-y-0 right-0 w-[85%] max-w-sm z-[101] animate-in slide-in-from-right duration-300"
        style={{
          background: "rgba(10, 15, 28, 0.85)",
          backdropFilter: "blur(32px) saturate(1.6)",
          WebkitBackdropFilter: "blur(32px) saturate(1.6)",
          boxShadow: "-8px 0 48px rgba(0,0,0,0.4)",
          borderLeft: "1px solid rgba(16,185,129,0.06)",
        }}
      >
        <div className="flex flex-col h-full">
          {/* ===== Topo ===== */}
          <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="text-xl font-bold text-white">Menu</h2>
            <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/5" aria-label="Fechar menu">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ===== 1. Perfil ===== */}
          {userLogged && <MobileUserHeader user={currentUser} />}

          <div className="flex-1 overflow-y-auto p-4">
            {/* ===== 2. Visão Geral (admin) — vem ANTES dos atalhos: é o acesso de
                comando de quem tem painel, tem que estar no primeiro olhar ===== */}
            {userLogged && isAdmin && (
              <button
                onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("openMiniCanvas")); }}
                className="mb-1 flex min-h-[56px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all active:scale-[0.98]"
                style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.30)" }}
              >
                <Map className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold uppercase tracking-wide text-emerald-300">Visão Geral</p>
                  <p className="truncate text-[11px] text-gray-400">Mapa do painel e todos os acessos</p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-emerald-400/70" />
              </button>
            )}

            {/* ===== 3. Painel do cargo (Visão Geral) — MESMO destino do desktop.
                 Faltava aqui: no celular o menu ia direto pro "Meu Painel" e a
                 pessoa nunca chegava na visão geral do Painel de Alavancagem. ===== */}
            {userLogged && (
              <button
                onClick={() => go("/Licensing")}
                className="mt-2 w-full flex min-h-[56px] items-center gap-3 p-3 rounded-xl border border-green-500/50 text-left transition-all duration-200 active:scale-[0.98]"
                style={{ background: "rgba(16,185,129,0.10)" }}
              >
                <RedeIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold uppercase tracking-wide text-green-300 truncate">Visão Geral</p>
                  <p className="text-[11px] text-gray-400 truncate">Painel de Alavancagem</p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-green-400/70" />
              </button>
            )}

            {/* ===== 4. Meu Painel (cargo de rede) ===== */}
            {userLogged && redeMeta && (
              <div className="mt-2">
                <p className="font-bold text-[10px] uppercase tracking-wider px-4 mb-2 text-gray-500">Meu Painel</p>
                <button
                  onClick={() => go("/painel")}
                  className="w-full flex min-h-[56px] items-center gap-3 p-3 rounded-xl border border-green-500/50 text-left transition-all duration-200 active:scale-[0.98]"
                  style={{ background: "rgba(16,185,129,0.10)" }}
                >
                  <RedeIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-green-300 truncate">{redeMeta.title}</p>
                    <p className="text-[11px] text-gray-400 truncate">Financeiro, loja, rede, cadastros e links</p>
                  </div>
                </button>
              </div>
            )}

            {/* ===== 4. Atalhos (todos os perfis, inclusive visitante) ===== */}
            {/* A linha divisória só existe quando há bloco acima (visitante não tem) */}
            <div className={userLogged ? "pt-4 mt-3" : ""} style={userLogged ? { borderTop: "1px solid rgba(255,255,255,0.06)" } : undefined}>
              <p className="font-bold text-[10px] uppercase tracking-wider px-1 mb-2 text-gray-500">Atalhos</p>
              <AtalhosGrid user={currentUser} cartCount={cartCount} onNavigate={onClose} />
            </div>

            {/* ===== 5. Minha Conta (mesmo azulejo dos Atalhos) ===== */}
            {userLogged && (
              <div className="pt-4 mt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="font-bold text-[10px] uppercase tracking-wider px-1 mb-2 text-gray-500">Minha Conta</p>
                <MinhaContaGrid onNavigate={onClose} />
              </div>
            )}

            {/* ===== Entrar (visitante) ===== */}
            {!userLogged && (
              <button
                onClick={() => { onClose(); onLoginClick(); }}
                className="w-full flex min-h-[52px] items-center justify-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 mt-6 text-white active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, rgba(16,185,129,0.5), rgba(5,150,105,0.6))",
                  border: "1px solid rgba(16,185,129,0.3)",
                  boxShadow: "0 4px 16px rgba(16,185,129,0.15)",
                }}
              >
                <UserIcon className="h-5 w-5" />
                Entrar na Conta
              </button>
            )}

            {/* ===== 6. Sair ===== */}
            {userLogged && (
              <button
                onClick={() => { onClose(); onLogout(); }}
                className="w-full flex min-h-[48px] items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-200 mt-4 text-red-400/80 active:scale-[0.98]"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <LogOut className="h-5 w-5" />
                Sair da Conta
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}