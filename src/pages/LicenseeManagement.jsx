import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  Copy, 
  Trash2, 
  Eye,
  ShoppingBag,
  Users,
  Calendar,
  ExternalLink,
  X,
  Check
} from "lucide-react";
import { toast } from "sonner";
import CreateLicenseeModal from "@/components/licensing/CreateLicenseeModal";

const AppUser = base44.entities.AppUser;
const CatalogSale = base44.entities.CatalogSale;

export default function LicenseeManagement() {
  const [licensees, setLicensees] = useState([]);
  const [filteredLicensees, setFilteredLicensees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLicensee, setSelectedLicensee] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [licenseeStats, setLicenseeStats] = useState({});

  useEffect(() => {
    loadLicensees();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = licensees.filter(l => 
        l.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.referral_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLicensees(filtered);
    } else {
      setFilteredLicensees(licensees);
    }
  }, [searchTerm, licensees]);

  const loadLicensees = async () => {
    try {
      setIsLoading(true);
      
      // Busca todos os usuários que são licenciados do catálogo
      const allUsers = await AppUser.list('-created_date', 500);
      const catalogLicensees = allUsers.filter(u => 
        u.career_levels?.includes('licenciado_catalogo') || 
        u.primary_career_level === 'licenciado_catalogo'
      );
      
      setLicensees(catalogLicensees);
      setFilteredLicensees(catalogLicensees);
      
      // Se houver licenciados, seleciona o primeiro
      if (catalogLicensees.length > 0) {
        setSelectedLicensee(catalogLicensees[0]);
        loadLicenseeStats(catalogLicensees[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar licenciados:", error);
      toast.error("Erro ao carregar licenciados");
    } finally {
      setIsLoading(false);
    }
  };

  const loadLicenseeStats = async (licenseeId) => {
    try {
      // Busca vendas do licenciado nos últimos 30 dias
      const sales = await CatalogSale.filter({ licensee_id: licenseeId });
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const recentSales = sales.filter(s => new Date(s.created_date) >= thirtyDaysAgo);
      const lastSale = sales.length > 0 ? sales.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] : null;
      
      setLicenseeStats({
        totalSales: sales.length,
        recentSales: recentSales.length,
        lastSaleDate: lastSale?.created_date,
        totalRevenue: sales.reduce((sum, s) => sum + (s.total_amount || 0), 0)
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const handleSelectLicensee = (licensee) => {
    setSelectedLicensee(licensee);
    loadLicenseeStats(licensee.id);
  };

  const copyLink = (code) => {
    const link = `https://leilaonozap.net/Catalog?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ').filter(p => p);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      'bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500',
      'bg-orange-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500'
    ];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl lg:text-3xl font-bold mb-6">
          Gerenciar Licenciados do Catálogo
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LISTA DE LICENCIADOS */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {/* Header com busca */}
            <div className="p-4 border-b border-gray-700 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar por vendedores"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar vendedor
              </Button>
            </div>

            {/* Info */}
            <div className="px-4 py-2 text-sm text-gray-400 border-b border-gray-700">
              Gerencie os seus catálogos de vendedores
              <span className="float-right">{filteredLicensees.length} vendedores</span>
            </div>

            {/* Lista */}
            <div className="max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  Carregando...
                </div>
              ) : filteredLicensees.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum licenciado encontrado</p>
                </div>
              ) : (
                filteredLicensees.map((licensee) => (
                  <div
                    key={licensee.id}
                    onClick={() => handleSelectLicensee(licensee)}
                    className={`p-4 border-b border-gray-700 cursor-pointer transition-colors hover:bg-gray-750 ${
                      selectedLicensee?.id === licensee.id ? 'bg-gray-700/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${getAvatarColor(licensee.full_name)}`}>
                        {licensee.avatar_url ? (
                          <img src={licensee.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-sm">{getInitials(licensee.full_name)}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{licensee.full_name}</p>
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          leilaonozap.net/Catalog?ref={licensee.referral_code || licensee.id}
                        </p>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); copyLink(licensee.referral_code || licensee.id); }}
                          className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                          title="Copiar link"
                        >
                          <Copy className="w-4 h-4 text-blue-400" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); /* deletar */ }}
                          className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>

                      {/* Badge status */}
                      <span className="px-3 py-1 bg-green-600/20 text-green-400 text-xs rounded-full border border-green-500/30">
                        Catálogo ativo
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* PAINEL DE DETALHES */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            {selectedLicensee ? (
              <>
                {/* Avatar e Nome */}
                <div className="text-center mb-6">
                  <div className={`w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden ${getAvatarColor(selectedLicensee.full_name)}`}>
                    {selectedLicensee.avatar_url ? (
                      <img src={selectedLicensee.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-2xl">{getInitials(selectedLicensee.full_name)}</span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedLicensee.full_name}</h2>
                  <span className="inline-block mt-2 px-3 py-1 bg-green-600/20 text-green-400 text-xs rounded-full border border-green-500/30">
                    Catálogo ativo
                  </span>
                </div>

                {/* Link do catálogo */}
                <div className="mb-6">
                  <p className="text-xs text-gray-400 mb-2">Link do catálogo</p>
                  <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-2">
                    <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300 truncate flex-1">
                      leilaonozap.net/Catalog?ref={selectedLicensee.referral_code || selectedLicensee.id}
                    </span>
                    <button 
                      onClick={() => copyLink(selectedLicensee.referral_code || selectedLicensee.id)}
                      className="p-1 hover:bg-gray-600 rounded"
                    >
                      <Copy className="w-4 h-4 text-green-400" />
                    </button>
                  </div>
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                      <ShoppingBag className="w-3 h-3" />
                      Vendas
                    </div>
                    <p className="text-xl font-bold text-white">{licenseeStats.totalSales || 0}</p>
                    <p className="text-xs text-gray-500">Mês passado: {licenseeStats.recentSales || 0}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                      <Calendar className="w-3 h-3" />
                      Última venda
                    </div>
                    <p className="text-sm font-semibold text-white">{formatDate(licenseeStats.lastSaleDate)}</p>
                  </div>
                </div>

                {/* Visitas no catálogo */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Visitas no catálogo</span>
                    <button className="text-xs text-green-400 hover:underline">Ver tudo</button>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Eye className="w-4 h-4" />
                    <span>0 visitas</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 mt-1">
                    <Users className="w-4 h-4" />
                    <span>0 contatos</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Últimos 30 dias</p>
                </div>

                {/* Produtos mais visitados */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Produtos mais visitados</span>
                    <button className="text-xs text-green-400 hover:underline">Ver tudo</button>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                    <div className="w-12 h-12 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-white font-medium mb-1">
                      {selectedLicensee.full_name?.split(' ')[0]} não teve visitas em seu catálogo nos últimos 30 dias
                    </p>
                    <p className="text-xs text-gray-500">
                      As visitas aos produtos são registradas quando um cliente acessa o catálogo e visualiza os produtos.
                    </p>
                  </div>
                </div>

                {/* Botões */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700">
                    Ver pedidos
                  </Button>
                  <Button variant="outline" className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700">
                    Editar cadastro
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Selecione um licenciado para ver os detalhes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Criar Licenciado */}
      {showCreateModal && (
        <CreateLicenseeModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadLicensees();
            toast.success("Licenciado cadastrado com sucesso!");
          }}
        />
      )}
    </div>
  );
}