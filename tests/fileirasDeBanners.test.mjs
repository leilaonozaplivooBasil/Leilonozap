// 🗂️ AS TRÊS FILEIRAS (08/10/2026): Leilão e Loja podem estar no ar juntas;
// ligar a Unificada desliga as duas; ligar uma das duas desliga a Unificada.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CONTEXTO_CONFIG, PADRAO, lerFileiras, fileiraDaPagina, ligarFileira, chavesAlteradas,
} from '../src/lib/fileirasDeBanners.js';

const linha = (title, is_active) => ({ context: CONTEXTO_CONFIG, title, is_active });

test('sem configuração, o site fica como está hoje: Leilão e Loja ligadas', () => {
  assert.deepEqual(lerFileiras([]), { home: true, catalog: true, unificado: false });
  assert.deepEqual(lerFileiras(undefined), PADRAO);
  assert.deepEqual(lerFileiras([{ context: 'home', title: 'home', is_active: false }]), PADRAO, 'só linhas de configuração valem');
});

test('lê o que o painel gravou', () => {
  assert.deepEqual(lerFileiras([linha('home', true), linha('catalog', false), linha('unificado', false)]), { home: true, catalog: false, unificado: false });
});

test('uma gravação pela metade nunca deixa as três no ar: a Unificada manda', () => {
  assert.deepEqual(lerFileiras([linha('home', true), linha('catalog', true), linha('unificado', true)]), { home: false, catalog: false, unificado: true });
});

test('cada página lê a sua fileira, a Unificada, ou nenhuma', () => {
  assert.equal(fileiraDaPagina('home', PADRAO), 'home');
  assert.equal(fileiraDaPagina('catalog', PADRAO), 'catalog');
  assert.equal(fileiraDaPagina('home', { home: true, catalog: true, unificado: true }), 'unificado');
  assert.equal(fileiraDaPagina('catalog', { home: false, catalog: false, unificado: true }), 'unificado');
  assert.equal(fileiraDaPagina('catalog', { home: true, catalog: false, unificado: false }), null, 'Loja desligada: sem banner');
  assert.equal(fileiraDaPagina('home', undefined), 'home');
});

test('ligar a Unificada desliga as outras duas', () => {
  assert.deepEqual(ligarFileira(PADRAO, 'unificado', true), { home: false, catalog: false, unificado: true });
  assert.deepEqual(ligarFileira({ home: true, catalog: false, unificado: false }, 'unificado', true), { home: false, catalog: false, unificado: true });
});

test('desligar a Unificada devolve Leilão e Loja ao ar', () => {
  assert.deepEqual(ligarFileira({ home: false, catalog: false, unificado: true }, 'unificado', false), { home: true, catalog: true, unificado: false });
});

test('ligar o Leilão ou a Loja com a Unificada no ar desliga a Unificada (e as duas voltam)', () => {
  const uni = { home: false, catalog: false, unificado: true };
  assert.deepEqual(ligarFileira(uni, 'home', true), { home: true, catalog: true, unificado: false });
  assert.deepEqual(ligarFileira(uni, 'catalog', true), { home: true, catalog: true, unificado: false });
  assert.deepEqual(ligarFileira(uni, 'home', false), uni, 'desligar quem já está desligado não muda nada');
});

test('Leilão e Loja se ligam e desligam de forma independente', () => {
  assert.deepEqual(ligarFileira(PADRAO, 'catalog', false), { home: true, catalog: false, unificado: false });
  assert.deepEqual(ligarFileira({ home: true, catalog: false, unificado: false }, 'catalog', true), PADRAO);
  assert.deepEqual(ligarFileira(PADRAO, 'home', false), { home: false, catalog: true, unificado: false });
  assert.deepEqual(ligarFileira(PADRAO, 'inexistente', true), PADRAO);
});

test('o painel só grava o que mudou', () => {
  assert.deepEqual(chavesAlteradas(PADRAO, ligarFileira(PADRAO, 'unificado', true)), ['home', 'catalog', 'unificado']);
  assert.deepEqual(chavesAlteradas(PADRAO, ligarFileira(PADRAO, 'catalog', false)), ['catalog']);
  assert.deepEqual(chavesAlteradas(PADRAO, PADRAO), []);
});

test('o hook escolhe a fileira pela configuração e respeita a janela de datas', () => {
  const hook = readFileSync(new URL('../src/hooks/useBannersDoPainel.js', import.meta.url), 'utf8');
  assert.match(hook, /fileiraDaPagina\(contexto, lerFileiras\(config\)\)/);
  assert.match(hook, /context: 'unificado'/);
  // 08/10/2026 — o leilão encerrado sai ANTES da janela de datas (src/lib/bannerDoLeilao.js)
  assert.match(hook, /filtrarPorJanela\(filtrarPorLeilao\(bruto, leiloes, agoraMs\), agoraMs\)/);
  assert.match(hook, /proximaVirada\(bruto/);
});

test('a migração é aditiva: só duas colunas nulas, sem tocar em dados', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261008150000_banners_programados.sql', import.meta.url), 'utf8')
    .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  assert.match(sql, /add column if not exists starts_at timestamptz/);
  assert.match(sql, /add column if not exists ends_at\s+timestamptz/);
  assert.ok(!/\b(update|delete|drop|truncate)\b/i.test(sql), 'a migração não altera nem apaga nada');
});
