// 📊 ANALISADOR DE LOTES (15/09/2026) — um lugar só, com a lista de itens.
// Dono: "olhe os três lugares que ele está, retire onde está duplicado, retire
// esse branco; e a lista de todos os produtos não está aparecendo."
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const existe = (rel) => existsSync(new URL(rel, import.meta.url));
const semComentarios = (t) => t.replace(/^\s*\/\/.*$/gm, '');

test('A1: as cópias do analisador saíram — só /AnaliseDeLotes fica, com crachá de cargo', () => {
  assert.ok(!existe('../src/pages/AnaliseLoteEstoque.jsx'), 'página órfã ainda existe');
  assert.ok(!existe('../src/components/lotes/AnalisadorLoteInline.jsx'), 'cópia inline ainda existe');
  const app = ler('../src/App.jsx');
  assert.ok(!/AnaliseLoteEstoque/.test(app));
  assert.match(app, /<Route path="\/AnaliseDeLotes" element=\{\s*\n\s*<LayoutWrapper currentPageName="AnaliseDeLotes">\s*\n\s*<RequireRole allowedRoles=\{\['admin', 'leiloeiro'\]\}/);
  assert.ok(!/AnaliseLoteEstoque/.test(ler('../src/Layout.jsx')));
  assert.ok(!/AnaliseLoteEstoque/.test(ler('../src/lib/prefetchHotRoutes.js')));
});

test('A2: Estoque de Lotes mostra o cartão-destaque (cores fixas, não vira branco) em vez da cópia', () => {
  const estoque = ler('../src/pages/EstoqueLotes.jsx');
  assert.ok(!/AnalisadorLoteInline/.test(estoque));
  assert.match(estoque, /<AnalisadorDestaque className="mb-6" \/>/);
  const card = semComentarios(ler('../src/components/lotes/AnalisadorDestaque.jsx'));
  assert.match(card, /AVALIADOR INTELIGENTE DE LEILÕES/);
  assert.match(card, /navigate\(createPageUrl\('AnaliseDeLotes'\)\)/);
  // o tema claro repinta por [class*="bg-gray-9"], [class*="text-white"] etc. — o cartão não usa nenhuma dessas
  assert.ok(!/bg-gray-|bg-slate-|text-white|text-slate-|text-gray-|text-transparent/.test(card), 'classe que o tema claro repinta');
});

test('A3: o analisador tem lugar com destaque na Visão Geral do admin', () => {
  assert.match(ler('../src/lib/adminMenu.js'), /\{ title: "Analisador de Lotes", pageName: "AnaliseDeLotes", icon: BarChart3, destaque: true \}/);
  assert.match(ler('../src/components/admin/MiniCanvasOverview.jsx'), /item\.destaque\s*\n?\s*\? "bg-gradient-to-r from-blue-600\/25/);
});

test('A4: a lista completa de itens aparece sempre, abaixo do painel', () => {
  const pagina = ler('../src/pages/AnaliseDeLotes.jsx');
  assert.match(pagina, /<div className="xl:col-span-3" id="itens-do-lote">\s*\n\s*<ItensDoLote itens=\{loteAtual\.rawItemsByGrade \|\| \[\]\} \/>/);
  assert.match(pagina, /anchor: "itens-do-lote"/);
  const lista = ler('../src/components/lotes/ItensDoLote.jsx');
  assert.match(lista, /Itens do Lote \(\{lista\.length\}\)/);
  assert.match(lista, /Ver todos \(\{filtrados\.length\}\)/);
  assert.match(lista, /overflow-x-auto/);
  // sem aba Resumo, a tabela departamental nasce da coluna Categoria
  assert.match(pagina, /if \(resumoCategorias\.length === 0 && Object\.keys\(subItemsByCategory\)\.length > 0\) \{/);
});

test('A5: parser — valor TOTAL (não unitário), local de retirada em qualquer aba, CSV, célula numérica', () => {
  const pagina = ler('../src/pages/AnaliseDeLotes.jsx');
  assert.match(pagina, /const colValueTotal = getColumnIndex\(\['VALOR TOTAL', 'VALOR DE MERCADO'\]\);/);
  assert.match(pagina, /h\.includes\('VALOR'\) && !h\.includes\('UNIT'\)/);
  assert.match(pagina, /\/local de carregamento\/i\.test\(c\)/);
  assert.match(pagina, /String\(r\[0\]\)\.includes\('Total Geral'\)/);
  assert.match(pagina, /nomeLote: filename\.replace\(\/\\\.xlsx\?\$\|\\\.csv\$\/i, ''\),\s*\n\s*localColeta,\s*\n\s*origem: 'Mercado Livre'/);
  assert.ok(!/useState\('15639\.00'\)/.test(pagina), 'arremate inventado voltou');
  assert.match(pagina, /e\.target\.value = '';/);
  assert.match(ler('../src/components/lotes/AtualizarGradesModal.jsx'), /h\.includes\('VALOR'\) && !h\.includes\('UNIT'\)/);
});

test('A6: as três ações (estoque, marketplace, oportunidades) moram no analisador único, com try/catch', () => {
  const pagina = ler('../src/pages/AnaliseDeLotes.jsx');
  for (const fn of ['handleEnviarParaEstoque', 'handlePublicarMarketplace', 'handlePublicarOportunidade']) {
    assert.match(pagina, new RegExp(`const ${fn} = async`), fn);
  }
  assert.match(pagina, /Enviar para Estoque/);
  assert.match(pagina, /Publicar nas Oportunidades do Dia/);
  assert.match(pagina, /<PublicarOportunidadeModal/);
  assert.match(pagina, /toast\.error\('Erro ao publicar: '/);
  assert.match(pagina, /const semArremate = valorArrematado <= 0;/);
});

test('A7: a rota searchGoogleShopping existe na Vercel e diz quando não está configurada', () => {
  const rota = ler('../api/functions/searchGoogleShopping.js');
  assert.match(rota, /configured: false, error: 'SERPAPI_KEY não configurada na Vercel'/);
  assert.match(rota, /estourouLimite\(`shopping:\$\{ipDoRequest\(req\)\}`, 120, 300\)/);
  assert.match(rota, /engine=google_shopping/);
  const card = ler('../src/components/lotes/VereditoMLCard.jsx');
  assert.match(card, /level: 'sem_servico'/);
  assert.match(card, /status === 'indisponivel'/);
  assert.match(ler('../src/components/lotes/MLValidationButton.jsx'), /CACHE_PREFIX = 'ml_valid_v5_'/);
});
