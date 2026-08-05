import React, { useState } from 'react';
import { RefreshCw, Loader2, PackageX } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import PixNovoModal from '@/components/catalog/PixNovoModal';

// 💳 "Pagar novamente" — coração da recuperação de venda.
// Gera um código PIX NOVO para o MESMO pedido (nunca cria um segundo pedido).
// O valor é sempre recalculado no servidor a partir do que já está gravado.
export default function PagarNovamenteBotao({ order }) {
  const [carregando, setCarregando] = useState(false);
  const [pix, setPix] = useState(null);
  const [esgotado, setEsgotado] = useState(false);

  const gerar = async (e) => {
    e.stopPropagation();
    if (carregando) return; // clique repetido não gera duas cobranças
    setCarregando(true);
    try {
      const uid = order.buyer_id || JSON.parse(localStorage.getItem('currentUser') || '{}')?.id;
      const r = await base44.functions.invoke('regerarPixPedido', { sale_id: order.id, user_id: uid });

      if (r?.success) {
        setPix(r);
      } else if (r?.out_of_stock) {
        setEsgotado(true);
        toast.error(r.error);
      } else if (r?.error === 'not_implemented' || r?.error === 'network_or_not_implemented') {
        toast.error('Disponível somente no site publicado.');
      } else {
        toast.error(r?.error || 'Não foi possível gerar o código agora.');
      }
    } catch (err) {
      toast.error('Não foi possível gerar o código agora.');
    } finally {
      setCarregando(false);
    }
  };

  if (esgotado) {
    return (
      <div className="mx-4 mb-4 flex items-center justify-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-300">
        <PackageX className="h-4 w-4" /> Produto esgotou
      </div>
    );
  }

  return (
    <>
      <button
        onClick={gerar}
        disabled={carregando}
        className="mx-4 mb-4 flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-3 py-2.5 text-sm font-bold text-white transition-all hover:from-green-500 hover:to-emerald-500 disabled:opacity-60"
      >
        {carregando
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando…</>
          : <><RefreshCw className="h-4 w-4" /> Pagar agora</>}
      </button>

      {pix && <PixNovoModal dados={pix} onClose={() => setPix(null)} />}
    </>
  );
}