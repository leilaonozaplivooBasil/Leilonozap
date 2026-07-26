import React, { useState, useEffect, useRef } from "react";
import { base44 } from '@/api/base44Client';

const User = { me: () => base44.auth.me(), updateMyUserData: (data) => base44.auth.updateMe(data), logout: () => base44.auth.logout() };
const AppUser = base44.entities.AppUser;
const AuctionMessage = base44.entities.AuctionMessage;
const GenerateImage = (params) => base44.integrations.Core.GenerateImage(params);
const UploadFile = (params) => base44.integrations.Core.UploadFile(params);
const InvokeLLM = (params) => base44.integrations.Core.InvokeLLM(params); // Adicionado InvokeLLM
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Adicionado CardDescription
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  User as UserIcon, 
  Trophy, 
  Zap, 
  Edit3, 
  Save,
  LogOut,
  Loader2,
  Camera,
  Check,
  X,
  Wand2,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Package,
  ShoppingBag,
  CheckCircle,
  Clock,
  ArrowLeft,
  Mail,
  Phone,
  BadgeCheck,
  CalendarDays,
  Heart,
  Gavel
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import CatalogOrderCard from '@/components/catalog/CatalogOrderCard';
import AvaliarLojistaModal from '@/components/loja/AvaliarLojistaModal';
import { supabase } from '@/api/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Wallet, Filter, ChevronDown } from 'lucide-react';
import DigitalWalletBalance from '../components/wallet/DigitalWalletBalance';

export default function Profile() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userBids, setUserBids] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  
  const isSaiDeBaixo = sessionStorage.getItem('saiDeBaixoContext') === 'true';
  
  // Verifica se veio do catálogo
  const urlParams = new URLSearchParams(window.location.search);
  const fromCatalog = urlParams.get('from') === 'catalog';
  
  // ESTADOS MELHORADOS PARA O GERADOR DE AVATAR
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [userIdea, setUserIdea] = useState(''); // Ideia inicial do usuário
  const [enhancedPrompt, setEnhancedPrompt] = useState(''); // Prompt melhorado pela IA
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false); // Loading do refinamento
  const [showConfirmation, setShowConfirmation] = useState(false); // Mostrar card de confirmação
  
  // Estados para senha
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' ou 'orders'
  const [catalogOrders, setCatalogOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('todos');
  const [showRecentBids, setShowRecentBids] = useState(false); // lances recentes recolhidos por padrão (não ocupar espaço)
  const [ratingOrder, setRatingOrder] = useState(null);
  const [confirmedIds, setConfirmedIds] = useState(new Set());
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    loadUserData();
    loadCatalogOrders();
  }, []);

  const loadCatalogOrders = async () => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (!savedUser) return;

      const user = JSON.parse(savedUser);

      // Busca DIRETO no servidor por buyer_id e buyer_email (antes baixava 500
      // pedidos de TODO MUNDO e filtrava no cliente).
      const [byId, byEmail] = await Promise.all([
        user.id ? base44.entities.CatalogSale.filter({ buyer_id: user.id }, '-created_date', 500).catch(() => []) : [],
        user.email ? base44.entities.CatalogSale.filter({ buyer_email: user.email }, '-created_date', 500).catch(() => []) : [],
      ]);
      const seen = new Set();
      const merged = [...(byId || []), ...(byEmail || [])].filter(o => {
        if (!o?.id || seen.has(o.id)) return false;
        seen.add(o.id);
        return true;
      });
      merged.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      // Anexa avaliações já feitas (pra mostrar "Você avaliou" nos cards)
      try {
        const { data: ratings } = await supabase.from('seller_ratings').select('sale_id,stars,comment').eq('buyer_id', user.id);
        const byS = {};
        (ratings || []).forEach((r) => { if (r.sale_id) byS[r.sale_id] = r; });
        merged.forEach((o) => { o.minha_avaliacao = byS[o.id] || null; });
      } catch (_) { /* sem avaliação ainda */ }

      setCatalogOrders(merged);
    } catch (error) {
      console.error('❌ Erro ao carregar pedidos:', error);
      setCatalogOrders([]);
    }
  };

  // Depósitos na carteira são transações, não pedidos de produto — cada um tem sua área.
  const isWalletDeposit = (o) => /dep[óo]sito na carteira/i.test(o?.product_title || '');
  const walletDeposits = catalogOrders.filter(isWalletDeposit);
  const purchaseOrders = catalogOrders.filter(o => !isWalletDeposit(o));

  const ORDER_FILTERS = [
    { id: 'todos', label: 'Todos', match: () => true },
    { id: 'andamento', label: 'Em andamento', match: (s) => ['pending_payment', 'paid', 'processing', 'preparando', 'shipped', 'saiu_entrega'].includes(s) },
    { id: 'entregues', label: 'Entregues', match: (s) => ['entregue', 'delivered'].includes(s) },
    { id: 'cancelados', label: 'Cancelados', match: (s) => ['canceled', 'cancelado'].includes(s) },
  ];
  const activeOrderFilter = ORDER_FILTERS.find(f => f.id === orderFilter) || ORDER_FILTERS[0];
  const filteredPurchases = purchaseOrders.filter(o => activeOrderFilter.match(o.status));

  // Mesmo fluxo do MyCatalogOrders: acompanhar usa sale_id (order_id NÃO abria nada)
  const handleTrackOrder = (order) => {
    navigate(createPageUrl('CatalogOrderTracking') + `?sale_id=${order.id}`);
  };

  const handleConfirmReceipt = async (order) => {
    if (confirmingId) return;
    if (!window.confirm(`Confirmar que você recebeu "${order.product_title}"?\n\nIsso libera o pagamento pro vendedor.`)) return;
    setConfirmingId(order.id);
    try {
      const uid = JSON.parse(localStorage.getItem('currentUser') || '{}')?.id;
      const r = await base44.functions.invoke('confirmarRecebimento', { user_id: uid, sale_id: order.id });
      if (r?.success) {
        setConfirmedIds(prev => new Set(prev).add(order.id));
        toast({ title: '✅ Recebimento confirmado!', description: 'Pagamento liberado pro vendedor.' });
      } else {
        toast({ title: 'Não foi possível confirmar agora', description: r?.error || 'Tente novamente.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('confirmarRecebimento falhou:', err);
      toast({ title: 'Erro ao confirmar recebimento', variant: 'destructive' });
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDeleteOrder = async (order) => {
    if (!window.confirm(`Deseja excluir o pedido "${order.product_title}"?\n\nO pedido será removido permanentemente.`)) return;
    try {
      await base44.entities.CatalogSale.delete(order.id);
      setCatalogOrders(prev => prev.filter(o => o.id !== order.id));
      toast({ title: '🗑️ Pedido excluído' });
    } catch (err) {
      console.error('Erro ao excluir:', err);
      toast({ title: 'Erro ao excluir pedido', variant: 'destructive' });
    }
  };

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      let user = null;
      let userType = null;

      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');
      if (savedUserJSON && isLoggedIn) {
          try {
            const localUser = JSON.parse(savedUserJSON);
            if (localUser?.id) {
              const usersInDB = await AppUser.filter({ id: localUser.id });
              if (usersInDB && usersInDB.length > 0) {
                  user = usersInDB[0];
                  userType = 'appUser';
              }
            }
          } catch (dbError) {
              console.error("Erro ao validar AppUser:", dbError);
          }
      }

      if (!user) {
          try {
              user = await User.me();
              userType = 'platformUser';
          } catch (e) {
              console.log("Nenhum usuário logado. Redirecionando...");
              navigate(createPageUrl("Home"));
              setIsLoading(false);
              return;
          }
      }
      
      if (user && user.id) {
          setCurrentUser({ ...user, _userType: userType });
          const initialData = {
              nickname: user.nickname || user.full_name || "",
              phone: user.phone || "",
              avatar_color: user.avatar_color || "#25D366",
              avatar_url: user.avatar_url || null,
              address_street: user.address_street || "",
              address_number: user.address_number || "",
              address_complement: user.address_complement || "",
              address_neighborhood: user.address_neighborhood || "",
              address_city: user.address_city || "",
              address_state: user.address_state || "",
              address_zip_code: user.address_zip_code || ""
          };
          setEditData(initialData);
          setAvatarPreview(initialData.avatar_url);

          try {
            const bids = await AuctionMessage.filter({ sender_id: user.id, message_type: "bid" }, "-created_date", 50);
            setUserBids(bids || []);
          } catch (bidError) {
            console.error("Erro ao carregar lances:", bidError);
            setUserBids([]);
          }
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      navigate(createPageUrl("Home"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!userIdea) {
      alert("Primeiro, escreva sua ideia no campo de texto!");
      return;
    }
    setIsImprovingPrompt(true);
    setShowConfirmation(false); // Hide any previous confirmation
    try {
      const metaPrompt = `Você é um engenheiro de prompts especialista para a IA de geração de imagem DALL-E 3. Sua tarefa é pegar a ideia simples de um usuário e transformá-la em um prompt detalhado, vibrante e eficaz em português. O estilo final do avatar DEVE ser "sticker cartoon style", com contornos bem definidos, iluminação cinematográfica e fundo neutro, para ser usado como foto de perfil em um jogo de leilão de alto nível. Ideia do usuário: "${userIdea}". Retorne APENAS o prompt aprimorado.`;
      
      const response = await InvokeLLM({ prompt: metaPrompt });
      
      if (typeof response === 'string' && response) {
        setEnhancedPrompt(response);
        setShowConfirmation(true);
      } else {
        throw new Error("A IA não conseguiu refinar a ideia. Tente ser mais descritivo.");
      }
    } catch (error) {
      console.error("Erro ao refinar prompt:", error);
      alert(error.message);
    }
    setIsImprovingPrompt(false);
  };

  // FUNÇÃO DE GERAR AVATAR ATUALIZADA
  const handleGenerateAvatar = async () => {
    if (!enhancedPrompt) {
      alert("Ocorreu um erro. A descrição aprimorada não foi encontrada.");
      return;
    }
    setIsGeneratingAvatar(true);
    try {
      // Use the enhancedPrompt directly
      const response = await GenerateImage({ prompt: enhancedPrompt });
      if (response && response.url) {
        setAvatarPreview(response.url);
        setEditData(prev => ({ ...prev, avatar_url: response.url }));
        setShowConfirmation(false); // Esconde a confirmação após o sucesso
      } else {
        throw new Error("A IA não conseguiu gerar a imagem. Tente uma descrição diferente.");
      }
    } catch (error) {
      console.error("Erro ao gerar avatar:", error);
      alert(error.message);
    }
    setIsGeneratingAvatar(false);
  };
  
  // NOVO: Função para cancelar e voltar à edição
  const cancelGeneration = () => {
      setShowConfirmation(false);
      setEnhancedPrompt('');
      // Optionally, clear the userIdea as well if the user wants to start over
      // setUserIdea(''); 
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
        setEditData(prev => ({ ...prev, uploadedFile: file }));
      };
      reader.readAsDataURL(file);
    }
  };

  const searchCep = async (cep) => {
    const cleanCep = (cep || '').replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      let street = '', neighborhood = '', city = '', state = '';

      // ViaCEP (principal)
      try {
        const r1 = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const d1 = await r1.json();
        if (!d1.erro) {
          street = d1.logradouro || street;
          neighborhood = d1.bairro || neighborhood;
          city = d1.localidade || city;
          state = d1.uf || state;
        }
      } catch {}

      // BrasilAPI (fallback)
      if (!street && !city) {
        try {
          const r2 = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
          if (r2.ok) {
            const d2 = await r2.json();
            street = d2.street || street;
            neighborhood = d2.neighborhood || neighborhood;
            city = d2.city || city;
            state = d2.state || state;
          }
        } catch {}
      }

      if (street || neighborhood || city || state) {
        setEditData(prev => ({
          ...prev,
          address_street: street || prev.address_street,
          address_neighborhood: neighborhood || prev.address_neighborhood,
          address_city: city || prev.address_city,
          address_state: (state || prev.address_state).toUpperCase()
        }));
      }
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleCepChange = (value) => {
    let cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length > 8) cleanValue = cleanValue.slice(0, 8);
    if (cleanValue.length > 5) {
      cleanValue = `${cleanValue.slice(0, 5)}-${cleanValue.slice(5)}`;
    }
    setEditData(prev => ({ ...prev, address_zip_code: cleanValue }));
    if (cleanValue.replace(/\D/g, "").length === 8) {
      searchCep(cleanValue);
    }
  };

  const handleSave = async () => {
    if (!currentUser || !currentUser.id) {
      alert("❌ Erro: Sessão inválida. Faça login novamente.");
      navigate(createPageUrl("Home"));
      return;
    }
    
    // Validação de senha se está tentando alterar
    if (passwordData.newPassword || passwordData.confirmPassword) {
      if (!passwordData.currentPassword) {
        alert("Digite sua senha atual para alterar a senha");
        return;
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        alert("As senhas não coincidem");
        return;
      }
      if (passwordData.newPassword.length < 6) {
        alert("A nova senha deve ter no mínimo 6 caracteres");
        return;
      }
      if (passwordData.currentPassword !== currentUser.password) {
        alert("Senha atual incorreta");
        return;
      }
    }
    
    setIsSaving(true);
    
    let finalData = { ...editData };

    try {
      // Passo 1: Se uma nova imagem foi carregada, faça o upload dela primeiro
      if (finalData.uploadedFile) {
        const { file_url } = await UploadFile({ file: finalData.uploadedFile });
        if (file_url) {
          finalData.avatar_url = file_url;
        } else {
          throw new Error("Falha ao fazer upload da sua foto.");
        }
      }
      delete finalData.uploadedFile;
      
      // Adiciona nova senha se foi alterada
      if (passwordData.newPassword && passwordData.currentPassword === currentUser.password) {
        finalData.password = passwordData.newPassword;
      }

      // Passo 2: Atualiza o usuário com os dados finais
      if (currentUser._userType === 'appUser') {
        await AppUser.update(currentUser.id, finalData);
      } else {
        await User.updateMyUserData(finalData);
      }

      // Atualiza cache local para refletir imediatamente em todo o app
      try {
        const cached = localStorage.getItem('currentUser');
        const baseUser = cached ? JSON.parse(cached) : currentUser;
        localStorage.setItem('currentUser', JSON.stringify({ ...baseUser, ...finalData }));
      } catch (_) {}
      
      if (passwordData.newPassword) {
        alert("✅ Senha alterada com sucesso!");
      }
      
      await loadUserData();
      setIsEditing(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Erro ao atualizar perfil: " + error.message);
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    if (confirm("Tem certeza que deseja sair?")) {
      if (currentUser?._userType === 'appUser') {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('isLoggedIn');
      } else {
        await User.logout();
      }
      navigate(createPageUrl("Landing"));
    }
  };

  const getRoleDisplayName = (user) => {
    if (!user) return 'Usuário';
    if (user.role === 'admin') return 'Administrador';
    if (user.role === 'licensee') return 'Licenciado';
    return 'Usuário';
  };
  const colors = ["#25D366", "#128C7E", "#34B7F1", "#9C88FF", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FECA57", "#FF9FF3", "#54A0FF", "#5F27CD"];

  // Tile de leitura dos dados do perfil (modo visualização)
  const InfoTile = ({ icon: Icon, label, value }) => (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${isSaiDeBaixo ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.03] border-white/10'}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSaiDeBaixo ? 'bg-red-50 text-red-600' : 'bg-emerald-500/10 text-emerald-400'}`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">{label}</p>
        <p className={`text-sm font-medium truncate ${isSaiDeBaixo ? 'text-gray-900' : 'text-gray-100'}`} title={String(value ?? '')}>
          {value || '—'}
        </p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
        <div className={`flex items-center justify-center h-screen ${isSaiDeBaixo ? 'bg-white' : 'bg-gray-900'}`}>
            <Loader2 className={`w-8 h-8 animate-spin ${isSaiDeBaixo ? 'text-red-600' : 'text-green-500'}`} />
        </div>
    )
  }
  
  // CORREÇÃO: Adicionada uma verificação de segurança.
  // Se o usuário não for encontrado por algum motivo, exibe uma mensagem em vez de quebrar a página.
  if (!currentUser) {
    return (
        <div className={`max-w-4xl mx-auto px-4 py-8 text-center ${isSaiDeBaixo ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'}`}>
            <h2 className={`text-xl font-semibold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Usuário não encontrado</h2>
            <p className={`${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'} my-4`}>Houve um problema ao carregar seus dados. Por favor, tente voltar para a página inicial.</p>
            <Button onClick={() => navigate(createPageUrl("Landing"))} className={isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : ''}>
                Página Inicial
            </Button>
        </div>
    );
  }

  const userStats = [
    { label: "Lances Dados", value: userBids.length, icon: Zap, color: "text-green-400" },
    { label: "Leilões Vencidos", value: currentUser.won_auctions || 0, icon: Trophy, color: "text-purple-400" }
  ];

  return (
    <div className={`min-h-screen ${isSaiDeBaixo ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'} p-4 sm:p-6 lg:p-8`}>
      <div className="max-w-6xl mx-auto">
        {/* Header — cartão de identidade do perfil */}
        <div className="mb-10">
          <div
            className={`relative overflow-hidden rounded-2xl border p-6 sm:p-8 mb-8 ${isSaiDeBaixo ? 'bg-white border-gray-200 shadow-sm' : 'border-white/10 shadow-lg shadow-black/20'}`}
            style={isSaiDeBaixo ? {} : { background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(17,24,39,0.85) 45%, rgba(17,24,39,0.4)), rgba(31,41,55,0.3)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-xl ring-2 ${isSaiDeBaixo ? 'ring-red-300' : 'ring-emerald-400/50'}`}
                />
              ) : (
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-xl ring-2 ${isSaiDeBaixo ? 'ring-red-300' : 'ring-emerald-400/50'}`}
                  style={{ backgroundColor: editData.avatar_color }}
                >
                  {(currentUser.nickname || currentUser.full_name)?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${isSaiDeBaixo ? 'text-red-600' : 'text-emerald-400'}`}>
                  {new URLSearchParams(window.location.search).get('user_id') ? 'Perfil do Usuário' : 'Meu Perfil'}
                </p>
                <h1 className={`font-slab text-3xl sm:text-4xl font-extrabold leading-tight truncate ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                  {currentUser.nickname || currentUser.full_name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${isSaiDeBaixo ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'}`}>
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {getRoleDisplayName(currentUser)}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${isSaiDeBaixo ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-white/5 text-gray-300 border-white/10'}`}>
                    <Mail className="w-3.5 h-3.5" />
                    {currentUser.email}
                  </span>
                  {currentUser.created_date && (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${isSaiDeBaixo ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-white/5 text-gray-300 border-white/10'}`}>
                      <CalendarDays className="w-3.5 h-3.5" />
                      Membro desde {new Date(currentUser.created_date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

              {new URLSearchParams(window.location.search).get('user_id') && (
                <button
                  onClick={() => navigate(createPageUrl('CRMInvestidores'))}
                  className={`self-start flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isSaiDeBaixo ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-800 border border-gray-700 text-slate-300 hover:text-white'}`}
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
              )}
            </div>
          </div>

          <div className={`flex gap-1 border-b ${isSaiDeBaixo ? 'border-gray-200' : 'border-white/10'}`}>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 pb-3 px-5 font-slab text-sm font-bold uppercase tracking-wide transition-all duration-300 border-b-2 -mb-px ${
                activeTab === 'profile'
                  ? `${isSaiDeBaixo ? 'text-gray-900 border-red-600' : 'text-emerald-300 border-emerald-400'}`
                  : `border-transparent ${isSaiDeBaixo ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'}`
              }`}
            >
              <UserIcon className="w-4 h-4" />
              Perfil
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 pb-3 px-5 font-slab text-sm font-bold uppercase tracking-wide transition-all duration-300 border-b-2 -mb-px ${
                activeTab === 'orders'
                  ? `${isSaiDeBaixo ? 'text-gray-900 border-red-600' : 'text-emerald-300 border-emerald-400'}`
                  : `border-transparent ${isSaiDeBaixo ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'}`
              }`}
            >
              <Package className="w-4 h-4" />
              Meus Pedidos
              <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${isSaiDeBaixo ? 'bg-gray-100 text-gray-600' : 'bg-white/10 text-gray-300'}`}>
                {purchaseOrders.filter(o => !['canceled', 'cancelado'].includes(o.status)).length}
              </span>
            </button>
          </div>
        </div>

        {activeTab === 'profile' && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2">
            <Card className={isSaiDeBaixo ? 'bg-white border border-gray-200 shadow-sm' : 'bg-gray-800/30 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20'}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className={`font-slab flex items-center gap-2 ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`}>
                  <UserIcon className="w-5 h-5" />
                  Informações Pessoais
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className={isSaiDeBaixo ? "bg-white border-gray-300 text-gray-900 font-semibold hover:bg-gray-100" : "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"}
                >
                  {isEditing ? "Cancelar" : <><Edit3 className="w-4 h-4 mr-2" />Editar</>}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar e Ferramentas de Edição — só no modo edição (no modo leitura o avatar já está no cartão do topo) */}
                {isEditing && (
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="relative">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className={`w-24 h-24 rounded-full object-cover shadow-md ${isSaiDeBaixo ? 'border-4 border-gray-300' : 'border-4 border-gray-700'}`} />
                    ) : (
                      <div 
                        className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-md"
                        style={{ backgroundColor: editData.avatar_color }}
                      >
                        {(currentUser.nickname || currentUser.full_name)?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isEditing && (
                      <Button
                        size="icon"
                        className={`absolute bottom-0 right-0 w-8 h-8 rounded-full ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                        onClick={() => fileInputRef.current.click()}
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                  </div>
                  {isEditing && (
                    <div className="flex-1 space-y-3 w-full">
                      {/* PASSO 1: IDEIA INICIAL */}
                      <div>
                        <Label htmlFor="avatar-idea" className={`flex items-center gap-1.5 text-sm font-medium ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`}>
                          <Wand2 className={`w-4 h-4 ${isSaiDeBaixo ? 'text-red-600' : 'text-emerald-400'}`} />
                          Crie seu avatar com IA
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            id="avatar-idea"
                            placeholder="Ex: um tigre astronauta de terno"
                            value={userIdea}
                            onChange={(e) => setUserIdea(e.target.value)}
                            className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                            disabled={showConfirmation || isImprovingPrompt}
                          />
                          <Button onClick={handleEnhancePrompt} disabled={isImprovingPrompt || !userIdea} className={isSaiDeBaixo ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'}>
                            {isImprovingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* PASSO 2: CONFIRMAÇÃO */}
                      {showConfirmation && (
                          <Card className={isSaiDeBaixo ? 'bg-blue-50 border-blue-300' : 'bg-gray-900/50 border-blue-500/30'}>
                            <CardHeader className="p-4">
                                <CardTitle className={`text-sm ${isSaiDeBaixo ? 'text-blue-700' : 'text-blue-300'}`}>A IA sugere esta descrição:</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <p className={`${isSaiDeBaixo ? 'text-gray-800' : 'text-gray-200'} text-sm italic mb-4`}>"{enhancedPrompt}"</p>
                                <div className="flex gap-2">
                                    <Button onClick={handleGenerateAvatar} disabled={isGeneratingAvatar} className={`flex-1 ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                                        {isGeneratingAvatar ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                        Gerar Avatar
                                    </Button>
                                    <Button onClick={cancelGeneration} variant="outline" className={isSaiDeBaixo ? "bg-white border-gray-300 text-gray-900 hover:bg-gray-100" : "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                          </Card>
                      )}

                      <p className={`text-xs ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-500'}`}>Ou escolha uma cor para o avatar de letra:</p>
                      <div className="flex flex-wrap gap-2">
                        {colors.map((color) => (
                          <button
                            key={color} type="button"
                            className={`w-6 h-6 rounded-full border-2 ${editData.avatar_color === color ? 'border-gray-400' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setEditData({ ...editData, avatar_color: color })}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                )}

                {/* Form Fields */}
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="nickname" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Apelido (Público)</Label>
                      <Input
                        id="nickname"
                        value={editData.nickname}
                        onChange={(e) => setEditData({ ...editData, nickname: e.target.value })}
                        placeholder="Seu nome nos leilões"
                        className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Nome Completo (Privado)</Label>
                      <Input value={currentUser.full_name} disabled className={isSaiDeBaixo ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-gray-900 border-gray-700 text-gray-400'} />
                    </div>
                    <div className="space-y-2">
                      <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Email</Label>
                      <Input value={currentUser.email} disabled className={isSaiDeBaixo ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-gray-900 border-gray-700 text-gray-400'} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Telefone/WhatsApp</Label>
                      <Input
                        id="phone"
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        placeholder="(11) 99999-9999"
                        className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoTile icon={UserIcon} label="Apelido" value={currentUser.nickname || currentUser.full_name} />
                    <InfoTile icon={Mail} label="Email" value={currentUser.email} />
                    <InfoTile icon={Phone} label="Telefone/WhatsApp" value={currentUser.phone} />
                    <InfoTile icon={BadgeCheck} label="Função" value={getRoleDisplayName(currentUser)} />
                  </div>
                )}
                  
                  {/* Seção de Senha */}
                  {isEditing && (
                  <>
                  <div className="flex items-center gap-2 mt-6 mb-2">
                    <Lock className={`w-5 h-5 ${isSaiDeBaixo ? 'text-red-600' : 'text-green-500'}`} />
                    <h3 className={`text-lg font-semibold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Alterar Senha</h3>
                  </div>
                  
                  <div className={`grid grid-cols-1 gap-4 ${isSaiDeBaixo ? 'bg-gray-50' : 'bg-gray-900/50'} p-4 rounded-lg`}>
                    <div className="space-y-2">
                      <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Senha Atual</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          placeholder="Digite sua senha atual"
                          className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={`absolute right-3 top-3 ${isSaiDeBaixo ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {currentUser.password && (
                        <p className={`text-xs ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-400'}`}>
                          Senha salva: {showPassword ? currentUser.password : '••••••••'}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Nova Senha</Label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          placeholder="Digite a nova senha (mínimo 6 caracteres)"
                          className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className={`absolute right-3 top-3 ${isSaiDeBaixo ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Confirmar Nova Senha</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          placeholder="Digite novamente a nova senha"
                          className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className={`absolute right-3 top-3 ${isSaiDeBaixo ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  </>
                  )}

                  {/* Endereço - Somente no modo de edição */}
                  {isEditing && (
                  <>
                  <div className="flex items-center gap-2 mt-6 mb-2">
                    <MapPin className={`w-5 h-5 ${isSaiDeBaixo ? 'text-red-600' : 'text-green-500'}`} />
                    <h3 className={`text-lg font-semibold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Endereço de Entrega</h3>
                  </div>

                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isSaiDeBaixo ? 'bg-gray-50' : 'bg-gray-900/50'} p-4 rounded-lg`}>
                    <div className="space-y-2">
                      <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>CEP</Label>
                      <div className="relative">
                        <Input
                          value={editData.address_zip_code}
                          onChange={(e) => handleCepChange(e.target.value)}
                          onBlur={() => searchCep(editData.address_zip_code)}
                          placeholder="00000-000"
                          maxLength={9}
                          className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                        />
                        {isLoadingCep && (
                          <Loader2 className={`absolute right-3 top-3 w-4 h-4 ${isSaiDeBaixo ? 'text-red-600' : 'text-green-500'} animate-spin`} />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Rua/Avenida</Label>
                      <Input
                        value={editData.address_street}
                        onChange={(e) => setEditData({ ...editData, address_street: e.target.value })}
                        placeholder="Nome da rua"
                        className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Número</Label>
                      <Input
                        value={editData.address_number}
                        onChange={(e) => setEditData({ ...editData, address_number: e.target.value })}
                        placeholder="123"
                        className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Complemento</Label>
                      <Input
                        value={editData.address_complement}
                        onChange={(e) => setEditData({ ...editData, address_complement: e.target.value })}
                        placeholder="Apto, Bloco, etc"
                        className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Bairro</Label>
                      <Input
                        value={editData.address_neighborhood}
                        onChange={(e) => setEditData({ ...editData, address_neighborhood: e.target.value })}
                        placeholder="Bairro"
                        className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Cidade</Label>
                      <Input
                        value={editData.address_city}
                        onChange={(e) => setEditData({ ...editData, address_city: e.target.value })}
                        placeholder="Cidade"
                        className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Estado (UF)</Label>
                      <Input
                        value={editData.address_state}
                        onChange={(e) => setEditData({ ...editData, address_state: e.target.value.toUpperCase() })}
                        placeholder="SP"
                        maxLength={2}
                        className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                      />
                    </div>
                  </div>
                  </>
                  )}

                  {/* Exibir endereço salvo quando não estiver editando */}
                  {!isEditing && currentUser.address_street && (
                  <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${isSaiDeBaixo ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.03] border-white/10'}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSaiDeBaixo ? 'bg-red-50 text-red-600' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      <MapPin className="w-[18px] h-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">Endereço de Entrega</p>
                      <div className={`text-sm font-medium ${isSaiDeBaixo ? 'text-gray-900' : 'text-gray-100'}`}>
                        <p>{currentUser.address_street}, {currentUser.address_number}{currentUser.address_complement ? ` · ${currentUser.address_complement}` : ''}</p>
                        <p className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                          {currentUser.address_neighborhood} — {currentUser.address_city}/{currentUser.address_state} · CEP {currentUser.address_zip_code}
                        </p>
                      </div>
                    </div>
                  </div>
                  )}

                  {isEditing && (
                  <div className="flex justify-end gap-3">
                   <Button
                     onClick={handleSave}
                     disabled={isSaving}
                     className={isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                   >
                     <Save className="w-4 h-4 mr-2" />
                     {isSaving ? "Salvando..." : "Salvar Alterações"}
                   </Button>
                  </div>
                  )}
              </CardContent>
            </Card>

            {/* 🔨 Meus Lances Recentes — recolhível logo abaixo de Informações Pessoais
                (pedido Gabriel 25/07): abre no clique, expande na própria tela e fecha
                de novo pra não ocupar espaço. */}
            <Card className={`mt-6 overflow-hidden ${isSaiDeBaixo ? 'bg-white border border-gray-200 shadow-sm' : 'bg-gray-800/30 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20'}`}>
              <button
                onClick={() => setShowRecentBids(v => !v)}
                aria-expanded={showRecentBids}
                className={`w-full flex items-center justify-between gap-3 px-6 py-4 transition-colors ${isSaiDeBaixo ? 'hover:bg-gray-50' : 'hover:bg-white/[0.04]'}`}
              >
                <span className={`font-slab font-bold flex items-center gap-2 ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`}>
                  <Gavel className="w-5 h-5" />
                  Meus Lances Recentes
                </span>
                <span className="flex items-center gap-2">
                  {userBids.length > 0 && (
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${isSaiDeBaixo ? 'bg-gray-100 text-gray-600' : 'bg-white/10 text-gray-300'}`}>
                      {userBids.length}
                    </span>
                  )}
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${showRecentBids ? 'rotate-180' : ''} ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-400'}`} />
                </span>
              </button>

              <div className={`grid transition-all duration-300 ease-in-out ${showRecentBids ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="min-h-0 overflow-hidden">
                  <CardContent className="pt-0">
                    {userBids.length > 0 ? (
                      <div className={`rounded-xl border overflow-hidden divide-y ${isSaiDeBaixo ? 'border-gray-200 divide-gray-100' : 'border-white/10 divide-white/5'}`}>
                        {userBids.slice(0, 10).map((bid) => (
                          <div key={bid.id} className={`flex items-center gap-3 px-4 py-3 ${isSaiDeBaixo ? 'bg-white' : 'bg-white/[0.02]'}`}>
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSaiDeBaixo ? 'bg-red-50 text-red-600' : 'bg-emerald-500/10 text-emerald-400'}`}>
                              <Gavel className="w-[18px] h-[18px]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>R$ {(bid.bid_amount || 0).toFixed(2)}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(bid.created_date).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <Badge className={isSaiDeBaixo ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-500/10 text-green-400 border border-green-500/20'}>Registrado</Badge>
                          </div>
                        ))}
                        {userBids.length > 10 && (
                          <p className={`px-4 py-2.5 text-center text-xs ${isSaiDeBaixo ? 'text-gray-500 bg-gray-50' : 'text-gray-500 bg-white/[0.02]'}`}>
                            Mostrando os 10 mais recentes de {userBids.length} lances
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Zap className={`w-12 h-12 ${isSaiDeBaixo ? 'text-gray-400' : 'text-gray-600'} mx-auto mb-4`} />
                        <h3 className={`text-lg font-semibold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} mb-2`}>
                          Nenhum lance ainda
                        </h3>
                        <p className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                          Quando você participar de leilões, seus lances aparecerão aqui.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </div>
              </div>
            </Card>
          </div>
          {/* Stats & Actions */}
          <div className="space-y-6">
            {/* Digital Wallet Balance */}
            <DigitalWalletBalance userId={currentUser.id} showActions={true} />
            
            {/* Statistics */}
            <Card className={isSaiDeBaixo ? 'bg-white border border-gray-200 shadow-sm' : 'bg-gray-800/30 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20'}>
              <CardHeader>
                <CardTitle className={`font-slab ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`}>Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {userStats.map((stat) => (
                  <div key={stat.label} className={`flex items-center gap-3 p-3 rounded-xl border ${isSaiDeBaixo ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.03] border-white/10'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isSaiDeBaixo ? 'bg-red-50' : 'bg-white/5'}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <span className={`text-sm flex-1 ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`}>{stat.label}</span>
                    <span className={`font-slab font-bold text-2xl ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>{stat.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className={isSaiDeBaixo ? 'bg-white border border-gray-200 shadow-sm' : 'bg-gray-800/30 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20'}>
              <CardHeader>
                <CardTitle className={`font-slab ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`}>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!fromCatalog && (
                  <button
                    onClick={() => navigate(createPageUrl(isSaiDeBaixo ? "SaiDeBaixo" : "Home") + "?favorites=true")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                      isSaiDeBaixo
                        ? 'bg-white border-gray-200 text-gray-800 hover:border-rose-300 hover:bg-rose-50'
                        : 'bg-white/[0.03] border-white/10 text-gray-200 hover:border-rose-400/40 hover:bg-rose-500/10'
                    }`}
                  >
                    <Heart className="w-5 h-5 text-rose-400" />
                    <span>Meus Favoritos</span>
                  </button>
                )}
                <button
                  onClick={() => navigate(createPageUrl("MyCatalogOrders"))}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                    isSaiDeBaixo
                      ? 'bg-white border-gray-200 text-gray-800 hover:border-green-300 hover:bg-green-50'
                      : 'bg-white/[0.03] border-white/10 text-gray-200 hover:border-emerald-400/40 hover:bg-emerald-500/10'
                  }`}
                >
                  <Package className="w-5 h-5 text-emerald-400" />
                  <span>Meus Pedidos</span>
                </button>
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                    isSaiDeBaixo
                      ? 'bg-white border-gray-200 text-red-700 hover:border-red-300 hover:bg-red-50'
                      : 'bg-white/[0.03] border-white/10 text-red-300 hover:border-red-400/40 hover:bg-red-500/10'
                  }`}
                >
                  <LogOut className="w-5 h-5 text-red-400" />
                  <span>Sair da Conta</span>
                </button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lances recentes agora ficam recolhíveis logo abaixo de Informações Pessoais */}
        </>
        )}

        {/* Tab Meus Pedidos — repaginada 25/07: mesmo card rico do MyCatalogOrders
            (avaliar, confirmar recebimento, rastreio), filtros por status e
            depósitos na carteira separados das compras */}
        {activeTab === 'orders' && (
          <div className="space-y-8">
            {purchaseOrders.length === 0 && walletDeposits.length === 0 ? (
              <Card className="bg-gray-800/30 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20">
                <CardContent className="py-14 text-center">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <h3 className="text-xl font-semibold mb-2 text-white">Nenhum pedido ainda</h3>
                  <p className="text-gray-400 mb-6">Explore a Loja Virtual e faça sua primeira compra!</p>
                  <Button
                    onClick={() => navigate(createPageUrl('Catalog'))}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 font-bold"
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Ver Loja Virtual
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 🛍️ COMPRAS DA LOJA */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
                        <ShoppingBag className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white leading-tight">Compras da Loja</h3>
                        <p className="text-xs text-gray-400">{purchaseOrders.length} pedido{purchaseOrders.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(createPageUrl('MyCatalogOrders'))}
                      className="border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20 hover:text-green-200"
                    >
                      Ver página completa
                    </Button>
                  </div>

                  {/* Filtros por status */}
                  <div className="mb-5 flex flex-wrap gap-2 items-center">
                    <span className="flex items-center gap-1.5 text-gray-400 text-xs font-semibold mr-1">
                      <Filter className="w-3.5 h-3.5" /> Filtrar:
                    </span>
                    {ORDER_FILTERS.map(f => {
                      const count = f.id === 'todos' ? purchaseOrders.length : purchaseOrders.filter(o => f.match(o.status)).length;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setOrderFilter(f.id)}
                          className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all duration-300 flex items-center gap-1.5 ${orderFilter === f.id
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                            : 'bg-gray-800/50 border border-gray-700 text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                          {f.label}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${orderFilter === f.id ? 'bg-white/20' : 'bg-gray-700'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {filteredPurchases.length === 0 ? (
                    <div className="text-center py-10 bg-gray-800/20 rounded-xl border border-white/5">
                      <Package className="w-10 h-10 mx-auto text-gray-600 mb-2" />
                      <p className="text-gray-400 text-sm">Nenhum pedido nesta categoria</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                      {filteredPurchases.map(order => (
                        <CatalogOrderCard
                          key={order.id}
                          order={order}
                          onTrackClick={handleTrackOrder}
                          onDeleteClick={handleDeleteOrder}
                          onRateClick={setRatingOrder}
                          onConfirmReceipt={handleConfirmReceipt}
                          confirmado={confirmedIds.has(order.id)}
                          confirmando={confirmingId === order.id}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* 💰 DEPÓSITOS NA CARTEIRA — transações, não pedidos */}
                {walletDeposits.length > 0 && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30">
                          <Wallet className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white leading-tight">Depósitos na Carteira</h3>
                          <p className="text-xs text-gray-400">{walletDeposits.length} depósito{walletDeposits.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(createPageUrl('WalletHistory'))}
                        className="border-yellow-500/30 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 hover:text-yellow-200"
                      >
                        Ver extrato completo
                      </Button>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-gray-800/30 backdrop-blur-xl overflow-hidden divide-y divide-white/5">
                      {walletDeposits.map(dep => {
                        const pago = ['paid', 'entregue', 'delivered'].includes(dep.status);
                        return (
                          <div key={dep.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 rounded-full grid place-items-center bg-green-500/15 border border-green-500/25 shrink-0">
                              <Wallet className="w-4 h-4 text-green-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">Depósito na Carteira Digital</p>
                              <p className="text-xs text-gray-500">
                                {new Date(dep.created_date).toLocaleDateString('pt-BR')} às {new Date(dep.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-black text-green-400">+ R$ {(dep.total_amount || dep.sale_price || 0).toFixed(2)}</p>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${pago ? 'text-green-400' : 'text-yellow-400'}`}>
                                {pago ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {pago ? 'Confirmado' : 'Aguardando'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Modal de avaliação do vendedor */}
            {ratingOrder && (
              <AvaliarLojistaModal
                order={ratingOrder}
                buyer={currentUser}
                onClose={() => setRatingOrder(null)}
                onDone={({ saleId, stars, comment }) => {
                  setCatalogOrders(prev => prev.map(o => o.id === saleId ? { ...o, minha_avaliacao: { stars, comment } } : o));
                  setRatingOrder(null);
                  toast({ title: '⭐ Avaliação enviada!', description: 'Obrigado pelo feedback.' });
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}