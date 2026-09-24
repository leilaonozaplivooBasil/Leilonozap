// 🧩 24/09/2026 — a barra do app usa os MESMOS azulejos verdes dos Atalhos do
// menu (TILE/Rotulo do AtalhosGrid), e o carrinho sai do cabeçalho do celular
// onde a barra aparece. Pedido do dono: "duplique daqui para lá esses botões".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const BARRA = ler('../src/components/nav/BarraDoApp.jsx');
const GRID = ler('../src/components/nav/AtalhosGrid.jsx');
const LAYOUT = ler('../src/Layout.jsx');

test('a barra importa o azulejo e o rótulo do AtalhosGrid — fonte única de estilo, nada copiado à mão', () => {
  assert.ok(BARRA.includes("import { TILE, P, Rotulo } from '@/components/nav/AtalhosGrid';"));
  assert.ok(GRID.includes('export const TILE'));
  assert.ok(GRID.includes('export function Rotulo'));
  assert.ok(BARRA.includes('className="relative flex h-[38px] w-[38px] items-center justify-center rounded-xl"'));
  assert.ok(BARRA.includes('<Rotulo tom={aceso ? \'beige\' : undefined}>{item.rotulo}</Rotulo>'));
  assert.ok(!BARRA.includes('text-emerald-300'), 'o visual antigo (ícone fino cinza/verde) saiu');
});

test('os ícones de Comprar/Leilões/Lucre vêm de sectors.js, iguais aos do menu', () => {
  assert.ok(BARRA.includes("import { SECTORS } from '@/lib/sectors';"));
  assert.ok(BARRA.includes('const setor = SECTORS.find((s) => s?.href?.page === item.pagina);'));
  assert.ok(BARRA.includes('return setor?.icon || RESERVA[item.id];'));
});

test('o contador do carrinho é a mesma bolinha bege dos Atalhos', () => {
  assert.ok(BARRA.includes('data-teste="barra-carrinho-contador"'));
  assert.ok(BARRA.includes('linear-gradient(150deg, #ecd3ae, ${P.beige})'));
});

test('o carrinho sai do cabeçalho do celular onde a barra aparece (e fica no checkout/pedidos, sem barra)', () => {
  assert.ok(LAYOUT.includes('{isCatalogPage && !mostraBarraDoApp(currentPageName) && ('));
});

test('a barra é de vidro, como o bloco Leilões Ativos: quase sem cor própria, desfoque forte, fio claro no topo', () => {
  assert.ok(BARRA.includes("rgba(10, 16, 14, 0.42)"), 'fundo translúcido (o de antes era 0.94, chapado)');
  assert.ok(BARRA.includes("backdropFilter: 'blur(22px) saturate(1.7)'"));
  assert.ok(BARRA.includes("borderTop: '1px solid rgba(255,255,255,0.12)'"));
  assert.ok(BARRA.includes("textShadow: '0 1px 2px rgba(0,0,0,0.6)'"), 'rótulo legível sobre foto clara');
  assert.ok(!BARRA.includes('rgba(14, 22, 18, 0.9'));
});
