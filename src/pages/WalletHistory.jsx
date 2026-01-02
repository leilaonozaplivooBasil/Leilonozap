import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, ArrowLeft, TrendingUp, TrendingDown, RefreshCw, DollarSign } from "lucide-react";
import { toast } from "sonner";
import WalletBalance from "../components/wallet/WalletBalance";

export default function WalletHistory() {
  const [currentUser, setCurrentUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
      setTransactions(data);
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

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
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

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <History className="w-8 h-8 text-green-500" />
            <h1 className="text-3xl font-bold text-white">Histórico da Carteira</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTransactions(currentUser.id)}
            className="border-gray-600 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Saldo Atual */}
        <div className="mb-8">
          <WalletBalance userId={currentUser.id} showActions={true} />
        </div>

        {/* Transações */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Todas as Transações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-3"></div>
                <p className="text-gray-400">Carregando transações...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Nenhuma transação ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <Card key={transaction.id} className="bg-gray-900 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(transaction.type, transaction.direction)}
                          <div>
                            <p className="text-white font-semibold">
                              {getTypeLabel(transaction.type)}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {transaction.description || "Sem descrição"}
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                              {new Date(transaction.created_date).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-bold ${getTransactionColor(transaction.direction)}`}>
                            {transaction.direction === "credit" ? "+" : "-"}
                            R$ {transaction.amount.toFixed(2)}
                          </p>
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}