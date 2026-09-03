// "Semana passada dizia ter 1 semana para o fim, e agora segue 1 semana."
//
// 03/09/2026. Nada estava travado: a CAIXA DE SOM MONDIAL nasceu com UM MÊS de
// duração (11/08 12:28 → 11/09 12:28, ao minuto) e o contador tem resolução de
// SEMANA — "1 semana" cobre de 7,00 a 13,99 dias e fica parado sete dias.
//
// O cliente lançou em 28/08 15:09, 2h41 depois de o rótulo virar "1 semana".
// Nunca viu outra coisa. E não tinha como conferir: a sala mostra só a HORA do
// lance, nunca a data.
//
// Fase 1: mostrar a DATA de término. Aditivo — o contador atual não é tocado.
// A regra é: ou sai uma data confiável, ou sai VAZIO e a tela fica como está.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  dataDeTermino, textoDeTermino, instanteDeTermino, terminaEmOutroAno, FUSO_DA_CASA,
} from '../src/lib/relogioLeilao.js';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

// O caso real, com o valor exato do banco.
const MONDIAL_FIM = '2026-09-11T15:28:00+00:00';   // = 11/09 12:28 em Brasília

// ─────────────── o que o cliente precisava ver ───────────────

test('a data que teria evitado o chamado', () => {
  assert.equal(dataDeTermino(MONDIAL_FIM), '11/09 às 12:28');
});

test('a hora sai no fuso da CASA, não no do aparelho', () => {
  // Se saísse no fuso do visitante, o MESMO leilão terminaria em horas
  // diferentes para pessoas diferentes. Num leilão isso não é detalhe de
  // exibição, é a regra do jogo.
  assert.equal(FUSO_DA_CASA, 'America/Sao_Paulo');
  const original = process.env.TZ;
  try {
    for (const tz of ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo', 'America/New_York']) {
      process.env.TZ = tz;
      assert.equal(dataDeTermino(MONDIAL_FIM), '11/09 às 12:28', `mudou no fuso ${tz}`);
    }
  } finally {
    if (original === undefined) delete process.env.TZ; else process.env.TZ = original;
  }
});

test('aceita as três formas em que a data chega', () => {
  const esperado = '11/09 às 12:28';
  assert.equal(dataDeTermino(MONDIAL_FIM), esperado);                       // ISO do PostgREST
  assert.equal(dataDeTermino(new Date(MONDIAL_FIM)), esperado);             // objeto Date
  assert.equal(dataDeTermino(new Date(MONDIAL_FIM).getTime()), esperado);   // milissegundos
});

// ─────────────── a guarda que existe por causa de um valor medido ───────────────

test('NULO NÃO VIRA "31/12 às 21:00"', () => {
  // Esta é a razão de o arquivo ser paranoico. Medido antes de escrever:
  //   new Date(null) → "31/12, 21:00"  ← a Época de 1970 em Brasília.
  // Não parece erro: PARECE INFORMAÇÃO. Um leilão sem data de fim anunciaria
  // "Termina 31/12 às 21:00" com a maior cara de sério.
  for (const vazio of [null, undefined, '', 0, -1]) {
    const saida = dataDeTermino(vazio);
    assert.equal(saida, '', `${String(vazio)} produziu "${saida}"`);
    assert.equal(instanteDeTermino(vazio), null);
  }
  assert.ok(!dataDeTermino(null).includes('31/12'), 'a Época de 1970 vazou para a tela');
});

test('lixo sai vazio, nunca "Invalid Date" na cara do cliente', () => {
  for (const v of ['abc', 'amanhã', {}, [], NaN, Infinity, true, () => {}]) {
    const saida = dataDeTermino(v);
    assert.equal(saida, '', `${String(v)} produziu "${saida}"`);
    assert.ok(!saida.includes('Invalid'), 'vazou "Invalid Date"');
  }
});

test('nada aqui derruba a tela', () => {
  for (const v of [null, undefined, '', 'abc', {}, [], NaN, 0, -1, Symbol.iterator]) {
    assert.doesNotThrow(() => dataDeTermino(v), `explodiu em ${String(v)}`);
    assert.doesNotThrow(() => textoDeTermino(v));
    assert.doesNotThrow(() => terminaEmOutroAno(v));
  }
});

// ─────────────── o ano, quando "11/09" sozinho enganaria ───────────────

test('leilão que termina em outro ano mostra o ano', () => {
  const agora = new Date('2026-09-03T12:00:00Z').getTime();
  assert.equal(terminaEmOutroAno('2027-01-04T15:42:00Z', agora), true);
  assert.equal(textoDeTermino('2027-01-04T15:42:00Z', agora), '04/01/2027 às 12:42');
  // no mesmo ano, o ano fica de fora: é ruído
  assert.equal(terminaEmOutroAno(MONDIAL_FIM, agora), false);
  assert.equal(textoDeTermino(MONDIAL_FIM, agora), '11/09 às 12:28');
});

test('a virada do ano é decidida no fuso da casa', () => {
  // 01/01/2027 00:30 UTC ainda é 31/12/2026 21:30 em Brasília: mesmo ano.
  const agora = new Date('2026-12-30T12:00:00Z').getTime();
  assert.equal(terminaEmOutroAno('2027-01-01T00:30:00Z', agora), false);
  assert.equal(textoDeTermino('2027-01-01T00:30:00Z', agora), '31/12 às 21:30');
});

// ─────────────── horários de borda ───────────────

test('meia-noite e meio-dia não se confundem', () => {
  assert.equal(dataDeTermino('2026-09-11T03:00:00Z'), '11/09 às 00:00');  // 00:00 BRT
  assert.equal(dataDeTermino('2026-09-11T15:00:00Z'), '11/09 às 12:00');  // 12:00 BRT
  assert.equal(dataDeTermino('2026-09-12T02:59:00Z'), '11/09 às 23:59');  // vira o dia em BRT
});

test('a data já vencida continua sendo mostrada, não some', () => {
  // Leilão encerrado ainda precisa dizer QUANDO encerrou.
  assert.equal(dataDeTermino('2026-08-28T18:09:00Z'), '28/08 às 15:09');
});

// ─────────────── Fase 1 é ADITIVA: o contador atual não foi tocado ───────────────

test('o contador antigo continua exatamente como estava', () => {
  const antigo = ler('../src/components/common/CountdownTimer.jsx');
  // A resolução de semana é da Fase 2. Se sumiu aqui, alguém passou do combinado.
  assert.match(antigo, /const weeks = Math\.floor/, 'o contador foi alterado na Fase 1');
  assert.match(antigo, /1000 \* 60 \* 60 \* 24 \* 7/);
});

test('as telas usam a régua única, sem calcular data por conta própria', () => {
  for (const arq of [
    '../src/pages/AuctionDetails.jsx',
    '../src/components/auction/FixedAuctionPanel.jsx',
  ]) {
    const tela = ler(arq);
    assert.match(tela, /from '@\/lib\/relogioLeilao'/, `${arq} não importa a régua`);
    assert.match(tela, /textoDeTermino\(/, `${arq} não usa textoDeTermino`);
    assert.ok(!/toLocaleDateString\(.*end_time/.test(tela), `${arq} formata data por fora`);
  }
});

test('a tela só desenha a data quando existe data', () => {
  // Sem esta guarda no JSX, um leilão sem end_time renderiza "Termina " sozinho —
  // a palavra órfã, sem data nenhuma depois. Vale para as duas telas que escrevem
  // a palavra; no cabeçalho da sala a data vai sozinha e um elemento vazio é
  // invisível, por isso lá a guarda é higiene, não correção.
  for (const arq of [
    '../src/components/auction/FixedAuctionPanel.jsx',
    '../src/pages/AuctionDetails.jsx',
  ]) {
    const tela = ler(arq);
    assert.match(tela, /fimEmTexto\s*&&/, `${arq} desenha o rótulo mesmo sem data`);
    // e a palavra "Termina" tem de estar DENTRO da guarda, nunca fora
    const dentro = tela.split(/fimEmTexto\s*&&/)[1] || '';
    assert.match(dentro.slice(0, 400), /Termina/, `${arq}: a palavra ficou fora da guarda`);
  }
});
