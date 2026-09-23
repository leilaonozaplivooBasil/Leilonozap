/**
 * 📊 O RELATÓRIO DE UM LEILÃO — e a ressalva que o sustenta.
 *
 * 22/09/2026: o dono recebeu à mão o relatório dos depósitos do leilão do
 * Playstation 5 e decidiu que vira função, "para todos que podem enviar demanda".
 *
 * O caso de baixo é o PS5 DE VERDADE, com os números conferidos contra a base:
 * 23 depósitos pagos, R$ 10.400,00, 2 tentativas não pagas (R$ 1.200,00),
 * 6 pessoas. Se esta prova cair, o relatório parou de bater com o que eu
 * entreguei em PDF — e o número que circula na empresa passa a ser outro.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  relatorioDoLeilao, depositosDoLeilao, janelaDoLeilao, quemDeuLance,
  reservadoPorPessoa, lancesPorPessoa, estaPago, formaEmPalavras, quando,
  RESSALVA, SELO_INTERNO,
} from '../src/lib/relatorioDoLeilao.js';

const LEILAO = {
  id: 'ps5', title: 'Playstation 5', status: 'ended',
  created_date: '2026-09-14T19:53:00Z',
  end_time: '2026-09-20T21:00:00Z',
  starting_price: 497, current_price: 1897, frete_reservado_valor: 50.44,
  winner_id: 'hercules', winner_name: 'Hercules rangel trigoli',
};
const LANCES = [
  { sender_id: 'hercules' }, { sender_id: 'hercules' },
  { sender_id: 'douglas' }, { sender_id: 'angela' },
];
const NOMES = { hercules: 'Hercules rangel trigoli', douglas: 'Douglas Pimenta Pereira', angela: 'Ângela M. Rocha dos Santos' };
const dep = (id, dono, valor, status, data, metodo = 'pix_mp') => ({
  id, buyer_id: dono, total_amount: valor, status, created_date: data, payment_method: metodo,
});

describe('relatório do leilão', () => {
  test('🔴 A RESSALVA vai junto do relatório, não fica só na tela', () => {
    const r = relatorioDoLeilao({ leilao: LEILAO, lances: LANCES, depositos: [], nomes: NOMES });
    assert.equal(r.ressalva, RESSALVA);
    assert.match(r.ressalva, /não fica marcado com o leilão/i);
    assert.match(r.ressalva, /deu lance neste leilão/i,
      'sem dizer o critério, o número vira "os depósitos deste leilão" — que é falso');
    assert.equal(r.selo, SELO_INTERNO);
    assert.match(r.selo, /não circular/i);
  });

  test('🔴 só entra depósito de QUEM DEU LANCE, dentro da janela', () => {
    const depositos = [
      dep('a', 'hercules', 600, 'paid', '2026-09-17T15:22:00Z'),        // ✅
      dep('b', 'estranho', 999, 'paid', '2026-09-17T15:22:00Z'),        // ❌ não deu lance
      dep('c', 'douglas', 500, 'paid', '2026-09-10T10:00:00Z'),         // ❌ antes de abrir
      dep('d', 'douglas', 500, 'paid', '2026-09-25T10:00:00Z'),         // ❌ depois de fechar
    ];
    const meus = depositosDoLeilao(depositos, { lances: LANCES, leilao: LEILAO });
    assert.deepEqual(meus.map((d) => d.id), ['a']);
  });

  test('a janela é INCLUSIVA nas duas pontas', () => {
    const depositos = [
      dep('abertura', 'hercules', 100, 'paid', '2026-09-14T19:53:00Z'),
      dep('fim', 'hercules', 100, 'paid', '2026-09-20T21:00:00Z'),
    ];
    const meus = depositosDoLeilao(depositos, { lances: LANCES, leilao: LEILAO });
    assert.equal(meus.length, 2,
      'corte exclusivo perde justamente a corrida do fechamento, que é o momento que mais pesa');
  });

  test('🔴 pago e não pago são contados SEPARADOS — não pago não é dinheiro', () => {
    const depositos = [
      dep('a', 'hercules', 600, 'paid', '2026-09-17T12:24:00Z'),
      dep('b', 'hercules', 600, 'canceled', '2026-09-17T12:22:00Z'),
      dep('c', 'angela', 600, 'pending', '2026-09-20T15:00:00Z'),
    ];
    const r = relatorioDoLeilao({ leilao: LEILAO, lances: LANCES, depositos, nomes: NOMES });
    assert.equal(r.entrou.depositosPagos, 1);
    assert.equal(r.entrou.valorPago, 600);
    assert.equal(r.entrou.tentativasNaoPagas, 2);
    assert.equal(r.entrou.valorNaoPago, 1200);
    assert.equal(r.entrou.quemDepositou, 1, 'quem só tentou não conta como quem depositou');
  });

  test('quem deu lance aparece mesmo SEM depósito nenhum', () => {
    const r = relatorioDoLeilao({ leilao: LEILAO, lances: LANCES, depositos: [], nomes: NOMES });
    assert.equal(r.pessoas.length, 3,
      'sumir com quem disputou usando saldo que já tinha esconde participante real');
    assert.deepEqual(r.pessoas.map((p) => p.depositos), [0, 0, 0]);
  });

  test('o arrematante vem marcado', () => {
    const r = relatorioDoLeilao({ leilao: LEILAO, lances: LANCES, depositos: [], nomes: NOMES });
    assert.equal(r.pessoas.find((p) => p.id === 'hercules').arrematou, true);
    assert.equal(r.pessoas.find((p) => p.id === 'douglas').arrematou, false);
    assert.equal(r.leilao.arrematante, 'Hercules rangel trigoli');
  });

  test('🔴 o cobrado do ganhador é arremate + frete', () => {
    const r = relatorioDoLeilao({ leilao: LEILAO, lances: LANCES, depositos: [], nomes: NOMES });
    assert.equal(r.leilao.arremate, 1897);
    assert.equal(r.leilao.frete, 50.44);
    assert.equal(r.leilao.cobradoDoGanhador, 1947.44, 'é o número que o financeiro cobra');
  });

  describe('o RESERVADO — a coluna que mais confunde', () => {
    test('soma só a ENTRADA de reserva, nunca a devolução', () => {
      const reservas = [
        { user_id: 'hercules', direcao: 'entrada_reserva', valor: 647.44 },
        { user_id: 'hercules', direcao: 'saida_reserva', valor: 647.44 },
        { user_id: 'douglas', direcao: 'entrada_reserva', valor: 100 },
      ];
      const m = reservadoPorPessoa(reservas);
      assert.equal(m.get('hercules'), 647.44,
        'somar a saída zeraria o total e a coluna mentiria que ninguém reservou nada');
      assert.equal(m.get('douglas'), 100);
    });

    test('reservado NÃO entra no valor pago', () => {
      const depositos = [dep('a', 'hercules', 600, 'paid', '2026-09-17T12:24:00Z')];
      const reservas = [{ user_id: 'hercules', direcao: 'entrada_reserva', valor: 5000 }];
      const r = relatorioDoLeilao({ leilao: LEILAO, lances: LANCES, depositos, reservas, nomes: NOMES });
      assert.equal(r.entrou.valorPago, 600, 'reserva virou dinheiro cobrado — conta dobrada');
      assert.equal(r.totais.reservado, 5000);
    });
  });

  test('o extrato sai em ORDEM DE ACONTECIMENTO', () => {
    const depositos = [
      dep('c', 'hercules', 100, 'paid', '2026-09-20T13:31:00Z'),
      dep('a', 'hercules', 600, 'paid', '2026-09-17T12:22:00Z'),
      dep('b', 'douglas', 1000, 'paid', '2026-09-19T17:11:00Z'),
    ];
    const r = relatorioDoLeilao({ leilao: LEILAO, lances: LANCES, depositos, nomes: NOMES });
    assert.deepEqual(r.extrato.map((e) => e.id), ['a', 'b', 'c']);
  });

  test('a forma de pagamento sai em português', () => {
    assert.equal(formaEmPalavras('pix_mp'), 'PIX');
    assert.equal(formaEmPalavras('credit_card_mp'), 'Cartão');
    assert.equal(formaEmPalavras('saldo'), 'Saldo');
    assert.equal(formaEmPalavras(''), '—');
    assert.equal(formaEmPalavras(null), '—');
  });

  test('🔴 O CASO REAL DO PS5 — os números do PDF entregue', () => {
    // 6 pessoas, 23 pagos somando 10.400, 2 não pagos somando 1.200
    const pessoas = ['hercules', 'douglas', 'angela', 'henrique', 'virgilio', 'alberto'];
    const lances = pessoas.map((id) => ({ sender_id: id }));
    const valores = [2000, 3247, 2100, 1553, 1200, 300]; // pago por pessoa
    const contagens = [7, 2, 2, 3, 7, 2];                // depósitos por pessoa
    const depositos = [];
    pessoas.forEach((id, i) => {
      const resto = valores[i] - (contagens[i] - 1);
      for (let k = 0; k < contagens[i]; k += 1) {
        depositos.push(dep(`${id}-${k}`, id, k === 0 ? resto : 1, 'paid', '2026-09-17T15:00:00Z'));
      }
    });
    depositos.push(dep('n1', 'hercules', 600, 'canceled', '2026-09-17T12:22:00Z'));
    depositos.push(dep('n2', 'angela', 600, 'canceled', '2026-09-20T20:58:00Z'));

    const r = relatorioDoLeilao({ leilao: LEILAO, lances, depositos, nomes: NOMES });
    assert.equal(r.entrou.depositosPagos, 23, 'o PDF entregue diz 23');
    assert.equal(r.entrou.valorPago, 10400, 'o PDF entregue diz R$ 10.400,00');
    assert.equal(r.entrou.tentativasNaoPagas, 2);
    assert.equal(r.entrou.valorNaoPago, 1200);
    assert.equal(r.entrou.quemDepositou, 6);
    assert.equal(r.leilao.participantes, 6);
  });

  describe('bordas', () => {
    test('sem leilão não há relatório', () => {
      assert.equal(relatorioDoLeilao({}), null);
      assert.equal(relatorioDoLeilao({ leilao: {} }), null);
      assert.equal(relatorioDoLeilao(), null);
    });

    test('🔴 leilão AINDA ABERTO usa agora como fim — não 1970', () => {
      const vivo = { ...LEILAO, end_time: null, status: 'active' };
      const agora = new Date('2026-09-23T12:00:00Z');
      const j = janelaDoLeilao(vivo, agora);
      assert.equal(j.fechou, agora.getTime());
      assert.equal(j.aberto, true);
      const depositos = [dep('a', 'hercules', 100, 'paid', '2026-09-22T10:00:00Z')];
      const r = relatorioDoLeilao({ leilao: vivo, lances: LANCES, depositos, nomes: NOMES, agora });
      assert.equal(r.entrou.depositosPagos, 1,
        'sem isto o leilão de HOJE — o mais interessante — sairia sempre vazio');
    });

    test('data podre não derruba o relatório', () => {
      assert.equal(quando({ created_date: 'lixo' }, 'created_date'), 0);
      assert.equal(quando({}, 'created_date'), 0);
      assert.equal(quando(null, 'created_date'), 0);
    });

    test('listas vazias e nulas', () => {
      assert.deepEqual(depositosDoLeilao(null, { lances: [], leilao: LEILAO }), []);
      assert.equal(quemDeuLance(null).size, 0);
      assert.equal(reservadoPorPessoa(null).size, 0);
      assert.equal(lancesPorPessoa(null).size, 0);
      const r = relatorioDoLeilao({ leilao: LEILAO });
      assert.equal(r.entrou.depositosPagos, 0);
      assert.deepEqual(r.pessoas, []);
    });

    test('estaPago só aceita "paid" — nada de quase', () => {
      assert.equal(estaPago({ status: 'paid' }), true);
      assert.equal(estaPago({ status: 'PAID' }), true);
      assert.equal(estaPago({ status: 'pending' }), false);
      assert.equal(estaPago({ status: 'paid_later' }), false);
      assert.equal(estaPago({}), false);
      assert.equal(estaPago(null), false);
    });

    test('lance sem dono não vira participante fantasma', () => {
      const r = relatorioDoLeilao({ leilao: LEILAO, lances: [{ sender_id: null }, {}], depositos: [], nomes: {} });
      assert.equal(r.leilao.participantes, 0);
      assert.deepEqual(r.pessoas, []);
    });

    test('pessoa sem nome no cadastro usa o nome do depósito', () => {
      const depositos = [{ ...dep('a', 'hercules', 100, 'paid', '2026-09-17T12:00:00Z'), buyer_name: 'Do Depósito' }];
      const r = relatorioDoLeilao({ leilao: LEILAO, lances: [{ sender_id: 'hercules' }], depositos, nomes: {} });
      assert.equal(r.pessoas[0].nome, 'Do Depósito');
    });

    test('centavos não acumulam erro de float', () => {
      const depositos = [0.1, 0.2, 0.3].map((v, i) => dep(`c${i}`, 'hercules', v, 'paid', '2026-09-17T12:00:00Z'));
      const r = relatorioDoLeilao({ leilao: LEILAO, lances: [{ sender_id: 'hercules' }], depositos, nomes: NOMES });
      assert.equal(r.entrou.valorPago, 0.6, '0.1+0.2+0.3 em float vira 0.6000000000000001 e aparece no total');
    });
  });
});
