import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Package } from 'lucide-react';

export default function PaymentPendingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
            <Card className="max-w-md w-full bg-gray-800/80 backdrop-blur border-yellow-500/30">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center">
                        <Clock className="w-12 h-12 text-yellow-400" />
                    </div>
                    <CardTitle className="text-2xl text-white">
                        Pagamento Pendente
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                    <p className="text-gray-300">
                        Seu pagamento está sendo processado. 
                        Você será notificado assim que for confirmado.
                    </p>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <p className="text-sm text-yellow-300">
                            ⏱️ Isso pode levar alguns minutos
                        </p>
                    </div>

                    <div className="space-y-3 pt-4">
                        <Button
                            onClick={() => navigate('/MyWinnings')}
                            className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
                        >
                            <Package className="w-4 h-4 mr-2" />
                            Ver Meus Arremates
                        </Button>

                        <Button
                            onClick={() => navigate('/')}
                            variant="outline"
                            className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                            Voltar para Home
                        </Button>
                    </div>

                    <p className="text-xs text-gray-500 pt-4">
                        Acompanhe o status na página "Meus Arremates"
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}