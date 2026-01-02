import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Wallet, CreditCard, Zap } from "lucide-react";
import { toast } from "sonner";

export default function DepositModal({ isOpen, onClose, userId, requiredAmount = 0 }) {
  const [packages, setPackages] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPackages();
      loadBalance();
    }
  }, [isOpen]);

  const loadPackages = async () => {
    try {
      const data = await base44.entities.DepositPackage.filter({ is_active: true }, "sort_order", 50);
      setPackages(data);
    } catch (error) {
      console.error("Erro ao carregar pacotes:", error);
    }
  };

  const loadBalance = async () => {
    try {
      const wallets = await base44.entities.Wallet.filter({ user_id: userId });
      if (wallets.length > 0) {
        setCurrentBalance(wallets[0].balance || 0);
      }
    } catch (error) {
      console.error("Erro ao carregar saldo:", error);
    }
  };

  const handleDeposit = async (pkg) => {
    setIsProcessing(true);
    try {
      // Criar transação pendente
      const transaction = await base44.entities.WalletTransaction.create({
        user_id: userId,
        type: "deposit",
        direction: "credit",
        amount: pkg.amount,
        status: "pending",
        description: `Depósito ${pkg.label}`
      });

      toast.info("Redirecionando para pagamento...");
      
      // Aqui você integraria com o gateway de pagamento
      // Por enquanto, simularemos uma confirmação imediata para demonstração
      setTimeout(async () => {
        await confirmDeposit(transaction.id, pkg.amount);
      }, 2000);

    } catch (error) {
      toast.error("Erro ao processar depósito: " + error.message);
      setIsProcessing(false);
    }
  };

  const confirmDeposit = async (transactionId, amount) => {
    try {
      // Atualizar transação
      await base44.entities.WalletTransaction.update(transactionId, { status: "confirmed" });
      
      // Atualizar saldo
      const wallets = await base44.entities.Wallet.filter({ user_id: userId });
      if (wallets.length > 0) {
        const newBalance = (wallets[0].balance || 0) + amount;
        await base44.entities.Wallet.update(wallets[0].id, { balance: newBalance });
      } else {
        await base44.entities.Wallet.create({ user_id: userId, balance: amount });
      }

      toast.success("✅ Depósito confirmado!");
      onClose(true); // true indica que houve depósito
    } catch (error) {
      toast.error("Erro ao confirmar depósito: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const missingAmount = Math.max(0, requiredAmount - currentBalance);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wallet className="w-6 h-6 text-green-500" />
            Depositar Saldo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Saldo Atual */}
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">Saldo Atual</p>
            <p className="text-2xl font-bold text-green-400">
              R$ {currentBalance.toFixed(2)}
            </p>
          </div>

          {/* Aviso de Saldo Insuficiente */}
          {requiredAmount > 0 && missingAmount > 0 && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
              <p className="text-red-400 text-sm">
                ⚠️ Saldo insuficiente. Você precisa de mais{" "}
                <strong>R$ {missingAmount.toFixed(2)}</strong>
              </p>
            </div>
          )}

          {/* Pacotes de Depósito */}
          <div>
            <p className="text-gray-400 text-sm mb-3">Escolha um pacote:</p>
            <div className="grid grid-cols-2 gap-3">
              {packages.map((pkg) => {
                const finalAmount = pkg.amount + (pkg.amount * (pkg.bonus_percentage || 0) / 100);
                const hasBonus = pkg.bonus_percentage > 0;
                
                return (
                  <button
                    key={pkg.id}
                    onClick={() => handleDeposit(pkg)}
                    disabled={isProcessing}
                    className="relative bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-green-500 rounded-lg p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {hasBonus && (
                      <Badge className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs">
                        +{pkg.bonus_percentage}%
                      </Badge>
                    )}
                    <CreditCard className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <p className="font-bold text-white">R$ {pkg.amount.toFixed(2)}</p>
                    {hasBonus && (
                      <p className="text-xs text-green-400">
                        Você recebe: R$ {finalAmount.toFixed(2)}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Informação */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
            <p className="text-blue-300 text-xs flex items-start gap-2">
              <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Após o depósito ser confirmado, o saldo estará disponível
                imediatamente para uso em leilões.
              </span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}