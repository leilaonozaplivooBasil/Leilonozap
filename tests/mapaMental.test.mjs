/**
 * 🗺️ O MAPA MENTAL — a árvore que não pode virar armadilha.
 *
 * Pedido do dono (19/09/2026): "um mapa mental foda, simples e objetivo, onde
 * eu esvazio a minha mente e dessa mente transformo em tarefa".
 *
 * As duas provas 🔴 aqui são as que impedem os dois defeitos que travam ou
 * somem com o trabalho de alguém: o CICLO (aba congelada) e o ÓRFÃO (pedaço da
 * mente gravado e invisível).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  noNovo, filhosDe, raizDe, descendentesDe, podeVirarFilho, moverNo,
  apagarNo, quantosCaemJunto, demandaDoNo, renomearNo, lugarDoFilho, seSobrepoem,
  LARGURA_NO, ALTURA_NO,
} from '../src/lib/mapaMental.js';

/*  raiz
 *   ├── a
 *   │    └── a1
 *   └── b
 */
const ARVORE = [
  { id: 'raiz', texto: 'Semana', pai: null, x: 0, y: 0 },
  { id: 'a', texto: 'Leilão', pai: 'raiz', x: 1, y: 0 },
  { id: 'a1', texto: 'Falar com o fornecedor', pai: 'a', x: 2, y: 0 },
  { id: 'b', texto: 'Loja', pai: 'raiz', x: 1, y: 1 },
];

describe('a árvore', () => {
  test('acha a raiz e os filhos', () => {
    assert.equal(raizDe(ARVORE).id, 'raiz');
    assert.deepEqual(filhosDe(ARVORE, 'raiz').map((n) => n.id), ['a', 'b']);
    assert.deepEqual(filhosDe(ARVORE, 'a').map((n) => n.id), ['a1']);
  });

  test('descendentes pegam neto, não só filho', () => {
    assert.deepEqual(descendentesDe(ARVORE, 'raiz').map((n) => n.id).sort(), ['a', 'a1', 'b']);
  });

  test('nó novo nasce com id próprio e texto limpo', () => {
    const n1 = noNovo({ texto: '  ideia  ' });
    const n2 = noNovo({ texto: 'outra' });
    assert.equal(n1.texto, 'ideia');
    assert.notEqual(n1.id, n2.id, 'dois nós nasceram com o mesmo id');
  });

  test('lista vazia ou com lixo não derruba nada', () => {
    assert.equal(raizDe(null), null);
    assert.doesNotThrow(() => descendentesDe([null, undefined, {}], 'x'));
  });
});

describe('🔒 o ciclo — a trava que impede a aba de congelar', () => {
  test('🔴 um nó NÃO pode virar filho do próprio filho', () => {
    // Arrastar 'raiz' para dentro de 'a' fecharia a volta: quem percorresse a
    // árvore rodaria para sempre e a aba travaria.
    const v = podeVirarFilho(ARVORE, 'raiz', 'a');
    assert.equal(v.pode, false);
    assert.equal(v.motivo, 'viraria_ciclo');
  });

  test('🔴 nem do próprio NETO', () => {
    assert.equal(podeVirarFilho(ARVORE, 'raiz', 'a1').pode, false);
  });

  test('🔴 nem filho de si mesmo', () => {
    assert.equal(podeVirarFilho(ARVORE, 'a', 'a').motivo, 'pai_de_si_mesmo');
  });

  test('mover para um ramo irmão é permitido — senão a trava seria inútil', () => {
    // O contraponto: se NADA pudesse mover, as provas acima passariam com um
    // mapa em que ninguém consegue organizar nada.
    assert.equal(podeVirarFilho(ARVORE, 'a1', 'b').pode, true);
    const novo = moverNo(ARVORE, 'a1', 'b');
    assert.deepEqual(filhosDe(novo, 'b').map((n) => n.id), ['a1']);
  });

  test('virar raiz é permitido', () => {
    assert.equal(podeVirarFilho(ARVORE, 'a', null).pode, true);
  });

  test('pai que não existe é recusado', () => {
    assert.equal(podeVirarFilho(ARVORE, 'a', 'fantasma').motivo, 'pai_nao_existe');
  });

  test('🔴 mover proibido devolve a árvore INTACTA', () => {
    assert.deepEqual(moverNo(ARVORE, 'raiz', 'a1'), ARVORE);
  });

  test('🔴 mapa que JÁ tem ciclo não trava a função', () => {
    // Gravado por versão antiga, ou editado na mão. Percorrer não pode rodar
    // para sempre: trava de aba é pior que mapa torto.
    const comCiclo = [
      { id: 'x', texto: 'x', pai: 'y' },
      { id: 'y', texto: 'y', pai: 'x' },
    ];
    assert.doesNotThrow(() => descendentesDe(comCiclo, 'x'));
    const d = descendentesDe(comCiclo, 'x');
    assert.ok(d.length <= 2, `percorreu demais: ${d.length}`);
  });
});

describe('🔒 o órfão — apagar leva a galhada', () => {
  test('🔴 apagar um nó apaga os descendentes junto', () => {
    // Deixar 'a1' para trás o tornaria invisível: gravado, com um pai que não
    // existe mais, sem aparecer em lugar nenhum da tela.
    const novo = apagarNo(ARVORE, 'a');
    assert.deepEqual(novo.map((n) => n.id).sort(), ['b', 'raiz']);
  });

  test('a tela sabe quantos caem junto, antes de perguntar', () => {
    assert.equal(quantosCaemJunto(ARVORE, 'a'), 1);
    assert.equal(quantosCaemJunto(ARVORE, 'raiz'), 3);
    assert.equal(quantosCaemJunto(ARVORE, 'b'), 0);
  });

  test('apagar folha não leva mais ninguém', () => {
    assert.equal(apagarNo(ARVORE, 'b').length, ARVORE.length - 1);
  });
});

describe('a ponte do mapa para a tarefa', () => {
  test('o nó vira demanda com origem "mapa" e rastro de volta', () => {
    const dem = demandaDoNo({ id: 'a1', texto: 'Falar com o fornecedor' }, { userId: 'u1' });
    assert.equal(dem.titulo, 'Falar com o fornecedor');
    assert.equal(dem.origem, 'mapa');
    assert.equal(dem.origem_ref, 'a1', 'perdeu de qual nó veio');
    assert.equal(dem.estado, 'aberta');
  });

  test('🔴 nó sem texto NÃO vira demanda', () => {
    // Seria uma linha em branco na caixa de entrada.
    for (const vazio of ['', '   ', null, undefined]) {
      assert.equal(demandaDoNo({ id: 'x', texto: vazio }, { userId: 'u1' }), null, `aceitou ${JSON.stringify(vazio)}`);
    }
    assert.equal(demandaDoNo(null, { userId: 'u1' }), null);
  });
});

describe('renomear', () => {
  test('troca o texto do nó certo, e só dele', () => {
    const novo = renomearNo(ARVORE, 'b', 'Loja Virtual');
    assert.equal(novo.find((n) => n.id === 'b').texto, 'Loja Virtual');
    assert.equal(novo.find((n) => n.id === 'a').texto, 'Leilão');
  });

  test('🔴 texto vazio é recusado — nó sem texto não se acha de volta', () => {
    assert.deepEqual(renomearNo(ARVORE, 'b', '   '), ARVORE);
  });
});

describe('🔴 onde o filho novo é pendurado — sem cobrir ninguém', () => {
  test('o primeiro filho vai à direita do pai', () => {
    const nos = [{ id: 'p', texto: 'pai', pai: null, x: 40, y: 100 }];
    const lugar = lugarDoFilho(nos, 'p');
    assert.equal(lugar.x, 40 + LARGURA_NO + 56);
    assert.equal(lugar.y, 100);
  });

  test('🔴 se o lugar está ocupado, DESCE — não empilha em cima', () => {
    // O defeito que o primeiro print mostrou: a conta antiga descia pelo número
    // de IRMÃOS, o que funciona num ramo só. Com dois ramos crescendo, o filho
    // de um pai caía exatamente em cima do filho do outro, e o de baixo sumia.
    const x = 40 + LARGURA_NO + 56;
    const nos = [
      { id: 'p', texto: 'pai', pai: null, x: 40, y: 100 },
      { id: 'intruso', texto: 'de outro ramo', pai: 'outro', x, y: 100 },
    ];
    const lugar = lugarDoFilho(nos, 'p');
    assert.equal(lugar.x, x);
    assert.ok(lugar.y >= 100 + ALTURA_NO, `caiu em cima do intruso (y=${lugar.y})`);
  });

  test('🔴 desce quantas vezes precisar', () => {
    const x = 40 + LARGURA_NO + 56;
    const nos = [
      { id: 'p', texto: 'pai', pai: null, x: 40, y: 100 },
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `i${i}`, texto: 'x', pai: 'outro', x, y: 100 + i * (ALTURA_NO + 18),
      })),
    ];
    const lugar = lugarDoFilho(nos, 'p');
    const bateu = nos.slice(1).some((n) => seSobrepoem({ ...lugar }, n));
    assert.equal(bateu, false, 'o lugar escolhido cobre um card existente');
  });

  test('a sobreposição é medida pelo TAMANHO do card, não pelo ponto', () => {
    // Dois cards a 10px um do outro se cobrem, mesmo com x e y diferentes.
    assert.equal(seSobrepoem({ x: 0, y: 0 }, { x: 10, y: 10 }), true);
    assert.equal(seSobrepoem({ x: 0, y: 0 }, { x: LARGURA_NO + 1, y: 0 }), false);
    assert.equal(seSobrepoem({ x: 0, y: 0 }, { x: 0, y: ALTURA_NO + 1 }), false);
  });

  test('pai que não existe não derruba — devolve um lugar utilizável', () => {
    const l = lugarDoFilho([], 'fantasma');
    assert.ok(Number.isFinite(l.x) && Number.isFinite(l.y));
  });
});
