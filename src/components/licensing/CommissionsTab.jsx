import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, BarChart, Smartphone, Package } from 'lucide-react';

export default function CommissionsTab({ user, isSaiDeBaixo, isLoadingCommissions, myCommissionRecords, onViewHistory }) {
  const totalAvailable = ((user.commission_balance || 0) + (user.catalog_commission_balance || 0));

  return (
    <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
      <CardHeader>
        <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>💰 Extrato de Comissões</CardTitle>
        <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>Acompanhe seus ganhos por canal de venda</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Saldo Total */}
        <div className={`p-5 rounded-xl border-2 ${isSaiDeBaixo ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400' : 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>💵 Saldo Disponível para Saque</p>
              <p className={`text-3xl font-bold ${isSaiDeBaixo ? 'text-green-600' : 'text-green-400'}`}>R$ {(user.commission_balance || 0).toFixed(2)}</p>
            </div>
            <Wallet className={`w-10 h-10 ${isSaiDeBaixo ? 'text-green-500' : 'text-green-400'}`} />
          </div>
          <p className={`text-xs mt-2 ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-500'}`}>Este é o valor que você pode sacar agora.</p>
        </div>

        {/* Explicação */}
        <div className={`p-4 rounded-lg ${isSaiDeBaixo ? 'bg-gray-100' : 'bg-gray-700/50'}`}>
          <h4 className={`font-semibold mb-3 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>📊 Como funcionam suas comissões:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2"><span className="text-green-500">📱</span><div><strong className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>App (3%):</strong><span className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}> Você ganha 3% sobre cada arremate dos seus indicados.</span></div></div>
            <div className="flex items-start gap-2"><span className="text-blue-500">🛍️</span><div><strong className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>Catálogo (26%):</strong><span className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}> 26% distribuído entre os cargos da hierarquia.</span></div></div>
          </div>
        </div>

        {/* Cards por Canal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-5 rounded-xl border-2 ${isSaiDeBaixo ? 'bg-green-50 border-green-300' : 'bg-green-900/20 border-green-500/30'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"><Smartphone className="w-5 h-5 text-green-400" /></div>
              <div><p className={`font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>📱 App</p><p className={`text-xs ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-500'}`}>3% por arremate</p></div>
            </div>
            <p className={`text-2xl font-bold ${isSaiDeBaixo ? 'text-green-600' : 'text-green-400'}`}>R$ {Math.max(0, (user.total_commissions_generated || 0) - (user.catalog_total_commissions_generated || 0)).toFixed(2)}</p>
            <p className={`text-xs mt-1 ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-500'}`}>Total histórico</p>
          </div>
          <div className={`p-5 rounded-xl border-2 ${isSaiDeBaixo ? 'bg-blue-50 border-blue-300' : 'bg-blue-900/20 border-blue-500/30'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"><Package className="w-5 h-5 text-blue-400" /></div>
              <div><p className={`font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>🛍️ Catálogo</p><p className={`text-xs ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-500'}`}>26% distribuídos</p></div>
            </div>
            <p className={`text-2xl font-bold ${isSaiDeBaixo ? 'text-blue-600' : 'text-blue-400'}`}>R$ {(user.catalog_total_commissions_generated || 0).toFixed(2)}</p>
            <p className={`text-xs mt-1 ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-500'}`}>Total histórico</p>
          </div>
        </div>

        <Button onClick={onViewHistory} className={`w-full ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'}`} size="lg">
          <BarChart className="w-5 h-5 mr-2" />Ver Histórico Detalhado
        </Button>

        {/* Histórico */}
        <div className={`mt-6 rounded-xl border ${isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}`}>
          <div className="p-4 border-b border-gray-700/50">
            <h4 className={`${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} font-semibold`}>Histórico de Comissões</h4>
          </div>
          {isLoadingCommissions ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-green-500" /></div> :
          myCommissionRecords.length === 0 ? <div className={`text-center py-10 ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>Nenhuma comissão encontrada.</div> :
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className={isSaiDeBaixo ? 'border-gray-300' : 'border-gray-700'}>
                  <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Data</TableHead>
                  <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Canal</TableHead>
                  <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Cargo</TableHead>
                  <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Produto</TableHead>
                  <TableHead className={isSaiDeBaixo ? 'text-gray-700 text-right' : 'text-gray-400 text-right'}>%</TableHead>
                  <TableHead className={isSaiDeBaixo ? 'text-gray-700 text-right' : 'text-gray-400 text-right'}>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myCommissionRecords.map((rec) => (
                  <TableRow key={rec.id} className={isSaiDeBaixo ? 'border-gray-300' : 'border-gray-700'}>
                    <TableCell className={isSaiDeBaixo ? 'text-gray-700 text-sm' : 'text-gray-300 text-sm'}>{new Date(rec.created_date).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className={isSaiDeBaixo ? 'text-gray-700 text-sm' : 'text-gray-300 text-sm'}>{rec.sale_type === 'catalog' ? 'Catálogo' : 'App'}</TableCell>
                    <TableCell className={isSaiDeBaixo ? 'text-gray-700 text-sm' : 'text-gray-300 text-sm'}>{rec.role}</TableCell>
                    <TableCell className={isSaiDeBaixo ? 'text-gray-700 text-sm' : 'text-gray-300 text-sm'}>{rec.product_title || '-'}</TableCell>
                    <TableCell className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-right text-sm`}>{(rec.percent || 0).toFixed(2)}%</TableCell>
                    <TableCell className="text-green-400 text-right font-semibold">R$ {(rec.amount || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>}
        </div>
      </CardContent>
    </Card>
  );
}