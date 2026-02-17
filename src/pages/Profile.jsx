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
  Crown,
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
  Truck
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import WalletBalance from '../components/wallet/WalletBalance';

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

  useEffect(() => {
    loadUserData();
    loadCatalogOrders();
  }, []);

  const loadCatalogOrders = async () => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (!savedUser) return;
      
      const user = JSON.parse(savedUser);
      console.log('🔍 [Profile] Buscando pedidos para:', { id: user.id, email: user.email });
      
      const allOrders = await base44.entities.CatalogSale.list('-created_date', 500);
      const userOrders = allOrders.filter(order => 
        order.buyer_id === user.id || order.buyer_email === user.email
      );
      
      console.log('✅ [Profile] Pedidos encontrados:', userOrders.length, userOrders);
      setCatalogOrders(userOrders || []);
    } catch (error) {
      console.error('❌ Erro ao carregar pedidos:', error);
      setCatalogOrders([]);
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
    { label: "Pontos", value: currentUser.points || 0, icon: Crown, color: "text-yellow-400" },
    { label: "Lances Dados", value: userBids.length, icon: Zap, color: "text-green-400" },
    { label: "Leilões Vencidos", value: currentUser.won_auctions || 0, icon: Trophy, color: "text-purple-400" }
  ];

  return (
    <div className={`min-h-screen ${isSaiDeBaixo ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'} p-4 sm:p-6 lg:p-8`}>
      <div className="max-w-6xl mx-auto">
        {/* Header moderno */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className={`text-5xl font-black ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} mb-2`}>Meu Perfil</h1>
              <p className={`text-sm ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-400'}`}>Gerencie sua conta e informações</p>
            </div>
          </div>
          
          <div className={`flex gap-2 border-b-2 ${isSaiDeBaixo ? 'border-gray-200' : 'border-gray-800'}`}>
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-4 px-6 font-bold text-lg transition-all duration-300 ${
                activeTab === 'profile'
                  ? `${isSaiDeBaixo ? 'text-gray-900 border-b-2 border-red-600' : 'text-green-400 border-b-2 border-green-400'}`
                  : `${isSaiDeBaixo ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'}`
              }`}
            >
              <UserIcon className="w-5 h-5 inline mr-2" />
              Perfil
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-4 px-6 font-bold text-lg transition-all duration-300 ${
                activeTab === 'orders'
                  ? `${isSaiDeBaixo ? 'text-gray-900 border-b-2 border-red-600' : 'text-green-400 border-b-2 border-green-400'}`
                  : `${isSaiDeBaixo ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'}`
              }`}
            >
              <Package className="w-5 h-5 inline mr-2" />
              Meus Pedidos <span className="font-semibold">({catalogOrders.filter(o => o.status !== 'canceled').length})</span>
            </button>
          </div>
        </div>

        {activeTab === 'profile' && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2">
            <Card className={isSaiDeBaixo ? 'bg-white border border-gray-200 shadow-sm' : 'bg-gray-800 border border-gray-700'}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className={`flex items-center gap-2 ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`}>
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
                {/* Avatar e Ferramentas de Edição */}
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
                        <Label htmlFor="avatar-idea" className={`text-sm font-medium ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`}>✨ Crie seu avatar com IA</Label>
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

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isEditing ? (
                    <>
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
                    </>
                  ) : (
                    <div className="space-y-2 md:col-span-2">
                      <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Apelido</Label>
                      <Input value={currentUser.nickname || currentUser.full_name} disabled className={isSaiDeBaixo ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-gray-900 border-gray-700 text-gray-400'} />
                    </div>
                  )}

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
                      disabled={!isEditing}
                      className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500' : 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-900 disabled:text-gray-400'}
                    />
                  </div>
                  <div className="space-y-2">
                   <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Função</Label>
                   <Input value={getRoleDisplayName(currentUser)} disabled className={isSaiDeBaixo ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-gray-900 border-gray-700 text-gray-400'} />
                  </div>
                  </div>
                  
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
                  <div className={`mt-6 p-4 ${isSaiDeBaixo ? 'bg-gray-50' : 'bg-gray-900/50'} rounded-lg`}>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className={`w-4 h-4 ${isSaiDeBaixo ? 'text-red-600' : 'text-green-500'}`} />
                    <h4 className={`text-sm font-semibold ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`}>Endereço de Entrega</h4>
                  </div>
                  <div className={`text-sm ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
                    <p>{currentUser.address_street}, {currentUser.address_number}</p>
                    {currentUser.address_complement && <p>{currentUser.address_complement}</p>}
                    <p>{currentUser.address_neighborhood} - {currentUser.address_city}/{currentUser.address_state}</p>
                    <p>CEP: {currentUser.address_zip_code}</p>
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
          </div>
          {/* Stats & Actions */}
          <div className="space-y-6">
            {/* Wallet Balance */}
            <WalletBalance userId={currentUser.id} showActions={true} />
            
            {/* Statistics */}
            <Card className={isSaiDeBaixo ? 'bg-white border-2 border-gray-200 shadow-lg' : 'bg-gray-800/50 border-gray-700/80 backdrop-blur-sm'}>
              <CardHeader>
                <CardTitle className={isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}>Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userStats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      <span className={`text-sm ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`}>{stat.label}</span>
                    </div>
                    <span className={`font-semibold text-lg ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>{stat.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className={isSaiDeBaixo ? 'bg-white border-2 border-gray-200 shadow-lg' : 'bg-gray-800/50 border-gray-700/80 backdrop-blur-sm'}>
              <CardHeader>
                <CardTitle className={isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}>Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!fromCatalog && (
                  <Button 
                    variant="outline" 
                    className={isSaiDeBaixo ? "w-full bg-white border-gray-300 text-gray-900 font-semibold hover:bg-gray-100" : "w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600"}
                    onClick={() => navigate(createPageUrl(isSaiDeBaixo ? "SaiDeBaixo" : "Home") + "?favorites=true")}
                  >
                    <span className="text-red-500 mr-2">❤️</span>
                    Meus Favoritos
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className={isSaiDeBaixo ? "w-full bg-white border-gray-300 text-gray-900 font-semibold hover:bg-gray-100" : "w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600"}
                  onClick={() => navigate(createPageUrl("MyCatalogOrders"))}
                >
                  <Package className="w-4 h-4 mr-2 text-green-400" />
                  Meus Pedidos
                </Button>
                <Button 
                  variant="outline" 
                  className={`w-full ${isSaiDeBaixo ? 'bg-white border-red-300 text-red-600 hover:bg-red-50' : 'bg-gray-700 border-red-500/50 text-red-400 hover:bg-gray-600'}`}
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair da Conta
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Bids */}
        <Card className={`mt-8 ${isSaiDeBaixo ? 'bg-white border-2 border-gray-200 shadow-lg' : 'bg-gray-800/50 border-gray-700/80 backdrop-blur-sm'}`}>
          <CardHeader>
            <CardTitle className={isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}>Meus Lances Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {userBids.length > 0 ? (
              <div className="space-y-3">
                {userBids.slice(0, 10).map((bid) => (
                  <div key={bid.id} className={`flex justify-between items-center p-3 ${isSaiDeBaixo ? 'bg-gray-50 border-2 border-gray-200' : 'bg-gray-800 border border-gray-700'} rounded-lg`}>
                    <div>
                      <p className={`font-medium ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Lance de R$ {bid.bid_amount.toFixed(2)}</p>
                      <p className={`text-sm ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
                        em {new Date(bid.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Badge className={isSaiDeBaixo ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-500/10 text-green-400 border border-green-500/20'}>Lance Registrado</Badge>
                  </div>
                ))}
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
        </Card>
        </>
        )}

        {/* Tab Meus Pedidos */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {catalogOrders.length === 0 ? (
              <Card className={isSaiDeBaixo ? 'bg-white border-2 border-gray-200' : 'bg-gray-800 border-gray-700'}>
                <CardContent className="py-12 text-center">
                  <ShoppingBag className={`w-16 h-16 mx-auto mb-4 ${isSaiDeBaixo ? 'text-gray-400' : 'text-gray-600'}`} />
                  <h3 className={`text-xl font-semibold mb-2 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                    Nenhum pedido ainda
                  </h3>
                  <p className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                    Seus pedidos do catálogo aparecerão aqui
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {catalogOrders.map(order => {
                  const statusConfig = {
                    pending_payment: { text: 'Aguardando Pagamento', icon: Clock, color: 'text-yellow-400' },
                    paid: { text: 'Pago', icon: CheckCircle, color: 'text-green-400' },
                    shipped: { text: 'Enviado', icon: Truck, color: 'text-blue-400' },
                    delivered: { text: 'Entregue', icon: Package, color: 'text-purple-400' },
                    canceled: { text: 'Cancelado', icon: X, color: 'text-red-400' }
                  };
                  const config = statusConfig[order.status] || statusConfig.pending_payment;
                  
                  return (
                    <Card key={order.id} className={isSaiDeBaixo ? 'bg-white border-2 border-gray-200' : 'bg-gray-800 border-gray-700'}>
                      <CardContent className="p-4">
                        <div className="flex gap-4 mb-3">
                          {order.product_image && (
                            <img 
                              src={order.product_image} 
                              alt={order.product_title}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className={`font-semibold line-clamp-2 mb-1 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
                              {order.product_title}
                            </h4>
                            <p className={`text-sm ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>
                              {new Date(order.created_date).toLocaleDateString('pt-BR')}
                            </p>
                            <p className={`font-bold text-lg ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`}>
                              R$ {order.total_amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <config.icon className={`w-4 h-4 ${config.color}`} />
                          <span className={`text-sm ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`}>{config.text}</span>
                        </div>

                        <Button
                          onClick={() => navigate(createPageUrl('CatalogOrderTracking') + `?order_id=${order.id}`)}
                          variant="outline"
                          className={`w-full ${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900 hover:bg-gray-100' : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'}`}
                        >
                          Acompanhar Pedido
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}