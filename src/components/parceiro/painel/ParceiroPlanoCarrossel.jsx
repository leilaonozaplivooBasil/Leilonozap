import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import ParceiroAporteLivre from './ParceiroAporteLivre';

// 🎠 Carrossel de planos de parceria (extraído de InvestorDashboard, sem
// alteração de conteúdo, valores ou textos de compliance).
export default function ParceiroPlanoCarrossel({
  portfolios,
  productImages,
  indice,
  setIndice,
  setPausado,
  onEscolher,
}) {
  const portfolio = portfolios[indice];

  // 💰 Plano Private: valor digitável. Começa no mínimo e reseta ao trocar de plano.
  const livre = portfolio?.valorLivre === true;
  const min = portfolio?.valorMin || 0;
  const max = portfolio?.valorMax || 0;
  const passo = portfolio?.valorPasso || 0;
  const [aporte, setAporte] = React.useState(portfolio?.minInvestment || 0);
  React.useEffect(() => {
    setAporte(portfolio?.minInvestment || 0);
  }, [portfolio?.id, portfolio?.minInvestment]);

  const aporteValido = !livre || (aporte >= min && aporte <= max && aporte % passo === 0);

  return (
    <>
      <div
        className="relative py-2"
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={indice}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center px-10"
          >
            <Card className="bg-pc-preto-2 border border-pc-borda w-full max-w-md overflow-hidden">
              <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden bg-pc-preto">
                {(portfolio.imageUrl || productImages[portfolio.imageKey]) ? (
                  <img
                    src={portfolio.imageUrl || productImages[portfolio.imageKey]}
                    alt={portfolio.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-pc-preto-2">
                    <Package className="w-16 h-16 text-pc-tinta-fraca" />
                  </div>
                )}
                <div className="absolute top-2 sm:top-4 right-2 sm:right-4 border border-pc-ouro bg-pc-preto/80 text-pc-ouro px-2 sm:px-4 py-1 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.15em]">
                  CURADORIA PRÓPRIA
                </div>
              </div>

              <CardContent className="p-3 sm:p-4">
                <h3 className="text-xl sm:text-2xl font-bold text-pc-tinta mb-2">{portfolio.name}</h3>
                <p className="text-pc-tinta-fraca text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed">{portfolio.description}</p>

                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <div className="bg-pc-preto p-2 sm:p-3 border border-pc-borda col-span-2">
                    {livre ? (
                      <ParceiroAporteLivre
                        valor={aporte}
                        min={min}
                        max={max}
                        passo={passo}
                        onChange={setAporte}
                      />
                    ) : (
                      <>
                        <p className="text-pc-ouro text-[10px] sm:text-xs uppercase tracking-[0.15em] mb-1">Capital do aporte</p>
                        <p className="text-base sm:text-xl md:text-2xl font-bold text-pc-tinta leading-tight">
                          R$ {portfolio.minInvestment.toLocaleString('pt-BR')}
                        </p>
                      </>
                    )}
                    <p className="text-pc-tinta-fraca text-[10px] mt-1 leading-relaxed">
                      Participação sobre o lucro líquido apurado nas operações, conforme
                      percentual definido na adesão (Cláusula 7.1).
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-4 text-xs sm:text-sm text-pc-tinta-fraca mb-3 sm:mb-4">
                  <span className="flex items-center gap-1">⏱️ Ciclo completo em 30 dias</span>
                  <span className="flex items-center gap-1">📦 Gestão operacional nossa</span>
                </div>

                <Button
                  disabled={!aporteValido}
                  className="w-full min-h-[48px] bg-transparent border border-pc-ouro text-pc-ouro hover:bg-pc-ouro hover:text-pc-preto disabled:opacity-40 text-sm sm:text-base py-3 sm:py-4 font-semibold"
                  onClick={() =>
                    onEscolher(livre ? { ...portfolio, minInvestment: aporte } : portfolio)
                  }
                >
                  Comprar Agora
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={() => setIndice((prev) => (prev === 0 ? portfolios.length - 1 : prev - 1))}
          className="absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-12 sm:h-12 bg-pc-preto-2 border border-pc-borda rounded-full flex items-center justify-center text-pc-ouro transition-colors hover:border-pc-ouro"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <button
          onClick={() => setIndice((prev) => (prev === portfolios.length - 1 ? 0 : prev + 1))}
          className="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-12 sm:h-12 bg-pc-preto-2 border border-pc-borda rounded-full flex items-center justify-center text-pc-ouro transition-colors hover:border-pc-ouro"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      <div className="flex justify-center gap-2 mt-3 sm:mt-4">
        {portfolios.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setIndice(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === indice ? 'w-6 bg-pc-ouro' : 'w-1.5 bg-pc-borda hover:bg-pc-tinta-fraca'
            }`}
          />
        ))}
      </div>
    </>
  );
}