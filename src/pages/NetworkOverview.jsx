import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;
const Auction = base44.entities.Auction;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Loader2, ChevronDown, ChevronRight, Award, Eye, UserX, Search, Pencil, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Trash2, DollarSign, Link2, LayoutGrid, List } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


import { forceSyncStats } from "@/functions/forceSyncStats";
import { linkOrphanUsers } from "@/functions/linkOrphanUsers";
import { cleanSiteDuplicates } from "@/functions/cleanSiteDuplicates"; // Updated import for new function
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import UserEditModal from "../components/admin/UserEditModal";
import MessageDispatcher from "../components/admin/MessageDispatcher";

const CAREER_LEVELS = [
  { id: 'usuario', name: 'Usuário', color: 'bg-gray-500', textColor: 'text-gray-400', borderColor: 'border-gray-500' },
  { id: 'licenciado_aplicativo', name: 'Licenciado Aplicativo', color: 'bg-green-500', textColor: 'text-green-400', borderColor: 'border-green-500' },
  { id: 'licenciado_catalogo', name: 'Licenciado Catálogo', color: 'bg-yellow-500', textColor: 'text-yellow-400', borderColor: 'border-yellow-500' },
  { id: 'executivo', name: 'Executivo', color: 'bg-purple-500', textColor: 'text-purple-400', borderColor: 'border-purple-500' },
  { id: 'diretor', name: 'Diretor', color: 'bg-orange-500', textColor: 'text-orange-400', borderColor: 'border-orange-500' },
  { id: 'ceo', name: 'CEO', color: 'bg-red-500', textColor: 'text-red-400', borderColor: 'border-red-500' },
  { id: 'conselheiro', name: 'Conselheiro', color: 'bg-cyan-500', textColor: 'text-cyan-400', borderColor: 'border-cyan-500' },
  { id: 'fundador', name: 'Fundador', color: 'bg-amber-500', textColor: 'text-amber-400', borderColor: 'border-amber-500' }
];

function UserCard({ user, level, onPromote, children, isExpanded, onToggle, isLinearView = false, allUsers = [], onEdit }) {
  const [showDetails, setShowDetails] = useState(false);
  const userLevels = Array.isArray(user.career_levels) ? user.career_levels : (user.career_levels ? [user.career_levels] : ['usuario']);
  const primaryLevel = user.primary_career_level || userLevels[0] || 'usuario';
  const primaryLevelConfig = CAREER_LEVELS.find(l => l.id === primaryLevel) || CAREER_LEVELS[0];
  const hasChildren = children && children.length > 0;

  // 🔧 CORREÇÃO 1: Iniciais CORRETAS do nome real
  const getInitials = (fullName) => {
    if (!fullName || fullName.trim() === '') return '??';
    
    const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
    
    if (nameParts.length === 1) {
      return nameParts[0].substring(0, 2).toUpperCase();
    }
    
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(user.full_name);

  const referrer = user.referred_by_id 
    ? allUsers.find(u => u.id === user.referred_by_id) 
    : null;

  // 🔧 CORREÇÃO 2: Saldo formatado corretamente
  const valoraBalance = user.valora_pay_balance || 0;

  return (
    <div className={isLinearView ? "w-full" : "flex flex-col items-center"}>
      <Card className={`${isLinearView ? 'w-full' : 'w-72'} bg-gray-800/80 border-2 ${primaryLevelConfig.borderColor} hover:shadow-lg transition-all`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-12 h-12 rounded-full ${primaryLevelConfig.color} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                {initials}
              </div>
              
              {/* 🔧 CORREÇÃO 4: Nome real visível */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm truncate">{user.full_name}</h3>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700 flex-shrink-0"
                title="Ver detalhes"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
            
            {!isLinearView && hasChildren && (
              <button 
                onClick={onToggle}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700 flex-shrink-0"
              >
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            )}
          </div>
          
          {/* 🔧 CORREÇÃO 3: Mostrar APENAS o nível principal */}
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`${primaryLevelConfig.color} text-white text-xs px-3 py-1 font-bold ring-2 ring-white/20`}>
              ⭐ {primaryLevelConfig.name}
            </Badge>
          </div>
          
          {showDetails && (
            <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
              {user.nickname && (
                <>
                  <p className="text-xs text-gray-400">Apelido (Lance):</p>
                  <p className="text-sm text-green-400 font-semibold">{user.nickname}</p>
                </>
              )}
              
              {user.phone && (
                <>
                  <p className="text-xs text-gray-400 mt-2">Telefone:</p>
                  <p className="text-xs text-gray-300">{user.phone}</p>
                </>
              )}
              
              {/* Mostrar TODOS os níveis apenas em detalhes */}
              {userLevels.length > 1 && (
                <>
                  <p className="text-xs text-gray-400 mt-2">Todos os Cargos:</p>
                  <div className="flex flex-wrap gap-1">
                    {userLevels.map(levelId => {
                      const levelConfig = CAREER_LEVELS.find(l => l.id === levelId);
                      if (!levelConfig) return null;
                      const isPrimary = levelId === primaryLevel;
                      return (
                        <Badge key={levelId} className={`${levelConfig.color} text-white text-[10px] ${isPrimary ? 'ring-2 ring-white' : ''}`}>
                          {isPrimary && '⭐ '}
                          {levelConfig.name}
                        </Badge>
                      );
                    })}
                  </div>
                </>
              )}
              
              {referrer ? (
                <>
                  <p className="text-xs text-gray-400 mt-2">Indicado por:</p>
                  <p className="text-xs text-green-400 font-semibold">{referrer.full_name}</p>
                  <p className="text-xs text-gray-500">{referrer.email}</p>
                </>
              ) : (
                <p className="text-xs text-gray-500 mt-2">Sem indicação</p>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 🔧 CORREÇÃO 2 e 5: Saldo e indicados formatados */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-700/50 rounded-lg p-2 text-center">
              <div className="text-gray-400 mb-1">Indicados</div>
              <div className="text-white font-bold text-lg">
                👥 {user.indicated_clients_count || 0}
              </div>
            </div>
            <div className="bg-green-900/30 rounded-lg p-2 text-center">
              <div className="text-gray-400 mb-1">ValoraPay</div>
              <div className="text-green-400 font-bold text-lg">
                V$ {valoraBalance.toFixed(2)}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700 text-xs h-8"
              onClick={() => onPromote(user)}
            >
              <Award className="w-3 h-3 mr-1" />
              Promover
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="border-blue-500 text-blue-400 hover:bg-blue-500/10 text-xs h-8"
              onClick={() => onEdit(user)}
            >
              <Pencil className="w-3 h-3 mr-1" />
              Editar
            </Button>
          </div>
        </CardContent>
      </Card>

      {!isLinearView && hasChildren && isExpanded && (
        <div className="relative mt-6">
          <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-600"></div>
          <div className="flex gap-6 mt-6 flex-wrap justify-center">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function NetworkTree({ users, onPromote, onEdit }) {
  const [expandedUsers, setExpandedUsers] = useState(new Set());

  const toggleExpand = (userId) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const buildTree = (userId = null, level = 0) => {
    const children = users.filter(u => u.referred_by_id === userId);
    
    if (level === 0 && children.length === 0) {
      return null;
    }

    return children.map(user => {
      const userChildren = buildTree(user.id, level + 1);
      const isExpanded = expandedUsers.has(user.id);

      return (
        <UserCard
          key={user.id}
          user={user}
          level={level}
          onPromote={onPromote}
          onEdit={onEdit}
          isExpanded={isExpanded}
          onToggle={() => toggleExpand(user.id)}
          allUsers={users}
        >
          {userChildren}
        </UserCard>
      );
    });
  };

  const rootUsers = users.filter(u => !u.referred_by_id || u.referred_by_id === null);

  return (
    <div className="flex flex-wrap gap-8 justify-center p-6">
      {rootUsers.map(user => {
        const userChildren = buildTree(user.id, 1);
        const isExpanded = expandedUsers.has(user.id);

        return (
          <UserCard
            key={user.id}
            user={user}
            level={0}
            onPromote={onPromote}
            onEdit={onEdit}
            isExpanded={isExpanded}
            onToggle={() => toggleExpand(user.id)}
            allUsers={users}
          >
            {userChildren}
          </UserCard>
        );
      })}
    </div>
  );
}

export default function NetworkOverview() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [allAuctions, setAllAuctions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [promotingUser, setPromotingUser] = useState(null);
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [isPromoting, setIsPromoting] = useState(false);
  const [primaryLevel, setPrimaryLevel] = useState('');
  const [displayFirstName, setDisplayFirstName] = useState('');
  const [displayLastName, setDisplayLastName] = useState('');
  const [viewMode, setViewMode] = useState('network');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [viewingIndicationsFor, setViewingIndicationsFor] = useState(null);
  const [viewingCommissionsFor, setViewingCommissionsFor] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false); 
  const [selectedLicenseeId, setSelectedLicenseeId] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [selectedLicenseeForLink, setSelectedLicenseeForLink] = useState('');
  const [selectedUsersToLink, setSelectedUsersToLink] = useState([]);
  const [isLinking, setIsLinking] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [isLinkingOrphans, setIsLinkingOrphans] = useState(false);
  const [editingUserFull, setEditingUserFull] = useState(null);
  const [showMessageDispatcher, setShowMessageDispatcher] = useState(false);

  const fetchData = useCallback(async () => {
    // 🔧 CORREÇÃO CRÍTICA: Validar ADMIN PRIMEIRO
    const savedUser = localStorage.getItem('currentUser');
    let user = null;
    
    if (savedUser) {
      user = JSON.parse(savedUser);
      setCurrentUser(user);
      
      if (user.role !== 'admin') {
        toast.error("❌ Acesso negado. Apenas administradores.");
        setIsLoading(false);
        return;
      }
    } else {
      toast.error("❌ Acesso negado. Faça login como administrador.");
      setIsLoading(false);
      return;
    }

    // Agora sim busca os dados
    setIsLoading(true);
    try {
      const users = await AppUser.list("-created_date", 1000);
      const auctions = await Auction.list("-created_date", 500);

      setAllUsers(Array.isArray(users) ? users : []);
      setAllAuctions(Array.isArray(auctions) ? auctions : []);
      
      console.log("✅ Dados carregados:", users.length, "usuários");
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do Sistema de Alavancagem."); // Changed here
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const total = allUsers.length;
    const byLevel = CAREER_LEVELS.map(level => ({
      ...level,
      count: allUsers.filter(u => {
        const userLevels = Array.isArray(u.career_levels) ? u.career_levels : (u.career_levels ? [u.career_levels] : ['usuario']);
        return userLevels.includes(level.id);
      }).length
    }));
    const totalVolume = allUsers.reduce((sum, u) => sum + (u.valora_pay_balance || 0), 0);

    return { total, byLevel, totalVolume };
  }, [allUsers]);

  const licensees = useMemo(() => {
    return allUsers.filter(u => u.role === 'licensee' || (u.role === 'admin' && u.referral_code));
  }, [allUsers]);

  const availableUsersToLink = useMemo(() => {
    return allUsers.filter(u => {
      if (u.id === selectedLicenseeForLink) return false;
      return u.role === 'user' || u.role === 'licensee' || (u.role === 'admin' && u.referral_code);
    });
  }, [allUsers, selectedLicenseeForLink]);

  const filteredUsers = useMemo(() => {
    let tempUsers = allUsers;

    if (filterRole !== 'all') {
      tempUsers = tempUsers.filter(user => user.role === filterRole);
    }

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      tempUsers = tempUsers.filter(user =>
        user.full_name?.toLowerCase().includes(lowerCaseSearchTerm) ||
        user.email?.toLowerCase().includes(lowerCaseSearchTerm) ||
        user.nickname?.toLowerCase().includes(lowerCaseSearchTerm) ||
        user.phone?.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
    return tempUsers;
  }, [allUsers, filterRole, searchTerm]);

  const handlePromote = (user) => {
    setPromotingUser(user);
    const userLevels = Array.isArray(user.career_levels) ? user.career_levels : (user.career_levels ? [user.career_levels] : ['usuario']);
    setSelectedLevels(userLevels);
    setPrimaryLevel(user.primary_career_level || userLevels[0] || 'usuario');
    
    const nameParts = user.full_name.split(' ').filter(part => part.trim() !== '');
    setDisplayFirstName(user.display_first_name && user.display_first_name.trim() !== '' ? user.display_first_name : (nameParts[0] || ''));
    setDisplayLastName(user.display_last_name && user.display_last_name.trim() !== '' ? user.display_last_name : (nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''));
  };

  const toggleLevel = (levelId) => {
    setSelectedLevels(prev => {
      const newLevels = prev.includes(levelId) ? prev.filter(l => l !== levelId) : [...prev, levelId];
      
      if (levelId === primaryLevel && !newLevels.includes(levelId)) {
        setPrimaryLevel(newLevels[0] || 'usuario');
      } else if (newLevels.length === 0) {
        setPrimaryLevel('usuario');
      } else if (!newLevels.includes(primaryLevel)) {
        setPrimaryLevel(newLevels[0]);
      }
      
      return newLevels;
    });
  };

  const confirmPromotion = async () => {
    if (!promotingUser || selectedLevels.length === 0) {
      toast.error("Selecione pelo menos um nível.");
      return;
    }

    if (!selectedLevels.includes(primaryLevel)) {
      toast.error("O nível principal deve estar marcado entre os cargos selecionados.");
      return;
    }

    setIsPromoting(true);
    try {
      await AppUser.update(promotingUser.id, { 
        career_levels: selectedLevels,
        primary_career_level: primaryLevel,
        display_first_name: displayFirstName.trim() || null,
        display_last_name: displayLastName.trim() || null
      });
      
      await fetchData();
      
      const levelNames = selectedLevels.map(id => CAREER_LEVELS.find(l => l.id === id)?.name).join(', ');
      const primaryName = CAREER_LEVELS.find(l => l.id === primaryLevel)?.name;
      toast.success(`${promotingUser.full_name} agora é: ${levelNames}!\nFunção principal: ⭐ ${primaryName}`);
      
      setPromotingUser(null);
      setSelectedLevels([]);
      setPrimaryLevel('');
      setDisplayFirstName('');
      setDisplayLastName('');
    } catch (error) {
      console.error("Erro na promoção:", error);
      toast.error("Erro ao promover usuário.");
    } finally {
      setIsPromoting(false);
    }
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    toast.info("Sincronizando...");
    try {
      const response = await forceSyncStats();
      if (response.status === 200) {
        toast.success("Estatísticas sincronizadas!");
        await fetchData();
      }
    } catch (err) {
      toast.error("Erro na sincronização: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGrantCommission = async () => {
    if (!selectedLicenseeId || !commissionAmount || parseFloat(commissionAmount) <= 0) {
      toast.error("Selecione um licenciado e valor válido.");
      return;
    }

    setIsGranting(true);
    try {
      const licensee = allUsers.find(u => u.id === selectedLicenseeId);
      if (!licensee) throw new Error("Licenciado não encontrado.");

      const amount = parseFloat(commissionAmount);
      await AppUser.update(selectedLicenseeId, {
        commission_balance: (licensee.commission_balance || 0) + amount,
        valora_pay_balance: (licensee.valora_pay_balance || 0) + amount
      });

      toast.success(`V$ ${amount.toFixed(2)} creditados!`);
      await fetchData();
      setSelectedLicenseeId('');
      setCommissionAmount('');
    } catch (error) {
      toast.error("Erro ao conceder comissão: " + error.message);
    } finally {
      setIsGranting(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsersToLink(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleOrganizeAlavancagem = async () => {
    if (!selectedLicenseeForLink || selectedUsersToLink.length === 0) {
      toast.error("Selecione um licenciado e usuários.");
      return;
    }

    const confirmLink = window.confirm(`Vincular ${selectedUsersToLink.length} usuário(s) ao licenciado ${allUsers.find(u => u.id === selectedLicenseeForLink)?.full_name}?`);
    if (!confirmLink) return;

    setIsLinking(true);
    try {
      for (const userId of selectedUsersToLink) {
        await AppUser.update(userId, { referred_by_id: selectedLicenseeForLink });
      }
      toast.info("Recalculando estatísticas...");
      await handleForceSync();
      setSelectedLicenseeForLink('');
      setSelectedUsersToLink([]);
      toast.success(`${selectedUsersToLink.length} usuário(s) vinculado(s)!`);
    } catch (error) {
      toast.error("Erro ao vincular: " + error.message);
    } finally {
      setIsLinking(false);
    }
  };

  const handleCleanDuplicates = async () => {
    const confirmClean = window.confirm(
      "⚠️ ATENÇÃO: Remover cadastros duplicados?\n\nEsta ação é irreversível e removerá todos os usuários com o mesmo e-mail, exceto o mais recente."
    );
    if (!confirmClean) return;

    setIsCleaningDuplicates(true);
    toast.info("🔍 Buscando duplicatas...");
    
    try {
      const allUsersToProcess = await AppUser.list("-created_date", 1000);
      
      if (!Array.isArray(allUsersToProcess)) {
        throw new Error("Falha ao buscar usuários.");
      }

      const emailMap = {};
      allUsersToProcess.forEach(u => {
        if (!u.email) return;
        const email = u.email.toLowerCase().trim();
        if (!emailMap[email]) {
          emailMap[email] = [];
        }
        emailMap[email].push(u);
      });

      let duplicatesRemoved = 0;
      let duplicateEmails = [];
      
      for (const [email, users] of Object.entries(emailMap)) {
        if (users.length > 1) {
          duplicateEmails.push({
            email: email,
            count: users.length,
            users: users
          });
          
          users.sort((a, b) => {
            const dateA = new Date(a.created_date || 0).getTime();
            const dateB = new Date(b.created_date || 0).getTime();
            return dateB - dateA;
          });
          
          const [keepUser, ...deleteUsers] = users;
          
          console.log(`📧 Email: ${email}`);
          console.log(`✅ Mantendo: ${keepUser.full_name} (${keepUser.id}) - Criado em ${keepUser.created_date}`);
          
          for (const userToDelete of deleteUsers) {
            try {
              console.log(`❌ Removendo: ${userToDelete.full_name} (${userToDelete.id}) - Criado em ${userToDelete.created_date}`);
              await AppUser.delete(userToDelete.id);
              duplicatesRemoved++;
            } catch (deleteError) {
              console.error(`Erro ao excluir usuário ${userToDelete.id}:`, deleteError);
              toast.error(`Falha ao excluir usuário ${userToDelete.id}`);
            }
          }
        }
      }

      if (duplicatesRemoved === 0) {
        toast.success("✅ Nenhum cadastro duplicado encontrado!");
      } else {
        console.log("\n📊 RELATÓRIO DE LIMPEZA:");
        console.log(`Total de emails duplicados: ${duplicateEmails.length}`);
        console.log(`Total de usuários removidos: ${duplicatesRemoved}`);
        
        duplicateEmails.forEach(dup => {
          console.log(`\n📧 ${dup.email} (${dup.count} cadastros)`);
          dup.users.forEach((u, i) => {
            console.log(`  ${i === 0 ? '✅ Mantido' : '❌ Removido'}: ${u.full_name} - ${u.created_date}`);
          });
        });

        toast.success(`🧹 ${duplicatesRemoved} duplicatas removidas!\n${duplicateEmails.length} emails tinham cadastros duplicados.`);
      }

      await fetchData();

    } catch (error) {
      console.error("❌ Erro ao limpar duplicatas:", error);
      toast.error("❌ Erro ao limpar duplicatas: " + error.message);
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const handleLinkOrphanUsers = async () => {
    const confirmLink = window.confirm(
      "🔗 Vincular todos os usuários SEM indicação ao Licenciado Site?\n\nEsta ação vai buscar todos os usuários órfãos e vinculá-los automaticamente."
    );
    if (!confirmLink) return;

    setIsLinkingOrphans(true);
    toast.info("🔍 Buscando usuários órfãos...");
    
    try {
      const response = await linkOrphanUsers();
      
      if (response.data && response.data.success) {
        const { linkedCount, totalOrphans, siteLicenseeName } = response.data;
        toast.success(`✅ ${linkedCount} de ${totalOrphans} usuários vinculados ao "${siteLicenseeName}"!`);
        
        await fetchData();
      } else {
        throw new Error(response.data?.error || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Erro ao vincular órfãos:", error);
      toast.error("❌ Erro ao vincular usuários: " + error.message);
    } finally {
      setIsLinkingOrphans(false);
    }
  };

  const handleCleanSiteDuplicates = async () => {
    const confirmClean = window.confirm(
      "🧹 LIMPAR DUPLICATAS DO SITE OFICIAL?\n\n" +
      "Esta ação vai:\n" +
      "1. Buscar TODOS os cadastros com 'Site Oficial' no nome\n" +
      "2. Manter APENAS o mais antigo\n" +
      "3. Deletar os duplicados\n\n" +
      "⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\n" +
      "Deseja continuar?"
    );
    if (!confirmClean) return;

    setIsCleaningDuplicates(true);
    toast.info("🔍 Buscando duplicatas...");
    
    try {
      console.log("📞 Chamando cleanSiteDuplicates...");
      const response = await cleanSiteDuplicates({});
      
      console.log("📥 Resposta recebida:", response);
      
      if (response.data) {
        if (response.data.success) {
          if (response.data.action === "cleaned") {
            console.log(`✅ ${response.data.duplicatesRemoved} duplicatas removidas`);
            console.log("📋 Detalhes:", response.data.deletionDetails);
            
            toast.success(
              `✅ ${response.data.duplicatesRemoved} duplicatas removidas!\n` +
              `🏆 Mantido: ${response.data.siteLicensee.full_name}` +
              `${response.data.failedDeletions > 0 ? `\n⚠️ ${response.data.failedDeletions} falharam` : ''}`
            );
          } else if (response.data.action === "already_clean") {
            console.log("✅ Sistema já está limpo");
            toast.success("✅ Site Oficial já está único!");
          }
          
          await fetchData();
        } else {
          // Erro retornado pela função
          console.error("❌ Erro na função:", response.data.error);
          
          if (response.data.debug) {
            console.log("🔍 DEBUG Info:", response.data.debug);
          }
          
          throw new Error(response.data.error || "Erro desconhecido");
        }
      } else {
        throw new Error("Resposta vazia da função");
      }
    } catch (error) {
      console.error("❌ Erro ao limpar duplicatas:", error);
      console.error("Stack:", error.stack);
      toast.error(`❌ Erro: ${error.message}`);
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUserFull(user);
  };

  const handleSaveEditUser = async () => {
    setEditingUserFull(null);
    await fetchData();
    toast.success("Usuário atualizado com sucesso!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-green-500" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-red-500">
          <CardContent className="p-6 text-center">
            <p className="text-red-400">Acesso negado. Apenas administradores.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Users className="w-8 h-8 text-green-400" />
              📊 Painel do Sistema de Alavancagem
            </h1>
            <p className="text-gray-400">Visão completa de todos os usuários e licenciados</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* NOVO BOTÃO DISPARAR MENSAGENS */}
            <Button
              onClick={() => setShowMessageDispatcher(true)}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Send className="w-4 h-4 mr-2" />
              Disparar Mensagens
            </Button>

            {/* BOTÃO CORRIGIDO */}
            <Button
              onClick={handleCleanSiteDuplicates}
              disabled={isCleaningDuplicates}
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-500/10" // Updated className
              size="sm"
            >
              {isCleaningDuplicates ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />} {/* Changed icon */}
              🧹 Limpar Site Duplicado (CORRIGIDO) {/* Updated text */}
            </Button>

            <Button
              onClick={handleCleanDuplicates}
              disabled={isCleaningDuplicates}
              variant="outline"
              className="border-yellow-500 text-yellow-400"
              size="sm"
            >
              {isCleaningDuplicates ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserX className="w-4 h-4 mr-2" />}
              Limpar Duplicatas
            </Button>
            
            <Button
              onClick={handleLinkOrphanUsers}
              disabled={isLinkingOrphans}
              variant="outline"
              className="border-green-500 text-green-400"
              size="sm"
            >
              {isLinkingOrphans ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
              Vincular Órfãos
            </Button>
            <Button
              onClick={handleForceSync}
              disabled={isSyncing}
              variant="outline"
              className="border-green-500 text-green-400"
              size="sm"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Sincronizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-4 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="text-sm text-gray-400 mb-1">Total no Sistema</div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </CardContent>
          </Card>

          {stats.byLevel.map(level => (
            <Card key={level.id} className={`bg-gray-800 border-2 ${level.borderColor}`}>
              <CardContent className="p-4">
                <div className={`text-xs ${level.textColor} mb-1 font-semibold line-clamp-1`}>{level.name}</div>
                <div className="text-2xl font-bold text-white">{level.count}</div>
              </CardContent>
            </Card>
          ))}

          <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-500/30">
            <CardContent className="p-4">
              <div className="text-sm text-green-400 mb-1">Volume V$</div>
              <div className="text-2xl font-bold text-white">
                {stats.totalVolume.toFixed(0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-green-400">Ferramentas de Administração</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="grant" className="bg-gray-800 border-gray-700 rounded-lg overflow-hidden">
                <AccordionTrigger className="px-6 hover:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <span className="text-white font-semibold">Conceder Comissões</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="selectLicenseeId" className="text-gray-300">Selecionar Licenciado</Label>
                      <Select value={selectedLicenseeId} onValueChange={setSelectedLicenseeId}>
                        <SelectTrigger id="selectLicenseeId" className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Escolha um licenciado" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          {licensees.map(lic => (
                            <SelectItem key={lic.id} value={lic.id}>
                              {lic.full_name} - V$ {(lic.valora_pay_balance || 0).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="commissionAmount" className="text-gray-300">Valor da Comissão (V$)</Label>
                      <Input
                        id="commissionAmount"
                        type="number"
                        placeholder="100.00"
                        value={commissionAmount}
                        onChange={(e) => setCommissionAmount(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <Button
                      onClick={handleGrantCommission}
                      disabled={isGranting || !selectedLicenseeId || !commissionAmount}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isGranting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Conceder Comissão
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="link" className="bg-gray-800 border-gray-700 rounded-lg overflow-hidden">
                <AccordionTrigger className="px-6 hover:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <Link2 className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-semibold">Organizar Alavancagem</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="selectLicenseeForLink" className="text-gray-300">Vincular a qual licenciado?</Label>
                      <Select value={selectedLicenseeForLink} onValueChange={setSelectedLicenseeForLink}>
                        <SelectTrigger id="selectLicenseeForLink" className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Escolha um licenciado" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          {licensees.map(lic => (
                            <SelectItem key={lic.id} value={lic.id}>
                              {lic.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedLicenseeForLink && (
                      <div className="max-h-64 overflow-y-auto bg-gray-700/30 rounded-lg p-4 space-y-2">
                        {availableUsersToLink.length === 0 ? (
                          <p className="text-gray-400 text-center">Nenhum usuário disponível para vincular.</p>
                        ) : (
                          availableUsersToLink.map(u => (
                            <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-gray-700/50 rounded">
                              <Checkbox
                                id={`user-link-${u.id}`}
                                checked={selectedUsersToLink.includes(u.id)}
                                onCheckedChange={() => toggleUserSelection(u.id)}
                                className="border-gray-600"
                              />
                              <label htmlFor={`user-link-${u.id}`} className="flex flex-1 items-center gap-2 cursor-pointer">
                                <span className="text-white">{u.full_name}</span>
                                <span className="text-gray-400 text-sm ml-auto">{u.email}</span>
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    <Button
                      onClick={handleOrganizeAlavancagem}
                      disabled={isLinking || !selectedLicenseeForLink || selectedUsersToLink.length === 0}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isLinking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Vincular {selectedUsersToLink.length} Usuário(s)
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* The new main Card with Tabs for content */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Gerenciamento de Usuários e Sistema de Alavancagem</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 🔧 AGORA SÓ 2 ABAS (removido Laboratório) */}
            <Tabs defaultValue="licensees" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-700/50">
                <TabsTrigger value="licensees">
                  <Award className="w-4 h-4 mr-2" />
                  Licenciados
                </TabsTrigger>
                <TabsTrigger value="users">
                  <Users className="w-4 h-4 mr-2" />
                  Usuários Gerais
                </TabsTrigger>
              </TabsList>

              {/* ABA 1: LICENCIADOS */}
              <TabsContent value="licensees" className="mt-6">
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-green-400">Visualização do Sistema de Alavancagem</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setViewMode('network')}
                          variant={viewMode === 'network' ? 'default' : 'outline'}
                          className={viewMode === 'network' ? 'bg-green-600 hover:bg-green-700' : 'border-gray-600 text-gray-300'}
                          size="sm"
                        >
                          <LayoutGrid className="w-4 h-4 mr-2" />
                          Visão em Árvore
                        </Button>
                        <Button
                          onClick={() => setViewMode('linear')}
                          variant={viewMode === 'linear' ? 'default' : 'outline'}
                          className={viewMode === 'linear' ? 'bg-green-600 hover:bg-green-700' : 'border-gray-600 text-gray-300'}
                          size="sm"
                        >
                          <List className="w-4 h-4 mr-2" />
                          Visão Linear
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    {allUsers.length > 0 ? (
                      viewMode === 'network' ? (
                        <NetworkTree users={allUsers} onPromote={handlePromote} onEdit={handleEditUser} />
                      ) : (
                        <div className="grid gap-4">
                          {allUsers.map(user => (
                            <UserCard
                              key={user.id}
                              user={user}
                              level={0}
                              onPromote={handlePromote}
                              onEdit={handleEditUser}
                              isLinearView={true}
                              allUsers={allUsers}
                            />
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>Nenhum usuário no sistema ainda.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ABA 2: USUÁRIOS GERAIS */}
              <TabsContent value="users" className="mt-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <div className="flex justify-between items-center flex-wrap gap-3">
                      <CardTitle className="text-white">Todos os Usuários ({filteredUsers.length})</CardTitle>
                      <div className="flex gap-3 flex-wrap">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Buscar por nome, apelido ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-gray-700 border-gray-600 text-white w-64"
                          />
                        </div>
                        <Select value={filterRole} onValueChange={setFilterRole}>
                          <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Filtrar por Cargo" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-white">
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="licensee">Licenciados</SelectItem>
                            <SelectItem value="user">Usuários</SelectItem>
                            <SelectItem value="admin">Admins</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-700">
                              <TableHead className="text-gray-400">Nome Completo</TableHead>
                              <TableHead className="text-gray-400">Apelido</TableHead>
                              <TableHead className="text-gray-400">Email / Telefone</TableHead>
                              <TableHead className="text-gray-400">Indicado Por</TableHead>
                              <TableHead className="text-gray-400">Função Principal</TableHead>
                              <TableHead className="text-gray-400">Cadastro</TableHead>
                              <TableHead className="text-gray-400">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredUsers.map((user) => {
                              const referrer = user.referred_by_id 
                                ? allUsers.find(u => u.id === user.referred_by_id) 
                                : null;
                              
                              const userLevels = Array.isArray(user.career_levels) ? user.career_levels : (user.career_levels ? [user.career_levels] : ['usuario']);
                              const primaryLevel = user.primary_career_level || userLevels[0] || 'usuario';
                              const primaryLevelConfig = CAREER_LEVELS.find(l => l.id === primaryLevel) || CAREER_LEVELS[0];
                              
                              return (
                                <TableRow key={user.id} className="border-gray-700 hover:bg-gray-700/50">
                                  <TableCell className="font-medium text-white">
                                    {user.full_name || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-green-400 font-semibold">
                                      {user.nickname || <span className="text-gray-500">Sem apelido</span>}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-gray-300 font-mono text-xs">{user.email}</span>
                                      <span className="text-gray-500 text-xs">{user.phone || 'Sem telefone'}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {referrer ? (
                                      <div className="flex flex-col">
                                        <span className="text-green-400 font-semibold text-sm">
                                          {referrer.full_name}
                                        </span>
                                        <span className="text-xs text-gray-500">({referrer.nickname || 'Sem apelido'})</span>
                                        <span className="text-xs text-gray-600">{referrer.email}</span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-500">Sem indicação</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={`${primaryLevelConfig.color} text-white font-semibold`}>
                                      ⭐ {primaryLevelConfig.name}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-gray-400 text-sm">
                                    {new Date(user.created_date).toLocaleDateString('pt-BR')}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditUser(user)}
                                        className="text-blue-400 hover:text-blue-300"
                                        title="Editar tudo"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {promotingUser && (
        <Dialog open={true} onOpenChange={() => setPromotingUser(null)}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-400">
                <Award className="w-5 h-5" />
                Definir Cargos: {promotingUser.full_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                <div>
                  <Label htmlFor="firstName" className="text-xs text-gray-400 mb-1 block">
                    Nome para Painel
                  </Label>
                  <Input
                    id="firstName"
                    value={displayFirstName}
                    onChange={(e) => setDisplayFirstName(e.target.value)}
                    placeholder="Ex: Geovani"
                    className="bg-gray-700 border-gray-600 text-white text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-xs text-gray-400 mb-1 block">
                    Sobrenome para Painel
                  </Label>
                  <Input
                    id="lastName"
                    value={displayLastName}
                    onChange={(e) => setDisplayLastName(e.target.value)}
                    placeholder="Ex: Silva"
                    className="bg-gray-700 border-gray-600 text-white text-sm"
                  />
                </div>
                <p className="col-span-2 text-xs text-gray-400 italic">
                  Como aparecerá: "<strong className="text-white">{displayFirstName} {displayLastName}</strong>"
                </p>
              </div>

              <p className="text-sm text-gray-400">Selecione um ou mais cargos:</p>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {CAREER_LEVELS.map(level => {
                  const isSelected = selectedLevels.includes(level.id);
                  const isPrimary = primaryLevel === level.id;
                  
                  return (
                    <div key={level.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-700/50 transition-colors border border-gray-700">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={level.id}
                          checked={isSelected}
                          onCheckedChange={() => toggleLevel(level.id)}
                          className="border-gray-600"
                        />
                        <label htmlFor={level.id} className="flex items-center gap-2 flex-1 cursor-pointer">
                          <Badge className={`${level.color} text-white text-xs`}>
                            {level.name}
                          </Badge>
                        </label>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-400">Principal</label>
                          <input
                            type="radio"
                            name="primary"
                            checked={isPrimary}
                            onChange={() => setPrimaryLevel(level.id)}
                            className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 focus:ring-green-500"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedLevels.length > 0 && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                  <p className="text-sm text-green-400">
                    ⭐ Função Principal: <strong>{CAREER_LEVELS.find(l => l.id === primaryLevel)?.name}</strong>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Esta será a função exibida no Plano de Carreira
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPromotingUser(null)} className="border-gray-600">
                Cancelar
              </Button>
              <Button 
                onClick={confirmPromotion} 
                disabled={isPromoting || selectedLevels.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isPromoting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Salvar Cargos ({selectedLevels.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {editingUserFull && (
        <UserEditModal
          user={editingUserFull}
          isOpen={true}
          onClose={() => setEditingUserFull(null)}
          onSuccess={handleSaveEditUser}
        />
      )}

      {/* MODAL DISPARADOR DE MENSAGENS */}
      {showMessageDispatcher && (
        <MessageDispatcher
          isOpen={showMessageDispatcher}
          onClose={() => setShowMessageDispatcher(false)}
          allUsers={allUsers}
        />
      )}
    </div>
  );
}