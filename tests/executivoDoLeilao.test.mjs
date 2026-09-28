// 🎯 28/09/2026 — "ganha 10% no final do leilão" (dono). Ver api/_lib/executivoDoLeilao.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { executivoDoArremate, PCT_EXECUTIVO_LEILAO, FORA_DA_REGRA_DO_EXECUTIVO } from '../api/_lib/executivoDoLeilao.js';

const LUIZ = '68db0ff2c19838a827fb6e5f';
const base = {
  [LUIZ]: { id: LUIZ, full_name: 'LUIZ SANTANNA', career_levels: ['executivo_conta', 'ceo'], active: true },
  rib: { id: 'rib', full_name: 'Ribeiro', career_levels: ['parceiro', 'executivo_conta'], active: true, referred_by_id: LUIZ },
  iara: { id: 'iara', full_name: 'Iara', career_levels: ['executivo_conta'], active: false, referred_by_id: LUIZ },
  vend: { id: 'vend', full_name: 'Vendedora', career_levels: ['vendedor'], active: true, referred_by_id: 'rib' },
  cli: { id: 'cli', full_name: 'Cliente', career_levels: ['usuario'], active: true, referred_by_id: 'vend' },
  cliLuiz: { id: 'cliLuiz', full_name: 'Cliente do Luiz', career_levels: ['usuario'], active: true, referred_by_id: LUIZ },
  cliIara: { id: 'cliIara', full_name: 'Cliente da Iara', career_levels: ['usuario'], active: true, referred_by_id: 'iara' },
  designado: { id: 'designado', full_name: 'Cliente com executivo fixado', career_levels: ['usuario'], active: true, referred_by_id: LUIZ, licenciado_context: JSON.stringify({ executive_owner_id: 'rib' }) },
  orfao: { id: 'orfao', full_name: 'Sem indicador', career_levels: ['usuario'], active: true },
};
const buscar = async (id) => base[id] || null;
const exec = async (id) => (await executivoDoArremate(base[id], buscar))?.id || null;

test('10%, e a conta do dono está fora da regra', () => {
  assert.equal(PCT_EXECUTIVO_LEILAO, 10);
  assert.ok(FORA_DA_REGRA_DO_EXECUTIVO.has(LUIZ));
});

test('sobe a linha até o primeiro executivo (cliente → vendedora → Ribeiro)', async () => {
  assert.equal(await exec('cli'), 'rib');
});

test('🔴 linha que chega no dono: a fatia fica com a empresa', async () => {
  assert.equal(await exec('cliLuiz'), null);
});

test('executivo designado para a pessoa vence a árvore', async () => {
  assert.equal(await exec('designado'), 'rib');
});

test('executivo inativo não recebe; sem ninguém acima, fica com a empresa', async () => {
  assert.equal(await exec('cliIara'), null, 'Iara inativa → sobe para o dono → empresa');
  assert.equal(await exec('orfao'), null);
});

test('quem arrematou não ganha 10% do próprio arremate', async () => {
  assert.equal(await exec('rib'), null, 'Ribeiro arrematando: sobe para o dono → empresa');
});

test('o martelo credita pelo banco, grava a linha e só então conta como distribuído', () => {
  const F = readFileSync(new URL('../api/_lib/finalizeAuctionCore.js', import.meta.url), 'utf8');
  const bloco = F.slice(F.indexOf('EXECUTIVO GANHA 10% NO ARREMATE'), F.indexOf('PONTO 100: o que dos 30% da rede'));
  assert.match(bloco, /is_test_auction !== true/);
  assert.match(bloco, /money\(finalPrice \* PCT_EXECUTIVO_LEILAO \/ 100\)/);
  assert.match(bloco, /rpc\/credit_commission/);
  assert.match(bloco, /if \(r\.ok\) \{\s*pctDistribuido = money\(pctDistribuido \+ PCT_EXECUTIVO_LEILAO\);/);
  assert.match(bloco, /role: 'leilao_executivo'/);
  assert.ok(F.indexOf('EXECUTIVO GANHA 10%') > F.indexOf('pctDistribuido = PCT_INDICADOR_LEILAO'), 'depois dos 5% (que atribuem, não somam)');
});
