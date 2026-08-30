import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, TrendingUp, Briefcase, DollarSign, ShoppingCart,
  MessageSquare, Clock, CheckCircle, Package, Truck, XCircle,
  Gavel, Store, Award, Landmark, Gavel as GavelIcon, UserCheck, Wallet
} from 'lucide-react';
import StatInfoTooltip from './StatInfoTooltip';

// ☀️ Redesenho (18/08/2026): removidas as cores fortes (laranja/azul/roxo/
// amarelo/vermelho/verde) — agora tudo no padrão branco + verde institucional
// já usado nas outras abas da Central de Vendas. Mesma estrutura, só pintura.
//
// 🔴 DIR-10 (27/08/2026) — pedido do dono: "o painel precisa ser intuitivo",
// cada setor explicado ao passar o mouse ou clicar. Todo card ganhou um ⓘ
// (StatInfoTooltip) com a definição exata do número e de onde ele vem — sem
// isso, "Faturamento Total" e "Volume em Negociação" pareciam iguais mas são
// coisas bem diferentes (receita real x volume transacionado x negociação
// manual), e ninguém teria como adivinhar isso só olhando o card.
const PURCHASE_CARDS = [
  { key: 'sem_compra', label: 'Sem Compra', icon: ShoppingCart, info: 'Pessoas do seu escopo que nunca compraram nada na Loja nem arremataram um leilão.' },
  { key: 'em_negociacao', label: 'Em Negociação', icon: MessageSquare, info: 'Clientes com uma negociação manual em andamento (cadastrada por um vendedor, não uma venda automática).' },
  { key: 'aguardando_pagamento', label: 'Aguardando Pag.', icon: Clock, info: 'Última compra do cliente está com pagamento pendente (PIX/boleto gerado, ainda não confirmado).' },
  { key: 'pago', label: 'Pago', icon: CheckCircle, info: 'Última compra do cliente já foi paga, aguardando envio.' },
  { key: 'enviado', label: 'Enviado', icon: Package, info: 'Última compra do cliente já saiu para entrega (etiqueta postada).' },
  { key: 'entregue', label: 'Entregue', icon: Truck, info: 'Última compra do cliente já foi entregue.' },
  { key: 'cancelado', label: 'Cancelado', icon: XCircle, info: 'Última compra do cliente foi cancelada.' },
];

const ROLE_CARDS = [
  { key: 'vendedores', label: 'Vendedores', icon: Store, info: 'Cadastros com permissão de vendedor ativa (is_seller ou cargo "vendedor").' },
  { key: 'licenciados', label: 'Licenciados', icon: Award, info: 'Cadastros com cargo de licenciado (catálogo ou aplicativo).' },
  { key: 'influencers', label: 'Influencers', icon: TrendingUp, info: 'Cadastros com cargo de influenciador.' },
  { key: 'investidores', label: 'Investidores', icon: Landmark, info: 'Cadastros com o papel "investidor".' },
  { key: 'leiloeiros', label: 'Leiloeiros', icon: GavelIcon, info: 'Cadastros com o papel "leiloeiro".' },
  { key: 'arrematantes', label: 'Arrematantes', icon: UserCheck, info: 'Pessoas que já venceram pelo menos um leilão de verdade e não têm nenhum outro papel de cargo (vendedor/licenciado/etc).' },
];

// Card genérico com rótulo + ⓘ, pra não repetir a mesma estrutura 20 vezes
function StatCard({ label, value, info, icon: Icon, highlight, wide }) {
  return (
    <Card className={`${highlight ? 'bg-nz-verde-fundo border-nz-verde/30' : 'bg-white border-nz-borda'} ${wide ? 'col-span-2 md:col-span-2' : ''}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-nz-tinta-fraca text-xs sm:text-sm mb-1 flex items-center">
              {label}
              {info && <StatInfoTooltip text={info} />}
            </p>
            <p className={`${wide || typeof value === 'string' ? 'text-lg sm:text-2xl' : 'text-xl sm:text-3xl'} font-bold text-nz-tinta`}>{value}</p>
          </div>
          <Icon className="w-8 h-8 text-nz-verde shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

// Bloco pequeno sem ícone/card próprio, usado dentro do "Espelho do Painel de
// Alavancagem" — mesma densidade da tela original (vários números pequenos
// lado a lado), sem repetir o Card+ícone do StatCard acima.
function MiniStat({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'bg-nz-verde-fundo border-nz-verde/30' : 'bg-nz-cinza-fundo border-nz-borda'}`}>
      <p className="text-xs text-nz-tinta-fraca mb-1">{label}</p>
      <p className={`text-lg sm:text-xl font-bold ${highlight ? 'text-nz-verde' : 'text-nz-tinta'}`}>{value}</p>
      {sub && <p className="text-[11px] text-nz-tinta-fraca mt-0.5">{sub}</p>}
    </div>
  );
}

// 🔴 Achado 30/08/2026 — sem maximumFractionDigits, toLocaleString cai no
// default de 3 casas quando o número acumula imprecisão de ponto flutuante
// (ex.: soma de cost_price × quantity linha a linha). Resultado visto em
// produção: "R$ 50.485,429" em vez de "R$ 50.485,43".
const fmtBRL = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CrmStatsCards({ stats, isSuperAdmin, purchaseStatusFilter, onPurchaseStatusClick }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <StatCard
          label="Total de Contatos" value={stats.total} icon={Users}
          info={isSuperAdmin
            ? 'Todo mundo cadastrado na plataforma (usuários reais) + clientes cadastrados manualmente que não têm conta.'
            : 'Todo mundo dentro da sua rede de indicação — quem você indicou, direta ou indiretamente.'}
        />
        <StatCard
          label="Leads" value={stats.leads} icon={TrendingUp}
          info="Cadastrados que ainda não compraram nada nem arremataram um leilão."
        />
        <StatCard
          label="Clientes Ativos" value={stats.clientes} icon={Users}
          info="Já compraram na Loja ou arremataram pelo menos um leilão de verdade."
        />
        <StatCard
          label="Volume em Negociação" value={fmtBRL(stats.volumeNegociacao)} icon={Briefcase} highlight
          info="Soma das negociações manuais em andamento (cadastradas por um vendedor) — não inclui vendas automáticas da Loja/Leilão."
        />
        <StatCard
          label={isSuperAdmin ? 'Faturamento Total' : 'Volume Transacionado'}
          value={fmtBRL(stats.totalSpent)}
          icon={DollarSign}
          info={isSuperAdmin
            ? 'Receita REAL da empresa — a mesma comissão de vendas + taxas do módulo Financeiro. Não é o valor total que os clientes pagaram (a maior parte disso vai pro vendedor terceiro). É este número (não o "Volume Financeiro Total" ao lado) que entra no cálculo de imposto do Simples Nacional.'
            : 'Soma do valor total que sua rede já comprou/arrematou — não é a sua comissão, é o volume transacionado por ela.'}
        />
      </div>

      {/* 💰 DIR-14/DIR-15 — "quero tudo, tudo, tudo": depósito + venda bruta de
          Loja/PDV + venda bruta de leilão, num card à parte, com cor e nome bem
          diferentes do Faturamento Total (que é só a comissão) pra nunca mais
          confundir. Mesmo critério de "dinheiro real" do Painel de Alavancagem
          (src/lib/dinheiroReal.js) — pago + rastro de gateway/saldo interno +
          a partir de 01/08/2026 (docs/MARCO-OFICIAL-AGOSTO-2026.md). */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <StatCard
          label="Volume Financeiro Total" value={fmtBRL(stats.volumeFinanceiroTotal)} icon={Landmark} highlight wide
          info="TUDO que já circulou de verdade na plataforma desde o lançamento oficial (01/08/2026): depósito em carteira digital + venda bruta de Loja/PDV + venda bruta de leilão, somados. NÃO é lucro nem receita da empresa (a maior parte vai pro vendedor/rede) — é volume movimentado. Para receita real, veja 'Faturamento Total'."
        />
        <StatCard
          label="— Depósitos em carteira" value={fmtBRL(stats.depositosCarteira)} icon={Wallet}
          info="Parte do Volume Financeiro Total que é depósito em carteira digital pago e confirmado (mesmo critério do Painel de Alavancagem). Depósito de saldo de operação/comissão não entra aqui — já é contado quando vira compra, pra não somar o mesmo real duas vezes."
        />
        <StatCard
          label="— Venda bruta (Loja + Leilão)" value={fmtBRL(stats.volumeVendasBruto)} icon={ShoppingCart}
          info="Parte do Volume Financeiro Total que é o valor cheio de compras/arremates pagos e confirmados — não é comissão, é o preço total pago pelo cliente. Leilão de Plano de Investimento, leilão de teste e venda sem confirmação real não entram aqui."
        />
      </div>

      {/* 📋 Espelho do Painel de Alavancagem (30/08/2026) — pedido do dono:
          "insira exatamente as informações que tem lá, não invente". Mesmos
          rótulos, mesmas fórmulas de NetworkOverview.jsx (fetchFinanceStats +
          conversion), só trocado pra plataforma inteira quando quem olha é
          super_admin. Valor total gerado aqui é SÓ depósito + compra de Loja
          (sem leilão), igual ao Painel de Alavancagem — comparável célula a
          célula, não é o "Volume Financeiro Total" do card acima. */}
      <Card className="bg-white border-nz-borda mb-4 sm:mb-6">
        <CardContent className="p-4 sm:p-5">
          <p className="text-sm font-semibold text-nz-tinta mb-3 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-nz-verde" />
            Espelho do Painel de Alavancagem
            <StatInfoTooltip text="Mesmos números, mesmos rótulos e mesma fórmula da tela 'Sistema de Alavancagem' — só que somando a plataforma inteira (ou a sua rede, se você não for super_admin), pra comparar direto com o que aparece lá, sem precisar traduzir nada na cabeça." />
          </p>
          <p className="text-xs text-nz-tinta-fraca mb-3 uppercase tracking-wide">Aquisição</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 mb-4">
            <MiniStat label="Total na base" value={stats.espelhoPainelAlavancagem.totalNaBase} sub="desde sempre, todo o histórico" />
            <MiniStat label="Novos (30 dias)" value={stats.espelhoPainelAlavancagem.novosUltimos30Dias} sub="entraram só nos últimos 30 dias" />
            <MiniStat label="Compradores únicos" value={stats.espelhoPainelAlavancagem.compradoresUnicos} sub="desde sempre, todo o histórico" />
            <MiniStat label="Conversão geral" value={`${stats.espelhoPainelAlavancagem.conversaoGeral.toFixed(1).replace('.', ',')}%`} sub={`${stats.espelhoPainelAlavancagem.compradoresUnicos} ÷ ${stats.espelhoPainelAlavancagem.totalNaBase} pessoas`} highlight />
            <MiniStat
              label="Compraram nos últimos 30 dias"
              value={`${stats.espelhoPainelAlavancagem.compraramUltimos30Dias} (${stats.espelhoPainelAlavancagem.taxaRecente.toFixed(1).replace('.', ',')}%)`}
              sub={`${stats.espelhoPainelAlavancagem.compraramUltimos30Dias} ÷ ${stats.espelhoPainelAlavancagem.novosUltimos30Dias} novos da base (30 dias)`}
              highlight
            />
          </div>
          <p className="text-xs text-nz-tinta-fraca mb-3 uppercase tracking-wide">Receita</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <MiniStat label="Depósitos" value={stats.espelhoPainelAlavancagem.depositosCount} />
            <MiniStat label="Valor total gerado" value={fmtBRL(stats.espelhoPainelAlavancagem.valorTotalGerado)} highlight />
            <MiniStat
              label="Ticket médio / comprador"
              value={fmtBRL(stats.espelhoPainelAlavancagem.ticketMedio)}
              sub={`${fmtBRL(stats.espelhoPainelAlavancagem.valorTotalGerado)} ÷ ${stats.espelhoPainelAlavancagem.compradoresUnicos} compradores`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Movimentação real: leilões arrematados + estoque disponível */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <StatCard
          label="Leilões Arrematados" value={stats.leiloesArrematados} icon={Gavel}
          info="Quantidade de leilões vencidos de verdade (Auction.winner_id) por pessoas do seu escopo."
        />
        <StatCard
          label="Produtos em Estoque" value={stats.produtosDisponiveis} icon={Package}
          info="Produtos ativos no catálogo (catalog_active) com quantidade disponível maior que zero."
        />
        <StatCard
          label="Valor Investido em Estoque" value={fmtBRL(stats.valorEstoque)} icon={DollarSign} wide
          info="Custo real de cada produto em estoque (o que foi pago, não o preço de venda) × quantidade disponível."
        />
      </div>

      {/* Rede por Tipo — Vendedor, Licenciado, Influencer, Investidor, Leiloeiro, Arrematante */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {ROLE_CARDS.map(({ key, label, icon: Icon, info }) => (
          <Card key={key} className="bg-white border-nz-borda">
            <CardContent className="p-3">
              <div className="text-center">
                <Icon className="w-5 h-5 mx-auto mb-1.5 text-nz-marrom" />
                <p className="text-xs mb-1 text-nz-tinta-fraca flex items-center justify-center">
                  {label}
                  <StatInfoTooltip text={info} />
                </p>
                <p className="text-xl font-bold text-nz-tinta">{stats[key]}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {PURCHASE_CARDS.map(({ key, label, icon: Icon, info }) => {
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
                  <p className="text-xs mb-1 text-nz-tinta-fraca flex items-center justify-center">
                    {label}
                    <StatInfoTooltip text={info} />
                  </p>
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
