import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Copy, MessageCircle, Mail, Facebook, Twitter, Linkedin } from 'lucide-react';
import { toast } from "sonner";

export default function ShareAppModal({ isOpen, onClose }) {
  const appUrl = "https://leilaonozap.net";
  const appTitle = "Leilão NoZap - Arremate Produtos Incríveis!";
  const appDescription = "Participe de leilões emocionantes e arremate produtos com preços imperdíveis no Leilão NoZap!";

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
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-400">
            <Share2 className="w-5 h-5" />
            Compartilhar Leilão NoZap
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Convide seus amigos para participar dos leilões!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Link do App */}
          <div className="flex gap-2">
            <input
              type="text"
              value={appUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm font-mono"
            />
            <Button
              onClick={copyToClipboard}
              variant="outline"
              size="icon"
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          {/* Botões de Compartilhamento */}
          <div className="space-y-2">
            <p className="text-sm text-gray-400 mb-2">Compartilhar via:</p>
            
            <Button
              onClick={shareWhatsApp}
              className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>

            <Button
              onClick={shareEmail}
              variant="outline"
              className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600 flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              E-mail
            </Button>

            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={shareFacebook}
                variant="outline"
                size="sm"
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                <Facebook className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={shareTwitter}
                variant="outline"
                size="sm"
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                <Twitter className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={shareLinkedIn}
                variant="outline"
                size="sm"
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                <Linkedin className="w-4 h-4" />
              </Button>
            </div>

            {/* Compartilhamento Nativo (Mobile) */}
            {navigator.share && (
              <Button
                onClick={shareNative}
                variant="outline"
                className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600 flex items-center justify-center gap-2 mt-2"
              >
                <Share2 className="w-4 h-4" />
                Mais opções
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}