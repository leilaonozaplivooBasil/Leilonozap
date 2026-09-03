import React, { useState, useEffect, useRef } from "react";
import { plataforma } from "@/api/plataformaClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Search, RefreshCw, LayoutDashboard, List, TrendingUp, Scale, Receipt, Sheet } from "lucide-react";
import { format, startOfDay, startOfMonth, endOfMonth, isBefore, isAfter, parseISO } from "date-fns";
import { toDate } from "@/lib/dateFmt";
import { encontrarVencidosNaoMarcados } from "@/lib/financeiroVencidos";
// Os três status que significam "ainda devo isso". Vive no lib porque a aba
// "A Pagar" usa a MESMA régua — duas cópias divergiriam no primeiro ajuste.
import { STATUS_A_PAGAR } from "@/lib/contasAPagar";
// 05/09/2026 — as listas de Categoria e Centro de Custo do formulário são montadas AQUI,
// onde os lançamentos já estão carregados: as de fábrica mais tudo que já foi usado.
import { montarOpcoes, CATEGORIAS_DE_FABRICA } from "@/lib/listasDoFinanceiro";
import { COST_CENTERS } from "@/lib/costCenters";

import FinancialSummaryCards from "@/components/financial/FinancialSummaryCards";
import ExpenseTable from "@/components/financial/ExpenseTable";
import ExpenseFormModal from "@/components/financial/ExpenseFormModal";
import FinancialPDFGenerator from "@/components/financial/FinancialPDFGenerator";
import { conteudoDoArquivo, nomeDoArquivo } from "@/lib/planilhaFinanceiro";
import FinancialDashboard from "@/components/financial/FinancialDashboard";
import IncomeTable from "@/components/financial/IncomeTable";
import FinancialOverview from "@/components/financial/FinancialOverview";
import ContasAPagarTab from "@/components/financial/ContasAPagarTab";
import PaymentModal from "@/components/financial/PaymentModal";
import PortalPageHeader from "@/components/common/PortalPageHeader";
import { DollarSign } from "lucide-react";
import PageFullscreen from "@/components/admin/PageFullscreen";
import { useSecureRole } from "@/components/hooks/useSecureRole";
import { ADMIN_ROLES } from "@/lib/roles";

const FinancialExpense = plataforma.entities.FinancialExpense;
const FinancialIncome = plataforma.entities.FinancialIncome;


export default function Financial() {
  // 🔴 PONTO 122 (21/08/2026) — antes esta tela conferia role sozinha, direto
  // do localStorage, e só aceitava a string exata 'admin' — o dono, logado
  // como 'super_admin', ficava bloqueado. Migrado pro hook já existente e já
  // usado em outras telas admin (valida contra o banco, não só o cache local).
  const { status: authStatus } = useSecureRole(ADMIN_ROLES, 'Home');
  const [showForm, setShowForm] = useState(false);
  const [showPDF, setShowPDF] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  // 💰 Filtro "A Pagar" (28/08/2026, pedido do dono): responde "o que eu devo hoje?".
  // 'nenhum' = desligado. 'all' = as três pendências juntas. Ou uma delas, pra refinar.
  // Deixa SEMPRE de fora pago_integral e cancelado — nenhum dos dois é dívida.
  const [filterAPagar, setFilterAPagar] = useState("nenhum");
  const [filterType, setFilterType] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterDateTo, setFilterDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterCategory, setFilterCategory] = useState("all");
  // 🔵 Filtro de centro de custo (05/09/2026, pedido da Aline: "preciso que os criados
  // apareçam no filtro"). A tela tinha filtro de categoria e nenhum de centro de custo —
  // não dava pra responder "quanto saiu de Distribuição de Lucro" nem na planilha.
  const [filterCostCenter, setFilterCostCenter] = useState("all");
  const [activeTab, setActiveTab] = useState("expenses");
  const [paymentExpense, setPaymentExpense] = useState(null);
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["financial-expenses"],
    queryFn: () => FinancialExpense.list("-due_date", 500),
  });

  // DIR-7 (Fase 2) — livro-razão de receita: gravado automaticamente no servidor no
  // momento da confirmação (comissão de venda, taxa de adesão/plano). Sem criação
  // manual nesta fase — só leitura aqui.
  const { data: income = [], isLoading: isLoadingIncome } = useQuery({
    queryKey: ["financial-income"],
    queryFn: () => FinancialIncome.list("-received_date", 500),
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

  // 🔴 PONTO 123 (21/08/2026) — auto-detecção de vencido disparava um PATCH
  // por gasto, TODA vez que a lista recarregava (a cada refetch/invalidação),
  // mesmo pra gastos que ela mesma já tinha marcado numa carga anterior —
  // porque nenhuma chamada avisava a lista local que o status tinha mudado
  // (faltava invalidateQueries), então o próximo refetch via a mesma lista
  // "pendente" de novo e repetia o PATCH. `jaMarcadosRef` lembra, na sessão
  // atual, quais IDs já foram marcados, pra nunca reenviar o mesmo PATCH duas
  // vezes; e o `invalidateQueries` no final faz a tela refletir na hora, sem
  // precisar de F5.
  const jaMarcadosRef = useRef(new Set());
  useEffect(() => {
    const vencidosNovos = encontrarVencidosNaoMarcados(expenses, jaMarcadosRef.current);
    if (vencidosNovos.length === 0) return;
    vencidosNovos.forEach((exp) => jaMarcadosRef.current.add(exp.id));
    Promise.allSettled(
      vencidosNovos.map((exp) => FinancialExpense.update(exp.id, { payment_status: "vencido" }))
    ).then(() => queryClient.invalidateQueries({ queryKey: ["financial-expenses"] }));
  }, [expenses, queryClient]);

  if (authStatus !== 'authorized') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        {authStatus === 'unauthorized' ? (
          <p className="text-gray-400 text-lg">Acesso restrito a administradores.</p>
        ) : (
          <RefreshCw className="w-8 h-8 text-gray-500 animate-spin" />
        )}
      </div>
    );
  }

  // As duas listas do formulário e dos filtros: de fábrica + tudo que já foi usado, com
  // uma entrada por grafia — antes o filtro de categoria listava "Salario" E "salario"
  // como se fossem duas coisas. Receitas entram no centro de custo porque o relatório
  // "Por Centro de Custo" (FinancialOverview) soma as duas tabelas juntas.
  const usedCategories = montarOpcoes(CATEGORIAS_DE_FABRICA, expenses.map(e => e.category));
  const centrosDeCusto = montarOpcoes(
    COST_CENTERS,
    expenses.map(e => e.cost_center),
    income.map(i => i.cost_center),
  );

  const filtered = expenses.filter(exp => {
    const expDate = startOfDay(toDate(exp.due_date));
    const monthMatch = (!filterDateFrom || !isBefore(expDate, startOfDay(parseISO(filterDateFrom)))) &&
      (!filterDateTo || !isAfter(expDate, startOfDay(parseISO(filterDateTo))));
    // "A Pagar" MANDA no status quando está ligado (o Select dele já zera o filtro de
    // Status ao ser usado — ver onValueChange). Assim nunca dá pra montar uma combinação
    // que se anula sozinha, tipo Status=Pago + A Pagar=Vencido, e devolve tela vazia sem
    // explicação nenhuma.
    const statusMatch = filterAPagar !== "nenhum"
      ? (filterAPagar === "all" ? STATUS_A_PAGAR.includes(exp.payment_status) : exp.payment_status === filterAPagar)
      : (filterStatus === "all" || exp.payment_status === filterStatus);
    const typeMatch = filterType === "all" || exp.expense_type === filterType;
    const categoryMatch = filterCategory === "all" || exp.category === filterCategory;
    const costCenterMatch = filterCostCenter === "all" || (exp.cost_center || "") === filterCostCenter;
    const searchMatch = !search || (exp.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (exp.company || "").toLowerCase().includes(search.toLowerCase()) ||
      (exp.category || "").toLowerCase().includes(search.toLowerCase());
    return monthMatch && statusMatch && typeMatch && categoryMatch && costCenterMatch && searchMatch;
  });

  // 🔴 03/09/2026 — "a opção de exportar em planilha ainda não está disponível".
  // Exporta `filtered`: EXATAMENTE as linhas que estão na tela, com os seis
  // filtros já aplicados. Quem clica em "exportar" olhando uma lista filtrada
  // espera baixar aquela lista — não a base inteira.
  //
  // O "Gerar PDF" ao lado NÃO foi tocado (decisão do dono): ele continua com
  // período próprio e ignorando os filtros. São duas saídas com regras
  // diferentes, e isso está registrado de propósito.
  const baixarPlanilha = () => {
    const url = URL.createObjectURL(
      new Blob([conteudoDoArquivo(filtered)], { type: 'text/csv;charset=utf-8' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeDoArquivo();
    document.body.appendChild(a);
    a.click();
    a.remove();
    // sem o revoke o navegador segura o arquivo inteiro em memória até recarregar
    URL.revokeObjectURL(url);
  };

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
      due_date: exp.due_date || format(new Date(), "yyyy-MM-dd"),
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
  const handlePaymentConfirm = async (id, data) => {
    await FinancialExpense.update(id, data);
    queryClient.invalidateQueries({ queryKey: ["financial-expenses"] });
    setPaymentExpense(null);
  };

  return (
    <PageFullscreen>
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <PortalPageHeader
          icon={DollarSign}
          title="Financeiro"
          subtitle="Controle completo de contas e gastos"
          accentColor="emerald"
          actions={
            <>
              <Button
                onClick={baixarPlanilha}
                disabled={filtered.length === 0}
                title={filtered.length === 0
                  ? 'Nenhuma conta na tela para exportar'
                  : `Baixar ${filtered.length} conta(s) — as mesmas que estão na tela`}
                variant="outline"
                className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 gap-2 disabled:opacity-50"
              >
                <Sheet className="w-4 h-4" /> Exportar Planilha
              </Button>
              <Button onClick={() => setShowPDF(true)} variant="outline" className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 gap-2">
                <FileText className="w-4 h-4" /> Gerar PDF
              </Button>
              <Button onClick={() => { setEditingExpense(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <Plus className="w-4 h-4" /> Novo Gasto
              </Button>
            </>
          }
        />

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
          <button
            onClick={() => setActiveTab("income")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "income"
                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                : "bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:text-white hover:border-gray-600"
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Receitas
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                : "bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:text-white hover:border-gray-600"
            }`}
          >
            <Scale className="w-4 h-4" /> Visão Geral
          </button>
          {/* 📋 Aba pedida pela Aline (29/08/2026): "clica e visualiza uma aba
              exclusiva para o contas a pagar". Sem filtro nenhum de propósito —
              a tela inteira já é a resposta. Ver ContasAPagarTab.jsx. */}
          <button
            onClick={() => setActiveTab("apagar")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "apagar"
                ? "bg-amber-600/20 text-amber-400 border border-amber-500/30"
                : "bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:text-white hover:border-gray-600"
            }`}
          >
            <Receipt className="w-4 h-4" /> A Pagar
          </button>
        </div>

        {activeTab === "apagar" ? (
          isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Carregando...</p>
            </div>
          ) : (
            /* `expenses`, não `filtered`: a aba mostra TUDO que está em aberto,
               sem herdar o período nem os filtros da aba Gastos. Foi o pedido. */
            <ContasAPagarTab expenses={expenses} onRowClick={setPaymentExpense} />
          )
        ) : activeTab === "dashboard" ? (
          isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Carregando...</p>
            </div>
          ) : (
            <>
              {/* 🔴 PONTO 123 — o Dashboard é só visualização (gráficos agregados por
                  categoria, sem um gasto individual pra editar em cada linha). Editar
                  só existe na aba "Gastos" — sem este atalho, quem só conhece o
                  Dashboard não sabia que dava pra corrigir um lançamento errado. */}
              <div className="flex justify-end">
                <Button
                  onClick={() => setActiveTab("expenses")}
                  variant="outline"
                  className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 gap-2"
                >
                  <List className="w-4 h-4" /> Ver e editar gastos
                </Button>
              </div>
              <FinancialDashboard expenses={expenses} />
            </>
          )
        ) : activeTab === "income" ? (
          isLoadingIncome ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Carregando...</p>
            </div>
          ) : (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
              <IncomeTable income={income} />
            </div>
          )
        ) : activeTab === "overview" ? (
          (isLoading || isLoadingIncome) ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Carregando...</p>
            </div>
          ) : (
            <FinancialOverview expenses={expenses} income={income} />
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
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs whitespace-nowrap">De:</span>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={e => setFilterDateFrom(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-white w-full md:w-40 [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs whitespace-nowrap">Até:</span>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={e => setFilterDateTo(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-white w-full md:w-40 [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
                {/* Escolher um Status desliga o "A Pagar" — os dois mexem na mesma coluna,
                    e deixar os dois ligados permitiria combinação que se anula sozinha. */}
                <Select
                  value={filterStatus}
                  onValueChange={(v) => { setFilterStatus(v); if (v !== "all") setFilterAPagar("nenhum"); }}
                >
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

                {/* 💰 A PAGAR — o que ainda está em aberto. Ao ligar, zera o Status (opção A
                    escolhida pelo dono): um manda de cada vez, nunca dá tela vazia sem motivo.
                    Fica em âmbar quando ativo, pra não passar despercebido que a lista está
                    filtrada por pendência. */}
                <Select
                  value={filterAPagar}
                  onValueChange={(v) => { setFilterAPagar(v); if (v !== "nenhum") setFilterStatus("all"); }}
                >
                  <SelectTrigger
                    className={`w-full md:w-52 ${
                      filterAPagar !== "nenhum"
                        ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                        : "bg-gray-900 border-gray-700 text-white"
                    }`}
                  >
                    <SelectValue placeholder="A Pagar" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="nenhum">A Pagar (desligado)</SelectItem>
                    <SelectItem value="all">Todas as pendências</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                    <SelectItem value="pago_parcial">Pago Parcial</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
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
                {centrosDeCusto.length > 0 && (
                  <Select value={filterCostCenter} onValueChange={setFilterCostCenter}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-full md:w-44">
                      <SelectValue placeholder="Centro de Custo" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="all">Todos Centros de Custo</SelectItem>
                      {centrosDeCusto.map(cc => (
                        <SelectItem key={cc} value={cc}>{cc}</SelectItem>
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
                <ExpenseTable expenses={filtered} onEdit={handleEdit} onDelete={handleDelete} onRowClick={setPaymentExpense} />
              )}
            </div>
          </>
        )}
      </div>

      <ExpenseFormModal open={showForm} onClose={() => { setShowForm(false); setEditingExpense(null); }}
        onSave={handleSave} onBulkSave={handleBulkSave} editingExpense={editingExpense}
        categorias={usedCategories} centrosDeCusto={centrosDeCusto} />
      <FinancialPDFGenerator open={showPDF} onClose={() => setShowPDF(false)} expenses={expenses} />
      <PaymentModal open={!!paymentExpense} onClose={() => setPaymentExpense(null)} expense={paymentExpense} onConfirm={handlePaymentConfirm} />
    </div>
    </PageFullscreen>
  );
}