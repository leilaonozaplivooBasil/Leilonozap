// 🔥 O foguinho da Home continua animado, agora em WebP animado (27/09/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const H = readFileSync(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8');
const W = readFileSync(new URL('../src/assets/foguinho-animado.webp', import.meta.url));

test('a Home usa a imagem animada, não mais o vídeo', () => {
  assert.match(H, /import foguinho from '@\/assets\/foguinho-animado\.webp';/);
  assert.match(H, /<img\s+src=\{foguinho\}/);
  assert.doesNotMatch(H, /foguinho-animado\.(mov|webm)/);
  assert.match(H, /className="w-5 h-5 lg:w-7 lg:h-7 flex-shrink-0 pointer-events-none object-contain"/, 'mesmo tamanho de antes');
});

test('o arquivo é mesmo um WebP ANIMADO (a chama não pode ficar parada)', () => {
  assert.equal(W.subarray(0, 4).toString(), 'RIFF');
  assert.equal(W.subarray(8, 12).toString(), 'WEBP');
  assert.ok(W.includes(Buffer.from('ANIM')) && W.includes(Buffer.from('ANMF')), 'tem blocos de animação');
  assert.ok(W.length < 100 * 1024, 'bem menor que os 225–358 KB do vídeo');
});
