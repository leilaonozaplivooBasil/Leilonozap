/**
 * 🔎 MEDIDOR DA GAVETA PRESA — roda contra o pacote de produção, não contra cópia.
 *
 * 17/09/2026: "clica em continuar no cartão, a tela seguinte não abre, todos os
 * botões ficam intocáveis; ao recarregar, caio na tela de finalizar compra".
 *
 * A navegação acontecia e o checkout até renderizava — mas as duas camadas
 * fixas da gaveta da carteira (fundo z-90 e painel z-95) continuavam por cima,
 * engolindo todo clique. Causa: o AnimatePresence congelava o filho na saída —
 * não animava, não desmontava, e parava de repassar o estado (medido com o
 * estado exposto no DOM: 2,5s depois do clique o nó ainda dizia open="true",
 * opacidade 1, rota já trocada).
 *
 * ⚠️ POR QUE ISTO É UM SCRIPT E NÃO UM TESTE
 * O defeito NÃO se reproduz em banca isolada. Tentei com a troca de `open`
 * sozinha, com rotas de verdade e com rota lazy + Suspense: nos três casos o
 * AnimatePresence desmontava normal, e a mutação que devolvia o defeito passava
 * VERDE. Teste que passa com e sem o defeito dá segurança falsa. Aqui o app
 * roda inteiro, a partir do `dist` de verdade.
 *
 * COMO RODAR
 *   npm run build && node scripts/medir-gaveta-presa.mjs
 *
 * O QUE ESPERAR
 *   camadas por cima = 0  e  botão do checkout = CLICÁVEL
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const DIST = path.join(process.cwd(), 'dist');
if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/ não existe — rode `npm run build` antes.');
  process.exit(1);
}
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

const servidor = createServer((req, res) => {
  const rel = (req.url || '/').split('?')[0];
  let arq = path.join(DIST, decodeURIComponent(rel));
  // qualquer rota desconhecida cai no index — é o mesmo rewrite do vercel.json
  if (!arq.startsWith(DIST) || !existsSync(arq) || statSync(arq).isDirectory()) arq = path.join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
  res.end(readFileSync(arq));
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

const CROMO = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));
const navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
const ctx = await navegador.newContext({ viewport: { width: 1354, height: 900 } });
const pagina = await ctx.newPage();

// carteira de mentira: o que importa aqui é a navegação, não o saldo
const carteira = { success: true, saldo_disponivel: 0, saldo_livre_loja: 0, commission_balance: 0, saldo_reservado: 0, saldo_alocado: 0, saldo_a_liberar: 0, kyc_status: 'aprovado', commissions: [], withdrawals: [], transactions: [] };
await ctx.route('**/api/functions/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(carteira) }));
await ctx.route('**supabase.co/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
await pagina.addInitScript(() => {
  localStorage.setItem('currentUser', JSON.stringify({ id: 'u', full_name: 'Teste', email: 'e@t.com', phone: '21999990000', cpf: '12345678909', role: 'user' }));
});

const clicar = (alvo) => pagina.evaluate((alvo) => {
  const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').replace(/\s+/g, ' ').trim() === alvo);
  if (!b) return false; b.click(); return true;
}, alvo);

await pagina.goto(`${BASE}/Home`, { waitUntil: 'domcontentloaded' });
await pagina.waitForTimeout(2200);
await pagina.evaluate(() => window.dispatchEvent(new Event('openWallet')));
await pagina.waitForTimeout(900);
await pagina.locator('button:has-text("Adicionar Saldo")').first().click();
await pagina.waitForTimeout(600);
await clicar('R$ 500,00');
await clicar('Cartão');
await pagina.waitForTimeout(300);
await pagina.locator('[data-teste="caixa-de-aceite"] input').check();
await pagina.waitForTimeout(200);
await pagina.evaluate(() => {
  const b = [...document.querySelectorAll('button')].filter((x) => /Continuar no Cart[aã]o/.test(x.textContent || ''));
  b[b.length - 1].click();
});
await pagina.waitForTimeout(2500);

const m = await pagina.evaluate(() => {
  const camadas = [...document.querySelectorAll('div')].filter((e) => {
    const s = getComputedStyle(e);
    return s.position === 'fixed' && Number(s.zIndex) >= 90 && e.getBoundingClientRect().width > 500;
  }).map((e) => String(e.className).slice(0, 46));
  // 🔴 O TESTE DE CLIQUE É NO CENTRO DA TELA, não num botão específico. Uma
  // versão anterior procurava um botão por texto, não achava nenhum na tela
  // nova e reprovava por isso — reprovando um conserto que tinha funcionado.
  // O que importa é: quem recebe o clique no meio da tela é a PÁGINA ou uma
  // camada da gaveta?
  const topo = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  const presoEmCamada = !!topo?.closest?.('.fixed');
  const clique = presoEmCamada
    ? `BLOQUEADO por ${topo.closest('.fixed').className.slice(0, 40)}`
    : `LIVRE (${topo ? topo.tagName : 'nada'})`;
  return { url: location.pathname, camadas, clique, form: /Cart[aã]o de Cr[eé]dito/i.test(document.body.innerText || '') };
});

console.log(`rota................: ${m.url}`);
console.log(`formulário abriu....: ${m.form ? 'SIM' : 'NÃO'}`);
console.log(`camadas por cima....: ${m.camadas.length ? `${m.camadas.length} → ${m.camadas.join(' | ')}` : '0'}`);
console.log(`centro da tela......: ${m.clique}`);

const ok = m.url.includes('AuctionCheckoutModern') && m.form && m.camadas.length === 0 && m.clique.startsWith('LIVRE');
console.log(ok ? '\n✅ a gaveta soltou a tela' : '\n❌ a gaveta ficou presa por cima');
await navegador.close();
servidor.close();
process.exit(ok ? 0 : 1);
