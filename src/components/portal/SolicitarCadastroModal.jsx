import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Mail, Phone } from "lucide-react";

export default function SolicitarCadastroModal({ isOpen, onClose, perfilNome }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3">
            <Clock className="w-7 h-7 text-amber-400" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-white">
            Cadastro de {perfilNome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-gray-300 text-sm text-center leading-relaxed">
            O cadastro para o perfil <strong className="text-white">{perfilNome}</strong> passa por
            uma análise da nossa equipe para garantir a qualidade e segurança da plataforma.
          </p>

          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-300 mb-2">
              📌 Em breve disponibilizaremos:
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                Formulário completo de solicitação
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                Acompanhamento do status da análise
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                Notificação por e-mail quando aprovado
              </li>
            </ul>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <p className="text-xs text-emerald-200 mb-2 font-semibold">
              Quer adiantar seu cadastro?
            </p>
            <p className="text-xs text-gray-300 leading-relaxed">
              Entre em contato com nossa equipe:
            </p>
            <div className="flex flex-col gap-1.5 mt-2">
              <a href="mailto:contato@leilaonozap.net" className="text-xs text-emerald-300 hover:underline flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> contato@leilaonozap.net
              </a>
              <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-300 hover:underline flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> WhatsApp comercial
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-colors"
          >
            Entendi
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}