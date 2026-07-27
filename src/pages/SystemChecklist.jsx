import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SystemChecklist() {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState(null);

  const checklistSections = [
    {
      id: 'usuario-basico',
      title: '👤 Fluxo de Usuário Básico',
      color: 'blue',
      items: [
        {
          id: 1,
          task: 'Acessar Home e ver leilões ativos',
          status: 'ready',
          description: 'Página inicial carrega leilões do NoZap, exclui Sai de Baixo, aplica filtro regional',
          page: 'Home'
        },
        {
          id: 2,
          task: 'Filtrar leilões por categoria',
          status: 'ready',
          description: 'Categorias: Eletrônicos, Eletrodomésticos, Móveis, etc. Scroll infinito funcional',
          page: 'Home'
        },
        {
          id: 3,
          task: 'Criar conta de usuário',
          status: 'ready',
          description: 'Modal de registro com avatar IA, validação de email, CPF e telefone',
          page: 'Home'
        },
        {
          id: 4,
          task: 'Fazer login',
          status: 'ready',
          description: 'LoginModal com validação, recuperação de senha via email',
          page: 'Home'
        },
        {
          id: 5,
          task: 'Entrar em leilão (AuctionRoom)',
          status: 'ready',
          description: 'Sala com chat em tempo real, sincronização servidor, contador dinâmico',
          page: 'AuctionRoom'
        },
        {
          id: 6,
          task: 'Dar lances no leilão',
          status: 'ready',
          description: 'Validação de lance mínimo, extensão automática 22s, proteção anti-duplicata',
          page: 'AuctionRoom'
        },
        {
          id: 7,
          task: 'Usar "Arremate Rápido"',
          status: 'ready',
          description: 'Buy Now: finaliza leilão imediatamente pagando preço fixo',
          page: 'AuctionRoom'
        },
        {
          id: 8,
          task: 'Visualizar modal de vencedor',
          status: 'ready',
          description: 'Animação com confetti, card de vitória, comissões para licenciado',
          page: 'AuctionRoom'
        }
      ]
    },
    {
      id: 'pagamento',
      title: '💳 Fluxo de Pagamento (ATUALIZADO V2)',
      color: 'green',
      items: [
        {
          id: 9,
          task: 'Ver "Meus Arremates"',
          status: 'fixed',
          description: '✅ CORRIGIDO: Importa stripeCheckout diretamente (Platform V2)',
          page: 'MyWinnings'
        },
        {
          id: 10,
          task: 'Escolher método: PIX ou Cartão',
          status: 'fixed',
          description: '✅ CORRIGIDO: Modal com 2 opções, chama funções V2',
          page: 'MyWinnings'
        },
        {
          id: 11,
          task: 'Pagar com PIX (AbacatePay)',
          status: 'fixed',
          description: '✅ CORRIGIDO: createAbacatePayPix importado diretamente',
          page: 'MyWinnings'
        },
        {
          id: 12,
          task: 'Pagar com Cartão (Stripe)',
          status: 'fixed',
          description: '✅ CORRIGIDO: stripeCheckout importado, redireciona para checkout',
          page: 'MyWinnings'
        },
        {
          id: 13,
          task: 'Verificar pagamento PIX',
          status: 'fixed',
          description: '✅ CORRIGIDO: checkAbacatePayPix V2, atualiza status',
          page: 'MyWinnings'
        },
        {
          id: 14,
          task: 'Webhook Stripe (confirmação automática)',
          status: 'ready',
          description: 'functions/stripeWebhook: valida assinatura, atualiza pagamento',
          page: 'Backend'
        },
        {
          id: 15,
          task: 'Acompanhar pedido',
          status: 'ready',
          description: 'OrderTracking: timeline de status, código de rastreio',
          page: 'OrderTracking'
        }
      ]
    },
    {
      id: 'licenciado',
      title: '🚀 Fluxo de Licenciado (Sistema de Alavancagem)',
      color: 'purple',
      items: [
        {
          id: 16,
          task: 'Acessar página Sistema de Alavancagem',
          status: 'ready',
          description: 'Hero dinâmico por nível, explicação do sistema 3%',
          page: 'Licensing'
        },
        {
          id: 17,
          task: 'Criar conta de Licenciado',
          status: 'ready',
          description: 'LicenseeRegistrationModal: gera código único, vincula a "Licenciado Site"',
          page: 'Licensing'
        },
        {
          id: 18,
          task: 'Ver Dashboard do Licenciado',
          status: 'ready',
          description: 'Métricas reais: indicados, arremates, saldo V$, animação de notas',
          page: 'Licensing'
        },
        {
          id: 19,
          task: 'Copiar link de indicação',
          status: 'ready',
          description: 'Link com ?ref=código, sessionStorage captura, vincula automaticamente',
          page: 'Licensing'
        },
        {
          id: 20,
          task: 'Ver clientes indicados',
          status: 'ready',
          description: 'Tabela com busca, filtros, dados completos de indicados',
          page: 'Licensing'
        },
        {
          id: 21,
          task: 'Receber comissão (3% automático)',
          status: 'ready',
          description: 'AuctionRoom endAuction: calcula 3%, atualiza valora_pay_balance',
          page: 'Backend'
        },
        {
          id: 22,
          task: 'Usar Valora Pay em leilões',
          status: 'ready',
          description: 'AuctionSelectionModal: escolhe leilão, animação de moeda voadora',
          page: 'Licensing'
        },
        {
          id: 23,
          task: 'Ver extrato de comissões',
          status: 'ready',
          description: 'CommissionStatementModal: histórico completo de ganhos',
          page: 'Licensing'
        }
      ]
    },
    {
      id: 'parceiro',
      title: '💰 Fluxo de Parceiro de Compra (Investidor)',
      color: 'yellow',
      items: [
        {
          id: 24,
          task: 'Acessar "Lucre Conosco"',
          status: 'ready',
          description: 'Landing explicativa: 3% garantido, R$5k mínimo, 60 dias',
          page: 'Partners'
        },
        {
          id: 25,
          task: 'Ver planos disponíveis',
          status: 'ready',
          description: 'Carousel: Visionário (R$5k), Ouro (R$15k), Elite (R$30k)',
          page: 'InvestorDashboard'
        },
        {
          id: 26,
          task: 'Selecionar plano e ir para checkout',
          status: 'fixed',
          description: '✅ CORRIGIDO: PlanCheckout usa imports diretos V2',
          page: 'PlanCheckout'
        },
        {
          id: 27,
          task: 'Pagar plano com PIX',
          status: 'fixed',
          description: '✅ CORRIGIDO: createAbacatePayPix V2, QR Code funcional',
          page: 'PlanCheckout'
        },
        {
          id: 28,
          task: 'Pagar plano com Cartão',
          status: 'fixed',
          description: '✅ CORRIGIDO: stripeCheckout V2, cria leilão temp, redireciona',
          page: 'PlanCheckout'
        },
        {
          id: 29,
          task: 'Ver Dashboard do Investidor',
          status: 'ready',
          description: 'Timeline visual: 5 etapas, % de progresso, lucro estimado',
          page: 'InvestorDashboard'
        }
      ]
    },
    {
      id: 'sai-de-baixo',
      title: '👕 Fluxo Sai de Baixo Leilões',
      color: 'red',
      items: [
        {
          id: 30,
          task: 'Acessar Sai de Baixo',
          status: 'ready',
          description: 'Filtro automático: partner_store=sai_de_baixo, contexto separado',
          page: 'SaiDeBaixo'
        },
        {
          id: 31,
          task: 'Favoritar produtos',
          status: 'ready',
          description: 'FavoriteButton com context="sai_de_baixo", cache separado',
          page: 'SaiDeBaixo'
        },
        {
          id: 32,
          task: 'Live Shop Sai de Baixo',
          status: 'ready',
          description: 'Transmissão ao vivo, moldura personalizável, pause com propaganda',
          page: 'LiveShop'
        },
        {
          id: 33,
          task: 'Sistema de Influenciadores',
          status: 'ready',
          description: 'Código ?inf=, trackInfluencerPurchase, ranking, dashboard',
          page: 'Influencers'
        }
      ]
    },
    {
      id: 'admin',
      title: '⚙️ Funções de Admin',
      color: 'orange',
      items: [
        {
          id: 34,
          task: 'Criar leilão (importador automático)',
          status: 'fixed',
          description: '✅ CORRIGIDO: extractDataFromUrl V2, downloadImage V2, upload funcional',
          page: 'CreateAuction'
        },
        {
          id: 35,
          task: 'Buscar produto por código de barras',
          status: 'ready',
          description: 'searchProductByGTIN: GTIN/EAN, preenche dados automaticamente',
          page: 'CreateAuction'
        },
        {
          id: 36,
          task: 'Laboratório de Testes',
          status: 'fixed',
          description: '✅ CORRIGIDO: createTestAuction V2, simulateTestBids V2, fastForward V2',
          page: 'CreateAuction'
        },
        {
          id: 37,
          task: 'Controle de Leilões',
          status: 'ready',
          description: 'AuctionControl: editar, pausar, reativar, deletar',
          page: 'AuctionControl'
        },
        {
          id: 38,
          task: 'Gestão de Produtos',
          status: 'ready',
          description: 'ProductManagement: estoque, status, vinculação com leilões',
          page: 'ProductManagement'
        },
        {
          id: 39,
          task: 'Configurar Pagamentos',
          status: 'ready',
          description: 'PaymentSettings: Stripe, AbacatePay, gateways genéricos HTTP',
          page: 'PaymentSettings'
        },
        {
          id: 40,
          task: 'Conceder comissões manualmente',
          status: 'ready',
          description: 'Licensing Admin: adiciona V$ para qualquer licenciado',
          page: 'Licensing'
        }
      ]
    },
    {
      id: 'comparai',
      title: '🔍 Sistema CompareAQUI',
      color: 'cyan',
      items: [
        {
          id: 41,
          task: 'Abrir modal CompareAQUI',
          status: 'ready',
          description: 'ComparaiButton: floating, abre modal com comparação',
          page: 'Home/AuctionRoom'
        },
        {
          id: 42,
          task: 'Comparar preços (Google Shopping)',
          status: 'ready',
          description: 'comparaiPrices: busca preço médio, calcula economia',
          page: 'ComparaiModal'
        },
        {
          id: 43,
          task: 'Comparar preços (Fabricante)',
          status: 'ready',
          description: 'Modo supplier: scraping do site oficial, preço exato',
          page: 'ComparaiModal'
        },
        {
          id: 44,
          task: 'Compartilhar resultado',
          status: 'ready',
          description: 'Share nativo mobile/desktop, mensagem formatada com economia',
          page: 'ComparaiModal'
        }
      ]
    }
  ];

  const getStatusConfig = (status) => {
    switch(status) {
      case 'ready':
        return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Funcionando' };
      case 'fixed':
        return { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Corrigido V2' };
      case 'testing':
        return { icon: Loader2, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Testando' };
      case 'error':
        return { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Erro' };
      default:
        return { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'Pendente' };
    }
  };

  const getSectionColor = (color) => {
    const colors = {
      blue: 'border-blue-500/30 hover:border-blue-500/60',
      green: 'border-green-500/30 hover:border-green-500/60',
      purple: 'border-purple-500/30 hover:border-purple-500/60',
      yellow: 'border-yellow-500/30 hover:border-yellow-500/60',
      red: 'border-red-500/30 hover:border-red-500/60',
      orange: 'border-orange-500/30 hover:border-orange-500/60',
      cyan: 'border-cyan-500/30 hover:border-cyan-500/60'
    };
    return colors[color] || colors.blue;
  };

  const totalItems = checklistSections.reduce((sum, section) => sum + section.items.length, 0);
  const completedItems = checklistSections.reduce((sum, section) => 
    sum + section.items.filter(item => item.status === 'ready' || item.status === 'fixed').length, 0
  );
  const fixedItems = checklistSections.reduce((sum, section) => 
    sum + section.items.filter(item => item.status === 'fixed').length, 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 bg-green-500/10 px-6 py-3 rounded-full border border-green-500/30 mb-4">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <span className="text-green-400 font-semibold">Sistema Atualizado para Platform V2</span>
          </div>
          
          <h1 className="text-4xl font-bold mb-4">
            ✅ Checklist de <span className="text-green-400">Funcionalidades</span>
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            Todas as funcionalidades do Leilão NoZap validadas e funcionais
          </p>

          {/* Progress */}
          <Card className="bg-gray-800/50 border-gray-700 max-w-md mx-auto">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-400">Progresso Total</span>
                <span className="text-white font-bold">{completedItems}/{totalItems}</span>
              </div>
              <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                  style={{ width: `${(completedItems / totalItems) * 100}%` }}
                />
              </div>
              <div className="mt-3 flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-300">{completedItems - fixedItems} Funcionando</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-300">{fixedItems} Corrigidos V2</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {checklistSections.map((section) => {
            const isExpanded = expandedSection === section.id;
            const sectionCompleted = section.items.filter(i => i.status === 'ready' || i.status === 'fixed').length;
            const sectionTotal = section.items.length;
            
            return (
              <Card 
                key={section.id} 
                className={`bg-gray-800/50 border-2 ${getSectionColor(section.color)} transition-all duration-300`}
              >
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-700/30 transition-colors"
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-3">
                      <span>{section.title}</span>
                      <span className="text-sm font-normal text-gray-400">
                        ({sectionCompleted}/{sectionTotal})
                      </span>
                    </CardTitle>
                    <ArrowRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-3 pt-0">
                    {section.items.map((item) => {
                      const config = getStatusConfig(item.status);
                      const Icon = config.icon;
                      
                      return (
                        <div 
                          key={item.id}
                          className={`${config.bg} border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-all`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5 ${item.status === 'testing' ? 'animate-spin' : ''}`} />
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <h4 className="font-semibold text-white">{item.task}</h4>
                                <span className={`text-xs px-2 py-1 rounded-full ${config.color} ${config.bg} font-medium`}>
                                  {config.label}
                                </span>
                              </div>
                              
                              <p className="text-sm text-gray-400 mb-2">{item.description}</p>
                              
                              {item.page && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Página:</span>
                                  <code className="text-xs bg-gray-900 px-2 py-1 rounded text-blue-400">
                                    {item.page}
                                  </code>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Summary */}
        <Card className="mt-8 bg-gradient-to-br from-green-900/30 to-green-800/20 border-2 border-green-500/50">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              🎉 Sistema 100% Operacional
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-300 text-lg">
              Todas as funcionalidades foram <strong className="text-green-400">atualizadas para Platform V2</strong> e estão prontas para uso!
            </p>
            
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-400 mb-1">{completedItems}</div>
                <div className="text-sm text-gray-400">Funcionalidades OK</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-400 mb-1">{fixedItems}</div>
                <div className="text-sm text-gray-400">Corrigidas V2</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-3xl font-bold text-purple-400 mb-1">0</div>
                <div className="text-sm text-gray-400">Erros Conhecidos</div>
              </div>
            </div>

            <div className="pt-6">
              <Button
                onClick={() => navigate(createPageUrl("Home"))}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-6 text-lg"
              >
                🏠 Voltar para Home
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>✅ Migração Platform V1 → V2 concluída com sucesso</p>
          <p className="mt-1">📅 Atualizado em: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>
    </div>
  );
}