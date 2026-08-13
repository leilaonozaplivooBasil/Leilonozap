import React, { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import { toast } from 'sonner';

// 🔗 COMPARTILHAR CARGO NA PÁGINA "LUCRE" (13/08/2026)
// Quem já está logado (usuário, influenciador, licenciado…) vê o PRÓPRIO link
// de convite embaixo de cada card, igual ao que já existe na Central de Vendas
// (RoleLinksGrid). Mesma rota /c/:cargo?ref= — nenhuma regra de indicação muda,
// só passa a existir um segundo lugar pra compartilhar.
export default function CompartilharCargo({ cargo, titulo, descricao, imagem, referralCode }) {
  const [copiado, setCopiado] = useState(false);
  if (!referralCode) return null;

  const link = `https://leilaonozap.net/c/${cargo}?ref=${referralCode}`;
  const texto = `${titulo} — Leilão NoZap\n\n${descricao}\n\nCadastre-se agora:\n${link}`;

  const copiar = () => {
    navigator.clipboard.writeText(link);
    setCopiado(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopiado(false), 2000);
  };

  const compartilhar = async () => {
    if (navigator.share && navigator.canShare) {
      try {
        const resposta = await fetch(imagem, { mode: 'cors' });
        if (resposta.ok) {
          const blob = await resposta.blob();
          const arquivo = new File([blob], `${titulo}.jpg`, { type: blob.type || 'image/jpeg' });
          if (navigator.canShare({ files: [arquivo] })) {
            await navigator.share({ title: `${titulo} — Leilão NoZap`, text: texto, files: [arquivo] });
            return;
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: `${titulo} — Leilão NoZap`, text: texto });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <div className="mt-3 rounded-xl border border-nz-borda bg-nz-cinza-fundo p-2.5">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-nz-tinta-fraca">
        Seu link de convite
      </p>
      <div className="flex gap-1.5">
        <input
          value={link}
          readOnly
          className="min-w-0 flex-1 truncate rounded-md border border-nz-borda bg-white px-2 py-2 font-mono text-[11px] text-nz-tinta-fraca"
        />
        <button
          type="button"
          onClick={copiar}
          title="Copiar link"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white transition-colors ${copiado ? 'bg-nz-verde-escuro' : 'bg-nz-verde hover:bg-nz-verde-escuro'}`}
        >
          {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={compartilhar}
          title="Compartilhar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-nz-marrom text-white transition-colors hover:bg-nz-marrom-escuro"
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}