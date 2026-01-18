import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const CommissionRecord = base44.entities.CommissionRecord;
const CatalogSale = base44.entities.CatalogSale;
const AppUser = base44.entities.AppUser;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, DollarSign, User, ShoppingBag, Calendar, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS = {
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
  fundador: "Fundador"
};

const ROLE_COLORS = {
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
  fundador: "bg-lime-500/15 text-lime-300 border-lime-500/30"
};

const CommissionRecordItem = ({ record, sale, expandedId, onToggleExpand }) => {
    const orderTotal = sale?.total_amount ?? sale?.sale_price ?? 0;
    const roleLabel = ROLE_LABELS[record.role] || record.role;
    const roleColor = ROLE_COLORS[record.role] || "bg-gray-700 text-gray-300 border-gray-600";
    const dateStr = new Date(record.created_date || sale?.created_date || Date.now()).toLocaleDateString('pt-BR');
    const isExpanded = expandedId === record.id;

    return (
        <Card className="bg-gray-800 border-gray-700 mb-3">
            <CardHeader className="pb-2 cursor-pointer hover:bg-gray-750 transition" onClick={() => onToggleExpand(record.id)}>
                <div className="flex justify-between items-center text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span>{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-2">
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
                                {sale?.product_title || (sale ? `Venda ${sale.product_id}` : 'Comissão de venda')}
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
                            <div>
                                <p className="text-gray-500 text-xs mb-1">Status</p>
                                <Badge className={record.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}>
                                    {record.status === 'pending' ? 'Pendente' : 'Processado'}
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

     async function buildHierarchyChain(user) {
         const chain = [user.id];
         let current = user;
         while (current?.referred_by_id) {
             const parent = await AppUser.filter({ id: current.referred_by_id });
             if (Array.isArray(parent) && parent.length > 0) {
                 const p = parent[0];
                 chain.push(p.id);
                 current = p;
             } else {
                 break;
             }
         }
         return chain;
     }

     useEffect(() => {
         if (isOpen && licensee) {
             const fetchCommissionRecords = async () => {
                 setIsLoading(true);
                 setCommissionRecords([]);
                 setRoleTotals({});
                 try {
                     console.log(`🔍 Buscando comissões para ${licensee.full_name} e sua hierarquia...`);

                     const chain = await buildHierarchyChain(licensee);
                     const records = await CommissionRecord.filter(
                         { user_id: { $in: chain } },
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

                     console.log(`✅ ${enriched.length} registros carregados da cadeia.`);
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl bg-gray-900 border-gray-700 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-green-400">
                        <DollarSign className="w-6 h-6"/>
                        Extrato de Comissões e Arremates do Sistema
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Detalhes de todas as comissões geradas pelo seu sistema de alavancagem para o licenciado {licensee?.full_name}.
                    </DialogDescription>
                </DialogHeader>

                <div className="my-4 p-4 bg-gray-800 rounded-lg flex justify-between items-center">
                    <span className="font-medium text-gray-300">Saldo Total de Comissões:</span>
                    <span className="text-2xl font-bold text-green-400">V$ {((licensee?.catalog_commission_balance ?? licensee?.commission_balance ?? 0)).toFixed(2)}</span>
                </div>

                <div className="mt-4">
                    {Object.keys(roleTotals).length > 0 && (
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

                    <div className="max-h-[55vh] overflow-y-auto pr-2">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                            </div>
                        ) : commissionRecords.length > 0 ? (
                             commissionRecords.map(({ record, sale }) => (
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
                                <p className="text-gray-400 font-semibold">Nenhuma comissão registrada ainda.</p>
                                <p className="text-sm text-gray-500">Quando suas vendas gerarem comissões, elas aparecerão aqui.</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}