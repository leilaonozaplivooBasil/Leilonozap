import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Link2, Network, Truck, UserCog, Factory, Store,
  Megaphone, MessageCircle, ExternalLink, X,
} from 'lucide-react';

// 🧭 08/08/2026 — MENU ESCRITO DO PAINEL, agora componente próprio.
// Antes ele existia SÓ dentro de PainelDistribuidor.jsx: ao abrir "Editar Loja
// Virtual" (/CatalogManagement) ou "Pedidos & Envio" (/painel/pedidos) — que são
// páginas separadas — o menu simplesmente sumia e a pessoa ficava sem saída.
// Mesmos itens, mesma ordem, mesmos ícones, mesmo visual de sempre.
const CARGO_LABEL = { usuario: 'Usuário', influenciador: 'Influenciador', vendedor: 'Vendedor', licenciado: 'Licenciado', parceiro: 'Parceiro', ponto_retirada: 'Ponto de Retirada', loja_fisica: 'Loja Física', distribuidor: 'Distribuidor' };

const MENU_LOJA = [
  { id: 'visao', label: 'Visão da Operação', icon: LayoutDashboard },
  { id: 'cadastrar', label: 'Cadastrar & Vender', icon: Link2, star: true },
  { id: 'rede', label: 'Minha Árvore', icon: Network },
  { id: 'pedidos', label: 'Pedidos & Envio', icon: Truck, route: '/painel/pedidos' },
  { id: 'marketing', label: 'Marketing & Cliques', icon: Megaphone },
  { id: 'atendimento', label: 'Atendimento', icon: MessageCircle },
];
const MENU_DIST = [
  { id: 'visao', label: 'Visão da Operação', icon: LayoutDashboard },
  { id: 'cadastrar', label: 'Cadastrar & Vender', icon: Link2, star: true },
  { id: 'rede', label: 'Minha Árvore', icon: Network },
  { id: 'funcionarios', label: 'Funcionários (PDV)', icon: UserCog },
  { id: 'fornecedores', label: 'Fornecedores', icon: Factory },
  { id: 'loja', label: 'Editar Loja Virtual', icon: Store, ext: true, route: '/CatalogManagement' },
  { id: 'pedidos', label: 'Pedidos & Envio', icon: Truck, route: '/painel/pedidos' },
  { id: 'marketing', label: 'Marketing & Cliques', icon: Megaphone },
  { id: 'atendimento', label: 'Atendimento', icon: MessageCircle },
];

export function menuDoPainel(user) {
  return ['loja_fisica', 'ponto_retirada', 'parceiro'].includes(user?.primary_career_level) ? MENU_LOJA : MENU_DIST;
}

/**
 * @param user      usuário logado (cabeçalho "Painel do {cargo} / {nome}")
 * @param activeTab aba ativa quando estamos DENTRO do /painel
 * @param onTab     se existir, o clique numa aba fica na própria página (/painel).
 *                  Sem ele (telas separadas), o clique navega pra /painel?tab=id.
 * @param menuOpen  drawer aberto no mobile (só o /painel usa)
 * @param onClose   fecha o drawer
 */
export default function MenuPainelLateral({ user, activeTab, onTab, menuOpen = false, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  if (!user) return null;

  const MENU = menuDoPainel(user);
  const cargoNome = CARGO_LABEL[user.primary_career_level] || user.primary_career_level;
  const path = location.pathname.toLowerCase();
  const naTelaPedidos = path === '/painel/pedidos';
  const naTelaLoja = path.includes('catalogmanagement');

  const isAtivo = (m) => {
    if (m.id === 'pedidos') return naTelaPedidos;
    if (m.id === 'loja') return naTelaLoja;
    return !naTelaPedidos && !naTelaLoja && activeTab === m.id;
  };

  const clicar = (m) => {
    if (m.route) navigate(m.route);
    else if (onTab) onTab(m.id);
    else navigate(`/painel?tab=${m.id}`);
    onClose?.();
  };

  return (
    <>
      {menuOpen && <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={onClose} />}
      <aside className={`bg-gray-950 border-r border-gray-800 p-4 w-72 md:w-64 overflow-y-auto fixed md:sticky top-0 left-0 h-full md:h-auto md:min-h-screen md:self-start z-50 transition-transform duration-200 ${menuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="mb-6 px-2 flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Painel do</div>
            <div className="text-lg font-black text-green-400">{cargoNome}</div>
            <div className="text-[11px] text-gray-500 truncate">{user.full_name}</div>
          </div>
          {onClose && <button onClick={onClose} className="md:hidden p-1 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>}
        </div>
        <nav className="space-y-1">
          {MENU.map((m) => {
            const active = isAtivo(m);
            return (
              <button key={m.id} onClick={() => clicar(m)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? 'bg-green-500/15 text-green-400 font-semibold' : 'text-gray-300 hover:bg-gray-800'}`}>
                <m.icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className="flex-1 text-left">{m.label}</span>
                {m.star && <span className="text-[9px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded">★</span>}
                {m.ext && <ExternalLink className="w-3.5 h-3.5 opacity-40" />}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}