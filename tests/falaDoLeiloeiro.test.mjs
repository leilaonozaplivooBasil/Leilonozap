/**
 * 🔨 O LEILOEIRO NÃO PODE PERDER A DEIXA.
 *
 * 🔴 O DEFEITO REAL (20/09/2026)
 *
 * A sala decidia a fala por IGUALDADE EXATA: `remaining === 110`. O valor é
 * lido uma vez por segundo — se aquele segundo não for avaliado, a fala se
 * perde para sempre, porque o relógio segue para 109 e o 110 nunca volta.
 *
 * E pular segundo é rotina, não exceção: navegador estrangula `setInterval`
 * para ~1x por minuto em aba de segundo plano. Quem deixa a sala aberta noutra
 * aba, ou o celular com a tela apagada, NUNCA via o leiloeiro.
 *
 * Não dava erro. Dava silêncio.
 *
 * O teste que importa aqui é o do TIQUE PULADO. Os outros protegem contra as
 * duas maneiras de errar para o outro lado: falar demais ao abrir a sala, e
 * empilhar três balões num salto grande.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { deixaAoCruzar, marcarCruzadas, DEIXAS } from '../src/lib/falaDoLeiloeiro.js';

const NADA_DITO = { first: false, second: false, third: false };

describe('a travessia das marcas', () => {
  test('fala ao cruzar a marca no segundo exato', () => {
    const d = deixaAoCruzar({ anterior: 111, agora: 110, jaDitas: NADA_DITO });
    assert.equal(d?.phase, 1);
    assert.match(d.message, /Dou-lhe uma/);
  });

  test('🔴 fala mesmo quando o tique PULA o segundo exato', () => {
    // O defeito: 111 → 108 pulava o 110 e a fala sumia para sempre.
    const d = deixaAoCruzar({ anterior: 111, agora: 108, jaDitas: NADA_DITO });
    assert.equal(d?.phase, 1, 'o tique pulou o segundo e a fala se perdeu — é o bug original');
  });

  test('🔴 aba em segundo plano: um tique de 60 segundos não engole a deixa', () => {
    // O navegador estrangula para ~1x por minuto. 120 → 60 cruza a de 110 e a
    // de 70. Antes, nenhuma das duas falava.
    const d = deixaAoCruzar({ anterior: 120, agora: 60, jaDitas: NADA_DITO });
    assert.ok(d, 'nada falou num salto de 60s — o caso mais comum de todos');
  });

  test('num salto que cruza várias, fala só a MAIS URGENTE', () => {
    // 120 → 30 cruza as três. Três balões empilhados viram ruído; o que
    // interessa é o último.
    const d = deixaAoCruzar({ anterior: 120, agora: 30, jaDitas: NADA_DITO });
    assert.equal(d?.phase, 3);
    assert.match(d.message, /Última chamada/);
  });

  test('🔴 ao ABRIR a sala já adiantada, não fala nada', () => {
    // Quem entra faltando 30s não perdeu nada: chegou agora. Sem `anterior`
    // não há travessia — e sem esta trava ele levaria as três de uma vez.
    for (const agora of [30, 69, 109, 140]) {
      assert.equal(deixaAoCruzar({ anterior: null, agora, jaDitas: NADA_DITO }), null, `falou ao abrir em ${agora}s`);
    }
  });

  test('não repete o que já foi dito', () => {
    const d = deixaAoCruzar({ anterior: 111, agora: 110, jaDitas: { ...NADA_DITO, first: true } });
    assert.equal(d, null, 'repetiu "dou-lhe uma"');
  });

  test('longe de qualquer marca, silêncio', () => {
    assert.equal(deixaAoCruzar({ anterior: 130, agora: 129, jaDitas: NADA_DITO }), null);
    assert.equal(deixaAoCruzar({ anterior: 30, agora: 29, jaDitas: NADA_DITO }), null);
  });

  test('🔴 relógio que anda para TRÁS não faz o leiloeiro falar de novo', () => {
    // O relógio é recalibrado contra o servidor e pode voltar um segundo.
    assert.equal(deixaAoCruzar({ anterior: 108, agora: 110, jaDitas: NADA_DITO }), null);
    assert.equal(deixaAoCruzar({ anterior: 60, agora: 115, jaDitas: NADA_DITO }), null);
  });

  test('entrada estranha não derruba a sala', () => {
    for (const p of [{}, { anterior: NaN, agora: 110 }, { anterior: 111, agora: undefined }]) {
      assert.doesNotThrow(() => deixaAoCruzar({ ...p, jaDitas: NADA_DITO }));
    }
  });
});

describe('o que o tique pulou fica marcado como dito', () => {
  test('🔴 um salto grande marca TODAS as cruzadas, não só a falada', () => {
    // 120 → 30 fala "dou-lhe três". Se as outras duas ficassem pendentes, elas
    // disparariam fora de hora caso o relógio oscilasse para cima.
    const marcado = marcarCruzadas({ anterior: 120, agora: 30, jaDitas: NADA_DITO });
    assert.deepEqual(marcado, { first: true, second: true, third: true });
  });

  test('marca só o que de fato cruzou', () => {
    assert.deepEqual(
      marcarCruzadas({ anterior: 120, agora: 100, jaDitas: NADA_DITO }),
      { first: true, second: false, third: false },
    );
  });

  test('sem tique anterior, não marca nada', () => {
    assert.deepEqual(marcarCruzadas({ anterior: null, agora: 30, jaDitas: NADA_DITO }), NADA_DITO);
  });
});

describe('as deixas em si', () => {
  test('continuam sendo três, nos mesmos segundos de antes', () => {
    // A correção é de GATILHO, não de roteiro. Mudar os tempos aqui mudaria a
    // experiência da sala sem ninguém ter pedido.
    assert.deepEqual(DEIXAS.map((d) => d.time), [110, 70, 35]);
    assert.deepEqual(DEIXAS.map((d) => d.phase), [1, 2, 3]);
  });

  test('vão da mais distante para a mais urgente', () => {
    const tempos = DEIXAS.map((d) => d.time);
    assert.deepEqual([...tempos].sort((a, b) => b - a), tempos, 'a lista saiu de ordem');
  });
});

describe('🎬 a corrida inteira, segundo a segundo e com tiques pulados', () => {
  /** Roda uma sequência de leituras do relógio e devolve as falas que saíram. */
  const correr = (leituras) => {
    let jaDitas = { ...NADA_DITO };
    let anterior = null;
    const ditas = [];
    for (const agora of leituras) {
      const d = deixaAoCruzar({ anterior, agora, jaDitas });
      jaDitas = marcarCruzadas({ anterior, agora, jaDitas });
      if (d) ditas.push(d.phase);
      anterior = agora;
    }
    return ditas;
  };

  test('relógio perfeito: as três falas, na ordem', () => {
    const leituras = [];
    for (let s = 142; s >= 0; s -= 1) leituras.push(s);
    assert.deepEqual(correr(leituras), [1, 2, 3]);
  });

  test('🔴 aba em segundo plano (tique de 60s): ainda fala', () => {
    // Antes: NENHUMA fala saía nesta sequência. É o caso real do defeito.
    assert.ok(correr([142, 82, 22, 0]).length > 0, 'a sala ficou muda a visita inteira');
  });

  test('🔴 nenhuma fala se repete, em sequência nenhuma', () => {
    for (const leituras of [
      [142, 120, 110, 110, 109, 70, 70, 35, 35, 0],
      [142, 111, 110, 109, 108, 71, 70, 69, 36, 35, 34],
      [142, 100, 105, 60, 65, 30, 33, 0],  // relógio oscilando
    ]) {
      const ditas = correr(leituras);
      assert.equal(new Set(ditas).size, ditas.length, `repetiu em ${JSON.stringify(leituras)}`);
    }
  });

  test('quem entra faltando 30s não leva as três na cara', () => {
    assert.deepEqual(correr([30, 29, 28, 5, 0]), []);
  });
});
