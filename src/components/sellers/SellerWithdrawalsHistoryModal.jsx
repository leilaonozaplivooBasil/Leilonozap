import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SellerWithdrawalsHistoryModal({ isOpen, onClose, saques }) {
  const statusColors = {
    pending: "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",
    approved: "bg-blue-900/30 text-blue-400 border-blue-500/30",
    paid: "bg-green-900/30 text-green-400 border-green-500/30",
    rejected: "bg-red-900/30 text-red-400 border-red-500/30",
  };

  const statusLabels = {
    pending: "Aguardando",
    approved: "Aprovado",
    paid: "Pago",
    rejected: "Rejeitado",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Histórico de Saques</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {!saques || saques.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nenhum saque solicitado</p>
          ) : (
            saques.map((saque) => (
              <div key={saque.id} className="bg-gray-700/30 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div className="flex-1">
                    <div className="text-xl font-bold text-white">
                      R$ {saque.amount?.toFixed(2) || "0.00"}
                    </div>
                    <div className="text-sm text-gray-400">
                      {format(new Date(saque.created_date), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </div>
                  </div>
                  <Badge className={statusColors[saque.status] || "bg-gray-600"}>
                    {statusLabels[saque.status] || saque.status}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  Chave PIX ({saque.pix_key_type}): {saque.pix_key}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}