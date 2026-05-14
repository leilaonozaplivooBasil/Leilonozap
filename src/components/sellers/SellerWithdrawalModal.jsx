import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function SellerWithdrawalModal({
  isOpen,
  onClose,
  saldoDisponivel,
  onSuccess,
}) {
  const [amount, setAmount] = useState("");
  const [pixKeyType, setPixKeyType] = useState("CPF");
  const [pixKey, setPixKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Valor inválido");
      return;
    }

    if (amountNum > saldoDisponivel) {
      toast.error(`Saldo insuficiente. Disponível: R$ ${saldoDisponivel.toFixed(2)}`);
      return;
    }

    if (!pixKey.trim()) {
      toast.error("Informe a chave PIX");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await base44.functions.invoke("requestSellerWithdrawal", {
        amount: amountNum,
        pix_key: pixKey.trim(),
        pix_key_type: pixKeyType,
      });

      const data = response?.data;
      if (data?.success) {
        toast.success(data.message || "Saque solicitado com sucesso!");
        setAmount("");
        setPixKey("");
        setPixKeyType("CPF");
        onClose();
        onSuccess();
      } else {
        toast.error(data?.error || "Erro ao solicitar saque");
      }
    } catch (err) {
      toast.error(err.message || "Erro ao solicitar saque");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Solicitar Saque</DialogTitle>
          <DialogDescription className="text-gray-400">
            Saldo disponível: R$ {saldoDisponivel.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-300">Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={saldoDisponivel}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label className="text-gray-300">Tipo de Chave PIX</Label>
            <Select value={pixKeyType} onValueChange={setPixKeyType} disabled={isSubmitting}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CPF">CPF</SelectItem>
                <SelectItem value="PHONE">Telefone</SelectItem>
                <SelectItem value="EMAIL">E-mail</SelectItem>
                <SelectItem value="RANDOM">Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-300">Chave PIX</Label>
            <Input
              type="text"
              placeholder="Digite sua chave PIX"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 border-gray-600 text-gray-300">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !amount || !pixKey}
              className="flex-1 bg-green-600 hover:bg-green-700">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Solicitando...
                </>
              ) : (
                "Solicitar Saque"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}