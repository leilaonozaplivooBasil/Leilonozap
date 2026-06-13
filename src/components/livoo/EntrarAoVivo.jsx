import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Radio, Gavel, ShoppingBag, Loader2, X } from 'lucide-react';

const LIVOO_LOGO = 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/livoo/livoo-logo.png';

// Botão "Entrar ao vivo pela Livoo Live" — para vendedor / distribuidor / influenciador.
// Abre a transmissão na Livoo Live puxando os lotes (leilão) ou produtos já cadastrados.
export default function EntrarAoVivo({ user, variant = 'card' }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');

  const go = async (mode) => {
    if (!user?.id) { toast.error('Faça login.'); return; }
    setBusy(mode);
    try {
      const r = await base44.functions.invoke('livooOpenLive', { actorId: user.id, mode, titulo: '' });
      if (!r?.success) { toast.error(r?.error || 'Não foi possível entrar ao vivo.'); setBusy(''); return; }
      toast.success(`Ao vivo! ${r.sandbox ? '(sandbox)' : ''} ${mode === 'auction' ? r.lots + ' lote(s)' : r.products + ' produto(s)'}`);
      window.open(r.host_url, '_blank', 'noopener');
      setOpen(false);
    } catch { toast.error('Erro ao abrir a live.'); }
    setBusy('');
  };

  const Btn = (
    <button onClick={() => setOpen(true)}
      className="inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 font-bold text-white text-sm"
      style={{ background: 'linear-gradient(135deg,#E91E83,#ff6b35)', boxShadow: '0 6px 20px rgba(233,30,131,.35)' }}>
      <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute h-full w-full rounded-full bg-white opacity-75"></span><span className="relative rounded-full h-2.5 w-2.5 bg-white"></span></span>
      <Radio className="w-4 h-4" /> Entrar ao vivo
    </button>
  );

  return (
    <>
      {variant === 'card' ? (
        <div className="rounded-2xl p-5 mb-6 border" style={{ borderColor: 'rgba(233,30,131,.3)', background: 'linear-gradient(135deg, rgba(233,30,131,.12), rgba(255,107,53,.06))' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img src={LIVOO_LOGO} alt="Livoo Live" className="w-11 h-11 rounded-xl shrink-0" />
              <div>
                <div className="font-extrabold text-white">Transmita ao vivo pela Livoo Live</div>
                <div className="text-[13px] text-gray-300">Leiloe ou venda ao vivo puxando seus lotes e produtos. <span style={{ color: '#ff8a5c' }}>Sua comissão da rede continua 100% igual.</span></div>
              </div>
            </div>
            {Btn}
          </div>
        </div>
      ) : Btn}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-md bg-[#0c1310] border border-gray-800 rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><img src={LIVOO_LOGO} className="w-7 h-7 rounded-lg" /> <b>Entrar ao vivo</b></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-800"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-400 mb-4">Escolha o modo. A transmissão abre na Livoo Live já com o que você cadastrou.</p>
            <div className="grid gap-3">
              <button onClick={() => go('auction')} disabled={busy} className="flex items-center gap-3 p-4 rounded-xl border border-gray-700 hover:border-pink-500/60 text-left disabled:opacity-50">
                <div className="w-10 h-10 rounded-lg bg-pink-500/15 flex items-center justify-center text-pink-300">{busy === 'auction' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Gavel className="w-5 h-5" />}</div>
                <div><div className="font-bold">Leilão ao vivo</div><div className="text-xs text-gray-500">Seus lotes com lances em tempo real.</div></div>
              </button>
              <button onClick={() => go('commerce')} disabled={busy} className="flex items-center gap-3 p-4 rounded-xl border border-gray-700 hover:border-orange-500/60 text-left disabled:opacity-50">
                <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center text-orange-300">{busy === 'commerce' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}</div>
                <div><div className="font-bold">Live commerce</div><div className="text-xs text-gray-500">Venda os produtos do catálogo ao vivo.</div></div>
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-4 text-center">Compra, KYC e saque seguem pela Livoo Live. Sua comissão e plano de carreira continuam pelo Leilão NoZap, do mesmo jeito.</p>
          </div>
        </div>
      )}
    </>
  );
}
