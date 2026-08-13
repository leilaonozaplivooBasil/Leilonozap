import React, { useEffect, useRef, useState } from 'react';
import { Store, BarChart3, Package, Users, Handshake, Wallet, ChevronDown, Check } from 'lucide-react';

// 🛍️ NAVEGAÇÃO DA CENTRAL DE VENDAS (13/08/2026)
// Antes eram abas soltas e depois uma fileira que rolava de lado — rolar
// horizontal esconde opções e atrapalha no celular. Agora é UM botão que abre
// um menu suspenso com todas as seções, no padrão do painel.
// Só navegação visual: as seções e os dados são exatamente os mesmos.
export default function CentralVendasTabs({ value, onChange, clientesCount = 0 }) {
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef(null);

  const ITENS = [
    { value: 'catalogo-produtos', label: 'Sua Loja Virtual', icon: Store },
    { value: 'catalogo-home', label: 'Relatório da Minha Loja', icon: BarChart3 },
    { value: 'catalogo-pedidos', label: 'Vendas da Loja', icon: Package },
    { value: 'catalogo-clientes', label: `Venda Direta (${clientesCount})`, icon: Users },
    { value: 'catalogo-vendedores', label: 'Vendedores', icon: Handshake },
    { value: 'catalogo-comissoes', label: 'Comissões', icon: Wallet },
  ];

  const atual = ITENS.find((i) => i.value === value) || ITENS[0];
  const IconeAtual = atual.icon;

  // fecha ao tocar fora ou apertar Esc (padrão de menu do painel)
  useEffect(() => {
    if (!aberto) return;
    const foraDaCaixa = (e) => {
      if (caixaRef.current && !caixaRef.current.contains(e.target)) setAberto(false);
    };
    const noEsc = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', foraDaCaixa);
    document.addEventListener('touchstart', foraDaCaixa);
    document.addEventListener('keydown', noEsc);
    return () => {
      document.removeEventListener('mousedown', foraDaCaixa);
      document.removeEventListener('touchstart', foraDaCaixa);
      document.removeEventListener('keydown', noEsc);
    };
  }, [aberto]);

  return (
    <div ref={caixaRef} className="relative w-full sm:max-w-sm">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-nz-borda bg-white px-4 text-left shadow-sm transition-colors hover:border-nz-verde/50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-nz-verde-fundo">
          <IconeAtual className="h-4.5 w-4.5 text-nz-verde" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-nz-tinta-fraca">
            Central de Vendas
          </span>
          <span className="block truncate text-[15px] font-bold text-nz-tinta">{atual.label}</span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-nz-tinta-fraca transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-nz-borda bg-white shadow-xl">
          {ITENS.map(({ value: v, label, icon: Icon }) => {
            const ativo = v === value;
            return (
              <button
                key={v}
                type="button"
                onClick={() => { onChange(v); setAberto(false); }}
                className={`flex min-h-[48px] w-full items-center gap-3 px-4 text-left text-[14px] transition-colors ${
                  ativo ? 'bg-nz-verde-fundo font-bold text-nz-verde' : 'font-medium text-nz-tinta hover:bg-nz-cinza-fundo'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${ativo ? 'text-nz-verde' : 'text-nz-tinta-fraca'}`} />
                <span className="flex-1 truncate">{label}</span>
                {ativo && <Check className="h-4 w-4 shrink-0 text-nz-verde" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}