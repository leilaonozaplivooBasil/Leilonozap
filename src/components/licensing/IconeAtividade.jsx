import React from 'react';
import { Package, Gavel } from 'lucide-react';

// 🎁 Ícone da atividade, no espírito da logo: a caixinha é a venda da Loja
// Virtual; no leilão entra o martelinho COM a caixinha por baixo (a mesma dupla
// da marca). Só desenho — nenhuma regra de negócio aqui.
export default function IconeAtividade({ tipo }) {
  const leilao = tipo === 'auction';
  const rotulo = leilao ? 'Arremate de leilão' : 'Venda da Loja Virtual';

  if (!leilao) {
    return <Package className="w-4 h-4" title={rotulo} aria-label={rotulo} />;
  }

  return (
    <span className="relative block w-5 h-5" title={rotulo} aria-label={rotulo} role="img">
      <Gavel className="absolute right-0 top-0 w-4 h-4 text-nz-marrom" />
      <Package className="absolute left-0 bottom-0 w-3 h-3" />
    </span>
  );
}