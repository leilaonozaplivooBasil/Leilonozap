import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Search, Filter, RefreshCw, LayoutDashboard, List } from "lucide-react";
import moment from "moment";

import FinancialSummaryCards from "@/components/financial/FinancialSummaryCards";
import ExpenseTable from "@/components/financial/ExpenseTable";
import ExpenseFormModal from "@/components/financial/ExpenseFormModal";
import FinancialPDFGenerator from "@/components/financial/FinancialPDFGenerator";
import FinancialDashboard from "@/components/financial/FinancialDashboard";
import PaymentModal from "@/components/financial/PaymentModal";

const FinancialExpense = base44.entities.FinancialExpense;

export default function Financial() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showPDF, setShowPDF] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState(moment().format("YYYY-MM"));
  const [filterCategory, setFilterCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("expenses");
  const queryClient = useQueryClient();

  useEffect(() => {
    const saved = localStorage.getItem("currentUser");
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["financial-expenses"],
    queryFn: () => FinancialExpense.list("-due_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => FinancialExpense.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financial-expenses"] }); setShowForm(false); setEditingExpense(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => FinancialExpense.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financial-expenses"] }); setShowForm(false); setEditingExpense(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => FinancialExpense.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financial-expenses"] }),
  });

  // Auto-detect overdue
  useEffect(() => {
    const today = moment().startOf("day");
    expenses.forEach(exp => {
      if (exp.payment_status === "pendente" && moment(exp.due_date).startOf("day").isBefore(today)) {
        FinancialExpense.update(exp.id, { payment_status: "vencido" });
      }
    });
  }, [expenses]);

  const isAdmin = currentUser?.role === "admin";
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400 text-lg">Acesso restrito a administradores.</p>
      </div>
    );
  }

  // Categorias dinâmicas: apenas as que existem nos gastos lançados
  const usedCategories = [...new Set(expenses.map(e => e.category).filter(Boolean))].sort();

  const filtered = expenses.filter(exp => {
    const monthMatch = filterMonth === "all" || moment(exp.due_date).format("YYYY-MM") === filterMonth;
    const statusMatch = filterStatus === "all" || exp.payment_status === filterStatus;
    const typeMatch = filterType === "all" || exp.expense_type === filterType;
    const categoryMatch = filterCategory === "all" || exp.category === filterCategory;
    const searchMatch = !search || (exp.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (exp.company || "").toLowerCase().includes(search.toLowerCase()) ||
      (exp.category || "").toLowerCase().includes(search.toLowerCase());
    return monthMatch && statusMatch && typeMatch && categoryMatch && searchMatch;
  });

  const handleSave = (data) => {
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleBulkSave = async (expenses) => {
    const formatted = expenses.map(exp => ({
      description: exp.description || "Gasto importado",
      company: exp.company || "",
      category: exp.category || "",
      expense_type: "unico",
      amount: parseFloat(exp.amount) || 0,
      interest_amount: 0,
      total_amount: parseFloat(exp.amount) || 0,
      due_date: exp.due_date || moment().format("YYYY-MM-DD"),
      payment_method: "pix",
      payment_status: "pendente",
      amount_paid: 0,
    }));
    await FinancialExpense.bulkCreate(formatted);
    queryClient.invalidateQueries({ queryKey: ["financial-expenses"] });
    setShowForm(false);
  };

  const handleEdit = (exp) => { setEditingExpense(exp); setShowForm(true); };
  const handleDelete = (exp) => {
    if (window.confirm(`Excluir "${exp.description}"?`)) deleteMutation.mutate(exp.id);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Financeiro</h1>
            <p className="text-gray-400 text-sm mt-1">Controle completo de contas e gastos</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowPDF(true)} variant="outline" className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 gap-2">
              <FileText className="w-4 h-4" /> Gerar PDF
            </Button>
            <Button onClick={() => { setEditingExpense(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Novo Gasto
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "expenses"
                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                : "bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:text-white hover:border-gray-600"
            }`}
          >
            <List className="w-4 h-4" /> Gastos
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "dashboard"
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                : "bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:text-white hover:border-gray-600"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
        </div>

        {activeTab === "dashboard" ? (
          isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Carregando...</p>
            </div>
          ) : (
            <FinancialDashboard expenses={expenses} />
          )
        ) : (
          <>
            {/* Summary */}
            <FinancialSummaryCards expenses={filtered} />

            {/* Filters */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por descrição, empresa ou categoria..."
                    className="bg-gray-900 border-gray-700 text-white pl-10" />
                </div>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-full md:w-40">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="all">Todos os Meses</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = moment().subtract(i, "months");
                      return <SelectItem key={m.format("YYYY-MM")} value={m.format("YYYY-MM")}>{m.format("MMM/YYYY")}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-full md:w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago_integral">Pago</SelectItem>
                    <SelectItem value="pago_parcial">Parcial</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-full md:w-36">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="all">Todos Tipos</SelectItem>
                    <SelectItem value="fixo">Fixo</SelectItem>
                    <SelectItem value="unico">Único</SelectItem>
                    <SelectItem value="parcelado">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
                {usedCategories.length > 0 && (
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-full md:w-44">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="all">Todas Categorias</SelectItem>
                      {usedCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
              {isLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-gray-500 animate-spin mx-auto mb-3" />
                  <p className="text-gray-500">Carregando...</p>
                </div>
              ) : (
                <ExpenseTable expenses={filtered} onEdit={handleEdit} onDelete={handleDelete} />
              )}
            </div>
          </>
        )}
      </div>

      <ExpenseFormModal open={showForm} onClose={() => { setShowForm(false); setEditingExpense(null); }}
        onSave={handleSave} onBulkSave={handleBulkSave} editingExpense={editingExpense} />
      <FinancialPDFGenerator open={showPDF} onClose={() => setShowPDF(false)} expenses={expenses} />
    </div>
  );
}