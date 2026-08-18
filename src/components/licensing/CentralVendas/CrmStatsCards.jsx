import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, TrendingUp, Briefcase, DollarSign, ShoppingCart,
  MessageSquare, Clock, CheckCircle, Package, Truck, XCircle,
  Gavel, Store, Award, Landmark, Gavel as GavelIcon, UserCheck
} from 'lucide-react';

// ☀️ Redesenho (18/08/2026): removidas as cores fortes (laranja/azul/roxo/
// amarelo/vermelho/verde) — agora tudo no padrão branco + verde institucional
// já usado nas outras abas da Central de Vendas. Mesma estrutura, só pintura.
const PURCHASE_CARDS = [
  { key: 'sem_compra', label: 'Sem Compra', icon: ShoppingCart },
  { key: 'em_negociacao', label: 'Em Negociação', icon: MessageSquare },
  { key: 'aguardando_pagamento', label: 'Aguardando Pag.', icon: Clock },
  { key: 'pago', label: 'Pago', icon: CheckCircle },
  { key: 'enviado', label: 'Enviado', icon: Package },
  { key: 'entregue', label: 'Entregue', icon: Truck },
  { key: 'cancelado', label: 'Cancelado', icon: XCircle },
];

const ROLE_CARDS = [
  { key: 'vendedores', label: 'Vendedores', icon: Store },
  { key: 'licenciados', label: 'Licenciados', icon: Award },
  { key: 'influencers', label: 'Influencers', icon: TrendingUp },
  { key: 'investidores', label: 'Investidores', icon: Landmark },
  { key: 'leiloeiros', label: 'Leiloeiros', icon: GavelIcon },
  { key: 'arrematantes', label: 'Arrematantes', icon: UserCheck },
];

export default function CrmStatsCards({ stats, purchaseStatusFilter, onPurchaseStatusClick }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Card className="bg-white border-nz-borda">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-nz-tinta-fraca text-xs sm:text-sm mb-1">Total de Contatos</p>
                <p className="text-xl sm:text-3xl font-bold text-nz-tinta">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-nz-verde" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-nz-borda">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-nz-tinta-fraca text-xs sm:text-sm mb-1">Leads</p>
                <p className="text-xl sm:text-3xl font-bold text-nz-tinta">{stats.leads}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-nz-verde" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-nz-borda">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-nz-tinta-fraca text-xs sm:text-sm mb-1">Clientes Ativos</p>
                <p className="text-xl sm:text-3xl font-bold text-nz-tinta">{stats.clientes}</p>
              </div>
              <Users className="w-8 h-8 text-nz-verde" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nz-verde-fundo border-nz-verde/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-nz-tinta-fraca text-xs sm:text-sm mb-1">Volume em Negociação</p>
                <p className="text-lg sm:text-2xl font-bold text-nz-tinta">
                  R$ {stats.volumeNegociacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-nz-verde" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-nz-borda">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-nz-tinta-fraca text-xs sm:text-sm mb-1">Faturamento Total</p>
                <p className="text-lg sm:text-2xl font-bold text-nz-tinta">
                  R$ {stats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-nz-verde" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movimentação real: leilões arrematados + estoque disponível */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Card className="bg-white border-nz-borda">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-nz-tinta-fraca text-xs sm:text-sm mb-1">Leilões Arrematados</p>
                <p className="text-xl sm:text-3xl font-bold text-nz-tinta">{stats.leiloesArrematados}</p>
              </div>
              <Gavel className="w-8 h-8 text-nz-verde" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-nz-borda">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-nz-tinta-fraca text-xs sm:text-sm mb-1">Produtos em Estoque</p>
                <p className="text-xl sm:text-3xl font-bold text-nz-tinta">{stats.produtosDisponiveis}</p>
              </div>
              <Package className="w-8 h-8 text-nz-verde" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-nz-borda col-span-2 md:col-span-2">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-nz-tinta-fraca text-xs sm:text-sm mb-1">Valor de Mercado em Estoque</p>
                <p className="text-lg sm:text-2xl font-bold text-nz-tinta">
                  R$ {stats.valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-nz-verde" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rede por Tipo — Vendedor, Licenciado, Influencer, Investidor, Leiloeiro, Arrematante */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {ROLE_CARDS.map(({ key, label, icon: Icon }) => (
          <Card key={key} className="bg-white border-nz-borda">
            <CardContent className="p-3">
              <div className="text-center">
                <Icon className="w-5 h-5 mx-auto mb-1.5 text-nz-marrom" />
                <p className="text-xs mb-1 text-nz-tinta-fraca">{label}</p>
                <p className="text-xl font-bold text-nz-tinta">{stats[key]}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {PURCHASE_CARDS.map(({ key, label, icon: Icon }) => {
          const ativo = purchaseStatusFilter === key;
          return (
            <Card
              key={key}
              className={`cursor-pointer transition-all ${ativo ? 'bg-nz-verde-fundo border-nz-verde ring-2 ring-nz-verde/40' : 'bg-white border-nz-borda hover:bg-nz-cinza-fundo'}`}
              onClick={() => onPurchaseStatusClick(ativo ? 'all' : key)}
            >
              <CardContent className="p-3">
                <div className="text-center">
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${ativo ? 'text-nz-verde' : 'text-nz-tinta-fraca'}`} />
                  <p className="text-xs mb-1 text-nz-tinta-fraca">{label}</p>
                  <p className="text-2xl font-bold text-nz-tinta">{key === 'sem_compra' ? stats.semCompra : stats[key]}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}