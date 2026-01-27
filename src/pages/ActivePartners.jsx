import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

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
  const [partners, setPartners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPartner, setEditingPartner] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({
    active_partner_plan: '',
    partner_plan_amount: 0,
    partner_plan_activated_at: ''
  });

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setIsLoading(true);
    try {
      // Buscar todos os usuários com plano ativo
      const allUsers = await base44.entities.AppUser.list('-partner_plan_activated_at', 500);
      const activePartners = allUsers.filter(user => user.active_partner_plan);
      setPartners(activePartners);
    } catch (error) {
      console.error('Erro ao carregar parceiros:', error);
      toast.error('Erro ao carregar parceiros');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (partner) => {
    setEditingPartner(partner);
    setEditFormData({
      active_partner_plan: partner.active_partner_plan || '',
      partner_plan_amount: partner.partner_plan_amount || 0,
      partner_plan_activated_at: partner.partner_plan_activated_at 
        ? new Date(partner.partner_plan_activated_at).toISOString().split('T')[0]
        : ''
    });
  };

  const handleSave = async () => {
    if (!editingPartner) return;

    setIsSaving(true);
    try {
      await base44.entities.AppUser.update(editingPartner.id, {
        active_partner_plan: editFormData.active_partner_plan || null,
        partner_plan_amount: parseFloat(editFormData.partner_plan_amount) || 0,
        partner_plan_activated_at: editFormData.partner_plan_activated_at 
          ? new Date(editFormData.partner_plan_activated_at).toISOString()
          : null
      });

      // Log da edição
      await base44.entities.SystemLog.create({
        step: 'PARTNER_PLAN_EDITED',
        status: 'success',
        message: `Plano editado para ${editingPartner.full_name}`,
        component_name: 'ActivePartners',
        payload: {
          user_id: editingPartner.id,
          user_email: editingPartner.email,
          plan_name: editFormData.active_partner_plan,
          plan_amount: editFormData.partner_plan_amount,
          activated_at: editFormData.partner_plan_activated_at
        }
      }).catch(() => {});

      toast.success('✅ Parceiro atualizado com sucesso!');
      setEditingPartner(null);
      loadPartners();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (partner) => {
    if (!confirm(`Deseja desativar o plano de ${partner.full_name}?`)) return;

    try {
      await base44.entities.AppUser.update(partner.id, {
        active_partner_plan: null,
        partner_plan_amount: null,
        partner_plan_activated_at: null
      });

      await base44.entities.SystemLog.create({
        step: 'PARTNER_PLAN_DEACTIVATED',
        status: 'success',
        message: `Plano desativado para ${partner.full_name}`,
        component_name: 'ActivePartners',
        payload: {
          user_id: partner.id,
          user_email: partner.email,
          previous_plan: partner.active_partner_plan
        }
      }).catch(() => {});

      toast.success('✅ Plano desativado!');
      loadPartners();
    } catch (error) {
      console.error('Erro ao desativar:', error);
      toast.error('Erro ao desativar plano');
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

  const filteredPartners = partners.filter(partner => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      partner.full_name?.toLowerCase().includes(term) ||
      partner.email?.toLowerCase().includes(term) ||
      partner.cpf?.toLowerCase().includes(term) ||
      partner.active_partner_plan?.toLowerCase().includes(term)
    );
  });

  const totalInvested = partners.reduce((sum, p) => sum + (p.partner_plan_amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Parceiros Ativos</h1>
          <p className="text-gray-400">Gerencie todos os planos de parceria ativos</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total de Parceiros</p>
                  <p className="text-3xl font-bold text-white">{partners.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Investido</p>
                  <p className="text-3xl font-bold text-green-400">
                    R$ {totalInvested.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Retorno Previsto (3%)</p>
                  <p className="text-3xl font-bold text-blue-400">
                    R$ {(totalInvested * 0.03).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
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

        {/* Partners List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-400" />
          </div>
        ) : filteredPartners.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Nenhum parceiro encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPartners.map((partner) => {
              const schedule = calculatePurchaseSchedule(
                partner.partner_plan_activated_at, 
                partner.partner_plan_amount
              );
              const activePurchases = schedule.filter(s => s.isActive).length;

              return (
                <Card key={partner.id} className="bg-gray-800 border-gray-700 hover:border-green-500/50 transition-all">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Info do Parceiro */}
                      <div className="lg:col-span-2 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-white">{partner.full_name}</h3>
                            <p className="text-gray-400 text-sm">{partner.email}</p>
                            {partner.cpf && (
                              <p className="text-gray-500 text-xs mt-1">CPF: {partner.cpf}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleEdit(partner)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDeactivate(partner)}
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
                              {partner.active_partner_plan}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Valor Investido</p>
                            <p className="text-white font-bold">
                              R$ {(partner.partner_plan_amount || 0).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Data de Ativação</p>
                            <p className="text-white">
                              {partner.partner_plan_activated_at 
                                ? new Date(partner.partner_plan_activated_at).toLocaleDateString('pt-BR')
                                : '-'
                              }
                            </p>
                          </div>
                        </div>
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
      {editingPartner && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="bg-gray-800 border-gray-700 max-w-md w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Editar Parceiro</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingPartner(null)}
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
                    value={editingPartner.full_name}
                    disabled
                    className="bg-gray-700 text-gray-400 border-gray-600"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Email</Label>
                  <Input
                    value={editingPartner.email}
                    disabled
                    className="bg-gray-700 text-gray-400 border-gray-600"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Plano Ativo</Label>
                  <select
                    value={editFormData.active_partner_plan}
                    onChange={(e) => setEditFormData({
                      ...editFormData, 
                      active_partner_plan: e.target.value,
                      partner_plan_amount: PLANS.find(p => p.name === e.target.value)?.minInvestment || editFormData.partner_plan_amount
                    })}
                    className="w-full bg-gray-700 border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Sem plano</option>
                    {PLANS.map((plan) => (
                      <option key={plan.name} value={plan.name}>{plan.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Valor do Plano</Label>
                  <Input
                    type="number"
                    value={editFormData.partner_plan_amount}
                    onChange={(e) => setEditFormData({...editFormData, partner_plan_amount: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Data de Ativação</Label>
                  <Input
                    type="date"
                    value={editFormData.partner_plan_activated_at}
                    onChange={(e) => setEditFormData({...editFormData, partner_plan_activated_at: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Esta data define o cronograma de compras ativas
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setEditingPartner(null)}
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
    </div>
  );
}