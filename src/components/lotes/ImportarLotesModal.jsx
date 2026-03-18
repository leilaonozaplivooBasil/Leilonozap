import React, { useState, useCallback, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, AlertCircle, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const Auction = base44.entities.Auction;

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

function parseWorkbook(workbook, filename) {
    let localColeta = 'Será informado após Arremate';
    const resumoCategorias = [];
    let referenceMarketValue = null;

    if (workbook.Sheets['Complemento']) {
        const compData = XLSX.utils.sheet_to_json(workbook.Sheets['Complemento'], { header: 1 });
        const localRow = compData.find(row => row && row[0] && typeof row[0] === 'string' && row[0].includes('Local de Carregamento'));
        if (localRow && localRow[1]) localColeta = String(localRow[1]).trim();
    }

    let resSheetName = workbook.SheetNames.find(s => s.toUpperCase().includes('RESUMO'));
    if (resSheetName) {
        const resData = XLSX.utils.sheet_to_json(workbook.Sheets[resSheetName], { header: 1 });
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

    let wmsSheetData = null;
    let headerRowIndex = -1;
    let headers = [];

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
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
        return { error: 'Não foi possível identificar os produtos na planilha.' };
    }

    let valorMercadoTotal = 0;
    let totalItemsQtd = 0;

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

        let qtd = 1;
        if (colQtd >= 0 && row[colQtd] != null) qtd = parseInt(row[colQtd]) || 1;

        let valor = 0;
        if (colValue >= 0 && row[colValue] != null) {
            const rawVal = row[colValue];
            if (typeof rawVal === 'number') valor = rawVal;
            else if (typeof rawVal === 'string') valor = parseFloat(rawVal.replace(/[R$\s]/g, '').replace(',', '.')) || 0;
        }

        valorMercadoTotal += valor;
        totalItemsQtd += qtd;
    }

    return {
        id: Date.now() + Math.random(),
        nomePlanilha: filename,
        nomeLote: filename.replace(/\.xlsx?$/i, ''),
        localColeta,
        resumoCategorias,
        quantidadeTotal: totalItemsQtd,
        valorMercadoTotal: referenceMarketValue > 0 ? referenceMarketValue : valorMercadoTotal,
        status: 'pendente', // pendente | publicando | publicado | erro
    };
}

export default function ImportarLotesModal({ isOpen, onClose, onPublished }) {
    const [lotes, setLotes] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [publishingId, setPublishingId] = useState(null);
    const fileInputRef = useRef(null);

    const handleFiles = useCallback((e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setIsProcessing(true);

        const promises = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const workbook = XLSX.read(evt.target.result, { type: 'binary' });
                        const result = parseWorkbook(workbook, file.name);
                        resolve(result);
                    } catch {
                        resolve({ error: `Erro ao ler ${file.name}`, nomePlanilha: file.name });
                    }
                };
                reader.readAsBinaryString(file);
            });
        });

        Promise.all(promises).then(results => {
            const valid = results.filter(r => !r.error);
            const errors = results.filter(r => r.error);
            if (errors.length > 0) {
                toast.error(`${errors.length} planilha(s) com erro de leitura.`);
            }

            // Deduplica primeiro dentro do próprio lote selecionado
            const deduplicados = [];
            for (const l of valid) {
                const dupNome = deduplicados.find(d => d.nomePlanilha === l.nomePlanilha);
                const dupConteudo = deduplicados.find(d =>
                    d.quantidadeTotal === l.quantidadeTotal &&
                    Math.abs(d.valorMercadoTotal - l.valorMercadoTotal) < 1
                );
                if (dupNome) {
                    toast.error(`"${l.nomePlanilha}" duplicada na seleção — ignorada.`);
                } else if (dupConteudo) {
                    toast.error(`"${l.nomePlanilha}" tem o mesmo conteúdo de "${dupConteudo.nomeLote}" — ignorada.`);
                } else {
                    deduplicados.push(l);
                }
            }

            setLotes(prev => {
                const novas = deduplicados.filter(l => {
                    const nomeDup = prev.find(p => p.nomePlanilha === l.nomePlanilha);
                    if (nomeDup) {
                        toast.error(`"${l.nomePlanilha}" já foi importada.`);
                        return false;
                    }
                    const conteudoDup = prev.find(p =>
                        p.quantidadeTotal === l.quantidadeTotal &&
                        Math.abs(p.valorMercadoTotal - l.valorMercadoTotal) < 1
                    );
                    if (conteudoDup) {
                        toast.error(`"${l.nomePlanilha}" tem o mesmo conteúdo de "${conteudoDup.nomeLote}" já importado.`);
                        return false;
                    }
                    return true;
                });
                return [...prev, ...novas];
            });
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        });
    }, []);

    const removeLote = (id) => {
        setLotes(prev => prev.filter(l => l.id !== id));
    };

    const publicarLote = async (lote) => {
        setPublishingId(lote.id);
        try {
            const endTime = new Date();
            endTime.setDate(endTime.getDate() + 30);

            await Auction.create({
                title: lote.nomeLote,
                description: `Local de Retirada: ${lote.localColeta}\nTotal de Itens: ${lote.quantidadeTotal}\nValor de Mercado: R$ ${lote.valorMercadoTotal.toFixed(2)}`,
                starting_price: lote.valorMercadoTotal * 0.3,
                current_price: lote.valorMercadoTotal * 0.3,
                increment: 100,
                end_time: endTime.toISOString(),
                status: 'active',
                is_investment_plan: true,
                market_price: lote.valorMercadoTotal,
                manual_market_price: lote.valorMercadoTotal,
                lot_categories_json: lote.resumoCategorias?.length > 0 ? JSON.stringify(lote.resumoCategorias) : null,
            });

            setLotes(prev => prev.map(l => l.id === lote.id ? { ...l, status: 'publicado' } : l));
            toast.success(`Lote "${lote.nomeLote}" publicado.`);
            onPublished?.();
        } catch (err) {
            toast.error(`Erro ao publicar "${lote.nomeLote}": ${err.message}`);
            setLotes(prev => prev.map(l => l.id === lote.id ? { ...l, status: 'erro' } : l));
        } finally {
            setPublishingId(null);
        }
    };

    const publicarTodos = async () => {
        const pendentes = lotes.filter(l => l.status === 'pendente');
        for (const lote of pendentes) {
            await publicarLote(lote);
        }
    };

    if (!isOpen) return null;

    const pendentes = lotes.filter(l => l.status === 'pendente');

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#30363d]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                            <UploadCloud size={20} className="text-amber-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">Importar Lotes</h3>
                            <p className="text-xs text-slate-400">Importe uma ou mais planilhas Excel</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Upload area */}
                    <label className="block border-2 border-dashed border-[#30363d] hover:border-amber-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors group">
                        <FileSpreadsheet size={36} className="mx-auto mb-3 text-slate-500 group-hover:text-amber-400 transition-colors" />
                        <p className="text-sm font-semibold text-white mb-1">Clique para selecionar planilhas</p>
                        <p className="text-xs text-slate-500">Arquivos .xlsx ou .xls (múltiplos permitidos)</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            multiple
                            className="hidden"
                            onChange={handleFiles}
                            disabled={isProcessing}
                        />
                    </label>

                    {isProcessing && (
                        <div className="flex items-center justify-center gap-2 text-amber-400 py-4">
                            <Loader2 size={18} className="animate-spin" />
                            <span className="text-sm font-medium">Processando planilhas...</span>
                        </div>
                    )}

                    {/* Lotes list */}
                    {lotes.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-white">Lotes Importados ({lotes.length})</p>
                                {lotes.length > 0 && (
                                    <button
                                        onClick={() => setLotes([])}
                                        className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                        Limpar tudo
                                    </button>
                                )}
                            </div>

                            {lotes.map(lote => (
                                <div key={lote.id} className={`p-4 rounded-xl border transition-all ${
                                    lote.status === 'publicado'
                                        ? 'bg-emerald-900/10 border-emerald-500/30'
                                        : lote.status === 'erro'
                                            ? 'bg-red-900/10 border-red-500/30'
                                            : 'bg-[#0d1117] border-[#30363d]'
                                }`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {lote.status === 'publicado' && <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />}
                                                {lote.status === 'erro' && <AlertCircle size={14} className="text-red-400 flex-shrink-0" />}
                                                <p className="font-semibold text-white text-sm truncate">{lote.nomeLote}</p>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                {lote.quantidadeTotal} itens • VM: {formatCurrency(lote.valorMercadoTotal)}
                                            </p>
                                            {lote.localColeta && lote.localColeta !== 'Será informado após Arremate' && (
                                                <p className="text-xs text-blue-400 mt-1">📍 {lote.localColeta}</p>
                                            )}
                                            {lote.resumoCategorias?.length > 0 && (
                                                <p className="text-xs text-slate-600 mt-1">{lote.resumoCategorias.length} categorias detectadas</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {lote.status === 'pendente' && (
                                                <>
                                                    <button
                                                        onClick={() => publicarLote(lote)}
                                                        disabled={publishingId === lote.id}
                                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                                    >
                                                        {publishingId === lote.id ? <Loader2 size={12} className="animate-spin" /> : null}
                                                        Publicar
                                                    </button>
                                                    <button
                                                        onClick={() => removeLote(lote.id)}
                                                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                            {lote.status === 'publicado' && (
                                                <span className="text-xs text-emerald-400 font-bold">Publicado</span>
                                            )}
                                            {lote.status === 'erro' && (
                                                <button
                                                    onClick={() => publicarLote(lote)}
                                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors"
                                                >
                                                    Tentar novamente
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {lotes.length === 0 && !isProcessing && (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            Nenhuma planilha importada ainda.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#30363d] flex items-center justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                    >
                        Fechar
                    </button>
                    {pendentes.length > 1 && (
                        <button
                            onClick={publicarTodos}
                            disabled={!!publishingId}
                            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
                        >
                            Publicar Todos ({pendentes.length})
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}