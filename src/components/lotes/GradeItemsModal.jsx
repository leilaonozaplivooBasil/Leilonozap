import React from 'react';
import { X, Package } from 'lucide-react';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

const GRADE_COLORS = {
    A: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    B: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    C: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    D: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    E: 'text-red-400 bg-red-500/10 border-red-500/30',
    U: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
};

export default function GradeItemsModal({ isOpen, onClose, title, grades, items }) {
    if (!isOpen) return null;

    const filteredItems = items.filter(item => grades.includes(item.grade));
    const totalQtd = filteredItems.reduce((sum, i) => sum + (i.qtd || 1), 0);
    const totalValor = filteredItems.reduce((sum, i) => sum + (i.valor || 0), 0);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-[#30363d] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <Package size={20} className="text-blue-400" />
                        <div>
                            <h3 className="font-bold text-white text-lg">{title}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {filteredItems.length} itens • {totalQtd} unidades • {formatCurrency(totalValor)}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Badges das grades incluídas */}
                <div className="px-5 py-3 border-b border-[#30363d] flex flex-wrap gap-2 shrink-0">
                    {grades.map(g => (
                        <span key={g} className={`px-2.5 py-1 rounded-md text-xs font-bold border ${GRADE_COLORS[g] || GRADE_COLORS.U}`}>
                            Grade {g}
                        </span>
                    ))}
                </div>

                {/* Lista de itens */}
                <div className="flex-1 overflow-y-auto">
                    {filteredItems.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <p>Nenhum item encontrado para estas grades.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-[#0d1117] border-b border-[#30363d]">
                                <tr className="text-slate-400 uppercase tracking-wider text-xs">
                                    <th className="px-5 py-3 font-semibold">Grade</th>
                                    <th className="px-5 py-3 font-semibold">Descrição</th>
                                    <th className="px-5 py-3 font-semibold text-center w-20">Qtd</th>
                                    <th className="px-5 py-3 font-semibold text-right w-32">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item, i) => (
                                    <tr key={i} className="border-b border-[#30363d]/40 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${GRADE_COLORS[item.grade] || GRADE_COLORS.U}`}>
                                                {item.grade}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-slate-300">{item.desc || '—'}</td>
                                        <td className="px-5 py-3 text-center text-slate-400">{item.qtd}</td>
                                        <td className="px-5 py-3 text-right font-medium text-emerald-400">{formatCurrency(item.valor)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer com totais */}
                <div className="p-4 border-t border-[#30363d] flex justify-between items-center shrink-0 bg-[#0d1117]/50">
                    <span className="text-sm text-slate-400 font-semibold">Total</span>
                    <div className="flex items-center gap-6">
                        <span className="text-sm text-slate-300 font-bold">{totalQtd} un</span>
                        <span className="text-base text-emerald-400 font-black">{formatCurrency(totalValor)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}