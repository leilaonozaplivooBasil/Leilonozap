import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { SECOES_LOJA, SECOES_TOP_COLLEGE } from '@/lib/licensingTabs';
import MarcaOuIcone from '@/components/common/MarcaOuIcone';

// 🛍️ NAVEGAÇÃO DA CENTRAL DE VENDAS (13/08/2026)
// Antes eram abas soltas e depois uma fileira que rolava de lado — rolar
// horizontal esconde opções e atrapalha no celular. Agora é UM botão que abre
// um menu suspenso com todas as seções, no padrão do painel.
// Só navegação visual: as seções e os dados são exatamente os mesmos.
export default function CentralVendasTabs({ value, onChange, clientesCount = 0 }) {
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef(null);

  // 🎓 DIR-57 — as seções vêm da FONTE ÚNICA (@/lib/licensingTabs), separadas em
  // duas famílias: o caixa (Loja & Vendas) e a formação (Top College). A lateral
  // já separa as duas em ícones diferentes; aqui elas continuam juntas de
  // propósito, cada uma sob o seu rótulo — quem está na loja alcança O Método
  // sem voltar pro menu, e ninguém fica num beco sem saída.
  const FAMILIAS = [
    { titulo: 'Loja & Vendas', itens: SECOES_LOJA },
    { titulo: 'Top College', itens: SECOES_TOP_COLLEGE },
  ];
  const ITENS = FAMILIAS.flatMap((f) => f.itens);
  const rotuloDe = (item) => (
    item.value === 'catalogo-clientes' ? `${item.label} (${clientesCount})` : item.label
  );

  const atual = ITENS.find((i) => i.value === value) || ITENS[0];
  const IconeAtual = atual.icon;
  // o rótulo de cima diz de QUEM é a seção aberta: da loja ou da faculdade
  const familiaAtual = FAMILIAS.find((f) => f.itens.some((i) => i.value === atual.value))?.titulo || FAMILIAS[0].titulo;

  // fecha ao tocar fora ou apertar Esc (padrão de menu do painel)
  useEffect(() => {
    if (!aberto) return;
    const foraDaCaixa = (e) => {
      if (caixaRef.current && !caixaRef.current.contains(e.target)) setAberto(false);
    };
    const noEsc = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', foraDaCaixa);
    document.addEventListener('touchstart', foraDaCaixa);
    document.addEventListener('keydown', noEsc);
    return () => {
      document.removeEventListener('mousedown', foraDaCaixa);
      document.removeEventListener('touchstart', foraDaCaixa);
      document.removeEventListener('keydown', noEsc);
    };
  }, [aberto]);

  return (
    <div ref={caixaRef} className="relative w-full sm:max-w-sm">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-nz-borda bg-white px-4 text-left shadow-sm transition-colors hover:border-nz-verde/50"
      >
        {/* 🎓 DIR-58 — a marca da X-eos é traço BRANCO: no selo verde-claro ela
            sumia (branco no branco). Quando o item traz marca, o selo vai pro
            preto do brandbook, que é onde ela foi desenhada pra viver. */}
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${atual.marca ? '' : 'bg-nz-verde-fundo'}`}
          style={atual.marca ? { background: 'var(--xeos-preto)' } : undefined}
        >
          <MarcaOuIcone marca={atual.marca} icone={IconeAtual} className="h-4.5 w-4.5 text-nz-verde" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-nz-tinta-fraca">
            {familiaAtual}
          </span>
          <span className="block truncate text-[15px] font-bold text-nz-tinta">{rotuloDe(atual)}</span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-nz-tinta-fraca transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-nz-borda bg-white shadow-xl">
          {FAMILIAS.map((familia) => (
            <div key={familia.titulo}>
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-nz-tinta-fraca">
                {familia.titulo}
              </p>
              {familia.itens.map((item) => {
                const Icon = item.icon;
                const ativo = item.value === value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => { onChange(item.value); setAberto(false); }}
                    className={`flex min-h-[48px] w-full items-center gap-3 px-4 text-left text-[14px] transition-colors ${
                      ativo ? 'bg-nz-verde-fundo font-bold text-nz-verde' : 'font-medium text-nz-tinta hover:bg-nz-cinza-fundo'
                    }`}
                  >
                    {item.marca ? (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: 'var(--xeos-preto)' }}>
                        <MarcaOuIcone marca={item.marca} className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <Icon className={`h-4 w-4 shrink-0 ${ativo ? 'text-nz-verde' : 'text-nz-tinta-fraca'}`} />
                    )}
                    <span className="flex-1 truncate">{rotuloDe(item)}</span>
                    {ativo && <Check className="h-4 w-4 shrink-0 text-nz-verde" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}