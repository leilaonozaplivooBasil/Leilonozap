// 📄 DIR-207 — A FICHA DA PÁGINA: ler peso e medidas do anúncio (08/10/2026)
// Dono: "a IA tem que pegar todas as medidas… não está botando o peso correto".
// Diagnóstico: nenhuma rota lia a página do link; o peso era chute pelo título.
import test from 'node:test';
import assert from 'node:assert/strict';
import { textoDaPagina, buscarPagina, sanearFicha, priorizarTexto, decodificarEntidades, medidasDoJsonLd, montarPromptDaFicha, montarPromptDaEstimativa, SCHEMA_DA_FICHA, TETO_TEXTO, PALAVRAS_DA_FICHA } from '../api/_lib/fichaDaPagina.js';

const HTML = `<!doctype html><html><head>
<title>Geladeira Brastemp 400L Frost Free &ndash; Loja &amp; Cia</title>
<meta name="description" content="Geladeira Frost Free com 400 litros">
<meta property="og:image" content="https://cdn.loja.com/img/geladeira-1.jpg">
<meta property="og:image" content="/img/geladeira-2.jpg">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Loja"},{"@type":"Product","name":"Geladeira Brastemp BRM54","description":"Frost free de 400 litros","brand":{"@type":"Brand","name":"Brastemp"},"image":["https://cdn.loja.com/img/geladeira-1.jpg","//cdn.loja.com/img/geladeira-3.jpg"],"weight":{"@type":"QuantitativeValue","value":"68","unitCode":"KGM"},"height":{"@type":"QuantitativeValue","value":186.5,"unitCode":"CMT"},"offers":{"@type":"Offer","price":"3999"}}]}</script>
<style>body { color: red }</style>
</head><body>
<script>window.dataLayer = [{ peso: 'nao e isto' }];</script>
<noscript>Ative o JavaScript</noscript>
<h1>Geladeira Brastemp</h1>
<p>Pre&ccedil;o: R$ 3.999,00</p>
<h2>Ficha t&eacute;cnica</h2>
<table><tr><td>Peso: 68 kg</td></tr><tr><td>Altura: 186,5 cm</td></tr><tr><td>Largura: 70 cm</td></tr><tr><td>Profundidade: 72 cm</td></tr></table>
</body></html>`;

test('textoDaPagina: título, meta, og:image + JSON-LD Product (absolutas, sem duplicar), texto visível sem script/style/noscript', () => {
  const t = textoDaPagina(HTML, { url: 'https://www.loja.com/p/geladeira' });
  assert.equal(t.titulo, 'Geladeira Brastemp 400L Frost Free – Loja & Cia');
  assert.equal(t.descricaoMeta, 'Geladeira Frost Free com 400 litros');
  assert.deepEqual(t.imagens, ['https://cdn.loja.com/img/geladeira-1.jpg', 'https://www.loja.com/img/geladeira-2.jpg', 'https://cdn.loja.com/img/geladeira-3.jpg']);
  assert.equal(t.jsonLd.name, 'Geladeira Brastemp BRM54');
  assert.equal(t.jsonLd.brand, 'Brastemp');
  assert.deepEqual(t.jsonLd.weight, { '@type': 'QuantitativeValue', value: '68', unitCode: 'KGM' });
  assert.equal(t.jsonLd.depth, null);
  assert.ok(!('offers' in t.jsonLd), 'preço não entra na ficha');
  assert.match(t.texto, /Ficha técnica\nPeso: 68 kg\nAltura: 186,5 cm\nLargura: 70 cm\nProfundidade: 72 cm/);
  assert.match(t.texto, /Preço: R\$ 3\.999,00/);
  assert.ok(!t.texto.includes('dataLayer') && !t.texto.includes('color: red') && !t.texto.includes('Ative o JavaScript'));
  // sem base, imagem relativa cai fora e protocolo-relativo vira https
  const semBase = textoDaPagina(HTML);
  assert.deepEqual(semBase.imagens, ['https://cdn.loja.com/img/geladeira-1.jpg', 'https://cdn.loja.com/img/geladeira-3.jpg']);
  assert.deepEqual(textoDaPagina('<html><body>oi</body></html>'), { titulo: '', descricaoMeta: '', imagens: [], jsonLd: null, texto: 'oi' });
  assert.equal(decodificarEntidades('a &amp; b &#39;c&#39; &#xE7; &nbsp;x'), "a & b 'c' ç  x");
});

test('texto grande: a janela ao redor de peso/dimensões vai primeiro, o corte é em 14.000', () => {
  const enchimento = 'descrição longa do produto e texto de marketing. '.repeat(600); // ~30k
  const grande = `Geladeira ${enchimento} Dimensões do produto: Peso: 68 kg · Altura: 186,5 cm ${enchimento}`;
  const p = priorizarTexto(grande);
  assert.equal(p.length, TETO_TEXTO);
  assert.ok(p.includes('Peso: 68 kg · Altura: 186,5 cm'), 'a ficha, que estava no meio, sobreviveu ao corte');
  assert.ok(p.startsWith('Geladeira '), 'o começo da página (título) também vem');
  assert.equal(priorizarTexto('curto'), 'curto');
  assert.deepEqual(PALAVRAS_DA_FICHA, ['peso', 'dimens', 'altura', 'largura', 'profundidade', 'comprimento', 'medidas', 'ficha', 'caracter']);
});

const resposta = ({ status = 200, tipo = 'text/html; charset=utf-8', corpo = '<html><title>x</title></html>', url } = {}) => ({
  ok: status >= 200 && status < 300, status, url, headers: { get: (n) => (n.toLowerCase() === 'content-type' ? tipo : null) }, text: async () => corpo,
});

test('buscarPagina: navegador declarado, 403 vira erro sem lançar, só text/html, timeout, endereço interno barrado', async () => {
  let pedido;
  const ok = await buscarPagina('https://www.loja.com/p/1', { fetchImpl: async (u, o) => { pedido = { u, o }; return resposta({ corpo: HTML, url: 'https://www.loja.com/p/1-final' }); } });
  assert.equal(ok.ok, true); assert.equal(ok.status, 200); assert.equal(ok.finalUrl, 'https://www.loja.com/p/1-final'); assert.equal(ok.html, HTML); assert.equal(ok.erro, null);
  assert.match(pedido.o.headers['User-Agent'], /Chrome\//);
  assert.match(pedido.o.headers.Accept, /^text\/html/);
  assert.match(pedido.o.headers['Accept-Language'], /^pt-BR/);
  assert.ok(pedido.o.signal instanceof AbortSignal);

  const bloqueio = await buscarPagina('https://www.mercadolivre.com.br/x', { fetchImpl: async () => resposta({ status: 403, corpo: 'Forbidden' }) });
  assert.deepEqual({ ok: bloqueio.ok, status: bloqueio.status, erro: bloqueio.erro, html: bloqueio.html }, { ok: false, status: 403, erro: 'origem_403', html: '' });

  const pdf = await buscarPagina('https://www.loja.com/manual.pdf', { fetchImpl: async () => resposta({ tipo: 'application/pdf', corpo: '%PDF' }) });
  assert.equal(pdf.ok, false); assert.equal(pdf.erro, 'nao_e_html');

  const lenta = await buscarPagina('https://www.loja.com/lenta', {
    timeoutMs: 20,
    fetchImpl: (u, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })))),
  });
  assert.equal(lenta.ok, false); assert.equal(lenta.erro, 'demorou_demais'); assert.equal(lenta.status, 0);

  const rede = await buscarPagina('https://www.loja.com/x', { fetchImpl: async () => { throw new Error('ECONNRESET'); } });
  assert.equal(rede.ok, false); assert.equal(rede.erro, 'falha_na_origem');

  let chamou = false;
  const interno = await buscarPagina('http://169.254.169.254/latest/meta-data', { fetchImpl: async () => { chamou = true; return resposta(); } });
  assert.equal(interno.ok, false); assert.equal(interno.erro, 'endereco_interno'); assert.equal(chamou, false, 'SSRF: nem chega a buscar');
  assert.equal((await buscarPagina('ftp://x.com/a', { fetchImpl: async () => resposta() })).erro, 'protocolo_nao_permitido');
  assert.equal((await buscarPagina('', { fetchImpl: async () => resposta() })).erro, 'vazia');
});

test('sanearFicha: gramas→kg, mm→cm, m→cm, fora da faixa vira null + aviso, fonte só é página quando a IA achou na página', () => {
  const daIA = { titulo: ' Geladeira <b>Brastemp</b> ', descricao: 'Texto.', marca: 'Brastemp', modelo: 'BRM54', peso: { valor: 68000, unidade: 'g' }, altura: { valor: 1865, unidade: 'mm' }, largura: { valor: 0.7, unidade: 'm' }, comprimento: { valor: 72, unidade: 'cm' }, encontrado_na_pagina: true, confianca: 'alta', observacao: 'Peso do produto.' };
  const f = sanearFicha(daIA, { fonte: 'pagina' });
  assert.deepEqual(f.medidas, { peso: 68, altura: 186.5, largura: 70, comprimento: 72 });
  assert.equal(f.fonte, 'pagina'); assert.equal(f.confianca, 'alta'); assert.deepEqual(f.avisos, []);
  assert.equal(f.titulo, 'Geladeira Brastemp'); assert.equal(f.marca, 'Brastemp'); assert.equal(f.modelo, 'BRM54'); assert.equal(f.observacao, 'Peso do produto.');

  // fora da faixa: 700 cm de largura e 150 kg → null + aviso que explica
  const fora = sanearFicha({ ...daIA, peso: { valor: 150, unidade: 'kg' }, largura: { valor: 700, unidade: 'cm' } }, { fonte: 'pagina' });
  assert.deepEqual(fora.medidas, { peso: null, altura: 186.5, largura: null, comprimento: 72 });
  assert.match(fora.avisos[0], /Peso: 150 kg passa do máximo \(80 kg\)/);
  assert.match(fora.avisos[1], /Largura: 700 cm passa do máximo \(250 cm\)\. Se você pensou em milímetros/);

  // a página foi lida, mas a IA disse que NÃO achou os números nela → estimativa, e 'alta' cai pra 'media'
  const est = sanearFicha({ ...daIA, encontrado_na_pagina: false }, { fonte: 'pagina' });
  assert.equal(est.fonte, 'estimativa'); assert.equal(est.confianca, 'media');
  assert.match(est.avisos[0], /ESTIMATIVA da IA pelo nome/);
  // a página não foi lida: mesmo com encontrado_na_pagina=true, é estimativa
  assert.equal(sanearFicha(daIA, { fonte: 'estimativa' }).fonte, 'estimativa');
  assert.equal(sanearFicha(daIA).fonte, 'estimativa');

  // lixo não derruba
  const vazio = sanearFicha(null);
  assert.deepEqual(vazio.medidas, { peso: null, altura: null, largura: null, comprimento: null });
  assert.equal(vazio.confianca, 'baixa'); assert.match(vazio.avisos[0], /Nenhuma medida aproveitável/);
  assert.deepEqual(sanearFicha({ peso: { valor: 'abc', unidade: 'kg' }, confianca: 'enorme' }).medidas.peso, null);

  // JSON-LD → medidas prontas pra sanear
  const ld = medidasDoJsonLd(textoDaPagina(HTML).jsonLd);
  assert.deepEqual(ld.peso, { valor: 68, unidade: 'kg' }); assert.deepEqual(ld.altura, { valor: 186.5, unidade: 'cm' }); assert.equal(ld.largura.valor, null);
  assert.equal(medidasDoJsonLd(null), null); assert.equal(medidasDoJsonLd({ name: 'x' }), null);
  assert.deepEqual(medidasDoJsonLd({ weight: '12,5 kg' }).peso, { valor: 12.5, unidade: 'kg' });
});

test('o schema e os dois pedidos à IA: copiar da ficha (peso do produto, não da embalagem) × estimar honesto pelo nome', () => {
  assert.deepEqual(SCHEMA_DA_FICHA.required, ['titulo', 'descricao', 'marca', 'modelo', 'peso', 'altura', 'largura', 'comprimento', 'encontrado_na_pagina', 'confianca', 'observacao']);
  assert.deepEqual(SCHEMA_DA_FICHA.properties.confianca.enum, ['alta', 'media', 'baixa']);
  assert.deepEqual(SCHEMA_DA_FICHA.properties.peso.properties.unidade.anyOf[0].enum, ['kg', 'g']);
  assert.deepEqual(SCHEMA_DA_FICHA.properties.altura.properties.unidade.anyOf[0].enum, ['cm', 'mm', 'm']);
  assert.equal(SCHEMA_DA_FICHA.properties.encontrado_na_pagina.type, 'boolean');

  const pagina = textoDaPagina(HTML, { url: 'https://www.loja.com/p/geladeira' });
  const p1 = montarPromptDaFicha({ url: 'https://www.loja.com/p/geladeira', titulo: 'Geladeira 400L', pagina });
  assert.match(p1, /COPIE os números da ficha técnica da página\. Não calcule, não arredonde, não invente/);
  assert.match(p1, /prefira o peso DO PRODUTO\. Se a página traz o do produto E o da embalagem, use o do produto\. Se só houver o da embalagem/);
  assert.match(p1, /"encontrado_na_pagina" é true SOMENTE se peso ou medidas vieram do texto da página/);
  assert.match(p1, /"comprimento" é a profundidade/);
  assert.match(p1, /SEM HTML, SEM preço/);
  assert.ok(p1.includes('Peso: 68 kg') && p1.includes('"unitCode":"KGM"') && p1.includes('TÍTULO INFORMADO: Geladeira 400L'));

  const p2 = montarPromptDaEstimativa({ titulo: 'Geladeira 400L' });
  assert.match(p2, /Não foi possível ler a página/);
  assert.match(p2, /"encontrado_na_pagina" é false, e "confianca" é "baixa" \(ou "media"/);
  assert.match(p2, /NOME DO PRODUTO: Geladeira 400L$/);
  assert.ok(!p2.includes('COPIE'), 'sem página não há de onde copiar');
});
