import React from 'react';
import { Activity, Eye } from 'lucide-react';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

const GRADE_BORDER_COLORS = {
    A: 'border-l-blue-400',
    AB: 'border-l-emerald-500',
    ABC: 'border-l-yellow-500',
    ABCD: 'border-l-orange-500',
    ALL: 'border-l-slate-400',
};

export default function GradeTicketSection({ gradesData, onGradeClick }) {
    if (!gradesData) return null;

    const g = gradesData;
    const safeG = (key) => ({ qtd: g[key]?.qtd || 0, valorMarket: g[key]?.valorMarket || 0 });

    const A = safeG('A');
    const B = safeG('B');
    const C = safeG('C');
    const D = safeG('D');
    const E = safeG('E');
    const U = safeG('U');

    const qtdA = A.qtd;
    const valA = A.valorMarket;
    const tmA = qtdA > 0 ? valA / qtdA : 0;

    const qtdAB = A.qtd + B.qtd;
    const valAB = A.valorMarket + B.valorMarket;
    const tmAB = qtdAB > 0 ? valAB / qtdAB : 0;

    const qtdABC = qtdAB + C.qtd;
    const valABC = valAB + C.valorMarket;
    const tmABC = qtdABC > 0 ? valABC / qtdABC : 0;

    const qtdABCD = qtdABC + D.qtd;
    const valABCD = valABC + D.valorMarket;
    const tmABCD = qtdABCD > 0 ? valABCD / qtdABCD : 0;

    const qtdALL = qtdABCD + E.qtd + U.qtd;
    const valALL = valABCD + E.valorMarket + U.valorMarket;
    const tmALL = qtdALL > 0 ? valALL / qtdALL : 0;

    const groups = [
        { label: "Somente Grupo A", desc: `${qtdA} produtos originais/intactos`, tm: tmA, val: valA, color: GRADE_BORDER_COLORS.A, grades: ['A'] },
        { label: "Grupo A + B", desc: `${qtdAB} produtos vitrine`, tm: tmAB, val: valAB, color: GRADE_BORDER_COLORS.AB, grades: ['A', 'B'] },
        { label: "Grupo A + B + C", desc: `${qtdABC} produtos úteis`, tm: tmABC, val: valABC, color: GRADE_BORDER_COLORS.ABC, grades: ['A', 'B', 'C'] },
        { label: "Grupo A + B + C + D", desc: `${qtdABCD} produtos escoáveis`, tm: tmABCD, val: valABCD, color: GRADE_BORDER_COLORS.ABCD, grades: ['A', 'B', 'C', 'D'] },
        { label: "Todos os Grupos (A+B+C+D+E+U)", desc: `Lote inteiro (${qtdALL} produtos)`, tm: tmALL, val: valALL, color: GRADE_BORDER_COLORS.ALL, grades: ['A', 'B', 'C', 'D', 'E', 'U'] },
    ];

    // Se não há itens em nenhuma grade, não exibe a seção
    if (qtdALL === 0) return null;

    return (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl p-6">
            <h3 className="font-bold text-white mb-2 uppercase tracking-wider text-sm flex items-center gap-2">
                <Activity size={16} className="text-blue-400" />
                Análise de Ticket Médio por Grade
            </h3>
            <p className="text-xs text-slate-400 mb-5">Valor médio dos produtos agrupados por qualidade superior.</p>

            <div className="space-y-3">
                {groups.map((tmData, idx) => (
                    <div
                        key={idx}
                        onClick={() => onGradeClick?.({ title: tmData.label, grades: tmData.grades })}
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
    );
}