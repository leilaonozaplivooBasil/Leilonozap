/**
 * 🖼️ AS TRÊS FILEIRAS E A PROGRAMAÇÃO DE BANNERS — A PÁGINA REAL, NUM CHROMIUM.
 *
 * Dono (08/10/2026): "uma fileira pro leilão, uma pra loja e uma unificada;
 * ligar a unificada desliga as outras duas" e "deixar banners na esteira":
 * três artes de uma TV (3, 2 e 1 dia) entrando sozinhas à meia-noite.
 *
 * O que se prova com o Painel de Mídia de verdade e um banco de mentira:
 *   1. as três chaves existem e o padrão é Leilão + Loja no ar;
 *   2. ligar a Unificada grava as três linhas de configuração e desliga as outras;
 *   3. ligar o Leilão com a Unificada no ar desliga a Unificada;
 *   4. cada banner mostra a situação (encerrado / no ar / agendado);
 *   5. salvar datas grava o instante em UTC a partir do horário de Brasília,
 *      e fim antes do início é recusado sem gravar;
 *   6. "pré-visualizar uma data" esmaece quem não estaria no ar, sem gravar nada;
 *   7. sem as colunas de data no banco, o painel AVISA e não deixa programar
 *      (a gravação do servidor descartaria a data e o banner iria ao ar na hora);
 *   8. a aba "Banners" do Gerenciamento de Conteúdo mostra este painel para o
 *      administrador e segue com a tela antiga para quem não é admin;
 *   9. a ferramenta do pop-up do leilão mostra a prévia do leilão ESCOLHIDO e, ao
 *      salvar, limpa a imagem antiga guardada (caso Hoverboard × PS5);
 *  11. 🔴 programar um banner DESLIGADO: salvar as datas o LIGA, e ele só aparece na data de entrada;
 *  10. cada banner pode ser LIGADO a um leilão (some sozinho quando ele encerrar), e o painel
 *      mostra o que vai acontecer — inclusive o banner cujo leilão já encerrou.
 *
 * COMO RODAR
 *   npm run test:navegador
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-painel-de-banners');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function garantirNavegador() {
  if (navegador) return navegador;
  if (!process.env.BANCA_PRONTA) {
    execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
      cwd: path.join(AQUI, '..', '..'),
      env: { ...process.env, SAIDA_BANCA: SAIDA },
      stdio: 'inherit',
    });
  }
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'painel-de-banners.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/painel-de-banners.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO, proxy: { server: 'per-context' } } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) await new Promise((ok) => servidor.close(ok));
});

async function abrir(consulta = '') {
  const ctx = await (await garantirNavegador()).newContext({
    viewport: { width: 1280, height: 900 },
    proxy: { server: 'http://127.0.0.1:1', bypass: '127.0.0.1' },
  });
  const pagina = await ctx.newPage();
  pagina.on('dialog', (d) => d.accept());
  await pagina.goto(`${BASE}${consulta}`, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('[data-teste="fileiras-de-banners"]');
  return { ctx, pagina };
}

const ligada = (pagina, chave) => pagina.locator(`[data-fileira="${chave}"]`).getAttribute('data-ligada');
const gravacoes = (pagina, tipo) => pagina.evaluate((t) => window.__plataformaFalsa.chamadas.filter((c) => c.entidade === 'BannerImage' && c.tipo === t), tipo);

test('o padrão é Leilão e Loja no ar, Unificada desligada', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    assert.equal(await ligada(pagina, 'home'), 'sim');
    assert.equal(await ligada(pagina, 'catalog'), 'sim');
    assert.equal(await ligada(pagina, 'unificado'), 'nao');
    assert.match(await pagina.locator('[data-fileira="home"]').innerText(), /4 banners/);
    assert.match(await pagina.locator('[data-fileira="catalog"]').innerText(), /1 banner\b/);
  } finally { await ctx.close(); }
});

test('ligar a Unificada grava as três linhas e desliga as outras duas', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.getByRole('switch', { name: 'Fileira Unificada' }).click();
    await pagina.waitForFunction(() => document.querySelector('[data-fileira="unificado"]')?.getAttribute('data-ligada') === 'sim');
    const criadas = (await gravacoes(pagina, 'create')).map((c) => c.dados).filter((d) => d.context === 'banner_fileira');
    const porChave = Object.fromEntries(criadas.map((d) => [d.title, d.is_active]));
    assert.deepEqual(porChave, { home: false, catalog: false, unificado: true });
    assert.equal(await ligada(pagina, 'home'), 'nao');
    assert.equal(await ligada(pagina, 'catalog'), 'nao');
    assert.match(await pagina.locator('[data-secao="home"]').innerText(), /Fileira desligada/);
  } finally { await ctx.close(); }
});

test('com a Unificada no ar, ligar o Leilão desliga a Unificada e devolve as duas', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    await pagina.getByRole('switch', { name: 'Fileira Unificada' }).click();
    await pagina.waitForFunction(() => document.querySelector('[data-fileira="unificado"]')?.getAttribute('data-ligada') === 'sim');
    await pagina.getByRole('switch', { name: 'Fileira Leilão' }).click();
    await pagina.waitForFunction(() => document.querySelector('[data-fileira="unificado"]')?.getAttribute('data-ligada') === 'nao');
    assert.equal(await ligada(pagina, 'home'), 'sim');
    assert.equal(await ligada(pagina, 'catalog'), 'sim');
    const atualizacoes = (await gravacoes(pagina, 'update')).map((c) => c.dados.is_active).sort();
    assert.deepEqual(atualizacoes, [false, true, true], 'unificado → desligado; home e catalog → ligados');
  } finally { await ctx.close(); }
});

test('cada banner mostra a situação: encerrado, no ar com fim, agendado e sem datas', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const estado = (id) => pagina.locator(`[data-banner="${id}"] [data-estado]`).getAttribute('data-estado');
    assert.equal(await estado('tv3'), 'encerrado');
    assert.equal(await estado('tv2'), 'no_ar_com_fim');
    assert.equal(await estado('tv1'), 'agendado');
    assert.equal(await estado('geral'), 'no_ar');
    assert.match(await pagina.locator('[data-banner="tv1"] [data-estado]').innerText(), /^Entra em \d{2}\/\d{2} às 00:00$/);
  } finally { await ctx.close(); }
});

test('salvar datas grava o instante UTC do horário de Brasília; fim antes do início é recusado', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const cartao = pagina.locator('[data-banner="geral"]');
    await cartao.locator('[data-teste="abrir-programacao"]').click();
    await cartao.locator('[data-campo="inicio"]').fill('2026-10-13T00:00');
    await cartao.locator('[data-campo="fim"]').fill('2026-10-12T00:00');
    await cartao.locator('[data-teste="salvar-programacao"]').click();
    assert.match(await cartao.getByRole('alert').innerText(), /depois do início/);
    assert.equal((await gravacoes(pagina, 'update')).length, 0, 'nada foi gravado');

    await cartao.locator('[data-campo="fim"]').fill('2026-10-14T00:00');
    await cartao.locator('[data-teste="salvar-programacao"]').click();
    await pagina.waitForFunction(() => window.__plataformaFalsa.chamadas.some((c) => c.tipo === 'update'));
    const [u] = await gravacoes(pagina, 'update');
    assert.equal(u.id, 'geral');
    assert.deepEqual(u.dados, { starts_at: '2026-10-13T03:00:00.000Z', ends_at: '2026-10-14T03:00:00.000Z' });
  } finally { await ctx.close(); }
});

test('"tirar as datas" grava nulos nas duas pontas', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const cartao = pagina.locator('[data-banner="tv2"]');
    await cartao.locator('[data-teste="abrir-programacao"]').click();
    await cartao.locator('[data-teste="limpar-programacao"]').click();
    await pagina.waitForFunction(() => window.__plataformaFalsa.chamadas.some((c) => c.tipo === 'update'));
    const [u] = await gravacoes(pagina, 'update');
    assert.deepEqual(u.dados, { starts_at: null, ends_at: null });
  } finally { await ctx.close(); }
});

test('pré-visualizar uma data esmaece quem não estaria no ar, sem gravar nada', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const esmaecido = (id) => pagina.locator(`[data-banner="${id}"]`).evaluate((el) => el.className.includes('opacity-50'));
    // agora: só a "2 dias" (e a sem datas) estão no ar
    assert.equal(await esmaecido('tv3'), true);
    assert.equal(await esmaecido('tv2'), false);
    assert.equal(await esmaecido('tv1'), true);
    // simulando 01:00 depois da próxima meia-noite de Brasília: vira a "1 dia"
    const quando = await pagina.evaluate(() => {
      const t = new Date(window.__meiaNoite + 3600 * 1000); // 01:00 de Brasília, depois da virada
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(t).map((x) => [x.type, x.value]));
      return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
    });
    await pagina.locator('[data-campo="simulada"]').fill(quando);
    assert.equal(await esmaecido('tv2'), true, 'a "2 dias" já saiu');
    assert.equal(await esmaecido('tv1'), false, 'a "1 dia" já entrou');
    assert.equal(await esmaecido('geral'), false);
    assert.match(await pagina.locator('[data-teste="simulador-de-data"]').innerText(), /Simulando \d{2}\/\d{2} às 01:00/);
    assert.equal((await gravacoes(pagina, 'update')).length + (await gravacoes(pagina, 'create')).length, 0, 'nada foi gravado');
  } finally { await ctx.close(); }
});

test('sem as colunas de data no banco, o painel avisa e não deixa programar', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?semcolunas=1');
  try {
    assert.match(await pagina.locator('[data-banner="geral"]').innerText(), /falta aplicar a atualização do banco/);
    assert.equal(await pagina.locator('[data-teste="abrir-programacao"]').count(), 0, 'nenhum botão Programar');
  } finally { await ctx.close(); }
});

test('a aba Banners do Gerenciamento de Conteúdo mostra o painel novo para o admin', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?pagina=conteudo&perfil=admin');
  try {
    assert.equal(await pagina.locator('[data-teste="painel-de-midia"]').count(), 1);
    assert.equal(await pagina.getByText('Gerenciar Banners').count(), 0, 'a tela antiga não aparece');
    assert.equal(await pagina.getByRole('heading', { name: 'Painel de Mídia' }).count(), 0, 'sem o cabeçalho de página inteira');
    assert.equal(await pagina.getByRole('switch', { name: 'Fileira Unificada' }).count(), 1);
    assert.equal(await pagina.locator('[data-banner="tv2"] [data-estado]').getAttribute('data-estado'), 'no_ar_com_fim');
  } finally { await ctx.close(); }
});

test('quem não é admin segue com a tela antiga, sem mudança', { skip: semNavegador }, async () => {
  const ctx = await (await garantirNavegador()).newContext({ viewport: { width: 1280, height: 900 }, proxy: { server: 'http://127.0.0.1:1', bypass: '127.0.0.1' } });
  const pagina = await ctx.newPage();
  try {
    await pagina.goto(`${BASE}?pagina=conteudo&perfil=lojista`, { waitUntil: 'networkidle' });
    await pagina.getByText('Gerenciar Banners').waitFor();
    assert.equal(await pagina.locator('[data-teste="fileiras-de-banners"]').count(), 0);
    assert.equal(await pagina.getByText('Novo Banner Desktop').count(), 1);
  } finally { await ctx.close(); }
});

test('🔴 pop-up do leilão: a prévia mostra o leilão ESCOLHIDO e salvar limpa a imagem antiga', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const previa = pagina.locator('[data-teste="previa-do-popup"]');
    await previa.waitFor();
    // a configuração tem o link do Hoverboard, o título e a IMAGEM antiga do PS5: a prévia ignora o resíduo
    assert.equal((await previa.locator('[data-teste="previa-titulo"]').innerText()).trim(), 'Hoverboard Skate Elétrico 6.5 Polegadas');
    assert.match(await previa.locator('img').getAttribute('src'), /HOVERBOARD/);
    assert.match(await previa.innerText(), /Lance atual R\$\s?97/);

    // troca o leilão: a prévia acompanha
    await pagina.locator('select').first().selectOption('ps5');
    assert.equal((await previa.locator('[data-teste="previa-titulo"]').innerText()).trim(), 'Playstation 5');
    assert.match(await previa.locator('img').getAttribute('src'), /PS5/);

    // salvar grava o leilão certo e LIMPA a imagem guardada
    await pagina.getByRole('button', { name: 'Salvar', exact: true }).click();
    await pagina.waitForFunction(() => window.__plataformaFalsa.chamadas.some((c) => c.tipo === 'update' && c.id === 'popup-1'));
    const [u] = (await gravacoes(pagina, 'update')).filter((c) => c.id === 'popup-1');
    assert.equal(u.dados.link_url, '/AuctionRoom?id=ps5');
    assert.equal(u.dados.title, 'Playstation 5');
    assert.equal(u.dados.image_url, '', 'a imagem antiga ficou guardada');
  } finally { await ctx.close(); }
});

test('🏁 ligar o banner a um leilão: a lista, a gravação e o que o painel diz que vai acontecer', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?leilao=1');
  try {
    const cartao = pagina.locator('[data-banner="geral"]');
    const seletor = cartao.locator('[data-campo="leilao-do-banner"]');
    await seletor.waitFor();
    const opcoes = await seletor.locator('option').allInnerTexts();
    assert.ok(opcoes[0].startsWith('Nenhum'), 'a primeira opção é "nenhum — fica até eu desligar"');
    assert.ok(opcoes.some((o) => o.includes('Hoverboard')) && opcoes.some((o) => o.includes('Playstation 5')), `a lista não traz os leilões no ar: ${opcoes}`);
    assert.ok(!opcoes.some((o) => o.includes('Smart TV LG vendida')), 'o leilão já vendido apareceu na lista de escolha');
    assert.match(await cartao.innerText(), /Escolha o leilão deste produto e o banner sai sozinho/);

    await seletor.selectOption('ps5');
    await pagina.waitForFunction(() => window.__plataformaFalsa.chamadas.some((c) => c.tipo === 'update' && c.id === 'geral' && 'auction_id' in c.dados));
    const [u] = (await gravacoes(pagina, 'update')).filter((c) => c.id === 'geral');
    assert.deepEqual(u.dados, { auction_id: 'ps5' });
    // o painel relê e diz o que vai acontecer
    const chip = cartao.locator('[data-estado-leilao]');
    await chip.waitFor();
    assert.equal(await chip.getAttribute('data-estado-leilao'), 'leilao_no_ar');
    assert.match(await chip.innerText(), /Sai sozinho quando o leilão encerrar \(\d{2}\/\d{2} às \d{2}:\d{2}\)/);
  } finally { await ctx.close(); }
});

test('🏁 banner cujo leilão JÁ ENCERROU: o painel avisa, mostra o leilão e esmaece o card', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?leilao=1');
  try {
    const cartao = pagina.locator('[data-banner="tv-banner"]');
    const chip = cartao.locator('[data-estado-leilao]');
    await chip.waitFor();
    assert.equal(await chip.getAttribute('data-estado-leilao'), 'leilao_encerrou');
    assert.match(await chip.innerText(), /O leilão encerrou · banner fora do ar/);
    assert.equal(await cartao.evaluate((el) => el.className.includes('opacity-50')), true, 'o card não esmaeceu');
    // o seletor segue mostrando QUAL leilão era (mesmo fora da lista de ativos)
    const rotulo = await cartao.locator('[data-campo="leilao-do-banner"] option:checked').innerText();
    assert.match(rotulo, /\(encerrado\) Smart TV LG vendida/);
  } finally { await ctx.close(); }
});

test('o "próximo banner" também escolhe o leilão a que vai ficar ligado', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const secao = pagina.locator('[data-secao="home"]');
    const seletor = secao.locator('[data-campo="proximo-leilao"]');
    await seletor.waitFor();
    assert.ok((await seletor.locator('option').count()) >= 3, 'a lista de leilões não chegou');
  } finally { await ctx.close(); }
});

test('sem a coluna no banco, o painel avisa e não deixa ligar a leilão', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?semcolunas=1');
  try {
    assert.match(await pagina.locator('[data-banner="geral"] [data-teste="leilao-do-banner"]').innerText(), /falta aplicar a atualização do banco/);
    assert.equal(await pagina.locator('[data-campo="leilao-do-banner"]').count(), 0, 'o seletor apareceu sem a coluna');
  } finally { await ctx.close(); }
});

test('🔴 programar um banner DESLIGADO: avisa, e salvar as datas o LIGA — ele fica "Entra em" até a data', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir('?desligado=1');
  try {
    const cartao = pagina.locator('[data-banner="desligado"]');
    assert.equal(await cartao.locator('[data-estado]').first().getAttribute('data-estado'), 'desligado');
    await cartao.locator('[data-teste="abrir-programacao"]').click();
    assert.match(await cartao.locator('[data-teste="aviso-desligado"]').innerText(), /Ao salvar as datas ele é ligado/);
    const botao = cartao.locator('[data-teste="salvar-programacao"]');
    assert.equal((await botao.innerText()).trim(), 'Salvar datas e ligar');

    await cartao.locator('[data-campo="inicio"]').fill('2099-01-01T00:00');
    await cartao.locator('[data-campo="fim"]').fill('2099-01-02T00:00');
    await botao.click();
    await pagina.waitForFunction(() => window.__plataformaFalsa.chamadas.some((c) => c.tipo === 'update' && c.id === 'desligado'));
    const [u] = (await gravacoes(pagina, 'update')).filter((c) => c.id === 'desligado');
    assert.deepEqual(u.dados, { starts_at: '2099-01-01T03:00:00.000Z', ends_at: '2099-01-02T03:00:00.000Z', is_active: true });
    // o painel relê: o banner está LIGADO e aguardando a data
    await pagina.waitForFunction(() => document.querySelector('[data-banner="desligado"] [data-estado]')?.getAttribute('data-estado') === 'agendado');
    assert.match(await cartao.locator('[data-estado]').first().innerText(), /^Entra em 01\/01 às 00:00$/);
  } finally { await ctx.close(); }
});

test('banner que já está LIGADO não ganha o aviso nem o "e ligar"; só as datas são gravadas', { skip: semNavegador }, async () => {
  const { ctx, pagina } = await abrir();
  try {
    const cartao = pagina.locator('[data-banner="geral"]');
    await cartao.locator('[data-teste="abrir-programacao"]').click();
    assert.equal(await cartao.locator('[data-teste="aviso-desligado"]').count(), 0);
    assert.equal((await cartao.locator('[data-teste="salvar-programacao"]').innerText()).trim(), 'Salvar datas');
    await cartao.locator('[data-campo="inicio"]').fill('2099-01-01T00:00');
    await cartao.locator('[data-teste="salvar-programacao"]').click();
    await pagina.waitForFunction(() => window.__plataformaFalsa.chamadas.some((c) => c.tipo === 'update' && c.id === 'geral'));
    const [u] = (await gravacoes(pagina, 'update')).filter((c) => c.id === 'geral');
    assert.deepEqual(u.dados, { starts_at: '2099-01-01T03:00:00.000Z', ends_at: null }, 'não mexe em is_active de quem já está ligado');
  } finally { await ctx.close(); }
});
