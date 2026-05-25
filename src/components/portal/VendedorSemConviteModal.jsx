import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Send } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function VendedorSemConviteModal({ isOpen, onClose }) {
  const [email, setEmail] = useState("");

  const handleSolicitarReenvio = (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast({ title: "E-mail inválido", description: "Informe um e-mail válido.", variant: "destructive" });
      return;
    }
    toast({
      title: "🚧 Em breve!",
      description: "O reenvio automático de link estará disponível em breve. Por enquanto, fale com o Licenciado que te recrutou.",
    });
    setEmail("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-500/15 border border-gray-500/30 flex items-center justify-center mb-3">
            <UserPlus className="w-7 h-7 text-gray-300" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-white">
            Acesso exclusivo por convite
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-gray-300 text-sm text-center leading-relaxed">
            O painel do Vendedor é <strong className="text-white">exclusivo por convite</strong>.
            Procure um <strong className="text-emerald-300">Licenciado parceiro</strong> do Leilão
            NoZap e peça para ele te recrutar.
          </p>

          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-xs text-gray-400 leading-relaxed">
            <p className="text-amber-300 font-semibold mb-1">💡 Como funciona:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Um Licenciado cadastra você no painel dele</li>
              <li>Você recebe um link mágico por WhatsApp/E-mail</li>
              <li>Clica no link e define sua senha</li>
              <li>Pronto — comece a vender e ganhar comissão</li>
            </ol>
          </div>

          <form onSubmit={handleSolicitarReenvio} className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-3">
            <p className="text-xs text-emerald-200 font-semibold">
              Já é vendedor mas perdeu o link?
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu e-mail"
              className="w-full min-h-[44px] px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              Solicitar reenvio do link
            </button>
          </form>

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-colors"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}