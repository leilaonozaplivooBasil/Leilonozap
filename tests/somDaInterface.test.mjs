/**
 * 🔊 SOM DOS BOTÕES — e as travas que impedem um bipe de derrubar o ritual.
 *
 * Pedido do dono (17/09): som ao avançar e ao concluir as etapas do Ritual do
 * Amanhecer, "e posteriormente vamos aplicar em mais funções do Método".
 *
 * O que estes testes travam não é o som — é o que faz o som NÃO poder quebrar
 * nada. Som é enfeite; o ritual das 4:40 não é.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { semComentarios } from './_ajuda.mjs';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const leia = (p) => semComentarios(readFileSync(path.join(RAIZ, p), 'utf8'));

const LIB = leia('src/lib/somDaInterface.js');
const RITUAL = leia('src/components/licensing/CentralVendas/XGameRitualAmanhecer.jsx');

// ───────────── as travas que protegem o ritual ─────────────

test('🔴 a função NUNCA lança: tudo dentro de try, e o catch é mudo', () => {
  const i = LIB.indexOf('export function som(');
  assert.ok(i > 0, 'não achei a função som');
  const corpo = LIB.slice(i, LIB.indexOf('\nexport default', i));
  assert.match(corpo, /try \{/);
  assert.match(corpo, /\} catch \{/, 'o catch tem que engolir — som não pode virar erro de tela');
  // nada de relançar
  assert.ok(!/catch[^{]*\{[^}]*throw/s.test(corpo), 'o catch não pode relançar');
});

test('🔴 a função NUNCA é esperada: é síncrona e não devolve promessa', () => {
  assert.ok(!/export async function som\(/.test(LIB), 'som não pode ser async — alguém escreveria `await som()` e travaria um salvamento');
  assert.ok(!/return new Promise/.test(LIB));
  // o resume devolve promessa e tem que ser ignorado de propósito
  assert.match(LIB, /contexto\.resume\(\)\.catch\(\(\) => \{\}\)/);
});

test('🔴 o AudioContext nasce no CLIQUE, não na montagem', () => {
  const i = LIB.indexOf('export function som(');
  const corpo = LIB.slice(i);
  assert.match(corpo, /if \(!contexto\) contexto = new Ctx\(\)/,
    'criar o contexto fora da função faria o navegador bloquear o primeiro som');
});

test('zero arquivo de áudio: o som é sintetizado', () => {
  assert.ok(!/\.mp3|\.wav|\.ogg|new Audio\(/.test(LIB), 'nada de arquivo — não pode faltar no cache nem atrasar tela');
  assert.match(LIB, /createOscillator\(\)/);
});

test('🔴 ataque e queda suaves — corte seco vira estalo', () => {
  assert.match(LIB, /ganho\.gain\.exponentialRampToValueAtTime\(nota\.vol, t \+ 0\.012\)/);
  assert.match(LIB, /ganho\.gain\.exponentialRampToValueAtTime\(0\.0001, t \+ nota\.dur\)/);
});

// ───────────── silêncio ─────────────

test('🔴 o silêncio é do APARELHO, e é respeitado antes de tocar', () => {
  assert.match(LIB, /localStorage\.setItem\(CHAVE_SILENCIO/);
  const i = LIB.indexOf('export function som(');
  const corpo = LIB.slice(i, i + 700);
  assert.match(corpo, /if \(somDesligado\(\)\) return;/);
});

test('ler e gravar a preferência nunca quebra sem storage', () => {
  assert.match(LIB, /catch \{ return false; \}/);
});

test('o ritual tem interruptor de som na tela', () => {
  assert.match(RITUAL, /data-teste="interruptor-de-som"/);
  assert.match(RITUAL, /silenciarSom\(novo\)/);
});

// ───────────── onde o som toca ─────────────

test('🔴 o som marca ETAPA VENCIDA, não clique recusado', () => {
  // um "ok" sonoro em cima de uma validação recusada mente pra pessoa
  assert.match(RITUAL, /if \(ok\) \{ som\('passo'\); setPasso\(P\.GRATIDAO\); \}/);
  assert.match(RITUAL, /if \(ok\) \{ som\('passo'\); setPasso\(P\.VISUALIZACAO\); \}/);
  assert.match(RITUAL, /if \(ok\) \{ som\('passo'\); setPasso\(P\.FECHAMENTO\); \}/);
});

test('concluir o ritual tem som próprio', () => {
  assert.match(RITUAL, /som\('conclusao'\); pararGravacao\(\); onConcluir\(/);
});

test('🔴 o som nunca é awaited dentro do ritual', () => {
  assert.ok(!/await som\(/.test(RITUAL), 'esperar o som travaria o salvamento atrás de um bipe');
});
