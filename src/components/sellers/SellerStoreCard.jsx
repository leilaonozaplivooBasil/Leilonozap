import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Store, Check } from "lucide-react";
import { toast } from "sonner";

export default function SellerStoreCard({ referralCode }) {
  const [copied, setCopied] = useState(false);

  if (!referralCode) return null;

  const storeLink = `https://leilaonozap.net/Loja-Virtual?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(storeLink);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback para mobile/Safari
      const el = document.createElement("textarea");
      el.value = storeLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-500/30 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-blue-300 flex items-center gap-2">
          <Store className="w-5 h-5" />
          Minha Loja
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400 text-sm mb-4">
          Compartilhe este link. Cada venda feita por ele conta como sua produção.
        </p>

        {/* Link display */}
        <div className="bg-gray-900/60 border border-blue-500/20 rounded-lg px-4 py-3 mb-4 break-all">
          <span className="text-blue-200 text-sm font-mono select-all">{storeLink}</span>
        </div>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleCopy}
            className="flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white"
          >
            {copied ? (
              <><Check className="w-4 h-4 mr-2" /> Copiado!</>
            ) : (
              <><Copy className="w-4 h-4 mr-2" /> Copiar Link</>
            )}
          </Button>
          <Button
            onClick={() => window.open(storeLink, "_blank", "noopener,noreferrer")}
            variant="outline"
            className="flex-1 min-h-[44px] border-blue-500/40 text-blue-300 hover:bg-blue-900/30"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir Loja
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}