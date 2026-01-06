import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Package } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PaymentSuccessPage() {
    const navigate = useNavigate();
    const [orderId, setOrderId] = useState(null);

    useEffect(() => {
        // Captura order_id da URL
        const params = new URLSearchParams(window.location.search);
        const order = params.get('order_id');
        setOrderId(order);

        // Confetti de comemoração
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#22c55e', '#16a34a', '#dcfce7']
            });
            
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#22c55e', '#16a34a', '#dcfce7']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };

        frame();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
            <Card className="max-w-md w-full bg-gray-800/80 backdrop-blur border-green-500/30">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-12 h-12 text-green-400" />
                    </div>
                    <CardTitle className="text-2xl text-white">
                        Pagamento Aprovado!
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                    <p className="text-gray-300">
                        Seu pagamento foi processado com sucesso! 🎉
                    </p>

                    {orderId && (
                        <div className="bg-gray-900/50 rounded-lg p-4">
                            <p className="text-sm text-gray-400 mb-1">Número do Pedido:</p>
                            <p className="text-white font-mono font-semibold">#{orderId.slice(0, 8)}</p>
                        </div>
                    )}

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
                        Você receberá um email de confirmação em breve
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}