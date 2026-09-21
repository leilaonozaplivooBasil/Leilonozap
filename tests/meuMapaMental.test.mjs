/**
 * 🔐 O MAPA É DE QUEM PEDIU — e o que chega do navegador não é confiável.
 *
 * Duas famílias de prova:
 *
 * 1. A IDENTIDADE vem do crachá assinado, nunca do corpo. Se viesse de
 *    `body.user_id`, bastaria trocar um número para ler a cabeça de outra
 *    pessoa — e ids circulam nas respostas normais da API. É o mesmo buraco
 *    que o crachá fechou na Leila.
 *
 * 2. O CONTEÚDO é limpo antes de gravar. Um `nos` torto vira dado morto no
 *    banco, ou tela quebrada na próxima vez que alguém abrir.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { limparNos } from '../api/functions/meuMapaMental.js';

const ROTA = readFileSync(new URL('../api/functions/meuMapaMental.js', import.meta.url), 'utf8')
  .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

describe('🔐 de quem é o mapa', () => {
  test('🔴 a identidade sai do crachá conferido', () => {
    assert.match(ROTA, /conferirSessao\(req\)/, 'parou de conferir o crachá');
    assert.match(ROTA, /ses\.userId/, 'não usa o dono que o crachá devolveu');
  });

  test('🔴 e NUNCA do corpo da requisição', () => {
    assert.doesNotMatch(ROTA, /body\.user_id/, 'voltou a aceitar o dono pelo corpo — leria a mente alheia');
    assert.doesNotMatch(ROTA, /body\.userId/, 'idem');
  });

  test('🔴 o UPDATE filtra por user_id, não só pelo id do mapa', () => {
    // Cinto e suspensório: nem um id trocado alcança o mapa de outra pessoa.
    assert.match(ROTA, /mapas_mentais\?id=eq\.\$\{enc\(jaTem\)\}&user_id=eq\.\$\{enc\(dono\)\}/);
  });

  test('sem crachá, recusa com 401', () => {
    assert.match(ROTA, /nao_autenticado/);
    assert.match(ROTA, /status\(401\)/);
  });
});

describe('🧹 o que chega do navegador é limpo antes de gravar', () => {
  test('lista tem que ser lista', () => {
    for (const lixo of [null, undefined, 'texto', 42, {}]) {
      assert.deepEqual(limparNos(lixo), [], `aceitou ${JSON.stringify(lixo)}`);
    }
  });

  test('nó sem id é descartado — sem id não há pai nem filho', () => {
    assert.equal(limparNos([{ texto: 'a' }, { id: '', texto: 'b' }, { id: 'ok', texto: 'c' }]).length, 1);
  });

  test('🔴 id repetido não entra duas vezes', () => {
    // Dois nós com o mesmo id quebram a relação pai/filho: os filhos de um
    // apareceriam pendurados no outro.
    const nos = limparNos([{ id: 'x', texto: 'primeiro' }, { id: 'x', texto: 'segundo' }]);
    assert.equal(nos.length, 1);
    assert.equal(nos[0].texto, 'primeiro');
  });

  test('🔴 pai que não existe vira raiz, e o nó NÃO some', () => {
    // Sem isto o nó fica gravado e fora da tela para sempre — pedaço da mente
    // perdido em silêncio.
    const nos = limparNos([{ id: 'filho', texto: 'órfão', pai: 'pai-fantasma' }]);
    assert.equal(nos.length, 1, 'o nó foi descartado em vez de virar raiz');
    assert.equal(nos[0].pai, null);
  });

  test('pai que existe é preservado', () => {
    const nos = limparNos([{ id: 'p', texto: 'pai' }, { id: 'f', texto: 'filho', pai: 'p' }]);
    assert.equal(nos.find((n) => n.id === 'f').pai, 'p');
  });

  test('texto gigante é cortado, não recusado', () => {
    const nos = limparNos([{ id: 'x', texto: 'a'.repeat(5000) }]);
    assert.equal(nos[0].texto.length, 280);
  });

  test('🔴 mapa gigante tem teto — senão trava a aba de quem abrir', () => {
    const muitos = Array.from({ length: 900 }, (_, i) => ({ id: `n${i}`, texto: 'x' }));
    assert.equal(limparNos(muitos).length, 400);
  });

  test('coordenada estranha vira zero em vez de NaN na tela', () => {
    const nos = limparNos([{ id: 'x', texto: 'a', x: 'abc', y: null }]);
    assert.equal(nos[0].x, 0);
    assert.equal(nos[0].y, 0);
  });

  test('campo extra não passa para o banco', () => {
    const nos = limparNos([{ id: 'x', texto: 'a', malicioso: 'DROP', outro: 1 }]);
    assert.deepEqual(Object.keys(nos[0]).sort(), ['id', 'pai', 'texto', 'x', 'y']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('🧠 a caixa de entrada (minhasDemandas)', () => {
  const ROTA_D = readFileSync(new URL('../api/functions/minhasDemandas.js', import.meta.url), 'utf8')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  test('🔴 a identidade também sai do crachá, e não do corpo', () => {
    assert.match(ROTA_D, /conferirSessao\(req\)/);
    assert.doesNotMatch(ROTA_D, /body\.user_id/, 'leria a caixa de entrada alheia');
  });

  test('🔴 só devolve as do DONO, e só as abertas', () => {
    assert.match(ROTA_D, /user_id=eq\.\$\{enc\(dono\)\}/);
    assert.match(ROTA_D, /estado=eq\.aberta/);
  });

  test('🔴 `anotada_em` é carimbado no SERVIDOR', () => {
    // Vindo do navegador, o relógio torto de um celular jogaria a anotação
    // para outro dia — e é pelo dia que o dono vai procurar.
    assert.match(ROTA_D, /anotada_em: new Date\(\)\.toISOString\(\)/);
  });
});

describe('🧹 a demanda é limpa antes de gravar', () => {
  test('sem título, não grava — não haveria o que achar depois', async () => {
    const { limparDemanda } = await import('../api/functions/minhasDemandas.js');
    for (const vazio of ['', '   ', null, undefined]) {
      assert.equal(limparDemanda({ titulo: vazio }), null, `aceitou ${JSON.stringify(vazio)}`);
    }
    assert.equal(limparDemanda(null), null);
  });

  test('🔴 origem desconhecida vira "app" em vez de derrubar a gravação', async () => {
    // Perder a anotação por causa de um rótulo errado seria trocar um defeito
    // pequeno por um grande: a pessoa esvaziou a mente e o sistema jogou fora.
    const { limparDemanda } = await import('../api/functions/minhasDemandas.js');
    assert.equal(limparDemanda({ titulo: 'x', origem: 'inventada' }).origem, 'app');
    assert.equal(limparDemanda({ titulo: 'x', origem: 'mapa' }).origem, 'mapa');
  });

  test('prazo só passa no formato de data', async () => {
    const { limparDemanda } = await import('../api/functions/minhasDemandas.js');
    assert.equal(limparDemanda({ titulo: 'x', prazo: '2026-09-25' }).prazo, '2026-09-25');
    assert.equal(limparDemanda({ titulo: 'x', prazo: 'amanhã' }).prazo, null);
    assert.equal(limparDemanda({ titulo: 'x', prazo: "'; DROP" }).prazo, null);
  });

  test('título e detalhe gigantes são cortados, não recusados', async () => {
    const { limparDemanda } = await import('../api/functions/minhasDemandas.js');
    const d = limparDemanda({ titulo: 'a'.repeat(900), detalhe: 'b'.repeat(9000) });
    assert.equal(d.titulo.length, 300);
    assert.equal(d.detalhe.length, 2000);
  });

  test('campo extra não chega ao banco', async () => {
    const { limparDemanda } = await import('../api/functions/minhasDemandas.js');
    const d = limparDemanda({ titulo: 'x', estado: 'virou_tarefa', user_id: 'outro', cartao_id: 'c1' });
    assert.deepEqual(Object.keys(d).sort(), ['detalhe', 'origem', 'origem_ref', 'prazo', 'titulo']);
  });
});
