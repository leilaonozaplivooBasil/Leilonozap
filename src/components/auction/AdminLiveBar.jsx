import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pause, Play, Square, Loader2, ShieldCheck } from 'lucide-react';

const Auction = base44.entities.Auction;

/**
 * Barra de controle do ADMIN dentro da sala de leilão: pausar/retomar, estender
 * tempo e encerrar sem sair da transmissão. Toasts e modal próprios — nunca
 * diálogos nativos do navegador.
 */
export default function AdminLiveBar({ auction, setAuction }) {
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  // Recolhida por padrão: só um escudo discreto no canto — os controles abrem ao tocar
  const [open, setOpen] = useState(false);

  if (!auction || (auction.status !== 'active' && auction.status !== 'paused')) return null;

  const notifyOk = (title, description) => toast({ title, description, duration: 1000 });
  const notifyErr = (title) => toast({ title, variant: 'destructive', duration: 2500 });

  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      console.error('[AdminLiveBar]', e);
      notifyErr('Não foi possível concluir a ação');
    } finally {
      setBusy(false);
    }
  };

  // instante da pausa fica em raw_base44.pause_meta (mesma convenção do EditAuction)
  const lerRaw = async () => {
    const { data } = await supabase.from('auctions').select('raw_base44').eq('id', auction.id).maybeSingle();
    return data?.raw_base44 && typeof data.raw_base44 === 'object' ? data.raw_base44 : {};
  };

  const estender = (min) => run(async () => {
    const base = Math.max(Date.now(), new Date(auction.end_time).getTime());
    const novoEnd = new Date(base + min * 60000).toISOString();
    await Auction.update(auction.id, { end_time: novoEnd, status: 'active' });
    setAuction((prev) => ({ ...prev, end_time: novoEnd, status: 'active' }));
    notifyOk(`+${min} min no relógio`);
  });

  const pausar = () => run(async () => {
    const raw = await lerRaw();
    await Auction.update(auction.id, {
      status: 'paused',
      raw_base44: { ...raw, pause_meta: { paused_at: new Date().toISOString(), end_time: auction.end_time } },
    });
    setAuction((prev) => ({ ...prev, status: 'paused' }));
    notifyOk('Leilão pausado', 'Tempo restante congelado.');
  });

  const retomar = () => run(async () => {
    const raw = await lerRaw();
    const meta = raw.pause_meta;
    let novoEnd;
    if (meta?.paused_at && meta?.end_time) {
      const restanteMs = Math.max(60000, new Date(meta.end_time).getTime() - new Date(meta.paused_at).getTime());
      novoEnd = new Date(Date.now() + restanteMs).toISOString();
    } else {
      novoEnd = new Date(Date.now() + 720 * 60000).toISOString();
    }
    delete raw.pause_meta;
    await Auction.update(auction.id, { status: 'active', end_time: novoEnd, raw_base44: raw });
    setAuction((prev) => ({ ...prev, status: 'active', end_time: novoEnd }));
    notifyOk('Leilão retomado');
  });

  const encerrar = () => run(async () => {
    const agora = new Date().toISOString();
    await Auction.update(auction.id, { status: 'ended', end_time: agora });
    setAuction((prev) => ({ ...prev, status: 'ended', end_time: agora }));
    setConfirmEnd(false);
    notifyOk('Leilão encerrado');
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Controles do leilão (admin)"
        className="fixed z-[60] w-9 h-9 rounded-full border border-white/10 grid place-items-center text-emerald-400/80 hover:text-emerald-300 hover:border-emerald-500/40 transition-colors"
        style={{
          top: 'calc(env(safe-area-inset-top) + 76px)',
          right: '12px',
          background: 'rgba(10,14,20,0.6)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <ShieldCheck className="w-4 h-4" />
      </button>
    );
  }

  return (
    <>
      <div
        className="fixed z-[60] flex items-center gap-1.5 px-2 py-1.5 rounded-2xl border border-white/10"
        style={{
          top: 'calc(env(safe-area-inset-top) + 72px)',
          right: '12px',
          background: 'rgba(10,14,20,0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Recolher controles"
          className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-slate-500 font-bold px-1.5 hover:text-white transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> <span className="hidden sm:inline">Admin</span>
        </button>
        {auction.status === 'active' ? (
          <button onClick={pausar} disabled={busy} title="Pausar leilão" className="h-9 px-3 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-black transition-colors flex items-center gap-1.5">
            <Pause className="w-3.5 h-3.5" /> Pausar
          </button>
        ) : (
          <button onClick={retomar} disabled={busy} title="Retomar leilão" className="h-9 px-3 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5" /> Retomar
          </button>
        )}
        <button onClick={() => estender(1)} disabled={busy || auction.status !== 'active'} className="h-9 px-3 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-slate-200 hover:border-emerald-500/60 disabled:opacity-40 transition-colors">
          +1min
        </button>
        <button onClick={() => estender(5)} disabled={busy || auction.status !== 'active'} className="h-9 px-3 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-slate-200 hover:border-emerald-500/60 disabled:opacity-40 transition-colors">
          +5min
        </button>
        <button onClick={() => setConfirmEnd(true)} disabled={busy} title="Encerrar leilão" className="h-9 px-3 rounded-xl text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors flex items-center gap-1.5">
          <Square className="w-3.5 h-3.5" /> Encerrar
        </button>
        {busy && <Loader2 className="w-4 h-4 animate-spin text-slate-400 mx-1" />}
      </div>

      <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <DialogContent className="bg-[#161b22] border-[#30363d] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-rose-400">Encerrar o leilão agora?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-300">O leilão sai do ar imediatamente. Dá para reativar depois pelo editor.</p>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1 bg-transparent border-[#30363d] text-slate-300 hover:bg-[#30363d] hover:text-white" onClick={() => setConfirmEnd(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={encerrar}>
              Sim, encerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
