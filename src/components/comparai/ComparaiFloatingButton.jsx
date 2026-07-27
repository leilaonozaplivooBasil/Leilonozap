import React, { useState } from 'react';
import CompareAquiLogo from '@/assets/compareaqui-logo.webp';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, X, Globe, Zap, ShieldCheck, Check } from 'lucide-react';
import CompareAquiIcon from '@/assets/compareaqui-icon.webp';

export default function ComparaiFloatingButton({ auctions, mode = 'home', hideButton = false }) {
  const [showInfo, setShowInfo] = useState(false);
  const [isFlying, setIsFlying] = useState(false);

  const handleClick = () => {
    setShowInfo(true);
  };

  // permite abrir o Comparai de qualquer lugar (ex: card/ícone da loja estilo Shopee)
  React.useEffect(() => {
    const open = () => setShowInfo(true);
    window.addEventListener('openComparai', open);
    return () => window.removeEventListener('openComparai', open);
  }, []);

  return (
    <>
      {/* BOTÃO FLUTUANTE FIXO - SEM TOOLTIP (ocultável quando entra no stack da loja) */}
      <div
        className={`fixed bottom-5 right-4 z-50 transition-all duration-300 flex flex-col items-center ${hideButton ? 'hidden' : ''} ${showInfo ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'}`}
      >
        <button
          onClick={handleClick}
          disabled={showInfo}
          className="w-14 h-14 rounded-full shadow-2xl shadow-blue-500/50 transition-all duration-300 hover:scale-110 relative animate-float border-0 p-0 bg-transparent cursor-pointer disabled:cursor-not-allowed"
          title="CompareAQUI - Comparação Inteligente"
        >
          <img
            src={CompareAquiIcon}
            alt="CompareAQUI"
            className="w-full h-full object-cover rounded-full"
          />

          <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20"></div>
        </button>
        <span className="text-[10px] text-blue-200 font-semibold mt-0.5 drop-shadow">CompareAQUI</span>
      </div>

      {/* MODAL INFORMATIVO */}
      {showInfo && (
        <Dialog open={showInfo} onOpenChange={setShowInfo}>
          <DialogContent className="max-w-2xl bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 text-white border-blue-500/30 max-h-[90vh] overflow-y-auto">

            <button
              onClick={() => setShowInfo(false)}
              className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            <DialogHeader>
              <DialogTitle className="text-2xl pr-12">
                <img
                  src={CompareAquiLogo}
                  alt="CompareAQUI"
                  className="h-24 w-auto rounded-xl mb-2"
                />
                <div className="text-sm font-normal text-gray-400">Plataforma Independente de Comparação de Preços</div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* O QUE É */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">O que é o CompareAQUI</h3>
                    <p className="text-gray-300 leading-relaxed">
                      Uma <span className="font-semibold text-blue-400">inteligência artificial independente</span> que busca produtos em
                      <span className="font-semibold text-emerald-400"> tempo real</span> em dezenas de sites da internet.
                    </p>
                  </div>
                </div>
              </div>

              {/* ONDE BUSCA */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-11 h-11 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Onde o CompareAQUI busca</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Mercado Livre</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Magazine Luiza</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Amazon Brasil</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Americanas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Buscapé</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Zoom</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Shopee</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>E muito mais!</span>
                  </div>
                </div>
              </div>

              {/* COMO FUNCIONA */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-11 h-11 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Como funciona</h3>
                </div>
                <ol className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/10 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span>Clique em "Comparar Preços" em qualquer produto</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/10 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <span>Aguarde alguns segundos enquanto buscamos</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/10 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <span>Veja os preços <span className="font-semibold text-emerald-400">reais</span> em toda a internet</span>
                  </li>
                </ol>
              </div>

              {/* GARANTIA */}
              <div className="bg-emerald-500/[0.07] border border-emerald-500/30 rounded-xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Garantia de Transparência</h3>
                <p className="text-gray-300">
                  Provamos que os preços são <span className="font-semibold text-emerald-400">realmente vantajosos</span>.
                </p>
              </div>

              {/* BOTÃO FECHAR */}
              <Button
                onClick={() => setShowInfo(false)}
                variant="outline"
                className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                Entendi, vou testar nos produtos
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <style>{`
        @keyframes float-comparai {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float-comparai 3s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}