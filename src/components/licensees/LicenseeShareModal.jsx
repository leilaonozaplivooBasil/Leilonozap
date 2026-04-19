import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Copy, Share2, Check } from "lucide-react";
import { toast } from "sonner";

function storeName(u) {
  return u?.store_name || ("L. Virtual " + (u?.full_name || "Sem nome"));
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export default function LicenseeShareModal({ open, onClose, licensee }) {
  const [copied, setCopied] = useState(false);

  if (!licensee) return null;

  const name = storeName(licensee);
  const referral = licensee.referral_code || "";
  const catalogLink = `https://leilaonozap.net/Catalog?ref=${referral}`;
  const message = `🔥 Agora sou licenciado(a) da Leilão NoZap!\n\nConfira produtos com até 70% de desconto — devoluções e pontas de estoque direto pra você!\n\n🛍️ Acesse minha loja virtual:\n${catalogLink}`;

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Mensagem copiada!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: message,
          url: catalogLink,
        });
      } catch {
        // usuário cancelou
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="sm:max-w-md bg-gray-900 border border-gray-700 text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Compartilhar Loja</DialogTitle>
        </DialogHeader>

        {/* Preview Card */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-5 space-y-4">
          {/* Avatar + Nome */}
          <div className="flex items-center gap-3">
            {licensee.avatar_url ? (
              <img
                src={licensee.avatar_url}
                alt={licensee.full_name}
                className="h-14 w-14 rounded-full object-cover border-2 border-green-500/30"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-green-500/20 text-green-400 font-bold text-lg flex items-center justify-center border-2 border-green-500/30">
                {initials(licensee.full_name)}
              </div>
            )}
            <div>
              <p className="font-bold text-white text-base">{name}</p>
              <p className="text-xs text-gray-400">{licensee.full_name}</p>
            </div>
          </div>

          {/* Mensagem */}
          <div className="bg-gray-900/60 rounded-lg p-3 text-sm text-gray-300 whitespace-pre-line leading-relaxed">
            {message}
          </div>
        </div>

        {/* Botões */}
        <div className="grid grid-cols-1 gap-2 mt-2">
          <Button
            onClick={handleWhatsApp}
            className="bg-green-600 hover:bg-green-500 text-white gap-2 font-semibold"
          >
            <MessageCircle className="w-4 h-4" />
            Compartilhar no WhatsApp
          </Button>

          <Button
            onClick={handleCopy}
            variant="outline"
            className="bg-gray-800 border-gray-700 text-gray-100 hover:bg-gray-700 gap-2"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar mensagem + link"}
          </Button>

          <Button
            onClick={handleNativeShare}
            variant="outline"
            className="bg-gray-800 border-gray-700 text-gray-100 hover:bg-gray-700 gap-2"
          >
            <Share2 className="w-4 h-4" />
            Compartilhar via...
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}