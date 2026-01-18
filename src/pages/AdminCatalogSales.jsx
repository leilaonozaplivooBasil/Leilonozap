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
const Auction = base44.entities.Auction;
const AppUser = base44.entities.AppUser;

export default function AdminCatalogSales() {
  const [currentUser, setCurrentUser] = useState(null);
  const [sales, setSales] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('leilao');
  const [referredUsers, setReferredUsers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = localStorage.getItem('currentUser');
      if (!user) {
        toast.error('Faça login para continuar');
        return;
      }
      const parsedUser = JSON.parse(user);
      setCurrentUser(parsedUser);

      // Buscar usuários indicados
      const referred = await AppUser.filter({ referred_by_id: parsedUser.id });
      setReferredUsers(referred);
      const referredIds = referred.map(u => u.id);

      // Buscar vendas do catálogo dos indicados
      const allSales = await CatalogSale.list('-created_date', 200);
      const mySales = allSales.filter(s => referredIds.includes(s.buyer_id));
      setSales(Array.isArray(mySales) ? mySales : []);

      // Buscar arremates dos indicados
      const allAuctions = await Auction.list('-updated_date', 200);
      const myAuctions = allAuctions.filter(a => 
        a.status === 'sold' && referredIds.includes(a.winner_id)
      );
      setAuctions(Array.isArray(myAuctions) ? myAuctions : []);

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

    return filtered;
  }, [sales, searchTerm, filterStatus]);

  const filteredAuctions = useMemo(() => {
    let filtered = auctions;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.title?.toLowerCase().includes(term) ||
        a.winner_name?.toLowerCase().includes(term)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => a.order_status === filterStatus);
    }

    return filtered;
  }, [auctions, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const totalAuctions = auctions.length;
    const totalSales = sales.length;
    const auctionRevenue = auctions.reduce((sum, a) => sum + (a.current_price || 0), 0);
    const catalogRevenue = sales.reduce((sum, s) => sum + (s.sale_price || 0), 0);
    const totalRevenue = auctionRevenue + catalogRevenue;
    
    // Comissões: 10% dos leilões + comissões do catálogo
    const auctionCommissions = auctionRevenue * 0.10;
    const catalogCommissions = sales.reduce((sum, s) => sum + (s.commission_licensee_amount || 0), 0);
    const totalCommissions = auctionCommissions + catalogCommissions;

    return { totalAuctions, totalSales, totalRevenue, totalCommissions };
  }, [auctions, sales]);



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

  const handleBackfillAsaas = async () => {
    setIsUpdating(true);
    try {
      const { data } = await base44.functions.invoke('asaasBackfillCustomers', {});
      const created = data?.created ?? 0;
      const skipped = data?.skipped ?? 0;
      const errors = data?.errors ?? 0;
      toast.success(`Clientes criados: ${created} • existentes: ${skipped} • erros: ${errors}`);
    } catch (error) {
      console.error('Backfill Asaas error:', error);
      toast.error('Falha ao criar clientes no Asaas');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending_payment: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
      awaiting_payment: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
      paid: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
      processing: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
      shipped: 'bg-cyan-500/20 text-cyan-700 border-cyan-500/30',
      delivered: 'bg-green-500/20 text-green-700 border-green-500/30',
      canceled: 'bg-red-500/20 text-red-700 border-red-500/30'
    };
    return colors[status] || colors.paid;
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending_payment: '⏳ Aguardando Pagamento',
      awaiting_payment: '⏳ Aguardando Pagamento',
      paid: '✅ Pago',
      processing: '🔄 Processando',
      shipped: '📦 Enviado',
      delivered: '🎉 Entregue',
      canceled: '❌ Cancelado'
    };
    return labels[status] || '✅ Pago';
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-yellow-500">
          <CardContent className="p-6 text-center">
            <p className="text-yellow-400">Faça login para acessar suas vendas</p>
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
            Painel de Alavancagem
          </h1>
          <p className="text-gray-400">Acompanhe suas vendas de leilão e catálogo</p>
          <div className="mt-3">
            {currentUser?.role === 'admin' && (
              <Button onClick={handleBackfillAsaas} className="bg-green-600 hover:bg-green-700" disabled={isUpdating}>
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar clientes no Asaas'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="text-sm text-gray-400 mb-1">Arremates dos Indicados</div>
              <div className="text-2xl font-bold">{stats.totalAuctions}</div>
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
              <div className="text-sm text-gray-400 mb-1">Suas Comissões</div>
              <div className="text-2xl font-bold text-blue-400">R$ {stats.totalCommissions.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="text-sm text-gray-400 mb-1">Clientes Indicados</div>
              <div className="text-2xl font-bold text-purple-400">{referredUsers.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs e Filters */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardContent className="p-6 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-gray-700">
                <TabsTrigger value="leilao" className="data-[state=active]:bg-green-600">Leilão</TabsTrigger>
                <TabsTrigger value="catalogo" className="data-[state=active]:bg-blue-600">Catálogo</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Buscar</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Produto ou comprador..."
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
                    <SelectItem value="awaiting_payment">Aguardando Pagamento</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="shipped">Enviado</SelectItem>
                    <SelectItem value="delivered">Entregue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo das Tabs */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : (
          <Card className="bg-gray-800 border-gray-700">
            {activeTab === 'leilao' ? (
              filteredAuctions.length === 0 ? (
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 mx-auto opacity-50 mb-4" />
                  <p className="text-gray-400">Arremates dos indicados: 0</p>
                </CardContent>
              ) : (
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-400">Produto</TableHead>
                        <TableHead className="text-gray-400">Arrematante</TableHead>
                        <TableHead className="text-gray-400">Valor</TableHead>
                        <TableHead className="text-gray-400">Comissão (10%)</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuctions.map(auction => (
                        <TableRow key={auction.id} className="border-gray-700 hover:bg-gray-700/50">
                          <TableCell className="text-gray-300 text-sm">{auction.title}</TableCell>
                          <TableCell className="text-gray-300 text-sm">{auction.winner_name}</TableCell>
                          <TableCell className="text-white font-semibold">R$ {auction.current_price?.toFixed(2)}</TableCell>
                          <TableCell className="text-green-400">R$ {(auction.current_price * 0.10).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(auction.order_status || 'paid')} text-xs`}>
                              {getStatusLabel(auction.order_status || 'paid')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {new Date(auction.updated_date).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )
            ) : (
              filteredSales.length === 0 ? (
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 mx-auto opacity-50 mb-4" />
                  <p className="text-gray-400">Nenhuma venda do catálogo encontrada</p>
                </CardContent>
              ) : (
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-400">Produto</TableHead>
                        <TableHead className="text-gray-400">Comprador</TableHead>
                        <TableHead className="text-gray-400">Valor</TableHead>
                        <TableHead className="text-gray-400">Sua Comissão</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.map(sale => (
                        <TableRow key={sale.id} className="border-gray-700 hover:bg-gray-700/50">
                          <TableCell className="text-gray-300 text-sm">{sale.product_title}</TableCell>
                          <TableCell className="text-gray-300 text-sm">{sale.buyer_name}</TableCell>
                          <TableCell className="text-white font-semibold">R$ {sale.sale_price?.toFixed(2)}</TableCell>
                          <TableCell className="text-green-400">R$ {sale.commission_licensee_amount?.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(sale.status)} text-xs`}>
                              {getStatusLabel(sale.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {new Date(sale.created_date).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )
            )}
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