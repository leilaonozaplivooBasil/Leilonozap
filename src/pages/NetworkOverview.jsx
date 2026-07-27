import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fmtBR } from '@/lib/money';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;
const Auction = base44.entities.Auction;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Loader2, ChevronDown, ChevronRight, Award, Eye, Search, Pencil, Trash2, Network, Maximize2, Minimize2, Star, UserRound, Send, RotateCcw, TriangleAlert, ShieldCheck, Briefcase } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Link2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


import { forceSyncStats } from "@/functions/forceSyncStats";
import { linkOrphanUsers } from "@/functions/linkOrphanUsers";
import { cleanSiteDuplicates } from "@/functions/cleanSiteDuplicates"; // Updated import for new function
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import UserEditModal from "../components/admin/UserEditModal";
import MessageDispatcher from "../components/admin/MessageDispatcher";
import TreeHierarchy from "../components/network/TreeHierarchy";
import PortalPageHeader from "@/components/common/PortalPageHeader";
import { CAREER_LEVELS } from "@/lib/careerLevels";
import {
  buildStructureReport,
  buildExecutiveUpdate,
  descendantsOf,
  readExecutiveOwner,
  resolveEffectiveExecutive,
} from "@/lib/executiveStructure";

function UserCard({ user, level, onPromote, children, isExpanded, onToggle, isLinearView = false, allUsers = [], onEdit, onDelete }) {
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

  // 🔧 CORREÇÃO 2: Saldo formatado corretamente (agora em R$)
  const saldoReais = user.valora_pay_balance || 0;

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
            <Badge className={`${primaryLevelConfig.color} text-white text-xs px-3 py-1 font-bold ring-2 ring-white/20 inline-flex items-center gap-1`}>
              <Star className="w-3 h-3" />
              {primaryLevelConfig.name}
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
                        <Badge key={levelId} className={`${levelConfig.color} text-white text-[10px] inline-flex items-center gap-1 ${isPrimary ? 'ring-2 ring-white' : ''}`}>
                          {isPrimary && <Star className="w-2.5 h-2.5" />}
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
              <div className="text-white font-bold text-lg flex items-center justify-center gap-1.5">
                <UserRound className="w-4 h-4 text-gray-400" />
                {user.indicated_clients_count || 0}
              </div>
            </div>
            <div className="bg-green-900/30 rounded-lg p-2 text-center">
              <div className="text-gray-400 mb-1">Saldo R$</div>
              <div className="text-green-400 font-bold text-lg">
                R$ {fmtBR(saldoReais)}
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
          {/* Botão deletar no painel expandido */}
          {showDetails && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <Button
                size="sm"
                variant="destructive"
                className="w-full text-xs h-8 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => onDelete && onDelete(user)}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Deletar Usuário
              </Button>
            </div>
          )}
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

function NetworkTree({ users, onPromote, onEdit, onRelink, onDelete }) {
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  // Drag & drop state
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  // Helpers to avoid cycles
  const getDescendantIds = React.useCallback((id) => {
    const result = new Set();
    const stack = [id];
    while (stack.length) {
      const current = stack.pop();
      users.forEach(u => {
        if (u.referred_by_id === current && !result.has(u.id)) {
          result.add(u.id);
          stack.push(u.id);
        }
      });
    }
    return result;
  }, [users]);

  const isDropInvalid = React.useCallback((draggedId, targetId) => {
    if (!draggedId || !targetId) return false;
    if (draggedId === targetId) return true;
    const descendants = getDescendantIds(draggedId);
    return descendants.has(targetId);
  }, [getDescendantIds]);

  const handleDropOnUser = async (targetId, draggedId) => {
    if (!draggedId || !targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    // Permite mover mesmo quando o alvo é descendente (o handler resolve o ciclo)
    await onRelink?.(draggedId, targetId, true);
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDropOnRoot = async (draggedId) => {
    if (!draggedId) return;
    await onRelink?.(draggedId, null);
    setDraggingId(null);
    setDragOverId(null);
  };

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

  // Renderiza um usuário com seus filhos em cascata vertical
  const renderUserCascade = (user, level = 0) => {
    const children = users.filter(u => u.referred_by_id === user.id);
    const isExpanded = expandedUsers.has(user.id);
    const hasChildren = children.length > 0;

    const userLevels = Array.isArray(user.career_levels) ? user.career_levels : (user.career_levels ? [user.career_levels] : ['usuario']);
    const primaryLevel = user.primary_career_level || userLevels[0] || 'usuario';
    const primaryLevelConfig = CAREER_LEVELS.find(l => l.id === primaryLevel) || CAREER_LEVELS[0];

    const getInitials = (fullName) => {
      if (!fullName || fullName.trim() === '') return '??';
      const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
      if (nameParts.length === 1) return nameParts[0].substring(0, 2).toUpperCase();
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    };

    return (
      <div key={user.id} className="relative">
        {/* Card compacto do usuário */}
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border-2 ${primaryLevelConfig.borderColor} bg-gray-800/80 hover:bg-gray-800 transition-all cursor-pointer group ${dragOverId === user.id ? 'ring-2 ring-green-400' : ''}`}
          style={{ marginLeft: `${level * 40}px` }}
          draggable
          onDragStart={(e) => {
            setDraggingId(user.id);
            e.dataTransfer.setData('text/plain', String(user.id));
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={(e) => {
            if (!draggingId || draggingId === user.id) return;
            e.preventDefault(); // permite soltar mesmo em descendentes (ciclo será resolvido)
            setDragOverId(user.id);
          }}
          onDragEnter={(e) => {
            if (!draggingId || draggingId === user.id) return;
            e.preventDefault();
            setDragOverId(user.id);
          }}
          onDragLeave={() => {
            if (dragOverId === user.id) setDragOverId(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const dragged = e.dataTransfer.getData('text/plain');
            handleDropOnUser(user.id, dragged);
          }}
        >
          {/* Linha conectora visual */}
          {level > 0 && (
            <>
              <div className="absolute left-0 top-1/2 w-8 h-0.5 bg-gradient-to-r from-green-500/50 to-green-500/20"
                style={{ transform: 'translateX(-100%)' }}></div>
              <div className="absolute left-0 top-0 w-0.5 h-1/2 bg-gradient-to-b from-green-500/20 to-green-500/50"
                style={{ transform: 'translateX(-40px)' }}></div>
            </>
          )}

          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full ${primaryLevelConfig.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
            {getInitials(user.full_name)}
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-white font-semibold text-sm truncate">{user.full_name}</h4>
              <Badge className={`${primaryLevelConfig.color} text-white text-[10px] px-2 py-0.5`}>
                {primaryLevelConfig.name}
              </Badge>
            </div>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>

          {/* Stats rápidas */}
          <div className="flex items-center gap-3 text-xs">
            <div className="text-center">
              <div className="text-gray-400">Indicados</div>
              <div className="text-white font-bold">{user.indicated_clients_count || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Saldo</div>
              <div className="text-green-400 font-bold">R$ {fmtBR((user.valora_pay_balance || 0))}</div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 h-8 px-3 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onPromote(user);
              }}
            >
              <Award className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-blue-500 text-blue-400 hover:bg-blue-500/10 h-8 px-3 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(user);
              }}
            >
              <Pencil className="w-3 h-3" />
            </Button>

            <Button
              size="sm"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 h-8 px-3 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onDelete && onDelete(user);
              }}
              title="Deletar usuário e todos os dados"
            >
              <Trash2 className="w-3 h-3" />
            </Button>

            {/* Botão expandir/recolher */}
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(user.id);
                }}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
              >
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Filhos (indicados por este usuário) */}
        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-2">
            {children.map(child => renderUserCascade(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Usuários raiz (sem indicador)
  const rootUsers = users.filter(u => !u.referred_by_id || u.referred_by_id === null);

  // Ordena por quantidade de indicados
  const sortedRoots = [...rootUsers].sort((a, b) => {
    const aCount = users.filter(u => u.referred_by_id === a.id).length;
    const bCount = users.filter(u => u.referred_by_id === b.id).length;
    return bCount - aCount;
  });

  // Expandir todos automaticamente no início
  React.useEffect(() => {
    const allUserIds = new Set(users.map(u => u.id));
    setExpandedUsers(allUserIds);
  }, [users]);

  return (
    <div className="space-y-4 p-4">
      {/* Legenda */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-6">
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Linha verde = indicação direta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-gradient-to-r from-green-500 to-transparent"></div>
            <span>Indentação = nível hierárquico</span>
          </div>
        </div>
      </div>

      {/* Zona de soltar para raiz (Site Oficial) */}
      <div
        className={`rounded-lg border-2 border-dashed ${dragOverId === 'root' ? 'border-green-500 bg-green-500/10' : 'border-gray-700'} p-3 text-xs text-gray-400 mb-4`}
        onDragOver={(e) => {
          if (!draggingId) return;
          e.preventDefault();
          setDragOverId('root');
        }}
        onDragLeave={() => {
          if (dragOverId === 'root') setDragOverId(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          const dragged = e.dataTransfer.getData('text/plain');
          handleDropOnRoot(dragged);
        }}
      >
        Solte aqui para mover para “Leilão NoZap - Site Oficial”
      </div>

      {/* Árvore em cascata */}
      <div className="space-y-3">
        {sortedRoots.map(rootUser => renderUserCascade(rootUser, 0))}
      </div>

      {/* Estatísticas gerais */}
      <div className="mt-8 bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">{users.length}</div>
            <div className="text-xs text-gray-400">Total no Sistema</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{rootUsers.length}</div>
            <div className="text-xs text-gray-400">Licenciados Raiz</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">
              {users.reduce((sum, u) => sum + (u.indicated_clients_count || 0), 0)}
            </div>
            <div className="text-xs text-gray-400">Total de Indicações</div>
          </div>
        </div>
      </div>
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
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Faixa de estatísticas recolhível + árvore em tela cheia (mais espaço de trabalho)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [treeFullscreen, setTreeFullscreen] = useState(false);

  // A árvore só mostra gente ativa; quem foi excluído fica na Lixeira (active=false)
  const activeUsers = useMemo(() => allUsers.filter(u => u.active !== false), [allUsers]);
  const trashedUsers = useMemo(() => allUsers.filter(u => u.active === false), [allUsers]);

  // Auditoria: quem excluiu/moveu/promoveu quem (gravada pelo servidor em system_logs)
  const loadAudit = useCallback(async () => {
    try {
      const rows = await base44.entities.SystemLog?.list?.('-created_date', 300);
      const list = (Array.isArray(rows) ? rows : [])
        .map((r) => ({ ...(r.raw_base44 || {}), created_at: r.created_at || r.created_date }))
        .filter((r) => r.kind === 'network_audit');
      setAuditLog(list);
    } catch {
      setAuditLog([]);
    }
  }, []);

  useEffect(() => { loadAudit(); }, [loadAudit, allUsers.length]);

  // Último registro de exclusão de cada usuário — mostrado na Lixeira
  const trashInfoByUser = useMemo(() => {
    const map = {};
    for (const e of auditLog) {
      if (e.action !== 'trash' || !e.target_id) continue;
      const atual = map[e.target_id];
      if (!atual || new Date(e.at || e.created_at) > new Date(atual.at || atual.created_at)) {
        map[e.target_id] = e;
      }
    }
    return map;
  }, [auditLog]);

  // Carteira dos Sócios Executivos (1% sobre a própria estrutura)
  const structure = useMemo(() => buildStructureReport(activeUsers), [activeUsers]);
  const structureRef = useRef(structure);
  useEffect(() => { structureRef.current = structure; }, [structure]);

  const siteLicensee = useMemo(() => {
    return allUsers.find(u =>
      (u.email && u.email.toLowerCase() === 'site@leilaonozap.com') ||
      (u.full_name && u.full_name.toLowerCase().includes('site oficial'))
    ) || null;
  }, [allUsers]);

  const fetchData = useCallback(async () => {
    // 🔧 CORREÇÃO CRÍTICA: Validar ADMIN PRIMEIRO
    const savedUser = localStorage.getItem('currentUser');
    let user = null;

    if (savedUser) {
      user = JSON.parse(savedUser);
      setCurrentUser(user);

      // admin OU cargos que gerenciam rede (Distribuidor/Loja Física/Ponto/Parceiro/Licenciado)
      const REDE_CARGOS = ['distribuidor', 'loja_fisica', 'ponto_retirada', 'parceiro', 'licenciado'];
      const podeRede = user.role === 'admin' || user.role === 'super_admin' ||
        (Array.isArray(user.career_levels) && user.career_levels.some((c) => REDE_CARGOS.includes(c)));
      if (!podeRede) {
        toast.error("Acesso negado.");
        setIsLoading(false);
        return;
      }
    } else {
      toast.error("Acesso negado. Faça login como administrador.");
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

      // Auto-link órfãos (role=user) ao Site Oficial
      try {
        const hasOrphans = (Array.isArray(users) ? users : []).some(u => !u.referred_by_id && u.role === 'user');
        if (hasOrphans) {
          await linkOrphanUsers();
          const refreshed = await AppUser.list("-created_date", 1000);
          setAllUsers(Array.isArray(refreshed) ? refreshed : (Array.isArray(users) ? users : []));
        }
      } catch (e) {
        console.debug('Auto-link órfãos ignorado:', e?.message);
      }

      console.log("✅ Dados carregados:", users.length, "usuários");
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do Sistema de Alavancagem."); // Changed here
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const total = allUsers.length;
    const byLevel = CAREER_LEVELS.slice().reverse().map(level => ({
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

  /**
   * Grava alterações de um usuário na rede.
   * ⚠️ Antes o painel chamava a função 'updateUserNetwork', que NÃO existe na API
   * (404). O erro era engolido e a UI dizia "Vínculo atualizado!" sem nada mudar —
   * era por isso que arrastar/promover não associava. Agora usa adminUpdateUser,
   * que existe, tem guard de admin e confirma a gravação.
   */
  const saveUserFields = useCallback(async (userId, updates) => {
    let actor = null;
    try { actor = JSON.parse(localStorage.getItem('currentUser') || '{}')?.id || null; } catch { actor = null; }
    if (!actor) {
      throw new Error('faça login como admin para alterar a rede');
    }
    const result = await base44.functions.invoke('adminUpdateUser', {
      userId,
      updates,
      actorId: actor,
    });
    if (!result || result.success !== true) {
      throw new Error(result?.error || 'o servidor não confirmou a gravação');
    }
    // Confere campo a campo se o banco gravou mesmo o que foi pedido — sem isso,
    // um update ignorado silenciosamente voltaria como "sucesso".
    const saved = result.user || {};
    // Campos da carteira executiva podem ser gravados no campo de compatibilidade
    // enquanto a coluna dedicada não existe — a conferência estrita não se aplica.
    const IGNORA_CONFERENCIA = ['executive_owner_id', 'executive_owner_pinned', 'executive_owner_since', 'licenciado_context'];
    const divergente = Object.keys(updates).filter((k) => !IGNORA_CONFERENCIA.includes(k)).find((k) => {
      const pedido = updates[k];
      const gravado = saved[k];
      if (pedido === null || pedido === undefined) return !(gravado === null || gravado === undefined);
      if (Array.isArray(pedido)) return JSON.stringify(pedido) !== JSON.stringify(gravado);
      return String(pedido) !== String(gravado);
    });
    if (divergente) {
      throw new Error(`o servidor não gravou o campo "${divergente}" (permissão ou regra do banco)`);
    }
    return saved;
  }, []);

  // Atribui um executivo a alguém — opcionalmente para toda a equipe abaixo
  const assignExecutive = useCallback(async (targetUser, executiveId, { cascade = false, pinned = false } = {}) => {
    try {
      await saveUserFields(targetUser.id, buildExecutiveUpdate(executiveId, { pinned }));
      let afetados = 1;
      if (cascade) {
        // quem tem escolha fixada não é arrastado pela mudança em massa
        const equipe = descendantsOf(targetUser.id, allUsers).filter(u => !readExecutiveOwner(u).pinned);
        for (const membro of equipe) {
          await saveUserFields(membro.id, buildExecutiveUpdate(executiveId, { pinned: false }));
          afetados += 1;
        }
      }
      const nome = allUsers.find(u => u.id === executiveId)?.full_name || 'executivo';
      toast.success(`Estrutura vinculada a ${nome} — ${afetados} cadastro(s).`);
      await fetchData();
      await loadAudit();
    } catch (error) {
      toast.error('Erro ao vincular estrutura: ' + (error?.message || 'falha'));
    }
  }, [allUsers, saveUserFields, fetchData, loadAudit]);

  // Carga inicial: vincula todo mundo que está sem executivo de uma vez só
  const assignAllOrphans = useCallback(async (executiveId) => {
    const alvos = structureRef.current?.orfaos || [];
    if (!alvos.length) return;
    const nome = allUsers.find(u => u.id === executiveId)?.full_name || 'executivo';
    if (!window.confirm(`Vincular ${alvos.length} cadastro(s) à estrutura de ${nome}?`)) return;
    toast.info(`Vinculando ${alvos.length} cadastro(s)…`);
    let ok = 0;
    for (const u of alvos) {
      try {
        await saveUserFields(u.id, buildExecutiveUpdate(executiveId, { pinned: false }));
        ok += 1;
      } catch { /* segue para os demais e reporta no fim */ }
    }
    toast[ok === alvos.length ? 'success' : 'warning'](
      `${ok} de ${alvos.length} vinculados a ${nome}.`
    );
    await fetchData();
    await loadAudit();
  }, [allUsers, saveUserFields, fetchData, loadAudit]);

  // Normaliza a cascata: todo descendente passa a pertencer ao executivo da raiz
  // da estrutura dele. Corrige vínculos antigos feitos antes da cascata existir.
  const normalizarCascata = useCallback(async () => {
    const byId = new Map(allUsers.map(u => [u.id, u]));
    const correcoes = [];

    for (const u of activeUsers) {
      const proprio = readExecutiveOwner(u);
      if (proprio.pinned) continue; // escolha fixada não é arrastada

      // sobe a linha até achar quem tem executivo definido (a raiz da estrutura)
      const visto = new Set([u.id]);
      let cur = u.referred_by_id ? byId.get(u.referred_by_id) : null;
      let executivoDaRaiz = null;
      while (cur && !visto.has(cur.id)) {
        visto.add(cur.id);
        const dono = readExecutiveOwner(cur);
        if (dono.id) { executivoDaRaiz = dono.id; break; }
        cur = cur.referred_by_id ? byId.get(cur.referred_by_id) : null;
      }

      if (executivoDaRaiz && proprio.id !== executivoDaRaiz) {
        correcoes.push({ user: u, de: proprio.id, para: executivoDaRaiz });
      }
    }

    if (!correcoes.length) {
      toast.success('Nada a corrigir — toda estrutura já segue o executivo da raiz.');
      return;
    }
    if (!window.confirm(
      `Corrigir ${correcoes.length} cadastro(s) para o executivo da estrutura acima deles?`
    )) return;

    toast.info(`Aplicando cascata em ${correcoes.length} cadastro(s)…`);
    let ok = 0;
    for (const c of correcoes) {
      try {
        await saveUserFields(c.user.id, buildExecutiveUpdate(c.para, { pinned: false }));
        ok += 1;
      } catch { /* segue */ }
    }
    toast[ok === correcoes.length ? 'success' : 'warning'](`${ok} de ${correcoes.length} corrigidos.`);
    await fetchData();
    await loadAudit();
  }, [allUsers, activeUsers, saveUserFields, fetchData, loadAudit]);

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
      const base44Client = (await import('@/api/base44Client')).base44;
      await saveUserFields(promotingUser.id, {
          career_levels: selectedLevels,
          primary_career_level: primaryLevel,
          display_first_name: displayFirstName.trim() || null,
          display_last_name: displayLastName.trim() || null
        });

      await fetchData();

      const levelNames = selectedLevels.map(id => CAREER_LEVELS.find(l => l.id === id)?.name).join(', ');
      const primaryName = CAREER_LEVELS.find(l => l.id === primaryLevel)?.name;
   toast.success(`${promotingUser.full_name} agora é: ${levelNames}!\nFunção principal: ${primaryName}`);

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
      // A tabela app_users tem commission_balance; 'valora_pay_balance' não existe
      // como coluna — mandar isso fazia o update inteiro falhar.
      await saveUserFields(selectedLicenseeId, {
        commission_balance: (licensee.commission_balance || 0) + amount,
      });

      toast.success(`R$ ${fmtBR(amount)} creditados!`);
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

    const licensee = allUsers.find(u => u.id === selectedLicenseeForLink);
    if (!licensee) {
      toast.error("Licenciado não encontrado.");
      return;
    }

    const confirmLink = window.confirm(`Vincular ${selectedUsersToLink.length} usuário(s) ao licenciado ${licensee.full_name}?`);
    if (!confirmLink) return;

    setIsLinking(true);
    try {
      const base44Client = (await import('@/api/base44Client')).base44;

      for (const userId of selectedUsersToLink) {
        if (userId === licensee.id) continue; // ignora auto-vínculo
        const userToLink = allUsers.find(u => u.id === userId);
        if (!userToLink) continue;

        // Evita ciclo imediato (quando o licenciado é indicado pelo usuário que será movido)
        if (licensee.referred_by_id === userToLink.id) {
          await saveUserFields(licensee.id, { referred_by_id: null });
        }

        await saveUserFields(userId, { referred_by_id: licensee.id });
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

  // Atualiza vínculo via arrastar-e-soltar
  const handleRelink = async (draggedId, newParentId, resolveCycles = false) => {
    try {
      let targetId = newParentId;
      if (!newParentId) {
        const site = allUsers.find(u =>
          (u.email && u.email.toLowerCase() === 'site@leilaonozap.com') ||
          (u.full_name && u.full_name.toLowerCase().includes('site oficial'))
        );
        targetId = site?.id || null;
      }

      // Se necessário, resolve possíveis ciclos: se o alvo for descendente do arrastado, destacamos o alvo para raiz antes
      if (resolveCycles && targetId) {
        const isDescendant = (ancestorId, maybeDescId) => {
          const queue = [ancestorId];
          const seen = new Set();
          while (queue.length) {
            const curr = queue.shift();
            allUsers.forEach(u => {
              if (u.referred_by_id === curr && !seen.has(u.id)) {
                if (u.id === maybeDescId) {
                  seen.add(u.id);
                  queue.length = 0;
                } else {
                  seen.add(u.id);
                  queue.push(u.id);
                }
              }
            });
          }
          return seen.has(maybeDescId);
        };

        if (isDescendant(draggedId, targetId)) {
          // Quebra o ciclo: solta o alvo na raiz antes de mover o arrastado
          const base44Client = (await import('@/api/base44Client')).base44;
          await saveUserFields(targetId, { referred_by_id: null });
        }
      }

      await saveUserFields(draggedId, { referred_by_id: targetId });

      // Mudar de lugar na árvore muda a ESTRUTURA a que a pessoa pertence.
      // Sem isto, ela levava junto a carteira executiva do lugar antigo — foi o que
      // aconteceu com o Gabriel: movido para a linha do Ribeiro, continuou na
      // carteira do Luiz, e o 1% da venda iria para o executivo errado.
      try {
        const byId = new Map(allUsers.map(u => [u.id, u]));
        const novoPai = byId.get(targetId);
        const efetivo = novoPai ? resolveEffectiveExecutive(novoPai, byId) : null;
        const movido = byId.get(draggedId);
        if (efetivo?.executiveId && movido && !readExecutiveOwner(movido).pinned) {
          const equipe = [movido, ...descendantsOf(draggedId, allUsers)]
            .filter(u => !readExecutiveOwner(u).pinned);
          for (const membro of equipe) {
            await saveUserFields(membro.id, buildExecutiveUpdate(efetivo.executiveId, { pinned: false }));
          }
          const nomeExec = allUsers.find(u => u.id === efetivo.executiveId)?.full_name || 'executivo';
          toast.success(`Vínculo atualizado — estrutura agora é de ${nomeExec} (${equipe.length} cadastro(s)).`);
        } else {
          toast.success('Vínculo atualizado!');
        }
      } catch {
        toast.success('Vínculo atualizado! (confira a estrutura executiva)');
      }

      await fetchData();
      await loadAudit();
    } catch (error) {
      toast.error('Erro ao mover: ' + error.message);
    }
  };

  const handleCleanDuplicates = async () => {
    const confirmClean = window.confirm(
      "ATENÇÃO: Remover cadastros duplicados?\n\nEsta ação é irreversível e removerá todos os usuários com o mesmo e-mail, exceto o mais recente."
    );
    if (!confirmClean) return;

    setIsCleaningDuplicates(true);
    toast.info("Buscando duplicatas...");

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
        toast.success("Nenhum cadastro duplicado encontrado!");
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

        toast.success(`${duplicatesRemoved} duplicatas removidas!\n${duplicateEmails.length} emails tinham cadastros duplicados.`);
      }

      await fetchData();

    } catch (error) {
      console.error("❌ Erro ao limpar duplicatas:", error);
      toast.error("Erro ao limpar duplicatas: " + error.message);
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const handleLinkOrphanUsers = async () => {
    const confirmLink = window.confirm(
      "Vincular todos os usuários SEM indicação ao Licenciado Site?\n\nEsta ação vai buscar todos os usuários órfãos e vinculá-los automaticamente."
    );
    if (!confirmLink) return;

    setIsLinkingOrphans(true);
    toast.info("Buscando usuários órfãos...");

    try {
      const response = await linkOrphanUsers();

      if (response.data && response.data.success) {
        const { linkedCount, totalOrphans, siteLicenseeName } = response.data;
        toast.success(`${linkedCount} de ${totalOrphans} usuários vinculados ao "${siteLicenseeName}"!`);

        await fetchData();
      } else {
        throw new Error(response.data?.error || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Erro ao vincular órfãos:", error);
      toast.error("Erro ao vincular usuários: " + error.message);
    } finally {
      setIsLinkingOrphans(false);
    }
  };

  const handleCleanSiteDuplicates = async () => {
    const confirmClean = window.confirm(
      "LIMPAR DUPLICATAS DO SITE OFICIAL?\n\n" +
      "Esta ação vai:\n" +
      "1. Buscar TODOS os cadastros com 'Site Oficial' no nome\n" +
      "2. Manter APENAS o mais antigo\n" +
      "3. Deletar os duplicados\n\n" +
      "ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\n" +
      "Deseja continuar?"
    );
    if (!confirmClean) return;

    setIsCleaningDuplicates(true);
    toast.info("Buscando duplicatas...");

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
              `${response.data.duplicatesRemoved} duplicatas removidas!\n` +
              `Mantido: ${response.data.siteLicensee.full_name}` +
              `${response.data.failedDeletions > 0 ? `\n${response.data.failedDeletions} falharam` : ''}`
            );
          } else if (response.data.action === "already_clean") {
            console.log("✅ Sistema já está limpo");
            toast.success("Site Oficial já está único!");
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
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUserFull(user);
  };

  const handleSaveEditUser = async (salvo) => {
    const anterior = editingUserFull;
    setEditingUserFull(null);

    // CASCATA — regra validada: definir o executivo de uma estrutura vale para
    // TODA a estrutura, não só para o nó escolhido. Antes isso só acontecia quando
    // a troca era feita pela linha da carteira; pelo modal ficava só na pessoa e os
    // filhos continuavam no executivo antigo (Iara, Diana, Ponto de Retirada e
    // Elenice ficaram no Luiz quando o Bangu foi para o Ribeiro).
    try {
      const antes = readExecutiveOwner(anterior || {});
      const agora = readExecutiveOwner(salvo || {});
      if (agora.id && agora.id !== antes.id && anterior?.id) {
        const equipe = descendantsOf(anterior.id, allUsers).filter(u => !readExecutiveOwner(u).pinned);
        let n = 0;
        for (const membro of equipe) {
          try {
            await saveUserFields(membro.id, buildExecutiveUpdate(agora.id, { pinned: false }));
            n += 1;
          } catch { /* segue e reporta no fim */ }
        }
        if (n) {
          const nome = allUsers.find(u => u.id === agora.id)?.full_name || 'executivo';
          const pulados = descendantsOf(anterior.id, allUsers).length - n;
          toast.success(
            `Estrutura inteira movida para ${nome}: ${n} cadastro(s)` +
            (pulados > 0 ? ` · ${pulados} com escolha fixada não foram alterados` : '')
          );
        }
      }
    } catch (e) {
      toast.error('Alteração salva, mas a cascata falhou: ' + (e?.message || 'erro'));
    }

    await fetchData();
    await loadAudit();
    toast.success("Usuário atualizado com sucesso!");
  };

  /* ------------------------------------------------------------------ */
  /* LIXEIRA — exclusão que não quebra a estrutura de negócio            */
  /*                                                                     */
  /* Excluir NÃO apaga nada do banco: marca o usuário como inativo       */
  /* (active=false) e religa os indicados dele a quem indicava ele, para */
  /* a rede não ficar com gente órfã. Dá para restaurar depois.          */
  /* ------------------------------------------------------------------ */
  const actorId = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser') || '{}')?.id || null; } catch { return null; }
  })();

  // Quantas pessoas existem abaixo de alguém (equipe inteira)
  const countDescendants = useCallback((userId) => {
    const stack = [userId];
    const seen = new Set();
    while (stack.length) {
      const cur = stack.pop();
      for (const u of allUsers) {
        if (u.referred_by_id === cur && !seen.has(u.id)) {
          seen.add(u.id);
          stack.push(u.id);
        }
      }
    }
    return seen.size;
  }, [allUsers]);

  // Abre o diálogo (a árvore e a tabela chamam isto no lugar de deletar direto)
  const handleDeleteUser = (user) => {
    if (user.active === false) {
      handleRestoreUser(user);
      return;
    }
    setDeleteTarget(user);
    setDeleteConfirmText('');
  };

  const handleMoveToTrash = async () => {
    const user = deleteTarget;
    if (!user) return;
    setIsDeleting(true);
    setDeletingUserId(user.id);
    try {
      // 1) Preserva a estrutura: os indicados diretos sobem para o indicador dele
      const directChildren = allUsers.filter(u => u.referred_by_id === user.id);
      const newParent = user.referred_by_id || null;
      for (const child of directChildren) {
        await saveUserFields(child.id, { referred_by_id: newParent });
      }

      // 2) Manda para a lixeira (nada é apagado)
      const result = await base44.functions.invoke('adminUpdateUser', {
        userId: user.id,
        updates: { active: false },
        actorId,
      });
      if (!result || result.success !== true) {
        throw new Error(result?.error || 'não foi possível concluir');
      }

      toast.success(
        directChildren.length
          ? `${user.full_name} foi para a lixeira. ${directChildren.length} indicado(s) passaram para ${newParent ? 'o indicador acima' : 'a raiz'}.`
          : `${user.full_name} foi para a lixeira.`
      );
      setDeleteTarget(null);
      setDeleteConfirmText('');
      await fetchData();
      await loadAudit();
    } catch (error) {
      toast.error('Erro ao excluir: ' + (error?.message || 'falha'));
    } finally {
      setIsDeleting(false);
      setDeletingUserId(null);
    }
  };

  const handleRestoreUser = async (user) => {
    try {
      const result = await base44.functions.invoke('adminUpdateUser', {
        userId: user.id,
        updates: { active: true },
        actorId,
      });
      if (!result || result.success !== true) {
        throw new Error(result?.error || 'não foi possível restaurar');
      }
      toast.success(`${user.full_name} foi restaurado.`);
      await fetchData();
      await loadAudit();
    } catch (error) {
      toast.error('Erro ao restaurar: ' + (error?.message || 'falha'));
    }
  };

  // Soltar da rede: vira raiz, sem indicador
  const handleDetachUser = async (user) => {
    try {
      await saveUserFields(user.id, { referred_by_id: null });
      toast.success(`${user.full_name} agora é raiz da rede.`);
      await fetchData();
    } catch (error) {
      toast.error('Erro ao soltar da rede: ' + (error?.message || 'falha'));
    }
  };

  // ⚠️ O spinner de tela cheia só aparece no PRIMEIRO carregamento. Antes ele
  // voltava a cada refresh (editar, promover, mover) e remontava a página inteira —
  // a árvore perdia modo, zoom e o que estava expandido ("voltava pro modo lista").
  if (isLoading && !hasLoadedOnce) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-green-500" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
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
    <div className="min-h-screen bg-gray-900 text-white p-3 sm:p-4 md:p-6">
      {/* Largura ampliada (26/07): sem sidebar lateral, a tela inteira fica para a
          gestão de usuários e a árvore genealógica. */}
      <div className="max-w-[1800px] mx-auto">
        <PortalPageHeader
          icon={Users}
          title="Sistema de Alavancagem"
          subtitle="Visão completa do sistema multinível"
          accentColor="green"
          actions={
            <Button
              onClick={() => setShowMessageDispatcher(true)}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Send className="w-4 h-4 mr-2" />
              Disparar Mensagens
            </Button>
          }
        />

        {/* Resumo da rede — faixa compacta e recolhível: ocupa pouca altura para
            deixar a árvore genealógica em primeiro plano. */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => setShowStats((v) => !v)}
              className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-emerald-400/90 hover:text-emerald-300 transition-colors"
            >
              {showStats ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Resumo da rede
            </button>
            <div className="flex items-center gap-3 text-[12px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-500" />
                <strong className="text-white">{stats.total}</strong> no sistema
              </span>
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-green-500" />
                <strong className="text-green-400">R$ {fmtBR(stats.totalVolume)}</strong>
              </span>
            </div>
          </div>

          {showStats && (
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(130px,1fr))]">
              {stats.byLevel.map(level => (
                <div
                  key={level.id}
                  className={`rounded-lg bg-gray-800/70 border ${level.borderColor} px-3 py-2`}
                >
                  <div className={`text-[11px] ${level.textColor} font-semibold truncate`} title={level.name}>
                    {level.name}
                  </div>
                  <div className="text-lg font-bold text-white leading-tight">{level.count}</div>
                </div>
              ))}
            </div>
          )}
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
                              {lic.full_name} - R$ {fmtBR((lic.valora_pay_balance || 0))}
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

        {/* Gestão de usuários — bloco principal de trabalho, ocupa a largura toda */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">Gerenciamento de Usuários e Sistema de Alavancagem</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="licensees" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-gray-700/50">
                <TabsTrigger value="licensees">
                  <Network className="w-4 h-4 mr-2" />
                  Árvore da Rede
                </TabsTrigger>
                <TabsTrigger value="users">
                  <Users className="w-4 h-4 mr-2" />
                  Usuários Gerais ({activeUsers.length})
                </TabsTrigger>
                <TabsTrigger value="estruturas">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Estruturas ({structure.executives.length})
                  {structure.orfaos.length > 0 && (
                    <span className="ml-1.5 px-1.5 rounded-full bg-amber-500/25 text-amber-300 text-[10px] font-bold">
                      {structure.orfaos.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="trash">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Lixeira ({trashedUsers.length})
                </TabsTrigger>
              </TabsList>

              {/* ABA 1: ÁRVORE MULTINÍVEL */}
              <TabsContent value="licensees" className="mt-4">
                <div
                  className={
                    treeFullscreen
                      ? "fixed inset-0 z-[120] bg-gray-950 flex flex-col"
                      : "rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden"
                  }
                >
                  <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-700 bg-gray-900/60">
                    <Network className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-[13px] font-semibold text-green-400">
                      Sistema Multinível — Visualização em Árvore
                    </span>
                    <span className="text-[11px] text-gray-500 hidden sm:inline">
                      arraste uma pessoa sobre outra para mudar o indicador (pede confirmação)
                    </span>
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTreeFullscreen((v) => !v)}
                      className="h-7 text-[11px] bg-gray-100 border-gray-300 text-gray-900 hover:bg-white hover:text-black"
                      title={treeFullscreen ? "Sair da tela cheia" : "Abrir em tela cheia"}
                    >
                      {treeFullscreen ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5 mr-1.5" />
                          Sair da tela cheia
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
                          Tela cheia
                        </>
                      )}
                    </Button>
                  </div>

                  {/* A árvore controla o próprio zoom/pan — sem scroll externo */}
                  <div className={treeFullscreen ? "flex-1 min-h-0 overflow-hidden" : ""}>
                    {allUsers.length > 0 ? (
                      <TreeHierarchy
                        users={activeUsers}
                        fullHeight={treeFullscreen}
                        onEdit={handleEditUser}
                        onDelete={handleDeleteUser}
                        onPromote={handlePromote}
                        onRelink={handleRelink}
                        onDetach={handleDetachUser}
                        allUsers={allUsers}
                      />
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>Nenhum usuário no sistema ainda.</p>
                      </div>
                    )}
                  </div>
                </div>
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
                                    {(referrer || siteLicensee) ? (
                                      <div className="flex flex-col">
                                        <span className="text-green-400 font-semibold text-sm">
                                          {(referrer || siteLicensee).full_name}
                                        </span>
                                        <span className="text-xs text-gray-500">{((referrer || siteLicensee).nickname || 'Sem apelido')}</span>
                                        <span className="text-xs text-gray-600">{(referrer || siteLicensee).email}</span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-500">Sem indicação</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={`${primaryLevelConfig.color} text-white font-semibold inline-flex items-center gap-1`}>
                                      <Star className="w-3 h-3" />
                                      {primaryLevelConfig.name}
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
                                        title="Editar usuário"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteUser(user)}
                                        className="text-red-400 hover:text-red-300"
                                        title="Deletar usuário"
                                        disabled={isDeleting && deletingUserId === user.id}
                                      >
                                        {isDeleting && deletingUserId === user.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-4 h-4" />
                                        )}
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
              {/* ABA 3: ESTRUTURAS EXECUTIVAS — destino do 1% de cada estrutura */}
              <TabsContent value="estruturas" className="mt-4 space-y-4">
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-700 bg-gray-900/60 flex-wrap">
                    <Briefcase className="w-4 h-4 text-purple-300 flex-shrink-0" />
                    <span className="text-[13px] font-semibold text-purple-300">Estruturas de Negócio</span>
                    <span className="text-[11px] text-gray-500">
                      o Sócio Executivo recebe 1% sobre a própria estrutura — cada licenciado precisa ter um dono definido
                    </span>
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={normalizarCascata}
                      className="h-7 px-2 text-[11px] bg-gray-100 border-gray-300 text-gray-900 hover:bg-white"
                      title="Faz cada descendente seguir o executivo da raiz da estrutura dele"
                    >
                      <Network className="w-3.5 h-3.5 mr-1.5" />
                      Aplicar cascata em toda a rede
                    </Button>
                  </div>

                  {structure.executives.length === 0 ? (
                    <p className="text-center py-8 text-[12px] text-gray-500">
                      Nenhum Sócio Executivo cadastrado. Promova alguém ao cargo para montar as carteiras.
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-700/60">
                      {structure.carteiras.map(({ executive, membros, definidos, herdados }) => (
                        <div key={executive.id} className="px-4 py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white text-[11px] font-bold overflow-hidden flex-shrink-0">
                              {executive.avatar_url
                                ? <img src={executive.avatar_url} alt="" className="w-full h-full object-cover" />
                                : (executive.full_name || '??').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] text-white font-medium truncate">{executive.full_name}</p>
                              <p className="text-[11px] text-gray-500">Sócio Executivo · 1% sobre esta estrutura</p>
                            </div>
                            <div className="flex-1" />
                            <div className="text-right">
                              <p className="text-[13px] text-purple-300 font-bold">{membros.length} na carteira</p>
                              <p className="text-[10.5px] text-gray-500">{definidos} definidos · {herdados} herdados</p>
                            </div>
                          </div>

                          {membros.length > 0 && (
                            <div className="mt-2 rounded-lg border border-gray-700/70 divide-y divide-gray-700/50">
                              {membros.map(({ user: m, source }) => {
                                const lv = CAREER_LEVELS.find(l => l.id === (m.primary_career_level || 'usuario')) || CAREER_LEVELS[0];
                                const fixado = readExecutiveOwner(m).pinned;
                                return (
                                  <div key={m.id} className="flex items-center gap-2.5 px-2.5 py-1.5 flex-wrap hover:bg-white/[0.03]">
                                    <span className={`w-6 h-6 rounded-full ${lv.color} flex items-center justify-center text-white text-[9px] font-bold overflow-hidden flex-shrink-0`}>
                                      {m.avatar_url
                                        ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                                        : (m.full_name || '??').slice(0, 2).toUpperCase()}
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block text-[12px] text-gray-200 truncate">{m.full_name}</span>
                                      <span className={`block text-[10px] ${lv.textColor}`}>
                                        {lv.name}
                                        <span className="text-gray-600"> · {source}{fixado ? ' · fixado' : ''}</span>
                                      </span>
                                    </span>
                                    <div className="flex-1" />
                                    {/* trocar o executivo desta pessoa direto na linha */}
                                    <Select
                                      value={executive.id}
                                      onValueChange={(novoExec) => {
                                        if (novoExec === executive.id) return;
                                        assignExecutive(m, novoExec, { cascade: true, pinned: true });
                                      }}
                                    >
                                      <SelectTrigger className="w-52 h-7 bg-gray-800 border-gray-600 text-white text-[11.5px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                        {structure.executives.map(e => (
                                          <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Alerta: licenciados sem destino para o 1% */}
                <div className={`rounded-lg border overflow-hidden ${
                  structure.orfaos.length ? 'border-amber-500/40 bg-amber-900/10' : 'border-gray-700 bg-gray-800/50'
                }`}>
                  <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-700 bg-gray-900/60">
                    <TriangleAlert className={`w-4 h-4 flex-shrink-0 ${structure.orfaos.length ? 'text-amber-400' : 'text-gray-500'}`} />
                    <span className={`text-[13px] font-semibold ${structure.orfaos.length ? 'text-amber-300' : 'text-gray-400'}`}>
                      Sem executivo definido ({structure.orfaos.length})
                    </span>
                    <span className="text-[11px] text-gray-500">
                      enquanto estiverem aqui, o 1% dessas estruturas não tem para quem ir
                    </span>
                    <div className="flex-1" />
                    {structure.orfaos.length > 0 && structure.executives.length > 0 && (
                      <Select onValueChange={(execId) => assignAllOrphans(execId)}>
                        <SelectTrigger className="w-64 h-8 bg-gray-700 border-gray-600 text-white text-[12px]">
                          <SelectValue placeholder={`Vincular todos os ${structure.orfaos.length} a…`} />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          {structure.executives.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {structure.orfaos.length === 0 ? (
                    <p className="text-center py-6 text-[12px] text-gray-500">
                      Todo licenciado ativo tem um executivo responsável.
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-700/60 max-h-96 overflow-y-auto">
                      {structure.orfaos.map((u) => {
                        const lv = CAREER_LEVELS.find(l => l.id === (u.primary_career_level || 'usuario')) || CAREER_LEVELS[0];
                        return (
                          <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 flex-wrap">
                            <div className={`w-8 h-8 rounded-full ${lv.color} flex items-center justify-center text-white text-[10px] font-bold overflow-hidden flex-shrink-0`}>
                              {u.avatar_url
                                ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                : (u.full_name || '??').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12.5px] text-gray-200 truncate">{u.full_name}</p>
                              <p className={`text-[10.5px] ${lv.textColor}`}>{lv.name}</p>
                            </div>
                            <Select onValueChange={(execId) => assignExecutive(u, execId, { cascade: true })}>
                              <SelectTrigger className="w-56 h-8 bg-gray-700 border-gray-600 text-white text-[12px]">
                                <SelectValue placeholder="Vincular a um executivo…" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                {structure.executives.map(e => (
                                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ABA 4: LIXEIRA — nada foi apagado, dá para restaurar */}
              <TabsContent value="trash" className="mt-4">
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-700 bg-gray-900/60">
                    <Trash2 className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-[13px] font-semibold text-red-300">Lixeira</span>
                    <span className="text-[11px] text-gray-500">
                      ninguém é apagado do banco — quem está aqui sai da árvore e perde o acesso, e pode voltar quando você quiser
                    </span>
                  </div>

                  {trashedUsers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">A lixeira está vazia.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-700/60">
                      {trashedUsers.map((u) => {
                        const lv = CAREER_LEVELS.find(l => l.id === (u.primary_career_level || 'usuario')) || CAREER_LEVELS[0];
                        return (
                          <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/20">
                            <div className={`w-9 h-9 rounded-full ${lv.color} flex items-center justify-center text-white text-[11px] font-bold overflow-hidden flex-shrink-0 opacity-70`}>
                              {u.avatar_url
                                ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                : (u.full_name || '??').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] text-gray-300 truncate">{u.full_name}</p>
                              <p className="text-[11px] text-gray-500 truncate">{u.email} · {lv.name}</p>
                              {(() => {
                                const reg = trashInfoByUser[u.id];
                                if (!reg) {
                                  return (
                                    <p className="text-[10.5px] text-gray-600 truncate">
                                      excluído antes do registro de auditoria
                                    </p>
                                  );
                                }
                                const quando = reg.at || reg.created_at;
                                return (
                                  <p className="text-[10.5px] text-amber-400/80 truncate flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                                    excluído por {reg.actor_name || reg.actor_email || 'admin'}
                                    {quando && ` · ${new Date(quando).toLocaleString('pt-BR')}`}
                                  </p>
                                );
                              })()}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRestoreUser(u)}
                              className="h-8 text-[12px] bg-emerald-100 border-emerald-300 text-emerald-900 hover:bg-emerald-50 font-semibold"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                              Restaurar
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Histórico de ações da rede — quem fez o quê */}
                <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-700 bg-gray-900/60">
                    <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-[13px] font-semibold text-amber-300">Registro de ações</span>
                    <span className="text-[11px] text-gray-500">
                      toda exclusão, restauração, mudança de indicador e promoção fica registrada com autor e horário
                    </span>
                  </div>
                  {auditLog.length === 0 ? (
                    <p className="text-center py-8 text-[12px] text-gray-500">
                      Nenhuma ação registrada ainda.
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-700/60 max-h-80 overflow-y-auto">
                      {auditLog.slice(0, 100).map((e, i) => {
                        const rotulo = {
                          trash: 'excluiu',
                          restore: 'restaurou',
                          move: 'moveu',
                          promote: 'promoveu',
                          update: 'editou',
                        }[e.action] || e.action;
                        const cor = {
                          trash: 'text-red-400',
                          restore: 'text-emerald-400',
                          move: 'text-blue-400',
                          promote: 'text-amber-400',
                        }[e.action] || 'text-gray-400';
                        return (
                          <div key={`${e.target_id}-${e.at}-${i}`} className="px-4 py-2 text-[12px] flex items-center gap-2 flex-wrap">
                            <span className="text-gray-300 font-medium">{e.actor_name || e.actor_email || 'admin'}</span>
                            <span className={cor}>{rotulo}</span>
                            <span className="text-gray-300">{e.target_name || e.target_id}</span>
                            {e.action === 'move' && e.new_parent_name && (
                              <span className="text-gray-500">→ para baixo de {e.new_parent_name}</span>
                            )}
                            <span className="flex-1" />
                            <span className="text-[10.5px] text-gray-600">
                              {(e.at || e.created_at) && new Date(e.at || e.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                {CAREER_LEVELS.slice().reverse().map(level => {
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
                  <p className="text-sm text-green-400 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" />
                    Função Principal: <strong>{CAREER_LEVELS.find(l => l.id === primaryLevel)?.name}</strong>
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

      {/* CONFIRMAÇÃO DE EXCLUSÃO — precisa digitar "deletar" */}
      {deleteTarget && (() => {
        const diretos = allUsers.filter(u => u.referred_by_id === deleteTarget.id).length;
        const equipe = countDescendants(deleteTarget.id);
        const indicador = deleteTarget.referred_by_id
          ? allUsers.find(u => u.id === deleteTarget.referred_by_id)
          : null;
        const podeExcluir = deleteConfirmText.trim().toLowerCase() === 'deletar';
        return (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-gray-900 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                <TriangleAlert className="w-4 h-4 text-red-400" />
                <span className="text-[14px] font-semibold text-white">Excluir usuário da rede</span>
              </div>

              <div className="px-4 py-4 space-y-3 text-[13px] text-gray-300">
                <p>
                  <strong className="text-white">{deleteTarget.full_name}</strong>
                  <span className="text-gray-500"> · {deleteTarget.email}</span>
                </p>

                <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-3 space-y-1.5 text-[12px]">
                  <p className="flex items-center gap-2 text-gray-300">
                    <Users className="w-3.5 h-3.5 text-gray-500" />
                    {diretos} indicado(s) direto(s) · {equipe} pessoa(s) na equipe abaixo
                  </p>
                  {diretos > 0 && (
                    <p className="text-emerald-400/90">
                      A estrutura é preservada: os indicados diretos passam para{' '}
                      <strong>{indicador ? indicador.full_name : 'a raiz da rede'}</strong>.
                    </p>
                  )}
                  <p className="text-gray-500">
                    Nada é apagado do banco — o cadastro vai para a Lixeira e pode ser restaurado.
                  </p>
                  {diretos > 0 && (
                    <p className="text-emerald-400/80">
                      No plano de alavancagem, o rebate dessa perna passa a subir direto por{' '}
                      <strong>{indicador ? indicador.full_name : 'a raiz'}</strong>.
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-gray-400 text-[12px]">
                    Para confirmar, escreva <strong className="text-red-400">deletar</strong>
                  </Label>
                  <Input
                    autoFocus
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && podeExcluir) handleMoveToTrash(); }}
                    placeholder="deletar"
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-800">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isDeleting}
                  onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}
                  className="h-8 text-[12px] bg-gray-100 border-gray-300 text-gray-900 hover:bg-white hover:text-black"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={!podeExcluir || isDeleting}
                  onClick={handleMoveToTrash}
                  className="h-8 text-[12px] bg-red-600 hover:bg-red-500 disabled:opacity-40"
                >
                  {isDeleting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Excluindo…</> : <><Trash2 className="w-3.5 h-3.5 mr-1.5" />Excluir</>}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {editingUserFull && (
        <UserEditModal
          user={editingUserFull}
          isOpen={true}
          onClose={() => setEditingUserFull(null)}
          onSuccess={handleSaveEditUser}
          allUsers={allUsers}
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