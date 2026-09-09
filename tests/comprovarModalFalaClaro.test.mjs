// 🗣️ O modal de comprovação do X-GAME falando a língua de quem lê
// (chamado do Paim, 07/09/2026: escreveu 18 letras, o contador disse
// "18/400 caracteres", ele leu "18 de um limite de 400" e o botão
// "Comprovar e concluir" nunca acendeu — sem nada na tela dizendo por quê).
//
// O mínimo de 400 NÃO muda (decisão do dono). O que muda é o que a tela fala.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  RESUMO_MIN, faltaDoResumo, textoDoContador, motivoDoBotaoTravado,
} from '../src/lib/xgame.js';
import { abrirCamada, temCamadaAberta, ouvirCamada, zerarCamadas } from '../src/lib/camadaModal.js';

const MODAL = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/XGameComprovarModal.jsx', import.meta.url), 'utf8');
const XMUSIC = fs.readFileSync(new URL('../src/components/licensing/XMusic.jsx', import.meta.url), 'utf8');
const LEILA = fs.readFileSync(new URL('../src/components/loja/LojaFloatActions.jsx', import.meta.url), 'utf8');

// ── a regra do dono não se mexe ──────────────────────────────────────
test('o mínimo continua 400 — a correção é de texto, não de exigência', () => {
  assert.equal(RESUMO_MIN, 400);
});

// ── 1. o contador diz quanto FALTA ───────────────────────────────────
test('faltaDoResumo: conta o que falta, nunca negativo, ignorando espaço nas pontas', () => {
  assert.equal(faltaDoResumo(''), 400);
  assert.equal(faltaDoResumo('a'.repeat(18)), 382);          // o caso do Paim
  assert.equal(faltaDoResumo('   ' + 'a'.repeat(18) + '  '), 382);
  assert.equal(faltaDoResumo('a'.repeat(400)), 0);
  assert.equal(faltaDoResumo('a'.repeat(900)), 0);           // passar do mínimo não vira dívida
  assert.equal(faltaDoResumo(null), 400);
});

test('textoDoContador: avisa o tamanho ANTES de escrever, depois diz o que falta', () => {
  assert.equal(textoDoContador(''), 'escreva pelo menos 400 caracteres (umas 6 linhas)');
  assert.equal(textoDoContador('a'.repeat(18)), 'faltam 382 caracteres');
  assert.equal(textoDoContador('a'.repeat(399)), 'falta 1 caractere', 'plural quebrado estraga o que o conserto veio fazer');
  assert.equal(textoDoContador('a'.repeat(398)), 'faltam 2 caracteres');
  assert.equal(textoDoContador('a'.repeat(400)), '✔ resumo no tamanho');
});

test('textoDoContador NUNCA volta ao formato "18/400", que é o que enganava', () => {
  for (const n of [0, 1, 18, 200, 399, 400, 800]) {
    assert.ok(!/\d+\s*\/\s*400/.test(textoDoContador('a'.repeat(n))), `voltou a X/400 com ${n}`);
  }
});

// ── 2. o botão apagado explica o motivo ──────────────────────────────
test('motivoDoBotaoTravado: sem foto, o texto diz que falta a foto', () => {
  assert.equal(motivoDoBotaoTravado({ tipo: 'aprendizado', temFoto: false, texto: 'a'.repeat(400) }), 'falta a foto do estudo para liberar');
  assert.equal(motivoDoBotaoTravado({ tipo: 'foto', temFoto: false, texto: '' }), 'falta a foto para liberar');
});

test('motivoDoBotaoTravado: com foto e resumo curto, diz quantas letras faltam', () => {
  assert.equal(motivoDoBotaoTravado({ tipo: 'aprendizado', temFoto: true, texto: 'a'.repeat(18) }), 'escreva mais 382 caracteres para liberar');
  assert.equal(motivoDoBotaoTravado({ tipo: 'aprendizado', temFoto: true, texto: 'a'.repeat(399) }), 'escreva mais 1 caractere para liberar');
});

test('motivoDoBotaoTravado: liberado devolve vazio — nada aparece embaixo do botão', () => {
  assert.equal(motivoDoBotaoTravado({ tipo: 'aprendizado', temFoto: true, texto: 'a'.repeat(400) }), '');
  assert.equal(motivoDoBotaoTravado({ tipo: 'foto', temFoto: true, texto: '' }), '');
  assert.equal(motivoDoBotaoTravado({ tipo: 'instagram', temFoto: true, texto: '' }), '');
});

test('o motivo do botão bate com a regra que habilita o botão — nunca "travado sem motivo"', () => {
  const casos = [
    { tipo: 'aprendizado', temFoto: false, texto: '' },
    { tipo: 'aprendizado', temFoto: true, texto: 'a'.repeat(18) },
    { tipo: 'aprendizado', temFoto: true, texto: 'a'.repeat(400) },
    { tipo: 'foto', temFoto: false, texto: '' },
    { tipo: 'foto', temFoto: true, texto: '' },
  ];
  for (const c of casos) {
    const podeConcluir = c.tipo === 'aprendizado'
      ? c.temFoto && c.texto.trim().length >= RESUMO_MIN
      : c.temFoto;
    assert.equal(motivoDoBotaoTravado(c) === '', podeConcluir, JSON.stringify(c));
  }
});

// ── a tela usa mesmo essas funções ───────────────────────────────────
test('o modal usa textoDoContador e não monta mais o "X/400" na mão', () => {
  // 09/09/2026 — ganhou o 2º argumento (tipo) pro estudo de fim de semana
  // usar o mínimo maior (RESUMO_MIN_FDS) em vez do de sempre.
  assert.match(MODAL, /textoDoContador\(texto, tipo\)/);
  assert.ok(!MODAL.includes('${texto.trim().length}/${RESUMO_MIN} caracteres'));
});

test('o modal mostra o mínimo antes de a pessoa escrever e explica o botão travado', () => {
  assert.match(MODAL, /no mínimo/);
  assert.match(MODAL, /data-teste="motivo-travado"/);
  assert.match(MODAL, /motivoDoBotaoTravado\(\{ tipo, temFoto: !!file, texto \}\)/);
});

// ── 3. flutuante não cobre mais o botão ──────────────────────────────
test('camadaModal: conta modais abertos e avisa quem escuta', () => {
  zerarCamadas();
  const vistos = [];
  const parar = ouvirCamada((v) => vistos.push(v));
  assert.equal(temCamadaAberta(), false);
  const fecha1 = abrirCamada();
  assert.equal(temCamadaAberta(), true);
  const fecha2 = abrirCamada();      // modal em cima de modal
  fecha1();
  assert.equal(temCamadaAberta(), true, 'com dois abertos, fechar um não libera');
  fecha2();
  assert.equal(temCamadaAberta(), false);
  assert.deepEqual(vistos, [true, true, true, false]);
  parar();
  zerarCamadas();
});

test('camadaModal: fechar duas vezes não derruba o contador abaixo de zero', () => {
  zerarCamadas();
  const fecha = abrirCamada();
  fecha(); fecha(); fecha();
  assert.equal(temCamadaAberta(), false);
  const outro = abrirCamada();
  assert.equal(temCamadaAberta(), true, 'o contador não ficou negativo');
  outro();
  zerarCamadas();
});

test('o modal se registra na camada; X-MUSIC e Leila somem quando ela está aberta', () => {
  assert.match(MODAL, /useSegurarCamada\(\)/);
  // e o modal passa à frente do X-MUSIC (z-[60]) mesmo se o registro falhar
  assert.ok(!MODAL.includes('backdrop-blur-sm z-50'), 'o modal ainda empata em z-50');
  assert.equal((MODAL.match(/backdrop-blur-sm z-\[70\]/g) || []).length, 2);

  assert.match(XMUSIC, /const coberto = useCamadaAberta\(\);/);
  assert.match(XMUSIC, /\(rolando \|\| coberto\) && !arrastando/);

  assert.match(LEILA, /const coberto = useCamadaAberta\(\);/);
  assert.match(LEILA, /const fora = rolando \|\| coberto;/);
  assert.match(LEILA, /\$\{fora \? 'opacity-0 translate-y-3 pointer-events-none'/);
  assert.match(LEILA, /aria-hidden=\{fora\}/);
});

test('sumir de cena não desmonta o player — a música atravessa o modal', () => {
  // o iframe do X-MUSIC é montado fora de qualquer condição; `coberto` só
  // mexe em opacidade/pointer-events, como já fazia `rolando`.
  assert.ok(!/\{\s*!coberto\s*&&/.test(XMUSIC), 'o X-MUSIC passou a montar condicionalmente');
  assert.ok(!/coberto\s*\?\s*null/.test(XMUSIC));
});
