import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Calendar, Printer, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function OpenCashModal({ isOpen, onClose, openingBalance, setOpeningBalance, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-white border-gray-200 max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-gray-900">💰 Abrir Caixa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-gray-700 text-sm mb-2 block font-medium">
              Saldo Inicial em Dinheiro (Troco)
            </label>
            <Input
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="bg-white text-gray-900 border-gray-300"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Valor em dinheiro disponível no caixa para troco
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={onConfirm} className="flex-1 bg-green-600 hover:bg-green-700">
              Abrir Caixa
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1 border-gray-300">
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CloseCashModal({ isOpen, onClose, currentCashRegister, todaySales, closingBalance, setClosingBalance, closingNotes, setClosingNotes, onConfirm }) {
  if (!isOpen || !currentCashRegister) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-white border-gray-200 max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-gray-900">🔒 Fechar Caixa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-bold text-gray-900 mb-3">Resumo do Caixa</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Abertura:</span>
              <span className="font-medium text-gray-900">
                {new Date(currentCashRegister.opening_time).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Operador:</span>
              <span className="font-medium text-gray-900">{currentCashRegister.operator_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Saldo Inicial:</span>
              <span className="font-medium text-gray-900">
                R$ {currentCashRegister.opening_balance.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">💳 PIX:</span>
                <span className="font-medium text-green-600">
                  R$ {todaySales.filter(s => s.payment_method === 'PIX').reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">💵 Dinheiro:</span>
                <span className="font-medium text-green-600">
                  R$ {todaySales.filter(s => s.payment_method === 'DINHEIRO').reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">💳 Cartões:</span>
                <span className="font-medium text-green-600">
                  R$ {todaySales.filter(s => s.payment_method === 'CARTÃO DÉBITO' || s.payment_method === 'CARTÃO CRÉDITO').reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">📄 Boleto:</span>
                <span className="font-medium text-green-600">
                  R$ {todaySales.filter(s => s.payment_method === 'BOLETO PARCELADO').reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between font-bold text-base">
                <span className="text-gray-900">Total Vendas no Caixa:</span>
                <span className="text-green-600">
                  R$ {todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {todaySales.length} vendas desde abertura ({new Date(currentCashRegister.opening_time).toLocaleString('pt-BR')})
              </p>
            </div>
          </div>

          <div>
            <label className="text-gray-700 text-sm mb-2 block font-medium">
              Saldo Final em Dinheiro (Contagem Real)
            </label>
            <Input
              type="number"
              step="0.01"
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
              className="bg-white text-gray-900 border-gray-300"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Conte o dinheiro no caixa e informe o valor total
            </p>
          </div>

          <div>
            <label className="text-gray-700 text-sm mb-2 block font-medium">Observações</label>
            <Textarea
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              className="bg-white text-gray-900 border-gray-300"
              placeholder="Alguma observação sobre o fechamento..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700">
              Fechar Caixa
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1 border-gray-300">
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SessionDetailsModal({ isOpen, onClose, selectedSession, sessionSales, onPrint }) {
  if (!isOpen || !selectedSession) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="bg-white border-gray-200 max-w-4xl w-full my-8">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Detalhes da Sessão de Caixa
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={onPrint} className="bg-blue-600 hover:bg-blue-700">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={onClose} variant="ghost" className="text-gray-600">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">📅 Data:</span>
              <span className="font-medium text-gray-900">
                {new Date(selectedSession.opening_time).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">🕐 Abertura:</span>
              <span className="font-medium text-gray-900">
                {new Date(selectedSession.opening_time).toLocaleTimeString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">🕐 Fechamento:</span>
              <span className="font-medium text-gray-900">
                {selectedSession.closing_time ? new Date(selectedSession.closing_time).toLocaleTimeString('pt-BR') : '-'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">👤 Operador:</span>
              <span className="font-medium text-gray-900">{selectedSession.operator_name}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <p className="text-xs text-green-700 mb-1">💳 PIX</p>
              <p className="text-lg font-bold text-green-900">R$ {(selectedSession.total_pix || 0).toFixed(2)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-700 mb-1">💵 Dinheiro</p>
              <p className="text-lg font-bold text-blue-900">R$ {(selectedSession.total_cash || 0).toFixed(2)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <p className="text-xs text-purple-700 mb-1">💳 Débito</p>
              <p className="text-lg font-bold text-purple-900">R$ {(selectedSession.total_debit || 0).toFixed(2)}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <p className="text-xs text-orange-700 mb-1">💳 Crédito</p>
              <p className="text-lg font-bold text-orange-900">R$ {(selectedSession.total_credit || 0).toFixed(2)}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <p className="text-xs text-yellow-700 mb-1">📄 Boleto</p>
              <p className="text-lg font-bold text-yellow-900">R$ {(selectedSession.total_boleto || 0).toFixed(2)}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">💰 TOTAL</p>
              <p className="text-lg font-bold text-green-400">R$ {(selectedSession.total_sales || 0).toFixed(2)}</p>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-3">Vendas ({sessionSales.length})</h3>
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-xs text-gray-700">
                    <th className="text-left p-2">Horário</th>
                    <th className="text-left p-2">Produto</th>
                    <th className="text-center p-2">Qtd</th>
                    <th className="text-right p-2">Valor Unit.</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-center p-2">Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionSales.map((sale) => (
                    <tr key={sale.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-2 text-gray-600">
                        {new Date(sale.sale_datetime).toLocaleTimeString('pt-BR')}
                      </td>
                      <td className="p-2 text-gray-900">{sale.product_description}</td>
                      <td className="text-center p-2 text-blue-600 font-semibold">{sale.quantity_sold}</td>
                      <td className="text-right p-2 text-gray-900">R$ {sale.unit_price.toFixed(2)}</td>
                      <td className="text-right p-2 text-green-600 font-bold">R$ {sale.total_amount.toFixed(2)}</td>
                      <td className="text-center p-2">
                        <Badge className={
                          sale.payment_method === 'PIX' ? 'bg-green-600' :
                          sale.payment_method === 'DINHEIRO' ? 'bg-blue-600' :
                          sale.payment_method === 'CARTÃO DÉBITO' ? 'bg-purple-600' :
                          sale.payment_method === 'CARTÃO CRÉDITO' ? 'bg-orange-600' : 'bg-yellow-600'
                        }>
                          {sale.payment_method}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedSession.notes && (
            <div className="mt-4 bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <p className="text-xs text-yellow-700 mb-1">📝 Observações:</p>
              <p className="text-sm text-yellow-900">{selectedSession.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function EditSaleModal({ isOpen, onClose, editingSale, editSaleData, setEditSaleData, onSave }) {
  if (!isOpen || !editingSale) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-white border-gray-200 max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900">✏️ Editar Venda</CardTitle>
            <Button variant="ghost" onClick={onClose} className="text-gray-600">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-600">
              <strong>Produto:</strong> {editingSale.product_description}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(editingSale.sale_datetime).toLocaleString('pt-BR')}
            </p>
          </div>

          <div>
            <label className="text-gray-700 text-sm mb-2 block font-medium">Quantidade</label>
            <Input
              type="number"
              min="1"
              value={editSaleData.quantity_sold}
              onChange={(e) => setEditSaleData({ ...editSaleData, quantity_sold: e.target.value })}
              className="bg-white text-gray-900 border-gray-300"
            />
          </div>

          <div>
            <label className="text-gray-700 text-sm mb-2 block font-medium">Preço Unitário</label>
            <Input
              type="number"
              step="0.01"
              value={editSaleData.unit_price}
              onChange={(e) => setEditSaleData({ ...editSaleData, unit_price: e.target.value })}
              className="bg-white text-gray-900 border-gray-300"
            />
          </div>

          <div>
            <label className="text-gray-700 text-sm mb-2 block font-medium">Forma de Pagamento</label>
            <select
              value={editSaleData.payment_method}
              onChange={(e) => setEditSaleData({ ...editSaleData, payment_method: e.target.value })}
              className="w-full bg-white border border-gray-300 text-gray-900 rounded-md p-2.5"
            >
              <option>PIX</option>
              <option>DINHEIRO</option>
              <option>CARTÃO DÉBITO</option>
              <option>CARTÃO CRÉDITO</option>
              <option>BOLETO PARCELADO</option>
            </select>
          </div>

          <div>
            <label className="text-gray-700 text-sm mb-2 block font-medium">🏦 Banco Destino</label>
            <select
              value={editSaleData.receiving_bank || 'santander'}
              onChange={(e) => setEditSaleData({ ...editSaleData, receiving_bank: e.target.value })}
              className="w-full bg-white border border-gray-300 text-gray-900 rounded-md p-2.5"
            >
              <option value="santander">🔴 Santander (Produtos Físicos)</option>
              <option value="itau">🟠 Itaú (Licenciados)</option>
              <option value="nubank">🟣 Nubank (Parceiros)</option>
            </select>
          </div>

          {editSaleData.payment_method === 'BOLETO PARCELADO' && (
            <div className="space-y-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div>
                <label className="text-gray-700 text-xs mb-1 block">Nome do Cliente</label>
                <Input
                  value={editSaleData.boleto_cliente}
                  onChange={(e) => setEditSaleData({ ...editSaleData, boleto_cliente: e.target.value })}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-gray-700 text-xs mb-1 block">Documento</label>
                <Input
                  value={editSaleData.boleto_documento}
                  onChange={(e) => setEditSaleData({ ...editSaleData, boleto_documento: e.target.value })}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-gray-700 text-xs mb-1 block">Parcelas</label>
                <Input
                  type="number"
                  min="1"
                  value={editSaleData.boleto_parcelas}
                  onChange={(e) => setEditSaleData({ ...editSaleData, boleto_parcelas: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>
          )}

          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Novo Total:</span>
              <span className="text-green-600 font-bold text-xl">
                R$ {(editSaleData.quantity_sold * editSaleData.unit_price).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={onSave} className="flex-1 bg-green-600 hover:bg-green-700">
              Salvar Alterações
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1 border-gray-300">
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function EditCommissionModal({ isOpen, onClose, editingCommissionSale, editCommissionData, setEditCommissionData, onSave }) {
  if (!isOpen || !editingCommissionSale) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-white border-gray-200 max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-600" />
              Editar Comissão do Vendedor
            </CardTitle>
            <Button variant="ghost" onClick={onClose} className="text-gray-600">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Vendedor:</strong> {editingCommissionSale.seller_name || 'Sem vendedor'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Produto:</strong> {editingCommissionSale.product_description}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {new Date(editingCommissionSale.sale_datetime).toLocaleString('pt-BR')}
            </p>
          </div>

          <div>
            <label className="text-gray-700 text-sm mb-2 block font-medium">Tipo de Comissão</label>
            <select
              value={editCommissionData.commission_type}
              onChange={(e) => setEditCommissionData({ ...editCommissionData, commission_type: e.target.value })}
              className="w-full bg-white border border-gray-300 text-gray-900 rounded-md p-2.5"
            >
              <option value="percentage">Porcentagem (%)</option>
              <option value="fixed">Valor Fixo (R$)</option>
            </select>
          </div>

          <div>
            <label className="text-gray-700 text-sm mb-2 block font-medium">
              {editCommissionData.commission_type === 'percentage' ? 'Porcentagem (%)' : 'Valor (R$)'}
            </label>
            <Input
              type="number"
              step="0.01"
              value={editCommissionData.commission_value}
              onChange={(e) => setEditCommissionData({ ...editCommissionData, commission_value: parseFloat(e.target.value) || 0 })}
              className="bg-white text-gray-900 border-gray-300"
              placeholder={editCommissionData.commission_type === 'percentage' ? '10' : '50.00'}
            />
          </div>

          {editCommissionData.commission_value > 0 && (
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <p className="text-gray-700 font-medium">Valor da Comissão:</p>
              <p className="text-2xl font-bold text-orange-600">
                R$ {editCommissionData.commission_type === 'percentage'
                  ? ((editingCommissionSale.total_amount * editCommissionData.commission_value) / 100).toFixed(2)
                  : editCommissionData.commission_value.toFixed(2)
                }
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={onSave} className="flex-1 bg-green-600 hover:bg-green-700">
              Salvar Comissão
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1 border-gray-300">
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}