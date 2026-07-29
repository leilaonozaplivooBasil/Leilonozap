import React, { useEffect, useState } from 'react';
import { Radio, Play, Eye } from 'lucide-react';

// Card 16:9 da Livoo Live no topo do Rank Premiado.
// Detecta sozinho quando o perfil da Leilão NoZap entra ao vivo em livoolive.com.br —
// não depende do admin marcar nada: pergunta a cada 30s pro backend, que lê o status
// real do perfil na Livoo. Quando entra ao vivo, o card acende e libera o "assistir".
const ENDPOINT = '/api/functions/livooPerfilLive';
const PERFIL = 'https://livoolive.com.br/perfil';
const POLL_MS = 30_000;

// Identidade Livoo Live — rosa #E91E83 → laranja #ff6b35 (a mesma do app da Livoo).
const LIVOO_GRAD = 'linear-gradient(135deg,#E91E83,#ff6b35)';

export default function LivooLiveCard({ audiencia = 0, produto = null, compact = false }) {
  const [status, setStatus] = useState({ live: false, url: PERFIL, titulo: null, thumb: null });

  useEffect(() => {
    let vivo = true;
    const checar = async () => {
      try {
        const r = await fetch(ENDPOINT, { cache: 'no-store' });
        const j = await r.json();
        if (vivo && j) setStatus((s) => ({ ...s, ...j }));
      } catch { /* rede caiu: mantém o último estado conhecido */ }
    };
    checar();
    const t = setInterval(checar, POLL_MS);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  const { live } = status;
  const destino = status.url || PERFIL;

  // Compact mode: card menor pro lado do hero — sem vídeo 16:9, só status + horário + botão
  if (compact) {
    return (
      <div
        className="rounded-2xl overflow-hidden h-full flex flex-col"
        style={{
          border: live ? '1px solid rgba(233,30,131,.6)' : '1px solid rgba(233,30,131,.3)',
          background: 'linear-gradient(135deg,rgba(233,30,131,.16),rgba(255,107,53,.08)), #160510',
          boxShadow: live ? '0 8px 32px rgba(233,30,131,.25)' : 'none',
        }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg grid place-items-center text-white" style={{ background: LIVOO_GRAD, boxShadow: '0 4px 12px rgba(233,30,131,.5)' }}>
              <Radio className="w-4 h-4" />
            </span>
            <b className="text-sm tracking-wide">Livoo <span style={{ color: '#E91E83' }}>Live</span></b>
          </div>
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1"
            style={live
              ? { background: 'rgba(233,30,131,.95)', color: '#fff' }
              : { background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.12)' }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-white animate-pulse' : ''}`} style={live ? {} : { background: 'rgba(255,255,255,.35)' }} />
            {live ? 'AO VIVO' : 'OFFLINE'}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-5 text-center">
          <span className="inline-grid place-items-center w-14 h-14 rounded-2xl mb-3" style={{ background: 'rgba(233,30,131,.14)', color: '#E91E83' }}>
            <Radio className="w-7 h-7" />
          </span>
          <p className="font-bold text-sm text-white/90">Live todo dia às <span style={{ color: '#E91E83' }}>18h</span></p>
          <p className="text-[11px] text-pink-100/60 mt-1.5 leading-tight">É na live que sai o sorteio do prêmio. Entre pra receber!</p>
        </div>

        <a
          href={destino}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 py-3 font-black text-white text-sm transition-transform active:scale-[.98]"
          style={{ background: LIVOO_GRAD }}
        >
          <Radio className="w-4 h-4" /> {live ? 'Assistir agora' : 'Ir pra live'}
        </a>
      </div>
    );
  }

  return (
    <div
      className="mt-4 rounded-2xl overflow-hidden"
      style={{
        border: live ? '1px solid rgba(233,30,131,.6)' : '1px solid rgba(233,30,131,.3)',
        background: 'linear-gradient(135deg,rgba(233,30,131,.16),rgba(255,107,53,.08)), #160510',
        boxShadow: live ? '0 8px 32px rgba(233,30,131,.25)' : 'none',
      }}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg grid place-items-center text-white" style={{ background: LIVOO_GRAD, boxShadow: '0 4px 12px rgba(233,30,131,.5)' }}>
            <Radio className="w-4 h-4" />
          </span>
          <b className="text-sm tracking-wide">Livoo <span style={{ color: '#E91E83' }}>Live</span></b>
        </div>
        <span
          className="text-[11px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
          style={live
            ? { background: 'rgba(233,30,131,.95)', color: '#fff' }
            : { background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.12)' }}
        >
          <span className={`w-2 h-2 rounded-full ${live ? 'bg-white animate-pulse' : ''}`} style={live ? {} : { background: 'rgba(255,255,255,.35)' }} />
          {live ? 'AO VIVO' : 'OFFLINE'}
        </span>
      </div>

      {/* Área 16:9 — é onde a transmissão aparece quando o perfil entra ao vivo */}
      <a
        href={destino}
        target="_blank"
        rel="noreferrer"
        className="relative block"
        style={{ aspectRatio: '16/9', background: 'radial-gradient(60% 60% at 50% 40%, #3a0f28, #160510)' }}
      >
        {status.thumb && (
          <img src={status.thumb} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: live ? 0.55 : 0.25 }} />
        )}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(50% 50% at 50% 45%, rgba(233,30,131,.28), transparent 70%)' }} />

        <div className="absolute inset-0 grid place-items-center">
          {live ? (
            <span className="relative w-16 h-16 rounded-full grid place-items-center text-white animate-pulse" style={{ background: LIVOO_GRAD, boxShadow: '0 10px 30px rgba(233,30,131,.6)' }}>
              <Play className="w-7 h-7 ml-1" fill="currentColor" />
            </span>
          ) : (
            <div className="text-center px-6">
              <span className="inline-grid place-items-center w-12 h-12 rounded-2xl mb-2" style={{ background: 'rgba(233,30,131,.14)', color: '#E91E83' }}>
                <Radio className="w-6 h-6" />
              </span>
              <p className="font-bold text-sm text-white/90">Nenhuma live agora</p>
              <p className="text-[12px] text-pink-100/60 mt-0.5">Quando a Leilão NoZap entrar ao vivo, aparece aqui automaticamente.</p>
            </div>
          )}
        </div>

        {live && audiencia > 0 && (
          <span className="absolute top-2.5 right-3 text-[11px] font-bold text-white px-2.5 py-1 rounded-full inline-flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,.45)' }}>
            <Eye className="w-3.5 h-3.5" /> {audiencia} assistindo
          </span>
        )}
        {live && (status.titulo || produto) && (
          <div className="absolute bottom-3 left-3.5 right-3.5">
            <span className="inline-flex items-center gap-2 text-white text-xs font-bold px-3 py-1.5 rounded-xl max-w-full truncate" style={{ background: 'rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.15)' }}>
              {produto || status.titulo}
            </span>
          </div>
        )}
      </a>

      {live && (
        <a href={destino} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-3.5 font-black text-white" style={{ background: LIVOO_GRAD }}>
          <Radio className="w-5 h-5" /> Assistir ao vivo na Livoo
        </a>
      )}
    </div>
  );
}