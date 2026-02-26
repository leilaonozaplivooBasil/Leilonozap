import React, { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, PieChart, BarChart3, 
  AlertTriangle, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight 
} from "lucide-react";
import moment from "moment";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend } from "recharts";

const STATUS_LABELS = { pendente: "Pendente", pago_integral: "Pago", pago_parcial: "Parcial", vencido: "Vencido", cancelado: "Cancelado" };
const TYPE_LABELS = { fixo: "Fixo", unico: "Único", parcelado: "Parcelado" };
const METHOD_LABELS = { pix: "PIX", cartao_credito: "Cartão Crédito", cartao_debito: "Cartão Débito", boleto: "Boleto", transferencia: "Transferência", dinheiro: "Dinheiro" };
const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1", "#14b8a6", "#e11d48"];
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function formatCurrency(value) {
  return `R$ ${(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calcSummary(list) {
  const total = list.reduce((s, e) => s + (e.amount || 0) + (e.interest_amount || 0), 0);
  const pago = list.filter(e => e.payment_status === "pago_integral").reduce((s, e) => s + (e.amount || 0) + (e.interest_amount || 0), 0);
  const pendente = list.filter(e => ["pendente", "pago_parcial"].includes(e.payment_status))
    .reduce((s, e) => s + (e.amount || 0) + (e.interest_amount || 0) - (e.amount_paid || 0), 0);
  const vencido = list.filter(e => e.payment_status === "vencido")
    .reduce((s, e) => s + (e.amount || 0) + (e.interest_amount || 0) - (e.amount_paid || 0), 0);
  const juros = list.reduce((s, e) => s + (e.interest_amount || 0), 0);
  return { total, pago, pendente, vencido, juros, qtd: list.length };
}

function calcCategoryData(list) {
  const cats = {};
  list.forEach(e => {
    const cat = e.category || "Sem Categoria";
    if (!cats[cat]) cats[cat] = { name: cat, total: 0, pago: 0, pendente: 0, vencido: 0, count: 0, juros: 0 };
    const val = (e.amount || 0) + (e.interest_amount || 0);
    cats[cat].total += val;
    cats[cat].count++;
    cats[cat].juros += (e.interest_amount || 0);
    if (e.payment_status === "pago_integral") cats[cat].pago += val;
    else if (e.payment_status === "vencido") cats[cat].vencido += val - (e.amount_paid || 0);
    else cats[cat].pendente += val - (e.amount_paid || 0);
  });
  return Object.values(cats).sort((a, b) => b.total - a.total);
}

function calcMethodData(list) {
  const methods = {};
  list.forEach(e => {
    const m = e.payment_method || "outros";
    const label = METHOD_LABELS[m] || m;
    if (!methods[label]) methods[label] = { name: label, value: 0, count: 0 };
    methods[label].value += (e.amount || 0) + (e.interest_amount || 0);
    methods[label].count++;
  });
  return Object.values(methods).sort((a, b) => b.value - a.value);
}

function calcTypeData(list) {
  const types = {};
  list.forEach(e => {
    const t = e.expense_type || "unico";
    const label = TYPE_LABELS[t] || t;
    if (!types[label]) types[label] = { name: label, value: 0, count: 0 };
    types[label].value += (e.amount || 0) + (e.interest_amount || 0);
    types[label].count++;
  });
  return Object.values(types).sort((a, b) => b.value - a.value);
}

export default function FinancialDashboard({ expenses }) {
  const [viewMode, setViewMode] = useState("year"); // "year" or "month"
  const [selectedYear, setSelectedYear] = useState(moment().format("YYYY"));
  const [selectedMonth, setSelectedMonth] = useState(moment().format("MM")); // "01"-"12"

  const years = useMemo(() => {
    const yrs = [...new Set(expenses.map(e => moment(e.due_date).format("YYYY")))].sort().reverse();
    if (!yrs.includes(moment().format("YYYY"))) yrs.unshift(moment().format("YYYY"));
    return yrs;
  }, [expenses]);

  // Filtered expenses based on view mode
  const filteredExpenses = useMemo(() => {
    if (viewMode === "year") {
      return expenses.filter(e => moment(e.due_date).format("YYYY") === selectedYear);
    }
    return expenses.filter(e => moment(e.due_date).format("YYYY-MM") === `${selectedYear}-${selectedMonth}`);
  }, [expenses, viewMode, selectedYear, selectedMonth]);

  const summary = useMemo(() => calcSummary(filteredExpenses), [filteredExpenses]);
  const categoryData = useMemo(() => calcCategoryData(filteredExpenses), [filteredExpenses]);
  const methodData = useMemo(() => calcMethodData(filteredExpenses), [filteredExpenses]);
  const typeData = useMemo(() => calcTypeData(filteredExpenses), [filteredExpenses]);

  // Timeline chart data: monthly (for year view) or daily (for month view)
  const timelineData = useMemo(() => {
    if (viewMode === "year") {
      const months = {};
      for (let i = 0; i < 12; i++) {
        const key = moment().year(parseInt(selectedYear)).month(i).format("YYYY-MM");
        const label = moment().year(parseInt(selectedYear)).month(i).format("MMM");
        months[key] = { label, key, total: 0, pago: 0, pendente: 0, vencido: 0, count: 0 };
      }
      filteredExpenses.forEach(e => {
        const key = moment(e.due_date).format("YYYY-MM");
        if (!months[key]) return;
        const val = (e.amount || 0) + (e.interest_amount || 0);
        months[key].total += val;
        months[key].count++;
        if (e.payment_status === "pago_integral") months[key].pago += val;
        else if (e.payment_status === "vencido") months[key].vencido += val;
        else months[key].pendente += val - (e.amount_paid || 0);
      });
      return Object.values(months);
    } else {
      // Daily for selected month
      const daysInMonth = moment(`${selectedYear}-${selectedMonth}`, "YYYY-MM").daysInMonth();
      const days = {};
      for (let d = 1; d <= daysInMonth; d++) {
        const key = moment(`${selectedYear}-${selectedMonth}-${String(d).padStart(2, "0")}`, "YYYY-MM-DD").format("YYYY-MM-DD");
        days[key] = { label: String(d), key, total: 0, pago: 0, pendente: 0, vencido: 0, count: 0 };
      }
      filteredExpenses.forEach(e => {
        const key = moment(e.due_date).format("YYYY-MM-DD");
        if (!days[key]) return;
        const val = (e.amount || 0) + (e.interest_amount || 0);
        days[key].total += val;
        days[key].count++;
        if (e.payment_status === "pago_integral") days[key].pago += val;
        else if (e.payment_status === "vencido") days[key].vencido += val;
        else days[key].pendente += val - (e.amount_paid || 0);
      });
      return Object.values(days);
    }
  }, [filteredExpenses, viewMode, selectedYear, selectedMonth]);

  const topExpenses = useMemo(() => {
    return [...filteredExpenses]
      .sort((a, b) => ((b.amount || 0) + (b.interest_amount || 0)) - ((a.amount || 0) + (a.interest_amount || 0)))
      .slice(0, 10);
  }, [filteredExpenses]);

  // Comparison: current period vs previous
  const comparison = useMemo(() => {
    if (viewMode === "year") {
      const prevYear = String(parseInt(selectedYear) - 1);
      const curr = summary.total;
      const prev = expenses.filter(e => moment(e.due_date).format("YYYY") === prevYear)
        .reduce((s, e) => s + (e.amount || 0) + (e.interest_amount || 0), 0);
      const diff = prev > 0 ? ((curr - prev) / prev * 100) : 0;
      return { curr, prev, diff, label: `${selectedYear} vs ${prevYear}` };
    } else {
      const currKey = `${selectedYear}-${selectedMonth}`;
      const prevMoment = moment(currKey, "YYYY-MM").subtract(1, "month");
      const prevKey = prevMoment.format("YYYY-MM");
      const curr = summary.total;
      const prev = expenses.filter(e => moment(e.due_date).format("YYYY-MM") === prevKey)
        .reduce((s, e) => s + (e.amount || 0) + (e.interest_amount || 0), 0);
      const diff = prev > 0 ? ((curr - prev) / prev * 100) : 0;
      return { curr, prev, diff, label: `${MONTH_NAMES[parseInt(selectedMonth)-1]} vs ${prevMoment.format("MMM/YY")}` };
    }
  }, [expenses, summary, viewMode, selectedYear, selectedMonth]);

  const periodLabel = viewMode === "year" 
    ? `Total ${selectedYear}` 
    : `Total ${MONTH_NAMES[parseInt(selectedMonth)-1]}/${selectedYear}`;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm shadow-xl">
        <p className="text-white font-medium mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-gray-300">
            <span style={{ color: p.color }}>●</span> {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filtros de período */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Calendar className="w-5 h-5 text-emerald-400" />
          
          {/* Modo de visualização */}
          <div className="flex bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("year")}
              className={`px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === "year" ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              Anual
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === "month" ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              Mensal
            </button>
          </div>

          {/* Seletor de ano */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Seletor de mês (só no modo mensal) */}
          {viewMode === "month" && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <span className="text-gray-500 text-sm">{summary.qtd} gasto(s)</span>
        </div>

        {/* Comparação */}
        <div className="flex items-center gap-3 bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2">
          <span className="text-gray-400 text-xs">{comparison.label}:</span>
          <span className="text-white text-sm font-semibold">{formatCurrency(comparison.curr)}</span>
          {comparison.diff !== 0 && (
            <span className={`flex items-center gap-1 text-xs font-medium ${comparison.diff > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {comparison.diff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(comparison.diff).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: periodLabel, value: summary.total, icon: DollarSign, color: "from-blue-500/20 to-blue-600/10", iconColor: "text-blue-400", border: "border-blue-500/20" },
          { label: "Total Pago", value: summary.pago, icon: CheckCircle2, color: "from-emerald-500/20 to-emerald-600/10", iconColor: "text-emerald-400", border: "border-emerald-500/20" },
          { label: "Pendente", value: summary.pendente, icon: Clock, color: "from-yellow-500/20 to-yellow-600/10", iconColor: "text-yellow-400", border: "border-yellow-500/20" },
          { label: "Vencido", value: summary.vencido, icon: AlertTriangle, color: "from-red-500/20 to-red-600/10", iconColor: "text-red-400", border: "border-red-500/20" },
          { label: "Juros", value: summary.juros, icon: TrendingUp, color: "from-purple-500/20 to-purple-600/10", iconColor: "text-purple-400", border: "border-purple-500/20" },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
                <span className="text-xs text-gray-400 font-medium">{card.label}</span>
              </div>
              <p className="text-white text-lg font-bold">{formatCurrency(card.value)}</p>
            </div>
          );
        })}
      </div>

      {/* Gráfico de barras */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">
            {viewMode === "year" ? "Evolução Mensal" : `Evolução Diária — ${MONTH_NAMES[parseInt(selectedMonth)-1]}/${selectedYear}`}
          </h3>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData} barCategoryGap={viewMode === "month" ? "10%" : "20%"}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" stroke="#9ca3af" fontSize={viewMode === "month" ? 10 : 12} interval={viewMode === "month" ? 1 : 0} />
              <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={v => v >= 1000 ? `R$${(v/1000).toFixed(0)}k` : `R$${v.toFixed(0)}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
              <Bar dataKey="pago" name="Pago" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="pendente" name="Pendente" fill="#f59e0b" radius={[4,4,0,0]} />
              <Bar dataKey="vencido" name="Vencido" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Categoria e Tipo lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-emerald-400" />
            <h3 className="text-white font-semibold">Distribuição por Categoria</h3>
          </div>
          {categoryData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={categoryData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#fff" }} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-gray-500 text-sm text-center py-8">Sem dados</p>}
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-orange-400" />
            <h3 className="text-white font-semibold">Por Tipo de Gasto</h3>
          </div>
          {typeData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[(i+3) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#fff" }} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-gray-500 text-sm text-center py-8">Sem dados</p>}
        </div>
      </div>

      {/* Tabela detalhada por categoria */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-semibold">Detalhamento por Categoria</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="text-left py-3 px-3 text-gray-400 font-medium">Categoria</th>
                <th className="text-right py-3 px-3 text-gray-400 font-medium">Qtd</th>
                <th className="text-right py-3 px-3 text-gray-400 font-medium">Total</th>
                <th className="text-right py-3 px-3 text-gray-400 font-medium">Pago</th>
                <th className="text-right py-3 px-3 text-gray-400 font-medium">Pendente</th>
                <th className="text-right py-3 px-3 text-gray-400 font-medium">Vencido</th>
                <th className="text-right py-3 px-3 text-gray-400 font-medium">Juros</th>
                <th className="text-right py-3 px-3 text-gray-400 font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {categoryData.map((cat, i) => (
                <tr key={cat.name} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-white font-medium">{cat.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-gray-300">{cat.count}</td>
                  <td className="py-3 px-3 text-right text-white font-semibold">{formatCurrency(cat.total)}</td>
                  <td className="py-3 px-3 text-right text-emerald-400">{formatCurrency(cat.pago)}</td>
                  <td className="py-3 px-3 text-right text-yellow-400">{formatCurrency(cat.pendente)}</td>
                  <td className="py-3 px-3 text-right text-red-400">{formatCurrency(cat.vencido)}</td>
                  <td className="py-3 px-3 text-right text-purple-400">{formatCurrency(cat.juros)}</td>
                  <td className="py-3 px-3 text-right text-gray-300">
                    {summary.total > 0 ? (cat.total / summary.total * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
              {categoryData.length > 0 && (
                <tr className="border-t-2 border-gray-600">
                  <td className="py-3 px-3 text-white font-bold">TOTAL</td>
                  <td className="py-3 px-3 text-right text-white font-bold">{summary.qtd}</td>
                  <td className="py-3 px-3 text-right text-white font-bold">{formatCurrency(summary.total)}</td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-bold">{formatCurrency(summary.pago)}</td>
                  <td className="py-3 px-3 text-right text-yellow-400 font-bold">{formatCurrency(summary.pendente)}</td>
                  <td className="py-3 px-3 text-right text-red-400 font-bold">{formatCurrency(summary.vencido)}</td>
                  <td className="py-3 px-3 text-right text-purple-400 font-bold">{formatCurrency(summary.juros)}</td>
                  <td className="py-3 px-3 text-right text-white font-bold">100%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forma de pagamento */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-cyan-400" />
          <h3 className="text-white font-semibold">Por Forma de Pagamento</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {methodData.map((m) => (
            <div key={m.name} className="bg-gray-900/50 border border-gray-700/30 rounded-xl p-3 text-center">
              <p className="text-gray-400 text-xs mb-1">{m.name}</p>
              <p className="text-white font-bold text-sm">{formatCurrency(m.value)}</p>
              <p className="text-gray-500 text-xs mt-1">{m.count} gasto(s)</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top 10 maiores gastos */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-5 h-5 text-red-400" />
          <h3 className="text-white font-semibold">Top 10 Maiores Gastos</h3>
        </div>
        <div className="space-y-2">
          {topExpenses.map((exp, i) => {
            const total = (exp.amount || 0) + (exp.interest_amount || 0);
            const maxVal = (topExpenses[0]?.amount || 0) + (topExpenses[0]?.interest_amount || 0);
            const barWidth = maxVal > 0 ? (total / maxVal * 100) : 0;
            return (
              <div key={exp.id} className="flex items-center gap-3">
                <span className="text-gray-500 text-xs w-5 text-right">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium truncate">{exp.description}</span>
                    <span className="text-white text-sm font-bold ml-2 whitespace-nowrap">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-700/30 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500" style={{ width: `${Math.min(barWidth, 100)}%` }} />
                    </div>
                    <span className="text-gray-500 text-xs whitespace-nowrap">{exp.category || "—"}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {topExpenses.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Sem dados no período</p>}
        </div>
      </div>

      {/* Tabela timeline detalhada */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">
            {viewMode === "year" ? "Resumo Mensal Detalhado" : "Resumo Diário Detalhado"}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="text-left py-3 px-3 text-gray-400 font-medium">{viewMode === "year" ? "Mês" : "Dia"}</th>
                <th className="text-right py-3 px-3 text-gray-400 font-medium">Qtd</th>
                <th className="text-right py-3 px-3 text-gray-400 font-medium">Total</th>
                <th className="text-right py-3 px-3 text-gray-400 font-medium">Pago</th>
                <th className="text-right py-3 px-3 text-gray-400 font-medium">Pendente</th>
                <th className="text-right py-3 px-3 text-gray-400 font-medium">Vencido</th>
              </tr>
            </thead>
            <tbody>
              {timelineData.map(row => (
                <tr key={row.key} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${row.count === 0 ? "opacity-40" : ""}`}>
                  <td className="py-3 px-3 text-white font-medium">{row.label}</td>
                  <td className="py-3 px-3 text-right text-gray-300">{row.count}</td>
                  <td className="py-3 px-3 text-right text-white font-semibold">{formatCurrency(row.total)}</td>
                  <td className="py-3 px-3 text-right text-emerald-400">{formatCurrency(row.pago)}</td>
                  <td className="py-3 px-3 text-right text-yellow-400">{formatCurrency(row.pendente)}</td>
                  <td className="py-3 px-3 text-right text-red-400">{formatCurrency(row.vencido)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}