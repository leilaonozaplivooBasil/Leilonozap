import React, { useState, useEffect, useMemo } from 'react';
import { fmtBR } from '@/lib/money';
import { plataforma } from '@/api/plataformaClient';

const CommissionRecord = plataforma.entities.CommissionRecord;
const CatalogSale = plataforma.entities.CatalogSale;
const Auction = plataforma.entities.Auction;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, DollarSign, ShoppingBag, Calendar, TrendingUp, ChevronDown, ChevronUp, Gavel, User } from 'lucide-react';

const ROLE_LABELS = {
  influencer_app: "Influencer",
  licenciado_catalogo: "Licenciado",
  trainee: "Trainee",
  executivo: "Executivo",
  kit_start: "Kit Start",
  plano_lider: "Plano Líder",
  plano_lojista: "Plano Lojista",
  distribuidor: "Distribuidor",
  diretor: "Diretor",
  diretoria: "Diretoria",
  ceo: "CEO",
  conselheiro: "Conselheiro",
  fundador: "Fundador",
  site_official_rollup: "Empresa"
};

// Ordem hierárquica do Comando Mestre (menor → maior)
const ROLE_ORDER = [
  'licenciado_catalogo',
  'trainee',
  'executivo',
  'kit_start',
  'plano_lider',
  'plano_lojista',
  'distribuidor',
  'diretor',
  'diretoria',
  'ceo',
  'conselheiro',
  'fundador',
  'site_official_rollup',
  'influencer_app'
];

// Card agrupado por venda - mostra todos os cargos que você ganhou nessa venda
// 🎨 Mesma identidade visual (branco + verde) do restante do Painel de Alavancagem
const SaleCard = ({ saleId, records, sale, isExpanded, onToggle }) => {
    const totalAmount = records.reduce((sum, r) => sum + (r.amount || 0), 0);
    const saleAmount = records[0]?.sale_amount || sale?.total_amount || 0;
    const productTitle = records[0]?.product_title || sale?.product_title || 'Produto';
    const dateStr = new Date(records[0]?.created_date || Date.now()).toLocaleDateString('pt-BR');
    const saleType = records[0]?.sale_type || 'catalog';
    const buyerName = sale?.buyer_name || 'Comprador não identificado';
    // 🆕 De qual Loja Virtual (licenciado/vendedor dono do link) essa venda saiu
    const storeOwnerName = records[0]?.anchor_user_name || sale?.licensee_name || sale?.seller_name || null;

    return (
        <Card className="bg-white border-nz-borda mb-3 overflow-hidden">
            <div
                className="p-4 cursor-pointer hover:bg-nz-verde-fundo/40 transition-colors"
                onClick={onToggle}
            >
                {/* Header da venda */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{dateStr}</span>
                        <span className="mx-1">•</span>
                        <span className="text-nz-verde">
                            <span className="inline-flex items-center gap-1">
                  {saleType === 'auction' ? <Gavel className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                  {saleType === 'auction' ? 'Leilão' : 'Loja Virtual'}
                </span>
                        </span>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                </div>

                {/* Produto e valor */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-nz-verde-fundo flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="w-5 h-5 text-nz-verde" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{productTitle}</p>
                            <p className="text-sm text-gray-500">Venda: R$ {fmtBR(Number(saleAmount))}</p>
                            {/* 🆕 Quem comprou — pra a pessoa acompanhar de onde veio a comissão */}
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <User className="w-3 h-3" />
                                <span>Cliente: <span className="font-medium text-gray-700">{buyerName}</span></span>
                            </p>
                            {/* 🆕 Loja Virtual de quem — o licenciado/vendedor dono do link que gerou a venda */}
                            {storeOwnerName && (
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                    <ShoppingBag className="w-3 h-3" />
                                    <span>Loja Virtual de: <span className="font-medium text-gray-700">{storeOwnerName}</span></span>
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="text-right ml-3">
                        <p className="text-xl font-bold text-nz-verde">+R$ {fmtBR(totalAmount)}</p>
                        <p className="text-xs text-gray-500">{records.length} cargo{records.length > 1 ? 's' : ''}</p>
                    </div>
                </div>
            </div>

            {/* Detalhes expandidos - lista de cargos */}
            {isExpanded && (
            <div className="px-4 pb-4 border-t border-nz-borda">
                <p className="text-xs text-gray-500 uppercase tracking-wide mt-3 mb-2">Suas comissões nesta venda:</p>
                <div className="space-y-2">
                    {[...records]
                        .sort((a, b) => ROLE_ORDER.indexOf(b.role) - ROLE_ORDER.indexOf(a.role))
                        .map((record, idx) => (
                        <div key={record.id || idx} className="flex items-center justify-between py-2 px-3 bg-nz-verde-fundo/60 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-nz-verde"></div>
                                <span className="text-sm text-gray-700">{ROLE_LABELS[record.role] || record.role}</span>
                                <span className="text-xs text-gray-500">({Number(record.percent || 0).toFixed(1)}%)</span>
                            </div>
                            <span className="text-sm font-semibold text-nz-verde">+R$ {fmtBR(Number(record.amount || 0))}</span>
                        </div>
                    ))}
                </div>
            </div>
            )}
        </Card>
    );
};

export default function CommissionStatementModal({ licensee, isOpen, onClose }) {
     const [commissionRecords, setCommissionRecords] = useState([]);
     const [salesById, setSalesById] = useState({});
     const [isLoading, setIsLoading] = useState(false);
     const [expandedSaleId, setExpandedSaleId] = useState(null);
     const [activeTab, setActiveTab] = useState('todos');

     useEffect(() => {
         if (isOpen && licensee) {
             const fetchCommissionRecords = async () => {
                 setIsLoading(true);
                 setCommissionRecords([]);
                 setSalesById({});
                 try {
                     const rawRecords = await CommissionRecord.filter(
                         { user_id: licensee.id },
                         "-created_date",
                         500
                     );

                     if (!Array.isArray(rawRecords)) {
                         setIsLoading(false);
                         return;
                     }

                     // Exclui comissões revertidas (ex.: comissão indevida de depósito de carteira, cancelada)
                     const records = rawRecords.filter(r => r.status !== 'canceled');

                     // 🆕 Comissão de Loja Virtual busca o comprador em CatalogSale; comissão de
                     // Leilão busca o arrematante (winner_name) em Auction — normalizados aqui
                     // num único formato {buyer_name, product_title, total_amount} pro card usar.
                     const catalogSaleIds = Array.from(new Set(records.filter(r => r.sale_type !== 'auction').map(r => r.sale_id).filter(Boolean)));
                     const auctionSaleIds = Array.from(new Set(records.filter(r => r.sale_type === 'auction').map(r => r.sale_id).filter(Boolean)));
                     let salesMap = {};
                     if (catalogSaleIds.length > 0) {
                         const sales = await CatalogSale.filter(
                             { id: { $in: catalogSaleIds } },
                             "-created_date",
                             catalogSaleIds.length
                         );
                         if (Array.isArray(sales)) {
                             sales.forEach(s => { salesMap[s.id] = s; });
                         }
                     }
                     if (auctionSaleIds.length > 0) {
                         const auctions = await Auction.filter(
                             { id: { $in: auctionSaleIds } },
                             "-created_date",
                             auctionSaleIds.length
                         );
                         if (Array.isArray(auctions)) {
                             auctions.forEach(a => {
                                 salesMap[a.id] = { buyer_name: a.winner_name, product_title: a.title, total_amount: a.current_price };
                             });
                         }
                     }

                     setCommissionRecords(records);
                     setSalesById(salesMap);
                 } catch (error) {
                     console.error("Failed to fetch commission records:", error);
                 } finally {
                     setIsLoading(false);
                 }
             };
             fetchCommissionRecords();
         }
     }, [isOpen, licensee]);

     // Agrupar registros por sale_id
     const groupedBySale = useMemo(() => {
         const groups = {};
         commissionRecords.forEach(record => {
             const saleId = record.sale_id || 'unknown';
             if (!groups[saleId]) {
                 groups[saleId] = [];
             }
             groups[saleId].push(record);
         });
         // Ordenar por data mais recente
         return Object.entries(groups).sort((a, b) => {
             const dateA = new Date(a[1][0]?.created_date || 0);
             const dateB = new Date(b[1][0]?.created_date || 0);
             return dateB - dateA;
         });
     }, [commissionRecords]);

     // Filtrar por tipo
     const filteredGroups = useMemo(() => {
         if (activeTab === 'todos') return groupedBySale;
         if (activeTab === 'app') return groupedBySale.filter(([_, records]) => records[0]?.sale_type === 'auction');
         if (activeTab === 'catalogo') return groupedBySale.filter(([_, records]) => records[0]?.sale_type === 'catalog' || !records[0]?.sale_type);
         return groupedBySale;
     }, [groupedBySale, activeTab]);

     // Totais por tipo
     const totals = useMemo(() => {
         const appTotal = commissionRecords
             .filter(r => r.sale_type === 'auction')
             .reduce((sum, r) => sum + (r.amount || 0), 0);
         const catalogTotal = commissionRecords
             .filter(r => r.sale_type === 'catalog' || !r.sale_type)
             .reduce((sum, r) => sum + (r.amount || 0), 0);
         return { app: appTotal, catalog: catalogTotal, total: appTotal + catalogTotal };
     }, [commissionRecords]);

     // Contagem de vendas por tipo
     const saleCounts = useMemo(() => {
         const appSales = new Set(commissionRecords.filter(r => r.sale_type === 'auction').map(r => r.sale_id)).size;
         const catalogSales = new Set(commissionRecords.filter(r => r.sale_type === 'catalog' || !r.sale_type).map(r => r.sale_id)).size;
         return { app: appSales, catalog: catalogSales, total: appSales + catalogSales };
     }, [commissionRecords]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-white border-nz-borda text-nz-tinta max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="pb-0">
                    <DialogTitle className="flex items-center gap-2 text-gray-900 text-lg">
                        <DollarSign className="w-5 h-5 text-nz-verde"/>
                        Histórico de Comissões
                    </DialogTitle>
                    <DialogDescription className="text-gray-500 text-sm">
                        {licensee?.full_name}
                    </DialogDescription>
                </DialogHeader>

                {/* Cards de Resumo - Design Minimalista */}
                <div className="grid grid-cols-3 gap-2 my-4">
                    <div className="p-3 bg-nz-verde-fundo rounded-lg text-center border border-nz-verde/20">
                        <p className="text-xs text-gray-500 mb-1">Disponível</p>
                        <p className="text-lg font-bold text-nz-verde">
                            R$ {fmtBR((licensee?.commission_balance || 0))}
                        </p>
                    </div>
                    <div className="p-3 bg-nz-verde-fundo rounded-lg text-center border border-nz-verde/20">
                        <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1"><Gavel className="w-3 h-3" />Leilão</p>
                        <p className="text-lg font-bold text-nz-verde">
                            R$ {fmtBR(totals.app)}
                        </p>
                    </div>
                    <div className="p-3 bg-nz-verde-fundo rounded-lg text-center border border-nz-verde/20">
                        <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1"><ShoppingBag className="w-3 h-3" />Loja Virtual</p>
                        <p className="text-lg font-bold text-nz-verde">
                            R$ {fmtBR(totals.catalog)}
                        </p>
                    </div>
                </div>

                {/* Tabs por Canal */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <TabsList className="bg-white border border-nz-marrom/20 w-full grid grid-cols-3 h-9">
                        <TabsTrigger value="todos" className="text-xs border border-transparent data-[state=inactive]:border-nz-marrom/15 data-[state=inactive]:hover:bg-nz-marrom-fundo/40">
                            Todos ({saleCounts.total})
                        </TabsTrigger>
                        <TabsTrigger value="app" className="text-xs border border-transparent data-[state=inactive]:border-nz-marrom/15 data-[state=inactive]:hover:bg-nz-marrom-fundo/40">
                            Leilão ({saleCounts.app})
                        </TabsTrigger>
                        <TabsTrigger value="catalogo" className="text-xs border border-transparent data-[state=inactive]:border-nz-marrom/15 data-[state=inactive]:hover:bg-nz-marrom-fundo/40">
                            Loja Virtual ({saleCounts.catalog})
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-hidden mt-3">
                        {/* Lista de Vendas Agrupadas */}
                        <div className="max-h-[50vh] overflow-y-auto pr-1">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="w-6 h-6 animate-spin text-nz-verde" />
                                </div>
                            ) : filteredGroups.length > 0 ? (
                                filteredGroups.map(([saleId, records]) => (
                                    <SaleCard
                                        key={saleId}
                                        saleId={saleId}
                                        records={records}
                                        sale={salesById[saleId]}
                                        isExpanded={expandedSaleId === saleId}
                                        onToggle={() => setExpandedSaleId(expandedSaleId === saleId ? null : saleId)}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-12 bg-nz-cinza-fundo rounded-lg">
                                    <TrendingUp className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                                    <p className="text-gray-600 font-medium">
                                        Nenhuma comissão ainda
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {activeTab === 'app'
                                            ? 'Compartilhe seu link de Leilão'
                                            : activeTab === 'catalogo'
                                            ? 'Venda pela Loja Virtual'
                                            : 'Suas comissões aparecerão aqui'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}