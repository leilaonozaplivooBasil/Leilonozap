import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Pencil, 
  Copy, 
  Trash2, 
  Eye,
  Users,
  ShoppingBag,
  Calendar,
  X,
  Loader2,
  Check,
  Link2,
  ExternalLink
} from 'lucide-react';
import { toast } from "sonner";
import AddLicenseeModal from '../components/licensing/AddLicenseeModal';
import EditLicenseeModal from '../components/licensing/EditLicenseeModal';

const AppUser = base44.entities.AppUser;

export default function LicenseeManager() {
  const [licensees, setLicensees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLicensee, setSelectedLicensee] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLicensee, setEditingLicensee] = useState(null);
  const [catalogSales, setCatalogSales] = useState([]);

  // Carrega licenciados
  useEffect(() => {
    loadLicensees();
  }, []);

  const loadLicensees = async () => {
    setIsLoading(true);
    try {
      const users = await AppUser.list('-created_date', 500);
      // Filtra SOMENTE usuários que têm licenciado_catalogo nos career_levels
      const licenseeUsers = users.filter(u => 
        u.career_levels && u.career_levels.includes('licenciado_catalogo')
      );
      setLicensees(licenseeUsers);

      // Carrega vendas do catálogo
      try {
        const sales = await base44.entities.CatalogSale.list('-created_date', 500);
        setCatalogSales(Array.isArray(sales) ? sales : []);
      } catch (e) {
        console.log('CatalogSale não disponível');
      }
    } catch (error) {
      console.error('Erro ao carregar licenciados:', error);
      toast.error('Erro ao carregar licenciados');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtra licenciados pela busca
  const filteredLicensees = useMemo(() => {
    if (!searchTerm) return licensees;
    const term = searchTerm.toLowerCase();
    return licensees.filter(l => 
      l.full_name?.toLowerCase().includes(term) ||
      l.email?.toLowerCase().includes(term) ||
      l.referral_code?.toLowerCase().includes(term)
    );
  }, [licensees, searchTerm]);

  // Calcula estatísticas do licenciado selecionado
  const getStats = (licensee) => {
    if (!licensee) return { sales: 0, lastSale: null, visits: 0, contacts: 0 };
    
    const sales = catalogSales.filter(s => 
      s.licensee_id === licensee.id || 
      s.referred_by_code === licensee.referral_code
    );
    
    const lastSale = sales.length > 0 ? sales[0] : null;
    
    return {
      sales: sales.length,
      lastSale: lastSale?.created_date,
      visits: 0, // Pode ser implementado com tracking
      contacts: 0 // Pode ser implementado com tracking
    };
  };

  const copyLink = (licensee) => {
    // Mantém o ?ref= funcionando internamente, mas exibe visualmente /s/nome
    const link = `https://leilaonozap.net/Catalog?ref=${licensee.referral_code || licensee.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  // Gera o nome visual do link (sem afetar o código real)
  const getDisplaySlug = (licensee) => {
    if (licensee.nickname) {
      return licensee.nickname.toLowerCase().replace(/\s+/g, '');
    }
    if (licensee.full_name) {
      return licensee.full_name.split(' ')[0].toLowerCase();
    }
    return 'catalogo';
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-orange-500', 'bg-teal-500', 'bg-red-500', 'bg-indigo-500'
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const stats = selectedLicensee ? getStats(selectedLicensee) : null;

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Gerenciar Licenciados</h1>
            <p className="text-gray-400 text-sm">Gerencie os seus catálogos de vendedores</p>
          </div>
          <Button 
            onClick={() => setShowRegisterModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar vendedor
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Licenciados */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800 border-gray-700 shadow-lg">
              <CardContent className="p-4">
                {/* Busca */}
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Pesquisar por vendedores"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Contador */}
                <p className="text-sm text-gray-400 mb-4">
                  {filteredLicensees.length}/{licensees.length} vendedores
                </p>

                {/* Lista */}
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                  </div>
                ) : filteredLicensees.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum licenciado encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredLicensees.map((licensee) => {
                      const isSelected = selectedLicensee?.id === licensee.id;
                      const licenseeStats = getStats(licensee);
                      
                      return (
                        <div
                          key={licensee.id}
                          onClick={() => setSelectedLicensee(licensee)}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-green-900/30 border border-green-500/50' 
                              : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                          }`}
                        >
                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                            licensee.avatar_url ? '' : getAvatarColor(licensee.full_name)
                          }`}>
                            {licensee.avatar_url ? (
                              <img 
                                src={licensee.avatar_url} 
                                alt={licensee.full_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              getInitials(licensee.full_name)
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">
                              {licensee.full_name}
                            </p>
                            <p className="text-xs text-green-400 truncate flex items-center gap-1">
                              <Link2 className="w-3 h-3" />
                              leilaonozap.net/s/{getDisplaySlug(licensee)}
                            </p>
                          </div>

                          {/* Status */}
                          {licenseeStats.sales > 0 && (
                            <Badge className="bg-green-900/50 text-green-400 border border-green-500/30 text-xs">
                              {licenseeStats.sales} vendas
                            </Badge>
                          )}

                          <Badge className="bg-green-900/50 text-green-400 border border-green-500/30 text-xs">
                            Catálogo ativo
                          </Badge>

                          {/* Ações */}
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingLicensee(licensee);
                                setShowEditModal(true);
                              }}
                              className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-gray-400" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                copyLink(licensee);
                              }}
                              className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                            >
                              <Copy className="w-4 h-4 text-gray-400" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://leilaonozap.net/Catalog?ref=${licensee.referral_code || licensee.id}`, '_blank');
                              }}
                              className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Deletar
                              }}
                              className="p-2 hover:bg-red-900/50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detalhes do Licenciado */}
          <div className="lg:col-span-1">
            {selectedLicensee ? (
              <Card className="bg-gray-800 border-gray-700 shadow-lg sticky top-4">
                <CardContent className="p-6">
                  {/* Header do perfil */}
                  <div className="text-center mb-6">
                    <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3 ${
                      selectedLicensee.avatar_url ? '' : getAvatarColor(selectedLicensee.full_name)
                    }`}>
                      {selectedLicensee.avatar_url ? (
                        <img 
                          src={selectedLicensee.avatar_url} 
                          alt={selectedLicensee.full_name}
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        getInitials(selectedLicensee.full_name)
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-white">
                      {selectedLicensee.full_name}
                    </h3>
                    <Badge className="bg-green-900/50 text-green-400 border border-green-500/30 mt-2">
                      Catálogo ativo
                    </Badge>
                    <p className="text-xs text-green-400 mt-2 flex items-center justify-center gap-1">
                      <Link2 className="w-3 h-3" />
                      leilaonozap.net/s/{getDisplaySlug(selectedLicensee)}
                    </p>
                  </div>

                  {/* Ações rápidas */}
                  <div className="flex justify-center gap-2 mb-6">
                    <button 
                      onClick={() => {
                        setEditingLicensee(selectedLicensee);
                        setShowEditModal(true);
                      }}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Pencil className="w-5 h-5 text-gray-400" />
                    </button>
                    <button 
                      onClick={() => copyLink(selectedLicensee)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Copy className="w-5 h-5 text-gray-400" />
                    </button>
                    <button 
                      onClick={() => window.open(`https://leilaonozap.net/Catalog?ref=${selectedLicensee.referral_code || selectedLicensee.id}`, '_blank')}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-5 h-5 text-gray-400" />
                    </button>
                    <button className="p-2 hover:bg-red-900/50 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  {/* Estatísticas */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                      <p className="text-2xl font-bold text-white">{stats?.sales || 0}</p>
                      <p className="text-xs text-gray-400">Vendas</p>
                      <p className="text-xs text-gray-500">Mês passado</p>
                    </div>
                    <div className="text-center p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                      <p className="text-sm font-medium text-white">
                        {stats?.lastSale ? new Date(stats.lastSale).toLocaleDateString('pt-BR') : '-'}
                      </p>
                      <p className="text-xs text-gray-400">Última venda</p>
                    </div>
                  </div>

                  {/* Visitas no catálogo */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-300">Visitas no catálogo</p>
                      <button className="text-xs text-green-400 hover:underline">Ver tudo</button>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 space-y-2 border border-gray-600">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Eye className="w-4 h-4" />
                        <span>{stats?.visits || 0} visitas</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Users className="w-4 h-4" />
                        <span>{stats?.contacts || 0} contatos</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">Últimos 30 dias</p>
                  </div>

                  {/* Produtos mais visitados */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-300">Produtos mais visitados</p>
                      <button className="text-xs text-green-400 hover:underline">Ver tudo</button>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4 text-center border border-gray-600">
                      <p className="text-sm text-gray-400">
                        {selectedLicensee.full_name} não teve visitas em seu catálogo nos últimos 30 dias
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        As visitas aos produtos do vendedor são registradas quando um cliente acessa o catálogo do vendedor e visualiza os produtos.
                      </p>
                    </div>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 text-sm border-gray-600 text-gray-300 hover:bg-gray-700">
                      Ver pedidos
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 text-sm border-gray-600 text-gray-300 hover:bg-gray-700"
                      onClick={() => {
                        setEditingLicensee(selectedLicensee);
                        setShowEditModal(true);
                      }}
                    >
                      Editar cadastro
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gray-800 border-gray-700 shadow-lg">
                <CardContent className="p-6 text-center">
                  <Users className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400">Selecione um licenciado para ver os detalhes</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Cadastro de Vendedor */}
      {showRegisterModal && (
        <AddLicenseeModal
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            setShowRegisterModal(false);
            loadLicensees();
          }}
        />
      )}

      {/* Modal de Edição de Vendedor */}
      {showEditModal && editingLicensee && (
        <EditLicenseeModal
          licensee={editingLicensee}
          onClose={() => {
            setShowEditModal(false);
            setEditingLicensee(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingLicensee(null);
            loadLicensees();
            // Atualiza o selectedLicensee se for o mesmo
            if (selectedLicensee?.id === editingLicensee.id) {
              setSelectedLicensee(null);
            }
          }}
        />
      )}
    </div>
  );
}