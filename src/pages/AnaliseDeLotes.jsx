import React, { useState, useCallback, useMemo } from 'react';
import { fmtBR } from '@/lib/money';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

const Auction = base44.entities.Auction;
import { UploadCloud, FileSpreadsheet, AlertCircle, TrendingUp, AlertTriangle, Activity, DollarSign, BarChart3, Package, CheckCircle2, ShoppingBag, ArrowLeft, Eye } from 'lucide-react';
import GradeItemsModal from '../components/lotes/GradeItemsModal';
import VereditoMLCard from '../components/lotes/VereditoMLCard';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

function AnaliseDeLotes() {
    const navigate = useNavigate();
    const [lotesImportados, setLotesImportados] = useState([]);
    const [loteAtual, setLoteAtual] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPublishing, setIsPublishing] = useState(null);
    const [error, setError] = useState('');
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    const [gradeModal, setGradeModal] = useState(null);

    const toggleCategory = (nome) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            next.has(nome) ? next.delete(nome) : next.add(nome);
            return next;
        });
    };

    // Modelo de planilha selecionado
    const [modeloPlanilha, setModeloPlanilha] = useState('mercadolivre'); // 'mercadolivre' | 'casaevideo'

    // Campos manuais de data/hora do leilão (quando não detectados na planilha)
    const [dataLeilao, setDataLeilao] = useState('');
    const [horarioLeilao, setHorarioLeilao] = useState('');

    // Editable Financials
    const [arremateInputValue, setArremateInputValue] = useState('15639.00');
    const [taxaPct, setTaxaPct] = useState(7);
    const [frete, setFrete] = useState(1000.00);
    const [outros, setOutros] = useState(0);

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const parseCurrencyInput = (val) => {
        const numeric = parseFloat(String(val).replace(/[^\d.,-]/g, '').replace(',', '.'));
        return isNaN(numeric) ? 0 : numeric;
    };

    // Parser Casa e Vídeo: lê com header:1 (array), varre até achar a linha de cabeçalho real
    const processSheetDataCasaEVideo = (workbook, filename) => {
        const sheetName = workbook.SheetNames[0];
        const allRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });

        if (allRows.length === 0) {
            setError('Planilha Casa e Vídeo vazia ou sem dados.');
            return;
        }

        // Varre as primeiras 10 linhas para achar o cabeçalho real
        const normalize = (s) => String(s || '').toUpperCase().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        let headerIdx = -1;
        let headers = [];
        for (let i = 0; i < Math.min(10, allRows.length); i++) {
            const row = allRows[i];
            const normed = row.map(normalize);
            // Considera cabeçalho se encontrar DESCRI ou QTD ou MATERIAL
            if (normed.some(h => h.includes('DESCRI') || h.includes('QTD') || h.includes('MATERIAL'))) {
                headerIdx = i;
                headers = normed;
                break;
            }
        }

        if (headerIdx === -1) {
            setError('Planilha Casa e Vídeo: cabeçalho não encontrado nas primeiras 10 linhas.');
            return;
        }

        const colDesc  = headers.findIndex(h => h.includes('DESCRI'));
        const colQtd   = headers.findIndex(h => h.includes('QTD') || h.includes('QUANTIDADE'));
        const colValor = headers.findIndex(h => h.includes('VALOR') || h.includes('VENDA'));
        const colCat   = headers.findIndex(h => h.includes('CATEGOR'));

        if (colDesc === -1 || colValor === -1) {
            setError(`Planilha Casa e Vídeo: coluna DESCRIÇÃO ou VALOR não encontrada. Cabeçalhos: ${headers.join(', ')}`);
            return;
        }

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
            const valor = typeof rawVal === 'number'
                ? rawVal
                : parseFloat(String(rawVal).replace(/[R$\s]/g, '').replace(',', '.')) || 0;
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
            B: { qtd: 0, valorMarket: 0 },
            C: { qtd: 0, valorMarket: 0 },
            D: { qtd: 0, valorMarket: 0 },
            E: { qtd: 0, valorMarket: 0 },
            U: { qtd: 0, valorMarket: 0 },
        };

        const novoLote = {
            id: Date.now(),
            nomePlanilha: filename,
            nomeLote: filename.replace(/\.xlsx?$|\.csv$/i, ''),
            localColeta: 'Será informado após Arremate',
            resumoCategorias: Object.values(resumoCategorias),
            subItemsByCategory,
            quantidadeTotal: totalItemsQtd,
            valorMercadoTotal,
            classCount: { A: totalItemsQtd, B: 0, C: 0, D: 0, E: 0, U: 0 },
            gradesData,
            rawItemsByGrade
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
                const bstr = evt.target.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });

                if (modeloPlanilha === 'casaevideo') {
                    processSheetDataCasaEVideo(workbook, file.name);
                } else {
                    processSheetData(workbook, file.name);
                }
            } catch (err) {
                console.error(err);
                setError('Erro ao processar a planilha. Verifique se é um arquivo Excel válido.');
            } finally {
                setIsProcessing(false);
            }
        };

        reader.readAsBinaryString(file);
    }, [modeloPlanilha]);

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
        const rawItemsByGrade = [];

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

        // Pré-calcula coluna de descrição uma vez fora do loop
        const colDesc = normalizedHeaders.findIndex(h => h.includes('DESCRI') || h === 'ITEM' || h === 'PRODUTO' || h.includes('NOME DO PRODUTO'));

        const extractGradeLetter = (raw) => {
            const str = String(raw).toUpperCase().trim();
            // Se é exatamente uma letra de grade, retorna direto
            if (['A', 'B', 'C', 'D', 'E', 'U'].includes(str)) return str;
            // Se contém "CLASSE X" ou "GRADE X", extrai a última letra maiúscula relevante
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

            const descRaw = colDesc >= 0 ? row[colDesc] : null;
            rawItemsByGrade.push({
                grade: classificacao,
                desc: descRaw ? String(descRaw).trim() : `Item linha ${i + 1}`,
                qtd,
                valor
            });
        }

        // Extrair sub-itens por categoria
        const subItemsByCategory = {};
        if (wmsSheetData && headerRowIndex >= 0) {
            const catNamesSet = new Set(resumoCategorias.map(c => String(c.nome).trim().toLowerCase()));
            let detectedCatCol = -1;
            let detectedDescCol = -1;

            // 1. Tenta achar nos headers
            const headerRows = [
                wmsSheetData[headerRowIndex],
                headerRowIndex > 0 ? wmsSheetData[headerRowIndex - 1] : null
            ].filter(Boolean);

            for (const hRow of headerRows) {
                hRow.forEach((h, i) => {
                    if (typeof h !== 'string') return;
                    const hn = h.toUpperCase().trim();
                    if (hn.includes('CATEGOR') && !hn.includes('SUB') && detectedCatCol < 0) detectedCatCol = i;
                    if ((hn.includes('DESCRI') || hn === 'ITEM' || hn === 'PRODUTO' || hn.includes('NOME DO PRODUTO')) && detectedDescCol < 0) detectedDescCol = i;
                });
            }

            // 2. Fallback: varre as primeiras 5 linhas de dados para encontrar valores que casam com nomes de categorias
            if (detectedCatCol < 0) {
                for (let scanRow = headerRowIndex + 1; scanRow < Math.min(headerRowIndex + 6, wmsSheetData.length); scanRow++) {
                    const row = wmsSheetData[scanRow];
                    if (!row) continue;
                    row.forEach((cell, idx) => {
                        if (detectedCatCol >= 0) return;
                        if (cell && typeof cell === 'string' && catNamesSet.has(cell.trim().toLowerCase())) {
                            detectedCatCol = idx;
                        }
                    });
                    if (detectedCatCol >= 0) break;
                }
            }

            // 3. Fallback para descrição: usa a primeira coluna com texto longo que NÃO é a coluna de categoria
            if (detectedDescCol < 0 && wmsSheetData[headerRowIndex + 1]) {
                const sampleRow = wmsSheetData[headerRowIndex + 1];
                for (let idx = 0; idx < sampleRow.length; idx++) {
                    if (idx === detectedCatCol || idx === colClass || idx === colValue || idx === colQtd) continue;
                    const cell = sampleRow[idx];
                    if (cell && typeof cell === 'string' && cell.trim().length > 5) {
                        detectedDescCol = idx;
                        break;
                    }
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
                    const valor = rawValor != null
                        ? (typeof rawValor === 'number' ? rawValor : parseFloat(String(rawValor).replace(/[R$\s]/g, '').replace(',', '.')) || 0)
                        : 0;

                    if (!subItemsByCategory[catRaw]) subItemsByCategory[catRaw] = [];
                    subItemsByCategory[catRaw].push({ desc, qtd: qtdVal, valor });
                }
            }
        }

        const novoLote = {
            id: Date.now(),
            nomePlanilha: filename,
            nomeLote: filename.replace(/\.xlsx?$/, ''),
            localColeta,
            resumoCategorias,
            subItemsByCategory,
            quantidadeTotal: totalItemsQtd,
            valorMercadoTotal: referenceMarketValue !== null && referenceMarketValue > 0 ? referenceMarketValue : valorMercadoTotal,
            classCount,
            gradesData,
            rawItemsByGrade
        };
        setLotesImportados(prev => [...prev, novoLote]);
        setLoteAtual(novoLote);

    };


    // --- CALCULATIONS MEMOIZED ---
    const calculations = useMemo(() => {
        if (!loteAtual) return null;

        const valorArrematado = parseCurrencyInput(arremateInputValue);
        const taxaValor = valorArrematado * (taxaPct / 100);
        const custoTotal = valorArrematado + taxaValor + frete + outros;

        const vm = loteAtual.valorMercadoTotal;

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

        const chartData = Object.entries(loteAtual.classCount)
            .filter(([k, v]) => v > 0)
            .map(([name, value]) => ({ name, value }));

        const COLORS = {
            A: '#10b981', B: '#3b82f6', C: '#eab308',
            D: '#f97316', E: '#ef4444', U: '#64748b'
        };

        // Custom metrics A+B, A+B+C, A+B+C+D
        const g = loteAtual.gradesData;

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

        const qtdALL = loteAtual.quantidadeTotal;
        const valALL = loteAtual.valorMercadoTotal;
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
    }, [loteAtual, arremateInputValue, taxaPct, frete, outros]);


    return (
        <div className="min-h-screen bg-[#0d1117] text-slate-200 p-4 font-sans selection:bg-blue-500/30">
            <div className="max-w-7xl mx-auto">
                <header className="mb-10 text-center flex flex-col items-center">
                    <button
                        onClick={() => navigate(createPageUrl('SistemaDeArremate'))}
                        className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                    >
                        <ArrowLeft size={14} /> Voltar
                    </button>
                    <div className="inline-flex items-center gap-3 mb-3 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 shadow-sm">
                        <BarChart3 size={18} className="text-blue-400" />
                        <span className="text-sm font-semibold tracking-wide text-slate-300">AVALIADOR INTELIGENTE DE LEILÕES</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-blue-300 via-indigo-400 to-purple-500 mb-4 pb-1">
                        Análise Estratégica
                    </h1>
                </header>

                <div className="space-y-6">
                    {/* UPLOAD SECTION */}
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-12 text-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none group-hover:bg-blue-500/20 transition-all duration-700"></div>

                        <div className="max-w-md mx-auto relative z-10">
                            <div className="w-24 h-24 bg-[#0d1117] border border-[#30363d] text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner rotate-3 group-hover:rotate-6 transition-transform">
                                <UploadCloud size={40} className="drop-shadow-lg" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-white">Importar Lotes</h3>
                            <p className="text-slate-400 mb-6 max-w-[280px] mx-auto text-sm leading-relaxed">
                                Carregue uma ou mais planilhas Excel ou CSV para análise. Elas aparecerão na lista abaixo.
                            </p>

                            {/* SELETOR DE MODELO */}
                            <div className="flex gap-2 mb-6 p-1 bg-[#0d1117] border border-[#30363d] rounded-xl">
                                <button
                                    onClick={() => setModeloPlanilha('mercadolivre')}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${modeloPlanilha === 'mercadolivre' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    🛒 Mercado Livre
                                </button>
                                <button
                                    onClick={() => setModeloPlanilha('casaevideo')}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${modeloPlanilha === 'casaevideo' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    🏪 Casa & Vídeo
                                </button>
                            </div>

                            <label className="relative overflow-hidden cursor-pointer flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 hover:from-blue-500 to-indigo-600 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 w-full hover:-translate-y-0.5">
                                <FileSpreadsheet size={20} />
                                <span>Selecionar Arquivo (Excel ou CSV)</span>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
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

                    {/* LOTES IMPORTADOS LIST */}
                    {lotesImportados.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white">Lotes Importados ({lotesImportados.length})</h2>
                                <button
                                    onClick={() => { setLotesImportados([]); setLoteAtual(null); setDataLeilao(''); setHorarioLeilao(''); }}
                                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                >
                                    Limpar Tudo
                                </button>
                            </div>
                            {lotesImportados.map((lote) => (
                                <div
                                    key={lote.id}
                                    onClick={() => setLoteAtual(lote)}
                                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                                        loteAtual?.id === lote.id
                                            ? 'bg-[#161b22] border-blue-500/50 shadow-lg shadow-blue-500/10'
                                            : 'bg-[#161b22] border-[#30363d] hover:border-blue-500/30'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-white text-base">{lote.nomeLote}</p>
                                            <p className="text-xs text-slate-500 mt-1">{lote.quantidadeTotal} itens • {formatCurrency(lote.valorMercadoTotal)}</p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLotesImportados(prev => prev.filter(l => l.id !== lote.id));
                                                if (loteAtual?.id === lote.id) setLoteAtual(null);
                                            }}
                                            className="text-slate-500 hover:text-red-400 text-sm font-semibold transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {loteAtual && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-forwards">

                        {/* HEADER DASHBOARD */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl">

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                                    <Package className="text-blue-500" size={24} />
                                    {loteAtual.nomeLote}
                                </h2>
                                <p className="text-slate-400 text-sm flex items-center gap-2 mb-2">
                                    <CheckCircle2 size={14} className="text-emerald-500" /> Planilha importada e processada com sucesso
                                </p>
                                {loteAtual.localColeta && (
                                    <div className="inline-block mt-1 px-3 py-1 bg-blue-900/30 border border-blue-800/50 rounded-md text-xs text-blue-300 font-medium">
                                        📍 Retirada: {loteAtual.localColeta}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-3 mt-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Data do Leilão</label>
                                        <input type="date" value={dataLeilao} onChange={e => setDataLeilao(e.target.value)} className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Horário do Leilão</label>
                                        <input type="time" value={horarioLeilao} onChange={e => setHorarioLeilao(e.target.value)} className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    disabled={isPublishing === loteAtual.id}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                                    onClick={async () => {
                                        if (!loteAtual || !calculations) return;
                                        setIsPublishing(loteAtual.id);
                                        let endTime;
                                        if (dataLeilao && horarioLeilao) {
                                            endTime = new Date(`${dataLeilao}T${horarioLeilao}:00`);
                                        } else if (dataLeilao) {
                                            endTime = new Date(`${dataLeilao}T12:00:00`);
                                        } else {
                                            endTime = new Date();
                                            endTime.setDate(endTime.getDate() + 30);
                                        }
                                        await Auction.create({
                                            title: loteAtual.nomeLote,
                                            description: `Local de Retirada: ${loteAtual.localColeta}\nTotal de Itens: ${loteAtual.quantidadeTotal}\nValor de Mercado: R$ ${fmtBR(loteAtual.valorMercadoTotal)}`,
                                            starting_price: calculations.custoTotal,
                                            current_price: calculations.custoTotal,
                                            increment: 100,
                                            end_time: endTime.toISOString(),
                                            status: 'active',
                                            is_investment_plan: true,
                                            market_price: loteAtual.valorMercadoTotal,
                                            manual_market_price: loteAtual.valorMercadoTotal,
                                            lot_categories_json: loteAtual.resumoCategorias && loteAtual.resumoCategorias.length > 0
                                                ? JSON.stringify(loteAtual.resumoCategorias)
                                                : null,
                                            lot_items_json: loteAtual.subItemsByCategory && Object.keys(loteAtual.subItemsByCategory).length > 0
                                                ? JSON.stringify(loteAtual.subItemsByCategory)
                                                : null,
                                            lot_grades_json: loteAtual.gradesData
                                                ? JSON.stringify(loteAtual.gradesData)
                                                : null,
                                            lot_raw_items_json: loteAtual.rawItemsByGrade && loteAtual.rawItemsByGrade.length > 0
                                                ? JSON.stringify(loteAtual.rawItemsByGrade)
                                                : null,
                                        });
                                        const newLotes = lotesImportados.filter(l => l.id !== loteAtual.id);
                                        setLotesImportados(newLotes);
                                        setLoteAtual(newLotes[0] || null);
                                        setDataLeilao('');
                                        setHorarioLeilao('');
                                        setIsPublishing(null);
                                        navigate(createPageUrl('GestaoLotes'));
                                    }}
                                >
                                    <ShoppingBag size={15} /> {isPublishing === loteAtual.id ? 'Publicando...' : 'Publicar no Marketplace'}
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
                                { label: "Total de Itens (Qtd)", val: loteAtual.quantidadeTotal, prefix: "", color: "border-l-blue-500", anchor: "distribuicao-departamental" },
                                { label: "Valor de Mercado Total", val: formatCurrency(loteAtual.valorMercadoTotal), color: "border-l-emerald-500" },
                                { label: "Ticket Avaliado (Mercado)", val: formatCurrency(loteAtual.quantidadeTotal ? loteAtual.valorMercadoTotal / loteAtual.quantidadeTotal : 0), color: "border-l-indigo-500" },
                                { label: "Custo Total Lote", val: formatCurrency(calculations.custoTotal), color: "border-l-amber-500" },
                                { label: "Custo Médio p/ Unidade", val: formatCurrency(loteAtual.quantidadeTotal ? calculations.custoTotal / loteAtual.quantidadeTotal : 0), color: "border-l-red-500", highlight: true },
                            ].map((kpi, i) => (
                                <div
                                    key={i}
                                    className={`bg-[#161b22] p-6 rounded-2xl border border-[#30363d] border-l-4 ${kpi.color} shadow-lg relative overflow-hidden group ${kpi.anchor ? 'cursor-pointer hover:border-blue-500/50' : ''}`}
                                    onClick={() => kpi.anchor && document.getElementById(kpi.anchor)?.scrollIntoView({ behavior: 'smooth' })}
                                >
                                    <div className="relative z-10">
                                        <p className="text-slate-400 text-xs font-bold mb-1 tracking-wider uppercase">{kpi.label} {kpi.anchor ? '↓' : ''}</p>
                                        <p className={`text-3xl font-black tracking-tight ${kpi.highlight ? 'text-white' : 'text-slate-200'}`}>{kpi.val}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* VEREDITO ML — auditoria macro do lote contra o Mercado Livre */}
                        <VereditoMLCard
                            itens={loteAtual.rawItemsByGrade || []}
                            totalPlanilha={loteAtual.valorMercadoTotal || 0}
                        />

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
                                                { label: "Somente Grupo A", desc: `Equivale a ${calculations.qtdA} produtos originais/intactos`, tm: calculations.tmA, val: calculations.valA, color: "border-l-blue-400", grades: ['A'] },
                                                { label: "Grupo A + B", desc: `Equivale a ${calculations.qtdAB} produtos vitrine`, tm: calculations.tmAB, val: calculations.valAB, color: "border-l-[#10b981]", grades: ['A', 'B'] },
                                                { label: "Grupo A + B + C", desc: `Equivale a ${calculations.qtdABC} produtos úteis`, tm: calculations.tmABC, val: calculations.valABC, color: "border-l-[#eab308]", grades: ['A', 'B', 'C'] },
                                                { label: "Grupo A + B + C + D", desc: `Equivale a ${calculations.qtdABCD} produtos escoáveis`, tm: calculations.tmABCD, val: calculations.valABCD, color: "border-l-[#f97316]", grades: ['A', 'B', 'C', 'D'] },
                                                { label: "Todos os Grupos (A+B+C+D+E+U)", desc: `Equivale ao lote inteiro (${calculations.qtdALL} produtos)`, tm: calculations.tmALL, val: calculations.valALL, color: "border-l-slate-400", grades: ['A', 'B', 'C', 'D', 'E', 'U'] },
                                            ].map((tmData, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => setGradeModal({ title: tmData.label, grades: tmData.grades })}
                                                    className={`bg-[#0d1117] border border-[#30363d] border-l-4 ${tmData.color} rounded-lg p-3 flex justify-between items-center cursor-pointer hover:bg-white/[0.04] hover:border-blue-500/30 transition-all group`}
                                                >
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                                                            {tmData.label}
                                                            <Eye size={12} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </p>
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
                            {loteAtual.resumoCategorias && loteAtual.resumoCategorias.length > 0 && (
                                <div className="xl:col-span-3" id="distribuicao-departamental">
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
                                                        <th className="px-6 py-4 font-semibold text-xs border-l border-[#30363d] w-48 text-right">Valor de Mercado</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {loteAtual.resumoCategorias.map((cat, i) => {
                                                        const subs = loteAtual.subItemsByCategory?.[cat.nome] || [];
                                                        const isOpen = expandedCategories.has(cat.nome);
                                                        return (
                                                            <React.Fragment key={i}>
                                                                <tr
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
                                                            </React.Fragment>
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
            {gradeModal && loteAtual && (
                <GradeItemsModal
                    isOpen={true}
                    onClose={() => setGradeModal(null)}
                    title={gradeModal.title}
                    grades={gradeModal.grades}
                    items={loteAtual.rawItemsByGrade || []}
                />
            )}
        </div>
    );
}

export default AnaliseDeLotes;