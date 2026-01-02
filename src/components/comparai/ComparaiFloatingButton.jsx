import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, X } from 'lucide-react';

export default function ComparaiFloatingButton({ auctions, mode = 'home' }) {
  const [showInfo, setShowInfo] = useState(false);
  const [isFlying, setIsFlying] = useState(false);

  const handleClick = () => {
    setIsFlying(true);
    setTimeout(() => {
      setShowInfo(true);
      setIsFlying(false);
    }, 800);
  };

  return (
    <>
      {/* BOTÃO FLUTUANTE FIXO - SEM TOOLTIP */}
      <div 
        className={`fixed bottom-32 left-6 z-50 transition-all duration-700 ${
          isFlying ? 'left-1/2 bottom-1/2 -translate-x-1/2 translate-y-1/2 scale-150' : ''
        } ${showInfo ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}
      >
        <button
          onClick={handleClick}
          disabled={isFlying || showInfo}
          className="w-20 h-20 rounded-full shadow-2xl shadow-blue-500/50 transition-all duration-300 hover:scale-110 relative animate-float border-0 p-0 bg-transparent cursor-pointer disabled:cursor-not-allowed"
          title="Comparai - Comparação Inteligente"
        >
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/d36767bcd_image.png"
            alt="Comparai"
            className="w-full h-full object-cover rounded-full"
          />
          
          <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20"></div>
        </button>
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
              <DialogTitle className="flex items-center gap-3 text-2xl pr-12">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/d36767bcd_image.png"
                  alt="Comparai"
                  className="w-16 h-16 rounded-full bg-white p-2 shadow-lg"
                />
                <div>
                  <div className="text-blue-400 font-bold text-2xl">Comparai</div>
                  <div className="text-sm font-normal text-gray-400">Plataforma Independente de Comparação de Preços</div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* O QUE É */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-blue-300 mb-3">🤖 O que é o Comparai?</h3>
                    <p className="text-gray-300 leading-relaxed">
                      Uma <span className="font-bold text-blue-400">inteligência artificial independente</span> que busca produtos em 
                      <span className="font-bold text-green-400"> tempo real</span> em dezenas de sites da internet!
                    </p>
                  </div>
                </div>
              </div>

              {/* ONDE BUSCA */}
              <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6">
                <h3 className="text-xl font-bold text-green-300 mb-3">🌐 Onde o Comparai Busca?</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Mercado Livre</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Magazine Luiza</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Amazon Brasil</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Americanas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Buscapé</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Zoom</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Shopee</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>E muito mais!</span>
                  </div>
                </div>
              </div>

              {/* COMO FUNCIONA */}
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-6">
                <h3 className="text-xl font-bold text-yellow-300 mb-3">⚡ Como Funciona?</h3>
                <ol className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="font-bold text-yellow-400 text-lg">1.</span>
                    <span>Clique em "Comparar Preços" em qualquer produto</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-bold text-yellow-400 text-lg">2.</span>
                    <span>Aguarde alguns segundos enquanto buscamos</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-bold text-yellow-400 text-lg">3.</span>
                    <span>Veja os preços <span className="font-bold text-green-400">reais</span> em toda internet!</span>
                  </li>
                </ol>
              </div>

              {/* GARANTIA */}
              <div className="bg-green-600/20 border-2 border-green-500 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">🏆</div>
                <h3 className="text-xl font-bold text-green-300 mb-2">Garantia de Transparência</h3>
                <p className="text-gray-300">
                  Provamos que os preços são <span className="font-bold text-yellow-300">realmente vantajosos</span>!
                </p>
              </div>

              {/* BOTÃO FECHAR */}
              <Button 
                onClick={() => setShowInfo(false)} 
                variant="outline" 
                className="w-full border-blue-500 text-blue-400 hover:bg-blue-900/20"
              >
                Entendi! Vou Testar nos Produtos
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