import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Share2, LogOut, User as UserIcon, ShoppingCart as CartIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdminPanelMenu from "@/components/nav/AdminPanelMenu";

export default function NavDesktop({
  finalMenuItems,
  currentPageName,
  isLoggedIn,
  isAdmin,
  isInvestidor,
  isLeiloeiro,
  isCatalogPage,
  adminMenuItems,
  currentUser,
  onShareClick,
  onLoginClick,
  onLogout,
  navigate,
}) {
  return (
    <div className="hidden md:flex md:gap-x-6 items-center">
      {/* ITENS DO MENU */}
      {finalMenuItems.filter(item => item.pageName).map((item) => (
        <Link
          key={item.title}
          to={createPageUrl(item.pageName) + (item.addFromCatalog ? "?from=catalog" : "")}
          className={`text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${currentPageName === item.pageName
            ? "text-emerald-300"
            : "text-gray-300 hover:text-white"
            }`}
          style={currentPageName === item.pageName ? {
            background: 'rgba(16, 185, 129, 0.1)',
            boxShadow: '0 0 12px rgba(16, 185, 129, 0.08)',
          } : {}}
        >
          {item.icon === 'cart' && <CartIcon className="w-4 h-4" />}
          {item.title}
        </Link>
      ))}

      {/* COMPARTILHAR */}
      <button
        onClick={onShareClick}
        className="flex items-center gap-2 text-sm font-semibold transition-all duration-300 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5"
      >
        <Share2 className="h-4 w-4" />
        Compartilhar
      </button>

      {/* PERFIL - ENTRE COMPARTILHAR E CARRINHO (só se logado e catálogo) */}
      {isLoggedIn && isCatalogPage && (
        <Link
          to={createPageUrl("Profile") + (isCatalogPage ? "?from=catalog" : "")}
          className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${currentPageName === "Profile"
            ? "text-green-400"
            : "text-gray-300 hover:text-white"
            }`}
        >
          <UserIcon className="w-4 h-4" />
          Perfil
        </Link>
      )}

      {/* CARRINHO - APENAS EM PÁGINAS DO CATÁLOGO */}
      {isCatalogPage && (
        <Link
          to={createPageUrl("Cart")}
          className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${currentPageName === "Cart"
            ? "text-green-400"
            : "text-gray-300 hover:text-white"
            }`}
        >
          <CartIcon className="w-4 h-4" />
          Carrinho
        </Link>
      )}

      {/* MENU INVESTIDOR - DROPDOWN */}
      {isInvestidor && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200 px-3 py-1.5 rounded-lg transition-all duration-300 hover:bg-emerald-500/10">
              <UserIcon className="h-4 w-4" />
              Minha Conta
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="text-white border-0" style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(24px) saturate(1.5)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
            <DropdownMenuLabel className="text-emerald-400">Investidor</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem onClick={() => navigate(createPageUrl("MarketplaceLotes"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
              Marketplace de Lotes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(createPageUrl("CarteiraInvestidor"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
              Carteira Investidor
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(createPageUrl("AddFunds"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
              💰 Carteira Leilões
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(createPageUrl("Profile"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
              Perfil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* MENU LEILOEIRO/ARREMATANTE - DROPDOWN */}
      {isLeiloeiro && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200 px-3 py-1.5 rounded-lg transition-all duration-300 hover:bg-emerald-500/10">
              <UserIcon className="h-4 w-4" />
              Minha Conta
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="text-white border-0" style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(24px) saturate(1.5)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
            <DropdownMenuLabel className="text-emerald-400">Arrematante</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem onClick={() => navigate(createPageUrl("CRMInvestidores"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
              CRM de Investidores
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(createPageUrl("AuctionControl"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
              Controle de Leilões
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(createPageUrl("AddFunds"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
              💰 Minha Carteira
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(createPageUrl("Profile"))} className="cursor-pointer hover:bg-gray-700 focus:bg-gray-700">
              Perfil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* PAINEL DE CONTROLE - SÓ ADMIN */}
      {isAdmin && (
        <AdminPanelMenu adminMenuItems={adminMenuItems} />
      )}

      {/* BOTÃO ENTRAR */}
      {!isLoggedIn && (
        <Button
          onClick={onLoginClick}
          className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl border-0 transition-all duration-300 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.5), rgba(5,150,105,0.6))',
            border: '1px solid rgba(16,185,129,0.3)',
            boxShadow: '0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <UserIcon className="h-4 w-4" />
          Entrar
        </Button>
      )}

      {/* BOTÃO SAIR */}
      {isLoggedIn && (
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-sm font-semibold transition-all duration-300 ml-2 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      )}
    </div>
  );
}