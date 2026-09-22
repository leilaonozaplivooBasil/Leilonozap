/**
 * 🏷️ A TAREFA QUE VEIO DE CIMA TEM QUE DIZER QUE VEIO DE CIMA.
 *
 * Pedido do Ávilla (22/09/2026): "quando colocar demanda na jornada, deve
 * aparecer que é demanda vinda do adm".
 *
 * Mandar já funcionava; o dado de origem já estava gravado. O que faltava era a
 * jornada MOSTRAR: a tarefa mandada pelo adm descia com a mesma cara das que a
 * própria pessoa escreveu.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { seloDaDemanda, veioDeFora, ORIGENS_DE_FORA } from '../src/lib/seloDaDemanda.js';

const NOMES = { 'adm-1': 'Luiz Santanna', 'adm-2': 'Ávilla Júnior' };

describe('selo da demanda', () => {
  test('🔴 tarefa vinda do adm ganha selo COM o nome de quem mandou', () => {
    const selo = seloDaDemanda({ origem: 'xperf', criado_por_id: 'adm-1' }, NOMES, 'eu');
    assert.ok(selo, 'a tarefa do adm descia sem marca nenhuma — é o defeito do pedido');
    assert.equal(selo.rotulo, '📥 do adm · Luiz');
    assert.match(selo.dica, /Luiz Santanna/);
  });

  test('tarefa que a própria pessoa escreveu NÃO ganha selo', () => {
    assert.equal(seloDaDemanda({ origem: 'propria', criado_por_id: 'eu' }, NOMES, 'eu'), null);
    assert.equal(seloDaDemanda({}, NOMES, 'eu'), null);
    assert.equal(seloDaDemanda(null, NOMES, 'eu'), null);
  });

  test('🔴 demanda que EU mandei pra MIM não é "vinda do adm"', () => {
    const selo = seloDaDemanda({ origem: 'xperf', criado_por_id: 'eu' }, NOMES, 'eu');
    assert.equal(selo, null,
      'o adm que usa o próprio quadro veria "veio do adm" em tudo que ele mesmo anotou');
  });

  test('sem saber quem mandou, o selo existe do mesmo jeito', () => {
    const selo = seloDaDemanda({ origem: 'xperf' }, NOMES, 'eu');
    assert.equal(selo.rotulo, '📥 veio do adm', 'nome desconhecido não pode apagar a marca');
    assert.equal(selo.autorId, null);
  });

  test('id sem nome no mapa cai no rótulo curto, não em "undefined"', () => {
    const selo = seloDaDemanda({ origem: 'xperf', criado_por_id: 'fantasma' }, NOMES, 'eu');
    assert.equal(selo.rotulo, '📥 veio do adm');
    assert.equal(selo.autorId, 'fantasma');
  });

  test('só o PRIMEIRO nome no rótulo — nome inteiro estoura a linha no celular', () => {
    const selo = seloDaDemanda({ origem: 'xperf', criado_por_id: 'adm-2' }, NOMES, 'eu');
    assert.equal(selo.rotulo, '📥 do adm · Ávilla');
    assert.match(selo.dica, /Ávilla Júnior/, 'o nome inteiro tem que sobreviver na dica');
  });

  describe('veioDeFora', () => {
    test('demanda_id sozinho já marca, mesmo com origem estranha', () => {
      assert.equal(veioDeFora({ demanda_id: 'd1', origem: 'seja_la_o_que_for' }), true);
    });

    test('as origens declaradas marcam', () => {
      for (const o of ORIGENS_DE_FORA) assert.equal(veioDeFora({ origem: o }), true, `origem ${o}`);
    });

    test('origem própria, vazia e nula não marcam', () => {
      assert.equal(veioDeFora({ origem: 'propria' }), false);
      assert.equal(veioDeFora({ origem: '' }), false);
      assert.equal(veioDeFora({ origem: null }), false);
      assert.equal(veioDeFora(null), false);
      assert.equal(veioDeFora(undefined), false);
    });
  });

  test('sem meuId, o selo continua aparecendo', () => {
    // a tela de gestão lista tarefa de outras pessoas e não tem "eu" pra comparar
    const selo = seloDaDemanda({ origem: 'xperf', criado_por_id: 'adm-1' }, NOMES);
    assert.ok(selo, 'sem o "eu" o selo sumiria justamente na tela que mais precisa dele');
  });

  test('mapa de nomes vazio ou nulo não quebra', () => {
    assert.equal(seloDaDemanda({ origem: 'xperf', criado_por_id: 'adm-1' }, {}, 'eu').rotulo, '📥 veio do adm');
    assert.equal(seloDaDemanda({ origem: 'xperf', criado_por_id: 'adm-1' }, null, 'eu').rotulo, '📥 veio do adm');
    assert.ok(seloDaDemanda({ origem: 'xperf' }).dica.length > 0);
  });
});
