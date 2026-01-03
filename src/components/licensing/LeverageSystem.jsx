import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LeverageSystem() {
  return (
    <div className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Construa sua rede e{' '}
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              multiplique seus ganhos
            </span>
            {' '}com o sistema de alavancagem!
          </h2>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto mt-4">
            Quanto mais sua rede cresce, maiores são seus ganhos. É simples: você indica, sua rede compra, você lucra!
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-2 border-blue-500/50 h-full hover:scale-105 transition-transform">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-500/50">
                  <Users className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Nível 1: Você Indica</h3>
                <p className="text-gray-300 leading-relaxed">
                  Compartilhe seu link com amigos, família e seguidores. Cada pessoa que se cadastra vira seu indicado.
                </p>
                <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
                  <p className="text-blue-400 font-semibold text-sm">
                    💰 3% de tudo que eles comprarem
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-2 border-green-500/50 h-full hover:scale-105 transition-transform">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500/50">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Nível 2: Seus Indicados Indicam</h3>
                <p className="text-gray-300 leading-relaxed">
                  Seus indicados também podem indicar pessoas. Você ganha comissão indireta dessa rede!
                </p>
                <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
                  <p className="text-green-400 font-semibold text-sm">
                    🚀 Ganhos em cascata da sua rede
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border-2 border-yellow-500/50 h-full hover:scale-105 transition-transform">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-yellow-500/50">
                  <Zap className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Resultado: Renda Passiva</h3>
                <p className="text-gray-300 leading-relaxed">
                  Sua rede trabalha por você! Quanto mais ela cresce, mais você ganha automaticamente.
                </p>
                <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg">
                  <p className="text-yellow-400 font-semibold text-sm">
                    ⚡ Ganhos recorrentes e automáticos
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Exemplo Visual de Alavancagem */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border-2 border-green-500/30"
        >
          <h3 className="text-2xl font-bold text-white text-center mb-8">Exemplo Prático de Alavancagem</h3>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                Você
              </div>
              <div className="flex-1 h-1 bg-green-500"></div>
              <div className="bg-green-900/30 border border-green-500/50 rounded-lg px-4 py-2">
                <p className="text-green-400 font-semibold">10 indicados diretos</p>
              </div>
            </div>

            <div className="flex items-center gap-4 ml-8">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                10
              </div>
              <div className="flex-1 h-1 bg-blue-500"></div>
              <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg px-4 py-2">
                <p className="text-blue-400 font-semibold">100 indicados indiretos</p>
              </div>
            </div>

            <div className="flex items-center gap-4 ml-16">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                100
              </div>
              <div className="flex-1 h-1 bg-purple-500"></div>
              <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg px-4 py-2">
                <p className="text-purple-400 font-semibold">1.000+ pessoas na rede</p>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-yellow-900/20 border-2 border-yellow-500/50 rounded-xl p-6 text-center">
            <p className="text-2xl font-bold text-white mb-2">
              Resultado: <span className="text-yellow-400">R$ 3.000+</span> por mês
            </p>
            <p className="text-gray-400">
              Com apenas R$ 100 de compra média por pessoa
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}