import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  TrendingUp, 
  Sparkles, 
  ArrowLeft, 
  Check, 
  CreditCard,
  Loader2,
  Gift,
  Zap,
  Shield,
  Clock
} from "lucide-react";
import { createPageUrl } from "@/utils";

export default function AddFunds() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [packages, setPackages] = useState([]);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const savedUser = localStorage.getItem('currentUser');
      if (!savedUser) {
        navigate(createPageUrl("Home"));
        return;
      }

      const currentUser = JSON.parse(savedUser);
      setUser(currentUser);

      // Carregar carteira
      const wallets = await base44.entities.Wallet.filter({ user_id: currentUser.id });
      if (wallets.length > 0) {
        setWallet(wallets[0]);
      }

      // Carregar pacotes de depósito
      const depositPackages = await base44.entities.DepositPackage.filter({ is_active: true });
      const sortedPackages = depositPackages.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setPackages(sortedPackages);

      // Carregar transações recentes
      const transactions = await base44.entities.WalletTransaction.filter({ 
        user_id: currentUser.id,
        type: "deposit",
        status: "confirmed"
      });
      setRecentTransactions(transactions.slice(0, 3));

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePackageSelect = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(parseFloat(value));
    } else {
      setSelectedAmount(null);
    }
  };

  const handleProceedToPayment = async () => {
    if (!selectedAmount || selectedAmount < 30) {
      alert("O valor mínimo para depósito é R$ 30,00");
      return;
    }

    setProcessing(true);

    try {
      // Criar pagamento via ASAAS
      const response = await base44.functions.invoke('createAsaasPayment', {
        user_id: user.id,
        amount: selectedAmount,
        description: `Depósito de R$ ${selectedAmount.toFixed(2)} na carteira`,
        payment_type: "wallet_deposit"
      });

      if (response.data.success && response.data.payment) {
        // Redirecionar para página de pagamento ou mostrar QR code
        window.location.href = response.data.payment.invoiceUrl || response.data.payment.bankSlipUrl;
      } else {
        alert("Erro ao gerar pagamento. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      alert("Erro ao processar pagamento. Tente novamente.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Adicionar Saldo</h1>
              <p className="text-gray-400">Escolha o valor e recarregue sua carteira</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna Principal - Pacotes */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Saldo Atual */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Saldo Disponível</p>
                    <p className="text-4xl font-bold text-white">
                      R$ {(wallet?.balance || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-green-500/10 rounded-2xl">
                    <TrendingUp className="w-10 h-10 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pacotes de Depósito */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Pacotes Rápidos
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {packages.map((pkg) => {
                  const isSelected = selectedAmount === pkg.amount;
                  const hasBonus = pkg.bonus_percentage > 0;
                  
                  return (
                    <Card
                      key={pkg.id}
                      onClick={() => handlePackageSelect(pkg.amount)}
                      className={`cursor-pointer transition-all duration-300 ${
                        isSelected
                          ? "bg-gradient-to-br from-green-500 to-emerald-600 border-green-400 scale-105"
                          : "bg-gray-800 border-gray-700 hover:border-green-500/50 hover:scale-102"
                      }`}
                    >
                      <CardContent className="p-6 text-center relative">
                        {hasBonus && (
                          <Badge className="absolute -top-2 -right-2 bg-yellow-500 text-gray-900 font-bold">
                            +{pkg.bonus_percentage}%
                          </Badge>
                        )}
                        
                        {isSelected && (
                          <div className="absolute -top-2 -left-2 p-1 bg-white rounded-full">
                            <Check className="w-4 h-4 text-green-600" />
                          </div>
                        )}

                        <p className={`text-3xl font-bold mb-2 ${isSelected ? "text-white" : "text-green-400"}`}>
                          R$ {pkg.amount.toFixed(0)}
                        </p>
                        <p className={`text-sm ${isSelected ? "text-green-100" : "text-gray-400"}`}>
                          {pkg.label}
                        </p>

                        {hasBonus && (
                          <div className="mt-3 pt-3 border-t border-white/20">
                            <p className="text-xs text-white font-semibold">
                              Receba R$ {(pkg.amount * (pkg.bonus_percentage / 100)).toFixed(2)} de bônus!
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Valor Customizado */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Outro Valor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Digite o valor (mínimo R$ 30)"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      className="bg-gray-900 border-gray-600 text-white text-lg h-14"
                    />
                  </div>
                  <Button
                    onClick={handleProceedToPayment}
                    disabled={!selectedAmount || selectedAmount < 30 || processing}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold px-8 h-14 text-lg"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processando
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Pagar
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  Valor mínimo: R$ 30,00 | Valor máximo: R$ 10.000,00
                </p>
              </CardContent>
            </Card>

          </div>

          {/* Coluna Lateral - Informações */}
          <div className="space-y-6">
            
            {/* Benefícios */}
            <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-blue-400" />
                  Vantagens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Zap className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Pagamento Instantâneo</p>
                    <p className="text-gray-400 text-xs">Arrematação sem espera</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Shield className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">100% Seguro</p>
                    <p className="text-gray-400 text-xs">Transações protegidas</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Clock className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Disponível 24/7</p>
                    <p className="text-gray-400 text-xs">Recarregue a qualquer momento</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transações Recentes */}
            {recentTransactions.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-base">Últimos Depósitos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                      <div>
                        <p className="text-white text-sm font-semibold">
                          R$ {tx.amount.toFixed(2)}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {new Date(tx.created_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Confirmado
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Informações de Pagamento */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-base">Como Funciona?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">1.</span>
                  <p>Escolha o valor que deseja adicionar</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">2.</span>
                  <p>Realize o pagamento via PIX ou Boleto</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">3.</span>
                  <p>Saldo creditado automaticamente após confirmação</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">4.</span>
                  <p>Use em qualquer leilão sem burocracia!</p>
                </div>
              </CardContent>
            </Card>

            {/* Card de Resumo */}
            {selectedAmount && selectedAmount >= 30 && (
              <Card className="bg-gradient-to-br from-green-800/30 to-emerald-900/30 border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2 text-base">
                    <Wallet className="w-5 h-5 text-green-400" />
                    Será Creditado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Valor do depósito:</span>
                      <span className="text-white font-semibold">R$ {selectedAmount.toFixed(2)}</span>
                    </div>
                    
                    {(() => {
                      const matchingPkg = packages.find(p => p.amount === selectedAmount);
                      const bonus = matchingPkg?.bonus_percentage || 0;
                      const bonusAmount = bonus > 0 ? (selectedAmount * (bonus / 100)) : 0;
                      const totalAmount = selectedAmount + bonusAmount;
                      
                      return (
                        <>
                          {bonus > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-green-400 text-sm flex items-center gap-1">
                                <Gift className="w-3 h-3" />
                                Bônus ({bonus}%):
                              </span>
                              <span className="text-green-400 font-semibold">+ R$ {bonusAmount.toFixed(2)}</span>
                            </div>
                          )}
                          
                          <div className="pt-3 border-t border-gray-700 flex items-center justify-between">
                            <span className="text-white font-bold">Total na carteira:</span>
                            <span className="text-green-400 font-bold text-xl">R$ {totalAmount.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}