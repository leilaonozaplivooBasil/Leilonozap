import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  TrendingUp, 
  Check, 
  DollarSign,
  Package,
  LogIn,
  ShieldCheck
} from 'lucide-react';

import LoginModal from '../components/common/LoginModal';
import ValoraNotesGallery from '../components/licensing/ValoraNotesGallery';
import JourneyAnimation from '../components/licensing/JourneyAnimation';

const AppUser = base44.entities.AppUser;

const LandingContent = ({ onLoginClick }) => {
  const [hoveredBenefit, setHoveredBenefit] = React.useState(null);

  const benefits = [
    { 
      icon: DollarSign, 
      text: "Lucro Garantido",
      description: "Receba 3% de lucro garantido sobre todas as vendas realizadas com seu investimento. Ganhos previsíveis e seguros!"
    },
    { 
      icon: ShoppingCart, 
      text: "Nós Vendemos Tudo",
      description: "Nossa equipe cuida de toda a operação: vendas, estoque, atendimento, logística e entrega. Você só investe e lucra!"
    },
    { 
      icon: Package, 
      text: "Produtos de Alta Liquidez",
      description: "Trabalhamos com produtos selecionados de alta demanda. Risco baixo e retorno garantido em 60 dias!"
    },
    { 
      icon: ShieldCheck, 
      text: "Investimento Seguro",
      description: "Gestão 100% profissional do seu capital. Transparência total e contratos formalizados!"
    },
  ];

  return (
    <>
      <div className="text-center">
        <div className="mb-12">
          <div className="inline-flex flex-col items-center gap-3 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border-2 border-gray-700 hover:border-green-500/50 transition-all duration-300">
            <p className="text-gray-400 text-sm font-medium">
              Já tem uma conta?
            </p>
            <button
              onClick={onLoginClick}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-105 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <LogIn className="w-5 h-5" />
              </div>
              <span>Entrar na Minha Conta</span>
            </button>
            <p className="text-gray-500 text-xs">
              Acesse seu painel de parceiro
            </p>
          </div>
        </div>
      </div>

      <JourneyAnimation 
        journeyTitle="Jornada do Parceiro"
        customPhases={[
          {
            id: 0,
            title: "Crie sua conta e torne-se um parceiro",
            icon: "👤",
            color: "text-green-400",
            description: "Cadastrou"
          },
          {
            id: 1,
            title: "Acesse sua área parceira",
            icon: "🚪",
            color: "text-green-400",
            description: "Entrou"
          },
          {
            id: 2,
            title: "Invista em produtos selecionados",
            icon: "💳",
            color: "text-green-400",
            description: "Comprou"
          },
          {
            id: 3,
            title: "Receba seus lucros garantidos",
            icon: "🎁",
            color: "text-green-400",
            description: "Ganhou"
          }
        ]}
      />

      <div className="mb-16 mt-20">
        <ValoraNotesGallery />
      </div>

      {/* COMO FUNCIONA - Mantém conteúdo original */}
      <div className="mb-12 sm:mb-16 max-w-4xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 text-center">Como Funciona</h2>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mt-8 sm:mt-12">
          <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Escolha seus Produtos</h3>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                    Navegue pelo nosso catálogo e escolha os produtos que deseja investir. Veja o valor de compra e o potencial de venda.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Realize seu Investimento</h3>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                    Invista a partir de R$ 5.000,00 nos produtos selecionados. Seu capital fica aplicado por 60 dias.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Nós Vendemos Tudo</h3>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                    Nossa equipe cuida de toda a operação: gestão de estoque, vendas, atendimento, logística e entrega.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">4</span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Receba seus Lucros</h3>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                    Em 60 dias, receba seu investimento de volta + 3% de lucro garantido sobre as vendas realizadas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DETALHES DO INVESTIMENTO */}
      <div className="mb-12 sm:mb-16 max-w-4xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8 text-center">
          Detalhes do <span className="text-green-400">Investimento</span>
        </h2>

        <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
          <CardContent className="p-4 sm:p-8">
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <Check className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 flex-shrink-0 mt-0.5 sm:mt-1" />
                <p className="text-gray-300 text-sm sm:text-lg leading-relaxed">
                  <strong className="text-white">Investimento Mínimo:</strong> R$ 5.000,00
                </p>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <Check className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 flex-shrink-0 mt-0.5 sm:mt-1" />
                <p className="text-gray-300 text-sm sm:text-lg leading-relaxed">
                  <strong className="text-white">Prazo:</strong> 60 dias
                </p>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <Check className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 flex-shrink-0 mt-0.5 sm:mt-1" />
                <p className="text-gray-300 text-sm sm:text-lg leading-relaxed">
                  <strong className="text-white">Retorno:</strong> Investimento + 3% de lucro sobre as vendas
                </p>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <Check className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 flex-shrink-0 mt-0.5 sm:mt-1" />
                <p className="text-gray-300 text-sm sm:text-lg leading-relaxed">
                  <strong className="text-white">Gestão:</strong> 100% gerenciada pela nossa equipe
                </p>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <Check className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 flex-shrink-0 mt-0.5 sm:mt-1" />
                <p className="text-gray-300 text-sm sm:text-lg leading-relaxed">
                  <strong className="text-white">Risco:</strong> Baixíssimo - produtos de alta liquidez
                </p>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 bg-green-600/20 rounded-lg p-4 sm:p-6 border border-green-500/30">
              <p className="text-white text-base sm:text-xl font-bold text-center leading-relaxed">
                💰 Invista a partir de R$ 5.000,00 e receba seu valor de volta + 3% em 60 dias!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* EXEMPLO DE PRODUTOS */}
      <div className="mb-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-white mb-12">
          Exemplo de <span className="text-green-400">Produtos</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
            <CardContent className="p-6">
              <Package className="w-12 h-12 text-green-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Eletrônicos</h3>
              <div className="space-y-2 text-gray-300">
                <p><strong className="text-white">Compra:</strong> R$ 1.200,00</p>
                <p><strong className="text-white">Venda:</strong> R$ 1.800,00</p>
                <p className="text-green-400 font-bold">Seu lucro: R$ 54,00 (3%)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
            <CardContent className="p-6">
              <Package className="w-12 h-12 text-green-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Eletrodomésticos</h3>
              <div className="space-y-2 text-gray-300">
                <p><strong className="text-white">Compra:</strong> R$ 800,00</p>
                <p><strong className="text-white">Venda:</strong> R$ 1.400,00</p>
                <p className="text-green-400 font-bold">Seu lucro: R$ 42,00 (3%)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
            <CardContent className="p-6">
              <Package className="w-12 h-12 text-green-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Móveis</h3>
              <div className="space-y-2 text-gray-300">
                <p><strong className="text-white">Compra:</strong> R$ 2.000,00</p>
                <p><strong className="text-white">Venda:</strong> R$ 3.200,00</p>
                <p className="text-green-400 font-bold">Seu lucro: R$ 96,00 (3%)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-20">
        <h2 className="text-3xl font-bold text-white mb-4 text-center">Seus Benefícios Como Parceiro</h2>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {benefits.map((item, index) => (
            <div 
              key={item.text} 
              className="flex flex-col items-center group"
              onMouseEnter={() => setHoveredBenefit(index)}
              onMouseLeave={() => setHoveredBenefit(null)}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-800 border-2 border-green-500/30 mb-4 transform group-hover:scale-110 group-hover:border-green-400 transition-all shadow-lg cursor-pointer">
                <item.icon className="h-10 w-10 text-green-400" />
              </div>
              <p className="font-semibold text-white text-base">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {hoveredBenefit !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
            style={{ perspective: '1000px' }}
          >
            <div className="bg-gray-800 border-2 border-green-500/50 rounded-2xl p-6 shadow-2xl max-w-sm mx-4"
                 style={{ 
                   boxShadow: '0 0 60px rgba(34, 197, 94, 0.4), 0 20px 80px rgba(0,0,0,0.8)'
                 }}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-500/20 rounded-xl flex-shrink-0 border border-green-500/30">
                  {React.createElement(benefits[hoveredBenefit].icon, {
                    className: "w-8 h-8 text-green-400"
                  })}
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg mb-2">
                    {benefits[hoveredBenefit].text}
                  </h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {benefits[hoveredBenefit].description}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default function PartnersPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const savedUserJSON = localStorage.getItem('currentUser');
        if (savedUserJSON) {
          const user = JSON.parse(savedUserJSON);
          setCurrentUser(user);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("❌ Erro ao buscar usuário:", error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setShowLoginModal(false);
    // Redireciona para o dashboard do investidor
    navigate(createPageUrl("InvestorDashboard"));
  };

  const handleLoginClick = () => {
    sessionStorage.setItem('loginFromPartners', 'true');
    setShowLoginModal(true);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[5000]">
        <div className="text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG"
            alt="PROTEÇÃO MASTER"
            className="w-20 h-20 mx-auto mb-6 rounded-full"
            style={{
              animation: 'logoGrowSpin 3s ease-in-out infinite',
              filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.5))',
            }}
          />
          <p className="text-lg text-gray-300 tracking-wider" style={{ animation: 'gentlePulseText 2.5s ease-in-out infinite' }}>
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        {/* Hero Section */}
        <div className="relative overflow-hidden py-12 sm:py-20 px-4 sm:px-6">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-500/10"></div>
          <div className="relative max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 bg-green-500/10 px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-green-500/30">
                <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-green-400" />
                <span className="text-green-400 font-semibold text-xs sm:text-base">Programa de Parceria Profissional</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-white leading-tight px-2">
                Torne-se um Parceiro e Lucre Conosco
              </h1>
              <p className="text-base sm:text-lg text-gray-300 max-w-3xl mx-auto mb-4 sm:mb-8 px-4 leading-relaxed">
                Invista em produtos selecionados e receba <strong className="text-green-400">3% de lucro garantido</strong> sobre as vendas realizadas!
              </p>
              <p className="text-base sm:text-lg text-gray-300 max-w-3xl mx-auto mb-6 sm:mb-8 px-4 leading-relaxed">
                Investimento a partir de <strong className="text-yellow-400">R$ 5.000,00</strong> com retorno em <strong className="text-yellow-400">60 dias</strong>!
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <LandingContent onLoginClick={handleLoginClick} />
        </div>

        <div className="py-20 px-6 bg-gray-800/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4">
              Invista e Lucre com Segurança
            </h2>
            <p className="text-gray-400 text-center mb-12">
              Veja como nossos parceiros estão lucrando
            </p>
          </div>
        </div>
      </div>

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={handleLoginSuccess}
          onSwitchToRegister={() => {
            setShowLoginModal(false);
          }}
        />
      )}

      <style>{`
        @keyframes logoGrowSpin {
          0% {
            transform: scale(0.8) rotate(0deg);
            filter: drop-shadow(0 0 5px rgba(34, 197, 94, 0.2));
          }
          25% {
            transform: scale(1.1) rotate(90deg);
            filter: drop-shadow(0 0 15px rgba(34, 197, 94, 0.7));
          }
          50% {
            transform: scale(1) rotate(180deg);
            filter: drop-shadow(0 0 10px rgba(34, 197, 94, 0.5));
          }
          75% {
            transform: scale(1.1) rotate(270deg);
            filter: drop-shadow(0 0 15px rgba(34, 197, 94, 0.7));
          }
          100% {
            transform: scale(0.8) rotate(360deg);
            filter: drop-shadow(0 0 5px rgba(34, 197, 94, 0.2));
          }
        }

        @keyframes gentlePulseText {
          0%, 100% {
            opacity: 0.8;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
      `}</style>
    </>
  );
}