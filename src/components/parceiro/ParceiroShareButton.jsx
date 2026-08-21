import React, { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// 📣 Compartilhar a página do Parceiro no WhatsApp.
// Mesmo mecanismo já validado no ShareLeiloesButton (imagem oficial anexada via
// navigator.share no celular; no desktop baixa a imagem e abre o wa.me com o texto).
//
// ⚠️ Só UI: não toca em lance, saldo, carteira, comissão nem pedido.
// O link é o curto /c/parceiro — é ele que tem meta tags OG server-side, então a
// imagem também aparece quando alguém cola só o link.
const LINK = 'https://leilaonozap.net/c/parceiro';
const IMAGEM = '/midia/932dcb425_image.png';

// Texto institucional: sem valor, sem comissão, sem projeção, sem "investimento".
const TEXTO = `🤝 *LEILÃO NOZAP — PARCEIRO DE COMPRA*
*Operação montada, canais próprios e praças já em funcionamento.*

Conheça a estrutura por dentro: curadoria, Leilão, Loja Virtual e a rede comercial.

👉 ${LINK}`;

export default function ParceiroShareButton() {
  const [loading, setLoading] = useState(false);

  const compartilhar = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // 🛡️ Nunca deixar o botão travado: se a imagem demorar, cai no texto puro
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const resp = await fetch(IMAGEM, { cache: 'force-cache', signal: ctrl.signal });
      clearTimeout(timer);
      const blob = await resp.blob();
      const file = new File([blob], 'leilao-nozap-parceiro.png', { type: blob.type || 'image/png' });

      // Caminho ideal (celular): compartilhamento nativo COM a imagem
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: TEXTO });
        toast.success('Pronto para enviar!');
        return;
      }

      // Desktop: baixa a imagem e abre o WhatsApp com o texto pra anexar
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leilao-nozap-parceiro.png';
      a.click();
      URL.revokeObjectURL(url);
      window.open(`https://wa.me/?text=${encodeURIComponent(TEXTO)}`, '_blank');
      toast.success('Imagem baixada — anexe no WhatsApp que já abriu.');
    } catch (e) {
      if (e?.name === 'AbortError') return; // usuário cancelou
      window.open(`https://wa.me/?text=${encodeURIComponent(TEXTO)}`, '_blank');
      toast.error('Não deu para anexar a imagem — abri o WhatsApp com o texto.');
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
      aria-label="Compartilhar a página do Parceiro no WhatsApp"
      className="inline-flex min-h-[48px] items-center justify-center gap-2 border border-pc-borda px-7 text-xs font-semibold uppercase tracking-[0.18em] text-pc-tinta transition-colors hover:border-pc-ouro hover:text-pc-ouro disabled:opacity-70"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      <span>{loading ? 'Preparando...' : 'Compartilhar'}</span>
    </button>
  );
}