import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Package, DollarSign, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const CatalogSale = base44.entities.CatalogSale;
const CommissionRecord = base44.entities.CommissionRecord;
const AppUser = base44.entities.AppUser;

export default function AdminCatalogSales() {
  const [currentUser, setCurrentUser] = useState(null);
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLicensee, setFilterLicensee] = useState('all');
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = localStorage.getItem('currentUser');
      if (user) {
        setCurrentUser(JSON.parse(user));
      }

      const allSales = await CatalogSale.list('-created_date', 200);
      setSales(Array.isArray(allSales) ? allSales : []);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
      toast.error('Erro ao carregar vendas');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSales = useMemo(() => {
    let filtered = sales;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.product_title?.toLowerCase().includes(term) ||
        s.buyer_name?.toLowerCase().includes(term) ||
        s.buyer_email?.toLowerCase().includes(term)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => s.status === filterStatus);
    }

    if (filterLicensee !== 'all') {
      filtered = filtered.filter(s => s.licensee_id === filterLicensee);
    }

    return filtered;
  }, [sales, searchTerm, filterStatus, filterLicensee]);

  const stats = useMemo(() => {
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + (s.sale_price || 0), 0);
    const totalCommissions = sales.reduce((sum, s) => sum + (s.commission_licensee_amount || 0), 0);
    const pendingPayment = sales.filter(s => s.status === 'pending_payment').length;

    return { totalSales, totalRevenue, totalCommissions, pendingPayment };
  }, [sales]);

  const licenseeOptions = useMemo(() => {
    const licensees = new Map();
    sales.forEach(s => {
      if (s.licensee_id && !licensees.has(s.licensee_id)) {
        licensees.set(s.licensee_id, s.licensee_name);
      }
    });
    return Array.from(licensees.entries()).map(([id, name]) => ({ id, name }));
  }, [sales]);

  const handleUpdateStatus = async (saleId, newStatus) => {
    setIsUpdating(true);
    try {
      await CatalogSale.update(saleId, { status: newStatus });
      setSales(sales.map(s => s.id === saleId ? { ...s, status: newStatus } : s));
      toast.success('Status atualizado com sucesso!');
      setSelectedSaleId(null);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddTrackingCode = async (saleId) => {
    if (!trackingCode.trim()) {
      toast.error('Informe um código de rastreio');
      return;
    }

    setIsUpdating(true);
    try {
      await CatalogSale.update(saleId, { tracking_code: trackingCode, status: 'shipped' });
      setSales(sales.map(s => s.id === saleId ? { ...s, tracking_code: trackingCode, status: 'shipped' } : s));
      toast.success('Código de rastreio adicionado!');
      setTrackingCode('');
      setSelectedSaleId(null);
    } catch (error) {
      console.error('Erro ao adicionar código:', error);
      toast.error('Erro ao adicionar código');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending_payment: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
      paid: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
      processing: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
      shipped: 'bg-cyan-500/20 text-cyan-700 border-cyan-500/30',
      delivered: 'bg-green-500/20 text-green-700 border-green-500/30',
      canceled: 'bg-red-500/20 text-red-700 border-red-500/30'
    };
    return colors[status] || colors.pending_payment;
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending_payment: '⏳ Aguardando Pagamento',
      paid: '✅ Pago',
      processing: '🔄 Processando',
      shipped: '📦 Enviado',
      delivered: '🎉 Entregue',
      canceled: '❌ Cancelado'
    };
    return labels[status] || status;
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-red-500">
          <CardContent className="p-6 text-center">
            <p className="text-red-400">Acesso negado. Apenas administradores.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Package className="w-8 h-8 text-green-400" />
            Gestão de Vendas do Catálogo
          </h1>
          <p className="text-gray-400">Acompanhe e gerencie todas as vendas diretas</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="text-sm text-gray-400 mb-1">Total de Vendas</div>
              <div className="text-2xl font-bold">{stats.totalSales}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="text-sm text-gray-400 mb-1">Receita Total</div>
              <div className="text-2xl font-bold text-green-400">R$ {stats.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="text-sm text-gray-400 mb-1">Comissões Geradas</div>
              <div className="text-2xl font-bold text-blue-400">R$ {stats.totalCommissions.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="text-sm text-gray-400 mb-1">Aguardando Pagamento</div>
              <div className="text-2xl font-bold text-yellow-400">{stats.pendingPayment}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-300">Buscar</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Produto, comprador ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending_payment">Aguardando Pagamento</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="processing">Processando</SelectItem>
                    <SelectItem value="shipped">Enviado</SelectItem>
                    <SelectItem value="delivered">Entregue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Licenciado</Label>
                <Select value={filterLicensee} onValueChange={setFilterLicensee}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">Todos</SelectItem>
                    {licenseeOptions.map(lic => (
                      <SelectItem key={lic.id} value={lic.id}>
                        {lic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendas */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : filteredSales.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto opacity-50 mb-4" />
              <p className="text-gray-400">Nenhuma venda encontrada</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">Produto</TableHead>
                    <TableHead className="text-gray-400">Comprador</TableHead>
                    <TableHead className="text-gray-400">Licenciado</TableHead>
                    <TableHead className="text-gray-400">Valor</TableHead>
                    <TableHead className="text-gray-400">Comissão</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Rastreio</TableHead>
                    <TableHead className="text-gray-400">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map(sale => (
                    <TableRow key={sale.id} className="border-gray-700 hover:bg-gray-700/50">
                      <TableCell className="text-gray-300 text-sm">{sale.product_title}</TableCell>
                      <TableCell className="text-gray-300 text-sm">
                        <div>{sale.buyer_name}</div>
                        <div className="text-xs text-gray-500">{sale.buyer_email}</div>
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">{sale.licensee_name}</TableCell>
                      <TableCell className="text-white font-semibold">R$ {sale.sale_price?.toFixed(2)}</TableCell>
                      <TableCell className="text-green-400">R$ {sale.commission_licensee_amount?.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(sale.status)} text-xs`}>
                          {getStatusLabel(sale.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {sale.tracking_code ? (
                          <span className="text-green-400">{sale.tracking_code}</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                          onClick={() => setSelectedSaleId(sale.id)}
                        >
                          Gerenciar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Modal de Gerenciamento */}
        {selectedSaleId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="bg-gray-800 border-gray-700 w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-white">Gerenciar Venda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const sale = sales.find(s => s.id === selectedSaleId);
                  if (!sale) return null;

                  return (
                    <>
                      <div className="bg-gray-700/50 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">Produto: <span className="text-white">{sale.product_title}</span></p>
                        <p className="text-sm text-gray-400">Comprador: <span className="text-white">{sale.buyer_name}</span></p>
                        <p className="text-sm text-gray-400">Valor: <span className="text-green-400">R$ {sale.sale_price?.toFixed(2)}</span></p>
                      </div>

                      <div>
                        <Label className="text-gray-300">Novo Status</Label>
                        <Select defaultValue={sale.status} onValueChange={(value) => handleUpdateStatus(sale.id, value)}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-2" disabled={isUpdating}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="pending_payment">Aguardando Pagamento</SelectItem>
                            <SelectItem value="paid">Pago</SelectItem>
                            <SelectItem value="processing">Processando</SelectItem>
                            <SelectItem value="shipped">Enviado</SelectItem>
                            <SelectItem value="delivered">Entregue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {sale.status !== 'delivered' && (
                        <div>
                          <Label className="text-gray-300">Código de Rastreio</Label>
                          <div className="flex gap-2 mt-2">
                            <Input
                              value={trackingCode}
                              onChange={(e) => setTrackingCode(e.target.value)}
                              placeholder="Ex: BR123456789"
                              className="bg-gray-700 border-gray-600 text-white"
                              disabled={isUpdating}
                            />
                            <Button
                              onClick={() => handleAddTrackingCode(sale.id)}
                              disabled={isUpdating || !trackingCode}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
                            </Button>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={() => setSelectedSaleId(null)}
                        variant="outline"
                        className="w-full border-gray-600 text-gray-300"
                        disabled={isUpdating}
                      >
                        Fechar
                      </Button>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}