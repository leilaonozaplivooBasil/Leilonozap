// 🔑 "Já tem conta? Entrar" no convite de cadastro (08/10/2026) — caso Renan Silva.
//
// O que se prova aqui:
//   1. a função marca a renovação de sessão, fecha o convite e abre o login;
//   2. sem storage/janela ela não quebra (modo privado, SSR);
//   3. o popup tem o botão e chama a função com o onClose;
//   4. no Layout, o link alheio é apagado ANTES do recarregar da renovação —
//      senão o código da outra vendedora sobrevivia ao login.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { entrarPeloConvite } from '../src/lib/entrarPeloConvite.js';
import { CHAVE_RELOGIN } from '../src/lib/sessaoCliente.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

function storageFalso() {
  const m = new Map();
  return { setItem: (k, v) => m.set(k, String(v)), getItem: (k) => (m.has(k) ? m.get(k) : null), removeItem: (k) => m.delete(k), _m: m };
}

test('marca a renovação, fecha o convite e abre o login — nesta ordem', () => {
  const st = storageFalso();
  const passos = [];
  const janela = { dispatchEvent: (ev) => { passos.push(`evento:${ev.type}`); return true; } };
  entrarPeloConvite({ fechar: () => passos.push('fechar'), storage: st, janela });
  assert.equal(st.getItem(CHAVE_RELOGIN), '1', 'ao entrar, a tela recarrega com a conta certa');
  assert.deepEqual(passos, ['fechar', 'evento:openLoginModal']);
});

test('sem storage, sem janela e sem onClose não quebra', () => {
  assert.doesNotThrow(() => entrarPeloConvite({ storage: null, janela: null }));
  const quebrado = { setItem() { throw new Error('modo privado'); } };
  assert.doesNotThrow(() => entrarPeloConvite({ storage: quebrado, janela: null, fechar: () => { throw new Error('já sumiu'); } }));
});

test('o convite tem "Já tem conta? Entrar" e passa o onClose', () => {
  const src = semComentarios(ler('../src/components/common/GuestRegistrationModal.jsx'));
  assert.match(src, /Já tem conta\?/);
  assert.match(src, /entrarPeloConvite\(\{ fechar: onClose \}\)/);
  assert.match(src, /data-teste="convite-entrar"/);
});

test('no login, o link alheio é apagado ANTES do recarregar da renovação', () => {
  const src = semComentarios(ler('../src/Layout.jsx'));
  const limpa = src.indexOf('if (user?.referred_by_id) {\n                clearReferral();');
  const recarrega = src.indexOf('sessionStorage.getItem(CHAVE_RELOGIN)');
  assert.ok(limpa > 0 && recarrega > 0, 'os dois trechos existem');
  assert.ok(limpa < recarrega, 'clearReferral vem antes do reload');
});
