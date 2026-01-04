import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, DollarSign, Search, ChevronDown, ChevronUp, Wallet, CheckCircle, XCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { approveWithdrawal } from "@/functions/approveWithdrawal";
import { rejectWithdrawal } from "@/functions/rejectWithdrawal";

const MASTER_ADMIN_EMAIL = 'luizsantanna@tttcorporate.com';

export default function InfluencersDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [influencers, setInfluencers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedInfluencer, setExpandedInfluencer] = useState(null);
  const [purchases, setPurchases] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("influencers");
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

        // Carrega solicitações de saque
        const withdrawals = await base44.entities.WithdrawalRequest.list("-created_date", 100);
        setWithdrawalRequests(withdrawals);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
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

  const handleApproveWithdrawal = async (withdrawalId) => {
    if (!confirm("Aprovar este saque?")) return;
    
    try {
      await approveWithdrawal({ withdrawal_id: withdrawalId });
      toast.success("Saque aprovado com sucesso!");
      
      // Recarrega lista
      const withdrawals = await base44.entities.WithdrawalRequest.list("-created_date", 100);
      setWithdrawalRequests(withdrawals);
    } catch (error) {
      toast.error("Erro ao aprovar saque: " + error.message);
    }
  };

  const handleRejectWithdrawal = async (withdrawalId) => {
    const reason = prompt("Motivo da rejeição:");
    if (!reason) return;
    
    try {
      await rejectWithdrawal({ withdrawal_id: withdrawalId, reason });
      toast.success("Saque rejeitado!");
      
      // Recarrega lista
      const withdrawals = await base44.entities.WithdrawalRequest.list("-created_date", 100);
      setWithdrawalRequests(withdrawals);
    } catch (error) {
      toast.error("Erro ao rejeitar saque: " + error.message);
    }
  };

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="influencers" className="data-[state=active]:bg-gray-700">
              <Users className="w-4 h-4 mr-2" />
              Influenciadores
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="data-[state=active]:bg-gray-700">
              <Wallet className="w-4 h-4 mr-2" />
              Gerenciar Saques
            </TabsTrigger>
          </TabsList>

          <TabsContent value="influencers" className="mt-6">

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
          </TabsContent>

          <TabsContent value="withdrawals" className="mt-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Wallet className="w-6 h-6" />
                  Solicitações de Saque
                </CardTitle>
              </CardHeader>
              <CardContent>
                {withdrawalRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Wallet className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="font-semibold">Nenhuma solicitação de saque</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {withdrawalRequests.map(request => (
                      <Card key={request.id} className="bg-gray-900 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-white mb-1">
                                Influenciador ID: {request.influencer_id}
                              </p>
                              <p className="text-sm text-gray-400">
                                PIX: {request.pix_key} ({request.pix_key_type})
                              </p>
                              <p className="text-sm text-gray-400">
                                Titular: {request.recipient_name}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(request.created_date).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <div className="text-right mr-6">
                              <p className="text-2xl font-bold text-green-400">
                                R$ {request.amount.toFixed(2)}
                              </p>
                              <div className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                                request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                request.status === 'completed' || request.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {request.status === 'pending' ? '⏳ Pendente' :
                                 request.status === 'completed' || request.status === 'approved' ? '✅ Aprovado' :
                                 '❌ Rejeitado'}
                              </div>
                            </div>
                            {request.status === 'pending' && (
                              <div className="flex flex-col gap-2">
                                <Button
                                  onClick={() => handleApproveWithdrawal(request.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                  size="sm"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Aprovar
                                </Button>
                                <Button
                                  onClick={() => handleRejectWithdrawal(request.id)}
                                  variant="outline"
                                  className="border-red-500 text-red-400 hover:bg-red-600"
                                  size="sm"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Rejeitar
                                </Button>
                              </div>
                            )}
                          </div>
                          {request.notes && (
                            <p className="text-sm text-gray-500 mt-3 border-t border-gray-700 pt-3">
                              Obs: {request.notes}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}