// 🖼️ O BANNER SAI SOZINHO QUANDO O LEILÃO ENCERRA (08/10/2026) — a TV leiloada no sábado
// às 18h: às 18:00 o banner já tem que ter saído, sem esperar o robô de minuto em minuto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STATUS_QUE_APARECEM, leilaoDoBannerAberto, filtrarPorLeilao, idsDeLeilaoDosBanners,
  proximoFimDeLeilao, situacaoDoLeilaoDoBanner,
} from '../src/lib/bannerDoLeilao.js';

const T = (iso) => new Date(iso).getTime();
const FIM = '2026-10-10T21:00:00.000Z'; // sábado 18:00 em Brasília

test('só "no ar" e "agendado" justificam o banner', () => {
  assert.deepEqual(STATUS_QUE_APARECEM, ['active', 'scheduled']);
  for (const status of ['sold', 'ended', 'cancelled', 'processing', 'awaiting_payment', '', undefined]) {
    assert.equal(leilaoDoBannerAberto({ status, end_time: '2030-01-01Z' }, T('2026-10-10T12:00:00Z')), false, String(status));
  }
});

test('🔴 leilão no ar: o banner vale até o segundo em que o fim chega (18:00:00, não 18:01)', () => {
  const l = { status: 'active', end_time: FIM };
  assert.equal(leilaoDoBannerAberto(l, T('2026-10-10T20:59:59.999Z')), true);
  assert.equal(leilaoDoBannerAberto(l, T(FIM)), false, 'no segundo do fim já saiu');
  assert.equal(leilaoDoBannerAberto(l, T('2026-10-10T21:00:30Z')), false, 'e não volta enquanto o robô ainda não fechou o leilão');
});

test('leilão agendado: o banner aparece (é a arte "faltam 3 dias"); o end_time dele é o INÍCIO, não o fim', () => {
  assert.equal(leilaoDoBannerAberto({ status: 'scheduled', end_time: '2026-10-09T10:00:00Z' }, T('2026-10-10T12:00:00Z')), true);
});

test('leilão sem horário legível, mas no ar: segue o status (não esconde por falta de dado)', () => {
  assert.equal(leilaoDoBannerAberto({ status: 'active', end_time: null }, T('2026-10-10T12:00:00Z')), true);
  assert.equal(leilaoDoBannerAberto({ status: 'active', end_time: 'lixo' }, T('2026-10-10T12:00:00Z')), true);
});

test('leilão que não existe, ou lixo, não justifica banner', () => {
  assert.equal(leilaoDoBannerAberto(null), false);
  assert.equal(leilaoDoBannerAberto(undefined), false);
  assert.equal(leilaoDoBannerAberto('texto'), false);
});

test('filtrarPorLeilao: banner solto passa sempre; ligado some quando o leilão acaba', () => {
  const banners = [
    { id: 'solto' },
    { id: 'tv', auction_id: 'leilao-tv' },
    { id: 'geladeira', auction_id: 'leilao-geladeira' },
  ];
  const mapa = {
    'leilao-tv': { status: 'active', end_time: FIM },
    'leilao-geladeira': { status: 'active', end_time: '2026-10-12T21:00:00Z' },
  };
  assert.deepEqual(filtrarPorLeilao(banners, mapa, T('2026-10-10T20:00:00Z')).map((b) => b.id), ['solto', 'tv', 'geladeira']);
  assert.deepEqual(filtrarPorLeilao(banners, mapa, T('2026-10-10T21:00:01Z')).map((b) => b.id), ['solto', 'geladeira'], 'só o da TV saiu');
});

test('o leilão ainda não consultado (cache na primeira pintura) não esconde o banner; consultado e sumido, esconde', () => {
  const banners = [{ id: 'tv', auction_id: 'x' }];
  assert.equal(filtrarPorLeilao(banners, {}, T('2026-10-10Z')).length, 1);
  assert.equal(filtrarPorLeilao(banners, { x: null }, T('2026-10-10Z')).length, 0, 'leilão apagado');
  assert.equal(filtrarPorLeilao(null).length, 0);
});

test('🔴 PRORROGAÇÃO: com o fim novo vindo do banco, o banner continua', () => {
  const banners = [{ id: 'tv', auction_id: 'tv' }];
  const depoisDoFimAntigo = T('2026-10-10T21:00:30Z');
  assert.equal(filtrarPorLeilao(banners, { tv: { status: 'active', end_time: FIM } }, depoisDoFimAntigo).length, 0);
  assert.equal(filtrarPorLeilao(banners, { tv: { status: 'active', end_time: '2026-10-10T21:03:00Z' } }, depoisDoFimAntigo).length, 1,
    'lance de última hora prorrogou o leilão: o banner não pode sair');
});

test('os ids de leilão, sem repetir e sem vazio', () => {
  assert.deepEqual(idsDeLeilaoDosBanners([{ auction_id: 'a' }, { auction_id: 'a' }, { auction_id: ' b ' }, {}, null, { auction_id: '' }]), ['a', 'b']);
  assert.deepEqual(idsDeLeilaoDosBanners(undefined), []);
});

test('o próximo fim de leilão é o instante exato em que a tela deve conferir de novo', () => {
  const banners = [{ auction_id: 'a' }, { auction_id: 'b' }, { auction_id: 'c' }, {}];
  const mapa = {
    a: { status: 'active', end_time: '2026-10-10T21:00:00Z' },
    b: { status: 'active', end_time: '2026-10-09T21:00:00Z' },
    c: { status: 'scheduled', end_time: '2026-10-08T10:00:00Z' },
  };
  assert.equal(proximoFimDeLeilao(banners, mapa, T('2026-10-08T12:00:00Z')), T('2026-10-09T21:00:00Z'));
  assert.equal(proximoFimDeLeilao(banners, mapa, T('2026-10-09T21:00:01Z')), T('2026-10-10T21:00:00Z'));
  assert.equal(proximoFimDeLeilao(banners, mapa, T('2026-10-11T00:00:00Z')), null, 'tudo no passado');
  assert.equal(proximoFimDeLeilao([{}], mapa), null);
});

test('o painel descreve o vínculo do banner', () => {
  const agora = T('2026-10-10T12:00:00Z');
  assert.equal(situacaoDoLeilaoDoBanner({}, undefined, agora), null, 'sem leilão ligado, nada a dizer');
  assert.equal(situacaoDoLeilaoDoBanner({ auction_id: 'x' }, undefined, agora).estado, 'leilao_desconhecido');
  assert.equal(situacaoDoLeilaoDoBanner({ auction_id: 'x' }, null, agora).estado, 'leilao_sumiu');
  assert.equal(situacaoDoLeilaoDoBanner({ auction_id: 'x' }, { status: 'sold', end_time: FIM }, agora).estado, 'leilao_encerrou');
  assert.equal(situacaoDoLeilaoDoBanner({ auction_id: 'x' }, { status: 'active', end_time: FIM }, agora).estado, 'leilao_no_ar');
  assert.equal(situacaoDoLeilaoDoBanner({ auction_id: 'x' }, { status: 'scheduled', end_time: FIM }, agora).estado, 'leilao_agendado');
});

test('a migração: coluna nula + rotina de minuto em minuto que só DESLIGA banner de leilão que acabou', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261008160000_banner_ligado_ao_leilao.sql', import.meta.url), 'utf8')
    .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  assert.match(sql, /add column if not exists auction_id text/);
  assert.match(sql, /a\.status in \('active', 'scheduled'\)/, 'a regra é a mesma da tela: no ar ou agendado justifica o banner');
  assert.match(sql, /where b\.is_active\s+and b\.auction_id is not null\s+and not exists/, 'só mexe em banner LIGADO a leilão e ainda ligado');
  assert.match(sql, /cron\.schedule\('desligar-banner-leilao-encerrado', '\* \* \* \* \*'/);
  assert.ok(!/create trigger|drop trigger/i.test(sql), 'a tabela de leilões não recebe gatilho (a aplicação travou: bloqueio forte numa tabela quente)');
  assert.ok(!/\b(drop table|truncate|delete from)\b/i.test(sql), 'a migração não apaga dado nenhum');
  assert.ok(!/set is_active = true/i.test(sql), 'nunca religa banner sozinha');
});
