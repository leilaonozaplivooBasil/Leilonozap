import React, { useState } from 'react';
import { previewCatalogCommission } from '@/functions/previewCatalogCommission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CommissionDistributionFull() {
  const [saleValue, setSaleValue] = useState(10000);
  const [anchorName, setAnchorName] = useState('Robert');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await previewCatalogCommission({
        sale_value: Number(saleValue),
        anchor_name: anchorName,
        candidate_names: []
      });

      if (response.data && response.data.success) {
        setResult(response.data);
      } else {
        setError(response.data?.error || 'Erro ao processar');
      }
    } catch (err) {
      setError(err.message || 'Erro ao conectar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">📊 Distribuição de Comissão Completa</h1>

        {/* CONTROLES */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Simulador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-300 block mb-2">Valor da Venda (R$)</label>
                <Input
                  type="number"
                  value={saleValue}
                  onChange={(e) => setSaleValue(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="text-gray-300 block mb-2">Nome do Licensee (Âncora)</label>
                <Input
                  type="text"
                  value={anchorName}
                  onChange={(e) => setAnchorName(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  disabled={loading}
                />
              </div>
            </div>
            <Button
              onClick={handleSimulate}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Processando...' : 'Simular Distribuição'}
            </Button>
          </CardContent>
        </Card>

        {/* ERRO */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 p-4 rounded-lg mb-8">
            {error}
          </div>
        )}

        {/* RESULTADO */}
        {result && (
          <div className="space-y-8">
            {/* RESUMO */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">📈 Resumo da Venda</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-2">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Licensee (Âncora)</p>
                    <p className="text-xl font-bold text-green-400">{result.anchor}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Valor da Venda</p>
                    <p className="text-xl font-bold text-green-400">R$ {result.sale_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total em Comissão (30%)</p>
                    <p className="text-xl font-bold text-yellow-400">
                      R$ {(result.sale_value * 0.30).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-sm font-semibold text-gray-300">📍 Cadeia de Referência:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {result.chain.map((name, idx) => (
                      <span key={idx} className="bg-blue-900 text-blue-200 px-3 py-1 rounded text-sm">
                        {idx === 0 ? '🎯 ' : ''}{name}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* TABELA COMPLETA */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">✅ TODOS OS BENEFICIADOS (Completo)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 px-4 text-gray-300 font-semibold">#</th>
                        <th className="text-left py-2 px-4 text-gray-300 font-semibold">BENEFICIADO</th>
                        <th className="text-left py-2 px-4 text-gray-300 font-semibold">CARGO</th>
                        <th className="text-right py-2 px-4 text-gray-300 font-semibold">%</th>
                        <th className="text-right py-2 px-4 text-gray-300 font-semibold">VALOR R$</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.records.map((record, idx) => (
                        <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                          <td className="py-3 px-4 text-white font-semibold">{record.user_full_name}</td>
                          <td className="py-3 px-4 text-gray-300">{record.role}</td>
                          <td className="py-3 px-4 text-right text-gray-300">{record.percent.toFixed(2)}%</td>
                          <td className="py-3 px-4 text-right font-bold text-green-400">
                            R$ {record.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-700/50 border-t-2 border-gray-600">
                        <td colSpan="3" className="py-3 px-4 text-white font-bold">TOTAL</td>
                        <td className="py-3 px-4 text-right font-bold text-gray-300">26.00%</td>
                        <td className="py-3 px-4 text-right font-bold text-yellow-400">
                          R$ {result.records.reduce((s, r) => s + r.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Site Official Rollup */}
                {result.site_official_rollup && (
                  <div className="mt-6 p-4 bg-purple-900/30 border border-purple-700 rounded">
                    <p className="text-purple-300 text-sm font-semibold">
                      💼 Valores que ficaram com a empresa (Site Oficial):
                    </p>
                    <p className="text-purple-100 mt-2">
                      R$ {result.site_official_rollup.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({result.site_official_rollup.percent.toFixed(2)}%)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}