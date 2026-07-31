import React, { useRef, useState } from 'react';
import { MessageCircle, Camera, Copy, Check } from 'lucide-react';
import logoNozap from '@/assets/leilao-nozap-logo.png';

// FEATURE 2 — Compartilhamento com imagem (canvas 1080x1080).
// Gera um story personalizado (logo + nome + posição + prêmio + link) na identidade
// verde/dourado do Rank Premiado. No celular tenta o Web Share nativo (vai direto
// pro status/WhatsApp); sem suporte, baixa o PNG.

const ordinal = (n) => (n ? `${n}º` : '—');

function loadImg(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function drawStory(canvas, { nome, posicao, premio, link }) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  canvas.width = 1080; canvas.height = 1080;

  // fundo: mesmo radial verde da página
  const grad = ctx.createLinearGradient(0, 0, 0, 1080);
  grad.addColorStop(0, '#0f3d2e'); grad.addColorStop(0.5, '#071b14'); grad.addColorStop(1, '#05100c');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1080);
  const glow = ctx.createRadialGradient(540, 200, 60, 540, 200, 700);
  glow.addColorStop(0, 'rgba(245,196,81,.16)'); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 1080);

  // moldura dourada
  ctx.strokeStyle = '#f5c451'; ctx.lineWidth = 10; ctx.strokeRect(28, 28, 1024, 1024);

  // logo
  const logo = await loadImg(logoNozap);
  if (logo) {
    const w = 240, h = (logo.height / logo.width) * w;
    ctx.drawImage(logo, 540 - w / 2, 70, w, h);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff'; ctx.font = '800 46px system-ui, sans-serif';
  ctx.fillText('LEILÃO NOZAP', 540, 380);
  ctx.fillStyle = '#f5c451'; ctx.font = '900 74px system-ui, sans-serif';
  ctx.fillText('RANK PREMIADO', 540, 465);

  ctx.fillStyle = '#ffffff'; ctx.font = '900 64px system-ui, sans-serif';
  ctx.fillText((nome || 'PARTICIPANTE').toUpperCase().slice(0, 24), 540, 590);

  ctx.fillStyle = '#22c55e'; ctx.font = '700 38px system-ui, sans-serif';
  ctx.fillText('POSIÇÃO ATUAL NO RANKING', 540, 660);
  ctx.fillStyle = '#f5c451'; ctx.font = '900 130px system-ui, sans-serif';
  ctx.fillText(`${ordinal(posicao)} LUGAR`, 540, 790);

  if (premio) {
    ctx.fillStyle = '#ffffff'; ctx.font = '900 48px system-ui, sans-serif';
    ctx.fillText(premio.toUpperCase().slice(0, 30), 540, 890);
    ctx.fillStyle = '#22c55e'; ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillText('É O PRÊMIO DE HOJE — ENTRA PELO MEU LINK!', 540, 940);
  } else {
    ctx.fillStyle = '#22c55e'; ctx.font = '700 34px system-ui, sans-serif';
    ctx.fillText('TEM PRÊMIO TODO DIA — ENTRA PELO MEU LINK!', 540, 900);
  }

  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '600 28px system-ui, sans-serif';
  ctx.fillText(String(link || '').replace(/^https?:\/\//, ''), 540, 1005);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export default function ShareSection({ nome, posicao, premio, link, groupLink, onCopied, onShare }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const texto = `🏆 Tô em ${ordinal(posicao)} no Rank Premiado do Leilão NoZap! Tem sorteio de prêmio todo dia. Entra pelo meu link e me ajuda a subir:\n\n1º link grupo de whatsapp\n${groupLink || link}\n\n2º link ranking premiado\n⚠️ Importante: precisa permanecer no grupo. Se sair, será descontado do número de pessoas indicadas.\n${link}`;

  // WhatsApp: usa onShare do parent (3 níveis com imagem do produto) se disponível,
  // senão cai no wa.me texto (fallback). NUNCA manda só texto quando tem imagem.
  const whatsapp = async () => {
    if (onShare) { await onShare(); return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const story = async () => {
    if (!canvasRef.current || generating) return;
    setGenerating(true);
    try {
      const blob = await drawStory(canvasRef.current, { nome, posicao, premio, link });
      if (!blob) return;
      const file = new File([blob], 'rank-premiado-nozap.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], text: texto }); return; } catch { /* cancelou → cai pro download */ }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = 'rank-premiado-nozap.png'; a.href = url; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally { setGenerating(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch { /* */ }
    setCopied(true); onCopied?.(); setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,.045)', border: '1px solid rgba(245,196,81,.26)' }}>
      <p className="font-black text-center mb-3">Compartilhe e suba de posição!</p>
      <canvas ref={canvasRef} className="hidden" />
      <div className="grid grid-cols-3 gap-2">
        <button onClick={whatsapp} className="flex flex-col items-center gap-1 py-3 rounded-xl font-bold text-[#052e16] transition-transform active:scale-[.96]" style={{ background: '#25D366' }}>
          <MessageCircle className="w-5 h-5" /><span className="text-[11px]">WhatsApp</span>
        </button>
        <button onClick={story} disabled={generating} className="flex flex-col items-center gap-1 py-3 rounded-xl font-bold text-[#1a1205] transition-transform active:scale-[.96] disabled:opacity-60" style={{ background: 'linear-gradient(90deg,#f5c451,#e0a920)' }}>
          <Camera className="w-5 h-5" /><span className="text-[11px]">{generating ? 'Gerando…' : 'Baixar Story'}</span>
        </button>
        <button onClick={copy} className="flex flex-col items-center gap-1 py-3 rounded-xl font-bold border transition-transform active:scale-[.96]" style={copied ? { background: 'rgba(34,197,94,.25)', borderColor: 'rgba(34,197,94,.6)', color: '#86efac' } : { background: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.15)', color: '#fff' }}>
          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}<span className="text-[11px]">{copied ? 'Copiado!' : 'Copiar Link'}</span>
        </button>
      </div>
      <p className="text-[10px] text-green-300/50 text-center mt-2.5">O story sai pronto com seu nome e sua posição — poste no status e colha indicações.</p>
    </div>
  );
}