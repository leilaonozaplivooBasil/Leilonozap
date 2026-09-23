import React, { useEffect, useState } from "react";
import { fmtBR } from '@/lib/money';
import { useNavigate } from "react-router-dom";
import { plataforma } from "@/api/plataformaClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RotateCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import SellerStatsCards from "../components/sellers/SellerStatsCards";
import SellerSalesTable from "../components/sellers/SellerSalesTable";
import SellerWithdrawalModal from "../components/sellers/SellerWithdrawalModal";
import SellerWithdrawalsHistoryModal from "../components/sellers/SellerWithdrawalsHistoryModal";
import SellerLoginForm from "../components/sellers/SellerLoginForm";
import SellerStoreCard from "../components/sellers/SellerStoreCard";
import { saldoDoPainel } from "@/lib/pedidoDeSaque";

export default function SellerPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  // 💰 a carteira vem de getMyWallet — a rota que EXISTE. É dela que sai o saldo sacável.
  const [carteira, setCarteira] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Validar acesso — se não logado, mostra tela de login própria
  useEffect(() => {
    const checkAccess = () => {
      try {
        const savedUserJSON = localStorage.getItem('currentUser');
        if (!savedUserJSON) {
          setIsLoading(false);
          return; // vai exibir o SellerLoginForm
        }

        const savedUser = JSON.parse(savedUserJSON);
        // Valida se o ID parece real (24 chars hex do MongoDB/Base44)
        const hasValidId = savedUser?.id && /^[a-f0-9]{24}$/.test(savedUser.id);

        if (!hasValidId || (!savedUser.is_seller && savedUser.role !== 'admin' && savedUser.role !== 'super_admin')) {
          // Sem permissão de vendedor → apenas exibe o login de vendedor.
          // ⚠️ NÃO apagar a sessão: um cliente comum abrindo esta página estava
          // sendo deslogado do site inteiro. Só logout explícito encerra a sessão.
          setIsLoading(false);
          return;
        }

        setUser(savedUser);
      } catch (err) {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, []);

  // Buscar carteira (obrigatória) + dashboard de vendas (se existir)
  //
  // 🔴 23/09/2026 — esta página chamava SÓ `getSellerDashboardData`, rota que não
  // existe no servidor. O cliente devolvia { ok:false, error:'not_implemented' },
  // a tela lia `response.data` (undefined) e caía em "Erro ao carregar dados".
  // Resultado: o corpo inteiro — inclusive o botão de saque — nunca desenhava.
  // "Hoje ninguém consegue sacar" era isto.
  //
  // Agora o SALDO vem de getMyWallet (a mesma rota da Carteira, que funciona).
  // O dashboard de vendas continua best-effort: se a rota existir um dia, aparece;
  // se não, a página funciona sem ele, em vez de morrer inteira.
  const fetchDashboard = async () => {
    if (!user) return;
    try {
      setIsError(false);
      const w = await plataforma.functions.invoke('getMyWallet', { user_id: user.id });
      if (!w?.success) {
        toast.error(w?.error || 'Não consegui carregar sua carteira');
        setIsError(true);
        return;
      }
      setCarteira(w);
      try {
        const d = await plataforma.functions.invoke('getSellerDashboardData', { seller_id: user.id });
        setDashboardData(d?.success === true ? d : null);
      } catch { setDashboardData(null); }
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
      if (!document.hidden && carteira) {
        await fetchDashboard();
      }
    };

    const handleFocus = async () => {
      if (user && carteira) {
        await fetchDashboard();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, carteira]);

  // Mostra login se não autenticado
  if (!isLoading && !user) {
    return (
      <SellerLoginForm
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          setIsLoading(true);
        }}
      />
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  const shortName = (user.full_name || '').split(' ').slice(0, 2).join(' ');
  const painel = saldoDoPainel(carteira);

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

        {/* Saldo + vendas */}
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
        ) : carteira ? (
          <>
            {dashboardData && <SellerStatsCards data={dashboardData} />}

            {/* Saldo Card — da carteira, sempre */}
            <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-500/30 mb-6" data-teste="card-saldo-saque">
              <CardHeader>
                <CardTitle className="text-green-400">Saldo Disponível para Saque</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="text-5xl font-bold text-white mb-2" data-teste="saldo-sacavel">
                      R$ {fmtBR(painel.saldoSacavel)}
                    </div>
                    {painel.emAnalise > 0 && (
                      <p className="text-yellow-300 text-sm">
                        + R$ {fmtBR(painel.emAnalise)} em saques pendentes
                      </p>
                    )}
                    {painel.kycStatus !== 'aprovado' && (
                      <p className="text-yellow-300 text-sm" data-teste="aviso-kyc">Valide sua identidade na Carteira pra liberar o saque.</p>
                    )}
                  </div>
                  <Button
                    onClick={() => setShowWithdrawalModal(true)}
                    className="bg-green-600 hover:bg-green-700 min-h-[44px] w-full sm:w-auto"
                    data-teste="abrir-saque">
                    💰 Solicitar Saque
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Minha Loja */}
            <SellerStoreCard referralCode={user.referral_code} />

            {/* Minhas Vendas — só quando o dashboard de vendas existir */}
            {dashboardData && (
              <Card className="bg-gray-800/50 border-gray-700 mb-6">
                <CardHeader className="flex flex-row justify-between items-center">
                  <CardTitle className="text-white">Minhas Vendas (Últimas 10)</CardTitle>
                </CardHeader>
                <CardContent>
                  {(dashboardData.ultimas_10_vendas || []).length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Você ainda não fez vendas.</p>
                  ) : (
                    <SellerSalesTable vendas={dashboardData.ultimas_10_vendas} />
                  )}
                </CardContent>
              </Card>
            )}
            <div className="flex justify-end mb-6">
              <Button onClick={() => setShowHistoryModal(true)} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700" size="sm">
                📜 Histórico de saques
              </Button>
            </div>
          </>
        ) : null}
      </div>

      {/* Modals */}
      <SellerWithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        saldoDisponivel={painel.saldoSacavel}
        onSuccess={fetchDashboard}
        userId={user.id}
        kycStatus={painel.kycStatus}
        cpf={painel.cpf}
      />

      <SellerWithdrawalsHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        saques={painel.saques}
      />
    </div>
  );
}