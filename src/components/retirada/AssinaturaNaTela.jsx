import React, { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';

// ✍️ A assinatura com o dedo (ou mouse) — 30/09/2026, retirada digital.
// Traço preto em fundo branco (é o que vai pro comprovante impresso). Devolve
// um PNG em base64 por onChange, ou null quando limpa.
export default function AssinaturaNaTela({ onChange, altura = 170 }) {
  const tela = useRef(null);
  const desenhando = useRef(false);
  const ultimo = useRef(null);
  const [vazia, setVazia] = useState(true);

  useEffect(() => {
    const c = tela.current; if (!c) return;
    const ajustar = () => {
      const r = c.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(r.width * dpr); c.height = Math.round(altura * dpr);
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, r.width, altura);
      ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111827';
      setVazia(true); onChange?.(null);
    };
    ajustar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [altura]);

  const ponto = (e) => { const r = tela.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const inicio = (e) => { e.preventDefault(); tela.current.setPointerCapture?.(e.pointerId); desenhando.current = true; ultimo.current = ponto(e); };
  const move = (e) => {
    if (!desenhando.current) return;
    const ctx = tela.current.getContext('2d'); const p = ponto(e);
    ctx.beginPath(); ctx.moveTo(ultimo.current.x, ultimo.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    ultimo.current = p; if (vazia) setVazia(false);
  };
  const fim = () => {
    if (!desenhando.current) return;
    desenhando.current = false;
    if (!vazia) onChange?.(tela.current.toDataURL('image/png'));
  };
  const limpar = () => {
    const c = tela.current; const ctx = c.getContext('2d'); const r = c.getBoundingClientRect();
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, r.width, altura); setVazia(true); onChange?.(null);
  };

  return (
    <div>
      <div className="relative rounded-lg border border-gray-600 overflow-hidden bg-white" style={{ height: altura }}>
        <canvas ref={tela} data-teste="assinatura" className="block w-full touch-none cursor-crosshair" style={{ height: altura }}
          onPointerDown={inicio} onPointerMove={move} onPointerUp={fim} onPointerLeave={fim} onPointerCancel={fim} />
        {vazia && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">Assine aqui com o dedo</span>}
        <span className="pointer-events-none absolute left-4 right-4 bottom-8 border-b border-dashed border-gray-300" />
      </div>
      <button type="button" onClick={limpar} className="mt-1.5 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white"><Eraser className="w-3.5 h-3.5" /> Limpar assinatura</button>
    </div>
  );
}
