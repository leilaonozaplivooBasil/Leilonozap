
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calculator, ShieldCheck, AlertTriangle } from 'lucide-react';
import base44Client from '@/api/base44Client';
import { toast } from 'sonner';
import { calculateExpectedCommission } from '@/utils/CommissionAuditRules';

export default function CommissionPilot() {
    const [mode, setMode] = useState('real'); // 'real' | 'simulate' | 'batch'
    const [saleId, setSaleId] = useState('');
    const [simAmount, setSimAmount] = useState('');
    const [simLicenseeId, setSimLicenseeId] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const [batchResults, setBatchResults] = useState([]);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

    const handleRun = async () => {
        setLoading(true);
        setResult(null);
        try {
            const payload = mode === 'real'
                ? { sale_id: saleId }
                : { simulate_amount: parseFloat(simAmount), simulate_licensee_id: simLicenseeId };

            const response = await base44Client.functions.invoke('commissionPilot', payload);

            if (response.data && response.data.success) {
                setResult(response.data);
                toast.success("Simulação concluída!");
            } else {
                toast.error(response.data?.error || "Erro na execução");
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao chamar função: " + err.message);
        } finally {
            setLoading(false);
        }
    };



    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); // 01/Jan
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Hoje
    const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'paid' | 'processing'
    const [filterUserId, setFilterUserId] = useState('');

    const handleBatchAudit = async () => {
        setLoading(true);
        setBatchResults([]);
        setBatchProgress({ current: 0, total: 0 });
        try {
            // 1. Busca DADOS COMPLETOS via API Segura com Filtros de Data
            toast.info(`Baixando dados... (${startDate} a ${endDate})`);
            const auditResp = await base44Client.functions.invoke('exportAuditData', {
                start_date: startDate,
                end_date: endDate,
                user_id: filterUserId || undefined
            });

            if (!auditResp.data || !auditResp.data.success) {
                throw new Error(auditResp.data?.error || "Falha ao exportar dados");
            }

            const { sales, users, commissions } = auditResp.data.data;
            const totalSales = sales.length;

            toast.info(`Analisando ${totalSales} vendas... Filtro Status: ${filterStatus}`);
            setBatchProgress({ current: 0, total: totalSales });

            const results = [];

            // 2. Processamento Local
            await new Promise(r => setTimeout(r, 100));

            let processed = 0;
            for (const sale of sales) {
                processed++;
                if (processed % 5 === 0) {
                    setBatchProgress({ current: processed, total: totalSales });
                    await new Promise(r => setTimeout(r, 10));
                }

                try {
                    // A) Expectativa
                    const expected = calculateExpectedCommission(sale, users);

                    // B) Realidade
                    const actualCommissions = commissions.filter(c => c.sale_id === sale.id);

                    // Verifica status consolidado da venda (se todas comissões estão pagas)
                    // Se filtro 'paid': Só mostra se TODAS comissões geradas estiverem com status='paid'?
                    // Ou se user pediu status específico, verificamos se as comissões batem com esse status.
                    // Para simplificar: Filtramos as comissões REAIS pelo status.

                    // Mas a auditoria compara venda por venda.
                    // Se eu filtrar 'paid', devo ignorar vendas que não estão pagas?
                    // Vendas não têm status de pagamento de comissão, as comissões que têm.

                    let statusMatch = true;
                    if (filterStatus !== 'all') {
                        // Se filtro 'paid', exige que comissões existam e estejam 'paid'
                        // Se 'processing', exige que estejam != 'paid' ou pendente.
                        // Se não houver comissões reais (ainda não geradas?), consideramos 'processing'?

                        const hasPaid = actualCommissions.some(c => c.status === 'paid' || c.paid_at);
                        if (filterStatus === 'paid' && !hasPaid) statusMatch = false;
                        if (filterStatus === 'processing' && hasPaid) statusMatch = false; // Se já pagou, não é processing
                    }

                    if (!statusMatch) continue;

                    const actualTotal = actualCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);
                    const simTotal = expected.total_distributed;
                    const diff = Math.abs(simTotal - actualTotal);

                    const isDivergent = diff > 0.05;

                    if (isDivergent || results.length < 50) { // Aumentei limite para 50
                        results.push({
                            sale,
                            status: isDivergent ? 'divergent' : 'ok',
                            simTotal,
                            actTotal: actualTotal,
                            diff,
                            trace: expected.trace,
                            commissions_status: actualCommissions.map(c => c.status).join(', ') || 'N/A'
                        });
                    }

                } catch (e) {
                    results.push({ sale, status: 'error', error: e.message });
                }
            }

            results.sort((a, b) => (a.status === 'divergent' ? -1 : 1));
            setBatchResults(results);
            toast.success(`Auditoria concluída! ${results.length} registros filtrados.`);

        } catch (err) {
            console.error(err);
            toast.error("Erro na auditoria: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                    <Calculator className="w-8 h-8 text-green-400" />
                    Auditoria de Comissões
                </h1>
                <div className="flex gap-2 bg-gray-800 p-1 rounded-lg">
                    <Button
                        variant={mode === 'real' ? 'default' : 'ghost'}
                        onClick={() => setMode('real')}
                        className={mode === 'real' ? 'bg-green-600' : 'text-gray-400'}
                    >
                        Auditoria Individual
                    </Button>
                    <Button
                        variant={mode === 'batch' ? 'default' : 'ghost'}
                        onClick={() => setMode('batch')}
                        className={mode === 'batch' ? 'bg-purple-600' : 'text-gray-400'}
                    >
                        Auditoria em Lote (20)
                    </Button>
                    <Button
                        variant={mode === 'simulate' ? 'default' : 'ghost'}
                        onClick={() => setMode('simulate')}
                        className={mode === 'simulate' ? 'bg-blue-600' : 'text-gray-400'}
                    >
                        Simulador
                    </Button>
                </div>
            </div>

            <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6 space-y-4">
                    {mode === 'batch' ? (
                        <div className="space-y-4">
                            <div className="bg-gray-900 p-4 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div>
                                    <label className="text-gray-400 text-xs uppercase font-bold">Data Inicial</label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="bg-gray-800 border-gray-600 text-white mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs uppercase font-bold">Data Final</label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="bg-gray-800 border-gray-600 text-white mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs uppercase font-bold">Status Pagamento</label>
                                    <select
                                        value={filterStatus}
                                        onChange={e => setFilterStatus(e.target.value)}
                                        className="w-full h-10 px-3 rounded-md border border-gray-600 bg-gray-800 text-white mt-1 focus:outline-none focus:ring-2 focus:ring-purple-600"
                                    >
                                        <option value="all">Todos</option>
                                        <option value="paid">Pago</option>
                                        <option value="processing">Em Processamento</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs uppercase font-bold">ID Afiliado (Opcional)</label>
                                    <Input
                                        placeholder="Ex: user_123..."
                                        value={filterUserId}
                                        onChange={e => setFilterUserId(e.target.value)}
                                        className="bg-gray-800 border-gray-600 text-white mt-1"
                                    />
                                </div>
                            </div>

                            <div className="text-center">
                                <Button
                                    onClick={handleBatchAudit}
                                    disabled={loading}
                                    className="w-full bg-purple-600 hover:bg-purple-700 font-bold py-6 text-lg flex items-center justify-center gap-2"
                                >
                                    <Search className="w-5 h-5" />
                                    {loading ? `Auditando ${batchProgress.current}/${batchProgress.total}...` : "Auditar Período Selecionado"}
                                </Button>
                            </div>

                            {batchResults.length > 0 && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-gray-400">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-700">
                                            <tr>
                                                <th className="px-4 py-3">Data</th>
                                                <th className="px-4 py-3">Venda</th>
                                                <th className="px-4 py-3">Valor</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3 text-right">Simulado</th>
                                                <th className="px-4 py-3 text-right">Real</th>
                                                <th className="px-4 py-3 text-right">Dif</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {batchResults.map((res, i) => (
                                                <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/50">
                                                    <td className="px-4 py-3">{new Date(res.sale.created_date).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 font-mono text-xs">{res.sale.id.slice(0, 8)}...</td>
                                                    <td className="px-4 py-3 text-white">R$ {parseFloat(res.sale.total_amount).toFixed(2)}</td>
                                                    <td className="px-4 py-3">
                                                        {res.status === 'ok' && <span className="text-green-400 font-bold">OK</span>}
                                                        {res.status === 'divergent' && <span className="text-red-400 font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> DIVERGENTE</span>}
                                                        {res.status === 'error' && <span className="text-orange-400">Erro</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-blue-300">{res.simTotal?.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right text-green-300">{res.actTotal?.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right font-bold">{res.diff?.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : mode === 'real' ? (
                        <div className="flex gap-4">
                            <Input
                                placeholder="ID da Venda (ex: 67...)"
                                value={saleId}
                                onChange={e => setSaleId(e.target.value)}
                                className="bg-gray-900 border-gray-600 text-white"
                            />
                            <Button onClick={handleRun} disabled={loading} className="bg-green-600">Auditar</Button>
                        </div>
                    ) : (
                        <div className="flex gap-4">
                            <Input
                                placeholder="Valor (R$)"
                                type="number"
                                value={simAmount}
                                onChange={e => setSimAmount(e.target.value)}
                                className="bg-gray-900 border-gray-600 text-white w-48"
                            />
                            <Input
                                placeholder="ID Âncora"
                                value={simLicenseeId}
                                onChange={e => setSimLicenseeId(e.target.value)}
                                className="bg-gray-900 border-gray-600 text-white flex-1"
                            />
                            <Button onClick={handleRun} disabled={loading} className="bg-blue-600">Simular</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* RESULTADO INDIVIDUAL (Mantido) */}
            {mode !== 'batch' && result && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* SIMULAÇÃO (EXPECTATIVA) */}
                    <Card className="bg-gray-800 border-gray-700 border-l-4 border-l-blue-500">
                        <CardHeader>
                            <CardTitle className="text-blue-400">Simulação (Expectativa)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm text-gray-400 bg-gray-900 p-2 rounded">
                                    <span>Valor Venda: R$ {result.simulation.total_amount}</span>
                                    <span>Âncora: {result.simulation.anchor_user?.name || 'N/A'} ({result.simulation.anchor_user?.max_role || 'Sem cargo'})</span>
                                </div>

                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-700">
                                            <th className="pb-2">Role</th>
                                            <th className="pb-2">Usuário</th>
                                            <th className="pb-2 text-right">%</th>
                                            <th className="pb-2 text-right">R$</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.simulation.assignments.map((a, i) => (
                                            <tr key={i} className="border-b border-gray-700/50">
                                                <td className="py-2 text-gray-300">{a.role}</td>
                                                <td className="py-2 text-white font-medium">{a.user_name}</td>
                                                <td className="py-2 text-right text-gray-400">{a.percent}%</td>
                                                <td className="py-2 text-right text-green-400 font-bold">R$ {a.amount.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-gray-600">
                                            <td colSpan={3} className="pt-2 text-right font-bold text-white">TOTAL:</td>
                                            <td className="pt-2 text-right font-bold text-green-400">R$ {result.simulation.total_distributed.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* REALIDADE (SE HOUVER) */}
                    {result.actual_records ? (
                        <Card className="bg-gray-800 border-gray-700 border-l-4 border-l-green-500">
                            <CardHeader>
                                <CardTitle className="text-green-400">Registros Reais (Banco de Dados)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-700">
                                            <th className="pb-2">Role</th>
                                            <th className="pb-2">Usuário</th>
                                            <th className="pb-2 text-right">%</th>
                                            <th className="pb-2 text-right">R$</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.actual_records.map((r, i) => (
                                            <tr key={i} className="border-b border-gray-700/50">
                                                <td className="py-2 text-gray-300">{r.role}</td>
                                                <td className="py-2 text-white font-medium">{r.user_name}</td>
                                                <td className="py-2 text-right text-gray-400">{r.percent}%</td>
                                                <td className="py-2 text-right text-green-400 font-bold">R$ {r.amount.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-gray-600">
                                            <td colSpan={3} className="pt-2 text-right font-bold text-white">TOTAL:</td>
                                            <td className="pt-2 text-right font-bold text-green-400">
                                                R$ {result.actual_records.reduce((s, x) => s + x.amount, 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-gray-800 border-gray-700 border-dashed">
                            <CardContent className="flex items-center justify-center h-full text-gray-500">
                                <p>Nenhum registro real para comparar (Simulação Pura)</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
