import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function WalletBalance({ userId, showActions = true, onBalanceLoaded }) {
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      loadBalance();
    }
  }, [userId]);

  const loadBalance = async () => {
    try {
      const wallets = await base44.entities.Wallet.filter({ user_id: userId });
      if (wallets.length > 0) {
        const newBalance = wallets[0].balance || 0;
        setBalance(newBalance);
        if (onBalanceLoaded) {
          onBalanceLoaded(newBalance);
        }
      } else {
        // Criar carteira se não existir
        await base44.entities.Wallet.create({ user_id: userId, balance: 0 });
        setBalance(0);
        if (onBalanceLoaded) {
          onBalanceLoaded(0);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar saldo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-white/20 rounded w-24 mb-2"></div>
            <div className="h-8 bg-white/20 rounded w-32"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0 shadow-lg">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <Wallet className="w-4 h-4" />
              <span>Saldo em Conta</span>
            </div>
            <p className="text-2xl font-bold text-white">
              R$ {balance.toFixed(2)}
            </p>
          </div>
          {showActions && (
            <Button
              onClick={() => navigate(createPageUrl("WalletHistory"))}
              className="bg-white text-green-700 hover:bg-white/90 h-9 text-sm font-semibold px-4 shadow-lg"
            >
              Carteira
            </Button>
          )}
        </div>
      </CardContent>

    </Card>
  );
}