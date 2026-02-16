import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  X, Plus, Trash2, Search, Package, DollarSign, Save, TrendingDown
} from 'lucide-react';

export default function NegotiationModal({ customer, onClose, onSave, sellers }) {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showProductList, setShowProductList] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('em_andamento');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const allProducts = await base44.entities.Product.list('-created_date', 500);
      const inStock = allProducts.filter(p => (p.quantity || 0) > 0);
      setProducts(inStock);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const filteredProducts = products.filter(p =>
    p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.lot?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addProduct = (product) => {
    const existing = selectedProducts.find(p => p.product_id === product.id);
    if (existing) {
      alert('Produto já adicionado! Altere a quantidade.');
      return;
    }

    const tablePrice = product.selling_price_retail || product.cost_price || 0;
    setSelectedProducts([...selectedProducts, {
      product_id: product.id,
      product_name: product.description,
      quantity: 1,
      table_price: tablePrice,
      negotiated_price: tablePrice,
      discount_percent: 0,
      subtotal: tablePrice
    }]);
    setSearchTerm('');
    setShowProductList(false);
  };

  const updateProductField = (productId, field, value) => {
    setSelectedProducts(selectedProducts.map(p => {
      if (p.product_id === productId) {
        const updated = { ...p, [field]: value };
        
        // Recalcula desconto e subtotal
        if (field === 'negotiated_price' || field === 'quantity') {
          const negotiatedPrice = field === 'negotiated_price' ? value : p.negotiated_price;
          const quantity = field === 'quantity' ? value : p.quantity;
          
          updated.discount_percent = p.table_price > 0 
            ? ((p.table_price - negotiatedPrice) / p.table_price * 100).toFixed(1)
            : 0;
          updated.subtotal = negotiatedPrice * quantity;
        }
        
        return updated;
      }
      return p;
    }));
  };

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
  };

  const totalValue = selectedProducts.reduce((sum, p) => sum + (p.subtotal || 0), 0);

  const handleSave = async () => {
    if (selectedProducts.length === 0) {
      alert('❌ Adicione pelo menos um produto!');
      return;
    }

    if (!selectedSeller) {
      alert('❌ Selecione um vendedor responsável!');
      return;
    }

    try {
      const sellerData = sellers.find(s => s.id === selectedSeller);
      
      const negotiationData = {
        customer_id: customer.id,
        customer_name: customer.full_name,
        seller_id: selectedSeller,
        seller_name: sellerData?.name || 'Vendedor',
        items: selectedProducts,
        total_value: totalValue,
        status,
        notes,
        closed_date: status !== 'em_andamento' ? new Date().toISOString() : null,
        closed_by: status !== 'em_andamento' ? sellerData?.name : null
      };

      await base44.entities.Negotiation.create(negotiationData);

      // Atualiza customer
      await base44.entities.Customer.update(customer.id, {
        purchase_status: status === 'fechada' ? 'aguardando_pagamento' : 'em_negociacao',
        total_spent: status === 'fechada' 
          ? (customer.total_spent || 0) + totalValue 
          : customer.total_spent
      });

      alert('✅ Negociação salva com sucesso!');
      onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar negociação:', error);
      alert('❌ Erro ao salvar negociação');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="bg-white border-gray-200 max-w-5xl w-full my-8">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              💼 Nova Negociação - {customer.full_name}
            </CardTitle>
            <Button variant="ghost" onClick={onClose} className="text-gray-600">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          
          {/* VENDEDOR */}
          <div>
            <Label className="text-gray-700 mb-2 block">Vendedor Responsável *</Label>
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="w-full bg-white text-gray-900 rounded-md px-4 py-2 border border-gray-300"
            >
              <option value="">-- Selecione --</option>
              {sellers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* BUSCA DE PRODUTOS */}
          <div>
            <Label className="text-gray-700 mb-2 block">Adicionar Produtos</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar produto por nome ou lote..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowProductList(e.target.value.length > 0);
                }}
                onFocus={() => setShowProductList(searchTerm.length > 0)}
                className="pl-10 bg-white text-gray-900"
              />
            </div>

            {showProductList && (
              <div className="absolute z-20 bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-80 overflow-y-auto w-full max-w-2xl">
                {filteredProducts.slice(0, 20).map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-100"
                  >
                    <div className="flex items-start gap-3">
                      <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{product.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                          <span>Lote: {product.lot || 'N/A'}</span>
                          <span>•</span>
                          <span className="text-green-600 font-bold">Estoque: {product.quantity}</span>
                          <span>•</span>
                          <span className="text-blue-600 font-bold">
                            R$ {(product.selling_price_retail || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-400">
                    <p className="text-sm">Nenhum produto encontrado</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PRODUTOS SELECIONADOS */}
          {selectedProducts.length > 0 && (
            <div>
              <Label className="text-gray-700 mb-3 block">Produtos Adicionados ({selectedProducts.length})</Label>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-gray-700">
                      <th className="text-left p-3">Produto</th>
                      <th className="text-center p-3">Qtd</th>
                      <th className="text-right p-3">Tabela</th>
                      <th className="text-right p-3">Negociado</th>
                      <th className="text-center p-3">Desc.</th>
                      <th className="text-right p-3">Subtotal</th>
                      <th className="text-center p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map(item => (
                      <tr key={item.product_id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="p-3 text-gray-900 font-medium">{item.product_name}</td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateProductField(item.product_id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-16 text-center bg-white text-gray-900 border-gray-300"
                          />
                        </td>
                        <td className="p-3 text-right text-gray-600">
                          R$ {item.table_price.toFixed(2)}
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.negotiated_price}
                            onChange={(e) => updateProductField(item.product_id, 'negotiated_price', parseFloat(e.target.value) || 0)}
                            className="w-28 text-right bg-white text-gray-900 border-gray-300"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={
                            item.discount_percent > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }>
                            <TrendingDown className="w-3 h-3 mr-1" />
                            {item.discount_percent}%
                          </Badge>
                        </td>
                        <td className="p-3 text-right text-green-600 font-bold">
                          R$ {item.subtotal.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeProduct(item.product_id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TOTAL */}
              <div className="mt-4 bg-green-50 border-2 border-green-600 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-bold text-lg">VALOR TOTAL DA NEGOCIAÇÃO:</span>
                  <span className="text-green-600 font-bold text-3xl">
                    R$ {totalValue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STATUS E OBSERVAÇÕES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700 mb-2 block">Status da Negociação</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-white text-gray-900 rounded-md px-4 py-2 border border-gray-300"
              >
                <option value="em_andamento">Em Andamento</option>
                <option value="fechada">Fechada (Cliente Confirmou)</option>
                <option value="perdida">Perdida (Desistiu)</option>
              </select>
            </div>

            <div>
              <Label className="text-gray-700 mb-2 block">Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white text-gray-900"
                rows={3}
                placeholder="Ex: Cliente pediu desconto adicional, prazo de entrega urgente..."
              />
            </div>
          </div>

          {/* BOTÕES */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={handleSave}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={selectedProducts.length === 0 || !selectedSeller}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Negociação
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-300 text-gray-700"
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}