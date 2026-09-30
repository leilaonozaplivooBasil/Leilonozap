import React, { useEffect, useState } from 'react';
import { KeyRound, CheckCircle } from 'lucide-react';
import { plataforma } from '@/api/plataformaClient';
import { codigoFormatado, quandoRetirou } from '@/lib/retirada';
import ComprovanteRetiradaModal from '@/components/retirada/ComprovanteRetiradaModal';

// 📦 No pedido do CLIENTE (Meus Pedidos) — 30/09/2026. Pedido com retirada pago:
// mostra o código pra falar no balcão. Já retirado: onde, quando, e o comprovante.
// Uma consulta só pra todos os cartões da tela (cache do módulo).
let consulta = null;
function meusPedidosDeRetirada() {
  if (!consulta) {
    consulta = plataforma.functions.invoke('retiradaNaLoja', { acao: 'meus' })
      .then((r) => Object.fromEntries((r?.success ? r.pedidos : []).map((p) => [p.saleId, p])))
      .catch(() => { consulta = null; return {}; });
  }
  return consulta;
}
export const esquecerRetiradas = () => { consulta = null; };

export default function CodigoDeRetirada({ saleId }) {
  const [info, setInfo] = useState(null);
  const [comprovante, setComprovante] = useState(false);
  useEffect(() => { let vivo = true; meusPedidosDeRetirada().then((m) => vivo && setInfo(m[saleId] || null)); return () => { vivo = false; }; }, [saleId]);
  if (!info) return null;
  if (info.retirado) {
    return (
      <div data-teste="retirada-feita" className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-green-700/40 bg-green-900/20 px-3 py-2.5">
        <p className="text-sm text-gray-200 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400 shrink-0" />Retirado em {quandoRetirou(info.retiradoEm)} · {info.local}</p>
        <button type="button" onClick={() => setComprovante(true)} className="shrink-0 text-xs font-semibold text-green-400 hover:underline">Comprovante</button>
        {comprovante && <ComprovanteRetiradaModal saleId={saleId} onFechar={() => setComprovante(false)} />}
      </div>
    );
  }
  return (
    <div data-teste="codigo-de-retirada" className="mt-3 rounded-lg border border-green-700/40 bg-green-900/20 px-3 py-2.5">
      <p className="text-xs text-gray-300 flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5 text-green-400" />Código de retirada</p>
      <p className="mt-0.5 font-mono text-2xl font-bold tracking-[0.25em] text-white">{codigoFormatado(info.codigo)}</p>
      <p className="text-xs text-gray-400">Mostre este código no balcão na hora de retirar. Se outra pessoa for retirar por você, passe o código para ela.</p>
    </div>
  );
}
