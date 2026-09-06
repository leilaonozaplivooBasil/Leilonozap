// 27/08/2026 — A REGRA MAIS IMPORTANTE DO NEGOCIO NAO TINHA DOCUMENTO.
//
// "Para que serve o dinheiro que o cliente deposita" vivia so em comentario de codigo
// e em migracao de banco. E o proprio VERDADE.md diz, na secao 1: "Comentario dentro de
// arquivo de codigo NAO e fonte de verdade — pode estar velho."
//
// Ou seja: a regra existia apenas onde o documento soberano manda nao confiar. O preco
// disso, medido em 27/08/2026: telas prometendo o contrario da regra, R$ 76,09 de bonus
// pagos em dobro, e uma proposta de mudar a regra circulando como se estivesse
// autorizada.
//
// Este teste garante que o documento existe, que esta na hierarquia oficial, e que as
// travas que ele declara continuam batendo com o codigo. Documento que descola do
// codigo e pior do que documento nenhum.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const doc      = ler('../docs/DOCUMENTO-OFICIAL-PASSAPORTE.md');
const verdade  = ler('../src/docs/VERDADE.md');
const finalize = ler('../api/_lib/finalizeAuctionCore.js');
const motor    = ler('../api/_lib/passaporteCoupon.js');
const modeloA  = ler('../api/_lib/passaporteBonus.js');

test('o documento esta na hierarquia do VERDADE.md', () => {
  // Documento oficial fora da hierarquia nao e oficial — e mais um .md solto, que a
  // propria hierarquia classifica como "HISTORICO, nao vale como regra".
  assert.match(verdade, /docs\/DOCUMENTO-OFICIAL-PASSAPORTE\.md/,
    'o documento saiu da hierarquia de autoridade');
});

test('o documento declara a regra do dono, sem suavizar', () => {
  // As tres frases que o dono ditou em 27/08/2026, por escrito e em audio.
  assert.match(doc, /Jamais o cliente pode usar/);
  assert.match(doc, /O depósito da carteira é somente pro leilão/);
  assert.match(doc, /seu dinheiro volta com mais 10%/,
    'sumiu o desfecho da regra: o valor do lance volta acrescido de 10%');
});

test('o documento admite onde o sistema NAO cumpre a regra', () => {
  // Documento que so descreve a regra e esconde a divergencia serve para
  // discussao, nao para operar. A secao 7 tem que continuar existindo.
  assert.match(doc, /ONDE O SISTEMA NÃO CUMPRE ESTA REGRA HOJE/);
  assert.match(doc, /O principal do lance não chega na Loja Virtual/);
  assert.match(doc, /A Loja Virtual não aceita saldo de carteira/);
});

test('a frase errada do HANDOFF-SKILLS nao voltou, nas duas copias', () => {
  // Ela dizia "bonus automatico de 10% na carteira" — modelo que acabou em 19/08.
  for (const rel of ['../docs/HANDOFF-SKILLS.md', '../src/docs/HANDOFF-SKILLS.md']) {
    const t = ler(rel);
    assert.ok(!/Passaporte de Lances \(produto com bônus automático de 10% na carteira\)/.test(t),
      `voltou a descricao errada do Passaporte em ${rel}`);
    assert.match(t, /DOCUMENTO-OFICIAL-PASSAPORTE\.md/,
      `${rel} parou de apontar para o documento oficial`);
  }
});

test('as travas declaradas batem com o codigo — libera so no encerramento', () => {
  assert.match(doc, /exclusivamente.*no encerramento do leilão/i);
  assert.match(finalize, /liberarCupomPassaporte\(participanteId, auctionId, maiorLance\)/,
    'o documento promete uma trava que o codigo nao tem mais');
});

test('as travas declaradas batem com o codigo — modelo antigo isolado', () => {
  assert.match(doc, /bonus_creditado_em/);
  assert.match(motor,   /bonus_creditado_em=is\.null/,     'o motor atual voltou a tocar cupom do modelo antigo');
  assert.match(modeloA, /bonus_creditado_em=not\.is\.null/, 'o recolhimento voltou a confiar so no rotulo');
});

test('as travas declaradas batem com o codigo — ser coberto nao libera', () => {
  assert.match(doc, /Ser coberto \*\*não\*\* libera nada para a loja/);
  const bidHold = ler('../api/_lib/bidHold.js');
  assert.ok(!/^\s*[^/]*\bliberarCupomPassaporte\(/m.test(bidHold),
    'voltou a liberar credito quando o cliente e apenas coberto');
});

test('a versao do termo no documento e a mesma que o codigo exige', () => {
  const termo = ler('../src/lib/passaporteTermo.js');
  const versaoNoCodigo = termo.match(/VERSAO_TERMO_PASSAPORTE = '([^']+)'/)?.[1];
  assert.ok(versaoNoCodigo, 'sumiu a versao do termo do codigo');
  assert.ok(doc.includes(versaoNoCodigo),
    `o documento cita uma versao de termo diferente da que o codigo exige (${versaoNoCodigo})`);
});

test('o deposito minimo do documento e o mesmo do codigo', () => {
  assert.match(motor, /export const DEPOSITO_MINIMO = 100;/);
  assert.match(doc, /R\$ 100,00 ou mais/, 'o documento descolou do deposito minimo real');
});

test('o documento mantem a lista de pendencias abertas', () => {
  // Pendencia que some do documento vira pendencia que ninguem lembra.
  for (const p of [/lances órfãos/i, /não existe registro de quem apagou/i, /Reserva feita sem lance/i]) {
    assert.match(doc, p, 'uma pendencia aberta sumiu do documento sem ser resolvida');
  }
});
