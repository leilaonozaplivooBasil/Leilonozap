import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Zap, CheckCircle, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function StressTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [concurrentUsers, setConcurrentUsers] = useState(100);
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    setCurrentUser(user);
  }, []);

  const runTest = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      alert('Apenas admins podem executar testes de stress');
      return;
    }

    setIsRunning(true);
    setResults(null);

    try {
      const response = await base44.functions.invoke('stressTest', {
        concurrent_users: parseInt(concurrentUsers)
      });

      console.log('📊 Resultados:', response.data);
      setResults(response.data);

    } catch (error) {
      alert('Erro: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <Card className="bg-gray-800 border-gray-700 text-white max-w-md">
          <CardHeader>
            <CardTitle className="text-red-400">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Apenas administradores podem acessar testes de stress.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-400 mb-2 flex items-center gap-3">
            <Zap className="w-8 h-8" />
            Teste de Stress - Sistema de Leilões
          </h1>
          <p className="text-gray-400">Simula múltiplos usuários dando lances simultaneamente</p>
        </div>

        <Card className="bg-gray-800 border-gray-700 text-white mb-6">
          <CardHeader>
            <CardTitle className="text-green-400">Configuração do Teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="users" className="text-gray-300">Usuários Simultâneos</Label>
              <Input
                id="users"
                type="number"
                value={concurrentUsers}
                onChange={(e) => setConcurrentUsers(e.target.value)}
                min={10}
                max={1000}
                className="bg-gray-700 border-gray-600 text-white"
                disabled={isRunning}
              />
              <p className="text-xs text-gray-500 mt-1">
                ⚠️ Valores altos (&gt;500) podem causar rate limiting proposital
              </p>
            </div>

            <Button
              onClick={runTest}
              disabled={isRunning}
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-lg font-bold"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Executando Teste...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Iniciar Teste de Stress
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardHeader>
                <CardTitle className="text-blue-400 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Configuração
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Usuários Testados:</span>
                  <span className="font-bold text-white">{results.test_config.concurrent_users}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Leilão:</span>
                  <span className="font-bold text-white text-sm">{results.test_config.auction_tested.substring(0, 30)}...</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardHeader>
                <CardTitle className="text-green-400 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Tempo Total:</span>
                  <span className="font-bold text-white">{results.results.execution_time_ms}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tempo Médio:</span>
                  <span className="font-bold text-white">{results.results.avg_response_time}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Throughput:</span>
                  <span className="font-bold text-green-400">{results.results.throughput_per_second} req/s</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700 text-white md:col-span-2">
              <CardHeader>
                <CardTitle className="text-yellow-400 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Resultados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-white mb-1">{results.results.total_requests}</div>
                    <div className="text-xs text-gray-400">Total</div>
                  </div>
                  <div className="bg-green-900/30 p-4 rounded-lg text-center border border-green-500/30">
                    <div className="text-3xl font-bold text-green-400 mb-1">{results.results.successful}</div>
                    <div className="text-xs text-gray-400">Sucessos</div>
                  </div>
                  <div className="bg-red-900/30 p-4 rounded-lg text-center border border-red-500/30">
                    <div className="text-3xl font-bold text-red-400 mb-1">{results.results.failed}</div>
                    <div className="text-xs text-gray-400">Falhas</div>
                  </div>
                  <div className="bg-yellow-900/30 p-4 rounded-lg text-center border border-yellow-500/30">
                    <div className="text-3xl font-bold text-yellow-400 mb-1">{results.results.rate_limited}</div>
                    <div className="text-xs text-gray-400">Rate Limit</div>
                  </div>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Taxa de Sucesso:</span>
                    <Badge className={
                      results.results.success_rate >= '90%' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : results.results.success_rate >= '70%'
                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }>
                      {results.results.success_rate}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-4">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all"
                      style={{ width: results.results.success_rate }}
                    />
                  </div>
                </div>

                {results.results.conflicts > 0 && (
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-blue-300 font-semibold mb-1">
                          {results.results.conflicts} Conflitos Detectados
                        </p>
                        <p className="text-sm text-blue-200">
                          ✅ Sistema de controle de concorrência funcionou! Conflitos foram rejeitados corretamente.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {results.results.rate_limited > 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-300 font-semibold mb-1">
                          {results.results.rate_limited} Rate Limits
                        </p>
                        <p className="text-sm text-yellow-200">
                          ✅ Backoff exponencial ativado! Sistema protegido contra sobrecarga.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {results.results.errors.length > 0 && (
                  <details className="bg-gray-900 p-4 rounded-lg">
                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                      Ver Erros ({results.results.errors.length})
                    </summary>
                    <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                      {results.results.errors.slice(0, 10).map((err, i) => (
                        <div key={i} className="text-xs text-red-300 p-2 bg-red-900/20 rounded">
                          <span className="text-gray-500">User {err.user.substring(0, 8)}:</span> {err.error}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/30 to-green-800/30 border-green-500/50 text-white md:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-12 h-12 text-green-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-bold text-green-300 mb-2">
                      🎉 Teste Concluído com Sucesso!
                    </h3>
                    <p className="text-sm text-green-100">
                      O sistema foi testado com <strong>{results.test_config.concurrent_users} usuários simultâneos</strong> e 
                      alcançou <strong>{results.results.success_rate}</strong> de taxa de sucesso com 
                      throughput de <strong>{results.results.throughput_per_second} requisições/segundo</strong>.
                    </p>
                    {results.results.avg_response_time < 1000 && (
                      <p className="text-sm text-green-200 mt-2">
                        ⚡ Tempo médio de resposta excelente: {results.results.avg_response_time}ms
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}