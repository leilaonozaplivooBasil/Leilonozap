// 📦 30/09/2026 — a rota da retirada: crachá, permissão, código e gravação
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://banco.teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sr-teste';
process.env.SESSAO_SECRET = 'segredo-retirada';
const { emitirSessao } = await import('../api/_lib/sessao.js');
const { codigoDeRetirada } = await import('../api/_lib/codigoDeRetirada.js');
const { default: rota } = await import('../api/functions/retiradaNaLoja.js');

const VENDA = { id: '42c793470cd3ca348602b903', kind: 'loja', status: 'paid', buyer_id: 'cliente1', buyer_name: 'Ana Souza', product_title: 'Relógio', tracking_code: 'LZ42C79347', raw_base44: { delivery_type: 'pickup' }, created_date: '2026-09-28T12:00:00Z' };
const PESSOAS = { balcao: { id: 'balcao', full_name: 'Ponto Bangu', role: 'licensee', primary_career_level: 'ponto_retirada', active: true }, cliente1: { id: 'cliente1', full_name: 'Ana Souza', role: 'user', primary_career_level: 'usuario', active: true, email: 'ana@x.com' }, vendedor: { id: 'vendedor', role: 'user', primary_career_level: 'vendedor', active: true } };
let estado;
function banco({ venda = VENDA, jaRetirada = null } = {}) {
  estado = { chamadas: [], retirada: jaRetirada };
  globalThis.fetch = async (url, opts = {}) => {
    const u = decodeURIComponent(String(url)); const corpo = opts.body ? JSON.parse(opts.body) : null;
    estado.chamadas.push({ u, metodo: opts.method || 'GET', corpo });
    if (u.includes('/app_users?')) { const id = u.match(/id=eq\.([^&]+)/)?.[1]; return new Response(JSON.stringify(PESSOAS[id] ? [PESSOAS[id]] : [])); }
    if (u.includes('/catalog_sales?select=')) return new Response(JSON.stringify(venda ? [venda] : []));
    if (u.includes('/retiradas?select=')) return new Response(JSON.stringify(estado.retirada ? [estado.retirada] : []));
    if (u.endsWith('/retiradas') && opts.method === 'POST') { estado.retirada = { ...corpo, retirado_em: '2026-09-30T18:42:00Z' }; return new Response(JSON.stringify([estado.retirada]), { status: 201 }); }
    return new Response('[]', { status: 200 });
  };
}
const chamar = async (corpo, quem) => {
  let status = 0; let json = null;
  const res = { setHeader() {}, status(s) { status = s; return this; }, json(j) { json = j; return this; } };
  await rota({ method: 'POST', headers: quem ? { 'x-sessao': emitirSessao(quem) } : {}, body: corpo }, res);
  return { status, json };
};
const ASS = 'data:image/png;base64,' + 'A'.repeat(400);
const FORM = { acao: 'registrar', saleId: VENDA.id, local: 'ponto_bangu', quem: 'comprador', assinatura: ASS, aceite: true };

test('sem crachá: 401; cliente e vendedor não registram', async () => {
  banco();
  assert.equal((await chamar(FORM)).status, 401);
  assert.equal((await chamar({ ...FORM, codigo: codigoDeRetirada(VENDA.id) }, 'cliente1')).status, 403);
  assert.equal((await chamar({ ...FORM, codigo: codigoDeRetirada(VENDA.id) }, 'vendedor')).status, 403);
  assert.ok(!estado.chamadas.some((c) => c.u.endsWith('/retiradas') && c.metodo === 'POST'));
});

test('código errado não grava nada', async () => {
  banco();
  const errado = codigoDeRetirada(VENDA.id) === '000000' ? '111111' : '000000';
  const r = await chamar({ ...FORM, codigo: errado }, 'balcao');
  assert.match(r.json.error, /Código não confere/);
  assert.ok(!estado.chamadas.some((c) => c.metodo !== 'GET'));
});

test('registrar: grava o comprovante, marca entregue, libera o vendedor e avisa o cliente', async () => {
  banco();
  const r = await chamar({ ...FORM, codigo: codigoDeRetirada(VENDA.id) }, 'balcao');
  assert.equal(r.json.success, true);
  const ins = estado.chamadas.find((c) => c.u.endsWith('/retiradas') && c.metodo === 'POST').corpo;
  assert.equal(ins.sale_id, VENDA.id);
  assert.equal(ins.local, 'ponto_bangu');
  assert.equal(ins.com_codigo, true);
  assert.equal(ins.atendente_id, 'balcao');
  assert.match(ins.termo_texto, /pedido #LZ42C79347/);
  assert.ok(estado.chamadas.some((c) => c.u.includes('/catalog_sales?id=eq.') && c.metodo === 'PATCH' && c.corpo.status === 'entregue'));
  assert.ok(estado.chamadas.some((c) => c.u.endsWith('/rpc/confirmar_recebimento') && c.corpo._sale_id === VENDA.id));
  assert.ok(estado.chamadas.some((c) => c.u.includes('/notificacoes') && c.corpo?.tipo === 'retirada_confirmada'), 'o sino do cliente');
});

test('segunda vez no mesmo pedido: recusa e diz quando/onde já foi', async () => {
  banco({ jaRetirada: { local: 'escritorio', atendente_nome: 'Beatriz', retirado_em: '2026-09-30T18:00:00Z' } });
  const r = await chamar({ ...FORM, codigo: codigoDeRetirada(VENDA.id) }, 'balcao');
  assert.equal(r.json.error, 'ja_retirado');
  assert.equal(r.json.retirada.local, 'Escritório');
});

test('pedido de entrega, ou sem pagamento, não é retirado', async () => {
  banco({ venda: { ...VENDA, raw_base44: { delivery_type: 'delivery' } } });
  assert.match((await chamar({ ...FORM, codigo: codigoDeRetirada(VENDA.id) }, 'balcao')).json.error, /entrega/);
  banco({ venda: { ...VENDA, status: 'pending_payment' } });
  assert.match((await chamar({ ...FORM, codigo: codigoDeRetirada(VENDA.id) }, 'balcao')).json.error, /pagamento/);
});

test('cliente vê o PRÓPRIO código; balcão acha o pedido pelo código', async () => {
  banco();
  const meus = await chamar({ acao: 'meus' }, 'cliente1');
  assert.deepEqual(meus.json.pedidos, [{ saleId: VENDA.id, retirado: false, codigo: codigoDeRetirada(VENDA.id) }]);
  assert.ok(estado.chamadas.some((c) => c.u.includes('buyer_id=eq.cliente1')), 'só os pedidos dele');
  const achou = await chamar({ acao: 'porCodigo', codigo: codigoDeRetirada(VENDA.id) }, 'balcao');
  assert.equal(achou.json.pedido.numero, 'LZ42C79347');
  assert.equal((await chamar({ acao: 'porCodigo', codigo: codigoDeRetirada(VENDA.id) }, 'cliente1')).status, 403);
});
