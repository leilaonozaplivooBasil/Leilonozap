// 👁️ A VISÃO DA OPERAÇÃO NO TEMA CLARO — 10/09/2026
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ISTO EXISTE
// ═══════════════════════════════════════════════════════════════════════════
// A Visão da Operação entrou no tema claro do painel em 08/08 (PAGINAS_TEMA_CLARO
// no Layout). O clareamento global do `.nz-painel` funciona por SUBSTRING de
// classe — `bg-gray-9`, `from-gray-8`, `text-gray-4`… — e por isso ele conhece
// só o que está listado. Três coisas passaram batido e ficaram visíveis em
// produção:
//
//   1. Parada de degradê COLORIDA (`from-indigo-900/30`, `from-orange-900/30`)
//      não casa com nenhuma regra: o bloco continuou escuro no meio da página
//      branca.
//   2. Botão com fundo próprio e SEM `text-white` herda a tinta escura que a
//      regra do `.nz-painel` põe no elemento `bg-gray-900` da página — letra
//      escura sobre verde.
//   3. `text-orange-300` sobre `bg-orange-500/20`: no escuro lia, no claro dá
//      ~1,3:1 e some.
//
// Estas assertivas prendem as três correções. Elas NÃO conferem beleza —
// conferem que o conserto não seja desfeito sem alguém perceber.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));

const PAINEL = ler('src/pages/PainelDistribuidor.jsx');
const REGIAO = ler('src/components/painel/RegiaoCard.jsx');
const RANKING_DIA = ler('src/components/painel/RankingDia.jsx');
const RANKING_FULL = ler('src/components/painel/RankingFull.jsx');
const INBOX = ler('src/components/painel/WhatsAppInbox.jsx');

// ───────────────────────────────────────────────────────────────────────────
test('PVC-1 · nenhum degradê ESCURO colorido sobrou nas telas do painel', () => {
  // só as paradas escuras interessam: `-900`, `-800`. Uma parada clara
  // (`from-yellow-500/20`) sobre branco continua clara e não é problema.
  const ESCURA = /(?:from|via|to)-(?:indigo|purple|violet|blue|cyan|sky|teal|fuchsia|pink|rose|red|orange)-(?:800|900)/g;
  for (const [nome, fonte] of [['PainelDistribuidor', PAINEL], ['RegiaoCard', REGIAO], ['RankingDia', RANKING_DIA], ['RankingFull', RANKING_FULL], ['WhatsAppInbox', INBOX]]) {
    const achados = fonte.match(ESCURA) || [];
    assert.deepEqual(achados, [], `${nome} ainda tem parada de degradê escura colorida: ${achados.join(', ')}`);
  }
});

// ───────────────────────────────────────────────────────────────────────────
test('PVC-2 · todo botão de fundo sólido verde declara text-white', () => {
  // Sem `text-white` próprio, o botão HERDA a tinta escura do tema claro.
  // Só fundo SÓLIDO entra: `bg-green-600/40` é bolha de conversa, não botão.
  const SOLIDO = /class(?:Name)?="[^"]*\bbg-(?:green|emerald|indigo)-[0-9]{3}(?![/0-9])[^"]*"/g;
  const faltando = [];
  for (const [nome, fonte] of [['PainelDistribuidor', PAINEL], ['RankingFull', RANKING_FULL], ['WhatsAppInbox', INBOX]]) {
    for (const cls of fonte.match(SOLIDO) || []) {
      if (!/\btext-white\b/.test(cls)) faltando.push(`${nome}: ${cls.slice(0, 90)}`);
    }
  }
  assert.deepEqual(faltando, [], `botões sem text-white:\n${faltando.join('\n')}`);
  // premissa: a varredura precisa ter ENCONTRADO botões. Se o regex parar de
  // casar, a assertiva acima passa vazia e não mede mais nada.
  const total = [PAINEL, RANKING_FULL, INBOX].reduce((n, f) => n + (f.match(SOLIDO) || []).length, 0);
  assert.ok(total >= 12, `esperava achar ao menos 12 botões sólidos, achei ${total}`);
});

// ───────────────────────────────────────────────────────────────────────────
test('PVC-3 · RegiaoCard não depende mais do clareador global', () => {
  // O card pinta por token da marca. Qualquer classe de COR do Tailwind aqui
  // volta a entregar o card na mão das regras `!important` do .nz-painel.
  const COR = /\b(?:bg|text|border|from|via|to)-(?:gray|slate|zinc|neutral|indigo|green|emerald|white|black)(?:-[0-9]{2,3})?(?:\/[0-9]+)?\b/g;
  const achados = [...new Set(REGIAO.match(COR) || [])];
  assert.deepEqual(achados, [], `RegiaoCard ainda usa classe de cor: ${achados.join(', ')}`);
  // e usa os tokens, nos TRÊS retornos (carregando, indisponível, com dados)
  assert.equal((REGIAO.match(/var\(--nz-verde-fundo\)/g) || []).length, 1, 'a casca dos três retornos é uma só constante');
  assert.ok(/const CASCA = \{[^}]*--nz-verde-fundo/.test(REGIAO), 'a casca precisa ser a constante compartilhada');
  for (const trecho of ['Carregando inteligência da região', 'Cadastre seu CEP', 'Inteligência da Região']) {
    assert.ok(REGIAO.includes(trecho), `sumiu o retorno "${trecho}"`);
  }
  assert.equal((REGIAO.match(/style=\{\{ \.\.\.CASCA/g) || []).length + (REGIAO.match(/style=\{CASCA\}/g) || []).length, 3, 'os três retornos precisam usar a mesma casca');
});

// ───────────────────────────────────────────────────────────────────────────
test('PVC-4 · o aviso "falta pouco" e o botão "a despachar" leem no claro', () => {
  assert.ok(!/text-orange-300/.test(RANKING_DIA), 'RankingDia voltou ao laranja-300 (≈1,6:1 no claro)');
  assert.ok(RANKING_DIA.includes('Falta pouco — bora bater a meta!'), 'premissa: o aviso ainda existe');
  assert.ok(/--nz-fogo-escuro/.test(RANKING_DIA), 'o aviso precisa usar o fogo escuro da marca');

  const botao = PAINEL.split('\n').find((l) => l.includes('a despachar}') || l.includes('a despachar<'));
  assert.ok(botao, 'premissa: o botão "a despachar" ainda existe');
  assert.ok(!/text-orange-300/.test(botao), 'botão "a despachar" voltou ao laranja-300');
  assert.ok(/text-orange-700/.test(botao), 'botão "a despachar" precisa de tinta laranja escura');
});

// ───────────────────────────────────────────────────────────────────────────
test('PVC-5 · o título vem antes da Inteligência da Região, nas duas variantes', () => {
  const titulos = [...PAINEL.matchAll(/<h1 className="text-2xl font-black mb-1">Visão da Operação<\/h1>/g)].map((m) => m.index);
  const regioes = [...PAINEL.matchAll(/<RegiaoCard user=\{user\} \/>/g)].map((m) => m.index);
  assert.equal(titulos.length, 2, 'premissa: duas variantes da Visão (loja e distribuidor)');
  assert.equal(regioes.length, 2, 'premissa: o RegiaoCard aparece uma vez em cada variante');
  assert.ok(titulos[0] < regioes[0], 'variante LOJA: a estimativa da região está acima do título de novo');
  assert.ok(titulos[1] < regioes[1], 'variante DISTRIBUIDOR: a estimativa da região está acima do título de novo');

  // e o faturamento REAL do dia vem antes da estimativa da região
  const faturado = PAINEL.indexOf('Faturado · {({ dia:');
  assert.ok(faturado > 0, 'premissa: o destaque de faturamento ainda existe');
  assert.ok(faturado < regioes[1], 'o faturamento real do período precisa vir antes da estimativa da região');
});

// ───────────────────────────────────────────────────────────────────────────
test('PVC-6 · a página não abre um <main> dentro do <main> do Layout', () => {
  assert.ok(!/<main[\s>]/.test(PAINEL), 'PainelDistribuidor voltou a abrir <main> (o Layout já abre um)');
  assert.ok(PAINEL.includes('<div className="flex-1 min-w-0 p-4 md:p-8">'), 'premissa: o container do conteúdo continua lá');
});
