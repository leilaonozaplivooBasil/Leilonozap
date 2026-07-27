import React, { useState, useEffect } from "react";
import { fmtBR } from '@/lib/money';
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Loader2, DollarSign, User } from "lucide-react";
import { approveWithdrawal } from "@/functions/approveWithdrawal";
import { rejectWithdrawal } from "@/functions/rejectWithdrawal";
import { toast } from "sonner";

const WithdrawalRequest = base44.entities.WithdrawalRequest;
const AppUser = base44.entities.AppUser;

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [users, setUsers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    setIsLoading(true);
    try {
      const allWithdrawals = await WithdrawalRequest.list('-created_date', 100);
      setWithdrawals(allWithdrawals);

      // Carrega informações dos usuários
      const userIds = [...new Set(allWithdrawals.map(w => w.influencer_id))];
      const usersData = {};
      
      for (const userId of userIds) {
        const userList = await AppUser.filter({ id: userId });
        if (userList && userList.length > 0) {
          usersData[userId] = userList[0];
        }
      }
      
      setUsers(usersData);
    } catch (error) {
      console.error('Erro ao carregar saques:', error);
      toast.error('Erro ao carregar saques');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedWithdrawal) return;

    setIsProcessing(true);
    try {
      const response = await approveWithdrawal({
        withdrawal_id: selectedWithdrawal.id,
        transaction_id: transactionId,
        notes: 'Aprovado via painel admin'
      });

      if (response?.data?.success) {
        toast.success('Saque aprovado com sucesso!');
        setShowApproveModal(false);
        setSelectedWithdrawal(null);
        setTransactionId('');
        loadWithdrawals();
      } else {
        toast.error(response?.data?.error || 'Erro ao aprovar');
      }
    } catch (error) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal || !rejectReason) {
      toast.error('Informe o motivo da rejeição');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await rejectWithdrawal({
        withdrawal_id: selectedWithdrawal.id,
        reason: rejectReason
      });

      if (response?.data?.success) {
        toast.success('Saque rejeitado - saldo estornado');
        setShowRejectModal(false);
        setSelectedWithdrawal(null);
        setRejectReason('');
        loadWithdrawals();
      } else {
        toast.error(response?.data?.error || 'Erro ao rejeitar');
      }
    } catch (error) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { label: 'Aprovado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      completed: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: XCircle },
      processing: { label: 'Processando', color: 'bg-purple-100 text-purple-800', icon: Loader2 }
    };

    const config = configs[status] || configs.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const processedWithdrawals = withdrawals.filter(w => w.status !== 'pending');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">💰 Gerenciar Saques</h1>
          <p className="text-gray-400">Aprove ou rejeite solicitações de saque dos influenciadores</p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{pendingWithdrawals.length}</p>
                  <p className="text-gray-400 text-sm">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {withdrawals.filter(w => w.status === 'completed').length}
                  </p>
                  <p className="text-gray-400 text-sm">Concluídos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    R$ {fmtBR(pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0))}
                  </p>
                  <p className="text-gray-400 text-sm">Total Pendente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Solicitações Pendentes */}
        {pendingWithdrawals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-yellow-400">⏳ Aguardando Aprovação</h2>
            <div className="space-y-4">
              {pendingWithdrawals.map((withdrawal) => {
                const user = users[withdrawal.influencer_id];
                return (
                  <Card key={withdrawal.id} className="bg-gray-800 border-yellow-500/30">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <User className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="font-bold text-lg">{user?.full_name || 'Usuário'}</p>
                              <p className="text-sm text-gray-400">{user?.email}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400">Valor:</p>
                              <p className="text-xl font-bold text-green-400">
                                R$ {fmtBR(withdrawal.amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Chave PIX ({withdrawal.pix_key_type}):</p>
                              <p className="font-mono text-gray-300">{withdrawal.pix_key}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Solicitado em:</p>
                              <p className="text-gray-300">
                                {new Date(withdrawal.created_date).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Titular:</p>
                              <p className="text-gray-300">{withdrawal.recipient_name}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => {
                              setSelectedWithdrawal(withdrawal);
                              setShowApproveModal(true);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Aprovar
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedWithdrawal(withdrawal);
                              setShowRejectModal(true);
                            }}
                            variant="outline"
                            className="border-red-500 text-red-400 hover:bg-red-500/20"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Rejeitar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Histórico Processado */}
        {processedWithdrawals.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">📋 Histórico</h2>
            <div className="space-y-3">
              {processedWithdrawals.map((withdrawal) => {
                const user = users[withdrawal.influencer_id];
                return (
                  <Card key={withdrawal.id} className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-semibold">{user?.full_name || 'Usuário'}</p>
                            <p className="text-sm text-gray-400">
                              R$ {fmtBR(withdrawal.amount)} • {withdrawal.pix_key_type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm text-gray-400">
                            {new Date(withdrawal.created_date).toLocaleDateString('pt-BR')}
                          </p>
                          {getStatusBadge(withdrawal.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {withdrawals.length === 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-12 text-center">
              <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400">Nenhuma solicitação de saque ainda</p>
            </CardContent>
          </Card>
        )}

        {/* Modal Aprovar */}
        {showApproveModal && selectedWithdrawal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-2xl font-bold text-white">✅ Aprovar Saque</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-green-900/20 rounded-lg p-4 border border-green-500/30">
                  <p className="text-sm text-gray-400 mb-1">Valor do Saque:</p>
                  <p className="text-3xl font-bold text-green-400">
                    R$ {fmtBR(selectedWithdrawal.amount)}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-300">ID da Transação (Opcional)</Label>
                  <Input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Ex: TRX123456"
                    className="bg-gray-700 border-gray-600 text-white"
                    disabled={isProcessing}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowApproveModal(false)}
                    variant="outline"
                    className="flex-1 border-gray-600"
                    disabled={isProcessing}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleApprove}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Confirmar Aprovação'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Rejeitar */}
        {showRejectModal && selectedWithdrawal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-2xl font-bold text-white">❌ Rejeitar Saque</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
                  <p className="text-sm text-red-300 mb-2">⚠️ O saldo será estornado ao influenciador</p>
                  <p className="text-2xl font-bold text-red-400">
                    R$ {fmtBR(selectedWithdrawal.amount)}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-300">Motivo da Rejeição *</Label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Informe o motivo..."
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-24"
                    disabled={isProcessing}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowRejectModal(false)}
                    variant="outline"
                    className="flex-1 border-gray-600"
                    disabled={isProcessing}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleReject}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Confirmar Rejeição'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}