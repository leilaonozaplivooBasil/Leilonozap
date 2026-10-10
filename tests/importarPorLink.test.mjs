// 🔗 DIR-212 — IMPORTAR PRODUTO POR LINK, DE QUALQUER MARKETPLACE (10/10/2026)
// Dono: "o leilão tem a parte de importar automático do Mercado Livre; quero essa opção
// também quando formos adicionar produtos na loja — e pode ser qualquer link de qualquer
// marketplace: Shopee, Magazine Luiza, Mercado Livre etc." E depois: "não quero que você
// mexa em nada além de adicionar essa opção na loja" — o leilão fica como está.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { MARKETPLACES, marketplaceDoHost, tituloDoEndereco, tituloEhGenerico, precoDaPagina, textoDaPagina, SCHEMA_DA_FICHA } from '../api/_lib/fichaDaPagina.js';
import { MARKETPLACES_CONHECIDOS, marketplaceDoLink, linkValido, importarProdutoPorLink, fotosPeloNome, resumoDaImportacao } from '../src/lib/importarPorLink.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('os marketplaces: a tela e o servidor conhecem a mesma lista; host desconhecido é "outro"', () => {
  assert.deepEqual(MARKETPLACES.map((m) => m.id), MARKETPLACES_CONHECIDOS.map((m) => m.id));
  assert.deepEqual(MARKETPLACES.map((m) => m.hosts), MARKETPLACES_CONHECIDOS.map((m) => m.hosts));
  assert.deepEqual(marketplaceDoHost('www.mercadolivre.com.br'), { id: 'mercado_livre', nome: 'Mercado Livre' });
  assert.deepEqual(marketplaceDoHost('produto.mercadolivre.com.br'), { id: 'mercado_livre', nome: 'Mercado Livre' });
  assert.deepEqual(marketplaceDoHost('shopee.com.br'), { id: 'shopee', nome: 'Shopee' });
  assert.deepEqual(marketplaceDoHost('www.magazineluiza.com.br'), { id: 'magazine_luiza', nome: 'Magazine Luiza' });
  assert.deepEqual(marketplaceDoHost('www.amazon.com.br'), { id: 'amazon', nome: 'Amazon' });
  assert.deepEqual(marketplaceDoHost('www.lojadobairro.com.br'), { id: 'outro', nome: 'lojadobairro.com.br' });
  assert.equal(marketplaceDoHost(''), null);
  assert.deepEqual(marketplaceDoLink('https://shopee.com.br/Fone-i.1.2'), { id: 'shopee', nome: 'Shopee' });
  assert.deepEqual(marketplaceDoLink('https://www.americanas.com.br/produto/1/x'), { id: 'americanas', nome: 'Americanas' });
  assert.equal(marketplaceDoLink('lixo'), null);
  assert.equal(linkValido('https://www.mercadolivre.com.br/x'), true);
  assert.equal(linkValido('http://shopee.com.br/x-i.1.2'), true);
  assert.equal(linkValido('www.mercadolivre.com.br/x'), false, 'sem https:// não vale');
  assert.equal(linkValido('https://'), false);
  assert.equal(linkValido(''), false);
});

test('o nome escondido no endereço: Mercado Livre (os dois formatos), Shopee, Magalu, Amazon, Americanas; sem nome vira vazio', () => {
  assert.equal(tituloDoEndereco('https://produto.mercadolivre.com.br/MLB-1234567890-notebook-lenovo-ideapad-3-15-_JM'), 'Notebook lenovo ideapad 3 15');
  assert.equal(tituloDoEndereco('https://www.mercadolivre.com.br/notebook-lenovo-ideapad-3/p/MLB12345678?pdp_filters=x'), 'Notebook lenovo ideapad 3');
  assert.equal(tituloDoEndereco('https://shopee.com.br/Fone-de-Ouvido-Bluetooth-TWS-i.123456.7890123'), 'Fone de Ouvido Bluetooth TWS');
  assert.equal(tituloDoEndereco('https://www.magazineluiza.com.br/smart-tv-50-samsung-crystal-uhd-4k/p/237150500/et/tv50/'), 'Smart tv 50 samsung crystal uhd 4k');
  assert.equal(tituloDoEndereco('https://www.amazon.com.br/Echo-Dot-5a-geracao-Alexa/dp/B09B8WX5JS/ref=sr_1_1'), 'Echo Dot 5a geracao Alexa');
  assert.equal(tituloDoEndereco('https://www.americanas.com.br/produto/123456/cafeteira-expresso-oster'), 'Cafeteira expresso oster');
  assert.equal(tituloDoEndereco('https://www.loja.com/p/1'), '', 'só código: não há nome');
  assert.equal(tituloDoEndereco('https://shopee.com.br/i.1.2'), '');
  assert.equal(tituloDoEndereco('lixo'), '');
  // o título da página é só o marketplace (tela de verificação) ou bloqueio
  assert.equal(tituloEhGenerico('Mercado Livre'), true);
  assert.equal(tituloEhGenerico('Mercado Livre Brasil - Frete Grátis'), true);
  assert.equal(tituloEhGenerico('Shopee Brasil | Ofertas'), true);
  assert.equal(tituloEhGenerico('Access Denied'), true);
  assert.equal(tituloEhGenerico('Just a moment...'), true);
  assert.equal(tituloEhGenerico(''), true);
  assert.equal(tituloEhGenerico('Notebook Lenovo IdeaPad 3 | Mercado Livre'), false, 'o nome do produto vem antes');
  assert.equal(tituloEhGenerico('Geladeira Brastemp 400L'), false);
});

test('o preço que a página DECLARA: JSON-LD (Offer, AggregateOffer, priceSpecification), meta product:price; nunca estimado; "1.299,90" vira 1299.9', () => {
  const ld = (obj) => `<html><head><script type="application/ld+json">${JSON.stringify(obj)}</script></head><body>x</body></html>`;
  assert.deepEqual(precoDaPagina(ld({ '@type': 'Product', name: 'TV', offers: { '@type': 'Offer', price: '2499.90', priceCurrency: 'BRL' } })), { preco: 2499.9, moeda: 'BRL', origem: 'json_ld' });
  assert.deepEqual(precoDaPagina(ld({ '@type': 'Product', offers: { '@type': 'AggregateOffer', lowPrice: 1899, highPrice: 2300, priceCurrency: 'BRL' } })), { preco: 1899, moeda: 'BRL', origem: 'json_ld' });
  assert.deepEqual(precoDaPagina(ld({ '@type': 'Product', offers: [{ '@type': 'Offer', priceSpecification: { price: '1.299,90', priceCurrency: 'BRL' } }] })), { preco: 1299.9, moeda: 'BRL', origem: 'json_ld' });
  assert.deepEqual(precoDaPagina(ld({ '@graph': [{ '@type': 'WebPage' }, { '@type': 'Product', offers: { price: 'R$ 59,90' } }] })), { preco: 59.9, moeda: 'BRL', origem: 'json_ld' });
  assert.deepEqual(precoDaPagina('<html><head><meta property="product:price:amount" content="349.00"><meta property="product:price:currency" content="BRL"></head></html>'), { preco: 349, moeda: 'BRL', origem: 'meta' });
  assert.deepEqual(precoDaPagina('<html><head><meta itemprop="price" content="1299,00"></head></html>'), { preco: 1299, moeda: 'BRL', origem: 'meta' });
  assert.deepEqual(precoDaPagina(ld({ '@type': 'Product', offers: { price: '0' } })), { preco: null, moeda: null, origem: null }, 'zero não é preço');
  assert.deepEqual(precoDaPagina('<html><body>R$ 99,90 à vista</body></html>'), { preco: null, moeda: null, origem: null }, 'texto solto não é declaração: a tela decide');
  assert.deepEqual(precoDaPagina(''), { preco: null, moeda: null, origem: null });
  // o leitor da página e o schema da IA continuam como estavam (a DIR-207 pina a forma)
  assert.deepEqual(textoDaPagina('<html><body>oi</body></html>'), { titulo: '', descricaoMeta: '', imagens: [], jsonLd: null, texto: 'oi' });
  assert.ok(!('preco' in SCHEMA_DA_FICHA.properties), 'a IA não estima preço: ele só entra quando a página declara');
});

test('o lado da tela: valida o link, normaliza a resposta, nunca lança; fotos pelo nome quando a página não entregou', async () => {
  const chamadas = [];
  const invoke = async (nome, corpo) => {
    chamadas.push([nome, corpo]);
    if (nome === 'importarProdutoPeloLink') return { ok: true, titulo: ' Notebook Lenovo ', descricao: 'Bom.', marca: 'Lenovo', modelo: null, medidas: { peso: 1.6, altura: null, largura: null, comprimento: null }, fotos: ['https://a/1.jpg', 'ftp://x', 42], preco: '2499.9', moeda: 'BRL', fonte: 'pagina', confianca: 'alta', avisos: [], marketplace: { id: 'mercado_livre', nome: 'Mercado Livre' }, pagina: { status: 200 }, titulo_de: 'pagina' };
    if (nome === 'extractGoogleShoppingImages') return { success: true, images: ['https://b/1.jpg', 'https://b/2.jpg', 'x'] };
    return null;
  };
  const d = await importarProdutoPorLink({ url: 'https://www.mercadolivre.com.br/notebook/p/MLB1', titulo: 'x', invoke });
  assert.equal(d.ok, true); assert.equal(d.titulo, 'Notebook Lenovo'); assert.equal(d.preco, 2499.9); assert.deepEqual(d.fotos, ['https://a/1.jpg']);
  assert.equal(d.fonte, 'pagina'); assert.deepEqual(d.marketplace, { id: 'mercado_livre', nome: 'Mercado Livre' });
  assert.deepEqual(chamadas[0], ['importarProdutoPeloLink', { actor_id: null, url: 'https://www.mercadolivre.com.br/notebook/p/MLB1', titulo: 'x' }]);
  assert.deepEqual(await importarProdutoPorLink({ url: 'mercadolivre.com.br/x', invoke }), { ok: false, erro: 'Cole o link completo do produto, começando com https://' });
  const falha = await importarProdutoPorLink({ url: 'https://x.com/a-b-c', invoke: async () => ({ ok: false, error: 'IA indisponível', fotos: ['https://a/2.jpg'] }) });
  assert.equal(falha.ok, false); assert.equal(falha.erro, 'IA indisponível'); assert.deepEqual(falha.fotos, ['https://a/2.jpg']); assert.deepEqual(falha.marketplace, { id: 'outro', nome: 'x.com' });
  const estourou = await importarProdutoPorLink({ url: 'https://x.com/a-b-c', invoke: async () => { throw new Error('rede'); } });
  assert.deepEqual(estourou, { ok: false, erro: 'rede', marketplace: { id: 'outro', nome: 'x.com' } });
  assert.deepEqual(await fotosPeloNome('Notebook Lenovo', { invoke }), ['https://b/1.jpg', 'https://b/2.jpg']);
  assert.deepEqual(await fotosPeloNome('ab', { invoke }), [], 'nome curto demais não busca');
  assert.deepEqual(await fotosPeloNome('Notebook', { invoke: async () => { throw new Error('x'); } }), []);
  assert.equal(resumoDaImportacao({ marketplace: { nome: 'Shopee' }, preencheu: ['nome', 'preço'], fotos: 3, falharam: 1, preco: 59.9 }), 'Importado de Shopee: preencheu nome, preço · 3 foto(s) no nosso servidor · 1 foto(s) não vieram · preço R$ 59,90.');
  assert.equal(resumoDaImportacao({}), 'Importado de a página: nada novo para preencher (os campos já estavam cheios) · nenhuma foto.');
  const L = ler('../src/lib/importarPorLink.js');
  assert.ok(!/^import .*plataformaClient/m.test(L) && L.includes("await import('@/api/plataformaClient')"), 'o cliente da plataforma só entra por import dinâmico: as funções puras rodam nos testes');
});

test('a rota: marketplace, título do endereço quando a página é tela de verificação, preço só declarado, e continua sem gravar nada', () => {
  const R = ler('../api/functions/importarProdutoPeloLink.js');
  assert.ok(R.includes("precoDaPagina, marketplaceDoHost, tituloDoEndereco, tituloEhGenerico } from '../_lib/fichaDaPagina.js';"));
  assert.ok(R.includes('const marketplace = marketplaceDoHost(host);'));
  assert.ok(R.includes('const tituloDaPagina = lida && !tituloEhGenerico(lida.titulo) ? lida.titulo : \'\';'));
  assert.ok(R.includes('const tituloDoLink = tituloDoEndereco(pag.finalUrl || url);'));
  assert.ok(R.includes('const paginaGenerica = Boolean(lida && !tituloDaPagina && !lida.jsonLd);'), 'tela de verificação não é texto útil');
  assert.ok(R.includes('const temTexto = Boolean(lida && !paginaGenerica && (lida.texto.length >= MINIMO_DE_TEXTO || lida.jsonLd));'));
  assert.ok(R.includes('const titulo = tituloDoCorpo || tituloDaPagina || tituloDoLink;'), 'informado > página > endereço');
  assert.ok(R.includes('const fotos = paginaGenerica ? [] : (lida?.imagens || []);'), 'o logotipo do marketplace não vira foto do produto');
  assert.ok(R.includes("const precoLido = pag.ok ? precoDaPagina(pag.html) : { preco: null, moeda: null, origem: null };"));
  assert.ok(R.includes("const extras = { marketplace, preco: precoLido.preco, moeda: precoLido.moeda, preco_origem: precoLido.origem, titulo_de: tituloDe };"));
  assert.equal(R.split('...extras').length, 5, 'as quatro respostas levam os extras');
  assert.ok(R.includes("(paginaGenerica ? 'tela_de_verificacao' : 'sem_texto_util')"));
  assert.ok(!/method:\s*'(PATCH|POST|DELETE)'/.test(R), 'NUNCA grava');
});

test('a loja (AddCatalogProduct): o bloco de importar por link, só em campo vazio, fotos pelo nosso servidor, source_url gravado; o resto da tela como estava', () => {
  const A = ler('../src/pages/AddCatalogProduct.jsx');
  assert.ok(A.includes("import { importarProdutoPorLink, fotosPeloNome, marketplaceDoLink, linkValido, resumoDaImportacao, MARKETPLACES_CONHECIDOS } from '@/lib/importarPorLink';"));
  assert.ok(A.includes('data-teste="importar-por-link"') && A.includes('data-teste="botao-importar-por-link"') && A.includes('data-teste="status-importar-por-link"'));
  assert.ok(A.includes('const d = await importarProdutoPorLink({ url, titulo: formDataRef.current.title });'));
  assert.ok(A.includes("if (textoDoCampo(atual) === '' && n.trim() !== '') { preencheu.push(nome); return n; }"), 'só entra em campo vazio');
  for (const campo of ["title: so('nome', antes.title, (d.titulo || '').slice(0, 60))", "description: so('descrição', antes.description, d.descricao)", "price: so('preço', antes.price, precoTexto)", "compare_price: so('preço de referência', antes.compare_price, precoTexto)", "weight: so('peso', antes.weight, textoDoCampo(medidasLidas.peso))", 'source_url: url,']) assert.ok(A.includes(campo), campo);
  assert.ok(A.includes("setMedidasOrigem(d.fonte === 'pagina' ? 'pagina' : 'estimativa_ia');"), 'medida da página vale como página; o resto é estimativa, com o selo');
  assert.ok(A.includes('candidatas = await fotosPeloNome(nome);') && A.includes('const r = await trazerParaNosso(candidatas, nome);'), 'fotos passam pelo nosso servidor');
  assert.ok(A.includes("source_url: product.source_url || ''") && A.includes('source_url: formData.source_url || null,'), 'o link de origem vai e volta do banco');
  assert.ok(A.includes("if (e.key === 'Enter') { e.preventDefault(); importarPeloLink(); }"), 'Enter importa, não envia o formulário');
  assert.ok(A.includes("const mlResponse = await plataforma.functions.invoke('extractMLImages', { productUrl: sourceUrl });"), 'o caminho antigo de fotos automáticas da loja ficou como estava');
});

test('o leilão NÃO foi mexido (ordem do dono: só a opção da loja)', () => {
  const C = readFileSync(new URL('../src/pages/CreateAuction.jsx', import.meta.url), 'utf8');
  assert.ok(!C.includes('importarPorLink'), 'CreateAuction continua com o importador dele');
  assert.ok(C.includes("plataforma.functions.invoke('extractMLImages'"), 'o caminho antigo do leilão segue intacto');
});
