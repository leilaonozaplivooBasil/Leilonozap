import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { SECOES_LOJA, SECOES_TOP_COLLEGE } from '@/lib/licensingTabs';
import MarcaOuIcone from '@/components/common/MarcaOuIcone';

// 🛍️ NAVEGAÇÃO DA CENTRAL DE VENDAS (13/08/2026)
// Antes eram abas soltas e depois uma fileira que rolava de lado — rolar
// horizontal esconde opções e atrapalha no celular. Agora é UM botão que abre
// um menu suspenso com todas as seções, no padrão do painel.
// Só navegação visual: as seções e os dados são exatamente os mesmos.
export default function CentralVendasTabs({ value, onChange, clientesCount = 0, escuro = false }) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState(null);
  const caixaRef = useRef(null);
  const botaoRef = useRef(null);

  // 🩹 DIR-64 — o menu é desenhado num PORTAL, com posição fixa medida a partir
  // do botão. Dentro da faixa da academia (que tem overflow-hidden por causa
  // dos cantos arredondados e do padrão ao fundo) um menu "absolute" era
  // simplesmente CORTADO na borda — foi o que apareceu no primeiro print. É a
  // mesma solução que a lateral já usa pelo mesmo motivo.
  const abrirFechar = () => {
    setAberto((a) => {
      if (a) return false;
      const r = botaoRef.current?.getBoundingClientRect();
      if (r) setPosicao({ top: r.bottom + 8, left: r.left, width: r.width });
      return true;
    });
  };

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
      const dentroDoMenu = e.target.closest?.('[data-menu-central-vendas]');
      if (dentroDoMenu) return;
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
        ref={botaoRef}
        onClick={abrirFechar}
        aria-expanded={aberto}
        className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl border px-4 text-left shadow-sm transition-colors ${
          escuro
            ? 'border-white/15 bg-white/[0.06] hover:border-white/30 hover:bg-white/[0.10]'
            : 'border-nz-borda bg-white hover:border-nz-verde/50'
        }`}
      >
        {/* 🎓 DIR-58 — a marca da X-eos é traço BRANCO: no selo verde-claro ela
            sumia (branco no branco). Quando o item traz marca, o selo vai pro
            preto do brandbook, que é onde ela foi desenhada pra viver. */}
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${atual.marca ? '' : 'bg-nz-verde-fundo'}`}
          style={atual.marca ? { background: 'var(--xeos-preto)' } : undefined}
        >
          <MarcaOuIcone marca={atual.marca ? '/marca/marca-x-selo.webp' : null} icone={IconeAtual} className="h-5 w-5 text-nz-verde" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[11px] font-semibold uppercase tracking-wide ${escuro ? 'text-white/45' : 'text-nz-tinta-fraca'}`}>
            {familiaAtual}
          </span>
          {/* 🎓 DIR-61 — ordem do dono: aqui não se escreve "O Método", entra
              só o X. Ao lado, pequeno, o retrato com a pergunta que abre o
              método. O nome continua no title/alt, pra tela nenhuma ficar muda. */}
          <span className={`block truncate text-[15px] font-bold ${escuro ? 'text-white' : 'text-nz-tinta'}`} style={{ fontFamily: 'Sora, sans-serif' }}>
            {rotuloDe(atual)}
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${escuro ? 'text-white/50' : 'text-nz-tinta-fraca'} ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && posicao && createPortal(
        <div
          data-menu-central-vendas
          className={`fixed z-[9999] overflow-hidden rounded-xl border shadow-2xl ${
            escuro ? 'border-white/12' : 'border-nz-borda bg-white'
          }`}
          style={{
            top: posicao.top,
            left: posicao.left,
            width: posicao.width,
            ...(escuro ? { background: 'var(--xeos-preto)', fontFamily: 'Sora, sans-serif' } : {}),
          }}
        >
          {FAMILIAS.map((familia) => (
            <div key={familia.titulo}>
              <p className={`px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] ${escuro ? 'text-white/35' : 'text-nz-tinta-fraca'}`}>
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
                      escuro
                        ? (ativo ? 'bg-white/10 font-bold text-white' : 'font-medium text-white/70 hover:bg-white/[0.06] hover:text-white')
                        : (ativo ? 'bg-nz-verde-fundo font-bold text-nz-verde' : 'font-medium text-nz-tinta hover:bg-nz-cinza-fundo')
                    }`}
                  >
                    {item.marca ? (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: 'var(--xeos-preto)' }}>
                        <MarcaOuIcone marca={item.marca} className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <Icon className={`h-4 w-4 shrink-0 ${ativo ? (escuro ? 'text-white' : 'text-nz-verde') : (escuro ? 'text-white/40' : 'text-nz-tinta-fraca')}`} />
                    )}
                    <span className="flex-1 truncate">{rotuloDe(item)}</span>
                    {ativo && <Check className={`h-4 w-4 shrink-0 ${escuro ? 'text-white' : 'text-nz-verde'}`} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}