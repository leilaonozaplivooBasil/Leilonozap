// 🔴 "NÃO CONSIGO VER A TELA COMPLETA PARA DAR O LANCE" (15/09/2026).
//
// Relato da Beatriz, com print: a folha "Escolha seu lance" abria espremida e
// cortada na borda, e o rodapé do lance não cabia na tela.
//
// Eram DUAS causas somadas, as duas de layout:
//
// 1. A folha de lance mora dentro do rodapé `.bid-input-container`, que tem
//    `backdrop-filter: blur(12px)`. Elemento com backdrop-filter vira o BLOCO DE
//    REFERÊNCIA de todo `position: fixed` dentro dele — então `fixed inset-0`
//    deixava de significar "a tela inteira" e passava a significar "a caixa do
//    rodapé". A folha nunca teve chance de cobrir a tela.
//
// 2. No celular, `.main-content` não tinha `min-height: 0`. O padrão de um item
//    flex é `min-height: auto`, ou seja, ele se recusa a encolher abaixo do
//    próprio conteúdo. Quando o rodapé crescia (caixa de endereço aberta), ele
//    era empurrado para fora e o `overflow: hidden` da página cortava — e a
//    página é travada de propósito, então não havia como rolar até lá.
//
// A prova de que a causa 2 é conhecida da casa: o layout de COMPUTADOR já
// resolvia o mesmo problema com `grid-template-rows: minmax(0,1fr)`, com
// comentário explicando. O bloco do celular ficou sem.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const semComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '')).join('\n');

describe('a folha "Escolha seu lance"', () => {
  const src = ler('../src/components/auction/BidPopover.jsx');
  const codigo = semComentarios(src);

  test('🔴 sai por portal no <body> — senão o backdrop-filter do rodapé a prende', () => {
    assert.match(codigo, /import \{ createPortal \} from "react-dom"/);
    assert.match(codigo, /createPortal\(/);
    assert.match(codigo, /document\.body/);
  });

  test('o portal envolve a folha inteira, não só um pedaço', () => {
    // O `fixed inset-0` tem que estar DENTRO do createPortal; se ficasse fora,
    // o portal não resolveria nada.
    const i = codigo.indexOf('createPortal(');
    const j = codigo.indexOf('fixed inset-0');
    assert.ok(i > 0 && j > i, 'o overlay não está dentro do portal');
  });

  test('tem teto de altura e rola por dentro', () => {
    assert.match(codigo, /overflow-y-auto/);
    assert.match(codigo, /maxHeight: '85dvh'/);
  });

  test('respeita a barra de gestos do celular', () => {
    assert.match(codigo, /env\(safe-area-inset-bottom/);
  });

  test('🔒 o motor do lance continua intocado: a folha só escolhe o valor', () => {
    // Nada de validar, calcular preço ou enviar lance aqui dentro. Quem envia é
    // o BidInput/useBidSubmission — se isto mudar, o conserto virou refatoração.
    assert.ok(!/submitAtomicBid|fetch\(|supabase|invoke\(/.test(codigo),
      'a folha de escolha passou a falar com o servidor — não é papel dela');
    assert.match(codigo, /onEscolher\(valor\)/);
  });

  test('o motivo continua escrito no arquivo', () => {
    // Sem a explicação, o próximo a passar por aqui "limpa" o portal achando
    // que é enfeite, e o corte volta.
    assert.match(src, /backdrop-filter/);
  });
});

describe('a sala do leilão no celular', () => {
  const sala = ler('../src/pages/AuctionRoom.jsx');

  test('🔴 o bloco do meio pode encolher, para o rodapé do lance caber', () => {
    const mobile = /@media \(max-width: 1023px\) \{([\s\S]*?)\n        \}/.exec(sala);
    assert.ok(mobile, 'não achei o bloco de celular');
    const regra = /\.main-content \{[^}]*\}/.exec(mobile[1]);
    assert.ok(regra, 'não achei a regra .main-content do celular');
    assert.match(regra[0], /min-height:\s*0/,
      'sem min-height: 0 o rodapé do lance é empurrado para fora da tela');
  });

  test('a página continua travada de propósito — o conserto não soltou a rolagem', () => {
    // A sala é altura fixa com overflow hidden (estilo chat). Se alguém
    // "consertar" soltando a rolagem da página, o chat perde o comportamento.
    assert.match(sala, /\.auction-page-container \{[^}]*height: calc\(100dvh - 56px\)/);
    assert.match(sala, /\.auction-page-container \{[^}]*overflow: hidden/);
  });

  test('o rodapé do lance continua sem encolher e com respiro embaixo', () => {
    const rodape = /\.bid-input-container \{ flex-shrink: 0;[^}]*\}/.exec(sala);
    assert.ok(rodape, 'a regra do rodapé sumiu');
    assert.match(rodape[0], /env\(safe-area-inset-bottom\)/);
  });
});
