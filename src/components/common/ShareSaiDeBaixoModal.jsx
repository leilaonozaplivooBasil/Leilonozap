import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Copy, MessageCircle, Mail, Facebook, Twitter, Linkedin } from 'lucide-react';
import { toast } from "sonner";

export default function ShareSaiDeBaixoModal({ isOpen, onClose }) {
  const appUrl = "https://leilaonozap.app/LandingSaiDeBaixo";
  const appTitle = "Sai de Baixo Leilões - Moda com Preços Imbatíveis!";
  const appDescription = "Participe de leilões exclusivos e arremate peças de moda com preços incríveis na Sai de Baixo!";

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
        if (error.name !== 'AbortError') {
          console.error('Erro ao compartilhar:', error);
          toast.error('Erro ao compartilhar');
        }
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border-red-500 text-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Share2 className="w-5 h-5" />
            Compartilhar Sai de Baixo
          </DialogTitle>
          <DialogDescription className="text-gray-600">
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
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 text-sm font-mono"
            />
            <Button
              onClick={copyToClipboard}
              variant="outline"
              size="icon"
              className="border-red-500 text-red-600 hover:bg-red-50"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          {/* Botões de Compartilhamento */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600 mb-2">Compartilhar via:</p>
            
            <Button
              onClick={shareWhatsApp}
              className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>

            <Button
              onClick={shareEmail}
              variant="outline"
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              E-mail
            </Button>

            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={shareFacebook}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Facebook className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={shareTwitter}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Twitter className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={shareLinkedIn}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Linkedin className="w-4 h-4" />
              </Button>
            </div>

            {/* Compartilhamento Nativo (Mobile) */}
            {navigator.share && (
              <Button
                onClick={shareNative}
                variant="outline"
                className="w-full border-red-500 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 mt-2"
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