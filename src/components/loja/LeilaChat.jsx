import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";
import leilaSuporte from "@/assets/leila-suporte.webp";

const AGENT_NAME = "leila_atendente";

export default function LeilaChat({ open, onClose }) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Guarda a conversa completa (addMessage precisa do objeto inteiro, não só do id)
  const conversationRef = useRef(null);

  // Cria/retoma a conversa quando o chat abre pela primeira vez
  const ensureConversation = useCallback(async () => {
    if (conversationRef.current) return conversationRef.current;
    try {
      setError(null);
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: "Atendimento Leila", description: "Chat de suporte com a Leila" },
      });
      conversationRef.current = conv;
      setConversationId(conv.id);
      setMessages(conv.messages || []);
      return conv;
    } catch (e) {
      console.error("[LeilaChat] createConversation falhou:", e);
      const msg = e?.message || e?.error || String(e);
      setError(`Não consegui iniciar a conversa: ${msg}`);
      return null;
    }
  }, []);

  // Quando abre: garante conversa e foca o input
  useEffect(() => {
    if (open) {
      ensureConversation();
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe ao streaming da conversa
  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [conversationId]);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    const conv = await ensureConversation();
    if (!conv) return;
    setInput("");
    setLoading(true);
    setError(null);
    try {
      await base44.agents.addMessage(
        conv,
        { role: "user", content: text }
      );
    } catch (e) {
      console.error("[LeilaChat] addMessage falhou:", e);
      setLoading(false);
      const msg = e?.message || e?.error || String(e);
      setError(`Não consegui enviar a mensagem: ${msg}`);
    }
  }, [input, loading, ensureConversation]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay escuro */}
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      {/* Drawer lateral direito */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[9999] w-full max-w-md flex flex-col bg-[#0b1018] border-l border-green-900/40 shadow-2xl"
        role="dialog"
        aria-label="Chat com a Leila"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-green-900/40 bg-gradient-to-r from-[#14324a] to-[#0b1018]">
          <div className="relative shrink-0">
            <span className="block w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-green-400 shadow-lg">
              <img src={leilaSuporte} alt="Leila" className="w-full h-full object-cover object-top" />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-green-500 border-2 grid place-items-center" style={{ borderColor: "#0b1018" }}>
              <Bot className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm sm:text-base truncate">Leila</p>
            <p className="text-green-400 text-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {loading ? "digitando..." : "atendente online"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar chat"
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {messages.length === 0 && !loading && (
            <div className="text-center text-gray-400 text-sm py-8">
              <p className="font-medium text-white mb-1">Olá! Eu sou a Leila 👋</p>
              <p>Como posso te ajudar hoje? Pode perguntar sobre leilões, loja, comissões, pedidos...</p>
            </div>
          )}
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
              <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                    isUser
                      ? "bg-green-600 text-white rounded-br-sm"
                      : "bg-gray-800 text-gray-100 rounded-bl-sm"
                  }`}
                >
                  {msg.content ? (
                    isUser ? (
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    ) : (
                      <div className="prose prose-sm prose-invert max-w-none break-words">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )
                  ) : null}
                  {msg.tool_calls?.map((tc, i) => (
                    <div key={i} className="mt-1 text-[10px] text-gray-400 flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full border border-gray-500 animate-spin" />
                      consultando {tc.name || "dados"}...
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 text-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm">
                <span className="inline-flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}
          {error && (
            <div className="text-center text-red-400 text-xs py-2">{error}</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 border-t border-green-900/40 bg-[#0b1018]">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escreva sua mensagem..."
              rows={1}
              className="flex-1 resize-none bg-gray-800 text-white rounded-xl px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 max-h-32"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              aria-label="Enviar mensagem"
              className="shrink-0 w-10 h-10 rounded-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed grid place-items-center transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-[10px] text-gray-500 mt-1.5 text-center">
            Atendimento pela IA Leila — não saia do app.
          </p>
        </div>
      </div>
    </>
  );
}