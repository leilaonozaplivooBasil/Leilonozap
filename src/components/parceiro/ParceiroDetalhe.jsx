import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

// 📄 Camada de detalhe — guarda o texto integral que saiu da primeira leitura.
// Nada é removido da página: quem quer sentir vê a imagem, quem quer ler abre aqui.
// Mesmo padrão de transparência já aprovado no "Ver o cálculo" do Roadmap.
export default function ParceiroDetalhe({ rotulo = 'Ver detalhes', children }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="mt-8 border-t border-pc-borda">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex min-h-[52px] w-full items-center justify-between gap-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-pc-ouro transition-colors hover:text-pc-ouro-claro"
      >
        <span>{aberto ? 'Ocultar detalhes' : rotulo}</span>
        {aberto ? (
          <Minus className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
        ) : (
          <Plus className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
        )}
      </button>
      {aberto && <div className="pb-2">{children}</div>}
    </div>
  );
}