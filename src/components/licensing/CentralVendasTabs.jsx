import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store, BarChart3, Package, Users, Handshake, Wallet } from 'lucide-react';

// 🛍️ ABAS DA CENTRAL DE VENDAS (13/08/2026)
// Antes eram botões soltos, de tamanhos diferentes, quebrando em 3 linhas
// desalinhadas. Agora é uma fileira única que rola de lado no celular, em
// formato de pílula: a seção ativa fica verde institucional e as outras ficam
// discretas. Só aparência — as abas e os valores são os mesmos.
export default function CentralVendasTabs({ clientesCount = 0 }) {
  const ITENS = [
    { value: 'catalogo-produtos', label: 'Sua Loja Virtual', icon: Store },
    { value: 'catalogo-home', label: 'Relatório da Loja', icon: BarChart3 },
    { value: 'catalogo-pedidos', label: 'Vendas da Loja', icon: Package },
    { value: 'catalogo-clientes', label: `Venda Direta (${clientesCount})`, icon: Users },
    { value: 'catalogo-vendedores', label: 'Vendedores', icon: Handshake },
    { value: 'catalogo-comissoes', label: 'Comissões', icon: Wallet },
  ];

  return (
    <div className="-mx-1 overflow-x-auto px-1 nz-no-scrollbar">
      <TabsList className="h-auto w-max gap-1.5 rounded-xl border border-nz-borda bg-nz-cinza-fundo p-1.5">
        {ITENS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="min-h-[40px] whitespace-nowrap rounded-lg px-3.5 text-[13px] font-semibold text-nz-tinta-fraca transition-colors data-[state=active]:bg-nz-verde data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            <Icon className="mr-1.5 h-4 w-4" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}