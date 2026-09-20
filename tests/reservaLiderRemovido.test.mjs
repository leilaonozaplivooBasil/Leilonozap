// 💰 (20/09/2026) — DIR-167: dinheiro do lance nunca mais fica preso.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('entityWrite: zerar winner_id de um leilão devolve a reserva do líder ANTES do PATCH', () => {
  const s = ler('../api/functions/entityWrite.js');
  const iDev = s.indexOf("devolverReservaDoLeilao(id, 'devolucao_lider_removido')");
  const iPatch = s.indexOf("const patch = semColunasAusentes(table, { ...(body?.payload || {}), updated_date: now });");
  assert.ok(iDev > 0 && iPatch > iDev, 'a devolução precisa vir antes do PATCH');
  assert.match(s, /hasOwnProperty\.call\(body\.payload, 'winner_id'\) && !body\.payload\.winner_id/);
  assert.match(s, /reserva_devolvida: reservaDevolvidaCancel \|\| reservaDevolvidaLider/);
});

test('submitAtomicBid: reserva órfã do leilão volta no lance seguinte, pelo livro-caixa por pessoa', () => {
  const s = ler('../api/functions/submitAtomicBid.js');
  assert.match(s, /reserva_ledger\?select=user_id,direcao,valor&auction_id=eq\./);
  assert.match(s, /r\.direcao === 'entrada_reserva' \? v : -v/);
  assert.match(s, /if \(u === String\(userId\) \|\| preso <= 0\.009\) continue;/);
  assert.match(s, /released_orphans: liberadosOrfaos,/);
  const iPrev = s.indexOf('const devolvido = await releaseHold(auction.winner_id, valorAnterior, auctionId);');
  const iOrf = s.indexOf('const liberadosOrfaos = [];');
  assert.ok(iPrev > 0 && iOrf > iPrev, 'órfãos só depois do líder anterior');
});

test('alertaReservasOrfas: reserva 100% órfã e quieta há 2h volta sozinha, com CAS e livro-caixa', () => {
  const s = ler('../api/functions/alertaReservasOrfas.js');
  assert.match(s, /async function devolverReservaOrfa\(uid, reservadoLido\)/);
  assert.match(s, /if \(vivos\.length === 0 && orfao === reservado\) \{/);
  assert.match(s, /order_status=not\.eq\.paid&updated_at=gte\./);
  assert.match(s, /Date\.now\(\) - ultimaEntrada > 2 \* 60 \* 60 \* 1000/);
  assert.match(s, /tipo: 'devolucao_reserva_orfa', direcao: 'saida_reserva'/);
  assert.match(s, /saldo_reservado\.eq\.\$\{reservado\}/);
  assert.match(s, /total_devolvido_automaticamente: totalDevolvido/);
});

test('CLAUDE.md ensina onde moram os lances (bids é vazia)', () => {
  const s = ler('../CLAUDE.md');
  assert.match(s, /## Onde moram os lances/);
  assert.match(s, /auction_messages/);
  assert.match(s, /Nunca zerar `winner_id`/);
});
