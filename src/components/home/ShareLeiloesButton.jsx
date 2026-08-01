import React, { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

// 📣 PONTO 71 — COMPARTILHAR OS LEILÕES NO WHATSAPP.
// Agora usa a IMAGEM OFICIAL preparada (nada de print da tela) + texto em negrito
// com a contagem real de leilões ativos.
//
// ⚠️ Só UI: não toca em lance, saldo, carteira, comissão nem status de leilão.
const LINK = "https://leilaonozap.net/leiloes";
const IMAGEM = "https://media.base44.com/images/public/68d536db3c26ff51f79c4137/939dc2b63_image.png";

const montarTexto = (count) => {
  const n = Number(count) > 0 ? Number(count) : null;
  const ativos = n
    ? `*${n} ${n === 1 ? "leilão ATIVO" : "leilões ATIVOS"} agora*`
    : "*Leilões ATIVOS agora*";
  return `🔥 *LEILÃO NOZAP*
${ativos}

Descontos que o mercado nunca viu.
Entre na sala e dê seu lance antes que acabe.

👉 ${LINK}`;
};

export default function ShareLeiloesButton({ count = 0 }) {
  const [loading, setLoading] = useState(false);

  const compartilhar = async () => {
    if (loading) return;
    const texto = montarTexto(count);
    setLoading(true);
    try {
      const resp = await fetch(IMAGEM, { cache: "force-cache" });
      const blob = await resp.blob();
      const file = new File([blob], "leilao-nozap.png", { type: blob.type || "image/png" });

      // Caminho ideal (celular): compartilhamento nativo COM a imagem
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: texto });
        toast.success("Pronto para enviar!");
        return;
      }

      // Desktop: baixa a imagem e abre o WhatsApp com o texto pra anexar
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leilao-nozap.png";
      a.click();
      URL.revokeObjectURL(url);
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
      toast.success("Imagem baixada — anexe no WhatsApp que já abriu.");
    } catch (e) {
      if (e?.name === "AbortError") return; // usuário cancelou
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
      toast.error("Não deu para anexar a imagem — abri o WhatsApp com o texto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      data-share-hide
      onClick={compartilhar}
      disabled={loading}
      aria-label="Compartilhar leilões no WhatsApp"
      className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-sm font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-70"
      style={{
        background: "linear-gradient(135deg, #059669, #047857)",
        boxShadow: "0 6px 20px rgba(16,185,129,0.35)",
      }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      <span>{loading ? "Preparando..." : "Compartilhar leilões"}</span>
    </button>
  );
}