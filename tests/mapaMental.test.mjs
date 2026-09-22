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
  noNovo, filhosDe, raizDe, descendentesDe, podeVirarFilho, moverNo, apagarNo, quantosCaemJunto, demandaDoNo, renomearNo, lugarDoFilho, seSobrepoem, LARGURA_NO, ALTURA_NO, semearNoMapa, medidaDe, caixaDoMapa, ligacaoEntre, noSob, irmaoNovo, arrumarMapa, MARGEM,
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

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 A ARRUMAÇÃO DE 22/09/2026
//
// O dono: "o mapa mental está bugado e mal feito". Fui medir no navegador em
// vez de supor, e os defeitos eram de GEOMETRIA — o código tratava o card como
// um retângulo fixo de 172×44 quando ele mede 52 de altura e cresce com o
// texto. Daí saíam linhas cortadas, texto sumido e régua mentindo.
// ═══════════════════════════════════════════════════════════════════════════

describe('📏 medidaDe — o card não tem altura fixa', () => {
  test('usa a medida que a tela tirou', () => {
    const m = medidaDe({ a: { largura: 172, altura: 117 } }, 'a');
    assert.equal(m.altura, 117);
  });

  test('🔴 card sem medida cai no chute inicial, e o chute é o tamanho REAL', () => {
    // era 44; medi 52 no navegador. 8px de mentira em toda conta de geometria.
    assert.equal(ALTURA_NO, 52);
    assert.deepEqual(medidaDe({}, 'x'), { largura: LARGURA_NO, altura: ALTURA_NO });
  });

  test('medida podre não passa', () => {
    for (const ruim of [{ altura: 0 }, { altura: -5 }, { altura: 'alto' }, null]) {
      assert.equal(medidaDe({ a: ruim }, 'a').altura, ALTURA_NO);
    }
  });
});

describe('📐 caixaDoMapa — o tamanho do MAPA, não o da janela', () => {
  // 🔴 O defeito que mais fazia o mapa parecer quebrado: o desenho das linhas
  // tinha o tamanho da área visível, então assim que o mapa crescia as linhas
  // eram cortadas — os cards rolavam para dentro da vista SEM LIGAÇÃO.
  test('cobre o nó mais à direita e o mais embaixo', () => {
    const c = caixaDoMapa([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 900, y: 500 }]);
    assert.ok(c.largura >= 900 + LARGURA_NO, 'cortaria o nó da direita');
    assert.ok(c.altura >= 500 + ALTURA_NO, 'cortaria o nó de baixo');
  });

  test('🔴 usa a altura MEDIDA — card alto não fica com o pé de fora', () => {
    const c = caixaDoMapa([{ id: 'a', x: 0, y: 400 }], { a: { largura: 172, altura: 200 } });
    assert.ok(c.altura >= 600, `cortaria o card alto (deu ${c.altura})`);
  });

  test('mapa vazio devolve só a margem', () => {
    assert.deepEqual(caixaDoMapa([]), { largura: MARGEM, altura: MARGEM });
  });
});

describe('〰️ ligacaoEntre — a curva sai do lado certo de cada card', () => {
  const pai = { id: 'p', x: 100, y: 100 };
  const med = { p: { largura: 172, altura: 52 }, f: { largura: 172, altura: 52 } };

  test('🔴 ancora no MEIO do card, pela altura medida', () => {
    // errava 5px em toda linha, porque supunha 44 num card de 52.
    const l = ligacaoEntre(pai, { id: 'f', x: 400, y: 100 }, med);
    assert.equal(l.y1, 126, 'não saiu do meio do pai');
    assert.equal(l.y2, 126, 'não entrou no meio do filho');
  });

  test('🔴 card alto: a linha acompanha o meio de verdade', () => {
    const l = ligacaoEntre(pai, { id: 'f', x: 400, y: 100 }, { ...med, f: { largura: 172, altura: 200 } });
    assert.equal(l.y2, 200, 'entrou fora do meio do card alto');
  });

  test('filho à direita sai pela borda direita do pai', () => {
    const l = ligacaoEntre(pai, { id: 'f', x: 400, y: 100 }, med);
    assert.equal(l.x1, 272); // 100 + 172
    assert.equal(l.x2, 400);
  });

  test('🔴 filho à ESQUERDA sai pela borda esquerda — a reta antiga atravessava os dois cards', () => {
    const l = ligacaoEntre(pai, { id: 'f', x: -200, y: 100 }, med);
    assert.equal(l.x1, 100, 'saiu pelo lado errado do pai');
    assert.equal(l.x2, -28, 'entrou pelo lado errado do filho'); // -200 + 172
  });

  test('um por cima do outro liga centro a centro', () => {
    const l = ligacaoEntre(pai, { id: 'f', x: 120, y: 300 }, med);
    assert.equal(l.x1, 186);
    assert.equal(l.x2, 206);
  });

  test('devolve um caminho SVG utilizável, sem NaN', () => {
    const l = ligacaoEntre(pai, { id: 'f', x: 400, y: 260 }, med);
    assert.match(l.d, /^M [\d.-]+ [\d.-]+ C /);
    assert.ok(!l.d.includes('NaN'));
  });

  test('sem pai ou sem filho não quebra', () => {
    assert.equal(ligacaoEntre(null, { id: 'f' }), null);
    assert.equal(ligacaoEntre({ id: 'p' }, null), null);
  });
});

describe('🎯 noSob — em qual card o item foi solto', () => {
  const nos = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 300, y: 0 }];

  test('acha o card embaixo do ponto', () => {
    assert.equal(noSob(nos, { x: 50, y: 20 })?.id, 'a');
    assert.equal(noSob(nos, { x: 350, y: 20 })?.id, 'b');
  });

  test('vazio não é card nenhum', () => {
    assert.equal(noSob(nos, { x: 250, y: 400 }), null);
  });

  test('🔴 o que está na lista de proibidos nunca é alvo', () => {
    // é assim que o próprio nó e a galhada dele ficam de fora: virar filho de
    // um descendente é a volta fechada que trava a aba.
    assert.equal(noSob(nos, { x: 50, y: 20 }, {}, ['a']), null);
  });

  test('usa a altura medida — card alto é alvo na parte de baixo também', () => {
    assert.equal(noSob(nos, { x: 50, y: 150 }, { a: { largura: 172, altura: 200 } })?.id, 'a');
    assert.equal(noSob(nos, { x: 50, y: 150 }), null, 'sem medida, 150 já está fora');
  });

  test('ponto podre devolve nada', () => {
    for (const p of [null, { x: 'a', y: 1 }, {}]) assert.equal(noSob(nos, p), null);
  });
});

describe('⌨️ irmaoNovo — o Enter que põe o próximo item', () => {
  const nos = [{ id: 'r', x: 0, y: 0, pai: null }, { id: 'a', x: 300, y: 0, pai: 'r' }];

  test('nasce com o MESMO pai', () => {
    assert.equal(irmaoNovo(nos, 'a').pai, 'r');
  });

  test('🔴 a raiz não ganha irmão', () => {
    // duas raízes deixariam metade do mapa invisível para quem percorre a
    // árvore a partir de uma só — é o mesmo estrago do nó órfão.
    assert.equal(irmaoNovo(nos, 'r'), null);
  });

  test('nó que não existe devolve nada', () => {
    assert.equal(irmaoNovo(nos, 'fantasma'), null);
  });
});

describe('🧹 arrumarMapa — a volta de meia hora de arrasto', () => {
  const mapa = () => ([
    { id: 'r', pai: null, texto: 'raiz', x: 700, y: 900 },
    { id: 'a', pai: 'r', texto: 'a', x: 10, y: 10 },
    { id: 'b', pai: 'r', texto: 'b', x: 12, y: 12 },
    { id: 'a1', pai: 'a', texto: 'a1', x: 14, y: 14 },
    { id: 'a2', pai: 'a', texto: 'a2', x: 16, y: 16 },
  ]);

  test('🔴 nenhum card cobre outro depois de arrumar', () => {
    // era o estado normal do mapa depois de arrastar: cards empilhados,
    // ilegível, e sem volta.
    const fora = arrumarMapa(mapa());
    for (const a of fora) {
      for (const b of fora) {
        if (a.id !== b.id) assert.equal(seSobrepoem(a, b), false, `${a.texto} cobriu ${b.texto}`);
      }
    }
  });

  test('cada nível ganha a sua coluna, da esquerda pra direita', () => {
    const fora = arrumarMapa(mapa());
    const x = (id) => fora.find((n) => n.id === id).x;
    assert.ok(x('r') < x('a'), 'a raiz não ficou à esquerda dos filhos');
    assert.ok(x('a') < x('a1'), 'o neto não desceu de nível');
    assert.equal(x('a'), x('b'), 'irmãos ficaram em colunas diferentes');
    assert.equal(x('a1'), x('a2'));
  });

  test('🔴 o pai fica CENTRADO no bloco dos filhos', () => {
    // sem isto vira escada: todo pai grudado no primeiro filho.
    const fora = arrumarMapa(mapa(), {});
    const meio = (id) => { const n = fora.find((x) => x.id === id); return n.y + ALTURA_NO / 2; };
    assert.ok(Math.abs(meio('a') - (meio('a1') + meio('a2')) / 2) < 1, 'o pai não centrou nos filhos');
  });

  // 🔴 O QUE EU DESCOBRI TENTANDO PROVAR A TRAVA DE CICLO (22/09/2026)
  //
  // Quebrei a trava de propósito (tirei o `vistos` de `arrumarMapa`) e NENHUMA
  // prova acusou — duas vezes, com dois formatos de ciclo. O motivo não é
  // prova fraca: é que aqui cada nó tem UM pai só. Para 'a' e 'b' formarem uma
  // volta, os dois têm de apontar um para o outro — e aí nenhum dos dois é
  // alcançável a partir da raiz, então a recursão nunca entra na volta. Ela
  // cai no laço do fim, que é sequencial e não trava.
  //
  // Deixei a trava onde está (é barata e protege de uma lista com id repetido,
  // que a recursão percorreria duas vezes), mas NÃO invento prova para ela.
  // O que estas duas provas garantem é o que de fato acontece: mapa com ciclo
  // não trava e não perde nó nenhum de vista.
  test('🔴 mapa com ciclo não trava, e nenhum nó some', () => {
    const fora = arrumarMapa([
      { id: 'r', pai: null, texto: 'raiz', x: 0, y: 0 },
      { id: 'a', pai: 'b', texto: 'a', x: 0, y: 0 },
      { id: 'b', pai: 'a', texto: 'b', x: 0, y: 0 },
    ]);
    assert.equal(fora.length, 3);
    assert.ok(fora.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y)), 'nó sem lugar some da tela');
  });

  test('🔴 nó apontando para si mesmo também não trava', () => {
    const fora = arrumarMapa([
      { id: 'r', pai: null, texto: 'raiz', x: 0, y: 0 },
      { id: 'a', pai: 'a', texto: 'a', x: 0, y: 0 },
    ]);
    assert.equal(fora.length, 2);
    assert.ok(fora.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y)));
  });

  test('🔴 nó com pai que não existe aparece, em vez de sumir', () => {
    const solto = [{ id: 'r', pai: null, x: 0, y: 0 }, { id: 'x', pai: 'ninguem', x: 0, y: 0 }];
    const fora = arrumarMapa(solto);
    const x = fora.find((n) => n.id === 'x');
    assert.ok(Number.isFinite(x.x) && Number.isFinite(x.y));
    assert.ok(x.y >= MARGEM);
  });

  test('usa a altura medida: card alto não encosta no de baixo', () => {
    const fora = arrumarMapa(mapa(), { a1: { largura: 172, altura: 200 } });
    const a1 = fora.find((n) => n.id === 'a1');
    const a2 = fora.find((n) => n.id === 'a2');
    assert.ok(a2.y >= a1.y + 200, 'o card alto ficou por cima do irmão');
  });

  test('mapa sem raiz é devolvido como veio', () => {
    const orfaos = [{ id: 'a', pai: 'z', x: 5, y: 5 }];
    assert.deepEqual(arrumarMapa(orfaos), orfaos);
  });
});

describe('📏 seSobrepoem e lugarDoFilho com as medidas de verdade', () => {
  test('🔴 card alto é reconhecido como ocupando o espaço dele', () => {
    const a = { id: 'a', x: 0, y: 0 };
    const b = { id: 'b', x: 0, y: 100 };
    assert.equal(seSobrepoem(a, b), false, 'com altura padrão não se tocam');
    assert.equal(seSobrepoem(a, b, { a: { largura: 172, altura: 200 } }), true, 'com 200 de altura, cobre');
  });

  test('o filho novo desvia de um irmão alto', () => {
    const nos = [
      { id: 'p', pai: null, x: 0, y: 0 },
      { id: 'f1', pai: 'p', x: 228, y: 0 },
    ];
    const lugar = lugarDoFilho(nos, 'p', { f1: { largura: 172, altura: 200 } });
    assert.ok(lugar.y >= 200, `nasceu por cima do irmão alto (y=${lugar.y})`);
  });
});
