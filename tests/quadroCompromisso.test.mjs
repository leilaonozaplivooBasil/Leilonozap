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
  semLista, tarefaDoCartao, cartaoDaTarefa, cartaoDaTarefaFeita, resumoDoQuadro, feitosDaLista,
  reordenarListas, ICONES_LISTA, EMOJIS_LISTA, marcaValida, ehEmoji,
  emMinutos, emHora, fimDe, conflitosDeHorario, horaSugerida, faixaDeHorario,
  saidaDoConflito, reordenarCartoes,
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

// ── ⏰ DIR-77 — O HORÁRIO É A PONTE ENTRE O QUADRO E O DIA ──────────────────
describe('o horário do card', () => {
  test('HH:mm vira minutos; lixo vira null — e null não é zero', () => {
    assert.equal(emMinutos('00:00'), 0, 'meia-noite é horário válido, não ausência');
    assert.equal(emMinutos('09:30'), 570);
    assert.equal(emMinutos('23:59'), 1439);
    assert.equal(emMinutos('24:00'), null);
    assert.equal(emMinutos('09:60'), null);
    assert.equal(emMinutos('banana'), null);
    assert.equal(emMinutos(''), null);
    assert.equal(emHora(570), '09:30');
  });

  test('o fim: o gravado quando existe, senão início + duração', () => {
    assert.equal(fimDe({ hora: '09:00', hora_fim: '10:30' }), 630);
    assert.equal(fimDe({ hora: '09:00' }, 45), 585);
    // fim antes do início é lixo: cai na duração padrão em vez de virar negativo
    assert.equal(fimDe({ hora: '09:00', hora_fim: '08:00' }, 30), 570);
    assert.equal(fimDe({}), null);
  });

  // 🔒 duas coisas às 14h é o defeito mais caro de uma agenda
  test('sobreposição acusa; ENCOSTAR não é conflito', () => {
    const dia = [{ id: 'a', hora: '09:00', hora_fim: '10:00' }];
    assert.deepEqual(conflitosDeHorario(dia, { hora: '09:30' }).map((x) => x.id), ['a']);
    assert.deepEqual(conflitosDeHorario(dia, { hora: '08:45', hora_fim: '09:15' }).map((x) => x.id), ['a']);
    assert.deepEqual(conflitosDeHorario(dia, { hora: '10:00', hora_fim: '10:30' }), [], 'uma acaba 10:00 e a outra começa 10:00: cabe');
    assert.deepEqual(conflitosDeHorario(dia, { hora: '08:00', hora_fim: '09:00' }), []);
  });

  test('não conflita consigo mesmo, nem com o que já foi feito, nem com o sem hora', () => {
    const dia = [
      { id: 'a', hora: '09:00', hora_fim: '10:00' },
      { id: 'b', hora: '09:30', feito: true },
      { id: 'c', titulo: 'sem hora' },
    ];
    assert.deepEqual(conflitosDeHorario(dia, { hora: '09:15', ignorarId: 'a' }).map((x) => x.id), []);
    assert.equal(conflitosDeHorario(dia, { hora: '09:40' }).some((x) => x.id === 'b'), false);
    assert.equal(conflitosDeHorario([], { hora: '09:00' }).length, 0);
    assert.deepEqual(conflitosDeHorario(dia, { hora: 'banana' }), []);
  });

  test('a hora sugerida é o primeiro buraco de verdade', () => {
    const cheioDeManha = [{ id: 'a', hora: '08:00', hora_fim: '09:00' }, { id: 'b', hora: '09:00', hora_fim: '10:00' }];
    assert.equal(horaSugerida(cheioDeManha, { duracaoMin: 30 }), '10:00');
    assert.equal(horaSugerida([], { duracaoMin: 30 }), '08:00');
    // dia lotado da janela inteira: NÃO inventa horário conflitado
    const lotado = [{ id: 'x', hora: '08:00', hora_fim: '22:00' }];
    assert.equal(horaSugerida(lotado, { duracaoMin: 30 }), null);
  });

  test('a faixa lê pra tela: "09:00 às 10:00", ou só o início', () => {
    assert.equal(faixaDeHorario({ hora: '09:00', hora_fim: '10:00' }), '09:00 às 10:00');
    assert.equal(faixaDeHorario({ hora: '09:00' }), '09:00');
    assert.equal(faixaDeHorario({}), '');
  });

  // 🔗 A PONTE: é a hora do card que faz a tarefa cair no lugar certo do dia
  test('o card leva a HORA dele pra tarefa do dia — senão cai no balde "sem hora"', () => {
    const card = { id: 'c', titulo: 'Reunião com o time', hora: '14:00', hora_fim: '15:00' };
    const t = tarefaDoCartao(card, { userId: 'u1', dataISO: '2026-09-07' });
    assert.equal(t.hora, '14:00');
    assert.equal(t.hora_fim, '15:00');
    // card sem hora continua virando tarefa, só que sem horário
    assert.equal(tarefaDoCartao({ id: 'x', titulo: 'algo' }, { userId: 'u1', dataISO: '2026-09-07' }).hora, null);
  });

  test('na lista, quem TEM hora sobe e vem em ordem de relógio', () => {
    const cs = [
      { id: 'tarde', lista_id: 'l', coluna: 'aberto', hora: '16:00' },
      { id: 'semhora', lista_id: 'l', coluna: 'aberto', ordem: 0 },
      { id: 'cedo', lista_id: 'l', coluna: 'aberto', hora: '08:00' },
    ];
    assert.deepEqual(cartoesDaLista(cs, 'l').map((c) => c.id), ['cedo', 'tarde', 'semhora']);
  });
});

describe('o feito fica na coluna dele (DIR-77.1)', () => {
  const cs = [
    { id: 'a', lista_id: 'l1', coluna: 'aberto' },
    { id: 'b', lista_id: 'l1', coluna: 'feito', feito_em: '2026-09-06T10:00:00Z' },
    { id: 'c', lista_id: 'l1', coluna: 'feito', feito_em: '2026-09-05T10:00:00Z' },
    { id: 'd', lista_id: 'l2', coluna: 'feito', feito_em: '2026-09-06T10:00:00Z' },
    { id: 'velho', lista_id: 'l1', coluna: 'feito', feito_em: '2026-08-01T10:00:00Z' },
  ];

  test('cada lista mostra os SEUS feitos, do mais recente pro mais antigo', () => {
    assert.deepEqual(feitosDaLista(cs, 'l1', '2026-09-07').map((c) => c.id), ['b', 'c']);
    assert.deepEqual(feitosDaLista(cs, 'l2', '2026-09-07').map((c) => c.id), ['d']);
  });

  test('o feito velho sai da coluna sozinho — 7 dias e some da mesa', () => {
    assert.ok(!feitosDaLista(cs, 'l1', '2026-09-07').some((c) => c.id === 'velho'));
  });

  test('o aberto NÃO aparece entre os feitos, e vice-versa', () => {
    assert.ok(!feitosDaLista(cs, 'l1', '2026-09-07').some((c) => c.id === 'a'));
    assert.ok(!cartoesDaLista(cs, 'l1').some((c) => estaFeito(c)));
  });
});

// ── 🔧 DIR-77.2 — avisar é meio serviço; a saída em um clique é o serviço ──
describe('a saída do conflito', () => {
  const dia = [
    { id: 'r1', titulo: 'Reunião 1', hora: '13:00', hora_fim: '14:00' },
    { id: 'r2', titulo: 'Reunião 2', hora: '14:00', hora_fim: '15:00' },
  ];

  test('não sai de um conflito pra cair em outro', () => {
    // 13:15 encavala na r1; o fim dela é 14:00, que é o começo da r2 —
    // a saída tem que ir até depois das DUAS
    assert.equal(saidaDoConflito(dia, { hora: '13:15' }), '15:00');
  });

  test('sem conflito não sugere nada — não há o que resolver', () => {
    assert.equal(saidaDoConflito(dia, { hora: '16:00' }), null);
    assert.equal(saidaDoConflito([], { hora: '13:00' }), null);
    assert.equal(saidaDoConflito(dia, { hora: 'banana' }), null);
  });

  test('a saída respeita a DURAÇÃO de quem está sendo movido', () => {
    const cheio = [
      { id: 'a', hora: '13:00', hora_fim: '14:00' },
      { id: 'b', hora: '14:30', hora_fim: '15:00' },
    ];
    // uma peça de 2h não cabe no vão de 14:00–14:30: tem que ir pra depois das 15:00
    assert.equal(saidaDoConflito(cheio, { hora: '13:30', hora_fim: '15:30' }), '15:00');
  });

  test('não conta a si mesmo como conflito ao se mover', () => {
    const comEle = [...dia, { id: 'eu', hora: '13:15', hora_fim: '13:45' }];
    assert.equal(saidaDoConflito(comEle, { hora: '13:15', hora_fim: '13:45', ignorarId: 'eu' }), '15:00');
  });
});

describe('reordenar cards dentro da lista (DIR-77.2)', () => {
  const cs = [
    { id: 'a', lista_id: 'l1', ordem: 0 },
    { id: 'b', lista_id: 'l1', ordem: 1 },
    { id: 'c', lista_id: 'l1', ordem: 2 },
    { id: 'z', lista_id: 'l2', ordem: 0 },
  ];

  test('arrastar um sobre o outro renumera a lista inteira', () => {
    const r = reordenarCartoes(cs, 'c', 'a');
    const daL1 = r.filter((x) => x.lista_id === 'l1').sort((x, y) => x.ordem - y.ordem).map((x) => x.id);
    assert.deepEqual(daL1, ['c', 'a', 'b']);
  });

  test('não mistura listas — arrastar sobre card de OUTRA lista não faz nada', () => {
    assert.equal(reordenarCartoes(cs, 'a', 'z'), cs);
  });

  test('sobre si mesmo, ou card que não existe: MESMA lista', () => {
    assert.equal(reordenarCartoes(cs, 'a', 'a'), cs);
    assert.equal(reordenarCartoes(cs, 'nao-existe', 'a'), cs);
    assert.equal(reordenarCartoes(cs, 'a', 'nao-existe'), cs);
  });

  test('a lista de outra coluna não é renumerada de tabela', () => {
    assert.equal(reordenarCartoes(cs, 'c', 'a').find((x) => x.id === 'z').ordem, 0);
  });

  test('não muta a original', () => {
    const antes = JSON.stringify(cs);
    reordenarCartoes(cs, 'c', 'a');
    assert.equal(JSON.stringify(cs), antes);
  });

  // 🔒 quem tem HORA continua mandado pelo relógio, e isso é de propósito
  test('arrastar NÃO desmancha a ordem do relógio: hora vence ordem', () => {
    const comHora = [
      { id: 'tarde', lista_id: 'l', coluna: 'aberto', hora: '16:00', ordem: 0 },
      { id: 'cedo', lista_id: 'l', coluna: 'aberto', hora: '08:00', ordem: 9 },
    ];
    assert.deepEqual(cartoesDaLista(comHora, 'l').map((c) => c.id), ['cedo', 'tarde']);
  });
});
