/**
 * Centro de Custo e Categoria que FICAM SALVOS — num navegador de verdade.
 *
 * 🔴 Aline (05/09/2026): "Ontem foi criado Centro de custo e o botão para criar novo centro
 * de custo, sendo que preciso que os criados apareçam no filtro para eu apenas selecionar.
 * Eu já criei alguns, sendo que não estão ficando salvos, estou tendo que criar a cada
 * lançamento."
 *
 * O que só o navegador mede: o que ela REALMENTE vê ao abrir o dropdown do formulário real,
 * e o que sai gravado quando ela digita no "+ Novo".
 *
 * COMO RODAR
 *   npm i -D playwright        (uma vez; o Chromium já está na máquina)
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
// uma pasta por banca — ver a nota em carrossel.spec.mjs
const SAIDA = process.env.SAIDA_BANCA
  || path.join(tmpdir(), `banca-${path.basename(new URL(import.meta.url).pathname, '.spec.mjs')}`);
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((c) => existsSync(c));

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch { /* dependência opcional: os casos se marcam como PULADOS */ }

const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'centrocusto.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/centrocusto.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir() {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 1000 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.getByText('Novo Gasto').first().waitFor();
  return { pagina, ctx, erros };
}

const lista = (pagina, qual) =>
  pagina.locator(`[data-teste="${qual}"]`).evaluate((n) => JSON.parse(n.textContent));

/** Preenche o mínimo obrigatório e clica em Adicionar Gasto. */
async function salvar(pagina) {
  await pagina.getByPlaceholder('Ex: Aluguel do galpão').fill('Aporte de teste');
  await pagina.locator('input[placeholder="0,00"]').first().fill('500');
  await pagina.locator('input[type="date"]').first().fill('2026-10-27');
  await pagina.getByRole('button', { name: 'Adicionar Gasto' }).click();
  await pagina.locator('[data-teste="salvo"]').evaluate((n) => n.textContent !== '');
  return JSON.parse(await pagina.locator('[data-teste="salvo"]').textContent());
}

// ─────────────── o que ela vê no dropdown ───────────────

test('o que ela criou APARECE na lista — é o pedido inteiro', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  const centros = await lista(pagina, 'centros');
  for (const criado of ['Distribuicao de lucro', 'investimento', 'custo variável']) {
    assert.ok(centros.includes(criado), `"${criado}" sumiu do dropdown: ${JSON.stringify(centros)}`);
  }
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('"custo fixo" e "Custo Fixo" viram UMA opção, não duas', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const centros = await lista(pagina, 'centros');
  const quantos = centros.filter((c) => c.toLowerCase() === 'custo fixo').length;
  assert.equal(quantos, 1, `o mesmo centro apareceu ${quantos}x: ${JSON.stringify(centros)}`);
  await ctx.close();
});

test('o espaço do fim do "custo variável " não vira opção separada', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const centros = await lista(pagina, 'centros');
  assert.ok(!centros.some((c) => c !== c.trim()), `opção com espaço nas pontas: ${JSON.stringify(centros)}`);
  await ctx.close();
});

test('categoria recebeu o mesmo tratamento: "Salario" e "salario" viram uma', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const cats = await lista(pagina, 'categorias');
  assert.equal(cats.filter((c) => c.toLowerCase() === 'salario').length, 1, JSON.stringify(cats));
  assert.equal(cats.filter((c) => c.toLowerCase().startsWith('aliment')).length, 1, JSON.stringify(cats));
  await ctx.close();
});

test('as de fábrica continuam no topo da lista', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const centros = await lista(pagina, 'centros');
  assert.deepEqual(centros.slice(0, 3), ['Leilões', 'Loja Virtual', 'Operacional']);
  await ctx.close();
});

// ─────────────── o "+ Novo" grava o que devia ───────────────

test('digitar um centro NOVO grava do jeito que ela escreveu', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  await pagina.getByRole('button', { name: '+ Novo' }).click();
  await pagina.getByPlaceholder('Digite o centro de custo').fill('  Dividendos  ');
  const salvo = await salvar(pagina);
  assert.equal(salvo.cost_center, 'Dividendos', 'devia gravar aparado e como ela escreveu');
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('digitar um centro QUE JÁ EXISTE reaproveita a grafia do banco', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.getByRole('button', { name: '+ Novo' }).click();
  await pagina.getByPlaceholder('Digite o centro de custo').fill('CUSTO FIXO');
  const salvo = await salvar(pagina);
  // sem isto o relatório "Por Centro de Custo" ganharia uma TERCEIRA linha do mesmo centro
  assert.equal(salvo.cost_center, 'custo fixo', `gravou variante nova: "${salvo.cost_center}"`);
  await ctx.close();
});

test('o centro novo entra na lista e não some no lançamento seguinte', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  assert.ok(!(await lista(pagina, 'centros')).includes('Dividendos'), 'já existia antes de salvar');
  await pagina.getByRole('button', { name: '+ Novo' }).click();
  await pagina.getByPlaceholder('Digite o centro de custo').fill('Dividendos');
  await salvar(pagina);
  const depois = await lista(pagina, 'centros');
  assert.ok(depois.includes('Dividendos'), `sumiu depois de salvar: ${JSON.stringify(depois)}`);
  await ctx.close();
});

test('centro de custo é opcional: sem preencher, grava vazio e não inventa lixo', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const salvo = await salvar(pagina);
  assert.equal(salvo.cost_center, '', `gravou "${salvo.cost_center}" sem ela escolher nada`);
  await ctx.close();
});
