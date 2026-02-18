
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calculator, AlertTriangle } from 'lucide-react';
import { base44 as base44Client } from '@/api/base44Client';
import { toast } from 'sonner';
import { calculateExpectedCommission } from '@/utils/CommissionAuditRules';

export default function CommissionPilot() {
    // ESTADOS GERAIS
    const [mode, setMode] = useState('real'); // 'real' | 'simulate' | 'batch'
    const [loading, setLoading] = useState(false);

    // ESTADOS SIMULAÇÃO/REAL
    const [saleId, setSaleId] = useState('');
    const [simAmount, setSimAmount] = useState('');
    const [simLicenseeId, setSimLicenseeId] = useState('');
    const [result, setResult] = useState(null);

    // ESTADOS BATCH / SNAPSHOT
    const [auditMode, setAuditMode] = useState('api'); // 'api' | 'file'
    const [snapshotData, setSnapshotData] = useState(null);
    const [batchResults, setBatchResults] = useState([]);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

    // FILTROS
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterUserId, setFilterUserId] = useState('');

    // --- FUNÇÕES ---

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

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                if (json.data && json.data.users) {
                    setSnapshotData(json.data);
                    toast.success("Snapshot carregado com sucesso!");
                } else if (json.users && json.sales) {
                    setSnapshotData(json);
                    toast.success("Snapshot carregado com sucesso!");
                } else {
                    throw new Error("Formato inválido. Use o JSON do /audit-snapshot");
                }
                setAuditMode('file');
            } catch (err) {
                console.error(err);
                toast.error("Erro ao ler JSON: " + err.message);
            }
        };
        reader.readAsText(file);
    };

    const handleBatchAudit = async () => {
        setLoading(true);
        setBatchResults([]);
        setBatchProgress({ current: 0, total: 0 });
        try {
            let sales, users, commissions, products;

            if (auditMode === 'file') {
                if (!snapshotData) {
                    toast.error("Carregue o arquivo Snapshot primeiro.");
                    setLoading(false);
                    return;
                }
                toast.info("Modo Offline: Usando Snapshot Local");
                sales = snapshotData.sales;
                users = snapshotData.users;
                commissions = snapshotData.commissions;
                products = snapshotData.products || [];
            } else {
                toast.info(`Baixando dados da API... (${startDate} a ${endDate})`);
                const auditResp = await base44Client.functions.invoke('exportAuditData', {
                    start_date: startDate,
                    end_date: endDate,
                    user_id: filterUserId || undefined
                });

                if (!auditResp.data || !auditResp.data.success) {
                    throw new Error(auditResp.data?.error || "Falha ao exportar dados");
                }
                const data = auditResp.data.data;
                sales = data.sales;
                users = data.users;
                commissions = data.commissions;
            }

            // Filtro de Data Local (para Modo Arquivo)
            if (auditMode === 'file') {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                sales = sales.filter(s => {
                    const d = new Date(s.created_date);
                    return d >= start && d <= end;
                });
            }

            const totalSales = sales.length;
            toast.info(`Analisando ${totalSales} vendas...`);
            setBatchProgress({ current: 0, total: totalSales });

            const results = [];
            let processed = 0;

            // Processamento em chunks para não travar a UI
            for (const sale of sales) {
                processed++;
                if (processed % 10 === 0) {
                    setBatchProgress({ current: processed, total: totalSales });
                    await new Promise(r => setTimeout(r, 0));
                }

                try {
                    const expected = calculateExpectedCommission(sale, users);
                    const actualCommissions = commissions.filter(c => c.sale_id === sale.id);

                    // Filtro de Status
                    let statusMatch = true;
                    if (filterStatus !== 'all') {
                        const hasPaid = actualCommissions.some(c => c.status === 'paid' || c.paid_at);
                        if (filterStatus === 'paid' && !hasPaid) statusMatch = false;
                        if (filterStatus === 'processing' && hasPaid) statusMatch = false;
                    }
                    if (!statusMatch) continue;

                    const actualTotal = actualCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);
                    const simTotal = expected.total_distributed;
                    const diff = Math.abs(simTotal - actualTotal);
                    const isDivergent = diff > 0.05;

                    if (isDivergent || results.length < 100) {
                        results.push({
                            sale,
                            status: isDivergent ? 'divergent' : 'ok',
                            simTotal,
                            actTotal: actualTotal,
                            diff,
                            trace: expected.trace,
                            commissions_status: actualCommissions.map(c => c.status).join(', ') || 'ND'
                        });
                    }
                } catch (e) {
                    results.push({ sale, status: 'error', error: e.message });
                }
            }

            results.sort((a, b) => (a.status === 'divergent' ? -1 : 1));
            setBatchResults(results);
            toast.success(`Concluído! ${results.length} registros listados.`);

        } catch (err) {
            console.error(err);
            toast.error("Erro: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                    <Calculator className="w-8 h-8 text-green-400" />
                    Auditoria de Comissões
                </h1>
                <div className="flex gap-2 bg-gray-800 p-1 rounded-lg overflow-x-auto">
                    <Button
                        variant={mode === 'real' ? 'default' : 'ghost'}
                        onClick={() => setMode('real')}
                        className={mode === 'real' ? 'bg-green-600' : 'text-gray-400'}
                    >
                        Individual
                    </Button>
                    <Button
                        variant={mode === 'batch' ? 'default' : 'ghost'}
                        onClick={() => setMode('batch')}
                        className={mode === 'batch' ? 'bg-purple-600' : 'text-gray-400'}
                    >
                        Em Lote (Batch)
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
                <CardHeader>
                    <CardTitle className="text-white">
                        {mode === 'batch' ? 'Auditoria em Massa & Offline' :
                            mode === 'real' ? 'Consulta Individual (Online)' : 'Simulador de Cenários'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {mode === 'batch' ? (
                        <div className="space-y-6">
                            {/* CONTROLES BATCH */}
                            <div className="bg-gray-900 p-4 rounded-lg space-y-4">
                                <div className="flex flex-wrap gap-4 justify-center mb-4 border-b border-gray-800 pb-4">
                                    <Button
                                        variant={auditMode === 'api' ? "default" : "outline"}
                                        onClick={() => setAuditMode('api')}
                                        className={auditMode === 'api' ? "bg-blue-600" : "text-gray-400 border-gray-600"}
                                    >
                                        ☁️ Online (API)
                                    </Button>
                                    <Button
                                        variant={auditMode === 'file' ? "default" : "outline"}
                                        onClick={() => setAuditMode('file')}
                                        className={auditMode === 'file' ? "bg-green-600" : "text-gray-400 border-gray-600"}
                                    >
                                        📂 Offline (Snapshot)
                                    </Button>
                                </div>

                                {auditMode === 'file' && (
                                    <div className="bg-gray-800 p-4 rounded border border-dashed border-gray-600 animate-in fade-in">
                                        <label className="text-green-400 mb-2 block font-semibold text-sm">
                                            Passo 1: Carregue o arquivo JSON baixado em /audit-snapshot
                                        </label>
                                        <Input
                                            type="file"
                                            accept=".json"
                                            onChange={handleFileUpload}
                                            className="text-white bg-gray-900 border-gray-700"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                                        <label className="text-gray-400 text-xs uppercase font-bold">Status</label>
                                        <select
                                            value={filterStatus}
                                            onChange={e => setFilterStatus(e.target.value)}
                                            className="w-full h-10 px-3 rounded-md border border-gray-600 bg-gray-800 text-white mt-1 focus:outline-none focus:ring-2 focus:ring-purple-600"
                                        >
                                            <option value="all">Todos</option>
                                            <option value="paid">Pago</option>
                                            <option value="processing">Processando</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs uppercase font-bold">Afiliado (ID)</label>
                                        <Input
                                            placeholder="Opcional..."
                                            value={filterUserId}
                                            onChange={e => setFilterUserId(e.target.value)}
                                            className="bg-gray-800 border-gray-600 text-white mt-1"
                                        />
                                    </div>
                                </div>

                                <Button
                                    onClick={handleBatchAudit}
                                    disabled={loading || (auditMode === 'file' && !snapshotData)}
                                    className={`w-full font-bold py-6 text-lg flex items-center justify-center gap-2 ${auditMode === 'file' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'
                                        }`}
                                >
                                    <Search className="w-5 h-5" />
                                    {loading
                                        ? `Auditando ${batchProgress.current}/${batchProgress.total}...`
                                        : auditMode === 'file' ? "Executar Auditoria Offline" : "Executar Auditoria Online"}
                                </Button>
                            </div>

                            {/* RESULTADOS BATCH */}
                            {batchResults.length > 0 && (
                                <div className="overflow-x-auto rounded-lg border border-gray-700">
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
                                                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{res.sale.id.slice(0, 8)}...</td>
                                                    <td className="px-4 py-3 text-white">R$ {parseFloat(res.sale.total_amount).toFixed(2)}</td>
                                                    <td className="px-4 py-3">
                                                        {res.status === 'ok' && <span className="text-green-400 font-bold text-xs bg-green-400/10 px-2 py-1 rounded">OK</span>}
                                                        {res.status === 'divergent' && <span className="text-red-400 font-bold text-xs bg-red-400/10 px-2 py-1 rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> DIVERGENTE</span>}
                                                        {res.status === 'error' && <span className="text-orange-400 text-xs">Erro</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-blue-300">{res.simTotal?.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right text-green-300">{res.actTotal?.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-white">{res.diff?.toFixed(2)}</td>
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
                                placeholder="ID Âncora (ex: user_123)"
                                value={simLicenseeId}
                                onChange={e => setSimLicenseeId(e.target.value)}
                                className="bg-gray-900 border-gray-600 text-white flex-1"
                            />
                            <Button onClick={handleRun} disabled={loading} className="bg-blue-600">Simular</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* RESULTADO INDIVIDUAL (Card Detalhado) */}
            {mode !== 'batch' && result && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    {/* SIMULAÇÃO */}
                    <Card className="bg-gray-800 border-gray-700 border-l-4 border-l-blue-500">
                        <CardHeader>
                            <CardTitle className="text-blue-400 text-lg">Simulação (Expectativa)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm text-gray-400 bg-gray-900 p-3 rounded">
                                    <span>Venda: <span className="text-white">R$ {result.simulation.total_amount}</span></span>
                                    <span>Âncora: <span className="text-white">{result.simulation.anchor_user?.name || 'N/A'}</span></span>
                                </div>

                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-700">
                                            <th className="pb-2 pl-2">Nível/Role</th>
                                            <th className="pb-2">Usuário</th>
                                            <th className="pb-2 text-right">R$</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.simulation.assignments.map((a, i) => (
                                            <tr key={i} className="border-b border-gray-700/50">
                                                <td className="py-2 pl-2 text-gray-300">{a.role} <span className="text-xs text-gray-600">({a.percent}%)</span></td>
                                                <td className="py-2 text-white font-medium">{a.user_name}</td>
                                                <td className="py-2 text-right text-green-400 font-bold">R$ {a.amount.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-gray-600 bg-gray-900/50">
                                            <td colSpan={2} className="py-2 pl-2 text-right font-bold text-white">TOTAL DISTRIBUÍDO:</td>
                                            <td className="py-2 text-right font-bold text-blue-400">R$ {result.simulation.total_distributed.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* REALIDADE */}
                    {result.actual_records ? (
                        <Card className="bg-gray-800 border-gray-700 border-l-4 border-l-green-500">
                            <CardHeader>
                                <CardTitle className="text-green-400 text-lg">Registros no Banco de Dados</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-700">
                                            <th className="pb-2 pl-2">Role</th>
                                            <th className="pb-2">Usuário</th>
                                            <th className="pb-2 text-right">R$</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.actual_records.map((r, i) => (
                                            <tr key={i} className="border-b border-gray-700/50">
                                                <td className="py-2 pl-2 text-gray-300">{r.role} <span className="text-xs text-gray-600">({r.percent}%)</span></td>
                                                <td className="py-2 text-white font-medium">{r.user_name}</td>
                                                <td className="py-2 text-right text-green-400 font-bold">R$ {r.amount.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-gray-600 bg-gray-900/50">
                                            <td colSpan={2} className="py-2 pl-2 text-right font-bold text-white">TOTAL PAGO:</td>
                                            <td className="py-2 text-right font-bold text-green-400">
                                                R$ {result.actual_records.reduce((s, x) => s + x.amount, 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-gray-800 border-gray-700 border-dashed border-2 flex items-center justify-center">
                            <CardContent className="text-center p-10">
                                <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg">Nenhum registro real encontrado.</p>
                                <p className="text-gray-600 text-sm">Esta venda ainda não gerou comissões ou é apenas uma simulação.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
