import React, { useState, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { UploadCloud, FileSpreadsheet, AlertCircle, TrendingUp, AlertTriangle, Activity, DollarSign, Package, CheckCircle2, Eye, Warehouse, ShoppingBag, MapPin } from 'lucide-react';
import GradeItemsModal from './GradeItemsModal';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);
const parseCurrencyInput = (val) => {
    const numeric = parseFloat(String(val).replace(/[^\d.,-]/g, '').replace(',', '.'));
    return isNaN(numeric) ? 0 : numeric;
};

export default function AnalisadorLoteInline({ onEnviado }) {
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
    const [dataLeilao, setDataLeilao] = useState('');
    const [horarioLeilao, setHorarioLeilao] = useState('');

    const toggleCategory = (nome) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            next.has(nome) ? next.delete(nome) : next.add(nome);
            return next;
        });
    };

    const processSheetDataCasaEVideo = (workbook, filename) => {
        const sheetName = workbook.SheetNames[0];
        const allRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
        if (allRows.length === 0) { setError('Planilha Casa e Vídeo vazia.'); return; }
        const normalize = (s) => String(s || '').toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let headerIdx = -1, headers = [];
        for (let i = 0; i < Math.min(10, allRows.length); i++) {
            const normed = allRows[i].map(normalize);
            if (normed.some(h => h.includes('DESCRI') || h.includes('QTD') || h.includes('MATERIAL'))) { headerIdx = i; headers = normed; break; }
        }
        if (headerIdx === -1) { setError('Cabeçalho não encontrado na planilha Casa e Vídeo.'); return; }
        const colDesc = headers.findIndex(h => h.includes('DESCRI'));
        const colQtd = headers.findIndex(h => h.includes('QTD') || h.includes('QUANTIDADE'));
        const colValor = headers.findIndex(h => h.includes('VALOR') || h.includes('VENDA'));
        const colCat = headers.findIndex(h => h.includes('CATEGOR'));
        if (colDesc === -1 || colValor === -1) { setError('Coluna DESCRIÇÃO ou VALOR não encontrada.'); return; }
        const resumoCategorias = {}, subItemsByCategory = {}, rawItemsByGrade = [];
        let valorMercadoTotal = 0, totalItemsQtd = 0;
        for (let i = headerIdx + 1; i < allRows.length; i++) {
            const row = allRows[i];
            if (!row || row.every(c => c === '' || c == null)) continue;
            const desc = String(row[colDesc] || '').trim();
            if (!desc) continue;
            const qtd = colQtd >= 0 ? (parseInt(row[colQtd]) || 1) : 1;
            const rawVal = colValor >= 0 ? row[colValor] : 0;
            const valor = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[R$\s]/g, '').replace(',', '.')) || 0;
            const cat = colCat >= 0 ? String(row[colCat] || 'SEM CATEGORIA').trim() : 'SEM CATEGORIA';
            valorMercadoTotal += valor; totalItemsQtd += qtd;
            rawItemsByGrade.push({ grade: 'A', desc, qtd, valor });
            if (!resumoCategorias[cat]) resumoCategorias[cat] = { nome: cat, qtd: 0, valor: 0 };
            resumoCategorias[cat].qtd += qtd; resumoCategorias[cat].valor += valor;
            if (!subItemsByCategory[cat]) subItemsByCategory[cat] = [];
            subItemsByCategory[cat].push({ desc, qtd, valor });
        }
        const gradesData = { A: { qtd: totalItemsQtd, valorMarket: valorMercadoTotal }, B: { qtd: 0, valorMarket: 0 }, C: { qtd: 0, valorMarket: 0 }, D: { qtd: 0, valorMarket: 0 }, E: { qtd: 0, valorMarket: 0 }, U: { qtd: 0, valorMarket: 0 } };
        const novoLote = { id: Date.now(), nomePlanilha: filename, nomeLote: filename.replace(/\.xlsx?$|\.csv$/i, ''), localColeta: 'Será informado após Arremate', resumoCategorias: Object.values(resumoCategorias), subItemsByCategory, quantidadeTotal: totalItemsQtd, valorMercadoTotal, classCount: { A: totalItemsQtd, B: 0, C: 0, D: 0, E: 0, U: 0 }, gradesData, rawItemsByGrade, origem: 'Casa e Vídeo' };
        setLotesImportados(prev => [...prev, novoLote]);
        setLoteAtual(novoLote);
    };

    const processSheetData = (rawWorkbookData, filename) => {
        let wmsSheetData = null, localColeta = 'Será informado após Arremate';
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
                    if (r[0].includes('Total Geral')) { const rawVal = r[2]; if (typeof rawVal === 'number') referenceMarketValue = rawVal; else if (rawVal) referenceMarketValue = parseFloat(String(rawVal).replace(/[R$\s]/g, '').replace(',', '.')); break; }
                    resumoCategorias.push({ nome: r[0], qtd: r[1] || 0, valor: r[2] || 0 });
                }
            }
        }
        let headerRowIndex = -1, headers = [];
        for (const sheetName of rawWorkbookData.SheetNames) {
            const data = XLSX.utils.sheet_to_json(rawWorkbookData.Sheets[sheetName], { header: 1 });
            for (let i = 0; i < Math.min(20, data.length); i++) {
                const row = data[i];
                if (row && row.some(cell => typeof cell === 'string' && (cell.toUpperCase().includes('CLASSE') || cell.toUpperCase().includes('GRADE') || cell.toUpperCase().includes('CONDIÇÃO') || cell.toUpperCase().includes('VALOR TOTAL') || cell.toUpperCase().includes('VALOR DE MERCADO')))) { headerRowIndex = i; headers = row; wmsSheetData = data; break; }
            }
            if (wmsSheetData) break;
        }
        if (!wmsSheetData || headerRowIndex === -1) { setError("Não foi possível identificar os produtos. Verifique colunas 'Grade/Condição' ou 'Valor Total'."); return; }
        const classCount = { A: 0, B: 0, C: 0, D: 0, E: 0, U: 0 };
        let valorMercadoTotal = 0, totalItemsQtd = 0;
        const rawItemsByGrade = [];
        const gradesData = { A: { qtd: 0, valorMarket: 0 }, B: { qtd: 0, valorMarket: 0 }, C: { qtd: 0, valorMarket: 0 }, D: { qtd: 0, valorMarket: 0 }, E: { qtd: 0, valorMarket: 0 }, U: { qtd: 0, valorMarket: 0 } };
        const normalizedHeaders = headers.map(h => typeof h === 'string' ? h.toUpperCase().trim() : '');
        const getColIdx = (kws) => normalizedHeaders.findIndex(h => kws.some(k => h.includes(k)));
        const colClass = getColIdx(['CLASSE', 'CLASSIFICA', 'CLASS', 'CONDIÇÃO', 'GRADE']);
        const colValue = getColIdx(['VALOR TOTAL', 'VALOR DE MERCADO', 'VALOR']);
        const colQtd = getColIdx(['QUANTIDADE', 'QTD']);
        const colDesc = normalizedHeaders.findIndex(h => h.includes('DESCRI') || h === 'ITEM' || h === 'PRODUTO' || h.includes('NOME DO PRODUTO'));
        const extractGrade = (raw) => { const str = String(raw).toUpperCase().trim(); if (['A','B','C','D','E','U'].includes(str)) return str; const m = str.match(/\b([ABCDEU])\b/); return m ? m[1] : 'U'; };
        for (let i = headerRowIndex + 1; i < wmsSheetData.length; i++) {
            const row = wmsSheetData[i];
            if (!row || row.length === 0) continue;
            if (row[0] && typeof row[0] === 'string' && row[0].toUpperCase().includes('TOTAL')) continue;
            const cr = colClass >= 0 ? row[colClass] : null;
            if (!cr) continue;
            const g = extractGrade(cr);
            const qtd = colQtd >= 0 && row[colQtd] != null ? (parseInt(row[colQtd]) || 1) : 1;
            const rawVal = colValue >= 0 && row[colValue] != null ? row[colValue] : 0;
            const valor = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[R$\s]/g, '').replace(',', '.')) || 0;
            valorMercadoTotal += valor; totalItemsQtd += qtd;
            classCount[g] += qtd; gradesData[g].qtd += qtd; gradesData[g].valorMarket += valor;
            rawItemsByGrade.push({ grade: g, desc: colDesc >= 0 && row[colDesc] ? String(row[colDesc]).trim() : `Item ${i+1}`, qtd, valor });
        }
        const subItemsByCategory = {};
        const novoLote = { id: Date.now(), nomePlanilha: filename, nomeLote: filename.replace(/\.xlsx?$/, ''), localColeta, resumoCategorias, subItemsByCategory, quantidadeTotal: totalItemsQtd, valorMercadoTotal: referenceMarketValue > 0 ? referenceMarketValue : valorMercadoTotal, classCount, gradesData, rawItemsByGrade, origem: 'Mercado Livre' };
        setLotesImportados(prev => [...prev, novoLote]);
        setLoteAtual(novoLote);
    };

    const handleFileUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsProcessing(true); setError('');
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const workbook = XLSX.read(evt.target.result, { type: 'binary' });
                if (modeloPlanilha === 'casaevideo') processSheetDataCasaEVideo(workbook, file.name);
                else processSheetData(workbook, file.name);
            } catch (err) { setError('Erro ao processar a planilha.'); }
            finally { setIsProcessing(false); }
        };
        reader.readAsBinaryString(file);
    }, [modeloPlanilha]);

    const calculations = useMemo(() => {
        if (!loteAtual) return null;
        const valorArrematado = parseCurrencyInput(arremateInputValue);
        const taxaValor = valorArrematado * (taxaPct / 100);
        const custoTotal = valorArrematado + taxaValor + frete + outros;
        const vm = loteAtual.valorMercadoTotal;
        const projCurto = vm * 0.50, projMedio = vm * 0.60, projLongo = vm * 0.70;
        const lucroEstimado = projMedio - custoTotal;
        const rentabilidade = custoTotal > 0 ? (lucroEstimado / custoTotal) * 100 : 0;
        let score = { label: 'INDEFINIDO', color: 'bg-slate-600', text: 'text-slate-400', border: 'border-slate-500', icon: null };
        if (custoTotal > 0) {
            if (rentabilidade >= 200) score = { label: 'EXCELENTE', color: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', icon: <TrendingUp className="text-emerald-400" /> };
            else if (rentabilidade >= 120) score = { label: 'BOM', color: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', icon: <Activity className="text-blue-400" /> };
            else if (rentabilidade >= 80) score = { label: 'MÉDIO', color: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', icon: <AlertCircle className="text-yellow-400" /> };
            else score = { label: 'ARRISCADO', color: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', icon: <AlertTriangle className="text-red-400" /> };
        }
        const chartData = Object.entries(loteAtual.classCount).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
        const COLORS = { A: '#10b981', B: '#3b82f6', C: '#eab308', D: '#f97316', E: '#ef4444', U: '#64748b' };
        const g = loteAtual.gradesData;
        const qtdA = g.A.qtd, valA = g.A.valorMarket, tmA = qtdA > 0 ? valA/qtdA : 0;
        const qtdAB = g.A.qtd+g.B.qtd, valAB = g.A.valorMarket+g.B.valorMarket, tmAB = qtdAB > 0 ? valAB/qtdAB : 0;
        const qtdABC = qtdAB+g.C.qtd, valABC = valAB+g.C.valorMarket, tmABC = qtdABC > 0 ? valABC/qtdABC : 0;
        const qtdABCD = qtdABC+g.D.qtd, valABCD = valABC+g.D.valorMarket, tmABCD = qtdABCD > 0 ? valABCD/qtdABCD : 0;
        const qtdALL = loteAtual.quantidadeTotal, valALL = loteAtual.valorMercadoTotal, tmALL = qtdALL > 0 ? valALL/qtdALL : 0;
        return { valorArrematado, taxaValor, custoTotal, projCurto, projMedio, projLongo, rentabilidade, score, chartData, COLORS, tmA, tmAB, tmABC, tmABCD, tmALL, valA, valAB, valABC, valABCD, valALL, qtdA, qtdAB, qtdABC, qtdABCD, qtdALL };
    }, [loteAtual, arremateInputValue, taxaPct, frete, outros]);

    const handlePublicarMarketplace = async () => {
        if (!loteAtual || !calculations) return;
        setIsSaving(true);
        try {
            let endTime;
            if (dataLeilao && horarioLeilao) endTime = new Date(`${dataLeilao}T${horarioLeilao}:00`);
            else if (dataLeilao) endTime = new Date(`${dataLeilao}T12:00:00`);
            else { endTime = new Date(); endTime.setDate(endTime.getDate() + 30); }

            await base44.entities.Auction.create({
                title: loteAtual.nomeLote,
                description: `Local de Retirada: ${loteAtual.localColeta}\nTotal de Itens: ${loteAtual.quantidadeTotal}\nValor de Mercado: R$ ${loteAtual.valorMercadoTotal.toFixed(2)}`,
                starting_price: calculations.custoTotal,
                current_price: calculations.custoTotal,
                increment: 100,
                end_time: endTime.toISOString(),
                status: 'active',
                is_investment_plan: true,
                market_price: loteAtual.valorMercadoTotal,
                manual_market_price: loteAtual.valorMercadoTotal,
                lot_categories_json: loteAtual.resumoCategorias?.length > 0 ? JSON.stringify(loteAtual.resumoCategorias) : null,
                lot_items_json: loteAtual.subItemsByCategory && Object.keys(loteAtual.subItemsByCategory).length > 0 ? JSON.stringify(loteAtual.subItemsByCategory) : null,
                lot_grades_json: loteAtual.gradesData ? JSON.stringify(loteAtual.gradesData) : null,
                lot_raw_items_json: loteAtual.rawItemsByGrade?.length > 0 ? JSON.stringify(loteAtual.rawItemsByGrade) : null,
            });
            const newLotes = lotesImportados.filter(l => l.id !== loteAtual.id);
            setLotesImportados(newLotes);
            setLoteAtual(newLotes[0] || null);
            setDataLeilao(''); setHorarioLeilao('');
            if (onEnviado) onEnviado();
            alert('✅ Lote publicado no Marketplace!');
        } catch (e) {
            alert('Erro ao publicar: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEnviarParaEstoque = async () => {
        if (!loteAtual) return;
        setIsSaving(true);
        try {
            await base44.entities.LoteRecebido.create({
                nome_lote: loteAtual.nomeLote,
                marketplace: loteAtual.origem === 'Casa e Vídeo' ? 'Casas Bahia' : 'Mercado Livre',
                valor_lote: calculations?.custoTotal || 0,
                observacoes: `Origem: ${loteAtual.origem} | Valor Mercado: R$ ${loteAtual.valorMercadoTotal?.toFixed(2)} | Qtd: ${loteAtual.quantidadeTotal} | Arremate: R$ ${calculations?.valorArrematado?.toFixed(2)} | Taxa: ${taxaPct}% | Frete: R$ ${frete} | Local: ${loteAtual.localColeta}`,
                data_recebimento: new Date().toISOString(),
                status: 'recebido',
            });
            const newLotes = lotesImportados.filter(l => l.id !== loteAtual.id);
            setLotesImportados(newLotes);
            setLoteAtual(newLotes[0] || null);
            setArremateInputValue('');
            if (onEnviado) onEnviado();
        } catch (e) {
            alert('Erro ao enviar para estoque: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* UPLOAD */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center relative overflow-hidden">
                <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 bg-gray-900 border border-gray-700 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <UploadCloud size={36} />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">Analisar Planilha do Lote</h3>
                    <p className="text-gray-400 mb-5 text-sm">Selecione o modelo e carregue a planilha para análise completa</p>

                    {/* Seletor de modelo */}
                    <div className="flex gap-2 mb-5 p-1 bg-gray-900 border border-gray-700 rounded-xl">
                        <button onClick={() => setModeloPlanilha('mercadolivre')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${modeloPlanilha === 'mercadolivre' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>🛒 Mercado Livre</button>
                        <button onClick={() => setModeloPlanilha('casaevideo')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${modeloPlanilha === 'casaevideo' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>🏪 Casa & Vídeo</button>
                    </div>

                    <label className="cursor-pointer flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg w-full">
                        <FileSpreadsheet size={20} />
                        <span>Selecionar Arquivo (Excel ou CSV)</span>
                        <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
                    </label>

                    {isProcessing && (
                        <div className="mt-6 flex items-center justify-center text-emerald-400 gap-3">
                            <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
                            <span className="font-medium">Processando planilha...</span>
                        </div>
                    )}
                    {error && (
                        <div className="mt-4 p-3 bg-red-900/30 border border-red-700/50 text-red-400 rounded-xl flex items-center gap-3 text-sm text-left">
                            <AlertCircle size={18} className="shrink-0" /><p>{error}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* LISTA DE LOTES IMPORTADOS */}
            {lotesImportados.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-white">Lotes Importados ({lotesImportados.length})</h2>
                        <button onClick={() => { setLotesImportados([]); setLoteAtual(null); }} className="text-xs text-gray-400 hover:text-white">Limpar Tudo</button>
                    </div>
                    {lotesImportados.map((lote) => (
                        <div key={lote.id} onClick={() => setLoteAtual(lote)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${loteAtual?.id === lote.id ? 'bg-gray-800 border-emerald-500/50' : 'bg-gray-800 border-gray-700 hover:border-emerald-500/30'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-white text-sm">{lote.nomeLote}</p>
                                    <p className="text-xs text-gray-500 mt-1">{lote.quantidadeTotal} itens • {formatCurrency(lote.valorMercadoTotal)} • <span className="text-emerald-400">{lote.origem}</span></p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setLotesImportados(prev => prev.filter(l => l.id !== lote.id)); if (loteAtual?.id === lote.id) setLoteAtual(null); }} className="text-gray-500 hover:text-red-400 text-sm">✕</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* DASHBOARD DE ANÁLISE */}
            {loteAtual && calculations && (
                <div className="space-y-5">
                    {/* Header + botão enviar */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-800 border border-gray-700 rounded-2xl p-5">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                                <Package className="text-emerald-500" size={22} />
                                {loteAtual.nomeLote}
                            </h2>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                                <span className="px-2 py-0.5 bg-emerald-900/40 border border-emerald-700/50 rounded text-xs text-emerald-300 font-bold">
                                    {loteAtual.origem === 'Casa e Vídeo' ? '🏪 Casa & Vídeo' : '🛒 Mercado Livre'}
                                </span>
                                <p className="text-gray-400 text-xs flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> Processado com sucesso</p>
                                {loteAtual.localColeta && loteAtual.localColeta !== 'Será informado após Arremate' && (
                                    <span className="px-2 py-0.5 bg-blue-900/30 border border-blue-700/40 rounded text-xs text-blue-300 flex items-center gap-1">
                                        <MapPin size={10} /> {loteAtual.localColeta}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2 flex-wrap">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Data do Leilão</label>
                                    <input type="date" value={dataLeilao} onChange={e => setDataLeilao(e.target.value)} className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Horário do Leilão</label>
                                    <input type="time" value={horarioLeilao} onChange={e => setHorarioLeilao(e.target.value)} className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button disabled={isSaving} onClick={handleEnviarParaEstoque}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow">
                                    <Warehouse size={15} />
                                    {isSaving ? 'Enviando...' : 'Enviar para Estoque'}
                                </button>
                                <button disabled={isSaving} onClick={handlePublicarMarketplace}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow">
                                    <ShoppingBag size={15} />
                                    {isSaving ? 'Publicando...' : 'Publicar no Marketplace'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Score */}
                    <div className={`p-4 rounded-xl border ${calculations.score.border} ${calculations.score.color} flex items-center gap-4`}>
                        {calculations.score.icon && <div className="p-2 bg-black/20 rounded-lg">{calculations.score.icon}</div>}
                        <div>
                            <h4 className={`font-bold text-base ${calculations.score.text}`}>SCORE: {calculations.score.label}</h4>
                            <p className="text-gray-300 text-sm">Rentabilidade (60% VM): <span className="font-bold text-white">{calculations.rentabilidade.toFixed(1)}%</span></p>
                        </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                        {[
                            { label: "Total de Itens (Qtd)", val: loteAtual.quantidadeTotal, color: "border-l-blue-500" },
                            { label: "Valor de Mercado Total", val: formatCurrency(loteAtual.valorMercadoTotal), color: "border-l-emerald-500" },
                            { label: "Ticket Avaliado (Mercado)", val: formatCurrency(loteAtual.quantidadeTotal ? loteAtual.valorMercadoTotal/loteAtual.quantidadeTotal : 0), color: "border-l-indigo-500" },
                            { label: "Custo Total Lote", val: formatCurrency(calculations.custoTotal), color: "border-l-amber-500" },
                            { label: "Custo Médio p/ Unidade", val: formatCurrency(loteAtual.quantidadeTotal ? calculations.custoTotal/loteAtual.quantidadeTotal : 0), color: "border-l-red-500", highlight: true },
                        ].map((kpi, i) => (
                            <div key={i} className={`bg-gray-800 p-6 rounded-2xl border border-gray-700 border-l-4 ${kpi.color} shadow-lg`}>
                                <p className="text-gray-400 text-xs font-bold mb-1 tracking-wider uppercase">{kpi.label}</p>
                                <p className={`text-3xl font-black tracking-tight ${kpi.highlight ? 'text-white' : 'text-gray-200'}`}>{kpi.val}</p>
                            </div>
                        ))}
                    </div>

                    {/* Grid principal: 1 col Financeiro + 2 cols (Projeções + Ticket Médio) */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                        {/* COL 1: Financeiro */}
                        <div className="xl:col-span-1">
                            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl overflow-hidden">
                                <div className="p-5 border-b border-gray-700 bg-gray-900/20">
                                    <h3 className="font-bold text-white flex items-center gap-2"><DollarSign size={18} className="text-amber-400" />Cenário Financeiro e Custos</h3>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Valor Arremato</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                                            <input type="number" value={arremateInputValue} onChange={(e) => setArremateInputValue(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Taxa de Leilão</label>
                                            <div className="relative">
                                                <input type="number" value={taxaPct} onChange={(e) => setTaxaPct(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2.5 px-3 pr-8 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">= {formatCurrency(calculations.taxaValor)}</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Frete (BRL)</label>
                                            <input type="number" value={frete || ''} onChange={(e) => setFrete(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Outros Custos Opcionais</label>
                                        <input type="number" value={outros || ''} onChange={(e) => setOutros(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-blue-500" />
                                    </div>
                                    <div className="pt-4 mt-2 border-t border-gray-700">
                                        <div className="flex justify-between items-center bg-gray-900 p-4 rounded-xl border border-gray-700">
                                            <span className="font-semibold text-gray-300">CUSTO DO LOTE:</span>
                                            <span className="text-xl font-bold text-amber-400">{formatCurrency(calculations.custoTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COL 2+3: Projeções + Ticket Médio lado a lado, depois gráfico embaixo */}
                        <div className="space-y-6 col-span-1 xl:col-span-2">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                                {/* Projeções */}
                                <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-6">
                                    <h3 className="font-bold text-white mb-5 uppercase tracking-wider text-sm flex items-center gap-2"><TrendingUp size={16} className="text-indigo-400" />Cenários de Venda da Grade Útil</h3>
                                    <div className="space-y-3">
                                        {[
                                            { title: "Venda (50% do Valor Mercado)", val: calculations.projCurto, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
                                            { title: "Venda (60% do Valor Mercado)", val: calculations.projMedio, color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
                                            { title: "Venda (70% do Valor Mercado)", val: calculations.projLongo, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
                                        ].map((item, idx) => (
                                            <div key={idx} className={`flex justify-between items-center p-3 sm:p-4 rounded-xl border ${item.color}`}>
                                                <div><p className="font-semibold text-sm sm:text-base">{item.title}</p></div>
                                                <div className="text-right">
                                                    <p className="font-bold text-lg sm:text-xl">{formatCurrency(item.val)}</p>
                                                    <p className="text-xs mt-0.5 font-medium flex items-center justify-end gap-1"><span>Lucro Bruto:</span><span>{formatCurrency(item.val - calculations.custoTotal)}</span></p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Ticket Médio por Grade */}
                                <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-6 flex flex-col">
                                    <h3 className="font-bold text-white mb-2 uppercase tracking-wider text-sm flex items-center gap-2"><Activity size={16} className="text-blue-400" />Análise de Ticket Médio por Grade</h3>
                                    <p className="text-xs text-gray-400 mb-5">Valor médio dos produtos agrupados por qualidade superior.</p>
                                    <div className="space-y-3 flex-1 flex flex-col justify-center">
                                        {[
                                            { label: "Somente Grupo A", desc: `Equivale a ${calculations.qtdA} produtos originais/intactos`, tm: calculations.tmA, val: calculations.valA, color: "border-l-blue-400", grades: ['A'] },
                                            { label: "Grupo A + B", desc: `Equivale a ${calculations.qtdAB} produtos vitrine`, tm: calculations.tmAB, val: calculations.valAB, color: "border-l-[#10b981]", grades: ['A','B'] },
                                            { label: "Grupo A + B + C", desc: `Equivale a ${calculations.qtdABC} produtos úteis`, tm: calculations.tmABC, val: calculations.valABC, color: "border-l-[#eab308]", grades: ['A','B','C'] },
                                            { label: "Grupo A + B + C + D", desc: `Equivale a ${calculations.qtdABCD} produtos escoáveis`, tm: calculations.tmABCD, val: calculations.valABCD, color: "border-l-[#f97316]", grades: ['A','B','C','D'] },
                                            { label: "Todos os Grupos (A+B+C+D+E+U)", desc: `Equivale ao lote inteiro (${calculations.qtdALL} produtos)`, tm: calculations.tmALL, val: calculations.valALL, color: "border-l-slate-400", grades: ['A','B','C','D','E','U'] },
                                        ].map((row, i) => (
                                            <div key={i} onClick={() => setGradeModal({ title: row.label, grades: row.grades })}
                                                className={`bg-gray-900 border border-gray-700 border-l-4 ${row.color} rounded-lg p-3 flex justify-between items-center cursor-pointer hover:bg-white/[0.04] hover:border-blue-500/30 transition-all group`}>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-200 flex items-center gap-1.5">{row.label}<Eye size={12} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" /></p>
                                                    <p className="text-xs text-gray-500">{row.desc}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-emerald-400">{formatCurrency(row.tm)} <span className="text-xs text-gray-500 font-normal">médio</span></p>
                                                    <p className="text-[10px] text-gray-400 mt-1 uppercase">Apurado: {formatCurrency(row.val)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Gráfico de qualidade grande — abaixo dos dois cards */}
                            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-6">
                                <h3 className="font-bold text-white mb-5 uppercase tracking-wider text-sm">Distribuição de Qualidade (QTD Itens x Grade)</h3>
                                <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                                    <div className="w-56 h-56 flex-shrink-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={calculations.chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={5} dataKey="value" stroke="none">
                                                    {calculations.chartData.map((entry, i) => <Cell key={i} fill={calculations.COLORS[entry.name]} />)}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} formatter={(v) => [`${v} itens`, 'Quantidade']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                                        {calculations.chartData.map((d, i) => (
                                            <div key={i} className="bg-gray-900 border border-gray-700 rounded-xl p-3 flex flex-col justify-center">
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: calculations.COLORS[d.name] }}></div>
                                                        <span className="text-sm font-bold text-gray-300">Grade {d.name}</span>
                                                    </div>
                                                    <span className="font-black text-white">{d.value}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Categorias */}
                    {loteAtual.resumoCategorias?.length > 0 && (
                        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-gray-700 bg-gray-900/30">
                                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Distribuição Departamental (Resumo Oficial)</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Visão macrostática informada pela aba raiz do leilão.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-gray-900 border-b border-gray-700 text-gray-400 uppercase text-xs">
                                            <th className="px-5 py-3">Categoria</th>
                                            <th className="px-5 py-3 border-l border-gray-700 text-center">Qtd</th>
                                            <th className="px-5 py-3 border-l border-gray-700 text-right">Valor Mercado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loteAtual.resumoCategorias.map((cat, i) => {
                                            const subs = loteAtual.subItemsByCategory?.[cat.nome] || [];
                                            const isOpen = expandedCategories.has(cat.nome);
                                            return (
                                                <React.Fragment key={i}>
                                                    <tr onClick={() => subs.length > 0 && toggleCategory(cat.nome)} className={`border-b border-gray-700/50 ${subs.length > 0 ? 'cursor-pointer hover:bg-white/[0.03]' : ''}`}>
                                                        <td className="px-5 py-3 text-gray-300 font-medium flex items-center gap-2">
                                                            {subs.length > 0 && <span className={`text-gray-500 transition-transform inline-block ${isOpen ? 'rotate-90' : ''}`}>▶</span>}
                                                            {cat.nome}
                                                        </td>
                                                        <td className="px-5 py-3 border-l border-gray-700/50 text-center text-gray-400">{cat.qtd} un</td>
                                                        <td className="px-5 py-3 border-l border-gray-700/50 text-right font-bold text-emerald-400">{formatCurrency(cat.valor)}</td>
                                                    </tr>
                                                    {isOpen && subs.map((sub, si) => (
                                                        <tr key={si} className="border-b border-gray-700/30 bg-gray-900/40">
                                                            <td className="pl-10 pr-5 py-2 text-gray-400 text-xs"><span className="text-gray-600 mr-2">└</span>{sub.desc}</td>
                                                            <td className="px-5 py-2 border-l border-gray-700/30 text-center text-gray-500 text-xs">{sub.qtd} un</td>
                                                            <td className="px-5 py-2 border-l border-gray-700/30 text-right text-emerald-600 text-xs font-medium">{formatCurrency(sub.valor)}</td>
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

            {gradeModal && loteAtual && (
                <GradeItemsModal isOpen={true} onClose={() => setGradeModal(null)} title={gradeModal.title} grades={gradeModal.grades} items={loteAtual.rawItemsByGrade || []} />
            )}
        </div>
    );
}