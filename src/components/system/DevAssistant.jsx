
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mic, 
  MicOff, 
  Send, 
  Loader2, 
  Wrench, 
  Hammer, 
  Lightbulb, 
  ClipboardList,
  Copy,
  Brain,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { InvokeLLM } from '@/integrations/Core';

/**
 * 🤖 IA ASSISTENTE COMPLETA DE DESENVOLVIMENTO
 * - Correção de bugs
 * - Construção de features
 * - Consultoria técnica
 * - Planejamento de arquitetura
 */

export default function DevAssistant({ systemData }) {
  const [mode, setMode] = useState('construction'); // correction, construction, consulting, planning
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [analysis, setAnalysis] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ============= GRAVAÇÃO DE ÁUDIO =============
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      toast.info('🎤 Gravando... Fale agora!');
      
    } catch (error) {
      toast.error('Erro ao acessar microfone: ' + error.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('✅ Gravação finalizada!');
    }
  };

  // ============= TRANSCREVER ÁUDIO (CORRIGIDO) =============
  const transcribeAudio = async (blob) => {
    try {
      // Prepara FormData com o blob de áudio
      const formData = new FormData();
      formData.append('audio', blob, 'audio.webm');
      
      // Chama a função de transcrição
      const { transcribeAudio: transcribeFn } = await import('@/functions/transcribeAudio');
      const response = await transcribeFn(formData);
      
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Falha na transcrição');
      }
      
      return response.data.transcription;
      
    } catch (error) {
      console.error('Erro na transcrição:', error);
      throw error;
    }
  };

  // ============= MAPEAR SISTEMA =============
  const mapSystemContext = () => {
    return {
      entities: [
        'Auction (leilões)',
        'AppUser (usuários do app)',
        'AuctionMessage (mensagens/lances)',
        'Bid (histórico de lances)',
        'User (usuários da plataforma)'
      ],
      pages: [
        'Home (lista de leilões)',
        'AuctionRoom (sala de leilão)',
        'Profile (perfil do usuário)',
        'Licensing (sistema de alavancagem)',
        'CreateAuction (criar leilão)',
        'MyWinnings (meus arremates)',
        'Ranking (ranking de usuários)'
      ],
      components: [
        'AuctionCard (card de leilão)',
        'ChatBubble (mensagem de chat)',
        'BidInput (input de lance)',
        'CountdownTimer (contador regressivo)',
        'GlobalMonitor (monitor de sistema)'
      ],
      functions: [
        'downloadImage (baixar imagens)',
        'extractDataFromUrl (extrair dados de URL)',
        'forceSyncStats (forçar sincronização)',
        'resetTestData (resetar dados de teste)'
      ],
      integrations: [
        'InvokeLLM (chamar IA)',
        'SendEmail (enviar email)',
        'UploadFile (upload de arquivo)',
        'GenerateImage (gerar imagem)'
      ],
      systemHealth: systemData || {
        rateLimit: 'OK',
        performance: '292ms',
        errors: 0,
        uptime: '99.9%'
      }
    };
  };

  // ============= ANALISAR E GERAR PROMPT =============
  const analyzeAndGeneratePrompt = async (inputText) => {
    setIsProcessing(true);
    
    try {
      const systemContext = mapSystemContext();
      
      // Define o contexto baseado no modo
      const modeInstructions = {
        correction: 'Você está analisando um BUG/PROBLEMA. Identifique a causa, localização e gere uma correção precisa.',
        construction: 'Você está ajudando a CONSTRUIR uma nova feature. Analise o código existente e planeje a implementação completa.',
        consulting: 'Você está respondendo uma DÚVIDA TÉCNICA. Analise o código e oriente a melhor abordagem.',
        planning: 'Você está planejando ARQUITETURA. Sugira entidades, páginas, componentes e fluxo completo.'
      };
      
      const analysisPrompt = `
Você é uma IA Assistente de Desenvolvimento especializada em React/JavaScript.

MODO ATUAL: ${mode.toUpperCase()}
${modeInstructions[mode]}

CONTEXTO DO SISTEMA:
${JSON.stringify(systemContext, null, 2)}

SOLICITAÇÃO DO USUÁRIO:
"${inputText}"

ANÁLISE NECESSÁRIA:
1. Entenda o que o usuário quer
2. Analise o código/sistema existente
3. Identifique dependências e impactos
4. Gere um plano de ação detalhado

RETORNE UM JSON com esta estrutura:
{
  "understanding": "O que o usuário quer fazer",
  "current_state": "Estado atual do sistema relevante",
  "dependencies": ["arquivo1.js", "entidade X"],
  "plan": {
    "steps": ["Passo 1", "Passo 2"],
    "files_to_create": ["nome_arquivo.jsx"],
    "files_to_edit": ["arquivo_existente.js"],
    "integrations_needed": ["InvokeLLM"]
  },
  "prompt_for_base44": "PROMPT PROFISSIONAL COMPLETO E DETALHADO"
}
`;

      const result = await InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            understanding: { type: 'string' },
            current_state: { type: 'string' },
            dependencies: { type: 'array', items: { type: 'string' } },
            plan: {
              type: 'object',
              properties: {
                steps: { type: 'array', items: { type: 'string' } },
                files_to_create: { type: 'array', items: { type: 'string' } },
                files_to_edit: { type: 'array', items: { type: 'string' } },
                integrations_needed: { type: 'array', items: { type: 'string' } }
              }
            },
            prompt_for_base44: { type: 'string' }
          }
        }
      });
      
      setAnalysis(result);
      setGeneratedPrompt(result.prompt_for_base44);
      toast.success('✅ Análise completa!');
      
    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error('Erro ao analisar: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ============= PROCESSAR ÁUDIO =============
  const processAudio = async () => {
    if (!audioBlob) {
      toast.error('Nenhum áudio gravado!');
      return;
    }
    
    setIsProcessing(true);
    toast.info('🎙️ Transcrevendo áudio...');
    
    try {
      const transcriptionText = await transcribeAudio(audioBlob);
      setTranscription(transcriptionText);
      setUserInput(transcriptionText);
      
      toast.success('✅ Áudio transcrito!');
      
      // Analisa automaticamente
      await analyzeAndGeneratePrompt(transcriptionText);
      
    } catch (error) {
      toast.error('Erro ao processar áudio: ' + error.message);
      setIsProcessing(false);
    }
  };

  // ============= PROCESSAR TEXTO =============
  const processText = async () => {
    if (!userInput.trim()) {
      toast.error('Digite algo primeiro!');
      return;
    }
    
    await analyzeAndGeneratePrompt(userInput);
  };

  // ============= COPIAR PROMPT =============
  const copyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt);
    toast.success('📋 Prompt copiado! Cole no chat.');
  };

  // ============= ENVIAR AUTOMATICAMENTE =============
  const sendToChat = () => {
    // Simula envio (na prática, isso abriria o chat da base44)
    toast.success('📤 Prompt enviado para base44!');
    console.log('PROMPT PARA BASE44:', generatedPrompt);
    
    // Aqui você pode adicionar lógica para realmente enviar via API
  };

  // ============= RENDER =============
  const modeConfig = {
    correction: { icon: Wrench, color: 'text-red-400', bg: 'bg-red-900/20', label: '🔧 Correção' },
    construction: { icon: Hammer, color: 'text-blue-400', bg: 'bg-blue-900/20', label: '🏗️ Construção' },
    consulting: { icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-900/20', label: '💡 Consultoria' },
    planning: { icon: ClipboardList, color: 'text-purple-400', bg: 'bg-purple-900/20', label: '📋 Planejamento' }
  };

  const currentMode = modeConfig[mode];
  const ModeIcon = currentMode.icon;

  return (
    <Card className="bg-gray-800/50 border-gray-700/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-green-400" />
          <span className="text-white">IA Assistente de Desenvolvimento</span>
          <Badge className={`${currentMode.bg} ${currentMode.color}`}>
            <ModeIcon className="w-3 h-3 mr-1" />
            {currentMode.label}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* SELETOR DE MODO */}
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="grid w-full grid-cols-4 bg-gray-700">
            <TabsTrigger value="correction" className="data-[state=active]:bg-red-600/30">
              <Wrench className="w-4 h-4 mr-2" />
              Correção
            </TabsTrigger>
            <TabsTrigger value="construction" className="data-[state=active]:bg-blue-600/30">
              <Hammer className="w-4 h-4 mr-2" />
              Construção
            </TabsTrigger>
            <TabsTrigger value="consulting" className="data-[state=active]:bg-yellow-600/30">
              <Lightbulb className="w-4 h-4 mr-2" />
              Consultoria
            </TabsTrigger>
            <TabsTrigger value="planning" className="data-[state=active]:bg-purple-600/30">
              <ClipboardList className="w-4 h-4 mr-2" />
              Planejamento
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* INPUT DE ÁUDIO/TEXTO */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`flex-1 ${isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-5 h-5 mr-2" />
                  Parar Gravação
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Gravar Áudio
                </>
              )}
            </Button>

            {audioBlob && !isProcessing && (
              <Button onClick={processAudio} className="bg-blue-600 hover:bg-blue-700">
                <Zap className="w-5 h-5 mr-2" />
                Processar
              </Button>
            )}
          </div>

          <div className="relative">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={`Descreva o que você precisa (${currentMode.label})...`}
              className="min-h-[120px] bg-gray-900 border-gray-600 text-white resize-none"
              disabled={isProcessing}
            />
            <Button
              onClick={processText}
              disabled={isProcessing || !userInput.trim()}
              className="absolute bottom-3 right-3 bg-green-600 hover:bg-green-700"
              size="sm"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Analisar
                </>
              )}
            </Button>
          </div>

          {transcription && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <p className="text-xs text-blue-400 mb-1">📝 Transcrição:</p>
              <p className="text-sm text-white">{transcription}</p>
            </div>
          )}
        </div>

        {/* ANÁLISE */}
        {analysis && (
          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">🎯 Entendimento:</p>
                <p className="text-sm text-white">{analysis.understanding}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">📊 Estado Atual:</p>
                <p className="text-sm text-white">{analysis.current_state}</p>
              </div>

              {analysis.dependencies && analysis.dependencies.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">🔗 Dependências:</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.dependencies.map((dep, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {dep}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {analysis.plan && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">📋 Plano de Ação:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    {analysis.plan.steps.map((step, i) => (
                      <li key={i} className="text-sm text-white">{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* PROMPT GERADO */}
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-green-400">📤 PROMPT PARA BASE44:</p>
                <Button onClick={copyPrompt} size="sm" variant="outline" className="border-green-500 text-green-400">
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar
                </Button>
              </div>
              <pre className="text-xs text-white whitespace-pre-wrap bg-gray-900/50 rounded p-3 max-h-[300px] overflow-y-auto">
                {generatedPrompt}
              </pre>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex gap-3">
              <Button onClick={copyPrompt} variant="outline" className="flex-1 border-green-500 text-green-400">
                <Copy className="w-4 h-4 mr-2" />
                Copiar Prompt
              </Button>
              <Button onClick={sendToChat} className="flex-1 bg-green-600 hover:bg-green-700">
                <Send className="w-4 h-4 mr-2" />
                Enviar para base44
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
