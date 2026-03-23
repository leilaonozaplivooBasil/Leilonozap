import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Shield, Loader2, Trash2, Copy, CheckCircle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

export default function SentinelNoZap() {
  const [currentUser, setCurrentUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const chatEndRef = useRef(null);

  const [initError, setInitError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Verifica se é admin via localStorage
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) { window.location.href = '/'; return; }
        const user = JSON.parse(savedUser);
        if (user.role !== 'admin') { window.location.href = '/'; return; }

        // Verifica se está autenticado na plataforma Base44 (necessário para agents API)
        try {
          const isAuth = await base44.auth.isAuthenticated();
          if (!isAuth) {
            // Tenta redirecionar para login da plataforma
            setInitError('Você precisa estar logado na plataforma Base44 para usar o Sentinel. Clique no botão abaixo.');
            setCurrentUser(user); // mantém para mostrar a UI com o erro
            return;
          }
        } catch (authErr) {
          console.warn('⚠️ Verificação de auth Base44 falhou:', authErr.message);
          // Continua mesmo assim — a createConversation vai falhar se realmente não estiver autenticado
        }

        setCurrentUser(user);
      } catch (error) {
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
      // Tenta buscar conversas existentes para reaproveitar
      const existing = await base44.agents.listConversations({ agent_name: "arquiteto_base44" });
      if (existing && existing.length > 0) {
        // Usa a conversa mais recente
        const latest = existing[0];
        setConversationId(latest.id);
        if (latest.messages && latest.messages.length > 0) {
          setMessages(latest.messages);
        }
        console.log('✅ Sentinel: conversa existente carregada:', latest.id);
        return;
      }

      const conversation = await base44.agents.createConversation({
        agent_name: "arquiteto_base44",
        metadata: { name: "Sessão Sentinel", description: "Monitoramento do sistema NoZap" }
      });
      setConversationId(conversation.id);
      console.log('✅ Sentinel: nova conversa criada:', conversation.id);
    } catch (error) {
      console.error('❌ Sentinel init error:', error);
      setInitError(`Erro ao inicializar o Sentinel: ${error.message || 'Verifique se está autenticado na plataforma.'}`);
      toast.error("Erro ao inicializar Sentinel: " + (error.message || 'Falha de autenticação'));
    }
  };

  const sendMessage = async (overrideMessage) => {
    const messageText = overrideMessage || input.trim();
    if (!messageText || !conversationId || isSending) return;
    setIsSending(true);
    if (!overrideMessage) setInput("");
    try {
      const conversation = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conversation, { role: "user", content: messageText });
    } catch (error) {
      console.error('❌ Sentinel send error:', error);
      toast.error("Erro ao enviar: " + (error.message || 'Tente novamente'));
    } finally {
      setIsSending(false);
    }
  };

  const clearConversation = async () => {
    if (!confirm("🗑️ Limpar toda a conversa?")) return;
    try {
      const conversation = await base44.agents.createConversation({
        agent_name: "arquiteto_base44",
        metadata: { name: "Nova Sessão Sentinel", description: "Monitoramento" }
      });
      setConversationId(conversation.id);
      setMessages([]);
      toast.success("✅ Conversa reiniciada!");
    } catch (error) {
      toast.error("Erro ao reiniciar");
    }
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("📋 Copiado!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (initError && !conversationId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-3">Sentinel — Erro de Inicialização</h2>
          <p className="text-gray-400 text-sm mb-6">{initError}</p>
          <div className="space-y-3">
            <Button
              onClick={() => base44.auth.redirectToLogin(window.location.href)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Fazer Login na Plataforma
            </Button>
            <Button
              onClick={() => { setInitError(null); initConversation(); }}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:text-white"
            >
              Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const quickActions = [
    { emoji: "🩺", title: "Relatório de Saúde", color: "from-emerald-900/30 to-emerald-900/10 border-emerald-500/30", prompt: "Gere um relatório completo de saúde do sistema agora:\n1. PIX pendentes há mais de 30 minutos\n2. Vendas do catálogo sem confirmação de pagamento\n3. Erros críticos no SystemLog (últimas 24h)\n4. Webhooks Asaas não processados\n5. Leilões ativos com problemas\n\nClassifique como: 🔴 CRÍTICO / 🟡 ATENÇÃO / ✅ OK" },
    { emoji: "💰", title: "Monitor de Pagamentos", color: "from-blue-900/30 to-blue-900/10 border-blue-500/30", prompt: "Analise todos os pagamentos suspeitos:\n1. AsaasPayment com status pendente há mais de 1h\n2. MercadoPagoPayment sem confirmação\n3. WalletTransaction com status 'pending'\n4. CatalogSale sem payment_confirmed_date\n\nListe os casos críticos com IDs e valores." },
    { emoji: "👥", title: "Auditoria de Usuários", color: "from-purple-900/30 to-purple-900/10 border-purple-500/30", prompt: "Faça auditoria de dados de usuários:\n1. AppUsers com dados inconsistentes (saldo negativo, etc.)\n2. Usuários com comissões sem CommissionRecord correspondente\n3. LanceAutorizado com status pendente há mais de 48h\n4. WithdrawalRequest pendentes há mais de 72h\n\nReporte todos os casos encontrados." },
    { emoji: "🚨", title: "Alertas Críticos", color: "from-red-900/30 to-red-900/10 border-red-500/30", prompt: "Verifique TODOS os alertas críticos do sistema:\n1. SystemLog com status 'error' nas últimas 2h\n2. Leilões com end_time expirado mas status ainda 'active'\n3. Pagamentos processados sem atualização de saldo\n4. Webhooks com falha de processamento\n\nPrioritize por criticidade e sugira ações imediatas." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-900/10 to-gray-900 p-4">
      <div className="max-w-5xl mx-auto">
        <Card className="bg-gray-800/90 border-emerald-500/30 shadow-2xl backdrop-blur">
          <CardHeader className="border-b border-emerald-500/20 bg-gradient-to-r from-emerald-900/30 to-teal-900/30">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Sentinel Leilão NoZap</h1>
                  <p className="text-sm text-emerald-300">Guardião de Saúde & Monitor Financeiro 24/7</p>
                </div>
              </div>
              <div className="flex gap-2">
                <a href={base44.agents.getWhatsAppConnectURL('arquiteto_base44')} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="text-green-400 hover:text-green-300 hover:bg-green-600/20">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                </a>
                <Button variant="ghost" size="sm" onClick={clearConversation} className="text-gray-400 hover:text-white">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gray-900/30">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center mb-4">
                    <Shield className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">🛡️ Sentinel Ativo</h3>
                  <p className="text-gray-400 max-w-md mb-6">
                    Monitor 24/7 do Leilão NoZap. Analisa pagamentos, detecta anomalias e gera relatórios de saúde do sistema.
                  </p>
                  <div className="space-y-2 text-sm text-gray-500">
                    {["🔴 CRÍTICO / 🟡 ATENÇÃO / ✅ OK — classificação automática", "💰 Monitor de pagamentos PIX e Asaas", "👁️ Vigilância de webhooks e erros", "📊 Relatórios prontos para envio no WhatsApp"].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white' : 'bg-gray-800 border border-emerald-500/20 text-gray-100'}`}>
                        {msg.role === 'user' ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="relative group">
                            <ReactMarkdown
                              className="text-sm prose prose-invert prose-emerald max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                              components={{
                                code: ({ inline, children }) => inline ? (
                                  <code className="px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-200 text-xs font-mono">{children}</code>
                                ) : (
                                  <pre className="bg-gray-900 rounded-lg p-3 overflow-x-auto my-2 border border-gray-700"><code className="text-xs text-gray-300">{children}</code></pre>
                                ),
                                p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
                                ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
                                strong: ({ children }) => <strong className="text-emerald-300 font-bold">{children}</strong>,
                              }}
                            >{msg.content}</ReactMarkdown>
                            <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 hover:bg-gray-600" onClick={() => copyToClipboard(msg.content, idx)}>
                              {copiedId === idx ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-300" />}
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

            <div className="border-t border-emerald-500/20 bg-gray-800/50 p-4">
              <div className="flex gap-3">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Solicite um relatório, análise de pagamentos, ou auditoria do sistema..."
                  className="flex-1 min-h-[80px] bg-gray-900 border-emerald-500/30 text-white placeholder-gray-500 resize-none focus:border-emerald-500"
                  disabled={isSending}
                />
                <Button onClick={sendMessage} disabled={!input.trim() || isSending} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white h-[80px] px-6">
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">💡 Enter para enviar • Shift+Enter para nova linha</p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Monitoramento Rápido
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Card key={action.title} className={`bg-gradient-to-br ${action.color} hover:scale-105 transition-all cursor-pointer`} onClick={() => sendMessage(action.prompt)}>
                <CardContent className="p-4">
                  <div className="text-3xl mb-2">{action.emoji}</div>
                  <h4 className="font-bold text-white text-sm mb-1">{action.title}</h4>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}