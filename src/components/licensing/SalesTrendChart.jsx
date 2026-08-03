import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

// 📈 "Vendas nos últimos 7 dias" — mesmo estilo do Mercado Pago (linha +
// stats ao lado), na cor verde da marca.
export default function SalesTrendChart({ sales, isSaiDeBaixo }) {
  const lineColor = isSaiDeBaixo ? '#dc2626' : '#10b981';

  const { chartData, volume, qty, ticket } = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    const buckets = days.map((d) => ({
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      dateKey: d.toDateString(),
      total: 0
    }));

    let totalVolume = 0;
    let totalQty = 0;
    (Array.isArray(sales) ? sales : []).forEach((s) => {
      const amount = s.total_amount ?? s.sale_price ?? 0;
      const created = s.created_date ? new Date(s.created_date) : null;
      if (!created) return;
      totalVolume += amount;
      totalQty += 1;
      const bucket = buckets.find((b) => b.dateKey === created.toDateString());
      if (bucket) bucket.total += amount;
    });

    return {
      chartData: buckets,
      volume: totalVolume,
      qty: totalQty,
      ticket: totalQty > 0 ? totalVolume / totalQty : 0
    };
  }, [sales]);

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-900">Vendas nos últimos 7 dias</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => `R$ ${Number(v).toFixed(2)}`} />
                <Line type="monotone" dataKey="total" stroke={lineColor} strokeWidth={2.5} dot={{ r: 3, fill: lineColor }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-row md:flex-col justify-between gap-4 md:w-40 shrink-0">
            <div>
              <p className="text-xs text-gray-500">Volume de vendas</p>
              <p className="text-lg font-bold text-gray-900">R$ {volume.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ticket médio</p>
              <p className="text-lg font-bold text-gray-900">R$ {ticket.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Quantidade de vendas</p>
              <p className="text-lg font-bold text-gray-900">{qty}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}