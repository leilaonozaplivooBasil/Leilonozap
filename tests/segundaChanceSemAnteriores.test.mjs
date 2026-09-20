/**
 * 🔁 A SEGUNDA CHANCE SEM AS IMAGENS ANTERIORES.
 *
 * 19/09/2026 — um membro da equipe ficou três dias sem conseguir comprovar
 * tarefa nenhuma. O log dizia apenas "400 · anthropic/claude-opus-5" e a tela
 * traduzia isso como "IA fora do ar". Investigação descartou: tamanho da foto
 * (as dele têm 0,07 a 2,8 MB, bem abaixo do teto de 5 MB), arquivo sumido do
 * Storage (nenhum), e o volume das imagens anteriores (outras pessoas carregam
 * mais e passam). O motivo real estava ESCONDIDO pelo nosso próprio corte de
 * 400 caracteres na mensagem do provedor.
 *
 * Duas mudanças, e é isto que estes testes travam:
 *   1. o corte sobe para 1200 — o envelope do gateway sozinho comia os 400;
 *   2. num 400, tenta DE NOVO mandando só a foto de hoje. Serve de mitigação
 *      (a pessoa destrava) e de diagnóstico (se passar, a causa eram as
 *      anteriores; se falhar igual, não eram — e o log diz qual foi).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { semComentarios } from './_ajuda.mjs';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const ler = (p) => semComentarios(readFileSync(path.join(RAIZ, p), 'utf8'));

test('🔴 a segunda tentativa MANTÉM a foto de hoje e tira só as anteriores', () => {
  // Este é o erro que eu cometi escrevendo isto: um filtro por
  // `type !== 'image'` derrubava a foto de HOJE, porque o conteúdo é
  // [texto, foto de hoje, ...anteriores] — o índice 0 é o TEXTO.
  const conteudo = [
    { type: 'text', text: 'contexto' },
    { type: 'image', marca: 'hoje' },
    { type: 'image', marca: 'anterior-1' },
    { type: 'image', marca: 'anterior-2' },
  ];
  const so = conteudo.slice(0, 2);

  assert.ok(so.some((b) => b.marca === 'hoje'), 'a foto de HOJE tem que sobrar');
  assert.ok(!so.some((b) => String(b.marca || '').startsWith('anterior')), 'as anteriores têm que sair');
  assert.equal(so[0].type, 'text', 'o contexto tem que continuar em primeiro');
  assert.equal(so.length, 2);

  // e o filtro ingênuo que eu tinha escrito perde a foto de hoje:
  const ingenuo = conteudo.filter((b, i) => i === 0 || b.type !== 'image');
  assert.ok(!ingenuo.some((b) => b.marca === 'hoje'),
    'o filtro por tipo derruba a foto de hoje — é por isso que o código usa slice(0, 2)');
});

test('o código usa slice(0, 2), não filtro por tipo', () => {
  const fn = ler('api/functions/xgameValidarPrint.js');
  assert.match(fn, /comAnteriores \? conteudo : conteudo\.slice\(0, 2\)/);
  assert.ok(!/conteudo\.filter\(\(b, i\) => i === 0/.test(fn), 'o filtro ingênuo voltou');
});

test('a segunda chance só acontece em 400 E quando havia anteriores', () => {
  const fn = ler('api/functions/xgameValidarPrint.js');
  assert.match(fn, /Number\(d\.status\) === 400 && imagensAnteriores\.length > 0/,
    'retentar em qualquer erro gastaria chamada à toa e mascararia problema real');
});

test('imagem recusada continua tendo caminho próprio, antes da segunda chance', () => {
  // Se a foto de hoje é que está ruim, repetir sem as anteriores não resolve —
  // e a pessoa merece a mensagem certa, não "IA fora do ar".
  const fn = ler('api/functions/xgameValidarPrint.js');
  const posProblema = fn.indexOf('problemaDaImagem(d)');
  const posRetry = fn.indexOf('imagensAnteriores.length > 0');
  assert.ok(posProblema > 0 && posRetry > 0, 'os dois caminhos precisam existir');
  assert.ok(posProblema < posRetry, 'a recusa de imagem tem que ser lida ANTES de tentar de novo');
});

test('🔎 o log conta quantas imagens foram e qual modelo serviu', () => {
  // Sem isso, o próximo 400 vira adivinhação de novo.
  const fn = ler('api/functions/xgameValidarPrint.js');
  assert.match(fn, /imagens: 1 \+ imagensAnteriores\.length/);
  assert.match(fn, /reserva: ia\.reserva \|\| null/);
  assert.match(fn, /passou SEM as anteriores/, 'o log precisa dizer quando a segunda chance resolveu');
  assert.match(fn, /falhou também sem as anteriores/, 'e quando não resolveu');
});

test('🔴 a mensagem do provedor não é mais cortada em 400', () => {
  const lib = ler('api/_lib/ia.js');
  assert.match(lib, /const TETO_DA_MENSAGEM = 1200;/);
  assert.ok(!/slice\(0, 400\)/.test(lib), 'o corte de 400 voltou — era ele que escondia o motivo');
  // os três ramos usam o teto novo
  assert.equal((lib.match(/slice\(0, TETO_DA_MENSAGEM\)/g) || []).length, 3);
});

test('a resposta avisa quando o cruzamento anti-reciclagem não aconteceu', () => {
  const fn = ler('api/functions/xgameValidarPrint.js');
  assert.match(fn, /sem_cruzamento: true/,
    'aprovação sem o cruzamento visual precisa ficar marcada para auditoria');
});
