import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Printer, CheckCircle, AlertCircle, DollarSign, Users, TrendingUp, Wallet } from 'lucide-react';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const bankConfig = [
  { key: 'santander', label: 'Santander', desc: 'Produtos Físicos', color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-700' },
  { key: 'itau', label: 'Itaú', desc: 'Licenciados', color: 'text-orange-400', bg: 'bg-orange-900/30', border: 'border-orange-700' },
  { key: 'nubank', label: 'Nubank', desc: 'Parceiros', color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-700' },
];

export default function DailyReportView() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const dateParam = urlParams.get('date') || '';

  const [allSales, setAllSales] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [paidCommissions, setPaidCommissions] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState({});

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role !== 'admin') {
        navigate(createPageUrl('Home'));
        return;
      }
    }
    loadData();
  }, [dateParam]);

  const loadData = async () => {
    setIsLoading(true);
    // Load sales, commissions and products in parallel
    const [salesList, commList, prodList] = await Promise.all([
      base44.entities.Sale.list('-sale_datetime', 2000),
      base44.entities.SaleCommission.list('-created_date', 5000),
      base44.entities.Product.list('-created_date', 500),
    ]);

    const prodsMap = {};
    prodList.forEach(p => { prodsMap[p.id] = p; });
    setProducts(prodsMap);

    // Filter sales for the given date
    const daySales = salesList.filter(s => {
      const saleDate = new Date(s.sale_datetime).toLocaleDateString('pt-BR');
      return saleDate === dateParam;
    });
    setAllSales(daySales);

    // Filter commissions for these sales
    const saleIds = new Set(daySales.map(s => s.id));
    const dayCommissions = commList.filter(c => saleIds.has(c.sale_id));
    setCommissions(dayCommissions);

    // Load paid status from localStorage
    const savedPaid = localStorage.getItem(`paid_commissions_${dateParam}`);
    if (savedPaid) {
      setPaidCommissions(JSON.parse(savedPaid));
    }

    setIsLoading(false);
  };

  const togglePaid = (commissionId) => {
    setSavingId(commissionId);
    const newPaid = { ...paidCommissions, [commissionId]: !paidCommissions[commissionId] };
    setPaidCommissions(newPaid);
    localStorage.setItem(`paid_commissions_${dateParam}`, JSON.stringify(newPaid));
    setTimeout(() => setSavingId(null), 300);
  };

  const markAllPaid = (sellerId) => {
    const sellerComms = commissions.filter(c => c.seller_id === sellerId);
    const newPaid = { ...paidCommissions };
    const allPaid = sellerComms.every(c => paidCommissions[c.id]);
    sellerComms.forEach(c => { newPaid[c.id] = !allPaid; });
    setPaidCommissions(newPaid);
    localStorage.setItem(`paid_commissions_${dateParam}`, JSON.stringify(newPaid));
  };

  // Derived data
  const getSaleCost = (sale) => {
    if (sale.product_cost && sale.product_cost > 0) return sale.product_cost * (sale.quantity_sold || 1);
    const prod = products[sale.product_id];
    if (prod && prod.cost_price) return prod.cost_price * (sale.quantity_sold || 1);
    return 0;
  };

  const totalValor = allSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalCustos = allSales.reduce((sum, s) => sum + getSaleCost(s), 0);

  // Commissions grouped by sale
  const saleCommMap = useMemo(() => {
    const map = {};
    commissions.forEach(c => {
      if (!map[c.sale_id]) map[c.sale_id] = [];
      map[c.sale_id].push(c);
    });
    return map;
  }, [commissions]);

  // Sellers grouped (licenciados)
  const sellersGrouped = useMemo(() => {
    const map = {};
    commissions.filter(c => c.seller_role !== 'licenciante').forEach(comm => {
      const sale = allSales.find(s => s.id === comm.sale_id);
      if (!sale) return;
      const sid = comm.seller_id;
      if (!map[sid]) {
        map[sid] = { seller_id: sid, seller_name: comm.seller_name, total_commission: 0, sales: [] };
      }
      map[sid].total_commission += comm.commission_amount || 0;
      if (!map[sid].sales.find(s => s.id === sale.id)) {
        map[sid].sales.push({ ...sale, seller_commission: comm.commission_amount, commission_id: comm.id, all_commissions: saleCommMap[sale.id] || [] });
      }
    });
    return Object.values(map).sort((a, b) => b.total_commission - a.total_commission);
  }, [commissions, allSales, saleCommMap]);

  // Licenciantes grouped
  const licenciantesGrouped = useMemo(() => {
    const map = {};
    commissions.filter(c => c.seller_role === 'licenciante').forEach(comm => {
      const sale = allSales.find(s => s.id === comm.sale_id);
      if (!sale) return;
      const lid = comm.seller_id;
      if (!map[lid]) {
        map[lid] = { seller_id: lid, seller_name: comm.seller_name, total_commission: 0, sales: [], commission_ids: [] };
      }
      map[lid].total_commission += comm.commission_amount || 0;
      map[lid].commission_ids.push(comm.id);
      if (!map[lid].sales.find(s => s.id === sale.id)) {
        const licenciado = commissions.find(c2 => c2.sale_id === sale.id && c2.seller_role !== 'licenciante');
        map[lid].sales.push({ ...sale, commission: comm.commission_amount, commission_id: comm.id, licenciado_name: licenciado?.seller_name || 'N/A' });
      }
    });
    return Object.values(map).sort((a, b) => b.total_commission - a.total_commission);
  }, [commissions, allSales]);

  const totalComLicenciados = sellersGrouped.reduce((s, v) => s + v.total_commission, 0);
  const totalComLicenciantes = licenciantesGrouped.reduce((s, v) => s + v.total_commission, 0);
  const totalComissoes = totalComLicenciados + totalComLicenciantes;
  const lucroLiquido = totalValor - totalCustos - totalComissoes;

  const totalPaidCommissions = commissions.filter(c => paidCommissions[c.id]).reduce((sum, c) => sum + (c.commission_amount || 0), 0);
  const totalPendingCommissions = totalComissoes - totalPaidCommissions;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-3 sm:p-4 shadow-lg print:bg-white print:text-black">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(createPageUrl('PDV'))} className="text-white hover:bg-green-800/50 print:hidden">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">📊 Relatório de Vendas - {dateParam}</h1>
              <p className="text-sm opacity-80">{allSales.length} vendas registradas</p>
            </div>
          </div>
          <Button onClick={() => window.print()} variant="ghost" className="text-white hover:bg-green-800/50 print:hidden">
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6">

        {/* Resumo Geral */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Total Vendas</p>
                  <p className="text-xl font-bold text-white">{allSales.length}</p>
                </div>
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Valor Total</p>
                  <p className="text-xl font-bold text-green-400">R$ {fmt(totalValor)}</p>
                </div>
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Total Comissões</p>
                  <p className="text-xl font-bold text-orange-400">R$ {fmt(totalComissoes)}</p>
                </div>
                <Users className="w-6 h-6 text-orange-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Lucro Líquido</p>
                  <p className={`text-xl font-bold ${lucroLiquido >= 0 ? 'text-green-400' : 'text-red-400'}`}>R$ {fmt(lucroLiquido)}</p>
                </div>
                <Wallet className="w-6 h-6 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status de Pagamento de Comissões */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="bg-green-900/30 border-green-700">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-green-300 text-sm">Comissões Pagas</p>
                <p className="text-2xl font-bold text-green-400">R$ {fmt(totalPaidCommissions)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-900/30 border-red-700">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-red-300 text-sm">Comissões Pendentes</p>
                <p className="text-2xl font-bold text-red-400">R$ {fmt(totalPendingCommissions)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Distribuição por Banco */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm sm:text-base">🏦 Distribuição por Banco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {bankConfig.map(bank => {
                const bankSales = allSales.filter(s => (s.receiving_bank || 'santander') === bank.key);
                const bankTotal = bankSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
                const bankComm = commissions.filter(c => {
                  const sale = allSales.find(s => s.id === c.sale_id);
                  return sale && (sale.receiving_bank || 'santander') === bank.key;
                }).reduce((sum, c) => sum + (c.commission_amount || 0), 0);
                return (
                  <div key={bank.key} className={`rounded-lg p-3 ${bank.bg} border ${bank.border}`}>
                    <p className={`font-bold ${bank.color}`}>{bank.label}</p>
                    <p className="text-gray-400 text-xs">{bank.desc}</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-gray-300">Vendas:</span><span className="text-white font-bold">{bankSales.length}</span></div>
                      <div className="flex justify-between"><span className="text-gray-300">Recebido:</span><span className="text-green-400 font-bold">R$ {fmt(bankTotal)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-300">Comissões:</span><span className="text-red-400 font-bold">-R$ {fmt(bankComm)}</span></div>
                      <div className="flex justify-between border-t border-gray-600 pt-1"><span className="text-gray-300">Líquido:</span><span className="text-white font-bold">R$ {fmt(bankTotal - bankComm)}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Comissões Licenciados */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm sm:text-base">👥 Comissões dos Licenciados (Vendedores)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sellersGrouped.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Nenhuma comissão de licenciado neste dia.</p>
            ) : sellersGrouped.map(seller => {
              const sellerComms = commissions.filter(c => c.seller_id === seller.seller_id && c.seller_role !== 'licenciante');
              const allPaid = sellerComms.length > 0 && sellerComms.every(c => paidCommissions[c.id]);
              const paidAmount = sellerComms.filter(c => paidCommissions[c.id]).reduce((s, c) => s + (c.commission_amount || 0), 0);

              return (
                <div key={seller.seller_id} className="bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold text-lg">
                        {(seller.seller_name || '?')[0]}
                      </div>
                      <div>
                        <p className="text-white font-bold">{seller.seller_name}</p>
                        <p className="text-gray-400 text-xs">{seller.sales.length} vendas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-orange-400 font-bold text-lg">R$ {fmt(seller.total_commission)}</p>
                        {paidAmount > 0 && paidAmount < seller.total_commission && (
                          <p className="text-green-400 text-xs">Pago: R$ {fmt(paidAmount)}</p>
                        )}
                      </div>
                      <Badge className={allPaid ? 'bg-green-600' : 'bg-red-600'}>
                        {allPaid ? 'Pago' : 'Pendente'}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => markAllPaid(seller.seller_id)}
                        className={`text-xs print:hidden ${allPaid ? 'border-red-600 text-red-400 hover:bg-red-900/30' : 'border-green-600 text-green-400 hover:bg-green-900/30'}`}>
                        {allPaid ? 'Desfazer' : 'Pagar Tudo'}
                      </Button>
                    </div>
                  </div>

                  {/* Sales detail */}
                  <div className="border-t border-gray-700 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-800">
                        <tr className="text-gray-400">
                          <th className="text-center p-2 w-10 print:hidden">Pago</th>
                          <th className="text-left p-2">Horário</th>
                          <th className="text-left p-2">Produto</th>
                          <th className="text-right p-2">Valor Venda</th>
                          <th className="text-left p-2">Banco</th>
                          <th className="text-right p-2">Comissão</th>
                          <th className="text-center p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seller.sales.map(sale => {
                          const comm = sellerComms.find(c => c.sale_id === sale.id);
                          const isPaid = comm ? paidCommissions[comm.id] : false;
                          const bankInfo = bankConfig.find(b => b.key === (sale.receiving_bank || 'santander'));
                          return (
                            <tr key={sale.id} className={`border-b border-gray-700/50 hover:bg-gray-800/50 ${isPaid ? 'opacity-60' : ''}`}>
                              <td className="p-2 text-center print:hidden">
                                {comm && (
                                  <Checkbox
                                    checked={isPaid}
                                    onCheckedChange={() => togglePaid(comm.id)}
                                    className="border-gray-500"
                                  />
                                )}
                              </td>
                              <td className="p-2 text-gray-300">
                                {new Date(sale.sale_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-2 text-gray-300">{(sale.product_description || '').substring(0, 30)}</td>
                              <td className="p-2 text-right text-green-400 font-bold">R$ {fmt(sale.total_amount)}</td>
                              <td className="p-2">
                                <span className={`font-bold ${bankInfo?.color || 'text-gray-400'}`}>{bankInfo?.label || 'N/A'}</span>
                              </td>
                              <td className="p-2 text-right text-orange-400 font-bold">R$ {fmt(sale.seller_commission)}</td>
                              <td className="p-2 text-center">
                                {isPaid
                                  ? <Badge className="bg-green-600 text-xs">Pago</Badge>
                                  : <Badge className="bg-yellow-600 text-xs">Pendente</Badge>
                                }
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {sellersGrouped.length > 0 && (
              <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3 flex justify-between items-center">
                <span className="text-orange-300 font-bold">TOTAL COMISSÕES LICENCIADOS:</span>
                <span className="text-orange-400 font-bold text-xl">R$ {fmt(totalComLicenciados)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comissões Licenciantes */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm sm:text-base">🤝 Comissões dos Licenciantes (Indicadores)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {licenciantesGrouped.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Nenhuma comissão de licenciante neste dia.</p>
            ) : licenciantesGrouped.map(lic => {
              const licComms = commissions.filter(c => c.seller_id === lic.seller_id && c.seller_role === 'licenciante');
              const allPaid = licComms.length > 0 && licComms.every(c => paidCommissions[c.id]);
              const paidAmount = licComms.filter(c => paidCommissions[c.id]).reduce((s, c) => s + (c.commission_amount || 0), 0);

              return (
                <div key={lic.seller_id} className="bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center text-purple-400 font-bold text-lg">
                        {(lic.seller_name || '?')[0]}
                      </div>
                      <div>
                        <p className="text-white font-bold">{lic.seller_name}</p>
                        <p className="text-gray-400 text-xs">{lic.sales.length} indicações</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-purple-400 font-bold text-lg">R$ {fmt(lic.total_commission)}</p>
                        {paidAmount > 0 && paidAmount < lic.total_commission && (
                          <p className="text-green-400 text-xs">Pago: R$ {fmt(paidAmount)}</p>
                        )}
                      </div>
                      <Badge className={allPaid ? 'bg-green-600' : 'bg-red-600'}>
                        {allPaid ? 'Pago' : 'Pendente'}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => markAllPaid(lic.seller_id)}
                        className={`text-xs print:hidden ${allPaid ? 'border-red-600 text-red-400 hover:bg-red-900/30' : 'border-green-600 text-green-400 hover:bg-green-900/30'}`}>
                        {allPaid ? 'Desfazer' : 'Pagar Tudo'}
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-800">
                        <tr className="text-gray-400">
                          <th className="text-center p-2 w-10 print:hidden">Pago</th>
                          <th className="text-left p-2">Horário</th>
                          <th className="text-left p-2">Produto</th>
                          <th className="text-left p-2">Licenciado</th>
                          <th className="text-right p-2">Valor Venda</th>
                          <th className="text-right p-2">Comissão</th>
                          <th className="text-center p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lic.sales.map(sale => {
                          const isPaid = paidCommissions[sale.commission_id];
                          return (
                            <tr key={sale.id} className={`border-b border-gray-700/50 hover:bg-gray-800/50 ${isPaid ? 'opacity-60' : ''}`}>
                              <td className="p-2 text-center print:hidden">
                                <Checkbox
                                  checked={!!isPaid}
                                  onCheckedChange={() => togglePaid(sale.commission_id)}
                                  className="border-gray-500"
                                />
                              </td>
                              <td className="p-2 text-gray-300">
                                {new Date(sale.sale_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-2 text-gray-300">{(sale.product_description || '').substring(0, 25)}</td>
                              <td className="p-2 text-blue-300">{sale.licenciado_name}</td>
                              <td className="p-2 text-right text-green-400 font-bold">R$ {fmt(sale.total_amount)}</td>
                              <td className="p-2 text-right text-purple-400 font-bold">R$ {fmt(sale.commission)}</td>
                              <td className="p-2 text-center">
                                {isPaid
                                  ? <Badge className="bg-green-600 text-xs">Pago</Badge>
                                  : <Badge className="bg-yellow-600 text-xs">Pendente</Badge>
                                }
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {licenciantesGrouped.length > 0 && (
              <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3 flex justify-between items-center">
                <span className="text-purple-300 font-bold">TOTAL COMISSÕES LICENCIANTES:</span>
                <span className="text-purple-400 font-bold text-xl">R$ {fmt(totalComLicenciantes)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Geral */}
        <Card className="bg-yellow-900/30 border-yellow-600">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <p className="text-yellow-300 font-bold text-lg">💰 TOTAL GERAL DE COMISSÕES A PAGAR</p>
                <p className="text-gray-400 text-xs">Licenciados: R$ {fmt(totalComLicenciados)} + Licenciantes: R$ {fmt(totalComLicenciantes)}</p>
              </div>
              <p className="text-orange-400 font-bold text-3xl">R$ {fmt(totalComissoes)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Detalhamento de Vendas */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm sm:text-base">📋 Detalhamento de Todas as Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-900">
                  <tr className="text-gray-400">
                    <th className="text-left p-2">Hora</th>
                    <th className="text-left p-2">Vendedor</th>
                    <th className="text-left p-2">Produto</th>
                    <th className="text-right p-2">Valor</th>
                    <th className="text-right p-2">Custo</th>
                    <th className="text-left p-2">Banco</th>
                    <th className="text-left p-2">Pagamento</th>
                    <th className="text-right p-2">Comissão</th>
                    <th className="text-right p-2">Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {[...allSales].sort((a, b) => new Date(a.sale_datetime) - new Date(b.sale_datetime)).map(sale => {
                    const cost = getSaleCost(sale);
                    const comm = sale.commission_amount || 0;
                    const profit = (sale.total_amount || 0) - cost - comm;
                    const bankInfo = bankConfig.find(b => b.key === (sale.receiving_bank || 'santander'));
                    return (
                      <tr key={sale.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="p-2 text-gray-300">{new Date(sale.sale_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-2 text-gray-300">{(sale.seller_name || 'N/A').substring(0, 18)}</td>
                        <td className="p-2 text-gray-300">{(sale.product_description || '').substring(0, 25)}</td>
                        <td className="p-2 text-right text-green-400 font-bold">R$ {fmt(sale.total_amount)}</td>
                        <td className="p-2 text-right text-red-400">R$ {fmt(cost)}</td>
                        <td className={`p-2 font-bold ${bankInfo?.color || 'text-gray-400'}`}>{bankInfo?.label || 'N/A'}</td>
                        <td className="p-2 text-gray-300">{sale.payment_method}</td>
                        <td className="p-2 text-right text-orange-400">R$ {fmt(comm)}</td>
                        <td className={`p-2 text-right font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>R$ {fmt(profit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}