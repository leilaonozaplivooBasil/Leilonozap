import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Zap, BarChart, ShieldCheck, LogIn, Star, Smartphone, TrendingUp } from 'lucide-react';
import EarningsSimulator from './EarningsSimulator';
import ProfessionalJourney from './ProfessionalJourney';

export default function LandingContent({ onRegisterClick, onLoginClick, isSaiDeBaixo: isSaiDeBaixoProp }) {
  const [hoveredBenefit, setHoveredBenefit] = React.useState(null);
  const cardsRef = React.useRef(null);

  const scrollToCards = () => {
    cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const benefits = [
    { icon: DollarSign, text: "Ganhos em Dinheiro Real", description: "Receba comissões em dinheiro (R$) toda vez que seus indicados arrematarem produtos." },
    { icon: Zap, text: "Comissões Recorrentes", description: "Ganhe 5% em cada venda e arremate dos seus indicados. Renda passiva e recorrente!" },
    { icon: BarChart, text: "Dashboard em Tempo Real", description: "Acompanhe suas comissões, indicados e performance ao vivo." },
    { icon: ShieldCheck, text: "Sistema de Alavancagem", description: "Construa sua rede de indicados e multiplique seus ganhos." }
  ];

  const isSaiDeBaixo = isSaiDeBaixoProp ?? sessionStorage.getItem('saiDeBaixoContext') === 'true';

  return (
    <>
      {/* 🎯 Joguinho profissional (sem emojis) — explica o ganho antes do vídeo */}
      <ProfessionalJourney theme={isSaiDeBaixo ? 'saidebaixo' : 'nozap'} />

      {/* 🎬 Vídeo — influenciador real gravando conteúdo */}
      <div className="mb-12 rounded-2xl overflow-hidden border-2 border-nz-verde/30 shadow-xl relative">
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

      {/* Torne-se um Influenciador — explicação, agora depois do vídeo */}
      <div className="text-center mb-12">
        <div className={`inline-flex items-center gap-2 mb-5 px-5 py-2 rounded-full border ${isSaiDeBaixo ?
          'bg-red-50 border-red-200' :
          'bg-nz-verde-fundo border-nz-verde/30'}`
        }>
          <TrendingUp className={`w-4 h-4 ${isSaiDeBaixo ? 'text-red-600' : 'text-nz-verde'}`} />
          <span className={`font-semibold text-sm ${isSaiDeBaixo ? 'text-red-600' : 'text-nz-verde'}`}>Programa de Influenciadores</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-nz-tinta">Torne-se um Influenciador</h1>
        <p className="text-base md:text-lg max-w-2xl mx-auto mb-2 text-nz-tinta-fraca">
          Indique amigos e ganhe <strong className={isSaiDeBaixo ? 'text-red-600' : 'text-nz-verde'}>5% em dinheiro real (R$)</strong> em cada arremate que eles fizerem!
        </p>
        <p className="text-base md:text-lg max-w-2xl mx-auto text-nz-tinta-fraca">
          Construa um negócio sólido com o sistema de alavancagem {isSaiDeBaixo ? 'do Sai de Baixo' : 'da Leilão NoZap'}!
        </p>
      </div>

      <div className="text-center">
        <div className="mb-12">
          <div className="inline-flex flex-col items-center gap-3 bg-nz-verde-fundo rounded-2xl p-6 border-2 border-nz-borda hover:border-nz-verde/50 transition-all duration-300">
            <p className="text-nz-tinta-fraca text-sm font-medium">Já tem uma conta?</p>
            <button onClick={onLoginClick} className={`px-8 py-4 bg-gradient-to-r text-white font-bold text-lg rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-3 ${isSaiDeBaixo ? 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' : 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'}`}>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><LogIn className="w-5 h-5" /></div>
              <span>Entrar na Minha Conta</span>
            </button>
            <p className="text-nz-tinta-fraca text-xs">Acesse seu painel de influenciador</p>
          </div>
        </div>
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-nz-borda"></div></div>
          <div className="relative flex justify-center">
            <button onClick={scrollToCards} className="px-4 bg-white text-nz-tinta-fraca text-sm font-medium hover:text-nz-verde transition-colors cursor-pointer">Ou cadastre-se agora</button>
          </div>
        </div>
      </div>

      <div className="mb-16 mt-6"><EarningsSimulator theme={isSaiDeBaixo ? 'saidebaixo' : 'nozap'} /></div>

      <div ref={cardsRef} className="mt-16 max-w-2xl mx-auto">
        <Card className="bg-white border-2 border-nz-verde/40 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-3 bg-nz-verde-fundo rounded-lg border border-nz-verde/30"><Smartphone className="w-6 h-6 text-nz-verde" /></div>
              <div><div className="text-nz-verde font-bold">Influencie</div><div className="text-sm text-nz-tinta-fraca font-normal">Programa de Influenciadores</div></div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-nz-tinta text-base leading-relaxed">Torne-se um <strong className="text-nz-tinta">Influenciador Leilão NoZap</strong> e receba <strong className="text-nz-verde">5% em dinheiro real (R$)</strong> sobre CADA venda e arremate!</p>
            <div className="bg-nz-verde-fundo border border-nz-verde/30 rounded-lg p-4 space-y-2">
              <p className="text-nz-verde font-semibold flex items-center gap-2"><Star className="w-4 h-4" />Benefícios:</p>
              <ul className="space-y-1 text-sm text-nz-tinta-fraca">
                <li>✅ Link de indicação exclusivo</li>
                <li>✅ 5% em R$ de cada arremate dos indicados</li>
                <li>✅ Dashboard com estatísticas em tempo real</li>
                <li>✅ Sistema de alavancagem para crescimento</li>
              </ul>
            </div>
            <div className="pt-2">
              <Button size="lg" className={`w-full text-white font-bold text-base py-6 rounded-lg shadow-lg ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`} onClick={onRegisterClick}>
                <Smartphone className="w-5 h-5 mr-2" />Quero ser um Influenciador agora!
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-20">
        <h2 className="text-3xl font-bold text-nz-tinta mb-4 text-center">Seus Benefícios Como Influenciador</h2>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {benefits.map((item, index) => (
            <div key={item.text} className="flex flex-col items-center group" onMouseEnter={() => setHoveredBenefit(index)} onMouseLeave={() => setHoveredBenefit(null)}>
              <div className={`flex h-20 w-20 items-center justify-center rounded-xl bg-white border-2 mb-4 transform group-hover:scale-110 transition-all shadow-md cursor-pointer ${isSaiDeBaixo ? 'border-red-500/30 group-hover:border-red-400' : 'border-nz-verde/30 group-hover:border-nz-verde'}`}>
                <item.icon className={`h-10 w-10 ${isSaiDeBaixo ? 'text-red-500' : 'text-nz-verde'}`} />
              </div>
              <p className="font-semibold text-nz-tinta text-base">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {hoveredBenefit !== null && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
            <div className={`bg-white border-2 rounded-2xl p-6 shadow-2xl max-w-sm mx-4 ${isSaiDeBaixo ? 'border-red-500/50' : 'border-nz-verde/50'}`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl flex-shrink-0 border ${isSaiDeBaixo ? 'bg-red-50 border-red-200' : 'bg-nz-verde-fundo border-nz-verde/30'}`}>
                  {React.createElement(benefits[hoveredBenefit].icon, { className: `w-8 h-8 ${isSaiDeBaixo ? 'text-red-500' : 'text-nz-verde'}` })}
                </div>
                <div>
                  <h4 className="font-bold text-nz-tinta text-lg mb-2">{benefits[hoveredBenefit].text}</h4>
                  <p className="text-nz-tinta-fraca text-sm leading-relaxed">{benefits[hoveredBenefit].description}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}