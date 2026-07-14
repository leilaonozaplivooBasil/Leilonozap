import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Zap, BarChart, ShieldCheck, LogIn, Star, Smartphone } from 'lucide-react';
import EarningsSimulator from './EarningsSimulator';
import JourneyAnimation from './JourneyAnimation';

export default function LandingContent({ onRegisterClick, onLoginClick }) {
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

  const isSaiDeBaixo = sessionStorage.getItem('saiDeBaixoContext') === 'true';

  return (
    <>
      <div className="text-center">
        <div className="mb-12">
          <div className="inline-flex flex-col items-center gap-3 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border-2 border-gray-700 hover:border-green-500/50 transition-all duration-300">
            <p className="text-gray-400 text-sm font-medium">Já tem uma conta?</p>
            <button onClick={onLoginClick} className={`px-8 py-4 bg-gradient-to-r text-white font-bold text-lg rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-3 ${isSaiDeBaixo ? 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' : 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'}`}>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><LogIn className="w-5 h-5" /></div>
              <span>Entrar na Minha Conta</span>
            </button>
            <p className="text-gray-500 text-xs">Acesse seu painel de influenciador</p>
          </div>
        </div>
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
          <div className="relative flex justify-center">
            <button onClick={scrollToCards} className="px-4 bg-gray-900 text-gray-500 text-sm font-medium hover:text-green-400 transition-colors cursor-pointer">Ou cadastre-se agora</button>
          </div>
        </div>
      </div>

      <JourneyAnimation />

      <div className="mb-16 mt-20"><EarningsSimulator /></div>

      <div ref={cardsRef} className="mt-16 max-w-2xl mx-auto">
        <Card className="bg-gray-800/80 backdrop-blur-sm border-2 border-green-500/50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30"><Smartphone className="w-6 h-6 text-green-400" /></div>
              <div><div className="text-green-400 font-bold">Influencie</div><div className="text-sm text-gray-400 font-normal">Programa de Influenciadores</div></div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-200 text-base leading-relaxed">Torne-se um <strong className="text-white">Influenciador Leilão NoZap</strong> e receba <strong className="text-green-400">5% em dinheiro real (R$)</strong> sobre CADA venda e arremate!</p>
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 space-y-2">
              <p className="text-green-400 font-semibold flex items-center gap-2"><Star className="w-4 h-4" />Benefícios:</p>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>✅ Link de indicação exclusivo</li>
                <li>✅ 3% em R$ de cada arremate dos indicados</li>
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
        <h2 className="text-3xl font-bold text-white mb-4 text-center">Seus Benefícios Como Influenciador</h2>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {benefits.map((item, index) => (
            <div key={item.text} className="flex flex-col items-center group" onMouseEnter={() => setHoveredBenefit(index)} onMouseLeave={() => setHoveredBenefit(null)}>
              <div className={`flex h-20 w-20 items-center justify-center rounded-xl bg-gray-800 border-2 mb-4 transform group-hover:scale-110 transition-all shadow-lg cursor-pointer ${isSaiDeBaixo ? 'border-red-500/30 group-hover:border-red-400' : 'border-green-500/30 group-hover:border-green-400'}`}>
                <item.icon className={`h-10 w-10 ${isSaiDeBaixo ? 'text-red-400' : 'text-green-400'}`} />
              </div>
              <p className="font-semibold text-white text-base">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {hoveredBenefit !== null && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
            <div className={`bg-gray-800 border-2 rounded-2xl p-6 shadow-2xl max-w-sm mx-4 ${isSaiDeBaixo ? 'border-red-500/50' : 'border-green-500/50'}`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl flex-shrink-0 border ${isSaiDeBaixo ? 'bg-red-500/20 border-red-500/30' : 'bg-green-500/20 border-green-500/30'}`}>
                  {React.createElement(benefits[hoveredBenefit].icon, { className: `w-8 h-8 ${isSaiDeBaixo ? 'text-red-400' : 'text-green-400'}` })}
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg mb-2">{benefits[hoveredBenefit].text}</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{benefits[hoveredBenefit].description}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}