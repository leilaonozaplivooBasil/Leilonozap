import React, { useState, useEffect } from 'react';
import { fmtBR } from '@/lib/money';
import { base44 } from '@/api/base44Client';
import { getPartnerPurchases } from '@/functions/getPartnerPurchases';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Search, 
  Edit2, 
  X, 
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Flag,
  FileText,
  Handshake
} from 'lucide-react';
import { toast } from 'sonner';
import PortalPageHeader from '@/components/common/PortalPageHeader';

const PLANS = [
  {
    name: "Plano Visionário",
    minInvestment: 5000,
    expectedReturn: 3,
    duration: 60
  },
  {
    name: "Plano Sócios de Ouro",
    minInvestment: 15000,
    expectedReturn: 3,
    duration: 60
  },
  {
    name: "Plano Elite",
    minInvestment: 30000,
    expectedReturn: 3,
    duration: 60
  }
];

export default function ActivePartners() {
  const [partnerPurchases, setPartnerPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({
    plan_name: '',
    plan_amount: 0,
    activated_at: '',
    is_investment: false,
    investment_rate: 3,
    notes: ''
  });
  const [showInstallmentsModal, setShowInstallmentsModal] = useState(false);
  const [selectedPurchaseForInstallments, setSelectedPurchaseForInstallments] = useState(null);
  const [installments, setInstallments] = useState([]);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadInstallments = async (purchase) => {
    try {
      // Gera as 12 parcelas (começando após 60 dias)
      const activationDate = new Date(purchase.activated_at);
      const firstInstallmentDate = new Date(activationDate);
      firstInstallmentDate.setDate(firstInstallmentDate.getDate() + 60); // 60 dias após ativação
      
      // Calcula valor mensal: valor investido * taxa / 100
      const rate = purchase.investment_rate || 3; // 3% ou 5%
      const monthlyValue = (purchase.plan_amount * rate) / 100;
      
      // Busca dados de purchase_periods se existir
      const periods = purchase.purchase_periods || [];
      
      const allInstallments = [];
      for (let i = 1; i <= 12; i++) {
        const installmentDate = new Date(firstInstallmentDate);
        installmentDate.setMonth(installmentDate.getMonth() + (i - 1));
        
        // Verifica se já existe status para esta parcela
        const periodData = periods.find(p => p.period === i);
        
        allInstallments.push({
          purchase_id: purchase.id,
          purchase_name: purchase.plan_name,
          plan_amount: purchase.plan_amount,
          rate: rate,
          period: i,
          date: installmentDate.toISOString(),
          value: monthlyValue,
          paid: periodData?.status === 'paid',
          status: installmentDate > new Date() ? 'pending' : 'available'
        });
      }
      
      setInstallments(allInstallments);
      setSelectedPurchaseForInstallments(purchase);
      setShowInstallmentsModal(true);
    } catch (error) {
      console.error('Erro ao carregar parcelas:', error);
      toast.error('Erro ao carregar parcelas');
    }
  };

  const toggleInstallmentPaid = async (installment) => {
    try {
      // Busca a compra para atualizar
      const purchases = await base44.entities.PartnerPlanPurchase.filter({ id: installment.purchase_id });
      if (!purchases || purchases.length === 0) return;
      
      const targetPurchase = purchases[0];
      const periods = targetPurchase.purchase_periods || [];
      const existingPeriod = periods.find(p => p.period === installment.period);
      
      let updatedPeriods;
      if (existingPeriod) {
        updatedPeriods = periods.map(p => 
          p.period === installment.period 
            ? { ...p, status: p.status === 'paid' ? 'pending' : 'paid' }
            : p
        );
      } else {
        updatedPeriods = [...periods, {
          period: installment.period,
          date: installment.date,
          status: 'paid'
        }];
      }
      
      await base44.entities.PartnerPlanPurchase.update(installment.purchase_id, {
        purchase_periods: updatedPeriods
      });
      
      // Atualiza UI local
      setInstallments(prev => 
        prev.map(inst => 
          inst.period === installment.period
            ? { ...inst, paid: !inst.paid }
            : inst
        )
      );
      
      toast.success(`Parcela ${installment.period} marcada como ${!installment.paid ? 'paga' : 'não paga'}`);
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error);
      toast.error('Erro ao atualizar parcela');
    }
  };

  const loadPartners = async () => {
    setIsLoading(true);
    try {
      // 1️⃣ Buscar todas as compras ativas via backend function (bypassa RLS)
      const response = await getPartnerPurchases({ mode: 'admin', status_filter: 'active' });
      const purchases = response?.data?.purchases || [];

      // 2️⃣ Buscar usuários com planos ativos no sistema antigo (AppUser)
      const usersWithPlans = await base44.entities.AppUser.list('-partner_plan_activated_at', 500);
      
      // 3️⃣ CRIAR SET de user_ids que JÁ TEM planos no sistema novo
      const userIdsWithNewPlans = new Set(purchases.map(p => p.user_id));
      
      // 4️⃣ Filtrar legacies: APENAS quem NÃO tem planos no sistema novo
      const legacyActivations = usersWithPlans
        .filter(user => {
          return (
            user.active_partner_plan && 
            user.partner_plan_activated_at && 
            !userIdsWithNewPlans.has(user.id)
          );
        })
        .map(user => ({
          id: `legacy_${user.id}`,
          user_id: user.id,
          user_name: user.full_name,
          user_email: user.email,
          plan_name: user.active_partner_plan,
          plan_amount: user.partner_plan_amount,
          activated_at: user.partner_plan_activated_at,
          status: 'active',
          activation_source: 'legacy'
        }));

      console.log('📊 Planos sistema novo:', purchases.length, '| Legacy:', legacyActivations.length);

      const allActivations = [...purchases, ...legacyActivations];
      setPartnerPurchases(allActivations);
    } catch (error) {
      console.error('Erro ao carregar parceiros:', error);
      toast.error('Erro ao carregar parceiros');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (purchase) => {
    setEditingPurchase(purchase);
    setEditFormData({
      plan_name: purchase.plan_name || '',
      plan_amount: purchase.plan_amount || 0,
      activated_at: purchase.activated_at 
        ? new Date(purchase.activated_at).toISOString().split('T')[0]
        : '',
      is_investment: purchase.is_investment || false,
      investment_rate: purchase.investment_rate || 3,
      notes: purchase.notes || ''
    });
  };

  const handleSave = async () => {
    if (!editingPurchase) return;

    setIsSaving(true);
    try {
      const activationDateTime = new Date(editFormData.activated_at).toISOString();

      // Recalcular cronograma de compras
      const schedule = [];
      const start = new Date(editFormData.activated_at);
      for (let i = 1; i <= 3; i++) {
        const purchaseDate = new Date(start);
        purchaseDate.setDate(purchaseDate.getDate() + (i * 15));
        schedule.push({
          period: i,
          date: purchaseDate.toISOString(),
          status: 'scheduled'
        });
      }

      // Calcular data de retirada (12 meses a partir da ativação)
      const withdrawalDate = editFormData.is_investment 
        ? new Date(new Date(editFormData.activated_at).setMonth(new Date(editFormData.activated_at).getMonth() + 12)).toISOString()
        : null;

      // Verificar se é ativação legacy ou nova
      if (editingPurchase.activation_source === 'legacy') {
        // Atualizar no AppUser
        await base44.entities.AppUser.update(editingPurchase.user_id, {
          active_partner_plan: editFormData.plan_name || null,
          partner_plan_amount: parseFloat(editFormData.plan_amount) || 0,
          partner_plan_activated_at: activationDateTime
        });
      } else {
        // Atualizar no PartnerPlanPurchase
        await base44.entities.PartnerPlanPurchase.update(editingPurchase.id, {
          plan_name: editFormData.plan_name || null,
          plan_amount: parseFloat(editFormData.plan_amount) || 0,
          activated_at: activationDateTime,
          purchase_periods: schedule,
          is_investment: editFormData.is_investment || false,
          investment_rate: editFormData.is_investment ? parseFloat(editFormData.investment_rate) : null,
          withdrawal_available_date: withdrawalDate,
          accumulated_return: 0,
          notes: editFormData.notes?.trim() || null
        });
      }

      // Log da edição
      await base44.entities.SystemLog.create({
        step: 'PARTNER_PURCHASE_EDITED',
        status: 'success',
        message: `Compra de plano editada para ${editingPurchase.user_name}`,
        component_name: 'ActivePartners',
        payload: {
          purchase_id: editingPurchase.id,
          user_id: editingPurchase.user_id,
          plan_name: editFormData.plan_name,
          plan_amount: editFormData.plan_amount,
          activated_at: editFormData.activated_at
        }
      }).catch(() => {});

      toast.success('✅ Ativação atualizada com sucesso!');
      setEditingPurchase(null);
      loadPartners();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (purchase) => {
    if (!confirm(`Deseja desativar esta compra de ${purchase.user_name}?`)) return;

    try {
      // Verificar se é ativação legacy ou nova
      if (purchase.activation_source === 'legacy') {
        // Desativar no AppUser
        await base44.entities.AppUser.update(purchase.user_id, {
          active_partner_plan: null,
          partner_plan_amount: null,
          partner_plan_activated_at: null
        });
      } else {
        // Desativar no PartnerPlanPurchase
        await base44.entities.PartnerPlanPurchase.update(purchase.id, {
          status: 'canceled'
        });
      }

      await base44.entities.SystemLog.create({
        step: 'PARTNER_PURCHASE_CANCELED',
        status: 'success',
        message: `Compra de plano cancelada para ${purchase.user_name}`,
        component_name: 'ActivePartners',
        payload: {
          purchase_id: purchase.id,
          user_id: purchase.user_id,
          plan_name: purchase.plan_name
        }
      }).catch(() => {});

      toast.success('✅ Compra desativada!');
      loadPartners();
    } catch (error) {
      console.error('Erro ao desativar:', error);
      toast.error('Erro ao desativar compra: ' + error.message);
    }
  };

  const calculatePurchaseSchedule = (activationDate, planAmount) => {
    if (!activationDate) return [];

    const start = new Date(activationDate);
    const schedule = [];
    
    // 60 dias de plano, dividido em períodos quinzenais (4 períodos de 15 dias)
    // Primeira quinzena: organização (sem compra)
    // Próximas 3 quinzenas: compras de produtos

    // Períodos de compra: dias 15, 30, 45
    for (let i = 1; i <= 3; i++) {
      const purchaseDate = new Date(start);
      purchaseDate.setDate(purchaseDate.getDate() + (i * 15));
      
      const isActive = purchaseDate <= new Date();
      
      schedule.push({
        period: i,
        date: purchaseDate.toLocaleDateString('pt-BR'),
        isActive,
        status: isActive ? 'Ativa' : 'Agendada'
      });
    }

    return schedule;
  };

  const filteredPurchases = partnerPurchases.filter(purchase => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      purchase.user_name?.toLowerCase().includes(term) ||
      purchase.user_email?.toLowerCase().includes(term) ||
      purchase.plan_name?.toLowerCase().includes(term)
    );
  });

  const totalInvested = partnerPurchases.reduce((sum, p) => sum + (p.plan_amount || 0), 0);
  const uniquePartners = new Set(partnerPurchases.map(p => p.user_id)).size;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <PortalPageHeader
          icon={Handshake}
          title="Parceiros Ativos"
          subtitle="Gerencie todos os planos de parceria ativos"
          accentColor="purple"
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm mb-1">Parceiros Únicos</p>
                  <p className="text-xl sm:text-3xl font-bold text-white">{uniquePartners}</p>
                  <p className="text-xs text-gray-500 mt-1">{partnerPurchases.length} ativações</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm mb-1">Total Investido</p>
                  <p className="text-xl sm:text-3xl font-bold text-green-400">
                    R$ {totalInvested.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm mb-1">Retorno Previsto (3%)</p>
                  <p className="text-xl sm:text-3xl font-bold text-blue-400">
                    R$ {(totalInvested * 0.03).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, email, CPF ou plano..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>

        {/* Purchases List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-400" />
          </div>
        ) : filteredPurchases.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Nenhuma ativação encontrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPurchases.map((purchase) => {
              const schedule = calculatePurchaseSchedule(
                purchase.activated_at, 
                purchase.plan_amount
              );
              const activePurchases = schedule.filter(s => s.isActive).length;

              return (
                <Card key={purchase.id} className="bg-gray-800 border-gray-700 hover:border-green-500/50 transition-all relative">
                  {/* Bandeirinha de Observação */}
                  {purchase.notes && (
                    <div className="absolute -top-3 -right-3 z-10">
                      <div className="relative group">
                        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-pulse cursor-pointer">
                          <Flag className="w-6 h-6 text-white" />
                        </div>
                        <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900 border border-red-500/50 rounded-lg p-3 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity shadow-xl">
                          <p className="text-xs text-red-400 font-semibold mb-1">🚩 Observação Registrada</p>
                          <p className="text-xs text-gray-300">{purchase.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <CardContent className="p-3 sm:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                      {/* Info da Compra */}
                      <div className="lg:col-span-2 space-y-3">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base sm:text-xl font-bold text-white">{purchase.user_name}</h3>
                            <p className="text-gray-400 text-sm">{purchase.user_email}</p>
                            <Badge className="mt-2 bg-green-600 text-white text-xs">
                              {purchase.activation_source === 'manual' 
                                ? '🔧 Ativação Manual' 
                                : purchase.activation_source === 'legacy'
                                ? '📋 Sistema Anterior'
                                : '💰 Lucre Conosco'}
                            </Badge>
                          </div>
                          <div className="flex gap-1 sm:gap-2 flex-wrap">
                            <Button
                              size="sm"
                              onClick={() => loadInstallments(purchase)}
                              className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                            >
                              💰 Parcelas
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleEdit(purchase)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDeactivate(purchase)}
                              variant="outline"
                              className="border-red-500 text-red-500 hover:bg-red-500/20"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Plano</p>
                            <Badge className="bg-green-600 text-white">
                              {purchase.plan_name}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Valor Investido</p>
                            <p className="text-white font-bold">
                              R$ {(purchase.plan_amount || 0).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Data de Ativação</p>
                            <p className="text-white">
                              {purchase.activated_at 
                                ? new Date(purchase.activated_at).toLocaleDateString('pt-BR')
                                : '-'
                              }
                            </p>
                          </div>
                        </div>

                        {/* Observações */}
                        {purchase.notes && (
                          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mt-3">
                            <div className="flex items-start gap-2">
                              <FileText className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-red-400 text-xs font-semibold mb-1">📝 Observação:</p>
                                <p className="text-gray-300 text-xs leading-relaxed">{purchase.notes}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Cronograma de Compras */}
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Compras Ativas ({activePurchases}/3)
                        </h4>
                        <div className="space-y-2">
                          {schedule.map((item) => (
                            <div 
                              key={item.period}
                              className={`flex items-center justify-between text-xs p-2 rounded ${
                                item.isActive 
                                  ? 'bg-green-600/20 border border-green-500/30' 
                                  : 'bg-gray-800 border border-gray-700'
                              }`}
                            >
                              <span className={item.isActive ? 'text-green-400 font-semibold' : 'text-gray-400'}>
                                Período {item.period}
                              </span>
                              <span className="text-gray-500">{item.date}</span>
                              {item.isActive ? (
                                <CheckCircle className="w-3 h-3 text-green-400" />
                              ) : (
                                <Calendar className="w-3 h-3 text-gray-600" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {editingPurchase && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="bg-gray-800 border-gray-700 max-w-md w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Editar Ativação</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingPurchase(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">Nome do Parceiro</Label>
                  <Input
                    value={editingPurchase.user_name}
                    disabled
                    className="bg-gray-700 text-gray-400 border-gray-600"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Email</Label>
                  <Input
                    value={editingPurchase.user_email}
                    disabled
                    className="bg-gray-700 text-gray-400 border-gray-600"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Plano</Label>
                  <select
                    value={editFormData.plan_name}
                    onChange={(e) => setEditFormData({
                      ...editFormData, 
                      plan_name: e.target.value,
                      plan_amount: PLANS.find(p => p.name === e.target.value)?.minInvestment || editFormData.plan_amount
                    })}
                    className="w-full bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Selecione um plano</option>
                    {PLANS.map((plan) => (
                      <option key={plan.name} value={plan.name}>{plan.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Valor do Plano</Label>
                  <Input
                    type="number"
                    value={editFormData.plan_amount}
                    onChange={(e) => setEditFormData({...editFormData, plan_amount: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Data de Ativação</Label>
                  <Input
                    type="date"
                    value={editFormData.activated_at}
                    onChange={(e) => setEditFormData({...editFormData, activated_at: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Esta data define o cronograma de compras ativas
                  </p>
                </div>

                {/* Observações */}
                <div>
                  <Label className="text-gray-300 mb-2 block">📝 Observações / Lembretes</Label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                    placeholder="Ex: Retorno adicional de 5% acordado, revisão em 30 dias..."
                    rows={3}
                    className="w-full bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    💡 Use para lembretes sobre condições especiais
                  </p>
                </div>

                {/* Opção de Investimento com Rendimento */}
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="is_investment"
                      checked={editFormData.is_investment}
                      onChange={(e) => setEditFormData({...editFormData, is_investment: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-green-500"
                    />
                    <Label htmlFor="is_investment" className="text-gray-300 cursor-pointer">
                      💰 Modalidade Investimento (com rendimento)
                    </Label>
                  </div>

                  {editFormData.is_investment && (
                    <div className="space-y-4 pl-7 border-l-2 border-green-500/30">
                      <div>
                        <Label className="text-gray-300 mb-2 block">Taxa de Rendimento Mensal</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setEditFormData({...editFormData, investment_rate: 3})}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              editFormData.investment_rate === 3
                                ? 'border-green-500 bg-green-600/20 text-green-400'
                                : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                            }`}
                          >
                            <p className="font-bold text-lg">3%</p>
                            <p className="text-xs">ao mês</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditFormData({...editFormData, investment_rate: 5})}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              editFormData.investment_rate === 5
                                ? 'border-green-500 bg-green-600/20 text-green-400'
                                : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                            }`}
                          >
                            <p className="font-bold text-lg">5%</p>
                            <p className="text-xs">ao mês</p>
                          </button>
                        </div>
                      </div>

                      <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
                        <p className="text-blue-300 text-xs font-semibold mb-1">ℹ️ Como Funciona o Investimento</p>
                        <ul className="text-xs text-gray-400 space-y-1">
                          <li>• <strong className="text-white">Prazo:</strong> 12 meses mínimo</li>
                          <li>• <strong className="text-white">Rendimento:</strong> juros compostos mensais</li>
                          <li>• <strong className="text-white">Retirada:</strong> após 12 meses da ativação</li>
                          <li>• O rendimento é <strong className="text-green-400">reinvestido automaticamente</strong></li>
                        </ul>
                        {editFormData.activated_at && (
                          <p className="text-green-400 text-xs mt-2 font-semibold">
                            📅 Retirada disponível em: {new Date(new Date(editFormData.activated_at).setMonth(new Date(editFormData.activated_at).getMonth() + 12)).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setEditingPurchase(null)}
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-300"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Salvar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL PARCELAS */}
      {showInstallmentsModal && selectedPurchaseForInstallments && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <Card className="bg-gray-900 border-gray-700 max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-2xl font-bold text-white">💰 Parcelas</CardTitle>
                  <p className="text-green-100 text-xs sm:text-sm mt-1">
                    {selectedPurchaseForInstallments.user_name} - {selectedPurchaseForInstallments.plan_name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowInstallmentsModal(false);
                    setSelectedPurchaseForInstallments(null);
                  }}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-140px)]">
              {installments.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Nenhuma parcela disponível ainda</p>
                  <p className="text-gray-500 text-sm mt-2">
                    As parcelas começam 60 dias após a ativação do plano
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Header da Compra */}
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-white">{installments[0].purchase_name}</h4>
                        <p className="text-gray-400 text-sm mt-1">
                          Investimento: R$ {installments[0].plan_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • 
                          Taxa: {installments[0].rate}% ao mês
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-400">
                          {installments.filter(i => i.paid).length}/12
                        </div>
                        <p className="text-gray-500 text-xs">parcelas pagas</p>
                      </div>
                    </div>

                    {/* Lista de Parcelas */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                      {installments.map((installment) => {
                        const isPast = new Date(installment.date) < new Date();
                        
                        return (
                          <div
                            key={installment.period}
                            className={`relative rounded-lg p-4 border-2 transition-all ${
                              installment.paid
                                ? 'bg-green-900/20 border-green-500/50'
                                : isPast
                                ? 'bg-yellow-900/20 border-yellow-500/50'
                                : 'bg-gray-800/50 border-gray-600'
                            }`}
                          >
                            {/* Badge Status */}
                            {installment.paid && (
                              <div className="absolute top-2 right-2">
                                <div className="bg-green-500 rounded-full p-1">
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            )}

                            {/* Conteúdo */}
                            <div className="mb-2 sm:mb-3">
                              <div className="flex items-center justify-between mb-1 sm:mb-2">
                                <span className="text-gray-400 text-[10px] sm:text-xs font-medium">
                                  Parcela {installment.period}
                                </span>
                                {!installment.paid && isPast && (
                                  <span className="text-yellow-400 text-xs font-semibold">
                                    Vencida
                                  </span>
                                )}
                              </div>
                              
                              <div className="text-base sm:text-2xl font-bold text-white mb-1">
                                R$ {fmtBR(installment.value)}
                              </div>
                              
                              <div className="text-gray-400 text-xs flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(installment.date).toLocaleDateString('pt-BR')}
                              </div>
                            </div>

                            {/* Checkbox */}
                            <button
                              onClick={() => toggleInstallmentPaid(installment)}
                              className={`w-full py-2 rounded-lg font-medium text-sm transition-all ${
                                installment.paid
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                              }`}
                            >
                              {installment.paid ? '✓ Pago' : 'Marcar como Pago'}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Resumo */}
                    <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-700 grid grid-cols-3 gap-2 sm:gap-4 text-center">
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Total Pago</div>
                        <div className="text-green-400 font-bold text-lg">
                          R$ {fmtBR((installments.filter(i => i.paid).length * installments[0].value))}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs mb-1">A Receber</div>
                        <div className="text-blue-400 font-bold text-lg">
                          R$ {fmtBR(((12 - installments.filter(i => i.paid).length) * installments[0].value))}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Total</div>
                        <div className="text-white font-bold text-lg">
                          R$ {fmtBR((12 * installments[0].value))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}