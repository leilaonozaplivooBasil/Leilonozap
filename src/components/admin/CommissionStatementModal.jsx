import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;
const Auction = base44.entities.Auction;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, DollarSign, User, ShoppingBag, Calendar, TrendingUp } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const CommissionEntry = ({ auction, winner }) => {
    const commissionValue = auction.current_price * 0.03;
    return (
        <Card className="bg-gray-800 border-gray-700 mb-4">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(auction.updated_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        <span>Arrematado por: <strong>{winner.full_name}</strong></span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-gray-700 rounded-lg">
                            <ShoppingBag className="w-5 h-5 text-gray-300" />
                        </div>
                        <div>
                            <p className="font-semibold text-white line-clamp-1">{auction.title}</p>
                            <p className="text-sm text-gray-400">Valor do arremate: R$ {auction.current_price.toFixed(2)}</p>
                        </div>
                    </div>
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/30 font-bold text-base mt-2 sm:mt-0">
                        + V$ {commissionValue.toFixed(2)}
                    </Badge>
                </div>
                 <div className="text-right text-xs text-gray-500 mt-2 italic">
                    Cálculo: R$ {auction.current_price.toFixed(2)} &times; 3%
                </div>
            </CardContent>
        </Card>
    );
};

export default function CommissionStatementModal({ licensee, isOpen, onClose }) {
    const [commissionRecords, setCommissionRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && licensee) {
            const fetchCommissionRecords = async () => {
                setIsLoading(true);
                setCommissionRecords([]);
                try {
                    console.log(`🔍 Buscando comissões para ${licensee.full_name}...`);
                    
                    // 1. Encontrar todos os usuários indicados pelo licenciado
                    const indicatedUsers = await AppUser.filter({ referred_by_id: licensee.id });
                    
                    if (!Array.isArray(indicatedUsers) || indicatedUsers.length === 0) {
                        console.log("❌ Nenhum usuário indicado encontrado.");
                        setIsLoading(false);
                        return;
                    }
                    
                    const indicatedUserIds = indicatedUsers.map(u => u.id).filter(Boolean);
                    console.log(`✅ ${indicatedUserIds.length} usuários indicados encontrados.`);

                    if (indicatedUserIds.length === 0) {
                        setIsLoading(false);
                        return;
                    }

                    // 2. Encontrar todos os leilões que esses usuários venceram
                    const wonAuctions = await Auction.filter({ 
                        status: { $in: ["ended", "sold"] },
                        winner_id: { $in: indicatedUserIds }
                    }, "-updated_date", 100);

                    if (!Array.isArray(wonAuctions)) {
                        console.warn("Arremates não retornaram um array:", wonAuctions);
                        setIsLoading(false);
                        return;
                    }

                    console.log(`🎯 ${wonAuctions.length} arremates encontrados.`);

                    // 3. Mapear os leilões para criar os registros de comissão
                    const records = wonAuctions.map(auction => {
                        const winner = indicatedUsers.find(u => u.id === auction.winner_id);
                        return { auction, winner };
                    });

                    setCommissionRecords(records);
                    console.log(`✅ ${records.length} registros de comissão carregados.`);

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
                    <span className="text-2xl font-bold text-green-400">V$ {(licensee?.commission_balance || 0).toFixed(2)}</span>
                </div>

                <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                        </div>
                    ) : commissionRecords.length > 0 ? (
                        commissionRecords.map(({ auction, winner }) => (
                           <CommissionEntry key={auction.id} auction={auction} winner={winner} />
                        ))
                    ) : (
                        <div className="text-center py-16 bg-gray-800 rounded-lg">
                            <TrendingUp className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                            <p className="text-gray-400 font-semibold">Nenhuma comissão registrada ainda.</p>
                            <p className="text-sm text-gray-500">Quando seus indicados arrematarem produtos, as comissões aparecerão aqui.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}