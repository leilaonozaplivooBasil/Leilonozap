import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { AlertCircle, Wallet } from "lucide-react";

export default function LowBalanceModal({ 
  isOpen, 
  currentBalance, 
  requiredAmount, 
  onWatchAsSpectator,
  onClose 
}) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const deficit = requiredAmount - currentBalance;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] p-4">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-6 max-w-md w-full border-2 border-yellow-500/30 shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-yellow-500/20 rounded-full">
            <AlertCircle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-white text-center mb-2">
          Saldo Insuficiente
        </h3>

        {/* Message */}
        <p className="text-gray-400 text-center mb-6">
          Seu saldo não é suficiente para participar deste leilão
        </p>

        {/* Balance Info */}
        <div className="bg-gray-700/50 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Seu saldo:</span>
            <span className="text-lg font-semibold text-gray-100">
              R$ {currentBalance.toFixed(2)}
            </span>
          </div>
          <div className="h-px bg-gray-600"></div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Lance mínimo:</span>
            <span className="text-lg font-semibold text-yellow-400">
              R$ {requiredAmount.toFixed(2)}
            </span>
          </div>
          <div className="h-px bg-gray-600"></div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Faltam:</span>
            <span className="text-lg font-bold text-red-400">
              R$ {deficit.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          {/* Add Funds */}
          <Button
            onClick={() => {
              navigate(createPageUrl("AddFunds"));
              onClose();
            }}
            className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-base shadow-lg"
          >
            <Wallet className="w-5 h-5 mr-2" />
            Adicionar Saldo
          </Button>

          {/* Watch as Spectator */}
          <Button
            onClick={onWatchAsSpectator}
            className="w-full h-12 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold transition-colors"
          >
            👀 Assistir como Telespectador
          </Button>

          {/* Close */}
          <Button
            onClick={onClose}
            className="w-full h-10 bg-gray-700/50 hover:bg-red-600 text-gray-300 hover:text-white font-semibold transition-colors"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}