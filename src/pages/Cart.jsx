import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Carregar usuário
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    // Carregar carrinho do localStorage
    const savedCart = localStorage.getItem('catalogCart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  const updateCart = (newCart) => {
    setCartItems(newCart);
    localStorage.setItem('catalogCart', JSON.stringify(newCart));
  };

  const removeItem = (productId) => {
    const newCart = cartItems.filter(item => item.id !== productId);
    updateCart(newCart);
    window.dispatchEvent(new Event('cartUpdated'));
    toast.success('Produto removido do carrinho');
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    const newCart = cartItems.map(item => {
      if (item.id === productId) {
        // Verificar estoque disponível
        const maxQty = item.availableStock || 999;
        if (newQuantity > maxQty) {
          toast.error(`Apenas ${maxQty} unidades disponíveis`);
          return { ...item, quantity: maxQty };
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    updateCart(newCart);
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const clearCart = () => {
    updateCart([]);
    window.dispatchEvent(new Event('cartUpdated'));
    toast.success('Carrinho limpo');
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.price_catalog || item.selling_price_wholesale || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Seu carrinho está vazio');
      return;
    }

    if (!currentUser) {
      toast.error('Faça login para continuar');
      navigate(createPageUrl('Register'));
      return;
    }

    setIsProcessing(true);
    
    try {
      // Criar preferência no Mercado Pago
      const response = await base44.functions.invoke('createMPCartPreference', {
        cart_items: cartItems,
        user_data: currentUser
      });

      if (response.data?.error) {
        toast.error(response.data.error);
        setIsProcessing(false);
        return;
      }

      if (response.data?.init_point) {
        // Redirecionar para o checkout do Mercado Pago
        window.location.href = response.data.init_point;
      } else {
        toast.error('Erro ao gerar link de pagamento');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Erro no checkout:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(createPageUrl('Catalog'))}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-green-400" />
              <h1 className="text-lg font-bold">Meu Carrinho</h1>
              {cartItems.length > 0 && (
                <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {cartItems.length}
                </span>
              )}
            </div>
            {cartItems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Limpar
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {cartItems.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-12 text-center">
              <ShoppingBag className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Seu carrinho está vazio</h2>
              <p className="text-gray-400 mb-6">Adicione produtos do catálogo para continuar</p>
              <Button
                onClick={() => navigate(createPageUrl('Catalog'))}
                className="bg-green-600 hover:bg-green-700"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Ver Catálogo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Lista de produtos */}
            {cartItems.map((item) => {
              const price = item.price_catalog || item.selling_price_wholesale || 0;
              const imageUrl = item.image_urls?.[0] || 'https://via.placeholder.com/100';
              
              return (
                <Card key={item.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Imagem */}
                      <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-700">
                        <img
                          src={imageUrl}
                          alt={item.description}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium text-sm line-clamp-2 mb-1">
                          {item.description}
                        </h3>
                        <p className="text-green-400 font-bold">
                          R$ {price.toFixed(2)}
                        </p>
                      </div>

                      {/* Quantidade e remover */}
                      <div className="flex flex-col items-end justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>

                        <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-white font-medium w-6 text-center text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Subtotal do item */}
                    <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Subtotal:</span>
                      <span className="text-white font-semibold">
                        R$ {(price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Resumo */}
            <Card className="bg-gradient-to-br from-green-900/30 to-gray-800 border-green-500/30">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Itens ({cartItems.length})</span>
                    <span className="text-white">R$ {calculateTotal().toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t border-gray-700 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-white">Total</span>
                      <span className="text-2xl font-bold text-green-400">
                        R$ {calculateTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botão de checkout */}
            <Button
              onClick={handleCheckout}
              className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg font-semibold"
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              Finalizar Compra
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}