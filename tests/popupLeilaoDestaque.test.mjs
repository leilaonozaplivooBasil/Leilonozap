// Pop-up do leilão em destaque — a REGRA de quando aparece.
//
// Pedido do dono (02/09/2026): "ao abrir o site deve conter um popup de um
// leilão em destaque que escolhermos. Esse popup deve ser extremamente
// funcional para evitar bugs/quebras/colisões no código."
//
// O risco desse tipo de peça não é o desenho, é a HORA. Aparecer por cima de
// quem está dando lance, por cima de quem está pagando, ou apontando para um
// leilão que já acabou. Por isso a regra inteira vive num .js puro, testada
// aqui sem navegador, e o componente só desenha o que ela decidir.
//
// O princípio: O PADRÃO É NÃO APARECER. Toda dúvida resolve em false.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  podeMostrar, configValida, leilaoAindaAberto, idDoLeilao, dadosDoPopup,
  jaViuNestaSessao, marcarVisto, fotoDoLeilao, PAGINAS_PROIBIDAS, Z_INDEX, CHAVE_SESSAO,
} from '../src/lib/popupLeilaoDestaque.js';

const AGORA = new Date('2026-09-02T18:00:00Z').getTime();
const CONFIG = { is_active: true, title: 'Air Fryer 5L', image_url: 'https://x/y.jpg', link_url: '/AuctionRoom?id=leilao-1' };
const ABERTO = { id: 'leilao-1', status: 'active', end_time: '2026-09-02T20:00:00Z', title: 'Air Fryer' };

// storage de mentira, porque o Node não tem sessionStorage
const criarStorage = (inicial = {}) => {
  const m = { ...inicial };
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _dados: m };
};
const base = (over = {}) => ({
  config: CONFIG, leilao: ABERTO, paginaAtual: 'Home',
  sessionStorage: criarStorage(), agora: AGORA, ...over,
});

// ───────────────────── o caminho feliz ─────────────────────

test('aparece na primeira página da sessão', () => {
  const r = podeMostrar(base());
  assert.equal(r.mostrar, true, `não apareceu: ${r.motivo}`);
});

// ───────────────────── onde NÃO pode aparecer ─────────────────────

test('NUNCA por cima de quem está dando lance', () => {
  // Cronômetro correndo e saldo reservado no lance. Cobrir isso com propaganda
  // de outro leilão custa o lance e irrita quem já está comprando.
  const r = podeMostrar(base({ paginaAtual: 'AuctionRoom' }));
  assert.equal(r.mostrar, false);
  assert.equal(r.motivo, 'pagina_proibida');
});

test('NUNCA por cima de quem está pagando', () => {
  for (const p of ['Cart', 'CatalogCheckout', 'Checkout', 'Payment', 'PagamentoPix']) {
    assert.equal(podeMostrar(base({ paginaAtual: p })).mostrar, false, `apareceu em ${p}`);
  }
});

test('a lista de páginas proibidas não perdeu a sala nem o checkout', () => {
  assert.ok(PAGINAS_PROIBIDAS.includes('AuctionRoom'));
  assert.ok(PAGINAS_PROIBIDAS.includes('CatalogCheckout'));
});

test('aparece nas páginas normais de cliente', () => {
  for (const p of ['Home', 'Catalog', 'Loja-Virtual', 'AuctionDetails', 'Profile', '']) {
    assert.equal(podeMostrar(base({ paginaAtual: p })).mostrar, true, `não apareceu em "${p}"`);
  }
});

// ───────────────────── leilão encerrado ─────────────────────

test('leilão que já acabou NÃO é anunciado', () => {
  // 🔴 Este erro já aconteceu neste site: em 31/08 um produto arrematado
  // continuou na página do leilão. O pop-up vence sozinho.
  const vencido = { ...ABERTO, end_time: '2026-09-02T17:59:00Z' };
  assert.equal(podeMostrar(base({ leilao: vencido })).motivo, 'leilao_encerrado');
});

test('leilão vendido ou cancelado NÃO é anunciado', () => {
  for (const s of ['sold', 'ended', 'canceled']) {
    assert.equal(leilaoAindaAberto({ ...ABERTO, status: s }, AGORA), false, `passou com status ${s}`);
  }
});

test('leilão de teste não vira propaganda', () => {
  assert.equal(leilaoAindaAberto({ ...ABERTO, is_test_auction: true }, AGORA), false);
});

test('prazo ilegível ou ausente = não aparece', () => {
  assert.equal(leilaoAindaAberto({ ...ABERTO, end_time: null }, AGORA), false);
  assert.equal(leilaoAindaAberto({ ...ABERTO, end_time: 'qualquer coisa' }, AGORA), false);
  assert.equal(leilaoAindaAberto(null, AGORA), false);
  assert.equal(leilaoAindaAberto(undefined, AGORA), false);
});

// ───────────────────── colisão com o banner de LGPD ─────────────────────

test('espera o banner de consentimento sair da tela', () => {
  // O banner de LGPD (z-3000) abre sozinho em TODA primeira visita — mesmo
  // público do pop-up. Os dois juntos é o único conflito real que existe aqui.
  const r = podeMostrar(base({ consentimentoPendente: true }));
  assert.equal(r.mostrar, false);
  assert.equal(r.motivo, 'consentimento_pendente');
});

test('a camada fica abaixo do consentimento e do pagamento', () => {
  assert.ok(Z_INDEX < 2990, 'subiu acima do véu do consentimento');
  assert.ok(Z_INDEX < 9999, 'subiu acima da confirmação de pagamento');
  assert.ok(Z_INDEX > 201, 'ficaria atrás do carrinho');
});

// ───────────────────── uma vez por sessão ─────────────────────

test('não repete na mesma sessão', () => {
  const ss = criarStorage();
  assert.equal(podeMostrar(base({ sessionStorage: ss })).mostrar, true);
  marcarVisto(ss);
  assert.equal(podeMostrar(base({ sessionStorage: ss })).motivo, 'ja_viu');
});

test('storage bloqueado (aba anônima) não vira pop-up repetido', () => {
  const travado = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  assert.equal(jaViuNestaSessao(travado), true, 'sem storage, insistiria a cada página');
  assert.doesNotThrow(() => marcarVisto(travado));
  assert.doesNotThrow(() => marcarVisto(null));
});

// ───────────────────── configuração ─────────────────────

test('sem configuração, nada aparece', () => {
  for (const c of [null, undefined, {}, { is_active: true }, { link_url: '   ' }]) {
    assert.equal(podeMostrar(base({ config: c })).motivo, 'sem_config', `passou com ${JSON.stringify(c)}`);
  }
});

test('desligado no painel = desligado na tela', () => {
  assert.equal(configValida({ ...CONFIG, is_active: false }), false);
});

test('lê o id do leilão do link, e aguenta link torto', () => {
  assert.equal(idDoLeilao('/AuctionRoom?id=abc123'), 'abc123');
  assert.equal(idDoLeilao('/AuctionRoom?foo=1&id=abc&x=2'), 'abc');
  assert.equal(idDoLeilao('/AuctionRoom'), '');
  assert.equal(idDoLeilao(null), '');
  assert.equal(idDoLeilao(''), '');
});

test('o que a tela desenha nunca é inventado', () => {
  const d = dadosDoPopup(CONFIG, ABERTO);
  assert.equal(d.titulo, 'Air Fryer 5L');
  assert.equal(d.destino, '/AuctionRoom?id=leilao-1');
  // sem título no banner, cai no título do leilão; sem imagem, null (não string vazia)
  const semTitulo = dadosDoPopup({ ...CONFIG, title: '', image_url: '' }, ABERTO);
  assert.equal(semTitulo.titulo, 'Air Fryer');
  assert.equal(semTitulo.imagem, null);
  // sem nada: um rótulo neutro, nunca "undefined" na tela
  assert.equal(dadosDoPopup(null, null).titulo, 'Leilão em destaque');
});

test('a chave da sessão é de sessão, não permanente', () => {
  // sessionStorage some ao fechar o navegador — a pessoa vê de novo outro dia.
  assert.equal(CHAVE_SESSAO, 'popupLeilaoVisto');
});

// ───────────────────── nada disso pode explodir ─────────────────────

test('entrada vazia ou lixo não derruba a decisão', () => {
  assert.doesNotThrow(() => podeMostrar());
  assert.doesNotThrow(() => podeMostrar({}));
  assert.equal(podeMostrar().mostrar, false);
  assert.equal(podeMostrar({ config: 'texto', leilao: 42 }).mostrar, false);
});

test('a foto vem da LISTA image_urls do leilão, não de um campo único', () => {
  // `auctions` guarda image_urls (array). Ler `image_url` (singular) deixaria
  // todo pop-up sem imagem sempre que o banner não tivesse arte própria.
  assert.equal(fotoDoLeilao({ image_urls: ['https://a/1.jpg', 'https://a/2.jpg'] }), 'https://a/1.jpg');
  assert.equal(fotoDoLeilao({ image_urls: ['', '  ', 'https://a/3.jpg'] }), 'https://a/3.jpg');
  assert.equal(fotoDoLeilao({ image_urls: [] }), null);
  assert.equal(fotoDoLeilao({}), null);
  assert.equal(fotoDoLeilao(null), null);
  // arte própria do banner tem prioridade sobre a foto do leilão
  assert.equal(dadosDoPopup({ image_url: 'https://banner.jpg', link_url: '/x' }, { image_urls: ['https://leilao.jpg'] }).imagem, 'https://banner.jpg');
  // sem arte própria, cai na foto do leilão
  assert.equal(dadosDoPopup({ image_url: '', link_url: '/x' }, { image_urls: ['https://leilao.jpg'] }).imagem, 'https://leilao.jpg');
});

test('o preço aparece, e zero não vira "R$ 0,00"', () => {
  // O pedido era "conduzir o cliente direto ao lance". Card só com título não
  // convence; o valor sim. Mas leilão sem lance ainda tem que dizer algo útil.
  assert.equal(dadosDoPopup(CONFIG, { ...ABERTO, current_price: 78 }).preco, 78);
  assert.equal(dadosDoPopup(CONFIG, { ...ABERTO, current_price: 0 }).preco, null);
  assert.equal(dadosDoPopup(CONFIG, { ...ABERTO, current_price: null }).preco, null);
  assert.equal(dadosDoPopup(CONFIG, ABERTO).preco, null);
});
