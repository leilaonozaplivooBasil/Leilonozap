import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Filter, Search, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Tempo máximo (ms) para um PIX ser considerado pendente válido — 30 minutos
const PIX_EXPIRY_MS = 30 * 60 * 1000;

export default function AdminDepositosConfirmados() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchEmail, setSearchEmail] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['wallet-deposits'],
    queryFn: async () => {
      const all = await base44.asServiceRole.entities.WalletTransaction.list();
      return all.filter(t => t.type === 'deposit');
    },
    refetchInterval: 5000
  });

  const filteredTransactions = transactions.filter(t => {
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchEmail = t.user_id.toLowerCase().includes(searchEmail.toLowerCase());
    
    let matchDate = true;
    if (filterDateFrom || filterDateTo) {
      const txDate = new Date(t.created_date).getTime();
      if (filterDateFrom) {
        matchDate = txDate >= new Date(filterDateFrom).getTime();
      }
      if (filterDateTo && matchDate) {
        matchDate = txDate <= new Date(filterDateTo).getTime();
      }
    }

    return matchStatus && matchEmail && matchDate;
  });

  // PIX expirados: pendentes há mais de 30 minutos
  const expiredPix = transactions.filter(t => {
    if (t.status !== 'pending') return false;
    const age = Date.now() - new Date(t.created_date).getTime();
    return age > PIX_EXPIRY_MS;
  });

  const stats = {
    total: filteredTransactions.length,
    confirmed: filteredTransactions.filter(t => t.status === 'confirmed').length,
    pending: filteredTransactions.filter(t => t.status === 'pending').length,
    expired: expiredPix.length,
    totalAmount: filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
  };

  const handleCleanupExpired = async () => {
    if (expiredPix.length === 0) {
      toast.info('Nenhum PIX expirado encontrado.');
      return;
    }
    if (!window.confirm(`Deletar ${expiredPix.length} PIX pendentes há mais de 30 minutos? Esta ação não pode ser desfeita.`)) return;

    setIsCleaningUp(true);
    let deleted = 0;
    let errors = 0;

    for (const tx of expiredPix) {
      try {
        await base44.asServiceRole.entities.WalletTransaction.delete(tx.id);
        deleted++;
      } catch (err) {
        console.error('[CleanupPix] Falha ao deletar tx:', tx.id, err);
        errors++;
      }
    }

    setIsCleaningUp(false);
    queryClient.invalidateQueries({ queryKey: ['wallet-deposits'] });

    if (errors === 0) {
      toast.success(`✅ ${deleted} PIX expirado(s) removido(s) com sucesso.`);
    } else {
      toast.warning(`Removidos ${deleted}, mas ${errors} falhou(aram). Verifique o console.`);
    }
  };


  const handleExportCSV = () => {
    const headers = ['Email', 'Valor (R$)', 'Status', 'Data'];
    const rows = filteredTransactions.map(t => [
      t.user_id,
      t.amount?.toFixed(2),
      t.status,
      new Date(t.created_date).toLocaleDateString('pt-BR')
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `depósitos_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">💰 Depósitos Confirmados</h1>
          <p className="text-slate-400">Acompanhamento de todas as transações de depósito dos investidores</p>
        </div>

        {/* Banner de alerta — PIX expirados */}
        {stats.expired > 0 && (
          <div className="mb-6 flex items-center justify-between gap-4 bg-red-900/40 border border-red-500/50 rounded-xl px-5 py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-400 shrink-0" size={20} />
              <div>
                <p className="font-bold text-red-300 text-sm">
                  {stats.expired} PIX pendente{stats.expired > 1 ? 's' : ''} expirado{stats.expired > 1 ? 's' : ''} (mais de 30 min)
                </p>
                <p className="text-red-400/70 text-xs">Estes registros não serão pagos. Remova-os para limpar o sistema.</p>
              </div>
            </div>
            <button
              onClick={handleCleanupExpired}
              disabled={isCleaningUp}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 disabled:cursor-wait text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shrink-0"
            >
              {isCleaningUp
                ? <><RefreshCw size={14} className="animate-spin" /> Removendo...</>
                : <><Trash2 size={14} /> Remover expirados</>
              }
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-400 text-sm font-medium">Total de Depósitos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-400 text-sm font-medium">Confirmados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats.confirmed}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-400 text-sm font-medium">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-400 text-sm font-medium">Total Depositado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">R$ {stats.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter size={20} /> Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-2 uppercase font-semibold">Email</label>
                <Input
                  placeholder="Buscar por email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2 uppercase font-semibold">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="failed">Falhou</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2 uppercase font-semibold">De</label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2 uppercase font-semibold">Até</label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleExportCSV}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Exportar CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Transações ({filteredTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">Carregando...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-400">Erro ao carregar dados</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Nenhum depósito encontrado</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Email</th>
                      <th className="text-right py-3 px-4 text-slate-300 font-semibold">Valor</th>
                      <th className="text-center py-3 px-4 text-slate-300 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Data</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                        <td className="py-3 px-4 text-white font-mono text-sm">{tx.user_id}</td>
                        <td className="py-3 px-4 text-right text-green-400 font-bold">
                          R$ {tx.amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={
                            tx.status === 'confirmed' ? 'bg-green-900 text-green-300' :
                            tx.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                            'bg-red-900 text-red-300'
                          }>
                            {tx.status === 'confirmed' ? '✓ Confirmado' : 
                             tx.status === 'pending' ? '⏳ Pendente' : '✗ Falhou'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-sm">
                          {new Date(tx.created_date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-sm max-w-xs truncate">
                          {tx.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}