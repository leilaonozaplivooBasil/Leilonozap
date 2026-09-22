/**
 * 📦 O PEDIDO PRECISA DIZER O QUE TEM DENTRO.
 *
 * Caso Virgílio (21/09/2026): quatro produtos num pedido, e a tela do cliente
 * mostrava só o primeiro com "Total: R$ 1,00". Ele entendeu que tinha comprado
 * uma lâmpada e perdido o crédito. O dado estava no banco e no painel do
 * operador — só não chegava a quem pagou.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { itensDoPedido, quantosItens, dinheiroDoPedido, itensSemNome } from '../src/lib/itensDoPedido.js';

const CASO_REAL = {
  product_title: 'Kit 10 Lâmpada Led Dicróica Mr16',
  raw_base44: {
    items: [
      { id: '1', qty: 1, price: 16.16, title: 'Kit 10 Lâmpada Led Dicróica Mr16' },
      { id: '2', qty: 1, price: 67, title: 'Relógios Masculinos De Quartzo ZXL' },
      { id: '3', qty: 1, price: 37.97, title: 'Maquina Acabamento Kemei Km-032' },
      { id: '4', qty: 1, price: 90, title: 'Batedeira Prática Mondial B-44-B' },
    ],
  },
};

describe('itensDoPedido', () => {
  test('o caso real devolve os quatro produtos', () => {
    const itens = itensDoPedido(CASO_REAL);
    assert.equal(itens.length, 4);
    assert.deepEqual(itens.map((i) => i.title), [
      'Kit 10 Lâmpada Led Dicróica Mr16',
      'Relógios Masculinos De Quartzo ZXL',
      'Maquina Acabamento Kemei Km-032',
      'Batedeira Prática Mondial B-44-B',
    ]);
  });

  test('lê o formato da loja da rede (items_json)', () => {
    const p = { items_json: [{ title: 'A', qty: 1 }, { product_name: 'B', quantity: 3 }] };
    assert.deepEqual(itensDoPedido(p), [
      { id: null, title: 'A', qty: 1 },
      { id: null, title: 'B', qty: 3 },
    ]);
  });

  test('aguenta raw_base44 vindo como texto', () => {
    // o banco devolve jsonb, mas alguns caminhos guardam string
    const p = { raw_base44: JSON.stringify({ items: [{ title: 'A' }, { title: 'B' }] }) };
    assert.equal(itensDoPedido(p).length, 2);
  });

  test('pedido de UM item devolve null — o título já conta tudo', () => {
    // lista de um item na tela é ruído; quem chama decide não mostrar nada
    assert.equal(itensDoPedido({ raw_base44: { items: [{ title: 'só um' }] } }), null);
    assert.equal(itensDoPedido({ items_json: [{ title: 'só um' }] }), null);
  });

  test('pedido sem item nenhum não quebra', () => {
    for (const vazio of [null, undefined, {}, { raw_base44: 'lixo{' }, { items_json: [] }]) {
      assert.equal(itensDoPedido(vazio), null, `quebrou com ${JSON.stringify(vazio)}`);
    }
  });

  test('🔴 item sem nome vem com título VAZIO — não com "Item"', () => {
    // 🔴 22/09/2026 — esta prova exigia o contrário, e estava errada.
    //
    // Ela dizia: "linha em branco seria pior do que um rótulo genérico". Na
    // prática o rótulo genérico foi MUITO pior: a loja da rede guarda só
    // `{product_id, qty}`, e o operador abriu um pedido de cinco produtos
    // lendo "Item · Item · Item · Item · Item". Não dava pra separar nada, e
    // a tela não tinha como saber que aquilo não era nome — o `|| 'Item'`
    // fabricava um. Título vazio + id é honesto: quem desenha vai buscar o
    // nome, ou diz que não tem. "Item" não era nenhuma das duas coisas.
    const p = { raw_base44: { items: [{ title: 'A' }, { qty: 2, id: 'p2' }] } };
    assert.deepEqual(itensDoPedido(p)[1], { id: 'p2', title: '', qty: 2 });
  });

  test('🔴 o id do produto vem junto, pra tela poder buscar o nome', () => {
    const daRede = { items_json: [{ qty: 1, product_id: 'aaa' }, { qty: 1, product_id: 'bbb' }] };
    assert.deepEqual(itensDoPedido(daRede).map((i) => i.id), ['aaa', 'bbb']);
    assert.deepEqual(itensSemNome(daRede), ['aaa', 'bbb'], 'a tela não saberia quais nomes buscar');
  });

  test('item que JÁ tem nome não entra na lista de buscar', () => {
    const p = { raw_base44: { items: [{ title: 'A', id: 'a' }, { qty: 1, product_id: 'b' }] } };
    assert.deepEqual(itensSemNome(p), ['b']);
  });
});

describe('quantosItens', () => {
  test('conta UNIDADES, não linhas', () => {
    // dois do mesmo produto são dois itens pra quem abre a caixa
    const p = { raw_base44: { items: [{ title: 'A', qty: 2 }, { title: 'B', qty: 3 }] } };
    assert.equal(quantosItens(p), 5);
  });

  test('o caso real conta 4', () => {
    assert.equal(quantosItens(CASO_REAL), 4);
  });

  test('pedido de um produto usa a quantidade dele', () => {
    assert.equal(quantosItens({ quantity: 3 }), 3);
    assert.equal(quantosItens({ quantity: 1 }), 1);
  });

  test('sem quantidade nenhuma devolve 1, nunca 0', () => {
    // "0 itens neste pedido" seria mentira em qualquer pedido que existe
    for (const vazio of [null, undefined, {}, { quantity: 0 }, { quantity: -2 }]) {
      assert.equal(quantosItens(vazio), 1, `devolveu errado para ${JSON.stringify(vazio)}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 💰 O DINHEIRO DO PEDIDO — 22/09/2026
//
// O caso real: a operadora abriu o pedido de quatro produtos, leu na tela
// "Valor do produto: R$ 1,00", concluiu que só uma lâmpada tinha sido comprada,
// avisou que "a batedeira sumiu da loja" e TRAVOU O ENVIO.
//
// Estava tudo certo: R$ 211,13 em produtos, R$ 20,82 de frete, R$ 210,13 pagos
// com crédito Passaporte e R$ 1,00 no PIX — o mínimo que o Mercado Pago aceita
// cobrar. A tela mostrava `total_amount`, que guarda só a parte cobrada no meio
// de pagamento, e o crédito (99,5% da compra) não aparecia em canto nenhum.
//
// 🔴 Conferindo este caso eu mesmo quase concluí que a loja tinha dado R$ 210
// de mercadoria de graça: a carteira do cliente batia com o que ele depositou,
// porque o desconto não saiu dela — saiu dos cupons. Um número que engana quem
// está com o banco aberto na frente engana qualquer um.
// ═══════════════════════════════════════════════════════════════════════════

// os números EXATOS do pedido LZ26D693EC, como estão no banco
const PEDIDO_REAL = {
  total_amount: 1,
  sale_price: 1,
  discount_amount: 210.13,
  quantity: 4,
  payment_method: 'pix_mp',
  raw_base44: {
    frete: { valor: 20.82, empresa: 'Jadlog', servico: '.Package' },
    items: [
      { id: 'a', qty: 1, price: 16.16, title: 'Kit 10 Lâmpada Led Dicróica' },
      { id: 'b', qty: 1, price: 67, title: 'Relógios Masculinos ZXL' },
      { id: 'c', qty: 1, price: 37.97, title: 'Maquina Acabamento Kemei' },
      { id: 'd', qty: 1, price: 90, title: 'Batedeira Prática Mondial B-44-B' },
    ],
    amount_charged: 21.82,
    passaporte_desconto: 210.13,
  },
};

describe('💰 dinheiroDoPedido — o caso que travou o envio', () => {
  test('🔴 mostra os R$ 211,13 de produtos, não o R$ 1,00 do PIX', () => {
    // era o número que fazia a operadora ler "só uma lâmpada".
    assert.equal(dinheiroDoPedido(PEDIDO_REAL).produtos, 211.13);
  });

  test('🔴 o crédito Passaporte aparece, com o valor certo', () => {
    // 99,5% da compra. Sem isto, o pedido parece não ter sido pago.
    assert.equal(dinheiroDoPedido(PEDIDO_REAL).credito, 210.13);
    assert.equal(dinheiroDoPedido(PEDIDO_REAL).temCredito, true);
  });

  test('🔴 a conta fecha: produtos + frete = total, e crédito + cobrado = total', () => {
    const d = dinheiroDoPedido(PEDIDO_REAL);
    assert.equal(d.frete, 20.82);
    assert.equal(d.total, 231.95, 'o total do pedido não fecha');
    assert.equal(d.cobrado, 21.82, 'o que a maquininha viu');
    // crédito + o que foi cobrado tem que dar o pedido inteiro
    assert.equal(Math.round((d.credito + d.cobrado) * 100) / 100, d.total,
      'sobrou ou faltou dinheiro na explicação — é isso que faz alguém achar que a loja deu de graça');
  });

  test('🔴 o valor dos produtos vem da SOMA DOS ITENS, não de coluna nenhuma', () => {
    // se uma coluna for gravada errada (já aconteceu com o delivery_type), a
    // soma dos itens continua certa. É o único número que não depende de ninguém.
    const comColunaPodre = { ...PEDIDO_REAL, total_amount: 999, discount_amount: 999 };
    assert.equal(dinheiroDoPedido(comColunaPodre).produtos, 211.13);
  });

  test('sem itens, cai na conta que sempre vale: cobrado + descontado', () => {
    const semItens = { total_amount: 50, discount_amount: 30, raw_base44: { passaporte_desconto: 30 } };
    assert.equal(dinheiroDoPedido(semItens).produtos, 80);
  });

  test('🔴 separa cupom de crédito — são coisas diferentes no extrato', () => {
    // `discount_amount` guarda os dois somados; só o crédito vem separado.
    const comCupom = { total_amount: 10, discount_amount: 50,
      raw_base44: { passaporte_desconto: 30, items: [{ qty: 1, price: 60 }] } };
    const d = dinheiroDoPedido(comCupom);
    assert.equal(d.credito, 30);
    assert.equal(d.cupom, 20);
  });

  test('pedido normal, sem crédito nenhum, não inventa explicação', () => {
    const simples = { total_amount: 74.97, raw_base44: { frete: { valor: 15 }, amount_charged: 89.97 } };
    const d = dinheiroDoPedido(simples);
    assert.equal(d.temCredito, false, 'ia mostrar o quadro de crédito num pedido que não tem');
    assert.equal(d.produtos, 74.97);
    assert.equal(d.total, 89.97);
  });

  test('raw como TEXTO também é lido', () => {
    const comTexto = { ...PEDIDO_REAL, raw_base44: JSON.stringify(PEDIDO_REAL.raw_base44) };
    assert.equal(dinheiroDoPedido(comTexto).produtos, 211.13);
    assert.equal(dinheiroDoPedido(comTexto).credito, 210.13);
  });

  test('pedido torto não derruba a tela', () => {
    for (const ruim of [null, undefined, {}, { raw_base44: 'nao é json' }, { total_amount: 'abc' }]) {
      const d = dinheiroDoPedido(ruim);
      assert.ok(Number.isFinite(d.produtos) && Number.isFinite(d.total));
    }
  });

  test('quantidade maior que 1 multiplica', () => {
    const doisIguais = { total_amount: 0, raw_base44: { items: [{ qty: 3, price: 10 }] } };
    assert.equal(dinheiroDoPedido(doisIguais).produtos, 30);
  });
});

// 🔴 A REGRESSÃO QUE EU QUASE MANDEI PRA PRODUÇÃO (22/09/2026, mesmo dia)
//
// `dinheiroDoPedido` somava os itens sempre que eles existissem. Os pedidos da
// loja da rede guardam em `items_json` SÓ `product_id` e `qty` — sem preço
// nenhum. A soma dava ZERO e a tela mostraria "Valor dos produtos: R$ 0,00"
// num pedido de R$ 357,04, que é pior que o "R$ 1,00" que eu estava
// consertando. Apareceu porque o dono mandou o print de um pedido desses.
describe('💰 pedido da loja da rede — itens sem preço', () => {
  // o pedido LZ2204A2FC, como está no banco
  const DA_REDE = {
    total_amount: 357.04, quantity: 5, store_slug: 'bangu',
    items_json: [
      { qty: 1, product_id: '69f011a6f23a8a14fe1b6980' },
      { qty: 1, product_id: '69e3a5971b89d2825881c1d8' },
      { qty: 1, product_id: '1038d119e04705765a5bcfa8' },
      { qty: 1, product_id: '69f4d0f13f0158d362885cc2' },
      { qty: 1, product_id: 'a790dfbbf8a8c273f23b48ed' },
    ],
    raw_base44: { frete: { valor: 21.69 }, amount_charged: 378.73 },
  };

  test('🔴 NÃO mostra R$ 0,00 — cai no valor cobrado', () => {
    const d = dinheiroDoPedido(DA_REDE);
    assert.equal(d.produtos, 357.04, 'voltou a somar item sem preço e zerou o pedido');
    assert.equal(d.total, 378.73, 'o total do pedido ficou errado');
  });

  test('item com preço continua mandando na conta', () => {
    // a soma dos itens é melhor QUANDO existe; o que não vale é somar zero.
    const misto = { total_amount: 999, items_json: [{ qty: 2, price: 10 }, { qty: 1, price: 5 }] };
    assert.equal(dinheiroDoPedido(misto).produtos, 25);
  });

  test('🔴 os 5 itens são contados, mesmo sem nome nem preço', () => {
    assert.equal(quantosItens(DA_REDE), 5, 'o operador precisa saber quantas caixas conferir');
  });
});
