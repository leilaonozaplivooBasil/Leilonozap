// 🎟️ DIR-202 — O CUPOM PASSAPORTE (bônus de 10%) SEGUE O DEPÓSITO (07/10/2026)
// Dono, com print de cliente: "não estão recebendo os 10%; não está constando
// mais" → auditoria: o motor estava certo; a Carteira escondia o valor guardado
// e o depósito devolvido no gateway deixava o cupom de pé.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const SQL = readFileSync(new URL('../supabase/migrations/20261007120000_cupom_passaporte_segue_o_deposito.sql', import.meta.url), 'utf8');
const corpoDe = (nome) => {
  const i = SQL.indexOf(`create or replace function public.${nome}(`);
  assert.ok(i >= 0, `função ${nome} na migração`);
  const j = SQL.indexOf('create or replace function public.', i + 10);
  return SQL.slice(i, j > 0 ? j : SQL.length);
};

test('cancelar o cupom de um depósito: zera o guardado e o liberado ainda não gasto, conta o que já foi usado, pula o modelo A', () => {
  const f = corpoDe('cancelar_cupom_passaporte_do_deposito');
  assert.ok(f.includes('from public.passaporte_coupons where origin_sale_id = _sale_id'));
  assert.ok(f.includes("if _c.bonus_creditado_em is not null then return jsonb_build_object('success', true, 'modelo_a', true"));
  assert.ok(f.includes('_bloq  := round(greatest(0, coalesce(_c.valor_credito, 0) - coalesce(_c.valor_liberado, 0) - coalesce(_c.valor_cancelado, 0)), 2);'));
  assert.ok(f.includes('_lib   := round(greatest(0, coalesce(_c.saldo_restante, 0)), 2);'));
  assert.ok(f.includes('_usado := round(greatest(0, coalesce(_c.valor_liberado, 0) - _lib), 2);'));
  assert.ok(f.includes('saldo_restante  = 0') && f.includes("status          = 'cancelado'"));
  assert.ok(f.includes("'cancelado_bloqueado', _bloq, 'cancelado_liberado', _lib, 'ja_usado_na_loja', _usado"));
  assert.ok(SQL.includes('revoke execute on function public.cancelar_cupom_passaporte_do_deposito(text, text) from public, anon, authenticated;'));
});

test('bloquear o depósito contestado cancela o cupom SEMPRE, antes do atalho de "já bloqueado" — e o que já valia continua', () => {
  const f = corpoDe('bloquear_saldo_contestado');
  const comissao = f.indexOf('_comissoes := public.estornar_comissoes_do_deposito(_sale_id');
  const cupom = f.indexOf('_cupom := public.cancelar_cupom_passaporte_do_deposito(_sale_id');
  const atalho = f.indexOf("if _ultimo = 'bloqueio_contestacao' then");
  assert.ok(comissao > 0 && cupom > comissao && atalho > cupom, 'comissão, cupom, só depois o atalho');
  assert.ok(f.includes("'ja_bloqueado', true, 'bloqueado', 0, 'comissoes', _comissoes, 'cupom', _cupom"));
  assert.ok(f.includes("values (_s.buyer_id, _sale_id, 'bloqueio_contestacao', -_bloqueado, _antes, round(_antes - _bloqueado, 2),"));
  assert.ok(f.includes('_bloqueado := least(_antes, _s.valor);'));
  assert.ok(f.includes("exception when unique_violation then"));
});

test('a Carteira mostra liberado E guardado juntos, com os valores', () => {
  const C = ler('../src/components/wallet/PassaporteCard.jsx');
  assert.ok(C.includes('const liberado = status.liberado || null;'));
  assert.ok(C.includes('const guardado = status.tem_bloqueado ? status.bloqueado?.saldo : null;'));
  assert.ok(C.includes('if (!liberado && !status.tem_bloqueado) return null;'));
  assert.ok(C.includes('data-teste="passaporte-liberado"') && C.includes('data-teste="passaporte-guardado"'));
  const lib = C.indexOf('{liberado && (');
  const guard = C.indexOf('{status.tem_bloqueado && (');
  assert.ok(lib > 0 && guard > lib, 'os dois blocos no mesmo cartão, liberado primeiro');
  assert.ok(!/if \(status\.liberado\) \{[\s\S]*return \(/.test(C), 'o liberado não engole mais o guardado');
  assert.ok(C.includes('É o bônus de 10% dos seus depósitos que ainda está esperando leilão.'));
});
