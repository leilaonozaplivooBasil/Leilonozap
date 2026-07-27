import React from 'react';
import { X, Package } from 'lucide-react';
import MLValidationButton from './MLValidationButton';

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
    const [activeGrade, setActiveGrade] = React.useState(null);

    if (!isOpen) return null;

    const allItems = items.filter(item => grades.includes(item.grade));
    const displayItems = activeGrade ? allItems.filter(item => item.grade === activeGrade) : allItems;
    const totalQtd = displayItems.reduce((sum, i) => sum + (i.qtd || 1), 0);
    const totalValor = displayItems.reduce((sum, i) => sum + (i.valor || 0), 0);

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
                                {activeGrade
                                    ? `Grade ${activeGrade}: ${displayItems.length} itens • ${totalQtd} unidades • ${formatCurrency(totalValor)}`
                                    : `${allItems.length} itens • ${allItems.reduce((s, i) => s + (i.qtd || 1), 0)} unidades • ${formatCurrency(allItems.reduce((s, i) => s + (i.valor || 0), 0))}`
                                }
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Filtros por grade */}
                <div className="px-5 py-3 border-b border-[#30363d] flex flex-wrap gap-2 shrink-0">
                    <button
                        onClick={() => setActiveGrade(null)}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${
                            !activeGrade
                                ? 'bg-white/10 border-white/30 text-white'
                                : 'border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-400'
                        }`}
                    >
                        Todos
                    </button>
                    {grades.map(g => {
                        const isActive = activeGrade === g;
                        return (
                            <button
                                key={g}
                                onClick={() => setActiveGrade(isActive ? null : g)}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${
                                    isActive
                                        ? GRADE_COLORS[g] || GRADE_COLORS.U
                                        : 'border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-400'
                                }`}
                            >
                                Grade {g}
                            </button>
                        );
                    })}
                </div>

                {/* Lista de itens */}
                <div className="flex-1 overflow-y-auto">
                    {displayItems.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <p className="text-base font-semibold mb-1">Nenhum item do Grupo {activeGrade || ''}</p>
                            <p className="text-sm">Não há itens classificados nesta grade neste lote.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-[#0d1117] border-b border-[#30363d]">
                                <tr className="text-slate-400 uppercase tracking-wider text-xs">
                                    <th className="px-5 py-3 font-semibold">Grade</th>
                                    <th className="px-5 py-3 font-semibold">Descrição</th>
                                    <th className="px-5 py-3 font-semibold text-center w-20">Qtd</th>
                                    <th className="px-5 py-3 font-semibold text-right w-32">Valor</th>
                                    <th className="px-5 py-3 font-semibold text-right w-44">ML Real</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayItems.map((item, i) => (
                                    <tr key={i} className="border-b border-[#30363d]/40 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${GRADE_COLORS[item.grade] || GRADE_COLORS.U}`}>
                                                {item.grade}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-slate-300">{item.desc || '—'}</td>
                                        <td className="px-5 py-3 text-center text-slate-400">{item.qtd}</td>
                                        <td className="px-5 py-3 text-right font-medium text-emerald-400">{formatCurrency(item.valor)}</td>
                                        <td className="px-5 py-3 text-right">
                                            <MLValidationButton descricao={item.desc} valorPlanilha={item.valor} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer com totais */}
                <div className="p-4 border-t border-[#30363d] flex justify-between items-center shrink-0 bg-[#0d1117]/50">
                    <span className="text-sm text-slate-400 font-semibold">Total{activeGrade ? ` Grade ${activeGrade}` : ''}</span>
                    <div className="flex items-center gap-6">
                        <span className="text-sm text-slate-300 font-bold">{totalQtd} un</span>
                        <span className="text-base text-emerald-400 font-black">{formatCurrency(totalValor)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}