import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, CreditCard, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import WalletBalance from "../components/wallet/WalletBalance";
import { Input } from "@/components/ui/input";
import { createDepositIntent } from "@/functions/createDepositIntent";

export default function WalletDeposit() {
  const [currentUser, setCurrentUser] = useState(null);
  const [packages, setPackages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = () => {
      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');
      
      if (savedUserJSON && isLoggedIn) {
        const user = JSON.parse(savedUserJSON);
        setCurrentUser(user);
        loadPackages();
      } else {
        toast.error("Faça login para continuar");
        navigate(createPageUrl("Home"));
      }
    };
    loadUser();
  }, []);

  const loadPackages = async () => {
    try {
      const data = await base44.entities.DepositPackage.filter({ is_active: true }, "sort_order", 50);
      setPackages(data);
    } catch (error) {
      console.error("Erro ao carregar pacotes:", error);
      toast.error("Erro ao carregar pacotes de depósito");
    }
  };

  const handleDeposit = async (pkg) => {
    setIsProcessing(true);
    try {
      toast.info("Redirecionando para pagamento seguro...");
      
      const response = await createDepositIntent({
        deposit_package_id: pkg.id
      });

      if (response?.payment_data?.checkout_url) {
        window.location.href = response.payment_data.checkout_url;
      } else if (response?.payment_data?.pix_key) {
        toast.success("PIX gerado! (implementar modal)");
        setIsProcessing(false);
      } else {
        toast.error("Erro ao criar sessão de pagamento");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);
      setIsProcessing(false);
    }
  };

  const handleCustomDeposit = async () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < 10) {
      toast.error("Valor mínimo: R$ 10,00");
      return;
    }

    setIsProcessing(true);
    try {
      toast.info("Redirecionando para pagamento seguro...");
      
      // Para valor customizado, precisa criar um pacote temporário ou usar função diferente
      toast.info("Funcionalidade de valor customizado em desenvolvimento");
      setIsProcessing(false);
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);
      setIsProcessing(false);
    }
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

        <div className="flex items-center gap-3 mb-6">
          <Wallet className="w-8 h-8 text-green-500" />
          <h1 className="text-3xl font-bold text-white">Depositar Saldo</h1>
        </div>

        {/* Saldo Atual */}
        <div className="mb-8">
          <WalletBalance userId={currentUser.id} showActions={false} />
        </div>

        {/* Pacotes */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Escolha um Pacote</CardTitle>
            <p className="text-gray-400 text-sm">
              Selecione o valor que deseja depositar em sua conta
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className="bg-gray-900 border-gray-700 hover:border-green-500 transition-all cursor-pointer"
                  onClick={() => !isProcessing && handleDeposit(pkg)}
                >
                  <CardContent className="p-6 text-center">
                    <CreditCard className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm mb-1">{pkg.label}</p>
                    <p className="text-3xl font-bold text-white mb-4">
                      R$ {pkg.amount.toFixed(2)}
                    </p>
                    <Button
                      disabled={isProcessing}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing ? "Processando..." : "Depositar"}
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {/* Card de Valor Personalizado */}
              <Card className="bg-gray-900 border-gray-700 hover:border-green-500 transition-all">
                <CardContent className="p-6 text-center">
                  <CreditCard className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-sm mb-1">Digite o valor do depósito</p>
                  <div className="mb-4">
                    <Input
                      type="number"
                      min="10"
                      step="10"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="text-center text-3xl font-bold bg-transparent border-none text-white focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0,00"
                    />
                  </div>
                  <Button
                    onClick={handleCustomDeposit}
                    disabled={!customAmount || parseFloat(customAmount) < 10 || isProcessing}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? "Processando..." : "Depositar"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Informações */}
        <Card className="bg-gray-800 border-gray-700 mt-6">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">
              ℹ️ <strong>Como funciona:</strong>
              <br />
              • Escolha um pacote de depósito
              <br />
              • Efetue o pagamento via PIX ou cartão
              <br />
              • O saldo é creditado automaticamente após confirmação
              <br />
              • Use o saldo para pagar produtos arrematados
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}