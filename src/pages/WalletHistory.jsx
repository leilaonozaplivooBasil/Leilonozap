import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, ArrowLeft, TrendingUp, TrendingDown, RefreshCw, DollarSign, Plus, CreditCard, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import WalletBalance from "../components/wallet/WalletBalance";

export default function WalletHistory() {
  const [currentUser, setCurrentUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [wallet, setWallet] = useState(null);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate(-2);
          }}
          className="text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <WalletIcon className="w-8 h-8 text-green-500" />
            <h1 className="text-4xl font-bold text-white">Minha Carteira Virtual</h1>
          </div>
          <p className="text-gray-400">Gerencie seu saldo, depósitos e transações</p>
        </div>

        {/* Saldo Principal - Destaque */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0 md:col-span-2 shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium mb-2">Saldo Disponível</p>
                  <p className="text-4xl font-bold text-white">
                    R$ {wallet?.balance?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <WalletIcon className="w-16 h-16 text-white/20" />
              </div>
              <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-green-100 text-xs font-medium mb-1">Total Depositado</p>
                  <p className="text-xl font-bold text-white">R$ {totalDeposited.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-green-100 text-xs font-medium mb-1">Total Utilizado</p>
                  <p className="text-xl font-bold text-white">R$ {totalUsed.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botão Depositar */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm shadow-lg">
            <CardContent className="p-8 flex flex-col justify-between h-full">
              <div>
                <CreditCard className="w-8 h-8 text-blue-400 mb-2" />
                <p className="text-gray-300 text-sm font-medium mb-4">Adicionar Saldo</p>
              </div>
              <Button
                onClick={() => navigate(createPageUrl("AddFunds"))}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold h-12 shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Depositar Agora
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Abas de Transações */}
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm shadow-lg">
          <CardHeader className="border-b border-gray-700">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab("overview")}
                className={`pb-4 px-2 font-semibold transition-all border-b-2 ${
                  activeTab === "overview"
                    ? "text-green-400 border-green-400"
                    : "text-gray-400 hover:text-white border-transparent"
                }`}
              >
                <TrendingDown className="w-5 h-5 inline mr-2" />
                Todas as Transações
              </button>
              <button
                onClick={() => setActiveTab("deposits")}
                className={`pb-4 px-2 font-semibold transition-all border-b-2 ${
                  activeTab === "deposits"
                    ? "text-green-400 border-green-400"
                    : "text-gray-400 hover:text-white border-transparent"
                }`}
              >
                <TrendingUp className="w-5 h-5 inline mr-2" />
                Depósitos ({deposits.length})
              </button>
              <button
                onClick={() => setActiveTab("usage")}
                className={`pb-4 px-2 font-semibold transition-all border-b-2 ${
                  activeTab === "usage"
                    ? "text-green-400 border-green-400"
                    : "text-gray-400 hover:text-white border-transparent"
                }`}
              >
                <TrendingDown className="w-5 h-5 inline mr-2" />
                Utilizações ({walletUsage.length})
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-3"></div>
                <p className="text-gray-400">Carregando transações...</p>
              </div>
            ) : (
              <>
                {/* Overview - Todas as Transações */}
                {activeTab === "overview" && (
                  <div className="space-y-3">
                    {transactions.length === 0 ? (
                      <div className="text-center py-12">
                        <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">Nenhuma transação ainda</p>
                      </div>
                    ) : (
                      transactions.map((transaction) => (
                        <div key={transaction.id} className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-gray-600 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {getTransactionIcon(transaction.type, transaction.direction)}
                              <div>
                                <p className="text-white font-semibold">{getTypeLabel(transaction.type)}</p>
                                <p className="text-gray-400 text-sm">{transaction.description || "Sem descrição"}</p>
                                <p className="text-gray-500 text-xs mt-1">{new Date(transaction.created_date).toLocaleString('pt-BR')}</p>
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
                )}

                {/* Depósitos */}
                {activeTab === "deposits" && (
                  <div className="space-y-3">
                    {deposits.length === 0 ? (
                      <div className="text-center py-12">
                        <Plus className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">Nenhum depósito realizado</p>
                        <Button onClick={() => navigate(createPageUrl("AddFunds"))} className="mt-4 bg-green-600 hover:bg-green-700">
                          Fazer Primeiro Depósito
                        </Button>
                      </div>
                    ) : (
                      deposits.map((transaction) => (
                        <div key={transaction.id} className="p-4 bg-gray-900/50 border border-green-500/20 rounded-lg hover:border-green-500/50 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <TrendingUp className="w-5 h-5 text-green-500" />
                              <div>
                                <p className="text-white font-semibold">Depósito Realizado</p>
                                <p className="text-gray-400 text-sm">{transaction.description || "Depósito de saldo"}</p>
                                <p className="text-gray-500 text-xs mt-1">{new Date(transaction.created_date).toLocaleString('pt-BR')}</p>
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
                )}

                {/* Utilizações */}
                {activeTab === "usage" && (
                  <div className="space-y-3">
                    {walletUsage.length === 0 ? (
                      <div className="text-center py-12">
                        <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">Nenhuma utilização de saldo em leilões</p>
                      </div>
                    ) : (
                      walletUsage.map((transaction) => (
                        <div key={transaction.id} className="p-4 bg-gray-900/50 border border-red-500/20 rounded-lg hover:border-red-500/50 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <TrendingDown className="w-5 h-5 text-red-500" />
                              <div>
                                <p className="text-white font-semibold">Saldo Utilizado em Leilão</p>
                                <p className="text-gray-400 text-sm">{transaction.description || "Utilização de saldo"}</p>
                                <p className="text-gray-500 text-xs mt-1">{new Date(transaction.created_date).toLocaleString('pt-BR')}</p>
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
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}