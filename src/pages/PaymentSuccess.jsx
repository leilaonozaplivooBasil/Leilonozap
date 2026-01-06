import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package } from 'lucide-react';

export default function PaymentSuccessPage() {
    const navigate = useNavigate();

    useEffect(() => {
        // Efeito de confete ou celebração pode ser adicionado aqui
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                <div className="bg-green-500/20 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-16 h-16 text-green-400" />
                </div>

                <h1 className="text-3xl font-bold mb-4">Pagamento Confirmado!</h1>
                
                <p className="text-gray-300 mb-8">
                    Seu pagamento foi processado com sucesso. Você receberá um email com os detalhes do pedido.
                </p>

                <div className="space-y-3">
                    <Button
                        onClick={() => navigate(createPageUrl('MyWinnings'))}
                        className="w-full bg-green-600 hover:bg-green-700"
                    >
                        <Package className="w-5 h-5 mr-2" />
                        Ver Meus Arremates
                    </Button>

                    <Button
                        onClick={() => navigate(createPageUrl('Home'))}
                        variant="outline"
                        className="w-full border-gray-700 text-white hover:bg-gray-800"
                    >
                        Voltar aos Leilões
                    </Button>
                </div>
            </div>
        </div>
    );
}