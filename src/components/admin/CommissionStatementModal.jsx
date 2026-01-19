import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';

const CommissionRecord = base44.entities.CommissionRecord;
const CatalogSale = base44.entities.CatalogSale;
const AppUser = base44.entities.AppUser;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, DollarSign, User, ShoppingBag, Calendar, TrendingUp, ChevronDown, ChevronUp, Smartphone, Package, Wallet } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS = {
  influencer_app: "Influencer (App 3%)",
  licenciado_catalogo: "Licenciado Catálogo",
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
  site_official_rollup: "Empresa (NoZap)"
};

const ROLE_COLORS = {
  influencer_app: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  licenciado_catalogo: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  trainee: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  executivo: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  kit_start: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  plano_lider: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  plano_lojista: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  distribuidor: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  diretoria: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  diretor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  ceo: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  conselheiro: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  fundador: "bg-lime-500/15 text-lime-300 border-lime-500/30",
  site_official_rollup: "bg-gray-500/15 text-gray-300 border-gray-500/30"
};

const CommissionRecordItem = ({ record, sale, expandedId, onToggleExpand }) => {
    const orderTotal = record.sale_amount || sale?.total_amount || sale?.sale_price || 0;
    const roleLabel = ROLE_LABELS[record.role] || record.role;
    const roleColor = ROLE_COLORS[record.role] || "bg-gray-700 text-gray-300 border-gray-600";
    const dateStr = new Date(record.created_date || sale?.created_date || Date.now()).toLocaleDateString('pt-BR');
    const isExpanded = expandedId === record.id;
    const saleType = record.sale_type || 'catalog';
    const saleTypeLabel = saleType === 'auction' ? '📱 App (3%)' : '🛍️ Catálogo (26%)';

    return (
        <Card className="bg-gray-800 border-gray-700 mb-3">
            <CardHeader className="pb-2 cursor-pointer hover:bg-gray-750 transition" onClick={() => onToggleExpand(record.id)}>
                <div className="flex justify-between items-center text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span>{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className={saleType === 'auction' ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-blue-500/15 text-blue-300 border-blue-500/30'}>
                            {saleTypeLabel}
                        </Badge>
                        <Badge className={`${roleColor} font-semibold`}>
                            {roleLabel}
                        </Badge>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pb-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-gray-700 rounded-lg">
                            <ShoppingBag className="w-5 h-5 text-gray-300" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-white line-clamp-1">
                                {record.product_title || sale?.product_title || (sale ? `Venda ${sale.product_id}` : 'Comissão de venda')}
                            </p>
                            {orderTotal ? (
                                <p className="text-sm text-gray-400">Valor da venda: R$ {Number(orderTotal).toFixed(2)}</p>
                            ) : null}
                        </div>
                    </div>
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/30 font-bold text-base mt-2 sm:mt-0 whitespace-nowrap">
                        + R$ {Number(record.amount || 0).toFixed(2)}
                    </Badge>
                </div>
                
                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-gray-500 text-xs mb-1">Tipo de Venda</p>
                                <p className="font-semibold text-white">{saleTypeLabel}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs mb-1">Cargo</p>
                                <p className="font-semibold text-white">{roleLabel}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs mb-1">Percentual</p>
                                <p className="font-semibold text-green-400">{Number(record.percent || 0).toFixed(2)}%</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs mb-1">Comissão Recebida</p>
                                <p className="font-semibold text-green-400">R$ {Number(record.amount || 0).toFixed(2)}</p>
                            </div>
                            {record.anchor_user_name && (
                            <div className="col-span-2">
                                <p className="text-gray-500 text-xs mb-1">Licenciado Âncora</p>
                                <p className="font-semibold text-blue-400">{record.anchor_user_name}</p>
                            </div>
                            )}
                            <div>
                                <p className="text-gray-500 text-xs mb-1">Status</p>
                                <Badge className={record.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}>
                                    {record.status === 'pending' ? 'Pendente' : record.status === 'confirmed' ? 'Confirmado' : 'Processado'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default function CommissionStatementModal({ licensee, isOpen, onClose }) {
     const [commissionRecords, setCommissionRecords] = useState([]);
     const [isLoading, setIsLoading] = useState(false);
     const [roleTotals, setRoleTotals] = useState({});
     const [expandedId, setExpandedId] = useState(null);
     const [activeTab, setActiveTab] = useState('todos');

     useEffect(() => {
         if (isOpen && licensee) {
             const fetchCommissionRecords = async () => {
                 setIsLoading(true);
                 setCommissionRecords([]);
                 setRoleTotals({});
                 try {
                     console.log(`🔍 Buscando comissões para ${licensee.full_name}...`);

                     // Busca comissões do usuário específico
                     const records = await CommissionRecord.filter(
                         { user_id: licensee.id },
                         "-created_date",
                         500
                     );

                     if (!Array.isArray(records)) {
                         console.warn("CommissionRecord não retornou um array:", records);
                         setIsLoading(false);
                         return;
                     }

                     // Buscar vendas relacionadas
                     const saleIds = Array.from(new Set(records.map(r => r.sale_id).filter(Boolean)));
                     let salesById = {};
                     if (saleIds.length > 0) {
                         const sales = await CatalogSale.filter(
                             { id: { $in: saleIds } },
                             "-created_date",
                             saleIds.length
                         );
                         if (Array.isArray(sales)) {
                             salesById = Object.fromEntries(sales.map(s => [s.id, s]));
                         }
                     }

                     const enriched = records.map(r => ({ record: r, sale: salesById[r.sale_id] || null }));
                     setCommissionRecords(enriched);

                     // Totais por cargo
                     const totals = records.reduce((acc, r) => {
                         const role = r.role || "outro";
                         acc[role] = (acc[role] || 0) + (r.amount || 0);
                         return acc;
                     }, {});
                     setRoleTotals(totals);

                     console.log(`✅ ${enriched.length} registros carregados.`);
                 } catch (error) {
                     console.error("Failed to fetch commission records:", error);
                     alert("Erro ao buscar extrato de comissões.");
                 } finally {
                     setIsLoading(false);
                 }
             };
             fetchCommissionRecords();
         }
     }, [isOpen, licensee]);

     // Filtrar por tipo
     const filteredRecords = useMemo(() => {
         if (activeTab === 'todos') return commissionRecords;
         if (activeTab === 'app') return commissionRecords.filter(r => r.record.sale_type === 'auction');
         if (activeTab === 'catalogo') return commissionRecords.filter(r => r.record.sale_type === 'catalog' || !r.record.sale_type);
         return commissionRecords;
     }, [commissionRecords, activeTab]);

     // Totais por tipo
     const totals = useMemo(() => {
         const appTotal = commissionRecords
             .filter(r => r.record.sale_type === 'auction')
             .reduce((sum, r) => sum + (r.record.amount || 0), 0);
         const catalogTotal = commissionRecords
             .filter(r => r.record.sale_type === 'catalog' || !r.record.sale_type)
             .reduce((sum, r) => sum + (r.record.amount || 0), 0);
         return { app: appTotal, catalog: catalogTotal, total: appTotal + catalogTotal };
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