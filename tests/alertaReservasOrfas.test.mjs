// Em 27/08/2026 a faxinaReservasOrfas rodou pela primeira vez desde que foi
// escrita (18/08) e achou R$ 134,00 travados em 7 contas. Uma tinha R$ 44,80
// presos num lance que nunca foi gravado, e o cliente abriu chamado achando que
// era outra coisa. O dinheiro estava la havia semanas porque a faxina so roda
// quando alguem lembra — nao estava em cron nenhum.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const vigia  = ler('../api/functions/alertaReservasOrfas.js');
const faxina = ler('../api/functions/faxinaReservasOrfas.js');
const vercel = JSON.parse(ler('../vercel.json'));

test('o vigia roda sozinho, uma vez por dia', () => {
  const cron = (vercel.crons || []).find((c) => c.path === '/api/functions/alertaReservasOrfas');
  assert.ok(cron, 'o vigia saiu do cron — volta a depender de alguem lembrar');
  assert.match(cron.schedule, /^\d+ \d+ \* \* \*$/, 'passou a rodar mais de uma vez por dia');
});

test('o vigia NAO move dinheiro — nenhuma escrita em app_users', () => {
  // Esta e a trava mais importante do arquivo. Devolver reserva e decisao de
  // gente; o vigia so avisa.
  assert.ok(!/app_users[^`'"]*`?,\s*\{\s*\n?\s*method: '(PATCH|PUT|DELETE)'/.test(vigia));
  assert.ok(!/method: 'PATCH'/.test(vigia), 'apareceu PATCH no vigia');
  assert.ok(!/method: 'PUT'/.test(vigia), 'apareceu PUT no vigia');
  assert.ok(!/method: 'DELETE'/.test(vigia), 'apareceu DELETE no vigia');
  // O unico POST permitido e o do aviso em system_logs.
  const posts = [...vigia.matchAll(/sb\('([^']+)',\s*\{\s*\n?\s*method: 'POST'/g)].map((m) => m[1]);
  assert.deepEqual(posts, ['system_logs'], 'o vigia passou a escrever em outro lugar');
});

test('a conta do orfao e a MESMA da faxina', () => {
  // Se a regra mudar num lado e nao no outro, o vigia avisa errado.
  const regra = /auctions\?select=id,title,current_price,frete_reservado_valor,status,order_status&winner_id=eq\.\$\{enc\(uid\)\}&status=in\.\(active,processing\)/;
  assert.match(faxina, regra, 'a faxina mudou a consulta dos leiloes vivos');
  assert.match(vigia,  regra, 'o vigia ficou para tras da faxina');

  for (const arquivo of [faxina, vigia]) {
    assert.match(arquivo, /\.filter\(\(a\) => a\.order_status !== 'paid'\)/);
    assert.match(arquivo, /\(Number\(a\.current_price\) \|\| 0\) \+ \(Number\(a\.frete_reservado_valor\) \|\| 0\)/);
    assert.match(arquivo, /money\(reservado - legitimo\)/);
  }
});

test('nome de cliente so sai com a chave de diagnostico', () => {
  // O cron chama sem chave. Sem esta trava, uma URL publica listaria nome e
  // saldo de todo mundo.
  assert.match(vigia, /corpo\?\.key === process\.env\.DIAG_KEY/);
  assert.match(vigia, /\.\.\.\(comDetalhe \? \{ detalhe: achados \} : \{\}\)/);
});

test('so registra aviso quando acha algo', () => {
  // Vigia que fala todo dia vira ruido e ninguem le.
  assert.match(vigia, /if \(achados\.length\) \{/);
});

test('o aviso diz o que fazer, nao so que existe problema', () => {
  assert.match(vigia, /confirmar='APLICAR'/);
});

// ── Replica da conta, com os numeros reais de 27/08 ──────────────────────────
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
function orfaoDe({ reservado, leiloesVivos }) {
  const legitimo = money(leiloesVivos.reduce((s, a) => s + (a.preco || 0) + (a.frete || 0), 0));
  return money(reservado - legitimo);
}

test('o efeito: quem nao lidera nada tem tudo orfao', () => {
  // Alexandre Walenkamp, 27/08: R$ 44,80 travados, zero leiloes.
  assert.equal(orfaoDe({ reservado: 44.8, leiloesVivos: [] }), 44.8);
});

test('o efeito: reserva legitima e preservada', () => {
  // Luciano Pinheiro, 27/08: R$ 546,03 travados, R$ 531,83 legitimos na Bike
  // Scooter. So os R$ 14,20 de sobra sao orfaos.
  assert.equal(orfaoDe({ reservado: 546.03, leiloesVivos: [{ preco: 531.83 }] }), 14.2);
});

test('o efeito: quem esta certo nao entra na lista', () => {
  assert.equal(orfaoDe({ reservado: 100, leiloesVivos: [{ preco: 90, frete: 10 }] }), 0);
});

test('o efeito: leilao vivo com frete conta o frete junto', () => {
  assert.equal(orfaoDe({ reservado: 120, leiloesVivos: [{ preco: 100, frete: 11.6 }] }), 8.4);
});
