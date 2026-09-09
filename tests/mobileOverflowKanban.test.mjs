// 🩹 09/09/2026 — dono, testando no celular: "a esteira... está vazando no
// celular. Então vamos ajustar pra aparecer no tablet, no celular e no
// computador, sem vazar nada... principalmente na página aí da Top College."
//
// Causa real: um Kanban horizontal (`overflow-x-auto`) tem seu PRÓPRIO
// scroll, mas no Safari/Chrome do celular, arrastar até o fim dele "vaza" e
// continua arrastando a PÁGINA inteira de lado (scroll chaining/rubber-band)
// — mesmo com o `overflow-x:hidden` do html/body já existente, porque isso
// acontece DEPOIS que o toque já começou dentro do carrossel.
// `overscroll-behavior-x: contain` trava o arrasto dentro do próprio
// carrossel — aplicado globalmente (`.overflow-x-auto`/`.overflow-x-scroll`
// em src/index.css), sem precisar caçar tela por tela.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const CSS = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const ESTEIRA = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmEsteiraCaptacao.jsx', import.meta.url), 'utf8');
const FUNIL = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmFunilKanban.jsx', import.meta.url), 'utf8');

test('index.css: o guard anti-overflow do html/body continua de pé (nunca removido por acidente)', () => {
  assert.match(CSS, /html,\s*body\s*\{[^}]*overflow-x:\s*hidden;[^}]*\}/s);
});

test('index.css: overscroll-behavior-x contido — nem o html/body nem as áreas de rolagem horizontal deixam o arrasto vazar pro resto da tela', () => {
  assert.match(CSS, /html,\s*body\s*\{[^}]*overscroll-behavior-x:\s*contain;[^}]*\}/s, 'falta a trava no html/body');
  assert.match(CSS, /\.overflow-x-auto,\s*\.overflow-x-scroll\s*\{[^}]*overscroll-behavior-x:\s*contain;[^}]*\}/s, 'falta a trava em QUALQUER área de rolagem horizontal do app');
});

for (const [nome, ARQUIVO, dataTeste] of [
  ['CrmEsteiraCaptacao.jsx', ESTEIRA, 'esteira-dica-arrastar'],
  ['CrmFunilKanban.jsx', FUNIL, 'funil-dica-arrastar'],
]) {
  test(`${nome}: o Kanban avisa (só no celular) que dá pra arrastar de lado, pra não parecer quebrado`, () => {
    assert.match(ARQUIVO, new RegExp(`data-teste="${dataTeste}"`));
    // a dica só aparece no celular (sm:hidden) — no desktop as colunas já cabem
    const inicioDica = ARQUIVO.indexOf(`data-teste="${dataTeste}"`);
    const trechoAntes = ARQUIVO.slice(Math.max(0, inicioDica - 200), inicioDica);
    assert.match(trechoAntes, /sm:hidden/, 'a dica precisa sumir no desktop');
  });
}
