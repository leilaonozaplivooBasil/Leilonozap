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

describe('🧠 o ✈ do mapa larga na fila que já existe (minhasDemandas)', () => {
  const ROTA_D = readFileSync(new URL('../api/functions/minhasDemandas.js', import.meta.url), 'utf8')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  test('🔴 a identidade sai do crachá, nunca do corpo', () => {
    // com `body.pessoa_id`, trocar um número plantaria demanda na fila de
    // outra pessoa — e ela apareceria no Painel Corporativo dela.
    assert.match(ROTA_D, /conferirSessao\(req\)/);
    assert.doesNotMatch(ROTA_D, /body\??\.pessoa_id/, 'gravaria na fila alheia');
    assert.doesNotMatch(ROTA_D, /body\??\.user_id/, 'gravaria na fila alheia');
  });

  test('🔴 grava em xperf_demandas, e não numa tabela só do mapa', () => {
    // 21/09: a decisão do dono foi reusar a fila que o Painel Corporativo, o
    // Encontro e a Performance da Equipe já leem. Uma tabela própria seria a
    // quarta lista de pendências da casa.
    assert.match(ROTA_D, /sb\('xperf_demandas'/);
    assert.doesNotMatch(ROTA_D, /sb\('demandas'/, 'voltou a criar fila paralela');
  });

  test('🔴 a trava contra duplicata roda ANTES do insert', () => {
    // se o insert viesse primeiro, o segundo clique no mesmo nó já teria
    // gravado quando a checagem rodasse.
    const ondeChecagem = ROTA_D.indexOf('jaEstaNaFila(');
    const ondeInsert = ROTA_D.indexOf("method: 'POST'");
    assert.ok(ondeChecagem > 0, 'a trava sumiu da rota');
    assert.ok(ondeInsert > 0);
    assert.ok(ondeChecagem < ondeInsert, 'a trava está depois da gravação');
  });

  test('🔴 só lê o que é do dono, do mapa, e ainda aberto', () => {
    assert.match(ROTA_D, /pessoa_id=eq\.\$\{enc\(dono\)\}/);
    assert.match(ROTA_D, /origem=eq\.\$\{enc\(ORIGEM_MAPA\)\}/);
    assert.match(ROTA_D, /status=eq\.\$\{enc\(RECEBIDA\)\}/);
  });

  test('clique repetido devolve 200 com jaExistia, não erro', () => {
    // o ✈ continua no nó de propósito; o segundo clique é esperado, e acusar
    // falha faria a pessoa achar que a primeira não pegou.
    assert.match(ROTA_D, /jaExistia: true/);
    assert.doesNotMatch(ROTA_D, /status\(409\)/);
  });

  test('só aceita POST', () => {
    assert.match(ROTA_D, /req\.method !== 'POST'/);
    assert.match(ROTA_D, /status\(405\)/);
  });

  test('sem título devolve 400 em vez de gravar linha vazia', () => {
    assert.match(ROTA_D, /sem_titulo/);
    assert.match(ROTA_D, /status\(400\)/);
  });

  test('a falha ao buscar o nome não derruba a gravação', () => {
    // nome é enfeite na linha do Painel. Perder a anotação por causa dele
    // seria trocar um defeito de exibição por um de dado.
    const nomeDe = ROTA_D.slice(ROTA_D.indexOf('async function nomeDe'), ROTA_D.indexOf('export default'));
    assert.match(nomeDe, /catch\s*\{[\s\S]*return null;/);
  });
});
