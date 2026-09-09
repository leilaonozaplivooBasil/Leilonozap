// 🧰 O removedor de comentários dos testes (09/09/2026).
//
// POR QUE UM TESTE PRO AJUDANTE DE TESTE: ele estava copiado em 8 arquivos e a
// cópia tratava QUALQUER `/*` como abertura de comentário. Num JSX,
// `accept="image/*"` abre um "comentário" que só fecha no próximo `*/` de
// verdade — engolindo dezenas de linhas de código real.
//
// O risco não é o falso alarme, que a gente vê e conserta. É o contrário:
// `assert.ok(!FONTE.includes('coisa proibida'))` passa VERDE quando o trecho
// foi engolido. Teste que mente é pior que teste que falta — e este arquivo
// existe pra que essa mentira não volte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { semComentarios } from './_ajuda.mjs';

test('não engole JSX por causa de accept="image/*"', () => {
  const jsx = [
    '<input accept="image/*" hidden />',
    '{avisoNaTela && <p>erro</p>}',
    '{/* comentário de verdade */}',
    '<span>fim</span>',
  ].join('\n');
  const limpo = semComentarios(jsx);
  assert.match(limpo, /avisoNaTela/, 'o código entre o "image/*" e o próximo */ foi engolido');
  assert.match(limpo, /<span>fim<\/span>/);
  assert.ok(!/comentário de verdade/.test(limpo), 'parou de remover comentário JSX');
});

test('continua removendo o que é comentário mesmo', () => {
  assert.ok(!/segredo/.test(semComentarios('const x = 1; // segredo')));
  assert.ok(!/segredo/.test(semComentarios('/* segredo */\nconst x = 1;')));
  assert.ok(!/segredo/.test(semComentarios('  /* segredo\n     em duas linhas */\nconst x = 1;')));
  assert.ok(!/segredo/.test(semComentarios('{/* segredo */}')));
});

test('não estraga URL nem caminho', () => {
  assert.match(semComentarios("const u = 'https://exemplo.com/x';"), /https:\/\/exemplo\.com\/x/);
  assert.match(semComentarios("const g = 'src/**/*.js';"), /src\/\*\*\/\*\.js/);
  assert.match(semComentarios('<img src="a/b/c.png" />'), /a\/b\/c\.png/);
});

test('aguenta entrada vazia sem quebrar', () => {
  assert.equal(semComentarios(''), '');
  assert.equal(semComentarios(null), '');
  assert.equal(semComentarios(undefined), '');
});
