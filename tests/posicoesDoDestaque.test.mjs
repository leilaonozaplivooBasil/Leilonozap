// 🌟 POSIÇÕES DO DESTAQUE (28/09/2026) — "não consigo botar +1 destaque".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mapaDePosicoes, destaquesEmCartaz, POSICOES_DO_DESTAQUE } from '../src/lib/posicoesDoDestaque.js';

const AGORA = new Date('2026-09-28T18:30:00Z');
const f = (id, pos, aid, extra = {}) => ({ id, sort_order: pos, is_active: true, name: aid, raw_base44: { auction_id: aid }, ...extra });
// o retrato de 28/09: 4 dos 6 destaques eram de leilões já encerrados
const LINHAS = [
  f('fps5', 0, 'ps5'), f('fiph', 1, 'iphone'), f('fsec', 2, 'secador'), f('fpat', 3, 'patinete'),
  f('fhar', 4, 'harley'), f('fimp', 5, 'impressora'), f('frel', 6, 'relogio'),
  f('fair', 6, 'airfryer', { is_active: false }), f('fsem', 3, null),
];
const LEILOES = {
  ps5: { id: 'ps5', status: 'ended' }, secador: { id: 'secador', status: 'ended' }, patinete: { id: 'patinete', status: 'ended' },
  relogio: { id: 'relogio', status: 'ended' }, airfryer: { id: 'airfryer', status: 'ended' },
  iphone: { id: 'iphone', status: 'active', end_time: '2026-10-02T21:00:00Z' },
  harley: { id: 'harley', status: 'active', end_time: '2026-09-29T21:33:00Z' },
  impressora: { id: 'impressora', status: 'active', end_time: '2026-10-05T21:00:00Z' },
};

test('🔴 destaque de leilão encerrado NÃO segura posição — fica livre para o próximo', () => {
  const { ocupadas, vencidas } = mapaDePosicoes(LINHAS, LEILOES, 'novo', AGORA);
  assert.deepEqual(Object.keys(ocupadas).sort(), ['1', '4', '5']);
  assert.deepEqual(Object.keys(vencidas).sort(), ['2', '3', '6']);
  assert.equal(vencidas[2].featuredId, 'fsec', 'é esta linha que o Editar Leilão desliga ao reusar a posição');
  const livres = POSICOES_DO_DESTAQUE.filter((p) => !ocupadas[p]);
  assert.deepEqual(livres, [2, 3, 6], 'antes de 28/09: nenhuma — a chave dava "Posição ocupada"');
});

test('leilão vencido pelo relógio (ainda "active" no banco) também libera a posição', () => {
  const l = { ...LEILOES, harley: { id: 'harley', status: 'active', end_time: '2026-09-28T18:00:00Z' } };
  assert.ok(mapaDePosicoes(LINHAS, l, 'novo', AGORA).vencidas[4]);
});

test('se a consulta dos leilões falhar, ninguém é desligado por engano', () => {
  const { ocupadas, vencidas } = mapaDePosicoes(LINHAS, null, 'novo', AGORA);
  assert.deepEqual(vencidas, {});
  assert.deepEqual(Object.keys(ocupadas).sort(), ['1', '2', '3', '4', '5', '6']);
});

test('o próprio leilão não conta como ocupando a posição dele', () => {
  assert.equal(mapaDePosicoes(LINHAS, LEILOES, 'iphone', AGORA).ocupadas[1], undefined);
});

test('na mesma posição, o vivo vence o vencido', () => {
  const linhas = [f('a', 2, 'secador'), f('b', 2, 'iphone')];
  const { ocupadas, vencidas } = mapaDePosicoes(linhas, LEILOES, 'novo', AGORA);
  assert.equal(ocupadas[2].id, 'iphone');
  assert.equal(vencidas[2], undefined);
});

test('🔴 Home: encerrado não come vaga dos 6', () => {
  const extras = [f('x1', 7, 'a1'), f('x2', 8, 'a2'), f('x3', 9, 'a3'), f('x4', 10, 'a4')];
  const leiloes = { ...LEILOES };
  for (const id of ['a1', 'a2', 'a3', 'a4']) leiloes[id] = { id, status: 'active', end_time: '2026-10-10T00:00:00Z' };
  const mostra = destaquesEmCartaz([...LINHAS, ...extras], leiloes, 6, AGORA).map((a) => a.id);
  assert.deepEqual(mostra, ['iphone', 'harley', 'impressora', 'a1', 'a2', 'a3'], 'antes: só iphone, harley e impressora');
});

test('as duas telas usam a régua única', () => {
  const E = readFileSync(new URL('../src/pages/EditAuction.jsx', import.meta.url), 'utf8');
  const H = readFileSync(new URL('../src/components/home/DestaquesLeiloes.jsx', import.meta.url), 'utf8');
  assert.match(E, /mapaDePosicoes\(linked, leiloes, auctionId\)/);
  assert.match(E, /await liberarPosicaoVencida\(featuredPosition\);/);
  assert.match(E, /await liberarPosicaoVencida\(newPos\);/);
  assert.match(H, /destaquesEmCartaz\(featured, byId\)/);
  assert.doesNotMatch(H, /\.slice\(0, 6\)/, 'o corte dos 6 antes do filtro era o defeito');
});
