// 🃏 PADRÃO DOS CARDS (25/09/2026) — regras puras e a guarda de produção.
// Dono: "os cards ficam sempre diferentes uns dos outros… quero opção de
// solução". A e B existem para o dono ESCOLHER; até lá a Home segue no 'atual'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { PADROES_DO_CARD, contagemCurta, nomeDoLider } from '../src/lib/padraoDoCard.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('a contagem curta só encurta semana; dias e HH:MM:SS ficam', () => {
  assert.equal(contagemCurta('1 semana'), '1 sem');
  assert.equal(contagemCurta('2 semanas'), '2 sem');
  assert.equal(contagemCurta('4 dias'), '4 dias');
  assert.equal(contagemCurta('00:09:12'), '00:09:12');
  assert.equal(contagemCurta(null), '');
});

test('o nome do líder na pílula: primeiro nome + inicial do ÚLTIMO sobrenome (sem partícula)', () => {
  assert.equal(nomeDoLider('Ângela Maria Rocha dos Santos'), 'Ângela S.');
  assert.equal(nomeDoLider('Rosenberg de Oliveira'), 'Rosenberg O.');
  assert.equal(nomeDoLider('Henrique'), 'Henrique');
  assert.equal(nomeDoLider(''), '');
});

test('🔒 produção segue no padrão ATUAL até o dono escolher: a Home não passa `padrao`', () => {
  assert.deepEqual([...PADROES_DO_CARD], ['atual', 'a', 'b']);
  const H = ler('../src/pages/Home.jsx');
  assert.doesNotMatch(H, /padrao=/);
  const C = ler('../src/components/auction/AuctionCard.jsx');
  assert.match(C, /padrao = "atual"/);
  assert.match(C, /const padronizado = padrao !== 'atual';/);
});
