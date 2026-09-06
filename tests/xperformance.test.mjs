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
  COLUNAS, ORDEM_COLUNAS, podeMover, moverEntregavel, podeValidar, contaPonto,
  pontosDaPessoa, progressoSociedade, META_SOCIEDADE, PESO_MAX,
  portoesDaSociedade, semanasComEntrega, SEMANAS_JANELA, SEMANAS_MINIMAS, HABITO_DUPLICACAO,
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
  // DIR-74 — entregável só conta com carimbo de quem validou, e o validador
  // não pode ser o dono. As fixturas passaram a carregar o carimbo porque a
  // regra passou a exigi-lo: sem isso a lista inteira valeria zero.
  const lista = [
    { id: '1', coluna: 'entregue', dono_id: 'u1', peso: 5, validado_por_id: 'u9', validado_em: '2026-09-01' },
    { id: '2', coluna: 'entregue', dono_id: 'u1', peso: 3, validado_por_id: 'u9', validado_em: '2026-09-01' },
    { id: '3', coluna: 'revisao', dono_id: 'u1', peso: 5 },   // ainda não vale
    { id: '4', coluna: 'entregue', dono_id: 'u2', peso: 4, validado_por_id: 'u9' },   // é de outro
  ];

  test('só entregável VALIDADO conta ponto', () => {
    assert.equal(pontosDaPessoa(lista, 'u1'), 8);
  });

  test('card em revisão vale ZERO — é o que dá sentido à revisão', () => {
    const soEmRevisao = [{ id: 'x', coluna: 'revisao', dono_id: 'u1', peso: 5 }];
    assert.equal(pontosDaPessoa(soEmRevisao, 'u1'), 0);
  });

  test('peso fora da régua não infla o placar', () => {
    const exagerado = [{ id: 'x', coluna: 'entregue', dono_id: 'u1', peso: 999, validado_por_id: 'u9' }];
    assert.equal(pontosDaPessoa(exagerado, 'u1'), PESO_MAX);
    const negativo = [{ id: 'y', coluna: 'entregue', dono_id: 'u1', peso: -10, validado_por_id: 'u9' }];
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
      { id: 'b', coluna: 'entregue', dono_id: 'u1', peso: 2, prazo: '2026-09-01', validado_por_id: 'u9' }, // entregue não atrasa
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

// ── 🚪 DIR-74 — a sociedade virou três portões, e ninguém valida o próprio ──
describe('ninguém valida o próprio entregável', () => {
  test('validar o card de outro pode; o seu, não', () => {
    const meu = { id: 'a', dono_id: 'u1', coluna: 'revisao' };
    assert.equal(podeValidar(meu, 'u2'), true);
    assert.equal(podeValidar(meu, 'u1'), false);
    assert.equal(podeValidar(meu, null), false); // sem quem valide, não valida
  });

  // 🔒 A TRAVA DA DIR-74, no movimento
  test('mover o PRÓPRIO card pra "Entregue" é recusado — lista intacta', () => {
    const antes = [{ id: 'a', coluna: 'revisao', dono_id: 'u1', peso: 5 }];
    assert.equal(moverEntregavel(antes, 'a', 'entregue', { validadoPorId: 'u1' }), antes);
    // e o de outra pessoa passa, com carimbo
    const depois = moverEntregavel(antes, 'a', 'entregue', { validadoPorId: 'u2', validadoEm: '2026-09-07' });
    assert.equal(depois[0].coluna, 'entregue');
    assert.equal(depois[0].validado_por_id, 'u2');
    assert.equal(depois[0].validado_em, '2026-09-07');
  });

  test('voltar de "Entregue" APAGA o carimbo — validação órfã é mentira guardada', () => {
    const entregue = [{ id: 'a', coluna: 'entregue', dono_id: 'u1', peso: 5, validado_por_id: 'u2', validado_em: '2026-09-07' }];
    const volta = moverEntregavel(entregue, 'a', 'revisao', {});
    assert.equal(volta[0].validado_por_id, null);
    assert.equal(volta[0].validado_em, null);
  });

  test('card entregue SEM carimbo, ou carimbado pelo dono, vale ZERO', () => {
    assert.equal(pontosDaPessoa([{ id: 'a', coluna: 'entregue', dono_id: 'u1', peso: 5 }], 'u1'), 0);
    assert.equal(pontosDaPessoa([{ id: 'b', coluna: 'entregue', dono_id: 'u1', peso: 5, validado_por_id: 'u1' }], 'u1'), 0);
    assert.equal(pontosDaPessoa([{ id: 'c', coluna: 'entregue', dono_id: 'u1', peso: 5, validado_por_id: 'u2' }], 'u1'), 5);
    assert.equal(contaPonto({ coluna: 'revisao', dono_id: 'u1', validado_por_id: 'u2' }), false);
  });
});

describe('os três portões da sociedade', () => {
  const hoje = '2026-09-07'; // uma segunda
  // uma entrega por semana, nas 10 últimas semanas
  const semanal = (n) => Array.from({ length: n }, (_, i) => {
    const d = new Date('2026-09-07T12:00:00'); d.setDate(d.getDate() - 7 * i);
    return { id: `s${i}`, coluna: 'entregue', dono_id: 'u1', peso: 1, validado_por_id: 'u9', validado_em: d.toISOString().slice(0, 10) };
  });

  test('são três, e a conversa só abre com os TRÊS acesos', () => {
    const r = portoesDaSociedade({ entregaveis: [], pessoaId: 'u1', hojeISO: hoje });
    assert.deepEqual(r.portoes.map((p) => p.id), ['peso', 'consistencia', 'duplicacao']);
    assert.equal(r.total, 3);
    assert.equal(r.liberado, false);
  });

  // 🔒 O QUE A BARRA SOZINHA NÃO VIA: pico não é ritmo
  test('todo o peso numa semana só NÃO abre a consistência', () => {
    const pico = Array.from({ length: 40 }, (_, i) => ({
      id: `p${i}`, coluna: 'entregue', dono_id: 'u1', peso: 5,
      validado_por_id: 'u9', validado_em: '2026-09-07',
    }));
    const r = portoesDaSociedade({ entregaveis: pico, pessoaId: 'u1', hojeISO: hoje });
    assert.equal(r.portoes.find((p) => p.id === 'peso').aberto, true, '200 pontos deviam abrir o peso');
    assert.equal(r.portoes.find((p) => p.id === 'consistencia').aberto, false, 'uma semana só não é ritmo');
    assert.equal(r.liberado, false);
  });

  test('a consistência conta SEMANAS distintas, não entregáveis', () => {
    // três cards na mesma semana valem UMA semana
    const mesmaSemana = [1, 2, 3].map((i) => ({
      id: `m${i}`, coluna: 'entregue', dono_id: 'u1', peso: 1,
      validado_por_id: 'u9', validado_em: '2026-09-07',
    }));
    assert.equal(semanasComEntrega({ entregaveis: mesmaSemana, pessoaId: 'u1', hojeISO: hoje }).semanas, 1);
    assert.equal(semanasComEntrega({ entregaveis: semanal(10), pessoaId: 'u1', hojeISO: hoje }).semanas, 10);
  });

  test('entrega velha demais sai da janela das 12 semanas', () => {
    const antiga = [{ id: 'v', coluna: 'entregue', dono_id: 'u1', peso: 1, validado_por_id: 'u9', validado_em: '2026-05-01' }];
    assert.equal(semanasComEntrega({ entregaveis: antiga, pessoaId: 'u1', hojeISO: hoje }).semanas, 0);
    assert.equal(semanasComEntrega({ entregaveis: semanal(20), pessoaId: 'u1', hojeISO: hoje }).semanas, SEMANAS_JANELA);
  });

  test('a duplicação exige o Hábito 8 VALIDADO — peso nenhum substitui', () => {
    const semDuplicar = semanal(10);
    const r1 = portoesDaSociedade({ entregaveis: semDuplicar, pessoaId: 'u1', hojeISO: hoje });
    assert.equal(r1.portoes.find((p) => p.id === 'consistencia').aberto, true);
    assert.equal(r1.portoes.find((p) => p.id === 'duplicacao').aberto, false);

    const comDuplicar = [...semDuplicar, {
      id: 'd', coluna: 'entregue', dono_id: 'u1', peso: 5,
      habito: HABITO_DUPLICACAO, validado_por_id: 'u9', validado_em: '2026-09-07',
    }];
    const r2 = portoesDaSociedade({ entregaveis: comDuplicar, pessoaId: 'u1', hojeISO: hoje });
    assert.equal(r2.portoes.find((p) => p.id === 'duplicacao').aberto, true);
  });

  test('os três acesos liberam — e é preciso os TRÊS, não a média', () => {
    const tudo = [
      ...Array.from({ length: 20 }, (_, i) => {
        const d = new Date('2026-09-07T12:00:00'); d.setDate(d.getDate() - 7 * (i % SEMANAS_MINIMAS));
        return { id: `t${i}`, coluna: 'entregue', dono_id: 'u1', peso: 5, validado_por_id: 'u9', validado_em: d.toISOString().slice(0, 10) };
      }),
      { id: 'dup', coluna: 'entregue', dono_id: 'u1', peso: 5, habito: HABITO_DUPLICACAO, validado_por_id: 'u9', validado_em: '2026-09-07' },
    ];
    const r = portoesDaSociedade({ entregaveis: tudo, pessoaId: 'u1', hojeISO: hoje });
    assert.equal(r.abertos, 3, JSON.stringify(r.portoes.map((p) => [p.id, p.valor, p.alvo])));
    assert.equal(r.liberado, true);
  });

  // 🩹 Este teste nasceu de uma falha da MINHA bateria: troquei o `every` por
  // "2 de 3 basta" e NENHUM teste reclamou — porque eu só tinha caso de 3
  // abertos e de 1 aberto. Faltava exatamente o caso do meio, que é onde a
  // regra da média se esconde. Sem ele eu estaria entregando uma trava que
  // ninguém guardava.
  test('DOIS portões acesos NÃO liberam — é `e`, não média', () => {
    const doisAbertos = [
      // peso e consistência abertos; duplicação (Hábito 8) fechada
      ...Array.from({ length: 20 }, (_, i) => {
        const d = new Date('2026-09-07T12:00:00'); d.setDate(d.getDate() - 7 * (i % SEMANAS_MINIMAS));
        return { id: `x${i}`, coluna: 'entregue', dono_id: 'u1', peso: 5, validado_por_id: 'u9', validado_em: d.toISOString().slice(0, 10) };
      }),
    ];
    const r = portoesDaSociedade({ entregaveis: doisAbertos, pessoaId: 'u1', hojeISO: hoje });
    assert.equal(r.abertos, 2, JSON.stringify(r.portoes.map((p) => [p.id, p.valor, p.alvo])));
    assert.equal(r.liberado, false, 'dois de três não pode abrir a conversa de sociedade');
  });

  test('sem a data de hoje não inventa portão aberto', () => {
    const r = portoesDaSociedade({ entregaveis: semanal(12), pessoaId: 'u1' });
    assert.equal(r.portoes.find((p) => p.id === 'consistencia').valor, 0);
    assert.equal(r.liberado, false);
  });

  test('os portões chegam no resumo da pessoa, prontos pra tela', () => {
    const r = resumoDaPessoa({ entregaveis: semanal(10), pessoaId: 'u1', fixoMes: 1300, hojeISO: hoje });
    assert.equal(r.portoes.total, 3);
    assert.equal(r.fixo, 1300); // e o fixo segue sem contaminar nada
    assert.ok(!JSON.stringify(r.portoes).includes('1300'));
  });
});
