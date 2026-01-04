import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ArquitetoFloatingButton({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatRef = useRef(null);

  // Só mostra para admin
  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  useEffect(() => {
    if (isOpen && !conversationId) {
      initConversation();
    }
  }, [isOpen]);

  useEffect(() => {
    if (conversationId) {
      const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
        setMessages(data.messages || []);
      });
      return () => unsubscribe();
    }
  }, [conversationId]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const initConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'arquiteto_base44',
        metadata: {
          name: 'Arquiteto IA - Assistente',
          description: 'Conversa com o Arquiteto IA'
        }
      });
      setConversationId(conv.id);
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !conversationId || isSending) return;

    setIsSending(true);
    try {
      const conversation = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: inputMessage
      });
      setInputMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[999] group"
          title="Arquiteto IA - Assistente"
        >
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 rounded-full shadow-2xl shadow-purple-500/50 flex items-center justify-center transition-all duration-300 group-hover:scale-110 border-2 border-purple-400/50 animate-pulse">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Sparkles className="w-5 h-5 text-yellow-400 animate-spin" />
            </div>
          </div>
        </button>
      )}

      {/* Modal Chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[999] w-[400px] h-[600px] bg-gray-900 rounded-2xl shadow-2xl border-2 border-purple-500/50 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">Arquiteto IA</h3>
                <p className="text-xs text-purple-200">Assistente de Desenvolvimento</p>
              </div>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Chat Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-800">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Bot className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                <p className="font-semibold mb-1">Olá! Sou o Arquiteto IA</p>
                <p className="text-sm">Como posso ajudar na construção?</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown
                        className="prose prose-sm prose-invert max-w-none"
                        components={{
                          code: ({ inline, children }) =>
                            inline ? (
                              <code className="bg-gray-800 px-1 py-0.5 rounded text-purple-400">
                                {children}
                              </code>
                            ) : (
                              <pre className="bg-gray-900 p-2 rounded overflow-x-auto">
                                <code className="text-green-400">{children}</code>
                              </pre>
                            ),
                          p: ({ children }) => <p className="mb-2">{children}</p>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">
                        {currentUser?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-gray-900 rounded-b-2xl border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Digite seu comando..."
                disabled={isSending}
                className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500 text-sm"
              />
              <Button
                onClick={sendMessage}
                disabled={isSending || !inputMessage.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.4); }
          50% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.8), 0 0 60px rgba(168, 85, 247, 0.4); }
        }
        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}