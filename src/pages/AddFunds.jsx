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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/20 via-gray-900 to-black py-12 px-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="mb-12">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white mb-6 backdrop-blur-sm bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl blur-xl group-hover:blur-2xl transition-all opacity-60"></div>
              <div className="relative p-5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl shadow-2xl">
                <Wallet className="w-10 h-10 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Adicionar Saldo
              </h1>
              <p className="text-gray-400 text-lg">Recarregue sua carteira de forma rápida e segura</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna Principal - Pacotes */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Saldo Atual */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
              <Card className="relative backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent"></div>
                <CardContent className="p-8 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Saldo Disponível</p>
                      </div>
                      <p className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                        R$ {(wallet?.balance || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"></div>
                      <div className="relative p-5 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl border border-green-400/20">
                        <TrendingUp className="w-12 h-12 text-green-400" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pacotes de Depósito */}
            <div className="mt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl border border-yellow-400/20">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Pacotes Rápidos</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 p-3">
                {packages.map((pkg) => {
                  const isSelected = selectedAmount === pkg.amount;
                  const hasBonus = pkg.bonus_percentage > 0;
                  
                  return (
                    <div key={pkg.id} className="relative group">
                      <div className={`absolute inset-0 rounded-3xl blur-xl transition-all ${
                        isSelected 
                          ? "bg-gradient-to-br from-green-500/40 to-emerald-500/40" 
                          : "bg-white/5 group-hover:bg-green-500/20"
                      }`}></div>
                      <Card
                        onClick={() => handlePackageSelect(pkg.amount)}
                        className={`relative cursor-pointer transition-all duration-500 border ${
                          isSelected
                            ? "backdrop-blur-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-400/50 scale-105 shadow-2xl shadow-green-500/20"
                            : "backdrop-blur-xl bg-white/5 border-white/10 hover:border-green-500/30 hover:scale-102 hover:bg-white/10"
                        }`}
                      >
                        <CardContent className="p-6 text-center relative">
                          {hasBonus && (
                            <div className="absolute -top-2 -right-2 z-10">
                              <div className="relative">
                                <div className="absolute inset-0 bg-yellow-500 rounded-full blur-md animate-pulse"></div>
                                <Badge className="relative bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-bold border-0 shadow-lg">
                                  +{pkg.bonus_percentage}%
                                </Badge>
                              </div>
                            </div>
                          )}
                          
                          {isSelected && (
                            <div className="absolute -top-2 -left-2 z-10">
                              <div className="relative">
                                <div className="absolute inset-0 bg-white rounded-full blur-sm"></div>
                                <div className="relative p-1 bg-white rounded-full shadow-lg">
                                  <Check className="w-4 h-4 text-green-600" />
                                </div>
                              </div>
                            </div>
                          )}

                          <div className={`transition-all ${isSelected ? "scale-110" : ""}`}>
                            <p className={`text-4xl font-bold mb-2 transition-all ${
                              isSelected 
                                ? "text-transparent bg-gradient-to-br from-white to-green-200 bg-clip-text" 
                                : "text-green-400"
                            }`}>
                              R$ {pkg.amount.toFixed(0)}
                            </p>
                            <p className={`text-sm font-medium ${isSelected ? "text-green-100" : "text-gray-400"}`}>
                              {pkg.label}
                            </p>
                          </div>

                          {hasBonus && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <p className={`text-xs font-semibold ${isSelected ? "text-yellow-300" : "text-yellow-400/80"}`}>
                                🎁 Ganhe R$ {(pkg.amount * (pkg.bonus_percentage / 100)).toFixed(2)}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Valor Customizado */}
            <div className="relative group mt-8">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl blur-md group-hover:blur-lg transition-all"></div>
              <Card className="relative backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 to-transparent"></div>
                <CardHeader className="relative">
                  <CardTitle className="text-white flex items-center gap-3 text-xl">
                    <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl border border-blue-400/20">
                      <CreditCard className="w-5 h-5 text-blue-400" />
                    </div>
                    Outro Valor
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Digite o valor (mínimo R$ 30)"
                        value={customAmount}
                        onChange={handleCustomAmountChange}
                        className="backdrop-blur-sm bg-black/30 border-white/20 text-white text-lg h-16 rounded-2xl focus:border-green-400/50 focus:ring-2 focus:ring-green-400/20 transition-all placeholder:text-gray-500"
                      />
                    </div>
                    <Button
                      onClick={handleProceedToPayment}
                      disabled={!selectedAmount || selectedAmount < 30 || processing}
                      className="relative group bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold px-10 h-16 text-lg rounded-2xl shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-0"
                    >
                      <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      {processing ? (
                        <span className="relative flex items-center">
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processando
                        </span>
                      ) : (
                        <span className="relative flex items-center">
                          <Zap className="w-5 h-5 mr-2" />
                          Pagar
                        </span>
                      )}
                    </Button>
                  </div>

                  {/* Resumo do que será creditado */}
                  {selectedAmount && selectedAmount >= 30 && (
                    <div className="relative group/summary overflow-hidden mt-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl blur-sm group-hover/summary:blur-md transition-all"></div>
                      <div className="relative p-6 backdrop-blur-xl bg-gradient-to-br from-green-500/5 to-emerald-500/5 border border-green-400/20 rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-green-500/20 rounded-xl border border-green-400/30">
                            <Wallet className="w-5 h-5 text-green-400" />
                          </div>
                          <span className="text-white font-bold text-base">Será Creditado</span>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 backdrop-blur-sm bg-black/20 rounded-xl">
                            <span className="text-gray-300 text-sm font-medium">Valor do depósito:</span>
                            <span className="text-white font-bold text-lg">R$ {selectedAmount.toFixed(2)}</span>
                          </div>
                          
                          {(() => {
                            const matchingPkg = packages.find(p => p.amount === selectedAmount);
                            const bonus = matchingPkg?.bonus_percentage || 0;
                            const bonusAmount = bonus > 0 ? (selectedAmount * (bonus / 100)) : 0;
                            const totalAmount = selectedAmount + bonusAmount;
                            
                            return (
                              <>
                                {bonus > 0 && (
                                  <div className="flex items-center justify-between p-3 backdrop-blur-sm bg-yellow-500/10 rounded-xl border border-yellow-400/20">
                                    <span className="text-yellow-300 text-sm flex items-center gap-2 font-medium">
                                      <Gift className="w-4 h-4" />
                                      Bônus ({bonus}%)
                                    </span>
                                    <span className="text-yellow-300 font-bold text-lg">+ R$ {bonusAmount.toFixed(2)}</span>
                                  </div>
                                )}
                                
                                <div className="relative mt-2 overflow-hidden">
                                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl"></div>
                                  <div className="relative p-4 backdrop-blur-sm bg-black/30 rounded-xl border border-green-400/30 flex items-center justify-between">
                                    <span className="text-white font-bold text-base">Total na carteira:</span>
                                    <span className="text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text font-bold text-2xl">
                                      R$ {totalAmount.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-gray-400 text-xs backdrop-blur-sm bg-black/20 p-3 rounded-xl border border-white/5 mt-4">
                    <Shield className="w-3 h-3" />
                    <span>Valor mínimo: R$ 30,00 | Valor máximo: R$ 10.000,00</span>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>

          {/* Coluna Lateral - Informações */}
          <div className="space-y-6">
            
            {/* Benefícios */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl blur-md group-hover:blur-lg transition-all"></div>
              <Card className="relative backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 to-transparent"></div>
                <CardHeader className="relative">
                  <CardTitle className="text-white flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl border border-blue-400/20">
                      <Gift className="w-5 h-5 text-blue-400" />
                    </div>
                    Vantagens
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 relative">
                  <div className="flex items-start gap-4 p-4 backdrop-blur-sm bg-white/5 rounded-2xl border border-white/10 hover:border-green-400/30 transition-all group/item">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500/15 rounded-xl blur-sm group-hover/item:blur-md transition-all"></div>
                      <div className="relative p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-xl border border-green-400/20">
                        <Zap className="w-5 h-5 text-green-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm mb-1">Pagamento Instantâneo</p>
                      <p className="text-gray-400 text-xs">Arrematação sem espera</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 backdrop-blur-sm bg-white/5 rounded-2xl border border-white/10 hover:border-blue-400/30 transition-all group/item">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500/15 rounded-xl blur-sm group-hover/item:blur-md transition-all"></div>
                      <div className="relative p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm rounded-xl border border-blue-400/20">
                        <Shield className="w-5 h-5 text-blue-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm mb-1">100% Seguro</p>
                      <p className="text-gray-400 text-xs">Transações protegidas</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 backdrop-blur-sm bg-white/5 rounded-2xl border border-white/10 hover:border-purple-400/30 transition-all group/item">
                    <div className="relative">
                      <div className="absolute inset-0 bg-purple-500/15 rounded-xl blur-sm group-hover/item:blur-md transition-all"></div>
                      <div className="relative p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-xl border border-purple-400/20">
                        <Clock className="w-5 h-5 text-purple-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm mb-1">Disponível 24/7</p>
                      <p className="text-gray-400 text-xs">Recarregue a qualquer momento</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Transações Recentes */}
            {recentTransactions.length > 0 && (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl blur-md group-hover:blur-lg transition-all"></div>
                <Card className="relative backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/3 to-transparent"></div>
                  <CardHeader className="relative">
                    <CardTitle className="text-white text-base font-bold">Últimos Depósitos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 relative">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 backdrop-blur-sm bg-white/5 rounded-2xl border border-white/10 hover:border-purple-400/30 transition-all">
                        <div>
                          <p className="text-white text-base font-bold">
                            R$ {tx.amount.toFixed(2)}
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            {new Date(tx.created_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-green-500/20 rounded-full blur-md"></div>
                          <Badge className="relative backdrop-blur-sm bg-green-500/20 text-green-400 border-green-500/30 font-semibold">
                            Confirmado
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Informações de Pagamento */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-3xl blur-md group-hover:blur-lg transition-all"></div>
              <Card className="relative backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/3 to-transparent"></div>
                <CardHeader className="relative">
                  <CardTitle className="text-white text-base font-bold">Como Funciona?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm relative">
                  <div className="flex items-start gap-4 p-3 backdrop-blur-sm bg-white/5 rounded-xl border border-white/10">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-400/30 flex items-center justify-center">
                      <span className="text-green-400 font-bold text-sm">1</span>
                    </div>
                    <p className="text-gray-300 pt-1">Escolha o valor que deseja adicionar</p>
                  </div>
                  <div className="flex items-start gap-4 p-3 backdrop-blur-sm bg-white/5 rounded-xl border border-white/10">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-blue-400/30 flex items-center justify-center">
                      <span className="text-blue-400 font-bold text-sm">2</span>
                    </div>
                    <p className="text-gray-300 pt-1">Realize o pagamento via PIX ou Boleto</p>
                  </div>
                  <div className="flex items-start gap-4 p-3 backdrop-blur-sm bg-white/5 rounded-xl border border-white/10">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-400/30 flex items-center justify-center">
                      <span className="text-purple-400 font-bold text-sm">3</span>
                    </div>
                    <p className="text-gray-300 pt-1">Saldo creditado automaticamente após confirmação</p>
                  </div>
                  <div className="flex items-start gap-4 p-3 backdrop-blur-sm bg-white/5 rounded-xl border border-white/10">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm border border-yellow-400/30 flex items-center justify-center">
                      <span className="text-yellow-400 font-bold text-sm">4</span>
                    </div>
                    <p className="text-gray-300 pt-1">Use em qualquer leilão sem burocracia!</p>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}