// 🏷️ DIR-205 — ARREMATE SEM SALDO NÃO É SILÊNCIO (07/10/2026)
// Medido: um arremate de R$ 246 ficou 26 dias em awaiting_payment; o cron tentou
// a cada 10 min ("1 sem saldo") e ninguém foi avisado — nem o vencedor, nem o admin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { montarAviso, CATEGORIA_POR_TIPO, SITE } from '../api/_lib/textosDosAvisos.js';
import { etapaDoLembreteDeArremate, pessoaAceita, podeRepetir } from '../api/_lib/regrasDosAvisos.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const SQL = readFileSync(new URL('../supabase/migrations/20261007230000_arremate_sem_saldo.sql', import.meta.url), 'utf8');

test('a etapa do lembrete: nada antes de 1h, "1h" até 24h, "24h" depois; data ruim não lembra', () => {
  const fim = Date.parse('2026-09-11T23:58:00Z');
  assert.equal(etapaDoLembreteDeArremate('2026-09-11T23:58:00Z', fim + 30 * 60000), null);
  assert.equal(etapaDoLembreteDeArremate('2026-09-11T23:58:00Z', fim + 60 * 60000), '1h');
  assert.equal(etapaDoLembreteDeArremate('2026-09-11T23:58:00Z', fim + 23 * 3600000), '1h');
  assert.equal(etapaDoLembreteDeArremate('2026-09-11T23:58:00Z', fim + 24 * 3600000), '24h');
  assert.equal(etapaDoLembreteDeArremate('2026-09-11T23:58:00Z', fim + 26 * 24 * 3600000), '24h');
  assert.equal(etapaDoLembreteDeArremate(null), null);
  assert.equal(etapaDoLembreteDeArremate('lixo'), null);
  // cada etapa sai UMA vez (não é tipo que repete)
  assert.equal(podeRepetir('arremate_sem_saldo', '2026-09-12T01:00:00Z', Date.now()), false);
  assert.equal(podeRepetir('arremate_sem_saldo', null), true);
});

test('o e-mail: categoria leilão, diz quanto tem e quanto falta, e a segunda via abre a porta para desistir', () => {
  assert.equal(CATEGORIA_POR_TIPO.arremate_sem_saldo, 'leilao');
  assert.equal(pessoaAceita({ email: 'a@b.c', avisos_leilao: false }, 'arremate_sem_saldo'), false, 'quem desligou avisos de leilão não recebe');
  const a = montarAviso('arremate_sem_saldo', { nome: 'Luiz Alberto', produto: 'cadeira presidente', valor: 246, saldo: 169.8, falta: 76.2 });
  assert.equal(a.assunto, 'Falta saldo para fechar o seu arremate: cadeira presidente');
  assert.match(a.texto, /^Oi, Luiz! Você arrematou cadeira presidente por R\$ 246,00, e a sua Carteira tem R\$ 169,80 — faltam R\$ 76,20 para fechar o pedido\./);
  assert.match(a.texto, /fecha sozinho em até 10 minutos/);
  assert.match(a.texto, /Se você já depositou, pode ignorar/);
  assert.match(a.texto, new RegExp(`Colocar saldo na Carteira: ${SITE}/Carteira`));
  assert.equal(a.categoria, 'leilao');
  const b = montarAviso('arremate_sem_saldo', { produto: 'cadeira', valor: 246, saldo: 0, falta: 246, segunda: true });
  assert.equal(b.assunto, 'Seu arremate de cadeira ainda está esperando saldo');
  assert.match(b.texto, /^Oi! Você arrematou cadeira por R\$ 246,00, e a sua Carteira tem R\$ 0,00 — faltam R\$ 246,00/);
  assert.match(b.texto, /responda este e-mail para a gente liberar o produto para outra pessoa/);
});

test('o cron de liquidação lembra o vencedor quando falta saldo — e não mexe em mais nada', () => {
  const L = ler('../api/functions/liquidarArrematesPendentes.js');
  assert.ok(L.includes("import { enviarAviso } from '../_lib/avisosPorEmail.js';"));
  assert.ok(L.includes("import { etapaDoLembreteDeArremate } from '../_lib/regrasDosAvisos.js';"));
  assert.ok(L.includes('current_price,end_time,is_investment_plan'), 'a consulta traz end_time');
  assert.ok(L.includes('if (d?.insufficient === true) {') && L.includes('const etapa = etapaDoLembreteDeArremate(a.end_time);'));
  assert.ok(L.includes("tipo: 'arremate_sem_saldo', userId: a.winner_id, chave: `${a.id}:${etapa}`"), '1x por leilão e etapa');
  assert.ok(L.includes("segunda: etapa === '24h'"));
  assert.ok(L.includes(".catch(() => ({ enviado: false, motivo: 'falha' }));"), 'falha no e-mail nunca derruba a liquidação');
  assert.ok(L.includes('lembrete,'), 'o resultado conta o lembrete');
  // o dinheiro continua inteiro em settleAuctionWithBalance: aqui não há PATCH nem escrita em app_users/auctions
  assert.ok(!/method:\s*'PATCH'/.test(L) && !/sb\('app_users|sb\(`app_users|sb\('auctions\?[^']*',\s*\{\s*method/.test(L));
});

test('o vigia (v2) acusa arremate parado por falta de saldo: amarelo até 48h, vermelho depois, mesmo filtro do cron', () => {
  assert.ok(SQL.includes("'codigo', 'arremate_sem_saldo', 'gravidade', case when _harr >= 48 then 'vermelho' else 'amarelo' end"));
  assert.ok(SQL.includes("where a.order_status = 'awaiting_payment' and a.winner_id is not null and a.status in ('ended', 'sold', 'processing')"));
  assert.ok(SQL.includes("and a.end_time < now() - interval '1 hour'"));
  assert.ok(SQL.includes("and coalesce(a.is_test_auction, false) = false and coalesce(a.is_investment_plan, false) = false"));
  assert.ok(SQL.includes("and a.title !~* '\\mplano\\M';"), 'plano de carreira fica de fora, como no cron');
  assert.ok(SQL.includes("'arremates_sem_saldo', _narr,"));
  assert.ok(SQL.includes("há mais de 48h — decidir: cobrar ou cancelar"));
  // as dez regras do DIR-204 continuam
  for (const codigo of ['saldo_fora_do_extrato', 'liberacao_atrasada', 'indicacao_a_conferir', 'venda_sem_comissao', 'leilao_sem_comissao', 'credito_falhou', 'cupom_sem_deposito', 'conciliacao_pendente', 'acao_gateway_pendente', 'webhook_mudo', 'robo_parado']) {
    assert.ok(SQL.includes(`'codigo', '${codigo}'`), codigo);
  }
  assert.ok(SQL.includes('revoke execute on function public.vigia_financeiro() from public, anon, authenticated;'));
  assert.ok(!/\b(update|delete from|insert into|truncate)\b/i.test(SQL.replace(/--[^\n]*/g, '')), 'só leitura');
});
