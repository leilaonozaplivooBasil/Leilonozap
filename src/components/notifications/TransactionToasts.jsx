import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { X, ShoppingBag, TrendingUp, Award } from 'lucide-react';

const SEEN_KEY = 'txNotifySeenIds';
const POLL_MS = 25000;
const AUTO_HIDE_MS = 10000;
const MAX_VISIBLE = 3;

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

        const result = await base44.functions.invoke('getTransactionNotifications', { user_id: user.id });
        const data = result?.data || result;
        if (!data?.success || !Array.isArray(data.events)) return;

        const seen = getSeen();
        const firstRun = seen.size === 0;
        const fresh = data.events.filter((e) => !seen.has(e.id));
        fresh.forEach((e) => seen.add(e.id));
        saveSeen(seen);

        // primeira execução: só memoriza o histórico, sem poluir a tela
        if (firstRun || !alive || fresh.length === 0) return;

        setToasts((prev) => {
          const next = [...fresh.map((e) => ({ ...e, key: e.id })), ...prev].slice(0, MAX_VISIBLE);
          return next;
        });
        for (const e of fresh.slice(0, MAX_VISIBLE)) {
          timersRef.current[e.id] = setTimeout(() => dismiss(e.id), AUTO_HIDE_MS);
        }
      } catch { /* silencioso */ }
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => { alive = false; clearInterval(interval); Object.values(timersRef.current).forEach(clearTimeout); };
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[80] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-[340px] pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const st = TYPE_STYLE[t.type] || TYPE_STYLE.purchase;
          const Icon = st.icon;
          return (
            <motion.div
              key={t.key}
              initial={{ opacity: 0, x: -24, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -16, scale: 0.96 }}
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
                  R$ {Number(t.amount || 0).toFixed(2).replace('.', ',')}
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
