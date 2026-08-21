import React from 'react';
import { Button } from "@/components/ui/button";
import { DollarSign, Zap, BarChart, ShieldCheck, LogIn, TrendingUp, Smartphone } from 'lucide-react';
import EarningsSimulator from './EarningsSimulator';
import ProfessionalJourney from './ProfessionalJourney';

export default function LandingContent({ onRegisterClick, onLoginClick, isSaiDeBaixo: isSaiDeBaixoProp }) {
  const benefits = [
    { icon: DollarSign, text: "Ganhos em Dinheiro Real", description: "Receba 5% toda vez que seus amigos arrematarem ou comprarem na Loja Virtual." },
    { icon: Zap, text: "Comissões Recorrentes", description: "Ganho recorrente: cada nova compra dos seus amigos gera nova comissão." },
    { icon: BarChart, text: "Painel em Tempo Real", description: "Acompanhe suas indicações, compras e comissões ao vivo, direto no seu painel." },
    { icon: ShieldCheck, text: "Ganhe com sua Influência", description: "Use as redes sociais do jeito certo: torne-se um especialista e ganhe com quem te segue e te admira." }
  ];

  const isSaiDeBaixo = isSaiDeBaixoProp ?? sessionStorage.getItem('saiDeBaixoContext') === 'true';
  const accentBtn = isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';
  const accentText = isSaiDeBaixo ? 'text-red-600' : 'text-nz-verde';
  const accentBorder = isSaiDeBaixo ? 'border-red-500/30' : 'border-nz-verde/30';
  const accentBg = isSaiDeBaixo ? 'bg-red-50' : 'bg-nz-verde-fundo';

  return (
    <>
      {/* 🎯 Joguinho profissional (sem emojis) — explica o ganho antes do vídeo */}
      <ProfessionalJourney theme={isSaiDeBaixo ? 'saidebaixo' : 'nozap'} />

      {/* 🎬 Vídeo — influenciador real gravando conteúdo */}
      <div className="mb-10 rounded-2xl overflow-hidden border-2 border-nz-verde/30 shadow-xl relative">
        <video
          src="/midia/7d6541982_Vdeo_Hero_Influenciador.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-64 sm:h-80 md:h-96 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col items-center justify-end pb-6 px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">Seja um Influenciador Leilão NoZap</h2>
          <p className="text-gray-100 text-sm sm:text-base mt-1 drop-shadow-lg">Grave, indique, ganhe 5% em dinheiro real por cada arremate e venda na Loja Virtual</p>
        </div>
      </div>

      {/* CTAs — sem título repetido, direto ao ponto */}
      <div className="text-center mb-10">
        <div className={`inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full border ${accentBorder} ${accentBg}`}>
          <TrendingUp className={`w-4 h-4 ${accentText}`} />
          <span className={`font-semibold text-xs ${accentText}`}>Programa de Influenciadores</span>
        </div>
        <div className="mb-6" />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" onClick={onRegisterClick} className={`text-white font-bold px-8 rounded-xl shadow-lg ${accentBtn}`}>
            <Smartphone className="w-5 h-5 mr-2" />Quero me cadastrar
          </Button>
          <button
            onClick={onLoginClick}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-semibold text-sm text-nz-tinta hover:${accentBg} transition-colors ${accentBorder}`}
          >
            <LogIn className="w-4 h-4" />Já tenho conta · Entrar
          </button>
        </div>
      </div>

      {/* Calculadora com mais ênfase (coluna maior) + benefícios compactos ao lado */}
      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-8 items-start">
        <EarningsSimulator theme={isSaiDeBaixo ? 'saidebaixo' : 'nozap'} />

        <div className={`rounded-2xl border ${accentBorder} bg-white p-5 lg:mt-14`}>
          <h3 className="text-base font-bold text-nz-tinta mb-4">Por que ser Influenciador</h3>
          <div className="space-y-3 mb-4">
            {benefits.map((item) => (
              <div key={item.text} className="flex items-start gap-2.5">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${accentBorder} ${accentBg}`}>
                  <item.icon className={`h-4 w-4 ${accentText}`} />
                </div>
                <div>
                  <p className="font-semibold text-nz-tinta text-xs">{item.text}</p>
                  <p className="text-[11px] text-nz-tinta-fraca mt-0.5 leading-snug">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          <Button onClick={onRegisterClick} className={`w-full text-white font-bold py-4 rounded-xl shadow-lg text-sm ${accentBtn}`}>
            <Smartphone className="w-4 h-4 mr-2" />Quero ser um Influenciador agora!
          </Button>
        </div>
      </div>
    </>
  );
}