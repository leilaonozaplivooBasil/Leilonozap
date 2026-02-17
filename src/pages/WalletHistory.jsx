import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Plus, CreditCard, Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";
import { toast } from "sonner";
import WalletBalance from "../components/wallet/WalletBalance";

export default function WalletHistory() {
  const [currentUser, setCurrentUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [wallet, setWallet] = useState(null);
  const [currentPage, setCurrentPage] = useState({
    overview: 0,
    deposits: 0,
    usage: 0
  });
  const ITEMS_PER_PAGE = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = () => {
      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');
      
      if (savedUserJSON && isLoggedIn) {
        const user = JSON.parse(savedUserJSON);
        setCurrentUser(user);
        loadTransactions(user.id);
      } else {
        toast.error("Faça login para continuar");
        navigate(createPageUrl("Home"));
      }
    };
    loadUser();
  }, []);

  const loadTransactions = async (userId) => {
    try {
      setIsLoading(true);
      const data = await base44.entities.WalletTransaction.filter(
        { user_id: userId },
        "-created_date",
        100
      );
      const wallets = await base44.entities.Wallet.filter({ user_id: userId });
      setTransactions(data);
      if (wallets.length > 0) {
        setWallet(wallets[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionIcon = (type, direction) => {
    if (direction === "credit") return <TrendingUp className="w-5 h-5 text-green-500" />;
    return <TrendingDown className="w-5 h-5 text-red-500" />;
  };

  const getTransactionColor = (direction) => {
    return direction === "credit" ? "text-green-400" : "text-red-400";
  };

  const getStatusBadge = (status) => {
    const config = {
      confirmed: { label: "Confirmado", className: "bg-green-600" },
      pending: { label: "Pendente", className: "bg-yellow-600" },
      failed: { label: "Falhou", className: "bg-red-600" }
    };
    const { label, className } = config[status] || config.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  const getTypeLabel = (type) => {
    const labels = {
      deposit: "Depósito",
      purchase: "Compra",
      refund: "Reembolso",
      adjustment: "Ajuste"
    };
    return labels[type] || type;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  const deposits = transactions.filter(t => t.type === "deposit");
  const walletUsage = transactions.filter(t => t.type === "purchase");
  
  const totalDeposited = deposits.reduce((sum, t) => sum + t.amount, 0);
  const totalUsed = walletUsage.reduce((sum, t) => sum + t.amount, 0);

  // Funções de paginação
  const getPaginatedData = (data) => {
    const startIndex = currentPage[activeTab] * ITEMS_PER_PAGE;
    return data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const getTotalPages = (data) => {
    return Math.ceil(data.length / ITEMS_PER_PAGE);
  };

  const getDataForTab = () => {
    if (activeTab === "overview") return transactions;
    if (activeTab === "deposits") return deposits;
    return walletUsage;
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => ({
      ...prev,
      [activeTab]: Math.max(0, prev[activeTab] - 1)
    }));
  };

  const handleNextPage = () => {
    const totalPages = getTotalPages(getDataForTab());
    setCurrentPage(prev => ({
      ...prev,
      [activeTab]: Math.min(totalPages - 1, prev[activeTab] + 1)
    }));
  };

  // Reset página ao mudar de aba
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(prev => ({ ...prev, [tab]: 0 }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950 py-12 px-4 relative overflow-hidden">
      {/* Efeito de fundo futurístico (sutil) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-2xl"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl("Profile"))}
          className="text-cyan-300 hover:text-cyan-200 hover:bg-cyan-900/20 mb-8 transition-all"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Header Futurístico */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/50">
              <WalletIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-black bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">Carteira Virtual</h1>
              <p className="text-cyan-200/70 text-sm font-light mt-1">Plataforma Tecnológica de Gestão Financeira</p>
            </div>
          </div>
        </div>

        {/* Grid de Saldos Futurístico */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Saldo Principal */}
          <Card className="md:col-span-2 border-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl shadow-lg overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5"></div>
            <CardContent className="p-8 relative z-10">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <p className="text-cyan-300/70 text-sm font-light uppercase tracking-widest mb-3">Saldo Disponível</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-6xl font-black text-white">R$</p>
                    <p className="text-6xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                      {wallet?.balance?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center border border-cyan-400/30">
                  <WalletIcon className="w-10 h-10 text-cyan-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-cyan-400/20">
                <div className="space-y-2">
                  <p className="text-cyan-300/50 text-xs font-light uppercase tracking-wider">Entradas</p>
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-green-400" />
                    <p className="text-2xl font-bold text-green-400">R$ {totalDeposited.toFixed(2)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-cyan-300/50 text-xs font-light uppercase tracking-wider">Saídas</p>
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="w-5 h-5 text-red-400" />
                    <p className="text-2xl font-bold text-red-400">R$ {totalUsed.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Depositar */}
          <Card className="border-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl shadow-lg overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5"></div>
            <CardContent className="p-8 flex flex-col justify-between h-full relative z-10">
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center mb-4 border border-green-400/30">
                  <CreditCard className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-cyan-300/70 text-sm font-light uppercase tracking-widest">Adicionar Fundos</p>
              </div>
              <Button
                onClick={() => navigate(createPageUrl("AddFunds"))}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold h-12 shadow-md transition-all duration-300 border-0"
              >
                <Plus className="w-5 h-5 mr-2" />
                Depositar Agora
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Abas de Transações */}
        <Card className="border-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/3 via-transparent to-blue-500/3"></div>
          <CardHeader className="border-b border-cyan-400/20 relative z-10">
            <div className="flex gap-2 md:gap-6">
              <button
                onClick={() => handleTabChange("overview")}
                className={`pb-4 px-4 font-semibold transition-all border-b-2 relative text-sm md:text-base ${
                  activeTab === "overview"
                    ? "text-cyan-300 border-cyan-400"
                    : "text-cyan-200/50 hover:text-cyan-300 border-transparent"
                }`}
              >
                <TrendingDown className="w-5 h-5 inline mr-2" />
                Todas
              </button>
              <button
                onClick={() => handleTabChange("deposits")}
                className={`pb-4 px-4 font-semibold transition-all border-b-2 relative text-sm md:text-base ${
                  activeTab === "deposits"
                    ? "text-green-300 border-green-400"
                    : "text-cyan-200/50 hover:text-cyan-300 border-transparent"
                }`}
              >
                <TrendingUp className="w-5 h-5 inline mr-2" />
                Entradas <span className="ml-1 text-xs">({deposits.length})</span>
              </button>
              <button
                onClick={() => handleTabChange("usage")}
                className={`pb-4 px-4 font-semibold transition-all border-b-2 relative text-sm md:text-base ${
                  activeTab === "usage"
                    ? "text-red-300 border-red-400"
                    : "text-cyan-200/50 hover:text-cyan-300 border-transparent"
                }`}
              >
                <TrendingDown className="w-5 h-5 inline mr-2" />
                Saídas <span className="ml-1 text-xs">({walletUsage.length})</span>
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-8 relative z-10">
            {isLoading ? (
              <div className="text-center py-16">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/30 border-t-cyan-400 mx-auto mb-4"></div>
                  <p className="text-cyan-300/70 font-light">Carregando transações...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Overview - Todas as Transações */}
                {activeTab === "overview" && (
                  <div>
                    <div className="space-y-4">
                      {transactions.length === 0 ? (
                        <div className="text-center py-16">
                          <DollarSign className="w-16 h-16 text-cyan-400/20 mx-auto mb-4" />
                          <p className="text-cyan-300/50 font-light">Nenhuma transação registrada</p>
                        </div>
                      ) : (
                        getPaginatedData(transactions).map((transaction) => (
                          <div key={transaction.id} className="group p-4 bg-gradient-to-r from-slate-700/30 to-slate-800/30 border border-cyan-400/20 rounded-xl hover:border-cyan-400/50 hover:shadow-sm transition-all duration-300">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${transaction.direction === 'credit' ? 'bg-green-500/20 border border-green-400/30' : 'bg-red-500/20 border border-red-400/30'}`}>
                                  {getTransactionIcon(transaction.type, transaction.direction)}
                                </div>
                                <div>
                                  <p className="text-white font-semibold">{getTypeLabel(transaction.type)}</p>
                                  <p className="text-cyan-300/60 text-sm font-light">{transaction.description || "Sem descrição"}</p>
                                  <div className="flex items-center gap-2 text-cyan-300/40 text-xs mt-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(transaction.created_date).toLocaleString('pt-BR')}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-lg font-bold ${getTransactionColor(transaction.direction)}`}>
                                  {transaction.direction === "credit" ? "+" : "-"}R$ {transaction.amount.toFixed(2)}
                                </p>
                                {getStatusBadge(transaction.status)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {transactions.length > ITEMS_PER_PAGE && (
                       <div className="flex items-center justify-between mt-8 pt-6 border-t border-cyan-400/20">
                         <Button
                           onClick={handlePreviousPage}
                           disabled={currentPage.overview === 0}
                           variant="outline"
                           className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 hover:border-cyan-400/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                         >
                           ← Anterior
                         </Button>
                         <span className="text-cyan-300/60 text-sm font-light">
                           Página {currentPage.overview + 1} de {getTotalPages(transactions)}
                         </span>
                         <Button
                           onClick={handleNextPage}
                           disabled={currentPage.overview >= getTotalPages(transactions) - 1}
                           variant="outline"
                           className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 hover:border-cyan-400/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                         >
                           Próxima →
                         </Button>
                       </div>
                     )}
                  </div>
                )}

                {/* Depósitos */}
                {activeTab === "deposits" && (
                  <div>
                    <div className="space-y-4">
                      {deposits.length === 0 ? (
                        <div className="text-center py-16">
                          <Plus className="w-16 h-16 text-green-400/20 mx-auto mb-4" />
                          <p className="text-cyan-300/50 font-light mb-6">Nenhum depósito registrado</p>
                          <Button onClick={() => navigate(createPageUrl("AddFunds"))} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold shadow-lg shadow-green-500/50">
                            Fazer Primeiro Depósito
                          </Button>
                        </div>
                      ) : (
                        getPaginatedData(deposits).map((transaction) => (
                          <div key={transaction.id} className="group p-4 bg-gradient-to-r from-slate-700/30 to-slate-800/30 border border-green-400/20 rounded-xl hover:border-green-400/50 hover:shadow-sm transition-all duration-300">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-green-500/20 border border-green-400/30">
                                  <TrendingUp className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                  <p className="text-white font-semibold">Depósito Recebido</p>
                                  <p className="text-cyan-300/60 text-sm font-light">{transaction.description || "Crédito em conta"}</p>
                                  <div className="flex items-center gap-2 text-cyan-300/40 text-xs mt-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(transaction.created_date).toLocaleString('pt-BR')}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-green-400">+R$ {transaction.amount.toFixed(2)}</p>
                                {getStatusBadge(transaction.status)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {deposits.length > ITEMS_PER_PAGE && (
                       <div className="flex items-center justify-between mt-8 pt-6 border-t border-cyan-400/20">
                         <Button
                           onClick={handlePreviousPage}
                           disabled={currentPage.deposits === 0}
                           variant="outline"
                           className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 hover:border-cyan-400/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                         >
                           ← Anterior
                         </Button>
                         <span className="text-cyan-300/60 text-sm font-light">
                           Página {currentPage.deposits + 1} de {getTotalPages(deposits)}
                         </span>
                         <Button
                           onClick={handleNextPage}
                           disabled={currentPage.deposits >= getTotalPages(deposits) - 1}
                           variant="outline"
                           className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 hover:border-cyan-400/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                         >
                           Próxima →
                         </Button>
                       </div>
                     )}
                  </div>
                )}

                {/* Utilizações */}
                {activeTab === "usage" && (
                  <div>
                    <div className="space-y-4">
                      {walletUsage.length === 0 ? (
                        <div className="text-center py-16">
                          <DollarSign className="w-16 h-16 text-red-400/20 mx-auto mb-4" />
                          <p className="text-cyan-300/50 font-light">Nenhuma saída registrada</p>
                        </div>
                      ) : (
                        getPaginatedData(walletUsage).map((transaction) => (
                          <div key={transaction.id} className="group p-4 bg-gradient-to-r from-slate-700/30 to-slate-800/30 border border-red-400/20 rounded-xl hover:border-red-400/50 hover:shadow-sm transition-all duration-300">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-red-500/20 border border-red-400/30">
                                  <TrendingDown className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                  <p className="text-white font-semibold">Saldo Utilizado</p>
                                  <p className="text-cyan-300/60 text-sm font-light">{transaction.description || "Utilização em transação"}</p>
                                  <div className="flex items-center gap-2 text-cyan-300/40 text-xs mt-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(transaction.created_date).toLocaleString('pt-BR')}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-red-400">-R$ {transaction.amount.toFixed(2)}</p>
                                {getStatusBadge(transaction.status)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {walletUsage.length > ITEMS_PER_PAGE && (
                       <div className="flex items-center justify-between mt-8 pt-6 border-t border-cyan-400/20">
                         <Button
                           onClick={handlePreviousPage}
                           disabled={currentPage.usage === 0}
                           variant="outline"
                           className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 hover:border-cyan-400/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                         >
                           ← Anterior
                         </Button>
                         <span className="text-cyan-300/60 text-sm font-light">
                           Página {currentPage.usage + 1} de {getTotalPages(walletUsage)}
                         </span>
                         <Button
                           onClick={handleNextPage}
                           disabled={currentPage.usage >= getTotalPages(walletUsage) - 1}
                           variant="outline"
                           className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 hover:border-cyan-400/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                         >
                           Próxima →
                         </Button>
                       </div>
                     )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}