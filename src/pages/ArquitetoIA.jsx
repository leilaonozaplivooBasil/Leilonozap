import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, Loader2, Trash2, Copy, CheckCircle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

export default function ArquitetoIA() {
  const [currentUser, setCurrentUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          if (user.role === 'admin') {
            setCurrentUser(user);
          } else {
            window.location.href = '/';
          }
        } else {
          window.location.href = '/';
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser && !conversationId) {
      initConversation();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
    });

    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initConversation = async () => {
    try {
      const conversation = await base44.agents.createConversation({
        agent_name: "arquiteto_base44",
        metadata: {
          name: "Sessão do Arquiteto",
          description: "Análise e otimização do sistema"
        }
      });
      setConversationId(conversation.id);
    } catch (error) {
      console.error("Erro ao criar conversa:", error);
      toast.error("Erro ao inicializar agente");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || isSending) return;

    setIsSending(true);
    const userMessage = input.trim();
    setInput("");

    try {
      const conversation = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conversation, {
        role: "user",
        content: userMessage
      });
    } catch (error) {
      console.error("Erro ao enviar:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  const clearConversation = async () => {
    if (!confirm("🗑️ Limpar toda a conversa?")) return;
    
    try {
      const conversation = await base44.agents.createConversation({
        agent_name: "arquiteto_base44",
        metadata: {
          name: "Nova Sessão",
          description: "Análise e otimização"
        }
      });
      setConversationId(conversation.id);
      setMessages([]);
      toast.success("✅ Conversa reiniciada!");
    } catch (error) {
      toast.error("Erro ao reiniciar");
    }
  };

  const analyzeSystemHealth = async () => {
    setIsAnalyzing(true);
    try {
      const SystemLog = base44.entities.SystemLog;
      const Auction = base44.entities.Auction;
      
      // Análise rápida dos últimos 7 dias
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const [errors, auctions] = await Promise.all([
        SystemLog.filter({ status: 'error' }, '-created_date', 100),
        Auction.filter({ status: 'active' }, '-created_date', 100)
      ]);
      
      const now = new Date();
      const stuckAuctions = auctions.filter(a => new Date(a.end_time) < now);
      
      setSystemHealth({
        totalErrors: errors.length,
        stuckAuctions: stuckAuctions.length,
        activeAuctions: auctions.length - stuckAuctions.length,
        lastAnalysis: new Date().toISOString()
      });
      
      // Envia análise automática para o Arquiteto
      if (conversationId) {
        const conversation = await base44.agents.getConversation(conversationId);
        await base44.agents.addMessage(conversation, {
          role: "user",
          content: `Analise a saúde do sistema:\n- ${errors.length} erros nos últimos registros\n- ${stuckAuctions.length} leilões potencialmente travados\n- ${auctions.length} leilões ativos no total\n\nIdentifique problemas críticos e sugira correções.`
        });
      }
      
      toast.success("✅ Análise iniciada!");
    } catch (error) {
      console.error("Erro na análise:", error);
      toast.error("Erro ao analisar sistema");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("📋 Copiado!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Erro ao copiar");
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900 p-4">
      <div className="max-w-5xl mx-auto">
        <Card className="bg-gray-800/90 border-purple-500/30 shadow-2xl backdrop-blur">
          <CardHeader className="border-b border-purple-500/20 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Arquiteto Base44</h1>
                  <p className="text-sm text-purple-300">Guardião Supremo & Otimizador Master</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={analyzeSystemHealth}
                  disabled={isAnalyzing}
                  className="text-green-400 hover:text-green-300 hover:bg-green-600/20"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Analisar Sistema
                </Button>
                <a
                  href={base44.agents.getWhatsAppConnectURL('arquiteto_base44')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-400 hover:text-green-300 hover:bg-green-600/20"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearConversation}
                  className="text-gray-400 hover:text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {/* CHAT MESSAGES */}
            <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gray-900/30">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mb-4">
                    <Sparkles className="w-10 h-10 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">🚀 Arquiteto Base44 TURBINADO</h3>
                  <p className="text-gray-400 max-w-md mb-4">
                    Análise preditiva, otimização autônoma, geração de código executável e diagnóstico em tempo real.
                  </p>
                  
                  {systemHealth && (
                    <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-purple-500/30 max-w-md mx-auto">
                      <h4 className="text-sm font-bold text-purple-300 mb-3">📊 Status do Sistema</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-green-900/30 p-2 rounded border border-green-500/30">
                          <div className="text-green-400 font-bold">{systemHealth.activeAuctions}</div>
                          <div className="text-gray-400">Leilões Ativos</div>
                        </div>
                        <div className={`p-2 rounded border ${
                          systemHealth.stuckAuctions > 0 
                            ? 'bg-red-900/30 border-red-500/30' 
                            : 'bg-gray-900/30 border-gray-700'
                        }`}>
                          <div className={systemHealth.stuckAuctions > 0 ? 'text-red-400 font-bold' : 'text-gray-400'}>
                            {systemHealth.stuckAuctions}
                          </div>
                          <div className="text-gray-400">Possíveis Travados</div>
                        </div>
                        <div className={`p-2 rounded border ${
                          systemHealth.totalErrors > 10 
                            ? 'bg-orange-900/30 border-orange-500/30' 
                            : 'bg-gray-900/30 border-gray-700'
                        }`}>
                          <div className={systemHealth.totalErrors > 10 ? 'text-orange-400 font-bold' : 'text-gray-400'}>
                            {systemHealth.totalErrors}
                          </div>
                          <div className="text-gray-400">Erros Recentes</div>
                        </div>
                        <div className="bg-blue-900/30 p-2 rounded border border-blue-500/30">
                          <div className="text-blue-400 font-bold">Online</div>
                          <div className="text-gray-400">Status Geral</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 space-y-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                      <span>🧠 Análise preditiva e proativa</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>💻 Geração de código executável</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span>🔍 Diagnóstico em tempo real</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span>🛡️ Proteção contra bugs 24/7</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user' 
                          ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white' 
                          : 'bg-gray-800 border border-purple-500/20 text-gray-100'
                      }`}>
                        {msg.role === 'user' ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="relative group">
                            <ReactMarkdown 
                              className="text-sm prose prose-invert prose-purple max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                              components={{
                                code: ({ inline, children }) => inline ? (
                                  <code className="px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-200 text-xs font-mono">
                                    {children}
                                  </code>
                                ) : (
                                  <pre className="bg-gray-900 rounded-lg p-3 overflow-x-auto my-2 border border-gray-700">
                                    <code className="text-xs text-gray-300">{children}</code>
                                  </pre>
                                ),
                                p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
                                ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
                                strong: ({ children }) => <strong className="text-purple-300 font-bold">{children}</strong>,
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 hover:bg-gray-600"
                              onClick={() => copyToClipboard(msg.content, idx)}
                            >
                              {copiedId === idx ? (
                                <CheckCircle className="w-3 h-3 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-gray-300" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* INPUT AREA */}
            <div className="border-t border-purple-500/20 bg-gray-800/50 p-4">
              <div className="flex gap-3">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Pergunte sobre otimizações, análise de bugs, ou peça um prompt perfeito..."
                  className="flex-1 min-h-[80px] bg-gray-900 border-purple-500/30 text-white placeholder-gray-500 resize-none focus:border-purple-500"
                  disabled={isSending}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isSending}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-[80px] px-6"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Dica: Pressione Enter para enviar, Shift+Enter para nova linha
              </p>
            </div>
          </CardContent>
        </Card>

        {/* QUICK ACTIONS TURBINADAS */}
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Ações Rápidas
          </h3>
          
          <div className="grid md:grid-cols-2 gap-3">
            <Card className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 border-purple-500/30 hover:border-purple-500/60 transition-all cursor-pointer hover:scale-105"
                  onClick={() => setInput("🔍 ANÁLISE COMPLETA DO SISTEMA:\n\n1. Analise TODOS os logs de erro dos últimos 7 dias\n2. Identifique leilões travados ou com problemas\n3. Detecte queries lentas e gargalos de performance\n4. Verifique integridade de dados entre entities\n5. Liste top 10 problemas por criticidade\n6. Gere comandos executáveis para correção\n\nQuero relatório DETALHADO com código pronto.")}>
              <CardContent className="p-4">
                <div className="text-3xl mb-2">🧠</div>
                <h4 className="font-bold text-white text-sm mb-1">Diagnóstico Completo</h4>
                <p className="text-xs text-purple-300">Análise profunda de saúde do sistema</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/30 to-green-900/10 border-green-500/30 hover:border-green-500/60 transition-all cursor-pointer hover:scale-105"
                  onClick={() => setInput("⚡ OTIMIZAÇÃO DE PERFORMANCE:\n\n1. Analise pages/Home, pages/AuctionRoom e pages/SaiDeBaixo\n2. Identifique queries ineficientes (usando .list em vez de .filter)\n3. Detecte re-renders desnecessários\n4. Encontre código duplicado\n5. Sugira melhorias de cache\n\nGere código EXECUTÁVEL para as 5 otimizações de MAIOR impacto.")}>
              <CardContent className="p-4">
                <div className="text-3xl mb-2">⚡</div>
                <h4 className="font-bold text-white text-sm mb-1">Boost de Performance</h4>
                <p className="text-xs text-green-300">Top 5 otimizações de maior impacto</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border-blue-500/30 hover:border-blue-500/60 transition-all cursor-pointer hover:scale-105"
                  onClick={() => setInput("🛡️ AUDITORIA DE SEGURANÇA:\n\n1. Verifique todas as pages admin (sem proteção de role)\n2. Analise RLS de todas as entities\n3. Identifique functions sem validação de user.role\n4. Detecte possíveis XSS ou SQL injection\n5. Verifique exposição de dados sensíveis\n\nListe vulnerabilidades por criticidade + código de correção.")}>
              <CardContent className="p-4">
                <div className="text-3xl mb-2">🔒</div>
                <h4 className="font-bold text-white text-sm mb-1">Auditoria de Segurança</h4>
                <p className="text-xs text-blue-300">Detectar vulnerabilidades críticas</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-900/30 to-orange-900/10 border-orange-500/30 hover:border-orange-500/60 transition-all cursor-pointer hover:scale-105"
                  onClick={() => setInput("📊 ANÁLISE DE UX E CONVERSÃO:\n\n1. Identifique pontos de fricção na jornada do usuário\n2. Analise taxa de abandono em checkout/pagamento\n3. Sugira melhorias de copywriting e CTAs\n4. Recomende features de gamificação\n5. Proponha A/B tests\n\nGere plano de ação com impacto estimado em conversão.")}>
              <CardContent className="p-4">
                <div className="text-3xl mb-2">📈</div>
                <h4 className="font-bold text-white text-sm mb-1">Otimização de Conversão</h4>
                <p className="text-xs text-orange-300">Aumentar engajamento e vendas</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <Card className="bg-gray-800/50 border-purple-500/30 hover:border-purple-500/60 transition-colors cursor-pointer"
                  onClick={() => setInput("Crie um sistema de notificações push quando alguém der lance em um leilão que estou participando. Gere o código COMPLETO pronto para usar.")}>
              <CardContent className="p-4">
                <div className="text-2xl mb-2">🔔</div>
                <h4 className="font-bold text-white text-sm mb-1">Notificações Push</h4>
                <p className="text-xs text-gray-400">Código completo + integração</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-yellow-500/30 hover:border-yellow-500/60 transition-colors cursor-pointer"
                  onClick={() => setInput("Analise TODOS os componentes e identifique código duplicado que pode ser refatorado em componentes reutilizáveis. Gere os novos componentes.")}>
              <CardContent className="p-4">
                <div className="text-2xl mb-2">🔄</div>
                <h4 className="font-bold text-white text-sm mb-1">Refatoração Inteligente</h4>
                <p className="text-xs text-gray-400">Eliminar duplicação de código</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-red-500/30 hover:border-red-500/60 transition-colors cursor-pointer"
                  onClick={() => setInput("Identifique TODOS os leilões travados, pagamentos pendentes suspeitos, ou dados inconsistentes. Gere scripts de correção automática.")}>
              <CardContent className="p-4">
                <div className="text-2xl mb-2">🚨</div>
                <h4 className="font-bold text-white text-sm mb-1">Correção de Dados</h4>
                <p className="text-xs text-gray-400">Resolver inconsistências</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}