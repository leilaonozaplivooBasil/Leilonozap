import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, RefreshCw } from 'lucide-react';

export default function PaymentErrorPage() {
    const navigate = useNavigate();
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
            <Card className="max-w-md w-full bg-gray-800/80 backdrop-blur border-red-500/30">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                        <XCircle className="w-12 h-12 text-red-400" />
                    </div>
                    <CardTitle className="text-2xl text-white">
                        Pagamento Não Aprovado
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                    <p className="text-gray-300">
                        Não foi possível processar seu pagamento. 
                        Por favor, tente novamente.
                    </p>

                    <div className="space-y-3 pt-4">
                        {orderId && (
                            <Button
                                onClick={() => navigate(`/checkout/${orderId}`)}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Tentar Novamente
                            </Button>
                        )}

                        <Button
                            onClick={() => navigate('/MyWinnings')}
                            variant="outline"
                            className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                            Ver Meus Arremates
                        </Button>
                    </div>

                    <p className="text-xs text-gray-500 pt-4">
                        Se o problema persistir, entre em contato com o suporte
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}