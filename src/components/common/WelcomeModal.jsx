import React, { useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Check, Sparkles } from "lucide-react";

export default function WelcomeModal({ onAccept }) {
  const audioContextRef = useRef(null);

  const playWelcomeSound = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Som de celebração
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // Nota A
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.3); // Sobe uma oitava
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      
      osc.start(now);
      osc.stop(now + 0.5);
      
      // Vibração
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
      
    } catch (error) {
      console.error("Erro no som de boas-vindas:", error);
    }
  }, []);

  const handleAccept = async () => {
    await playWelcomeSound();
    setTimeout(() => onAccept(), 500);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-green-900 flex items-center justify-center z-[2000] p-4">
      <Card className="w-full max-w-lg shadow-2xl animate-in fade-in-0 zoom-in-95 border-green-500/30 bg-gray-900/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4">
            <img 
              src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG"
              alt="Leilão NoZap"
              className="w-20 h-20 mx-auto rounded-full border-2 border-green-500/50 animate-pulse"
            />
          </div>
          <CardTitle className="flex items-center justify-center gap-3 text-white">
            <Sparkles className="w-6 h-6 text-green-400 animate-pulse" />
            <span className="text-2xl">Bem-vindo ao Leilão NoZap!</span>
            <Sparkles className="w-6 h-6 text-green-400 animate-pulse" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-gray-300">
          <div className="text-center">
            <p className="text-lg font-semibold text-green-400 mb-4">
              🎉 Você entrou no melhor leilão do Brasil! 🎉
            </p>
            <p className="text-base mb-6">
              Antes de começar, é importante conhecer nossas regras para uma experiência transparente:
            </p>
          </div>
          
          <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
            <h4 className="font-bold text-green-300 text-lg mb-3 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Regras Importantes:
            </h4>
            <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed text-gray-300">
              <li>🎯 <strong>Estratégia de Venda:</strong> Leilão NoZap é nossa estratégia comercial, não um leilão oficial</li>
              <li>📦 <strong>Produtos de Oportunidade:</strong> Trabalhamos com arrematos, devoluções e mostruário - todos testados!</li>
              <li>⚠️ <strong>Sem Garantia:</strong> Produtos não têm garantia de fábrica, mas o preço compensa</li>
              <li>🚫 <strong>Sem Devolução:</strong> Arrematou, é seu! Por isso os preços são imbatíveis</li>
              <li>💡 <strong>Consumo Inteligente:</strong> Você paga barato porque a loja não pode vender como novo</li>
            </ul>
          </div>
          
          <Button 
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-lg py-6 font-bold transform hover:scale-105 transition-all duration-300"
            onClick={handleAccept}
          >
            <Check className="w-5 h-5 mr-2" />
            🔨 Entendi e Aceito! Vamos aos Lances! 🔥
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}