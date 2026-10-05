// 🐢➡️🐇 Scripts de terceiros depois da tela; login do Google sob demanda (27/09/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { depoisDaTela } from '../src/lib/terceirosDepoisDaTela.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

function janelaFalsa(estado) {
  const ouvintes = {}; const ociosos = [];
  return {
    document: { readyState: estado },
    addEventListener: (ev, fn) => { ouvintes[ev] = fn; },
    requestIdleCallback: (fn, op) => { ociosos.push([fn, op]); },
    setTimeout: () => {},
    disparar: (ev) => ouvintes[ev]?.(),
    ociosos,
  };
}

test('antes do load nada roda; depois do load, roda quando o navegador fica ocioso (até 3 s)', () => {
  const w = janelaFalsa('loading'); let rodou = 0;
  depoisDaTela(() => { rodou++; }, w);
  assert.equal(rodou, 0); assert.equal(w.ociosos.length, 0);
  w.disparar('load');
  assert.equal(w.ociosos.length, 1); assert.deepEqual(w.ociosos[0][1], { timeout: 3000 });
  w.ociosos[0][0](); w.ociosos[0][0]();
  assert.equal(rodou, 1, 'uma vez só');
});

test('página já carregada: vai direto para a fila de ocioso', () => {
  const w = janelaFalsa('complete'); let rodou = 0;
  depoisDaTela(() => { rodou++; }, w);
  assert.equal(w.ociosos.length, 1); w.ociosos[0][0](); assert.equal(rodou, 1);
});

test('index.html: filas na hora, scripts só depois do load; gsi fora da página', () => {
  const H = ler('../index.html');
  assert.doesNotMatch(H, /<script[^>]+src="https:\/\/www\.googletagmanager\.com/, 'gtag/gtm não entram mais direto');
  assert.doesNotMatch(H, /<script[^>]+src="https:\/\/accounts\.google\.com\/gsi\/client"/, 'login do Google só sob demanda');
  assert.match(H, /gtag\('config', 'G-YS4W9104X6'\);/);
  assert.match(H, /window\.dataLayer\.push\(\{ 'gtm\.start'/);
  assert.match(H, /h\.DD_RUM = h\.DD_RUM \|\| \{ q: \[\], onReady/);
  assert.match(H, /w\.addEventListener\('load', ocioso, \{ once: true \}\)/);
  for (const u of ['gtm.js?id=GTM-K2KHK4CB', 'gtag/js?id=G-YS4W9104X6', 'datadog-rum.js']) assert.ok(H.includes(u), u);
  assert.match(H, /googletagmanager\.com\/ns\.html\?id=GTM-K2KHK4CB/, 'o noscript do GTM continua');
});

test('Pixel da Meta: fila na hora, script depois da tela', () => {
  const P = ler('../src/lib/metaPixel.js');
  assert.match(P, /import \{ depoisDaTela \} from '\.\/terceirosDepoisDaTela\.js';/);
  assert.match(P, /n\.queue = \[\];\s*depoisDaTela\(\(\) => \{/);
  assert.match(P, /t\.src = 'https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js';/);
});

test('login e cadastro pedem o script do Google na hora em que abrem', () => {
  for (const f of ['../src/components/common/LoginModal.jsx', '../src/pages/Register.jsx']) {
    const T = ler(f);
    assert.match(T, /import \{ garantirScriptGoogle \} from '@\/lib\/googleLogin';/, f);
    assert.match(T, /let attempts = 0;\s*garantirScriptGoogle\(\);/, f);
    assert.match(T, /attempts < 60/, f);
  }
});
