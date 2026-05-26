import React, { useState, useEffect } from 'react';
import { SystemLog } from '@/entities/SystemLog';
import { ComparaiLog } from '@/entities/ComparaiLog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Trash2, AlertTriangle, CheckCircle, Info, Hammer, Play, Zap, Stethoscope } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import PortalPageHeader from '@/components/common/PortalPageHeader';

/**
 * 🩺 PÁGINA DE DIAGNÓSTICO DO SISTEMA
 * 
 * Mostra todos os logs cirúrgicos de todo o sistema
 * Acesso apenas para ADMIN
 */

export default function SystemDiagnostics() {
  const [systemLogs, setSystemLogs] = useState([]);
  const [comparaiLogs, setComparaiLogs] = useState([]);
  const [frontendLogs, setFrontendLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isRepairing, setIsRepairing] = useState(false);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      // Backend logs
      const sysLogs = await SystemLog.list('-created_date', 200);
      setSystemLogs(sysLogs);

      // Comparai logs
      const compLogs = await ComparaiLog.list('-created_date', 200);
      setComparaiLogs(compLogs);

      // Frontend logs (localStorage)
      const frontLogs = JSON.parse(localStorage.getItem('diagnosticLogs') || '[]');
      setFrontendLogs(frontLogs.reverse());

    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const exportLogs = () => {
    const allLogs = {
      systemLogs,
      comparaiLogs,
      frontendLogs,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(allLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFrontendLogs = () => {
    localStorage.removeItem('diagnosticLogs');
    setFrontendLogs([]);
  };

  const runRepair = async (action) => {
    if (isRepairing) return;
    
    const confirmMsg = action === 'close_expired' 
      ? "Deseja forçar o encerramento de todos os leilões confirmados como expirados?" 
      : "Deseja executar um Health Check completo agora?";
      
    if (!confirm(confirmMsg)) return;

    setIsRepairing(true);
    const loadingToast = toast.loading("Executando reparo...");

    try {
      if (action === 'close_expired') {
        const response = await base44.functions.invoke('closeExpiredAuctions', {});
        if (response.error) throw new Error(response.error);
        
        toast.success(`Sucesso! ${response.data?.closed || 0} leilões foram encerrados.`, { id: loadingToast });
      } else if (action === 'health_check') {
        const response = await base44.functions.invoke('systemHealthCheck', { action: 'full_test' });
        if (response.error) throw new Error(response.error);
        
        toast.success("Health Check concluído! Verifique os novos logs.", { id: loadingToast });
      }
      
      // Pequeno delay para dar tempo do backend salvar o log
      setTimeout(loadLogs, 2000);
      
    } catch (error) {
      console.error('Erro no reparo:', error);
      toast.error("Falha na execução: " + error.message, { id: loadingToast });
    } finally {
      setIsRepairing(false);
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      success: 'bg-green-900/30 text-green-300 border-green-700',
      error: 'bg-red-900/30 text-red-300 border-red-700',
      warning: 'bg-yellow-900/30 text-yellow-300 border-yellow-700',
      info: 'bg-blue-900/30 text-blue-300 border-blue-700'
    };
    
    return <Badge className={colors[status] || colors.info}>{status.toUpperCase()}</Badge>;
  };

  const LogCard = ({ log, type }) => (
    <Card className="bg-gray-800 border-gray-700 mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon(log.status)}
            <span className="font-bold text-white">{log.step || log.component_name || 'Unknown Step'}</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(log.status)}
            {log.is_mobile && <Badge className="bg-purple-900/30 text-purple-300 border-purple-700">📱 Mobile</Badge>}
          </div>
        </div>
        
        <p className="text-gray-300 text-sm mb-2">{log.message}</p>
        
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{new Date(log.created_date || log.timestamp).toLocaleString()}</span>
          {log.entity_id && <span>ID: {log.entity_id}</span>}
          {log.execution_time_ms && <span>⏱️ {log.execution_time_ms}ms</span>}
        </div>
        
        {log.error_details && (
          <pre className="mt-2 p-2 bg-gray-900 rounded text-xs text-red-300 overflow-x-auto">
            {JSON.stringify(log.error_details, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <PortalPageHeader
          icon={Stethoscope}
          title="Diagnóstico do Sistema"
          subtitle="Logs cirúrgicos de todo o sistema"
          accentColor="cyan"
          actions={
            <>
              <Button onClick={loadLogs} variant="outline" disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button onClick={exportLogs} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </>
          }
        />

        {/* 🛠️ SEÇÃO DE AÇÕES DE REPARO */}
        <Card className="bg-emerald-900/10 border-emerald-500/30 mb-6">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Hammer className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">Ações de Reparo</h3>
                <p className="text-gray-400 text-xs">Intervenções manuais para correção do sistema</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => runRepair('close_expired')} 
                disabled={isRepairing}
                variant="outline"
                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
                size="sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Encerrar Leilões Expirados
              </Button>
              
              <Button 
                onClick={() => runRepair('health_check')} 
                disabled={isRepairing}
                variant="outline"
                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                size="sm"
              >
                <Play className="w-4 h-4 mr-2" />
                Rodar Health Check Completo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="system" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="system">
              Sistema ({systemLogs.length})
            </TabsTrigger>
            <TabsTrigger value="comparai">
              Comparai ({comparaiLogs.length})
            </TabsTrigger>
            <TabsTrigger value="frontend">
              Frontend ({frontendLogs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="mt-4">
            <div className="flex gap-2 mb-4">
              {['all', 'success', 'error', 'warning'].map(f => (
                <Button
                  key={f}
                  onClick={() => setFilter(f)}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                >
                  {f === 'all' ? 'Todos' : f.toUpperCase()}
                </Button>
              ))}
            </div>
            
            {systemLogs
              .filter(log => filter === 'all' || log.status === filter)
              .map((log, i) => <LogCard key={i} log={log} type="system" />)}
          </TabsContent>

          <TabsContent value="comparai" className="mt-4">
            {comparaiLogs.map((log, i) => <LogCard key={i} log={log} type="comparai" />)}
          </TabsContent>

          <TabsContent value="frontend" className="mt-4">
            <div className="mb-4">
              <Button onClick={clearFrontendLogs} variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Logs Frontend
              </Button>
            </div>
            {frontendLogs.map((log, i) => <LogCard key={i} log={log} type="frontend" />)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}