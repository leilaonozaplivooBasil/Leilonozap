// 🗂️ O NOSSO QUADRO — versão listas + checklist + feito automático (DIR-76).
//
// O que estes testes protegem, em ordem de importância:
//   1. o feito AUTOMÁTICO: fechar o último item leva pro Feito; reabrir um
//      item traz de volta — a regra que apaga as colunas "Concluídas" feitas à mão;
//   2. o cartão vira tarefa UMA vez, e a tarefa feita DEVOLVE pro card;
//   3. atrasado sobe pro topo da lista dele;
//   4. nada aqui lê o relógio sozinho.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ESTADO_ABERTO, ESTADO_FEITO, LISTAS_MODELO, CARD_EXEMPLO, CORES_LISTA,
  estaFeito, estaAberto, progressoChecklist, atrasado, marcarFeito, reabrir,
  alternarItem, adicionarItem, removerItem, arquivavel, cartoesDaLista, feitosNaMesa,
  semLista, tarefaDoCartao, cartaoDaTarefa, cartaoDaTarefaFeita, resumoDoQuadro,
  reordenarListas, ICONES_LISTA, EMOJIS_LISTA, marcaValida, ehEmoji,
} from '../src/lib/quadroCompromisso.js';

const HOJE = '2026-09-07';

describe('🔒 o feito é automático', () => {
  const card = { id: 'c', coluna: ESTADO_ABERTO, checklist: [{ texto: 'a', feito: true }, { texto: 'b', feito: false }] };

  test('fechar o ÚLTIMO item leva o card pro Feito, com carimbo', () => {
    const r = alternarItem(card, 1, '2026-09-07T10:00:00Z');
    assert.equal(estaFeito(r), true);
    assert.equal(r.feito_em, '2026-09-07T10:00:00Z');
    assert.equal(progressoChecklist(r).pct, 100);
  });

  test('fechar um item que NÃO é o último só avança o "2/5"', () => {
    const r = alternarItem({ ...card, checklist: [{ texto: 'a', feito: false }, { texto: 'b', feito: false }] }, 0);
    assert.equal(estaFeito(r), false);
    assert.deepEqual(progressoChecklist(r), { feitos: 1, total: 2, pct: 50 });
  });

  test('reabrir um item de card feito traz ele de volta pra mesa e apaga o carimbo', () => {
    const feito = alternarItem(card, 1, '2026-09-07T10:00:00Z');
    const volta = alternarItem(feito, 0);
    assert.equal(estaAberto(volta), true);
    assert.equal(volta.feito_em, null);
  });

  test('item novo num card feito reabre o card — tem trabalho de novo', () => {
    const feito = marcarFeito(card, '2026-09-07T10:00:00Z');
    const r = adicionarItem(feito, 'mais uma coisa');
    assert.equal(estaAberto(r), true);
    assert.equal(r.checklist.length, 3);
  });

  test('texto vazio não vira item; índice fora da lista não muda nada', () => {
    assert.equal(adicionarItem(card, '   '), card);
    assert.equal(alternarItem(card, 9), card);
    assert.equal(removerItem(card, -1), card);
    assert.equal(removerItem(card, 0).checklist.length, 1);
  });

  test('card sem checklist marcado à mão vai pro Feito, e reabrir volta', () => {
    const solto = { id: 's', coluna: ESTADO_ABERTO, checklist: [] };
    const f = marcarFeito(solto, '2026-09-07T10:00:00Z');
    assert.equal(estaFeito(f), true);
    assert.equal(estaAberto(reabrir(f)), true);
    assert.equal(reabrir(f).feito_em, null);
  });

  test('nada disto muta o card original', () => {
    const antes = JSON.stringify(card);
    alternarItem(card, 1, 'x'); adicionarItem(card, 'y'); marcarFeito(card, 'z'); removerItem(card, 0);
    assert.equal(JSON.stringify(card), antes);
  });
});

describe('os horizontes da DIR-75 continuam lendo como "na mesa"', () => {
  test('hoje/semana/depois são abertos; feito é feito', () => {
    for (const c of ['hoje', 'semana', 'depois', 'aberto']) assert.equal(estaAberto({ coluna: c }), true, c);
    assert.equal(estaAberto({ coluna: 'feito' }), false);
    assert.equal(estaFeito({ coluna: 'feito' }), true);
  });
  test('card sem lista aparece em semLista — pra tela pôr na primeira', () => {
    const cs = [{ id: 'a', coluna: 'hoje' }, { id: 'b', coluna: 'aberto', lista_id: 'l1' }, { id: 'c', coluna: 'feito' }];
    assert.deepEqual(semLista(cs).map((c) => c.id), ['a']);
  });
});

describe('atrasado com saída', () => {
  const cs = [
    { id: 'tarde', lista_id: 'l1', coluna: 'aberto', prazo: '2026-12-01', ordem: 0 },
    { id: 'vencido', lista_id: 'l1', coluna: 'aberto', prazo: '2026-09-01', ordem: 5 },
    { id: 'semprazo', lista_id: 'l1', coluna: 'aberto', ordem: 1 },
    { id: 'outra', lista_id: 'l2', coluna: 'aberto', prazo: '2026-09-01' },
    { id: 'feito', lista_id: 'l1', coluna: 'feito', prazo: '2026-09-01', feito_em: '2026-09-06T10:00:00Z' },
  ];

  test('vencido e aberto é atrasado; feito com prazo velho não é', () => {
    assert.equal(atrasado(cs[1], HOJE), true);
    assert.equal(atrasado(cs[4], HOJE), false);
    assert.equal(atrasado(cs[0], HOJE), false);
  });

  test('o atrasado SOBE pro topo da lista dele, depois prazo, depois ordem', () => {
    assert.deepEqual(cartoesDaLista(cs, 'l1').map((c) => c.id), ['vencido', 'tarde', 'semprazo']);
  });

  test('a lista só mostra os DELA e só os abertos', () => {
    const ids = cartoesDaLista(cs, 'l1').map((c) => c.id);
    assert.ok(!ids.includes('outra'));
    assert.ok(!ids.includes('feito'));
  });

  test('sem a data de hoje não inventa atraso', () => {
    assert.equal(atrasado(cs[1]), false);
    assert.equal(resumoDoQuadro(cs).atrasados, 0);
    assert.equal(resumoDoQuadro(cs, HOJE).atrasados, 2);
  });
});

describe('o feito sai da mesa depois de 7 dias', () => {
  test('feito ontem fica; feito há 8 dias sai; sem carimbo não sai', () => {
    assert.equal(arquivavel({ coluna: 'feito', feito_em: '2026-09-06T10:00:00Z' }, HOJE), false);
    assert.equal(arquivavel({ coluna: 'feito', feito_em: '2026-08-30T10:00:00Z' }, HOJE), true);
    assert.equal(arquivavel({ coluna: 'feito' }, HOJE), false);
    assert.equal(arquivavel({ coluna: 'aberto', feito_em: '2026-08-01' }, HOJE), false);
  });
  test('feitosNaMesa vem do mais recente e sem os arquivados', () => {
    const cs = [
      { id: 'velho', coluna: 'feito', feito_em: '2026-08-01T10:00:00Z' },
      { id: 'ontem', coluna: 'feito', feito_em: '2026-09-06T10:00:00Z' },
      { id: 'anteontem', coluna: 'feito', feito_em: '2026-09-05T10:00:00Z' },
    ];
    assert.deepEqual(feitosNaMesa(cs, HOJE).map((c) => c.id), ['ontem', 'anteontem']);
  });
});

describe('🔗 ida e volta com o dia', () => {
  const cartao = { id: 'c1', titulo: 'Pegar as pautas', detalhe: 'com o time', coluna: 'aberto' };

  test('quadro → dia: vira tarefa do dia certo, da pessoa certa', () => {
    const t = tarefaDoCartao(cartao, { userId: 'u1', dataISO: HOJE });
    assert.equal(t.user_id, 'u1'); assert.equal(t.data, HOJE); assert.equal(t.titulo, 'Pegar as pautas'); assert.equal(t.feito, false);
  });

  // 🔒 A TRAVA QUE PROTEGE O DINHEIRO
  test('cartão que JÁ virou tarefa não vira de novo', () => {
    assert.equal(tarefaDoCartao({ ...cartao, virou_tarefa_id: 't9' }, { userId: 'u1', dataISO: HOJE }), null);
  });

  test('a VOLTA: tarefa feita no Compromisso leva o card dela pro Feito; desmarcar reabre', () => {
    const cs = [{ ...cartao, virou_tarefa_id: 't9' }, { id: 'c2', coluna: 'aberto' }];
    const f = cartaoDaTarefaFeita(cs, 't9', true, '2026-09-07T18:00:00Z');
    assert.equal(f.id, 'c1'); assert.equal(estaFeito(f), true); assert.equal(f.feito_em, '2026-09-07T18:00:00Z');
    assert.equal(estaAberto(cartaoDaTarefaFeita(cs, 't9', false)), true);
    assert.equal(cartaoDaTarefaFeita(cs, 'nao-e-de-card', true), null);
  });

  test('dia → quadro: tarefa que não saiu vira card na lista, sem o feito', () => {
    const c = cartaoDaTarefa({ id: 't1', titulo: 'Ligar pro Renan', detalhe: 'sobre o contrato', feito: false, habito: 4 }, { userId: 'u1', listaId: 'l1' });
    assert.equal(c.lista_id, 'l1'); assert.equal(c.titulo, 'Ligar pro Renan'); assert.equal(c.coluna, ESTADO_ABERTO); assert.equal(c.habito, 4);
    assert.equal(c.feito, undefined);
    assert.equal(cartaoDaTarefa({ titulo: 'x' }, { userId: 'u1' }), null, 'sem lista não guarda');
    assert.equal(cartaoDaTarefa({ titulo: '  ' }, { userId: 'u1', listaId: 'l1' }), null);
  });
});

describe('o modelo pronto', () => {
  // 🎨 sem isto, uma cor de modelo que não existe na paleta cai no tom neutro
  // SEM ERRO NENHUM — e o quadro do primeiro uso, que é o cartão de visita da
  // ferramenta, nasceria cinza sem ninguém entender por quê.
  test('toda cor do modelo existe na paleta', () => {
    const fora = LISTAS_MODELO.filter((l) => !CORES_LISTA.includes(l.cor));
    assert.deepEqual(fora.map((l) => `${l.nome}=${l.cor}`), []);
  });

  test('três listas com nome e cor, e um card de exemplo com checklist aberto', () => {
    assert.equal(LISTAS_MODELO.length, 3);
    assert.ok(LISTAS_MODELO.every((l) => l.nome && l.cor));
    assert.ok(CARD_EXEMPLO.checklist.length >= 3);
    assert.ok(CARD_EXEMPLO.checklist.every((i) => i.feito === false));
  });
});

describe('arrastar a lista de um lado pro outro (DIR-76.2)', () => {
  const ls = [{ id: 'a', ordem: 0 }, { id: 'b', ordem: 1 }, { id: 'c', ordem: 2 }];

  test('move e RENUMERA todas — ordem com buraco volta embaralhada na próxima leitura', () => {
    const r = reordenarListas(ls, 'c', 0);
    assert.deepEqual(r.map((l) => l.id), ['c', 'a', 'b']);
    assert.deepEqual(r.map((l) => l.ordem), [0, 1, 2]);
  });

  test('move pra direita também', () => {
    assert.deepEqual(reordenarListas(ls, 'a', 2).map((l) => l.id), ['b', 'c', 'a']);
  });

  test('índice fora da faixa gruda na ponta, e não quebra', () => {
    assert.deepEqual(reordenarListas(ls, 'a', 99).map((l) => l.id), ['b', 'c', 'a']);
    assert.deepEqual(reordenarListas(ls, 'c', -5).map((l) => l.id), ['c', 'a', 'b']);
  });

  test('mesma posição, lista inexistente ou destino inválido: MESMA lista', () => {
    assert.equal(reordenarListas(ls, 'a', 0), ls);
    assert.equal(reordenarListas(ls, 'nao-existe', 1), ls);
    assert.equal(reordenarListas(ls, 'a', 'banana'), ls);
  });

  test('não muta a original', () => {
    const antes = JSON.stringify(ls);
    reordenarListas(ls, 'c', 0);
    assert.equal(JSON.stringify(ls), antes);
  });

  test('os ícones oferecidos são nomes, e sem repetido', () => {
    assert.ok(ICONES_LISTA.length >= 8);
    assert.equal(new Set(ICONES_LISTA).size, ICONES_LISTA.length);
    assert.ok(ICONES_LISTA.every((i) => typeof i === 'string' && i.trim()));
  });
});

describe('a marca da lista: ícone da casa OU emoji escolhido (DIR-76.3)', () => {
  test('as duas famílias existem, sem repetido dentro de cada uma', () => {
    assert.ok(EMOJIS_LISTA.length >= 12);
    assert.equal(new Set(EMOJIS_LISTA).size, EMOJIS_LISTA.length);
    assert.equal(new Set(ICONES_LISTA).size, ICONES_LISTA.length);
  });

  test('nome e emoji não se misturam — cada marca é de uma família só', () => {
    const cruzados = ICONES_LISTA.filter((i) => EMOJIS_LISTA.includes(i));
    assert.deepEqual(cruzados, []);
    assert.equal(ehEmoji('🔥'), true);
    assert.equal(ehEmoji('academia'), false);
  });

  test('só marca conhecida é aceita — lixo no campo não vira desenho', () => {
    assert.equal(marcaValida('academia'), true);
    assert.equal(marcaValida('🔥'), true);
    assert.equal(marcaValida('nao-existe'), false);
    assert.equal(marcaValida(''), false);
    assert.equal(marcaValida(null), false);
  });
});
