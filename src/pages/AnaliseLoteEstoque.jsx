import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { UploadCloud, FileSpreadsheet, AlertCircle, TrendingUp, AlertTriangle, Activity, DollarSign, Package, CheckCircle2, ArrowLeft, Eye, Warehouse } from 'lucide-react';
import GradeItemsModal from '../components/lotes/GradeItemsModal';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

function AnaliseLoteEstoque() {
    const navigate = useNavigate();
    const [lotesImportados, setLotesImportados] = useState([]);
    const [loteAtual, setLoteAtual] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    const [gradeModal, setGradeModal] = useState(null);
    const [modeloPlanilha, setModeloPlanilha] = useState('mercadolivre');

    const [arremateInputValue, setArremateInputValue] = useState('');
    const [taxaPct, setTaxaPct] = useState(7);
    const [frete, setFrete] = useState(1000);
    const [outros, setOutros] = useState(0);

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const parseCurrencyInput = (val) => {
        const numeric = parseFloat(String(val).replace(/[^\d.,-]/g, '').replace(',', '.'));
        return isNaN(numeric) ? 0 : numeric;
    };

    const toggleCategory = (nome) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            next.has(nome) ? next.delete(nome) : next.add(nome);
            return next;
        });
    };

    // Parser Casa e Vídeo
    const processSheetDataCasaEVideo = (workbook, filename) => {
        const sheetName = workbook.SheetNames[0];
        const allRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
        if (allRows.length === 0) { setError('Planilha Casa e Vídeo vazia ou sem dados.'); return; }

        const normalize = (s) => String(s || '').toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let headerIdx = -1;
        let headers = [];
        for (let i = 0; i < Math.min(10, allRows.length); i++) {
            const normed = allRows[i].map(normalize);
            if (normed.some(h => h.includes('DESCRI') || h.includes('QTD') || h.includes('MATERIAL'))) {
                headerIdx = i; headers = normed; break;
            }
        }
        if (headerIdx === -1) { setError('Planilha Casa e Vídeo: cabeçalho não encontrado.'); return; }

        const colDesc  = headers.findIndex(h => h.includes('DESCRI'));
        const colQtd   = headers.findIndex(h => h.includes('QTD') || h.includes('QUANTIDADE'));
        const colValor = headers.findIndex(h => h.includes('VALOR') || h.includes('VENDA'));
        const colCat   = headers.findIndex(h => h.includes('CATEGOR'));

        if (colDesc === -1 || colValor === -1) { setError(`Coluna DESCRIÇÃO ou VALOR não encontrada. Cabeçalhos: ${headers.join(', ')}`); return; }

        const resumoCategorias = {};
        const subItemsByCategory = {};
        const rawItemsByGrade = [];
        let valorMercadoTotal = 0;
        let totalItemsQtd = 0;

        for (let i = headerIdx + 1; i < allRows.length; i++) {
            const row = allRows[i];
            if (!row || row.every(c => c === '' || c == null)) continue;
            const desc = String(row[colDesc] || '').trim();
            if (!desc) continue;
            const qtd = colQtd >= 0 ? (parseInt(row[colQtd]) || 1) : 1;
            const rawVal = colValor >= 0 ? row[colValor] : 0;
            const valor = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[R$\s]/g, '').replace(',', '.')) || 0;
            const cat = colCat >= 0 ? String(row[colCat] || 'SEM CATEGORIA').trim() : 'SEM CATEGORIA';

            valorMercadoTotal += valor;
            totalItemsQtd += qtd;
            rawItemsByGrade.push({ grade: 'A', desc, qtd, valor });
            if (!resumoCategorias[cat]) resumoCategorias[cat] = { nome: cat, qtd: 0, valor: 0 };
            resumoCategorias[cat].qtd += qtd;
            resumoCategorias[cat].valor += valor;
            if (!subItemsByCategory[cat]) subItemsByCategory[cat] = [];
            subItemsByCategory[cat].push({ desc, qtd, valor });
        }

        const gradesData = {
            A: { qtd: totalItemsQtd, valorMarket: valorMercadoTotal },
            B: { qtd: 0, valorMarket: 0 }, C: { qtd: 0, valorMarket: 0 },
            D: { qtd: 0, valorMarket: 0 }, E: { qtd: 0, valorMarket: 0 }, U: { qtd: 0, valorMarket: 0 },
        };

        const novoLote = {
            id: Date.now(), nomePlanilha: filename,
            nomeLote: filename.replace(/\.xlsx?$|\.csv$/i, ''),
            localColeta: 'Será informado após Arremate',
            resumoCategorias: Object.values(resumoCategorias),
            subItemsByCategory, quantidadeTotal: totalItemsQtd, valorMercadoTotal,
            classCount: { A: totalItemsQtd, B: 0, C: 0, D: 0, E: 0, U: 0 },
            gradesData, rawItemsByGrade, origem: 'Casa e Vídeo'
        };
        setLotesImportados(prev => [...prev, novoLote]);
        setLoteAtual(novoLote);
    };

    // Parser Mercado Livre
    const processSheetData = (rawWorkbookData, filename) => {
        let wmsSheetData = null;
        let localColeta = 'Será informado após Arremate';
        const resumoCategorias = [];
        let referenceMarketValue = null;

        if (rawWorkbookData.Sheets['Complemento']) {
            const compData = XLSX.utils.sheet_to_json(rawWorkbookData.Sheets['Complemento'], { header: 1 });
            const localRow = compData.find(row => row && row[0] && typeof row[0] === 'string' && row[0].includes('Local de Carregamento'));
            if (localRow && localRow[1]) localColeta = String(localRow[1]).trim();
        }

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
                for (let i = 0; i < Math.min(30, resData.length); i++) {
                    const r = resData[i];
                    if (r && typeof r[3] === 'string' && r[3] !== 'Categoria' && r[4]) resumoCategorias.push({ nome: r[3], qtd: r[4], valor: r[5] || 0 });
                    if (r && typeof r[7] === 'string' && r[7].includes('Total Geral')) {
                        if (r[9] != null) {
                            if (typeof r[9] === 'number') referenceMarketValue = r[9];
                            else referenceMarketValue = parseFloat(String(r[9]).replace(/[R$\s]/g, '').replace(',', '.'));
                        }
                    }
                }
            }
        }

        let headerRowIndex = -1;
        let headers = [];
        for (const sheetName of rawWorkbookData.SheetNames) {
            const sheet = rawWorkbookData.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            for (let i = 0; i < Math.min(20, data.length); i++) {
                const row = data[i];
                if (row && row.some(cell => typeof cell === 'string' && (cell.toUpperCase().includes('CLASSE') || cell.toUpperCase().includes('GRADE') || cell.toUpperCase().includes('CONDIÇÃO') || cell.toUpperCase().includes('VALOR TOTAL') || cell.toUpperCase().includes('VALOR DE MERCADO')))) {
                    headerRowIndex = i; headers = row; wmsSheetData = data; break;
                }
            }
            if (wmsSheetData) break;
        }

        if (!wmsSheetData || headerRowIndex === -1) {
            setError("Não foi possível identificar os produtos. Verifique se há colunas de 'Grade/Condição' ou 'Valor Total'.");
            return;
        }

        const classCount = { A: 0, B: 0, C: 0, D: 0, E: 0, U: 0 };
        let valorMercadoTotal = 0;
        let totalItemsQtd = 0;
        const rawItemsByGrade = [];
        const gradesData = { A: { qtd: 0, valorMarket: 0 }, B: { qtd: 0, valorMarket: 0 }, C: { qtd: 0, valorMarket: 0 }, D: { qtd: 0, valorMarket: 0 }, E: { qtd: 0, valorMarket: 0 }, U: { qtd: 0, valorMarket: 0 } };
        const normalizedHeaders = headers.map(h => typeof h === 'string' ? h.toUpperCase().trim() : '');
        const getColumnIndex = (keywords) => normalizedHeaders.findIndex(header => keywords.some(kw => header.includes(kw)));
        const colClass = getColumnIndex(['CLASSE', 'CLASSIFICA', 'CLASS', 'CONDIÇÃO', 'GRADE']);
        const colValue = getColumnIndex(['VALOR TOTAL', 'VALOR DE MERCADO', 'VALOR']);
        const colQtd = getColumnIndex(['QUANTIDADE', 'QTD']);
        const colDesc = normalizedHeaders.findIndex(h => h.includes('DESCRI') || h === 'ITEM' || h === 'PRODUTO' || h.includes('NOME DO PRODUTO'));
        const extractGradeLetter = (raw) => {
            const str = String(raw).toUpperCase().trim();
            if (['A', 'B', 'C', 'D', 'E', 'U'].includes(str)) return str;
            const match = str.match(/\b([ABCDEU])\b/);
            return match ? match[1] : 'U';
        };

        for (let i = headerRowIndex + 1; i < wmsSheetData.length; i++) {
            const row = wmsSheetData[i];
            if (!row || row.length === 0) continue;
            if (row[0] && typeof row[0] === 'string' && row[0].toUpperCase().includes('TOTAL')) continue;
            const classificacaoRaw = colClass >= 0 ? row[colClass] : null;
            if (!classificacaoRaw) continue;
            const classificacao = extractGradeLetter(classificacaoRaw);
            const qtd = colQtd >= 0 && row[colQtd] != null ? (parseInt(row[colQtd]) || 1) : 1;
            let valor = 0;
            if (colValue >= 0 && row[colValue] != null) {
                const rawVal = row[colValue];
                valor = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[R$\s]/g, '').replace(',', '.')) || 0;
            }
            valorMercadoTotal += valor;
            totalItemsQtd += qtd;
            classCount[classificacao] += qtd;
            gradesData[classificacao].qtd += qtd;
            gradesData[classificacao].valorMarket += valor;
            const descRaw = colDesc >= 0 ? row[colDesc] : null;
            rawItemsByGrade.push({ grade: classificacao, desc: descRaw ? String(descRaw).trim() : `Item linha ${i + 1}`, qtd, valor });
        }

        const subItemsByCategory = {};
        if (wmsSheetData && headerRowIndex >= 0) {
            const catNamesSet = new Set(resumoCategorias.map(c => String(c.nome).trim().toLowerCase()));
            let detectedCatCol = -1;
            let detectedDescCol = -1;
            const headerRows = [wmsSheetData[headerRowIndex], headerRowIndex > 0 ? wmsSheetData[headerRowIndex - 1] : null].filter(Boolean);
            for (const hRow of headerRows) {
                hRow.forEach((h, i) => {
                    if (typeof h !== 'string') return;
                    const hn = h.toUpperCase().trim();
                    if (hn.includes('CATEGOR') && !hn.includes('SUB') && detectedCatCol < 0) detectedCatCol = i;
                    if ((hn.includes('DESCRI') || hn === 'ITEM' || hn === 'PRODUTO' || hn.includes('NOME DO PRODUTO')) && detectedDescCol < 0) detectedDescCol = i;
                });
            }
            if (detectedCatCol < 0) {
                for (let scanRow = headerRowIndex + 1; scanRow < Math.min(headerRowIndex + 6, wmsSheetData.length); scanRow++) {
                    const row = wmsSheetData[scanRow];
                    if (!row) continue;
                    row.forEach((cell, idx) => {
                        if (detectedCatCol >= 0) return;
                        if (cell && typeof cell === 'string' && catNamesSet.has(cell.trim().toLowerCase())) detectedCatCol = idx;
                    });
                    if (detectedCatCol >= 0) break;
                }
            }
            if (detectedDescCol < 0 && wmsSheetData[headerRowIndex + 1]) {
                const sampleRow = wmsSheetData[headerRowIndex + 1];
                for (let idx = 0; idx < sampleRow.length; idx++) {
                    if (idx === detectedCatCol || idx === colClass || idx === colValue || idx === colQtd) continue;
                    const cell = sampleRow[idx];
                    if (cell && typeof cell === 'string' && cell.trim().length > 5) { detectedDescCol = idx; break; }
                }
            }
            if (detectedCatCol >= 0 && detectedDescCol >= 0) {
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
                    const valor = rawValor != null ? (typeof rawValor === 'number' ? rawValor : parseFloat(String(rawValor).replace(/[R$\s]/g, '').replace(',', '.')) || 0) : 0;
                    if (!subItemsByCategory[catRaw]) subItemsByCategory[catRaw] = [];
                    subItemsByCategory[catRaw].push({ desc, qtd: qtdVal, valor });
                }
            }
        }

        const novoLote = {
            id: Date.now(), nomePlanilha: filename,
            nomeLote: filename.replace(/\.xlsx?$/, ''),
            localColeta, resumoCategorias, subItemsByCategory,
            quantidadeTotal: totalItemsQtd,
            valorMercadoTotal: referenceMarketValue !== null && referenceMarketValue > 0 ? referenceMarketValue : valorMercadoTotal,
            classCount, gradesData, rawItemsByGrade, origem: 'Mercado Livre'
        };
        setLotesImportados(prev => [...prev, novoLote]);
        setLoteAtual(novoLote);
    };

    const handleFileUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsProcessing(true);
        setError('');
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const workbook = XLSX.read(evt.target.result, { type: 'binary' });
                if (modeloPlanilha === 'casaevideo') processSheetDataCasaEVideo(workbook, file.name);
                else processSheetData(workbook, file.name);
            } catch (err) {
                console.error(err);
                setError('Erro ao processar a planilha.');
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsBinaryString(file);
    }, [modeloPlanilha]);

    const calculations = useMemo(() => {
        if (!loteAtual) return null;
        const valorArrematado = parseCurrencyInput(arremateInputValue);
        const taxaValor = valorArrematado * (taxaPct / 100);
        const custoTotal = valorArrematado + taxaValor + frete + outros;
        const vm = loteAtual.valorMercadoTotal;
        const projCurto = vm * 0.50;
        const projMedio = vm * 0.60;
        const projLongo = vm * 0.70;
        const lucroEstimado = projMedio - custoTotal;
        const rentabilidade = custoTotal > 0 ? (lucroEstimado / custoTotal) * 100 : 0;

        let score = { label: 'INDEFINIDO', color: 'bg-slate-600', text: 'text-slate-400', border: 'border-slate-500' };
        if (custoTotal > 0) {
            if (rentabilidade >= 200) score = { label: 'EXCELENTE', color: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', icon: <TrendingUp className="text-emerald-400" /> };
            else if (rentabilidade >= 120) score = { label: 'BOM', color: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', icon: <Activity className="text-blue-400" /> };
            else if (rentabilidade >= 80) score = { label: 'MÉDIO', color: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', icon: <AlertCircle className="text-yellow-400" /> };
            else score = { label: 'ARRISCADO', color: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', icon: <AlertTriangle className="text-red-400" /> };
        }

        const chartData = Object.entries(loteAtual.classCount).filter(([k, v]) => v > 0).map(([name, value]) => ({ name, value }));
        const COLORS = { A: '#10b981', B: '#3b82f6', C: '#eab308', D: '#f97316', E: '#ef4444', U: '#64748b' };
        const g = loteAtual.gradesData;
        const qtdA = g.A.qtd; const valA = g.A.valorMarket; const tmA = qtdA > 0 ? valA / qtdA : 0;
        const qtdAB = g.A.qtd + g.B.qtd; const valAB = g.A.valorMarket + g.B.valorMarket; const tmAB = qtdAB > 0 ? valAB / qtdAB : 0;
        const qtdABC = qtdAB + g.C.qtd; const valABC = valAB + g.C.valorMarket; const tmABC = qtdABC > 0 ? valABC / qtdABC : 0;
        const qtdABCD = qtdABC + g.D.qtd; const valABCD = valABC + g.D.valorMarket; const tmABCD = qtdABCD > 0 ? valABCD / qtdABCD : 0;
        const qtdALL = loteAtual.quantidadeTotal; const valALL = loteAtual.valorMercadoTotal; const tmALL = qtdALL > 0 ? valALL / qtdALL : 0;

        return { valorArrematado, taxaValor, custoTotal, projCurto, projMedio, projLongo, lucroEstimado, rentabilidade, score, chartData, COLORS, tmA, tmAB, tmABC, tmABCD, tmALL, valA, valAB, valABC, valABCD, valALL, qtdA, qtdAB, qtdABC, qtdABCD, qtdALL };
    }, [loteAtual, arremateInputValue, taxaPct, frete, outros]);

    const handleEnviarParaEstoque = async () => {
        if (!loteAtual) return;
        setIsSaving(true);
        try {
            await base44.entities.LoteRecebido.create({
                nome_lote: loteAtual.nomeLote || loteAtual.nomePlanilha || 'Lote sem nome',
                marketplace: loteAtual.origem === 'Casa e Vídeo' ? 'Casas Bahia' : 'Mercado Livre',
                valor_lote: calculations?.custoTotal || 0,
                status: 'recebido',
                data_recebimento: new Date().toISOString(),
                itens_json: JSON.stringify(loteAtual.rawItemsByGrade || []),
                quantidade_total: loteAtual.quantidadeTotal || 0,
                valor_mercado_total: loteAtual.valorMercadoTotal || 0,
                deposito_destino: 'Recreio',
                // Campos SEM coluna própria na entidade LoteRecebido — preservados em observacoes
                // (JSON) para não perder dado. Se virarem colunas no schema, migrar para campos diretos.
                observacoes: JSON.stringify({
                    valor_arremate: calculations?.valorArrematado || 0,
                    custo_total: calculations?.custoTotal || 0,
                    taxa_pct: taxaPct || 7,
                    frete: frete || 0,
                    outros: outros || 0,
                    local_coleta: loteAtual.localColeta || '',
                    origem: loteAtual.origem || 'Mercado Livre',
                    categorias_json: JSON.stringify(loteAtual.resumoCategorias || []),
                    grades_json: JSON.stringify(loteAtual.gradesData || {}),
                }),
            });
            const newLotes = lotesImportados.filter(l => l.id !== loteAtual.id);
            setLotesImportados(newLotes);
            setLoteAtual(newLotes[0] || null);
            navigate(createPageUrl('EstoqueLotes'));
        } catch (e) {
            alert('Erro ao enviar para estoque: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0d1117] text-slate-200 p-4 font-sans selection:bg-blue-500/30">
            <div className="max-w-7xl mx-auto">
                <header className="mb-10 text-center flex flex-col items-center">
                    <button onClick={() => navigate(createPageUrl('EstoqueLotes'))} className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs transition-colors">
                        <ArrowLeft size={14} /> Voltar ao Estoque
                    </button>
                    <div className="inline-flex items-center gap-3 mb-3 px-4 py-1.5 rounded-full bg-emerald-900/40 border border-emerald-700/50 shadow-sm">
                        <Warehouse size={18} className="text-emerald-400" />
                        <span className="text-sm font-semibold tracking-wide text-emerald-300">ANÁLISE INTERNA — ESTOQUE NOZAP</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-emerald-300 via-teal-400 to-cyan-500 mb-4 pb-1">
                        Análise de Lote para Estoque
                    </h1>
                </header>

                <div className="space-y-6">
                    {/* UPLOAD */}
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-12 text-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                        <div className="max-w-md mx-auto relative z-10">
                            <div className="w-24 h-24 bg-[#0d1117] border border-[#30363d] text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                                <UploadCloud size={40} />
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-white">Importar Planilha do Lote</h3>
                            <p className="text-slate-400 mb-6 text-sm">Selecione o modelo e carregue a planilha do lote recebido.</p>

                            <div className="flex gap-2 mb-6 p-1 bg-[#0d1117] border border-[#30363d] rounded-xl">
                                <button onClick={() => setModeloPlanilha('mercadolivre')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${modeloPlanilha === 'mercadolivre' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🛒 Mercado Livre</button>
                                <button onClick={() => setModeloPlanilha('casaevideo')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${modeloPlanilha === 'casaevideo' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🏪 Casa & Vídeo</button>
                            </div>

                            <label className="relative overflow-hidden cursor-pointer flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 hover:from-emerald-500 to-teal-600 hover:to-teal-500 text-white font-semibold rounded-xl transition-all shadow-lg w-full hover:-translate-y-0.5">
                                <FileSpreadsheet size={20} />
                                <span>Selecionar Arquivo (Excel ou CSV)</span>
                                <input type="file" accept=".xlsx, .xls, .csv" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={handleFileUpload} disabled={isProcessing} />
                            </label>

                            {isProcessing && (
                                <div className="mt-8 flex items-center justify-center text-emerald-400 gap-3">
                                    <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
                                    <span className="font-medium">Processando...</span>
                                </div>
                            )}
                            {error && (
                                <div className="mt-6 p-4 bg-red-950/40 border border-red-900/50 text-red-400 rounded-xl flex items-center gap-3 text-sm text-left">
                                    <AlertCircle size={20} className="shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* LISTA DE LOTES */}
                    {lotesImportados.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white">Lotes Importados ({lotesImportados.length})</h2>
                                <button onClick={() => { setLotesImportados([]); setLoteAtual(null); }} className="text-xs text-slate-400 hover:text-white">Limpar Tudo</button>
                            </div>
                            {lotesImportados.map((lote) => (
                                <div key={lote.id} onClick={() => setLoteAtual(lote)}
                                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${loteAtual?.id === lote.id ? 'bg-[#161b22] border-emerald-500/50' : 'bg-[#161b22] border-[#30363d] hover:border-emerald-500/30'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-white">{lote.nomeLote}</p>
                                            <p className="text-xs text-slate-500 mt-1">{lote.quantidadeTotal} itens • {formatCurrency(lote.valorMercadoTotal)} • <span className="text-emerald-400">{lote.origem}</span></p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setLotesImportados(prev => prev.filter(l => l.id !== lote.id)); if (loteAtual?.id === lote.id) setLoteAtual(null); }} className="text-slate-500 hover:text-red-400">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {loteAtual && calculations && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">

                            {/* HEADER */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                                        <Package className="text-emerald-500" size={24} />
                                        {loteAtual.nomeLote}
                                    </h2>
                                    <div className="flex items-center gap-2 flex-wrap mt-2">
                                        <span className="px-3 py-1 bg-emerald-900/40 border border-emerald-700/50 rounded-md text-xs text-emerald-300 font-bold">
                                            {loteAtual.origem === 'Casa e Vídeo' ? '🏪 Casa & Vídeo' : '🛒 Mercado Livre'}
                                        </span>
                                        <p className="text-slate-400 text-sm flex items-center gap-1">
                                            <CheckCircle2 size={14} className="text-emerald-500" /> Planilha processada com sucesso
                                        </p>
                                    </div>
                                    {loteAtual.localColeta && loteAtual.localColeta !== 'Será informado após Arremate' && (
                                        <div className="inline-block mt-2 px-3 py-1 bg-blue-900/30 border border-blue-800/50 rounded-md text-xs text-blue-300 font-medium">
                                            📍 {loteAtual.localColeta}
                                        </div>
                                    )}
                                </div>
                                <button
                                    disabled={isSaving}
                                    onClick={handleEnviarParaEstoque}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                                >
                                    <Warehouse size={16} />
                                    {isSaving ? 'Enviando...' : 'Enviar para Estoque de Lotes'}
                                </button>
                            </div>

                            {/* SCORE */}
                            <div className={`p-4 rounded-2xl border ${calculations.score.border} ${calculations.score.color} flex items-center gap-4 shadow-lg`}>
                                <div className="p-3 bg-black/20 rounded-xl">{calculations.score.icon}</div>
                                <div>
                                    <h4 className={`font-bold tracking-tight text-lg ${calculations.score.text}`}>SCORE: {calculations.score.label}</h4>
                                    <p className="text-slate-300 text-sm">Rentabilidade projetada em cenário médio (60%): <span className="font-bold text-white">{calculations.rentabilidade.toFixed(1)}%</span></p>
                                </div>
                            </div>

                            {/* KPIs */}
                            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                                {[
                                    { label: "Total de Itens", val: loteAtual.quantidadeTotal, color: "border-l-blue-500" },
                                    { label: "Valor de Mercado Total", val: formatCurrency(loteAtual.valorMercadoTotal), color: "border-l-emerald-500" },
                                    { label: "Ticket Médio (Mercado)", val: formatCurrency(loteAtual.quantidadeTotal ? loteAtual.valorMercadoTotal / loteAtual.quantidadeTotal : 0), color: "border-l-indigo-500" },
                                    { label: "Custo Total Lote", val: formatCurrency(calculations.custoTotal), color: "border-l-amber-500" },
                                    { label: "Custo Médio p/ Unidade", val: formatCurrency(loteAtual.quantidadeTotal ? calculations.custoTotal / loteAtual.quantidadeTotal : 0), color: "border-l-red-500" },
                                ].map((kpi, i) => (
                                    <div key={i} className={`bg-[#161b22] p-6 rounded-2xl border border-[#30363d] border-l-4 ${kpi.color} shadow-lg`}>
                                        <p className="text-slate-400 text-xs font-bold mb-1 tracking-wider uppercase">{kpi.label}</p>
                                        <p className="text-3xl font-black tracking-tight text-slate-200">{kpi.val}</p>
                                    </div>
                                ))}
                            </div>

                            {/* FINANCEIRO + PROJEÇÕES + TICKET */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                {/* FINANCEIRO */}
                                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
                                    <div className="p-5 border-b border-[#30363d] bg-slate-800/20">
                                        <h3 className="font-bold text-white flex items-center gap-2"><DollarSign size={18} className="text-amber-400" />Cenário Financeiro</h3>
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Valor Arremato</label>
                                            <div className="relative mt-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                                                <input type="number" value={arremateInputValue} onChange={(e) => setArremateInputValue(e.target.value)} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-emerald-500" placeholder="0.00" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Taxa Leilão</label>
                                                <div className="relative mt-1">
                                                    <input type="number" value={taxaPct} onChange={(e) => setTaxaPct(Number(e.target.value))} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-3 pr-8 text-white focus:outline-none focus:border-emerald-500" />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">= {formatCurrency(calculations.taxaValor)}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Frete (R$)</label>
                                                <input type="number" value={frete || ''} onChange={(e) => setFrete(Number(e.target.value))} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-emerald-500 mt-1" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Outros Custos</label>
                                            <input type="number" value={outros || ''} onChange={(e) => setOutros(Number(e.target.value))} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-emerald-500 mt-1" />
                                        </div>
                                        <div className="pt-3 border-t border-[#30363d]">
                                            <div className="flex justify-between items-center bg-[#0d1117] p-4 rounded-xl border border-[#30363d]">
                                                <span className="font-semibold text-slate-300">CUSTO DO LOTE:</span>
                                                <span className="text-xl font-bold text-amber-400">{formatCurrency(calculations.custoTotal)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* PROJEÇÕES */}
                                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl p-6">
                                    <h3 className="font-bold text-white mb-5 uppercase tracking-wider text-sm flex items-center gap-2"><TrendingUp size={16} className="text-indigo-400" />Cenários de Venda</h3>
                                    <div className="space-y-3">
                                        {[
                                            { title: "Venda (50% do Valor Mercado)", val: calculations.projCurto, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
                                            { title: "Venda (60% do Valor Mercado)", val: calculations.projMedio, color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
                                            { title: "Venda (70% do Valor Mercado)", val: calculations.projLongo, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
                                        ].map((item, idx) => (
                                            <div key={idx} className={`flex justify-between items-center p-3 rounded-xl border ${item.color}`}>
                                                <p className="font-semibold text-sm">{item.title}</p>
                                                <div className="text-right">
                                                    <p className="font-bold text-lg">{formatCurrency(item.val)}</p>
                                                    <p className="text-xs">Lucro: {formatCurrency(item.val - calculations.custoTotal)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* TICKET MÉDIO */}
                                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl p-6">
                                    <h3 className="font-bold text-white mb-2 uppercase tracking-wider text-sm flex items-center gap-2"><Activity size={16} className="text-blue-400" />Ticket Médio por Grade</h3>
                                    <div className="space-y-2 mt-4">
                                        {[
                                            { label: "Somente Grupo A", desc: `${calculations.qtdA} produtos`, tm: calculations.tmA, val: calculations.valA, color: "border-l-blue-400", grades: ['A'] },
                                            { label: "Grupo A + B", desc: `${calculations.qtdAB} produtos`, tm: calculations.tmAB, val: calculations.valAB, color: "border-l-emerald-400", grades: ['A', 'B'] },
                                            { label: "Grupo A + B + C", desc: `${calculations.qtdABC} produtos`, tm: calculations.tmABC, val: calculations.valABC, color: "border-l-yellow-400", grades: ['A', 'B', 'C'] },
                                            { label: "Grupo A + B + C + D", desc: `${calculations.qtdABCD} produtos`, tm: calculations.tmABCD, val: calculations.valABCD, color: "border-l-orange-400", grades: ['A', 'B', 'C', 'D'] },
                                            { label: "Todos (A+B+C+D+E+U)", desc: `${calculations.qtdALL} produtos`, tm: calculations.tmALL, val: calculations.valALL, color: "border-l-slate-400", grades: ['A', 'B', 'C', 'D', 'E', 'U'] },
                                        ].map((tmData, idx) => (
                                            <div key={idx} onClick={() => setGradeModal({ title: tmData.label, grades: tmData.grades })}
                                                className={`bg-[#0d1117] border border-[#30363d] border-l-4 ${tmData.color} rounded-lg p-3 flex justify-between items-center cursor-pointer hover:bg-white/[0.04] transition-all`}>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-200 flex items-center gap-1.5">{tmData.label} <Eye size={12} className="text-slate-600" /></p>
                                                    <p className="text-xs text-slate-500">{tmData.desc}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-emerald-400">{formatCurrency(tmData.tm)}</p>
                                                    <p className="text-[10px] text-slate-400">Apurado: {formatCurrency(tmData.val)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* DISTRIBUIÇÃO QUALIDADE */}
                            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl p-6">
                                <h3 className="font-bold text-white mb-5 uppercase tracking-wider text-sm">Distribuição de Qualidade (Grades)</h3>
                                <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                                    <div className="w-56 h-56 flex-shrink-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={calculations.chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={5} dataKey="value" stroke="none">
                                                    {calculations.chartData.map((entry, index) => (<Cell key={index} fill={calculations.COLORS[entry.name]} />))}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', color: '#fff' }} formatter={(value) => [`${value} itens`, 'Quantidade']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                                        {calculations.chartData.map((d, i) => (
                                            <div key={i} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex justify-between items-center">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: calculations.COLORS[d.name] }}></div>
                                                    <span className="text-sm font-bold text-slate-300">Grade {d.name}</span>
                                                </div>
                                                <span className="font-black text-white">{d.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* CATEGORIAS */}
                            {loteAtual.resumoCategorias?.length > 0 && (
                                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
                                    <div className="p-5 border-b border-[#30363d] bg-slate-800/20">
                                        <h3 className="font-bold text-white uppercase tracking-wider text-sm">Distribuição por Categoria</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="bg-[#0d1117] border-b border-[#30363d] text-slate-400 uppercase text-xs">
                                                    <th className="px-6 py-4">Categoria</th>
                                                    <th className="px-6 py-4 border-l border-[#30363d] text-center">Qtd</th>
                                                    <th className="px-6 py-4 border-l border-[#30363d] text-right">Valor Mercado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loteAtual.resumoCategorias.map((cat, i) => {
                                                    const subs = loteAtual.subItemsByCategory?.[cat.nome] || [];
                                                    const isOpen = expandedCategories.has(cat.nome);
                                                    return (
                                                        <React.Fragment key={i}>
                                                            <tr onClick={() => subs.length > 0 && toggleCategory(cat.nome)} className={`border-b border-[#30363d]/50 ${subs.length > 0 ? 'cursor-pointer hover:bg-white/[0.04]' : ''}`}>
                                                                <td className="px-6 py-4 text-slate-300 font-medium flex items-center gap-2">
                                                                    {subs.length > 0 && <span className={`text-slate-500 transition-transform inline-block ${isOpen ? 'rotate-90' : ''}`}>▶</span>}
                                                                    {cat.nome}
                                                                </td>
                                                                <td className="px-6 py-4 border-l border-[#30363d]/50 text-center text-slate-400">{cat.qtd} un</td>
                                                                <td className="px-6 py-4 border-l border-[#30363d]/50 text-right font-bold text-emerald-400">{formatCurrency(cat.valor)}</td>
                                                            </tr>
                                                            {isOpen && subs.map((sub, si) => (
                                                                <tr key={si} className="border-b border-[#30363d]/30 bg-[#0d1117]/60">
                                                                    <td className="pl-12 pr-6 py-2 text-slate-400 text-sm"><span className="text-slate-600 mr-2">└</span>{sub.desc}</td>
                                                                    <td className="px-6 py-2 border-l border-[#30363d]/30 text-center text-slate-500 text-sm">{sub.qtd} un</td>
                                                                    <td className="px-6 py-2 border-l border-[#30363d]/30 text-right text-emerald-600 text-sm font-medium">{formatCurrency(sub.valor)}</td>
                                                                </tr>
                                                            ))}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {gradeModal && loteAtual && (
                <GradeItemsModal isOpen={true} onClose={() => setGradeModal(null)} title={gradeModal.title} grades={gradeModal.grades} items={loteAtual.rawItemsByGrade || []} />
            )}
        </div>
    );
}

export default AnaliseLoteEstoque;