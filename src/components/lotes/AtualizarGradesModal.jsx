import React, { useState, useCallback } from 'react';
import { X, UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx';

const Auction = base44.entities.Auction;

export default function AtualizarGradesModal({ isOpen, onClose, lote, onSuccess }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleFileUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (!file || !lote) return;

        setIsProcessing(true);
        setError('');
        setSuccess(false);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });

                // Mesma lógica de extração de grades do AnaliseDeLotes
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
                    setError("Não foi possível identificar grades na planilha.");
                    setIsProcessing(false);
                    return;
                }

                const gradesData = {
                    A: { qtd: 0, valorMarket: 0 },
                    B: { qtd: 0, valorMarket: 0 },
                    C: { qtd: 0, valorMarket: 0 },
                    D: { qtd: 0, valorMarket: 0 },
                    E: { qtd: 0, valorMarket: 0 },
                    U: { qtd: 0, valorMarket: 0 },
                };
                const rawItemsByGrade = [];

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
                    let qtd = 1;
                    if (colQtd >= 0 && row[colQtd] != null) qtd = parseInt(row[colQtd]) || 1;

                    let valor = 0;
                    if (colValue >= 0 && row[colValue] != null) {
                        const rawVal = row[colValue];
                        if (typeof rawVal === 'number') valor = rawVal;
                        else if (typeof rawVal === 'string') valor = parseFloat(rawVal.replace(/[R$\s]/g, '').replace(',', '.')) || 0;
                    }

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

                const totalItems = Object.values(gradesData).reduce((s, g) => s + g.qtd, 0);
                if (totalItems === 0) {
                    setError("Nenhum item com grade encontrado na planilha.");
                    setIsProcessing(false);
                    return;
                }

                // Atualiza o lote no banco
                await Auction.update(lote.id, {
                    lot_grades_json: JSON.stringify(gradesData),
                    lot_raw_items_json: JSON.stringify(rawItemsByGrade),
                });

                setSuccess(true);
                setTimeout(() => {
                    onSuccess?.();
                    onClose();
                }, 1500);
            } catch (err) {
                console.error(err);
                setError('Erro ao processar planilha: ' + err.message);
            } finally {
                setIsProcessing(false);
            }
        };

        reader.readAsBinaryString(file);
    }, [lote, onClose, onSuccess]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-[#30363d] flex items-center justify-between">
                    <h3 className="font-bold text-white">Atualizar Grades do Lote</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X size={18} className="text-slate-400" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-400">
                        Reimporte a planilha Excel original para popular os dados de grade (A, B, C, D, E) no lote <strong className="text-white">{lote?.title}</strong>.
                    </p>

                    {success ? (
                        <div className="flex items-center gap-3 p-4 bg-emerald-900/30 border border-emerald-500/50 rounded-xl text-emerald-400">
                            <CheckCircle2 size={20} />
                            <span className="font-semibold">Grades atualizadas com sucesso!</span>
                        </div>
                    ) : (
                        <label className="relative overflow-hidden cursor-pointer flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all w-full">
                            <FileSpreadsheet size={18} />
                            <span>{isProcessing ? 'Processando...' : 'Selecionar Planilha Excel'}</span>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileUpload}
                                disabled={isProcessing}
                            />
                        </label>
                    )}

                    {isProcessing && (
                        <div className="flex items-center justify-center gap-2 text-blue-400 text-sm">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Extraindo grades...
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-950/40 border border-red-900/50 text-red-400 rounded-xl flex items-center gap-2 text-sm">
                            <AlertCircle size={16} className="shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}