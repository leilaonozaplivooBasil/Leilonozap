/**
 * 🚚 O PAGAMENTO COM SALDO PRECISA DIZER QUE É ENTREGA.
 *
 * Caso relatado pela Ávila (21/09/2026): um Roku pago COM frete (R$ 14,14 de
 * SEDEX, gravado no pedido) respondia "retirada na loja" na hora de gerar a
 * etiqueta. O cliente nunca marcou retirada.
 *
 * A causa: `payWithBalance` calculava o tipo de entrega, usava para cotar o
 * frete e NÃO gravava. O gerador de etiqueta lê `raw_base44.delivery_type` e
 * trata a ausência como balcão:
 *
 *     if (raw.delivery_type !== 'delivery') return { skipped: 'retirada_na_loja' }
 *
 * Cinco pedidos travados entre 10 e 20/09, em silêncio — 'retirada_na_loja'
 * está na lista de pulos que não geram log, porque retirada de balcão é normal.
 *
 * Estes testes leem a ROTA como texto porque ela fala com banco e cofre; o que
 * precisa ser travado aqui é a forma do código, não o efeito.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROTA = readFileSync(new URL('../api/functions/payWithBalance.js', import.meta.url), 'utf8')
  .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

describe('payWithBalance — a entrega sobrevive até o banco', () => {
  // 🔴 ESTE RECORTE É O CORAÇÃO DO TESTE, e a primeira versão dele estava errada.
  //
  // Eu procurava `delivery_type: entrega` no arquivo INTEIRO — e essa string
  // também aparece na cotação do frete, que já existia antes da correção. O
  // teste passava com o defeito de pé: apagar a gravação não derrubava nada.
  // Peguei isso na rodada de mutação. O recorte abaixo olha SÓ o trecho que
  // escreve no banco.
  const BLOCO_QUE_GRAVA = (() => {
    const de = ROTA.indexOf('catalog_sales?select=raw_base44');
    const ate = ROTA.indexOf("method: 'PATCH'", de);
    assert.ok(de > 0 && ate > de, 'o bloco que grava o raw_base44 sumiu da rota');
    return ROTA.slice(de, ate);
  })();

  test('🔴 grava delivery_type no raw_base44 — no bloco que escreve, não só na cotação', () => {
    assert.match(BLOCO_QUE_GRAVA, /delivery_type:\s*entrega/,
      'sem isto todo pedido pago com saldo vira "retirada na loja" na etiqueta');
  });

  test('🔴 o tipo é calculado UMA vez, numa variável — não dentro da chamada', () => {
    // era calculado inline no argumento do resolverFrete e morria ali.
    assert.match(ROTA, /const entrega\s*=/);
    assert.match(ROTA, /delivery_type:\s*entrega,/, 'o frete tem que usar a mesma variável');
  });

  test('🔴 a gravação NÃO está presa ao "if (frete.valor > 0)"', () => {
    // frete grátis é entrega, não retirada. Preso no if, o pedido sem frete
    // saía do checkout sem raw_base44 nenhum e caía no mesmo buraco.
    const trecho = ROTA.slice(ROTA.indexOf('const entrega'));
    const ondeGrava = trecho.indexOf('delivery_type: entrega');
    const ondeIfFrete = trecho.indexOf('if (frete.valor > 0)', trecho.indexOf('data.sale_id'));
    assert.ok(ondeGrava > 0, 'a gravação sumiu');
    assert.ok(ondeIfFrete === -1 || ondeGrava < ondeIfFrete,
      'a gravação do delivery_type voltou para dentro do if do frete');
  });

  test('retirada continua sendo retirada', () => {
    // a correção não pode transformar todo pedido em entrega: quem escolheu
    // balcão tem que seguir como balcão, senão compramos etiqueta à toa.
    assert.match(ROTA, /'Retirada'\s*\?\s*'pickup'\s*:\s*'delivery'/);
  });
});

describe('o gerador de etiqueta continua exigindo delivery', () => {
  const ENVIO = readFileSync(new URL('../api/_lib/melhorEnvioShipment.js', import.meta.url), 'utf8');

  test('a regra que expôs o defeito segue de pé', () => {
    // não "consertamos" afrouxando o gerador: um pedido realmente de balcão
    // não pode gerar etiqueta. O conserto foi gravar o dado que faltava.
    assert.match(ENVIO, /raw\.delivery_type !== 'delivery'/);
  });
});
