import React, { useEffect, useState } from 'react';
import { Trophy, AlertTriangle, MessageCircle, Copy, Check } from 'lucide-react';

// FEATURE 8 (parte 1) — Qualificação de lead no pós-cadastro.
// Aparece logo depois que o link é gerado, ANTES da pessoa sair divulgando:
// deixa a regra clara ("só conta quem fica no grupo") e entrega uma mensagem
// pré-pronta qualificada, pra puxar indicação de quem realmente vai ficar.

export default function OnboardingModal({ link, onClose }) {
  const [copied, setCopied] = useState(false);

  const msg = `Ei! Tô participando do Rank Premiado do Leilão NoZap — tem sorteio de produto de verdade todo dia às 20h. Entra no grupo pelo meu link e FICA por lá pra acompanhar, porque só conta quem permanece no grupo 😅 Vale muito a pena!\n${link}`;

  // trava o scroll do fundo + fecha no ESC (mesmo padrão do painel admin da página)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(msg); } catch { /* */ }
    setCopied(true); setTimeout(() => setCopied(false), 3000);
  };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,10,7,.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto"
        style={{ maxHeight: 'calc(100dvh - 32px)', background: 'linear-gradient(180deg,#0f3d2e,#071b14)', border: '1px solid rgba(245,196,81,.4)' }}
      >
        <div className="text-center mb-5">
          <span className="inline-grid place-items-center w-16 h-16 rounded-2xl mb-3" style={{ background: 'rgba(245,196,81,.14)', border: '1px solid rgba(245,196,81,.4)' }}>
            <Trophy className="w-8 h-8 text-yellow-300" />
          </span>
          <h2 className="text-2xl font-black text-white">Seu link foi gerado!</h2>
          <p className="text-green-300/80 text-sm mt-1.5">Mas antes de sair divulgando, leia isso 👇</p>
        </div>

        <div className="rounded-2xl p-4 mb-5" style={{ background: 'rgba(245,196,81,.1)', border: '1px solid rgba(245,196,81,.35)' }}>
          <p className="text-yellow-300 font-black text-sm mb-1.5 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> REGRA IMPORTANTE</p>
          <p className="text-white text-sm leading-relaxed">
            Só conta quem <b>fica no grupo</b>. Indicação de quem entra e sai não te leva ao prêmio —
            chame quem realmente quer participar dos sorteios!
          </p>
        </div>

        <p className="text-green-200/90 text-xs font-bold uppercase tracking-wide mb-2">Mensagem pronta pra mandar:</p>
        <div className="rounded-xl p-3.5 text-green-100/90 text-sm leading-relaxed whitespace-pre-wrap break-words mb-4" style={{ background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.12)' }}>
          {msg}
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <button onClick={whatsapp} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[#052e16] transition-transform active:scale-[.97]" style={{ background: '#25D366' }}>
            <MessageCircle className="w-4 h-4" /> Enviar no Zap
          </button>
          <button onClick={copy} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold border transition-transform active:scale-[.97]" style={copied ? { background: 'rgba(34,197,94,.25)', borderColor: 'rgba(34,197,94,.6)', color: '#86efac' } : { background: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.18)', color: '#fff' }}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copiado!' : 'Copiar Mensagem'}
          </button>
        </div>

        <button onClick={onClose} className="w-full py-3 text-green-300/70 hover:text-white text-sm font-semibold transition-colors">
          Entendi, ver meu ranking →
        </button>
      </div>
    </div>
  );
}
