import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Copy, MessageCircle, Mail, Facebook, Twitter, Linkedin } from 'lucide-react';
import { toast } from "sonner";

export default function ShareAppModal({ isOpen, onClose, context = "default" }) {
  // Verifica se há um código de licenciado na URL atual
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  
  const baseUrl = "https://leilaonozap.net";
  
  // Determina o link baseado no contexto
  let appUrl;
  if (context === "catalog") {
    // No catálogo: usa link do licenciado se tiver, senão link do catálogo
    appUrl = refCode ? `${baseUrl}/Catalog?ref=${refCode}` : `${baseUrl}/Catalog`;
  } else {
    // Fora do catálogo: usa link do licenciado se tiver, senão link padrão
    appUrl = refCode ? `${baseUrl}/Catalog?ref=${refCode}` : baseUrl;
  }
  
  const appTitle = context === "catalog" 
    ? "Catálogo Leilão NoZap - Produtos Incríveis!" 
    : "Leilão NoZap - Arremate Produtos Incríveis!";
  const appDescription = context === "catalog"
    ? "Confira os melhores produtos do Catálogo Leilão NoZap com preços imperdíveis!"
    : "Participe de leilões emocionantes e arremate produtos com preços imperdíveis no Leilão NoZap!";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appUrl);
    toast.success('Link copiado para a área de transferência!');
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`${appTitle}\n\n${appDescription}\n\nAcesse: ${appUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

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

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: appTitle,
          text: appDescription,
          url: appUrl
        });
        toast.success('Compartilhado com sucesso!');
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        console.warn('Share nativo falhou, copiando link:', error);
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 bg-transparent p-0 shadow-none text-white [&>button]:text-gray-400 [&>button]:hover:text-white">
        <div className="relative overflow-hidden rounded-2xl" style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 50%, rgba(16,185,129,0.04) 100%)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 40px rgba(16,185,129,0.06)'
        }}>
          {/* Shimmer accent */}
          <div className="absolute inset-0 pointer-events-none opacity-30" style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(16,185,129,0.08) 50%, transparent 60%)',
          }} />

          <div className="relative p-6 space-y-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-emerald-400 text-lg">
                <div className="p-2 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',
                  border: '1px solid rgba(16,185,129,0.2)'
                }}>
                  <Share2 className="w-5 h-5" />
                </div>
                Compartilhar Leilão NoZap
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-sm">
                Convide seus amigos para participar dos leilões!
              </DialogDescription>
            </DialogHeader>
            
            {/* Link do App */}
            <div className="flex gap-2">
              <input
                type="text"
                value={appUrl}
                readOnly
                className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-mono outline-none transition-all duration-300 focus:ring-1 focus:ring-emerald-500/30"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                }}
              />
              <Button
                onClick={copyToClipboard}
                size="icon"
                className="rounded-xl h-10 w-10 transition-all duration-300 hover:scale-105"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  color: 'white'
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            {/* Separator */}
            <div className="h-px w-full" style={{
              background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.2), transparent)'
            }} />

            {/* Botões de Compartilhamento */}
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Compartilhar via</p>
              
              <Button
                onClick={shareWhatsApp}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl py-2.5 h-11 font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/20 border-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.5), rgba(5,150,105,0.6))',
                  border: '1px solid rgba(16,185,129,0.3)',
                  color: 'white'
                }}
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>

              <Button
                onClick={shareEmail}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl py-2.5 h-11 font-medium transition-all duration-300 hover:scale-[1.02] border-0"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'white'
                }}
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
                    className="rounded-xl h-10 transition-all duration-300 hover:scale-105 border-0"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: 'white'
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                ))}
              </div>

              {/* Compartilhamento Nativo (Mobile) */}
              {navigator.share && (
                <Button
                  onClick={shareNative}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl py-2.5 h-11 font-medium transition-all duration-300 hover:scale-[1.02] border-0 mt-1"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: 'white'
                  }}
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