import React from 'react';
import { base44 } from '@/api/base44Client';
import { X, Camera, ImagePlus, Loader2 } from 'lucide-react';
import { StarPicker } from './StarRating';

const LABELS = { 1: 'Péssimo', 2: 'Ruim', 3: 'Ok', 4: 'Bom', 5: 'Excelente!' };

// Comprime a foto no cliente (canvas, máx 1280px, JPEG) pra caber no payload da
// function e subir rápido mesmo no 4G.
async function compressImage(file, maxSize = 1280, quality = 0.82) {
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

// Modal pro cliente avaliar o lojista: estrelas (1-5) + comentário + FOTO do produto
// (anexada da galeria ou tirada na hora pela câmera — pedido Gabriel 25/07).
export default function AvaliarLojistaModal({ order, buyer, onClose, onDone }) {
  const [stars, setStars] = React.useState(order?.minha_avaliacao?.stars || 0);
  const [comment, setComment] = React.useState(order?.minha_avaliacao?.comment || '');
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [photo, setPhoto] = React.useState(null); // dataURL comprimido
  const [photoBusy, setPhotoBusy] = React.useState(false);
  const galleryRef = React.useRef(null);
  const cameraRef = React.useRef(null);

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErr('Escolha uma imagem.'); return; }
    setPhotoBusy(true); setErr('');
    try {
      setPhoto(await compressImage(file));
    } catch (_) {
      setErr('Não consegui ler essa foto. Tente outra.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const enviar = async () => {
    if (!stars) { setErr('Escolha de 1 a 5 estrelas.'); return; }
    setSaving(true); setErr('');
    try {
      const r = await base44.functions.invoke('rateSeller', {
        buyer_id: buyer?.id, sale_id: order.id, stars, comment: comment.trim() || null,
        photo_base64: photo || null,
      });
      if (!r?.success) { setErr(r?.error || 'Não foi possível enviar.'); setSaving(false); return; }
      onDone?.({ saleId: order.id, stars, comment: comment.trim(), photoUrl: r.photo_url || null, resumo: r.resumo });
    } catch (e) {
      setErr('Erro ao enviar. Tente de novo.'); setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f1623] border border-gray-700 rounded-2xl w-full max-w-md p-6 relative max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        <h3 className="text-lg font-bold text-white mb-1">Avaliar o vendedor</h3>
        <p className="text-sm text-gray-400 mb-1 truncate">{order?.product_title}</p>
        <p className="text-xs text-gray-500 mb-4">Sua nota ajuda outros clientes a confiar na loja.</p>

        <div className="flex flex-col items-center gap-2 py-3">
          <StarPicker value={stars} onChange={setStars} size={40} />
          <span className="text-sm font-semibold" style={{ color: stars ? '#facc15' : '#6b7280' }}>{LABELS[stars] || 'Toque nas estrelas'}</span>
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Conte como foi sua experiência (opcional)"
          maxLength={500}
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none mt-2"
        />

        {/* 📸 FOTO DO PRODUTO — anexar da galeria ou tirar na hora */}
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-400 mb-2">📸 Foto do produto recebido (opcional)</p>
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickPhoto} />

          {photo ? (
            <div className="relative inline-block">
              <img src={photo} alt="Foto do produto" className="h-28 w-28 object-cover rounded-xl border border-white/15" />
              <button
                onClick={() => setPhoto(null)}
                aria-label="Remover foto"
                className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white shadow hover:bg-red-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => galleryRef.current?.click()}
                disabled={photoBusy}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold transition-colors disabled:opacity-60"
              >
                {photoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                Anexar foto
              </button>
              <button
                onClick={() => cameraRef.current?.click()}
                disabled={photoBusy}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold transition-colors disabled:opacity-60"
              >
                <Camera className="w-4 h-4" />
                Tirar foto agora
              </button>
            </div>
          )}
        </div>

        {err && <p className="text-red-400 text-xs mt-2">{err}</p>}

        <button
          onClick={enviar}
          disabled={saving || photoBusy}
          className="w-full mt-4 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-500 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Enviando…' : 'Enviar avaliação'}
        </button>
      </div>
    </div>
  );
}
