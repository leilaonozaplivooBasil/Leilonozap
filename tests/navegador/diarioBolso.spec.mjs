/**
 * O DIÁRIO DE BOLSO (Fase 1, só leitura, 08/09/2026). Dono: "montar numa aba
 * nova para evitar desde conflitos a bugs no código e na experiência do
 * usuário" — em navegador real, confirma que a tela monta o diário a partir
 * das tarefas feitas, só da própria pessoa, e a busca filtra de verdade.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-diario-bolso');
const FOTOS = process.env.FOTOS_BANCA || path.join(SAIDA, 'fotos');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], { cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit' });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'diario-bolso.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/diario-bolso.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

test('monta os dias, o texto de cada entrada (resumo/IA/ensinamento), e não mostra tarefa de outra pessoa', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 480, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.getByText('Diário de bolso').waitFor();

  const dias = pagina.locator('[data-teste="diario-dia"]');
  await dias.first().waitFor();
  assert.equal(await dias.count(), 2, 'as tarefas de u1 caem em dois dias — 08/09 e 07/09');

  const html = await pagina.content();
  assert.ok(html.includes('Achei uma ideia boa sobre follow-up'), 'o resumo escrito pela própria pessoa aparece');
  assert.ok(html.includes('a pessoa correndo ao amanhecer'), 'sem resumo escrito, usa o que a IA viu na validação');
  assert.ok(html.includes('Diretor'), 'sem comprovação nenhuma mas com mentalidade/Hábito, usa o ensinamento da tarefa');
  assert.ok(!html.includes('não devia aparecer'), 'tarefa de OUTRA pessoa não pode vazar pro diário');
  assert.ok(html.includes('Almoço'), 'tarefa feita sem nada pra contar ainda aparece como um feito simples');

  await pagina.screenshot({ path: path.join(FOTOS, 'diario-bolso-cheio.png') });

  // a busca filtra de verdade — só o dia com "corrida" sobrevive
  await pagina.locator('[data-teste="diario-busca"]').fill('corrida');
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="diario-dia"]').length === 1);
  assert.ok(!(await pagina.content()).includes('Achei uma ideia boa'), 'a busca por "corrida" não deveria trazer a entrada da leitura');

  await pagina.screenshot({ path: path.join(FOTOS, 'diario-bolso-buscado.png') });
  assert.deepEqual(erros, []);
  await ctx.close();
});
