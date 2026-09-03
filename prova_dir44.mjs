// PROVA EM NAVEGADOR REAL — DIR-44 (Quadro dos Sonhos por horizonte).
// Regra REL-34.1: componente mexido = renderizado num navegador de verdade,
// com o backend interceptado (Supabase REST/Storage + /api/functions) e um
// super_admin injetado. Zero erro de página é requisito.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const RAIZ = '/workspace/Leilonozap';
const URL_CRM = 'http://localhost:4173/Licensing?tab=catalogo&catalogTab=catalogo-crm';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(`${RAIZ}/prova-sonho.png`, PNG);

const passos = []; let falhas = 0;
const ok = (nome, cond, extra = '') => { passos.push(`${cond ? '✅' : '❌'} ${nome}${extra ? ` — ${extra}` : ''}`); if (!cond) falhas++; };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => {
  localStorage.setItem('currentUser', JSON.stringify({
    id: 'test-admin', email: 'leilaonozaplivoo@gmail.com', full_name: 'Luiz Santanna',
    role: 'super_admin', levels: ['ceo'], created_date: '2026-01-01T00:00:00Z',
  }));
});

const chamadas = { busca: 0, proxy: [], ia: 0, upload: 0, escritas: [] };
let perfilCriado = null;

// catch-alls primeiro (rotas registradas DEPOIS têm precedência)
await ctx.route('**supabase.co/**', (route) => route.fulfill({ json: {} }));
await ctx.route('**/api/**', (route) => route.fulfill({ json: {} }));
await ctx.route('**/rest/v1/**', (route) => {
  const url = route.request().url();
  if (url.includes('/rest/v1/metodo_perfil')) return route.fulfill({ json: perfilCriado ? [perfilCriado] : [] });
  return route.fulfill({ json: [] });
});
await ctx.route('**/storage/v1/**', (route) => {
  if (route.request().method() === 'POST') { chamadas.upload++; return route.fulfill({ json: { Key: 'public-assets/uploads/prova.webp' } }); }
  return route.fulfill({ contentType: 'image/png', body: PNG });
});
await ctx.route('**fotos.mock**', (route) => route.fulfill({ contentType: 'image/png', body: PNG }));
// terceiros de telemetria/login não fazem parte da prova — silenciar
for (const dominio of ['**googletagmanager.com**', '**datadog**', '**accounts.google.com**', '**facebook**', '**gstatic.com**', '**googleapis.com**']) {
  await ctx.route(dominio, (route) => route.fulfill({ contentType: 'application/javascript', body: '' }));
}
await ctx.route('**/api/functions/**', (route) => {
  const nome = route.request().url().split('/api/functions/')[1].split('?')[0];
  let body = {}; try { body = route.request().postDataJSON() || {}; } catch { body = {}; }
  if (nome === 'extractGoogleShoppingImages') {
    chamadas.busca++;
    return route.fulfill({ json: { success: true, images: ['https://fotos.mock/a.jpg', 'https://fotos.mock/b.jpg', 'https://fotos.mock/c.jpg'], query_usada: body.productName, source: 'google_shopping', trilha: [] } });
  }
  if (nome === 'proxyImage') {
    chamadas.proxy.push(body.imageUrl);
    return route.fulfill({ json: { file_url: String(body.imageUrl).replace('fotos.mock', 'fotos.mock/proxied') } });
  }
  if (nome === 'descreverImagemSonho') {
    chamadas.ia++;
    return route.fulfill({ json: { success: true, detalhes: 'BMW X6 2024, preta, rodas aro 21, bancos de couro caramelo.' } });
  }
  if (nome === 'entityWrite') {
    chamadas.escritas.push(body);
    if (body.table !== 'metodo_perfil') return route.fulfill({ json: { success: true, rows: [{ id: 'x1', ...body.payload }] } });
    if (body.action === 'create') { perfilCriado = { id: 'mp1', ...body.payload }; return route.fulfill({ json: { success: true, rows: [perfilCriado] } }); }
    perfilCriado = { ...(perfilCriado || { id: 'mp1' }), ...(body.payload || {}) };
    return route.fulfill({ json: { success: true, rows: [perfilCriado] } });
  }
  return route.fulfill({ json: { success: true, rows: [] } });
});

const page = await ctx.newPage();
const errosPagina = [];
page.on('pageerror', (e) => errosPagina.push(`PAGEERROR ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errosPagina.push(`CONSOLE ${m.text().slice(0, 200)} @ ${m.location()?.url || ''}`); });
const tem = (texto, trecho) => texto.toUpperCase().includes(trecho.toUpperCase());

const clicaVisivel = (texto) => page.evaluate((t) => {
  const els = [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null && b.innerText.trim().toUpperCase().includes(t.toUpperCase()));
  if (!els.length) return false; els[0].click(); return true;
}, texto);
const corpo = () => page.evaluate(() => document.body?.innerText || '');

// ── 1) render logado + navegar até o Sonho ──
await page.goto(URL_CRM, { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('body', { timeout: 15000 });
await page.waitForTimeout(6000);
let t = await corpo();
ok('painel "Os 8 Hábitos do Sucesso" renderiza logado', t.includes('8 Hábitos do Sucesso'));
ok('clicou em "1. Sonho"', await clicaVisivel('1. Sonho'));
await page.waitForTimeout(800);
t = await corpo();
ok('explicação do quadro presente', t.includes('Monte o seu quadro'));
ok('3 horizontes na tela (curto 1-2, médio 2-4, longo 5+)',
  t.includes('Curto prazo') && t.includes('1 a 2 anos') && t.includes('Médio prazo') && t.includes('2 a 4 anos') && t.includes('Longo prazo') && t.includes('5 anos pra frente'));

// ── 2) modal: busca na internet sem sair dele ──
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent !== null && x.innerText.trim() === 'Adicionar');
  b[0].click(); // quadro do CURTO
});
await page.waitForTimeout(500);
t = await corpo();
ok('modal "Adicionar ao quadro dos sonhos" abriu', t.includes('Adicionar ao quadro dos sonhos'));
ok('modal oferece os 3 prazos', tem(t, 'Prazo do sonho'));
await page.fill('input[placeholder*="BMW X6"]', 'BMW X6 2024');
ok('clicou "Buscar imagem"', await clicaVisivel('Buscar imagem'));
await page.waitForTimeout(1200);
ok('busca chamou extractGoogleShoppingImages (rota real do catálogo)', chamadas.busca === 1);
const thumbs = page.locator('button:has(img[src*="fotos.mock"])');
ok('grade de resultados com 3 imagens', (await thumbs.count()) === 3, `count=${await thumbs.count()}`);

// ── 3) multi-seleção + confirmar (com proxy anti-link-morto) ──
const selecionadas = await page.evaluate(() => {
  const alvos = [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null && b.querySelector('img[src*="fotos.mock"]'));
  alvos[0]?.click(); alvos[1]?.click();
  return alvos.length;
});
ok('duas thumbs clicadas na grade', selecionadas >= 2, `alvos=${selecionadas}`);
await page.waitForTimeout(400);
ok('confirmação mostra 2 escolhidas', tem(await corpo(), '2 escolhidas'));
ok('clicou confirmar', await clicaVisivel('Adicionar 2 imagens'));
await page.waitForTimeout(2000);
t = await corpo();
ok('modal fechou e os 2 sonhos entraram no quadro', !tem(t, 'Prazo do sonho') && (t.match(/BMW X6 2024/g) || []).length >= 2);
ok('imagens da busca passaram pelo proxyImage (re-hospedagem)', chamadas.proxy.length === 2, JSON.stringify(chamadas.proxy));
const criacao = chamadas.escritas.find((e) => e.action === 'create' && e.table === 'metodo_perfil');
ok('gravou via entityWrite em metodo_perfil com 2 sonhos no curto', criacao?.table === 'metodo_perfil' && Array.isArray(criacao?.payload?.sonhos) && criacao.payload.sonhos.length === 2 && criacao.payload.sonhos.every((s) => s.horizonte === 'curto' && s.id && s.imagem_url.includes('proxied')));
const imgsQuadro = await page.locator('img[src*="fotos.mock/proxied"]').count();
ok('cartões do quadro exibem a imagem re-hospedada', imgsQuadro >= 2, `imgs=${imgsQuadro}`);

// ── 4) detalhes embaixo da imagem: IA preenche, humano revisa e salva ──
ok('abriu edição de detalhes', await clicaVisivel('escreva os detalhes do seu sonho'));
await page.waitForTimeout(300);
const placeholderOk = await page.evaluate(() => !![...document.querySelectorAll('textarea')].find((x) => x.placeholder.includes('banco de couro')));
ok('placeholder guia com a orientação do dono (ano, cor, banco de couro, roda)', placeholderOk);
ok('clicou "Preencher com IA"', await clicaVisivel('Preencher com IA'));
await page.waitForTimeout(1200);
ok('rota descreverImagemSonho foi chamada', chamadas.ia === 1);
const valorIA = await page.evaluate(() => [...document.querySelectorAll('textarea')].map((x) => x.value).find((v) => v.includes('BMW X6 2024')) || '');
ok('textarea recebeu os detalhes da IA (editáveis)', valorIA.includes('rodas aro 21'));
ok('salvou os detalhes', await clicaVisivel('Salvar'));
await page.waitForTimeout(1200);
t = await corpo();
ok('detalhes aparecem embaixo da imagem no quadro', t.includes('rodas aro 21'));
const upDetalhes = chamadas.escritas.filter((e) => e.action === 'update').pop();
ok('update gravou os detalhes no item certo', upDetalhes?.payload?.sonhos?.[0]?.detalhes?.includes('rodas aro 21'));

// ── 5) upload do aparelho no MÉDIO prazo ──
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent !== null && x.innerText.trim() === 'Adicionar');
  b[1].click(); // quadro do MÉDIO
});
await page.waitForTimeout(500);
await page.fill('input[placeholder*="BMW X6"]', 'Casa na praia');
await page.setInputFiles('input[data-testid="sonho-arquivo"]', `${RAIZ}/prova-sonho.png`);
await page.waitForTimeout(1500);
ok('upload subiu pro Storage (Core.UploadFile)', chamadas.upload >= 1, `uploads=${chamadas.upload}`);
t = await corpo();
ok('imagem enviada já entra escolhida', tem(t, '1 escolhida'));
ok('confirmou no médio prazo', await clicaVisivel('Adicionar 1 imagem'));
await page.waitForTimeout(2000);
t = await corpo();
ok('sonho "Casa na praia" entrou no quadro', t.includes('Casa na praia'));
ok('upload NÃO passou pelo proxy (já é nosso bucket)', chamadas.proxy.length === 2);
const upMedio = chamadas.escritas.filter((e) => e.action === 'update').pop();
ok('item do upload gravado no horizonte médio', upMedio?.payload?.sonhos?.some((s) => s.titulo === 'Casa na praia' && s.horizonte === 'medio' && String(s.imagem_url).includes('supabase')));

// ── 6) remover do quadro ──
const removeu = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button[title="Remover do quadro"]')]
    .find((b) => b.closest('.shadow-sm')?.innerText.includes('Casa na praia'));
  if (!btn) return false; btn.click(); return true;
});
ok('clicou remover no cartão', removeu);
await page.waitForTimeout(1200);
t = await corpo();
ok('cartão saiu do quadro', !t.includes('Casa na praia'));
const posRemocao = chamadas.escritas.filter((e) => e.table === 'metodo_perfil' && e.action === 'update').pop();
ok('escrita da remoção tirou SÓ o item certo', posRemocao?.payload?.sonhos?.length === 2 && !posRemocao.payload.sonhos.some((s) => s.titulo === 'Casa na praia') && posRemocao.payload.sonhos.filter((s) => s.titulo === 'BMW X6 2024').length === 2);

// ── 7) caminho só-texto continua existindo (LONGO prazo) ──
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent !== null && x.innerText.trim() === 'Adicionar');
  b[2].click(); // quadro do LONGO
});
await page.waitForTimeout(500);
await page.fill('input[placeholder*="BMW X6"]', 'Liberdade financeira');
ok('confirmou só com texto', await clicaVisivel('Adicionar só com texto'));
await page.waitForTimeout(1500);
t = await corpo();
ok('sonho de texto entrou no longo prazo', t.includes('Liberdade financeira'));

// ── 7b) ADENDO: colar o endereço da imagem e adicionar por ele ──
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent !== null && x.innerText.trim() === 'Adicionar');
  b[0].click(); // CURTO de novo
});
await page.waitForTimeout(500);
await page.fill('input[placeholder*="BMW X6"]', 'Lancha 30 pés');
await page.fill('input[placeholder*="cole aqui o endereço"]', 'https://fotos.mock/lancha.jpg');
ok('clicou "Usar" no endereço colado', await clicaVisivel('Usar'));
await page.waitForTimeout(400);
t = await corpo();
ok('imagem colada entrou marcada na galeria', tem(t, '1 escolhida'));
ok('confirmou a imagem colada', await clicaVisivel('Adicionar 1 imagem'));
await page.waitForTimeout(2000);
t = await corpo();
ok('sonho da URL colada entrou no quadro', t.includes('Lancha 30 pés'));
ok('URL colada passou pelo proxyImage', chamadas.proxy.includes('https://fotos.mock/lancha.jpg'), JSON.stringify(chamadas.proxy.slice(-2)));

await page.screenshot({ path: `${RAIZ}/prova-dir44.png`, fullPage: true });

// ── 8) deslogado: raiz continua de pé ──
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx2.route('**supabase.co/**', (r) => r.fulfill({ json: {} }));
await ctx2.route('**/rest/v1/**', (r) => r.fulfill({ json: [] }));
for (const dominio of ['**googletagmanager.com**', '**datadog**', '**accounts.google.com**', '**facebook**', '**gstatic.com**', '**googleapis.com**']) {
  await ctx2.route(dominio, (r) => r.fulfill({ contentType: 'application/javascript', body: '' }));
}
const page2 = await ctx2.newPage();
const erros2 = [];
page2.on('pageerror', (e) => erros2.push(e.message));
await page2.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page2.waitForTimeout(8000);
const corpo2 = await page2.evaluate(() => document.body?.innerText.length || 0);
ok('raiz deslogada renderiza sem crash', corpo2 > 100 && erros2.length === 0, `chars=${corpo2} erros=${erros2.length}`);

ok('ZERO erros de página/console no fluxo logado', errosPagina.length === 0, errosPagina.slice(0, 5).join(' | '));

console.log(passos.join('\n'));
console.log(`\n═══ RESULTADO: ${passos.length - falhas}/${passos.length} ═══`);
if (errosPagina.length) console.log('ERROS:\n' + errosPagina.join('\n'));
await browser.close();
process.exit(falhas ? 1 : 0);
