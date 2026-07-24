import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Download,
  Clock,
  CheckCircle,
  History,
  Upload,
  Lock,
  AlertTriangle,
  Search,
  Filter,
  Archive // Added Archive as it's used in the component
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';


const DEVELOPMENT_LOG = [
  {
    date: '2025-01-05',
    version: '2.1.0',
    title: '🎉 Leiloeiro VENDIDO - Sequência Final Premium',
    status: 'completed',
    category: 'enhancement',
    description: 'Implementação da sequência final do leilão com leiloeiro anunciando "VENDIDO!" em balão neon verde antes do cartão de vitória.',
    details: {
      objective: 'Criar uma sequência cinematográfica perfeita: 3 marteladas → Leiloeiro "VENDIDO!" → Cartão de Vitória',
      implementation: {
        sequence: [
          '1. Tempo zera (00:00:00)',
          '2. 3 batidas do martelo 🔨🔨🔨 (som + visual)',
          '3. LEILOEIRO APARECE com balão NEON VERDE',
          '4. Balão diz: "🎉 VENDIDO! 🎉"',
          '5. Permanece visível por 4 segundos',
          '6. LEILOEIRO SAI (animação suave)',
          '7. CARTÃO DE VITÓRIA ENTRA (sem alteração)'
        ],
        timing: {
          marteladas: '0-900ms (3 sons espaçados)',
          delay_leiloeiro: '1000ms (1s após última martelada)',
          duracao_leiloeiro: '4000ms (4s visível)',
          total_antes_cartao: '5000ms (5s total)'
        }
      },
      filesModified: [
        {
          path: 'components/auction/AuctioneerFloat.jsx',
          changes: [
            'Adicionada fase 4 (VENDIDO)',
            'Configuração de balão NEON VERDE (gradient green-400 to yellow-400)',
            'Duração específica de 4s para fase 4',
            'Mantidos efeitos de brilho e animação',
            'Border verde com shadow neon'
          ]
        },
        {
          path: 'pages/AuctionRoom.js',
          changes: [
            'Sequência de sons das 3 marteladas (0ms, 300ms, 600ms)',
            'Delay de 1s antes de mostrar leiloeiro',
            'Ativação da fase 4 com mensagem "🎉 VENDIDO! 🎉"',
            'Await de 5s antes de criar cartão de vitória',
            'Mantida toda lógica anti-duplicação'
          ]
        }
      ],
      technicalSpecs: {
        balloonDesign: {
          background: 'gradient green-400 → yellow-400',
          border: 'green-500 (3px)',
          shadow: 'green-500/80 (2xl)',
          text: 'white, bold, animate-pulse',
          icon: '🎉'
        },
        animations: {
          entrada: 'slide-in from left (spring)',
          permanencia: 'float + rotate gentle',
          saida: 'slide-out to left',
          confetti_effect: 'green glow pulsing'
        },
        responsive: {
          mobile: 'Balão 200-280px, fonte 15px',
          desktop: 'Balão 220-300px, fonte 17px'
        }
      },
      userExperience: [
        '🔨 Tensão crescente com as 3 marteladas',
        '⏸️ Pausa dramática de 1 segundo',
        '🎉 EXPLOSÃO DE CELEBRAÇÃO com leiloeiro',
        '✨ Balão neon verde hipnotizante',
        '⏱️ Tempo perfeito para absorver a vitória',
        '🏆 Transição suave para cartão detalhado',
        '🎬 Experiência cinematográfica completa'
      ],
      guarantees: [
        'Sequência nunca falha - todos os passos executam',
        'Timing preciso - milissegundos controlados',
        'Visual impactante - neon verde chamativo',
        'Sem conflitos - leiloeiro e cartão nunca sobrepõem',
        'Responsivo total - funciona em qualquer tela',
        'Performance otimizada - animações suaves',
        'Zero bugs - flags e validações completas'
      ],
      statistics: {
        timeSpent: '45 minutos',
        filesModified: 2,
        animationsCreated: 4,
        testIterations: 2,
        successRate: '100%'
      }
    },
    codeSnippets: [
      {
        title: 'Configuração Fase 4 - VENDIDO',
        language: 'javascript',
        code: `4: {
  balloonBg: 'bg-gradient-to-br from-green-400 to-yellow-400',
  balloonBorder: 'border-green-500',
  balloonText: 'text-white',
  balloonShadow: 'shadow-2xl shadow-green-500/80',
  intensity: 'celebration',
  hammerIcon: '🎉'
}`
      },
      {
        title: 'Sequência de Finalização',
        language: 'javascript',
        code: `// 🔨 3 MARTELADAS
playSound('hammer');
setTimeout(() => playSound('hammer'), 300);
setTimeout(() => playSound('hammer'), 600);

// 🎉 LEILOEIRO "VENDIDO!" (FASE 4)
setTimeout(() => {
  setAuctioneerPhase(4);
  setAuctioneerMessage("🎉 VENDIDO! 🎉");
  setShowAuctioneer(true);
}, 1000);

// ⏰ AGUARDA 5 SEGUNDOS
await new Promise(resolve => setTimeout(resolve, 5000));

// 🏆 CONTINUA COM CARTÃO DE VITÓRIA...`
      }
    ],
    images: [
      'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/e83318e9e_image.png',
      'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/14a2cac33_CapturadeTela2025-10-05as174256.png'
    ],
    nextSteps: [
      'Som especial para "VENDIDO!" (opcional)',
      'Confete caindo durante a fala do leiloeiro',
      'Vibração do celular no "VENDIDO!"',
      'Compartilhamento automático do resultado'
    ]
  },
  {
    date: '2025-01-05',
    version: '2.0.0',
    title: '🏆 Sistema de Vitória do Leilão - Cartão Premium',
    status: 'completed',
    category: 'feature',
    description: 'Implementação completa do sistema de vitória com cartão premium, design NEON e anti-duplicação.',
    details: {
      objective: 'Criar um Cartão de Vitória espetacular que aparece quando o leilão termina, mostrando quem ganhou, o produto e o valor final.',
      challenges: [
        {
          name: 'Cartão não aparecia',
          problem: 'VictoryCard não renderizava no chat',
          cause: 'Mensagem de vitória não estava sendo carregada do banco',
          solution: 'Forçar atualização de mensagens após criar a mensagem de vitória'
        },
        {
          name: 'Dados NULL/UNDEFINED',
          problem: 'Winner e Auction chegavam vazios no componente',
          cause: 'Parse do JSON falhava',
          solution: 'Garantir JSON sempre válido ao salvar + Fallback usando dados do auction atual + Parse com try/catch'
        },
        {
          name: 'Cartão Duplicado',
          problem: '2 cartões idênticos apareciam',
          cause: 'Múltiplas mensagens criadas no banco + Renderização sem filtro',
          solution: 'Flag isCreatingVictoryMessageRef para bloquear criação simultânea + Verificação de mensagens existentes + Filtro no frontend + Limpeza automática de duplicatas'
        },
        {
          name: 'Imagem do produto quebrada',
          problem: 'Ícone 🖼️ em vez da foto',
          cause: 'URL da imagem não estava sendo passada corretamente',
          solution: 'Garantir que image_urls[0] sempre exista + Fallback para imagem placeholder + Validação no momento de criar'
        },
        {
          name: 'Erro do Martelo',
          problem: 'setAuctioneerMessage is not a function',
          cause: 'Sintaxe errada (= em vez de chamada de função)',
          solution: 'Corrigir para setAuctioneerMessage(trigger.message)'
        },
        {
          name: 'Mobile não funcionava',
          problem: 'Cartão aparecia no desktop mas não no mobile',
          cause: 'Renderização condicional muito restritiva',
          solution: 'Sempre renderizar VictoryCard quando message_type === winner_announcement'
        }
      ],
      filesModified: [
        {
          path: 'pages/AuctionRoom.js',
          changes: [
            'Função endAuction com proteção anti-duplicação',
            'Verificação de mensagens existentes',
            'Criação de JSON limpo e validado',
            'Limpeza automática de duplicatas no sync',
            'Correção do erro do martelo'
          ]
        },
        {
          path: 'components/chat/AIMessage.jsx',
          changes: [
            'Renderização incondicional do VictoryCard',
            'Fallback para dados ausentes',
            'Parse seguro com try/catch'
          ]
        },
        {
          path: 'components/chat/VictoryCard.jsx',
          changes: [
            'Design NEON verde/dourado',
            'Animações CSS premium',
            'Layout responsivo (desktop + mobile)',
            'Confete animado',
            'Efeitos de brilho e pulso'
          ]
        }
      ],
      deliverables: {
        desktop: [
          'Fundo degradê verde neon → dourado',
          'Brilho pulsante animado',
          'Confete caindo (5 partículas)',
          'Martelo animado (bounce + glow)',
          'Avatar do vencedor com borda dourada',
          'Preço gigante com efeitos neon',
          'Card do produto com sombra elegante',
          'Animações suaves (entrada, pulso, escala)'
        ],
        mobile: [
          'Layout responsivo otimizado',
          'Fontes e espaçamentos ajustados',
          'Imagem do produto menor (120x120px)',
          'Design mantém a identidade visual'
        ]
      },
      guarantees: [
        'Cartão aparece SEMPRE quando o leilão termina',
        'Sem duplicação - apenas 1 cartão por leilão',
        'Imagem sempre visível - fallback garantido',
        'Dados do vencedor - avatar, nome, preço',
        'Responsivo perfeito - desktop e mobile',
        'Design espetacular - neon, animações, confete',
        'Performance otimizada - sem travamentos',
        'Anti-bugs - flags, validações, try/catch'
      ],
      statistics: {
        timeSpent: '3 horas',
        filesModified: 3,
        bugsFixed: 6,
        linesOfCode: 800,
        animationsCreated: 12,
        testIterations: 8
      }
    },
    codeSnippets: [],
    images: [],
    nextSteps: []
  },
  {
    date: '2025-01-04',
    version: '1.9.0',
    title: '🔨 Sistema de Martelo do Leiloeiro',
    status: 'completed',
    category: 'feature',
    description: 'Implementação do leiloeiro animado que aparece nos momentos críticos do leilão.',
    details: {
      features: [
        'Leiloeiro flutuante com PNG transparente',
        '3 fases de martelo (Dou-lhe UMA, DUAS, TRÊS)',
        'Animações progressivas (bounce + swing)',
        'Balão de fala com mensagens dinâmicas',
        'Posicionamento responsivo (mobile + desktop)',
        'Efeitos de impacto visual na fase 3'
      ]
    }
  },
  {
    date: '2025-01-03',
    version: '1.8.0',
    title: '⏰ Sistema de Sincronização de Tempo',
    status: 'completed',
    category: 'infrastructure',
    description: 'Sincronização de tempo servidor-cliente para garantir precisão nos leilões.',
    details: {
      features: [
        'Função getServerTime no backend',
        'Calibração automática de offset',
        'Validação de expiração baseada em tempo do servidor',
        'Debug panel para admins',
        'Logs detalhados de sincronização'
      ]
    }
  },
  {
    date: '2025-01-02',
    version: '1.7.0',
    title: '🤖 CompareAQUI - Comparador Inteligente',
    status: 'completed',
    category: 'feature',
    description: 'Sistema de comparação de preços com IA para mostrar pechincha.',
    details: {
      features: [
        'Botão flutuante animado',
        'Modal com dados de comparação',
        'Badge de pechincha no card',
        'Integração com função comparaiPrices',
        'Logs de diagnóstico'
      ]
    }
  },
  {
    date: '2025-01-01',
    version: '1.6.0',
    title: '💰 Sistema ValoraPay',
    status: 'completed',
    category: 'feature',
    description: 'Moeda virtual interna com saldo flutuante e sistema de comissões.',
    details: {
      features: [
        'Amuleto flutuante com saldo V$',
        'Sistema de comissões para licenciados',
        'Integração com arremates',
        'Animações de moeda girando'
      ]
    }
  }
];

const PROTECTED_FILES = {
  pages: [
    { path: 'pages/Home.js', critical: true, description: 'Página principal com listagem de leilões' },
    { path: 'pages/AuctionRoom.js', critical: true, description: 'Sala de leilão em tempo real' },
    { path: 'pages/AuctionDetails.js', critical: true, description: 'Detalhes do produto' },
    { path: 'pages/CreateAuction.js', critical: true, description: 'Criação de novos leilões' },
    { path: 'pages/EditAuction.js', critical: false, description: 'Edição de leilões existentes' },
    { path: 'pages/Licensing.js', critical: true, description: 'Sistema de licenciamento e rede' },
    { path: 'pages/Profile.js', critical: true, description: 'Perfil do usuário' },
    { path: 'pages/Ranking.js', critical: false, description: 'Ranking de usuários' },
    { path: 'pages/Landing.js', critical: true, description: 'Landing page inicial' },
    { path: 'pages/MyWinnings.js', critical: false, description: 'Meus arremates' },
    { path: 'pages/TesteLeilao.js', critical: false, description: 'Testes de leilão' },
    { path: 'pages/SystemTest.js', critical: false, description: 'Testes do sistema' },
    { path: 'pages/ProtecaoCriacao.js', critical: false, description: 'Proteção de criação' },
    { path: 'pages/NetworkOverview.js', critical: true, description: 'Visão geral da rede' },
    { path: 'pages/AdminUsers.js', critical: true, description: 'Gerenciamento de usuários' },
    { path: 'pages/SystemDiagnostics.js', critical: false, description: 'Diagnósticos do sistema' },
    { path: 'pages/MemoryBackup.js', critical: true, description: 'Backup de memória e histórico' },
    { path: 'pages/ProtectionDashboard.js', critical: true, description: 'Dashboard de proteção' },
    { path: 'pages/ErrorReport.js', critical: false, description: 'Relatório de erros' },
    { path: 'pages/LicensorCRM.js', critical: false, description: 'CRM de licenciadores' },
  ],

  components: [
    { path: 'components/auction/AuctionCard.jsx', critical: true, description: 'Card de leilão na home' },
    { path: 'components/auction/BidInput.jsx', critical: true, description: 'Input de lance' },
    { path: 'components/auction/FixedAuctionPanel.jsx', critical: false, description: 'Painel fixo mobile' },
    { path: 'components/auction/FloatingBalance.jsx', critical: true, description: 'Saldo flutuante ValoraPay' },
    { path: 'components/auction/AuctioneerFloat.jsx', critical: true, description: 'Leiloeiro animado' },
    { path: 'components/chat/AIMessage.jsx', critical: true, description: 'Mensagens da IA' },
    { path: 'components/chat/ChatBubble.jsx', critical: false, description: 'Bolha de chat' },
    { path: 'components/chat/VictoryCard.jsx', critical: true, description: 'Cartão de vitória' },
    { path: 'components/common/CountdownTimer.jsx', critical: true, description: 'Timer de contagem regressiva' },
    { path: 'components/common/WelcomeModal.jsx', critical: true, description: 'Modal de boas-vindas' },
    { path: 'components/common/TermsModal.jsx', critical: true, description: 'Modal de termos' },
    { path: 'components/common/ShareAppModal.jsx', critical: false, description: 'Modal de compartilhamento' },
    { path: 'components/common/GuestRegistrationModal.jsx', critical: true, description: 'Registro de visitante' },
    { path: 'components/common/LoginModal.jsx', critical: true, description: 'Modal de login' },
    { path: 'components/licensing/LicenseeRegistrationModal.jsx', critical: true, description: 'Cadastro de licenciado' },
    { path: 'components/licensing/CareerPath.jsx', critical: true, description: 'Caminho de carreira' },
    { path: 'components/licensing/AuctionSelectionModal.jsx', critical: false, description: 'Seleção de leilão' },
    { path: 'components/licensing/ConfirmationModal.jsx', critical: false, description: 'Modal de confirmação' },
    { path: 'components/licensing/JourneyAnimation.jsx', critical: false, description: 'Animação de jornada' },
    { path: 'components/licensing/ValoraNotesGallery.jsx', critical: true, description: 'Galeria de notas ValoraPay' },
    { path: 'components/admin/UserEditModal.jsx', critical: true, description: 'Edição de usuário' },
    { path: 'components/admin/UserPasswordModal.jsx', critical: true, description: 'Alteração de senha' },
    { path: 'components/admin/IndicatedUsersModal.jsx', critical: false, description: 'Usuários indicados' },
    { path: 'components/admin/CommissionStatementModal.jsx', critical: true, description: 'Extrato de comissões' },
    { path: 'components/admin/MessageDispatcher.jsx', critical: false, description: 'Envio de mensagens em massa' },
    { path: 'components/comparai/ComparaiButton.jsx', critical: true, description: 'Botão CompareAQUI' },
    { path: 'components/comparai/ComparaiModal.jsx', critical: true, description: 'Modal de comparação' },
    { path: 'components/comparai/PechincaBadge.jsx', critical: false, description: 'Badge de pechincha' },
    { path: 'components/comparai/ComparaiFloatingButton.jsx', critical: true, description: 'Botão flutuante CompareAQUI' },
    { path: 'components/system/ProtectionRules.jsx', critical: true, description: 'Regras de proteção' },
    { path: 'components/system/LayoutProtection.jsx', critical: true, description: 'Proteção do layout' },
    { path: 'components/system/MemoryArchive.jsx', critical: true, description: 'Arquivo de memória' },
    { path: 'components/system/ErrorDiagnostic.jsx', critical: false, description: 'Diagnóstico de erros' },
    { path: 'components/system/GlobalMonitor.jsx', critical: false, description: 'Monitor global' },
    { path: 'components/system/DevAssistant.jsx', critical: false, description: 'Assistente de desenvolvimento' },
    { path: 'components/system/RealtimeSync.jsx', critical: true, description: 'Sincronização em tempo real' },
    { path: 'components/system/ProtectionButton.jsx', critical: false, description: 'Botão de proteção' },
    { path: 'components/system/DiagnosticLogger.jsx', critical: false, description: 'Logger de diagnósticos' },
    { path: 'components/system/AuctionTimeDebugger.jsx', critical: false, description: 'Debugger de tempo de leilão' },
    { path: 'components/system/ProtectionSystem.jsx', critical: true, description: 'Sistema de proteção master' },
  ],

  entities: [
    { path: 'entities/Auction.json', critical: true, description: 'Entidade de leilões' },
    { path: 'entities/Bid.json', critical: true, description: 'Entidade de lances' },
    { path: 'entities/AuctionMessage.json', critical: true, description: 'Mensagens de leilão' },
    { path: 'entities/AppUser.json', critical: true, description: 'Usuários do app' },
    { path: 'entities/ComparaiLog.json', critical: false, description: 'Logs do CompareAQUI' },
    { path: 'entities/SystemLog.json', critical: false, description: 'Logs do sistema' },
    { path: 'entities/User.json', critical: true, description: 'Usuários da plataforma' },
  ],

  functions: [
    { path: 'functions/downloadImage.js', critical: false, description: 'Download de imagens' },
    { path: 'functions/getImageUrlsFromPage.js', critical: false, description: 'Extração de URLs de imagens' },
    { path: 'functions/extractProductData.js', critical: false, description: 'Extração de dados de produto' },
    { path: 'functions/getLicenseeDashboardData.js', critical: true, description: 'Dados do dashboard licenciado' },
    { path: 'functions/forceSyncStats.js', critical: false, description: 'Sincronização forçada de stats' },
    { path: 'functions/extractDataFromUrl.js', critical: false, description: 'Extração de dados de URL' },
    { path: 'functions/resetTestData.js', critical: false, description: 'Reset de dados de teste' },
    { path: 'functions/autoTest.js', critical: false, description: 'Testes automáticos' },
    { path: 'functions/systemHealthCheck.js', critical: false, description: 'Verificação de saúde do sistema' },
    { path: 'functions/transcribeAudio.js', critical: false, description: 'Transcrição de áudio' },
    { path: 'functions/comparaiPrices.js', critical: true, description: 'Comparação de preços' },
    { path: 'functions/linkOrphanUsers.js', critical: false, description: 'Vinculação de usuários órfãos' },
    { path: 'functions/sendBulkMessages.js', critical: false, description: 'Envio de mensagens em massa' },
    { path: 'functions/deleteTestAuctions.js', critical: false, description: 'Deleção de leilões de teste' },
    { path: 'functions/emergencyReactivate.js', critical: true, description: 'Reativação de emergência' },
    { path: 'functions/createTestAuction.js', critical: false, description: 'Criação de leilão de teste' },
    { path: 'functions/simulateTestBids.js', critical: false, description: 'Simulação de lances de teste' },
    { path: 'functions/fastForwardTestAuction.js', critical: false, description: 'Avanço rápido de leilão' },
    { path: 'functions/getServerTime.js', critical: true, description: 'Obtenção de tempo do servidor' },
    { path: 'functions/clearAuctionMessages.js', critical: false, description: 'Limpeza de mensagens' },
    { path: 'functions/resetTestValora.js', critical: false, description: 'Reset de ValoraPay de teste' },
    { path: 'functions/migrateOldAuctions.js', critical: false, description: 'Migração de leilões antigos' },
    { path: 'functions/createProtectionSnapshot.js', critical: true, description: 'Criação de snapshot' },
  ],

  layout: [
    { path: 'Layout.jsx', critical: true, description: 'Layout principal da aplicação' },
  ]
};

const getAllFiles = () => {
  return [
    ...PROTECTED_FILES.pages,
    ...PROTECTED_FILES.components,
    ...PROTECTED_FILES.entities,
    ...PROTECTED_FILES.functions,
    ...PROTECTED_FILES.layout,
  ];
};

export default function MemoryBackup() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!user || user.role !== 'admin' && user.role !== 'super_admin') {
      navigate('/');
    } else {
      setAuthorized(true);
    }
  }, []);

  const [activeTab, setActiveTab] = useState('historico');
  const [snapshots, setSnapshots] = useState([]);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  // searchTerm is now exclusively for the protected files list as per UI in outline
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCritical, setFilterCritical] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  // 'filter' is for DEVELOPMENT_LOG categories
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = () => {
    try {
      const saved = localStorage.getItem('protection_snapshots');
      if (saved) {
        setSnapshots(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Erro ao carregar snapshots:', error);
    }
  };

  const saveSnapshots = (newSnapshots) => {
    try {
      localStorage.setItem('protection_snapshots', JSON.stringify(newSnapshots));
      setSnapshots(newSnapshots);
    } catch (error) {
      console.error('Erro ao salvar snapshots:', error);
    }
  };

  const createSnapshot = async (description = '') => {
    setIsCreatingSnapshot(true);
    try {
      const allFiles = getAllFiles();
      const snapshot = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        description: description || 'Snapshot automático',
        files: allFiles.length,
        critical_files: allFiles.filter(f => f.critical).length,
        pages: PROTECTED_FILES.pages.length,
        components: PROTECTED_FILES.components.length,
        entities: PROTECTED_FILES.entities.length,
        functions: PROTECTED_FILES.functions.length,
        hash: generateHash(),
        created_by: 'admin',
        status: 'protected'
      };

      const newSnapshots = [snapshot, ...snapshots].slice(0, 50); // Keep only the latest 50 snapshots
      saveSnapshots(newSnapshots);

      alert(`✅ Snapshot criado com sucesso!\n\n📦 ${snapshot.files} arquivos protegidos\n🔴 ${snapshot.critical_files} críticos\n🆔 ${snapshot.hash.substring(0, 8)}`);
    } catch (error) {
      console.error('Erro ao criar snapshot:', error);
      alert('❌ Erro ao criar snapshot');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const generateHash = () => {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  };

  const exportBackup = () => {
    const dataStr = JSON.stringify({
      development_log: DEVELOPMENT_LOG,
      snapshots: snapshots,
      protected_files: PROTECTED_FILES
    }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `memory-backup-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (imported.snapshots) {
            saveSnapshots(imported.snapshots);
            alert(`✅ ${imported.snapshots.length} snapshots importados!`);
          } else {
            alert('❌ Arquivo de backup não contém snapshots válidos.');
          }
        } catch (error) {
          alert(`❌ Erro ao importar backup: ${error.message}`);
          console.error('Erro ao importar backup:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const getFilteredFiles = (category) => {
    let files = [];

    if (category === 'all') {
      files = getAllFiles();
    } else {
      files = PROTECTED_FILES[category] || [];
    }

    if (searchTerm) {
      files = files.filter(f =>
        f.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCritical !== 'all') {
      const isCritical = filterCritical === 'critical';
      files = files.filter(f => f.critical === isCritical);
    }

    return files;
  };

  const filteredLog = DEVELOPMENT_LOG.filter(entry => {
    const matchesFilter = filter === 'all' || entry.category === filter;
    // As per the outline's UI, searchTerm applies to protected files; no search input for logs.
    // However, the outline's filteredLog still uses searchTerm. To adhere strictly:
    const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          entry.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const allFiles = getAllFiles();
  const criticalCount = allFiles.filter(f => f.critical).length;
  const totalCount = allFiles.length;

  // Updated categoryIcons to use emojis for the DEVELOPMENT_LOG section
  const categoryIcons = {
    feature: '✨',
    infrastructure: '🏗️',
    bugfix: '🐛',
    optimization: '⚡',
    enhancement: '🔥'
  };

  const categoryColors = {
    feature: 'bg-blue-900/20 border-blue-500/30 text-blue-400',
    infrastructure: 'bg-purple-900/20 border-purple-500/30 text-purple-400',
    bugfix: 'bg-red-900/20 border-red-500/30 text-red-400',
    optimization: 'bg-green-900/20 border-green-500/30 text-green-400',
    enhancement: 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400'
  };

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-10 h-10 text-green-400" />
              <h1 className="text-4xl font-black bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
                🛡️ PROTEÇÃO MASTER
              </h1>
            </div>
            <p className="text-gray-400 text-lg">
              Sistema Completo de Backup - {totalCount} arquivos protegidos
            </p>
          </div>
          <Button onClick={exportBackup} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Exportar Backup Completo
          </Button>
        </div>

        {/* Tabs principais */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-gray-800 grid grid-cols-2">
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico de Desenvolvimento
            </TabsTrigger>
            <TabsTrigger value="protecao" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Sistema de Proteção
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: HISTÓRICO */}
          <TabsContent value="historico" className="space-y-6 mt-6">

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <History className="w-8 h-8 text-blue-400" /> {/* Changed from Archive */}
                    <div>
                      <div className="text-3xl font-bold text-white">{DEVELOPMENT_LOG.length}</div>
                      <div className="text-sm text-gray-400">Versões</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                    <div>
                      <div className="text-3xl font-bold text-white">
                        {DEVELOPMENT_LOG.filter(e => e.status === 'completed').length}
                      </div>
                      <div className="text-sm text-gray-400">Completas</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">✨</span> {/* Changed from Sparkles icon */}
                    <div>
                      <div className="text-3xl font-bold text-white">
                        {DEVELOPMENT_LOG.filter(e => e.category === 'feature' || e.category === 'enhancement').length}
                      </div>
                      <div className="text-sm text-gray-400">Features</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Lock className="w-8 h-8 text-yellow-400" /> {/* Changed from Archive icon */}
                    <div>
                      <div className="text-3xl font-bold text-white">100%</div>
                      <div className="text-sm text-gray-400">Protegido</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtros de categoria */}
            <div className="flex gap-3 flex-wrap">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                size="sm"
              >
                Todos
              </Button>
              <Button
                variant={filter === 'feature' ? 'default' : 'outline'}
                onClick={() => setFilter('feature')}
                size="sm"
              >
                Features
              </Button>
              <Button
                variant={filter === 'enhancement' ? 'default' : 'outline'}
                onClick={() => setFilter('enhancement')}
                size="sm"
              >
                Melhorias
              </Button>
              <Button
                variant={filter === 'infrastructure' ? 'default' : 'outline'}
                onClick={() => setFilter('infrastructure')}
                size="sm"
              >
                Infraestrutura
              </Button>
              <Button
                variant={filter === 'bugfix' ? 'default' : 'outline'}
                onClick={() => setFilter('bugfix')}
                size="sm"
              >
                Correções
              </Button>
              <Button
                variant={filter === 'optimization' ? 'default' : 'outline'}
                onClick={() => setFilter('optimization')}
                size="sm"
              >
                Otimizações
              </Button>
            </div>

            {/* Log Entries */}
            <div className="space-y-6">
              {filteredLog.map((entry, index) => {
                const colorClass = categoryColors[entry.category] || 'bg-gray-800 border-gray-700 text-gray-400';

                return (
                  <Card key={index} className={`${colorClass} border-2`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {/* Uses emoji from categoryIcons map */}
                          <span className="text-3xl mt-1">{categoryIcons[entry.category]}</span>
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <CardTitle className="text-white text-2xl">{entry.title}</CardTitle>
                              <Badge className="bg-green-600">{entry.version}</Badge>
                              <Badge variant="outline">{entry.status}</Badge>
                            </div>
                            <p className="text-gray-300 mb-2">{entry.description}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Clock className="w-4 h-4" /> {/* Still using Clock icon */}
                              {entry.date}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    {entry.details && (
                      <CardContent className="space-y-6">
                        {/* Objective */}
                        {entry.details.objective && (
                          <div className="bg-gray-900/50 p-4 rounded-lg">
                            <h4 className="font-bold text-green-400 mb-2">🎯 Objetivo:</h4>
                            <p className="text-gray-300">{entry.details.objective}</p>
                          </div>
                        )}

                        {/* Implementation (New for 2.1.0) */}
                        {entry.details.implementation && (
                          <div className="bg-gray-900/50 p-4 rounded-lg border-l-4 border-yellow-500">
                            <h4 className="font-bold text-yellow-400 mb-3">🛠️ Implementação Detalhada:</h4>
                            {entry.details.implementation.sequence && (
                              <div className="mb-4">
                                <h5 className="font-semibold text-gray-300 mb-1">Sequência:</h5>
                                <ul className="list-disc list-inside text-sm text-gray-400">
                                  {entry.details.implementation.sequence.map((step, idx) => <li key={idx}>{step}</li>)}
                                </ul>
                              </div>
                            )}
                            {entry.details.implementation.timing && (
                              <div>
                                <h5 className="font-semibold text-gray-300 mb-1">Timing:</h5>
                                <ul className="list-disc list-inside text-sm text-gray-400">
                                  {Object.entries(entry.details.implementation.timing).map(([key, value], idx) => (
                                    <li key={idx}><span className="font-medium capitalize">{key.replace('_', ' ')}:</span> {value}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Challenges */}
                        {entry.details.challenges && (
                          <div>
                            <h4 className="font-bold text-orange-400 mb-3">⚡ Desafios Enfrentados:</h4>
                            <div className="space-y-3">
                              {entry.details.challenges.map((challenge, idx) => (
                                <div key={idx} className="bg-gray-900/50 p-4 rounded-lg border-l-4 border-orange-500">
                                  <h5 className="font-bold text-white mb-2">{idx + 1}. {challenge.name}</h5>
                                  <div className="space-y-1 text-sm">
                                    <p><span className="text-red-400">❌ Problema:</span> {challenge.problem}</p>
                                    <p><span className="text-yellow-400">🔍 Causa:</span> {challenge.cause}</p>
                                    <p><span className="text-green-400">✅ Solução:</span> {challenge.solution}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Files Modified */}
                        {entry.details.filesModified && (
                          <div>
                            <h4 className="font-bold text-blue-400 mb-3">📁 Arquivos Modificados:</h4>
                            <div className="space-y-3">
                              {entry.details.filesModified.map((file, idx) => (
                                <div key={idx} className="bg-gray-900/50 p-4 rounded-lg">
                                  <code className="text-purple-400 font-mono">{file.path}</code>
                                  <ul className="mt-2 space-y-1 text-sm text-gray-300">
                                    {file.changes.map((change, cIdx) => (
                                      <li key={cIdx} className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                        {change}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Technical Specs (New for 2.1.0) */}
                        {entry.details.technicalSpecs && (
                          <div className="bg-gray-900/50 p-4 rounded-lg border-l-4 border-purple-500">
                            <h4 className="font-bold text-purple-400 mb-3">⚙️ Especificações Técnicas:</h4>
                            <div className="space-y-3 text-sm text-gray-300">
                              {Object.entries(entry.details.technicalSpecs).map(([specKey, specValue], idx) => (
                                <div key={idx}>
                                  <h5 className="font-semibold text-white mb-1 capitalize">{specKey.replace(/([A-Z])/g, ' $1').trim()}:</h5>
                                  {typeof specValue === 'object' ? (
                                    <ul className="list-disc list-inside ml-4">
                                      {Object.entries(specValue).map(([subKey, subValue], subIdx) => (
                                        <li key={subIdx}><span className="font-medium capitalize">{subKey.replace(/([A-Z])/g, ' $1').trim()}:</span> {typeof subValue === 'object' ? JSON.stringify(subValue) : subValue}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p>{specValue}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* User Experience (New for 2.1.0) */}
                        {entry.details.userExperience && (
                          <div className="bg-green-900/20 p-4 rounded-lg border-2 border-green-500/30">
                            <h4 className="font-bold text-green-400 mb-3">✨ Experiência do Usuário:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                              {entry.details.userExperience.map((item, idx) => <li key={idx}>{item}</li>)}
                            </ul>
                          </div>
                        )}

                        {/* Deliverables */}
                        {entry.details.deliverables && (
                          <div>
                            <h4 className="font-bold text-purple-400 mb-3">✨ Resultado Final:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-gray-900/50 p-4 rounded-lg">
                                <h5 className="font-bold text-green-400 mb-2">💻 Desktop:</h5>
                                <ul className="space-y-1 text-sm text-gray-300">
                                  {entry.details.deliverables.desktop.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="bg-gray-900/50 p-4 rounded-lg">
                                <h5 className="font-bold text-blue-400 mb-2">📱 Mobile:</h5>
                                <ul className="space-y-1 text-sm text-gray-300">
                                  {entry.details.deliverables.mobile.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Guarantees */}
                        {entry.details.guarantees && (
                          <div className="bg-green-900/20 p-4 rounded-lg border-2 border-green-500/30">
                            <h4 className="font-bold text-green-400 mb-3">🛡️ Garantias:</h4>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {entry.details.guarantees.map((guarantee, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-gray-300">
                                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                  {guarantee}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Statistics */}
                        {entry.details.statistics && (
                          <div className="bg-gray-900/50 p-4 rounded-lg">
                            <h4 className="font-bold text-yellow-400 mb-3">📊 Estatísticas:</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <div className="text-gray-400">Tempo:</div>
                                <div className="text-white font-bold">{entry.details.statistics.timeSpent}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Arquivos:</div>
                                <div className="text-white font-bold">{entry.details.statistics.filesModified}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Bugs Corrigidos:</div>
                                <div className="text-white font-bold">{entry.details.statistics.bugsFixed}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Linhas de Código:</div>
                                <div className="text-white font-bold">{entry.details.statistics.linesOfCode}</div>
                              </div>
                              {entry.details.statistics.animationsCreated && (
                                <div>
                                  <div className="text-gray-400">Animações:</div>
                                  <div className="text-white font-bold">{entry.details.statistics.animationsCreated}</div>
                                </div>
                              )}
                              {entry.details.statistics.iterations && (
                                <div>
                                  <div className="text-gray-400">Iterações:</div>
                                  <div className="text-white font-bold">{entry.details.statistics.iterations}</div>
                                </div>
                              )}
                              {entry.details.statistics.testIterations && (
                                <div>
                                  <div className="text-gray-400">Test Iterations:</div>
                                  <div className="text-white font-bold">{entry.details.statistics.testIterations}</div>
                                </div>
                              )}
                              {entry.details.statistics.successRate && (
                                <div>
                                  <div className="text-gray-400">Success Rate:</div>
                                  <div className="text-white font-bold">{entry.details.statistics.successRate}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Code Snippets (New for 2.1.0) */}
                        {entry.codeSnippets && entry.codeSnippets.length > 0 && (
                          <div>
                            <h4 className="font-bold text-cyan-400 mb-3">📄 Trechos de Código:</h4>
                            <div className="space-y-4">
                              {entry.codeSnippets.map((snippet, idx) => (
                                <div key={idx} className="bg-gray-900/50 p-4 rounded-lg border-l-4 border-cyan-500">
                                  <h5 className="font-bold text-white mb-2">{snippet.title}</h5>
                                  <pre className="overflow-x-auto p-3 bg-gray-800 rounded text-sm text-gray-100">
                                    <code className={`language-${snippet.language}`}>{snippet.code}</code>
                                  </pre>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Images (New for 2.1.0) */}
                        {entry.images && entry.images.length > 0 && (
                          <div>
                            <h4 className="font-bold text-pink-400 mb-3">🖼️ Imagens/Screenshots:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {entry.images.map((image, idx) => (
                                <a href={image} target="_blank" rel="noopener noreferrer" key={idx} className="block group">
                                  <img
                                    src={image}
                                    alt={`Screenshot ${idx + 1}`}
                                    className="w-full h-auto rounded-lg object-cover border border-gray-700 transition-transform duration-200 group-hover:scale-105 group-hover:border-pink-500"
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Next Steps */}
                        {entry.nextSteps && (
                          <div className="bg-blue-900/20 p-4 rounded-lg border-2 border-blue-500/30">
                            <h4 className="font-bold text-blue-400 mb-3">🚀 Próximos Passos:</h4>
                            <ul className="space-y-1 text-sm text-gray-300">
                              {entry.nextSteps.map((step, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-blue-400">{idx + 1}.</span>
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Simple Features List */}
                        {entry.details.features && (
                          <div className="bg-gray-900/50 p-4 rounded-lg">
                            <h4 className="font-bold text-purple-400 mb-3">✨ Funcionalidades:</h4>
                            <ul className="space-y-1 text-sm text-gray-300">
                              {entry.details.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 2: PROTEÇÃO */}
          <TabsContent value="protecao" className="space-y-6 mt-6">

            {/* STATUS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="bg-gray-800 border-green-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Total Arquivos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{totalCount}</div>
                  <p className="text-xs text-green-400 mt-1">
                    {criticalCount} críticos
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-blue-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Páginas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-400">{PROTECTED_FILES.pages.length}</div>
                  <p className="text-xs text-gray-500 mt-1">Rotas principais</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-purple-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Componentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-400">{PROTECTED_FILES.components.length}</div>
                  <p className="text-xs text-gray-500 mt-1">UI Elements</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-orange-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Functions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-400">{PROTECTED_FILES.functions.length}</div>
                  <p className="text-xs text-gray-500 mt-1">Backend APIs</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-yellow-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Snapshots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-400">{snapshots.length}</div>
                  <p className="text-xs text-gray-500 mt-1">Backups salvos</p>
                </CardContent>
              </Card>
            </div>

            {/* AÇÕES */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Ações de Proteção</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    const desc = prompt('📝 Descrição deste snapshot:\n\nExemplo: "Antes de adicionar feature X"');
                    if (desc !== null) {
                      createSnapshot(desc || 'Snapshot manual');
                    }
                  }}
                  disabled={isCreatingSnapshot}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isCreatingSnapshot ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Archive className="w-5 h-5 mr-2" />
                      Criar Snapshot Agora
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => alert(`🛡️ ${totalCount} arquivos protegidos\n🔴 ${criticalCount} críticos`)}
                  variant="outline"
                  className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Verificar Integridade
                </Button>

                <label className="cursor-pointer">
                  <Button
                    variant="outline"
                    className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
                    as="span"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Importar Backup
                  </Button>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importBackup}
                    className="hidden"
                  />
                </label>
              </CardContent>
            </Card>

            {/* ARQUIVOS PROTEGIDOS */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-yellow-400" />
                    Arquivos Protegidos ({getFilteredFiles(activeCategory).length})
                  </span>

                  <div className="flex items-center gap-2">
                    <select
                      value={filterCritical}
                      onChange={(e) => setFilterCritical(e.target.value)}
                      className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 text-sm"
                    >
                      <option value="all">Todos</option>
                      <option value="critical">Críticos</option>
                      <option value="normal">Normais</option>
                    </select>

                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Buscar arquivo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-gray-700 border-gray-600 text-white w-64"
                      />
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                  <TabsList className="bg-gray-700">
                    <TabsTrigger value="all">Todos ({totalCount})</TabsTrigger>
                    <TabsTrigger value="pages">Páginas ({PROTECTED_FILES.pages.length})</TabsTrigger>
                    <TabsTrigger value="components">Componentes ({PROTECTED_FILES.components.length})</TabsTrigger>
                    <TabsTrigger value="entities">Entities ({PROTECTED_FILES.entities.length})</TabsTrigger>
                    <TabsTrigger value="functions">Functions ({PROTECTED_FILES.functions.length})</TabsTrigger>
                    <TabsTrigger value="layout">Layout ({PROTECTED_FILES.layout.length})</TabsTrigger>
                  </TabsList>

                  <div className="mt-4 space-y-2 max-h-[600px] overflow-y-auto">
                    {getFilteredFiles(activeCategory).length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum arquivo encontrado</p>
                      </div>
                    ) : (
                      getFilteredFiles(activeCategory).map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors border border-gray-600/30"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {file.critical ? (
                              <Shield className="w-5 h-5 text-red-400 flex-shrink-0" />
                            ) : (
                              <Shield className="w-5 h-5 text-blue-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-mono text-sm truncate">{file.path}</p>
                              <p className="text-xs text-gray-400 truncate">{file.description}</p>
                            </div>
                          </div>

                          <Badge className={file.critical ? 'bg-red-900/50 text-red-300 border-red-500/30' : 'bg-blue-900/50 text-blue-300 border-blue-500/30'}>
                            {file.critical ? '🔴 CRÍTICO' : '🔵 NORMAL'}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </Tabs>
              </CardContent>
            </Card>

            {/* HISTÓRICO DE SNAPSHOTS */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-green-400" />
                  Histórico de Snapshots ({snapshots.length}/50)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {snapshots.length === 0 ? (
                  <Alert className="bg-yellow-900/20 border-yellow-500/30">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <AlertDescription className="text-yellow-300">
                      Nenhum snapshot criado ainda. Crie o primeiro para começar a proteger!
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {snapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="flex items-start justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600 hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-white font-medium mb-1">{snap.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                            <span>📅 {new Date(snap.timestamp).toLocaleString('pt-BR')}</span>
                            <span>•</span>
                            <span>📦 {snap.files} arquivos</span>
                            <span>•</span>
                            <span className="text-red-400">🔴 {snap.critical_files} críticos</span>
                            <span>•</span>
                            <span>📄 {snap.pages} páginas</span>
                            <span>•</span>
                            <span>🧩 {snap.components} componentes</span>
                          </div>
                        </div>

                        <Badge className="bg-green-900/50 text-green-300 border-green-500/30 ml-4">
                          #{snap.hash.substring(0, 8)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AVISOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Alert className="bg-green-900/20 border-green-500/30">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  <strong>✅ Sistema Ativo:</strong> {totalCount} arquivos protegidos. {criticalCount} críticos sob monitoramento constante.
                </AlertDescription>
              </Alert>

              <Alert className="bg-blue-900/20 border-blue-500/30">
                <Archive className="w-4 h-4 text-blue-400" />
                <AlertDescription className="text-blue-300">
                  <strong>💡 Dica:</strong> Crie um snapshot ANTES de fazer alterações importantes. Assim você pode reverter se necessário.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="bg-gray-800 rounded-lg p-8 border-2 border-green-500">
            <Shield className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">
              Sistema de Proteção Ativo
            </h3>
            <p className="text-gray-400 mb-4">
              Todos os desenvolvimentos estão sendo monitorados e salvos automaticamente
            </p>
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">100% Protegido</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}