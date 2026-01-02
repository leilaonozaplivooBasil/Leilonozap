import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Receipt, Search, TrendingUp, DollarSign, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function TransactionHistory() {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const checkAdminStatus = async () => {
      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');
      
      console.log("🔍 [TransactionHistory] Verificando admin...");
      
      if (savedUserJSON && isLoggedIn) {
        const user = JSON.parse(savedUserJSON);
        console.log("🔍 [TransactionHistory] Usuário:", user.full_name, "Role:", user.role);
        
        if (user.role === 'admin') {
          setCurrentUser(user);
          loadPayments();
        } else {
          console.error("❌ [TransactionHistory] Acesso negado - Não é admin");
        }
      } else {
        console.error("❌ [TransactionHistory] Nenhum usuário logado");
      }
    };
    checkAdminStatus();
  }, []);

  const loadPayments = async () => {
    try {
      const data = await base44.entities.Payment.list("-created_date", 100);
      setPayments(data);
      setFilteredPayments(data);
    } catch (error) {
      console.error("Erro ao carregar pagamentos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = payments;
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.buyer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    setFilteredPayments(filtered);
  }, [searchTerm, statusFilter, payments]);

  const stats = {
    total: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    paid: payments.filter(p => p.status === 'paid').length,
    pending: payments.filter(p => p.status === 'pending').length
  };

  const statusConfig = {
    pending: { label: "Pendente", color: "bg-yellow-600", icon: Clock },
    paid: { label: "Pago", color: "bg-green-600", icon: CheckCircle },
    failed: { label: "Falhou", color: "bg-red-600", icon: Clock },
    refunded: { label: "Reembolsado", color: "bg-gray-600", icon: TrendingUp }
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
        <div className="flex items-center gap-3 mb-8">
          <Receipt className="w-8 h-8 text-green-500" />
          <h1 className="text-3xl font-bold text-white">Histórico de Transações</h1>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Recebido</p>
                  <p className="text-2xl font-bold text-green-500">R$ {stats.total.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pagamentos Confirmados</p>
                  <p className="text-2xl font-bold text-white">{stats.paid}</p>
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
                  <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, email ou ID da transação"
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-md px-4 py-2 min-w-[180px]"
          >
            <option value="all">Todos os Status</option>
            <option value="paid">✅ Confirmados</option>
            <option value="pending">⏳ Pendentes</option>
            <option value="failed">❌ Falhados</option>
            <option value="refunded">↩️ Reembolsados</option>
          </select>
        </div>

        {/* Payments List */}
        <div className="space-y-3">
          {filteredPayments.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center">
                <p className="text-gray-400">Nenhuma transação encontrada</p>
              </CardContent>
            </Card>
          ) : (
            filteredPayments.map((payment) => {
              const StatusIcon = statusConfig[payment.status]?.icon || Clock;
              return (
                <Card key={payment.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <StatusIcon className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="text-white font-semibold">{payment.buyer_name}</p>
                          <p className="text-gray-400 text-sm">{payment.buyer_email}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-500">R$ {payment.amount.toFixed(2)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={statusConfig[payment.status]?.color}>
                            {statusConfig[payment.status]?.label}
                          </Badge>
                          <span className="text-gray-400 text-xs">
                            {payment.payment_method === 'pix' ? '📱 PIX' : 
                             payment.payment_method === 'credit_card' ? '💳 Cartão' : 
                             '🔗 Gateway'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {payment.created_date && (
                      <p className="text-gray-500 text-xs mt-2">
                        {format(new Date(payment.created_date), 'dd/MM/yyyy HH:mm')}
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