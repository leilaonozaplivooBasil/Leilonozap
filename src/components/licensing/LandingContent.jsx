import React from 'react';
import { Button } from "@/components/ui/button";
import { DollarSign, Zap, BarChart, ShieldCheck, LogIn, TrendingUp, Smartphone } from 'lucide-react';
import EarningsSimulator from './EarningsSimulator';
import ProfessionalJourney from './ProfessionalJourney';

export default function LandingContent({ onRegisterClick, onLoginClick, isSaiDeBaixo: isSaiDeBaixoProp }) {
  const benefits = [
    { icon: DollarSign, text: "Ganhos em Dinheiro Real", description: "Receba 5% em R$ toda vez que seus indicados comprarem ou arrematarem." },
    { icon: Zap, text: "Comissões Recorrentes", description: "Ganho recorrente: cada nova compra da sua rede gera nova comissão." },
    { icon: BarChart, text: "Dashboard em Tempo Real", description: "Acompanhe indicados, vendas e comissões ao vivo, sem planilha." },
    { icon: ShieldCheck, text: "Sistema de Alavancagem", description: "Construa sua rede de indicados e multiplique seus ganhos." }
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
          src="https://media.base44.com/videos/public/68d536db3c26ff51f79c4137/7d6541982_Vdeo_Hero_Influenciador.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-64 sm:h-80 md:h-96 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col items-center justify-end pb-6 px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">Seja um Influenciador Leilão NoZap</h2>
          <p className="text-gray-100 text-sm sm:text-base mt-1 drop-shadow-lg">Grave, indique, ganhe 5% em dinheiro real por cada arremate</p>
        </div>
      </div>

      {/* Título compacto + CTAs inline (cadastro é a ação principal) */}
      <div className="text-center mb-10">
        <div className={`inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full border ${accentBorder} ${accentBg}`}>
          <TrendingUp className={`w-4 h-4 ${accentText}`} />
          <span className={`font-semibold text-xs ${accentText}`}>Programa de Influenciadores</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-nz-tinta">Torne-se um Influenciador</h1>
        <p className="text-sm md:text-base text-nz-tinta-fraca max-w-xl mx-auto mb-5">
          Indique amigos e ganhe <strong className={accentText}>5% em dinheiro real</strong> em cada compra ou arremate que eles fizerem.
        </p>
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

      {/* Calculadora ao lado dos benefícios — logo após o vídeo/CTA, sem enterrar embaixo */}
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <EarningsSimulator theme={isSaiDeBaixo ? 'saidebaixo' : 'nozap'} />

        <div className={`rounded-2xl border-2 ${accentBorder} bg-white p-6 lg:p-8 lg:mt-14`}>
          <h3 className="text-lg font-bold text-nz-tinta mb-5">Por que ser Influenciador</h3>
          <div className="space-y-4 mb-6">
            {benefits.map((item) => (
              <div key={item.text} className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${accentBorder} ${accentBg}`}>
                  <item.icon className={`h-5 w-5 ${accentText}`} />
                </div>
                <div>
                  <p className="font-semibold text-nz-tinta text-sm">{item.text}</p>
                  <p className="text-xs text-nz-tinta-fraca mt-0.5">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          <Button size="lg" onClick={onRegisterClick} className={`w-full text-white font-bold py-6 rounded-xl shadow-lg ${accentBtn}`}>
            <Smartphone className="w-5 h-5 mr-2" />Quero ser um Influenciador agora!
          </Button>
        </div>
      </div>
    </>
  );
}