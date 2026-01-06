import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Bot, X, Send, Sparkles, Trash2, Copy, CheckCircle, Paperclip, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

export default function ArquitetoFloatingButton({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [attachedImages, setAttachedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [hasNewErrors, setHasNewErrors] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState(Date.now());
  const chatRef = useRef(null);
  const fileInputRef = useRef(null);

  // Só mostra para admin
  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  // Monitorar erros em tempo real
  useEffect(() => {
    const checkErrors = async () => {
      try {
        const logs = await base44.entities.SystemLog.filter(
          { status: 'error', created_date: { $gte: new Date(lastCheckedTime).toISOString() } },
          '-created_date',
          50
        );
        
        if (logs.length > 0) {
          setErrorCount(prev => prev + logs.length);
          setHasNewErrors(true);
          
          // Auto-abrir com resumo se houver muitos erros
          if (logs.length >= 3 && !isOpen) {
            const errorSummary = logs.map((log, idx) => 
              `${idx + 1}. **${log.step}**: ${log.message}`
            ).join('\n\n');
            
            setTimeout(() => {
              setInputMessage(`🚨 ALERTA: ${logs.length} erros detectados:\n\n${errorSummary}\n\nAnalise e sugira correções urgentes.`);
            }, 100);
          }
        }
        
        setLastCheckedTime(Date.now());
      } catch (error) {
        console.error('Erro ao monitorar logs:', error);
      }
    };

    const interval = setInterval(checkErrors, 5000); // Verifica a cada 5 segundos
    checkErrors(); // Verifica imediatamente

    return () => clearInterval(interval);
  }, [lastCheckedTime, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHasNewErrors(false);
      setErrorCount(0);
    }
  }, [isOpen]);

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

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const uploadedUrls = [];
    
    try {
      for (const file of Array.from(files).slice(0, 5)) {
        if (!file.type.startsWith('image/')) continue;
        
        const result = await base44.integrations.Core.UploadFile({ file });
        if (result?.file_url) {
          uploadedUrls.push(result.file_url);
        }
      }
      
      if (uploadedUrls.length > 0) {
        setAttachedImages([...attachedImages, ...uploadedUrls]);
        toast.success(`✅ ${uploadedUrls.length} imagem(ns) anexada(s)`);
      }
    } catch (error) {
      console.error('Erro ao enviar imagens:', error);
      toast.error('Erro ao anexar imagens');
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async () => {
    if ((!inputMessage.trim() && attachedImages.length === 0) || !conversationId || isSending) return;

    setIsSending(true);
    const userMessage = inputMessage.trim() || '🖼️ Imagem anexada';
    const imagesToSend = [...attachedImages];
    
    setInputMessage('');
    setAttachedImages([]);

    try {
      const conversation = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage,
        file_urls: imagesToSend.length > 0 ? imagesToSend : undefined
      });
    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const clearConversation = async () => {
    if (!confirm('🗑️ Limpar toda a conversa?')) return;
    
    try {
      const conversation = await base44.agents.createConversation({
        agent_name: 'arquiteto_base44',
        metadata: {
          name: 'Nova Sessão',
          description: 'Análise e otimização'
        }
      });
      setConversationId(conversation.id);
      setMessages([]);
      toast.success('✅ Conversa reiniciada!');
    } catch (error) {
      toast.error('Erro ao reiniciar');
    }
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('📋 Copiado!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  return (
    <>
      {/* Botão Flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[999] group"
          title={hasNewErrors ? `🚨 ${errorCount} erro(s) detectado(s)!` : "Arquiteto IA - Assistente"}
        >
          <div className="relative">
            <div className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 border-2 ${
              hasNewErrors 
                ? 'bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 border-red-400/50 shadow-red-500/50 animate-error-pulse' 
                : 'bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 border-purple-400/50 shadow-purple-500/50 animate-pulse'
            }`}>
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1">
              {hasNewErrors ? (
                <div className="relative">
                  <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                    <span className="text-white text-xs font-bold">{errorCount > 99 ? '99+' : errorCount}</span>
                  </div>
                  <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-75"></div>
                </div>
              ) : (
                <Sparkles className="w-5 h-5 text-yellow-400 animate-spin" />
              )}
            </div>
          </div>
        </button>
      )}

      {/* Modal Chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[999] w-[450px] h-[700px] bg-gray-900 rounded-2xl shadow-2xl border-2 border-purple-500/50 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">Arquiteto Base44</h3>
                <p className="text-xs text-purple-200">Guardião & Otimizador Master</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={clearConversation}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Chat Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-800">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                </div>
                <p className="font-bold text-white mb-1">Arquiteto Base44 Online</p>
                <p className="text-xs mb-4">Pergunte sobre otimizações, bugs ou análise de código</p>
                
                {/* Quick Actions */}
                <div className="space-y-2 text-left mt-6">
                  <button
                    onClick={() => setInputMessage('Analise o sistema de lances em tempo real e identifique possíveis melhorias de performance e confiabilidade')}
                    className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="text-lg mb-1">🔍</div>
                    <div className="text-xs font-bold text-white">Análise de Performance</div>
                    <div className="text-xs text-gray-400">Identificar gargalos</div>
                  </button>
                  
                  <button
                    onClick={() => setInputMessage('Me dê o prompt perfeito para adicionar notificações em tempo real quando alguém der lance em um leilão que estou participando')}
                    className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="text-lg mb-1">✨</div>
                    <div className="text-xs font-bold text-white">Engenharia de Prompt</div>
                    <div className="text-xs text-gray-400">Comando otimizado</div>
                  </button>
                  
                  <button
                    onClick={() => setInputMessage('Analise os logs do sistema e identifique erros recorrentes ou padrões de falha que precisam ser corrigidos')}
                    className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="text-lg mb-1">🛡️</div>
                    <div className="text-xs font-bold text-white">Detecção de Bugs</div>
                    <div className="text-xs text-gray-400">Encontrar problemas</div>
                  </button>
                </div>
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
                    className={`max-w-[80%] rounded-2xl px-4 py-3 relative group ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white'
                        : 'bg-gray-700 border border-purple-500/20 text-gray-100'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <>
                        <ReactMarkdown
                          className="text-sm prose prose-invert prose-purple max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                          components={{
                            code: ({ inline, children }) =>
                              inline ? (
                                <code className="px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-200 text-xs font-mono">
                                  {children}
                                </code>
                              ) : (
                                <pre className="bg-gray-900 rounded-lg p-2 overflow-x-auto my-2 border border-gray-700">
                                  <code className="text-xs text-gray-300">{children}</code>
                                </pre>
                              ),
                            p: ({ children }) => <p className="my-1 leading-relaxed text-xs">{children}</p>,
                            ul: ({ children }) => <ul className="my-1 ml-3 list-disc space-y-0.5 text-xs">{children}</ul>,
                            ol: ({ children }) => <ol className="my-1 ml-3 list-decimal space-y-0.5 text-xs">{children}</ol>,
                            strong: ({ children }) => <strong className="text-purple-300 font-bold">{children}</strong>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-600 hover:bg-gray-500"
                          onClick={() => copyToClipboard(msg.content, idx)}
                        >
                          {copiedId === idx ? (
                            <CheckCircle className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-300" />
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        {msg.file_urls && msg.file_urls.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {msg.file_urls.map((url, imgIdx) => (
                              <img 
                                key={imgIdx}
                                src={url} 
                                alt={`Anexo ${imgIdx + 1}`}
                                className="max-w-full rounded-lg border border-purple-500/30"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </>
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
            {/* Preview de imagens anexadas */}
            {attachedImages.length > 0 && (
              <div className="mb-3 flex gap-2 flex-wrap">
                {attachedImages.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img 
                      src={url} 
                      alt={`Anexo ${idx + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border-2 border-purple-500"
                    />
                    <button
                      onClick={() => setAttachedImages(attachedImages.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSending}
                variant="ghost"
                className="text-gray-400 hover:text-white hover:bg-gray-800 h-[60px] px-3"
                title="Anexar imagens"
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Paperclip className="w-5 h-5" />
                )}
              </Button>
              
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                onPaste={async (e) => {
                  const items = e.clipboardData?.items;
                  if (!items) return;
                  
                  const imageFiles = [];
                  for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                      const file = items[i].getAsFile();
                      if (file) imageFiles.push(file);
                    }
                  }
                  
                  if (imageFiles.length > 0) {
                    e.preventDefault();
                    await handleImageUpload(imageFiles);
                  }
                }}
                placeholder="Descreva o problema ou cole screenshots (Ctrl+V)..."
                disabled={isSending || isUploading}
                className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500 text-sm resize-none min-h-[60px] max-h-[120px]"
              />
              <Button
                onClick={sendMessage}
                disabled={isSending || isUploading || (!inputMessage.trim() && attachedImages.length === 0)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-[60px]"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handleImageUpload(e.target.files);
                }
                e.target.value = '';
              }}
            />
            
            <p className="text-xs text-gray-500 mt-2">
              💡 Enter = enviar | 📎 Anexe screenshots de bugs
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.4); }
          50% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.8), 0 0 60px rgba(168, 85, 247, 0.4); }
        }
        @keyframes error-pulse {
          0%, 100% { 
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.8), 0 0 60px rgba(239, 68, 68, 0.4);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 50px rgba(239, 68, 68, 1), 0 0 80px rgba(239, 68, 68, 0.6), 0 0 100px rgba(239, 68, 68, 0.3);
            transform: scale(1.05);
          }
        }
        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
        .animate-error-pulse {
          animation: error-pulse 1s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}