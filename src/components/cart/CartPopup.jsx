import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { X, Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export default function CartPopup({ isOpen, onClose }) {
  const [cartItems, setCartItems] = useState([]);

  const loadCart = useCallback(() => {
    const savedCart = localStorage.getItem('catalogCart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Erro ao carregar carrinho:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCart();
    }
  }, [isOpen, loadCart]);

  const updateCart = useCallback((newCart) => {
    setCartItems(newCart);
    localStorage.setItem('catalogCart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('cartUpdated'));
  }, []);

  const removeItem = useCallback((productId) => {
    const newCart = cartItems.filter(item => item.id !== productId);
    updateCart(newCart);
    if (newCart.length === 0) {
      onClose();
    }
  }, [cartItems, updateCart, onClose]);

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    const newCart = cartItems.map(item => {
      if (item.id === productId) {
        const maxQty = item.availableStock || 999;
        if (newQuantity > maxQty) {
          toast.error(`Apenas ${maxQty} unidades disponíveis`);
          return { ...item, quantity: maxQty };
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setCartItems(newCart);
    localStorage.setItem('catalogCart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.price_catalog || item.selling_price_wholesale || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-[200]"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div className="fixed top-16 right-4 w-[90vw] max-w-md bg-white rounded-xl shadow-2xl z-[201] overflow-hidden animate-in slide-in-from-top-2 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">
            Seu Pedido <span className="text-gray-500 font-normal">({totalItems} {totalItems === 1 ? 'item' : 'itens'})</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="max-h-[50vh] overflow-y-auto">
          {cartItems.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <ShoppingBag className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Seu carrinho está vazio</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {cartItems.map((item) => {
                const price = item.price_catalog || item.selling_price_wholesale || 0;
                const imageUrl = item.image_urls?.[0] || 'https://via.placeholder.com/80';
                
                return (
                  <div key={item.id} className="p-4">
                    <div className="flex gap-3">
                      {/* Imagem */}
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={imageUrl}
                          alt={item.description}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                          {item.description}
                        </h4>
                        
                        {/* Controles */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            
                            <div className="flex items-center border border-gray-300 rounded-lg bg-gray-50">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-50"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-3 text-sm font-semibold text-gray-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <span className="text-sm font-semibold text-gray-900">
                            R$ {(price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Valor total</span>
              <span className="text-lg font-bold text-gray-900">
                R$ {calculateTotal().toFixed(2)}
              </span>
            </div>
            
            <Link
              to={createPageUrl("Cart")}
              onClick={onClose}
              className="block w-full"
            >
              <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-full">
                Ver carrinho
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}