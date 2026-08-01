import React, { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

// 📣 PONTO 71 — COMPARTILHAR O PRÓPRIO BLOCO "LEILÕES ATIVOS" COMO IMAGEM.
// Tira um print real do card (com a contagem do momento) e envia essa imagem
// no WhatsApp junto com o texto + link. Nada de logo genérica.
//
// ⚠️ Só UI: não toca em lance, saldo, carteira, comissão nem status de leilão.
const LINK = "https://leilaonozap.net/leiloes";

const montarTexto = (count) => {
  const n = Number(count) > 0 ? Number(count) : null;
  const linha = n
    ? `🔥 LEILÃO NOZAP — ${n} ${n === 1 ? "leilão ATIVO" : "leilões ATIVOS"} agora!`
    : "🔥 LEILÃO NOZAP — leilões ativos agora!";
  return `${linha}

Descontos que o mercado nunca viu. Entre na sala e dê seu lance antes que acabe.

⚡ ${LINK}`;
};

export default function ShareLeiloesButton({ count = 0, targetId = "hero-leiloes" }) {
  const [loading, setLoading] = useState(false);

  const compartilhar = async () => {
    if (loading) return;
    const texto = montarTexto(count);
    setLoading(true);
    try {
      const el = document.getElementById(targetId);
      if (!el) throw new Error("bloco não encontrado");

      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, {
        backgroundColor: "#111827",
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (doc) => {
          // Vídeo não entra no print: troca o foguinho por emoji
          doc.querySelectorAll("video").forEach((v) => {
            const span = doc.createElement("span");
            span.textContent = "🔥";
            span.style.fontSize = "40px";
            v.replaceWith(span);
          });
          // O próprio botão de compartilhar não deve sair na imagem
          doc.querySelectorAll("[data-share-hide]").forEach((n) => n.remove());
        },
      });

      const blob = await new Promise((r) => canvas.toBlob(r, "image/png", 0.95));
      if (!blob) throw new Error("falha ao gerar imagem");
      const file = new File([blob], "leiloes-nozap.png", { type: "image/png" });

      // Caminho ideal: compartilhamento nativo COM a imagem (WhatsApp mostra a foto)
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: texto });
        toast.success("Imagem pronta para enviar!");
        return;
      }

      // Fallback: baixa a imagem e abre o WhatsApp com o texto pra anexar
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leiloes-nozap.png";
      a.click();
      URL.revokeObjectURL(url);
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
      toast.success("Imagem baixada — anexe no WhatsApp que já abriu.");
    } catch (e) {
      if (e?.name === "AbortError") return; // usuário cancelou
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
      toast.error("Não deu para gerar a imagem — abri o WhatsApp com o texto.");
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
      <span>{loading ? "Gerando imagem..." : "Compartilhar leilões"}</span>
    </button>
  );
}