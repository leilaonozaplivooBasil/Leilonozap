import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const Auction = base44.entities.Auction;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, ShoppingBag } from 'lucide-react';

const AuctionItem = ({ auction, onSelect }) => {
    return (
        <div className="flex items-center gap-4 p-3 bg-gray-800 hover:bg-gray-700/80 rounded-lg transition-colors cursor-pointer" onClick={() => onSelect(auction.id)}>
            <img 
                src={auction.image_urls?.[0] || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/bb512aa01_image.png'} 
                alt={auction.title}
                className="w-20 h-20 object-cover rounded-md bg-gray-700"
            />
            <div className="flex-grow">
                <p className="font-semibold text-white line-clamp-2">{auction.title}</p>
                <p className="text-sm text-gray-400">Lance atual: <span className="font-bold text-green-500">R$ {(auction.current_price || auction.starting_price).toFixed(2)}</span></p>
            </div>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 ml-auto">
                <Zap className="w-4 h-4 mr-2"/>
                Entrar
            </Button>
        </div>
    );
};

export default function AuctionSelectionModal({ isOpen, onClose, onSelectAuction }) {
    const [activeAuctions, setActiveAuctions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchActiveAuctions = async () => {
                setIsLoading(true);
                try {
                    const now = new Date().toISOString();
                    const auctions = await Auction.filter({ 
                        status: 'active',
                        end_time: { $gt: now } 
                    }, "-created_date", 20);
                    setActiveAuctions(auctions);
                } catch (error) {
                    console.error("Failed to fetch active auctions:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchActiveAuctions();
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-gray-900 border-gray-700 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-green-400 text-xl">
                        <ShoppingBag className="w-6 h-6"/>
                        Onde quer usar seu saldo?
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Escolha um leilão ativo para entrar com seu poder de compra Valora Pay.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 space-y-3">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                            <p className="ml-3 text-gray-400">Buscando leilões...</p>
                        </div>
                    ) : activeAuctions.length > 0 ? (
                        activeAuctions.map(auction => (
                           <AuctionItem key={auction.id} auction={auction} onSelect={onSelectAuction} />
                        ))
                    ) : (
                        <div className="text-center py-16 bg-gray-800 rounded-lg">
                            <Zap className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                            <p className="text-gray-400 font-semibold">Nenhum leilão ativo no momento.</p>
                            <p className="text-sm text-gray-500">Volte mais tarde para novas oportunidades!</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}