import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CartItem = base44.entities.CartItem;

export default function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [updatingItem, setUpdatingItem] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const savedUser = localStorage.getItem('currentUser');
        const isLoggedIn = sessionStorage.getItem('isLoggedIn');

        if (savedUser && isLoggedIn) {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);

          // Carregar itens do carrinho
          const items = await CartItem.filter({ user_id: user.id });
          setCartItems(items || []);
        } else {
          setCurrentUser(null);
          setCartItems([]);
        }
      } catch (error) {
        console.error("Erro ao carregar carrinho:", error);
        toast.error("Erro ao carregar carrinho");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const updateQuantity = async (item, newQuantity) => {
    if (newQuantity < 1) return;
    
    setUpdatingItem(item.id);
    try {
      await CartItem.update(item.id, { quantity: newQuantity });
      setCartItems(prev => 
        prev.map(i => i.id === item.id ? { ...i, quantity: newQuantity } : i)
      );
    } catch (error) {
      toast.error("Erro ao atualizar quantidade");
    } finally {
      setUpdatingItem(null);
    }
  };

  const removeItem = async (itemId) => {
    setUpdatingItem(itemId);
    try {
      await CartItem.delete(itemId);
      setCartItems(prev => prev.filter(i => i.id !== itemId));
      toast.success("Produto removido do carrinho");
    } catch (error) {
      toast.error("Erro ao remover produto");
    } finally {
      setUpdatingItem(null);
    }
  };

  const clearCart = async () => {
    if (!window.confirm("Tem certeza que deseja limpar o carrinho?")) return;
    
    setIsLoading(true);
    try {
      for (const item of cartItems) {
        await CartItem.delete(item.id);
      }
      setCartItems([]);
      toast.success("Carrinho limpo!");
    } catch (error) {
      toast.error("Erro ao limpar carrinho");
    } finally {
      setIsLoading(false);
    }
  };

  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.product_price * (item.quantity || 1)), 0);

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Seu carrinho está vazio!");
      return;
    }
    // Navegar para checkout com os itens do carrinho
    navigate(createPageUrl("CatalogCheckout") + "?from=cart");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-green-500" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
        <ShoppingCart className="w-20 h-20 text-gray-600 mb-6" />
        <h1 className="text-2xl font-bold mb-4">Faça login para ver seu carrinho</h1>
        <p className="text-gray-400 mb-6 text-center">
          Você precisa estar logado para adicionar produtos ao carrinho.
        </p>
        <Button
          onClick={() => navigate(createPageUrl("Catalog"))}
          className="bg-green-600 hover:bg-green-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Catálogo
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("Catalog"))}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <ShoppingCart className="w-7 h-7 text-green-400" />
                Meu Carrinho
              </h1>
              <p className="text-gray-400 text-sm">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</p>
            </div>
          </div>

          {cartItems.length > 0 && (
            <Button
              variant="ghost"
              onClick={clearCart}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-24 h-24 text-gray-700 mx-auto mb-6" />
            <h2 className="text-xl font-semibold mb-3">Seu carrinho está vazio</h2>
            <p className="text-gray-400 mb-8">Adicione produtos do catálogo para começar!</p>
            <Button
              onClick={() => navigate(createPageUrl("Catalog"))}
              className="bg-green-600 hover:bg-green-700"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Explorar Catálogo
            </Button>
          </div>
        ) : (
          <>
            {/* Lista de Itens */}
            <div className="space-y-4 mb-8">
              {cartItems.map((item) => (
                <Card key={item.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Imagem */}
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <ShoppingBag className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold truncate mb-1">
                          {item.product_title || "Produto"}
                        </h3>
                        <p className="text-green-400 font-bold text-lg">
                          R$ {item.product_price?.toFixed(2)}
                        </p>

                        {/* Controles de Quantidade */}
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-1">
                            <button
                              onClick={() => updateQuantity(item, (item.quantity || 1) - 1)}
                              disabled={updatingItem === item.id || item.quantity <= 1}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-semibold">
                              {updatingItem === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                              ) : (
                                item.quantity || 1
                              )}
                            </span>
                            <button
                              onClick={() => updateQuantity(item, (item.quantity || 1) + 1)}
                              disabled={updatingItem === item.id}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={updatingItem === item.id}
                            className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right">
                        <p className="text-gray-400 text-xs mb-1">Subtotal</p>
                        <p className="text-white font-bold">
                          R$ {(item.product_price * (item.quantity || 1)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Resumo */}
            <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/30">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-300">Subtotal ({totalItems} itens)</span>
                  <span className="text-white font-semibold">R$ {totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-6 text-lg">
                  <span className="text-white font-bold">Total</span>
                  <span className="text-green-400 font-bold text-2xl">R$ {totalPrice.toFixed(2)}</span>
                </div>

                <Button
                  onClick={handleCheckout}
                  className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-bold"
                >
                  Finalizar Compra
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => navigate(createPageUrl("Catalog"))}
                  className="w-full mt-3 text-gray-400 hover:text-white"
                >
                  Continuar Comprando
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}