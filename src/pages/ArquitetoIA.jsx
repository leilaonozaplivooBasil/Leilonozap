import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, Loader2, Trash2, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

export default function ArquitetoIA() {
  const [currentUser, setCurrentUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
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
              <Button
                variant="ghost"
                size="sm"
                onClick={clearConversation}
                className="text-gray-400 hover:text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar
              </Button>
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
                  <h3 className="text-xl font-bold text-white mb-2">Arquiteto Base44 Online</h3>
                  <p className="text-gray-400 max-w-md">
                    Pergunte sobre otimizações, análise de código, bugs, engenharia de prompts ou melhorias no sistema.
                  </p>
                  <div className="mt-6 space-y-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Análise profunda de código</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Engenharia de prompts perfeitos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Detecção de bugs e vulnerabilidades</span>
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

        {/* EXEMPLOS DE USO */}
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <Card className="bg-gray-800/50 border-green-500/30 hover:border-green-500/60 transition-colors cursor-pointer"
                onClick={() => setInput("Analise o sistema de lances em tempo real e identifique possíveis melhorias de performance e confiabilidade")}>
            <CardContent className="p-4">
              <div className="text-2xl mb-2">🔍</div>
              <h4 className="font-bold text-white text-sm mb-1">Análise de Performance</h4>
              <p className="text-xs text-gray-400">Identificar gargalos e otimizações</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-blue-500/30 hover:border-blue-500/60 transition-colors cursor-pointer"
                onClick={() => setInput("Me dê o prompt perfeito para adicionar notificações em tempo real quando alguém der lance em um leilão que estou participando")}>
            <CardContent className="p-4">
              <div className="text-2xl mb-2">✨</div>
              <h4 className="font-bold text-white text-sm mb-1">Engenharia de Prompt</h4>
              <p className="text-xs text-gray-400">Comando otimizado para implementação</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-red-500/30 hover:border-red-500/60 transition-colors cursor-pointer"
                onClick={() => setInput("Analise os logs do sistema e identifique erros recorrentes ou padrões de falha que precisam ser corrigidos")}>
            <CardContent className="p-4">
              <div className="text-2xl mb-2">🛡️</div>
              <h4 className="font-bold text-white text-sm mb-1">Detecção de Bugs</h4>
              <p className="text-xs text-gray-400">Encontrar e corrigir problemas</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}