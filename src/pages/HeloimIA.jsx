import React, { useState, useEffect, useRef } from "react";
import { askAgente } from "@/functions/askAgente";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

const CONV_KEY = 'heloimia_conv_id';

const QUICK_ACTIONS = [
  { emoji: "📦", title: "Lotes Pendentes", message: "Quais lotes estão com status 'recebido' ou 'comprado' em EstoqueLotes e precisam de ação? Resumo operacional." },
  { emoji: "💰", title: "Briefing do Dia", message: "Faça um briefing financeiro do dia de hoje no Leilão NoZap — vendas, comissões e alertas." },
  { emoji: "🔍", title: "Diagnóstico de Importação", message: "Analise o fluxo atual de importação de planilhas no AnaliseLoteEstoque e EstoqueLotes. Existe algum bug ou campo faltando no payload do LoteRecebido.create?" },
  { emoji: "🏷️", title: "Precificar Pendentes", message: "Liste os produtos com catalog_active=false e selling_price_retail=0 que precisam de precificação. Quantos são? Qual a prioridade?" },
];

export default function HeloimIA() {
  const [currentUser, setCurrentUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (!savedUser) { window.location.href = '/'; return; }
      const user = JSON.parse(savedUser);
      if (user.role !== 'admin' && user.role !== 'super_admin') { window.location.href = '/'; return; }
      setCurrentUser(user);
    } catch (error) {
      window.location.href = '/';
    }
    // Restaura conversa anterior do localStorage
    const savedConv = localStorage.getItem(CONV_KEY);
    if (savedConv) setConversationId(savedConv);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const sendMessage = async (overrideMessage) => {
    const messageText = overrideMessage || input.trim();
    if (!messageText || isSending) return;

    setIsSending(true);
    if (!overrideMessage) setInput("");
    setMessages(prev => [...prev, { role: 'user', content: messageText }]);

    try {
      const { data } = await askAgente({
        message: messageText,
        conversation_id: conversationId || undefined
      });

      if (data?.error) {
        toast.error(data.error);
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${data.error}` }]);
        return;
      }

      // Persiste conversation_id para continuidade
      if (data?.conversation_id) {
        setConversationId(data.conversation_id);
        localStorage.setItem(CONV_KEY, data.conversation_id);
      }

      const reply = typeof data?.response === 'string'
        ? data.response
        : JSON.stringify(data?.response ?? 'Sem resposta', null, 2);

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || 'Falha ao contatar o agente';
      toast.error(msg);
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }]);
    } finally {
      setIsSending(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/10 to-gray-900 p-4">
      <div className="max-w-5xl mx-auto">
        <Card className="bg-gray-800/90 border-blue-500/30 shadow-2xl backdrop-blur">
          <CardHeader className="border-b border-blue-500/20 bg-gradient-to-r from-blue-900/30 to-cyan-900/30">
            <CardTitle className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Heloim IA</h1>
                  <p className="text-sm text-blue-300">Superagente AI Top Tech Digital — Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-900/30 border border-green-500/30">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-xs font-bold text-green-300">CONECTADO</span>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4 border-b border-blue-500/10 bg-gray-900/20">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.title}
                  onClick={() => sendMessage(action.message)}
                  disabled={isSending}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-gray-800/60 border border-blue-500/20 hover:border-blue-500/50 hover:bg-gray-800 transition-all text-center disabled:opacity-50"
                >
                  <span className="text-2xl">{action.emoji}</span>
                  <span className="text-xs font-semibold text-blue-200 leading-tight">{action.title}</span>
                </button>
              ))}
            </div>

            {/* CHAT MESSAGES */}
            <div className="h-[460px] overflow-y-auto p-6 space-y-4 bg-gray-900/30">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mb-4">
                    <Sparkles className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Heloim IA</h3>
                  <p className="text-gray-400 max-w-md">
                    Converse direto com o Superagente. Use uma ação rápida acima ou escreva sua pergunta abaixo.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-green-700 to-emerald-800 text-white'
                          : 'bg-gradient-to-br from-blue-900/70 to-blue-950/70 border border-blue-500/20 text-gray-100'
                      }`}>
                        {msg.role === 'user' ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <ReactMarkdown
                            className="text-sm prose prose-invert prose-blue max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                            components={{
                              code: ({ inline, children }) => inline ? (
                                <code className="px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-200 text-xs font-mono">{children}</code>
                              ) : (
                                <pre className="bg-gray-900 rounded-lg p-3 overflow-x-auto my-2 border border-gray-700"><code className="text-xs text-gray-300">{children}</code></pre>
                              ),
                              p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
                              ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
                              strong: ({ children }) => <strong className="text-blue-300 font-bold">{children}</strong>,
                            }}
                          >{msg.content}</ReactMarkdown>
                        )}
                      </div>
                    </div>
                  ))}
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="bg-blue-900/50 border border-blue-500/20 rounded-2xl px-4 py-3 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        <span className="text-sm text-gray-400">Heloim pensando...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* INPUT AREA */}
            <div className="border-t border-blue-500/20 bg-gray-800/50 p-4">
              <div className="flex gap-3">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Escreva sua mensagem para o Heloim..."
                  className="flex-1 min-h-[80px] bg-gray-900 border-blue-500/30 text-white placeholder-gray-500 resize-none focus:border-blue-500"
                  disabled={isSending}
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isSending}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white h-[80px] px-6"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">💡 Enter para enviar • Shift+Enter para nova linha</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}