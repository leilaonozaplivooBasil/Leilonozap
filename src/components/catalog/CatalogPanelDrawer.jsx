import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronRight, Gavel, ShoppingBag, Briefcase, Store, Users, TrendingUp, Hammer, Building2, Shield, Crown } from "lucide-react";
import { resolveUserPanels } from "@/lib/panelResolver";

const ICONS = {
    Gavel, ShoppingBag, Briefcase, Store, Users, TrendingUp,
    Hammer, Building2, Shield, Crown,
};

// Cor sólida por painel — mesma paleta do PanelSwitcherCard pra consistência visual
const PANEL_COLOR = {
    loja_virtual: { ring: "ring-orange-500/40",  bg: "bg-orange-50",   text: "text-orange-700",  iconBg: "bg-orange-100" },
    arrematante:  { ring: "ring-emerald-500/40", bg: "bg-emerald-50",  text: "text-emerald-700", iconBg: "bg-emerald-100" },
    vendedor:     { ring: "ring-purple-500/40",  bg: "bg-purple-50",   text: "text-purple-700",  iconBg: "bg-purple-100" },
    lojista:      { ring: "ring-fuchsia-500/40", bg: "bg-fuchsia-50",  text: "text-fuchsia-700", iconBg: "bg-fuchsia-100" },
    licenciado:   { ring: "ring-blue-500/40",    bg: "bg-blue-50",     text: "text-blue-700",    iconBg: "bg-blue-100" },
    investidor:   { ring: "ring-amber-500/40",   bg: "bg-amber-50",    text: "text-amber-700",   iconBg: "bg-amber-100" },
    leiloeiro:    { ring: "ring-red-500/40",     bg: "bg-red-50",      text: "text-red-700",     iconBg: "bg-red-100" },
    admin:        { ring: "ring-slate-500/40",   bg: "bg-slate-50",    text: "text-slate-700",   iconBg: "bg-slate-100" },
    super_admin:  { ring: "ring-yellow-500/40",  bg: "bg-yellow-50",   text: "text-yellow-700",  iconBg: "bg-yellow-100" },
};

/**
 * CatalogPanelDrawer — Drawer lateral direito estilo Magalu
 * Lista os painéis disponíveis do usuário e navega ao clicar.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   currentUser: AppUser
 */
export default function CatalogPanelDrawer({ isOpen, onClose, currentUser }) {
    const navigate = useNavigate();
    const panels = resolveUserPanels(currentUser);

    // Bloqueia scroll do body quando aberto
    useEffect(() => {
        if (isOpen) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => { document.body.style.overflow = prev; };
        }
    }, [isOpen]);

    // Fecha com ESC
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSelect = (panel) => {
        onClose();
        setTimeout(() => navigate(panel.route), 100);
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] animate-in fade-in duration-200"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer direito */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Meus painéis"
                className="fixed top-0 right-0 bottom-0 z-[9999] w-[90%] sm:w-[420px] max-w-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
                style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-gray-100">
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-black text-gray-900">
                            Meus painéis
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                            {currentUser?.full_name
                                ? `Olá, ${currentUser.full_name.split(' ')[0]}! `
                                : ''}
                            {panels.length === 0
                                ? 'Faça login pra ver seus painéis'
                                : `Você tem acesso a ${panels.length} ${panels.length === 1 ? 'painel' : 'painéis'}.`}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar"
                        className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Lista de painéis */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
                    {panels.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p className="text-sm">
                                Nenhum painel disponível ainda.
                            </p>
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {panels.map((panel) => {
                                const Icon = ICONS[panel.iconName] || ShoppingBag;
                                const color = PANEL_COLOR[panel.key] || PANEL_COLOR.admin;
                                return (
                                    <li key={panel.key}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(panel)}
                                            className="w-full group flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all text-left"
                                        >
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ${color.ring} ${color.iconBg}`}>
                                                <Icon className={`w-5 h-5 ${color.text}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
                                                    {panel.title}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                    {panel.description}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-5 sm:px-6 py-3 bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full text-center text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors py-1.5"
                    >
                        Continuar na Loja Virtual
                    </button>
                </div>
            </aside>
        </>
    );
}