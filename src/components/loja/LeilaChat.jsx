import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";
import leilaSuporte from "@/assets/leila-suporte.webp";

// 🤖 Persona da Leila — atendente IA oficial do Leilão NoZap.
// O app usa adapter Supabase (sem base44.agents), então a conversa roda via InvokeLLM
// com o histórico mantido em estado local.
const LEILA_SYSTEM = `Você é a Leila, a atendente IA oficial da plataforma Leilão NoZap.
Você ajuda usuários com dúvidas sobre:
- Leilões online (como participar, dar lances, arrematar)
- Loja Virtual (produtos, carrinho, pedidos, frete)
- Sistema de Alavancagem (planos de carreira, comissões, níveis)
- Carteira digital (saldo, depósitos, saques)
- Pedidos e rastreio

REGRAS:
- Responda sempre em português do Brasil, de forma amigável, curta e direta.
- Não invente informações. Se não souber, diga que vai direcionar a dúvida para a equipe.
- Nunca peça dados sensíveis (senha, CPF, número de cartão).
- Não execute transações — apenas oriente o usuário onde fazer cada ação no app.
- Se o usuário perguntar sobre saldo específico ou dados da conta, oriente a ir na aba "Carteira".`;

export default function LeilaChat({ open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Quando abre: foca o input
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      // Reseta erro ao fechar
      setError(null);
    }
  }, [open]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);
    setError(null);

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);

    try {
      // Monta o histórico da conversa no prompt (InvokeLLM recebe um prompt único)
      const hist = newMessages
        .map((m) => `${m.role === "user" ? "Usuário" : "Leila"}: ${m.content}`)
        .join("\n\n");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${LEILA_SYSTEM}\n\n--- CONVERSA ---\n${hist}\n\nLeila:`,
      });

      const reply =
        result?.text || result?.response || result?.ok === false
          ? (result?.error || "Não consegui responder agora. Tente novamente.")
          : "Não consegui responder agora. Tente novamente.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error("[LeilaChat] InvokeLLM falhou:", e);
      setError("Não consegui responder agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

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
                  {isUser ? (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm prose-invert max-w-none break-words">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
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