/** 💸 Pagamento manual de comissão: botão, aviso de KYC, rota chamada certa, saldo novo e histórico depois de pagar — num Chromium real. COMO RODAR: npm run test:navegador */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-pagamento-manual');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));
let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';
let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'pagamento-manual.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/pagamento-manual.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

// FOTOS_GUIA=<pasta> salva as telas numeradas (é daí que sai o guia da Beatriz)
const foto = async (pagina, nome) => {
  if (process.env.FOTOS_GUIA) await pagina.screenshot({ path: path.join(process.env.FOTOS_GUIA, `${nome}.png`) });
};

test('💸 pagar na mão: botão só com saldo, aviso sem KYC, rota certa, saldo novo e histórico', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1100, height: 760 } });
  const pagina = await ctx.newPage();
  const erros = []; pagina.on('pageerror', (e) => erros.push(String(e)));
  try {
    await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('[data-teste="abrir-pagar-manual"]', { timeout: 20000 });
    // aba "A receber": só quem tem saldo — Ana (saldo 0) não aparece, e o botão só existe com saldo
    const cartoes = await pagina.$$eval('[data-teste="abrir-pagar-manual"]', (b) => b.length);
    assert.equal(cartoes, 2, `botões na aba "A receber": ${cartoes}`);
    assert.equal(await pagina.getByText('Ana Teste').count(), 0);
    // o "a receber" é o saldo real: Maria 324,65
    assert.ok(await pagina.getByText('R$ 324,65').first().isVisible());
    await foto(pagina, '1-lista');

    // abre o modal da Maria (primeira, maior saldo) — sem KYC, tem que avisar
    await pagina.locator('[data-teste="abrir-pagar-manual"]').first().click();
    await pagina.waitForSelector('[data-teste="modal-pagar-comissao-manual"]');
    assert.ok(await pagina.locator('[data-teste="aviso-sem-kyc"]').isVisible(), 'sem KYC e sem aviso');
    const confirmar = pagina.locator('[data-teste="confirmar-pagamento-manual"]');
    assert.equal(await confirmar.isDisabled(), true, 'confirmar habilitado sem valor e sem chave');
    await foto(pagina, '2-modal-vazio');

    await pagina.fill('[data-teste="valor-pagamento-manual"]', '324,65');
    await pagina.fill('[data-teste="chave-pagamento-manual"]', '219876543210');
    await pagina.fill('[data-teste="nota-pagamento-manual"]', 'PIX pelo Inter, comprovante no WhatsApp');
    assert.equal(await confirmar.isDisabled(), false);
    await foto(pagina, '3-modal-preenchido');
    await confirmar.click();

    // a rota recebeu o que o servidor precisa
    await pagina.waitForFunction(() => window.__plataformaFalsa.chamadas.some((c) => c.nome === 'payCommissionManually'));
    const chamada = await pagina.evaluate(() => window.__plataformaFalsa.chamadas.find((c) => c.nome === 'payCommissionManually').corpo);
    assert.deepEqual(chamada, { actor_id: 'u_beatriz', user_id: 'u_maria', valor: 324.65, pix_key_usada: '219876543210', nota: 'PIX pelo Inter, comprovante no WhatsApp' });

    // recarregou: Maria zerou e saiu da aba "A receber"
    await pagina.waitForSelector('[data-teste="modal-pagar-comissao-manual"]', { state: 'detached' });
    await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="abrir-pagar-manual"]').length === 1);
    await pagina.waitForTimeout(400);
    // o "Já pago" do topo soma o pagamento manual: 40 (Ana) + 324,65 (Maria)
    assert.ok(await pagina.getByText('R$ 364,65').first().isVisible(), '"Já pago" não somou o pagamento manual');
    await foto(pagina, '4-depois-de-pagar');

    // na aba "Já pago", o cartão dela mostra o pagamento no histórico
    await pagina.getByRole('button', { name: 'Já pago' }).click();
    const cartaoMaria = pagina.locator('div.bg-gray-900.border.rounded-xl', { hasText: 'Maria Exemplo' });
    await cartaoMaria.getByRole('button', { name: 'Ver comissões' }).click();
    const hist = cartaoMaria.locator('[data-teste="historico-pagamentos-manuais"]');
    await hist.waitFor();
    const txt = await hist.innerText();
    assert.match(txt, /R\$ 324,65/); assert.match(txt, /219876543210/); assert.match(txt, /Beatriz/);
    assert.match(txt, /PIX pelo Inter/);
    // depois de pagar, nenhuma linha de venda pode continuar dizendo "Pendente"/"Confirmado"
    const detalhe = await cartaoMaria.innerText();
    assert.doesNotMatch(detalhe, /Pendente|Confirmado/);
    assert.match(detalhe, /Vendas que geraram a comissão/i);
    await cartaoMaria.scrollIntoViewIfNeeded();
    await foto(pagina, '5-historico');
  } finally { await ctx.close(); }
  assert.deepEqual(erros, []);
});

test('🔴 valor acima do saldo não chega no servidor', { skip: semNavegador }, async () => {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext({ viewport: { width: 1100, height: 760 } });
  const pagina = await ctx.newPage();
  try {
    await pagina.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pagina.waitForSelector('[data-teste="abrir-pagar-manual"]', { timeout: 20000 });
    // João: KYC aprovado, saldo 77,45 — sem aviso de KYC
    await pagina.locator('div.bg-gray-900.border.rounded-xl', { hasText: 'João Modelo' }).locator('[data-teste="abrir-pagar-manual"]').click();
    await pagina.waitForSelector('[data-teste="modal-pagar-comissao-manual"]');
    assert.equal(await pagina.locator('[data-teste="aviso-sem-kyc"]').count(), 0, 'KYC aprovado não leva aviso');
    await pagina.fill('[data-teste="valor-pagamento-manual"]', '100');
    await pagina.fill('[data-teste="chave-pagamento-manual"]', 'joao@exemplo.com');
    await pagina.locator('[data-teste="confirmar-pagamento-manual"]').click();
    await pagina.getByText(/não pode passar do saldo/).waitFor({ timeout: 5000 });
    const chamou = await pagina.evaluate(() => window.__plataformaFalsa.chamadas.some((c) => c.nome === 'payCommissionManually'));
    assert.equal(chamou, false, 'mandou pro servidor um valor maior que o saldo');
  } finally { await ctx.close(); }
});
