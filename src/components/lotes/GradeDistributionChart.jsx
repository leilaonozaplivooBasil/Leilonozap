import React from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const COLORS = {
    A: '#10b981', B: '#3b82f6', C: '#eab308',
    D: '#f97316', E: '#ef4444', U: '#64748b'
};

export default function GradeDistributionChart({ gradesData }) {
    if (!gradesData) return null;

    const chartData = Object.entries(gradesData)
        .filter(([, v]) => v.qtd > 0)
        .map(([name, v]) => ({ name, value: v.qtd }));

    if (chartData.length === 0) return null;

    return (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl p-6">
            <h3 className="font-bold text-white mb-5 uppercase tracking-wider text-sm">Distribuição de Qualidade (QTD Itens x Grade)</h3>
            <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                <div className="w-56 h-56 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={95}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
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
                    {chartData.map((d, i) => (
                        <div key={i} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex flex-col justify-center">
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[d.name] }}></div>
                                    <span className="text-sm font-bold text-slate-300">Grade {d.name}</span>
                                </div>
                                <span className="font-black text-white">{d.value}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}