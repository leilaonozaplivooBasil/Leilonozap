import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BarChart3, Wallet, Gavel, ShoppingBag, Loader2, CheckCircle2 } from 'lucide-react';

// 🎨 Tema único "fintech" claro — verde (leilão) + marrom da marca (loja virtual),
// sem fundos escuros e sem emojis. isSaiDeBaixo não altera mais o tema visual.
export default function CommissionsTab({ user, isLoadingCommissions, myCommissionRecords, onViewHistory }) {
  // 🔧 Âncora real: Vendedor recebe 10% direto, Licenciado recebe 13% direto —
  // nada de valor fixo, puxa do cargo real do usuário.
  const anchorPercent = user?.is_seller ? 10 : 13;
  return (
    <Card className="bg-white border-nz-borda">
      <CardHeader>
        <CardTitle className="text-gray-900">Extrato de Comissões</CardTitle>
        <CardDescription className="text-gray-500">
          Acompanhe seus ganhos por canal de venda
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Saldo Total Disponível */}
        <div className="p-5 rounded-xl border-2 bg-nz-verde-fundo border-nz-verde/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Saldo Disponível para Saque</p>
              <p className="text-3xl font-bold text-nz-verde">
                R$ {(user.commission_balance || 0).toFixed(2)}
              </p>
            </div>
            <Wallet className="w-10 h-10 text-nz-verde" />
          </div>
          <p className="text-xs mt-2 text-gray-500">
            Este é o valor que você pode sacar agora. Após saques, este valor diminui.
          </p>
        </div>

        {/* Explicação dos Canais */}
        <div className="p-4 rounded-lg bg-nz-marrom-fundo/50 border border-nz-marrom/15">
          <h4 className="font-semibold mb-3 text-gray-900">Como funcionam suas comissões</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Gavel className="w-4 h-4 text-nz-verde mt-0.5 shrink-0" />
              <div>
                <strong className="text-gray-900">Leilão (5%):</strong>
                <span className="text-gray-600"> Você ganha 5% sobre cada arremate feito por quem comprou através do seu link.</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ShoppingBag className="w-4 h-4 text-nz-marrom mt-0.5 shrink-0" />
              <div>
                <strong className="text-gray-900">Loja Virtual (30%):</strong>
                <span className="text-gray-600"> 30% de cada venda é distribuído entre você e sua estrutura de cargos. Você recebe de acordo com seus cargos ativos.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cards por Canal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border bg-nz-verde-fundo border-nz-verde/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-nz-verde/15 flex items-center justify-center shrink-0">
                <Gavel className="w-6 h-6 text-nz-verde" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Leilão</p>
                <p className="text-xs text-gray-500">5% por arremate de quem usou seu link</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-nz-verde">
              R$ {Math.max(0, (user.total_commissions_generated || 0) - (user.catalog_total_commissions_generated || 0)).toFixed(2)}
            </p>
            <p className="text-xs mt-1 text-gray-500">Total histórico gerado</p>
            <div className="mt-3 pt-3 border-t border-nz-verde/20">
              <p className="text-xs text-gray-600 flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-nz-verde mt-0.5 shrink-0" />
                Compartilhe seu link único. Quando alguém arremata pelo seu link, você ganha 5%.
              </p>
            </div>
          </div>
          <div className="p-5 rounded-2xl border bg-nz-verde-fundo border-nz-verde/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-nz-verde/15 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6 text-nz-verde" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Loja Virtual</p>
                <p className="text-xs text-gray-500">30% distribuídos na sua estrutura</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-nz-verde">
              R$ {(user.catalog_commission_balance || 0).toFixed(2)}
            </p>
            <p className="text-xs mt-1 text-gray-500">Total histórico gerado</p>
            <div className="mt-3 pt-3 border-t border-nz-verde/20">
              <p className="text-xs text-gray-600 flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-nz-verde mt-0.5 shrink-0" />
                Âncora: {anchorPercent}% direto. Cargos ativos: bônus extras.
              </p>
            </div>
          </div>
        </div>

        <Button onClick={onViewHistory} className="w-full bg-nz-verde hover:bg-nz-verde-escuro text-white" size="lg">
          <BarChart3 className="w-5 h-5 mr-2" />
          Ver Histórico Detalhado por Venda
        </Button>

        {/* Histórico de Comissões */}
        <div className="mt-6 rounded-xl border bg-white border-nz-borda">
          <div className="p-4 border-b border-nz-borda">
            <h4 className="text-gray-900 font-semibold">Histórico de Comissões</h4>
            <p className="text-gray-500 text-sm">Últimos lançamentos de Leilão e Loja Virtual</p>
          </div>
          {isLoadingCommissions ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-nz-verde" /></div>
          ) : myCommissionRecords.length === 0 ? (
            <div className="text-center py-10 text-gray-500">Nenhuma comissão encontrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-nz-borda">
                    <TableHead className="text-gray-500">Data</TableHead>
                    <TableHead className="text-gray-500">Canal</TableHead>
                    <TableHead className="text-gray-500">Cargo</TableHead>
                    <TableHead className="text-gray-500">Produto</TableHead>
                    <TableHead className="text-gray-500 text-right">%</TableHead>
                    <TableHead className="text-gray-500 text-right">Valor (R$)</TableHead>
                    <TableHead className="text-gray-500">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myCommissionRecords.map((rec) => (
                    <TableRow key={rec.id} className="border-nz-marrom/15 hover:bg-nz-marrom-fundo/30">
                      <TableCell className="text-gray-700 text-sm">{new Date(rec.created_date).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-gray-700 text-sm">{rec.sale_type === 'catalog' ? 'Loja Virtual' : 'Leilão'}</TableCell>
                      <TableCell className="text-gray-700 text-sm">{rec.role}</TableCell>
                      <TableCell className="text-gray-700 text-sm">{rec.product_title || '-'}</TableCell>
                      <TableCell className="text-gray-700 text-right text-sm">{(rec.percent || 0).toFixed(2)}%</TableCell>
                      <TableCell className="text-nz-verde text-right font-semibold">R$ {(rec.amount || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-gray-700 text-sm">{rec.status || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}