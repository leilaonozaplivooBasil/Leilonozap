import React, { useState } from "react";
import { toast } from "sonner";
import { plataforma } from "@/api/plataformaClient";
import { Loader2, Search, Wallet } from "lucide-react";

// 🧪 Admin-only — credita "saldo de teste" (test_wallet_balance) em qualquer usuário,
// simulando um depósito, SEM gerar comissão real nem tocar no saldo real da carteira.
// Esse saldo pode ser usado depois para pagar a adesão de Vendedor (VendedorCheckout).
export default function AdminCreditoTeste() {
  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState(null);
  const [amount, setAmount] = useState("1497");
  const [crediting, setCrediting] = useState(false);

  const handleSearch = async () => {
    if (!email.trim()) return;
    setSearching(true);
    setFound(null);
    try {
      const users = await plataforma.entities.AppUser.filter({ email: email.trim() });
      if (!users?.[0]) {
        toast.error("Usuário não encontrado.");
      } else {
        setFound(users[0]);
      }
    } catch (e) {
      toast.error("Erro ao buscar usuário.");
    } finally {
      setSearching(false);
    }
  };

  const handleCredit = async () => {
    const value = Number(amount);
    if (!found || !value || value <= 0) return;
    setCrediting(true);
    try {
      const saved = localStorage.getItem("currentUser");
      const admin = saved ? JSON.parse(saved) : null;
      const res = await plataforma.functions.invoke("creditTestWalletBalance", {
        requester_id: admin?.id,
        target_user_id: found.id,
        amount: value,
      });
      if (res?.success) {
        toast.success(`Saldo de teste creditado! Novo saldo: R$ ${res.new_balance}`);
        setFound({ ...found, test_wallet_balance: res.new_balance });
      } else {
        toast.error(res?.error || "Erro ao creditar saldo.");
      }
    } catch (e) {
      toast.error("Erro ao creditar saldo.");
    } finally {
      setCrediting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-nz-tinta px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border border-amber-300 bg-amber-50 text-amber-700">
            <Wallet className="w-4 h-4" /> Ferramenta de Teste
          </span>
          <h1 className="mt-4 text-2xl font-black">Creditar Saldo de Teste</h1>
          <p className="mt-2 text-nz-tinta-fraca text-sm">
            Simula um depósito para qualquer usuário. Esse saldo pode ser usado para pagar
            a adesão de Vendedor sem PIX/cartão. Não gera comissão real.
          </p>
        </div>

        <div className="rounded-2xl border border-nz-borda bg-nz-cinza-fundo p-4">
          <label className="text-sm font-semibold text-nz-tinta">E-mail do usuário</label>
          <div className="flex gap-2 mt-1.5">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="usuario@email.com"
              className="flex-1 px-3 py-2.5 rounded-lg border border-nz-borda text-sm"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-2.5 rounded-lg bg-nz-verde text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-60"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </button>
          </div>
        </div>

        {found && (
          <div className="rounded-2xl border-2 border-nz-verde/30 bg-white mt-4 p-4">
            <p className="font-bold text-nz-tinta">{found.full_name}</p>
            <p className="text-sm text-nz-tinta-fraca">{found.email}</p>
            <p className="text-sm mt-2">
              Saldo de teste atual: <strong className="text-nz-verde">R$ {Number(found.test_wallet_balance || 0)}</strong>
            </p>

            <label className="text-sm font-semibold text-nz-tinta mt-4 block">Valor a creditar</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg border border-nz-borda text-sm"
            />

            <button
              onClick={handleCredit}
              disabled={crediting}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-white bg-nz-verde hover:bg-nz-verde/90 disabled:opacity-60"
            >
              {crediting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
              Creditar Saldo de Teste
            </button>
          </div>
        )}
      </div>
    </div>
  );
}