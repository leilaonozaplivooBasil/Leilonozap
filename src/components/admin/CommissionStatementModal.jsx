import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';

const CommissionRecord = base44.entities.CommissionRecord;
const CatalogSale = base44.entities.CatalogSale;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, DollarSign, ShoppingBag, Calendar, TrendingUp, ChevronDown, ChevronUp, Smartphone, Package, Wallet } from 'lucide-react';

const ROLE_LABELS = {
  influencer_app: "Influencer",
  licenciado_catalogo: "Licenciado",
  trainee: "Trainee",
  executivo: "Executivo",
  kit_start: "Kit Start",
  plano_lider: "Plano Líder",
  plano_lojista: "Plano Lojista",
  distribuidor: "Distribuidor",
  diretoria: "Diretoria",
  diretor: "Diretor",
  ceo: "CEO",
  conselheiro: "Conselheiro",
  fundador: "Fundador",
  site_official_rollup: "Empresa"
};

// Card agrupado por venda - mostra todos os cargos que você ganhou nessa venda
const SaleCard = ({ saleId, records, sale, isExpanded, onToggle }) => {
    const totalAmount = records.reduce((sum, r) => sum + (r.amount || 0), 0);
    const saleAmount = records[0]?.sale_amount || sale?.total_amount || 0;
    const productTitle = records[0]?.product_title || sale?.product_title || 'Produto';
    const dateStr = new Date(records[0]?.created_date || Date.now()).toLocaleDateString('pt-BR');
    const saleType = records[0]?.sale_type || 'catalog';

    return (
        <Card className="bg-gray-800/50 border-gray-700/50 mb-3 overflow-hidden">
            <div 
                className="p-4 cursor-pointer hover:bg-gray-700/30 transition-colors"
                onClick={onToggle}
            >
                {/* Header da venda */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{dateStr}</span>
                        <span className="mx-1">•</span>
                        <span className={saleType === 'auction' ? 'text-cyan-400' : 'text-blue-400'}>
                            {saleType === 'auction' ? '📱 App' : '🛍️ Catálogo'}
                        </span>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                </div>

                {/* Produto e valor */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-medium text-white truncate">{productTitle}</p>
                            <p className="text-sm text-gray-500">Venda: R$ {Number(saleAmount).toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="text-right ml-3">
                        <p className="text-xl font-bold text-green-400">+R$ {totalAmount.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{records.length} cargo{records.length > 1 ? 's' : ''}</p>
                    </div>
                </div>
            </div>

            {/* Detalhes expandidos - lista de cargos */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-700/50">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mt-3 mb-2">Suas comissões nesta venda:</p>
                    <div className="space-y-2">
                        {records.map((record, idx) => (
                            <div key={record.id || idx} className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="text-sm text-gray-300">{ROLE_LABELS[record.role] || record.role}</span>
                                    <span className="text-xs text-gray-500">({Number(record.percent || 0).toFixed(1)}%)</span>
                                </div>
                                <span className="text-sm font-semibold text-green-400">+R$ {Number(record.amount || 0).toFixed(2)}</span>
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
                     const records = await CommissionRecord.filter(
                         { user_id: licensee.id },
                         "-created_date",
                         500
                     );

                     if (!Array.isArray(records)) {
                         setIsLoading(false);
                         return;
                     }

                     const saleIds = Array.from(new Set(records.map(r => r.sale_id).filter(Boolean)));
                     let salesMap = {};
                     if (saleIds.length > 0) {
                         const sales = await CatalogSale.filter(
                             { id: { $in: saleIds } },
                             "-created_date",
                             saleIds.length
                         );
                         if (Array.isArray(sales)) {
                             salesMap = Object.fromEntries(sales.map(s => [s.id, s]));
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
            <DialogContent className="sm:max-w-4xl bg-gray-900 border-gray-700 text-white max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-green-400">
                        <DollarSign className="w-6 h-6"/>
                        Histórico Detalhado de Comissões
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Comissões de {licensee?.full_name} separadas por canal de venda
                    </DialogDescription>
                </DialogHeader>

                {/* Cards de Resumo por Canal */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
                    {/* Saldo Disponível */}
                    <div className="p-4 bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-xl border border-green-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet className="w-5 h-5 text-green-400" />
                            <span className="text-sm text-gray-300">Saldo Disponível</span>
                        </div>
                        <p className="text-2xl font-bold text-green-400">
                            R$ {(licensee?.commission_balance || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Valor disponível para saque</p>
                    </div>

                    {/* App (3%) */}
                    <div className="p-4 bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-xl border border-cyan-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <Smartphone className="w-5 h-5 text-cyan-400" />
                            <span className="text-sm text-gray-300">📱 App (3%)</span>
                        </div>
                        <p className="text-2xl font-bold text-cyan-400">
                            R$ {totals.app.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {commissionRecords.filter(r => r.record.sale_type === 'auction').length} arremates
                        </p>
                    </div>

                    {/* Catálogo (26%) */}
                    <div className="p-4 bg-gradient-to-br from-blue-900/40 to-purple-900/40 rounded-xl border border-blue-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <Package className="w-5 h-5 text-blue-400" />
                            <span className="text-sm text-gray-300">🛍️ Catálogo (26%)</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-400">
                            R$ {totals.catalog.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {commissionRecords.filter(r => r.record.sale_type === 'catalog' || !r.record.sale_type).length} vendas
                        </p>
                    </div>
                </div>

                {/* Tabs por Canal */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <TabsList className="bg-gray-800 border-gray-700 w-full justify-start">
                        <TabsTrigger value="todos" className="flex-1">
                            📊 Todos ({commissionRecords.length})
                        </TabsTrigger>
                        <TabsTrigger value="app" className="flex-1">
                            📱 App ({commissionRecords.filter(r => r.record.sale_type === 'auction').length})
                        </TabsTrigger>
                        <TabsTrigger value="catalogo" className="flex-1">
                            🛍️ Catálogo ({commissionRecords.filter(r => r.record.sale_type === 'catalog' || !r.record.sale_type).length})
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-hidden mt-4">
                        {/* Resumo por cargo (apenas na aba Todos) */}
                        {activeTab === 'todos' && Object.keys(roleTotals).length > 0 && (
                            <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                                <div className="text-sm text-gray-300 mb-2">Resumo por cargo</div>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(roleTotals).map(([role, total]) => (
                                        <Badge key={role} className={`${ROLE_COLORS[role] ?? 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                                            {(ROLE_LABELS[role] ?? role)} · R$ {Number(total).toFixed(2)}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Lista de Comissões */}
                        <div className="max-h-[40vh] overflow-y-auto pr-2">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                                </div>
                            ) : filteredRecords.length > 0 ? (
                                filteredRecords.map(({ record, sale }) => (
                                    <CommissionRecordItem 
                                        key={record.id} 
                                        record={record} 
                                        sale={sale}
                                        expandedId={expandedId}
                                        onToggleExpand={setExpandedId}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-16 bg-gray-800 rounded-lg">
                                    <TrendingUp className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                                    <p className="text-gray-400 font-semibold">
                                        {activeTab === 'app' 
                                            ? 'Nenhuma comissão do App ainda.' 
                                            : activeTab === 'catalogo'
                                            ? 'Nenhuma comissão do Catálogo ainda.'
                                            : 'Nenhuma comissão registrada ainda.'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {activeTab === 'app' 
                                            ? 'Compartilhe seu link do App para ganhar 3% dos arremates dos seus indicados.' 
                                            : activeTab === 'catalogo'
                                            ? 'Venda pelo seu link do Catálogo para ganhar comissões.'
                                            : 'Quando suas vendas gerarem comissões, elas aparecerão aqui.'}
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