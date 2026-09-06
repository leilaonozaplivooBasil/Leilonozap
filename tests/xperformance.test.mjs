// X-PERFORMANCE — o planejamento executivo da diretoria (06/09/2026).
//
// O que estes testes protegem, em ordem de importância:
//   1. a trava do quadro: nada vira ponto sem passar por revisão;
//   2. as duas contas separadas — fixo do mês e caminho pra sociedade;
//   3. a pauta fixa da segunda, que é o que transforma anotação em série.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  TRILHAS, trilhaDoCargo, habitosDaTrilha,
  COLUNAS, ORDEM_COLUNAS, podeMover, moverEntregavel,
  pontosDaPessoa, progressoSociedade, META_SOCIEDADE, PESO_MAX,
  PAUTA_PADRAO, segundaDaSemana, proximaSegunda, encontroDaSemana, resumoDaPessoa,
} from '../src/lib/xperformance.js';

describe('as três trilhas da Mentalidade', () => {
  test('são três, na ordem em que a pessoa sobe', () => {
    assert.deepEqual(TRILHAS.map((t) => t.id), ['executivo', 'diretor', 'ceo']);
  });

  test('o Executivo responde pelos Hábitos 1 a 5 — termina na Apresentação', () => {
    // decisão registrada: o dono falou "do primeiro ao quarto" e em seguida
    // listou "até a Apresentação de Sucesso", que é o 5º. Tirar o 5 deixaria a
    // trilha sem final: é na apresentação que o executivo fecha.
    assert.deepEqual(habitosDaTrilha('executivo'), [1, 2, 3, 4, 5]);
  });

  test('Diretor e CEO respondem pelos Hábitos 5 a 8', () => {
    assert.deepEqual(habitosDaTrilha('diretor'), [5, 6, 7, 8]);
    assert.deepEqual(habitosDaTrilha('ceo'), [5, 6, 7, 8]);
  });

  test('o 5 é a dobradiça: aparece nas duas pontas', () => {
    // é de propósito — a Apresentação de Sucesso é onde o executivo fecha e
    // onde o diretor começa a cobrar volume.
    assert.ok(habitosDaTrilha('executivo').includes(5));
    assert.ok(habitosDaTrilha('diretor').includes(5));
  });

  test('trainee entra na trilha do Executivo, e cargo desconhecido também', () => {
    assert.equal(trilhaDoCargo('trainee').id, 'executivo');
    assert.equal(trilhaDoCargo('qualquer-coisa').id, 'executivo');
    assert.equal(trilhaDoCargo(null).id, 'executivo');
    assert.equal(trilhaDoCargo('DIRETOR').id, 'diretor'); // caixa alta não quebra
  });
});

describe('o quadro do X-Performance', () => {
  test('quatro colunas, na ordem em que o trabalho anda', () => {
    assert.deepEqual(ORDEM_COLUNAS, ['combinado', 'fazendo', 'revisao', 'entregue']);
    assert.equal(COLUNAS.length, 4);
  });

  // 🔒 A TRAVA CENTRAL
  test('NÃO dá pra pular de "Fazendo" direto pra "Entregue"', () => {
    assert.equal(podeMover('fazendo', 'entregue'), false);
    assert.equal(podeMover('combinado', 'entregue'), false);
    assert.equal(podeMover('combinado', 'revisao'), false);
  });

  test('avançar de um em um pode; voltar, sempre', () => {
    assert.equal(podeMover('combinado', 'fazendo'), true);
    assert.equal(podeMover('fazendo', 'revisao'), true);
    assert.equal(podeMover('revisao', 'entregue'), true);
    assert.equal(podeMover('entregue', 'combinado'), true);
    assert.equal(podeMover('revisao', 'fazendo'), true);
    assert.equal(podeMover('fazendo', 'fazendo'), true);
  });

  test('coluna inexistente nunca é destino', () => {
    assert.equal(podeMover('fazendo', 'sócio'), false);
    assert.equal(podeMover('inventada', 'entregue'), false);
  });

  test('mover devolve lista nova e não altera a original', () => {
    const antes = [{ id: 'a', coluna: 'combinado', dono_id: 'u1', peso: 3 }];
    const depois = moverEntregavel(antes, 'a', 'fazendo');
    assert.equal(antes[0].coluna, 'combinado', 'a lista original foi mutada');
    assert.equal(depois[0].coluna, 'fazendo');
  });

  test('movimento proibido devolve a MESMA lista, sem efeito', () => {
    const antes = [{ id: 'a', coluna: 'fazendo', dono_id: 'u1', peso: 3 }];
    assert.equal(moverEntregavel(antes, 'a', 'entregue'), antes);
    assert.equal(moverEntregavel(antes, 'nao-existe', 'revisao'), antes);
  });
});

describe('pontos e o caminho pra sociedade', () => {
  const lista = [
    { id: '1', coluna: 'entregue', dono_id: 'u1', peso: 5 },
    { id: '2', coluna: 'entregue', dono_id: 'u1', peso: 3 },
    { id: '3', coluna: 'revisao', dono_id: 'u1', peso: 5 },   // ainda não vale
    { id: '4', coluna: 'entregue', dono_id: 'u2', peso: 4 },   // é de outro
  ];

  test('só entregável VALIDADO conta ponto', () => {
    assert.equal(pontosDaPessoa(lista, 'u1'), 8);
  });

  test('card em revisão vale ZERO — é o que dá sentido à revisão', () => {
    const soEmRevisao = [{ id: 'x', coluna: 'revisao', dono_id: 'u1', peso: 5 }];
    assert.equal(pontosDaPessoa(soEmRevisao, 'u1'), 0);
  });

  test('peso fora da régua não infla o placar', () => {
    const exagerado = [{ id: 'x', coluna: 'entregue', dono_id: 'u1', peso: 999 }];
    assert.equal(pontosDaPessoa(exagerado, 'u1'), PESO_MAX);
    const negativo = [{ id: 'y', coluna: 'entregue', dono_id: 'u1', peso: -10 }];
    assert.equal(pontosDaPessoa(negativo, 'u1'), 0);
  });

  test('o progresso não passa de 100% nem fica negativo', () => {
    assert.equal(progressoSociedade(META_SOCIEDADE * 2).pct, 100);
    assert.equal(progressoSociedade(META_SOCIEDADE * 2).atingiu, true);
    assert.equal(progressoSociedade(-5).pct, 0);
  });

  // 💰 A separação que o dono pediu com todas as letras
  test('fixo e sociedade são contas SEPARADAS — uma nunca soma na outra', () => {
    const r = resumoDaPessoa({ entregaveis: lista, pessoaId: 'u1', fixoMes: 1500, hojeISO: '2026-09-06' });
    assert.equal(r.fixo, 1500);
    assert.equal(r.sociedade.pontos, 8);
    // o teste que importa: nada em `sociedade` foi contaminado pelo dinheiro
    assert.ok(!JSON.stringify(r.sociedade).includes('1500'));
  });

  test('conta os cards por coluna e os atrasados, sem olhar o relógio sozinho', () => {
    const comPrazo = [
      { id: 'a', coluna: 'fazendo', dono_id: 'u1', peso: 2, prazo: '2026-09-01' },
      { id: 'b', coluna: 'entregue', dono_id: 'u1', peso: 2, prazo: '2026-09-01' }, // entregue não atrasa
      { id: 'c', coluna: 'combinado', dono_id: 'u1', peso: 2, prazo: '2026-12-01' },
    ];
    const r = resumoDaPessoa({ entregaveis: comPrazo, pessoaId: 'u1', hojeISO: '2026-09-06' });
    assert.equal(r.atrasados, 1);
    assert.equal(r.porColuna.fazendo, 1);
    assert.equal(r.porColuna.entregue, 1);
    // sem a data de hoje, ela não inventa atraso
    assert.equal(resumoDaPessoa({ entregaveis: comPrazo, pessoaId: 'u1' }).atrasados, 0);
  });
});

describe('a reunião de segunda', () => {
  test('a pauta é fixa: quatro blocos, sempre os mesmos', () => {
    assert.deepEqual(PAUTA_PADRAO.map((b) => b.id), ['numeros', 'gargalo', 'decisoes', 'compromissos']);
  });

  test('a segunda da semana: quarta cai na segunda anterior; segunda é ela mesma', () => {
    assert.equal(segundaDaSemana('2026-09-09'), '2026-09-07'); // quarta
    assert.equal(segundaDaSemana('2026-09-07'), '2026-09-07'); // segunda
    assert.equal(segundaDaSemana('2026-09-06'), '2026-08-31'); // domingo pertence à semana que passou
  });

  test('a próxima segunda: no domingo é amanhã; na segunda é hoje', () => {
    assert.equal(proximaSegunda('2026-09-06'), '2026-09-07'); // domingo
    assert.equal(proximaSegunda('2026-09-07'), '2026-09-07'); // segunda
    assert.equal(proximaSegunda('2026-09-08'), '2026-09-14'); // terça → a que vem
  });

  test('data inválida não estoura — devolve null', () => {
    assert.equal(segundaDaSemana('banana'), null);
    assert.equal(proximaSegunda(undefined), null);
  });

  test('encontro sem nada salvo já vem com a pauta e todos os blocos vazios', () => {
    const e = encontroDaSemana([], '2026-09-09');
    assert.equal(e.data, '2026-09-07');
    assert.equal(e.existe, false);
    assert.equal(e.total, 4);
    assert.equal(e.preenchidos, 0);
    assert.ok(e.blocos.every((b) => b.vazio));
  });

  test('encontro salvo traz o texto e acusa o bloco que ficou em branco', () => {
    const encontros = [{ id: 'e1', data: '2026-09-07', blocos: { numeros: '12 reuniões', gargalo: '   ' } }];
    const e = encontroDaSemana(encontros, '2026-09-09');
    assert.equal(e.existe, true);
    assert.equal(e.id, 'e1');
    assert.equal(e.blocos.find((b) => b.id === 'numeros').texto, '12 reuniões');
    // só espaço em branco NÃO conta como preenchido: reunião com bloco vazio é
    // reunião não documentada, e isso tem que aparecer
    assert.equal(e.blocos.find((b) => b.id === 'gargalo').vazio, true);
    assert.equal(e.preenchidos, 1);
  });
});
