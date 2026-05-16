import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, DollarSign, TrendingUp, RotateCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import SellerStatsCards from "../components/sellers/SellerStatsCards";
import SellerSalesTable from "../components/sellers/SellerSalesTable";
import SellerWithdrawalModal from "../components/sellers/SellerWithdrawalModal";
import SellerWithdrawalsHistoryModal from "../components/sellers/SellerWithdrawalsHistoryModal";

export default function SellerPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Validar acesso
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const savedUserJSON = localStorage.getItem('currentUser');
        if (!savedUserJSON) {
          navigate('/', { replace: true });
          return;
        }

        const savedUser = JSON.parse(savedUserJSON);
        if (!savedUser.is_seller && savedUser.role !== 'admin') {
          navigate('/', { replace: true });
          return;
        }

        setUser(savedUser);
      } catch (err) {
        navigate('/', { replace: true });
      }
    };

    checkAccess();
  }, [navigate]);

  // Buscar dashboard
  const fetchDashboard = async () => {
    if (!user) return;
    try {
      setIsError(false);
      const response = await base44.functions.invoke('getSellerDashboardData', { seller_id: user.id });
      const data = response?.data;
      if (data?.success) {
        setDashboardData(data);
      } else {
        toast.error(data?.error || 'Erro ao carregar dashboard');
        setIsError(true);
      }
    } catch (err) {
      console.error('[SellerPanel] Erro:', err);
      toast.error('Erro ao carregar dados');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboard();
    }
  }, [user]);

  // Refresh com visibilitychange + focus
  useEffect(() => {
    const handleVisibility = async () => {
      if (!document.hidden && dashboardData) {
        await fetchDashboard();
      }
    };

    const handleFocus = async () => {
      if (user && dashboardData) {
        await fetchDashboard();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, dashboardData]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  const shortName = (user.full_name || '').split(' ').slice(0, 2).join(' ');

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Painel do Vendedor</h1>
            <p className="text-gray-400">Bem-vindo, {shortName}! 👋</p>
            {user.store_name && <p className="text-sm text-gray-500">Loja: {user.store_name}</p>}
          </div>
          <Button
            onClick={fetchDashboard}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 min-h-[44px]">
            <RotateCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : isError ? (
          <Card className="bg-red-900/20 border-red-500/30 mb-6">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-red-300">Erro ao carregar dados. Clique em Atualizar para tentar novamente.</p>
            </CardContent>
          </Card>
        ) : dashboardData ? (
          <>
            <SellerStatsCards data={dashboardData} />

            {/* Saldo Card */}
            <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-500/30 mb-6">
              <CardHeader>
                <CardTitle className="text-green-400">Saldo Disponível para Saque</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="text-5xl font-bold text-white mb-2">
                      R$ {dashboardData.saldo_liberado_final.toFixed(2)}
                    </div>
                    {dashboardData.saques_total_pendentes > 0 && (
                      <p className="text-yellow-300 text-sm">
                        + R$ {dashboardData.saques_total_pendentes.toFixed(2)} em saques pendentes
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => setShowWithdrawalModal(true)}
                    className="bg-green-600 hover:bg-green-700 min-h-[44px] w-full sm:w-auto">
                    💰 Solicitar Saque
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Minhas Vendas */}
            <Card className="bg-gray-800/50 border-gray-700 mb-6">
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-white">Minhas Vendas (Últimas 10)</CardTitle>
                <Button
                  onClick={() => setShowHistoryModal(true)}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  size="sm">
                  📜 Histórico
                </Button>
              </CardHeader>
              <CardContent>
                {dashboardData.ultimas_10_vendas.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Você ainda não fez vendas.</p>
                ) : (
                  <SellerSalesTable vendas={dashboardData.ultimas_10_vendas} />
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Modals */}
      <SellerWithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        saldoDisponivel={dashboardData?.saldo_liberado_final || 0}
        onSuccess={fetchDashboard}
      />

      <SellerWithdrawalsHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        saques={dashboardData?.saques_recentes || []}
      />
    </div>
  );
}