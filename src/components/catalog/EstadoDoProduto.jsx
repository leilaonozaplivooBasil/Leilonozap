import React from 'react';
import { Info, BadgeCheck } from 'lucide-react';
import { rotuloCondicao, resumoCondicao } from '@/lib/condicaoProduto';

// 🏷️ 02/09/2026 — O BLOCO QUE FALTAVA NA PÁGINA DE VENDA.
//
// A loja vende devolução e produto de leilão, e o cliente não tinha como saber:
// a única informação sob o título "Descrição" era, em 3.170 dos 3.543 produtos do
// retrato de estoque, o texto interno do lote ("Gerado automaticamente do lote:
// LOTE 46-48 ... (Mercado Livre)"). Ele comprava achando que era item de vitrine e
// reclamava do amassado depois da entrega.
//
// Fica ANTES da descrição comercial de propósito: é a informação que muda a decisão
// de compra, não um rodapé.
//
// Some por completo quando não há dado — um bloco "Estado: não informado" seria pior
// que a ausência, porque parece que alguém conferiu e não achou nada.
export default function EstadoDoProduto({ produto, className = '' }) {
  const rotulo = rotuloCondicao(produto?.condicao);
  const detalhes = String(produto?.estado_conservacao || '').trim();
  if (!rotulo && !detalhes) return null;

  return (
    <div className={`rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 ${className}`}>
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-300">
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
        Estado do produto
      </h3>
      {rotulo && <p className="mt-2 text-base font-semibold text-white">{rotulo}</p>}
      {detalhes && (
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">{detalhes}</p>
      )}
    </div>
  );
}

// ⚠️ 02/09/2026 — O SELO DA BUY BOX ERA FIXO: TODO produto da loja aparecia como
// "✓ Novo", em verde com ícone de verificado, logo acima do título. Devolução,
// item amassado, peça de oficina — tudo anunciado como novo, acima da dobra, antes
// de qualquer descrição. Só apareceu ao abrir a página com um produto com avaria.
//
// Agora o selo diz a verdade, e some quando não existe dado: um "Novo" falso é pior
// que selo nenhum, porque o cliente decide a compra por ele.
const CORES = {
  novo:           'text-emerald-300',
  perfeito:       'text-emerald-300',
  bom:            'text-sky-300',
  recondicionado: 'text-sky-300',
  com_avarias:    'text-amber-300',
  para_reparo:    'text-amber-300',
};
const ALERTA = new Set(['com_avarias', 'para_reparo']);

export function SeloCondicao({ condicao }) {
  const rotulo = resumoCondicao(condicao);
  if (!rotulo) return null;
  const Icone = ALERTA.has(condicao) ? Info : BadgeCheck;
  return (
    <span className={`${CORES[condicao] || 'text-gray-300'} font-semibold inline-flex items-center gap-1`}>
      <Icone className="w-4 h-4 shrink-0" aria-hidden="true" />
      {rotulo}
    </span>
  );
}
