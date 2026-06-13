import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Radio, X } from 'lucide-react';
import LivooMark from './LivooMark';
const CARGO = { distribuidor: 'Distribuidor', loja_fisica: 'Loja', ponto_retirada: 'Ponto', parceiro: 'Parceiro', licenciado: 'Licenciado', vendedor: 'Vendedor', influenciador: 'Influenciador' };

// Botão global "🔴 Ao vivo agora pela Livoo Live" — mostra quem está transmitindo agora.
// Fica no site e nos painéis. Aparece sempre (com a logo da Livoo); o contador acende quando há lives.
export default function AoVivoAgora({ compact = false }) {
  const [lives, setLives] = useState([]);
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  const load = () => {
    supabase.rpc('livoo_ao_vivo_agora').then(({ data }) => setLives(Array.isArray(data) ? data : [])).catch(() => {});
  };
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const n = lives.length;
  return (
    <div className="relative" ref={box}>
      <button onClick={() => setOpen((s) => !s)} title="Ao vivo agora pela Livoo Live"
        className="inline-flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 font-bold text-white text-[13px] transition"
        style={{ background: n > 0 ? 'linear-gradient(135deg,#E91E83,#ff6b35)' : 'rgba(255,255,255,.08)', border: n > 0 ? 'none' : '1px solid rgba(255,255,255,.15)', boxShadow: n > 0 ? '0 4px 14px rgba(233,30,131,.35)' : 'none' }}>
        {n > 0 ? <Radio className="w-4 h-4 text-white" /> : <LivooMark size={20} />}
        {n > 0 && <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-white opacity-75" /><span className="relative rounded-full h-2 w-2 bg-white" /></span>}
        <span className={n > 0 ? '' : 'text-gray-300'}>{compact ? (n > 0 ? `${n} ao vivo` : 'Ao vivo') : (n > 0 ? `${n} ao vivo agora` : 'Ao vivo na Livoo')}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[#0c1310] border border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800" style={{ background: 'linear-gradient(135deg, rgba(233,30,131,.18), rgba(255,107,53,.1))' }}>
            <div className="flex items-center gap-2 font-bold text-white"><LivooMark size={20} /> Ao vivo agora</div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {n === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500"><Radio className="w-7 h-7 mx-auto mb-2 opacity-40" />Ninguém ao vivo agora.<br /><span className="text-xs">Volte já já — as lives da rede aparecem aqui.</span></div>
            ) : lives.map((l) => (
              <a key={l.id} href={l.embed_url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/60 border-b border-gray-800/50">
                <div className="relative shrink-0"><LivooMark size={36} /><span className="absolute -top-1 -right-1 text-[8px] font-black bg-red-600 text-white px-1 rounded">LIVE</span></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-white">{l.titulo || 'Transmissão ao vivo'}</div>
                  <div className="text-[11px] text-gray-500 truncate">{l.host || '—'} · {CARGO[l.cargo] || l.cargo || ''} · {l.mode === 'auction' ? 'Leilão' : 'Loja'} ao vivo</div>
                </div>
                <span className="text-[11px] font-bold" style={{ color: '#ff8a5c' }}>Assistir →</span>
              </a>
            ))}
          </div>
          <div className="px-4 py-2 text-center text-[10px] text-gray-600 border-t border-gray-800">transmitido pela Livoo Live</div>
        </div>
      )}
    </div>
  );
}
