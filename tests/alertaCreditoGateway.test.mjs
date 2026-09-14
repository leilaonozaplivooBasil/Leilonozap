// alertaCreditoGateway — DIR-147 (14/09/2026), depois do incidente do 402.
//
// O Vercel AI Gateway ficou em $0,00 sem ninguém saber, até a validação
// falhar de verdade numa manhã inteira. Dono, ao vivo: "o crédito quando
// estiver acabando precisa ter um aviso, pra não ocorrer mais isso." Este
// vigia roda sozinho e AVISA antes de chegar em zero — mesmo padrão do
// vigia de reservas órfãs (alertaReservasOrfas.js): só fala quando acha
// algo, nunca move nada, nunca recarrega sozinho.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const vigia = ler('../api/functions/alertaCreditoGateway.js');
const vercel = JSON.parse(ler('../vercel.json'));

test('o vigia roda sozinho, várias vezes ao dia', () => {
  const cron = (vercel.crons || []).find((c) => c.path === '/api/functions/alertaCreditoGateway');
  assert.ok(cron, 'o vigia saiu do cron — volta a depender de alguém abrir o dashboard da Vercel');
  assert.match(cron.schedule, /^\d+ (\*|\*\/\d+) \* \* \*$/, 'schedule mudou de forma inesperada');
});

test('o vigia NÃO recarrega nada nem escreve em outro lugar — só o aviso em system_logs', () => {
  // Só quem decide comprar mais crédito é o dono; o vigia é vigia, não caixa.
  assert.ok(!/method: '(PATCH|PUT|DELETE)'/.test(vigia), 'o vigia passou a escrever/apagar algo');
  const posts = [...vigia.matchAll(/sb\('([^']+)',\s*\{\s*\n?\s*method: 'POST'/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(posts)], ['system_logs'], 'o vigia passou a escrever em outro lugar além do aviso');
});

test('checa o saldo da MESMA credencial que valida comprovação de verdade', () => {
  assert.match(vigia, /import \{ resolverIA, saldoGateway, SALDO_BAIXO_USD \} from '\.\.\/_lib\/ia\.js';/);
});

// ─── comportamento, com fetch e Supabase REST mockados ──────────────────────
process.env.AI_GATEWAY_API_KEY = 'vck_chave_de_teste';
process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
delete process.env.ANTHROPIC_API_KEY;

const { default: handler } = await import('../api/functions/alertaCreditoGateway.js');

let estado; let fetchReal;
beforeEach(() => {
  estado = { credito: null, statusCredito: 200, logs: [] };
  fetchReal = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('/v1/credits')) {
      return new Response(JSON.stringify(estado.credito ?? {}), { status: estado.statusCredito, headers: { 'content-type': 'application/json' } });
    }
    if (u.includes('/rest/v1/system_logs')) {
      estado.logs.push(JSON.parse(opts.body));
      return new Response('[]', { status: 201, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`fetch inesperado em teste: ${u}`);
  };
});
afterEach(() => { globalThis.fetch = fetchReal; });

function fazerRes() {
  const r = { code: 0, corpo: null };
  r.setHeader = () => {}; r.status = (c) => { r.code = c; return r; }; r.json = (v) => { r.corpo = v; return r; };
  return r;
}

test('saldo alto: não avisa nada — vigia que fala à toa vira ruído', async () => {
  estado.credito = { balance: '95.50', total_used: '4.50' };
  const r = fazerRes();
  await handler({}, r);
  assert.equal(r.corpo.saldo_usd, 95.5);
  assert.equal(r.corpo.saldo_baixo, false);
  assert.equal(estado.logs.length, 0, 'saldo alto não devia gerar aviso nenhum');
});

test('saldo baixo: grava aviso em system_logs dizendo o valor e o que fazer', async () => {
  estado.credito = { balance: '2.30', total_used: '97.70' };
  const r = fazerRes();
  await handler({}, r);
  assert.equal(r.corpo.saldo_baixo, true);
  assert.equal(estado.logs.length, 1);
  assert.equal(estado.logs[0].component_name, 'alertaCreditoGateway');
  assert.equal(estado.logs[0].status, 'warning');
  assert.match(estado.logs[0].message, /\$2\.30/);
  assert.match(estado.logs[0].message, /vercel\.com/, 'o aviso tem que dizer ONDE recarregar, não só que está acabando');
});

test('a checagem falhando também vira aviso — silêncio sem contexto é o que já causou o incidente', async () => {
  estado.statusCredito = 500;
  const r = fazerRes();
  await handler({}, r);
  assert.equal(r.corpo.checado, false);
  assert.equal(estado.logs.length, 1, 'não conseguir checar precisa avisar, não passar em branco');
  assert.equal(estado.logs[0].step, 'SALDO_DESCONHECIDO');
});

test('sem chave de IA nenhuma: não quebra, só diz que não checou', async () => {
  delete process.env.AI_GATEWAY_API_KEY;
  const r = fazerRes();
  await handler({}, r);
  assert.equal(r.corpo.success, true);
  assert.equal(r.corpo.checado, false);
  assert.equal(estado.logs.length, 0);
  process.env.AI_GATEWAY_API_KEY = 'vck_chave_de_teste';
});
