import React, { useState, useEffect } from "react";
import { fmtBR } from '@/lib/money';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Beaker, Zap, FastForward, Trash2, RefreshCw, Loader2, AlertCircle, FlaskConical, DollarSign, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { createTestAuction } from "@/functions/createTestAuction";
import { simulateTestBids } from "@/functions/simulateTestBids";
import { fastForwardTestAuction } from "@/functions/fastForwardTestAuction";
import { deleteTestAuctions } from "@/functions/deleteTestAuctions";
import { resetTestData } from "@/functions/resetTestData";
import { resetTestValora } from "@/functions/resetTestValora";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const Auction = base44.entities.Auction;

function formatTestAuctionTime(endTime, status) {
  if (status !== 'active') return 'Encerrado';
  const now = new Date();
  const end = new Date(endTime);
  const diff = Math.floor((end.getTime() - now.getTime()) / 1000);
  if (diff <= 0) return 'Encerrado';
  const weeks = Math.floor(diff / (7 * 86400));
  if (weeks > 0) return `${weeks} semana${weeks > 1 ? 's' : ''}`;
  const days = Math.floor(diff / 86400);
  if (days > 0) return `${days} dia${days > 1 ? 's' : ''}`;
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function AuctionTestLab() {
  const navigate = useNavigate();
  const [testAuctions, setTestAuctions] = useState([]);
  const [selectedTestAuction, setSelectedTestAuction] = useState("");
  const [testDuration, setTestDuration] = useState(3);
  const [bidCount, setBidCount] = useState(5);
  const [secondsToSkip, setSecondsToSkip] = useState(60);
  const [isProcessingTest, setIsProcessingTest] = useState(false);
  const [isResettingTestValora, setIsResettingTestValora] = useState(false);

  const loadTestAuctions = async () => {
    try {
      const allAuctions = await Auction.list("-created_date", 50);
      setTestAuctions(allAuctions.filter(a => a.title && a.title.includes('[TESTE]')));
    } catch (error) {
      console.error("Erro ao carregar testes:", error);
    }
  };

  useEffect(() => {
    loadTestAuctions();
    let subscription = null;
    try {
      subscription = Auction.subscribe('*', (payload) => {
        if ((payload.new?.title?.includes('[TESTE]')) || payload.old) loadTestAuctions();
      });
    } catch (e) {}
    return () => { if (subscription?.unsubscribe) subscription.unsubscribe(); };
  }, []);

  const handleCreateTest = async () => {
    setIsProcessingTest(true);
    try {
      const data = await createTestAuction({ duration: testDuration });
      toast.success("Leilão de teste criado!");
      loadTestAuctions();
      navigate(createPageUrl("AuctionRoom") + `?id=${data.auction_id}`);
    } catch (error) {
      toast.error("Erro ao criar teste: " + error.message);
    } finally { setIsProcessingTest(false); }
  };

  const handleSimulateBids = async () => {
    if (!selectedTestAuction) { toast.error("Selecione um leilão de teste"); return; }
    setIsProcessingTest(true);
    try {
      await simulateTestBids({ auction_id: selectedTestAuction, bid_count: bidCount });
      toast.success(` ${bidCount} lances simulados!`);
      loadTestAuctions();
    } catch (error) { toast.error("Erro: " + error.message); }
    finally { setIsProcessingTest(false); }
  };

  const handleFastForward = async () => {
    if (!selectedTestAuction) { toast.error("Selecione um leilão de teste"); return; }
    setIsProcessingTest(true);
    try {
      await fastForwardTestAuction({ auction_id: selectedTestAuction, seconds: secondsToSkip });
      toast.success(`⏩ Tempo acelerado em ${secondsToSkip}s!`);
      loadTestAuctions();
    } catch (error) { toast.error("Erro: " + error.message); }
    finally { setIsProcessingTest(false); }
  };

  const handleDeleteTests = async () => {
    if (!confirm("Deletar TODOS os leilões de teste?")) return;
    setIsProcessingTest(true);
    try {
      const data = await deleteTestAuctions();
      toast.success(` ${data?.deletedAuctions?.length || 0} leilões deletados!`);
      loadTestAuctions();
      setSelectedTestAuction("");
    } catch (error) { toast.error("Erro: " + error.message); }
    finally { setIsProcessingTest(false); }
  };

  const handleResetData = async () => {
    if (!confirm("RESETAR TODOS os dados de teste?")) return;
    if (!confirm("TEM CERTEZA ABSOLUTA? Esta ação é IRREVERSÍVEL!")) return;
    setIsProcessingTest(true);
    try {
      await resetTestData();
      toast.success("Sistema de testes resetado!");
      loadTestAuctions();
    } catch (error) { toast.error("Erro: " + error.message); }
    finally { setIsProcessingTest(false); }
  };

  const handleResetTestValora = async () => {
    if (!window.confirm("ZERAR VALORA PAY DE TESTE?\n\nEsta ação vai ZERAR todo o saldo de TESTE de TODOS os usuários.\n\nO saldo REAL NÃO será afetado.\n\nDeseja continuar?")) return;
    setIsResettingTestValora(true);
    toast.info("Zerando saldos de teste...");
    try {
      const response = await resetTestValora();
      if (response.status === 200) {
        const data = response.data;
        toast.success(` ${data.usersReset} usuários resetados!\nV$ ${data.totalTestValoraZerado} de teste zerado`);
      }
    } catch (err) { toast.error("Erro ao zerar: " + err.message); }
    finally { setIsResettingTestValora(false); }
  };

  return (
    <div className="space-y-6 mt-6">
      <Alert className="bg-purple-900/50 border-purple-700">
        <Beaker className="h-5 w-5 text-purple-400" />
        <AlertTitle className="text-purple-300 font-bold">Laboratório de Testes</AlertTitle>
        <AlertDescription className="text-purple-400">
          Crie leilões isolados para testar funcionalidades sem impactar usuários reais. Todos os leilões criados aqui são marcados com [TESTE].
        </AlertDescription>
      </Alert>

      <Card className="bg-gray-700/30 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-purple-400 flex items-center gap-2">
            <FlaskConical className="w-5 h-5" /> Laboratório de Testes
          </CardTitle>
          <p className="text-sm text-gray-400">Crie leilões de teste para simular lances e testar funcionalidades sem afetar dados reais.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* CRIAR TESTE */}
          <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
            <h3 className="font-semibold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> 1. Criar Leilão de Teste</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="testDuration" className="text-gray-300">Duração (minutos)</Label>
                <Input id="testDuration" type="number" min="1" max="60" value={testDuration} onChange={(e) => setTestDuration(parseInt(e.target.value, 10))} className="bg-gray-700 border-gray-600 text-white" />
              </div>
              <Button onClick={handleCreateTest} disabled={isProcessingTest} className="w-full bg-green-600 hover:bg-green-700">
                {isProcessingTest ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Criando...</> : <><Zap className="w-4 h-4 mr-2" />Criar Leilão de {testDuration}min</>}
              </Button>
            </div>
          </div>

          {/* SALDO DE TESTE */}
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-sm font-semibold text-yellow-400 mb-1 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />Gerenciar Saldo de Teste</h4>
            <p className="text-xs text-gray-400 mb-3">Zera apenas o Valora Pay de TESTE, mantém o REAL intacto</p>
            <Button onClick={handleResetTestValora} disabled={isResettingTestValora} variant="outline" className="w-full border-yellow-500 text-yellow-400 hover:bg-yellow-500/10">
              {isResettingTestValora ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Zerando...</> : <><Trash2 className="w-4 h-4 mr-2" />Zerar Valora Pay de TESTE</>}
            </Button>
            <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span><strong>Como funciona:</strong><br />• Leilões [TESTE] geram comissões em <code className="bg-gray-700 px-1 rounded">test_valora_balance</code><br />• Leilões normais geram em <code className="bg-gray-700 px-1 rounded">valora_pay_balance</code> (REAL)</span>
              </p>
            </div>
          </div>

          {/* LISTA DE TESTES */}
          {testAuctions.length > 0 && (
            <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
              <h3 className="font-semibold text-white flex items-center gap-2"><ClipboardList className="w-4 h-4" />Leilões de Teste Ativos ({testAuctions.length})</h3>
              <Select value={selectedTestAuction} onValueChange={setSelectedTestAuction}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white"><SelectValue placeholder="Selecione um leilão de teste" /></SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {testAuctions.map((test) => (
                    <SelectItem key={test.id} value={test.id} className="text-white hover:bg-gray-600">
                      <span>{test.title}</span><span className="text-xs text-gray-400 ml-4">R$ {fmtBR(test.current_price)} • {formatTestAuctionTime(test.end_time, test.status)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* SIMULAR LANCES */}
          <Card className="bg-gray-800 border border-gray-700">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-orange-400"><Zap className="w-5 h-5" />2. Simular Lances</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-400">Quantidade de lances</Label>
                <Input type="number" value={bidCount} onChange={(e) => setBidCount(Number(e.target.value))} min="1" max="20" className="mt-1 bg-gray-900 border-gray-600 text-gray-100" />
              </div>
              <Button onClick={handleSimulateBids} disabled={isProcessingTest || !selectedTestAuction} className="w-full bg-orange-600 hover:bg-orange-700">
                {isProcessingTest ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Simulando...</> : <><Zap className="w-4 h-4 mr-2" />Simular {bidCount} Lance(s)</>}
              </Button>
            </CardContent>
          </Card>

          {/* ACELERAR TEMPO */}
          <Card className="bg-gray-800 border border-gray-700">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-yellow-400"><FastForward className="w-5 h-5" />3. Acelerar Tempo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-400">Segundos para pular</Label>
                <Input type="number" value={secondsToSkip} onChange={(e) => setSecondsToSkip(Number(e.target.value))} min="10" max="3600" className="mt-1 bg-gray-900 border-gray-600 text-gray-100" />
                <p className="text-xs text-gray-500 mt-1">O leilão terminará em {secondsToSkip} segundos</p>
              </div>
              <Button onClick={handleFastForward} disabled={isProcessingTest || !selectedTestAuction} className="w-full bg-yellow-600 hover:bg-yellow-700">
                {isProcessingTest ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Acelerando...</> : <><FastForward className="w-4 h-4 mr-2" />Pular {secondsToSkip} Segundos</>}
              </Button>
            </CardContent>
          </Card>

          {/* AÇÕES PERIGOSAS */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-red-900/20 border border-red-700">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-red-400"><Trash2 className="w-5 h-5" />Limpar Testes</CardTitle></CardHeader>
              <CardContent>
                <Button onClick={handleDeleteTests} disabled={isProcessingTest || testAuctions.length === 0} variant="destructive" className="w-full">
                  {isProcessingTest ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deletando...</> : <><Trash2 className="w-4 h-4 mr-2" />Deletar Todos os Testes</>}
                </Button>
              </CardContent>
            </Card>
            <Card className="bg-red-900/20 border border-red-700">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-red-400"><RefreshCw className="w-5 h-5" />Reset Total</CardTitle></CardHeader>
              <CardContent>
                <Button onClick={handleResetData} disabled={isProcessingTest} variant="destructive" className="w-full">
                  {isProcessingTest ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetando...</> : <><RefreshCw className="w-4 h-4 mr-2" />Resetar Sistema de Testes</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}