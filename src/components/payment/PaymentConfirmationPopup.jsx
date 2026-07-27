import React, { useEffect, useState } from 'react';
import { fmtBR } from '@/lib/money';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PaymentConfirmationPopup() {
  const [show, setShow] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handlePaymentConfirmed = (event) => {
      console.log('🎉 [PaymentPopup] Pagamento confirmado!', event.detail);
      
      setOrderData(event.detail);
      setShow(true);

      // Efeito de confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#10b981', '#059669']
      });
    };

    window.addEventListener('paymentConfirmed', handlePaymentConfirmed);
    return () => window.removeEventListener('paymentConfirmed', handlePaymentConfirmed);
  }, []);

  const handleClose = () => {
    setShow(false);
    setOrderData(null);
  };

  const handleViewOrder = () => {
    if (orderData?.sale_id) {
      navigate(createPageUrl('CatalogOrderTracking') + `?sale_id=${orderData.sale_id}`);
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            onClick={handleClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-[90%] max-w-md"
          >
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative p-6 pb-4">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Pagamento Confirmado! 🎉
                  </h2>
                  
                  <p className="text-green-50 text-sm">
                    Seu pedido foi aprovado com sucesso
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="bg-white p-6 space-y-4">
                {orderData?.product_title && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Produto</p>
                    <p className="font-semibold text-gray-900 line-clamp-2">
                      {orderData.product_title}
                    </p>
                  </div>
                )}

                {orderData?.amount && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Valor Pago</p>
                    <p className="font-bold text-2xl text-green-600">
                      R$ {fmtBR(orderData.amount)}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleViewOrder}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Acompanhar Pedido
                  </Button>
                </div>

                <p className="text-xs text-center text-gray-500">
                  Você receberá atualizações sobre a entrega
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}