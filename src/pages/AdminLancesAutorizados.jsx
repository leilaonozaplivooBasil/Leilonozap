import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { adminDataProxy } from '@/functions/adminDataProxy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Download, Filter, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function AdminLancesAutorizados() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchEmail, setSearchEmail] = useState('');
  const [filterModelo, setFilterModelo] = useState('all');
  const [selectedAuthorization, setSelectedAuthorization] = useState(null);

  const getCallerEmail = () => {
    try { const s = localStorage.getItem('currentUser'); return s ? JSON.parse(s).email : null; } catch { return null; }
  };

  const { data: authorizations = [], isLoading } = useQuery({
    queryKey: ['lancesAutorizados'],
    queryFn: async () => {
      const response = await adminDataProxy({ entity_name: 'LanceAutorizado', method: 'list', params: { sort_by: '-created_date', limit: 500 }, caller_email: getCallerEmail() });
      return response?.data?.data || response?.data || [];
    },
    refetchInterval: 5000
  });

  const filtered = authorizations.filter(a => {
    const matchStatus = filterStatus === 'all' || a.status_autorizacao === filterStatus;
    const matchEmail = a.investidor_email?.toLowerCase().includes(searchEmail.toLowerCase());
    const matchModelo = filterModelo === 'all' || a.modelo === filterModelo;
    return matchStatus && matchEmail && matchModelo;
  });

  const stats = {
    total: filtered.length,
    confirmada: filtered.filter(a => a.status_autorizacao === 'confirmada').length,
    concluida: filtered.filter(a => a.status_autorizacao === 'concluida').length,
    totalAutorizado: filtered.reduce((sum, a) => sum + (a.valor_maximo_autorizado || 0), 0),
    totalDepositado: filtered.reduce((sum, a) => sum + (a.deposito_confirmado || 0), 0)
  };

  const handleExportCSV = () => {
    const headers = ['Email', 'Investidor', 'Lote', 'Modelo', 'Valor Máximo', 'Deposito', 'Status', 'Data'];
    const rows = filtered.map(a => [
      a.investidor_email,
      a.investidor_nome,
      a.auction_title,
      a.modelo,
      a.valor_maximo_autorizado?.toFixed(2),
      a.deposito_confirmado?.toFixed(2),
      a.status_autorizacao,
      new Date(a.created_date).toLocaleDateString('pt-BR')
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lances_autorizados_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">📋 Lances Autorizados</h1>
        <p className="text-slate-400 mb-8">Auditoria de todas as autorizações de investidores por lote</p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3"><CardTitle className="text-slate-400 text-sm">Total de Autorizações</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-white">{stats.total}</div></CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3"><CardTitle className="text-slate-400 text-sm">Confirmadas</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-blue-400">{stats.confirmada}</div></CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3"><CardTitle className="text-slate-400 text-sm">Concluídas</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-400">{stats.concluida}</div></CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3"><CardTitle className="text-slate-400 text-sm">Total Autorizado</CardTitle></CardHeader>
            <CardContent><div className="text-lg font-bold text-white">R$ {(stats.totalAutorizado / 1000).toFixed(1)}k</div></CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3"><CardTitle className="text-slate-400 text-sm">Total Depositado</CardTitle></CardHeader>
            <CardContent><div className="text-lg font-bold text-emerald-400">R$ {(stats.totalDepositado / 1000).toFixed(1)}k</div></CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader><CardTitle className="text-white flex items-center gap-2"><Filter size={18} /> Filtros</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Input
                placeholder="Buscar email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterModelo} onValueChange={setFilterModelo}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">Todos os modelos</SelectItem>
                  <SelectItem value="individual">Modelo A (Individual)</SelectItem>
                  <SelectItem value="compartilhado">Modelo B (Compartilhado)</SelectItem>
                </SelectContent>
              </Select>
              <div />
              <Button onClick={handleExportCSV} className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Download size={16} /> Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Nenhuma autorização encontrada</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Lote</th>
                      <th className="text-center py-3 px-4 text-slate-300 font-semibold">Modelo</th>
                      <th className="text-right py-3 px-4 text-slate-300 font-semibold">Valor Máx</th>
                      <th className="text-right py-3 px-4 text-slate-300 font-semibold">Depósito</th>
                      <th className="text-center py-3 px-4 text-slate-300 font-semibold">Status</th>
                      <th className="text-center py-3 px-4 text-slate-300 font-semibold">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((auth) => (
                      <tr key={auth.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                        <td className="py-3 px-4 text-white font-mono text-xs">{auth.investidor_email}</td>
                        <td className="py-3 px-4 text-white max-w-xs truncate">{auth.auction_title}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={auth.modelo === 'individual' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'}>
                            {auth.modelo === 'individual' ? 'A' : 'B'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right text-white font-semibold">R$ {(auth.valor_maximo_autorizado || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-emerald-400 font-semibold">R$ {(auth.deposito_confirmado || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={
                            auth.status_autorizacao === 'confirmada' ? 'bg-blue-900 text-blue-300' :
                            auth.status_autorizacao === 'concluida' ? 'bg-green-900 text-green-300' :
                            'bg-red-900 text-red-300'
                          }>
                            {auth.status_autorizacao}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedAuthorization(auth)}
                            className="text-blue-400 hover:text-blue-300 transition"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        {selectedAuthorization && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-white">Detalhes da Autorização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase">Investidor</p>
                  <p className="text-white font-semibold">{selectedAuthorization.investidor_nome}</p>
                  <p className="text-sm text-slate-400 font-mono">{selectedAuthorization.investidor_email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase">Lote</p>
                  <p className="text-white font-semibold">{selectedAuthorization.auction_title}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Modelo</p>
                    <Badge className={selectedAuthorization.modelo === 'individual' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'}>
                      {selectedAuthorization.modelo === 'individual' ? 'Individual (A)' : 'Compartilhado (B)'}
                    </Badge>
                  </div>
                  {selectedAuthorization.percentual_compartilhado > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Percentual</p>
                      <p className="text-white font-semibold">{selectedAuthorization.percentual_compartilhado}%</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Valor Máximo</p>
                    <p className="text-white font-bold text-lg">R$ {(selectedAuthorization.valor_maximo_autorizado || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Depósito</p>
                    <p className="text-emerald-400 font-bold text-lg">R$ {(selectedAuthorization.deposito_confirmado || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase">Data</p>
                  <p className="text-white">{new Date(selectedAuthorization.data_autorizacao).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase">Status</p>
                  <Badge className={
                    selectedAuthorization.status_autorizacao === 'confirmada' ? 'bg-blue-900 text-blue-300' :
                    selectedAuthorization.status_autorizacao === 'concluida' ? 'bg-green-900 text-green-300' :
                    'bg-red-900 text-red-300'
                  }>
                    {selectedAuthorization.status_autorizacao}
                  </Badge>
                </div>
                <Button onClick={() => setSelectedAuthorization(null)} className="w-full bg-slate-700 hover:bg-slate-600">
                  Fechar
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}