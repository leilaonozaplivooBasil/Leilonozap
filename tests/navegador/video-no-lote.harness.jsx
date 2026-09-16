/**
 * Banca do vídeo no lote — NÃO vai para o bundle da loja.
 *
 * 🎬 Prova no NAVEGADOR o que o código não mostra:
 *   • o vídeo 1:1 ENCAIXA na moldura quadrada da galeria (100% x 100%)
 *   • o autoavanço de 4s PARA no slide de vídeo
 *   • a bolinha do vídeo é diferente das outras
 *
 * A galeria real do AuctionDetails está amarrada a rota, entidade e Layout.
 * Aqui se reproduz EXATAMENTE a mesma moldura e a mesma regra de autoavanço,
 * com as mesmas classes — é o desenho que se está medindo, não o roteador.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { Play } from 'lucide-react';

const foto = (cor) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"><rect width="900" height="900" fill="${cor}"/></svg>`
)}`;
// vídeo 1:1 de verdade (webm minúsculo não existe em data: URI legível, então
// o slide de vídeo aqui é o <video> com um src que não carrega — o que importa
// é a CAIXA que ele ocupa e o relógio que não pode girar)
const VIDEO = { origem: 'arquivo', tipo: 'video', embed: 'data:video/mp4;base64,AAAA' };

function Galeria() {
  const [i, setI] = useState(0);
  const relogio = useRef(null);
  const midias = [
    { tipo: 'foto', url: foto('#e0533f') },
    { tipo: 'foto', url: foto('#4d724b') },
    VIDEO,
  ];
  const total = midias.length;
  const noVideo = i === total - 1;

  useEffect(() => {
    if (total <= 1 || noVideo) return undefined;
    relogio.current = setInterval(() => setI((p) => (p + 1) % total), 4000);
    return () => clearInterval(relogio.current);
  }, [total, noVideo]);

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 16 }}>
      <div className="relative overflow-hidden rounded-2xl aspect-square" style={{ background: '#111827' }} data-teste="moldura-galeria">
        {midias.map((m, idx) => (
          m.tipo === 'video' ? (
            idx === i ? (
              <div key="video" className="absolute inset-0" data-teste="video-do-lote">
                <video src={m.embed} controls preload="metadata" playsInline className="absolute inset-0 w-full h-full object-contain bg-black" />
              </div>
            ) : null
          ) : (
            <img
              key={idx}
              src={m.url}
              alt={`foto ${idx + 1}`}
              data-teste={`foto-${idx}`}
              className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${idx === i ? 'opacity-100' : 'opacity-0'}`}
            />
          )
        ))}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 z-10">
          {midias.map((m, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={m.tipo === 'video' ? 'Ver o vídeo do lote' : `Ver a foto ${idx + 1}`}
              data-teste={m.tipo === 'video' ? 'bolinha-do-video' : `bolinha-foto-${idx}`}
              className={m.tipo === 'video'
                ? `inline-flex items-center gap-1 rounded-full px-2 h-5 text-[10px] font-bold ${idx === i ? 'bg-emerald-400 text-gray-900' : 'bg-white/40 text-gray-900'}`
                : `h-2 rounded-full ${idx === i ? 'bg-emerald-400 w-8' : 'bg-white/40 w-2'}`}
            >
              {m.tipo === 'video' && (<><Play className="w-3 h-3" strokeWidth={3} />vídeo</>)}
            </button>
          ))}
        </div>
      </div>
      <p data-teste="slide-atual" style={{ color: '#9ca3af', fontFamily: 'monospace', marginTop: 8 }}>{i}</p>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Galeria />);
