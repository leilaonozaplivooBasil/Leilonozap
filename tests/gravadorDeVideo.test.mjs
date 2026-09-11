// 🎥 O teto do gravador — 11/09/2026
//
// O que estes testes protegem é UMA manhã concreta: dois vídeos recusados pelo
// Storage por tamanho, gravados por pessoas que fizeram tudo certo. O arquivo
// de produção explica o porquê; aqui está o que não pode voltar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  VIDEO_BITS_POR_SEGUNDO, AVISO_TETO_BYTES, COFRE_TETO_BYTES,
  restricoesDaCamera, opcoesDoGravador, tamanhoPrevisto,
  videoCabeNoCofre, avisoDoVideoGrande,
} from '../src/lib/gravadorDeVideo.js';

const MB = 1024 * 1024;

// ───────────────────────────────────────────────────────────────────────────
// GRA-1 — o teto existe SEMPRE, e é ele que segura o arquivo
// ───────────────────────────────────────────────────────────────────────────
test('GRA-1 o bitrate é declarado mesmo quando o webm não é suportado', () => {
  // 🔴 este é o bug literal: no Safari, `isTypeSupported('video/webm')` é
  // false e o código antigo passava `undefined` como opções — indo embora sem
  // teto justamente no navegador dos aparelhos que estouraram.
  const semWebm = opcoesDoGravador(() => false);
  assert.equal(semWebm.videoBitsPerSecond, VIDEO_BITS_POR_SEGUNDO);
  assert.equal(semWebm.mimeType, undefined, 'sem webm não inventa mimeType');

  const comWebm = opcoesDoGravador(() => true);
  assert.equal(comWebm.videoBitsPerSecond, VIDEO_BITS_POR_SEGUNDO);
  assert.equal(comWebm.mimeType, 'video/webm');

  // navegador sem isTypeSupported nenhum: o teto continua de pé
  assert.equal(opcoesDoGravador(undefined).videoBitsPerSecond, VIDEO_BITS_POR_SEGUNDO);
  assert.equal(opcoesDoGravador(() => { throw new Error('boom'); }).videoBitsPerSecond, VIDEO_BITS_POR_SEGUNDO);
});

// ───────────────────────────────────────────────────────────────────────────
// GRA-2 — a manhã de 11/09, em números
// ───────────────────────────────────────────────────────────────────────────
test('GRA-2 os 128s do Emannuel cabem com folga no balde', () => {
  // as cinco gravações reais ficaram entre 121s e 128s
  for (const seg of [121, 123, 124, 127, 128]) {
    const bytes = tamanhoPrevisto(seg);
    assert.ok(videoCabeNoCofre(bytes), `${seg}s previu ${Math.round(bytes / MB)} MB`);
  }
  // e o teto de segurança do ritual (15 min) também tem que caber, senão o
  // aviso dispara em quem só usou a rede de segurança
  assert.ok(videoCabeNoCofre(tamanhoPrevisto(15 * 60)), '15 min no teto tem que caber');
});

test('GRA-2b a folga é REAL, não de milissegundos', () => {
  // 🔴 sem isto, alguém poderia baixar o bitrate só o suficiente pra 128s
  // passar raspando e o teste continuaria verde. A régua é a folga.
  const doisMinutos = tamanhoPrevisto(120);
  assert.ok(doisMinutos * 5 <= AVISO_TETO_BYTES,
    `2 min previu ${Math.round(doisMinutos / MB)} MB: precisa caber 5x no teto de ${Math.round(AVISO_TETO_BYTES / MB)} MB`);
});

test('GRA-2c o bitrate de hoje reproduz a recusa; o novo, não', () => {
  // ~20 Mbps é o que um iPhone recente entrega sozinho. É o número que
  // explica os "exceeded the maximum allowed size" da Beatriz e da Iara.
  const comoEraAntes = (20_000_000 / 8) * 121;
  assert.ok(!videoCabeNoCofre(comoEraAntes), 'o modelo antigo TEM que estourar — senão este teste não prova nada');
  assert.ok(videoCabeNoCofre(tamanhoPrevisto(121)), 'o modelo novo tem que caber');
});

// ───────────────────────────────────────────────────────────────────────────
// GRA-3 — nenhuma restrição de câmera pode ser dura
// ───────────────────────────────────────────────────────────────────────────
test('GRA-3 câmera só com `ideal` — `exact`/`max` derrubariam o vídeo inteiro', () => {
  // `max`/`exact` que a câmera não atenda = OverconstrainedError = o catch de
  // quem chama desliga o vídeo = a pessoa perde o selo BRILHANTE por uma
  // otimização de tamanho. Trocar "grande demais" por "não existe" é pior.
  for (const lado of ['user', 'environment']) {
    const r = restricoesDaCamera(lado);
    assert.equal(r.audio, false, 'o vídeo do ritual não leva áudio');
    const serial = JSON.stringify(r.video);
    assert.ok(!serial.includes('"exact"'), `restrição dura em ${lado}: ${serial}`);
    assert.ok(!serial.includes('"max"'), `restrição dura em ${lado}: ${serial}`);
    for (const chave of ['facingMode', 'width', 'height', 'frameRate']) {
      assert.ok(Object.hasOwn(r.video[chave], 'ideal'), `${chave} tem que ser um pedido, não uma exigência`);
    }
    assert.equal(r.video.facingMode.ideal, lado);
  }
});

test('GRA-3b o arquivo de produção não pede restrição dura', () => {
  // a prova no código-fonte, além do formato: alguém poderia acrescentar
  // `max` numa chave nova que o teste acima não enumera.
  const fonte = semComentarios(readFileSync(new URL('../src/lib/gravadorDeVideo.js', import.meta.url), 'utf8'));
  const corpo = fonte.slice(fonte.indexOf('export function restricoesDaCamera'));
  const fim = corpo.indexOf('export function opcoesDoGravador');
  const trecho = corpo.slice(0, fim > 0 ? fim : corpo.length);
  assert.ok(!/\bexact\s*:/.test(trecho), 'apareceu `exact:` nas restrições da câmera');
  assert.ok(!/\bmax\s*:/.test(trecho), 'apareceu `max:` nas restrições da câmera');
});

// ───────────────────────────────────────────────────────────────────────────
// GRA-4 — o aviso que faltou: a Beatriz tentou 8 vezes sem saber o porquê
// ───────────────────────────────────────────────────────────────────────────
test('GRA-4 arquivo grande demais rende um aviso que diz o motivo e a saída', () => {
  const aviso = avisoDoVideoGrande(300 * MB);
  assert.ok(aviso, 'tem que avisar');
  assert.ok(/300 MB/.test(aviso), 'tem que dizer o tamanho que saiu');
  assert.ok(/não é culpa sua/i.test(aviso), 'tem que tirar a culpa de quem gravou certo');
  assert.ok(/BRILHANTE/.test(aviso), 'tem que dizer o que se perde ao concluir sem vídeo');
});

test('GRA-4b nada de aviso quando cabe — nem no blob vazio', () => {
  assert.equal(avisoDoVideoGrande(tamanhoPrevisto(128)), null);
  assert.equal(avisoDoVideoGrande(0), null, 'sem gravação não há o que avisar');
  assert.equal(avisoDoVideoGrande(undefined), null);
  assert.equal(avisoDoVideoGrande(AVISO_TETO_BYTES), null, 'exatamente no teto ainda passa');
});

test('GRA-4c o aviso dispara ABAIXO do que o Storage recusa', () => {
  // a margem não é enfeite: o Storage mede o corpo da requisição, que leva
  // envelope além dos bytes do vídeo. Avisar só em 100 MB chega tarde.
  assert.ok(AVISO_TETO_BYTES < COFRE_TETO_BYTES, 'o aviso tem que vir antes da recusa');
  assert.ok(avisoDoVideoGrande(COFRE_TETO_BYTES - 1), 'um arquivo colado no limite do balde precisa avisar');
});

// ───────────────────────────────────────────────────────────────────────────
// GRA-5 — a tela usa isto de verdade
// ───────────────────────────────────────────────────────────────────────────
test('GRA-5 o ritual grava pelo módulo do teto, e não com os valores soltos', () => {
  const tela = semComentarios(readFileSync(
    new URL('../src/components/licensing/CentralVendas/XGameRitualAmanhecer.jsx', import.meta.url), 'utf8'));
  assert.ok(/restricoesDaCamera\(lado\)/.test(tela), 'getUserMedia tem que pedir pelo módulo');
  assert.ok(/opcoesDoGravador\(/.test(tela), 'o MediaRecorder tem que nascer com as opções do módulo');
  assert.ok(/avisoDoVideoGrande\(/.test(tela), 'o onstop tem que conferir o tamanho');
  // 🔴 o estado exato de antes: `width: 480` cru (que a spec lê como `ideal`)
  // e MediaRecorder com `undefined` de opções.
  assert.ok(!/width:\s*480/.test(tela), 'voltou o `width: 480` solto');
  assert.ok(!/new MediaRecorder\(stream, MediaRecorder\.isTypeSupported/.test(tela), 'voltou o gravador sem teto');
});
