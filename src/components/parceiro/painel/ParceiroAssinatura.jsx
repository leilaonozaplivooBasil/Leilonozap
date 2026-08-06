import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

// ✍️ Assinatura desenhada (dedo no celular / mouse no desktop).
// Devolve a assinatura em PNG (dataURL) para o registro de aceite eletrônico.
export default function ParceiroAssinatura({ nome, onConfirmar, onCancelar, salvando }) {
  const canvasRef = useRef(null);
  const desenhando = useRef(false);
  const [temTraco, setTemTraco] = useState(false);

  const ponto = (e) => {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return {
      x: ((t.clientX - r.left) / r.width) * canvas.width,
      y: ((t.clientY - r.top) / r.height) * canvas.height,
    };
  };

  const iniciar = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = ponto(e);
    ctx.strokeStyle = '#0A0A0B';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    desenhando.current = true;
    setTemTraco(true);
  };

  const mover = (e) => {
    if (!desenhando.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = ponto(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const parar = () => { desenhando.current = false; };

  const limpar = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setTemTraco(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Assinatura eletrônica</p>
        <h3 className="mt-1 text-lg font-bold text-pc-tinta">Assine com o dedo ou o mouse</h3>
        <p className="mt-1 text-xs leading-relaxed text-pc-tinta-fraca">
          {nome ? `Assinando como ${nome}. ` : ''}
          Ao confirmar, registramos data e hora do servidor, seu IP, o dispositivo e o
          código de verificação do documento, nos termos da Lei nº 14.063/2020 e da
          MP nº 2.200-2/2001.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="h-40 w-full touch-none rounded-md border border-pc-borda bg-white"
        onMouseDown={iniciar}
        onMouseMove={mover}
        onMouseUp={parar}
        onMouseLeave={parar}
        onTouchStart={iniciar}
        onTouchMove={mover}
        onTouchEnd={parar}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={limpar}
          variant="outline"
          className="min-h-[48px] flex-1 border-pc-borda bg-transparent text-pc-tinta-fraca hover:bg-pc-preto-2"
        >
          Limpar
        </Button>
        <Button
          type="button"
          onClick={onCancelar}
          variant="outline"
          className="min-h-[48px] flex-1 border-pc-borda bg-transparent text-pc-tinta-fraca hover:bg-pc-preto-2"
        >
          Voltar
        </Button>
        <Button
          type="button"
          disabled={!temTraco || salvando}
          onClick={() => onConfirmar(canvasRef.current.toDataURL('image/png'))}
          className="min-h-[48px] flex-1 bg-pc-ouro font-semibold text-pc-preto hover:bg-pc-ouro-claro disabled:opacity-50"
        >
          {salvando ? 'Registrando...' : 'Confirmar assinatura'}
        </Button>
      </div>
    </div>
  );
}