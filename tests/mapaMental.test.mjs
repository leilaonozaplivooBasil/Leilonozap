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
  noNovo, filhosDe, raizDe, descendentesDe, podeVirarFilho, moverNo, apagarNo, quantosCaemJunto, demandaDoNo, renomearNo, lugarDoFilho, seSobrepoem, LARGURA_NO, ALTURA_NO, semearNoMapa,
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

// ─────────────────────────────────────────────────────────────────────────────
// 🌱 A DEMANDA QUE VIRA NÓ (22/09/2026)
//
// Dono (áudio de 19/09, 10h32): "dali eu transformo em ou mapa mental, PARA
// ABRIR o mapa mental, ou no quadro." É o caminho de volta do ✈: a anotação
// que ainda não é tarefa porque ainda não está pensada.
describe('🌱 semear a demanda no mapa', () => {
  const comRaiz = () => [{ id: 'r', texto: 'Minha semana', pai: null, x: 40, y: 140 }];

  test('pendura o texto novo na raiz, e diz qual nó é', () => {
    const { nos, id, novo } = semearNoMapa(comRaiz(), 'ligar pro fornecedor');
    assert.equal(novo, true);
    assert.equal(nos.length, 2);
    const posto = nos.find((n) => n.id === id);
    assert.equal(posto.texto, 'ligar pro fornecedor');
    assert.equal(posto.pai, 'r', 'nasceu solto — nó sem pai é órfão neste mapa');
  });

  test('🔴 não duplica: o mesmo texto devolve o nó que já está lá', () => {
    // o botão continua na caixa, então mandar duas vezes é gesto esperado.
    // Duplicar encheria o mapa de cópias do mesmo pensamento.
    const base = semearNoMapa(comRaiz(), 'fechar o caixa').nos;
    const { nos, id, novo } = semearNoMapa(base, 'fechar o caixa');
    assert.equal(novo, false);
    assert.equal(nos.length, base.length, 'criou um segundo nó igual');
    assert.equal(nos.find((n) => n.id === id).texto, 'fechar o caixa');
  });

  test('🔴 acento e caixa não fazem item novo', () => {
    // "Ligar pro Fornecedor" e "ligar pro fornecedor" são o mesmo pensamento —
    // é a mesma normalização que trava a duplicata do ✈.
    const base = semearNoMapa(comRaiz(), 'Comprar etiqueta térmica').nos;
    const { nos, novo } = semearNoMapa(base, 'comprar ETIQUETA TERMICA');
    assert.equal(novo, false);
    assert.equal(nos.length, base.length);
  });

  test('🔴 mapa vazio: o nó vira a raiz em vez de nascer órfão', () => {
    const { nos, id, novo } = semearNoMapa([], 'primeira ideia');
    assert.equal(novo, true);
    assert.equal(nos.length, 1);
    assert.equal(nos[0].id, id);
    assert.equal(nos[0].pai, null);
    assert.equal(raizDe(nos)?.id, id, 'o mapa ficou sem raiz');
  });

  test('🔴 não cobre nenhum nó que já está no lugar', () => {
    // é a mesma régua do "pendurar um item": nó por cima de nó esconde
    // pensamento, que é o único jeito de perder coisa num mapa.
    let nos = comRaiz();
    for (const t of ['um', 'dois', 'três', 'quatro']) nos = semearNoMapa(nos, t).nos;
    for (const a of nos) {
      for (const b of nos) {
        if (a.id !== b.id) assert.equal(seSobrepoem(a, b), false, `${a.texto} cobriu ${b.texto}`);
      }
    }
  });

  test('texto vazio não mexe no mapa', () => {
    const base = comRaiz();
    for (const vazio of ['', '   ', null, undefined]) {
      const r = semearNoMapa(base, vazio);
      assert.equal(r.novo, false);
      assert.equal(r.id, null);
      assert.equal(r.nos.length, base.length);
    }
  });

  test('lista torta não derruba', () => {
    const r = semearNoMapa(null, 'alguma coisa');
    assert.equal(r.novo, true);
    assert.equal(r.nos.length, 1);
  });
});
