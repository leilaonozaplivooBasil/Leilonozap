import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Receipt, Search, DollarSign, Clock, CheckCircle, CreditCard, QrCode, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import PortalPageHeader from "@/components/common/PortalPageHeader";

export default function TransactionHistory() {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [billingFilter, setBillingFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const savedUserJSON = localStorage.getItem('currentUser');
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');

    if (savedUserJSON && isLoggedIn) {
      const user = JSON.parse(savedUserJSON);
      if (user.role === 'admin') {
        setCurrentUser(user);
        loadPayments();
      }
    }
  }, []);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      // ✅ Busca AsaasPayment com asServiceRole para bypassar RLS e ver TODOS
      const data = await base44.functions.invoke('getAsaasTransactions', {});
      const transactions = data?.transactions || [];
      setPayments(transactions);
      setFilteredPayments(transactions);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
      // Fallback: tenta direto via entidade (pode ter limitação de RLS)
      try {
        const fallback = await base44.entities.AsaasPayment.list('-created_date', 500);
        setPayments(fallback);
        setFilteredPayments(fallback);
        setLastUpdated(new Date());
      } catch (e) {
        console.error("Fallback também falhou:", e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = payments;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.buyer_name?.toLowerCase().includes(term) ||
        p.buyer_email?.toLowerCase().includes(term) ||
        p.payment_id?.toLowerCase().includes(term) ||
        p.buyer_cpf?.includes(term)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (billingFilter !== "all") {
      filtered = filtered.filter(p => p.billing_type === billingFilter);
    }

    setFilteredPayments(filtered);
  }, [searchTerm, statusFilter, billingFilter, payments]);

  // Stats calculados sobre AsaasPayment
  const stats = {
    totalConfirmed: payments
      .filter(p => p.status === 'confirmed' || p.status === 'received')
      .reduce((sum, p) => sum + (p.value || 0), 0),
    countConfirmed: payments.filter(p => p.status === 'confirmed' || p.status === 'received').length,
    countPending: payments.filter(p => p.status === 'pending').length,
    countTotal: payments.length,
    totalPending: payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.value || 0), 0),
  };

  const statusConfig = {
    pending: { label: "Pendente", color: "bg-yellow-600 text-yellow-100", icon: Clock },
    confirmed: { label: "Confirmado", color: "bg-green-600 text-green-100", icon: CheckCircle },
    received: { label: "Recebido", color: "bg-green-700 text-green-100", icon: CheckCircle },
    failed: { label: "Falhou", color: "bg-red-600 text-red-100", icon: Clock },
    refunded: { label: "Reembolsado", color: "bg-gray-600 text-gray-100", icon: RefreshCw },
  };

  const billingConfig = {
    PIX: { label: "PIX", icon: "📱", color: "text-green-400" },
    CREDIT_CARD: { label: "Cartão", icon: "💳", color: "text-blue-400" },
    BOLETO: { label: "Boleto", icon: "📄", color: "text-yellow-400" },
  };

  const getPaymentType = (p) => {
    if (p.is_wallet_deposit && !p.is_investor_capital) return "💰 Depósito Carteira";
    if (p.is_investor_capital) return "📈 Capital Investidor";
    if (p.catalog_sale_id) return "🛒 Venda Catálogo";
    if (p.auction_id) return "🔨 Leilão";
    if (p.partner_plan_code) return "🤝 Plano Parceiro";
    return "💳 Pagamento";
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Acesso negado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <PortalPageHeader
          icon={Receipt}
          title="Histórico de Transações"
          subtitle={`Gateway: ASAAS · ${stats.countTotal} registros`}
          accentColor="green"
          actions={
            <button
              onClick={loadPayments}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          }
        />

        {lastUpdated && (
          <p className="text-gray-500 text-xs mb-4">
            Última atualização: {format(lastUpdated, 'dd/MM/yyyy HH:mm:ss')}
          </p>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Confirmado</p>
                  <p className="text-2xl font-bold text-green-500">
                    R$ {stats.totalConfirmed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Confirmados</p>
                  <p className="text-2xl font-bold text-green-400">{stats.countConfirmed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.countPending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Valor Pendente</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    R$ {stats.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, email, CPF ou ID do pagamento"
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-md px-4 py-2 min-w-[160px]"
          >
            <option value="all">Todos os Status</option>
            <option value="confirmed">✅ Confirmados</option>
            <option value="received">✅ Recebidos</option>
            <option value="pending">⏳ Pendentes</option>
            <option value="failed">❌ Falhados</option>
            <option value="refunded">↩️ Reembolsados</option>
          </select>

          <select
            value={billingFilter}
            onChange={(e) => setBillingFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-md px-4 py-2 min-w-[140px]"
          >
            <option value="all">Todos os Tipos</option>
            <option value="PIX">📱 PIX</option>
            <option value="CREDIT_CARD">💳 Cartão</option>
            <option value="BOLETO">📄 Boleto</option>
          </select>
        </div>

        <p className="text-gray-500 text-sm mb-4">
          Exibindo {filteredPayments.length} de {payments.length} transações
        </p>

        {/* Lista */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-green-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Carregando transações...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center">
                <p className="text-gray-400">Nenhuma transação encontrada</p>
              </CardContent>
            </Card>
          ) : (
            filteredPayments.map((payment) => {
              const cfg = statusConfig[payment.status] || statusConfig.pending;
              const StatusIcon = cfg.icon;
              const billing = billingConfig[payment.billing_type] || { label: payment.billing_type, icon: "💳", color: "text-gray-400" };

              return (
                <Card key={payment.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <StatusIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${payment.status === 'confirmed' || payment.status === 'received' ? 'text-green-500' : payment.status === 'pending' ? 'text-yellow-500' : 'text-red-500'}`} />
                        <div className="min-w-0">
                          <p className="text-white font-semibold truncate">{payment.buyer_name || '—'}</p>
                          <p className="text-gray-400 text-sm truncate">{payment.buyer_email || '—'}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-gray-500 text-xs">{getPaymentType(payment)}</span>
                            {payment.payment_id && (
                              <span className="text-gray-600 text-xs font-mono">{payment.payment_id}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-bold text-green-400">
                          R$ {(payment.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="flex items-center gap-2 mt-1 justify-end">
                          <Badge className={`text-xs ${cfg.color}`}>
                            {cfg.label}
                          </Badge>
                          <span className={`text-xs font-medium ${billing.color}`}>
                            {billing.icon} {billing.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {payment.created_date && (
                      <p className="text-gray-600 text-xs mt-2">
                        {format(new Date(payment.created_date), 'dd/MM/yyyy HH:mm')}
                        {payment.payment_date && (
                          <span className="text-green-700 ml-2">
                            · Pago em {format(new Date(payment.payment_date), 'dd/MM/yyyy HH:mm')}
                          </span>
                        )}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}