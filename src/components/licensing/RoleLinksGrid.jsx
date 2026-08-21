import React, { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import { toast } from "sonner";

// 🎯 Grade de links de cadastro por cargo — cada card mostra a fotinho do
// cargo (mesmas imagens usadas em Lucre.jsx) + nome + link de indicação já
// pronto, com botão de copiar do lado. A pessoa clica no link, se cadastra,
// paga e já entra na rede de quem compartilhou (?ref= do próprio código).
// 🔗 Links de convite passam pela rota /c/:cargo (api/convite.js), que emite
// as meta tags OG por cargo (imagem + título + descrição gerados pelo api/og.js)
// e só então redireciona pro funil real — mesma regra usada nos links de
// produto/loja virtual, pra o preview do WhatsApp vir bonito e específico.
const ROLE_LINKS = (referralCode) => [
  {
    title: "Influenciador",
    desc: "Grátis · 5% por venda/arremate",
    image: "/midia/84782e7ee_generated_image.png",
    link: `https://leilaonozap.net/c/influenciador?ref=${referralCode}`,
  },
  {
    title: "Vendedor",
    desc: "10% na venda direta",
    image: "/midia/2f7400a5d_generated_image.png",
    link: `https://leilaonozap.net/c/vendedor?ref=${referralCode}`,
  },
  {
    title: "Licenciado",
    desc: "Loja virtual própria · 13%",
    image: "/midia/28db39fb0_generated_image.png",
    link: `https://leilaonozap.net/c/licenciado?ref=${referralCode}`,
  },
  {
    title: "Parceiro",
    desc: "Participa da operação",
    image: "/midia/3debca5db_generated_image.png",
    link: `https://leilaonozap.net/c/parceiro?ref=${referralCode}`,
  },
];

export default function RoleLinksGrid({ referralCode, isSaiDeBaixo }) {
  const [copiedIdx, setCopiedIdx] = useState(null);

  const handleCopy = (link, idx) => {
    navigator.clipboard.writeText(link);
    setCopiedIdx(idx);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // 🔗 Compartilhar cargo — mesmo princípio do share da Loja Virtual/Leilão:
  // imagem do cargo + título + descrição + link, com fallback em cascata
  // (imagem nativa → texto nativo → wa.me).
  const handleShare = async (role) => {
    const fullText = `${role.title} — Leilão NoZap\n\n${role.desc}\n\nCadastre-se agora:\n${role.link}`;

    if (navigator.share && navigator.canShare) {
      try {
        const response = await fetch(role.image, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          const file = new File([blob], `${role.title}.jpg`, { type: blob.type || 'image/jpeg' });
          if (navigator.canShare({ files: [file] })) {
            // 🔗 O link já está dentro de fullText — não repetir em `url`, senão apps
            // como o WhatsApp mostram o link duplicado na mensagem compartilhada.
            await navigator.share({ title: `${role.title} — Leilão NoZap`, text: fullText, files: [file] });
            return;
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: `${role.title} — Leilão NoZap`, text: fullText });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank');
  };

  if (!referralCode) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {ROLE_LINKS(referralCode).map((role, idx) => (
        <div
          key={role.title}
          className="rounded-xl border p-3 flex items-center gap-3 bg-nz-marrom-fundo border-nz-marrom/25"
        >
          <img
            src={role.image}
            alt={role.title}
            className="w-14 h-14 rounded-lg object-cover object-top shrink-0"
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-nz-marrom-escuro">{role.title}</p>
            <p className="text-xs mb-1.5 text-gray-500">{role.desc}</p>
            <div className="flex gap-1.5">
              <input
                value={role.link}
                readOnly
                className="flex-1 min-w-0 text-[11px] font-mono rounded-md px-2 py-2 border truncate bg-white border-nz-marrom/25 text-gray-700"
              />
              <button
                onClick={() => handleCopy(role.link, idx)}
                className={`shrink-0 rounded-md w-9 h-9 flex items-center justify-center transition-colors ${copiedIdx === idx ? 'bg-nz-verde-escuro' : 'bg-nz-verde hover:bg-nz-verde-escuro'} text-white`}
                title="Copiar link"
              >
                {copiedIdx === idx ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => handleShare(role)}
                className="shrink-0 rounded-md w-9 h-9 flex items-center justify-center transition-colors bg-nz-marrom hover:bg-nz-marrom-escuro text-white"
                title="Compartilhar"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}