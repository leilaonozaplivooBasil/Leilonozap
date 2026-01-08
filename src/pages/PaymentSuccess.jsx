import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaymentSuccessPage() {
    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                    
                    <h1 className="text-3xl font-bold mb-4">Pagamento Confirmado!</h1>
                    
                    <p className="text-gray-300 mb-8">
                        Seu pagamento foi processado com sucesso. Você pode acompanhar o status do seu pedido em "Meus Arremates".
                    </p>

                    <div className="flex flex-col gap-3">
                        <Link to={createPageUrl('MyWinnings')}>
                            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                                Ver Meus Arremates
                            </Button>
                        </Link>
                        
                        <Link to={createPageUrl('Home')}>
                            <Button variant="outline" className="w-full border-gray-600 text-white hover:bg-gray-700">
                                Voltar para Leilões
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}