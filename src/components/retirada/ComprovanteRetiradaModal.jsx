import React, { useEffect, useState } from 'react';
import { X, Loader2, Printer, CheckCircle } from 'lucide-react';
import { plataforma } from '@/api/plataformaClient';
import { quandoRetirou } from '@/lib/retirada';

// 🧾 O COMPROVANTE DA RETIRADA — 30/09/2026. Mesmo papel da folha assinada,
// com local, hora, quem entregou, quem retirou, o termo e a assinatura. Abre
// pra equipe (tela de pedidos) e pro comprador (Meus Pedidos). "Imprimir"
// abre uma folha limpa, que o navegador salva em PDF.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function linhas(c) {
  return [
    ['Pedido', `#${c.pedido}`],
    ['Produto', c.produto],
    ['Comprador', c.comprador],
    ['Retirado em', quandoRetirou(c.retirado_em)],
    ['Local', c.localRotulo],
    ['Quem retirou', c.quem === 'terceiro' ? `${c.terceiro_nome} (doc. final ${c.terceiro_doc4}), em nome do comprador` : 'O próprio comprador'],
    ['Código de retirada', c.com_codigo ? 'Conferido' : `Sem código — ${c.motivo_sem_codigo || ''}`],
    ['Entregue por', c.atendente_nome || '—'],
  ];
}

function imprimir(c) {
  const w = window.open('', '_blank', 'width=720,height=900');
  if (!w) return;
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Comprovante de retirada #${esc(c.pedido)}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:32px}h1{font-size:20px;margin:0 0 4px}p.s{color:#6b7280;font-size:12px;margin:0 0 18px}
table{border-collapse:collapse;width:100%;font-size:13px}td{padding:7px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top}td:first-child{color:#6b7280;width:34%}
.termo{margin:18px 0 8px;font-size:13px;line-height:1.55;border:1px solid #e5e7eb;border-radius:8px;padding:12px}
img.a{display:block;max-width:340px;height:auto;border-bottom:1px solid #111827;margin-top:8px}.f{font-size:11px;color:#6b7280;margin-top:22px}</style></head><body>
<h1>Comprovante de retirada</h1><p class="s">Leilão NoZap · termo ${esc(c.termo_versao)}</p>
<table>${linhas(c).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
<div class="termo">${esc(c.termo_texto)}</div>
<img class="a" src="${esc(c.assinatura)}" alt="Assinatura"><div style="font-size:12px;margin-top:4px">Assinatura de quem retirou</div>
${c.foto_url ? `<p style="font-size:12px;margin-top:14px">Foto do produto entregue: ${esc(c.foto_url)}</p>` : ''}
<p class="f">Registrado digitalmente em ${esc(quandoRetirou(c.retirado_em))}.</p>
<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

export default function ComprovanteRetiradaModal({ saleId, onFechar }) {
  const [c, setC] = useState(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    let vivo = true;
    plataforma.functions.invoke('retiradaNaLoja', { acao: 'ver', saleId })
      .then((r) => { if (!vivo) return; if (r?.success) setC(r.comprovante); else setErro(r?.error || 'Não foi possível abrir o comprovante'); })
      .catch(() => vivo && setErro('Sem conexão — tente de novo'));
    return () => { vivo = false; };
  }, [saleId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4">
      <div data-teste="comprovante-retirada" className="w-full sm:max-w-lg max-h-[95vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white text-gray-900">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-700" />
            <p className="text-lg font-bold">Comprovante de retirada</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="text-gray-500 hover:text-gray-900"><X className="w-5 h-5" /></button>
        </div>
        {!c && !erro && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-700" /></div>}
        {erro && <p className="px-5 py-8 text-center text-sm text-gray-600">{erro}</p>}
        {c && (
          <div className="px-5 py-4 space-y-4">
            <dl className="divide-y divide-gray-100 text-sm">
              {linhas(c).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[38%_1fr] gap-3 py-2"><dt className="text-gray-500">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
            <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed">{c.termo_texto}</p>
            <div>
              <img src={c.assinatura} alt="Assinatura de quem retirou" className="w-full max-w-sm rounded-lg border border-gray-200" />
              <p className="mt-1 text-xs text-gray-500">Assinatura de quem retirou</p>
            </div>
            {c.foto_url && <a href={c.foto_url} target="_blank" rel="noreferrer"><img src={c.foto_url} alt="Produto entregue" className="h-24 w-24 rounded-lg object-cover border border-gray-200" /></a>}
            <button type="button" onClick={() => imprimir(c)} className="w-full min-h-[44px] rounded-xl border border-gray-300 hover:bg-gray-50 font-semibold flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> Imprimir ou salvar em PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
