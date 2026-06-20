import React from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { StarPicker } from './StarRating';

const LABELS = { 1: 'Péssimo', 2: 'Ruim', 3: 'Ok', 4: 'Bom', 5: 'Excelente!' };

// Modal pro cliente avaliar o lojista com estrelas (1-5) + comentário opcional.
export default function AvaliarLojistaModal({ order, buyer, onClose, onDone }) {
  const [stars, setStars] = React.useState(order?.minha_avaliacao?.stars || 0);
  const [comment, setComment] = React.useState(order?.minha_avaliacao?.comment || '');
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  const enviar = async () => {
    if (!stars) { setErr('Escolha de 1 a 5 estrelas.'); return; }
    setSaving(true); setErr('');
    try {
      const r = await base44.functions.invoke('rateSeller', {
        buyer_id: buyer?.id, sale_id: order.id, stars, comment: comment.trim() || null,
      });
      if (!r?.success) { setErr(r?.error || 'Não foi possível enviar.'); setSaving(false); return; }
      onDone?.({ saleId: order.id, stars, comment: comment.trim(), resumo: r.resumo });
    } catch (e) {
      setErr('Erro ao enviar. Tente de novo.'); setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f1623] border border-gray-700 rounded-2xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
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

        {err && <p className="text-red-400 text-xs mt-2">{err}</p>}

        <button
          onClick={enviar}
          disabled={saving}
          className="w-full mt-4 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-500 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Enviando…' : 'Enviar avaliação'}
        </button>
      </div>
    </div>
  );
}
