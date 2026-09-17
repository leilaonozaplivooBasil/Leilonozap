/**
 * 🗓️ QUANDO O LEILÃO ENCERRA — dito antes de publicar.
 *
 * Caso real (17/09/2026): quatro relógios cadastrados em 16/09 às 14:15~14:20
 * saíram com 72h quando o pedido era 48h. O seletor de duração está correto
 * (172800 = 2 dias, 259200 = 3 dias) e a contagem regressiva também. O que
 * faltava era mostrar a conta pronta pro operador.
 *
 * Estes testes travam o que importa:
 *   1. os segundos do seletor viram a data certa, no fuso de Brasília;
 *   2. 48h e 72h caem em DIAS DIFERENTES — que é o erro que se quer evitar;
 *   3. duração podre não vira "Invalid Date" na cara do operador;
 *   4. a tela realmente mostra a frase (senão a lib é um enfeite).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fimDoLeilao, textoDoFim, FUSO_DO_LEILAO } from '../src/lib/fimDoLeilao.js';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

// o instante exato em que o primeiro relógio foi cadastrado (16/09 14:15 BRT)
const CADASTRO_DOS_RELOGIOS = new Date('2026-09-16T17:15:00.000Z');

test('o fuso é o de Brasília, não o de quem cadastrou', () => {
  assert.equal(FUSO_DO_LEILAO, 'America/Sao_Paulo');
});

test('72h a partir do cadastro real cai no sábado 19/09 — o que de fato aconteceu', () => {
  assert.equal(textoDoFim('259200', CADASTRO_DOS_RELOGIOS), 'sábado, 19/09/2026 às 14:15');
});

test('48h, o que o operador queria, cai na sexta 18/09', () => {
  assert.equal(textoDoFim('172800', CADASTRO_DOS_RELOGIOS), 'sexta-feira, 18/09/2026 às 14:15');
});

test('48h e 72h caem em dias diferentes — é isso que a frase deixa visível', () => {
  const quarentaEOito = textoDoFim('172800', CADASTRO_DOS_RELOGIOS);
  const setentaEDuas = textoDoFim('259200', CADASTRO_DOS_RELOGIOS);
  assert.notEqual(quarentaEOito, setentaEDuas);
  assert.match(quarentaEOito, /sexta-feira, 18\/09\/2026/);
  assert.match(setentaEDuas, /sábado, 19\/09\/2026/);
});

test('cada opção do seletor vira a data certa', () => {
  const base = new Date('2026-09-16T17:15:00.000Z'); // 14:15 BRT
  assert.equal(textoDoFim('3600', base),    'quarta-feira, 16/09/2026 às 15:15'); // 1 hora
  assert.equal(textoDoFim('43200', base),   'quinta-feira, 17/09/2026 às 02:15'); // 12h, vira o dia
  assert.equal(textoDoFim('86400', base),   'quinta-feira, 17/09/2026 às 14:15'); // 1 dia
  assert.equal(textoDoFim('604800', base),  'quarta-feira, 23/09/2026 às 14:15'); // 1 semana
  assert.equal(textoDoFim('1296000', base), 'quinta-feira, 01/10/2026 às 14:15'); // 15 dias, vira o mês
});

test('o instante devolvido é exatamente agora + duração', () => {
  const base = new Date('2026-09-16T17:15:00.000Z');
  const fim = fimDoLeilao('259200', base);
  assert.equal(fim.getTime() - base.getTime(), 259200 * 1000);
  assert.equal(fim.toISOString(), '2026-09-19T17:15:00.000Z');
});

test('duração podre não vira frase nenhuma — a tela esconde a linha', () => {
  for (const ruim of ['', null, undefined, 'abc', '0', '-60', NaN, {}]) {
    assert.equal(fimDoLeilao(ruim, CADASTRO_DOS_RELOGIOS), null, `fimDoLeilao(${String(ruim)})`);
    assert.equal(textoDoFim(ruim, CADASTRO_DOS_RELOGIOS), '', `textoDoFim(${String(ruim)})`);
  }
});

test('instante base inválido também não inventa data', () => {
  assert.equal(fimDoLeilao('86400', new Date('nada')), null);
  assert.equal(textoDoFim('86400', 'nada'), '');
});

test('a tela de cadastro mostra a frase abaixo do seletor de duração', () => {
  const tela = readFileSync(path.join(RAIZ, 'src/components/admin/PriceSection.jsx'), 'utf8');
  assert.match(tela, /import \{ textoDoFim \} from '@\/lib\/fimDoLeilao'/,
    'PriceSection precisa usar a lib, não repetir a conta');
  assert.match(tela, /const fimPrevisto = textoDoFim\(formData\.duration, agora\)/,
    'a frase tem que sair da duração escolhida, não de um valor fixo');
  assert.match(tela, /data-teste="fim-previsto"/,
    'a linha precisa de âncora pro teste de navegador');
  assert.match(tela, /horário de Brasília/,
    'sem dizer o fuso, a hora é ambígua para quem cadastra de fora');
});
