import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, TrendingUp, DollarSign, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const MASTER_ADMIN_EMAIL = 'luizsantanna@tttcorporate.com';

export default function InfluencersDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [influencers, setInfluencers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedInfluencer, setExpandedInfluencer] = useState(null);
  const [purchases, setPurchases] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');

      if (!savedUserJSON || !isLoggedIn) {
        navigate(createPageUrl("Home"));
        return;
      }

      const user = JSON.parse(savedUserJSON);
      
      if (user.role !== 'admin' && user.email !== MASTER_ADMIN_EMAIL) {
        alert("Acesso negado. Apenas administradores.");
        navigate(createPageUrl("Home"));
        return;
      }

      setCurrentUser(user);

      try {
        // Carrega todos os leads
        const allLeads = await base44.entities.InfluencerLead.list("-created_date", 500);
        
        // Agrupa por influenciador
        const influencerMap = {};
        
        allLeads.forEach(lead => {
          if (!influencerMap[lead.influencer_id]) {
            influencerMap[lead.influencer_id] = {
              influencer_id: lead.influencer_id,
              influencer_name: lead.influencer_name,
              influencer_code: lead.influencer_code,
              leads: [],
              totalLeads: 0,
              totalPurchases: 0,
              totalRevenue: 0
            };
          }
          
          influencerMap[lead.influencer_id].leads.push(lead);
          influencerMap[lead.influencer_id].totalLeads++;
          influencerMap[lead.influencer_id].totalPurchases += (lead.total_purchases || 0);
          influencerMap[lead.influencer_id].totalRevenue += (lead.total_spent || 0);
        });

        setInfluencers(Object.values(influencerMap));
      } catch (error) {
        console.error("Erro ao carregar influenciadores:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const loadPurchasesForInfluencer = async (influencerId) => {
    if (purchases[influencerId]) {
      setExpandedInfluencer(expandedInfluencer === influencerId ? null : influencerId);
      return;
    }

    try {
      const influencerPurchases = await base44.entities.InfluencerPurchase.filter(
        { influencer_id: influencerId },
        "-purchase_date",
        100
      );
      
      setPurchases(prev => ({
        ...prev,
        [influencerId]: influencerPurchases
      }));
      
      setExpandedInfluencer(influencerId);
    } catch (error) {
      console.error("Erro ao carregar compras:", error);
    }
  };

  const filteredInfluencers = influencers.filter(inf =>
    inf.influencer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inf.influencer_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStats = influencers.reduce(
    (acc, inf) => ({
      totalLeads: acc.totalLeads + inf.totalLeads,
      totalPurchases: acc.totalPurchases + inf.totalPurchases,
      totalRevenue: acc.totalRevenue + inf.totalRevenue
    }),
    { totalLeads: 0, totalPurchases: 0, totalRevenue: 0 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Painel de Influenciadores</h1>
          <p className="text-gray-400">Gerenciamento completo de indicações Sai de Baixo</p>
        </div>

        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800 border-blue-500">
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <p className="text-4xl font-bold text-white mb-2">{totalStats.totalLeads}</p>
              <p className="text-gray-400">Total de Indicações</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-green-500">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-4xl font-bold text-white mb-2">{totalStats.totalPurchases}</p>
              <p className="text-gray-400">Total de Compras</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-yellow-500">
            <CardContent className="p-6 text-center">
              <DollarSign className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              <p className="text-4xl font-bold text-white mb-2">
                R$ {totalStats.totalRevenue.toFixed(2)}
              </p>
              <p className="text-gray-400">Receita Total Gerada</p>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Buscar por nome ou código do influenciador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>

        {/* Lista de Influenciadores */}
        <div className="space-y-4">
          {filteredInfluencers.map((influencer) => (
            <Card key={influencer.influencer_id} className="bg-gray-800 border-gray-700">
              <CardHeader className="cursor-pointer" onClick={() => loadPurchasesForInfluencer(influencer.influencer_id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-white mb-2">
                      {influencer.influencer_name}
                    </CardTitle>
                    <p className="text-sm text-gray-400">
                      Código: <span className="font-mono font-bold text-green-400">{influencer.influencer_code}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-400">{influencer.totalLeads}</p>
                      <p className="text-xs text-gray-400">Indicações</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">{influencer.totalPurchases}</p>
                      <p className="text-xs text-gray-400">Compras</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-400">
                        R$ {influencer.totalRevenue.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">Receita</p>
                    </div>
                    {expandedInfluencer === influencer.influencer_id ? (
                      <ChevronUp className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {expandedInfluencer === influencer.influencer_id && (
                <CardContent className="border-t border-gray-700 pt-4">
                  <h4 className="font-semibold text-white mb-4">Indicações:</h4>
                  <div className="space-y-3">
                    {influencer.leads.map((lead) => (
                      <div key={lead.id} className="bg-gray-900 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold text-white">
                              {lead.lead_name || lead.lead_email}
                            </p>
                            <p className="text-sm text-gray-400">{lead.lead_email}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            lead.status === 'active_buyer' 
                              ? 'bg-green-500/20 text-green-400' 
                              : lead.status === 'registered'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {lead.status === 'active_buyer' ? '✅ Comprador' : 
                             lead.status === 'registered' ? '📝 Cadastrado' : 
                             '⏳ Pendente'}
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span className="text-gray-400">
                            Compras: <span className="text-green-400 font-semibold">{lead.total_purchases || 0}</span>
                          </span>
                          <span className="text-gray-400">
                            Total gasto: <span className="text-yellow-400 font-semibold">R$ {(lead.total_spent || 0).toFixed(2)}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {purchases[influencer.influencer_id] && purchases[influencer.influencer_id].length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-white mb-4">Histórico de Compras:</h4>
                      <div className="space-y-2">
                        {purchases[influencer.influencer_id].map((purchase) => (
                          <div key={purchase.id} className="bg-gray-900 p-3 rounded-lg flex justify-between items-center">
                            <div>
                              <p className="text-white font-medium">{purchase.product_title}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(purchase.purchase_date).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <p className="text-green-400 font-bold">
                              R$ {purchase.amount.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {filteredInfluencers.length === 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Nenhum influenciador encontrado
              </h3>
              <p className="text-gray-400">
                {searchTerm 
                  ? "Tente buscar com outros termos." 
                  : "Ainda não há influenciadores cadastrados."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}