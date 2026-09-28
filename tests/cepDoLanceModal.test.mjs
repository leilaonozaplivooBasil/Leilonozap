// 📮 MODAL DO CEP DO LANCE (28/09/2026) — ver src/components/auction/CepDoLanceModal.jsx.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { abreModalDeCep, formatarCep, bloqueioDoFrete } from '../src/lib/freteDoLance.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const semComentario = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

test('máscara do CEP aceita o que a pessoa colar', () => {
  assert.equal(formatarCep('20000000'), '20000-000');
  assert.equal(formatarCep('20.000-000'), '20000-000');
  assert.equal(formatarCep('2000'), '2000');
  assert.equal(formatarCep('200001'), '20000-1');
  assert.equal(formatarCep('2000000099'), '20000-000', 'no máximo 8 números');
  assert.equal(formatarCep(null), '');
});

test('o modal abre quando o que falta é CEP ou endereço — o resto segue com a frase própria', () => {
  for (const s of ['idle', 'needs_cep', 'error', 'loading', 'needs_address']) assert.equal(abreModalDeCep(s), true, s);
  for (const s of ['ok', 'a_combinar', 'needs_login', 'produto_grande']) assert.equal(abreModalDeCep(s), false, s);
  // a régua do lance não mudou: sem CEP continua travando
  assert.ok(bloqueioDoFrete({ status: 'needs_cep' }));
});

test('🔴 a sala não usa mais alert() para pedir CEP — abre o modal no lance e no arremate', () => {
  const S = ler('../src/pages/AuctionRoom.jsx');
  assert.doesNotMatch(S, /if \(semFrete\) \{ alert\(semFrete\); return; \}/);
  assert.doesNotMatch(S, /if \(semFreteArremate\) \{ alert\(semFreteArremate\); return; \}/);
  assert.match(S, /if \(abreModalDeCep\(freteStatus\)\) \{ setModalCep\(\{ tipo: 'lance', valor: amount \}\); return; \}/);
  assert.match(S, /if \(abreModalDeCep\(freteStatus\)\) \{ setModalCep\(\{ tipo: 'arremate'/);
  // o "Continuar" volta pelo MESMO caminho (termo, saldo, confirmação), com a régua lendo o estado novo
  assert.match(S, /if \(!acaoLiberada \|\| freteBloqueia\(\)\) return;/);
  assert.match(S, /liberado=\{!freteBloqueia\(\)\}/);
});

test('texto do modal: sem vermelho, sem amarelo, sem emoji', () => {
  const M = semComentario(ler('../src/components/auction/CepDoLanceModal.jsx'));
  assert.doesNotMatch(M, /\b(?:text|bg|border|ring)-(?:red|rose|amber|yellow|orange)-/);
  assert.doesNotMatch(M, /nz-fogo|nz-ouro/);
  assert.doesNotMatch(M, /\p{Extended_Pictographic}/u);
  assert.doesNotMatch(M, /\balert\(/);
});
