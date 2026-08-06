import React from 'react';

// 🏷️ Posicionamento de preço — SEM valor em R$ e SEM percentual.
// Usa o dado que já existe no registro (market_price × price_catalog) só para
// dizer ONDE o item está em relação à referência de mercado. Se não houver
// referência confiável, o selo simplesmente não aparece (nada de "0%").
export function faixaPosicionamento(item) {
  const mercado = Number(item?.market_price || item?.manual_market_price || 0);
  const praticado = Number(item?.price_catalog || item?.starting_price || 0);
  if (!mercado || !praticado || praticado >= mercado) return null;

  const razao = praticado / mercado;
  if (razao <= 0.5) return 'Muito abaixo da referência de mercado';
  if (razao <= 0.75) return 'Abaixo da referência de mercado';
  return 'Ligeiramente abaixo da referência de mercado';
}

export default function ParceiroComparativoPreco({ item }) {
  const faixa = faixaPosicionamento(item);
  if (!faixa) return null;

  return (
    <p className="mt-3 border-t border-pc-borda pt-3 text-[10px] uppercase tracking-[0.18em] text-pc-ouro-claro">
      {faixa}
    </p>
  );
}