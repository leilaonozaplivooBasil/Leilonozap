import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Bot, Power, Loader2, Send, Search, QrCode, RefreshCw, BrainCircuit, User as UserIcon
} from 'lucide-react';

// Inbox WhatsApp estilo Dra. Isabela: QR + conversas + ligar/desligar IA (global e por conversa) + treinar.
export default function WhatsAppInbox({ user }) {
  const [cfg, setCfg] = useState(null); // { connected, qr, backend_configurado, config:{ai_global_on, ai_prompt} }
  const [loading, setLoading] = useState(true);
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [prompt, setPrompt] = useState('');
  const [showTrain, setShowTrain] = useState(false);
  const endRef = useRef(null);

  const call = (action, extra = {}) => base44.functions.invoke('waProxy', { action, actorId: user.id, ownerId: user.id, ...extra });

  const loadCfg = async () => {
    const r = await call('getConfig');
    setCfg(r); setPrompt(r?.config?.ai_prompt || '');
    setLoading(false);
  };
  const loadConvs = async () => { const r = await call('listConvs'); setConvs(r?.conversas || []); };
  const loadMsgs = async (chat) => { const r = await call('listMsgs', { chat }); setMsgs(r?.mensagens || []); setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); };

  useEffect(() => { if (user?.id) { loadCfg(); loadConvs(); }   }, [user]);
  // polling leve quando conectado
  useEffect(() => {
    if (!cfg?.connected) return;
    const t = setInterval(() => { loadConvs(); if (active) loadMsgs(active.chat_id); }, 8000);
    return () => clearInterval(t);
     
  }, [cfg?.connected, active]);

  const openConv = (c) => { setActive(c); loadMsgs(c.chat_id); };
  const send = async () => {
    if (!text.trim() || !active) return;
    setBusy('send');
    const r = await call('send', { chat: active.chat_id, text });
    if (r?.ok !== false) { setText(''); loadMsgs(active.chat_id); } else toast.error(r?.error || 'Falha ao enviar');
    setBusy('');
  };
  const toggleGlobal = async () => { const on = !(cfg?.config?.ai_global_on); await call('setAiGlobal', { on }); setCfg((c) => ({ ...c, config: { ...c.config, ai_global_on: on } })); };
  const toggleConv = async (c) => { const on = !(c.ai_on !== false); await call('toggleConv', { chat: c.chat_id, on }); setConvs((p) => p.map((x) => (x.chat_id === c.chat_id ? { ...x, ai_on: on } : x))); };
  const salvarPrompt = async () => { setBusy('train'); await call('savePrompt', { prompt }); toast.success('IA treinada!'); setShowTrain(false); setBusy(''); };
  const restart = async () => { setBusy('restart'); await call('restart'); setTimeout(loadCfg, 2500); setBusy(''); };

  if (loading) return <div className="flex items-center gap-2 text-gray-400 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Carregando atendimento…</div>;

  // backend ainda não plugado
  if (!cfg?.backend_configurado) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 text-sm text-yellow-100">
        ⚙️ O backend do WhatsApp (Baileys) ainda não está conectado a este painel. Assim que o servidor estiver no ar, o QR e as conversas aparecem aqui automaticamente.
      </div>
    );
  }

  const filtered = convs.filter((c) => !q || (c.name || '').toLowerCase().includes(q.toLowerCase()) || (c.chat_id || '').includes(q));

  return (
    <div>
      {/* barra de status */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 ${cfg.connected ? 'bg-green-500/15 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
          <span className={`w-2 h-2 rounded-full ${cfg.connected ? 'bg-green-400' : 'bg-gray-400'}`} /> {cfg.connected ? 'WhatsApp conectado' : 'WhatsApp desconectado'}
        </span>
        <button onClick={toggleGlobal} className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${cfg.config?.ai_global_on ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
          <Bot className="w-4 h-4" /> {cfg.config?.ai_global_on ? 'IA LIGADA (responde sozinha)' : 'IA desligada'}
        </button>
        <button onClick={() => setShowTrain((s) => !s)} className="px-3 py-1.5 rounded-full text-sm font-semibold bg-indigo-600/30 text-indigo-200 flex items-center gap-2"><BrainCircuit className="w-4 h-4" /> Treinar a IA</button>
        <button onClick={restart} disabled={busy === 'restart'} className="px-3 py-1.5 rounded-full text-sm text-gray-300 bg-gray-800 flex items-center gap-2">{busy === 'restart' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Reconectar</button>
      </div>

      {showTrain && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 mb-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><BrainCircuit className="w-4 h-4 text-indigo-300" /> Treinar a IA de atendimento</h3>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} placeholder="Ex: Você é o atendimento da Leilão NoZap. Horário de funcionamento, formas de pagamento, política de entrega... Responda cordial e objetivo." className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500 resize-none mb-2" />
          <button onClick={salvarPrompt} disabled={busy === 'train'} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold flex items-center gap-2">{busy === 'train' ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />} Salvar treino</button>
        </div>
      )}

      {/* QR quando desconectado */}
      {!cfg.connected && cfg.qr && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6 text-center mb-4">
          <div className="flex items-center justify-center gap-2 text-gray-300 mb-3"><QrCode className="w-5 h-5" /> Escaneie pra conectar o WhatsApp do galpão</div>
          <img src={cfg.qr} alt="QR WhatsApp" className="w-56 h-56 mx-auto bg-white rounded-xl p-2" />
          <p className="text-[11px] text-gray-500 mt-2">WhatsApp → Aparelhos conectados → Conectar um aparelho</p>
        </div>
      )}

      {/* inbox */}
      {cfg.connected && (
        <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[60vh]">
          {/* lista */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
            <div className="p-2 border-b border-gray-800">
              <div className="relative"><Search className="w-4 h-4 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar conversa…" className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-8 pr-2 py-2 text-sm outline-none" /></div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? <p className="text-gray-500 text-sm p-4 text-center">Nenhuma conversa ainda.</p> : filtered.map((c) => (
                <button key={c.chat_id} onClick={() => openConv(c)} className={`w-full text-left px-3 py-2.5 border-b border-gray-800/60 hover:bg-gray-800/50 ${active?.chat_id === c.chat_id ? 'bg-gray-800' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate">{c.name || c.chat_id?.split('@')[0]}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${c.ai_on !== false ? 'bg-green-500/15 text-green-300' : 'bg-gray-700 text-gray-400'}`}>{c.ai_on !== false ? 'IA on' : 'IA off'}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">{c.last_message || ''}</div>
                </button>
              ))}
            </div>
          </div>

          {/* thread */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Selecione uma conversa à esquerda.</div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                  <div className="font-semibold flex items-center gap-2"><UserIcon className="w-4 h-4 text-gray-400" /> {active.name || active.chat_id?.split('@')[0]}</div>
                  <button onClick={() => toggleConv(active)} className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${active.ai_on !== false ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}><Power className="w-3 h-3" /> IA {active.ai_on !== false ? 'on' : 'off'}</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {msgs.map((m) => (
                    <div key={m.id} className={`flex ${m.from_me ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.from_me ? (m.sender === 'IA' ? 'bg-indigo-600/40' : 'bg-green-600/40') : 'bg-gray-800'}`}>
                        {m.from_me && m.sender === 'IA' && <div className="text-[9px] text-indigo-200 mb-0.5">🤖 IA</div>}
                        <div className="whitespace-pre-wrap">{m.body}</div>
                        <div className="text-[9px] text-gray-400 mt-0.5 text-right">{m.ts ? new Date(m.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
                <div className="p-3 border-t border-gray-800 flex gap-2">
                  <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Escreva (você intervém na conversa)…" className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                  <button onClick={send} disabled={busy === 'send'} className="px-4 rounded-lg bg-green-600 hover:bg-green-700 font-semibold flex items-center gap-1">{busy === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
