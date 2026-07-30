import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Copy, MessageCircle, Mail, Facebook, Twitter, Linkedin } from 'lucide-react';
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { proxyImage } from "@/functions/proxyImage";

export default function ShareAppModal({ isOpen, onClose, context = "default" }) {
  // Obtém dados do usuário logado
  const currentUser = (() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  })();

  // 🖼️ Imagem de produto em destaque (FeaturedProduct ativo) — usada no share
  // pra o WhatsApp mostrar o produto e não a logo genérica do app.
  const [featuredImage, setFeaturedImage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    (async () => {
      try {
        const items = await base44.entities.FeaturedProduct.filter({ is_active: true }, 'order', 1);
        const fp = items && items[0];
        if (alive && fp && fp.image_url) setFeaturedImage(fp.image_url);
      } catch { /* sem destaque — segue sem imagem */ }
    })();
    return () => { alive = false; };
  }, [isOpen]);

  // Verifica se há um código de licenciado na URL atual
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  
  const baseUrl = "https://leilaonozap.net";
  
  // Determina o link baseado no contexto e no role do usuário
  let appUrl;
  
  // Se é vendedor, SEMPRE usa seu referral_code para compartilhar sua loja
  if (currentUser?.is_seller === true && currentUser?.referral_code) {
    appUrl = `${baseUrl}/Loja-Virtual?ref=${currentUser.referral_code}`;
  } else if (context === "catalog") {
    // No catálogo: usa link do licenciado se tiver, senão link do catálogo
    appUrl = refCode ? `${baseUrl}/Loja-Virtual?ref=${refCode}` : `${baseUrl}/Catalog`;
  } else {
    // Fora do catálogo: usa link do licenciado se tiver, senão link padrão
    appUrl = refCode ? `${baseUrl}/Loja-Virtual?ref=${refCode}` : baseUrl;
  }
  
  const appTitle = context === "catalog" 
    ? "Loja Virtual Leilão NoZap - Produtos Incríveis!" 
    : "Leilão NoZap - Arremate Produtos Incríveis!";
  const appDescription = context === "catalog"
    ? "Confira os melhores produtos da Loja Virtual Leilão NoZap com preços imperdíveis!"
    : "Participe de leilões emocionantes e arremate produtos com preços imperdíveis no Leilão NoZap!";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appUrl);
    toast.success('Link copiado para a área de transferência!');
  };

  // 🔗 SHARE COM IMAGEM — 3 níveis (igual Loja Virtual): imagem → texto → wa.me.
  // Tenta anexar a imagem do FeaturedProduct; se não houver ou falhar, cai pro
  // próximo nível. Nunca mostra a logo genérica quando há imagem disponível.
  const shareWithImage = async () => {
    const fullText = `${appTitle}\n\n${appDescription}\n\nAcesse: ${appUrl}`;

    // NÍVEL 1: Web Share API com imagem
    if (featuredImage && navigator.share && navigator.canShare) {
      try {
        let shareableUrl = featuredImage;
        const isLocalUrl = featuredImage.includes('supabase.co') || featuredImage.includes('base44.app') || featuredImage.startsWith('data:');
        if (!isLocalUrl) {
          const cacheKey = `proxy_img_${featuredImage}`;
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            shareableUrl = cached;
          } else {
            const proxyResult = await proxyImage({ imageUrl: featuredImage });
            if (proxyResult?.data?.file_url) {
              shareableUrl = proxyResult.data.file_url;
              sessionStorage.setItem(cacheKey, shareableUrl);
            }
          }
        }

        let blob;
        if (shareableUrl.startsWith('data:')) {
          const [meta, base64] = shareableUrl.split(',');
          const mime = (meta.match(/:(.*?);/) || [])[1] || 'image/jpeg';
          const bin = atob(base64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          blob = new Blob([arr], { type: mime });
        } else {
          const response = await fetch(shareableUrl, { mode: 'cors' });
          if (!response.ok) throw new Error('fetch falhou');
          blob = await response.blob();
        }

        const mimeType = blob.type || 'image/jpeg';
        const file = new File([blob], 'destaque-loja.jpg', { type: mimeType });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: appTitle, text: fullText, url: appUrl, files: [file] });
          toast.success('Compartilhado com sucesso!');
          return;
        }
      } catch (err) {
        if (err.name === 'AbortError') { toast.success('Compartilhado!'); return; }
      }
    }

    // NÍVEL 2: Web Share API só texto+url (sem imagem)
    if (navigator.share) {
      try {
        await navigator.share({ title: appTitle, text: fullText, url: appUrl });
        toast.success('Compartilhado com sucesso!');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // NÍVEL 3: WhatsApp direto (wa.me)
    const text = encodeURIComponent(fullText);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareWhatsApp = shareWithImage;

  const shareEmail = () => {
    const subject = encodeURIComponent(appTitle);
    const body = encodeURIComponent(`${appDescription}\n\nAcesse: ${appUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}`, '_blank');
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(`${appTitle} - ${appDescription}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(appUrl)}`, '_blank');
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appUrl)}`, '_blank');
  };

  const shareNative = shareWithImage;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 bg-transparent p-0 shadow-none text-gray-900 [&>button]:text-gray-500 [&>button]:hover:text-gray-800">
        <div className="relative overflow-hidden rounded-2xl" style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)'
        }}>

          <div className="relative p-6 space-y-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-gray-900 text-lg">
                <div className="p-2 rounded-xl bg-emerald-100">
                  <Share2 className="w-5 h-5 text-emerald-600" />
                </div>
                Compartilhar Leilão NoZap
              </DialogTitle>
              <DialogDescription className="text-gray-500 text-sm">
                Convide seus amigos para participar dos leilões!
              </DialogDescription>
            </DialogHeader>
            
            {/* Link do App */}
            <div className="flex gap-2">
              <input
                type="text"
                value={appUrl}
                readOnly
                className="flex-1 px-4 py-2.5 rounded-xl text-gray-800 text-sm font-mono outline-none bg-gray-100 border border-gray-200 focus:ring-1 focus:ring-emerald-500/40"
              />
              <Button
                onClick={copyToClipboard}
                size="icon"
                className="rounded-xl h-10 w-10 transition-all duration-300 hover:scale-105 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            {/* Separator */}
            <div className="h-px w-full bg-gray-200" />

            {/* Botões de Compartilhamento */}
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Compartilhar via</p>
              
              <Button
                onClick={shareWhatsApp}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl py-2.5 h-11 font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border-0 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>

              <Button
                onClick={shareEmail}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl py-2.5 h-11 font-medium transition-all duration-300 hover:scale-[1.02] bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700"
              >
                <Mail className="w-4 h-4" />
                E-mail
              </Button>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Facebook, action: shareFacebook },
                  { icon: Twitter, action: shareTwitter },
                  { icon: Linkedin, action: shareLinkedIn },
                ].map(({ icon: Icon, action }, idx) => (
                  <Button
                    key={idx}
                    onClick={action}
                    size="sm"
                    className="rounded-xl h-10 transition-all duration-300 hover:scale-105 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600"
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                ))}
              </div>

              {/* Compartilhamento Nativo (Mobile) */}
              {navigator.share && (
                <Button
                  onClick={shareNative}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl py-2.5 h-11 font-medium transition-all duration-300 hover:scale-[1.02] mt-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700"
                >
                  <Share2 className="w-4 h-4" />
                  Mais opções
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}