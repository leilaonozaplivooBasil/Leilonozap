import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from "sonner";

// 🎯 Grade de links de cadastro por cargo — cada card mostra a fotinho do
// cargo (mesmas imagens usadas em Lucre.jsx) + nome + link de indicação já
// pronto, com botão de copiar do lado. A pessoa clica no link, se cadastra,
// paga e já entra na rede de quem compartilhou (?ref= do próprio código).
const ROLE_LINKS = (referralCode) => [
  {
    title: "Influenciador",
    desc: "Grátis · 5% por venda/arremate",
    image: "https://media.base44.com/images/public/68d536db3c26ff51f79c4137/84782e7ee_generated_image.png",
    link: `https://leilaonozap.net/Licensing?ref=${referralCode}`,
  },
  {
    title: "Vendedor",
    desc: "10% na venda direta",
    image: "https://media.base44.com/images/public/68d536db3c26ff51f79c4137/2f7400a5d_generated_image.png",
    link: `https://leilaonozap.net/SejaVendedor?ref=${referralCode}`,
  },
  {
    title: "Licenciado",
    desc: "Loja virtual própria · 13%",
    image: "https://media.base44.com/images/public/68d536db3c26ff51f79c4137/28db39fb0_generated_image.png",
    link: `https://leilaonozap.net/SejaLicenciado?ref=${referralCode}`,
  },
  {
    title: "Parceiro",
    desc: "Participa da operação",
    image: "https://media.base44.com/images/public/68d536db3c26ff51f79c4137/3debca5db_generated_image.png",
    link: `https://leilaonozap.net/Partners?ref=${referralCode}`,
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
                className="flex-1 min-w-0 text-[11px] font-mono rounded-md px-2 py-1.5 border truncate bg-white border-nz-marrom/25 text-gray-700"
              />
              <button
                onClick={() => handleCopy(role.link, idx)}
                className={`shrink-0 rounded-md px-2 flex items-center justify-center transition-colors ${copiedIdx === idx ? 'bg-nz-verde-escuro' : 'bg-nz-verde hover:bg-nz-verde-escuro'} text-white`}
                title="Copiar link"
              >
                {copiedIdx === idx ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}