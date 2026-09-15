// 🎓 DIR — "Escolhe os produtos primeiro, paga depois" (15/09/2026).
//
// O RELATO (dono, sobre a compra real do Luiz Henrique, indicado pelo Ribeiro):
// "a gente tinha uma organização de que ele comprava, escolhia os produtos e
// pagava a primeira compra... Não foi distribuído comissão... eu quero que o
// cliente vá lá, escolha os produtos e pague."
//
// A CAUSA REAL (achada na auditoria, confirmada com dados de produção via SQL):
//   1. A Adesão de Vendedor pagava PRIMEIRO (createSellerAdhesionPayment.js,
//      kind='seller_adhesion') e só DEPOIS liberava saldo pra escolher produtos
//      — na ordem contrária à que o dono queria.
//   2. A comissão dessa adesão saía por um motor ANTIGO (payDirectCommissions,
//      api/_lib/commissions.js) que só paga os 20% da cadeia telescópica — nunca
//      os 10% do "topo institucional" (CEO/Livoo Live/Embaixador/Conselheiros/
//      Fundadores/Diretoria Executiva/Diretoria de Operação/Executivo de Conta)
//      que TODA venda de loja paga pelo motor oficial (api/_lib/arvoreOficial.js).
//      O referrer da venda real (Ribeiro, "diretoria_operacao") tem 0% de venda
//      direta — corretíssimo, ele ganha pelo topo institucional — só que esse
//      motor nunca era chamado no caminho da adesão. Resultado: comissão zerada,
//      não por erro de conta, mas por a venda nunca ter passado pelo motor certo.
//
// A CORREÇÃO: a "primeira compra" de Vendedor/Licenciado agora É uma venda de
// loja normal (kind='loja', criada por createMPPix.js/createMPCatalogCardCheckout.js
// com `role_grant` marcado) — escolhe produtos, calcula frete, paga tudo junto — e
// ao confirmar o pagamento, o cargo é concedido DEPOIS que o motor oficial de 30%
// já rodou (mpWebhook.js). Nenhum motor de comissão novo foi criado: a "primeira
// compra" simplesmente passou a usar o mesmo motor que qualquer venda da loja já usa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const mpPix = ler('../api/functions/createMPPix.js');
const mpCartao = ler('../api/functions/createMPCatalogCardCheckout.js');
const webhook = ler('../api/functions/mpWebhook.js');
const adesaoAntiga = ler('../api/functions/createSellerAdhesionPayment.js');
const escolher = ler('../src/pages/VendedorEscolherProdutos.jsx');
const carrinho = ler('../src/pages/Cart.jsx');
const checkout = ler('../src/pages/VendedorCheckout.jsx');

// ─── o valor mínimo é conferido no SERVIDOR, nos dois meios de pagamento ───────

test('createMPPix.js: recusa role_grant abaixo do mínimo do cargo', () => {
  assert.match(mpPix, /const VALOR_MINIMO_CARGO = \{ vendedor: 1497, licenciado: 5000 \}/);
  assert.match(mpPix, /if \(roleGrant && total < VALOR_MINIMO_CARGO\[roleGrant\]\)/);
});

test('createMPCatalogCardCheckout.js: a mesma régua de valor mínimo, no cartão', () => {
  assert.match(mpCartao, /const VALOR_MINIMO_CARGO = \{ vendedor: 1497, licenciado: 5000 \}/);
  assert.match(mpCartao, /if \(roleGrant && total < VALOR_MINIMO_CARGO\[roleGrant\]\)/);
});

test('createMPPix.js: a venda nasce kind=loja com role_grant marcado em raw_base44', () => {
  assert.match(mpPix, /kind: 'loja',/);
  assert.match(mpPix, /\.\.\.\(roleGrant \? \{ role_grant: roleGrant \} : \{\}\)/);
});

test('createMPCatalogCardCheckout.js: idem, role_grant vai em raw_base44', () => {
  assert.match(mpCartao, /kind: 'loja',/);
  assert.match(mpCartao, /\.\.\.\(roleGrant \? \{ role_grant: roleGrant \} : \{\}\)/);
});

// ─── mpWebhook.js: o cargo só é concedido DEPOIS que a comissão oficial rodou ──

test('mpWebhook.js: concederCargoDaPrimeiraCompra lê raw_base44.role_grant, não inventa cargo', () => {
  assert.match(webhook, /async function concederCargoDaPrimeiraCompra\(sale\)/);
  assert.match(webhook, /const cargo = sale\?\.raw_base44\?\.role_grant/);
  assert.match(webhook, /if \(!cargo \|\| !sale\.buyer_id\) return null/);
});

test('mpWebhook.js: concede o cargo só uma vez (idempotente) e ativa is_seller pro vendedor', () => {
  assert.match(webhook, /if \(levels\.includes\(cargo\)\) return \{ cargo, ja_tinha: true \}/);
  assert.match(webhook, /\.\.\.\(cargo === 'vendedor' \? \{ is_seller: true \} : \{\}\)/);
});

test('mpWebhook.js: a concessão do cargo roda DEPOIS de fulfillStoreOrder (comissão já paga)', () => {
  const bloco = webhook.slice(webhook.indexOf("if (sale.kind === 'loja')"), webhook.indexOf("if (sale.kind === 'loja')") + 1100);
  const iFulfill = bloco.indexOf('fulfillStoreOrder(sale)');
  const iCargo = bloco.indexOf('concederCargoDaPrimeiraCompra(sale)');
  assert.ok(iFulfill >= 0 && iCargo >= 0 && iFulfill < iCargo, 'a comissão (fulfillStoreOrder) precisa rodar ANTES da concessão do cargo');
});

// ─── o caminho ANTIGO (pagar primeiro) some da navegação — mas o arquivo continua ──

test('VendedorCheckout.jsx: não paga mais nada — só redireciona pra escolher produtos primeiro', () => {
  assert.match(checkout, /navigate\(createPageUrl\("VendedorEscolherProdutos"\) \+ `\?tipo=\$\{tipo\}`, \{ replace: true \}\)/);
});

test('createSellerAdhesionPayment.js: não empilha mais pendência — cancela a anterior antes de criar outra', () => {
  assert.match(adesaoAntiga, /status=eq\.pending_payment`, \{\s*method: 'PATCH'.*status: 'cancelado'/s);
});

// ─── VendedorEscolherProdutos.jsx: escolher primeiro, virou o modo padrão ──────

test('VendedorEscolherProdutos.jsx: ninguém mais é mandado pagar antes de escolher', () => {
  assert.ok(!escolher.includes('navigate(createPageUrl("VendedorCheckout")'), 'não pode mais existir redirecionamento pra pagar antes de escolher');
});

test('VendedorEscolherProdutos.jsx: quem NÃO tem saldo (ninguém pagou ainda) vai pro carrinho normal da loja', () => {
  assert.match(escolher, /const temSaldo = \(user\?\.seller_credit_balance \|\| 0\) > 0/);
  assert.match(escolher, /const CARGO_MINIMO = \{ vendedor: 1497, licenciado: 5000 \}/);
  assert.match(escolher, /const irParaCarrinho = \(\) => \{/);
  assert.match(escolher, /sessionStorage\.setItem\("pendingRoleGrant", JSON\.stringify\(\{ role: tipo, minAmount: minimoDaCompra, label: cargoLabel \}\)\)/);
  assert.match(escolher, /navigate\(createPageUrl\("Cart"\)\)/);
});

test('VendedorEscolherProdutos.jsx: quem JÁ PAGOU pelo caminho antigo continua funcionando (não perde o que pagou)', () => {
  assert.match(escolher, /const handleFecharPedido = async \(\) => \{/);
  assert.match(escolher, /invoke\("finalizeSellerOrder"/);
  assert.match(escolher, /temSaldo \? \(/, 'a barra de baixo precisa continuar servindo os dois modos');
});

test('VendedorEscolherProdutos.jsx: erro ao carregar produtos avisa e oferece tentar de novo — não finge grade vazia', () => {
  assert.ok(!/console\.debug\("Erro ao carregar escolha de produtos/.test(escolher), 'o erro não pode mais ser engolido em silêncio');
  assert.match(escolher, /setLoadError\(true\)/);
  assert.match(escolher, /toast\.error\("Não foi possível carregar os produtos da loja agora\."\)/);
  assert.match(escolher, /Tentar de novo/);
});

// ─── Cart.jsx: recebe o carrinho da primeira compra e aplica a régua ──────────

test('Cart.jsx: lê o pendingRoleGrant gravado pela tela de escolher produtos', () => {
  assert.match(carrinho, /sessionStorage\.getItem\('pendingRoleGrant'\)/);
  assert.match(carrinho, /const \[roleGrant, setRoleGrant\] = useState\(null\)/);
});

test('Cart.jsx: barra o checkout abaixo do mínimo, e nunca deixa pagar a primeira compra com saldo', () => {
  assert.match(carrinho, /if \(roleGrant && calcularTotalProdutos\(\) < roleGrant\.minAmount\)/);
  assert.match(carrinho, /if \(roleGrant && paymentType === 'SALDO'\)/);
  assert.match(carrinho, /\{saldo > 0 && !roleGrant && \(/);
});

test('Cart.jsx: manda role_grant pro PIX e pro cartão quando é a primeira compra', () => {
  const trechoPix = carrinho.slice(carrinho.indexOf("invoke('createMPPix'"), carrinho.indexOf("invoke('createMPPix'") + 900);
  assert.match(trechoPix, /\.\.\.\(roleGrant \? \{ role_grant: roleGrant\.role \} : \{\}\)/);
  const trechoCartao = carrinho.slice(carrinho.indexOf("invoke('createMPCatalogCardCheckout'"), carrinho.indexOf("invoke('createMPCatalogCardCheckout'") + 1200);
  assert.match(trechoCartao, /\.\.\.\(roleGrant \? \{ role_grant: roleGrant\.role \} : \{\}\)/);
});
