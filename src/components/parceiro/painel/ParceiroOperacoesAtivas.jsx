import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Package,
  MapPin,
  TestTube,
  Store,
  DollarSign,
  CheckCircle,
  Clock,
} from 'lucide-react';

// 📦 Lista de operações ativas do parceiro, com a linha de etapas.
// Extraído de InvestorDashboard sem mudança de cálculo nem de texto.
const etapas = (investment) => [
  { id: 1, title: 'Produto Comprado', icon: Package, description: 'Produtos adquiridos', color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/30' },
  { id: 2, title: 'Entregue no Rio de Janeiro', icon: MapPin, description: 'Produtos chegaram ao centro de distribuição', color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/30' },
  { id: 3, title: 'Testados e Aprovados', icon: TestTube, description: 'Controle de qualidade concluído', color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/30' },
  { id: 4, title: 'Disponíveis na Loja', icon: Store, description: 'Produtos à venda nos nossos canais', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/30' },
  {
    id: 5,
    title: 'Lucro Contabilizado',
    icon: DollarSign,
    description: investment
      ? `${investment.paidPeriods || 0} de ${investment.totalPeriods || 12} ciclos apurados • R$ ${(investment.paidProfit || 0).toLocaleString('pt-BR')} recebido`
      : 'Aguardando a apuração do primeiro ciclo (até 60 dias, Cláusula 8.2)',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
  },
];

const diasCorridos = (startDate) => {
  const diff = Math.abs(new Date() - new Date(startDate));
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const etapaAtual = (dias) => {
  if (dias < 5) return 0;
  if (dias < 15) return 1;
  if (dias < 20) return 2;
  if (dias < 30) return 3;
  return 4;
};

const preenchimento = (investment) => {
  const paid = investment?.paidPeriods || 0;
  const total = investment?.totalPeriods || 12;
  return Math.min((paid / total) * 100, 100);
};

export default function ParceiroOperacoesAtivas({ investimentos }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-pc-tinta">
        Minhas <span className="text-pc-ouro">Operações Ativas</span>
      </h2>

      <div className="space-y-6">
        {investimentos.map((investment) => {
          const dias = diasCorridos(investment.startDate);
          const currentStepIndex = etapaAtual(dias);
          const pct = preenchimento(investment);
          const lista = etapas(investment);

          return (
            <Card key={investment.id} className="bg-gray-800/80 backdrop-blur-sm border-gray-700">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div>
                    <CardTitle className="text-lg sm:text-xl text-white mb-1">{investment.plan}</CardTitle>
                    <p className="text-xs sm:text-sm text-gray-400">
                      Iniciado em {new Date(investment.startDate).toLocaleDateString('pt-BR')} • {dias} dias
                    </p>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <p className="text-xl sm:text-2xl font-bold text-white">R$ {investment.amount.toLocaleString('pt-BR')}</p>
                    <p className="text-xs sm:text-sm text-green-400 font-semibold">
                      R$ {(investment.paidProfit || 0).toLocaleString('pt-BR')} recebido
                    </p>
                    <p className="text-xs text-gray-500">
                      {investment.paidPeriods || 0}/{investment.totalPeriods || 12} ciclos apurados (Cláusula 8.2)
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <div>
                  <h4 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">Etapas do Processo</h4>
                  <div className="relative">
                    <div className="absolute left-5 sm:left-6 top-6 bottom-6 w-0.5 bg-gray-700" />

                    <div className="space-y-3 sm:space-y-4">
                      {lista.map((step, idx) => {
                        const isCompleted = idx < currentStepIndex;
                        const isCurrent = idx === currentStepIndex;
                        const Icon = step.icon;

                        return (
                          <div key={step.id} className="relative flex items-start gap-3 sm:gap-4">
                            <div className={`relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all overflow-hidden ${isCompleted ? 'bg-green-500/20 border-green-500' : isCurrent ? `${step.bgColor} ${step.borderColor}` : 'bg-gray-800 border-gray-700'}`}>
                              {step.id === 5 && (
                                <div
                                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500/40 to-green-500/20 transition-all duration-1000"
                                  style={{ height: `${pct}%` }}
                                >
                                  <div className="absolute top-0 left-0 right-0 h-1 bg-green-400/60 animate-pulse" />
                                </div>
                              )}

                              {isCompleted ? (
                                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 relative z-10" />
                              ) : (
                                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isCurrent ? step.color : 'text-gray-600'} relative z-10`} />
                              )}
                            </div>

                            <div className={`flex-1 pb-3 sm:pb-4 ${isCurrent ? 'animate-pulse' : ''}`}>
                              <h5 className={`font-semibold mb-1 text-sm sm:text-base ${isCompleted ? 'text-green-400' : isCurrent ? step.color : 'text-gray-500'}`}>
                                {step.title}
                                {isCompleted && ' ✓'}
                                {isCurrent && ' - Em andamento'}
                              </h5>
                              <p className="text-xs sm:text-sm text-gray-400">{step.description}</p>

                              {step.id === 5 && currentStepIndex >= 4 && (
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Preenchimento</span>
                                    <span>{pct.toFixed(0)}%</span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-1000"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="bg-green-600/10 rounded-lg p-3 sm:p-4 border border-green-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                    <div>
                      <p className="text-xs sm:text-sm text-gray-400">Encerramento do Plano (12 meses)</p>
                      <p className="font-bold text-white text-sm sm:text-base">
                        {new Date(investment.estimatedReturn).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <p className="text-lg sm:text-xl font-bold text-green-400">
                      R$ {(investment.paidProfit || 0).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-gray-400">resultado compartilhado recebido</p>
                    <p className="text-xs text-gray-500">
                      Capital aportado: R$ {investment.amount.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}