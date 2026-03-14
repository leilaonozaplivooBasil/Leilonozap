import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

const Auction = base44.entities.Auction;
import { UploadCloud, FileSpreadsheet, AlertCircle, TrendingUp, AlertTriangle, Activity, DollarSign, BarChart3, Package, CheckCircle2, ShoppingBag, ArrowLeft } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

function AnaliseDeLotes() {
    const navigate = useNavigate();
    const [loteData, setLoteData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [expandedCategories, setExpandedCategories] = useState(new Set());

    const toggleCategory = (nome) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            next.has(nome) ? next.delete(nome) : next.add(nome);
            return next;
        });
    };

    // Editable Financials
    // Default values suggested by the user
    const [arremateInputValue, setArremateInputValue] = useState('15639.00');
    const [taxaPct, setTaxaPct] = useState(7);
    const [frete, setFrete] = useState(1000.00);
    const [outros, setOutros] = useState(0);

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const parseCurrencyInput = (val) => {
        const numeric = parseFloat(String(val).replace(/[^\d.,-]/g, '').replace(',', '.'));
        return isNaN(numeric) ? 0 : numeric;
    };

    const handleFileUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessing(true);
        setError('');

        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });

                processSheetData(workbook, file.name);
            } catch (err) {
                console.error(err);
                setError('Erro ao processar a planilha. Verifique se é um arquivo Excel válido.');
            } finally {
                setIsProcessing(false);
            }
        };

        reader.readAsBinaryString(file);
    }, []);

    const processSheetData = (rawWorkbookData, filename) => {
        let wmsSheetData = null;
        let localColeta = 'Será informado após Arremate';
        const resumoCategorias = [];
        let referenceMarketValue = null;

        // Tentar ler aba COMPLEMENTO (para capturar o endereço)
        if (rawWorkbookData.Sheets['Complemento']) {
            const compData = XLSX.utils.sheet_to_json(rawWorkbookData.Sheets['Complemento'], { header: 1 });
            const localRow = compData.find(row => row && row[0] && typeof row[0] === 'string' && row[0].includes('Local de Carregamento'));
            if (localRow && localRow[1]) {
                localColeta = String(localRow[1]).trim();
            }
        }

        // Tentar ler aba RESUMO (para montar uma tabela de categorias)
        let resSheetName = rawWorkbookData.SheetNames.find(s => s.toUpperCase().includes('RESUMO'));
        if (resSheetName) {
            const resData = XLSX.utils.sheet_to_json(rawWorkbookData.Sheets[resSheetName], { header: 1 });
            let startRow = resData.findIndex(r => r && typeof r[0] === 'string' && r[0].includes('Rótulos de Linha')) + 1;
            if (startRow > 0) {
                for (let i = startRow; i < resData.length; i++) {
                    const r = resData[i];
                    if (!r || !r[0]) continue;
                    if (r[0].includes('Total Geral')) {
                        const rawVal = r[2];
                        if (typeof rawVal === 'number') referenceMarketValue = rawVal;
                        else if (rawVal) referenceMarketValue = parseFloat(String(rawVal).replace(/[R$\s]/g, '').replace(',', '.'));
                        break;
                    }
                    resumoCategorias.push({ nome: r[0], qtd: r[1] || 0, valor: r[2] || 0 });
                }
            } else {
                // Formato alternativo de resumo
                for (let i = 0; i < Math.min(30, resData.length); i++) {
                    const r = resData[i];
                    if (r && typeof r[3] === 'string' && r[3] !== 'Categoria' && r[4]) {
                        resumoCategorias.push({ nome: r[3], qtd: r[4], valor: r[5] || 0 });
                    }
                    if (r && typeof r[7] === 'string' && r[7].includes('Total Geral')) {
                        if (r[9] != null) {
                            if (typeof r[9] === 'number') referenceMarketValue = r[9];
                            else referenceMarketValue = parseFloat(String(r[9]).replace(/[R$\s]/g, '').replace(',', '.'));
                        }
                    }
                }
            }
        }

        // 1. Achar qual aba tem os produtos finais
        // Procuraremos pela aba que tenha 'GRADE' ou 'CONDIÇÃO' nos cabeçalhos
        let headerRowIndex = -1;
        let headers = [];

        for (const sheetName of rawWorkbookData.SheetNames) {
            const sheet = rawWorkbookData.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            for (let i = 0; i < Math.min(20, data.length); i++) {
                const row = data[i];
                if (row && row.some(cell => typeof cell === 'string' && (cell.toUpperCase().includes('CLASSE') || cell.toUpperCase().includes('GRADE') || cell.toUpperCase().includes('CONDIÇÃO') || cell.toUpperCase().includes('VALOR TOTAL') || cell.toUpperCase().includes('VALOR DE MERCADO')))) {
                    headerRowIndex = i;
                    headers = row;
                    wmsSheetData = data;
                    break;
                }
            }
            if (wmsSheetData) break;
        }

        if (!wmsSheetData || headerRowIndex === -1) {
            setError("Não foi possível identificar os produtos na planilha. Verifique se existe alguma tabela com colunas de 'Grade/Condição' ou 'Valor Total'.");
            return;
        }

        const classCount = { A: 0, B: 0, C: 0, D: 0, E: 0, U: 0 };
        let valorMercadoTotal = 0;
        let totalItemsQtd = 0;

        // Arrays for tracking grouped values
        const gradesData = {
            A: { qtd: 0, valorMarket: 0 },
            B: { qtd: 0, valorMarket: 0 },
            C: { qtd: 0, valorMarket: 0 },
            D: { qtd: 0, valorMarket: 0 },
            E: { qtd: 0, valorMarket: 0 },
            U: { qtd: 0, valorMarket: 0 },
        };

        const normalizedHeaders = headers.map(h => typeof h === 'string' ? h.toUpperCase().trim() : '');

        const getColumnIndex = (keywords) => normalizedHeaders.findIndex(header => keywords.some(kw => header.includes(kw)));

        const colClass = getColumnIndex(['CLASSE', 'CLASSIFICA', 'CLASS', 'CONDIÇÃO', 'GRADE']);
        const colValue = getColumnIndex(['VALOR TOTAL', 'VALOR DE MERCADO', 'VALOR']);
        const colQtd = getColumnIndex(['QUANTIDADE', 'QTD']);

        for (let i = headerRowIndex + 1; i < wmsSheetData.length; i++) {
            const row = wmsSheetData[i];
            if (!row || row.length === 0) continue;

            if (row[0] && typeof row[0] === 'string' && row[0].toUpperCase().includes('TOTAL')) continue;

            const classificacaoRaw = colClass >= 0 ? row[colClass] : null;
            if (!classificacaoRaw) continue;

            let classificacao = String(classificacaoRaw).toUpperCase().trim();
            if (!['A', 'B', 'C', 'D', 'E', 'U'].includes(classificacao)) {
                classificacao = 'U';
            }

            let qtd = 1;
            if (colQtd >= 0 && row[colQtd] != null) {
                qtd = parseInt(row[colQtd]) || 1;
            }

            let valor = 0;
            if (colValue >= 0 && row[colValue] != null) {
                const rawVal = row[colValue];
                if (typeof rawVal === 'number') {
                    valor = rawVal;
                } else if (typeof rawVal === 'string') {
                    const cleanVal = rawVal.replace(/[R$\s]/g, '').replace(',', '.');
                    valor = parseFloat(cleanVal) || 0;
                }
            }

            valorMercadoTotal += valor;
            totalItemsQtd += qtd;
            classCount[classificacao] += qtd;

            gradesData[classificacao].qtd += qtd;
            gradesData[classificacao].valorMarket += valor;
        }

        // Extrair sub-itens por categoria — usando wmsSheetData já validado + detecção dinâmica da coluna de categoria
        const subItemsByCategory = {};
        if (wmsSheetData && headerRowIndex >= 0) {
            // Detectar a coluna de categoria procurando qual coluna de dados contém nomes de categoria conhecidos
            const catNamesSet = new Set(resumoCategorias.map(c => String(c.nome).trim().toLowerCase()));
            let detectedCatCol = -1;
            let detectedDescCol = -1;

            // Tentar encontrar nas 2 linhas de header (headerRowIndex e headerRowIndex-1)
            const headerRows = [
                wmsSheetData[headerRowIndex],
                headerRowIndex > 0 ? wmsSheetData[headerRowIndex - 1] : null
            ].filter(Boolean);

            for (const hRow of headerRows) {
                hRow.forEach((h, i) => {
                    if (typeof h !== 'string') return;
                    const hn = h.toUpperCase().trim();
                    if (hn.includes('CATEGOR') && !hn.includes('SUB') && detectedCatCol < 0) detectedCatCol = i;
                    if ((hn.includes('DESCRI') || hn.includes('ITEM')) && detectedDescCol < 0) detectedDescCol = i;
                });
            }

            // Se não achou no header, detectar pela primeira linha de dados (qual coluna tem nome de categoria)
            if (detectedCatCol < 0 || detectedDescCol < 0) {
                const firstDataRow = wmsSheetData[headerRowIndex + 1];
                if (firstDataRow) {
                    firstDataRow.forEach((cell, i) => {
                        if (!cell || typeof cell !== 'string') return;
                        const cellTrim = cell.trim().toLowerCase();
                        if (detectedCatCol < 0 && catNamesSet.has(cellTrim)) detectedCatCol = i;
                    });
                }
            }

            // Fallbacks baseados na estrutura conhecida do arquivo
            if (detectedCatCol < 0) detectedCatCol = 11;
            if (detectedDescCol < 0) detectedDescCol = 7;

            for (let i = headerRowIndex + 1; i < wmsSheetData.length; i++) {
                const row = wmsSheetData[i];
                if (!row || !row[0]) continue;
                if (typeof row[0] === 'string' && row[0].toUpperCase().includes('TOTAL')) continue;

                const catRaw = row[detectedCatCol] != null ? String(row[detectedCatCol]).trim() : null;
                if (!catRaw) continue;

                const desc = row[detectedDescCol] != null ? String(row[detectedDescCol]).trim() : null;
                if (!desc) continue;

                const qtdVal = colQtd >= 0 && row[colQtd] != null ? (parseInt(row[colQtd]) || 1) : 1;
                const rawValor = colValue >= 0 ? row[colValue] : null;
                const valor = rawValor != null
                    ? (typeof rawValor === 'number' ? rawValor : parseFloat(String(rawValor).replace(/[R$\s]/g, '').replace(',', '.')) || 0)
                    : 0;

                if (!subItemsByCategory[catRaw]) subItemsByCategory[catRaw] = [];
                subItemsByCategory[catRaw].push({ desc, qtd: qtdVal, valor });
            }
        }

        setLoteData({
            nomePlanilha: filename,
            nomeLote: filename.replace(/\.xlsx?$/, ''),
            localColeta,
            resumoCategorias,
            subItemsByCategory,
            quantidadeTotal: totalItemsQtd,
            valorMercadoTotal: referenceMarketValue !== null && referenceMarketValue > 0 ? referenceMarketValue : valorMercadoTotal,
            classCount,
            gradesData
        });

    };


    // --- CALCULATIONS MEMOIZED ---
    const calculations = useMemo(() => {
        if (!loteData) return null;

        const valorArrematado = parseCurrencyInput(arremateInputValue);
        const taxaValor = valorArrematado * (taxaPct / 100);
        const custoTotal = valorArrematado + taxaValor + frete + outros;

        const vm = loteData.valorMercadoTotal;

        // Projections requested: 50%, 60%, 70%
        const projCurto = vm * 0.50;
        const projMedio = vm * 0.60;
        const projLongo = vm * 0.70;

        const lucroEstimado = projMedio - custoTotal;
        const rentabilidade = custoTotal > 0 ? (lucroEstimado / custoTotal) * 100 : 0;

        let score = { label: 'INDEFINIDO', color: 'bg-slate-600', text: 'text-slate-400' };
        if (custoTotal > 0) {
            if (rentabilidade >= 200) score = { label: 'EXCELENTE', color: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', icon: <TrendingUp className="text-emerald-400" /> };
            else if (rentabilidade >= 120) score = { label: 'BOM', color: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', icon: <Activity className="text-blue-400" /> };
            else if (rentabilidade >= 80) score = { label: 'MÉDIO', color: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', icon: <AlertCircle className="text-yellow-400" /> };
            else score = { label: 'ARRISCADO', color: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', icon: <AlertTriangle className="text-red-400" /> };
        }

        const chartData = Object.entries(loteData.classCount)
            .filter(([k, v]) => v > 0)
            .map(([name, value]) => ({ name, value }));

        const COLORS = {
            A: '#10b981', B: '#3b82f6', C: '#eab308',
            D: '#f97316', E: '#ef4444', U: '#64748b'
        };

        // Custom metrics A+B, A+B+C, A+B+C+D
        const g = loteData.gradesData;

        const qtdA = g.A.qtd;
        const valA = g.A.valorMarket;
        const tmA = qtdA > 0 ? valA / qtdA : 0;

        const qtdAB = g.A.qtd + g.B.qtd;
        const valAB = g.A.valorMarket + g.B.valorMarket;
        const tmAB = qtdAB > 0 ? valAB / qtdAB : 0;

        const qtdABC = qtdAB + g.C.qtd;
        const valABC = valAB + g.C.valorMarket;
        const tmABC = qtdABC > 0 ? valABC / qtdABC : 0;

        const qtdABCD = qtdABC + g.D.qtd;
        const valABCD = valABC + g.D.valorMarket;
        const tmABCD = qtdABCD > 0 ? valABCD / qtdABCD : 0;

        const qtdALL = loteData.quantidadeTotal;
        const valALL = loteData.valorMercadoTotal;
        const tmALL = qtdALL > 0 ? valALL / qtdALL : 0;

        return {
            valorArrematado, taxaValor, custoTotal,
            projCurto, projMedio, projLongo,
            lucroEstimado, rentabilidade, score,
            chartData, COLORS,
            tmA, tmAB, tmABC, tmABCD, tmALL,
            valA, valAB, valABC, valABCD, valALL,
            qtdA, qtdAB, qtdABC, qtdABCD, qtdALL
        };
    }, [loteData, arremateInputValue, taxaPct, frete, outros]);


    return (
        <div className="min-h-screen bg-[#0d1117] text-slate-200 p-4 font-sans selection:bg-blue-500/30">
            <div className="max-w-7xl mx-auto">
                <header className="mb-10 text-center flex flex-col items-center">
                    <button
                        onClick={() => navigate(createPageUrl('SistemaDeArremate'))}
                        className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                    >
                        <ArrowLeft size={14} /> Central de Lotes & Investimentos
                    </button>
                    <div className="inline-flex items-center gap-3 mb-3 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 shadow-sm">
                        <BarChart3 size={18} className="text-blue-400" />
                        <span className="text-sm font-semibold tracking-wide text-slate-300">AVALIADOR INTELIGENTE DE LEILÕES</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-blue-300 via-indigo-400 to-purple-500 mb-4 pb-1">
                        Análise Estratégica
                    </h1>
                </header>

                {!loteData ? (
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-12 text-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none group-hover:bg-blue-500/20 transition-all duration-700"></div>

                        <div className="max-w-md mx-auto relative z-10">
                            <div className="w-24 h-24 bg-[#0d1117] border border-[#30363d] text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner rotate-3 group-hover:rotate-6 transition-transform">
                                <UploadCloud size={40} className="drop-shadow-lg" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-white">Importar Lote</h3>
                            <p className="text-slate-400 mb-8 max-w-[280px] mx-auto text-sm leading-relaxed">
                                Carregue a planilha Excel do lote para extrairmos quantidades, classificação e valores totais.
                            </p>

                            <label className="relative overflow-hidden cursor-pointer flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 hover:from-blue-500 to-indigo-600 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 w-full hover:-translate-y-0.5">
                                <FileSpreadsheet size={20} />
                                <span>Selecionar Arquivo Excel</span>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    onChange={handleFileUpload}
                                    disabled={isProcessing}
                                />
                            </label>

                            {isProcessing && (
                                <div className="mt-8 flex items-center justify-center text-blue-400 gap-3">
                                    <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin shadow-lg"></div>
                                    <span className="font-medium">Extraindo dados...</span>
                                </div>
                            )}

                            {error && (
                                <div className="mt-6 p-4 bg-red-950/40 border border-red-900/50 text-red-400 rounded-xl flex items-center gap-3 text-sm text-left shadow-lg">
                                    <AlertCircle size={20} className="shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-forwards">

                        {/* HEADER DASHBOARD */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl">

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                                    <Package className="text-blue-500" size={24} />
                                    {loteData.nomeLote}
                                </h2>
                                <p className="text-slate-400 text-sm flex items-center gap-2 mb-2">
                                    <CheckCircle2 size={14} className="text-emerald-500" /> Planilha importada e processada com sucesso
                                </p>
                                {loteData.localColeta && (
                                    <div className="inline-block mt-1 px-3 py-1 bg-blue-900/30 border border-blue-800/50 rounded-md text-xs text-blue-300 font-medium">
                                        📍 Retirada: {loteData.localColeta}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => navigate(createPageUrl('GestaoLotes'))}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                                >
                                    <ShoppingBag size={15} /> Publicar no Marketplace
                                </button>
                                <button
                                    onClick={() => setLoteData(null)}
                                    className="px-5 py-2.5 bg-[#0d1117] border border-[#30363d] hover:border-slate-500 hover:bg-slate-800 rounded-xl text-sm font-semibold transition-all shadow-sm"
                                >
                                    Importar Outro Lote
                                </button>
                            </div>
                        </div>

                        {/* NOTIFICATION SCORE BANNER */}
                        <div className={`p-4 rounded-2xl border ${calculations.score.border} ${calculations.score.color} flex items-center gap-4 shadow-lg`}>
                            <div className="p-3 bg-black/20 rounded-xl backdrop-blur-sm">
                                {calculations.score.icon}
                            </div>
                            <div>
                                <h4 className={`font-bold tracking-tight text-lg ${calculations.score.text}`}>SCORE: {calculations.score.label}</h4>
                                <p className="text-slate-300 text-sm">Rentabilidade projetada em cenário médio (60%): <span className="font-bold text-white">{calculations.rentabilidade.toFixed(1)}%</span></p>
                            </div>
                        </div>

                        {/* MAIN KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                            {[
                                { label: "Total de Itens (Qtd)", val: loteData.quantidadeTotal, prefix: "", color: "border-l-blue-500" },
                                { label: "Valor de Mercado Total", val: formatCurrency(loteData.valorMercadoTotal), color: "border-l-emerald-500" },
                                { label: "Ticket Avaliado (Mercado)", val: formatCurrency(loteData.quantidadeTotal ? loteData.valorMercadoTotal / loteData.quantidadeTotal : 0), color: "border-l-indigo-500" },
                                { label: "Custo Total Lote", val: formatCurrency(calculations.custoTotal), color: "border-l-amber-500" },
                                { label: "Custo Médio p/ Unidade", val: formatCurrency(loteData.quantidadeTotal ? calculations.custoTotal / loteData.quantidadeTotal : 0), color: "border-l-red-500", highlight: true },
                            ].map((kpi, i) => (
                                <div key={i} className={`bg-[#161b22] p-6 rounded-2xl border border-[#30363d] border-l-4 ${kpi.color} shadow-lg relative overflow-hidden group`}>
                                    <div className="relative z-10">
                                        <p className="text-slate-400 text-xs font-bold mb-1 tracking-wider uppercase">{kpi.label}</p>
                                        <p className={`text-3xl font-black tracking-tight ${kpi.highlight ? 'text-white' : 'text-slate-200'}`}>{kpi.val}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* MAIN CONTENT PANELS */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                            {/* COL 1: FINANCIAL INPUTS & RENTABILIDADE */}
                            <div className="space-y-6 xl:col-span-1">
                                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
                                    <div className="p-5 border-b border-[#30363d] bg-slate-800/20">
                                        <h3 className="font-bold text-white flex items-center gap-2">
                                            <DollarSign size={18} className="text-amber-400" />
                                            Cenário Financeiro e Custos
                                        </h3>
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Valor Arremato</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">R$</span>
                                                <input
                                                    type="number"
                                                    value={arremateInputValue}
                                                    onChange={(e) => setArremateInputValue(e.target.value)}
                                                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow font-medium"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Taxa de Leilão</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={taxaPct}
                                                        onChange={(e) => setTaxaPct(Number(e.target.value))}
                                                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-3 pr-8 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">= {formatCurrency(calculations.taxaValor)}</p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Frete (BRL)</label>
                                                <input
                                                    type="number"
                                                    value={frete || ''}
                                                    onChange={(e) => setFrete(Number(e.target.value))}
                                                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-blue-500 transition-shadow"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Outros Custos Opcionais</label>
                                            <input
                                                type="number"
                                                value={outros || ''}
                                                onChange={(e) => setOutros(Number(e.target.value))}
                                                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-blue-500 transition-shadow"
                                            />
                                        </div>

                                        <div className="pt-4 mt-2 border-t border-[#30363d]">
                                            <div className="flex justify-between items-center bg-[#0d1117] p-4 rounded-xl border border-[#30363d]">
                                                <span className="font-semibold text-slate-300">CUSTO DO LOTE:</span>
                                                <span className="text-xl font-bold text-amber-400">{formatCurrency(calculations.custoTotal)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* COL 2 & 3: PROJEÇÕES & QUALIDADE */}
                            <div className="space-y-6 col-span-1 xl:col-span-2">
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                                    {/* PROJECTIONS CARDS */}
                                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl p-6">
                                        <h3 className="font-bold text-white mb-5 uppercase tracking-wider text-sm flex items-center gap-2">
                                            <TrendingUp size={16} className="text-indigo-400" />
                                            Cenários de Venda da Grade Útil
                                        </h3>

                                        <div className="space-y-3">
                                            {[
                                                { title: "Venda (50% do Valor Mercado)", val: calculations.projCurto, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
                                                { title: "Venda (60% do Valor Mercado)", val: calculations.projMedio, color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
                                                { title: "Venda (70% do Valor Mercado)", val: calculations.projLongo, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
                                            ].map((item, idx) => (
                                                <div key={idx} className={`flex justify-between items-center p-3 sm:p-4 rounded-xl border ${item.color}`}>
                                                    <div>
                                                        <p className="font-semibold text-sm sm:text-base">{item.title}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-lg sm:text-xl">{formatCurrency(item.val)}</p>
                                                        <p className="text-xs mt-0.5 font-medium flex items-center justify-end gap-1">
                                                            <span>Lucro Bruto:</span>
                                                            <span>{formatCurrency(item.val - calculations.custoTotal)}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ADVANCED METRICS TICKET MEDIO */}
                                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl p-6 flex flex-col">
                                        <h3 className="font-bold text-white mb-2 uppercase tracking-wider text-sm flex items-center gap-2">
                                            <Activity size={16} className="text-blue-400" />
                                            Análise de Ticket Médio por Grade
                                        </h3>
                                        <p className="text-xs text-slate-400 mb-5">Valor médio dos produtos agrupados por qualidade superior.</p>

                                        <div className="space-y-3 flex-1 flex flex-col justify-center">
                                            {[
                                                { label: "Somente Grupo A", desc: `Equivale a ${calculations.qtdA} produtos originais/intactos`, tm: calculations.tmA, val: calculations.valA, color: "border-l-blue-400" },
                                                { label: "Grupo A + B", desc: `Equivale a ${calculations.qtdAB} produtos vitrine`, tm: calculations.tmAB, val: calculations.valAB, color: "border-l-[#10b981]" },
                                                { label: "Grupo A + B + C", desc: `Equivale a ${calculations.qtdABC} produtos úteis`, tm: calculations.tmABC, val: calculations.valABC, color: "border-l-[#eab308]" },
                                                { label: "Grupo A + B + C + D", desc: `Equivale a ${calculations.qtdABCD} produtos escoáveis`, tm: calculations.tmABCD, val: calculations.valABCD, color: "border-l-[#f97316]" },
                                                { label: "Todos os Grupos (A+B+C+D+E+U)", desc: `Equivale ao lote inteiro (${calculations.qtdALL} produtos)`, tm: calculations.tmALL, val: calculations.valALL, color: "border-l-slate-400" },
                                            ].map((tmData, idx) => (
                                                <div key={idx} className={`bg-[#0d1117] border border-[#30363d] border-l-4 ${tmData.color} rounded-lg p-3 flex justify-between items-center`}>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-200">{tmData.label}</p>
                                                        <p className="text-xs text-slate-500">{tmData.desc}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-emerald-400">{formatCurrency(tmData.tm)} <span className="text-xs text-slate-500 font-normal">médio</span></p>
                                                        <p className="text-[10px] text-slate-400 mt-1 uppercase">Apurado: {formatCurrency(tmData.val)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>

                                {/* QUALITY DISTRIBUTION BARCHART / LIST */}
                                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl p-6">
                                    <h3 className="font-bold text-white mb-5 uppercase tracking-wider text-sm">Distribuição de Qualidade (QTD Itens x Grade)</h3>
                                    <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                                        <div className="w-56 h-56 flex-shrink-0">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={calculations.chartData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={70}
                                                        outerRadius={95}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {calculations.chartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={calculations.COLORS[entry.name]} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip
                                                        contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', color: '#fff' }}
                                                        itemStyle={{ color: '#fff' }}
                                                        formatter={(value) => [`${value} itens`, 'Quantidade']}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                                            {calculations.chartData.map((d, i) => (
                                                <div key={i} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex flex-col justify-center">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: calculations.COLORS[d.name] }}></div>
                                                            <span className="text-sm font-bold text-slate-300">Grade {d.name}</span>
                                                        </div>
                                                        <span className="font-black text-white">{d.value}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RESUMO CATEGORIAS */}
                            {loteData.resumoCategorias && loteData.resumoCategorias.length > 0 && (
                                <div className="xl:col-span-3">
                                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
                                        <div className="p-5 border-b border-[#30363d] bg-slate-800/20">
                                            <h3 className="font-bold text-white uppercase tracking-wider text-sm">Distribuição Departamental (Resumo Oficial)</h3>
                                            <p className="text-xs text-slate-400 mt-1">Visão macrostática informada pela aba raiz do leilão.</p>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-sm">
                                                <thead>
                                                    <tr className="bg-[#0d1117] border-b border-[#30363d] text-slate-400 uppercase tracking-wider">
                                                        <th className="px-6 py-4 font-semibold text-xs">Categoria / Departamento</th>
                                                        <th className="px-6 py-4 font-semibold text-xs border-l border-[#30363d] w-32 text-center">Quantidade</th>
                                                        <th className="px-6 py-4 font-semibold text-xs border-l border-[#30363d] w-48 text-right">Valor de Avaliação</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                   {loteData.resumoCategorias.map((cat, i) => {
                                                       const subs = loteData.subItemsByCategory?.[cat.nome] || [];
                                                       const isOpen = expandedCategories.has(cat.nome);
                                                       return (
                                                           <>
                                                               <tr
                                                                   key={i}
                                                                   onClick={() => subs.length > 0 && toggleCategory(cat.nome)}
                                                                   className={`border-b border-[#30363d]/50 transition-colors ${subs.length > 0 ? 'cursor-pointer hover:bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
                                                               >
                                                                   <td className="px-6 py-4 font-medium text-slate-300 flex items-center gap-2">
                                                                       {subs.length > 0 && (
                                                                           <span className={`text-slate-500 transition-transform inline-block ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                                                                       )}
                                                                       {cat.nome}
                                                                       {subs.length > 0 && <span className="text-xs text-slate-600 ml-1">({subs.length} itens)</span>}
                                                                   </td>
                                                                   <td className="px-6 py-4 border-l border-[#30363d]/50 text-center text-slate-400">{cat.qtd} un</td>
                                                                   <td className="px-6 py-4 border-l border-[#30363d]/50 text-right font-bold text-emerald-400">{formatCurrency(cat.valor)}</td>
                                                               </tr>
                                                               {isOpen && subs.map((sub, si) => (
                                                                   <tr key={`sub-${i}-${si}`} className="border-b border-[#30363d]/30 bg-[#0d1117]/60">
                                                                       <td className="pl-12 pr-6 py-2.5 text-slate-400 text-sm">
                                                                           <span className="text-slate-600 mr-2">└</span>{sub.desc}
                                                                       </td>
                                                                       <td className="px-6 py-2.5 border-l border-[#30363d]/30 text-center text-slate-500 text-sm">{sub.qtd} un</td>
                                                                       <td className="px-6 py-2.5 border-l border-[#30363d]/30 text-right text-emerald-600 text-sm font-medium">{formatCurrency(sub.valor)}</td>
                                                                   </tr>
                                                               ))}
                                                           </>
                                                       );
                                                   })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AnaliseDeLotes;