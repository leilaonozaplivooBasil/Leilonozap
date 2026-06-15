import React from 'react';
import { supabase } from '@/api/supabaseClient';
import { MessageCircle, X, Radio } from 'lucide-react';
import LivooMark from '@/components/livoo/LivooMark';

const SUPORTE_PHONE = '5521984072064';
const CARGO = { distribuidor: 'Distribuidor', loja_fisica: 'Loja', ponto_retirada: 'Ponto', parceiro: 'Parceiro', licenciado: 'Licenciado', vendedor: 'Vendedor', influenciador: 'Influenciador' };

// Botões flutuantes do lado direito da loja: Vendedores ao vivo (Livoo) + Suporte (WhatsApp).
// Ficam acima do botão do Comparai (que é fixo em bottom-5 right-4).
export default function LojaFloatActions() {
  const [lives, setLives] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const load = () => supabase.rpc('livoo_ao_vivo_agora').then(({ data }) => setLives(Array.isArray(data) ? data : [])).catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const n = lives.length;
  const supTxt = encodeURIComponent('Olá! Preciso de ajuda na Loja Leilão NoZap.');

  return (
    <div className="fixed right-4 bottom-32 z-50 flex flex-col items-center gap-4" ref={ref}>
      {/* Vendedores ao vivo (Livoo Live) */}
      <div className="relative flex flex-col items-center">
        <button
          onClick={() => setOpen((s) => !s)}
          title="Vendedores ao vivo pela Livoo Live"
          className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center relative transition-transform hover:scale-110"
          style={{ background: n > 0 ? 'linear-gradient(135deg,#E91E83,#ff6b35)' : '#1f2937', boxShadow: n > 0 ? '0 8px 24px rgba(233,30,131,.45)' : '0 8px 20px rgba(0,0,0,.4)' }}
        >
          <LivooMark size={26} plain className="text-white" />
          {n > 0 && (
            <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">{n}</span>
          )}
        </button>
        <span className="text-[10px] text-gray-300 font-semibold mt-0.5 drop-shadow text-center leading-tight">Ao vivo</span>

        {open && (
          <div className="absolute right-16 bottom-0 w-72 bg-[#0c1310] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800" style={{ background: 'linear-gradient(135deg, rgba(233,30,131,.18), rgba(255,107,53,.1))' }}>
              <span className="flex items-center gap-2 font-bold text-white text-sm"><LivooMark size={18} /> Vendedores ao vivo</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {n === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500"><Radio className="w-7 h-7 mx-auto mb-2 opacity-40" />Ninguém ao vivo agora.<br /><span className="text-xs">As lives da rede aparecem aqui.</span></div>
              ) : lives.map((l) => (
                <a key={l.id} href={l.embed_url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/60 border-b border-gray-800/50">
                  <div className="relative shrink-0"><LivooMark size={34} /><span className="absolute -top-1 -right-1 text-[8px] font-black bg-red-600 text-white px-1 rounded">LIVE</span></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate text-white">{l.titulo || 'Transmissão ao vivo'}</div>
                    <div className="text-[11px] text-gray-500 truncate">{l.host || '—'} · {CARGO[l.cargo] || l.cargo || ''}</div>
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: '#ff8a5c' }}>Assistir →</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suporte (WhatsApp) */}
      <a
        href={`https://wa.me/${SUPORTE_PHONE}?text=${supTxt}`}
        target="_blank"
        rel="noreferrer"
        title="Suporte pelo WhatsApp"
        className="flex flex-col items-center"
      >
        <span className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl flex items-center justify-center transition-transform hover:scale-110" style={{ boxShadow: '0 8px 24px rgba(34,197,94,.45)' }}>
          <MessageCircle className="w-7 h-7 text-white" />
        </span>
        <span className="text-[10px] text-gray-300 font-semibold mt-0.5 drop-shadow">Suporte</span>
      </a>
    </div>
  );
}
