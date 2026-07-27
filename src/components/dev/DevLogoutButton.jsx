import React from "react";
import { LogOut } from "lucide-react";

/**
 * 🧪 BOTÃO DEV — "Sair (teste)"
 * ============================================================
 * Botão flutuante DISCRETO usado APENAS por admins/super_admins
 * (e pelo email-master) para deslogar rapidamente e testar
 * fluxos de login, registro e seletor de painéis SEM precisar
 * mexer manualmente em localStorage/sessionStorage via DevTools.
 *
 * 🔒 NÃO altera o fluxo de auth real:
 *   - Não toca em LoginModal, RequireRole, AuthContext
 *   - Apenas limpa storage + redireciona p/ Portal "/"
 *   - Respeita a flag `userLoggedOut` que o Layout já trata
 *     para NÃO re-logar automaticamente após o reload.
 *
 * Visibilidade: só renderiza se o usuário logado for admin /
 * super_admin / email mestre (luizsantanna@tttcorporate.com).
 * Visitantes e clientes comuns NÃO veem este botão.
 *
 * Reversível: deletar este arquivo + remover import/render do
 * Layout.jsx desliga 100% sem efeitos colaterais.
 */
export default function DevLogoutButton({ currentUser, inline = false }) {
  // Visibilidade: só admin / super_admin / email mestre
  if (!currentUser || !currentUser.email) return null;

  const isMasterEmail = currentUser.email === "luizsantanna@tttcorporate.com";
  const isAdmin = currentUser.role === "admin" || currentUser.role === "super_admin";

  if (!isAdmin && !isMasterEmail) return null;

  const handleClick = () => {
    const ok = window.confirm("Sair da conta e recarregar como visitante?");
    if (!ok) return;

    try {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("userIsAdmin");
      sessionStorage.clear();
      // Flag respeitada pelo Layout para evitar re-login automático
      sessionStorage.setItem("userLoggedOut", "true");
    } catch (_) {
      // Storage indisponível (modo privado etc.) — segue para reload mesmo assim
    }

    window.location.href = "/";
  };

  // Variante INLINE: fica ao lado do nome do usuário na navbar (sem posição fixa)
  if (inline) {
    return (
      <button
        type="button"
        onClick={handleClick}
        title="Deslogar e voltar como visitante (modo de teste)"
        className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-red-600/85 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold border border-red-400/25 shadow-sm transition-colors shrink-0"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden lg:inline">Sair (teste)</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Deslogar e voltar como visitante (modo de teste)"
      className="fixed bottom-28 left-4 z-[9999] flex items-center gap-2 px-3 h-9 min-w-[140px] rounded-lg bg-red-600/80 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold shadow-lg shadow-red-900/40 backdrop-blur-sm border border-red-400/20 transition-colors"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <LogOut className="w-4 h-4" />
      <span>Sair (teste)</span>
    </button>
  );
}