import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";
import leilaSuporte from "@/assets/leila-suporte.webp";

// 🤖 A persona da Leila vive no config do agente: base44/agents/leila_atendente.jsonc
// O chat usa base44.agents (API nativa da Base44) — sem função backend intermediária.

// 🤖 A persona da Leila vive no config do agente: base44/agents/leila_atendente.jsonc
// O chat chama a Deno function "leilaChat" (base44/functions/leilaChat/entry.ts)
// que usa AGENT_API_KEY (disponível no runtime Deno, não no Vercel) pra falar
// com o agente leila_atendente na API nativa da Base44.

// 💬 Divide a resposta em "bolhas" curtas e as envia uma a uma, com uma pausa de
// "digitando..." entre elas — igual conversa real de WhatsApp, em vez de uma
// única parede de texto. Quebra por parágrafo (linha em branco); se vier um
// parágrafo só, tenta quebrar por frase pra não ficar um bloco enorme.
function dividirEmBolhas(texto) {
  const paragrafos = texto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragrafos.length > 1) return paragrafos;
  const frases = texto.match(/[^.!?\n]+[.!?]?(\n|$)/g)?.map((f) => f.trim()).filter(Boolean) || [texto];
  const bolhas = [];
  let atual = "";
  for (const frase of frases) {
    atual = atual ? `${atual} ${frase}` : frase;
    if (atual.length > 120) {
      bolhas.push(atual.trim());
      atual = "";
    }
  }
  if (atual.trim()) bolhas.push(atual.trim());
  return bolhas.length ? bolhas : [texto];
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// 🧠 MEMÓRIA PERSISTENTE — antes a conversa só vivia em memória do componente:
// ao trocar de página (o Layout remonta e LeilaChat junto) ou fechar/abrir o
// chat depois de sair e voltar, a conversationIdRef zerava e a Leila começava
// "do zero", repetindo a saudação como se fosse a primeira vez. Agora a
// conversa (id + histórico visual) fica salva no localStorage, por usuário
// logado (ou "guest" pra visitante), e é restaurada ao montar o componente.
function chaveConversa() {
  try {
    const saved = JSON.parse(localStorage.getItem("currentUser") || "null");
    return `leilaChat_${saved?.id || "guest"}`;
  } catch {
    return "leilaChat_guest";
  }
}

function carregarConversaSalva() {
  try {
    const raw = localStorage.getItem(chaveConversa());
    if (!raw) return { conversationId: null, messages: [] };
    const parsed = JSON.parse(raw);
    return {
      conversationId: parsed?.conversationId || null,
      messages: Array.isArray(parsed?.messages) ? parsed.messages : [],
    };
  } catch {
    return { conversationId: null, messages: [] };
  }
}

function salvarConversa(conversationId, messages) {
  try {
    localStorage.setItem(chaveConversa(), JSON.stringify({ conversationId, messages }));
  } catch {}
}

export default function LeilaChat({ open, onClose }) {
  const [messages, setMessages] = useState(() => carregarConversaSalva().messages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // ⌨️ "digitando..." entre uma bolha e outra da mesma resposta
  const [digitando, setDigitando] = useState(false);
  // 🧠 Mantém a MESMA conversa do início ao fim do chat (memória real do agente),
  // restaurada do localStorage — sobrevive a troca de página e reabertura do chat.
  const conversationIdRef = useRef(carregarConversaSalva().conversationId);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 💾 Salva a cada mudança de histórico (cobre as bolhas indo chegando uma a uma)
  useEffect(() => {
    salvarConversa(conversationIdRef.current, messages);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);

    try {
      let userId = null;
      try {
        const saved = JSON.parse(localStorage.getItem("currentUser") || "null");
        userId = saved?.id || null;
      } catch {}

      const resp = await base44.functions.invoke("leilaChat", {
        message: text,
        conversation_id: conversationIdRef.current,
        user_id: userId,
      });

      if (resp?.conversation_id) {
        conversationIdRef.current = resp.conversation_id;
        salvarConversa(conversationIdRef.current, newMessages);
      }

      const reply = (typeof resp === "string"
        ? resp
        : (resp?.response || resp?.reply || resp?.message || "")).trim()
        || "Não consegui responder agora. Tente novamente.";

      setLoading(false);
      const bolhas = dividirEmBolhas(reply);
      for (let i = 0; i < bolhas.length; i++) {
        setDigitando(true);
        // ⏱️ tempo de "digitação" proporcional ao tamanho da bolha, como no WhatsApp
        await pausa(Math.min(2200, 500 + bolhas[i].length * 18));
        setDigitando(false);
        setMessages((prev) => [...prev, { role: "assistant", content: bolhas[i] }]);
      }
    } catch (e) {
      console.error("[LeilaChat] erro:", e);
      setLoading(false);
      setDigitando(false);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Não consegui responder agora. Tente novamente." },
      ]);
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
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed top-0 right-0 bottom-0 z-[9999] w-full max-w-md flex flex-col bg-[#0b1018] border-l border-green-900/40 shadow-2xl"
        role="dialog"
        aria-label="Chat com a Leila"
      >
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
              {loading || digitando ? "digitando..." : "atendente online"}
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

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {messages.length === 0 && !loading && (
            <div className="text-center text-gray-400 text-sm py-8">
              <p className="font-medium text-white mb-1">Olá! Eu sou a Leila 👋</p>
              <p>Como posso te ajudar hoje? Pode perguntar sobre leilões, loja, pedidos, pagamentos...</p>
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
          {(loading || digitando) && (
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
          <div ref={messagesEndRef} />
        </div>

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