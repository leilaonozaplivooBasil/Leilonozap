import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fmtBR } from '@/lib/money';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { X, ShoppingBag, TrendingUp, Award } from 'lucide-react';

const SEEN_KEY = 'txNotifySeenIds';
// ⏱️ RITMO DA CONSULTA (08/08/2026 — rate limit em getTransactionNotifications):
// antes eram 15s FIXOS, em toda aba aberta e mesmo com a aba no fundo — ~240
// chamadas por hora POR ABA, o que sozinho estourava o limite do endpoint.
// Agora: 90s a 120s (sorteado, pra abas diferentes não baterem juntas), aba no
// fundo não consulta, e limite atingido = pausa + espera dobrada (backoff).
const POLL_MIN_MS = 90000;
const POLL_MAX_MS = 120000;
const PAUSA_RATE_LIMIT_MS = 120000; // 2 min parados quando o limite é atingido
const ESPERA_MAX_MS = 10 * 60 * 1000; // teto do backoff: 10 min
const proximoIntervalo = () =>
  POLL_MIN_MS + Math.floor(Math.random() * (POLL_MAX_MS - POLL_MIN_MS));

// Reconhece "limite atingido" tanto por status quanto por texto da resposta.
function ehRateLimit(erro, dados) {
  const status = erro?.status || erro?.response?.status || dados?.status;
  if (status === 429) return true;
  const texto = `${erro?.message || ''} ${dados?.error || ''}`.toLowerCase();
  return texto.includes('429') || texto.includes('rate limit') || texto.includes('too many requests');
}
const AUTO_HIDE_MS = 8000; // fica no mínimo 5s na tela e some sozinho (sem sujar); X fecha antes
const MAX_VISIBLE = 3;

// "ding" curto de notificação (WebAudio — sem asset externo)
function playNotifySound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [[880, 0], [1318.5, 0.12]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t); osc.stop(t + 0.4);
    });
  } catch { /* autoplay bloqueado — segue sem som */ }
}

const TYPE_STYLE = {
  purchase: { icon: ShoppingBag, accent: '#34d399', label: 'Compra confirmada' },
  sale: { icon: TrendingUp, accent: '#4ade80', label: 'Venda realizada' },
  commission: { icon: Award, accent: '#fbbf24', label: 'Comissão recebida' },
};

/**
 * Popups de transação — notifica em tela, de forma limpa e fácil de fechar:
 * • comprador: compra confirmada (imagem, descrição, valor)
 * • vendedor: venda realizada
 * • comissionado: comissão recebida
 * Dedup por id em localStorage; primeira carga marca histórico como visto (não spamma).
 */
export default function TransactionToasts() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) { clearTimeout(timersRef.current[id]); delete timersRef.current[id]; }
  }, []);

  useEffect(() => {
    let alive = true;

    const getSeen = () => {
      try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); }
    };
    const saveSeen = (set) => {
      try { localStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-300))); } catch { /* quota */ }
    };

    const poll = async () => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) return;
        const user = JSON.parse(savedUser);
        if (!user?.id) return;

        let result;
        try {
          result = await base44.functions.invoke('getTransactionNotifications', { user_id: user.id });
        } catch (erro) {
          // Limite atingido: para de insistir e dobra a espera (backoff exponencial).
          if (ehRateLimit(erro, null)) return 'limite';
          return 'erro';
        }
        const data = result?.data || result;
        if (ehRateLimit(null, data)) return 'limite';
        if (!data?.success || !Array.isArray(data.events)) return;

        const seen = getSeen();
        const firstRun = seen.size === 0;
        let fresh = data.events.filter((e) => !seen.has(e.id));
        fresh.forEach((e) => seen.add(e.id));
        saveSeen(seen);

        // primeira execução: memoriza o histórico antigo, mas transações dos
        // últimos 10 min NOTIFICAM mesmo assim (venda feita agora não pode se perder)
        if (firstRun) {
          const cutoff = Date.now() - 10 * 60 * 1000;
          fresh = fresh.filter((e) => e.date && new Date(e.date).getTime() > cutoff);
        }
        if (!alive || fresh.length === 0) return;

        playNotifySound();
        setToasts((prev) => {
          const next = [...fresh.map((e) => ({ ...e, key: e.id })), ...prev].slice(0, MAX_VISIBLE);
          return next;
        });
        for (const e of fresh.slice(0, MAX_VISIBLE)) {
          timersRef.current[e.id] = setTimeout(() => dismiss(e.id), AUTO_HIDE_MS);
        }
      } catch { /* silencioso */ }
    };

    // 🔁 Ciclo próprio (setTimeout que se reagenda) em vez de setInterval fixo:
    // permite espera variável, pausa e backoff. Aba no fundo NÃO consulta — só
    // reagenda; ao voltar pra frente faz uma checagem imediata (regra mobile:
    // setInterval é congelado em segundo plano no celular).
    let timer = null;
    let esperaExtra = 0; // acumulada pelo backoff quando dá limite/erro

    const agendar = (ms) => {
      if (!alive) return;
      clearTimeout(timer);
      timer = setTimeout(ciclo, ms);
    };

    const ciclo = async () => {
      if (!alive) return;
      if (document.visibilityState !== 'visible') {
        agendar(proximoIntervalo()); // aba no fundo: nem tenta
        return;
      }
      const resultado = await poll();
      if (!alive) return;
      if (resultado === 'limite') {
        // pausa de 2 min e, nas próximas falhas, o dobro (até 10 min)
        esperaExtra = Math.min(esperaExtra ? esperaExtra * 2 : PAUSA_RATE_LIMIT_MS, ESPERA_MAX_MS);
        agendar(esperaExtra);
        return;
      }
      if (resultado === 'erro') {
        esperaExtra = Math.min(esperaExtra ? esperaExtra * 2 : POLL_MIN_MS, ESPERA_MAX_MS);
        agendar(esperaExtra);
        return;
      }
      esperaExtra = 0; // deu certo: volta ao ritmo normal
      agendar(proximoIntervalo());
    };

    // Ao voltar pro app (celular saindo do fundo / troca de aba): checa na hora,
    // respeitando um mínimo de 30s pra não virar uma nova enxurrada de chamadas.
    let ultimaVolta = 0;
    const aoVoltar = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - ultimaVolta < 30000) return;
      ultimaVolta = Date.now();
      agendar(600);
    };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);

    ciclo();
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-[360px] pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const st = TYPE_STYLE[t.type] || TYPE_STYLE.purchase;
          const Icon = st.icon;
          return (
            <motion.div
              key={t.key}
              initial={{ opacity: 0, y: -24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              className="pointer-events-auto flex items-center gap-3 rounded-2xl p-3 pr-2"
              style={{
                background: 'rgba(10, 18, 14, 0.92)',
                border: `1px solid ${st.accent}44`,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: `0 10px 32px rgba(0,0,0,0.5), 0 0 18px ${st.accent}22`,
              }}
            >
              {t.image ? (
                <img src={t.image} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-white/10" />
              ) : (
                <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${st.accent}1f` }}>
                  <Icon className="w-5 h-5" style={{ color: st.accent }} />
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: st.accent }}>{st.label}</p>
                <p className="text-xs font-semibold text-white truncate">{t.product}</p>
                <p className="text-sm font-extrabold text-white tabular-nums">
                  R$ {fmtBR(Number(t.amount || 0))}
                </p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="self-start p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}