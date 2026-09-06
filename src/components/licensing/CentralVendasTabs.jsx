import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, ShoppingBag, GraduationCap } from 'lucide-react';
import { SECOES_LOJA, SECOES_TOP_COLLEGE } from '@/lib/licensingTabs';
import MarcaOuIcone from '@/components/common/MarcaOuIcone';

// 🛍️ NAVEGAÇÃO DA CENTRAL DE VENDAS (13/08/2026)
// Antes eram abas soltas e depois uma fileira que rolava de lado — rolar
// horizontal esconde opções e atrapalha no celular. Agora é UM botão que abre
// um menu suspenso com todas as seções, no padrão do painel.
// Só navegação visual: as seções e os dados são exatamente os mesmos.
//
// 🗂️ 06/09/2026 — dono: "melhorar a organização desse card, e a abertura,
// que está jogando pra baixo; deixar mais conexo". Então:
//   • as duas famílias ficam LADO A LADO (Loja & Vendas | Top College), cada
//     uma com o seu selo e a sua legenda, em linhas curtas — o menu fica
//     baixo em vez de uma lista de dez itens descendo a página;
//   • a abertura mede o espaço: abre pra baixo quando cabe, pra cima quando
//     não cabe, nunca sai da tela, e entra com um respiro (fade + descida);
//   • no celular vira uma coluna só, com rolagem própria e altura limitada.

const FAMILIAS = [
  { id: 'loja', titulo: 'Loja & Vendas', legenda: 'o caixa: vender, receber, entregar', icone: ShoppingBag, itens: SECOES_LOJA },
  { id: 'top', titulo: 'Top College', legenda: 'o que forma: método, encontro, time, carreira', icone: GraduationCap, marca: '/marca/marca-topcollege.webp', itens: SECOES_TOP_COLLEGE },
];
const ITENS = FAMILIAS.flatMap((f) => f.itens);
const LARGURA_DESEJADA = 620; // duas colunas confortáveis no desktop
const MARGEM = 12;

export default function CentralVendasTabs({ value, onChange, clientesCount = 0, escuro = false }) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState(null);
  const [entrou, setEntrou] = useState(false);
  const caixaRef = useRef(null);
  const botaoRef = useRef(null);
  const menuRef = useRef(null);

  // 🩹 DIR-64 — o menu é desenhado num PORTAL, com posição fixa medida a partir
  // do botão: dentro da faixa da academia (overflow-hidden) um menu "absolute"
  // era cortado na borda. 06/09/2026: a medida agora decide também PRA ONDE
  // abrir e QUANTO pode crescer — o que passar disso rola dentro do menu.
  const medir = () => {
    const r = botaoRef.current?.getBoundingClientRect();
    if (!r) return null;
    const vw = window.innerWidth; const vh = window.innerHeight;
    const estreito = vw < 640;
    const width = estreito ? Math.min(vw - MARGEM * 2, Math.max(r.width, 320)) : Math.min(LARGURA_DESEJADA, vw - MARGEM * 2);
    let left = estreito ? MARGEM : r.left;
    if (left + width > vw - MARGEM) left = Math.max(MARGEM, vw - MARGEM - width);
    const abaixo = vh - r.bottom - MARGEM - 8;
    const acima = r.top - MARGEM - 8;
    const precisa = estreito ? 420 : 300;
    const paraCima = abaixo < precisa && acima > abaixo;
    const maxAltura = Math.max(200, Math.floor(paraCima ? acima : abaixo));
    return { left, width, paraCima, maxAltura, top: paraCima ? null : r.bottom + 8, bottom: paraCima ? vh - r.top + 8 : null };
  };
  const abrirFechar = () => {
    setAberto((a) => {
      if (a) return false;
      const p = medir();
      if (p) setPosicao(p);
      return true;
    });
  };
  // o respiro da entrada: o menu nasce um pouco deslocado e quase transparente, e assenta
  useLayoutEffect(() => {
    if (!aberto) { setEntrou(false); return undefined; }
    const id = requestAnimationFrame(() => setEntrou(true));
    return () => cancelAnimationFrame(id);
  }, [aberto]);

  const rotuloDe = (item) => (item.value === 'catalogo-clientes' ? `${item.label} (${clientesCount})` : item.label);
  const atual = ITENS.find((i) => i.value === value) || ITENS[0];
  const IconeAtual = atual.icon;
  const familiaAtual = FAMILIAS.find((f) => f.itens.some((i) => i.value === atual.value)) || FAMILIAS[0];

  // fecha ao tocar fora, apertar Esc ou rolar a página; remede ao mudar a janela
  useEffect(() => {
    if (!aberto) return undefined;
    const foraDaCaixa = (e) => {
      if (e.target.closest?.('[data-menu-central-vendas]')) return;
      if (caixaRef.current && !caixaRef.current.contains(e.target)) setAberto(false);
    };
    const noEsc = (e) => { if (e.key === 'Escape') setAberto(false); };
    const remedir = () => { const p = medir(); if (p) setPosicao(p); };
    const aoRolar = (e) => { if (menuRef.current && menuRef.current.contains(e.target)) return; setAberto(false); };
    document.addEventListener('mousedown', foraDaCaixa);
    document.addEventListener('touchstart', foraDaCaixa);
    document.addEventListener('keydown', noEsc);
    window.addEventListener('resize', remedir);
    window.addEventListener('scroll', aoRolar, true);
    return () => {
      document.removeEventListener('mousedown', foraDaCaixa);
      document.removeEventListener('touchstart', foraDaCaixa);
      document.removeEventListener('keydown', noEsc);
      window.removeEventListener('resize', remedir);
      window.removeEventListener('scroll', aoRolar, true);
    };
  }, [aberto]);

  const escolher = (item) => { onChange(item.value); setAberto(false); };

  return (
    <div ref={caixaRef} className="relative w-full sm:max-w-sm">
      <button
        type="button"
        ref={botaoRef}
        onClick={abrirFechar}
        aria-expanded={aberto}
        aria-haspopup="menu"
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
            {familiaAtual.titulo}
          </span>
          {/* 🎓 DIR-61 — ordem do dono: aqui não se escreve "O Método", entra
              só o X. O nome continua no title/alt, pra tela nenhuma ficar muda. */}
          <span className={`block truncate text-[15px] font-bold ${escuro ? 'text-white' : 'text-nz-tinta'}`} style={{ fontFamily: 'Sora, sans-serif' }}>
            {rotuloDe(atual)}
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${escuro ? 'text-white/50' : 'text-nz-tinta-fraca'} ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && posicao && createPortal(
        <div
          ref={menuRef}
          data-menu-central-vendas
          data-abre={posicao.paraCima ? 'cima' : 'baixo'}
          role="menu"
          className={`fixed z-[9999] overflow-hidden rounded-2xl border shadow-2xl ${escuro ? 'border-white/12' : 'border-nz-borda bg-white'}`}
          style={{
            top: posicao.top ?? undefined,
            bottom: posicao.bottom ?? undefined,
            left: posicao.left,
            width: posicao.width,
            maxHeight: posicao.maxAltura,
            opacity: entrou ? 1 : 0,
            transform: entrou ? 'translateY(0) scale(1)' : `translateY(${posicao.paraCima ? '6px' : '-6px'}) scale(0.98)`,
            transformOrigin: posicao.paraCima ? 'bottom left' : 'top left',
            transition: 'opacity 140ms ease-out, transform 160ms ease-out',
            ...(escuro ? { background: 'var(--xeos-preto)', fontFamily: 'Sora, sans-serif' } : {}),
          }}
        >
          <div className="grid sm:grid-cols-2 overflow-y-auto" style={{ maxHeight: posicao.maxAltura }}>
            {FAMILIAS.map((familia, fi) => {
              const Fam = familia.icone;
              const daFamilia = familia.id === familiaAtual.id;
              return (
                <div
                  key={familia.id}
                  data-familia={familia.id}
                  className={`min-w-0 ${fi === 1 ? (escuro ? 'border-t sm:border-t-0 sm:border-l border-white/10' : 'border-t sm:border-t-0 sm:border-l border-nz-borda') : ''}`}
                >
                  {/* o selo e a legenda da família: quem está aqui sabe em que casa está */}
                  <div className={`flex items-center gap-2.5 px-3.5 pt-3 pb-2 ${daFamilia ? '' : 'opacity-80'}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${familia.marca ? '' : (escuro ? 'bg-white/10' : 'bg-nz-verde-fundo')}`} style={familia.marca ? { background: 'var(--xeos-preto)', border: escuro ? '1px solid rgba(255,255,255,0.12)' : 'none' } : undefined}>
                      <MarcaOuIcone marca={familia.marca || null} icone={Fam} className={`h-4 w-4 ${escuro ? 'text-white' : 'text-nz-verde'}`} />
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[11px] font-bold uppercase tracking-[0.16em] ${escuro ? 'text-white' : 'text-nz-tinta'}`}>{familia.titulo}</span>
                      <span className={`block truncate text-[10.5px] ${escuro ? 'text-white/45' : 'text-nz-tinta-fraca'}`}>{familia.legenda}</span>
                    </span>
                  </div>
                  <div className="pb-2">
                    {familia.itens.map((item) => {
                      const Icon = item.icon;
                      const ativo = item.value === value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          role="menuitem"
                          onClick={() => escolher(item)}
                          className={`relative flex min-h-[40px] w-full items-center gap-2.5 pl-4 pr-3 text-left text-[13.5px] transition-colors ${
                            escuro
                              ? (ativo ? 'bg-white/10 font-bold text-white' : 'font-medium text-white/70 hover:bg-white/[0.06] hover:text-white')
                              : (ativo ? 'bg-nz-verde-fundo font-bold text-nz-verde' : 'font-medium text-nz-tinta hover:bg-nz-cinza-fundo')
                          }`}
                        >
                          {/* o fio da seção aberta */}
                          {ativo && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r" style={{ background: escuro ? 'linear-gradient(180deg, var(--topcollege-azul), var(--topcollege-magenta))' : 'var(--nz-verde, #16a34a)' }} />}
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
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
