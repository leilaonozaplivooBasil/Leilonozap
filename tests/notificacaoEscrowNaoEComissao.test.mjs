// "Está descendo notificação de COMISSÃO RECEBIDA na conta — é comissão real ou bug?"
//
// Era bug de rótulo. O `commission_ledger` em 02/09/2026 tem 480 linhas,
// R$ 68.929,74, e TODAS são `role_in_sale = 'venda'`: a linha de ESCROW que a
// trigger trg_sale_to_ledger grava com 100% do valor da venda no nome do próprio
// VENDEDOR. Zero comissão de verdade. A rota lia a tabela inteira e anunciava
// tudo como "Comissão recebida · 100% de comissão".
//
// E o aviso certo — "Venda realizada" — existia no mesmo arquivo e nunca
// disparou: filtrava `status = 'paid'`, mas venda de produto em catalog_sales
// mora em 'entregue'. Os únicos 'paid' são depósito de carteira, que o filtro de
// kind já descarta. Resultado: o filtro casava com ZERO venda real.
//
// Este teste RODA a rota com o fetch trocado, em vez de conferir texto do fonte.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
delete process.env.SESSAO_MODO; // etapa 1: o crachá só anota, não recusa

const { default: handler } = await import('../api/functions/getTransactionNotifications.js');

const VENDEDOR = '2415aadf81124bd80152fb3b';
const agora = () => new Date().toISOString();
const diasAtras = (n) => new Date(Date.now() - n * 864e5).toISOString();

// Retrato do banco de produção, reduzido: escrow com pct 100 (o "100% de
// comissão" do print) e vendas em 'entregue', que é onde elas realmente ficam.
const BANCO = {
  escrow: [
    { created_at: agora(), amount: 74.97, pct: 100, role_in_sale: 'venda' },
    { created_at: agora(), amount: 119.91, pct: 100, role_in_sale: 'venda' },
  ],
  comissaoDeVerdade: [
    { created_at: agora(), amount: 12.5, pct: 5, role_in_sale: 'venda_direta' },
    { created_at: agora(), amount: 3.0, pct: null, role_in_sale: null }, // papel em branco continua sendo comissão
  ],
  vendas: [
    { id: 's-hoje', kind: 'produto', status: 'entregue', product_title: 'Cafeteira',
      total_amount: 74.97, buyer_id: 'comprador-1', buyer_name: 'Ana', seller_id: VENDEDOR, created_date: agora() },
    { id: 's-antiga', kind: 'produto', status: 'entregue', product_title: 'Liquidificador',
      total_amount: 50, buyer_id: 'comprador-2', buyer_name: 'Bia', seller_id: VENDEDOR, created_date: diasAtras(30) },
    { id: 's-deposito', kind: 'wallet_deposit', status: 'paid', product_title: 'Depósito',
      total_amount: 200, buyer_id: VENDEDOR, buyer_name: 'Ela', seller_id: VENDEDOR, created_date: agora() },
    { id: 's-cancelada', kind: 'produto', status: 'canceled', product_title: 'Ferro',
      total_amount: 30, buyer_id: 'comprador-3', buyer_name: 'Cida', seller_id: VENDEDOR, created_date: agora() },
  ],
};

// `in.(a,b,c)` / `not.in.(a,b,c)` → ['a','b','c'] sem contar caracteres na mão:
// a primeira versão deste arquivo errou o índice do parêntese e deixou passar um
// depósito de R$ 200, dando um "ok" que a rota não tinha merecido.
const listaEntreParenteses = (v) => (v.match(/\(([^)]*)\)/)?.[1] || '').split(',').filter(Boolean);

// fetch de mentira que HONRA os filtros da URL — é isso que dá valor ao teste:
// se a rota parar de filtrar, os dados errados voltam a passar.
const urlsChamadas = [];
function instalarFetch({ escrowVazio = false } = {}) {
  globalThis.fetch = async (url) => {
    const u = new URL(String(url));
    urlsChamadas.push(u.pathname + u.search);
    const tabela = u.pathname.split('/').pop();
    const q = u.searchParams;
    let linhas;

    if (tabela === 'commission_ledger') {
      linhas = [...BANCO.escrow, ...(escrowVazio ? [] : BANCO.comissaoDeVerdade)];
      const ou = q.get('or');
      if (ou && ou.includes('role_in_sale.neq.venda')) {
        linhas = linhas.filter((l) => l.role_in_sale !== 'venda');
      }
    } else {
      const papel = q.has('seller_id') ? 'seller_id' : 'buyer_id';
      const quem = (q.get(papel) || '').replace('eq.', '');
      linhas = BANCO.vendas.filter((v) => v[papel] === quem);

      const st = q.get('status') || '';
      if (st.startsWith('in.')) {
        const aceitos = listaEntreParenteses(st);
        linhas = linhas.filter((v) => aceitos.includes(v.status));
      } else if (st.startsWith('eq.')) {
        linhas = linhas.filter((v) => v.status === st.slice(3));
      }
      const kind = q.get('kind') || '';
      if (kind.startsWith('not.in.')) {
        const fora = listaEntreParenteses(kind);
        linhas = linhas.filter((v) => !fora.includes(v.kind));
      }
      const desde = q.get('created_date');
      if (desde?.startsWith('gte.')) {
        linhas = linhas.filter((v) => v.created_date >= desde.slice(4));
      }
    }
    return { json: async () => linhas };
  };
}

async function chamar(opts) {
  urlsChamadas.length = 0;
  instalarFetch(opts);
  let corpo = null;
  const res = {
    setHeader() {}, status() { return this; },
    json(c) { corpo = c; return this; },
  };
  await handler({ method: 'POST', body: { user_id: VENDEDOR }, headers: {} }, res);
  return corpo;
}

test('escrow nunca mais é anunciado como comissão', async () => {
  const { events } = await chamar();
  const comissoes = events.filter((e) => e.type === 'commission');
  assert.ok(!comissoes.some((e) => e.product === '100% de comissão'),
    'voltou a anunciar a linha de escrow como "100% de comissão"');
  assert.ok(!comissoes.some((e) => e.amount === 74.97 || e.amount === 119.91),
    'os valores de escrow do print voltaram à tela');
});

test('comissão de verdade continua avisando — inclusive com papel em branco', async () => {
  const { events } = await chamar();
  const valores = events.filter((e) => e.type === 'commission').map((e) => e.amount).sort((a, b) => a - b);
  assert.deepEqual(valores, [3, 12.5],
    'o filtro de escrow levou junto comissão legítima (`neq` sozinho descarta NULO)');
});

test('a consulta descarta o escrow no banco, não só no laço', async () => {
  await chamar();
  const ledger = urlsChamadas.find((u) => u.includes('commission_ledger'));
  assert.match(decodeURIComponent(ledger), /role_in_sale\.neq\.venda/);
  // Importa que seja no banco: com `limit=10`, 10 linhas de escrow consumiriam a
  // consulta inteira e a comissão real do usuário nunca chegaria à tela.
  assert.match(decodeURIComponent(ledger), /or=\(role_in_sale\.is\.null,/);
});

test('"Venda realizada" finalmente dispara — o filtro antigo achava zero venda', async () => {
  const { events } = await chamar();
  const venda = events.find((e) => e.type === 'sale');
  assert.ok(venda, 'nenhuma venda notificada: o status voltou a ser filtrado por "paid"');
  assert.equal(venda.product, 'Cafeteira');
  assert.equal(venda.amount, 74.97); // o valor da venda, no lugar do falso "100% de comissão"
  assert.equal(venda.buyer, 'Ana');
});

test('o filtro de status aceita o vocabulário real do banco', async () => {
  await chamar();
  const vendas = urlsChamadas.find((u) => u.includes('seller_id'));
  assert.match(decodeURIComponent(vendas), /status=in\.\([^)]*entregue/);
  assert.ok(!/status=eq\.paid/.test(decodeURIComponent(vendas)),
    'voltou ao status=eq.paid, que em catalog_sales só marca depósito');
});

test('depósito de carteira não vira "compra confirmada"', async () => {
  const { events } = await chamar();
  assert.ok(!events.some((e) => e.amount === 200), 'o depósito de R$ 200 virou notificação');
});

test('venda cancelada não notifica', async () => {
  const { events } = await chamar();
  assert.ok(!events.some((e) => e.product === 'Ferro'), 'venda cancelada foi anunciada como realizada');
});

test('histórico antigo não é despejado na tela depois do deploy', async () => {
  // Quem já viu os avisos de escrow tem o localStorage cheio: o `firstRun` do
  // cliente não protege essa pessoa, e todo id `sell-` seria novo de uma vez.
  const { events } = await chamar();
  assert.ok(!events.some((e) => e.product === 'Liquidificador'),
    'venda de 30 dias atrás voltaria a tocar o sino como se fosse agora');
});

test('sem comissão real nenhuma, a tela fica limpa — que é o estado de hoje', async () => {
  // Retrato fiel de 02/09/2026: o ledger inteiro é escrow.
  const { events } = await chamar({ escrowVazio: true });
  assert.equal(events.filter((e) => e.type === 'commission').length, 0);
});
