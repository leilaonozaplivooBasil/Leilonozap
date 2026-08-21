import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { plataforma } from '@/api/plataformaClient';
import { X, UserPlus } from 'lucide-react';

const SEEN_KEY = 'referralSignupSeenIds';
const POLL_MS = 20000;
const AUTO_HIDE_MS = 8000;
const MAX_VISIBLE = 3;

// 🎉 Avisa quem indicou (Influenciador/Vendedor/Licenciado/Parceiro) assim que
// alguém se cadastra pelo link dele — mesmo padrão visual do TransactionToasts.
export default function ReferralSignupToast() {
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

        const referred = await plataforma.entities.AppUser.filter({ referred_by_id: user.id }, '-created_date', 10);
        if (!Array.isArray(referred) || referred.length === 0) return;

        const seen = getSeen();
        const firstRun = seen.size === 0;
        let fresh = referred.filter((u) => !seen.has(u.id));
        fresh.forEach((u) => seen.add(u.id));
        saveSeen(seen);

        if (firstRun) {
          const cutoff = Date.now() - 10 * 60 * 1000;
          fresh = fresh.filter((u) => u.created_date && new Date(u.created_date).getTime() > cutoff);
        }
        if (!alive || fresh.length === 0) return;

        setToasts((prev) => {
          const next = [...fresh.map((u) => ({ id: u.id, name: u.display_first_name || (u.full_name || '').split(' ')[0] || u.nickname || 'Alguém' })), ...prev].slice(0, MAX_VISIBLE);
          return next;
        });
        for (const u of fresh.slice(0, MAX_VISIBLE)) {
          timersRef.current[u.id] = setTimeout(() => dismiss(u.id), AUTO_HIDE_MS);
        }
      } catch { /* silencioso */ }
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => { alive = false; clearInterval(interval); Object.values(timersRef.current).forEach(clearTimeout); };
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-[360px] pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl p-3 pr-2"
            style={{
              background: 'rgba(10, 18, 14, 0.92)',
              border: '1px solid #4ade8044',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 10px 32px rgba(0,0,0,0.5), 0 0 18px #4ade8022',
            }}
          >
            <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#4ade801f' }}>
              <UserPlus className="w-5 h-5 text-emerald-400" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-400">Novo cadastro 🎉</p>
              <p className="text-xs font-semibold text-white truncate">{t.name} se cadastrou com seu link</p>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="self-start p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}