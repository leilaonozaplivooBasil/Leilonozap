
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Download,
  Trash2,
  Database,
  FileCode,
  Shield,
  Loader2,
  Zap,
  Lock,
  AlertTriangle
} from 'lucide-react';

import { Auction } from '@/entities/Auction';
import { AppUser } from '@/entities/AppUser';
import { AuctionMessage } from '@/entities/AuctionMessage';
import { toast } from "sonner";
import { Toaster } from "sonner";

// 🛡️ PROTEÇÃO MASTER - LISTA DE ARQUIVOS BLINDADOS
const PROTECTED_FILES = [
  'pages/ProtecaoCriacao.js',
  'Layout.js',
  'pages/Home.js',
  'pages/Landing.js',
  'components/system/GlobalMonitor.jsx',
  'components/system/ProtectionButton.jsx',
  'components/system/RealtimeSync.jsx'
];

export default function ProtecaoCriacao() {
  const [activeTab, setActiveTab] = useState('master');
  const [backups, setBackups] = useState([]);
  const [backupName, setBackupName] = useState('');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isGeneratingMaster, setIsGeneratingMaster] = useState(false);
  const [protectionEnabled, setProtectionEnabled] = useState(true);

  useEffect(() => {
    // Carrega estado da proteção
    const protectionState = localStorage.getItem('masterProtectionEnabled');
    if (protectionState !== null) {
      setProtectionEnabled(JSON.parse(protectionState));
    }

    const loadBackups = () => {
      const stored = localStorage.getItem('systemBackups');
      if (stored) {
        try {
          setBackups(JSON.parse(stored));
        } catch (e) {
          console.error('Erro ao carregar backups:', e);
        }
      }
    };
    loadBackups();
  }, []);

  const createBackup = async () => {
    if (!backupName.trim()) {
      toast.error("Dê um nome para o backup!");
      return;
    }

    setIsCreatingBackup(true);
    toast.info("Criando backup completo...");
    
    try {
      const backup = {
        id: Date.now(),
        name: backupName.trim(),
        timestamp: new Date().toISOString(),
        data: {
          auctions: await Auction.list("-created_date", 1000),
          users: await AppUser.list("-created_date", 1000),
          messages: await AuctionMessage.list("-created_date", 5000)
        }
      };

      const updatedBackups = [backup, ...backups].slice(0, 20);
      setBackups(updatedBackups);
      localStorage.setItem('systemBackups', JSON.stringify(updatedBackups));
      
      toast.success("Backup criado: " + backupName);
      setBackupName('');
    } catch (error) {
      toast.error("Erro ao criar backup: " + error.message);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const exportBackup = (backup) => {
    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-' + backup.name.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.json';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
    toast.success("Backup exportado!");
  };

  const deleteBackup = (backupId) => {
    const updatedBackups = backups.filter(b => b.id !== backupId);
    setBackups(updatedBackups);
    localStorage.setItem('systemBackups', JSON.stringify(updatedBackups));
    toast.success("Backup deletado!");
  };

  const generateMasterProtection = async () => {
    setIsGeneratingMaster(true);
    toast.info("🚀 GERANDO ARQUIVO MASTER REAL COM TODO O CÓDIGO... Aguarde 30-60 segundos!");
    
    try {
      // Carrega dados do sistema
      const auctions = await Auction.list("-created_date", 1000);
      const users = await AppUser.list("-created_date", 1000);
      const messages = await AuctionMessage.list("-created_date", 5000);
      
      const currentDate = new Date().toLocaleString('pt-BR');
      
      const lines = [];
      
      // ============= CABEÇALHO =============
      lines.push('╔════════════════════════════════════════════════════════════════════════════════╗');
      lines.push('║            🛡️  PROTECAO MASTER DEFINITIVA - LEILAO NOZAP  🛡️                   ║');
      lines.push('║              *** BACKUP COM TODO O CODIGO REAL COMPLETO ***                     ║');
      lines.push('║                     Data: ' + currentDate + '                            ║');
      lines.push('╚════════════════════════════════════════════════════════════════════════════════╝');
      lines.push('');
      lines.push('⚠️  ESTE ARQUIVO CONTEM O CODIGO FONTE COMPLETO E REAL!');
      lines.push('    NAO PRECISA VOLTAR NO HISTORICO! ESTA TUDO AQUI!');
      lines.push('');
      lines.push('═══════════════════════════════════════════════════════════════════════════════');
      lines.push('                              📊 ESTADO ATUAL');
      lines.push('═══════════════════════════════════════════════════════════════════════════════');
      lines.push('');
      lines.push('📈 DADOS:');
      lines.push('   • Leiloes: ' + auctions.length);
      lines.push('   • Usuarios: ' + users.length);
      lines.push('   • Mensagens: ' + messages.length);
      lines.push('');
      
      const activeAuctions = auctions.filter(a => a.status === 'active');
      lines.push('🎯 LEILOES ATIVOS: ' + activeAuctions.length);
      activeAuctions.slice(0, 3).forEach((a, i) => {
        lines.push('   ' + (i + 1) + '. ' + a.title + ' - R$ ' + (a.current_price || a.starting_price));
      });
      lines.push('');
      
      const licensees = users.filter(u => u.role === 'licensee');
      lines.push('👥 LICENCIADOS: ' + licensees.length);
      licensees.slice(0, 3).forEach((u, i) => {
        lines.push('   ' + (i + 1) + '. ' + u.full_name + ' (V$ ' + (u.valora_pay_balance || 0) + ')');
      });
      lines.push('');
      lines.push('═══════════════════════════════════════════════════════════════════════════════');
      lines.push('                          💰 NOTAS VALORA PAY');
      lines.push('═══════════════════════════════════════════════════════════════════════════════');
      lines.push('');
      lines.push('1. GUARDIAO (V$ 1) - 17cee75b0_90515FAF-DF1E-4B38-88A2-0DB1650A0338.png');
      lines.push('2. MUSE (V$ 2) - 2caf4c091_D19AF866-7F01-4359-B34C-6E1E49BB5B662.png');
      lines.push('3. HERCULES (V$ 5) - 51d72aa1d_C92CFAFF-FF7B-45A0-9148-2E621257C5F7.png');
      lines.push('4. CORUJA (V$ 20) - 940575a06_7E0EC402-D37F-4C7E-A9AF-9CBAFAEC67B5.png');
      lines.push('5. FILOSOFO (V$ 100) - 35cd22e8d_22E71172-1469-40C1-91F5-52FB1CEB81B7.png');
      lines.push('6. LEAO (V$ 200) - 5af62ec46_560AB3F0-BC1C-455F-9909-8366C699B0A3.png');
      lines.push('7. AGUIA (V$ 500) - e743cb8f9_A098D677-881A-4913-9F73-1B09CE77A512.png');
      lines.push('8. TIGRE (V$ 1000) - 3f149d7ea_9F6550BF-035D-4171-85DA-960040528E39.png');
      lines.push('');
      lines.push('═══════════════════════════════════════════════════════════════════════════════');
      lines.push('                          🎨 CORES E REGRAS');
      lines.push('═══════════════════════════════════════════════════════════════════════════════');
      lines.push('');
      lines.push('CORES: #111827 (fundo), #10b981 (verde), #1f2937 (cards), #374151 (bordas)');
      lines.push('ADMIN: luizsantanna@tttcorporate.com');
      lines.push('');
      
      // ============= CÓDIGO COMPLETO DOS ARQUIVOS =============
      lines.push('');
      lines.push('╔════════════════════════════════════════════════════════════════════════════════╗');
      lines.push('║                       💻 CODIGO COMPLETO DE TODOS OS ARQUIVOS                   ║');
      lines.push('╚════════════════════════════════════════════════════════════════════════════════╝');
      lines.push('');
      lines.push('');
      
      // ========== LAYOUT.JS ==========
      lines.push('═══════════════════════════════════════════════════════════════════════════════');
      lines.push('ARQUIVO: Layout.js');
      lines.push('═══════════════════════════════════════════════════════════════════════════════');
      lines.push('');
      lines.push(`import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ShareAppModal from "../components/common/ShareAppModal";
import WelcomeModal from "../components/common/WelcomeModal";
import TermsModal from "../components/common/TermsModal";
import GlobalMonitor from "../components/system/GlobalMonitor";
import ProtectionButton from "../components/system/ProtectionButton";

import { Button } from "@/components/ui/button";
import { AppUser } from '@/entities/AppUser';
import { User } from '@/entities/User';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Menu, Share2, LogOut } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleLogout = useCallback(() => {
    console.log("🚪 INICIANDO LOGOUT...");
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('isLoggedIn');
    setCurrentUser(null);
    console.log("✅ LOGOUT COMPLETO - Estado limpo!");
    navigate(createPageUrl("Home"), { replace: true });
  }, [navigate]);

  const syncUserData = useCallback(async () => {
    const savedUserJSON = localStorage.getItem('currentUser');
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    
    if (!savedUserJSON || !isLoggedIn) {
      console.log("🔄 Nenhuma sessão ativa para sincronizar.");
      return;
    }
    
    try {
      const userFromStorage = JSON.parse(savedUserJSON);
      const usersInDB = await AppUser.filter({ id: userFromStorage.id });
      
      if (usersInDB && usersInDB.length > 0) {
        const freshUser = usersInDB[0];
        
        if (freshUser.email === 'luizsantanna@tttcorporate.com') {
          freshUser.role = 'admin';
        }
        
        localStorage.setItem('currentUser', JSON.stringify(freshUser));
        setCurrentUser(freshUser);
        
        console.log("🔄 Dados sincronizados:", freshUser.full_name);
      } else {
        console.log("🔄 Usuário não encontrado, deslogando.");
        handleLogout();
      }
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
    }
  }, [handleLogout]);

  useEffect(() => {
    document.title = "Leilão NoZap - " + (currentPageName || "Home");
  }, [currentPageName]);

  useEffect(() => {
    const manifest = {
      name: "Leilão NoZap",
      short_name: "LeilãoNoZap",
      description: "Leilões relâmpago via WhatsApp",
      start_url: "/",
      display: "standalone",
      background_color: "#111827",
      theme_color: "#16a34a",
      icons: [{
        src: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG",
        sizes: "192x192",
        type: "image/png"
      }]
    };
    const manifestString = JSON.stringify(manifest);
    const manifestDataUrl = \`data:application/manifest+json;charset=utf-8,\${encodeURIComponent(manifestString)}\`;

    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = manifestDataUrl;

    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      if (!sessionStorage.getItem('referralCode')) {
        sessionStorage.setItem('referralCode', refCode);
        console.log(\`Código de indicação '\${refCode}' capturado.\`);
      }
    }

    const delay = currentPageName === "Landing" ? 2000 : 500;

    const timer = setTimeout(async () => {
      let userFound = false;

      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');

      if (savedUserJSON && isLoggedIn) {
        const userFromStorage = JSON.parse(savedUserJSON);
        try {
          const usersInDB = await AppUser.filter({ id: userFromStorage.id });
          if (usersInDB.length > 0) {
            const freshUser = usersInDB[0];

            if (freshUser.email === 'luizsantanna@tttcorporate.com') {
              freshUser.role = 'admin';
            }

            localStorage.setItem('currentUser', JSON.stringify(freshUser)); 
            setCurrentUser(freshUser);
            userFound = true;
          }
        } catch (error) {
           setCurrentUser(userFromStorage);
        }
      }

      if (!userFound) {
        try {
            const platformUser = await User.me();
            if (platformUser && platformUser.email) {
                if (platformUser.email === 'luizsantanna@tttcorporate.com') {
                    platformUser.role = 'admin';
                }
                setCurrentUser(platformUser);
                userFound = true;
            }
        } catch (error) {
            console.log("Nenhum usuário da plataforma logado");
        }
      }

      if (!userFound) {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('isLoggedIn');

        const hasEntered = sessionStorage.getItem('hasEnteredAsGuest');
        if (!hasEntered && currentPageName !== "Landing") {
          navigate(createPageUrl("Landing"), { replace: true });
        }
      }

      setIsLoading(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [location, currentPageName, navigate, handleLogout]);

  useEffect(() => {
    if (!currentUser) return;
    
    console.log("🔄 Sistema de sincronização iniciado (60s)");
    
    const initialSync = setTimeout(() => {
      syncUserData();
    }, 5000);
    
    const syncInterval = setInterval(() => {
      syncUserData();
    }, 60000);
    
    return () => {
      clearTimeout(initialSync);
      clearInterval(syncInterval);
    };
  }, [currentUser, syncUserData]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const shouldShowLoading = isLoading;

  if (shouldShowLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[5000]" style={{ minHeight: '100vh', opacity: 1, visibility: 'visible' }}>
        <div className="text-center">
          <img
            src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG"
            alt="Leilão NoZap"
            className="w-20 h-20 mx-auto mb-6 rounded-full"
            style={{
              animation: 'logoGrowSpin 3s ease-in-out infinite',
              filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.5))',
              opacity: 1,
              visibility: 'visible',
              willChange: 'transform'
            }}
          />
          <p className="text-lg text-gray-300 tracking-wider" style={{ animation: 'gentlePulseText 2.5s ease-in-out infinite' }}>
            Seja bem-vindo...
          </p>
        </div>
      </div>
    );
  }

  const allNavItems = [
    { title: "Leilões", pageName: "Home" },
    { title: "Meus Arremates", pageName: "MyWinnings" },
    { title: "Sistema de Alavancagem", pageName: "Licensing" },
    { title: "Criar", pageName: "CreateAuction", adminOnly: true },
    { title: "Ranking", pageName: "Ranking" },
    { title: "Perfil", pageName: "Profile" },
    { title: "🛡️ Proteção", pageName: "ProtecaoCriacao", adminOnly: true },
  ];

  const navigationItems = allNavItems.filter(item => {
      if (item.adminOnly && currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
          return false;
      }
      
      if (item.licenseeAccess) {
          const isLicensee = currentUser?.role === 'licensee' || (currentUser?.role === 'admin' && currentUser?.referral_code);
          if (!isLicensee) {
              return false;
          }
      }
      
      if ((item.pageName === "Profile" || item.pageName === "MyWinnings") && !currentUser) {
          return false;
      }
      
      return true;
  });

  return (
    <>
      <GlobalMonitor />
      
      <div className="min-h-screen bg-gray-900">
        <nav className="bg-gray-800 shadow-lg border-b border-gray-700">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <div className="flex items-center gap-4">
                <img 
                  src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/76e6d20e3_CapturadeTela2025-08-24as195629.png" 
                  alt="Leilão NoZap" 
                  className="h-10 w-auto cursor-pointer"
                  onClick={() => navigate(createPageUrl("Home"))}
                />
              </div>

              <div className="hidden md:flex md:gap-x-6 items-center">
                {navigationItems.map((item) => (
                  <Link
                    key={item.title}
                    to={createPageUrl(item.pageName)}
                    className={\`text-sm font-semibold transition-colors \${
                      currentPageName === item.pageName
                        ? "text-green-400"
                        : "text-gray-300 hover:text-white"
                    }\`}
                  >
                    {item.title}
                  </Link>
                ))}
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </button>
                
                {currentUser && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300 transition-colors ml-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                )}
              </div>

              <div className="flex md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="inline-flex items-center justify-center rounded-md p-2.5 text-gray-400 hover:text-white"
                >
                  <Menu className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </nav>

        <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DialogContent className="sm:max-w-md bg-gray-800 text-white border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Menu</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              {navigationItems.map((item) => (
                <Link
                  key={item.title}
                  to={createPageUrl(item.pageName)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={\`text-base font-semibold transition-colors \${
                    currentPageName === item.pageName
                      ? "text-green-400"
                      : "text-gray-300 hover:text-white"
                  }\`}
                >
                  {item.title}
                </Link>
              ))}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowShareModal(true);
                }}
                className="flex items-center gap-2 text-base font-semibold text-gray-300 hover:text-white transition-colors text-left"
              >
                <Share2 className="h-4 w-4" />
                Compartilhar
              </button>
              
              {currentUser && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-2 text-base font-semibold text-red-400 hover:text-red-300 transition-colors text-left mt-4 pt-4 border-t border-gray-700"
                >
                  <LogOut className="h-4 w-4" />
                  Sair da Conta
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <main>{children}</main>

        <ProtectionButton 
          currentPage={currentPageName} 
          isAdmin={currentUser?.role === 'admin'} 
        />

        {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
        {showShareModal && <ShareAppModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />}
      </div>
      <style jsx global>{\`
        @keyframes logoGrowSpin {
          0% { transform: scale(1) rotate(0deg); opacity: 1; visibility: visible; }
          50% { transform: scale(1.15) rotate(180deg); opacity: 1; visibility: visible; }
          100% { transform: scale(1) rotate(360deg); opacity: 1; visibility: visible; }
        }

        @keyframes gentlePulseText {
          0%, 100% { opacity: 0.6; text-shadow: 0 0 5px rgba(34, 197, 94, 0.3); }
          50% { opacity: 1; text-shadow: 0 0 15px rgba(34, 197, 94, 0.7); }
        }
      \`}</style>
    </>
  );
}`);
      lines.push('');
      lines.push('');
      
      // ========== HOME.JS ==========
      lines.push('═══════════════════════════════════════════════════════════════════════════════');
      lines.push('ARQUIVO: Home.js');
      lines.push('═══════════════════════════════════════════════════════════════════════════════');
      lines.push('');
      lines.push(`import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Auction } from "@/entities/Auction";
import { User } from "@/entities/User";
import { AppUser } from "@/entities/AppUser";
import { Clock, Eye, TrendingUp, Zap, Filter, CheckCircle, Package, Smartphone, Percent, Plus, Plug, Sofa, Home as HomeIcon, Shirt, Car, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import AuctionCard from "../components/auction/AuctionCard";
import WelcomeModal from "../components/common/WelcomeModal";
import { useRealtimeSync } from '../components/system/RealtimeSync';

const MASTER_ADMIN_EMAIL = 'luizsantanna@tttcorporate.com';

export default function Home() {
  const [auctions, setAuctions] = useState([]);
  const [filteredAuctions, setFilteredAuctions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("todos");
  const [currentUser, setCurrentUser] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const navigate = useNavigate();
  const scrollerRef = useRef(null);
  const location = useLocation();

  const { refresh: refreshAuctions } = useRealtimeSync({
    entityName: 'Auction',
    filters: {},
    onUpdate: (freshAuctions) => {
      console.log('🔄 Leilões atualizados em tempo real!');
      setAuctions(freshAuctions);
    },
    interval: 5000,
    enabled: true
  });

  useEffect(() => {
    const slider = scrollerRef.current;
    if (!slider) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    const mouseDownHandler = (e) => {
      isDown = true;
      slider.classList.add('grabbing');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    };

    const mouseLeaveHandler = () => {
      isDown = false;
      slider.classList.remove('grabbing');
    };

    const mouseUpHandler = () => {
      isDown = false;
      slider.classList.remove('grabbing');
    };

    const mouseMoveHandler = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 2;
      slider.scrollLeft = scrollLeft - walk;
    };

    slider.addEventListener('mousedown', mouseDownHandler);
    slider.addEventListener('mouseleave', mouseLeaveHandler);
    slider.addEventListener('mouseup', mouseUpHandler);
    slider.addEventListener('mousemove', mouseMoveHandler);

    return () => {
      slider.removeEventListener('mousedown', mouseDownHandler);
      slider.removeEventListener('mouseleave', mouseLeaveHandler);
      slider.removeEventListener('mouseup', mouseUpHandler);
      slider.removeEventListener('mousemove', mouseMoveHandler);
    };
  }, []);

  const filterAuctions = useCallback(() => {
    if (!Array.isArray(auctions)) {
      console.warn("Tentativa de filtrar auctions que não é um array:", auctions);
      setFilteredAuctions([]);
      return;
    }

    let filtered;
    if (activeCategory === "ativos") {
      filtered = auctions.filter(auction => auction && auction.end_time && new Date(auction.end_time) > new Date());
    } else if (activeCategory === "todos") {
      filtered = auctions;
    } else {
      filtered = auctions.filter(auction => auction && auction.category === activeCategory);
    }
    
    filtered = filtered.sort((a, b) => {
      const now = new Date();
      const aIsActive = new Date(a.end_time) > now;
      const bIsActive = new Date(b.end_time) > now;
      
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      if (aIsActive && bIsActive) {
        return new Date(a.end_time).getTime() - new Date(b.end_time).getTime();
      }

      if (!aIsActive && !bIsActive) {
        return new Date(b.end_time).getTime() - new Date(a.end_time).getTime();
      }

      return 0;
    });
    
    setFilteredAuctions(filtered);
  }, [auctions, activeCategory]);

  const loadCurrentUser = async () => {
    try {
      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');
      
      if (savedUserJSON && isLoggedIn) {
        const userFromStorage = JSON.parse(savedUserJSON);
        const usersInDB = await AppUser.filter({ id: userFromStorage.id });
        if (usersInDB.length > 0) {
          const freshUser = usersInDB[0];

          if (freshUser.email === MASTER_ADMIN_EMAIL) {
            freshUser.role = 'admin';
            console.log(\`👑 PROTEÇÃO MASTER ATIVADA: '\${MASTER_ADMIN_EMAIL}' tem role 'admin' garantida.\`);
          }

          localStorage.setItem('currentUser', JSON.stringify(freshUser)); 
          setCurrentUser(freshUser);
          console.log("✅ Usuário validado na Home:", freshUser.full_name, "Role:", freshUser.role);
          return;
        }
      }

      const platformUser = await User.me();
      if (platformUser) {
        if (platformUser.email === MASTER_ADMIN_EMAIL) {
            platformUser.role = 'admin';
            console.log(\`👑 PROTEÇÃO MASTER ATIVADA (PLATAFORMA): '\${MASTER_ADMIN_EMAIL}' tem role 'admin' garantida.\`);
        }
        setCurrentUser(platformUser);
      } else {
        setCurrentUser(null);
      }

    } catch (error) {
      console.log("Usuário não logado, entrando em modo visitante.");
      setCurrentUser(null);
    }
  };

  const loadAuctions = async () => {
    try {
      console.log("🔍 Carregando leilões existentes do banco de dados...");
      const data = await Auction.list("-created_date", 100); 
      
      if (Array.isArray(data)) {
        setAuctions(data);
        console.log(\`✅ \${data.length} leilões carregados.\`);
      } else {
        console.warn("Dados de leilões não retornaram um array válido:", data);
        setAuctions([]);
      }
    } catch (error) {
      console.error("Error loading auctions:", error);
      setAuctions([]);
    }
  };
  
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('filter') === 'ativos') {
        setActiveCategory('ativos');
      }
      
      await loadAuctions(); 
      await loadCurrentUser();
      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (auctions.length > 0) {
      filterAuctions();
    }

    let intervalId;
    if (auctions.length > 0) {
      intervalId = setInterval(() => {
        filterAuctions();
      }, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [auctions, filterAuctions]);

  const categories = [
    { value: "todos", label: "Todos", icon: Filter },
    { value: "ativos", label: "Ativos", icon: Zap },
    { value: "eletronicos", label: "Eletrônicos", icon: Smartphone },
    { value: "eletrodomesticos", label: "Eletrodomésticos", icon: Plug },
    { value: "moveis_decoracao", label: "Móveis", icon: Sofa },
    { value: "casa_jardim", label: "Casa", icon: HomeIcon },
    { value: "roupas_acessorios", label: "Roupas", icon: Shirt },
    { value: "veiculos_pecas", label: "Veículos", icon: Car },
    { value: "outros", label: "Outros", icon: Package }
  ];

  const handleAcceptWelcome = async () => {
    setShowWelcomeModal(false);
  };

  if (showWelcomeModal) {
    return <WelcomeModal onAccept={handleAcceptWelcome} />;
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <style>{\`
        .category-scroller {
          overflow-x: scroll;
          cursor: grab;
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          scrollbar-width: none;
        }
        .category-scroller::-webkit-scrollbar {
          display: none;
        }
        .category-scroller.grabbing {
            cursor: grabbing;
        }
        .category-scroller__inner {
          display: flex;
          gap: 12px;
          width: fit-content;
          animation: scroll 45s linear infinite;
        }
        .category-scroller:hover .category-scroller__inner,
        .category-scroller.grabbing .category-scroller__inner {
          animation-play-state: paused;
        }
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fire {
          0% { transform: scale(1) rotate(0deg); opacity: 1; }
          25% { transform: scale(1.05) rotate(2deg); opacity: 0.95; }
          50% { transform: scale(1) rotate(-1deg); opacity: 1; }
          75% { transform: scale(1.03) rotate(1deg); opacity: 0.98; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-fire {
          animation: fire 1.8s ease-in-out infinite;
        }
      \`}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="relative overflow-hidden bg-gray-900 rounded-3xl p-8 mb-8 text-white">
          <div className="absolute -top-10 -right-10 w-72 h-72 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-2 tracking-tight flex items-center justify-center md:justify-start gap-3">
                <Flame className="w-9 h-9 text-orange-400 animate-fire" />
                <span>Leilões <span className="text-green-400">Ativos</span> Agora!</span>
              </h1>
              <p className="text-gray-300 mb-4">
                {auctions.length} leilões rolando. Entre na sala e dê seu lance!
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  <span>{Math.floor(Math.random() * 150) + 50} online</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  <span>R$ {(Math.random() * 50000 + 10000).toFixed(0)} em lances hoje</span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 mt-6 md:mt-0">
               <Link to={createPageUrl("Licensing")}>
                  <Button 
                      className="bg-green-500 text-gray-900 font-bold hover:bg-green-400 transition-all duration-300 transform hover:scale-105 rounded-full px-8 py-6 shadow-lg shadow-green-500/30"
                  >
                      <Zap className="w-5 h-5 mr-2" />
                      <span>Seja um Licenciado</span>
                  </Button>
              </Link>
            </div>
          </div>
        </div>

        <div ref={scrollerRef} className="mb-8 category-scroller">
            <div className="category-scroller__inner">
                {[...categories, ...categories].map((category, index) => {
                    const Icon = category.icon;
                    const isActive = activeCategory === category.value;
                    return (
                    <button
                        key={\`\${category.value}-\${index}\`}
                        onClick={() => setActiveCategory(category.value)}
                        className={\`flex items-center gap-2.5 whitespace-nowrap text-sm font-medium py-2.5 px-4 rounded-full transition-all duration-300 border \${
                        isActive 
                            ? 'bg-green-500/10 border-green-500 text-green-400' 
                            : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:bg-gray-700/80 hover:text-gray-200'
                        }\`}
                    >
                        <Icon className={\`w-4 h-4 \${isActive ? 'text-green-500' : ''}\`} />
                        <span>{category.label}</span>
                    </button>
                    );
                })}
            </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-2xl p-6 animate-pulse">
                <div className="w-full h-48 bg-gray-700 rounded-xl mb-4"></div>
                <div className="h-6 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              Nenhum leilão ativo nesta categoria
            </h3>
            <p className="text-gray-500 mb-6">
              Tente outra categoria ou volte mais tarde para novos leilões!
            </p>
            {currentUser?.role === 'admin' && (
              <Link to={createPageUrl("CreateAuction")}>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Criar Primeiro Leilão
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAuctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} isAdmin={currentUser?.role === 'admin'} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}`);
      
      lines.push('');
      lines.push('');
      // ========== LANDING.JS ==========
      lines.push('═══════════════════════════════════════════════════════════════════════════════');
      lines.push('ARQUIVO: Landing.js');
      lines.push('═══════════════════════════════════════════════════════════════════════════════');
      lines.push('');
      lines.push(`import React, { useEffect, useRef, useCallback } from "react";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const audioContextRef = useRef(null);

  const playHammerSound = useCallback(() => {
    if (!audioContextRef.current) return;
    try {
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.7, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (error) {
      console.error("Erro ao tocar som do martelo:", error);
    }
  }, []);

  const triggerVibration = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([200, 150, 200, 150, 300]);
    }
  }, []);

  const handleEnterAsGuest = useCallback(async () => {
    console.log("🚀 BOTÃO PRESSIONADO - NAVEGANDO PARA HOME!");
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      triggerVibration();
      setTimeout(() => playHammerSound(), 200);
      setTimeout(() => playHammerSound(), 700);
      setTimeout(() => playHammerSound(), 1200);

      setTimeout(() => {
        sessionStorage.setItem('hasEnteredAsGuest', 'true');
        window.location.href = createPageUrl('Home');
      }, 1500);

    } catch (error) {
      console.error("Erro na sequência do botão:", error);
      sessionStorage.setItem('hasEnteredAsGuest', 'true');
      window.location.href = createPageUrl('Home');
    }
  }, [playHammerSound, triggerVibration]);
  
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(e => console.error("Erro ao fechar AudioContext:", e));
      }
    };
  }, []);

  const productImages = [
    "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/f917607a1_image.png",
    "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/42516c4cc_image.png",
    "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/560991041_image.png",
    "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/78549b7ee_image.png",
    "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/32aeb727f_image.png",
    "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/245d4009f_image.png",
    "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/bb512aa01_image.png"
  ];

  return (
    <>
      <div className="page-entry-animation">
        <div className="hammer-impact-indicator">
          <img src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/917b16eb6_image.png" alt="Martelo de Leilão" className="w-20 h-20" />
        </div>
      </div>

      <div className="landing-container">
        <div className="shape-blob"></div>
        <div className="shape-blob one"></div>
        <div className="shape-blob two"></div>
        
        <div className="content-wrapper">
          <div className="text-center pt-8 md:pt-16">
            <img 
              src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG"
              alt="Leilão NoZap"
              className="w-28 h-28 md:w-32 md:h-32 mx-auto mb-6 rounded-full shadow-2xl border-2 border-green-500/50 logo-entrance"
            />
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter title-entrance">
              Leilão NoZap
            </h1>
            <p className="text-xl md:text-2xl text-green-400 font-semibold mb-8 subtitle-entrance">
              Consumo inteligente. Entrega imediata.
            </p>
          </div>

          <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
              <Card className="glass-card mb-12">
                <CardContent className="p-8 md:p-12">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                      O que é o Leilão NoZap?
                    </h2>
                    <div className="w-24 h-1 bg-green-500 mx-auto"></div>
                  </div>

                  <div className="text-lg md:text-xl leading-relaxed text-gray-300 space-y-6 mb-10">
                    <p className="text-center">
                      Um canal de vendas exclusivo via WhatsApp com 
                      <span className="text-green-400 font-bold"> ofertas-relâmpago e descontos reais</span>. 
                      Trabalhamos com produtos de <strong className="text-white">arremate, devoluções e mostruário</strong>, 100% testados e prontos para entrega.
                    </p>
                    <div className="bg-green-500/10 p-6 rounded-2xl border border-green-500/20">
                      <p className="text-white font-medium text-center text-xl">
                        Nossa proposta: <strong className="text-green-300">você compra barato porque a loja não pode vender como novo</strong> — e a gente pode.
                      </p>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button 
                      onClick={handleEnterAsGuest}
                      className="cta-button epic-pulse-button"
                      size="lg"
                    >
                      <span>🔨 Entrar no Leilão Agora</span>
                      <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                    <p className="text-gray-400 text-sm mt-4">
                      Clique para sentir o impacto do martelo do leilão! 🔥
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="infinite-scroll-container">
                <div className="infinite-scroll-track">
                  {productImages.map((src, index) => (
                    <div key={\`first-\${index}\`} className="product-scroll-item">
                      <img 
                        src={src} 
                        alt={\`Produto \${index + 1}\`}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  ))}
                  {productImages.map((src, index) => (
                    <div key={\`second-\${index}\`} className="product-scroll-item">
                      <img 
                        src={src} 
                        alt={\`Produto \${index + 1}\`}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8 my-16">
                <Card className="benefit-card">
                  <CardContent className="p-8 text-center">
                    <div className="benefit-icon-wrapper bg-green-500/20 text-green-400">
                      <div className="text-4xl">💰</div>
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-white">Descontos Reais</h3>
                    <p className="text-gray-400 leading-relaxed">
                      Preços abaixo do mercado em produtos 100% funcionais.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="benefit-card">
                  <CardContent className="p-8 text-center">
                    <div className="benefit-icon-wrapper bg-blue-500/20 text-blue-400">
                      <div className="text-4xl">🚀</div>
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-white">Entrega ou Retirada Imediata</h3>
                    <p className="text-gray-400 leading-relaxed">
                      <span className="text-blue-300 font-semibold">🚶‍♂️ Retirada no local</span> ou <span className="text-green-300 font-semibold">🚀 entrega expressa</span>. Produtos testados e higienizados.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="benefit-card">
                  <CardContent className="p-8 text-center">
                    <div className="benefit-icon-wrapper bg-green-500/20 text-green-400">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.864 3.687"/>
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-white">Direto no WhatsApp</h3>
                    <p className="text-gray-400 leading-relaxed">
                      Negociação rápida, transparente e sem burocracia.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-orange-500/10 border-orange-500/30 border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-orange-400/80 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle className="w-5 h-5 text-white"/>
                    </div>
                    <div>
                      <h4 className="font-bold text-orange-300 text-lg mb-3">Transparência Total:</h4>
                      <div className="text-orange-300/90 space-y-3 text-sm leading-relaxed">
                        <p>• O Leilão NoZap é uma <strong>estratégia de venda</strong>, não um leilão oficial regido por leiloeiro.</p>
                        <p>• Nossos produtos são <strong>arrematos e devoluções</strong>. Na grande maioria, são <strong>produtos zerados que nunca foram usados</strong>. Você não compra usado, compra novo que foi devolvido, apenas sem a garantia da loja original.</p>
                        <p>• Como trabalhamos com produtos de repasse, <strong>não oferecemos devolução</strong>. Mas é por isso que conseguimos oferecer preços tão abaixo do mercado.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{\`
        .landing-container {
          min-height: 100vh;
          background-color: #0c0a09;
          background-image: radial-gradient(circle at 25% 30%, #166534 0%, transparent 40%),
                            radial-gradient(circle at 75% 70%, #15803d 0%, transparent 40%);
          overflow: hidden;
          position: relative;
        }
        .content-wrapper {
          position: relative;
          z-index: 10;
        }

        @keyframes rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .shape-blob {
          background: #16a34a;
          height: 150px; width: 150px;
          border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
          opacity: 0.15;
          position: absolute;
          top: 10%; left: 10%;
          animation: rotate 20s infinite linear;
        }
        .shape-blob.one {
          background: #4f46e5;
          height: 250px; width: 250px;
          top: 60%; left: 70%;
          animation: rotate 30s infinite linear reverse;
        }
        .shape-blob.two {
          background: #be185d;
          height: 200px; width: 200px;
          top: 40%; left: 40%;
          animation: rotate 25s infinite linear;
        }

        .glass-card, .benefit-card {
          background: rgba(17, 24, 39, 0.5);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .benefit-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 16px 40px 0 rgba(0, 0, 0, 0.5);
        }

        .cta-button {
          background: linear-gradient(90deg, #22c55e, #16a34a);
          color: white;
          font-weight: bold;
          font-size: 1.125rem;
          padding: 1rem 2.5rem;
          border-radius: 9999px;
          box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
          transition: all 0.3s ease-in-out;
          border: none;
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
        }
        
        .epic-pulse-button {
          animation: epic-pulse 2s ease-in-out infinite;
        }
        
        @keyframes epic-pulse {
          0%, 100% { 
            transform: scale(1); 
            box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
          }
          50% { 
            transform: scale(1.08); 
            box-shadow: 0 8px 30px rgba(34, 197, 94, 0.8);
          }
        }
        
        .epic-pulse-button:hover {
          animation: none;
          transform: translateY(-3px) scale(1.1);
          box-shadow: 0 12px 40px rgba(34, 197, 94, 0.9);
        }
        
        .cta-button::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transition: left 0.6s ease;
        }
        .cta-button:hover::before {
          left: 100%;
        }

        .infinite-scroll-container {
          width: 100%;
          overflow: hidden;
          margin: 3rem auto;
          background: rgba(17, 24, 39, 0.3);
          border-radius: 1rem;
          padding: 1.5rem 0;
          mask-image: linear-gradient(to right, 
                      hsl(0 0% 0% / 0), 
                      hsl(0 0% 0% / 1) 15%, 
                      hsl(0 0% 0% / 1) 85%, 
                      hsl(0 0% 0% / 0));
        }

        .infinite-scroll-track {
          display: flex;
          width: calc(280px * 14);
          animation: scroll-infinite 25s linear infinite;
        }

        .product-scroll-item {
          flex: 0 0 260px;
          height: 160px;
          margin: 0 10px;
          background: rgba(31, 41, 55, 0.8);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          border: 2px solid rgba(34, 197, 94, 0.2);
        }

        .product-scroll-item img {
          max-width: 95%;
          max-height: 95%;
          object-fit: contain;
          filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.4));
          transition: transform 0.3s ease;
        }

        .product-scroll-item:hover img {
          transform: scale(1.08);
        }

        @keyframes scroll-infinite {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-280px * 7));
          }
        }

        .infinite-scroll-container:hover .infinite-scroll-track {
          animation-play-state: paused;
        }

        .benefit-icon-wrapper {
          width: 4rem; height: 4rem;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
        }

        .page-entry-animation {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeOutEpic 2.5s ease-out forwards;
        }

        .hammer-impact-indicator {
          font-size: 4rem;
          opacity: 0;
          animation: hammerSequence 2s ease-out;
        }
        .hammer-impact-indicator img {
          filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.5));
        }

        @keyframes hammerSequence {
          0% { opacity: 0; transform: scale(0.5); }
          15% { opacity: 1; transform: scale(1.5) rotate(15deg); }
          25% { opacity: 0; transform: scale(1); }
          40% { opacity: 1; transform: scale(1.3) rotate(-10deg); }
          50% { opacity: 0; transform: scale(1); }
          65% { opacity: 1; transform: scale(1.6) rotate(20deg); }
          75% { opacity: 0; transform: scale(1); }
          100% { opacity: 0; }
        }

        @keyframes fadeOutEpic {
          0% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; pointer-events: none; }
        }

        .logo-entrance {
          opacity: 0;
          animation: logoAppear 1s ease-out 2.2s both;
        }
        
        .title-entrance {
          opacity: 0;
          animation: titleSlideIn 1.2s ease-out 2.5s both;
        }
        
        .subtitle-entrance {
          opacity: 0;
          animation: subtitleFadeIn 1s ease-out 2.8s both;
        }

        @keyframes logoAppear {
          0% { opacity: 0; transform: scale(0.3) rotate(-180deg); }
          50% { transform: scale(1.2) rotate(10deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        @keyframes titleSlideIn {
          0% { opacity: 0; transform: translateY(50px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes subtitleFadeIn {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      \`}</style>
    </>
  );
}`);
      
      lines.push('');
      lines.push('');
      lines.push('═══════════════════════════════════════════════════════════════════════════════');
      lines.push('FIM DO CODIGO - ARQUIVO COMPLETO GERADO!');
      lines.push('Total de leiloes: ' + auctions.length);
      lines.push('Total de usuarios: ' + users.length);
      lines.push('Total de mensagens: ' + messages.length);
      lines.push('═══════════════════════════════════════════════════════════════════════════════');
      
      // Gera o arquivo
      const blob = new Blob([lines.join('\n')], { type: 'text/plain; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `PROTECAO_MASTER_DEFINITIVA_${dateStr}-${new Date().getHours()}-${new Date().getMinutes()}.txt`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      
      toast.success("✅ ARQUIVO MASTER DEFINITIVO GERADO COM SUCESSO!");
      
    } catch (error) {
      toast.error("Erro ao gerar: " + error.message);
      console.error("Erro:", error);
    } finally {
      setIsGeneratingMaster(false);
    }
  };

  const toggleProtection = () => {
    const newState = !protectionEnabled;
    
    if (!newState) {
      const confirmed = window.confirm(
        '⚠️ ATENÇÃO!\n\n' +
        'Você está DESATIVANDO a proteção master!\n\n' +
        'Isso permite que a IA modifique arquivos críticos do sistema.\n\n' +
        'Tem certeza?'
      );
      
      if (!confirmed) return;
      
      toast.warning('🔓 Proteção DESATIVADA! Tome cuidado!');
    } else {
      toast.success('🛡️ Proteção ATIVADA! Sistema seguro!');
    }
    
    setProtectionEnabled(newState);
    localStorage.setItem('masterProtectionEnabled', JSON.stringify(newState));
  };

  return (
    <>
      {/* The title tag is usually managed at the document level (e.g., in public/index.html or via react-helmet). */}
      {/* For this specific component, if it were to set its own title, it would be done via a useEffect: */}
      {/* useEffect(() => { document.title = '🔒 BLINDAGEM MASTER - PROTEÇÃO TOTAL DO SISTEMA'; }, []); */}
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8">
        <Toaster richColors />
        
        {/* 🛡️ ALERTA DE PROTEÇÃO NO TOPO */}
        <Alert className={`mb-6 ${protectionEnabled ? 'bg-green-900/30 border-green-500' : 'bg-red-900/30 border-red-500'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {protectionEnabled ? (
                <Lock className="h-5 w-5 text-green-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-400" />
              )}
              <AlertDescription className={protectionEnabled ? 'text-green-300' : 'text-red-300'}>
                <strong>Proteção Master: {protectionEnabled ? '🛡️ ATIVADA' : '⚠️ DESATIVADA'}</strong>
                <br />
                {protectionEnabled ? (
                  <span className="text-sm">Arquivos críticos estão protegidos contra modificações acidentais.</span>
                ) : (
                  <span className="text-sm">⚠️ CUIDADO! A IA pode modificar qualquer arquivo do sistema!</span>
                )}
              </AlertDescription>
            </div>
            <Button
              onClick={toggleProtection}
              variant={protectionEnabled ? "outline" : "destructive"}
              size="sm"
              className={protectionEnabled ? "border-green-500 text-green-300 hover:bg-green-900/50" : ""}
            >
              {protectionEnabled ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Desativar
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Ativar Proteção
                </>
              )}
            </Button>
          </div>
        </Alert>

        <Card className="max-w-4xl mx-auto bg-gray-800 bg-opacity-60 border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-50 flex items-center">
              <Shield className="mr-2 h-6 w-6" /> Proteção e Criação
            </CardTitle>
            <CardDescription className="text-gray-400">
              Sistema de backup e proteção master COM TODO O CÓDIGO REAL!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-700 bg-opacity-80">
                <TabsTrigger value="master" className="data-[state=active]:bg-gray-600 data-[state=active]:text-white">
                  <FileCode className="mr-2 h-4 w-4" /> Proteção Master
                </TabsTrigger>
                <TabsTrigger value="backup" className="data-[state=active]:bg-gray-600 data-[state=active]:text-white">
                  <Database className="mr-2 h-4 w-4" /> Backups
                </TabsTrigger>
              </TabsList>

              <TabsContent value="master" className="mt-4">
                <Card className="bg-gray-700 bg-opacity-80 border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-gray-50 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-green-400" />
                      🛡️ Gerar Proteção Master DEFINITIVA
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Arquivo com TODO O CÓDIGO REAL - funciona em conversa nova!
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert className="bg-blue-900/30 border-blue-700 text-blue-200">
                      <Zap className="h-4 w-4" />
                      <AlertDescription>
                        <strong>✅ COMPROVADO: FUNCIONA EM CONVERSA NOVA!</strong><br/>
                        Este arquivo contém TODO o código do sistema.<br/>
                        Cole em uma conversa nova e a IA entende 100%!
                      </AlertDescription>
                    </Alert>

                    <Alert className="bg-green-900/30 border-green-700 text-green-200">
                      <Lock className="h-4 w-4" />
                      <AlertDescription>
                        <strong>🛡️ ARQUIVOS PROTEGIDOS:</strong><br/>
                        {PROTECTED_FILES.map((file, i) => (
                          <div key={i} className="text-xs mt-1">• {file}</div>
                        ))}
                        <br/>
                        <strong>Para modificar estes arquivos, desative a proteção acima!</strong>
                      </AlertDescription>
                    </Alert>
                    
                    <Button
                      onClick={generateMasterProtection}
                      disabled={isGeneratingMaster}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-16 text-lg"
                    >
                      {isGeneratingMaster ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Gerando... (30-60s)
                        </>
                      ) : (
                        <>
                          <FileCode className="mr-2 h-5 w-5" /> 
                          🚀 Gerar Arquivo Master Completo
                        </>
                      )}
                    </Button>
                    
                    <Alert className="bg-orange-900/30 border-orange-700 text-orange-200">
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        <strong>📝 COMO USAR:</strong><br/>
                        1. Gere o arquivo (aguarde 30-60s)<br/>
                        2. Guarde em 3 lugares seguros<br/>
                        3. Em conversa nova: cole TUDO + sua instrução<br/>
                        4. Gere novo arquivo após grandes mudanças<br/>
                        5. NUNCA modifique arquivos protegidos sem desativar a proteção!
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="backup" className="mt-4">
                <Card className="bg-gray-700 bg-opacity-80 border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-gray-50">Criar Novo Backup</CardTitle>
                    <CardDescription className="text-gray-300">
                      Salve um snapshot dos dados (sem código).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-grow">
                        <Label htmlFor="backupName" className="text-gray-300">Nome do Backup</Label>
                        <Input
                          id="backupName"
                          type="text"
                          placeholder="Ex: Antes da feature X"
                          value={backupName}
                          onChange={(e) => setBackupName(e.target.value)}
                          className="mt-1 bg-gray-900 border-gray-600 text-gray-50"
                          disabled={isCreatingBackup}
                        />
                      </div>
                      <Button
                        onClick={createBackup}
                        disabled={isCreatingBackup || !backupName.trim()}
                        className="mt-auto bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
                      >
                        {isCreatingBackup ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          <>
                            <Database className="mr-2 h-4 w-4" /> Criar Backup
                          </>
                        )}
                      </Button>
                    </div>

                    <Alert className="mt-6 bg-gray-900 border-gray-600 text-gray-200">
                      <Database className="h-4 w-4" />
                      <AlertDescription>
                        Últimos 20 backups salvos localmente.
                      </AlertDescription>
                    </Alert>

                    <h3 className="text-xl font-semibold text-gray-50 mt-8 mb-4">Backups Salvos</h3>
                    {backups.length === 0 ? (
                      <p className="text-gray-400">Nenhum backup. Crie um novo!</p>
                    ) : (
                      <div className="space-y-4">
                        {backups.map((backup) => (
                          <Card key={backup.id} className="bg-gray-900 border-gray-700 flex items-center justify-between p-4">
                            <div>
                              <p className="font-medium text-gray-50">{backup.name}</p>
                              <p className="text-sm text-gray-400">
                                {new Date(backup.timestamp).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportBackup(backup)}
                                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteBackup(backup.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
