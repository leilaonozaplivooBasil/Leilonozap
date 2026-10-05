// 🔑 O crachá de sessão no navegador (26/09/2026) — "sua sessão expirou" na hora do lance.
// Chamado do Paim: a Lilian depositou de manhã e não conseguiu dar lance; o site pedia
// para sair e entrar de novo, sem botão. O crachá dela (cadastro de 21/08) tinha vencido.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { situacaoDoCracha } from '../src/lib/sessaoCliente.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const cracha = (x) => `v1.${b64url({ u: 'abc', x })}.assinatura`;
const AGORA = 1_700_000_000_000;

test('lê a validade de DENTRO do crachá, sem servidor: ok, vencido, sem crachá, formato', () => {
  assert.equal(situacaoDoCracha(cracha(AGORA + 1000), AGORA), 'ok');
  assert.equal(situacaoDoCracha(cracha(AGORA - 1000), AGORA), 'vencido', 'o caso da Lilian: 30 dias depois do cadastro');
  assert.equal(situacaoDoCracha('', AGORA), 'sem_cracha', 'quem estava logado antes do crachá existir');
  assert.equal(situacaoDoCracha('lixo', AGORA), 'formato');
  assert.equal(situacaoDoCracha(`v0.${b64url({ u: 'a', x: AGORA + 1 })}.s`, AGORA), 'formato');
  assert.equal(situacaoDoCracha(`v1.${b64url({ x: AGORA + 1 })}.s`, AGORA), 'formato', 'sem usuário dentro não é crachá');
});

test('🔴 o aviso da sala tem o botão "Entrar de novo" — e o Layout avisa ANTES, na chegada, com o mesmo botão', () => {
  const B = ler('../src/components/auction/FreteLanceBanner.jsx');
  assert.match(B, /pedirNovoLogin/, 'o banner de sessão vencida precisa oferecer o login ali mesmo');
  assert.match(B, /Entrar de novo/);
  const L = ler('../src/Layout.jsx');
  assert.match(L, /situacaoDoCracha\(\)/, 'o Layout precisa conferir o crachá na chegada');
  assert.match(L, /CHAVE_RELOGIN/, 'depois de entrar de novo a tela recarrega para a sala ver o usuário novo');
});
