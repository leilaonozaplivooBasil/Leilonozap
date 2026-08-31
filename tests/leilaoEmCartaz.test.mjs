// 31/08/2026 — "o produto do print (air fryer) foi arrematado e segue na página
// do leilão". Estava em DOIS lugares da mesma página: no bloco Destaques (marcado
// à mão, nunca desmarcado) e na grade principal (nenhum filtro por status).
//
// Estes testes trancam a régua: quem acabou sai, quem ainda vale fica, e os dois
// casos reais do print (Air Fryer 'ended' e Bike Scooter 'sold') são testados com
// os dados que estavam no banco.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STATUS_EM_CARTAZ, estaEmCartaz, apenasEmCartaz } from '../src/lib/leilaoEmCartaz.js';

const AGORA = new Date('2026-08-31T18:00:00Z');
const daqui = (dias) => new Date(AGORA.getTime() + dias * 86400000).toISOString();
const atras = (dias) => new Date(AGORA.getTime() - dias * 86400000).toISOString();

describe('estaEmCartaz — o que o público ainda pode ver', () => {
  test('🔴 o bug: o Air Fryer do print, arrematado em 26/08, sai da vitrine', () => {
    assert.equal(estaEmCartaz({
      title: 'Air Fryer fritadeira eletrica',
      status: 'ended',
      end_time: '2026-08-26T00:48:00Z',
      winner_name: 'graça mãe de todos',
    }, AGORA), false);
  });

  test('🔴 o outro card do print: Bike Scooter em "sold" também sai', () => {
    assert.equal(estaEmCartaz({
      title: 'Bike Scooter Elétrica Harley 137 - SEM CNH',
      status: 'sold',
      end_time: '2026-08-31T21:00:00Z',
    }, AGORA), false);
  });

  test('leilão em disputa continua no cartaz', () => {
    assert.equal(estaEmCartaz({ status: 'active', end_time: daqui(11) }, AGORA), true);
  });

  test('nenhum estado de fim escapa', () => {
    for (const s of ['ended', 'sold', 'processing', 'archived']) {
      assert.equal(estaEmCartaz({ status: s, end_time: daqui(5) }, AGORA), false, `${s} não podia ficar`);
    }
  });

  test('prazo vencido sai mesmo com o banco ainda dizendo "active"', () => {
    // O encerramento roda em cron; entre o fim e a passagem do cron a linha
    // continua 'active'. O card já não vale.
    assert.equal(estaEmCartaz({ status: 'active', end_time: atras(1) }, AGORA), false);
  });

  test('agendado NÃO é derrubado pelo prazo — ali end_time é a hora de COMEÇAR', () => {
    assert.equal(estaEmCartaz({ status: 'scheduled', end_time: atras(1) }, AGORA), true);
    assert.equal(estaEmCartaz({ status: 'scheduled', end_time: daqui(2) }, AGORA), true);
  });

  test('pausado pelo admin continua visível — volta a valer depois', () => {
    assert.equal(estaEmCartaz({ status: 'paused', end_time: daqui(3) }, AGORA), true);
  });

  test('leilão sem prazo definido e ativo continua', () => {
    assert.equal(estaEmCartaz({ status: 'active' }, AGORA), true);
    assert.equal(estaEmCartaz({ status: 'active', end_time: null }, AGORA), true);
  });

  test('data inválida não derruba o leilão nem quebra', () => {
    assert.equal(estaEmCartaz({ status: 'active', end_time: 'qualquer coisa' }, AGORA), true);
  });

  test('lixo (nulo, sem status, status desconhecido) fica de fora', () => {
    for (const l of [null, undefined, {}, { status: '' }, { status: 'inventado' }]) {
      assert.equal(estaEmCartaz(l, AGORA), false);
    }
  });
});

describe('apenasEmCartaz', () => {
  test('separa a vitrine do cemitério e preserva a ordem', () => {
    const r = apenasEmCartaz([
      { id: 'viva1', status: 'active', end_time: daqui(2) },
      { id: 'morta', status: 'ended', end_time: atras(5) },
      { id: 'viva2', status: 'paused', end_time: daqui(9) },
      { id: 'vendida', status: 'sold', end_time: atras(1) },
    ], AGORA);
    assert.deepEqual(r.map((l) => l.id), ['viva1', 'viva2']);
  });

  test('entrada que não é lista devolve lista vazia, não explode', () => {
    for (const v of [null, undefined, {}, 'texto']) assert.deepEqual(apenasEmCartaz(v, AGORA), []);
  });
});

describe('a vitrine e a consulta ao banco usam a MESMA lista', () => {
  // A Home pede ao banco `filter({ status: STATUS_EM_CARTAZ })`. Se alguém
  // acrescentar um estado só na régua de exibição, o leilão passaria no filtro da
  // tela mas nunca chegaria do banco — e o bug voltaria pelo avesso.
  test('todo status de STATUS_EM_CARTAZ passa em estaEmCartaz', () => {
    for (const s of STATUS_EM_CARTAZ) {
      assert.equal(estaEmCartaz({ status: s, end_time: daqui(1) }, AGORA), true, `${s} deveria passar`);
    }
  });

  test('Home.jsx pede ao banco exatamente STATUS_EM_CARTAZ, em dois pontos', () => {
    const home = readFileSync(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8');
    const pedidos = home.match(/status:\s*STATUS_EM_CARTAZ/g) || [];
    assert.equal(pedidos.length, 2, 'esperava o filtro na busca inicial E no polling');
  });

  test('Destaques aplica a mesma régua — foi lá que o Air Fryer apareceu', () => {
    const d = readFileSync(new URL('../src/components/home/DestaquesLeiloes.jsx', import.meta.url), 'utf8');
    assert.ok(d.includes('estaEmCartaz'), 'DestaquesLeiloes deixou de filtrar leilão encerrado');
  });
});
