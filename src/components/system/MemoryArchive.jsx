import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  Download, 
  Trash2, 
  FileText, 
  Code, 
  Image as ImageIcon,
  Zap,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

/**
 * 📜 ARQUIVO DE MEMÓRIA DA IA
 * Registra TODAS as ações executadas pela IA
 */

export default function MemoryArchive() {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('all');

  // Carrega histórico do localStorage
  useEffect(() => {
    const stored = localStorage.getItem('aiActionHistory');
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        console.error('Erro ao carregar histórico:', e);
      }
    }
  }, []);

  // Adiciona nova ação ao histórico (useCallback para evitar re-criação)
  const logAction = useCallback((action) => {
    const newAction = {
      ...action,
      id: Date.now(),
      timestamp: new Date().toISOString()
    };
    
    setHistory(prevHistory => {
      const updatedHistory = [newAction, ...prevHistory].slice(0, 500);
      localStorage.setItem('aiActionHistory', JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  }, []);

  // Expõe função globalmente
  useEffect(() => {
    window.logAIAction = logAction;
  }, [logAction]);

  // Filtra histórico
  const filteredHistory = history.filter(action => {
    if (filter === 'all') return true;
    return action.type === filter;
  });

  // Exporta histórico
  const exportHistory = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-history-${new Date().toISOString()}.json`;
    link.click();
  };

  // Limpa histórico
  const clearHistory = () => {
    if (confirm('Tem certeza que deseja apagar TODO o histórico?')) {
      setHistory([]);
      localStorage.removeItem('aiActionHistory');
    }
  };

  const actionIcons = {
    file: Code,
    image: ImageIcon,
    integration: Zap,
    error: AlertCircle,
    success: CheckCircle,
    analysis: FileText
  };

  const actionColors = {
    file: 'bg-blue-900/20 border-blue-500/30 text-blue-400',
    image: 'bg-purple-900/20 border-purple-500/30 text-purple-400',
    integration: 'bg-green-900/20 border-green-500/30 text-green-400',
    error: 'bg-red-900/20 border-red-500/30 text-red-400',
    success: 'bg-green-900/20 border-green-500/30 text-green-400',
    analysis: 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400'
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">📜 Arquivo de Memória da IA</h1>
            <p className="text-gray-400">
              Histórico completo de todas as ações executadas
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={exportHistory} variant="outline" className="border-green-500 text-green-400">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={clearHistory} variant="outline" className="border-red-500 text-red-400">
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Tudo
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-green-400">{history.length}</div>
              <div className="text-sm text-gray-400">Total de Ações</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-blue-400">
                {history.filter(a => a.type === 'file').length}
              </div>
              <div className="text-sm text-gray-400">Arquivos Editados</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-purple-400">
                {history.filter(a => a.type === 'image').length}
              </div>
              <div className="text-sm text-gray-400">Imagens Processadas</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-red-400">
                {history.filter(a => a.type === 'error').length}
              </div>
              <div className="text-sm text-gray-400">Erros Detectados</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Tabs value={filter} onValueChange={setFilter} className="mb-6">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="all">Todos ({history.length})</TabsTrigger>
            <TabsTrigger value="file">Arquivos</TabsTrigger>
            <TabsTrigger value="image">Imagens</TabsTrigger>
            <TabsTrigger value="integration">Integrações</TabsTrigger>
            <TabsTrigger value="error">Erros</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Lista de ações */}
        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum registro ainda</h3>
                <p className="text-gray-400">As ações da IA aparecerão aqui</p>
              </CardContent>
            </Card>
          ) : (
            filteredHistory.map((action) => {
              const Icon = actionIcons[action.type] || FileText;
              const colorClass = actionColors[action.type] || 'bg-gray-800 border-gray-700 text-gray-400';
              
              return (
                <Card key={action.id} className={`${colorClass} border`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 mt-1" />
                        <div>
                          <CardTitle className="text-white mb-1">{action.title}</CardTitle>
                          <div className="text-sm opacity-80">{action.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs opacity-60 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(action.timestamp).toLocaleString('pt-BR')}
                        </div>
                        <Badge variant="outline" className="mt-1">{action.type}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  {action.details && (
                    <CardContent>
                      <pre className="bg-gray-900 p-4 rounded-lg text-xs overflow-x-auto">
                        {typeof action.details === 'string' 
                          ? action.details 
                          : JSON.stringify(action.details, null, 2)}
                      </pre>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}