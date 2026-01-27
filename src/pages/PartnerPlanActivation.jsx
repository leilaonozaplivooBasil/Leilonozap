import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 1,
    name: "Plano Visionário",
    minInvestment: 5000,
    expectedReturn: 3,
    duration: 60,
    description: "Ideal para quem está começando. Produtos de alta liquidez e demanda garantida."
  },
  {
    id: 2,
    name: "Plano Sócios de Ouro",
    minInvestment: 15000,
    expectedReturn: 3,
    duration: 60,
    description: "Para parceiros que buscam maior retorno com segurança."
  },
  {
    id: 3,
    name: "Plano Elite",
    minInvestment: 30000,
    expectedReturn: 3,
    duration: 60,
    description: "Máximo retorno com acesso a todas as oportunidades."
  }
];

export default function PartnerPlanActivation() {
  const [searchTerm, setSearchTerm] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationHistory, setActivationHistory] = useState([]);
  const [activationDate, setActivationDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSearchUser = async () => {
    if (!searchTerm.trim()) {
      toast.error('Digite um CPF ou email válido');
      return;
    }

    setIsSearching(true);
    try {
      // Buscar por CPF ou email
      const cleanTerm = searchTerm.trim();
      const isCpf = /^\d/.test(cleanTerm);
      
      let users;
      if (isCpf) {
        users = await base44.entities.AppUser.filter({ cpf: cleanTerm }, '-created_date', 10);
      } else {
        users = await base44.entities.AppUser.filter({ email: cleanTerm }, '-created_date', 10);
      }
      
      if (users && users.length > 0) {
        setFoundUser(users[0]);
        setSelectedPlan(null);
        toast.success(`Usuário encontrado: ${users[0].full_name}`);
      } else {
        setFoundUser(null);
        toast.error('Nenhum usuário encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      toast.error('Erro ao buscar usuário');
    } finally {
      setIsSearching(false);
    }
  };

  const handleActivatePlan = async () => {
    if (!foundUser || !selectedPlan) {
      toast.error('Selecione um plano');
      return;
    }

    setIsActivating(true);
    try {
      const loadingToast = toast.loading('Ativando plano...');

      const activationDateTime = new Date(activationDate).toISOString();

      // Criar cronograma de compras
      const schedule = [];
      const start = new Date(activationDate);
      for (let i = 1; i <= 3; i++) {
        const purchaseDate = new Date(start);
        purchaseDate.setDate(purchaseDate.getDate() + (i * 15));
        schedule.push({
          period: i,
          date: purchaseDate.toISOString(),
          status: 'scheduled'
        });
      }

      // ✅ CRIAR REGISTRO DE COMPRA INDIVIDUAL (cada ativação = 1 registro)
      const newPurchase = await base44.entities.PartnerPlanPurchase.create({
        user_id: foundUser.id,
        user_name: foundUser.full_name,
        user_email: foundUser.email,
        plan_name: selectedPlan.name,
        plan_amount: selectedPlan.minInvestment,
        activated_at: activationDateTime,
        status: 'active',
        purchase_periods: schedule,
        activation_source: 'manual'
      });

      console.log('✅ Plano criado com ID:', newPurchase.id);

      // ⚠️ NÃO atualiza mais o AppUser (legacy) - agora só usa PartnerPlanPurchase
      // O AppUser mantém os campos para compatibilidade mas não é mais fonte de verdade

      // Log da ativação
      await base44.entities.SystemLog.create({
        step: 'PARTNER_PLAN_ACTIVATED',
        status: 'success',
        message: `Plano ${selectedPlan.name} ativado para ${foundUser.full_name}`,
        component_name: 'PartnerPlanActivation',
        payload: {
          user_id: foundUser.id,
          user_email: foundUser.email,
          plan_name: selectedPlan.name,
          plan_amount: selectedPlan.minInvestment,
          activated_at: activationDateTime,
          purchase_id: newPurchase.id
        }
      }).catch(() => {});

      toast.dismiss(loadingToast);
      toast.success(`✅ Plano ${selectedPlan.name} ativado! O parceiro verá no painel.`);

      // Adicionar ao histórico
      setActivationHistory([
        {
          id: foundUser.id,
          userName: foundUser.full_name,
          userEmail: foundUser.email,
          planName: selectedPlan.name,
          amount: selectedPlan.minInvestment,
          activatedAt: new Date().toLocaleString('pt-BR')
        },
        ...activationHistory
      ]);

      // Limpar estado
      setSearchTerm('');
      setFoundUser(null);
      setSelectedPlan(null);
      setActivationDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Erro ao ativar plano:', error);
      toast.dismiss();
      toast.error('Erro ao ativar plano: ' + error.message);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Gerenciar Planos de Parceiros</h1>
        <p className="text-gray-400 mb-8">Ative planos para parceiros e permita que acompanhem no painel</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel de Ativação */}
          <Card className="bg-gray-800 border-gray-700 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl">Ativar Novo Plano</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Busca por CPF ou Email */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">CPF ou Email do Parceiro</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="000.000.000-00 ou email@exemplo.com"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                    className="bg-gray-700 border-gray-600 text-white flex-1"
                    disabled={isSearching}
                  />
                  <Button
                    onClick={handleSearchUser}
                    disabled={isSearching}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Usuário encontrado */}
              {foundUser && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="font-semibold text-green-400">Usuário Encontrado</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-400">Nome:</span> {foundUser.full_name}</p>
                    <p><span className="text-gray-400">Email:</span> {foundUser.email}</p>
                    <p><span className="text-gray-400">CPF:</span> {foundUser.cpf}</p>
                  </div>
                </div>
              )}

              {/* Data de Ativação */}
              {foundUser && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">Data de Ativação do Plano</label>
                  <Input
                    type="date"
                    value={activationDate}
                    onChange={(e) => setActivationDate(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <p className="text-xs text-gray-400">Esta data será usada para calcular o cronograma de compras</p>
                </div>
              )}

              {/* Seleção de Plano */}
              {foundUser && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">Selecionar Plano</label>
                  <div className="space-y-2">
                    {PLANS.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                          selectedPlan?.id === plan.id
                            ? 'bg-green-900/30 border-green-500'
                            : 'bg-gray-700/50 border-gray-600 hover:border-green-500/50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{plan.name}</h4>
                            <p className="text-sm text-gray-400">{plan.description}</p>
                          </div>
                          {selectedPlan?.id === plan.id && (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          )}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-gray-300">
                          <span>Investimento: R$ {plan.minInvestment.toLocaleString('pt-BR')}</span>
                          <span>Retorno: {plan.expectedReturn}%</span>
                          <span>Prazo: {plan.duration} dias</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              {foundUser && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setSearchTerm('');
                      setFoundUser(null);
                      setSelectedPlan(null);
                    }}
                    variant="outline"
                    className="flex-1 bg-gray-700 hover:bg-gray-600 border-gray-600"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleActivatePlan}
                    disabled={isActivating || !selectedPlan}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
                  >
                    {isActivating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Ativar Plano
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Ativações */}
          <Card className="bg-gray-800 border-gray-700 h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Ativações Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {activationHistory.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Nenhuma ativação realizada</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activationHistory.map((record) => (
                    <div key={record.id} className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-xs">
                      <div className="font-semibold text-green-400 mb-1">{record.planName}</div>
                      <p className="text-gray-300 truncate">{record.userName}</p>
                      <p className="text-gray-400">R$ {record.amount.toLocaleString('pt-BR')}</p>
                      <p className="text-gray-500 text-[10px] mt-1">{record.activatedAt}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Como Funciona</p>
                  <p className="text-xs text-gray-400 mt-1">Digite o CPF, selecione um plano e ative. O parceiro verá na dashboard.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Acompanhamento</p>
                  <p className="text-xs text-gray-400 mt-1">Parceiros veem o plano ativo no painel de Parceiro de Compra.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Search className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Busca Rápida</p>
                  <p className="text-xs text-gray-400 mt-1">Pesquise por CPF ou email para encontrar qualquer parceiro.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}